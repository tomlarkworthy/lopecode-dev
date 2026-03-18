#!/usr/bin/env node
/**
 * lope-push-to-observablehq.js - Push local notebook cells to Observable
 *
 * Reads cells from a local lopecode HTML notebook and pushes them to an
 * Observable notebook via browser automation (clipboard paste).
 *
 * Usage:
 *   node tools/lope-push-to-observablehq.js <notebook.html> --module @tomlarkworthy/testing --target https://observablehq.com/d/ab8e6f7e97de571f
 *
 * Options:
 *   --module <name>     Module to extract cells from (required)
 *   --target <url>      Observable notebook URL to push to (required)
 *   --cells <names>     Comma-separated cell names to push (default: all)
 *                       Matches against variable group names (e.g. "viewof foo,bar,test_baz")
 *   --no-delete         Skip deleting old cells (default when --cells is used)
 *   --headed            Show browser for debugging
 *   --dry-run           List cells that would be pushed without pushing
 *   --verbose           Show browser console logs
 *   --timeout <ms>      Max wait time (default: 60000)
 *   --profile <path>    Browser profile directory for persistent login
 *
 * Exit Codes:
 *   0 - Success
 *   1 - Failure
 */

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import * as cheerio from 'cheerio';

// --- Arg parsing ---

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    notebook: null,
    module: null,
    target: null,
    cells: null,
    noDelete: false,
    login: false,
    headed: false,
    dryRun: false,
    verbose: false,
    timeout: 60000,
    profile: path.join(
      process.env.HOME,
      '.claude/lope-push-browser-profile'
    ),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--module' && args[i + 1]) {
      options.module = args[++i];
    } else if (arg === '--cells' && args[i + 1]) {
      options.cells = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    } else if (arg === '--no-delete') {
      options.noDelete = true;
    } else if (arg === '--target' && args[i + 1]) {
      options.target = args[++i];
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === '--profile' && args[i + 1]) {
      options.profile = args[++i];
    } else if (arg === '--login') {
      options.login = true;
    } else if (arg === '--headed') {
      options.headed = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
lope-push-to-observablehq.js - Push local notebook cells to Observable

Usage:
  node tools/lope-push-to-observablehq.js <notebook.html> --module <name> --target <url>

Options:
  --module <name>     Module to extract cells from (required)
  --target <url>      Observable notebook URL to push to (required)
  --cells <names>     Comma-separated cell names to push (default: all)
  --no-delete         Skip deleting old cells (default when --cells is used)
  --headed            Show browser for debugging
  --dry-run           List cells that would be pushed without pushing
  --verbose           Show browser console logs
  --timeout <ms>      Max wait time (default: 60000)
  --profile <path>    Browser profile for persistent login
      `);
      process.exit(0);
    } else if (!arg.startsWith('--') && !options.notebook) {
      options.notebook = arg;
    }
  }

  return options;
}

function log(msg) {
  process.stderr.write(`[lope-push] ${msg}\n`);
}

// --- Notebook parsing (adapted from lope-reader.js) ---

function parseNotebook(html) {
  const $ = cheerio.load(html);
  const modules = new Map();

  $('script[id]').each((_, el) => {
    const $el = $(el);
    const id = $el.attr('id');
    const content = $el.text().trim();
    if (!content) return;

    const type = $el.attr('type');
    const dataMime = $el.attr('data-mime');
    const isJsModule = dataMime === 'application/javascript' || type === 'lope-module';

    if (isJsModule || (id.startsWith('@') && !dataMime)) {
      modules.set(id, { id, content });
    }
  });

  return modules;
}

/**
 * Parse the define() section of a module to extract variable groups.
 * Groups related variables (viewof/mutable pairs) for decompilation.
 * Returns array of variable groups, each suitable for decompile().
 */
function parseVariableGroups(content) {
  const groups = [];
  const seen = new Set();

  // Parse all define calls to get _name, _definition (as function string), _inputs
  const lines = content.split('\n');

  // First pass: extract all cell function definitions
  const cellFunctions = new Map();
  const cellRegex = /const\s+(_[a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?function\*?\s+/g;
  let match;
  while ((match = cellRegex.exec(content)) !== null) {
    const funcName = match[1];
    const startIndex = match.index + match[0].length;
    // Find the function name and params
    const headerMatch = content.slice(match.index).match(
      /const\s+(_[a-zA-Z0-9_]+)\s*=\s*(async\s+)?function(\*)?\s+[a-zA-Z0-9_]+\s*\(([^)]*)\)\s*\{/
    );
    if (!headerMatch) continue;

    const isAsync = !!headerMatch[2];
    const isGenerator = !!headerMatch[3];
    const params = headerMatch[4];

    // Find balanced braces for function body
    const bodyStart = match.index + headerMatch[0].length;
    let braceCount = 1;
    let endIndex = bodyStart;
    while (braceCount > 0 && endIndex < content.length) {
      if (content[endIndex] === '{') braceCount++;
      else if (content[endIndex] === '}') braceCount--;
      endIndex++;
    }

    const fullFn = content.slice(match.index + headerMatch[0].indexOf('function'), endIndex);
    cellFunctions.set(funcName, fullFn);
  }

  // Second pass: parse define() calls to build variable descriptors
  // Pattern: main.variable(observer("name")).define("name", ["dep1", "dep2"], _funcRef);
  // Pattern: main.variable(observer()).define(["dep1"], _funcRef);
  // Pattern: main.variable(observer("name")).define("name", ["dep1"], (G, _) => G.input(_));
  const defineRegex = /main\.variable\(observer\(([^)]*)\)\)\.define\(([^;]+)\);/g;

  const allDefines = [];
  while ((match = defineRegex.exec(content)) !== null) {
    const observerArg = match[1].trim();
    const defineBody = match[2].trim();

    // Extract variable name
    let varName = null;
    if (observerArg) {
      const nameMatch = observerArg.match(/^"([^"]+)"$/);
      if (nameMatch) varName = nameMatch[1];
    }

    // Extract function ref or inline definition
    let definition = null;
    let inputs = [];

    // Check for function reference (last arg is _identifier)
    const funcRefMatch = defineBody.match(/,\s*(_[a-zA-Z0-9_]+)\s*$/);
    if (funcRefMatch) {
      const funcRef = funcRefMatch[1];
      definition = cellFunctions.get(funcRef);
    }

    // Check for inline definition like (G, _) => G.input(_)
    if (!definition) {
      const inlineMatch = defineBody.match(/,\s*(\([^)]*\)\s*=>.*?)$/);
      if (inlineMatch) {
        definition = inlineMatch[1].trim();
      }
    }

    // Extract inputs array
    const inputsMatch = defineBody.match(/\[([^\]]*)\]/);
    if (inputsMatch) {
      inputs = inputsMatch[1].split(',')
        .map(s => s.trim().replace(/^"|"$/g, ''))
        .filter(s => s);
    }

    if (definition) {
      allDefines.push({ _name: varName, _definition: definition, _inputs: inputs });
    }
  }

  // Also parse $def() calls used in inner/embedded modules
  // Pattern: $def("_funcRef", "name", ["dep1", "dep2"], _funcRef);
  const defRegex = /\$def\("([^"]+)",\s*"([^"]*)",\s*\[([^\]]*)\],\s*(_[a-zA-Z0-9_]+)\)/g;
  while ((match = defRegex.exec(content)) !== null) {
    const varName = match[2] || null;
    const inputsStr = match[3];
    const funcRefName = match[4];
    const inputs = inputsStr.split(',')
      .map(s => s.trim().replace(/^"|"$/g, ''))
      .filter(s => s);
    const definition = cellFunctions.get(funcRefName);
    if (definition) {
      allDefines.push({ _name: varName, _definition: definition, _inputs: inputs });
    }
  }

  // Also parse import defines
  // Pattern: main.define("name", ["module @author/pkg", "@variable"], (_, v) => v.import("name", _));
  const importRegex = /main\.define\("([^"]+)",\s*\["module\s+([^"]+)",\s*"@variable"\],\s*\(([^)]+)\)\s*=>\s*([^)]+\))/g;
  const importsByModule = new Map();

  while ((match = importRegex.exec(content)) !== null) {
    const importedName = match[1];
    const moduleName = match[2];
    const definition = `(${match[3]}) => ${match[4]}`;

    if (importedName.startsWith('module ')) continue;

    if (!importsByModule.has(moduleName)) {
      importsByModule.set(moduleName, []);
    }
    importsByModule.get(moduleName).push({
      _name: importedName,
      _definition: definition,
      _inputs: [`module ${moduleName}`, '@variable']
    });
  }

  // Group: viewof X goes with X (the G.input getter)
  // Group: initial X, mutable X, X go together
  // Single: everything else
  const grouped = new Map();

  for (const v of allDefines) {
    const name = v._name;
    if (!name) {
      // Anonymous cell — standalone group
      groups.push([v]);
      continue;
    }

    // viewof value getter: "name" with inputs ["Generators", "viewof name"]
    if (v._inputs.includes(`viewof ${name}`)) {
      const key = `viewof ${name}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(v);
      continue;
    }

    // viewof definition: "viewof name"
    if (name.startsWith('viewof ')) {
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).unshift(v); // viewof def goes first
      continue;
    }

    // mutable initial: "initial name"
    if (name.startsWith('initial ')) {
      const baseName = name.replace(/^initial /, '');
      const key = `mutable ${baseName}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).unshift(v);
      continue;
    }

    // mutable definition: "mutable name"
    if (name.startsWith('mutable ')) {
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name).push(v);
      continue;
    }

    // mutable value getter: "name" with inputs ["mutable name"]
    if (v._inputs.includes(`mutable ${name}`)) {
      const key = `mutable ${name}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(v);
      continue;
    }

    // Regular named cell
    groups.push([v]);
  }

  // Add grouped variables
  for (const [, group] of grouped) {
    groups.push(group);
  }

  // Add imports (grouped by module as single import statements)
  for (const [, importVars] of importsByModule) {
    groups.push(importVars);
  }

  return groups;
}

/**
 * Decompile variable groups to Observable source using the toolchain.
 * Runs decompile() inside a lopecode notebook via Playwright.
 */
async function decompileVariables(variableGroups, options) {
  // Find a notebook with the toolchain
  const toolchainNotebook = path.resolve('lopebooks/notebooks/@tomlarkworthy_reactive-reflective-testing.html');
  if (!fs.existsSync(toolchainNotebook)) {
    throw new Error(`Toolchain notebook not found: ${toolchainNotebook}`);
  }

  log('Loading toolchain for decompilation...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const fileUrl = `file://${toolchainNotebook}#view=R100(S100(@tomlarkworthy/observablejs-toolchain))`;
    await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Force the toolchain cells to compute by running tests briefly
    await page.evaluate(() => {
      const rt = window.__ojs_runtime;
      if (!rt) throw new Error('Runtime not found');
      // Force all variables reachable
      for (const v of rt._variables) {
        v._reachable = true;
      }
      rt._dirty = new Set(rt._variables);
      rt._compute();
    });
    await page.waitForTimeout(3000);

    // Verify decompile is available
    const decompileReady = await page.evaluate(() => {
      const vars = window.__ojs_runtime._variables;
      const dVar = [...vars].find(v => v._name === 'decompile');
      return dVar && dVar._value && typeof dVar._value === 'function';
    });

    if (!decompileReady) {
      throw new Error('decompile function not ready in toolchain');
    }

    log(`Decompiling ${variableGroups.length} cell groups...`);

    const results = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < variableGroups.length; i += BATCH_SIZE) {
      const batch = variableGroups.slice(i, i + BATCH_SIZE);

      // Set up batch decompilation
      await page.evaluate((batchData) => {
        window.__decompileBatch = batchData;
        window.__decompileResults = null;
        window.__decompileError = null;

        (async () => {
          try {
            const vars = window.__ojs_runtime._variables;
            const dVar = [...vars].find(v => v._name === 'decompile');
            const decompile = dVar._value;

            const results = [];
            for (const group of window.__decompileBatch) {
              try {
                const source = await decompile(group);
                results.push({ ok: true, source });
              } catch (e) {
                results.push({ ok: false, error: e.message, group });
              }
            }
            window.__decompileResults = results;
          } catch (e) {
            window.__decompileError = e.message;
          }
        })();
      }, batch);

      // Poll for results
      let attempts = 0;
      while (attempts < 30) {
        const done = await page.evaluate(() =>
          window.__decompileResults !== null || window.__decompileError !== null
        );
        if (done) break;
        await page.waitForTimeout(200);
        attempts++;
      }

      const batchResult = await page.evaluate(() => ({
        results: window.__decompileResults,
        error: window.__decompileError
      }));

      if (batchResult.error) {
        throw new Error(`Decompile batch error: ${batchResult.error}`);
      }

      if (batchResult.results) {
        for (const r of batchResult.results) {
          if (r.ok) {
            results.push(r.source);
          } else {
            if (options.verbose) {
              log(`Warning: failed to decompile: ${r.error}`);
            }
          }
        }
      }
    }

    return results;
  } finally {
    await browser.close();
  }
}

// --- Browser automation ---

async function launchWithProfile(options) {
  // Ensure profile directory exists
  if (!fs.existsSync(options.profile)) {
    fs.mkdirSync(options.profile, { recursive: true });
  }

  const browser = await chromium.launchPersistentContext(options.profile, {
    headless: !options.headed,
    args: ['--disable-web-security'],
    viewport: { width: 1920, height: 1080 },
  });

  return { browser };
}

async function pushToObservable(cells, targetUrl, options, { filteredOriginalIndices, totalOriginalGroups } = {}) {
  log(`Launching browser (${options.headed ? 'headed' : 'headless'})...`);

  const { browser } = await launchWithProfile(options);

  const page = await browser.newPage();

  if (options.verbose) {
    page.on('console', msg => log(`[browser] ${msg.text()}`));
  }

  try {
    // Navigate to the Observable notebook
    log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: options.timeout });
    await page.waitForTimeout(5000);

    // Check if we're logged in (may redirect to GitHub login)
    const currentUrl = page.url();
    if (options.verbose) log(`Current URL: ${currentUrl}`);
    if (currentUrl.includes('github.com/login') || currentUrl.includes('/sign-in')) {
      throw new Error(
        'Not logged in to Observable. Log in first by running:\n' +
        `  node tools/lope-push-to-observablehq.js --login --headed --profile ${options.profile}`
      );
    }

    // Wait for the notebook iframe to appear (indicates page loaded and we're authenticated)
    const iframeHandle = await page.locator('iframe').first().elementHandle({ timeout: 15000 }).catch(() => null);
    if (!iframeHandle) {
      throw new Error(
        'Could not find notebook iframe — you may not be logged in.\n' +
        'Log in first by running:\n' +
        `  node tools/lope-push-to-observablehq.js --login --headed --profile ${options.profile}`
      );
    }
    const iframe = await iframeHandle.contentFrame();
    if (!iframe) throw new Error('Could not access notebook iframe content');

    if (filteredOriginalIndices && !options.noDelete) {
      // --- In-place cell replacement (--cells mode) ---
      await replaceCellsInPlace(page, iframe, cells, filteredOriginalIndices, options);
    } else {
      // --- Full replace or add-only mode ---
      await fullReplace(page, iframe, cells, options);
    }

    // Wait for autosave
    log('Waiting for autosave...');
    await page.waitForTimeout(3000);

    // Verify final state
    const finalCount = await countCells(page);
    log(`Final cell count: ${finalCount}`);
    log('Push complete!');

  } finally {
    if (!options.headed) {
      await browser.close();
    } else {
      log('Browser left open for inspection (--headed mode)');
      // Keep alive for 30 seconds for inspection
      await page.waitForTimeout(30000);
      await browser.close();
    }
  }
}

/**
 * Full replace: paste all cells at top, then delete all old cells.
 */
async function fullReplace(page, iframe, cells, options) {
  const existingCellCount = await countCells(page);
  log(`Found ${existingCellCount} existing cell(s)`);

  // Write cells to clipboard
  log(`Preparing ${cells.length} cells for paste...`);
  await writeToClipboard(iframe, cells);

  // Click first cell, Escape to selection mode, then paste
  log('Pasting cells...');
  const firstElement = await iframe.locator('h1, h2, h3, p, div.observablehq').first();
  await firstElement.click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.keyboard.press('Meta+v');
  await page.waitForTimeout(3000);

  const afterPasteCount = await countCells(page);
  log(`Cell count after paste: ${afterPasteCount}`);

  if (afterPasteCount <= existingCellCount) {
    throw new Error('Paste did not add new cells');
  }

  if (options.noDelete) {
    log(`Skipping deletion (--no-delete). ${afterPasteCount - existingCellCount} new cell(s) added at top.`);
    log('You will need to manually remove the old versions of these cells.');
  } else {
    log('Selecting old cells for deletion...');
    await deleteOldCells(page, iframe, existingCellCount, afterPasteCount, options);
  }
}

/**
 * Write Observable cells to clipboard via execCommand("copy") trick.
 */
async function writeToClipboard(iframe, cells) {
  const cellPayload = cells.map((value, i) => ({
    id: i + 1,
    value,
    pinned: false,
    mode: 'js',
    data: null,
    name: null,
  }));

  await iframe.evaluate((jsonData) => {
    function listener(e) {
      e.clipboardData.setData('text/plain', 'observable cells');
      e.clipboardData.setData('application/vnd.observablehq+json', jsonData);
      e.preventDefault();
    }
    document.addEventListener('copy', listener);
    document.execCommand('copy');
    document.removeEventListener('copy', listener);
  }, JSON.stringify(cellPayload));
}

/**
 * Extract cell name from Observable source code.
 * e.g. "viewof foo = ..." → "viewof foo", "bar = 42" → "bar"
 */
function extractCellName(source) {
  if (!source) return null;
  const m = source.match(/^(viewof\s+\w+|mutable\s+\w+|\w+)\s*=/);
  if (m) return m[1];
  if (source.startsWith('import ')) return source.trim();
  return null;
}

/**
 * Read cell names and their Observable internal IDs from __NEXT_DATA__.
 * Returns array of { cellId, name, index } ordered by DOM position.
 */
async function readCellMap(page) {
  // __NEXT_DATA__ contains all cell sources and internal IDs
  const nodes = await page.evaluate(() => {
    const el = document.getElementById('__NEXT_DATA__');
    if (!el) return null;
    const data = JSON.parse(el.textContent);
    return data?.props?.pageProps?.initialNotebook?.nodes;
  });

  if (!nodes) return [];

  // Get DOM order by reading cell-N divs in order
  const domOrder = await page.evaluate(() => {
    const cellDivs = document.querySelectorAll('[id^="cell-"]');
    return [...cellDivs].map(el => parseInt(el.id.replace('cell-', ''), 10));
  });

  // Build ordered map: DOM position → { cellId, name }
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return domOrder.map((cellId, index) => {
    const node = nodeMap.get(cellId);
    const name = node ? extractCellName(node.value) : null;
    return { cellId, name, index };
  });
}

/**
 * Replace specific cells in-place by matching cell names.
 *
 * Strategy:
 *   1. Read cell names from __NEXT_DATA__ (Observable's embedded notebook data)
 *   2. Match cells by name against decompiled replacements
 *   3. For each match (bottom-to-top to preserve indices):
 *      a. Write single cell to clipboard
 *      b. Click the target cell's menu → "Select"
 *      c. Paste (inserts above) → Delete old cell
 */
async function replaceCellsInPlace(page, iframe, cells, targetIndices, options) {
  const cellMap = await readCellMap(page);
  log(`Found ${cellMap.length} existing cell(s) in target notebook`);

  if (options.verbose) {
    for (const c of cellMap) {
      log(`  cell-${c.cellId} [${c.index}]: "${c.name || '(anonymous)'}"`);
    }
  }

  // Build a map from cell name to decompiled replacement source
  const replacements = new Map();
  for (const cell of cells) {
    const name = extractCellName(cell);
    if (name) replacements.set(name, cell);
  }

  // Find matching cells by name
  const matches = [];
  for (const c of cellMap) {
    if (c.name && replacements.has(c.name)) {
      matches.push({ ...c, cell: replacements.get(c.name) });
    }
  }

  if (matches.length === 0) {
    log('Warning: No matching cells found in target notebook.');
    log(`Looked for: ${[...replacements.keys()].join(', ')}`);
    log(`Found in target: ${cellMap.filter(c => c.name).map(c => c.name).join(', ')}`);
    return;
  }

  log(`Matched ${matches.length} cell(s) for replacement: ${matches.map(m => m.name).join(', ')}`);

  // Process bottom-to-top so indices don't shift
  matches.sort((a, b) => b.index - a.index);

  for (const { index, name, cell, cellId } of matches) {
    log(`Replacing cell "${name}" (cell-${cellId}, index ${index})...`);

    // Write single cell to clipboard
    await writeToClipboard(iframe, [cell]);

    // Find the target cell's menu button by DOM index
    const menuButtons = page.locator('button[title*="Click for cell actions"]');
    const menuCount = await menuButtons.count();

    if (index >= menuCount) {
      log(`Warning: Cell index ${index} out of range (${menuCount} menu buttons). Skipping.`);
      continue;
    }

    // Menu button has display:none — make it visible, click, then click "Select"
    await page.evaluate((idx) => {
      const buttons = document.querySelectorAll('button[title*="Click for cell actions"]');
      const btn = buttons[idx];
      // Make visible temporarily
      btn.style.display = 'block';
      btn.click();
    }, index);
    await page.waitForTimeout(500);

    // Click "Select" menu item via evaluate (may also be hidden)
    await page.evaluate(() => {
      const item = document.querySelector('[data-valuetext="Select"]');
      if (item) item.click();
    });
    await page.waitForTimeout(500);

    // Paste — new cell appears above the selected cell
    await page.keyboard.press('Meta+v');
    await page.waitForTimeout(2000);

    // The old cell's checkbox should still be checked. Delete it.
    await page.keyboard.press('d');
    await page.waitForTimeout(1000);
    await page.keyboard.press('d');
    await page.waitForTimeout(2000);

    log(`Cell "${name}" replaced.`);
  }
}

async function countCells(page) {
  // Count checkbox/gutter elements that represent cells
  // The outer page has "Click to insert or merge cells" buttons between cells
  // and gutter buttons for each cell. Count the gutter buttons.
  const gutterCount = await page.locator('button[aria-label="gutter"]').count();
  // Also try counting via iframe cells
  return gutterCount || 1; // at least 1
}

async function deleteOldCells(page, iframe, oldCount, totalCount, options) {
  // The old cells are at the bottom (paste inserts above the selected cell).
  // We need to:
  // 1. Click the ⋮ menu on one of the old cells (now at the bottom)
  // 2. Click "Select" to enter checkbox mode
  // 3. Check all old cells (bottom N cells)
  // 4. Delete them

  // Find the last cell's menu button (⋮)
  const menuButtons = page.locator('button[title*="Click for cell actions"]');
  const menuCount = await menuButtons.count();
  if (menuCount === 0) throw new Error('Could not find cell menu buttons');

  // Click the last menu button (an old cell)
  await menuButtons.last().click();
  await page.waitForTimeout(500);

  // Click "Select" in the dropdown
  await page.locator('text=Select').first().click();
  await page.waitForTimeout(500);

  // Now we're in checkbox selection mode.
  // The last cell is checked. We need to check all other old cells too.
  // Old cells are the last `oldCount` cells.
  // New cells are the first `totalCount - oldCount` cells.

  // Get all checkboxes
  const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
  let cbCount = await checkboxes.count();

  // If no standard checkboxes, try the ARIA checkbox approach
  if (cbCount === 0) {
    // Observable uses custom checkbox elements — find them via snapshot
    // We need to check the bottom `oldCount` checkboxes
    // Let's use a different approach: check all, then uncheck the new ones

    // First, try clicking the select-all checkbox in the toolbar
    const selectAllBtn = page.locator('button:has-text("Select all")');
    if (await selectAllBtn.count() > 0) {
      await selectAllBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // Get fresh checkbox state — Observable uses plain checkbox elements
  // positioned in the gutter area outside the iframe
  const allCheckboxes = page.locator('input[type="checkbox"]');
  cbCount = await allCheckboxes.count();

  if (cbCount > 0) {
    // Check all checkboxes first
    for (let i = 0; i < cbCount; i++) {
      const cb = allCheckboxes.nth(i);
      const checked = await cb.isChecked().catch(() => false);
      if (!checked) {
        await cb.click();
        await page.waitForTimeout(100);
      }
    }

    // Uncheck the new cells (first totalCount - oldCount checkboxes)
    const newCellCount = totalCount - oldCount;
    for (let i = 0; i < newCellCount && i < cbCount; i++) {
      const cb = allCheckboxes.nth(i);
      const checked = await cb.isChecked().catch(() => true);
      if (checked) {
        await cb.click();
        await page.waitForTimeout(100);
      }
    }
  } else {
    // Fallback: use ARIA-based checkbox detection
    log('Warning: Could not find standard checkboxes, trying ARIA approach...');

    // Evaluate page to find and click checkboxes
    await page.evaluate(({ oldCount, totalCount }) => {
      const cbs = document.querySelectorAll('[role="checkbox"]');
      const newCount = totalCount - oldCount;
      // Check old cells (last oldCount), uncheck new cells (first newCount)
      for (let i = 0; i < cbs.length; i++) {
        const isOldCell = i >= newCount;
        const isChecked = cbs[i].getAttribute('aria-checked') === 'true' ||
                          cbs[i].classList.contains('checked');
        if (isOldCell && !isChecked) cbs[i].click();
        if (!isOldCell && isChecked) cbs[i].click();
      }
    }, { oldCount, totalCount });
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(300);

  // Click Delete button
  // First press D (keyboard shortcut)
  log('Deleting old cells...');
  await page.keyboard.press('d');
  await page.waitForTimeout(1000);

  // Confirm deletion (press D again)
  await page.keyboard.press('d');
  await page.waitForTimeout(2000);

  log('Old cells deleted');
}

// --- Main ---

async function main() {
  const options = parseArgs(process.argv);

  // --login mode: open browser for manual login, then exit
  if (options.login) {
    log(`Opening browser for login (profile: ${options.profile})...`);
    const { browser } = await launchWithProfile({ ...options, headed: true });
    const page = await browser.newPage();
    await page.goto('https://observablehq.com/', { waitUntil: 'networkidle', timeout: 30000 });
    log('Please log in to Observable. Press Ctrl+C when done.');
    // Wait indefinitely (user kills with Ctrl+C)
    await new Promise(() => {});
  }

  if (!options.notebook) {
    console.error('Error: notebook HTML file is required');
    process.exit(1);
  }
  if (!options.module) {
    console.error('Error: --module is required');
    process.exit(1);
  }
  if (!options.target && !options.dryRun) {
    console.error('Error: --target is required (or use --dry-run)');
    process.exit(1);
  }

  const notebookPath = path.resolve(options.notebook);
  if (!fs.existsSync(notebookPath)) {
    console.error(`Error: Notebook not found: ${notebookPath}`);
    process.exit(1);
  }

  // Parse the notebook and extract the module
  log(`Reading ${notebookPath}...`);
  const html = fs.readFileSync(notebookPath, 'utf-8');
  const modules = parseNotebook(html);

  if (!modules.has(options.module)) {
    console.error(`Error: Module "${options.module}" not found in notebook`);
    console.error('Available modules:');
    for (const id of modules.keys()) {
      console.error(`  ${id}`);
    }
    process.exit(1);
  }

  const moduleContent = modules.get(options.module).content;
  let variableGroups = parseVariableGroups(moduleContent);

  if (variableGroups.length === 0) {
    console.error('Error: No variables extracted from module');
    process.exit(1);
  }

  log(`Extracted ${variableGroups.length} variable groups from ${options.module}`);

  // Filter by --cells if specified
  // Track original indices for targeted deletion
  let filteredOriginalIndices = null;
  const totalOriginalGroups = variableGroups.length;

  if (options.cells) {
    const filterSet = new Set(options.cells);
    const before = variableGroups.length;
    filteredOriginalIndices = [];
    const filteredGroups = [];

    for (let i = 0; i < variableGroups.length; i++) {
      const group = variableGroups[i];
      const matches = group.some(v => v._name && filterSet.has(v._name));
      if (matches) {
        filteredOriginalIndices.push(i);
        filteredGroups.push(group);
      }
    }

    variableGroups = filteredGroups;
    log(`Filtered to ${variableGroups.length}/${before} groups matching: ${options.cells.join(', ')}`);

    if (variableGroups.length === 0) {
      console.error(`Error: No variable groups matched --cells filter: ${options.cells.join(', ')}`);
      console.error('Tip: use --dry-run without --cells to see all available cell names');
      process.exit(1);
    }
  }

  // Decompile using the toolchain
  const cells = await decompileVariables(variableGroups, options);

  if (cells.length === 0) {
    console.error('Error: No cells produced by decompilation');
    process.exit(1);
  }

  log(`Decompiled ${cells.length} cells`);

  if (options.dryRun) {
    // Show variable group names alongside decompiled previews
    console.log(`\nDry run: ${cells.length} cells would be pushed\n`);
    for (let i = 0; i < cells.length; i++) {
      const groupNames = variableGroups[i]
        ? variableGroups[i].map(v => v._name || '(anonymous)').join(', ')
        : '?';
      const preview = cells[i].length > 100
        ? cells[i].slice(0, 100) + '...'
        : cells[i];
      console.log(`  [${i + 1}] ${groupNames}`);
      console.log(`       ${preview}`);
    }
    if (options.cells) {
      console.log(`\nFiltered by --cells: ${options.cells.join(', ')}`);
    }
    process.exit(0);
  }

  try {
    await pushToObservable(cells, options.target, options, {
      filteredOriginalIndices,
      totalOriginalGroups,
    });
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    if (options.verbose) console.error(err.stack);
    process.exit(1);
  }
}

main();
