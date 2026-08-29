# Lopefeed redesign — design brief

Written 2026-08-29 for a designer working in Claude Design with the **Lopecode Design System**
project (`69267aa4-420f-4bb0-bb9c-15b738446e84`; source `lopecode/design`). Evidence: the
`@tomlarkworthy/lopefeed` module source, `specs/atproto.md`, and a render of https://lopecode.com/
taken 2026-08-29 (`tools/screenshots/lopefeed-live-2026-08-29.png`, untracked; embedded in the published brief).

## What lopefeed is

The discovery feed for notebooks published on atproto, and the homepage of lopecode.com (the apex
Worker proxies `/` to the `lopefeed` bundle, `lopecode.com/src/worker.js`). One `article` per
published bundle, newest first; every download goes browser → author's PDS, the central infra only
renders. It is itself a notebook: the page is one `htl` cell (`feedView`) rendered inside lopepage
chrome, republished to atproto by CI on every change.

## What ships today (2026-08-29)

11 cards, all by one author, 12 download buttons, no page errors. Per card, from the source:

```
left rail (110px, mono 9.5px):  № 001 · 2026-07-11 · rkey tomlarkw · cid bafyreibup… · files 84 · size 2.4MB
right column:                   avatar · @handle · ⇄ bsky · displayName
                                <h2> title (serif 28px, links to webUrl)
                                [summary paragraph — omitted when empty, which is every card today]
                                ▸ open bundle  84 blobs · 2.4MB  ↗ did-plc-….lopecode.com/r/…   |  ⬇ DOWNLOAD
                                MODULES ↓  4 module links  +48 more ▾
```

Controls: one download button per card, one download link per module. No search, sort, filter,
pagination or preview. Data: Contrail `com.lopecode.bundle.listRecords`, `limit=50`, no cursor;
one `app.bsky.actor.getProfile` per author.

Styling is a hard-coded object in the cell, not tokens:

```
paper #f5efe5  ink #1a1814  accent #c54f2b  link #1f4fb0
serif "Source Serif 4"   sans "Inter Tight"   mono "JetBrains Mono"
```

This was the "cream" aesthetic from the 2026-05 Claude Design hub (`specs/atproto.md` L28-33).
That hub's source (`feed-c.jsx`, `shared.jsx`) is not on this machine; the design system replaces
it as the source of tokens.

## Defects visible in the live render

1. **The cream page sits inside dark lopepage chrome** — a dark tab bar over a cream sheet, two
   palettes on one screen. The redesign fixes this by construction (one theme, everywhere).
2. **Title falls back to the module id.** Card 2 reads `@tomlarkworthy/lopecode-tour`; `title:
   b.value?.title || '(untitled)'`. The publish side now pins titles (`specs/atproto.md` L808), but
   old records will keep showing ids — the design needs a treatment for an id-shaped title.
3. **Every card is one author.** With one publisher, the byline row repeats 11 times; the design
   should read well at 1 author and at 30.
4. **No summary on any card** — the field exists but nobody fills it. Decide whether the card
   depends on it.
5. **The left rail is publishing plumbing** (rkey, cid, file count). A reader deciding whether to
   open a notebook needs none of it; a debugger needs all of it. It should not be the first thing
   in reading order.
6. **Capped at 50, no way past.** Not a problem yet (11 records); will be.
7. **The action bar's URL** (`did-plc-j7nm3lrd5h7fm3sfhcv3lhfv.lopecode.com/r/…`) is shown in full;
   it is unreadable and not actionable beyond the link already on the title.

## Constraints

- **Dark theme.** `<Theme name="near-midnight">` for the page; it is notebook-kit's default dark,
  the theme every DS card was graded under, and its blue `--theme-foreground-focus` reads on it.
  `slate` is the named alternative if near-midnight is too neutral. Show the page in both if cheap.
- **Design system only.** Controls are `LopecodeDS.*` (Search, Select, Button, Toggle, Table,
  Range…); layout glue uses `var(--theme-…)` tokens and the three DS font stacks. No hex, no other
  fonts. Grid columns holding inputs are `minmax(0,1fr)` (see the DS conventions).
- **It will be rebuilt in htl/Observable Inputs, not React** (`specs/atproto.md` L33). The React
  design is the spec; anything a DS component can't express becomes an implementation cost, so
  prefer DS components over bespoke widgets and say when you go bespoke.
- **Bundles are megabytes.** Nothing loads a notebook until the reader asks (the hub's
  "click-to-load preview").
- **Data is only what the record carries.** Available per card: `title`, `summary`, `createdAt`,
  author DID → handle/displayName/avatar, file list (ids, mime, sizes), `cid`, `rkey`, plus fields
  the current feed does **not** render: `bskyPostUri` (the companion Bluesky post),
  `previousVersion` (the version chain), `stdDocUri`. No view counts, likes, or tags exist.

## Must have

| # | feature | why |
|---|---|---|
| M1 | Dark, token-only restyle of the feed under `Theme near-midnight` | the brief's premise; kills defect 1 |
| M2 | Card reading order: author → title → summary/what it is → actions; plumbing (rkey, cid, files, size) demoted to a disclosure or hover | defect 5 |
| M3 | Treatment for id-shaped and missing titles/summaries | defects 2, 4 |
| M4 | Actions as DS `Button`s: Open (new tab), Download (with the in-progress state the current code has — disabled + spinner), and the module list as a disclosure | today's affordances, in the system |
| M5 | Companion Bluesky thread per card, from `bskyPostUri`, shown only when present | deferred since 2026-05 (`specs/atproto.md` L768); most cards will lack it |
| M6 | Version chain: "v3 · previous versions" from `previousVersion`, with older snapshots reachable | the publish pipeline now produces chains; nothing shows them |
| M7 | Load more / cursor pagination at the foot | defect 6 |
| M8 | Search over loaded cards with DS `Search` (title, author, module ids) | 11 → 50+ cards |

## Want

| # | feature | notes |
|---|---|---|
| W1 | Sort (`Select`: newest, largest, most modules) and author filter | cheap once rows exist |
| W2 | Click-to-load preview: an inline frame of the notebook, opened on demand, closable | from the hub design; costs a megabyte per open, so opt-in per card |
| W3 | A masthead that says what this is in one line for a stranger, and the publish count | the current "vol. 1 · 11 bundles on the wire" is the right idea |
| W4 | Module list as a DS `Table` (id, size, mime) instead of a link row | 50–100 modules per bundle; a row of 4 + "+48 more" hides the shape |
| W5 | Ledger consistency: the same card grammar reused on the author page (`ledger`), which is a dense `Inputs.table` + cadence chart today | the spec deferred lopefeed+ledger to one design rev |
| W6 | Narrow viewport (≤600px) layout | the cream design has none |

## Not in scope

Signed-in actions (publish, delete, share) — those live in Ledger's Manage Publishes bar. Trending
or "post-on-traction" editorial sources (`specs/atproto.md` L772). Any change to the atproto
record shape.

## Deliverables

1. Feed page, near-midnight, with 3 states: 1 author / 11 cards (today), many authors / 50 cards,
   empty (no records).
2. One card in each state: with summary and Bluesky thread; id-shaped title, no summary; download
   in progress; preview open; version chain expanded.
3. Narrow layout.
4. A note listing every non-DS widget you introduced and why a DS component could not do it.

## Open questions for Tom

- Keep the "edition/issue" masthead metaphor (`№ 001`, `vol. 1`) or drop it with the cream look?
- Should the feed show one card per *bundle* (today) or one per *notebook* with its version chain
  folded in (M6)? The latter halves the list for prolific publishers.
- Is `slate` worth a second artboard, or commit to near-midnight?
