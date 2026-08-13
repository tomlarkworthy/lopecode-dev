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
 *   --source <name>      Observable notebook shorthand (default: from the existing spec's bootconf mains)
 *   --frame <name>       Frame notebook shorthand (default: from the existing spec's bootconf mains,
 *                        else @tomlarkworthy/lopepage)
 *   --jumpgate <path>    Path to jumpgate HTML (default: lopecode/notebooks/jumpgates.html)
 *   --output <path>      Where to write the exported HTML (required)
 *   --hash <hash>        Hash for bootconf (default: read from the existing spec, or side-panel layout)
 *   --theme <name>       Theme name, e.g. near-midnight, midnight, parchment (default: from spec)
 *   --no-carry-mains     Don't derive frame/sources from the existing spec's bootconf mains
 *   --dry-run            Print the resolved frame/sources/mains as JSON and exit
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
    jumpgate: 'lopecode/notebooks/jumpgates.html',
    output: null,
    hash: null,
    theme: null,
    timeout: 120000,
    headed: false,
    verbose: false,
    carryMains: true,
    frameExplicit: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--source' && args[i + 1]) {
      const next = args[++i];
      options.source = options.source ? `${options.source},${next}` : next;
    } else if (arg === '--frame' && args[i + 1]) {
      options.frame = args[++i];
      options.frameExplicit = true;
    } else if (arg === '--no-carry-mains') {
      options.carryMains = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--jumpgate' && args[i + 1]) {
      options.jumpgate = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === '--hash' && args[i + 1]) {
      options.hash = args[++i];
    } else if (arg === '--theme' && args[i + 1]) {
      options.theme = args[++i];
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
  --source <name>      Observable notebook shorthand, e.g. @tomlarkworthy/exporter-2.
                       Repeat --source or comma-separate to embed multiple primaries
                       in one bundle (--source @a/b --source @a/c, or --source @a/b,@a/c).
                       The first source is the primary (used for filename, title, default hash).
                       Optional when --output names a notebook with an existing .json
                       spec: the remaining sources are then read from its bootconf mains.
  --frame <name>       Frame notebook shorthand (default: the lopepage variant recorded in
                       the spec's bootconf mains, else @tomlarkworthy/lopepage)
  --jumpgate <path>    Path to jumpgate HTML (default: lopecode/notebooks/jumpgates.html)
  --output <path>      Where to write the exported HTML (required)
  --hash <hash>        Hash for bootconf (default: read from the existing spec, or side-panel layout)
  --theme <name>       Theme name, e.g. near-midnight, midnight, parchment (default: from spec or none)
  --no-carry-mains     Don't derive frame/sources from the spec's bootconf mains. Use when
                       deliberately narrowing what a notebook boots, or to export one
                       source at a time when a multi-source run hits Observable's rate limit.
  --dry-run            Print the resolved frame/sources/mains as JSON and exit
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

function readSpec(specPath) {
  if (!fs.existsSync(specPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  } catch (e) {
    log(`Warning: failed to read existing spec: ${e.message}`);
    return null;
  }
}

// Which main is the frame. lopepage/lopepage-2 are the only frames in the corpus.
function isFrameModule(name) {
  return /(^|\/)lopepage(-\d+)?$/.test(name);
}

async function fetchObservableMetadata(observableUrl) {
  const prefix = 'https://observablehq.com/';
  if (!observableUrl.startsWith(prefix)) return null;
  const apiUrl = 'https://api.observablehq.com/document/' + observableUrl.slice(prefix.length);
  const res = await fetch(apiUrl, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${apiUrl}`);
  const body = await res.json();
  return {
    observable_version: typeof body.version === 'number' ? body.version : null,
    observable_update_time: body.update_time ?? null,
  };
}

// --- Main ---

async function main() {
  const options = parseArgs(process.argv);

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

  // What the notebook currently boots. The sidecar's bootconf is kept in step with the
  // HTML by the spec-sync pre-commit hook (`bun tools/lope-sync.ts spec-sync`).
  const specPath = outputPath.replace(/\.html$/, '.json');
  const spec = readSpec(specPath);
  const priorBootconf = spec?.bootconf ?? null;
  if (priorBootconf) {
    log(`Prior bootconf: mains=${JSON.stringify(priorBootconf.mains ?? null)}`);
  }

  // Frame + sources: --flag > prior bootconf mains > defaults. An explicit --source stays
  // primary (it drives title and the default hash); recorded mains are appended after it.
  const sources = (options.source ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const priorMains = options.carryMains && Array.isArray(priorBootconf?.mains)
    ? priorBootconf.mains
    : [];
  if (priorMains.length && !options.frameExplicit) {
    const frames = priorMains.filter(isFrameModule);
    if (frames.length === 1) {
      options.frame = frames[0];
      log(`Using frame from prior bootconf: ${options.frame}`);
    } else if (frames.length > 1) {
      log(`Warning: prior bootconf records ${frames.length} frames (${frames.join(', ')}); keeping --frame ${options.frame}`);
    }
  }
  const frameName = toNotebookName(toFullUrl(options.frame));
  if (priorMains.length) {
    // Frames are never carried as sources — an explicit --frame swaps the recorded one out.
    const carried = priorMains.filter(
      name => !isFrameModule(name) && !sources.some(s => toNotebookName(toFullUrl(s)) === name)
    );
    if (carried.length) {
      sources.push(...carried);
      log(`Carrying ${carried.length} main(s) from prior bootconf: ${carried.join(', ')}`);
    }
  }
  if (sources.length === 0) {
    console.error('Error: --source is required (no spec bootconf mains to derive it from)');
    process.exit(1);
  }
  const sourceUrls = sources.map(toFullUrl);
  const sourceNotebooks = sources.map(toNotebookName);
  const primarySourceUrl = sourceUrls[0];
  const primaryNotebook = sourceNotebooks[0];
  const frameUrl = toFullUrl(options.frame);

  // Resolve hash and theme: --flag > prior bootconf > defaults.
  let hash = options.hash;
  let theme = options.theme;
  if (!hash && priorBootconf?.hash) {
    hash = priorBootconf.hash;
    log(`Using hash from prior bootconf: ${hash}`);
  }
  if (!theme && priorBootconf?.theme) {
    theme = priorBootconf.theme;
    log(`Using theme from prior bootconf: ${theme}`);
  }
  if (!hash) {
    hash = `#view=${encodeURI(
      `R100(S70(${primaryNotebook}),S30(@tomlarkworthy/module-selection))`
    )}`;
  }

  // Build export_state JSON — title/filename always tracks the primary
  // prerender: the headless jumpgate runtime has no rendered DOM to snapshot, so this
  // only sets the bootconf flag — the first in-browser re-export bakes the snapshot.
  const exportState = JSON.stringify({
    title: primaryNotebook,
    hash,
    prerender: true,
    ...(theme ? { theme } : {}),
  });

  log(`Source${sources.length > 1 ? `s (${sources.length})` : ''}: ${sourceUrls.join(', ')}`);
  log(`Frame: ${frameUrl}`);
  log(`Jumpgate: ${jumpgatePath}`);
  log(`Output: ${outputPath}`);

  if (options.dryRun) {
    // The mains the export would declare, in the order the jumpgate builds them.
    // Deduped because the jumpgate keys them into a Map.
    process.stdout.write(JSON.stringify({
      frame: frameName,
      sources: sourceNotebooks,
      mains: [...new Set([frameName, ...sourceNotebooks])],
      hash,
      theme: theme ?? null,
    }, null, 2) + '\n');
    process.exit(0);
  }

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
      source: sourceUrls.join(','),
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

    if (theme) {
      log(`Theme: ${theme} (via export_state)`);
    }

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

    // Read exported source directly from the runtime — avoids brittle button
    // locators that match multiple panels in lopepage layouts.
    log('Reading exported source from runtime...');
    const exportedSource = await page.evaluate(() => {
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
          if (v._name === 'exported' && v._value && v._value.source) {
            return v._value.source;
          }
        }
      }
      return null;
    });

    if (!exportedSource) {
      throw new Error('Could not read exported.source from runtime');
    }

    fs.writeFileSync(outputPath, exportedSource);

    const fileSize = fs.statSync(outputPath).size;
    log(`Saved: ${outputPath} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

    // Generate .json spec alongside the HTML
    const jsonPath = outputPath.replace(/\.html$/, '.json');
    try {
      const specStr = execFileSync('bun', ['tools/lope-reader.ts', outputPath, '--compute-imports'], {
        encoding: 'utf-8',
        timeout: 60000,
        maxBuffer: 100 * 1024 * 1024,
      });
      const specObj = JSON.parse(specStr);
      // upstreams: { host -> { module -> url } } — multi-source friendly schema
      // replacing the single-string `observablehq.com` field.
      specObj.upstreams = {
        "observablehq.com": Object.fromEntries(
          sourceNotebooks.map((module, i) => [module, sourceUrls[i]]),
        ),
      };
      if (theme && specObj.bootconf) {
        specObj.bootconf.theme = theme;
      }
      try {
        const meta = await fetchObservableMetadata(primarySourceUrl);
        if (meta) {
          if (meta.observable_version != null) specObj.observable_version = meta.observable_version;
          if (meta.observable_update_time) specObj.observable_update_time = meta.observable_update_time;
          log(`Observable v${meta.observable_version} @ ${meta.observable_update_time}`);
        }
      } catch (e) {
        log(`Warning: failed to fetch Observable metadata: ${e.message}`);
      }
      fs.writeFileSync(jsonPath, JSON.stringify(specObj, null, 2) + '\n');
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
