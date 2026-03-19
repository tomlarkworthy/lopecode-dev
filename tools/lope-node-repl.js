#!/usr/bin/env node
/**
 * lope-node-repl.js - Node-native Observable runtime REPL
 *
 * Runs lopecode notebooks in Node.js using the full bootloader pipeline.
 * Uses LinkeDOM + vm.SourceTextModule for faithful browser-like execution.
 * No Playwright, no serialization boundary — direct access to JS values.
 *
 * Requires: node --experimental-vm-modules
 *
 * Usage:
 *   node --experimental-vm-modules tools/lope-node-repl.js [--verbose]
 *
 * Commands (JSON, one per line):
 *   {"cmd": "load", "notebook": "path/to/notebook.html"}
 *   {"cmd": "run-tests", "timeout": 30000, "filter": "optional"}
 *   {"cmd": "eval", "code": "1 + 1"}
 *   {"cmd": "get-variable", "name": "varName", "module": "optional"}
 *   {"cmd": "list-variables"}
 *   {"cmd": "define-variable", "name": "myVar", "definition": "() => 42", "inputs": [], "module": "optional"}
 *   {"cmd": "delete-variable", "name": "myVar", "module": "optional"}
 *   {"cmd": "wait-for", "name": "varName", "timeout": 30000, "module": "optional"}
 *   {"cmd": "status"}
 *   {"cmd": "quit"}
 */

import * as readline from 'readline';
import { loadNotebook } from './lope-runtime.js';

// Parse args
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

/** @type {import('./lope-runtime.js').LopecodeExecution | null} */
let execution = null;

function respond(obj) {
  console.log(JSON.stringify(obj));
}
function respondOk(result) {
  respond({ ok: true, result });
}
function respondError(message) {
  respond({ ok: false, error: message });
}
function log(msg) {
  if (verbose) process.stderr.write(`[repl2] ${msg}\n`);
}

// Prevent unhandled rejections from crashing
process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${String(reason?.message || reason).slice(0, 200)}`);
});

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

        // Dispose previous execution
        if (execution) {
          try { execution.dispose(); } catch {}
          execution = null;
        }

        const opts = {
          settleTimeout: cmd.timeout || 10000,
          log: verbose ? (msg) => process.stderr.write(`[runtime] ${msg}\n`) : undefined,
        };

        if (cmd.hash) opts.hash = cmd.hash;
        if (cmd.search) opts.search = cmd.search;
        if (cmd.localStorage) opts.localStorage = cmd.localStorage;

        execution = await loadNotebook(cmd.notebook, opts);

        const vars = execution.listVariables();
        respondOk({
          notebook: cmd.notebook,
          bootloader: execution.bootconf ? execution._internals.bootloaderName : null,
          mains: [...execution.mains.keys()],
          variables: {
            total: vars.length,
            resolved: vars.filter(v => v.hasValue).length,
            errors: vars.filter(v => v.hasError).length,
            pending: vars.filter(v => !v.hasValue && !v.hasError).length,
          },
        });
        break;
      }

      case 'run-tests': {
        if (!execution) { respondError('No notebook loaded'); return; }
        const result = await execution.runTests(cmd.timeout || 30000, cmd.filter || null);
        respondOk(result);
        break;
      }

      case 'eval': {
        if (!execution) { respondError('No notebook loaded'); return; }
        if (!cmd.code) { respondError('Missing code'); return; }
        const result = execution.eval(cmd.code);
        respondOk({ value: serializeForOutput(result), type: typeof result });
        break;
      }

      case 'get-variable': {
        if (!execution) { respondError('No notebook loaded'); return; }
        if (!cmd.name) { respondError('Missing variable name'); return; }
        const result = execution.getVariable(cmd.name, cmd.module || null);
        if (!result.found) { respondError(`Variable not found: ${cmd.name}`); return; }
        respondOk({
          name: cmd.name,
          module: cmd.module || 'auto',
          hasValue: result.hasValue,
          hasError: result.hasError,
          value: serializeForOutput(result.value),
          error: result.error?.message,
          reachable: result.reachable,
          type: result.hasValue ? typeof result.value : undefined,
        });
        break;
      }

      case 'list-variables': {
        if (!execution) { respondError('No notebook loaded'); return; }
        const vars = execution.listVariables();
        respondOk({
          count: vars.length,
          variables: vars.sort((a, b) => a.name.localeCompare(b.name)),
        });
        break;
      }

      case 'define-variable': {
        if (!execution) { respondError('No notebook loaded'); return; }
        if (!cmd.name) { respondError('Missing variable name'); return; }
        if (!cmd.definition) { respondError('Missing definition'); return; }

        let fn;
        try {
          fn = eval(`(${cmd.definition})`);
          if (typeof fn !== 'function') { respondError('Definition must evaluate to a function'); return; }
        } catch (e) { respondError(`Failed to parse definition: ${e.message}`); return; }

        try {
          execution.defineVariable(cmd.name, cmd.inputs || [], fn, cmd.module || null);
          respondOk({ success: true, name: cmd.name, module: cmd.module || 'default' });
        } catch (e) { respondError(e.message); }
        break;
      }

      case 'delete-variable': {
        if (!execution) { respondError('No notebook loaded'); return; }
        if (!cmd.name) { respondError('Missing variable name'); return; }
        const deleted = execution.deleteVariable(cmd.name, cmd.module || null);
        if (deleted) respondOk({ success: true, name: cmd.name });
        else respondError(`Variable not found: ${cmd.name}`);
        break;
      }

      case 'wait-for': {
        if (!execution) { respondError('No notebook loaded'); return; }
        if (!cmd.name) { respondError('Missing variable name'); return; }
        try {
          const result = await execution.waitForVariable(cmd.name, cmd.timeout || 30000, cmd.module || null);
          respondOk({
            name: cmd.name,
            hasValue: result.hasValue,
            hasError: result.hasError,
            value: serializeForOutput(result.value),
            error: result.error?.message,
          });
        } catch (e) { respondError(e.message); }
        break;
      }

      case 'status':
        if (!execution) {
          respondOk({ loaded: false });
        } else {
          const vars = execution.listVariables();
          respondOk({
            loaded: true,
            notebook: execution.notebookPath,
            mains: [...execution.mains.keys()],
            variables: {
              total: vars.length,
              resolved: vars.filter(v => v.hasValue).length,
              errors: vars.filter(v => v.hasError).length,
              pending: vars.filter(v => !v.hasValue && !v.hasError).length,
            },
          });
        }
        break;

      case 'quit':
        if (execution) execution.dispose();
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
  process.stderr.write('lope-node-repl: Starting (vm.Module + LinkeDOM)...\n');

  respondOk({
    status: 'ready',
    commands: [
      'load', 'run-tests', 'eval', 'get-variable',
      'list-variables', 'define-variable', 'delete-variable',
      'wait-for', 'status', 'quit'
    ],
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
    terminal: false,
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
    process.stderr.write('lope-node-repl: stdin closed\n');
    process.exit(0);
  });
}

main().catch(err => {
  process.stderr.write(`Fatal: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
