# annotate — design

**Status 2026-07-27: prototype built and verified 30/30** — `lopebooks/notebooks/@tomlarkworthy_annotate.html`,
suite `tools/test-annotate.js` (real mouse/selection input, resize invariance, orphaning,
export round-trip across a genuine reload). Notes at the end (§8).

Successor to `@tomlarkworthy/annotations` (v1, `plan/annotations-module.md`). v1 proved the overlay
mechanics and is a usable toy; it is wrong in three structural ways that no amount of patching fixes.
This note is the research and the design, not a plan to code.

## 1. What v1 got wrong

**1.1 State in one `viewof`.** All annotations live in a single `Inputs.input([])`. Any redefinition
of that cell — an editor apply, a re-render, a pane rebuild — mints a fresh input and the value resets
to `[]`. Observed live: `viewof annotations` was redefined twice, 0.6s apart, mid-session. A design
where one cell holds all the state has a single point of total loss.

**1.2 Anchors are fractions of a layout box.** A tip is `(nx, ny)` of the anchor element's
`getBoundingClientRect()`. That is a *screen-layout* coordinate wearing a document coordinate's
clothes. Reflow the paragraph — narrower pane, bigger font — and `0.42` of the box points at a
different word. It survives *scrolling*, which is what made it look right; it does not survive
*resize*, which is the requirement.

**1.3 Annotations are a side-car.** They live outside the notebook's own change machinery, so
persistence had to be reinvented (localStorage), export durability is still unsolved, and undo,
playback, revert and git get nothing. Meanwhile v1's placement gesture *did* mutate code by accident —
clicking a cell to annotate it re-triggered `editable-md`, which re-applied that cell's definition.
The tool touched code where it shouldn't and failed to where it should.

What v1 got right and should carry over: the **ladder of anchors with a visible confidence rung**, the
**armed one-shot placement** (a bare page-wide click handler swallows everything), and **full teardown
on disable** rather than `display:none`.

## 2. The core move: an annotation is a code change

`@tomlarkworthy/local-change-history` already records every cell edit. Read out of the module:

- `change_listener` subscribes via `onCodeChange` and appends
  `{t, op: "new"|"upd"|"del", source, pid, module, provenance, _name, _inputs, _definition}`.
- `historyUtils.snapshotVariable` stores `_definition` as **full source text**, so the log is a
  complete per-cell version series, not a diff stream.
- `tag(def, provenance)` attaches `__provenance` to a definition; `change_listener` reads it back and
  puts it on the entry. **This is the extension point** — a writer declares who it is.
- `applyHistoryState(index)` reconstructs any pid's state at any point from the log plus
  `initial_state`. `playback_suspend` exists so replayed writes are not re-recorded.

So if an annotation is a variable, everything follows for free: creation is `new`, editing is `upd`,
deletion is `del`, it exports with the notebook via exporter-3, it lands in the virtual git repo, and
playback/rewind/revert already handle it.

**Three readings of "an annotation is a code change", and which to take:**

| | what it means | verdict |
|---|---|---|
| **A. annotation is a cell** | each annotation is its own variable holding `{anchor, body}` | **take this** |
| B. annotation is a comment in the target's source | insert `/* note */` at the anchor | reject — mutates semantics, and cannot annotate output with no source (an image pixel) |
| C. annotation is provenance on a change | `tag(def, {note})` | keep as a *second* feature: annotating a change rather than the code |

**A, refined:** annotation cells live in their **own module**, not the annotated one. Namespace stays
clean, the annotated module is untouched, and the annotations still export, still replay, still diff.

A also kills 1.1 outright: one variable per annotation means redefining one cannot wipe the others,
and there is no single cell whose loss loses everything.

C is worth building eventually because it is genuinely different — "why did this change?" attached to
a history entry is code review, and it is the thing that makes annotations useful to an agent reading
the log.

## 3. Anchors: one coordinate system per surface

The rule, lifted from svg-lens **T11 ("the view is not an edit")**: every measurement goes through a
transform that carries the current layout, so no consumer ever sees the scale factor. Stated for
anchors: **store the anchor in the surface's own document units; convert to screen at paint time.**
Resize then stops being a feature to handle and becomes a consequence.

| surface | document unit | why it is resize-invariant |
|---|---|---|
| **text** | character offsets → a DOM `Range` | defined over characters, not geometry. `Range.getClientRects()` returns per-line rects that reflow natively — this is the *only* anchor that is reflow-invariant by construction, which is exactly why text selection is the most useful anchor |
| **SVG** | user-space coords via `getScreenCTM()` | the CTM carries the viewBox; svg-lens already relies on this |
| **raster image** | fraction of `naturalWidth`/`naturalHeight` | intrinsic to the asset, not to its rendered box |
| **element / box** | fraction of the border box | the weak fallback — v1's only mode |

Text is the headline case and it needs two representations, because the rendered text and the cell
source are different strings:

- Markdown cells go through `editable-md`, which is a ProseMirror **round-trip re-serialization**
  (`mdCellSourceToMarkdown` → parse → `editableMarkdownSerializer` → `markdownToMdTagged` → `compile`).
  There is no source map, and the module's own notes record escape loss across the trip. So a rendered
  offset cannot be turned into a byte offset by construction.
- Therefore the durable text anchor is a **quote** — `{prefix, exact, suffix}` — which can be re-found
  in *both* the rendered text and the source text. That is W3C Web Annotation's `TextQuoteSelector`,
  and re-finding is what survives a lossy round-trip.

## 4. The lens theory that applies

From `knowledge/svg-editor-architecture.md`. Four things transfer directly; one does not.

**4.1 An address is partial by construction.** svg-lens's `vertexAddress.resolve` documents the whole
idea: *"an ordinal that no longer exists resolves to null … that is what makes the address safe to
hold across a commit."* `rebasePath(path, op)` returns `null` when the target was deleted. So:
`resolve(anchor, doc) → region | null`, and **null is orphaned, not an error and not a guess**. v1
silently degraded a failed anchor to a page-fraction, which is guessing — the thing §4 of the svg-lens
doc says it deliberately stopped doing ("a hole it cannot write literally is declined, not solved").

**4.2 Rebase is the anchor's real operation — and it is OT's TP1.** svg-lens law **T7 (rebase
agreement)**: `rebase(p, c)` must equal re-locating the same element after applying `c`. Its
`rebasePath`/`rebaseVertex` are ~20 lines each and handle insert / delete / move by index arithmetic,
returning `null` for the deleted case.

The annotate analogue: since `local-change-history` holds successive full-text snapshots per pid,
the diff between consecutive snapshots *is* the edit, and a text anchor rebases across it by ordinary
position transformation — shift on insert before, clamp or orphan on overlapping delete. **The change
log is the edit stream anchors rebase against.** This is the concrete payoff of §2: making annotations
code changes is what gives anchors a well-defined thing to be rebased through.

**4.3 One `pick`.** svg-lens **T10 (hit agreement)**: what the hover outlines, what a press claims and
what a double-click enters are three readings of *one* answer, `ctx.pick`. Gap 0 in that project was
"the same question having two answers in two places". v1 called `elementFromPoint` in three places
with three different guards. annotate gets one `pick(e)`.

**4.4 One writer.** §3 of the svg-lens doc: one place touches `_definition`, it **re-reads the
definition at commit time** because `editor-5` may have rewritten the cell mid-gesture, and it
**records each commit into `local-change-history`**. It also observes that `sticky`, `grid-container`,
`editable-md` and `infinite-canvas` each hand-roll their own writer. annotate must not be the fifth —
it should use, and if necessary extract, that writer.

Related law worth stealing: **T4 (d-PutInc)** — a gesture commits against the state it started from.
The bug it names ("the gesture outlives its node": a commit minted a new node and the old target
stopped resolving) is precisely what an annotation anchor faces every time the annotated cell
recomputes.

**4.5 What does not transfer.** svg-lens's *lawful state-based lens* over source bytes needs the
target to be a literal in the cell — that is its "source-last thesis". Annotations must attach to
rendered output that has no literal behind it (a `.map()`-built chart, an image). So annotate is not
a lens in that strict sense. The pieces that transfer are the **address algebra** (partial resolve,
rebase, one pick) and the **discipline** (decline rather than approximate; announce which rung
answered), not the round-tripping guarantee.

## 5. Anchor shape

```
Anchor = { surface, target, selectors[], rung }
```

`selectors` ordered strongest → weakest; `resolve` walks until one answers; the rung that answered is
**shown in the UI** (v1 did this and should keep it). Sketch:

| rung | selector | resolves to |
|---|---|---|
| 1 | live DOM `Range` (session-only, exact) | `getClientRects()` |
| 2 | source span in the target cell's `_definition`, rebased through history | re-render → range |
| 3 | text quote `{prefix, exact, suffix}` | re-find in rendered text |
| 4 | structural: `(module, cell)` + path within the cell node | element box |
| 5 | element box fraction | v1's fallback |
| — | none | **orphaned** — parked visibly, never deleted, never silently relocated |

The DOM element is used when available (rung 1/4) exactly as the brief asks; it is the *fastest* rung,
not the *canonical* one. Canonical is rung 2/3, because those are the ones that survive a reload and
can be rebased.

## 6. Open questions

- **Placement gesture vs. live editors.** v1's armed click re-triggered `editable-md`. For text, the
  Medium/Hypothesis pattern (make a normal selection, a floating "comment" affordance appears) may
  avoid the mode entirely — but a click-to-place mode is still needed for SVG and images, and in that
  mode the page underneath must be genuinely inert, not ad-hoc event-swallowed.
- **Rebase feedback loop.** An annotation cell being updated is itself a history entry. Needs a
  `source: "annotation"` guard, the same shape as the existing `playback_suspend`.
- **Cost of rebasing on every keystroke.** `onCodeChange` fires per edit; diffing full snapshots for
  every annotation on every change may need debouncing or a dirty set.
- **Do annotation cells render?** They are variables in a module, so the visualizer will want to show
  them. Probably they need to be hidden or rendered as the annotation itself.
- **Known hazard:** the memory on `local-change-history` records that the `onCodeChange` chain can go
  **stale mid-session and silently stop capturing edits**. If anchors rebase off that stream, a stale
  chain means anchors silently drift. Needs a liveness check.

## 8. Build notes (2026-07-27)

Two modules, authored offline in compiled form (no channel round-trip):

- `@tomlarkworthy/annotate` — anchors (`a2Anchors`), writer (`a2Store`), overlay
  (`a2Layer`), demo cells (prose with a deliberately duplicated phrase / responsive SVG /
  image). `runtime` comes via the standard runtime-sdk import so re-export survives.
- `@tomlarkworthy/annotate-data` — one `a2manifest` seed. Each annotation is a variable
  `annotation_<id>` (definition = `new Function("return (<json>)")`, `<` escaped so a note
  containing a closing script tag cannot break the block), plus `annotation_index`.
  Definitions carry `__provenance = {source: "annotate"}` — no lch import, just its
  protocol. `viewof annotations` is a derived cache; boot rebuilds it from
  `module.value(annotation_index)` → `module.value(annotation_<id>)`.

Verified by the suite:

- Text: selection → ✎ chip → quote anchor; highlight sits on the quote to ±2.5px against
  an independent TreeWalker ground truth; duplicate phrase resolved to the *second*
  occurrence via prefix/suffix + hint; after a 1300→900 viewport reflow the ground truth
  moved and the highlight followed it exactly.
- SVG: armed click stores user-space (50.0, 50.0); after reflow the arrowhead equals the
  fresh `getScreenCTM()` transform.
- Image: fraction (0.25, 0.50) stored and tracked.
- Code-change contract: 11 onCodeChange events during placements, all `annotation_*`,
  all carrying `annotate` provenance, zero foreign cell changes.
- Orphaning: unresolvable quote → "⚠ 1 orphaned", record kept, restores on re-anchor.
- Export: `exportModuleJS` of the data module → splice → genuine `page.reload()` →
  3/3 restored including the closing-tag note; text anchor re-resolves onto its quote.

Gotcha found: a bare `<svg style="width:100%;height:auto">` returned as a cell value
collapses to 8×8 — wrap in a block div and set `aspect-ratio` explicitly.

Not built yet: rebase-through-history-diffs (quote re-finding covers re-anchoring at
resolve time), annotating a *change* (reading C of §2), lch liveness check, cross-pane
demo targets.

## 9. Iteration 2 (2026-07-29): the note is a cell, the anchor is re-selectable

Tom: *"annotate should hold a cell (including an editor), more like grid-container, the
default should be an editable markdown cell, but you can also change it to something
else. Also the annotation should have its anchor selectable, reselectable, so you can
move things around."*

**The note is a cell.** The `text` field is gone. Each annotation owns a second variable
`annotation_<id>_note`, compiled from Observable source (`compile()` from
observablejs-toolchain, materialised with `new Function`) and defined in the data module,
carrying the same `annotate` provenance. The record stores only the cell's *name* — the
cell is the source of truth, so editing a note is an ordinary cell edit and the store is
not involved at all. The data module binds `md` to `@tomlarkworthy/editable-md`, so the
default note (`md` + placeholder) is click-to-edit and rewrites its own source; ✎ opens
`cellEditor` from editor-5 in the box, and the note can become any cell (verified with an
`htl.html` note). The box mounts the cell through runtime-sdk `observe` +
`Inspector` with `detachNodes`, so the live element is adopted, not copied.

**The anchor is re-selectable.** ⌖ is two gestures: drag re-aims the tip live
(preview/commit as before), a click arms *re-anchor* mode for that annotation. Arming is
now one mechanism shared with `+ annotate` (`armedFor` is `"new"` or an id) and it no
longer swallows the press — only the trailing `click` — so a drag over prose yields a
quote anchor and a plain click yields a point anchor. Clicking a box selects it; Escape
disarms/deselects.

Traps, all found by measurement rather than reasoning:

- **`Inspector`'s constructor stamps `class="observablehq"` on its container**, and
  editor-5's `_auto_attach` walks exactly that selector (`divToVar` matches
  `v._observer._node === div`). Left alone it stapled a full cell editor into every
  annotation box and logged six `dynamic …` cell creations per placement — the
  code-change invariant test caught it as "foreign cell changes". Strip the class after
  constructing the Inspector.
- **Importing `cellEditor` eagerly** wakes that same chain; it is resolved lazily on the
  first ✎ click via `module.value("cellEditor")` instead.
- The suite spliced its own exported annotations into the notebook and never put the data
  block back, so every later run booted with the previous run's annotations and the
  indices in `store.all()[n]` silently shifted. The suite now restores the block in
  `finally`.
- A late pane mount replaces the demo cell nodes and silently drops a selection made
  before it; `settle()` now waits for the cell *and* the overlay to hold still for 1.5s.
- Painted box positions are clamped into the viewport (the record keeps the dragged
  offset) — without it a box widened for its editor hung off the edge and was unclickable.
- Text arrows aim at the nearest edge of the quote's rects; aiming at `rects[0].left`
  drew a line straight through the text it pointed at.

Suite: 51/51 (`node tools/test-annotate.js`). Screenshots via `node tools/shot-a2.mjs`.
Known limit: scrolling an annotation out of view culls its box, which closes an open
editor — parts are rebuilt from scratch when it returns.

## 10. Iteration 3 (2026-07-29/30): resizable boxes, and the overlay's coordinate space

Tom: *"the size of the annotation needs to be adjustable"* — **shipped**.
`box.w`/`box.h` in the record, dragged from a corner grip on the same preview/commit rule as
the box drag (one history entry per gesture, asserted). An explicit height makes the note
scroll inside the box, so a long note stops pushing the arrow around; double-clicking the
grip drops `h` and goes back to fitting the note. Editing floors the width at 460 and the
height at 320. Suite 56/56.

Tom: *"After forking the notebook, the annotation seemed to be lost."* First attempt was a
chip listing off-screen annotations; Tom rejected it (*"probably not the correct way… look at
how the runtime does visibility"*) and it was removed. He was right — the bug is the
overlay's coordinate space, not a missing indicator.

### What the measurements say

`tools/research-a2-*.mjs`, all against the real notebook:

1. **The fork is not special.** Origin and fork behave identically at the same scroll
   position; a fork just boots with its panes at `scrollTop = 0`, so every annotation whose
   text is below the fold is culled. Data, records, anchors and `cellHash` all survive
   (`repro-a2-blobfork.mjs`).
2. **The runtime applies visibility itself, and annotate is already inside that
   mechanism.** Not a builtin (which is why `runtime._builtin._scope` has no `visibility`
   and my first probe drew the wrong conclusion): `@observablehq/runtime` 6.0.0 —
   `vendor/observable-runtime`, the version the notebook embeds — puts `visibility` in
   *every module's* `_builtins` map as the symbol `variable_visibility`, next to
   `invalidation` and `@variable` (`src/module.js`). At compute time
   `variable_compute` swaps that symbol for `variable_intersector(invalidation, variable)`
   (`src/runtime.js`), which builds an `IntersectionObserver` on
   **`variable._observer._node`**, resolves the awaited promise when that node intersects,
   and disconnects on invalidation. With no observer node it degrades open:
   `visible = !node`.

   Measured in the live notebook (`research-a2-runtime-visibility.mjs`): give an annotation
   a note cell that does `await visibility()` and its `_inputs` are `["visibility","md"]`
   with `_observer._node` **=== the annotation box's body div**. The runtime is already
   gating each note's work on the node the layer hands it.

3. **Our cull defeats that gate.** Scroll the quote out of the pane and the box is removed:
   `_observer._node` becomes `undefined` while the variable stays reachable and observed.
   Force a recompute in that state and the note logs `compute#2 → visible#2` immediately —
   no deferral at all, because `visible = !node`. So the hand-rolled cull hides the
   annotation *and* turns the runtime's per-cell visibility gate off for it.

4. **IntersectionObserver composes with pane clipping.** A probe inside `.lp2-pane` reports
   `isIntersecting: false` once the pane scrolls it out, while it is still inside the
   window. So a box living in pane-content space gets the runtime's gate correct for free —
   "scrolled out of its pane" is already not-intersecting.
5. **lopepage-2 does not virtualise.** A pane is `position:relative; overflow:auto` with a
   single content div at full content height; every cell is mounted and laid out. So
   "out of view" is pure geometry — nothing needs to be re-derived to know where an
   annotation belongs.
6. **The viewport clamp lies.** Scrolling a quote towards the pane's top edge clamps its box
   to `top: 4px` (measured: wanted −11, painted 4; wanted −51, painted 4) — the box detaches
   from its text and floats over the tab bar while the arrow still points at the quote.
7. **A box can be painted over a different pane.** A left-pane annotation with `dx: 620`
   painted at x 899–1159 while its own pane ends at 836 and the pairing pane starts at 842.
   One fixed layer over the whole window has no relationship to the pane it belongs to.
8. **Pane-content space works.** An abspos child of `.lp2-pane` scrolls exactly with the
   content (200px scroll → 200px move) and is clipped by the pane for free.
9. **The one risk is scrollable-overflow growth**, and it is containable: a box hung past the
   content grew `scrollHeight` by 380px and `scrollWidth` by 400px — wrapping the layer in an
   abspos `overflow:hidden` div sized to the content box gave `grewH: 0, grewW: 0`.

### Fix (built 2026-07-30, 61/61): stop hand-rolling visibility; give the runtime the right node

The layer should not decide *whether* an annotation exists. The runtime already decides
whether its note does work, per note, through `variable_intersector` on the box body. Two
changes, in this order:

**1. Delete `visible()`, the cull and the viewport clamp.** A box stays mounted for as long
as its anchor resolves. That keeps `variable._observer._node` alive and in the document, so
the runtime's gate keeps working instead of degrading to `visible = !node`, and an open cell
editor survives scrolling (closing the known limit in §9).

**2. Move each pane's boxes into that pane's scroll content.** One layer per pane appended
to `.lp2-pane`: an abspos `overflow:hidden` wrapper sized to the pane's content box, holding
that pane's arrow `<svg>` and its boxes at **content** coordinates
(`y = rect.top − paneRect.top + pane.scrollTop`). This is what makes step 1 safe: the box
scrolls and clips with its own text, so "off-screen" needs no marker and no clamp, a box can
never be painted over another pane, and the runtime's IntersectionObserver now reports
exactly the right thing — measured, a node clipped by the pane is `isIntersecting: false`
even while it is inside the window.

Then annotate stops having a visibility policy at all: geometry is content-relative,
existence follows the anchor, and *work* is gated by the runtime the same way it gates any
other cell. If the layer's own rect maths needs throttling later, it should use the same
signal — an `IntersectionObserver` per box — to skip recomputation, never to remove a box.

Costs, honestly: viewport chrome (selection chip, `+ annotate`, status, orphan chip) stays
in the existing fixed root, so there are two layers to maintain, plus a page-level fallback
for anchors with no pane; a box near the pane's right edge is clipped rather than nudged, so
`dx` wants a content-space clamp; and cells with their own inner scroller still need a scroll
listener to recompute, which the pane wrapper does not clip for.

Implementation notes (as built): `layers` Map keyed by pane element, `null` → the fixed root
(fallback, viewport coords, unchanged behaviour). `layerFor(pane)` appends the wrapper +
per-layer `<svg>`; `sizeLayer` re-fits the wrapper to `clientWidth × scrollHeight` each
render. All paint-time geometry shifts by `O = {scrollLeft − paneRect.left, scrollTop −
paneRect.top}`; gesture math is untouched because dx/dy are same-space deltas. Re-anchoring
to another pane reparents the same part nodes so the note's observer node (and an open
editor) survive the move. Every `closest("[data-a2-root]")` self-hit filter became
`"[data-a2-root],[data-a2-layer]"`, including the MutationObserver's own-mutation guard —
miss that one and render → hl.innerHTML churn → MO → render spins. Suite asserts: box
mounted inside its pane's layer; scrolls with content (measured Δ within 1px of applied
scroll, using the *achieved* `scrollTop` since a pane taller than its content clamps to 0);
off-screen box stays in the DOM below the pane fold with `_observer._node === body` intact;
an open editor survives the round trip. The fork repro now boots with `boxes: 1`.

Not a regression I introduced: v1 (`@tomlarkworthy/annotations`) had the same fixed root +
`visible()` cull, and annotate inherited it.

## 11. Iteration 4 (2026-07-30): annotations live in the module they annotate

Two complaints, one root cause and one relocation.

### 11.1 Why some regions refused an annotation

`describeSelection` required an `el.closest(".observablehq[cell]")` ancestor. Two things have
neither:

- **Unnamed cells.** A module's anonymous cells (the header markdown, for one) render into an
  `.observablehq` div with **no `cell` attribute** — measured: 63 of 65 divs in the annotate
  pane have one, the header does not. The selector could never match it.
- **editor-5 editors.** `_auto_attach` does `div.after(editor)` — the editor is the cell div's
  **sibling**, not a descendant, so nothing inside it has a cell ancestor at all.

The fix is to identify a cell by its **variable**, not by an attribute. Lopecode's `$def` stamps
`.pid` on every variable (`$def("_a2hdr", null, ["md"], _a2hdr)`), and exporter-3's
`generate_define` writes it back out, so an unnamed cell already has a durable identity in the
file — annotate simply was not reading it. Anchors now carry `pid` (from runtime-sdk's
`persistentId`) next to `cell`, and `locate` resolves pid-first via
`getVariableByPersistentId(pid, runtime)` → `v._observer._node`, falling back to the attribute
selector. A rename no longer orphans anything either.

Note the sdk's arity: `getVariableByPersistentId(pid, runtime)`. Called with one argument it
throws on `runtime._variables` and every anchor silently becomes an orphan.

For content mounted beside a cell, `hostOf` walks up to the nearest **preceding** `.observablehq`
sibling (the pane interleaves a spacer div between cells, and an editor is not necessarily the
first thing after its cell) and records `region: "after"` plus `afterIndex`. `locate` picks the
host content-first — the sibling that still contains the quote — and uses `afterIndex` only to
break ties. Quotes and paths are then measured against that **host**, not against the cell div.

The chip's own gate was the same selector; it is now `A.hostOf(n).hostNode`.

Caveat worth stating: a cell created at runtime with no `$def` pid gets one minted as
`contentHash(name + definition)`. Stable for the session and durable once exported, but editing
such a cell before its first export changes the id and orphans its annotations. Cells that came
from the file are unaffected.

### 11.2 Annotation cells moved into the annotated module

Previously every annotation was a variable in the shared `@tomlarkworthy/annotate-data` module.
That is wrong for the stated invariant: if an annotation is a code change, it is a code change *to
the notebook being annotated*, and it should travel with that module through save-in-place,
export, `sync-module` and jumpgate.

Now `annotation_<id>`, `annotation_<id>_note` and `annotation_index` are defined in
`runtime.mains.get(anchor.module)`. `annotate-data` remains the fallback home for anchors with
no module. Boot scans every main for an `annotation_index` rather than reading one list.
Re-anchoring across panes migrates the cells: the note's own `_definition` and input names are
re-defined in the new module and deleted from the old — no recompile, so a non-markdown note
survives the move.

**The editable-md injection.** A note is `` md`…` `` and click-to-edit only works if `md` is
editable-md's: its parser matches on the literal identifier (`node.tag.name === 'md'`), so an
alias would break the round trip in both directions. So the first annotation placed in a module
that has no `md` of its own gets the import injected. Two measured consequences:

- **Every markdown cell in that module becomes click-to-edit** (`class="lope-editable-md"`).
  Unavoidable — module scope is the only scope Observable has.
- **editable-md mints `dynamic *` editor scaffolding per cell.** Transient: `isDynamicVar` makes
  exporter-3 drop those, so they never reach the file. The file only gains two lines.

The gate is `_scope.get("md")._type !== TYPE_NORMAL`. `_scope.has("md")` is useless here — the
runtime creates a **TYPE_IMPLICIT** variable on first *reference* to a builtin, so `has` is true
for every module that merely uses `md`.

**Do not build the module importer with `new Function`.** A dynamic `import()` compiled that way
has no active script, so `/@tomlarkworthy/editable-md.js?v=4` fails to resolve and every markdown
cell in the module turns into a RuntimeError. It also is not needed: exporter-3 drops module vars
and import bridges and re-synthesises them from runtime shape (`v._name.slice(7)`), so the live
definition only has to work live. It now returns the already-booted module, falling back to
`importShim`.

### 11.3 Verified

Suite is 74/74 (`node tools/test-annotate.js`), including a full export round-trip that now
exports **the annotated module**, splices it back into the notebook and reloads. Added checks:
annotation cells land in the annotated module and not in the data module; the annotated module
owns the index; the import is injected once, not per annotation; an unnamed cell can be annotated
and its highlight lands on the quote; a real pinned editor-5 editor mounts outside every cell div,
its text is annotatable, and the anchor resolves. `tools/probe-a2-crossmodule.mjs` annotates a
second pane (`@tomlarkworthy/claude-code-pairing`) and confirms the cells, the index and the md
injection land in *that* module with no errors. `tools/repro-a2-blobfork.mjs` still boots the fork
with the annotation surfaced.

## 12. Iteration 5 (2026-07-30): the leader reads as a hint; annotate is a plugin, not chrome

**Leader line.** A solid 1.5px stroke crossing prose covered the words it pointed at. Now dotted
(`stroke-dasharray "1 4"`, round caps, `"1.5 5"` when selected) and translucent
(`stroke-opacity` 0.45 → 0.85 selected). The arrowhead stays solid (`fill-opacity` 0.7 → 1) so
direction is still legible.

**The `+ annotate` button is gone.** A floating button painted over the document was chrome
inconsistent with the rest of the page. Annotating is a global verb, so it is registered on the
two plugin buses instead — no import of lopepage-2 or command-palette in either direction:

- `a2MenuItem` → `plugins.add("lp2-menu", {id: "annotate", order: 4, label: "Annotate", svg:
  <speech bubble>, action: () => a2Layer.arm()}, {invalidation})`.
- `a2Commands` → `plugins.add("lopecode_commands", provider, {invalidation})`, matching
  annotate/annotation/note/comment/callout/highlight and offering **💬 Annotate** and **💬
  Annotations: hide/show the layer**.

The verb is exposed on the layer's return value (`a2Layer.arm/disarm/isArmed/toggle/enabled`),
which is the status node — so a plugin drives the layer without reaching into it. Armed state now
reads out through the status line and the crosshair cursor, since the button that used to say
"select or click a target…" no longer exists.

**Enabling across a recompute.** `arm()` on a *disabled* layer has to turn the layer on, which
recomputes the cell and throws away the instance that was called. The intent is handed over on the
`viewof annotationsEnabled` element (`$1.__a2armOnEnable`), which the new instance consumes after
its first render. That element is stable across the recompute; the cell value is not.

**command-palette gained `action`.** The palette could only navigate (`window.location.href =
r.href`). A command with `action: fn` now runs it instead — one `activate(r)` used by the row
click, the snippet click and Enter; rows with an action get `data-command-action` so a test can
tell them apart. This is the primitive that lets a notebook expose a verb rather than a
destination. Canonical `lopecode/notebooks/@tomlarkworthy_command-palette.html` and the annotate
notebook are updated; **the other ~213 consumers still carry the old copy** — a corpus sweep is
pending, not done.

**Ranking.** First cut scored the commands at 150, the same band the cell/module finders use.
In a notebook full of `annotation_*` cells, typing "ann" put the verb at row 3 — below the fold,
so it read as missing. Verbs are now scored at 1000/900, decisively above the finders (which top
out around 200): what you typed as an intent should not be buried under things merely named like
it.

**Verified:** 87/87. The menu item exists with a speech-bubble glyph and arms the layer; ⌘K opens,
the annotate command is present, marked as an action, carries 💬, and clicking it arms the layer
and closes the palette; the verb is the top row for the prefix "ann"; `[data-a2-add]` is gone from the DOM; the leader is dashed, round-capped,
translucent, with a more opaque head, and the selected annotation's leader is less transparent
than the rest. Note for the suite: the header markdown grew enough to push `demoImage` past a
3000px viewport, so armed clicks silently missed — the context viewport is now 3600 tall.

## 13. Iteration 6 (2026-07-31): an unresolvable anchor drifts, it does not become a rail

The orphan rail was a UI construct standing in for a note that had nowhere to go: a chip in the
corner reading "⚠ N orphaned", with the note itself not painted at all. Per Tom, a note that loses
its anchor should **snap to the top of its cell, then the notebook**, somewhere it can never be
lost.

`resolve()` no longer returns `null`. Every failure path — quote not found, host gone, svg with no
CTM, image with no box, element with no rect — calls `adrift(a, loc, stale)`, which walks a ladder:

| rung | where the note goes | when |
|---|---|---|
| `cell` | top-left of the host node, else the cell div | the cell still resolves (by pid or name) |
| `pane` | top-left of the pane | the cell is gone but its module still has a pane |
| `page` | `(12, 12)` in viewport space, `pane: null` | nothing structural survives |

The result carries `adrift: true`. The box turns amber with a dashed border, the label reads
`demoText · cell (adrift)`, and the leader is amber — at the `page` rung the leader is hidden
entirely, because there is nothing left to point at. Several notes adrift at `page` cascade 26px
apart so they cannot stack invisibly. The count moves into the status line ("N adrift"); the
`[data-a2-orphans]` element is gone.

This does not weaken the "never guess" discipline: the ladder never invents a new *exact*
position, it only admits how much structure it still has. Re-anchoring with ⌖ is the repair path,
unchanged.

**Verified:** 92/92. The demoText quote is broken and the anchor lands within 4px of the cell's
top-left corner; the box is still painted, says "adrift", is amber, and is counted in the status
line with no orphan rail in the DOM; a dead pid+name falls to `pane`; a dead module falls to
`page` at exactly `(12, 12)`. Screenshot: `tools/screenshots/a2-adrift.png` (`tools/shot-a2-adrift.mjs`).

## 14. Iteration 7 (2026-08-01): the cell is the API

Per Tom — not a plugin, not an SDK. An annotation is `annotation_x = annotation({...})` plus
`annotation_x_note`, and anything that can define a cell can make one. Full write-up:
`plan/annotate-api-design.md`. In brief:

- The record cell takes `annotation` as an **input**, so the runtime's dependency graph is the
  index — discovery walks `_outputs` through import bridges. `annotation_index` is deleted.
- `annotation()` normalises at author time: flat anchor keys, inferred surface, defaults for
  `box`/`state`, and unknown keys kept verbatim (metadata needed no new mechanism).
- `id`/`home`/`cell` are derived at discovery, not stored, so a cell needn't even be named
  `annotation_*`.
- `create`/`patch` now emit compiled source rather than a `new Function` JSON literal, so the
  record cell is readable and editable like any other.
- Externally authored cells arrive via `onCodeChange`; a name scan backstops the graph for legacy
  records and for cells in modules with no pane (nothing observes them, so the bridge never binds).

Three traps worth remembering: runtime-sdk's `myModule` is the *sdk's* module — use the runtime's
`@variable` builtin for the owning module; `lookupVariable` is async, `_scope.get` is the
synchronous equivalent; and `/^annotation_[A-Za-z0-9]+$/` silently skips `annotation_remote_c`,
which reads as broken cross-module discovery.

**Verified:** 105/105.

## 15. Iteration 8 (2026-08-01): a surface is a coordinate space, not a tag name

Tom asked whether the SVG surface would be more general as DOM. It would not be, and the reason
is the useful part: `getScreenCTM()` is a real content coordinate system that HTML has no
equivalent of (`getBoxQuads()` is Firefox-only), so a `dom` surface could only ever be a box
fraction — which `element` already is. The generalisation is one level up: **surface = pluggable
coordinate space**.

Finding the *node* was already shared (pid → cell → `region: "after"` → path) and the adrift
ladder never looked at the surface, so only the tail of `resolve()` branched. That branch is now
a table:

```js
{name, order, pick(el, loc), describe(target, x, y, loc), find(loc, a), place(target, a, loc)}
```

`describePoint` walks the surfaces by `order` and takes the first that both picks a target and
returns fields; `resolve` looks the surface up by name and calls `find` + `place`. Built in:
text (0), plot (10), svg (20), image (30), element (90). `image` and `element` are now literally
the same two helpers (`boxDescribe`/`boxPlace`) differing only in which node they select.

**Data space (the reason this was worth doing).** Observable Plot hangs `scale("x")` — with
`apply` and `invert` — on the node it returns, so a click can be inverted through the CTM and then
through the scales into `{data: {x, y}}`. Verified: the anchor survives a re-render at a different
width, where a pixel fraction slides off the datum. JSON has no `Date`, so a temporal scale's
value is stored as ISO and coerced back on the way in (`scale.type === "utc" | "time"`).

**An unknown surface is honestly adrift.** Before, an anchor whose surface this build didn't
recognise fell through to the box-fraction path and was painted *plausibly and wrongly*
(measured: `(650, 2314)` for a made-up surface carrying a `frac`). It now takes the adrift ladder
with `why: "unknown surface …"`, amber, at the top of its cell. `resolve` also reports `why` for
"target gone" and "not placeable".

**Surfaces are contributed as cells**, same trick as `annotation()`:
`mySurface = surface({name, order, pick, describe, find, place})` — the cell depends on
`surface`, so registering is a side effect of existing.

Demo: `demoSeries` + `viewof demoPlotWidth` + `demoPlot` (Plot line+dot). `Plot` is a lazy
stdlib builtin — it only resolves for a cell that actually depends on it.

**Verified:** 115/115 (`tools/test-annotate.js` §14: data-space click, tip on the datum, the
same datum after a width re-render, unknown-surface guard, and a surface contributed as a cell).

## 16. Iteration 9 (2026-08-01): the documentation is the demo

Per Tom: more whimsy, less repetition, and nothing to click before the page shows what it
does. The notebook now **ships with six annotations**, authored as cells in its own module:

| note | anchors to | shows |
|---|---|---|
| `annotation_tour_title` | the `<h1>`, by pid (the cell has no name) | what an annotation *is* |
| `annotation_tour_prose` | the third *told apart* in the prose | prefix/suffix tie-break |
| `annotation_tour_plot` | 12 March / 122 on the chart | data space across a re-render |
| `annotation_tour_svg` | (50, 50) in the drawing | user units across a zoom |
| `annotation_tour_image` | a quarter across the bitmap | box fraction |
| `annotation_tour_volatile` | a phrase the shuffle button destroys | the adrift ladder |

The explanations moved *into* those notes — the note pointing at the title says what a note
is, the one on the chart says what it is pinned to. Section prose shrank to a heading and an
instruction ("Drag the width slider"). The filler `demoText` cell is gone: the prose that
explains text anchoring **is** the text being anchored (`demoProse`).

Anchors were not hand-written. `tools/build-annotate-tour.mjs` drives the module's own
`describeSelection`/`describePoint` against the live page and prints the specs, so the
authored cells hold exactly what a real placement would have recorded.

Two bugs this exposed, both from anchors that name a cell but not a module — the shape a
person actually writes:

1. **The box was painted in viewport space.** `locate` only found a pane via `a.module`, so
   with none the box went to the fixed root and was clamped to the window: at any scroll
   offset several notes stacked at the top of the screen. `locate` now recovers the pane from
   the node it resolved to.
2. **`patch` migrated the annotation out of the notebook.** `rec.home` was recomputed as
   `anchor.module || DATA`, so patching a hand-written record moved its two cells into
   `@tomlarkworthy/annotate-data` — after which the next export dropped them from the
   notebook entirely (observed: 6 of 9 annotations lost across an export round-trip). `home`
   now defaults to where the cells already are.

`md` is now imported from editable-md by the module itself rather than injected on first
placement, so the shipped notes are click-to-edit from boot.

**Verified:** 121/121 — §0 asserts the six notes boot, resolve, cover four surfaces, and stay
in this module when patched.

## 7. What to verify before building

1. `Range` + `getClientRects()` genuinely survives a pane resize and font change on a real lopecode
   markdown cell.
2. A round-trip through `editable-md` and back — does a text quote still re-find after ProseMirror
   re-serializes the cell?
3. `tag(def, {source:"annotation"})` shows up as `provenance` on the history entry, and
   `applyHistoryState` replays an annotation cell correctly.
4. Whether `exporter-3` serializes an annotation cell in a runtime-created module without the
   placeholder-block dance v1 needed.
