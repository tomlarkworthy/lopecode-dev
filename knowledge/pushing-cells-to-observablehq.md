# Pushing Cells to ObservableHQ

## Background

Observable has **no public write API** (feature request open since 2021). The only way to push cell changes back to observablehq.com is via browser automation.

## Clipboard Paste Mechanism

Observable supports a custom clipboard MIME type `application/vnd.observablehq+json` for bulk cell paste.

### Format

```json
[
  {"id": 1, "value": "x = 42", "pinned": true, "mode": "js", "data": null, "name": null},
  {"id": 2, "value": "md`# Hello`", "pinned": false, "mode": "js", "data": null, "name": ""}
]
```

- `value`: Full Observable cell source as typed in the editor (e.g. `"x = 42"`, `"viewof foo = Inputs.range([0, 100])"`, `"import {bar} from \"@author/notebook\""`)
- `pinned`: Whether the cell output is visible (true = pinned/visible)
- `mode`: Always `"js"` — Observable determines markdown cells by content
- `id`: Unique integer per cell (just use sequential)

### Writing to Clipboard

Browsers block setting custom MIME types via `navigator.clipboard`. Use the `execCommand("copy")` trick (same as `@tomlarkworthy/cells-to-clipboard`):

```js
// Inside the notebook's iframe context:
const cells = [...]; // Observable JSON array
function listener(e) {
  e.clipboardData.setData('text/plain', 'observable cells');
  e.clipboardData.setData('application/vnd.observablehq+json', JSON.stringify(cells));
  e.preventDefault();
}
document.addEventListener('copy', listener);
document.execCommand('copy');
document.removeEventListener('copy', listener);
```

### Pasting

1. Click any element inside the notebook **iframe** (e.g. `iframe.locator('h1').first().click()`)
2. Press `Escape` to enter cell selection mode (blue outline appears)
3. Press `Meta+v` to paste

New cells appear **above** the selected cell.

## Deleting Cells (Bulk)

Observable will **not delete all cells** — at least one must remain. So always paste new cells first, then delete old ones.

### Steps

1. **Enter select mode**: Click the `⋮` menu button on a cell → click "Select"
2. **Check cells**: Checkboxes appear on each cell. Click to check/uncheck.
3. **Delete**: Click the "Delete cells" button in the bottom toolbar (or press `D` key)
4. **Confirm**: The button changes to "Delete?" — press `D` again to confirm

### Gotchas

- The `⋮` menu button is in the outer page gutter, not inside the iframe
- ARIA label for the menu is `"Click for cell actions Drag to move cell"`
- Checkboxes are standard `input[type="checkbox"]` elements in the outer page
- The "Delete cells" button is **disabled** when all cells are selected (shows "Cannot delete all cells")
- The `D` keyboard shortcut works for both initial delete and confirmation
- `Cmd+A` selects all cells visually (blue highlight) but this is a different mode from checkbox selection — you cannot delete from this mode
- `Backspace`/`Delete` keys do NOT delete cells

## Full Replace Workflow

1. Navigate to the Observable notebook URL
2. Verify logged in (no "Sign in" visible)
3. Access the notebook iframe
4. Write new cells to clipboard via `execCommand("copy")`
5. Click a cell in iframe → Escape → Meta+v (paste)
6. Click `⋮` on an old cell → "Select" to enter checkbox mode
7. Check all old cells, leave new cells unchecked
8. Press `D` twice (delete + confirm)
9. Wait for autosave

## Decompilation (Compiled → Observable Source)

The `@tomlarkworthy/observablejs-toolchain` module provides `decompile()` which converts compiled runtime variable definitions back to Observable source.

### Input format

```js
decompile([{
  _name: "x",           // Variable name (null for anonymous)
  _definition: "function _x() {return (42);}",  // Compiled function string
  _inputs: []            // Dependency names as strings
}])
// Returns: "x = 42"
```

### Grouped variables

- `viewof foo`: Pass both the viewof definition and the `(G, _) => G.input(_)` getter as an array
- `mutable bar`: Pass all three (initial, mutable, getter) as an array
- Anonymous cells: `_name: null`

### Limitations

- **Import decompilation needs live module refs** — `decompile()` can't reconstruct `import {x} from "@author/notebook"` from static data alone. Handle imports via static analysis of `main.define("name", ["module @author/pkg", "@variable"], ...)` patterns.
- Runs in a browser (needs Playwright) since it depends on bundled acorn/escodegen from the notebook

## Authentication

Observable uses GitHub OAuth. The dev-browser plugin has a persistent browser profile at:
```
~/.claude/plugins/cache/dev-browser-marketplace/dev-browser/.../profiles/browser-data/
```
Log in once via the headed browser and the session persists across runs.

## Tool: lope-push-to-observablehq.js

```bash
node tools/lope-push-to-observablehq.js <notebook.html> --module @tomlarkworthy/testing --target https://observablehq.com/d/ab8e6f7e97de571f
```

Uses the toolchain notebook to decompile cells, then pushes via Playwright clipboard automation.
