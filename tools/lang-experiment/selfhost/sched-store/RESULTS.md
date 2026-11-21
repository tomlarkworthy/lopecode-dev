# Store, commit and action as small checked cells: results (2026-11-21)

Paths relative to `tools/lang-experiment/`. Design and the shell/cell split: `DESIGN.md`. Nothing outside
`selfhost/sched-store/` was changed. Line counts are non-blank lines not starting with `//` (`count.ts`; its import/counter split of
`shell.ts` is by line prefix, and was checked by hand against the numbered file).

## Lead

```
original   prelude.runtime.ts lines 6-178 (store, commit, action)    124 unchecked
checked    step.ss.ts   149 = 31 type lines + 25 cells (118); max 16 (step, the switch), median 4, none over 20
unchecked  shell.ts     111 = 5 import/re-export + 4 test/bench counters + 102
tests      runtime.test 67 pass 0 fail (36400 steps); delivery.test 32837 orderings 0 fail (4319017 steps)
           cells.test 10 pass; differential.ts 24 lines, 0 differ; negative controls 64/3 and 62/5
us/write   set inside an action, one store: original 0.012-0.064, prototype 0.065-0.122
```

The shell is 102 lines against 124 (-22), 111 with its imports and counters. The brief (the owner's instructions to this session) said to stop and report if the shell did not end up clearly
smaller than the original's 124 lines; it is not clearly smaller, and the checked + unchecked total is 260 against 124. The S6
run-time decisions do fit in checked cells (below); what does not shrink is the object, user-code and protocol
glue around them.

Per cell: init 4, isIdle 1, refused 1, answered 1, storeIdOf 1, ownerOf 1, writeTarget 6, committedOf 4,
currentOf 2, onEnter 6, merged 6, onExit 7, onCurrent 4, onWrite 7, onRead 7, onPeek 4, sameInputs 1, onRef 6,
withStore 8, onMade 7, onOver 5, tellOf 1, onCommit 11, onReset 1, step 16.

Where the shell's 102 lines go (numbered off `shell.ts`): `write`, `handleOf`, `materialize`, `read`, `ref`,
`viewHandle` 43; `action` 10; `feed`/`perform`/`commit` 20; the `rt` facade 7; symbols, predicates,
`actionNames`/`nameOf` 10; `reset`/`idle` 2; id minting and the handle/view maps 4; types 4; `link` and the state
slot 2. The first two groups are about as long as their originals, because the user code and object work in them
stayed; `feed`/`perform` (20) is new.

## Tests

All through `run-tests.ts`, which resolves every import of `prelude.runtime.ts` to `shell.ts`, checks that both
export the same names (`stepsRun`/`storesHeld` excepted), and prints at exit:

```
runtime.test   67 pass, 0 fail (46 s)
  store: 4 imports of prelude.runtime.ts redirected (lite/stdlib/runtime.ts, lite/browser/cells.ts, lite/types.ts,
  lite/stdlib/runtime.test.ts), 36400 steps run, 64 stores held at exit; the original's rt.commits 0
delivery.test  pass delivery: 32837 orderings, 0 fail; 0 listeners left attached, 0 events handles left
  store: 4 imports ... redirected (lite/browser/delivery.test.ts, ...), 4319017 steps run, 264938 stores held at exit;
  the original's rt.commits 0
  22 min 55 s wall (1165 s user, 773 s system)
original delivery.test, same day, after it: 32837 orderings, 0 fail; 2 min 38 s wall (166 s user, 16 s system)
```

`shell.ts` imports the original for `snapshot`, `equals` and the three capabilities; the original's `rt.commits`
staying 0 shows its store code was not the one committing. Original runtime.test, run before and after the
prototype runs on 2026-11-21: 67 pass 0 fail both times (`baseline-runtime.txt` holds the second; the first took
42 s, the second's time was not captured).

**delivery.test takes 8.7x the original's wall time (22:55 against 2:38).** The measured candidate is the store
state, which held 264938 stores at exit (not isolated by a run that drops them): every store made (`withStore`) copies four maps of every store held, and the state never
drops a `materialize`d or view store, so each state cell made costs more than the one before (bench below: 29 us per
store made at about 1200 held, 76 us at 5600). The step count is not the cause: `selfhost/sched-cells` ran 4221008
delivery steps in 2 min 20 s. The 735-773 s of system time against the original's 16 s is consistent with
allocating and freeing those copies; that part was not profiled. Each delivery run was the only test running.

Negative controls (`STORE_BREAK`, the cell swapped in by import redirection):

```
=1 onExit keeps a top-level call's writes when it threw   64 pass, 3 fail (c2_no_store_changed, c2_no_input_told,
                                                          c2_later_flush_chains_and_wakes)
=2 ownerOf lets a write or read through outside an action 62 pass, 5 fail (s2_the_write_after_the_await_threw,
                                                          s3_write_throws, s3_read_throws, s3_callbacks_throw, s4_write_throws)
```

`cells.test.ts` (10 pass, 33 expects) calls decision cells with plain records: `writeTarget` (refused outside an
action; through `over`), `onEnter` (nested, refused during evaluation, top-level), `merged` (first-write order,
one schedule per batch), `onExit` (top-level throw drops the call and leaves `ready` the same object; nested throw
keeps the writes and returns the value; top-level return schedules once), `currentOf` (call, ready, committed,
view), `onRef` (keep/remake table), `onCommit` (set before tell, a dropped store skipped), `withStore`.

Checker: `bun selfhost/sched-store/check.ts` -> `25 cells, 0 not ok, 0 module errors`. Control: `st.ready.set(0,
value)` added to `onWrite` -> `[mutating-method] L112 write to a Map<number, unknown>, which is not Mut`.

## S6, at run time

Statements of `lite/soundscript/spec.ojs` section S6.

Decided in checked cells:

| statement | cell |
|---|---|
| S6.5 a write while no action's function runs throws | `ownerOf`, `writeTarget` (via `onCurrent` before `update`'s function runs, and `onWrite`) |
| S6.8 `read` = committed + earlier writes in call order; throws outside an action | `onRead`, `currentOf` |
| S6.10 a write applies to its call when made; a top-level throw keeps none; a caught nested throw keeps its writes | `onWrite`, `onExit` |
| S6.12 a write from a promise callback finds no action | `ownerOf` (the async-ness itself is compile-time) |
| S6.13 nested calls join the call; top-level starts one; refused during a cell evaluation | `onEnter` |
| S6.14 writes of calls that finish before the commit share it, in call order; every store set before any is told | `merged`, `onCommit` |
| S6.2 / S6.11 same function text keeps the handle; same inputs (`Object.is`) keep the store | `onRef`, `sameInputs` |

Enforced only by the shell: that `exit` is fed when the body throws (`try`/`catch`); that `update`'s function runs
between `current` and `write`, so its throw leaves before the write (S6.10's first sentence); that the commit runs in
a later macrotask (`setTimeout(commit, 0)`, S6.14 "after the call returns"); that a call runs to completion before
its caller goes on (S6.13) and its throw reaches the caller (S6.16); the evaluation counter (`rt.evalDepth`,
passed in as `evaluating`); reading a view's value; performing the effects in the order given.

## Cost

`bun selfhost/sched-store/bench.ts` (`bench.txt`), 2026-11-21, one warm-up then 5 rounds with arms alternated,
min-max us per operation:

```
                          original       prototype
set, one store            0.012-0.064    0.065-0.122     2 steps (current, write), copy of a 1-entry call
set, 100 stores           0.044-0.094    0.407-0.578     call copied per write: O(writes in the call)
read                      0.005-0.006    0.035-0.060     1 step
call of one update        0.050-0.090    0.177-0.225     4 steps (enter, current, write, exit)
store made                0.276-0.340    29.1-75.6       4 map copies of every store held (1205-5617 held)
```

A `set` does not depend on how many stores exist (only `call` is copied); a store made does. A call that writes K
distinct stores costs O(K^2).

## Checker messages met

- `[type] Map<unknown, unknown> is not assignable to Map<number, unknown> | null` for `call: new Map()` inside
  `{ ...st, depth: 1, call: new Map() }` (`onEnter`). `new Map()` in `init`'s literal, whose return type is
  written, checked. Fixed with an annotated local `const call: Map<number, unknown> = new Map()`.
- `[inject-unknown] parameter same names no cell, foreign or capability` for `onRef = (same) => ...` checked with
  `lite/runtime.ss.ts`: `same` is now in `lite/events.ss.ts`. Added `sameInputs` (1 line, the same rule) rather than
  depend on a file another agent is editing.
- The `Mut` type-alias problem of `selfhost/sched-cells` did not arise: no cell takes a `Mut` parameter; each returns a
  new state.

## Behaviour that differs from prelude.runtime.ts

None of these is reached by a failing test; whether the tests reach them was not checked.

- Store records never leave the state for `materialize` and `viewHandle` (the original's are in WeakMaps), the
  shell's `handles` map holds every handle object and `views` every view element. 6618 stores held at the end of the bench. A store replaced by
  `ref` is dropped.
- `rt.commits` is incremented before the input events are dispatched (after, in the original).
- `rt.call` and `rt.ready` are maps keyed by store id, not by store object; `actionDepth`, `call`, `ready`,
  `commits` are getters, so an assignment to them would be lost (none in the tree).
- `reset()` during a call: the original's top-level call still commits its captured writes on return; here the
  call is gone and nothing commits.
- A write to a handle with no store: a refusal message here, a `TypeError` in the original.

## What integration would need

- Drop stores the state no longer needs, and the shell's `handles`/`views` entries with them: a release/sweep event as delivery has, or keep committed values in the
  shell (DESIGN.md, Rejected). Without it, cells made per run grow the state for the life of the page.
- Link `step.ss.ts` into `lite/runtime-ss.ts` with the runtime cells and take `same` from `events.ss.ts` in place
  of `sameInputs`; in the notebook, compile the cells into `@tomlarkworthy/soundscript-runtime`.
- Replace `prelude.runtime.ts` lines 6-178 with `shell.ts`; `lite/soundscript/ts-cells.ts` lists
  `prelude.runtime.ts` as a notebook source, so the build changes too. Not attempted (another agent owns the build).

## Recommendation

Do not integrate as is. The decisions S6 names are now in checked cells of at most 16 lines and each can be tested
alone, but the unchecked part shrank by 22 lines (124 to 102), the total grew to 260, a write costs 2-5x and
a store made 85-275x (bench ranges), and the store state needs a release mechanism the original gets from WeakMaps.

Reviewed 2026-11-21 by a fresh agent (FIX, 8 findings, all taken: `exit` listed as a read-only step, `../` paths,
the unsourced brief threshold and S6 numbering, an uncaptured timing, `views` missing from the retention note,
`viewed` having no cell, this line).

After the review, a check of the shell found a bug no suite caught: `feed` returned `perform(e) ?? answer`, so an
answer of `null` came back as `undefined` (a nested action returning `null`, `read` and `.value` of a view holding
`null`). S6.18 tells users to hold `null` in a state cell. Fixed by taking the answer on the effect kind;
`differential.ts` runs one script of `null`, `0`, `""`, `false` against both files: 24 lines, 0 differ, and 6
differ with the old `feed`. Every test, control, count and the bench above were rerun on the fixed shell; the 67/0 and
32837/0 had also passed on the broken one, so neither suite holds a null state.
