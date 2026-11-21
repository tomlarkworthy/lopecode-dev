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
