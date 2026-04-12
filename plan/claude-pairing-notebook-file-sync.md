# Plan: File-Sync MCP Tool

## Goal

Add a `setup_file_sync` MCP tool that enables Claude Code to edit notebook modules as `.js` files on disk with live feedback via a streaming watcher.

## What it does

1. Checks if file-sync directory is active
2. If not, tells Claude Code to ask the user to click "Pick sync directory"
3. If active, returns sync path + list of synced modules
4. Attaches a watcher on `syncStatus` (or similar) so Claude Code gets a live stream of sync events
5. The tool description teaches Claude Code the workflow: edit `.js` files for code changes, use `get_variable`/`watch_variable`/`eval_code` for reading runtime state

## Implementation

### Step 1: Notebook-side — `fileSyncTools` cell in `@tomlarkworthy/file-sync`

Export a tool descriptor that the pairing module can discover:

```js
fileSyncTools = new Map([
  ["setup_file_sync", {
    description: "Enable file sync to edit notebook modules as .js files on disk. File-sync works at the define_variable level (compiled JS functions) — you get full LSP support, easy cell reordering, and standard file editing tools. Use get_variable/watch_variable to read runtime state. Once active, edit .js files in the returned sync path and changes appear in the notebook within 1 second. Requires user to click the directory picker if not already active.",
    inputSchema: { type: "object", properties: {} },
    handler: async (args) => {
      // return { active, path, modules } + attach watcher
    }
  }]
])
```

### Step 2: Notebook-side — `mcpTools` cell in `@tomlarkworthy/claude-code-pairing`

```js
import {fileSyncTools} from '@tomlarkworthy/file-sync'
mcpTools = new Map([...fileSyncTools])
```

### Step 3: Pairing handshake sends tools

Extend the `cc_ws` cell's pair message to include the resolved `mcpTools` descriptors:

```js
ws.send(JSON.stringify({
  type: "pair", token, url, title,
  tools: [...mcpTools].map(([name, t]) => ({
    name, description: t.description, inputSchema: t.inputSchema
  }))
}))
```

### Step 4: Channel server — dynamic tool support in `lopecode-channel.ts`

1. On `pair` message: store the `tools` array per-notebook in a `dynamicTools` map
2. On `register-tools` message: update the tools and emit `notifications/tools/list_changed`
3. In `tools/list` handler: return static tools + all dynamic tools from connected notebooks
4. In `CallToolRequestSchema` handler: if tool is dynamic, send `{type: "command", action: "call-tool", params: {name, args}}` over the notebook's websocket
5. On notebook disconnect: remove its tools, emit `tools/list_changed`

### Step 5: Notebook-side — `setup_file_sync` handler wires up watcher

When the tool is called:
- Check `directory` cell value
- If null: return `{content: [{type: "text", text: "File sync not active. Please click 'Pick sync directory' in the notebook."}]}`
- If active: 
  - Attach a watcher on `syncStatus` via existing watch mechanism (sends updates over the channel)
  - Return `{content: [{type: "text", text: "File sync active. Path: <path>. Modules: [...]. Watching for sync events."}]}`

## Files to modify

| File | Change |
|------|--------|
| `@tomlarkworthy/file-sync` (on Observable) | Add `fileSyncTools` cell |
| `@tomlarkworthy/claude-code-pairing` (on Observable) | Add `mcpTools` cell, import `fileSyncTools` |
| `tools/channel/lopecode-channel.ts` | Dynamic tool registration, routing, `tools/list_changed` |

## Not in scope

- Migrating existing hardcoded tools to notebook-declared (Phase 4 from old plan)
- Multi-notebook tool namespacing (keep first-wins for now)
- Dynamic MCP instructions
