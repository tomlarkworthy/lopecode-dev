#!/usr/bin/env node
/**
 * lope-node-runner.js - Run disassembled lopecode notebooks in Node.js
 *
 * Usage:
 *   node --import ./lope-loader-register.js lope-node-runner.js <notebook.d> [options]
 *
 * Options:
 *   --list-cells           List all cell names and values
 *   --get-cell <name>      Get a specific cell's value
 *   --run-tests            Run test_* cells
 *   --module <name>        Target a specific module (default: all mains)
 *   --timeout <ms>         Timeout for cell computation (default: 10000)
 *   --json                 Output as JSON
 *   --tap                  Output test results as TAP
 *
 * Environment:
 *   LOPE_MODULES_DIR       Override modules directory (set by lope-loader-register.js)
 */

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

// ---- Globals shims for notebook code ----

// File content registry - populated from extracted files
const fileRegistry = new Map();

// Blob URL registry for createObjectURL shim
let blobCounter = 0;
const blobUrls = new Map();

if (!globalThis.window) globalThis.window = globalThis;

globalThis.window.lopecode = {
  contentSync(id) {
    const entry = fileRegistry.get(id);
    if (!entry) return { status: 404 };
    return { status: 200, mime: entry.mime, bytes: entry.bytes };
  },
  dvfBytes(id) {
    const entry = fileRegistry.get(id);
    if (!entry) return new Response("not found", { status: 404 });
    return new Response(entry.bytes, {
      status: 200,
      headers: { "Content-Type": entry.mime },
    });
  },
};

// URL.createObjectURL shim
// Node.js can't import blob: URLs. For JS blobs that will be import()-ed,
// we write the content to a temp file and return a file: URL.
// We intercept the Blob constructor to capture raw parts for synchronous access.
import os from "os";
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lope-"));

const OrigBlob = globalThis.Blob;
const blobParts = new WeakMap();

// Wrap Blob to capture the raw parts for synchronous extraction
const PatchedBlob = class extends OrigBlob {
  constructor(parts, options) {
    super(parts, options);
    // Store the original parts so we can extract content synchronously
    blobParts.set(this, { parts, options });
  }
};
globalThis.Blob = PatchedBlob;

// Override Response.blob() to return PatchedBlob so we can extract content
const origResponseBlob = Response.prototype.blob;
Response.prototype.blob = async function () {
  const ab = await this.arrayBuffer();
  const type = this.headers.get("content-type") || "";
  return new PatchedBlob([ab], { type });
};

function extractBlobSync(blob) {
  const stored = blobParts.get(blob);
  if (!stored) return null;
  // Concatenate all parts into a single Buffer
  const buffers = stored.parts.map((part) => {
    if (part instanceof ArrayBuffer) return Buffer.from(part);
    if (part instanceof Uint8Array || Buffer.isBuffer(part)) return Buffer.from(part);
    if (typeof part === "string") return Buffer.from(part, "utf-8");
    if (part instanceof OrigBlob || part instanceof PatchedBlob) {
      // Nested blob - try to extract recursively
      const inner = extractBlobSync(part);
      return inner || Buffer.alloc(0);
    }
    return Buffer.from(String(part), "utf-8");
  });
  return Buffer.concat(buffers);
}

globalThis.URL.createObjectURL = (blob) => {
  const id = crypto.randomUUID();
  blobUrls.set(`blob:nodedata:${id}`, blob);

  // If it looks like JS, write to a temp file for import() support
  const type = blob.type || "";
  if (
    type.includes("javascript") ||
    type.includes("ecmascript") ||
    type === "text/javascript"
  ) {
    const content = extractBlobSync(blob);
    if (content) {
      const tmpFile = path.join(tmpDir, `${id}.mjs`);
      fs.writeFileSync(tmpFile, content);
      return pathToFileURL(tmpFile).href;
    }
  }

  return `blob:nodedata:${id}`;
};
globalThis.URL.revokeObjectURL = (url) => {
  blobUrls.delete(url);
};

// fetch shim for blob: URLs
const _origFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  if (typeof url === "string" && url.startsWith("blob:nodedata:")) {
    const blob = blobUrls.get(url);
    if (!blob) throw new Error(`Blob not found: ${url}`);
    const arrayBuffer = await blob.arrayBuffer();
    return new Response(arrayBuffer, {
      headers: { "Content-Type": blob.type || "application/octet-stream" },
    });
  }
  if (_origFetch) return _origFetch(url, opts);
  throw new Error(`fetch not available for: ${url}`);
};

// Minimal document shim for modules that touch DOM
if (!globalThis.document) {
  globalThis.document = {
    createElement() {
      return {
        style: {},
        setAttribute() {},
        appendChild() {},
        textContent: "",
      };
    },
    createElementNS() {
      return this.createElement();
    },
    getElementById() {
      return null;
    },
    head: { appendChild() {} },
    body: { appendChild() {} },
    baseURI: "http://localhost/",
    addEventListener() {},
    removeEventListener() {},
  };
}

if (!globalThis.addEventListener) {
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
}

if (!globalThis.location) {
  globalThis.location = {
    hash: "",
    search: "",
    pathname: "/",
    href: "http://localhost/",
  };
}

if (!globalThis.navigator) {
  globalThis.navigator = { userAgent: "node" };
}

if (!globalThis.localStorage) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

// ---- Runtime loading ----

async function loadRuntime(notebookDir) {
  const runtimePath = path.join(notebookDir, "deps", "runtime.js");
  if (!fs.existsSync(runtimePath)) {
    throw new Error(`Runtime not found: ${runtimePath}`);
  }
  const runtimeUrl = pathToFileURL(runtimePath).href;
  const mod = await import(runtimeUrl);
  return mod;
}

// ---- File registry population ----

function populateFileRegistry(notebookDir, manifest) {
  for (const file of manifest.files) {
    const filePath = path.join(notebookDir, file.file);
    if (!fs.existsSync(filePath)) continue;
    const bytes = new Uint8Array(fs.readFileSync(filePath));
    const mime = file.mime || "application/octet-stream";
    fileRegistry.set(file.id, { mime, bytes });
    // Also register without file:// prefix
    if (file.id.startsWith("file://")) {
      fileRegistry.set(file.id.slice(7), { mime, bytes });
    }
  }
}

// ---- Observer that captures values ----

function createCapturingObserver() {
  const cells = new Map();

  function observer(name) {
    return {
      fulfilled(value) {
        cells.set(name || `_anon_${cells.size}`, {
          value,
          error: null,
          settled: true,
        });
      },
      rejected(error) {
        cells.set(name || `_anon_${cells.size}`, {
          value: null,
          error,
          settled: true,
        });
      },
      pending() {
        // noop
      },
    };
  }

  return { observer, cells };
}

// ---- Main ----

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    dir: null,
    listCells: false,
    getCell: null,
    runTests: false,
    module: null,
    timeout: 10000,
    json: false,
    tap: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--list-cells") opts.listCells = true;
    else if (arg === "--get-cell") opts.getCell = args[++i];
    else if (arg === "--run-tests") opts.runTests = true;
    else if (arg === "--module") opts.module = args[++i];
    else if (arg === "--timeout") opts.timeout = parseInt(args[++i], 10);
    else if (arg === "--json") opts.json = true;
    else if (arg === "--tap") opts.tap = true;
    else if (!arg.startsWith("--")) opts.dir = arg;
  }

  return opts;
}

function serialize(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (value instanceof Error) return `Error: ${value.message}`;
  if (typeof value === "function") return `[Function: ${value.name || "anonymous"}]`;
  if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return `[HTMLElement]`;
  if (value?.nodeType) return `[HTMLElement]`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function main() {
  const opts = parseArgs();

  if (!opts.dir) {
    console.error(
      "Usage: node --import ./lope-loader-register.js lope-node-runner.js <notebook.d> [options]"
    );
    process.exit(1);
  }

  const notebookDir = path.resolve(opts.dir);
  const manifestPath = path.join(notebookDir, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.error(`Not found: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  // Set LOPE_MODULES_DIR for the loader hooks
  process.env.LOPE_MODULES_DIR = path.join(notebookDir, "modules");

  // Populate file registry
  populateFileRegistry(notebookDir, manifest);

  // Load Observable Runtime
  const { Runtime } = await loadRuntime(notebookDir);

  // Determine which modules to load
  const bootconf = manifest.bootconf || {};
  let moduleNames = opts.module ? [opts.module] : bootconf.mains || [];

  if (moduleNames.length === 0) {
    moduleNames = manifest.modules.map((m) => m.id);
  }

  // Create runtime and load modules
  const { observer, cells } = createCapturingObserver();
  const runtime = new Runtime();

  // Patch runtime.fileAttachments - normally set by stdlib via bootloader.
  // This is a factory: given a resolver fn, returns a FileAttachment constructor.
  runtime.fileAttachments = (resolve) => {
    return (name) => {
      const entry = resolve(name);
      if (!entry) throw new Error(`FileAttachment not found: ${name}`);
      const { url, mimeType } = entry;
      return {
        name,
        mimeType,
        url: () => Promise.resolve(url),
        async text() {
          // url might be a blob: URL from createObjectURL shim
          const blob = blobUrls.get(url);
          if (blob) {
            const buf = await blob.arrayBuffer();
            return new TextDecoder().decode(buf);
          }
          // Or a file path
          return fs.readFileSync(url, "utf-8");
        },
        async json() {
          return JSON.parse(await this.text());
        },
        async arrayBuffer() {
          const blob = blobUrls.get(url);
          if (blob) return blob.arrayBuffer();
          const buf = fs.readFileSync(url);
          return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        },
        async blob() {
          const blob = blobUrls.get(url);
          if (blob) return blob;
          const buf = fs.readFileSync(url);
          return new Blob([buf], { type: mimeType });
        },
        async stream() {
          const blob = await this.blob();
          return blob.stream();
        },
      };
    };
  };

  // Define minimal builtins that non-DOM cells commonly need
  const builtin = runtime._builtin;
  if (builtin) {
    // Generators (used for reactive patterns)
    builtin.define("Generators", [], () => ({
      observe(init) {
        let resolve;
        const values = [];
        const next = (value) => {
          values.push(value);
          if (resolve) { resolve(); resolve = null; }
        };
        const dispose = init(next);
        return {
          async *[Symbol.asyncIterator]() {
            try {
              while (true) {
                if (values.length > 0) { yield values.shift(); }
                else { await new Promise(r => resolve = r); }
              }
            } finally {
              if (dispose) dispose();
            }
          }
        };
      },
      input(el) { return el; },
    }));

    // Stubs for DOM-dependent builtins
    builtin.define("md", [], () => (strings, ...values) => {
      // Tagged template that returns the raw markdown string
      let result = "";
      strings.forEach((s, i) => { result += s + (values[i] ?? ""); });
      return result;
    });
    builtin.define("html", [], () => (strings, ...values) => {
      let result = "";
      strings.forEach((s, i) => { result += s + (values[i] ?? ""); });
      return result;
    });
    builtin.define("htl", [], () => ({
      html: (strings, ...values) => {
        let result = "";
        strings.forEach((s, i) => { result += s + (values[i] ?? ""); });
        return result;
      },
    }));
    // Observable Inputs return DOM-like objects with .value and event dispatching
    const makeInput = (value) => {
      const el = {
        value,
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {},
        appendChild() {},
        setAttribute() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        style: {},
        classList: { add() {}, remove() {}, toggle() {} },
        nodeType: 1,
      };
      return el;
    };
    builtin.define("Inputs", [], () => {
      const I = {
        toggle: (opts) => makeInput(opts?.value ?? false),
        range: (range, opts) => makeInput(opts?.value ?? range?.[0] ?? 0),
        select: (options, opts) => makeInput(opts?.value ?? options?.[0]),
        text: (opts) => makeInput(opts?.value ?? ""),
        button: (content, opts) => makeInput(0),
        textarea: (opts) => makeInput(opts?.value ?? ""),
        search: (data, opts) => makeInput(data),
        table: (data, opts) => makeInput(data?.[0]),
        input: (el) => el,
        bind: (el, input) => el,
        disposal: () => {},
        form: (inputs) => makeInput(null),
      };
      return I;
    });
    builtin.define("width", [], () => 640);
    builtin.define("invalidation", [], () => new Promise(() => {}));

    // Web platform globals that Observable stdlib exposes as builtins
    builtin.define("DecompressionStream", [], () => DecompressionStream);
    builtin.define("TextDecoderStream", [], () => TextDecoderStream);
    builtin.define("TextEncoderStream", [], () => TextEncoderStream);
    builtin.define("TransformStream", [], () => TransformStream);
    builtin.define("Response", [], () => Response);
    builtin.define("ReadableStream", [], () => ReadableStream);
    builtin.define("WritableStream", [], () => WritableStream);
    builtin.define("Blob", [], () => Blob);
    builtin.define("AbortController", [], () => AbortController);
    builtin.define("Event", [], () => Event);
    builtin.define("CustomEvent", [], () => CustomEvent);
    builtin.define("URL", [], () => URL);
    builtin.define("URLSearchParams", [], () => URLSearchParams);
    builtin.define("fetch", [], () => globalThis.fetch);
    builtin.define("location", [], () => globalThis.location);

    // Mutable - used by Observable for mutable cells
    builtin.define("Mutable", [], () => {
      return class Mutable {
        constructor(value) { this._value = value; }
        get value() { return this._value; }
        set value(v) { this._value = v; }
      };
    });
  }

  const loadedModules = new Map();

  for (const modName of moduleNames) {
    const modFile = path.join(notebookDir, "modules", modName + ".js");
    if (!fs.existsSync(modFile)) {
      console.error(`Module not found: ${modFile}`);
      continue;
    }

    try {
      const modUrl = pathToFileURL(modFile).href;
      const mod = await import(modUrl);
      const define = mod.default;
      if (typeof define === "function") {
        const m = runtime.module(define, observer);
        loadedModules.set(modName, m);
      }
    } catch (err) {
      console.error(`Error loading ${modName}: ${err.message}`);
    }
  }

  // Wait for cells to settle
  await new Promise((resolve) => setTimeout(resolve, opts.timeout));

  // Force a compute cycle
  if (runtime._computeNow) {
    await runtime._computeNow();
  }

  // Small extra wait for async cells
  await new Promise((resolve) => setTimeout(resolve, 500));

  // ---- Output ----

  if (opts.runTests) {
    const tests = new Map();
    for (const [name, cell] of cells) {
      if (name.startsWith("test_") || name.startsWith("test ")) {
        tests.set(name, cell);
      }
    }

    if (opts.tap) {
      console.log(`TAP version 13`);
      console.log(`1..${tests.size}`);
      let i = 1;
      let failures = 0;
      for (const [name, cell] of tests) {
        if (cell.error) {
          console.log(`not ok ${i} - ${name}`);
          console.log(`  ---`);
          console.log(`  message: ${cell.error.message || cell.error}`);
          console.log(`  ...`);
          failures++;
        } else {
          console.log(`ok ${i} - ${name}`);
        }
        i++;
      }
      process.exit(failures > 0 ? 1 : 0);
    }

    if (opts.json) {
      const results = {};
      for (const [name, cell] of tests) {
        results[name] = {
          passed: !cell.error,
          value: serialize(cell.value),
          error: cell.error ? String(cell.error) : null,
        };
      }
      console.log(JSON.stringify(results, null, 2));
    } else {
      let failures = 0;
      for (const [name, cell] of tests) {
        const status = cell.error ? "FAIL" : "PASS";
        if (cell.error) failures++;
        console.log(`${status}: ${name}`);
        if (cell.error) {
          console.log(`  ${cell.error.message || cell.error}`);
        }
      }
      console.log(`\n${tests.size} tests, ${tests.size - failures} passed, ${failures} failed`);
      process.exit(failures > 0 ? 1 : 0);
    }
    return;
  }

  if (opts.getCell) {
    const cell = cells.get(opts.getCell);
    if (!cell) {
      console.error(`Cell not found: ${opts.getCell}`);
      console.error(`Available: ${[...cells.keys()].join(", ")}`);
      process.exit(1);
    }
    if (cell.error) {
      console.error(`Error: ${cell.error.message || cell.error}`);
      process.exit(1);
    }
    console.log(serialize(cell.value));
    return;
  }

  // Default: list cells
  if (opts.json) {
    const result = {};
    for (const [name, cell] of cells) {
      result[name] = {
        value: serialize(cell.value),
        error: cell.error ? String(cell.error) : null,
      };
    }
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const [name, cell] of cells) {
      const val = cell.error
        ? `ERROR: ${cell.error.message || cell.error}`
        : serialize(cell.value);
      console.log(`${name}: ${val}`);
    }
  }

  // Exit cleanly (runtime may have pending timers)
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
