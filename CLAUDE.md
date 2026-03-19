# Agent Instructions

## Lopecode Development Guide

This repository is designed for agentic development of **lopecode** - a modular, self-serializing notebook system built on the Observable runtime.

### What is Lopecode?

Lopecode notebooks are single HTML files (1-3MB each) that contain:
- **Embedded dependencies** (`<script type="lope-file">`) - gzipped, base64-encoded libraries
- **Modules** (`<script type="lope-module">`) - Observable notebook code with cell definitions
- **Bootloader** - JavaScript that initializes the Observable runtime with importmaps

Work primarily involves authoring new notebooks by composing existing modules differently.

### Source of Truth

**ObservableHQ.com is the canonical source code.** The HTML files in `lopecode/notebooks/` and `lopebooks/notebooks/` are generated artifacts bundled from Observable via jumpgate. When a module changes, update it on ObservableHQ first, then regenerate the affected HTML files. See `knowledge/maintaining-and-updating-lopecode-and-lopebook-content-repositories.md` for the full workflow.

### File Structure

```
lopecode-dev/
├── lopecode/                    # Main content repository (submodule)
│   ├── notebooks/               # Published notebook HTML files
│   │   ├── @tomlarkworthy_exporter.html
│   │   ├── @tomlarkworthy_notes.html
│   │   └── ...
│   └── src/                     # Source/development notebooks
├── lopebooks/                   # Development/staging content repository (submodule)
│   └── notebooks/               # Staging notebooks (e.g., reactive-reflective-testing)
├── tools/                       # Agent utilities (Node.js only)
│   ├── lope-runtime.js         # Core library: loadNotebook() → LopecodeExecution
│   ├── tools.js                # Shared Observable runtime utilities
│   ├── lope-reader.js          # Fast static analysis (no browser)
│   ├── lope-runner.js          # One-off runtime execution (Playwright)
│   ├── lope-node-repl.js       # Persistent REPL in Node.js (default, no browser)
│   ├── lope-browser-repl.js    # Persistent REPL with Playwright browser
│   └── lope-jumpgate.js        # Automated jumpgate export (Playwright)
├── vendor/                      # Reference submodules
│   ├── observable-runtime/      # Observable runtime source
│   ├── observable-inputs/       # Observable inputs source
│   └── observable-stdlib/       # Observable stdlib source
├── tests/                       # Node.js unit tests (node:test)
│   └── notebooks/               # Tests for notebook module pure functions
├── DEVELOPMENT.md               # Runtime internals and lopepage architecture
└── CLAUDE.md                    # This file
```

### Shared Library: tools.js

Common Observable runtime utilities used by both `lope-runner.js` and `lope-browser-repl.js`:

| Function | Purpose |
|----------|---------|
| `runTestVariables` | Run test_* variables with observer pattern |
| `readLatestState` | Read from tests module's latest_state Map |
| `getCellInfo` | Get info about a specific variable |
| `listAllVariables` | List all variables in runtime |
| `defineVariable` | Define or redefine a runtime variable |
| `deleteVariable` | Delete a variable from runtime |
| `findModule` | Find a module by name |
| `serializeValue` | Serialize values for output |
| `generateTAPReport` | Generate TAP format test reports |

These functions are designed to run in page context via `page.evaluate()` - the same pattern lopecode itself uses for reactive cells.

### Working with Large Files

**PROBLEM**: Lopecode HTML files are 1-3MB with 17k-25k lines. Reading entire files exhausts context.

**SOLUTION**: Use the three Node.js tools to access specific parts.

#### Which Tool to Use

| Task | Tool | Speed |
|------|------|-------|
| List modules/cells | `lope-reader.js` | Instant |
| Read cell source | `lope-reader.js` | Instant |
| Check file attachments | `lope-reader.js` | Instant |
| Generate manifest | `lope-reader.js --manifest` | Fast |
| One-off test run | `lope-runner.js` | ~10s startup |
| Get computed values | `lope-runner.js` | ~10s startup |
| Iterative development | `lope-node-repl.js` (default) | ~1.5s load |
| Multiple test cycles | `lope-node-repl.js` | <1s per command |
| Programmatic access | `lope-runtime.js` | ~1.5s load |
| DOM interaction/screenshots | `lope-browser-repl.js` | <1s after load |
| Export notebook via jumpgate | `lope-jumpgate.js` | ~60-120s |

#### lope-reader.js - Fast Static Analysis

No browser needed, instant results:

```bash
# Get notebook summary (default)
node tools/lope-reader.js notebook.html

# List all modules
node tools/lope-reader.js notebook.html --list-modules

# Get source code for a specific module
node tools/lope-reader.js notebook.html --get-module @tomlarkworthy/tests

# List file attachments
node tools/lope-reader.js notebook.html --list-files

# Generate manifest of all notebooks in a directory
node tools/lope-reader.js --manifest lopecode/lopebooks/notebooks

# JSON output
node tools/lope-reader.js notebook.html --list-modules --json
```

#### lope-runner.js - One-off Runtime Execution

For test runs and runtime queries (starts fresh browser each time):

```bash
# Run all tests in a notebook
node tools/lope-runner.js notebook.html --run-tests

# Run tests with JSON output
node tools/lope-runner.js notebook.html --run-tests --json

# Filter by module/test name
node tools/lope-runner.js notebook.html --run-tests --suite @tomlarkworthy/tests

# Increase timeout for slow tests
node tools/lope-runner.js notebook.html --run-tests --test-timeout 60000

# Get computed cell value
node tools/lope-runner.js notebook.html --get-cell myVariable
```

Exit codes: `0` = passed, `1` = failed, `2` = error

#### lope-runtime.js - Core Library

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
execution.mains;            // Map(name → module)

execution.getVariable(name, module);
execution.defineVariable(name, inputs, fn, module);
execution.waitForVariable(name, timeout);
execution.runTests(timeout, filter);
execution.eval(code);
execution.dispose();
```

Requires `node --experimental-vm-modules`.

#### lope-node-repl.js - Node REPL (default)

Runs the Observable runtime directly in Node.js — no browser needed. Uses `lope-runtime.js` internally. **Prefer this over lope-browser-repl.js** unless you need DOM interaction, screenshots, or browser-specific APIs.

```bash
node --experimental-vm-modules tools/lope-node-repl.js [--verbose]
```

Same JSON command protocol as the browser REPL (load, list-variables, get-variable, eval, define-variable, delete-variable, run-tests, status, quit) plus `wait-for`. Does NOT support: query, click, fill, download, screenshot.

The `load` command runs the full bootloader pipeline — stdlib builtins (Inputs, d3, Plot, md, htl, etc.) are available to all cells.

For persistent bidirectional sessions, see `knowledge/running-a-live-repl-session-with-a-notebook.md`.

#### lope-browser-repl.js - Browser REPL

For iterative development with a persistent browser session. Use when you need DOM queries, clicks, screenshots, or browser-only APIs:

```bash
# Start REPL
node tools/lope-browser-repl.js

# With visible browser for debugging
node tools/lope-browser-repl.js --headed --verbose
```

JSON commands via stdin:
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
{"cmd": "status"}
{"cmd": "quit"}
```

Example session:
```bash
echo '{"cmd": "load", "notebook": "lopecode/lopebooks/notebooks/@tomlarkworthy_reactive-reflective-testing.html", "hash": "view=R100(S50(@tomlarkworthy/module-selection),S25(@tomlarkworthy/reactive-reflective-testing),S13(@tomlarkworthy/observablejs-toolchain),S13(@tomlarkworthy/tests))"}
{"cmd": "read-tests"}
{"cmd": "quit"}' | node tools/lope-browser-repl.js
```

**Key commands:**
- `run-tests` - Runs tests by forcing reachability (works always)
- `read-tests` - Reads from `latest_state` (requires tests module visible in hash URL)
- `define-variable` - Define or redefine a runtime variable (see below)
- `query` - Find elements by CSS selector (returns count, tag, text, visibility)
- `click` - Click on a UI element by CSS selector
- `fill` - Fill an input field with a value
- `download` - Click element and capture file download
- `screenshot` - Takes screenshot of current page

**Important:** The `eval` command does NOT support async functions. Use synchronous IIFEs only — async IIFEs return `{}` instead of the resolved value. For timing, poll with repeated sync evals rather than using `await`.

Benefits:
- ~10x faster than lope-runner.js after initial load
- Can run multiple test cycles without browser restart
- Interactive debugging with `eval` command

#### lope-jumpgate.js - Automated Jumpgate Export

Automates exporting Observable notebooks to lopecode HTML via jumpgate. See `knowledge/maintaining-and-updating-lopecode-and-lopebook-content-repositories.md` for full usage, arguments, and repository update workflows.

```bash
node tools/lope-jumpgate.js --source @tomlarkworthy/exporter-2 --output lopecode/notebooks/@tomlarkworthy_exporter-2.html
```

Exit codes: `0` = success, `1` = failure

### Cells vs Variables

**Important distinction:**
- A **cell** is Observable source code (what you write)
- A **variable** is a runtime entity (what gets executed)

A single cell can create multiple variables:
- `viewof foo = ...` creates two variables: `viewof foo` (the DOM element) and `foo` (the extracted value)
- `mutable bar = ...` creates three variables: `initial bar`, `mutable bar`, and `bar`

The `define-variable` command creates/redefines a single runtime variable. For complex cells (viewof, mutable), use the compile machinery in @tomlarkworthy/observablejs-toolchain.

#### define-variable / delete-variable commands

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

**delete-variable parameters:**
- `name` - Variable name to delete (required)
- `module` - Target module name (default: main module)

Example with dependencies:
```json
{"cmd": "define-variable", "name": "doubled", "definition": "(value) => value * 2", "inputs": ["value"]}
```

### Lopecode Cell Format

Cells are JavaScript functions in this format:
```javascript
const _cellName = function _cellName(dep1, dep2, md){return(
  // Cell body - often markdown or UI
  md`# Title`
)};
```

Key patterns:
- `md` dependency = markdown cell
- `Inputs` dependency = form inputs
- `htl` dependency = HTML templating
- `_` prefix = internal/named cells
- Numeric names (`_0`, `_1`) = anonymous cells

### Development Workflow

**Notebooks are self-modifying** - they can re-export themselves from the browser. The typical workflow is:

1. **Agent prepares changes** - Write cell modifications as patches or descriptions
2. **Human applies changes** - Open notebook in browser, edit cells, re-export
3. **Agent verifies** - Check the re-exported file for expected changes

Since re-exporting is a human-driven process, agents should:
- Provide clear cell-by-cell change instructions
- Reference cells by module and name (e.g., `@tomlarkworthy/exporter._parameters`)
- Use the tools to read existing cell content before suggesting modifications

### Pushing Changes to ObservableHQ

Use `lope-push-to-observablehq.js` (NOT dev-browser) to push cell changes to Observable. See `knowledge/pushing-cells-to-observablehq.md` for full details.

```bash
# Push specific cells (safe partial update)
node tools/lope-push-to-observablehq.js <notebook.html> --module @author/module --target https://observablehq.com/@author/notebook --cells cellName

# Dry run first to verify extraction
node tools/lope-push-to-observablehq.js <notebook.html> --module @author/module --dry-run
```

### Creating New Notebooks

New notebooks are created by composing existing modules. The process:

1. Start with an existing notebook as a template
2. Add/remove modules using the module-selection UI in the browser
3. Add new cells specific to the new notebook
4. Export to a new HTML file

Agents can help by:
- Suggesting which modules to include based on requirements
- Writing new cell definitions
- Documenting the composition

### Key Modules

| Module | Purpose |
|--------|---------|
| `@tomlarkworthy/exporter` | Self-serialization to HTML |
| `@tomlarkworthy/lopepage` | Multi-notebook UI layout |
| `@tomlarkworthy/editor-5` | CodeMirror-based code editor (latest) |
| `@tomlarkworthy/view` | Composite views and reactive forms |
| `@tomlarkworthy/testing` | Reactive unit testing |
| `@tomlarkworthy/robocoop` | AI collaboration features |
| `@tomlarkworthy/module-selection` | Module composition UI |

### Common Tasks

#### Running Node.js unit tests
```bash
# Run all tests
node --test tests/notebooks/*.test.js

# Run a specific test file
node --test tests/notebooks/exporter.test.js
```

#### Reading a notebook's structure
```bash
node tools/lope-reader.js lopecode/notebooks/NOTEBOOK.html
```

#### Finding where a module is used
```bash
# Quick search
grep -l "module-name" lopecode/notebooks/*.html

# Or generate manifest and query
node tools/lope-reader.js --manifest lopecode/notebooks --json | grep "module-name"
```

#### Comparing module versions across notebooks
```bash
# Extract same module from two notebooks and diff
node tools/lope-reader.js notebook1.html --get-module @tomlarkworthy/view > /tmp/v1.js
node tools/lope-reader.js notebook2.html --get-module @tomlarkworthy/view > /tmp/v2.js
diff /tmp/v1.js /tmp/v2.js
```

#### Running tests with natural observation
```bash
# Use split layout hash URL to enable natural test observation
echo '{"cmd": "load", "notebook": "notebook.html", "hash": "view=R100(S50(@module),S50(@tomlarkworthy/tests))"}
{"cmd": "read-tests"}
{"cmd": "quit"}' | node tools/lope-browser-repl.js
```

### Tips for Agents

1. **Never read entire HTML files** - Use the tools to extract relevant parts
2. **Start with summary** - Run `lope-reader.js` first to understand a notebook
3. **Use lope-node-repl.js for iteration** - Default REPL; use lope-browser-repl.js only when you need DOM/screenshots
4. **Provide precise instructions** - Reference cells by `module.cellName`
5. **Tests need observation** - Either force reachability or use hash URL with tests module
6. **Git works** - Despite file sizes, diffs are readable because content is uncompressed
7. **Keep working files in project** - Avoid `/tmp` directory; use `tools/` for test files to avoid permission prompts
8. **See DEVELOPMENT.md** - Contains critical info on:
   - Observable runtime lazy evaluation (cells only compute when observed)
   - Lopepage hash URL DSL for multi-module layouts
   - Natural test observation via `latest_state` Map
   - How to force cell computation with `_reachable` and `_computeNow()`
