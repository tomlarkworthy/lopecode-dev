#!/usr/bin/env node
/**
 * lope-push-ws.js - Push local notebook cells to Observable via WebSocket API
 *
 * Uses Observable's internal WebSocket editing protocol directly instead of
 * browser automation. Much faster and more reliable than clipboard-based push.
 *
 * Requires: node --experimental-vm-modules (for decompilation via lope-runtime.js)
 *
 * Usage:
 *   node --experimental-vm-modules tools/lope-push-ws.js <notebook.html> --module @tomlarkworthy/testing --target https://observablehq.com/d/ab8e6f7e97de571f
 *
 * Options:
 *   --module <name>     Module to extract cells from (required)
 *   --target <url>      Observable notebook URL or ID to push to (required, unless --dry-run)
 *   --cells <names>     Comma-separated cell names to push (default: all)
 *   --no-delete         Skip deleting old cells (for seeding)
 *   --dry-run           List cells that would be pushed without pushing
 *   --dump <path>       Write the decompiled cells (names + source) to a JSON file
 *   --verbose           Show detailed WS messages
 *   --timeout <ms>      Max wait time (default: 30000)
 *   --profile <path>    Browser profile directory for cookie extraction
 *   --cookies-file <path>  Read T/I cookies from JSON file (bypasses Playwright; recommended)
 *   --login             Open browser for manual login
 *   --headed            Show browser (for --login)
 *
 * Authentication:
 *   Preferred: --cookies-file tools/.observable-cookies.json (gitignored). See
 *   knowledge/pushing-cells-to-observablehq.md for the cookie-paste workflow.
 *   Legacy: cookies from the Playwright browser profile (~/.claude/lope-push-browser-profile).
 *   Log in first with: node tools/lope-push-ws.js --login --headed
 *
 * Exit Codes:
 *   0 - Success
 *   1 - Failure
 */

import { chromium } from 'playwright';
import WebSocket from 'ws';
import path from 'path';
import fs from 'fs';
import vm from 'vm';
import * as cheerio from 'cheerio';

// Check for --experimental-vm-modules flag (required for decompilation)
if (typeof vm.SourceTextModule !== 'function') {
  console.error(
    'Error: vm.SourceTextModule not available.\n' +
    'Run with: node --experimental-vm-modules tools/lope-push-ws.js ...'
  );
  process.exit(1);
}

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
    timeout: 30000,
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
    } else if (arg === '--cells-match-body' && args[i + 1]) {
      if (!options.cellsMatchBody) options.cellsMatchBody = [];
      options.cellsMatchBody.push(args[++i]);
    } else if (arg === '--no-delete') {
      options.noDelete = true;
    } else if (arg === '--target' && args[i + 1]) {
      options.target = args[++i];
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[++i], 10);
    } else if (arg === '--profile' && args[i + 1]) {
      options.profile = args[++i];
    } else if (arg === '--cookies-file' && args[i + 1]) {
      options.cookiesFile = args[++i];
    } else if (arg === '--login') {
      options.login = true;
    } else if (arg === '--headed') {
      options.headed = true;
    } else if (arg === '--dump' && args[i + 1]) {
      options.dump = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
lope-push-ws.js - Push local notebook cells to Observable via WebSocket API

Usage:
  node tools/lope-push-ws.js <notebook.html> --module <name> --target <url>

Options:
  --module <name>     Module to extract cells from (required)
  --target <url>      Observable notebook URL or ID to push to (required)
  --cells <names>     Comma-separated cell names to push (default: all)
  --cells-match-body <substring>
                      Modify the one existing cell whose body contains <substring>, using the one
                      decompiled cell that also contains it. Use for anonymous cells (no name).
                      Repeat the flag to push several. Modify-only — never inserts.
  --no-delete         Skip deleting old cells
  --dry-run           List cells that would be pushed without pushing
  --dump <path>       Write the decompiled cells (names + source) to a JSON file
  --verbose           Show detailed WS messages
  --timeout <ms>      Max wait time (default: 30000)
  --profile <path>    Browser profile for persistent login
  --cookies-file <path>  Read T/I cookies from JSON instead of Playwright (recommended; see knowledge/pushing-cells-to-observablehq.md)
  --login             Open browser for manual login
  --headed            Show browser (for --login)
      `);
      process.exit(0);
    } else if (!arg.startsWith('--') && !options.notebook) {
      options.notebook = arg;
    }
  }

  if ((options.cells || options.cellsMatchBody) && options.noDelete) {
    console.error('Error: --cells / --cells-match-body already do in-place modify; combining with --no-delete inserts duplicates instead of replacing. Drop --no-delete.');
    process.exit(1);
  }

  return options;
}

function log(msg) {
  process.stderr.write(`[lope-push-ws] ${msg}\n`);
}

// --- Notebook parsing ---

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

function parseVariableGroups(content, acorn) {
  const groups = [];
  const seen = new Set();

  const cellFunctions = new Map();
  let match;
  // Observable's compiler emits cell function definitions in two forms:
  //   const _N = [async] function[*] inner(...) { ... }
  //   [async] function[*] _N(...) { ... }                 (bare name)
  // The holder name is NOT always `_`-prefixed: exporter-3 names the holder after the
  // variable's pid, so a pid like `sl01` emits `const sl01 = ...` while a numeric-leading
  // pid like `1noor04` emits `_1noor04`. Collect every top-level function-valued binding
  // and resolve by name from the $def/define registration below.
  // Split them off with the SAME acorn the toolchain decompiler parses with, taking
  // each cell function's exact AST source range. This replaces brace-counting, which
  // miscounts a `{`/`}` inside a string, regex char-class or comment and merges the
  // cell with the ones after it — the merged blob then fails to decompile and the cell
  // is silently dropped. Using the decompiler's own acorn also guarantees the split and
  // the decompile agree (a cell one parser accepts can't be dropped by the other).
  // The define/$def/import registrations below are found by regex. They must scan CODE only:
  // a doc/prompt cell that is a template literal (e.g. the engine `systemPrompt`) can contain
  // EXAMPLE `main.define("module @user/other", ...)` text, which the import regex would otherwise
  // reconstruct into a real (broken) import cell. `scanContent` blanks template-literal chunks and
  // comment interiors (positions preserved) so only real code matches; plain-quoted string args of
  // genuine registrations stay intact.
  let scanContent = content;
  if (acorn) {
    const comments = [], tokens = [];
    let ast;
    const opts = (t) => ({ ecmaVersion: 'latest', sourceType: t, onComment: comments, onToken: tokens });
    try { ast = acorn.parse(content, opts('module')); }
    catch (e) { comments.length = 0; tokens.length = 0; ast = acorn.parse(content, opts('script')); }
    for (const node of ast.body) {
      if (node.type === 'VariableDeclaration') {
        for (const d of node.declarations) {
          if (d.id && d.id.type === 'Identifier' && d.init &&
              (d.init.type === 'FunctionExpression' || d.init.type === 'ArrowFunctionExpression')) {
            cellFunctions.set(d.id.name, content.slice(d.init.start, d.init.end));
          }
        }
      } else if (node.type === 'FunctionDeclaration' && node.id) {
        cellFunctions.set(node.id.name, content.slice(node.start, node.end));
      }
    }
    const buf = content.split('');
    const blank = (s, e) => { for (let i = s; i < e; i++) if (buf[i] !== '\n' && buf[i] !== '\r') buf[i] = ' '; };
    for (const c of comments) blank(c.start, c.end);
    for (const t of tokens) if (t.type === acorn.tokTypes.template) blank(t.start, t.end);
    scanContent = buf.join('');
  } else {
    // Fallback for callers that don't supply acorn: original regex + naive brace scan.
    const cellRegex = /(?:const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(async\s+)?function(\*)?\s+[a-zA-Z0-9_$]*\s*\(([^)]*)\)\s*\{|(async\s+)?function(\*)?\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(([^)]*)\)\s*\{)/g;
    while ((match = cellRegex.exec(content)) !== null) {
      const isConstForm = !!match[1];
      const funcName = isConstForm ? match[1] : match[7];
      const isAsync = isConstForm ? !!match[2] : !!match[5];
      const headerEnd = match.index + match[0].length;
      let braceCount = 1, endIndex = headerEnd;
      while (braceCount > 0 && endIndex < content.length) {
        if (content[endIndex] === '{') braceCount++;
        else if (content[endIndex] === '}') braceCount--;
        endIndex++;
      }
      const fnStart = isConstForm ? match.index + match[0].indexOf(isAsync ? 'async' : 'function') : match.index;
      cellFunctions.set(funcName, content.slice(fnStart, endIndex));
    }
  }

  // Collect all defines with their source position so we can sort by order
  const allDefinesWithPos = [];

  const defineRegex = /main\.variable\(observer\(([^)]*)\)\)\.define\(([^;]+)\);/g;
  while ((match = defineRegex.exec(scanContent)) !== null) {
    const observerArg = match[1].trim();
    const defineBody = match[2].trim();

    let varName = null;
    if (observerArg) {
      const nameMatch = observerArg.match(/^"([^"]+)"$/);
      if (nameMatch) varName = nameMatch[1];
    }

    let definition = null;
    let inputs = [];

    const funcRefMatch = defineBody.match(/,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*$/);
    if (funcRefMatch) {
      definition = cellFunctions.get(funcRefMatch[1]);
    }

    if (!definition) {
      const inlineMatch = defineBody.match(/,\s*(\([^)]*\)\s*=>.*?)$/);
      if (inlineMatch) {
        definition = inlineMatch[1].trim();
      }
    }

    const inputsMatch = defineBody.match(/\[([^\]]*)\]/);
    if (inputsMatch) {
      inputs = inputsMatch[1].split(',')
        .map(s => s.trim().replace(/^"|"$/g, ''))
        .filter(s => s);
    }

    if (definition) {
      allDefinesWithPos.push({ _name: varName, _definition: definition, _inputs: inputs, _pos: match.index });
    }
  }

  const defRegex = /\$def\("([^"]+)",\s*(?:"([^"]*)"|null),\s*\[([^\]]*)\],\s*([A-Za-z_$][A-Za-z0-9_$]*)\)/g;
  while ((match = defRegex.exec(scanContent)) !== null) {
    const varName = match[2] ?? null;
    const inputsStr = match[3];
    const funcRefName = match[4];
    const inputs = inputsStr.split(',')
      .map(s => s.trim().replace(/^"|"$/g, ''))
      .filter(s => s);
    const definition = cellFunctions.get(funcRefName);
    if (definition) {
      allDefinesWithPos.push({ _name: varName, _definition: definition, _inputs: inputs, _pos: match.index });
    }
  }

  // Sort by source position so viewof generators and $def entries interleave correctly
  allDefinesWithPos.sort((a, b) => a._pos - b._pos);
  const allDefines = allDefinesWithPos;

  const importRegex = /main\.define\("([^"]+)",\s*\["module\s+([^"]+)",\s*"@variable"\],\s*\([^)]+\)\s*=>\s*v\.import\(([^)]+)\)/g;
  const importsByModule = new Map();

  while ((match = importRegex.exec(scanContent)) !== null) {
    const localName = match[1];
    const moduleName = match[2];
    const importArgs = match[3];

    if (localName.startsWith('module ')) continue;

    const argParts = importArgs.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
    let remoteName = localName;
    if (argParts.length >= 3) {
      remoteName = argParts[0];
    }

    if (!importsByModule.has(moduleName)) {
      importsByModule.set(moduleName, []);
    }
    importsByModule.get(moduleName).push({ local: localName, remote: remoteName });
  }

  // Track grouped cells (viewof/mutable) with a placeholder in groups
  // so they appear at the position of their first occurrence, not at the end.
  const grouped = new Map();        // key -> array of variables
  const groupPlaceholder = new Map(); // key -> index in groups array

  for (const v of allDefines) {
    const name = v._name;
    if (!name) {
      groups.push([v]);
      continue;
    }

    if (v._inputs.includes(`viewof ${name}`)) {
      const key = `viewof ${name}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
        groupPlaceholder.set(key, groups.length);
        groups.push(null); // placeholder
      }
      grouped.get(key).push(v);
      continue;
    }

    if (name.startsWith('viewof ')) {
      if (!grouped.has(name)) {
        grouped.set(name, []);
        groupPlaceholder.set(name, groups.length);
        groups.push(null); // placeholder
      }
      grouped.get(name).unshift(v);
      continue;
    }

    if (name.startsWith('initial ')) {
      const baseName = name.replace(/^initial /, '');
      const key = `mutable ${baseName}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
        groupPlaceholder.set(key, groups.length);
        groups.push(null); // placeholder
      }
      grouped.get(key).unshift(v);
      continue;
    }

    if (name.startsWith('mutable ')) {
      if (!grouped.has(name)) {
        grouped.set(name, []);
        groupPlaceholder.set(name, groups.length);
        groups.push(null); // placeholder
      }
      grouped.get(name).push(v);
      continue;
    }

    if (v._inputs.includes(`mutable ${name}`)) {
      const key = `mutable ${name}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
        groupPlaceholder.set(key, groups.length);
        groups.push(null); // placeholder
      }
      grouped.get(key).push(v);
      continue;
    }

    groups.push([v]);
  }

  // Replace placeholders with actual grouped cells
  for (const [key, group] of grouped) {
    const idx = groupPlaceholder.get(key);
    groups[idx] = group;
  }

  const preformatted = [];
  for (const [moduleName, specs] of importsByModule) {
    // Filter out implicit getter imports: Observable auto-imports `X` when
    // you import `viewof X` or `mutable X`, so listing both causes
    // "Identifier 'X' has already been declared" errors.
    const viewofNames = new Set(specs.filter(s => s.local.startsWith('viewof ')).map(s => s.local.replace(/^viewof /, '')));
    const mutableNames = new Set(specs.filter(s => s.local.startsWith('mutable ')).map(s => s.local.replace(/^mutable /, '')));
    const filtered = specs.filter(({ local }) =>
      !viewofNames.has(local) && !mutableNames.has(local)
    );

    const specifiers = filtered.map(({ local, remote }) =>
      local !== remote ? `${remote} as ${local}` : local
    ).join(', ');

    // Strip internal `d/` routing prefix from module names — Observable
    // source uses bare hex IDs (e.g. "57d79353bac56631@44" not "d/57d79353bac56631@44")
    const sourceModuleName = moduleName.replace(/^d\//, '');

    preformatted.push(`import { ${specifiers} } from "${sourceModuleName}"`);
  }

  return { groups, preformatted };
}

// Load the toolchain notebook once and expose the pieces the push needs: `decompile`
// (compiled cell → Observable source) and `acorn` (the same parser decompile uses, so
// the cell splitter and the decompiler agree). Caller must invoke dispose().
async function loadToolchain(options) {
  const toolchainNotebook = path.resolve('lopebooks/notebooks/@tomlarkworthy_reactive-reflective-testing.html');
  if (!fs.existsSync(toolchainNotebook)) {
    throw new Error(`Toolchain notebook not found: ${toolchainNotebook}`);
  }

  log('Loading toolchain (Node runtime)...');

  const rejectionHandler = (reason) => {
    if (options.verbose) console.error(`[suppressed rejection] ${reason}`);
  };
  process.on('unhandledRejection', rejectionHandler);

  const { loadNotebook } = await import('./lope-runtime.js');
  const verboseLog = options.verbose ? console.error : () => {};
  const execution = await loadNotebook(toolchainNotebook, {
    settleTimeout: 20000,
    log: verboseLog,
    hash: '#view=R100(S100(@tomlarkworthy/observablejs-toolchain))',
  });

  const decompile = (await execution.waitForVariable('decompile', 30000)).value;
  if (!decompile || typeof decompile !== 'function') {
    execution.dispose();
    process.removeListener('unhandledRejection', rejectionHandler);
    throw new Error(`decompile function not ready in toolchain (got ${typeof decompile})`);
  }
  const acorn = (await execution.waitForVariable('acorn', 30000)).value;

  return {
    decompile,
    acorn,
    dispose() {
      execution.dispose();
      process.removeListener('unhandledRejection', rejectionHandler);
    },
  };
}

async function decompileVariables(variableGroups, decompile, options) {
  log(`Decompiling ${variableGroups.length} cell groups...`);
  const results = [];
  for (const group of variableGroups) {
    try {
      results.push(await decompile(group));
    } catch (e) {
      if (options.verbose) log(`Warning: failed to decompile: ${e.message}`);
    }
  }
  return results;
}

function extractCellName(source) {
  if (!source) return null;
  // Strip leading line- and block-comments + whitespace so cells whose
  // source begins with section banners (e.g. `// --- DSL Parser ---\n`)
  // still match the name patterns below. Without this, a comment-prefixed
  // cell like `// hdr\nfunction foo(){...}` returns null and a subsequent
  // `--cells foo` push inserts a duplicate at the end of the notebook
  // instead of replacing the existing cell.
  let body = source;
  while (true) {
    const before = body;
    body = body.replace(/^\s+/, '');
    body = body.replace(/^\/\/[^\n]*\n?/, '');
    body = body.replace(/^\/\*[\s\S]*?\*\//, '');
    if (body === before) break;
  }
  if (body.startsWith('import ')) return body.trim();
  const m = body.match(/^(viewof\s+\w+|mutable\s+\w+|\w+)\s*=/);
  if (m) return m[1];
  // Observable also names cells from function/class declarations
  const fn = body.match(/^(?:async\s+)?function\s*\*?\s+(\w+)\s*\(/);
  if (fn) return fn[1];
  const cls = body.match(/^class\s+(\w+)\b/);
  if (cls) return cls[1];
  return null;
}

// --- Cookie extraction ---

function decodeICookieExpiration(iValue) {
  try {
    const middle = iValue.split('.')[0];
    const json = Buffer.from(middle, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    return typeof payload.expiration === 'number' ? payload.expiration : null;
  } catch {
    return null;
  }
}

async function extractCookies(options) {
  // Cookie-file shortcut: bypasses Playwright entirely. Per
  // knowledge/pushing-cells-to-observablehq.md, headless Playwright
  // cookie extraction is unreliable (Observable's anti-bot wipes the
  // HttpOnly T/I cookies on probe). Pasting from devtools into a JSON
  // file is the recommended workaround.
  if (options.cookiesFile) {
    const raw = fs.readFileSync(options.cookiesFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.T || !parsed.I) {
      throw new Error(`${options.cookiesFile}: missing 'T' or 'I' field`);
    }
    // The I cookie is a JWT with a base64url-encoded JSON payload that
    // includes an `expiration` field (epoch ms). Surface staleness BEFORE
    // hitting the API so the user knows exactly which cookie to refresh.
    const iExpiry = decodeICookieExpiration(parsed.I);
    if (iExpiry && iExpiry < Date.now()) {
      throw new Error(
        `${options.cookiesFile}: I cookie expired on ${new Date(iExpiry).toISOString()} ` +
        `(${Math.round((Date.now() - iExpiry) / 86400000)} day(s) ago). Refresh I from devtools.`
      );
    }
    const resp = await fetch('https://api.observablehq.com/user', {
      headers: {
        'Cookie': `I=${parsed.I}; T=${parsed.T}`,
        'Origin': 'https://observablehq.com',
      },
    });
    const user = await resp.json();
    if (!user?.login) {
      const iDesc = iExpiry
        ? `I expires ${new Date(iExpiry).toISOString()} (not stale)`
        : 'I payload not decodable';
      throw new Error(
        `Cookies in ${options.cookiesFile} did not authenticate (user API returned ${JSON.stringify(user)}). ` +
        `${iDesc}; T may be stale — re-paste both from devtools.`
      );
    }
    log(`Authenticated as ${user.login} (cookies-file)`);
    return { T: parsed.T, I: parsed.I };
  }

  if (!fs.existsSync(options.profile)) {
    throw new Error(
      `Browser profile not found: ${options.profile}\n` +
      'Log in first with: node tools/lope-push-ws.js --login --headed'
    );
  }

  log('Extracting auth cookies from browser profile...');
  const browser = await chromium.launchPersistentContext(options.profile, {
    headless: true,
  });

  try {
    // Visit Observable to refresh session cookies (they may be stale)
    const page = await browser.newPage();
    await page.goto('https://observablehq.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
    await page.close();

    const cookies = await browser.cookies();
    const T = cookies.find(c => c.name === 'T' && c.domain.includes('observablehq'));
    const I = cookies.find(c => c.name === 'I' && c.domain.includes('observablehq'));

    if (!T || !I) {
      throw new Error(
        'Auth cookies not found in browser profile.\n' +
        'Log in first with: node tools/lope-push-ws.js --login --headed'
      );
    }

    // Check expiry
    const now = Date.now() / 1000;
    if (T.expires > 0 && T.expires < now) {
      throw new Error(
        `T cookie expired ${new Date(T.expires * 1000).toISOString()}.\n` +
        'Re-login with: node tools/lope-push-ws.js --login --headed'
      );
    }
    if (I.expires > 0 && I.expires < now) {
      throw new Error(
        `I cookie expired ${new Date(I.expires * 1000).toISOString()}.\n` +
        'Re-login with: node tools/lope-push-ws.js --login --headed'
      );
    }

    // Validate auth works
    const resp = await fetch('https://api.observablehq.com/user', {
      headers: {
        'Cookie': `I=${I.value}; T=${T.value}`,
        'Origin': 'https://observablehq.com',
      },
    });
    const user = await resp.json();
    if (!user?.login) {
      throw new Error(
        'Session expired (user API returned null).\n' +
        'Re-login with: node tools/lope-push-ws.js --login --headed'
      );
    }
    log(`Authenticated as ${user.login}`);

    return { T: T.value, I: I.value };
  } finally {
    await browser.close();
  }
}

// --- Observable API ---

/**
 * Extract notebook ID from an Observable URL.
 * Supports formats:
 *   https://observablehq.com/d/ab5f35ca1f4066ba
 *   https://observablehq.com/@tomlarkworthy/blank-notebook
 */
function extractNotebookSlug(targetUrl) {
  const url = new URL(targetUrl);
  // /d/{id} format - return the hex ID directly
  const dMatch = url.pathname.match(/^\/d\/([a-f0-9]+)$/);
  if (dMatch) return dMatch[1];
  // /@author/slug format
  const slugMatch = url.pathname.match(/^\/@([^/]+)\/([^/]+)/);
  if (slugMatch) return `@${slugMatch[1]}/${slugMatch[2]}`;
  throw new Error(`Cannot parse Observable URL: ${targetUrl}`);
}

/**
 * Fetch the notebook document from Observable's API.
 * Returns { id, version, nodes: [{ id, name, value, pinned, mode }] }
 *
 * Note: Origin header is required for cookie-based auth to return roles/sharing.
 */
async function fetchNotebook(slug, cookies) {
  const resp = await fetch(`https://api.observablehq.com/document/${slug}`, {
    headers: {
      'Cookie': `T=${cookies.T}; I=${cookies.I}`,
      'Origin': 'https://observablehq.com',
    },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch notebook: ${resp.status} ${resp.statusText}`);
  }
  const doc = await resp.json();
  if (!doc.roles?.includes('editor')) {
    throw new Error(
      `No editor role for this notebook (roles: ${JSON.stringify(doc.roles)}).\n` +
      'Ensure your login has edit access, or re-login with: node tools/lope-push-ws.js --login --headed'
    );
  }
  return doc;
}

/**
 * Connect to Observable's WebSocket editing endpoint.
 *
 * The hello message must include the current document version (from the API).
 * Sending version 0 causes a 404 error.
 *
 * Returns a promise that resolves with a connected ObservableWS instance.
 */
function connectWS(notebookId, cookies, docVersion, options) {
  return new Promise((resolve, reject) => {
    const url = `wss://ws.observablehq.com/document/${notebookId}/edit`;
    if (options.verbose) log(`Connecting to ${url}`);

    const ws = new WebSocket(url, {
      headers: {
        'Origin': 'https://observablehq.com',
        'Cookie': `T=${cookies.T}; I=${cookies.I}`,
      },
    });

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket connection timeout'));
    }, options.timeout);

    let version = null;
    let subversion = null;

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (options.verbose) log(`<< ${JSON.stringify(msg).slice(0, 200)}`);

      if (msg.type === 'hello') {
        // Connection accepted
      } else if (msg.type === 'load') {
        clearTimeout(timeout);
        version = msg.version;
        subversion = msg.subversion;
        // Apply any queued events
        for (const evt of msg.events || []) {
          if (evt.version) version = evt.version;
        }
        resolve({
          ws,
          version,
          subversion,
          send(msg) {
            if (options.verbose) log(`>> ${JSON.stringify(msg).slice(0, 200)}`);
            ws.send(JSON.stringify(msg));
          },
        });
      } else if (msg.type === 'error') {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${msg.message} (status ${msg.status})`));
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
    });

    ws.on('open', () => {
      if (options.verbose) log(`WebSocket connected, sending hello with version ${docVersion}...`);
      ws.send(JSON.stringify({
        type: 'hello',
        token: cookies.T,
        version: docVersion,
        next: true,
      }));
    });
  });
}

/**
 * Wait for a saveconfirm message with the expected version.
 */
function waitForConfirm(ws, expectedVersion, options) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for saveconfirm v${expectedVersion}`));
    }, options.timeout);

    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'saveconfirm' && msg.version === expectedVersion) {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        resolve({ version: msg.version, subversion: msg.subversion });
      } else if (msg.type === 'error') {
        clearTimeout(timeout);
        ws.removeListener('message', handler);
        reject(new Error(`Save error: ${msg.message} (status ${msg.status})`));
      }
    };

    ws.on('message', handler);
  });
}

// --- Push operations ---

/**
 * Push cells via WebSocket. Performs a full replace:
 * 1. Insert all new cells
 * 2. Delete all old cells (unless --no-delete)
 */
async function pushViaWS(decompiled, targetUrl, options) {
  const slug = extractNotebookSlug(targetUrl);
  const cookies = await extractCookies(options);

  // Fetch current notebook state
  log(`Fetching notebook ${slug}...`);
  const notebook = await fetchNotebook(slug, cookies);
  const notebookId = notebook.id;
  const existingNodes = notebook.nodes || [];
  const docVersion = notebook.version || notebook.latest_version;
  log(`Notebook ${notebookId}: ${existingNodes.length} existing cell(s), version ${docVersion}`);

  // Connect to WebSocket
  log('Connecting to Observable WebSocket...');
  const conn = await connectWS(notebookId, cookies, docVersion, options);
  log(`Connected at version ${conn.version}`);

  try {
    let { version, subversion } = conn;

    if ((options.cells || options.cellsMatchBody) && !options.noDelete) {
      // --- In-place cell replacement mode ---
      const finalState = await replaceCellsViaWS(conn, existingNodes, decompiled, options);
      if (finalState) {
        version = finalState.version;
        subversion = finalState.subversion;
      }
    } else {
      // --- Full replace mode ---
      // 1. Insert new cells
      const newNodeIds = [];
      for (let i = 0; i < decompiled.length; i++) {
        const cellSource = decompiled[i];
        const newVersion = version + 1;
        const nodeId = newVersion; // Observable requires node_id = event version

        log(`Inserting cell ${i + 1}/${decompiled.length}: ${extractCellName(cellSource) || '(anonymous)'}...`);

        // Insert before the first existing cell (new_next_node_id = first existing node)
        // or at end (null) if no existing cells
        const nextNodeId = i === 0 && existingNodes.length > 0
          ? existingNodes[0].id
          : (newNodeIds.length > 0 ? null : null);

        conn.send({
          type: 'save',
          events: [{
            version: newVersion,
            type: 'insert_node',
            node_id: nodeId,
            new_next_node_id: nextNodeId,
            new_node_value: cellSource,
            new_node_pinned: false,
            new_node_mode: 'js',
            new_node_data: null,
            new_node_name: null,
          }],
          edits: [],
          version,
          subversion,
        });

        const confirm = await waitForConfirm(conn.ws, newVersion, options);
        version = confirm.version;
        subversion = confirm.subversion;
        newNodeIds.push(nodeId);
      }

      log(`Inserted ${newNodeIds.length} new cells`);

      // 2. Delete old cells (unless --no-delete)
      if (!options.noDelete && existingNodes.length > 0) {
        log(`Deleting ${existingNodes.length} old cells...`);
        for (const node of existingNodes) {
          const newVersion = version + 1;
          conn.send({
            type: 'save',
            events: [{
              version: newVersion,
              type: 'remove_node',
              node_id: node.id,
            }],
            edits: [],
            version,
            subversion,
          });

          const confirm = await waitForConfirm(conn.ws, newVersion, options);
          version = confirm.version;
          subversion = confirm.subversion;
        }
        log(`Deleted ${existingNodes.length} old cells`);
      }
    }

    log(`Push complete! Final version: ${version}`);
  } finally {
    conn.ws.close();
  }
}

/**
 * Replace specific cells in-place by matching cell names.
 */
async function replaceCellsViaWS(conn, existingNodes, decompiled, options) {
  let { version, subversion } = conn;

  // Build name → source map from decompiled cells
  const replacements = new Map();
  for (const source of decompiled) {
    const name = extractCellName(source);
    if (name) replacements.set(name, source);
  }

  // Build name → node map from existing cells
  const existingByName = new Map();
  for (const node of existingNodes) {
    const name = extractCellName(node.value);
    if (name) existingByName.set(name, node);
  }

  // Match cells
  const matches = [];
  const inserts = [];
  if (options.cells) {
    for (const [name, source] of replacements) {
      const existing = existingByName.get(name);
      if (existing) {
        matches.push({ name, nodeId: existing.id, newSource: source, oldSource: existing.value });
      } else {
        inserts.push({ name, newSource: source });
      }
    }
  }

  // Body-substring matches — for anonymous cells with no parsable name.
  // Requires exactly one match in decompiled AND in existing; modify_node only (never insert).
  if (options.cellsMatchBody) {
    for (const substr of options.cellsMatchBody) {
      const newCandidates = decompiled.filter(s => s.includes(substr));
      if (newCandidates.length === 0) {
        throw new Error(`--cells-match-body "${substr}": no decompiled cell contains this substring`);
      }
      if (newCandidates.length > 1) {
        throw new Error(`--cells-match-body "${substr}": ${newCandidates.length} decompiled cells contain this substring; refine the substring`);
      }
      const oldCandidates = existingNodes.filter(n => typeof n.value === 'string' && n.value.includes(substr));
      if (oldCandidates.length === 0) {
        throw new Error(`--cells-match-body "${substr}": no existing node contains this substring (already pushed? wrong notebook?)`);
      }
      if (oldCandidates.length > 1) {
        throw new Error(`--cells-match-body "${substr}": ${oldCandidates.length} existing nodes contain this substring; refine the substring`);
      }
      const label = `body:${substr.length > 30 ? substr.slice(0, 30) + '…' : substr}`;
      matches.push({ name: label, nodeId: oldCandidates[0].id, newSource: newCandidates[0], oldSource: oldCandidates[0].value });
    }
  }

  if (matches.length === 0 && inserts.length === 0) {
    log('No matching cells found for replacement.');
    if (options.cells) log(`Looked for: ${[...replacements.keys()].join(', ')}`);
    log(`Found in target: ${existingNodes.filter(n => extractCellName(n.value)).map(n => extractCellName(n.value)).join(', ')}`);
    return { version, subversion };
  }

  if (matches.length > 0) {
    log(`Replacing ${matches.length} cell(s): ${matches.map(m => m.name).join(', ')}`);
    for (const { name, nodeId, newSource, oldSource } of matches) {
      if (newSource === oldSource) {
        log(`  "${name}" — unchanged, skipping`);
        continue;
      }
      const newVersion = version + 1;
      log(`  "${name}" (node ${nodeId}) — updating...`);
      conn.send({
        type: 'save',
        events: [{
          version: newVersion,
          type: 'modify_node',
          node_id: nodeId,
          new_node_value: newSource,
        }],
        edits: [],
        version,
        subversion,
      });
      const confirm = await waitForConfirm(conn.ws, newVersion, options);
      version = confirm.version;
      subversion = confirm.subversion;
    }
  }

  if (inserts.length > 0) {
    log(`Inserting ${inserts.length} new cell(s): ${inserts.map(i => i.name).join(', ')}`);
    for (const { name, newSource } of inserts) {
      const newVersion = version + 1;
      const nodeId = newVersion;
      log(`  "${name}" — inserting at end (node ${nodeId})...`);
      conn.send({
        type: 'save',
        events: [{
          version: newVersion,
          type: 'insert_node',
          node_id: nodeId,
          new_next_node_id: null,
          new_node_value: newSource,
          new_node_pinned: false,
          new_node_mode: 'js',
          new_node_data: null,
          new_node_name: null,
        }],
        edits: [],
        version,
        subversion,
      });
      const confirm = await waitForConfirm(conn.ws, newVersion, options);
      version = confirm.version;
      subversion = confirm.subversion;
    }
  }

  return { version, subversion };
}

// --- Main ---

async function main() {
  const options = parseArgs(process.argv);

  // --login mode: open browser for manual login, then exit
  if (options.login) {
    log(`Opening browser for login (profile: ${options.profile})...`);
    if (!fs.existsSync(options.profile)) {
      fs.mkdirSync(options.profile, { recursive: true });
    }
    const browser = await chromium.launchPersistentContext(options.profile, {
      headless: !options.headed,
      viewport: { width: 1920, height: 1080 },
    });
    const page = await browser.newPage();
    await page.goto('https://observablehq.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    log('Please log in to Observable. Press Ctrl+C when done.');
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
  const notebookPath = path.resolve(options.notebook);
  if (!fs.existsSync(notebookPath)) {
    console.error(`Error: Notebook not found: ${notebookPath}`);
    process.exit(1);
  }

  // Fast-fail auth probe — happens BEFORE Playwright spin-up + decompile (~30s
  // each), so a stale cookies file fails in ~1s instead of after wasted setup.
  // Only runs in real (non-dry-run) flows that have a --cookies-file; the
  // browser-profile cookie path keeps its later validation in pushViaWS().
  if (options.cookiesFile && !options.dryRun) {
    log('Validating cookies before decompile (fast-fail)...');
    await extractCookies(options);
  }

  // Fall back to spec file's upstreams map if no --target.
  // Schema: upstreams[host][module] = url. Legacy: top-level "observablehq.com" string.
  if (!options.target && !options.dryRun) {
    const specPath = notebookPath.replace(/\.html$/, '.json');
    if (fs.existsSync(specPath)) {
      try {
        const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
        const moduleUrl = spec?.upstreams?.["observablehq.com"]?.[options.module];
        if (moduleUrl) {
          options.target = moduleUrl;
          log(`Using target from spec upstreams[observablehq.com][${options.module}]: ${options.target}`);
        } else if (spec["observablehq.com"]) {
          options.target = spec["observablehq.com"];
          log(`Using target from spec (legacy field): ${options.target}`);
        }
      } catch (e) {}
    }
    if (!options.target) {
      console.error('Error: --target is required (or use --dry-run). Tip: run jumpgate first to populate the spec.');
      process.exit(1);
    }
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
  // Load the toolchain up front so its acorn splits the module (see parseVariableGroups)
  // and its decompile turns the cells back into source — one runtime, one parser.
  const toolchain = await loadToolchain(options);
  let { groups: variableGroupsRaw, preformatted: importCells } = parseVariableGroups(moduleContent, toolchain.acorn);
  let variableGroups = variableGroupsRaw;

  if (variableGroups.length === 0 && importCells.length === 0) {
    console.error('Error: No variables extracted from module');
    process.exit(1);
  }

  log(`Extracted ${variableGroups.length} variable groups + ${importCells.length} import statements from ${options.module}`);

  // Filter by --cells if specified
  if (options.cells) {
    const filterSet = new Set(options.cells);
    const before = variableGroups.length;
    variableGroups = variableGroups.filter(group =>
      group.some(v => v._name && filterSet.has(v._name))
    );
    log(`Filtered to ${variableGroups.length}/${before} groups matching: ${options.cells.join(', ')}`);

    if (variableGroups.length === 0) {
      console.error(`Error: No variable groups matched --cells filter: ${options.cells.join(', ')}`);
      console.error('Tip: use --dry-run without --cells to see all available cell names');
      process.exit(1);
    }

    // Imports are matched by byte-exact text in replaceCellsViaWS, which is
    // brittle: Observable reformats `import { ... }` whitespace, so the
    // local single-line decompile rarely byte-matches the existing
    // multi-line form on Observable. Mismatched imports get classified as
    // new and `insert_node`'d alongside the original, producing duplicate
    // imports of the same symbols. When the caller opted into a narrow
    // --cells update, drop imports entirely — they should already exist on
    // Observable from previous pushes.
    if (importCells.length > 0) {
      log(`Dropping ${importCells.length} import(s) (--cells is for narrow updates; rerun without it to refresh imports)`);
      importCells = [];
    }
  }

  // Decompile variable groups using the same toolchain instance, then release it.
  const decompiled = await decompileVariables(variableGroups, toolchain.decompile, options);
  toolchain.dispose();

  // Combine decompiled cells + pre-formatted import statements
  // No sacrificial cell needed — WS inserts are precise
  const cells = [...decompiled, ...importCells];

  if (cells.length === 0) {
    console.error('Error: No cells produced by decompilation');
    process.exit(1);
  }

  log(`Decompiled ${decompiled.length} cells + ${importCells.length} imports = ${cells.length} total`);

  if (options.dump) {
    fs.writeFileSync(options.dump, JSON.stringify(decompiled.map((src, i) => ({
      names: variableGroups[i] ? variableGroups[i].map(v => v._name || null) : [],
      source: src,
    })).concat(importCells.map(src => ({ names: [], source: src }))), null, 1));
    log(`Wrote ${cells.length} decompiled cells to ${options.dump}`);
  }

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
    await pushViaWS(cells, options.target, options);
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    if (options.verbose) console.error(err.stack);
    process.exit(1);
  }
}

export { parseVariableGroups, parseNotebook, extractCellName };

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
