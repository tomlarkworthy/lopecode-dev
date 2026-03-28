#!/usr/bin/env node
/**
 * bulk-browser-validate.js - Open each notebook in a real browser and check for cell errors
 *
 * Unlike the Node.js smoke test, this validates in a real browser environment.
 * Checks for Observable runtime cell errors after page load.
 *
 * Usage:
 *   node tools/bulk-browser-validate.js <dir> [--timeout <ms>] [--json] [--settle <ms>]
 *
 * Output: JSONL to stdout, progress to stderr
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
let dir = null;
let timeout = 30000;
let settleTime = 8000;
let jsonMode = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--timeout' && args[i + 1]) timeout = parseInt(args[++i], 10);
  else if (args[i] === '--settle' && args[i + 1]) settleTime = parseInt(args[++i], 10);
  else if (args[i] === '--json') jsonMode = true;
  else if (!args[i].startsWith('-')) dir = args[i];
}

if (!dir) {
  console.error('Usage: node tools/bulk-browser-validate.js <dir> [--timeout <ms>] [--settle <ms>] [--json]');
  process.exit(2);
}

const dirPath = path.resolve(dir);
const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html')).sort();

// Known errors that are expected/acceptable (not notebook bugs)
const KNOWN_ERROR_PATTERNS = [
  // External service dependencies (expected to fail offline/without config)
  /Failed to fetch/i,
  /NetworkError/i,
  /net::ERR_/i,
  /Load failed/i,
  /firebaseConfig is not defined/i,
  /firebase.*not.*initialized/i,
  // Auth/login required
  /not authenticated/i,
  /firebase.*auth/i,
  /permission.denied/i,
  // Browser API limitations in headless
  /getUserMedia/i,
  /NotAllowedError/i,
  /Notification.*denied/i,
  // Known Observable platform issues
  /observablehq\.com.*api/i,
  /Unable to resolve specifier.*<unknown/i,
];

function isKnownError(errorMsg) {
  return KNOWN_ERROR_PATTERNS.some(p => p.test(errorMsg || ''));
}

async function validateNotebook(browser, filePath, timeoutMs, settleMs) {
  const file = path.basename(filePath);
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text().substring(0, 200));
    }
  });

  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', err => {
    pageErrors.push((err.message || String(err)).substring(0, 200));
  });

  try {
    const fileUrl = 'file://' + filePath;
    await page.goto(fileUrl, { timeout: timeoutMs, waitUntil: 'domcontentloaded' });

    // Wait for settle
    await page.waitForTimeout(settleMs);

    // Check for runtime cell errors
    const errorInfo = await page.evaluate(() => {
      const runtime = window.__ojs_runtime;
      if (!runtime) return { hasRuntime: false, errors: [], totalVars: 0 };

      const errors = [];
      let totalVars = 0;
      let errorCount = 0;

      for (const v of runtime._variables) {
        totalVars++;
        if (v._error !== undefined) {
          errorCount++;
          const name = v._name || '(anonymous)';
          // Try to get module name
          let moduleName = '(unknown)';
          try {
            for (const [mname, mod] of (runtime._modules || new Map())) {
              if (typeof mname === 'string' && mod._scope && mod._scope.has(v._name)) {
                moduleName = mname;
                break;
              }
            }
          } catch {}

          errors.push({
            name,
            module: moduleName,
            error: (v._error?.message || String(v._error)).substring(0, 300)
          });
        }
      }

      return { hasRuntime: true, totalVars, errorCount, errors };
    });

    // Check for visible Observable cell errors in DOM
    const cellErrors = await page.evaluate(() => {
      const errorEls = document.querySelectorAll('.observablehq--error');
      const errors = [];
      for (const el of errorEls) {
        const text = (el.textContent || '').trim();
        if (text) {
          // Extract cell name and error message
          const match = text.match(/^(\w[\w\s]*=\s*)?(.+)/s);
          errors.push({
            cellName: match?.[1]?.replace(/\s*=\s*$/, '') || '(anonymous)',
            error: (match?.[2] || text).substring(0, 300),
            visible: el.offsetHeight > 0 || el.offsetParent !== null,
          });
        }
      }
      return errors;
    });

    // Categorize cell errors
    const unexpectedCellErrors = cellErrors.filter(e => !isKnownError(e.error));
    const knownCellErrors = cellErrors.filter(e => isKnownError(e.error));

    // Also categorize runtime-level errors
    const unexpectedRuntimeErrors = (errorInfo.errors || []).filter(e => !isKnownError(e.error));

    // Combine: cell errors are the primary signal (visible in DOM)
    const allUnexpected = unexpectedCellErrors.length + unexpectedRuntimeErrors.length;

    await context.close();

    return {
      file,
      status: allUnexpected === 0 ? 'ok' : 'errors',
      hasRuntime: errorInfo.hasRuntime,
      totalVars: errorInfo.totalVars,
      cellErrors: unexpectedCellErrors.length,
      knownCellErrors: knownCellErrors.length,
      runtimeErrors: unexpectedRuntimeErrors.length,
      errors: unexpectedCellErrors.slice(0, 15),
      pageErrors: pageErrors.slice(0, 5),
      consoleErrors: consoleErrors.filter(e => !isKnownError(e)).slice(0, 5),
    };
  } catch (err) {
    await context.close();
    return {
      file,
      status: 'crash',
      error: (err.message || String(err)).substring(0, 300)
    };
  }
}

// Main
const browser = await chromium.launch({ headless: true });
const total = files.length;
let count = 0;
const results = [];

for (const file of files) {
  count++;
  const filePath = path.resolve(dirPath, file);
  const result = await validateNotebook(browser, filePath, timeout, settleTime);
  results.push(result);

  // Output JSONL
  console.log(JSON.stringify(result));

  // Progress to stderr
  const icon = result.status === 'ok' ? '✓' :
               result.status === 'errors' ? '✗' :
               '!';
  const errCount = (result.cellErrors || 0) + (result.runtimeErrors || 0);
  const errInfo = errCount > 0 ? ` (${errCount} cell errors)` : '';
  const detail = result.errors?.length > 0
    ? '\n    ' + result.errors.slice(0, 3).map(e => `${e.cellName}: ${e.error.substring(0, 120)}`).join('\n    ')
    : '';
  process.stderr.write(`[${count}/${total}] ${icon} ${file} [${result.status}]${errInfo}${detail}\n`);
}

await browser.close();

// Summary
const summary = {
  total: results.length,
  ok: results.filter(r => r.status === 'ok').length,
  errors: results.filter(r => r.status === 'errors').length,
  crashed: results.filter(r => r.status === 'crash').length,
};
process.stderr.write(`\n=== Summary ===\n`);
process.stderr.write(`Total: ${summary.total}\n`);
process.stderr.write(`OK (no unexpected errors): ${summary.ok}\n`);
process.stderr.write(`Has unexpected errors: ${summary.errors}\n`);
process.stderr.write(`Crashed: ${summary.crashed}\n`);
