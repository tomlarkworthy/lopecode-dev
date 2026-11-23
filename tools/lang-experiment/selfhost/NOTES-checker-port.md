# Porting the checker to SoundScript

Work record, started 2026-11-21. Tom, 2026-11-21: "Lets try porting the checker next."
Earlier survey: `selfhost/checker-survey/RESULTS.md`.

## Gate for every port commit
A frozen copy of the checker (`lite/soundscript/.scratch/checker-port/frozen/`, not committed) and the live one
must give the same record for every cell of the corpus (status, each error's rule, line and message, value type):
`collect.ts <tree> out.json` then `diff.ts`. Bug fixes are separate commits, re-frozen after.

## 2026-11-21: the units that read only types, strings and names
Ported to four checked sources, linked for bun in `lite/types.ts` (the linker does not run the checker, so there
is no cycle): `lite/subtype.ss.ts` (member lookup, `sub`, `fnSub`, `unify`, `iterElem`, `callSigs`; largest cell
25 lines), `lite/walks.ss.ts` (`cloneProblem`, `uncloneable`, `admitsUndefined`, `holds`, `hasErr`),
`lite/island.ss.ts`, `lite/messages.ss.ts`. TypeScript code lines: registry.ts 444 -> 269, core.ts 407 -> 361,
infer.ts 1560 -> 1543, capture.ts 142 -> 137, island.ts 56 -> 33; added 392 checked code lines.
- Frozen against live, my run: 773 sources, 3124 cell records, 0 differences. The builder's second differential
  over 186 types (34596 `sub` pairs, 8928 `unify` pairs) also 0; 23 mutations each fail one of the two.
- Checker time on the corpus: 720-730 ms live against 764-782 ms frozen (min of 3 rounds, 3 sets, battery).
  `sub` 0.69-0.81 us per call against 0.63-0.83.
- verify 629 pass 0 fail (battery); one completion median 2.5 ms; Breakout 46.4 after play, 59.9 in the edit pane
  (AC runs earlier in the day gave 51-55 after play; the port does not touch the runtime).
- Recursion is tied inside one cell by passing functions as arguments (cells form a DAG).
- Two deliberate holes, kept so verdicts stay identical: `RegOps.at` hands a checked cell a `Ty` that can be
  `undefined` (a `Map` or `Iterable` written with no type arguments), and `RegOps.same` is object identity.
- A defect the differential missed and the builder caught: fresh type-variable names taken from `seen.size` made
  alias expansion hit its memo across separate `sub` calls and dropped repeated reports (one cell went from
  unsupported to ok). Fresh names come from a counter in registry.ts again; the type zoo now records reports.
- Left in TypeScript: `shapeOf` (`"k" in` no longer narrows; a tagged result is needed), `PRELUDE_FNS` and
  `ISLAND_CAPABILITIES` (the linker imports them), `expand`, `ifaceRec`, `convert` (they read the AST).
- Separate fix: `===` on an alias of a primitive union was `[strict-eq-object]`; the operands' aliases are now
  expanded (one line, infer.ts). Corpus changes 0. An alias of `keyof` compared with `===` is now `unsupported`.
- Checker bugs seen, not fixed: `Map`/`Iterable`/`ArrayLike` with no type arguments is accepted or crashes
  (`.scratch/checker-port/probes/mapnoargs.ss.ts`); `erase.ts` does not handle a `readonly` class field.

## The Checker class: shape (prototype, `selfhost/checker-shape/RESULTS.md`)
One cell per method with the working tables as `Mut` parameters checks, largest cell 25 lines, agrees with the
real checker on 64 of 64 programs, 5.1 us per program (one cell: 5.2; pure with copied state: 13.3). Cost: six
leading arguments on every call. Not started on the real class.

## The AST: route not settled
- Flat table (`selfhost/flat-ast/RESULTS.md`): works, 0 differences on two visitors, 1.6x lines, about 10 us per
  node at the boundary. Rejected by Tom, 2026-11-21.
- Nested tree crossing the boundary with node ids: prototype running in `selfhost/nested-ast/`.

## 2026-11-21: two performance defects fixed (found by `selfhost/nested-ast/`)
- Four type walks re-expanded a recursive alias at every level (`holdsWith`, `iterIn`, `Checker.hidden`, `sub`).
  Depth memos, a memoised `mayHide`, and a fast path at `Registry.sub` that runs only when no report would be
  lost. One cell over a 122-record recursive union: 93375 ms -> 273 ms to check; corpus 692 -> 371 ms (min of 7).
  Frozen against live, my run: 775 sources, 3202 records, 0 differences. `lite/walks.test.ts` bounds expansion
  counts (18071772 before, bound 100000).
- `cross()` tried union members in order; it now picks by a shared literal tag when every member is a record:
  8.02 -> 0.95 us per node. One verdict changed of 8219 cases: a value whose tag getter returns a different
  value on each read was crossed and is refused now. `lite/boundary.test.ts`.
- verify 629 pass 0 fail on AC; completion median 2.4 ms; Breakout 54.5 after play (the 46 seen earlier was on
  battery).
- Subtype defects seen and kept as they are (repros in `lite/soundscript/.scratch/perf-fixes/probes/`): a pair
  that failed earlier in one comparison stays in `seen` and counts as true later in it; `S <: S | null` is
  rejected for `S = Mut<number[]> | number`; `Mut<number[]>` against `MN | Promise<MN>` is rejected.

## Rulings, Tom 2026-11-21
- Recursive types may cross the boundary ("recursive types are very useful and we will probably do lots more
  acorn stuff in the future"). Not yet in the shipped code.
- A module `soundscript-acorn`, written in SoundScript except for the unsound parser cell, bundling the
  dependency and the types, giving a checked function entrance to typed acorn ASTs. Prototype running in
  `selfhost/ss-acorn/`; it needs a checked cell to call a shell cell's function with the result validated per call.

## 2026-11-21: recursive types cross the boundary (shipped)
- Check time: a recursive alias may cross when an object, array or tuple lies on every path from it back to
  itself; `type A = A | number` is `[boundary-type]`, and so is a generic alias that recurs with growing
  arguments. Functions, handles, actions, promises, maps inside one are refused as before.
- Run time: the walk keeps its own stack (no depth limit; a 100000-node list and arrays nested 100000 deep
  cross); a cycle is a mismatch (`x.kids[0].kids[0]: a cycle`); an object reached by two paths under the same
  type is copied once; the copy is frozen at every depth.
- Cost: `lite/boundary.ts` 180 -> 340 lines (+228 -68), unchecked. Per node 0.99 -> 0.75 us on the flat corpus
  (the internal mismatch is no longer an `Error`), 0.66 us for a nested AST as a recursive type.
- Against a frozen copy of the boundary: 360 of 360 corpus inputs equal, 13 bad values same text, 20000 random
  shape/value pairs 0 differ; 16 of 272 annotations differ, all recursive types. Two deliberate changes for
  non-recursive types: values deep enough to throw RangeError now cross; an Array subclass is copied as an Array.
- verify 635 pass 0 fail (3 new spec tests, each on the page and on the reopened export); AC; completion 2.4 ms.
- Open: a cycle under a union that is not recursive keeps today's generic message; `type A = { a: A }` is
  accepted though no finite value fits; the alias reference name comes from `show()`.
- Spec sentences added to S11.3, S11.4, S11.5 (for Tom's wording review).

## 2026-11-21: fresh review of the day's changes (since af1f1048): FIX, 5 findings, all taken
1. A mismatch under a union was reported at the union: a `List` with a bad `v` 51 nodes down gave
   `p.next: expected List or null, found an object`. Now the member the value could only be (by tag, or by kind)
   reports: `p.next…(x50).v: expected number, found string "bad"`. Applied to non-recursive unions too; verdicts
   unchanged, messages changed (833 of 20000 random cases now name a place below the union).
2. A recursive generic alias with an argument nested more than 6 deep was refused (keyed on a shortened name).
   Fixed with a structural key. The same cause accepted wrong values for a non-recursive
   `{ x: W<deep number>; y: W<deep string> }`; fixed too. `Registry.expand` has the same show-keyed memo for the
   checker's own subtyping; left as it is (the port is verdict-identical), open.
3. A hole in an array or tuple crossed as a hole (`[1, <hole>]` as `[number, number]`). A hole is read as
   `undefined` now. S11.5 gains a sentence.
4. S11.3 said a generic alias recurring with other arguments is refused; only growing arguments are. Reworded.
5. The walks section sentence named three of five walks. Reworded.
Also restored: `iterElem` on a literal that is neither string, number nor boolean returns string again (no
program reaches it). boundary.test 61 pass; verify 635 pass 0 fail (AC); frozen against live differs on the 4
intended S11.3 records only; boundary cost 0.65-0.67 us per node flat, 0.61-0.62 nested.

## Rulings, Tom 2026-11-21 (continued)
- Functions may cross: "the general rule as built, with the trust written into the spec" (prototype
  `selfhost/ss-acorn/RESULTS.md`). Not yet shipped.

## 2026-11-21 night: functions cross the boundary (shipped)
A function type, or an alias of one, as the whole annotation of a parameter fed from another language: the cell
gets a frozen wrapper that copies arguments, checks and copies each result, and turns any throw into a fresh
TypeError. `boundary.ts` +57 lines; `core.ts` +2 -2; `runtime.ss.ts` +4 -1. boundary.test 106 pass; data
crossings unchanged (360/360, 20000 random 0 differ; 0.65 us per node before and after). verify 643 pass 0 fail
(AC). New statement S11.11 states the trust; S11.3 to S11.6 and S11.9 gain sentences; three tutorial/core lines.
Two leaks beyond the prototype were found and closed by the builder (a changed annotation kept the old result
check; a real Promise with an own throwing `then`).
Open after this commit, both taken up next:
1. An action can still call the function through a state cell: `box = (g) => state(g)`, then
   `action(() => n.set(read(box)()))` is accepted and calls it. S11.9 states this as it is.
2. A shell cell handed to the checker as `shell:` goes through another branch of `core.ts` and arrives as
   `unknown`, so the rule does not cover it. The acorn parser cell is such a cell.
For Tom (reviewer's findings outside this change): `viewHandle` caches the first `State` shape per view, so a
later different `T` is ignored (S11.7, reproduced); S11.7 does not state the check made on reads; wrappers are
keyed by cell and parameter name in one module-wide map, so two modules with the same names replace each other's.

## 2026-11-21 night: the acorn cells (shipped), and the two gaps of function crossing closed
- Gap 1 closed: a cell that takes a function from another language, or a cell that reads one, may not hold a
  value whose type may be or hold a function in a state cell, nor yield one from an events cell
  (`[action-capture]`). No previously accepted corpus cell is rejected. Over-approximates: whole cells are
  marked. Open: `StateCell<{}>` holding the function is accepted (calling it is `call of never`).
- Gap 2 closed: a shell cell's function crosses to a checked cell of the same module the same way (S9.1).
  The port runner `run.ts` applies no wrapper.
- `lite/acorn/`: one unchecked cell `acornParse` (41 lines) and a generated field table; checked `parseTree`,
  `kidsOf`, `isFnNode`, `preorder`, `parents`, lines and leading comments (12 cells, largest 16 lines); 155
  generated node types plus `Other`; `gen.ts --check` is the regeneration test. In the checker module for now.
  `lite/acorn.test.ts`: 253865 corpus nodes and 260675 held-out nodes, 0 differ from `parse.ts`; errors equal on
  2237 failing truncations; controls differ.
- `lite/acorn/syntax.ss.ts`: module shape and the syntax bans over the typed tree, 18 cells, largest 13 lines.
  `lite/syntax.test.ts`: 833 inputs and 2696 cells same as `core.ts`, 13 controls each change the result.
- NOT switched over: with `core.ts` calling `syntaxCheck`, verdicts were identical (0 of 3239 records) but one
  completion went 2.3 -> 10.7 ms, one keystroke's lint 3.1 -> 5.4 ms, the corpus 575 -> 1020 ms. `parseTree` is
  1.4-1.9 us per node against 0.44-0.87 for `parse.ts`, and the text is parsed twice while the rest of the
  checker still uses `parse.ts`. Why completion slows more than lint was not measured. The switched `core.ts`
  is kept in `.scratch/acorn-ship/core.p3-switched.ts`.
- verify 643 pass 0 fail (AC), completion median 2.4 ms. Notebook 3,687,199 -> 3,908,868 bytes.
- The frozen-checker differential's `collect.ts` reads `lite/*.ss.ts` only, not `lite/acorn/*.ss.ts`.

## 2026-11-21 14:50: why the switch to the typed tree is slow; `core.ts` stays unswitched
Profiled in Chromium on the 47-cell tutorial module (1027 nodes), AC power. Three fixes shipped, no verdict
changes: (A) a union member that cannot take a primitive value is no longer tried (527 thrown mismatches per
crossing, mostly `null` in `AstNode | null` fields): switched completion 9.5-10.3 -> 5.6-5.7 ms; (B) one pair
of parser classes, `acornParse` uses `parse.ts`'s `TS`/`TSX` (a second pair doubled `parse.ts`'s own parse,
302 -> 591 us): completion 5.6 -> 5.0 ms; (C) no array and closure per node in `acornParse`.
A wider version of (A), skipping members for objects too, changed verdicts (a value whose `then` getter throws
went from refused to accepted; 22 of 60 control cases) and was narrowed.
After the fixes, switched against unswitched: completion 5.0-5.3 vs 2.3 ms (2.17x), lint 4.3-4.6 vs 3.1 ms
(1.42x), corpus 1472 vs 1050-1068 ms. What the remaining 1.4 ms per check is: acorn's second parse 0.6-0.7 (goes
when nothing reads `parse.ts`), the rebuild as plain rows about 0.2, the boundary copy and validation 0.4-0.5
(the cost of the design), the ban walk 0.1. Unexplained: the copy costs more inside completion than inside lint
in V8. Ruled out: `preorder`/`parents` recomputation, re-linking, several checks per completion, a missing cache.
So even with one parse, a checked tree costs about 0.8 ms on a 2.2 ms check. For Tom: whether that is acceptable
(his ruling for the runtime was checked, then readable, then speed), or whether the tree should cross once per
module text. Until then tree-walking ports ship unswitched, each with a differential test against the TypeScript.
verify 643 pass 0 fail; completion 2.4 ms. `collect.ts` now includes `lite/acorn/*.ss.ts` (815 sources, 3395 records).

## 2026-11-21 16:01: the `Checker` class as cells (`lite/infer/`), not switched on
Record of the work: `lite/infer/NOTES.md`. 82 of the 83 methods of `infer.ts`'s `Checker` are SoundScript cells
over the typed tree: 198 value cells and 34 types in 15 files, median 8 lines, largest 26, 1858 lines; one cell
per method, the working tables as `Mut` parameters `(K, T, V, W, C, env)`, the recursion tied by `ixKnot`. The
registry stays TypeScript and is handed in as a record of functions. Every cell is accepted by the live checker.
`bun lite/infer/diff.ts`, my run: `823 sources, 3451 cells: SAME 3437 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14`
(the 14 crash in the registry code both share, `Map` with no type argument). Compared per cell: each diagnostic
by rule, line, span and message, and the function type. Control: `ixArity` without its "at most" check gives 75
DIFFERENT. Tests `cd lite && bun test infer/infer.test.ts`: 4 pass; the self-check test had no time limit of its
own and failed at bun's 5 s under load, so it now has the 120 s its neighbour has.
Cost: 1.57-1.60x the TypeScript `Checker` per cell under load (480-496 against 247-255 us on a quiet machine).
Checking `lite/infer` with the live checker takes about 640 ms.
Not done: the facts that ownership, completion and `facts.ts` read after `fnExpr`; completion's identifier hook;
the registry taking typed nodes. Two gaps of the typed tree found, each with a repro in `lite/infer/repro/`: a
function expression with type parameters, and a JSX attribute with no value (`<input disabled />`) come through
as `Other`. Branch coverage of the cells by the corpus was not measured.

## 2026-11-21 16:50: worker pool, `shapeOf`, the boundary's decisions and five small units are cells (shipped, switched on)
- `lite/pool.ss.ts` (15 cells, largest 13 lines): `poolStep` takes the pool's state and one event and returns the
  next state and the effects. `makePool` 65 -> 44 unchecked lines. 2000 scripted runs against the frozen pool, 0
  differ, including 25 resends whose post throws; two mutants differ on 896 and 1973. Cost per job 0.19 -> 1.34 us
  at queue depth 1, 0.20 -> 57 us at depth 1000: every step copies the slots and both Maps. Not fixed.
- `lite/shape.ss.ts` (15 cells, largest 23): type to shape, with the error as a tagged value. 272 annotations and
  20000 random types, 0 differ; 0.76-1.00x the time. On `Array` with no argument the frozen copy throws and the
  cells refuse; the registry never produces that type.
- `lite/cross.ss.ts` (17 cells, largest 16): mismatch messages, path trimming, the per-union tables (tag, member
  kinds, sole member), which mismatch a union reports, the function wrapper's paths, and three per-node decisions.
  The walk itself stays in the shell (reads foreign values, keeps identity, freezes). 360 corpus inputs, 20000
  random pairs, 3047 trees, 60 getter cases: 0 differ. 0.48-0.64 us per node, as before. The three corpora do not
  catch a mutant of `primFits` or `propStep`; only `cross.test.ts` covers them, `propStep` without a mutant.
- `lite/checks.ss.ts` (5 cells): the check key, the two LRUs, stand-ins, refused cells, island keys. A cached
  `check()` 0.77 -> 3.1 us (the LRU copies its Map per touch; measured on battery).
- `boundary.ts` 410 -> 256 code lines, `workers.ts` 119 -> 98, `stdlib/runtime.ts` 109 -> 94.
- My run: pool 25, shape 21, cross 24, checks 14, boundary 123, workers 8, runtime 82, complete 58, syntax 14,
  ts-cells 9 pass; fixtures 14/14; verify `power Battery Power; functional 643 pass 0 fail` (runtime module 157
  cells, 108 with values; checker module 327, 127 with values). Timings were on battery under load and are not
  comparable (completion 11.9 ms, lint 16.2 ms); to be rerun on AC.
- RED at this commit: `lite/acorn.test.ts` 5 pass 1 fail, `Other 3`. The census now reads `lite/infer/repro/`,
  whose files are the repros of the two typed-tree gaps. The gaps are to be fixed in `lite/acorn/`.
- OPEN: since the build of 15:44 the build log has 12 lines "error building module dependancy map" (cell-map,
  editor-5, module-selection, claude-code-pairing, three each); 0 in the build of 15:28. Exit 0, same output
  hash on rebuild, verify passes. Cause not found.

## 2026-11-21 17:05: facts, the ownership pass and captures as cells (`lite/infer/`), not switched on
Record: `lite/infer/NOTES.md`. `own.ts` (3 functions, 516 of 542 lines), `capture.ts` (5 functions, 135 of 158)
and the "fed" rule of `core.ts` are 126 `ow-*` cells in 12 files (median 8 lines, largest 25); the inference
cells now leave the facts those passes read. 383 cells in `lite/infer/`, all accepted by the live checker.
`bun lite/infer/diff.ts`, my run: inference, facts, ownership, captures and the fed rule each SAME 3437,
DIFFERENT 0, NOT COVERED 0 (14 crash the same). With the probes the builder's run compared 3581. 8 controls of
the ow cells and 10 of the facts each differ; two are caught by probes only (`sp2`; `cn7`, `cn8`).
Cost per cell under load: ownership 92-102 against 66-80 us; captures 157-198 against 44-51 us (rebuilds its
tree index per call; not optimised). The live checker takes 5.5-6.1 s to check `lite/infer/` (383 cells).
Captures were compared under two made-up taint maps (none, all), since the real one needs the module graph.
TypeScript bug reproduced, not fixed: `const f = function g(){ m.push(1) }; return f;` is accepted where the
arrow form is `[mut-capture]` (`lite/infer/repro/named-fn-expr-helper.ts`).
Left before the per-cell check can be switched: injected parameter types and their rules; the taint map and
"fed by" text from the module's cell graph; the cell-level rules on the value type (state-undefined,
state-in-state, iterator-cell, listener-placement); crash path, dedupe, line mapping, value bookkeeping.

## 2026-11-21 17:53: `checkSources` as cells (`lite/infer/md-*.ss.ts`), not switched on
Record: `lite/infer/NOTES.md`, "Stage 4". `core.ts`'s `checkSources` (lines 37-359 of 397) and `distinctNames` are
62 `md*` cells in 11 files (median 9 lines, largest 26): injected parameter types, the cell graph and taint, the
value rules, the bookkeeping. With the ix and ow cells: 493 cells, all accepted by the live checker.
`bun lite/infer/diff.ts --module-only`, my run: `whole module: 913 sources: SAME 911 DIFFERENT 0 NOT COVERED 2`.
Compared per source: header, module errors, every cell record with its key order, facts, spans. 10 controls, one
broken cell per file, give 3 to 242 DIFFERENT. `bun test infer/infer.test.ts`: 5 pass.
The 2 not covered are one fixture and its strictIndex-off copy: a parameter named `valueOf`. `core.ts` tests
`name in CAPABILITIES`, which is true for every name of `Object.prototype`; the port does not copy that and says
NOT COVERED (`lite/infer/repro/object-prototype-param.ts`). For Tom: fixing it changes verdicts for parameters
named `valueOf`, `constructor`, `toString`.
TypeScript glue left: 70 lines of `index.ts` (the Registry and its `parse.ts` parse; `thrown(e)`, since a cell
cannot read a caught value without `instanceof`; building the result). Not ported: `opts.onCell`, completion's hook.
A missing memo made the port take 73 s on the 493-cell module against 9.4 s (`mayHide` is memoised per Checker in
`infer.ts:532`); with the memo 10.2 against 9.2 s.
End to end, on battery at load 7-8, so ratios only: corpus pass 1.1-1.2x `checkSources`, the tutorial module
1.0-1.4x. Of the port's corpus pass: inference about half, parse and crossing a fifth, module rules a sixth.
A switch-over would change: `core.ts` (`checkSources` calls the md entry; `onCell` kept or ported); `ts-cells.ts`
(register the ix, ow, md files); a decision on the `in CAPABILITIES` bug; `instanceof` in the language or `thrown`
kept as glue.

## 2026-11-21 evening: the 12 build-log lines; `core.ts` switched to `syntaxCheck` (shipped); pool and LRU left
Scratch: `lite/soundscript/.scratch/switch2/`. All timings on battery at load 5-9.
- The 12 lines `error building module dependancy map` come from module-map's `summary` cell (second loop: a module
  variable whose `_value` is not in `modules`), in the toolchain notebook `spec-notebook.ts compiler()` boots. The
  variable is `module d/57d79353bac56631@44` (imported for `hash` by module-selection, cell-map, editor-5,
  claude-code-pairing): `lope-runtime.js` resolveSpecifier does not drop `@44`, the block id is `d/57d79353bac56631`,
  so the import is a stub and `runtime.module(undefined)` an unregistered empty module. 4 lines per `summary`, 3 runs.
  Whether `summary` runs before `loadNotebook`'s settle (5 stable 250 ms polls) returns is a race: nothing computes it
  afterwards. `mm-race.ts`: pollInterval 500 gives 0 lines, 50/100/250 give 12; every default boot I ran gave 12 (one 0 was a
  boot with http fetches refused).
- Not this tree: `toolchain-boot.ts` imports no file of it and prints 12; the after-p2 snapshot built now prints 12.
  No file on the build's path changed 15:28-15:45 (two under `tools/scratch/cloud-brain-experiments` did).
- The step is in machine speed: the frozen `checkShape` bench read 0.64-0.71 us/node up to 15:35:58 and 2.914 at
  15:45:35; verify logs say AC Power to 15:30, Battery Power from 16:15. A 0-line and a 12-line build of the same
  tree are byte-identical (15563bed..., the shipped hash then). Left as is (outside this folder).
- `core.ts` calls `syntaxCheck` (acorn/syntax.ss.ts); its syntax pass and module-level loop are gone, frozen in
  `lite/syntax.frozen.ts` for `syntax.test.ts` (889 inputs, 888 shapes and 3280 cells same, 13 controls). Differential
  `collect.ts`: 0 of 3499 records differ; control (no-this dropped from SYNTAX_BANS): 14 differ. Corpus (collect, min
  of 3, 823 sources): 4479 and 4425 ms unswitched, 7531 and 8003 switched. verify medians, three rounds alternated:
  lint 14.2/16.8/19.9 -> 18.1/21.9/17.5 ms, completion 10.0/12.4/12.8 -> 23.5/25.3/20.8 ms.
- verify's boot check "listeners attached 3, clocks pulled 0" failed in 2 of 4 battery runs of the switched build
  (4 and 1), 0 of 3 unswitched; full verify 642 pass 1 fail. Each fail follows "spec tests wait 116 spec tests not
  settled in 60 s" (the spec's tests still pull clocks); one unswitched battery run (ports-night/verify-mine.log) had
  that wait and passed. `spec-settle.ts` on AC at load 2.5: 5598-5920 ms unswitched, 5825-5995 switched.
- On AC, later the same evening: verify medians unswitched lint 3.3, completion 2.4 ms; switched 5.0 and 5.0 ms (one
  round each); two full verifies of the shipped notebook: one stopped by "Execution context was destroyed" at
  verify.ts:2323 (core-only, 596 pass 0 fail; the same stop is in .scratch/modkey/verify-final-3.log), then
  `power AC Power; functional 643 pass 0 fail` (lint 4.7, completion 5.0 ms).
- Pool: depth bounded by the Mandelbrot section, 4 x pool size (at most 8) per image; `depth.ts` (scripted drag, one
  image per event, 1 to 64 answers between events) peaks at 63. `pool-bench` at 24/63: 13-15/22-24 us per job (1000:
  226-245). Left. LRU limits are 16 and 64: cached check 0.65 -> 4.7 us, no growth. Left.

## 2026-11-21 evening (switch3, step 1): the `CAPABILITIES` own-property fix (approved by Tom)
Scratch `lite/soundscript/.scratch/switch3/`. `name in CAPABILITIES` (true for every `Object.prototype` name) is now
`Object.hasOwn(CAPABILITIES, name)` at `core.ts` 231, 278, 280, `complete.ts` 271 and `toolchain/ss-toolchain.ts` 300 and 466
(the compiler looked up `IN["valueOf"]` and the decompiler refused a `valueOf` input as a capability). The port's
NOT COVERED stop and `MdReg.inherited` are gone (`md-inject`, `md-taint`, `md-types`, `index.ts`).
- Verdicts, frozen-checker differential (`collect.ts` before/after, compared with `switch3/ndiff.ts`, which keys the
  spec's reject rows by statement since a new row shifts every later `#index`): 823 -> 831 sources, 13 record
  differences, all new rows: three S2.1 rows (`(valueOf)`, `(constructor)`, `(toString)`: `[inject-unknown]`), one
  S11.9 row (an outside cell named `constructor` captured in an action: `[action-capture] ... (the value of
  constructor, a cell in another language)`; before the fix `[inject-type] constructor: function Object() ... is not
  assignable to number` and `constructor is a capability`), and their inline copies. 0 existing records changed.
- `port:fixtures/lite-types/reject-generics` did not change: it has a cell named `valueOf`, and the cell-name branch
  is tested first in both checkers. It was NOT COVERED only because the port tested `inherited` before cell names.
- `bun lite/infer/diff.ts --module-only`: 919 sources, SAME 919, DIFFERENT 0, NOT COVERED 0.
- Unit tests in `toolchain/ss-toolchain.test.ts`: for valueOf, constructor, toString, hasOwnProperty, `__proto__`, alone
  `[inject-unknown]`, with a cell of that name `ok`, and the compiled cell takes that variable; the S11.9 message.
- Gates (battery, load 5-6): acorn 5 pass 1 fail (`Other 3`, the open typed-tree gaps, step 3), syntax 14, pool 25,
  shape 21, cross 24, checks 14, boundary 123, workers 8, walks 13, complete 58, runtime 82, events 29, store 38,
  render 25, ts-cells 9, erase 6, comment-types 37, raw-cells 18, ss-toolchain 37 files, roundtrip-edge 114,
  ojs-roundtrip all, translate 32, jsx proof, selfhost diff, selfhost/rt diff, gen --check 0 of 3 differ, infer.test
  5 pass, fixtures 14/14. Build 12 "dependancy map" lines; verify --quick `power Battery Power; functional 217 pass 0 fail`.

## 2026-11-21 evening (switch3, step 2): `messageOf(e: unknown): string`, a prelude function (approved by Tom)
Unchecked, in `prelude.runtime.ts` (8 lines): `e instanceof Error && typeof e.message === "string" ? e.message :
String(e)`, inside a `try` whose catch gives `(a thrown value whose text cannot be read)`. Wired as `equals` is:
`intrinsics.ts` (`PRELUDE_FNS`, a `declare function` in `PRELUDE_DECLS`), `prelude.d.ts`, `stdlib/runtime.ts` (so
`soundscript.messageOf`), `browser/run.ts` `PRELUDE_VALUES`, `browser/workers.ts` (`EXEC`'s own copy and its `new
Function` parameter list), the checker (`infer.ts` `preludeCall` and the constructor's declared-type patch; `ix-prelude`
`ixPreludeCall` and `index.ts` `globalsOf`: one argument else `[arity] messageOf takes one argument`, type `string`), and
the argument-position rule (`own.ts`, `ow-pos`: an argument of `messageOf` is not kept, as for `equals`). Completion
offers it from the globals. `md-run` now calls `messageOf(e)`; `MdReg.thrown` is gone from `md-types` and the glue.
`core.ts`'s crash line is `checker crashed: ${messageOf(e)}` (was `(e as Error).message`: the same text for an
`Error`, `undefined` before for a thrown non-Error; no corpus record has a non-Error crash).
- Spec: S2.6's list gains `messageOf`; new S2.12 (PROSE PENDING); 3 reject rows (two `[arity]`, one `[type]`);
  `spec-2.ts` gains `s2_caught` (an Error's message, a thrown string, a thrown number: `["boom", "plain", "7"]`);
  `test_spec_S2_12` also runs `soundscript.messageOf` on a TypeError, a string, 42, null, an Error whose `message` getter
  throws, an object whose `toString` throws, and `Object.create(null)`.
- Verdicts (collect, after step 1 -> after step 2): 831 -> 837 sources, 9 record differences, all new: the 3 rows and
  their inline copies, and `s2_caught: ok`. `diff.ts`: 837 sources, 3468 cells, SAME 3454, DIFFERENT 0, NOT COVERED 0,
  REAL CRASH 14; facts, ownership, captures, fed rule 3454 SAME; `--module-only` 927 SAME, 0 DIFFERENT, 0 NOT COVERED.
- Gates: as step 1 (acorn still 5 pass 1 fail, `Other 3`); ts-cells 9 pass after the build; build 0 "dependancy map"
  lines this time (5.1 s); verify --quick `power AC Power; functional 218 pass 0 fail` (load 5.9).

## 2026-11-21 evening (switch3, step 3): the two typed-tree gaps
`lite/acorn/synthetic.ts` gains `const fe = function <T>(x: T): T { return x; };` and `<input disabled />`; `census.ts`
and `gen.ts` regenerate: `FunctionExpression.typeParameters: AstNode | null` (a kid after `id`, row
`["typeParameters",1,1]`), `JSXAttribute.value: AstNode | null` (`kidOne`, row `["value",1,1]`). No other change in the
three generated files. Cells: `ix-fn` reads `e.typeParameters` for a FunctionExpression (was `null`); `ix-jsx`
`ixJsxProps` gives a bare attribute `{ type: "Literal", value: true, raw: "true" }` at the attribute's span, as
`infer.ts` does, and its `ixGap` for it is gone.
- `bun lite/acorn.test.ts`: 6 pass 0 fail; census inputs 344553 nodes, `Other 0`; held out 260675 nodes, `Other 0`.
- Probes: `probes/wide.ts` +4 cells (genFe, genFeUse, genFeBad, genFeNamed), new `probes/jsx.tsx` (6 cells: bare
  attributes on input and button, `value` bare (rejected `[type]`), unknown bare (`[excess-property]`), mixed, `hidden`
  on a span (`[excess-property]`)); `infer.test.ts` runs jsx.tsx in its control. `diff.ts` on the probes and both
  repros: 4 sources, 79 cells, SAME 79; facts, ownership, captures, fed rule SAME 79; `--module-only` SAME 2.
- Verdicts: collect after step 2 -> after step 3: 837 -> 837 sources, 0 record differences (the TypeScript checker
  read both constructs from `parse.ts` already; only the port was NOT COVERED there).
- Gates (AC Power, load 3.8-5.6): all as step 2 except acorn 6 pass 0 fail; complete.test median 1.2 ms; infer.test 5
  pass (13.1 s). `ojs-roundtrip` failed once in the gate run, `generated-ss ... not the source's 484 cells in order`,
  because the gates ran before the build (the notebook still had step 2's acorn-types); after the build: all pass.
- Build 5.1 s, 0 "dependancy map" lines; notebook 3,948,835 bytes (3,944,955 after step 1).
- Full verify (AC Power, load 3.79 at start, 3.86 at end; 3 min 38 s): `functional 645 pass 0 fail; measurements 8`;
  checker module 327 SoundScript cells ok by ss_check; one keystroke's lint median 5.0 ms, max 6.7 ms of 30; one
  completion median 5.1 ms, max 6.8 ms of 30; Breakout 59.9 world changes/s in its own pane, 48.4 after a click on play;
  spec tests settled (verify prints only a failure to settle in 60 s).
- Pre-switch baseline for step 4, taken here: `checker-port/out/base-switch3.json` (837 sources, 3516 cells; AC Power,
  load 4.14; collect rounds 1931, 1664, 1713 ms, min 1664 ms = 473.3 us/cell); `lite/infer/frozen/` written by
  `.scratch/switch3/freeze.ts` from the same tree; `.scratch/switch3/post-step3/` holds that tree.

## 2026-11-21 night (switch3, step 4): checkSources runs the cells
`lite/core.ts` `checkSources` is `runCheck(mdCheckSources, ...)`. `core.ts` (398 -> 201 lines) now holds only the glue:
the Registry as `MdReg` (`mdRegistry`, `makeReg`, `regCore`, `globalsOf`, the parse.ts node index) and the
`LiteResult` assembly (`runCheck`). New bootstrap `lite/infer-ss.ts` (75 lines, gives no cells) links the 39 ix/ow/md
files and exports `mdCheckSources`, `ixHidden`, `ixActionIn`, `owIter`. Deleted: `infer.ts` (1690), `own.ts` (541),
`capture.ts` (157). `infer/index.ts` (270 -> 49) is test tooling (compile-hook `makeReg`, `runIx`, `runMd`).
- Completion is on the cells: `CheckOpts.probe = { name, member }`; `IxK.probe`, `IxCtl.probe`; `ixIdent` records
  `ixScopeNames` (the bindings of the scope chain, innermost first, each name once, type in the current flow) and
  `inAction` at the first read of the name; `ixMember` records the object's type at the first non-computed read of
  it as a member; `MdTables.probe` keeps the first across cells; `LiteResult.probe` (not enumerable) gives it with
  the Registry. `complete.ts` (319 -> 298) builds its options from that; `onCell` is now `() => void`, called per
  cell's registry view, so `completionWork` counts as before.
- Importers re-pointed: `jsx/lower.ts`, `oracle.ts` (`kids` from parse.ts); `walks.test.ts` (`owIter`, `ixHidden`
  over `regCore`; expansions identical: 369, 3081); `syntax.test.ts`, `infer/diff.ts`, `selfhost/checker-shape`,
  `selfhost/checker-survey` -> `lite/infer/frozen/`.
- Frozen fixture `lite/infer/frozen/` (core, infer, own, capture, complete; 3115 lines), header-marked, imports of
  other files re-pointed to the live ones, not reached by the build. New `lite/infer/complete-diff.ts`.
- ts-cells.ts: `infer-ss.ts` in BOOTSTRAP; the 39 files in SS_SOURCES and CHECKER_FILES (before core.ts); checked once
  as a group (`SS_GROUPS`) with the 10 sections they take; `SECTION_OF` puts ix under "Type checking a cell", ow
  under "Ownership", md under "Checking a module". `keyOf` in core.ts renamed `spanKey` (clashed with jsx/render.ts).
- Differentials:
  - `diff.ts` vs frozen: 837 sources, 3468 cells, SAME 3454, DIFFERENT 0, NOT COVERED 0, REAL CRASH 14; facts,
    ownership, captures, fed rule 3454 SAME. `--module-only`: 927 SAME, 0 DIFFERENT, 0 NOT COVERED.
  - collect `base-switch3.json` -> `final-switch3.json`: 4 sources differ, 8 record lines (4 records). Each is the
    number of a fresh type variable in a message: frozen `T'1331`, `T'1291`, `T'635`, `T'636`, cells `T'1000001`.
    The frozen numbers come from infer.ts's module counter: the same source gives `T'635` in the ss: job and `T'636`
    in the ssx: job of one run. Rule, line, status and the rest of each message are equal. With T'N renumbered by
    first appearance (`.scratch/switch3/tvdiff.ts`): 0 record differences. These 4 are the only records in the corpus
    holding a T'N. Probe (`tv-probe.ts`): 3 modules where a cell takes another cell's value made from an unresolved
    generic: frozen and cells agree (the value is `unknown[]`); no fresh variable reached another cell's type.
  - `regdiff.ts`: identical (543310 bytes).
  - completion: `complete-diff.ts`, 37 files, 6385 positions, SAME 6385 (1733 with no options), DIFFERENT 0.
  - Controls (one cell broken in place, collect, restore): ix `ixIdent` free-name message: 27 sources, 108 lines
    differ; ow `ow-pos` escape message: 31 sources, 104; md `md-inject` inject-unknown message: 85 sources, 358;
    each restored file cmp-equal; collect after the controls: 0 differences.
  - A source that does not parse now throws `Error(message)` (was acorn's SyntaxError with pos/loc); the message is
    equal. Readers of a checkSources throw (stdlib checkCells, core.ojs, complete.ts) read only the message.
- Timing (all AC Power):
  - collect min of 3: 1664 ms pre (load 4.14), 1845 ms post (load 3.54); final run 7234 ms (load 4.8, see below).
  - double parse: parse.ts parse is 6.7 ms of 72.0 ms checkSources (9.3%) over the 37 examples and fixtures; left.
  - first post-switch full verify (load 2.86 -> 3.81; 10 min 52 s, was 3 min 38 s): `functional 645 pass 0 fail`;
    checker module 796 SoundScript cells (327 + the 469 of lite/infer); lint median 5.7 ms (was 5.0); completion
    median 24.9 ms (was 5.1); Breakout 60 and 50.1/s.
  - spec tests settle (settle.ts, 3 runs each, load 3.8-4.3): pre 28.8, 29.8, 29.9 s; post 25.8, 27.1, 27.6 s.
  - final full verify after the glue split (load 5.02 -> 4.79; 14 min 51 s): `functional 641 pass 4 fail`. The 4 are
    "listeners attached 4, clocks pulled 1" after "117 spec tests not settled in 60 s". The machine was slow for both
    checkers in that hour: Breakout 11/s (60 before), lint 23.1 ms, completion 26.7 ms. Back to back right after it
    (cprof.ts, 30 completions of count.): pre-switch notebook 26.6 ms, post 34.4 ms; under the profiler 23.3 vs
    25.4 ms. Top self time in both is the boundary copy of parseTree's tree (copyEnter, copyResume); new in post:
    nodeIndex (the parse.ts node index), 1.5%.
- Gates: all 28 pass (syntax.test needed its frozen path); build 32.9 s with 12 "error building module dependancy
  map" lines; notebook 4,171,958 bytes (3,948,835 before).

## 2026-11-21 20:10: my run of the switched checker
`power AC Power; functional 645 pass 0 fail` with nothing else running (log `.scratch/switch3/verify-mine.log`):
checker module 796 SoundScript cells (499 with values); one keystroke's lint median 6.0 ms (max 8.9), one
completion median 5.9 ms (max 6.9); Breakout 60 in the edit pane, 48.9 after play. Before the whole port, on
AC: lint 3.1, completion 2.3 ms. The builder's 24.9 ms completion and its 4 failed boot checks were taken
while the machine was loaded; they did not recur.
`diff.ts --module-only`: 927 SAME, 0 DIFFERENT, 0 NOT COVERED. `complete-diff.ts`: 6385 positions SAME.
acorn.test 6, syntax 14, boundary 123, complete 58, runtime 82, ts-cells 9, pool 25, shape 21, cross 24,
checks 14, infer.test 5 pass; fixtures 14/14.
Not verdict-identical in one respect, kept: a fresh type variable's printed number (`T'1000001` where the old
checker printed a number from a counter carried across checks). 4 corpus records.

## 2026-11-21 20:43: review of spec sections 9 and 11 (review4)
Scratch `lite/soundscript/.scratch/review4/` (probes `p1.ts` to `p4e.ts`, `harness.ts`, logs).
- Function wrappers per module. `boundary.ts` kept `fnWrappers` and `last` per `"cell.param"` for the whole page, so
  two modules with a cell and parameter of the same names evicted each other's wrapper (`p1.ts`: identity false for
  both modules on alternating deliveries, direct and compiled). `cross(value, shape, path, module = null)` keys both
  maps by `"<path> in <module>"`, as `events` keys its handles; the compiler passes `ctx.module` as the fourth
  argument; `core.ojs` `ss_instance` overrides `ss_cross` with the copy's name, as it does `events` and `listen`.
  A definition compiled before this calls `cross` with three arguments and is keyed under `null`.
  Tests: `boundary.test.ts` (two modules `@t/one`, `@t/two`), `test_spec_S11_6_function` (a second `spec_load`).
- S11.9 hole, closed. A function from another language held as `{}` crossed the fed rule: `ixMayHide` returned
  false for a record with no required property, which a function is assignable to. Runtime proof (`p4run.ts`): with
  `state<{}>(g)` and an action that widens `read(box)` to `{} | (() => number)` and tests `typeof y === "function"`,
  the action called `g` (calls 1, the state cell became 42); with `Generator<{}>` and a listener's action, `g` was
  called once. New cell `ixMayHoldFn` (ix-hides, 26 lines): `ixMayHide`, or, on the same walk, a record with no
  index and no required property that `R.sub(() => never, rec)` accepts. `mdKept` and `owFedKept` ask it;
  `ixMayHide` and `ixHidden` are unchanged. The frozen fixture got the same as `Checker.mayHoldFn`, used by its
  `core.ts` fnKept and by `diff.ts` fedDiff (both header-marked). A first version put the clause in `ixMayHide`:
  collect min 6679/6748 ms against 1922/1861 ms without it (`ab/on`, `ab/off`, battery, load 2.2-3.1), with no
  verdict change; a cheap property test in front of `R.sub` gave 6372/6389. `ixHidden` loses its early-out on those
  records. With its own cell: 1905/1933 against 1991/1939 ms. Rejected now: `{}`, `{ a?: number }`,
  `{ length?: number }`, `{ f: {} }`, `{}[]`, `[{}]`, `{} | null`, `interface I {}`, a `type E = {}`, `Generator<{}>`.
  `{ n: number }` data stays accepted.
- The fed rule reaches any depth: `mdMarkStateful` records each fed cell in `fnFed`, and the cells are checked in
  dependency order, so 1, 2 and 3 cells away (and 3 out of source order) all reject (`p4.ts`).
- `ss_moduleName` (core.ojs) now names a module that is not in `runtime.mains` by its `module <name>` variable. The
  build compiles a checker-module cell with the literal `@tomlarkworthy/soundscript-checker`; with `cross` taking
  the module, the page's `~random` name made `parseTree` fail verify's "recompiles to itself" check (one full run:
  648 pass 1 fail). Events and listener keys of an imported module now use the same name the build does.
- Also probed: an async generator yielding the function is accepted, but a listener on it is `[inject-events]`;
  handing the function back to another language's `(v: unknown) => number` or `(v: {}) => number` is accepted
  and throws at run time (`back argument 1: expected data, found a function`), the other function never called.
- Not closed, outside S11.9: `typeof y === "function"` drops a `{}` member of a union, so a checked function
  assigned to `{}` and widened to `{} | ((n: number) => string)` is called at the wrong signature, accepted
  (`p4c.ts` "non-fed"). An `Action` cannot take this route (`{}` is `[action-pass]`).
- Spec rows: S9.1 `[inject-type]` (a function inside an object on a shell input); S11.9 `[action-capture]` x7 (3
  cells away; `{}`, `{ a?: number }`, `{ f: {} }`, `{}[]`, `interface I {}` in a state cell; `Generator<{}>`).
  Tests: `test_spec_S9_1` (a shell function taken as a function type and through an alias; the message of the object
  case), new `test_spec_S11_4_function_reject` (rejection; a synchronous throw at the call) and
  `test_spec_S11_5_function_this` (strict: `this` undefined; a sloppy `new Function`: globalThis).
- Verdicts, collect `out/base-review.json` -> `out/after-review.json` (`switch3/ndiff.ts`): 837 -> 853 sources, 16
  differ, all new rows and their inline copies; 0 existing records changed. `diff.ts`: before the frozen fixture
  was patched, 6 sources DIFFERENT (the 6 new `{}` rows) and fed rule 12 DIFFERENT; after, `--module-only` 943 SAME,
  0 DIFFERENT, 0 NOT COVERED; fed rule 3476 SAME.
- Gates (Battery Power, load 2.2-3.9): boundary 130 (was 123), runtime 82, cross 24, shape 21, complete 58, syntax
  14, acorn 6, ts-cells 9, walks 13, infer.test 5 pass; rt diff 16 checks 0 differences; fixtures 14/14. Build 0
  "dependancy map" lines, notebook 4,179,625 bytes. verify --quick 220 pass 0 fail (218 at switch3 step 2, + the 2
  new spec test cells). Full verifies: 648 pass 1 fail (the `parseTree` recompile above); 649 pass 0 fail after the
  `ss_moduleName` change; 649 pass 0 fail after `ixMayHoldFn`, the last: `power Battery Power; functional 649 pass 0
  fail; measurements 8`, load 3.29 -> 3.20, 4 min; lint median 5.8 ms, completion median 5.8 ms; Breakout 60 and
  49.2 world changes/s.
- `/review-notebook` was not run on the spec or these notes.

## 2026-11-21 21:44: a kind test drops a record that may hold the tested kind (typeof-hole)
Scratch `lite/soundscript/.scratch/typeof-hole/` (probes `probes.ts`, `probes2.ts`, `probes3.ts`, `probes5.ts`; run
demos `rt.ts`, `rt-tv.ts`, `rt-foreign.ts`, `rt-foreign2.ts`; `*-before.txt` and `*-final.txt` outputs; gate logs in
`gates/`).
- Repro (the review4 "not closed" item). Accepted before:
  ```
  const f = () => (s: string): number => s.length;
  const k = (f: (s: string) => number) => { const x: {} = f; const y: {} | ((n: number) => string) = x; return typeof y === "function" ? y(3) : ""; };
  ```
  Run (`rt.ts`): `k` is `undefined` where its type says `string`; with `y(3).toUpperCase()`, `RuntimeError: undefined
  is not an object (evaluating 'y(3).toUpperCase')`. After: `[type] call of {  } | (n: number) => string`.
- What the checker lets into a record (`probes2.ts`, `const x: H = v`):
  ```
  {}, { a?: number }, interface E {}   string number boolean bigint string[] function: yes; null undefined: no
  object                               string[] function { m: 1 }: yes; primitives: no
  { readonly length: number }          none of them (string, string[] and a function are all [type])
  ```
  (`{ m: 1 }` into `{}` is `[excess-property]` as a literal and accepted through a variable; `[number]` was tried
  with `as`, which is not a test of assignability.)
- Probe table, `y: H | ((n: number) => string)` holding `f`, accepted before / after (A accepted, r rejected):
  ```
  holder                  === fn  else !== fn  !== object  else === object  switch  if  && | truthy in instanceof ?.() === g
  {}, { a?: number },       A/r      A/r          A/r          A/r          A/r    A/r A/r |   r/r for every holder
  { a?; b? }, interface E {}, type E = {}, {} | null: the same
  {} | number               A/r      A/r          r/r          r/r          A/r    A/r A/r |   r/r
  object, unknown, Js, T, T extends {} / object / { a?: number }: r/r in every column (narrowed to object)
  { readonly length / name }: r/r, the assignment itself is [type]
  ```
  Also A/r: an element of `({} | fn)[]` (index, `const e = b[0]`, `for of`), `[{} | fn]`, a property `{ p: {} | fn }`;
  `{ readonly a: number } | fn` holding a parameter of `interface G { (s: string): number; readonly a: number }`;
  `{} | "a"`, `{} | 1`, `{} | true` under typeof string/number/boolean (then `const z: "a" = y`); `{} | number[]`
  and `{ a?: number } | number[]` under `Array.isArray`; `T | number[]` under `Array.isArray` (`rt-tv.ts`: `k(["s"])`
  gave `"s1"` typed `number`); `{} | null` and `{} | 0` on the false side of a truth test (`rt.ts`: `0` typed `null`).
  Run demos before: `{} | "a"` gave `"b"` typed `number`, `{} | number[]` gave `"s1"`.
  The mirrored direction, the false side of `=== "function"` or the true side of `=== "object"`, gives `{}`, which is
  correct there and has no members: harmless. `instanceof`, `?.()`, `"call" in y` and `=== g` reject before and after.
  `Mut<{}>`, `Borrowed<{}>` and `Mut<string[]>` cannot be put in such a union (`[type]`, `[mut-escape]`).
- Rule. New cell `ixAdmits` (ix-core, 10 lines): a record with no call signature may hold a function, always (a
  callable type with its members is assignable to it: the `G` row); a string, number, boolean, bigint, symbol,
  undefined or array when `R.sub` of that kind (`never[]` for arrays) to the record holds. Callers keep the member as
  itself: `ixNarrowTypeof` on the side that would drop a member tagged `"object"` (the true side of a non-object tag,
  the false side of `"object"`); `ixNarrowArray` on the true side, which also now narrows a type parameter to
  `unknown[]` as it does `unknown`; `ixFalsy` for number, string, boolean, bigint. `switch (typeof y)` goes through
  `ixNarrowTypeof`. The frozen fixture got the same as `Checker.admits` in `falsy`, `narrowTypeof`, `narrowArray`
  (header-marked). The three edited cells grew by at most one line; no cell over 26 lines was made.
- Dead end and alternatives, measured with collect and `checker-port/diff.ts`:
  - First version: the function kind by the witness `R.sub(() => never, record)`, as `ixMayHoldFn`. It misses a
    callable with a required member (`G` above, accepted by it). Replaced by "any call-less record".
  - Replace-by-kind (the member becomes `string`, `object`, `unknown[]` on the true side, as `unknown` already does):
    sound, 0 corpus verdict changes against base, against the 1 source below for keep-as-itself. Not shipped: the task
    asked for the member kept as itself. It keeps `string | NavIntent` under `typeof === "string"` accepted.
  - Cost of the shipped rule beyond the corpus (`probes5.ts`): the value-or-thunk idiom
    `N | (() => N)` with `typeof v === "function" ? v() : v` is rejected, and `N | string` with
    `typeof v === "object" ? v.n : v.length` is rejected. Both come from "any call-less record may hold a function".
    The owner's alternative: forbid a type with a call signature flowing to a record without one; that restores both.
- Verdicts, collect `out/base-typeof.json` -> `out/after-typeof.json` (`switch3/ndiff.ts`): 853 -> 871 sources, 19
  differ. 18 are the 9 new rows and their inline copies; one existing source changed:
  ```
  port:ports/lopepage-urls navHref     ok -> rejected  [no-member] L259 no property startsWith on NavIntent; [type] L259 string | NavIntent is not assignable to string
  port:ports/lopepage-urls linkToWith  ok -> rejected  the same at L302 and L320
  ```
  `NavIntent` has only optional members, so it may hold a string. Not rewritten: `ports/` is not a shipped cell. No
  tutorial, core, spec example, `lite/*.ss.ts`, `lite/acorn/*.ss.ts`, `lite/infer/*.ss.ts` or fixture verdict changed
  (`ts-cells.test.ts` 9 pass checks the `.ss.ts` sections).
- `diff.ts`: with the cells changed and the fixture not, 2 DIFFERENT (the lopepage-urls cells); with the rows added and
  the fixture at the witness rule, 2 DIFFERENT (the `G` row and its inline copy), so the rows tell the two rules apart;
  after: 871 sources SAME 3494 DIFFERENT 0 NOT COVERED 0, fed rule 3494 SAME, `--module-only` 961 SAME 0 DIFFERENT 0 NOT
  COVERED 0.
- A scratch guard check (log whenever `ixAdmits`'s record guard said false but `R.sub` of a kind to the member held,
  member a named type, record, null, tuple or array) logged nothing over the collect and the probes.
- Time, collect min of 3, interleaved before/after on the same tree, AC Power, load 2.7-4.1: 2100 -> 2137 ms.
- Spec rows: S9.6 `[type]` x6 (`{} | fn`; `{ readonly a: number } | fn` from `G`; the else of `typeof === "object"`
  on `{ readonly a?: number }`; `switch (typeof y)` on `interface E {}`; an element of `({} | fn)[]`; `{} | "a"`
  under typeof string); S9.2 `[type]` x2 (`{} | number[]` and `T | number[]` under `Array.isArray`); S9.4 `[type]`
  x1 (`{} | null`, falsy side). `test_spec_S9_2` now asks `spec_rejectsFor("S9.2")` (it had no reject case before);
  `test_spec_S9_6` has an accepted control (`N | string`, `N | number[]`, `N | null`, the else of `=== "function"` on
  `{} | fn`). Unit probes: `lite/infer/narrow-kinds.test.ts`, 45 pass (6 pass 39 fail on the old cell).
- PROSE PENDING (S9.6, S9.2, S9.4 sentences unchanged). Proposed for S9.6: "A record without a call signature may hold
  a function, and `{}` or a record whose members are all optional may hold a string, a number, a boolean or an array:
  after a `typeof`, `Array.isArray` or truth test, such a record stays on each side where its value may be, as itself,
  so `typeof v === "function"` on `{} | ((n: number) => string)` leaves a value that cannot be called." S9.2's "A
  checked function from `unknown` that narrows with ... `Array.isArray`" is still exact; it does not say what a type
  parameter narrows to (now `unknown[]`).
- Not closed, other cause: a foreign declaration whose record type the checker's relation does not admit a primitive
  into, holding one at run time (`rt-foreign2.ts`): `declare const s: { readonly length: number }` given `"abc"`,
  narrowed by `typeof !== "string"` on `{ readonly length: number } | "a"`: `"abc"` typed `number`; the same with
  `["s"]` and `Array.isArray`; `{ readonly toFixed: ... }` given `0`, falsy side typed `null`. S9.3 makes a foreign
  declaration "the trusted signature"; TypeScript admits these values for these types, this checker does not. Owner's
  decision. A foreign function declared `{}` is now rejected at the call (closed by the rule).
- Other hole seen, not this family (`rt.ts`): an optional member added through width subtyping,
  `const q = { b: 1, a: "x" }; const p: { b: number } = q; const r: { b: number; a?: number } = p;` accepted;
  `(r.a ?? 0) + 1` gave `"x1"` typed `number`.
- Gates (AC Power): infer.test 5, complete 58, boundary 130, runtime 82, syntax 14, acorn 6, walks 13, ts-cells 9,
  narrow-kinds 45 pass; rt diff 16 checks 0 differences; complete-diff 6385 SAME; fixtures 14/14. Build 0 "dependancy
  map" lines, notebook 4,184,021 bytes. verify --quick 220 pass 0 fail (the new rows sit in existing test cells). One
  full verify: `power AC Power; functional 649 pass 0 fail; measurements 8`; completion median 6.3 ms, Breakout 48.6.
- `/review-notebook` was not run on the spec or these notes.

## 2026-11-21 22:00: the notebook's tests run in bun (`bun-verify/`)
Record: `bun-verify/README.md`. `bun tools/lang-experiment/bun-verify/run.ts [--filter s] [--all] [--mains …]`
boots `soundscript.html` with no browser and runs its `test_*` cells. My run, AC: `bun-verify: 168 pass, 0 fail,
0 timed out, 0 skipped; 5.2 s` (boot 4.1 s, tests 1.1 s); `--filter test_spec_S6_`: 19 pass, 4.4 s. The browser
verify takes 4 to 15 minutes. Before, `tools/lope-tests.ts` gave 348 pass, 14 fail, 62 timed out in 63.6 s; 33 of
the 76 were one cause (inline `module-shim` scripts never ran), the rest the test toggle, `script.innerHTML`
parsed as HTML, `Worker`, animation frames, and a happy-dom symbol-key bug. The wrapper supplies these; nothing
in `tools/` was changed. Of verify's 649 pass lines: 162 are these cells, 106 could be ported, 381 need a
browser (248 of them export and reopen). Not settled: `test_spec_S7_7` and `S7_5` pass only with the extra
compute `lope-runtime.js`'s settle loop makes on each poll, which a browser never makes.

## 2026-11-22 00:30: the Registry as cells over the typed tree (`lite/infer/rg-*.ss.ts`), not switched on
Record: `lite/infer/NOTES.md`, last section. 16 of `registry.ts`'s 18 functions are 70 value cells and 21 type
cells in 7 files (median 6 lines, largest 24), reading the typed tree, so a check parses once.
`bun lite/infer/rg-diff.ts`, my run (AC, load 17):
`registry level: 81546 units in 970 sources: SAME 81505 DIFFERENT 0 NOT COVERED 33 BOTH THREW 8`
`end to end: 973 sources: SAME 971 DIFFERENT 0 NOT COVERED 2`; parser runs 2003 against 1030.
The 8 that throw are `Map` with no type argument, the same crash on both sides. The not covered come from two
probe files: an optional method `m?()`, a property signature with no type, a setter, and `declare function
nr(x: number);` arrive from the typed tree as `Other` (`lite/infer/repro/declare-no-return.ts`); the corpus has
none of them. 8 controls, one per file, each differ; 3 were caught only after probes were added.
`cd lite && bun test infer/rg.test.ts`: 5 pass.
Known consequence: `infer.test.ts`'s first test lists the `.ss.ts` files of `lite/infer` and now fails until the
integration adds the rg files to its list.
Integration: `core.ts` builds the registry from the rg cells; `ts-cells.ts` registers the 7 files;
`complete.ts` takes `callSigs`/`expand`/`member` from them. `registry.ts` and `parse.ts` go only after
`acorn/index.ts`, `soundscript/entry.ts`, two tests and the parser cell stop using them.

## 2026-11-22 01:00: completion's option building and `facts.ts` as cells (`lite/infer/cp-*.ss.ts`), not switched on
Record: `lite/infer/NOTES.md`, last section. About 247 of `complete.ts`'s 256 statement lines and all 58 of
`facts.ts` are 43 value cells and 11 types in 6 files (median 6 lines, largest 21); 76 lines of glue in `cp-index.ts`.
`bun lite/infer/cp-diff.ts`, my run: completion 16237 positions and reruns SAME 18423 DIFFERENT 0;
addParameter/annotationOf SAME 70450; `cellsOf` on 3435 sources SAME 3399 (36 throw the same); prelude and
global sets SAME 246420. One broken cell per file differs on 4 to 1568. `cd lite && bun test infer/cp.test.ts`: 5 pass.
Thin: optional chains have only probe positions (20); several kinds only ever give empty lists.
Three bugs of `complete.ts` copied, not fixed (`lite/infer/repro/cp-complete-bugs.ts`): a quote or comment marker
inside a template literal's text hides a later `${…}`; `=>` counted as a closing bracket in a parameter list;
a lazy block-comment pattern running past a later `*/`.
For Tom: the cells keep `complete.ts`'s regular expressions over source text (14 uses in `cp-text` and `cp-param`),
because completion runs on text that does not parse. That is against "inspect code on the AST". The three bugs
above are all in that text scanning.

## 2026-11-22 01:30: the toolchain's decisions as cells (`lite/toolchain/tc-*.ss.ts`), not switched on
Record: `lite/toolchain/NOTES.md` (survey table first). 521 of the 550 code lines of `ss-toolchain.ts`,
`comment-types.ts`, `module-js.ts` and `browser/erase.ts` are 103 value cells and 20 types in 8 files (median 5
lines, largest 25). 29 lines stay shell: reading a name from text that may not parse (`declaredNameAt`,
`tokensOf`), and `isIdentifier` (the checker has no `String.codePointAt`).
`bun lite/toolchain/tc-diff.ts`, my run: every function row DIFFERENT 0, NOT COVERED 0; the builder's totals are
SAME 327516, same throw 3800 over 1712 sources. The one DIFFERENT is a repro file: `(x /* ? */ ?: number)`,
where `erase.ts` finds the `?` with `indexOf` and emits code that does not parse; the cells cut the right one.
Copied, not fixed: `<number>x` erases to `<>x`. One broken cell per file differs on 46 to 4650.
`cd lite && bun test toolchain/tc.test.ts`: 11 pass.
Cost under load 13-15, ratios only: compile 1.8-1.9x (246-285 -> 459-537 us per cell), decompile 4.5-5.5x.
Integration: the four files become re-exports of the cells (66 importers); `ts-cells.ts` registers the 8 files.

## 2026-11-22 01:45: a generic effect runner (prototype, `selfhost/effect-runner/`): not worth integrating as it is
Record: `selfhost/effect-runner/RESULTS.md`. My estimate that one runner would shrink the five shells toward one
was wrong. Measured: the loops are 25 of the 400 unchecked lines of the three shells that have one (events 11 of
113, pool 6 of 105, store 8 of 182); render and stdlib/runtime have no loop. With a 33-line runner the total
goes 400 -> 419. The rest of each shell is entry points called by user code, performers and identity bookkeeping.
The prototype runner matches the shipped shells step for step: 50469 delivery orderings, 82 runtime tests, 500
scripted event runs, 500 store runs, 2000 pool scripts, 0 differ; four broken runners are each caught, two of
them only by the new scripts. Overhead within noise (events 1.00-1.05x).
A performer cannot use function crossing as specified: S11.11 trusts a foreign function "to give equal results
for equal arguments, to end, to write nothing", and a performer writes. A checked loop would need an explicitly
effectful crossing, and handles crossing uncopied.
What opaque handles would remove: about 20 of events' 113 lines and 8 of the pool's 105.

## 2026-11-22 02:00: opaque handles (prototype, `selfhost/opaque-handles/`)
Record: `selfhost/opaque-handles/RESULTS.md`. Recommended: a static type `Opaque<"name">` whose values are minted
frozen tokens `{h: n}` with no prototype at the notebook boundary (the object in a WeakMap, 36 lines); with the
object itself passed by reference, a missed route ran foreign code through `equals`, template literals, `+`,
`==`, `join`, `JSON`, `await`, spread and `in`. 89 probes as expected (31 accepted, 58 rejected); no existing
verdict changed on 351 cells. Rewriting the events shell on handles: `cells.ts` 145 -> 140 lines, the id-map
lines 22 -> 0, delivery 50469 orderings 0 fail, +2 to 10% per value. Integration estimated at about 250 lines
in 20 files, for a gain of 5 lines in `cells.ts`; the store and renderer tables stay in the shells because a
handle in state keeps its object alive.
Found on the way, in shipped code: `Events<T>` is assignable to `{}` and then `unknown`, and a narrowed `.name`
read gets through; it also passes through template literals, `+`, `==`, `equals`, `messageOf`, `join`, `in`.

## 2026-11-22 02:20: typed imports between checked modules (prototype, `selfhost/typed-imports/`)
Record: `selfhost/typed-imports/RESULTS.md`. Built to the design agreed with Tom (one checker per runtime, every
`export const`, by reference, a module is SoundScript only if it decompiles, checks and recompiles to itself).
25 cells; 77 probes as expected; 603 shipped sources and 454 one-module programs check as today.
Not sound yet as built: the gate compares text, and three forgeries pass it: a definition with its own
`toString` (read by `String(def)`, as today's `ss_isSs` does); compiled text evaluated inside a closure that
shadows `Math` (`@a.m` becomes NaN, no error; today's boundary copy would catch the value); a redefined runtime
input `ss_h`. Fix offered: the gate redefines each variable from the text it checked (about 20 lines).
Found on the way, present today inside one module: `RegExp.test` on a `g` regexp writes `lastIndex`, so two
checked cells calling `re.test("a")` on one value got `false` and `true`. No value a checked cell makes is frozen
at run time; JavaScript holding the reference can write it, and by reference an importer shares that.
An `Elem` whose `onClick` is another module's action crosses as plain data; keep `Elem` on today's path.
Cost: about 420 lines; types only (`import type`, no gate, copy kept) is about 60.
Measured (AC, load 5-9): delivery of a 913-node tree 0.44-0.87 ms copied -> ~0 by reference.

## 2026-11-22 02:50: `bun-live/`: the notebook kept booted in bun, each save applied as redefinitions
Record: `bun-live/README.md`. Builder's numbers, not rerun by me (the build owner has the machine).
A body-only edit is compiled by the notebook's own `compileCell` and only differing variables are redefined;
anything else builds into scratch and the output is diffed against the booted state.
Equivalence against a fresh boot: 21 scripted edits (body, add, delete, rename, type-only, checker error and
fix, parse error and repair), all SAME over 168 tests, about 789 cell states and 2107 definitions; four
divergences found in the first two runs and fixed (tests that read a cell by name kept stale results).
Latency, median of 10, AC, load 4-5: runtime cell 4.9 s, spec test 3.4 s, checker cell 12.7 s, against build +
bun-verify 14.5 s. Compiling is under 0.2 s; the rest is tests rerunning. A checker edit gains 1.14x only.
Needs a restart for a new module or an edit to the toolchain files it imports.

## 2026-11-22 03:40: owned groups of Mut (prototype, `selfhost/mut-groups/`)
Record: `selfhost/mut-groups/RESULTS.md`. Form prototyped: `mut({ types: mut(new Map()), vars: mut(new Map()), n: 0 })`,
one level; a field marked `mut(fresh)` is owned by the group. The bare form `mut({ types: new Map() })` is not a
group: that shape is the S4.7 reject row (`m.xs.push(2)` after `mut({ xs: [1] })`), kept as it is.
158 probes (125 written before the patch); corpus 890 jobs / 4267 cells, 0 verdict changes; the checker accepts
its own 508 cells; 15 of 16 mutants caught (the survivor is covered by an existing rule). +49 -8 lines in 5 files
plus `ow-group.ss.ts` (81 lines, 9 cells). Timing difference inside the 5.6% noise between two identical trees.
Refactor trial: the four tables T,V,W,C as one group: ix parameters 1197 -> 957, Mut parameters 425 -> 185,
functions with 2 or more Mut parameters 100 -> 23, source -1.9%; outputs identical.
Its rules had a hole each of the three times they were checked (Object.values on a group, a group inside a
conditional, a generic parameter handing a field back as T). Soundness rests on probes, not proof. An independent
attempt to break it runs before integration.
Hole 1 confirmed in the shipped checker: `[function g(){ ctx.push(2) }]` called after `freeze` is accepted. Fix +8 -1
in `ow-tree.ss.ts`, no corpus verdict changes.

## 2026-11-22 04:10: an independent attack on Mut ownership (`selfhost/mut-groups-attack/`): four shipped holes
Record: `selfhost/mut-groups-attack/RESULTS.md`; minimal programs `breaks.ts`, rerun by me
(`cd selfhost/mut-groups-attack && bun harness.ts ./breaks.ts`): accepted and observed as below. 162 programs.
Shipped checker (base), each accepted and run in the Runtime:
- B1 `const mk = mut; const a = mk(x); a.push(3)` with `x` another cell's value: `CHANGED x: [1,2] -> [1,2,3]`.
  The freshness and placement checks apply only when the callee is literally `mut`.
- B2 `const fz: <T>(m: Mut<T>) => T = freeze; const r = fz(m); m.push(2)`: a generator variant gives
  `CHANGED reader: [1] -> [1,2]`. A freeze is recorded only for a literal `freeze(...)` call.
- B7 a cell returns a value typed `{ h: { y: Mut<number[]> } }` and another cell annotates its input with that
  type and writes it (reached through B1): nothing keeps `Mut` out of a cell's value type or an input annotation.
- B5 `x = () => /a/g`; `x.test("aa")` twice gives `[false, true]`: `test`/`exec`/`replace` write `lastIndex`.
- B3 `f(m, m)`: a push through one parameter changes the other's length (a loop ran 6 times over 2 elements).
- The named-function-expression hole, confirmed by a run: `CHANGED a: {fr:[1]} -> {fr:[1,2]}`.
Group prototype only: B4, a group parameter with one Mut field and one type-variable field hands the other field
back (`<Y,>(c: Mut<{ xs: Mut<number[]>; ys: Y }>): Y => c.ys`), also by assignment across groups and by delete.
Held: 33 expression forms around a Mut, unions, widening, async suspension, flow, callbacks on a field's methods.
Not attacked: state cells at run time (the harness fails on them), syntax the checker refuses outright.
Groups are not integrated until B4 is closed and attacked again.

## 2026-11-22 00:44–03:08: the rg, cp and tc cells switched on; registry.ts deleted
Baseline differentials 00:44–00:48 (`base0-*.log`), AC Power, load 3.6–8.6. Ended 03:08, AC Power, load 1.48. Work files, logs per phase and
copies of every file before it changed: `lite/soundscript/.scratch/switch4/` (`A/`…`E/` logs, `B-snap/`…`D-snap/`
copies of `lite/` at each phase end, `pre*-*.ts`, `deleted/`). `tools/lang-experiment/` is untracked in git, so
`git diff` shows nothing; those copies are the only per-phase diff.

Starting state: infer.test failed (its file list lacked rg/cp; its name-uniqueness test read `selfhost/opaque-handles`
copies); the pass/fail counts were not kept. The four
name globs (`infer.test.ts`, `rg.test.ts`, `cp.test.ts`, `tc.test.ts`) now read `lite/**/*.ss.ts` only.

**A. Comparators frozen.** `lite/infer/frozen/ts/` holds registry.ts, parse.ts, facts.ts, island.ts, jsx/lower.ts,
core.ts, complete.ts, toolchain/{ss-toolchain,comment-types,module-js}.ts, browser/erase.ts as of 00:54 (file mtimes), imports
re-pointed on the parse (`.scratch/switch4/freeze.ts`, closure check `--check`). Two changes since, in frozen core.ts
(01:21, header line 3): `loadUser` takes the parsed tree (it reads `ast.src`) and `cell` takes the cell's start
(ignored), because the md cells call them that way from B on.
`census.ts` skips `lite/infer/frozen` — without that the copies shifted the census and acorn.test's control failed
(`a renamed Identifier differs on 18 of 19 inputs`). The four typed-tree gaps were inputs added to
`acorn/synthetic.ts`, then `acorn/census.ts` and `acorn/gen.ts`: `TSMethodSignature.optional`, nullable `typeAnnotation` on method and
property signatures, nullable `TSDeclareFunction.returnType`. `rgMethodSig` reads `optional` (registry.ts:
`opt: !!m.optional`). rg-diff before and after:
```
00:44  registry level: 81546 units ... SAME 81505 DIFFERENT 0 NOT COVERED 33 BOTH THREW 8 / end to end: SAME 971 ... NOT COVERED 2
01:15  registry level: 81562 units in 970 sources: SAME 81554 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8
       end to end: 973 sources: SAME 973 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0
```

**B. rg on.** core.ts builds the registry from the rg cells (linked in infer-ss.ts, named there) and the md cells hand
it their own tree: `MdReg.loadUser(ast, jsx, clash)`, `MdReg.cell(at)` with the cell's start. rg-diff's end-to-end
subject is the shipped `runCheck` with the cell record as a parameter (controls replace one cell):
`parser runs: checkSources 2003, rg 1030 (973 sources)`. A gap is now loud: every cell checked from the gap's cell
on is rejected with rule `registry-gap`, and a gap in a declaration load is a module error (rg.test.ts, two tests,
made by a parseTree that turns one node into `Other`):
```
f rejected  the checker cannot read a type here (convert: TSNumberKeyword held as Other), so this cell is not checked
g rejected  not checked: it is checked after f, where the checker could not read a type (convert: TSNumberKeyword held as Other)
module      the checker cannot read a declaration (convert: TSNumberKeyword held as Other), so no cell of this module is checked
```
`registry-gap` is not a lint rule; the fixtures line still reads 55 registered, 55 with a reject case. walks.test
counts `rgExpand` calls; the counts equal registry.ts's on the same text (369, 123, 2, 32603, 3081).

**C. cp on.** complete.ts and facts.ts are glue over the cp cells (linked in infer-ss.ts); each export takes a record of
cells as its last parameter, which cp-diff fills with a linked copy. ss-toolchain's `preludeCalls`/`globalRefs` calls
read nids on a typed tree of the same text and `byNid` for a start. The three copied scanning bugs stay
(`infer/repro/cp-complete-bugs.ts` now compares the frozen complete.ts with the shipped one). The `--preload` redirect
`cp-redirect.ts` is deleted; `complete.test.ts` runs on the cells as shipped (58 pass).

**D. tc on.** `toolchain/tc-index.ts` is a bootstrap file (no cells) that links the tc cells with the shell crossed;
ss-toolchain.ts is `toolchainOf(record)` plus one export per function, and comment-types.ts, module-js.ts and
browser/erase.ts call it. `declaredNameAt`, `declaredName`, `tokensOf`, `paramsOf` moved to tc-shell.ts (they were
the cycle tc-shell -> ss-toolchain). `parseCompiled` keeps `call` and `fn`, which roundtrip-edge and ss-toolchain.test
read, by a breadth-first acorn walk in the glue (`callAt`); `fromObservableVariables` returns `{text}|{reason}`.
Met on the way: eight tc cells held the compiler's reserved text in their source (`/*ss` or the LANG marker) and
compiled to rejected cells in the notebook (`tcUncommentTypes does not check: [compile] cell source contains the
reserved text /*ss`). Rewritten: comments reworded, markers built from two strings (`"/*" + "ss:"`). comment-types.ts
is no longer reached from `soundscript/entry.ts`, so it gives no cells.

**E. Deleted.** `lite/registry.ts` (302 code lines) and `lite/infer/cp-redirect.ts` (13). parseTree's own boundary
shape (acorn/index.ts) and the tc shell shapes (tc-index.ts) are computed by `firstParamShape` over the rg cells,
linked in acorn/index.ts with the uncrossed parser; the registry glue moved to `infer/rg-registry.ts` so acorn/index.ts
can use it without importing core.ts (which imports acorn/index.ts). Checked: `builtinTypeNames()` and
`parseTreeShape()` equal registry.ts's (52 names; shape JSON equal). `parse.ts` stays: acorn-shell.ts takes its
parsers, and island.ts, jsx/lower.ts, stdlib/runtime.ts, oracle.ts, browser/run.ts and most test tools import it.

Code lines (lines holding a token, `.scratch/switch4/codelines.ts`), the replaced files:
```
before  registry 302, core 166, complete 252, facts 60, ss-toolchain 374, comment-types 104, module-js 44, erase 51, tc-shell 32 = 1385
after   rg-registry 48, core 143, complete 45, facts 21, ss-toolchain 116, comment-types 8, module-js 5, erase 2, tc-shell 60 = 448
glue that grew or shrank, not in the rows above: acorn/index 30 -> 55, infer-ss 68 -> 96, tc-index 111 -> 38
```
Largest cell of rg/cp/tc: 26 lines (`tcCompileChecked`). Notebook modules (ts-cells.test): named cells,
runtime 269 in every phase; checker 957 -> 1046 (B) -> 1094 (C) -> 1198 (D) -> 1193 (E).

Gates after E (03:00, AC Power, load 2.4): infer/rg/cp/tc bun tests 28 pass 0 fail; every script test exit 0;
`14/14 fixtures pass`; `bun-verify: 168 pass, 0 fail`; `soundscript/build.ts --force` exit 0 with 0 `dependancy map` lines;
```
rg   registry level: 81564 units in 970 sources: SAME 81556 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8
rg   end to end: 973 sources: SAME 973 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0
cp   completion: 16237 positions ...: SAME 18423 DIFFERENT 0; addParameter / annotationOf: SAME 70450 DIFFERENT 0
cp   facts: cellsOf SAME 3399 DIFFERENT 0; preludeCalls/globalRefs sets SAME 246428 DIFFERENT 0; factsOf SAME 5650 DIFFERENT 0
tc   all calls: SAME 328954 SAME THROW 3756 DIFFERENT 1 ...; corpus calls, repro rows left out: SAME 328772 ... DIFFERENT 0
     --- erase (repro) DIFFERENT
diff 871 sources, 3508 cells: SAME 3494 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14
mod  whole module: 961 sources: SAME 961 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0
cpl  37 files, 6385 positions: SAME 6385 (1733 with no options) DIFFERENT 0
```
The one tc DIFFERENT is the repro row `lite/toolchain/repro/erase-optional-comment.ts`, present at baseline
(`base0-lite_toolchain_tc-diff.ts.log`): the old erase cuts a `?` inside a comment and gives `(x /*  */ ?) => x`, which
does not parse; the tc cells give `(x /* ? */ ) => x`. Since D, `browser/erase.ts` calls the tc cells, so the shipped
erase gives the port's output. The tc corpus moved with the notebook it reads (2043 -> 2283 definitions), so its SAME counts are not comparable
across phases. Browser verify (`bun lite/soundscript/verify.ts`, AC Power):
```
B 01:46 load 2.18  646 pass 3 fail  lint median 4.6 ms  completion median 4.9 ms
E 03:00 load 2.43  649 pass 0 fail  lint median 7.6 ms  completion median 10.0 ms
```
B's three failures are mine: I applied C's edits while it ran, and its variant builds read them (`plain is declared in
boundary.ts and complete.ts`). E's page is slower: lint 4.6 -> 7.6 ms, completion 4.9 -> 10.0 ms. Unattributed: I did
not run the page after C or D. Bun-side completion is unchanged (complete.test.ts `completion on a 12-cell module: median` 1.1, 1.2, 1.2, 1.2,
1.1 ms at A–E, `scripts.log` of each phase),
so the cost is in the notebook path (candidates: the tc shell crossing the boundary on each call, the toolchain cells
on each keystroke's compile). Not measured.

Unsure: the gap rule rejects every cell checked after a gap's cell, in check order, because a memo can carry the
error type forward; that is wider than needed and untested on a real module (no corpus source has a gap now).
`browser/entry.ts`'s bundle (lite/notebook/build/lite.js) imports browser/run.ts -> erase.ts, which now pulls the
checker's cells; not built or checked here.

## 2026-11-22 03:17–: soundness holes, one per step (build owner, `lite/infer/attack/`)
Tools: `lite/infer/attack/gates.sh <dir>` (build, bun-verify, the differentials, the bun tests, the script tests,
fixtures; logs per gate), `attack/sections.ts` (every registered section checked as the build checks it, through
`ts-cells.ts` `sectionCheck`, now exported), `attack/rows.ts` (the rule set `spec_rulesOf` gives a candidate row),
`attack/add-rows.py`, `attack/live.test.ts` + `attack/variants.ts` (the live arm: `breaks.ts` and the attack families of
the holes closed so far, plus my variants, against `lite/core.ts`; a bun test). Counting: each candidate rule was put
in the live cells, then `checker-port/collect.ts` + `switch3/ndiff.ts` against `.scratch/holes/base.json` (the corpus,
spec rows, tutorial and study cells) and `sections.ts` against `sec-base.json` (shipped cells); a flip there sent the
rule back before rows, mirror or gates. Logs: `lite/soundscript/.scratch/holes/` (`g<step>/`, `g<step>.txt`).
Baseline gates (03:21, AC Power, load 1.45): as the 03:00 switch4 record; `bun-verify: 168 pass`; fixtures 14/14.

### Step 1 (03:20–03:39): prelude functions as values, shadowed, and a Mut from anything but mut(...)
Cause: `rgGlobals` binds every prelude function but `equals`/`messageOf` with type `err`, and only a call whose
callee is the prelude name gets the prelude's rules, so `const mk = mut` gave an `err` function whose call was checked
by nothing. Rules (ow-place: `owPreludeName`, `owMutSource`, called from `owPlacement`):
- `[prelude-value]`: a prelude function anywhere but as a callee (or a member/key name, or in a type); `on`/`read` keep
  their rules. `(mut)(x)` is a prelude call (the typed tree has no parentheses node).
- `[prelude-shadow]`: a parameter, local or function named `mut`, `freeze`, `borrow` or `snapshot`.
- `[mut-source]`: a call, `new` or `await` typed `Mut<…>` other than the prelude `mut(...)`; a const/let typed `Mut<…>`
  that is not mut-owned and is not a declarator with an initializer (a destructuring or `for...of` target; an
  initializer is reported at its own expression).
- a member typed `Mut<…>` (a registry memo the shell made) takes the position rule of a Mut binding: `[mut-escape]`
  when bound, returned, placed, passed to a non-Mut parameter.
Counts before the final form (collect/ndiff, sections): first trial, shadow ban on all ten names and every member typed
Mut a `[mut-source]`: corpus 3 cells of `events.ss.ts`/`pool.ss.ts` (`step`, `pumpPool`, `poolStep`: a local named
`state`), shipped sections 1 (`ixMayHide`: `R.mayHideMemo.get/set`, a Mut member of the registry). Narrowed: the shadow
ban to the four ownership names (a local `state`/`action`/`equals` is a local, and the compiler's `preludeCalls`
already skips a bound name); a member typed Mut to the position rule. Final: corpus 1 cell changed (fixture
`reject-mut-escape` `bad_generic`, already rejected, gains `[mut-source]` on `id(out)`), shipped sections 0, spec
accept rows 0. `equals`/`messageOf` as values: 0 uses in the corpus; included in `[prelude-value]`.
Frozen own.ts: the same four checks in the placement loop, header line 4. Control: with the frozen
`[prelude-shadow]` disabled, `diff.ts` ownership `SAME 3516 DIFFERENT 4`.
Rows: S2.6 `[prelude-value]` x4 (alias of `mut`; `freeze` aliased then `m.push`; `(c ? mut : mut)(x)`; `state` as a
value), S2.6 `[prelude-shadow]` x2 (a local `freeze`; a parameter `mut`), S4.4 `[mut-source]` x2 (a call of a
`() => Mut<number[]>` parameter bound; a Mut destructured from a record), S4.4 `[mut-escape]` x1 (a Mut member bound).
Variants (attack/variants.ts, 33, all rejected; with the 20 attack programs of families prelude-as-value and
mut-holder from breaks.ts, a1, a5, a18: `53 pass 0 fail`): alias, identity function, function-typed parameter given
`mut`, default parameter, conditional callee, `mut.call`, shorthand `{ mut }`, `map(mut)`, IIFE, `yield mut`, a cell
whose value is `mut`, `freeze` aliased/passed to a helper/conditional/through a generic identity in a generator,
`borrow`, `snapshot`, `state`, `action`, `equals` as values, a parameter `mut`, a local `freeze`, `function borrow`,
a cell parameter `snapshot`, a call/await typed Mut, a Mut member bound/returned, destructured, `for...of`,
`typeof mut` as a parameter type. Not as first written: `(mut)(x)` (a prelude call; `[mut-not-fresh]`).
Consequence beyond the hole: B6's `declare function grab(): Mut<number[]>` called is now `[mut-source]`.
Gates (`g1.txt`, 03:31, AC Power, load 1.78):
```
889 sources, 3534 cells: SAME 3520 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14; sources that threw 1
ownership: 3520 cells: SAME 3520 DIFFERENT 0 NOT COVERED 0
fed rule: 3520 cells: SAME 3520 DIFFERENT 0; cells reported (as if fed) 26, reports 26
whole module: 979 sources: SAME 979 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0
registry level: 81716 units in 988 sources: SAME 81708 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8
end to end: 991 sources: SAME 991 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0
37 files, 6385 positions: SAME 6385 (1733 with no options) DIFFERENT 0
infer.test 5 pass; rg.test 7 pass; cp.test 5 pass; tc.test 11 pass (10 pass 1 fail in the gate run: ojs-roundtrip read
the notebook built before the step; passes after the build, so gates.sh now builds first); live.test 53 pass 0 fail
build exit 0, dependancy map lines: 0; bun-verify: 168 pass, 0 fail, 0 timed out, 0 skipped; 6.3 s
narrow-kinds 45, ts-cells 9, acorn 6, syntax 14, boundary 130, complete 58, walks 13, checks 14, shape 21, cross 24,
pool 25, store 38, events 29, render 25 pass, 0 fail
14/14 fixtures pass; 55 lint/injection rules registered, 55 with a reject case (53 of them in the specification module)
```
Files: `lite/infer/ow-place.ss.ts`, `lite/infer/frozen/own.ts`, `lite/soundscript/spec.ojs`, `lite/soundscript/ts-cells.ts`
(export), `lite/infer/attack/{gates.sh,sections.ts,rows.ts,add-rows.py,live.test.ts,variants.ts}`,
`lopebooks/notebooks/soundscript.html` (build).

### Step 2 (03:40–03:50): Mut in a cell's value or an input (B7)
Rule `[mut-cell]`: an injected parameter whose type holds `Mut<…>` (`md-inject` `mdInject`, after the parameters are
typed: the annotation's type, or the type the input is given, so a foreign value typed with a Mut is rejected too);
a cell's value (the unwrapped return, the state cell content, the events value) that holds one (`md-value`
`mdValueRules`) is a backstop, kept only when the cell has no other error (`md-cell` `mdKeep`): with step 1, a Mut
reaches a value only past `[mut-escape]`, `[mut-bind]` or `[mut-source]`. The walk `owMutIn`/`owMut` (ow-capture, the
shape of `owIterIn`): arrays, tuples, unions, records and their index, type arguments, aliases expanded (generic and
recursive ones too); not into a function type.
Counts: first trial (the walk into a function's result and a call signature's, the value rule unconditional): shipped
sections 5 cells (`ixKnot`, `ixCheckFn`, `mdCell`, `mdContext`, `mdCheckSources`: a function returning `IxK`/`MdCtx`,
which hold the registry's `Mut<Map<Ty, boolean>>` memo the shell made), corpus 13 sources, all already rejected cells
gaining a second rule (`03-mut.ts` `leak`, the `reject-mut-escape` fixture's 7, three S4.2/S4.4 rows, which would no
longer give exactly one rule). Narrowed: no walk into function types (a function's result can hold only a Mut its
caller gave it); the value rule a backstop. Final: corpus 0, shipped 0, spec accept rows 0.
Not closed here: a function value whose result holds a Mut from its arguments (the registry pattern; a second holder of
that memo is the shell's choice, B6's family).
Frozen: own.ts `mutIn`; core.ts `[mut-cell]` over `injected` after the loop and on `ret` after `[iterator-cell]` when
the cell had no error before the value rules (header line 5). Control: frozen input rule disabled, `--module-only`
`SAME 979 DIFFERENT 6`.
Rows: S4.4 `[mut-cell]` x3 (an input `Mut<number[]> | null` given `null`; `readonly Mut<number[]>[]` given `[]`;
`Box<Mut<number[]>>` through a generic alias, given `{ v: null }`).
Variants (24, all `[mut-cell]`): each of a record field, two levels, an alias, a generic alias, `| null`, an array, a
tuple, a `Map` value, an interface, a recursive alias, `Mut` itself, as an input annotation and as a foreign value's
type; a `State<Mut<…>>` handle; a foreign record holding a Mut returned as a cell's value. live.test `77 pass 0 fail`.
Gates (`g2.txt`, 03:43, AC Power, load 1.99):
```
build exit 0, dependancy map lines: 0; bun-verify: 168 pass, 0 fail, 0 timed out, 0 skipped; 6.2 s
895 sources, 3546 cells: SAME 3532 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14; sources that threw 1
ownership: 3532 cells: SAME 3532 DIFFERENT 0 NOT COVERED 0
fed rule: 3532 cells: SAME 3532 DIFFERENT 0; cells reported (as if fed) 26, reports 26
whole module: 985 sources: SAME 985 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0
registry level: 81821 units in 994 sources: SAME 81813 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8
end to end: 997 sources: SAME 997 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0
37 files, 6385 positions: SAME 6385 (1733 with no options) DIFFERENT 0
infer.test 5, rg.test 7, cp.test 5, tc.test 11, live.test 77 pass 0 fail
narrow-kinds 45, ts-cells 9, acorn 6, syntax 14, boundary 130, complete 58, walks 13, checks 14, shape 21, cross 24,
pool 25, store 38, events 29, render 25 pass, 0 fail
14/14 fixtures pass; 55 lint/injection rules registered, 55 with a reject case (53 of them in the specification module)
```
Files: `lite/infer/ow-capture.ss.ts`, `md-value.ss.ts`, `md-inject.ss.ts`, `md-cell.ss.ts`, `lite/infer/frozen/own.ts`,
`lite/infer/frozen/core.ts`, `lite/soundscript/spec.ojs`, `lite/infer/attack/{variants.ts,live.test.ts}`, the notebook.

### Step 3 (03:50–03:55): a named function expression capturing a Mut taken for a local helper
`owHelper` (ow-tree) took the binding `owBindingOfFn` gives a function, which for `const f = function g() {…}` is the
inner name `g`, and asked only that name's uses. Fix as `selfhost/mut-groups/out/edits.base-fixA.diff`: every binding
naming the function must be only called, and a function expression is a helper only when one of them is a `const`.
The frozen own.ts `helper` had the same hole and gets the same loop (header line 7). Counts: corpus 0, shipped 0.
Control: frozen loop removed, `diff.ts` ownership `SAME 3519 DIFFERENT 17`.
Rows: S4.5 `[mut-capture]` x2 (passed to a keeper and frozen; in an array literal). Variants (14, all `[mut-capture]`,
with the attack program `named-fnexpr-base`): passed to a keeper, in an array, returned, its own name bound inside,
its own name returned from inside, bound to a let, in an object literal, a forEach callback, called at once, a
generator and an async expression passed out, assigned to a let later, in a conditional, called by an escaping
arrow. live.test `92 pass 0 fail`.
Gates (`g3.txt`, 03:51, AC Power, load 1.98): build exit 0, 0 dependancy map lines; `bun-verify: 168 pass, 0 fail, 0 timed
out, 0 skipped; 6.1 s`; `899 sources, 3550 cells: SAME 3536 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14`; `ownership: 3536
cells: SAME 3536 DIFFERENT 0 NOT COVERED 0`; `fed rule: 3536 cells: SAME 3536 DIFFERENT 0`; `whole module: 989 sources:
SAME 989 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0`; `registry level: 81849 units in 998 sources: SAME 81841 DIFFERENT 0 NOT
COVERED 0 BOTH THREW 8`; `end to end: 1001 sources: SAME 1001 DIFFERENT 0`; `37 files, 6385 positions: SAME 6385`;
infer 5, rg 7, cp 5, tc 11, live 92 pass; the script tests as step 2; `14/14 fixtures pass; 55 ... 55 with a reject case`.
Files: `lite/infer/ow-tree.ss.ts`, `lite/infer/frozen/own.ts`, `lite/soundscript/spec.ojs`, `lite/infer/attack/{variants.ts,live.test.ts}`, the notebook.

### Step 1, amended (03:56–04:00, gated with step 4)
- `owPreludeName` failed open where `owOnRead` fails closed: an identifier with no binding fact was skipped. Now such an
  identifier with a prelude name counts as the prelude's, except a shorthand property's key (its value node carries
  the binding; without that exception `{ state, effects }` in `events.ss.ts` `step` and `pool.ss.ts` `pumpPool`,
  `poolStep` flipped: counted, then excluded; final counts 0 and 0). Frozen own.ts the same, with `PRELUDE_FNS`.
- `fixtures/lite-mut/lite-expect.json`: `reject-mut-escape` lists `mut-source` (read by `lite/oracle.ts`, not a gate).
- `lite/infer/attack/owner.ts`: the owner's repro programs, printed by live.test (verdicts: B3 both ACCEPT; B6
  `keep(m)` ACCEPT, the const, the returning function and `id<T>` REJECT since steps 1 and 2; the `{ readonly length }`
  string ACCEPT; both `Events<T>` routes ACCEPT; a foreign RegExp tested twice ACCEPT).
- `typeof mut` in a type is `{typeof type query}` (unsupported): not a route.

### Step 4 (04:00–04:05): RegExp lastIndex (B5)
Candidates, counted over the corpus, rows and shipped cells (AST census `attack/regexp-census.ts`, 532 sources; 4
files that do not parse and the inline `.ojs` sources not in it): (A) a regexp that may have `g` or `y` only where it
is made: 0 (the 5 g literals in the tree are all direct arguments of `replace`, in `tc-text.ss.ts` and `ix-jsx.ss.ts`;
no `new RegExp`); (B) `test`/`exec` only on a regexp literal receiver: 1 shipped cell by the census, an estimate, not
trialled (`cp-text.ss.ts:106` `re.exec`, a held regexp without g). Chosen (A): fewer rejections, and every regexp a
cell holds then has neither flag, so `test`/`exec` ignore `lastIndex` and `match`/`replace`/`split` do not write it.
Trial of (A) in the cells: collect 0 differences, sections 0.
Rule `[regexp-state]` (ow-place `owRegexpPlace`): a regexp literal with `g` or `y`, or `new RegExp(s, f)` whose `f` is
not a string literal without them, stands only as a member's object or as an argument of a resolved intrinsic call
that does not keep it (`owNonRetainingArg`: a String method's argument, not `Array.of`, not a user record's `replace`).
Frozen own.ts the same in the placement loop (header line 8). Control: frozen rule disabled, ownership `SAME 3540
DIFFERENT 6`.
Not closed: a foreign `declare const re: RegExp` (or a foreign function returning one) given a g regexp; S9.3 trusts
the declaration (owner.ts). No foreign.d.ts in the tree declares a RegExp. A shell or another language's RegExp is
`[inject-type]`/`[boundary-type]` already.
Rows: S3.2 `[regexp-state]` x3 (B5's cell value; a held `/a/y`; `new RegExp("a", s)`); `test_spec_S3_2` gains an
accepted control (`/a/g.test(s)`, `s.replace(/a/g, "b")`, `s.split(/,/g)`, a held `/^a/` tested and exec'd).
Variants (15, all `[regexp-state]`, with B5 and `regexp-exec-no-lastindex-read`): held local, sticky held, flags from a
parameter, a `"gi"` literal held, returned by a helper, in an array, in an object, in a conditional, given to a local
function, given to a record's method named `replace`, kept by `Array.of`, a default parameter, given to a callback, yielded
by a generator cell, B5's cell value. live.test `109 pass 0 fail`.
Gates (`g4.txt`, 04:02, AC Power, load 2.62): build 0 dependancy map lines; `bun-verify: 168 pass, 0 fail, 0 timed out, 0
skipped; 6.2 s`; `905 sources, 3560 cells: SAME 3546 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14`; `ownership: 3546 cells: SAME
3546 DIFFERENT 0`; `fed rule: 3546 cells: SAME 3546 DIFFERENT 0`; `whole module: 995 sources: SAME 995 DIFFERENT 0`;
`registry level: 81884 units in 1004 sources: SAME 81876 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8`; `end to end: 1007
sources: SAME 1007 DIFFERENT 0`; `37 files, 6385 positions: SAME 6385`; infer 5, rg 7, cp 5, tc 11, live 109 pass; script
tests unchanged; `14/14 fixtures pass`.
cp-diff and tc-diff (`g4-cptc-full.txt`, 04:12, AC Power, load 1.60): `completion: 16237 positions ...: SAME 18423
DIFFERENT 0`; `addParameter / annotationOf: SAME 70450 DIFFERENT 0`; facts `SAME 3472 DIFFERENT 0`; tc `all calls: SAME
332653 SAME THROW 3756 DIFFERENT 1` (the known repro row), `corpus calls, repro rows left out: SAME 332471 ... DIFFERENT 0`.
Browser verify, first run (04:16, AC Power, load 1.73): `648 pass, 1 fail`, the fail `reference: ... produced but not
named ["mut-source","prelude-value","prelude-shadow","regexp-state","mut-cell"]`: verify.ts requires every rule id to be
named in the tutorial's tables. Added four table rows to `lite/soundscript/tutorial.ojs` (the Mut table: mut-source,
mut-cell, prelude-value/prelude-shadow; the general table: regexp-state). Rerun (`verify4b.txt`, 04:24, AC Power, load
1.92): `power AC Power; functional 649 pass 0 fail; measurements 8`; lint median 7.6 ms, completion median 10.1 ms.
Files (step 4): `lite/infer/ow-place.ss.ts`, `lite/infer/frozen/own.ts`, `lite/soundscript/spec.ojs`,
`lite/soundscript/tutorial.ojs`, `lite/infer/attack/{variants.ts,live.test.ts,owner.ts}`, the notebook.

### Step 5 (04:33–04:45): width subtyping and an optional member
`recSubWith` (subtype.ss.ts) let a source that lacks a member pass for a target's optional member. A record type may
stand for a value with more members (width), so `{ b: number }` holding `{ b: 1, a: "x" }` passed for `{ b: number;
a?: number }`, and `(r.a ?? 0) + 1` gave `"x1"` typed `number`.
Candidates, counted: (E) a missing optional member only when the member's type admits `unknown`: 1506 shipped cells in
64 sections, 49 corpus sources (nearly all a fresh object literal leaving an optional member out, `{ t, opt }` for
`Prop`); not taken. (M) a closed record type: an object literal with no spread has a record type marked `exact`; a
missing optional member is accepted when the source is marked, or not a record or `object`/`unknown`/a type parameter
(a string, an array, a function, an intrinsic's members), or a rest that took that name out (`without`), or the
member's type admits `unknown`. Taken: shipped 0, corpus 1 (`perffix.ss.ts re1`, a scratch probe that is this hole).
The mark must not reach a value that is not the literal. Closed, each with a variant:
- a marked type as a target takes only a marked source with no other member (recSubWith), so `let x = {b: 1}; x = q`,
  `pick({b: 1}, q)` and `[{b: 1}].concat([q])` are `[type]`;
- `mut(...)` and `state(...)` hold `inexact(t)` (types.ss.ts), so `Mut<…>` and `State<…>` stay invariant against
  annotations (without it the spec's `Mut<{ n: number }> is not assignable to Mut<{ n: number }>` row and
  `probe-state.ss.ts` flipped, counted);
- `union` keys members by `show(t) + exactSig(t)`, so `c ? {b: 1} : q` keeps both;
- `sub`'s coinduction key (`seen`, an alias on either side) and the registry's expansion and quiet keys (rgExpand,
  rgQuietGo, frozen registry.ts) add `exactSig`: before that, `const r: T | undefined = xs[1]` with `xs = [{b: 1}, q]`
  was accepted, because `{ b: number } <: T` was taken as proven for the unmarked member after the marked one.
Frozen mirrors (infer.ts header line 7, registry.ts line 3): objLit marks, the rest records `without`, mut and state
`inexact`, the two registry keys. Control: frozen objLit mark removed, `diff.ts` `SAME 3482 DIFFERENT 68`.
New cells: `exactSig`, `inexact` (types.ss.ts), exported by `lite/types.ts` and given to the ix cells in `lite/infer-ss.ts`.
Cost: collect went from 613 to 700 µs/cell (one run each, AC Power): the `exactSig` walk in every `union` and key.
Rows: S2.9 `[type]` x3 (the repro; through `object`; a let of a literal reassigned); `test_spec_S2_9` gains an accepted
control (a literal, a const of a literal and a rest each leave `a?` out).
Variants (16, all `[type]`): widened, let reassigned, generic pick, conditional, array literal of both, concat, pushed
into a Mut of literals, through `{}`, `object`, `unknown`, spread, a helper's result, nested in a conditional, a union
arm, a rest of the widened record, a helper's parameter. Plus three step-4 routes (`RegExp(/a/g)` without new,
`structuredClone(/a/g)`, `new RegExp(/a/g)`), all `[regexp-state]`. live.test `128 pass 0 fail`.
Unchanged: `Events<T>` to `{ a?: number }` then `x.a` (owner.ts) is still ACCEPT.
Found, not fixed (owner.ts): `const r: number = ["a"][0] ?? 1` and the same with `||` are accepted: `ixCheckLogical`
checks only the right operand against the expected type (the frozen checker the same, so no differential sees it).
Gates (`g5.txt`, 04:44, AC Power, load 1.97): build 0 dependancy map lines; `bun-verify: 168 pass, 0 fail, 0 timed out, 0
skipped; 6.2 s`; `911 sources, 3576 cells: SAME 3562 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14`; `ownership: 3562 cells:
SAME 3562 DIFFERENT 0`; `fed rule: 3562 cells: SAME 3562 DIFFERENT 0`; `whole module: 1001 sources: SAME 1001 DIFFERENT
0`; `registry level: 82201 units in 1010 sources: SAME 82193 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8`; `end to end: 1013
sources: SAME 1013 DIFFERENT 0`; `37 files, 6385 positions: SAME 6385`; infer 5, rg 7, cp 5, tc 11, live 128 pass; script
tests unchanged; `14/14 fixtures pass`.
Files (step 5): `lite/types.ss.ts`, `lite/types.ts`, `lite/subtype.ss.ts`, `lite/infer-ss.ts`, `lite/infer/ix-lit.ss.ts`,
`lite/infer/ix-prelude.ss.ts`, `lite/infer/rg-expand.ss.ts`, `lite/infer/frozen/infer.ts`, `lite/infer/frozen/ts/registry.ts`,
`lite/soundscript/spec.ojs`, `lite/infer/attack/{variants.ts,owner.ts}`, the notebook.

### Step 6 (04:46–04:55): an index record reaching Object.prototype (partly closed)
A record with an index signature typed every key by the signature, so `r["constructor"]`, `r.toString`, `"toString" in
r` and `const { valueOf } = r` were typed as entries; every such record (a literal, `JSON.parse`, `Object.fromEntries`)
has Object.prototype's members, so `(r["constructor"] ?? 0) + 1` gives a string typed number.
Candidates, counted: (a) a key whose names are known (a dot name, a string literal, a key of literal or number type) and
name a member of Object.prototype (the 12 of `Object.getOwnPropertyNames(Object.prototype)`): shipped 0, corpus 0;
(b) also every key of type `string`: shipped 2 cells, `deepEqual` (runtime.ss.ts, `b[k]` for `k` of `Object.keys(a)`,
guarded by `kb.has(k)`) and `propOps` (render.ss.ts, `old[k]` for `k` of `Object.entries(now)`: a real read of the
prototype when `now` has a prop `constructor` and `old` has none), and `selfhost/rt/probe1.ss.ts`. Taken: (a). (b) is not
done: it needs either both cells rewritten (to `Map`s of `Object.entries`, on the renderer's and `equals`' paths, not
measured) or a guard the checker can see (`Object.hasOwn(r, k)`), which it has no narrowing for. Owner's choice; repro
in owner.ts (`open-index-key`).
Rule `[banned-member]` (S2.7's), message `<k> on a record with an index signature is Object.prototype's <k>, not an
entry`: `owProtoRead` (ow-place, member reads and `in`, with `owKeyNames` and `PROTO_NAMES`) and `ixBindObject`
(ix-lit, destructuring). Frozen: own.ts placement loop (header), infer.ts bindPattern (header). Control: frozen own.ts
rule off, ownership `SAME 3570 DIFFERENT 4`.
Rows: S2.7 `[banned-member]` x3 (`r["constructor"]`, `"toString" in r`, `const { valueOf } = r` on a `Record`);
`test_spec_S2_7` becomes a block with an accepted control (`r["a"]`, `r.b`, `"c" in r`).
Variants (14, all `[banned-member]`): computed `__proto__`, computed `constructor`, dot `toString`, `r?.valueOf`,
`"toString" in r`, a const key, a literal-union key, a `Record` alias, destructured, destructured and renamed, a
destructured parameter, a union with an index record, `Object.fromEntries(...)["constructor"]`, a nested index record.
live.test `142 pass 0 fail`.
Gates (`g6.txt`, 04:55, AC Power, load 1.46): build 0 dependancy map lines; `bun-verify: 168 pass, 0 fail, 0 timed out, 0
skipped; 5.9 s`; `917 sources, 3588 cells: SAME 3574 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14`; `ownership: 3574 cells:
SAME 3574 DIFFERENT 0`; `fed rule: 3574 cells: SAME 3574 DIFFERENT 0`; `whole module: 1007 sources: SAME 1007 DIFFERENT
0`; `registry level: 82315 units in 1016 sources: SAME 82307 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8`; `end to end: 1019
sources: SAME 1019 DIFFERENT 0`; `37 files, 6385 positions: SAME 6385`; infer 5, rg 7, cp 5, tc 11, live 142 pass; script
tests unchanged; `14/14 fixtures pass`.
Files (step 6): `lite/infer/ow-place.ss.ts`, `lite/infer/ix-lit.ss.ts`, `lite/infer/frozen/{own.ts,infer.ts}`,
`lite/soundscript/spec.ojs`, `lite/infer/attack/{variants.ts,owner.ts}`, the notebook.

### Step 7 (04:56–05:05): identity operations that bypass [strict-eq-object] (partly closed)
Shipped uses counted first, one trial rule for all of them (`s7.json`, `sec-s7.json`): 4 shipped cells flip. By part:
- `includes`, `indexOf`, `lastIndexOf` on an element and an argument that may both be non-primitive: shipped 0, corpus 0.
- `Object.is` on two values that may be objects: shipped 3 (`deepEqual` runtime.ss.ts:52, `same` events.ss.ts:74,
  `sameAttribute` render.ss.ts:160, each the identity fast path of an equality), corpus 14 reports (ss and ssx).
- a `Map`, `Set`, `WeakMap` or `WeakSet` whose key type may be an object, where it is made (`new`, `Map.groupBy`):
  shipped 1 (`ixMayHide`, ix-hides.ss.ts:2391, `R.mayHideMemo`, a memo keyed by type objects), corpus 38 reports
  (selfhost/rt boundary, cells, prelude: Sets and Maps of nodes; shape.ss.ts, subtype.ss.ts checked alone).
Fixed: the first part only, as `[strict-eq-object]`. Not fixed, owner's: `Object.is` (options: accept it as the
identity fast path, which is sound when only `true` is used to skip work, which the checker cannot see; or rewrite
the three equalities without it) and object-keyed `Map`/`Set` (options: forbid them and rewrite `ixMayHide`'s memo
and the selfhost runtime, or allow them as identity-keyed by design and say so in S3.12). Repros in owner.ts
(`open-identity-key`).
Rule: `owIdentityOp` (ow-place) with `owMayObject`; the element type is the resolved intrinsic signature's first
parameter. Frozen own.ts the same (header). A first frozen mirror without `isPrimitive` imported threw on every cell
it reached: `diff.ts` said `SAME 3484 DIFFERENT 0` with 90 fewer cells, not a DIFFERENT; the cell count is the check.
Control: frozen rule off, ownership `SAME 3580 DIFFERENT 6`.
Rows: S3.12 `[strict-eq-object]` x3 (`includes`, `indexOf`, `lastIndexOf`); `test_spec_S3_12` gains an accepted
control (`includes`/`indexOf` with numbers, `null`, a string).
Variants (12, all `[strict-eq-object]`): an array literal, a record's indexOf, lastIndexOf, a readonly array, a tuple, a
union element, in a helper, a generic element, in a callback, an optional chain, a Mut's elements, a function.
live.test `154 pass 0 fail`.
Gates (`g7.txt`, 05:05, AC Power, load 2.82): build 0 dependancy map lines; `bun-verify: 168 pass, 0 fail, 0 timed out, 0
skipped; 6.3 s`; `923 sources, 3600 cells: SAME 3586 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14`; `ownership: 3586 cells:
SAME 3586 DIFFERENT 0`; `fed rule: 3586 cells: SAME 3586 DIFFERENT 0`; `whole module: 1013 sources: SAME 1013 DIFFERENT
0`; `registry level: 82353 units in 1022 sources: SAME 82345 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8`; `end to end: 1025
sources: SAME 1025 DIFFERENT 0`; `37 files, 6385 positions: SAME 6385`; infer 5, rg 7, cp 5, tc 11, live 154 pass; script
tests unchanged; `14/14 fixtures pass`. Corpus against base6: only the three new S3.12 rows.
Files (step 7): `lite/infer/ow-place.ss.ts`, `lite/infer/frozen/own.ts`, `lite/soundscript/spec.ojs`,
`lite/infer/attack/{variants.ts,owner.ts}`, the notebook.

### Step 8 (05:08–05:16): memo and dedupe keys shortened by show()
`show()` prints `…` past depth 6, and three places used it as an identity: the registry's expansion and quiet memos
(rgExpand, rgQuietGo, and the old registry.ts they reproduce), `sub`'s coinduction key, and `union`'s dedupe. Two
alias instantiations that differ only past depth 6 shared one expansion. Program (now an S2.9 row):
`type Box<T> = { v: T }` and `x: Box<{ a: … 7 deep … string }>` given to `const y: Box<{ a: … number }> = x`: accepted
before (the second expansion was the first's object, so `sub` compared it with itself), `[type]` now. `Box<Box<…>>` the
same, through the coinduction key. Counts: shipped 0, corpus 0 (both trials).
Fix: `typeKey(t)` (types.ss.ts), the whole type with what `show()` leaves out past depth 6, a closed record's mark
(`!`), optional and a member's flags, `without`; not a parameter's name or a signature's flags (a first version had them,
and a union of two `toString` signatures then stayed two members: `glpk-canonicalization step2` flipped, `call of () =>
string | () => string`; counted, then removed). The three memo keys are `typeKey`, and `union` keeps `show()` as its key
and on a match compares `typeKey`. It replaces step 5's `exactSig` (removed). Depth past 200 prints `…` (unsure: a type
that deep would collide again; none is near).
Frozen registry.ts the same (header). Control: frozen key back to `show(t)`, `rg-diff.ts` `registry level: ... SAME
82200 DIFFERENT 194`; `diff.ts` does not see it (its frozen side is not the old registry).
Rows: S2.9 `[type]` x2 (an alias's argument; an alias of an alias). Variants (12, all `[type]`, each only
`[inject-type]` before the fix, and the optional-member form accepted before): an alias's argument, an alias of an
alias, an interface's argument, two type parameters, an array, a union, a parameter's annotation, a return type, a
function type's parameter, a tuple, a deep read, an optional member. live.test `166 pass 0 fail`.
Gates (`g8.txt`, 05:16, AC Power, load 2.40): build 0 dependancy map lines; `bun-verify: 168 pass, 0 fail, 0 timed out, 0
skipped; 6.4 s`; `927 sources, 3608 cells: SAME 3594 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14`; `ownership: 3594 cells:
SAME 3594 DIFFERENT 0`; `fed rule: 3594 cells: SAME 3594 DIFFERENT 0`; `whole module: 1017 sources: SAME 1017 DIFFERENT
0`; `registry level: 82674 units in 1026 sources: SAME 82666 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8`; `end to end: 1029
sources: SAME 1029 DIFFERENT 0`; `37 files, 6385 positions: SAME 6385`; infer 5, rg 7, cp 5, tc 11, live 166 pass; script
tests unchanged; `14/14 fixtures pass`.
Files (step 8): `lite/types.ss.ts`, `lite/types.ts`, `lite/subtype.ss.ts`, `lite/infer-ss.ts`, `lite/infer/rg-expand.ss.ts`,
`lite/infer/frozen/ts/registry.ts`, `lite/soundscript/spec.ojs`, `lite/infer/attack/variants.ts`, the notebook.

### Step 6, amended (05:20): through Mut and Borrowed
`owProtoRead` and `ixBindObject`'s proto check expanded the receiver without `unwrap`, so on `Mut<{ [k: string]:
number }>` and `Borrowed<…>` `m["constructor"]`, `"toString" in m`, `m["__proto__"] = 1` and `const { valueOf } = m`
were accepted. Both now `R.expand(unwrap(m))`; frozen own.ts and infer.ts the same. 5 variants (`6-index-proto`, all
`[banned-member]`). `diff.ts` 927 sources SAME 3594 DIFFERENT 0. Files: `lite/infer/ow-place.ss.ts`,
`lite/infer/ix-lit.ss.ts`, `lite/infer/frozen/own.ts`, `lite/infer/frozen/infer.ts`, `lite/infer/attack/variants.ts`.

### Step 9 (05:20–05:30): narrowing precision (owner's ruling)
Two parts, counted separately against `base8.json`.
1. A kept record is the kind tested. Where `typeof` keeps a call-less record (it may hold a value of the kind), the
   record is replaced by the union of the kinds it admits there, each as its type (`IX_KIND`: `string`, `number`, ...,
   and for `function` `(...r: never[]) => unknown`, a function of no known signature). Before, it stayed as itself.
   Count: shipped 0; corpus: `ports/lopepage-urls navHref` and `linkToWith` rejected -> ok (`string | NavIntent` under
   `typeof === "string"` is `string`); 6 S9.6 rows still rejected, messages now name the kind (`call of (...r: never[])
   => unknown | (n: number) => string`). This alone does not restore the two idioms: `N` still admitted a function.
2. A callable reaches a call-less record only where a function of no known signature would (`callableToPlain`,
   subtype.ss.ts, in `recSubWith`): a source with a call or construct signature, a target with neither, and the target
   has an index or a required member -> not a subtype. `ixAdmits` then admits `function` by `R.sub(top function, m)`
   instead of for every call-less record. `{}`, `{ a?: number }`, `E` still admit a function; `N = { n: number }` does
   not. Count: shipped 0, corpus 0 beyond part 1; the `G` row (callable with `readonly a`) now rejects at `const x = g`.
Restored: `N | (() => N)` with `typeof v === "function" ? v() : v`; `N | string` with `typeof v === "object" ? v.n :
v.length` (both now accept controls in `test_spec_S9_6` and `narrow-kinds.test.ts`). The ports/lopepage-urls cells check
again. `narrow-kinds.test.ts` `49 pass, 0 fail`: its 45 rows still hold, its "cost" row (value or thunk, expected
rejected) is now a control expected ok, with 4 new rows (2 controls, 2 rejects).
Frozen: infer.ts `KIND_9` and `narrowTypeof`, `ADMITS` gains `function` (header). subtype.ss.ts is shared. `recSubWith`
merged its two nominal lines to stay at 26.
Rows: S9.6 `[type]` x4 (a function to `{ readonly length: number }`; `G` to `{ readonly a: number }`, accepted before;
a function to an index record; a kept `{}` called with an argument after `typeof === "function"`).
Variants (12, `9-callable-record`, all `[type]`): a callable `G` with `n` as `N` through a const, an array element, a
union arm, a generic identity, an argument, a return type, a record member, a tuple, a default parameter, an alias; a
function to an index record; `Map` to `{ readonly prototype: unknown }`. Before the fix these were also rejected, but at
the value-or-thunk `use` (the cost); after, `use` checks and each is rejected where the callable becomes `N`. live.test
`183 pass 0 fail`.
Gates (`g9.txt`, 05:29, AC Power, load 1.67): build 0 dependancy map lines; `bun-verify: 168 pass, 0 fail, 0 timed out, 0
skipped; 6.3 s`; `935 sources, 3618 cells: SAME 3604 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14`; `ownership: 3604 cells:
SAME 3604 DIFFERENT 0`; `fed rule: 3604 cells: SAME 3604 DIFFERENT 0`; `whole module: 1025 sources: SAME 1025 DIFFERENT
0`; `registry level: 82834 units in 1034 sources: SAME 82826 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8`; `end to end: 1037
sources: SAME 1037 DIFFERENT 0`; `37 files, 6385 positions: SAME 6385`; infer 5, rg 7, cp 5, tc 11, live 183 pass;
narrow-kinds `49 pass, 0 fail`; other script tests unchanged; `14/14 fixtures pass`.
Files (step 9): `lite/infer/ix-core.ss.ts`, `lite/subtype.ss.ts`, `lite/infer/frozen/infer.ts`,
`lite/infer/narrow-kinds.test.ts`, `lite/soundscript/spec.ojs`, `lite/infer/attack/variants.ts`, the notebook.

### Step 9 browser gates (05:36–05:48)
cp-diff and tc-diff (`g9-cptc-full.txt`, 05:36, AC Power, load 2.24): `completion: 16237 positions ...: SAME 18423
DIFFERENT 0`; `addParameter / annotationOf: SAME 70450 DIFFERENT 0`; facts `cellsOf SAME 3541 DIFFERENT 0`, sets `SAME
255680 DIFFERENT 0`, `factsOf ... SAME 5886`; tc `all calls: SAME 336868 SAME THROW 3756 DIFFERENT 1` (the erase repro
row), `corpus calls, repro rows left out: ... DIFFERENT 0`. Browser verify (`verify9.txt`, 05:40, AC Power, load 1.86):
`power AC Power; functional 649 pass 0 fail; measurements 8`; lint median 7.7 ms, completion median 10.1 ms (E 7.6 /
10.0; step 4 7.6 / 10.1): the soundness steps moved neither.

### Timing diagnosis (05:48–05:53, measured only; nothing in lite/ changed)
Each of B-, C-, D-snap was built to a scratch notebook (`build.ts --force --out`, the snapshot moved into `lite/` for
its build and moved back; the build's paths name `../lite/`), and the live tree as E9. In each page,
`.scratch/timing/prof.ts` times 30 completions of `count.` and 30 lints of `width` as verify.ts does, then takes a CPU
profile of 200 of each (`*.cpuprofile`); `parts.ts` times the parts. All AC Power.
```
05:50 load 3.5-8.2 (the runs themselves)  completion  lint
  B                                       5.2         4.8
  C                                       5.0         4.9
  D                                       9.5         9.6
  E9                                      9.6         9.9
05:53 load 2.2-2.4   complete  ss_moduleCells(tutorial)  decompileVariable x 47 tutorial ss variables
  B                  4.8       0.2                       0.0
  C                  4.8       0.2                       0.0
  D                  9.8       4.6                       4.1
  E9                 9.6       4.5                       4.1
```
Phase: D (tc on), +4.6 ms for completion and lint alike; B to C and D to E add nothing measurable. Call path (D's
profile, `chains.ts`, inclusive ms per call): `complete` (and `lint` -> `check`) -> `ss_moduleCells` 5.0 ->
`soundscript.decompileVariable` of each of the module's 47 cells -> `tcDecompileVariable` -> `tcParseCompiled` 4.8 ->
`parseTree` across the shell boundary (`ss_cross.k`, the runtime module's `checkShape` on the way in and
`fnResult`/`copyResume`/`copyEnter`/`copyUnion` copying the parsed tree out) 4.3, of which the acorn parse is about 1.5.
In C `decompileVariable` was ss-toolchain.ts's own code, remembered per definition text (0.0 ms for 47); since D the
glue remembers `langOf` and `parseCompiled` per text but passes `decompileVariable` straight to `L.tcDecompileVariable`,
which parses again through the boundary on every call. Bun completion stays 1.1 ms because complete.test.ts does not
go through `ss_moduleCells`/`decompileVariable` on the page's variables.
What would remove it: remember `decompileVariable` per definition text in `toolchainOf` (ss-toolchain.ts), as `langOf`
and `parseCompiled` are, or have `tcDecompileVariable` take the remembered `parseCompiled`. Either gives back the 4.1 ms
of decompiles; the rest of the 4.6 is `ss_moduleCells` itself. Not applied (measure only).
Aside: `langOf` over all ~5400 definitions costs 12 ms in B and 65-87 ms from C on (a Map keyed by whole definition
texts); no per-keystroke path calls it over all of them.
Correction to step 5's cost: collect went 613 -> ~700-725 µs/cell over steps 5-8 and stayed at 699-715 after step 8
removed `exactSig` from `union`, so the cost is not `exactSig`'s. Unattributed (candidate: `closed`, computed on every
`recSubWith` call); not measured.

### Fresh review (05:55–06:00): spec.ojs, tonight's rows; BLOCK, 5 findings
One opus subagent, the reviewer prompt of `.claude/skills/review-notebook/SKILL.md` (147k tokens, 4m21s). Its own
`bun-verify --filter test_spec_`: 119 pass, 0 fail.
1. "Not specified" says a prelude function used as a value is accepted; it is `[prelude-value]` now. Confirmed. Prose:
   left (rule: no statement rewrites); in PROSE PENDING.
2. `prelude-value`, `prelude-shadow`, `regexp-state`, `mut-source`, `mut-cell` and the new forms under S2.7, S3.12,
   S9.6, S2.9 are in no statement sentence; the `const { y } = p` (`[mut-source]`) / `p.y` (`[mut-escape]`) split is not
   explained; S9.6's rows 1-2 restate S3.3. Confirmed. Prose: in PROSE PENDING (with the S3.3 placement as a question).
3. The holes found and not closed (`??`/`||` left operand, `r[k]` with `k: string`, `Object.is`/Map/Set keys, a foreign
   g RegExp) are not listed in "Not specified". Confirmed. Prose: in PROSE PENDING.
4. A top-level cell named `mut` is not `[prelude-shadow]`, and `mut(...)` in another cell is taken as the prelude.
   Checked: declined. The compiled `b` takes `ss_mut` as input and binds `const mut = ss_mut` (`.scratch/holes/mutcell.ts`),
   so the runtime calls the prelude, as the checker assumes.
5. S2.9 rows split around S2.10. Fixed: the five new rows moved before the S2.10 rows (the older `const-assign` row
   left where it was).
Final gates after the row move (`gF.txt`, 05:59, AC Power, load 1.65): as step 9's (`bun-verify: 168 pass`, `935
sources, 3618 cells: SAME 3604 DIFFERENT 0`, registry `SAME 82826 DIFFERENT 0`, `14/14 fixtures pass`, live 183 pass).
Browser verify (`verifyF.txt`, 06:06, AC Power, load 1.93): `power AC Power; functional 649 pass 0 fail`; lint 7.7 ms,
completion 10.2 ms. cp-diff/tc-diff not rerun after the move (spec row order only; step 9's run at 05:36 stands).
The review run is not logged in SKILL.md's Runs list: that file is outside tools/lang-experiment.

### Step 10 (06:14–06:20): an open record reaches an index record; step 9 completed (after the advisor's check)
Found after step 9: `recSubWith`'s index branch read only the source's declared members, so an open record (`{}`, a
width-widened `{ b: number }`) was assignable to `{ [k: string]: T }`, its other members then entries of type T.
`const q: { b: number } = p; const r: { [k: string]: number } = q; r["a"]` (a string) was accepted (hole 5's class,
open before tonight). Since step 9 it also reached narrowing: an index record no longer admits a function (`R.sub(top
function, m)` is false for it), so `{}` from a function, as `{ [k: string]: unknown }`, then `typeof y === "function" ?
y(3)` was accepted (before step 9 it was rejected: every call-less record admitted a function). Fix (subtype.ss.ts,
shared): the index branch needs a closed source or one with an index. Count against `s9c.json`: shipped 0, corpus 0
verdict changes (glpk-canonicalization `extract` and `selfhost/rt/jsx.ss.ts hTyped`, both rejected already, gain a
`[type]`). Rows: S2.9 `[type]` (the width form), S9.6 `[type]` (the function form). Variants (10, `10-open-index`, all
`[type]`; control: the old index line, all 10 accepted): a width-widened record, `{}` from a function then called,
`{}` from a string then narrowed, an argument, a return type, an array element, an interface, a union arm, a record
member, `Object.values` of it.
Step 9, intersecting: the ruling says a kept record is narrowed to the kind's type by intersecting; step 9 replaced it.
Now for the function kind the kept record is the record with the kind's call signature (`ixKindOf`, ix-core.ss.ts;
frozen infer.ts the same): `{ a?: number }` from a function, `typeof y === "function" ? y.a : 0` is accepted (it was
`[no-member]`), and `y(1)` is still `[type]`. Other kinds stay the kind's type: a record that admits a string has no
required member, so a string and the intersection have the same members. Accept control `i` in `test_spec_S9_6`.
Step 9 variants, control: `callableToPlain` made to return false (the `ixAdmits` change kept) accepts 11 of 13; the two
others are rejected by other rules (a function to an index record by the index branch; the `Map`-to-`prototype` form
was replaced by a generic record-shaped parameter and an interface, both accepted under the control).
Corrections: narrow-kinds got 1 control and 3 rejects (not 2 and 2) beside the cost row turned control. Step 6's
amendment (Mut/Borrowed) had no count of its own; it is inside `s9a.json` against `base8.json`: shipped 0, corpus 0.
Timing, C's memo: C's `decompileVariable` was not remembered itself; it called ss-toolchain.ts's `parseCompiled`,
remembered per text. Since D the glue remembers `parseCompiled` too, but `tcDecompileVariable` calls the cell
`tcParseCompiled`, not the glue's remembered one, so each call parses again across the boundary.
Frozen own.ts: `PROTO_NAMES` moved above the `// none: per alias…` comment of `iterIn`.
Files (step 10 and the step 9 completion): `lite/subtype.ss.ts`, `lite/infer/ix-core.ss.ts`, `lite/infer/frozen/infer.ts`,
`lite/infer/frozen/own.ts`, `lite/soundscript/spec.ojs`, `lite/infer/attack/variants.ts`, the notebook.
Timing, lint re-timed (06:40, AC Power, load 5.8-6.1 one-minute, 2.6 fifteen-minute, just after the four builds):
`.scratch/timing/lint.ts`, verify.ts's lint block on a fresh page (one check, then 30 lints of `width`):
```
B  lint 4.6 ms   ss_moduleCells 0.2 ms
C  lint 4.7 ms   ss_moduleCells 0.2 ms
D  lint 7.4 ms   ss_moduleCells 2.9 ms
E  lint 7.8 ms   ss_moduleCells 2.9 ms   (verify on the same tree, 06:31: 7.7)
```
So lint grew +2.7 ms at D, all of it `ss_moduleCells` (the decompiles above); the 9.6-9.9 ms lint of the 05:50 table came
after 230 completions in the same page and at load 6-8, and is not verify's figure. Completion grew +4.6 ms at D, where `ss_moduleCells`
timed 4.5-4.6 ms (parts.ts, 05:53, after the completions); why it is 2.9 ms on a fresh page is not measured. The fix
named above covers both.
Final gates (`gG.txt`, 06:20, AC Power, load 1.54): `bun-verify: 168 pass, 0 fail`; `939 sources, 3622 cells: SAME 3608
DIFFERENT 0`; `ownership: 3608 cells: SAME 3608 DIFFERENT 0`; `fed rule: 3608 ... DIFFERENT 0`; `whole module: 1029
sources: SAME 1029 DIFFERENT 0`; `registry level: 82931 units in 1038 sources: SAME 82923 DIFFERENT 0 ... BOTH THREW 8`;
`end to end: 1041 sources: SAME 1041 DIFFERENT 0`; `37 files, 6385 positions: SAME 6385`; live 194 pass; narrow-kinds 49;
`14/14 fixtures pass`. cp-diff/tc-diff (`gG-cptc-full.txt`, 06:27, AC Power, load 1.79): `completion ... SAME 18423
DIFFERENT 0`; `addParameter / annotationOf: SAME 70450 DIFFERENT 0`; facts DIFFERENT 0 throughout; tc `all calls: SAME
337231 SAME THROW 3756 DIFFERENT 1` (the erase repro row), corpus `DIFFERENT 0`. Browser verify (`verifyG.txt`, 06:31, AC
Power, load 1.86): `power AC Power; functional 649 pass 0 fail; measurements 8`; lint 7.7 ms, completion 10.2 ms.

## 2026-11-22 06:50–: holes2, three steps (build owner, `lite/infer/attack/`, logs `lite/soundscript/.scratch/holes2/`)
Counting as in the holes section: `checker-port/collect.ts` + `switch3/ndiff.ts` against `holes2/base.json` (06:50: `939
sources, 3670 cells ... 713.9 µs/cell`) and `attack/sections.ts` against `holes2/sec-base.json` (`77 sections, 38744
records, not ok 0`). `holes2/try.ts '<cells>'` prints the live checker's verdict and messages.

### Step A (06:50–07:13): ?? and || under an expected type
Cause: `ixCheckLogical` (ix-ops) checked only the right operand against the expected type and `ixCheck1` returned its
union without `ixExpect`, so the left operand's surviving part was checked by nothing (`const r: number = ["a"][0] ?? 1`
accepted). The frozen `check1` the same. `&&` and the conditional do not share it: `&&` goes through `infer` then
`ixExpect` on the whole result, a conditional checks each arm (`x && 1` into `number` with `x: string | number`, and `c ?
x : 1` with `x: string`, both `[type]` before the fix).
Fix: `ixCheckLogical` takes `soft` and `q`; `kept = ixLogicalType(K.reg, op, lt, NEVER)` (the left's truthy part for `||`,
its non-nullish part for `??`, or the whole left when it decides the result) is checked with `ixExpect` at `e.left` when
not soft and not `never`. +3 lines, -1 (ix-ops), one call changed (ix-expr). Controls accepted: `x ?? 1` for `x: number |
undefined`, `y || 1` for `y: "" | number`, `x ?? 1` into `number | string`.
Counts before the fix (the rule in the cells, `sA.json`, `sec-sA.json`): corpus `939 -> 939 sources; 0 differ, 0 record
differences`; shipped sections `77 -> 77 sources; 0 differ`. Rule id: `[type]` (S2.9). Collect after: 707.3 µs/cell (713.9
before; one run each).
Frozen infer.ts: the same two lines in `check1` (header line). Control: frozen lines off, `diff.ts` `943 sources, 3626 cells:
SAME 3608 DIFFERENT 4` (the two new rows and their inline copies); on, `SAME 3612 DIFFERENT 0`.
Rows: S2.9 `[type]` x2 (`xs[0] ?? 1`, `x || 1` with `x: number | string`), each exactly `[type]` (`attack/rows.ts`);
`test_spec_S2_9` gains an accepted control (`x ?? 1`, `y || 1`). The two owner.ts repros moved to variants.ts.
Variants (20, `A-logical-left`, all `[type]`): the two repros, a return type, an inner function's return, an argument,
an array element, a record member, a chain of `??`, a conditional's arm, parenthesized, a generic identity, a record on
the left, `||` on an index read, `find`, `Map.get`, a call, `||` then `??`, a throwing right side, `||` keeping a string,
a generator cell. Control: the fix off (`if (false && …)`), 17 of 20 accepted; the array element, the record member and
the generic identity are rejected without it (the literal's or the call's own check of the whole). live.test `214 pass 0 fail`.
`??=` and `||=` are unsupported (`logical assignment ??=`), not a route.
Gates (`gA.txt`, 06:53, AC Power, load 2.54): build exit 0, 0 dependancy map lines; `bun-verify: 168 pass, 0 fail, 0 timed
out, 0 skipped; 6.4 s`; `943 sources, 3626 cells: SAME 3612 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14; sources that threw 1`;
`ownership: 3612 cells: SAME 3612 DIFFERENT 0 NOT COVERED 0`; `fed rule: 3612 cells: SAME 3612 DIFFERENT 0`; `whole module:
1033 sources: SAME 1033 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0`; `registry level: 82959 units in 1042 sources: SAME 82951
DIFFERENT 0 NOT COVERED 0 BOTH THREW 8`; `end to end: 1045 sources: SAME 1045 DIFFERENT 0`; `37 files, 6385 positions: SAME
6385 (1733 with no options) DIFFERENT 0`; infer 5, rg 7, cp 5, tc 11, live 214 pass 0 fail; narrow-kinds `49 pass, 0 fail`;
other script tests unchanged; `14/14 fixtures pass; 55 lint/injection rules registered, 55 with a reject case`.
cp-diff/tc-diff (`gA-cptc.txt`, 07:01): `completion: 16237 positions ...: SAME 18423 DIFFERENT 0`; `addParameter /
annotationOf: SAME 70450 DIFFERENT 0`; facts `cellsOf SAME 3558 DIFFERENT 0`, sets `SAME 256392 DIFFERENT 0`; tc `all calls:
SAME 337487 SAME THROW 3756 DIFFERENT 1` (the erase repro row, `--- erase (repro) DIFFERENT`), `corpus calls, repro rows
left out: SAME 337305 SAME THROW 3756 DIFFERENT 0`.
Browser verify (`verifyA.txt`, 07:05–07:13, `Now drawing from 'AC Power'`, `load averages: 1.63 2.07 2.25` at start,
`2.04 2.05 2.16` at end): `power AC Power; functional 649 pass 0 fail; measurements 8`; lint `median 7.8 ms, max 11.0 ms of
30`; completion `median 10.0 ms, max 10.6 ms of 30`.
Files: `lite/infer/ix-ops.ss.ts`, `lite/infer/ix-expr.ss.ts`, `lite/infer/frozen/infer.ts`, `lite/soundscript/spec.ojs`,
`lite/infer/attack/{variants.ts,owner.ts}`, the notebook.

### Step B (07:13–07:30): the decompile memo
Cause as the 05:48 diagnosis: since D, `toolchainOf` passed `decompileVariable` straight to `L.tcDecompileVariable`, which
calls the cell `tcParseCompiled` and parses across the boundary on each of the 47 decompiles per lint and completion.
Fix (ss-toolchain.ts `toolchainOf`): a third `remembered` map, `decompiled`, per definition text around
`L.tcDecompileVariable(d)`; the header comment names it. +1 map and one changed line; 0 lines added net. A `null` result
is a hit (`remembered` tests `undefined`); a throw is not stored, so it throws again on the next call, as before.
Gates (`gB.txt`, 07:13, AC Power, load 1.77): build exit 0, 0 dependancy map lines; `bun-verify: 168 pass, 0 fail, 0 timed
out, 0 skipped; 6.0 s`; `943 sources, 3626 cells: SAME 3612 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14`; `ownership: 3612
cells: SAME 3612 DIFFERENT 0`; `fed rule: 3612 cells: SAME 3612 DIFFERENT 0`; `whole module: 1033 sources: SAME 1033
DIFFERENT 0`; `registry level: 82959 units in 1042 sources: SAME 82951 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8`; `end to
end: 1045 sources: SAME 1045 DIFFERENT 0`; `37 files, 6385 positions: SAME 6385`; infer 5, rg 7, cp 5, tc 11, live 214
pass 0 fail; narrow-kinds 49; other script tests unchanged; `14/14 fixtures pass`. cp-diff/tc-diff (`gB-cptc.txt`):
`completion ... SAME 18423 DIFFERENT 0`; `addParameter / annotationOf: SAME 70450 DIFFERENT 0`; facts DIFFERENT 0; tc `all
calls: SAME 337487 SAME THROW 3756 DIFFERENT 1` (`erase (repro) ... DIFFERENT 1`), `corpus calls, repro rows left out: SAME
337305 ... DIFFERENT 0`.
Browser verify, before (step A's run, `verifyA.txt`) and after (`verifyB.txt`), both `Now drawing from 'AC Power'`:
```
before 07:05-07:13  load 1.63 2.07 2.25 -> 2.04 2.05 2.16   lint median 7.8 ms (max 11.0)   completion median 10.0 ms (max 10.6)
after  07:25-07:29  load 3.51 3.65 3.19 -> 3.05 3.44 3.23   lint median 4.9 ms (max 8.6)    completion median 5.5 ms (max 6.1)
```
`functional 649 pass 0 fail; measurements 8` in both. The after run was at higher load (cp-diff/tc-diff had just ended),
so the gain is not overstated by load. Targets were ~6 ms lint (B/C: 4.6-4.9) and 5-6 ms completion (B/C: 4.9-5.2).
Files: `lite/toolchain/ss-toolchain.ts`, the notebook.

### Step C (07:30–07:55): owned groups in the live checker
Ported by re-deriving from `selfhost/mut-groups/RESULTS.md` onto the current ow cells, not by applying the old diff.
Probed first on the live tree, before any edit (`holes2/try.ts`): for a `Mut<{ t: Mut<number[]> | null }>` parameter,
`const x = p.t` was accepted, as were `if (Array.isArray(p.t)) { const x = p.t; return x; }` and the `typeof … ===
"object"` form. Tonight's member rule (`owMutSource`) needed the member's recorded type to be exactly `Mut`. A union or a
narrowed member was not caught. A group makes these reachable, so the field rule now keys on the declared type too.
Rules (new file `lite/infer/ow-group.ss.ts`, 114 lines, 13 cells, longest 15; `ow-place` +20 -5; `ow-entry` +2 -1;
`ix-prelude` +19 -1; `infer-ss.ts` +1, 2 lines changed):
- `owMutPlace` + `owConstInit` + `owGroupOf`: a `mut(fresh)` that is the value of a plain property of the literal given to
  a `mut(...)` initializing a local const is an owned field. Any deeper or other `mut` is `[mut-bind]` (one level).
- `owFieldOf` (in `owMutSource`): a member is a field when it is or may be a Mut. That is: its recorded type is `Mut` or
  a union with one, or the property's declared type in the object's record is, or the object is a group and the member
  has no recorded type (fails closed). It takes the Mut position rule (`[mut-escape]`), except as an owned field's write
  target.
- `owGroupRef`/`owGroupArg`/`owGroupParam`: a group (by recorded type or binding type; a union with a group member too)
  spread is `[mut-escape]`. As an argument it goes only to `freeze`, `equals`, `messageOf`, or a parameter whose declared,
  alias-expanded type is `Mut` of a record with no index signature. In that record no field is a type variable, and
  each field the group owns is declared `Mut<…>` (closes B4). There must be a resolved signature. Everything else is
  `[mut-escape]`, `borrow` included.
- `owLendTwice`/`owLent`: one call is not lent a group twice, a group and its field, or a field twice. This is seen
  through conditionals, logicals, chains and spreads, and covers an argument of a local helper that captures the group
  (`[mut-escape]`). Plain `f(m, m)` (B3) is unchanged.
- `owFieldWritten`/`owFieldAssign`: an owned field assigned or deleted is `[mut-field-assign]` (new id).
- `ixThaw` (in `ixUnwrapCall`): `freeze` of a group reads each owned field `Mut<X>` (or a union's Mut member) as `X`,
  in the record or each record of a union. When the result still holds a Mut it is `[type]` (fails closed).
  `owMut`/`owTopMut` come from the ow family.
Counts with the rules in the cells (`sC.json` vs `sA.json`): corpus `939 -> 943 sources; 4 differ, 6 record
differences`, all four step A's S2.9 rows and their inline copies, so 0 from C. Shipped sections (`sec-sC.json` vs
`sec-sA.json`): `78 sections, 40344 records, not ok 0`. Every difference is a new cell, `ok`.
Dead end: the first build of `ow-group` named a cell `owMemberName`, which `ow-action.ss.ts` already has. Sections then
gave `[duplicate-cell]` and the S6.19 row crashed (`undefined is not an object (evaluating 'n.property.type')`, the
other cell linked). Renamed `owFieldName`.
Prototype probes on the live tree (`bun selfhost/mut-groups/probes.ts ../..`): before the port `PASS 34 FAIL 124`; after,
`158 probes, 170 cells: PASS 138 FAIL 20`. The 20 are:
- three stricter verdicts, from the lend-twice ruling: `r3-helper-reaches-both`, `r3-group-and-its-field` and
  `r3-same-field-twice` were ok and are now `[mut-escape]`;
- `r1-borrow-group`'s reader, which now gains `[mut-cell]`;
- 16 already-rejected cells, each gaining a second rule from tonight's rules (`mut-source`, `mut-cell`, `type`).
No probe the prototype rejected is accepted live.
Attack files on the live tree (`holes2/attack-live.ts`, every program of `selfhost/mut-groups-attack/a*.ts` and
breaks.ts): `163 programs, live ACCEPT 14, proto REJECT but live ACCEPT 0`. The 14 were each accepted by proto too and
judged harmless there: param aliasing (B3, owner), `in`, JSX child, a shadowing name, a generator lending a field, two
copying Borrowed views. a15 (foreign) imports write their own `.out.json` when imported; it was regenerated by that run.
Foreign `keep(g)` and `keep(g.xs)` (a15) stay accepted, as B6 `keep(m)` (owner).
`breaks.ts` on live (`holes2/breaks-live.ts`):
- B1 `[prelude-value]`, B2 `[prelude-value]`, B2b `[prelude-value]`, B5 `[regexp-state]`.
- B4 `[mut-escape][mut-source]`, B4b `[mut-escape]`, B4c `[mut-escape]`.
- B7: `b4-holder-record-returned` gives a `[mut-escape]`, b `[mut-cell]`. `b4-holder-closure` gives a `[mut-escape]`.
  `b1-holder-*` give `[prelude-value]`.
- B3 ACCEPT (owner).
live.test now includes the `group-generic-field` family (B4, B4b, B4c).
Variants (60, `C-groups`, each rejected with its rule): field bound, returned by a helper, in an array, in an object,
yielded, frozen, deleted, assigned another field; group spread into a record and into mut; `Object.values`,
`Object.entries`, `JSON.stringify`, `structuredClone`, `borrow` of the group; lent to `Mut<{ t: T }>`; B4 mixed, through a
generic alias, a generic interface, `<X, Y>`; B4c; lent twice, group and its field, field twice, a capturing helper
given a field, twice through a conditional; group as a cell value; group type as a cell input (`[mut-cell]`); field
destructured; a rest of the group; group returned from a helper; g-flag regexp as an owned field and a plain field
(`[regexp-state]`); a named function expression capturing the group kept (`[mut-capture]`); an escaping arrow
(`[mut-capture]`); a field written after freeze (`[mut-after-freeze]`); a frozen field written (`[mutating-method]`); a
group in a group and a group in a let (`[mut-bind]`); an owned field not fresh (`[mut-not-fresh]`); a field narrowed by
`Array.isArray`/`typeof` then bound; a nullable and an optional field bound; a union-typed group frozen then written; a
group in a conditional, and a union with one group member, to `Object.values`; `mut` as a value making a group
(`[prelude-value]`); a group from a call (`[mut-source]`); the group in a Map's entries; a computed-key field bound; a
field in a `for...of` source array; to a `G | null` parameter; to a non-Mut record parameter; `Object.assign`; a field
spread as arguments; awaited; given to `state`; a field to a `Y` parameter; through a higher-order helper.
live.test `278 pass 0 fail`. Checked and accepted, not variants: a group lent to a function-typed parameter whose
declared parameter is the group, called twice in sequence.
Mutants (`holes2/mutants.ts`, each rule off, live.test rerun, file restored; `mutants.txt`):
```
M1 field rule: recorded exact Mut only   KILLED by 4 (Array.isArray-narrowed, nullable, optional, typeof-narrowed field bound)
M2 group spread allowed                  KILLED by 2
M3 group to any function                 KILLED by 13
M4 B4 off: any group param               KILLED by 7 (incl. attack:b4-holder-closure and Mut<{ t: T }>)
M5 lend twice off                        KILLED by 5
M6 field assign off                      KILLED by 2
M7 thaw off                              KILLED by 2
M8 thaw fails open                       SURVIVED (backstop: no buildable group leaves a Mut after thaw but the S4.4 [type] row)
M9 group depth unbounded                 KILLED by 1
M10 field rule by declared type only     SURVIVED (the recorded-type and no-type paths are backstops)
```
M8 is killed by the new S4.4 `[type]` row (a group field `Mut<Map<string, Mut<number[]>>>`), which is not in live.test.
Frozen mirror: own.ts (the field rule in the placement loop, a group loop after the escapes for spread/argument/lend-twice/
field-assign, `mut(...)` as an owned field) and infer.ts (`thaw`, imports `mutIn` from own.ts), header lines in both.
Control (`holes2/vfiles.ts` writes the 80 A/C variants and the 154 shell-less probes as cells files; `diff.ts --file …`):
mirror on `1177 sources, 3875 cells: SAME 3861 DIFFERENT 0`, `ownership: 3861 cells: SAME 3861 DIFFERENT 0`; mirror off
(fieldOf false, group loop off, lend-twice off, owned-field mut-bind exemption off, thaw off) `SAME 3845 DIFFERENT 16`,
`ownership: 3861 cells: SAME 3685 DIFFERENT 176`. Cell count unchanged between the runs (no mirror threw). 3 sources
threw: `selfhost/repro-unknown-class.ss.ts` (as before) and two JSX probes read as `.ts`.
Rows: S4.2 `[mut-bind]` (a group in a group), S4.2 `[mut-field-assign]` (`delete g.t`); S4.4 `[mut-escape]` x5 (a field
bound, a spread, B4, `f(g, g.t)`, a nullable field of a group parameter bound), S4.4 `[type]` (freeze fails closed).
Each gives exactly its rule (`attack/rows.ts`); an `Object.values` row was dropped (it also gives `[type]`).
`test_spec_S4_4` gains an accepted control: fields written, the group lent to a parameter declared as the group, a
helper that is only called, frozen, a field read as `readonly number[]`. Tutorial Mut table: one row for
`[mut-field-assign]` (verify requires every rule id named there).
Dry measurement (no checker cell changed): the codemod (`selfhost/mut-groups/codemod.ts`) on a copy of the live
ix/md/ow files (`holes2/dry/`, `IxTabs` alias appended), census before/after: ix inner functions `310 fns, 1198 params,
425 Mut params, 100 with >=2 Mut` -> `958 params, 185 Mut params, 23 with >=2 Mut`; knot types 36 -> 15 Mut params; 733
edits. The live checker accepts the prototype's refactored cells: `bun selfcheck.ts ../.. refac`: `508 cells ...
module errors 0, not ok 0`, so the lend-twice rule does not block that refactor (checked on the prototype's older cells,
not on a refactor of tonight's).
Cost: collect `707.3 µs/cell` (after A) -> `761.8 µs/cell` (after C), one run each, not repeated.
Gates after C (one full pass over A+B+C; `holes2/gC.txt`, `gC-cptc.txt`, `verifyC.txt`), 07:38–07:54, AC Power, load 2.66–4.56:
```
-- build exit 0
bun-verify: 168 pass, 0 fail, 0 timed out, 0 skipped; 6.3 s
959 sources, 3642 cells: SAME 3628 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14; sources that threw 1
ownership: 3628 cells: SAME 3628 DIFFERENT 0 NOT COVERED 0
whole module: 1049 sources: SAME 1049 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0
registry level: 83244 units in 1058 sources: SAME 83236 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8
end to end: 1061 sources: SAME 1061 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0
37 files, 6385 positions: SAME 6385 (1733 with no options) DIFFERENT 0
completion: 16237 positions (and their reruns with outside cells / tsx off): SAME 18423 DIFFERENT 0; 140.6 s
corpus calls, repro rows left out: SAME 340067 SAME THROW 3756 DIFFERENT 0 NOT COVERED 0 TODAY TYPEERROR 0
  erase (repro)              SAME 2 SAME THROW 0 DIFFERENT 1   (by design)
bun tests: infer 5/0, rg 7/0, cp 5/0, tc 11/0, live 278/0, narrow-kinds 49/0, other suites 0 fail
14/14 fixtures pass; 55 lint/injection rules registered, 55 with a reject case (53 of them in the specification module); 0 failure(s)
power AC Power; functional 649 pass 0 fail; measurements 8
lint median 5.0 ms (max 8.8), completion median 5.2 ms (max 5.9)
```

## 2026-11-22 08:10–08:55: holes3 step 1, freeze made real at run time (build owner, logs `lite/soundscript/.scratch/holes3/`)
Target: the hole of `selfhost/mut-groups-attack2/RESULTS.md` (a write or lend whose own operand freezes the same Mut).
Dead end, reverted on the owner's ruling ("let real execution define the ordering"): a static rule in `ow-flow`
(`owValueRoots`/`owActOperands`/`owActUse`: an action's receiver, arguments and target used after all its operands) and
its `frozen/own.ts` mirror. Its counts, kept for the record: corpus `959 -> 959 sources; 0 differ`, shipped sections 0
flips; attack2 252 candidates, accepted 111 -> 63 (all 48 freeze-in-operand programs rejected, the 63 left are the
RESULTS "harmless" list); 50 own variants, 42 accepted before it and 0 after; mirror off `ownership: 3746 cells: SAME 3653
DIFFERENT 93`. Saved as `holes3/ow-flow.fixed.ss.ts`, `holes3/own.fixed.ts`. After the revert: `ow-flow.ss.ts` 73 lines,
`own.ts` 690 lines as before, collect vs base `0 differ`, the S4.6 rows and the variants removed. The static
use-after-freeze rule is unchanged.

What changed:
- `lite/freeze.ts` (new, unchecked, 37 lines, one cell `freeze` of the runtime module): an array or plain record is
  `Object.freeze`d, with a plain record's array, record, Map or Set members (a group's fields; one level). Map and Set:
  the instance goes in a WeakSet that wrapped `Map.prototype.set/delete/clear` and `Set.prototype.add/delete/clear` test
  before writing (wrapped once per realm, keyed by `Symbol.for`), then `Object.freeze`. Typed arrays and ArrayBuffers are
  returned as they are. A second WeakSet remembers what it froze, so freeze of a frozen value is O(1).
  Why not SoundScript: `Object.defineProperty` is `@banned`, a shell cell crosses as another language's function (its
  arguments are frozen copies, S11), and there is no way to change `Map.prototype`. Why not `prelude.runtime.ts`: it
  imports `runtime-ss.ts`, which links the cells that take `freeze` at load, so it would be an import cycle.
  Why the prototype and not own properties on the instance: tried first; `m.set("k", freeze(m).size)` reads `m.set`
  before the freeze runs and wrote anyway (attack2 `map-set-arg-freeze`, `obs-map-set`).
- `runtime.ss.ts`: the identity `freeze` cell removed (mut, borrow stay identity). `runtime-ss.ts` links with
  `freeze.ts`'s freeze. `ts-cells.ts`: `freeze.ts` in RUNTIME_FILES and SECTIONS. Four runtime tests import it.
- `lite/link.ts`: each linked text is evaluated with `"use strict"`, as module code in the notebook is; in sloppy mode
  `frozen[0] = 1` is silently dropped. Corpus with and without: `0 differ`.
- `spec.ojs` `test_spec_S4_6`: a run of five accepted cells (a push, a Map's set, a group lent and frozen in one call, a
  group field's push, each with the freeze inside an operand: TypeError; a write before the freeze: kept, value 2).
- `attack/variants.ts` `RUNTIME_FREEZE`: the 48 attack2 programs (C1 16, C2 21, C3 11; copied, that folder not edited)
  and the 50 D forms. `attack/live.test.ts`: per family C1–C3, accepted by the checker and the run throws at the write
  with no value changed (runAttack, imported from the attack2 harness, which writes nothing on import).
- `bun-verify/run.ts --deep-freeze` (off by default, measurement only).

Evidence:
- attack2 through its harness's `runAttack` (`holes3/run2.ts`, all 12 batches): `accepted 111, broke 0` (was 11 with
  CHANGED). Of the 48 freeze-in-operand programs 46 throw at the write; `yield-freeze-then-throw-catch` throws and its own
  `catch {}` swallows it (gen `[1]`, r `{v:[1]}`, unchanged); `state-action-freeze-in-operand` is not run (runCells cannot
  run a state cell). C3: gen errors, `r` is not changed (its first value stays `{v:[1]}`), then errors with gen.
- live.test `282 pass 0 fail`; `D: 42 accepted by the checker, 40 of them throw at run time` (the 2: `c || freeze(m)` with
  c true never freezes; `delete m[1]` on a one-element array deletes nothing).
- Shipped code: no cell threw. The checker itself runs on the real freeze (bun and notebook): corpus `0 differ`.
- Typed arrays today: `t[0] = (fr = freeze(t)).length + 5` on `mut(new Float32Array(2))` is accepted and gives `7,0`:
  the frozen value changed. Unchanged (open ruling: copy on freeze, O(n)).
- Bypass: `Map.prototype.set.call(m, …)` is now refused too (the prototype method tests the WeakSet). Remaining: code in
  another language that kept a reference to the original `Map.prototype.set` before the runtime module loaded, or
  another realm's Map methods. SoundScript has no `Map.prototype` member and no `.call` on a method (`[no-member]`).

Costs (`holes3/cost1.txt`, 08:51–08:53, AC Power, load 2.8–3.1; bun is JavaScriptCore):
```
freeze, median of 21:  n=10 array 0.88 µs Map 0.33 µs | n=1k array 64.8 µs Map 0.29 µs | n=100k array 15.3 ms Map 3.8 µs
again (frozen):        0.04 µs (array 0.75 µs at 100k)
Map.set through the wrap 11.1 ns, native 4.8 ns per call
JSC (bun) vs V8 (node), 1k array: freeze 61.6 µs vs ~0; 200 sums plain 0.18 ms frozen 1.39 ms vs 0.74/0.76; isFrozen 34 µs vs 0.02 µs
collect µs/cell: identity freeze 787.2 761.6 768.8; real freeze 938.9 938.1 963.1 (+22%)
bun-verify: 6.7 6.7 6.8 s (gC record 6.3 s; not rerun with the identity freeze)
browser (Chromium): lint median 5.5 ms (max 8.4), completion 5.5 ms (max 6.1); verifyC record 5.0 / 5.2 ms at 07:54, not rerun
```
The checker's +22% in bun is JSC: a frozen array is slower to read and to freeze; V8 does neither.
Deep freeze of every SoundScript cell's value (flag on): `bun-verify: 168 pass, 0 fail`; `4484 cell values, 48 nodes
frozen, 1.4 ms`. Tutorial module alone (`--mains soundscript-tutorial`, 10 tests time out with and without the flag):
`16 nodes frozen, 1.2 ms`, 16.2 s both. Most cell values are functions or already frozen. Browser time with the flag: not
measured.

Gates (full set, run before the owner's trim; `g1.txt`, `g1b.txt`, `verify1.txt`, 08:32–08:51, AC Power, load 2.4–3.4):
```
-- build exit 0, dependancy map lines: 0
bun-verify: 168 pass, 0 fail, 0 timed out, 0 skipped; 6.7 s
959 sources, 3640 cells: SAME 3626 DIFFERENT 0 NOT COVERED 0 REAL CRASH 14; sources that threw 1
ownership: 3626 cells: SAME 3626 DIFFERENT 0 NOT COVERED 0
whole module: 1049 sources: SAME 1049 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0
registry level: 83224 units in 1058 sources: SAME 83216 DIFFERENT 0 NOT COVERED 0 BOTH THREW 8
end to end: 1061 sources: SAME 1061 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0
37 files, 6385 positions: SAME 6385 (1733 with no options) DIFFERENT 0
completion: 16237 positions (and their reruns with outside cells / tsx off): SAME 18423 DIFFERENT 0; 178.6 s
corpus calls, repro rows left out: SAME 339976 SAME THROW 3756 DIFFERENT 0 NOT COVERED 0 TODAY TYPEERROR 0
  erase (repro)              SAME 2 SAME THROW 0 DIFFERENT 1   (by design)
bun tests: infer 5/0, rg 7/0, cp 5/0, tc 11/0, live 282/0, narrow-kinds 49/0, other script tests 0 fail
14/14 fixtures pass; 55 lint/injection rules registered, 55 with a reject case (53 of them in the specification module); 0 failure(s)
power AC Power; functional 649 pass 0 fail; measurements 8
```
After the gates the freeze memo (second WeakSet) was added: collect `0 differ`, `bun-verify: 168 pass, 0 fail`, live
`282 pass 0 fail`, runtime script tests 0 fail; the slow gates were not rerun for it.
PROSE PENDING (S4.6, proposed): "At run time `freeze` makes the value unwritable: a write to it, or to an owned field
of a frozen group, throws a TypeError at the write. A typed array is not frozen."
Open rulings: typed arrays (copy on freeze, O(n)); the JSC cost (+22% checker time in bun; Safari users pay the same);
Map/Set prototypes are wrapped page-wide; deep freeze of cell values (0 test failures, ~1.4 ms).

## 2026-11-22 09:16–10:05: stage A, freezable Map/Set subclasses and deep freeze at the boundary (build owner, logs `lite/soundscript/.scratch/holes4/`)
Start: build exit 0, `bun-verify: 168 pass, 0 fail ...; 6.6 s`, `14/14 fixtures pass` (`g0.txt`).
What changed:
- `lite/freeze.ts` (unchecked, 104 lines, 88 non-comment): no prototype patch. `SsMap extends Map`, `SsSet extends Set`;
  set/add/delete/clear throw a TypeError once the instance is in a module WeakSet (not a private field: `super(iterable)`
  calls `this.set` before fields exist). `instanceof` both ways (static `Symbol.hasInstance`), `name` "Map"/"Set",
  `SsMap.groupBy` and the Set algebra return the subclass. `deepFreeze` (explicit stack, per-call native->copy map, DONE
  WeakSet filled only when a walk ends), `freeze` = deepFreeze, `borrow` (marks a lent value; moved from runtime.ss.ts,
  so it is no longer a checked cell), `yielded` (skips a lent value at a yield only), `out` (value, promise, generator).
- Map/Set in SoundScript code are the subclass: `tc-build.ss.ts` binds `const Map = ss_SsMap, Set = ss_SsSet` when the
  body names them and wraps a plain cell's expression in `ss_out(...)`; `tc-text.ss.ts` adds out/SsMap/SsSet to the
  runtime cells; `tc-decomp.ss.ts` does not count ss_out as taking runtime cells (a plain cell stays "plain").
  `link.ts` gives Map/Set and wraps each linked value in out; `browser/run.ts` the same for runCells.
- Boundaries: `prelude.runtime.ts` madeStore (state initial), write (each set/update), action arguments; `browser/cells.ts`
  events yields; `equals` treats SsMap/SsSet as Map/Set (it compared prototypes: `equals(ssMap, nativeCopy)` was false).
- Build: `ts-cells.ts` workers module imports aliased runtime inputs; `stdlib/runtime.ts` exports out/SsMap/SsSet.
- Tests: `lite/freeze.test.ts` (new, 27); input-list expectations gain ss_out in `ss-toolchain.test.ts`,
  `roundtrip-edge.test.ts`, `stdlib/runtime.test.ts`, `checker-tests.ojs`; spec S4.6 gains a row (a returned array,
  record, Map, Set refuse writes from JS). `stdlib/runtime.test.ts` wrote into `T.splitCells(...)`'s frozen array
  (frozen by `freeze(out)` in tc-ctx since holes3): it copies now.
Evidence (`attack-run.ts`, `probes.ts`, `run2.txt`): rules on, `-- accepted 111, broke 0, with an error 48` (holes3
run2 through runAttack); attack1 breaks `8 programs, accepted 1, ... changed silently 0`. Rules off (mut-*,
prelude-value, regexp-state dropped in the runner, checker unchanged): attack2 `accepted 160, ... changed silently 1`
(b4 `ta-view-of-cell-buffer`, a typed array), attack1 8/0, spec rows 44/0, variants 98/0. Still rejecting:
`mutating-method 5`, `member-write`, `let-capture` (probes); with those dropped too: attack2 163, same 1 silent.
Outside the expected classes: `const u = () => new URL("https://x.test/a"); const w = (u: URL) => { u.pathname = "/b";
return 1; }; const r = (u: URL, w: number) => u.href;` gives r `"https://x.test/b"` (class instances are not frozen;
the harness serialises a URL as `{}`, so it is not in the counts). A shared `/g` RegExp is `unsupported` today; a frozen
RegExp throws on `test`. Kept closures: 22 accepted programs dropped only mut-capture; functions serialise as `fn`.
Costs (`cost.txt`, AC Power, load 2.4): bun set 3.29 -> 4.44 ns, get 2.02 -> 3.91, has 5.41 -> 3.36; node set 7.14 ->
10.51. deepFreeze bun 100k array 17.2 ms, 100k records 26.5 ms, again 0.4–0.9 µs; node 0.34 ms / 13.1 ms; Chromium 100k
records with arrays 27.2 ms, again 0.000 ms (function in a blank page, not a notebook cell). Collect µs/cell before
897.8 905.0 894.9, after 1236.5 1233.3 1190.4; with native Map in the checker 1217/1223, with a shallow freeze 913/895:
the +36% is the deep explicit freeze(x) in the checker cells. bun-verify 6.6 s -> 7.3 7.4 7.6 s. Browser lint median
5.8 ms -> 9.2 ms (speed-only alone); completion 8.7 ms in the full verify run alongside tc-diff (holes3: 5.5 ms).
Gates (`gates.txt`, `round2.txt`): build exit 0, dependancy 0; `bun-verify: 168 pass, 0 fail`; 14/14 fixtures; diff.ts
`ownership: 3624 cells: SAME 3624 DIFFERENT 0`, `whole module: 1049 sources: SAME 1049 DIFFERENT 0`; infer 5/0 rg 7/0
cp 5/0 narrow-kinds 49/0 live 282/0; cross 24 events 29 store 38 render 25 boundary 130 freeze 27 workers 8 ts-cells 9
stdlib/runtime 82, 0 fail; edge 114/114; ojs-roundtrip all pass; browser `functional 649 pass 0 fail`. tc-diff
`corpus calls ... DIFFERENT 25238` (compileCell 11684, compiledKind 79, ...; decompile 0 DIFFERENT) against the frozen
toolchain, by design; tc.test `10 pass 1 fail` (that case). Collect vs before: 3 sources differ, all line shifts of
edited files and the removed borrow cell. Not done: `browser/workers.ts:32` (island runs with identity freeze/borrow,
native Map, results not frozen). delivery.test hangs under `bun test`; as a script: `pass delivery: 50469 orderings, 0 fail`.
PROSE PENDING (S4.6): "A cell's value is deep-frozen when the cell returns, yields or resolves, and when it is written to
state or passed to an action: arrays, plain records, Map and Set. A write to it throws a TypeError at the write. Class
instances, functions and typed arrays are not frozen." `ts-cells.ts:84` freeze.ts section sentence is stale.

## 2026-11-22 10:07–11:45: stage B, ownership rules replaced by the run-time freeze (build owner, logs `lite/soundscript/.scratch/holes5/`)
Ruling: a value another cell holds never changes, by a deep freeze at the boundary; the ownership rules go, groups
included; what can be checked simply stays static.
Language now: `mut`, `freeze`, `borrow` are gone. A call to one is `[removed-call]` (ix-expr ixIdent). An unannotated
local bound to a literal, `new` on an intrinsic or a fresh intrinsic call is `Mut<T>` (ix-stmt ixVarDecl, `C.freshAt`
set by ix-call and ixSnapshotCall); `Mut<T>` is assignable to `T`, not back (subtype namedSubWith). What a cell exposes is
read with every `Mut` stripped (md-value, `owStripMut`); a `Mut` input stays `[mut-cell]`. Kept functions
(ow-capture `owKept`: not a helper only called, not a callback of a non-retaining intrinsic) may read a captured `Mut`;
`[mut-capture]` when one writes it, when it captures a typed array or URL a name in the cell can still write
(`owTypedIn`, `owTypedSafeB`), when the `Mut` is written later in the text, in a loop that makes the function or inside
a function (`owLateWrite`), when it returns or yields the captured `Mut` (`owFlowsOut`), and when any `Mut` (any name,
or a call's result) is written later in a generator cell or inside an async or generator function the cell makes
(`owGenLateWrites`, `owInLateFn`: aliases, helpers still running after the cell returned). `[let-capture]` also for a captured let assigned late (`owLateLet`). `[mut-yield]`: a
generator cell yields a typed array or URL (also inside a literal) that is not a fresh copy, a cell input or a
read-only const made by one (`owTypedOut`, `owTypedSafe`). `OW_UNFREEZABLE` gained URL and URLSearchParams.
Deleted ids (AST count, `rule-ids.ts`, branch soundscript-experiment 51f12a0d vs now): 49 -> 41: borrowed-await,
mut-after-freeze, mut-bind, mut-deep-write, mut-escape, mut-field-assign, mut-freeze-param, mut-not-fresh, mut-source,
mut-view; new mut-yield, removed-call. ow-* lines 1257 -> 1057 (ow-group.ss.ts and ow-pos.ss.ts deleted; 27 dead
cells removed on the AST by `dead-cells.ts` + `del-cells.ts` to a fixpoint). Registry 55 -> 51 rules, each with a case.
Codemod (`codemod.ts`, TypeScript AST): 153 files, 737 sites plus spec-4/5 (8); `mut<T>(e)` in a declarator -> `: Mut<T>`
(5). Attack programs from the untouched folders are rewritten in memory (`lite/infer/attack/strip-calls.ts`).
B7: `tc-build` `tcQuickOut`: a sync, non-generator body that makes no async or generator function compiles to
`ss_out(v, 1)`, and freeze.ts `out` publishes it unfrozen unless freezeAll (`globalThis.SS_FREEZE_ALL`,
`SS_FREEZE_ALL=1`, or `?ss_freeze_all=1`; bun-verify passes the last). Not the owner's "no kept captures" test: no
freeze is emitted where a kept function is made, so the static rules above carry it; a cell in another language can
write a quick cell's value (no attack covers that).
Run time: island results deep-frozen (L3; runtime.test `c4_island_results_frozen`). Not done: a `deepFreeze` emitted
where a kept function is made (B4 run-time half), and removing the run-time `mut`/`freeze`/`borrow`/`yielded`/LENT
plumbing (prelude.runtime.ts, run.ts PRELUDE_VALUES, workers.ts Function params): no accepted program reaches it.
Evidence (`attack-run.ts --codemod`, functions read by calling them, URL by href; `ar-m0.txt`, `ar-m1.txt`), both modes
identical: attack2 252 programs, accepted 132, silent 0, in error 25; attack1 8/1/0/0; old S4+S5 rows 49/31/0/0; old
variants 239/40/0/1; runtime 98/80/0/12; new (`lite/infer/attack/b-attacks.ts`) 70/20/0/4. Before the fixes the new
set had 10 silent (alias writes between yields, typed-array view capture, late let, typed array in a yielded literal)
and 2 more with URL (`u.pathname = ...` after `yield u`: Object.freeze does not stop URL setters); a review then
found 4 more, fixed by owFlowsOut and owInLateFn: `const a = () => { const xs = [0]; return () => xs; };` with
`const c = (a: () => Mut<number[]>) => { a().push(9); return 0; };` (a reads fn([0]) then fn([0,9])), its record and
unannotated forms, and an async helper writing an alias 50 awaits after the cell returned. A first fix, stripping Mut
from exposed function results, rejected 177 shipped cells (registries pass Mut-returning functions) and was reverted. Forced (rejected
programs run anyway): 46 would change silently; held by mut-capture 20, mut-yield 16, mutating-method 4,
new-non-intrinsic 3, member-write 3, type 2, let-capture 2, unknown-type 1. live.test `460 pass 0 fail`; in both modes
`live: 445 programs, 140 accepted and run, 17 of them with a cell in error`.
B6 audit (`b6-audit.ts`, AST over INTRINSIC_DECLS, 285 members): no writable property; every mutator tagged
`@mutates`; Date is not an intrinsic; RegExp has no setter and `lastIndex` writes are `[regexp-state]`; URL fields are
readonly and setters on a non-Mut URL are `[member-write]`, but `readonly` is not enforced through `Mut` (a fresh local
URL may be written: accepted, by design here); URLSearchParams has only get/has/toString.
Timing (AC Power, the tests loop running beside): out of 100k records quick 0.00 ms, freezeAll 48.95 ms
(`b7-bench.ts`); bun-verify 6.8 s / 6.6 s (boot 4.90 / 5.09 in the quiet run); live.test 1.65 / 1.68 s; attack-run
2.90 / 3.00 s. Collect 881.3 µs/cell (before B 1397.9 on that run).
Flips (`flips.py c-before.json c-after.json`): rejected->ok 45 (mut-escape 15, mut-after-freeze 7, mut-view 6, mut-source
3, mut-capture 3, member-write 2, let-capture 2, mut-not-fresh 2, type, borrowed-await, borrowed-escape, inject-type,
mut-freeze-param, unsupported 1 each); accepted->rejected among shipped sources: none (selfcheck `0 not accepted`); 486 cells before and 475 after have no
match on the other side (renamed, deleted or new cells) and are not in these counts;
the fixtures accept-owner and known-slips (kept pre-codemod for the legacy check.ts) give [removed-call].
Gates: build exit 0; `bun-verify: 168 pass, 0 fail` with freezeAll off and on; `14/14 fixtures pass; 51 ... 0
failure(s)`; diff.ts `939 sources, 3627 cells: SAME 3613 DIFFERENT 0 ... REAL CRASH 14`, `ownership: 3613 cells: SAME
3613 DIFFERENT 0`; `whole module: 1029 sources: SAME 1029 DIFFERENT 0`; rg-diff `end to end: 1041 sources: SAME 1041
DIFFERENT 0`; tc-diff `corpus calls, repro rows left out: SAME 337369 ... DIFFERENT 0`; cp-diff 0 DIFFERENT;
complete-diff `6099 positions: SAME 6099 DIFFERENT 0`; browser `functional 648 pass 1 fail`: the tutorial's reference
names 12 deleted ids and not mut-yield/removed-call (prose, left for the owner). Tests (30 files under lite/, bun:test files
by `bun test`, the rest as scripts, `g-tests.txt`): all 0 fail but acorn.test `5 pass, 1 fail` (below); complete.test
(3 cases used mut) and cp.test (corpus positions 6385 -> 6099) were updated and rerun: 58/0, 5/0. Frozen comparators (own.ts, infer.ts,
core.ts, ts/toolchain/ss-toolchain.ts) carry each change under a DELIBERATE CHANGE (2026-11-22) mark.
Dead ends: the first runner skipped function values (`typeof x.obj !== "object"`), so kept-closure changes read as 0;
`while read` with bun inside ate stdin, so the dead-cell deletion stopped after one file per round.
Left: `borrow-placement` (owCellPlace) and `borrowed-escape` (a captured `Borrowed`) are still in the cells, no longer
registered and unreachable from accepted source (no `borrow`). Final gates after the review fixes (11:40): build exit
0, bun-verify 168/0 both modes, fixtures 14/14, diff.ts and --module-only 0 DIFFERENT, live 460/0.
Unverified / left: acorn.test census, 1 of 1995 truncations gives a different error value (inputs now include
codemodded text; not looked into). Prose now false: spec S4.1–S4.9, S5.1–S5.5; tutorial lines 64, 70, 281 and the
rule list; examples/03-mut.ts and 02-errors.ts comments. Unchecked lines added: freeze.ts 17, observe.ts 39,
strip-calls.ts 64 (test-only), bun-verify/run.ts 2.

## 2026-11-22 12:22–12:48: completion's cursor position read on a Lezer tree (build owner, logs `lite/soundscript/.scratch/cp-port/g-*.log`, `lz-*.log`)
Start time not recorded; 12:22 is the first `date`. The character scan `cpScan` and 12 of the 15 regular expressions
over the text before the cursor (complete.ts's) are replaced by a Lezer parse with the TSX/TypeScript grammars of
`@tomlarkworthy/codemirror-6-v2` (`codemirror.tsxLanguage` / `typescriptLanguage`, the grammar the editor already
loads). No grammar or dependency is added to the notebook.

Step 0. (a) Parsing the text before the cursor gives usable nodes at its end for every case tried: `a.`/`a?.` (last
token `.`/`?.` under MemberExpression), `<Fo` (JSXIdentifier), `<Foo bar=` (Equals under JSXAttribute), `(x: `
(TypeAnnotation under ParamList), `): ` (TypeAnnotation under ArrowFunction), `foo(1, ` (ArgList), `"str` (String with
an error child), `// comment` (LineComment), `` `tpl ${ `` (Interpolation), `{ ...` / `[...` (Spread), `1.` (Number
"1."), `type T = { a: `, `x as ` (BinaryExpression). An unclosed node ends at the end with a zero-width `⚠` child,
which is how an open string, comment, template or bracket is told from a closed one. Two shapes needed handling:
`const f = (` and `const f = ([a], ` parse as ParenthesizedExpression (taken as the head's list while it has no `)`),
and JSXBuiltin's span includes the space after the tag name (the name is read from its JSXIdentifier child).
(b) bun: `lite/infer/cp-lezer-bun.ts` reads the attachment `codemirror_javascript%405.js.gz` from the build's input,
lopecode/notebooks/quick_start.html, gunzips it once to `soundscript/.scratch/codemirror_javascript-<hash>.js` and
`require`s it on first use. It loads in bun with no DOM (22 ms). The notebook does not use this file: the checker
module gets `import { codemirror } from "@tomlarkworthy/codemirror-6-v2"` (ts-cells.ts PARSER_CELLS; `reachable()`
skips the bun-only file).

Changes. New unchecked cell `cpLezerAt` (`lite/infer/cp-lezer.ts`, 30 lines, 21 of them code): parses `text` (4 trees
kept, by text) and returns the path from the top node down to the last non-empty node starting before `pos`, innermost
first, each `{ name, from, to, kids }`. It reaches the cells as `CpHost.treeAt` (complete.ts), not through the
boundary, so nothing is copied or frozen per call. Checked cells in cp-text.ss.ts: `cpOpenIn`, `cpQuoted`, `cpScan`,
`cpNoOffer`, `cpIsMember`, `cpNodeOf`, `cpTagAt`, `cpGivenAttrs`, `cpHeadFn`, `cpHeadOf`, `cpSameNode`, `cpSelfName`,
`cpParamNames`, `cpParamListAt`, `cpTypeAt` (largest `cpHeadFn`, 13 lines). `cpAddParameter` reads the head's ParamList;
`cpParamSegments`, `cpHeadLen`, `cpCommentEnd`, `cpQuoteEnd` are deleted. Lines: cp-text 127 -> 124, cp-param 69 -> 45,
cp-modes 88 -> 89, cp-types 29 -> 37. Scope kept: type and parameter modes only in the cell's own head function.
Regular expressions removed: cp-text 46, 54, 61, 66, 80, 92, 98, 117, 125 (two), 127; cp-param 32. Kept, a deviation from the brief: cp-text 5 and 7
(`cpWordEnd`, `cpAfterWord`, the typed word and its rest after the cursor). Inside a string, comment or JSX text the
tree has no token for the word, and `from` there is part of the compared answer; at code positions the tree could give
it, at the cost of a parse of the whole text. Kept as allowed: cp-param 58 (one object key tested as an identifier); `cpDeclared` (type names a text
declares, not the cursor's position; untouched).

Commands and lines (12:27–12:38, AC Power, load 1.99–3.98):
- `bun lite/soundscript/build.ts --force`: exit 0.
- `bun bun-verify/run.ts`: `bun-verify: 168 pass, 0 fail, 0 timed out, 0 skipped; 5.8 s`.
- `bun fixtures.ts`: `14/14 fixtures pass; 51 lint/injection rules registered, 51 with a reject case (49 of them in the specification module); 0 failure(s)`.
- `bun lite/infer/cp-diff.ts`: `completion: 15669 positions (and their reruns with outside cells / tsx off): SAME 17825 DIFFERENT 0 REVIEWED 30 (type argument read as a JSX tag 8; TSX text read with tsx off 12; arrow in an earlier parameter 10)`; `addParameter / annotationOf: SAME 67834 DIFFERENT 0`; `facts: 3588 sources: cellsOf SAME 3552 DIFFERENT 0 (both threw 36)`.
- `bun lite/infer/complete-diff.ts`: `37 files, 6099 positions: SAME 6095 (1729 with no options) DIFFERENT 0 REVIEWED 4 (arrow in an earlier parameter 4; lite/infer/cp-reviewed.ts)`.
- `cd lite && bun test infer/cp.test.ts`: `7 pass 0 fail` (two new tests: 47 cursor positions in incomplete text, mode and an option present or absent; closers from the tree). `bun complete.test.ts`: `58 pass, 0 fail`.
- `bun lite/soundscript/verify.ts`: `power AC Power; functional 649 pass 0 fail; measurements 8`.

Reviewed differences (`lite/infer/cp-reviewed.ts`, a predicate and a comment per class; the gate is 0 DIFFERENT):
1. Arrow in an earlier parameter (known bug 2): `const test_replay = (start: () => World, s‸` was a name position
   (the `>` of `=>` closed the list); now the parameter list. 10 in cp-diff, 4 in complete-diff.
2. Type argument read as a JSX tag: `State<readonly A‸` gave "none" (tag "readonly"); now a type (in the head) or a
   name probe. 8.
3. TSX text read with tsx off (cp-diff's rerun of JSX positions): the TypeScript grammar misreads JSX and answers
   "none" where the scan answered "name"; neither answer means anything and both offer nothing. 12. The 6 member
   positions of the same cell (09-breakout cell 20) with tsx off: 3 the same, 3 member [] before and name/none [] now.
Class 1's predicate was narrowed to an arrow after the first `(` after the review; reruns of complete-diff and
`cp-diff.ts --no-facts` give the same counts (logs `g2-*.log`).
Known bugs 1 (a `//` or `'` in a template's text hid a later `${…}`) and 3 (text between two block comments before
the head) have no corpus position; `bun lite/infer/repro/cp-complete-bugs.ts` shows both fixed (member ["a"]; name []).
Also changed and seen only in hand checks: `(x: T = ‸` is no longer a type position; `<p>don"t {a.‸` is a member read.

Cost. bun (`bun lite/infer/cp-lezer-time.ts --old <copy>`, 51 tutorial positions, checks answered from a table):
before 15.0–23.1 µs per completion, after 41.2–62.0 µs (+26 to +39 µs; one parse of the text before the cursor, and a
few for the head). Browser (verify, the final build): completion `median 4.8 ms, max 5.5 ms of 30`, lint `median 4.6
ms, max 8.8 ms of 30` (given baseline 5.4 / 4.9 ms; an earlier verify of an intermediate build gave 4.9 / 4.6 ms).

Dead ends: the build rejected the first cells ([possibly-undefined] on `path[0]`, `init.kids[i]`; [strict-eq-object]
on comparing two nodes) and was fixed in the cells, not the checker; entry.ts reachability listed the bun-only loader
until `BUN_ONLY`. Unverified: the "before" timing uses the pre-change cells from `selfhost/opaque-handles/base/lite/infer`
(same line counts, copied to `.scratch/cp-port/oldcp`) with their `mut(...)`/`freeze(...)` calls stripped, not the exact shipped copy, which was not kept;
the browser baseline is the given one. In an unclosed `(…` parsed as a sequence, a name inside `a = 1` is not read as
already given. `/review-notebook` not run on this section. Options offered through the notebook's own import of codemirror are
asserted by verify's `pass completion: typing count. in increment lists exactly set and update: ["set","update"]`.
`bun lite/soundscript/ts-cells.test.ts` now injects the bun codemirror as a module (as it injects the parser):
`9 pass, 0 fail`. The "before" cells are kept in `lite/soundscript/.scratch/cp-port/oldcp` (cp-lezer-time.ts's default).

## 2026-11-22 12:54–14:20: holes6, the guarantee by construction at run time (build owner, logs `lite/soundscript/.scratch/holes6/`)
Ruling (owner): the guarantee holds at run time by construction; the static capture rules stay as edit-time diagnostics,
unchanged, and no cause depends on them being complete. No static alias case was added.
Start: `selfhost/freeze-attack/run-all.sh` reproduced `mode skip: 315 candidates, 105 accepted, 88 silent` and `mode
all: 315 candidates, 105 accepted, 65 silent`. Commit edf75d99's "0 silent in both freeze modes" did not test skip
mode: `lite/browser/run.ts` and `lite/link.ts` called `out(v)` without the quick flag, so no bun runner ever took the quick path.

Step 0. `lite/browser/run.ts`: Generators `input` imported as `genInput` (the local `input` shadowed it; a state cell failed on
`p.name`). `lite/infer/attack/observe.ts`: `observeProgram` replaces `cells.ts scheduler.frame` with a queue it pumps
(no timer), so events cells and listeners run; an action is not read by calling it (a call is a write; the
freeze-attack harness does call them). `lite/browser/run.test.ts` (new): a state cell + action, and an events cell +
listener ending at `s = 6`: `2 pass 0 fail`. `runCells` now runs each cell's compiled function text (`compileModule`,
the slice between the header and the function's end), with the registrations below; the erased text only when compile
throws. `lite/infer/attack/run-sets.ts` (new) runs every set: freeze 315, attack2 252, attack1 8, oldspec 49,
oldvariants 239, runtime 98, new 70 (attack2 through new: the 716 programs) and h6 54; `--off` drops mut-capture, let-capture, mut-yield,
mut-cell, member-write, mutating-method, regexp-state, iterator-capture in the runner only.

Step 1 (cause B). The quick path is deleted, not flagged: `tcQuickOut` cell gone, `ss_out(v, 1)` no longer emitted,
`freezeAll`/`SS_FREEZE_ALL`/`?ss_freeze_all=1` gone (freeze.ts, bun-verify/run.ts, freeze.test.ts, spec S4.6 row,
frozen toolchain B7 mark reverted, roundtrip-edge C4). Browser, AC power: before (skip on; 13:01, load 2.05) title
442 ms, lint median 4.6 ms, completion median 4.9 ms, `functional 648 pass 1 fail` (FAIL core-only reopened: at boot 10
test cells are pending, listeners attached undefined); after (13:08, load 2.68) 448 ms, 4.6 ms, 5.0 ms, `functional 649
pass 0 fail`. Checkpoint (qg1): build 0; `bun-verify: 168 pass, 0 fail ...; 5.8 s`; `14/14 fixtures pass`; diff
`SAME 3613 DIFFERENT 0`; live `462 pass 0 fail`; run-all.sh `skip: ... 65 silent`, `all: ... 65 silent`; run-sets freeze
65 silent.

Step 2 (cause A). The compiler registers, for each function a cell's function makes, the cell locals it captures:
`F` -> `ss_closure(F, (i) => i < 0 ? k : i === 0 ? a : b)`; a function declaration -> `ss_closure(h, …);` at the start
of its block (hoisted); an object literal with methods -> `ss_methods({...}, "m", thunk, …)`; `;ss_tdz();` after a
let/const that a function made before the statement's end captures. Each insertion is bracketed by `/*ss+*/ … /*ss-*/`
and decompile drops it (round-trip exact: tc-diff decompile 0 DIFFERENT). Captures: free names (scope-aware walk) that
are declared anywhere in the cell, sorted; the cell function's own parameters only if the cell assigns one (they are
other cells' values, frozen at their own boundary, or capabilities). A function capturing nothing is not registered.
Getters, setters and class members are unsupported in SoundScript and are skipped. The thunk reads the current value,
so registration freezes nothing; `deepFreeze` on a registered function (as the value, in any container, among another
function's captures, an action handle's body: `prelude.runtime.ts action` registers its handle) walks each capture with
the usual seen-set; a capture still in its dead zone puts the function in PENDING (not DONE), and `ss_tdz()` walks the
pending ones again right after the declaration, so what remains is none known. Thunk storage: a WeakMap.set per closure
made collect 29% slower (883.3 876.5 898.4 µs/cell vs 673.8 685.4 694.3); kept on the function under a symbol: 722.0
717.8. The non-retaining-callback exemption is not applied: judged on syntax alone a user record's own `map` method
could keep the literal, so it is unsound without types. Implementations: `lite/fnreg.ts` (TypeScript over acorn,
unchecked, 148 lines, 128 non-comment; used by link.ts and the frozen toolchain) and `lite/toolchain/tc-reg.ss.ts`
(21 SoundScript cells, ≤ 22 lines each, ported by an opus subagent; `selfcheck: 39072 cells, 0 not accepted`); tc-build,
tc-decomp, tc-text (runtime cells closure, methods, tdz), tc-index, ts-cells.ts BOOTSTRAP (fnreg.ts). Frozen toolchain:
the same under DELIBERATE CHANGE (2026-11-22, cause A). `[let-capture]` audit (`.scratch/holes6/letcap.ts`, 20 routes:
later in text, the kept function itself, `++`, async helper, then, a helper called from then / a kept fn / an async fn,
generator after yield, loop, destructuring, `+=`, a let record, an action, a JSX handler, a method, a declaration,
catch, switch): all `[let-capture]`; the two allowed forms (assignment before the function is made; a helper only
called) accept. Not tightened; 0 shipped cells flipped. Checkpoint (qg2, 13:41): build 0; first bun-verify `14 pass,
155 fail`: tc-decomp's comment held the reserved text `/*ss` (reworded); then `168 pass, 1 fail` (the new S4.6 row,
which needs step 3); fixtures 14/14; diff 0 DIFFERENT; live `462 pass 1 fail` (the new run-sets test, which needs step 3); run-sets freeze 46 silent (all Error, typed array or URL), h6 10;
run-all.sh 65/65 (its run-skip.ts evaluates erased text: it cannot see registrations).

Step 3 (causes C, D). One table, `lite/freeze-table.ts`, walked by `lite/freeze-table.test.ts` (a script: a late write
that throws is an unhandled rejection, which bun:test counts as a failure): every `new`-able INTRINSIC_DECLS name has a
row; each probe is published along 8 routes (value, kept closure, record, array, Map, alias, helper, yield) and written
late by its maker, with no checker. Before: `62 pass, 124 fail`; after: `freeze-table: 176 programs; late writes that
threw: 70; 186 pass, 0 fail`. Treatments in `deepFreeze`: frozen (arrays, records, Error and every subclass: own data
properties walked, `cause` included, `name` write throws as a new property; RegExp: `lastIndex` unwritable so a g/y
`exec` throws; JSX elements); guarded (SsMap, SsSet, new SsURL: each setter throws once frozen; `URL` in SoundScript
code is bound to `ss_SsURL` as Map is; URL setters are not in the table either way, but `readonly` is not enforced
through `Mut`, so the run-time guard is what holds); copied (typed arrays, ArrayBuffer: a copy in the slot, marked so
it is not copied again; one typed array twice in one value is one copy; at a slot that cannot be written, a function's
captures or an already frozen value, deepFreeze throws at publish; native Map/Set/URL the same); read-only
(URLSearchParams: get, has, toString); opaque (Promise in a slot: replaced by `p.then(deepFreeze)`; among captures: its
value frozen in place when it settles; functions via step 2; State/Events/listener handles); banned (iterators and
generator objects: deepFreeze throws); absent (DataView, Date, WeakMap, WeakSet, Intl, TextEncoder, TextDecoder).
Typed-array copy: a 1,075,200-byte Uint8ClampedArray (Mandelbrot's image) slices in median 0.014 ms, max 0.479 ms of 50
(bun); browser Mandelbrot pool 44.0 ms before step 1 (verify0), 49.9 ms after step 1 with no copying (verify1), 51.4 ms
after step 3 (medians of 7, load 2.05 to 2.68); about 1.5 ms is step 3, the 6 ms of step 1 has no established cause. Checkpoint (qg3): build 0 after two fixes (an `EvalError` name the runtime module does not define: errors
are now told by `Error.prototype.isPrototypeOf`; bun-verify's URL keeps setters further up the prototype chain:
`d.get` of undefined in 165 tests, SsURL now walks the chain); `bun-verify: 169 pass, 0 fail`; live `463 pass 0 fail`;
run-sets `all: 1085 programs, silent 0`, freeze 0; run-all.sh `skip: ... 21 silent`, `all: ... 21 silent`, all 21
kept-closure programs (reg-*, fo-*), which its erased-text runner cannot protect by design.

Step 4. Rules on: every set 0 silent (freeze 315/105 accepted, attack2 252/132, attack1 8/1, oldspec 49/31,
oldvariants 239/40, runtime 98/80, new 70/20, h6 54/17). `live.test.ts` gains a test running freeze + h6 through
run-sets in a child process. Rules off (`sets-off.txt`): `all: 1085 programs, silent 12`:
- captured let reassigned, 3 (b4-let-reassign-after, b4-let-captured-array, h6-let-late):
  `const a = function* () { let n = 0; const f = () => n; yield f; n = 1; yield f; };`
- a cell writing its input typed array or ArrayBuffer through a view or a mutating method, 9: ab-view-of-input,
  ab-view-of-input-buffer, fc-typed-subarray, iterable-of-ab-union-narrowed, ta-view-of-cell-buffer, ta-view-of-cell-ab,
  ta-with-offset-view, S5.2#38, b6-typed-fill-input:
  `const t = () => new Uint8Array(2);\nconst a = (t: Uint8Array) => { const p = t.subarray(0); p[0] = 1; return 0; };`
  A typed array cannot be frozen, and every cell that reads one gets the same object, so a consumer's write is stopped
  only by its type (member-write / mutating-method). This is the T -> Mut<T> case.
New attack programs: `lite/infer/attack/h6-attacks.ts`, 54 (29 on closures, 25 on the table).

Gates (final). Browser (13:47, AC, load 2.37): `functional 651 pass 0 fail`; title 445 ms, lint 4.7 ms, completion 5.1 ms.
Collect (13:53, load 3.24) 764.4 735.9 756.2 µs/cell (step 1, load 2.05: 673.8 685.4 694.3; step 2 alone 718–722); the
+10% is across different loads and was not rerun back to back; collect output identical to step 1's. bun-verify 6.2 / 6.4 s (5.8 s before).
Rest of the final gates (`.scratch/holes6/final-gates.sh`, 13:55–14:21, logs in `fg/`): diff --module-only `SAME 1029
DIFFERENT 0`; rg-diff `registry level: ... SAME 82871 DIFFERENT 0 ... BOTH THREW 8`, `end to end: 1041 sources: SAME 1041
DIFFERENT 0`; tc-diff decompileVariable `SAME 34943 ... DIFFERENT 0`; cp-diff `cellsOf SAME 3552 DIFFERENT 0`; complete-diff
`SAME 6095 ... DIFFERENT 0 REVIEWED 4`; delivery `50469 orderings, 0 fail`. Every lite/ test passes but two:
- `acorn.test.ts` `4 pass, 2 fail`. The census failure is the earlier one (truncation of `lite/store.ss.ts` at 0.3: acorn
  itself throws `TypeError ... node.declaration.id.start`, the boundary reports it wrapped). The controls failure is new
  and caused by this round's files: the controls read `census.slice(300, 320)`, and 7 new files under lite/ sort before
  index 300, which moved the unparseable reject case `spec#7` to 316 (`.scratch/holes6/acorn-idx.ts`). Not changed.
- `toolchain/tc.test.ts` `10 pass 1 fail` (the tc-preload redirect never fired for ss-toolchain.test.ts); with
  `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0` `11 pass 0 fail`: a cached transpile of that test skips the preload plugin.
Not done or unverified: `/review-notebook` ran once on this section (FIX, 7 findings, 6 taken here; the collect rerun at
equal load not made). `ts-cells.test.ts` passes `a parse that does not fit Parse throws` on `ss_out is not defined` (also
in the 12:43 cp-port log, before this round). run-all.sh cannot see registrations, so its 21 is not a measure of the
notebook. Thunk timings 722.0 / 717.8 have no kept log. No shipped cell is newly rejected (`selfcheck 0 not accepted`,
bun-verify 169/0, browser 651/0); a cell whose kept function captures a typed array now throws at publish (none in
bun-verify or the browser suite; the shipped corpus outside those was not run).

## 2026-11-22 14:57–15:58: holes7, the four causes of selfhost/freeze-attack2 (build owner, logs `lite/soundscript/.scratch/holes7/`)
Start: `selfhost/freeze-attack2/run-all.sh` reproduced `-- 309 candidates, accepted 110, silent 67` (`attack2-before.txt`;
the script overwrites the folder's `all.out.txt`, the attacker's copy is kept as `attack2-all.out.orig.txt`); run-sets
`-- all: 1085 programs, silent 0` (`sets-before.txt`).

Cause 1, thenables. `deepFreeze` throws on any object or function with a callable `then` that is not `instanceof
Promise`, at the top and at every depth it walks (a nested one is unwrapped by any later `await`). A foreign object
(kind 0) is checked where it is met, not walked into. Static: a cell, yield or state value type that is a record, or
a union with a record member, whose `then` is a function type is `[type]`, top level only (`md-value.ss.ts
mdThenable`; frozen/core.ts the same under DELIBERATE CHANGE). The run-time ban cannot close one shape:
`const a = async () => ({ n: 1, then: (r) => r("str") })` is adopted by the async function's own return before `out()`
sees it (h7-then-async-return, before the rule: `show b = "undefined"`, `h7-on.txt`); the rule rejects it. Flips: 0
on the module corpus (`--module-only` `rules met on SAME sources (lines): type 445`, the same as holes6's
`fg/diffmod.log`). freeze2 with the run-time ban only: `accepted 110, silent 0` (`a2-run1.txt`, before the keep-mode
and ss_tdz edits); with the rule: `accepted 86, silent 0` (`fg/attack2.txt`). run-sets `--off` now also drops this
`[type]` (run-sets.ts `offRule`), so the off run measures the run-time ban.

Cause 2, path copying. No slot of a container the cell made is written. `deepFreeze` is three passes: a read-only scan
(every throw is in it, so a publish that throws changes nothing); only when a leaf (typed array, ArrayBuffer, native
URL, promise) or a native Map/Set was met, the containers that reach one, by reverse edges (a cycle maps to one copy);
then the copies, frozen shallow copies holding the leaf copies, and in-place freezing of the rest. A copy carries every
own key, symbols included: the first run copied `Object.keys` only and a StateCell (a record with a symbol key) lost
its mark, `s did not return state(...)` in 3 programs (`sets-run1.txt`). The cell's own containers on such a path are
left unfrozen and not DONE. A record holding a promise is now copied rather than written in place. Throws at publish:
a function, an Error or an already frozen value (a JSX element) that reaches a leaf. A promise among a function's
captures cannot be replaced: its value is frozen in place when it settles (`walk(x, true)`), promises inside it too,
and a container on its path to a leaf is not put in DONE, so publishing that container later throws (it can be neither
skipped nor copied into). A typed array in such a value stays the cell's (as before). Every boundary already used the
return value (prelude.runtime.ts 92, 110, 168; cells.ts 58, 62; run.ts 89 and stdlib/runtime.ts 131 for workers); the
two discarded results were `tdz()` and the held promise's `then`.

Cause 3. `SsURL.prototype.searchParams` returns `new URL(this.href).searchParams`, the params of a URL no one else
holds (`new URLSearchParams(...)` made the build refuse: `generated cells take URLSearchParams, which no cell defines`).
The only URL the language makes is `new URL` (intrinsics.ts 246-251), compiled to SsURL. Rows added to freeze-table.ts
for the live views: URL searchParams, typed subarray, typed buffer, Map and Set iterators (banned), Error cause (Error's
`{ cause }` option is `[arity]` in the language, so the row publishes an Error beside the array), thenable (banned).
RegExp lastIndex already had a row; AggregateError is not an intrinsic.

Cause 4. A registered function whose thunk throws (a capture in its dead zone) makes `deepFreeze` throw `a function is
published before a binding it captures is initialised (Cannot access 'late' before initialization.)`. PENDING, `tdz()`
and the `;ss_tdz();` edit are removed: fnreg.ts 148 -> 137 lines, tc-reg.ss.ts 205 -> 190 (tcRegTdz, and the caps it
alone read), and the tdz runtime cell (tc-text, link.ts `slice(0, -6)` -> `-5`, run.ts, runtime-ss.ts,
stdlib/runtime.ts, tc-types, tc-build; frozen ss-toolchain under DELIBERATE CHANGE). Census with the old fnreg.ts
(`tdz-census.ts`, output `tdz-census.out.txt`): 892 cells in 86 shipped .ss.ts and example files, 28 tdz edits in 19
cells; 10 follow a declaration whose initializers are all functions (a recursive local), the other 18 a name a hoisted function or a
same-named binding in another scope captures (fnreg compares names, not scopes). These are toolchain cells that run in
every check; none throws in bun-verify (170/0) or the browser suite. freeze.ts 163 -> 201 lines (132 -> 161 non-comment).

Attacks. run-sets has sets freeze2 (selfhost/freeze-attack2 b0-b11, imported) and h7 (`lite/infer/attack/h7-attacks.ts`,
45 programs, by name prefix: 11 h7-then, 18 h7-ta, 8 h7-lv, 8 h7-tdz). The three dead-zone programs first written with
arrows were `[free-name]` and never ran; rewritten as hoisted declarations (let, a parameter default, a catching body)
they run and throw. Of the 45, 26 run with the rules on and 40 off (`fg/setson2.txt`, `fg/setsoff2.txt`). live.test.ts
(lite/infer/attack/) runs freeze, h6, freeze2, h7. Final: run-all.sh `-- 309 candidates, accepted 86, silent 0`;
run-sets `-- all: 1439 programs, silent 0`; `--off` `-- all: 1439 programs, silent 30`, freeze2 `accepted 246, silent 18`,
h7 `accepted 40, silent 0`. The 30 are the two known classes (SILENT lines in `fg/setsoff2.txt`): a captured let or
parameter reassigned, 11 (b4-let-reassign-after, b4-let-captured-array, h6-let-late, let-for-header, let-pow-assign,
let-shift-assign, let-counter, let-two-closures-pre, catch-reassign, inner-param-reassign, cell-param-reassign); a
consumer writing its typed-array input, 19 (ab-view-of-input, ab-view-of-input-buffer, fc-typed-subarray,
iterable-of-ab-union-narrowed, ta-view-of-cell-buffer, ta-view-of-cell-ab, ta-with-offset-view, S5.2#38,
b6-typed-fill-input, cw-view-buffer, cw-subarray, cw-union, cw-rec-wrap, cw-arr-wrap, cw-map-wrap, cw-fill-view,
cw-ab-input, cw-ternary-rec, cw-for-of-mix).

Gates (`.scratch/holes7/gates.sh`, 15:25–15:41, logs in `fg/`; after the keep-mode fix rerun by hand ~15:55): build 0;
`bun-verify: 170 pass, 0 fail, 0 timed out, 0 skipped; 6.3 s`; `14/14 fixtures pass`; diff `SAME 3613 DIFFERENT 0`;
--module-only `SAME 1029 DIFFERENT 0 NOT COVERED 0 BOTH THREW 0`; tc-diff decompileVariable `SAME 34936 ... DIFFERENT 0`,
all calls `DIFFERENT 1`, which is `erase (repro)` on `lite/toolchain/repro/erase-optional-comment.ts`, an untracked
repro of an erase.ts bug this round did not make; live `461 pass 0 fail` (holes6's `bt-infer_attack_live.test.ts.log`
is also 461); freeze-table as a script `232 programs; late writes that threw: 77; 266 pass, 0 fail` (under `bun test`:
`late writes that threw: 0`, `fg/table.txt`); run.test `2 pass`; delivery `50469 orderings, 0 fail` (the process took
769 s to exit); freeze.test `43 pass, 0 fail`. Not rerun after the keep-mode fix: diff, tc-diff, delivery (freeze.ts
only changed, and none of them reaches a held promise).
Browser (AC). Before, the 13:46 build (`verify-before.txt`, 15:04, load 2.27): title 449 ms, lint median 4.7 ms,
completion 5.0 ms, Mandelbrot pool 48.9 ms (main 66.5); its `647 pass 4 fail` are the core-only, no-raw and
core-not-main builds, made while freeze.ts was mid-edit (`SsURL still has TypeScript after erase`). `verify-after.txt`
(15:16, load 3.38): pool 42.8 ms, `648 pass 5 fail` (the new S4.6 row expected a run-time TypeError where the checker
now refuses first; core-only's boot probe read `listeners attached undefined`, not seen again). `verify-final.txt`
(15:41, load 2.34): `functional 653 pass 0 fail`; title 442 ms, lint 5.1 ms, completion 5.8 ms, pool 55.7 ms (main
69.1). `verify-final2.txt`, after the keep-mode fix (15:53, load 2.31): `functional 653 pass 0 fail`; title 1074 ms (one
reading, not explained; 441-449 ms in the three runs before), lint 4.7 ms, completion 5.1 ms, pool 50.7 ms (main 69.0). The pool's spread over runs of nearly the same code is larger than any
difference that could be put on path copying; unresolved, not measured back to back. Spec row `test_spec_S4_6_host`: a
top-level thenable is `[type]`, a nested one throws TypeError at publish, and `searchParams` read before
`x.search = "?q=2"` still gives `"1"`: pass in the original and the reopened export.
Not done or unverified: the collect µs/cell cost of the new scan was not measured. The acorn census index used by
`acorn.test.ts` controls moves again with h7-attacks.ts (the other agent's file; not run). A fresh-context review
(sonnet, read-only) of the first draft of this section gave 7 findings; taken: log paths, the h7 split, the full list
of 19, the census output, the h7 run counts; its claim that holes7 has no browser log was wrong (`verify-*.txt`).

## 2026-11-22 16:10: spec S3.18, S4.1–S4.9, S5.1–S5.5 reworded for the freeze design (prose only; for the owner's end review)
Statement numbers kept, because `test_spec_S*` and the reject rows are keyed on them. No test, row or rule changed
except one result string of `test_spec_S3_18` ("frozen after" -> "returned after"). Section titles: "4. Local writes",
"5. Generator cells that keep a value". Written by the orchestrating session under the owner's 2026-11-22 go-ahead
("your wording changes are fine, I will review everything once the language is stabilised").
Each claim was read off a reject or accept row, or a probe run through `checkSources`
(`lite/soundscript/.scratch/mine7/probe.ts`, 19 programs): nested literal write rejected (`m.a.b = 2` [member-write],
`m.xs.push(2)` [mutating-method]) and accepted under `Mut<{ a: Mut<{ b: number }> }>`; alias write accepted; `let`
local writable; `const xs: number[] = [1]; xs.push(2)` [mutating-method]; kept function reading accepted, returning the
Mut [mut-capture]; `snapshot` of an input and of a local gives a writable local; `Borrowed<…>` on an input [inject-type];
a call result not typed Mut is not writable.
Not probed, taken from the builders' notes: the S4.6 list of what throws at publish (holes6, holes7) and "the arguments
of an action". Open for the owner: whether S4/S5 should be renumbered into one section; whether `snapshot` keeps its
name now that nothing is borrowed; S4.6 is one long statement and could be split per boundary.
Gates after the edit: build exit 0, `bun-verify: 170 pass, 0 fail`, `14/14 fixtures pass`. Browser verify not rerun.
Fresh review of the rewording (opus, no context, 23 tool uses): BLOCK, 6 findings, all confirmed by its `checkSources`
probes (`lite/soundscript/.scratch/review-s4/`), all taken in the prose: S4.9 (Mut is accepted in any type inside a
cell), S5.2 (`Borrowed` still resolves), S5.5 (snapshot is structuredClone: a function or URL throws at run time),
S4.5 (the late-write clause covers nested async functions, not an async cell), S4.8 (URL copy is `new URL(u.href)`; a
bound view is read-only), S4.6 (only sync generator objects throw). Code left as found, for a later step: the
`[mut-capture]` and `[mut-yield]` messages suggest `u.slice()` for a URL, which is unsupported; `snapshot` of a function
or URL could be a `[type]`; deepFreeze does not refuse an async generator object (the checker rejects it first).

## 2026-11-22 16:25–18:14: holes8, the run-time freeze holes of selfhost/freeze-attack3, by class (build owner, logs `lite/soundscript/.scratch/holes8/`)
Saved before overwriting: the attacker's `selfhost/freeze-attack3/all.out.txt` as `attack3-all.out.orig.txt`, the
current `selfhost/freeze-attack2/all.out.txt` as `attack2-all.out.orig.txt` (holes7 already kept that attacker's copy).
Originals of every edited runtime file are `*.before.ts` beside them.

Step 0, the observer. `lite/infer/attack/observe.ts` takes from `selfhost/freeze-attack3/harness.ts`: `checked` (the
checker's verdicts, so compile islands run; run-sets passes them, `--off` marks a cell ok when only dropped rules hit
it), promise following (each promise a fulfilled value reaches, through functions but not actions, to depth 6, read when
it settles, value or rejection reason, and again at the end), and `twice` (one reading per run of a consumer). Also
`fetchBody`, and `scheduler.frame` set per run (freeze-attack3's harness.ts replaces it when its batches are imported).
run-sets has set freeze3 (b1-b11, 360; c0's 4 controls run without the checker and are counted apart) and h8
(`lite/infer/attack/h8-attacks.ts`). b4's 30 `-obs` rows died on the attacker's `v.size` on an `unknown` ([no-member]);
the repaired rows type the consumer with what the promise holds (`h8-obs-*`, 30). freeze3 alone reproduced the attacker's
list exactly (`diff` of the two SILENT lists empty). Before any fix (`sets-before.txt`, `sets-before-off.txt`):
```
rules on:  freeze 0, attack2 0, attack1 0, oldspec 0, oldvariants 0, runtime 0, new 0, h6 0, freeze2 0, h7 0,
           freeze3 88 (accepted 148), h8 7 (30 programs), controls fired 4 of 4; all 1829, silent 95
rules off: freeze 3, attack2 4, attack1 0, oldspec 1, oldvariants 0, runtime 0, new 3, h6 1, freeze2 23, h7 0,
           freeze3 159, h8 24; all 1829, silent 218
```
freeze3's 148 against the attacker's 149: `b8:deep-2000` gave `CRASH Not enough stack space to parse input` in the
checker in that run and was accepted in the freeze3-only run; stack depth, not code. With rules off freeze2 went from
holes7's 18 to 23: the five new ones are promise-held typed arrays the old observer could not read
(`b6:pr-cap-iife`, `b7:pc-typed-param`, `pc-typed-ret`, `pc-typed-all`, `pc-typed-in-rec-yield`, all dropped
`mut-capture`), class C, so in scope.

The classes are the brief's, against `selfhost/freeze-attack3/RESULTS.md`'s causes: A, islands and other paths that run
erased text (cause 1); B, the keep-mode invariant, and C, measure the held promise then refuse it at publish (both cause
2); E, rejection reasons (cause 3); D, a native Map or Set, and F, an action's arguments all or none and a match
array's indices and groups (neither among RESULTS.md's three causes; from the brief).

Class C measured first. `promise-census.ts` (TypeScript program over diff.ts's file globs plus `lite/**/*.ss.ts`, 172
files): `cells 2016, inner functions 2046, capturing a local 482, capturing a promise-typed local 0 in 0 cells`; of the
782 captured locals 190 are typed any or unknown, so the AST count alone is not ~0. A control file of 4 cells
(`census-control.ts`) gave 3 of 3 hits and the negative case clean. Dynamic count: a temporary `console.error` where
freeze.ts held a promise (and in run.ts's erased-text fallback), built into the notebook: `SS_HELD=1 bun
bun-verify/run.ts` `170 pass, 0 fail`, 0 lines; fixtures 0; build 0; all run-sets sets 0 fallbacks; freeze3 81 hits
(the counter fired). Instrumentation removed (files restored from the `.before` copies). Chosen: refuse at publish.

Classes, enumerated, then fixed.
- A, checked text run without the registering compile: (1) `lite/browser/run.ts` runCells fell back to the erased text
  when compileModule threw: 0 of 1829 programs took it; now throws `the cells do not compile, so they cannot run`.
  (2) run.ts compileFor and (3) `lite/stdlib/runtime.ts` compiler (the notebook's `ss_compile`), on the page through
  `runHere`, in a worker through the pool: erased island text. `lite/browser/workers.ts` runHere now structured-clones
  `job.values` in and the result out (the pool's postMessage already does both), and the callers deep-freeze it as
  before; what a worker cannot be sent fails on the page with the same `The object can not be cloned.` (4) the pool
  worker: unchanged. (5) a rejected cell in runCells runs its erased text: not accepted, out of scope. link.ts and the
  notebook's compiled cells register (holes6). Static: `walks.ss.ts uncloneable` now refuses a type argument
  (`Map<string, () => number>`), an open type (unknown, object, a type parameter) and nesting deeper than 8. The frozen
  comparator imports the same cell from types.ts (DELIBERATE CHANGE note in `frozen/core.ts`). Flips: `diff.ts
  --module-only` rule tally line identical before and after (`compile-boundary 9`), SAME 1029. After the run-time
  change alone, all 12 accepted b2 programs (the 10 silent ones among them) were `error go: The object can not be cloned.` (`sets-1.txt`); with the static change
  all but `isl-pool-typed` are `[compile-boundary]`.
- B, keep mode: its only caller was the held promise (freeze.ts 177). Deleted with C; no mode is left that passes a leaf.
- C: a promise in a slot no replacement can be put in (a function's captures, an Error, an already frozen value) throws
  in the scan, before anything is frozen. Static, cheap: `ow-capture.ss.ts owPromiseIn` (9 lines; owCaptureErrs 21)
  makes a kept function that reads a local whose type holds a Promise (not through a function type) `[mut-capture]`;
  mirrored in `frozen/own.ts` under DELIBERATE CHANGE. Flips 0 (`diffmod-static.txt` rule tally identical; full diff
  SAME 3613). New reject row S4.5.
- D, native Map/Set in a checked cell: structuredClone and snapshot (the only intrinsics whose result can be one:
  `mapsources.ts` over INTRINSIC_DECLS lists only Map and Set themselves; Map.groupBy is not declared, Set algebra is
  wrapped), island and pool results, `new Map` in an island. With keep mode gone, deepFreeze copies a native Map or Set
  to a frozen SsMap/SsSet at every depth, and throws where no copy can be put. No prelude rebinding.
- E: `then-sites.ts` (AST): freeze.ts had 3 one-argument `.then` and the keep-mode one; prelude.runtime.ts has none. All
  three now pass `rethrow` (deep-freezes the reason and throws what that gives, a copy or deepFreeze's own TypeError).
  One copied promise per published promise, so two readers get one reason (`h8-rej-two-consumers`: `["x"]`, `["x"]`).
- F: action arguments `f(...deepFreeze(args))`: one scan of all of them, then freezing (`h8-act-partial` `show s = 0`,
  the caller's later push succeeds). Arrays: `extraKeys` walks own non-element properties only when the array has own
  `index` or `groups` (match arrays and their `indices`). Measured (`keys-time.txt`, bun): 1e6 elements, walk 5.3 ms,
  Object.keys 542 ms, two hasOwn 0.000 ms.
Line counts: freeze.ts 201 -> 201 (161 non-comment both), fnreg.ts 137 -> 137.

Found on the way: in bun-verify every structuredClone result was a node-realm object (lope-runtime.js passes node's
structuredClone into the vm), whose prototypes freeze.ts does not know, so `snapshot`, structuredClone and now the
page's island results were published unfrozen there (the new S4.6 row failed on `n.m.set` and on `Object.isFrozen(out.y)`).
`bun-verify/capabilities.ts realmClone` rebuilds the result with the realm's constructors; a browser's clone is
same-realm. Not fixed: a host-realm object from another node API (Response.json in bun-verify) is still left alone.

Tables and tests. freeze-table.ts rows: promise among captures (banned), rejection reason, native Map (structuredClone),
native Set (snapshot), match array groups, match array indices; freeze-table.test.ts routes promise, rejection, kept
promise (a promise-route consumer awaits, so a banned value puts it in error; Promise.resolve adopts a thenable, which
is exempted). On the old freeze.ts and prelude: `385 programs; ... 358 pass, 83 fail` (`table-oldcode.txt`); new: `441
pass, 0 fail`. h8-attacks.ts: 30 repaired obs rows plus 46 by class (9 island, 14 kept promise, 11 native Map/Set, 8
rejection, 4 action/match array). On the old code (`h8-on-oldcode.txt`) h8 is `silent 13` rules on and 30 off.
spec.ojs: `test_spec_S4_6_holes8` and the S4.5 reject row. live.test.ts runs freeze3 and h8 too.
Spec prose this makes false or incomplete (not edited; for the owner): S4.6 "the arguments of an action, and the result
of a worker" (now also the reason a promise rejects with, all of an action's arguments or none, and an island's result
on the page, which like a worker's crosses as a structured clone both ways); "Arrays, records, Errors and JSX elements
are frozen" (a match array's groups and indices too); "A Map, Set or URL made in a cell is an instance of a subclass"
(a native Map or Set from structuredClone or snapshot is published as a frozen copy of that subclass); "The locals a
published function uses are frozen with it" and the publish-throws list (a function, Error or already frozen value
that holds a promise throws). S4.5 does not list a captured promise among the `[mut-capture]` cases (new reject row
there). The not-specified list (line ~2482) describes `[compile-boundary]` as "an island input that cannot be sent to a
worker, such as a function"; it is inputs and outputs, and now type arguments, open types and nesting deeper than 8.
S5.5 stays true.
Dead end: the first gate run (`fg/`) hung at `selfhost/freeze-attack3/run-all.sh`: run-sets.ts now imports the freeze3
batches at top level, the batches import harness.ts, and harness.ts imports `verdictOf` from run-sets.ts; the cycle
through top-level await never settled (a one-candidate run printed nothing in 60 s). Sets now load only under
`import.meta.main`. Also `bun test ./lite/browser/run.test.ts ./lite/toolchain/tc.test.ts ./lite/acorn.test.ts` in one
command runs acorn.test.ts only (it calls process.exit), so the three were run apart.

Gates (`fg/` 17:06–17:30, `fg2/` after the S4.5 row, freeze.ts comment edits, freeze.test.ts and run-sets' load guard):
build `exit 0` (fg2); `bun-verify: 171 pass, 0 fail, 0 timed out, 0 skipped` (fg2; 170 plus test_spec_S4_6_holes8);
`14/14 fixtures pass; 51 lint/injection rules registered, 51 with a reject case` (fg2); diff `SAME 3615 DIFFERENT 0`
and --module-only `SAME 1031 DIFFERENT 0` (fg2; +2 sources, the S4.5 row and the inline cells of the S4.6 test; the
rule tally differs from the start only in `mut-capture 30 -> 32`, those two); tc-diff `all calls: SAME 341388 SAME
THROW 3828 DIFFERENT 1`, the 1 is `erase (repro)` (fg); live.test `461 pass 0 fail` (fg2; its child run-sets line `all:
1159 programs, silent 0`); freeze-table as a script `385 programs; late writes that threw: 128; 441 pass, 0 fail`,
under bun test the script prints `late writes that threw: 0; 441 pass, 0 fail` with the 128 as `Unhandled error between tests` blocks and no bun summary (freeze-table.test.ts calls process.exit) (fg); freeze.test `47 pass, 0 fail` (fg2; in fg it was `0 pass 1 fail 1 error`: its old held-promise check now got the new `TypeError: a promise where it cannot be replaced`, unhandled, and was rewritten); run.test `2 pass 0 fail` (terminal only, not logged), tc.test `11
pass 0 fail` (685 s, `fg/tctest.txt`), acorn.test `6 pass, 0 fail` (run apart, after the fg build); run-sets (fg) `all: 1875 programs,
silent 0`, freeze3 accepted 56 silent 0, h8 accepted 28 silent 0, freeze2 accepted 85 (b6:pr-cap-arr is now
`[mut-capture]`), freeze3 controls fired 3 of 4 (`ctl-promise-typed` now throws at publish: the path it controlled is
covered); `--off` `all: 1875 programs, silent 52`: the 30 of holes7 (11 captured let or parameter reassigned, 19
consumer writing its typed-array input) and 22 freeze3 `b6:cw-*` (consumer writes, all `dropped member-write` or
`mutating-method`), h8 off `accepted 72, silent 0`, freeze2 off back to 18. run-all.sh freeze-attack3 `360 candidates,
accepted 56, silent 0`, `controls 4, fired 3`; its nb-island.ts now stops at `compile refused: go not ok by the
checker` (the island is `[compile-boundary]`), so its `notebook compile` line is gone. freeze-attack2 `309 candidates,
accepted 85, silent 0`. Not rerun after the fg2 changes: tc-diff, freeze-table, run.test, tc.test, acorn.test, run-sets
(only comments of freeze.ts and run-sets' loading changed for them).

Browser verify, run twice. First (`fg2/verify.txt`, after the fg2 build): `functional 647 pass 8 fail`, all eight
`page errors 1: x` (themes, phone, touch, try-it, original, reopened, ui, reloaded saved page). The `x` was the
rejection reason of test_spec_S4_6_holes8's cell `r`: its promise rejected when the cell ran, and the test attached its
`catch` later, so the page saw an unhandled rejection on every page that loads the spec. The row now calls
`soundscript.deepFreeze({ p: Promise.reject(new Error("x")) })` and attaches both catches at once; the checks are the
same (reason frozen, one reason for both readers). Second (`fg3/`, rebuild after that edit): build exit 0,
`bun-verify: 171 pass, 0 fail`, `14/14 fixtures pass`, diff `SAME 3615 DIFFERENT 0` x5, --module-only `SAME 1031
DIFFERENT 0`, browser verify `functional 655 pass 0 fail` (653 before plus the holes8 row in the original and the
reopened export). Then, on the same fg3 tree (`gates3.sh`, 18:07–18:13), every other gate again:
acorn.test `6 pass, 0 fail`; tc-diff `SAME 341388 SAME THROW 3828 DIFFERENT 1` (`erase (repro)`); freeze-table script
`late writes that threw: 128; 441 pass, 0 fail`, under bun test `late writes that threw: 0; 441 pass, 0 fail`;
freeze.test `47 pass, 0 fail`; run.test `2 pass 0 fail` (`fg3/runtest.txt`); live.test `461 pass 0 fail`; run-sets
`all: 1875 programs, silent 0`, `--off` `silent 52`, every per-set line equal to fg's; run-all.sh freeze-attack3 `360
candidates, accepted 56, silent 0`, freeze-attack2 `309 candidates, accepted 85, silent 0`; tc.test `11 pass 0 fail`.
All numbers in this section's last two paragraphs are of one tree.

After review (a fresh agent, BLOCK, 7 findings, all taken: the verify runs above, the heading time, the run.test and
tc.test logs, the bun-test wording of freeze-table, the fg freeze.test failure, the class map, the b2 count) and an
advisor pass:
- The 22 freeze3 `--off` silent programs are one family by construction: `selfhost/freeze-attack3/b6.ts:6` builds every
  `cw-*` as `const w = (t: Uint8Array) => { <body> return 0; }` over `T = new Uint8Array(2)`, a consumer writing its
  typed-array input; all 22 are `dropped member-write` (one also `mutating-method`).
- Line counts (before -> after): freeze.ts 201 -> 201, fnreg.ts 137 -> 137, workers.ts 127 -> 130, run.ts 219 -> 220,
  prelude.runtime.ts 242 -> 243, stdlib/runtime.ts 148 -> 148, walks.ss.ts 110 -> 113 (the `uncloneableWith` cell 20
  lines), bun-verify/capabilities.ts 168 -> 193 (realmClone, 25; no before copy kept, counted from the block).
- S4.6 and S5.5 re-read (spec.ojs:752, :909) against the deleted keep mode and runCells' throw: neither mentions a held
  promise or an erased-text fallback; S8.7 ("An island of ok cells runs when another cell of the module does not
  parse") is about `compile`, not runCells, and its test passes in fg3.
- The rejection half of test_spec_S4_6_holes8 calls `deepFreeze` directly, not through a checked cell (the page-error
  dead end above). The cell path of a rejection is covered by the 8 `h8-rej-*` attacks and freeze-table's rejection
  route, not by the spec row.

## 2026-11-22 19:06–21:08: rule set R, code that runs after a value is given (build owner, logs `lite/soundscript/.scratch/r1/`)
The owner's decision: exclude statically the uses by code that keeps running after a cell gave a value. Built as
specified, on selfhost/late-code's definitions (its `visibleFn`, "used after", loop and helper-call rules, copied into
cells, not reinvented). Originals of every edited file are in `.scratch/r1/orig/`.

Rules and cells.
- R-Y `[mut-yield]` and R-A `[mut-await]`: new file `lite/infer/ow-late.ss.ts` (111 lines; cells owLateCand 2,
  owVisibleFn 11, owLatePoints 6, owUsesOf 12, owWriteAt 10, owLoopBody 6, owLoopsOut 5, owAfter 11, owLateMsg 6,
  owLateUses 19), registered in `lite/infer-ss.ts` OW_FILES and run last in `ow-entry.ss.ts owCheckIn` (10 lines). One
  report per binding and function, at the first use after the point: per use, the S5.1 row `yield buf` in a loop gave
  two `[mut-yield]` and `spec_rejectsFor` wants exactly one.
- `[mut-await]` is a new id (rules.ts, 52 rules): `[mut-yield]` would name a yield where the point is an await.
- R-K: `owCaptureErrs` 20 -> 22 lines plus `owKeptReadMsg` (3). The Mut read report goes after the existing branches and
  late-write reports, so a more specific message at the same node still wins (`owErr` keeps the first per start:rule);
  none of the old reports was removed.
- Frozen mirror: `lite/infer/frozen/own.ts` 653 -> 709 lines, two DELIBERATE CHANGE blocks. `diff.ts` `ownership: 3628
  cells: SAME 3628 DIFFERENT 0`, `--module-only` `SAME 1044 DIFFERENT 0` (`.scratch/r1/w/diff1.log`, `diffmod2.log`).
- Messages name the fix the checker accepts, each run through `checkSources` (`.scratch/r1/p1.txt`, `p4.txt`): a
  `const` under the plain type (`const c: readonly number[] = out`), a local made in the loop body, a helper call.

Primitive lets. As specified, a primitive `let` is allowed across a yield and an await, but not under R-K. So
`accept-basic ticks`, `s7_beats` (`for (let i…)`), breakout `ticks` (`let t`, the previous time, example and fixture)
and `selfhost/rt/probe3 awaitLoop` (`let s`) are accepted unchanged: checked by `.scratch/r1/census2.ts` (late-code's
corpus against its own pre-R verdicts, `w/census2.txt`), where none of them changed.

Shipped cells rewritten (the full changed list is `w/census2.txt` plus `.scratch/r1/census.ts` over the build's
sections, which found the checker's own cells late-code did not see):
- `lite/render.ss.ts eventOf`: `const events: Map<string, string> = …`;
- `lite/infer/ix-core.ss.ts ixAdmits`: `const W: Map<string, Ty> = …` (rejected in 61 sections, since every section
  takes ix-core);
- `lite/toolchain/tc-build.ss.ts tcBuiltOf`: `const views: readonly string[] = …`, not in late-code's list. `spell`
  is passed by name to `map`, so it is not a helper and counts as kept;
- `lite/soundscript/spec-5.ts s5_frames`: the buffer is made in the loop body;
- spec.ojs: the 10 `frames` owners (the same edit), the S4.4 row's owner (`for (const k of [0, 1]) yield { n: k }`),
  the S3.19 `boxed` row and its accept test (plain types), the S6.9 `let q` row (the action reads `const r = q`), the
  test_spec_S4_6_reach and S5_5 programs, and the S4.8/S5.1 typed-array rows (one yield, no loop);
- checker-tests.ojs: expectations of test_checker_action_capture_by_binding (two cases gain `[let-capture]`),
  test_checker_iterator_rules (one gains `[mut-capture]`; two accept cases bound under plain types) and
  test_checker_mut_across_await (four cases are now `[mut-await]`; comment rewritten).
- Become reject rows: the S4.5 `return f` accept row (now S4.10), the two S5.4 `bad` accept rows (they are the hazard
  itself). The first is an S5.7 reject row; the second (`const h = async (): Promise<void>`) gives two `[mut-await]`
  (on `v` and `m`), and a spec row allows one rule, so it is a case of test_checker_mut_across_await instead. `fixtures/lite-mut/reject-mut-capture bad_stored` is now rejected, as its fixture name says.

Spec. New statements S4.10 (R-K), S5.6 (R-Y), S5.7 (R-A), each with a test and reject rows (3, 5, 3). Sentences R made
false, all rewritten: S3.11 "Reading a captured `let` is accepted"; S3.19 "An array, a string, a `Map` and a `Set` may
be kept"; S4.5 "A kept function may read a `Mut` of an enclosing function"; the section 5 title and intro ("A
generator cell may keep one writable value across its yields"); S5.1 "may keep a writable local across its yields"
and "a generator that goes on writing yields a copy"; the S5 cells md ("fills one buffer three times").

Measurement switches. `lite/freeze.ts` (201 -> 205): in a bun process `SS_MEASURE_REG=0` makes `closure()` and
`methods()` register nothing (the prelude's own `closure` for an action's handle included) and `SS_MEASURE_FREEZE=0`
makes `deepFreeze` return its argument; read from `globalThis.process?.env`, so a browser has no switch. Mode (a) is
shipped, (b) REG=0, (c) both. `.scratch/r1/measure.sh`, outputs `.scratch/r1/m/`. The 246 programs of
`selfhost/convert-freeze/attack1/progs.ts` run through `.scratch/r1/attack1-main.ts`: run-sets `verdictOf` after
`rewriteSS`, and attack1's own observer copied as `observe2-main.ts` with its imports pointed at the main tree.

Observer controls, static capture rules dropped (`--off`), 2026-11-22 19:20 to 19:35:
```
attack1 --off   (a) accepted 199, silent 0   (b) silent 170   (c) silent 187
run-sets --off  (a) all: 1921 programs, silent 52   (b) silent 375   (c) silent 810
```
(a)'s 52 is holes8's 52, the same programs. A first run of (c) gave `silent 0`: zsh does not split `env $e`, so both
variables went in as one, and freeze stayed on. Rerun with arrays.

With R on:
```
                               programs  accepted  silent (a)  (b)  (c)
run-sets (13 sets, h9 included)    1921       326           0   19   27
freeze-attack2 run.ts               309        11           0    0    2
freeze-attack3 run.ts               360        15           0    0    0   controls fired 3 / 4 / 4 of 4
attack1 (main tree)                 246         3           0    2    2
```
Before R, run-sets accepted 739 of 2121 programs (late-code's count, a different set list).

Every program silent in (b), by mechanism:
- A Mut below the top level of a binding whose own type is not `Mut` (10): `freeze b1:reg-for-of`, `b2:fo-index`,
  `h6-array-container` (`const reg: Mut<number[]>[]`, a kept function returns an element typed `Mut`, the consumer
  pushes into it); attack1 `mutparam/mut-field-of-plain-record`, `mutparam/mut-in-tuple` (`const o: { f: Mut<number[]> }`
  written by a visible async helper); `h9-nm-gen-after-yield`, `h9-nm-gen-record`, `h9-nm-async-helper`, `h9-nm-aa`,
  `h9-nm-map`. R-Y, R-A and R-K test `isNamed(b.t, "Mut")` on the binding, as specified.
- An async function inside an async function, not awaited (11): `h9-aa-alias-fn`, `-map-alias`, `-set-alias`,
  `-rec-alias`, `-param`, `-helper-write`, `-two-deep`, `-all`, `-branch`, `-recursive`, `-default-param`. late-code's
  `visibleFn` takes a nested async function in an async encloser as awaited, which is not checked. The kept function
  reads a `const` of plain type that aliases the Mut the helper writes.
(c) adds what only the publish freeze stopped (8): `freeze b2:ah-async-cell`, `b4:er-async-cell-promise`, freeze2
`b8:cs-async-cell`, `b10:cs-deep-async`, `h9-aa-direct`, `-alias-rec`, `-consumer`, `h9-nm-direct-yield`.

Answer to the question: with R in, closure registration is still needed, for these two classes. Neither is closed
without a change the brief did not ask for. The first needs R to take any binding whose type holds a Mut (owMutIn), not
only `Mut<…>` at the top. The second needs to know whether a promise is awaited before its encloser ends, which is
flow tracking of the promise value. Both left open, not built.

h9 (`lite/infer/attack/h9-attacks.ts`, 46 programs, in run-sets and live.test): (a) `accepted 26, silent 0, with a cell
in error 4`; (b) silent 16; (c) silent 20 (`w/h9-*.txt`). By the checker: then/catch/Map.set callbacks are
`[mut-capture]` (the intrinsic retains them), sort's comparator is called at once, `finally` after a yield and an async
generator's await are `[mut-yield]`, a held iterator and a stepped generator object `[iterator-capture]`; a getter, a
labelled `continue` in a generator and a nested `function*` are `unsupported`. The 4 h9 programs that run into an error
in (a) are the `h9-nm` ones caught by the freeze at the later write. The `h9-pr` four are controls of the rule: accepted,
silent in no mode.

Dead ends. `env $e` in zsh (above). Reporting every use gave double `[mut-yield]` rows. The first gate run was stopped
after S3.11 and S3.19 were found false; the gates were rerun on the final tree.

Gates, final tree, 20:42 to 21:07 (`.scratch/r1/gates.sh`, `gates-long.sh`; logs `w/gates-final/`, summary
`w/gates-final-summary.txt`):
```
build.ts --force                exit 0 (writes lopebooks/notebooks/soundscript.html)
bun-verify                      174 pass, 0 fail
fixtures.ts                     14/14; 52 rules registered, 52 with a reject case
diff.ts                         SAME 3629 DIFFERENT 0 REAL CRASH 14 (14 before R: holes8/diff-walks.txt)
diff.ts --module-only           SAME 1045 DIFFERENT 0
tc-diff.ts                      corpus rows DIFFERENT 0; erase (repro) DIFFERENT (by design)
live.test.ts                    461 pass, 0 fail (sets freeze..h9: 1205 programs, silent 0)
freeze-table.test.ts            441 pass, 0 fail
browser/run.test.ts             2 pass, 0 fail;  acorn.test.ts 6 pass, 0 fail (run apart)
run-sets                        1921 programs, silent 0  (--off: silent 52)
freeze-attack2 / 3 run-all.sh   silent 0 / silent 0
tc.test.ts                      11 pass, 0 fail
verify.ts (browser)             661 pass, 0 fail
```
Three earlier gate runs (19:46, 20:10, 20:24; the last passed in full before the S5.6 row) lost their log directory: the scripts resolved `$0` after `cd`, so the logs went
to `tools/lang-experiment/g` and `w/gates`; moved into `w/gates-run1`, `w/gates`. Their browser verify failed 3 and 2:
`reference` (`[mut-await]` produced but not named in the tutorial's rule table), `prose` (a repository path and
"below" in the spec's new Not specified items), and once `original` (17 test cells pending at boot, load 5; passed in
the next run). The first two were fixed; the rule table in tutorial.ojs also still said a kept function may capture
what is not written, and gained the R rows.

Fresh review (`/review-notebook`, 2026-11-22 19:40, BLOCK, 8 findings, all confirmed and taken): S3.11 lacked the
intrinsic-callback exception; test_spec_S3_11 and S4_5 did not run their accept rows (now `spec_acceptsFor`); S5.7
said an awaited async helper is exempt when the checker exempts it awaited or not (reworded; both open classes added to
"Not specified"); S4.5 called `[mut-capture]` more specific than itself (now "the message names the case") and repeated
S4.10 for a `let` (removed); the S4.5 promise row followed from no statement (sentence added to S4.10); this section
was unfinished; where the second S5.4 row went; S5.6's `xs.push(yield 1)` example also gives `[type]`
(kept, with a reject row whose `xs` is `Mut<unknown[]>`, probed to give one `[mut-yield]`: `w/../p5.txt`). After the
review the S4.10 promise sentence lost an unchecked reason. The edits made after the review (S5.7 wording, the two Not
specified items, the tutorial rows, this row) were not reviewed again.

Open: the two (b) classes above; the for-of rewrites pass R only syntactically (an array iterator carries state across
a yield, late-code noted it); late-code's `analyze.ts` hooked `owCheckIn` now also runs `owLateUses` (`.scratch/r1/late-smoke.ts`: the same
verdicts as `checkSources` on four programs; its tables were not rerun); the brief's ~13 list was late-code's R with primitive lets counted; under R as specified the rejected
shipped cells are the ones listed above.

## 2026-11-22 21:42–23:12: rule set R, round 2 (logs `lite/soundscript/.scratch/r2/`)
Two parts, from the coordinator: a browser verify failure that repeated, then the two classes round 1 left open.

### Part 1: "at boot 17 test cells are pending", the cause
The coordinator's two runs on the round 1 tree (`.scratch/mine9-verify.log`, `mine9-verify2.log`) failed 4 and 3 times,
always this line; `--quick` on that build failed it 3 of 3 (`r2/q1.log`..`q3.log`). The pending/none-ran half passes;
the failing clause is `clocks pulled 1`. With the check made to name the pulled cells:
```
FAIL original: at boot 17 test cells are pending and none ran ([]); listeners attached 4, clocks pulled 1 ["?:nums"]; ...
```
`nums` is the generator of `spec_stream` in spec.ojs, run by test_spec_S7_4 and S7_5 in a module of their own made by
`spec_editor`, not a main ("?"). The spec module is a main and shown in the boot layout, so its test cells run at load
(verify.ts already said so: "the specification's tests run their own modules from load (S7.4 streams for many
frames)"). The check read `ss.pulling()` with no argument, which counts every handle on the page; cells.ts says the
argument is for this ("other modules on the page, such as tests, pull generators of their own"). Whether a `nums` was
live at the read depends on how far the spec tests had got: a race, not a leak. Both the unscoped read and the comment
are in `efa987f1~1` (before R). Why it began to repeat with R is not measured.

Fix in verify.ts, structural: the check counts the handles of the mains' own modules (`ss.running(hs)`,
`ss.pulling(hs)`), and names what test-made modules pull. A second race in the same check, found when the first was
fixed (`r2/v1.log`, `core-only reopened`: `undefined listeners`): it read the `soundscript` value without waiting for
it; the wait now also waits for that value. A new report checks for a leak: once test_spec_S7_4 and S7_5 have a value
or an error, no test-made module pulls anything. In a full run on the round 1 build with the narrowed check (`r2/v1.log`, ended 22:11, run while the census loaded
the machine) the four passes that failed before hold with `nums` still pulled by a test module, where the old check
fails; the leak check was added after it and passed in the 22:30 run, whose log was later deleted with `r2/g/`:
```
pass original: at boot 17 test cells are pending and none ran ([]); the page's modules have 3 listeners attached and 0 clocks pulled (modules a test made pull ["nums"]); ...
pass after test_spec_S7_4 and S7_5 settle, the modules a test made pull nothing ([])
```

### Part 2: the two classes
(ii) Every nested function is visible: `owVisibleFn` is now "a generator, or not the cell's function"; whether a promise
is awaited is not followed. Only an async cell's own body may use a Mut across an await. Census (`r2/census3.ts`,
every cell of late-code's corpus and the build's sections, 45100, against the round 1 verdicts `r2/base-r1.json`): 0
shipped cells changed. It also rejects an awaited async helper that writes its own local across an await
(`r2/p2.txt`, last case); none ships.

(i) A type holds a Mut anywhere: new cell `owMutDeep` (ow-capture.ss.ts, 17 lines: record fields, elements, type
arguments, unions, aliases, a function type's result) and `owLocalHoldsMut` (3 lines: not a cell input, global,
prelude name or function declaration). For R-Y and R-A (`owLateCand`): 0 shipped cells changed.

For R-K it stops, as the brief says to when there is no reasonable rewrite. With the nested check in
`owCaptureErrs` (kept as `r2/ow-capture.with-rk-nested.ss.ts`) the census rejected 15 checker cells, all on one field,
the registry's per-check memo `IxRegCore.mayHideMemo: Mut<Map<Ty, boolean>>` (ix-types.ss.ts:81):
- 3 (`ixCheckFn`, `mdCell`, `mdCheckSources`) on a cell input (`ixKnot`, `mdContext`) whose function type returns a
  context holding the memo. Every curried cell captures its inputs; this was a missing scope filter, now
  `owLocalHoldsMut`, the same one R-Y and R-A use.
- 11 (`ixFalsy`, `ixNarrowTypeof`, `ixNarrowEq`, `ixNarrowIn`, `ixNarrowArray`, `ixNarrowByProp`, `ixHides`,
  `ixReportMissing`, `ixDiscriminant`, `ixNarrowCompare`, `ixCondLeaf`): a callback passed to a cell input (ixFilter,
  ixNarrow, ixHidden's find) that captures `R` or `K`. Rewritable by passing the context to the callback as an
  argument; four callee signatures and their callers. Not done, since the next one stops the part.
- `mdHookOf` (md-cell.ss.ts:13): returns a hook that `withHook` stores in the registry and calls later. It must
  reach `X`, which holds the memo and is written through it by `mdCompileType`. Bound under a type with no Mut, the
  memo cannot be written; given to the registry as data, the capture moves into a record, which R does not check.
  No reasonable rewrite: the example.
So R-K looks at a binding's own type, as in round 1, and the nested case is in the spec's "Not specified".

Spec: S5.6 says "a local whose type holds a Mut"; new S5.8 defines "holds a Mut" (3 reject rows, test_spec_S5_8);
S5.7 rewritten ("a generator, or any function made inside the cell's function, awaited or not"; one more reject row,
an awaited helper); the Not specified item on un-awaited helpers removed and the nested one narrowed to S4.10. Made
false by r2 and rewritten: S5.7's "An async cell, and an async function made in an async function that is none of
these, may use a Mut across an await"; Not specified "is not checked under S5.7" and "S4.10, S5.6 and S5.7 look at a
binding's own type"; the tutorial's two R rows; rules.ts summaries; checker-tests' mut_across_await comment; the
header comments of ow-late.ss.ts and h9-attacks.ts. Frozen mirror: own.ts `mutDeep`, `cand`, `visible`, the message;
`diff.ts` SAME 3635 DIFFERENT 0, and with the 70 h9 programs as `--file` sources SAME 3710 DIFFERENT 0
(`r2/diff-h9.log`).

h9: 24 more programs (h9-r2-*, h9-pr-r2-*), 70 in all: aliases, generics, tuples, a Map type argument (first written as `ReadonlyMap`, an `[unknown-type]`, so it tested nothing; changed to `Map` after the review and rerun, `r2/h9-*-2.txt`, the counts unchanged), unions, a
function result, inferred records, an `as` cast (`[no-cast]`), async callbacks (forEach, then, IIFE, Promise
constructor, record method, race, a nested async generator, a cell input), promise chains. (a) accepted 10, silent 0;
(b) silent 1; (c) silent 1 (`r2/h9-*.txt`, `m/sets-*.txt`).

Measurement, 22:14–22:17 (`r2/measure.sh`, `r2/m/`), modes as in round 1:
```
                               programs  accepted  silent (a)  (b)  (c)     round 1 (a/b/c), accepted
run-sets (13 sets, h9 included)    1945       294           0    4    4      0/19/27, 326 of 1921
freeze-attack2 run.ts               309         8           0    0    0      0/0/2,   11
freeze-attack3 run.ts               360        12           0    0    0      0/0/0,   15
attack1 (main tree)                 246         1           0    0    0      0/2/2,   3
```
Controls (`--off`): run-sets 52 / 390 / 825, attack1 0 / 170 / 187, as before.

Every program silent in (b), one mechanism, R-K on a Mut below a binding's own type: a kept function returns
`Mut<number[]>` taken from a captured local typed `Mut<number[]>[]` or `{ readonly t: Mut<number[]> }`, and a consumer
cell writes it: `freeze b1:reg-for-of`, `b2:fo-index`, `h6-array-container`, `h9-r2-kept-returns-field`. The same 4 in
(c). With R-K on nested Mut they would be rejected, which needs the mdHookOf decision above. Registration not deleted.

A first final gate run (22:17–22:47, `r2/g/`) passed every gate to tc.test; its full verify failed 1, `prose`: the
new Not specified item said "below the top level", which the spec's prose check rejects (reworded "that is not its own
type"). A second full run was stopped (`verify-2.log`, the same FAIL, then `stopped by an error: cdpSession` from the
stop).

Fresh review (`/review-notebook`, 22:51, FIX, 6 findings, all confirmed and taken): S5.8's example `ReadonlyMap` is an
unknown type (now `Map`, and h9-r2-map-arg with it); the tutorial row "a cell's inputs never hold a Mut" is false for
an input typed `() => Mut<number[]>`, which S4.4 does not look into (the row now says so, and the Not specified item
gives the example: a gap that predates R, not closed); this section had no gates; S4.10 said "annotated" where its
example `const c = n` is not (now "or a const of a primitive type"); S4.10's promise sentence overrides the exemption
without saying so ("Even so"); S5.8 stood before S5.7 (moved, with its test). Not acted on (outside the scope): the
tutorial's "frozen at run time unless the checker has proved nothing can write it afterwards" against S4.6.

Gates, final tree, 22:58 to 23:11 (`r2/gates.sh`, `r2/verify3.sh`; logs `r2/final/`, summary `r2/final-summary.txt`):
```
build.ts --force                exit 0
bun-verify                      175 pass, 0 fail
fixtures.ts                     14/14; 52 rules, 52 with a reject case
diff.ts                         SAME 3635 DIFFERENT 0 REAL CRASH 14
diff.ts --module-only           SAME 1051 DIFFERENT 0
tc-diff.ts                      corpus rows DIFFERENT 0; erase (repro) DIFFERENT (by design)
live.test.ts                    461 pass, 0 fail (1229 programs, silent 0)
freeze-table.test.ts            441 pass, 0 fail
browser/run.test.ts / acorn     2 pass / 6 pass, 0 fail (run apart)
run-sets                        1945 programs, silent 0  (--off: silent 52)
freeze-attack2 / 3 run-all.sh   silent 0 / silent 0
tc.test.ts                      11 pass, 0 fail
verify.ts --quick x3            227 pass, 0 fail; 227 / 0; 227 / 0 (23:05–23:06)
verify.ts (full, once)          664 pass, 0 fail
```
In these runs no test-made module was pulled at the boot read ("modules a test made pull []"), so they do not by
themselves show the race; `r2/v1.log` does.

Open: R-K on a nested Mut (the mdHookOf decision); the 11 class-A rewrites if R-K is extended; a cell input typed
with a Mut in a function result (S4.4); why the boot race began to repeat with round 1 (unmeasured).

## 2026-11-23 00:12–01:10: m1 step 1, `memo` in the prelude (build owner, logs `lite/soundscript/.scratch/m1/step1/`)

Owner's brief: a trusted prelude primitive `memo(f)`, its purity rule, the checker's own two memos replaced by it,
spec S2.13/S2.14. Times are CET. `Mut` stays; the nested-`Mut` ban is step 2 and is not in this tree.

Runtime (`prelude.runtime.ts`, 33 lines from `let memoDepth` to the end of `memo`): a trie per memoised function, a
`Map` for primitive keys and a `WeakMap` for object keys, the first level keyed by the argument count. A miss deep-freezes
the arguments in place, as an action's are, and the result; a list whose freeze made a copy (a typed array, a native
Map) is not stored, since the caller's object is not the frozen one.
A `Mut` argument (the brief's question): it is frozen in place, so the caller's later write throws a TypeError (S2.13,
S4.6's list now names memo). The checker does not reject the write; the fresh review found it
(`const m = [1]; sq(m); m.push(2)` is `f:ok` and throws). Tried instead, 2026-11-23: give f a frozen snapshot of any
argument not yet deep-frozen and not store the call. The caller's value stayed writable (`bun .scratch/m1/rt.ts`:
`{"after":2,"calls":2,"mFrozen":false}`), but the checker's own run went from 4373 ms to 27297 ms: its keys are AST
nodes and types made in the same call, never published, so every call copied and missed. Reverted. Open: a static
rule that a `Mut` passed to a known memoised local is not written after the call; through a function value it cannot
be seen. A throw stores nothing. `memoDepth` makes an action call, a state write or
`read()` throw while `f` runs: a function argument can hide an action the checker cannot see.
Deviation from the brief: keys use `Object.is`, not SameValueZero. Under SameValueZero `f(-0)` would give `f(0)`'s
stored result and `Object.is(1 / f(-0), ...)` would show whether the cache was warm. test_spec_S2_13 checks `sq(0)`
and `sq(-0)` are two misses. Copies of `memo` sit in `lite/stdlib/runtime.ts` (export), `lite/browser/run.ts`
(PRELUDE_VALUES) and `lite/browser/workers.ts` (an EXEC-string memo that stores only all-primitive lists, keyed by a
tagged JSON string, since a worker has no `deepFreeze`). Registration: `prelude.d.ts`, `lite/intrinsics.ts`
PRELUDE_DECLS and PRELUDE_FNS (which also feeds `[prelude-shadow]`/`[prelude-value]` and the frozen checker), S2.6.

Checker (rule `memo-pure`, `approx`, 53 rules now): `ixMemoCall` (ix-prelude) types `memo(arrow)` as the arrow,
`memo(non-literal)` is unsupported, async/generator is `[memo-pure]`. `ixVarDecl` pre-binds `const f = memo(arrow)`
through `ixVarFn`, the path an annotated arrow const already takes, so `fib` recursion needs no second primitive; the
cost is that a recursive memo needs annotated parameters and result, as a recursive arrow does. `mdMemoSig` rejects a
parameter that may hide a function (`K.reg.mayHide`), holds a `Mut`, or holds a state/promise/kind-0 type, and a result
that holds a `Mut`, state or a promise, or may hold an iterator by `owIter`, the [iterator-capture] test (added after the review: `memo((n: number) => [n].values())` was accepted and every call threw at publish). `mdMemoUses` reuses the action-body capture check: `owCapturesIn`
(the body of `owOpaqueCaptures`, split out to take any list of bodies) over the `mdTainted` map, plus capabilities
(`log` and `invalidation` included, which S6.9 exempts for actions) and inputs holding a state handle or an action.
A `let`/`Mut` capture is left to R-K (`[let-capture]`/`[mut-capture]`), which already fires because the prelude call
may keep the arrow. Reusing S6.9's check over-rejects: `(k: number) => memo((n) => k + n)` is `[memo-pure]` though
`k` is data (spec row S2.14 #12).

The checker's memos: `rgHasTypeQuery` is `memo((x) => ...)` over AST nodes; `IxRegCore.mayHideMemo: Mut<Map>` is now
`mayHide: (t) => boolean`, built in `rg-registry.ts` `core()` (and `frozen/ts/core.ts` `regCore`) as
`memo((t) => peek(() => L.rgMayHide(c, t)))`, the walk moved from ix-hides into the new cell `rgMayHide`. Deviation:
this memo is called from TS glue, not a checked cell, because the walk's inputs are the registry's functions, which
`[memo-pure]` forbids as captures. The `peek` wrapper is needed: without it the port and live differed on 6 cells
(`unknown type Event` in selfhost/rt/prelude.ss.ts; an order unsup in a probe).

Speed, `bun .scratch/m1/time-sections.ts` (warm-up, then checkSources over the 8 shipped modules' ss blocks and over
check-time.ts's with+ix+ow checker source), 3 runs each:
```
before                 shipped 43/42/41 ms   checker 4142/4250/4241 ms  median 4241
after the swap         shipped 43/46/40 ms   checker 4327/4429/4326 ms  median 4327
memo-pure rule added   shipped 39/43/43 ms   checker 4208/4373/4421 ms  median 4373
final tree (01:06)     shipped 43/46/51 ms   checker 4505/4497/4507 ms  median 4505
no memo at all         -                     checker 18169/18705/18419 ms             (memo returning f)
```
4241 -> 4505 ms, +6%, inside the 8% spread seen between two runs of one tree (4241 vs 4570); not separated from noise. The no-memo arm shows the two
caches are 4.3x of the checker's time; instrumented, `mayHide` was 887193 hits to 31250 misses on one run.

Frozen mirror, under `DELIBERATE CHANGE (2026-11-23, m1 step 1)`: `frozen/ts/core.ts` regCore/regAround,
`frozen/infer.ts` preludeCall `case "memo"` and varDecl pre-binding, `frozen/capture.ts` opaqueCaptures `bodies`,
`frozen/core.ts` `memoErrs`.

Spec: S2.6 lists `memo`; S2.13 (run-time behaviour, recursion, arity) and S2.14 (`[memo-pure]`), 14 reject rows,
test_spec_S2_13 (cell `s2_fib` in spec-2.ts; `soundscript.memo` hit, `-0`, frozen key, typed-array key not stored,
throw stores nothing, the action guard; a memoised function as another cell's input) and test_spec_S2_14 (accepts).
Tutorial: a `[memo-pure]` row and a recursion example under Local mutation.

Fresh review (`/review-notebook`, FIX, 8 findings, all confirmed): (1) a `Mut` passed to a memoised function and
written after throws, accepted by the checker: documented in S2.13 and S4.6, not closed (above); (2) an iterator
result was accepted: now `[memo-pure]`, with a row; (3) a const bound to a `Mut` local is rejected for a reason S2.14
did not state: S2.14 and the tutorial row now say it; (4) S2.6 named no statement for `[prelude-value]` and
`[prelude-shadow]` and listed `mut freeze borrow` without saying why: one sentence each, `read` and `on` named with
their own rules (S6.8, S7.3); (5) test_spec_S2_6 checked 4 of the prelude names: it now reads the list from S2.6 and
checks each of the 11 is refused as a value, plus a `structuredClone` `[type]` row; (6) the tutorial row left out
conditions: rewritten; (7) the unannotated recursion and `memo(g)` unsupported outcomes, a 2-argument `[arity]` row and
the state-write and `read` guards were untested: added; (8) S2.13 said only "typed array" for an uncached argument:
now "or a `Map` made by JavaScript".

Gates, final tree, 00:58 to 01:08 (`.scratch/m1/gates1.sh`; logs `.scratch/m1/step1/final/`):
```
build.ts --force                exit 0
bun-verify                      177 pass, 0 fail
fixtures.ts                     14/14; 53 rules, 53 with a reject case (51 in the spec)
diff.ts                         995 sources: SAME 3674 DIFFERENT 0 REAL CRASH 14
diff.ts --module-only           SAME 1085 DIFFERENT 0
tc-diff.ts                      corpus rows DIFFERENT 0; erase (repro) DIFFERENT (by design)
live.test.ts                    461 pass, 0 fail
freeze-table.test.ts            441 pass, 0 fail
tc.test.ts / run.test / acorn   11 / 2 / 6 pass, 0 fail (run apart)
run-sets                        1945 programs, silent 0
freeze-attack2 / 3 run-all.sh   309, silent 0 / 360, silent 0
verify.ts --quick               229 pass, 0 fail (S2_6, S2_13, S2_14 pass)
verify.ts (full)                668 pass, 0 fail
```
The full verify ran twice: at 00:45 on the tree before the review (668 pass), and in the gate run on the final tree.

Open: the `Mut`-argument write (1); `(k: number) => memo((n) => k + n)` is rejected though `k` is data; `holdsWith`
stops at depth 12; a kind-0 value from another language is stored unfrozen; `log` called through a function value
is not caught, by the checker or by the run-time guard (log is not an action); cp-probes' prelude name list was not updated.

## 2026-11-23 01:10–02:10: m1 step 2, no nested `Mut`, annotated fresh locals writable, R-M (build owner, logs `lite/soundscript/.scratch/m1/step2/`)

Owner's brief: `Mut` only as a whole parameter or local type (or an alias whose body is `Mut`); a plain-annotated
local bound to a fresh value is writable; simplify `owMutDeep`; spec S4.x/S5.8; the three-mode table; 30+ attacks.
Coordinator's additions: R-M (a `Mut` local passed to a locally known memoised function is not written after the
call) and `memo` in the cp-probes name list. Times are CET.

The ban, rule `mut-nested` (exact, 54 rules now), a syntax pass shared by live and frozen: `lite/acorn/syntax.ss.ts`
`mutNames` (14 lines: `Mut` plus every alias whose body is a reference to one, to a fixpoint), `wholeBindingType` (5),
`mutPlaces` (12); `syntaxCheck` returns `mut`. Live routes each error to its cell in `md-shape.ss.ts` `mdByCell` (9,
new) from `mdModuleLevel` (9); frozen `core.ts` routes `S.mut` with `cellOf`. Allowed: the whole type of a parameter
(rest, default and destructured patterns included), of a function type's parameter, of a local, or the body of an
alias. A `typeof` type elsewhere is also `[mut-nested]` (syntactic; it over-rejects `{ t: typeof k }` for a number
`k`). Written annotations only: inference still makes nested `Mut` (`{ t: xs }`, `[xs, 1] as const`, `k ? xs : null`,
`Promise.resolve(xs)`, a generic alias instantiated at a `Mut`), so S4.4/S5.6–S5.8 still see it.
Scans before building (`.scratch/m1/nested-scan.ts`, `typeof-scan.ts`, AST): the shipped TS sources have 0 nested
`Mut` and 0 `typeof` types. Not expressible any more: a nullable `Mut` (`Mut<T> | null` is `[mut-nested]`,
`Mut<T | null>` was and is unsupported: `unsupported intrinsic member Mut.push`).

Writable annotated locals (`ixVarDecl` 24 lines, `ixAssign` 19, frozen `varDecl`/`assign`). First built as "not
`Mut`, not readonly" with a syntactic readonly test; the fresh review found `const c: ReadonlyArray<number> = [1];
c.push(1)` accepted with no rule (Ty has no readonly flag; the old protection was only "annotated means not `Mut`").
An alias to `readonly number[]` and `Readonly<…>` had the same hole, and a union annotation made every read
unsupported (`const xs: number[] | null = [1]; xs?.length` gave `unsupported intrinsic member Mut.length`, caught by a
probe). Rebuilt as an allowlist, `ixWritableAnn` (7 lines): an array or tuple type, a type literal with no readonly
member, or `Array`/`Map`/`Set`/`WeakMap`/`WeakSet`/`Record`/a typed array. Any other annotation keeps the old
behaviour (not writable), so no other case is loosened. A fresh value assigned to such a `let` keeps it writable;
gated on `mutOwned`, so `let xs: number[] = b; xs = []; xs.push(1)` stays rejected (approximation).
Cells rewritten because they flipped to `[mut-capture]` (a kept function captured an annotated fresh `Map`):
`ix-core.ss.ts` `ixAdmits` (11) and `lite/render.ss.ts` `eventOf` (6), both to bind the fresh `Map` unannotated and
capture a plain-typed const of it. `statuses.ts` over every shipped module and the checker's own cells: no other
status changed (`step2/status-s1.txt` vs `status-now.txt` differ only in the 3 new cells). Tests rewritten the same
way: checker-tests iterator rows (2), spec S3.19, S4.10, S4.6_reach.

R-M (`ow-late.ss.ts` `owMemoFns` 9, `owMemoArgs` 20; `owCheckIn` 11; frozen `own.ts`): only the existing `owAfter`
and `owUsesOf`, so position after the call in the same function, a later turn of a loop around it, and a call of a
helper that writes the local. Reported as `[mutating-method]`/`[member-write]`. A name inside `snapshot(…)` in the
argument is exempt; the first build flagged `sq(snapshot(m))`, the fix its own message suggests (attack m1-rm-snapshot).
`[...m]` in the argument still counts (over-rejects; an element of `m` may be a `Mut` the freeze reaches). Not seen,
as stated in S2.13: a second name (`const n = m; sq(m); n.push(2)`), a field of a record passed (`get({ t })` then
`t.push`), a memoised function that arrives as a cell input. Each throws at run time in modes (a) and (b) and is silent
in mode (c).

`owMutDeep` (17 lines): nothing removed. Each branch has a witness under the ban, by mutation (branch replaced by
`return null`, `step2/mutate.py`, probes `step2/q20.ts`, `q21.ts`, `run-sets`):
```
fn result         -> freeze b7:fo-gen-helper-after-yield loses its second [mut-yield] (h = () => xs)
non-alias args    -> B-promise (const p = Promise.resolve(xs)) loses [mut-await]
alias expand      -> C-box (b = box(xs), box: <T>(v: T) => Box<T>) becomes ACCEPT
kids (rec/tuple)  -> tuple ([xs, 1] as const, t[0].push after a yield) becomes ACCEPT
```
B and C changed nothing in diff.ts (3718 cells) or run-sets (1990 programs); only the probes show them. The depth cap
and the cycle memo end the walk over a recursive alias and were not mutated.

cp-probes: `lite/infer/cp-probes.ts` name-prelude list has `memo` (11 names, `i % 11`).

Spec: S4.1 (the allowlist, unions, aliases), S4.7's last sentence replaced, S4.9 rewritten (the ban, `typeof`),
S4.10 (`new Map()` under an annotation is now writable and `[mut-capture]`), S5.8 (written types cannot nest,
inference can), S2.13 (R-M and its limits), the Not-specified S4.10 bullet re-expressed with an inferred tuple. Rows added:
11 `mut-nested`, 4 R-M, 5 S4.1, 1 S4.10; S2.14/S3.19/S4.4/S5.8 rows rewritten, one S4.4 row dropped, and five accept
rows that held a nested annotation dropped (42 -> 37 accept rows). `.scratch/m1/rows.ts`: 414 rows, 0 not exactly
their rule; 37 accept rows, 0 not accepted. Tutorial: Local mutation text and a `[mut-nested]` row.
Sentences made false by this step: S4.9 "`Mut<T>` may be written in any type inside a cell"; S4.7 "A local annotated
with a nested type … is writable at each level"; S4.1 "A local annotated with a type that is not `Mut<…>` is not
writable"; S4.10's example `const m: Map<string, number> = new Map(…)` as capturable; the Not-specified bullet's
`const r: { readonly t: Mut<number[]> }`; the tutorial's "except in a function type's result".

Fresh review (`/review-notebook`, BLOCK, 3 findings + 2 minor, all confirmed and fixed): (1) the R-M sentences had
landed in S2.12 (both S2.12 and S2.13 end in the same `[arity]` sentence): moved; (2) the Not-specified bullet lost
the accepted write that throws: restored; (3) `ReadonlyArray<T>` push accepted, tutorial silent on unions: the
allowlist above, two S4.1 rows, tutorial rewritten; minor: S5.8 dates reordered, one row's indent.

Attacks, `lite/infer/attack/m1-attacks.ts` (45 programs + 3 controls; run-sets set `m1`, live.test asserts the set and
`m1-controls: 3, fired 3`). A `memo: true` program is also run with every `memo(f)` replaced by `(f)` (`memoStrip`, on
the TypeScript AST) and its cells read; a difference with neither run in error counts as silent. Result, mode (a):
accepted 17, silent 0, a cell in error 3 (m1-rm-alias, -nested-field, -input: the run-time throw). Controls run
without the checker: `m1-ctl-memo-let` gives `[2,2]` against stripped `[2,3]`; all 3 fire.

Measurement (`step2/measure.sh`, outputs `step2/m/`, 2026-11-23 01:55):
```
                                   programs  accepted  silent (a)  (b)  (c)
run-sets (15 sets, h9 and m1)          1990       326           0    0    3   m1-rm-alias, -nested-field, -input
  of which h9                            70         6           0    0    0
freeze-attack2 run.ts                   309         8           0    0    0
freeze-attack3 run.ts                   360        12           0    0    0   controls fired 3 / 4 / 4 of 4
convert-freeze/attack1 (main tree)      246         1           0    0    0
freeze-attack4 (via fa3 run.ts)         223        81           5    5    5   cap-now, cap-random, cap-now-gen,
                                                                               cap-now-in-record, cap-random-stored
```
freeze-attack4's 5 are a kept function reading a capability; nothing is written (its RESULTS.md, "Detector-counted:
5"). It was run from its folder through `../freeze-attack3/run.ts` with output written to `step2/m/`; the folder was
not edited. Against r2 (2026-11-22, a different tree and set list): (b) 19 -> 0 and (c) 27 -> 3 in run-sets; the 10
nested-`Mut` programs of (b) are now `[mut-nested]` (h9-nm-*) or rejected for an inferred nesting.

Speed (`time-sections.ts`, final tree, 3 runs): checker 4641/4613/4482 ms, median 4613 (step 1 final 4505, +2.4%).

Gates, final tree, 01:55 to 02:06 (`.scratch/m1/gates2.sh`, logs `step2/final/`):
```
build.ts --force                exit 0
bun-verify                      177 pass, 0 fail
fixtures.ts                     14/14; 54 rules, 54 with a reject case (52 in the spec)
diff.ts                         1030 sources: SAME 3722 DIFFERENT 0 REAL CRASH 14
diff.ts --module-only           SAME 1120 DIFFERENT 0
tc-diff.ts                      corpus DIFFERENT 0; erase (repro) DIFFERENT 1 (by design)
live.test.ts                    461 pass, 0 fail
freeze-table.test.ts            441 pass, 0 fail
tc.test / run.test / acorn      11 / 2 / 6 pass, 0 fail (run apart)
run-sets                        1990 programs, silent 0
freeze-attack2 / 3 run-all.sh   309, silent 0 / 360, silent 0
verify.ts (full)                exit 0; functional 668 pass, 0 fail (one navigation retry)
```

Open: the step-1 items stand: `(k: number) => memo((n) => k + n)` is `[memo-pure]`; `holdsWith`'s depth cap of 12; a
kind-0 value from another language is stored unfrozen; `log` through a function value is not caught. New: R-M's
three blind spots above (run-time guard only); no nullable `Mut` annotation; `typeof` over-rejection; annotated `let`
reassignment from a non-fresh value; a type literal with one readonly member makes every field unwritable;
`Promise.resolve(xs)` gives `[type] Mut<number[]> is not assignable to Mut<number[]> | Promise<Mut<number[]>>`
(found by a probe, not investigated).
