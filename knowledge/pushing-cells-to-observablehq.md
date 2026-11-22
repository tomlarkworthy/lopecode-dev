---
scope: [local-development, in-notebook]
triggers:
  - "(^Bash |^|[;&|] )node +(--experimental-vm-modules +)?tools/lope-push-ws\.js"
  - "(^Bash |^|[;&|] )node +tools/lope-push-files\.js"
---

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

### Still works after the notebook 2.0 migration

Observable made Notebooks 2.0 the default and moved the 1.0 editor to `old.observablehq.com`. Pushed 5 cells to `@tomlarkworthy/claude-code-pairing` on 2026-09-02, after the switch, with the tool unchanged: `api.observablehq.com/document/{slug}` returned version 1890, `wss://ws.observablehq.com/document/{id}/edit` accepted the hello, five `modify_node` saves confirmed to version 1895, and `api.observablehq.com/@tomlarkworthy/claude-code-pairing.js?v=4` served the new cell bodies. Nothing needed the `old.` host.

## New site: HTTP edits route (`--next`)

Found 2026-11-22. The `I`/`T` login to the old host was no longer available, and a notebook
created on the new site (`/d/3ec6cd9f87b28862`, a scrap notebook) 404s on
`api.observablehq.com/document/<id>` and `…/d/<id>.js?v=4`, so neither the REST read nor the
websocket above can reach it. The route was found from the browser's Network panel: a cell edit
POSTs

```
https://observablehq.com/api/notebook/3ec6cd9f87b28862/edits
{version: 6, edits: [{type: "modify_node", node_id: 2, new_node_value: "hello"}]}
```

The `edits` entries are the old websocket's `events` without their `version` field. Measured by
curl with only the `D` and `sesh` cookies, plus `Origin`, `Content-Type: application/json` and a
browser `User-Agent`:

```
POST {version:6, modify_node}   -> 409 Conflict          (stale; the doc was at 7)
POST {version:7, modify_node}   -> 200 {"version":8}
POST {version:9, insert_node node_id:10, new_node_mode:"js"}  -> 200 {"version":10}
POST {version:0, edits:[]}      -> 400 Bad request
GET  /edits?version=9           -> 200 {version:10, base:9, more:true, events:[…insert_node…], keyframes:[], files:[], users:[], publishes:[]}
GET  /edits?version=1|2         -> 404   (earliest accepted base on this doc was 3)
```

The `insert_node` sent as mode `"js"` is stored as mode `"ojs"`; the site also has `"ts"` and
`"md"` cells.

**Reading the current cells: `/api/export/<id>`.** It is the site's "download" route
(`content-disposition: attachment;filename="Scrap.html"`). It returns the current draft as
notebook-kit HTML, one `<script>` per cell, whose `id` is the node id. It answers curl with the
two cookies, and 404s without them.

```
<notebook theme="air">
  <title>Scrap</title>
  <script id="12" type="application/vnd.observable.javascript">
    intro = md`# Plugin Registry
```

`tools/observable-next.js` `parseExport` decodes it the way notebook-kit's `deserialize` does
(`vendor/notebook-kit/src/lib/serialize.ts:32`): it maps `type` to a mode, unescapes `<\/script`,
and strips the 4-space indent. The export has no version number. `GET /edits?version=N`
supplies it: the reply's `version` is the current one for any N from the oldest kept version
up to the current one, and anything outside that range 404s.

```
GET /edits?version=24  -> 200 {"version":24,"base":24,"events":[],…}     (current was 24)
GET /edits?version=25  -> 404
```

`more` is `true` on every reply, including one with no events. At version 56, `?version=3`
returned all 53 events (4…56) with `version: 56`. So at that size `more` does not mark a page,
and `version` is the current one. Longer histories have not been tried.

A node's id is the version that inserted it, so the newest node id is always in range unless
the history no longer goes back that far. On that fallback, and on an empty notebook, the
reader loads the `/d/<id>` page in headless Chromium and takes `version` from the payload.

That page read was the first reader, before the export route was found. The page carries the
notebook in its Next.js React Server Components (RSC) payload, the `self.__next_f.push(...)`
chunks: `{version, publish_version, role, body:{title, cells:[{id, value, mode, pinned, …}]}}`.
It has two costs:
- curl gets a `429` Vercel Security Checkpoint even with browser headers, so it needs Chromium.
- Long values come as references (`"$4a"`) to RSC text rows `4a:T<hexByteLength>,<text>`, which
  can follow one another with no separator.

Waiting for `networkidle` timed out at 60 s, so the page reader takes the body of the `200`
response for `/d/<id>`.

Compared on 2026-11-22 on the same notebook, the two readers agreed:

```
export v24 11 cells 463ms  |  page v24 11 cells 674ms   all 11: same value, mode, pinned
```

Both readers were also given four probe cells, inserted by `tools/scratch/newobs-edge-probe.mjs`.
Both returned each one exactly as sent, with the right mode and pinned flag:
- a value containing `<script>` and `</script >`;
- an md cell starting with `$`;
- a pinned `ts` cell;
- blank and indented lines.

**Tool.** `lope-push-ws.js` selects this route when `--cookies-file` holds `D` and `sesh`.
`--next` forces it and still needs that file. `--target` takes a `/d/<id>` URL or a bare 16-hex id. `@user/slug` URLs
are rejected by `notebookIdFromTarget`. `connectNext` answers `saveconfirm`/`error` like the
websocket, so `--cells`, full replace, `--remove-nodes`, pacing and retries are the existing
code. Three things changed with it:
- On both routes, a `409` now re-reads the version before the retry, because resending a stale
  version cannot succeed. This is traced in the code and has not been triggered live.
- A network error inside `send` is reported as `status 0`. It is retried like a `409`, after a
  version re-read, because the POST may have landed.
- The fast-fail cookie check fetches `/api/export/<id>`. With bad cookies it exits in 0.45 s
  (`GET /api/export/3ec6cd9f87b28862: 404`), before the decompile.

```sh
# tools/.observable-next-cookies.json (gitignored): {"D": "<value>", "sesh": "<value>"}
node --experimental-vm-modules tools/lope-push-ws.js lopecode/notebooks/@tomlarkworthy_exporter-3.html \
  --module @tomlarkworthy/plugin-registry \
  --target https://observablehq.com/d/3ec6cd9f87b28862 \
  --cookies-file tools/.observable-next-cookies.json
```

Runs on 2026-11-22 against the scrap notebook:
- `--remove-nodes 10`: version 10 → 11.
- Full replace: 11 inserted, 2 deleted (11 → 24).
- I set cell 12 to `intro = md\`# tampered\`` by hand. `--cells intro` then put it back (29 → 30).
- Full replace with a bare-id target: 11 inserted, 15 deleted (30 → 56). A re-read found all 11
  cells byte-identical to the local `--dump`.

**Not yet known:**
- **Publishing.** The scrap notebook shows `publish_version: null`, and nothing here publishes.
- **Attachments.** The edits route carries no files. The site CSP's `connect-src` lists
  `observable-file-attachments-production.s3.us-east-1.amazonaws.com`, which suggests a presigned
  S3 upload; that route has not been captured. Inside a notebook, the worker's stdlib has
  `FileAttachment.attach(file)`. It posts `{type:"attachFile", file}` to the editor frame. This
  was read from `chat-worker/assets/index-DNNwTBO5.js` and not exercised.
- **Cookie lifetime.** `D`'s suffix `1819515881390` reads as a 2027 epoch-ms timestamp, which
  is an inference. `sesh`'s lifetime is unknown.
- **Pacing.** The ~57-save socket limit and the 404-under-load behaviour were measured on the
  websocket, not on this route. A 26-save full replace ran with no retries. The tool still
  re-reads the version every 40 saves, which here costs one export fetch.

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
| `--pace <ms>` | Delay between saves (default 150) — the endpoint 404s on sustained back-to-back writes |
| `--timeout <ms>` | Max wait time (default: 30000) |
| `--profile <path>` | Browser profile for cookie storage (default: `~/.claude/lope-push-browser-profile`) |
| `--cookies-file <path>` | Read T/I cookies from a JSON file instead of Playwright (recommended; see "Workaround" above). A file holding `D`/`sesh` selects the new-site route |
| `--next` | New-site HTTP edits route (see "New site" above); automatic when the cookies file holds `D`/`sesh` |
| `--login` | Open browser for manual login |
| `--headed` | Show browser (for `--login`) |

### Gotchas with `--cells`

`--cells X,Y` triggers `replaceCellsViaWS` — an in-place `modify_node` for every existing name match, plus an `insert_node` for any named cell that isn't yet on Observable. Things to know:

1. **New named cells are inserted at the end.** `replaceCellsViaWS` matches by cell name and `insert_node`s any name from `--cells` that isn't already on the target. No special handling needed — `--cells "newCell,existingCell"` just works.
2. **Imports are dropped when `--cells` is set.** Import statements are matched by byte-exact text, but Observable reformats whitespace (e.g. a local single-line decompile vs. a multi-line stored form). A mismatched import gets classified as new and `insert_node`'d, producing duplicate imports of the same symbols. To avoid that, the tool now skips all imports when `--cells` is in use (and logs `Dropping N import(s)`). Imports the caller wants to change should already exist on the target from earlier pushes; if they really need to change, rerun without `--cells` to refresh the whole module.
3. **Manual import edits via raw WS.** If you actually do need to add or modify a single import statement, write a one-off mjs script that calls `modify_node` (existing import) or `insert_node` (new import) keyed on the import's `node.id` from the REST API. See "WebSocket Editing Protocol" above.
4. **`--cells` cannot address an anonymous cell.** Matching is by name, so a doc/markdown cell defined as `$def("_pid", null, ["md"], fn)` is invisible to `--cells` and is silently left stale. Use `--cells-match-body <substring>` instead — it locates the anonymous cell by a distinctive substring of its body and refuses if that substring is not unique. Failing that, a one-off `modify_node` keyed on the node id from `GET /document/{slug}` (`tools/push-cp-docs.mjs` is a worked example). Do **not** reach for `--no-delete` or a full push to sweep it up.
5. **`--no-delete` together with `--cells` is broken.** `--no-delete` forces the *full-replace* code path (insert all, skip delete) — combined with `--cells`, you get duplicates of every named cell with no way to recover via the same script. The CLI now refuses this combination, but if you bypass the check or hit the destructive path another way, recovery is a one-shot mjs script that connects to the WS and `remove_node`s the offending node IDs (the duplicates have the highest `node_id`s in the notebook, since `node_id == event_version`).

## Pace the saves

Observable's save endpoint answers **404 after about three back-to-back writes**. A
`--delete-first` push died three removals in, leaving the live notebook with 41 of its 54 cells
and the insert phase unrun — the notebook was missing its import cell and every dependent read
`… is not defined`. The tool now paces saves (`--pace`, default 150ms) and retries a
404/409/429/5xx six times with backoff; the errored event is not applied, so resending the same
version is safe for a 404/429/5xx. A 409 means the version is stale, so since 2026-11-22 the tool
re-reads it before resending. If a push still dies partway, re-run it — `--delete-first` is monotonic — and
check `GET /document/{slug}` for the node count before assuming the mirror is fine.

### A connection goes quiet after ~57 saves

Separate failure from the 404 above, and pacing does not help. The socket simply stops sending
`saveconfirm`. Measured 2026-08-14 pushing 165 cells to `@tomlarkworthy/coded-landmark-tracking`:

```
run 1  --pace 700   died on `Timeout waiting for saveconfirm v58`     57 ops
run 2  --pace 700   56 deletes + 2 inserts, died on v115              58 ops
```

Same count both times, and run 2 died on the *second* insert of a cell run 1 had already written
without complaint — so it is the connection and not a cell the server rejects.

**A timed-out save is not applied.** After run 2 died on v115 the document read `version 114`,
`nodes 1`, with the v114 insert present and nothing at 115. That is what makes reconnect-then-resend
safe rather than a duplicate-insert risk.

`lope-push-ws.js` now retires the socket every 40 saves and treats a confirm timeout as a dead
socket — reconnecting re-reads the version from the API instead of assuming either outcome. The 165
cells then went up in one run through four reconnects.

Neither failure was recoverable by re-running, which is why the tool had to change: a full push
inserts everything again from scratch, and `--cells` cannot address the ~60 anonymous md cells
needed to fill the gap.

## What does not survive the trip

The pusher reads the compiled module, not the notebook UI, so anything the static scanner
cannot see or the decompiler cannot spell is missing from the target — usually without an
error until the notebook is loaded on Observable.

1. **A `$def` whose function is written inline is not pushed.** The scanner collects top-level
   `const X = function…` / `function X()` bindings and matches `$def(pid, name, [inputs], X)`
   with `X` as a **bare identifier**. `$def("_p", "viewof x", ["Inputs"], function(Inputs){…})`
   matches nothing and the cell vanishes — this dropped all five `viewof` cells from an
   annotate push and the notebook failed with `viewof annotations is not defined`. The tool now
   warns (`N of M $def(...) registrations were not extractable`); the fix is to hoist the
   function to a named const.
2. **Dependencies with no Observable source spelling become undefined cells.** `@variable` (the
   runtime builtin that hands a cell its own `Variable`) decompiles to the *parameter name*, so
   `["…","@variable"]` arrives on Observable as a dependency on a cell literally called `_v` →
   `RuntimeError: _v is not defined`. Use `thisModule()` from `@tomlarkworthy/runtime-sdk`
   (`viewof self = thisModule()`) when the cell needs its own module.
3. **Hand-written module bridges are not imports.** Import extraction matches the
   `main.define(name, ["module …", "@variable"], (_, v) => v.import(name, _))` shape. A bespoke
   bridge — e.g. a deliberately lazy `main.define("cellEditor", ["module @tomlarkworthy/editor-5"],
   (m) => () => m.value("cellEditor"))` — matches neither that nor a cell, so the name is simply
   absent on the target. Express it as an ordinary cell (`importShim` inside the thunk keeps the
   laziness) or as a real import.

Check for all three at once by booting the published module headlessly, which needs neither the
Observable page nor a login — see `tools/probe-observable-annotate.mjs`: import
`https://api.observablehq.com/{slug}.js?v=4` into a bare `@observablehq/runtime` with an
observer that records `fulfilled` / `rejected` per cell, and expect `errors: 0`.

## File Attachments (REST, not WebSocket)

File records live outside the node/version stream — uploading one does not bump the
document version and never touches cells. Same cookies as above (`I` + `T`).

### Endpoints

```
POST https://api.observablehq.com/document/{documentId}/file
     multipart/form-data: token=<T cookie>, client_name=<name>, file=<blob>
     -> 200 with a newline-delimited JSON stream:
        {"type":"start","file":{...}} / {"type":"progress","percent":N}
        {"type":"finish","file":{"name","size","create_time"}}
        {"type":"error","message":"FILE_QUOTA_EXCEEDED"|"FILE_EMPTY"|...}   <- also HTTP 200
     -> 409 if the name has EVER been used on this document (see below)

POST https://api.observablehq.com/document/{documentId}/file/delete?name={name}
     JSON body {"token": <T cookie>}  -> 204
```

Errors arrive in the response body with HTTP 200, so the stream must be parsed —
a bare `resp.ok` check reports failures as successes. `{documentId}` is the 16-hex
`id` from `GET /document/{slug}`, not the slug.

The server sniffs the MIME type itself (`audio/wav` in the part header came back as
`audio/vnd.wave`); the file `id` is a 128-hex digest, but not a plain sha512 of the
bytes, so it can't be used for local dedupe. Compare by size, or download `file.url`
and byte-compare.

Uploaded files show up in `GET /document/{slug}` under `files[]` and in the compiled
module (`/@user/slug.js?v=4`) as `const fileAttachments = new Map([["name", {url, mimeType}]])`,
which is what `FileAttachment(name)` resolves against — so dynamic names work as long
as the name is in that map.

### Attachment names are one-shot per document

A name that has been uploaded once is reserved **for the life of the document**.
Deleting is a soft delete: the record stays in `files[]` with `status: "deleted"`,
and re-uploading that name 409s forever. There is no rename, restore or purge
endpoint (`/file/rename`, `/file/restore`, `?purge=true` all 404).

Observable's own UI never overwrites either: "replace file" mints the next free
`name@N.ext` (`hihat.wav` → `hihat@1.wav`) and rewrites the cells that referenced
the old name. Treat delete as irreversible and plan attachment names accordingly.

### Tool: lope-push-files.js

```bash
# Upload a module's attachments (skips ones already identical remotely)
node tools/lope-push-files.js lopebooks/notebooks/@tomlarkworthy_daw.html \
  --module @tomlarkworthy/daw \
  --target https://observablehq.com/@tomlarkworthy/daw \
  --cookies-file tools/.observable-cookies.json

# See the plan without uploading
... --dry-run
```

| Option | Description |
|--------|-------------|
| `--module <name>` | Only this module's attachments (default: all in the HTML) |
| `--target <url>` | Observable URL or `/d/{id}` (default: spec `upstreams["observablehq.com"][module]`) |
| `--files <a,b>` | Only these attachment names |
| `--replace-as-new` | On content conflict, upload as `name@N.ext` (cell references are yours to update) |
| `--prune` | Delete remote files not present locally — irreversible, burns the name |
| `--size-only` | Skip the byte-compare download for equal-size files |
| `--dry-run` | Print the plan only |
| `--cookies-file` | T/I cookie JSON (default `tools/.observable-cookies.json`) |

Local attachments come from the `<script type="text/plain" id="@user/mod/name.ext">`
blocks (base64-decoded when `data-encoding="base64"`), so the HTML is the source of
truth exactly as it is for modules. A file whose content differs from the remote copy
is reported as a **conflict** and the run fails — the tool never deletes to replace,
because that would burn the name.

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
