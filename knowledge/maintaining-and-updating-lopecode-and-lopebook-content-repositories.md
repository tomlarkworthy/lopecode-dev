# Maintaining and Updating Lopecode & Lopebook Content Repositories

## Source of Truth

**ObservableHQ.com is the canonical source code for all lopecode modules.** The HTML files in the content repositories are generated artifacts — they are bundled from Observable and should be regenerated whenever the Observable source is updated.

The workflow is: **edit on Observable → regenerate HTML via jumpgate → commit to content repo**.

Do not treat the HTML files as source code. If a module needs changing, update it on ObservableHQ first, then regenerate the affected notebooks.

## Repository Structure

- `lopecode/` — Main content repository (submodule at `tomlarkworthy/lopecode`). Contains published notebook HTML files in `lopecode/notebooks/`.
- `lopebooks/` — Development/staging content repository (submodule at `tomlarkworthy/lopebooks`). Contains notebooks in `lopebooks/notebooks/`.

Both repos hold self-contained lopecode HTML files (1-3 MB each). Each core module should have a fresh bundled HTML file here, regenerated after the ObservableHQ source of truth is updated.

## How Notebooks Get Updated

Notebooks originate on [observablehq.com](https://observablehq.com) and are exported to lopecode format via **jumpgate**. Jumpgate fetches a notebook from the Observable API, combines it with a frame (typically `@tomlarkworthy/lopepage`), and serializes everything into a single offline-capable HTML file.

### Automated Export with lope-jumpgate.js

`tools/lope-jumpgate.js` automates the jumpgate process via Playwright:

```bash
# Export a notebook
node tools/lope-jumpgate.js \
  --source @tomlarkworthy/exporter-2 \
  --output lopecode/notebooks/@tomlarkworthy_exporter-2.html

# With debugging
node tools/lope-jumpgate.js \
  --source @tomlarkworthy/exporter-2 \
  --output lopecode/notebooks/@tomlarkworthy_exporter-2.html \
  --verbose --headed

# Custom frame and timeout
node tools/lope-jumpgate.js \
  --source @tomlarkworthy/my-notebook \
  --frame @tomlarkworthy/lopepage \
  --output output.html \
  --timeout 180000
```

| Arg | Default | Description |
|-----|---------|-------------|
| `--source <name>` | (required) | Observable notebook shorthand |
| `--frame <name>` | `@tomlarkworthy/lopepage` | Frame notebook shorthand |
| `--jumpgate <path>` | `lopecode/notebooks/@tomlarkworthy_jumpgate.html` | Path to jumpgate HTML |
| `--output <path>` | (required) | Where to write the exported HTML |
| `--timeout <ms>` | `120000` | Max wait for export |
| `--headed` | false | Show browser for debugging |
| `--verbose` | false | Show browser console logs |

Exit codes: `0` = success, `1` = failure

### How lope-jumpgate.js Works Internally

1. Launches Playwright Chromium with `--disable-web-security` (needed for file:// + API fetches)
2. Pre-sets `window.rEPseDFzXFSPYkNz` via `addInitScript` — this overrides `urlQueryFieldView` which reads query params from this global instead of `location.search`
3. Pre-sets `localStorage.frame` — the frame input uses `localStorageView`, not URL params
4. Navigates to the jumpgate notebook HTML with query params: `source`, `load_source=true`, `export_state`
5. Waits for Observable runtime, forces all variables reachable (jumpgate cells are lazy in headless)
6. Polls the `exported` variable until it has a `.source` property
7. Clicks the download button and captures the file via Playwright's download handler

### Output Naming Convention

Notebook files follow the pattern: `@author_notebook-name.html` (slashes become underscores).

Examples:
- `@tomlarkworthy/exporter-2` → `@tomlarkworthy_exporter-2.html`
- `@tomlarkworthy/jumpgate` → `@tomlarkworthy_jumpgate.html`

### Bulk Export with lope-bulk-jumpgate.js

`tools/lope-bulk-jumpgate.js` exports multiple notebooks in one run. It drives the `@tomlarkworthy/bulk-jumpgate` notebook headlessly via Playwright — each notebook gets its own fresh runtime that's disposed after export, keeping memory bounded.

```bash
# Export from a spec file
node tools/lope-bulk-jumpgate.js --spec export_spec.json --output ./exported

# Inline spec for a single notebook
node tools/lope-bulk-jumpgate.js \
  --spec '{"additionalMains":["@tomlarkworthy/lopepage"],"notebooks":[{"name":"@tomlarkworthy/lopecode-tour"}]}' \
  --output ./exported

# With debugging
node tools/lope-bulk-jumpgate.js --spec export_spec.json --output ./exported --verbose --headed
```

| Arg | Default | Description |
|-----|---------|-------------|
| `--spec <path\|json>` | (required) | Export spec: path to JSON file, or inline JSON string |
| `--output <dir>` | (required) | Output directory for exported HTML files |
| `--bulk-jumpgate <path>` | `lopecode/notebooks/@tomlarkworthy_bulk-jumpgate.html` | Path to bulk-jumpgate notebook |
| `--timeout <ms>` | `600000` | Max wait for entire export (10 min) |
| `--headed` | false | Show browser window |
| `--verbose` | false | Show browser console logs |

Exit codes: `0` = all exported, `1` = some failed, `2` = setup error

**Spec format:**
```json
{
  "additionalMains": ["@tomlarkworthy/lopepage"],
  "notebooks": [
    { "name": "@tomlarkworthy/lopecode-tour" },
    { "name": "@tomlarkworthy/exporter" }
  ]
}
```

**How it works internally:**

1. Loads the bulk-jumpgate notebook in Playwright with the hash URL `#view=S100(@tomlarkworthy/bulk-jumpgate)` so cells are observed
2. Shims two variables for headless operation:
   - `directoryHandle` → dummy object (skips native File System Access picker)
   - `save_file` → triggers browser downloads (Playwright captures to output dir)
3. Sets the export spec via the textarea input
4. Waits for `main_defines` to resolve (fetches additionalMains from Observable API)
5. Clicks "Start export" — the notebook's own `bulk_export` function drives the flowQueue pipeline
6. Each notebook export: fetches define from API → creates runtime → runs `exportToHTML` → disposes runtime → saves via download
7. Polls the notebook's log textarea for "Export complete."

## Workflow: Updating a Notebook in lopecode

```bash
# 1. Export the latest version
node tools/lope-jumpgate.js \
  --source @tomlarkworthy/notebook-name \
  --output lopecode/notebooks/@tomlarkworthy_notebook-name.html

# 2. Verify the export
bun tools/lope-reader.ts lopecode/notebooks/@tomlarkworthy_notebook-name.html

# 3. Commit and push in the lopecode submodule
cd lopecode
git add notebooks/@tomlarkworthy_notebook-name.html
git commit -m "Update @tomlarkworthy/notebook-name via jumpgate"
git push
cd ..
```

### Replacing a Notebook (e.g., exporter → exporter-2)

```bash
# Export the new version
node tools/lope-jumpgate.js \
  --source @tomlarkworthy/exporter-2 \
  --output lopecode/notebooks/@tomlarkworthy_exporter-2.html

# Remove old, add new, commit
cd lopecode
git rm notebooks/@tomlarkworthy_exporter.html
git add notebooks/@tomlarkworthy_exporter-2.html
git commit -m "Replace exporter with exporter-2"
git push
cd ..
```

## Key Jumpgate Cells (for debugging)

The jumpgate notebook (`@tomlarkworthy/jumpgate` module) has these important cells:

| Cell | Input mechanism | Purpose |
|------|----------------|---------|
| `source` | `urlQueryFieldView("source")` | Observable notebook URL to export |
| `frame` | `localStorageView("frame")` | Frame notebook URL |
| `export_state_text` | `urlQueryFieldView("export_state")` | JSON config for export (title, hash) |
| `load_source` | `urlQueryFieldView("load_source")` | Toggle to trigger API fetch |
| `exported` | computed | Final export result with `.source` (HTML) and `.report` |
| `output` | mutable | Progress updates during export |

## Patching Runtime Variables from Playwright

When driving lopecode notebooks from Playwright, you may need to redefine variables. Key rules:

- **Use `module.redefine(name, inputs, fn)`** — never set `v._definition` directly (it won't trigger recomputation)
- **Find the module owner:** `for (const v of rt._variables) { if (v._name === 'foo' && v._module) { v._module.redefine(...); break; } }`
- **Redefining breaks downstream closures.** If cell B captures cell A's value in a closure, redefining A gives B a new value — but any UI element (button, textarea) that was created by B still holds the OLD closure. The button must also recompute.
- **Prefer changing the notebook HTML** over runtime redefines when possible (e.g., bumping a timeout). Runtime redefines are fragile due to closure propagation.
- **If you must redefine a closure-captured value** (like `timeout_ms` inside a flowQueue), redefine the upstream dependency (e.g., `flowQueue` itself) so the entire chain recomputes. Or better yet, just edit the HTML source.

## Debugging Jumpgate Failures

When jumpgate fails, always rerun with `--verbose`:

```bash
node tools/lope-jumpgate.js --source @tomlarkworthy/notebook --output out.html --verbose 2>&1
```

**Reading the output:** Most browser errors (`invalid module`, `selectVariable is not a function`, `error loading module`) are normal noise from module resolution. Filter for the real signal:

```bash
# Extract only jumpgate log lines
... 2>&1 | grep '\[lope-jumpgate\]'
```

**Common failures:**

| Symptom | Cause | Fix |
|---------|-------|-----|
| `exported variable not found` after timeout | Source notebook doesn't exist on Observable (404) | Verify the notebook name is correct and published on ObservableHQ |
| `page.goto: Timeout` with `networkidle` | Page makes ongoing API requests that never settle | Change `waitUntil` to `'domcontentloaded'` in lope-jumpgate.js |
| `Export error: Load source not ticked` | `load_source` query param not propagating | Check `addInitScript` is setting `window.rEPseDFzXFSPYkNz` correctly |
| `"module N"` reference in exported HTML | Source notebook imports a module that isn't "shared" on Observable | Share the dependency notebook on ObservableHQ, then re-jumpgate |

**Tip:** The jumpgate fetches from `api.observablehq.com` — you can verify a notebook exists with:
```bash
curl -sI "https://api.observablehq.com/@tomlarkworthy/notebook-name.js?v=4" | head -1
# Should return HTTP/2 200, not 404
```

## Tool Reference: lope-reader.ts (Fast Static Analysis)

No browser needed, instant results. Use this for exploring notebook structure without running code. Outputs JSON specs by default.

```bash
# Get notebook spec (JSON: title, bootconf, modules with hashes, files)
bun tools/lope-reader.ts notebook.html

# Get raw source code for a specific module
bun tools/lope-reader.ts notebook.html --get-module @tomlarkworthy/tests

# Generate manifest of all notebooks in a directory
bun tools/lope-reader.ts --manifest lopecode/notebooks
```

### Comparing module versions across notebooks

```bash
bun tools/lope-reader.ts notebook1.html --get-module @tomlarkworthy/view > /tmp/v1.js
bun tools/lope-reader.ts notebook2.html --get-module @tomlarkworthy/view > /tmp/v2.js
diff /tmp/v1.js /tmp/v2.js
```

### Finding where a module is used

```bash
grep -l "module-name" lopecode/notebooks/*.html
```

## Tool Reference: lope-runner.js (One-off Runtime Execution)

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

## Verifying Exports

```bash
# Check structure (JSON spec)
bun tools/lope-reader.ts lopecode/notebooks/NOTEBOOK.html

# Run tests if the notebook has any
node tools/lope-runner.js lopecode/notebooks/NOTEBOOK.html --run-tests
```
