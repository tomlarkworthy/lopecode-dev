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
