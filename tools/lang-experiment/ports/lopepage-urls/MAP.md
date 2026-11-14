# lopepage-urls: original variable → port

Source: `modules/@tomlarkworthy/lopepage-urls.js` (634 lines, 46 variables: 41 `$def` + 5 `main.define`).
Ported 2026-11-14. Tier of each checked cell is the one `bun check.ts ports/lopepage-urls --json` reports.

| original variable | tier | port cell(s) | note |
|---|---|---|---|
| `_1` (md title) | prose | shell `_1` | `md` |
| `_2` (md "Tests") | prose | shell `_2` | `md` |
| `_3` (`tests()`) | shell | shell `_3` | calls the `tests` import, which walks the runtime reflectively |
| `dslExamples` | default | `dslExamples` | |
| `parseViewDSL` | mut-local | `parseViewDSL` | closure-captured `let i` became a `Mut<{i}>` cursor passed to each helper; `items` a `Mut` array |
| `_6` (`"SRC".includes("S")`) | default | `_6` | |
| `test_parseViewDSL` | default | `test_parseViewDSL` | unchanged |
| `test_reserialized` | default | `test_reserialized` | unchanged |
| `normalizeWeights` | default | `normalizeWeights` | was in-place (sets `size`, `delete weight`, returns undefined); now returns a new config, same keys in the same order. No other module imports it |
| `parseGoldenDSL` | default | `parseGoldenDSL` | returns `normalizeWeights(glConfig)` instead of the mutated `glConfig` |
| `layouts` | default | `layouts` | |
| `_12` (md) | prose | shell `_12` | `md` |
| `serializeGoldenDSL` | default | `serializeGoldenDSL` | `Math.round(string)` → `Math.round(Number(…))`; explicit throw when `size` is missing |
| `test_serializeGoldenDSL` | default | `test_serializeGoldenDSL` | unchanged |
| `test_parseGoldenDSL` | default | `test_parseGoldenDSL` | unchanged |
| `_16` (md) | prose | shell `_16` | `md` |
| `listModules` | default | `listModules` | |
| `_getModuleTitles` | default | `_getModuleTitles` | `push`/`concat` loop → `flatMap` + spread; explicit throw when a component has no `title` |
| `test_list_modules` | default | `test_list_modules` | unchanged |
| `_20` (md) | prose | shell `_20` | `md` |
| `getCell` | default | `getCell` | |
| `_22` (md) | prose | shell `_22` | `md` |
| `_23` (nav link demo) | shell | shell `_23` | `htl.html` |
| `navHref` | default | `navHref` | `isIntent` boolean → `intent` (the narrowed target or null) so field reads type-check |
| `_26` (md "navigate") | prose | shell `_26` | `md` |
| `navigate` | shell | shell `navigate` | `window.location`, `window.history.pushState`, `dispatchEvent` |
| `_25` (md) | prose | shell `_25` | `md` |
| `isOnObservableCom` | shell | shell `isOnObservableCom` | reads the live `location` at call time; `location` is an `/** effect */` foreign |
| `links` | default | `links` | |
| `targets` | default | `targets` | |
| `linkTo` | mut-local | `linkToWith` (checked) + shell `linkTo` | body is checked `linkToWith` (`Mut<Map>` for the hash params, `parseUrl` foreign for `new URL`); shell `linkTo` keeps the original signature and its two world-reading defaults, `document.baseURI` and `isOnObservableCom()` |
| `viewof vars` | shell | shell `vars_view` | `variables(runtime)`: a view over the live `runtime._variables` set |
| `vars` | shell | shell `vars` | `Generators.input(viewof vars)`; not a ref, see GAPS §4 |
| `test_linkTo` | default | `test_linkTo` | calls `linkToWith` with the same two options; see GAPS §2 |
| `_32` (md) | prose | shell `_32` | `md` |
| `runtime` | import | foreign `runtime` (effect) | from `@tomlarkworthy/runtime-sdk`; not supplied (baseline: blocked) |
| `variables` | import | foreign `variables` (effect) | from `@tomlarkworthy/runtime-sdk`; not supplied (baseline: blocked) |
| `href_examples` | default | `href_examples` | |
| `test_extractNotebookAndCell` | default | `test_extractNotebookAndCell` | unchanged |
| `extractNotebookAndCell` | default | `extractNotebookAndCell` | `let notebook;` given a type |
| `updateNotebookImports` | shell | shell `updateNotebookImports` | reads `variable._observer._node`, rewrites `<a href>` in the DOM |
| `tests` | import | foreign `tests` (effect) | from `@tomlarkworthy/tests`; not supplied (baseline: blocked) |
| `convertToGoldenLayout` | default | `convertToGoldenLayout` | `nodeType` captured as `string` before the exhaustive branches; see GAPS §6 |
| `test_bareModulesWrappedInRC` | default | `test_bareModulesWrappedInRC` | unchanged |
| `module @tomlarkworthy/runtime-sdk` | import | none | module variable |
| `module @tomlarkworthy/tests` | import | none | module variable |

Counts over the 46 rows: default 23, mut-local 2, shell 7, prose 9, import 5. One original variable
(`linkTo`) became two port cells, so the port has 25 checked cells and 17 shell-file cells (7 shell +
9 prose + the `linkTo` wrapper; the wrapper is counted under `linkTo`'s row).
