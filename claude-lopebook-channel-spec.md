# Lopecode Claude Channel — Specification v1

## Overview

A two-way communication channel between Lopecode notebooks (running in the user's browser) and Claude Code sessions. Users chat with Claude directly from within their notebook. Claude can read cell state, define variables, run tests, fork notebooks for safe experimentation, and reply with rich markdown.

## Architecture

```
┌─────────────────────────────┐
│  User's Browser             │
│                             │      WebSocket (localhost:8787)
│  Notebook A (debugger)      │◄──────────────────────────────┐
│  ┌───────────────────────┐  │                               │
│  │ @tomlarkworthy/       │  │                               │
│  │ claude-channels       │──┼───────────────────────┐       │
│  └───────────────────────┘  │                       │       │
│                             │                       ▼       │
│  Notebook B (forked copy)   │         ┌─────────────────────────┐
│  ┌───────────────────────┐  │         │  Channel Server (Bun)   │
│  │ @tomlarkworthy/       │──┼────────►│  tools/lopecode-channel │
│  │ claude-channels       │  │         │                         │
│  └───────────────────────┘  │         │  WebSocket server       │
│                             │         │  + MCP server (stdio)   │
└─────────────────────────────┘         │                         │
                                        │  Manages N connections  │
                                        │  keyed by notebook URL  │
                                        └────────────┬────────────┘
                                                     │ stdio (MCP)
                                                     ▼
                                              ┌─────────────┐
                                              │ Claude Code  │
                                              └─────────────┘
```

**No Playwright.** The user has notebooks open in their own browser. Each notebook's `claude-channels` module connects to the channel server over WebSocket. The channel server bridges all connections to a single Claude Code session over MCP stdio.

Multiple notebooks connect simultaneously. Each is identified by its **browser URL** (`file:///path/to/notebook.html`). This naturally supports forking: a forked notebook has a different filename and therefore a different identity.

## Components

### 1. Channel Server (`tools/lopecode-channel.ts`)

A Bun script that is both:

- An **MCP server** (stdio transport) — Claude Code spawns it as a subprocess
- A **WebSocket server** (`ws://127.0.0.1:8787`) — notebooks connect to it

**Startup:**

- Bind to `127.0.0.1:8787`. If port is taken, **fail with a clear error** and exit.
- Generate a single-use pairing token (e.g. `LOPE-7X3K`). Print to stderr.
- Connect to Claude Code via MCP stdio.
- Wait for notebook WebSocket connections.

**Connection management:**

- Maintains a `Map<notebook_url, WebSocket>` of paired connections.
- Each connection is identified by the notebook's URL (sent during pairing).
- When a notebook disconnects, remove from map. Notify Claude via channel event.
- When a new notebook connects with a valid token, add to map. Notify Claude.

**MCP capability declaration:**

```ts
const mcp = new Server(
  { name: "lopecode", version: "1.0.0" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
      tools: {},
    },
    instructions: `You are connected to Lopecode notebooks via the lopecode channel.

User chat messages arrive as:
  <channel source="lopecode" type="message" notebook="file:///..." sender="user">
  message text here
  </channel>

Cell change events arrive automatically as:
  <channel source="lopecode" type="cell-change" notebook="file:///..." module="@author/mod" cell="cellName" op="upd">
  truncated definition
  </channel>

Notebook lifecycle events:
  <channel source="lopecode" type="connected" notebook="file:///...">notebook title</channel>
  <channel source="lopecode" type="disconnected" notebook="file:///...">notebook title</channel>

Use the reply tool to send messages back to a specific notebook's chat widget.
Use define-variable, get-variable, run-tests, list-variables, eval to interact with notebook runtimes.
Use fork-notebook to create a safe copy for experimentation.

When multiple notebooks are connected, always specify which one via notebook_id (the URL).`,
  }
);
```

### 2. Notebook Module (`@tomlarkworthy/claude-channels`)

An Observable module added to any Lopecode notebook that wants Claude integration.

**Dependencies:** `@tomlarkworthy/local-change-history` (for the `history` variable).

#### Cells

| Cell | Type | Purpose |
|------|------|---------|
| `channel_config` | `viewof` | Configuration view: port (default 8787), pairing token input |
| `channel_connection` | internal | WebSocket lifecycle: connect, pair, reconnect, teardown |
| `channel_status` | reactive | `"disconnected"` \| `"connecting"` \| `"pairing"` \| `"connected"` |
| `channel_notebook_id` | derived | `location.href` — the notebook's full URL including path |
| `channel_chat_messages` | mutable | Array of `{ role, content, timestamp }` |
| `channel_chat` | viewof | The chat widget UI |
| `channel_setup_ui` | view | Shown when disconnected: instructions, links, token input |
| `channel_change_forwarder` | internal | Watches `history` variable, forwards new entries over WebSocket |

#### Chat widget (`channel_chat`)

- Message history (scrollable, newest at bottom)
- Text input with send button at bottom
- Connection status indicator: green/red/orange dot + text
- When `channel_status === "disconnected"`:
  - Show setup panel instead of chat
  - "Connect to Claude Code to chat with Claude from this notebook"
  - Steps: 1) Start Claude with channel flag, 2) Paste pairing token below
  - Link to full docs
  - Token input field + "Connect" button
- When connected:
  - User messages: plain text, right-aligned
  - Claude replies: rendered via `md` tagged template (markdown), left-aligned
  - v2: replies with interpolated Observable JS (reactive widgets inline)

#### Change forwarding (`channel_change_forwarder`)

Watches the `history` variable from `@tomlarkworthy/local-change-history`. On each new entry, sends it over the WebSocket immediately. This is always-on — every cell edit is forwarded to Claude as background context.

### 3. Pairing Flow

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│ Claude Code   │     │ Channel Server   │     │ Notebook    │
└──────┬───────┘     └────────┬─────────┘     └──────┬──────┘
       │  spawns              │                       │
       ├─────────────────────►│                       │
       │                      │ generates LOPE-7X3K   │
       │                      │ prints to stderr      │
       │                      │                       │
       │  Claude shows token  │                       │
       │  to user in terminal │                       │
       │                      │                       │
       │                      │◄──── WebSocket ───────┤ user opens notebook
       │                      │      connect          │
       │                      │                       │
       │                      │◄──── {type:"pair",  ──┤ user pastes token
       │                      │       token,url}      │
       │                      │                       │
       │                      │ validates token       │
       │                      │                       │
       │                      ├──── {type:"paired", ─►│ chat widget activates
       │                      │      notebook_id}     │
       │                      │                       │
       │◄── notification ─────┤                       │
       │  <channel type=      │                       │
       │   "connected">       │                       │
       │                      │                       │
```

- Token is generated once per channel server session.
- Same token pairs **all** notebooks in that session (many-to-one).
- Token is validated on first message only; subsequent messages on the same WebSocket are trusted.
- If token is wrong: server sends `{type: "pair-failed"}`, closes WebSocket.

## Channel Message Design

### Notebook → Channel Server (WebSocket)

```typescript
// --- Pairing ---
interface PairMessage {
  type: "pair";
  token: string;        // e.g. "LOPE-7X3K"
  url: string;          // notebook URL (becomes notebook_id)
  title: string;        // notebook title (human-readable label)
}

// --- User chat ---
interface UserMessage {
  type: "message";
  content: string;      // plain text from chat input
}

// --- Cell changes (automatic) ---
interface CellChangeMessage {
  type: "cell-change";
  changes: CellChange[];
}

interface CellChange {
  t: number;            // timestamp (epoch ms)
  op: "new" | "upd" | "del";
  module: string;       // e.g. "@tomlarkworthy/debugger"
  _name: string | null; // cell name (null for anonymous)
  _inputs: string[];    // dependency names
  _definition: string;  // function source (truncated to 500 chars)
}

// --- Command responses ---
// Results for commands the server sent (define-variable, eval, etc.)
interface CommandResult {
  type: "command-result";
  id: string;           // correlates with the command's id
  ok: boolean;
  result?: any;         // serialized value on success
  error?: string;       // error message on failure
}

// --- Notebook info (sent after pairing) ---
interface NotebookInfo {
  type: "notebook-info";
  url: string;
  title: string;
  modules: string[];    // list of module names loaded
  hash: string;         // current hash URL (layout config)
}
```

### Channel Server → Notebook (WebSocket)

```typescript
// --- Pairing response ---
interface PairedMessage {
  type: "paired";
  notebook_id: string;  // = the notebook's URL
}

interface PairFailedMessage {
  type: "pair-failed";
  reason: string;
}

// --- Claude's replies ---
interface ReplyMessage {
  type: "reply";
  markdown: string;     // rendered by notebook via md``
}

// --- Commands from Claude (via MCP tool calls) ---
// The server translates MCP tool calls into these WebSocket commands.
// The notebook executes them and sends back CommandResult.
interface Command {
  type: "command";
  id: string;           // unique ID for correlation
  action: "get-variable" | "define-variable" | "delete-variable"
        | "list-variables" | "run-tests" | "eval";
  params: Record<string, any>;  // action-specific parameters
}

// Command params by action:
//   get-variable:    { name: string, module?: string }
//   define-variable: { name: string, definition: string, inputs: string[], module?: string }
//   delete-variable: { name: string, module?: string }
//   list-variables:  { module?: string }
//   run-tests:       { filter?: string, timeout?: number }
//   eval:            { code: string }

// --- Status ---
interface StatusMessage {
  type: "status";
  claude_connected: boolean;
}
```

### Channel Server → Claude Code (MCP notifications)

These are `notifications/claude/channel` events pushed to Claude's context:

```typescript
// User sent a chat message
{
  method: "notifications/claude/channel",
  params: {
    content: "Why is filtered_data empty?",
    meta: {
      type: "message",
      notebook: "file:///Users/tom/dev/lopecode-dev/lopecode/notebooks/@tomlarkworthy_debugger.html",
      sender: "user",
    }
  }
}

// Cell changed (automatic)
{
  method: "notifications/claude/channel",
  params: {
    content: "(x) => x.filter(d => d.value > threshold)",
    meta: {
      type: "cell-change",
      notebook: "file:///Users/tom/dev/lopecode-dev/lopecode/notebooks/@tomlarkworthy_debugger.html",
      module: "@tomlarkworthy/debugger",
      cell: "filtered_data",
      op: "upd",
    }
  }
}

// Notebook connected
{
  method: "notifications/claude/channel",
  params: {
    content: "Debugger — 51 modules loaded",
    meta: {
      type: "connected",
      notebook: "file:///Users/tom/dev/lopecode-dev/lopecode/notebooks/@tomlarkworthy_debugger.html",
      title: "Debugger",
      modules: "51",
    }
  }
}

// Notebook disconnected
{
  method: "notifications/claude/channel",
  params: {
    content: "Debugger disconnected",
    meta: {
      type: "disconnected",
      notebook: "file:///Users/tom/dev/lopecode-dev/lopecode/notebooks/@tomlarkworthy_debugger.html",
    }
  }
}
```

### Claude Code → Channel Server (MCP tool calls)

```typescript
// --- reply ---
// Claude sends markdown back to a notebook's chat widget
{
  name: "reply",
  arguments: {
    notebook_id: "file:///.../@tomlarkworthy_debugger.html",
    markdown: "The `threshold` filter is set to 0.99. Only 2 rows pass. Did you mean 0.09?"
  }
}

// --- get-variable ---
{
  name: "get-variable",
  arguments: {
    notebook_id: "file:///.../@tomlarkworthy_debugger.html",
    name: "threshold",
    module: "@tomlarkworthy/debugger"  // optional
  }
}

// --- define-variable ---
{
  name: "define-variable",
  arguments: {
    notebook_id: "file:///.../@tomlarkworthy_debugger.html",
    name: "threshold",
    definition: "() => 0.09",
    inputs: [],
    module: "@tomlarkworthy/debugger"  // optional
  }
}

// --- run-tests ---
{
  name: "run-tests",
  arguments: {
    notebook_id: "file:///.../@tomlarkworthy_debugger.html",
    filter: "test_sort",    // optional
    timeout: 30000          // optional, default 30s
  }
}

// --- list-variables ---
{
  name: "list-variables",
  arguments: {
    notebook_id: "file:///.../@tomlarkworthy_debugger.html",
    module: "@tomlarkworthy/debugger"  // optional
  }
}

// --- eval ---
{
  name: "eval",
  arguments: {
    notebook_id: "file:///.../@tomlarkworthy_debugger.html",
    code: "document.querySelectorAll('.error').length"
  }
}

// --- fork-notebook ---
{
  name: "fork-notebook",
  arguments: {
    notebook_id: "file:///.../@tomlarkworthy_debugger.html",
    suffix: "experiment-1"  // optional, defaults to timestamp
  }
}
```

## Forking Notebooks

A key feature of Lopecode is that notebooks are single HTML files that self-serialize. This makes forking cheap — copy the file, open it, and you have an independent working copy with full state.

### Why Fork?

Claude should fork before making risky or exploratory changes:

- Testing a refactor without breaking the user's working notebook
- Trying multiple approaches in parallel
- Running destructive experiments (deleting cells, changing data pipelines)
- Prototyping a feature before proposing it to the user

### Fork Flow

```
1. Claude calls fork-notebook tool:
   { notebook_id: "file:///path/debugger.html", suffix: "experiment-1" }

2. Channel server sends to notebook:
   { type: "command", id: "fork-1", action: "fork", params: { suffix: "experiment-1" } }

3. Notebook triggers self-serialization (exporter module):
   - Generates full HTML snapshot of current state
   - Saves to: debugger--experiment-1.html (sibling file)

4. Notebook sends result:
   { type: "command-result", id: "fork-1", ok: true,
     result: { path: "file:///path/debugger--experiment-1.html" } }

5. Channel server returns to Claude:
   { content: [{ type: "text",
     text: "Forked to file:///path/debugger--experiment-1.html" }] }

6. Claude tells user: "I've forked the notebook. Open debugger--experiment-1.html
   to see my experiments, or I can work on it and report back."

7. If user opens the fork:
   - claude-channels module connects to same channel server (same token still valid)
   - notebook_id is the new URL (different file = different identity)
   - Claude now has two notebooks and can copy cells between them
```

### Fork Naming

```
Original:  @tomlarkworthy_debugger.html
Fork:      @tomlarkworthy_debugger--experiment-1.html
Fork:      @tomlarkworthy_debugger--1742515200000.html  (timestamp default)
```

The `--` separator distinguishes forks from the original. Forks are disposable — the user deletes them when done.

## User Journeys

### Journey 1: First-Time Setup

1. User adds `@tomlarkworthy/claude-channels` to their notebook via module-selection UI.
2. Module renders "Not Connected" panel:
   - "Connect to Claude Code to chat with Claude from this notebook"
   - Setup steps with copy-pasteable commands
   - Token input field (greyed out until they start the server)
   - Link to full documentation
3. User adds to `.mcp.json`:
   ```json
   { "mcpServers": { "lopecode": { "command": "bun", "args": ["tools/lopecode-channel.ts"] } } }
   ```
4. User starts: `claude --dangerously-load-development-channels server:lopecode`
5. Terminal shows: `lopecode-channel: pairing token: LOPE-7X3K`
6. User pastes `LOPE-7X3K` into notebook token field, clicks Connect.
7. Chat widget activates. Green dot. "Connected to Claude Code."

### Journey 2: Daily Pair Programming

1. `claude --dangerously-load-development-channels server:lopecode`
2. Open notebook. Paste today's pairing token. Connected.
3. Edit cells normally. Claude sees every edit as background context.
4. Type in chat: "Why is `filtered_data` empty?"
5. Claude reads the variable, traces dependencies, replies:
   > The `threshold` filter is 0.99 — only 2 of 10,000 rows pass. Did you mean 0.09?
6. User: "yes fix it"
7. Claude calls `define-variable` → user sees cell update live.

### Journey 3: Safe Experimentation via Forking

1. User: "I want to try replacing the layout algorithm but don't break what I have"
2. Claude calls `fork-notebook` → `debugger--layout-experiment.html` created.
3. Claude: "I've created a fork. Open `debugger--layout-experiment.html` to watch, or I'll work on it and report back."
4. User opens fork in new tab. It auto-connects to same channel.
5. Claude works in the fork: redefines cells, runs tests, iterates.
6. Claude reports in the original notebook's chat: "The force-directed layout works better — 40% fewer edge crossings. Want me to apply it here?"
7. User: "yes"
8. Claude copies the relevant cells from fork to original via `define-variable`.
9. User closes and deletes the fork.

### Journey 4: Debug Assist

1. User sees a red error indicator on a cell.
2. Types: "This cell is broken, help?"
3. Claude: calls `list-variables` to find errored cells, `get-variable` on the broken one and its inputs.
4. Replies:
   > `parse_date` expects ISO format but `raw_data` has US dates (MM/DD/YYYY).
   > The error is on row 847: `"13/25/2024"` — month 13 doesn't exist (probably day/month swapped).
   > Want me to fix `parse_date` to handle both formats?
5. User: "yes"
6. Claude calls `define-variable` with a patched parser. Downstream cells recompute.

### Journey 5: Test-Driven Development

1. User writes a new cell.
2. Types: "run tests"
3. Claude calls `run-tests` → "3 passed, 1 failed: `test_sort_order` — expected descending, got ascending"
4. User fixes the cell. Claude sees the edit (auto-pushed cell change).
5. Claude proactively: "Want me to re-run tests?"
6. User: "yes" → "4 passed, 0 failed"

### Journey 6: Cross-Notebook Copy

1. User has debugger notebook connected.
2. Types: "Grab the `color_palette` cell from the atlas notebook"
3. Claude uses its own filesystem tools (`lope-reader.js`) to read the atlas HTML.
4. Extracts the cell source.
5. Calls `define-variable` on the debugger notebook.
6. User sees the new cell appear live.

### Journey 7: Export to Observable

1. User: "Push the changes in @tomlarkworthy/debugger to Observable"
2. Claude runs `lope-push-to-observablehq.js` via Bash.
3. Reports in chat: "Pushed 3 cells: `parse_date`, `threshold`, `filtered_data`"

## Configuration

### `.mcp.json`

```json
{
  "mcpServers": {
    "lopecode": {
      "command": "bun",
      "args": ["tools/lopecode-channel.ts", "--port", "8787"]
    }
  }
}
```

### Starting Claude Code

```bash
# During research preview (custom channels not yet on allowlist)
claude --dangerously-load-development-channels server:lopecode

# Future (once approved as official plugin)
claude --channels plugin:lopecode@claude-plugins-official
```

### Notebook-side configuration

The `channel_config` cell defaults:

```javascript
channel_config = ({
  port: 8787,
  host: "127.0.0.1",
  autoConnect: false,   // true after first successful pair
})
```

## Technology Choices

| Choice | Rationale |
|--------|-----------|
| **Bun** | Native TS, built-in WebSocket server, fast startup, aligned with channel plugin ecosystem |
| **WebSocket** | Real-time bidirectional, lower latency than polling, natural for chat |
| **localhost:8787** | Matches fakechat default. Bind to `127.0.0.1` only — no network exposure |
| **MCP over stdio** | Standard channel transport. Claude Code spawns the server. |
| **notebook_id = URL** | Natural, unique, human-readable. Forks get different URLs automatically. |
| **Single pairing token** | Simple. One token per session, valid for all notebooks. Short-lived. |
| **Command/result correlation** | `id` field on commands enables async request-response over WebSocket |

## Security

- **Pairing token**: generated per-session, validated on WebSocket connect. Prevents other local processes from injecting messages.
- **localhost only**: `hostname: '127.0.0.1'` — no remote connections possible.
- **Port conflict**: if 8787 is taken, fail immediately with clear error. Do not auto-increment (avoids silent misconfiguration).
- **No persistent credentials**: token is ephemeral. No secrets stored in notebook or on disk.
- **Sender gating**: only paired WebSocket connections can push messages. Unpaired connections receive `pair-failed` and are closed.

## Out of Scope for v1

- **Reactive markdown interpolation** in Claude's replies (v2: render Observable JS in reply bubbles, e.g. `${Inputs.button("Apply fix")}`)
- **Persistent chat history** across sessions
- **Auto-reconnect with remembered tokens** (re-pair each session for security)
- **File/image attachments** in chat messages
- **Voice input** via Whisper integration
- **Plugin packaging** for `/plugin install` marketplace distribution
- **Screenshot tool** (requires notebook-side canvas capture — defer to v2)

## Background: Reference Implementation Guide

This section maps every part of the spec to existing code, modules, cells, and documentation that an implementing agent should study.

### Channel Protocol Reference

The Claude Code channels system is documented at:
- **Channels overview**: https://code.claude.com/docs/en/channels
- **Channels reference (build your own)**: https://code.claude.com/docs/en/channels-reference
- **Fakechat source** (official demo channel): https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/fakechat — the closest reference for building a two-way channel with a reply tool. Study this first.
- **MCP SDK**: `@modelcontextprotocol/sdk` npm package — provides `Server`, `StdioServerTransport`, `ListToolsRequestSchema`, `CallToolRequestSchema`.

### Existing Pair Programming Tools (predecessors)

The current REPL-based pair programming tools are the direct predecessors to this channel. They implement the same operations (define-variable, run-tests, eval, watch) over a different transport (stdin/stdout JSON + log files).

| File | What to learn from it |
|------|----------------------|
| `tools/lope-browser-repl.js` | Command dispatch pattern, `--log` auto-watch implementation, `readHistorySince` page-context function for polling `history`. The `watch` command and auto-watch interval are the prototype for the channel's change forwarding. |
| `tools/lope-node-repl.js` | JSON command protocol, `wait-for` pattern. Simpler than browser REPL — good for understanding the core command set without Playwright complexity. |
| `tools/tools.js` | **Critical.** All page-context functions: `runTestVariables`, `readLatestState`, `getCellInfo`, `listAllVariables`, `defineVariable`, `deleteVariable`, `findModule`, `serializeValue`. These are designed for `page.evaluate()` — the channel's WebSocket commands will need equivalent implementations that run in the notebook's browser context. |
| `tools/lope-runtime.js` | `loadNotebook()` API and LinkeDOM bootstrap. Not directly used by the channel (we use the real browser), but shows how the Observable runtime is initialized and what APIs are available on `execution.runtime`. |
| `tools/lope-reader.js` | Static analysis without a browser. Claude can use this via its own Bash tools to read module/cell source from notebooks on disk — relevant for the cross-notebook copy journey (Journey 6). |

### Chat Widget UI — Robocoop Reference

The `@tomlarkworthy/claude-channels` module's chat widget should be modeled on the existing Robocoop chat UIs. Study these:

**Robocoop-2** (`@tomlarkworthy/robocoop-2`, 48 cells):
- Notebook: `lopebooks/notebooks/@tomlarkworthy_robocoop-2.html` or `lopecode/notebooks/@tomlarkworthy_robocoop-2.html`
- Key cells:
  - `_robocoop` — main widget factory, composes prompt + response + controls
  - `_prompt` — user input with send button (includes Whisper audio integration)
  - `_response` — AI response rendering with markdown
  - `_convert` / `_convertContent` / `_convertContentElement` — message formatting pipeline (HTML/markdown parsing)
  - `_domParser` — safe HTML parsing for rendered content
  - `_background_tasks` — async task queue pattern for API calls
- Features to borrow: message history layout, user-right/AI-left alignment, status indicators, scrollable message area

**Robocoop-3** (`@tomlarkworthy/robocoop-3`, 163 cells):
- Notebook: `lopebooks/notebooks/@tomlarkworthy_robocoop-3.html`
- Key cells:
  - `_agent_conversation_view` — chat history renderer, sorts by timestamp, formats duration/token counts
  - `_agent_conversation_dom_sync` — syncs conversation state to DOM
  - `_agent_prompt` — user prompt input with send button
  - `_agent_records` — message storage (mutable array)
  - `_appendAgentRecord` — adds new message to history
  - `_css` — conversation view styling
  - `_provider_choice` / `_provider_openai_config` / `_anthropic_config` — multi-provider configuration UI
- Features to borrow: step-based conversation tracking, token/cost display, multi-provider model lists

**Which notebooks include Robocoop** (14 total): `@tomlarkworthy_atlas`, `@tomlarkworthy_debugger`, `@tomlarkworthy_editor-5`, `@tomlarkworthy_exporter-2`, `@tomlarkworthy_notes`, and others. Any of these can be used to study the chat UI live.

### Cell Change Tracking — Local Change History

The channel's automatic cell-change forwarding depends on `@tomlarkworthy/local-change-history`.

- Notebook: `lopecode/notebooks/@tomlarkworthy_local-change-history.html` (71 cells)
- Source module: `notebooks/@tomlarkworthy_jumpgate/modules/@tomlarkworthy/local-change-history.js`

**Key cells:**
- `history` — `Inputs.input([])` mutable array. Each entry: `{ t, op, module, _name, _inputs, _definition, source, pid }`. This is the variable the channel's `channel_change_forwarder` cell watches.
- `change_listener` — hooks into `onCodeChange` from runtime-sdk, filters infrastructure cells, pushes entries into `history`
- `initial_state` — snapshot of all variables at load time
- `replay_git` / `replayGitEntries` / `replayGitCommits` — restores definitions from IndexedDB on reload (provenance-tagged)
- `commitRuntimeHistorySince` — batches history entries into git commits in IndexedDB
- `tag(def, provenance)` / `read(def)` — attach/read `__provenance` metadata on definitions

**Change record format:**
```javascript
{ t: 1234567890, op: "new"|"upd"|"del", module: "@author/mod",
  _name: "cellName", _inputs: ["dep1"], _definition: "() => 42",
  source: "runtime", pid: "hash..." }
```

**Depends on `@tomlarkworthy/runtime-sdk`** for:
- `onCodeChange(callback)` — registers listener for variable definition changes
- `persistentId(variable)` — stable hash of name + definition
- `runtime` — direct access to Observable runtime instance

**Notebooks with local-change-history** (11 — these are candidates for channel integration):
`@tomlarkworthy_atlas`, `@tomlarkworthy_debugger`, `@tomlarkworthy_editor-5`, `@tomlarkworthy_exporter-2`, `@tomlarkworthy_jumpgate`, `@tomlarkworthy_local-change-history`, `@tomlarkworthy_lopecode-tour`, `@tomlarkworthy_lopepage-urls`, `@tomlarkworthy_lopepage`, `@tomlarkworthy_notes`, `@tomlarkworthy_robocoop-2`

### Self-Serialization — Exporter Module (for forking)

The fork feature depends on `@tomlarkworthy/exporter-2`.

- Notebook: `lopecode/notebooks/@tomlarkworthy_exporter-2.html` (78 cells)
- Key cells:
  - `_exporter` — main factory, returns `{ handler, style, output, debug }`
  - `_actionHandler` — core export logic dispatcher
  - `_exportToHTML` — full HTML serialization pipeline: collects modules, compresses with gzip+base64, generates bootloader, creates `<script type="lope-file">` and `<script type="lope-module">` elements
  - `_exportAnchor` / `_downloadAnchor` / `_forkAnchor` — download UI trigger elements
  - `_notebook_name` / `_notebook_title` — metadata extraction
  - `_task_runtime` / `_task` — background task management during export

**Export flow** (relevant for implementing the `fork` command):
1. Collect all modules and their cell definitions from runtime
2. Compress module sources with gzip + base64 encoding
3. Generate bootloader with es-module-shims import hooks
4. Create `<script type="lope-file">` elements with encoded dependencies
5. Create `<script type="lope-module">` elements with cell definitions
6. Assemble into self-contained HTML (1-3MB)
7. Trigger browser download or write to disk

The `fork` WebSocket command needs to trigger this pipeline programmatically and save the result as a sibling file rather than downloading it.

### Cell Editing — Editor & Toolchain Modules

For understanding how `define-variable` works at the runtime level:

**`@tomlarkworthy/editor-5`** (98 cells):
- Notebook: `lopecode/notebooks/@tomlarkworthy_editor-5.html`
- Key cells: `_editedCell`, `_cellEditor`, `_apply` (applies cell changes to runtime), `_createCell`, `_deleteCell`
- Shows how user edits flow from CodeMirror → compile → `variable.define()`

**`@tomlarkworthy/observablejs-toolchain`** (98 cells):
- Compilation pipeline: Observable JS source → parsed AST → runtime variable definitions
- Handles `viewof`, `mutable`, destructuring, imports
- Key for understanding how complex cell types (viewof, mutable) produce multiple runtime variables

**`@tomlarkworthy/view`** (100 cells):
- The `view` tagged template for building reactive UI components
- Used extensively in all notebook UIs — the chat widget will likely use this

### Networking Internals

- `knowledge/lopecode-internal-networking.md` — **Critical.** Explains how the bootloader intercepts `fetch`, `XMLHttpRequest`, and ES module imports to serve embedded content. Important for understanding why the WebSocket connection from the notebook to the channel server works (it bypasses the intercept layer because it's a real network request to localhost, not a module import).

### Other Knowledge Articles

| Article | Relevance |
|---------|-----------|
| `knowledge/running-a-live-repl-session-with-a-notebook.md` | Patterns for persistent bidirectional sessions — the channel replaces this workflow |
| `knowledge/maintaining-and-updating-lopecode-and-lopebook-content-repositories.md` | How to publish the new `@tomlarkworthy/claude-channels` module: create on ObservableHQ, export via jumpgate, commit to lopecode repo |
| `knowledge/pushing-cells-to-observablehq.md` | For Journey 7 (export to Observable) — how `lope-push-to-observablehq.js` works |
| `knowledge/how-file-attachments-work.md` | File attachment resolution — relevant if the chat widget needs to display images or if forked notebooks need to preserve attachments |

### Testing Module

**`@tomlarkworthy/tests`** (26 cells):
- `latest_state` — `Map` of test variable name → `{ status, value, error }`. The `run-tests` and `read-tests` tools read from this.
- `test_*` naming convention — variables prefixed with `test_` are discovered by the test runner
- Present in most notebooks. Required for Journeys 4-5 (debug assist, TDD).

### Key Notebooks for Testing the Channel

These notebooks have all the required modules (local-change-history + exporter + tests + robocoop) making them ideal integration targets:

| Notebook | Path | Why |
|----------|------|-----|
| `@tomlarkworthy_debugger` | `lopecode/notebooks/@tomlarkworthy_debugger.html` | 51 modules, has everything. Used in our pair programming prototype. |
| `@tomlarkworthy_exporter-2` | `lopecode/notebooks/@tomlarkworthy_exporter-2.html` | Has exporter + history. Good for testing fork flow. |
| `@tomlarkworthy_editor-5` | `lopecode/notebooks/@tomlarkworthy_editor-5.html` | Has editor + history. Good for testing define-variable round-trips. |
| `@tomlarkworthy_atlas` | `lopecode/notebooks/@tomlarkworthy_atlas.html` | Has robocoop + history. Good for testing alongside existing chat UI. |
