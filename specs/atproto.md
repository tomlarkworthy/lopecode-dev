# Lopecode on ATProto

Status: draft / exploratory. Refining a sketch authored without knowledge of the codebase against what actually exists today.

## Milestones

- **2026-04-26 — First light.** First lopebook published to atproto via the v0 lopejack prototype (then named lopefeed): `at://did:plc:j7nm3lrd5h7fm3sfhcv3lhfv/dev.lope.bundle/3mkg4yuxhir27` (under the original `dev.lope.bundle` lexicon, since renamed to `dev.lopecode.bundle`). App-password auth, content-addressed file table, single-record bundle. Round-trip publish path proven end-to-end against a real PDS.

## Goal

Treat ATProto as the **identity + storage + social substrate** for lopecode artifacts, while lopecode remains the **runtime + packaging + portable-execution** substrate. Custom lexicons hold module/app records; a small indexer turns them into feeds, dependency views, forks, and discovery; an optional Bluesky bridge reuses the existing follow graph for distribution.

## What lopecode already gives us

The single most important primitive to pin down: **everything inside a lopecode HTML is a file.** Modules, file attachments, and bootconf are all stored uniformly as `<script id="..." type="text/plain" data-mime="..." data-encoding="...">` blocks, resolved at runtime via `window.lopecode.contentSync(id)`. The id is the lookup key; the MIME determines how the runtime treats the bytes.

- **Files** — the universal storage form. Identity is the `id`. `data-mime` discriminates the kind: `application/javascript` for module source, gzipped libs, CSS, images, JSON state, etc. Binary payloads use `data-encoding="base64"`.
- **Modules** — *just files* with `id="@user/module-name"` and `data-mime="application/javascript"`. The body is a compiled Observable `define(runtime, observer)` function. A module is a set of cells, but its on-disk representation is a single file.
- **Module-scoped attachments** — files with `id="@user/module-name/path.ext"`, owned by that module's namespace.
- **Bootconf** — a file with `id="bootconf.json"` carrying `mains[]`, default `hash`, `headless`. Drives which modules eagerly boot and the default lopepage layout.
- **Cells** — Observable source units *inside* a module's compiled body (`x = ...`, `viewof y = Inputs.range(...)`, `mutable z = ...`). Not separate files. Distinct from runtime *variables* (one cell may produce several). The pairing channel's `define_cell` operates at this granularity by re-emitting the module's file.
- **Lopepage** — `@tomlarkworthy/lopepage`, the multi-module layout shell. The hash URL DSL (`#view=R100(S70(@a/b),S30(@c/d))&open=@a/b`) selects which modules render and how.
- **Exporter** — `@tomlarkworthy/exporter` self-serializes the running runtime back to a single HTML file. **Single-file exports are already a derived artifact**, not a primary input.
- **Jumpgate** — `tools/lope-jumpgate.js` + `@tomlarkworthy/jumpgate`. Today this is what bundles a notebook from ObservableHQ.com into a lopecode HTML. **Going away post-migration** (see below).
- **Pairing channel** — `tools/channel/lopecode-channel.ts` + MCP tools (`define_cell`, `eval_code`, `watch_variable`, `list_cells`, `export_notebook`). Live edit/inspect at cell granularity. The natural authoring surface against an atproto-backed (or local-file) module.
- **Internal networking** — `knowledge/lopecode-internal-networking.md` documents the existing fetch/XHR/import interception. The foundation a capability layer sits on; we don't invent it.

## The pivot we are actually proposing

This is not "add atproto on top." It is a substrate swap, and Observable's current role disappears entirely:

> **Today: ObservableHQ.com is the canonical source of truth.** `lopecode/notebooks/*.html` and `lopebooks/notebooks/*.html` are derived bundles produced by jumpgate. Workflow is: edit on Observable → re-export via jumpgate → commit the HTML.
>
> **Proposed: lopecode is file-first and standalone, optionally distributed via atproto** (or another substrate). Authoring happens against local HTML files or PDS-backed records. Observable plays no role post-migration — no sync-back, no jumpgate, no Observable-as-truth. The pairing channel and a lopecode-native editor become the authoring surfaces.

Two distribution modes coexist post-migration:

1. **Standalone file** — a single HTML is the unit. Edit it, re-export via the existing exporter, ship it. No server, no network. This is what lopecode already does well; we just stop treating it as a derived artifact of Observable.
2. **ATProto-distributed** — modules and apps live as records + blobs in user PDSes. An indexer turns them into feeds, dependency views, forks, etc. Bundles can still be exported for portability.

The substrate-swap part of this document covers mode 2. Mode 1 is preserved as a first-class path; everything below should be readable as "atproto adds a distribution layer to a system that already runs fine from a single file."

## Object model

### Module is the social unit, not the app

A lopecode module is reusable across many compositions. People follow, fork, version, and depend on **modules**. Apps are compositions over modules. Note that in current practice many notebooks are *both* — a notebook can be imported as a library and also opened standalone via lopepage; we should not require authors to declare upfront which it is.

### Lineage vs version

Two-record-types-per-thing pattern:

- **Lineage record** (`app.lopecode.module`, `app.lopecode.app`) — stable mutable record that names a thing, its current head, and social metadata (title, description, tags, maintainers, fork-of). What people follow and fork.
- **Version record** (`app.lopecode.moduleVersion`, `app.lopecode.appVersion`) — immutable snapshot. What other versions depend on. What runs.

This separation is important because dependencies must pin to immutable versions for reproducibility, but the social graph operates on mutable lineages.

### Granularity

Because lopecode already represents everything as files, the mapping to atproto is mostly mechanical:

- **One `lope` file → one atproto blob.** Identity, MIME, and bytes round-trip directly. Module source (`@user/name`, `application/javascript`), module-scoped attachments (`@user/name/path.ext`, any MIME), and bootconf are all just blobs.
- **A `moduleVersion` record holds the file table** — `[{id, blob, mime, encoding, sha256}]` — plus the metadata the runtime needs to resolve imports and capabilities. The compiled `define()` body is *one* of those files (the one with `id="@user/name"`); we don't need a separate `cells[]` field unless we want cell-level structure for diff/UI, which a static analysis pass on the file body can produce on demand.
- **An `appVersion` record holds bootconf + the moduleVersion refs that compose the app** — equivalent to today's `bootconf.json` + the set of modules in the HTML.

A possible refinement (defer): `app.lopecode.cell` records for cell-level diff/discussion. Natural fit for the pairing channel's `define_cell` granularity. Not needed for v0 — cell structure can be derived from the module source on read.

## Lexicons (initial set)

### `app.lopecode.module` (lineage, mutable)
- `title`, `description`, `tags[]`
- `maintainers[]` (DIDs)
- `forkedFrom?` (strong ref to another `app.lopecode.module`)
- `head?` (strong ref to current `app.lopecode.moduleVersion`)
- `legacyName?` (e.g. `@tomlarkworthy/foo`, for migration aliasing)

### `app.lopecode.moduleVersion` (immutable)
- `module` (strong ref to lineage)
- `parents[]` (prior versions; usually one, `[]` for genesis)
- `files[]` — `[{id, blob, mime, encoding, sha256}]`. `id="@user/name"` with `mime="application/javascript"` is the module source itself; other entries are module-scoped attachments. Mirrors today's in-HTML script-tag table 1:1.
- `imports[]` — declared dependencies on other module versions: `[{alias, module, version, cells?: string[]}]`. Drives the importShim's resolution.
- `entrypoints?` — names of cells intended for external import (informational; auto-derivable).
- `capabilities` — see "Capability model"
- `changelog?`
- `derivedExport?` — optional CID of an exported single-file HTML for cheap delivery

### `app.lopecode.app` (lineage, mutable)
Same shape as `app.lopecode.module` but for compositions.

### `app.lopecode.appVersion` (immutable)
- `app` (strong ref to lineage)
- `parents[]`
- `modules[]` — `[{alias, module, version}]`, the moduleVersion refs that make up the composition. The subset listed in bootconf `mains` boot eagerly; the rest are reachable via import.
- `bootconf` — `{mains[], hash, headless, ...}` matching today's `bootconf.json` shape
- `files[]` — app-local files (icons, app-specific assets) in the same `[{id, blob, mime, encoding, sha256}]` shape as moduleVersion
- `derivedExport?` — CID of single-file HTML

### Deferred
- `app.lopecode.patch` — proposed change to a moduleVersion. Not needed until forks-with-merge become real; the bot was right to defer.
- `app.lopecode.cell` — per-cell records. Only if cell-level discussion/diff becomes a UX requirement.

## Identity migration

This is concrete enough that it needs to be called out:

- Today's namespace is `@user/notebook`. ATProto identity is `did:plc:.../app.lopecode.module/<rkey>`.
- Existing notebooks and their inter-module imports (`import {x} from "@tomlarkworthy/foo"`) need a resolution path that doesn't break overnight.
- Proposal: `app.lopecode.module` carries `legacyName`; the runtime's import resolver checks `legacyName` first when seeing `@tomlarkworthy/foo`, then falls back to whatever the lineage's current head is. After migration, the import shim can be rewritten to use atproto refs directly.

This means **the import shim has to change**. Today `importShim` resolves `@user/notebook` against a lookup table populated at boot. Tomorrow it has to resolve module+version refs to either an embedded define or a fetched blob.

## Dependency resolution at runtime

The Observable runtime currently imports modules eagerly via `mains` or lazily via `import` statements inside cells. With versioned dependencies, resolution becomes:

1. Look up the alias in the current module version's `imports[]`.
2. Resolve to a specific moduleVersion CID.
3. If the moduleVersion's `cells`/`cellsBlob` is available locally (embedded in the bundle), execute its `define()`.
4. Otherwise fetch the blob from a runtime gateway (see "Asset gateway" below) and execute.
5. Fail closed if capabilities don't permit fetching, or if hash verification fails.

A bundle (single-file HTML export) embeds the transitive closure of moduleVersions and files at export time, so it stays portable and offline-runnable. The reader-without-bundle case fetches lazily.

## Capability model

Lopecode already intercepts `fetch`, `XMLHttpRequest`, and ES module imports via `lopecode-internal-networking.md`. That's the lever. Each `moduleVersion` declares:

- `network: { fetch?: ["allowlist..."], "*"?: false }`
- `storage: { localStorage?: bool, indexedDB?: bool }`
- `dom: { topLevel?: bool, iframe?: bool }`
- `publish: { atproto?: bool }` — can this module write to the user's PDS?
- `embed: { allowedParents?: string[] }`

Reader defaults: no ambient publish, no top-level fetch, no parent DOM. Capabilities are explicitly granted per-module by the running app or by user prompt. Versioned: a new moduleVersion that *expands* capabilities surfaces a "capability change" event in the dependency-update feed and requires explicit re-grant.

This is one of the more important parts of the design: without it, a remixable code-sharing fabric is also a malware substrate.

## Social model

### Primitives
- publish module / version, fork module, publish app / version, follow person / module / app, comment on lineage or version, lineage browse, dependency / dependents browse, remix (= fork + repoint).

### Graphs the indexer maintains
- follow, fork, dependency (forward), dependents (reverse), module-to-app usage, version-adoption-over-time.

The bot's "three feeds" sketch (home / dependency-updates / discovery) is fine but speculative; concrete UI shape is out of scope for v0 and will fall out of what the indexer makes cheap.

## Bluesky reuse

Realistic reuse picture:

**Free**: identity, handles, OAuth, PDS writes, blobs, account follows, posts/likes/replies, custom feed generators.

**Not free**: Bluesky clients won't render `app.lopecode.*` lexicons natively; "follow this module" and "dependency update" semantics live in our app, not theirs.

**Bridge strategy**: when a user publishes/forks/upgrades, optionally also create an `app.bsky.feed.post` linking back to the lopecode object. Custom feed generators can rank these. This gets us into the Bluesky follow graph and existing client UX without requiring Bluesky to understand our records.

## Services

1. **Web app / auth** — OAuth login, session, PDS writes, blob upload. Could be served from a thin worker.
2. **Indexer** — consume firehose / Tap / Jetstream filtered to `app.lopecode.*` (and optionally relevant `app.bsky.*` for the bridge). Compute the graphs above into Postgres or SQLite.
3. **Read API** — hydrate module/app/version pages, dependency trees, feeds, search. The "social brain" read side.
4. **Asset gateway / runtime bridge** — serve module bundles and blobs over HTTPS for the runtime importShim. ATProto blobs aren't browser-ready by themselves; this is where the Leaflet-thread point lands. A small CDN-fronted worker that resolves `did + cid → bytes` is enough for v0.
5. *(optional)* **Bluesky bridge worker** — emit companion posts on publish events.
6. *(optional)* **Custom feed generator** — installable Bluesky feeds for lopecode activity.

We do **not** build a full AppView, a custom relay, or a custom client at start. Indexer + read API + asset gateway is the v0 server footprint.

## Reader as a lopecode document

The reader/editor itself should be a lopecode notebook — dogfooding, self-hosting, remixable. This is *already true*: the bootloader, lopepage, exporter, and editor are all notebook modules today. What changes is that the reader needs new modules for atproto auth, PDS writes, and an importShim that resolves atproto refs.

Keep three roles distinct:
- **reader source** (the editable notebook lineage)
- **reader pinned snapshot** (a specific moduleVersion the platform recommends)
- **reader portable export** (the single-file HTML that runs offline)

Don't bootstrap from the mutable head — pin to a known-good snapshot.

## What we have today that maps cleanly

| Spec concept | Existing piece |
|---|---|
| Single-file export | `@tomlarkworthy/exporter` (`module-exporter-runtime-self-serialization.md`) |
| Multi-module composition | `@tomlarkworthy/lopepage` + bootconf hash DSL |
| Live cell edit (authoring surface) | Pairing channel + MCP tools |
| Files → blobs (uniform mapping) | `<script id="..." type="text/plain" data-mime data-encoding>` ↔ atproto blob |
| Module source as a file | `<script id="@user/name" data-mime="application/javascript">` ↔ blob in `moduleVersion.files[]` |
| Network/import interception | `knowledge/lopecode-internal-networking.md` |
| Bluesky read example | `@tomlarkworthy/atproto-comments` (read-only thread fetch — proof the runtime can talk to ATProto APIs) |
| Module identity | Currently `@user/notebook` — needs `legacyName` aliasing for migration |

## What is genuinely new

- atproto OAuth + PDS write path inside the runtime (capability-gated)
- importShim resolution against `(did, lexicon, rkey, version)` instead of `@user/notebook`
- a "publish to PDS" flow that walks the in-HTML file table and writes each file as a blob, then composes the moduleVersion/appVersion record. This is the substrate-mode replacement for jumpgate; jumpgate itself goes away.
- the indexer + read API
- asset gateway
- capability declaration + enforcement (foundation exists, surface API doesn't)

## v0 MVP: a single notebook that publishes and reads lopebooks by DID

The smallest thing that proves the whole stack: one lopecode notebook, three cells, no server-side anything, no indexer. Run it from a `file://` URL, paste a Bluesky handle + app password, publish the running notebook (or another `.html` file) to your PDS, fetch one back by `at://` URI and run it.

### Auth: app passwords

ATProto OAuth requires a public HTTPS `client_id` metadata URL and accepts only registered redirect URIs — `file://` origins are excluded by every reasonable OAuth implementation, and browsers won't honor `file://` as a redirect target. The two ways to get OAuth working from a `file://` notebook both require infra first (hosted client metadata + a loopback or hosted callback that pipes tokens back via `postMessage`). Defer.

App passwords are the file://-friendly path:
- User creates one in Bluesky settings → pastes handle + app-password into the notebook.
- `POST {pds}/xrpc/com.atproto.server.createSession` returns `{accessJwt, refreshJwt, did}`.
- `localStorage` persists tokens across reloads (scoped per file path on file://).
- Real PDS write permissions, including `uploadBlob` and `createRecord`. Revocable independently of main credentials.

Tradeoff: app passwords carry broader scope than fine-grained OAuth scopes will eventually offer. Acceptable for v0; migrate when OAuth infra is worth standing up.

### Lexicon: `dev.lopecode.bundle` only

Skip the four-lexicon model for v0. One record type:

```
{
  $type: "dev.lopecode.bundle",
  name: "blank-notebook",
  title: "Blank notebook",
  description?: "...",
  files: [
    { id: "@tomlarkworthy/blank-notebook", mime: "application/javascript", encoding: "text", blob: <ref>, sha256: "..." },
    { id: "@tomlarkworthy/blank-notebook/preview.png", mime: "image/png", encoding: "base64", blob: <ref>, sha256: "..." },
    { id: "bootconf.json", mime: "application/json", encoding: "text", blob: <ref>, sha256: "..." },
    ...
  ],
  createdAt: "..."
}
```

The `files[]` shape is identical to what we want long-term in `moduleVersion`/`appVersion` (`{id, mime, encoding, blob, sha256}`). When we eventually split into per-module records, this v0 lexicon either gets retired or kept as a "whole-notebook snapshot" alongside.

Reference shape: `at://{did}/dev.lopecode.bundle/{rkey}` is the addressable identity.

### Content-addressed publish

Sizing reality check: across all 39 published notebooks (2,979 script blocks), the largest individual block is 0.32MB — well under the 1MB blob limit. p99 is 0.32MB, median 7KB. Per-file blobs work; per-notebook single-blob doesn't.

Better still: blobs are content-addressed (CID v1, raw codec, SHA-256), and a blob already in a repo gets re-referenced by new records — no re-upload, the existing blob stays pinned. So:

1. For each `<script id data-mime>` block, compute the CID client-side (`crypto.subtle.digest('SHA-256', bytes)` + CID v1 wrap). One tiny WebCrypto call per file.
2. Diff against CIDs already in the user's repo:
   - **Cheap path** (v0): keep a `localStorage` set of CIDs we've ever uploaded from this device. Upload only the misses.
   - **Authoritative path** (later): page through `com.atproto.sync.listBlobs?did={did}` once on session start, cache the set.
3. `uploadBlob` only the new CIDs.
4. Record's `files[]` references all CIDs (new + existing) by content hash.

First publish of a fresh notebook: ~75 uploads (one-time, seconds). Edit one cell in one module → republish: **1 upload**, plus the record write. This is the user's insight: most edits touch a single module, and CID dedup makes everything else free.

Store both the PDS-returned blob ref *and* the locally-computed `sha256` (or full CID) in the `files[]` entry. The PDS ref already carries the CID, so this is no extra storage — it just makes future-publish diffing trivial.

### The notebook: three cells doing real work

1. **Login cell**
   - `viewof creds = Inputs.form({handle, appPassword})` + button.
   - Resolve handle → DID via `com.atproto.identity.resolveHandle` (any AppView, e.g. `public.api.bsky.app`).
   - Discover PDS via `https://plc.directory/{did}` (or `com.atproto.repo.describeRepo`).
   - `com.atproto.server.createSession` → `{did, pds, accessJwt, refreshJwt}` to localStorage.
   - Output: a `session` value other cells depend on.

2. **Publish cell**
   - Input: drag-and-drop a `.html` file, *or* the current notebook's own `document.documentElement.outerHTML`.
   - Walk `document.querySelectorAll('script[data-mime]')` → `{id, mime, encoding, bytes}` table.
   - Compute CID for each, diff against known set, `uploadBlob` the misses.
   - Build `files[]` table, `createRecord` with `collection: "dev.lopecode.bundle"`.
   - Output: the `at://` URI + copy-to-clipboard.

3. **Fetch / view cell**
   - Input: an `at://...` URI or `{did, rkey}`.
   - `com.atproto.repo.getRecord` (no auth needed; PDS records are public-readable).
   - `com.atproto.sync.getBlob?did={did}&cid={cid}` for each file.
   - Reconstruct HTML: emit `<script id={id} type="text/plain" data-mime={mime} data-encoding={encoding}>...</script>` blocks plus the bootloader stub, render via `<iframe srcdoc>` or download.

### Implementation gotchas

- **Bootloader script.** The executable `<script>` at the top of a lopebook isn't a `data-mime` block — it's inline JS. The reconstructor needs a known-good bootloader template. Easiest for v0: treat the bootloader as part of the runtime, hardcoded in the fetch cell, not part of the bundle.
- **PDS endpoint discovery.** Wrap `resolvePds(handleOrDid)` as one cell so login + fetch can share it.
- **Upload concurrency.** ~75 sequential `uploadBlob` calls is sluggish. Cap at 4–8 concurrent. Show progress.

### What v0 deliberately does not do

- No indexer, no read API, no asset gateway. Direct PDS access only. Discoverability = "share an `at://` URI."
- No `module` / `moduleVersion` / `app` / `appVersion` split. Whole-notebook snapshots only.
- No capability declaration. Whatever the bundle was authored to do, runs.
- No OAuth.
- No fork lineage, no `parents[]`. Republish creates a new record with a new rkey.
- No companion Bluesky post.
- No importShim rewrite — existing `@user/notebook` resolution stays exactly as it is. The fetched bundle runs because it has the same script-tag structure as a normal lopebook.

This MVP fits inside the long-term lexicon plan: the v0 `files[]` shape is the same shape `moduleVersion.files[]` wants. Splitting one bundle into per-module records later is a refactor of the *publishing* code, not a re-encoding of stored bytes — every blob already in the repo stays exactly where it is.

## Bootstrap plan (after v0)

**Phase 0 — substrate**
1. Lock the four lexicons (`app.lopecode.module`, `app.lopecode.moduleVersion`, `app.lopecode.app`, `app.lopecode.appVersion`).
2. Stand up an indexer (Jetstream / Tap → SQLite) and a read API for module/version/app/appVersion lookup, dependency, dependents.
3. Stand up an asset gateway (`/blob/:did/:cid`).

**Phase 1 — write path**
4. atproto OAuth + PDS write helpers as a lopecode module.
5. A "publish module version" flow that walks the running notebook's file table and writes the `app.lopecode.moduleVersion` record. Reuses the v0 publish code; just splits files into per-module groups.
6. A "publish app version" flow that snapshots a composition (bootconf + module refs + app-local files).

**Phase 2 — runtime resolution**
7. Rewrite importShim to resolve atproto refs, with `legacyName` fallback for `@user/notebook`.
8. Capability declaration on moduleVersion, capability enforcement at the network/import boundary.

**Phase 3 — social**
9. Module/app pages (overview, versions, dependencies, dependents, forks, discussion).
10. Follows, comments, fork lineage.
11. Optional Bluesky companion posts and custom feed generator.

**Defer until justified**
- patches, merges, cell-level records, full AppView, custom relay, full moderation stack, ambitious live-collab on top of pairing channel.

## Open questions

- **Migration of existing notebooks.** Concrete plan to mint lineages for current `@tomlarkworthy/*` modules and pre-populate v0 from current head. One-off script over the existing HTML bundles vs. lazy on-demand mint at first publish? Either way, this is a one-way migration — Observable is not in the loop afterward.
- **Dependency upgrade UX.** When `@a/b` publishes a new `moduleVersion`, what triggers the update in apps that depend on it? Automatic floating heads (against the rule above) vs. notify-and-let-author-bump?
- **Cell-level records.** Worth introducing now (cleaner pairing-channel mapping, finer-grained discussion) or strictly deferred?
- **Single-file export storage.** Is `derivedExport` a blob on the version record, a separate `app.lopecode.export` record, or recomputed on demand by the asset gateway?
- **`dev` vs `app` namespace.** v0 settled on `dev.lopecode.bundle` (experimental lexicon namespace per atproto convention). Long-term lexicons in this doc use `app.lopecode.*` per the same convention; lock the boundary between `dev` (in-flight) and `app` (stable) before the first `app.lopecode.*` record is written.

## The core insight (preserved from the sketch)

- **modules** are the reusable social building blocks
- **apps** are compositions over modules, not "apps that own code"
- **exports** are derived portable artifacts, not the canonical source of truth
- **ATProto** is the data + identity substrate; not web hosting
- **the social experience** emerges from indexing, lineage, feeds, and dependency-aware UI — not from Bluesky understanding our records natively
