# Agent Instructions

## Lopecode Development Guide

This repository is designed for agentic development of **lopecode** - a modular, self-serializing notebook system built on the Observable runtime.

### What is Lopecode?

Lopecode notebooks are single HTML files (1-3MB each) that contain:
- **Embedded dependencies** (`<script type="lope-file">`) - gzipped, base64-encoded libraries
- **Modules** (`<script type="lope-module">`) - Observable notebook code with cell definitions
- **Bootloader** - JavaScript that initializes the Observable runtime with importmaps

Work primarily involves authoring new notebooks by composing existing modules differently.

### Running the Agent

The preferred harness is `./metadev`, which uses [safehouse](https://github.com/anthropics/safehouse) to execute Claude Code with `--dangerously-skip-permissions` fully autonomously but safely sandboxed.

### Source of Truth

**ObservableHQ.com is the canonical source code.** The HTML files in `lopecode/notebooks/` and `lopebooks/notebooks/` are generated artifacts bundled from Observable via jumpgate. When a module changes, update it on ObservableHQ first, then regenerate the affected HTML files. See `knowledge/maintaining-and-updating-lopecode-and-lopebook-content-repositories.md` for the full workflow.

### File Structure

```
lopecode-dev/
├── lopecode/                    # Main content repository (submodule)
│   └── notebooks/               # Published notebook HTML files
├── lopebooks/                   # Development/staging content repository (submodule)
│   └── notebooks/               # Staging notebooks
├── tools/                       # Agent utilities (Node.js only)
│   ├── lope-runtime.js         # Core library: loadNotebook() -> LopecodeExecution
│   ├── tools.js                # Shared Observable runtime utilities
│   ├── lope-reader.js          # Fast static analysis (no browser)
│   ├── lope-runner.js          # One-off runtime execution (Playwright)
│   ├── lope-node-repl.js       # Persistent REPL in Node.js (default, no browser)
│   ├── lope-browser-repl.js    # Persistent REPL with Playwright browser
│   ├── lope-jumpgate.js        # Automated jumpgate export (Playwright)
│   ├── lope-push-to-observablehq.js  # Push cells to Observable
│   ├── channel/                 # Claude Code <-> notebook channel (Bun + MCP)
│   ├── staging/                 # Bulk export staging artifacts
│   ├── scratch/                 # Experimental/test scripts
│   ├── screenshots/             # Test screenshots
│   └── prototypes/              # Prototype scripts
├── vendor/                      # Reference submodules
├── tests/                       # Node.js unit tests (node:test)
├── knowledge/                   # Detailed workflow guides (see below)
└── CLAUDE.md                    # This file
```

### Knowledge Directory

Detailed tool reference and workflow guides. Read the relevant file when you need specifics:

| File | When to read |
|------|-------------|
| `knowledge/maintaining-and-updating-lopecode-and-lopebook-content-repositories.md` | Exporting/updating notebooks, using lope-reader.js, lope-runner.js, lope-jumpgate.js |
| `knowledge/running-a-live-repl-session-with-a-notebook.md` | Using lope-node-repl.js, lope-browser-repl.js, lope-runtime.js, pair programming |
| `knowledge/bulk-exporting-lopebooks.md` | Bulk export, QC, smoke testing |
| `knowledge/pushing-cells-to-observablehq.md` | Pushing cell changes back to Observable |
| `knowledge/live-collaboration-with-claude-code-pairing.md` | Claude Code pairing: setup, user journeys, MCP tools, distribution |
| `knowledge/how-file-attachments-work.md` | File attachment internals |
| `knowledge/lopecode-internal-networking.md` | Fetch/XHR/import interception internals |
| `knowledge/notebook-programming-concepts.md` | Observable runtime internals, lopepage architecture, hash URL DSL |

### Which Tool to Use

| Task | Tool | Speed |
|------|------|-------|
| List modules/cells, read cell source | `lope-reader.js` | Instant |
| Check file attachments, generate manifest | `lope-reader.js` | Instant |
| One-off test run, get computed values | `lope-runner.js` | ~10s startup |
| Iterative development, multiple test cycles | `lope-node-repl.js` (default) | ~1.5s load |
| DOM interaction, screenshots, pair programming | `lope-browser-repl.js` | <1s after load |
| Export notebook via jumpgate | `lope-jumpgate.js` | ~60-120s |
| Push cells to ObservableHQ (WS) | `lope-push-ws.js` | ~5s |
| Push cells to ObservableHQ (legacy) | `lope-push-to-observablehq.js` | ~30s |
| Bulk export notebooks | `lope-bulk-jumpgate.js` | ~30-60s each |
| Claude <-> notebook channel | `tools/channel/lopecode-channel.ts` | Real-time |
| Claude <-> notebook channel (npm) | `bunx @lopecode/channel` | Real-time |
| Create new notebook with pairing | See `knowledge/live-collaboration-with-claude-code-pairing.md` § "Creating a New Notebook" | ~2min |
| Define cells via Observable source | `define_cell` MCP tool (via pairing channel) | Instant |
| List cells with source/inputs | `list_cells` MCP tool (via pairing channel) | Instant |
| Export/save notebook in place | `export_notebook` MCP tool (via pairing channel) | ~5-10s |

### Cells vs Variables

**Important distinction:**
- A **cell** is Observable source code (what you write)
- A **variable** is a runtime entity (what gets executed)

A single cell can create multiple variables:
- `viewof foo = ...` creates two variables: `viewof foo` (the DOM element) and `foo` (the extracted value)
- `mutable bar = ...` creates three variables: `initial bar`, `mutable bar`, and `bar`

### Lopecode Cell Format

Cells are JavaScript functions in this format:
```javascript
const _cellName = function _cellName(dep1, dep2, md){return(
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

### Running Node.js Unit Tests

```bash
node --test tests/notebooks/*.test.js
bun test tests/channel/lopecode-channel.test.ts
```

### Tips for Agents

1. **Never read entire HTML files** - Use the tools to extract relevant parts
2. **Start with summary** - Run `lope-reader.js` first to understand a notebook
3. **Use lope-node-repl.js for iteration** - Default REPL; use lope-browser-repl.js only when you need DOM/screenshots/pair-programming
4. **Provide precise instructions** - Reference cells by `module.cellName`
5. **Tests need observation** - Either force reachability or use hash URL with tests module
6. **Git works** - Despite file sizes, diffs are readable because content is uncompressed
7. **Keep working files in project** - Avoid `/tmp` directory; use `tools/` for test files to avoid permission prompts
8. **After editing module `.js` files** - Sync to the target notebook with `bun tools/channel/sync-module.ts --module @name --source file.js --target notebook.html`, then tell the user to hard reload (Cmd+Shift+R)
9. **See `knowledge/notebook-programming-concepts.md`** - Contains critical info on:
   - Observable runtime lazy evaluation (cells only compute when observed)
   - Lopepage hash URL DSL for multi-module layouts
   - Natural test observation via `latest_state` Map
   - How to force cell computation with `_reachable` and `_computeNow()`
