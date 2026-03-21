#!/usr/bin/env node
/**
 * bulk-jumpgate-test.js - Drive the bulk-jumpgate notebook's export pipeline
 *
 * Redefines directoryHandle (skip native picker) and save_file (trigger
 * browser downloads). Playwright captures each download to the output dir.
 * Everything else — flowQueue, exportToHTML, runtime lifecycle — runs untouched.
 *
 * Usage:
 *   node tools/bulk-jumpgate-test.js [--output-dir <path>] [--verbose]
 */

import { chromium } from 'playwright';
import { resolve } from 'path';
import fs from 'fs';

const notebookPath = resolve('lopecode/notebooks/@tomlarkworthy_bulk-jumpgate.html');
const verbose = process.argv.includes('--verbose');

// Parse --output-dir
let outputDir = resolve('tools/tmp-export');
const odIdx = process.argv.indexOf('--output-dir');
if (odIdx !== -1 && process.argv[odIdx + 1]) {
  outputDir = resolve(process.argv[odIdx + 1]);
}

const testSpec = {
  additionalMains: ['@tomlarkworthy/lopepage'],
  notebooks: [
    { name: '@tomlarkworthy/lopecode-tour' }
  ]
};

fs.mkdirSync(outputDir, { recursive: true });

const log = (msg) => process.stderr.write(`[bulk-jumpgate] ${msg}\n`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

if (verbose) {
  page.on('console', msg => process.stderr.write(`[browser ${msg.type()}] ${msg.text()}\n`));
}
page.on('pageerror', err => process.stderr.write(`[browser error] ${err.message}\n`));

// Capture downloads → output dir
const downloadPromises = [];
page.on('download', async (download) => {
  const filename = download.suggestedFilename();
  const savePath = resolve(outputDir, filename);
  const p = download.saveAs(savePath).then(() => {
    const size = fs.statSync(savePath).size;
    log(`Downloaded: ${filename} (${(size / 1024 / 1024).toFixed(2)} MB)`);
  }).catch(err => {
    log(`Download error for ${filename}: ${err.message}`);
  });
  downloadPromises.push(p);
});

// Load notebook
const fileUrl = `file://${notebookPath}#view=S100(@tomlarkworthy/bulk-jumpgate)`;
log(`Loading notebook...`);
await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForFunction(() => window.__ojs_runtime, { timeout: 30000 });
log('Runtime ready');

// Shim directoryHandle, save_file, and increase exportTask timeout
log('Shimming for headless operation...');
await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  for (const v of rt._variables) {
    if (v._name === 'directoryHandle' && v._module) {
      const mod = v._module;

      // Dummy handle — getFileHandle throws NotFoundError so stored_spec falls back to default_spec
      mod.redefine('directoryHandle', [], () => ({
        getFileHandle() { throw new DOMException('', 'NotFoundError'); }
      }));

      // save_file → trigger browser download (Playwright captures to output dir)
      mod.redefine('save_file', [], () =>
        async (_dirHandle, filename, content) => {
          const blob = new Blob([content], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      );

      break;
    }
  }
});

// Wait for redefines to propagate
await page.waitForTimeout(3000);

// Set export spec via textarea
log('Setting export spec...');
await page.evaluate((specJson) => {
  const rt = window.__ojs_runtime;
  for (const v of rt._variables) {
    if (v._name === 'viewof export_spec_text' && v._value) {
      v._value.value = specJson;
      v._value.dispatchEvent(new Event('input'));
      break;
    }
  }
}, JSON.stringify(testSpec, null, 2));

// Wait for main_defines (imports additionalMains from Observable API)
log('Waiting for main_defines...');
await page.waitForFunction(() => {
  const rt = window.__ojs_runtime;
  for (const v of rt._variables) {
    if (v._name === 'main_defines' && v._value) return true;
  }
  return false;
}, { timeout: 60000 });
log('Pipeline ready');

// Click "Start export"
log('Starting export...');
await page.click('button:has-text("Start export")', { timeout: 10000 });

// Poll notebook's log textarea for completion
const timeout = 300000;
const start = Date.now();
while (Date.now() - start < timeout) {
  const logText = await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    for (const v of rt._variables) {
      if (v._name === 'viewof log' && v._value) return v._value.value || '';
    }
    return '';
  });

  if (logText) {
    const lines = logText.split('\n').filter(Boolean);
    log('Log: ' + lines.slice(-2).join(' | '));
  }

  if (logText.includes('Export complete.')) {
    log('Export completed!');
    break;
  }

  await page.waitForTimeout(3000);
}

// Wait for all downloads to finish
if (downloadPromises.length > 0) {
  log(`Waiting for ${downloadPromises.length} download(s)...`);
  await Promise.all(downloadPromises);
}

// List output
const files = fs.readdirSync(outputDir);
log('Output:');
for (const f of files) {
  const stat = fs.statSync(resolve(outputDir, f));
  log(`  ${f} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

await browser.close();
log('Done');
