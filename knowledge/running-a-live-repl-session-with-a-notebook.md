# Running a Live REPL Session with a Notebook

Both `lope-node-repl.js` (default) and `lope-browser-repl.js` support persistent bidirectional sessions. The node REPL is preferred unless you need DOM interaction, screenshots, or browser-only APIs.

## Tool Reference: lope-runtime.js (Core Library)

The foundation for `lope-node-repl.js`. Loads notebooks using LinkeDOM + `vm.SourceTextModule` — mirrors the browser bootstrap exactly (bootloader, stdlib, builtins, mains). No browser needed.

```javascript
import { loadNotebook } from './tools/lope-runtime.js';

const execution = await loadNotebook('notebook.html', {
  settleTimeout: 10000,     // ms to wait for boot
  log: console.error,       // logging function
  localStorage: {},         // pre-populate localStorage
  hash: '#view=...',        // override location.hash
  search: '?source=...',   // set location.search
  observer: () => ({}),     // observer factory
});

execution.runtime;          // Observable Runtime (direct access)
execution.document;         // LinkeDOM document
execution.mains;            // Map(name -> module)

execution.getVariable(name, module);
execution.defineVariable(name, inputs, fn, module);
execution.waitForVariable(name, timeout);
execution.runTests(timeout, filter);
execution.eval(code);
execution.dispose();
```

Requires `node --experimental-vm-modules`.

## Tool Reference: lope-node-repl.js (Node REPL)

Runs the Observable runtime directly in Node.js — no browser needed. Uses `lope-runtime.js` internally. **Prefer this over lope-browser-repl.js** unless you need DOM interaction, screenshots, or browser-specific APIs.

```bash
node --experimental-vm-modules tools/lope-node-repl.js [--verbose]
```

Supports JSON commands: `load`, `list-variables`, `get-variable`, `eval`, `define-variable`, `delete-variable`, `run-tests`, `wait-for`, `status`, `quit`. Does NOT support: `query`, `click`, `fill`, `download`, `screenshot`.

The `load` command runs the full bootloader pipeline — stdlib builtins (Inputs, d3, Plot, md, htl, etc.) are available to all cells.

## Tool Reference: lope-browser-repl.js (Browser REPL)

For iterative development with a persistent browser session. Use when you need DOM queries, clicks, screenshots, or browser-only APIs:

```bash
# Start REPL
node tools/lope-browser-repl.js

# With visible browser for debugging
node tools/lope-browser-repl.js --headed --verbose

# With log file (enables auto-watch for cell changes)
node tools/lope-browser-repl.js --headed --log /tmp/lope-pair.log
```

### Full JSON Command Protocol

Both REPLs accept JSON commands via stdin. The browser REPL supports all commands; the node REPL supports all except `query`, `click`, `fill`, `download`, `screenshot`, `read-tests`.

```json
{"cmd": "load", "notebook": "path/to/notebook.html", "hash": "view=@module1,@module2"}
{"cmd": "run-tests", "timeout": 30000, "filter": "test_foo", "force": true}
{"cmd": "read-tests", "timeout": 30000}
{"cmd": "eval", "code": "window.__ojs_runtime._variables.size"}
{"cmd": "get-variable", "name": "myVar"}
{"cmd": "list-variables"}
{"cmd": "define-variable", "name": "myVar", "definition": "() => 42", "inputs": [], "module": "@tomlarkworthy/tests"}
{"cmd": "delete-variable", "name": "myVar", "module": "@tomlarkworthy/tests"}
{"cmd": "query", "selector": "button", "limit": 10}
{"cmd": "click", "selector": "button.run-all"}
{"cmd": "fill", "selector": "input[type='text']", "value": "hello"}
{"cmd": "download", "selector": "text=Download", "path": "output.html"}
{"cmd": "screenshot", "path": "output.png", "fullPage": true}
{"cmd": "watch", "timeout": 60000, "interval": 500}
{"cmd": "status"}
{"cmd": "quit"}
```

### Key commands

- `run-tests` - Runs tests by forcing reachability (works always)
- `read-tests` - Reads from `latest_state` (requires tests module visible in hash URL)
- `define-variable` - Define or redefine a runtime variable (see below)
- `watch` - Poll for cell changes via `history` variable (from `@tomlarkworthy/local-change-history`)
- `query` - Find elements by CSS selector (returns count, tag, text, visibility)
- `click` - Click on a UI element by CSS selector
- `fill` - Fill an input field with a value
- `download` - Click element and capture file download
- `screenshot` - Takes screenshot of current page

### define-variable / delete-variable

**Module selection:** Both commands accept an optional `module` parameter specifying which module to target. If omitted, defaults to the main/first module. Use the module name as it appears in the notebook (e.g., `"@tomlarkworthy/tests"`).

```json
{"cmd": "define-variable", "name": "myVar", "definition": "() => 42", "inputs": [], "module": "@tomlarkworthy/tests"}
{"cmd": "delete-variable", "name": "myVar", "module": "@tomlarkworthy/tests"}
```

**define-variable parameters:**
- `name` - Variable name (required)
- `definition` - Function as string, e.g. `"() => 42"` or `"(x, y) => x + y"` (required)
- `inputs` - Array of dependency names (default: `[]`)
- `module` - Target module name (default: main module)

Example with dependencies:
```json
{"cmd": "define-variable", "name": "doubled", "definition": "(value) => value * 2", "inputs": ["value"]}
```

### Logging (`--log <path>`)

All JSON responses are appended to the log file. When logging is enabled and a notebook is loaded, **auto-watch** starts automatically — a background poller checks for cell changes every second and writes `{"event": "change", ...}` entries to the log. No need to send `watch` commands manually.

### Important limitations

The `eval` command does NOT support async functions. Use synchronous IIFEs only — async IIFEs return `{}` instead of the resolved value. For timing, poll with repeated sync evals rather than using `await`.

## Quick one-shot usage

Pipe commands and let stdin close:

```bash
echo '{"cmd": "load", "notebook": "lopecode/notebooks/@tomlarkworthy_exporter-2.html"}
{"cmd": "list-variables"}
{"cmd": "quit"}' | node tools/lope-node-repl.js
```

For the browser REPL, replace `lope-node-repl.js` with `lope-browser-repl.js`.

## Persistent bidirectional session

To keep the REPL alive across multiple commands, use a named pipe for input and a file for output.

### Setup

```bash
# Create named pipe and start REPL
rm -f /tmp/node-repl-pipe /tmp/node-repl-out
mkfifo /tmp/node-repl-pipe
exec 3<>/tmp/node-repl-pipe  # keeps pipe open so REPL doesn't see EOF
node tools/lope-node-repl.js < /tmp/node-repl-pipe > /tmp/node-repl-out 2>/tmp/node-repl-err &
echo $! > /tmp/node-repl-pid
```

Run the setup in a background task, then wait for the ready line in `/tmp/node-repl-out`.

### Send/receive helper

Create `/tmp/repl-send.sh`:

```bash
#!/bin/bash
# Usage: bash /tmp/repl-send.sh '{"cmd": "..."}'
BEFORE=$(wc -l < /tmp/node-repl-out | tr -d ' ')
EXPECT=$((BEFORE + 1))
echo "$1" > /tmp/node-repl-pipe
for i in $(seq 1 60); do
  LINES=$(wc -l < /tmp/node-repl-out | tr -d ' ')
  if [ "$LINES" -ge "$EXPECT" ]; then
    sed -n "${EXPECT}p" /tmp/node-repl-out
    exit 0
  fi
  sleep 0.5
done
echo '{"ok":false,"error":"timeout waiting for response"}'
exit 1
```

### Usage

```bash
# Load a notebook (only needed once per session)
bash /tmp/repl-send.sh '{"cmd": "load", "notebook": "lopecode/notebooks/@tomlarkworthy_exporter-2.html"}'

# Subsequent commands reuse the loaded runtime
bash /tmp/repl-send.sh '{"cmd": "list-variables"}'
bash /tmp/repl-send.sh '{"cmd": "get-variable", "name": "compile", "module": "@tomlarkworthy/robocoop-2"}'
bash /tmp/repl-send.sh '{"cmd": "eval", "code": "1 + 1"}'

# Quit when done
bash /tmp/repl-send.sh '{"cmd": "quit"}'
```

### For large outputs

Redirect to a file and post-process with node:

```bash
bash /tmp/repl-send.sh '{"cmd": "list-variables"}' > /tmp/repl-vars.json
node -e "const d = JSON.parse(require('fs').readFileSync('/tmp/repl-vars.json','utf8')); console.log(d.result.count + ' variables');"
```

## Browser REPL persistent session

Same pattern, just swap the REPL binary and pipe names:

```bash
rm -f /tmp/browser-repl-pipe /tmp/browser-repl-out
mkfifo /tmp/browser-repl-pipe
exec 3<>/tmp/browser-repl-pipe
node tools/lope-browser-repl.js < /tmp/browser-repl-pipe > /tmp/browser-repl-out 2>/tmp/browser-repl-err &
```

The browser REPL additionally supports: `query`, `click`, `fill`, `download`, `screenshot`, `read-tests`, and `load` with `hash` parameter for layout control.

## Pair Programming (live collaboration)

Open a headed browser with logging to collaborate on a notebook in real-time. The agent watches the log for user edits and can push changes back via `define-variable`.

**Prerequisites:** The notebook must include `@tomlarkworthy/local-change-history` (provides the `history` variable that tracks cell edits).

**Setup:**
```bash
# 1. Create a named pipe for sending commands
mkfifo /tmp/lope-pair-pipe

# 2. Start headed REPL with log file (auto-watch enabled)
tail -f /tmp/lope-pair-pipe | node tools/lope-browser-repl.js --headed --log /tmp/lope-pair.log > /dev/null 2>/tmp/lope-pair-stderr.log &

# 3. Load notebook (include local-change-history in hash for observation)
echo '{"cmd": "load", "notebook": "lopecode/notebooks/NOTEBOOK.html", "hash": "view=R100(S50(@tomlarkworthy/MAIN_MODULE),S25(@tomlarkworthy/local-change-history),S25(@tomlarkworthy/tests))"}' > /tmp/lope-pair-pipe
```

**Workflow:**
1. User edits cells in the headed browser
2. Auto-watch detects changes and writes `{"event": "change", ...}` to the log
3. Agent reads log: `tail -10 /tmp/lope-pair.log`
4. Agent responds: runs tests, suggests fixes, or pushes changes via the pipe
5. User sees agent's changes live in the browser

**Log format:**
```json
{"event": "change", "changes": [{"t": 1234, "op": "upd", "module": "@tomlarkworthy/debugger", "_name": "myCell", "_definition": "() => 42"}], "historyIndex": 5}
```

Change entry fields: `t` (timestamp), `op` (`"new"` / `"upd"` / `"del"`), `module`, `_name`, `source`, `_inputs`, `_definition` (truncated to 200 chars).

**Sending commands during a session:**
```bash
echo '{"cmd": "run-tests"}' > /tmp/lope-pair-pipe
sleep 5 && tail -1 /tmp/lope-pair.log
```

## Lopepage screenshot scrolling

Lopepage renders modules in golden-layout panels that scroll independently. New or bottom cells may be below the fold. Before taking a screenshot of a specific cell, scroll to it via eval:

```bash
# Scroll to a cell by its heading text
{"cmd": "eval", "code": "(function() { var els = document.querySelectorAll('h2'); for (var e of els) { if (e.textContent.trim() === 'File Browser') { e.scrollIntoView(); return 'scrolled'; } } return 'not found'; })()"}
{"cmd": "screenshot", "path": "tools/screenshot.png", "fullPage": false}
```

For cells without a heading, search by variable name via the inspector output or query the cell's rendered DOM element.

## Running tests with natural observation

```bash
# Use split layout hash URL to enable natural test observation
echo '{"cmd": "load", "notebook": "notebook.html", "hash": "view=R100(S50(@module),S50(@tomlarkworthy/tests))"}
{"cmd": "read-tests"}
{"cmd": "quit"}' | node tools/lope-browser-repl.js
```

## When to use which

| Need | Use |
|------|-----|
| List/get/define variables, eval JS, run tests | `lope-node-repl.js` |
| Click buttons, fill forms, take screenshots | `lope-browser-repl.js` |
| Test with hash URL layout (natural observation) | `lope-browser-repl.js` |
| Modules using `URL.createObjectURL` | `lope-browser-repl.js` |
| Pair programming (live collab) | `lope-browser-repl.js --headed --log` |
| ~10x faster than lope-runner.js after initial load | Either REPL |
