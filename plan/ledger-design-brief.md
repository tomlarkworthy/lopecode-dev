# Ledger redesign — design brief

Written 2026-08-29 for the designer who did **Lopefeed Dark** (Claude Design project
`019de8ff-e26d-76b0-8278-169b9d2296c1`, bound to the Lopecode Design System). Ledger is the second half
of the same job: the author page, and now also a panel that opens *inside* the feed. Please add the
Ledger artboards to that project so the two share tokens and card grammar.

Evidence: the `@tomlarkworthy/ledger` module source (1283 lines, 27 cells; line refs below are into
it), `specs/atproto.md`, and renders of https://lopecode.com/@larkworthy.bsky.social taken 2026-08-29
(`ledger-live-2026-08-29-1280.png`, `-390.png`; `ledger-context-lopefeed-2026-08-29.png` is the shipped
dark feed for context). Survey: `plan/ledger-survey-2026-08-29.md`.

## What Ledger is

The profile page of one author on lopecode.com: `lopecode.com/@handle` (the apex Worker proxies it to
the published `ledger` bundle, `lopecode.com/src/worker.js` L15–26). Everything an author has published
as `com.lopecode.bundle`, plus the only signed-in surface in the system: when the viewer's atproto
session DID equals the page's DID (`isOwner`, L298) the table becomes multi-select and a sticky bar
offers bulk delete, link/unlink the companion Bluesky post, and publish/unpublish to standard.site.

Rendered today (one `ledgerView` cell, L1–89, top to bottom):

```
header      avatar 64px · displayName (serif) · @handle ⇄ bsky link      did:plc:… / pds hostname (right)
stat strip  10 bundles · 93 modules · 316 files · 12.0M payload · 651 bsky.followers
bio         "Computers and decentralization."
auth strip  ● SIGN IN TO MANAGE RECORDS · OR BROWSE A LEDGER BELOW   [view ______][View]   [● SIGN IN ▾]
cadence     PUBLISH CADENCE · LAST 12 WEEKS   (Plot.rectY, 12 weekly bars, fixed 720px wide)
table       COM.LOPECODE.BUNDLE · 10 RECORDS            click any header to sort
            title | when | bsky | files | size | modules | rkey | cid      (Inputs.table, rows:30)
bulk bar    (owner only, when rows selected) Delete N · bsky post URL + Compose/Link/Unlink ·
            std.site URL/title/description + Publish/Unpublish · Cancel
```

## Defects in the live render (2026-08-29)

1. **Cream card in dark chrome.** 17 hex colours (100 uses), 30 literal `font-family` declarations,
   zero `--theme-*` tokens (`grep -c -- '--theme'` → 0) — inside a notebook that boots the
   *ocean-floor* dark theme. Same defect the feed had; fixed there by construction.
2. **Unusable at 390px.** The table is 1060px wide in a 390px viewport and lopepage-2 clips instead of
   scrolls, so 7 of 8 columns are unreachable; the did/pds block truncates mid-word ("east."); the
   View button is off-screen; the cadence chart keeps its 720px width and is cropped.
3. **Invisible input.** The "view" field renders light-on-light (theme input CSS assumes a dark ground).
4. **Runtime leaks below the card.** `cadenceChart = SVGSVGElement`, `stats = Object {…}` render as
   raw inspector rows under the page (visible in the 1280 render).
5. **Plumbing in reading order.** `did:plc:…`, PDS hostname, rkey and cid columns sit in the header and
   the table; a reader wants title, when, what it is.
6. **The cadence chart says almost nothing.** Two bars in a 720×70 frame for this author; every author
   today has ≤10 bundles.
7. **Actions are spread over a 400-line bespoke bar** (L306–729): 8 buttons, 5 text fields, 1 textarea,
   all hand-built `htl`. Only `Inputs.table` is an Observable Input.
8. **No versions.** `com.lopecode.bundle.version` is documented in the notebook's own prose (L1077) but
   never read; the feed already shows version chains, the author page does not.

## The new requirement: Ledger as an aside of the feed

Clicking an author's handle on the feed currently opens `bsky.app/profile/…` (feed `card` cell). It
should open the author's Ledger **inline**: on desktop a panel beside the feed, on a phone stacked
beneath the card list. Ledger will be bundled into the feed notebook for this (marginal cost 60 KB on a
2.5 MB file: the feed already ships `at-login`, `at-write`, `atproto` and `lopepage-2`).

How lopecode does this today, so the panel is designed for what exists: a blog notebook
(`@tomlarkworthy/lopecode-tour`, cell `aside`, L594–599) links to a lopepage-2 layout hash
`#view=R100(S50(main),S50(other))`, which lopepage-2 renders as a horizontal flex split with a draggable
divider and a tab strip per pane. Two constraints follow:

- lopepage-2 has **no responsive behaviour** (`matchMedia|@media` → 0 hits in its source): a row
  split stays side-by-side at 390px. "Underneath on mobile" is new work either in lopepage-2 or by
  having the feed host the panel itself with a media query. Design the panel so it works as *both*: a
  ~40% column at ≥1000px, full-width block under the list at ≤600px.
- The panel is the ledger *module* rendered narrow, not a separate mini-design. One Ledger layout that
  reflows from 380px (panel) to 860px (own page).

States the aside needs: closed (today's feed); open beside the feed at 1280 with the clicked author;
open beneath the list at 390; switching author (click a second handle — the panel re-targets, it does
not stack); close affordance; loading (handle → DID → profile → bundles is 4 requests, ~1s).

## Constraints

- **Design system only.** Same rules as the feed: `LopecodeDS.*` for controls, `var(--theme-…)` for
  every colour, the three DS font stacks (`--serif` reading text, `--monospace` plumbing/controls — the
  shipped feed put its buttons on mono to match; keep that), `Theme near-midnight`. No hex.
- **Same card grammar as the feed.** A bundle on the author page and a bundle on the feed are the same
  thing; the reader should recognise it. Reuse the feed's byline/title/summary/actions/disclosures
  vocabulary; do not reinvent a table grammar for the same record. (The dense table is the *owner's*
  tool, see M4.)
- **Two audiences on one page.** A visitor deciding what to open; the owner managing records. The owner
  surface appears only when signed in as that DID (`isOwner`). Design both, and the transition
  (sign in → same page, more affordances; no route change).
- **Data is only what the record carries** — per bundle: `title`, `description`, `createdAt`, file
  list (count, unique-blob size, module count), `cid`, `rkey`, `bskyPostUri` (+ like/repost/reply
  counts via `getPosts`), `previousVersion` chain, standard.site link. Per author:
  `handle`, `displayName`, `description`, `avatar`, `followersCount`, DID, PDS host. No views, no tags,
  no follow button (there is no lopecode social graph).
- **It will be rebuilt in htl + Observable Inputs**, so DS components are cheap and bespoke widgets
  cost; name every bespoke widget you introduce (the feed brief's rule 4).
- The page must also stand alone at `lopecode.com/@handle` — bookmarkable, and it is what a Bluesky
  link card lands on.

## Must have

| # | feature | why |
|---|---|---|
| M1 | Dark, token-only Ledger under near-midnight, in the feed's vocabulary | defect 1; one theme everywhere |
| M2 | Reflows 380 → 860px with no clipped content; the aside states above | defect 2; the new requirement |
| M3 | Identity block: avatar, name, handle, bio, publish count, first/last published; DID + PDS demoted to a disclosure or copyable footer | defect 5 |
| M4 | Visitor view = list of bundle cards (feed grammar, sorted newest); owner view = the dense selectable table with the bulk bar, as a DS `Table` | two audiences; the table is the management tool, not the reading view |
| M5 | Owner actions as DS `Button`/`TextInput`/`TextareaInput`/`Form`: Delete N (destructive, confirm), link/unlink bsky post, publish/unpublish to standard.site, cancel selection | M7 of the feed brief said "signed-in actions live in Ledger" — this is that surface |
| M6 | Sign-in state: signed-out invite (one line, not a banner), signed-in-as-owner marker, signed-in-as-someone-else (no owner tools) | `authStrip` L730–788 |
| M7 | Version chain per bundle, same disclosure as the feed | defect 8 |
| M8 | Search over the author's bundles (`Search`, columns title/module ids) once the list passes ~12 | feed parity |

## Want

| # | feature | notes |
|---|---|---|
| W1 | Cadence as a small inline mark (sparkline-per-author or "N this month · N total") rather than the 720px histogram | defect 6; a chart is a bespoke widget — only if it earns its place |
| W2 | "View another ledger" as a `TextInput` + `Button` at the foot, not a banner in the header | today it's the first control on the page |
| W3 | Bluesky engagement (♥ ↻ 💬) on the card byline when a companion post exists | data is already fetched (`bskyEngagement`, L947) |
| W4 | Empty states: author with 0 bundles; handle that does not resolve; DID with no PDS (`pds` null for non-`did:plc`) | all three occur |
| W5 | Loading skeleton for the aside (4 sequential requests) | |

## Not in scope

Editing a bundle's title (rename = delete + re-publish, unresolved in `specs/atproto.md` step 15).
Follower graphs or social actions. Changing any atproto record shape. The lopepage-2 tab bar (it frames
both pages; it is already dark).

## Deliverables

1. Ledger page at 860px (own page): visitor, signed-in owner with 3 rows selected and the bulk bar
   open, signed-in non-owner.
2. Feed + Ledger aside at 1280 (panel beside the list) and at 390 (panel beneath), with the feed as
   shipped in Lopefeed Dark.
3. Ledger at 380px panel width: identity block, list, owner table (how does the 8-column table
   survive — horizontal scroll inside the panel, or a column subset?).
4. Empty and loading states (W4, W5).
5. The list of bespoke widgets and why a DS component could not do each.

## Open questions

- Should the owner's dense table replace the card list when signed in, or sit beneath it as a
  "Manage" section? (Replace halves the page; beneath keeps the visitor view stable.)
- Keep the "Ledger" name and the `com.lopecode.bundle · N records` ledger metaphor, or drop it with
  the cream look as the feed dropped "№ / vol."?
