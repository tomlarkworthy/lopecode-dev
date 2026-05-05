# Lopecode on ATProto

Status: draft / exploratory. Refining a sketch authored without knowledge of the codebase against what actually exists today.

## Milestones

- **2026-04-26 — First light.** First lopebook published to atproto via the v0 prototype (then named lopefeed): `at://did:plc:j7nm3lrd5h7fm3sfhcv3lhfv/dev.lope.bundle/3mkg4yuxhir27` (under the original `dev.lope.bundle` lexicon, since renamed to `dev.lopecode.bundle`). App-password auth, content-addressed file table, single-record bundle. Round-trip publish path proven end-to-end against a real PDS.
- **2026-04-30 — v0 shipped.** `@tomlarkworthy/at-write` (publisher) + `@tomlarkworthy/at-read` (reader) + `@tomlarkworthy/atproto` (headline + shared helpers), all in `lopecode/notebooks/atproto.html`. at-read renders bundles in a sandboxed iframe (`allow-scripts`, opaque origin) using exporter-3's pure `lopebook(blocks, …)` template — same composition code as the export pipeline. Token refresh (401 + 400 ExpiredToken), CID delta uploads, IndexedDB cache, plc.directory + did:web resolve.
- **2026-05-02 — v1 web proxy live.** `lopecode.com` running on Cloudflare: apex Worker routes `*.lopecode.com/*`; `did-*-*.lopecode.com/r/:rkey` serves composed HTML at the per-DID origin (no iframe, no GitHub-Pages framing) via the `lopecode-render` service-bound Worker. Render path uses exporter-3's `lopebook` cell with the bundle's files emitted directly as `<script>` blocks — bundle is the byte-output of exporter-3's serializer, so re-running the full `book` pipeline was the wrong shape; `lopebook` is the chrome wrapper and that's the right seam. atproto blobs cached at the edge (CIDs are immutable). Contrail indexer at `contrail.lopecode.com` (D1-backed, jetstream cron) drives the homepage feed; on-demand backfill via `?actor=`. Skipped the spec's "Step 4 MVP" (302 to GitHub Pages) — went straight to the upgraded inline-render version.
- **2026-05-03 — OAuth + notify.** OAuth surface complete (`lopecode.com/oauth/{client.json,callback.html,relay/<state>}`); `@tomlarkworthy/atproto-login` runs PAR + PKCE + DPoP against the user's PDS, persists DPoP-bound `{accessJwt, refreshJwt, did, pds, dpopKey}` in IndexedDB. at-write fires fire-and-forget `notifyOfUpdate` to Contrail after every publish — bundles indexed within seconds rather than waiting for the 60s jetstream cron.
- **2026-05-03 — Ledger notebook + clean-URL profile.** `@lopecode/ledger` standalone notebook (`lopecode/notebooks/ledger.html`) implements the Ledger design: identity strip, deduped-by-CID stat ribbon, 12-week publish-cadence histogram (Plot.rectY), `Inputs.table` of bundles with web-preview links. Reactive on `location.pathname` (`/@handle`), `?handle=`, and `&did=` hash params via `Generators.observe`. Self-publishing: ships at-write + atproto-login + atproto + safe-local-storage in a 4-tab landing layout (`S100(ledger,module-selection,exporter-3,at-write)`); the user republishes the notebook from inside itself. Apex Worker proxies `lopecode.com/@:handle` through the render Worker for the published rkey (`LEDGER_RKEY` pinned in `lopecode.com/src/worker.js`), so the URL bar stays clean for bookmarking. Replaces the static `/profile` HTML stub from step 8.
- **2026-05-03 — Lopefeed homepage + PDS-direct downloads.** `@lopecode/lopefeed` standalone notebook (`lopecode/notebooks/lopefeed.html`) is the discovery feed (the design's "Edition") and is now served as the homepage at `lopecode.com/` via the apex Worker's `LOPEFEED_RKEY` pin. Editorial layout drives off Contrail's recency `listRecords`; per-bundle download buttons fetch the bundle **directly from the publisher's PDS** (plc.directory → `getRecord` → `getBlob` per-CID → `composeBundle()` reassembles the `<script id data-mime>` table + lopebook chrome client-side) — the lopecode.com render Worker is bypassed entirely for downloads, so authors' PDSes serve their own bytes and the central infra only renders. The shared download primitives (`composeBundle`, IndexedDB cache `idb`) were hoisted from `@tomlarkworthy/at-read` into `@tomlarkworthy/atproto`; at-read re-exports from atproto, lopefeed depends only on atproto.
- **2026-05-03 — Bluesky feed generator live.** `lopecode.com/feed/` Worker on `feed.lopecode.com` (service-binding-only; `did:web:feed.lopecode.com` resolved via `/.well-known/did.json`). Skeleton derives companion-post URIs from Contrail bundle URIs via the shared-rkey convention. Feed-generator record at `at://did:plc:a5yddar7vebmgjithmy4skj6/app.bsky.feed.generator/lopecode` under the `@trendingnotebooks.bsky.social` curatorial account. AppView reports `isOnline: true, isValid: true`; pinnable at `https://bsky.app/profile/trendingnotebooks.bsky.social/feed/lopecode`. Sparse for now (only one author has clicked Share); deferred next move is post-on-traction reposting via the bot — see step 14.
- **2026-05-04 — slug-rkey publish.** `@tomlarkworthy/at-write` switches from `createRecord` (TID rkey) to `putRecord` with `rkey = slugifyMain(bootconf.mains[0])` (`@tomlarkworthy/atproto` → `atproto`, `@lopecode/ledger` → `ledger`, etc.). `getRecord` precheck supplies `swapRecord` for CAS so concurrent edits can't silently overwrite. Companion `app.bsky.feed.post` shares the slug rkey and also uses `putRecord`, so re-Share replaces the prior post instead of minting duplicates. Share-text default trimmed to `"{title} published as a com.lopecode.bundle"` (URL is in the embed card already). Synced into all three self-publishing notebooks (atproto, ledger, lopefeed). Step 16 complete; step 15 (Manage Publishes UI for cleaning up legacy TID-rkey records) is now the cleanup surface for pre-existing duplicates.
- **2026-05-05 — identity is the title, not the main.** The 2026-05-04 rkey-from-`bootconf.mains[0]` rule fused publication identity with view-target choice — opening `@tomlarkworthy/atproto.html` against a different "main" view (e.g. `@tomlarkworthy/malleable`) still slugged to `atproto`, overwriting the wrong bundle. Switched at-write to `rkey = slugifyTitle(title)` (`utils.slugifyTitle` NFKD-strips non-ASCII, collapses non-rkey chars to `-`, trims, lowercases, caps at 64 chars). The bundle's identity is now its human-meaningful title; renaming a title creates a new record (cleanup via `deleteBundle`), composing modules differently under the same title is a republish (overwrite). Same `swapRecord` CAS protects against concurrent edits. Also: shipped `deleteBundle({session, xrpc, rkey})` library function in at-write — bare `com.atproto.repo.deleteRecord` against `com.lopecode.bundle/{rkey}`, no companion-post handling, no UI yet (step 15's manage surface will use this).
- **2026-05-05 — render Worker ETag/304.** Slug rkeys made `did-{}.lopecode.com/r/{rkey}` URLs stable across republishes, so the prior `cache-control: max-age=300` would let republishes go stale for up to 5 minutes per edge/browser. Switched to `cache-control: public, max-age=0, must-revalidate` with `ETag = record.cid` (and the per-blob CID for `?file=`). Revalidation is one cheap getRecord round-trip — match → `304 Not Modified` with no body, no blob fetches, no render. Mismatch → full render. Same shape applied to `?file=` downloads. The apex Worker's `proxyBundle` already passed request headers through and relayed status/headers, so 304 propagates from `lopecode.com/@:handle` and `lopecode.com/` without changes.

## Design references

The social-layer surfaces (feed, profile, in-notebook panel) are designed in a Claude Design hub. The user picked the locked-in directions in chat:

- **Hub bundle**: `https://api.anthropic.com/v1/design/h/s70n11mn7t3G9AdZ76hUYQ?open_file=Lopecode+Social+Layer.html`
- **Local extracted copy**: `/tmp/design-hub/lopecode/` (README + project + chats)
- **Locked-in surfaces** (after iterating, killed four other variants):
  - **The Edition** (`feed-c.jsx`) — discovery feed, click-to-load previews (bundles can be megabytes), companion-bsky thread on the right rail.
  - **Ledger** (`profile.jsx::ProfileVariantB`) — profile page as a dense table with sparkline-per-row + publish-cadence histogram strip on top.
  - **Inbox** (`panel.jsx::PanelVariantA`) — dockable in-notebook panel for cross-atmosphere activity.
- **Design tokens** (`shared.jsx`): cream/dark/neutral aesthetic toggle; cream is the lopecode default. Colors: `paper #f5efe5`, `ink #1a1814`, `accent #c54f2b`. Type: Source Serif 4 (serif), Inter Tight (sans), JetBrains Mono (mono). Reusable primitives: `Panel`, `MonoLabel`, `Hash`, `Handle`, `RunnablePreview`, `Sparkline`, `ModuleStar`, `TickRow`.

The design medium is React/HTML/CSS; **lopecode-side implementation is a re-render in the host runtime, not a copy of the prototype's structure**. Match the visual output, the tokens, and the composition; rebuild the components with htl/Inputs/lopepage chrome rather than React. The chats are the source of truth for *intent*; the JSX is the source of truth for *visual*.

### The pivot the design forces

Originally these surfaces were specced as **lopecode.com infra**: a static HTML profile page (step 8, ✅), a Cloudflare-Worker feed generator (step 12). The chat reframes them as **lopecode notebooks** themselves — published to atproto like any other bundle, dogfooding the system. Three modules:

| Module | Role | Where it runs |
|---|---|---|
| `@lopecode/lopefeed` | The Edition discovery feed | as a notebook (✅ shipped); apex Worker serves it as the homepage at `lopecode.com/` via `LOPEFEED_RKEY` |
| `@lopecode/ledger` | Ledger profile page | as a notebook (✅ shipped); apex Worker proxies `lopecode.com/@:handle` to the published bundle, ledger reads `location.pathname` for the handle |
| `@tomlarkworthy/inbox` | Cross-atmosphere activity panel | dockable inside any lopecode notebook (drop into lopepage's S25 slot alongside other modules) |

Data source for all three is **Contrail** (`contrail.lopecode.com/xrpc/com.lopecode.bundle.listRecords`, `?did=`, `?search=`, etc.). They never re-implement the indexer; they just call it.

Note: the Bluesky-side `app.bsky.feed.generator` Worker (a *separate* concern — for showing a "lopecode" feed *inside Bluesky clients*) stays as planned step 12, but it's now downstream of the notebook surfaces and can wait until the in-lopecode discovery story is real.

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

## Schemas (v1)

Three records are written to the author's PDS per publish: the canonical bundle, a companion Bluesky post, and a standard.site document sidecar. The bundle is what makes the publish a publish; the other two are reach.

### `com.lopecode.bundle` (canonical, immutable)

The lexicon JSON we publish under `_lexicon.lopecode.com`:

```json
{
  "lexicon": 1,
  "id": "com.lopecode.bundle",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["title", "files", "createdAt"],
        "properties": {
          "title":     { "type": "string", "maxLength": 200 },
          "files":     { "type": "array", "items": { "type": "ref", "ref": "#fileEntry" } },
          "createdAt": { "type": "string", "format": "datetime" }
        }
      }
    },
    "fileEntry": {
      "type": "object",
      "required": ["id", "encoding", "blob"],
      "properties": {
        "id":       { "type": "string", "maxLength": 1000, "description": "Script tag id, e.g. `@user/module`, `@user/module/asset.png`, `bootconf.json`" },
        "encoding": { "type": "string", "enum": ["text", "base64"] },
        "blob":     { "type": "blob",   "description": "atproto blob ref — CID (v1 raw + sha-256), mimeType, size" }
      }
    }
  }
}
```

`title` defaults to exporter-3's `notebook_title`. `files[]` is one entry per `<script id data-mime>` block in the running runtime; `encoding` mirrors `data-encoding`; the blob's `mimeType` mirrors `data-mime`. Identical to v0's `dev.lopecode.bundle` shape — the rename is the only schema change.

### `app.bsky.feed.post` (companion, sidecar)

What at-write writes after a successful `createRecord`:

```jsonc
{
  "$type": "app.bsky.feed.post",
  "text": "Published: <title>",
  "embed": {
    "$type": "app.bsky.embed.external",
    "external": {
      "uri":         "https://did-<encoded-did>.lopecode.com/r/<rkey>",
      "title":       "<bundle.title>",
      "description": "<first 200 chars of any user-supplied summary, or empty>"
    }
  },
  "createdAt": "<bundle.createdAt>"
}
```

Standard `app.bsky.feed.post` — no extension fields. `embed.external.uri` is the per-DID web-proxy URL, so the embed card is bookmarkable as a real webpage. The `text` is short and deliberately boring; the embed card carries the actual hook. Replies, likes, reposts on this post are the v1 comments/reactions surface for free.

### `site.standard.document` (editorial, sidecar)

Brings bundles into the standard.site reader ecosystem. The shape mirrors what standard.site readers already render:

```jsonc
{
  "$type":       "site.standard.document",
  "title":       "<bundle.title>",
  "publication": "<at-uri of author's site.standard.publication, if they have one>",
  "createdAt":   "<bundle.createdAt>",
  "bskyPostRef": {                         // links discussion to the companion Bluesky post
    "uri": "at://<did>/app.bsky.feed.post/<post-rkey>",
    "cid": "<companion-post-cid>"
  },
  "content": [
    {
      "$type":  "com.lopecode.runtime",
      "bundle": {                          // strong ref to the canonical bundle record
        "uri": "at://<did>/com.lopecode.bundle/<bundle-rkey>",
        "cid": "<bundle-cid>"
      }
    }
  ]
}
```

`content` is standard.site's open union — `com.lopecode.runtime` is our extension member, and we publish its lexicon under `_lexicon.lopecode.com` too:

```json
{
  "lexicon": 1,
  "id": "com.lopecode.runtime",
  "defs": {
    "main": {
      "type": "object",
      "required": ["bundle"],
      "properties": {
        "bundle": { "type": "ref", "ref": "com.atproto.repo.strongRef" }
      }
    }
  }
}
```

standard.site clients render this as "document with unknown content type"; lopecode-aware clients dereference the bundle and render the runnable thing.

### Notebook identity in the rkey

The bundle's `rkey` carries notebook identity, not a version number. Republishing the same notebook overwrites its bundle record at the same URI. Decision recorded 2026-05-04 after the v1 rollout surfaced "duplicates on the feed" as the daily-use cost of TID-versioned rkeys; the identity rule was revised on 2026-05-05 from "main module slug" to "title slug" because a notebook's main is "what view to open" and a notebook's title is "what this thing IS" — composing the same modules under a different title is a different work.

**rkey computation.** Slug derived from the human title and folded into the atproto rkey character set. NFKD-strip non-ASCII so emojis don't survive, collapse non-rkey chars to `-`, trim, lowercase, cap at 64 chars:

```js
// "atproto"          → "atproto"
// "Hello, world!"    → "hello-world"
// "✨ Notebook v2"   → "notebook-v2"
function slugifyTitle(title) {
  const slug = String(title)
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9_.-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase()
    .slice(0, 64);
  if (!slug) throw new Error(`Cannot slugify title: ${JSON.stringify(title)}`);
  return slug;
}
```

The author DID is *already implied by the repo owning the record*, so a slug-only rkey leaves URIs short and bookmarkable: `at://did:plc:.../com.lopecode.bundle/lopefeed`, `https://did-plc-….lopecode.com/r/lopefeed`. atproto rkey grammar (`[a-zA-Z0-9_~.\-:]{1,512}`) excludes `/` and `@`, so we can't preserve the original `@user/name` shape; URL-encoding doesn't help (`%` is also excluded). The earlier "slugify `bootconf.mains[0]`" rule (2026-05-04) was rejected on 2026-05-05 because main is a view choice, not an identity. The original main is still present in the bundle's bootconf so nothing is lost.

**Publish primitive.** at-write switches from `createRecord` (TID-rkey, append-only) to `putRecord` (caller-chosen rkey, create-or-update):

```js
await xrpc("com.atproto.repo.putRecord", {
  repo: did,
  collection: "com.lopecode.bundle",
  rkey: slugifyTitle(title),
  record: { /* bundle value */ },
  swapRecord: existingCid  // CAS — protects against concurrent edits
});
```

`swapRecord` is atproto's CAS — protects against two clients overwriting each other's edits. First publish omits it; subsequent publishes pass the existing record's CID.

**Companion post.** The shared-rkey convention still holds: companion `app.bsky.feed.post` shares the bundle's rkey. Re-Sharing the same notebook now *replaces* the existing companion post (`putRecord` against `app.bsky.feed.post/{slug}`) rather than minting a new one. Same for `site.standard.document` when it ships.

**Edit-after-publish.** A title-only edit *moves* the bundle to a new rkey (`slugifyTitle` is a pure function of title) — the old record is left behind. That's the right shape for a rename, but means the cleanup surface is load-bearing: the "Manage Publishes" UI is also where you delete the orphan after renaming. A purely structural metadata update (e.g. swapping `files[]` while keeping the title) is a republish at the same rkey under CAS — overwrite, not duplicate.

**Delete.** Bare `deleteRecord` against any owned rkey, exposed today as the `deleteBundle({session, xrpc, rkey})` library function in at-write (no companion-post handling — the companion post follows the shared-rkey convention so it can be deleted with the same rkey via `app.bsky.feed.post`, but the call sites stay separate). The "Manage Publishes" UI will surface this as a Delete button per bundle. Note: blob CIDs are reference-counted by the PDS; deleting a record decrements the refs but doesn't necessarily un-pin the blobs (other records or the listBlobs ceiling can keep them alive). Acceptable — bytes are content-addressed, durability is a feature.

**Collision case.** Two bundles under the same DID with the same title slug to the same rkey. Under the current code this is a silent overwrite (putRecord without swapRecord on the second publish, since `getRecord` returns the existing record's CID and the user goes ahead). Acceptable for now: same DID, same title, almost always same intent. If it becomes a footgun the manage UI is where to surface "you have two bundles slug-colliding, rename one."

**Migration.** Existing TID-rkey bundles in users' repos remain valid records — atproto records persist until `deleteRecord`. The "Manage Publishes" UI is the cleanup surface: list, identify duplicates, delete the orphans. New publishes from this point forward use slug rkeys. Worker-side rkey pins (`LOPEFEED_RKEY`, `LEDGER_RKEY`) become permanent constants once each notebook republishes under its slug — no more rkey bumps to promote new builds.

### Sidecar rkey convention

All three records share the bundle's slug rkey:

1. `putRecord` for the bundle at `rkey = slugifyTitle(title)`.
2. Reuse that same rkey for the companion post and the document sidecar.

That makes the relationships predictable: given a bundle URI, a fetcher can compute the sidecar URIs without an index. Failure mode: if the post or document fails, the bundle still lands; the sidecars can be retried out-of-band against the known rkey.

## How bundles attach to authors

There is no registration step. The author's **DID is the link**, baked into every bundle URI: `at://<did>/com.lopecode.bundle/<rkey>`. Whoever owns the repo at that DID is the author, by atproto construction.

To list one author's bundles, the standard atproto XRPC suffices:

```
GET <pds>/xrpc/com.atproto.repo.listRecords
  ?repo=<did>
  &collection=com.lopecode.bundle
  &limit=50
```

No auth needed (records are public-readable). That's what `lopecode.com/@:handle` does:

1. Resolve handle → DID via `com.atproto.identity.resolveHandle`.
2. `listRecords` for the bundle collection (against the user's PDS, or via `public.api.bsky.app` which proxies for any DID).
3. Render the list.

After Contrail lands (next-steps step 9), the profile page swaps the direct `listRecords` for Contrail's typed XRPC — same answer, with full-text search and recency-sort built in.

### What bundles deliberately don't have

- **No `author` field on the record.** The DID owning the repo is the author. Adding one would invite forgery.
- **No explicit "profile" record they register against.** v1 derives the profile entirely from "this DID's `listRecords`."
- **No `publication` field on the bundle itself.** The `site.standard.document` sidecar can reference a `site.standard.publication` if the author has one — that's how the standard.site reader ecosystem groups documents into a "blog." Not the bundle's concern.

### When curation becomes a feature

If we eventually want pinned bundles, an "about" page, or an author-curated subset of their notebooks, that's a separate record:

- A small `com.lopecode.profile` (mutable, single rkey `self`) listing pinned bundle refs and any human-curated metadata; or
- Just a `site.standard.publication` per author, with their `site.standard.document` sidecars listing into it.

Either way, it's an *additive* layer over the listRecords-derived view. Listed in [Open v1 questions](#open-v1-questions).

## Deferred (v2+)

The early sketch had four lexicons (`module` + `moduleVersion` + `app` + `appVersion`) for cross-notebook module reuse with mutable lineages and immutable versions. v1 doesn't need any of that — bundles are addressed by `at://{did}/com.lopecode.bundle/{slug}`, mutable per notebook id (see [Notebook identity in the rkey](#notebook-identity-in-the-rkey)), and dependencies are resolved at *publish time* by inlining (the file table is the transitive closure).

Three things that would justify revisiting:

- **Cross-notebook module reuse** — if many notebooks want to import the same module without duplicating its bytes. Then: split modules into their own records, addressed by CID; notebooks reference them.
- **Versioned snapshots / "follow across versions"** — bundles are now mutable per slug (republish overwrites), so the historical version-set is no longer enumerable from `listRecords`. If we eventually want subscribe-to-updates or "show all versions of this notebook" UX, add a separate lineage record (`com.lopecode.line`?) with a `head` ref pointing at the current bundle and a history array (or a parallel snapshot collection with TID rkeys). Additive, not replacing. For now, "follow the author on Bluesky" covers this socially; the deleted-version bytes still exist in atproto blob storage if anyone kept the CIDs.
- **Per-cell records** — for cell-level diff / discussion / live editing. Natural fit for the pairing channel's `define_cell` granularity. Defer until UX demands it.

Until then, the simpler model wins: one notebook per slug, addressed by `at://{did}/com.lopecode.bundle/{slug}`, overwritten in place on republish.

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
4. Companion Bluesky post available on publish (opt-in via "Share to Bluesky") — bundle appears in the author's Bluesky timeline + reachable by Bluesky followers.
5. Custom Bluesky feed (`app.bsky.feed.generator`) surfacing recent lopecode bundles for browse/discovery.
6. `site.standard.document` sidecar so bundles surface in the standard.site reader ecosystem (a long-form publishing community lexicon).

Out of scope: module/moduleVersion split, capability enforcement, custom non-Bluesky notifications, OAuth.

### Records written per publish

Up to three records, all to the author's PDS. Full shapes are in [Schemas (v1)](#schemas-v1):

| Record | Trigger | Purpose |
|---|---|---|
| `com.lopecode.bundle` | always | Canonical artifact — the file table the user just published. |
| `app.bsky.feed.post` | opt-in ("Share to Bluesky") | Companion post linking to the per-DID web-proxy URL. Drives Bluesky reach (timeline, replies, reposts, native notifications). |
| `site.standard.document` | (planned, opt-in) | Editorial sidecar with `bskyPostRef` to the companion post and `content[com.lopecode.runtime]` referencing the bundle. Drives reach into the standard.site ecosystem. |

The bundle is canonical; the other two are sidecars. All three share the bundle's rkey, so the sidecar URIs are derivable from the bundle URI. Opt-in design: drafts and experiments shouldn't auto-spam the author's followers.

After `createRecord` succeeds at-write also calls Contrail's `notify(at://…/com.lopecode.bundle/:rkey)` so the bundle is queryable in the discovery feed immediately, instead of waiting for the next 1-minute Jetstream cycle.

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
| 2 | **Profile page** `lopecode.com/@:handle` | v1 ships a static-HTML stub (handle → DID → direct `listRecords`). Long-term: apex Worker resolves the handle and opens the **Ledger** notebook (`@tomlarkworthy/ledger`) with `?did=` in the hash. See [Design references](#design-references). |
| 3 | **OAuth surface** `lopecode.com/oauth/client.json`, `/oauth/callback`, `/oauth/relay/<state>` | Static client metadata + callback page that POSTs to the server-side relay (Cloudflare Cache API, 5-min TTL, delete-on-read, keyed by `state`). The notebook polls the relay. See [Auth](#auth). |
| 4 | **Indexer** | [Contrail](https://github.com/flo-bit/contrail) on Workers + D1, vendored at `vendor/contrail`. One `contrail.config.ts` declares `com.lopecode.bundle` (recency + FTS title search) and a `timeline` feed over `app.bsky.graph.follow`. Contrail handles Jetstream + backfill + typed XRPC. |
| 5 | **Bluesky feed generator** at `feed.lopecode.com` | Cloudflare Worker implementing the `app.bsky.feed.generator` XRPCs (`getFeedSkeleton`, `describeFeedGenerator`). For showing a "lopecode" feed *inside Bluesky clients* — distinct from the in-lopecode discovery feed (the **Edition** notebook, see [Design references](#design-references)), which is what most lopecode users see. |

That's it. Nothing else needs to live server-side for v1.

The lopecode-side discovery + profile + activity-panel surfaces (the Edition, the Ledger, the Inbox) are themselves notebooks — published on atproto, served via the same web-proxy path everything else uses. They appear under [Design references](#design-references) and as steps 11–13 of [Next steps](#next-steps).

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
- **v1: OAuth via `lopecode.com`.** Hosted `client_metadata.json` at `https://lopecode.com/oauth/client.json`. The notebook itself runs the PAR + PKCE + DPoP flow (`@tomlarkworthy/atproto-login`): mints a 192-bit `state` nonce, generates a non-extractable DPoP keypair (kept in IndexedDB), pushes the auth request to the user's PDS, opens a popup at the resulting authorization URI, and polls `https://lopecode.com/oauth/relay/<state>` for the callback params. The callback page at `https://lopecode.com/oauth/callback` POSTs whatever the auth server hands it to the relay (Cloudflare Cache API, 5-minute TTL, delete-on-read). The notebook redeems the code with PKCE verifier + DPoP proof against the PDS token endpoint, persists the DPoP-bound `{accessJwt, refreshJwt, did, pds, dpopKey}` in IndexedDB, and refreshes on its own. The lopecode.com side is stateless — short-lived encrypted-by-state slots, not a session store. Why a server relay rather than `window.opener.postMessage` / `BroadcastChannel`: notebooks run on origins that don't match the callback origin (`file://`, `did-….lopecode.com`, etc.), and COOP severance plus Chrome's storage partitioning silently break the browser-only paths.

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
- **File provenance** (idea, needs more thought): today a file's `name` (`@user/module`) is convention only — bytes have no owner, the bundle's signing DID just attests "I publish these `(name, CID)` pairs." Anyone can publish a file called `@tomlarkworthy/atproto` containing arbitrary bytes; nothing in the system stops it. A `provenance` field on each manifest entry could point at a canonical publishing event:

  ```json
  { "name": "@tomlarkworthy/atproto",
    "blob": { "$link": "bafy_X" },
    "provenance": "at://did:plc:tomlark/com.lopecode.bundle/abc" }
  ```

  Resolution: fetch that bundle, confirm the DID's signature, confirm the named entry there has the same CID. That cryptographically traces the bytes back to tomlark's repo. Forks would inherit `provenance` for unchanged files and drop (or replace) it for modified ones, giving "unbroken chain back to original publisher" as a verifiable property when present and a visible "modified by Bob" warning when absent. Open: whether to bake this into v1's `com.lopecode.bundle` lexicon, defer to a v2 with cross-notebook module reuse, or skip in favour of a pure social/reputation model.

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

## Next steps

Bottom-up order. Each step independently shippable; earlier steps unblock later ones. Status as of 2026-05-02 — ✅ shipped, ☐ outstanding.

Public links go through `lopecode.com` from day one, so the *URL* people share on Bluesky / RSS / plain web is stable and branded regardless of where rendering actually happens.

**Foundation**

1. ✅ **Rename `dev.lopecode.bundle` → `com.lopecode.bundle`** in at-write and at-read. v0 records abandoned in place.
2. ✅ **at-read prefills from URL hash.** `…/atproto.html#at=at://did/com.lopecode.bundle/rkey` auto-loads.

**lopecode.com infra (gates all sharing)**

3. ✅ **Cloudflare project stood up**: zone, DNS (wildcard `*` AAAA), Universal SSL for `*.lopecode.com`, Pages skeleton wired to the `lopecode.com/` submodule, apex Worker on the wildcard route forwarding by Host.
4. ✅ **Web proxy Worker** at `*.lopecode.com/r/:rkey`. Apex Worker decodes `Host` → DID, forwards to the `lopecode-render` Worker via service binding. Render Worker resolves the PDS, fetches the bundle record + blobs, and serves composed HTML at the per-DID origin (top-level navigation, no sandbox, real storage, bookmarkable). Skipped the planned 302-to-GitHub-Pages MVP; went straight to inline render. Render path drives exporter-3's `lopebook` cell with bundle files emitted directly as `<script>` blocks — re-running the full `book` pipeline against bundle bytes is the wrong shape (bundle is `book`'s output, not its input). DID encoding: `did:plc:abc` → `did-plc-abc.lopecode.com`. atproto blobs cached at the edge (`cf.cacheTtl: 31536000`) since CIDs are immutable; system modules share CIDs across every bundle so this also warms cross-bundle. First-render ~7s (cold blobs), repeat ~700ms.
5. ✅ **OAuth surface** at `lopecode.com/oauth/client.json` + `/oauth/callback` + `/oauth/relay/<state>`. Static client metadata + a callback page that POSTs the params to a server-side relay (Cloudflare Cache API, 5-minute TTL, delete-on-read, keyed by the OAuth `state` nonce). `@tomlarkworthy/atproto-login` runs the full PAR + PKCE + DPoP flow against the user's PDS, opens the auth popup, polls the relay for the callback params, and exchanges the code for a DPoP-bound access/refresh pair. at-write consumes a `loginWidget` builder factory + `session` + `xrpc` from atproto-login (no bundled auth). atproto's `client_id` is the lopecode.com URL, stable across rendering-host changes. App-password fallback retained but de-emphasized. Why a server relay rather than `window.opener.postMessage` or `BroadcastChannel`: the notebook origin (file://, did-….lopecode.com, etc.) typically differs from the callback origin, and COOP severance + Chrome storage partitioning silently break the browser-only paths.

**Sharing**

6. ✅ **Companion `app.bsky.feed.post` on publish** in at-write. After `createRecord` succeeds, the success card surfaces a "Share to Bluesky" panel (textarea pre-filled with title + per-DID lopecode.com URL); clicking writes an `app.bsky.feed.post` with `app.bsky.embed.external` pointing at `https://did-…lopecode.com/r/:rkey` and sharing the bundle's rkey. Opt-in rather than automatic by design — not every bundle deserves a public post (drafts, experiments).
7. ☐ **`site.standard.document` sidecar** in at-write. Same publish flow, parallel write. Gets bundles into the standard.site reader ecosystem.

**Profile + discovery**

8. ✅ **Profile page (v1, static HTML stub)** at `lopecode.com/@:handle`. Client-side handle→DID + `com.atproto.repo.listRecords?collection=com.lopecode.bundle`. Holds the URL until the Ledger notebook (step 11) replaces it.
9. ✅ **Contrail indexer** at `contrail.lopecode.com`. `vendor/contrail` npm, `contrail.config.ts` declares `com.lopecode.bundle` + `app.bsky.graph.follow`, D1-backed (`lopecode-contrail`), 1-minute jetstream cron, on-demand backfill via `?actor=`. Reached via service binding from the apex (custom-domain precedence is unreliable under wildcard routes).
10. ✅ **`notify(uri)` in at-write** after `createRecord`. Fire-and-forget `POST https://contrail.lopecode.com/xrpc/com.lopecode.notifyOfUpdate` with `{uri: created.uri}`; failures are silent (jetstream cron is the safety net). Verified end-to-end: bundle `3mkwwfbzfzd2w` was queryable in Contrail within seconds of publish, well under the 60s cron interval.

**Social layer (notebooks, per [Design references](#design-references))**

11. ✅ **Ledger profile notebook** — `@lopecode/ledger` (`lopecode/notebooks/ledger.html`). Reactive `params` cell reads `location.pathname` (`/@handle`), `&handle=`, and `&did=` from the hash via `Generators.observe`; resolves handle → DID via `com.atproto.identity.resolveHandle`; lists bundles via Contrail's `com.lopecode.bundle.listRecords?did=…`; looks up `app.bsky.actor.getProfile` + `plc.directory` for identity. Renders identity strip, deduped-by-CID stat ribbon (bundles · modules · unique files · unique bytes), 12-week `Plot.rectY` publish-cadence histogram, and an `Inputs.table` with format-callbacks linking titles to per-DID web-preview URLs. Notebook is self-publishing: bundles at-write + atproto-login + atproto + safe-local-storage; landing hash `S100(ledger,module-selection,exporter-3,at-write)` with all four as tabs. Apex Worker proxies `lopecode.com/@:handle` to the published bundle (`LEDGER_RKEY` constant); URL bar stays clean. The cybernetic-table direction from `profile.jsx::ProfileVariantB`; module-starburst + import-gravity + sparkline-per-row deferred until 12 (Edition) lands so the design rev can include them once.
12. ✅ **Edition feed notebook (Lopefeed)** — `@lopecode/lopefeed` (`lopecode/notebooks/lopefeed.html`). Editorial discovery feed driven off Contrail's `listRecords?sort=-createdAt`; apex Worker serves it as the homepage at `lopecode.com/` via the `LOPEFEED_RKEY` pin in `lopecode.com/src/worker.js`. Downloads are **PDS-direct** — the per-bundle button calls `downloadBundle(did, rkey)` which goes plc.directory → `com.atproto.repo.getRecord` → per-blob `com.atproto.sync.getBlob` and reassembles the `<script id data-mime>` table + lopebook chrome client-side via `composeBundle()`, bypassing the lopecode.com render Worker entirely. The shared download primitives (`composeBundle`, IndexedDB cache `idb`) live in `@tomlarkworthy/atproto`; at-read re-exports them, lopefeed imports from atproto directly. Companion-bsky thread on the right rail and click-to-load preview affordance from `feed-c.jsx` are deferred for design polish; the cybernetic-table direction is also deferred so the next design rev can include lopefeed + ledger together.
13. ☐ **Inbox panel notebook** — `@tomlarkworthy/inbox`. A panel module that drops into any lopepage layout slot (S25 alongside other modules). Reads Contrail's recency feed for `app.bsky.graph.follow` targets; sub-tabs for *feed*, *mentions*, *forks*, *publish*. Per `panel.jsx::PanelVariantA`.
14. ✅ **Bluesky `app.bsky.feed.generator` Worker** at `feed.lopecode.com`. `lopecode.com/feed/` worker, reached via service binding from the apex (`feed.lopecode.com` → `FEED`). Implements `app.bsky.feed.getFeedSkeleton`, `app.bsky.feed.describeFeedGenerator`, and `/.well-known/did.json` for `did:web:feed.lopecode.com`. Skeleton calls Contrail's `com.lopecode.bundle.listRecords?sort=-createdAt` and maps each bundle URI to its sidecar companion-post URI via the shared-rkey convention (`com.lopecode.bundle/{rkey}` → `app.bsky.feed.post/{rkey}`). The feed-generator record is registered under `did:plc:a5yddar7vebmgjithmy4skj6` (`@trendingnotebooks.bsky.social`) — kept separate from the human author DID so the Bluesky-side branding can be project-themed. AppView verified: `getFeedGenerator` returns `isOnline: true, isValid: true`; `getFeed` hydrates the embed cards correctly. Pin: `https://bsky.app/profile/trendingnotebooks.bsky.social/feed/lopecode`.

    **Companion-post coverage** is the next concern, not the infra. The "Share to Bluesky" panel in at-write is opt-in by design (drafts shouldn't auto-spam), so most bundles don't have a companion post and don't surface in the feed. Auto-share would defeat the design intent. The deferred path: turn `@trendingnotebooks` (which is already a curatorial bot — it weekly-posts top trending Observable notebooks) into the editorial source for this feed by **post-on-traction**: a small worker listens to Contrail for new `com.lopecode.bundle` records, watches for engagement signals (likes ≥ 1 on the author's existing companion post, or some equivalent low-bar threshold), and only then has `@trendingnotebooks` write its own companion post. Skeleton query then becomes "trendingnotebooks' own posts whose embed.external.uri is on lopecode.com," giving the bot editorial control and avoiding raw-publish noise. The current "every author's companion post" mapping keeps working until that lands.

**v1.1**

**Notebook identity (decided 2026-05-04, revised 2026-05-05, see [Notebook identity in the rkey](#notebook-identity-in-the-rkey))**

15. ◐ **Manage Publishes UI** in `atproto.html`. Lists `listRecords` of the logged-in user's `com.lopecode.bundle` records (title, createdAt, rkey, file count). Per-row buttons: *Edit metadata* (`putRecord` against same rkey with edited title/etc), *Delete* (`deleteRecord`). Solves the "duplicates on the feed" problem today by giving a cleanup surface; also unlocks edit-after-publish without touching the publish flow. Zero schema changes. **2026-05-05 progress:** the underlying `deleteBundle({session, xrpc, rkey})` library function shipped in `@tomlarkworthy/at-write` (no UI surface yet) — the manage panel just needs to wire `listRecords` + per-row `deleteBundle` + an Edit-title flow. With step 16 shipped, every author who used at-write before 2026-05-04 has TID-rkey legacy bundles on the feed alongside their slug-rkey publishes; renaming a title under the 2026-05-05 identity rule also leaves a slug-rkey orphan — both are cleaned up here.
16. ✅ **at-write switches to `putRecord` with slug rkey** (2026-05-04, revised 2026-05-05). `rkey = slugifyTitle(title)` — bundle identity is its human title (`"malleable"` → `malleable`, `"Hello, world!"` → `hello-world`), not its main module. Republishing the same notebook (same title) overwrites the bundle record at the same URI; companion `app.bsky.feed.post` follows the shared-rkey convention so re-Share replaces the post. `swapRecord` (CAS) protects against concurrent edits. Original 2026-05-04 rule was `slugifyMain(bootconf.mains[0])`, revised when opening a notebook against a different main (e.g. `@tomlarkworthy/atproto.html` viewing `@tomlarkworthy/malleable`) overwrote the wrong bundle — main is "what view to open," title is "what this thing IS." Existing TID-rkey bundles remain valid records, cleaned up via step 15. Worker-side rkey pins (`LOPEFEED_RKEY`, `LEDGER_RKEY` in `lopecode.com/src/worker.js`) become permanent constants once each notebook republishes under its slug — no more rkey bumps to promote new builds.
16a. ✅ **Render Worker ETag/304** (2026-05-05). Slug rkeys made `did-{}.lopecode.com/r/{rkey}` URLs stable across republishes — without revalidation, the prior `max-age=300` would have served stale builds for 5 minutes per edge after every publish. Switched the render Worker to `cache-control: public, max-age=0, must-revalidate` with `ETag = record.cid`, and per-blob CID for `?file=`. Revalidation cost is one cheap getRecord call.

**v1.1**

17. ☐ RSS bridge at `lopecode.com/feed.xml` and `lopecode.com/@:handle/feed.xml` — see [v1.1 RSS bridge](#v11-rss-bridge).

Steps 1–6, 8, 9, 10, 11, 12, 14, 16, 16a are done. Remaining v1 work: 7 (standard.document sidecar), 13 (Inbox), 15 (Manage Publishes UI — `deleteBundle` library function shipped 2026-05-05, UI still outstanding); then 17 (RSS) for v1.1. Step 15 is now load-bearing for two cleanup classes: pre-2026-05-04 TID-rkey legacy records, and slug-rkey orphans from title renames under the 2026-05-05 identity rule. The "static HTML profile" at step 8 has been superseded by the Ledger notebook (11); the homepage is served by the Lopefeed notebook (12); the Bluesky-side discovery feed is live but sparsely populated until companion-post coverage improves (see step 14's deferred post-on-traction path).

## Core insight

- **a notebook** is the unit of publication; whether it's used as a library or an app is a consumption choice, not a publish choice
- **exports** (single-file HTML) are derived portable artifacts, not canonical
- **ATProto** is the data + identity substrate; not web hosting
- **the social experience** emerges from indexing, feeds, and the existing Bluesky follow graph — not from Bluesky understanding our records natively
