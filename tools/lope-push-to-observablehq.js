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

    const fnStart = isAsync ? headerMatch[0].indexOf('async') : headerMatch[0].indexOf('function');
    const fullFn = content.slice(match.index + fnStart, endIndex);
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
  // Pattern with alias: main.define("local", ["module @author/pkg", "@variable"], (_, v) => v.import("remote", "local", _));
  const importRegex = /main\.define\("([^"]+)",\s*\["module\s+([^"]+)",\s*"@variable"\],\s*\([^)]+\)\s*=>\s*v\.import\(([^)]+)\)/g;
  const importsByModule = new Map();

  while ((match = importRegex.exec(content)) !== null) {
    const localName = match[1];
    const moduleName = match[2];
    const importArgs = match[3];

    if (localName.startsWith('module ')) continue;

    // Parse import args to detect aliases: v.import("remote", "local", _) or v.import("name", _)
    const argParts = importArgs.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    let remoteName = localName;
    if (argParts.length >= 3) {
      // v.import("remote", "local", _)
      remoteName = argParts[0];
    }

    if (!importsByModule.has(moduleName)) {
      importsByModule.set(moduleName, []);
    }
    importsByModule.get(moduleName).push({ local: localName, remote: remoteName });
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

  // Add imports as pre-formatted OJS import statements (not variable groups).
  // These bypass the decompiler since they're already valid OJS.
  const preformatted = [];
  for (const [moduleName, specs] of importsByModule) {
    const specifiers = specs.map(({ local, remote }) =>
      local !== remote ? `${remote} as ${local}` : local
    ).join(',\n  ');
    preformatted.push(`import {\n  ${specifiers}\n} from "${moduleName}"`);
  }

  return { groups, preformatted };
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

  log('Loading toolchain for decompilation (Node runtime)...');

  // Suppress unhandled rejections from Observable module loading errors
  const rejectionHandler = (reason) => {
    if (options.verbose) {
      console.error(`[suppressed rejection] ${reason}`);
    }
  };
  process.on('unhandledRejection', rejectionHandler);

  // Use lope-runtime.js for decompilation — more reliable than Playwright
  const { loadNotebook } = await import('./lope-runtime.js');
  const verboseLog = options.verbose ? console.error : () => {};
  const execution = await loadNotebook(toolchainNotebook, {
    settleTimeout: 20000,
    log: verboseLog,
    hash: '#view=R100(S100(@tomlarkworthy/observablejs-toolchain))',
  });

  try {
    // Wait for decompile function to be available
    log('Waiting for decompile function...');
    const result = await execution.waitForVariable('decompile', 30000);
    const decompile = result.value;
    if (!decompile || typeof decompile !== 'function') {
      throw new Error(`decompile function not ready in toolchain (got ${typeof decompile})`);
    }

    log(`Decompiling ${variableGroups.length} cell groups...`);

    const results = [];
    for (const group of variableGroups) {
      try {
        const source = await decompile(group);
        results.push(source);
      } catch (e) {
        if (options.verbose) {
          log(`Warning: failed to decompile: ${e.message}`);
        }
      }
    }

    return results;
  } finally {
    execution.dispose();
    process.removeListener('unhandledRejection', rejectionHandler);
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
 *      b. Click the target cell → Escape to navigation mode
 *      c. Paste (inserts above) → ArrowDown to old cell → dd to delete
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

    // Click on the target cell to focus it, then Escape to navigation mode.
    // This avoids "Select" checkbox mode where paste goes to the top.
    const cellDiv = page.locator(`#cell-${cellId}`);
    if (await cellDiv.count() === 0) {
      log(`Warning: Could not find #cell-${cellId}. Skipping.`);
      continue;
    }

    const beforeCellIds = await page.evaluate(() =>
      [...document.querySelectorAll('[id^="cell-"]')].map(el => el.id)
    );

    await cellDiv.click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Paste — inserts new cell above the focused cell
    await page.keyboard.press('Meta+v');
    await page.waitForTimeout(3000);

    const afterCellIds = await page.evaluate(() =>
      [...document.querySelectorAll('[id^="cell-"]')].map(el => el.id)
    );

    const newCellIds = afterCellIds.filter(id => !beforeCellIds.includes(id));

    if (newCellIds.length > 0 && afterCellIds.includes(`cell-${cellId}`)) {
      // Paste inserted a new cell above — delete the old cell below it.
      // After paste, the new cell is focused in navigation mode.
      // ArrowDown moves to the old cell, dd deletes it.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(500);
      await page.keyboard.press('d');
      await page.waitForTimeout(1000);
      await page.keyboard.press('d');
      await page.waitForTimeout(2000);
      log(`Cell "${name}" replaced (paste + delete old).`);
    } else if (!afterCellIds.includes(`cell-${cellId}`)) {
      // Paste replaced the old cell in-place — no deletion needed
      log(`Cell "${name}" replaced in-place.`);
    } else {
      log(`Warning: Unexpected state after pasting "${name}".`);
    }
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
  // Strategy:
  // 1. Enter select mode via cell menu → "Select"
  // 2. Click "Select all" to check every cell
  // 3. Uncheck the new cells (first N checkboxes) by clicking them
  // 4. Delete the remaining selected (old) cells

  const newCellCount = totalCount - oldCount;
  log(`Deleting ${oldCount} old cells (keeping first ${newCellCount} of ${totalCount})...`);

  // Enter select mode: trigger via cell action menu on any cell
  await page.evaluate(() => {
    const btn = document.querySelector('button[title*="Click for cell actions"]');
    if (btn) { btn.style.display = 'block'; btn.click(); }
  });
  await page.waitForTimeout(800);

  // Click "Select" menu item to enter checkbox mode
  const selectClicked = await page.evaluate(() => {
    const item = document.querySelector('[data-valuetext="Select"]');
    if (item) { item.click(); return true; }
    return false;
  });
  if (!selectClicked) {
    log('Warning: Could not find Select menu item');
    return;
  }
  await page.waitForTimeout(1000);

  // Click "Select all" to check all cells
  const selectAllBtn = page.locator('text=Select all');
  if (await selectAllBtn.count() > 0) {
    await selectAllBtn.first().click();
    await page.waitForTimeout(500);
    log('Selected all cells');
  } else {
    // Try alternative: check all checkboxes manually
    log('No "Select all" button found, checking all manually...');
    const allCellCbs = page.locator('[id^="cell-"] input[type="checkbox"]');
    const cbCount = await allCellCbs.count();
    for (let i = 0; i < cbCount; i++) {
      const cb = allCellCbs.nth(i);
      if (!(await cb.isChecked().catch(() => false))) {
        await cb.click();
      }
    }
    await page.waitForTimeout(500);
  }

  // Uncheck the new cells (first newCellCount cell checkboxes).
  // Observable's cell checkboxes are inside [id^="cell-"] containers.
  // There may also be a "select all" checkbox in a toolbar — skip it.
  // Uncheck new cells + 1 buffer because dd also deletes the focused cell
  const safeNewCount = newCellCount + 1;
  log(`Unchecking first ${safeNewCount} cell checkboxes (${newCellCount} new + 1 buffer for dd focus)...`);
  const cellCheckboxes = page.locator('[id^="cell-"] input[type="checkbox"]');
  const cbTotal = await cellCheckboxes.count();
  log(`Found ${cbTotal} cell checkboxes`);
  for (let i = 0; i < Math.min(safeNewCount, cbTotal); i++) {
    const cb = cellCheckboxes.nth(i);
    if (await cb.isChecked().catch(() => true)) {
      await cb.click();
      if (i % 20 === 19) await page.waitForTimeout(100);
    }
  }
  await page.waitForTimeout(500);

  // Verify selection count
  const checkedCount = await page.evaluate(() =>
    document.querySelectorAll('[id^="cell-"] input[type="checkbox"]:checked').length
  );
  log(`${checkedCount} cells selected for deletion`);

  // Try the "Delete N cells" button in the selection toolbar first.
  // Observable shows this button when cells are selected in checkbox mode.
  const deleteBtnLocator = page.locator('button').filter({ hasText: /Delete \d+ cell/ });
  if (await deleteBtnLocator.count() > 0) {
    log(`Clicking "${await deleteBtnLocator.first().textContent()}"...`);
    await deleteBtnLocator.first().click();
    await page.waitForTimeout(1000);
    // Confirm deletion dialog if one appears
    const confirmBtn = page.locator('button').filter({ hasText: /Delete/i });
    if (await confirmBtn.count() > 1) {
      await confirmBtn.last().click();
      await page.waitForTimeout(1000);
    }
  } else {
    // Fallback: keyboard dd
    log('No Delete button found, trying keyboard dd...');
    await page.keyboard.press('d');
    await page.waitForTimeout(300);
    await page.keyboard.press('d');
  }

  // Wait for deletion
  const waitTime = Math.min(oldCount * 50, 15000);
  await page.waitForTimeout(waitTime);

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
  const { groups: variableGroupsRaw, preformatted: importCells } = parseVariableGroups(moduleContent);
  let variableGroups = variableGroupsRaw;

  if (variableGroups.length === 0 && importCells.length === 0) {
    console.error('Error: No variables extracted from module');
    process.exit(1);
  }

  log(`Extracted ${variableGroups.length} variable groups + ${importCells.length} import statements from ${options.module}`);

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

  // Decompile variable groups using the toolchain
  const decompiled = await decompileVariables(variableGroups, options);

  // Combine decompiled cells + pre-formatted import statements.
  // Prepend a sacrificial markdown cell — Observable's paste swallows the first cell
  // when it gets merged with the target cell during paste-above.
  const sacrificialCell = 'md`---`';
  const cells = [sacrificialCell, ...decompiled, ...importCells];

  if (cells.length === 0) {
    console.error('Error: No cells produced by decompilation');
    process.exit(1);
  }

  log(`Decompiled ${decompiled.length} cells + ${importCells.length} imports = ${cells.length} total`);

  if (options.dryRun) {
    console.log(`\nDry run: ${cells.length} cells would be pushed\n`);
    for (let i = 0; i < decompiled.length; i++) {
      const groupNames = variableGroups[i]
        ? variableGroups[i].map(v => v._name || '(anonymous)').join(', ')
        : '?';
      const preview = decompiled[i].length > 100
        ? decompiled[i].slice(0, 100) + '...'
        : decompiled[i];
      console.log(`  [${i + 1}] ${groupNames}`);
      console.log(`       ${preview}`);
    }
    for (let i = 0; i < importCells.length; i++) {
      const preview = importCells[i].length > 100
        ? importCells[i].slice(0, 100) + '...'
        : importCells[i];
      console.log(`  [${decompiled.length + i + 1}] (import)`);
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
