# Self-hosting lite/types.ts in SoundScript (2026-11-18)

SoundScript is a checked subset of TypeScript for the Observable runtime: a cell is a function, its
parameters are the cells it reads, and values are immutable unless marked. The language is specified in
`lite/soundscript/spec.ojs` and introduced in `lite/soundscript/tutorial.ojs` and `README.md`. Its checker,
compiler and runtime are TypeScript under `lite/`, and ship in one notebook,
`lopebooks/notebooks/soundscript.html`, built by `bun lite/soundscript/build.ts --force`.

This directory records one experiment: rewriting a part of that checker in SoundScript, so that the
checker checks its own source. It lists what had to change in the code to pass, and the checker and
compiler defects the rewrite found. Two of those defects were fixed afterwards (2026-11-18): the lost
second name of `const a = …, b = …;` (bug 3) and an optional parameter passed on to an optional
parameter (bug 1). The table below describes the port as written before those fixes.

Question: is SoundScript usable on the checker's own code? Target: `lite/types.ts` (type representation,
union, substitution, widening, display). Result: all 31 value declarations and 8 type declarations are
SoundScript cells in `lite/types.ss.ts`. The 31 value cells are ok by the checker as it stood in this
checkout (no checker file was edited; strict index, tsx and non-tsx); `check.ts` lists no type cells, and in
the page a type cell is stored with no problems (finding 4).
The TypeScript checker uses them under bun through a 17-line `lite/types.ts` and a 36-line `lite/link.ts`.
In the notebook they are 39 compiled cells (`ss` language tag) of `@tomlarkworthy/soundscript-checker`,
which the generated JS cells take as inputs.

## Files

| file | what |
|---|---|
| `lite/types.ss.ts` | the section, SoundScript cells (source of truth) |
| `lite/types.ts` | bun bootstrap: links the cells, re-exports types, gives `isNamed` its TS predicate |
| `lite/link.ts` | the linker: each exported cell called once with the cells its parameters name |
| `selfhost/types.orig.ts` | copy of `lite/types.ts` before the port |
| `selfhost/v0.ss.ts`, `out/v0.check.txt` | the first draft: only the cell form applied, and what the checker said |
| `selfhost/probe1.ss.ts` | constructs tried before choosing a rewrite |
| `selfhost/check.ts` | the real checker on a file (`splitCells` + `checkCells`), `--tsx` as build.ts checks |
| `selfhost/diff.ts` | differential test, original vs port, 3000 seeded random types per function |
| `selfhost/bench.ts`, `selfhost/micro.ts` | `checkSources` timing; per-function timing |
| `selfhost/repro-*.ts`, `selfhost/probe-*.ts` | minimal reproductions and headless page probes (below) |
| `selfhost/out/` | saved outputs of the above and of the gates |

`check.ts` reports line numbers of the joined module source (`checkCells` joins cells with a blank line), so
they run ahead of the file's lines by one per preceding cell.

## Bootstrapping

- **bun.** `types.ss.ts` is valid TypeScript, so bun imports it. `link.ts` reads each exported cell's
  parameter names from the acorn parse of `String(cell)` and calls the cells in dependency order. A cell
  body may use the prelude (`mut`, `freeze`, ...) as a free name, which bun has not got; the checker allows a
  cell no other free name besides intrinsics, so `link` re-evaluates each cell's text with
  `new Function(...prelude names, "return (" + text + ")")`, the scope a compiled cell gets from `ss`.
  No global is installed. `types.ts` exports the linked values under the old names, so no consumer import
  changed.
- **isNamed.** SoundScript has no type predicates (below), so the cell returns `boolean`; `types.ts`
  re-types it `(t, n) => t is Named` with a cast. 1 line of unchecked trust.
- **tpNames.** The original took `tp: any`; the cell takes a structural type. TypeScript callers pass the
  parser's `Node`, whose fields are an index signature, which no structural type accepts, so `types.ts`
  re-types it `(tp: Node | undefined) => string[]` with `as unknown as`. 1 line of unchecked trust.
- **tsc.** Not part of any gate. `tsc --strict` over `lite/core.ts`: before the port 1 error
  (`infer.ts` `collapseArrays`), after it the same 1 outside `types.ss.ts`, and 20 inside it: an injected
  parameter (`(show, ERR, …) =>`) is implicit `any` to TypeScript, and `mut`, `freeze`, `Mut` are
  undeclared, and one callback parameter is typed through an `any` input (`out/tsc-after.txt`). The consumers' types are kept because every returned function annotates
  its own parameters and result.
- **instantiate.** A cell cannot hold a module-level `let`. The counter moved to its caller: `infer.ts` +3
  lines (`let fresh = 0`, pass it, advance by `tps.length`). Names are identical to before (`T'1`, `T'2`, ...),
  page-wide as before.
- **build.** `ts-cells.ts` +~45 lines: `SS_SOURCES`/`SS_FILES` (a SoundScript section) and `BOOTSTRAP`
  (`types.ts`, `link.ts`: reached by bun, give no cells). A section's cells are checked with `checkSources`;
  the build fails unless every cell is accepted (a rejected cell would compile to a stub that throws).
  Each cell is emitted as `compileCellText` output, asserted equal to `compileCell` through the standard
  compiler, kept whole (type cells too, which no JS cell takes, so the notebook can check the section), and
  the checker module imports `ss` from the runtime module.
- **tests.** `ojs-roundtrip.test.ts` +~15 lines: a generated module's `ss` cell is round-tripped with its
  source checked (it was `source: null` for generated cells), the decompiled sources must equal the cells of
  `types.ss.ts` in order, and the checker module's compiled cells are in the `ss-members` check.
  `verify.ts` +1 check: in the page, `ss_check` of the checker module says each of the
  31 value cells is ok, and each of the 39 cells, decompiled by the editor and checked as an edit of itself,
  has no problems. `probe-page.ts`: an edit of `union` that pushes onto its parameter is rejected
  `[mutating-method]` in the page.

## Per declaration

Lines per declaration are counted from the parse (`P.line(end) - P.line(start) + 1`). Every declaration also took the cell form: a constant is `() => value`, a function `(deps) => (args) => …`,
recursion goes through a local function declaration. Tags count changes beyond that.

| declaration | orig lines | ported lines | tag | forced change (checker rule) |
|---|---|---|---|---|
| Flags, Param, Prop, Subst | 1 each | 1 each | none | |
| Fn, Rec | 1, 1 | 1, 1 | TYPE | `rest?: Ty` → `rest?: Ty \| undefined` (and Rec `index`, `calls`, `ctors`): `subst` writes `rest: t.rest && …`, `[possibly-undefined] undefined \| Ty is not assignable to Ty`. Keeps the runtime shape; a conditional spread would drop the key |
| Ty | 11 | 11 | TYPE (not forced) | `Named` extracted so `types.ts` can name the predicate |
| NUM … SYMBOL, TRUE, FALSE (13) | 4 statements | 13 | REWRITE-local | one declarator per statement: the compiler loses all but the first (bug 3) |
| BOOL | 1 | 1 | none | takes TRUE, FALSE |
| lit, arr, named, rec, WRAPPERS, propT, members, widen, isPrimitive | 1–5 | 1–8 | none | widen 5 → 8: the recursive function is local and returned |
| isNamed | 1 | 1 | TYPE | `t is {…}` → `boolean`: `[unsupported] TypePredicate type`. In v0 it also gave 18 `[no-member]` lines in unwrap |
| unwrap | 1 | 1 | REWRITE-local | condition inlined (no predicate); `t.args[0]` → `t.args[0] ?? t` (strict index); behaviour change, original bug 1 |
| tpNames | 1 | 2 | TYPE + REWRITE-local | `tp: any` → structural type (`[no-any]`); `x.name?.name ?? x.name` → `typeof x.name === "string" ? …` |
| union | 21 | 21 | REWRITE-local | recursive push helper `add` (`[unsupported] recursive function without a return type`, `[mutating-method]`) → recursive `flatten` + `flatMap`; `seen.add`, `out.push` → `mut` locals and `freeze`; `out[0]` → `first === undefined` test (strict index; a false positive, guarded by length) |
| show | 28 | 30 | REWRITE-local | `switch` → `if` chain (`[unsupported] switch`); `depth = 0` on the recursive function → inner `depth: number` plus a wrapper with the default (`[untyped-parameter]`); `ps.push`, `rest.push` → spreads |
| subst | 20 | 22 | REWRITE-local | `switch` → `if`; `subst(c, m) as Fn` (`[no-cast]`) → local `substFn(f): Fn`; `props.set` → `mut` Map + `freeze` |
| hasTv | 12 | 13 | REWRITE-local | `switch` → `if`; inner `names: Set<string> \| undefined` + wrapper with `names?` (checker bug 1) |
| fresh, instantiate | 1 + 6 | 9 | RESTRUCTURE | module-level `let fresh` (no home: a cell is a function) → parameter, caller counts (infer.ts +3); `++fresh` in a `map` callback (`[let-capture]` once a parameter) → index arithmetic; both casts (`[no-cast]`) → names computed first, and `if (g.k !== "fn") throw`; `tvs[i] ?? n` (strict index) |

Totals: 39 cells (31 value, 8 type) from 31 value + 7 type declarations and one `let`. TYPE 4 (Fn, Rec,
Ty, isNamed), REWRITE-local 7 (the 13 constants counted once, unwrap, tpNames, union, show, subst, hasTv),
RESTRUCTURE 1 (instantiate), unchanged beyond the cell form 15. Lines 146 → 172: constants +9, header +2, widen +3
(the cell form: the recursive function is local and returned), show +2, subst +2, instantiate +2, hasTv +1,
tpNames +1, `Named` +1, new comments +3.

## Differential test (`out/diff.txt`)

3000 seeded random types per function, except tpNames, rec and the constants (1 fixed case each) (depth ≤ 4: every kind, unions not normalised, records with index
and call signatures, generic fns with rest), absent keys distinguished from undefined ones. 0 differences
except the known one: `unwrap` on a `named Mut`/`Borrowed` with no arguments (34 inputs).

## Bugs and dubious behaviour in the original types.ts

1. `unwrap(named("Mut"))` returns `undefined` typed `Ty` (`t.args[0]` on an empty list). Exposed by strict
   index. Latent: the registry rejects `Mut`/`Borrowed` without a type argument before unwrap sees one
   (`repro-unwrap.ts`, same messages on the original and the port). The port returns `t`.
2. `tpNames(tp: any)`: an AST node typed `any`; the port's structural type is the first statement of what
   it reads.
3. Found while reading, not by the checker: `hasTv` does not look into `Rec.calls`/`ctors`, while `subst`
   rewrites them; `show` omits `ctors`. Unchanged in the port.

## Checker and toolchain findings

Bugs (rejects or loses what the spec allows):

1. An optional parameter passed on to an optional parameter: `function f(n?: number)…; const g = (n?: number)
   => f(n)` gives `[possibly-undefined] number | undefined is not assignable to number`. TypeScript accepts
   it, also under `exactOptionalPropertyTypes`. `repro-optional.ss.ts` (`optParam`).
2. Dubious, unspecified: an optional property rejects `undefined` (`{ a?: number } = { a: undefined }`,
   and `{ a: x }` with `x: number | undefined`). That is `exactOptionalPropertyTypes`, which the
   specification does not state. Same file, `optProp`.
3. S1.8 says `const a = () => 1, b = (a: number) => a + 1;` is two cells, and the checker accepts both;
   `compileCell` on that statement gives one variable, `a`, a rejected stub (`ss.rejected`) holding the whole
   statement, and none for `b`. `repro-multi-declarator.ts`. The spec's S1.8 test checks only the checker.
4. Dubious, editor: `ss_language.check` of a type cell edited to its own text gives `state: "rejected"`
   with no problems and `store: true`, in the specification module as in the checker module
   (`probe-page.ts`, `out/probe-page.txt`).

Unsupported constructs met (status `unsupported`, not in the specification's lists): `switch` (3 cells),
type predicates, `new Array<T>()`, object spread of a union-typed value.

Confusing messages:
- `new Array<T>()` under `mut`: three lines (`[mut-not-fresh]`, `[unsupported] new Array`, `[unsupported]
  intrinsic member Mut.push`) for one unsupported constructor.
- `{ ...g }` with `g` of a union type: `[type] {  } is not assignable to T` beside the unsupported line.
- Unsupported `switch` also gives `[type] function lacks an ending return statement` on the same function.
- One unsupported predicate (isNamed) gave 18 `[no-member]` lines in unwrap, one per union member.
- After `as Fn` is rejected, `[type] { decl: Fn } is not assignable to Fn` (the spread of the cast value
  is dropped) follows on the next line.

Not bugs, friction: `depth = 0` on a local function needs `depth: number = 0` (S2.9 says an unannotated
parameter is rejected; a default is not an annotation). Strict index false positives: 3 (`out[0]` after a
length test, `t.args[0]`, `tvs[i]` in a map over the same list).

## Performance (`out/bench-ab.txt`, `out/micro.txt`)

`checkSources`, median of 201 runs after 20 warm-ups, four interleaved process pairs, original
(`../.selfhost-lite-orig`, a scratch copy of `lite/` with `types.orig.ts` and the original infer.ts call, removed after; `bench.ts --lite <dir>`) vs port:

| input | original | port |
|---|---|---|
| tutorial module, 42 cells | 1.55–1.59 ms | 1.55–1.58 ms |
| spec*.ts, 10 checks | 3.05–3.14 ms | 2.96–3.24 ms |

No difference at this level. Per function, 20000 calls, median of 15: union 20.4/21.0 → 24.0/25.0 ms,
show 5.8/6.2 → 7.2/7.8 ms, subst 4.7/4.6 → 4.6/4.8 ms, widen 41.1/43.7 → 50.3/53.0 ms (flatMap and
spreads instead of push; the wrapper call in show).

## Gates (2026-11-18, after `bun lite/soundscript/build.ts --force`)

runtime 78 pass; fixtures 14/14; complete 58; roundtrip-edge 113/113; raw-cells 18; ss-toolchain 37 files;
comment-types 37/37; ts-cells 6 pass; ojs-roundtrip all pass (generated-ss: 39 cells, 0 failures);
verify: **not green.** Against a scratch build with the original types.ts (`out/verify-orig.txt`, one run):
580 pass, 1 fail, the new check (that build has no SoundScript section). Against the port, three runs:

| run | pass | fail | what failed |
|---|---|---|---|
| `out/verify.txt` (gates running beside it) | 493 | 5 | `test_spec_S6_17` "gave 110, expected 10" in the original and the reopened page, then the run stopped |
| `out/verify-2.txt` (probes running beside it) | 497 | 1 | the run stopped |
| `out/verify-3.txt` (alone, on battery) | 579 | 2 | `test_spec_S6_17` "gave 110, expected 10" in the reopened export (test and module summary) |

The stop is `TypeError: Cannot read properties of undefined (reading '_value')` in `neverRuns` for
"broken state: exporter-3 export reopened" (verify.ts:1072). It did not recur in the quiet run; replaying
`open()`'s wait and `neverRuns`' lookups alone on the port's exported page finds every `soundscript`
variable with a value (`probe-neverruns.ts`). S6_17 (an action call paused at an `await` across an edit of
its cell) failed in 2 of 3 port runs and in 0 of 1 original runs. Cause not found; whether the port changes
the timing S6_17 depends on, or the test is flaky, is not settled by 4 runs. The new check passed in all
three port runs.
