#!/usr/bin/env node
/**
 * lope-browser-repl.js - Persistent Playwright session with REPL interface
 *
 * Keeps a browser running and accepts JSON commands via stdin.
 * Much faster for iterative development than starting fresh each time.
 *
 * Usage:
 *   node lope-browser-repl.js [--headed] [--verbose] [--log <path>]
 *
 * Commands (JSON, one per line):
 *   {"cmd": "load", "notebook": "path/to/notebook.html", "hash": "view=..."}
 *   {"cmd": "run-tests", "timeout": 30000, "filter": "optional", "force": true}
 *   {"cmd": "read-tests", "timeout": 30000, "filter": "optional"}  // reads from latest_state (requires tests module rendered)
 *   {"cmd": "eval", "code": "window.__ojs_runtime._variables.size"}
 *   {"cmd": "get-variable", "name": "varName"}
 *   {"cmd": "list-variables"}
 *   {"cmd": "define-variable", "name": "myVar", "definition": "() => 'hello'", "inputs": [], "module": "@tomlarkworthy/tests"}
 *   {"cmd": "delete-variable", "name": "myVar", "module": "@tomlarkworthy/tests"}
 *   {"cmd": "click", "selector": "button.submit"}
 *   {"cmd": "fill", "selector": "input[name='query']", "value": "hello"}
 *   {"cmd": "query", "selector": "button", "limit": 10}
 *   {"cmd": "download", "selector": "text=Download", "path": "output.html"}
 *   {"cmd": "screenshot", "path": "output.png", "fullPage": true}
 *   {"cmd": "watch", "timeout": 60000, "interval": 500}  // watch for cell changes, returns new history entries
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
import {
  runTestVariables,
  readLatestState,
  getCellInfo,
  listAllVariables,
  defineVariable,
  deleteVariable
} from './tools.js';

// Parse args
const args = process.argv.slice(2);
const headed = args.includes('--headed');
const verbose = args.includes('--verbose');
const logIndex = args.indexOf('--log');
const logPath = logIndex !== -1 ? args[logIndex + 1] : null;
let logFd = null;
if (logPath) {
  logFd = fs.openSync(logPath, 'a');
  process.stderr.write(`Logging to: ${logPath}\n`);
}

// State
let browser = null;
let page = null;
let currentNotebook = null;
let runtimeReady = false;
let watchHighWaterMark = 0; // tracks how many history entries we've already seen

// Helper to send JSON response
function respond(obj) {
  const line = JSON.stringify(obj);
  console.log(line);
  if (logFd !== null) {
    fs.writeSync(logFd, line + '\n');
  }
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
  watchHighWaterMark = 0; // reset watch position for new notebook
  process.stderr.write(`Loaded: ${notebookPath}\n`);

  // Start auto-watch if logging is enabled
  startAutoWatch();

  return { notebook: notebookPath };
}

// Auto-watch: background interval that polls for history changes and logs them
let autoWatchInterval = null;

function startAutoWatch() {
  stopAutoWatch();
  if (!logFd) return; // only auto-watch when logging

  // Initial snapshot of history length
  let initializing = true;

  autoWatchInterval = setInterval(async () => {
    if (!runtimeReady || !page) return;
    try {
      const result = await page.evaluate(readHistorySince, watchHighWaterMark);
      if (result.error) return; // silently skip errors (e.g. history not yet available)

      if (initializing) {
        // First poll: just set the high water mark, don't report existing entries
        watchHighWaterMark = result.total;
        initializing = false;
        process.stderr.write(`auto-watch: initialized at history index ${watchHighWaterMark}\n`);
        return;
      }

      if (result.entries.length > 0) {
        watchHighWaterMark = result.total;
        respond({ event: 'change', changes: result.entries, historyIndex: result.total });
      }
    } catch {
      // page might be navigating, ignore
    }
  }, 1000);
}

function stopAutoWatch() {
  if (autoWatchInterval) {
    clearInterval(autoWatchInterval);
    autoWatchInterval = null;
  }
}

// Read tests from latest_state (natural observation via tests module UI)
async function readTestsFromLatestState(timeout = 30000, filter = null) {
  if (!runtimeReady) {
    throw new Error('No notebook loaded');
  }

  // Wait for tests to settle, polling latest_state
  const startTime = Date.now();
  let lastPending = Infinity;
  let stableCount = 0;

  while (Date.now() - startTime < timeout) {
    const state = await page.evaluate(readLatestState, filter);

    if (state.error) {
      throw new Error(state.error);
    }

    // Check if stable (no pending tests, or pending count unchanged)
    const currentPending = state.counts.pending || 0;
    if (currentPending === 0) {
      // All tests resolved
      const passed = state.counts.fulfilled || 0;
      const failed = state.counts.rejected || 0;
      return {
        tests: state.tests,
        summary: {
          total: state.tests.length,
          passed,
          failed,
          pending: 0,
          paused: state.counts.paused || 0
        }
      };
    }

    if (currentPending === lastPending) {
      stableCount++;
      if (stableCount >= 3) {
        // Pending count stable for 3 checks, return current state
        const passed = state.counts.fulfilled || 0;
        const failed = state.counts.rejected || 0;
        return {
          tests: state.tests,
          summary: {
            total: state.tests.length,
            passed,
            failed,
            pending: currentPending,
            paused: state.counts.paused || 0
          }
        };
      }
    } else {
      stableCount = 0;
      lastPending = currentPending;
    }

    await page.waitForTimeout(500);
  }

  // Timeout - return current state
  const finalState = await page.evaluate(readLatestState, filter);

  return {
    tests: finalState.tests,
    summary: {
      total: finalState.tests.length,
      passed: finalState.counts.fulfilled || 0,
      failed: finalState.counts.rejected || 0,
      pending: finalState.counts.pending || 0,
      paused: finalState.counts.paused || 0
    }
  };
}

// Run tests using shared runTestVariables
async function runTests(timeout = 30000, filter = null, forceReachable = true) {
  if (!runtimeReady) {
    throw new Error('No notebook loaded');
  }

  const testData = await page.evaluate(runTestVariables, {
    testTimeout: timeout,
    filterStr: filter,
    force: forceReachable
  });

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

// Get a specific variable
async function getVariable(name) {
  if (!runtimeReady) {
    throw new Error('No notebook loaded');
  }

  const result = await page.evaluate(getCellInfo, name);

  if (result.error) {
    throw new Error(result.error);
  }
  return result;
}

// List all variables
async function listVariables() {
  if (!runtimeReady) {
    throw new Error('No notebook loaded');
  }

  const variables = await page.evaluate(listAllVariables);

  if (variables.error) {
    throw new Error(variables.error);
  }

  return { count: variables.length, variables };
}

// Get status
function getStatus() {
  return {
    browserRunning: browser !== null,
    notebook: currentNotebook,
    runtimeReady
  };
}

// Page-context function: read new history entries since a given index
function readHistorySince(sinceIndex) {
  try {
    const runtime = window.__ojs_runtime;
    if (!runtime) return { error: 'Runtime not available' };

    // Find the history variable
    for (const v of runtime._variables) {
      if (v._name === 'history' && v._value && Array.isArray(v._value)) {
        const history = v._value;
        const total = history.length;
        if (total <= sinceIndex) return { total, entries: [] };
        const newEntries = history.slice(sinceIndex).map(e => ({
          t: e.t,
          op: e.op,
          module: e.module,
          _name: e._name,
          source: e.source,
          _inputs: e._inputs,
          _definition: typeof e._definition === 'function'
            ? e._definition.toString().slice(0, 200)
            : String(e._definition).slice(0, 200)
        }));
        return { total, entries: newEntries };
      }
    }
    return { error: 'history variable not found (is local-change-history module loaded?)' };
  } catch (e) {
    return { error: e.message };
  }
}

// Watch for cell changes by polling the history variable
async function watchChanges(timeout = 60000, interval = 500) {
  if (!runtimeReady) {
    throw new Error('No notebook loaded');
  }

  const startTime = Date.now();

  // On first call, snapshot the current high water mark
  if (watchHighWaterMark === 0) {
    const snapshot = await page.evaluate(readHistorySince, 0);
    if (snapshot.error) throw new Error(snapshot.error);
    watchHighWaterMark = snapshot.total;
    process.stderr.write(`watch: initialized at history index ${watchHighWaterMark}\n`);
  }

  // Poll until new entries or timeout
  while (Date.now() - startTime < timeout) {
    const result = await page.evaluate(readHistorySince, watchHighWaterMark);
    if (result.error) throw new Error(result.error);

    if (result.entries.length > 0) {
      watchHighWaterMark = result.total;
      return {
        changes: result.entries,
        historyIndex: result.total
      };
    }

    await page.waitForTimeout(interval);
  }

  // Timeout with no changes
  return { changes: [], historyIndex: watchHighWaterMark, timeout: true };
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
        // force defaults to true for backwards compatibility
        const forceReachable = cmd.force !== false;
        const testResult = await runTests(cmd.timeout || 30000, cmd.filter || null, forceReachable);
        if (testResult.error) {
          respondError(testResult.error);
        } else {
          respondOk(testResult);
        }
        break;

      case 'read-tests':
        // Read tests from latest_state (requires tests module to be rendered)
        const readResult = await readTestsFromLatestState(cmd.timeout || 30000, cmd.filter || null);
        respondOk(readResult);
        break;

      case 'eval':
        if (!cmd.code) {
          respondError('Missing code');
          return;
        }
        const evalResult = await evalCode(cmd.code);
        respondOk(evalResult);
        break;

      case 'get-variable':
        if (!cmd.name) {
          respondError('Missing variable name');
          return;
        }
        const varResult = await getVariable(cmd.name);
        respondOk(varResult);
        break;

      case 'list-variables':
        const listResult = await listVariables();
        respondOk(listResult);
        break;

      case 'status':
        respondOk(getStatus());
        break;

      case 'query':
        if (!runtimeReady) {
          respondError('No notebook loaded');
          return;
        }
        if (!cmd.selector) {
          respondError('Missing selector');
          return;
        }
        try {
          const limit = cmd.limit || 10;
          const elements = await page.evaluate(({ selector, limit }) => {
            const els = document.querySelectorAll(selector);
            const results = [];
            for (let i = 0; i < Math.min(els.length, limit); i++) {
              const el = els[i];
              results.push({
                tag: el.tagName.toLowerCase(),
                id: el.id || null,
                class: el.className || null,
                text: el.textContent?.slice(0, 100)?.trim() || null,
                value: el.value !== undefined ? el.value : null,
                visible: el.offsetParent !== null,
                rect: el.getBoundingClientRect()
              });
            }
            return { count: els.length, elements: results };
          }, { selector: cmd.selector, limit });
          respondOk(elements);
        } catch (e) {
          respondError(`Query failed: ${e.message}`);
        }
        break;

      case 'click':
        if (!runtimeReady) {
          respondError('No notebook loaded');
          return;
        }
        if (!cmd.selector) {
          respondError('Missing selector');
          return;
        }
        try {
          await page.click(cmd.selector, { timeout: cmd.timeout || 5000 });
          respondOk({ clicked: cmd.selector });
        } catch (e) {
          respondError(`Click failed: ${e.message}`);
        }
        break;

      case 'fill':
        if (!runtimeReady) {
          respondError('No notebook loaded');
          return;
        }
        if (!cmd.selector) {
          respondError('Missing selector');
          return;
        }
        if (cmd.value === undefined) {
          respondError('Missing value');
          return;
        }
        try {
          await page.fill(cmd.selector, cmd.value, { timeout: cmd.timeout || 5000 });
          respondOk({ filled: cmd.selector, value: cmd.value });
        } catch (e) {
          respondError(`Fill failed: ${e.message}`);
        }
        break;

      case 'download':
        if (!runtimeReady) {
          respondError('No notebook loaded');
          return;
        }
        if (!cmd.selector) {
          respondError('Missing selector');
          return;
        }
        try {
          const downloadPath = cmd.path || 'download';
          // Start waiting for download before clicking
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: cmd.timeout || 30000 }),
            page.click(cmd.selector, { timeout: cmd.timeout || 5000 })
          ]);
          // Save to specified path
          await download.saveAs(downloadPath);
          const suggestedName = download.suggestedFilename();
          respondOk({
            path: downloadPath,
            suggestedFilename: suggestedName,
            url: download.url()
          });
        } catch (e) {
          respondError(`Download failed: ${e.message}`);
        }
        break;

      case 'screenshot':
        if (!runtimeReady) {
          respondError('No notebook loaded');
          return;
        }
        const screenshotPath = cmd.path || 'screenshot.png';
        const fullPage = cmd.fullPage !== false;
        await page.screenshot({ path: screenshotPath, fullPage });
        respondOk({ path: screenshotPath, fullPage });
        break;

      case 'define-variable':
        if (!runtimeReady) {
          respondError('No notebook loaded');
          return;
        }
        if (!cmd.name) {
          respondError('Missing variable name');
          return;
        }
        if (!cmd.definition) {
          respondError('Missing variable definition');
          return;
        }
        const defineResult = await page.evaluate(defineVariable, {
          name: cmd.name,
          inputs: cmd.inputs || [],
          definition: cmd.definition,
          moduleName: cmd.module || null
        });
        if (defineResult.error) {
          respondError(defineResult.error);
        } else {
          respondOk(defineResult);
        }
        break;

      case 'delete-variable':
        if (!runtimeReady) {
          respondError('No notebook loaded');
          return;
        }
        if (!cmd.name) {
          respondError('Missing variable name');
          return;
        }
        const deleteResult = await page.evaluate(deleteVariable, {
          name: cmd.name,
          moduleName: cmd.module || null
        });
        if (deleteResult.error) {
          respondError(deleteResult.error);
        } else {
          respondOk(deleteResult);
        }
        break;

      case 'watch':
        if (!runtimeReady) {
          respondError('No notebook loaded');
          return;
        }
        const watchResult = await watchChanges(cmd.timeout || 60000, cmd.interval || 500);
        respondOk(watchResult);
        break;

      case 'quit':
        stopAutoWatch();
        if (logFd !== null) fs.closeSync(logFd);
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
  respondOk({ status: 'ready', commands: ['load', 'run-tests', 'read-tests', 'eval', 'get-variable', 'list-variables', 'define-variable', 'delete-variable', 'query', 'click', 'fill', 'download', 'screenshot', 'watch', 'status', 'quit'] });

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
