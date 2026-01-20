#!/usr/bin/env node
/**
 * lope-repl.js - Persistent Playwright session with REPL interface
 *
 * Keeps a browser running and accepts JSON commands via stdin.
 * Much faster for iterative development than starting fresh each time.
 *
 * Usage:
 *   node lope-repl.js [--headed] [--verbose]
 *
 * Commands (JSON, one per line):
 *   {"cmd": "load", "notebook": "path/to/notebook.html"}
 *   {"cmd": "run-tests", "timeout": 30000, "filter": "optional"}
 *   {"cmd": "eval", "code": "window.__ojs_runtime._variables.size"}
 *   {"cmd": "get-cell", "name": "cellName"}
 *   {"cmd": "list-cells"}
 *   {"cmd": "status"}
 *   {"cmd": "quit"}
 *
 * Responses (JSON):
 *   {"ok": true, "result": ...}
 *   {"ok": false, "error": "message"}
 */

import { chromium } from 'playwright';
import * as readline from 'readline';
import path from 'path';
import fs from 'fs';

// Parse args
const args = process.argv.slice(2);
const headed = args.includes('--headed');
const verbose = args.includes('--verbose');

// State
let browser = null;
let page = null;
let currentNotebook = null;
let runtimeReady = false;

// Helper to send JSON response
function respond(obj) {
  console.log(JSON.stringify(obj));
}

// Helper for errors
function respondError(message) {
  respond({ ok: false, error: message });
}

// Helper for success
function respondOk(result) {
  respond({ ok: true, result });
}

// Initialize browser
async function initBrowser() {
  browser = await chromium.launch({ headless: !headed });
  page = await browser.newPage();

  if (verbose) {
    page.on('console', msg => {
      if (!msg.text().includes('responding') && !msg.text().includes('keepalive')) {
        process.stderr.write(`[browser] ${msg.text()}\n`);
      }
    });
  }

  page.on('pageerror', err => {
    process.stderr.write(`[browser error] ${err.message}\n`);
  });
}

// Load a notebook
async function loadNotebook(notebookPath, hashUrl = null) {
  const absPath = path.resolve(notebookPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Notebook not found: ${absPath}`);
  }

  // Support hash URL to open specific modules (helps with test observation)
  const hash = hashUrl ? (hashUrl.startsWith('#') ? hashUrl : `#${hashUrl}`) : '';
  const fileUrl = `file://${absPath}${hash}`;
  process.stderr.write(`Loading: ${fileUrl}\n`);

  await page.goto(fileUrl, { timeout: 60000, waitUntil: 'networkidle' });

  // Wait for runtime
  await page.waitForFunction(() => window.__ojs_runtime, { timeout: 30000 });

  // Wait for stabilization
  await page.waitForTimeout(3000);

  currentNotebook = notebookPath;
  runtimeReady = true;
  process.stderr.write(`Loaded: ${notebookPath}\n`);

  return { notebook: notebookPath };
}

// Run tests (reuse logic from lope-runner.js)
async function runTests(timeout = 30000, filter = null) {
  if (!runtimeReady) {
    throw new Error('No notebook loaded');
  }

  const testData = await page.evaluate(async ({ testTimeout, filterStr }) => {
    const runtime = window.__ojs_runtime;
    if (!runtime) return { error: 'Runtime not found' };

    const results = new Map();
    const pendingPromises = [];

    // Find actual runtime
    let actualRuntime = null;
    for (const v of runtime._variables) {
      if (v._module?._runtime?._computeNow) {
        actualRuntime = v._module._runtime;
        break;
      }
    }

    if (!actualRuntime) {
      return { error: 'Could not find actual runtime' };
    }

    // Build module name lookup
    const moduleNames = new Map();
    for (const v of runtime._variables) {
      if (v._module && !moduleNames.has(v._module)) {
        const modName = v._module._name ||
          (v._name?.startsWith('module ') ? v._name : null);
        if (modName) moduleNames.set(v._module, modName);
      }
    }

    // Find test variables
    const testVars = [];
    for (const variable of runtime._variables) {
      const name = variable._name;
      if (typeof name === 'string' && name.startsWith('test_')) {
        // Apply filter if provided
        if (filterStr) {
          const moduleName = moduleNames.get(variable._module) || '';
          if (!name.includes(filterStr) && !moduleName.includes(filterStr)) {
            continue;
          }
        }
        testVars.push(variable);
      }
    }

    if (testVars.length === 0) {
      return { error: 'No test variables found' };
    }

    // Install observers
    for (const v of testVars) {
      const name = v._name;
      const moduleName = moduleNames.get(v._module) || 'main';
      const fullName = `${moduleName}#${name}`;

      const p = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          results.set(fullName, { state: 'timeout', name, module: moduleName });
          resolve();
        }, testTimeout);

        if (!v._reachable) {
          v._reachable = true;
          actualRuntime._dirty.add(v);
        }

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
    actualRuntime._computeNow();

    // Wait for completion
    await Promise.race([
      Promise.all(pendingPromises),
      new Promise(resolve => setTimeout(resolve, testTimeout + 5000))
    ]);

    const tests = [...results.values()];
    const passed = tests.filter(t => t.state === 'passed').length;
    const failed = tests.filter(t => t.state === 'failed').length;
    const timeout_count = tests.filter(t => t.state === 'timeout').length;

    return { tests, summary: { total: tests.length, passed, failed, timeout: timeout_count } };
  }, { testTimeout: timeout, filterStr: filter });

  return testData;
}

// Evaluate code in page context
async function evalCode(code) {
  if (!runtimeReady) {
    throw new Error('No notebook loaded');
  }

  const result = await page.evaluate((code) => {
    try {
      const result = eval(code);
      // Try to serialize
      if (result === undefined) return { value: 'undefined', type: 'undefined' };
      if (result === null) return { value: 'null', type: 'null' };
      if (typeof result === 'function') return { value: result.toString().slice(0, 500), type: 'function' };
      if (typeof result === 'object') {
        try {
          return { value: JSON.parse(JSON.stringify(result)), type: 'object' };
        } catch {
          return { value: String(result), type: 'object' };
        }
      }
      return { value: result, type: typeof result };
    } catch (e) {
      return { error: e.message };
    }
  }, code);

  if (result.error) {
    throw new Error(result.error);
  }
  return result;
}

// Get a specific cell
async function getCell(name) {
  if (!runtimeReady) {
    throw new Error('No notebook loaded');
  }

  const result = await page.evaluate((cellName) => {
    const runtime = window.__ojs_runtime;
    for (const v of runtime._variables) {
      if (v._name === cellName) {
        return {
          name: v._name,
          hasValue: v._value !== undefined,
          hasError: v._error !== undefined,
          value: v._value === undefined ? undefined :
                 typeof v._value === 'function' ? v._value.toString().slice(0, 500) :
                 typeof v._value === 'object' ? JSON.stringify(v._value).slice(0, 1000) :
                 String(v._value),
          error: v._error?.message,
          reachable: v._reachable
        };
      }
    }
    return { error: `Cell not found: ${cellName}` };
  }, name);

  if (result.error) {
    throw new Error(result.error);
  }
  return result;
}

// List all cells
async function listCells() {
  if (!runtimeReady) {
    throw new Error('No notebook loaded');
  }

  const cells = await page.evaluate(() => {
    const runtime = window.__ojs_runtime;
    const cells = [];

    for (const v of runtime._variables) {
      if (!v._name) continue;
      cells.push({
        name: v._name,
        hasValue: v._value !== undefined,
        hasError: v._error !== undefined,
        reachable: v._reachable
      });
    }

    return cells.sort((a, b) => a.name.localeCompare(b.name));
  });

  return { count: cells.length, cells };
}

// Get status
function getStatus() {
  return {
    browserRunning: browser !== null,
    notebook: currentNotebook,
    runtimeReady
  };
}

// Handle a command
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
      case 'load':
        if (!cmd.notebook) {
          respondError('Missing notebook path');
          return;
        }
        const loadResult = await loadNotebook(cmd.notebook, cmd.hash);
        respondOk(loadResult);
        break;

      case 'run-tests':
        const testResult = await runTests(cmd.timeout || 30000, cmd.filter || null);
        if (testResult.error) {
          respondError(testResult.error);
        } else {
          respondOk(testResult);
        }
        break;

      case 'eval':
        if (!cmd.code) {
          respondError('Missing code');
          return;
        }
        const evalResult = await evalCode(cmd.code);
        respondOk(evalResult);
        break;

      case 'get-cell':
        if (!cmd.name) {
          respondError('Missing cell name');
          return;
        }
        const cellResult = await getCell(cmd.name);
        respondOk(cellResult);
        break;

      case 'list-cells':
        const listResult = await listCells();
        respondOk(listResult);
        break;

      case 'status':
        respondOk(getStatus());
        break;

      case 'quit':
        respondOk({ message: 'Goodbye' });
        if (browser) await browser.close();
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
  process.stderr.write('lope-repl: Starting browser...\n');
  await initBrowser();
  process.stderr.write('lope-repl: Ready. Send JSON commands via stdin.\n');

  // Signal ready
  respondOk({ status: 'ready', commands: ['load', 'run-tests', 'eval', 'get-cell', 'list-cells', 'status', 'quit'] });

  // Command queue for sequential processing
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

  // Read commands from stdin
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
    // Process remaining commands before shutdown
    while (commandQueue.length > 0 || processing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    process.stderr.write('lope-repl: stdin closed, shutting down...\n');
    if (browser) await browser.close();
    process.exit(0);
  });
}

main().catch(err => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
