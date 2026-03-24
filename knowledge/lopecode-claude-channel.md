# Lopecode Claude Channel

A two-way communication channel between Lopecode notebooks (browser) and Claude Code sessions. Chat with Claude directly from your notebook. Claude can read variables, define cells, run tests, and fork notebooks.

## Setup

### 1. Configure MCP Server

The `.mcp.json` at the project root is already configured:

```json
{
  "mcpServers": {
    "lopecode": {
      "command": "bun",
      "args": ["run", "tools/channel/lopecode-channel.ts"]
    }
  }
}
```

### 2. Start Claude Code with the Channel

```bash
claude --dangerously-load-development-channels server:lopecode
```

Claude's terminal will show:
```
lopecode-channel: pairing token: LOPE-PORT-XXXX
lopecode-channel: WebSocket server on ws://127.0.0.1:8787/ws
```

### 3. Connect a Notebook

The notebook needs the `cc_*` cells injected (either as a proper Observable module or via `define-variable`). Once injected, the chat widget shows a setup panel where you paste the pairing token and click Connect.

## Architecture

```
Browser (Notebook)  ←→  WebSocket  ←→  Channel Server (Bun)  ←→  MCP stdio  ←→  Claude Code
```

- **Channel Server** (`tools/channel/lopecode-channel.ts`): Bridges WebSocket connections from notebooks to Claude via MCP
- **Notebook Cells** (`tools/channel/cells.ts`): Observable cells that handle WebSocket connection, command execution, change forwarding, and chat UI
- **MCP Tools**: Claude calls tools like `reply`, `get_variable`, `define_variable`, `run_tests`, etc.

## Pairing

Each server session generates a single-use token (`LOPE-PORT-XXXX`). The same token pairs all notebooks in that session. Token is validated on the first WebSocket message only.

1. Server prints token to stderr (also retrievable via `get_pairing_token` MCP tool)
2. Claude shows it to the user
3. User pastes into notebook chat widget
4. Widget sends `{type: "pair", token, url, title}` over WebSocket
5. Server validates and sends `{type: "paired", notebook_id}`
6. Claude receives a `connected` notification

### Auto-connect via hash URL

The pairing token can be embedded in the notebook's hash URL using the `cc=` parameter. This enables:
- **Programmatic reconnection**: Claude can set the hash and reload the page to force a reconnect with the new token
- **Bookmarkable sessions**: Users can bookmark a URL with the token for quick reconnection

Example hash: `#view=R100(S50(@tomlarkworthy/blank-notebook),S25(@tomlarkworthy/module-selection),S25(@tomlarkworthy/claude-code-pairing))&cc=LOPE-PORT-XXXX`

The `cc=` parameter is parsed from the hash fragment using `&` as the separator (not `?`, which doesn't work inside hash fragments). The `@tomlarkworthy/claude-code-pairing` module auto-connects on load when it finds this parameter.

**Claude can trigger a reload with auto-connect** using `eval_code`:
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

This is useful when the notebook needs to reload (e.g., after module code changes) — Claude can inject the token and reload in one step, avoiding manual re-pairing.

## Available MCP Tools

| Tool | Description | Key Params |
|------|-------------|------------|
| `reply` | Send markdown to notebook chat | `markdown`, `notebook_id?` |
| `get_variable` | Read a runtime variable's value | `name`, `module?`, `notebook_id?` |
| `define_variable` | Create or redefine a variable | `name`, `definition`, `inputs[]`, `module?` |
| `delete_variable` | Remove a variable | `name`, `module?` |
| `list_variables` | List all named variables | `module?` |
| `run_tests` | Run `test_*` variables | `filter?`, `timeout?` |
| `eval_code` | Evaluate JS in browser context | `code` |
| `fork_notebook` | Self-serialize to sibling HTML | `suffix?` |
| `watch_variable` | Subscribe to reactive updates | `name`, `module?`, `notebook_id?` |
| `unwatch_variable` | Unsubscribe from a variable | `name`, `module?`, `notebook_id?` |
| `get_pairing_token` | Returns the session pairing token | — |

When only one notebook is connected, `notebook_id` can be omitted.

## Variable Watching

Claude can subscribe to reactive variable updates using `watch_variable`. When the variable's value changes in the Observable runtime, a notification is pushed automatically.

```
watch_variable(name: "currentModules", module: "@tomlarkworthy/module-map")
```

Updates arrive as channel notifications:
```
<channel source="lopecode" type="variable_update" notebook="file:///..." name="currentModules" module="@tomlarkworthy/module-map">
serialized value (via summarizeJS, truncated to 2000 chars)
</channel>
```

Use `unwatch_variable` to stop receiving updates. All watches are automatically cleaned up on disconnect.

### How it works

1. `watch_variable` MCP tool sends a `watch` command to the notebook
2. Notebook installs an observer on the runtime variable via `_observer`
3. Forces the variable reachable if needed (so it computes)
4. On each `fulfilled`/`rejected` callback, sends a `variable-update` WebSocket message
5. Channel server forwards it as a `notifications/claude/channel` notification
6. Current value is sent immediately if already available

## Injecting Cells into a Notebook

The module is defined in `tools/channel/claude-code-pairing-module.js`. It can be injected into a notebook HTML using `tools/channel/inject-module.js`.

### Module imports

The claude-code-pairing module imports from these dependencies:
- `@tomlarkworthy/module-map` → `currentModules`, `moduleMap`
- `@tomlarkworthy/runtime-sdk` → `runtime_variables`, `observe`
- `@tomlarkworthy/summarizejs` → `summarizeJS` (used for value serialization)
- `d/57d79353bac56631@44` → `hash` (reactive page URL/layout state)

### Cells

| Cell | Inputs | Purpose |
|------|--------|---------|
| `cc_config` | — | `{port: 8787, host: "127.0.0.1"}` |
| `cc_notebook_id` | — | `location.href` |
| `cc_status` | `Inputs` | Reactive status: disconnected/connecting/pairing/connected |
| `cc_messages` | `Inputs` | Reactive message array |
| `cc_ws` | `cc_config`, `cc_notebook_id`, `cc_status`, `cc_messages`, `summarizeJS`, `invalidation` | WebSocket connection + command handler |
| `cc_change_forwarder` | `cc_ws`, `invalidation` | Polls `history` variable, forwards cell changes |
| `cc_chat` | `cc_messages`, `cc_status`, `cc_ws`, `md`, `htl`, `Inputs` | Chat widget UI |

### Injection order matters

Define them in dependency order: `cc_config` → `cc_notebook_id` → `cc_status` → `cc_messages` → `cc_ws` → `cc_change_forwarder` → `cc_chat`.

### Using the cells.ts helper

```typescript
import { getCellDefinitions } from './tools/channel/cells.ts';

const defs = getCellDefinitions();
// defs.cc_ws = { name: "cc_ws", inputs: [...], definition: "function cc_ws(...) { ... }" }
```

## Cell Change Forwarding

When a notebook includes `@tomlarkworthy/local-change-history`, the `cc_change_forwarder` cell automatically polls the `history` variable every second and sends new entries to Claude as `cell_change` notifications. Claude sees every cell edit in real-time.

## Forking

Claude can fork a notebook to experiment safely:

1. Calls `fork_notebook` tool
2. Notebook's `_exportToHTML` function generates a full HTML snapshot
3. Channel server saves it as a sibling file (e.g., `notebook--experiment.html`)
4. User can open the fork in a new tab — it auto-connects with the same token

Requires `@tomlarkworthy/exporter-2` in the notebook.

## Environment Variables

- `LOPECODE_PORT` — WebSocket server port (default: 8787)

## Known Limitations

- **No persistent chat history** — messages are lost when the page reloads
- **No auto-reconnect** — re-pair each session (security by design)
- **eval is synchronous** — async code in `eval_code` won't return resolved values
- **Fork payload size** — 1-3MB HTML over WebSocket (Bun handles this fine)
- **Cells must be injected manually** — until a proper `@tomlarkworthy/claude-code-pairing` Observable module is created

## Distribution via Claude Marketplace

The target user journey for new users:

1. **Install** — User adds the lopecode-channel MCP server from Claude's marketplace
2. **Open** — Channel server serves a starter notebook at `http://127.0.0.1:8787/` with claude-code-pairing module pre-loaded
3. **Auto-pair** — Served HTML embeds the pairing token, no manual paste needed for localhost
4. **Collaborate** — Claude and user pair program in the notebook: chat, watch variables, define cells, run tests
5. **Save** — User exports/forks the notebook to local filesystem as a self-contained HTML file
6. **Grow** — User adds modules via module-selection, builds up their notebook, re-exports as needed

### What needs to happen

- **HTTP notebook serving**: Channel server serves a bootable lopecode notebook at `/` (currently just returns plain text)
- **HTTP initialization pathway**: Notebook must bootstrap from HTTP — import maps resolve modules from the server or a CDN rather than `file://` embedded scripts
- **Zero-config pairing**: For localhost, embed the token in the served HTML so the connection is instant
- **Marketplace packaging**: Single `package.json` with Bun runtime, MCP server definition in marketplace format

### Current migration path

The current implementation injects cells programmatically. The intermediate path:

1. Create `@tomlarkworthy/claude-code-pairing` module on ObservableHQ
2. Add it to notebooks via the module-selection UI
3. Export via jumpgate to embed in HTML files
4. Cells become native — no injection needed

## Running Tests

```bash
node --test tools/test-lopecode-channel.js
```

Tests the channel server's WebSocket protocol, pairing, message forwarding, and disconnection handling.
