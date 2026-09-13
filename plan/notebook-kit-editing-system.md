# An editable notebook-kit UI, built beside the legacy one

Started 2026-09-13. Follows `plan/exporter-4-notebook-kit-research.md`, which answered whether a
notebook-kit runtime can be grouped, exported and decompiled. This plan builds the browser system
that uses those answers: notebook-kit cells that render, including `display()`, and can be edited.

Tom, 2026-09-13: *"I don't want to risk breaking our legacy functionality, so fork into editor-6,
visualizer-2 and lopepage-3 … try to build a complete system I can use in a browser."*

## What is forked and what is edited in place

| module | action | why |
|---|---|---|
| `@tomlarkworthy/editor-5` | fork to **editor-6** | canonical in both repos; imported by lopepage-2 |
| `@tomlarkworthy/visualizer` | fork to **visualizer-2** | imported by lopepage-2 and editor-5 |
| `@tomlarkworthy/lopepage-2` | fork to **lopepage-3** | the frame of ~191 notebooks |
| `@tomlarkworthy/js-toolchain` | **edit in place, additive** | embedded in 1 notebook (`lopebooks/notebooks/@tomlarkworthy_notebook-kit.html`), imported by no module, `upstream: null` in `canonical.json` |
| `@tomlarkworthy/cell-map-2` | already separate from v1 | nothing legacy imports it |
| exporter-4 | not a module yet | `tools/newobs-replica/exporter-4-prototype.ts` only |

Import edges measured in `lopecode/notebooks/@tomlarkworthy_cell-map-2.html` (50 modules), 2026-09-13:

```
@tomlarkworthy/lopepage-2  -> "module @tomlarkworthy/editor-5" "module @tomlarkworthy/visualizer"
@tomlarkworthy/editor-5    -> "module @tomlarkworthy/cell-map" "module @tomlarkworthy/visualizer"
@tomlarkworthy/visualizer  -> "module @tomlarkworthy/cell-map"
```

No other module imports editor-5 or visualizer, so a notebook booting lopepage-3 does not need
their blocks. It must not carry them: module discovery instantiates every module block in the
page (`knowledge/resyncing-modules-across-the-corpus.md`, "Swapping the frame"), so a leftover
lopepage-2 or editor-5 block would boot a second frame and a second context-menu attacher.

## Decisions taken in conversation, 2026-09-13

1. **Compile and define both live in js-toolchain.** notebook-kit keeps `src/javascript/` and
   `src/runtime/define.ts` in one package, and they share the `Definition` shape
   (`define.ts:12-33`). js-toolchain gains the ojs-mode compiler (`transpileObservable`,
   `vendor/notebook-kit/src/javascript/observable.ts`, 142 lines) and a runtime `define`.
2. **`type` comes from member roles; `lang` lists every language that emits the shape.** Done
   (lopecode `e8dee51`). A `simple` body that is unnamed or named `cell N` is `["ojs","js"]`.
3. **Display state is created at construction; observation is attached later.** This is the
   architectural difference Tom named: *"Lopecode attaches observers dynamically in userspace but
   observable does it at construction time."*
   - notebook-kit: `main.variable(observer(state, definition), {shadow: {}})` (`define.ts:44`).
     An observer makes the variable reachable (`variable.js:28`), so every cell runs.
   - lopecode: a non-main module is built with no observer. runtime-sdk `observe` later marks the
     variable reachable, installs a listener dispatcher, keeps any pre-existing observer as a
     permanent first listener, and replays the current value to a new listener.
   - `_shadow` is fixed at construction (`variable.js:30`, not writable) and the `display` shadow
     closes over `state` (`define.ts:50-62`). So js-toolchain `define` creates the variable with
     no observer and `{shadow: {}}`, builds `state`, installs the shadows, and records the
     notebook-kit observer and `state` in a WeakMap. A pane attaches that observer once per
     variable and mounts `state.root`.
4. **Consequence accepted for now:** a side-effect-only notebook-kit cell runs only when observed
   or depended on, as classic cells do in lopecode today. notebook-kit runs it unconditionally.

## Milestones

Each gate is a check that can fail. Nothing is published, pushed or jumpgated without approval;
the forks are unpublished, so the notebook is assembled locally (M4), not jumpgated.

### M1. js-toolchain runtime: `define`, display state, the vendored helpers

- Bundle `display`, `clear`, `observe`, `input`, `Mutator` from `vendor/notebook-kit` 2.5.6 into
  one ESM file with no unresolved specifiers (`knowledge/vendoring-npm-dependencies.md` § 2) and
  attach it to js-toolchain, loaded as `@tomlarkworthy/acorn-8-11-3` loads acorn (unzip → blob URL
  → `import`). E3 measured the same surface at 16,032 bytes minified, 4,915 gzipped.
- `define(module, definition, {variables})`: `define.ts` with the observer removed from
  construction; `displayStateOf(v)`; `attachDisplay(v, observe)` reference-counted per variable.
- Redefinition keeps variable objects (editor-5 relies on that for observer, pid and position,
  `editor-5.js:1602-1620`); `state.variables[0]` must stay the same object or every later
  `display` throws "stale display" (`define.ts:56`).
- **Gate: the differential harness below passes, with its controls.**

### M2. visualizer-2

**A rewrite on dataflow-templating, not a line-by-line fork.** Tom, 2026-09-13: *"visualizer was
not implemented very well, it was developed before dataflow templating, which is how I would do it
now (or dataflow-compile)."* visualizer v1 keeps a set of root elements in `viewof visualizers`
and one imperative `syncers` cell reconciles every pane on each `liveCellMap` change
(`visualizer.js:297-465`).

- Per-cell rendering is a template dataflow of ordinary cells in visualizer-2 (param `vizCell`),
  instanced per cell with `instantiateDataflow` (`@tomlarkworthy/dataflow-templating`). The
  instance lives in the sandbox Runtime, so it adds no variables to the page runtime, and it is
  re-defined when a template cell is edited (`watch: onCodeChange`). Cleanup goes through each
  instance's `invalidation`.
- A pane is itself an instance of a pane template (params `vizModule`, `vizFilter`) that reads
  `liveCellMap` through a bridge, keys cell instances by head variable, and orders their nodes.
- `visualizer(runtime, {invalidation, module, filter, …})` keeps v1's signature and return value,
  because lopepage-2's `lp2_getPane` calls it that way and its scroll anchor reads
  `.observablehq[cell]` nodes carrying a `.variable` back-reference.
- compile-dataflow does not fit: its refusal table lists "Notebook Kit per-cell `display` / `view`"
  and every stream-valued cell, and a cell's rendered DOM is a live stream of values.

Unchanged from the fork plan:

- `liveCellMap` from cell-map-2 instead of v1.
- Pick the drawn variable by role: the `mutable-getter` for a mutable cell (index 0 on
  notebook-kit, index 2 classic), else `variables[0]`. v1's fixed index 2 draws `cell 23` on
  notebook-kit.
- For a variable with a display state, the per-pane observer mounts `state.root` inside a
  `div.observablehq` and js-toolchain's notebook-kit observer is attached once. Classic variables
  keep the Inspector path unchanged.
- **Gate:** classic modules render identically to visualizer v1 (same managed node count and cell
  attributes per module, in a notebook that boots both frames in separate pages); a notebook-kit
  cell calling `display` twice shows both nodes.

### M3. editor-6

- cell-map-2 for grouping; decompile and compile dispatched per cell: js-toolchain for cells whose
  `lang` is `["js"]` or that carry a display state, observablejs-toolchain otherwise.
- js cells compile with `compile(source, {id})` and apply through js-toolchain `define`.
- A JavaScript CodeMirror language for js cells. editor-5's `javascriptPlugin` cell
  (`editor-5.js:1689`) returns `codemirror` unchanged, so there is no js mode to reuse.
- **Provisional default, pending Tom:** a module is notebook-kit dialect if any cell has a display
  state or `lang` `["js"]`; new cells in such a module are js, elsewhere classic.
- **Gate:** in a browser, edit a js cell (single and multi-declaration) and an ojs classic cell;
  each recomputes, keeps its pid, and decompiles back to the typed source.

### M4. lopepage-3 and its notebook

- lopepage-3 = lopepage-2 with `module @tomlarkworthy/visualizer` → visualizer-2 and
  `module @tomlarkworthy/editor-5` → editor-6.
- Notebook: copy a lopepage-2 notebook, insert lopepage-3, visualizer-2, editor-6, js-toolchain
  (+ its attachment) and a demo module; delete the lopepage-2, visualizer and editor-5 blocks;
  set `mains` and `hash`; declare canonicals; baseline, sitemap, content index.
- **Gate:** boots offline over `file://` with zero `api.observablehq.com` requests;
  `--run-tests` shows no new failures against the donor notebook.

### M5. ojs dialect in js-toolchain

- Port `transpileObservable`; decompile for autoview (`viewof$x`), automutable (`mutable x` +
  `cell N` + `mutable$x`) and native import cells (`cell N` with the outputs enumeration).
- Its one new dependency is `@observablehq/parser`'s `parseCell`; whether observablejs-toolchain's
  exported `parser` is the same parser is unchecked.
- **Gate:** every ojs node of the notebook-kit fixture round-trips from live variables, in the
  `js-toolchain-vs-notebook-kit.test.ts` style.

### M6. exporter-4 as a module, wired into lopepage-3's save

- Without it, save-in-place drops notebook-kit shadows: exporter-3 writes
  `main.variable(observer(name)).define(name, deps, fn)`, and the prototype showed an export with
  shadows removed fails its behaviour fixture.
- Open until 2026-09-13: the option C module needs `display`/`input`/`Mutator` while its `define()`
  runs, and the prototype takes them as a parameter (`define(runtime, observer, nk = globalThis.__notebookKit)`).
  Not taken. exporter-4's `$nk` loads js-toolchain as an ordinary module import and calls its
  `defineCell` after `define()` returns; see Progress.
- **Gate:** E0 fingerprint equal across live → save → reload in a browser; classic modules'
  output byte-identical to exporter-3's (E8).

### M7. pairing

`define_cell`/`update_cell` compile with observablejs-toolchain (`claude-code-pairing`
`_cc_handle_define_cell`); they need the M3 dispatch.

## Verifying display (M1 gate)

Reference arm: vendored notebook-kit `define` with its observer at construction, run headlessly
in bun with happy-dom (as `buildNkFixture` already does). Our arm: js-toolchain `define`, observer
attached through runtime-sdk `observe`, root mounted. Both loaded through `notebook-import.ts`.
After every step compare, per cell: root children `outerHTML` in order, the value, the rejection,
the `console.error` count. Bodies wait on test-controlled promises, not timers.

Scenarios, one per branch of `define.ts`/`display.ts`:

| scenario | branch |
|---|---|
| expression cell yielding an element, a text node, an object | `observe.fulfilled` autodisplay |
| `display` twice | `displayNode` appends |
| input change, re-run calls `display` | clear on a new version, `define.ts:57` |
| re-run calls no `display` | `autoclear` in `fulfilled` |
| older async run calls `display` after a newer run began | "stale display", `define.ts:55` |
| throw, then recover | `rejected`, then `pending` clears |
| `display` of a fragment; of a node attached elsewhere | `isDisplayable` |
| expanded inspector, then re-run | `expanded` kept by `clear` |
| `view(Inputs.range())`, then an input event | `view` shadow |
| `viewof` / `mutable` cells | autoview / automutable |
| redefine in place, then delete | `state.variables[0]` guard |
| generator calling `display` across yields | version per yield — unknown until run |

Lopecode-only axes, applied to each scenario, where notebook-kit has no answer: attach before the
first run, after it, mid-async; detach and re-attach; two panes; computed by a dependant while
unobserved; edited while unobserved. Property: once settled after attach, the root equals the
reference root at the same step; with two panes exactly one holds the root, the last attached.

Controls: reference vs reference must be equal. Each deliberate break must fail at least one
scenario — drop autoclear; attach one observer per pane; skip the stale check; construct without
`{shadow: {}}`.

Then the same scenarios as `test_*` cells in a real page (happy-dom is not a real DOM;
`isDisplayable` depends on `instanceof Element`), and a spot check of four scenarios against
new.observablehq.com to confirm vendored 2.5.6 matches the platform.

## Open questions for Tom

- New cells in a notebook-kit module: notebook-kit dialect or classic? (M3 ships the provisional
  default above.)
- A cell whose `lang` is `["ojs","js"]`: follow the module's dialect, or let the author choose?
- `display` inspector: notebook-kit's `@observablehq/inspector` (matches the platform, 16 of the
  bundle's 22 files) or lopecode's `@tomlarkworthy/inspector` (matches classic cells)?
- Interpretation check: "already forked editor-4" was read as exporter-4, which is still a
  prototype script rather than a module.

## Progress

- 2026-09-13: plan written. cell-map-2 `type`/`lang` from roles shipped (lopecode `e8dee51`).
- 2026-09-13, M1 cells written and embedded, gate passed headless and in Chromium; not committed in
  lopebooks (below).
  - js-toolchain gained `nkRuntime`, `nkDisplayStates`, `defineCell`, `displayStateOf`,
    `attachDisplay`. `nkRuntime` imports `notebook-kit-runtime-2.5.6.js.gz` (built from
    `tools/js-toolchain/runtime/nk-runtime-entry.ts`: 17,184 bytes, 5,400 gzipped, no unresolved
    specifiers), embedded before the module block with `lope-add-attachment.ts`, then
    `sync-module` into `@tomlarkworthy_notebook-kit.html`. Preflight: `0 NEW, 0 resolved`.
  - **runtime-sdk `observe` does not schedule a compute.** It marks the variable reachable and adds
    it to `_dirty`/`_updates`, but only `runtime_computeNow` (`runtime.js:82-125`) reads those, so
    an observer attached to an idle runtime renders nothing until something else computes. First
    harness run: every late-attach case had an empty root (expected `["<b>n=1</b>"]`, received
    `[]`); calling `_computeSoon()` after attach took that subset from 6 pass / 36 fail to 36 / 6.
    `attachDisplay` now calls it. runtime-sdk is unchanged, so legacy callers keep the gap.
  - `tools/js-toolchain/runtime/display-differential.test.ts`: **79 pass, 0 fail**. 14 scenarios ×
    4 attach modes (before first run, after it, after the last step, detached and re-attached),
    reference-vs-reference null control, `attachDisplay` refcount, 4 redefine-in-place cases, and
    4 mutation controls, each of which fails its mutant.
  - Two controls did not fail at first, and both were test defects. "No stale check" survived
    because an `await gate` body never overlaps a newer run (the runtime chains the next compute
    onto the pending promise); only a display from a callback outlives its run, so that is the
    scenario now. "Autoclear never set" survived until a redefine from a displaying body to one
    that does not call `display` on its first run: `define.ts`'s display branch does not clear at
    define time, so only `autoclear` removes the old output.
  - `tools/js-toolchain/runtime/display-browser-check.ts`: **29 pass, 0 fail, 0 page errors** in
    Chromium against `@tomlarkworthy_notebook-kit.html`, using the page's own `defineCell`,
    `attachDisplay`, runtime-sdk `observe` and the attachment-loaded `nkRuntime`, compared with the
    happy-dom reference arm. Scenarios attach before the first run and after the last step. The
    first run failed 4: a fragment and a node attached elsewhere are inspected rather than inserted
    (`display.ts:36-44`), and happy-dom's inspector lists its private `Symbol(...)` fields where
    Chromium's lists none. Inspected DOM objects are now compared by label only.
  - Not done from the gate list: expanded inspector kept across a re-run, generator calling
    `display` across yields, two panes with the root in the last attached, edited while unobserved,
    and the new.observablehq.com spot check.
  - Not committed in lopebooks: `@tomlarkworthy_notebook-kit.html` also holds another writer's
    uncommitted edits to js-toolchain `decompile` (AST projection match), inspector, tests and
    lopepage-2. My js-toolchain copy was checked out after their edit; a three-way merge against
    `HEAD` showed mine as pure additions over theirs (`git merge-file`: 0 conflicts, output
    byte-identical to mine).
  - `playwright` `chromium.launch` fails under `bun test` with `EBADF` from `posix_spawn`, so the
    browser check is a plain `bun` script.
- 2026-09-13, M2 visualizer-2 module written; headless suite passes, browser gate not run (needs M4).
  - `modules/@tomlarkworthy/visualizer-2.js`. **Only a working copy:** `modules/**/*.js` is
    gitignored (`.gitignore:67`) and the module has no canonical notebook until M4 embeds it.
  - Structure: `visualizer(runtime, opts)` returns v1's `div.lopecode-visualizer >
    div.observablehq-root.lope-viz` and instantiates `vizPaneTemplate` (params `vizRoot`,
    `vizModule`, `vizFilter`, `vizInspector`, `vizDetachNodes`). The pane's `vizPaneSync` keeps one
    `vizCellTemplate` instance per drawn variable (param `vizVariable`), renders import headers as
    v1 does, and orders `.observablehq` children. `vizCellNode` observes through `attachDisplay`
    when the variable has a display state, else through the inspector and runtime-sdk `observe`,
    and releases on the instance's `invalidation`. Parameter cells carry defaults so the template
    cells compute to `null` in visualizer-2's own module instead of throwing.
  - Departures from the M2 text above, each decided while writing:
    - The drawn variable is chosen by display state, not by `roleOf`: the variable `defineCell`
      gave a state, else v1's rule (index 2 for a classic mutable, else index 0). Every notebook-kit
      cell this system defines has a state, so no role lookup is needed; a notebook-kit runtime
      defined by the platform itself would fall back to v1's rule, unverified.
    - The notebook-kit node **is** `state.root` (classes `observablehq lope-viz-nk`), not a wrapper,
      so lopepage-2's reading-mode rule `.observablehq:has(> .observablehq--inspect)` applies to it
      as to a classic cell. A second pane takes the root rather than copying it.
    - Cell instances get no `watch`: a redefined `vizCellNode` would make a new node the pane does
      not know about. Pane instances do get `onCodeChange`.
  - `tools/visualizer-2/visualizer-2.test.ts`: **9 pass, 0 fail**. Every import is the real cell
    from its own module; the Inspector is `vendor/notebook-kit`'s `@observablehq/inspector` 5.0.1,
    the version `@tomlarkworthy/inspector` embeds. Five scenarios: order, `cell` attributes and
    `.variable` back-references; add, redefine in place (same node) and delete (instance disposed,
    sandbox module count back to its prior value); filter, import header, classic mutable and
    notebook-kit mutable drawn variables; two panes sharing one display root (last attached holds
    it, `attached` 2 → 1 → 0); pane disposal (sandbox modules 4 → 0). Four mutation controls each
    fail at least one scenario.
  - One control survived first: drawing notebook-kit cells through the inspector changed nothing,
    because a simple notebook-kit cell's state-owning variable is also index 0 and `vizCellNode`
    checks the state itself. It fails only once a notebook-kit `mutable` is in the map.
  - A js cell with no declarations has an unnamed variable (`define.ts`: `output ?? (outputs.length
    ? "cell id" : null)`), so its node has no `cell` attribute and lopepage-2's scroll anchor skips
    it, as it skips anonymous classic cells under v1.
  - Not covered: parity with v1 on classic modules (gate: in a browser, M4), a cell inserted between
    existing ones, and a template edit reaching mounted nodes.
- 2026-09-13, M3 editor-6 and the lopepage-3 fork written; headless editor-6 suite passes, browser
  gate not run (needs M4). Both are gitignored working copies, as visualizer-2 is.
  - `modules/@tomlarkworthy/lopepage-3.js`: lopepage-2 with six import lines moved to
    `visualizer-2` and `editor-6`. lopepage-2 refers to itself only by DOM id (`#lopepage-2`) and in
    prose, so nothing looks the module up by name.
  - `modules/@tomlarkworthy/editor-6.js`: editor-5 with, as asserted exact-string edits:
    - visualizer v1 no longer imported. `syncers` was only a keepalive reference in `auto_attach`;
      `TRACE_CELL` had no reader.
    - cell-map v1 → cell-map-2. editor-5's four readers take `viewof liveCellMap.value` inside
      handlers without depending on the map, and cell-map-2 exports no viewof, so editor-6 defines a
      constant `viewof liveCellMap` and a `liveCellMapFeed` cell (kept alive through `editor_jobs`)
      that assigns cell-map-2's `liveCellMap` into it. `findCell` now carries `type` and `lang`.
    - `cellLanguage(variables, cell)`: `js` when a variable has a display state from a plain
      definition (not `autoview`/`automutable`, which are the ojs dialect, M5) or `lang` is exactly
      `["js"]`; a new cell is `js` when any cell in its module is. This implements the provisional
      default in M3 above.
    - `decompile` is now a local dispatcher over `decompileOjs` and `decompileJs`, so editor-5's
      three call sites are unchanged. A `defineCell` head reads `display`/`view` through shadow
      variables that have no `_name`, so js decompile takes the head's input names from the recorded
      definition.
    - `compile_and_update` sends js cells to `defineJsCell`: `transpileJavaScript` → `realize` →
      `defineCell`, keeping the cell's id or taking the module's next free one, a random pid for new
      variables, placement after the anchor, and the caller's array filled in place
      (`command_processor` reads `newVars[0]`).
    - `editor_manager` uses `codemirror.javascript()` for js cells. The linter is kept: `lintSource`
      walks the active language's syntax tree, so it reports JavaScript errors there. (A first draft
      disabled it for js cells on the assumption that it parsed Observable JavaScript.)
  - `tools/editor-6/editor-6.test.ts`: **8 pass, 0 fail**. Real js-toolchain and runtime-sdk cells,
    observablejs-toolchain stubbed to record calls. Scenarios: a new cell in a js module (`cell 2`
    plus `x`, pids, placed between its anchor and a later variable, `x` computes); an edit keeps the
    head, renders both new `display` calls and decompiles to the typed source; a multi-declaration
    edit grows projections in place; ojs cells and new cells in an ojs-only module reach the stub.
    Four mutation controls each fail at least one scenario, including reading head inputs from
    `_inputs`, which confirms the unnamed-shadow finding.
  - Not covered: CodeMirror in a page, `viewof liveCellMap` consumers (copy, paste, move) against
    cell-map-2's cell shape, and anything in the ojs dialect.
- 2026-09-13, M4 notebook assembled; its browser gates pass in Chromium. The notebook is
  `lopebooks/notebooks/@tomlarkworthy_lopepage-3.html` (2,523,892 bytes) and is not committed in
  lopebooks (below).
  - `tools/lopepage-3/assemble.ts` builds it from `@tomlarkworthy_notebook-kit.html`:
    - removes the lopepage-2, visualizer, editor-5 and `editor-5/cell_options.json` blocks;
    - inserts cell-map-2 (from its lopecode canonical), visualizer-2, editor-6, lopepage-3 and
      notebook-kit-demo with `sync-module --insert-ok`;
    - carries the options block across as `@tomlarkworthy/editor-6/cell_options.json` (editor-6's
      loader map now names editor-6);
    - sets `mains` to `[notebook-kit-demo, lopepage-3, js-toolchain, module-selection]` and `hash`
      to `#view=S100(@tomlarkworthy/notebook-kit-demo)`.

    save-in-place is left out of `mains` because saving would write the demo cells back without
    their shadows (M6).
  - `@tomlarkworthy/notebook-kit-demo` defines five Notebook Kit cells at runtime. `nk_boot` runs
    `transpileJavaScript` → `realize` → `defineCell` on each, because no exporter writes such cells
    into a module yet.
  - `tools/lopepage-3/boot-check.ts`: **9 pass, 0 fail**.
    - The page mounts and renders five nk roots, and `display()` called twice appends both outputs.
    - Setting the slider to 7 gives `k * n` = 21.
    - `compile_and_update` called directly on cell 2 edits it in place.
    - Through the UI: the hotbar under the `21` cell opens CodeMirror showing `k * n`. Typing
      `k * n + 100` and pressing Shift-Enter shows 121 in the same node.
    - There are no page errors and no network requests beyond the donor's two: flow-queue's md video
      and the bootloader's lazy highlight.js import, both measured on the donor.
  - `--run-tests`: lopepage-3 **164/167**, donor 157/160. Both fail the same three:
    `test_persistentId`, `test_tests_example` (timeout) and `test_reflectsTitleUpdate`. The extra
    seven tests are not itemised.
  - The gates found four defects, each fixed in the forks:
    1. The first boot threw `Cannot read properties of undefined (reading 'module')` in editor-6
       `getOption`.
       - Logging the misses showed `findCell` missing every cell in the demo module, classic cells
         included, at t≈258ms, and none afterwards. editor-6's `viewof liveCellMap` starts as an
         empty Map, and editors attach before `liveCellMapFeed` fills it.
       - Fix: when the cell is not found, `getOption` returns the default and `setOption` does
         nothing.
       - Cost: a persisted `pinned` option is not applied to an editor that attaches in that window.
         In this notebook nothing can persist options, because save-in-place is not booted.
       - Rejected alternatives: a viewof that depends on cell-map-2's map, or gating `auto_attach`
         on the feed. Either one recomputes every editor whenever any variable changes.
    2. `test_cell_map_covers_all_runtime_variables` failed here and not in the donor:
       `[{"module":"@tomlarkworthy/editor-6","missing":["viewof liveCellMap"]}]`. cell-map-2 groups
       a `viewof x` with its `x`, and editor-6 had no `liveCellMap`. Added
       `liveCellMap = Generators.input(viewof liveCellMap)`, which took the run from 163/167 to
       164/167.
    3. Declaration-only nk cells (`const n = 3;`) rendered `<detached>`. That comes from
       lopepage-2's CSS rule `.lope-viz .observablehq:not(.observablehq--running):empty::after`.
       lopepage-3's copy of the rule now excludes `.lope-viz-nk`; lopepage-2 is unchanged.
    4. The first UI run failed to read CodeMirror after Shift-Enter, although the screenshot showed
       121 and the typed source. The check had marked the editor host with an attribute and never
       found that element again, so the host is presumably rebuilt on recompile (inferred, not
       traced). The check now addresses the host as the cell node's next sibling.
  - Preflight: `2 NEW`, both unused-dep, both inherited from the donor, where they are baselined:
    dataflow-templating `instancingCost` and file-sync `jbApply`. They are not baselined for
    lopepage-3; they need fixing in those modules' canonicals.
  - Not done from the M4 list: `canonical.json` entries, the preflight baseline, the sitemap and the
    two `content.json` copies. All wait for the lopebooks commit, which is held for two reasons:
    - The new HTML copies `@tomlarkworthy_notebook-kit.html` including the other writer's
      uncommitted edits (M1 above).
    - The lopebooks pre-commit preflight would reject the 2 NEW findings.
  - Not covered:
    - classic modules drawn by visualizer-2 in a browser (only the demo module was open);
    - multi-declaration and ojs edits through the UI, both on the M3 gate list;
    - copy, paste and move against cell-map-2;
    - a cell created from ➕;
    - anything surviving a reload.
- 2026-09-13, drag reorder. Tom, after using the notebook: "dragging and stuff does not work so
  well. display cells seem to get orphaned and not move with the cell."
  - Reproduced with `tools/lopepage-3/drag-repro.ts`, which drags the two-`display()` cell's hotbar
    below `k * n`. The move itself worked: cell-map-2's order and the pane's cell nodes both changed.
    The editor hosts did not follow. `E` below is an editor host:
    ```
    before  NK(cell 1) E NK("n is 3"…) E NK(cell 3) E NK("9") E NK(cell 5) E
    2s, 6s  NK(cell 1) E NK(cell 3) NK("9") NK("n is 3"…) E E E NK(cell 5) E
    ```
  - Cause: a regression introduced in the editor-6 fork, not a Notebook Kit issue. `auto_attach`
    places each editor with `div.after(editor)` and only does so when it reruns. editor-5 reran it
    by depending on visualizer v1's `syncers`, which recomputes on every `liveCellMap` change. M3
    removed that dependency as a keepalive with no other use.
  - Fix: visualizer-2 has `vizSyncEvents`, which `vizPaneSync` notifies after reordering, and
    exports `vizSynced`, a counter over those events. editor-6's `auto_attach` depends on
    `vizSynced`. A MutationObserver in editor-6 was not used because it would fire on every display
    update.
  - `boot-check.ts` gained a drag gate. It checks that the cell moved and that every pane cell is
    followed by an editor host. The gate was worthless in its first two positions:
    - After the edit steps, it passed on a control notebook with only the `vizSynced` dependency
      removed.
    - After a `setViewportSize` call, the drop landed before layout settled, so the fixed notebook
      failed.

    Now the page opens at 1280×1600 and the drag runs 1.5s after boot, before the slider. Two
    rounds: control 7/10 both times (the drag gate plus the two UI-edit checks that need a placed
    hotbar), fixed 10/10 both times.
  - Unchanged after the fix: visualizer-2 9/9, editor-6 8/8, `--run-tests` 164/167 with the same
    three failures, preflight the same 2 inherited findings.
  - Not covered: up/down arrow moves (`moveCell`, which should need the same rerun), a drag across
    panes, and a drag while an editor is open.
- 2026-09-13, Observable JS in a Notebook Kit module. Tom: "So I cannot use Observable 1.0 syntax in
  cells anymore? `viewof foo = Inputs.range()`". Under the M3 provisional default he could not: in a
  module holding any Notebook Kit cell, new cells and edits to js cells went to js-toolchain, and
  `viewof foo = …` is not JavaScript. He chose routing by what the source parses as, over porting
  the ojs dialect (M5).
  - `sourceLanguage(source, variables, cell)` in editor-6 tries observablejs-toolchain's
    `parser.parseCell` and js-toolchain's `transpileJavaScript`. If exactly one accepts the source,
    that one compiles it. If both or neither do, `cellLanguage` decides as before. A module can now
    hold both kinds.
  - A draft also sent any cell with an Observable JS name (`parseCell(...).id`) to ojs. Its mutation
    control survived, and a probe showed why: Notebook Kit's parser already rejects every such form.
    ```
    "x = 5"          -> throws: Assignment to external variable 'x' (1:0)
    "a = b = 1"      -> throws: Assignment to external variable 'b' (1:4)
    "viewof foo = 1" -> throws: Unexpected token (1:7)
    "mutable x = 1"  -> throws: Unexpected token (1:8)
    "let x; x = 5;"  -> js ok
    ```
    The rule was removed.
  - Switching an existing cell's language, in `compile_and_update`'s `switchLanguage`:
    - Deletes the cell's variables and every head's shadow variables. A Notebook Kit head's
      display/view shadows and display state would survive a classic redefinition in place.
    - Defines the new cell after the nearest earlier variable not in the cell. Shadows are defined
      before their head, so the variable just before the head is usually its own shadow.
    - Moves the first variable's pid to the new first variable and adds it to `pinOnCreate`, so the
      editor reopens on the new node.
    - Cost: the variables are new objects, so anything holding the old ones (another pane's node, a
      watcher) sees a delete and an add.
  - `tools/editor-6/editor-6.test.ts`: **15 pass, 0 fail**, 8 scenarios and 7 mutation controls.
    - The stub classic compiler now returns observablejs-toolchain-shaped variables, and `parseCell`
      is the vendored `@observablehq/parser` 6.1.0. The in-notebook parser loads from an attachment;
      its version was not checked.
    - New scenarios: Observable JS typed into a new cell of a js module; a js cell switched to
      Observable JS (place, pid, `pinOnCreate`, head and shadows gone); a classic cell switched to
      js; `1 + 2` over a js cell keeping its head.
    - New controls: parse ignored, shadows left behind, pid not carried.
    - The harness now reads its handles through one observed variable. `values()` observes a cell
      only until it resolves, so `pinOnCreate` came back as a Set the editor never saw and the
      assertion failed (inferred from that failure, not traced).
  - `boot-check.ts`: **11 pass, 0 fail**. Typing `viewof foo = Inputs.range([0, 10])` over `cell 5`
    through the editor gives a classic node with a range input, at the same pane index and with the
    same pid; `foo` = 5; `cell 5` and `total` are gone; the reopened editor shows the classic source.
  - `--run-tests` 164/167, the same three failures, and preflight the same 2 inherited findings.
    Both ran on the build before the redundant rule was removed.
  - Not covered:
    - CodeMirror keeps the language the editor opened with until the switch, so Observable JS typed
      into a js cell is linted as JavaScript until Shift-Enter;
    - `import … from "@user/nb"` typed into a new cell of a js module, which parses as both and so
      stays js (js-toolchain compiles it to the same reactive import);
    - an ojs cell with several variables (`mutable`) switched to js.

- 2026-09-13, M6: exporter-4 wired into lopepage-3's save. Both gates pass in Chromium, E0 fails on a
  control, and the headless round trip passes with mutation controls. Nothing committed in lopebooks;
  the module working copies are gitignored.
  - exporter-4 is exporter-3 from lopebooks HEAD (byte-identical to the copy embedded in lopepage-3)
    plus one branch. A head that js-toolchain's `displayStateOf` knows is written as its definition
    and a `$nk` line; the variables it exports get no lines of their own. From the regenerated demo:
    ```
    const _1scsni7 = Object.assign({"inputs":["view","n"],"outputs":["k"],"autodisplay":false,"expression":false,"isAsync":false,"id":3}, { body: (view,n) => {
    const k = view(Object.assign(document.createElement("input"), {type: "range", min: 0, max: 10, value: n}));
    return {k};
    } });
      $nk("_1scsni7", "cell 3", _1scsni7, [["_6jn5m5","k"]]);
    ```
    `$nk` defines the head pending on a promise and each exported name pending on the head, sets
    their pids, then calls `defineCell(main, definition, {variables})` once
    `main.value("module @tomlarkworthy/js-toolchain")` resolves. `defineCell` redefines the same
    variables, so pids survive, and the head's promise settles after it. For this, js-toolchain's
    head reuse was relaxed from "has display state" to "has `_shadow`". The helper and the
    js-toolchain loader are written only into a module that has such a cell.
  - Rejected: passing `display`/`input`/`Mutator` into `define()`. js-toolchain is already an embedded
    module, and importing it needs nothing new in the bootloader. Costs:
    - The cells are pending until js-toolchain loads.
    - The module gains a `module @tomlarkworthy/js-toolchain` variable, which the pane renders as a
      first row `import {} from "/@tomlarkworthy/js-toolchain.js?v=4"`.
  - A js-toolchain bug the round-trip test found. `nkDisplayStates` was `new WeakMap()` with no
    inputs, and a variable that becomes reachable again is recomputed. The test read `displayStateOf`
    through notebook-import `values()`, and after a load it saw no states while `a` resolved to 6:
    the `defineCell` that `$nk` fetched wrote to a map that had since been replaced. The registry is
    now `globalThis[Symbol.for("@tomlarkworthy/js-toolchain/nkDisplayStates")] ??= new WeakMap()`.
    The browser version (`$nk` registering at boot before visualizer-2 observes `displayStateOf`) is
    inferred from the same mechanism, not reproduced.
  - Dead end: the first round trip failed on body text only (`return {a,b}` came back
    `return { a: n * 2, b: "x" }`). bun transpiles a `.js` it `import()`s, so `toString()` is its
    reformatting. The same thing wrote a reformatted title into the demo before it was caught. Loaded
    exports are now evaluated from text with `new Function`.
  - Around it:
    - save-in-place-2 is save-in-place importing `exportToHTML` from exporter-4.
    - visualizer-2 recreates a pane entry when `!!displayStateOf(v)` changes, because an exported
      head is drawn by the inspector until `defineCell` runs. This was not controlled separately.
    - lopepage-3's export anchors import exporter-4.
    - `tools/lopepage-3/export-demo.ts` rewrote notebook-kit-demo through exporter-4: `nk_boot`,
      `nk_sources` and `nkDemoModule` are gone and the five cells are `$nk` lines. It runs headless
      because a paired tab bakes its `cc=` token into an export.
    - assemble.ts inserts js-toolchain, exporter-4 and save-in-place-2, and boots save-in-place-2.
      exporter-3 stays, since claude-code-pairing, file-sync and local-change-history import it.
  - `tools/exporter-4/exporter-4.test.ts`: **9 pass, 0 fail**, 2 scenarios and 7 mutation controls.
    - Round trip: a classic `n`, four Notebook Kit cells (projections, two `display()`, `view()`,
      an expression) and a classic reader, with pids not derivable from definitions, go through
      export → load → export → load. Fingerprints (name, pid, inputs, definition, shadows, cell
      pids), values and display roots are equal at each step, and the third export equals the
      second byte for byte.
    - Classic module: exporter-4's output equals exporter-3's, with exporter-3 read from the
      lopepage-3 notebook.
    - Controls: exported names written as classic cells; names not handed to `$nk`; head pid or
      exported pids not restored; `defineCell` given fresh variables; head written from its body
      function; helper written into every module.
  - `tools/lopepage-3/save-reload-check.ts`: **10 pass, 0 fail**.
    - Page 1: `k * n` is recompiled to `k * n + 100` and `cell 5` switched to
      `viewof foo = Inputs.range([0, 10])`. It saves through save-in-place-2's real `sip_save`,
      with only `showSaveFilePicker` mocked, and the saved file opens as page 2.
    - E0: the demo module's variables, pids, definitions (keys sorted) and shadows are equal, and so
      is the rendered text. Page 2 decompiles the cell to `k * n + 100`, and saving page 2 writes
      the same demo block.
    - E8: `exportModuleJS` through exporter-3 and exporter-4 is identical for all 50 classic modules
      in the page; the demo was skipped.
    - Control, save-in-place-2 importing exporter-3: **5 fail** (saved block, reload render, both E0
      checks, decompile).
    - Key order first failed E0 because editor-6 spreads `body` first; it is not part of a definition.
  - `boot-check.ts` **11 pass** on the exported demo. `--run-tests` 164/167, the same three:
    `test_persistentId` (reported under `@mootari/access-runtime`), `test_tests_example` (timeout)
    and `test_reflectsTitleUpdate`. Preflight shows the same 2 inherited unused-dep findings.
    js-toolchain display-differential 79, editor-6 15 and visualizer-2 9 pass after the registry
    change.
  - Not covered:
    - a real File System Access write (the picker is mocked);
    - pairing's `export_notebook`;
    - a Notebook Kit body containing `import()` through `restoreCanonicalImports`;
    - `autoview`/`automutable` exported names, which js-toolchain's compile never produces;
    - a Notebook Kit module that is not in a pane (conversion is eager, so it should load);
    - exporting the exporter-4 module itself;
    - the `import {}` row.

- 2026-09-13: merging the forks back into their originals is planned in
  `plan/merging-the-notebook-kit-forks.md`: tests on the originals first (the survey found 3 of 43
  tested modules using ui-testing, none of them visualizer, exporter or cell-map), then exporter,
  cell-map, visualizer, editor, lopepage in that order.
