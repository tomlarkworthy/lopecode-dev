# Lopecode on ATProto

Status: draft / exploratory. Refining a sketch authored without knowledge of the codebase against what actually exists today.

## Milestones

- **2026-04-26 — First light.** First lopebook published to atproto via the v0 prototype (then named lopefeed): `at://did:plc:j7nm3lrd5h7fm3sfhcv3lhfv/dev.lope.bundle/3mkg4yuxhir27` (under the original `dev.lope.bundle` lexicon, since renamed to `dev.lopecode.bundle`). App-password auth, content-addressed file table, single-record bundle. Round-trip publish path proven end-to-end against a real PDS.
- **2026-04-30 — v0 shipped.** `@tomlarkworthy/at-write` (publisher) + `@tomlarkworthy/at-read` (reader) + `@tomlarkworthy/atproto` (headline + shared helpers), all in `lopecode/notebooks/atproto.html`. at-read renders bundles in a sandboxed iframe (`allow-scripts`, opaque origin) using exporter-3's pure `lopebook(blocks, …)` template — same composition code as the export pipeline. Token refresh (401 + 400 ExpiredToken), CID delta uploads, IndexedDB cache, plc.directory + did:web resolve.

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

This is not "add atproto on top." It is another transmission mediuem, Observable, local-file, static site and now atproto all can carry the same notebook code.
>
> **Proposed: lopecode is file-first and standalone, optionally distributed via atproto** (or another substrate). Authoring happens against local HTML files or PDS-backed records. 

Two distribution modes coexist post-migration:

1. **Standalone file** — a single HTML is the unit. Edit it, re-export via the existing exporter, ship it. No server, no network. This is what lopecode already does well; we just stop treating it as a derived artifact of Observable.
2. **ATProto-distributed** — modules and apps live as records + blobs in user PDSes. An indexer turns them into feeds, dependency views, forks, etc. Bundles can still be exported for portability.

The substrate-swap part of this document covers mode 2. Mode 1 is preserved as a first-class path; everything below should be readable as "atproto adds a distribution layer to a system that already runs fine from a single file."

## Object model

### One record type: `com.lopecode.bundle`

A *bundle* is the protocol-level unit: a file table + bootloader entry. A *notebook* is one UX over a bundle (lopepage as the userspace shell — a multi-module layout with cells and inputs). Bundles can boot into other UXes too: a single-page app, a CLI-style tool, a game. Schema is the bundle, not the notebook.

Each publish writes one immutable bundle record; the `rkey` is the version. Whether the bundle is consumed as a library (someone imports a module from inside it) or as a standalone runnable thing (booted via whatever userspace shell its bootconf points at) is a *consumption* choice, not a *publish* choice — same record either way.

### Granularity

Because lopecode already represents everything as files, the mapping to atproto is direct:

- **One `<script id data-mime>` block → one atproto blob.** Identity (`id`), MIME, and bytes round-trip with no transformation. Modules (`@user/name`, `application/javascript`), module-scoped attachments (`@user/name/path.ext`, any MIME), and bootconf are all just blobs.
- **A bundle record holds the file table** — `[{id, encoding, blob}]`, where `blob` is an atproto blob ref carrying CID + mimeType + size. This is the same shape v0 already ships.

That's the entire object model for v1.

## Lexicon: `com.lopecode.bundle` (immutable)

| Field | Type | Meaning |
|---|---|---|
| `$type` | string | always `"com.lopecode.bundle"` |
| `title` | string | human title (default: from exporter-3's `notebook_title`) |
| `files` | array | one entry per `<script id data-mime>` block |
| `createdAt` | datetime | ISO 8601 |

Each `files[]` entry:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | script tag id, e.g. `@user/module`, `@user/module/asset.png`, `bootconf.json` |
| `encoding` | string | `"text"` or `"base64"` from `data-encoding` |
| `blob` | blob | atproto blob ref — CID (v1 raw + sha-256), mimeType, size |

Identical to v0's `dev.lopecode.bundle` shape. The rename is the only schema change.

## Deferred (v2+)

The early sketch had four lexicons (`module` + `moduleVersion` + `app` + `appVersion`) for cross-notebook module reuse with mutable lineages and immutable versions. v1 doesn't need any of that — every publish is a fresh record, every `at://` URI is a stable address, dependencies are resolved at *publish time* by inlining (the file table is the transitive closure).

Three things that would justify revisiting:

- **Cross-notebook module reuse** — if many notebooks want to import the same module without duplicating its bytes. Then: split modules into their own records, addressed by CID; notebooks reference them.
- **Mutable "follow this thing across versions"** — if users want to subscribe to a notebook's updates, not just one rkey. Then: a separate lineage record (`com.lopecode.line`?) with a `head` ref. For now, "follow the author on Bluesky" covers this socially.
- **Per-cell records** — for cell-level diff / discussion / live editing. Natural fit for the pairing channel's `define_cell` granularity. Defer until UX demands it.

Until then, the simpler model wins: one notebook per publish, addressed by `at://{did}/com.lopecode.bundle/{rkey}`.

## Capability model (deferred)

Untrusted bundles need to declare what they intend to do — `network: { fetch: [...] }`, `storage`, `dom`, `publish`, `embed` — so at-read can enforce a permission summary before booting the iframe. Today's at-read uses a blanket `sandbox="allow-scripts"`; capability metadata makes that a fine-grained ask. Worth landing in v1 as a small at-read change once the field is decided. Open question is in "v1 plan" below.

## Bluesky reuse

Realistic reuse picture:

**Free**: identity, handles, OAuth, PDS writes, blobs, account follows, posts/likes/replies, custom feed generators.

**Not free**: Bluesky clients won't render `com.lopecode.*` lexicons natively; "follow this module" and "dependency update" semantics live in our app, not theirs.

**Bridge strategy**: when a user publishes/forks/upgrades, optionally also create an `app.bsky.feed.post` linking back to the lopecode object. Custom feed generators can rank these. This gets us into the Bluesky follow graph and existing client UX without requiring Bluesky to understand our records.

## Services

1. **Web app / auth** — OAuth login, session, PDS writes, blob upload. Could be served from a thin worker.
2. **Indexer** — consume firehose / Tap / Jetstream filtered to `com.lopecode.*` (and optionally relevant `app.bsky.*` for the bridge). Compute the graphs above into Postgres or SQLite.
3. **Read API** — hydrate module/app/version pages, dependency trees, feeds, search. The "social brain" read side.
4. **Asset gateway / runtime bridge** — serve module bundles and blobs over HTTPS for the runtime importShim. ATProto blobs aren't browser-ready by themselves; this is where the Leaflet-thread point lands. A small CDN-fronted worker that resolves `did + cid → bytes` is enough for v0.
5. *(optional)* **Bluesky bridge worker** — emit companion posts on publish events.
6. *(optional)* **Custom feed generator** — installable Bluesky feeds for lopecode activity.

We do **not** build a full AppView, a custom relay, or a custom client at start. Indexer + read API + asset gateway is the v0 server footprint.

## What we have today that maps cleanly

| Spec concept | Existing piece |
|---|---|
| Single-file export | `@tomlarkworthy/exporter-3` |
| Multi-module composition | `@tomlarkworthy/lopepage` + bootconf hash DSL |
| Live cell edit (authoring surface) | Pairing channel + MCP tools |
| Files → blobs (uniform mapping) | `<script id="..." type="text/plain" data-mime data-encoding>` ↔ atproto blob in `notebook.files[]` |
| Network/import interception | `knowledge/lopecode-internal-networking.md` |
| Reader is itself a lopecode notebook | `@tomlarkworthy/at-read` runs in the same iframe pattern it serves to readers |

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

### Lexicon: `dev.lopecode.bundle`

One record type. `files[]` shape: `{id, encoding, blob}` — atproto blob ref carries CID + mimeType + size.

Reference shape: `at://{did}/dev.lopecode.bundle/{rkey}` is the addressable identity. (v1 renames the collection to `com.lopecode.bundle`; the field shape doesn't change.)

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

- No indexer, no read API. Direct PDS access only. Discoverability = "share an `at://` URI."
- No capability declaration. Whatever the notebook was authored to do, runs (within `sandbox="allow-scripts"`).
- No OAuth.
- No fork lineage. Republish creates a new record with a new rkey.
- No companion Bluesky post.
- No importShim rewrite — existing `@user/notebook` resolution stays exactly as it is. The fetched notebook runs because it has the same script-tag structure as a normal lopebook.

v0's `files[]` shape carries forward verbatim into v1's `com.lopecode.bundle` — only the collection name changes.

## v1 plan

v0 proved publish/fetch/render between two endpoints holding the same `at://` URI. v1 makes a published lopebook **shareable, discoverable, and visible to the existing Bluesky social graph** — without inventing a parallel social network.

### What v1 delivers

1. Settled `com.lopecode.bundle` lexicon (we own lopecode.com).
2. Public web proxy per author at `did-….lopecode.com/r/:rkey` (with a flat `lopecode.com/r/:did/:rkey` redirect for embed-card compatibility).
3. Public profile page per author (`lopecode.com/@:handle`) listing their bundles.
4. Companion Bluesky post on every publish — bundle appears in the author's Bluesky timeline + reachable by Bluesky followers.
5. Custom Bluesky feed (`app.bsky.feed.generator`) surfacing recent lopecode bundles for browse/discovery.
6. `site.standard.document` sidecar so bundles surface in the standard.site reader ecosystem (a long-form publishing community lexicon).

Out of scope: module/moduleVersion split, capability enforcement, custom non-Bluesky notifications, OAuth.

### Records written per publish

| Record | Owner | Purpose |
|---|---|---|
| `com.lopecode.bundle` | author's PDS | canonical artifact — the file table the user just published. Renamed from v0's `dev.lopecode.bundle`; same `files[]` shape. |
| `app.bsky.feed.post` | author's PDS | companion post — `app.bsky.embed.external` linking to `https://did-….lopecode.com/r/:rkey`. Drives Bluesky reach (timeline, replies, reposts, native notifications). |
| `site.standard.document` | author's PDS | editorial sidecar — `bskyPostRef` to the companion post, `content` union member `com.lopecode.runtime` referencing the bundle's `at://` URI. Drives reach into the standard.site ecosystem. |

Three writes per publish (small, parallel). The bundle is canonical; the other two are sidecars. After `createRecord` succeeds at-write also calls Contrail's `notify(at://…/com.lopecode.bundle/:rkey)` so the bundle is queryable in the discovery feed immediately, instead of waiting for the next 1-minute Jetstream cycle.

### `lopecode.com` on Cloudflare

We own `lopecode.com`. Stand it up on Cloudflare:

- **Cloudflare Pages** for static surfaces (profile pages, OAuth client metadata + callback page).
- **Cloudflare Worker on `*.lopecode.com`** for the web proxy — wildcard subdomain per encoded DID, serves bundles at their own origin.
- **[Contrail](https://github.com/flo-bit/contrail)** for the indexer/view layer — collection declarations, Jetstream ingestion + backfill, typed XRPC, all running on Workers + D1. Vendored as `vendor/contrail` so the deploy is reproducible from a known-good commit.
- A small **feed-generator Worker** that calls Contrail's typed read endpoint and signs the response.
- **DNS TXT** record `_atproto.lopecode.com` for atproto-side identity (lexicon publication, feed-generator DID).

Why Contrail rather than rolling our own Jetstream listener:

- Handles subscription, cursor, retry, backfill, and collection filtering — we'd otherwise hand-write ~150 lines of Worker code for the same.
- Generates typed XRPC endpoints from collection declarations; profile-page enrichment (`listBundlesByDid`) and any future read views (dependency graph, watches) fall out without extra services.
- Backfill matters: raw Jetstream is forward-only, so a freshly stood-up indexer can't see any bundles published before it started. Contrail walks history.
- Cloudflare-native (Workers + D1) — same target we wanted anyway.

Trade-off: Contrail is pre-alpha; pin a known-good commit. If it ever goes away we re-implement against raw Jetstream — the lexicon and the feed-generator interface don't change.

#### Repository

Source lives in [tomlarkworthy/lopecode.com](https://github.com/tomlarkworthy/lopecode.com), wired into this repo as the `lopecode.com/` submodule. Layout:

```
lopecode.com/
├── pages/                       # Cloudflare Pages app (apex lopecode.com)
│   ├── public/
│   │   ├── @[handle].html       # /@:handle profile page
│   │   ├── r/index.html         # legacy /r/:did/:rkey URL — 302 to did-….lopecode.com
│   │   └── oauth/
│   │       ├── client.json      # atproto OAuth client metadata
│   │       └── callback.html    # postMessages tokens to the opener
│   └── _routes.json
├── workers/
│   ├── proxy/                   # web proxy: wildcard *.lopecode.com
│   │   ├── src/index.ts         # decode Host → DID, fetch bundle, serve HTML
│   │   └── wrangler.toml        # route: *.lopecode.com/*
│   └── feed/                    # app.bsky.feed.generator
│       ├── src/index.ts         # getFeedSkeleton + describeFeedGenerator
│       └── wrangler.toml        # route: feed.lopecode.com
├── contrail/                    # Contrail collection declarations + config
│   ├── src/contrail.config.ts   # collections + feeds (see "Contrail config" below)
│   ├── src/worker.ts            # createWorker(config, { lexicons })
│   └── wrangler.jsonc           # D1 binding + cron */1 * * * *
├── lexicons/                    # com.lopecode.* lexicon JSONs (canonical)
│   └── com.lopecode.bundle.json
├── package.json                 # workspace root, bun
└── README.md
```

#### Contrail config

The whole indexer is a config object. From the docs:

```ts
// contrail/src/contrail.config.ts
import type { ContrailConfig } from "@atmo-dev/contrail";

export const config: ContrailConfig = {
  namespace: "com.lopecode",
  collections: {
    bundle: {
      collection: "com.lopecode.bundle",
      queryable: { createdAt: { type: "range" } },  // ?createdAtMin=...
      searchable: ["title"],                         // FTS5 on D1
    },
    follow: { collection: "app.bsky.graph.follow" }, // for the personalized feed
  },
  feeds: {
    timeline: {
      follow: "follow",            // bundles by people the viewer follows on Bluesky
      targets: ["bundle"],
      maxItems: 500,
    },
  },
};
```

What this gives us out of the box:

- `GET /xrpc/com.lopecode.bundle.listRecords?sort=-createdAt&limit=50` — recency feed of every published bundle. Powers the global "what's new" view.
- `?search=foo` — FTS5 title search across the whole network.
- `?did=did:plc:...` — bundles by a specific author. Powers `lopecode.com/@:handle`.
- `GET /xrpc/com.lopecode.getFeed?feed=timeline&actor=<did>` — bundles by people the viewer follows on Bluesky, fanned out at write time. Reuses existing `app.bsky.graph.follow` records — users don't need to follow lopecode authors twice.

Three operational hooks:

- **Backfill** (`pnpm contrail backfill --remote`) — one-shot historical pull on first deploy. Without it, freshly stood-up indexers can't see bundles published before the cron started.
- **Cron `ingest()`** (1-minute fire) — keeps the index fresh from Jetstream. Already a Worker fit.
- **`notify(uri)`** — at-write calls this synchronously after `com.atproto.repo.createRecord`. Bundle becomes queryable in the feed immediately instead of up-to-60-seconds later.

#### Deployment

- **Pages** (`pages/`) → `lopecode.com` apex via Cloudflare Pages, deployed on push to `main`.
- **Contrail Worker** (`contrail/`) → `wrangler deploy` against the contrail config above; uses `vendor/contrail`'s npm package. Owns its own D1 (binding `DB`); we never write SQL by hand.
- **Feed Worker** (`workers/feed`) → `wrangler deploy`. Public route `feed.lopecode.com`. Calls Contrail's `listRecords` (or `getFeed` for personalized) and reshapes the response into the `app.bsky.feed.generator` skeleton format. Trivial: ~30 lines.
- **Secrets**: feed-generator signing key in `wrangler secret` (used to sign feed skeletons). The OAuth surface needs no secret — `client.json` is public; the callback handles a public-client flow.
- **DNS**: `lopecode.com` → Pages; `feed.lopecode.com` → feed Worker; `contrail.lopecode.com` (or just an internal route) → Contrail Worker; `_atproto.lopecode.com` TXT for atproto identity.

### Server components

Three static surfaces (no per-user state) and two dynamic ones:

| # | What | How |
|---|---|---|
| 1 | **Web proxy** `did-plc-….lopecode.com/r/:rkey` (with `lopecode.com/r/:did/:rkey` redirecting to it) | Wildcard-subdomain Worker; resolves DID → bundle, serves it directly at a per-DID origin. **Top-level navigation, no sandbox.** This is the surface for non-atmosphere visitors arriving via Bluesky embed cards / plain web links / RSS — the bundle behaves like a normal webpage (storage, bookmarks, real fetch). Distinct from the in-notebook reader, which stays sandboxed. |
| 2 | **Profile page** `lopecode.com/@:handle` | Static HTML; resolves handle → DID, then either `com.atproto.repo.listRecords` directly or Contrail's `listBundlesByDid` XRPC. Pure client-side, no server state. |
| 3 | **OAuth surface** `lopecode.com/oauth/client.json`, `/oauth/callback` | Static metadata + a callback page that postMessages tokens to the originating notebook. See "Auth" below. |
| 4 | **Indexer** | [Contrail](https://github.com/flo-bit/contrail) on Workers + D1, vendored at `vendor/contrail`. One `contrail.config.ts` declares `com.lopecode.bundle` (recency + FTS title search) and a `timeline` feed over `app.bsky.graph.follow`. Contrail handles Jetstream + backfill + typed XRPC. |
| 5 | **Feed generator** | Cloudflare Worker implementing the `app.bsky.feed.generator` XRPCs (`getFeedSkeleton`, `describeFeedGenerator`). Wraps Contrail: a *new-bundles* feed (recency `listRecords`) and a *personalized* feed (Contrail's `getFeed?actor=…` for the viewer). Both signed and registered under the lopecode.com DID. |

That's it. Nothing else needs to live server-side for v1.

### Two read surfaces

A bundle is read in one of two contexts, each with its own origin model and its own threat shape:

| | In-notebook reader | Web proxy |
|---|---|---|
| Where | `at-read` inside any lopecode notebook | `did-plc-….lopecode.com/r/:rkey` |
| Audience | Atmosphere-native — surfing across many bundles | Non-atmosphere visitors landing via Bluesky / RSS / plain web |
| Iframe origin | `blob:null/...` (built locally) | per-DID subdomain on `lopecode.com` |
| Sandbox | `allow-scripts` (no storage, blocks UX hijacking) | none (it's a top-level navigation, not embedded) |
| Storage | none — surfing only, not committing to run | works — bundle is a "real tool" for the visitor |
| Fetches via | direct PDS / AppView | Worker resolves the bundle, serves the HTML |

The web proxy is bootstrap infrastructure for the open web. Atmosphere-native users never need to hit it; their surfing happens in-notebook against PDSes directly.

### Auth

atproto OAuth requires a fetchable `client_metadata.json` whose URL matches the registered `client_id`. `file://` and `blob:` origins (where lopecode notebooks run) aren't fetchable, so the PDS can't validate them as OAuth clients. The notebook itself can never participate in the OAuth dance.

Two-tier model:

- **v0 / fallback: app passwords.** at-write already works this way; documented limitation. Keep this path forever — it works offline, no `lopecode.com` dependency.
- **v1: OAuth via `lopecode.com`.** Hosted `client_metadata.json` at `https://lopecode.com/oauth/client.json`. The notebook opens a popup at `https://lopecode.com/oauth/start?…`; that page runs the full atproto OAuth flow against the user's PDS, lands at `https://lopecode.com/oauth/callback`, and `postMessage`s the resulting access/refresh JWTs back to the opener. The notebook stores them in `localStorage` (same shape as the app-password session today). Token refresh remains the notebook's job. The lopecode.com side is stateless — it's a relay, not a session store.

Either auth path produces the same session shape (`{accessJwt, refreshJwt, did, pds}`); at-write's xrpc helper doesn't care which one minted it.

### Lexicon migration

v0's handful of `dev.lopecode.bundle` records on chain are abandoned in place — no migration. They were experiments. v1 publishes to `com.lopecode.bundle` (same `files[]` shape; the rename is the only schema change). at-read can keep accepting `dev.lopecode.bundle` for posterity if the historical records matter, but the discovery feed only indexes `com.lopecode.bundle`.

### Sidecar discipline

Following [the official threadgate / Bluesky-extension guidance](https://docs.bsky.app/blog/posts/wishful-fields): never extend `app.bsky.*` records with custom fields. Always write a separate record in our namespace alongside. Same `rkey` convention where it makes sense, so a fetcher can predict the sidecar URI.

### Trade-offs

- **Three writes per publish.** Each is small and parallel. Failure mode: bundle record can land while companion post or document fails — at-write should retry the sidecars but not block the bundle (canonical artifact is what matters).
- **Bluesky reach depends on a working web proxy.** If `*.lopecode.com` is down, embed cards break for non-atmosphere visitors. Atmosphere users are unaffected — the in-notebook reader doesn't go through `lopecode.com` at all.
- **Custom feed visibility depends on registration.** Feed generator must be published (its URI registered with `app.bsky.feed.generator` record) and discoverable; until users explicitly subscribe, only feed-curators see it.

### Open v1 questions

- **Capability metadata**: declare on `com.lopecode.bundle` (`{networkAccess, allowedOrigins, usesEval, ...}`)? Reader sandbox is currently blanket `allow-scripts`; capability declarations let us surface a permission summary before the iframe boots. Reasonable to land in v1; small at-read change.
- **Author profile shape**: pure derived view (live `listRecords`) is enough for v1, but eventually we'll want a `com.lopecode.profile` record (display name, avatar, pinned bundles) — or, more pragmatically, just reuse `app.bsky.actor.profile` with a per-author standard.site `publication` record carrying lopecode-specific bits.
- **Comments**: Bluesky replies on the companion post are the v1 answer. A per-bundle thread root that's *not* a Bluesky post is a v2 concern.

## v1.1: RSS bridge

After v1 ships, expose RSS feeds for "follow without joining atproto." Universal substrate — every feed reader supports it, every blog ecosystem expects it, no protocol negotiation.

Two endpoints, both Cloudflare Workers wrapping Contrail:

| Endpoint | Source |
|---|---|
| `lopecode.com/feed.xml` | Contrail `listRecords?sort=-createdAt&limit=50` — global recency feed |
| `lopecode.com/@:handle/feed.xml` | resolves handle → DID, then Contrail `listRecords?did=…&sort=-createdAt` — one author's notebooks |

Each `<item>`:

```xml
<item>
  <title>{notebook.title}</title>
  <link>https://lopecode.com/r/{did}/{rkey}</link>
  <guid isPermaLink="false">at://{did}/com.lopecode.bundle/{rkey}</guid>
  <pubDate>{notebook.createdAt}</pubDate>
  <description>{site.standard.document.summary || ""}</description>
</item>
```

`Cache-Control: public, max-age=300` so feed readers don't hammer Contrail. ~30 lines of Worker code per endpoint; one shared XML serializer.

Worth doing once v1's web proxy and indexer are stable. No new records, no new auth, no new lexicon — pure derived view over what v1 already produces.

## Core insight

- **a notebook** is the unit of publication; whether it's used as a library or an app is a consumption choice, not a publish choice
- **exports** (single-file HTML) are derived portable artifacts, not canonical
- **ATProto** is the data + identity substrate; not web hosting
- **the social experience** emerges from indexing, feeds, and the existing Bluesky follow graph — not from Bluesky understanding our records natively
