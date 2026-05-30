# lopepage-2 design

A layout engine for lopecode notebooks. It tiles modules into resizable splits and tabbed
stacks, serialises the layout to the URL hash, and preserves scroll position across layout
changes. It owns its DOM directly.

## Core principles

1. **Own the DOM.** Layout is a plain DOM tree reconciled against a layout model.
2. **Panes are immortal.** One scroll-container `<div>` per module, cached by name. Layout
   changes reparent / reorder / hide it; it is never recreated. `scrollTop` is retained across
   layout and URL changes.
3. **Anchor by pid.** When content resizes after load, the cell at the viewport top is held in
   place by its persistent id. A `ResizeObserver` re-applies the anchor; the correction lands in
   the same frame.

## Data model

```
LayoutNode =
  | { t:'row',   sizes:[..%], children:[LayoutNode] }   // horizontal split (R)
  | { t:'col',   sizes:[..%], children:[LayoutNode] }   // vertical split   (C)
  | { t:'stack', active:int,  tabs:[Leaf] }             // tabbed pane      (S)
Leaf = { module:'@user/mod', cell?:pid }                // cell = deep-link anchor pid
```

There is always exactly one root node. `sizes` are percentages summing to 100, one per child;
`active` indexes `tabs`. `viewof lp2Model = Inputs.input(tree)` holds it as reactive state.
`lp2_parseDSL` / `lp2_serializeDSL` convert the tree to and from the `#view=` `R`/`S`/`C`
weighted DSL — the grammar shared with the rest of lopecode — so a layout is fully described by
its URL. `open=@mod#cell` sets a leaf's `cell` to a deep-link pid.

## Cells

1. **lp2_paneRegistry / lp2_getPane** — `Map<module, {el, …}>`. `getPane(name)` builds a scroll
   `<div>` hosting the cached `visualizer(runtime,{module})` node on first request and returns the
   same element thereafter. `lp2_moduleByName` resolves a name to its runtime module via
   `currentModules`.
2. **lp2_renderNode / lp2_view** — `renderNode` reconciles `LayoutNode -> DOM`: rows/cols are
   flexbox with draggable splitters that write percentages to `node.sizes`; stacks are a tab header
   plus the active pane (others `display:none`, which retains their `scrollTop`). `lp2_view` runs the
   render with scroll capture/restore and exposes `commit(newRoot)`, which republishes the model
   through the `lp2Model` viewof, so a structural change re-renders and round-trips to the URL on one
   path.
3. **lp2_anchor / lp2_installAnchor** — anchor = `{pid, offset}` for the cell at the viewport top,
   `pid = persistentId(node.variable)`. `installAnchor` re-applies it on each `ResizeObserver`
   callback.
4. **lp2_ops** — pure tree operations (`findHost`, `removeLeaf`, `dropBeside`, `normalize`, `move`).
   `normalize` collapses emptied stacks and single-child splits.
5. **lp2_dragOut** — writes the module `.js` source to the drag `DataTransfer`
   (`application/javascript` + `DownloadURL`), filename derived from the module name.
6. **lp2_hash / lp2_setHash / lp2_syncFromUrl / lp2_syncToUrl** — URL ownership (see below).
7. **lp2_page / lp2_background_jobs / lp2_append_to_body** — page mount, theme, orthogonal
   features (see below).

## Docking

A tab is `draggable`. On `dragstart` it sets `window.__lp2_drag = {module}` and calls `lp2_dragOut`.
Each stack body has a drop overlay: `dragover` highlights the region under the pointer — the inner
box is *centre* (merge into the stack), otherwise the nearest edge is *left/right/top/bottom* (split).
`drop` runs `lp2_ops.move(root, module, targetStack, side)` and commits. A drop outside the browser
receives the `.js` file instead.

## Scroll anchoring

A layout-only change reparents a pane without altering its content height, so capturing `scrollTop`
before the reparent and restoring it after is exact. Content that resizes after load (async cells,
images) is handled by the pid anchor: `lp2_installAnchor` attaches a `ResizeObserver` to the pane
content and sets `scrollTop = node.offsetTop + offset` on each callback. The observer fires after
layout and before paint, so the correction is same-frame. A programmatic `scrollTop` write disables
the browser's native `overflow-anchor`, so the anchor is maintained in JS.

## Hash ownership

`lp2_hash` observes `location.hash`. `lp2_syncFromUrl` parses it into the model on external change;
`lp2_syncToUrl` serialises the model back; `lp2_setHash` writes via `history.replaceState`
(no `hashchange`).

`view=` is the layout DSL and is lopepage-2's to own. `open=@mod[#cell]` is a one-shot intent:
`lp2_syncFromUrl` overlays the module into the first stack (merging into the live layout when there
is no `view=`, setting a leaf's deep-link `cell` when `#cell` is present), and `lp2_syncToUrl` drops
it once the layout reflects it. Invariants:

- `lp2_syncToUrl` writes only when the model round-trips:
  `serialize(parse(serialize(model))) === serialize(model)`.
- Writing is gated on `window.__lp2_owns_hash`, set only while lopepage-2 is the mounted page.
- Only `view=` and the intents it consumes (`open`) are managed; every other hash param (e.g.
  `cc=`) is preserved verbatim — a decoupled module cannot assume it owns them.
- `replaceState` is silent and the read path is driven by `hashchange`, so a write does not
  re-trigger a read.

## Page mount, theme, orthogonal features

`lp2_page` builds the fullscreen `#lopepage-2` container, adopts the `@tomlarkworthy/themes`
stylesheets via `apply_theme`, and appends the `@tomlarkworthy/command-palette` chrome
(`commandPaletteStyles` + the hidden `commandPaletteOverlay`) so ⌘K has a node to reveal.

Orthogonal features are composed by import, not added to `mains`. `lp2_background_jobs` holds bare
references to their main-loop cells so the runtime instantiates them while lopepage-2 is the page:
`commandPaletteKeybinding` (the ⌘K keydown listener) and `cc_chat` (which opens the
`@tomlarkworthy/claude-code-pairing` connection).

`lp2_append_to_body` is the keystone: reachable only when lopepage-2 is booted as a main, it appends
the page to `document.body`, references `lp2_background_jobs`, and sets `window.__lp2_owns_hash`.
With `bootconf.headless` set, the runtime observes this cell as the page's single output.

## Dependencies

- [`@tomlarkworthy/runtime-sdk`](https://observablehq.com/@tomlarkworthy/runtime-sdk) — `runtime`,
  `persistentId`.
- [`@tomlarkworthy/visualizer`](https://observablehq.com/@tomlarkworthy/visualizer) — cell rendering;
  every cell node carries a `.variable` backref used for pids.
- [`@tomlarkworthy/module-map`](https://observablehq.com/@tomlarkworthy/module-map) — `currentModules`.
- [`@tomlarkworthy/themes`](https://observablehq.com/@tomlarkworthy/themes) — `apply_theme`.
- [`@tomlarkworthy/command-palette`](https://observablehq.com/@tomlarkworthy/command-palette) —
  `commandPaletteStyles`, `commandPaletteOverlay`, `commandPaletteKeybinding` (⌘K).
- [`@tomlarkworthy/claude-code-pairing`](https://observablehq.com/@tomlarkworthy/claude-code-pairing)
  — `cc_chat`.
