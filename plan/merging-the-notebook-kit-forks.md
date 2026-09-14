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

### 2026-09-14: autonomous run in `worktrees/merge-forks`

Tom, going to sleep: *"ok lets do it all but in a worktree so we don;t risk breaking main. I am sleeping
now so work autonomosly"*. Everything from here is on branch `merge-forks` in the outer repo, lopecode
and lopebooks, in `worktrees/merge-forks` (submodule worktrees at `worktrees/merge-forks/{lopecode,lopebooks}`).
Nothing is pushed, published or jumpgated. The main checkout is untouched.

### T1, exporter round trip: in exporter-3, green, mutation-checked

`lopecode@3a5b839`. Three `test_*` cells and a helper, folded into `@tomlarkworthy/exporter-3` with
`fold-suite.ts` (source: `tools/merge-forks/suites/exporter-3-tests.js`):

```
test_exportModuleJS_round_trip               fresh Runtime: pid-fixed cell, anonymous cell, viewof, mutable,
                                             import from @u/lib -> export -> load -> same names, pids, inputs,
                                             definitions and values; re-export byte-identical
test_exportModuleJS_lists_file_attachments   loader map written for a module with attachments
test_exportModuleJS_every_page_module_loads  every named module on the page: export, acorn parse, load
                                             into a fresh runtime, same cells and import names

run-suite                    12/12 ok   "ok: 44 modules, 1888 variables"
mutate-suite (8 mutants)     8/8 killed (tools/merge-forks/exporter-3-mutants.json)
--run-tests                  HEAD 155 tests / 149 pass -> 158 / 152, the same 6 non-passing names
```

Two mutants are each killed by one test only: "canonical imports not restored" by
`every_page_module_loads`, "file attachments not written" by `lists_file_attachments`.

Four things the first draft got wrong, each found by a failing run:
- `new Runtime(builtins)` takes **definitions**, not values: `{Mutable}` made the runtime call
  `Mutable()` without `new` ("Object.defineProperties called on non-object"). It is
  `{Mutable: () => Mutable}`.
- exporter-3's own `generate_define` template contains the text `export default function define(`,
  so a `.replace` of that text broke 3 of 44 modules. The loader finds the `ExportDefaultDeclaration`
  with acorn.
- `runtime.fileAttachments` is added to the page's runtime **instance** by the bootloader, not to the
  class: 13 modules failed with "runtime.fileAttachments is not a function" in `new _runtime.constructor()`.
- `lope-preflight`'s `attachmentsOf` is a regex over the whole module text. A fixture cell calling
  `FileAttachment("data.csv")`, and then an assertion quoting the literal loader-map text, each produced
  a NEW `missing-attachment` for exporter-3. The assertion now builds that text with `JSON.stringify`.
  The regex is still there; an AST version would look only inside the define body.

### T2, classic save → reload: green, controls fail

`tools/merge-forks/classic-save-reload-check.ts`, on the exporter-3 notebook (lopepage-2 frame, classic
`save-in-place` saving through exporter-3's `exportToHTML`). It redefines the anonymous md cell `_1noor04`,
adds `t2_added`, saves through the real `sip_save` with the file picker mocked, opens the saved file and
saves it again:

```
exporter-3 notebook                         14/14
control: mutant "pid replaced by a fresh name"      7 checks fail (pids of every main module)
control: mutant "variables emitted in reverse order" 6 checks fail
```

`tools/merge-forks/export-golden.ts` is the before/after differential: every named module's
`exportModuleJS` source through a chosen exporter, written to a directory or checked against one,
with the modules a merge is meant to change named up front.

### Merge A: exporter-3 absorbed exporter-4 (done in the worktree)

**Decision 1 taken: the global registry.** exporter-3's `displayStateOf` is a local cell,
`variable => globalThis[Symbol.for("@tomlarkworthy/js-toolchain/nkDisplayStates")]?.get(variable)`, so
no notebook gains js-toolchain. The cost, a contract documented only in prose, is paid in exporter-3's
Notebook Kit doc cell. The import would have put a 42 kB block (plus a 7 kB attachment) into 243 notebooks.

Applied with `tools/merge-forks/merge-cells.ts` (acorn: take/add/define/drop/repoint cells, pids kept),
plans in `tools/merge-forks/plans/`:

```
lopecode@069d881    A1  exporter-3: take generate_definitions, generate_define, variableToDefinition,
                        variableToDefine from exporter-4; add nk_doc, nkExtras, nkHelper; new displayStateOf
lopebooks@81c154cc      exporter-3 lopebooks canonical synced to the same block
lopebooks@e2789409  A2-A4  lopepage-3: exporter-3 synced in; 5 imports repointed; mains save-in-place-2 ->
                        save-in-place; demo prose; exporter-4 and save-in-place-2 blocks removed (146220 bytes)
```

Against exporter-4 the merged module differs only in its own name (title, fork link, warn prefix,
agent orientation), the registry paragraph, the local `displayStateOf`, the missing js-toolchain import,
and the T1 cells. save-in-place-2 had differed from save-in-place in 4 lines, all naming the exporter.

Gates:

```
exporter-3 notebook, merged      T1 12/12; T2 14/14
  export-golden vs pre-merge     44 byte-identical, exporter-3 differs (its own source)
exporter-4.test.ts               9/9 with EXPORTER=<merged exporter-3>, displayStateOf NOT injected
                                 (2 Notebook Kit round-trip scenarios + 7 mutants, through the registry)
lopepage-3, merged               save-reload-check 9/9 (E0); boot-check 11/11
  export-golden vs exporter-4    49 -> 48 modules: 44 byte-identical; differ exporter-3, lopepage-3,
  page before the merge          notebook-kit-demo; missing exporter-4, save-in-place-2; added save-in-place
                                 (each diff read: only the repointed names)
lopebooks exporter-3 canonical   T1 12/12, preflight 0 NEW
```

E8 in `save-reload-check.ts` (exporter-3 vs exporter-4 in one page) cannot run once exporter-4 is gone;
it now reports itself as not run, and `export-golden` against the pre-merge page replaces it.

Left as they are, and why:
- 2 `unused-dep` findings in lopepage-3 (`dataflow-templating` `instancingCost`, `file-sync` `jbApply`)
  are byte-identical to their canonicals, which carry the same findings in the baseline. The lopebooks
  commits skip `lope-preflight` for this notebook, as its first commit did. Fixing them means editing those
  two canonicals; for `jbApply` it is not clear which side is right (`importShim(path)` upstream,
  `import(path)` locally).
- A js-toolchain comment still says "A head exported by exporter-4"; js-toolchain is not part of merge A.
- `tools/lopepage-3/export-demo.ts` still loads `modules/@tomlarkworthy/exporter-4.js`. It is a one-off
  converter that exits on a converted demo.
- No consumer was swept. exporter-3 is in 243 notebooks; syncing the merged block out is the large-blob
  step and waits for Tom.

### T4, visualizer consumers: baseline taken before merges B and C

`tools/merge-forks/consumer-boot-check.ts --write tools/merge-forks/t4-baseline-before-B.json`, outer
`f5bf057`. It boots each notebook headless, waits 10 s after `mains` appears, and records rendered
`.observablehq` nodes, error nodes, `.lope-viz-import` headers and distinct page errors. `--check` fails
on fewer nodes, more error nodes, or a page error the baseline lacks. One notebook per visualizer
importer from the 2026-09-13 AST survey; sheet is embedded only in the newsletter, so the newsletter
stands in for it.

```
lopebooks grid-container            36 nodes  0 errors   5 import headers  0 page errors
lopecode  quick_start              111        0         23                0
lopebooks lopecode-newsletter-002  113        0          6                0
lopebooks spreadsheet               81        0          5                0
lopebooks infinite-canvas           98        0         18                0
lopebooks moldable-webpage         100        1         14                0
lopecode  lopecode-tour            135        0         22                0
lopecode  @tomlarkworthy_lopepage   75        0         17                0
```

The first baseline run used a stale list (`@tomlarkworthy_sheet.html` and a lopecode moldable-webpage,
neither of which exists) and recorded 3 notebooks. lopecode-tour read 151 nodes and 24 headers in that
run and 135 and 22 in this one, the same file on the same day. A 10 s wait does not give a stable node
count for that notebook, so `--check` compares with `<`, and a drop there has to be rerun before it is
believed.

### T6, cell-map consumer contract: v1 green, cell-map-2 fails 2 contract tests

`tools/merge-forks/suites/cell-map-tests.js`, folded into `@tomlarkworthy/cell-map` in both canonicals
(`lopecode@1e0eec1`, `lopebooks@93dce1ba`; the two blocks were byte-identical before and after). The
first commit attempt was refused by `lope-preflight`: the fixture declared `Generators` and `Mutable`,
which it only names as strings in `define()` inputs. Fixed in the suite, 0 NEW. The fixture builds
one throwaway module holding a named cell, an anonymous cell, `viewof x`, `mutable m` (as
`initial m`/`mutable m`/`m`) and three imports from one library, one aliased (`x as c`). The library is a
`<script type="text/plain">` module block added for the test, and the module variable's loader is realized
through runtime-sdk's `realize`, so the import variables go through the page's import hook the way a
booted export does.

```
                         cell-map (v1)    cell-map-2
run-suite (test_cellmap_)    14/14           7/12
mutants                       9/9 killed      -
```

The first version of the fixture defined the module variable as `() => lib`. cell-map-2 recognises an
import cell by its loader body (`runtime.module(` and `import(`), so under that fixture it put `a`, `b`
and `c` in no cell and failed `every_variable_in_exactly_one_cell`. That was the fixture, not
cell-map-2: with the loader in exported form the test passes.

What cell-map-2 does differently, from the failing run (`.out/t6-run2.log`). These are the merge B
decision list:

| test | v1 | cell-map-2 | kind |
|---|---|---|---|
| `contract_mutable_cell` | name `mutable m` | name `initial m` (the union-find root is the seed) | contract: fix in B |
| `contract_import_cells` | specifiers `a as a`, `b as b`, `x as c` | `c as c` | contract: fix in B |
| `shape_anonymous_cell_lang` | `["ojs"]` | `["ojs", "js"]` | shape |
| `shape_import_cell_variables` | `a, b, c, module X` | `module X, a, b, c` | shape |
| `shape_import_cell_sorts_by_its_first_import` | the import cell sorts at `a` (last here) | it sorts at the module variable (first here) | shape |

Why the alias is lost: once a legacy `(_, v) => v.import("x", "c", _)` runs, the runtime redefines `c`
with the remote variable as its only input, so cell-map-2's fallback, which reads `.import("x"` out of
the definition text, finds nothing and uses the local name. The remote end is still on the variable,
as `c._inputs[0]._name`, which is runtime data. Unverified until merge B tries it.

Passing on both: every variable in exactly one cell, non-import cells in runtime order, the named cell,
the anonymous cell's falsy name (`0`), `viewof x` as `[viewof x, x]`, every cell's `variables[0]` having
a definition, and one import cell per library.

### T7, command-palette: green, mutation-checked

`tools/merge-forks/suites/command-palette-tests.js`, folded into `@tomlarkworthy/command-palette`,
gated by `&cp_tests`. Each test adds a module with one uniquely named cell, opens the overlay, types the
name and polls for the row.

```
test_cp_search_lists_a_new_cell        label, module and href = linkTo(module#name)
test_cp_enter_navigates_to_the_cell    Enter: hash changes to the cell, overlay closes; hash restored
run-suite 2/2, mutants 7/7 killed (tools/merge-forks/command-palette-mutants.json)
```

Four of the seven mutants (module name lost, named cells not indexed, cell named by its type, link to
the module) are killed in the fixture, which times out waiting for the row, rather than by an assertion.

### T5, editor behaviour: written, green, mutation-checked

`tools/merge-forks/suites/editor-5-behaviour-tests.js`, folded into the lopebooks editor-5 canonical next
to the two `test_e5_factory_*` cells, same `&e5_tests` gate. Each scenario adds a throwaway module with
`alpha = 1`, `beta = alpha + 1`, `gamma = 3` (bodies realized through runtime-sdk in compiled form), opens it
with `navigate(linkTo({open}))`, waits for an editor host beside every cell node, and closes and deletes
it in `finally`.

```
test_e5_hotbar_opens_the_decompiled_source             hotbar click -> .cm-content is "beta = alpha + 1"
test_e5_shift_enter_recompiles_the_cell_in_place       EditorView.findFromDOM, replace doc, synthetic
                                                       Shift-Enter keydown -> the same variable computes 101
test_e5_add_button_places_the_new_cell_after_its_anchor .add-cell-btn -> new variable and node right after alpha
test_e5_delete_button_removes_the_cell                 toolbar 🗑️ -> variable, node and editor host gone
test_e5_hotbar_drag_reorders_and_the_editor_follows    PointerEvents on the hotbar -> gamma first in the
                                                       runtime and the pane, every editor still beside its cell
test_e5_cell_options_round_trip                        setOption/getOption, stored under module.cell.option

run-suite test_e5_ (scratch fold)   8/8
mutants                             7/7 killed (tools/merge-forks/editor-5-behaviour-mutants.json)
```

Two failures on the way, both in the tests:
- The options test first timed out with `getOption` already returning 7 before the test had set anything.
  The cell depended on `setOption`/`getOption`; those depend on `findCell`, which depends on `modules`, so
  the fixture's `createModule` redefined them and the test cell restarted part way through, seeing its
  previous run's write. It reads both through `t.value` at call time now. The other tests depend only on
  values that do not change when a module is added.
- The lopebooks commit was refused by `lope-preflight`: the drag test declared `expect` and used only
  `until`. Removed from its deps.

The "editor placed before its cell" mutant (`div.after` -> `div.before` in `auto_attach`) fails 6 of 8,
because every fixture waits for the editor to be the cell's next sibling. The two factory tests do not
check placement.

### Merge B: cell-map absorbed cell-map-2 (done in the worktree, 2026-09-14)

Direction taken: `cell-map` keeps its name and its v1 cells (`viewof liveCellMap`,
`maintain_live_cell_map`, `findModuleName`, `importedModule`, the viz), and `cellMap` itself is
replaced by cell-map-2's runtime-data grouping. The merged module defines every name cell-map-2
defines (set difference of `$def` names: empty), so its three importers (`cell-map-viz` in the
cell-map-2 notebook, `visualizer-2` and `editor-6` in lopepage-3) can point at `cell-map` without a
missing export. The observablejs-toolchain import (`decompileImport`) is gone.

The merge is `tools/merge-forks/plans/B1-cell-map.json`, applied by `merge-cells.ts` (a `redefine` of
`_17c6bac` from cell-map-2's `_1ki5sl4`, 15 cells added, 8 exact-string replaces). Applied to the
lopecode canonical it is byte-identical to the scratch copy the numbers below come from.

```
                                     cell-map v1   cell-map-2 as forked   merged
run-suite (all test_)                   20/20            -                27/27
T6 contract + shape tests               14/14           7/12              14/14 (3 shape expectations changed)
mutants reverting each B1 fix             -              -                5/5 killed
cell-map-2 bun suites (headless)          -         17 pass, 2 fail      15 pass, 4 fail
```

The first B1 run was 23/25, and both failures were cell-map-2 bugs that neither its own suites nor T6
had seen, found on the cell-map notebook's own runtime with `.out/probe-cm-b1.ts`:

- **Named cells read as imports.** cell-map-2 calls a variable an import when its body contains
  `runtime.module(` and `import(`. 7 cells were import cells with no specifiers, among them bootloader
  `boot`, `cellMapFixture`, import-notebook `importNotebook`, exporter-3 `getSourceModule`,
  observablejs-toolchain `importFake` and file-sync `filesToNotebook`. `test_cellmap_importInfo_on_real_import`
  picked `boot` as the first import. Fix: only an unnamed variable, a `cell N` holder or a `module X`
  variable can be an import cell.
- **Real cells dropped by a same-named global.** An input that names a cell defined later resolves to the
  browser global first (`window.toolbar`, `window.history`, a `main` element), and the runtime leaves that
  implicit type-2 variable in `runtime._variables` after the real cell is defined. cell-map-2 keyed by name
  before filtering non-cells, so the real cell went with it. 8 were missing: `main` in module-map,
  import-notebook, visualizer, fileattachments and exporter-3, exporter-3 `networking_script`, editor-5
  `toolbar`, local-change-history `history`. Fix: filter non-cells before keying.

Each has a T6 test now (`contract_named_cell_calling_a_loader_is_not_an_import`,
`contract_a_resolved_global_does_not_hide_a_cell`); v1 passes both. The second one first broke every
contract test: `variable.delete()` on the left-behind implicit variable reaches the bare `throw new Error`
in runtime `variable.js` (its name's scope slot belongs to the real cell), so runtime-sdk's
`deleteModule` threw part way through the teardown (v1 5/20, merged 11/27). The fixture now removes such
variables from `runtime._variables` first. `deleteModule` will throw the same way on any module holding
one, editor-5 included; not fixed here.

The two contract fixes T6 had already asked for went in as well: a `mutable m` cell is named `mutable m`
rather than after its seed, and an alias whose definition has been rewritten by the runtime takes its
imported name from the remote input (`c._inputs[0]._name`), which T6 had marked unverified. Shape
decisions, each an expectation changed in the suite with a dated comment:

| shape test | kept |
|---|---|
| `shape_anonymous_cell_lang` | cell-map-2's `["ojs", "js"]` |
| `shape_import_cell_variables` | cell-map-2's runtime order, module variable first |
| `shape_import_cell_sorts_by_its_first_import` | v1's: an import cell sorts at its first imported symbol (a B1 replace) |
| `shape_import_from_a_module_value_names_its_module` | neither: v1 says `<unknown 0.47…>` when `module X` is bound to a value, cell-map-2 had no import cell there at all; the merge names the module (added after T3, see below) |
| `shape_import_cell_before_its_imports_resolve` | neither: v1 and cell-map-2 both map an uncomputed import variable to a simple cell of its own; the merge puts it in its import cell (added after T3, see below) |

`meta: { variables }` is added to `importInfo`. The 4 bun-suite failures: 2 are working copies that do not
exist (`notebook-kit-semantics.js`, `cell-map-viz.js`, failing on the fork too); "liveCellMap depends on
runtime_variables" fails because the merge keeps v1's `viewof liveCellMap` plus `maintain_live_cell_map`;
"a COMPILED module's imports" expects cell-map-2's 3 loaders and the merged module has 7, and passes when
the expectation is changed to 7.

editor-6's own `viewof liveCellMap` and `liveCellMapFeed` become redundant once it imports `cell-map`
(merge D).

Syncing the merged block into consumers exposed a gap that is not merge B's: moldable-webpage embeds an
older cell-map that never imported `@tomlarkworthy/modules`, and v1 does, so v1 would open the same
`missing-import`. The gate copy carries `modules` in from its canonical, which also clears the
pre-existing `editor-5 imports @tomlarkworthy/modules` finding there. spreadsheet reports 4 NEW findings
against the baseline, and the same 4 on its HEAD copy; its baseline entry is stale.

Gates, run 2026-09-14 with the merged block synced into the working tree of every gate notebook
(`.out/gateB.log`):

```
run-suite  cell-map lopecode / lopebooks canonical      27/27, 27/27
run-suite  T7 command-palette (cp_tests)                2/2
run-suite  T5 editor-5 lopebooks (e5_tests)             16/16, none skipped
T4 --check                                              FAIL: moldable-webpage rendered nodes 100 -> 98
                                                        (every other notebook: nodes and headers up by 1-3)
T8 corpus-gate (HEAD vs working tree, --run-tests)
  quick_start                    219/232 -> 239/253   lost runtime-sdk#test_reflectsDelete
  cell-map                       166/169 -> 173/176
  infinite-canvas                152/155 -> 173/176
  computational-blogs (nested C) 164/168 -> 185/189
  editor-5 (lopebooks)           168/173 -> 189/194
  lopepage-2                     183/186 -> 204/207
  exporter-3                     152/158 -> 173/179
  preflight                      0 NEW, 0 resolved
```

The +21 tests per notebook are the cell-map suite arriving with the block. T3 did not run in that pass:
it was pointed at `@tomlarkworthy/visualizer-tests`, which `lopecode@02a8e30` had already folded into
`@tomlarkworthy/visualizer`.

Following up each failure (`.out/gateB2.log`):

- **quick_start `test_reflectsDelete` is flaky.** A second corpus-gate run on quick_start lost nothing,
  and its HEAD copy scored 218/232 there against 219/232 in the first run.
- **T3 found an import with no header.** Rerun with the right module, 16/17:
  `test_viz_imports_render_one_header_per_module` waited 8 s for the header. Its fixture binds
  `module @tomlarkworthy/lopepage-urls` to a value (`() => urls`). cell-map-2 recognises an import only by
  a loader body, and its aliases are two-parameter `v.import` bodies that are excluded on purpose, so
  nothing in that group is an import cell. Not caused by the B1 import rule; cell-map-2 as forked has it.
  Fix in B1: a `module X` name is an import cell whatever its definition, since only the compiler writes
  that name. New T6 test `contract_import_from_a_module_value`.
- **moldable-webpage's 100 -> 98 is merge B.** `.out/probe-viz-nodes.ts` lists nodes by pane, kind, cell
  name and text. HEAD against a control copy with v1 cell-map and `modules` carried: 100 -> 100, the only
  difference a random number in the `module builtin` header. Control against merged:
  ```
  -1  ? | import | module builtin | import {__ojs_runtime, __ojs_observer} from "<unknown 0.89…>"
  -1  ? | cell   | location | location
  -1  @tomlarkworthy/moldable-webpage | import | module @tomlarkworthy/exporter | import {exporter} from "@tomlarkworthy/exporter"
  +1  @tomlarkworthy/moldable-webpage | import | module @tomlarkworthy/exporter | import {exporter} from "/@tomlarkworthy/exporter.js?v=4"
  … the same swap for every import header in the notebook (10)
  ```
  The two dropped nodes are the implicit `builtin` import and the implicit `location` global, which v1
  rendered and lopepage-2 already hides; kept as a shape change. The header text is a regression:
  visualizer renders `from "${importInfo.from}"`, v1's `decompileImport` sets `from` to the module name,
  and cell-map-2 set it to the loader URL. Fix in B1: `from` is the notebook name, else the `module X`
  name without its prefix, else the URL. `contract_import_cells` now asserts `from`.
  With that fix the same probe reads (`.out/gateB3.log`):
  ```
  -1  ? | import | module builtin | import {__ojs_runtime, __ojs_observer} from "<unknown 0.67…>"
  -1  ? | cell | location | location
  -1/+1  editor_view error text: "variables is not iterable" -> "(variables || runtime._variables) is not iterable"
  100 -> 98 nodes
  ```
  Every import header now reads as before. The remaining 2 nodes are the implicit variables above, so
  T4's node count for moldable-webpage stays at 98 by decision; the baseline file is not rewritten.
- **T3's header test still failed after the `from` fix.** merged `cellMap` set an import cell's
  `module_name` (visualizer's `data-module-name`) from `importInfo.notebook`, which a value-bound module
  does not have. Fix in B1: `module_name` comes from `importInfo.from`. `contract_import_from_a_module_value`
  asserts it, and a B1 mutant reverts it.
- **Then T3 got its header, and two extra cells.** `t.names(root)` read
  `["a", "import @tomlarkworthy/lopepage-urls", "linkTo", "nh"]`. Until an import variable is computed its
  inputs are `[module X, @variable]` in its own module, and cell-map-2 deliberately leaves such a variable
  out of the import cell (its bun suite: "merging would retype those cells as import and move the grouping
  counts"). visualizer's `liveCellMap` is not recomputed when the runtime later rewrites those inputs, so
  the stale map drew them as cells. v1 does no better on that input: a new test,
  `shape_import_cell_before_its_imports_resolve`, maps an unresolved `k` and `j` to two simple cells on v1
  (22/23 on the first run, as a contract test). v1 passes T3 on timing: its `cellMap` awaits
  `decompileImport`, so the live map lands after the imports resolve; cell-map-2's `cellMap` is
  synchronous. Recorded as a shape test with v1's value; B1 groups such a variable with the import cell its
  `module X` input belongs to and changes the expectation. A B1 mutant reverts it.

With the four fixes (`.out/gateB5.log`): T3 on the visualizer canonical with the merged block 17/17,
header `import {linkTo, navHref as nh} from "@tomlarkworthy/lopepage-urls"`; merged suite 30/30;
9/9 B1 mutants killed; moldable-webpage reads as in the probe above (98, the two implicit nodes).

Final gate, 2026-09-14, the committed block (`lopecode@9565e93`) synced into the working tree of the 15
gate notebooks, `.out/gateB7.log`:

```
preflight (15 notebooks)   7 NEW, all tomlarkworthy_spreadsheet.html; the same 7 on its
                           lopebooks HEAD copy (stale baseline entry, not merge B)
T7 command-palette         2/2
T5 editor-5 (lopebooks)    16/16
T3 visualizer              17/17
T4 --check                 FAIL only moldable-webpage 100 -> 98 (by decision above); its 1 error is
                           editor_view, present in the baseline (errors: 1)
T8 corpus-gate             HEAD -> now
  quick_start                    218/232 -> 242/256
  cell-map                       176/179 -> 176/179
  infinite-canvas                152/155 -> 176/179
  computational-blogs (nested C) 164/168 -> 188/192
  editor-5 (lopebooks)           168/173 -> 192/197
  lopepage-2                     183/186 -> 207/210
  exporter-3                     152/158 -> 176/182
  preflight                      0 NEW, 0 resolved -> ok
```

No notebook lost a test; the +24 are the cell-map suite arriving with the block. The consumer syncs stay
uncommitted in the working tree: sweeping consumers is left for Tom.

### Merge C: plan written, not yet run (2026-09-14)

`tools/merge-forks/plans/C-visualizer.json`, written and dry-run by a subagent without a browser. It
needed four new `merge-cells.ts` ops, all acorn-located: `rewrite` (host cell keeps pid and name, takes
code and deps from the plan), `dropCells` (refused while a remaining cell depends on the name),
`addModules`, `addImports`. B1 through the extended tool is byte-identical to before.

Survey of importers of `@tomlarkworthy/visualizer` (18 module/symbol pairs, 238 notebooks): v2 keeps
`visualizer(runtime, {invalidation, module, filter, inspector, detachNodes, classList})` and its return
shape. Of v1's cells that importers name, v2 drops six; two are read by a cell:

| symbol | importer (notebooks) | read by a cell | in the plan |
|---|---|---|---|
| `syncers` | editor-5 (238) | `auto_attach`, as a bare trigger statement | `syncers = vizSynced` |
| `lopeviz_handle_css` | lopepage v1 (12), moldable-webpage (1) | yes | v1 cell kept |
| `TRACE_CELL` | editor-5 (238) | no | v1 cell kept |
| `unorderedSync` | lopepage v1 (12) | no | import kept |
| `allVariables` | moldable-webpage (1) | no | v1 cell kept |
| `cellMaps` | moldable-webpage (1) | no | v1 never defined it; already broken |

The plan takes v2's `visualizer` and `renderImportCell` bodies and its 17 pane/template cells, drops v1's
sync machinery (`mainVariables`, `visualizers`, `visualizersToDelete`, `inspectors`, `variablesForCell`,
`backgroundJobs`, each used only by the replaced cells), imports `instantiateDataflow` and `onCodeChange`,
keeps `liveCellMap` from `cell-map`, and defines `displayStateOf`/`attachDisplay` locally over
js-toolchain's `Symbol.for` registry, as exporter-3 does (decision 1). js-toolchain's declared canonical
(`notebook-kit.html`) defines neither function; only lopepage-3's embedded copy does, so those two cells
are copies that can drift.

Open until T3 runs on it: `test_viz_unmount_hands_variables_back` read `viewof visualizers` and asserted
the root was emptied; v2 detaches the root and leaves its nodes. The rewritten test checks the observer is
handed back and later changes neither add nor update nodes, which is weaker. `syncers` changes once per
pane sync instead of once per `liveCellMap` change, so editor-5 reattaches more often with several panes.
v2 has only run against cell-map-2's plain `liveCellMap`, not cell-map's view.

**First browser gate, 2026-09-14 (`.out/gateC1.log`): T3 0/17.** Every test PENDING at 180 s, under both
`run-suite` and `--run-tests`. A copy of editor-5 carrying the merged block reported the same 17 tests
passed, but it ran with `#e5_tests` and no `&viz_tests`, so each returned its `skipped:` string. That pass
is not evidence and nothing so far has run these tests against v2.

Narrowing it down, one probe at a time on `viz-C.html` (`.out/probe-*.ts`):

```
every non-test visualizer variable forced          all resolve, no page errors
visualizer mounted from page.evaluate              renders "a = 1"; ui.settle() resolves before and after
vt.scenario(trivial) / vt.scenario(fixture+mount)  resolved "trivial" / resolved "a"
m.value("test_viz_renders_cells_in_runtime_order") PENDING at 45 s
  that variable's _version                         451  (working-tree visualizer: 4)
```

A test that resolves when called and never resolves as a cell is being restarted. `_version` over 10 s:

```
                     #viz_tests     no hash
liveCellMap           80 -> 175     20 -> 20
vizPaneCells          79 -> 174     19 -> 19
vizPaneSync           80 -> 175     19 -> 19
vizPaneTemplate       80 -> 175     19 -> 19
visualizer            80 -> 175     19 -> 19
vt                    80 -> 175     19 -> 19
```

v2's `vizPaneTemplate` listed the eight pane cells as deps (`[vizRoot, …, vizPaneSync];` as its first
statement), so the template cell, and `visualizer` which takes it, recomputed on every `liveCellMap`
change. Each test's fixture defines variables, which changes the map, which recomputes `vt`, which
restarts every test. Without tests it is still one `visualizer` recompute per map change, reaching every
cell that depends on `visualizer`: `lp2_getPane` in lopepage-2, and in lopepage-3 as forked.

The deps are not needed. `instantiateDataflow` copies each template variable's `_definition` and
`_inputs` when it makes a pane, and its `watch` callback re-defines a clone whose source definition
changed (dataflow-templating, `instantiateDataflow`). Fix, as two `replace` entries in the C plan:
`vizPaneTemplate(lookupVariable, visualizerModule)`. Cost: a template cell deleted and re-created as a
new variable is not picked up until `visualizerModule` changes; a redefinition is.
Mutant restoring the deps: `visualizer-C-mutants.json`.

The same gate found two consumer gaps that are not merge C's:

- 234 of 238 notebooks embedding visualizer lack `@tomlarkworthy/ui-testing`, which the Phase 0 tests in
  the canonical import (`missing-import` on the quick_start and moldable-webpage copies; the working
  trees carry an older visualizer without tests). Any visualizer sweep must carry it.
- moldable-webpage's dataflow-templating predates `instantiateDataflow` (1 of 238, `.out/viz-dep-gap.ts`),
  and with the merged block the notebook rendered 98 -> 0 nodes. A sweep must refresh it.

moldable-webpage's `cellMaps` import is in the preflight baseline already.

**Second gate, with the fix, 2026-09-14 (`.out/gateC2.log`).** Consumer copies carry ui-testing and a
current dataflow-templating from their canonicals, so what is left is merge C's:

```
_version over 10 s          no hash: visualizer 4 -> 4, vt 4 -> 4    #viz_tests: liveCellMap 69 -> 69, visualizer 4 -> 4
T3 viz-C (#viz_tests)       17/17
mutant restoring the deps   killed (0/17)
editor-5 copy  T5           16/16
editor-5 copy  --run-tests  209/214, viz 17/17; the 5 failures are HEAD's 5 (merge D table)
lopepage-2 copy --run-tests 223/227, viz 17/17; test_lp2_add_module_filters_the_known_modules timeout,
                            test_persistentId, test_reflectsTitleUpdate, test_tests_example
quick_start nodes           112 -> 112
moldable-webpage nodes      98 -> 94: header, left_sidebar, right_sidebar, content
moldable-webpage preflight  the same 5 missing-export as its working tree
```

Open at this point: whether `test_lp2_add_module_filters_the_known_modules` also times out without merge C
(the merge E runs recorded lopepage-2's wizard tests as flaky), and whether moldable-webpage's four missing
nodes are a counting change or a layout loss. Those four cells are each `visualizer(runtime, {detachNodes:
true, ...})` whose element GoldenLayout adopts into a panel.

Both followed up (`.out/gateC3.log`):

- **moldable-webpage: counting.** v1 skipped a variable only when `visualizers.has(v._value)`, a set of
  inner roots, while the cell's value is the outer wrapper, so v1 drew an empty node for each. v2's
  `vizPaneSync` skips any value that is a `.lopecode-visualizer` with `detachNodes`. In both copies all
  four elements are connected under `lm_content` at the same sizes (header 1200x34, left_sidebar 209x34,
  right_sidebar 347x34, content 834x34), and the two screenshots are identical (`.out/moldable-*.png`).
  The panels render empty in both; not merge C.
- **lopepage-2 wizard tests: open.**
  ```
  control (lopepage-2 working tree, no tests in its visualizer)   207/210, 207/210   no wizard failure
  merged C copy, #lp2_tests&viz_tests                             223/227, 223/227
     run 1: test_lp2_add_module_filters_the_known_modules timeout
     run 2: test_lp2_add_module_wizard_creates_and_opens_a_module timeout
  ```
  A different wizard test each run, and merge E recorded these as flaky on both copies. The merged copy
  also queues 17 more scenarios on ui-testing's one serial queue, so it ran twice more with `#lp2_tests`
  only (visualizer tests return `skipped:`):
  ```
  merged C copy, #lp2_tests      224/227 (no wizard failure), 223/227 (wizard_creates_and_opens_a_module)
  ```
  Runs with a wizard timeout, all at `--test-timeout 60000`: merged C 3 of 4 after the fix (and 1 of 1
  before it), control 0 of 2. Merge E's own 9 runs put the same test at 4 of 9 with E and 2 of 9 on HEAD,
  and the control here already contains E. The queue is not the cause (it fails without the visualizer
  tests), and the counts do not separate a slowdown under visualizer-2 panes from the known flake. The
  JSON carries no durations. Next measurement if it matters: `run-suite --prefix test_lp2_add_module`
  interleaved, 9 runs each, recording each test's ms. lopepage-2's canonical is unchanged by merge C.

Merge C applied to the lopecode visualizer canonical, byte-identical to the gated `viz-C.html`; the
notebook also takes merge B's cell-map block, which every C gate ran against.

### Merge E: lopepage-2 took lopepage-3's selector (applied in the worktree, 2026-09-14)

`tools/merge-forks/plans/E-lopepage-2.json` takes `lp2_page` from lopepage-3 by pid (`_1y1ubko`): one CSS
rule gains `:not(.lope-viz-nk)`, so a Notebook Kit display node is not labelled `<detached>`. The import
repoints in lopepage-3 (`visualizer-2`, `editor-6`) are not taken, since merges C and D keep the original
names. Preflight 0 NEW.

```
lope-browser-runner --run-tests --hash "#view=S100(@tomlarkworthy/lopepage-2)&lp2_tests"
  HEAD copy     183/186   test_lp2_* 21/21   fails: test_persistentId, test_reflectsTitleUpdate, test_tests_example (timeout)
  merge E       182/186   test_lp2_* 20/21   the same three + test_lp2_add_module_filters_the_known_modules (timeout)
```

A CSS `:empty::after` rule is not a plausible cause for the add-module wizard timing out; repeated on
both copies before E is committed. `run-suite --prefix test_lp2_add_module`, 3 runs each
(`.out/lp2-rerun.log`):

```
HEAD copy   4/4, 4/4, 4/4
merge E     4/4, 4/4, 3/4   (run 3: test_lp2_add_module_wizard_creates_and_opens_a_module)
```

The test that timed out under `--run-tests` passed 3 of 3; a different wizard test failed once. One
failure in 12 against 0 in 12 does not separate flakiness from a change, so 6 more interleaved runs each
followed (`.out/lp2-rerun2.sh`, in `.out/gateB6.log`):

```
test_lp2_add_module_wizard_creates_and_opens_a_module fails
  merge E     runs 1, 4, 5 of 6
  HEAD copy   runs 1, 2 of 6
the other three add-module tests: no failure in either
```

Over all 9 runs: merge E 4 failures, HEAD 2, the same test. It fails on HEAD, so it is flaky rather than
caused by the selector. Not investigated further. Committed as `lopecode@6de5b80`.

### Merge D: surveyed, not planned yet (2026-09-14)

Read-only acorn comparison of the lopebooks editor-5 canonical (143 cells) and lopepage-3's editor-6
(139), both at HEAD. 123 cells identical with equal pids. editor-5 alone has the T5 tests and their
fixture (12 cells). editor-6 alone has `viewof liveCellMap`/`liveCellMap`/`liveCellMapFeed`,
`cellLanguage`, `sourceLanguage`, `decompile`, `defineJsCell` and a doc cell. 8 cells differ: `auto_attach`
(`vizSynced` for `syncers`), `findCell` (adds `type`, `lang`), `editor_manager` (JavaScript language mode
for js cells), `setOption`/`getOption` (null guards for the feed's empty first map), `editor_jobs` (keeps the
feed alive), `compile_and_update` (routes by `sourceLanguage`, and a new `switchLanguage` path), `title`.

editor-6 defines every symbol the 238 editor-5 notebooks import (`auto_attach`, `attachContextManu`,
`cellEditor`, `literalCompletions`, `observableJS_language`, `observableJS_highlightStyle`).

**Decision 2 is one guard.** Routing happens in `sourceLanguage`:
```js
try { parser.parseCell(source); ojs = true; } catch {}
try { transpileJavaScript(source); js = true; } catch {}
if (js !== ojs) return js ? "js" : "ojs";
return cellLanguage(variables, cell);
```
Returning `"ojs"` first when neither the cell nor its module is Notebook Kit
(`cellLanguage(variables, cell) !== "js" && cellLanguage([], cell) !== "js"`) keeps a classic module
classic, syntax error included. `lang` alone cannot decide it: in the merged cell-map every unnamed
classic cell reads `["ojs", "js"]`, and a display-only Notebook Kit cell has no name, so `cellLanguage`'s
display-registry check is needed. One headless scenario in `tools/editor-6/editor-6.test.ts` ("a classic
cell switched to JavaScript keeps its place and pid") contradicts the decision and changes with it.

**The feed goes.** editor-6's `viewof liveCellMap` is an EventTarget that `liveCellMapFeed` fills from
cell-map-2's plain cell; the merged cell-map exports the view itself. Its four readers are the same four
cells that read the import in editor-5.

**js-toolchain is the cost.** It is needed only on the Notebook Kit path (`transpileJavaScript`,
`defineCell`, `decompileJs`, `displayStateOf`), but as wired `auto_attach` keeps `editor_jobs` →
`command_processor` → `compile_and_update` → `defineJsCell` → `defineCell` → `nkRuntime` alive, so a static
import loads the Notebook Kit runtime at every boot. Options:

| option | cost |
|---|---|
| A. static import, as editor-6 | js-toolchain block + attachment, ~50 KB into each of 238 notebooks (~11.8 MB); runtime loaded at boot |
| B. read the instantiated `@tomlarkworthy/js-toolchain` module at call time (`modules` map, `mod.value("defineCell")`), registry read for `displayStateOf` | no block added; the parse check moves into the async part of `compile_and_update`; a Notebook Kit cell cannot be edited as JavaScript where js-toolchain was never loaded |
| C. B plus `importShim` of the module when absent | as B; offline only if the block is embedded; whether it shares the static instance is unverified |
| D. js-toolchain publishes its functions on a `Symbol.for` global | a new js-toolchain cell that something must observe |

Recommendation: B. Under decision 2 a module can only be Notebook Kit if js-toolchain already
instantiated it (lopepage-3 boots it; exporter-3's `$nk` loader loads it before `defineCell`), which is
exactly when B finds it, and it matches decision 1. Not verified in a browser.

**Plan written, headless-tested (2026-09-14).** `tools/merge-forks/plans/D-editor-5.json`, host the lopebooks
editor-5 canonical, 143 -> 150 cells, 51 imports, no module define added:

| op | what |
|---|---|
| take | `findCell`, `editor_manager`, `setOption`, `getOption`, `compile_and_update` (pids equal) |
| add | `cellLanguage` |
| define | `displayStateOf` (registry read), `jsToolchain` (`(name) => record.module.value(name)` for the `modules` record named `@tomlarkworthy/js-toolchain`, undefined when absent), `sourceLanguage` (async, decision 2 guard first), `decompile` (falls back to `decompileOjs`), `defineJsCell` (clear error when js-toolchain is absent), a reworded doc cell |
| imports | `decompile` becomes `decompile as decompileOjs`; nothing from js-toolchain, cell-map-2 or visualizer-2 |
| kept | `auto_attach` on `syncers`, `editor_jobs` without the feed, the cell-map `viewof liveCellMap` import, all tests |

Headless (no browser, `bun test`):

```
tools/editor-6/editor-6.test.ts (the fork, baseline)   15 pass: 8 scenarios, 7/7 mutants killed
.out/D-editor-5.test.ts (same scenarios on the merge)  24 pass: 11 scenarios, 12/12 mutants killed
```

The D copy replaces "a classic cell switched to js keeps its place and pid" with decision 2's pair (a classic
module calls the classic compiler and never reads `modules`; a module holding a Notebook Kit cell still
switches), and adds js-toolchain never loaded and loaded after editor-5 computed. Every dep of every cell
resolves; preflight identical to HEAD.

Browser gate, 2026-09-14 (`.out/gateD1.log`), copies built from the lopebooks editor-5 working tree
(which carries merge B's cell-map block):

```
                                    T5 run-suite   --run-tests #e5_tests
D-editor-5-HEAD  (no merge D)         16/16          168/173
D-editor-5       (merge D)            16/16          192/197
DC-editor-5      (merge D + C v1)     16/16          209/214
```

The same five tests fail in all three (`access-runtime#test_persistentId`, `lopepage-urls#test_tests_example`,
`runtime-sdk#test_reflectsTitleUpdate`, `#test_ui_ambiguous_name_asks_for_scope`,
`#test_ui_unknown_cell_is_a_clear_error`), and no test present on HEAD is missing. The +24 are the cell-map
suite, the +17 visualizer tests in DC returned `skipped:` (no `&viz_tests`, see merge C).

Gated again on what would be committed, a copy of lopebooks HEAD with only the plan applied
(`.out/gateD2.log`):

```
                    T5 run-suite   --run-tests #e5_tests
D2-editor-5-HEAD      16/16          168/173
D2-editor-5           16/16          168/173     new failures [], fixed [], lost []
```

Applied to the lopebooks editor-5 canonical, byte-identical to `D2-editor-5.html`. The lopecode canonical
(131 cells, no `test_e5_*`) is left: the plan dry-runs against it, but nothing there would gate it.

Not yet known: how often `jsToolchain` recomputes (it depends on `modules`, as `findCell` already does),
and whether a Notebook Kit cell edited here still exports as `$nk` (T2).

## Merges, lowest risk first

**A. exporter-3 absorbs exporter-4.**
- Read the display-state registry through its `Symbol.for` key instead of importing `displayStateOf`,
  so no notebook gains a block.
- Repoint save-in-place-2 and lopepage-3 at exporter-3, then delete exporter-4 and save-in-place-2.
- Gate: T1, T2, E8, and `save-reload-check.ts` on lopepage-3.

**B. cell-map takes cell-map-2.** Done in the worktree 2026-09-14, the other way round from the
original bullet: cell-map kept its cells and took cell-map-2's `cellMap` (see "Merge B" above).
- ~~Add the five missing names to cell-map-2. `viewof liveCellMap` moves in from editor-6, which
  currently defines its own with a feed.~~
- Settle which name survives (Open decisions, 3), then sweep the importers.
- Gate: T6, T7, T4, T8, and the cell-map-2 suites.

**C. visualizer takes visualizer-2.** Applied 2026-09-14, `lopecode@e9ae198` (see "Merge C" above).
- ~~Either shim the eight removed exports, or migrate their importers~~: the v1 cells importers read are
  kept, `syncers` is `vizSynced`.
- Gate run: T3 17/17 plus a mutant, T5 and `--run-tests` on editor-5 and lopepage-2 copies, node probes on
  quick_start and moldable-webpage. T4 `--check` not rerun after C.
- Consumers not swept: a sweep must carry ui-testing and refresh moldable-webpage's dataflow-templating.

**D. editor-5 takes editor-6.** Applied 2026-09-14 to the lopebooks canonical, `lopebooks@25c445e3`.
- ~~Carries js-toolchain and cell-map-2 into every notebook that has editor-5 (242)~~: nothing is
  carried. js-toolchain is read from the instantiated module at call time; the map is cell-map's.
- Decision 2 taken as the guard (routing to js only in a module already holding a Notebook Kit cell).
- Gate run: T5, `--run-tests`, `tools/merge-forks/editor-5-merge-D.test.ts`. T2 not run. The lopecode
  editor-5 canonical is unchanged.

**E. lopepage-2 takes lopepage-3's two lines.** Applied, `lopecode@6de5b80`.
- The notebook-kit demo is still a lopepage-3 notebook; it has not been repointed at the originals.
- Gate run: lopepage-2 `--run-tests`. Boot-check and save-reload-check on the demo not run.

A is independent of the rest. As applied, D reads neither cell-map-2 nor `vizSynced`: `auto_attach` still
waits on `syncers`, which merge C made `vizSynced`, so C and D are independent of each other too.

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
- ~~T1, T2, T4, T6, T7 and T8 are not started.~~ As of 2026-09-14 all eight are written (sections
  above). T8 (`corpus-gate.ts`) first ran as merge B's gate.
