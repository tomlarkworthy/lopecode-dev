# @lopecode/channel

Pair program with Claude Code inside [Lopecode](https://tomlarkworthy.github.io/lopecode/) notebooks. An MCP server that bridges browser-based Observable notebooks and Claude Code via WebSocket, enabling real-time collaboration: chat, define cells, watch reactive variables, run tests, and manipulate the DOM — all from inside the notebook.

## Quick Start

```bash
# Requires Bun (https://bun.sh)
bun install -g @lopecode/channel
claude mcp add lopecode bunx @lopecode/channel

# Start Claude Code with channels enabled
claude --dangerously-load-development-channels server:lopecode
```

Then ask Claude: **"Open a lopecode notebook"**

Claude gets a pairing token, opens the notebook in your browser, and auto-connects. No manual setup needed.

## What is Lopecode?

Lopecode notebooks are self-contained HTML files built on the [Observable runtime](https://github.com/observablehq/runtime). Each notebook contains:

- **Modules** — collections of reactive cells (code units)
- **Embedded dependencies** — everything needed to run, in a single file
- **A multi-panel UI** (lopepage) — view and edit multiple modules side by side

The Observable runtime provides **reactive dataflow**: cells automatically recompute when their dependencies change, similar to a spreadsheet.

## How Pairing Works

```
Browser (Notebook)  ←→  WebSocket  ←→  Channel Server (Bun)  ←→  MCP stdio  ←→  Claude Code
```

1. The channel server starts a local WebSocket server and generates a pairing token (`LOPE-PORT-XXXX`)
2. Claude opens a notebook URL with `&cc=TOKEN` in the hash
3. The notebook auto-connects to the WebSocket server
4. Claude can now use MCP tools to interact with the live notebook

## Observable Cell Syntax

Lopecode cells use [Observable JavaScript](https://observablehq.com/@observablehq/observable-javascript) syntax. Here's what you need to know:

### Named Cells

```javascript
// A cell is a named expression. It re-runs when dependencies change.
x = 42
greeting = `Hello, ${name}!`   // depends on the 'name' cell
```

### Markdown

```javascript
// Use the md tagged template literal for rich text
md`# My Title

Some **bold** text and a list:
- Item 1
- Item 2
`
```

### HTML

```javascript
// Use htl.html for DOM elements
htl.html`<div style="color: red">Hello</div>`
```

### Imports

```javascript
// Import from other modules in the notebook
import {md} from "@tomlarkworthy/editable-md"
import {chart} from "@tomlarkworthy/my-visualization"
```

### viewof — Interactive Inputs

```javascript
// viewof creates two cells:
//   "viewof slider" — the DOM element (a range input)
//   "slider" — the current value (a number)
viewof slider = Inputs.range([0, 100], {label: "Value", value: 50})

// Other cells can depend on the value
doubled = slider * 2
```

Common inputs: `Inputs.range`, `Inputs.select`, `Inputs.text`, `Inputs.toggle`, `Inputs.button`, `Inputs.table`.

### mutable — Imperative State

```javascript
// mutable allows imperative updates from other cells
mutable counter = 0

increment = {
  mutable counter++;
  return counter;
}
```

### Generators — Streaming Values

```javascript
// Yield successive values over time
ticker = {
  let i = 0;
  while (true) {
    yield i++;
    await Promises.delay(1000);
  }
}
```

### Block Cells

```javascript
// Use braces for multi-statement cells
result = {
  const data = await fetch("https://api.example.com/data").then(r => r.json());
  const filtered = data.filter(d => d.value > 10);
  return filtered;
}
```

## Testing

Lopecode uses a reactive testing pattern. Any cell named `test_*` is a test:

```javascript
test_addition = {
  const result = add(2, 2);
  if (result !== 4) throw new Error(`Expected 4, got ${result}`);
  return "2 + 2 = 4";  // shown on success
}

test_greeting = {
  if (typeof greeting !== "string") throw new Error("Expected string");
  return `greeting is: ${greeting}`;
}
```

Tests pass if they don't throw. Use `run_tests` to execute all `test_*` cells.

## MCP Tools Reference

| Tool | Description |
|------|-------------|
| `get_pairing_token` | Get the session pairing token |
| `reply` | Send markdown to the notebook chat |
| `define_cell` | **Primary tool.** Define a cell using Observable source code |
| `list_cells` | List cells with names, inputs, and source |
| `get_variable` | Read a runtime variable's current value |
| `define_variable` | Low-level: define a variable with a function string |
| `delete_variable` | Remove a variable |
| `list_variables` | List all named variables |
| `create_module` | Create a new empty module |
| `delete_module` | Remove a module and all its variables |
| `watch_variable` | Subscribe to reactive updates |
| `unwatch_variable` | Unsubscribe from updates |
| `run_tests` | Run all `test_*` cells |
| `eval_code` | Run ephemeral JS in the browser (not persisted) |
| `export_notebook` | Save the notebook to disk (persists cells) |
| `fork_notebook` | Create a copy as a sibling HTML file |

### Tool Usage Tips

- **`define_cell`** is the main tool for creating content. It accepts Observable source and compiles it via the toolchain.
- **`eval_code`** is for throwaway actions (DOM hacks, debugging). Effects are lost on reload.
- **`define_variable`** is a low-level escape hatch — prefer `define_cell`.
- Always specify `module` when targeting a specific module.
- Use `export_notebook` after defining cells to persist them across reloads.

## Typical Workflow

```
1. create_module("@tomlarkworthy/my-app")
2. define_cell('import {md} from "@tomlarkworthy/editable-md"', module: "...")
3. define_cell('title = md`# My App`', module: "...")
4. define_cell('viewof name = Inputs.text({label: "Name"})', module: "...")
5. define_cell('greeting = md`Hello, **${name}**!`', module: "...")
6. export_notebook()  // persist to disk
```

## Starting from a Notebook

If you see the `@tomlarkworthy/claude-code-pairing` panel in a notebook but Claude isn't connected:

1. Install Bun: https://bun.sh
2. Install the plugin: `bun install -g @lopecode/channel`
3. Register with Claude: `claude mcp add lopecode bunx @lopecode/channel`
4. Start Claude: `claude --dangerously-load-development-channels server:lopecode`
5. Ask Claude to connect — it will provide a URL with an auto-connect token

## Environment Variables

- `LOPECODE_PORT` — WebSocket server port (default: random free port)

## License

MIT
