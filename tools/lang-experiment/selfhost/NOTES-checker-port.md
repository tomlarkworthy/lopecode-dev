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
