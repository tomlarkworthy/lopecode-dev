# QA report: visualizer

**Date:** 2026-07-12
**Notebook:** lopecode/notebooks/@tomlarkworthy_visualizer.html
**URL hash:** `#view=S100(@tomlarkworthy/visualizer,@tomlarkworthy/module-selection)`
**Browser:** Playwright Chromium (headed, viewport 1280×800)

## Summary
Healthy infrastructure notebook. The headline feature — rendering another module's live cells into a div hosted *inside* the notebook — works cleanly on a fresh load (runtime-sdk's cells render into the yellow `.runtimeSdk` box). No errored cells, no console errors, and `syncers` converges under natural recompute (proper `invalidation`-driven teardown). Defects: (1) **confirmed, user-reported** — on rerender/second-view the *latest* visualizer fails to attach; DOM nodes stay stuck in the stale root (Issue 3, deterministic repro); (2) builtin import cells render with a garbage `from "<unknown 0.NNN>"` source; (3) prose claimed a minicell example that doesn't exist — **fixed this pass** (edited `modules/@tomlarkworthy/visualizer.js`, synced to the canonical HTML). No test cells.

## Criterion scoring

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Clear title | pass | H1 "Visualizer: Own Cell Renderer" at top, names the concept. |
| 2 | Explanation | pass | First paragraph explains the inversion (render cells into an in-notebook div) and honestly notes "on its own this notebook is not very useful. It lays a foundation." |
| 3 | Doc matches impl | **partial → fixed** | `_8` prose claimed a minicell example that didn't exist — reworded this pass to reference the external minicell notebook. Intro's "minimap, grid or both at the same time" is aspirational but framed as a capability, left as-is. |
| 4 | Does what it says | **partial** | The shipped example (single yellow box) works on fresh load. But the general feature degrades on rerender/second-view: the latest visualizer fails to attach nodes (Issue 3, confirmed). The headline single-view case is fine; the multi/rerender case is not. |
| 5 | Feature list | **partial** | Exports `visualizer`, `lopeviz_handle_css` documented. Gap: documented-but-missing minicell example. Several helper exports (`renderImportCell`, `createImportCellHeader`, `variablesForCell`, `TRACE_CELL`) are undocumented, but sit under the "Implementation" heading so are acceptable as internals. |
| 6 | Lean code | pass | Cells are load-bearing implementation; a couple of `---` separator markdown cells. `renderImportCell` is large but justified. No dead code found. |
| 7 | Scoped domain | pass | Single concern: inverted in-notebook cell rendering. |
| 8 | Claims tested | **fail** | No `test_*` cells and no asserted examples, despite testable claims (convergence, `detachNodes` node-stealing, ordering preserved on export). `@tomlarkworthy/tests` is loaded in the bundle but unused here. |
| 9 | Serialization | not exercised | `export_notebook` not run (would rewrite the canonical file). The "ordering preserved on export" claim was not verified. |
| 10 | Adversarial / try to break | **partial** | Rerender / second-view of a DOM-valued module leaves the latest root empty with nodes orphaned in the stale root (Issue 3, deterministic). Force-`value()` collapse (Issue 4) is a probe-only edge. |
| 11 | Clean console logs | pass | No `console.error`/`pageerror` on boot or during interaction. Only the known `@import`-in-constructed-stylesheet warning (red herring) and expected `.mov`/`blob:null` aborts. |
| 12 | Reusable, themed UI | pass | Rendering uses Observable's standard Inspector; `lopeviz_handle_css` uses `var(--code)`. The `background-color: yellow` is deliberate demo CSS illustrating the `classList` option, not a product-UI theme violation. Notebook has essentially no interactive controls. |
| 13 | Performance within budget | pass | Boots without stall; no rAF/`now` thrash. `syncers` does an O(cells) DOM reconcile per recompute — acceptable. Observer-helper churn is bounded under normal use (only streamed under my forced thrashing). |
| 14 | Responsive, visible feedback | pass | This is the notebook's thesis: rendered cells appear in place (the yellow box renders inline where the `visualizer()` call sits). |
| 15 | Dataflow rerunnability | pass | Natural rerun of `syncers` (3× re-dispatch of the `visualizers` input) left the DOM byte-identical (snapshot 64/44/6 rendered nodes unchanged, no new collapsed values). The `visualizer` factory tears down via `invalidation.then(() => { root.remove(); … })`. Caveat under Issue 3 is an observe()/inspector interaction, not the notebook's own dataflow. |
| 16 | No errored cells (force-computed) | pass | After force-computing every named cell (per-cell timeout), the steady-state `_error` scan was empty. The transient `syncers` throw during forcing was the reachable=`true` artifact and did not persist. |

## Issues found

### 1. Builtin imports render `from "<unknown 0.NNN>"` — severity: low — criterion: #4/#3
- **What:** In a rendered module, builtin import cells display as e.g. `import {md, Generators, Inputs, _, Mutable} from "<unknown 0.8323335195663429>"` — a meaningless random-number source. Reproduces on every fresh load (the number differs per boot, confirming it's an anonymous-module placeholder, not a probing artifact).
- **Where:** `@tomlarkworthy/visualizer._syncers` (import-cell branch) + `_renderImportCell`. Visible at the top of the yellow `.runtimeSdk` box.
- **Evidence:** The builtin-skip guard reads `if (ii.specifier === "builtin") continue;`, but builtin import cells have `ii.specifier === undefined` (the builtin marker lives in `cell.name === "module builtin"` / `ii.from` starting with `"<unknown"`). So the guard never fires and the garbage source string renders instead of being suppressed or labelled "Standard library".
- **Hypothesis:** Guard checks the wrong field. Fix: skip when `cell.name === "module builtin"` (or `String(ii.from).startsWith("<unknown")`), or render builtins as "Standard library".

### 2. Prose claims a minicell/minimap example that doesn't exist — severity: low-medium — criterion: #3/#5
- **What:** Cell `_8` ("Customizing the visual representation") states: *"In this notebook we also provide examples around the minicell, which renders just the variables's name, giving a minimap feel."* No such example exists — the only `visualizer()` invocation in the module (`_4`) uses the default inspector.
- **Where:** `@tomlarkworthy/visualizer._8` (prose) vs the module's cell list.
- **Evidence:** `grep visualizer\(` → one real call (default inspector) + one inside a markdown code block. No `minicell`/custom-`inspector` example cell.
- **Hypothesis:** Example was removed/never ported; prose not updated. Fix: either add a minicell example (which would also strengthen #4/#8) or reword to "see the minicell notebook for a minimap-style inspector."

### 3. Rerender leaves the latest visualizer empty — nodes stuck in the stale root — severity: medium-high (CONFIRMED, user-reported) — criterion: #4/#10
- **What:** When a visualizer is torn down and re-created (a rerender), or a second view is opened, the **latest** root fails to attach the cells' DOM nodes — they stay parented in the stale/previous root. The new view shows placeholders/nothing.
- **Root cause (confirmed):** A DOM node has exactly one parent, so a cell whose *value* is a live DOM node can live in only one visualizer root. The **default** `detachNodes: false` (only the shipped yellow example opts into `true`) does **not** reclaim a node already parented in another root, so the newest view never gets it. Worse, on disposal `_syncers.disposeRoot` re-emits via `v._observer.fulfilled(v._value)` but does **not** hand the node to the newest live root, so the node orphans inside the removed stale subtree.
- **Deterministic repro (via `eval_code`, offscreen roots on a free module, precise node-ownership tally):**
  - Root A (`detachNodes:true`) owns all 24 cell nodes → `{a:24, b:0}`.
  - Root B created as the latest rerender in **default** mode (`detachNodes:false`) → `{a:24, b:0}` — B attaches **0**; all nodes stay in stale A.
  - Dispose stale A → `{a:24, b:0}` — nodes remain orphaned in the detached A subtree; B never recovers.
  - Contrast: with `detachNodes:true` on both, B *does* steal all nodes (`{a:0, b:24}`) and keeps them after A is disposed — so the bug is specific to the default mode / disposal re-emit not targeting the newest root.
- **Fix direction:** on rerender/dispose, arbitration must favor the newest live root — either reclaim already-parented nodes for the latest observer regardless of `detachNodes`, or make `disposeRoot`'s re-emit target the newest surviving observer (not whatever `v._observer` currently points at). Lives in `_syncers` + runtime-sdk `observe`.

### 4. Force-observing DOM-valued cells collapses the rendered view — severity: low (edge, probe-only) — criterion: #16
- **What:** Calling `module.value(name)` on DOM-valued cells (a reachable=`true` observation) transiently throws `TypeError: Cannot create property 'fulfilled' on boolean 'true'` inside `observe()` and leaves the main pane collapsed to `▸ HTMLDivElement {}`; a reload recovers.
- **Where:** `@tomlarkworthy/runtime-sdk.observe` assumes `variable._observer` is an object, but a cell observed with `true` (reachability marker) makes `true.fulfilled = …` throw. A normal user can't trigger this; the pairing channel's force paths can. Same node-ownership family as Issue 3. Not scored against the notebook.

## Per-notebook guidance applied
- No prior `qa/per-notebook/visualizer.md` existed; created this pass.

## Things checked and OK
- Fresh boot renders title, prose, `lopeviz_handle_css`, and the runtime-sdk yellow example correctly.
- `viewof visualizers = Set(3)`, `inspectors = Map(3)` (1:1 tracked), `visualizersToDelete = Set(0)` (teardown set drained, not leaking).
- `syncers` converges under natural recompute (DOM identical before/after 3 re-dispatches).
- `visualizer` factory implements `invalidation.then(cleanup)` teardown (removes root + dispatches, records disposed roots in the toDelete set to avoid re-syncing).
- No errored cells in steady state (forced-compute `_error` scan empty).
- Console clean (no errors/pageerrors) on boot and during interaction.
- No `debugger;` statements in the module (silent-hang trap ruled out up front).

## Notes for follow-up
- Serialization (#9) not exercised — a future pass should `export_notebook` a scratch copy and verify the "single global cell ordering preserved on export" claim.
- The module-selection companion pane (2nd tab in the boot layout) was not deeply QA'd; it's a separate notebook, out of scope for the visualizer subject.
- Issue 3's root cause is in `@tomlarkworthy/runtime-sdk.observe`; consider guarding `observe()` against `variable._observer === true` there rather than in the visualizer.
