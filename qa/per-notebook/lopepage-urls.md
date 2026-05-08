# lopepage-urls — per-notebook QA guidance

The hash-DSL parser/serializer and link-builder used by lopepage. The notebook is mostly a cell-library; almost no prose, so QA load-bears on probing the API surface, not visual inspection.

## Recommended hash to QA with

Use the bootconf default `#view=S100(@tomlarkworthy/lopepage-urls,@tomlarkworthy/module-selection)`, ideally with the pairing tab side-by-side so you can `eval_code` against the live functions.

## Function-by-function checklist

After grabbing functions out of the runtime (see "How to probe" below), test each with both happy-path and adversarial inputs:

| Export | Happy path | Adversarial |
|---|---|---|
| `parseViewDSL(s)` | each entry of `dslExamples` parses | empty/null → empty group; unclosed paren `S(@a/b` should error but currently does NOT (issue #8); junk after `@` is accepted as a slug |
| `parseGoldenDSL(s)` | round-trips with `serializeGoldenDSL` after one iteration (fixed-point) | input with weights gets normalized to percentage; not byte-identical |
| `serializeGoldenDSL(layout)` | emits `S100/R/C` form with normalized sizes | singleton groups always emit `100` regardless of input — root cause of `@tomlarkworthy/lopepage#test_url_roundtrip` failing |
| `listModules(hash)` | returns Map keyed by module title | duplicate module names collapse silently |
| `getCell(hash, module)` | — | **`module` arg is ignored** (issue #3) — same as `_getModuleTitles(parseGoldenDSL(hash))` |
| `navHref(target, opts)` | `"@a/b"` → `"#open=@a/b"`; intent `{close:"@a/b"}` → `"#close=@a/b"` | string + `{op:"close"}` returns `"#open=..."` (issue #1); `null` → `"#open=null"` (issue #2); `{source}` is silently dropped (issue #4) |
| `linkTo(target, opts)` | drops `view/open/close/focus/from` from baseURI hash by design (#150 fix); preserves `cc=`, other keys | string + `{op:"close"}` ignored (same root as navHref); intent form `{module, op}` works |
| `extractNotebookAndCell(href)` | observablehq.com URLs work; bare `@user/foo`, `d/HASH` work | `null/undefined` throw (issue #5); any non-observablehq.com host concatenates host into slug (issue #6 — affects production `observableusercontent.com`); `https://observablehq.com/d/HASH@N` returns null (issue #7) |
| `updateNotebookImports` | rewrites `.observablehq--import` link hrefs in real time when `vars` updates | confirmed works on 14 import blocks at QA time |
| `isOnObservableCom()` | string heuristic over `location.href` | only checks substring `observableusercontent.com`; doesn't catch `observablehq.com` |

## How to probe (cheat sheet)

```js
// Pull every export out of the live runtime into window._lpu so you can eval_code freely
const runtime = window.__ojs_runtime;
const upMod = [...runtime._modules.values()].find(m => [...m._scope.keys()].includes("parseViewDSL"));
const fns = {};
for (const name of ["parseViewDSL","parseGoldenDSL","serializeGoldenDSL","listModules","getCell","navHref","linkTo","isOnObservableCom","extractNotebookAndCell","convertToGoldenLayout","normalizeWeights"]) {
  const v = upMod._scope.get(name);
  if (v?._value !== undefined) fns[name] = v._value;
}
window._lpu = fns;
```

## Known-bad behaviors to re-verify on every pass

1. `navHref("@a/b", {op: "close"})` should return `"#close=@a/b"` (currently `"#open=@a/b"`).
2. `getCell(hash, "@a/b")` should be filterable by the second arg (currently no-op).
3. `extractNotebookAndCell` on `observableusercontent.com` (lopebooks production host) should return clean slugs.
4. `extractNotebookAndCell("https://observablehq.com/d/HASH@N")` should not return null.
5. `parseViewDSL("S50(@a/b,@c/d")` (missing close paren) should throw.
6. The downstream test `@tomlarkworthy/lopepage#test_url_roundtrip` should pass — root cause is `normalizeWeights` collapsing singleton-group weights to 100%.

If any of these pass cleanly on a future run, *update this file*: the bug was fixed and the corresponding entry should move to "Things to keep an eye on for regressions".

## Things that are fine (to avoid re-litigating)

- Console is clean: only framework-level `@import` CSS warnings (notebook-kit) and one `jest/expect version` log from the shared dep.
- Tests are snapshot-style (`dslExamples.map(parseViewDSL)`) — they do NOT assert correctness, only stability. Don't expect them to catch behavioural regressions; they catch schema regressions only.
- `linkTo` deliberately strips `view=` from base hash — this is a fix for issue #150, not a bug. Documented in-cell.
- The notebook has no demo widget for `updateNotebookImports`; verify by checking `.observablehq--import` `[href]` values directly.

## What to expect a QA report to flag

This notebook reliably scores **fail on #2 (no explanation), #5 (no feature list), #10 (multiple silent failures on adversarial input)**. Until prose is added, those will repeat. The "real" bugs (issues #1–#9 in the 2026-05-07 report) are the ones that need code fixes.
