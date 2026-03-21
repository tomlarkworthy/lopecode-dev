#!/usr/bin/env node
/**
 * Worker for bulk-smoke-test.js — tests a single notebook in isolation.
 * Outputs JSON result as LAST LINE of stderr (tagged with __RESULT__).
 */

import { loadNotebook } from './lope-runtime.js';
import { basename } from 'path';

const filePath = process.argv[2];
const timeout = parseInt(process.argv[3] || '30000', 10);
const file = basename(filePath);

function emitResult(result) {
  process.stderr.write('__RESULT__' + JSON.stringify(result) + '\n');
}

process.on('unhandledRejection', (err) => {
  emitResult({ file, status: 'crash', error: `Unhandled rejection: ${err?.message || err}`.substring(0, 300) });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  emitResult({ file, status: 'crash', error: `Uncaught exception: ${err?.message || err}`.substring(0, 300) });
  process.exit(1);
});

try {
  const execution = await loadNotebook(filePath, {
    settleTimeout: timeout,
    log: () => {},
  });

  let result = { file, status: 'loaded' };

  try {
    const raw = await execution.runTests(timeout);
    const tests = Array.isArray(raw) ? raw : (raw?.tests || []);
    result.testResults = {
      total: tests.length,
      passed: tests.filter(t => t.state === 'passed').length,
      failed: tests.filter(t => t.state === 'failed').length,
    };

    if (result.testResults.failed > 0) {
      result.status = 'tests-failed';
      result.failedTests = tests
        .filter(t => t.state === 'failed')
        .map(t => ({ name: t.name, error: (t.error || '').substring(0, 200) }));
    } else if (result.testResults.total === 0) {
      result.status = 'no-tests';
    } else {
      result.status = 'tests-passed';
    }
  } catch (testErr) {
    result.status = 'test-error';
    result.error = testErr.message?.substring(0, 300);
  }

  emitResult(result);
  execution.dispose();
  process.exit(0);
} catch (loadErr) {
  emitResult({ file, status: 'load-failed', error: loadErr.message?.substring(0, 300) });
  process.exit(1);
}
