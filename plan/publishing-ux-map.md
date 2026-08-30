# Publishing UX map — lopecode.com, standard.site, Bluesky, Ledger

Written 2026-08-30 from a live probe of the PDS and lopecode.com (commands below, run that day) and a
code survey of `at-write` / `at-login` / `at-read` (`lopecode/notebooks/atproto.html`), `ledger.html`,
`lopefeed.html`, `lopecode.com/src/worker.js`, `lopecode.com/{render,feed,contrail}`, and
`tools/atproto-publish.ts`. Notebook line numbers are into `bun tools/lope-reader.ts <html> --get-module <id>`
extractions, not repo files. `specs/atproto.md` is stale on every point below; code wins
(decision 2026-05-29, `project_atproto_stdsite_already_built`).

The question that started this: "how do I use lopecode.com to publish under standard.site and get it to
work nicely with Bluesky, and why doesn't a person's output link to their Ledger?"

## 1. What is live (2026-08-30)

Author `did:plc:j7nm3lrd5h7fm3sfhcv3lhfv`, PDS `earthstar.us-east.host.bsky.network`.

```
com.lopecode.bundle            10 records
site.standard.document          5 records   (4 slug-keyed → publication/self, 1 TID-keyed → publication/3mndgo4hhre22)
site.standard.publication       2 records   (rkey self, rkey 3mndgo4hhre22; both url=https://did-plc-….lopecode.com)
bundles carrying bskyPostUri+stdDocUri   1/10  (atproto)      the other 9 have only $type,createdAt,files,title
bsky posts embedding /r/ URLs            5    all with 0 associatedRefs
```

Routes, `curl -o /dev/null -w '%{http_code}'`:

```
lopecode.com/                                        200  Lopefeed notebook (2.6 MB)
lopecode.com/@larkworthy.bsky.social                 200  Ledger notebook (2.6 MB)
lopecode.com/.well-known/site.standard.publication   404
did-plc-….lopecode.com/.well-known/site.standard.publication   200  "at://…/site.standard.publication/self"
did-plc-….lopecode.com/r/tomlarkworthy-virtual-monorepo        200  render worker; og:* tags, NO <link rel=site.standard.document>
did-plc-….lopecode.com/                              404 in prod (Ledger route is an uncommitted diff in worker.js:225-234)
```

The `/r/` page emits no `<link rel="site.standard.document">` because it reads `bundle.stdDocUri`
(`render/src/worker.ts:246-257`) and 9/10 bundles do not carry it.

## 2. Why it is confusing — the record

Three independent stories about where a bundle's Bluesky post is, and no two agree:

| writer | reader | location |
|---|---|---|
| at-write "Share to Bluesky" (`at-write.js:691-736`) | Lopefeed (`lopefeed.js:198`) | `bundle.bskyPostUri` |
| Ledger compose-and-paste (`ledger.js:983-1035`) | Ledger only (`ledger.js:206,828`) | `com.lopecode.bundle.crossRef/<slug>.bsky` |
| — | feed.lopecode.com (`feed/src/worker.ts:47-52`) | derived `app.bsky.feed.post/<bundle rkey>` — never exists, posts are TID-keyed |

Two key schemes for the standard.site document. at-write mints a TID and tracks it via
`bundle.stdDocUri` (`at-write.js:1060-1066`); the Ledger still addresses docs by bundle slug
(`ledger.js:512-516`, `:658-662`), so its probe 404s for every at-write-published bundle and every row
shows "▸ Publish…". Clicking it creates a fresh orphan TID doc each time (`ledger.js:614-632` passes no
`priorDocUri`). Live: 4 slug docs from the Ledger era, 1 TID doc from at-write.

Two publication records. at-write moved to TID rkeys because standard.site's lexicon is `key: tid`
(memory 2026-06-02), but `/.well-known` still answers `…/publication/self` (`worker.js:81`) and the
render page's `at:standard.site:pub` meta says the same. A validating indexer sees a verification
pointer to a record with an illegal rkey.

Sidecars only from the browser. CI (`tools/atproto-publish.ts:387-389`) writes bundle + version and
skips doc/pub/post by design ("app-password compatibility unproven"). It carries `bskyPostUri`/`stdDocUri`
forward (`:317-318`), but the live data shows 9/10 bundles without them — so either those bundles were
never published from the browser with sidecars, or they were republished before carry-forward landed
(2026-08-25). Unverified which.

The publish widget has no page. `publisher()` renders only inside at-write's own cell; `atproto.html`'s
default hash shows at-login + module-selection, not at-write. Neither Lopefeed nor Ledger mounts it.
`publishEntry` ("lopefeed · publish", ⌘P, `at-write.js:794-856`) is dead code whose two links 404.

No surface links to the Ledger. Lopefeed byline → `bsky.app/profile/<handle>` (`lopefeed.js:517`);
the `/r/` render page has zero `<a href>`; at-read has one (download, `at-read.js:155`). The Ledger is
reachable only by typing `lopecode.com/@handle`, and nothing in the corpus boots `@tomlarkworthy/ledger`.
Ledger ↔ Lopefeed: zero cross-references either way.

Other breakage found in passing, each one line: "Fork an at://" builds `plc-….lopecode.com` without
the `did-` prefix (`at-write.js:255`); Lopefeed version chain reads `previousVersion` off the bundle,
which only snapshots carry (`lopefeed.js:199`), and its snapshot links target a collection the render
worker hardcodes away (`render/src/worker.ts:32`); Ledger bulk delete removes the bundle only
(`ledger.js:340-356`), orphaning version, doc, pub, post, crossRef; `did:web` authors cannot be routed
(host regexes forbid `.`); `feed/` sends `sort=-createdAt`, which contrail ignores.

## 3. What standard.site requires (fetched 2026-08-30, standard.site/docs)

- `site.standard.publication`: required `url` (no trailing slash), `name`. Verified by
  `GET <url>/.well-known/site.standard.publication` returning the publication AT-URI.
- `site.standard.document`: required `site` (pub AT-URI), `title`, `publishedAt`; optional `path`,
  `description`, `coverImage`, `textContent`, `bskyPostRef`, `tags`. Web URL = `site.url + path`.
  Verified by `<link rel="site.standard.document" href="at://…">` in the page head.
- Both lexicons are `key: tid` at `@standard.site` (checked 2026-06-02).
- Readers/indexers that would list us once verified: read.pckt.blog, docs.surf, leaflet.pub,
  standard-search.octet-stream.net, site-validator.fly.dev (validator).

Our publication `url` is the DID subdomain, so verification and the document link both have to be
served from `did-….lopecode.com`, which they are — but pointing at the wrong pub rkey, and the doc
link only when the bundle carries `stdDocUri`.

## 4. Target

One publish, one identity, every surface links to it.

```
Ledger  lopecode.com/@handle          author home; publish widget lives HERE (owner) ; rows link out
  ▲            ▲                                ▲
  │ byline     │ "by @handle" link              │ "by @handle" link
Lopefeed card  render page /r/<slug>            bsky post (embed.external → /r/<slug>, associatedRefs → doc+pub)
                     ▲
                     │ publication.url + document.path ; verified via .well-known + <link rel>
               standard.site indexers
```

Rules that fall out of it:

1. **`com.lopecode.bundle` is the only record of truth for sidecar URIs** (`bskyPostUri`, `stdDocUri`).
   Retire `crossRef.bsky`; keep a home for `crossRef.standard.url` (the vanity URL) — likely a field on
   the bundle, since it is the only place vanity lives today (`ledger.js:219`).
2. **TID everywhere for standard.site**, and `/.well-known` + `at:standard.site:pub` answer the TID pub.
   The publication is per-author, so the worker needs to look it up (contrail or PDS listRecords) or the
   bundle must carry `stdPubUri` too.
3. **The document is written on every publish, browser and CI alike**, and CI must not lose it. If
   app-password writes to `site.standard.*` are the blocker, test that once — the browser path uses
   the same PDS API.
4. **Every rendered page links back**: the `/r/` render page gets a byline
   (`by @handle → lopecode.com/@handle`, and the bsky post if any); Lopefeed's byline goes to the
   Ledger, with bsky as a secondary link; the Ledger links to the feed.
5. **The publish widget mounts in the Ledger** when `isOwner`. Delete `publishEntry`.
6. **Delete is cascading**: bundle, versions, doc, post (or leave post, but say so), crossRef.

Alternative considered: make `lopecode.com/<handle>/<slug>` the publication url (apex, one domain,
human-readable) instead of the DID subdomain. Cost: every existing doc's `site`/`path`, every bsky
embed, `.well-known` routing per handle at the apex, and handle changes break URLs where DIDs do not.
Not recommended now; the DID subdomain is ugly but stable and already wired.

## 5. Order of work, cheapest first

| # | change | where | fixes |
|---|---|---|---|
| 1 | `.well-known` and `at:standard.site:pub` return the TID pub | `worker.js:81`, `render/src/worker.ts:255` | standard.site verification |
| 2 | feed skeleton reads `bskyPostUri` | `feed/src/worker.ts:47-52` | bsky custom feed returns real posts |
| 3 | `did-` prefix in fork URL | `at-write.js:255` | fork button |
| 4 | commit the `did-*.lopecode.com/` → Ledger route | `worker.js:225-234` | publication.url resolves |
| 5 | Ledger addresses docs via `bundle.stdDocUri`, passes `priorDocUri`, writes back | `ledger.js:512-516, 614-632, 658-662` | orphan docs, inert std UI |
| 6 | Ledger bsky column reads `bundle.bskyPostUri`; drop crossRef.bsky | `ledger.js:206, 828, 983-1035` | one story for the post |
| 7 | byline links to `/@handle` on render page + Lopefeed; Ledger ↔ feed links | `render/src/worker.ts`, `lopefeed.js:517`, `ledger.js` | output → Ledger |
| 8 | mount `publisher()` in the Ledger for owners; delete `publishEntry` | `ledger.js`, `at-write.js:794-856` | publish has a home |
| 9 | CI writes doc (+pub) after proving app-password scope | `tools/atproto-publish.ts:387` | CI-published bundles verify |
| 10 | backfill: republish the 9 bundles from the browser so they carry `stdDocUri`, delete the 4 slug docs and pub `self` once nothing points at them | Ledger | live data matches the model |
| 11 | cascading delete; version links; `did:web` regex; `sort` param | as cited in §2 | hygiene |

Steps 1–4 are one-line each. Steps 5–8 are the UX. The Ledger redesign brief (`plan/ledger-design-brief.md`)
should absorb 7 and 8 before it goes to the designer: the current brief inventories the bsky column as a
crossRef link and has no publish widget on the page.

## Not verified

- Whether a validating standard.site indexer actually lists us after step 1 — run
  site-validator.fly.dev against `at://…/site.standard.document/3mndgo4lxe72o` after the fix.
- Whether app-password sessions can write `site.standard.*` (CI blocker, step 9).
- Why 9/10 live bundles lack sidecar URIs (browser-never vs. pre-carry-forward republish).

## Status 2026-08-30 — shipped and verified live

Deployed and checked against the live PDS and lopecode.com the same day. What the map above
described as broken now behaves as §4 specifies, with two exceptions named at the end.

**Verified live** (`curl`, 2026-08-30, after the Cloudflare deploy):

```
did-plc-….lopecode.com/.well-known/site.standard.publication
  -> at://did:plc:j7nm3lrd5h7fm3sfhcv3lhfv/site.standard.publication/3mndgo4hhre22   (was: /self)
did-plc-….lopecode.com/r/ledger
  -> <link rel="site.standard.document" href="at://…/site.standard.document/3muc3bw3tgh2w">
     <link rel="author" href="https://lopecode.com/@larkworthy.bsky.social">
     byline pill "by @larkworthy.bsky.social"
did-plc-….lopecode.com/                              -> 200 (Ledger; was 404)
lopecode.com/                                        -> feed, byline pill suppressed (0 occurrences)
```

The verification chain closes in both directions for every TID document: document `site` =
publication `3mndgo4hhre22`, publication `url` + document `path` = the render route, and the page
at that route carries the document's own AT-URI. That is what standard.site's `/docs/verification`
asks for. The validator at site-validator.fly.dev has no API endpoint (`/api/validate` 404s) and the
UI needs a browser, so it has not been driven — the chain was checked by hand instead.

**CI now writes the sidecars.** The workflows check out `lopecode-dev` at `ref: main`, so this only
took effect once main carried the merge — the push-triggered run at 09:26 raced ahead of it and
still logged `stdDocUri: none`. A dispatched run afterwards:

```
sidecars  site.standard.publication upsert · site.standard.document create (new TID) · no app.bsky.feed.post from CI
sidecars  document created at://…/site.standard.document/3muc3bw3tgh2w
          publication at://…/site.standard.publication/3mndgo4hhre22 (unchanged)
published at://…/com.lopecode.bundle/ledger
```

Note `89 identical · 0 changed` on that run: the bundle's content was unchanged, and it republished
anyway. That is the backfill exception working — without it no push would ever bind a `stdDocUri`
onto a bundle whose files never change again.

**Backfill, step 10, done for every armed notebook.** 5 of 10 bundles now carry a document
(`ledger`, `lopefeed`, `newsletter-001`, `tomlarkworthy-virtual-monorepo`, `atproto`), all five
pointing at the TID publication. `workflow_dispatch` was ported from lopecode to lopebooks to make
this possible — a bundle that needs backfilling is by definition one no push will republish.

**Built on top of a parallel session's work, not over it.** Between the survey and the fix,
`lopecode/main` gained the Ledger dark redesign (#211), an in-page "clicking an author opens their
Ledger beside the feed" aside (#212) and a lazy-fetch Ledger fix (#213). The first commit of this
work was written against the pre-redesign canonical and would have reverted all three. It was reset
and the functional changes re-applied onto the redesign: the Ledger's new controls are built from
its `lg-*` tokens rather than the old hand-drawn styling, and the Lopefeed byline keeps #212's
in-page aside instead of the plain `lopecode.com/@handle` link this plan originally specified. The
lesson generalises — a module-level 3-way merge, not a file-level one, is the only tractable way to
reconcile two sessions' work on the same notebook.

**Still open:**

- ~~**The feed Worker is not deployed.**~~ **Resolved 2026-08-30.** `lopecode-feed` is a separate
  Worker from the git-integrated root, so a push to main redeployed apex and render and left feed on
  the old code for hours, silently. Fixed by `.github/workflows/deploy-workers.yml`, which deploys
  each sibling whose directory changed, gated on its own tests and `tsc --noEmit`. Run at
  `2026-08-30T11:28:38Z` — `completed/success`. `getFeedSkeleton` now reads `value.bskyPostUri`
  rather than deriving a URI from the bundle rkey. The feed is still *empty*, and that is not a code
  fault: the one live `bskyPostUri` names a post that has since been deleted, so the AppView
  answers 0 items until a bundle is re-shared.

- **5 bundles have no document** (`coding-tools`, `parameter-svg`, `tomlarkworthy-at-login`,
  `tomlarkworthy-lopecode-tour`, `tomlarkworthy-malleable`). They are not armed in either content
  repo, so CI will not reach them; they need a republish from the Ledger's publish section.
- **2 legacy slug-keyed documents** (`tomlarkworthy-malleable`, `tomlarkworthy-lopecode-tour`) still
  point at `site.standard.publication/self`, which `.well-known` no longer answers, so they fail
  verification. Deliberately not deleted: deleting them removes those bundles' standard.site presence
  entirely, and republishing the two bundles fixes them properly. Delete `self` only after that.
- **The GitHub Pages build for `lopecode` has been failing since 2026-08-29**, before any of this
  work — Jekyll tries to render `design/**/*.prompt.md`, added with the design system. Unrelated to
  publishing, but it means the Pages-hosted notebooks are stale. A `.nojekyll` file or a `_config.yml`
  exclude fixes it.
- Owner-session paths are still code-reviewed only: `deleteBundleCascade`, `adoptLegacyCrossRefs`
  and a browser publish were exercised against a fake session in headless Chromium, never with real
  credentials.
- ~~The working checkout could not be switched to `main`.~~ **Resolved 2026-08-30** — parent and
  `lopecode.com` are both on `main`, with the three concurrent sessions' uncommitted files intact.

## 6. Card media (2026-08-30) — PR, not yet merged

Every post needs a title, a description and an image, on atproto *and* in the served page's
Open Graph tags. The binding constraint measured here was **generation, not storage**: 1 of 234
notebooks has an `og:image` today. `content.json` already holds 143/143 descriptions and 27
thumbnails, so the backfill is a data migration rather than authoring work.

**Decided.** The notebook `<head>` is the authority, not `content.json`; the atproto records mirror
it, because that is what standard.site consumes. `content.json` becomes *generated* from heads, and
its replicated fields are retired.

**Shipped as [lopecode.com#9](https://github.com/tomlarkworthy/lopecode.com/pull/9)** — lexicon
`com.lopecode.media`, the `lopecode-media` Worker on `images.lopecode.com`, and render emitting
`og:video` / `og:image:alt` / `twitter:card`. The one change to existing output:

```
before  og:image = ${pds}/xrpc/com.atproto.sync.getBlob?did=…&cid=…
after   og:image = https://images.lopecode.com/<did>/<cid>
```

atproto supports PDS migration, and a scraper that has cached a card never re-reads it — so the
"before" URL breaks permanently on a move, silently. The proxy resolves DID→PDS per request.

The rkey of a `com.lopecode.media` record **is** its poster blob's CID. That makes authorisation a
single `getRecord` against the key already in the URL (`poster.ref.$link !== rkey` → 404, on the
video path too), leaves `com.lopecode.bundle` unchanged because `coverImage` is already that blob,
and makes records immutable in practice. Measured: media 24 tests, render 36 tests, both
`tsc --noEmit` exit 0; live-driven against the real PDS under `wrangler dev`, where a real
`did:plc` 404s on `RecordNotFound` while `did:web:no-such-host.invalid` 502s — the split is what
shows the authorisation check firing rather than the network failing.

**Not verified:** no happy-path serve. No `com.lopecode.media` record exists yet, so byte delivery,
the real `content-type`/etag values and 304 revalidation rest on unit tests alone.

**Merge order:** apex redeploys itself through Workers Builds on push to main, and `wrangler.jsonc`
now binds `lopecode-media`. Deploy the media Worker before merging, or apex's deploy is expected to
fail on a dangling binding — reasoned from wrangler's binding validation, not observed.

**Deferred deliberately:** `modern-screenshot` poster generation (it struggles with complex DOMs, so
posters are upload-or-pick-from-the-notebook only); the `content.json` retirement itself, which
rewrites 143 multi-MB notebooks and needs its own PR; 9 of the existing thumbnails are mp4s and need
`ffmpeg -frames:v 1` poster frames.
