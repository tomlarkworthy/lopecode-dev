# Per-notebook guidance: editor-5

## What it is
A userspace cell-editor that wraps CodeMirror 6 around any Observable runtime variable. Drives `compile_and_update` to round-trip user edits through `@tomlarkworthy/observablejs-toolchain`'s compile→define pipeline. Exposes `cellEditor(variable, opts)` (per-instance editor component) and `auto_attach()` (hotbar on every cell in the runtime).

## Key cells (use to orient quickly)
- `compile_and_update` (pid `_2dqvsk`, HTML ~line 1502) — the central recompile path. Takes `(source, oldVariables, cellContext)`, calls `compile(source)`, and on variable-count mismatch `delete()`s the old set and creates fresh ones. **This is where issues #1 and #2 below live.**
- `createCell` / `deleteCell` / `moveCell` / `command_processor` (pids `_19znal9`, `_d9nzys`, `_470wv4`, `_2pkmxz`) — the queued command bus that toolbar buttons fire into.
- `addCells` (pid `_yej3hb`) — the ➕ toolbar button. Always creates an anonymous `{}` cell via `compile_and_update('{}', [], editedCell)`.
- `apply` (pid `_lwb7d7`) — the ▶ toolbar button. Reads from the live CodeMirror view (not from `states.get(...)` — issue #166 fix).
- `cellEditor` (pid `_1q95xt6`) — per-instance editor template clone via `cloneDataflow(editorTemplate, ...)`. `editedCell` is per-clone, NOT a single shared variable — so querying `editedCell` from outside hits some-clone's value.
- `editedCell` (pid `_1o2h65s`) — `Inputs.input(null)`. Templated into each `cellEditor()` instance.

## Auxiliary modules in the same bundle
- `makeCell` lives in **`@tomlarkworthy/cells-to-clipboard`** (HTML line 2249), NOT in editor-5. It's a clipboard formatter — only called by the 📄 Copy button. Earlier QA passes attributed the silent-hang to "editor-5's `_makeCell:2252`" — that file location is correct but the *module* attribution was wrong; the cell only runs on copy.

## How to drive an editor instance from QA
1. Open the notebook — the demo `cellEditor(title_variable, { pinned: true })` is the visible editor on screen.
2. Toolbar coords at initial layout: checkbox (112), ⬆ (143), ⬇ (175), 🗑️ (207), ➕ (240), ▶ (273), 📄 (306), 📋 (339), all at y≈738. After adding a new cell, the new cell's toolbar lands at y≈662 (existing ones shift down).
3. Each new cell renders as a thin "edit"-link row until you click `edit` (right edge ≈x=1286 at default width). After opening, type into the focused CodeMirror, then click ▶ on the cell's *own* toolbar (NOT the title cell's).
4. Watch `history` channel events for the variable lifecycle — `change_listener` (from local-change-history) emits a `new`/`upd`/`del` record per variable. This is the most reliable signal because screenshots can hang.

## Known issues (verify each pass; remove when fixed)

1. **Import for an already-imported module collides → corrupts the pre-existing binding.** If the editing module already has `module @X` in scope (e.g. via its compiled `main.define("module @X", …)` block), a user-typed `import {…} from "@X"` makes `compile_and_update` create a *second* `module @X` Variable. Observable's runtime rewrites *both* to `() => { throw new RuntimeError("module @X is defined more than once") }`, breaking every pre-existing consumer of `@X` in that module. Reproduce: from the editor-5 demo (which already imports `@tomlarkworthy/visualizer`, `cell-map`, `runtime-sdk`, etc.), add `import {visualize} from "@tomlarkworthy/visualizer"` and click ▶. Watch the history event for an `upd` op on the pre-existing `module @tomlarkworthy/visualizer` pid (e.g. `_1kr7q0e`). The fix: have `compile_and_update` (or the compile/cellMap layer) skip emitting a duplicate `module @X` and rebind the new import variables to the existing one. First seen 2026-05-19 QA pass.

2. **Runtime-compiled `module @X` import uses a malformed `importShim(<page-url>)` specifier.** Canonical compiled-into-HTML form: `runtime.module((await import("/<name>.js?v=4")).default)`. Runtime-compiled form via `compile_and_update`: `runtime.module((await importShim("@tomlarkworthy/themes…#view=S100(@tomlarkworthy/editor-5,@tomlarkworthy/module-selection)&cc=…#1")).default)` — page URL hash concatenated into the specifier. Likely the toolchain compile path resolving the bare specifier against `location.href` somewhere. May silently work on `importShim` if it falls through to the page's importmap, but the path is wrong. First seen 2026-05-19 QA pass.

3. **Console log pollution.** Every reactive recompute through `module-map` re-logs the full chain (`notebookImports`, `notebookImportVariables`, `module_definition_variables`, `modules`, `notebookImportMatches`, `pageImportMatch`, `resolve_modules`, `generate summary`, `submit_summary`). `runtime-sdk:641` fires `keepalive: dynamic observe …` per registration. `editor-5:413` (`selectVariable`) logs once per variable on every selection — measured >100 lines in one tick when opening an editor. `editor-5:679,684` log `code_editor_view`, `code_editor` per render. `editor-5:430,481` log `hotbar start`/`hotbar stop`. `visualizer:126` logs `creating visualizer`. All are author-side `console.log` residue; criterion #11 fail across multiple modules.

4. **Unconditional `debugger;` outside cellMap.** The cell-map debugger at line 1949 (`_test_cell_map_covers_all_runtime_variables`) was removed 2026-05-19. The `cells-to-clipboard` `_makeCell:2252` debugger was removed 2026-05-19. Apply-path still pauses Playwright Chromium with the silent-hang signature after both removals — at least one more unconditional debugger remains on the hot path. 21 `debugger;` statements still in the bundle; `@tomlarkworthy/import-notebook` `_3` (HTML line 11408) is a known unconditional one but is on the demo path, not apply. Until the remaining offender is found, expect QA passes that click ▶ on an import cell to hang after the channel emits the `history` event — use channel events for evidence, not screenshots.

## How to test the import-cell flow without hangs
- Drive `compile_and_update` directly via `eval_code` (locate it through `editor-5Mod._scope.get('compile_and_update')._value`) — bypasses the toolbar's apply path. This skips the UI side-effects that trip the remaining debugger.
- Use channel `history` events as the ground-truth signal — they capture variable lifecycle without needing screenshots.

## Two editor instances on screen
The editor-5 notebook's own page renders TWO `cellEditor()` instances: the visible "Example" demo (editing `title`) and a `viewof select` editor lower down (editing whichever variable the `_variable` radio has selected). `editedCell` is per-clone via `cloneDataflow`, so the global `editedCell` you see from `eval_code` is the most recently focused clone's. Toolbar clicks operate on the toolbar's own clone, not on the global value.

## `compile_and_update` count-mismatch branch loses observers

When user-typed source compiles to a *different number of variables* than the placeholder cell holds (most common: a 1-variable anon `{}` becoming `viewof X` = 2 variables, or `mutable X` = 3 variables, or `import {a,b} from "@m"` = 1 module + N bindings), `compile_and_update` takes this branch:

```js
if (!variables || variables.length !== newVariables.length) {
    variables.forEach(v => v.delete());
    variables.length = 0;
    for (let i = 0; i < newVariables.length; i++) {
        const newVariable = cell.module.module.variable({});  // ← {} observer = no inspector
        ...
    }
}
```

The `{}` observer has no `fulfilled`/`pending`/`rejected` methods, so the runtime never invokes an inspector → no `.observablehq` div is created → the visualizer never renders a `name = value` row → `auto_attach`'s `divToVar` (which walks `.observablehq` divs) cannot find the variable → no edit affordance is bound. The new variables exist in the runtime but are invisible and unreachable from the UI. The user has no recovery short of reloading the page.

The 1→1 path (e.g. `bar = 41`) reuses the placeholder variable via `variable.define(...)`, keeping its original observer → inspector continues to render → cell remains discoverable. So plain expression cells appear to work, masking the bug.

Issue #1 from the 2026-05-19 pass (import-collision) is a structural sibling — both bugs stem from `compile_and_update` not understanding when a fresh-variable creation is safe vs. when it severs UI bindings.

**To diagnose quickly:** drive `compile_and_update` directly from `eval_code` (per "How to test the import-cell flow without hangs" above) and inspect each new variable's `_observer`. If `observerCtor === "Object"` and `observerKeys === []`, the variable has no inspector — that's the bug. First seen 2026-05-20 QA pass (user-reported: "when placing a `viewof foo = Inputs.checkbox()`. The initial cell is not shown anywhere and is hard to find").
