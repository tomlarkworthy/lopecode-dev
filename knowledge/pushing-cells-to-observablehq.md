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

Bypass Playwright entirely. Paste the live cookies from a regular logged-in browser session into a gitignored JSON file, then point `lope-push-ws.js` at it via `--cookies-file`.

**Canonical path:** `tools/.observable-cookies.json` — already gitignored via `tools/*.json` in `.gitignore`. Use this path so successive sessions find the cookies in the same spot.

```json
// tools/.observable-cookies.json
{
  "T": "<paste from devtools → Application → Cookies → observablehq.com>",
  "I": "<paste from devtools → Application → Cookies → observablehq.com>"
}
```

Run the push with the flag:

```sh
node --experimental-vm-modules tools/lope-push-ws.js <notebook.html> \
  --module @user/name \
  --target https://observablehq.com/@user/name \
  --cookies-file tools/.observable-cookies.json \
  --cells <cellName>
```

`--cookies-file` short-circuits `extractCookies()` — the script reads the JSON, validates auth via `https://api.observablehq.com/user`, and proceeds. No Playwright profile needed.

When asking the user to paste cookies: tell them to open devtools (Cmd+Opt+I) → Application tab → Storage → Cookies → `https://observablehq.com` → copy the **Value** column for `T` and `I`. They expire in days (T ~2, I ~9), not a long-term secret.

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
| `--cookies-file <path>` | Read T/I cookies from a JSON file instead of Playwright (recommended; see "Workaround" above) |
| `--login` | Open browser for manual login |
| `--headed` | Show browser (for `--login`) |

### Gotchas with `--cells`

`--cells X,Y` triggers `replaceCellsViaWS` — an in-place `modify_node` for every existing name match, plus an `insert_node` for any named cell that isn't yet on Observable. Things to know:

1. **New named cells are inserted at the end.** `replaceCellsViaWS` matches by cell name and `insert_node`s any name from `--cells` that isn't already on the target. No special handling needed — `--cells "newCell,existingCell"` just works.
2. **Imports are dropped when `--cells` is set.** Import statements are matched by byte-exact text, but Observable reformats whitespace (e.g. a local single-line decompile vs. a multi-line stored form). A mismatched import gets classified as new and `insert_node`'d, producing duplicate imports of the same symbols. To avoid that, the tool now skips all imports when `--cells` is in use (and logs `Dropping N import(s)`). Imports the caller wants to change should already exist on the target from earlier pushes; if they really need to change, rerun without `--cells` to refresh the whole module.
3. **Manual import edits via raw WS.** If you actually do need to add or modify a single import statement, write a one-off mjs script that calls `modify_node` (existing import) or `insert_node` (new import) keyed on the import's `node.id` from the REST API. See "WebSocket Editing Protocol" above.
4. **`--no-delete` together with `--cells` is broken.** `--no-delete` forces the *full-replace* code path (insert all, skip delete) — combined with `--cells`, you get duplicates of every named cell with no way to recover via the same script. The CLI now refuses this combination, but if you bypass the check or hit the destructive path another way, recovery is a one-shot mjs script that connects to the WS and `remove_node`s the offending node IDs (the duplicates have the highest `node_id`s in the notebook, since `node_id == event_version`).

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

## Adding new dependencies to a cell (round-trip-safe)

When you need an existing cell to also depend on, say, `currentSession`, the runtime resolves deps from a `$def(..., [depNames], fn)` array — but Observable's parser resolves them from the cell *expression's* free identifiers when the cell is recompiled (e.g. on push). The two views can diverge. If they do, the cell breaks the next time it's pushed.

### Antipattern: closure-renamed parameters

```js
// _publisher imports `xrpc` and `loginWidget` as cell deps but renames them
// in the function signature so the inner arrow can have params with the
// "real" names.
function _publisher(..., currentSession, defaultXrpc, defaultLoginWidget) {
  return (({session = currentSession, xrpc = defaultXrpc, ...} = {}) => { ... });
}
```

Looks fine at runtime. But the cell *expression* — what Observable sees on push — references `defaultXrpc` and `defaultLoginWidget` as free identifiers. There are no cells by those names, so the recompiled version drops them from the dep list and the closure breaks.

### Fix A: IIFE wrap that explicitly names the deps

```js
publisher = ((cs, xrpcRef, lwRef) => ({
  session = cs,
  xrpc = xrpcRef,
  defaultTitle,
  loginWidget: loginWidgetFn = lwRef
} = {}) => {
  // body unchanged — uses session/xrpc/loginWidgetFn as before
})(currentSession, xrpc, loginWidget)
```

The IIFE's call site (`(currentSession, xrpc, loginWidget)`) makes those names free identifiers in the cell expression, so Observable picks them up as deps. The body keeps its original parameter names — no rename churn.

### Fix B: shadowed-default destructure

```js
publisher = ({
  session = currentSession,
  xrpc: callXrpc = xrpc,            // alias to avoid the param `xrpc` shadowing itself
  defaultTitle,
  loginWidget: loginWidgetFn = loginWidget
} = {}) => {
  // body must use callXrpc instead of xrpc
}
```

Cleaner if you can stomach the body-wide rename. The alias `xrpc: callXrpc = xrpc` works because the LHS introduces `callXrpc` and the default `= xrpc` resolves to the outer cell.

### Why file-sync alone isn't enough

`file-sync` patches the cell function source live, but the runtime's $def deps array is set at module load. Editing the function signature on disk shows up in the runtime's cell source, but the runtime keeps the old inputs list. Use `tools/channel/sync-module.ts` to bake the updated module (with new `$def` deps) into the HTML, then reload — that's what makes the new deps actually wire up.

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
