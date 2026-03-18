#!/usr/bin/env node
/**
 * lope-node-repl.js - Node-native Observable runtime REPL (no browser)
 *
 * Runs the Observable runtime directly in Node.js using JSDOM for DOM shims.
 * No Playwright, no serialization boundary — direct access to JS values.
 *
 * Usage:
 *   node lope-node-repl.js [--verbose]
 *
 * Commands (JSON, one per line):
 *   {"cmd": "load", "notebook": "path/to/notebook.html", "modules": ["@tomlarkworthy/lopepage-urls"]}
 *   {"cmd": "run-tests", "timeout": 30000, "filter": "optional"}
 *   {"cmd": "eval", "code": "1 + 1"}
 *   {"cmd": "get-variable", "name": "varName", "module": "optional"}
 *   {"cmd": "list-variables"}
 *   {"cmd": "define-variable", "name": "myVar", "definition": "() => 42", "inputs": [], "module": "optional"}
 *   {"cmd": "delete-variable", "name": "myVar", "module": "optional"}
 *   {"cmd": "status"}
 *   {"cmd": "quit"}
 *
 * Responses (JSON):
 *   {"ok": true, "result": ...}
 *   {"ok": false, "error": "message"}
 */

import * as readline from 'readline';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import vm from 'vm';

// Parse args
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

// State
let runtime = null;
let RuntimeClass = null;
let currentNotebook = null;
let runtimeReady = false;
let dom = null;
let modules = new Map(); // module name -> Observable module instance
let moduleDefines = new Map(); // module name -> define function
let notebookHtml = null;
let notebookDoc = null; // cheerio instance

function respond(obj) {
  console.log(JSON.stringify(obj));
}

function respondError(message) {
  respond({ ok: false, error: message });
}

function respondOk(result) {
  respond({ ok: true, result });
}

function log(msg) {
  if (verbose) process.stderr.write(`[node-repl] ${msg}\n`);
}

/**
 * Extract and decompress a gzipped base64 script from the HTML
 */
function extractGzippedSource(doc, id) {
  let content = null;
  doc('script[id]').each((_, el) => {
    if (doc(el).attr('id') === id) {
      content = doc(el).text().trim();
    }
  });
  if (!content) return null;
  const buf = Buffer.from(content, 'base64');
  return zlib.gunzipSync(buf).toString('utf-8');
}

/**
 * Extract plain text module source from the HTML
 */
function extractModuleSource(doc, id) {
  let content = null;
  doc('script[id]').each((_, el) => {
    if (doc(el).attr('id') === id) {
      content = doc(el).text();
    }
  });
  return content;
}

/**
 * Get all module IDs from the HTML
 */
function listModuleIds(doc) {
  const ids = [];
  doc('script[id]').each((_, el) => {
    const id = doc(el).attr('id');
    const mime = doc(el).attr('data-mime');
    const type = doc(el).attr('type');
    if (mime === 'application/javascript' || type === 'lope-module') {
      ids.push(id);
    }
  });
  return ids;
}

/**
 * Set up JSDOM with enough globals for the Observable runtime
 */
function setupDOM() {
  dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
  });

  const window = dom.window;
  const document = window.document;

  // Create a notebook element
  const notebook = document.createElement('notebook');
  document.body.appendChild(notebook);

  return { window, document };
}

/**
 * Compile a module source string into a define function.
 * Module sources are ES modules with `export default function define(...)`.
 * We transform them into a function we can call directly.
 */
function compileModuleDefine(source, moduleName) {
  // The module source has const declarations and an export default function define.
  // We need to extract both parts and combine them.
  // The consts are cell functions referenced by the define() function.

  // Replace the export default with a return
  const transformed = source.replace(
    /export\s+default\s+function\s+define\s*\(/,
    'const __define__ = function define('
  ) + '\nreturn __define__;';

  try {
    // Use Function constructor to evaluate in a semi-isolated scope
    // We provide key globals the modules expect
    const fn = new Function(
      'window', 'document', 'URL', 'Blob', 'Event', 'EventTarget',
      'HTMLElement', 'CustomEvent', 'MutationObserver', 'IntersectionObserver',
      'ResizeObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'fetch', 'location', 'URLSearchParams', 'CSS', 'navigator',
      'globalThis', 'Map', 'Set', 'Promise', 'Symbol', 'WeakMap', 'WeakSet',
      'console',
      transformed
    );

    const w = dom.window;
    const define = fn(
      w, w.document, w.URL || URL, w.Blob || Blob, w.Event, w.EventTarget,
      w.HTMLElement, w.CustomEvent, w.MutationObserver, w.IntersectionObserver,
      w.ResizeObserver, w.requestAnimationFrame, w.cancelAnimationFrame,
      w.setTimeout || setTimeout, w.clearTimeout || clearTimeout,
      w.setInterval || setInterval, w.clearInterval || clearInterval,
      globalThis.fetch, w.location, w.URLSearchParams || URLSearchParams,
      { escape: (s) => s.replace(/([^\w-])/g, '\\$1') }, // CSS.escape shim
      w.navigator,
      globalThis, Map, Set, Promise, Symbol, WeakMap, WeakSet,
      console,
    );

    return define;
  } catch (e) {
    log(`Failed to compile module ${moduleName}: ${e.message}\n${e.stack}`);
    return null;
  }
}

/**
 * Load the Observable runtime from the HTML
 */
async function loadRuntime(doc) {
  const runtimeSource = extractGzippedSource(doc, '@observablehq/runtime@6.0.0');
  if (!runtimeSource) {
    throw new Error('Could not find @observablehq/runtime@6.0.0 in notebook');
  }

  log(`Runtime source: ${runtimeSource.length} chars`);

  // The runtime source is an ES module with `export { Runtime, RuntimeError }`.
  // We need to evaluate it and extract Runtime.
  // Transform exports into assignments on a result object.
  let transformed = runtimeSource;
  transformed = transformed.replace(
    /export\s*\{\s*Runtime\s*,\s*RuntimeError\s*\}\s*;?\s*$/,
    ''
  );
  transformed += '\nreturn { Runtime, RuntimeError };';

  const fn = new Function(
    'window', 'document', 'globalThis', 'setTimeout', 'clearTimeout',
    'setInterval', 'clearInterval', 'requestAnimationFrame',
    transformed
  );

  const w = dom.window;
  const result = fn(
    w, w.document, globalThis,
    w.setTimeout || setTimeout, w.clearTimeout || clearTimeout,
    w.setInterval || setInterval, w.clearInterval || clearInterval,
    w.requestAnimationFrame,
  );

  RuntimeClass = result.Runtime;
  log('Runtime class loaded');
  return RuntimeClass;
}

/**
 * Create and initialize the Observable runtime
 */
function createRuntime() {
  // The Runtime constructor takes a builtins function.
  // Builtins are resolved by name — we provide key ones.
  runtime = new RuntimeClass(name => {
    if (name === '__ojs_runtime') return runtime;
    // Return window global as fallback (like the original runtime does)
    if (dom.window[name] !== undefined) return dom.window[name];
    return undefined;
  });

  // Store on window for compatibility
  dom.window.__ojs_runtime = runtime;

  log('Runtime created');
}

/**
 * Set up standard library builtins (md, html, etc.)
 */
function setupBuiltins() {
  // Define minimal builtins that modules commonly depend on
  runtime._builtin.define('md', [], () => {
    // Minimal markdown tagged template that returns a string
    return function md(strings, ...values) {
      let result = '';
      for (let i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < values.length) result += String(values[i]);
      }
      // Return a simple text node or div
      const el = dom.window.document.createElement('div');
      el.innerHTML = result;
      return el;
    };
  });

  runtime._builtin.define('html', [], () => {
    return function html(strings, ...values) {
      let result = '';
      for (let i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < values.length) result += String(values[i]);
      }
      const template = dom.window.document.createElement('template');
      template.innerHTML = result.trim();
      return template.content.firstChild || template.content;
    };
  });

  runtime._builtin.define('htl', [], () => ({
    html: function html(strings, ...values) {
      let result = '';
      for (let i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < values.length) result += String(values[i]);
      }
      const template = dom.window.document.createElement('template');
      template.innerHTML = result.trim();
      return template.content.firstChild || template.content;
    }
  }));

  runtime._builtin.define('width', [], () => 800);

  runtime._builtin.define('invalidation', [], () => new Promise(() => {}));

  runtime._builtin.define('visibility', [], () => {
    return () => Promise.resolve(true);
  });

  runtime._builtin.define('now', ['Generators'], (Generators) => {
    return Generators.observe((notify) => {
      notify(Date.now());
    });
  });

  runtime._builtin.define('location', [], () => dom.window.location);
  runtime._builtin.define('URLSearchParams', [], () => dom.window.URLSearchParams || URLSearchParams);
  runtime._builtin.define('CSS', [], () => ({
    escape: (s) => s.replace(/([^\w-])/g, '\\$1'),
  }));

  log('Builtins configured');
}

const loadingModules = new Set(); // Track modules currently being loaded (cycle detection)

/**
 * Load a module by name from the notebook HTML.
 * Handles inter-module imports by resolving them from the same HTML.
 */
function loadModule(moduleName) {
  if (modules.has(moduleName)) return modules.get(moduleName);

  // Cycle detection: if we're already loading this module, create a placeholder
  if (loadingModules.has(moduleName)) {
    log(`Cycle detected for ${moduleName}, creating placeholder`);
    const placeholder = runtime.module(() => {}, () => ({}));
    placeholder._name = moduleName;
    modules.set(moduleName, placeholder);
    return placeholder;
  }

  const source = extractModuleSource(notebookDoc, moduleName);
  if (!source) {
    throw new Error(`Module not found in HTML: ${moduleName}`);
  }

  log(`Compiling module: ${moduleName}`);
  loadingModules.add(moduleName);

  const define = compileModuleDefine(source, moduleName);
  if (!define) {
    loadingModules.delete(moduleName);
    throw new Error(`Failed to compile module: ${moduleName}`);
  }

  moduleDefines.set(moduleName, define);

  const observer = () => ({});
  const wrappedDefine = createWrappedDefine(define, moduleName);
  const mod = runtime.module(wrappedDefine, observer);
  mod._name = moduleName;
  modules.set(moduleName, mod);
  loadingModules.delete(moduleName);

  log(`Module loaded: ${moduleName}`);
  return mod;
}

/**
 * Create a wrapped define function that intercepts inter-module imports.
 * The original define function does things like:
 *   main.define("module @foo/bar", async () => runtime.module((await import("/@foo/bar.js?v=4")).default));
 * We replace the dynamic import with our local module loading.
 */
function createWrappedDefine(originalDefine, moduleName) {
  return function wrappedDefine(wrappedRuntime, observer) {
    // Patch the runtime passed to define() so that when modules do
    // `runtime.module(...)` for imports, we intercept
    const patchedRuntime = new Proxy(wrappedRuntime, {
      get(target, prop) {
        if (prop === 'module') {
          return function(defFnOrObserver, observerOrUndef) {
            return target.module(defFnOrObserver, observerOrUndef);
          };
        }
        if (prop === 'fileAttachments') {
          return target.fileAttachments?.bind(target) || (() => () => null);
        }
        return target[prop];
      }
    });

    // We need to intercept the `await import(...)` calls inside define().
    // The source has patterns like:
    //   main.define("module @foo/bar", async () => runtime.module((await import("/@foo/bar.js?v=4")).default));
    // Since we can't intercept dynamic import(), we rewrite the module source
    // to use our local resolution instead.

    // Actually, we can work around this differently:
    // Call the original define, but provide a custom runtime that resolves imports.
    // The import() calls will fail, so the module variables that depend on imports
    // will get errors. We can then manually re-define those import-based variables.

    const main = originalDefine(patchedRuntime, observer);

    // Now fix up any import-based variables by scanning the source for import patterns
    const source = extractModuleSource(notebookDoc, moduleName);
    if (source) {
      fixupImports(main, source, moduleName);
    }

    return main;
  };
}

/**
 * Fix up inter-module imports that failed due to dynamic import() not working.
 * Scans the source for patterns like:
 *   main.define("module @foo/bar", async () => runtime.module((await import("/@foo/bar.js?v=4")).default));
 *   main.define("varName", ["module @foo/bar", "@variable"], (_, v) => v.import("varName", _));
 */
function fixupImports(main, source, parentModuleName) {
  // Find all inter-module import patterns
  // Pattern: main.define("module @owner/name", async () => runtime.module((await import("/@owner/name.js?v=N")).default));
  const importModuleRegex = /main\.define\("module\s+(@[^"]+)"\s*,\s*async\s*\(\)\s*=>\s*runtime\.module\(\(await\s+import\("\/([^"]+?)(?:\.js)?(?:\?[^"]*)?"\)\)\.default\)\)/g;

  const importedModuleNames = new Map(); // "module @foo/bar" -> "@foo/bar"
  let match;

  while ((match = importModuleRegex.exec(source)) !== null) {
    const moduleRef = match[1]; // e.g., "@tomlarkworthy/runtime-sdk"
    importedModuleNames.set(`module ${moduleRef}`, moduleRef);
    log(`Found import: ${parentModuleName} -> ${moduleRef}`);
  }

  // For each imported module, load it and re-define the "module @foo" variable
  for (const [varName, importedName] of importedModuleNames) {
    try {
      const importedModule = loadModule(importedName);

      // Re-define the module variable to point to our loaded module
      // Find the existing variable and redefine it
      for (const v of runtime._variables) {
        if (v._name === varName && v._module === main) {
          v.define(varName, [], () => importedModule);
          log(`Fixed import: ${varName} -> loaded module`);
          break;
        }
      }
    } catch (e) {
      log(`Warning: Could not load imported module ${importedName}: ${e.message}`);
    }
  }
}

/**
 * Load a notebook and specific modules
 */
async function loadNotebook(notebookPath, moduleNames = null) {
  const absPath = path.resolve(notebookPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Notebook not found: ${absPath}`);
  }

  log(`Loading notebook: ${absPath}`);

  // Reset state
  modules.clear();
  moduleDefines.clear();
  runtime = null;
  runtimeReady = false;

  // Parse HTML
  const html = fs.readFileSync(absPath, 'utf-8');
  notebookDoc = cheerio.load(html);

  // Set up DOM
  const { window } = setupDOM();

  // Provide window.lopecode.contentSync for file attachments
  window.lopecode = {
    contentSync: (id) => {
      // Try to find the file attachment in the HTML
      let content = null;
      let mime = 'application/octet-stream';
      notebookDoc('script[id]').each((_, el) => {
        const scriptId = notebookDoc(el).attr('id');
        if (scriptId === id || scriptId === `file://${id}`) {
          content = notebookDoc(el).text().trim();
          mime = notebookDoc(el).attr('data-mime') || mime;
        }
      });
      if (content) {
        const bytes = Buffer.from(content, 'base64');
        return { status: 200, mime, bytes };
      }
      return { status: 404, mime: null, bytes: new Uint8Array() };
    }
  };

  // Load the Observable runtime from the HTML
  await loadRuntime(notebookDoc);

  // Create runtime instance
  createRuntime();

  // Set up builtins
  setupBuiltins();

  // Determine which modules to load
  if (!moduleNames) {
    // Load all available modules
    moduleNames = listModuleIds(notebookDoc).filter(id =>
      id.startsWith('@') &&
      !id.includes('runtime@') &&
      !id.includes('inspector@') &&
      !id.includes('es-module-shims')
    );
  }

  const loaded = [];
  const failed = [];

  for (const name of moduleNames) {
    try {
      loadModule(name);
      loaded.push(name);
    } catch (e) {
      log(`Failed to load ${name}: ${e.message}`);
      failed.push({ name, error: e.message });
    }
  }

  // Trigger computation
  runtime._computeNow?.();

  // Wait for initial computation to settle
  await new Promise(resolve => setTimeout(resolve, 100));

  currentNotebook = notebookPath;
  runtimeReady = true;

  return {
    notebook: notebookPath,
    modulesLoaded: loaded,
    modulesFailed: failed,
  };
}

/**
 * Run test_* variables
 */
async function runTests(timeout = 30000, filter = null) {
  if (!runtimeReady) throw new Error('No notebook loaded');

  const results = new Map();
  const pendingPromises = [];

  // Build module name lookup
  const moduleNames = new Map();
  for (const v of runtime._variables) {
    if (v._module && !moduleNames.has(v._module)) {
      const modName = v._module._name || null;
      if (modName) moduleNames.set(v._module, modName);
    }
  }

  // Find test variables
  const testVars = [];
  for (const v of runtime._variables) {
    const name = v._name;
    if (typeof name === 'string' && name.startsWith('test_')) {
      if (filter) {
        const moduleName = moduleNames.get(v._module) || '';
        if (!name.includes(filter) && !moduleName.includes(filter)) continue;
      }
      testVars.push(v);
    }
  }

  if (testVars.length === 0) {
    return { error: 'No test variables found' };
  }

  // Find actual runtime (the one with _computeNow)
  let actualRuntime = runtime;
  if (!actualRuntime._computeNow) {
    for (const v of runtime._variables) {
      if (v._module?._runtime?._computeNow) {
        actualRuntime = v._module._runtime;
        break;
      }
    }
  }

  for (const v of testVars) {
    const name = v._name;
    const moduleName = moduleNames.get(v._module) || 'main';
    const fullName = `${moduleName}#${name}`;

    const p = new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        results.set(fullName, { state: 'timeout', name, module: moduleName });
        resolve();
      }, timeout);

      // Already resolved?
      if (v._value !== undefined) {
        clearTimeout(timeoutId);
        results.set(fullName, {
          state: 'passed', name, module: moduleName,
          value: String(v._value).slice(0, 200)
        });
        resolve();
        return;
      }
      if (v._error !== undefined) {
        clearTimeout(timeoutId);
        results.set(fullName, {
          state: 'failed', name, module: moduleName,
          error: v._error?.message || String(v._error)
        });
        resolve();
        return;
      }

      // Force reachable
      if (!v._reachable) {
        v._reachable = true;
        actualRuntime._dirty?.add(v);
      }

      const oldObserver = v._observer;
      v._observer = {
        fulfilled: (value) => {
          clearTimeout(timeoutId);
          results.set(fullName, {
            state: 'passed', name, module: moduleName,
            value: value === undefined ? 'undefined' : String(value).slice(0, 200)
          });
          resolve();
          if (oldObserver?.fulfilled) oldObserver.fulfilled(value);
        },
        rejected: (error) => {
          clearTimeout(timeoutId);
          results.set(fullName, {
            state: 'failed', name, module: moduleName,
            error: error?.message || String(error)
          });
          resolve();
          if (oldObserver?.rejected) oldObserver.rejected(error);
        },
        pending: () => {
          if (oldObserver?.pending) oldObserver.pending();
        }
      };
    });

    pendingPromises.push(p);
  }

  // Trigger computation
  actualRuntime._computeNow?.();

  await Promise.race([
    Promise.all(pendingPromises),
    new Promise(resolve => setTimeout(resolve, timeout + 5000))
  ]);

  const tests = [...results.values()];
  const passed = tests.filter(t => t.state === 'passed').length;
  const failed = tests.filter(t => t.state === 'failed').length;
  const timedOut = tests.filter(t => t.state === 'timeout').length;

  return { tests, summary: { total: tests.length, passed, failed, timeout: timedOut } };
}

/**
 * Get a variable's value directly (no serialization needed!)
 */
function getVariable(name, moduleName = null) {
  if (!runtimeReady) throw new Error('No notebook loaded');

  for (const v of runtime._variables) {
    if (v._name === name) {
      if (moduleName && v._module?._name !== moduleName) continue;

      // Direct access — no serialization!
      return {
        name: v._name,
        module: v._module?._name || 'main',
        hasValue: v._value !== undefined,
        hasError: v._error !== undefined,
        value: serializeForOutput(v._value),
        error: v._error?.message,
        reachable: v._reachable,
        type: typeof v._value,
        // For functions, include the source
        ...(typeof v._value === 'function' ? { source: v._value.toString().slice(0, 1000) } : {}),
      };
    }
  }

  return { error: `Variable not found: ${name}` };
}

/**
 * Serialize a value for JSON output
 */
function serializeForOutput(value, maxLen = 500) {
  if (value === undefined) return 'undefined';
  if (value === null) return null;
  if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Error) return `Error: ${value.message}`;
  if (typeof value === 'object') {
    try {
      const json = JSON.stringify(value);
      return json.length > maxLen ? json.slice(0, maxLen) + '...' : JSON.parse(json);
    } catch {
      return String(value);
    }
  }
  return value;
}

/**
 * List all variables
 */
function listVariables() {
  if (!runtimeReady) throw new Error('No notebook loaded');

  const variables = [];
  for (const v of runtime._variables) {
    if (!v._name) continue;
    variables.push({
      name: v._name,
      module: v._module?._name || 'main',
      hasValue: v._value !== undefined,
      hasError: v._error !== undefined,
      reachable: v._reachable,
      type: v._value !== undefined ? typeof v._value : (v._error ? 'error' : 'pending'),
    });
  }

  return { count: variables.length, variables: variables.sort((a, b) => a.name.localeCompare(b.name)) };
}

/**
 * Define or redefine a variable
 */
function defineVar(name, inputs = [], definition, moduleName = null) {
  if (!runtimeReady) throw new Error('No notebook loaded');

  // Find target module
  let targetModule = null;
  if (moduleName) {
    targetModule = modules.get(moduleName);
    if (!targetModule) {
      // Search runtime variables
      for (const v of runtime._variables) {
        if (v._module?._name === moduleName) {
          targetModule = v._module;
          break;
        }
      }
    }
  } else {
    // First loaded module
    targetModule = modules.values().next().value;
  }

  if (!targetModule) {
    return { error: `Module not found: ${moduleName || 'default'}` };
  }

  // Parse definition
  let fn;
  try {
    fn = eval(`(${definition})`);
    if (typeof fn !== 'function') {
      return { error: 'Definition must evaluate to a function' };
    }
  } catch (e) {
    return { error: `Failed to parse definition: ${e.message}` };
  }

  // Find existing variable
  let existingVar = null;
  for (const v of runtime._variables) {
    if (v._name === name && v._module === targetModule) {
      existingVar = v;
      break;
    }
  }

  try {
    if (existingVar) {
      existingVar.define(name, inputs, fn);
    } else {
      const newVar = targetModule.variable({});
      newVar.define(name, inputs, fn);
    }

    runtime._computeNow?.();

    return {
      success: true,
      name,
      module: targetModule._name || 'main',
      redefined: !!existingVar,
    };
  } catch (e) {
    return { error: `Failed to define variable: ${e.message}` };
  }
}

/**
 * Delete a variable
 */
function deleteVar(name, moduleName = null) {
  if (!runtimeReady) throw new Error('No notebook loaded');

  let targetModule = null;
  if (moduleName) {
    for (const v of runtime._variables) {
      if (v._module?._name === moduleName) {
        targetModule = v._module;
        break;
      }
    }
  }

  for (const v of runtime._variables) {
    if (v._name === name) {
      if (targetModule && v._module !== targetModule) continue;
      v.delete();
      return { success: true, name, module: v._module?._name || 'main' };
    }
  }

  return { error: `Variable not found: ${name}` };
}

/**
 * Evaluate code in the runtime context
 */
function evalCode(code) {
  if (!runtimeReady) throw new Error('No notebook loaded');

  try {
    // Provide runtime access in eval scope
    const fn = new Function('runtime', 'modules', 'window', 'document', code);
    const result = fn(runtime, modules, dom.window, dom.window.document);
    return { value: serializeForOutput(result), type: typeof result };
  } catch (e) {
    return { error: e.message };
  }
}

// Command handler
async function handleCommand(line) {
  let cmd;
  try {
    cmd = JSON.parse(line);
  } catch (e) {
    respondError(`Invalid JSON: ${e.message}`);
    return;
  }

  try {
    switch (cmd.cmd) {
      case 'load': {
        if (!cmd.notebook) { respondError('Missing notebook path'); return; }
        const result = await loadNotebook(cmd.notebook, cmd.modules || null);
        respondOk(result);
        break;
      }

      case 'run-tests': {
        const result = await runTests(cmd.timeout || 30000, cmd.filter || null);
        if (result.error) respondError(result.error);
        else respondOk(result);
        break;
      }

      case 'eval': {
        if (!cmd.code) { respondError('Missing code'); return; }
        const result = evalCode(cmd.code);
        if (result.error) throw new Error(result.error);
        respondOk(result);
        break;
      }

      case 'get-variable': {
        if (!cmd.name) { respondError('Missing variable name'); return; }
        const result = getVariable(cmd.name, cmd.module || null);
        if (result.error) respondError(result.error);
        else respondOk(result);
        break;
      }

      case 'list-variables': {
        const result = listVariables();
        if (result.error) respondError(result.error);
        else respondOk(result);
        break;
      }

      case 'define-variable': {
        if (!cmd.name) { respondError('Missing variable name'); return; }
        if (!cmd.definition) { respondError('Missing definition'); return; }
        const result = defineVar(cmd.name, cmd.inputs || [], cmd.definition, cmd.module || null);
        if (result.error) respondError(result.error);
        else respondOk(result);
        break;
      }

      case 'delete-variable': {
        if (!cmd.name) { respondError('Missing variable name'); return; }
        const result = deleteVar(cmd.name, cmd.module || null);
        if (result.error) respondError(result.error);
        else respondOk(result);
        break;
      }

      case 'status':
        respondOk({
          runtimeReady,
          notebook: currentNotebook,
          modulesLoaded: [...modules.keys()],
        });
        break;

      case 'quit':
        respondOk({ message: 'Goodbye' });
        process.exit(0);
        break;

      default:
        respondError(`Unknown command: ${cmd.cmd}`);
    }
  } catch (e) {
    respondError(e.message);
  }
}

// Main
async function main() {
  process.stderr.write('lope-node-repl: Starting (no browser)...\n');

  respondOk({
    status: 'ready',
    commands: [
      'load', 'run-tests', 'eval', 'get-variable',
      'list-variables', 'define-variable', 'delete-variable',
      'status', 'quit'
    ]
  });

  const commandQueue = [];
  let processing = false;

  async function processQueue() {
    if (processing || commandQueue.length === 0) return;
    processing = true;
    while (commandQueue.length > 0) {
      const line = commandQueue.shift();
      await handleCommand(line);
    }
    processing = false;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    if (line.trim()) {
      commandQueue.push(line.trim());
      processQueue();
    }
  });

  rl.on('close', async () => {
    while (commandQueue.length > 0 || processing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    process.stderr.write('lope-node-repl: stdin closed, shutting down...\n');
    process.exit(0);
  });
}

main().catch(err => {
  process.stderr.write(`Fatal error: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
