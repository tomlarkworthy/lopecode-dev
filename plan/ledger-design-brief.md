# Ledger redesign — design brief (v2, 2026-08-29)

v1 of this brief (same day) was misread: it discussed the feed at length and the designer produced
feed/ledger composites, a pane divider, and dropped the owner tools. v2 is Ledger only. Everything in
§1 is a hard boundary; everything in §2–§4 must appear in the artboards.

## 1. Scope — read first

**Design one thing: the `@tomlarkworthy/ledger` page, the profile page of one author.** It lives at
`lopecode.com/@handle`.

**Not your concern, do not draw it:**

- The Lopefeed. It is finished (`Lopefeed Dark` in this project). Do not redesign it, do not put it on
  an artboard with the Ledger, do not compose the two.
- The frame around the Ledger: tab bar, panes, splitters, dividers, "aside" layout. The host application
  (lopepage) puts the Ledger into a pane and handles all of that. You are designing the *contents of one
  pane*, edge to edge, on a plain `--theme-background`.
- The sign-in popover (handle / app-password / OAuth form). It is a shared widget from another module.
  Draw only its trigger button in the signed-out state (§3.3).

**What that pane is:** a scrolling column of `--theme-background` with the Ledger inside. It is shown
at two widths and must work at both without horizontal clipping:

- **860px** — the page on its own (desktop). Artboards at this width.
- **380px** — the same page in a narrow pane (a phone, or a side pane on desktop). Artboards at this
  width. There is no separate "mobile design": it is the one design reflowed.

**Theme:** `Theme near-midnight`. Colours only from `var(--theme-…)`; fonts only `--serif`,
`--sans-serif`, `--monospace`. Controls are `LopecodeDS.*` components. No hex. The feed used
`--serif` for reading text and `--monospace` for bylines, metadata and buttons; keep that.

## 2. What the page contains — the inventory

Everything below exists in the shipped page today (source lines are into the module; screenshots
`ledger-live-2026-08-29-1280.png` / `-390.png` in this zip show it at 1280 and 390). Nothing here is
optional unless marked *(drop)*. The current page is cream-on-dark with zero theme tokens, a 1060px
table clipped in a 390px pane, and its controls hand-drawn — that is what you are replacing.

### 2.1 Identity (header, L17–57)

| element | value today | note |
|---|---|---|
| avatar | `bskyProfile.avatar`, 64px | may be missing → monogram |
| display name | `bskyProfile.displayName` ("tom larkworthy") | |
| handle | `@larkworthy.bsky.social` | + a link out to `bsky.app/profile/<handle>` |
| bio | `bskyProfile.description` ("Computers and decentralization.") | may be empty |
| stats | `10 bundles · 93 modules · 316 files · 12.0M payload · 651 bsky.followers` | files = unique blobs |
| DID | `did:plc:j7nm3lrd5h7fm3sfhcv3lhfv` | plumbing; must remain findable and copyable |
| PDS host | `earthstar.us-east.host.bsky.network` | plumbing; may be null for non-`did:plc` |

### 2.2 Publish cadence (L59–70, L90–122)

A 12-week histogram of publishes, one bar per week, count label under bars, current week emphasised.
Today it is a fixed 720px Plot frame showing two bars. *(You may shrink or replace it with a compact
mark; you may not drop the information "when did this author last publish, how often".)*

### 2.3 The bundle table (L792–869) — the centre of the page

`Inputs.table` (DS `Table`), one row per published bundle, newest first, sortable by any column
header. 30 rows before its internal scroller. Columns, in order, with their formats:

| column | content | format |
|---|---|---|
| title | bundle title, a link to the live notebook (`webUrl`) | `(untitled)` when the record has none |
| when | `createdAt` | `2026-07-11 15:11` |
| bsky | companion Bluesky post | `♥49 ↻8` as a link when linked; a marked dot "not posted to Bluesky" when not; `…` while counts load |
| files | file count | integer |
| size | total bytes | `2.4M` / `12K` |
| modules | count of `@user/name` JavaScript modules | integer |
| rkey | record key | mono, e.g. `tomlarkworthy-virtual-monorepo` |
| cid | content id | truncated `bafyreibup…` |

Rows: whole-row click toggles selection when selectable; hover highlight; selected highlight.

**Selection rule:** the table is **multi-select (checkbox column) only when the viewer is the owner**
(§3.2). Visitors get no checkboxes and no bulk bar.

Above the table: `com.lopecode.bundle · 10 records` (left) and a hint (right) that reads
`click any header to sort` for visitors and `check rows to select · delete in bulk` for the owner.

### 2.4 Owner tools — the bulk bar (L306–729)

Appears **only** when `isOwner` **and** ≥1 row is selected. Sticky at the bottom of the pane. Two
layers:

**A. Selection summary + destructive action** (any selection count):

```
02 SELECTED   payload 4.8M · collection com.lopecode.bundle
              action 2 × com.atproto.repo.deleteRecord [· promote <title>  when exactly 1]
                                                       [cancel] [Delete 2 records]
```

- `Delete N record(s)`: destructive. Native confirm today: *"Delete N bundle(s) from your atproto
  repo? This cannot be undone."* Then the button reads `Deleting…`, both buttons disabled, and a status
  reports `N deleted` or `N deleted · M failed`. Design the confirm, the in-progress and the result.
- `cancel`: clears the selection.

**B. Promote — only when exactly one row is selected.** Two sub-panels:

*B1. Bluesky companion post*

```
state line:   linked · https://bsky.app/profile/…/post/…      |  ● not posted
row:          bsky  [Compose ↗] [URL input: https://bsky.app/profile/…/post/…] [Link | Change] [Unlink]
message line: (below)
```

- `Compose ↗` opens Bluesky's composer prefilled with the title + URL in a new tab, then focuses the
  URL field and shows *"Composer opened — paste the resulting Bluesky URL."*
- `Link` (reads `Change` when already linked) validates the pasted URL (*"paste a
  https://bsky.app/profile/…/post/… URL first"*), shows `resolving…`, may open an OAuth permission
  popup the first time (scope `repo:com.lopecode.bundle.crossRef`), then `✓ linked` or `error: …`.
- `Unlink` only when linked; confirms *"Unlink Bluesky post from "<title>"?"*, then `unlinking…`,
  `✓ unlinked`.

*B2. standard.site publication (federated discovery) + vanity URL*

```
row:     std.site ↗  [URL input, prefilled with the bundle's default web URL]  [▸ Publish… | ▸ Update… | ▾ Cancel]  [Unpublish]
form:    (disclosed by ▸ Publish…)   title [text, prefilled]   desc [textarea, 3 rows, "description (shown in feeds)"]   [Publish]
after:   at://did:plc:…/site.standard.document/<rkey>   (link, shown when published)
message: (below)
```

- On selection the page probes whether this bundle is already published (`getStdDoc`) and prefills
  title/description from the existing record; the button reads `▸ Update…` and `Unpublish` appears
  when it is. Probe failure: *"state check failed: …"*.
- `Publish` validates an absolute URL (*"paste an absolute URL (https://…)"*, *"invalid URL"*), may
  open one OAuth popup for three scopes, shows `publishing…`, then *"✓ published · indexers can
  discover this bundle"* and collapses the form; or `error: …`.
- `Unpublish` confirms *"Unpublish "<title>" from standard.site discovery? The bundle itself stays on
  your PDS — only the site.standard.document is deleted."*, then `unpublishing…`, `✓ unpublished`.
- If the URL differs from the default web URL it becomes the bundle's `webUrl` (the title link in the
  table changes).

Controls to use: DS `Button`, `TextInput`, `TextareaInput`, `Form`. Messages are inline text, not
toasts (the page has no toast system). Destructive buttons need a visibly different treatment; the DS
`Button` has no variant prop, so state how (token-styled wrapper).

### 2.5 Auth strip (L730–788) and "view another ledger"

Three states of one strip:

| state | shows |
|---|---|
| signed out | `● sign in to manage records · or browse a ledger below` + the viewer form + the **sign-in trigger button** (`● sign in ▾`, opens the shared popover — not yours) |
| signed in, own ledger | `● this is your ledger` (green marker) · `session · <handle>` · `scope · bundle:write, bundle:delete` · `select rows below to delete in bulk` + viewer form |
| signed in, someone else's ledger | `● viewing another ledger` (muted marker) · `session · <handle>` · `scope · …` + viewer form; **no** owner tools |

Viewer form: `view [text: "did:plc:… or handle.bsky.social", prefilled with the current handle] [View]`
— navigates to that author's ledger. Today it is the first control on the page; it can move (foot,
disclosure) but must exist.

Note the sign-in trigger renders as a 32px `● sign in ▾` button and, when signed in, a session chip
`@handle · oauth · pkce` with a `sign out` inside its popover — draw only the trigger/chip.

### 2.6 Bundle-level facts not shown today *(add)*

- **Versions.** Each bundle has a `previousVersion` chain (`com.lopecode.bundle.version`); the feed
  shows `vN` and a VERSIONS disclosure. The Ledger shows nothing. Add a version count/`vN` to the row
  or a per-row disclosure; the owner table stays the primary surface.
- **Description.** Records carry `description`; the table has no column for it. Show it somewhere a
  visitor can read it (row expansion, or a second line under the title).

### 2.7 Data available (nothing else exists)

Per bundle: `title`, `description`, `createdAt`, `files[] {id, mimeType, size}`, `cid`, `rkey`,
`webUrl` / `defaultWebUrl`, `bsky {url, uri, linkedAt}` + `{likeCount, repostCount, replyCount}`,
`standard {url}`, `previousVersion`. Per author: `handle`, `displayName`, `description`, `avatar`,
`followersCount`, DID, PDS host. No view counts, no tags, no followers list, no follow button.

Loading: handle → DID → profile → bundles → crossRefs → engagement is 5 sequential requests (~1–2s).
Caps: 100 bundles, no paging. Empty: an author with 0 bundles; a handle that does not resolve.

## 3. Rules

- **3.1 Reflow, never clip.** At 380px the 8-column table cannot fit. Decide and draw: horizontal
  scroll inside the table, a column subset with the rest in a row disclosure, or a card-per-row
  fallback. The bulk bar must also fit at 380px with all its controls reachable.
- **3.2 Owner gating.** Selection checkboxes, bulk bar, promote panels: `isOwner` only. Everything
  else identical for visitors and owners.
- **3.3 Sign-in popover is out of scope**; its trigger is in.
- **3.4 Plumbing demoted, not deleted.** DID, PDS, rkey, cid, at-URIs stay on the page in
  `--monospace`, out of the first read (disclosure, footer, secondary column).
- **3.5 Name every bespoke widget** (anything not a DS component and not plain text/layout) and say
  why a DS component could not do it. Expected: avatar, cadence mark, sticky bar container, status
  messages.
- **3.6 Single page.** No routes, no modals other than the native confirms listed (you may propose an
  inline confirm instead; say so).

## 4. Deliverables — artboards, each named exactly

At **860px**:

1. `ledger-visitor-860` — signed out; identity, cadence, 10-row table, auth strip, viewer form.
2. `ledger-owner-idle-860` — signed in as owner, nothing selected.
3. `ledger-owner-selected-3-860` — 3 rows selected; bulk bar layer A only.
4. `ledger-owner-selected-1-860` — 1 row selected; layers A + B1 + B2 with the std.site form
   **disclosed** and the bundle **already linked and published** (`Change`/`Unlink`, `▸ Update…`,
   `Unpublish`, at-URI visible).
5. `ledger-owner-deleting-860` — confirm state and the `Deleting…` / `2 deleted · 1 failed` result.
6. `ledger-other-860` — signed in, viewing someone else's ledger (no owner tools).

At **380px**:

7. `ledger-visitor-380`
8. `ledger-owner-selected-1-380` — the full promote stack at narrow width.

States (either width):

9. `ledger-loading` — skeleton for the 5-request load.
10. `ledger-empty` — author with 0 bundles; and `ledger-unresolved` — handle not found.

Plus a text note: the bespoke-widget list (3.5) and the 380px table decision (3.1).

## 5. Open questions (answer in the note, do not block on them)

- May the cadence histogram become a one-line mark (`2 this month · 10 total · last 2026-07-11`)?
- Should the promote panel (B) open as a per-row disclosure in the table instead of inside the sticky
  bar? Both are acceptable; the sticky bar is what exists.
