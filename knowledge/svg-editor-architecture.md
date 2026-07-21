# SVG editor architecture

Design note for turning `@tomlarkworthy/svg-lens` (lawful lenses, one gesture, one attribute) into a
usable SVG editor. Written 2026-07-20 after the first port landed.

**Status 2026-07-21: M0 and most of M1 are built** — see §6. §2.1 (the blocking defect) and §2.3 (no
list lens) are fixed; §2.2 (positional addressing) and §2.4 (the monolith) are not.

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

**2.2 Addressing is positional.** Elements are identified by `idx`, an index into `tokenize(src)` in
document order, matched against `[node, ...node.querySelectorAll("*")]`. Any insert or delete
renumbers everything after it, invalidating selection, handle keys, and any in-flight gesture.

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

**The renderer — fix 2.1 like this.** Make the invariant *source is truth, DOM is a patched
projection*. On commit: build the new definition with `realize`, call it with the variable's current
input values to get a fresh node, then **morph** the live node toward it (keyed by address,
preserving the overlay subtree). Recomputing the cell instead would mint a new node and break node
identity, the drag, and any observer holding it. Morphing is ~100 lines restricted to SVG and it
covers static and interpolated documents identically, because it renders by *evaluating* the
template rather than parsing its text. Property to test: `morph(dom, src')` deep-equals a fresh
render of `src'`.

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

Blocking, in order:

1. Render-by-morph (§3) — without it no structural edit is expressible.
2. Stable addressing + selection re-anchoring.
3. `childrenLens` + insert/delete/reorder/group commands.
4. Insert/delete point, close subpath, corner↔smooth. No new math; `handleEdit` needs siblings.
5. Tool registry + select / direct-select / rect / ellipse / pen.
6. Transform gizmo: bbox with rotate and scale handles; `rotateLens`, `scaleLens`.

Then, for credibility as a general editor:

7. Hit-testing beyond `e.target`: stroke-only hits, click-through to occluded shapes, marquee,
   multi-select, z-order operations.
8. Units and coordinate systems: parsers assume unitless numbers. Real documents carry `px/%/em`,
   `preserveAspectRatio`, nested `<svg>`, `<use>`, percentage lengths.
9. Styling: attribute vs `style=` vs stylesheet precedence (`styleLens`).
10. `defs` and references: gradients, markers, `clipPath`, `<use>` — editing a `<use>` should retarget
    the lens at the referenced symbol, possibly in another cell.
11. Snapping, alignment guides, numeric entry, keyboard nudge (all pure L3).
12. Undo/redo/history via `local-change-history`.
13. Concurrency with `editor-5` — the definition read-modify-write races with text edits (§3 writer).
14. Multi-drawing: alias resolution assumes one `svgLens(svg\`…\`)` per cell and finds the variable by
    `_value` identity. Several drawings, or one assembled from imported sub-cells, is unhandled.
15. Performance: full re-tokenize per pointermove; fine at 20 elements, not at 2000.
16. Differential testing against the browser's own parser: `render(put(a, s))` should agree with the
    equivalent DOM mutation. Cheaper and more convincing than more microsyntax properties.

## 6. Milestones

- **M0 — done (2026-07-21).** Render-by-morph. `morph(live, next, skip)` patches the live node toward
  a freshly rendered one; the writer (`applySource`) is now the single place that touches
  `_definition`, re-reading it after the `await` and abandoning the put if `editor-5` changed it
  underneath. The riskiest assumption held: node identity survives, because the node is never
  replaced. Two things had to be got right — a `rendering` re-entrancy guard, or `svgLens` attaches a
  second overlay and a second listener set to the throwaway node; and treating the overlay as
  unowned, so it is skipped when aligning children and new children land before it.
  Verified in a browser: `test_morph_projection` ✅, one overlay and one `<style>` after a dozen
  edits, and a drag still commits `translate(21 13)` with `sameNode: true`.
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
- **M2** Module split + tool registry + shape tools.
- **M3** Transform gizmo, snapping, keyboard, undo.
- **M4** Holes: classification, whole-hole writeback, inversion fallback, locked-handle affordance.
- **M5** Domain widening (units, style, defs) and differential tests.

## 7. Open questions

- Does the value stay the DOM node, or become a document object with the node as a projection?
  Keeping the node is what makes `svgLens(svg\`…\`)` read naturally; it is also what forces morphing.
- Structural path vs an injected stable id attribute. Paths keep the source clean but need
  re-anchoring on every command; ids survive edits but pollute the drawing the user is authoring.
- Whether `childrenLens` should view child *source strings* (residue-preserving, chosen above) or
  parsed nodes (nicer commands, loses formatting). Probably strings at L2, nodes at L3.
