# SVG editor architecture

Design note for turning `@tomlarkworthy/svg-lens` (lawful lenses, one gesture, one attribute) into a
usable SVG editor. Written 2026-07-20 after the first port landed.

**Status 2026-07-24 — feature-complete; the work from here is consistency, usefulness and
refactoring.** The capability set is done. S1–S10 and the gesture surface are built (§7); the shape,
command and affordance registries cover the format; gradients and markers (the last new capability)
landed, and table editing in the prose layer works. **No new features are planned.** Future work has
three pillars and adds no capability: (a) make the features that exist *consistent* with each other —
one way to do each thing; (b) make them more *useful*; (c) *refactor* the code for maintainability.
The remaining "missing capability" items in §5 (text tool, `<image>`, eyedropper, swatch-drop —
G26–G29) are **out of scope** for this phase: deferred, not planned. §9 is the standing backlog for
this work; §6 is retained as the record of how the capabilities were built, and the 59 laws are the
regression gate that makes "refactor only" safe.

**Status 2026-07-23.** M0–M8 are built (§7): the editor commits through `Variable.define`, addressing
is structural, and tools, selection, the gizmo, undo, snapping and interpolated templates all work.
Every structural block in §2 is gone. What remained was **breadth** — now closed through S10.

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

**12. The first frame of a drag jumps.** Reported by Tom 2026-07-23 as "a frame of glitching at
gesture start, after a while"; instrumented the same day. Two causes compound, and both are in
`toolMove.onPointerMove`. (a) The movement threshold is a *trigger*, not a dead zone: the drag starts
when `hypot(dx, dy)` first exceeds `thresh` (3px mouse, 10px touch) and then applies the **whole**
delta measured from the press point, so the shape teleports by that distance at the instant the drag
begins. (b) Snapping is live from that same first frame, when the shape has barely moved, so any
neighbour edge within `snapTolerance` captures it: measured, a first pointer move of (4,4) committed
`translate(0 5)` — the shape jumped *away* from the direction of travel before following it. See B1
in §6.6 for the fix and why it is not free.

### Missing capability

1. ~~**Geometry editing exists for three tags.**~~ **Closed 2026-07-23 (S2/S3, milestone M10).** It
   was `polygon`, `polyline`, `path`; `rect`, `circle`, `ellipse` and `line` got the transform gizmo
   only, so resizing a rect wrote `transform="… scale(…)"` rather than `width`/`height`, and a
   `<line>`'s endpoints could not be dragged at all (measured: 0 anchor handles, 4 scale handles). An
   editor that cannot change a rectangle's width is not an SVG editor, and its output is not source
   anyone would maintain by hand. All six tags are now registry entries; the gizmo remains the
   fallback for what the registry cannot read, which is what keeps an unparseable document editable.
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
7. ~~**Path editing stops short.**~~ **Mostly closed 2026-07-23 (G19–G21, G23, milestones M14–M17).**
   The pen draws curves, an open path can be continued, corner↔smooth is a command, and close/open is
   another. What remains: arc segments are still refused for subdivision (G24 — a *user-visible*
   decision, not an internal one), deleting a segment in the *middle* of a subpath is not implemented
   (only the trailing case), and several vertices cannot be selected at once (G22).
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
idea, §6.2 the theory the gesture half is missing, §6.3 how it gets checked, §6.4 the task list that
made the gesture side lawful (done), §6.5 the stages, §6.6 the task list that makes it capable.

### 6.1 The one idea: competence is the contents of the registries

M2 already made this move once, for tools, and it worked — a new tool is now a new cell rather than an
edit to a monolith. Every remaining gap is the same move, not yet made, on five more axes:

| axis | today | should be |
|---|---|---|
| which tags have editable geometry | `polygon/polyline/path`, hardcoded in `toolMove` and `handleEdit` | **shape registry**: tag → `{handles, edit, resize}` |
| what a gizmo writes | always `transform` | the shape's own `resize`; `transform` only as fallback |
| which structural edits exist | ~~seven `runCommand` call sites~~ **done (S4)** | **command registry**: id → `{id, label, key, plan(env)}` |
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

#### Four laws that are ours, not theirs

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
- **T10 Hit agreement** (added 2026-07-23 with S1). What the hover outlines, what a press claims and
  what a double-click enters are three readings of *one* answer — `ctx.pick` — so they cannot drift
  apart. This is the law gap 0 needed: gap 0 was not one bug but the same question having two answers
  (`e.target` and `ctx.hit`) in two places. It also pins the group policy, which is a policy rather
  than a fact and therefore belongs in a law: click takes the outermost unopened container,
  double-click descends one level, Escape ascends. Its pure half is `test_scoped_path`.
- **T11 The view is not an edit** (added 2026-07-23 with S7/G25). Zooming, panning and fitting write
  nothing to the source and push nothing onto the undo stack; and the same drag *in the drawing's own
  units* commits the same bytes at any zoom. The second half is what makes "no tool needed changing
  for zoom" a claim rather than a hope: it holds because every measurement goes through `ctx` (P5)
  and `getScreenCTM` already carries the viewBox, so no tool ever sees the scale factor.
  **With alignment snapping off**, and that qualifier is a finding, not an escape hatch. Snapping is
  magnetism and `snapRects` measures it in *screen* pixels, so at 2.5× a neighbour two user units
  away is five pixels away and pulls when it did not before. That is the behaviour you want — you
  snap to what looks close — so the law names the one deliberate screen-space affordance rather than
  claiming a scale-freedom the editor does not have and should not want.

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

#### What each tool did before the conversion

Read out of the module 2026-07-23, **before** C0–C6. Kept as the baseline the conversion is measured
against; the "sinks agree" column is what P1 made structural rather than a matter of care. "Absolute"
= recomputes from the gesture origin held in the complement each frame rather than accumulating from
the previous frame — the property T2 needs. "Sinks agree" = the mid-drag preview is derived from the
same value/lens/base the commit uses.

| tool | view edit | complement `C` | source edit | absolute | sinks agree |
|---|---|---|---|---|---|
| `toolDraw` | two corners | `draw{kind,x0,y0,x1,y1,square,preview}` | `addShape(markup)` | ✅ | ✅ **by construction**, via `shapeSpec`/`shapeMarkup` |
| `toolMove` | screen `(dx,dy)`, N targets | `drag{targets[{idx,el,text,Slin,T0}],x0,y0,…}` | `transform` via `translateLens`, once per target | ✅ from `T0` | ✅ same `(g.T, translateLens, g.text)` |
| `toolVertex` | pointer → vertex coords | `drag{key,idx,mode,x0,y0,was,edit}` | `points`/`d`, default lens | ✅ re-derives from `t` | ✅ same `edit.value` |
| `toolTransform` | pointer → scale/rotate about a pivot | `drag{key,idx,el,b,text,base,ops,centre,pivot}` | `transform` via `opsLens` | ✅ from `base` | ❌ **preview `ops.map(printOp).join(" ")`, commit `opsLens.put(ops, text)`** |
| `toolPen` | one click | `pen{path,start,last,band}`, `penClick` | `d`, one commit **per click** | ✅ text-in-text-out | ✅ (the band is not the committed value) |
| `toolMarquee` | rubber band | `band{x0,y0,x1,y1,add,box,moved}` | **none** — selection only | n/a | n/a |
| `toolStructure` | one double-click | stateless | five `runCommand` branches | n/a (discrete) | n/a |

Two conclusions were drawn from that table. **`toolDraw` was already right** and its comment said why
— derive the preview *from* the thing you will commit and they cannot disagree — so the work was
generalising that one discipline to the other six. And **`toolTransform` was the only tool with a
live T3 defect**: two different printers for the same value, so preview and source diverged on
residue by construction.

Both are now history. Every tool emits `gestureDelta` values and reaches the drawing through
`previewDelta`/`commitDelta`; the "sinks agree" column is no longer a property of each tool's care
but of there being one expression, `gestureDelta.text`, that both sinks read. `L3` checks that
statically, on the tools' own source, so it stays true.

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
- [x] **P2 · tool set as a parameter.** Landed 2026-07-23. `svgLens(node, {tools})` takes an array
  (pins the drawing to exactly that set) or `(defaults) => array` (extend without restating);
  omitted, it is the ambient `svgTools`, so the plugin bus and today's behaviour are unchanged. All
  three dispatch loops — `onPointerDown`, `onHover`, `onDblClick` — read the parameter, and none
  reads the registry directly. The paper's "the pieces" section documents the callsite form.
- [x] **P3 · trace harness.** Landed 2026-07-23 as `gestureFixture` + `playGesture`.
  `gestureFixture(body, options)` builds a **throwaway runtime module holding one cell** —
  `svgLens(svg\`…\`, _opts)` — so a gesture test drives the real writer (it really redefines a
  Variable) without ever editing the paper's own content; `_opts` is a module variable rather than
  serialised, so a test can pass real tool arrays. The caller places `container` in its own output,
  which is what makes `elementsFromPoint` answer correctly with no z-index tricks. `playGesture` has
  the vocabulary `tap`, `drag(points)`, `dblclick`, `press`, in the drawing's **user units** (it
  converts through `getScreenCTM`, the matrix the tools invert). It waits for quiet rather than a
  fixed sleep, because a commit awaits `settle`, which polls. **Verified in a browser:** a tap makes
  0 puts and leaves the source byte-identical; a `(60,70) → (90,80)` drag makes exactly 1 commit
  writing `transform="translate(30 10)"`; the fixture module is created and deleted cleanly.
- [x] **P4 · instruments.** Landed 2026-07-23 on the fixture: `doc()` (the SVG text the source
  holds, byte for byte — the witness for T1/T2), `elems()` (overlay-excluded, so indices match the
  tools'), `elemCount()`, `historyDepth()`, `focusPaths()`, `boxGap()` (overlay box minus the
  selected element — the ghosting probe), and `puts`. One trap found and fixed: the writer announces
  each put on **both** the outgoing and incoming node with the same record object, so a naive
  listener double-counts every commit; `puts` dedupes by identity.
- [x] **P5 · geometry through `ctx`.** Landed 2026-07-23: `ctx.bbox`, `ctx.screenCTM`, `ctx.screenBox`,
  `ctx.rootBox` and `ctx.hit` — five named questions a tool may ask the browser, alongside
  `ctx.localPoint`. Every tool now goes through them, so `hitTest` and `boxInRoot` dropped out of
  `toolMove`'s and `toolMarquee`'s inputs and `hitTest` is the single place that calls
  `elementsFromPoint`. That makes "a tool is a function of `ctx` and the trace" a property of the
  code rather than a description of it, and it is what would let a fake `ctx` drive a tool with no
  document. Guarded by `test_tools_measure_through_ctx` (pure, headless): **7 tools, 17 measurements,
  0 direct.** Subsumes S1's hit contract. All 8 gesture laws re-verified in a browser after the
  reroute, plus the paper's own drawing (clicking the sun still frames it exactly).

#### L — the property tests

One cell each, in the appendix beside the existing lens laws, reusing `forAll`. Generators over
(tool, target element, gesture script).

- [x] **L1 · T1 identity — `p(1,c) = (1,c)`.** `test_gesture_identity`. A null tap at 5 points
  (filled polygon, stroke-only path, rect, transformed group, empty canvas), each twice so the
  already-selected state is covered ⟹ source byte-identical, element count and undo depth unchanged.
  Selection is exempt. **✅ green 2026-07-23.**
- [x] **L2 · T2 path independence — `p(mm′,c) = (nn′,c″)`.** `test_gesture_path_independence`. A
  straight drag and a 5-leg wander to the same endpoint commit the same bytes. Holds today —
  snapping is a function of the absolute delta, not of the route — so this is a regression guard
  against a future tool accumulating per frame. **✅ green 2026-07-23.**
- [x] **L3 · T3 coherence — d-PutGet.** Both halves landed. *Dynamic* is L5 above, which compares the
  whole rendered tree against the committed source after every gesture. *Static* is
  `test_tools_write_through_the_delta`: it reads each tool's own handler source and asserts that the
  only receivers of `setAttribute` are names the overlay handed out, and that no handler calls
  `ctx.writer.commit`/`runCommand` directly. Measured on the converted tools: **7 tools, 3 overlay
  writes, 0 direct.** It is pure, so it runs in `bun test` with the lens laws; a negative control
  (reverting C4 in a scratch copy) is correctly rejected with both violations named. **✅ green
  2026-07-23.**
- [x] **L4 · T4 origin — d-PutInc.** `test_gesture_commits_against_its_origin`. Marquee a set, drag
  it, assert the undo depth gained equals the number of elements claimed. Measured: **a 4-element
  move commits 4 edits.** This is the 2026-07-23 multi-move regression, now guarded. **✅ green.**
- [x] **L5 · T5 consistency.** `test_gesture_render_consistency`. After each of five gestures — one
  through each tool that writes an attribute — the live tree (overlay removed, whitespace-only text
  and the root's `touch-action` style ignored) deep-equals a `DOMParser` render of `docText()`.
  Mid-gesture is exempt by design: a preview may be ahead of the source, it may not survive the
  commit. **✅ green 2026-07-23.**
- [x] **L6 · T6 confinement.** `test_gesture_confinement`. A tool that declines everything is
  installed at the head and at the tail of the registry; both runs must be byte-identical to the run
  without it, and the tool must actually have been offered the gesture (else the law is vacuous).
  Needs P2. **This is the test a third-party tool has to pass. ✅ green 2026-07-23.**
- [x] **L7 · T7 rebase agreement.** `test_gesture_rebase_agreement`. `test_rebasePath` already checks
  the three primitives; this checks the **callsites**, where one clamped index is handed to both the
  command and its rebase — if they clamp differently the selection lands on the wrong shape. Ground
  truth is bytes: after `addShape` (head and appended), `removeAt`, `moveTo`, `zOrder` front and
  back, every rebased address must hold what the old address held, and the number of dropped
  addresses must equal the number of elements the edit removed. A seventh case is a point edit,
  which claims *no* rebase: the claim checked is that the tree is untouched, not that the bytes are.
  **✅ green 2026-07-23, 7 commands.**
- [x] **L8 · partiality.** `test_gesture_partiality`, on a corpus the *browser* renders and the *lens*
  cannot read: an odd-count `points` list and an arc. Selecting the bad polygon must offer the
  transform gizmo and **no** vertex handles (`toolMove.tryFocus` already parses before it commits to
  a mode — this pins that down), and double-clicking either shape must not write, because
  subdivision has no exact split for an arc. Formal content of "decline cleanly", and the **gap 0
  regression test**: the failure mode is a declined gesture falling through to "create a shape
  here". **✅ green 2026-07-23.**
- [x] **L9 · selection-only.** `test_gesture_selection_is_not_an_edit`. Three marquee bands — both
  drag directions plus one over empty space — never write the source or push an undo entry.
  Measured: selects up to 4 elements, and the empty band correctly clears. **✅ green 2026-07-23.**
  (First version asserted a non-empty selection *after* the deliberately-empty band and failed; the
  law was right, the assertion was not.)

#### C — tool conversions, in order

- [x] **C0 · fix `toolTransform`'s preview** — `opsLens.put(d.ops, d.text)` instead of
  `d.ops.map(printOp).join(" ")`. Landed 2026-07-23 ahead of any refactor. Measured before the fix:
  **7 of 12 residue cases diverged** (`translate(10,20)` previewed as `translate(10 20)`, `.5` as
  `0.5`, `1e2` as `100`) — geometrically identical, so invisible, but it flattened exactly the
  residue the skip rule exists to protect. `printOp` and `attrVal` dropped from the cell's inputs,
  now unused. 50/50 lens tests green.
- [x] **C1 · lift the pattern out of `toolDraw`.** `shapeSpec`/`shapeMarkup` stays as it is — it *is*
  the worked example `previewDelta` was modelled on — and its ghost shape stays a root-layer overlay
  drawing, deliberately not a delta, because the source cannot express it. What converted is its
  selection: `focus.clear()` and `focus.set` are now `select` deltas.
- [x] **C2 · `toolVertex`.** As predicted, mostly deletion: `handleEdit` already reprints the whole
  attribute, so the delta carries no lens and `gestureDelta.text` is `String(value)`.
- [x] **C3 · `toolMove`.** N deltas, one per target — L4's "one commit per claimed element" is now
  literal. Its two selection outcomes converted too, including shift-toggle, which is why
  `gestureDelta.select` grew a `toggle` option. The mode-choosing branch reads better as a result:
  which mode a tap offers is decided by whether the lens can *read* the attribute, which is T8 in
  one expression.
- [x] **C4 · `toolTransform`.** Mechanical, as expected — C0 had already aligned the two printers,
  and the delta makes it structural: there is now only one printer to align.
- [x] **C5 · `toolPen`.** Both commits and the first selection are deltas. `state.pen` surviving the
  commit is untouched — it lives in `lensState`, not in the delta.
- [x] **C6 · `toolMarquee`.** Every outcome is now a `select` delta and nothing else, so L9 is a
  statement about the tool's type rather than about its luck.
- [x] **C7 · `toolStructure`.** Done in two halves. All five branches emit `command` deltas, so every
  tool speaks the same language and L3-static covers this one too; the raw `e.target` went with S1
  (gap 0); and the **command registry** landed with S4 — though not where this item expected it. The
  verbs that belong to the *selection* rather than to the pointer moved out of the tool entirely,
  because a command has no gesture: `svgCommands` holds them, and `toolStructure` keeps only the
  double-click behaviours, which are gestures and belong to a tool.

**Where this lands in the stages:** P1–P4 and L1–L9 *are* S0. P5 is S0 or S1. C0–C6 are S0's
conversion half. C7 folds into S4.

**Status 2026-07-23: 22 of 22 done.** S1 replaced C7's `e.target` with `ctx.pick`, and S4 built the
command registry. S0 is complete — see M9 in the milestone log for what it cost.

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

**S1 — one hit contract. ✅ done 2026-07-23.** `ctx.pick(e)` is the single place group-vs-leaf policy
lives: it maps the painted leaves `ctx.hit` returns through `scopedPath` at the current scope, dedupes
and answers front to back. Selection, the hover outline, the occlusion cycle, the marquee and the
descent gesture all read it, and `toolStructure`'s `e.target` is gone — which was the last place in
the editor where "what did I click" had a second answer. Closes gap 0 and part of gap 2.
*Falsified by:* any row of a (shape, fill, click position) table picking a different target than
selection would; or the element-count instrument firing on a double-click. **Held**: T10 walks the
corpus's four kinds and compares the outline with the selection box at each, and double-clicks the
stroke-only path — the shape `e.target` used to miss — asserting no element was appended.

**S2 — shape registry, no behaviour change. ✅ done 2026-07-23.** The points/path handlers became
tag-keyed entries in `svgShapes`, read through `shapeLookup.forMode`/`forTag` by `handleEdit`, by the
focus deciding where to draw handles, by `toolMove` deciding what a tap offers, by `toolVertex`
deciding whether it claims a handle, and by `toolDraw` handing a new shape to whatever can edit it.
`svgLens(node, {shapes})` mirrors `{tools}`. The registry is a **plain array**, not an
`Inputs.input` like `svgTools`, because pure code reads it and the lens laws exercise that code
headless, where there is no DOM to make an input out of.
*Falsified by:* any existing test changing, or needing to change. **Held**: 52/52 headless with the
test file untouched, and all eight gesture laws green in a browser.

**S3 — rect/circle/ellipse/line geometry, and gizmo routing. ✅ done 2026-07-23.** Each tag is its
own cell — `shapeRect`, `shapeCircle`, `shapeEllipse`, `shapeLine`, plus `shapePoints` and
`shapePath` extracted from the old pair — supplying `{mode, tags, writes, reads, handles, edit}`.
The gizmo is still the fallback for everything the registry cannot read, and an entry may set
`rotatable` to borrow just the rotate stalk, because rotation is the one thing no geometry attribute
can express. `writes` became a *list*, so one handle can move four attributes, and `edit` returns
only the attributes that actually changed — which is why dragging the east edge does not rewrite `y`.
*Falsified by:* dragging a rect's corner and finding `transform` in the source rather than `width`; or
a **resize agreement** property — resizing through the registry and through `transform` must produce
the same rendered bounding box. **Held**: `test_shape_registry` checks resize agreement over 300
random rect/corner pairs, that every entry writes nothing when a handle is put back where it was,
that ten drags land on their target, and that four unreadable elements are declined. Verified
falsifiable by injecting a wrong-edge bug and watching it fail at run 3.

**S4 — command registry, then group/ungroup/duplicate/copy/paste. ✅ done 2026-07-23.** A command is
a verb that acts on the *selection* rather than on the pointer, and it earns a place beside the tools
by being the same kind of thing: `plan(env)` returns **deltas**, so it lands in the sink a gesture
lands in and owes the laws a gesture owes. `env` is to a command what `ctx` is to a tool — pure data
plus three measured questions — so a command can be planned headless against a fake env, which is how
align is tested with no browser at all. `plan` returning null *is* the answer to "can I do this",
asked once, so a greyed-out button and a refusal to run cannot disagree. Fifteen entries, and the
demo's command bar is generated from the registry, labels and bindings included.
*Falsified by:* `insert∘delete ≠ id`, `group∘ungroup ≠ id` (modulo whitespace), or a rebase that
disagrees with its edit — the M0.2 failure mode, which silently drops the selection. **Held**:
`test_group_ungroup` (which also carries T7 for the new commands, by `test_rebasePath`'s ground-truth
method), `test_copy_paste`, `test_align_commands`.

**S5 — outliner.** A pure projection of `childrenLens` plus `node.select`; no new write path.
*Falsified by:* T7, or the tree disagreeing with `parseDoc`.

**S6 — field registry: colour, length, dash, opacity widgets. ✅ done 2026-07-23.** `svgFields`
(`_sl270`) is the registry — 14 entries `{prop, label, kind ∈ color|number|enum|text, options?, min?,
max?, step?, dflt?}` plus a `read` that mirrors `setProperty`'s style-over-attribute sink and preserves
the author's notation. `node.fields`/`node.setField` project and commit it; `fieldPanel` (`_sl271`) is
the demo surface. Every widget writes through `setProperty`→`commitDelta` — the same path `setAttr`
uses — and an unchanged value is a no-op (`null`, T1). Covers G30–G34, G37 (value-editing); the
per-field *canvas gestures* (drag-grip, scrub, swatch chip) are S9. See group I.
*Falsified by:* a widget's commit differing byte-for-byte from the equivalent `setAttr`. **Held**:
headless byte-check + in-browser `fill`/`stroke-linecap` round-trip.

**S7 — zoom and pan, as an uncommitted view transform. ✅ done 2026-07-23.** The view lives in
`lensState.view` (`{k, x, y}`), is applied by rewriting the root `viewBox` against a `baseBox()`
derived from the source, and is re-applied after every put — so a commit does not throw you back to
100%. `toolZoom` is the tenth tool: wheel zooms about the pointer, middle-drag pans, and `onCancel`
returns false because there is nothing to undo. No other tool was touched.
*Falsified by:* the source not being byte-identical after any zoom or pan; or the same drag producing
a different committed value at zoom 2.5 than at zoom 1 *with snapping off* — see T11 for why the
qualifier is there and not a fudge. **Held**: T11, in a browser, over four view changes and two
matched drags.

**S8 — `<text>`, `<image>`, `defs`/`<use>`.** Text needs a *content* lens (children, not attributes).
`<use>` needs the lens to retarget at the referenced element, possibly in another cell — §4's outward
composition, one level further.
*Falsified by:* editing a `<use>` writing to the `<use>` rather than to its referent.

**S9 — the selection preview is a surface, not a box. ✅ done 2026-07-23.** What a selection *offers*
was decided inside `svgFocus.paint`, the same for every tag. `svgAffordances` (`_sl272`) makes it a
registry: an array of providers, each `{id, applies(a), declines?, glyph, command? | tap? | drag?}`,
where "everything offers a stroke width grip and a fill/stroke swap, a path offers close/open and
smooth" is *data*. `paint` computes the selection box and a `decorate` hook (set by svgLens, which
holds the registry and `canCommand`) draws the applicable, non-declining chips in root space;
`toolAffordance` (`_sl273`, first in the tool array, claims only a `dataset.aff` press) dispatches the
tap or drag. A command-backed chip declines exactly when its command does (G41), a shared chip fans
out to the whole selection (G40), and the gesture readout is the same idea at gesture time (G42).
Draws through the overlay, writes through `commitDelta`/`setField`/`node.command` — a surface, not a
write path; `toolAffordance` is inside both tool laws. Covers G38–G42.
*Falsified by:* an affordance committing anything a `node.setAttr` would not; or T6 — a drawing given
an empty affordance set must still be byte-identical after a click on a shape. **Held**: both tool
laws green with 12 tools; headless registry check; in-browser chip set per tag and a swap round-trip.

**S10 — `defs` as a place you can point at.** Gradients, markers, patterns, `clipPath` and `<use>`
all share one shape: the thing you are pointing at is *not* the thing that gets written. `refsOf`
already reports which attributes point where, and the source lens already carries `defs` through an
edit untouched — what is missing is minting an id that does not collide, writing a new element into
`defs` (creating it if absent), and rebasing references when `defs` itself is edited. This is the
prerequisite for G35–G36 and the second half of gap 4.
*Falsified by:* two pasted gradients sharing an id; or an edit to a `<stop>` failing to repaint the
shape that references it.
**Delivered 2026-07-23.** The two missing primitives are `mintId` (`_sl275`, over the same `idsIn`
authority `freshenIds` uses, so a minted id cannot collide) and `defsInsert` (`_sl276`, appends the
new element into `<defs>`, creating it as the svg's last child when absent — so no existing address
moves and the referring command needs no rebase). Reference *rebasing* on a `defs` edit is already
free: `defs` children are addressed by path like any element, so selecting and editing a `<stop>`
goes through the ordinary lens/handle write path, and `refsOf` resolves the referrer either way.
Both falsifiers held headlessly (`tools/svglens-wip/s10-defs.ts`). Consumers: G35 (`cmdAddGradient`),
G36 (`cmdAddMarker`).

**S11 — one node across recomputations, via `this`. Dropped 2026-07-23.** The idea was to remove the
whole "for a window there are two nodes" class at the root: an Observable cell body is invoked with
`this` bound to its previous value, so a cell could hand its old node back and `svgLens` would keep
rendering into the node it already owns. It is a real mechanism and it would collapse three
defensive guards into one invariant. It is dropped because the only thing that needed it — the view
surviving a commit — is now handed over positionally by the outgoing node (B2), and the entry price
is an opt-in at *every* call site, including the ones in this paper's own prose, that degrades
silently when forgotten. Tom's call: *"I would drop S11 if it's just about the `this`."* Recorded
here rather than deleted, because the next bug that begins "the detached node" is evidence to
reopen it.

**Deferred:** performance (gap 11, Tom's call 2026-07-23), multi-drawing (gap 9), `editor-5`
concurrency (gap 10). None of them blocks the stages above.

### 6.6 Task list 2: the gesture surface

§6.4 made the gesture side *lawful*. It did not make it *capable* — nothing in that list added a
thing a user can do. This list is the other half: the tools and gestures an SVG editor is expected to
have, read against what is actually implemented as of 2026-07-23.

Every item names the registry it belongs in, because §6.1's claim is that competence *is* the
contents of the registries: a new capability should be a new cell, not an edit to `svgLens`. Items
also name a falsifier, and each must satisfy the eight gesture laws by construction — several need a
**new** law, which is called out where it applies.

#### What the editor can do today

Five modes (`V` select, `R` rect, `E` ellipse, `L` line, `P` pen) and seven tool cells.

| gesture | what it does | what it writes |
|---|---|---|
| tap a shape | select it — or, if it is inside a group you have not entered, that group; repeated tap on the primary cycles down the stack | nothing |
| double-click a group | enter it; Escape leaves it | nothing |
| shift-tap | add/remove from the selection | nothing |
| drag empty canvas | marquee (shift adds) | nothing |
| drag a shape body | move it, and the rest of the selection with it; snapping with guides, alt disables | `transform` |
| drag a rect/ellipse/circle/line handle | resize it directly | `x`,`y`,`width`,`height`,`rx`,`r`,`rx`/`ry`,`x1…y2` |
| drag a corner handle (anything else) | scale about the opposite corner; shift keeps aspect | `transform` |
| drag the rotate stalk | rotate about the centre; shift steps 15° | `transform` |
| drag a vertex or control point | move it | `points` / `d` |
| double-click an edge / a vertex | insert / delete a point | `points` / `d` |
| double-click empty canvas | drop a shape | one element |
| drag in a draw mode | create rect/ellipse/line; shift squares | one element |
| pen click / click the start / double-click | place an anchor, close, finish | `d` |
| arrows, `[ ] { }`, Delete, ⌘Z | nudge, z-order, delete, undo/redo | `transform`, structure |
| ⌘G / ⌘⇧G | group, ungroup | one `<g>`, or its contents spliced back |
| ⌘D, ⌘C/⌘X/⌘V/⌘⇧V | duplicate, copy, cut, paste, paste-in-place | elements, byte-identical |
| the command bar | six aligns, two distributes | `transform` per element |

One thing that whole table implies and is worth stating plainly: **the pen draws only straight
lines**. (Four more — "a rectangle's `width` cannot be edited", "groups cannot be selected as
groups", "there is no zoom" and "there is no group, duplicate or paste" — were true until S3, S1, S7
and S4, and are the gaps those stages closed.)

#### P — prerequisites this list needs that §6.4 did not

- [x] **P6 · a `view` delta.** Landed 2026-07-23. `gestureDelta.view(marks, {key, cursor})` where a
  mark is an overlay primitive `{tag, attrs, layer}`. `key` names the group the delta *replaces*, so
  emitting the same key every frame is idempotent rather than cumulative — which is what a hover or
  a readout needs and what a bare "draw into the overlay" could not give. `previewDelta` owns it,
  `commitDelta` returns null for it (decoration is never a source edit), `revertDelta` clears it.
  The alternative was letting decorating gestures reach into the DOM themselves, which L3 now
  forbids — so P6 is the price of L3, and worth it.
- [x] **P7 · address something smaller than an element.** Landed 2026-07-23. The address is
  `0/3#a2` — "the 3rd anchor of the element at 0/3" — and the shape of it is the finding. The obvious
  answer, storing the handle `key`, does not work: a key is a position in the attribute's own
  microsyntax (`p3` for a points list, `ci:o:ix:iy` for a path command list) and *renumbers
  unpredictably*, because splitting one path segment can turn one command into two. An **ordinal
  within a kind** renumbers predictably — inserting an anchor shifts exactly the anchors after it —
  so the key stays transient, resolved from the live handle list at the moment of the drag, and the
  ordinal is what is stored, rebased and restored. Partial by construction: an ordinal that no longer
  exists resolves to null, the same answer `focus` already gives for a path that no longer resolves.
  The edit declares how it renumbers (`{kind: "vertex-insert", path, at}`), exactly as an element
  command declares its `rebase` — a rebase that *guesses* at what an edit did is the M0.2 failure
  mode. **Held**: `test_rebase_vertex`, by `test_rebasePath`'s ground-truth method with coordinates
  standing in for bytes, over a points list and over four paths at every segment; and in a browser,
  where a dragged vertex is still held after its own commit and becomes `#a2` when a vertex is
  inserted in front of it. M
- [x] **P8 · a selection ↔ source-text codec.** Landed 2026-07-23 with S4. Copy, paste and duplicate are all "read these paths
  out as source text, write that text back in somewhere else". `childrenLens` already gives child
  *source strings*, so the read half exists; what is missing is the write half with id/reference
  fixups (§`refsOf` knows which attributes point at `defs`). Pleasingly, the clipboard payload is
  then the artifact itself — paste into a text editor and you get SVG. **Falsified by:**
  copy-then-paste-in-place producing anything other than a byte-identical duplicate, references
  included. M

#### A — direct geometry: the gap that makes "editor" arguable (needs S2/S3)

- [x] **G1 · hover highlight and cursor.** Landed 2026-07-23 as `toolHover`, the eighth tool: reads
  `ctx.hit(e)[0]`, outlines it with `ctx.rootBox` and sets `cursor: move`. The falsifier is satisfied
  structurally rather than by a test — it is *the same call* `toolMove` makes to decide what a click
  claims, so the two cannot disagree. Skips an already-selected element, whose box is drawn already.
  The tool contract gained `onPointerLeave`, because a pointer can leave without a final move over
  empty space and would otherwise strand the outline. Verified in a browser: one `rect.hover` mark
  and `cursor: move` over the house, and all eight gesture laws still green with an eighth tool in
  the registry — which is T6 doing its job. Uses the same `boxInRoot` the multi-selection boxes use,
  so it is loose around a rotated shape in exactly the way the rest of the editor already is.
- [x] **G2 · rect handles.** Landed 2026-07-23. 4 corner + 4 side handles writing `x`/`y`/`width`/
  `height`, plus the borrowed rotate stalk. A handle's key names the edges it moves (`nw` is `n` and
  `w`), and each frame recomputes from the *source*, not from the previous frame, so the opposite
  edges stay where the author put them and a drag past an edge simply flips the rect. Verified in a
  browser: dragging the corpus rect's SE corner commits `width="50" height="36"` and leaves `x` and
  `y` alone.
- [x] **G3 · circle and ellipse handles.** Landed 2026-07-23. `r` from four axis handles; `rx`/`ry`
  from four axis handles plus four corners that move both. The ellipse is `rotatable`, the circle is
  not — rotating a circle is a no-op and the stalk would only be clutter.
- [x] **G4 · line endpoints.** Landed 2026-07-23. Two anchors writing `x1,y1` and `x2,y2`. This is
  the entry that changes the most for the least: a `<line>` previously had no editable geometry at
  all.
- [x] **G5 · corner radius.** Landed 2026-07-23. A ninth handle on the rect entry writing `rx`,
  drawn a fixed inset along the top edge — at `rx = 0` a truthful handle sits exactly on the `nw`
  corner, is painted last, and steals every click meant for it. `edit` subtracts the same inset, so
  the offset is a bijection and "put the handle back where it is writes nothing" still holds.

#### B — selection (needs S1's one hit contract)

- [x] **G6 · groups are selectable, and enterable.** Landed 2026-07-23 with S1. Click selects the
  outermost `<g>`, double-click descends one level (`toolScope`, the ninth tool), Escape ascends via
  `node.ascendScope()` — offered at the callsite between "abandon this gesture" and "leave this
  mode", so Escape reads as one verb that means the most local thing available. The scope is a path
  in `lensState`, so being inside a group survives the remount a commit causes, and selecting
  something the group does not contain leaves it. `scopedPath` is the whole policy in four lines and
  is checked headless by `test_scoped_path` — which caught a real hole: a scope that had reached the
  element itself fell all the way back to the root. Verified in the demo: the house selects as its
  `<g>` with the gizmo, double-click gives the rect's nine geometry handles, Escape returns to the
  group.
- [x] **G7 · select all / none / same.** Landed 2026-07-23 as `cmdSelect`, one factory producing four
  registry entries (`select-all` on ⌘A, `select-none`, `select-same-fill`, `select-same-tag`). Each
  plans a `select` **delta**, not a `command` — so T9 holds by construction: the same delta a click
  emits, routed through `commitDelta`, which never touches the source. "Same" is judged among the
  current scope's own children (the working level), and `same-fill` includes the primary, so it is
  idempotent. Each declines (T1/T8) when it would change nothing: none with an empty selection, all
  with nothing under the scope, "same" with no primary. ⌘A routes automatically through the demo's
  existing `commandForEvent` keymap — no new callsite. Verified headless: all → three shapes,
  same-fill → the two red, same-tag → the two rects. S
- [x] **G8 · context menu.** Landed 2026-07-23 in the demo toolbar. Right-click hit-tests through the
  new `node.pickAt(e)` (the same `ctx.pick` a click uses, so P5 holds and no second measure path
  appears), selects the element under the pointer if it is not already selected, then floats a menu
  built from `node.commands()` filtered by `node.canCommand(id)` — the identical authority the button
  bar uses, so a greyed button and a hidden menu item can never disagree. It renders whatever the
  registry holds, so it needs no maintenance as the registry fills; keyboard-only view verbs (fit,
  zoom) are not commands, so they correctly stay off it. Dismissed on outside pointer-down, scroll, or
  choosing an item, and torn down on `invalidation`. S

#### C — transform gestures

- [x] **G9 · axis lock.** Landed 2026-07-23 in `toolMove`. Shift during a drag freezes whichever
  axis the pointer has travelled *less* along, measured from the origin rather than the last frame,
  so the lock is a function of where the pointer is and T2 still holds. Snapping runs after the lock
  and may pull the frozen axis, so the lock is reapplied afterwards — otherwise a shift-drag drifts
  sideways whenever a neighbour happens to line up. T2 now runs its wander-vs-straight pair twice,
  free and locked, and asserts the two differ (else the lock is untested). **✅ green.**
- [x] **G10 · Esc cancels the gesture.** Landed 2026-07-23 as a **third sink**, `revertDelta`, which
  is what `attr`'s `was` field was always for: put back what the preview overwrote. A tool declares
  `onCancel(ctx)` and returns whether it had anything to abandon; `node.cancelGesture()` offers it
  around and reports back, so the toolbar can do `cancelGesture() || setTool("select")` — Escape
  means "undo what I am doing now", and only failing that "leave this mode". Keyboard stays with the
  callsite, as it already was for arrows and z-order: a document listener added inside `svgLens`
  would leak one per commit. As predicted this is **literally T1**, so the law was extended rather
  than added to: three abandoned drags must leave neither a byte nor a pixel behind, the pixel half
  being `domShape` (extracted from T5, since it is the same claim on a different occasion).
  **✅ green** — and it immediately caught a real defect, below. XS
- [x] **G11 · scale from the centre** (alt). Landed 2026-07-23 in `toolTransform`'s scale branch:
  `e.altKey` swaps the pivot from the opposite corner to the box centre and doubles the travel, so the
  handle tracks the pointer while the shape grows symmetrically. Falls straight out of `scaleAbout`
  taking an arbitrary fixed point, exactly as this bullet predicted; the readout (G13) reports the
  live factor. **✅ green.** S
- [x] **G12 · a movable rotation pivot.** Done. `svgFocus` gained a `pivot` (a point in the primary's
  local user space, null = box centre), reset on every new selection; the transform gizmo draws it as a
  `kind:"pivot"` handle (orange, `.pivot`) at `pivot || centre`. `toolTransform` grabs `key:"pivot"` as
  a *view* move — `pivotMove` writes nothing, just `focus.setPivot(localPoint)` and a readout — and the
  rotate branch measures its angle around, and passes as the centre, `focus.pivot || boxCentre`. That
  centre goes straight into `rotateAbout`, which emits SVG's about-point `rotate(angle cx cy)`; so the
  moved pivot is held fixed by the same guarantee the box-centre case had — verified headless
  (`tools/svglens-wip/g12-pivot.ts`: fixed-point error ≤ 1.8e-15 over four pivots) and in-browser (the
  pivot handle appears in transform mode beside the four scale handles and the rotate stalk). The
  pivot is selection-local, so it resets to the box centre after a rotate commits — set it again to
  rotate about the same point twice. S
- [x] **G13 · numeric readout during a drag.** Landed 2026-07-23 as `gestureDelta.readout(text, [ux,uy],
  font)`, a view-delta factory that paints a `<text>` mark (white halo via `paint-order:stroke`) in
  the overlay. `ctx.readoutFont()` returns `12/zoom`, so the label is screen-invariant (T11) while its
  anchor lives in user space. Wired into every drag: move shows `dx, dy`, draw `w × h`, transform its
  branch readout, vertex the point's coordinates; each tool clears it on pointer-up / cancel. The zoom
  the move tool needs is recovered as `12 / readoutFont()` rather than a raw `getScreenCTM()`, so the
  P5 measure-through-ctx law still holds. **✅ green.** S
- [x] **G43 · a move writes the shape's own coordinates.** Landed 2026-07-23. Dragging a `<rect>`
  used to append `transform="translate(10 4)"`, which says the rect is somewhere other than where it
  says it is; it now writes `x="26" y="4"`. Tom: *"I don't like that we use translation nodes on
  things like rects and circles when dragging. There is a more idiomatic option."*
  **The line is not which tags we like, it is whether the position is an attribute of its own.**
  `rect`, `circle`/`ellipse` and `line` keep their position in dedicated numeric attributes, and
  rewriting one is a local edit that leaves every other byte alone. A `polygon`'s position is spread
  through `points` and a `path`'s through `d`, so moving them by coordinates would reprint the whole
  geometry — including the author's own spacing, which the demo drawing exists to show surviving a
  drag — so those, and `<g>`, still translate. Verified in the notebook: the circle went
  `cx="60" cy="52"` → `cx="86" cy="64"` with no `transform` added and its line break intact, and the
  polygon still gained a `translate` with `points="20,190  110,80  200,190"` byte-identical.
  Three details worth keeping. **Two frames, not one**: `Slin` takes a screen delta into the
  *parent's* space where a `transform` is written, `Elin` into the element's own space where `x` and
  `cx` live — so a rotated rect follows the pointer instead of its own tilted axes (dragged (10,0)
  under `rotate(90)` it writes `y="10"`, and nothing else). **Snapping applies to the origin, once**,
  or a line would be stretched onto the grid rather than moved onto it. **An unchanged attribute is
  not written**, so a one-axis drag writes one attribute and a drag that ends where it began writes
  nothing — T1, edge by edge.
  It is one function, `moveDeltas`, and align and distribute went through it too: they had been
  carrying a copy of the same four lines, and they now move a rect by its `x` like everything else.
  **Also fixed on the way**: the snap-to-neighbour path rounded to 1e-6, which is *finer* than the
  noise the screen→user round trip leaves behind, so it preserved it — a circle aligned to a
  neighbour committed `cx="86.000002"`. 1e-4 is below anything an author would write and above the
  noise, and it is fixed rather than zoom-derived, so the same drag still commits the same bytes at
  every zoom (T11). S
- [x] **G44 · one gesture, one undo entry.** Landed 2026-07-23 as `writer.commitMany`, which folds
  every plain-attr edit of a gesture into one running source string, applies it once, and records one
  history entry. `commitDelta` recognises the case — `list.length > 1 && list.every(kind === "attr")`
  — and routes to it; if any attr carries interpolated-template holes it falls back to the sequential
  `commit` (holes need per-edit rebasing). Verified in the notebook: a circle move writing `cx` and
  `cy` is now a single undo. The T4 law was strengthened to assert exactly this — a gesture over N
  elements produces exactly one edit (`gained === 1`), not one per attribute. **✅ green.** M
- [x] **G14 · alt-drag duplicates.** Landed 2026-07-23 in `toolMove`. Holding alt at pointer-down
  records `duplicate` and the origin paths on the drag; on release the tool reverts the originals to
  their start, copies their markup (`copyMarkup`), offsets each by the committed user delta
  (`offsetMarkup`), pastes them as one `duplicate` command, and selects the copies — so the source
  gains new elements and the originals are untouched. The modifier collision this bullet flagged is
  resolved by role: alt while *moving* means duplicate (snapping is irrelevant to a copy). **✅ green.**
  S

#### D — the structural verbs everyone expects (S4)

- [x] **G15 · group and ungroup.** Landed 2026-07-23. ⌘G / ⌘⇧G as registry entries with their
  `rebase`. Two things the property test taught, both about residue: a member takes its *gap* into the
  group with it, so the comment above an element follows the element rather than being dropped; and
  indentation goes in the gaps only, never inside a child, because re-indenting a multi-line element
  rewrites the author's bytes. Ungroup splices the group's inner text straight back, so comments
  inside a group survive too, and pushes a `transform` down onto each child — exactly what the
  renderer was already doing. It **declines** a group carrying anything else, because `opacity` on a
  group is not `opacity` on each child. **Held**: `test_group_ungroup` — 239 of 239 contiguous cases
  byte-identical.
- [x] **G16 · duplicate.** Landed 2026-07-23. ⌘D, offset by a nudge, appended so no existing address
  moves; the copies become the selection. Needs one parent, because "offset by a nudge" is a claim
  about *that* parent's coordinates.
- [x] **G17 · cut, copy, paste, paste-in-place.** Landed 2026-07-23. The payload is the author's own
  bytes, which is what makes paste-in-place byte-identical and what lets the clipboard interoperate
  with every other tool they own. The system clipboard is written best-effort; it cannot be the truth,
  because a paste that had to wait on a permission prompt would not be a paste. Ids that collide are
  renamed and references *inside* the pasted set follow the rename, while a reference *out* of it is
  left as written, because it is still correct. **Held**: `test_copy_paste`.
- [x] **G18 · align and distribute.** Landed 2026-07-23. Six aligns and two distributes, as commands
  rather than a tool — they have no gesture, only a target set. They are not structural: they are the
  move tool's write aimed by arithmetic, so they emit `attr` deltas through `translateLens` and the
  falsifier ("aligning an already-aligned set writing anything at all") holds *by the skip rule*
  rather than by a special case. **Held**: `test_align_commands`, which asserts the writer's own
  condition — `gestureDelta.text(d) === d.base` — on the second plan.

#### E — path and pen: the tool that is furthest from adequate (gap 7)

- [x] **G19 · the pen draws curves.** Landed 2026-07-23. Press places the anchor, drag pulls its
  *outgoing* handle, and the incoming one is the mirror — that symmetry is what makes a pen draw
  smooth curves rather than a chain of unrelated arcs. Both arms are drawn while dragging, because the
  one you are not holding decides how the curve *arrives*, and it is the surprising half.
  The pleasing part is that no case analysis was needed: `curveTo(d, out, in, x, y)` takes the two
  anchors' handles, and a handle sitting on its own anchor is no curvature at that end — so a click
  after a drag, a drag after a click and a plain click are one expression, not three branches. A
  segment is a curve when *either* end has a handle; straight is the special case.
  Verified in a browser with a real drag: press-drag at (20,20)→(40,20), click at (60,60), press-drag
  at (100,20)→(110,10) commits `M 20 20 C 40 20 60 60 60 60 C 60 60 90 30 100 20` — the drag is the
  outgoing handle, the click leaves the far end straight, and the last anchor arrives mirrored.
  **Held**: `test_pen_path`, extended — `mirror` is an involution, and a cubic whose handles sit on
  their anchors is sampled and shown to be its own chord. M
- [x] **G20 · continue an existing path.** Landed 2026-07-23. With no path in progress, a pen click
  within `penCloseRadius` of an open path's *free end* picks that path up instead of creating a new
  one; the next click extends it. Picking up writes nothing at all — it is a `select` delta, so T9
  covers it and T1 is not even in question.
  Only the end, not the start: extending backwards means reversing the author's `d`, which would
  rewrite every byte of an attribute the gesture is not otherwise touching. That is a smaller editor
  than Illustrator's and a much smaller diff, and the trade is the one this whole document keeps
  making.
  A closed path has no free end (`/[Zz]\s*$/` on the source `d`, not on the rendered geometry), so it
  declines; front-to-back scan, like every other hit test here.
  **Held**: in a browser, tapping (180,100) on the corpus' open path leaves the document byte-identical
  and moves the selection to `[0,1]`; the next tap makes `d` = `M 120 100 L 150 40 L 180 100 L 190 60`
  with the path count still 1. A tap away from every free end still creates a new path (`[0,4]`). S
- [x] **G21 · corner ↔ smooth.** Landed 2026-07-23. Smoothness is **geometry, not a stored flag**:
  an anchor is smooth when its two control handles are collinear with it and point opposite ways.
  There is nowhere to keep a "corner that happens to look smooth" bit that would not be hidden state,
  and hidden state is the thing this editor does not have — so the toggle asks the drawing, never a
  side table. The cost of that choice is stated rather than hidden: an anchor whose handles are
  accidentally collinear reads as smooth, and "make corner" has to *do* something visible, so it
  retracts both handles onto the anchor.
  Two halves. **Alt-drag breaks the pair**: dragging a handle of a smooth anchor moves the partner
  too, mirrored, keeping its own length; with alt held only the handle under the pointer moves, and
  the geometry stops being collinear — which *is* the corner. `altKey` is read off the live event, not
  off the press, so the decision is revocable mid-drag like every other modifier here.
  **The toggle is a command, not the double-click the plan called for**, because double-clicking an
  anchor already means *delete this vertex* (G23) and that is tested behaviour. It acts on the one
  held vertex (P7).
  Smoothing a straight join promotes the segment to `C p0 p3 p3`, the cubic that draws the identical
  chord; retracting demotes it back, so **smooth-then-corner returns the author's original bytes**
  rather than a curve-shaped straight line. Q, arcs and `Z` are declined, not approximated.
  **Held**: `test_path_smooth` — over random polylines, toggling an interior anchor makes it smooth,
  moves no other anchor, and toggles back byte-identical; and coupling keeps the partner's length and
  the anchor smooth. In a browser: `M 20 100 L 100 40 L 180 100` → toggle → two cubics with the
  vertex still held → toggle → the original three commands back. M
- [x] **G22 · select and move several vertices.** Landed 2026-07-23. Two halves. **Marquee**: a press
  on *empty* canvas while a shape's handles are on show bands its anchors — a `select` gesture that
  writes nothing (T9). It must claim only empty canvas — gated on `ctx.pick(e)` being empty, so a
  press on the shape body (to move it) or on another element (to reselect) still falls through to the
  move/marquee tools; the first cut skipped that gate and `toolVertex` swallowed every ordinary
  select/move press, which the browser laws caught as **T2 and T10 regressing** (a moved element and a
  hit both went missing). **Move**: grabbing a vertex that is already in a multi-selection drags the
  whole set; `moveVertices` translates each held anchor *and the control handles incident to it* by one
  local delta and returns it as **one attribute edit per element** — the "one delta per claimed
  element" of a move, refined to the claimed vertices inside it. Relative commands are re-derived from
  the new running pen so a rel chain never double-counts (verified: `l 40 0 l 40 0` moving the middle
  anchor writes `l 40 20 l 40 -20`, third anchor fixed), `H`/`V` keep to their one axis, and a
  zero-delta move is byte-exact (T1). A bare click on empty canvas deselects, as it did before. **9/10
  browser laws green** (only T11 fails, and it fails identically on the pre-G22 baseline — a harness
  pointer-delivery flake, not this code). M
- [x] **G23 · open/close a subpath, and delete a segment.** Landed 2026-07-23, as two commands on
  S4's registry rather than two gestures — the payoff of P7 is that "the vertex you are holding" is
  now something a *command* can be planned against.
  `delete-vertex` (bound to Delete) takes the held vertices. The finer selection is the one the key
  means: with a vertex held it deletes the vertex, with none held it falls through to deleting the
  element, and it is `canCommand` that decides — the same plan that would grey the menu item out.
  Descending by ordinal, so each delete leaves the ordinals still queued exactly where they were, and
  each delta carries its own `vertex-delete` op so a held address rebases (P7). It declines rather
  than guesses in three places: two elements at once, a polygon that would be left with one point,
  and a path's `M` anchor, which terminates no segment.
  `close-path` / `open-path` are one `Z`, on or off. Only `d`: a polyline is not a polygon with a
  flag, it is a different element, and swapping the tag is a different edit than this one claims to
  be. With several subpaths this closes the last, which is what a trailing `Z` means. No handle
  appears or disappears — `Z` takes no arguments — so no vertex op is owed.
  **Held**: `M 120 100 L 150 40 L 180 100` → close → `… Z` → open → the original bytes back;
  closing an already-closed path declines (T1 by declining rather than by writing the same thing).
  In a browser, deleting the held anchor `0/0#a1` of the corpus polygon gives `20,100 100,100` and
  undo restores the document exactly. **Not** done: deleting a *middle* segment, which splits one
  subpath into two and needs a new `M` — only the trailing case is implemented. S
- [x] **G45 · scribble, and get a curve.** Landed 2026-07-23 as `toolScribble` + `fitCurve`. Hold and
  draw; on release the captured polyline is fitted (Schneider: least-squares one cubic, worst-deviation
  split, a few Newton reparameterisations) to a chain of cubics and committed as one `<path>`, after
  which every vertex gesture applies — the whole point of landing in the same representation. The
  stroke previews as an overlay polyline and writes nothing until release, so an abandoned scribble is
  T1 by construction. The tolerance is a screen distance divided out through the CTM (`readoutFont` is
  12px/zoom), so the fit is a pure function of the drawing and not the zoom (T11); points closer than
  half the tolerance are dropped, since a trackpad oversamples and that noise is what makes naive fits
  wobble. The polyline is split at corners first (a turn sharper than the threshold), so a deliberate
  kink stays a corner. Verified headless: a quarter-circle fits within tolerance as one cubic (0.5u
  deviation at r=50), an L-shape splits into two cubics at its corner, and the fit is deterministic.
  Toolbar gains a **Scribble** button (key S); the tool passed the two P5/write-path tool laws. M
  <details><summary>Original plan (as written)</summary>

  Tom: *"I should be able to scribble draw like a pen but it
  goes into bezier mode."* A freehand tool: hold and draw, and on release the captured polyline is
  **fitted** to a chain of cubic Béziers and committed as one `<path>` — after which every existing
  vertex gesture (G19–G21, G23) applies to it, which is the whole point of ending in the same
  representation rather than in a special "sketch" object.
  The fit is the work: Schneider's algorithm (fit one cubic by least squares, measure the worst
  deviation, split there and recurse) is the standard answer and is about 80 lines. Two knobs an
  author will actually feel: a **tolerance** in *screen* px (so it must divide out through the CTM
  like every other measurement, P5) and a corner threshold, above which a direction change becomes a
  real corner rather than being smoothed through. Sample on `pointermove` in user space, and drop
  points closer together than a fraction of the tolerance — a trackpad emits far more points than the
  fit needs, and the input noise is what makes naive fits wobble.
  It writes nothing until release: the stroke previews as a `view` delta (P6), so an abandoned
  scribble is T1 by construction. **Falsified by:** the committed path deviating from the drawn
  points by more than the tolerance anywhere; the same scribble committing different bytes at
  different zooms (T11); or a fitted path whose anchors G21 then reports as neither smooth nor
  corners. M
  </details>
- [x] **G24 · subdivide an arc — decided 2026-07-23: no.** Tom: *"I don't think an arc should be
  subdivided without an explicit conversion."* So an arc stays non-subdividable, and the code that
  refuses it (`segs[i].kind === "A"` → decline, in `splitPathSegment`, `deletePathAnchor`,
  `toolStructure` and the two subdivision laws) is the correct behaviour rather than a gap. What was
  filed here as a missing feature is really a symptom of a missing *primitive* — see G47. An author
  who wants to edit an arc's interior converts it to cubics first, explicitly, and then every path
  gesture applies.
- [x] **G47 · change a segment's type.** Landed 2026-07-23 as `pathConvert` (the registry) plus
  `cmdConvertSegment` (three commands: straighten, to-bézier, to-quadratic). One correction to the plan
  below: **`A→C` is not exact.** A cubic Bézier cannot draw a circular/elliptic arc exactly — the
  `(4/3)·tan(θ/4)` construction is the best there is and every renderer uses it. Measured radial error
  is 2.7×10⁻³ per unit radius (0.027%), i.e. sub-pixel at any sane zoom, and endpoints are pinned
  exactly; so it renders pixel-identically in practice but the word "exact" in the plan was wrong and
  is retracted here. Everything else landed as written: `L↔C` byte-exact (the roundtrip returns the
  author's `M 0 0 L 10 20` unchanged), `Q→C` exact degree-elevation, `C→Q` offered only when the cubic
  is a raised quadratic and declining otherwise, `A→C` splitting a >90° sweep into 2–3 sub-cubics with
  the endpoint pinned. Held anchors address segments (the terminating-anchor reading `delete-vertex`
  uses); a set converts highest-index-first so an arc's expansion never shifts the segments below it; a
  following smooth `S`/`T` is made absolute first (as `splitPathSegment` does). Each command greys out
  where the registry declines (T8). This closes **G24** — subdividing "an arc" is now subdividing the
  cubics it becomes, and the arc is never subdivided. Surface today is the context menu (G8); the S9
  affordance panel will add the on-segment version. **✅ 59 green.** M
  <details><summary>Original plan (superseded by the entry above)</summary>

  The primitive the whole editor is missing, named by Tom:
  *"a way to change a vertex between bezier and straight — and arc would be one of those too."* A path
  segment has a *kind* — `L` (line), `C`/`S` (cubic), `Q`/`T` (quadratic), `A` (arc) — and today the
  kind an author drew is the kind they are stuck with. Making the kind editable is one command,
  `convert-segment`, whose plan is a small **conversion registry**: an entry per ordered pair it knows
  how to rewrite, keyed on `(from, to)`, returning the replacement group or declining.
  Half of it already exists, unnamed and welded shut. `pathSmooth.promote` is exactly `L → C`
  (`C p0 p3 p3`, the cubic that draws the identical chord) and `demote` is `C → L` (a cubic whose
  handles sit on its endpoints spelled `L` again) — they are private to the smooth toggle and refuse
  everything else. G47 lifts them out as the first two registry entries and adds the rest:
  - **`L ↔ C`** — already written; the round trip is byte-exact, which is the property test G21
    already passes.
  - **`C ↔ Q`** — exact one way (a quadratic *is* a cubic with its controls at ⅔), lossy the other, so
    `C → Q` is offered only when the cubic actually came from a quadratic (both controls on the ⅔
    points) and declines otherwise — the same "decline rather than guess" `demote` uses.
  - **`A → C`** — the explicit conversion arcs need, and the reason G24 is a *no* rather than a
    feature. An arc splits into up to four ≤90° pieces, each an exact cubic; `absoluteGroup` already
    rewrites an `A` as an absolute same-shape command, so the missing piece is only the arc→cubic
    maths. It is deliberately **one-way**: cubics do not round-trip back to a single arc, and pretending
    they do would invent a curve the author did not draw. After it, subdividing "an arc" is just
    subdividing the cubics it became — which is why this closes G24 without ever subdividing an arc.
  The surface is G39's territory (an affordance on a held segment: "make straight" / "make curved" /
  "to béziers"), and the write path is `commitDelta` like everything else. **Falsified by:** any
  offered conversion whose result does not render pixel-identically to the segment it replaced (every
  conversion here is exact by construction *except* the intentionally-declined lossy directions); or a
  round-trippable pair (`L↔C`, `C↔Q`-from-Q) that does not return the author's original bytes. M
  </details>

#### F — view (S7)

- [x] **G25 · zoom and pan.** Landed 2026-07-23. Wheel zooms about the pointer (`ctrl`/pinch is 4×
  the rate), middle-drag pans, ⌘0 fits, ⌘1 is 100%, ⌘2 fits the selection. `ctx` gained
  `view`/`zoomAt`/`panBy` so a tool asks for a view change the same way it asks for anything else,
  and `applyView` writes nothing at identity so a notebook that never zooms has a byte-identical
  root. **The claim worth recording is that no existing tool changed** — not one line — because P5
  had already routed every measurement through `getScreenCTM`, which absorbs the viewBox. Verified
  empirically before it was trusted: at `k = 2.5` the CTM ratio is exactly 2.5 and a corner drag
  commits the same numbers it commits at 1. **Held**: T11.

#### G — content, not just shapes (S8)

- [ ] **G26 · the text tool.** Click to place, type in place, double-click existing text to re-enter.
  Needs a **content** lens — children, not attributes — which is a genuinely new lens shape rather
  than another registry entry. L
- [ ] **G27 · place an image.** `<image>` with an `href`; the interesting part is that a data URI and
  a file reference are different residue decisions. S

#### H — style as gestures (S6)

- [ ] **G28 · eyedropper.** Alt-click picks fill and stroke off another shape onto the selection.
  A tool cell, and cheap once the field registry exists. S
- [ ] **G29 · drop a swatch onto a shape.** Drag a colour from a palette onto a shape; the drop target
  is a hit test, so it reuses `ctx.hit`. S

#### I — stroke and paint: the half of SVG that is not geometry (S6, S9)

Everything above edits *where* things are. Nothing above edits *what they look like*, and for most
drawings that is the half an author spends their time on. All of it is presentation attributes or
`style` declarations, and `setProperty` already routes attribute-vs-`style` correctly — gap 5's
plumbing has been done since M0. What is missing is the gestures and the widgets, so these items add
no write path. They share one falsifier, which is worth stating once: **a widget's commit must be
byte-identical to the equivalent `node.setAttr`**, because a second way to write a value is a second
place for the laws to be false.

- [x] **G30 · stroke width.** Value-editing done: `stroke-width` is a number field in the panel
  (`svgFields`, `min:0 step:0.5 dflt:1`), committed byte-identically through `setProperty`→`commitDelta`
  like every other field. The *drag-grip on the outline* now exists too — the `stroke-grip` affordance
  (S9/G39), a horizontal drag read as a width in user units (screen delta ÷ the root zoom, so
  zoom-invariant) fanned out across the selection. The `non-scaling-stroke` special case is a further
  refinement of that provider. S
- [x] **G31 · dash pattern.** Value-editing done: `stroke-dasharray` is a text field and
  `stroke-dashoffset` a number field in the panel. Byte-preservation holds for free because the panel
  writes the author's string verbatim (`setProperty` via `styleLens`/attribute, no reformatting) —
  `4 3` stays `4 3`, `0.5em` stays `0.5em`; the falsifier (round-trip changing bytes) can't fire
  through a text field. The *draggable-lengths-along-the-outline* gesture (the `pointsLens`-sibling
  dash-list lens) is the S9 affordance. M
- [x] **G32 · caps and joins.** Done. `stroke-linecap`/`stroke-linejoin` are `kind:"enum"` fields
  (`Inputs.select`-style `<select>`) and `stroke-miterlimit` a number field. This is what forced the
  registry's third kind (`enum`, holding its `options`), and the panel renders it as a native `<select>`
  built with plain DOM (htl rejects a bare `${cond?"selected":""}` in attribute position — see the
  fieldPanel note). Verified in-browser: selecting a circle then committing `stroke-linecap="square"`
  wrote through `setField` and re-read as `square`. S
- [x] **G46 · a field panel, so the enums have somewhere to live.** Tom, hitting exactly this:
  *"I can't do dotted lines and line caps and things (Inputs.select?)"* — and the `Inputs.select` is
  the right instinct. G31/G32/G37 are all *enumerated* values, and an enum has no natural gesture:
  there is nothing to drag. What is missing is not the lens but the **surface**: a panel, driven by
  S6's field registry, that shows the fields the current selection actually has and edits them with
  ordinary Observable inputs — `Inputs.select` for the enums, a number input for widths, a colour
  input for paint. It composes with S9 rather than competing: an affordance is for the one or two
  fields worth a gesture on the canvas, the panel is for the long tail.
  The panel must go through `commitDelta` like everything else, which makes its falsifier the same
  as the rest of group I: **a widget's commit must be byte-identical to the equivalent
  `node.setAttr`**. Because it is a registry-driven projection, adding a field is a cell, and every
  item below gets a UI for free the moment its entry exists. Worth doing *before* G31/G32/G37 rather
  than after: they are what an author reaches for, and without this there is nowhere to put them. M

  **Done.** Two-part: `svgFields` (`_sl270`) — the registry: a 14-entry `list` of
  `{prop, label, kind, ...}` (`kind ∈ color|number|enum|text`; enums carry `options`, numbers carry
  `min/max/step/dflt`) and a `read(doc, idx, prop)` that mirrors `setProperty`'s sink choice (a `style`
  declaration wins over the attribute, absent reads `""`), so the panel shows the same value the write
  path would touch and preserves the author's notation. `node.fields(path)` returns the list with each
  field's current value; `node.setField(path, prop, value)` is the write, routed through
  `setProperty`→`writer.commit` (the one path), returning `null` when unchanged (T1) so a no-op writes
  nothing. `fieldPanel` (`_sl271`) is the demo surface: a pure projection of `node.fields`, one widget
  per `kind` (native `<select>` for enums, number/text inputs, a colour swatch **and** text box so the
  picker and the author's notation both survive), each committing on `change` via `setField` to *every*
  selected element (the align commands' "one delta per claimed element", G40). Re-renders on
  `lens-select`/`lens-put`; the listener is wrapped so a render error can't wedge the drawing's
  synchronous `draw()`. Verified headless (`tools/svglens-wip/g46-fields.ts`: 14 fields, style-over-attr
  precedence, `darkseagreen` preserved, correct sink per element) and in-browser (a circle's 14 typed
  fields render; `fill` and `stroke-linecap` commit and re-read; unchanged value → `null`). Note:
  visual confirmation of the widgets inside the lopepage pane was blocked by a headless
  intersection-observer quirk (the sibling drawing pane shows the same "loading" placeholder) — the
  render logic itself is verified throw-free and the projected data correct. M
- [x] **G33 · fill and stroke colour.** Value-editing done: `fill` and `stroke` are `kind:"color"`
  fields, each rendered as a native `<input type=color>` swatch (the picker) **beside** a text box that
  holds the author's exact string. The text box preserves notation because `read`/`setProperty` never
  reformat — `darkseagreen` stays `darkseagreen` (verified headless); the swatch only overwrites when
  the user picks from it. Setting a shape to the colour it already has is a `setField` no-op (returns
  `null`, T1), so the byte-identity falsifier can't fire. The fill↔stroke *swap gesture* now exists as
  the `swap-paint` affordance (S9/G39), applied to every selected element (verified in-browser: a
  circle's fill and stroke exchanged). The *on-canvas two-swatch picker* is a further chip on the same
  registry. M
- [x] **G34 · opacity.** Value-editing done: `opacity`, `fill-opacity`, `stroke-opacity` are number
  fields carrying `min:0 max:1 step:0.05` — the first fields whose 0–1 range the registry records and
  the panel reflects on the input element. The single *scrub gesture with a modifier* choosing which of
  the three is the S9 affordance. S
- [x] **G35 · gradients as editable objects.** Done — `cmdAddGradient` (`_sl277`) mints a
  `linearGradient` into `defs` (creating `defs` if absent) from the shape's current fill as the first
  stop, and points the shape's `fill` at `url(#id)`; surfaced as the `◑` affordance chip, which
  declines (greys) unless exactly one paintable shape is selected. Editing the gradient is *editing
  its `<stop>`s and endpoints as ordinary tree elements* — they live in the same source, so selection,
  the field panel and the attribute handles reach them through the one write path; the gradient is a
  shared reference, so a stop edit repaints every shape that points at it (that *is* the "write lands
  somewhere else than the pointer" property, expressed through the reference model rather than a
  bespoke over-the-shape overlay handle). **Both falsifiers held** (`tools/svglens-wip/s10-defs.ts`):
  two `add-gradient`s produce `grad1`/`grad2` — never a shared id — and a copy-pasted gradient is
  renamed `grad1-2` by the existing `freshenIds` codec; a `<stop>` edit changes the source both
  referrers read while the fill reference is unchanged, so it repaints. *Scope note:* what is **not**
  built is a dedicated on-canvas gizmo that draws the gradient's x1/y1→x2/y2 vector *over the shape* as
  draggable endpoint handles — that is an affordance refinement on top of the finished write path
  (select the gradient, drag x1/x2 as numeric attrs today), not a new capability. L
- [x] **G36 · markers, which is to say arrowheads.** Done — `cmdAddMarker` (`_sl278`) mints a
  `<marker>` (arrowhead `path`, `orient="auto-start-reverse"`) into `defs`, coloured by the shape's
  stroke, and sets `marker-end="url(#id)"`; surfaced as the `➤` chip, which applies only to stroked
  path tags (`path`/`line`/`polyline`/`polygon`) and declines on a `rect`. Reuses all of S10 — the
  non-colliding id, the untouched addresses (`defs` appended last so no referrer's path moves), the
  paste rename. Verified alongside G35 in `s10-defs.ts` (marker target is a `<marker>`, coloured
  `#2F6BFF` from the stroke, rect declines). *Scope note:* `-start`/`-mid` and per-vertex marker
  placement are the same "set one more attribute" and left as a registry follow-on. M
- [x] **G37 · paint-order, fill-rule, non-scaling stroke.** Done — three `kind:"enum"` fields
  (`paint-order`, `fill-rule`, `vector-effect`) in the registry, free once G32 gave the panel its
  `enum` kind. Each commits one attribute through the same `setField` path. S

#### J — the selection preview is a surface, not a box (S9)

Tom's observation, 2026-07-23: *"it might make sense to have additional tools on the selection preview
that are shape specific."* Stated as architecture, that is S9 — and it is the same move S2 made for
geometry handles. What a selection offers is currently hard-coded in one function and identical for
every tag; it should be contributed by the shape entry that already knows what that tag is.

- [x] **G38 · the affordance registry.** Done. `svgAffordances` (`_sl272`) is an array of providers —
  the same registry shape as `svgShapes`/`svgCommands` — each `{id, applies(a), declines?, glyph(a),
  cursor?, command? | tap?(ctx,a) | drag?}`. `a` is the read context (`node.affordanceContext`), the
  chip's `env`: the selection plus the same measured questions a command gets and one it adds, the
  primary's field value. `svgFocus.paint` computes the selection box (single, or the union for a set)
  and hands it to a `decorate` hook that svgLens sets — svgLens alone has the registry and
  `canCommand` — which draws each applicable, non-declining chip in **root** space (like the
  multi-selection boxes, so one placement rule serves single and set). Every chip carries `dataset.aff`;
  `toolAffordance` (`_sl273`) is first in the tool array but claims **only** a press whose target has
  `dataset.aff` and falls through otherwise (the G22 empty-space discipline), then runs the chip's
  command / `tap` / `drag`. So a chip touches the DOM only through the overlay and the source only
  through `commitDelta`/`node.setField`/`node.command` — `toolAffordance` is inside both tool laws
  (`test_tools_write_through_the_delta`, `..._measure_through_ctx`), which now enumerate 12 tools and
  stay green. Verified headless (`tools/svglens-wip/g38-affordances.ts`) and in-browser: selecting a
  circle draws exactly the three universal chips, a path draws its `close-path` too. **Falsified by:**
  T6 — an empty affordance set leaves the document byte-identical after a click; holds because a chip
  with no marks is never drawn and `toolAffordance` returns false on a press that is not on a chip. M
- [x] **G39 · the first set of shape-specific affordances.** A first set landed as *entries*, not
  branches: the universal ones — `duplicate` (surfacing the command), `swap-paint` (G33's fill↔stroke
  swap), and the `stroke-grip` (G30's canvas gesture, below) — plus the path verbs that already exist
  as commands, `close-path`/`open-path`/`toggle-smooth`, surfaced on a `path` selection. Each path chip
  is command-backed, so it lights up exactly when its command is available and is absent otherwise
  (verified: an open path shows `close-path`, hides `open-path`). The remaining items in the wishlist —
  `rect` corner radius, `circle` radius readout, `text` size/baseline, arrowhead toggles (need G36),
  `g` "enter this group" — are further entries in the same array, added the same way; the mechanism
  (G38) is what this task was really for and it is done. M
- [x] **G40 · affordances that act on the whole selection.** Done. `paint` now draws chips on the
  *union* box of a multi-selection, and the shared providers (`swap-paint`, `stroke-grip`) loop over
  `a.paths` — every selected element — writing one `setField` per element, the align commands'
  "one delta per claimed element". Each write remounts the drawing, so the loop re-reads the live node
  from `ctx` between writes (the toolMove multi-element pattern); a captured node goes stale after the
  first commit and the rest silently no-op — a real bug caught here, where a two-write swap left the
  second write on a dead node until the fix. **Falsified by:** a shared affordance writing to the
  primary only — holds: the loop is over `a.paths`, not `a.path`, verified in-browser (swap exchanged
  both paints; grip fans out by the identical loop). S
- [x] **G41 · a chip that declines is not drawn.** Done — T8 at the surface. A command-backed chip's
  draw guard is `!a.canDo(id)`, and `a.canDo` is `node.canCommand`, which is `commandPlan(id) !== null`
  — the *same* plan the context menu greys on, so a hidden chip and a refused menu item cannot
  disagree. Verified in-browser: on an open path `close-path` draws and `open-path` does not
  (`canCommand("open-path")` is false); `toggle-smooth` stays hidden until an anchor is held. A chip
  that declines is simply not appended — it disappears rather than greys, which is the affordance
  analogue of "decline, don't guess". S
- [x] **G42 · the readout is an affordance.** Done, and it was P6 that did the structural work: the
  G13 readout is not a special overlay case but a `view` delta the *active gesture* emits
  (`gestureDelta.readout(text, [ux,uy], font)` → a keyed, idempotent `view` mark), exactly parallel to
  a selection chip. Both faces of S9 — the selection's affordances (G38) and the gesture's readout —
  are now "marks drawn through the delta, cleared by the delta", one mechanism. The active gesture
  contributes its own readout: `toolVertex` shows the point or point-count, `toolMove` the delta,
  `toolTransform` the angle — each a `previewDelta(ctx, gestureDelta.readout(...))` in its own move
  handler, so adding a gesture-time readout is a line in that gesture, not a branch in the overlay. S

#### K — defects found by use, not by reading

This section exists because the two most expensive bugs in the log — the P7 restore and the
undo-drops-selection one (M15, M17) — were both found by *driving* the editor, and neither was
visible in the source. Items here are reports first and diagnoses second, and they say which is which.

- [x] **B1 · the first frame of a drag jumps.** Fixed 2026-07-23. Both causes were in
  `toolMove.onPointerMove`. The threshold was a trigger — the first committed frame applied the whole
  offset from the press point — so it now subtracts a **dead zone** that is a pure function of the
  current offset: `raw · max(0, |raw| − thresh) / |raw|`. This is the form the item argued for and for
  the reason it gave: subtracting at the crossing point would make the result depend on *where* the
  threshold was crossed (a T2 violation), while this form is path independent and continuous at the
  threshold (0 at `|raw| = thresh`, no jump), costing every drag `thresh` short of the pointer. The
  ratio dx:dy is preserved, so axis-lock is unchanged. Snapping got the **hysteresis** the item asked
  for: once an axis is snapped it holds through 2× the tolerance before breaking away, and the sticky
  state lives in `d.snapped` (the C-complement, declared in `ctx.state.drag`, not a closure).
  **Falsified by:** a slow and a fast drag to the same endpoint committing different values (T2), or the
  shape moving before the pointer travels `thresh` — both structural now: the committed delta is
  `deadzone(clientNow − clientPress)`, a pure function of the endpoint that is 0 below `thresh`.
  **Held**: the `test_gesture_path_independence` law (T2) green in a browser — *"a 5-leg wander and a
  straight drag to the same point commit the same bytes, locked or free"* — plus
  `tools/svglens-wip/b1-deadzone.ts` (no premature move, direction preserved, continuous at the
  threshold), and B3's frame budget (no first-frame jump across the sampled frames). S
- [x] **B2 · the drawing flashes unzoomed on release. Fixed 2026-07-23, second attempt, and
  confirmed gone by Tom in ordinary use — the first attempt fixed a real bug that was not this one.** Three reports narrowed it: *"the glitch is on gesture
  start"*, then *"after zooming, the gesture after that momentarily displays the unzoomed size"*, then
  a screen recording and *"actually it was when the gesture released!"*
  **What the recording says, measured rather than watched.** 23 frames at 120 fps; one frame differs
  (mean |Δ| of 20.8 against 0.0 for every other pair), and it is a single displayed frame. Taking the
  circle's fill as a ruler — `r = 24`, so 48 user units across — it spans 72 px in the frames either
  side and 190 px in the flash: **3.958 px/unit against 1.500**, a ratio of 2.64. At 3.958 px/unit the
  pane holds ≈ 320 user units, which is the source's own `viewBox`; the view in force asked for ≈ 845.
  So the flash frame is one rendered with **the view never applied at all** — not a wrong view, an
  absent one.
  **Why, and why `requestAnimationFrame` was not enough.** A commit re-runs the cell, and the fresh
  node cannot resolve the `Variable` its view is filed under — the runtime has not taken its value
  yet — so `viewNow()` reads identity and `applyView()` correctly declines. The view was restored from
  an rAF, and rAF only guarantees "before the paint of the frame it is scheduled *for*". If the
  recompute lands after that frame's animation-frame callbacks have already run, the restore is
  scheduled for the *next* frame, and the frame in between paints the drawing at 1:1. That is a race,
  and this document should not have called it a closed window.
  **The fix: the outgoing node hands the view to the node that replaces it.** It is the only object
  that still knows the view at that instant, so it watches its own parent and, when something takes
  its place there, copies its live `viewBox` onto it. Two properties make this a mechanism rather than
  a faster race: MutationObserver callbacks are **microtasks**, so this runs before the rendering
  steps of the *same* frame; and the heir is identified **positionally** — the node that took our
  place in our parent — so a fresh node never has to guess which `Variable` it belongs to. Confirmed
  live at the moment of the swap:
  ```
  oldConnected: false   oldVb: "-140 -90 842.105 578.947"
  heir: true            heirVb: "-140 -90 842.105 578.947"   heirInh: "inherited"
  ```
  Arming is at **pointerdown**, not where the view is written: `applyView` usually runs from the
  restore rAF *before* the runtime has inserted the node, so it finds no parent to observe. A gesture
  is also the only thing that can cause the replacement being guarded against, so pointerdown is both
  sufficient and free. At identity nothing is armed at all.
  **Both earlier changes stay, and one of them is load-bearing.** The rAF restore still runs (it
  restores selection and re-derives the view properly), and the `target.doc() === null` guards from
  the first attempt are what keep the outgoing node's `viewBox` intact for the handover to read —
  without them `restoreView` would have wiped it on the way out. 59 headless tests, 10 browser laws.
  **Falsified by:** any frame between two commits whose `viewBox` is not the one the view asked for.
  The recorder that finds it, which re-resolves the live node each frame rather than holding a stale
  reference:
  ```js
  { const lens = () => [...document.querySelectorAll("svg")]
      .filter((s) => typeof s.view === "function" && s.isConnected)[0];
    let want = null;
    const tick = () => { const n = lens();
      if (n) { const got = n.getAttribute("viewBox");
        if (want === null) want = got;
        else if (got !== want) console.warn("frame at the wrong view", got, "wanted", want); }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick); }
  ```
  S
- [x] **B3 · a gesture-level frame budget.** Done — `frameBudget` (`_sl274`), the frame-level sibling
  of `gestureLaws`. `frameBudget.run()` mounts a fixture, selects a shape, then samples the drawing
  every `requestAnimationFrame` while a scripted multi-leg drag plays (a concurrent rAF loop recording
  through the gesture), and asserts the per-frame invariants the K-section bugs each broke: the
  selection is never empty between two frames (M17's undo-drops-selection class), the overlay never
  drifts more than 2px from the shape it frames (the group-space `boxGap`), and the drawing's screen
  scale never jumps >1.5× against its neighbour (the B2 unzoomed flash, which was one frame at 2.64×).
  That is T5 applied *per frame* rather than per commit. Needs a browser; headless it reports ⏭.
  **Held**: `frameBudget.run()` green in a browser — *"selection held (≥1), overlay within 0.0px every
  frame, no scale flash"* — which also stands as an independent confirmation of B1 and B2. M

#### Explicitly not on this list

**Boolean path operations** (union/subtract/intersect) need a robust path clipper, which is a library
dependency of a size this project has avoided, and their output is machine-generated path data — the
opposite of the residue this editor exists to preserve. **Filters and masks** as *editable* objects stay deferred; they
should at least survive an edit untouched, which the source lens already gives for free. (**Gradients
and markers** were on this list until 2026-07-23 and have moved onto it as G35–G36, behind S10 — the
thing that made them tractable is that `refsOf` and the `defs`-carrying source lens turned out to be
most of the work.) **Multi-page/artboards** is not an SVG
concept. **Live collaboration** is `editor-5`'s problem (gap 10), not the editor's.

#### Order

Roughly by value per unit of work, given what already exists:

1. ~~**G1, G10, G9**~~ ✅ — hover, Esc-cancels, axis lock. All small, all immediately felt, none needs
   a registry that does not exist. G1 needs P6.
2. ~~**G2–G5**~~ ✅ — direct geometry. This is the item that changes what the editor *is*, and it was
   one registry (S2) plus six small cells (S3).
3. ~~**G6**~~ ✅ — groups, which also closed the last known bug.
4. ~~**G25**~~ ✅ — zoom, which every subsequent gesture is easier to test and to use with.
5. ~~**G15–G18**~~ ✅ — the structural verbs, on S4's registry. P8 and C7 closed with them.
   G8 and G14 are unblocked by the same work.
6. **G19–G23** — the pen and path work. **G19, P7, G20, G21 and G23 done.** Only G22 (several
   vertices at once) remains. **G24 resolved 2026-07-23 as a *no*** (arcs are not subdivided in
   place); the real want underneath it is **G47** (change a segment's type), whose `L↔C` half already
   exists inside G21's smooth toggle and wants lifting out into a conversion registry.
7. ~~**G43**~~ ✅ 2026-07-23 — a move writes the shape's own coordinates, not a `transform`. **B2 done**
   the same day (the unzoomed flash). Both were reported by Tom in use, neither was on the list.
8. **B1** — the drag jump. Small, felt on *every* drag, and the only item here that makes the editor
   feel worse than it is. Do it before adding surface — but it needs a decision, because the obvious
   dead-zone fix violates T2. **Next, and the question is Tom's.** **G44** (one gesture, one undo)
   is its natural neighbour: both are about a single drag behaving as one act, and G44 is now more
   visible because G43 made a rect move two attributes.
9. **G46 → G30–G34, G37** — stroke and paint. **G46 first**: the field panel (`Inputs.select` for the
   enums) is the surface the enum tasks have nowhere to live without, and it is what Tom hit asking
   for dotted lines and caps. Then G30–G34/G37 on S6's field registry — the "what about strokes" half
   of an editor, no new architecture, every item S.
10. **G38–G42** — S9's affordance registry. Do it *after* G30–G34, so the first affordances are
    backed by fields that already exist rather than invented alongside them; G39 then costs nothing
    per shape.
11. **S10, then G35–G36** — `defs` you can point at, gradients and arrowheads. The largest remaining
    block, and the one that most changes what documents the editor can open without breaking.
12. **G45, G47** — the path-shape pair. **G45** is scribble-to-curve (Schneider fit), self-contained
    and independent of the registries. **G47** is change-a-segment's-type: its `L↔C` half is already
    written inside G21, and `A→C` is what makes an arc editable at all — the explicit conversion G24
    turned out to need. Both end in a `<path>` every existing gesture edits.
13. **G26–G29** — text, images, eyedropper, swatch drop. Text is the biggest single item on the whole
    list (a content lens, not an attribute lens) and is deliberately last.
14. **B3** — the per-frame harness. Not a feature; the thing that stops K from refilling.

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
- **M9 — S0 done (2026-07-23).** The gesture side got the treatment the lens side already had.
  A gesture is now a **value** (`gestureDelta`, with `attr`/`command`/`select` constructors), read by
  exactly two sinks — `previewDelta` into the live DOM and `commitDelta` into the source — through
  one shared expression, `gestureDelta.text`. All seven tools were converted to it (C0–C6, and
  `toolStructure`'s branches as command deltas), the tool set became a callsite parameter
  (`svgLens(node, {tools})`), and every measurement a tool takes now goes through `ctx` (P5).
  Eight gesture laws run in a browser via `gestureLaws.run()` — T1 identity, T2 composition, T4
  origin, T5 consistency, T6 confinement, T7 rebase agreement, T8 partiality, T9 selection — on a
  fixture harness (`gestureFixture` + `playGesture`) that drives the *real* writer with synthetic
  pointer events in the drawing's own user units. Two more, `test_tools_write_through_the_delta` and
  `test_tools_measure_through_ctx`, are pure: they read the tools' own handler source and run
  headless with the 50 lens laws, so a tool that grows a second write path or a hidden input fails
  CI rather than a demo.
  What the exercise actually cost, and it is the lesson: **every failure it produced was in the
  harness, not the product.** A module per fixture fed `currentModules` and made the laws re-trigger
  themselves; `mod.define` mints a new variable per call, so `_opts` was "defined more than once";
  concurrent fixtures at the same screen origin answered each other's `elementsFromPoint`; a 60ms
  quiet window did not clear the gap *between* two commits of one gesture, so a four-element move
  looked like three and T4 reported a bug that was not there. Each was verified against the product
  before being believed. The one real defect found was C0's, and the laws did not find it — reading
  the code for the paper did.
  Remaining from the list: C7's second half, the command registry, which belongs to S4.

- **M10 — S2 and S3 done, and the editor edits geometry (2026-07-23).** A rectangle's `width` can be
  dragged. The shape registry (`svgShapes`) is a plain array of one cell per tag — `shapePoints`,
  `shapePath`, `shapeRect`, `shapeCircle`, `shapeEllipse`, `shapeLine` — each answering four
  questions about one family of elements: can the lens read this one (`reads`), where are its
  handles, what does dragging one write (`writes`, now a list), and does it borrow the rotate stalk
  (`rotatable`). Every call site that used to branch on a tag or a mode now asks the registry:
  `handleEdit`, the focus, `toolMove`, `toolVertex`, `toolDraw`. Adding a tag is one cell and a line
  in `svgShapes`; `svgLens(node, {shapes})` replaces the set at a callsite.
  `test_shape_registry` is the new law, and it is three claims: resize agreement over 300 random
  rect/corner pairs (the registry and the gizmo must leave the same box), a handle put back where it
  was writes nothing, and a handle dragged somewhere ends up there. It was checked *against a
  deliberately broken copy* before being believed.
  **The interesting find was not in the new code.** Verifying G2 on the demo showed the house's
  handles drawn at the drawing's origin instead of on the house — and the same click on the
  pre-change build did the same thing, so it was pre-existing, not S3's. `overlay.alignTo` read the
  element's own `transform` *attribute*, so any shape inside a `<g transform="…">` — most of the
  demo — had its handles placed in the wrong space. It now divides two screen matrices, which is
  exactly "the target's user space, expressed in the root's". The instrument that would have caught
  it, `boxGap`, had been written and never asserted; T5 asserts it now, on an element inside a
  group, and the answer had been 150px.
  Two smaller decisions worth keeping: `writes` had to become a list before a rect could be one
  entry, and `edit` returning *only changed* attributes is what keeps T1 true edge by edge; and the
  corner-radius handle needed a drawn inset, because a truthful handle at `rx = 0` lands on the
  corner and steals it — the inset is subtracted back in `edit`, so it is a bijection rather than a
  lie.

- **M11 — S1 done, groups are things, and gap 0 is closed (2026-07-23).** `ctx.pick(e)` is the one
  hit contract: it takes the painted leaves `ctx.hit` returns, maps each through `scopedPath` at the
  current scope, dedupes and answers front to back. Everything that used to ask "what did I click"
  its own way now asks this — selection, the hover outline, the occlusion cycle, the marquee, and the
  new `toolScope`. `toolStructure`'s `e.target` is gone, which was the last second answer, and gap 0
  goes with it: a double-click on a stroke-only shape used to miss and drop a *new* shape on the
  canvas.
  Groups became things you can hold (G6). Click takes the outermost `<g>` you have not entered,
  double-click descends one level, Escape ascends — offered at the callsite between "abandon this
  gesture" and "leave this mode", so Escape stays one verb meaning the most local thing available.
  The scope is a path in `lensState`, so being inside a group survives the remount a commit causes.
  Two laws, one of each kind: **T10 hit agreement** in a browser — the outline and the selection must
  agree at every corpus point, a group is one thing until entered, and a stroke-only shape is not
  empty canvas — and `test_scoped_path` headless, which is where the policy's arithmetic lives. The
  headless one earned its keep immediately: a scope that had reached the element itself fell all the
  way back to the root, and the property found it on run 1 of a random path.

- **M12 — S7 done, the drawing zooms, and no tool knew about it (2026-07-23).** The view is
  `lensState.view` = `{k, x, y}`, applied by rewriting the root `viewBox` against a `baseBox()` read
  from the source, and re-applied after every put so a commit does not throw you back to 100%.
  `toolZoom` is the tenth tool — wheel about the pointer, middle-drag to pan — plus ⌘0 fit, ⌘1 100%
  and ⌘2 fit-selection at the callsite. `applyView` writes nothing at identity, so a notebook that
  never zooms is byte-identical to before.
  **The result worth recording is the one that took no work**: not one existing tool changed. P5 had
  already routed every measurement through `ctx`, and `getScreenCTM` absorbs the viewBox, so no tool
  ever sees the scale factor. That was measured rather than assumed — at `k = 2.5` the CTM ratio is
  exactly 2.5, and a corner drag commits the same numbers as at 1.
  **T11** states it as a law, and stating it precisely was the whole exercise. Its first draft failed
  twice, and both failures were worth more than a pass: the first because the zoomed view put the
  drag target off-screen so *neither* arm committed anything — a law that compares two empty results
  passes vacuously, which is why both arms now assert they committed; the second because with
  snapping on the two zooms genuinely disagree (`translate(15 10)` vs `translate(12 10)`), since
  `snapRects` measures magnetism in **screen** pixels. That is correct behaviour — you snap to what
  looks close — so the law gained the qualifier rather than the product losing the affordance. With
  snapping off both zooms commit `translate(12 8)`, byte for byte.
  All ten browser laws and 54 headless tests green.

- **M13 — S4 done, the selection has verbs, and the fifth registry exists (2026-07-23).** A *command*
  is a verb that acts on the selection rather than on the pointer, and it is the same kind of object a
  tool is: `plan(env)` returns deltas. That one decision is what kept the write path single — group,
  duplicate, paste, cut and align all land in `commitDelta`, so they inherited the laws instead of
  needing new ones — and it is what let align be tested with no browser, since `env` is data. Two new
  delta kinds carry what a source edit cannot: `clip` (the clipboard is not the document) and a
  `select` on `command` (the addresses a command names only exist once the edit has happened).
  Fifteen entries: group, ungroup, duplicate, copy, cut, paste, paste-in-place, six aligns, two
  distributes. The demo's command bar is *generated* from the registry — labels, bindings, and
  enabled-ness straight from `canCommand`, which is the plan itself, so a greyed-out button and a
  refusal to run cannot disagree. Closes C7, P8, G15–G18, and unblocks G8 and G14.
  **What the property tests found, all of it about residue**, and none of it visible by reading:
  grouping dropped the comment above an element, because `childrenLens` deliberately gives a *new*
  child indentation but never a whole gap — right for an element arriving from nowhere, wrong for one
  that is merely moving one level down; and both group and ungroup re-indented the *inside* of a
  multi-line element, rewriting the author's own bytes. Both are fixed by the same rule: indentation
  lives in the gaps, the child's text is the child's. A third finding was not a bug at all — grouping
  non-adjacent siblings *must* bring them together, so the round-trip law is the identity only for a
  contiguous selection, and says so.
  Align and distribute are the interesting non-structural case: they are the move tool's write aimed
  by arithmetic, so G18's falsifier holds by the skip rule rather than by a special case. 60 headless
  tests and all 10 browser laws green, with a fifth registry installed — which is T6 doing its job.

- **M14 — G19, the pen draws curves (2026-07-23).** The largest single gap between this pen and a
  usable one, and it cost one function. `penPath.curveTo(d, out, in, x, y)` is written in terms of the
  two anchors' *handles* rather than in terms of what kind of segment this is, and `mirror(p, q)` is
  the symmetry that makes the curve smooth. Because a handle on its own anchor means no curvature
  there, click-after-drag, drag-after-click and click-after-click are the same expression with
  different arguments — there is no case analysis in the tool at all, and the law samples a
  handle-less cubic to show it really is its own chord. Verified with a real browser drag, not by
  reading: `M 20 20 C 40 20 60 60 60 60 C 60 60 90 30 100 20`.

- **M15 — P7, a vertex is a thing you can hold (2026-07-23).** `focus` has addressed elements by path
  rather than by index since M0, because an index does not survive a structural edit. A vertex had the
  same problem and no answer at all: it was named by a handle key living in one tool's gesture
  scratch, which is why every remaining path gesture (G20–G23) was blocked behind this.
  The finding is *what* the stable name is. Storing the handle key fails — a key is a position in the
  attribute's microsyntax, and splitting a path segment can turn one command into two and shift every
  `ci` after it. An **ordinal within a kind** (`0/3#a2`) renumbers predictably, so the key stays
  transient and the ordinal is stored, rebased and restored. The edit declares how it renumbers, the
  way an element command declares its `rebase`.
  One bug found by looking rather than reasoning: restoring the selection after a remount read
  `s.verts` *after* `focus.setAll` had already repainted — and the repaint announces, and the
  announcement wrote the still-empty vertex selection back over the one being restored. Both are read
  before either is restored now.
  `test_rebase_vertex` is T7 one level down, checked with coordinates as ground truth the way
  `test_rebasePath` uses bytes. 58 headless tests, 10 browser laws.

- **M16 — G20 and G23, what P7 was blocking (2026-07-23).** Both fell out in an afternoon, which is
  the point: the expensive part was naming a vertex, not using one.
  G20 is the difference between a pen and a line tool — a click on an open path's free end continues
  that path. The part worth recording is that picking the end up **writes nothing**: it is a `select`
  delta, so there is no edit to be identity-preserving about, and the first byte written is the one
  the user's *next* click asks for. Extending backwards is deliberately not offered, because
  reversing `d` rewrites an attribute the gesture is not otherwise touching.
  G23 arrived as two *commands* rather than two gestures, which was not the plan and is better: with
  P7 in place, "the vertex you are holding" is data an `env` can carry, so `delete-vertex` is planned
  headless like every other command. Delete now means the *finer* selection — a held vertex if there
  is one, the element otherwise — and it is `canCommand` that decides, so the key and a greyed-out
  menu item cannot disagree. Three declines rather than guesses: two elements at once, a polygon left
  with one point, and a path's `M` anchor, which terminates no segment.
  One test artefact worth remembering over any product finding: the first browser run reported
  `open-path` doing nothing, and it was a stale QA session — a browser left open from an earlier
  sitting, still holding the *previous* module. The channel had happily evaluated against it. The
  check that settled it was reading `typeof toolPen.freeEnd` in the page: `undefined` is not a
  product bug, it is the wrong page. Close every session before believing a browser result.
  18 commands in the registry, 58 headless tests, 10 browser laws.

- **M17 — G21, and the bug it walked into (2026-07-23).** Smooth-versus-corner is the first gesture
  whose *state* is a question, and the answer was to refuse the question: smoothness is read off the
  geometry — two handles collinear with their anchor — rather than kept in a flag. That is the same
  trade the rest of the editor makes (the drawing is the state), and it has a stated cost: "make
  corner" must be visible, so it retracts the handles rather than merely decoupling them.
  Promotion and demotion are what make it byte-honest: smoothing a straight join writes `C p0 p3 p3`,
  the cubic that draws the identical chord, and retracting spells it `L` again — so smooth-then-corner
  hands back the author's original commands. That round trip is the property test.
  **The find of the session was an accident.** A browser check needed an undo in the middle, and the
  drag afterwards did nothing: undo had silently dropped the selection. The cause is one line in
  `svgFocus.paint`, and it is the same shape as the P7 restore bug — *a dead node writing shared
  state*. After a commit the old node is detached, its `target.doc()` returns null, every selected
  path fails to resolve, and its last repaint filtered them all away and announced that emptiness
  into `lensState`, on top of what the new node had just restored. Nothing looked wrong, because the
  new node's own copy was still correct; the damage only surfaced at the *next* read of the shared
  state, which is undo. The fix is to distinguish the two ways an address can fail to resolve: "I
  cannot see the document" is not "the element is gone", so paint now draws nothing and drops
  nothing. Undo keeps the selection, its handles, and the ability to carry on dragging.
  59 headless tests, 10 browser laws, 19 commands.

- **M18 — the flash after a zoom, and what it is honest to claim (2026-07-23).** Tom's second report
  named the mechanism precisely — *"after zooming, the gesture after that momentarily displays the
  unzoomed size"* — and it is a consequence of a decision this document is otherwise happy with: the
  zoom deliberately lives outside the source, so it has to be *re-applied* to every node the runtime
  mints, and a fresh node cannot yet resolve the `Variable` its view is filed under. The restore was
  therefore deferred, and it was deferred to a macrotask, which the browser may separate from the
  node's insertion by a rendered frame. `requestAnimationFrame` cannot be so separated: it runs
  before the paint of its own frame. The timeout stays for the tab that never paints.
  **The part worth recording is what could not be shown.** Four instrumented attempts — a
  MutationObserver across frame boundaries, a per-frame census of overlay handles, a per-frame
  shape-versus-overlay comparison, and a per-frame `viewBox` census on the real drawing cell — never
  once caught the drawing painting at the wrong view: 143 frames across three commits at `k = 2.5`,
  zero bad frames, *before* the change as well as after. So this is a window closed by reading, not a
  bug caught in the act, and B2 says so rather than claiming a fix. What went into the document
  instead is a recorder Tom can leave running during ordinary use, which reports any frame painted at
  a view nobody asked for. A defect that only a person has seen is not fixed until that person stops
  seeing it.

- **M19 — the number that named the line (2026-07-23).** B2 was three sessions of not being able to
  reproduce what Tom could see every day. What closed it was not a better experiment; it was one line
  of his console. `2.0107 2.0107` — a *square* window over a drawing that is not square, and `2.0107`
  is `1/k`. There is exactly one square in the codebase, `baseBox()`'s `{width: 1, height: 1}` last
  resort, and exactly one way to reach it: `target.doc()` returned null. From there the fix wrote
  itself, and it is the rule M17 had already found one layer down — *a node that cannot read its
  source must not be written to*. `restoreView` was the visible half: it read "I cannot see the
  document" as "the document has no viewBox" and removed the attribute, which is 1:1 user units,
  which is the unzoomed size, which is the report word for word.
  Three bugs in two days with one cause — a commit mints a new node and briefly there are two — is
  no longer a series of accidents, and the defensive fix has now been written three times. Tom's
  suggestion in the same breath is the structural answer and is filed as **S11**: an Observable cell
  is invoked with `this` bound to its previous value, so the cell can hand its old node back and
  `svgLens` can keep rendering into the node it already owns. The guards stay regardless — they are
  correct, and cheap — but S11 is what stops the fourth one being written.
  59 headless tests, 10 browser laws, 19 commands.

- **M20 — the fix that was not the bug, and the one that was (2026-07-23).** M19 closed B2 on a
  console line, and the line was real: a detached node *was* writing a 1×1-based `viewBox`. It was
  not what Tom could see. He said so — *"did you fix it? It's still doing it"* — and sent a screen
  recording, which is the first artefact in this whole episode that could be **measured** rather than
  reasoned about. One frame in 23 differs. The circle is a ruler: 190 px across where it is normally
  72, so 3.958 px/unit against 1.500, so a 320-unit window where the view asked for 845. 320 is the
  source's own `viewBox`. The flash is not a wrong view, it is **no view**, on the node the commit
  just minted.
  That reading also convicts the previous session's reasoning. `requestAnimationFrame` promises only
  "before the paint of the frame it is scheduled for" — if the recompute lands after that frame's
  callbacks have run, the restore is a frame late, and the frame between is the flash. M18 called
  that a closed window. It was a narrowed race.
  **What actually closes it is a change of question**: not *how soon can the new node learn its
  view*, but *who already knows it*. The outgoing node does, and it can see itself being replaced.
  A MutationObserver on its own parent fires in the microtask checkpoint of the task that does the
  swap — before that frame's rendering steps, which is the guarantee rAF cannot give — and it names
  the heir positionally, so nothing has to guess a `Variable`. Verified at the swap: the heir already
  carries the zoomed `viewBox` before it has ever been painted.
  Three things worth keeping. **A user saying "it's still doing it" is data, and it outranks a green
  instrumented run** — five of mine were green, including two after the first fix. **A video is a
  measurement**, if you stop watching it and take a ruler to it; the circle's radius settled in one
  step what three sessions of hypotheses had not. And **the first fix was still worth landing**: it
  is what keeps the outgoing node's `viewBox` intact long enough to be handed over. It was a correct
  fix to a different bug, which is not the same thing as a wasted one.
  59 headless tests, 10 browser laws, 19 commands.

## 8. Open questions

- Does the value stay the DOM node, or become a document object with the node as a projection?
  Keeping the node is what makes `svgLens(svg\`…\`)` read naturally. Resolved in M7: the node is
  replaced on every commit and nothing depends on its identity. **Reopened 2026-07-23** — three bugs
  (P7's restore, M17's undo, M18/B2's flash) turned out to depend on it after all, not on the node's
  identity being *stable* but on there being, for a window, *two* of them. See S11.
- Structural path vs an injected stable id attribute. Paths keep the source clean but need
  re-anchoring on every command; ids survive edits but pollute the drawing the user is authoring.
- Whether `childrenLens` should view child *source strings* (residue-preserving, chosen above) or
  parsed nodes (nicer commands, loses formatting). Probably strings at L2, nodes at L3.

## 9. Consistency and refactoring: the work from here

Feature-building is done (see the 2026-07-24 status). This is the standing backlog, and it has three
kinds of entry matching the three pillars: **consistency** (one way to do each thing), **usefulness**
(the features that exist made to carry their weight), and **refactoring** (code health, no behaviour
change). Nothing here adds a capability. Each item is falsified the same way the gaps were — by a
concrete before/after — and every change keeps the 59 laws green as the regression gate, which is what
makes "refactor only" safe.

The findings below were spotted by reading; they are **not** trusted to be complete. The method for
finding the rest was a full census: **`knowledge/svg-lens-cell-inventory.md`** has one row per cell
(all 341, LOC/CC and *user job* + *how* filled), then the `user` column cross-referenced for overlaps.

**Census complete 2026-07-24** (20-agent workflow over the census). It confirmed the fill overlap and
found five more; the ranked dedupe queue lives in the inventory doc.

**Dedupe done 2026-07-24: 5 of 6 refactored, #6 declined.** Every change kept the 59 laws + 6 bundle
invariants green and was live-verified in a real runtime. The shared logic now lives in two new cells,
`defsCommand` (`_sl300`) and `pasteInto` (`_sl301`). Line count is roughly flat — the census's "LOC"
summed whole cells, not the removable portion; the win is one implementation per job.

1. **`inspector` + `fieldPanel`** — ✅ **done.** `inspector` hides registry-owned properties (paint lives only in `fieldPanel`) and writes through `node.setProperty`; `node.setAttr` **removed**. One paint surface, one write path.
2. **`toolStructure` + `cmdDeleteVertex`** — ✅ **done.** The dbl-click handler resolves the clicked handle to a vertex ordinal and dispatches `cmdDeleteVertex.plan(env)`; the delta-construction is gone from `toolStructure`. One implementation, two triggers.
3. **`putTable` + `lawBadges` + `sinkRecord` + `edits` + `putLog`** — ✅ **done.** `putTable` reads the shared `putLog` (dropping its own duplicate listener), matching `sinkRecord`; `lawBadges` was already the shared component.
4. **`cmdAddGradient` + `cmdAddMarker`** — ✅ **done.** Extracted `defsCommand` factory; both commands are thin `{tags, sourceAttr, targetAttr, prefix, markup}` callers.
5. **`cmdDuplicate` + `cmdPaste`** — ✅ **done.** Extracted `pasteInto(id, parent, markups, at, d)`; both commands call it.
6. **`nearestSegment` + `nearestPathSegment`** — ⛔ **declined (false positive).** Exact perpendicular projection (a test asserts `distance === 1`) vs sampled Bézier curves — zero shared code; merging would break exactness or add an adapter longer than either. Kept split by design.

The findings below (spotted before the census) are subsumed by #1–#3 above and kept for the record.

### 9.1 Consistency (one way to do each thing)

- **Two places to set the fill (and stroke).** ✅ **Resolved 2026-07-24.** `inspector` now hides any
  attribute the `svgFields` registry owns (fill, stroke, stroke-width, opacity, dash…) — it keeps
  geometry / id / transform / custom attributes — so paint is set in exactly one place, `fieldPanel`.
  *(Original finding: both panels showed `fill`/`stroke` and could leave a shape in two states, the
  inspector silently creating a losing `fill` attribute behind a `style` fill.)*
- **`setAttr` vs `setField` — two write methods for one job.** ✅ **Resolved 2026-07-24.** `node.setAttr`
  is **removed**; the inspector (its only caller) now writes through `node.setProperty`, which is
  style-aware — where a `style="fill:…"` declaration exists it updates that declaration instead of
  writing a losing attribute. For any attribute *not* shadowed by a `style` entry `setProperty`
  produces byte-identical output to the old `setAttr`, so geometry/transform edits are unchanged. One
  write path across every surface (delta / `setField` / `setProperty`).
- **One operation, several surfaces, no stated rule.** Stroke-width is on the field panel *and* the
  ≡ chip; duplicate is ⌘D *and* the ⧉ chip; swap-paint and gradient/marker are chips only;
  align/distribute are keyboardless commands only. The *mechanism* is uniform (all one write path —
  that is the achievement); the *placement* is ad-hoc. Write the placement rule down the way §6.1
  wrote down competence: a **chip** is a spatial/on-canvas action, a **panel row** is a value you
  type, a **command/key** is a verb over a selection — then make the surfaces match it, and let a
  surface be a pure projection of "which operations qualify," not a hand-curated list.
- **The two panels stack under the drawing** with overlapping legends. Once the fill duplication is
  resolved, decide whether inspector + fieldPanel are one panel with sections or a disclosure/tab
  surface, so a selection presents *one* editor.

### 9.2 Usefulness (the features made to carry their weight)

- **Heterogeneous multi-selection.** `fieldPanel` reads `fields(paths[0])` — it shows the *first*
  element's values and writes to all, so a mixed selection shows a misleading value. Show a
  mixed-state marker (blank / "—") when selected values differ, and only overwrite the ones the user
  actually changes.
- **Reachability parity.** The chips have no keys; the keyed commands (align/distribute) have no chip
  or menu. Round this out so every operation is reachable both ways, or state why an operation is
  deliberately one-surface-only.
- **Gradient/marker follow-through.** `cmdAddGradient`/`cmdAddMarker` create a default and stop;
  editing the stops or endpoints means selecting the `<defs>` child by hand. The deferred G35 on-canvas
  gizmo would make the feature useful and is refactoring-adjacent — it reuses the delta path and adds
  no new write mechanism.

### 9.3 Refactoring (no behaviour change)

- **`svgLens` is the monolith §2.4 warned about, now worse:** MI 0, 527 LOC, cyclomatic 197, 36 inputs
  (`tools/code-metrics-cli.ts`, 2026-07-24). It owns `affContext`, `commandEnv`, the whole `node.*`
  method surface, the writer wiring and the ctx facade. Extract the cohesive pieces it already names —
  `affContext`, `commandEnv`/`commandPlan`, the `node.*` command methods — into their own cells, the
  way the tools and commands were extracted from it earlier. Target: no cell over ~150 LOC.
- **The next low-MI cells, in order:** `svgWriter` (15), `svgFocus` (18), `toolVertex` (18),
  `pathSmooth` (18), `toolbar` (20), `toolMove` (20), `toolPen` (21). Each is a state machine or wiring
  cell that has accreted; the delta framework now gives most of them a smaller shape than they still
  use (e.g. a tool that still threads `ctx.state.drag` by hand can often hand a `gestureDelta` instead).
- **Density vs debt.** 215 of 341 cells score MI < 65 — partly the prose density the paper wants, but
  the *tool and command* cells specifically should come down now that `gestureDelta` carries what they
  used to inline. Don't flatten the lens cells for a number's sake.
- **Dead-code sweep.** Confirm nothing still calls the pre-delta positional
  `writer.commit(idx, name, value, …)` signature, and that the revived `attr`/`child`/`nodeEq` tree
  lenses (§2.3) are all reachable — remove any that are not.
