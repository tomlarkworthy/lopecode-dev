# Merging the Notebook Kit forks back into the originals

Started 2026-09-13, after M6 of `plan/notebook-kit-editing-system.md`.

The forks were made so the legacy notebooks could not break. Tom, 2026-09-13: *"I don't want to risk
breaking our legacy functionality, so fork into editor-6, visualizer-2 and lopepage-3"*. Once the fork
system worked end to end, he said: *"Its seems feasible that we can merge everything, with a small amount
of work. Please add that to a plan. But I want to make sure we don't break existing functionality, we
shoudl reenforce our tests with more dynamic tests. Check what notebook have decent tests (ui tests are
the best)"*.

A merge undoes the protection the fork gave, so the order here is tests first, merges second. Each
merge is gated by tests that pass on the original **before** the merge and on the merged module after.

## What each fork changes, measured 2026-09-13

Cells and imports were compared by parsing both module sources with acorn: `$def` cells keyed by name,
anonymous cells by pid, and imports as `local <- module.imported`. The originals came from their
declared canonicals and the forks from the working copies embedded in
`lopebooks/notebooks/@tomlarkworthy_lopepage-3.html`. The differ was a scratch script and was deleted;
the counts below are its output.

```
save-in-place -> save-in-place-2   7 -> 7 cells    changed sip_doc, sip_save (text)   import exportToHTML: exporter-3 -> exporter-4
exporter-3    -> exporter-4       94 -> 97 cells   unchanged 83, added nkExtras, nkHelper, one md
                                                  import + displayStateOf <- js-toolchain
lopepage-2    -> lopepage-3       55 -> 55 cells   changed lp2_page (one CSS selector), lp2_menu_defaults (a comment)
                                                  8 imports now point at visualizer-2, editor-6, exporter-4
editor-5      -> editor-6        131 -> 139 cells  unchanged 123, added 8 (routing: cellLanguage, sourceLanguage, defineJsCell, …)
                                                  import + liveCellMap <- cell-map-2, 4 names <- js-toolchain, vizSynced <- visualizer-2
                                                  import - syncers, TRACE_CELL <- visualizer, liveCellMap <- cell-map
visualizer    -> visualizer-2     32 -> 25 cells   unchanged 1, removed 28 (a rewrite on dataflow-templating)
cell-map      -> cell-map-2       63 -> 22 cells   unchanged 1; cellMap, liveCellMap, viewof cellMapModule rewritten
js-toolchain  (edited in place)   26 -> 26 cells   changed defineCell (head reuse), nkDisplayStates (one registry per page)
```

The exporter-3 comparison was made against the lopebooks working tree. That copy carries another
session's uncommitted `isOnObservableCom` edit to `notebook_name`, which is not part of exporter-4.

## Who depends on the originals, measured 2026-09-13

This is an AST scan of every module block in `lopecode/notebooks` and `lopebooks/notebooks`: 243
notebooks and 506 distinct module sources, with 0 that failed to parse. It lists who imports each
original and which names they take.

- **exporter-3**, 243 notebooks:
  - claude-code-pairing takes `exportToHTML`;
  - file-sync takes `exportModuleJS`;
  - local-change-history takes `notebook_title`;
  - lopepage-2 takes `disk_svg`, `downloadAnchor`, `forkAnchor` and `exportModuleJS`;
  - save-in-place takes `exportToHTML`;
  - 22 more modules, in 1 to 34 notebooks each.
- **editor-5**, 242 notebooks:
  - lopepage-2 takes `auto_attach` and `attachContextManu`;
  - grid-container, svg-lens, lopecode-tour, mermaid-lens and infinite-canvas take `cellEditor`;
  - sheet and spreadsheet take the CodeMirror language exports.
- **visualizer**, 242 notebooks:
  - editor-5 takes `TRACE_CELL` and `syncers`;
  - lopepage-2, grid-container, lopecode-tour, sheet, spreadsheet and infinite-canvas take `visualizer`;
  - lopepage v1 (12 notebooks) takes `Inspector`, `lopeviz_handle_css`, `runtime` and `unorderedSync`;
  - moldable-webpage (1) takes `Inspector`, `allVariables`, `cellMaps` and `lopeviz_handle_css`.
- **cell-map**, 243 notebooks:
  - observablejs-toolchain takes `cellMap` and `moduleMap`;
  - command-palette takes `liveCellMap`, `viewof liveCellMap` and `modules`;
  - exporter-3 takes `cellMap`;
  - editor-5 takes `liveCellMap` and `viewof liveCellMap`;
  - visualizer takes `liveCellMap`;
  - robocoop-3 (10) takes `coverage_failures`;
  - agentic-planner (1) and its prototype (1) take `cellMapCompat`.
- **lopepage-2**, 234 notebooks: only lopepage-2-tests imports it.
- **save-in-place**, 232 notebooks: nothing imports it.
- **js-toolchain** and **cell-map-2**: 2 notebooks each.

What a merge in place breaks, from those two measurements:

1. **visualizer-2 removes names that other modules import.** The `visualizer(runtime, {invalidation,
   module, filter, inspector, detachNodes, classList})` call is compatible. Every outside call site
   passes only those keys (grid-container, sheet, lopecode-tour, infinite-canvas, spreadsheet, 5 in
   moldable-webpage, lopepage v1). Both versions call `filter(name, variables, i, state)` and
   `inspector(root)(variable)`. The removed exports are what breaks: `TRACE_CELL`, `syncers`,
   `Inspector`, `lopeviz_handle_css`, `unorderedSync`, `runtime`, `allVariables` and `cellMaps`. No
   custom inspector (grid-container, sheet, infinite-canvas, moldable-webpage) has been run under
   visualizer-2.
2. **editor-6 needs blocks that 240 notebooks lack.** It needs js-toolchain (42 kB plus a 7 kB
   attachment), cell-map-2 (31 kB) and visualizer-2. The imports resolve when `compile_and_update`
   computes, so a notebook without them breaks on its first edit, classic edits included.
3. **editor-6 changes what a classic notebook does with JavaScript-only source.** Vendored
   `@observablehq/parser` 6.1.0 against `transpileJavaScript`:
   ```
   "const x = 1;"  ojs throws: Unexpected token (1:0)             js ok
   "let y = 2"     ojs throws: The keyword 'let' is reserved (1:0)  js ok
   ```
   Today these are syntax errors in a classic notebook. After a merge they would become Notebook Kit
   cells.
4. **exporter-4 imports `displayStateOf` from js-toolchain.** It doesn't need to. The registry is now
   `globalThis[Symbol.for("@tomlarkworthy/js-toolchain/nkDisplayStates")]`, so exporter-3 can read it
   with no import. Classic output is already identical: E8 compared 50 modules in a page.
5. **cell-map-2 lacks five imported names:** `viewof liveCellMap`, `modules`, `moduleMap`,
   `coverage_failures` and `cellMapCompat`. It also changes the map's shape. Imports become one cell per
   import statement, `lang` is derived, there is a `multi` type, an automutable has 4 variables, and a
   lone `viewof x` is dropped. The four silent mismatches against visualizer v1 are tabled in
   `plan/exporter-4-notebook-kit-research.md` (2026-09-12). The `cellMap` calls themselves are
   compatible: observablejs-toolchain calls `cellMap()` and observable-notes calls `await cellMap()`,
   both with no arguments, and cell-map-2's `cellMap` is synchronous. Only the lopecode copies were
   scanned for these call sites.
6. **lopepage-3 and save-in-place-2 hold no change of their own.** They go away once the modules they
   import are merged.

## What the tests cover today, measured 2026-09-13

`bun tools/merge-forks/test-survey.ts` takes one copy per module, the declared canonical if there is
one. It counts:
- `test_*` cells;
- tests that depend on an import from `@tomlarkworthy/ui-testing`;
- tests whose body touches the DOM, by AST: `dispatchEvent`, `click`, `focus`, `querySelector(All)`, or
  `new Event`/`KeyboardEvent`/`PointerEvent`/`MouseEvent`/`InputEvent`/`DragEvent`/`DataTransfer`.

Across the corpus: **43 modules have `test_` cells, 3 use ui-testing, and 7 touch the DOM.** The rows
that matter here:

```
module                                tests  ui  dom gated main copies  notebook
@tomlarkworthy/lopepage-2-tests          21  21   13     0   y      1   lopecode:@tomlarkworthy_lopepage-2.html
@tomlarkworthy/mermaid-lens              24   7    7     0   y      1   lopebooks:@tomlarkworthy_mermaid-lens.html
@tomlarkworthy/editor-5-tests             2   2    1     2   y      1   lopebooks:@tomlarkworthy_editor-5.html
@tomlarkworthy/svg-lens                  60   0    3     0   y      7   lopebooks:tomlarkworthy_svg-lens.html
@tomlarkworthy/observablejs-toolchain   116   0    0     0   y    243   lopecode:@tomlarkworthy_observablejs-toolchain.html
@tomlarkworthy/exporter-3                 9   0    0     0   y    243   lopecode:@tomlarkworthy_exporter-3.html
@tomlarkworthy/editor-5                   8   0    0     0   y    242   lopecode:@tomlarkworthy_editor-5.html
@tomlarkworthy/cell-map                   6   0    0     0   y    243   lopecode:@tomlarkworthy_cell-map.html
@tomlarkworthy/cell-map-2                 7   0    0     0   y      2   lopecode:@tomlarkworthy_cell-map-2.html
```

The survey has no row for **visualizer, save-in-place, command-palette, claude-code-pairing, file-sync,
local-change-history, grid-container, sheet, infinite-canvas or moldable-webpage**, so none of them has
a `test_` cell.

The survey's limits: a test with any other name is not counted, and helpers from other harnesses are not
recognised. "dom" means the body references DOM calls, not that it was seen driving a page.

What the existing tests pin:

- **lopepage-2-tests (21, all ui-testing)**:
  - the layout DSL round trip, and the booted layout matching the hash;
  - `view=` and `open=`, deep links, tab click, close keeping the pane, immortal panes;
  - tab drag to an edge, to a tab bar, and out;
  - splitter drag;
  - the menu plugin registry;
  - the add-module wizard.

  The suite is gated by `&lp2_tests`. It is the strongest suite in the corpus and covers the frame,
  but not visualizer or editor behaviour inside a pane.
- **editor-5-tests (2, gated by `&e5_tests`)**: a changed `cellEditor` factory reaches attached
  editors and keeps an open editor open. **editor-5's own 8** cover literal completion only.
- **exporter-3 (9)**: `normalize`, streaming order, `restoreCanonicalImports`, and the lopebook's
  sentinel and agent orientation. None of them exports a module and loads it back.
- **cell-map (6)**:
  - importInfo on a real import;
  - `importedModule` and `findModuleName`;
  - mutable grouping;
  - every runtime variable is in a cell, and no variable is in two cells.
- **cell-map-2 (7)** pins its own grouping laws against this notebook's cells.
- **Outside the notebooks, for the forks only** (all run 2026-09-13):
  - `tools/lopepage-3/boot-check.ts` (11);
  - `tools/lopepage-3/save-reload-check.ts` (10; its control fails 5);
  - `tools/exporter-4/exporter-4.test.ts` (9);
  - `tools/editor-6/editor-6.test.ts` (15);
  - `tools/visualizer-2/visualizer-2.test.ts` (9);
  - `tools/newobs-replica/cell-map-2*.test.ts`.

  Nothing outside the notebooks tests the originals except `tools/local-grid-check.ts`
  (grid-container) and `tests/notebooks/{svg-lens,plugin-registry,observablejs-toolchain}.test.js`.

**Baselines of the gated suites, 2026-09-13.** Both runs used `bun tools/lope-browser-runner.ts <nb>
--run-tests --hash "<bootconf hash>&<gate>"`, and the logs are in `tools/merge-forks/.out/`.

```
lopepage-2 (lopecode canonical)  186 tests: 183 pass, 2 fail, 1 timeout   test_lp2_*: 21 ok, 0 not ok
editor-5   (lopebooks canonical) 167 tests: 160 pass, 4 fail, 3 timeout   test_e5_*:   0 ok, 2 not ok
editor-5   git HEAD copy         167 tests: 160 pass, 4 fail, 3 timeout   same 7 failures (working tree is clean)
```

Three failures are in both notebooks and in every lopepage-3 run this session: `test_persistentId`,
`test_tests_example` (timeout) and `test_reflectsTitleUpdate`. editor-5 adds four:

- **Both `test_e5_*` tests reject; they do not hang.** `--run-tests` reports them as timeouts.
  `tools/merge-forks/probe-e5-tests.ts` races their promises in page:
  ```
  test_e5_factory_change_reaches_attached_editors   rejected: expect(received).toBeGreaterThan(expected)  Expected: 0  Received: 0
  test_e5_factory_change_keeps_an_open_editor_open  rejected: expect(received).toBe(expected)  Expected: true  Received: false
  ```
  Both fail on their precondition, not on the behaviour under test. The first reads
  `[...editors.values()]` and needs at least one attached editor. The second needs an attached
  editor that is closed. **The cause is a boot race** (found the same day, below): editor-5-tests is
  in `mains`, so both tests compute as soon as the page boots, before `auto_attach` has placed any
  editor, and nothing they depend on changes afterwards, so the rejection stays. A probe of the same
  boot 10 s later read `editors` as `Map(129)`, `attachContextManu` true (the baked
  `cell_options.json` is empty, so it defaults to `!isOnObservableCom()`), and 129 editor hosts in
  the page.
- **`test_ui_ambiguous_name_asks_for_scope` and `test_ui_unknown_cell_is_a_clear_error` fail.** Both
  branch on `runtime.mains` existing and then assume `@tomlarkworthy/ui-testing` is registered in it,
  which is only true in ui-testing's own notebook. Forced in a copy that carries ui-testing without
  booting it:
  ```
  test_ui_ambiguous_name_asks_for_scope   rejected: RuntimeError: ui: no module "@tomlarkworthy/ui-testing"
  test_ui_unknown_cell_is_a_clear_error   Expected pattern: /no cell named "nope" in @tomlarkworthy\/ui-testing/
                                          Received message: "ui: no cell named \"nope\" in its module"
  ```
  In ui-testing's own notebook all 10 `test_ui_*` pass. Not fixed yet; the fix belongs in ui-testing
  on Observable (branch on `runtime.mains?.has("@tomlarkworthy/ui-testing")`).

## Phase 0: tests first

Rule for every suite below: it runs against the **original** module and must pass there before the
merge starts, it runs against the merged module afterwards, and at least one deliberate break (a
mutant or a control copy) makes it fail. A suite that has never failed has not been shown to test
anything (`tools/lopepage-3/save-reload-check.ts` failed 5 checks when pointed at exporter-3).

Where tests live: in-notebook ui-testing suites, gated like `lopepage-2-tests`, because they ship
with the notebook, run under `--run-tests` and survive export. Playwright scripts in `tools/` only
for what a page cannot do to itself: reload, a second page, network accounting. Two hazards from
`feedback_run_tests_misses_unbooted_modules_and_mislabels`:
- a module no main boots has its tests silently skipped;
- a throwing test reports as a timeout.

So every run greps for the expected test names, and every run compares against an untouched copy.

| # | Suite | Pins | Host | Gates merges |
|---|---|---|---|---|
| T1 | exporter round trip, in-notebook | `exportModuleJS` of a fixture module (viewof, mutable, imports, file attachment, anonymous cells) evaluated back into a fresh module; fingerprint equal (the headless `exporter-4.test.ts` shape); E8 over every module in the page | exporter-3 canonical | A |
| T2 | save → reload, Playwright | `save-reload-check.ts` generalised to a lopepage-2 notebook with classic cells only: edit, save through save-in-place, reload, fingerprint equal | `tools/merge-forks/` | A, D, E |
| T3 | visualizer behaviour, in-notebook | a pane renders a module's cells in order; a redefinition updates the node in place; a delete removes it; a new cell appears at its index; `filter`, a custom `inspector` factory and `detachNodes` are honoured; a viewof renders its view; a mutable renders its value variable; an import renders its header. Written against `visualizer()` only, so the same suite runs on visualizer-2. | visualizer canonical, 0 tests today | C |
| T4 | visualizer consumers, Playwright boot | grid-container, sheet, infinite-canvas, moldable-webpage, lopecode-tour: boot, count rendered nodes, no page errors. A baseline file first, then the merged file. | `tools/merge-forks/` | B, C |
| T5 | editor behaviour, in-notebook | extends editor-5-tests with the browser steps boot-check already drives on lopepage-3: the hotbar opens CodeMirror on the decompiled source, Shift-Enter recompiles in place, a new cell is placed after its anchor, a delete, drag reorder with the editor following, and `getOption`/`setOption` persisting | editor-5 canonical | D |
| T6 | cell-map consumer contract, in-notebook | over a fixture with viewof, mutable, two imports from one notebook, an aliased import, anonymous cells: the fields command-palette, editor-5 (`findCell`) and visualizer (`renderImportCell`, `syncers`, `createImportCellHeader`, `variablesForCell`) read. Each of the five shape changes is a named test whose expected value is a decision (Open decisions, 3). | cell-map canonical | B |
| T7 | command-palette, in-notebook | the palette lists the page's modules and cells from `liveCellMap`, and choosing one navigates. It has 0 tests today and imports cell-map in all 243 notebooks. | command-palette canonical | B |
| T8 | corpus gate | `lope-preflight --baseline`, and `--run-tests` on one notebook per layout variant against untouched copies, per `knowledge/resyncing-modules-across-the-corpus.md` | existing tools | every sweep |

T3 and T5 cover behaviour boot-check already exercises on the forks. Writing them against the
originals first is what shows the originals behave that way today.

## Phase 0 progress

### 2026-09-13: ui-testing imported the wrong harness

The first visualizer suite carried `@tomlarkworthy/testing`, reconcile-nanomorph and ui-testing into
the visualizer notebook, because ui-testing imported `expect` from `@tomlarkworthy/testing`. Tom
stopped that: *"not nanomprh, you are using the wrong testing library.
https://observablehq.com/@tomlarkworthy/tests is reflection based only"*, then *"@tomlarkworthy/ui-testing
has a mistake, it should be importing expect from @tomlarkworthy/jest-expect-standalone"*. He fixed it
on Observable, and it was jumpgated in place over `lopebooks/notebooks/@tomlarkworthy_ui-testing.html`
(Observable v53):

- ui-testing now imports `expect` from jest-expect-standalone; the notebook no longer carries
  `@tomlarkworthy/testing`, reconcile-nanomorph or its svg.
- 10/10 `test_ui_*` pass in that notebook (`tools/merge-forks/run-suite.ts`).
- The jumpgate also replaced 26 other blocks with Observable's copies (lopepage-2, visualizer,
  cell-map, exporter-3, editor-5, runtime-sdk, the bootloader, …) and dropped `networking_script`,
  measured by comparing block contents against `git show HEAD`. Uncommitted.
- Three notebooks embedded the old ui-testing: lopecode lopepage-2, lopebooks editor-5 and
  mermaid-lens. editor-5-tests and mermaid-lens also imported `expect` from `@tomlarkworthy/testing`
  themselves. lopebooks editor-5 was updated with its suite (below). lopepage-2 and mermaid-lens
  still embed the old ui-testing.

Rule from here: suites are `test_*` cells found by `@tomlarkworthy/tests`, with `ui` from ui-testing
and `expect` from jest-expect-standalone.

### T3, visualizer behaviour: written, green, mutation-checked, in the canonical

`@tomlarkworthy/visualizer-tests`, 17 `test_viz_*` cells gated by `&viz_tests`. Landed in the lopecode
visualizer canonical as `lopecode@e540cb8` (2026-09-13): HEAD plus bootconf, ui-testing and the
suite, with other sessions' uncommitted edits to that file left in the working tree. Not published
(`canonical.json` records `upstream: null`). A copy of the source is in
`tools/merge-forks/suites/visualizer-tests.js`. Each builds a
module with `createModule`, mounts `visualizer()` off-screen, changes variables and polls the DOM. The
tests read only what `visualizer()` returns, so they can run unchanged against visualizer-2.

Run in a scratch copy of the lopecode canonical (`tools/merge-forks/embed-suite.ts` → 
`.out/visualizer-dev.html`), because that canonical holds another session's uncommitted edits:

```
run-suite.ts               17/17 ok
--run-tests (real harness)  181 tests, 176 pass; the 3 usual + the 2 ui-testing scoping tests above;
                            the untouched canonical: 155 tests, 152 pass, the 3 usual
mutate-suite.ts            10/10 mutants killed (tools/merge-forks/visualizer-mutants.json)
```

The first mutation run killed 9. "Unrendered variable keeps its observer" survived, since it leaves
no trace in the DOM; `test_viz_a_cell_leaving_the_map_releases_its_observer` was added for it.

What the first draft got wrong, found by probing rather than assumed:

- **`@tomlarkworthy/modules` computes a module's first cell** to find its title
  (`module-map` `moduleTitle` → `peekValue` → runtime-sdk `observe`), and keeps a `{fulfilled, error}`
  listener on it. A fixture whose first cell was under test ran before any visualizer existed. Every
  fixture now starts with a `title` cell.
- **Referencing a builtin makes an implicit variable that renders.** `Generators`, `Mutable` and
  `@variable` in a fixture produced a `module builtin` import header and an `@variable` node. The raw
  visualizer renders them. lopepage-2 hides them with `filter: variables?.[0]?._type !== 1`, which
  also hides any import group whose first variable is implicit. The tests exclude them from names.

Behaviour observed and deliberately not asserted, so a merge can change it:

- Renaming a variable keeps its node but leaves `cell="a"` (the attribute is set when the inspector
  is made).
- Unmounting takes effect only at the next `liveCellMap` change: `syncers` depends on
  `viewof visualizersToDelete` (the view), so invalidation alone does not rerun it. The unmount test
  makes one more change first.
- A visualizer with `detachNodes: true` takes an element value away from one without; the node left
  behind is empty.

### T5, editor behaviour: the existing suite's failure is a race

A copy of the editor-5 canonical whose two tests first poll for their precondition (every 200 ms, up
to 20 s, scenario timeout 40 s) passes 2/2: `129/129 attached editors rebuilt by the new factory`,
`an open editor stayed open across the factory swap`. editor-5-tests is published on Observable, so
the fix goes there. Patched source: `tools/merge-forks/suites/editor-5-tests.js`.

Landed in the lopebooks editor-5 canonical as `lopebooks@4474a896` (2026-09-13), with `expect` from
jest-expect-standalone and ui-testing synced from its canonical. Under `--run-tests` with
`#view=S100(@tomlarkworthy/editor-5)&e5_tests`:

```
before  167 tests, 160 pass; both test_e5_* reported TIMEOUT
after   167 tests, 162 pass; both test_e5_* ok; the 3 usual + the 2 ui-testing scoping tests fail
```

The Observable copy of editor-5-tests is now behind these two cells. `@tomlarkworthy/testing`, its
svg and reconcile-nanomorph are still embedded in that notebook with no importer.

### Tools

- `tools/merge-forks/embed-suite.ts`: copy of a notebook with a suite module (added to `mains`) and
  carried blocks, inserted before `bootconf.json`.
- `tools/merge-forks/run-suite.ts`: forces one module's `test_*` cells with `module.value()` and races
  each, so a rejection prints its stack instead of reading as a timeout.
- `tools/merge-forks/mutate-suite.ts`: one exact-string mutant per copy, suite run against each, a
  mutant no test fails reported as SURVIVED.
- `tools/merge-forks/fold-suite.ts`: moves a suite module's cells and imports into the module it
  tests, located with acorn; refuses a clashing name, pid or import; removes the suite block and its
  mains entry.
- `tools/merge-forks/rm-blocks.ts`: removes blocks, refusing while any module block still names
  `"module <id>"`, a removed module's attachments are left behind, or the id is in mains.

### 2026-09-13: the tests are cells of the module they test

Tom, on the separate-module landing above: *"no I mean the test code should be in the module, they
are part of it."* Both suites were folded in with `fold-suite.ts`:

```
lopecode@02a8e30   @tomlarkworthy/visualizer  +21 cells (17 test_viz_*), visualizer-tests block gone
                   run-suite 17/17, mutants 10/10, --run-tests 177/182 (same as e540cb8)
lopebooks@80f9d28d @tomlarkworthy/editor-5    +4 cells (2 test_e5_*), editor-5-tests block gone
                   run-suite test_* 10/10, --run-tests 162/167 (same as 4474a896)
```

Tom then asked that lopepage-2 and mermaid-lens stop bringing in nanomorph:

```
lopebooks@80f9d28d editor-5     testing, its svg, reconcile-nanomorph removed (no importer left)
lopecode@aa6edef   lopepage-2   ui-testing synced; the same 3 blocks removed; lopepage-2-tests
                                fixture @tomlarkworthy/testing -> jest-expect-standalone
                                run-suite 21/21 -> 19/21 -> 21/21; --run-tests 183/186 = HEAD
uncommitted        mermaid-lens ui-testing synced; its expect import repointed to
                                jest-expect-standalone; testing + svg removed; run-suite 24/24
```

mermaid-lens is an untracked notebook from another session, so it was edited in the working tree
and not committed.

Cost not yet paid: visualizer and editor-5 now import ui-testing and jest-expect-standalone, so each
of their consumers needs those two blocks at its next sync, or preflight reports
`missing-import-lazy`. The imports are lazy; nothing loads until a test cell is observed.

Pushed to Observable the same day on Tom's "yes push to observable push those new tests in cannonical
notebooks" (imports and the md heading by raw WS, named cells with `lope-push-ws --cells`):

```
visualizer         v2439 -> v2462  19 cells before "### imports", md`## Tests`, runtime-sdk import
                                   + createModule, deleteModule, imports of ui and expect
editor-5           v4021 -> v4026  3 cells at the end, imports of ui and expect
lopepage-2-tests   v34   -> v48    12 fixture cells modified; expect now from jest-expect-standalone
```

Checked afterwards: `cellwise-diff` reports no difference for any of the three.
`probe-observable-annotate` errors are the same before and after, comparing each pre-push version
(`@x@<version>`) against the current one:
- visualizer: 0 before, 0 after.
- editor-5: the same 10 before and after; they are hotbar/editor cells that need a page.
- lopepage-2-tests: 0 after.

An `insert_node` with `new_node_mode: "md"` is rejected with status 400. The heading went in as a js
cell holding `md\`…\``. The old `@tomlarkworthy/editor-5-tests` notebook on Observable is left as it
was.

## Merges, lowest risk first

**A. exporter-3 absorbs exporter-4.**
- Read the display-state registry through its `Symbol.for` key instead of importing `displayStateOf`,
  so no notebook gains a block.
- Repoint save-in-place-2 and lopepage-3 at exporter-3, then delete exporter-4 and save-in-place-2.
- Gate: T1, T2, E8, and `save-reload-check.ts` on lopepage-3.

**B. cell-map takes cell-map-2.**
- Add the five missing names to cell-map-2. `viewof liveCellMap` moves in from editor-6, which
  currently defines its own with a feed. `moduleMap` and `modules` bring module-map back as a
  dependency, unless `currentModules` serves those importers.
- Settle which name survives (Open decisions, 3), then sweep the importers.
- Gate: T6, T7, T4, T8, and the cell-map-2 suites.

**C. visualizer takes visualizer-2.**
- Either shim the eight removed exports, or migrate their importers: editor-5 (a merge D problem
  anyway), lopepage v1 (12 notebooks) and moldable-webpage (1).
- Gate: T3 on both versions, T4, and lopepage-2-tests.

**D. editor-5 takes editor-6.**
- Carries js-toolchain and cell-map-2 into every notebook that has editor-5 (242). Carrying them in
  follows `sync-module --carry-deps`, and every carried block is a missing-import risk until preflight
  passes.
- Needs Open decision 2 first.
- Gate: T5, `tools/editor-6/editor-6.test.ts`, boot-check, and T2.

**E. lopepage-2 takes lopepage-3's two lines.**
- The notebook-kit demo becomes a lopepage-2 notebook.
- Gate: lopepage-2-tests, boot-check and save-reload-check on that notebook.

A is independent of the rest. B must land before D, because editor-6 reads cell-map-2's map. C must
land with or before D, because editor-6's `auto_attach` waits on visualizer-2's `vizSynced`.

## Open decisions for Tom

1. **exporter-3 reading a global registry.** CLAUDE.md tip 9 prefers imports over private APIs.
   - Cost of the import: js-toolchain in 243 notebooks.
   - Cost of the global: a contract only a comment documents.
2. **JavaScript-only source typed into a classic notebook** (`const x = 1;`).
   - Keep routing by parse: the cell becomes a Notebook Kit cell.
   - Or route to js only in a module that already holds a Notebook Kit cell: the syntax error stays,
     and mixed modules still work.
3. **Which name survives.**
   - Option: `cell-map` keeps its name and takes cell-map-2's content, and cell-map-2's 3 importers
     move.
   - Option: cell-map's 8 importing modules move to `cell-map-2`.

   The same question applies to visualizer and editor.
4. **Shims or migration** for visualizer v1's removed exports.
5. **Publishing.** Nothing here is approved for Observable, jumpgate or git push. The merges are local
   until Tom says otherwise.

## Not measured

- How command-palette reads the map.
- Any visualizer consumer's custom inspector under visualizer-2.
- The consumer call sites of `cellMap`, which were read from the lopecode copies only.
- T1, T2, T4, T6, T7 and T8 are not started. T5 so far is only the race fix; the hotbar,
  Shift-Enter, insert, delete and drag steps are not written.
