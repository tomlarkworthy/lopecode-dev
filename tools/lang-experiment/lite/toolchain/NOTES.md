# lite/toolchain: the toolchain's decisions as cells (prefix `tc`) — 2026-11-21 23:29 to 2026-11-22 00:27

Commands run from `tools/lang-experiment/lite/` unless a line says otherwise. Nothing here is switched on. `ss-toolchain.ts`, `comment-types.ts`, `module-js.ts` and `../browser/erase.ts` are
unchanged and still the code every caller runs.

## Survey (2026-11-21 23:40, before porting)

Lines: code lines (not blank, not a `//` line) of each top-level declaration, from the parse
(`soundscript/.scratch/tc-port/survey.ts`). Denominator for "lines covered": 550, the declarations of the four
files (ss-toolchain.ts 357, comment-types.ts 102, module-js.ts 41, erase.ts 50). Givens outside the denominator:
`facts.ts` (`cellsOf`, `globalRefs`, `preludeCalls`), `jsx/lower.ts` (`lowerJsx`), `intrinsics.ts` tables.

Tree: "untyped" is `parse.ts`'s tree (or plain `acorn`), "tok" acorn's tokenizer, "typed" `lite/acorn`'s tree.

| function | lines | needs today | verdict |
|---|---|---|---|
| compileChecked | 57 | untyped parse (tsx), `cellsOf`, `lowerJsx`, `globalRefs`, `preludeCalls`, string building with an `r` callback run twice | cells; `cellsOf`/`lowerJsx` given; `globalRefs` as cells over the typed tree; `preludeCalls` = `mdPreludeCalls` (md-facts) |
| cutsOf (comment-types) | 59 | untyped parse, tok over the `as` gap, tok first token after an optional name, tok for `>` of `<T>x` | cells over the typed tree; tokens from a shell lexer |
| erase | 49 | untyped parse, **regex over the `as` gap**, **`indexOf("?")`** | cells; the regex and indexOf replaced by tokens (see bugs) |
| parseCompiled | 39 | plain acorn `parseExpressionAt` + comments, `JSON.parse` of the header, memo | cells over the typed parse of `(def)`; memo stays in the linker |
| decompileVariable | 16 | parseCompiled's comments and spans | cells |
| splitCells | 16 | untyped parse, `leading` | cells (`leadingComments`) |
| keepJsx | 13 | untyped parse (jsx), `lowerJsx`, **regex replace over the lowered code** | cells; the kept comments found in the lowered text's typed parse |
| build | 13 | try/catch around compileChecked, `declaredName` | cells; `declaredName` given |
| erasesToJs | 15 | plain acorn parse error, untyped walk for modifiers | cells; the plain-JS parse error from the shell |
| cellStates | 19 | Map fixpoint, `!` | cells |
| contextOf / contextOfFacts / acceptedOf / whyOf / contextFromCheck | 25 | plain data; contextOf calls `cellsOf` | cells |
| ojsCell / rejectedCell | 11 | callback called twice to list inputs | cells over a list of parts (text / input / mention) |
| variableName / keyOfVariable / isDuplicateKey / handleName / STATE_VALUE / cellOfVariable | 13 | regex over names (not code) | cells |
| inputsIn / INPUTS / RUNTIME_CELLS / PRELUDE / header / keep / unkeep / esc / unesc | 11 | strings, `JSON.stringify`/`parse` | cells |
| commentTypes / compile | 10 | **`includes` over the source** (reserved marker) | cells; `includes` kept: it checks text, not structure |
| reserved | 3 | **`includes` over the source** | cells, same note |
| langOf | 14 | tok to the first comment, memo, regex over the comment | shell reads the first comment; the decision is a cell |
| compiledKind / decompileModule / KINDS / rtCall / RUNTIME_INPUTS | 11 | data | cells |
| uncommentTypes / decompile (comment-types) | 12 | tok comments | cells over the typed parse |
| moduleJs | 24 | plain acorn module parse | cells over the typed parse; low value (tests, build) |
| syntaxStub | 15 | plain acorn | cells over the typed parse; low value |
| fromObservableVariables / ownThis / isIdentifier | 60 | plain acorn with `preserveParens`, acorn's identifier tables (`codePointAt`) | last; parens from tokens; `isIdentifier` shell |
| declaredNameAt / declaredName / tokensOf | 25 | tok over text that may not parse | shell: the typed tree has no parse of such text and no tokens |
| paramsOf | 3 | `cellsOf(lowerJsx(text))` | shell glue over givens |
| compileModule / compileCell / compileCellText / NO_CONTEXT | 8 | composition | cells |
| constants: children, parsedCompiled, OPEN/CLOSE, COMMENT_TYPE_KEYS, tokens, langs, lit, strings, TYPE_KEYS | 9 | tables and memo maps | cells (memos in tc-index.ts) |

Rank by value: compile (compileChecked, build, ojsCell, keepJsx, cutsOf/commentTypes, erasesToJs), decompile
(parseCompiled, decompileVariable, compiledKind, langOf), erase, splitCells, context/accept/states, names, then
moduleJs, syntaxStub, fromObservableVariables.

Probes of language limits (`soundscript/.scratch/tc-port/probe1.ss.ts`, `bun soundscript/.scratch/tc-port/check.ts`), 2026-11-21:

```
tcP7: rejected [no-member] no property hasOwn on { entries: ...; keys: ...; ... }     Object.hasOwn
tcP8: unsupported  [unsupported] intrinsic member String.codePointAt
```

Accepted: a regex literal with a `$1` replacement, `typeof` narrowing of a `JSON.parse` result into a record,
`Record<string, string>` index with `??`, `Math.min(...xs)`, `toSorted`, `sort` on a `Mut`, `throw new Error`.

Text matching in today's toolchain (read on the source, 2026-11-21):

- `browser/erase.ts:22` regex `/^(?:\s|\)|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n)*/` over the gap before `as`/`satisfies`.
- `browser/erase.ts:33` `src.indexOf("?", n.start + n.name.length)` for an optional parameter.
- `ss-toolchain.ts:48` `.replace(/\/\*ss<[\s\S]*?\*\//g, …)` over the lowered code.
- `ss-toolchain.ts:30` and `comment-types.ts:99` `includes` of the reserved markers over the source.
- `comment-types.ts:14`, `browser/erase.ts:14` and `ss-toolchain.ts:61` regex over node type names (not source).

Bugs of today's, reproduced (`soundscript/.scratch/tc-port/bugs.ts`, 2026-11-21):

```
"const f = (x /* ? */ ?: number) => x;"   erase "const f = (x /*  */ ?) => x;"   DOES NOT PARSE
"const f = (x: unknown) => <number>x;"    erase "const f = (x) => <>x;"         DOES NOT PARSE
```

The first is the `indexOf("?")`; the second is the missing `TSTypeAssertion` case in `erase.ts`
(`comment-types.ts` has one).

Also text matching, kept as today has it: `tcDecompileTypes` finds the marker with `js.indexOf(LANG)`
(`comment-types.ts:121`); the marker is the first comment, which `tcLangOf` has just checked.

## What was ported (2026-11-21 23:50 to 2026-11-22 00:05)

Files, all new: `tc-types.ss.ts` (data), `tc-text.ss.ts` (marker, header, escapes, names, input table, the one
`tcApplyEdits`), `tc-cuts.ss.ts` (cutsOf/commentTypes/erase/uncommentTypes), `tc-free.ss.ts` (globalRefs, keepJsx),
`tc-build.ss.ts` (compileChecked, build, ojsCell as parts), `tc-ctx.ss.ts` (splitCells, contexts, cellStates),
`tc-decomp.ss.ts` (parseCompiled, compiledKind, decompileVariable), `tc-modjs.ss.ts` (moduleJs, syntaxStub,
fromObservableVariables). Shell: `tc-shell.ts`. Linker: `tc-index.ts` (`linkTc`, `api`, `PORTED`). Harness:
`tc-diff.ts`, `tc-shim.ts` + `tc-preload.ts` (the shipped tests on the cells), `tc.test.ts`.

```
bun soundscript/.scratch/tc-port/stats.ts                     (2026-11-22 00:00)
cells 123 (103 value cells, 20 type cells); value-cell lines total 656, median 5,
largest tcCompileChecked 25, tcParseCompiled 24, tcCellStates 23, tcSplitCells 20, tcCutNode 18
```

Decisions:

- A body is a list of parts (`TcPart`: text, input, mention). ojsCell's `r` callback was run twice, once to list
  the inputs in order and once to spell `viewof` inputs `$k`; `tcBuiltOf` reads both from the one list.
  `globals.forEach(r)` lists an input at that point without writing text: a "mention" part.
- Two edit lists, not one: keepJsx rewrites the kept comments of the lowered text, which is then parsed again;
  the type cuts are found on that second parse (it is also the tree `globalRefs` reads, so it is parsed once).
- `preludeCalls(fn, "on")` is `mdPreludeCalls` and the scopes of `globalRefs` are `mdRebinds`, both from
  `infer/md-facts.ss.ts`, taken as givens. So the tc cells are checked with the infer sections.
- `parseCompiled` returns plain data (`TcCompiled`: comments, header d/h/t, headerEnd, fnEnd, callee, name,
  refs), read on the typed parse of `(definition)`; positions moved back by one. The memo maps of `langOf` and
  `parseCompiled` are in `tc-index.ts`.
- Paren detection in `fromObservableVariables`: today's reads `ParenthesizedExpression` (acorn `preserveParens`);
  the typed parse has no parentheses, so `tcReturnParens` reads the tokens after `return` and matches the first
  `(` with the last `)`.
- A case the port does not decide throws `tc-gap: …`; `tcBuild` rethrows it instead of making it a rejected
  cell, and tc-diff counts it NOT COVERED. None was met on the corpus.
- The shell's values reach the cells through `cross` with the shape of the taking cell's annotation
  (`tc-index.ts` `paramShape`), as `acorn/index.ts` gives `acornParse`. `linkTc({}, true)` links them plain.

## Coverage (tc-diff.ts, 2026-11-22 00:05-00:07, AC power, load 10.4-10.8)

Trees: `today toolchain/ss-toolchain.ts:1qqbvhgcevcr6 comment-types.ts:1xz6mubtzlr6k module-js.ts:3tmeb7ab1oukd
browser/erase.ts:1b70j80pgsaip facts.ts:3eyj555klk8vr jsx/lower.ts:236jio7cy95m0` (Bun.hash, base 36);
the tc file hashes are in `soundscript/.scratch/tc-port/final-diff.txt`.

Corpus: `lite/infer/diff.ts`'s module sources (copied; that file runs when imported), the `.ojs` inline strings,
every `.ss.ts` of lite/, lite/acorn, lite/infer, lite/toolchain and selfhost, every string literal (over 3
characters) and expression-free template of the six toolchain test files, each as ts and tsx; every cell of the
eight shipped `.ojs` files compiled by the standard Observable compiler (`ojs-roundtrip/ojs.ts`); every variable
of the 11 module blocks of `lopebooks/notebooks/soundscript.html` (read with `moduleJs` through
`tools/lib/notebook-blocks.ts`). Each cell is compiled in five contexts: none, contextOf + the check's accepted and why
(as ss-toolchain.test.ts does), contextFromCheck, the same with `module: "@a/m"`, the same with `inputsIn(true)`;
and with a `name (k)` hint on a name declared again. Every definition today's compileCell gives, and every
notebook definition, goes through langOf, parseCompiled, compiledKind, decompileVariable and syntaxStub.

```
corpus: 1711 sources, 1487 OJS cells, 2043 notebook definitions, 11 notebook modules; 86.6 s
all calls: SAME 327468 SAME THROW 3800 DIFFERENT 1 NOT COVERED 0 TODAY TYPEERROR 0
```

SAME THROW: both threw the same message. The one DIFFERENT is the repro below (`erase (repro)`).

```
function                  SAME   SAME THROW     function                 SAME   SAME THROW
compileCell              30032   1288           parseCompiled           33510   0
compileCellText          30032   1288           compiledKind            33510   0
compileModule             1177    262           decompileVariable       33510   0
compileModule+accepted    1190    249           decompileModule          1177   0
splitCells                1439    270           langOf                  35088   0
contextOf                 1439      0           syntaxStub              33510   0
contextFromCheck          1439      0           moduleJs                   11   0
acceptedOf                1439      0           fromObservableVariables  4461   0
cellStates                1439      0           commentTypes             1429 149
whyOf                     4827      0           uncommentTypes           1429   0
erase                     1415    294           decompile (comment-types) 1429  0
variableName, keyOfVariable, isDuplicateKey, handleName, cellOfVariable   14487 each
inputsIn 2, INPUTS 1, RUNTIME_CELLS 1;  DIFFERENT 0 and NOT COVERED 0 on every row; repro rows separate
```

Shapes among today's compiled variables, context contextFromCheck: plain 1392, apply 312, ref 234, events 38,
listen 15, rejected 2849, type cell 1171, state value 287; inputs `ss_compileFor` 10, `structuredClone` 1,
`URLSearchParams` 1, `invalidation` 58; tsx 2824. `ss_cross`/`ss_viewRef` 0 in every context: no source cell
takes a cell in another language, because the per-source check has no outside cells.

Boundary pass (added 00:20, run 00:22): the 37 study cells of `ojs-roundtrip/corpus.ts`, checked with its
`OUTSIDE` cells as `ojs-roundtrip.test.ts` does, compiled by both sides:

```
compileCell (boundary)        SAME 37   DIFFERENT 0     inputs ss_cross 1, ss_viewRef 1
compileCellText (boundary)    SAME 37   DIFFERENT 0
decompileVariable (boundary)  SAME 41   DIFFERENT 0
control tcArgParts with no boundary branch: compileCell (boundary) 3, compileCellText (boundary) 3 DIFFERENT
```

So each boundary branch of `tcArgParts` ran once and matched. Not executed: the pre-2026-11-18 `tcUnkeep` branch
(a kept original that is not a JSON string). The port throws `tc-gap` there, so it would show NOT COVERED, not a
wrong answer.

Translated against refused, today's results (00:22): `fromObservableVariables` text 2454, reason 2007;
`decompileVariable` source 31207, null 2323.

Lines: 521 of 550 are in functions whose decisions are cells and whose result tc-diff compared. Left in the shell
(29): `declaredNameAt` 15, `declaredName` 1, `tokensOf` 9, `paramsOf` 3, `isIdentifier` 1. The cells still call the shell for tokens
(`tcLex`), the first comment (`tcFirstComment`), plain JavaScript's parse error (`tcJsError`), `isIdentifier`,
`lowerJsx` and `cellsOf`.

Shell left, and why:

- `declaredNameAt`, `declaredName`, `tokensOf`: they read text that may not parse; the typed tree has no tree for
  it and no tokens.
- `tcLex`, `tcFirstComment`: tokens. `tcJsError`: today's asks plain acorn whether the erased text is JavaScript;
  the typed parse is the TypeScript parser, which accepts what that check refuses. `tcIsIdentifier`: acorn's
  Unicode tables, and `String.codePointAt` is not an intrinsic. `lowerJsx`, `cellsOf`: outside the four files.

## Controls (tc-diff.ts --controls, 2026-11-21 23:53 to 2026-11-22 00:04, load 5.8 to 10)

Seven controls in this run, one cell per tc file replaced in a linked copy; tc-types has no cell to break. The full-corpus run below counts the
repro row in DIFFERENT; since 00:12 tc-diff prints totals with the repro rows left out.

```
tc-text   tcEsc without the escape                  DIFFERENT   61   commentTypes 13, compileCell 12, compileModule 12
tc-cuts   tcOptionalCut cuts nothing                DIFFERENT  254   erase 18, commentTypes 18, compileCell 89
tc-free   tcNotARef: every identifier a reference   DIFFERENT  498   compileCell 237, compileCellText 198
tc-build  tcArgsParts joins arguments with ","      DIFFERENT 4650   compileCell 2160, compileModule 263
tc-ctx    tcAcceptedOf accepts every cell           DIFFERENT 4142   acceptedOf, contextFromCheck, cellStates 1034 each
tc-decomp tcOutside reads no runtime cell           DIFFERENT 3927   parseCompiled 1963, compiledKind 1963
tc-modjs  tcOwnThis finds no this                   DIFFERENT   46   fromObservableVariables 45
```

(each also counts the repro's 1.) This run was before `tcFromObservableVariables` was split into three cells
(00:00); the main pass after the split is the 00:05 one above.

The shipped test files on the cells (`bun --preload ./toolchain/tc-preload.ts <test>`, 2026-11-21 23:57):

```
ss-toolchain.test.ts    37 files pass, 0 fail; 406 cells        control edits   exit 1
roundtrip-edge.test.ts  114 of 114 edge checks pass             control args    exit 1 (1 FAIL)
translate.test.ts       32 of 32 pass                           control ownthis exit 1 (2 FAIL)
comment-types.test.ts   37 pass, 0 fail of 37; langOf 5 cases   control lang    exit 1 (39 FAIL)
erase.test.ts           6 pass, 0 fail                          control edits   exit 1 (6 FAIL)
ojs-roundtrip.test.ts   all pass                                control lang    exit 1 (38 FAIL)
```

Each control is chosen with `TC_CONTROL=<name>`, e.g. `TC_CONTROL=edits bun --preload ./toolchain/tc-preload.ts
browser/erase.test.ts`; the four names (`tc-shim.ts` `CONTROLS`) replace `tcArgsParts` (args), `tcApplyEdits`
(edits), `tcOwnThis` (ownthis) and `tcLangOf` (lang). Not every control breaks every test: `args` passes
ss-toolchain.test.ts (exit 0, 23:57); why was not looked at. The shim fills `parseCompiled(…).call` and `.fn` from today's `parseCompiled`, because
ss-toolchain.test.ts and roundtrip-edge.test.ts read acorn nodes there (`passesModule`); the port's result has
no nodes. Those two checks therefore test today's call node with the port's `name` and `callee`.

## tc.test.ts (2026-11-22 00:13-00:15, AC power, load 19.0)

```
bun test toolchain/tc.test.ts      10 pass, 0 fail, 36 expect() calls, 108.76 s   (00:13, load 19.0)
bun test toolchain/tc.test.ts      11 pass, 0 fail, 41 expect() calls,  97.99 s   (00:25, load 9.5; AST shape-rule
                                   test, boundary pass, ninth control and the repro-row assertion added)
```

Tests: TC_FILES is the glob; the live checker accepts all 103 value cells (module errors []); names unique and
prefixed; the six shipped test files pass through `tc-preload.ts` and fail with their control; `tc-diff.ts --only
toolchain --controls` (714 sources, 12.4 s) gives DIFFERENT 0 and NOT COVERED 0 with repro rows left out, and
every control but `tcOptionalCut` differs. On that subset `tcOptionalCut` differs only in the repro rows, so a
second tc-cuts control (`tcWholeType` false: erase 6, commentTypes 6) was added.

First run (00:08) failed twice; both were the test, not the cells:

- The name check found every tc name three times: `selfhost/opaque-handles/base/lite/toolchain/tc-*.ss.ts` and
  `.../proto/...` are copies of lite/ made by another agent at 23:53, which include these files. The test now
  skips `selfhost/**/lite/**`. `lite/infer/infer.test.ts`'s same check does not skip them and will report the
  infer names the same way (not run; not my file).
- `--only file:lite/notebook/examples` (9 sources) was too small: three controls differed in nothing there.

The shipped test files, not redirected, 00:16: ss-toolchain 37 files pass; roundtrip-edge 114 of 114;
translate 32 of 32; comment-types passes (langOf 5 cases); erase 6 pass.

## Timing (2026-11-22 00:07-00:08, AC power, load 13.5-14.5, other agents running)

`bun toolchain/tc-diff.ts --rounds 3 --time-only`: 6015 cells, each compiled with contextFromCheck of its module.

```
µs per cell compiled   today 246.4 285.2 285.1   port 458.5 536.6 514.6   port, shell not crossed 528.3 485.1 601.0
µs per decompileVariable (6302 definitions, texts new to both memos)   today 12.3 10.9 20.3   port 67.5 60.5 91.0
```

The port is 1.8-1.9x today's on compile and 4.5-5.5x on decompile. Crossed against not crossed is inside the
noise at this load. An earlier run (00:06, load 9.8-10.8) had today's decompile memo warm and is not used.

The live checker (`.scratch/tc-port/check.ts --with-infer`, 00:08, load 14.4-14.9): the acorn and infer sections
alone 3660 3897 3652 ms; with the 8 tc files (103 value cells) 4282 3885 4224 ms.

## Checker messages met, and the rewrite

```
tcCaps     [inject-type] tcCapNames: unknown is not assignable to string[]
           a const of the shell has type unknown -> the shell exports () => string[]; the cell calls it
tcParseCompiled [no-member] no property callee on ArrayExpression | ArrayPattern | ...
           call.callee on a node returned as AstNode -> const calleeNid = call.type === "CallExpression" ? … : -1
tcReadsBack [no-member] no property body on ArrayExpression | ...
           (generator ? init.type === A : init.type === B) && init.body … does not narrow -> a second test of the type
```

Not the checker: the Write tool put a raw U+2028 where `\u2028` was typed; the parser stopped with
"Unterminated regular expression (23:89)". Replaced with the escape.

One function was left in the shell for a checker limit, `isIdentifier` (acorn's identifier tables are read with
`codePointAt`). Repro `lite/toolchain/repro/checker-codepoint.ts`, 2026-11-22 00:19:

```
bun soundscript/.scratch/tc-port/check.ts toolchain/repro/checker-codepoint.ts
tcReproCodePoint: unsupported  [unsupported] intrinsic member String.codePointAt
tcReproHasOwn: rejected [no-member] no property hasOwn on { entries: ...; keys: ...; values: ...; ... }
```

`Object.hasOwn` forced no rewrite: the tables are `Map`s read with `.get` and `??`.

## Bugs of today's, reproduced (not fixed)

```
repro/erase-optional-comment.ts   erase "const f = (x /*  */ ?) => x;"   (does not parse)   port "const f = (x /* ? */ ) => x;"
repro/erase-type-assertion.ts     erase "const f = (x) => <>x;"           (does not parse)   port the same
```

The first is the one DIFFERENT: the port reads the `?` as the first token after the name (comment-types.ts's
rule), not with `indexOf`. On the corpus the two rules give the same output (erase SAME 1415, SAME THROW 294).
The second the port reproduces, since erase.ts has no `TSTypeAssertion` case.

## What the integration step must change in shipped files

Importers of the four files, from the parse of every `.ts` under `tools/lang-experiment` (scratch, node_modules
and the `selfhost/opaque-handles` copies left out; `soundscript/.scratch/tc-port/importers.ts`, 00:21): 66 import
declarations outside the tc files, 8 in `lite/infer`, 27 in `selfhost`, 2 in `horde`. So the integration should keep the four files as
re-exports of the port rather than move each importer:

- `toolchain/ss-toolchain.ts`: replace the ported bodies with `export const { … } = TC` from `./tc-index.ts`,
  keeping `declaredNameAt`, `declaredName`, `tokensOf`, `paramsOf`, `isIdentifier`, the types and `toolchain`.
  `tc-shell.ts` imports `declaredName` from ss-toolchain.ts, and tc-diff/tc-shim import today's as `orig`; both
  must then import the kept functions, and tc-diff needs a frozen copy of today's to compare with.
- `toolchain/comment-types.ts`, `toolchain/module-js.ts`, `browser/erase.ts`: the same, re-exports from `TC`.
  Importers that then need nothing else: `horde/gen.ts`, `horde/lite-job.ts`, `browser/entry.ts`, `browser/run.ts`,
  `stdlib/runtime.ts`, `stdlib/build.ts`, `soundscript/{build,entry,verify,verify-raw,ts-cells}.ts`.
- `lite/soundscript/ts-cells.ts`: add the eight `toolchain/tc-*.ss.ts` to `SS_SOURCES` with `SS_HOME` CHECKER,
  checked with the INFER group (`tcAssemble` takes `mdPreludeCalls`, `tcGlobalRefStarts` takes `mdRebinds`);
  `SS_SHELL` `toolchain/tc-shell.ts` beside `acorn/acorn-shell.ts`; `tc-index.ts` in `BOOTSTRAP`, `tc-shell.ts`
  in `CHECKER_FILES`. The browser bundle (`soundscript/build.ts`) then carries the tc files.
- `fromObservableVariables` keeps today's shape in the re-export (`{ text } | { reason }`, as `tc-shim.ts`
  converts it). If the port's `{ text, reason: null } | { text: null, reason }` is exposed instead,
  `toolchain/translate.test.ts:11-12` must change: `"reason" in r` is then always true.
- `parseCompiled` keeps returning acorn nodes for `ss-toolchain.test.ts` and `roundtrip-edge.test.ts`
  (`passesModule` reads `.call`), or those two read the call from the definition's own parse.
- Deletable after that: the ported bodies (521 of the 550 lines). The four files stay as re-exports.

Unsure:

- The typed parse is the TypeScript parser; today's `parseCompiled`, `moduleJs`, `syntaxStub` and
  `fromObservableVariables` use plain acorn. 0 differences on the corpus; one probe
  (`soundscript/.scratch/tc-port/probe-generic-call.ts`, `a < b > (c)`, read as a generic call by TypeScript) gave
  the same kind and source on both. JavaScript the TypeScript parser refuses would show NOT COVERED; none was met.
- The speed: 1.8-1.9x on compile, 4.5-5.5x on decompile, measured at load 13-14.
- `selfhost/opaque-handles/{base,proto}/lite` (another agent, 23:53) holds copies of the tc files;
  `lite/infer/infer.test.ts`'s name check does not skip that tree.
- Cells are at most 25 lines, but some lines are over 300 characters.

## Review (2026-11-22 00:17, fresh agent, `/review-notebook`)

FIX, 7 findings and 1 minor, all confirmed by this session and taken: three text-matching line numbers
(erase.ts:22/:33, comment-types.ts:14), scratch paths that did not resolve from `lite/`, no way given to select a
shipped-test control, nine constants missing from the survey table, `isIdentifier` counted as covered (521/29
now), the `"text" in r` caller not named, a path and the working directory. It re-hashed all 16 files and they
matched the stamps.
