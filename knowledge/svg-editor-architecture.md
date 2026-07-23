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
is useful on its own), **testable** (each stage names what would falsify it). §6.1 is the structural
idea, §6.2 the theory the gesture half is missing, §6.3 how it gets checked, §6.4 the task list, §6.5 the stages.

### 6.1 The one idea: competence is the contents of the registries

M2 already made this move once, for tools, and it worked — a new tool is now a new cell rather than an
edit to a monolith. Every remaining gap is the same move, not yet made, on five more axes:

| axis | today | should be |
|---|---|---|
| which tags have editable geometry | `polygon/polyline/path`, hardcoded in `toolMove` and `handleEdit` | **shape registry**: tag → `{handles, edit, resize}` |
| what a gizmo writes | always `transform` | the shape's own `resize`; `transform` only as fallback |
| which structural edits exist | seven `runCommand` call sites | **command registry**: id → `{apply, rebase, label, key}` |
| what the inspector shows | one text input per attribute | **field registry**: attribute → widget |
| what counts as a hit | `hitTest` in some tools, `e.target` in others | one `ctx.hit(e)`; no tool touches `e.target` |
| which tools are installed | `svgTools`, an ambient registry cell | `options.tools`, **defaulting to** `svgTools` |

§4 already routes `handle → slot → class → sink`. The gizmo is the one thing that skips the middle and
goes straight to `transform`. So gap 1 is not new machinery — it is **deleting a special case** so the
gizmo goes through the routing everything else already uses.

One consequence worth stating early: **zoom/pan needs no tool changes at all.** Every tool converts
through `getScreenCTM()`, so a view transform that is DOM-only and never committed is invisible to
them — the rule the overlay already lives under (`isOwn`). Gap 3 is one cell, not a subsystem.

**Registries should be parameters, not ambient cells.** `svgTools` is reachable from any cell, which
is good for extension and bad for everything else: two lenses on a page cannot differ, a test cannot
isolate one tool, and the essay cannot show a reduced editor. Take the whole set at the callsite,
defaulting to the registry:

```js
svgLens(node, { tools: [toolVertex] })                  // a vertex-only editor, for a figure
svgLens(node, { tools: (d) => [myWallTool, ...d] })     // extend without restating the defaults
svgLens(node)                                           // exactly today's behaviour
```

This is what makes §6.3's composition law checkable at all — it needs to run the corpus under tool set
`T` and under `T ∪ {t}` — and it turns "the editor is a configuration" from a claim in the prose into
something the paper can demonstrate inline.

### 6.2 Gestures need their own theory, and it exists

The lens half of svg-lens is over-served: 50 property tests, laws quoted in the prose, `runCommand`
even self-checks `GetPut` at runtime and reports it on the `lens-put` event. The gesture half has
none of that, and all three bugs found on 2026-07-23 were gestural.

The cause is visible in one line of `toolMove`. Mid-drag it paints
`el.setAttribute("transform", translateLens.put(g.T, g.text))`; on release it calls
`writer.commit(g.idx, "transform", g.T, "", translateLens, g.text)`. The **same** `(value, lens,
sourceText)` triple, applied by hand to two different targets, in two places, in every tool. The
gesture's delta is never a value — it is scattered across `ctx.state.drag` and consumed twice — so
there is nothing to state a law *about*.

The theory for this is the **delta/edit-based** generalisation of the state-based lenses already in
the paper. Axioms below are quoted from Johnson & Rosebrugh, *Unifying Set-Based, Delta-Based and
Edit-Based Lenses*, Bx 2016 (CEUR Vol-1571) — henceforth **[JR16]** — which axiomatises Hofmann,
Pierce & Wagner, *Edit Lenses*, POPL 2012 (**[HPW12]**, already cited by the paper) and Diskin, Xiong
& Czarnecki, *From State- to Delta-Based Bidirectional Model Transformations: the Asymmetric Case*,
JOT 10 (**[DXC11]**).

**Module** [JR16 Def 6]. A set `X` with a monoid `M_X` acting **partially** on it:

    (M1)  x · 1 = x
    (M2)  (x · m) · m′ = x · (m m′)

Partiality is load-bearing: whenever either side of an equation is defined, so is the other, and they
agree.

**Stateful monoid homomorphism** [JR16 Def 9]. A set `C` of *complements* (JR16: "or better, the
consistencies") and a partial `p : M_X × C ⇀ M_Y × C`. Writing `p(m,c) = (n,c′)` and
`p(m′,c′) = (n′,c″)`:

    p(1, c)     = (1, c)
    p(m m′, c)  = (n n′, c″)

So the answer to both questions I flagged earlier is **yes**: translating the identity edit must give
the identity edit, and translation must respect composition. The first is sharper than I assumed — it
also requires the **complement to come back unchanged**. ([HPW12] requires these homomorphisms total
and carries a distinguished initial complement; [JR16] drops both, and argues the correspondence
survives.)

**Edit lens** [JR16 Def 10]. `Λ = (C, p, q, K)` with `p`, `q` stateful monoid homomorphisms over a
shared `C`, and a non-empty *consistency relation* `K ⊆ X × C × Y`:

    (1) (x,c,y) ∈ K and x·m defined  ⟹  p(m,c) = (n,c′) defined, y·n defined, (x·m, c′, y·n) ∈ K
    (2) symmetrically for q

**Very well-behaved asymmetric delta lens (d-lens)** [JR16 Def 3, after DXC11]. `(G, P)`, `G` a
functor (the Get), `P` the Put:

    (i)   d-PutInc  dom P(X, α) = X
    (ii)  d-PutId   P(X, id_{G X}) = id_X
    (iii) d-PutGet  G(P(X, α)) = α
    (iv)  d-PutPut  P(X, α′∘α) = P(X′, α′) ∘ P(X, α),  where X′ = cod P(X, α)

#### The dictionary

The axioms are already about svg-lens once you see one thing: **the gesture scratch is the
complement.**

| edit lens | svg-lens |
|---|---|
| `X`, `M_X` | the cell source; the edits a command can make to it |
| `Y`, `M_Y` | the rendered drawing; pointer deltas |
| `C` | **`ctx.state.drag`** — `T0`, `x0/y0`, `targets`, the hit list, the snap boxes |
| `q : M_Y × C ⇀ M_X × C` | **the tool** |
| `K` | "the DOM on screen is what this source renders to" |
| `(G, P)` | the renderer and `svgWriter` |

Two frameworks doing two jobs: the **d-lens** is the right shape for the writer (the source is
authoritative, the drawing is derived), and the **edit lens** is the right shape for a tool, because
what a tool needs and a state-based lens lacks is exactly a complement.

#### The axioms we want

| # | law | source | what it says here | falsified by |
|---|---|---|---|---|
| **T1** | `p(1,c) = (1,c)` | JR16 Def 9 | a null gesture makes a null source edit **and hands the complement back untouched** | left half: gap 0, where a missed hit becomes a *creation*. Right half: the pen bug, where the first-anchor commit discarded `state.pen` |
| **T2** | `p(mm′,c) = (nn′,c″)` | JR16 Def 9 | translating a composite gesture = composing the translations | incremental accumulation, i.e. the float-drift class |
| **T3** | d-PutGet | JR16 Def 3 | the gesture you made is the gesture the committed source shows | the 2026-07-23 ghosting; "looked right until I reloaded" |
| **T4** | d-PutInc | JR16 Def 3 | a gesture commits against the state it started from | **the "gesture outlives its node" bug** — a commit minted a new node, the old target stopped resolving, and element 2's put was computed against a stale `X` |
| **T5** | consistency preservation | JR16 Def 10 (1) | if the DOM agreed with the source before the gesture, it agrees after | makes T3's DOM-level check a consequence rather than a separate assertion |

T4 is the one I would not have thought to write down, and it retroactively names a bug that took a
day to find. That is the argument for doing this at all.

**T2 explains two design choices that currently look like accidents.** It holds today because tools
compute from the gesture *origin* held in the complement (`T0`, `x0`, `y0`) rather than from the
previous frame, and because an attribute write is last-write-wins, so `n n′ = n′`. The law is the
reason for both. It is also the law that snapping and grid rounding threaten — and they are survivable
for exactly the same reason d-PutPut survives in the paper today: last-write-wins holds only **up to
observation** under the skip rule (§residue), so T2 inherits that weakening rather than needing a new
excuse.

**Partiality is the formal content of "a tool must decline cleanly."** [JR16] stresses that the action
is partial. A gesture on an attribute outside the lens domain is undefined, and the law forces its
translation to be undefined too — the tool declines. `tryFocus`'s `catch { return false }` is that,
done right. `toolStructure` falling through to *drop a new shape* is that, done wrong, which is gap 0
again from a third direction.

#### Two laws that are ours, not theirs

Stated separately because they are not in either paper and should not be cited as if they were.

- **T6 Confinement.** A tool that returns `false` from `onPointerDown` has changed nothing, and
  installing it cannot change what the tools before it do. Registry order is priority, so tool sets
  form a non-commutative monoid under concatenation and the priority fold must respect it. Motivated
  by [HPW12]'s modular-construction goal, but it is a property of our fold, not one of their axioms.
  **This is the law that makes a tool a plugin rather than a patch** — it is what a third-party tool
  has to prove.
- **T7 Rebase agreement.** `rebase(p, c)` equals re-locating the same element after `apply(c)`:
  operational transformation's TP1 in one-sided form, from the OT literature. `test_rebasePath`
  already checks it for one command by exactly that ground-truth method; generalise it to the command
  registry.

#### Three gaps that stop being special cases

- the **shape registry is a family of prisms** — tag dispatch is a sum type, and `preview ∘ review =
  Just` is the law each entry owes;
- **hit-testing is an affine** — a focus that may fail, whose law is that a failed `get` makes `put` a
  no-op, which is T1 restated;
- **multi-selection is a traversal** — so "set fill on the selection" is traversal ∘ lens, and
  align/distribute (gap 8) and group edit (gap 2) come with it.

All three have textbook laws and reuse the existing `forAll` harness unchanged.

*(Bibliography: the notebook already cites `hofmann2012editlenses`. Adding `diskin2011delta` and
`johnson2016unifying` is worth doing only if the prose actually uses them.)*

### 6.3 How the laws get checked

Synthetic `PointerEvent`s drive real commits (proven 2026-07-23: dispatch `pointerdown` on
`elementFromPoint`, then moves and `pointerup` on the root), so the harness is a scripted trace plus
assertions. Split the tool so both halves are checkable:

- `preview(ctx, delta)` paints the live DOM; `commit(ctx, delta)` yields a command. Default `preview`
  = apply the commit's own lens put to the live attribute, which makes **T3 structural rather than
  tested** for every tool that does not override it — and deletes the duplicated triple from each
  tool.
- With the delta a value, a tool is a pure `trace → [command]`, testable headlessly; T1, T2, T4, T6
  and T7 need no DOM at all. Only T3 and T5 need a browser.

Four instruments, all measurements rather than screenshots, each mapping onto a law:

| instrument | checks |
|---|---|
| overlay `getBoundingClientRect()` minus the element's = 0 | T3 at the chrome level |
| DOM equals a fresh render of the committed source | T5 |
| undo depth delta = number of elements the gesture claimed | T2, and T1 for a null gesture |
| element count unchanged unless the gesture was a creation or deletion | T1, T6 — this alone catches gap 0 |
| the commit lands on the node that is current, not the one the gesture started on | T4 |
| every selection path still resolves | T7 |

Report them on the existing `lens-put` event beside `GetPut`/`PutGet`, so the editor keeps checking
its own laws at runtime, the way `runCommand` already does.

### 6.4 Task list: adopting deltas, and the laws that check them

#### What each tool does today

Read out of the module 2026-07-23. "Absolute" = recomputes from the gesture origin held in the
complement each frame rather than accumulating from the previous frame — the property T2 needs.
"Sinks agree" = the mid-drag preview is derived from the same value/lens/base the commit uses.

| tool | view edit | complement `C` | source edit | absolute | sinks agree |
|---|---|---|---|---|---|
| `toolDraw` | two corners | `draw{kind,x0,y0,x1,y1,square,preview}` | `addShape(markup)` | ✅ | ✅ **by construction**, via `shapeSpec`/`shapeMarkup` |
| `toolMove` | screen `(dx,dy)`, N targets | `drag{targets[{idx,el,text,Slin,T0}],x0,y0,…}` | `transform` via `translateLens`, once per target | ✅ from `T0` | ✅ same `(g.T, translateLens, g.text)` |
| `toolVertex` | pointer → vertex coords | `drag{key,idx,mode,x0,y0,was,edit}` | `points`/`d`, default lens | ✅ re-derives from `t` | ✅ same `edit.value` |
| `toolTransform` | pointer → scale/rotate about a pivot | `drag{key,idx,el,b,text,base,ops,centre,pivot}` | `transform` via `opsLens` | ✅ from `base` | ❌ **preview `ops.map(printOp).join(" ")`, commit `opsLens.put(ops, text)`** |
| `toolPen` | one click | `pen{path,start,last,band}`, `penClick` | `d`, one commit **per click** | ✅ text-in-text-out | ✅ (the band is not the committed value) |
| `toolMarquee` | rubber band | `band{x0,y0,x1,y1,add,box,moved}` | **none** — selection only | n/a | n/a |
| `toolStructure` | one double-click | stateless | five `runCommand` branches | n/a (discrete) | n/a |

Two conclusions. **`toolDraw` is already right** and its comment says why — derive the preview *from*
the thing you will commit and they cannot disagree. The work is generalising that one discipline to
the other six. **`toolTransform` is the only tool with a live T3 defect**: two different printers for
the same value, so preview and source diverge on residue by construction.

Tick the boxes as work lands; `git log` is the audit trail. Ordering constraints are in the items,
and the roll-up is at the end of this section.

#### P — prerequisites (make the laws statable)

- [x] **P1 · the delta record.** Landed 2026-07-23 as three cells in the TOOLS section:
  `gestureDelta` (constructors `attr`/`command`/`select` plus `text(d)`, the single expression both
  sinks read), `previewDelta` and `commitDelta`. Both sinks take a delta **or a list of them**, which
  is what makes `toolMove`'s N targets and L4's "one delta per claimed element" literal.
  `gestureDelta.text` is `lens ? lens.put(value, base) : String(value)` — byte-identical to what
  `writer.commit` puts, so **T3 holds by construction** for any tool that does not override the
  preview. A preview the source cannot express (rubber band, ghost shape) is deliberately *not* a
  delta: the tool draws that into the overlay root layer itself, so `previewDelta` only ever touches
  what it will commit.
- [ ] **P2 · tool set as a parameter.** `options.tools ?? svgTools`, accepting an array or
  `(defaults) => array`. Required for T6; nothing else can express "the same trace without this tool". S.
- [ ] **P3 · trace harness.** `gesture(lens, script)` over synthetic `PointerEvent`s — `down` on
  `elementFromPoint`, `move`/`up` on the root, `dblclick`, `key`. Vocabulary: `tap`, `drag(path)`,
  `dblclick`, `press`. S.
- [ ] **P4 · instruments.** `docText()`, `elemCount()`, `historyDepth()`, `focusPaths()`, and the
  overlay-vs-element box delta. All exist as ad-hoc probes from the 2026-07-23 session; make them
  cells. S.
- [ ] **P5 · geometry through `ctx`** — `ctx.bbox`, `ctx.screenCTM`, `ctx.hit`. Tools currently call
  `getBBox`/`getScreenCTM`/`elementsFromPoint` on DOM nodes directly, so "a tool is a pure
  `trace → [command]`" is **not true yet**. Optional: the laws can run as notebook cells in a real
  browser, like the lens laws already do, and P5 only buys a faster headless path. Subsumes S1's hit
  contract. M.

#### L — the property tests

One cell each, in the appendix beside the existing lens laws, reusing `forAll`. Generators over
(tool, target element, gesture script).

- [ ] **L1 · T1 identity — `p(1,c) = (1,c)`.** For every tool and every element, `down` then `up` at the
  same point with no movement ⟹ `docText()` byte-identical, `elemCount()` unchanged,
  `historyDepth()` unchanged, and the gesture scratch back to its prior value. *Selection is exempt*
  — a click legitimately selects; the law is about `M_X` and `C`, not about focus. **Catches gap 0
  (left half) and the pen bug (right half).**
- [ ] **L2 · T2 path independence — `p(mm′,c) = (nn′,c″)`.** Same start and end point, two different
  interior paths (straight line vs random walk), modifiers held constant ⟹ identical committed
  source. Holds today for every tool, including under snapping, because snapping is a function of the
  absolute delta — so this is a regression guard against future incremental accumulation.
- [ ] **L3 · T3 coherence — d-PutGet.** Two forms, both worth having. *Dynamic:* snapshot every attribute
  the tool touched on the last frame before `up`, commit, re-render, compare — equal, **or** the
  writer's record says `locked`. *Static:* after P1, assert no tool calls `setAttribute` outside
  `previewDelta`. The static one is a few lines and very strong. **Fails today on `toolTransform`.**
- [ ] **L4 · T4 origin — d-PutInc.** A gesture that spans a commit (multi-element move; pen second
  click) ⟹ `historyDepth()` delta equals the number of elements the gesture claimed. **The
  multi-move regression.**
- [ ] **L5 · T5 consistency.** After any gesture, the live DOM minus `overlay.isOwn` deep-equals a fresh
  render of `docText()`.
- [ ] **L6 · T6 confinement.** For random subsets and orders of the tool list: for every trace, if tool
  `t` declines, the source is byte-identical to the run without `t`. Needs P2. **This is the test a
  third-party tool has to pass.**
- [ ] **L7 · T7 rebase agreement.** For every command in the registry, `rebase(p, c)` equals re-locating
  the same element after `apply(c)`. Extends `test_rebasePath`'s existing ground-truth method.
- [ ] **L8 · partiality.** A gesture on an attribute outside the lens domain — unparseable `points`, an
  arc segment for subdivision — ⟹ the tool declines and the source is unchanged. Formal content of
  "decline cleanly"; the **gap 0 regression test**.
- [ ] **L9 · selection-only.** `toolMarquee` never writes the source, under any trace.

#### C — tool conversions, in order

- [x] **C0 · fix `toolTransform`'s preview** — `opsLens.put(d.ops, d.text)` instead of
  `d.ops.map(printOp).join(" ")`. Landed 2026-07-23 ahead of any refactor. Measured before the fix:
  **7 of 12 residue cases diverged** (`translate(10,20)` previewed as `translate(10 20)`, `.5` as
  `0.5`, `1e2` as `100`) — geometrically identical, so invisible, but it flattened exactly the
  residue the skip rule exists to protect. `printOp` and `attrVal` dropped from the cell's inputs,
  now unused. 50/50 lens tests green.
- [ ] **C1 · lift the pattern out of `toolDraw`.** No behaviour change: `shapeSpec`/`shapeMarkup` becomes
  the worked example that P1's default `previewDelta` is modelled on.
- [ ] **C2 · `toolVertex`.** Simplest real conversion — already coherent, mostly deletion.
- [ ] **C3 · `toolMove`.** N deltas, one per target, which makes L4's "one delta per claimed element"
  literal rather than inferred.
- [ ] **C4 · `toolTransform`.** Now mechanical, since C0 already aligned the two sinks.
- [ ] **C5 · `toolPen`.** Each click is its own gesture; the point of interest is `state.pen` surviving a
  commit, i.e. T1's right half.
- [ ] **C6 · `toolMarquee`.** Classify as a `select` delta so L9 is expressible rather than assumed.
- [ ] **C7 · `toolStructure`.** Do with S4: its five branches become entries in the command registry with
  their `rebase`, and the raw `e.target` goes away (gap 0).

**Where this lands in the stages:** P1–P4 and L1–L9 *are* S0. P5 is S0 or S1. C0–C6 are S0's
conversion half. C7 folds into S4.

### 6.5 Stages

Each stage ends shippable. *Falsified by* is the check that has to go green.

**S0 — make the gesture a value, the tool set a parameter, and the laws run.** The one stage that is
pure infrastructure, and the one everything else is measured by. Three parts, in order:
(a) a gesture carries a **delta**, and a tool declares `preview`/`commit` over it, with the default
`preview` derived from `commit` — this deletes the duplicated `(value, lens, sourceText)` triple from
every tool and makes T3 hold by construction;
(b) `options.tools` (and later `shapes`/`commands`/`fields`), defaulting to the ambient registries —
without this, T6 cannot be tested at all;
(c) the trace harness, T1–T7, and the instruments, reported on `lens-put`.
*Falsified by:* replaying the three 2026-07-23 bugs and gap 0 against it and having any of them pass;
or `svgLens(node)` with no options behaving differently from today on the whole corpus.

**S1 — one hit contract.** Add `ctx.hit(e)`; remove `e.target` from `toolStructure`. Group-vs-leaf
selection becomes a policy in that single place (leaf on click, ancestor on marquee, double-click to
descend). Closes gap 0 and part of gap 2.
*Falsified by:* any row of a (shape, fill, click position) table picking a different target than
selection would; or the element-count instrument firing on a double-click.

**S2 — shape registry, no behaviour change.** Move the existing points/path handlers into tag-keyed
entries. Nothing new works yet; the 50 lens tests and T1–T7 must stay green. This is the refactor that
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
*Falsified by:* T7, or the tree disagreeing with `parseDoc`.

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
