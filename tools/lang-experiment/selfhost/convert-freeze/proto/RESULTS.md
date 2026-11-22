# Freeze at the conversion: prototype results (2026-11-22, 16:36–18:20 CET)

The copy is `tree/` (`git archive ab2d0911`). The untracked holes5 sets and the paper probes are snapshotted in `snap/`. Every number below comes from `./run-all.sh` (M1, ~15 s) or `./run-all.sh --m2` (adds M2 and M3, several minutes). Switches are env vars, read in `tree/lite/proto-flags.ts`.

## K4: feasible
- Core table: about 45 added lines (hooks in `subtype.ss.ts`, `ix-expr.ss.ts` `ixExpect` and `ixCheck1`, `ow-capture.ss.ts`, `ow-entry.ss.ts`, plus `proto-flags.ts`). The compile step is `convert.ts`, 50 lines, which finds nodes by span on the TypeScript AST.
- Every site was located.
- Three kinds of site have no assignability check, and each had to be rebuilt from the type table: the cell value (`owStripMut`), `throw`, and `unknown` (`sub` returns true before it reaches the `Mut` unwrap).
- Generics: the checker instantiated `T := Mut<X>`. R2's "never `Mut`" is a strip in `unify`; it rejects no shipped cell.

## M1 (programs / accepted / silent)
run-sets has 1,439 programs; fa3 has 360.

| mode | run-sets | fa3 |
|---|---|---|
| main design | 538 acc, 0 silent | 149 acc, 88 silent |
| control: all freezing off | 638, **312** | 167, **138** (controls 4/4 fired) |
| R1–R7 only | 638, **28** | 167, **24** |
| + H, V, R3X, U, F, T, N (no B) | 556, 0 | 158, 0 |
| + B as well | 556, 0 | 158, 0 |

Causes of the R1–R7 silent programs, and the rule that removes each:
- **H** (hoisted kept declaration): 19, the tdz-*/fn-decl-hoist family.
- **V** (`buffer`, `subarray`): 27, of which 24 are fa3 b9.
- **R3X** (convert a captured local whose type holds `Mut`, e.g. `reg: Mut<number[]>[]`): 3. F also removes these.
- **F**: `pr-cap-arr` (`Promise<Mut>`).
- **T** (new): `tdz-exit-only`. It needs a static rule that a hoisted kept function is not referenced before a local it captures is declared.
- **U** alone changed no attack program.

**C** is not implemented. My probe `attacks/extra.ts c-opt-fn`, which passes an optional 3rd callback argument, is silent in every mode.

## M2 (K3)
**Static.** These are the shipped sections (858 cells).
- F, V, T, N and the type-parameter strip together newly reject 1 cell: `ixNarrowIn` [type], from F under a callback result. U and B are not static rules.
- My first version of F banned `Mut` anywhere under a function type at a cell value. That rejected 306 cells and was wrong, so F at a cell value was narrowed to `Promise`, `Iterable` and `Generator`.

**Sites.**
- 251 sites, 247 of them R2, 3 R3 and 1 U. Per cell: 0:719, 1:81, 2:29, 3:18, 4:5, 5:2, 6:3, 10:1.
- 240 are trivially removable (59 are fresh literals); 11 are written after the site (a name-based count).

**Run time.** The shipped cells were rewritten with `ss_f` (`treeconv/`) and the converted checker was run with the boundary freeze off.
- Without N, every one of the 1,439 checks crashed: `ss_f: cannot freeze a Iterator`. With V, `m.keys()` is a `Mut` iterator passed to `new Set(...)`.
- Without N and with iterators allowed, 225 crashed: `set on a frozen Map`, frozen at `ix-apply.ss.ts:40`. There `new Map(m)` converts the caller's `Mut` parameter `m`, which is written later.
- **N** (new): an argument to an intrinsic parameter that is not `@retains`, whose `Mut` is top-level only, is not a conversion. With N there are 0 crashes. The 1,439 verdicts and the self-check of the shipped sections are identical to the main design's.

**Examples and spec/tutorial (18 files, 135 cells).** Cells in error: 14 in the main design, 18 with the rules, 23 with B added. Every added error is `ss_f: cannot freeze a typed array`: histogram, rows, image, s4_blur, plus s4_signal and s5_* with B.
- R4 holds as the paper said, but the error comes at run time, not statically.
- The rewrite `return bins.slice()` has no static site, yet B still throws on it. B needs the copy path the hypothesis wanted to delete. No attack needed B once the other rules were on.

## M3 (K6)
**Checker.** Boot plus the self-check of the shipped sections, best of 3: 13.48 s in the main design against 16.10 s converted (+19%). There are about 1.7M `ss_f` calls per pass.

**100k records.** `deepFreeze` 71–101 ms, `ss_f` 53–65 ms, bare `Object.freeze` 31–37 ms. The figures shift between runs; the b7 figure was 48.95 ms.
- `ss_f` first used `Object.isFrozen`, which is O(n) on a big array in JSC: 13 ms per already-frozen 100k array. A WeakSet fixed it.

## M4 (estimate)
**Deletable:** about 498 lines.
- `fnreg.ts`: 137
- `tc-reg.ss.ts`: 190
- `freeze.ts` registration and the walk/path-copy/promise code: ~137
- the late-write rules in `ow-capture`: ~34

**Added:** about 200 lines (ss_f/ssOut, the site table, the rules, the compile step). C and V on constructors are not counted.
- If B is kept for typed arrays, the copy code stays.

## Unverified or skipped
- Not done: bun-verify (it needs a notebook build), the browser, workers and pool (islands ran only on the main thread), C, V on constructors, `yield*`, spread call arguments, and nested generator yields.
- `paper.ts` has no detector for I. Its "ran" count is not a violation count; the paper probes were judged only through the attack sets.
- Most of each R1–R7-only silent program was read; the cause groups come from which switch removes them.

One accident in the main tree: at 16:5x I created `lite/zz-resolve-probe.ts` there and deleted it within a minute.
