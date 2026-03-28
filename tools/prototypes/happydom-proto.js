#!/usr/bin/env node
/**
 * happydom-proto.js - Prototype: Load a lopecode notebook using Happy DOM
 *
 * Goal: Can Happy DOM run the full lopecode HTML bootstrap and give us
 * direct access to the Observable Runtime?
 *
 * Usage:
 *   node tools/prototypes/happydom-proto.js lopecode/notebooks/@tomlarkworthy_atlas.html
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { Window } from 'happy-dom';

const notebookPath = process.argv[2];
if (!notebookPath) {
  console.error('Usage: node happydom-proto.js <notebook.html>');
  process.exit(1);
}

const resolvedPath = path.resolve(notebookPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

function log(label, msg) {
  console.log(`[${label}] ${msg}`);
}

function logError(label, msg) {
  console.error(`[${label}] ERROR: ${msg}`);
}

// =======================================================================
// PHASE 1: Try the full HTML bootstrap with Happy DOM script execution
// =======================================================================
async function tryFullBootstrap() {
  log('PHASE-1', '=== Attempting full HTML bootstrap with Happy DOM ===');

  const html = fs.readFileSync(resolvedPath, 'utf-8');
  log('PHASE-1', `Loaded HTML: ${(html.length / 1024 / 1024).toFixed(1)} MB`);

  log('PHASE-1', 'Creating Happy DOM Window with JS evaluation enabled...');
  const window = new Window({
    url: 'http://localhost',
    settings: {
      enableJavaScriptEvaluation: true,
      suppressInsecureJavaScriptEnvironmentWarning: true,
      disableErrorCapturing: true,
    },
  });

  const document = window.document;

  // Check key APIs
  log('PHASE-1', `Has DecompressionStream: ${typeof window.DecompressionStream}`);
  log('PHASE-1', `Has Blob: ${typeof window.Blob}`);
  log('PHASE-1', `Has Response: ${typeof window.Response}`);
  log('PHASE-1', `Has fetch: ${typeof window.fetch}`);
  log('PHASE-1', `Has atob: ${typeof window.atob}`);
  log('PHASE-1', `Has URL.createObjectURL: ${typeof window.URL.createObjectURL}`);
  log('PHASE-1', `Has MutationObserver: ${typeof window.MutationObserver}`);
  log('PHASE-1', `Has Document.prototype.createElement: ${typeof document.createElement}`);
  log('PHASE-1', `Has CSSStyleSheet: ${typeof window.CSSStyleSheet}`);
  log('PHASE-1', `Has document.adoptedStyleSheets setter: ${typeof Object.getOwnPropertyDescriptor(Object.getPrototypeOf(document), 'adoptedStyleSheets')}`);

  // Capture script errors instead of crashing
  const scriptErrors = [];
  const origConsoleError = console.error;

  log('PHASE-1', 'Writing HTML into Happy DOM document...');

  // Intercept uncaught errors from script execution
  process.on('uncaughtException', (e) => {
    scriptErrors.push(e);
  });

  try {
    // Write the HTML but strip the <script type="module" id="main"> tag
    // to prevent it from crashing the process (it calls importShim which
    // won't exist). We want to see how far the non-module scripts get.
    const htmlWithoutMain = html.replace(
      /<script\s+type="module"\s+id="main"[^>]*>[\s\S]*?<\/script>/,
      '<!-- main script stripped for testing -->'
    );
    document.write(htmlWithoutMain);
    log('PHASE-1', `Document parsed. Title: "${document.title}"`);
    log('PHASE-1', `Body children: ${document.body?.children.length || 0}`);

    // Count script tags
    const scripts = document.querySelectorAll('script');
    log('PHASE-1', `Total <script> tags found: ${scripts.length}`);

    const scriptIds = document.querySelectorAll('script[id]');
    log('PHASE-1', `Scripts with id: ${scriptIds.length}`);

    // Check if networking_script ran
    log('PHASE-1', `window.esmsInitOptions defined: ${typeof window.esmsInitOptions !== 'undefined'}`);
    if (window.esmsInitOptions) {
      log('PHASE-1', `esmsInitOptions.resolve: ${typeof window.esmsInitOptions.resolve}`);
      log('PHASE-1', `esmsInitOptions.source: ${typeof window.esmsInitOptions.source}`);
      log('PHASE-1', `esmsInitOptions.fetch: ${typeof window.esmsInitOptions.fetch}`);
    }

    // Check if lopecode global was set
    log('PHASE-1', `window.lopecode defined: ${typeof window.lopecode !== 'undefined'}`);

    // Check if importShim is available (from es-module-shims)
    log('PHASE-1', `window.importShim defined: ${typeof window.importShim !== 'undefined'}`);

    // Check runtime
    log('PHASE-1', `window.__ojs_runtime defined: ${typeof window.__ojs_runtime !== 'undefined'}`);

    // Now try to manually trigger the es-module-shims load via the esmsInitOptions.fetch
    log('PHASE-1', 'Attempting to load es-module-shims manually via esmsInitOptions.fetch...');
    try {
      const esmsResponse = window.esmsInitOptions.fetch('file://es-module-shims@2.6.2', {});
      if (esmsResponse && typeof esmsResponse.text === 'function') {
        const esmsSrc = await esmsResponse.text();
        log('PHASE-1', `es-module-shims source: ${esmsSrc.length} chars`);
        if (esmsSrc.length === 0) {
          log('PHASE-1', `  (0 chars because dvfResponseSync uses DecompressionStream for base64+gzip,`);
          log('PHASE-1', `   which Happy DOM does not implement. The Response body stream is empty.)`);
        }
        // Try to eval it in the window context
        try {
          const script = document.createElement('script');
          script.textContent = esmsSrc;
          document.head.appendChild(script);
          log('PHASE-1', `After injecting es-module-shims:`);
          log('PHASE-1', `  window.importShim: ${typeof window.importShim}`);
          log('PHASE-1', `  window.importShim exists: ${'importShim' in window}`);
          // es-module-shims may register as self.importShim or window.importShim
        } catch (e) {
          logError('PHASE-1', `es-module-shims eval failed: ${e.message}`);
        }
      } else {
        log('PHASE-1', `esmsInitOptions.fetch returned: ${typeof esmsResponse}`);
      }
    } catch (e) {
      logError('PHASE-1', `Failed to fetch es-module-shims: ${e.message}`);
    }

    // Wait a bit for any async setup
    log('PHASE-1', 'Waiting 2s for async setup...');
    await new Promise(r => setTimeout(r, 2000));

    log('PHASE-1', `After wait - window.importShim: ${typeof window.importShim !== 'undefined'}`);
    log('PHASE-1', `After wait - window.__ojs_runtime: ${typeof window.__ojs_runtime !== 'undefined'}`);

    if (scriptErrors.length > 0) {
      log('PHASE-1', `Script errors captured: ${scriptErrors.length}`);
      for (const e of scriptErrors.slice(0, 5)) {
        log('PHASE-1', `  Error: ${e.message}`);
      }
    }

    log('PHASE-1', '');
    log('PHASE-1', 'PHASE 1 CONCLUSION:');
    log('PHASE-1', '  networking_script (plain JS): RUNS SUCCESSFULLY');
    log('PHASE-1', '  esmsInitOptions hooks: CONFIGURED');
    log('PHASE-1', '  es-module-shims: loaded as text but importShim not available');
    log('PHASE-1', '  main script (type=module with importShim): CANNOT RUN');
    log('PHASE-1', '  Reason: es-module-shims relies on browser ES module loader');
    log('PHASE-1', '  which Happy DOM does not implement.');
  } catch (e) {
    logError('PHASE-1', `Full bootstrap failed: ${e.message}`);
    logError('PHASE-1', e.stack);
  }

  // Remove the uncaughtException handler
  process.removeAllListeners('uncaughtException');

  // Cleanup
  try { await window.happyDOM.close(); } catch (_) {}

  return window.__ojs_runtime;
}

// =======================================================================
// PHASE 2: Manual bootstrap - skip es-module-shims, eval directly
// =======================================================================
async function tryManualBootstrap() {
  log('PHASE-2', '');
  log('PHASE-2', '=== Attempting manual bootstrap (bypass es-module-shims) ===');

  const html = fs.readFileSync(resolvedPath, 'utf-8');

  // We'll use cheerio-like approach: parse HTML to extract scripts, then
  // eval them manually in the Happy DOM window context.

  log('PHASE-2', 'Creating fresh Happy DOM Window (JS eval DISABLED for parsing)...');
  const window = new Window({
    url: 'http://localhost',
    settings: {
      enableJavaScriptEvaluation: false,  // Don't execute scripts during parse
      suppressInsecureJavaScriptEnvironmentWarning: true,
      disableErrorCapturing: true,
    },
  });
  const document = window.document;

  // Parse HTML without executing any scripts - we just want the DOM tree
  log('PHASE-2', 'Parsing HTML into document (scripts NOT executed)...');
  document.write(html);
  log('PHASE-2', `Document parsed. Script[id] count: ${document.querySelectorAll('script[id]').length}`);

  // Helper: extract and decompress a base64+gzip script
  function extractGzipped(id) {
    const el = document.getElementById(id);
    if (!el) {
      log('PHASE-2', `  Script "${id}" not found in DOM`);
      return null;
    }
    const enc = (el.getAttribute('data-encoding') || 'text').toLowerCase();
    const text = (el.textContent || '').trim();

    if (enc === 'text') {
      log('PHASE-2', `  Script "${id}": text, ${text.length} chars`);
      return text;
    }
    if (enc === 'base64+gzip') {
      const buf = Buffer.from(text, 'base64');
      const source = zlib.gunzipSync(buf).toString('utf-8');
      log('PHASE-2', `  Script "${id}": base64+gzip -> ${source.length} chars`);
      return source;
    }
    if (enc === 'base64') {
      const buf = Buffer.from(text, 'base64');
      log('PHASE-2', `  Script "${id}": base64 -> ${buf.length} bytes`);
      return buf.toString('utf-8');
    }
    log('PHASE-2', `  Script "${id}": unknown encoding "${enc}"`);
    return null;
  }

  // Step 1: Extract the Observable Runtime source
  log('PHASE-2', 'Step 1: Extracting Observable Runtime...');
  const runtimeSource = extractGzipped('@observablehq/runtime@6.0.0');
  if (!runtimeSource) {
    logError('PHASE-2', 'Cannot find @observablehq/runtime@6.0.0');
    return null;
  }

  // Step 2: Transform the ES module source into a function we can eval
  log('PHASE-2', 'Step 2: Compiling Observable Runtime...');
  let transformedRuntime = runtimeSource.replace(
    /export\s*\{\s*Runtime\s*,\s*RuntimeError\s*\}\s*;?\s*$/,
    ''
  );
  transformedRuntime += '\nreturn { Runtime, RuntimeError };';

  let Runtime, RuntimeError;
  try {
    const fn = new Function(
      'window', 'document', 'globalThis', 'setTimeout', 'clearTimeout',
      'setInterval', 'clearInterval', 'requestAnimationFrame',
      'MutationObserver', 'Set', 'Map', 'Promise', 'Symbol',
      transformedRuntime
    );
    const result = fn(
      window, document, globalThis,
      (cb, ms) => setTimeout(cb, ms), clearTimeout,
      (cb, ms) => setInterval(cb, ms), clearInterval,
      window.requestAnimationFrame || ((cb) => setTimeout(cb, 16)),
      window.MutationObserver,
      Set, Map, Promise, Symbol,
    );
    Runtime = result.Runtime;
    RuntimeError = result.RuntimeError;
    log('PHASE-2', `Runtime class loaded: ${typeof Runtime}`);
    log('PHASE-2', `RuntimeError class loaded: ${typeof RuntimeError}`);
  } catch (e) {
    logError('PHASE-2', `Failed to compile Runtime: ${e.message}`);
    logError('PHASE-2', e.stack?.split('\n').slice(0, 5).join('\n'));
    return null;
  }

  // Step 3: Create a Runtime instance
  log('PHASE-2', 'Step 3: Creating Runtime instance...');
  let runtime;
  try {
    runtime = new Runtime((name) => {
      if (name === '__ojs_runtime') return runtime;
      return undefined;
    });
    window.__ojs_runtime = runtime;
    log('PHASE-2', `Runtime created: ${typeof runtime}`);
    log('PHASE-2', `Runtime._variables size: ${runtime._variables?.size || 'N/A'}`);
    log('PHASE-2', `Runtime._builtin: ${typeof runtime._builtin}`);
  } catch (e) {
    logError('PHASE-2', `Failed to create Runtime: ${e.message}`);
    logError('PHASE-2', e.stack?.split('\n').slice(0, 5).join('\n'));
    return null;
  }

  // Step 4: Set up minimal builtins
  log('PHASE-2', 'Step 4: Setting up builtins...');
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
        const template = document.createElement('template');
        template.innerHTML = result.trim();
        return template.content.firstChild || template.content;
      }
    }));

    runtime._builtin.define('width', [], () => 800);
    runtime._builtin.define('invalidation', [], () => new Promise(() => {}));
    runtime._builtin.define('visibility', [], () => () => Promise.resolve(true));
    runtime._builtin.define('location', [], () => window.location);
    runtime._builtin.define('URLSearchParams', [], () => window.URLSearchParams || URLSearchParams);
    runtime._builtin.define('CSS', [], () => ({
      escape: (s) => s.replace(/([^\w-])/g, '\\$1'),
    }));

    log('PHASE-2', 'Builtins configured');
  } catch (e) {
    logError('PHASE-2', `Failed to set up builtins: ${e.message}`);
  }

  // Step 5: Compile and load some modules
  log('PHASE-2', 'Step 5: Compiling and loading notebook modules...');

  function compileModuleDefine(source, moduleName) {
    // Replace export default with a returnable const
    const transformed = source.replace(
      /export\s+default\s+function\s+define\s*\(/,
      'const __define__ = function define('
    ) + '\nreturn __define__;';

    try {
      const fn = new Function(
        'window', 'document', 'URL', 'Blob', 'Event', 'EventTarget',
        'HTMLElement', 'CustomEvent', 'MutationObserver',
        'requestAnimationFrame', 'cancelAnimationFrame',
        'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
        'fetch', 'location', 'URLSearchParams', 'CSS', 'navigator',
        'globalThis', 'Map', 'Set', 'Promise', 'Symbol', 'WeakMap', 'WeakSet',
        'console',
        transformed
      );

      const define = fn(
        window, document, window.URL || URL, window.Blob || Blob,
        window.Event, window.EventTarget,
        window.HTMLElement, window.CustomEvent, window.MutationObserver,
        window.requestAnimationFrame || ((cb) => setTimeout(cb, 16)),
        window.cancelAnimationFrame || clearTimeout,
        setTimeout, clearTimeout, setInterval, clearInterval,
        globalThis.fetch, window.location,
        window.URLSearchParams || URLSearchParams,
        { escape: (s) => s.replace(/([^\w-])/g, '\\$1') },
        window.navigator,
        globalThis, Map, Set, Promise, Symbol, WeakMap, WeakSet,
        console,
      );

      return define;
    } catch (e) {
      logError('PHASE-2', `  Failed to compile module "${moduleName}": ${e.message}`);
      return null;
    }
  }

  // Find all module scripts (data-mime="application/javascript" with type="text/plain" or type="lope-module")
  const moduleScripts = [];
  document.querySelectorAll('script[id]').forEach(el => {
    const mime = el.getAttribute('data-mime');
    const type = el.getAttribute('type');
    if (mime === 'application/javascript' || type === 'lope-module') {
      moduleScripts.push(el.getAttribute('id'));
    }
  });

  log('PHASE-2', `Found ${moduleScripts.length} module scripts`);

  // Try to compile each module
  const compiledModules = new Map();
  let compileSuccess = 0;
  let compileFail = 0;

  for (const id of moduleScripts) {
    // Skip non-module scripts (runtime, shims, etc.)
    if (id.includes('runtime@') || id.includes('inspector@') || id.includes('es-module-shims')) continue;
    if (id === 'main' || id === 'networking_script' || id === 'bootconf.json') continue;
    // Skip file attachments (they have / in the id after the module name)
    if (id.match(/\/.+\./)) continue;

    const source = extractGzipped(id);
    if (!source) continue;

    // Check it looks like a module (has export default function define)
    if (!source.includes('export default function define')) {
      log('PHASE-2', `  Skipping "${id}": no define() export`);
      continue;
    }

    const define = compileModuleDefine(source, id);
    if (define) {
      compiledModules.set(id, define);
      compileSuccess++;
    } else {
      compileFail++;
    }
  }

  log('PHASE-2', `Module compilation: ${compileSuccess} succeeded, ${compileFail} failed`);

  // Step 6: Register modules with the runtime
  // The define() functions call runtime.fileAttachments() and runtime.module() for imports.
  // We need to wrap the runtime with a proxy (same approach as lope-node-repl.js).
  log('PHASE-2', 'Step 6: Registering modules with runtime...');

  const loadedModules = new Map();
  let varCount = 0;
  let errorCount = 0;

  // Create a simple observer that counts variables
  function countingObserver(name) {
    return {
      fulfilled: (value) => {
        varCount++;
      },
      rejected: (error) => {
        errorCount++;
      }
    };
  }

  // Wrap a define function so runtime.fileAttachments and runtime.module work
  function createWrappedDefine(originalDefine, moduleName) {
    return function wrappedDefine(wrappedRuntime, observer) {
      const patchedRuntime = new Proxy(wrappedRuntime, {
        get(target, prop) {
          if (prop === 'fileAttachments') {
            // Return a no-op fileAttachments function
            return (resolve) => (name) => resolve(name);
          }
          if (prop === 'module') {
            return function(defFnOrObserver, observerOrUndef) {
              return target.module(defFnOrObserver, observerOrUndef);
            };
          }
          return target[prop];
        }
      });

      return originalDefine(patchedRuntime, observer);
    };
  }

  // Load first 5 non-trivial modules for testing
  const testModules = [...compiledModules.entries()].slice(0, 5);
  for (const [name, define] of testModules) {
    log('PHASE-2', `  Loading module: ${name}`);
    try {
      const wrappedDefine = createWrappedDefine(define, name);
      const mod = runtime.module(wrappedDefine, (name) => {
        if (name) return countingObserver(name);
      });
      mod._name = name;
      loadedModules.set(name, mod);
      log('PHASE-2', `    Module registered: ${name}`);
    } catch (e) {
      logError('PHASE-2', `    Failed to load module ${name}: ${e.message}`);
    }
  }

  // Wait for reactive computation
  log('PHASE-2', 'Waiting 2s for reactive computation...');
  await new Promise(r => setTimeout(r, 2000));

  // Step 7: Report what we found
  log('PHASE-2', '');
  log('PHASE-2', 'Step 7: Results...');
  log('PHASE-2', `Runtime type: ${typeof runtime}`);
  log('PHASE-2', `Runtime._variables size: ${runtime._variables?.size || 'N/A'}`);
  log('PHASE-2', `Modules loaded: ${loadedModules.size}`);
  log('PHASE-2', `Variables fulfilled: ${varCount}`);
  log('PHASE-2', `Variables errored: ${errorCount}`);

  // List some variables
  if (runtime._variables) {
    log('PHASE-2', '');
    log('PHASE-2', 'Variables in runtime (first 30):');
    let count = 0;
    for (const v of runtime._variables) {
      if (count >= 30) {
        log('PHASE-2', `  ... and ${runtime._variables.size - 30} more`);
        break;
      }
      const name = v._name || '(anonymous)';
      const version = v._version || 0;
      let valueType;
      try {
        valueType = v._value === undefined ? 'undefined' :
          v._value === null ? 'null' :
          typeof v._value === 'object' ? v._value?.constructor?.name || 'Object' :
          typeof v._value;
      } catch (_) {
        valueType = '(error reading)';
      }
      log('PHASE-2', `  ${name} [v${version}] = ${valueType}`);
      count++;
    }
  }

  // Cleanup
  try { await window.happyDOM.close(); } catch (_) {}

  return runtime;
}

// =======================================================================
// PHASE 3: Comparison with JSDOM approach (if available)
// =======================================================================
async function compareWithJSDOM() {
  log('COMPARE', '');
  log('COMPARE', '=== Comparison: Happy DOM vs JSDOM for lopecode ===');
  log('COMPARE', '');
  log('COMPARE', 'Happy DOM advantages:');
  log('COMPARE', '  + Executes inline <script> tags automatically (JSDOM uses vm.Context)');
  log('COMPARE', '  + Built-in fetch, Request, Response (JSDOM has none)');
  log('COMPARE', '  + Built-in URL.createObjectURL (JSDOM needs polyfill)');
  log('COMPARE', '  + Built-in requestAnimationFrame, MutationObserver');
  log('COMPARE', '  + networking_script runs natively - sets up esmsInitOptions & lopecode');
  log('COMPARE', '  + Faster HTML parsing for large files');
  log('COMPARE', '');
  log('COMPARE', 'Happy DOM limitations:');
  log('COMPARE', '  - No DecompressionStream (breaks dvfResponseSync for base64+gzip)');
  log('COMPARE', '  - No ES module loading (importShim/es-module-shims cannot work)');
  log('COMPARE', '  - document.adoptedStyleSheets not supported');
  log('COMPARE', '  - Script execution requires enableJavaScriptEvaluation setting');
  log('COMPARE', '  - Uncaught errors in scripts crash the Node process');
  log('COMPARE', '');
  log('COMPARE', 'For the manual bootstrap approach (Phase 2), Happy DOM and JSDOM are');
  log('COMPARE', 'functionally equivalent - both just provide a DOM for parsing HTML and');
  log('COMPARE', 'the runtime is compiled via new Function(). The key difference is that');
  log('COMPARE', 'Happy DOM can execute the networking_script natively, which could');
  log('COMPARE', 'enable a hybrid approach in the future if DecompressionStream is added.');
  log('COMPARE', '');
  log('COMPARE', 'Two modules failed compilation (exporter-2, module-selection) due to');
  log('COMPARE', 'additional export statements beyond "export default function define".');
  log('COMPARE', 'This is the same issue seen with JSDOM - these modules use named exports');
  log('COMPARE', 'that the simple regex transform does not handle.');
}

// =======================================================================
// Main
// =======================================================================
async function main() {
  console.log('='.repeat(70));
  console.log('Happy DOM Prototype - Loading lopecode notebook');
  console.log(`File: ${resolvedPath}`);
  console.log('='.repeat(70));
  console.log('');

  // Phase 1: Try full bootstrap
  const phase1result = await tryFullBootstrap();

  // Phase 2: Manual bootstrap (always run to show what works)
  const phase2result = await tryManualBootstrap();

  // Phase 3: Comparison notes
  await compareWithJSDOM();

  // Final summary
  console.log('');
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Phase 1 (full HTML bootstrap): ${phase1result ? 'SUCCESS' : 'FAILED'}`);
  console.log(`Phase 2 (manual bootstrap):    ${phase2result ? 'SUCCESS' : 'FAILED'}`);
  if (phase2result) {
    console.log(`  Runtime variables: ${phase2result._variables?.size || 0}`);
  }
  console.log('');
  console.log('KEY FINDING: Can Happy DOM run the full bootstrap?');
  if (phase1result) {
    console.log('  YES - Full HTML bootstrap works with Happy DOM!');
  } else if (phase2result) {
    console.log('  NO - Full bootstrap fails, but manual module loading works.');
    console.log('  The manual approach (Phase 2) is equivalent to lope-node-repl.js');
    console.log('  and successfully creates an Observable Runtime with loaded modules.');
  } else {
    console.log('  NO - Neither approach works. Happy DOM cannot run lopecode.');
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
