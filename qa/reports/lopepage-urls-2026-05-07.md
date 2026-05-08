# QA report: lopepage-urls

**Date:** 2026-05-07
**Notebook:** `lopecode/notebooks/@tomlarkworthy_lopepage-urls.html`
**URL hash:** `#view=R100(S50(@tomlarkworthy/lopepage-urls,@tomlarkworthy/module-selection),S50(@tomlarkworthy/claude-code-pairing))&open=@tomlarkworthy/claude-code-pairing&cc=...`
**Browser:** Playwright Chromium (headed, 1400×900)

## Summary

`lopepage-urls` is the lopepage hash-DSL toolkit (parser, serializer, link-builder, import-rewriter). The 7 own tests all pass and the live integration via `updateNotebookImports` works (14 import blocks rewritten correctly). However the notebook is **almost entirely undocumented** — no elevator pitch, no feature list, only section headers — and probing the API surface from the source revealed **eight concrete behavioural bugs** in `navHref`, `linkTo`, `getCell`, `extractNotebookAndCell`, and `parseViewDSL`. Two of them (extract on `observableusercontent.com`, parse on unclosed parens) silently produce nonsense instead of erroring or working correctly. One downstream test (`@tomlarkworthy/lopepage#test_url_roundtrip`) is failing because `normalizeWeights` collapses single-child group weights, breaking textual round-trip stability for layouts that have an outer single-child group.

## Criterion scoring

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | Clear title | pass | `<h1>lopepage urls</h1>` at top, matches module slug. |
| 2 | Explanation | **fail** | First viewport contains H1, "Tests" header, and the test rows — zero prose explaining what the notebook is or who uses it. The whole notebook has only one paragraph (`Watch the runtime for imports and swap them for our structure`). |
| 3 | Doc matches impl | partial | There is no documentation, so nothing to validate. The few claims that exist (the section headers `## Get cell`, `## Add linkTo`, etc.) are mostly accurate but `getCell` does NOT do what its header implies (see issue #3). |
| 4 | Does what it says | partial | All 7 own tests pass and `updateNotebookImports` rewrites 14 real import blocks correctly. But several exported functions silently misbehave on plausible inputs (see issues #1–#7). |
| 5 | Feature list | **fail** | No feature list, no API summary, no "what's exported" section. Section headers (`Tests`, `Serialization`, `Flat listModules`, `Get cell`, `navHref`, `Add linkTo`, `Auto switch to url structure`) are the only navigation aid. Several exports (`isOnObservableCom`, `convertToGoldenLayout`, `normalizeWeights`, `extractNotebookAndCell`) are not mentioned at all in the prose — undocumented features. |
| 6 | Lean code | pass | 37 cells, mostly lean. Two tiny dead cells: `_1d8nta8` (`"SRC".includes("S")`) is a one-line scratch left over. `_24` (`htl.html\`<a href="${navHref("foo$ref")}">nav</a>\``) is a demo for `navHref` with no surrounding prose explaining what it shows. No major duplication. |
| 7 | Scoped domain | pass | Concern is clearly the lopepage hash DSL plus URL/link helpers. Imports `runtime-sdk` and `tests` only — minimal dependency footprint. |
| 8 | Claims tested | partial | The 7 in-notebook tests pass, but they're snapshot-style (just compute values, no assertions about them). They would not catch the bugs found below — e.g. `test_linkTo` records what `linkTo` produces but doesn't assert it's correct. |
| 9 | Serialization | not tested | Skipped (criterion #4 + #10 surfaced enough issues; round-tripping the file has high collateral risk and is not where the active bugs live). |
| 10 | Adversarial / try to break | **fail** | `extractNotebookAndCell(null)` throws; `parseViewDSL("S50(@a/b,@c/d")` (unclosed paren) silently parses; `extractNotebookAndCell("https://observableusercontent.com/@user/notebook")` (the production host) produces `@observableusercontent.com/@user/notebook`. See issues. |
| 11 | Clean console logs | pass | Of 366 console entries, only 3 cell-attributable messages (all CSS `@import rules are not allowed` warnings from notebook-kit stylesheets — framework-level, not from lopepage-urls cells) and one `jest/expect version 24.0.0` log from the shared jest-expect dependency. Zero `console.log`/`debug` from lopepage-urls itself. |

## Issues found

### 1. `navHref(target, {op})` ignores `op` for string targets — severity: high — criterion: #4

- **What:** `navHref("@a/b", {op: "close"})` returns `"#open=@a/b"` instead of `"#close=@a/b"`. The `!isIntent` branch unconditionally sets `finalOp = "open"`, overriding the caller's argument.
- **Where:** `@tomlarkworthy/lopepage-urls.navHref`, the `if (!isIntent) { ... finalOp = "open"; }` block.
- **Evidence:** `eval_code` — `navHref("@a/b", {op:"close"})` → `"#open=@a/b"`; `navHref("@a/b", {op:"focus"})` → `"#open=@a/b"`. Same bug exists in `linkTo`'s `!isIntent` branch (`linkTo("@a/b", {op:"close", onObservable: false})` → `"#open=@a/b"`).
- **Hypothesis:** Refactor accidentally hard-coded `op = "open"` for the string path; the intent path does the right thing (`linkTo({module:"@a/b", op:"close"})` → `"#close=@a/b"`).

### 2. `navHref(null|undefined|"")` returns `"#open=null"` — severity: medium — criterion: #4 / #10

- **What:** Calling navHref with no real target produces a malformed link string `"#open=null"`. If clicked, lopepage would attempt to "open" a module called `null`.
- **Where:** `@tomlarkworthy/lopepage-urls.navHref`; the `String(target ?? "")` produces `"null"` for `null`/`undefined` because `?? ""` only short-circuits on null/undefined for the default but `String(null)` then runs through `parts[0] || null` and the template literal stringifies `null` again.
- **Evidence:** `eval_code` — `navHref(null)` → `"#open=null"`, `navHref(undefined)` → `"#open=null"`, `navHref("")` → `"#open=null"`.
- **Hypothesis:** Defensive guard missing. Should return `""` or throw on empty input.

### 3. `getCell(hash, module)` ignores its `module` argument — severity: high — criterion: #3 / #5

- **What:** Despite its name and 2-arg signature, `getCell` returns the same array for any value of the `module` argument. It's a synonym for `_getModuleTitles(parseGoldenDSL(hash))`.
- **Where:** `@tomlarkworthy/lopepage-urls.getCell` — body is `(hash, module) => { if (!hash) return undefined; return _getModuleTitles(parseGoldenDSL(hash)); }`.
- **Evidence:** `eval_code` — `getCell(h, "@a/b")`, `getCell(h, "@x/y")`, and `getCell(h)` all return the identical array of `{title, cell}` objects.
- **Hypothesis:** Either the function is supposed to filter by `module` (then it's broken), or it's misnamed (should be `getCells`/`listCells` and drop the unused param). The H2 above it (`## Get cell`) suggests singular intent.

### 4. `navHref(target, {source})` silently drops `source` — severity: low — criterion: #3 / #4

- **What:** The `source` option is captured into `finalSource` but never appears in the returned hash (no `from=` is emitted). `linkTo`'s string-target branch has the same dead-code path (the `source` param is set inside the `!isIntent` block but the linkTo body that sets `hashParams.set('from', source)` is in the intent path only — wait, actually `linkTo` does set `from=` for intents). For `navHref`, `finalSource` is unused.
- **Where:** `navHref` last lines never reference `finalSource`.
- **Evidence:** `navHref("@a/b", {source: "@x/y"})` → `"#open=@a/b"` (no `from=`).
- **Hypothesis:** Documented opt that nothing implements — drop it from the signature, or implement it (`return \`#${finalOp}=${...}${finalSource ? \`&from=${finalSource}\` : ""}\``).

### 5. `extractNotebookAndCell(null|undefined)` throws — severity: medium — criterion: #10

- **What:** Passing `null` or `undefined` throws `TypeError: Cannot read properties of null (reading 'match')`. Production callers (e.g. `updateNotebookImports`) read `link.href` which is always a string, but defensive callers will trip.
- **Where:** `@tomlarkworthy/lopepage-urls.extractNotebookAndCell`, the line `href.match(regex)`.
- **Evidence:** `eval_code` — `extractNotebookAndCell(null)` → throws; same for `undefined`. Empty string `""` returns `null` cleanly (good).
- **Hypothesis:** Add `if (typeof href !== "string") return null;` at top.

### 6. `extractNotebookAndCell` mangles every non-`observablehq.com` host — severity: high — criterion: #4 / #10

- **What:** When the URL host is anything other than `observablehq.com` (including the *actual* production host `observableusercontent.com` where lopebooks live, and any third-party site), the host is concatenated into the slug, producing nonsense like `@observableusercontent.com/@user/notebook` or `@evil.com/@a/b`. There is no handling for the canonical Observable runtime host.
- **Where:** `@tomlarkworthy/lopepage-urls.extractNotebookAndCell`, the `else { notebook = host + "/" + nb }` branch — the only special-cased host is `observablehq.com`.
- **Evidence:** `extractNotebookAndCell("https://observableusercontent.com/@user/notebook")` → `{notebook: "@observableusercontent.com/@user/notebook", cell: null}`. Compare to `extractNotebookAndCell("https://observablehq.com/@user/notebook")` → `{notebook: "@user/notebook", cell: null}`.
- **Hypothesis:** The Observable runtime is `observableusercontent.com` (lopebooks) and `observablehq.com` (notebooks page); both should be treated as canonical. Adding `observableusercontent.com` to the special-case list (or a regex of trusted hosts) fixes this.

### 7. `extractNotebookAndCell("https://observablehq.com/d/abc123def456@5")` returns `null` — severity: medium — criterion: #4

- **What:** A canonical Observable d-style URL with version (`d/HASH@N`) prefixed with `https://observablehq.com/` returns `null`. The regex alternation `d\/[a-f0-9]+` doesn't accept the `@N` suffix in this position. (`https://d/HASH@N` — with host `d` — *does* work, by a different alternation.)
- **Where:** `@tomlarkworthy/lopepage-urls.extractNotebookAndCell`, the regex `(?<nb>(@?[\w-]+\/[\w-]+|d\/[a-f0-9]+|e\/[a-f0-9]+@[0-9]+|[a-f0-9]+@[0-9]+|[\w-]+))`.
- **Evidence:** `extractNotebookAndCell("https://observablehq.com/d/abc123def456@5")` → `null`; `extractNotebookAndCell("https://observablehq.com/d/abc123def456")` → `{notebook: "d/abc123def456", cell: null}`.
- **Hypothesis:** Change the `d\/[a-f0-9]+` alternation to `d\/[a-f0-9]+(?:@[0-9]+)?` so the `@N` suffix is optional and consumed by the same alternation that strips it via `.replace(/@[0-9]+$/, "")`.

### 8. `parseViewDSL` silently accepts unclosed parens — severity: medium — criterion: #10

- **What:** Inputs like `"S50(@a/b,@c/d"` (missing closing `)`) parse successfully into `{groupType: "S", weight: 50, children: [@a/b, @c/d]}` instead of throwing. Inputs like `"("` (just an open paren) parse to an empty stack. The parser only checks for *trailing* characters, not missing `)`.
- **Where:** `@tomlarkworthy/lopepage-urls.parseViewDSL`, `parseGroup` does `if (input[i] == ")") i++` (no `else err(...)`).
- **Evidence:** `eval_code` — `parseViewDSL("S50(@a/b,@c/d")` returns a valid AST; only `parseViewDSL("S50(@a/b))")` (extra close) errors.
- **Hypothesis:** Add `else err("Expected ')'")` after the close-paren consumption in `parseGroup`. Same for `(` without a group prefix that's accepted as `S(` group type.

### 9. `@tomlarkworthy/lopepage#test_url_roundtrip` fails because `normalizeWeights` collapses single-child sizes — severity: medium — criterion: #4

- **What:** The downstream test in `@tomlarkworthy/lopepage` reports "view URL drift": `preURL=R100(S50(@user/x))`, `postURL=R100(S50(...))`, but `normalizedPreWithIntent=R100(S100(...))`, `normalizedPost=R100(S100(...))` — the outer `S50` was rewritten to `S100` because `normalizeWeights` divides each child's weight by the sum of siblings. With one sibling, the result is always 100%. Round-tripping a hand-authored `S50(...)` therefore changes its size to `S100(...)`.
- **Where:** `@tomlarkworthy/lopepage-urls.normalizeWeights` — `child.size = ((w / total) * 100).toFixed(2) + "%"`. When `node.content.length === 1`, `total === w` so size is always `"100.00%"`.
- **Evidence:** Tests panel — see screenshot of the Tests view (red ✗ on `test_url_roundtrip`, green ✅ on all 7 lopepage-urls tests).
- **Hypothesis:** When there's a single child, `normalizeWeights` should preserve the parent's incoming weight rather than collapse it to 100%. Or `serializeGoldenDSL` should not emit a size for singleton groups.

### 10. Undocumented exported features (criterion #5)

The following exports are usable by importing modules but never appear in any prose section header or documentation:

- `isOnObservableCom()` — heuristic for runtime location.
- `convertToGoldenLayout(intermediate)` — AST → GoldenLayout converter.
- `normalizeWeights(node)` — in-place weight normalization.
- `extractNotebookAndCell(href)` — URL → `{notebook, cell}` extractor (only the test cell `test_extractNotebookAndCell` references it; the H2 `## Auto switch to url structure` is the closest hint).
- `parseGoldenDSL`, `serializeGoldenDSL`, `parseViewDSL` — section header `## Serialization` exists but doesn't actually name them.

For each, future passes should either (a) add a one-line description to a feature list or (b) rename to `_private` and remove from external use.

## Per-notebook guidance applied

No prior `qa/per-notebook/lopepage-urls.md` existed — this is the first formal QA pass. New file written in same commit.

## Things checked and OK

- H1 title renders prominently (criterion #1).
- All 7 in-notebook tests (`test_parseViewDSL`, `test_reserialized`, `test_serializeGoldenDSL`, `test_parseGoldenDSL`, `test_list_modules`, `test_linkTo`, `test_extractNotebookAndCell`) compute and produce stable values.
- `parseViewDSL` parses all 10 `dslExamples` without throwing.
- `parseGoldenDSL` → `serializeGoldenDSL` is a fixed-point after the first round (canonical form converges within one iteration).
- `listModules(undefined|null|"")` correctly returns an empty `Map` (defensive on null arg).
- `linkTo` correctly drops `view`/`open`/`close`/`focus`/`from` from the base hash and preserves other keys (e.g. `cc=`, `keep=`); this is a deliberate fix for issue #150 documented in the cell.
- `linkTo` with `onObservable: true` returns the slug-only path form.
- `updateNotebookImports` rewrites all 14 `.observablehq--import` blocks in the live page to use `linkTo()`-style hash links.
- Console logs originating from notebook cells are zero (`@import` warnings are framework CSS, not notebook code).
- No notebook-side `console.log` debug residue.
- No global `debugger;` statements were observed (silent-hang signature did not trigger).
- Code is lean (37 cells, ~1.5kB of source); no obvious duplication or experimentation residue.
- Dependency surface is tight: only `runtime-sdk` and `tests`.

## Notes for follow-up

- The `## Auto switch to url structure` section needs a demo. Currently it's two cells (`href_examples`, `vars`) and the impl `updateNotebookImports`, but you can't *see* the rewrite in the notebook itself unless you scroll to the imports table — the rewriting does work (verified) but no visible widget shows before/after.
- The notebook would benefit from a 2-3 sentence intro paragraph immediately after the H1: who uses this, what problem it solves, and which functions to import.
- Consider grouping exports into a `## API` section with one-line summaries: `parseViewDSL`, `parseGoldenDSL`, `serializeGoldenDSL`, `listModules`, `getCell`, `navHref`, `linkTo`, `extractNotebookAndCell`, `updateNotebookImports`.
- The two-arg `getCell(hash, module)` signature should be reconciled with the implementation — pick "filter by module" or "rename to listCellTitles" and apply.
- A property-based test would catch issues #1, #4, and #8 — every test currently is a snapshot, not an assertion.
