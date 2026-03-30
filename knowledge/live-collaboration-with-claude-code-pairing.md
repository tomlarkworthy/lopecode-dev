# Live Collaboration with Claude Code Pairing

Pair program with Claude directly from a Lopecode notebook. Chat, watch reactive variables, define cells, manipulate the DOM, run tests — all through a two-way channel between the browser and Claude Code.

## Design Principles

1. **Metaprogramming lives in the notebook.** Core operations — creating modules, defining cells, deleting variables, observing values — belong in `@tomlarkworthy/runtime-sdk` and the Observable runtime. The channel is a thin bridge that exposes this existing expressivity to Claude, not a reimplementation of it.

2. **Reactive, not request/response.** The Observable runtime is reactive. The channel should match this. When Claude defines a variable, it should automatically watch the result — the value arrives as a reactive update when ready, not via polling or a synchronous return. The channel translates between Claude's request/response MCP protocol and the notebook's reactive dataflow.

3. **The notebook is the UI.** The channel doesn't need its own rendering or state management. It forwards commands to runtime-sdk functions and subscribes to their reactive outputs. The notebook handles display, error rendering, and user interaction.

## Setup

There are two entry points depending on where the user starts.

### Starting from Claude Code (CLI-first)

```bash
# One-time setup (requires Bun: https://bun.sh)
bun install -g @lopecode/channel
claude mcp add lopecode bunx @lopecode/channel

# Start Claude Code with channels enabled
claude --dangerously-load-development-channels server:lopecode
```

Then ask Claude: **"Open a lopecode notebook"**

Claude gets the pairing token, opens the notebook in your browser, and auto-connects. No manual token paste needed.

#### For lopecode-dev developers

The `.mcp.json` at the project root is already configured. Start with:

```bash
claude --dangerously-load-development-channels server:lopecode
```

### Starting from a Lopecode notebook (notebook-first)

If you see the `@tomlarkworthy/claude-code-pairing` module panel in a notebook but don't have Claude Code connected:

1. **Install Bun** if you don't have it: https://bun.sh
2. **Install the channel plugin**:
   ```bash
   bun install -g @lopecode/channel
   claude mcp add lopecode bunx @lopecode/channel
   ```
3. **Start Claude Code with channels**:
   ```bash
   claude --dangerously-load-development-channels server:lopecode
   ```
4. **Ask Claude** to connect to your notebook. Claude will provide a `&cc=TOKEN` URL — paste it into your notebook's address bar, or ask Claude to open a fresh notebook.

The pairing module panel shows connection status. When connected, you'll see a chat interface and a watch table showing live variable values.

## Architecture

```
Browser (Notebook)  ←→  WebSocket  ←→  Channel Server (Bun)  ←→  MCP stdio  ←→  Claude Code
```

- **Channel Server** (`tools/channel/lopecode-channel.ts`): Bridges WebSocket to MCP. Translates MCP tool calls into WebSocket commands, and WebSocket notifications into MCP notifications. Stateless — all intelligence is in the notebook module and runtime-sdk.
- **Notebook Module** (`@tomlarkworthy/claude-code-pairing`): Observable module with chat UI, watch table, command handler. Dispatches commands to runtime-sdk functions.
- **Runtime SDK** (`@tomlarkworthy/runtime-sdk`): The authoritative implementation of metaprogramming operations — `realize`, `observe`, `createModule`, `deleteModule`, `lookupVariable`, etc. The channel module calls these; it does not reimplement them.

### What the channel server does

- Generates pairing tokens
- Relays MCP tool calls → WebSocket commands
- Relays WebSocket notifications → MCP notifications (variable updates, cell changes, chat messages)
- Manages notebook connection lifecycle
- Value serialization for the MCP boundary (summarizeJS bridging) — this is a bridging function that naturally lives at the bridge

### What the channel server does NOT do

- Parse or compile Observable cell code
- Track runtime state
- Implement module/variable CRUD logic

These belong in the notebook environment (runtime-sdk, claude-code-pairing module, etc.). Generally prefer putting logic in the notebook over the channel server — the notebook is reactive, testable, and visible to the user.

## Pairing

Each session generates a token in format `LOPE-PORT-XXXX` (e.g., `LOPE-8787-Q2SM`). The port is encoded in the token so the notebook connects to the correct WebSocket server automatically.

### Auto-connect via `&cc=` hash parameter

The `&cc=TOKEN` parameter in the hash URL triggers auto-connect on page load. The notebook parses the port from the token and connects without manual intervention.

### Reconnection across reloads

On successful connect, the token is persisted to `sessionStorage`. On page reload (even if `&cc=` is lost from the hash due to bootloader mangling), the notebook checks `sessionStorage` as a fallback and auto-reconnects. This is critical for the agentic workflow where Claude triggers reloads.

### Claude-initiated reload with reconnect

```javascript
var hash = location.hash;
if (hash.includes('cc=')) {
  hash = hash.replace(/cc=[^&)]+/, 'cc=NEW-TOKEN');
} else {
  hash = hash + '&cc=NEW-TOKEN';
}
location.hash = hash;
location.reload();
```

Useful when the notebook needs to reload after module code changes.

### Multiple notebooks

Multiple notebooks can connect with the same token simultaneously. When more than one is connected, specify `notebook_id` (the URL) in tool calls. When only one is connected, it's used automatically.

## MCP Tools

These are the tools Claude sees. Each is a thin wrapper that sends a command to the notebook, where the real work happens in runtime-sdk.

| Tool | Description | Key Params |
|------|-------------|------------|
| `get_pairing_token` | Returns the session pairing token | — |
| `reply` | Send markdown to notebook chat | `markdown`, `notebook_id?` |
| `define_cell` | **Primary cell authoring tool.** Accepts Observable source, compiles via toolchain, applies all resulting definitions | `source`, `module?` |
| `list_cells` | List cells with names, inputs, and definition source | `module` |
| `get_variable` | Read a runtime variable's value | `name`, `module?`, `notebook_id?` |
| `define_variable` | Low-level: create/redefine a variable with a function string | `name`, `definition`, `inputs[]`, `module?` |
| `delete_variable` | Remove a variable | `name`, `module?` |
| `list_variables` | List all named variables (less detail than `list_cells`) | `module?` |
| `run_tests` | Run `test_*` variables | `filter?`, `timeout?` |
| `eval_code` | Evaluate JS in browser context (ephemeral) | `code` |
| `watch_variable` | Subscribe to reactive updates | `name`, `module?`, `notebook_id?` |
| `unwatch_variable` | Unsubscribe from a variable | `name`, `module?`, `notebook_id?` |
| `create_module` | Create a new empty module in the runtime | `name` |
| `delete_module` | Remove a module and all its variables | `name` |
| `export_notebook` | Save notebook in place (persists all runtime cells to HTML) | `notebook_id?` |
| `fork_notebook` | Self-serialize to sibling HTML file | `suffix?` |

### Reactive tool behavior

**`define_variable`** should automatically add a watch on the defined variable. Claude does not need to call `watch_variable` separately — the result arrives as a reactive `variable_update` notification when the runtime resolves the cell. This matches the Observable runtime's push-based model: define a cell, observe the result when it's ready.

**`create_module`** and **`delete_module`** trigger `currentModules` updates automatically (since `currentModules` is already watched), so Claude sees the module list change reactively.

## Variable Watching

`watch_variable` subscribes to reactive updates via runtime-sdk's `observe()`. Changes are debounced (1s, latest value wins) and serialized via `summarizeJS`.

### Auto-watches on connect

The `cc_watches` cell is initialized with default watches (`hash`, `currentModules`) via Observable dependency resolution — not imperatively on connect. When a connection is established, the pairing module reads the initialized watches and subscribes to each using `lookupVariable(name, cc_module)` + `observe()`. This gives Claude immediate visibility into the page layout and loaded modules.

### Watch table

A reactive `Inputs.table` displays all active watches with variable name, module, truncated value, and last update timestamp. Renders at the top of the claude-code-pairing panel below the chat.

### Updates arrive as channel notifications

```
<channel source="lopecode" type="variable_update" notebook="..." name="currentModules" module="main">
serialized value (via summarizeJS, truncated to 2000 chars)
</channel>
```

## Module Dependencies

`@tomlarkworthy/claude-code-pairing` imports from:
- `@tomlarkworthy/module-map` → `currentModules`, `moduleMap`
- `@tomlarkworthy/exporter-2` → `exportToHTML`
- `@tomlarkworthy/observablejs-toolchain` → `compile`
- `@tomlarkworthy/local-change-history` → `viewof history`, `history`
- `@tomlarkworthy/runtime-sdk` → `observe`, `realize`, `createModule`, `deleteModule`, `lookupVariable`, `thisModule`
- `@tomlarkworthy/summarizejs` → `summarizeJS`
- `d/57d79353bac56631@44` → `hash`

### Own module reference

The pairing module uses `viewof cc_module = thisModule()` to get its own module reference. This allows `lookupVariable(name, cc_module)` for variables imported into the pairing module's scope (like `hash`, `currentModules`) — no `runtime._variables` scanning needed.

## Cell Change Forwarding

The `cc_change_forwarder` cell takes `history` as a direct dependency (imported from `@tomlarkworthy/local-change-history`) and polls it every second. New entries are sent to Claude as `cell_change` notifications — Claude sees every cell edit in real-time.

## Exporting and Forking

### export_notebook — Save in place

`export_notebook` calls `exportToHTML()` (imported from `@tomlarkworthy/exporter-2`) and overwrites the notebook's HTML file on disk. This persists all runtime state — modules, cells, file attachments — so cells created via `define_cell` survive reloads.

**Important:** `exportToHTML()` returns `{source: string, report: object}`, not a raw HTML string. The pairing module extracts `.source` for the HTML content.

### fork_notebook — Save as copy

Creates a sibling HTML file (e.g., `notebook--1234.html`). Useful for checkpoints.

### Manual fork via UI

Open the exporter-2 panel (`&open=@tomlarkworthy/exporter-2` in the hash) and click the fork button. The exporter passes all URL params (including `&cc=` token) forward automatically, so the fork auto-connects.

## Injecting into Existing Notebooks

For notebooks that don't already include `@tomlarkworthy/claude-code-pairing`:

```bash
bun tools/channel/sync-module.ts <input.html> [output.html]
bun tools/channel/sync-module.ts --watch <input.html>
```

If output is omitted, the input file is modified in-place. The script is idempotent — it upserts the module (replaces if it already exists, inserts if not). With `--watch`, it re-injects whenever the module source file changes.

This injects the module, adds it to `bootconf.json` mains, and updates the hash layout.

## Creating a New Notebook for Pairing

To create a new notebook that includes the pairing module:

1. **Choose a base notebook** that has the modules you need (e.g., `@tomlarkworthy_editable-md.html` for blog posts with rich markdown, `@tomlarkworthy_blank-notebook.html` for general use)
2. **Jumpgate the base** to get a fresh copy with latest modules from Observable:
   ```bash
   node tools/lope-jumpgate.js --source @tomlarkworthy/editable-md \
     --output lopebooks/notebooks/@tomlarkworthy_editable-md.html
   ```
3. **Copy to the new filename:**
   ```bash
   cp lopebooks/notebooks/@tomlarkworthy_editable-md.html \
      lopebooks/notebooks/@tomlarkworthy_my-new-notebook.html
   ```
4. **Inject the pairing module:**
   ```bash
   bun tools/channel/sync-module.ts \
     --module @tomlarkworthy/claude-code-pairing \
     --source tools/channel/claude-code-pairing-module.js \
     --target lopebooks/notebooks/@tomlarkworthy_my-new-notebook.html
   ```
5. **Open with pairing token** — include the content module, module-selection, AND claude-code-pairing in the hash URL:
   ```
   file:///path/to/@tomlarkworthy_my-new-notebook.html#view=R100(S50(@tomlarkworthy/my-content-module),S25(@tomlarkworthy/module-selection),S25(@tomlarkworthy/claude-code-pairing))&cc=TOKEN
   ```

Always jumpgate fresh before copying — stale base notebooks may have outdated lopepage or other core modules that cause rendering bugs.

### Bootconf Requirements

The `bootconf.json` script inside the HTML must list the modules to instantiate at boot in its `"mains"` array. A notebook with `"mains": []` will show theme colors but no content — nothing gets loaded.

For a typical pairing notebook, mains should include lopepage and the main content module:
```json
{
  "mains": ["@tomlarkworthy/lopepage", "@tomlarkworthy/my-notebook"],
  "hash": "#view=...",
  "headless": true
}
```

When using `export_notebook` via the pairing channel, verify the exported file has correct mains — if the notebook was created dynamically (via `create_module`), the exporter may capture an empty mains array.

## Authoring Cells via Claude — The Full Loop

The primary workflow for creating notebook content via Claude Code:

1. **Create the module** (if it doesn't exist):
   ```
   create_module(name: "@tomlarkworthy/my-notebook")
   ```

2. **Add an import** (e.g., editable-md for rich markdown):
   ```
   define_cell(source: 'import {md} from "@tomlarkworthy/editable-md"', module: "@tomlarkworthy/my-notebook")
   ```
   This compiles to multiple definitions — a module reference and each imported variable. Auto-watches fire for each.

3. **Add content cells** using Observable source:
   ```
   define_cell(source: 'header = md`# My Title`', module: "@tomlarkworthy/my-notebook")
   define_cell(source: 'x = 42', module: "@tomlarkworthy/my-notebook")
   ```

4. **Persist to disk** so cells survive reloads:
   ```
   export_notebook()
   ```
   This calls `exportToHTML()` from exporter-2 and overwrites the HTML file.

5. **Verify after reload** — use `list_cells(module: "...")` to confirm cells survived.

### What `define_cell` supports

- Named cells: `x = 42`
- Imports: `import {md} from "@tomlarkworthy/editable-md"`
- Multi-imports: `import {foo, bar} from "@tomlarkworthy/my-lib"`
- Markdown: `` md`# Hello` ``
- viewof: `viewof slider = Inputs.range([0, 100])`
- mutable: `mutable count = 0`
- Anonymous cells: `md`some text``

### What `define_cell` does NOT support (yet)

- Moving cells (reordering) — use the editor UI
- Renaming cells — delete + re-create

## Core User Journeys

These must work reliably end-to-end.

### 1. Initial connection (CLI-first)
User says "open a lopecode notebook". Claude gets the token, opens the browser with the connection URL. Notebook auto-connects with chat panel visible. No manual token paste.

### 2. Initial connection (notebook-first)
User opens a lopecode notebook and sees the claude-code-pairing panel but has no connection. The panel shows setup instructions: install Bun, install the channel plugin, start Claude Code with `--dangerously-load-development-channels server:lopecode`. Once Claude is running, the user asks Claude to connect and the notebook auto-pairs.

### 3. Convert web notebook to local file
User has a notebook open from GitHub Pages. Guide them to open the exporter-2 panel (`&open=@tomlarkworthy/exporter-2`) and use the fork button to save to disk.

### 4. Create a cell
**Preferred:** Use `define_cell` with Observable source code. This supports the full Observable syntax — imports (`import {md} from "@tomlarkworthy/editable-md"`), named cells (`x = 42`), markdown (`` md`# Hello` ``), `viewof`, `mutable`, etc. The source is compiled via `@tomlarkworthy/observablejs-toolchain` and may produce multiple runtime variables (e.g., an import produces a module reference + each imported name). A watch is automatically added for non-internal variables.

**Low-level fallback:** `define_variable` with a function string and explicit inputs array. Use only when you need precise control over the low-level cell definition.

### 5. Delete a cell
Use `delete_variable` MCP tool. The channel module uses `lookupVariable(name, module)` to find the variable, then calls `v.delete()`.

### 6. Create a module
Claude calls `create_module` with a name. The channel module calls `createModule` from runtime-sdk, which calls `runtime.module()`, sets `_name`, and registers in `runtime.mains`. The `currentModules` watch fires automatically, confirming creation. Then use `define_cell` with that module name to add cells.

For importing modules already embedded in the notebook HTML, guide the user to use the module-selection panel (`&open=@tomlarkworthy/module-selection`).

### 7. Delete a module
Claude calls `delete_module` with a name. The channel module calls `deleteModule` from runtime-sdk, which iterates `runtime._variables` to find all variables where `v._module === mod` (not just named variables in `_scope`), calls `v.delete()` on each, and removes the module from `runtime.mains`. The `currentModules` watch fires automatically.

### 8. Move a cell
Not yet supported programmatically. Guide user to use the editor.

### 9. Explain how a notebook works
Use `currentModules` watch (auto-watched on connect) for module list with dependencies. Use `cellMap` for cell-level detail. Use `get_variable` to read specific values. Summarize the structure using module names, titles, and dependency graph.

## Implementation: Use Existing Modules

**CRITICAL**: Do not reinvent Observable runtime internals. The channel module is a thin command dispatcher — all real logic lives in runtime-sdk and other notebook modules.

| Need | Use | NOT |
|------|-----|-----|
| Find a module by name | `runtime.mains.get(name)` | Scanning `_variables` or `currentModules` Map keys |
| Create a module | `createModule` from runtime-sdk | Inline `runtime.module()` + manual registration |
| Delete a module | `deleteModule` from runtime-sdk | Iterating `_scope` (misses anonymous variables) |
| Create/define a cell | `compile` + `realize` (via `define_cell`) | `module.variable({}).define()` or raw `realize` |
| Delete a cell | `lookupVariable(name, module)` then `v.delete()` | Scanning `runtime._variables` |
| Read cell source code | `cellMap` | Parsing `_definition.toString()` |
| List modules | `currentModules` (auto-watched) | Scanning `_variables` for `_module._name` |
| Observe a variable | `observe` from runtime-sdk | Monkey-patching `_observer` |
| Serialize values | `summarizeJS` | Custom `JSON.stringify` wrappers |

## eval_code vs define_cell vs define_variable

**`eval_code`** runs arbitrary JS in the browser. Effects are **ephemeral** — lost on reload/export. Use for quick experiments, DOM hacks, debugging, and one-off side effects (e.g., `location.reload()`, setting `window.location.hash`).

**`define_cell`** is the **primary cell authoring tool**. Accepts Observable source code (`import {md} from "..."`, `x = 42`, `` md`# Hello` ``), compiles via the Observable toolchain, and applies all resulting definitions to the target module. Cells are **persistent** — they survive `export_notebook` and reload. Use this for all normal cell creation.

**`define_variable`** is a **low-level fallback**. Takes a function string and explicit inputs array — no compilation. Use only when you need precise control over the runtime definition (e.g., wiring up specific internal variables).

**Rule of thumb:** `define_cell` for almost everything. `eval_code` for throwaway/ephemeral actions. `define_variable` only for edge cases.

**Never use `define_cell` or `define_variable` for one-off side effects** (e.g., setting `window.location.hash`, triggering a download, logging). These create persistent cells that re-execute on every reload/export. Use `eval_code` instead.

## Environment Variables

- `LOPECODE_PORT` — WebSocket server port (default: 8787). Encoded in the pairing token.

## Known Limitations

- **No persistent chat history** — messages are lost on page reload
- **eval is synchronous** — async code in `eval_code` won't return resolved values
- **Activity feed (implemented)** — Claude's tool calls are streamed to the chat via a `PostToolUse` hook that POSTs to the channel server's `/tool-activity` endpoint. Consecutive tool calls are grouped into collapsible `<details>` elements. The hook script (`tools/channel/post-tool-hook.sh`) discovers the server port via `tools/channel/.lopecode-port`.
- **Hash mangling** — bootloader may overwrite custom hash params on load (see [issue #140](https://github.com/tomlarkworthy/lopecode/issues/140))

## Distribution via Claude Marketplace

Target user journey:

1. **Install** — User adds the lopecode-channel plugin from Claude's marketplace
2. **Open** — Claude provides the connection URL with auto-connect token
3. **Collaborate** — Chat, watch variables, define cells, run tests, manipulate DOM
4. **Fork** — Open exporter-2 panel, click fork to create a local copy
5. **Grow** — Add modules via module-selection, build up the notebook, re-export

### Plugin structure

```
tools/channel/
├── .claude-plugin/
│   ├── plugin.json               # Plugin metadata
│   └── marketplace.json          # Marketplace catalog
├── hooks/
│   └── hooks.json                # SessionStart: auto-install deps
├── mcp.json                      # MCP server config
├── lopecode-channel.ts           # Channel server (Bun)
├── claude-code-pairing-module.js # Observable module source
├── sync-module.ts              # Upsert module into notebooks (supports --watch)
└── package.json                  # Dependencies
```

### What still needs to happen

- **runtime-sdk CRUD** — move `createModule`, `deleteModule` into `@tomlarkworthy/runtime-sdk` as proper cells
- **Auto-watch on define** — `define_variable` handler should automatically watch the defined variable
- **Delete module support** — implement `delete_module` MCP tool + runtime-sdk `deleteModule` function
- **Marketplace submission** — submit plugin to Claude's marketplace or self-host
- **Hash param preservation** — fix bootloader hash mangling ([#140](https://github.com/tomlarkworthy/lopecode/issues/140))

## Development

### Running Tests

Integration tests exercise the WebSocket protocol (pairing, commands, notifications, health endpoint) by spawning the channel server as a subprocess and connecting via plain WebSocket. No browser or Claude Code needed.

```bash
bun test tests/channel/lopecode-channel.test.ts
```

### Local Testing (manual)

Start the server standalone and connect a notebook:

```bash
bun run tools/channel/lopecode-channel.ts
# stderr shows: pairing token: LOPE-PORT-XXXX
# Open http://127.0.0.1:PORT/ to redirect to a notebook with auto-connect
# Or check http://127.0.0.1:PORT/health for connection status
```

### Version Bumping

The version is canonical in `tools/channel/package.json`. Two other files must stay in sync:
- `tools/channel/.claude-plugin/plugin.json`
- `tools/channel/.claude-plugin/marketplace.json`

After bumping `package.json`, run:

```bash
bun run tools/channel/sync-version.ts
```

To check without modifying:

```bash
bun run tools/channel/sync-version.ts --check
```

### Publishing

Publishing is automated via GitHub Actions (`.github/workflows/publish-channel.yml`). To release:

1. Bump version in `tools/channel/package.json`
2. Run `bun run tools/channel/sync-version.ts` to propagate
3. Commit and tag: `git tag channel-v0.1.4`
4. Push the tag: `git push origin channel-v0.1.4`

CI runs version sync check and integration tests before `npm publish`.
