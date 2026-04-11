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
import { join, dirname, basename, resolve } from "path";
import { mkdirSync, writeFileSync, readdirSync, statSync, watchFile, unwatchFile } from "fs";
import { homedir } from "os";

// --- Configuration ---
const REQUESTED_PORT = Number(process.env.LOPECODE_PORT ?? 0); // 0 = OS picks a free port
let PORT = REQUESTED_PORT;

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

function nextCommandId(): string {
  return `cmd-${Date.now()}-${++commandSeq}`;
}

// --- MCP Server ---
const mcp = new Server(
  { name: "lopecode", version: "1.0.0" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
      tools: {},
    },
    instructions: `You are connected to Lopecode notebooks via the lopecode channel.

Lopecode notebooks are self-contained HTML files built on the Observable runtime. Each notebook contains modules (collections of reactive cells). The Observable runtime provides reactive dataflow: cells automatically recompute when their dependencies change, like a spreadsheet.

## Starting a lopecode notebook

When the user asks to start/open a lopecode notebook, or start a pairing/collaboration session:
1. Call get_pairing_token to get the token (format: LOPE-PORT-XXXX)
2. Find the local notebook HTML file (e.g. lopecode/notebooks/@tomlarkworthy_blank-notebook.html or lopebooks/notebooks/...)
3. Construct a file:// URL with the hash layout and cc=TOKEN parameter:
   file:///absolute/path/to/@tomlarkworthy_blank-notebook.html#view=R100(S50(@tomlarkworthy/blank-notebook),S25(@tomlarkworthy/module-selection),S25(@tomlarkworthy/claude-code-pairing))&open=@tomlarkworthy/claude-code-pairing&cc=TOKEN
4. Use the open_url tool to open it (this preserves hash fragments on file:// URLs — the macOS open command strips them)
5. Wait for the connected notification
6. Send a welcome message via reply

Always use file:// paths to local notebooks, never GitHub Pages URLs. The open_url tool handles the macOS bug where the open command strips hash fragments from file:// URLs.

If channels are not enabled, tell the user to restart with: claude --channels server:lopecode

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
- eval_code: For throwaway/ephemeral actions. Lost on reload. NEVER use define_cell for one-off side effects. Common uses:
  - Reload the page: \`location.reload()\` — use after sync-module to pick up changes, or to fix broken runtime state
  - DOM inspection: \`document.querySelector('.foo')?.textContent\`
  - Debugging: \`runtime._variables.size\`
- define_variable: Low-level escape hatch with explicit function string + inputs array. Use when you need precise control over variable names and inputs that the compiler might mangle.
- export_notebook: Persists all runtime state to the HTML file. Call after defining cells so they survive reloads. ALWAYS export before pushing to Observable.
- fork_notebook: Forks the notebook into a new browser tab via exporter-2.

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
      description: "Evaluate JavaScript code in the notebook's browser context. Use for throwaway/ephemeral actions. Example: reload the page with `location.reload()` to pick up changes after sync-module or to fix a broken runtime state.",
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
      description: "Export/save the notebook in place. Serializes the current runtime state (all modules, cells, file attachments) back to the HTML file, overwriting it. Use this to persist cells created via define_cell.",
      inputSchema: {
        type: "object",
        properties: {
          notebook_id: { type: "string" },
        },
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
  ],
}));

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  try {
    // get_pairing_token needs no notebook connection
    if (req.params.name === "get_pairing_token") {
      return { content: [{ type: "text", text: PAIRING_TOKEN }] };
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
      case "eval_code":
        action = "eval";
        params = { code: args.code };
        break;
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
      default:
        return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
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

// --- WebSocket Server ---
function handleWsMessage(ws: ServerWebSocket<unknown>, raw: string | Buffer) {
  let msg: any;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    return;
  }

  switch (msg.type) {
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
  const url = wsBySocket.get(ws);
  if (url) {
    const meta = connectionMeta.get(ws);
    pairedConnections.delete(url);
    connectionMeta.delete(ws);
    wsBySocket.delete(ws);
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
