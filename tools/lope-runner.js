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

// Test suite detection - to be evaluated in page context
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

// Generate TAP format report
function generateTAPReport(suites) {
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
      // Run tests mode
      console.error('Detecting test suites...');

      // Wait longer for tests to compute - tests may need more time
      const testWait = Math.max(options.wait, 5000);
      await page.waitForTimeout(testWait);

      // Detect test suites
      const testData = await page.evaluate(detectTestSuitesInPage);

      if (testData.error) {
        console.error(`Error: ${testData.error}`);
        process.exit(2);
      }

      let suites = testData.suites;

      // Filter by suite name if specified
      if (options.suiteName) {
        suites = suites.filter(s => s.name === options.suiteName || s.name.includes(options.suiteName));
        if (suites.length === 0) {
          console.error(`No test suite found matching: ${options.suiteName}`);
          console.error(`Available suites: ${testData.suites.map(s => s.name).join(', ')}`);
          process.exit(2);
        }
      }

      if (suites.length === 0) {
        console.error('No test suites found in notebook');
        console.error('Test suites must have a "results" object and "viewofResults" property');
        process.exit(2);
      }

      console.error(`Found ${suites.length} test suite(s): ${suites.map(s => s.name).join(', ')}`);

      // Wait for tests to complete (poll until no pending tests)
      const startTime = Date.now();
      while (Date.now() - startTime < options.testTimeout) {
        const currentData = await page.evaluate(detectTestSuitesInPage);
        let pendingCount = 0;

        for (const suite of currentData.suites) {
          if (options.suiteName && !suite.name.includes(options.suiteName)) continue;
          for (const result of Object.values(suite.results)) {
            if (result === 'pending') pendingCount++;
          }
        }

        if (pendingCount === 0) {
          suites = options.suiteName
            ? currentData.suites.filter(s => s.name.includes(options.suiteName))
            : currentData.suites;
          break;
        }

        console.error(`Waiting for ${pendingCount} pending test(s)...`);
        await page.waitForTimeout(1000);
      }

      // Generate output
      if (options.outputFormat === 'json') {
        console.log(JSON.stringify(suites, null, 2));
      } else {
        const report = generateTAPReport(suites);
        console.log(report.output);
      }

      // Determine exit code
      const report = generateTAPReport(suites);
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
