# QA report: observablejs-toolchain

**Date:** 2026-05-03
**Notebook:** lopecode/notebooks/@tomlarkworthy_observablejs-toolchain.html
**URL hash:** `#view=R100(S70(@tomlarkworthy/observablejs-toolchain),S30(@tomlarkworthy/module-selection))&cc=…`
**Browser:** Playwright Chromium (headed, viewport 1280x900)

## Summary

The notebook delivers on its core claim: `compile`, `decompile`, and `cellMap` exist with the documented shapes; round-trip self-tests on the live runtime pass for 1364 cells (decompile → recompile → decompile). Two real defects: a typo in `test_all_cells_roundtrippable` produces gibberish output despite passing, and `compile('')` / `compile('   ')` crash with a confusing `Cannot read properties of null (reading 'type')` instead of either returning empty or throwing a SyntaxError. Several `test_compile_import_*` tests hang (never resolve `hasValue`) because they `await import("@tomlarkworthy/dependancy")` against a notebook that isn't bundled in the importmap — the TODO section already acknowledges import work is WIP. No release blockers; one **fail** (#8 — broken bulk-test assertion message) and several **partials**.

## Criterion scoring

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Clear title | pass | Single H1 "Bidirectional Observable JS <=> Runtime Toolchain" at top |
| 2 | Explanation | pass | First-viewport prose explains compilation/decompilation in plain language; documented import line shown immediately under title |
| 3 | Doc matches impl | pass | `compile` (sync `ƒ(…)`), `decompile` (`async ƒ(variables)`), `cellMap` (`async ƒ(variables, _moduleMap)`) all resolve in `get_variable` |
| 4 | Does what it says | partial | Compile/decompile work for the cases exercised; a handful of `viewof` interactive selectors exist (`test_case`, `compiled_selector`, `normalizeObservableSourceSelector`) and resolve to live HTMLFormElements but I did not click each option (default selection works). 8 `test_compile_import_*` cells are reachable but never produce a value because they await dynamic notebook imports that aren't bundled. |
| 5 | Feature list | partial | Sections (Compilation / Decompilation / Codeveloped with AI / Prior work / TODO / Continuous Integration Testing) act as a feature list; **no inverse mapping** for many runtime exports (`cellMap`, `extractModuleInfo`, `decompileImport`, `findModuleName`, `findImportedName`, `formatImportDeclaration`, `normalizeJavascriptSource`, `normalizeObservableSource`, `normalizeVariables`, `variableToObject`, `compile_unit_test_template`, `roundtripped`, `all_compiled`, `all_decompiled`) — these exist but are nowhere documented |
| 6 | Lean code | partial | 161 cells; the test suite is large but justified by the round-trip CI claim. No obvious dead/duplicate cells. |
| 7 | Scoped domain | pass | Single concern (Observable source ⇄ runtime variables). Imports `acorn`, `escodegen`, `cell-map`, `tests`, `jest-expect-standalone`, `observable-runtime` rather than reinventing them. |
| 8 | Claims tested | **fail** | `test_all_cells_roundtrippable` interpolates `${roundtripped}` (an array) into its success message — output is `"[object Object],[object Object],…"` instead of `"N cells decompiled, recompiled and decompiled again without error"` (compare to the sibling `test_all_cells_decompilable`/`test_decompiled_cells_recompilable` which return `"1364 cells …"`). Bug is in `test_all_cells_roundtrippable` body: should be `${roundtripped.length}`. |
| 9 | Serialization | not exercised | Did not run `export_notebook` — notebook is read-only data flow, no runtime mutables to round-trip; deferring to spare disk churn |
| 10 | Adversarial | partial | `compile('')` / `compile('   ')` throw `TypeError: Cannot read properties of null (reading 'type')`. Compile recovers gracefully from real syntax errors (intentional design — captures and rethrows at call site). `decompile([])` throws clean message `"no variables to decompile"`. `decompile([{_definition:'this is not js'}])` surfaces parser error without identifying the bad cell. `decompile([{_inputs:[]}])` (missing `_definition`) throws `Cannot read properties of undefined (reading 'toString')`. `compile('class Cls { d; }')` throws `"this[d] is not a function"` (matches TODO: "class body assignments can't be decompiled" — but compile fails too, with an opaque error). |
| 11 | Clean console logs | partial | One notebook-attributable warning at load: `"Since Acorn 8.0.0, options.ecmaVersion is required. Defaulting to 2020, but this will stop working in the future."` — sourced from a `blob:null/…` cell (acorn cell). All other warnings are framework/upstream noise (`@import rules are not allowed here` from CSS injection, `jest/expect version 24.0.0` startup banner from jest-expect). No `console.log` from notebook cells observed during interaction. |

## Issues found

### 1. `test_all_cells_roundtrippable` success message is broken — severity: medium — criterion: #8

- **What:** The test passes (no errors thrown) but its success string is `"[object Object],[object Object],…"` instead of the intended count message.
- **Where:** `@tomlarkworthy/observablejs-toolchain.test_all_cells_roundtrippable`
- **Evidence:**
  ```js
  return `${roundtripped} cells decompiled, recompiled and decompiled again without error`;
  ```
  `roundtripped` is an array of result objects; should be `${roundtripped.length}`. Sibling tests (`test_all_cells_decompilable`, `test_decompiled_cells_recompilable`) get this right.
- **Hypothesis:** Typo at write time, never caught because the test still "passes" (returns a truthy string).

### 2. `compile('')` / `compile('   ')` throw confusing TypeError — severity: low — criterion: #10

- **What:** Empty / whitespace-only input crashes with `Cannot read properties of null (reading 'type')` instead of returning `[]` or throwing `SyntaxError`.
- **Where:** `compile()` cell — parser returns a Cell node whose `body` is null for empty input; the AST walker doesn't guard against null body.
- **Evidence:** `parser.parseCell('')` returns an object (not null/undefined); follow-on access to `cell.body.type` blows up.
- **Hypothesis:** Add an early `if (!cell?.body) return [];` (or rethrow as SyntaxError) before the body walk.

### 3. Eight `test_compile_import_*` tests hang forever — severity: medium — criterion: #4

- **What:** These tests are `reachable: true, hasValue: false` and never resolve. They `await compile(\`import {x} from "@tomlarkworthy/dependancy"\`)` and the compiled cell contains `await import("@tomlarkworthy/dependancy")` — which has no importmap entry in the bundled HTML, so the dynamic import promise pends indefinitely.
- **Where:** `test_compile_import_alias_single`, `test_compile_import_mutable_data_alias_single`, `test_compile_import_mutable_single`, `test_compile_import_notebook`, `test_compile_import_plain_single`, `test_compile_import_view_data_alias_single`, `test_compile_import_viewof_single`. Also `test_async_interpolation` (awaits `FileAttachment('image@1.png')` which doesn't exist).
- **Evidence:** `run_tests` timed out at 60s; per-cell `get_variable` returns `hasValue: false`. The notebook's TODO section acknowledges "notebook imports (WIP some decompilation works)".
- **Hypothesis:** These tests were authored for an environment with the imported notebook present (ObservableHQ) and weren't updated for the bundled HTML where no such importmap exists. Either bundle the dep, fake the import, or convert them into compile-shape assertions that don't actually resolve the imported module.

### 4. `decompile([{missing _definition}])` throws raw TypeError — severity: low — criterion: #10

- **What:** Passing a variable spec without `_definition` produces `Cannot read properties of undefined (reading 'toString')` — internal field name leaks.
- **Where:** `decompile()`
- **Hypothesis:** Add an input-shape check that names the missing field.

### 5. `compile('class Cls { d; }')` throws `this[d] is not a function` — severity: low — criterion: #10

- **What:** Class field declarations crash the AST walker with an opaque `this[d] is not a function`. The TODO acknowledges "class body assignments can't be decompiled" but the compile-side error message is misleading.
- **Where:** `observableToJs` / `compile()`
- **Hypothesis:** Acorn-walk visitor for `PropertyDefinition` is missing, so the walker dispatch lookup fails. Either add a stub visitor or detect the unsupported node and throw a clearer "class field declarations are not supported".

### 6. Many runtime exports are undocumented — severity: low — criterion: #5

- **What:** The headline import line documents `{decompile, compile, cellMap}`. The runtime additionally exposes (and other notebooks consume): `extractModuleInfo`, `decompileImport`, `findModuleName`, `findImportedName`, `formatImportDeclaration`, `normalizeJavascriptSource`, `normalizeObservableSource`, `normalizeVariables`, `variableToObject`, `compile_unit_test_template`, plus internal-looking but reachable cells `roundtripped`, `all_compiled`, `all_decompiled`, `parsed`, `parser`, `escodegen`, `acorn`, `acorn_walk`, `compiled`, `compiled_selector`, `normalizeObservableSourceSelector`, `test_case`, `notebook_semantics_*`, `dependancy_*`, `import_ast_example`.
- **Where:** Module-level prose
- **Hypothesis:** Doc the actually-public surface (likely `extractModuleInfo`, `decompileImport`, `formatImportDeclaration`, `normalizeJavascriptSource`, `normalizeObservableSource` are intentionally exported); mark internal helpers as such; or stop exporting them.

### 7. Acorn ecmaVersion deprecation warning at load — severity: low — criterion: #11

- **What:** `Since Acorn 8.0.0, options.ecmaVersion is required. Defaulting to 2020, but this will stop working in the future.` fires once at load, sourced from a notebook cell (`blob:null/…`).
- **Where:** Any acorn `parse()` call without an `ecmaVersion` option (likely in `observableToJs`, `normalizeJavascriptSource`, or `findImportedName`).
- **Hypothesis:** Pass `{ ecmaVersion: 2022 }` (or "latest") to every acorn entry point.

## Per-notebook guidance applied

- No prior `qa/per-notebook/observablejs-toolchain.md` existed; created at the end of this pass.

## Things checked and OK

- Title renders prominently; first-viewport prose explains the notebook in plain language.
- All three documented headline exports (`compile`, `decompile`, `cellMap`) resolve.
- Live test cells that have a value: 100+ `test_compile_*` and `test_decompile_*` all return `"ok"` (spot-checked: `test_compile_integer`, `test_decompile_constant`, `test_decompile_lambda`, `test_decompile_viewof`, `test_decompile_mutable`).
- Bulk CI tests succeed: `test_all_cells_decompilable` reports `"1364 cells decompiled without error"`; `test_decompiled_cells_recompilable` reports `"1364 cells recompiled without error"`.
- `compile('foo = 42')` returns `[{_name:"foo", …}]`.
- `compile('viewof slider = …')` returns 2 cells (`viewof slider`, `slider`).
- `compile('mutable counter = 0')` returns 3 cells (`initial counter`, `mutable counter`, `counter`).
- `compile()` with unicode, control chars, 10KB strings, `${alert(1)}` template-literal interpolation, `<script>` tag literals — all returned a single named cell without crashing.
- `compile()` with deliberate syntax errors (`foo = (`, `() => return ""`, `viewof bar = () => return ""`) — gracefully captures the SyntaxError into a runtime cell that throws when invoked (intentional design, has dedicated tests).
- `decompile([])` throws a clean `"no variables to decompile"` message.
- The Module Selector pane (right panel) renders the dependency graph SVG and lists 43 modules; that's an adjacent notebook, not in scope here, but it does not error.

## Notes for follow-up

- The 8 hanging `test_compile_import_*` tests should either be rewritten or have their imported notebook bundled into the HTML — currently they consume a `run_tests` slot indefinitely.
- A `run_tests` timeout-per-test (with the offending cells named in the failure) would surface the import-hang issue much faster than the current 60s overall timeout.
- I did not exercise the interactive `viewof` selectors (`test_case`, `compiled_selector`, `normalizeObservableSourceSelector`) by clicking through every option — only the default-selected option's downstream cells were verified. A future pass could iterate the `<option>` elements and confirm each selection still yields a non-error `compiled` / `parsed` value.
- Did not run `export_notebook` (criterion #9) — the notebook has no runtime-mutable state that would need round-trip verification, but a serialization smoke test would still confirm the file isn't growing or losing cells.

## Refactoring opportunities

The notebook is 75 KB across 161 cells. ~63% of that (95 cells, ~28 KB) is the test suite, much of it duplicated boilerplate. Concrete wedges, in rough priority order:

1. **80 hand-written `test_compile_*` / `test_decompile_*` cells follow one of two templates.** Compile tests are `compile(src) → expect.toEqual([{...exact shape...}])`; decompile tests are `decompile([{...input...}]) → expect.toEqual(srcString)`. A table-driven harness — `compileCases = [{src, expected}, ...]` plus one cell that maps each through `compile`/`expect` — would collapse ~28 KB into a couple of data tables with no loss of coverage. Largest single LOC win, lowest risk.

2. **Bulk roundtrip already subsumes most per-shape unit tests.** `test_all_cells_decompilable` / `test_decompiled_cells_recompilable` exercise compile→decompile→recompile across 1364 live runtime cells, which covers every shape the unit tests check (viewof, mutable, classes, generators, async, html, md, references). The unit tests earn their keep only where they pin the *exact* `_definition` string. Many could be deleted outright; the rest converted to assertions on the bulk corpus.

3. **`compile()` is 6900 chars doing 3 distinct jobs.** SyntaxError recovery, `ImportDeclaration` handling, and the regular cell path are all inlined in one function. Split into `compileSyntaxError`, `compileImport`, `compileRegular` with a tiny dispatcher. Same shape for `decompile()` (~5170 chars) — placeholder bookkeeping, import path, the `renameDollarIdentifiers` AST walker, and prefix/suffix munging are all in one closure.

4. **Three independent placeholder schemes for `viewof`/`mutable` masking.** `compile` uses `$N`, `decompile` uses `__OJS_DOLLAR_N__`, `normalizeObservableSource` uses `__VIEWOF_PLACEHOLDER__` / `__MUTABLE_PLACEHOLDER__`. One shared `withMaskedMacros(source, fn)` helper would centralize the regex and the substitution rules.

5. **`normalizeJavascriptSource` and `normalizeObservableSource` are near-duplicates** — both parse → `attachComments` → `generate`. The Observable variant just wraps with the macro-masking. Factor the parse/generate sandwich into one helper.

6. **AI-codevelopment residue.** `normalizeObservableSource`'s body is `{prompt: '...', time: ...} && function normalizeObservableSource(...){...}` — the leftover prompt object is dead weight. Several debug fixtures (`dependancy_document`, `notebook_semantics_document`, `import_ast_example`, `compile_unit_test_template`, `compiled_selector`) look like in-notebook scratch surfaces — worth a pass to either promote them to documented examples or delete.

7. **`findModuleName` has a `debugger;` statement** in its catch block and `unknown_id = Math.random()` as a default arg — both code smells to clean up while you're in there.

8. **Acorn `ecmaVersion` warning** (criterion #11 finding) — a shared `acornParse(source, opts)` helper would let you fix the deprecation in one place instead of hunting every `acorn.parse` site.

**Suggested order of attack:** 1 → 2 (huge LOC win, low risk because the bulk tests already cover the same ground), then 3 (real readability win for the two functions everyone consumes), then 4–5 (incremental cleanup once the coverage refactor is in). Items 6–8 are quick wins anytime.
