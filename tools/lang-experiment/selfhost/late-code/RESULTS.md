# Late code: what excluding K, Y and A uses costs

Measured Sun 22 Nov 2026 18:59 CET. Rerun from `tools/lang-experiment`: `sh selfhost/late-code/run-all.sh` (about 30 s).
The full tables are in `out/tables.md` (per bucket) and `out/tables-module.md`. Every cell's record is in `out/corpus.json`
and `out/corpus-module.json`.

## Method

- **Checker.** `lite/core.ts` `runCheck`, run on a `linkMd` copy whose `owCheckIn` first hands the cell's `(R, F, T)` to a hook.
  Everything else is the shipped cells. `run.ts` checks every cell against plain `checkSources`: 0 verdict mismatches,
  where a verdict is a cell's status plus its rule set.
- **Classification.** The checker's own cells, not new code:
  - "Mut-typed" is `isNamed(b.t, "Mut")` on the binding table.
  - "kept" is `owKept`.
  - Captures are `owCaptures`' `read` set, followed to its fixpoint through helpers.
  - Writes are `owWriteRef` and `owAssignedRef`.
  - "Written later by the encloser" is `owLateWrite`.
  - Primitive is `isPrimitive`.
  - Function parts are `ixFnParts`.
- **Corpus.** `corpus.ts` copies diff.ts `jobs()`, because that function is not exported and diff.ts runs its passes on import. It gives 941 sources and 3629 cell records. 3615 of them reach the ownership pass, which is diff.ts's 3615. The other 14 are the cells of `probes/mapnoargs.ss.ts` (ss and ssx), all `unsupported`.
  - One source does not parse (`selfhost/repro-unknown-class.ss.ts`, tsx=false).
  - `jobs()` does not take `lite/infer/*.ss.ts`. The checker's ix, ow and md cells appear only in the supplement below, and its rg and cp cells appear in neither.
  - "dedup" counts a cell once per file:line and name, because `ss:`, `ssx:` and `sswith:` check the same text.
- **Buckets.**
  - checker/toolchain: `ss`, `ssx` and `sswith` of lite, acorn, selfhost and selfhost/rt.
  - ports: ports/, port-editor5/, horde/, lite/browser.
  - tutorial/spec/examples: `file:` and `inline:` jobs.
  - fixtures.
  - Two more buckets are kept apart: probes (`.scratch/checker-port/probes`) and spec-rejects (`reject:` jobs).
- **Supplement.** diff.ts `moduleJobs` adds 841 cells, outside the 3629: the six `SS_WITH` sections with the files they take, `module:lite/infer` (the checker's own 510 cells in their module) and `module:tutorial`. Standalone, 535 of the 1188 checker/toolchain cells are rejected for missing cross-file types. In module context, 828 of 841 are accepted.

## Validation

`validate.ts`: 25 hand-written cells with known answers, 25/25 right. Six of them are negatives:
- a read-only snapshot used after a yield;
- a Mut used only before the yield;
- an async cell where everything happens before its await;
- a helper that is only called;
- a kept function that captures a const snapshot;
- a let assigned only before the yield.

The positives cover:
- a write after the point;
- a read after the point;
- a loop counter;
- a Mut that is fresh in each iteration (tagged, not counted);
- `xs.push(await …)`;
- `n = await …`;
- a helper called after the yield;
- a kept async function;
- an async helper of a sync cell, whose promise is dropped;
- an async helper of a kept async function, which captures the Mut;
- an async generator (let across an await and a yield);
- a kept nested generator;
- K reads, writes and late writes;
- a captured promise.

`for await` has no case with a counted answer. The checker reports any cell holding one as `unsupported`, so no
accepted cell contains one, and its facts are partial (a push in the body is not flagged as mutating). `validate.ts`
asserts the `unsupported` status.

Cross-check against today's rules:
- 33 cells carry `[mut-capture]` or `[let-capture]`. The counter finds a K hit in 30 of them.
- Of the 3 it does not find, 2 are promise captures (counted in table 4). The third is ports/suminagashi `createContours`, a typed-array capture that is outside K's Mut/let definition.

## 1. Y: generators, accepted cells

| measure | ckr/tc | ports | tut/spec/ex | fixtures | probes | spec-rej | total | dedup |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| generator functions (cell and nested) | 3 | 0 | 34 | 6 | 0 | 18 | 61 | 60 |
| yield a non-primitive value | 0 | 0 | 14 | 1 | 0 | 3 | 18 | 18 |
| Mut/let local used across a yield | 0 | 0 | 13 | 2 | 0 | 3 | 18 | 18 |
|   written after | 0 | 0 | 13 | 2 | 0 | 3 | 18 | 18 |
|   only read after | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
|   the function also yields a non-primitive | 0 | 0 | 11 | 0 | 0 | 3 | 14 | 14 |
| bindings across a yield: Mut-typed | 0 | 0 | 11 | 0 | 0 | 3 | 14 | 14 |
| bindings across a yield: let of a primitive (loop counters, a previous time) | 0 | 0 | 13 | 2 | 0 | 3 | 18 | 18 |
| generators whose hit is not a primitive let | 0 | 0 | 11 | 0 | 0 | 3 | 14 | 14 |

In module context, `module:tutorial` has 1 generator cell, which has no hit.

## 2. A: async functions, accepted cells

| class | functions | Mut/let across an await | written after | only read after | not a primitive let |
|---|---:|---:|---:|---:|---:|
| async cell (nothing visible until it resolves) | 17 | 1 | 1 | 0 | 0 |
| async helper that is only called (all 2 are visible: inside a kept async function) | 2 | 2 | 2 | 0 | 2 |
| kept async function (visible) | 10 (dedup 8) | 4 (dedup 3) | 2 (dedup 1) | 2 | 2 |
| async generator (visible) | 4 | 0 | 0 | 0 | 0 |

The 10 kept async functions:
- `selfhost/rt/probe0.ss.ts:17` `asy` and `selfhost/rt/probe3.ss.ts:9` `awaitLoop`, each counted for `ss` and `ssx`;
- 4 in `selfhost/repro-unknown-class.ss.ts`, counted for `ssx` only (its `ss` job does not parse);
- 2 in spec.ojs strings. The one
written-after kept function is `selfhost/rt/probe3.ss.ts:9` `awaitLoop`: `let s` accumulates across `await`.
`module:tutorial` has 1 async cell, which has no hit.

## 3. K: kept functions that capture a Mut or let local

| population | kept-fn captures | Mut | let of a primitive | written through capture | encloser writes later | only read, no later write |
|---|---:|---:|---:|---:|---:|---:|
| accepted cells, 3629 corpus | 2 | 2 | 0 | 0 | 0 | 2 |
| accepted cells, module supplement | 2 | 2 | 0 | 0 | 0 | 2 |
| every cell, 3629 corpus (dedup 34) | 42 | 20 | 16 | 30 | 5 | 10 |

All writes through a capture, and all later writes, are in cells that are already rejected: by `[mut-capture]` or
`[let-capture]` (28 cells), or by another error first. What R adds over today is only **reads**, 4 cells in all:

- `fixtures/lite-mut/reject-mut-capture/cells.ts:5` `bad_stored`, which is accepted today despite its fixture's name;
- `inline:spec.ojs#2cylt8z8h1s2l` `a`;
- `lite/render.ss.ts:33` `eventOf` (sswith);
- `lite/infer/ix-core.ss.ts:159` `ixAdmits` (module:lite/infer).

The last two are a lookup table built once and read by the function returned.

Rejected cells, checked over every cell:
- With a write-through or late-write K hit but neither `[mut-capture]` nor `[let-capture]`: **0**.
- Read-only K hits in cells that are rejected for other reasons and carry neither rule (spec-rejects left out):
  - `lite/render.ss.ts` `eventOf` standalone, for `inject-unknown,type`;
  - inline `stamp`, for `action-capture`;
  - inline `boxed`, for `iterator-capture`.

## 4. Captured promises, generators and iterators in kept functions

Accepted cells: **0** in the corpus and **0** in the supplement. Over every cell there are 11 (dedup 10), all in cells
already rejected: by `mut-capture` for promise captures, or by `iterator-capture`.

## 5. Newly rejected under R

R: no Mut or let local used across a yield; none across an await in a visible function; no kept function captures a
Mut or let local.

| bucket | cells R rejects | for Y | for A | for K | R without primitive lets |
|---|---:|---:|---:|---:|---:|
| checker/toolchain | 2 (1 cell, ss and ssx) | 0 | 2 | 0 | 0 |
| ports | 0 | 0 | 0 | 0 | 0 |
| tutorial/spec/examples | 16 | 13 | 2 | 1 | 14 |
| fixtures | 3 | 2 | 0 | 1 | 1 |
| probes | 0 | 0 | 0 | 0 | 0 |
| spec-rejects | 3 | 3 | 0 | 0 | 3 |
| **total (dedup)** | **24 (23)** | 18 | 4 (3) | 2 | 18 |
| module supplement | 2 | 0 | 0 | 2 | 2 |

Counted by **distinct cell text** (the name plus the cell function's own source), the 23 locations are **11 texts**:
- the 9 inline `frames` and `reject:S5.2#191`/`#192` are one text;
- `a`#om4wd8zo38rt and `reject:S4.4#184` are one;
- the breakout example and its fixture are one.

With the supplement's 2, R newly rejects **13 distinct cells**.

The list, deduplicated. Detail for each cell (the binding, the function, the lines it is used on) is in `out/tables.md` and `out/r-rejects*.json`.

- `fixtures/accept-basic/cells.ts:15` ticks: Y, `for (let i…) yield i`
- `fixtures/lite-game/accept-breakout/cells.tsx:56` ticks: Y, `let t` (previous time)
- `fixtures/lite-mut/reject-mut-capture/cells.ts:5` bad_stored: K read of Mut `out`
- `lite/notebook/examples/09-breakout.tsx:56` ticks: Y, `let t`
- `lite/soundscript/spec-5.ts:1` s5_frames: Y, Mut `buf` (Float32Array) and `let k`
- `lite/soundscript/spec-7.ts:1` s7_beats: Y, `for (let i…)`
- `selfhost/rt/probe3.ss.ts:9` awaitLoop: A, `let s` in a kept async function
- `lite/render.ss.ts:33` eventOf (supplement): K read of Mut Map `events`
- `lite/infer/ix-core.ss.ts:159` ixAdmits (supplement): K read of Mut Map `W`
- `inline:spec.ojs` (strings inside spec.ojs):
  - 9 variants of `frames` (Y, Mut `buf` and `let k`);
  - `a`#om4wd8zo38rt (Y, Mut `r` and `let k`);
  - `a`#2cylt8z8h1s2l (K read of Mut `out`);
  - `bad`#1lj0ijbwa8dg5 and `bad`#3af5e7gfxw7kh (A: S5.4 cases marked `was: "borrowed-await"`).
- `reject:S4.4#184` a, `reject:S5.2#191` frames, `reject:S5.2#192` frames: Y. These are accepted today, although they sit in the spec-rejects list.

### Rewrites

`rewrites.ts` puts each one through the checker and the counter. A rewrite passes when it is accepted and has no R use; 10 of 10 entries come out as expected.

| shipped cell | smallest rewrite | passes |
|---|---|---|
| accept-basic ticks, spec-7 s7_beats: `for (let i = 0; i < 3; i++) yield i` | `for (const i of [0, 1, 2]) yield i` | yes |
| the same with a bound `n` that is an input | `for (const i of Array.from({ length: n }, (_, i) => i)) yield i` | yes |
| spec-5 s5_frames and the 9 inline `frames`: a reused buffer that is written and then `yield buf.slice()` | a helper `frame(k)` builds a fresh Float32Array, then `for (const k of [1, 2, 3]) yield frame(k).slice()` | yes |
| inline `a`#om4wd8zo38rt, S4.4#184: `r.n = k; yield { ...r }` | `for (const k of [0, 1]) yield { n: k }` | yes |
| probe3 awaitLoop: `let s = 0; for (const x of xs) s += await x` | `(await Promise.all(xs)).reduce((s, v) => s + v, 0)` | yes |
| inline `a`#2cylt8z8h1s2l: `const out = [0]; return () => out.length` | `const out: readonly number[] = [0]` | yes |
| bad_stored: `return [() => out[0], out]` | `const snap: readonly number[] = out.slice()` before the kept function | yes |
| render eventOf, ix-core ixAdmits: a Map built once and read by the returned function | annotate the plain type: `const events: Map<string, string> = new Map(…)` | yes (standalone reduction) |
| breakout ticks (example and fixture): `let t = now(); while (true) { const t1 = now(); yield t1 - t; t = t1; }` | **no reasonable rewrite.** The delta needs the previous time carried across the yield. Recursion through `yield*` grows without bound, and yielding `now()` moves the state to a consumer cell. | n/a |
| inline `bad` S5.4 (two) | **none intended.** These are examples of the hazard itself. | n/a |

The for-of rewrites pass R only syntactically. The array iterator still carries state across the yield, where R does not
see it. The probe3 rewrite also changes which rejection is reported: the first promise to reject, rather than the first in order.

## 6. Attack programs

The run-sets loader is copied from `lite/infer/attack/run-sets.ts`. It covers 12 sets, and freeze3's c0 controls are left out. `convert-freeze/attack1/progs.ts` is added. Each source goes through `rewriteSS`, as run-sets does. This run accepts the same programs as run-sets `verdictOf`, which it calls on every program: 0 differ.

| set | programs | accepted today | accepted, R rejects | R without primitive lets | accepted, not R-rejected, with late code | with K | with Y | with A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| freeze | 315 | 105 | 95 | 95 | 6 | 4 | 0 | 2 |
| attack2 | 252 | 132 | 25 | 25 | 14 | 10 | 0 | 4 |
| attack1 | 8 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| oldspec | 49 | 31 | 3 | 3 | 5 | 3 | 2 | 0 |
| oldvariants | 239 | 40 | 1 | 1 | 3 | 0 | 2 | 1 |
| runtime | 98 | 80 | 12 | 12 | 4 | 2 | 0 | 2 |
| new | 70 | 20 | 13 | 13 | 1 | 1 | 0 | 0 |
| h6 | 54 | 17 | 16 | 16 | 1 | 1 | 0 | 0 |
| freeze2 | 309 | 85 | 74 | 74 | 9 | 7 | 1 | 3 |
| h7 | 45 | 26 | 25 | 24 | 0 | 0 | 0 | 0 |
| freeze3 | 360 | 56 | 44 | 41 | 10 | 3 | 0 | 7 |
| h8 | 76 | 28 | 18 | 17 | 9 | 2 | 1 | 6 |
| convert-freeze/attack1 | 246 | 118 | 117 | 115 | 1 | 1 | 0 | 0 |
| **all** | **2121** | **739** | **443** | **436** | **63** | 34 | 6 | 25 |

What the late-code columns count: "with late code" is a program that holds a kept function, a generator with a yield, or an async function with an await, and has no R use. This table does not say whether R rejects an attack for its payload or for an incidental let, such as a delay loop. Nor does it say which of the 739 are silent holes, since `observe.ts` was not run.

## Approximations

- **Used after.**
  - A use is after a point when it is later in the source text.
  - A write counts as after when its expression contains the point, as in `xs.push(await …)` or `n = await …`.
  - A use inside a loop that contains the point counts as after when the binding is declared outside the loop body. A binding declared in the body before the point is fresh each iteration; such hits are tagged and left out of every count. There is 1.
  - A `for (let i…)` header binding is not fresh.
  - For `for await`, the uses in its iterable expression count as before the point.
- **Helpers.** A call to a helper whose captures include the binding counts as a use at the call. A function created before the point and called through another path is not followed.
- **Captured bindings.** A binding captured by an inner async or generator function counts only for uses inside that function.
- **Visible before g ends.** The split is structural, by function class. It does not check whether g's values are non-primitive: `awaitLoop`, which returns a number, counts as visible because it is kept. True when:
  - g is a generator or a kept function; or
  - g is nested and its encloser is not async; or
  - g is nested and its encloser is visible.

  A nested async function inside an async encloser is assumed to be awaited by it; this is not checked.
- **"Mut or let local".**
  - Counted: bindings typed `Mut<…>` and every `let`, including Mut-typed parameters of nested functions.
  - Not counted: cell inputs, globals, prelude names, function declarations, Borrowed, and aliases written through another name. Aliases are counted under their own binding only when that binding is itself Mut-typed.
- **Primitive let.** A let whose type is primitive by `isPrimitive`. The "R without primitive lets" columns drop these.
- **Yields a non-primitive.** The yield's argument type is not primitive, or the yield is a `yield*`.
- **Promise/iterator holders (table 4).** A captured binding whose type reaches, through aliases, arrays, records and type arguments but not through function types, any of: `Promise`, `Generator`, `AsyncGenerator`, `Iterator`, `IterableIterator`, `Iterable`, `AsyncIterable`, `AsyncIterator`, `AsyncIterableIterator` or `ReadableStream`.
- **Corpus coverage.** The checker's own rg and cp cells are in neither run. Its ix, ow and md cells are only in the supplement.
- **Line numbers.** For `ss` and `sswith` jobs, lines are mapped to files by locating the joined text's lines in the source file. They were spot-checked by opening 6 of them. Lines for `inline:` jobs are lines within the string.
- **Rewrites.** Checked standalone. The eventOf rewrite is a reduction with `DOM_EVENTS` inlined.

## Files

`corpus.ts` (the jobs), `analyze.ts` (the hook and the counter), `validate.ts`, `run.ts`, `summarize.ts`, `rewrites.ts`, `attacks.ts`, `show.ts` (prints a job's text), `run-all.sh`.
