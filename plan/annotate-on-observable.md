# Annotate on observablehq.com — what it would take

Research note, 2026-08-01. The published mirror <https://observablehq.com/@tomlarkworthy/annotate>
boots clean (39 cells, 0 errors) but every shipped note is adrift at the `page` rung and the
boxes pile up in the top-left of the viewport. This is what is actually broken, what a fallback
would recover, and what it would cost. Nothing here is implemented.

Measured with `tools/probe-observable-dom.mjs`, `tools/probe-observable-anchor.mjs` and
`tools/probe-observable-fallback.mjs` (the last one spikes the proposed rungs standalone in the
live page, wired into nothing).

## 1. What the environment actually is

The notebook does not run in the observablehq.com document. It runs in an iframe served from
`tomlarkworthy.static.observableusercontent.com/next/worker-*.html`. Inside that frame:

| | lopecode | observablehq.com |
|---|---|---|
| cell container | `div.observablehq[cell="name"]` inside `.lp2-pane[data-module]` | `div.observablehq.observablehq--worker` inside `div.observablehq-root` |
| cell name in the DOM | `cell` attribute | **nothing** — no attribute, no id |
| `variable.pid` | the `$def` block id (`_a2hdr`) | unset until `persistentId(v)` mints a content hash |
| module registry | `runtime.mains` keyed by module name | absent; modules are anonymous |
| scroll container | the pane | `document.scrollingElement`, `.observablehq-root` is `position: static` |
| `window.__ojs_runtime` | set by the bootloader | **set** — runtime-sdk's `runtime` cell sets it too |
| `variable._observer._node` | the cell div | **the cell div** — same shape, 54 of 78 variables have one |

So the runtime side is intact and reachable; only the two DOM conventions `locate()` depends on
are missing.

## 2. Why every note is adrift

`locate()` has exactly two rungs for finding a cell node:

1. `getVariableByPersistentId(a.pid, runtime)` → `v._observer._node`. The pids in the shipped
   anchors are lopecode `$def` block ids. On Observable the compiled module carries no pids at
   all, and `persistentId()` would mint `contentHash(name + definition.toString())` — a different
   id space that the anchor has never seen. **Never matches.**
2. `scope.querySelector('.observablehq[cell="…"]')`. Observable's cell divs have no `cell`
   attribute. **Never matches.**

Both miss → `cellNode` null → no pane either → the last rung of the adrift ladder, `page`, in
viewport space, which is the stack of boxes in the screenshot. The store itself is fine: it finds
all six records, because discovery scans module variables, not the DOM.

## 3. The fallback ladder, spiked against the live page

Two new rungs recover all six notes. Both are feature-detected, so no `isOnObservableCom()`
switch is needed — they are simply what happens when the structural rungs miss.

**Rung A — cell name → variable → observer node.** Scan the annotated module's variables for
`_name === a.cell`, take `v._observer._node`. Same data the pid rung already uses, reached by
name instead of by id.

**Rung B — quote + context search over the document** (the W3C TextQuoteSelector algorithm:
match `prefix + exact + suffix` against the concatenated text of the page; fall back to the bare
quote only when it is unique). This is the only handle an *anonymous* cell has on Observable.

Measured result for the six shipped notes:

```
tour_title     text   cell=-           rungA miss  rungB HIT rect 14,15 144x42
tour_prose     text   cell=demoProse   rungA HIT   rungB HIT (same cell)   cell 14,623 928x161
tour_plot      plot   cell=demoPlot    rungA HIT   svg=yes ctm=ok          cell 14,970 928x220
tour_svg       svg    cell=demoSvg     rungA HIT   svg=yes ctm=ok          cell 14,1326 928x210
tour_image     image  cell=demoImage   rungA HIT   img=yes                 cell 14,1599 928x130
tour_volatile  text   cell=demoVolatile rungA HIT  rungB HIT (same cell)   cell 14,2144 928x26
```

6/6 recovered; `tour_title` — the anonymous header cell, the one case with no name — only by
rung B. Where both rungs hit they agree on the cell, so B is a safe tail, not a rival answer.
The surfaces themselves need no work: the plot and svg cells expose a real `<svg>` with a working
`getScreenCTM()`, and the image cell a real `<img>`, so `find`/`place` run unchanged once the
node is found.

Rung B is worth having in lopecode too: it is what lets a note survive its cell being renamed,
split or re-created, which pid and cell-name both lose. It must stay *below* the structural
rungs so it never overrides a correct cell.

## 4. Coordinate space

There are no panes, so every box goes to the fixed root and is clamped to the window — the pile.
The document is the scroll container (`document.scrollingElement`, content 5570px tall).

The layer already has the right two-space design; this is a third case of it. Treat the document
as the pane: append an `position: absolute` layer to `body`, and the existing origin formula
`O = {pane.scrollLeft - paneRect.left, pane.scrollTop - paneRect.top}` degenerates to
`{scrollX, scrollY}`, which is exactly page coordinates. Scroll/resize listeners currently bound
to the pane bind to the window instead.

## 5. What stays broken, and is not worth fixing

- **Writing.** `runtime.mains` does not exist, so `a2Store` spins its 3s wait and then mints a
  synthetic `@tomlarkworthy/annotate-data` module. Annotations placed on Observable are
  runtime-only: nothing writes them back into the Observable document, so they die on reload.
  The honest version of authoring there is the model the notebook already states — *an
  annotation is a cell* — i.e. offer the source (`annotation_x = annotation({…})`) for the
  reader to paste into a cell of their own fork, and say so in the UI. That is the one place an
  `isOnObservableCom()` switch earns its keep: to change the wording, not the mechanism.
- **The ✎ full editor.** `cellEditor` importShims editor-5, which will not resolve there; the
  existing try/catch already falls through to the raw-source textarea.
- **Cross-environment pids.** Making a lopecode pid match an Observable one would need a
  normalised-source hash minted on both sides (the definition text differs after decompile →
  Observable recompile). Rungs A and B cover 6/6 without it. Not worth it.

## 6. Cost

| Change | Where | Size | Risk |
|---|---|---|---|
| Rung A (name → variable → node) | `a2Anchors.locate` | ~12 lines | low; new rung below pid, existing behaviour unchanged when pid hits |
| Rung B (document quote search) | `a2Anchors`, new `findQuoteInDoc` + hook in `locate`/text surface | ~35 lines | medium; must be last, and must not re-anchor a note whose cell is merely scrolled out |
| Document-as-pane layer | `a2Layer` `layerFor` + scroll wiring | ~15 lines | low-medium; touches the paint path everything else depends on |
| "Copy the cell" authoring story | `a2Layer` UI + `isOnObservableCom()` | ~25 lines | low |

Roughly a half-day including tests. The suite (123 checks) runs against a lopecode page, so rung
B and the document layer would each want a case there, plus a headless Observable check —
`tools/probe-observable-fallback.mjs` is already most of one.

## 7. Recommendation

Rung A and rung B are worth doing **for lopecode's own sake** — they make an anchor survive a
rename and a cell rewrite, which is a real gap today, and the Observable mirror comes along for
free. The document-as-pane layer is cheap and stops the pile-up. The writing story is where
Observable genuinely diverges, and the right answer there is to make the mirror read-only and
say so, rather than to build a second persistence path.
