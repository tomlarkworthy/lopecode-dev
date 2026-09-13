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
- Open: the option C module needs `display`/`input`/`Mutator` while its `define()` runs, and the
  prototype takes them as a parameter (`define(runtime, observer, nk = globalThis.__notebookKit)`).
  In a page they could come from a static import of an embedded block, which the es-module-shims
  `resolve` hook maps to `file://<id>` (`knowledge/lopecode-internal-networking.md`); that a
  gzipped attachment can be imported that way is unverified.
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
