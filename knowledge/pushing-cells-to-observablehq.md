# Pushing Cells to ObservableHQ

## Background

Observable has **no public write API** (feature request open since 2021). However, their internal **WebSocket editing protocol** can be used directly from Node.js via `lope-push-ws.js`.

## WebSocket Editing Protocol

Observable notebooks are edited via a persistent WebSocket connection.

### Connection

- **URL**: `wss://ws.observablehq.com/document/{notebook_id}/edit`
- **Headers**: `Origin: https://observablehq.com`, `Cookie: I={jwt}; T={token}`
- **Handshake**: Client sends `{"type":"hello","token":"{T_cookie}","version":{current_version},"next":true}`
- **IMPORTANT**: The `version` in the hello message must be the **current document version** from the API. Sending `version: 0` causes a 404 error.

### Authentication

Two cookies are required (both from `observablehq.com`):
- **`I` cookie** (httpOnly JWT) — Primary auth for REST API and WebSocket. Expires ~9 days.
- **`T` cookie** — Session token sent in the WS `hello` message. Expires ~2 days.
- **`Origin: https://observablehq.com`** header is required for cookie-based auth to return roles/sharing from the REST API.

#### Auth fragility — Playwright cookie extraction is unreliable

The bundled flow is `node tools/lope-push-ws.js --login --headed` (interactive login → cookies saved in `~/.claude/lope-push-browser-profile/`), then subsequent invocations launch headless Playwright and read cookies. **This breaks at runtime** in two ways:

1. **Headless Playwright triggers Observable's anti-bot.** When `extractCookies()` navigates `chromium.launchPersistentContext(..., { headless: true })` to `https://observablehq.com/`, the response wipes the HttpOnly `T` and `I` rows from disk. After one probe the cookie store is empty (only `_ga` etc remain). Repeat logins won't fix it — the next headless probe wipes them again.
2. **Skipping navigation doesn't help either.** Even reading cookies straight from the persistent context (no `page.goto`) returns only the visible cookies — `T` and `I` are HttpOnly and Playwright Chromium-headless misses them.

#### Workaround — JSON-file cookie path

Bypass Playwright entirely. Paste the live cookies from a regular logged-in browser session and load them from a gitignored JSON file:

```js
// worktrees/<N>/.fix-staging/observable-cookies.json
{
  "T": "<paste from devtools → Application → Cookies → observablehq.com>",
  "I": "<paste from devtools → Application → Cookies → observablehq.com>"
}
```

In your push script (custom WS or a forked lope-push-ws):

```js
import { readFileSync } from "node:fs";
function getCookies() {
  const c = JSON.parse(readFileSync("worktrees/<N>/.fix-staging/observable-cookies.json", "utf8"));
  if (!c.T || !c.I) throw new Error("missing T or I");
  return c;
}
// use cookies.T / cookies.I in WS Headers and REST fetch as before
```

When asking the user to paste cookies: tell them to open devtools (Cmd+Opt+I) → Application tab → Storage → Cookies → `https://observablehq.com` → copy the **Value** column for `T` and `I`. They expire in days, not a long-term secret.

The `.fix-staging/` directory is bug-fix scratch space and shouldn't be committed; if it persists, add to `.gitignore`.

### Message Types

**Client → Server:**

```js
// Modify existing cell content
{ type: "save", events: [{ version: V+1, type: "modify_node", node_id: N, new_node_value: "cell source" }], edits: [], version: V, subversion: S }

// Insert new cell (node_id MUST equal the event version)
{ type: "save", events: [{ version: V+1, type: "insert_node", node_id: V+1, new_next_node_id: null|N, new_node_value: "source", new_node_pinned: true, new_node_mode: "js", new_node_data: null, new_node_name: null }], edits: [], version: V, subversion: S }

// Delete cell
{ type: "save", events: [{ version: V+1, type: "remove_node", node_id: N }], edits: [], version: V, subversion: S }
```

**Server → Client:**

```js
{ type: "hello" }                          // Connection accepted
{ type: "load", version: V, subversion: S } // Current state loaded
{ type: "saveconfirm", version: V, subversion: S } // Operation confirmed
{ type: "error", status: N, message: "..." } // Error (404 = bad version/auth)
```

### Key Constraints

- `node_id` for `insert_node` **must equal the event `version`** — arbitrary IDs cause 400 errors
- `new_next_node_id: null` inserts at the end; set to an existing node ID to insert before it
- Each operation must use the confirmed version/subversion from the previous operation
- The REST API at `https://api.observablehq.com/document/{slug}` returns node IDs, values, and versions

## Tool: lope-push-ws.js (Preferred)

```bash
# Push all cells (auto-reads target from spec file's upstreams["observablehq.com"][module])
node --experimental-vm-modules tools/lope-push-ws.js <notebook.html> --module @tomlarkworthy/testing

# Push all cells (explicit target)
node --experimental-vm-modules tools/lope-push-ws.js <notebook.html> --module @tomlarkworthy/testing --target https://observablehq.com/d/ab8e6f7e97de571f

# Replace specific cells in-place (safe)
node --experimental-vm-modules tools/lope-push-ws.js <notebook.html> --module @tomlarkworthy/testing --cells "test_foo,test_bar"

# Add new cells without deleting (for seeding)
node --experimental-vm-modules tools/lope-push-ws.js <notebook.html> --module @tomlarkworthy/testing --no-delete

# Dry run to see available cell names
node --experimental-vm-modules tools/lope-push-ws.js <notebook.html> --module @tomlarkworthy/testing --dry-run

# Login (required once, uses Playwright to capture cookies)
node --experimental-vm-modules tools/lope-push-ws.js --login --headed
```

### Options

| Option | Description |
|--------|-------------|
| `--module <name>` | Module to extract cells from (required) |
| `--target <url>` | Observable notebook URL to push to (reads from spec `upstreams["observablehq.com"][--module]` if omitted; falls back to legacy top-level `"observablehq.com"` field) |
| `--cells <names>` | Comma-separated cell names to push (default: all) |
| `--no-delete` | Skip deleting old cells |
| `--dry-run` | List cells that would be pushed without pushing |
| `--verbose` | Show WS message details |
| `--timeout <ms>` | Max wait time (default: 30000) |
| `--profile <path>` | Browser profile for cookie storage (default: `~/.claude/lope-push-browser-profile`) |
| `--login` | Open browser for manual login |
| `--headed` | Show browser (for `--login`) |

### Gotchas with `--cells`

`--cells X,Y` triggers `replaceCellsViaWS` — an in-place `modify_node` for every name match. Three quiet failure modes:

1. **New cells (not yet on target) are silently skipped** — the script prints `Warning: cell "X" not found in target notebook — skipping` and moves on. To add a brand-new cell, fall through to the WS protocol directly (`insert_node` with `node_id = newVersion`, see "WebSocket Editing Protocol" above).
2. **Imports match by exact text.** A changed import line — e.g. extending an existing `import { a, b } from "@user/x"` to `import { a, b, c } from "@user/x"` — does **not** match the existing import on Observable, so it's silently skipped. Modify the existing import cell directly via `modify_node` keyed on its current `node.id`.
3. **`--no-delete` together with `--cells` is broken.** `--no-delete` forces the *full-replace* code path (insert all, skip delete) — combined with `--cells`, you get duplicates of every named cell with no way to recover via the same script. The CLI now refuses this combination, but if you bypass the check or hit the destructive path another way, recovery is a one-shot mjs script that connects to the WS and `remove_node`s the offending node IDs (the duplicates have the highest `node_id`s in the notebook, since `node_id == event_version`).

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

### Inner Module Cell Extraction

Lopecode HTML files embed modules as `<script id="@author/module-name">` blocks. These inner modules use a **minified define pattern** `$def()` instead of `main.variable(observer(...)).define(...)`:

```js
// Inner module pattern:
$def("_19j3iky", "linkTo", ["isOnObservableCom","URLSearchParams"], _19j3iky);

// vs. main module pattern:
main.variable(observer("linkTo")).define("linkTo", ["isOnObservableCom","URLSearchParams"], _19j3iky);
```

`lope-push-ws.js` supports both patterns, so `--module @author/inner-module` works for extracting and pushing inner module cells.

### Limitations

- **Import decompilation needs live module refs** — `decompile()` can't reconstruct `import {x} from "@author/notebook"` from static data alone. Handle imports via static analysis of `main.define("name", ["module @author/pkg", "@variable"], ...)` patterns.
- Runs in a browser (needs Playwright) since it depends on bundled acorn/escodegen from the notebook

## Navigation Timeouts

Observable pages never reach Playwright's `networkidle` state due to persistent streaming connections. `lope-jumpgate.js` uses `domcontentloaded` + a fixed wait instead.

## Authentication

Observable uses GitHub OAuth. The push tool uses a dedicated persistent browser profile at:
```
~/.claude/lope-push-browser-profile
```

This is separate from the dev-browser profile to avoid `SingletonLock` conflicts when both run simultaneously.

Log in once:
```bash
node --experimental-vm-modules tools/lope-push-ws.js --login --headed
```

The session persists across runs in the dedicated profile.
