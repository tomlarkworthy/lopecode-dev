#!/usr/bin/env bun
/**
 * Lopecode Channel Server
 *
 * Bridges Lopecode notebooks (WebSocket) to Claude Code (MCP stdio).
 * Notebooks connect over ws://127.0.0.1:8787, Claude interacts via MCP tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ServerWebSocket } from "bun";
import { join, dirname, basename, resolve, sep as pathSep } from "path";
import { mkdirSync, writeFileSync, readdirSync, statSync, watchFile, unwatchFile, readFileSync as fsReadFileSync } from "fs";
import { mkdir as fsMkdir, readdir as fsReaddir, readFile as fsReadFile, writeFile as fsWriteFile, stat as fsStat, rm as fsRm, utimes as fsUtimes } from "fs/promises";
import { homedir } from "os";

// --- Configuration ---
const REQUESTED_PORT = Number(process.env.LOPECODE_PORT ?? 0); // 0 = OS picks a free port
let PORT = REQUESTED_PORT;

// Shared default fakefs root: every channel session writes file-sync output here unless
// the caller passes an explicit `fakefs_root`. Parallel bug-fix sessions share this directory
// (per-notebook subdirs are keyed by notebook ID, so collisions only happen when two sessions
// target the same notebook — coordinate manually in that case).
const DEFAULT_FAKEFS_ROOT = process.env.LOPECODE_FAKEFS_ROOT ?? "/tmp/lopecode-fakefs";

// --- Pairing token (generated after port binding) ---
function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `LOPE-${PORT}-${code}`;
}

let PAIRING_TOKEN = "";

// --- State ---
type ConnectionMeta = { url: string; title: string; modules?: string[] };

const pendingConnections = new Set<ServerWebSocket<unknown>>();
const pairedConnections = new Map<string, ServerWebSocket<unknown>>(); // notebook URL → ws
const connectionMeta = new Map<ServerWebSocket<unknown>, ConnectionMeta>();
const wsBySocket = new Map<ServerWebSocket<unknown>, string>(); // ws → notebook URL (reverse lookup)

// Command correlation for async request-response
type PendingCommand = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timer: ReturnType<typeof setTimeout>;
};
const pendingCommands = new Map<string, PendingCommand>();
let commandSeq = 0;

// Dynamic tools registered by notebooks (notebook URL → tool descriptors)
type DynamicTool = { name: string; description: string; inputSchema: any; notebookUrl: string };
const dynamicTools = new Map<string, DynamicTool[]>(); // notebook URL → tools

function nextCommandId(): string {
  return `cmd-${Date.now()}-${++commandSeq}`;
}

// --- QA browser (Playwright-driven Chromium for visual QA) ---
// Multi-session model: each named session owns one browser, one page, and its
// own log buffers. All qa_* tools take an optional `session` (default
// "default"), so parallel QA runs (subagents, two notebooks) don't collide.
type PwBrowser = import("playwright").Browser;
type PwPage = import("playwright").Page;
type QaConsoleEntry = { ts: number; type: string; text: string; location?: string };
type QaErrorEntry = { ts: number; message: string; stack?: string };
type QaFailedRequest = { ts: number; url: string; method: string; failure: string };
type QaSession = {
  browser: PwBrowser;
  page: PwPage;
  console: QaConsoleEntry[];
  errors: QaErrorEntry[];
  failedRequests: QaFailedRequest[];
};
const DEFAULT_QA_SESSION = "default";
const qaSessions = new Map<string, QaSession>();
// In-flight launches. ensureQaSession awaits between the liveness check and the
// map assignment; without this mutex two concurrent qa_open_notebook calls both
// launch and the loser's browser is orphaned — a window qa_close can never reach.
const qaLaunching = new Map<string, Promise<QaSession>>();
// Per-session open serialization: two concurrent qa_open_notebook calls on the
// same session would otherwise race page.goto on one page and the loser gets
// net::ERR_ABORTED. Chain them instead; last caller's URL wins the final state.
const qaOpenChains = new Map<string, Promise<unknown>>();

function serializeQaOpen<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const prev = qaOpenChains.get(name) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  qaOpenChains.set(name, next.catch(() => {}));
  return next;
}

function qaSessionName(args: Record<string, unknown>): string {
  return typeof args.session === "string" && args.session ? (args.session as string) : DEFAULT_QA_SESSION;
}

// Patterns dropped from qa_console_logs by default. Each was observed >5x per
// QA session and never carries diagnostic signal. To see all logs anyway pass
// include_noise: true; never expand this list without confirming the pattern
// is genuinely silent under failure conditions too.
const QA_DEFAULT_NOISE = [
  /^keepalive: dynamic observe /,
  /^selectVariable Variable/,
  /^notebookImports$/,
  /^notebookImportVariables$/,
  /^notebookImportMatches$/,
  /^pageImportMatch$/,
  /^resolve_modules$/,
  /^generate summary$/,
  /^submit_summary$/,
  /^module_definition_variables$/,
  /^modules$/,
  /^creating visualizer$/,
  /^code_editor(_view)?$/,
  /^Loading codemirror from blob:/,
  /^jest\/expect version /,
  /^\[lopecode fakefs\] /,
  /^responding /,
  /^background job$/,
];
const QA_BUFFER_LIMIT = 1000; // ring-buffer cap per stream

function pushBounded<T>(arr: T[], item: T) {
  arr.push(item);
  if (arr.length > QA_BUFFER_LIMIT) arr.shift();
}

// Default permissions auto-granted to QA browser contexts.
// Notebooks commonly use the clipboard (e.g. cellsToClipboard); without grants
// Chromium pops a permission prompt that the agent can't dismiss, so the
// interaction silently fails. Auto-grant the cheap, low-risk ones; let callers
// override via the qa_open_notebook `permissions` arg.
const DEFAULT_QA_PERMISSIONS: string[] = ["clipboard-read", "clipboard-write"];

type QaLaunchOpts = {
  headless?: boolean;
  viewport?: { width: number; height: number };
  permissions?: string[];
  fakefsRoot?: string;
  disableWebSecurity?: boolean;
  chromiumArgs?: string[];
};

async function ensureQaSession(name: string, opts: QaLaunchOpts = {}): Promise<QaSession> {
  const inflight = qaLaunching.get(name);
  if (inflight) return inflight;
  const existing = qaSessions.get(name);
  if (existing && !existing.page.isClosed()) return existing;
  // The page is gone but a browser may still be alive — e.g. it was closed out
  // from under us (window closed, crash) without the close handler reaching it.
  // Launching without tearing it down orphans that window, so the next qa_close
  // (which only closes tracked sessions) could never reach it.
  if (existing) await closeQaSession(name);
  const launch = launchQaSession(name, opts);
  qaLaunching.set(name, launch);
  try {
    return await launch;
  } finally {
    qaLaunching.delete(name);
  }
}

async function launchQaSession(name: string, opts: QaLaunchOpts): Promise<QaSession> {
  const { chromium } = await import("playwright");
  // Disabling web security turns off same-origin/CORS enforcement so a notebook
  // can fetch cross-origin without proxying — for local testing only. Do NOT
  // also disable site isolation: forcing single-process rendering deadlocks
  // worker-heavy notebooks (e.g. the pairing layout's isomorphic-git/lightning-fs
  // workers), and --disable-web-security bypasses CORS on its own for top-frame
  // fetches anyway.
  const launchArgs = [...(opts.chromiumArgs ?? [])];
  if (opts.disableWebSecurity) launchArgs.push("--disable-web-security");
  const browser = await chromium.launch({
    headless: opts.headless ?? false,
    args: launchArgs.length ? launchArgs : undefined,
  });
  const ctx = await browser.newContext({
    viewport: opts.viewport ?? { width: 1280, height: 800 },
    ...(opts.disableWebSecurity ? { bypassCSP: true, ignoreHTTPSErrors: true } : {}),
  });
  const perms = opts.permissions ?? DEFAULT_QA_PERMISSIONS;
  if (perms.length) {
    try { await ctx.grantPermissions(perms); }
    catch (e: any) { process.stderr.write(`lopecode-channel: grantPermissions failed: ${e?.message ?? e}\n`); }
  }
  const page = await ctx.newPage();

  // fakefs root: caller's value wins; otherwise fall back to the shared default. We always
  // wire fakefs (even if caller didn't ask) so file-sync can disassemble without an OS dialog.
  {
    const rootAbs = resolve(opts.fakefsRoot ?? DEFAULT_FAKEFS_ROOT);
    await fsMkdir(rootAbs, { recursive: true });
    currentFakefsRoot = rootAbs;
    const initScript = fsReadFileSync(join(import.meta.dir, "fakefs-init.js"), "utf8");
    const cfg = { port: PORT, token: PAIRING_TOKEN, rootName: basename(rootAbs) };
    await ctx.addInitScript({ content: `window.__lopecode_fakefs = ${JSON.stringify(cfg)};\n${initScript}` });
    process.stderr.write(`lopecode-channel: fakefs root = ${rootAbs}${opts.fakefsRoot ? "" : " (default)"}\n`);
  }

  const session: QaSession = { browser, page, console: [], errors: [], failedRequests: [] };
  page.on("console", (m) => {
    const loc = m.location();
    pushBounded(session.console, {
      ts: Date.now(),
      type: m.type(),
      text: m.text(),
      location: loc.url ? `${loc.url}:${loc.lineNumber}:${loc.columnNumber}` : undefined,
    });
  });
  page.on("pageerror", (e) => pushBounded(session.errors, { ts: Date.now(), message: e.message, stack: e.stack }));
  page.on("requestfailed", (r) => pushBounded(session.failedRequests, {
    ts: Date.now(),
    url: r.url(),
    method: r.method(),
    failure: r.failure()?.errorText ?? "",
  }));
  page.on("close", () => {
    // One page per session: a dead page means the session is done. Tear it down
    // now so a stale window can't linger and the next open starts clean.
    // (Fires during closeQaSession too, but that already removed the session so
    // the guard below no-ops — no double close.)
    if (qaSessions.get(name) !== session) return;
    qaSessions.delete(name);
    if (qaSessions.size === 0) currentFakefsRoot = null;
    session.browser.close().catch(() => {});
  });
  qaSessions.set(name, session);
  return session;
}

// browser.close() can hang indefinitely when the renderer is wedged (e.g.
// paused on a `debugger;` statement). Never let that hang the MCP call.
const QA_CLOSE_TIMEOUT_MS = 10_000;

async function closeBrowserGuarded(b: PwBrowser, label: string): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = await Promise.race([
    b.close().then(() => false, () => false),
    new Promise<boolean>((res) => { timer = setTimeout(() => res(true), QA_CLOSE_TIMEOUT_MS); }),
  ]);
  clearTimeout(timer);
  if (timedOut) process.stderr.write(`lopecode-channel: ${label}: browser.close() timed out after ${QA_CLOSE_TIMEOUT_MS}ms\n`);
  return !timedOut;
}

// Returns false if the browser didn't confirm closing within the timeout.
async function closeQaSession(name: string): Promise<boolean> {
  const s = qaSessions.get(name);
  if (!s) return true;
  qaSessions.delete(name);
  if (qaSessions.size === 0) currentFakefsRoot = null;
  return closeBrowserGuarded(s.browser, `qa session '${name}'`);
}

// --- MCP Server ---
const mcp = new Server(
  { name: "lopecode", version: "1.0.0" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
      tools: { listChanged: true },
    },
    instructions: `You are connected to Lopecode notebooks via the lopecode channel.

Lopecode notebooks are self-contained HTML files built on the Observable runtime. Each notebook contains modules (collections of reactive cells). The Observable runtime provides reactive dataflow: cells automatically recompute when their dependencies change, like a spreadsheet.

## Starting a lopecode notebook

When the user asks to start/open a lopecode notebook, or start a pairing/collaboration session:
1. Call get_pairing_token to get the token (format: LOPE-PORT-XXXX)
2. Find the local notebook HTML file (e.g. lopecode/notebooks/@tomlarkworthy_blank-notebook.html or lopebooks/notebooks/...)
3. Construct a file:// URL with the hash layout and cc=TOKEN parameter:
   file:///absolute/path/to/@tomlarkworthy_blank-notebook.html#view=R100(S50(@tomlarkworthy/blank-notebook),S25(@tomlarkworthy/module-selection),S25(@tomlarkworthy/claude-code-pairing))&cc=TOKEN
4. Use the open_url tool to open it (this preserves hash fragments on file:// URLs — the macOS open command strips them)
5. Wait for the connected notification
6. Send a welcome message via reply

Always use file:// paths to local notebooks, never GitHub Pages URLs. The open_url tool handles the macOS bug where the open command strips hash fragments from file:// URLs.

If channels are not enabled, tell the user to restart with: claude --channels server:lopecode

## Headless pairing (no foreground browser)

If the user wants pairing without a visible browser window ("pair without a browser", "/pair-headless", "background pairing host"), use the \`pair-headless\` skill instead of open_url. It launches \`tools/headless-pairing-host.ts\` (Playwright headless Chromium) which holds the page open with no UI. Headless Chromium reports document.visibilityState = "visible" so the runtime is not throttled.

For non-QA flows that also need file-sync (write-to-disk), call \`enable_fakefs(path?)\` first to authorise the channel-side fs-pair handshake (defaults to /tmp/lopecode-fakefs). Then arrange for the page to inject \`tools/channel/fakefs-init.js\` to proxy showDirectoryPicker; the headless host does this automatically when given --fakefs-root. The skill orchestrates the whole flow.

## Observable Cell Syntax

Cells use Observable JavaScript. The define_cell tool accepts this syntax directly.

### Named cells
x = 42
greeting = \`Hello, \${name}!\`   // depends on 'name' cell — auto-recomputes when name changes

### Markdown
md\`# Title\nSome **bold** text\`

### HTML
htl.html\`<div style="color: red">Hello</div>\`

### Imports (from other modules in the notebook)
import {md} from "@tomlarkworthy/editable-md"
import {chart, data} from "@tomlarkworthy/my-viz"

### viewof — interactive inputs (creates TWO cells: "viewof X" for DOM, "X" for value)
viewof slider = Inputs.range([0, 100], {label: "Value", value: 50})
viewof name = Inputs.text({label: "Name"})
viewof choice = Inputs.select(["a", "b", "c"])

### mutable — imperative state
mutable counter = 0
// Other cells can do: mutable counter++

### Block cells (multi-statement)
result = {
  const data = await fetch(url).then(r => r.json());
  return data.filter(d => d.value > 10);
}

### Generator cells (streaming values)
ticker = {
  let i = 0;
  while (true) { yield i++; await Promises.delay(1000); }
}

## Testing

Any cell named test_* is a test. It passes if it doesn't throw:
test_addition = {
  if (add(2, 2) !== 4) throw new Error("Expected 4");
  return "2 + 2 = 4";
}

Use run_tests to execute all test_* cells.

## Typical workflow

1. create_module("@tomlarkworthy/my-app")
2. define_cell('import {md} from "@tomlarkworthy/editable-md"', module: "...")
3. define_cell('title = md\`# My App\`', module: "...")
4. define_cell('viewof name = Inputs.text({label: "Name"})', module: "...")
5. define_cell('greeting = md\`Hello, **\${name}**!\`', module: "...")
6. export_notebook() to persist cells to disk

## Tool guidance

- define_cell: PRIMARY tool for creating content. Accepts Observable source, compiles via toolchain. Use for almost everything.
- update_cell: Replace an existing cell's source in place. Targets a single variable by \`pid\` (preferred — survives renames) or \`name\`. Preserves position in the runtime variable Set (display order) and reuses an anonymous cell's identity instead of appending a duplicate. Use this for editing markdown/anonymous cells that \`define_cell\` would otherwise duplicate.
- delete_cell: Remove a single cell by \`pid\` or \`name\`. Use this for anonymous cells (markdown, tests, broken cells) that \`delete_variable\` can't target.
- list_cells: Includes anonymous cells by default — each entry has a \`pid\` (the addressable identifier for \`update_cell\`/\`delete_cell\`).
- eval_code: For throwaway/ephemeral actions. Lost on reload. NEVER use define_cell for one-off side effects. Code body runs inside an async IIFE; you can use top-level \`await\` and \`await import(...)\`. Single-expression bodies (no semicolons, no leading statement keyword) are auto-\`return\`ed — \`1+1\` and \`document.querySelector('.x')\` work directly. Statement-style bodies need an explicit \`return\`. Common uses:
  - Reload the page: \`location.reload()\` — use after sync-module to pick up changes, or to fix broken runtime state
  - DOM inspection: \`return document.querySelector('.foo')?.textContent\`
  - Debugging: \`return runtime._variables.size\`
- define_variable: Low-level escape hatch with explicit function string + inputs array. Use when you need precise control over variable names and inputs that the compiler might mangle.
- run_tests: Run \`test_*\` variables and return pass/fail/timeout results. Prefer this over inspecting \`viewof suite\` internals with \`eval_code\` after a \`define_cell\` that adds a test.
- export_notebook: Persists ALL runtime state to the HTML file — re-serializes every embedded module, producing large incidental diffs. Use export_module for scoped, single-module edits where you don't want every other module's <script> rewritten.
- export_module: Surgically writes one module's compiled \`<script>\` block back to disk, leaving the other modules byte-identical. Preferred for bug-fix or feature commits scoped to a single module — keeps the git diff focused.
- fork_notebook: Forks the notebook into a new browser tab via exporter-2.

### QA tips (qa_click, qa_type)
- Coordinates aren't stable across clicks. Observable cells re-layout reactively, so a button you clicked at (x,y) may have moved or scrolled out of view by the next interaction. Don't reuse coordinates from an earlier click or from a screenshot taken before any DOM mutation.
- Re-query before each interaction: use \`eval_code\` to find the element, scroll it into view, and read its rect, then click the returned coords. Example:
  \`\`\`
  eval_code: \`(() => {
    const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("➕"));
    btn.scrollIntoView({block: "center"});
    const r = btn.getBoundingClientRect();
    return {x: r.x + r.width/2, y: r.y + r.height/2};
  })()\`
  \`\`\`
- If \`qa_screenshot\` times out shortly after \`qa_open_notebook\`, the page is still loading; wait or call \`qa_console_logs\` first (it doesn't block on render).
- Parallel QA: every qa_* tool takes an optional \`session\` name (default 'default'). Distinct sessions are fully independent browsers with their own log buffers — use them to QA two notebooks (or two states of one notebook) side by side. \`qa_close\` with no args closes all sessions.
- Re-opening a URL in an existing session always does a full document reload (via an about:blank hop), so edits to the HTML on disk are picked up — no need to qa_close first.

## File-sync mirror tree

When a notebook is loaded with \`?filesync=...\`, every \`<sync-target>/<author>/*.js\` file is auto-imported into the runtime as a module. Don't put backups, scratch copies, or unrelated drafts in that tree — \`@tomlarkworthy/at-write.live-fork.bak.js\` next to \`at-write.js\` will be loaded as module \`@tomlarkworthy/at-write.live-fork.bak\` and wired into the dependency graph. Keep working backups outside the synced tree (e.g. under \`tools/staging/\`).

## Channel signal vs. noise

Channel \`variable_update\` and \`history\` events arrive as system reminders. They're ambient signal — most are routine (hash, currentModules, rerun history) and don't need a text response. Reply only when the event represents new information for an in-flight diagnosis (e.g. you were watching a variable and it changed) or when the user asks something. Don't acknowledge passive events with "Standing by." or similar — that just clutters the transcript.

## High-level cell patterns (define_cell)

define_cell accepts Observable Notebook 1.0 syntax. Key patterns:

### Inputs listing
Every free variable a cell reads must be declared. The compiler auto-detects most, but be aware:
- \`Inputs\`, \`htl\`, \`d3\`, \`Plot\`, \`md\`, \`width\` are standard library globals
- \`viewof x\` gives the DOM element; \`x\` gives the extracted value
- Any cell reading variable \`x\` re-evaluates when \`x\` changes

### UI patterns
\`\`\`
// Counter button
viewof count = Inputs.button("Increment", {value: 0, reduce: v => v + 1})

// Toggle
viewof ready = Inputs.toggle({label: "Ready", value: false})

// Dropdown
viewof choice = Inputs.select(["a", "b", "c"], {value: "a"})

// Form (single view returning an object)
viewof config = Inputs.form({
  name: Inputs.text({label: "Name"}),
  size: Inputs.range([1, 100], {label: "Size", value: 50})
})
\`\`\`

### Imports (ESM CDN with pinned version)
\`\`\`
dateFns = await import("https://cdn.jsdelivr.net/npm/date-fns@4.1.0/+esm")
\`\`\`

### Reactive block cell
\`\`\`
result = {
  const data = await fetch(url).then(r => r.json());
  return data.filter(d => d.value > 10);
}
\`\`\`

### Importing runtime-sdk
Runtime-sdk exports (like \`runtime\`) are reactive views — they must be imported as Observable cell dependencies, not via \`await import()\`.

\`\`\`
// Correct: import as a cell
import {runtime} from "@tomlarkworthy/runtime-sdk"

// Then reference inside a block cell to capture as closure
myCell = {
  const _runtime = runtime;  // captured as Observable dependency
  return function(...) { /* use _runtime here */ };
}
\`\`\`

Never use \`window.__ojs_runtime\` in userspace — always import \`runtime\` from runtime-sdk.

### Module lookup via currentModules
The runtime variable \`currentModules\` (from @tomlarkworthy/module-map) is a Map containing all modules in the notebook. Each entry value has \`{ name, module, dependsOn, dependedBy }\`. Use this for module discovery — \`runtime.mains\` only contains booted top-level modules, not imported dependencies like exporter-2.

### Block cells with dependencies
To create a cell that depends on other cells and returns a computed value, use a block:

\`\`\`
// Block cell — Observable infers dependencies from variable references
myFn = {
  const dep = someOtherCell;  // creates dependency on someOtherCell
  return function(x) { return dep + x; };
}
\`\`\`

Do NOT use \`myFn = function(dep) { ... }\` — Observable treats named function params as dependency injection, making the function itself the cell's value rather than calling it.

### Self-modifying cells
To rewrite a cell's own source (e.g., to persist state in source code):

1. Tag the view element with a unique Symbol: \`root._tag = Symbol("my-tag")\`
2. Search \`runtime._variables\` for the variable whose \`_value\` has that tag
3. Read \`variable._inputs.map(i => i._name)\` for dependency names
4. Create new definition: \`Function(...inputNames, '"use strict"; return myFn(args, newData)')\`
5. Call \`variable.define(variable._name, inputNames, newDef)\`

Use a module-level Map (separate cell) to cache state (e.g. crypto keys) across redefinitions so the new instance can auto-recover without user input.

## Low-level variable patterns (define_variable)

define_variable gives direct control over variable name, inputs array, and definition function string. Use when:
- You need exact control over the variable name (e.g. "viewof x", "module @owner/notebook")
- The compiler would mangle inputs or produce wrong dependencies
- You're creating import loaders or runtime-level plumbing

### Key semantics
- A variable is a named reactive value defined as a function of its declared inputs
- Evaluation is topological: pending → fulfilled or rejected; rejection halts dependents
- viewof cells create TWO variables: "viewof x" (DOM) and "x" (value stream)
- Mutables create THREE: "initial x", "mutable x", and "x"
- Only reachable variables compute (visible or depended upon)

### Import pattern (two-step, must be named)
Never use ES module import syntax inside a runtime variable definition. Use the two-step pattern:

Step 1 — Loader variable:
  name: "module @owner/notebook"
  inputs: []
  definition: "async () => runtime.module((await import(\\"@owner/notebook\\")).default)"

Step 2 — Importer variable:
  name: "someSymbol"
  inputs: ["module @owner/notebook", "@variable"]
  definition: "(_, v) => v.import(\\"someSymbol\\", _)"

### Aliasing: v.import("original", "alias", _)
### viewof import: v.import("viewof x", _)
### mutable import: v.import("mutable x", _)

### Strict naming
Always name variables. Anonymous variables cannot be referenced as inputs by other cells. Every define_variable call should include a name.

## Message formats

User chat messages:
  <channel source="lopecode" type="message" notebook="..." sender="user">text</channel>

When a user message contains "[USER ATTACHED N SCREENSHOT(S)]" followed by file paths, you MUST use the Read tool to view each screenshot file before responding. These are images the user pasted into the chat.

Cell changes (automatic):
  <channel source="lopecode" type="cell_change" notebook="..." module="@author/mod" cell="cellName" op="upd">definition</channel>

Lifecycle:
  <channel source="lopecode" type="connected" notebook="...">title</channel>
  <channel source="lopecode" type="disconnected" notebook="...">title</channel>

Variable updates (when watching):
  <channel source="lopecode" type="variable_update" notebook="..." name="varName" module="@author/mod">value</channel>

## Compiled module format (low-level)

When editing module .js files directly, cells are compiled JavaScript, not Observable syntax. The pairing module source lives in lopecode/notebooks/@tomlarkworthy_claude-code-pairing.html.

### Cell function pattern
Each cell is a const function. The function name matches the cell name with _ prefix:
\`\`\`javascript
const _myCell = function _myCell(dep1, dep2){return(
  dep1 + dep2
)};
\`\`\`

### Registration in define()
The export default function define(runtime, observer) registers cells:
\`\`\`javascript
// Visual cell (gets an observer — renders in UI, controls render order)
$def("_myCell", "myCell", ["dep1", "dep2"], _myCell);

// Hidden cell (no observer — invisible, for internal logic)
main.variable().define("myCell", ["dep1", "dep2"], _myCell);
\`\`\`

### viewof pattern (compiled)
viewof creates TWO registrations — the DOM element and the extracted value:
\`\`\`javascript
const _myToggle = function _myToggle(){return(
  // Must return a DOM element with a .value property
  // Must dispatch "input" events when value changes
  (function() {
    var el = document.createElement("span");
    el.value = false;
    el.onclick = function() {
      el.value = !el.value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    return el;
  })()
)};

// In define():
$def("_myToggle", "viewof myToggle", [], _myToggle);
main.variable().define("myToggle", ["Generators", "viewof myToggle"], (G, v) => G.input(v));
\`\`\`

### Depending on viewof (getting the DOM element)
When a cell needs the DOM element (not the value), depend on "viewof X":
\`\`\`javascript
const _ui = function _ui(viewof_myToggle){return(
  // viewof_myToggle is the DOM element — embed it in your UI
  // This cell does NOT re-evaluate when the toggle value changes
)};

// In define():
$def("_ui", "ui", ["viewof myToggle"], _ui);
\`\`\`

### Key rules
- **Visual cells ($def) control render order** — first $def renders first in lopepage
- **Hidden cells (main.variable().define)** don't render but ARE included in exports
- **viewof value is extracted by Generators.input()** which reads .value on each "input" event
- **After syncing module .js to notebook HTML**, always export_notebook before pushing to Observable (export captures hidden cells that lope-push-ws otherwise misses from the raw module JS)
- **Pushing to ObservableHQ:** prefer \`node --experimental-vm-modules tools/lope-push-ws.js <notebook.html> --module @user/x --cells "a,b" --target <url> --cookies-file <path>\` with a \`{"T": "<hex>", "I": "<jwt>"}\` JSON file pasted from devtools (Application → Cookies → \`.observablehq.com\`). The browser-profile auth path is unreliable (headless Playwright wipes HttpOnly cookies); a stale \`I\` will surface its expiration date in the error message so you know which cookie to refresh.
- **Two observers cannot share a DOM element** — if viewof returns an element AND another cell appends it, they fight. Use viewof for the element source; the consuming cell depends on "viewof X" to receive it.
- **Cells re-evaluate when dependencies change** — a cell depending on a value (e.g. voiceEnabled boolean) re-runs on every toggle. A cell depending on viewof (the DOM element) only evaluates once.

IMPORTANT: Always specify the module parameter when calling define_variable, get_variable, etc.
Use the currentModules watch to identify the user's content module (not lopepage, module-selection, or claude-code-pairing).
When multiple notebooks are connected, specify notebook_id (the URL). When only one is connected, it's used automatically.`,
  }
);

// --- Helper: resolve notebook_id ---
function resolveNotebook(notebookId?: string): { ws: ServerWebSocket<unknown>; url: string } | { error: string } {
  if (notebookId) {
    const ws = pairedConnections.get(notebookId);
    if (!ws) return { error: `Notebook not connected: ${notebookId}` };
    return { ws, url: notebookId };
  }
  // If only one notebook connected, use it
  if (pairedConnections.size === 1) {
    const [url, ws] = [...pairedConnections.entries()][0];
    return { ws, url };
  }
  if (pairedConnections.size === 0) {
    return { error: "No notebooks connected" };
  }
  const urls = [...pairedConnections.keys()].map(u => `  - ${u}`).join("\n");
  return { error: `Multiple notebooks connected. Specify notebook_id:\n${urls}` };
}

// --- Helper: send command and await result ---
function sendCommand(
  ws: ServerWebSocket<unknown>,
  action: string,
  params: Record<string, any>,
  timeout = 30000
): Promise<any> {
  const id = nextCommandId();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingCommands.delete(id);
      reject(new Error(`Command ${action} timed out after ${timeout}ms`));
    }, timeout);

    pendingCommands.set(id, { resolve, reject, timer });
    ws.send(JSON.stringify({ type: "command", id, action, params }));
  });
}

// --- MCP Tools ---
mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_pairing_token",
      description: "Returns the pairing token needed to connect a notebook to this channel session.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "open_url",
      description: "Open a URL in the system default browser, preserving hash fragments. Works around the macOS `open` command bug that strips hash fragments from file:// URLs.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full URL to open (file:// or https://), including hash fragment" },
          browser: { type: "string", description: "Optional browser binary path override (default: system default)" },
        },
        required: ["url"],
      },
    },
    {
      name: "enable_fakefs",
      description: "Enable the channel's synthetic FileSystemDirectoryHandle (fakefs) for the current session, sandboxed under the given root. Required for `file-sync` to work in non-QA flows (e.g. the headless pairing host) where `showDirectoryPicker` cannot prompt the user. The page must inject `tools/channel/fakefs-init.js` to replace `window.showDirectoryPicker`. Returns the resolved absolute root path.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Absolute or relative path to use as the fakefs sandbox root. Defaults to /tmp/lopecode-fakefs (override with LOPECODE_FAKEFS_ROOT env var). Created if missing.",
          },
        },
      },
    },
    {
      name: "reply",
      description: "Send a markdown message to a notebook's chat widget.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string", description: "Notebook URL (optional if only one connected)" },
          markdown: { type: "string", description: "Markdown content to display" },
        },
        required: ["markdown"],
      },
    },
    {
      name: "get_variable",
      description: "Get the current value of a runtime variable.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          name: { type: "string", description: "Variable name" },
          module: { type: "string", description: "Module name (optional, defaults to main)" },
        },
        required: ["name"],
      },
    },
    {
      name: "define_variable",
      description: "Define or redefine a runtime variable. Definition must be a function string like '() => 42' or '(x, y) => x + y'.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          name: { type: "string", description: "Variable name" },
          definition: { type: "string", description: "Function definition string, e.g. '() => 42'" },
          inputs: {
            type: "array",
            items: { type: "string" },
            description: "Array of dependency variable names (default: [])",
          },
          module: { type: "string", description: "Target module name (optional)" },
        },
        required: ["name", "definition"],
      },
    },
    {
      name: "define_cell",
      description:
        "Define a cell using Observable source code. Supports full Observable syntax including imports (e.g. 'import {md} from \"@tomlarkworthy/editable-md\"'), named cells ('x = 42'), markdown ('md`# Hello`'), viewof, mutable, etc. The source is compiled via the Observable toolchain and may produce multiple runtime variables.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          source: {
            type: "string",
            description:
              'Observable source code, e.g. \'import {md} from "@tomlarkworthy/editable-md"\' or \'x = 42\'',
          },
          module: { type: "string", description: "Target module name (optional)" },
        },
        required: ["source"],
      },
    },
    {
      name: "delete_variable",
      description: "Delete a variable from the runtime.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          name: { type: "string", description: "Variable name to delete" },
          module: { type: "string", description: "Module name (optional)" },
        },
        required: ["name"],
      },
    },
    {
      name: "delete_cell",
      description:
        "Delete a cell by its pid or name. Use this for anonymous cells (markdown, tests, broken cells) that delete_variable can't address — those don't have a name.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          pid: { type: "string", description: "Cell pid, e.g. '_1ahuxfa' (preferred — addresses anonymous cells)" },
          name: { type: "string", description: "Cell name (for named variables; alternative to pid)" },
          module: { type: "string", description: "Module name (optional, narrows the search)" },
        },
      },
    },
    {
      name: "update_cell",
      description:
        "Replace an existing cell's source in place. Targets the cell by pid (preferred) or name; compiles via the Observable toolchain and redefines in place, preserving position in the runtime variable Set. Use for editing markdown/anonymous cells that define_cell would otherwise duplicate.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          pid: { type: "string", description: "Cell pid, e.g. '_1ahuxfa' (preferred — survives renames and addresses anonymous cells)" },
          name: { type: "string", description: "Cell name (for named variables; alternative to pid)" },
          source: { type: "string", description: "New Observable source code for the cell" },
          module: { type: "string", description: "Module name (optional, narrows the search when using --name)" },
        },
        required: ["source"],
      },
    },
    {
      name: "list_variables",
      description: "List all named variables in the runtime (or a specific module).",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          module: { type: "string", description: "Filter to specific module (optional)" },
        },
      },
    },
    {
      name: "list_cells",
      description:
        "List all cells in a module with their names, inputs, and definition source. More detailed than list_variables — shows the cell's dependency inputs and function definition.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          module: {
            type: "string",
            description: "Module name (required)",
          },
          max_definition_length: {
            type: "number",
            description: "Max characters per cell definition (default: 2000, 0 for unlimited)",
          },
        },
        required: ["module"],
      },
    },
    {
      name: "run_tests",
      description: "Run test_* variables and return results.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          filter: { type: "string", description: "Filter tests by name substring (optional)" },
          timeout: { type: "number", description: "Timeout in ms (default: 30000)" },
        },
      },
    },
    {
      name: "eval_code",
      description: "Evaluate JavaScript code in the notebook's browser context. **Statement bodies need explicit `return`** — single-expression bodies (no semicolons, no leading statement keyword like `const`/`let`/`if`/`for`) are auto-returned, but anything that looks like a statement runs as an async IIFE body where the implicit completion value is `undefined`. Use `return foo` (or wrap the whole body in `(() => { ... })()`) to get a value back. Use for throwaway/ephemeral actions; example: `location.reload()` to pick up changes after sync-module.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          code: { type: "string", description: "JavaScript code to evaluate" },
        },
        required: ["code"],
      },
    },
    {
      name: "export_notebook",
      description: "Export/save the notebook in place. Serializes the current runtime state (all modules, cells, file attachments) back to the HTML file, overwriting it. Use this to persist cells created via define_cell. NOTE: rewrites every embedded module's <script> block — use export_module for single-module changes if you want a focused diff.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
        },
      },
    },
    {
      name: "export_module",
      description:
        "Surgically write a single module's compiled <script> block back to disk, leaving every other embedded module byte-identical. Use this for scoped commits (bug fixes, feature adds) where export_notebook would produce a noisy multi-module diff.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          module: { type: "string", description: "Module name to export, e.g. '@author/name'" },
        },
        required: ["module"],
      },
    },
    {
      name: "fork_notebook",
      description: "Fork the notebook into a new browser tab via exporter-2's fork mechanism.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
        },
      },
    },
    {
      name: "create_module",
      description: "Create a new empty module in the runtime. The module is registered in runtime.mains so it appears in moduleMap/currentModules.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          name: { type: "string", description: "Module name, e.g. '@tomlarkworthy/my-module'" },
        },
        required: ["name"],
      },
    },
    {
      name: "delete_module",
      description: "Delete a module and all its variables from the runtime.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          name: { type: "string", description: "Module name to delete" },
        },
        required: ["name"],
      },
    },
    {
      name: "watch_variable",
      description: "Subscribe to reactive updates for a variable. Changes are pushed as notifications.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          name: { type: "string", description: "Variable name to watch" },
          module: { type: "string", description: "Module name (optional, defaults to main)" },
        },
        required: ["name"],
      },
    },
    {
      name: "unwatch_variable",
      description: "Unsubscribe from a watched variable.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
          name: { type: "string", description: "Variable name to unwatch" },
          module: { type: "string", description: "Module name (optional)" },
        },
        required: ["name"],
      },
    },
    // QA tools: Playwright-driven Chromium for visual notebook QA.
    // One browser + one page per named session (default "default"); pass `session`
    // to run several independent QA browsers in parallel.
    // Each window pairs back via cc=TOKEN, so list_cells/get_variable/watch_variable
    // also work against these browsers.
    {
      name: "qa_open_notebook",
      description: "Launch a Playwright-driven Chromium and navigate to the notebook URL. Pass the same file:// URL with #...&cc=TOKEN you would use for open_url. Subsequent qa_* tools act on this page; the page also pairs back so introspection tools (list_cells, get_variable, watch_variable) target it. Headed by default so you can see what Claude sees. Default permissions ['clipboard-read','clipboard-write'] are auto-granted (override via permissions arg; pass [] to grant nothing). Re-opening a URL always performs a full document reload (fresh fetch from disk). Pass a distinct `session` to open a second, independent browser in parallel.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full notebook URL including hash fragment and cc=TOKEN" },
          session: { type: "string", description: "QA session name (default 'default'). Each session is an independent browser window; use distinct names for parallel QA." },
          headless: { type: "boolean", description: "Run headless (default: false)" },
          width: { type: "number", description: "Viewport width (default: 1280)" },
          height: { type: "number", description: "Viewport height (default: 800)" },
          wait_until: { type: "string", description: "Playwright load state: load|domcontentloaded|networkidle (default: load)" },
          permissions: {
            type: "array",
            items: { type: "string" },
            description: "Browser permissions to auto-grant (e.g. ['clipboard-read','clipboard-write','geolocation','notifications','microphone','camera','midi']). Defaults to ['clipboard-read','clipboard-write']. Pass [] to grant nothing.",
          },
          fakefs_root: {
            type: "string",
            description: "Absolute path to use as a sandbox root. When set, window.showDirectoryPicker is replaced with a synthetic FileSystemDirectoryHandle whose ops are proxied to the channel server (sandboxed under this root). Lets file-sync work without an OS picker dialog. Created if missing.",
          },
          disable_web_security: {
            type: "boolean",
            description: "Launch Chromium with web security off (--disable-web-security, context bypassCSP + ignoreHTTPSErrors). Lets the notebook make cross-origin fetches without CORS. Local testing only — never for untrusted content. Default false.",
          },
          chromium_args: {
            type: "array",
            items: { type: "string" },
            description: "Extra raw Chromium command-line flags to pass at launch (e.g. ['--lang=fr']). Advanced/testing use.",
          },
        },
        required: ["url"],
      },
    },
    {
      name: "qa_screenshot",
      description: "Capture a screenshot of the QA browser via CDP framebuffer (no DOM walk; ~30ms). Returns an inline image content block. Defaults to JPEG quality 60 for compactness.",
      inputSchema: {
        type: "object",
        properties: {
          session: { type: "string", description: "QA session name (default 'default')" },
          full_page: { type: "boolean", description: "Capture entire scrollable page (default: false)" },
          format: { type: "string", description: "jpeg|png (default: jpeg)" },
          quality: { type: "number", description: "JPEG quality 1-100 (default: 60)" },
          clip: {
            type: "object",
            description: "Region to capture",
            properties: {
              x: { type: "number" }, y: { type: "number" },
              width: { type: "number" }, height: { type: "number" },
            },
            required: ["x", "y", "width", "height"],
          },
        },
      },
    },
    {
      name: "qa_click",
      description: "Click at viewport coordinates on the QA browser.",
      inputSchema: {
        type: "object",
        properties: {
          session: { type: "string", description: "QA session name (default 'default')" },
          x: { type: "number" },
          y: { type: "number" },
          button: { type: "string", description: "left|right|middle (default: left)" },
          click_count: { type: "number", description: "1=single, 2=double (default: 1)" },
        },
        required: ["x", "y"],
      },
    },
    {
      name: "qa_type",
      description: "Type literal text into the focused element.",
      inputSchema: {
        type: "object",
        properties: {
          session: { type: "string", description: "QA session name (default 'default')" },
          text: { type: "string" },
          delay: { type: "number", description: "Per-keystroke delay in ms (default: 0)" },
        },
        required: ["text"],
      },
    },
    {
      name: "qa_press",
      description: "Press a single key or key combo (e.g. 'Enter', 'Tab', 'Escape', 'Meta+R', 'Control+A').",
      inputSchema: {
        type: "object",
        properties: {
          session: { type: "string", description: "QA session name (default 'default')" },
          key: { type: "string" },
        },
        required: ["key"],
      },
    },
    {
      name: "qa_scroll",
      description: "Scroll the page by (dx, dy) pixels via mouse wheel.",
      inputSchema: {
        type: "object",
        properties: {
          session: { type: "string", description: "QA session name (default 'default')" },
          dx: { type: "number", description: "Horizontal delta" },
          dy: { type: "number", description: "Vertical delta" },
        },
        required: ["dx", "dy"],
      },
    },
    {
      name: "qa_viewport",
      description: "Resize the QA browser viewport.",
      inputSchema: {
        type: "object",
        properties: {
          session: { type: "string", description: "QA session name (default 'default')" },
          width: { type: "number" },
          height: { type: "number" },
        },
        required: ["width", "height"],
      },
    },
    {
      name: "qa_console_logs",
      description: "Drain captured console messages, page errors, and failed network requests from the QA browser. The QA agent's primary 'is anything broken' signal — runtime errors usually surface here without affecting the screenshot. By default, drops known noisy boot chatter from @tomlarkworthy/runtime-sdk, @tomlarkworthy/module-map, @tomlarkworthy/editor-5, the lopecode bootloader, and fakefs init (~90% of typical log volume). Pass `include_noise: true` to see everything, or `exclude_patterns` for additional regex filters. Returns JSON; a `dropped_noise` count is included so you know how much was filtered.",
      inputSchema: {
        type: "object",
        properties: {
          session: { type: "string", description: "QA session name (default 'default')" },
          since: { type: "number", description: "Only return entries with ts > this epoch ms (default: 0)" },
          clear: { type: "boolean", description: "Clear buffers after returning (default: true)" },
          types: {
            type: "array",
            items: { type: "string" },
            description: "Filter console types (e.g. ['error','warning']). Empty = all.",
          },
          include_noise: {
            type: "boolean",
            description: "Disable the default boot-chatter filter and return every console entry (default: false).",
          },
          exclude_patterns: {
            type: "array",
            items: { type: "string" },
            description: "Additional regex patterns (matched against console text); entries matching any are dropped.",
          },
        },
      },
    },
    {
      name: "qa_close",
      description: "Close a QA browser session and release its resources. With no `session`, closes ALL open QA sessions.",
      inputSchema: {
        type: "object",
        properties: {
          session: { type: "string", description: "QA session to close. Omit to close all sessions." },
        },
      },
    },
    // Append dynamic tools from connected notebooks
    ...Array.from(dynamicTools.values()).flat().map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  try {
    // get_pairing_token needs no notebook connection
    if (req.params.name === "get_pairing_token") {
      return { content: [{ type: "text", text: PAIRING_TOKEN }] };
    }

    // enable_fakefs: set currentFakefsRoot so subsequent fs-pair messages succeed.
    // Used by the headless pairing host (and any non-QA flow) to authorise file-sync.
    if (req.params.name === "enable_fakefs") {
      const reqPath = typeof args.path === "string" ? (args.path as string) : undefined;
      const rootAbs = resolve(reqPath ?? DEFAULT_FAKEFS_ROOT);
      await fsMkdir(rootAbs, { recursive: true });
      currentFakefsRoot = rootAbs;
      process.stderr.write(`lopecode-channel: enable_fakefs → ${rootAbs}${reqPath ? "" : " (default)"}\n`);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: true, root: rootAbs, port: PORT, token: PAIRING_TOKEN }),
          },
        ],
      };
    }

    // open_url: launch a URL in the browser, preserving hash fragments
    if (req.params.name === "open_url") {
      const url = args.url as string;
      const browser = args.browser as string | undefined;
      if (!url) return { content: [{ type: "text", text: "url is required" }], isError: true };

      let cmd: string[];
      if (browser) {
        cmd = [browser, url];
      } else if (process.platform === "darwin") {
        // macOS `open` strips hash fragments from file:// URLs.
        // For file:// URLs with fragments, find the default browser binary and call it directly.
        const needsDirectLaunch = url.startsWith("file://") && url.includes("#");
        if (needsDirectLaunch) {
          // macOS `open` strips hash fragments from file:// URLs.
          // Workaround: write a temporary HTML file that redirects via JS.
          const tmpDir = join(dirname(new URL(url).pathname), "..");
          const tmpFile = join(tmpDir, `.lopecode-redirect-${Date.now()}.html`);
          const redirectHtml = `<!DOCTYPE html><html><head><script>location.replace(${JSON.stringify(url)});</script></head><body>Redirecting...</body></html>`;
          await Bun.write(tmpFile, redirectHtml);
          // Open the redirect file (no hash needed), then clean up after a delay
          cmd = ["open", tmpFile];
          setTimeout(() => { try { require("fs").unlinkSync(tmpFile); } catch {} }, 5000);
        } else {
          cmd = ["open", url];
        }
      } else {
        cmd = ["xdg-open", url];
      }

      process.stderr.write(`lopecode-channel: open_url cmd=${JSON.stringify(cmd)}\n`);
      const proc = Bun.spawn(cmd, { stdout: "ignore", stderr: "pipe" });
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;
      if (exitCode !== 0) {
        const msg = `Failed (exit ${exitCode}): ${stderr || "(no stderr)"}`;
        process.stderr.write(`lopecode-channel: open_url error: ${msg}\n`);
        return { content: [{ type: "text", text: msg }], isError: true };
      }
      return { content: [{ type: "text", text: `Opened (${cmd[0].split("/").pop()}): ${url}` }] };
    }

    // --- QA tools (Playwright-driven Chromium, one page per named session) ---
    if (req.params.name?.startsWith("qa_")) {
      const sessionName = qaSessionName(args);
      try {
        if (req.params.name === "qa_open_notebook") {
          const url = args.url as string;
          if (!url) return { content: [{ type: "text", text: "url is required" }], isError: true };
          return await serializeQaOpen(sessionName, async () => {
            const session = await ensureQaSession(sessionName, {
              headless: (args.headless as boolean) ?? false,
              viewport: {
                width: (args.width as number) ?? 1280,
                height: (args.height as number) ?? 800,
              },
              permissions: Array.isArray(args.permissions) ? (args.permissions as string[]) : undefined,
              fakefsRoot: typeof args.fakefs_root === "string" ? (args.fakefs_root as string) : undefined,
              disableWebSecurity: (args.disable_web_security as boolean) ?? false,
              chromiumArgs: Array.isArray(args.chromium_args) ? (args.chromium_args as string[]) : undefined,
            });
            const waitUntil = (args.wait_until as "load" | "domcontentloaded" | "networkidle") ?? "load";
            const page = session.page;
            // QA URLs carry a #hash, and goto() to a URL that differs only in the
            // fragment (or is identical) is a same-document navigation — the HTML
            // is never refetched, so a re-open serves the previous render. Hop
            // through about:blank to force a full document load from disk.
            if (page.url() !== "about:blank") await page.goto("about:blank");
            await page.goto(url, { waitUntil });
            return { content: [{ type: "text", text: `Opened in QA browser (session '${sessionName}'): ${url}` }] };
          });
        }

        if (req.params.name === "qa_close") {
          const names = typeof args.session === "string" && args.session
            ? [args.session as string]
            : [...qaSessions.keys()];
          if (names.length === 0) return { content: [{ type: "text", text: "No QA sessions open." }] };
          const results = await Promise.all(names.map(async (n) => ({ n, clean: await closeQaSession(n) })));
          const msgs = results.map(r => r.clean
            ? `closed '${r.n}'`
            : `'${r.n}' close timed out after ${QA_CLOSE_TIMEOUT_MS}ms — window may linger (a wedged renderer, e.g. a debugger; pause, blocks close; kill Chromium manually if it persists)`);
          return { content: [{ type: "text", text: `QA: ${msgs.join("; ")}` }] };
        }

        // All remaining qa_* tools require an open page in the session
        const session = qaSessions.get(sessionName);
        if (!session || session.page.isClosed()) {
          return { content: [{ type: "text", text: `No QA page open for session '${sessionName}'. Call qa_open_notebook first.` }], isError: true };
        }
        const page = session.page;

        if (req.params.name === "qa_screenshot") {
          const format = ((args.format as string) ?? "jpeg").toLowerCase() === "png" ? "png" : "jpeg";
          const quality = format === "jpeg" ? ((args.quality as number) ?? 60) : undefined;
          const clip = args.clip as { x: number; y: number; width: number; height: number } | undefined;
          const buf = await page.screenshot({
            type: format,
            quality,
            fullPage: (args.full_page as boolean) ?? false,
            clip,
          });
          return {
            content: [{
              type: "image",
              data: buf.toString("base64"),
              mimeType: format === "png" ? "image/png" : "image/jpeg",
            }],
          };
        }

        if (req.params.name === "qa_click") {
          const x = args.x as number, y = args.y as number;
          if (typeof x !== "number" || typeof y !== "number") {
            return { content: [{ type: "text", text: "x and y are required numbers" }], isError: true };
          }
          await page.mouse.click(x, y, {
            button: (args.button as "left" | "right" | "middle") ?? "left",
            clickCount: (args.click_count as number) ?? 1,
          });
          return { content: [{ type: "text", text: `clicked (${x},${y})` }] };
        }

        if (req.params.name === "qa_type") {
          const text = args.text as string;
          await page.keyboard.type(text, { delay: (args.delay as number) ?? 0 });
          return { content: [{ type: "text", text: `typed ${text.length} chars` }] };
        }

        if (req.params.name === "qa_press") {
          const key = args.key as string;
          if (!key) return { content: [{ type: "text", text: "key is required" }], isError: true };
          await page.keyboard.press(key);
          return { content: [{ type: "text", text: `pressed ${key}` }] };
        }

        if (req.params.name === "qa_scroll") {
          await page.mouse.wheel((args.dx as number) ?? 0, (args.dy as number) ?? 0);
          return { content: [{ type: "text", text: `scrolled (${args.dx},${args.dy})` }] };
        }

        if (req.params.name === "qa_viewport") {
          await page.setViewportSize({
            width: args.width as number,
            height: args.height as number,
          });
          return { content: [{ type: "text", text: `viewport ${args.width}x${args.height}` }] };
        }

        if (req.params.name === "qa_console_logs") {
          const since = (args.since as number) ?? 0;
          const clear = (args.clear as boolean) ?? true;
          const typeFilter = args.types as string[] | undefined;
          const includeNoise = (args.include_noise as boolean) ?? false;
          const extraExcludes = (args.exclude_patterns as string[] | undefined) ?? [];
          const noiseRegexes: RegExp[] = [];
          if (!includeNoise) noiseRegexes.push(...QA_DEFAULT_NOISE);
          for (const p of extraExcludes) {
            try { noiseRegexes.push(new RegExp(p)); }
            catch { /* skip malformed user pattern */ }
          }
          const isNoise = (text: string) => noiseRegexes.some(r => r.test(text));
          let dropped_noise = 0;
          const console_ = session.console.filter(e => {
            if (e.ts <= since) return false;
            if (typeFilter?.length && !typeFilter.includes(e.type)) return false;
            if (isNoise(e.text)) { dropped_noise++; return false; }
            return true;
          });
          const errors = session.errors.filter(e => e.ts > since);
          const failed_requests = session.failedRequests.filter(e => e.ts > since);
          if (clear) {
            session.console.length = 0;
            session.errors.length = 0;
            session.failedRequests.length = 0;
          }
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ console: console_, errors, failed_requests, dropped_noise, now: Date.now() }, null, 2),
            }],
          };
        }
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        process.stderr.write(`lopecode-channel: ${req.params.name} error: ${msg}\n`);
        return { content: [{ type: "text", text: `${req.params.name} failed: ${msg}` }], isError: true };
      }
    }

    const notebookId = args.notebook_id as string | undefined;

    // reply is fire-and-forget to the WebSocket
    if (req.params.name === "reply") {
      const target = resolveNotebook(notebookId);
      if ("error" in target) return { content: [{ type: "text", text: target.error }], isError: true };
      target.ws.send(JSON.stringify({ type: "reply", markdown: args.markdown as string }));
      return { content: [{ type: "text", text: "sent" }] };
    }

    // All other tools send a command and await a result
    const target = resolveNotebook(notebookId);
    if ("error" in target) return { content: [{ type: "text", text: target.error }], isError: true };

    let action: string;
    let params: Record<string, any> = {};
    let timeout = 30000;

    switch (req.params.name) {
      case "get_variable":
        action = "get-variable";
        params = { name: args.name, module: args.module || null };
        break;
      case "define_variable": {
        action = "define-variable";
        let inputs = args.inputs;
        if (typeof inputs === "string") inputs = JSON.parse(inputs);
        if (!Array.isArray(inputs)) inputs = [];
        params = {
          name: args.name,
          definition: args.definition,
          inputs,
          module: args.module || null,
        };
        break;
      }
      case "define_cell":
        action = "define-cell";
        params = { source: args.source, module: args.module || null };
        break;
      case "delete_variable":
        action = "delete-variable";
        params = { name: args.name, module: args.module || null };
        break;
      case "delete_cell":
        action = "delete-cell";
        params = { pid: args.pid || null, name: args.name || null, module: args.module || null };
        break;
      case "update_cell":
        action = "update-cell";
        params = {
          pid: args.pid || null,
          name: args.name || null,
          source: args.source,
          module: args.module || null,
        };
        break;
      case "list_variables":
        action = "list-variables";
        params = { module: args.module || null };
        break;
      case "list_cells":
        action = "list-cells";
        params = { module: args.module, maxDefinitionLength: args.max_definition_length };
        break;
      case "run_tests":
        action = "run-tests";
        timeout = (args.timeout as number) || 30000;
        params = { filter: args.filter || null, timeout };
        break;
      case "eval_code": {
        action = "eval";
        // Wrap user code in an async IIFE so top-level `return`, `await`, and
        // `await import(...)` work without callers having to add their own
        // IIFE. The notebook handler awaits the resulting Promise.
        //
        // Auto-return single-expression bodies: callers frequently pass an
        // expression like `1+1` or `document.querySelector('.x')` and expect
        // the value back; without an explicit `return` the IIFE evaluates &
        // discards it. We detect "looks like a single expression" by the
        // absence of any unquoted/uncommented semicolon at the top level
        // and the absence of a leading statement keyword, then wrap with
        // `return (...)`. Semicolons inside balanced parens or braces
        // (function bodies, IIFE-wrapped expressions, object literals) are
        // ignored — they don't disqualify the whole thing from being an
        // expression.
        const code = (args.code as string) || "";
        const trimmed = code.trim();
        const stripped = trimmed
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/[^\n]*/g, "")
          .replace(/"(?:\\.|[^"\\])*"/g, '""')
          .replace(/'(?:\\.|[^'\\])*'/g, "''")
          .replace(/`(?:\\.|[^`\\])*`/g, "``");
        // Drop everything inside balanced () or {} so semicolons in
        // function bodies / IIFE wrappers don't trigger statement mode.
        let topLevel = "";
        let depth = 0;
        for (const ch of stripped) {
          if (ch === "(" || ch === "{") {
            depth++;
            continue;
          }
          if (ch === ")" || ch === "}") {
            depth = Math.max(0, depth - 1);
            continue;
          }
          if (depth === 0) topLevel += ch;
        }
        const hasSemicolons = /;/.test(topLevel.replace(/;\s*$/, ""));
        const statementStart =
          /^\s*(?:return|throw|let|const|var|if|for|while|do|switch|try|function|class|import|export|async\s+function|\{)/.test(
            trimmed
          );
        const looksLikeExpression =
          trimmed.length > 0 && !hasSemicolons && !statementStart;
        const body = looksLikeExpression ? `return (${trimmed});` : code;
        params = { code: `(async () => { ${body} })()` };
        break;
      }
      case "fork_notebook":
        action = "fork";
        timeout = 120000;
        params = {};
        break;
      case "export_notebook":
        action = "fork";
        timeout = 120000;
        params = { _save_in_place: true };
        break;
      case "export_module":
        action = "export-module";
        timeout = 120000;
        params = { module: args.module, _save_module_in_place: true };
        break;
      case "create_module":
        action = "create-module";
        params = { name: args.name };
        break;
      case "delete_module":
        action = "delete-module";
        params = { name: args.name };
        break;
      case "watch_variable":
        action = "watch";
        params = { name: args.name, module: args.module || null };
        break;
      case "unwatch_variable":
        action = "unwatch";
        params = { name: args.name, module: args.module || null };
        break;
      default: {
        // Check if it's a dynamic tool registered by a notebook
        const dynTool = Array.from(dynamicTools.values()).flat().find(t => t.name === req.params.name);
        if (dynTool) {
          const dynWs = pairedConnections.get(dynTool.notebookUrl);
          if (!dynWs) {
            return { content: [{ type: "text", text: `Notebook providing tool "${req.params.name}" is disconnected` }], isError: true };
          }
          const dynResult = await sendCommand(dynWs, "call-tool", { name: req.params.name, arguments: args });
          if (!dynResult.ok) {
            return { content: [{ type: "text", text: `Error: ${dynResult.error}` }], isError: true };
          }
          // Dynamic tool handlers return MCP-format content directly
          if (dynResult.result?.content) {
            return { content: dynResult.result.content };
          }
          const dynText = typeof dynResult.result === "string"
            ? dynResult.result
            : JSON.stringify(dynResult.result, null, 2);
          return { content: [{ type: "text", text: dynText }] };
        }
        return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
      }
    }

    const result = await sendCommand(target.ws, action, params, timeout);

    if (!result.ok) {
      return { content: [{ type: "text", text: `Error: ${result.error}` }], isError: true };
    }

    // Export special handling: write the HTML to disk (save in place)
    if (params._save_in_place && result.result?.html) {
      const originalUrl = target.url.split("#")[0].split("?")[0];
      let originalPath: string;
      if (originalUrl.startsWith("file://")) {
        originalPath = decodeURIComponent(originalUrl.replace("file://", ""));
      } else {
        originalPath = originalUrl;
      }
      const html = result.result.html;
      const htmlStr = typeof html === "string" ? html : String(html);
      if (typeof html !== "string") {
        console.error(`[export] WARNING: html is ${typeof html}, keys: ${html && typeof html === "object" ? Object.keys(html).join(",") : "N/A"}`);
      }
      if (htmlStr.length < 1000) {
        return { content: [{ type: "text", text: `Export failed: HTML content too small (${htmlStr.length} bytes). Type was: ${typeof html}` }], isError: true };
      }
      await Bun.write(originalPath, htmlStr);
      return { content: [{ type: "text", text: `Exported to ${originalPath} (${(htmlStr.length / 1024 / 1024).toFixed(2)} MB)` }] };
    }

    // export_module: splice a single module's <script> body into the existing HTML.
    if (params._save_module_in_place && result.result?.scriptBody) {
      const originalUrl = target.url.split("#")[0].split("?")[0];
      let originalPath: string;
      if (originalUrl.startsWith("file://")) {
        originalPath = decodeURIComponent(originalUrl.replace("file://", ""));
      } else {
        originalPath = originalUrl;
      }
      const moduleName: string = result.result.moduleName || (params.module as string);
      const newBody: string = result.result.scriptBody;
      const existing = await Bun.file(originalPath).text();
      // Match <script id="<module>" ... > ... </script> (single occurrence)
      const escName = moduleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(
        `(<script[^>]*\\bid="${escName}"[^>]*>)([\\s\\S]*?)(</script>)`,
      );
      if (!re.test(existing)) {
        return { content: [{ type: "text", text: `export_module: <script id="${moduleName}"> not found in ${originalPath}` }], isError: true };
      }
      const updated = existing.replace(re, (_m, open, _old, close) => `${open}\n${newBody}\n${close}`);
      await Bun.write(originalPath, updated);
      const delta = updated.length - existing.length;
      return { content: [{ type: "text", text: `export_module: wrote @${moduleName} into ${originalPath} (${delta >= 0 ? "+" : ""}${delta} bytes)` }] };
    }

    // Return result as formatted text
    const text = typeof result.result === "string"
      ? result.result
      : JSON.stringify(result.result, null, 2);
    return { content: [{ type: "text", text }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: msg }], isError: true };
  }
});

// --- Fake-FS proxy (for QA browser, replaces showDirectoryPicker) ---
// When qa_open_notebook is called with fakefs_root, the page's
// window.showDirectoryPicker is replaced with a synthetic handle whose ops are
// proxied here. We sandbox every op under the configured root so the page
// can't read/write outside it.
let currentFakefsRoot: string | null = null;     // absolute path, or null when disabled
const fakefsBindings = new Map<ServerWebSocket<unknown>, string>(); // ws → sandbox absolute path

function resolveSandbox(root: string, rel: string): string {
  // Treat empty path as the sandbox root itself.
  const target = resolve(root, rel || ".");
  const rootWithSep = root.endsWith(pathSep) ? root : root + pathSep;
  if (target !== root && !target.startsWith(rootWithSep)) {
    throw new Error(`path '${rel}' escapes sandbox`);
  }
  return target;
}

async function handleFsOp(root: string, op: string, args: any): Promise<any> {
  const rel = String(args?.path ?? "");
  const abs = resolveSandbox(root, rel);
  switch (op) {
    case "stat": {
      try {
        const s = await fsStat(abs);
        return { kind: s.isDirectory() ? "directory" : s.isFile() ? "file" : "other", lastModified: s.mtimeMs, size: s.size };
      } catch (e: any) {
        if (e?.code === "ENOENT") return null;
        throw e;
      }
    }
    case "list": {
      const entries = await fsReaddir(abs, { withFileTypes: true });
      return entries.map((e) => ({
        name: e.name,
        kind: e.isDirectory() ? "directory" : e.isFile() ? "file" : "other",
      }));
    }
    case "mkdir": {
      await fsMkdir(abs, { recursive: true });
      return { ok: true };
    }
    case "touch": {
      // Ensure parent exists; create empty file if missing; otherwise no-op.
      await fsMkdir(dirname(abs), { recursive: true });
      try {
        await fsStat(abs);
      } catch (e: any) {
        if (e?.code === "ENOENT") {
          await fsWriteFile(abs, new Uint8Array(0));
        } else {
          throw e;
        }
      }
      return { ok: true };
    }
    case "read": {
      const data = await fsReadFile(abs);
      const s = await fsStat(abs);
      return { dataB64: data.toString("base64"), lastModified: s.mtimeMs, type: "" };
    }
    case "write": {
      await fsMkdir(dirname(abs), { recursive: true });
      const dataB64 = String(args?.dataB64 ?? "");
      await fsWriteFile(abs, Buffer.from(dataB64, "base64"));
      return { ok: true };
    }
    case "remove": {
      const recursive = !!args?.recursive;
      await fsRm(abs, { recursive, force: true });
      return { ok: true };
    }
    default:
      throw new Error(`unknown fs op '${op}'`);
  }
}

// --- WebSocket Server ---
function handleWsMessage(ws: ServerWebSocket<unknown>, raw: string | Buffer) {
  let msg: any;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return;
  }

  switch (msg.type) {
    case "fs-pair": {
      if (msg.token !== PAIRING_TOKEN) {
        ws.send(JSON.stringify({ type: "fs-pair-failed", reason: "Invalid pairing token" }));
        return;
      }
      if (!currentFakefsRoot) {
        ws.send(JSON.stringify({ type: "fs-pair-failed", reason: "fakefs not enabled for this session" }));
        return;
      }
      pendingConnections.delete(ws);
      fakefsBindings.set(ws, currentFakefsRoot);
      ws.send(JSON.stringify({ type: "fs-paired" }));
      process.stderr.write(`lopecode-channel: fs-paired ws → ${currentFakefsRoot}\n`);
      return;
    }
    case "fs-request": {
      const root = fakefsBindings.get(ws);
      if (!root) {
        ws.send(JSON.stringify({ type: "fs-response", id: msg.id, ok: false, error: "fs-pair required" }));
        return;
      }
      handleFsOp(root, msg.op, msg.args)
        .then((result) => ws.send(JSON.stringify({ type: "fs-response", id: msg.id, ok: true, result })))
        .catch((err) => ws.send(JSON.stringify({ type: "fs-response", id: msg.id, ok: false, error: String(err?.message ?? err) })));
      return;
    }
    case "pair": {
      if (msg.token !== PAIRING_TOKEN) {
        ws.send(JSON.stringify({ type: "pair-failed", reason: "Invalid pairing token" }));
        ws.close();
        return;
      }
      const url = msg.url as string;
      const title = msg.title as string || "Untitled";
      pendingConnections.delete(ws);
      pairedConnections.set(url, ws);
      connectionMeta.set(ws, { url, title });
      wsBySocket.set(ws, url);
      ws.send(JSON.stringify({ type: "paired", notebook_id: url }));
      // Restore port file if it was removed on last disconnect
      try { require("fs").writeFileSync(portFilePath, String(PORT)); } catch {}

      // Notify Claude
      void mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content: `${title} connected`,
          meta: {
            type: "connected",
            notebook: url,
            title,
          },
        },
      });
      process.stderr.write(`lopecode-channel: paired ${url}\n`);

      // If pair message includes tools, register them
      if (msg.tools && Array.isArray(msg.tools)) {
        const tools: DynamicTool[] = msg.tools.map((t: any) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema || { type: "object", properties: {} },
          notebookUrl: url,
        }));
        dynamicTools.set(url, tools);
        process.stderr.write(`lopecode-channel: registered ${tools.length} dynamic tool(s) from ${url}: ${tools.map(t => t.name).join(", ")}\n`);
        void mcp.notification({ method: "notifications/tools/list_changed", params: {} });
      }
      break;
    }

    case "register-tools": {
      const notebookUrl = wsBySocket.get(ws);
      if (!notebookUrl) return;
      const tools: DynamicTool[] = (msg.tools || []).map((t: any) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema || { type: "object", properties: {} },
        notebookUrl,
      }));
      dynamicTools.set(notebookUrl, tools);
      process.stderr.write(`lopecode-channel: re-registered ${tools.length} dynamic tool(s) from ${notebookUrl}\n`);
      void mcp.notification({ method: "notifications/tools/list_changed", params: {} });
      break;
    }

    case "message": {
      const notebookUrl = wsBySocket.get(ws);
      if (!notebookUrl) return; // not paired

      // Save any image attachments to disk
      const attachments = msg.attachments as Array<{ dataUrl: string; name: string; type: string }> | undefined;
      const savedPaths: string[] = [];
      if (attachments && attachments.length > 0) {
        const screenshotDir = join(process.cwd(), "tools", "screenshots");
        try { mkdirSync(screenshotDir, { recursive: true }); } catch {}
        for (const att of attachments) {
          const match = att.dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!match) continue;
          const ext = match[1] === "jpeg" ? "jpg" : match[1];
          const fileName = `screenshot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
          const filePath = join(screenshotDir, fileName);
          writeFileSync(filePath, Buffer.from(match[2], "base64"));
          savedPaths.push(filePath);
          process.stderr.write(`lopecode-channel: saved screenshot ${filePath}\n`);
        }
      }

      let content = msg.content as string;
      if (savedPaths.length > 0) {
        const pathList = savedPaths.map(p => p).join("\n");
        content = (content || "") + (content ? "\n\n" : "") +
          `[USER ATTACHED ${savedPaths.length} SCREENSHOT(S) — use the Read tool on each path to view them]\n${pathList}`;
        process.stderr.write(`lopecode-channel: notification content=${JSON.stringify(content).slice(0, 200)}\n`);
      }

      void mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content,
          meta: {
            type: "message",
            notebook: notebookUrl,
            sender: "user",
          },
        },
      });
      // Send a separate notification for each screenshot so Claude sees the paths
      for (const p of savedPaths) {
        void mcp.notification({
          method: "notifications/claude/channel",
          params: {
            content: `[Screenshot saved — read this file to view it: ${p}]`,
            meta: {
              type: "message",
              notebook: notebookUrl,
              sender: "system",
            },
          },
        });
      }
      break;
    }

    case "cell-change": {
      const notebookUrl = wsBySocket.get(ws);
      if (!notebookUrl) return;
      const changes = msg.changes as any[];
      if (!changes) return;
      for (const change of changes) {
        void mcp.notification({
          method: "notifications/claude/channel",
          params: {
            content: change._definition || "",
            meta: {
              type: "cell_change",
              notebook: notebookUrl,
              module: change.module || "",
              cell: change._name || "",
              op: change.op || "",
            },
          },
        });
      }
      break;
    }

    case "variable-update": {
      const notebookUrl = wsBySocket.get(ws);
      if (!notebookUrl) return;
      void mcp.notification({
        method: "notifications/claude/channel",
        params: {
          content: msg.error
            ? `Error: ${msg.error}`
            : (typeof msg.value === "string" ? msg.value : JSON.stringify(msg.value)),
          meta: {
            type: "variable_update",
            notebook: notebookUrl,
            name: msg.name || "",
            module: msg.module || "",
            ...(msg.error ? { error: true } : {}),
          },
        },
      });
      break;
    }

    case "notebook-info": {
      const meta = connectionMeta.get(ws);
      if (meta) {
        meta.modules = msg.modules;
        meta.title = msg.title || meta.title;
      }
      break;
    }

    case "command-result": {
      const pending = pendingCommands.get(msg.id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingCommands.delete(msg.id);
        pending.resolve({ ok: msg.ok, result: msg.result, error: msg.error });
      }
      break;
    }
  }
}

function handleWsClose(ws: ServerWebSocket<unknown>) {
  pendingConnections.delete(ws);
  fakefsBindings.delete(ws);
  const url = wsBySocket.get(ws);
  if (url) {
    const meta = connectionMeta.get(ws);
    const hadDynamicTools = dynamicTools.has(url);
    dynamicTools.delete(url);
    pairedConnections.delete(url);
    connectionMeta.delete(ws);
    wsBySocket.delete(ws);
    if (hadDynamicTools) {
      void mcp.notification({ method: "notifications/tools/list_changed", params: {} });
    }
    void mcp.notification({
      method: "notifications/claude/channel",
      params: {
        content: `${meta?.title || "Notebook"} disconnected`,
        meta: {
          type: "disconnected",
          notebook: url,
        },
      },
    });
    process.stderr.write(`lopecode-channel: disconnected ${url}\n`);
    // Remove port file when last notebook disconnects so the PostToolUse hook
    // skips immediately instead of trying to curl a server with no listeners.
    if (pairedConnections.size === 0) {
      try { require("fs").unlinkSync(portFilePath); } catch {}
    }
  }
}

// --- Session log tailing ---

/** Broadcast an activity event to all paired notebooks */
function broadcastActivity(toolName: string, summary: string) {
  if (pairedConnections.size === 0) return;
  const msg = JSON.stringify({
    type: "tool-activity",
    tool_name: toolName,
    summary,
    timestamp: Date.now(),
  });
  for (const ws of pairedConnections.values()) {
    ws.send(msg);
  }
}

/** Build summary from a tool_use content block */
function summarizeToolUse(name: string, input: Record<string, any>): string | null {
  // Skip our own MCP tools to avoid echo
  if (name.startsWith("mcp__lopecode__")) return null;

  if (name === "Read" && input.file_path) return `Read ${input.file_path}`;
  if (name === "Edit" && input.file_path) return `Edit ${input.file_path}`;
  if (name === "Write" && input.file_path) return `Write ${input.file_path}`;
  if (name === "Bash" && input.command) return `$ ${input.command.slice(0, 120)}`;
  if (name === "Grep" && input.pattern) return `Grep "${input.pattern}"`;
  if (name === "Glob" && input.pattern) return `Glob "${input.pattern}"`;
  if (name === "Agent" && input.description) return `Agent: ${input.description}`;
  return name;
}

/**
 * Discover the Claude Code session log directory.
 *
 * Strategy:
 * 1. If LOPECODE_PROJECT_DIR env var is set, use that as the project CWD
 * 2. Otherwise, scan ~/.claude/projects/ for the directory with the most recently
 *    modified .jsonl file (the active session)
 *
 * Claude Code stores logs at ~/.claude/projects/<sanitized-cwd>/<session-id>.jsonl
 * where sanitized-cwd replaces / with -
 */
function discoverLogDir(): string | null {
  const projectsBase = join(homedir(), ".claude", "projects");

  // Strategy 1: explicit project dir
  const explicitDir = process.env.LOPECODE_PROJECT_DIR;
  if (explicitDir) {
    const sanitized = explicitDir.replace(/\//g, "-");
    const logDir = join(projectsBase, sanitized);
    try { statSync(logDir); return logDir; } catch { /* fall through */ }
  }

  // Strategy 2: try CWD (works when channel runs in-process)
  const cwd = process.cwd();
  const sanitizedCwd = cwd.replace(/\//g, "-");
  const cwdLogDir = join(projectsBase, sanitizedCwd);
  try { statSync(cwdLogDir); return cwdLogDir; } catch { /* fall through */ }

  // Strategy 3: find the project dir with the most recently modified .jsonl
  try {
    const dirs = readdirSync(projectsBase);
    let bestDir: string | null = null;
    let bestMtime = 0;
    for (const dir of dirs) {
      const fullDir = join(projectsBase, dir);
      try {
        const st = statSync(fullDir);
        if (!st.isDirectory()) continue;
        // Check newest jsonl in this dir
        const files = readdirSync(fullDir).filter(f => f.endsWith(".jsonl"));
        for (const f of files) {
          const mtime = statSync(join(fullDir, f)).mtimeMs;
          if (mtime > bestMtime) {
            bestMtime = mtime;
            bestDir = fullDir;
          }
        }
      } catch { continue; }
    }
    return bestDir;
  } catch {
    return null;
  }
}

/** Find the most recently modified .jsonl file in a directory */
function findNewestLog(dir: string): string | null {
  try {
    const files = readdirSync(dir)
      .filter(f => f.endsWith(".jsonl"))
      .map(f => ({ name: f, mtime: statSync(join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    return files.length > 0 ? join(dir, files[0].name) : null;
  } catch {
    return null;
  }
}

/** Parse a JSONL log entry and broadcast relevant activity */
function processLogEntry(line: string) {
  try {
    const entry = JSON.parse(line);
    // Only process assistant messages (they contain tool_use and thinking)
    if (entry.message?.role !== "assistant") return;

    const content = entry.message.content;
    if (!Array.isArray(content)) return;

    for (const block of content) {
      if (block.type === "tool_use") {
        const summary = summarizeToolUse(block.name, block.input || {});
        if (summary) broadcastActivity(block.name, summary);
      } else if (block.type === "thinking") {
        broadcastActivity("thinking", "Thinking…");
      } else if (block.type === "text" && block.text) {
        // Broadcast full text as a side-comment in the chat
        if (pairedConnections.size > 0) {
          const msg = JSON.stringify({
            type: "assistant-text",
            text: block.text,
            timestamp: Date.now(),
          });
          for (const ws of pairedConnections.values()) {
            ws.send(msg);
          }
        }
      }
    }
  } catch {
    // Ignore malformed lines
  }
}

/**
 * Tail the active session log file and broadcast activity events.
 * Uses Bun.file + polling to detect new content appended to the JSONL file.
 */
function startSessionLogTail() {
  const logDir = discoverLogDir();
  if (!logDir) {
    process.stderr.write("lopecode-channel: could not discover session log directory\n");
    return;
  }

  let currentLogPath: string | null = null;
  let fileOffset = 0;
  let partialLine = "";

  async function readNewLines() {
    // Check if there's a newer log file (session rotation)
    const newest = findNewestLog(logDir);
    if (!newest) return;

    if (newest !== currentLogPath) {
      // New session log — start from current end (don't replay history)
      currentLogPath = newest;
      try {
        const stat = statSync(currentLogPath);
        fileOffset = stat.size;
        partialLine = "";
        process.stderr.write(`lopecode-channel: tailing session log ${basename(currentLogPath)}\n`);
      } catch {
        return;
      }
    }

    try {
      const stat = statSync(currentLogPath);
      if (stat.size <= fileOffset) return; // No new data

      const file = Bun.file(currentLogPath);
      const newData = await file.slice(fileOffset, stat.size).text();
      fileOffset = stat.size;

      // Process complete lines
      const chunk = partialLine + newData;
      const lines = chunk.split("\n");
      partialLine = lines.pop() || ""; // Last element may be incomplete

      for (const line of lines) {
        if (line.trim()) processLogEntry(line);
      }
    } catch {
      // File may have been rotated or deleted
    }
  }

  // Poll every 500ms for new log content
  const interval = setInterval(readNewLines, 500);
  process.on("exit", () => clearInterval(interval));

  process.stderr.write(`lopecode-channel: session log tailing started (dir: ${basename(logDir)})\n`);
}

// Connect MCP stdio transport FIRST (must happen before Bun.serve so Claude Code
// sees the channel capability during the initialization handshake)
await mcp.connect(new StdioServerTransport());

// Start WebSocket + HTTP server
const server = Bun.serve({
  port: REQUESTED_PORT,
  hostname: "127.0.0.1",
  async fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      if (server.upgrade(req)) return;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        paired: pairedConnections.size,
        pending: pendingConnections.size,
        dynamicTools: Object.fromEntries(
          Array.from(dynamicTools.entries()).map(([url, tools]) => [url, tools.map(t => t.name)])
        ),
      }), { headers: { "content-type": "application/json" } });
    }

    // Tool activity endpoint — receives PostToolUse hook data and broadcasts to notebooks
    if (url.pathname === "/tool-activity" && req.method === "POST") {
      try {
        const body = await req.json();
        const toolName = body.tool_name || "unknown";
        const toolInput = body.tool_input || {};
        const summary = summarizeToolUse(toolName, toolInput);
        if (summary) broadcastActivity(toolName, summary);
        return new Response("ok", { status: 200 });
      } catch (e) {
        return new Response("bad request", { status: 400 });
      }
    }
    return new Response("not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      pendingConnections.add(ws);
    },
    message: handleWsMessage,
    close: handleWsClose,
  },
});

PORT = server.port; // read actual port (important when REQUESTED_PORT is 0)
PAIRING_TOKEN = generateToken();

// Write port file so hooks can find us
const portFilePath = join(import.meta.dir, ".lopecode-port");
await Bun.write(portFilePath, String(PORT));
process.on("exit", () => { try { require("fs").unlinkSync(portFilePath); } catch {} });

process.stderr.write(`lopecode-channel: pairing token: ${PAIRING_TOKEN}\n`);
process.stderr.write(`lopecode-channel: WebSocket server on ws://127.0.0.1:${PORT}/ws\n`);

// Start tailing the session log for live activity feed
startSessionLogTail();
