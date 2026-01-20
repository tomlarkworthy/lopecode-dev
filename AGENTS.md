# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

---

## Lopecode Development Guide

This repository is designed for agentic development of **lopecode** - a modular, self-serializing notebook system built on the Observable runtime.

### What is Lopecode?

Lopecode notebooks are single HTML files (1-3MB each) that contain:
- **Embedded dependencies** (`<script type="lope-file">`) - gzipped, base64-encoded libraries
- **Modules** (`<script type="lope-module">`) - Observable notebook code with cell definitions
- **Bootloader** - JavaScript that initializes the Observable runtime with importmaps

Work primarily involves authoring new notebooks by composing existing modules differently.

### File Structure

```
lopecode-dev/
├── lopecode/                    # Main lopecode repository (submodule)
│   ├── notebooks/               # Published notebook HTML files
│   │   ├── @tomlarkworthy_exporter.html
│   │   ├── @tomlarkworthy_notes.html
│   │   └── ...
│   ├── lopebooks/
│   │   └── notebooks/           # Development/staging notebooks (e.g., reactive-reflective-testing)
│   └── src/                     # Source/development notebooks
├── tools/                       # Agent utilities (Node.js only)
│   ├── tools.js                # Shared Observable runtime utilities
│   ├── lope-reader.js          # Fast static analysis (no browser)
│   ├── lope-runner.js          # One-off runtime execution (Playwright)
│   └── lope-repl.js            # Persistent REPL for iterative development
├── DEVELOPMENT.md               # Runtime internals and lopepage architecture
└── AGENTS.md                    # This file
```

### Shared Library: tools.js

Common Observable runtime utilities used by both `lope-runner.js` and `lope-repl.js`:

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
| Iterative development | `lope-repl.js` | <1s after load |
| Multiple test cycles | `lope-repl.js` | <1s per command |
| Screenshots | `lope-repl.js` | <1s |

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

#### lope-repl.js - Persistent REPL

For iterative development with a persistent browser session:

```bash
# Start REPL
node tools/lope-repl.js

# With visible browser for debugging
node tools/lope-repl.js --headed --verbose
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
{"cmd": "quit"}' | node tools/lope-repl.js
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

Benefits:
- ~10x faster than lope-runner.js after initial load
- Can run multiple test cycles without browser restart
- Interactive debugging with `eval` command

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
| `@tomlarkworthy/editor-2-i` | CodeMirror-based code editor |
| `@tomlarkworthy/view` | Composite views and reactive forms |
| `@tomlarkworthy/testing` | Reactive unit testing |
| `@tomlarkworthy/robocoop` | AI collaboration features |
| `@tomlarkworthy/module-selection` | Module composition UI |

### Common Tasks

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
{"cmd": "quit"}' | node tools/lope-repl.js
```

### Tips for Agents

1. **Never read entire HTML files** - Use the tools to extract relevant parts
2. **Start with summary** - Run `lope-reader.js` first to understand a notebook
3. **Use lope-repl.js for iteration** - Much faster than lope-runner.js for multiple operations
4. **Provide precise instructions** - Reference cells by `module.cellName`
5. **Tests need observation** - Either force reachability or use hash URL with tests module
6. **Git works** - Despite file sizes, diffs are readable because content is uncompressed
7. **Keep working files in project** - Avoid `/tmp` directory; use `tools/` for test files to avoid permission prompts
8. **See DEVELOPMENT.md** - Contains critical info on:
   - Observable runtime lazy evaluation (cells only compute when observed)
   - Lopepage hash URL DSL for multi-module layouts
   - Natural test observation via `latest_state` Map
   - How to force cell computation with `_reachable` and `_computeNow()`
