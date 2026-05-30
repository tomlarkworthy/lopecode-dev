# lopepage-2 design

Goal: replace lopepage's GoldenLayout + scroll scar-tissue with a smaller, readable, reliable
layout engine that owns its DOM. Panes are created once and never destroyed on a URL change —
only moved / shown / hidden / resized — so `scrollTop` persists for free. Persistent cell ids
(`variable.pid`) give content-relative scroll anchoring for the one case that remains: content
that resizes after load.

## Why the old one is complex

- GoldenLayout destroys/recreates container DOM on view change → `scrollTop` lost.
- Scroll cache keyed by **module name + pixel scrollTop** → meaningless after relayout/resize.
- `fix_scroll` 6-frame rAF retry loop + `__reflowUntil` timer + multi-pass resize restore =
  polling that fights the browser's own scroll anchoring (every programmatic `scrollTop=` write
  cancels the browser's anchor selection).
- ~50% of the module is GL glue + scroll preservation + URL sync.

## Core principles

1. **Own the DOM.** No GL. Layout is a plain DOM tree we reconcile against a layout model.
2. **Panes are immortal.** One scroll-container `<div>` per pane, cached by stable key. Layout
   changes reparent / reorder / hide it; never recreate it. → scroll survives layout + URL changes
   with zero code.
3. **Anchor by pid, not pixels.** For content-load reflow we keep the cell the user is looking at
   pinned. `overflow-anchor: auto` is the baseline; a single `ResizeObserver` per pane corrects
   the chosen anchor when needed. No rAF loop, no timers.

## Data model

```
LayoutNode =
  | { t:'row',   sizes:[..fr], children:[LayoutNode] }   // horizontal split (R)
  | { t:'col',   sizes:[..fr], children:[LayoutNode] }   // vertical split   (C)
  | { t:'stack', active:int,   tabs:[Leaf] }             // tabbed pane      (S)
Leaf = { module:'@user/mod', cell?:pid }                 // cell = deep-link anchor pid
```

Single reactive `viewof layoutModel = Inputs.input(tree)`. URL `#view=` <-> tree via the existing
`parseViewDSL` / `serializeGoldenDSL` (adapted to this shape — they already speak R/S/C + weights).
The DSL `open=@mod#cell` deep-link sets a leaf's `cell` to a pid.

## Modules / cells (build order)

1. **paneRegistry** — `Map<key, {el, viz, anchor}>`. `getPane(moduleName)` lazily builds a scroll
   `<div>` containing the cached `visualizer(runtime,{module})` node; returns the immortal element.
2. **layout render** — pure reconcile `LayoutNode -> DOM`. Rows/cols = flexbox with `flex-basis`
   from `sizes`; splitter `<div>`s between children adjust sizes (pointer drag) → write back to
   model → URL. Stacks = tab header + show active pane (`display:none` the rest; Chrome retains
   scrollTop across `display:none`).
3. **scroll anchoring** —
   - visualizer change: tag each cell node with `pid` (see below).
   - on scroll (rAF-debounced): anchor = topmost cell whose bottom > container top;
     store `{pid, offset: scrollTop - node.offsetTop}` on the pane.
   - `ResizeObserver` on content root: if change not user-driven, set
     `scrollTop = nodeByPid(pid).offsetTop + offset` once. Pins the anchor through reflow.
   - deep-link: `open=@mod#pid` scrolls that pid to top once on mount.
4. **tabs** — header chips, click → set active, drag chip to reorder / move between stacks.
5. **drag-rearrange** — pointer-drag a tab; drop zones split a pane (left/right/top/bottom) or
   merge into a stack. Mutates model → re-render (panes survive).
6. **drag-out-to-.js** — reuse existing grip: `dragstart` writes the module `.js` source as a file
   to `DataTransfer` (`application/javascript`), filename = module name.

## Visualizer change (minimal)

`@tomlarkworthy/visualizer` `inspectors` cell currently sets `node.setAttribute('cell', v._name)`.
Add `node.setAttribute('pid', persistentId(v))` (from `@tomlarkworthy/runtime-sdk`). `persistentId`
computes from name+definition, no value needed, safe at inspector-creation time. This is the only
edit outside the new module. (Prototype may fork visualizer as `visualizer-2` to avoid touching the
shared module until proven.)

## pid caveat

`pid = hash(name + definition)`, so editing a cell changes its pid. Irrelevant for anchoring: the
anchor is whatever sits at the viewport top (rarely the cell being edited), and content-load
reflows don't change definitions. Restore falls back to nearest surviving pid if an anchor's pid
vanished.

## Out of scope for first prototype

Popout windows (GL never had them here either). Mobile-keyboard resize special-casing (the immortal
-pane model should make it moot). Command palette and other lopepage features are inherited from the
forked notebook and left untouched.
