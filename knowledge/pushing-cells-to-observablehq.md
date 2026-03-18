# Pushing Cells to ObservableHQ

## Background

Observable has **no public write API** (feature request open since 2021). The only way to push cell changes back to observablehq.com is via browser automation.

## ObservableHQ Page Structure

Observable's editor is a Next.js app. Understanding the DOM is critical for automation.

### Outer Page (observablehq.com)

```
<div id="__next">
  <nav>...</nav>                              <!-- Top nav bar (always has "Sign in" even when logged in!) -->
  <div class="relative notebook z-0 pb6">     <!-- Notebook wrapper -->
    <div id="cell-{N}" class="... gutter ..."> <!-- One per cell, N = internal cell ID (NOT sequential) -->
      <button aria-label="gutter"              <!-- Gutter button: click to edit cell -->
              title="Edit cell">
      <button title="Click for cell actions\nDrag to move cell"  <!-- ⋮ menu button -->
              aria-label="Click for cell actions\nDrag to move cell"
              class="... dn ...">              <!-- display:none until hover! -->
    </div>
    ...
  </div>
  <iframe sandbox="allow-scripts allow-same-origin">  <!-- Notebook output iframe -->
  </iframe>
  <script id="__NEXT_DATA__">                 <!-- Contains full notebook data as JSON -->
  </script>
</div>
```

### Key Selectors

| Element | Selector | Notes |
|---------|----------|-------|
| Cell gutter buttons | `button[aria-label="gutter"]` | One per cell, count = cell count |
| Cell actions menu (⋮) | `button[title*="Click for cell actions"]` | **Hidden** (`display:none`) until hover |
| Cell wrapper by ID | `#cell-{N}` | N is Observable's internal cell ID |
| Menu items | `[data-valuetext="Select"]` | Reach UI menu items, also hidden until menu opens |
| Checkboxes (select mode) | `input[type="checkbox"]` | Appear after entering select mode |
| Notebook iframe | `iframe` (first) | Contains rendered cell outputs |
| Notebook data | `#__NEXT_DATA__` | JSON with all cell sources and IDs |

### __NEXT_DATA__ Structure

The `<script id="__NEXT_DATA__">` tag contains the full notebook as JSON:

```js
{
  props: {
    pageProps: {
      initialNotebook: {
        nodes: [
          { id: 0, name: null, value: "md`# Title`" },
          { id: 629, name: null, value: "x = 42" },
          { id: 15, name: "suite", value: "viewof suite = createSuite()" },
          ...
        ]
      }
    }
  }
}
```

- `id`: Internal cell ID (matches `#cell-{id}` in DOM). NOT sequential — assigned by Observable.
- `name`: Cell name if explicitly set by Observable, often `null` even for named cells.
- `value`: Full Observable source code as typed in the editor.
- DOM order: `#cell-{id}` divs appear in DOM in the same order as the notebook. Read DOM order via `document.querySelectorAll('[id^="cell-"]')`.

### Cell Name Extraction

Observable's `name` field in `__NEXT_DATA__` is often `null`. To identify a cell by name, parse the `value` field:

```js
// "viewof foo = ..." → "viewof foo"
// "bar = 42" → "bar"
// "import {x} from ..." → "import {x} from ..."
const m = source.match(/^(viewof\s+\w+|mutable\s+\w+|\w+)\s*=/);
```

### Hidden Elements (Automation Gotcha)

The cell actions menu button (`⋮`) has CSS class `dn` (Tachyons for `display: none`). It only becomes visible on hover. **Playwright's `.click()` and `.click({ force: true })` both fail** on `display:none` elements.

**Solution**: Use `page.evaluate()` to make it visible and click via JS:

```js
await page.evaluate((idx) => {
  const buttons = document.querySelectorAll('button[title*="Click for cell actions"]');
  buttons[idx].style.display = 'block';
  buttons[idx].click();
}, cellIndex);
```

Similarly, menu items (e.g., "Select") use Reach UI and are hidden until the menu opens. Click them via `page.evaluate()`:

```js
await page.evaluate(() => {
  document.querySelector('[data-valuetext="Select"]').click();
});
```

### Login Detection

**Do NOT use `text=Sign in`** — the top nav bar always shows "Sign in" even when you ARE logged in. Instead:
- Check if the URL redirected to `github.com/login` or `/sign-in`
- Check if the notebook iframe appeared within a timeout

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
2. Check for login redirect (NOT `text=Sign in`)
3. Wait for notebook iframe to appear
4. Write new cells to clipboard via `execCommand("copy")` inside iframe
5. Click a cell in iframe → Escape → Meta+v (paste)
6. Use `page.evaluate()` to click `⋮` menu on an old cell (hidden button)
7. Use `page.evaluate()` to click "Select" menu item
8. Check all old cells, leave new cells unchecked
9. Press `D` twice (delete + confirm)
10. Wait for autosave

## In-Place Cell Replacement Workflow (--cells mode)

For replacing specific cells without touching others:

1. Read cell names from `__NEXT_DATA__` (parse `value` field for name)
2. Match target cells by name against decompiled replacements
3. For each match (bottom-to-top to preserve indices):
   a. Write single cell to clipboard (Observable MIME, inside iframe)
   b. Click `⋮` menu via `page.evaluate()` (hidden button)
   c. Click "Select" via `page.evaluate()` (hidden menu item)
   d. Paste (`Meta+v`) — new cell appears above the selected cell
   e. Press `D` twice to delete the old cell (still checked from select)

Processing bottom-to-top ensures indices don't shift as cells are replaced.

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

Observable uses GitHub OAuth. The push tool uses a dedicated persistent browser profile at:
```
~/.claude/lope-push-browser-profile
```

This is separate from the dev-browser profile to avoid `SingletonLock` conflicts when both run simultaneously.

Log in once:
```bash
node tools/lope-push-to-observablehq.js --login --headed
```

The session persists across runs in the dedicated profile.

## Tool: lope-push-to-observablehq.js

```bash
# Push all cells (full replace)
node tools/lope-push-to-observablehq.js <notebook.html> --module @tomlarkworthy/testing --target https://observablehq.com/d/ab8e6f7e97de571f

# Replace specific cells in-place (safe)
node tools/lope-push-to-observablehq.js <notebook.html> --module @tomlarkworthy/testing --target URL --cells "test_foo,test_bar"

# Add new cells without deleting (for seeding a notebook)
node tools/lope-push-to-observablehq.js <notebook.html> --module @tomlarkworthy/testing --target URL --cells "foo" --no-delete

# Dry run to see available cell names
node tools/lope-push-to-observablehq.js <notebook.html> --module @tomlarkworthy/testing --dry-run
```

### Options

| Option | Description |
|--------|-------------|
| `--module <name>` | Module to extract cells from (required) |
| `--target <url>` | Observable notebook URL to push to (required, unless `--dry-run`) |
| `--cells <names>` | Comma-separated cell names to push (default: all) |
| `--no-delete` | Skip deleting old cells. When used with `--cells`, pastes via `fullReplace` instead of in-place |
| `--headed` | Show browser for debugging |
| `--dry-run` | List cells that would be pushed without pushing |
| `--verbose` | Show browser console logs and cell map details |
| `--timeout <ms>` | Max wait time (default: 60000) |
| `--profile <path>` | Browser profile directory (default: `~/.claude/lope-push-browser-profile`) |
| `--login` | Open browser for manual login, then wait for Ctrl+C |

### Routing Logic

- `--cells` without `--no-delete`: **In-place replacement** via `replaceCellsInPlace()` — matches by name in target, replaces one at a time
- `--cells` with `--no-delete`: **Add-only** via `fullReplace()` — pastes filtered cells, no deletion
- No `--cells`: **Full replace** via `fullReplace()` — pastes all, optionally deletes all old
