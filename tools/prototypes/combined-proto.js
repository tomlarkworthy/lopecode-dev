#!/usr/bin/env node
/**
 * combined-proto.js - LinkeDOM + vm.Module lopecode notebook loader
 *
 * Mirrors the browser's <script type="module" id="main"> exactly:
 *   1. Parse HTML (LinkeDOM provides DOM + virtual filesystem)
 *   2. importShim("@observablehq/runtime") → get Runtime class
 *   3. new Runtime({__ojs_runtime, __ojs_observer})
 *   4. importShim(bootloaderName) → get bootloader define
 *   5. runtime.module(bootloaderDefine, observer)
 *   6. Bootloader takes over: loads conf, stdlib, builtins, mains
 *
 * Our job is ONLY to replace the browser's module loading with vm.Module,
 * providing importModuleDynamically to intercept import() calls.
 *
 * Run with:
 *   node --experimental-vm-modules tools/prototypes/combined-proto.js <notebook.html>
 */

import fs from "fs";
import path from "path";
import zlib from "zlib";
import vm from "vm";
import { parseHTML } from "linkedom";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const jsonOutput = args.includes("--json");
const timeoutIdx = args.indexOf("--timeout");
const settleTimeout = timeoutIdx >= 0 ? parseInt(args[timeoutIdx + 1], 10) : 10000;
const notebookPath = args.find((a) => !a.startsWith("--") && a !== args[timeoutIdx + 1]);

if (!notebookPath) {
  console.error("Usage: node --experimental-vm-modules tools/prototypes/combined-proto.js <notebook.html> [--verbose] [--timeout N] [--json]");
  process.exit(1);
}

function log(msg) {
  if (verbose) process.stderr.write(`[combined] ${msg}\n`);
}

// Prevent unhandled promise rejections from crashing the process.
// Libraries like LightningFS/isomorphic-git throw when IndexedDB is unavailable.
// These are expected failures in Node.js — log and continue.
process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || (typeof reason === 'string' ? reason.slice(0, 100) : String(reason).slice(0, 100));
  log(`Unhandled rejection: ${msg}`);
});

// Suppress console.trace in vm.Context — some libraries dump huge traces
const _origTrace = console.trace;
console.trace = (...args) => {
  const msg = args.map(a => (typeof a === 'string' ? a : a?.message || '').slice(0, 200)).join(' ');
  log(`trace: ${msg}`);
};

const stdoutWrite = (s) => process.stdout.write(s + "\n");
if (jsonOutput) {
  console.log = (...a) => process.stderr.write(a.join(" ") + "\n");
}

function logAlways(msg) {
  if (!jsonOutput) process.stderr.write(`[combined] ${msg}\n`);
}

// ---------------------------------------------------------------------------
// 1. Parse HTML — LinkeDOM provides both DOM and virtual filesystem
// ---------------------------------------------------------------------------
const absPath = path.resolve(notebookPath);
if (!fs.existsSync(absPath)) {
  console.error(`File not found: ${absPath}`);
  process.exit(1);
}

logAlways(`Loading: ${path.basename(absPath)}`);
const t0 = Date.now();

const rawHtml = fs.readFileSync(absPath, "utf-8");
const { document, window: linkedomWindow } = parseHTML(rawHtml);

// Build script index for fast lookup
const scriptMap = new Map();
for (const el of document.querySelectorAll("script[id]")) {
  scriptMap.set(el.getAttribute("id"), {
    encoding: el.getAttribute("data-encoding") || "text",
    mime: el.getAttribute("data-mime") || "",
    type: el.getAttribute("type") || "",
    textContent: (el.textContent || "").trim(),
  });
}

log(`Parsed HTML: ${scriptMap.size} scripts in ${Date.now() - t0}ms`);

// ---------------------------------------------------------------------------
// Helpers: decompress + resolve (mirrors networking_script)
// ---------------------------------------------------------------------------
function decompressSource(id) {
  let info = scriptMap.get(id);
  // Check live document too (bootloader dynamically appends script tags)
  if (!info) {
    const el = document.getElementById(id);
    if (el) {
      info = {
        encoding: el.getAttribute("data-encoding") || "text",
        mime: el.getAttribute("data-mime") || "",
        textContent: (el.textContent || "").trim(),
      };
    }
  }
  if (!info || !info.textContent) return null;
  if (info.encoding === "base64+gzip") {
    return { source: zlib.gunzipSync(Buffer.from(info.textContent, "base64")).toString("utf-8"), mime: info.mime };
  }
  return { source: info.textContent, mime: info.mime };
}

function normalize(url) {
  return url.replace(/^(?:https:\/\/api\.observablehq\.com)?\/(.*?)\.js(?:\?.*)?$/, "$1");
}

function resolveSpecifier(specifier) {
  if (scriptMap.has(specifier) || document.getElementById(specifier)) return specifier;
  if (specifier.startsWith("file://")) {
    const id = specifier.slice(7);
    if (scriptMap.has(id) || document.getElementById(id)) return id;
  }
  const normalized = normalize(specifier);
  if (normalized !== specifier && (scriptMap.has(normalized) || document.getElementById(normalized))) return normalized;
  const noSlash = specifier.replace(/^\//, "").replace(/\.js(\?.*)?$/, "");
  if (scriptMap.has(noSlash) || document.getElementById(noSlash)) return noSlash;
  return null;
}

// ---------------------------------------------------------------------------
// 2. Create vm.Context with LinkeDOM document + polyfills
// ---------------------------------------------------------------------------
const moduleRegistry = new Map();

// Shim missing LinkeDOM APIs
if (typeof linkedomWindow.IntersectionObserver !== "function")
  linkedomWindow.IntersectionObserver = class { observe(){} disconnect(){} unobserve(){} };
if (typeof linkedomWindow.ResizeObserver !== "function")
  linkedomWindow.ResizeObserver = class { observe(){} disconnect(){} unobserve(){} };
if (typeof linkedomWindow.requestAnimationFrame !== "function") {
  linkedomWindow.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  linkedomWindow.cancelAnimationFrame = (id) => clearTimeout(id);
}

// ---------------------------------------------------------------------------
// Patch appendChild to execute <script src="..."> elements
// Mirrors networking_script's patchScriptSrc.
//
// d3-require's AMD pattern needs:
//   1. script executes → window.define() pushes to queue
//   2. script.onload fires → queue.pop() retrieves the entry
// These MUST happen in sequence per script. If multiple scripts are appended
// in the same tick, we use a sequential queue to ensure each script's
// define() + onload pair completes before the next script starts.
// ---------------------------------------------------------------------------
const scriptQueue = [];
let processingScripts = false;

function patchAppendChild(parentProto) {
  const _appendChild = parentProto.appendChild;
  parentProto.appendChild = function(child) {
    const result = _appendChild.call(this, child);
    if (child.tagName === "SCRIPT" && child.src) {
      enqueueScript(child);
    }
    return result;
  };
}

function enqueueScript(scriptEl) {
  scriptQueue.push(scriptEl);
  if (!processingScripts) {
    processScriptQueue();
  }
}

function processScriptQueue() {
  if (scriptQueue.length === 0) {
    processingScripts = false;
    log(`Script queue empty`);
    return;
  }
  processingScripts = true;
  const scriptEl = scriptQueue.shift();
  log(`Processing script queue (${scriptQueue.length} remaining): ${(scriptEl.src || "").slice(0, 60)}`);
  executeScript(scriptEl, () => {
    // After this script's onload/onerror fires, process the next one
    // Use setTimeout(0) to break the call stack and prevent infinite recursion
    setTimeout(processScriptQueue, 0);
  });
}

function executeScript(scriptEl, done) {
  const src = scriptEl.src || scriptEl.getAttribute("src") || "";
  log(`Script src: ${src}`);

  // --- Resolve source ---
  let source = null;
  let resolvedName = src;

  // 1. blob: URLs
  if (src.startsWith("blob:")) {
    const blob = blobUrlStore.get(src);
    if (blob) {
      blob.text().then(text => {
        runAndFireOnload(scriptEl, text, src, done);
      }).catch(e => {
        log(`Blob read error: ${e.message}`);
        fireOnerror(scriptEl, e, done);
      });
    } else {
      fireOnerror(scriptEl, new Error("blob not found: " + src), done);
    }
    return; // async path
  }

  // 2. file:// protocol
  let id = null;
  if (src.startsWith("file://")) {
    id = src.slice(7);
  } else {
    // 3. Normalize CDN/API URLs to embedded script IDs
    const normalized = normalize(src);
    if (normalized !== src && (scriptMap.has(normalized) || document.getElementById(normalized))) {
      id = normalized;
    }
    // 4. Try exact URL as element ID (bootloader injects with full CDN URLs as IDs)
    if (!id && (scriptMap.has(src) || document.getElementById(src))) {
      id = src;
    }
  }

  if (id) {
    const result = decompressSource(id);
    if (result) {
      runAndFireOnload(scriptEl, result.source, id, done);
      return;
    }
  }

  // 5. Network fetch (async)
  if (src.startsWith("http://") || src.startsWith("https://")) {
    globalThis.fetch(src).then(async resp => {
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      runAndFireOnload(scriptEl, text, src, done);
    }).catch(e => {
      log(`Network error: ${src}: ${e.message}`);
      fireOnerror(scriptEl, e, done);
    });
    return; // async path
  }

  log(`Script not resolved: ${src}`);
  fireOnerror(scriptEl, new Error("not found: " + src), done);
}

function runAndFireOnload(scriptEl, source, filename, done) {
  try {
    vm.runInContext(source, sharedContext, { filename });
    log(`Executed: ${filename} (${source.length} chars)`);
  } catch (e) {
    log(`Script error: ${filename}: ${e.message}`);
    fireOnerror(scriptEl, e, done);
    return;
  }
  // Fire onload synchronously — this is critical for d3-require's AMD queue.
  // define() was called during vm.runInContext, so queue has the entry.
  // onload calls queue.pop() to retrieve it.
  try {
    if (typeof scriptEl.onload === "function") scriptEl.onload();
  } catch (e) {
    log(`onload error: ${filename}: ${e.message}`);
  }
  done();
}

function fireOnerror(scriptEl, error, done) {
  try {
    if (typeof scriptEl.onerror === "function") scriptEl.onerror(error);
  } catch (e) {
    log(`onerror error: ${e.message}`);
  }
  done();
}

// NOTE: Actual patching happens after sharedContext is created (see below)

// In-memory localStorage
const lsData = new Map();
const localStorageShim = {
  getItem: (k) => lsData.get(k) ?? null,
  setItem: (k, v) => lsData.set(k, String(v)),
  removeItem: (k) => lsData.delete(k),
  clear: () => lsData.clear(),
  get length() { return lsData.size; },
  key: (i) => [...lsData.keys()][i] ?? null,
};

// Location shim
const locationShim = {
  href: "http://localhost/", hash: "", search: "", pathname: "/",
  hostname: "localhost", protocol: "http:", origin: "http://localhost",
  host: "localhost", port: "",
  toString() { return this.href; },
};

// ---------------------------------------------------------------------------
// Patched fetch — mirrors networking_script's fetch/XHR interception
// Serves file:// URLs and URLs that normalize to embedded script IDs
// from the virtual filesystem (document script tags)
// ---------------------------------------------------------------------------
async function dvfBytes(id) {
  const el = document.getElementById(id);
  if (!el) return { status: 404 };
  const mime = el.getAttribute("data-mime");
  if (!mime) return { status: 415 };
  const enc = (el.getAttribute("data-encoding") || "text").toLowerCase();
  const text = (el.textContent || "").trim();
  try {
    if (enc === "text") {
      return { status: 200, mime, bytes: new TextEncoder().encode(text) };
    }
    if (enc === "base64") {
      const bin = atob(text);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return { status: 200, mime, bytes: out };
    }
    if (enc === "base64+gzip") {
      const raw = Buffer.from(text, "base64");
      const decompressed = zlib.gunzipSync(raw);
      return { status: 200, mime, bytes: new Uint8Array(decompressed) };
    }
  } catch {
    return { status: enc.includes("gzip") ? 499 : 422 };
  }
  return { status: 422 };
}

const _realFetch = globalThis.fetch;
function patchedFetch(url, init) {
  if (typeof url === "string") {
    let id;
    if (url.startsWith("file://")) {
      id = url.slice(7);
    } else {
      id = normalize(url);
      if (!document.getElementById(id)) id = null;
    }
    if (id) {
      return dvfBytes(id).then(r => {
        if (r.status !== 200) return new Response(null, { status: r.status });
        return new Response(r.bytes, {
          status: 200,
          headers: { "Content-Type": r.mime, "Content-Length": String(r.bytes.byteLength) },
        });
      });
    }
  }
  return _realFetch(url, init);
}

// Blob URL tracking for import(blobUrl) support
const blobUrlStore = new Map();
const origCreateObjectURL = URL.createObjectURL;
const patchedURL = Object.create(URL);
patchedURL.createObjectURL = function(blob) {
  const url = origCreateObjectURL.call(URL, blob);
  blobUrlStore.set(url, blob);
  log(`URL.createObjectURL: ${url} (${blob.size}b)`);
  return url;
};
patchedURL.revokeObjectURL = function(url) {
  blobUrlStore.delete(url);
  URL.revokeObjectURL(url);
};

const sharedContext = vm.createContext({
  // JS globals
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  URL: patchedURL, URLSearchParams, Map, Set, WeakMap, WeakSet,
  Promise, Symbol, Proxy, Reflect,
  Error, TypeError, RangeError, SyntaxError, ReferenceError, URIError, EvalError,
  Array, Object, String, Number, Boolean, RegExp, Date, Math, JSON,
  parseInt, parseFloat, isNaN, isFinite, encodeURI, decodeURI,
  encodeURIComponent, decodeURIComponent, escape, unescape,
  undefined, NaN, Infinity,
  ArrayBuffer, SharedArrayBuffer, Uint8Array, Uint16Array, Uint32Array,
  Int8Array, Int16Array, Int32Array, Float32Array, Float64Array,
  BigInt, BigInt64Array, BigUint64Array, DataView,
  TextEncoder, TextDecoder,
  Blob, Response, Request, Headers,
  ReadableStream, WritableStream, TransformStream,
  DecompressionStream, CompressionStream,
  structuredClone, queueMicrotask, atob, btoa,
  AbortController, AbortSignal,
  Event, EventTarget, CustomEvent,
  fetch: patchedFetch,
  // DOM from LinkeDOM
  document,
  window: undefined, globalThis: undefined, self: undefined,
  // Shims
  requestAnimationFrame: linkedomWindow.requestAnimationFrame,
  cancelAnimationFrame: linkedomWindow.cancelAnimationFrame,
  MutationObserver: linkedomWindow.MutationObserver || class { observe(){} disconnect(){} takeRecords(){ return []; } },
  IntersectionObserver: linkedomWindow.IntersectionObserver,
  ResizeObserver: linkedomWindow.ResizeObserver,
  HTMLElement: linkedomWindow.HTMLElement || class {},
  HTMLScriptElement: linkedomWindow.HTMLScriptElement || class {},
  Element: linkedomWindow.Element || class {},
  Node: linkedomWindow.Node || class {},
  NodeList: linkedomWindow.NodeList || class {},
  DocumentFragment: linkedomWindow.DocumentFragment || class {},
  localStorage: localStorageShim,
  location: locationShim,
  navigator: { userAgent: "lopecode-node/1.0", locks: null },
  // IndexedDB stub — LightningFS/isomorphic-git needs it, will fail gracefully
  indexedDB: {
    open: () => {
      const req = { error: new Error("IndexedDB not available in Node.js") };
      queueMicrotask(() => { if (req.onerror) req.onerror(); });
      return req;
    },
  },
  CSS: { escape: (s) => String(s).replace(/([^\w-])/g, "\\$1") },
  lopecode: {
    dvfBytes,
    contentSync: (id) => {
      const el = document.getElementById(id);
      const info = scriptMap.get(id) || (el ? {
        encoding: el.getAttribute("data-encoding") || "text",
        mime: el.getAttribute("data-mime") || "",
        textContent: (el.textContent || "").trim(),
      } : null);
      if (!info?.textContent) return { status: 404, mime: null, bytes: new Uint8Array() };
      let bytes;
      if (info.encoding === "base64+gzip") {
        try { bytes = zlib.gunzipSync(Buffer.from(info.textContent, "base64")); }
        catch { return { status: 499, mime: info.mime, bytes: new Uint8Array() }; }
      } else if (info.encoding === "base64") {
        bytes = Buffer.from(info.textContent, "base64");
      } else {
        bytes = Buffer.from(info.textContent, "utf-8");
      }
      return { status: 200, mime: info.mime, bytes: new Uint8Array(bytes) };
    },
  },
}, { name: "lopecode-combined" });

sharedContext.globalThis = sharedContext;
sharedContext.window = sharedContext;
sharedContext.self = sharedContext;

// Now patch appendChild for script execution (needs sharedContext)
if (document.head) patchAppendChild(document.head);
if (document.body) patchAppendChild(document.body);
if (linkedomWindow.HTMLElement?.prototype) patchAppendChild(linkedomWindow.HTMLElement.prototype);

log("Created vm.Context");

// ---------------------------------------------------------------------------
// 3. importModuleDynamically — replaces es-module-shims + networking_script
// ---------------------------------------------------------------------------
async function importModuleDynamically(specifier, referrer) {
  log(`import("${specifier}") from ${referrer?.identifier || "?"}`);

  // Resolve to a local script tag
  const resolvedId = resolveSpecifier(specifier);
  if (resolvedId) {
    const result = decompressSource(resolvedId);
    if (result) {
      // JSON
      if (result.mime === "application/json" || resolvedId.endsWith(".json")) {
        const mod = new vm.SyntheticModule(["default"],
          function() { this.setExport("default", JSON.parse(result.source)); },
          { context: sharedContext, identifier: `json:${resolvedId}` });
        await mod.link(() => {});
        await mod.evaluate();
        return mod;
      }
      // JS — return cached or compile fresh
      if (moduleRegistry.has(resolvedId)) {
        const m = moduleRegistry.get(resolvedId);
        if (m.status === "unlinked") await m.link(linker);
        if (m.status === "linked") await m.evaluate();
        return m;
      }
      try {
        const mod = new vm.SourceTextModule(result.source, {
          context: sharedContext, identifier: resolvedId, importModuleDynamically,
        });
        moduleRegistry.set(resolvedId, mod);
        await mod.link(linker);
        await mod.evaluate();
        return mod;
      } catch (e) {
        log(`Failed to compile "${resolvedId}": ${e.message}`);
      }
    }
  }

  // Blob URLs (modules decompress deps → createObjectURL → import)
  if (specifier.startsWith("blob:")) {
    const blob = blobUrlStore.get(specifier);
    if (blob) {
      try {
        const text = await blob.text();
        log(`Resolved blob: ${specifier.slice(0, 50)} (${text.length} chars)`);
        const mod = new vm.SourceTextModule(text, {
          context: sharedContext, identifier: `blob:${specifier.slice(0, 40)}`,
          importModuleDynamically,
        });
        await mod.link(linker);
        await mod.evaluate();
        return mod;
      } catch (e) {
        log(`Failed blob ${specifier.slice(0, 50)}: ${e.message}`);
      }
    }
  }

  log(`Unresolved: "${specifier}" — stub`);
  const stub = new vm.SyntheticModule(["default"],
    function() { this.setExport("default", undefined); },
    { context: sharedContext, identifier: `stub:${specifier}` });
  await stub.link(() => {});
  await stub.evaluate();
  return stub;
}

async function linker(specifier, ref) {
  log(`link("${specifier}") from ${ref?.identifier || "?"}`);
  if (moduleRegistry.has(specifier)) {
    const m = moduleRegistry.get(specifier);
    if (m.status === "unlinked") await m.link(linker);
    return m;
  }
  const rid = resolveSpecifier(specifier);
  if (rid && moduleRegistry.has(rid)) {
    const m = moduleRegistry.get(rid);
    if (m.status === "unlinked") await m.link(linker);
    return m;
  }
  if (rid) {
    const result = decompressSource(rid);
    if (result && result.mime !== "application/json") {
      try {
        const mod = new vm.SourceTextModule(result.source, {
          context: sharedContext, identifier: rid, importModuleDynamically,
        });
        moduleRegistry.set(rid, mod);
        await mod.link(linker);
        return mod;
      } catch (e) { log(`Link fail "${rid}": ${e.message}`); }
    }
  }
  log(`Link stub: "${specifier}"`);
  const stub = new vm.SyntheticModule(["default"],
    function() { this.setExport("default", undefined); },
    { context: sharedContext, identifier: `stub:${specifier}` });
  await stub.link(linker);
  return stub;
}

// ---------------------------------------------------------------------------
// 4. importShim polyfill (what es-module-shims provides in the browser)
// ---------------------------------------------------------------------------
async function importShim(specifier, parentUrl) {
  log(`importShim("${specifier}")`);
  const mod = await importModuleDynamically(specifier, { identifier: parentUrl || "importShim" });
  return mod.namespace;
}
sharedContext.importShim = importShim;

// ---------------------------------------------------------------------------
// 5. Mirror the main script exactly
// ---------------------------------------------------------------------------
// Find bootloader name from the main script tag
// The main script's LAST importShim call loads the bootloader:
//   const {default: define} = await importShim("@tomlarkworthy/bootloader");
//   runtime.module(define, ...);
let bootloaderName = null;
for (const el of document.querySelectorAll('script[type="module"]')) {
  const src = el.textContent || "";
  // Match the pattern: {default: define} = await importShim("...")
  const m = src.match(/\{default:\s*define\}\s*=\s*await\s+importShim\("([^"]+)"\)/);
  if (m) { bootloaderName = m[1]; break; }
}
if (!bootloaderName) {
  // Fallback: look for any bootloader in scripts
  for (const id of scriptMap.keys()) {
    if (id.includes("bootloader")) { bootloaderName = id; break; }
  }
}

const bootconfResult = decompressSource("bootconf.json");
const bootconf = bootconfResult ? JSON.parse(bootconfResult.source) : null;

if (!bootloaderName || !bootconf) {
  logAlways("No bootloader/bootconf — cannot boot");
  process.exit(1);
}

logAlways(`Bootloader: ${bootloaderName}`);
logAlways(`Mains: ${JSON.stringify(bootconf.mains)}, headless: ${bootconf.headless}`);

// Set location hash from bootconf (bootloader's boot cell reads it)
if (bootconf.hash) locationShim.hash = bootconf.hash;

// --- Step 1: const { Runtime } = await importShim("@observablehq/runtime@6.0.0")
const runtimeNs = await importShim("@observablehq/runtime@6.0.0");
const RuntimeClass = runtimeNs.Runtime;
if (typeof RuntimeClass !== "function") {
  console.error("Failed to load Runtime class");
  process.exit(1);
}
log(`Runtime class loaded`);

// --- Step 2: const runtime = new Runtime({__ojs_runtime: () => runtime, __ojs_observer: () => observer})
const observer = () => ({});
const runtime = new RuntimeClass({
  __ojs_runtime: () => runtime,
  __ojs_observer: () => observer,
});
sharedContext.__ojs_runtime = runtime;
sharedContext.__ojs_observer = observer;

// Register importShim as builtin (boot cell depends on it)
runtime._builtin.define("importShim", [], () => importShim);

log("Runtime created");

// --- Step 3: const {default: define} = await importShim(bootloaderName)
const bootloaderNs = await importShim(bootloaderName);
const bootloaderDefine = bootloaderNs.default;
if (typeof bootloaderDefine !== "function") {
  console.error("Bootloader does not export a define function");
  process.exit(1);
}

// --- Step 4: runtime.module(define, observer)
// This is ALL the main script does. The bootloader handles everything else.
logAlways("Booting...");
runtime.module(bootloaderDefine, observer);

// ---------------------------------------------------------------------------
// 6. Wait for the reactive dataflow to settle
// ---------------------------------------------------------------------------
log("Entering settle loop...");
const pollInterval = 250;
const deadline = Date.now() + settleTimeout;
let lastResolved = 0;
let stableCount = 0;

while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, pollInterval));
  runtime._computeNow?.();

  let resolved = 0, errors = 0, pending = 0;
  for (const v of runtime._variables) {
    if (v._value !== undefined) resolved++;
    else if (v._error !== undefined) errors++;
    else pending++;
  }

  const total = runtime._variables.size;
  const settled = resolved + errors;
  if (settled === lastResolved) {
    stableCount++;
  } else {
    stableCount = 0;
    lastResolved = settled;
  }

  log(`${total} vars: ${resolved} ok, ${errors} err, ${pending} pending (stable=${stableCount})`);

  if (stableCount >= 5 && total > 0) {
    logAlways(`Settled after ${Date.now() - t0}ms`);
    break;
  }
}

// ---------------------------------------------------------------------------
// 7. Report
// ---------------------------------------------------------------------------
const moduleNameLookup = new Map();
if (runtime.mains) {
  for (const [name, mod] of runtime.mains) moduleNameLookup.set(mod, name);
}
if (runtime._builtin) moduleNameLookup.set(runtime._builtin, "(builtin)");

let totalVars = 0, resolvedVars = 0, errorVars = 0, pendingVars = 0;
const namedVars = [];

for (const v of runtime._variables) {
  totalVars++;
  if (v._value !== undefined) resolvedVars++;
  else if (v._error !== undefined) errorVars++;
  else pendingVars++;

  if (v._name) {
    namedVars.push({
      name: v._name,
      module: moduleNameLookup.get(v._module) || v._module?._name || "?",
      state: v._value !== undefined ? "resolved" : v._error ? "error" : "pending",
      type: v._value !== undefined ? typeof v._value : undefined,
      error: v._error?.message,
    });
  }
}

const mains = runtime.mains ? [...runtime.mains.keys()] : [];
const totalTime = Date.now() - t0;

if (jsonOutput) {
  stdoutWrite(JSON.stringify({
    notebook: path.basename(absPath), bootloader: bootloaderName, bootconf,
    timing: { totalMs: totalTime }, scripts: scriptMap.size,
    variables: { total: totalVars, resolved: resolvedVars, errors: errorVars, pending: pendingVars },
    mains,
    namedVariables: namedVars.sort((a, b) => a.name.localeCompare(b.name)),
  }, null, 2));
} else {
  logAlways(`\n--- ${path.basename(absPath)} ---`);
  logAlways(`Time: ${totalTime}ms`);
  logAlways(`Variables: ${totalVars} total, ${resolvedVars} resolved, ${errorVars} errors, ${pendingVars} pending`);
  if (mains.length > 0) logAlways(`Mains: ${mains.join(", ")}`);

  const byModule = new Map();
  for (const v of namedVars) {
    if (!byModule.has(v.module)) byModule.set(v.module, { resolved: 0, error: 0, pending: 0, total: 0 });
    const s = byModule.get(v.module);
    s[v.state]++;
    s.total++;
  }
  logAlways(`\nPer-module:`);
  for (const [mod, s] of [...byModule.entries()].sort((a, b) => b[1].total - a[1].total)) {
    logAlways(`  ${mod}: ${s.total} vars (${s.resolved} ok, ${s.error} err, ${s.pending} pending)`);
  }

  if (verbose) {
    const errs = namedVars.filter((v) => v.state === "error");
    if (errs.length > 0) {
      logAlways(`\nErrors:`);
      for (const v of errs.slice(0, 30))
        logAlways(`  ${v.module}#${v.name}: ${v.error}`);
      if (errs.length > 30) logAlways(`  ... and ${errs.length - 30} more`);
    }
  }
}

process.exit(0);
