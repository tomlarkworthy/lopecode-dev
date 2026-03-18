# Maintaining and Updating Lopecode & Lopebook Content Repositories

## Repository Structure

- `lopecode/` — Main repository (submodule at `tomlarkworthy/lopecode`). Contains published notebook HTML files in `lopecode/notebooks/`.
- `lopecode/lopebooks/` — Was a nested submodule, now a sibling directory. Contains development/staging notebooks in `lopebooks/notebooks/`.

Both repos hold self-contained lopecode HTML files (1-3 MB each).

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

## Workflow: Updating a Notebook in lopecode

```bash
# 1. Export the latest version
node tools/lope-jumpgate.js \
  --source @tomlarkworthy/notebook-name \
  --output lopecode/notebooks/@tomlarkworthy_notebook-name.html

# 2. Verify the export
node tools/lope-reader.js lopecode/notebooks/@tomlarkworthy_notebook-name.html

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

## Testing Lopecode Module Functions with Node.js

Use `lope-browser-repl.js` to test module functions from Node.js test files. Key patterns:

### Sync IIFEs only

The REPL's `eval` does NOT support async functions (they return `{}`). Always use sync IIFEs:

```javascript
// GOOD
{"cmd": "eval", "code": "(() => { ... return JSON.stringify(result); })()"}

// BAD — returns {}
{"cmd": "eval", "code": "(async () => { ... return JSON.stringify(result); })()"}
```

### Poll for variable readiness

Observable evaluates lazily. After `load`, poll until target variables are computed:

```javascript
// In test before() hook, after load:
for (let i = 0; i < 30; i++) {
  const check = await sendCommand(repl, {
    cmd: "eval",
    code: `(() => {
      const runtime = window.__ojs_runtime;
      for (const v of runtime._variables) {
        if (v._name === "myFunction" && typeof v._value === "function") return "ready";
      }
      return "waiting";
    })()`,
  });
  if (check.ok && check.result?.value === "ready") break;
  await new Promise((r) => setTimeout(r, 500));
}
```

### Helper: look up and call runtime functions

```javascript
function evalFns(repl, fnNames, bodyCode) {
  const lookups = fnNames
    .map(n => `for (const v of runtime._variables) { if (v._name === "${n}" && typeof v._value === "function") { ${n} = v._value; break; } }`)
    .join("\n");
  const decls = fnNames.map(n => `let ${n};`).join("\n");
  return sendCommand(repl, {
    cmd: "eval",
    code: `(() => {
      const runtime = window.__ojs_runtime;
      ${decls}
      ${lookups}
      ${bodyCode}
    })()`,
  });
}

// Usage:
const res = await evalFns(repl, ["parseViewDSL", "serializeGoldenDSL"], `
  const gl = parseGoldenDSL("R100(S50(@tomlarkworthy/a),S50(@tomlarkworthy/b))");
  return JSON.stringify(serializeGoldenDSL(gl));
`);
```

See `tests/notebooks/lopepage-urls.test.js` for a complete working example.

## Verifying Exports

```bash
# Check structure
node tools/lope-reader.js lopecode/notebooks/NOTEBOOK.html

# List modules
node tools/lope-reader.js lopecode/notebooks/NOTEBOOK.html --list-modules

# Run tests if the notebook has any
node tools/lope-runner.js lopecode/notebooks/NOTEBOOK.html --run-tests
```
