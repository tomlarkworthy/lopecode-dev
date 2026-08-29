# Lopefeed Dark — implementation plan

Source design: Claude Design project `019de8ff-e26d-76b0-8278-169b9d2296c1`, `Lopefeed Dark.html`
(+ `lopefeed/lf-page.jsx`, `lf-card.jsx`, `lf-data.jsx`), read 2026-08-29 via the design API.
Brief: `plan/lopefeed-design-brief.md`. Target: `@tomlarkworthy/lopefeed`, canonical
`lopecode/notebooks/lopefeed.html`, served as https://lopecode.com/ and republished to atproto by
CI on push.

## Verdict: realizable, no reprompt needed

The design is token-only and uses five DS components (`Search`, `Select`, `Button`, `Table`,
`Theme`); everything else is layout glue and seven declared bespoke widgets (the designer's own
"Non-DS widgets" board). All of it maps onto what the notebook already has:

| design | lopecode equivalent | evidence |
|---|---|---|
| `Theme name="near-midnight"` | `@tomlarkworthy/themes` is already embedded in lopefeed.html; `theme_assets` defaults to `themes.get('near-midnight')`; `apply_theme` adopts the CSS document-wide, and lopepage-2's chrome reads the same `--theme-*` tokens | `lope-reader --get-module @tomlarkworthy/themes`, cells `_theme_assets`, `_apply_theme`; lopepage-2 source references `--theme-foreground` ×8, `--theme-background-a` ×5 |
| `LopecodeDS.Search/Select/Button/Table` | `Inputs.search` (with `columns`), `Inputs.select`, `Inputs.button`, `Inputs.table` — the DS wrappers mount exactly these | `lopecode/design/src/index.tsx` |
| `var(--theme-…)`, `var(--serif|--sans-serif|--monospace)` | same tokens, same names, from the same notebook-kit CSS | `lopecode/design/tokens/theme-near-midnight.css` is built from the file themes serves |
| Click-to-load preview | `<iframe src=webUrl loading="lazy">` created on click, removed on close; the notebook already runs at lopecode.com so same-site | design's `LFPreview` is a placeholder box; the real frame is the notebook itself |
| Version chain | walk `previousVersion` from the record via `getRecord` on the author's PDS, one hop per row, fetched only when VERSIONS opens; cached in the existing `idb` store | `specs/atproto.md` 2026-08-25: chains are PDS-verified |
| Companion thread | `bskyPostUri` on the record → `public.api.bsky.app/xrpc/app.bsky.feed.getPostThread`, fetched only when present; shows replies, likes, time | `specs/atproto.md` L19; the current feed reads neither field |
| Avatar monogram | the current feed already has real avatars from `getProfile`; use the image, monogram as fallback | `rows` cell, `avatar: profile?.avatar` |

Three deliberate deviations from the mock, none needing a reprompt:

1. **Real avatars.** The designer used a hue-tinted monogram because the DS has no media component.
   The notebook has the Bluesky avatar; the monogram is the fallback for authors without one.
2. **Preview is a live iframe**, not the "live notebook frame" placeholder. Height 260px as drawn,
   with a `↗ open` link in its header for the full page.
3. **Thread replies are what `getPostThread` returns** (author handle, text, like count, age) —
   the mock's two replies are the shape, not the count. Cap at 3, "view thread ↗" for the rest.

Things the mock shows that data cannot supply, so they are dropped: none. Version dates come from
each snapshot's `createdAt`; sizes from `files[].blob.size`; module mime from `files[].blob.mimeType`.

## Cells

Replace the one `feedView` cell with a small graph. Names as they will appear in the module.

```
feedRecords          unchanged fetch, plus cursor: {records, cursor} and a `loadMore` trigger
handles              unchanged
rows                 + bskyPostUri, previousVersion, idShaped (/^@[^/]+\/[^/]+$/.test(title)),
                       moduleList [{id,size,mime}] from files[], version (1 until chain fetched)
viewof search        Inputs.search(rows, {columns:['title','handle','moduleText'], placeholder, width:300})
viewof sort          Inputs.select(['newest','largest','most modules'], {label:'Sort', width:220})
viewof limit         Inputs.input(12); the Load more button does limit.value += 12
list                 search → sort → slice(limit)
card(b)              htl function: byline, title/idShaped, summary or "no summary written",
                       actions (Inputs.button Open, Inputs.button Download with busy state),
                       load-preview toggle, MODULES/VERSIONS/RECORD disclosures, thread
versionsFor(b)       async, on demand: walk previousVersion ≤4 hops, idb-cached
threadFor(b)         async, on demand: getPostThread(bskyPostUri)
modulesTable(b)      Inputs.table(b.moduleList, {columns, header, format:{size}, rows:8, width:{size:90,mime:170}})
feedStyle            one <style> cell: .lf-* classes on tokens; @media (max-width:600px) for the
                       narrow variant (390 artboard); @keyframes lf-spin
feedView             masthead + controls + list + foot (Load more | end of feed) | empty state
```

Disclosures are `<button class="lf-disc" aria-expanded>` toggling a sibling, as in the mock (not
`<details>`, so the open state can be reactive and the toggle styled as mono text).

## Steps

1. `bun tools/lope-sync.ts checkout @tomlarkworthy/lopefeed` (canonical: lopecode).
2. Write the cells above in `modules/@tomlarkworthy/lopefeed.js`; keep `downloadHelpers` and the
   atproto import; delete the `LOPE` colour object.
3. Set the notebook's theme to near-midnight and keep it embedded (the `theme_assets` select;
   `apply_theme` writes the `<script data-mime="text/css">` cache blocks the export carries).
4. Verify in a browser against the artboards: 1080px "today" (11 cards), 1080px with a mock 50-row
   feed (feed the `rows` cell via `notebook-import` overrides), 390px narrow, empty (`feedRecords`
   overridden to `[]`); measure no element wider than the viewport (`.ds-sync/dc-probe.mjs`
   pattern); exercise Download busy state, preview open/close, each disclosure, search + sort.
5. `sync-module` into `lopecode/notebooks/lopefeed.html`, run `lope-preflight.ts` on it, commit.
   **Pushing publishes**: the atproto CI republishes lopefeed and lopecode.com/ serves the new
   record — so the push is the release. Preview via the PR preview workflow first
   (`notebook-preview.yml` posts a githack link).

## Cost and risk

- Cell work: one session. The data cells are mostly the existing ones plus two lazy fetchers.
- Risk: `Inputs.search` `columns` option must match the field names; module text is joined into
  one string field to keep it searchable. `Inputs.table` at 8 rows renders its own scroller — the
  mock accepts that.
- Risk: the record may lack `previousVersion`/`bskyPostUri` on older bundles; both disclosures
  degrade to "v1 · no earlier snapshots" and no thread block, as the mock's id-shaped card shows.
- Not covered by the mock: lopepage-2's tab bar still frames the page. It is already dark
  (near-midnight tokens), so defect 1 of the brief closes by using the same theme.
