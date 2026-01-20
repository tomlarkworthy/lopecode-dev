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
│   └── src/                     # Source/development notebooks
├── tools/                       # Agent utilities
│   ├── lope-utils.py           # Python CLI for parsing notebooks
│   └── lope-extract.sh         # Shell script for extraction
├── .lope-extracted/             # Generated module extractions (gitignored)
│   └── manifest.json           # Index of all modules across notebooks
└── AGENTS.md                    # This file
```

### Working with Large Files

**PROBLEM**: Lopecode HTML files are 1-3MB with 17k-25k lines. Reading entire files exhausts context.

**SOLUTION**: Use the provided tools to access specific parts.

#### Tool Commands

```bash
# Get overview of a notebook (modules, cells, file attachments)
python3 tools/lope-utils.py summary lopecode/notebooks/@tomlarkworthy_exporter.html

# List modules in a notebook
python3 tools/lope-utils.py list-modules lopecode/notebooks/@tomlarkworthy_exporter.html

# List cells in a specific module
python3 tools/lope-utils.py list-cells lopecode/notebooks/@tomlarkworthy_exporter.html @tomlarkworthy/exporter

# Read a specific cell's source code
python3 tools/lope-utils.py read-cell lopecode/notebooks/@tomlarkworthy_exporter.html @tomlarkworthy/exporter _exporter

# Read entire module source (use sparingly - can be large)
python3 tools/lope-utils.py read-module lopecode/notebooks/@tomlarkworthy_exporter.html @tomlarkworthy/exporter

# Regenerate manifest after notebook changes
python3 tools/lope-utils.py manifest
```

#### Understanding the Manifest

The manifest at `.lope-extracted/manifest.json` provides:
- **notebooks**: List of all notebook files with paths and sizes
- **module_index**: Which notebooks contain which modules

Use grep to query the manifest:
```bash
# Find which notebooks contain a specific module
grep -A1 '"@tomlarkworthy/view"' .lope-extracted/manifest.json

# List all unique modules
grep -oP '"@[^"]+":' .lope-extracted/manifest.json | sort -u
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
python3 tools/lope-utils.py summary lopecode/notebooks/NOTEBOOK.html
```

#### Finding where a module is used
```bash
grep -l "module-name" lopecode/notebooks/*.html
```

#### Comparing module versions across notebooks
```bash
# Extract same module from two notebooks and diff
python3 tools/lope-utils.py read-module notebook1.html @tomlarkworthy/view > /tmp/v1.js
python3 tools/lope-utils.py read-module notebook2.html @tomlarkworthy/view > /tmp/v2.js
diff /tmp/v1.js /tmp/v2.js
```

### Tips for Agents

1. **Never read entire HTML files** - Use the tools to extract relevant parts
2. **Start with summary** - Always run `summary` first to understand a notebook
3. **Track module relationships** - Use the manifest to understand dependencies
4. **Provide precise instructions** - Reference cells by `module.cellName`
5. **Test locally is not possible** - Notebooks must be opened in a browser
6. **Git works** - Despite file sizes, diffs are readable because content is uncompressed
