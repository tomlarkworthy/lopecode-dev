# `@tomlarkworthy/annotations` — standalone arrow annotations

An overlay layer of repositionable arrows with text boxes, anchored to whatever is
under the arrow tip. Standalone: imports nothing from lopepage-2, editor-5,
plugin-registry or robocoop. Consumers subscribe to it, never the reverse.

## Public surface

Three exports, nothing else.

| Export | Type | Role |
|---|---|---|
| `viewof annotations` | `Inputs.input([])` | The reactive list. Subscribe to this. |
| `viewof annotationsEnabled` | boolean input | Global off switch. |
| `annotationLayer` | element | The overlay. Mounts to `document.body`. |

Importers drive the toggle the standard way — an imported `viewof` is read-only as a
variable, but the element is not:

```js
enabledEl.value = false;
enabledEl.dispatchEvent(new Event("input", { bubbles: true }));
```

So the burger-menu item lives in the editor plugin repo and imports
`viewof annotationsEnabled` from here. Dependency points one way.

## Data model

```js
{
  id: "ann_…",                       // id-keyed, race-safe array updates
  tip: {
    module: "@tomlarkworthy/foo",    // from .lp2-pane[data-module], or null
    cell:   "renderTree",            // from .observablehq[cell], or null
    path:   "div > p:nth-child(3)",  // CSS path within the cell node, optional
    nx: 0.42, ny: 0.61,              // normalized position in the anchor's box
    cellHash: "…"                    // staleness marker, see below
  },
  box: { dx: 120, dy: -60, w: 220 }, // viewport-px offset from the resolved tip
  text: "should be clamped",
  author, createdAt,
  state: "open" | "resolved",
  color
}
```

Everything in `tip` is read out of the DOM. No runtime imports, no private APIs.
If neither a pane nor a cell node is found, `module`/`cell` are null and the fraction
is taken against `document.body` — free positioning still works, it is just the
weakest rung of the ladder.

**Resolution ladder**, coarse → fine, stop at the first hit:

1. `.lp2-pane[data-module="M"]` → else `document`
2. `.observablehq[cell="C"]` within it → else the pane itself
3. `path` within the cell node → else the cell node
4. `(nx, ny)` fraction of the resolved element's bounding box

An annotation that only resolves to rung 1 or 2 still points at the right cell; it
just loses sub-cell precision. Nothing is ever dropped — a tip that resolves to
nothing goes to `state: "orphaned"` and lands in a bin, it is not deleted.

`cellHash` is `persistentId`'s hash (`name + definition source`) captured at creation.
We do **not** import `persistentId` — we read `node.getAttribute('cell')` and hash the
node's own text. Its only job is to grey out an annotation whose cell has changed
since it was written.

## Overlay geometry

One `position:fixed; inset:0; pointer-events:none` root on `document.body`, holding:

- one `<svg>` for the arrows, in **viewport** coordinates
- absolutely-positioned `<div>` boxes with `pointer-events:auto`

Per update, for each annotation: resolve the anchor element, take
`getBoundingClientRect()`, tip is `left + nx*width`, `top + ny*height`. Box goes at
`tip + (dx, dy)`. Because both live in viewport space and `dx/dy` is an offset from
the tip, the box travels with its anchor on scroll — that is what makes it read as
attached rather than pinned to the screen.

This is the two-coordinate-space trap from svg-lens: the layer is viewport space, the
anchors are element space. Convert once per update, never store viewport coords.

**Update triggers**, all coalesced into a single rAF:

- `scroll` with `capture: true` — lopepage-2 panes scroll independently, so a
  document-level bubble listener will not see them
- `resize`
- `ResizeObserver` on each resolved anchor element
- `MutationObserver` on the panes, for re-render

rAF is right here — this is paint-following, not the state-handover case where it
lands a frame late.

**Culling:** skip annotations whose anchor is `!isConnected` or `!offsetParent`, and
clip to the owning pane's rect so a box does not float over a neighbouring pane when
its anchor is scrolled out of view.

## Interaction

- **Drag box body** → updates `box.dx/dy`.
- **Drag tip handle** → `document.elementFromPoint` (the layer is already
  `pointer-events:none` apart from boxes, so the hit-test sees through it) → walk up
  to the nearest `.observablehq[cell]` → recompute `module/cell/nx/ny`.
- **Create** → an armed one-shot: a small floating "+" arms placement, the next click
  places, then it disarms. Not a bare click-on-empty-space handler — that swallows
  every select and click in the notebook underneath.
- Both drags commit by replacing the array id-keyed and dispatching `input` on
  `viewof annotations`.

Arrow is drawn box-edge → tip: intersect the tip→box-centre line with the box rect for
the exit point, a shallow quadratic reads better than a straight line, arrowhead as an
inline polygon.

## Off switch

`annotationsEnabled === false` tears the layer down through `invalidation` — listeners
removed, observers disconnected, children emptied. Not `display:none`. Zero cost and
no pointer interference when off, and re-enabling rebuilds from `annotations`, which
is untouched state.

## Persistence — `@tomlarkworthy/annotations-persistence`

A **separate module**, so annotations itself stays storage-free. It depends on
annotations; annotations does not know it exists. Three cells:

- `annotationsPersistence` — `{KEY, ATTACHMENT, load, save, forget}` helpers.
- `annotationsRestored` — boot-time restore, once, never clobbering a non-empty set.
- `annotationsAutosave` — depends on the `annotations` **value**, so it re-runs on every
  change and mirrors out. Depends on `annotationsRestored` purely for ordering.

`load()` tries two sources in order: a baked `annotations.json` file attachment, then
localStorage keyed by notebook path. Restore uses `annotationStore.replaceAll(list)` —
added to the core module so persistence never needs the `viewof` element (which also
sidesteps the editor-5 viewof-import mangling hazard).

**localStorage is verified end to end. The baked-attachment path is read-only so far:**
`load()` will pick up an `annotations.json` block if one is present, but nothing writes
one yet. Baking on save-in-place is the next step and is unverified — `exportToHTML`
hangs on this notebook, so the round-trip could not be exercised.

## Still out of scope

- **The menu item.** Editor plugin repo — it imports `viewof annotationsEnabled`.
- **Agent consumption.** `get_variable @tomlarkworthy/annotations annotations` already
  works over the channel with no new tooling.
- **atproto-backed annotations**, so someone can annotate a notebook they can't write to.

## Build order

All five steps **done and verified**. Both modules live in
`lopebooks/notebooks/@tomlarkworthy_annotations.html`.

| Suite | Covers | Result |
|---|---|---|
| `tools/test-annotations-gestures.js` | armed creation, box drag, tip re-anchor, text, delete — **real Playwright mouse input** | 13/13 |
| `tools/test-annotations-persistence.js` | localStorage round-trip across a genuine `page.reload()` | 14/14 |

Also verified by driving the runtime directly: `describe` → `resolve` round-trips to
the same viewport pixel; all four rungs degrade without throwing (bad path → `cell` +
`degraded`, bad cell → `pane`, bad module → `page`, null tip → `null`); toggling
`annotationsEnabled` off removes the layer and back on rebuilds exactly one root.

### Bugs the tests actually caught

- **`Inputs.input()`'s value setter does not dispatch.** The store committed correctly
  and `view.value` was right, but no subscriber ever woke, so the overlay stayed empty
  while the data was perfect. Every commit now dispatches an explicit `input` event.
- **`render()` → MutationObserver → `render()` infinite loop.** The status line lives in
  the pane, so writing it unconditionally was a mutation the observer fed straight back.
  Fixed by ignoring records inside the layer root and only writing status on change.
- **rAF is throttled while the tab is backgrounded**, which froze the overlay. `schedule()`
  now races a rAF against a 250ms macrotask.
- **`page.goto()` to a URL differing only in the hash is not a reload.** The first
  persistence run passed on stale in-memory state. Real `page.reload()` plus a tripwire
  assertion now.

### Build-loop notes

- `export_module` (and any `exportToHTML`) **hangs** on a blank-notebook-derived file —
  it serializes all ~58 modules. Use exporter-3's `exportModuleJS(moduleId)` instead;
  it does one module in milliseconds.
- `eval_code` elides long strings in its result, so a module body cannot be read out
  through it at any chunk size. Transfer by `fetch`-POSTing from the page to a
  throwaway local Bun server, then splice into the HTML.
- lopepage-2's pane visualizer snapshots a module's variable list at mount, so cells
  added live via `define_cell` do not appear until the module is persisted and
  reloaded. Force computation with `runtime.mains.get(name).value(cell)` to test
  without a reload.

## Open gaps

- Annotation whose pane is not in the current layout: currently culled silently. Needs
  an off-screen count badge or it looks like data loss.
- Text-quote selector for prose (rung 3.5) — deferred; `path` + fraction covers most
  cases and does not need re-anchoring logic.
- Two annotations on the same anchor will overlap; no collision layout yet.
