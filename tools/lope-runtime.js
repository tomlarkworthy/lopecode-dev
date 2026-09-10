/**
 * lope-runtime.js - Load lopecode notebooks in Node.js
 *
 * Mirrors the browser bootstrap using happy-dom + vm.SourceTextModule.
 * Provides direct programmatic access to the Observable Runtime.
 *
 * Usage:
 *   import { loadNotebook } from './lope-runtime.js';
 *   const execution = await loadNotebook('path/to/notebook.html', { settleTimeout: 5000 });
 *   // execution.runtime  — Observable Runtime instance
 *   // execution.document — the DOM document (happy-dom)
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
import { Window } from "happy-dom";
import {
  IDBFactory, IDBKeyRange, IDBCursor, IDBCursorWithValue,
  IDBDatabase, IDBIndex, IDBObjectStore, IDBOpenDBRequest,
  IDBRequest, IDBTransaction, IDBVersionChangeEvent,
} from "fake-indexeddb";

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
 * @param {Object<string, string>} [options.modules] - Map of module name → .js file path.
 *   These override any embedded modules with the same id in the notebook HTML.
 *   Also added to bootconf.mains if not already present.
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
    modules: moduleOverrides = null,
  } = options;

  const log = _log;
  const absPath = path.resolve(notebookPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Notebook not found: ${absPath}`);
  }

  // ---- 1. Parse HTML ----
  const rawHtml = fs.readFileSync(absPath, "utf-8");
  // A DOM environment at the notebook's own URL, so baseURI, location, history and
  // localStorage are the real thing rather than shims. Scripts are not evaluated here —
  // the bootloader is run below, in the vm context.
  const windowUrl = `file://${absPath}${overrideSearch || ""}`;
  const windowSettings = {
    disableJavaScriptEvaluation: true,
    disableJavaScriptFileLoading: true,
    disableCSSFileLoading: true,
  };
  // Script execution is ours (see the queue below) — it has to happen in the vm context,
  // not happy-dom's. Dropping HTMLScriptElement's own connect/attribute hooks makes a
  // <script src> behave like any other element on insert, so happy-dom never races us
  // with its own load/error events.
  const dropScriptLoader = (w) => {
    for (const sym of Object.getOwnPropertySymbols(w.HTMLScriptElement.prototype)) {
      if (sym.description !== "cloneNode") delete w.HTMLScriptElement.prototype[sym];
    }
  };
  let domWindow = new Window({ url: windowUrl, settings: windowSettings });
  dropScriptLoader(domWindow);
  domWindow.document.write(rawHtml);

  // happy-dom 20.x abandons the rest of the document when it meets a <style> inside an
  // <svg> — which is exactly what Observable Plot emits. Seven corpus notebooks bake a
  // Plot chart into their prerender snapshot, and the parse silently loses every script
  // block after it. The page itself deletes that snapshot on boot (lope-prerender-cleanup),
  // so re-parsing without it costs nothing the runtime would have kept.
  if (!domWindow.document.querySelector("script[id]") && /<script[^>]*\sid=/i.test(rawHtml)) {
    const marker = rawHtml.indexOf('id="lope-prerender"');
    const start = marker > 0 ? rawHtml.lastIndexOf("<div", marker) : -1;
    const end = rawHtml.indexOf('<script id="lope-prerender-cleanup"');
    if (start > 0 && end > start) {
      log("prerender snapshot dropped: happy-dom cannot parse <style> inside <svg>");
      domWindow.close();
      domWindow = new Window({ url: windowUrl, settings: windowSettings });
      dropScriptLoader(domWindow);
      domWindow.document.write(rawHtml.slice(0, start) + rawHtml.slice(end));
    }
  }
  if (!domWindow.document.querySelector("script[id]") && /<script[^>]*\sid=/i.test(rawHtml)) {
    throw new Error(`DOM parse produced no script blocks for ${absPath}`);
  }

  const document = domWindow.document;
  for (const [k, v] of Object.entries(initialLocalStorage)) domWindow.localStorage.setItem(k, String(v));

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

  // ---- Module overrides (inject standalone .js files into scriptMap) ----
  if (moduleOverrides) {
    for (const [moduleId, filePath] of Object.entries(moduleOverrides)) {
      const absModPath = path.resolve(filePath);
      if (!fs.existsSync(absModPath)) {
        throw new Error(`Module file not found: ${absModPath} (for ${moduleId})`);
      }
      const source = fs.readFileSync(absModPath, "utf-8");
      scriptMap.set(moduleId, {
        encoding: "text",
        mime: "application/javascript",
        type: "text/plain",
        textContent: source,
      });
      // Also inject into DOM so document.getElementById() finds it
      const existing = document.getElementById(moduleId);
      if (existing) {
        existing.textContent = source;
      } else {
        const el = document.createElement("script");
        el.setAttribute("id", moduleId);
        el.setAttribute("type", "text/plain");
        el.setAttribute("data-mime", "application/javascript");
        el.textContent = source;
        document.body.appendChild(el);
      }
      log(`Module override: ${moduleId} ← ${absModPath} (${source.length} chars)`);
    }

    // Patch bootconf.json to include overridden modules in mains
    const bootconfEntry = scriptMap.get("bootconf.json");
    if (bootconfEntry) {
      try {
        const bc = JSON.parse(bootconfEntry.textContent);
        let changed = false;
        for (const moduleId of Object.keys(moduleOverrides)) {
          if (!bc.mains.includes(moduleId)) {
            bc.mains.push(moduleId);
            changed = true;
            log(`Added ${moduleId} to bootconf.mains`);
          }
        }
        if (changed) {
          bootconfEntry.textContent = JSON.stringify(bc, null, 2);
        }
      } catch (e) {
        log(`Warning: could not patch bootconf.json: ${e.message}`);
      }
    }
  }

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
      vm.runInContext(source, sharedContext, { filename, importModuleDynamically });
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

  // ---- 7. vm.Context ----
  // Suppress console.trace (some libs dump huge traces)
  const quietConsole = Object.create(console);
  quietConsole.trace = (...a) => {
    log(`trace: ${a.map(x => String(x?.message || x).slice(0, 100)).join(" ")}`);
  };

  // The DOM environment already defines the browser globals — copy what it has rather
  // than enumerating a hand-picked subset that drifts from a real browser. Only the
  // node-side globals it lacks, and the notebook's own hooks, are layered on top.
  const domGlobals = {};
  {
    // `eval` and `Function` must stay the vm realm's own: shadowing them with the outer
    // realm's turns a direct eval into an indirect one, so `eval("x = …")` writes to the
    // wrong global (observablejs-toolchain's importFake relies on direct eval).
    const seen = new Set(["window", "self", "globalThis", "constructor", "happyDOM", "eval", "Function"]);
    for (let o = domWindow; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
      for (const name of Object.getOwnPropertyNames(o)) {
        if (seen.has(name)) continue;
        seen.add(name);
        let v;
        try { v = domWindow[name]; } catch { continue; }
        // Methods (setTimeout, atob, requestAnimationFrame, …) need their receiver;
        // constructors must NOT be bound or they lose their static properties.
        if (typeof v === "function" && !Object.prototype.hasOwnProperty.call(v, "prototype")) {
          try { v = v.bind(domWindow); } catch {}
        }
        domGlobals[name] = v;
      }
    }
  }

  sharedContext = vm.createContext(Object.assign(domGlobals, {
    // node-side globals the DOM window does not carry
    Proxy, Reflect, structuredClone, SharedArrayBuffer,
    BigInt64Array, BigUint64Array,
    TextEncoderStream, TextDecoderStream, DecompressionStream, CompressionStream,
    MessageChannel, MessagePort,
    indexedDB: new IDBFactory(),
    IDBKeyRange, IDBCursor, IDBCursorWithValue, IDBDatabase,
    IDBIndex, IDBObjectStore, IDBOpenDBRequest, IDBRequest,
    IDBTransaction, IDBVersionChangeEvent,
    // I/O primitives stay node's: the vm plumbing (fetch, streams, blob: imports)
    // is node's, and mixing in happy-dom's own Blob breaks URL.createObjectURL.
    Blob, File, FormData, Response, Request, Headers,
    ReadableStream, WritableStream, TransformStream,
    AbortController, AbortSignal, crypto,
    console: quietConsole,
    URL: PatchedURL,          // tracks blob: URLs so import() can resolve them
    fetch: patchedFetch,      // notebook-local URLs resolve to embedded content
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
  }), { name: "lopecode" });

  sharedContext.globalThis = sharedContext;
  sharedContext.window = sharedContext;
  sharedContext.self = sharedContext;

  // Patch appendChild now that sharedContext exists
  if (document.head) patchAppendChild(document.head);
  if (document.body) patchAppendChild(document.body);
  if (domWindow.HTMLElement?.prototype) patchAppendChild(domWindow.HTMLElement.prototype);

  // ---- 8. Module map ----
  // One record per resolved specifier, and one link+evaluate promise per record — the
  // contract a browser's module map has. The previous version cached the raw Module and
  // re-checked `status` in every caller, so a second import arriving while the first was
  // still linking either got back an unevaluated module (its namespace empty, so
  // `runtime.module(ns.default)` produced a module with no cells) or handed a "linking"
  // module to the vm linker, which throws "Module status must not be unlinked or
  // linking". Both symptoms were the same missing memo.
  const moduleRegistry = new Map();  // key -> Promise<Module>, linked and evaluated
  const moduleRecords = new Map();   // key -> Module, possibly unlinked

  const registryKey = (specifier) => resolveSpecifier(specifier) || specifier;

  // Construct (and cache) a module record. Never links or evaluates: the vm links the
  // whole graph itself, so the linker must hand back records rather than finished
  // modules — that is what lets an import cycle terminate.
  async function moduleRecord(specifier) {
    const key = registryKey(specifier);
    if (moduleRecords.has(key)) return moduleRecords.get(key);

    let mod = null;
    const resolvedId = resolveSpecifier(specifier);
    if (resolvedId) {
      const result = decompressSource(resolvedId);
      if (result) {
        if (result.mime === "application/json" || resolvedId.endsWith(".json")) {
          mod = new vm.SyntheticModule(["default"],
            function() { this.setExport("default", JSON.parse(result.source)); },
            { context: sharedContext, identifier: `json:${resolvedId}` });
        } else {
          try {
            mod = new vm.SourceTextModule(result.source, {
              context: sharedContext, identifier: resolvedId, importModuleDynamically,
            });
          } catch (e) { log(`Compile fail "${resolvedId}": ${e.message}`); }
        }
      }
    } else if (specifier.startsWith("blob:")) {
      const blob = blobUrlStore.get(specifier);
      if (blob) {
        try {
          mod = new vm.SourceTextModule(await blob.text(), {
            context: sharedContext, identifier: specifier, importModuleDynamically,
          });
        } catch (e) { log(`Blob fail: ${e.message}`); }
      }
    }

    if (!mod) {
      log(`Unresolved: "${specifier}" → stub`);
      mod = new vm.SyntheticModule(["default"],
        function() { this.setExport("default", undefined); },
        { context: sharedContext, identifier: `stub:${specifier}` });
    }
    moduleRecords.set(key, mod);
    return mod;
  }

  function linker(specifier) {
    return moduleRecord(specifier);
  }

  function importModuleDynamically(specifier, referrer) {
    const key = registryKey(specifier);
    const cached = moduleRegistry.get(key);
    if (cached) return cached;
    log(`import("${specifier.slice(0, 80)}") from ${referrer?.identifier || "?"}`);
    const pending = (async () => {
      const mod = await moduleRecord(specifier);
      if (mod.status === "unlinked") await mod.link(linker);
      if (mod.status === "linked") await mod.evaluate();
      return mod;
    })();
    moduleRegistry.set(key, pending);
    return pending;
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
    domWindow.location.hash = overrideHash;
  } else if (bootconf.hash) {
    domWindow.location.hash = bootconf.hash;
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
  // Hook for harness diagnostics (queue tracing); inert unless passed.
  if (typeof options.instrument === "function") options.instrument(runtime);
  sharedContext.__ojs_observer = observerFactory;

  // The bootloader defines this itself, guarded on `window.importShim` (bootloader.js:23).
  // Defining it here too makes the builtin module hold the name twice, and the runtime
  // replaces BOTH with a thrower — "importShim is defined more than once". Everything
  // whose module bridge references importShim then rejects, and since a rejected compute
  // never sets _error, those cells read as pending forever rather than as failures.
  // Expose it on the context instead and let the bootloader's guarded define win.
  sharedContext.importShim = importShim;

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
    locationShim: domWindow.location,
    localStorageShim: domWindow.localStorage,
    notebookPath: absPath,
    moduleRegistry,
    moduleRecords,
    domWindow,
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

  /** The DOM Location — assign hash/search to affect cells that read location */
  get location() {
    return this._internals.locationShim;
  }

  /** The DOM localStorage */
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
  /**
   * A test that declines to run must not report as one that ran. The marker is the
   * cell's own value — `return "skipped: no layout engine"` — or `{skipped: true, reason}`.
   * @returns {string|null} the reason, or null if this value is not a skip
   */
  static skipReason(value) {
    if (typeof value === "string") {
      const m = /^\s*skipped\s*:\s*(.*)$/is.exec(value);
      return m ? m[1].trim() : null;
    }
    if (value && typeof value === "object" && (value.skipped === true || value.__skip === true))
      return String(value.reason ?? value.why ?? "no reason given");
    return null;
  }

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
          const why = LopecodeExecution.skipReason(v._value);
          results.set(fullName, why === null
            ? { state: "passed", name: v._name, module: this._getModuleName(v._module), value: String(v._value).slice(0, 200) }
            : { state: "skipped", name: v._name, module: this._getModuleName(v._module), reason: why });
          resolve(); return;
        }
        if (v._error !== undefined) {
          clearTimeout(tid);
          results.set(fullName, { state: "failed", name: v._name, module: this._getModuleName(v._module), error: v._error?.message || String(v._error) });
          resolve(); return;
        }

        // Attach a real observer so the runtime considers this variable (and deps) reachable
        v._observer = {
          fulfilled: (value) => {
            clearTimeout(tid);
            const why = LopecodeExecution.skipReason(value);
            results.set(fullName, why === null
              ? { state: "passed", name: v._name, module: this._getModuleName(v._module), value: String(value).slice(0, 200) }
              : { state: "skipped", name: v._name, module: this._getModuleName(v._module), reason: why });
            resolve();
          },
          rejected: (error) => {
            clearTimeout(tid);
            results.set(fullName, { state: "failed", name: v._name, module: this._getModuleName(v._module), error: error?.message || String(error) });
            resolve();
          },
          pending: () => {},
        };
        // Do NOT preset _reachable: computeNow queues a variable only when its
        // reachability RISES, and `true > true` is false. The observer above raises it.
        this.runtime._dirty?.add(v);
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
        skipped: tests.filter(t => t.state === "skipped").length,
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
    // Attach an observer to force the variable (and its transitive deps) reachable
    let observedVar = null;
    for (const v of this.runtime._variables) {
      if (v._name === name) {
        if (moduleName && v._module?._name !== moduleName) {
          const mainsMod = this.mains.get(moduleName);
          if (mainsMod && v._module !== mainsMod) continue;
        }
        observedVar = v;
        break;
      }
    }
    if (observedVar && typeof observedVar._observer === 'symbol') {
      // Replace the no_observer sentinel with a real observer to make reachable
      observedVar._observer = { fulfilled() {}, rejected() {}, pending() {} };
      this.runtime._dirty?.add(observedVar);
      this.computeNow();
    }

    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const result = this.getVariable(name, moduleName);
      if (result.found && (result.hasValue || result.hasError)) return result;
      this.computeNow();
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for variable: ${name}`);
  }

  /**
   * Dispose the runtime and clean up.
   */
  dispose() {
    try { this.runtime.dispose(); } catch {}
    this._internals.moduleRegistry.clear();
    this._internals.moduleRecords?.clear();
    // The DOM window owns real timers and observers; without this the process never exits.
    try { this._internals.domWindow?.happyDOM?.abort?.(); } catch {}
    try { this._internals.domWindow?.close?.(); } catch {}
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
