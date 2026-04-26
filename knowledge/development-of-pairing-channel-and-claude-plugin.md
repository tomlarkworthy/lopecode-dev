# Development of Pairing Channel & Claude Plugin

How the channel server, notebook pairing module, and dynamic MCP tools fit together. Read this when modifying any part of the Claude Code <-> notebook bridge.

## Architecture Principle: Keep the Channel Server Thin

The channel server (`tools/channel/lopecode-channel.ts`) is a **dumb pipe**. It translates between MCP stdio and WebSocket — nothing more. All application logic lives in the notebook.

```
Claude Code  <--MCP stdio-->  Channel Server  <--WebSocket-->  Notebook
                               (dumb pipe)                    (all logic here)
```

**The channel server MUST NOT contain:**
- Tool-specific behavior (e.g., "if setup_file_sync returns active, auto-watch X")
- Observable runtime knowledge
- Cell compilation or parsing
- State beyond connection management

**The channel server DOES contain:**
- MCP protocol handling (tool list, tool call dispatch, notifications)
- WebSocket connection lifecycle (pair, disconnect, reconnect)
- Pairing token generation
- Dynamic tool registration routing (but not tool logic)
- Value serialization at the MCP boundary (summarizeJS bridging)

When you're tempted to add behavior to the channel server, ask: "Could this live in the notebook instead?" If yes, put it there. The notebook is reactive, testable, visible to the user, and doesn't require restarting Claude Code to update.

## Dynamic MCP Tools

Notebooks can declare MCP tools that Claude Code discovers dynamically. This is how `setup_file_sync` works, and the pattern supports adding more tools over time.

### How it works

1. **Notebook declares tools** — A module exports a Map of tool descriptors (name → {description, inputSchema, handler}). Example: `fileSyncTools` in `@tomlarkworthy/file-sync`.

2. **Pairing module aggregates tools** — `viewof mcpTools = Inputs.input(new Map())` is a stable container. A separate updater cell pushes tool maps into it: `$0.value = new Map([...(fileSyncTools || [])])`. The `viewof` pattern prevents reactive cascades from tearing down the websocket (see below).

3. **Pair message includes tools** — When `cc_ws` connects, it reads `viewof mcpTools.value` (imperative read, not reactive dep) and sends tool descriptors in the `pair` message.

4. **Channel server registers tools** — On `pair`, stores tools in `dynamicTools` Map keyed by notebook URL. Emits `notifications/tools/list_changed` so Claude Code refreshes its tool list.

5. **Tool calls route back to notebook** — When Claude calls a dynamic tool, the channel server finds it in `dynamicTools`, sends a `call-tool` command over the originating notebook's WebSocket, and returns the result.

6. **Notebook handler executes** — `cc_handle_call_tool` in the pairing module looks up the tool in `viewof mcpTools.value` and calls its handler.

7. **On disconnect** — Channel server removes the notebook's tools from `dynamicTools` and emits `tools/list_changed`.

### Adding a new dynamic tool

To add a new tool from any notebook module:

1. Export a tool Map from your module (like `fileSyncTools`):
   ```js
   myTools = new Map([
     ["my_tool_name", {
       description: "What this tool does",
       inputSchema: { type: "object", properties: { arg1: { type: "string" } } },
       handler: async (args) => {
         return { content: [{ type: "text", text: "result" }] };
       }
     }]
   ])
   ```

2. Import it in the pairing module and add to the `mcpToolsUpdater` cell:
   ```js
   $0.value = new Map([...(fileSyncTools || []), ...(myTools || [])]);
   ```

3. No channel server changes needed.

### The `watches` side-channel

Tool handlers can return a `watches` array alongside `content` to auto-attach reactive watches:

```js
handler: async () => ({
  content: [{ type: "text", text: JSON.stringify({ active: true, ... }) }],
  watches: [{ name: "syncStatus", module: "@tomlarkworthy/file-sync" }]
})
```

`cc_handle_call_tool` processes this: it calls `cc_watchers.watchVariable(runtime, name, module)` for each entry, then strips `watches` from the result before sending to the channel. This keeps watch logic in the notebook, not the server.

### Re-registering tools at runtime

If a notebook's tool set changes after pairing (e.g., a new module loads), it can send a `register-tools` WebSocket message:
```js
ws.send(JSON.stringify({ type: "register-tools", tools: [...] }))
```
The channel server updates `dynamicTools` and emits `tools/list_changed`.

## Reactive Decoupling: The `viewof` Pattern

**Problem:** The websocket cell (`cc_ws`) must not reconnect when upstream data changes. But `cc_ws` needs access to `mcpTools` (for the pair message) and `cc_handle_call_tool` needs access to tools (for dispatching calls). If these are reactive dependencies, any tool change → `cc_ws` reconnect.

**Solution:** Use `viewof mcpTools = Inputs.input(new Map())` as a stable container:

- `cc_ws` depends on `viewof mcpTools` (the DOM element, stable) and reads `.value` imperatively
- `cc_handle_call_tool` depends on `viewof mcpTools` (stable) and reads `$0.value` at call time
- A separate updater cell pushes new values: `$0.value = new Map([...]); $0.dispatchEvent(new Event("input"))`
- The updater reacts to `fileSyncTools` changes, but `cc_ws` does not — the viewof element is the same object

This pattern applies whenever you need to pass changing data to `cc_ws` or `cc_command_handlers` without triggering reconnection. The `$0`/`$1` convention in compiled cells refers to `viewof` elements passed as dependencies.

## File-Sync Integration

`@tomlarkworthy/file-sync` provides the `setup_file_sync` dynamic MCP tool. When called:

- If `directory` is null: returns instructions to click "Pick sync directory"
- If active: returns sync status (directory name, path, module list) + `watches: [{name: "syncStatus", ...}]` to auto-attach a watcher

The file-sync module syncs `.js` files on disk ↔ notebook cells. It uses `probeDefine` to extract cells and `tag({source: "file-sync"})` for echo suppression.

### Dependency chain (safe)

```
directory → fileSyncTools → mcpToolsUpdater → viewof mcpTools.value
                                                    ↑ (imperative read)
                                               cc_ws (stable, no reconnect)
```

### Known issue: one reconnect on initial sync

When file-sync applies the pairing module from disk, it updates `cc_command_handlers` (which depends on `cc_handle_call_tool`), which triggers `cc_ws` to reconnect. The connection recovers immediately. This is acceptable for now — fixing it would require decoupling `cc_command_handlers` from `cc_ws` with another `viewof` layer.

## Channel Server Internals

### Dynamic tool storage

```typescript
type DynamicTool = { name: string; description: string; inputSchema: any; notebookUrl: string };
const dynamicTools = new Map<string, DynamicTool[]>(); // notebook URL → tools
```

### MCP capabilities

```typescript
capabilities: {
  tools: { listChanged: true },  // Critical: enables notifications/tools/list_changed
  experimental: { "claude/channel": {} }
}
```

The `listChanged: true` capability is required for Claude Code to subscribe to `notifications/tools/list_changed`. Without it, dynamic tools are registered but Claude never discovers them.

### Health endpoint

`GET /health` returns connection counts and dynamic tool names per notebook URL — useful for debugging.

## Testing Dynamic Tools

1. Start Claude Code with the channel
2. Open a notebook with pairing + file-sync modules
3. Check `setup_file_sync` appears in Claude's tool list (via ToolSearch)
4. Call it — should return inactive status
5. Pick a sync directory in the notebook
6. Call it again — should return active status + auto-attach syncStatus watch
7. Verify syncStatus updates arrive as variable_update notifications
