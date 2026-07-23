# SVG editor architecture

Design note for turning `@tomlarkworthy/svg-lens` (lawful lenses, one gesture, one attribute) into a
usable SVG editor. Written 2026-07-20 after the first port landed.

**Status 2026-07-23.** M0–M8 are built (§7): the editor commits through `Variable.define`, addressing
is structural, and tools, selection, the gizmo, undo, snapping and interpolated templates all work.
Every structural block in §2 is gone. What remains is **breadth** — the editor is lawful and complete
over three tags and one sink, and an SVG editor has to be complete over the format. §5 is the current
gap list, re-derived from the code and the browser; §6 is the plan for closing it.

## 1. What already exists in this repo

Three unrelated write-back mechanisms, each solving a different part of the same problem:

| Mechanism | Where | Writes to | Exact? | Works through arbitrary math? |
|---|---|---|---|---|
| Source-text lens | `@tomlarkworthy/svg-lens` | bytes of the cell's own literal | yes, lawful | no — literal geometry only |
| Numerical inversion | `@tomlarkworthy/manipulate`, `parametric-svg` `svgEditor` | upstream `viewof` parameter values | approximate | yes — needs declared `anchor(id)` markers |
| Definition swap | `@tomlarkworthy/sticky`, `grid-container` | whole cell definition | n/a | n/a |

`parametric-svg`'s `svgEditor({target, module})` already drags anchors and solves back to upstream
sliders. That is the interpolation case, solved by a different technique. The editor should not pick
one — it should route each handle to whichever sink can accept it (§4).

## 2. Why svg-lens can't grow into an editor as-is

Three structural blocks, in order of severity.

**2.1 The commit path can only `setAttribute`.** `svgLens`'s commit computes new source, swaps
`_definition`, then reconciles the DOM with a single `el.setAttribute(name, value)`. There is no code
path that can make the live DOM gain or lose a node. So "add a polygon", "delete a shape", "group",
"reorder" are not hard in this design — they are *impossible*. This is the blocker to fix first.

**2.2 Addressing is positional.** *(Fixed 2026-07-21.)* Elements were identified by `idx`, an index
into `tokenize(src)` in document order, matched against `[node, ...node.querySelectorAll("*")]`. Any
insert or delete renumbered everything after it, invalidating selection, handle keys, and any
in-flight gesture. Selection is now a **structural path**, and each structural command carries a
`rebase` that maps an address across it. See §6, M0.2.

**2.3 The lens vocabulary has no list-of-children.** The source path is
`literalLens → attrTextLens` only: replace one attribute value in one element. The abstract tree
lenses ported from the original package (`attr`, `child`, `nodeEq`) are currently *dead code* — they
operate on an `SvgNode` record that nothing parses source into. Structural editing needs a
`childrenLens` over source text, and that is the natural place to revive them.

Note what is *not* blocked: adding and removing polygon points needs no new math at all. `pointsLens`
and `pathLens` already expose a list view whose put is lawful. Insert-point is a missing affordance
(`handleEdit` only moves existing handles), not a missing lens.

**2.4 One monolith.** `svgLens` (~220 lines, one closure) owns element resolution, alias inference,
the pointer state machine, overlay rendering, snapping, commit, DOM reconciliation and event
dispatch. Every new tool means editing that cell. Same smell as a mega-dispatch switch.

## 3. Proposed layering

**Not split into separate modules (decided 2026-07-21).** The layering below is real and holds at the
cell level, but svg-lens ships as one self-contained artifact: a single notebook that carries its
essay, its demo, its property suite and its editor. Splitting would buy publishable pieces at the
price of editing six modules per change, six sync/jumpgate cycles, and a headless CI that no longer
resolves its own imports. The layer names stay as a reading order, not as a build target.

The rule that separates maths from UX: **tools emit commands, commands are lens puts, one writer
applies them.** A tool may paint a preview layer; it may never persist. Nothing below L4 touches the
DOM or the pointer.

```
L5  chrome        toolbar, inspector, keyboard, guides           @tomlarkworthy/svg-editor
L4  tools         pointer state machines, registered as plugins  @tomlarkworthy/svg-editor
L3  commands      pure (doc, sel) -> (doc', sel'), each a put    @tomlarkworthy/svg-edit-commands
L2  lens algebra  element / children / attr / microsyntax        @tomlarkworthy/svg-source
L1  document      source-mapped element tree, stable addressing  @tomlarkworthy/svg-source
L0  substrate     cell source <-> literal (acorn spans)          @tomlarkworthy/js-source-lens
    microsyntax   viewBox, points, transform, path d, style      @tomlarkworthy/svg-microsyntax
    lens core     lens/compose/iso/laws                          @tomlarkworthy/lens
```

Splitting the current 1450-line module this way is worth doing for its own sake: `lens` is ~60 lines
and generic; `js-source-lens` is not SVG-specific at all — the same primitive lenses a markdown, CSS
or JSON literal embedded in a cell, which is a general lopecode capability.

**L1, document model.** Parse the literal text once into nodes carrying byte spans:
`{tag, attrs: {name: {span, value}}, openSpan, innerSpan, closeSpan, children}`. Address a node by a
**structural path** (`[0,2,1]`) rather than a flat index, and re-anchor selection through each
command's `sel'` rather than recomputing it. Cache the parse keyed by source-string identity;
`tokenize` currently re-scans the whole document several times per `pointermove`.

The existing `tokenize` is a regex scanner, not an XML parser (no CDATA, entities, namespace edge
cases, `>` inside attribute values). Either state that domain explicitly and property-test the
boundary, or read structure with `DOMParser` and recover spans separately. Do not leave it implicit.

**L2, the missing lenses.**
- `elementLens(addr) : Lens<docText, elementText>` — the element's own source slice.
- `childrenLens(addr) : Lens<docText, elementText[]>` — enables insert / delete / reorder / group.
  Keeping the view as *exact source substrings* is what keeps it lawful and residue-preserving.
- `styleLens : Lens<string, Record<prop, value>>` — CSS declaration microsyntax, plus a
  precedence-aware "set fill" that writes wherever the value already lives (attribute vs `style=`).
- `rotateLens`, `scaleLens` — op-focused, like the existing `translateLens`, so a rotate gesture
  edits `rotate(-4)` in place instead of flattening the transform list to a float matrix.

**L3, commands.** `insertPoint`, `deletePoint`, `insertElement`, `deleteElement`, `reorder`, `group`,
`setAttr`, `translate`, `align`, `nudge`. Pure functions, testable without a browser, each expressed
as a put so the laws keep covering them. Command-level properties worth checking: insert-then-delete
is identity; reorder is a permutation; every command output re-parses as JavaScript *and* as SVG.

**L4, tools as plugins.** Register through `@tomlarkworthy/plugin-registry` (or the
`Inputs.input([])` registry idiom): `{id, label, cursor, onPointerDown/Move/Up, overlay(doc, sel)}`.
Select, direct-select, pen, rect, ellipse, line, text, measure. New tools become new cells, not edits
to a monolith.

**The renderer — superseded, see M7.** This section originally specified morphing: build the new
definition with `realize`, render it to a throwaway node, and patch the live node toward it, so node
identity survived a gesture. That was implemented and then removed. Committing through
`Variable.define` and letting the cell recompute is the correct arrangement, because the runtime is
what everything else listens to; morphing bought node identity at the price of a change no one was
told about. Node identity is not worth that, and nothing needed it once per-node state moved into a
registry.

Restrict the domain to cells whose body is a single `return svgLens(svg\`…\`)` — `literalSpan`
effectively enforces this already — so re-evaluating the template has no side effects.

**The writer.** One place touches `_definition`. It should: re-read the definition at commit time
(gesture start snapshots are stale-prone — `editor-5` may have rewritten the cell mid-drag; abort or
re-anchor by address if it changed), and record each commit into `@tomlarkworthy/local-change-history`
so undo/redo/playback come for free. Undo is cheap here: the previous source string, and the skip
rule makes re-applying it a no-op. This writer is generic — `sticky`, `grid-container`,
`editable-md` and `infinite-canvas` each hand-roll their own version today.

## 4. Interpolation: the SVG-factory case

`literalSpan` currently throws on `quasis.length !== 1`. That rejects exactly the documents worth
editing — a static SVG becomes a factory the moment one number is a hole.

Model the source as a template with holes: `{quasis: string[], exprs: string[]}`. Render, keep a
source map from rendered offsets back to (quasi index, offset). Every attribute slot then falls into
one of three classes, and the UX must show which:

1. **Literal** — the slot lies entirely in a quasi. Write text through the existing lens. Exact.
2. **Whole-hole** — the slot is exactly `${expr}`. Don't write text; write *through* to the source of
   `expr`. If it is an identifier bound to a `viewof`, set that input's value (this is what
   `parametric-svg`'s `svgEditor` does). If it resolves to a number literal in another cell's source,
   compose the lens outward into *that* cell — the lens target becomes the dataflow graph, not one
   cell. Still exact.
3. **Mixed** — `transform="translate(${x} 10)"`, or a hole inside an expression. Parse the
   microsyntax over a token stream that admits hole tokens. A numeric slot that *is* a whole hole is
   class 2; the rest of the slots stay class 1; anything else is **locked**: render the handle greyed
   rather than failing on pointerup.

Where syntax can't reach — the hole feeds trig, layout, a scale — fall back to the numerical
inversion already implemented in `manipulate`/`parametric-svg`, which needs `anchor()` markers and
gives an approximate solve. So:

```
handle -> slot -> class -> sink
                  literal    -> source lens        (exact, lawful, residue-preserving)
                  whole-hole -> upstream viewof / upstream literal   (exact)
                  mixed/opaque -> numerical inversion, or locked     (approximate / refused)
```

One `Sink` interface, three implementations, chosen by provenance. That unification is the real
architectural payload of this note, and it is also the honest framing of the laws: they hold per
sink, on a stated domain, and the UI tells you which sink a handle is on.

Prior art to cite and position against: Sketch-n-Sketch (Chugh et al.) does trace-based value update
for arbitrary programs. We deliberately restrict to syntactically local, lawful updates and degrade
to inversion only where syntax runs out — a weaker mechanism with a stronger guarantee.

## 5. Gap list

Re-derived 2026-07-23 by reading the module and driving it in a browser. The previous list had
drifted: units (`lengthLens` keeps `px/%/em`) and `styleLens` were marked missing and are done.
Ordered by how much each blocks real work.

### Bugs

**0. A structural double-click misses stroke-only shapes.** Selection routes through `hitTest`, which
is tolerant — it measures distance along the stroke, so a hairline path is easy to grab.
`toolStructure` instead uses raw `e.target` and requires `hit === focus.index`. On `fill="none"` the
interior is not hit-testable, so `e.target` is the root `<svg>`, `hit` is 0, and control falls through
to the last branch — *"double-clicked empty canvas, drop a shape"*. The gesture does not no-op, it
appends a triangle. Measured: filled `<polygon>` 3→4 points ✅; `<path fill="none">` → a new
`<polygon>` appended ❌. This is why adding a point to a line or an unfilled polygon has never worked.

### Missing capability

1. **Geometry editing exists for three tags.** `polygon`, `polyline`, `path`. `rect`, `circle`,
   `ellipse` and `line` get the transform gizmo only, so resizing a rect writes
   `transform="… scale(…)"` rather than `width`/`height`, and a `<line>`'s endpoints cannot be dragged
   at all (measured: 0 anchor handles, 4 scale handles). An editor that cannot change a rectangle's
   width is not an SVG editor, and its output is not source anyone would maintain by hand.
2. **No grouping or duplication.** The command set is insert/delete/reorder element and
   insert/delete point — that is all. No group, ungroup, duplicate, copy or paste. Compounding it, a
   click always selects the leaf (`[0,3,0]`), never the enclosing `<g>`; only a marquee reaches a
   group, via `topmostPaths`.
3. **No zoom or pan.** No wheel handler, no view transform. You edit at whatever size the drawing
   happens to render.
4. **Only shape primitives.** No `<text>` (so no typing), no `<image>`, and nothing for `defs` —
   gradients, markers, `clipPath`, `<use>`. Most real SVG documents are partly untouchable.
5. **Styling UI is one text input per attribute.** No colour picker, stroke width/dash/cap, or
   opacity. The plumbing is done — `setProperty` writes into `style="…"` when a declaration already
   lives there, else the attribute — only the widgets are missing.
6. **No document outliner.** Z-order is keyboard-only (`[ ] { }`) with nothing showing the stack, and
   there is no element tree. Past ~10 shapes you cannot find or reorder anything.
7. **Path editing stops short.** Control points drag, but there is no corner↔smooth conversion, no
   open/close subpath toggle, and arc segments are explicitly refused for subdivision.
8. **No align or distribute.** Snapping guides exist mid-drag; there is no align/distribute command
   over a selection.
9. **One drawing per cell.** Alias resolution finds the variable by `_value` identity, so two
   `svgLens(…)` calls in one cell, or a drawing assembled from imported sub-cells, is unhandled.
10. **`editor-5` wins a race it should share.** The writer re-reads `_definition` and abandons the put
    if it changed. Safe, but typing in the cell during a drag silently discards the drag.
11. **Performance is O(document) per frame.** Full re-tokenize per `pointermove`; measured 1.45 ms per
    move at 24 nodes. Linear, so it will not hold at hundreds of elements. **Deprioritised
    2026-07-23** — correctness and breadth first.

### UX limitations

Cheap, and several are the visible face of the gaps above.

- Double-click on empty canvas drops a triangle — and is also the fallback for every missed structural
  double-click, which is how gap 0 presents as "a random shape appeared".
- No hover highlight or cursor change showing what a click will hit, even though hit-testing is
  tolerant and therefore invisible.
- No axis lock while moving (shift squares a *draw*; alt only disables snapping).
- Esc switches tool; it does not cancel an in-flight drag.
- No numeric readout during a drag.
- Overlapping shapes cycle by repeated tap. Works, undiscoverable.
- No select-all, no context menu.

### Not a gap

Only literal `` svg`…` `` templates are editable; a drawing built by `.map()` is not. That is the
source-last thesis, and the paper states it.

## 6. The plan from here

Three constraints: **holistic** (one idea, not eleven patches), **incremental** (each stage ships and
is useful on its own), **testable** (each stage names what would falsify it).

### 6.1 The one idea: competence is the contents of the registries

M2 already made this move once, for tools, and it worked — a new tool is now a new cell rather than an
edit to a monolith. Every remaining gap is the same move, not yet made, on four more axes:

| axis | today | should be |
|---|---|---|
| which tags have editable geometry | `polygon/polyline/path`, hardcoded in `toolMove` and `handleEdit` | **shape registry**: tag → `{handles, edit, resize}` |
| what a gizmo writes | always `transform` | the shape's own `resize`; `transform` only as fallback |
| which structural edits exist | seven `runCommand` call sites | **command registry**: id → `{apply, rebase, label, key}` |
| what the inspector shows | one text input per attribute | **field registry**: attribute → widget |
| what counts as a hit | `hitTest` in some tools, `e.target` in others | one `ctx.hit(e)`; no tool touches `e.target` |

§4 already routes `handle → slot → class → sink`. The gizmo is the one thing that skips the middle and
goes straight to `transform`. So gap 1 is not new machinery — it is **deleting a special case** so the
gizmo goes through the routing everything else already uses.

One consequence worth stating early: **zoom/pan needs no tool changes at all.** Every tool converts
through `getScreenCTM()`, so a view transform that is DOM-only and never committed is invisible to
them — the rule the overlay already lives under (`isOwn`). Gap 3 is one cell, not a subsystem.

### 6.2 The missing half of the test strategy

The suite is 50 property tests and every one is a pure lens law. **Nothing exercises a gesture.** All
three bugs found on 2026-07-23 — the overlay ghosting a moved shape, the pen losing its path after its
first anchor, a multi-element move committing only the first element — were gesture-level, and the
suite was green throughout. Gap 0 is the same kind of defect.

Synthetic `PointerEvent`s do drive real commits (dispatch `pointerdown` on `elementFromPoint`, then
moves and `pointerup` on the root), so the harness is cheap. What makes it worth having is that the
assertions are **invariants rather than screenshots**. These hold after *any* gesture:

- **I1** the overlay frames the selection: box `getBoundingClientRect()` minus the element's is 0.
- **I2** one gesture produces one undo entry per element it claimed to edit.
- **I3** the rendered DOM agrees with a fresh render of the committed source.
- **I4** no gesture adds or removes an element unless it was a creation or deletion gesture.
- **I5** every selection path still resolves afterwards.

I4 alone catches gap 0; I1 catches the ghosting; I2 catches the multi-element move. Write them once,
run them after every scripted gesture, and the class of bug that has been getting through stops
getting through.

### 6.3 Stages

Each stage ends shippable. *Falsified by* is the check that has to go green.

**S0 — gesture harness and I1–I5.** One harness cell, one test cell per invariant. No product change.
*Falsified by:* replaying the three 2026-07-23 bugs against it and having any of them pass.

**S1 — one hit contract.** Add `ctx.hit(e)`; remove `e.target` from `toolStructure`. Group-vs-leaf
selection becomes a policy in that single place (leaf on click, ancestor on marquee, double-click to
descend). Closes gap 0 and part of gap 2.
*Falsified by:* any row of a (shape, fill, click position) table picking a different target than
selection would; or I4 firing on a double-click.

**S2 — shape registry, no behaviour change.** Move the existing points/path handlers into tag-keyed
entries. Nothing new works yet; the 50 lens tests and I1–I5 must stay green. This is the refactor that
makes S3 one cell per tag.
*Falsified by:* any existing test changing, or needing to change.

**S3 — rect/circle/ellipse/line geometry, and gizmo routing.** Each tag is a new cell supplying
`{handles, edit, resize}`; the gizmo prefers `resize` and falls back to `transform` for groups and
paths. After this stage the phrase "SVG editor" is defensible.
*Falsified by:* dragging a rect's corner and finding `transform` in the source rather than `width`; or
a **resize agreement** property — resizing through the registry and through `transform` must produce
the same rendered bounding box.

**S4 — command registry, then group/ungroup/duplicate/copy/paste.** Each is a pure doc→doc with a
rebase, so `test_rebasePath`'s ground-truth method extends unchanged.
*Falsified by:* `insert∘delete ≠ id`, `group∘ungroup ≠ id` (modulo whitespace), or a rebase that
disagrees with its edit — the M0.2 failure mode, which silently drops the selection.

**S5 — outliner.** A pure projection of `childrenLens` plus `node.select`; no new write path.
*Falsified by:* I5, or the tree disagreeing with `parseDoc`.

**S6 — field registry: colour, length, dash, opacity widgets.** `setProperty` already routes
attribute vs `style`.
*Falsified by:* a widget's commit differing byte-for-byte from the equivalent `setAttr`.

**S7 — zoom and pan, as an uncommitted view transform.**
*Falsified by:* the source not being byte-identical after any zoom or pan; or the same drag producing
a different committed value at zoom 2.5 than at zoom 1.

**S8 — `<text>`, `<image>`, `defs`/`<use>`.** Text needs a *content* lens (children, not attributes).
`<use>` needs the lens to retarget at the referenced element, possibly in another cell — §4's outward
composition, one level further.
*Falsified by:* editing a `<use>` writing to the `<use>` rather than to its referent.

**Deferred:** performance (gap 11, Tom's call 2026-07-23), multi-drawing (gap 9), `editor-5`
concurrency (gap 10). None of them blocks the stages above.

## 7. Milestone log

- **M0 — done (2026-07-21), later superseded by M7.** Render-by-morph. `morph(live, next, skip)` patches the live node toward
  a freshly rendered one; the writer (`applySource`) is now the single place that touches
  `_definition`, re-reading it after the `await` and abandoning the put if `editor-5` changed it
  underneath. The riskiest assumption held: node identity survives, because the node is never
  replaced. Two things had to be got right — a `rendering` re-entrancy guard, or `svgLens` attaches a
  second overlay and a second listener set to the throwaway node; and treating the overlay as
  unowned, so it is skipped when aligning children and new children land before it.
  Verified in a browser: `test_morph_projection` ✅, one overlay and one `<style>` after a dozen
  edits, and a drag still commits `translate(21 13)` with `sameNode: true`.
- **M0.2 — stable addressing done (2026-07-21).** Selection is a path (`svgFocus` holds `path`, and
  derives `index` on demand for the handle lenses, which address elements the way `tokenize` does).
  §8's first open question is settled in favour of structural paths over injected ids: the drawing is
  the artifact the user is authoring, and stamping `data-lens-id` onto every element would pollute
  exactly the source this project exists to preserve.
  A path survives anything outside its own parent chain, so most edits need no rebase at all —
  appending a shape, or any attribute edit, leaves every path valid. For the rest, `runCommand` takes
  a `rebase` that maps an address across the edit; the writer never applies it (it still does not know
  selection exists), it just reports it on `lens-put` and `svgLens` feeds it to the focus.
  `test_rebasePath` checks it against ground truth rather than restating its rules: note the source
  text at a path, apply the command, assert the rebased path lands on that same text — for *every*
  sibling, not just the edited one.
  One bug worth recording, found in the browser and not by the tests: the commands clamp out-of-range
  indices, and the rebase did not, so an out-of-range `moveTo` silently dropped the selection. The fix
  is structural — normalise the index once in `svgLens` and hand the same value to both — because any
  future divergence between an edit and its rebase has the same symptom.
- **M1 — mostly done (2026-07-21).** `childrenLens` (view = child element *source strings*, gaps
  travel with their child); commands `insertElement`, `deleteElement`, `reorderElement`,
  `insertPoint`, `deletePoint`, `nearestSegment`; `scan`/`parseDoc`/`nodeAt`/`pathOfIndex` give a
  spanned tree and path addressing. Gestures: double-click an edge to add a vertex, a vertex to
  remove it, empty canvas to drop a shape; `node.addShape/removeAt/moveTo/edit` programmatically.
  End-to-end in the browser: adding a polygon moved DOM 3→4 *and* source 3→4 with comments,
  `translate(228 128) rotate(-4)` and the JS residue outside the literal all intact.
  Still missing from M1: path (not just polygon) point insert/delete, which needs bezier
  subdivision, and group/ungroup.
  Finding: `childrenLens` cannot be very-well-behaved while preserving residue. A child's leading
  gap dies with the child, so delete-then-re-add cannot restore it; PutPut therefore holds only up to
  get-equivalence (`test_childrenLens_laws` asserts exactly that). Reprinting every gap canonically
  would buy strict PutPut at the cost of the residue — the wrong trade for this project.
- **M2 — tool registry done (2026-07-21).** `svgLens` is wiring only; it delegates to `svgTarget`
  (which variable am I, what does the literal say), `svgWriter` (the only code that assigns
  `_definition`), `svgOverlay`, `svgFocus`, and the `svgTools` registry. A tool is
  `{id, onPointerDown, onPointerMove, onPointerUp, onDblClick}`; `onPointerDown` returns true to claim
  the gesture and registry order is priority. Tools preview in the live DOM and hand a command or a
  commit to the writer — none of them knows what a lens is. The writer stays ignorant of selection:
  it reports on the `lens-put` event and the handles follow.
  Verified by registering a third-party tool (shift-double-click to delete) from *outside* the module
  and watching it delete a shape from both DOM and source without svgLens being touched.
  Module split and shape tools still to do.
- **M2.5 — creation done (2026-07-21).** Drag-out `rect`/`ellipse`/`line` and a click-by-click pen,
  plus the active-tool concept the priority registry lacked: `node.setTool(id)`, read by `ctx.tool()`.
  Only the creating tools gate on it, so everything else stays reachable in select mode; a tool that
  finishes returns to select on its own and the toolbar follows the editor's `lens-tool` event rather
  than owning the state. Creation geometry is pure (`dragBox`, `shapeSpec`, `shapeMarkup`,
  `penPath`) and the drag preview is rendered *from the same spec* as the committed markup, so the two
  cannot disagree — which is what `test_shape_creation` asserts, reading the committed markup back
  through the real parser. The pen keeps no builder state: the path is in the source from the first
  click and each further click is an ordinary `d` put.
  Bug found in the browser and not by the property tests: a new child inherited the *whole* leading
  gap of the first child, so every insert reproduced the comment above it — four shapes, five copies.
  A fresh child now inherits only the indentation of that gap. Regression test in the CI file.
- **M2.7 — selection done (2026-07-21).** `svgFocus` holds an ordered *set*; the first path is the
  primary and everything that only makes sense for one element follows it, so the tools written
  against single selection needed no changes. Hit-testing defers to `document.elementsFromPoint`,
  which already answers for painted geometry (click-through to occluded shapes comes for free) and
  falls back to distance sampled along the geometry so a hairline stroke is still reachable — the
  browser stays the authority on hit shape. Tapping the primary again steps down the stack;
  shift-tap toggles; a rubber band on empty canvas selects by box intersection in root user space.
  Dragging one of several selected shapes moves them all, one commit each. `zTarget` states z-order
  against the paint model (`front` is last) and `[`/`]`/`{`/`}`/`Delete` act on the selection.
  Invariant found by rubber-banding the demo: a selection must never hold both a group and something
  inside it, or a drag translates the inner element twice. `topmostPaths` enforces it in `svgFocus`,
  so every entry point is covered rather than just the marquee.
- **M2.9 — undo/redo done (2026-07-21).** Each `applySource` now reports the whole prior definition
  on the put record, and `svgLens` keeps a bounded undo/redo stack of those strings. Undo is
  "put the previous source back", which the writer already knows how to do, so a structural undo
  restores the exact prior bytes instead of trying to invert a command. It *refuses* when the current
  source is not what the entry produced — editor-5 or another gesture has written since, and
  clobbering that is worse than declining. Bound to ⌘Z/⇧⌘Z; while the caret is in a cell, editor-5
  keeps its own undo.
  Since M7 this *is* visible to `local-change-history`: committing through `define` re-inserts the
  variable into `runtime._variables`, which is the only thing that wakes `check_for_code_change`.
  One history entry per gesture is the cost, and the correct one.
  Verified in a browser: ten gestures (five drags, five structural inserts) undone and redone in
  order, every intermediate source byte-identical to the snapshot taken at the time.
- **M3** Transform gizmo (done, 2026-07-21 — see task #7), snapping, keyboard, undo *(done)*.
- **M4** Holes: classification, whole-hole writeback, inversion fallback, locked-handle affordance.
- **M4.5 — differential tests done (2026-07-21).** `test_parse_vs_DOMParser` (browser-only) checks the
  scanner against `DOMParser` on eight documents — real markup plus the cases a regex tokenizer gets
  wrong: `>` inside an attribute value, mixed quote styles, entities, comments containing angle
  brackets, deep nesting, both closing forms. It compares tree shape, every attribute value, and the
  *slices* the spans name, because a merely plausible span is the dangerous case: it splices the
  wrong bytes silently.
  The domain is now explicit and enforced rather than described in a comment. `outsideDomain(src)`
  refuses CDATA sections, `<scr…ipt>`/`<sty…le>`/`<foreignObject>` and DOCTYPEs with an internal
  subset, at every entry point (`parseDoc`, `tokenize`, and so `childrenLens` too). It works over
  *tokens*, not raw text — a script tag written inside a comment is a comment. Entity references stay
  inside the domain and are deliberately left as the author's bytes: this editor rewrites source, so
  decoding on the way in would mean re-encoding on the way out.
  Cost of learning: the corpus originally wrote `<scr…ipt>` literally. A module lives inside an HTML
  script block, whose bytes are parsed in script-data state — `</scr…ipt` ends the block, and `<!--`
  followed by `<scr…ipt` puts the parser in double-escaped state where the real end tag no longer
  ends it. The notebook booted as raw text twice. There is now a CI check for it, and a second
  lesson: after such a break, `sync-module` leaves orphan bytes after the block, so restore the
  notebook from git before re-syncing rather than syncing over the wreckage.
- **M3.5 — snapping, keyboard, inspector done (2026-07-21).** `snapRects` is pure rectangle
  arithmetic — boxes in, delta plus guides out — so the caller chooses the coordinate system. The
  move tool works in *screen* space, where every box is axis-aligned whatever transforms its element
  carries and where the drag delta already lives; guides are converted back into root user space to
  draw. Alt ignores snapping. An aligned axis keeps its exact value (rounded only to kill float
  dust); an unaligned one still lands on the grid, per axis.
  Arrow keys nudge (shift ×10) and the inspector types exact attribute values. Both go through
  `writer.commit` — the same put a drag makes — so there is no second write path to keep lawful, and
  a typed `transform` keeps its readable spelling.
  Verified in a browser: dragging the circle to the mountain's left edge landed at delta 0.0000 with
  one guide drawn and cleared on release; nudge moved 1 then 10; typing r=31 rewrote only `r`.
- **M5 — domain widening done (2026-07-21).** Three additions, each a lens or a pure command:
  `lengthLens` (view the number, keep the unit as residue, so `50%` edited to 60 stays `60%`),
  `styleLens` over the `style=""` declaration list, and `setProperty`, which writes a paint property
  into an existing declaration rather than adding an attribute that the declaration would override —
  the worst kind of edit is one that looks like it worked. References (`url(#id)`, `href="#id"`)
  resolve to a path via `refsOf`/`pathOfId`, and the inspector offers them as buttons that select the
  target; a dangling reference reports a null path rather than throwing.
  Still out of scope, and now said out loud rather than implied: percentage *resolution* against a
  viewport, `preserveAspectRatio`, nested `<svg>`, and external references. The parse domain itself is
  enforced (M4.5).

- **M4 — interpolated templates done (2026-07-21).** `literalSpan` now admits holes inside attribute
  values and still refuses them in element position (a hole there can render any number of elements,
  so document-order indices would stop matching the DOM). `slotsOf` classifies an attribute's numeric
  slots as literal or hole; `mergeInterpolated` writes the literal ones and returns the holes byte for
  byte; the writer routes a moved hole to `writeUpstream`, which sets the `viewof` the identifier
  names. Every gesture reports its sink on the put record (`literal`, `upstream`, `upstream +
  literal`, `mixed (partly locked)`), and `svgFocus` greys the handles over any interpolated
  attribute before the drag rather than failing on release.
  Three things only a browser could have found, all of them read-side rather than write-side:
  - Tools read attribute values *from the source*, and `translate(${shift} 0)` is not a pair of
    numbers — `translateLens.get` threw inside `onPointerDown`, so no tool claimed the gesture and
    the drag silently did nothing. `effectiveAttr` reads through to the rendered element wherever the
    source token has holes. Writing still goes to the source; only measuring goes to the drawing.
  - `literalSafe` was absolute (`no ${ at all`), which refuses the author's own holes on the way back
    in. It is now relative to the bytes being replaced: a hole that was already there may return
    verbatim, a new one may not, and outside the holes nothing may contain template syntax.
  - The tools preview by writing the live element, so by commit time the DOM already held the new
    value and the writer diffed it against itself — every slot looked untouched and the drag
    committed nothing. `commit(…, was)` takes the pre-gesture rendered text from the tool that owns
    the preview.
  Verified in a QA browser on the three-rect factory demo: dragging the rect whose whole transform is
  `${shift}` moved `viewof shift` 40 → 70 with the source untouched; dragging the second rect
  vertically wrote `translate(${shift} 0)` → `translate(${shift} 22)`, hole intact, slider unmoved,
  sibling untouched; the rect on `rotate(${spin / 2} …)` showed five `locked` handles and its gizmo
  drag was refused with a stated reason and no write.

- **M6 — the notebook became the paper (2026-07-21).** Reading order is now: demo (toolbar, drawing,
  then the inspector, which is below because its height follows the selection and above it every
  selection change shifted the picture mid-gesture) → how to use it elsewhere → the source-last note
  and an `exporter-3` download link whose label counts the puts it will capture → the argument, with a
  widget beside each claim → related and future work → references → appendix (tests first as the
  specification, then implementation in dependency order, imports last).
  Two things worth remembering. `` tex`…` `` **is** a lopecode builtin (KaTeX) — use it; a
  hand-written TeX→MathML shim was written here first on a bad probe and then deleted, and the builtin
  renders considerably better. And the §6 log widgets first came out blank: the upstream sink moves a slider, the runtime then
  recomputes the drawing cell, and everything downstream of it restarts — so the put log had to move
  into a cell nothing recomputes, with the widgets as pure renderings of it.

- **M7 — a gesture is an ordinary edit (2026-07-21).** `applySource` now commits with
  `Variable.define` and waits for the recompute, instead of assigning `_definition` and morphing.
  Tom's objection was the right one: a drag *changes the document*, so suppressing the recompute
  means the runtime never learns something true happened, and every consumer then needs a private
  side channel. Measured in a browser: a silent `_definition` swap causes **zero** `_variables`
  add/delete, so `check_for_code_change` never re-samples and `editor-5` keeps a stale buffer it
  will write back over the drag; `v.define(name, inputs, fn)` on an existing variable logs
  `add:<name>` even though membership is unchanged, which is what wakes the sampler. `editable-md`
  had been getting this for free all along by calling `self.define(...)`.
  The enabling change is that per-node closure state moved into a `lensState` Map keyed by the
  `Variable` (which `define` mutates in place): undo/redo stacks, selection paths, active tool.
  Selection restores *by path* after the remount — the reason it was addressed as a path.
  Two things this makes true and one it costs. `morph` and the `guard` flag are deleted, along with
  `test_morph_projection`. Every gesture now appears in `local-change-history` and in `editor-5`.
  The cost: the SVG node is replaced on each commit, so anything downstream of the drawing restarts
  per gesture — the put log already lived in a recompute-proof cell, so the edit counter survives.
  A put is announced on both the pre- and post-commit node, so history dedupes on a `recorded` flag
  and `replaying` lives in the shared state; without that, an undo was re-recorded as a fresh edit.
  Verified: 3 edits / 3 undos / 3 redos keep exact stacks and byte-exact sources, selection survives
  nine remounts, a synthesized pointer drag writes `translate(18.5 4)`, commit ≈53 ms, 34/34
  in-notebook tests, 0 errored cells.

- **M8 — prose pass (2026-07-21).** Paper reworded down from its more assertive register at Tom's
  request ("a lot of the prose is junk and over the top"), and citation density raised from ~22 to 32
  across 13 works. Two references added after web verification rather than recall: Tanimoto 1990
  (VIVA, the liveness levels — cited for the direction this editor *reverses*) and Omar et al. 2019
  (typed holes — cited to mark that "hole" here is the weaker, syntactic sense). Do not add a
  citation from memory; check it.

## 8. Open questions

- Does the value stay the DOM node, or become a document object with the node as a projection?
  Keeping the node is what makes `svgLens(svg\`…\`)` read naturally. Resolved in M7: the node is
  replaced on every commit and nothing depends on its identity.
- Structural path vs an injected stable id attribute. Paths keep the source clean but need
  re-anchoring on every command; ids survive edits but pollute the drawing the user is authoring.
- Whether `childrenLens` should view child *source strings* (residue-preserving, chosen above) or
  parsed nodes (nicer commands, loses formatting). Probably strings at L2, nodes at L3.
