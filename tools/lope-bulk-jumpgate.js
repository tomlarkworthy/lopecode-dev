#!/usr/bin/env node
/**
 * lope-bulk-jumpgate.js - Bulk export Observable notebooks via bulk-jumpgate
 *
 * Drives the bulk-jumpgate notebook headlessly via Playwright. Shims
 * directoryHandle and save_file so exports land as browser downloads
 * captured to the output directory. Everything else runs untouched.
 *
 * Usage:
 *   node tools/lope-bulk-jumpgate.js --spec <path|json> --output <dir> [options]
 *
 * Options:
 *   --spec <path|json>   Export spec: path to JSON file, or inline JSON string (required)
 *   --output <dir>       Output directory for exported HTML files (required)
 *   --notebook <path>    Path to bulk-jumpgate HTML (default: lopecode/notebooks/@tomlarkworthy_bulk-jumpgate.html)
 *   --timeout <ms>       Max wait for entire export (default: 600000 = 10 min)
 *   --headed             Show browser window
 *   --verbose            Show browser console logs
 *
 * Spec format:
 *   {
 *     "additionalMains": ["@tomlarkworthy/lopepage"],
 *     "notebooks": [
 *       { "name": "@tomlarkworthy/lopecode-tour" },
 *       { "name": "@tomlarkworthy/exporter" }
 *     ]
 *   }
 *
 * Examples:
 *   # Export from a spec file
 *   node tools/lope-bulk-jumpgate.js --spec export_spec.json --output ./exported
 *
 *   # Inline spec for a single notebook
 *   node tools/lope-bulk-jumpgate.js --output ./exported \
 *     --spec '{"additionalMains":["@tomlarkworthy/lopepage"],"notebooks":[{"name":"@tomlarkworthy/lopecode-tour"}]}'
 *
 * Exit codes:
 *   0 - All notebooks exported successfully
 *   1 - One or more exports failed
 *   2 - Setup error (bad args, notebook not found, etc.)
 */

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// --- Arg parsing ---

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    spec: null,
    output: null,
    notebook: resolve(projectRoot, 'lopecode/notebooks/@tomlarkworthy_bulk-jumpgate.html'),
    timeout: 600000,
    headed: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--spec' && args[i + 1]) {
      options.spec = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === '--notebook' && args[i + 1]) {
      options.notebook = args[++i];
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === '--headed') {
      options.headed = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
lope-bulk-jumpgate.js - Bulk export Observable notebooks

Usage:
  node tools/lope-bulk-jumpgate.js --spec <path|json> --output <dir> [options]

Options:
  --spec <path|json>   Export spec JSON file or inline JSON (required)
  --output <dir>       Output directory (required)
  --notebook <path>    Bulk-jumpgate notebook path (default: lopecode/notebooks/@tomlarkworthy_bulk-jumpgate.html)
  --timeout <ms>       Max wait time (default: 600000)
  --headed             Show browser
  --verbose            Show browser console
      `);
      process.exit(0);
    }
  }

  return options;
}

function loadSpec(specArg) {
  // Try as file path first, then as inline JSON
  const specPath = resolve(specArg);
  if (fs.existsSync(specPath)) {
    return JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  }
  try {
    return JSON.parse(specArg);
  } catch {
    console.error(`Error: --spec is not a valid JSON file or JSON string: ${specArg}`);
    process.exit(2);
  }
}

function log(msg) {
  process.stderr.write(`[lope-bulk-jumpgate] ${msg}\n`);
}

// --- Main ---

const options = parseArgs(process.argv);

if (!options.spec) {
  console.error('Error: --spec is required');
  process.exit(2);
}
if (!options.output) {
  console.error('Error: --output is required');
  process.exit(2);
}

const spec = loadSpec(options.spec);
const notebookPath = resolve(options.notebook);
const outputDir = resolve(options.output);

if (!fs.existsSync(notebookPath)) {
  console.error(`Error: Notebook not found: ${notebookPath}`);
  process.exit(2);
}

fs.mkdirSync(outputDir, { recursive: true });

log(`Spec: ${spec.notebooks.length} notebook(s), additionalMains: ${spec.additionalMains?.join(', ') || 'none'}`);
log(`Output: ${outputDir}`);

const browser = await chromium.launch({ headless: !options.headed });
const context = await browser.newContext();
const page = await context.newPage();

if (options.verbose) {
  page.on('console', msg => process.stderr.write(`[browser ${msg.type()}] ${msg.text()}\n`));
}
page.on('pageerror', err => process.stderr.write(`[browser error] ${err.message}\n`));

// Capture downloads → output dir
const downloadedFiles = [];
const downloadPromises = [];
page.on('download', async (download) => {
  const filename = download.suggestedFilename();
  const savePath = resolve(outputDir, filename);
  const p = download.saveAs(savePath).then(() => {
    const size = fs.statSync(savePath).size;
    log(`Downloaded: ${filename} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    downloadedFiles.push(filename);
  }).catch(err => {
    log(`Download error for ${filename}: ${err.message}`);
  });
  downloadPromises.push(p);
});

// Load notebook
const fileUrl = `file://${notebookPath}#view=S100(@tomlarkworthy/bulk-jumpgate)`;
log('Loading notebook...');
await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForFunction(() => window.__ojs_runtime, { timeout: 30000 });
log('Runtime ready');

// Shim directoryHandle + save_file for headless download-based saving
await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  for (const v of rt._variables) {
    if (v._name === 'directoryHandle' && v._module) {
      const mod = v._module;

      mod.redefine('directoryHandle', [], () => ({
        getFileHandle() { throw new DOMException('', 'NotFoundError'); }
      }));

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

// Wait for shims to propagate
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
}, JSON.stringify(spec, null, 2));

// Wait for main_defines (imports additionalMains from Observable API)
log('Waiting for pipeline...');
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
const start = Date.now();
let hadError = false;
while (Date.now() - start < options.timeout) {
  const logText = await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    for (const v of rt._variables) {
      if (v._name === 'viewof log' && v._value) return v._value.value || '';
    }
    return '';
  });

  if (logText) {
    const lines = logText.split('\n').filter(Boolean);
    log(lines.slice(-1)[0]);
  }

  if (logText.includes('Error exporting')) {
    hadError = true;
  }

  if (logText.includes('Export complete.')) {
    break;
  }

  await page.waitForTimeout(3000);
}

// Check for timeout
if (Date.now() - start >= options.timeout) {
  log('ERROR: Export timed out');
  await browser.close();
  process.exit(1);
}

// Wait for all downloads to finish
if (downloadPromises.length > 0) {
  log(`Waiting for ${downloadPromises.length} download(s)...`);
  await Promise.all(downloadPromises);
}

// Summary
const htmlFiles = downloadedFiles.filter(f => f.endsWith('.html'));
log(`\nExported ${htmlFiles.length}/${spec.notebooks.length} notebook(s):`);
for (const f of htmlFiles) {
  const stat = fs.statSync(resolve(outputDir, f));
  log(`  ${f} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
}

await browser.close();

if (hadError || htmlFiles.length < spec.notebooks.length) {
  log('Some exports failed');
  process.exit(1);
}

log('Done');
process.exit(0);
