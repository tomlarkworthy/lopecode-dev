#!/usr/bin/env node
/**
 * lope-jumpgate.js - Automate jumpgate module exports via Playwright
 *
 * Takes an Observable notebook source, runs it through jumpgate, and saves
 * the exported lopecode HTML file.
 *
 * Usage:
 *   node tools/lope-jumpgate.js --source @tomlarkworthy/exporter-2 --output path/to/output.html
 *
 * Options:
 *   --source <name>      Observable notebook shorthand (required)
 *   --frame <name>       Frame notebook shorthand (default: @tomlarkworthy/lopepage)
 *   --jumpgate <path>    Path to jumpgate HTML (default: lopecode/notebooks/@tomlarkworthy_jumpgate.html)
 *   --output <path>      Where to write the exported HTML (required)
 *   --hash <hash>        Hash for bootconf (default: read from existing spec, or side-panel layout)
 *   --timeout <ms>       Max wait for export (default: 120000)
 *   --headed             Show browser for debugging
 *   --verbose            Show browser console logs
 *
 * Exit Codes:
 *   0 - Success
 *   1 - Export failed
 */

import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// --- Arg parsing ---

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    source: null,
    frame: '@tomlarkworthy/lopepage',
    jumpgate: 'lopecode/notebooks/@tomlarkworthy_jumpgate.html',
    output: null,
    hash: null,
    timeout: 120000,
    headed: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--source' && args[i + 1]) {
      options.source = args[++i];
    } else if (arg === '--frame' && args[i + 1]) {
      options.frame = args[++i];
    } else if (arg === '--jumpgate' && args[i + 1]) {
      options.jumpgate = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === '--hash' && args[i + 1]) {
      options.hash = args[++i];
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === '--headed') {
      options.headed = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
lope-jumpgate.js - Automate jumpgate module exports

Usage:
  node tools/lope-jumpgate.js --source <name> --output <path> [options]

Options:
  --source <name>      Observable notebook shorthand, e.g. @tomlarkworthy/exporter-2 (required)
  --frame <name>       Frame notebook shorthand (default: @tomlarkworthy/lopepage)
  --jumpgate <path>    Path to jumpgate HTML (default: lopecode/notebooks/@tomlarkworthy_jumpgate.html)
  --output <path>      Where to write the exported HTML (required)
  --hash <hash>        Hash for bootconf (default: read from existing spec, or side-panel layout)
  --timeout <ms>       Max wait for export (default: 120000)
  --headed             Show browser for debugging
  --verbose            Show browser console logs
      `);
      process.exit(0);
    }
  }

  return options;
}

// --- Helpers ---

function toFullUrl(shorthand) {
  if (shorthand.startsWith('http://') || shorthand.startsWith('https://')) {
    return shorthand;
  }
  return `https://observablehq.com/${shorthand}`;
}

function toNotebookName(shorthand) {
  return shorthand.replace('https://observablehq.com/', '');
}

function log(msg) {
  process.stderr.write(`[lope-jumpgate] ${msg}\n`);
}

// --- Main ---

async function main() {
  const options = parseArgs(process.argv);

  if (!options.source) {
    console.error('Error: --source is required');
    process.exit(1);
  }
  if (!options.output) {
    console.error('Error: --output is required');
    process.exit(1);
  }

  const jumpgatePath = path.resolve(options.jumpgate);
  if (!fs.existsSync(jumpgatePath)) {
    console.error(`Error: Jumpgate notebook not found: ${jumpgatePath}`);
    process.exit(1);
  }

  // Ensure output directory exists
  const outputPath = path.resolve(options.output);
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sourceUrl = toFullUrl(options.source);
  const frameUrl = toFullUrl(options.frame);
  const sourceNotebook = toNotebookName(options.source);

  // Resolve hash: --hash flag > existing spec > default side-panel layout
  let hash = options.hash;
  if (!hash) {
    const specPath = outputPath.replace(/\.html$/, '.json');
    if (fs.existsSync(specPath)) {
      try {
        const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
        if (spec.bootconf?.hash) {
          hash = spec.bootconf.hash;
          log(`Using hash from existing spec: ${hash}`);
        }
      } catch (e) {
        log(`Warning: failed to read existing spec: ${e.message}`);
      }
    }
  }
  if (!hash) {
    hash = `#view=${encodeURI(
      `R100(S70(${sourceNotebook}),S30(@tomlarkworthy/module-selection))`
    )}`;
  }

  // Build export_state JSON
  const exportState = JSON.stringify({
    title: sourceNotebook,
    hash,
  });

  log(`Source: ${sourceUrl}`);
  log(`Frame: ${frameUrl}`);
  log(`Jumpgate: ${jumpgatePath}`);
  log(`Output: ${outputPath}`);

  // Launch browser
  const browser = await chromium.launch({
    headless: !options.headed,
    args: ['--disable-web-security'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  if (options.verbose) {
    page.on('console', msg => {
      process.stderr.write(`[browser ${msg.type()}] ${msg.text()}\n`);
    });
  }

  page.on('pageerror', err => {
    process.stderr.write(`[browser error] ${err.message}\n`);
  });

  try {
    // Pre-set localStorage for frame (localStorageView reads from localStorage)
    // and override urlQueryFieldView via window.rEPseDFzXFSPYkNz
    const queryParams = new URLSearchParams({
      source: sourceUrl,
      load_source: 'true',
      export_state: exportState,
    });
    const queryString = '?' + queryParams.toString();

    await page.addInitScript((params) => {
      // Override for urlQueryFieldView — it reads window.rEPseDFzXFSPYkNz || location.search
      window.rEPseDFzXFSPYkNz = params.queryString;
      // Pre-set frame in localStorage for localStorageView
      localStorage.setItem('frame', params.frameUrl);
    }, { queryString, frameUrl });

    // Navigate to jumpgate
    const fileUrl = `file://${jumpgatePath}${queryString}`;
    log(`Navigating to: ${fileUrl}`);

    await page.goto(fileUrl, {
      timeout: options.timeout,
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);

    // Wait for Observable runtime
    log('Waiting for runtime...');
    await page.waitForFunction(() => window.__ojs_runtime, { timeout: 30000 });
    log('Runtime initialized');

    // Wait a moment for cells to start resolving
    await page.waitForTimeout(3000);

    // Force all variables reachable (jumpgate cells are lazy in headless mode)
    log('Forcing all variables reachable...');
    await page.evaluate(() => {
      const runtime = window.__ojs_runtime;
      const allModules = [runtime];
      if (runtime.mains) {
        for (const mod of runtime.mains.values()) {
          allModules.push(mod);
        }
      }
      for (const mod of allModules) {
        if (!mod._variables) continue;
        for (const v of mod._variables) {
          v._reachable = true;
          runtime._dirty.add(v);
        }
      }
      runtime._computeNow();
    });

    // Poll for the exported variable to settle
    log('Waiting for export to complete...');
    const startTime = Date.now();
    let lastOutput = '';

    while (Date.now() - startTime < options.timeout) {
      const status = await page.evaluate(() => {
        const runtime = window.__ojs_runtime;
        let exportedVar = null;
        let outputVar = null;

        // Scan all modules (mains map + bootloader) for the exported variable
        const allModules = [runtime];
        if (runtime.mains) {
          for (const mod of runtime.mains.values()) {
            allModules.push(mod);
          }
        }

        for (const mod of allModules) {
          if (!mod._variables) continue;
          for (const v of mod._variables) {
            if (v._name === 'exported') exportedVar = v;
            if (v._name === 'output') outputVar = v;
          }
        }

        const result = { exported: null, output: null, error: null };

        if (exportedVar) {
          if (exportedVar._value !== undefined && !(exportedVar._value instanceof Error)) {
            result.exported = {
              hasSource: !!(exportedVar._value && exportedVar._value.source),
              sourceLength: exportedVar._value?.source?.length || 0,
              reportLength: exportedVar._value?.report?.length || 0,
            };
          }
          if (exportedVar._error) {
            result.error = String(exportedVar._error);
          }
        }

        if (outputVar && outputVar._value !== undefined) {
          result.output = String(outputVar._value).slice(0, 200);
        }

        return result;
      });

      if (status.error) {
        // Check if it's a transient "skipped" error from load_source being false initially
        if (status.error.includes('skipped') || status.error.includes('load_source')) {
          // Still waiting for load_source to propagate
          if (options.verbose) log(`Waiting... (${status.error})`);
        } else {
          log(`Export error: ${status.error}`);
          await browser.close();
          process.exit(1);
        }
      }

      if (status.output && status.output !== lastOutput) {
        lastOutput = status.output;
        log(`Progress: ${status.output}`);
      }

      if (status.exported && status.exported.hasSource) {
        log(`Export complete! Source: ${(status.exported.sourceLength / 1024 / 1024).toFixed(1)} MB, Report entries: ${status.exported.reportLength}`);
        break;
      }

      await page.waitForTimeout(2000);
    }

    // Check if we timed out
    const finalCheck = await page.evaluate(() => {
      const runtime = window.__ojs_runtime;
      const allModules = [runtime];
      if (runtime.mains) {
        for (const mod of runtime.mains.values()) {
          allModules.push(mod);
        }
      }
      for (const mod of allModules) {
        if (!mod._variables) continue;
        for (const v of mod._variables) {
          if (v._name === 'exported') {
            if (v._value && v._value.source) return { ready: true };
            if (v._error) return { ready: false, error: String(v._error) };
          }
        }
      }
      return { ready: false, error: 'exported variable not found' };
    });

    if (!finalCheck.ready) {
      log(`Export failed: ${finalCheck.error || 'timeout'}`);
      await browser.close();
      process.exit(1);
    }

    // Click download button and capture the file
    log('Downloading exported file...');
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.click('button:has-text("download")', { timeout: 10000 }),
    ]);

    await download.saveAs(outputPath);

    const fileSize = fs.statSync(outputPath).size;
    log(`Saved: ${outputPath} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

    // Generate .json spec alongside the HTML
    const jsonPath = outputPath.replace(/\.html$/, '.json');
    try {
      const spec = execFileSync('bun', ['tools/lope-reader.ts', outputPath], {
        encoding: 'utf-8',
        timeout: 30000,
      });
      fs.writeFileSync(jsonPath, spec);
      log(`Spec: ${jsonPath}`);
    } catch (e) {
      log(`Warning: failed to generate spec: ${e.message}`);
    }

  } catch (error) {
    log(`Error: ${error.message}`);
    if (options.verbose) {
      process.stderr.write(error.stack + '\n');
    }
    await browser.close();
    process.exit(1);
  }

  await browser.close();
  log('Done');
  process.exit(0);
}

main();
