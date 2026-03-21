#!/usr/bin/env node
/**
 * bulk-smoke-test.js - Load each notebook and run tests to verify they work
 *
 * Runs each notebook in a subprocess (via lope-runtime.js/Node) for isolation.
 *
 * Usage:
 *   node tools/bulk-smoke-test.js <dir> [--json] [--timeout <ms>]
 */

import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
let dir = null;
let json = false;
let timeout = 15000;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--json') json = true;
  else if (args[i] === '--timeout' && args[i + 1]) timeout = parseInt(args[++i], 10);
  else if (!args[i].startsWith('-')) dir = args[i];
}

if (!dir) {
  console.error('Usage: node tools/bulk-smoke-test.js <dir>');
  process.exit(2);
}

const dirPath = resolve(dir);
const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html')).sort();
const workerScript = resolve(__dirname, 'bulk-smoke-test-worker.js');

function testNotebook(filePath, timeoutMs) {
  return new Promise((res) => {
    const start = Date.now();
    const child = execFile('node', [
      '--experimental-vm-modules',
      workerScript, filePath, String(timeoutMs),
    ], {
      timeout: timeoutMs * 2 + 10000,
      killSignal: 'SIGKILL',
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    }, (err, stdout, stderr) => {
      const elapsed = Date.now() - start;
      // Find __RESULT__ tagged line in stderr
      const resultLine = (stderr || '').split('\n').find(l => l.startsWith('__RESULT__'));
      if (resultLine) {
        try {
          const result = JSON.parse(resultLine.slice('__RESULT__'.length));
          result.loadTime = elapsed;
          res(result);
          return;
        } catch {}
      }
      {
        const errMsg = (stderr || err?.message || stdout || 'unknown').substring(0, 300);
        res({
          file: filePath.split('/').pop(),
          status: err?.killed ? 'timeout' : 'crash',
          loadTime: elapsed,
          error: errMsg,
        });
      }
    });
  });
}

const results = [];

for (const file of files) {
  const filePath = resolve(dirPath, file);
  const result = await testNotebook(filePath, timeout);
  results.push(result);

  if (!json) {
    const icon = result.status === 'tests-passed' ? '✓' :
                 result.status === 'no-tests' ? '○' :
                 result.status === 'loaded' ? '○' :
                 '✗';
    const testInfo = result.testResults
      ? ` (${result.testResults.passed}/${result.testResults.total} pass)`
      : '';
    const errInfo = result.error && !result.failedTests ? ` — ${result.error.substring(0, 120)}` : '';
    const failInfo = result.failedTests
      ? '\n    ' + result.failedTests.map(t => `${t.name}: ${t.error || 'failed'}`).join('\n    ')
      : '';
    process.stderr.write(`${icon} ${result.file} [${result.status}] ${(result.loadTime / 1000).toFixed(1)}s${testInfo}${errInfo}${failInfo}\n`);
  }
}

const summary = {
  total: results.length,
  testsPassed: results.filter(r => r.status === 'tests-passed').length,
  testsFailed: results.filter(r => r.status === 'tests-failed').length,
  noTests: results.filter(r => r.status === 'no-tests' || r.status === 'loaded').length,
  crashed: results.filter(r => r.status === 'crash' || r.status === 'timeout').length,
  testError: results.filter(r => r.status === 'test-error').length,
};

if (json) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  console.error(`\n=== Summary ===`);
  console.error(`Total: ${summary.total}`);
  console.error(`Tests passed: ${summary.testsPassed}`);
  console.error(`Tests failed: ${summary.testsFailed}`);
  console.error(`No tests: ${summary.noTests}`);
  console.error(`Crashed/timeout: ${summary.crashed}`);
  console.error(`Test errors: ${summary.testError}`);
}
