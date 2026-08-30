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

## Status 2026-08-30 — steps 1–9 and 11 done, not deployed

| step | landed in | verified by |
|---|---|---|
| 1 `.well-known` → TID pub; `at:standard.site:pub` meta | `lopecode.com` branch `publishing-simplify`, `render/src/publication.mjs` | built worker against live PDS: `200 at://…/site.standard.publication/3mndgo4hhre22`; 18 render unit tests |
| 2 feed reads `bskyPostUri`, `sort=createdAt&order=desc` | `feed/src/skeleton.mjs` | 6 unit tests; real contrail payload → one item. The one live `bskyPostUri` (`…/3mnehmlq3sd2d`) is a deleted post, so the custom feed is empty until a bundle is re-shared |
| 3 `did-` prefix | at-write `didHost` cell, used at both sites | code read |
| 4 `did-*.lopecode.com/` → Ledger | `src/worker.js` commit `45f4f1e` | — |
| 5 Ledger reads `bundle.stdDocUri`; std publish/unpublish UI removed (always-on) | `@tomlarkworthy/ledger` | headless Chromium: 10 rows, `std ✓` on `atproto`, 0 errors |
| 6 Ledger bsky column reads `bundle.bskyPostUri`; crossRef code deleted; owner "Adopt legacy links" → at-write `adoptLegacyCrossRefs` | ledger + at-write | not run against the PDS (needs a session) |
| 7 bylines: render page pill + `<link rel=author>` (suppressed on `/` and `/@handle` via `x-lopecode-byline: off`); Lopefeed byline → `lopecode.com/@handle`; Ledger → `← Lopefeed` | render worker, lopefeed, ledger | worker driven in node; lopefeed `card()` under linkedom |
| 8 `publisher()` mounted in the Ledger for the owner; `publishEntry` deleted | ledger, at-write | not exercised (needs a session) |
| 9 CI writes pub + doc before the bundle; carries `bskyPostRef`; backfills bundles lacking `stdDocUri` even when files are unchanged | `tools/atproto-publish.ts`, `tests/tools/atproto-publish.test.ts` | 5 tests against the real at-write cells with a faked PDS; no credentialed run |
| 11 cascading delete (`deleteBundleCascade`, post opt-in); Lopefeed version chain removed; feed `sort` | at-write, ledger, lopefeed, feed | code read |

Also fixed while there: at-write never wrote `updatedAt` on a doc rewrite and never wrote `bskyPostRef` (the doc is written before the post exists — now rewritten once more after the post, with its CID); a republish with Share off dropped `bskyPostRef`. `Inputs.table` skips `format` for null cells, so the Ledger carries `''` sentinels.

Not done: step 10 (backfill) needs the owner's session — see "To finish" below. `did:web` authors still unroutable (a dotted subdomain is outside the wildcard cert; `didHost` now throws for them).

**To finish, in order:**
1. Push `lopecode.com` `publishing-simplify` (auto-deploys), then check `curl https://did-plc-….lopecode.com/.well-known/site.standard.publication` returns the TID URI and `/r/atproto` carries `<link rel="site.standard.document">`.
2. Open `lopecode.com/@larkworthy.bsky.social`, sign in, click "Adopt legacy links" (4 crossRefs → `bskyPostUri`), then publish each of the 9 bundles without a doc from the Ledger's publish section (or push a no-op change to the armed ones — CI now backfills the doc).
3. Run site-validator.fly.dev on `at://…/site.standard.document/3mndgo4lxe72o`.
4. Delete `site.standard.publication/self` and the 4 slug-keyed docs once nothing points at them.
5. Rebase the Ledger redesign draft (`tools/scratch/ledger-redesign-wip-20260830.js`) onto the new canonical; update `plan/ledger-design-brief.md` §2.3 (bsky column reads the bundle; std column; publish section) before handover.
