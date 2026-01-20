#!/usr/bin/env node
/**
 * lope-runner.js - Run lopecode notebooks headlessly with Playwright
 *
 * Usage:
 *   node lope-runner.js <notebook.html> [options]
 *
 * Options:
 *   --list-cells          List all cells and their current values
 *   --get-cell <name>     Get a specific cell's value
 *   --run-tests           Run all test suites and report results
 *   --test-timeout <ms>   Per-test timeout (default: 30000)
 *   --suite <name>        Only run specific test suite (by variable name)
 *   --tap                 Output raw TAP format (default for tests)
 *   --json                Output JSON test results
 *   --fail-fast           Stop on first failure
 *   --wait <ms>           Wait time for notebook to stabilize (default: 3000)
 *   --timeout <ms>        Maximum execution time (default: 30000)
 *   --headed              Run with visible browser (for debugging)
 *   --verbose             Show console logs from notebook
 *
 * Exit Codes (for --run-tests):
 *   0 - All tests passed
 *   1 - One or more tests failed
 *   2 - Error (notebook load failed, no tests found, etc.)
 *
 * Examples:
 *   node lope-runner.js ../lopecode/notebooks/@tomlarkworthy_notes.html --list-cells
 *   node lope-runner.js ../lopecode/notebooks/@tomlarkworthy_exporter.html --get-cell exportState
 *   node lope-runner.js ../lopecode/notebooks/@tomlarkworthy_jumpgate.html --run-tests
 *   node lope-runner.js notebook.html --run-tests --json
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const args = process.argv.slice(2);

function parseArgs(args) {
  const options = {
    notebook: null,
    listCells: false,
    getCell: null,
    runTests: false,
    testTimeout: 30000,
    suiteName: null,
    outputFormat: 'tap',
    failFast: false,
    wait: 3000,
    timeout: 30000,
    headed: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--list-cells') {
      options.listCells = true;
    } else if (arg === '--get-cell' && args[i + 1]) {
      options.getCell = args[++i];
    } else if (arg === '--run-tests') {
      options.runTests = true;
    } else if (arg === '--test-timeout' && args[i + 1]) {
      options.testTimeout = parseInt(args[++i], 10);
    } else if (arg === '--suite' && args[i + 1]) {
      options.suiteName = args[++i];
    } else if (arg === '--tap') {
      options.outputFormat = 'tap';
    } else if (arg === '--json') {
      options.outputFormat = 'json';
    } else if (arg === '--fail-fast') {
      options.failFast = true;
    } else if (arg === '--wait' && args[i + 1]) {
      options.wait = parseInt(args[++i], 10);
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === '--headed') {
      options.headed = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (!arg.startsWith('--') && !options.notebook) {
      options.notebook = arg;
    }
  }

  return options;
}

// Test suite detection - to be evaluated in page context (legacy suite pattern)
function detectTestSuitesInPage() {
  const runtime = window.__ojs_runtime;
  if (!runtime) return { error: 'Runtime not found' };

  const suites = [];

  for (const variable of runtime._variables) {
    const name = variable._name;
    const value = variable._value;

    // Check for test suite signature: has results object and viewofResults
    if (value && typeof value === 'object' &&
        'results' in value && 'viewofResults' in value) {
      const results = {};
      for (const [testName, result] of Object.entries(value.results)) {
        if (result === 'ok') {
          results[testName] = 'ok';
        } else if (result === undefined) {
          results[testName] = 'pending';
        } else if (result instanceof Error) {
          results[testName] = { error: result.message, stack: result.stack };
        } else {
          results[testName] = { error: String(result) };
        }
      }
      suites.push({
        name,
        testCount: Object.keys(value.results).length,
        results
      });
    }
  }

  return { suites };
}

// Run test_* variables using observer pattern - to be evaluated in page context
async function runTestVariablesInPage(testTimeout) {
  const runtime = window.__ojs_runtime;
  if (!runtime) return { error: 'Runtime not found' };

  const results = new Map();
  const pendingPromises = [];

  // Find actual runtime (the one with _computeNow)
  let actualRuntime = null;
  for (const v of runtime._variables) {
    if (v._module?._runtime?._computeNow) {
      actualRuntime = v._module._runtime;
      break;
    }
  }

  if (!actualRuntime) {
    return { error: 'Could not find actual runtime with _computeNow' };
  }

  // Find all test_ variables
  const testVars = [];
  for (const variable of runtime._variables) {
    const name = variable._name;
    if (typeof name === 'string' && name.startsWith('test_')) {
      testVars.push(variable);
    }
  }

  if (testVars.length === 0) {
    return { error: 'No test variables found (cells starting with test_)' };
  }

  // Build module name lookup
  const moduleNames = new Map();
  for (const v of runtime._variables) {
    if (v._module && !moduleNames.has(v._module)) {
      // Try to find module name from variables that look like module definitions
      const modName = v._module._name ||
        (v._name?.startsWith('module ') ? v._name : null);
      if (modName) moduleNames.set(v._module, modName);
    }
  }

  // Install an observer on each test variable
  for (const v of testVars) {
    const name = v._name;
    const moduleName = moduleNames.get(v._module) || 'main';
    const fullName = `${moduleName}#${name}`;

    // Create a promise that resolves when the test completes
    const p = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        results.set(fullName, { state: 'timeout', name, module: moduleName });
        resolve();
      }, testTimeout);

      // Mark as reachable to trigger computation
      if (!v._reachable) {
        v._reachable = true;
        actualRuntime._dirty.add(v);
      }

      // Install observer
      const oldObserver = v._observer;
      v._observer = {
        fulfilled: (value) => {
          clearTimeout(timeout);
          results.set(fullName, {
            state: 'passed',
            name,
            module: moduleName,
            value: value === undefined ? 'undefined' : String(value).slice(0, 200)
          });
          resolve();
          if (oldObserver?.fulfilled) oldObserver.fulfilled(value);
        },
        rejected: (error) => {
          clearTimeout(timeout);
          results.set(fullName, {
            state: 'failed',
            name,
            module: moduleName,
            error: error?.message || String(error),
            stack: error?.stack?.slice(0, 500)
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
  actualRuntime._computeNow();

  // Wait for all tests (with overall timeout)
  await Promise.race([
    Promise.all(pendingPromises),
    new Promise(resolve => setTimeout(resolve, testTimeout + 5000))
  ]);

  // Convert results to array
  const output = [...results.values()];

  return { tests: output, totalCount: testVars.length };
}

// Generate TAP format report from suite-style results (legacy)
function generateTAPReportFromSuites(suites) {
  let totalTests = 0;
  for (const suite of suites) {
    totalTests += Object.keys(suite.results).length;
  }

  let output = 'TAP version 13\n';
  output += `1..${totalTests}\n`;

  let testIndex = 0;
  let passed = 0;
  let failed = 0;

  for (const suite of suites) {
    const sortedTests = Object.entries(suite.results).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [testName, result] of sortedTests) {
      testIndex++;
      if (result === 'ok') {
        output += `ok ${testIndex} - ${suite.name}: ${testName}\n`;
        passed++;
      } else if (result === 'pending') {
        output += `not ok ${testIndex} - ${suite.name}: ${testName} # TODO pending\n`;
        failed++;
      } else {
        output += `not ok ${testIndex} - ${suite.name}: ${testName}\n`;
        if (result.error) {
          output += `  ---\n`;
          output += `  message: ${result.error.slice(0, 500)}\n`;
          output += `  ...\n`;
        }
        failed++;
      }
    }
  }

  output += `# tests ${totalTests}\n`;
  output += `# pass ${passed}\n`;
  output += `# fail ${failed}\n`;

  return { output, passed, failed, total: totalTests };
}

// Generate TAP format report from test_* variable results
function generateTAPReport(tests) {
  const totalTests = tests.length;

  let output = 'TAP version 13\n';
  output += `1..${totalTests}\n`;

  let testIndex = 0;
  let passed = 0;
  let failed = 0;

  // Sort by module then name
  const sortedTests = [...tests].sort((a, b) => {
    const modCmp = (a.module || '').localeCompare(b.module || '');
    if (modCmp !== 0) return modCmp;
    return (a.name || '').localeCompare(b.name || '');
  });

  for (const test of sortedTests) {
    testIndex++;
    const fullName = test.module ? `${test.module}#${test.name}` : test.name;

    if (test.state === 'passed') {
      output += `ok ${testIndex} - ${fullName}\n`;
      passed++;
    } else if (test.state === 'timeout') {
      output += `not ok ${testIndex} - ${fullName} # TIMEOUT\n`;
      failed++;
    } else {
      output += `not ok ${testIndex} - ${fullName}\n`;
      if (test.error) {
        output += `  ---\n`;
        output += `  message: ${test.error.slice(0, 500)}\n`;
        output += `  ...\n`;
      }
      failed++;
    }
  }

  output += `# tests ${totalTests}\n`;
  output += `# pass ${passed}\n`;
  output += `# fail ${failed}\n`;

  return { output, passed, failed, total: totalTests };
}

async function runNotebook(options) {
  if (!options.notebook) {
    console.error('Usage: node lope-runner.js <notebook.html> [options]');
    console.error('Run with --help for more information');
    process.exit(1);
  }

  // Resolve to absolute path
  const notebookPath = path.resolve(options.notebook);
  if (!fs.existsSync(notebookPath)) {
    console.error(`Error: Notebook not found: ${notebookPath}`);
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: !options.headed,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs if verbose
  if (options.verbose) {
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type()}] ${msg.text()}`);
    });
  }

  // Capture errors
  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR] ${err.message}`);
  });

  try {
    // Inject instrumentation to capture the Observable runtime before page loads
    await page.addInitScript(() => {
      // Patch the Runtime constructor to expose it on window
      const originalRuntime = window.Runtime;
      let runtimeCaptured = false;

      Object.defineProperty(window, 'Runtime', {
        get() { return originalRuntime; },
        set(NewRuntime) {
          // Wrap the constructor to capture the instance
          const WrappedRuntime = function(...args) {
            const instance = new NewRuntime(...args);
            if (!runtimeCaptured) {
              window.__ojs_runtime = instance;
              runtimeCaptured = true;
            }
            return instance;
          };
          WrappedRuntime.prototype = NewRuntime.prototype;
          Object.assign(WrappedRuntime, NewRuntime);
          window._OriginalRuntime = NewRuntime;
          return WrappedRuntime;
        }
      });

      // Alternative: also try to capture via module pattern
      const originalDefine = Object.defineProperty;
      Object.defineProperty = function(obj, prop, desc) {
        const result = originalDefine.call(this, obj, prop, desc);
        // Capture runtime if it's defined with mains property (Observable pattern)
        if (desc && desc.value && desc.value.mains && desc.value._variables) {
          window.__ojs_runtime = desc.value;
        }
        return result;
      };
    });

    // Navigate to the notebook file
    const fileUrl = `file://${notebookPath}`;
    console.error(`Loading: ${fileUrl}`);

    await page.goto(fileUrl, {
      timeout: options.timeout,
      waitUntil: 'networkidle'
    });

    // Wait for the Observable runtime to be captured
    // Try multiple detection strategies
    await page.waitForFunction(() => {
      // Check if runtime was captured by our instrumentation
      if (window.__ojs_runtime) return true;

      // Fallback: scan window for objects that look like a runtime
      for (const key in window) {
        try {
          const val = window[key];
          if (val && typeof val === 'object' && val._variables && val.module) {
            window.__ojs_runtime = val;
            return true;
          }
        } catch (e) {}
      }
      return false;
    }, { timeout: options.timeout });

    console.error('Runtime initialized, waiting for cells to stabilize...');

    // Wait for cells to compute
    await page.waitForTimeout(options.wait);

    // Extract cell information from the runtime
    const cellData = await page.evaluate(() => {
      const runtime = window.__ojs_runtime;
      if (!runtime) return { error: 'Runtime not found' };

      const cells = {};
      const errors = [];

      // Iterate over all variables in the runtime
      for (const variable of runtime._variables) {
        try {
          const name = variable._name;
          if (!name) continue; // Skip anonymous cells

          // Get the current value
          let value = variable._value;
          let type = typeof value;
          let serialized = null;

          // Try to serialize the value
          try {
            if (value === undefined) {
              serialized = 'undefined';
            } else if (value === null) {
              serialized = 'null';
            } else if (value instanceof Error) {
              serialized = `Error: ${value.message}`;
              type = 'error';
            } else if (value instanceof HTMLElement) {
              serialized = `<${value.tagName.toLowerCase()}> (${value.outerHTML.slice(0, 100)}...)`;
              type = 'HTMLElement';
            } else if (typeof value === 'function') {
              serialized = value.toString().slice(0, 200);
              type = 'function';
            } else if (typeof value === 'object') {
              serialized = JSON.stringify(value, null, 2).slice(0, 500);
            } else {
              serialized = String(value);
            }
          } catch (e) {
            serialized = `[Serialization error: ${e.message}]`;
          }

          cells[name] = {
            name,
            type,
            value: serialized,
            hasError: variable._error !== undefined,
            error: variable._error ? String(variable._error) : null,
          };
        } catch (e) {
          errors.push(`Error processing variable: ${e.message}`);
        }
      }

      return { cells, errors, variableCount: runtime._variables.size };
    });

    if (cellData.error) {
      console.error(`Error: ${cellData.error}`);
      process.exit(1);
    }

    // Output results based on options
    if (options.listCells) {
      console.log(`\nNotebook: ${path.basename(notebookPath)}`);
      console.log(`Variables: ${cellData.variableCount}`);
      console.log(`\nCells:`);

      const sortedCells = Object.values(cellData.cells)
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const cell of sortedCells) {
        const status = cell.hasError ? '❌' : '✓';
        const preview = cell.value ? cell.value.slice(0, 60).replace(/\n/g, '\\n') : '';
        console.log(`  ${status} ${cell.name} (${cell.type}): ${preview}...`);
      }

      if (cellData.errors.length > 0) {
        console.log(`\nErrors during extraction:`);
        for (const err of cellData.errors) {
          console.log(`  - ${err}`);
        }
      }
    } else if (options.getCell) {
      const cell = cellData.cells[options.getCell];
      if (!cell) {
        // Try partial match
        const matches = Object.keys(cellData.cells)
          .filter(k => k.includes(options.getCell));
        if (matches.length > 0) {
          console.error(`Cell '${options.getCell}' not found. Similar cells:`);
          for (const m of matches.slice(0, 5)) {
            console.error(`  - ${m}`);
          }
        } else {
          console.error(`Cell '${options.getCell}' not found`);
        }
        process.exit(1);
      }
      console.log(JSON.stringify(cell, null, 2));
    } else if (options.runTests) {
      // Run tests mode - uses test_* variable pattern with observers
      console.error('Running tests (test_* variables)...');

      // Run tests using observer pattern
      const testData = await page.evaluate(runTestVariablesInPage, options.testTimeout);

      if (testData.error) {
        console.error(`Error: ${testData.error}`);
        process.exit(2);
      }

      let tests = testData.tests;

      // Filter by suite/module name if specified
      if (options.suiteName) {
        tests = tests.filter(t =>
          t.module?.includes(options.suiteName) ||
          t.name?.includes(options.suiteName)
        );
        if (tests.length === 0) {
          console.error(`No tests found matching: ${options.suiteName}`);
          const modules = [...new Set(testData.tests.map(t => t.module))];
          console.error(`Available modules: ${modules.join(', ')}`);
          process.exit(2);
        }
      }

      // Summary
      const passed = tests.filter(t => t.state === 'passed').length;
      const failed = tests.filter(t => t.state === 'failed').length;
      const timeout = tests.filter(t => t.state === 'timeout').length;
      console.error(`Found ${tests.length} test(s): ${passed} passed, ${failed} failed, ${timeout} timeout`);

      // Generate output
      if (options.outputFormat === 'json') {
        console.log(JSON.stringify(tests, null, 2));
      } else {
        const report = generateTAPReport(tests);
        console.log(report.output);
      }

      // Determine exit code
      const report = generateTAPReport(tests);
      await browser.close();
      process.exit(report.failed > 0 ? 1 : 0);
    } else {
      // Default: output all cell data as JSON
      console.log(JSON.stringify(cellData, null, 2));
    }

  } catch (error) {
    console.error(`Error running notebook: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
lope-runner.js - Run lopecode notebooks headlessly with Playwright

Usage:
  node lope-runner.js <notebook.html> [options]

Options:
  --list-cells          List all cells and their current values
  --get-cell <name>     Get a specific cell's value
  --run-tests           Run all test suites and report results
  --test-timeout <ms>   Per-test timeout (default: 30000)
  --suite <name>        Only run specific test suite (by variable name)
  --tap                 Output raw TAP format (default for tests)
  --json                Output JSON test results
  --fail-fast           Stop on first failure
  --wait <ms>           Wait time for notebook to stabilize (default: 3000)
  --timeout <ms>        Maximum execution time (default: 30000)
  --headed              Run with visible browser (for debugging)
  --verbose             Show console logs from notebook

Exit Codes (for --run-tests):
  0 - All tests passed
  1 - One or more tests failed
  2 - Error (notebook load failed, no tests found, etc.)

Examples:
  node lope-runner.js ../lopecode/notebooks/@tomlarkworthy_notes.html --list-cells
  node lope-runner.js ../lopecode/notebooks/@tomlarkworthy_exporter.html --get-cell exportState
  node lope-runner.js ../lopecode/notebooks/@tomlarkworthy_jumpgate.html --run-tests
  node lope-runner.js notebook.html --run-tests --json
  `);
  process.exit(0);
}

const options = parseArgs(args);
runNotebook(options);
