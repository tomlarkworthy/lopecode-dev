# Ledger survey — evidence for a design-system redesign

Date 2026-08-29. Subject `@tomlarkworthy/ledger`, canonical `lopecode/notebooks/ledger.html` (`modules/canonical.json`). Module script block 60,725 B;
the deployed copy at `https://lopecode.com/@larkworthy.bsky.social` is 60,727 B — **repo and production match**, so the repo is safe to redesign
against. Line refs are into the decompiled module (`lope-reader.ts --get-module @tomlarkworthy/ledger`), 1283 lines, 27 cells.

## 1. What Ledger renders today

`ledgerView` (L1–89) is the only cell that lays out the page; everything else is data or a fragment. Order, all inside one hard-styled `<div>`:

| # | fragment | line | shows | reads |
|--|--|--|--|--|
| 1 | `ledgerView` header | L17–37 | avatar `<img>` 64px, displayName, `@handle` with `⇄` link to bsky.app, right-aligned `did` + `pds` hostname | `bskyProfile`, `did`, `pds` |
| 2 | stat strip | L39–50 | 5 stats: bundles / modules / files / payload / bsky.followers, via a local `stat(v,label)` helper (L4) | `stats`, `bskyProfile` |
| 3 | bio paragraph | L52–57 | `bskyProfile.description` | `bskyProfile` |
| 4 | `authStrip` | L730–788 | sign-in banner or session banner + "view another ledger" form | `currentSession`, `isOwner`, `loginWidget` |
| 5 | cadence block | L59–70 | label `PUBLISH CADENCE · LAST 12 WEEKS` + framed chart | `cadenceChart` |
| 6 | table header row | L72–84 | `com.lopecode.bundle · N records` and a right-side hint that flips on `isOwner` | `stats`, `isOwner` |
| 7 | `viewof ledgerTable` | L792–869 | the `Inputs.table` | `rows`, `isOwner` |
| 8 | `bulkBar` | L306–729 | sticky bottom action bar, owner-only, only when rows are selected | `selectedRows` and 20 other deps |
| 9 | md cell `_23` | L1054–1247 | ~190 lines of design prose (crossRef / version / standard.site spec). Renders as visible page content below the app. | `md` |

Non-UI cells: `stats` L123, `cadence` L150, `bskyProfile` L171, `pds` L182, `rows` L197, `bundles` L226, `did` L242, `params` L254, `isOwner` L298,
`bskyHelpers` L871, `crossRefs` L917, `bskyEngagement` L947, `writeCrossRef` L983, `deleteCrossRef` L1037, + 2 refresh mutables.

### Controls
**`Inputs.table`** is the *only* Observable Input in the module (L793): `columns:[title, when, bsky, files, size, modules, rkey, cid]`,
`width:'100%'`, `multiple: isOwner`, `required:false`, `layout:'auto'`, `rows:30`. `format` fns L802–834 — title → `<a href=webUrl>`, when →
`ISO.slice(0,16)`, size → `12K`/`2.4M`, rkey → orange mono, cid → 10-char truncation, bsky → `♥N ↻M` link or an orange `●`. L836–856 reaches *into*
the rendered DOM: `table.style.maxWidth='none'`, a random-class `<style>` for row hover / `:has(input:checked)`, and a `MutationObserver` re-wiring
whole-row click→checkbox on every tbody mutation. Everything else is bespoke `htl`: viewer `<input>` + View `<button>` (L735–737); in `bulkBar` —
`cancel` (L339), `Delete N records` (L353), bsky URL `<input>` (L426), `Compose ↗`/`Link|Change`/`Unlink` (L427–429), std URL `<input>` (L468), std
title `<input>` (L469), std description `<textarea>` (L470), `▸ Publish…`/`Publish`/`Unpublish` (L471–473), `<form>` (L474).

### Actions
bulk delete (`deleteBundle` → `com.atproto.repo.deleteRecord`, L367, `confirm()`-guarded) · link/unlink bsky post (`writeCrossRef`, L440/L457) ·
compose on bsky (intent URL, L432) · publish to standard.site (`publishToStdSite`→`publishStdPub`+`publishStdDoc`, L607) · unpublish
(`unpublishStdDoc`, L654) · sign in (`loginWidget()`, L762) · view another ledger (writes `location.hash`, L744).

### What `@tomlarkworthy/at-login` contributes
Imported at the bottom of `define()`: `currentSession`, `xrpc`, `loginWidget`, `ensureScopes`. `currentSession` is a mutable seeded from
`safe-local-storage` key `atproto.session.v1`; `loginWidget` is a ~230-line bespoke DOM widget (at-login L23). Signed in → `isOwner =
currentSession.did === did` (L298) → table becomes multi-select, `bulkBar` stops returning an empty `<span>` (L307), the table hint flips to "check
rows to select · delete in bulk" (L80), and `authStrip` swaps the sign-in banner for a session banner with a green/grey left border (L768–787).
`ensureScopes` drives incremental-OAuth popups for `repo:com.lopecode.bundle.crossRef`, `repo:site.standard.publication`,
`repo:site.standard.document`.

### How the page takes its subject — `params` (L254–297) → `did` (L242–253)
```js
const parsePath = () => { const m = (location.pathname||'').match(/^\/@([^/?#]+)/);   // L256-259
                          return m ? decodeURIComponent(m[1]) : null; };
const parseHost = () => { const m = (location.hostname||'').match(                    // L260-263
                            /^did-([a-z]+)-([a-z0-9]+)\.lopecode\.com$/i);
                          return m ? `did:${m[1]...}:${m[2]...}` : null; };
// parseHash() splits location.hash on & into k=v                                     // L264-280
return { did: h.did || parseHost() || null, handle: h.handle || parsePath() || null }; // L282-287
// then, in `did`:
if (params.did) return params.did;                                                    // L244
if (params.handle) { … resolveHandle … return (await r.json()).did; }                 // L245-250
return 'did:plc:j7nm3lrd5h7fm3sfhcv3lhfv';   // dev fallback (tomlarkworthy)          // L251
```
Re-notified on `hashchange` and `popstate` (L290–291). **There is no `?handle=` query-string path** — only `/@handle`, `#handle=`, `#did=`, and the
`did-plc-xxx.lopecode.com` subdomain.

### Cadence chart (`cadenceChart`, L90–122)
`Plot.plot({height:70, width:720, marginLeft/Right:0, marginTop:4, marginBottom:16, x:{type:'band',ticks:[]}, y:{axis:null}})`, a `Plot.rectY` (fill
`#c54f2b` current week else `#e8a991`) + a `Plot.text` count label. Fed by `cadence` (L150–170): 12 fixed 7-day buckets `{weekIdx, weekStart, count}`,
`weekIdx` 0 = most recent. **Fixed 720px width — does not respond to the container.**

## 2. Data

| call | line | notes |
|--|--|--|
| `https://contrail.lopecode.com/xrpc/com.lopecode.bundle.listRecords?did=…&limit=100` | L228–231 | the bundle list. **Hard cap 100, no cursor paging.** `bundlesRefresh > 0` inserts an 800 ms delay because contrail is not read-after-write consistent (L233–236). Sorted desc by `value.createdAt`. |
| `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=…` | L247 | handle → did |
| `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=<did>` | L174 | `handle, displayName, description, avatar, followersCount` |
| `https://plc.directory/<did>` | L187 | picks the `AtprotoPersonalDataServer` service endpoint → `pds` hostname; returns null for non-`did:plc:` |
| `https://<pds>/xrpc/com.atproto.repo.listRecords?repo=<did>&collection=com.lopecode.bundle.crossRef&limit=100&cursor=…` | L923–927 | **does page** — up to 5 pages of 100 (L921); 600 ms settle delay on refresh |
| `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=…` | L962–964 | batched 25 URIs at a time (L959); yields `{likeCount, repostCount, replyCount}` |
| `com.atproto.repo.{getRecord,putRecord,deleteRecord}` on `com.lopecode.bundle.crossRef` | L988–1035 | via `xrpc` from at-login; patch-merge, record deleted entirely when neither `bsky` nor `standard` survives (L1006) |
| `com.atproto.repo.uploadBlob` | L596 | uploads a recoloured copy of the page favicon as the std.site `coverImage` |

`rows` (L197–225) shape: `{rkey, title, when:Date, files, size, modules, cid, uri, defaultWebUrl, webUrl, bsky, bskyStats, standard}`; `defaultWebUrl
= https://<did-with-:→->.lopecode.com/r/<rkey>` (L204). `stats` (L123–149) dedupes blobs by `f.blob.ref.$link`, so `files` is a *unique blob* count.

**`com.lopecode.bundle.version` is documented (L1077–1100) but never read — no UI.** The deployed lopefeed already range-scans it (`versionsFor`).
**No idb or localStorage caching** in ledger; `localStorage` is touched only to sniff OAuth scopes (L382, L530). Every navigation refetches all.

## 3. Styling today

Hard-coded, zero tokens: `grep -c -- '--theme' → 0`; 17 distinct hex colours, 100 occurrences — `#7a6f5e`×26, `#c54f2b`×17, `#1a1814`×11, `#d8cdb4`×8,
`#b6aa92`×7, `#1f4fb0`×7, `#f5efe5`×6, `#1a7a3a`×4, `#fcf6ec`×3, `#efe7d8`/`#e8d8b8`/`#3a342b`×2, singletons `#fff7e6 #f5e9d0 #e8a991
#d6c8b0 #2e7d32`. 30 `font-family:` declarations, all naming `'Source Serif 4',Georgia,serif` /
`'Inter Tight','Helvetica Neue',…` / `'JetBrains Mono',ui-monospace,monospace` literally. A **cream/ink editorial palette hard-wired into a notebook
that boots a dark theme.**

Boot: `bootconf.json` (the real one, 234 bytes) —
```json
{"mains":["@tomlarkworthy/lopepage-2","@tomlarkworthy/ledger","@tomlarkworthy/save-in-place","@tomlarkworthy/module-selection"],
 "hash":"#view=S100(@tomlarkworthy/ledger,@tomlarkworthy/module-selection)","headless":true}
```
Theme assets are notebook-kit CSS shipped as `<script type=text/plain>` blocks keyed by their raw.githubusercontent URLs at pin `6c2ec69`:
`global.css`, `inspector.css`, `highlight.css`, `plot.css`, `index.css`, **`theme-ocean-floor.css`**, `abstract-dark.css`, `syntax-dark.css`. Measured
live: `body` colour `rgb(220,220,238)` = `#dcdcee` = `--theme-foreground` of **ocean-floor**, not near-midnight (`#dfdfd6`). Retheming is a
theme-asset swap, separate from the module edit.

`file://syntax.css` (804 B, the notebook's one file attachment) is not ledger-specific: it centres `.lopecode-visualizer` at `max-width:1200px` and
maps `.hljs-*` highlight.js classes onto the `--syntax-*` variables. One rule (`.hljs-deletion,.hljs-variable{color:#e377c2}`) is still hex.

## 4. Live render — 2026-08-29

`tools/screenshots/ledger-live-2026-08-29-1280.png`, `-390.png`, `ledger-context-lopefeed-2026-08-29.png`. Both ledger loads: **0 page errors, 0
console errors**. Counts, identical at both viewports: 4 `<table>`, 25 `<svg>`, 12 `<button>`, 69 `<input>`, 1 `<select>`, 176 `<a>`, 1 `<img>`, 0
`<article>` (the extra tables/inputs belong to the `module-selection` tab). `document.title` = `Ledger`. `scrollHeight === viewport height` at both
sizes because lopepage-2's root is `position:fixed; inset:0; height:100vh; overflow:hidden` (lp2 L820–827) — the page never scrolls; panes scroll
internally.

**Overflow at 390px:** `table.ledger-table-*` is **1060px wide at x=32 in a 390px viewport**, as are its `thead/tbody/tr` (14 elements); six
`span.observablehq--string` inspector nodes measure 607–860px at x up to 2347px; one `<pre>` is 424px at x=-17. lopepage-2 clips rather than scrolls,
so seven of the eight columns are unreachable.

1280: a cream editorial card (`#f5efe5` paper, `#1a1814` ink) sitting inside near-black lopepage-2 chrome — tab bar and everything below the card are
dark, the card is light. Serif display name, mono metadata, a two-bar cadence chart lost in a wide empty frame. Defects: the "view" text input renders
**light-on-light, its value invisible** (theme input CSS assumes dark); below the card the runtime inspects `cadenceChart = SVGSVGElement`, `stats =
Object {…}` etc. as raw dark inspector rows — the module's data cells leak into the page.

390: header wraps to two lines, the `did`/`pds` block is clipped mid-word ("did:plc:j7nm3lr…", "east."), stats wrap to two rows, the View button is
pushed off-screen, the table shows the `title` column only, and the cadence chart keeps its 720px width and is cropped.

Feed (context): near-black `#0b0b16`-family ground, `#dcdcee` text, big Source Serif headline, mono byline/meta, 860px centred column, 44/56px
padding, hairline rules between cards, `Open ↗` / `Download` buttons, `▸` disclosure rows for MODULES / VERSIONS / RECORD. One console 400 (a resource
fetch). Its own defect: the `Inputs.search` box and buttons keep a pale filled background that fights the dark ground.

## 5. How blog notebooks open an "aside"

It is **not** an `<aside>` element, not a media query, not an iframe. It is a **lopepage-2 hash link**. Single cell, `@tomlarkworthy/lopecode-tour`
cell name `aside` (tour source L594–599):

```js
const _16ah2zf = function _aside(html){return(
(title, module_names) =>
  html`<a href="#view=R100(S50(@tomlarkworthy/lopecode-tour),S50(${module_names.join(",")}))">${title}</a>`
)};
```
Used inline in prose ~20 times, e.g. `${aside("Runtime SDK", ["@tomlarkworthy/runtime-sdk", "@tomlarkworthy/module-map", "@tomlarkworthy/cell-map"])}`
(tour L233). Clicking rewrites the hash; lopepage-2 parses it (`R`→`row`, `C`/`S`→`col`, lp2 L90/L124) and `lp2_renderSplit` (lp2 L1187–1218) lays
children out as `display:flex; flexDirection:row` with draggable splitters and `flex:<size> 1 0` slots. Several module names inside one `S50(...)`
become one tabbed stack.

**Caveats for the brief:**
- `@tomlarkworthy/virtual-monorepo` has **no** aside mechanism — 9 plain `md` cells, hash `#view=S100(@tomlarkworthy/virtual-monorepo)`. `lopecode-tour` is the only implementation.
- lopepage-2 has **no responsive behaviour at all**: `grep -iE 'matchMedia|@media' lp2 → 0 hits`. "On mobile underneath" is *not* currently implemented — `R100` stays a horizontal split at 390px. Getting it needs either a `matchMedia` that emits `C100(…)` instead of `R100(…)`, or a media query added to `lp2_renderSplit`.
- It **can** host a second module: the layout string names any module present in the notebook, and the target module must be listed in `bootconf.mains` (or lazily booted) to exist. Bundling ledger into lopefeed is exactly this: add `@tomlarkworthy/ledger` to the notebook and to `mains`, then link `#view=R100(S60(@tomlarkworthy/lopefeed),S40(@tomlarkworthy/ledger))#handle=…`.

## 6. Ledger ↔ feed data overlap

Reusable as-is by a per-author aside: `bskyProfile` L171, `pds` L182, `bundles` L226, `stats` L123, `cadence` L150 + `cadenceChart` L90, `rows` L197,
`crossRefs` L917, `bskyEngagement` L947, `params`/`did` L254/L242. Not reusable without a rewrite: `ledgerView`, `authStrip`, `bulkBar`, `viewof
ledgerTable` — all hard-styled cream.

Already duplicated: the feed has its own `handles` cell (`app.bsky.actor.getProfile` per did), its own `contrail listRecords` call, and links out with
`https://lopecode.com/@${handle}` (feed L62). Ledger's `bundles` is that same endpoint filtered by `did`.

Bundling cost (`lope-reader.ts`, no args): `lopefeed.html` = 55 modules / 2,529,923 B; `ledger.html` = 61 modules / 2,573,962 B. lopefeed **already
ships** `at-login` (43,764 B), `at-write` (102,360 B), `atproto`, `lopepage-2` (82,890 B) and every runtime module ledger uses, and already has the
`syntax.css` attachment (ledger declares no others). So the marginal cost is essentially **the ledger script alone, 60,725 B** (~2.4% of the feed's
2.53 MB). Ledger's remaining dependency, `Plot`, is a builtin. ~9 KB of the 60 KB is the 190-line spec `md` cell (L1054) — pure prose, free to drop.

## 7. Design-system fit

DS is `lopecode/design` — React wrappers over Observable Inputs, styled only by `var(--theme-…)`; 17 components: **Button, Checkbox, Color, DateInput,
DatetimeInput, FileInput, Form, NumberInput, Radio, Range, Search, Select, Table, TextInput, TextareaInput, Theme, Toggle**.

| Ledger control | DS component | note |
|--|--|--|
| `Inputs.table` (L793) | **Table** | direct; `Table`/`Search` take an array of row objects and `Search` emits filtered rows into a `Table` — matches the deployed feed's search+sort pattern |
| viewer did/handle field + View (L735–737) | **TextInput** + **Button** | `Form.fields` if kept as one row |
| bsky post URL field (L426) | **TextInput** | |
| Compose / Link / Change / Unlink / Delete / Publish / Unpublish / Cancel (L339,353,427–429,471–473) | **Button** | reports `onClick(count)`; no variant/severity prop, so destructive red must come from token styling on the wrapper |
| std vanity URL (L468), std title (L469) | **TextInput** | |
| std description (L470) | **TextareaInput** | renders 640px wide — per conventions, grid tracks holding it must be `minmax(0,1fr)` |
| std publish `<form>` (L474) | **Form** | |
| sort-by-header (currently `Inputs.table` built-in) | **Select** | if an explicit sort control is wanted, as the deployed feed does |

**No DS equivalent** — hand-build with tokens:
- **cadence chart** — Plot; DS has no chart component. Recolour `#c54f2b`/`#e8a991` → `--theme-foreground-focus` / a `color-mix` of it, label fill → `--theme-foreground-muted`, drop the fixed `width:720`.
- **avatar `<img>`** — no DS Image/Avatar component.
- **login widget** (`at-login.loginWidget`) — 230 lines of bespoke DOM in a *shared* module; DS cannot wrap it, so restyle it there or wrap it in a token-styled container.
- **stat strip**, **eyebrow labels**, **sticky bulk bar**, **status/error text** — layout glue; conventions say `var(--…)` only.
- **DID/PDS/at-URI metadata** — use `--monospace`; the module's literal `'JetBrains Mono'` is not the DS mono (`Spline Sans Mono Variable`).

**The precedent already exists — and it is not in the repo.** The deployed `@tomlarkworthy/lopefeed` at `https://lopecode.com/` is 37,668 B with **52
`--theme-*` uses and 0 hex colours**. The repo copy (`lopecode/notebooks/lopefeed.html`, last touched 2026-08-25 by `9b700d7`) is 16,678 B, 6 cells,
and still carries a `LOPE = {paper:'#f5efe5', ink:'#1a1814', …}` palette object at feed L4–20. The deployed version has a dedicated `feedStyle` cell
holding one `<style>` of `.lf-*` classes, one `@media (max-width:600px)` breakpoint (restacks the byline, `flex:1 1 100%` on the control row, shrinks
type), and `viewof search` / `viewof sort` / `viewof limit` / `modulesTable` built from `Inputs`. Full cell list: `feedView, renderList, card,
feedStyle, modulesTable, versionsFor, threadFor, viewof search, viewof sort, viewof limit, matches, list, rows, feedRecords, feedFirstPage,
feedCursor, loadMorePage, viewof morePages, fmtBytes, fmtRel, dids, handles, downloadHelpers`. That is the shape the ledger redesign should copy — and
it should be pulled back into the repo before ledger work starts, or the next sync/jumpgate will revert it.
