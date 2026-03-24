# Live Collaboration with Claude Code Pairing

Pair program with Claude directly from a Lopecode notebook. Chat, watch reactive variables, define cells, manipulate the DOM, run tests — all through a two-way channel between the browser and Claude Code.

## Quick Start

### Connection string

Claude provides this URL when starting a session. Open it in any browser:

```
https://tomlarkworthy.github.io/lopecode/notebooks/@tomlarkworthy_blank-notebook.html#view=R100(S50(@tomlarkworthy/blank-notebook),S25(@tomlarkworthy/module-selection),S25(@tomlarkworthy/claude-code-pairing))&cc=LOPE-PORT-XXXX
```

The notebook auto-connects — no manual token paste needed.

### For lopecode-dev developers

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

Use `get_pairing_token` MCP tool to retrieve the token, then open the connection URL.

## Architecture

```
Browser (Notebook)  ←→  WebSocket  ←→  Channel Server (Bun)  ←→  MCP stdio  ←→  Claude Code
```

- **Channel Server** (`tools/channel/lopecode-channel.ts`): Bridges WebSocket to MCP
- **Notebook Module** (`@tomlarkworthy/claude-code-pairing`): Observable module with chat UI, watch table, command handler
- **MCP Tools**: Claude calls `reply`, `get_variable`, `define_variable`, `watch_variable`, etc.

## Pairing

Each session generates a token in format `LOPE-PORT-XXXX` (e.g., `LOPE-8787-Q2SM`). The port is encoded in the token so the notebook connects to the correct WebSocket server automatically.

### Auto-connect via `&cc=` hash parameter

The `&cc=TOKEN` parameter in the hash URL triggers auto-connect on page load. The notebook parses the port from the token and connects without manual intervention.

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

## Available MCP Tools

| Tool | Description | Key Params |
|------|-------------|------------|
| `get_pairing_token` | Returns the session pairing token | — |
| `reply` | Send markdown to notebook chat | `markdown`, `notebook_id?` |
| `get_variable` | Read a runtime variable's value | `name`, `module?`, `notebook_id?` |
| `define_variable` | Create or redefine a variable | `name`, `definition`, `inputs[]`, `module?` |
| `delete_variable` | Remove a variable | `name`, `module?` |
| `list_variables` | List all named variables | `module?` |
| `run_tests` | Run `test_*` variables | `filter?`, `timeout?` |
| `eval_code` | Evaluate JS in browser context | `code` |
| `watch_variable` | Subscribe to reactive updates | `name`, `module?`, `notebook_id?` |
| `unwatch_variable` | Unsubscribe from a variable | `name`, `module?`, `notebook_id?` |
| `fork_notebook` | Self-serialize to sibling HTML file | `suffix?` |

## Variable Watching

`watch_variable` subscribes to reactive updates via runtime-sdk's `observe()`. Changes are debounced (1s, latest value wins) and serialized via `summarizeJS`.

### Auto-watches on connect

The module automatically watches `hash` and `currentModules` when a connection is established, giving Claude immediate visibility into the page layout and loaded modules.

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
- `@tomlarkworthy/runtime-sdk` → `runtime_variables`, `observe`
- `@tomlarkworthy/summarizejs` → `summarizeJS`
- `d/57d79353bac56631@44` → `hash`

## Cell Change Forwarding

When the notebook includes `@tomlarkworthy/local-change-history`, the `cc_change_forwarder` cell polls the `history` variable every second and sends new entries to Claude as `cell_change` notifications. Claude sees every cell edit in real-time.

## Forking

The best way to fork is to open the exporter-2 panel (`&open=@tomlarkworthy/exporter-2` in the hash) and click the fork button. The exporter passes all URL params (including `&cc=` token) forward automatically, so the fork auto-connects.

The `fork_notebook` MCP tool also works for `file://` notebooks — it serializes the HTML and saves to a sibling file on disk.

## Injecting into Existing Notebooks

For notebooks that don't already include `@tomlarkworthy/claude-code-pairing`:

```bash
node tools/channel/inject-module.js <input.html> <output.html>
```

This injects the module, adds it to `bootconf.json` mains, and updates the hash layout.

## Environment Variables

- `LOPECODE_PORT` — WebSocket server port (default: 8787). Encoded in the pairing token.

## Known Limitations

- **No persistent chat history** — messages are lost on page reload
- **eval is synchronous** — async code in `eval_code` won't return resolved values
- **No activity feed** — Claude's thinking/tool use is invisible in the notebook UI (see [issue #9](https://github.com/tomlarkworthy/lopecode-dev/issues/9))
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
├── inject-module.js              # Injection tool for existing notebooks
└── package.json                  # Dependencies
```

### What still needs to happen

- **Marketplace submission** — submit plugin to Claude's marketplace or self-host
- **Activity feed** — tail Claude's session log to show thinking/tool use in notebook UI ([#9](https://github.com/tomlarkworthy/lopecode-dev/issues/9))
- **Hash param preservation** — fix bootloader hash mangling ([#140](https://github.com/tomlarkworthy/lopecode/issues/140))

## Running Tests

```bash
node --test tools/test-lopecode-channel.js
```
