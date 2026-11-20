# The delivery step as small cells (2026-11-20)

Paths relative to `tools/lang-experiment/`. Nothing outside `selfhost/sched-cells/` was changed.

| file | role |
|---|---|
| `step.ss.ts` | `../sched/step.ss.ts` split: one cell per event kind, one per shared decision, `step` is the switch |
| `shell.ts` | `../sched/shell.ts`; adds `useStep(f)` (swap the step) and `linked` (the linked cells) |
| `compile-probe.ss.ts` | cells `st`, `ev`, `out = (step, st, ev) => step(st, ev)`, `stepCompiled = (compile) => compile({ inputs: ["st", "ev"], refs: [], outputs: ["out"] })`, `stepAsOutput` (outputs `["step"]`) |
| `island.ts` | runs `stepCompiled` through `lite/stdlib/runtime.ts` `compiler`; `compiled` is the async function a cell gets; `islandStepSync` is the same captured job run by `runHere` without the await |
| `check.ts` | `../sched/check.ts`, takes several files |
| `run-tests.ts`, `break.ts` | as in `../sched` |
| `bench.ts` | `../sched/bench.ts` with four arms, order rotated per round |
| `profile.ts` | cell sizes, function literals per step call, a recorded trace replayed through each step alone |
| `cells.test.ts` | two cells tested alone |
| `repro-mut-alias.ss.ts` | the one checker message that forced a change |

## Lead

- 41 cells (35 make up the step), max 29 lines (`step`, the switch), median 4; every other cell is 14 lines or fewer.
- runtime.test 67 pass 0 fail; delivery.test 32837 orderings 0 fail; both with the prototype's step counts.
  `SCHED_BREAK=1` 57 pass 10 fail.
- Linked small cells cost the same as the giant step (table below).
- `compile` accepts the island (`st`, `ev` -> `out`), but it returns a Promise and `runHere` re-evaluates all 37
  island cells on every call; it does not fuse. The "compile's island" row is compile's own job run by `runHere`
  synchronously, not what a cell gets from `compile` (that one is awaited: replay only, below). The change sizes
  given for `compile` are estimates; nothing was built.
- Deviation from the brief: the event cells are `(Mut maps…, payload) => void`, writing in place into the copies
  `step` makes once per call, not `(state, payload) => result`. A pure handler would copy the maps once per handler
  and helper call instead of once per step. `step` itself keeps `(state, event) -> { state, effects }`.

## Cell sizes

Non-blank, non-comment lines per cell (`splitCells`), `bun selfhost/sched-cells/profile.ts`:

```
split  41 cells (35 of the step; 6 queries/init), max 29, median 4; over 20: step 29
giant   8 cells, max 189 (step), median 2
```

`step` is 29 lines: 3 for copying the five maps and the effects list, 21 one-line `case`s, the return. The copies
cannot move to a cell: a function returning a `Mut` is `[mut-escape] Mut … returned`.

Per cell: init 1, blank 4, wantsValues 1, isStale 1, mustRemake 1, parksOnInvalidation 1, needsPlacing 1,
nextListener 8, sweepVerdict 2, kick 6, stopGen 4, enqueue 4, fail 6, detach 10, releaseHandle 10, callNext 9,
takeValue 14, drainOnce 4, drain 3, onOpen 4, onRun 10, onMade 7, onPending 4, onListen 10, onLinv 6, onPull 7,
onGot 7, onResolved 10, onAwaiting 4, onRejected 5, onPlaced 6, onAbort 4, forgetOrders 3, onReleaseAction 3,
onSweep 12, step 29, hidAt 1, candidates 1, liveEvents 1, running 2, pulling 2.

Checked lines (non-blank, not `//`): `../sched/step.ss.ts` 246 (45 types, 201 code); `step.ss.ts` 270 (42 types,
228 code). +27 code lines, mostly the `Mut<…>` parameter lists each cell repeats and a closing `};` per cell.

## Tests

```
check.ts                                  56 cells, 0 not ok, 0 module errors (15 runtime.ss.ts + 41)
lite/stdlib/runtime.test.ts (redirect)    67 pass, 0 fail, 14721 steps (42.6 s); the same step count as ../sched
  SCHED_BREAK=1                           57 pass, 10 fail (e1 e2 e4 o1 x3 o2 p1 p2 s5), 15121 steps
lite/browser/delivery.test.ts (thinned)   32837 orderings, 0 fail, 4221008 steps (2 min 20 s); the same step count as ../sched
cells.test.ts                             2 pass (sweepVerdict table; nextListener skipping detached listeners)
profile.ts                                on every recorded bench step (100002 at L=1, 140002 at L=3), the giant step and
                                          the island give output Bun.deepEquals to the split step's; these traces hold
                                          only pull, got, drain and kick (4 of 21 event kinds)
```

## Bench

`bun selfhost/sched-cells/bench.ts` (`bench.txt`): 20000 values, one warm-up, 5 rounds, min-max µs per value.

```
                               L=1 H=0      L=3 H=0      L=1 H=100    L=1 H=1000
cells.ts                       0.07-0.10    0.13-0.15    0.07-0.11    0.08-0.13
giant step (../sched)          0.89-1.12    1.33-1.56    5.54-6.12    16.36-19.28
small cells, link              0.82-0.96    1.23-1.40    5.43-5.81    16.13-18.99
small cells, compile's island  8.37-9.43    11.72-12.93  13.87-15.71  26.44-29.90
  (run synchronously; the language's compile returns a Promise, which the shell cannot take: see below)
```

Splitting costs nothing measurable: linked small cells and the giant step overlap at every configuration.

## Where the ~0.8 µs per value over cells.ts goes

`profile.ts [L] [H]` (`profile.txt`). Live: the bench run through `shell.ts` with `useStep` set to the step once, the
step twice, the step plus a copy-only step (`new Map` of the five maps, empty effects), the step plus one that
returns the state; 5 rounds, order rotated, min-max µs per value. The second call's cost is the in-place cost of
what it runs; the single run minus the step is the shell (with its effects, the generator and the listener calls).

```
                  steps/value effects/value  once        twice       + copy-only  + return-state
L=1 H=0           5 (pull 1, got 1, drain 2, kick 1)  6
                                             0.75-0.96   1.52-1.83   1.27-1.55    0.82-0.91
L=3 H=0           7 (drain 4)                10
                                             1.23-1.32   2.29-2.40   1.88-1.95    1.26-1.27
L=1 H=100         5                          6
                                             4.20-6.40   9.81-10.47  9.62-10.58   4.62-6.62
```

From the range midpoints, L=1 H=0: step 0.82 of 0.86, shell about 0.04; the five Map copies per step (25 per value)
about 0.55 of the step's 0.82; calling one more function that returns a result object about 0.01. L=3 H=0: step
1.07, shell 0.2, copies 0.64. L=1 H=100: step 5.0, copies 4.8. The remainder of the step (0.25-0.4 at H=0) is the
handlers' record spreads (`{ ...h, x }`) and the event and effect objects; those two were not separated.

Closures per call: the giant step's body has 13 function literals made per call (acorn over the erased text);
the split `step` has 0. They run at the same speed (bench; replay 0.88-0.93 against 0.87-0.93), so closure
creation is not a measurable part.

Replay of the recorded (state, event) pairs alone, L=1 H=0: split step 0.87-0.93, giant 0.88-0.93, island sync
8.21-8.43, island through `compile` awaited one call at a time 8.50-8.69, copy-only 0.44-0.48. The replay keeps every
state alive (100002 states), which makes it slower than live as H grows (H=100: 7.49-8.83 replay against
4.20-6.40 live); only its H=0 rows are used here.

## compile

How it is invoked: a cell that takes `compile` (the module's `ss_compile = soundscript.compiler(read)`) calls
`compile({ inputs, refs, outputs, options? })` with literal arrays of cell names. The checker types it
(`lite/core.ts` `compileType`) as `(args: { inputs }) => Promise<{ outputs }>`. The island is every cell upstream of
the outputs, stopping at inputs and refs (`lite/island.ts`). Rules: each name is a cell (`[compile-island]`
"no cell x"), island cells ok, synchronous, no capability, no state cell (`[compile-island]`), inputs, refs and
outputs pass `uncloneable` (`[compile-boundary]`: functions, `Mut`, `Promise`, `State`, … rejected), options
`{ runtime?: Pool }` (`[compile-options]`). At run time `compiler(...).for(caller, refs)(spec)` refuses unless the
checker accepts the caller and every island cell, and returns `async (args) => { await null; return runHere(job) }`
(or `pool.run(job)`).

What the checker accepts here (`check.ts selfhost/sched-cells/step.ss.ts selfhost/sched-cells/compile-probe.ss.ts`):

- `compile({ inputs: ["st", "ev"], refs: [], outputs: ["out"] })`: ok. Inputs must be cells, so `st` and `ev`
  exist as placeholder cells; `out = (step, st, ev) => step(st, ev)`. `Sched` (Maps of records, `unknown` payloads),
  `Ev` and `Out` all pass `[compile-boundary]`. Function-valued cells inside the island are fine; only inputs,
  refs and outputs are checked.
- `compile({ inputs: [], refs: [], outputs: ["step"] })`: `[compile-boundary] step: (st: Sched, ev: Ev) => Out cannot
  cross to a worker (a function)`.

So compile can express "these cells as a function of (state, event)". Two things stop it serving the shell:

1. The result is a Promise. `shell.ts` `feed` is synchronous: a follow-up event runs before the effects after it,
   and a re-entrant feed from a listener runs to completion inside that call. An awaited step reorders both. Not
   run against the tests.
2. It does not fuse. `runHere` (`lite/browser/workers.ts` `EXEC`) runs every island cell in order on every call:
   37 cells here (35 of `step.ss.ts`, `same`, `out`), each making its closure again, plus `{ ...refs, ...args }`
   and `Object.assign`. Replay: 8.21-8.43 µs per value synchronously, 8.50-8.69 awaited, against 0.87-0.93 for
   the linked cells. The await costs about 0.3; re-running the 36 input-independent cells per call costs the rest.

Smallest change that would make compile usable for this, not built (estimates):

- a synchronous main-thread form, e.g. `options: { sync: true }`: `OPTIONS` type, the return type without
  `Promise`, a branch in `compiler` returning `runHere(job)`, `[compile-options]` text: ~10 lines.
- hoisting: evaluate the island cells that do not depend on an input once per `for()` (or per job key in `EXEC`'s
  `modules` cache) and per call run only the input-dependent ones (`out` here): ~15-20 lines in `island.ts` /
  `EXEC`.

With both, a call is `out(step, st, ev)`, which is what `link` gives now (0.82-0.96). Neither change inlines one
cell into another, so neither would beat the linked cells. The cost of many cells that compile would remove is
already 0 within noise under `link`: the per-value overhead is the state copies and the protocol objects.

## Checker messages met

- `[mutating-method] write to a WH, which is not Mut` for `type WH = Mut<Map<number, Hs>>` used as a parameter
  type: an alias of `Mut<…>` is not Mut. Minimal repro `repro-mut-alias.ss.ts`: `viaAlias` rejected, `inline` ok.
  Forced writing `Mut<Map<…>>` out at every parameter (the bulk of the +27 lines).
- `[mut-escape] Mut hs argument to a parameter not typed Mut<…>` at every handler call: a consequence of the alias,
  gone with the inline types.
- `[unsupported] comma expression` (`return void hs.set(…), false`): rewritten as blocks.
- `[possibly-undefined] number | undefined is not assignable to number` on `h.rest[i]`, then
  `[mut-capture] Mut ls captured by a function that escapes` on `h.rest.findIndex((lid) => ls.has(lid) …)`:
  `nextListener` uses `for…of` with a counter.
- The `[inject-type]` generic-function message did not recur: the cells take their inputs untyped and none is
  generic (`orderKeyed` stays in the shell).

## Isolated tests

Only the decision cells (`sweepVerdict`, `nextListener`, `wantsValues`, `isStale`, `mustRemake`,
`needsPlacing`, `parksOnInvalidation`) take plain values; a handler needs the five maps and an effects list built
first. `cells.test.ts` tests `sweepVerdict` (5 cases: spare, release a parked listener, mark, keep in the marking
generation, release a generation later) and `nextListener` (skips a listener no longer attached), each a direct
call with plain values. In `../sched` the same rules are reachable only by feeding `sweep`/`drain` events through
the whole step and reading the state back.

## Recommendation

Keep the split form; it is no slower and its decisions are callable alone. Do not change `compile` for this: a
synchronous, hoisting `compile` (~25-30 lines) would at best match `link`, because the overhead is not in the
number of cells. The per-value overhead is the five Map copies per step (about half at H=0, and the whole H term)
and the L+4 steps of protocol objects per value; the in-place `Mut` step of `../sched-immer/RESULTS.md` addresses
the first.

Not done: a fresh-agent review of this file.
