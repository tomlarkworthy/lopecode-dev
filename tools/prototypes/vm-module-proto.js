#!/usr/bin/env node
/**
 * vm-module-proto.js - Prototype using Node's vm.SourceTextModule for lopecode
 *
 * Uses the experimental vm.Module API to properly handle ES modules extracted
 * from lopecode HTML notebooks, instead of the new Function() approach.
 *
 * The key advantage: vm.SourceTextModule handles `export default` and `import`
 * statements natively, so we don't need to regex-transform module source code.
 *
 * Run with:
 *   node --experimental-vm-modules tools/prototypes/vm-module-proto.js <notebook.html>
 *
 * Requirements: Node.js 20+ with --experimental-vm-modules flag
 */

import fs from "fs";
import path from "path";
import zlib from "zlib";
import vm from "vm";
import * as cheerio from "cheerio";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  console.log(`[vm-proto] ${msg}`);
}

function logSection(title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(60)}`);
}

// ---------------------------------------------------------------------------
// HTML Extraction (same logic as lope-reader / lope-node-repl)
// ---------------------------------------------------------------------------

function extractScript(doc, id) {
  let content = null;
  let encoding = null;
  let mime = null;
  let type = null;

  doc("script[id]").each((_, el) => {
    if (doc(el).attr("id") === id) {
      content = doc(el).text().trim();
      encoding = doc(el).attr("data-encoding");
      mime = doc(el).attr("data-mime");
      type = doc(el).attr("type");
    }
  });

  if (!content) return null;

  let source;
  if (encoding === "base64+gzip") {
    const buf = Buffer.from(content, "base64");
    source = zlib.gunzipSync(buf).toString("utf-8");
  } else {
    source = content;
  }

  return { source, encoding, mime, type };
}

function listAllScripts(doc) {
  const scripts = [];
  doc("script[id]").each((_, el) => {
    const id = doc(el).attr("id");
    const encoding = doc(el).attr("data-encoding");
    const mime = doc(el).attr("data-mime");
    const type = doc(el).attr("type");
    const contentLen = doc(el).text().trim().length;
    scripts.push({ id, encoding, mime, type, contentLen });
  });
  return scripts;
}

function getModuleIds(doc) {
  const ids = [];
  doc("script[id]").each((_, el) => {
    const id = doc(el).attr("id");
    const mime = doc(el).attr("data-mime");
    const type = doc(el).attr("type");
    if (mime === "application/javascript" || type === "lope-module") {
      ids.push(id);
    }
  });
  return ids;
}

// ---------------------------------------------------------------------------
// vm.SourceTextModule machinery
// ---------------------------------------------------------------------------

/**
 * Registry of created vm.SourceTextModules, keyed by specifier/identifier.
 * This is used by the linker to resolve imports between modules.
 */
const moduleRegistry = new Map();

/**
 * The shared vm.Context that all modules run in.
 * We populate it with enough globals for the Observable runtime.
 */
let sharedContext = null;

function createSharedContext() {
  // Provide minimal globals the Observable runtime needs.
  // vm.SourceTextModule runs in a sandboxed context, so we must explicitly
  // expose anything modules reference as globals.
  const contextGlobals = {
    // Core JS globals
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Promise,
    Symbol,
    Proxy,
    Reflect,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Date,
    Math,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    undefined,
    NaN,
    Infinity,
    ArrayBuffer,
    Uint8Array,
    Int32Array,
    Float64Array,
    DataView,
    TextEncoder,
    TextDecoder,
    structuredClone:
      typeof structuredClone !== "undefined" ? structuredClone : undefined,
    queueMicrotask,
    // For the runtime's window_global fallback
    globalThis: undefined, // will be set to the context itself after creation
    // Stub for document (runtime references it in window_global)
    document: {
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        children: [],
        appendChild(c) {
          this.children.push(c);
          return c;
        },
        removeChild(c) {
          this.children = this.children.filter((x) => x !== c);
          return c;
        },
        textContent: "",
        innerHTML: "",
        className: "",
        style: {},
        setAttribute() {},
        getAttribute() {
          return null;
        },
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {},
      }),
      createTextNode: (text) => ({ textContent: text, nodeType: 3 }),
      createDocumentFragment: () => ({
        children: [],
        appendChild(c) {
          this.children.push(c);
          return c;
        },
      }),
      querySelector: () => null,
      querySelectorAll: () => [],
      head: {
        appendChild() {},
        removeChild() {},
        querySelector: () => null,
        querySelectorAll: () => [],
      },
      body: {
        appendChild() {},
        removeChild() {},
      },
      currentScript: null,
    },
    window: undefined, // will be set to context itself
    // Stub for requestAnimationFrame (runtime uses it)
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    // Blob and fetch stubs
    Blob: typeof Blob !== "undefined" ? Blob : class Blob {},
    fetch:
      typeof fetch !== "undefined"
        ? fetch
        : () => Promise.reject(new Error("fetch not available")),
    Response: typeof Response !== "undefined" ? Response : class Response {},
    // For modules that use dynamic import() - we intercept via linker, but
    // some cells do import(blobUrl) which we can't handle
  };

  sharedContext = vm.createContext(contextGlobals, {
    name: "lopecode-vm-context",
  });

  // Set self-references
  sharedContext.globalThis = sharedContext;
  sharedContext.window = sharedContext;
  sharedContext.self = sharedContext;

  log("Created shared vm.Context with globals");
  return sharedContext;
}

/**
 * Create a vm.SourceTextModule from source code.
 *
 * @param {string} source - ES module source code
 * @param {string} identifier - Module identifier (used in error messages and linking)
 * @returns {vm.SourceTextModule}
 */
function createModule(source, identifier) {
  log(`Creating SourceTextModule: ${identifier} (${source.length} chars)`);

  try {
    const mod = new vm.SourceTextModule(source, {
      context: sharedContext,
      identifier,
      // importModuleDynamically handles dynamic import() calls within the module
      importModuleDynamically: async (specifier, referrer) => {
        log(
          `Dynamic import("${specifier}") from ${referrer?.identifier || "unknown"}`
        );
        return await linker(specifier, referrer);
      },
    });

    moduleRegistry.set(identifier, mod);
    log(`  -> Created successfully (status: ${mod.status})`);
    return mod;
  } catch (err) {
    log(`  -> FAILED to create module ${identifier}: ${err.message}`);
    if (err.stack) {
      // Show first few lines of stack for context
      const stackLines = err.stack.split("\n").slice(0, 5).join("\n");
      log(`  Stack: ${stackLines}`);
    }
    return null;
  }
}

/**
 * Linker function for vm.SourceTextModule.link().
 *
 * When a module does `import { Runtime } from "/@observablehq/runtime"`,
 * the linker resolves that specifier to another vm.SourceTextModule.
 *
 * In lopecode notebooks, modules don't typically import each other directly -
 * they use the Observable runtime's module system instead. But the runtime
 * module itself is an ES module with exports.
 */
async function linker(specifier, referencingModule) {
  log(
    `Linker called: "${specifier}" (from ${referencingModule?.identifier || "unknown"})`
  );

  // Try exact match first
  if (moduleRegistry.has(specifier)) {
    const mod = moduleRegistry.get(specifier);
    if (mod.status === "unlinked") {
      await mod.link(linker);
    }
    return mod;
  }

  // Try with/without leading slash or @ variations
  const variations = [
    specifier,
    `/${specifier}`,
    specifier.replace(/^\//, ""),
    specifier.replace(/^\//, "").replace(/\.js$/, ""),
  ];

  for (const variant of variations) {
    if (moduleRegistry.has(variant)) {
      const mod = moduleRegistry.get(variant);
      if (mod.status === "unlinked") {
        await mod.link(linker);
      }
      return mod;
    }
  }

  // Module not found - create a synthetic empty module
  // This handles cases where a module imports something we don't have
  log(`  -> Module "${specifier}" not found in registry, creating empty stub`);
  const stubSource = `export default undefined;`;
  const stub = new vm.SourceTextModule(stubSource, {
    context: sharedContext,
    identifier: `stub:${specifier}`,
  });
  await stub.link(linker);
  await stub.evaluate();
  return stub;
}

/**
 * Link and evaluate a module, returning its namespace.
 */
async function linkAndEvaluate(mod) {
  if (!mod) return null;

  const id = mod.identifier;

  if (mod.status === "unlinked") {
    log(`Linking module: ${id}`);
    try {
      await mod.link(linker);
      log(`  -> Linked successfully (status: ${mod.status})`);
    } catch (err) {
      log(`  -> FAILED to link ${id}: ${err.message}`);
      return null;
    }
  }

  if (mod.status === "linked") {
    log(`Evaluating module: ${id}`);
    try {
      await mod.evaluate();
      log(`  -> Evaluated successfully (status: ${mod.status})`);
    } catch (err) {
      log(`  -> FAILED to evaluate ${id}: ${err.message}`);
      return null;
    }
  }

  log(`  -> Namespace keys: [${Object.keys(mod.namespace).join(", ")}]`);
  return mod.namespace;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const notebookPath = args[0];

  if (!notebookPath) {
    console.error(
      "Usage: node --experimental-vm-modules tools/prototypes/vm-module-proto.js <notebook.html>"
    );
    process.exit(1);
  }

  logSection("Loading notebook");
  const absPath = path.resolve(notebookPath);
  log(`File: ${absPath}`);

  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(absPath, "utf-8");
  log(`HTML size: ${(html.length / 1024 / 1024).toFixed(2)} MB`);

  const doc = cheerio.load(html);

  // -------------------------------------------------------------------------
  logSection("Listing all scripts in notebook");
  // -------------------------------------------------------------------------
  const allScripts = listAllScripts(doc);
  for (const s of allScripts) {
    log(
      `  ${s.id} | type=${s.type || "-"} | mime=${s.mime || "-"} | encoding=${s.encoding || "-"} | content=${s.contentLen} chars`
    );
  }

  // -------------------------------------------------------------------------
  logSection("Step 1: Extract Observable runtime");
  // -------------------------------------------------------------------------
  const runtimeInfo = extractScript(doc, "@observablehq/runtime@6.0.0");
  if (!runtimeInfo) {
    console.error("Could not find @observablehq/runtime@6.0.0 in notebook");
    process.exit(1);
  }
  log(`Runtime source: ${runtimeInfo.source.length} chars`);
  log(`Encoding: ${runtimeInfo.encoding}`);
  log(`First 100 chars: ${runtimeInfo.source.substring(0, 100)}`);
  log(`Last 80 chars: ...${runtimeInfo.source.substring(runtimeInfo.source.length - 80)}`);

  // -------------------------------------------------------------------------
  logSection("Step 2: Create shared vm.Context");
  // -------------------------------------------------------------------------
  createSharedContext();

  // -------------------------------------------------------------------------
  logSection("Step 3: Create vm.SourceTextModule for runtime");
  // -------------------------------------------------------------------------
  const runtimeModule = createModule(
    runtimeInfo.source,
    "@observablehq/runtime@6.0.0"
  );

  if (!runtimeModule) {
    console.error("Failed to create runtime module - cannot continue");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  logSection("Step 4: Link and evaluate runtime module");
  // -------------------------------------------------------------------------
  const runtimeNamespace = await linkAndEvaluate(runtimeModule);

  if (!runtimeNamespace) {
    console.error("Failed to evaluate runtime module - cannot continue");
    process.exit(1);
  }

  const Runtime = runtimeNamespace.Runtime;
  const RuntimeError = runtimeNamespace.RuntimeError;
  log(`Runtime class: ${typeof Runtime} (name: ${Runtime?.name})`);
  log(`RuntimeError class: ${typeof RuntimeError} (name: ${RuntimeError?.name})`);

  if (typeof Runtime !== "function") {
    console.error("Runtime is not a function - something went wrong");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  logSection("Step 5: Create Observable runtime instance");
  // -------------------------------------------------------------------------
  const runtime = new Runtime((name) => {
    // Builtin resolver - return globalThis values as fallback
    if (name === "Generators") {
      // The runtime typically provides Generators itself, but just in case
      return undefined;
    }
    return undefined;
  });

  log(`Runtime created: ${typeof runtime}`);
  log(`Runtime._variables: ${runtime._variables?.constructor?.name || "N/A"}`);
  log(`Runtime._builtin: ${typeof runtime._builtin}`);

  // Store on context for modules that reference __ojs_runtime
  sharedContext.__ojs_runtime = runtime;

  // Stub runtime.fileAttachments - modules call this in their define() to set up FileAttachment
  runtime.fileAttachments = (resolve) => {
    return (name) => {
      const url = resolve(name);
      return {
        url: () => Promise.resolve(url?.url || ""),
        text: () => Promise.resolve(""),
        json: () => Promise.resolve(null),
        blob: () => Promise.resolve(new (sharedContext.Blob || Blob)([])),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        stream: () => { throw new Error("stream not supported in vm prototype"); },
      };
    };
  };

  // Stub window.lopecode.contentSync for FileAttachment setup in define()
  sharedContext.lopecode = {
    contentSync: (name) => ({
      status: 404,
      mime: "application/octet-stream",
      bytes: new Uint8Array(0),
    }),
  };

  // -------------------------------------------------------------------------
  logSection("Step 6: Extract and create module SourceTextModules");
  // -------------------------------------------------------------------------
  const moduleIds = getModuleIds(doc);
  log(`Found ${moduleIds.length} modules`);

  // We'll try a few small modules first
  const modulesToTry = [];

  // Pick some small/interesting modules to test with
  for (const id of moduleIds) {
    modulesToTry.push(id);
  }

  const moduleInfos = new Map();
  let successCount = 0;
  let failCount = 0;

  for (const id of modulesToTry) {
    const info = extractScript(doc, id);
    if (!info) {
      log(`  SKIP ${id}: could not extract`);
      failCount++;
      continue;
    }

    // Module sources are plain JS with `export default function define(...)`.
    // They also reference `document` and `window` globals.
    // vm.SourceTextModule should handle the export syntax natively.
    if (
      !info.source.includes("export default function define") &&
      !info.source.includes("export {") &&
      !info.source.includes("export default")
    ) {
      log(`  SKIP ${id}: no export statement found (not an ES module)`);
      failCount++;
      continue;
    }

    // Module sources use bare `document` references. These will resolve
    // through the vm.Context globals we set up.
    const mod = createModule(info.source, id);
    if (mod) {
      moduleInfos.set(id, { mod, info });
      successCount++;
    } else {
      failCount++;
    }
  }

  log(`\nModule creation summary: ${successCount} succeeded, ${failCount} failed/skipped`);

  // -------------------------------------------------------------------------
  logSection("Step 7: Link and evaluate module define functions");
  // -------------------------------------------------------------------------

  // Pick a small module to fully test the pipeline.
  // Skip non-Observable modules (runtime, inspector, es-module-shims) that
  // don't have the standard `export default function define(runtime, observer)` pattern.
  const testModuleId = moduleIds.find((id) => {
    if (!moduleInfos.has(id)) return false;
    const src = moduleInfos.get(id).info.source;
    return src.includes("export default function define");
  });

  if (!testModuleId) {
    log("No Observable modules available to test - all failed to parse");
    logSection("DONE (partial)");
    process.exit(0);
  }

  log(`Testing with module: ${testModuleId}`);

  const testModuleEntry = moduleInfos.get(testModuleId);
  const testNs = await linkAndEvaluate(testModuleEntry.mod);

  if (!testNs) {
    log(`Failed to evaluate ${testModuleId}`);
  } else {
    log(`Module namespace keys: [${Object.keys(testNs).join(", ")}]`);

    const defineFn = testNs.default;
    log(`define function: ${typeof defineFn}`);

    if (typeof defineFn === "function") {
      // -----------------------------------------------------------------------
      logSection("Step 8: Use define() to load module into runtime");
      // -----------------------------------------------------------------------

      // Create a simple observer that logs variable definitions
      const variables = new Map();

      const observer = () => ({
        pending() {},
        fulfilled(value, name) {
          log(`  Variable fulfilled: ${name} = ${summarizeValue(value)}`);
          variables.set(name, value);
        },
        rejected(error, name) {
          log(`  Variable rejected: ${name} = ${error?.message || error}`);
        },
      });

      try {
        log(`Calling define(runtime, observer) for ${testModuleId}...`);
        const main = defineFn(runtime, observer);
        log(`Module loaded. main = ${typeof main}`);

        // Give the runtime a moment to process
        await new Promise((resolve) => setTimeout(resolve, 500));

        log(`\nVariables observed so far:`);
        for (const [name, value] of variables) {
          log(`  ${name}: ${summarizeValue(value)}`);
        }

        // Also try listing all runtime variables
        if (runtime._variables) {
          log(`\nAll runtime variables (${runtime._variables.size} total):`);
          let count = 0;
          for (const v of runtime._variables) {
            if (count >= 30) {
              log(`  ... and ${runtime._variables.size - 30} more`);
              break;
            }
            const name = v._name || "(anonymous)";
            const status =
              v._value !== undefined
                ? "has value"
                : v._error
                  ? "error"
                  : "pending";
            log(`  ${name}: ${status}`);
            count++;
          }
        }
      } catch (err) {
        log(`Failed to call define(): ${err.message}`);
        log(`Stack: ${err.stack?.split("\n").slice(0, 5).join("\n")}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  logSection("Step 9: Try linking and evaluating ALL modules");
  // -------------------------------------------------------------------------

  let evalSuccess = 0;
  let evalFail = 0;
  let evalNonDefine = 0; // modules that evaluated but aren't Observable define() modules
  const failedModules = [];

  for (const [id, entry] of moduleInfos) {
    if (id === testModuleId) {
      evalSuccess++; // already done
      continue;
    }

    const ns = await linkAndEvaluate(entry.mod);
    if (!ns) {
      evalFail++;
      failedModules.push({ id, reason: "failed to link/evaluate" });
    } else if (typeof ns.default === "function") {
      evalSuccess++;
    } else {
      // Successfully evaluated but not an Observable define() module
      // (e.g., runtime exports {Runtime, RuntimeError}, inspector exports {Inspector})
      evalNonDefine++;
      log(`  Note: ${id} evaluated OK but is not a define() module (exports: [${Object.keys(ns).join(", ")}])`);
    }
  }

  log(
    `\nEvaluation summary: ${evalSuccess} define() modules, ${evalNonDefine} non-define modules, ${evalFail} failed (out of ${moduleInfos.size} total)`
  );
  if (failedModules.length > 0) {
    log(`Failed modules:`);
    for (const { id, reason } of failedModules) {
      log(`  - ${id}: ${reason}`);
    }
  }

  // -------------------------------------------------------------------------
  logSection("Summary & Findings");
  // -------------------------------------------------------------------------
  log(`Notebook: ${path.basename(absPath)}`);
  log(`Total scripts in HTML: ${allScripts.length}`);
  log(`ES modules found: ${moduleIds.length}`);
  log(`Successfully created as SourceTextModule: ${successCount}`);
  log(`Successfully linked & evaluated (define modules): ${evalSuccess}`);
  log(`Successfully linked & evaluated (non-define, e.g. runtime): ${evalNonDefine}`);
  log(`Failed to create/link/evaluate: ${evalFail + failCount}`);
  log(``);
  log(`Key findings:`);
  log(`  - vm.SourceTextModule handles 'export default function define(...)' natively`);
  log(`  - No need to regex-transform export statements`);
  log(`  - The linker function intercepts import() calls between modules`);
  log(`  - Module sources reference 'document' as a free variable -> provided via vm.Context`);
  log(
    `  - This approach gives proper ES module semantics (import/export, TDZ, etc.)`
  );

  // Give runtime a moment to settle before exiting
  await new Promise((resolve) => setTimeout(resolve, 200));

  log(`\nDone.`);
  process.exit(0);
}

function summarizeValue(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "function")
    return `[Function: ${value.name || "anonymous"}]`;
  if (typeof value === "object") {
    const ctor = value.constructor?.name || "Object";
    if (Array.isArray(value)) return `[Array(${value.length})]`;
    if (value instanceof Map) return `[Map(${value.size})]`;
    if (value instanceof Set) return `[Set(${value.size})]`;
    // DOM-like objects
    if (value.tagName) return `[${value.tagName} element]`;
    try {
      const json = JSON.stringify(value);
      if (json.length < 80) return json;
      return `[${ctor} ${json.substring(0, 60)}...]`;
    } catch {
      return `[${ctor}]`;
    }
  }
  const str = String(value);
  return str.length > 80 ? str.substring(0, 77) + "..." : str;
}

// Run
main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(2);
});
