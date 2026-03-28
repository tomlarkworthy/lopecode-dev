#!/usr/bin/env node
/**
 * linkedom-proto.js - Prototype: load lopecode notebook using LinkeDOM
 *
 * Tests whether LinkeDOM provides enough DOM API surface for the Observable
 * runtime to work, as a lighter alternative to JSDOM.
 *
 * Usage:
 *   node tools/prototypes/linkedom-proto.js lopecode/notebooks/@tomlarkworthy_atlas.html
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { parseHTML } from 'linkedom';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(label, msg) {
  console.log(`[linkedom-proto] ${label}: ${msg}`);
}

function logSection(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

// ---------------------------------------------------------------------------
// 1. Parse HTML and extract scripts
// ---------------------------------------------------------------------------

function parseNotebook(htmlPath) {
  logSection('Step 1: Parse HTML with LinkeDOM');

  const html = fs.readFileSync(htmlPath, 'utf-8');
  log('file', `${htmlPath} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);

  const { document } = parseHTML(html);
  log('parse', 'LinkeDOM parseHTML() completed');

  // Enumerate all <script id="..."> tags
  const scripts = document.querySelectorAll('script[id]');
  log('scripts', `Found ${scripts.length} <script id="..."> tags`);

  for (const s of scripts) {
    const id = s.getAttribute('id');
    const encoding = s.getAttribute('data-encoding') || 'none';
    const mime = s.getAttribute('data-mime') || s.getAttribute('type') || '?';
    const size = (s.textContent || '').length;
    log('  script', `id="${id}"  encoding=${encoding}  mime/type=${mime}  textLen=${size}`);
  }

  return { document, html };
}

// ---------------------------------------------------------------------------
// 2. Extract and decompress sources
// ---------------------------------------------------------------------------

function extractGzippedSource(document, id) {
  const el = document.querySelector(`script[id="${id}"]`);
  if (!el) return null;
  const raw = (el.textContent || '').trim();
  const buf = Buffer.from(raw, 'base64');
  return zlib.gunzipSync(buf).toString('utf-8');
}

function extractPlainSource(document, id) {
  const el = document.querySelector(`script[id="${id}"]`);
  if (!el) return null;
  return el.textContent;
}

function extractSources(document) {
  logSection('Step 2: Extract and decompress runtime + module sources');

  // Runtime
  const runtimeSource = extractGzippedSource(document, '@observablehq/runtime@6.0.0');
  if (runtimeSource) {
    log('runtime', `Extracted @observablehq/runtime@6.0.0 (${runtimeSource.length} chars)`);
  } else {
    log('runtime', 'NOT FOUND - cannot proceed');
    process.exit(1);
  }

  // Inspector (optional)
  const inspectorSource = extractGzippedSource(document, '@observablehq/inspector@5.0.1');
  log('inspector', inspectorSource ? `Extracted (${inspectorSource.length} chars)` : 'not found (ok)');

  // Collect module sources
  const moduleScripts = document.querySelectorAll('script[id]');
  const moduleSources = new Map();
  for (const s of moduleScripts) {
    const id = s.getAttribute('id');
    const mime = s.getAttribute('data-mime');
    const type = s.getAttribute('type');
    if (mime === 'application/javascript' || type === 'lope-module') {
      const encoding = s.getAttribute('data-encoding');
      let source;
      if (encoding === 'base64+gzip') {
        source = extractGzippedSource(document, id);
      } else {
        source = extractPlainSource(document, id);
      }
      if (source) {
        moduleSources.set(id, source);
        log('module', `"${id}" (${source.length} chars)`);
      }
    }
  }

  log('total', `${moduleSources.size} module sources extracted`);
  return { runtimeSource, inspectorSource, moduleSources };
}

// ---------------------------------------------------------------------------
// 3. Create a LinkeDOM document for the runtime
// ---------------------------------------------------------------------------

function createRuntimeDocument() {
  logSection('Step 3: Create LinkeDOM document for runtime use');

  const { document, window } = parseHTML('<!DOCTYPE html><html><head></head><body><notebook></notebook></body></html>');

  // Check what APIs are available
  const checks = [
    ['document.createElement', typeof document.createElement],
    ['document.createTextNode', typeof document.createTextNode],
    ['document.querySelector', typeof document.querySelector],
    ['document.createDocumentFragment', typeof document.createDocumentFragment],
    ['window.MutationObserver', typeof window.MutationObserver],
    ['window.IntersectionObserver', typeof window.IntersectionObserver],
    ['window.ResizeObserver', typeof window.ResizeObserver],
    ['window.requestAnimationFrame', typeof window.requestAnimationFrame],
    ['window.setTimeout', typeof window.setTimeout],
    ['window.CustomEvent', typeof window.CustomEvent],
    ['window.Event', typeof window.Event],
    ['window.HTMLElement', typeof window.HTMLElement],
    ['window.Map', typeof window.Map],
    ['window.Set', typeof window.Set],
    ['window.Promise', typeof window.Promise],
    ['window.URL', typeof window.URL],
    ['window.Blob', typeof window.Blob],
    ['window.location', typeof window.location],
  ];

  for (const [name, type] of checks) {
    const status = type === 'undefined' ? 'MISSING' : 'ok';
    log('api-check', `${name} = ${type} ${status === 'MISSING' ? '<-- MISSING' : ''}`);
  }

  return { document, window };
}

// ---------------------------------------------------------------------------
// 4. Eval runtime source to get Runtime class
// ---------------------------------------------------------------------------

function evalRuntime(runtimeSource, window, document) {
  logSection('Step 4: Eval Observable runtime source');

  // Transform: remove the ES module export, return { Runtime, RuntimeError }
  let transformed = runtimeSource;
  transformed = transformed.replace(
    /export\s*\{\s*Runtime\s*,\s*RuntimeError\s*\}\s*;?\s*$/,
    ''
  );
  transformed += '\nreturn { Runtime, RuntimeError };';

  log('transform', `Transformed source: ${transformed.length} chars`);

  // Provide shims for anything LinkeDOM might be missing
  const shimmedWindow = Object.create(window);

  // requestAnimationFrame shim (if missing)
  if (typeof shimmedWindow.requestAnimationFrame !== 'function') {
    shimmedWindow.requestAnimationFrame = (cb) => setTimeout(cb, 16);
    log('shim', 'Added requestAnimationFrame shim');
  }
  if (typeof shimmedWindow.cancelAnimationFrame !== 'function') {
    shimmedWindow.cancelAnimationFrame = (id) => clearTimeout(id);
    log('shim', 'Added cancelAnimationFrame shim');
  }

  // MutationObserver shim (if missing)
  if (typeof shimmedWindow.MutationObserver !== 'function') {
    shimmedWindow.MutationObserver = class MutationObserver {
      constructor(cb) { this._cb = cb; }
      observe() {}
      disconnect() {}
      takeRecords() { return []; }
    };
    log('shim', 'Added MutationObserver shim');
  }

  // IntersectionObserver shim (if missing)
  if (typeof shimmedWindow.IntersectionObserver !== 'function') {
    shimmedWindow.IntersectionObserver = class IntersectionObserver {
      constructor(cb) { this._cb = cb; }
      observe() {}
      disconnect() {}
      unobserve() {}
    };
    log('shim', 'Added IntersectionObserver shim');
  }

  // ResizeObserver shim (if missing)
  if (typeof shimmedWindow.ResizeObserver !== 'function') {
    shimmedWindow.ResizeObserver = class ResizeObserver {
      constructor(cb) { this._cb = cb; }
      observe() {}
      disconnect() {}
      unobserve() {}
    };
    log('shim', 'Added ResizeObserver shim');
  }

  try {
    const fn = new Function(
      'window', 'document', 'globalThis', 'setTimeout', 'clearTimeout',
      'setInterval', 'clearInterval', 'requestAnimationFrame',
      transformed
    );

    const result = fn(
      shimmedWindow, document, globalThis,
      setTimeout, clearTimeout,
      setInterval, clearInterval,
      shimmedWindow.requestAnimationFrame,
    );

    log('eval', `Runtime class: ${typeof result.Runtime}`);
    log('eval', `RuntimeError class: ${typeof result.RuntimeError}`);
    log('eval', `Runtime.prototype keys: ${Object.getOwnPropertyNames(result.Runtime.prototype).join(', ')}`);

    return { RuntimeClass: result.Runtime, RuntimeError: result.RuntimeError, shimmedWindow };
  } catch (e) {
    log('eval', `FAILED: ${e.message}`);
    log('stack', e.stack);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// 5. Create runtime with builtins
// ---------------------------------------------------------------------------

function createRuntime(RuntimeClass, shimmedWindow, document) {
  logSection('Step 5: Create Runtime instance with builtins');

  let runtime;
  try {
    runtime = new RuntimeClass(name => {
      if (name === '__ojs_runtime') return runtime;
      if (shimmedWindow[name] !== undefined) return shimmedWindow[name];
      return undefined;
    });
    log('runtime', 'Runtime instance created successfully');
  } catch (e) {
    log('runtime', `FAILED to create: ${e.message}`);
    log('stack', e.stack);
    process.exit(1);
  }

  // Store on window for compat
  shimmedWindow.__ojs_runtime = runtime;

  // Set up minimal builtins
  try {
    runtime._builtin.define('md', [], () => {
      return function md(strings, ...values) {
        let result = '';
        for (let i = 0; i < strings.length; i++) {
          result += strings[i];
          if (i < values.length) result += String(values[i]);
        }
        const el = document.createElement('div');
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
        const template = document.createElement('template');
        template.innerHTML = result.trim();
        return template.content?.firstChild || document.createElement('div');
      };
    });

    runtime._builtin.define('htl', [], () => ({
      html: function html(strings, ...values) {
        let result = '';
        for (let i = 0; i < strings.length; i++) {
          result += strings[i];
          if (i < values.length) result += String(values[i]);
        }
        const template = document.createElement('template');
        template.innerHTML = result.trim();
        return template.content?.firstChild || document.createElement('div');
      }
    }));

    runtime._builtin.define('width', [], () => 800);
    runtime._builtin.define('invalidation', [], () => new Promise(() => {}));
    runtime._builtin.define('visibility', [], () => () => Promise.resolve(true));
    runtime._builtin.define('location', [], () => shimmedWindow.location || { href: 'http://localhost', hash: '' });

    log('builtins', 'Defined: md, html, htl, width, invalidation, visibility, location');
  } catch (e) {
    log('builtins', `FAILED: ${e.message}`);
    log('stack', e.stack);
  }

  return runtime;
}

// ---------------------------------------------------------------------------
// 6. Load a module into the runtime
// ---------------------------------------------------------------------------

function compileModule(source, moduleName, shimmedWindow, document) {
  // Transform `export default function define(...)` into a callable
  const transformed = source.replace(
    /export\s+default\s+function\s+define\s*\(/,
    'const __define__ = function define('
  ) + '\nreturn __define__;';

  try {
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

    const w = shimmedWindow;
    const define = fn(
      w, document, URL, globalThis.Blob, w.Event || Event, w.EventTarget,
      w.HTMLElement, w.CustomEvent || CustomEvent, w.MutationObserver, w.IntersectionObserver,
      w.ResizeObserver, w.requestAnimationFrame, w.cancelAnimationFrame,
      setTimeout, clearTimeout,
      setInterval, clearInterval,
      globalThis.fetch, w.location || { href: 'http://localhost' },
      URLSearchParams,
      { escape: (s) => String(s).replace(/([^\w-])/g, '\\$1') },
      w.navigator || { userAgent: 'node' },
      globalThis, Map, Set, Promise, Symbol, WeakMap, WeakSet,
      console,
    );

    return define;
  } catch (e) {
    log('compile', `FAILED for ${moduleName}: ${e.message}`);
    return null;
  }
}

function loadModule(runtime, define, moduleName, allDefines) {
  // Observable define functions have signature: define(runtime, observer, importer)
  // - runtime: the Runtime instance (has .module() method)
  // - observer: function(name) => observer | true (true = observe all)
  // - importer: function(specifier) => module (for cross-module imports)

  // Module cache to avoid re-creating modules for repeated imports
  const moduleCache = new Map();

  const cachingImporter = (specifier) => {
    if (moduleCache.has(specifier)) return moduleCache.get(specifier);
    const importDefine = allDefines.get(specifier);
    if (importDefine) {
      // Use runtime.module(define, importer) which creates and populates a module
      const importMod = runtime.module(importDefine, cachingImporter);
      moduleCache.set(specifier, importMod);
      return importMod;
    }
    log('import', `Unresolved import: "${specifier}" (from ${moduleName})`);
    // Return an empty module as fallback
    const empty = runtime.module();
    moduleCache.set(specifier, empty);
    return empty;
  };

  // The define function signature is define(runtime, observer)
  // Some modules call runtime.fileAttachments() which doesn't exist on the base Runtime.
  // We proxy the runtime to provide it.
  const patchedRuntime = new Proxy(runtime, {
    get(target, prop) {
      if (prop === 'fileAttachments') {
        // Return a function that returns a name->URL resolver
        return (resolveMap) => {
          return (name) => {
            if (resolveMap && resolveMap.has && resolveMap.has(name)) {
              return resolveMap.get(name);
            }
            // Return a dummy URL
            return `file://attachment/${name}`;
          };
        };
      }
      return target[prop];
    }
  });

  // Call define(runtime, observer)
  // observer = () => true means "observe all variables" (no-op observer)
  try {
    define(patchedRuntime, () => true, cachingImporter);
    log('load', `Module ${moduleName} loaded successfully`);
    return true;
  } catch (e) {
    log('load', `FAILED to load ${moduleName}: ${e.message}`);
    log('stack', e.stack.split('\n').slice(0, 5).join('\n'));
    return null;
  }
}

// ---------------------------------------------------------------------------
// 7. List variables
// ---------------------------------------------------------------------------

function listVariables(runtime) {
  logSection('Step 7: List runtime variables');

  const variables = [];
  // The runtime stores variables in _variables (a Set)
  if (runtime._variables) {
    log('internals', `runtime._variables is a ${runtime._variables.constructor.name} with ${runtime._variables.size} entries`);

    let count = 0;
    for (const v of runtime._variables) {
      const name = v._name || '(anonymous)';
      const inputs = (v._inputs || []).map(i => i._name || '?').join(', ');
      variables.push({ name, inputs });
      count++;
      if (count <= 50) {
        log('var', `  ${name}${inputs ? ` <- [${inputs}]` : ''}`);
      }
    }
    if (count > 50) {
      log('var', `  ... and ${count - 50} more`);
    }
    log('total', `${count} variables in runtime`);
  } else {
    log('internals', 'runtime._variables not found - checking other properties');
    const keys = Object.getOwnPropertyNames(runtime);
    log('internals', `Runtime own properties: ${keys.join(', ')}`);

    // Also check prototype
    const protoKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(runtime));
    log('internals', `Runtime prototype: ${protoKeys.join(', ')}`);
  }

  return variables;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const notebookPath = process.argv[2];
  if (!notebookPath) {
    console.error('Usage: node tools/prototypes/linkedom-proto.js <notebook.html>');
    process.exit(1);
  }

  const fullPath = path.resolve(notebookPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  console.log(`\nLinkeDOM Prototype - Loading: ${notebookPath}`);
  const startTime = Date.now();

  // Step 1: Parse HTML
  const parseStart = Date.now();
  const { document: notebookDoc } = parseNotebook(fullPath);
  log('timing', `Parse: ${Date.now() - parseStart}ms`);

  // Step 2: Extract sources
  const extractStart = Date.now();
  const { runtimeSource, moduleSources } = extractSources(notebookDoc);
  log('timing', `Extract: ${Date.now() - extractStart}ms`);

  // Step 3: Create runtime document
  const domStart = Date.now();
  const { document: runtimeDoc, window: runtimeWindow } = createRuntimeDocument();
  log('timing', `DOM setup: ${Date.now() - domStart}ms`);

  // Step 4: Eval runtime
  const evalStart = Date.now();
  const { RuntimeClass, RuntimeError, shimmedWindow } = evalRuntime(runtimeSource, runtimeWindow, runtimeDoc);
  log('timing', `Runtime eval: ${Date.now() - evalStart}ms`);

  // Step 5: Create runtime
  const createStart = Date.now();
  const runtime = createRuntime(RuntimeClass, shimmedWindow, runtimeDoc);
  log('timing', `Runtime create: ${Date.now() - createStart}ms`);

  // Step 6: Compile all modules, then load the target
  logSection('Step 6: Compile and load modules');
  const compileStart = Date.now();

  const allDefines = new Map();
  let compiled = 0;
  let failed = 0;

  for (const [id, source] of moduleSources) {
    const define = compileModule(source, id, shimmedWindow, runtimeDoc);
    if (define) {
      allDefines.set(id, define);
      compiled++;
    } else {
      failed++;
    }
  }

  log('compile', `Compiled: ${compiled}  Failed: ${failed}`);
  log('timing', `Compile all: ${Date.now() - compileStart}ms`);

  // Load @tomlarkworthy/atlas (or first available module)
  const targetModule = '@tomlarkworthy/atlas';
  const targetDefine = allDefines.get(targetModule);

  if (targetDefine) {
    log('load', `Loading target module: ${targetModule}`);
    const loadStart = Date.now();
    const result = loadModule(runtime, targetDefine, targetModule, allDefines);
    log('timing', `Load module: ${Date.now() - loadStart}ms`);
  } else {
    log('load', `Target module "${targetModule}" not found in compiled modules`);
    log('load', `Available: ${[...allDefines.keys()].join(', ')}`);
  }

  // Step 7: List variables
  listVariables(runtime);

  // Summary
  logSection('Summary');
  const totalTime = Date.now() - startTime;
  log('timing', `Total: ${totalTime}ms`);
  log('result', 'LinkeDOM prototype completed');
  log('result', `Runtime class: ${RuntimeClass ? 'YES' : 'NO'}`);
  log('result', `Runtime instance: ${runtime ? 'YES' : 'NO'}`);
  log('result', `Variables registered: ${runtime._variables ? runtime._variables.size : '?'}`);
  log('result', `Modules compiled: ${compiled}/${moduleSources.size}`);
}

main().catch(e => {
  console.error(`\nFATAL: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
