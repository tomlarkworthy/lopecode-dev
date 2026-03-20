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
lopecode-channel: pairing token: LOPE-XXXX
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

Each server session generates a single-use token (`LOPE-XXXX`). The same token pairs all notebooks in that session. Token is validated on the first WebSocket message only.

1. Server prints token to stderr
2. Claude shows it to the user
3. User pastes into notebook chat widget
4. Widget sends `{type: "pair", token, url, title}` over WebSocket
5. Server validates and sends `{type: "paired", notebook_id}`
6. Claude receives a `connected` notification

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

When only one notebook is connected, `notebook_id` can be omitted.

## Injecting Cells into a Notebook

The cells are defined in `tools/channel/cells.ts`. They can be injected programmatically using `define-variable`:

| Cell | Inputs | Purpose |
|------|--------|---------|
| `cc_config` | — | `{port: 8787, host: "127.0.0.1"}` |
| `cc_notebook_id` | — | `location.href` |
| `cc_status` | `Inputs` | Reactive status: disconnected/connecting/pairing/connected |
| `cc_messages` | `Inputs` | Reactive message array |
| `cc_ws` | `cc_config`, `cc_notebook_id`, `cc_status`, `cc_messages`, `invalidation` | WebSocket connection + command handler |
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
- **Cells must be injected manually** — until a proper `@tomlarkworthy/claude-channels` Observable module is created

## Migration Path

The current implementation injects cells programmatically. The long-term path:

1. Create `@tomlarkworthy/claude-channels` module on ObservableHQ
2. Add it to notebooks via the module-selection UI
3. Export via jumpgate to embed in HTML files
4. Cells become native — no injection needed

## Running Tests

```bash
node --test tools/test-lopecode-channel.js
```

Tests the channel server's WebSocket protocol, pairing, message forwarding, and disconnection handling.
