/**
 * lope-runtime.js - Load lopecode notebooks in Node.js
 *
 * Mirrors the browser bootstrap using LinkeDOM + vm.SourceTextModule.
 * Provides direct programmatic access to the Observable Runtime.
 *
 * Usage:
 *   import { loadNotebook } from './lope-runtime.js';
 *   const execution = await loadNotebook('path/to/notebook.html', { settleTimeout: 5000 });
 *   // execution.runtime  — Observable Runtime instance
 *   // execution.document — LinkeDOM document (the virtual DOM)
 *   // execution.context  — vm.Context (the JS execution environment)
 *   // execution.bootconf — parsed bootconf.json
 *   // execution.dispose() — cleanup
 *
 * Requires: node --experimental-vm-modules
 */

import fs from "fs";
import path from "path";
import zlib from "zlib";
import vm from "vm";
import { parseHTML } from "linkedom";

// ==========================================================================
// loadNotebook
// ==========================================================================

/**
 * Load a lopecode notebook HTML file and boot its Observable runtime.
 *
 * @param {string} notebookPath - Path to the .html notebook file
 * @param {object} [options]
 * @param {function} [options.observer] - Observer factory: (name) => observer.
 *   Default: () => ({}) (headless, no rendering).
 *   Pass Inspector.into(el) for DOM rendering, or a custom observer.
 * @param {number} [options.settleTimeout=10000] - Max ms to wait for boot to settle
 * @param {number} [options.pollInterval=250] - Ms between settle polls
 * @param {function} [options.log] - Logging function (msg) => void. Default: no-op.
 * @param {object} [options.localStorage] - Initial localStorage entries {key: value}
 * @param {string} [options.hash] - Override location.hash (default: from bootconf)
 * @param {string} [options.search] - Set location.search (e.g. for query params)
 * @returns {Promise<LopecodeExecution>}
 */
export async function loadNotebook(notebookPath, options = {}) {
  const {
    observer: observerFactory = () => ({}),
    settleTimeout = 10000,
    pollInterval = 250,
    log: _log = () => {},
    localStorage: initialLocalStorage = {},
    hash: overrideHash = null,
    search: overrideSearch = null,
  } = options;

  const log = _log;
  const absPath = path.resolve(notebookPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Notebook not found: ${absPath}`);
  }

  // ---- 1. Parse HTML ----
  const rawHtml = fs.readFileSync(absPath, "utf-8");
  const { document, window: linkedomWindow } = parseHTML(rawHtml);

  // Build script index
  const scriptMap = new Map();
  for (const el of document.querySelectorAll("script[id]")) {
    scriptMap.set(el.getAttribute("id"), {
      encoding: el.getAttribute("data-encoding") || "text",
      mime: el.getAttribute("data-mime") || "",
      type: el.getAttribute("type") || "",
      textContent: (el.textContent || "").trim(),
    });
  }

  log(`Parsed: ${scriptMap.size} scripts`);

  // ---- Helpers ----
  function decompressSource(id) {
    let info = scriptMap.get(id);
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

  // ---- 2. Shims ----
  if (typeof linkedomWindow.IntersectionObserver !== "function")
    linkedomWindow.IntersectionObserver = class { observe(){} disconnect(){} unobserve(){} };
  if (typeof linkedomWindow.ResizeObserver !== "function")
    linkedomWindow.ResizeObserver = class { observe(){} disconnect(){} unobserve(){} };
  if (typeof linkedomWindow.requestAnimationFrame !== "function") {
    linkedomWindow.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    linkedomWindow.cancelAnimationFrame = (id) => clearTimeout(id);
  }

  // ---- 3. Script execution queue (for d3-require AMD) ----
  const blobUrlStore = new Map();
  const scriptQueue = [];
  let processingScripts = false;
  let sharedContext; // assigned after vm.createContext

  function patchAppendChild(parentProto) {
    const _appendChild = parentProto.appendChild;
    parentProto.appendChild = function(child) {
      const result = _appendChild.call(this, child);
      if (child.tagName === "SCRIPT" && child.src) {
        scriptQueue.push(child);
        if (!processingScripts) processScriptQueue();
      }
      return result;
    };
  }

  function processScriptQueue() {
    if (scriptQueue.length === 0) { processingScripts = false; return; }
    processingScripts = true;
    const scriptEl = scriptQueue.shift();
    executeScript(scriptEl, () => setTimeout(processScriptQueue, 0));
  }

  function executeScript(scriptEl, done) {
    const src = scriptEl.src || scriptEl.getAttribute("src") || "";
    log(`Script: ${src.slice(0, 80)}`);

    // blob:
    if (src.startsWith("blob:")) {
      const blob = blobUrlStore.get(src);
      if (blob) {
        blob.text().then(text => runAndNotify(scriptEl, text, src, done))
          .catch(e => fireOnerror(scriptEl, e, done));
      } else {
        fireOnerror(scriptEl, new Error("blob not found"), done);
      }
      return;
    }

    // Resolve locally
    let id = null;
    if (src.startsWith("file://")) {
      id = src.slice(7);
    } else {
      const normalized = normalize(src);
      if (normalized !== src && (scriptMap.has(normalized) || document.getElementById(normalized))) id = normalized;
      if (!id && (scriptMap.has(src) || document.getElementById(src))) id = src;
    }
    if (id) {
      const result = decompressSource(id);
      if (result) { runAndNotify(scriptEl, result.source, id, done); return; }
    }

    // Network fetch
    if (src.startsWith("http://") || src.startsWith("https://")) {
      globalThis.fetch(src).then(async resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return runAndNotify(scriptEl, await resp.text(), src, done);
      }).catch(e => fireOnerror(scriptEl, e, done));
      return;
    }

    fireOnerror(scriptEl, new Error("not found: " + src), done);
  }

  function runAndNotify(scriptEl, source, filename, done) {
    try {
      vm.runInContext(source, sharedContext, { filename });
      log(`Executed: ${filename.slice(0, 80)} (${source.length} chars)`);
    } catch (e) {
      log(`Script error: ${filename.slice(0, 80)}: ${e.message}`);
      fireOnerror(scriptEl, e, done);
      return;
    }
    try { if (typeof scriptEl.onload === "function") scriptEl.onload(); }
    catch (e) { log(`onload error: ${e.message}`); }
    done();
  }

  function fireOnerror(scriptEl, error, done) {
    try { if (typeof scriptEl.onerror === "function") scriptEl.onerror(error); }
    catch (e) { log(`onerror error: ${e.message}`); }
    done();
  }

  // ---- 4. Patched fetch (virtual filesystem) ----
  async function dvfBytes(id) {
    const el = document.getElementById(id);
    if (!el) return { status: 404 };
    const mime = el.getAttribute("data-mime");
    if (!mime) return { status: 415 };
    const enc = (el.getAttribute("data-encoding") || "text").toLowerCase();
    const text = (el.textContent || "").trim();
    try {
      if (enc === "text") return { status: 200, mime, bytes: new TextEncoder().encode(text) };
      if (enc === "base64") {
        const bin = atob(text);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return { status: 200, mime, bytes: out };
      }
      if (enc === "base64+gzip") {
        return { status: 200, mime, bytes: new Uint8Array(zlib.gunzipSync(Buffer.from(text, "base64"))) };
      }
    } catch { return { status: enc.includes("gzip") ? 499 : 422 }; }
    return { status: 422 };
  }

  const _realFetch = globalThis.fetch;
  function patchedFetch(url, init) {
    if (typeof url === "string") {
      let id;
      if (url.startsWith("file://")) id = url.slice(7);
      else { id = normalize(url); if (!document.getElementById(id)) id = null; }
      if (id) {
        return dvfBytes(id).then(r => {
          if (r.status !== 200) return new Response(null, { status: r.status });
          return new Response(r.bytes, { status: 200, headers: { "Content-Type": r.mime } });
        });
      }
    }
    return _realFetch(url, init);
  }

  // ---- 5. Blob URL tracking ----
  // Patched URL that tracks blob URLs for import() resolution.
  // Must remain a constructor (new URL(...) must work).
  const origCreateObjectURL = URL.createObjectURL;
  const origRevokeObjectURL = URL.revokeObjectURL;
  class PatchedURL extends URL {}
  PatchedURL.createObjectURL = function(blob) {
    const url = origCreateObjectURL.call(URL, blob);
    blobUrlStore.set(url, blob);
    return url;
  };
  PatchedURL.revokeObjectURL = function(url) {
    blobUrlStore.delete(url);
    origRevokeObjectURL.call(URL, url);
  };
  // Copy any other static methods
  for (const key of Object.getOwnPropertyNames(URL)) {
    if (!(key in PatchedURL) && key !== 'prototype' && key !== 'length' && key !== 'name') {
      try { PatchedURL[key] = URL[key]; } catch {}
    }
  }

  // ---- 6. localStorage / location ----
  const lsData = new Map(Object.entries(initialLocalStorage));
  const localStorageShim = {
    getItem: (k) => lsData.get(k) ?? null,
    setItem: (k, v) => lsData.set(k, String(v)),
    removeItem: (k) => lsData.delete(k),
    clear: () => lsData.clear(),
    get length() { return lsData.size; },
    key: (i) => [...lsData.keys()][i] ?? null,
  };

  const locationShim = {
    href: "http://localhost/", hash: "", search: overrideSearch || "",
    pathname: "/", hostname: "localhost", protocol: "http:",
    origin: "http://localhost", host: "localhost", port: "",
    toString() { return this.href; },
  };

  // ---- 7. vm.Context ----
  // Suppress console.trace (some libs dump huge traces)
  const quietConsole = Object.create(console);
  quietConsole.trace = (...a) => {
    log(`trace: ${a.map(x => String(x?.message || x).slice(0, 100)).join(" ")}`);
  };

  const moduleRegistry = new Map();

  sharedContext = vm.createContext({
    console: quietConsole, setTimeout, clearTimeout, setInterval, clearInterval,
    URL: PatchedURL, URLSearchParams, Map, Set, WeakMap, WeakSet,
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
    document,
    window: undefined, globalThis: undefined, self: undefined,
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
  }, { name: "lopecode" });

  sharedContext.globalThis = sharedContext;
  sharedContext.window = sharedContext;
  sharedContext.self = sharedContext;

  // Patch appendChild now that sharedContext exists
  if (document.head) patchAppendChild(document.head);
  if (document.body) patchAppendChild(document.body);
  if (linkedomWindow.HTMLElement?.prototype) patchAppendChild(linkedomWindow.HTMLElement.prototype);

  // ---- 8. importModuleDynamically ----
  async function importModuleDynamically(specifier, referrer) {
    log(`import("${specifier.slice(0, 80)}") from ${referrer?.identifier || "?"}`);

    const resolvedId = resolveSpecifier(specifier);
    if (resolvedId) {
      const result = decompressSource(resolvedId);
      if (result) {
        if (result.mime === "application/json" || resolvedId.endsWith(".json")) {
          const mod = new vm.SyntheticModule(["default"],
            function() { this.setExport("default", JSON.parse(result.source)); },
            { context: sharedContext, identifier: `json:${resolvedId}` });
          await mod.link(() => {});
          await mod.evaluate();
          return mod;
        }
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
        } catch (e) { log(`Compile fail "${resolvedId}": ${e.message}`); }
      }
    }

    if (specifier.startsWith("blob:")) {
      const blob = blobUrlStore.get(specifier);
      if (blob) {
        try {
          const text = await blob.text();
          const mod = new vm.SourceTextModule(text, {
            context: sharedContext, identifier: `blob:${specifier.slice(0, 40)}`,
            importModuleDynamically,
          });
          await mod.link(linker);
          await mod.evaluate();
          return mod;
        } catch (e) { log(`Blob fail: ${e.message}`); }
      }
    }

    log(`Unresolved: "${specifier}" → stub`);
    const stub = new vm.SyntheticModule(["default"],
      function() { this.setExport("default", undefined); },
      { context: sharedContext, identifier: `stub:${specifier}` });
    await stub.link(() => {});
    await stub.evaluate();
    return stub;
  }

  async function linker(specifier, ref) {
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
    const stub = new vm.SyntheticModule(["default"],
      function() { this.setExport("default", undefined); },
      { context: sharedContext, identifier: `stub:${specifier}` });
    await stub.link(linker);
    return stub;
  }

  // ---- 9. importShim ----
  async function importShim(specifier, parentUrl) {
    const mod = await importModuleDynamically(specifier, { identifier: parentUrl || "importShim" });
    return mod.namespace;
  }
  sharedContext.importShim = importShim;

  // ---- 10. Find bootloader ----
  let bootloaderName = null;
  for (const el of document.querySelectorAll('script[type="module"]')) {
    const src = el.textContent || "";
    const m = src.match(/\{default:\s*define\}\s*=\s*await\s+importShim\("([^"]+)"\)/);
    if (m) { bootloaderName = m[1]; break; }
  }
  if (!bootloaderName) {
    for (const id of scriptMap.keys()) {
      if (id.includes("bootloader")) { bootloaderName = id; break; }
    }
  }

  const bootconfResult = decompressSource("bootconf.json");
  const bootconf = bootconfResult ? JSON.parse(bootconfResult.source) : null;

  if (!bootloaderName || !bootconf) {
    throw new Error("No bootloader/bootconf found in notebook");
  }

  // Set location hash
  if (overrideHash !== null) {
    locationShim.hash = overrideHash;
  } else if (bootconf.hash) {
    locationShim.hash = bootconf.hash;
  }

  log(`Bootloader: ${bootloaderName}, mains: ${JSON.stringify(bootconf.mains)}`);

  // ---- 11. Boot (mirrors <script type="module" id="main">) ----
  const runtimeNs = await importShim("@observablehq/runtime@6.0.0");
  const RuntimeClass = runtimeNs.Runtime;
  if (typeof RuntimeClass !== "function") {
    throw new Error("Failed to load Observable Runtime");
  }

  const runtime = new RuntimeClass({
    __ojs_runtime: () => runtime,
    __ojs_observer: () => observerFactory,
  });
  sharedContext.__ojs_runtime = runtime;
  sharedContext.__ojs_observer = observerFactory;

  runtime._builtin.define("importShim", [], () => importShim);

  const bootloaderNs = await importShim(bootloaderName);
  const bootloaderDefine = bootloaderNs.default;
  if (typeof bootloaderDefine !== "function") {
    throw new Error("Bootloader does not export a define function");
  }

  runtime.module(bootloaderDefine, observerFactory);

  // ---- 12. Wait for settle ----
  const deadline = Date.now() + settleTimeout;
  let lastSettled = 0;
  let stableCount = 0;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollInterval));
    runtime._computeNow?.();

    let settled = 0;
    for (const v of runtime._variables) {
      if (v._value !== undefined || v._error !== undefined) settled++;
    }

    if (settled === lastSettled) {
      stableCount++;
    } else {
      stableCount = 0;
      lastSettled = settled;
    }

    if (stableCount >= 5 && runtime._variables.size > 0) break;
  }

  log(`Settled: ${lastSettled} resolved/errored out of ${runtime._variables.size}`);

  // ---- 13. Return execution handle ----
  return new LopecodeExecution({
    runtime,
    document,
    context: sharedContext,
    bootconf,
    bootloaderName,
    locationShim,
    localStorageShim,
    notebookPath: absPath,
    moduleRegistry,
    importShim,
    log,
  });
}

// ==========================================================================
// LopecodeExecution
// ==========================================================================

export class LopecodeExecution {
  constructor(internals) {
    this._internals = internals;
    this.runtime = internals.runtime;
    this.document = internals.document;
    this.context = internals.context;
    this.bootconf = internals.bootconf;
    this.notebookPath = internals.notebookPath;
  }

  /** The Observable Runtime's mains map (name → module) */
  get mains() {
    return this.runtime.mains || new Map();
  }

  /** Location shim — modify hash/search to affect cells that read location */
  get location() {
    return this._internals.locationShim;
  }

  /** localStorage shim */
  get localStorage() {
    return this._internals.localStorageShim;
  }

  /** importShim function — same as browser's importShim */
  get importShim() {
    return this._internals.importShim;
  }

  /** Force the runtime to compute now */
  computeNow() {
    this.runtime._computeNow?.();
  }

  /**
   * Get a variable's value directly (no serialization).
   * @param {string} name - Variable name
   * @param {string} [moduleName] - Module to search in
   * @returns {{ value, error, found }}
   */
  getVariable(name, moduleName = null) {
    for (const v of this.runtime._variables) {
      if (v._name === name) {
        if (moduleName && v._module?._name !== moduleName) {
          // Also check mains
          const mainsMod = this.mains.get(moduleName);
          if (mainsMod && v._module !== mainsMod) continue;
        }
        return {
          found: true,
          value: v._value,
          error: v._error,
          hasValue: v._value !== undefined,
          hasError: v._error !== undefined,
          reachable: v._reachable,
        };
      }
    }
    return { found: false };
  }

  /**
   * Define or redefine a variable.
   * @param {string} name
   * @param {string[]} inputs - Dependency names
   * @param {function} definition - The cell function
   * @param {string} [moduleName] - Target module
   */
  defineVariable(name, inputs, definition, moduleName = null) {
    const mod = this._findModule(moduleName);
    if (!mod) throw new Error(`Module not found: ${moduleName || "default"}`);

    for (const v of this.runtime._variables) {
      if (v._name === name && v._module === mod) {
        v.define(name, inputs, definition);
        this.computeNow();
        return;
      }
    }
    const newVar = mod.variable({});
    newVar.define(name, inputs, definition);
    this.computeNow();
  }

  /**
   * Delete a variable.
   */
  deleteVariable(name, moduleName = null) {
    const mod = moduleName ? this._findModule(moduleName) : null;
    for (const v of this.runtime._variables) {
      if (v._name === name) {
        if (mod && v._module !== mod) continue;
        v.delete();
        return true;
      }
    }
    return false;
  }

  /**
   * List all named variables.
   */
  listVariables() {
    const result = [];
    for (const v of this.runtime._variables) {
      if (!v._name) continue;
      result.push({
        name: v._name,
        module: this._getModuleName(v._module),
        hasValue: v._value !== undefined,
        hasError: v._error !== undefined,
        reachable: v._reachable,
        type: v._value !== undefined ? typeof v._value : (v._error ? "error" : "pending"),
      });
    }
    return result;
  }

  /**
   * Run test_* variables and return results.
   */
  async runTests(timeout = 30000, filter = null) {
    const results = new Map();
    const promises = [];

    for (const v of this.runtime._variables) {
      if (typeof v._name !== "string" || !v._name.startsWith("test_")) continue;
      if (filter && !v._name.includes(filter) && !this._getModuleName(v._module).includes(filter)) continue;

      const fullName = `${this._getModuleName(v._module)}#${v._name}`;

      const p = new Promise(resolve => {
        const tid = setTimeout(() => {
          results.set(fullName, { state: "timeout", name: v._name, module: this._getModuleName(v._module) });
          resolve();
        }, timeout);

        if (v._value !== undefined) {
          clearTimeout(tid);
          results.set(fullName, { state: "passed", name: v._name, module: this._getModuleName(v._module), value: String(v._value).slice(0, 200) });
          resolve(); return;
        }
        if (v._error !== undefined) {
          clearTimeout(tid);
          results.set(fullName, { state: "failed", name: v._name, module: this._getModuleName(v._module), error: v._error?.message || String(v._error) });
          resolve(); return;
        }

        if (!v._reachable) {
          v._reachable = true;
          this.runtime._dirty?.add(v);
        }

        const oldObserver = v._observer;
        v._observer = {
          fulfilled: (value) => {
            clearTimeout(tid);
            results.set(fullName, { state: "passed", name: v._name, module: this._getModuleName(v._module), value: String(value).slice(0, 200) });
            resolve();
          },
          rejected: (error) => {
            clearTimeout(tid);
            results.set(fullName, { state: "failed", name: v._name, module: this._getModuleName(v._module), error: error?.message || String(error) });
            resolve();
          },
          pending: () => {},
        };
      });
      promises.push(p);
    }

    if (promises.length === 0) return { tests: [], summary: { total: 0, passed: 0, failed: 0, timeout: 0 } };

    this.computeNow();
    await Promise.race([
      Promise.all(promises),
      new Promise(r => setTimeout(r, timeout + 5000)),
    ]);

    const tests = [...results.values()];
    return {
      tests,
      summary: {
        total: tests.length,
        passed: tests.filter(t => t.state === "passed").length,
        failed: tests.filter(t => t.state === "failed").length,
        timeout: tests.filter(t => t.state === "timeout").length,
      },
    };
  }

  /**
   * Evaluate code in the runtime context.
   */
  eval(code) {
    return vm.runInContext(code, this.context);
  }

  /**
   * Wait for a specific variable to have a value.
   */
  async waitForVariable(name, timeout = 30000, moduleName = null) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const result = this.getVariable(name, moduleName);
      if (result.found && (result.hasValue || result.hasError)) return result;
      await new Promise(r => setTimeout(r, 100));
      this.computeNow();
    }
    throw new Error(`Timeout waiting for variable: ${name}`);
  }

  /**
   * Dispose the runtime and clean up.
   */
  dispose() {
    try { this.runtime.dispose(); } catch {}
    this._internals.moduleRegistry.clear();
  }

  // ---- Private helpers ----

  _findModule(moduleName) {
    if (!moduleName) {
      // First main
      if (this.mains.size > 0) return this.mains.values().next().value;
      return null;
    }
    const fromMains = this.mains.get(moduleName);
    if (fromMains) return fromMains;
    for (const v of this.runtime._variables) {
      if (v._module?._name === moduleName) return v._module;
    }
    return null;
  }

  _getModuleName(mod) {
    if (!mod) return "?";
    if (mod === this.runtime._builtin) return "(builtin)";
    if (this.runtime.mains) {
      for (const [name, m] of this.runtime.mains) {
        if (m === mod) return name;
      }
    }
    return mod._name || "?";
  }
}
