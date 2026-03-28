#!/usr/bin/env node
/**
 * playwright-cdp-proto.js - CDP-based direct access to Observable Runtime
 *
 * Demonstrates using Chrome DevTools Protocol to interact with the Observable
 * runtime without JSON serialization overhead. Uses CDP's Runtime domain to
 * get remote object handles and call functions directly on them.
 *
 * Usage:
 *   node tools/prototypes/playwright-cdp-proto.js <notebook.html>
 *
 * Example:
 *   node tools/prototypes/playwright-cdp-proto.js lopecode/notebooks/@tomlarkworthy_atlas.html
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  process.stderr.write(`[cdp-proto] ${msg}\n`);
}

function timing(label, startMs) {
  const elapsed = (performance.now() - startMs).toFixed(1);
  log(`  TIME ${label}: ${elapsed}ms`);
  return elapsed;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const notebookArg = process.argv[2];
  if (!notebookArg) {
    console.error('Usage: node playwright-cdp-proto.js <notebook.html>');
    process.exit(1);
  }

  const absPath = path.resolve(notebookArg);
  if (!fs.existsSync(absPath)) {
    console.error(`Notebook not found: ${absPath}`);
    process.exit(1);
  }

  const fileUrl = `file://${absPath}`;
  let browser;

  try {
    // ── 1. Launch browser and load notebook ──────────────────────────────

    log('=== Step 1: Launch browser and load notebook ===');
    let t0 = performance.now();

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Forward console for visibility (filter noisy messages)
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('responding') || text.includes('keepalive')
          || text.includes('Cannot find module') || text.includes('selectVariable')
          || text.includes('editor_manager') || text.includes('hotbar')
          || text.includes('code_editor')) {
        return; // skip noisy messages
      }
      process.stderr.write(`  [browser] ${text}\n`);
    });
    page.on('pageerror', err => {
      process.stderr.write(`  [browser error] ${err.message}\n`);
    });

    // Inject runtime capture script BEFORE page loads.
    // The Observable Runtime constructor is imported via importShim, so we cannot
    // intercept window.Runtime. Instead we monkey-patch the Runtime prototype's
    // constructor indirectly, or use a Proxy on the module namespace.
    //
    // Simplest reliable approach: patch the global Proxy/Reflect to intercept
    // the `new Runtime(builtins)` call by detecting the builtins pattern.
    // But even simpler: the exporter passes {__ojs_runtime: () => runtime} as
    // builtins, and the Runtime stores this. We can scan all objects reachable
    // from the DOM/scripts.
    //
    // Actually simplest: just override Function.prototype to intercept constructors.
    // Or better yet: use the exporter's own __ojs_runtime builtin. The runtime
    // resolves builtins by name, so a variable named "__ojs_runtime" exists in
    // the runtime. We need to observe it.
    //
    // Most robust approach: use addInitScript to wrap the native `class` construct
    // detection won't work. Let's use the proven approach from lope-runner.js
    // which patches Object.defineProperty to find runtime-shaped objects, PLUS
    // a polling fallback that scans the global scope AND module scopes.

    await page.addInitScript(() => {
      // Strategy 1: Intercept Object.defineProperty to catch runtime assignment
      const _origDefProp = Object.defineProperty;
      Object.defineProperty = function(obj, prop, desc) {
        const result = _origDefProp.call(this, obj, prop, desc);
        try {
          if (desc && desc.value && desc.value._variables && typeof desc.value.module === 'function') {
            window.__ojs_runtime = desc.value;
          }
        } catch (e) {}
        return result;
      };

      // Strategy 2: Intercept Set.prototype.add to catch when _variables Set grows
      const _origSetAdd = Set.prototype.add;
      let captureAttempted = false;
      Set.prototype.add = function(...args) {
        const result = _origSetAdd.apply(this, args);
        if (!captureAttempted && !window.__ojs_runtime) {
          try {
            const item = args[0];
            if (item && item._module && item._module._runtime && item._module._runtime._variables === this) {
              window.__ojs_runtime = item._module._runtime;
              captureAttempted = true;
              // Restore original to avoid overhead after capture
              Set.prototype.add = _origSetAdd;
            }
          } catch (e) {}
        }
        return result;
      };
    });

    log(`Loading ${fileUrl}`);
    await page.goto(fileUrl, { timeout: 60000, waitUntil: 'networkidle' });
    timing('Browser launch + page load', t0);

    // ── 2. Wait for runtime ──────────────────────────────────────────────

    log('\n=== Step 2: Wait for Observable runtime ===');
    t0 = performance.now();

    await page.waitForFunction(() => {
      // Check if already captured
      if (window.__ojs_runtime) return true;

      // Fallback: scan window for runtime-shaped objects
      for (const key in window) {
        try {
          const val = window[key];
          if (val && typeof val === 'object' && val._variables && typeof val.module === 'function') {
            window.__ojs_runtime = val;
            return true;
          }
        } catch (e) {}
      }
      return false;
    }, { timeout: 30000 });
    timing('Runtime ready', t0);

    // Brief stabilization
    log('  Waiting 2s for stabilization...');
    await page.waitForTimeout(2000);
    log('  Runtime stabilized');

    // ── 3. Create CDP session ────────────────────────────────────────────

    log('\n=== Step 3: Create CDP session ===');
    t0 = performance.now();

    const cdp = await context.newCDPSession(page);
    timing('CDP session created', t0);

    // ── 4. Get runtime object handle via CDP ─────────────────────────────

    log('\n=== Step 4: Get remote handle to __ojs_runtime ===');
    t0 = performance.now();

    const runtimeResult = await cdp.send('Runtime.evaluate', {
      expression: 'window.__ojs_runtime',
      returnByValue: false,
    });

    if (!runtimeResult.result.objectId) {
      throw new Error(`Failed to get runtime object. Type: ${runtimeResult.result.type}, value: ${runtimeResult.result.value}`);
    }

    const runtimeObjectId = runtimeResult.result.objectId;
    timing('Got runtime remote object', t0);
    log(`  Runtime objectId: ${runtimeObjectId?.slice(0, 50)}...`);
    log(`  Type: ${runtimeResult.result.type}, subtype: ${runtimeResult.result.subtype || 'none'}`);
    log(`  className: ${runtimeResult.result.className || 'N/A'}`);

    // ── 5. Explore _variables via CDP ────────────────────────────────────

    log('\n=== Step 5: Explore runtime._variables (Set) ===');
    t0 = performance.now();

    // Get _variables property - it's a Set in Observable Runtime
    const varsResult = await cdp.send('Runtime.callFunctionOn', {
      objectId: runtimeObjectId,
      functionDeclaration: 'function() { return this._variables; }',
      returnByValue: false,
    });
    const variablesObjectId = varsResult.result.objectId;
    timing('Got _variables handle', t0);
    log(`  _variables type: ${varsResult.result.type}, subtype: ${varsResult.result.subtype || 'none'}, class: ${varsResult.result.className || 'N/A'}`);

    // Get the size
    t0 = performance.now();
    const sizeResult = await cdp.send('Runtime.callFunctionOn', {
      objectId: variablesObjectId,
      functionDeclaration: 'function() { return this.size; }',
      returnByValue: true,
    });
    timing('Got _variables.size (returnByValue: true)', t0);
    log(`  _variables.size = ${sizeResult.result.value}`);

    // ── 6. List variable names - CDP vs page.evaluate ────────────────────

    log('\n=== Step 6: List variable names (CDP vs page.evaluate) ===');

    // Run each approach 3 times and take the median for fairer comparison
    const cdpTimes = [];
    const evalTimes = [];
    let varNames;

    for (let i = 0; i < 3; i++) {
      t0 = performance.now();
      const namesResult = await cdp.send('Runtime.callFunctionOn', {
        objectId: runtimeObjectId,
        functionDeclaration: `function() {
          const names = [];
          for (const v of this._variables) {
            if (v._name) names.push(v._name);
          }
          return names;
        }`,
        returnByValue: true,
      });
      cdpTimes.push(performance.now() - t0);
      varNames = namesResult.result.value;

      t0 = performance.now();
      await page.evaluate(() => {
        const names = [];
        for (const v of window.__ojs_runtime._variables) {
          if (v._name) names.push(v._name);
        }
        return names;
      });
      evalTimes.push(performance.now() - t0);
    }

    cdpTimes.sort((a, b) => a - b);
    evalTimes.sort((a, b) => a - b);
    const cdpMedian = cdpTimes[1].toFixed(1);
    const evalMedian = evalTimes[1].toFixed(1);

    log(`  CDP median:          ${cdpMedian}ms (runs: ${cdpTimes.map(t => t.toFixed(1)).join(', ')})`);
    log(`  page.evaluate median: ${evalMedian}ms (runs: ${evalTimes.map(t => t.toFixed(1)).join(', ')})`);
    log(`  Found ${varNames.length} named variables`);
    log(`  First 10: ${varNames.slice(0, 10).join(', ')}`);
    log(`  Ratio: page.evaluate / CDP = ${(parseFloat(evalMedian) / parseFloat(cdpMedian)).toFixed(2)}x`);

    // ── 7. Read individual variable values via CDP ───────────────────────

    log('\n=== Step 7: Read variable values via CDP (no serialization for handles) ===');

    // Pick a few variables to read
    const testVarNames = varNames.slice(0, 5);

    for (const varName of testVarNames) {
      t0 = performance.now();
      const valResult = await cdp.send('Runtime.callFunctionOn', {
        objectId: runtimeObjectId,
        functionDeclaration: `function(name) {
          for (const v of this._variables) {
            if (v._name === name) {
              const val = v._value;
              let displayVal;
              try {
                if (val === undefined) displayVal = 'undefined';
                else if (val === null) displayVal = 'null';
                else if (typeof val === 'function') displayVal = 'function ' + (val.name || 'anonymous');
                else if (typeof val === 'object') displayVal = Object.prototype.toString.call(val);
                else displayVal = String(val).slice(0, 80);
              } catch(e) { displayVal = '<error: ' + e.message + '>'; }
              return { name: v._name, type: typeof val, module: v._module?._name, display: displayVal };
            }
          }
          return null;
        }`,
        arguments: [{ value: varName }],
        returnByValue: true,
      });
      timing(`CDP: read '${varName}'`, t0);
      const val = valResult.result.value;
      if (val) {
        log(`    type=${val.type}, module=${val.module}, value=${val.display}`);
      }
    }

    // Compare with page.evaluate for same reads
    log('\n  --- Comparison: same reads via page.evaluate ---');
    for (const varName of testVarNames) {
      t0 = performance.now();
      await page.evaluate((name) => {
        for (const v of window.__ojs_runtime._variables) {
          if (v._name === name) {
            const val = v._value;
            let displayVal;
            try {
              if (val === undefined) displayVal = 'undefined';
              else if (val === null) displayVal = 'null';
              else if (typeof val === 'function') displayVal = 'function ' + (val.name || 'anonymous');
              else if (typeof val === 'object') displayVal = Object.prototype.toString.call(val);
              else displayVal = String(val).slice(0, 80);
            } catch(e) { displayVal = '<error>'; }
            return { name: v._name, type: typeof val, module: v._module?._name, display: displayVal };
          }
        }
        return null;
      }, varName);
      timing(`page.evaluate: read '${varName}'`, t0);
    }

    // ── 8. Get a remote handle to a variable object (no value copy) ──────

    log('\n=== Step 8: Remote object handle - no value crossing the wire ===');
    t0 = performance.now();

    const firstVarHandle = await cdp.send('Runtime.callFunctionOn', {
      objectId: runtimeObjectId,
      functionDeclaration: `function(name) {
        for (const v of this._variables) {
          if (v._name === name) return v;
        }
        return null;
      }`,
      arguments: [{ value: testVarNames[0] }],
      returnByValue: false,  // Key: keep as remote reference!
    });
    timing(`Got remote handle for '${testVarNames[0]}'`, t0);
    log(`  objectId: ${firstVarHandle.result.objectId?.slice(0, 50)}...`);

    // Use getProperties to inspect it without fetching values
    t0 = performance.now();
    const props = await cdp.send('Runtime.getProperties', {
      objectId: firstVarHandle.result.objectId,
      ownProperties: true,
    });
    timing('Runtime.getProperties on variable object', t0);

    const propNames = props.result.map(p => p.name);
    log(`  Variable internal properties (${propNames.length}): ${propNames.join(', ')}`);

    // Read specific properties via callFunctionOn on the remote handle
    t0 = performance.now();
    const nameResult = await cdp.send('Runtime.callFunctionOn', {
      objectId: firstVarHandle.result.objectId,
      functionDeclaration: 'function() { return this._name; }',
      returnByValue: true,
    });
    timing('Read _name from remote handle', t0);
    log(`  _name = ${nameResult.result.value}`);

    t0 = performance.now();
    const inputsResult = await cdp.send('Runtime.callFunctionOn', {
      objectId: firstVarHandle.result.objectId,
      functionDeclaration: 'function() { return this._inputs?.map(v => v._name) || []; }',
      returnByValue: true,
    });
    timing('Read _inputs from remote handle', t0);
    log(`  _inputs = [${inputsResult.result.value?.join(', ')}]`);

    // ── 9. Demonstrate calling _computeNow() directly ────────────────────

    log('\n=== Step 9: Call _computeNow() via CDP ===');

    // Explore runtime methods first
    t0 = performance.now();
    const methodsResult = await cdp.send('Runtime.callFunctionOn', {
      objectId: runtimeObjectId,
      functionDeclaration: `function() {
        const methods = [];
        let proto = Object.getPrototypeOf(this);
        while (proto && proto !== Object.prototype) {
          for (const key of Object.getOwnPropertyNames(proto)) {
            if (typeof this[key] === 'function') methods.push(key);
          }
          proto = Object.getPrototypeOf(proto);
        }
        return methods;
      }`,
      returnByValue: true,
    });
    timing('Enumerate runtime methods', t0);
    log(`  Runtime methods: ${methodsResult.result.value.join(', ')}`);

    // Try _computeNow on the runtime
    t0 = performance.now();
    const computeResult = await cdp.send('Runtime.callFunctionOn', {
      objectId: runtimeObjectId,
      functionDeclaration: `function() {
        if (typeof this._computeNow === 'function') {
          this._computeNow();
          return { method: '_computeNow', called: true };
        }
        if (typeof this._compute === 'function') {
          this._compute();
          return { method: '_compute', called: true };
        }
        return { method: 'none', called: false };
      }`,
      returnByValue: true,
    });
    timing('_computeNow() / _compute() call', t0);
    log(`  Result: ${JSON.stringify(computeResult.result.value)}`);

    // Explore variable methods too
    t0 = performance.now();
    const varMethodsResult = await cdp.send('Runtime.callFunctionOn', {
      objectId: firstVarHandle.result.objectId,
      functionDeclaration: `function() {
        const methods = [];
        let proto = Object.getPrototypeOf(this);
        while (proto && proto !== Object.prototype) {
          for (const key of Object.getOwnPropertyNames(proto)) {
            if (typeof this[key] === 'function') methods.push(key);
          }
          proto = Object.getPrototypeOf(proto);
        }
        return methods;
      }`,
      returnByValue: true,
    });
    timing('Enumerate variable methods', t0);
    log(`  Variable methods: ${varMethodsResult.result.value.join(', ')}`);

    // ── 10. Batch operation benchmark ────────────────────────────────────

    log('\n=== Step 10: Batch operation benchmark ===');

    // CDP: read all variable states in one call
    t0 = performance.now();
    const batchCdp = await cdp.send('Runtime.callFunctionOn', {
      objectId: runtimeObjectId,
      functionDeclaration: `function() {
        const result = [];
        for (const v of this._variables) {
          if (v._name) {
            result.push({
              name: v._name,
              type: typeof v._value,
              hasValue: v._value !== undefined,
              module: v._module?._name || null,
              inputCount: v._inputs?.length || 0,
            });
          }
        }
        return result;
      }`,
      returnByValue: true,
    });
    const cdpBatchTime = timing('CDP: batch read all variable metadata', t0);
    log(`  Got metadata for ${batchCdp.result.value.length} variables`);

    // page.evaluate: same operation
    t0 = performance.now();
    const batchEval = await page.evaluate(() => {
      const result = [];
      for (const v of window.__ojs_runtime._variables) {
        if (v._name) {
          result.push({
            name: v._name,
            type: typeof v._value,
            hasValue: v._value !== undefined,
            module: v._module?._name || null,
            inputCount: v._inputs?.length || 0,
          });
        }
      }
      return result;
    });
    const evalBatchTime = timing('page.evaluate: batch read all variable metadata', t0);
    log(`  Got metadata for ${batchEval.length} variables`);
    log(`  Ratio: page.evaluate / CDP = ${(parseFloat(evalBatchTime) / parseFloat(cdpBatchTime)).toFixed(2)}x`);

    // ── 11. Remote handle chaining (zero-copy navigation) ────────────────

    log('\n=== Step 11: Remote handle chaining - navigate runtime graph ===');

    t0 = performance.now();

    // Find a variable with inputs (keep as remote handle)
    const varWithInputs = await cdp.send('Runtime.callFunctionOn', {
      objectId: runtimeObjectId,
      functionDeclaration: `function() {
        for (const v of this._variables) {
          if (v._name && v._inputs && v._inputs.length > 0) return v;
        }
        return null;
      }`,
      returnByValue: false,
    });

    if (varWithInputs.result.objectId) {
      // Navigate from the handle to its info - two hops, no intermediate serialization
      const info = await cdp.send('Runtime.callFunctionOn', {
        objectId: varWithInputs.result.objectId,
        functionDeclaration: `function() {
          return {
            name: this._name,
            inputs: this._inputs?.map(v => v._name) || [],
            outputs: this._outputs ? [...this._outputs].map(v => v._name).filter(Boolean) : [],
          };
        }`,
        returnByValue: true,
      });
      timing('Navigate dependency graph via remote handles', t0);
      log(`  Variable: ${info.result.value.name}`);
      log(`  Inputs: [${info.result.value.inputs.join(', ')}]`);
      log(`  Outputs: [${info.result.value.outputs.join(', ')}]`);

      // Chain further: get a handle to the first input variable (zero-copy hop)
      if (info.result.value.inputs.length > 0) {
        t0 = performance.now();
        const inputHandle = await cdp.send('Runtime.callFunctionOn', {
          objectId: varWithInputs.result.objectId,
          functionDeclaration: 'function() { return this._inputs?.[0]; }',
          returnByValue: false,
        });
        const inputInfo = await cdp.send('Runtime.callFunctionOn', {
          objectId: inputHandle.result.objectId,
          functionDeclaration: `function() {
            return {
              name: this._name,
              type: typeof this._value,
              inputs: this._inputs?.map(v => v._name) || [],
            };
          }`,
          returnByValue: true,
        });
        timing('Chain to input variable via handle', t0);
        log(`  Input variable: ${JSON.stringify(inputInfo.result.value)}`);
      }
    }

    // ── 12. Define a new variable via CDP ────────────────────────────────

    log('\n=== Step 12: Define a new variable via CDP ===');
    t0 = performance.now();

    const defineResult = await cdp.send('Runtime.callFunctionOn', {
      objectId: runtimeObjectId,
      functionDeclaration: `function() {
        // Find the first/main module
        const mainModule = this._modules?.values()?.next()?.value;
        if (!mainModule) return { success: false, error: 'No module found' };

        // Define a new variable
        mainModule.variable().define('__cdp_test_var', [], () => 42);
        return { success: true, message: 'Defined __cdp_test_var = 42' };
      }`,
      returnByValue: true,
    });
    timing('Define new variable via CDP', t0);
    log(`  Result: ${JSON.stringify(defineResult.result.value)}`);

    // Wait a tick for reactivity to propagate
    await page.waitForTimeout(200);

    // Read it back
    t0 = performance.now();
    const readBack = await cdp.send('Runtime.callFunctionOn', {
      objectId: runtimeObjectId,
      functionDeclaration: `function() {
        for (const v of this._variables) {
          if (v._name === '__cdp_test_var') {
            return { name: v._name, value: v._value, type: typeof v._value };
          }
        }
        return null;
      }`,
      returnByValue: true,
    });
    timing('Read back newly defined variable', t0);
    log(`  Read back: ${JSON.stringify(readBack.result.value)}`);

    // ── 13. Rapid-fire micro-benchmark ───────────────────────────────────

    log('\n=== Step 13: Rapid-fire micro-benchmark (100 iterations) ===');

    const N = 100;

    // CDP: 100 small reads
    t0 = performance.now();
    for (let i = 0; i < N; i++) {
      await cdp.send('Runtime.callFunctionOn', {
        objectId: runtimeObjectId,
        functionDeclaration: 'function() { return this._variables.size; }',
        returnByValue: true,
      });
    }
    const cdpMicroTime = timing(`CDP: ${N}x read _variables.size`, t0);

    // page.evaluate: 100 small reads
    t0 = performance.now();
    for (let i = 0; i < N; i++) {
      await page.evaluate(() => window.__ojs_runtime._variables.size);
    }
    const evalMicroTime = timing(`page.evaluate: ${N}x read _variables.size`, t0);

    log(`  Per-call: CDP=${(parseFloat(cdpMicroTime) / N).toFixed(2)}ms, page.evaluate=${(parseFloat(evalMicroTime) / N).toFixed(2)}ms`);
    log(`  Ratio: page.evaluate / CDP = ${(parseFloat(evalMicroTime) / parseFloat(cdpMicroTime)).toFixed(2)}x`);

    // ── Summary ──────────────────────────────────────────────────────────

    log('\n========================================');
    log('=== Summary ===');
    log('========================================');
    log('CDP Runtime.callFunctionOn provides:');
    log('  - Remote object handles (no serialization until you choose)');
    log('  - Direct function invocation on runtime objects');
    log('  - Property navigation without copying whole object trees');
    log('  - Handle chaining for dependency graph traversal');
    log('  - Variable definition and reactivity triggering');
    log('');
    log('Key findings:');
    log('  1. For returnByValue:true calls, CDP and page.evaluate are comparable');
    log('     because both serialize the return value over the protocol.');
    log('  2. CDP shines with returnByValue:false (remote handles) - you can');
    log('     navigate object graphs without any serialization overhead.');
    log('  3. Handle chaining lets you traverse the dependency graph efficiently');
    log('     (e.g., variable -> input -> input\'s inputs) without round-trip');
    log('     serialization at each step.');
    log('  4. Both approaches have ~0.5-2ms per-call overhead from the protocol');
    log('     round trip itself, regardless of serialization.');

    // ── Cleanup ──────────────────────────────────────────────────────────

    log('\nClosing browser...');
    await cdp.detach();
    await browser.close();
    log('Done.');

  } catch (err) {
    console.error(`Fatal error: ${err.message}`);
    console.error(err.stack);
    // Ensure browser is closed even on error
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    process.exit(2);
  }
}

main();
