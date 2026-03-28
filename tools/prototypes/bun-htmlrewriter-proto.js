#!/usr/bin/env node
/**
 * bun-htmlrewriter-proto.js - Prototype for loading lopecode notebooks using
 * Bun's HTMLRewriter and web-standard APIs.
 *
 * Usage:
 *   bun tools/prototypes/bun-htmlrewriter-proto.js <notebook.html>
 *   node tools/prototypes/bun-htmlrewriter-proto.js <notebook.html>
 *
 * Bun advantages explored:
 *   - HTMLRewriter for fast HTML parsing (falls back to cheerio on Node)
 *   - DecompressionStream for gzip (falls back to node:zlib on Node)
 *   - Native Blob, Response, URL.createObjectURL web APIs
 *   - Native ESM support
 *
 * This prototype:
 *   1. Reads a lopecode HTML file
 *   2. Extracts <script> tags (runtime, modules, file attachments)
 *   3. Decompresses gzipped content
 *   4. Evals the Observable runtime to get Runtime class
 *   5. Transforms module sources into callable define() functions
 *   6. Creates a runtime, loads modules, lists variables
 */

import fs from "fs";
import path from "path";

// ─── Environment detection ─────────────────────────────────────────────────────

const IS_BUN = typeof Bun !== "undefined";
const RUNTIME_NAME = IS_BUN ? `Bun ${Bun.version}` : `Node ${process.version}`;

function log(msg) {
  console.log(`[proto] ${msg}`);
}

function logSection(title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}`);
}

// ─── Args ───────────────────────────────────────────────────────────────────────

const notebookPath = process.argv[2];
if (!notebookPath) {
  console.error("Usage: bun tools/prototypes/bun-htmlrewriter-proto.js <notebook.html>");
  console.error("       node tools/prototypes/bun-htmlrewriter-proto.js <notebook.html>");
  process.exit(1);
}

const resolvedPath = path.resolve(notebookPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

// ─── Step 0: Environment check ──────────────────────────────────────────────────

logSection("Step 0: Environment Detection");
log(`Runtime: ${RUNTIME_NAME}`);
log(`IS_BUN: ${IS_BUN}`);

// Check web API availability
const apis = {
  Blob: typeof Blob !== "undefined",
  Response: typeof Response !== "undefined",
  DecompressionStream: typeof DecompressionStream !== "undefined",
  ReadableStream: typeof ReadableStream !== "undefined",
  TextDecoder: typeof TextDecoder !== "undefined",
  "URL.createObjectURL": typeof URL !== "undefined" && typeof URL.createObjectURL === "function",
  HTMLRewriter: IS_BUN && typeof HTMLRewriter !== "undefined",
};

for (const [name, available] of Object.entries(apis)) {
  log(`  ${name}: ${available ? "YES" : "no"}`);
}

// ─── Step 1: Read HTML file ─────────────────────────────────────────────────────

logSection("Step 1: Read HTML File");
const html = fs.readFileSync(resolvedPath, "utf-8");
log(`File: ${path.basename(resolvedPath)}`);
log(`Size: ${(html.length / 1024 / 1024).toFixed(2)} MB (${html.length} bytes)`);

// ─── Step 2: Extract script tags ────────────────────────────────────────────────

logSection("Step 2: Extract Script Tags");

/**
 * ScriptInfo represents an extracted <script> tag.
 * @typedef {{
 *   id: string,
 *   type: string|null,
 *   encoding: string|null,
 *   mime: string|null,
 *   content: string
 * }} ScriptInfo
 */

/** @type {ScriptInfo[]} */
let scripts = [];

if (IS_BUN) {
  log("Using Bun HTMLRewriter for extraction...");
  scripts = await extractWithHTMLRewriter(html);
} else {
  log("Bun not available, using cheerio for extraction...");
  scripts = await extractWithCheerio(html);
}

/**
 * Extract scripts using Bun's HTMLRewriter.
 * HTMLRewriter is a streaming parser -- we collect script tag attributes and content.
 */
async function extractWithHTMLRewriter(htmlStr) {
  const collected = [];
  let current = null;

  const rewriter = new HTMLRewriter()
    .on("script[id]", {
      element(el) {
        current = {
          id: el.getAttribute("id"),
          type: el.getAttribute("type"),
          encoding: el.getAttribute("data-encoding"),
          mime: el.getAttribute("data-mime"),
          content: "",
        };
      },
      text(text) {
        if (current) {
          current.content += text.text;
          if (text.lastInTextNode) {
            // May get more text chunks
          }
        }
      },
    });

  // HTMLRewriter.transform() expects a Response
  const response = new Response(htmlStr, {
    headers: { "content-type": "text/html" },
  });
  const transformed = rewriter.transform(response);
  // We need to consume the response to trigger the handlers
  await transformed.text();

  // The handlers fire during consumption, but HTMLRewriter is streaming.
  // We need a slightly different approach -- collect via element end handler.
  // Actually, let's try a second pass with proper collection:

  const collected2 = [];
  let cur2 = null;

  const rewriter2 = new HTMLRewriter()
    .on("script[id]", {
      element(el) {
        // If there was a previous script being collected, push it
        if (cur2) {
          cur2.content = cur2.content.trim();
          if (cur2.content) collected2.push(cur2);
        }
        cur2 = {
          id: el.getAttribute("id"),
          type: el.getAttribute("type"),
          encoding: el.getAttribute("data-encoding"),
          mime: el.getAttribute("data-mime"),
          content: "",
        };
        // Use onEndTag to finalize
        el.onEndTag(() => {
          if (cur2) {
            cur2.content = cur2.content.trim();
            if (cur2.content) collected2.push(cur2);
            cur2 = null;
          }
        });
      },
      text(text) {
        if (cur2) {
          cur2.content += text.text;
        }
      },
    });

  const resp2 = new Response(htmlStr, {
    headers: { "content-type": "text/html" },
  });
  await rewriter2.transform(resp2).text();

  return collected2;
}

/**
 * Extract scripts using cheerio (Node.js fallback).
 */
async function extractWithCheerio(htmlStr) {
  const cheerio = await import("cheerio");
  const $ = cheerio.load(htmlStr);
  const result = [];

  $("script[id]").each((_, el) => {
    const $el = $(el);
    const content = $el.text().trim();
    if (!content) return;

    result.push({
      id: $el.attr("id"),
      type: $el.attr("type") || null,
      encoding: $el.attr("data-encoding") || null,
      mime: $el.attr("data-mime") || null,
      content,
    });
  });

  return result;
}

// Categorize scripts
const gzippedScripts = scripts.filter((s) => s.encoding === "base64+gzip");
const plainModules = scripts.filter(
  (s) =>
    !s.encoding &&
    (s.mime === "application/javascript" || (s.id.startsWith("@") && !s.mime))
);
const fileAttachments = scripts.filter(
  (s) =>
    s.type === "lope-file" ||
    (s.encoding === "base64" && s.mime !== "application/javascript") ||
    s.id.startsWith("file://")
);
const cssScripts = scripts.filter((s) => s.mime === "text/css");
const otherScripts = scripts.filter(
  (s) =>
    !gzippedScripts.includes(s) &&
    !plainModules.includes(s) &&
    !fileAttachments.includes(s) &&
    !cssScripts.includes(s)
);

log(`Total script[id] tags: ${scripts.length}`);
log(`  Gzipped (base64+gzip): ${gzippedScripts.length}`);
log(`  Plain JS modules:      ${plainModules.length}`);
log(`  File attachments:      ${fileAttachments.length}`);
log(`  CSS:                   ${cssScripts.length}`);
log(`  Other:                 ${otherScripts.length}`);

log("\nGzipped scripts:");
for (const s of gzippedScripts) {
  log(`  ${s.id} (${s.content.length} base64 chars)`);
}

log("\nPlain JS modules (first 10):");
for (const s of plainModules.slice(0, 10)) {
  log(`  ${s.id} (${s.content.length} chars)`);
}
if (plainModules.length > 10) {
  log(`  ... and ${plainModules.length - 10} more`);
}

// ─── Step 3: Decompress gzipped content ─────────────────────────────────────────

logSection("Step 3: Decompress Gzipped Content");

/**
 * Decompress base64+gzip content to UTF-8 string.
 * Uses DecompressionStream if available (Bun/modern Node), else node:zlib.
 */
async function decompress(base64Content, label) {
  const binaryData = Buffer.from(base64Content, "base64");
  log(`  ${label}: ${base64Content.length} base64 chars -> ${binaryData.length} bytes compressed`);

  // Try DecompressionStream first (web standard)
  if (typeof DecompressionStream !== "undefined") {
    log(`  Using DecompressionStream (web standard)`);
    try {
      const ds = new DecompressionStream("gzip");
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();

      // Write data
      writer.write(new Uint8Array(binaryData));
      writer.close();

      // Read all chunks
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Concatenate and decode
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const combined = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      const text = new TextDecoder().decode(combined);
      log(`  Decompressed: ${text.length} chars`);
      return text;
    } catch (e) {
      log(`  DecompressionStream failed: ${e.message}, falling back to zlib`);
    }
  }

  // Fallback: node:zlib
  log(`  Using node:zlib`);
  const zlib = await import("zlib");
  const text = zlib.gunzipSync(binaryData).toString("utf-8");
  log(`  Decompressed: ${text.length} chars`);
  return text;
}

// Decompress the runtime
const runtimeScript = scripts.find((s) => s.id === "@observablehq/runtime@6.0.0");
if (!runtimeScript) {
  console.error("Could not find @observablehq/runtime@6.0.0 in notebook!");
  process.exit(1);
}

const runtimeSource = await decompress(runtimeScript.content, "@observablehq/runtime@6.0.0");
log(`\nRuntime source preview (first 200 chars):\n  ${runtimeSource.substring(0, 200)}...`);

// Also decompress inspector if present
const inspectorScript = scripts.find((s) => s.id === "@observablehq/inspector@5.0.1");
let inspectorSource = null;
if (inspectorScript) {
  inspectorSource = await decompress(inspectorScript.content, "@observablehq/inspector@5.0.1");
}

// ─── Step 4: Eval the Observable runtime ────────────────────────────────────────

logSection("Step 4: Load Observable Runtime");

/**
 * Evaluate the runtime ES module source and extract { Runtime, RuntimeError }.
 * The source is an ES module with `export { Runtime, RuntimeError }` at the end.
 * We transform it to a function that returns those classes.
 */
function loadRuntimeFromSource(source) {
  log("Transforming runtime source (removing ESM export, adding return)...");

  let transformed = source;
  // Remove the export statement and add a return
  transformed = transformed.replace(
    /export\s*\{\s*Runtime\s*,\s*RuntimeError\s*\}\s*;?\s*$/,
    ""
  );
  transformed += "\nreturn { Runtime, RuntimeError };";

  log("Evaluating runtime source with Function constructor...");
  const fn = new Function(
    "window",
    "document",
    "globalThis",
    "setTimeout",
    "clearTimeout",
    "setInterval",
    "clearInterval",
    "requestAnimationFrame",
    "Map",
    "Set",
    "Promise",
    "Symbol",
    transformed
  );

  // Provide minimal DOM shims
  const minimalWindow = {
    document: {
      createElement: () => ({}),
      createTextNode: () => ({}),
      body: {},
    },
    location: { href: "http://localhost", origin: "http://localhost" },
    getComputedStyle: () => ({}),
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    IntersectionObserver: class {
      observe() {}
      disconnect() {}
    },
  };
  const minimalDocument = minimalWindow.document;

  const result = fn(
    minimalWindow,
    minimalDocument,
    globalThis,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    (cb) => setTimeout(cb, 16), // requestAnimationFrame shim
    Map,
    Set,
    Promise,
    Symbol
  );

  log(`Runtime class: ${result.Runtime ? "loaded" : "FAILED"}`);
  log(`RuntimeError class: ${result.RuntimeError ? "loaded" : "FAILED"}`);

  if (result.Runtime) {
    log(`Runtime.prototype methods: ${Object.getOwnPropertyNames(result.Runtime.prototype).join(", ")}`);
  }

  return result;
}

let Runtime, RuntimeError;
try {
  const result = loadRuntimeFromSource(runtimeSource);
  Runtime = result.Runtime;
  RuntimeError = result.RuntimeError;
} catch (e) {
  console.error(`Failed to load runtime: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
}

// ─── Step 5: Transform module sources into define() functions ───────────────────

logSection("Step 5: Compile Module Sources");

/**
 * Compile a module's ES module source into a callable define(runtime, observer) function.
 *
 * Module source format:
 *   const _cellName = function _cellName(dep1, dep2) { return(...) };
 *   ...
 *   export default function define(runtime, observer) {
 *     const main = runtime.module();
 *     main.variable(observer("cellName")).define("cellName", ["dep1"], _cellName);
 *     ...
 *   }
 */
function compileModule(source, moduleName) {
  // Some modules have multiple `export default function define(...)` blocks
  // (the main define and sub-module defines). Also may have named exports.
  // We need to strip ALL export keywords to make it evaluable via Function().
  let transformed = source;

  // Replace the LAST `export default function define(` with a capturable form.
  // Earlier occurrences may be inside template literals (string content) or are sub-module defines.
  // The main/entry define is always the last one in the source.
  const exportDefinePattern = /export\s+default\s+function\s+define\s*\(/g;
  const matches = [...transformed.matchAll(exportDefinePattern)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    transformed =
      transformed.substring(0, lastMatch.index) +
      "const __define__ = function define(" +
      transformed.substring(lastMatch.index + lastMatch[0].length);
  }

  // Strip remaining `export` keywords (named exports like `export {foo}` or `export function`)
  transformed = transformed.replace(/\bexport\s*\{/g, "void {");
  transformed = transformed.replace(/\bexport\s+function\b/g, "function");
  transformed = transformed.replace(/\bexport\s+const\b/g, "const");
  transformed = transformed.replace(/\bexport\s+let\b/g, "let");
  transformed = transformed.replace(/\bexport\s+var\b/g, "var");

  transformed += "\nreturn __define__;";

  try {
    const fn = new Function(
      "window",
      "document",
      "URL",
      "Blob",
      "console",
      "setTimeout",
      "clearTimeout",
      "fetch",
      "Map",
      "Set",
      "Promise",
      "Symbol",
      "globalThis",
      transformed
    );

    const define = fn(
      globalThis.window || globalThis, // window
      globalThis.document || {
        createElement: () => ({}),
        createTextNode: () => ({}),
      },
      URL,
      typeof Blob !== "undefined" ? Blob : class Blob {},
      console,
      setTimeout,
      clearTimeout,
      typeof fetch !== "undefined" ? fetch : () => Promise.reject(new Error("no fetch")),
      Map,
      Set,
      Promise,
      Symbol,
      globalThis
    );

    return define;
  } catch (e) {
    log(`  FAILED to compile ${moduleName}: ${e.message}`);
    return null;
  }
}

let compiledCount = 0;
let failedCount = 0;
const compiledModules = new Map();

for (const mod of plainModules) {
  const define = compileModule(mod.content, mod.id);
  if (define) {
    compiledModules.set(mod.id, define);
    compiledCount++;
  } else {
    failedCount++;
  }
}

log(`Compiled: ${compiledCount} modules`);
log(`Failed: ${failedCount} modules`);

// ─── Step 6: Create runtime and load modules ────────────────────────────────────

logSection("Step 6: Create Runtime and Load Modules");

log("Creating Observable runtime instance...");

const runtime = new Runtime((name) => {
  // Builtin resolver
  if (name === "__ojs_runtime") return runtime;
  return undefined;
});

log(`Runtime created: ${!!runtime}`);
log(`Runtime._modules: ${runtime._modules ? "exists" : "not found"}`);

// Define minimal builtins
log("Setting up builtins (md, html, htl, width, invalidation, visibility)...");

runtime._builtin.define("md", [], () => {
  return function md(strings, ...values) {
    let result = "";
    for (let i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < values.length) result += String(values[i]);
    }
    return { tagName: "DIV", innerHTML: result, toString: () => result };
  };
});

runtime._builtin.define("html", [], () => {
  return function html(strings, ...values) {
    let result = "";
    for (let i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < values.length) result += String(values[i]);
    }
    return { tagName: "TEMPLATE", innerHTML: result, toString: () => result };
  };
});

runtime._builtin.define("htl", [], () => ({
  html: function html(strings, ...values) {
    let result = "";
    for (let i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < values.length) result += String(values[i]);
    }
    return { tagName: "TEMPLATE", innerHTML: result, toString: () => result };
  },
}));

runtime._builtin.define("width", [], () => 800);
runtime._builtin.define("invalidation", [], () => new Promise(() => {}));
runtime._builtin.define("visibility", [], () => () => Promise.resolve(true));

log("Builtins defined.");

// Build a file attachment lookup from extracted scripts
// File attachments have ids like "@tomlarkworthy/modulename/filename.ext"
const fileAttachmentMap = new Map();
for (const s of fileAttachments) {
  fileAttachmentMap.set(s.id, s);
}
log(`File attachments available: ${fileAttachmentMap.size}`);

/**
 * Create a fileAttachments resolver for a given module.
 * In the Observable runtime, modules call runtime.fileAttachments(name => url_map[name])
 * which returns a function FileAttachment(name) that returns an object with .url(), .text(), etc.
 */
function createFileAttachments(moduleName) {
  return function fileAttachments(resolve) {
    return function FileAttachment(name) {
      const resolvedName = resolve(name);
      // Look up in our extracted scripts
      const scriptId = resolvedName || `${moduleName}/${name}`;
      const script = fileAttachmentMap.get(scriptId);

      log(`  FileAttachment("${name}") -> id="${scriptId}" found=${!!script}`);

      return {
        name,
        url() {
          if (script) {
            // Create a data URL or blob URL from the content
            const mime = script.mime || "application/octet-stream";
            if (script.encoding === "base64" || script.encoding === "base64+gzip") {
              return `data:${mime};base64,${script.content}`;
            }
            return `data:${mime},${encodeURIComponent(script.content)}`;
          }
          return `file://${name}`;
        },
        async text() {
          if (!script) throw new Error(`File attachment not found: ${name}`);
          if (script.encoding === "base64") {
            return Buffer.from(script.content, "base64").toString("utf-8");
          }
          if (script.encoding === "base64+gzip") {
            const buf = Buffer.from(script.content, "base64");
            const zlib = await import("zlib");
            return zlib.gunzipSync(buf).toString("utf-8");
          }
          return script.content;
        },
        async json() {
          const t = await this.text();
          return JSON.parse(t);
        },
        async arrayBuffer() {
          if (!script) throw new Error(`File attachment not found: ${name}`);
          const buf = Buffer.from(script.content, "base64");
          return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        },
        async blob() {
          const ab = await this.arrayBuffer();
          return new Blob([ab], { type: script?.mime || "application/octet-stream" });
        },
      };
    };
  };
}

// Monkey-patch the Runtime prototype to support fileAttachments
// The define() function calls `runtime.fileAttachments(...)` on the runtime-like object
// Actually, it's called on the module: `main.builtin("FileAttachment", ...)` or via runtime.fileAttachments
// Let's check what the define function actually expects...

// In lopecode modules, the define function does:
//   const fileAttachments = runtime.fileAttachments(name => url_map[name]);
//   main.variable(observer()).define("FileAttachment", ...);
// So we need runtime.fileAttachments to exist.

const origModule = Runtime.prototype.module;
Runtime.prototype.module = function (...args) {
  const mod = origModule.apply(this, args);
  return mod;
};

// Add fileAttachments to the runtime instance
runtime.fileAttachments = createFileAttachments("@tomlarkworthy/atlas");
log("Added runtime.fileAttachments support.");

// ─── Load modules ───────────────────────────────────────────────────────────────

// First try a simple module (lopepage-urls has no file attachments)
const simpleModuleName = "@tomlarkworthy/lopepage-urls";
const simpleDefine = compiledModules.get(simpleModuleName);

const observedVariables = [];

function observer(name) {
  return {
    pending() {},
    fulfilled(value) {
      observedVariables.push({
        name,
        type: typeof value,
        valuePreview:
          value === undefined
            ? "undefined"
            : value === null
              ? "null"
              : typeof value === "function"
                ? `[Function: ${value.name || "anonymous"}]`
                : typeof value === "object"
                  ? `[${value.constructor?.name || "Object"}]`
                  : String(value).substring(0, 100),
      });
    },
    rejected(error) {
      observedVariables.push({
        name,
        error: error.message || String(error),
      });
    },
  };
}

// Load the simple module first
if (simpleDefine) {
  log(`\nLoading simple module: ${simpleModuleName}`);
  try {
    simpleDefine(runtime, observer);
    log("define() completed for simple module.");
  } catch (e) {
    log(`define() threw for simple module: ${e.message}`);
  }
} else {
  log(`Simple module ${simpleModuleName} not found, skipping.`);
}

// Now load the target module (atlas)
const targetModuleName = "@tomlarkworthy/atlas";
const targetDefine = compiledModules.get(targetModuleName);

if (!targetDefine) {
  console.error(`Could not find compiled module: ${targetModuleName}`);
  process.exit(1);
}

log(`\nLoading target module: ${targetModuleName}`);
log("Calling define(runtime, observer)...");

try {
  targetDefine(runtime, observer);
  log("define() completed.");
} catch (e) {
  log(`define() threw: ${e.message}`);
  log(e.stack);
}

// Give the runtime a moment to compute
log("Waiting for runtime to settle (500ms)...");
await new Promise((resolve) => setTimeout(resolve, 500));

// ─── Step 7: List variables ─────────────────────────────────────────────────────

logSection("Step 7: Results");

log(`Runtime variables (from runtime._variables): ${runtime._variables ? runtime._variables.size : "N/A"}`);

if (runtime._variables) {
  log("\nAll runtime variables:");
  let count = 0;
  for (const v of runtime._variables) {
    const name = v._name || "(anonymous)";
    const inputs = v._inputs ? v._inputs.map((i) => i._name || "?").join(", ") : "";
    count++;
    if (count <= 30) {
      log(`  ${count}. ${name}${inputs ? ` <- [${inputs}]` : ""}`);
    }
  }
  if (count > 30) {
    log(`  ... and ${count - 30} more (${count} total)`);
  }
}

log(`\nObserved variables that resolved: ${observedVariables.filter((v) => !v.error).length}`);
log(`Observed variables that errored: ${observedVariables.filter((v) => v.error).length}`);

if (observedVariables.length > 0) {
  log("\nFirst 20 observed variables:");
  for (const v of observedVariables.slice(0, 20)) {
    if (v.error) {
      log(`  ${v.name}: ERROR - ${v.error}`);
    } else {
      log(`  ${v.name}: ${v.type} = ${v.valuePreview}`);
    }
  }
  if (observedVariables.length > 20) {
    log(`  ... and ${observedVariables.length - 20} more`);
  }
}

// ─── Step 8: Bun-specific API tests ────────────────────────────────────────────

logSection("Step 8: Web API Capability Tests");

// Test Blob
try {
  const blob = new Blob(["hello world"], { type: "text/plain" });
  log(`Blob: created (size=${blob.size}, type=${blob.type})`);
  const text = await blob.text();
  log(`Blob.text(): "${text}" -- ${text === "hello world" ? "PASS" : "FAIL"}`);
} catch (e) {
  log(`Blob: FAILED - ${e.message}`);
}

// Test URL.createObjectURL
try {
  const blob = new Blob(["console.log('test')"], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  log(`URL.createObjectURL: "${url}" -- ${url ? "CREATED" : "FAIL"}`);
  URL.revokeObjectURL(url);
  log(`URL.revokeObjectURL: called`);
} catch (e) {
  log(`URL.createObjectURL: NOT AVAILABLE - ${e.message}`);
}

// Test Response + DecompressionStream roundtrip
try {
  const zlib = await import("zlib");
  const original = "Hello from compressed data!";
  const compressed = zlib.gzipSync(Buffer.from(original));

  if (typeof DecompressionStream !== "undefined") {
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    writer.write(new Uint8Array(compressed));
    writer.close();

    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const decoded = new TextDecoder().decode(chunks[0]);
    log(`DecompressionStream roundtrip: "${decoded}" -- ${decoded === original ? "PASS" : "FAIL"}`);
  } else {
    log("DecompressionStream: not available (expected on Node < 18)");
  }
} catch (e) {
  log(`DecompressionStream roundtrip: FAILED - ${e.message}`);
}

// Test if we can dynamically import a Blob URL (Bun feature)
if (IS_BUN) {
  try {
    const moduleCode = 'export const answer = 42;';
    const blob = new Blob([moduleCode], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const mod = await import(url);
    log(`Dynamic import from Blob URL: answer=${mod.answer} -- ${mod.answer === 42 ? "PASS" : "FAIL"}`);
    URL.revokeObjectURL(url);
  } catch (e) {
    log(`Dynamic import from Blob URL: FAILED - ${e.message}`);
  }
} else {
  log("Dynamic import from Blob URL: skipped (Node.js does not support this)");
}

// ─── Summary ────────────────────────────────────────────────────────────────────

logSection("Summary");
log(`Runtime: ${RUNTIME_NAME}`);
log(`Notebook: ${path.basename(resolvedPath)}`);
log(`HTML parsing: ${IS_BUN ? "HTMLRewriter" : "cheerio"}`);
log(`Scripts extracted: ${scripts.length}`);
log(`Modules compiled: ${compiledCount}/${plainModules.length}`);
log(`Runtime variables: ${runtime._variables ? runtime._variables.size : "?"}`);
log(`Observed resolved: ${observedVariables.filter((v) => !v.error).length}`);
log(`Observed errors: ${observedVariables.filter((v) => v.error).length}`);

if (IS_BUN) {
  log("\nBun-specific features available:");
  log(`  HTMLRewriter: ${typeof HTMLRewriter !== "undefined" ? "YES" : "no"}`);
  log(`  Blob URL import: tested above`);
  log(`  URL.createObjectURL: ${typeof URL.createObjectURL === "function" ? "YES" : "no"}`);
} else {
  log("\nRunning on Node.js -- Bun-specific features not tested.");
  log("Install Bun (https://bun.sh) and re-run for full feature exploration.");
}

log("\nDone.");
