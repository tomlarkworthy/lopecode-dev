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
