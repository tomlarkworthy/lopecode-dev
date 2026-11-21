# One effect runner for the step-cell shells: prototype and measurements

Started 2026-11-21 23:59 CET (`date`), last measurement 2026-11-22 00:29:42 CET (`date` in `out/bench-final.txt`). Prototype only. No shipped file was
edited, and `build.ts` and the browser `verify.ts` were not run. Everything is in `selfhost/effect-runner/`.
Machine: AC power, load average 9 to 19 throughout, from other agents (each bench run records `uptime`).

## Result in brief

- Only three of the five shells have a loop: events (`lite/browser/cells.ts`), the pool
  (`lite/browser/workers.ts`) and the store (`prelude.runtime.ts`). Together their loops are **25 code lines**.
  `lite/jsx/render.ts` and `lite/stdlib/runtime.ts` have no state value and feed no events back.
- `runner.ts` is one loop for all three (33 code lines: 27 loop, 6 types). On copies of the three shells it gives
  the same behaviour as the shipped shells on every differential run, including step-by-step traces that hash the
  same. The loops shrink from 25 lines to 6 (2 per module). With the runner counted, unchecked lines go **up**:
  loop lines 25 → 39, whole shells 400 → 419 code lines (the copies gain import lines, the pool table grows).
- The unchecked lines are mostly not in the loop. In the shipped events shell, 11 of 113 are loop lines; the
  other 102 are performers (33), entry points (44), identity (8), a side channel (1) and other code (16).
- Function crossing as specified (S11) may not be used for performers. S11.11 trusts the function "to write
  nothing". The checker also refuses what a runner needs: a table of functions, a performer that is given `feed`,
  and an action that calls a performer. The values in the effects (Errors, handles, typed arrays, functions) fail
  the copy that the crossing makes.
- Overhead: events is slower in every run measured (1.00x to 1.05x, +0.01 to 0.21 µs per delivered value); the
  pool and the store are within 0.99x to 1.15x and the sign varies between runs (section 4).
- Recommendation: if the runner is integrated, the loop stays a small unchecked TypeScript function, and the reason
  to integrate is one tested contract and typed performer tables, not fewer lines. Removing more unchecked code
  depends on opaque handles (section 5), not on the runner.

## 1. Survey of the five shells

Code lines come from the TypeScript parse: a code line holds a token, and comments and JSDoc are not tokens. Each
top-level statement is put in one category by name, and for `makePool` each statement of its body is. A statement
with no category is an error. The script is `bun count.ts` (`--rows` prints each statement). The shipped files were
read in place; `shipped/` holds copies taken at the start, and `cmp` at 2026-11-22 00:29 shows the five
shipped files equal to them.

```
| file                                    | loop | identity | side | perform | entry | other | total |
|-----------------------------------------|-----:|---------:|-----:|--------:|------:|------:|------:|
| events, shipped lite/browser/cells.ts   |   11 |        8 |    1 |      33 |    44 |    16 |   113 |
| pool, shipped lite/browser/workers.ts   |    6 |        2 |    0 |      15 |    28 |    54 |   105 |
| store, shipped prelude.runtime.ts       |    8 |        9 |    0 |      10 |    89 |    66 |   182 |
| render, shipped lite/jsx/render.ts      |    0 |        0 |    0 |      31 |    20 |     8 |    59 |
| runtime, shipped lite/stdlib/runtime.ts |    0 |        0 |    0 |       0 |     7 |   105 |   112 |
```

The categories:

- **loop**: the feed loop and the state value.
- **identity**: ids, id-to-object maps and brand symbols.
- **side**: values carried past the step in shell variables.
- **perform**: effect performers and their host hooks.
- **entry**: functions that user code or the host calls.
- **other**: imports, types, library functions, worker source.

The pool's 0 in side is a counting artefact. `out` and `thrown` share the line `let st: PoolState = newPool(size),
qids = 0, out: unknown, thrown: unknown;` with the state, and that line is counted as loop.

The totals agree with `NOTES-runtime-port.md` for cells.ts (113) and render.ts (59). The notes give 120 for
prelude.runtime.ts. That figure leaves out its library functions (`equals`, `snapshot`, `makeRandom` and others),
which are counted here as "other".

What each shell's performers do, and which foreign API they use:

| shell | performers | foreign API |
|---|---|---|
| events | `frame`: schedule a pull. `next`/`return`: drive the generator. `make`: run the generator function. `call`: a listener's action. `place`: the host's `placeOf`. `fail`: report. `then`: a pure follow-up. `forgetListener`/`forgetHandle`: drop id maps | `requestAnimationFrame` (via `scheduler`), generators, promises, user actions, host callback, `console.error` |
| pool | `post`: `Worker.postMessage`. `resolve`/`reject`: settle the job's promise | Worker, Promise |
| store | `throw`. `return`: the action call's value. `schedule`: `setTimeout(commit)`. `keep`: a `WeakMap.set`. `setView`/`tellView`: a view element's value and `dispatchEvent`. `tell`: `dispatchEvent` | EventTarget, timers, WeakMap |
| render | `applyProp`, `applyChildren` apply an op list from `propOps`/`childOps` and recurse through `patch` | DOM |
| runtime | none; caches (`check`, `joinCells`) and the `compiler` closure call decision cells inline | n/a |

### How the three loops differ

| | events `feed` (cells.ts:40-49) | pool `feed` (workers.ts:80-84) | store `storeFeed` (prelude.runtime.ts:42-48) |
|---|---|---|---|
| order | one work stack of events and effects; a follow-up runs before later effects | `for` over effects; `post` calls `feed` recursively | `for` over effects; no follow-ups |
| state | assigned after each step, before its effects | same | same ("a throw from the step leaves the old one") |
| re-entry | performers call `feed` (actions that listen or release, `placeFailed`); a nested feed runs to the end on its own stack | `post` recurses; nothing else re-enters | `tellView` can re-enter through a view's input listener |
| async follow-ups | promise `then`, `scheduler.frame` → `feed` | `worker.onmessage`/`onerror` → `feed` | `setTimeout(commit)` → `storeFeed` |
| errors | `next` catches into `threw`; `call` catches and logs; `place` feeds `placeFailed` then rethrows, which drops the rest of the work | `post` catches into `postFailed`; other throws propagate | `throw` effect propagates to the caller |
| result | none | none | the `return` effect's value is `storeFeed`'s result |
| foreign values | ids plus maps (handles, listeners, generators); `value`/`error` pass through as `unknown`; `making` side channel | ids for jobs (qid); `out`, `thrown` side channels | handles pass through state as `unknown`; WeakMaps from handle to record |

Essential (the runner must keep them):

- The state is replaced before the effects run.
- Follow-ups run depth first.
- A nested feed runs to completion at once. The store's `exit` must return a value synchronously, so re-entry cannot
  be deferred.
- A performer's throw propagates.
- The store returns a value per feed.

Accidental:

- Stack versus recursion: same order for the pool, because `post` is always the last effect of a step (see
  section 3).
- The `return` effect handled inside the store's loop rather than as a performer.
- Three different policies for foreign values: ids with maps, pass-through as `unknown`, and side channels. All
  three do the same job.
- The pool computes `dead()` into every event. This is an observation of foreign mutable state, made at feed time.

## 2. Design

`runner.ts`:

```ts
runner<S, Ev extends object & { fx?: never }, Fx extends { fx: string }>(
  step: (s: S, ev: Ev) => { state: S; effects: readonly Fx[] }, initial: S, perform: Performers<Fx, Ev>,
): { feed(ev: Ev): unknown; state(): S }
type Performers<Fx, Ev> = { [K in Fx["fx"]]: (e: FxOf<Fx, K>, run: { feed(ev: Ev): unknown; answer(v: unknown): void }) => Ev | void }
```

1. An effect names its performer by its `fx` tag. `FxOf` distributes over the union, so a member tagged
   `"frame" | "next"` is the parameter type of both performers.
2. A performer returns `Ev | void`. A returned event is pushed and runs before the effects after it.
3. An async performer keeps `run.feed` and calls it later (promise, frame, worker message, timer).
4. Re-entrant calls (from user code inside a performer, or from an entry point called by user code) are a new
   `feed` with its own work stack. That stack reads the current state and runs to the end before the caller goes
   on.
5. A step that throws leaves the state as it was. A performer that throws ends that feed's work and propagates.
6. `run.answer(v)` sets that feed's result, kept per nesting depth. The store's `return` is the only user.
7. A step with no effects allocates nothing. This was added after the bench (section 4).
8. What is typed: `tsc` checks each table for a performer per tag, no extra tags, each performer's parameter
   fields and each returned event. `typecheck/run.sh` (`--ignoreConfig`, strict, 2026-11-22):

   ```
   ok.ts: 0 errors in the file
   missing.ts: 1 errors   TS2741 Property 'reject' is missing in type ...
   field.ts: 1 errors     TS2339 Property 'lid' does not exist on type '{ readonly fx: "frame" | "next"; ... }'
   event.ts: 1 errors     TS2820 Type '"postedd"' is not assignable to type '"run" | "posted" | ...'
   extra.ts: 1 errors     TS2353 ... 'retry' does not exist in type 'Performers<PoolEffect, PoolEvent>'
   ```

   `tsc -p tsconfig.json` gives one error in the three shells. It is the `Gen` → `Generator` cast at
   `events-shell.ts:53`, and the shipped `cells.ts:64` gives the same error.
9. What is checked by SoundScript: nothing in the runner. The step functions stay checked cells and are not
   changed.
10. Per module, what stays unchecked is the performers table, the entry points and the identity maps
    (`events-shell.ts`, `pool-shell.ts`, `store-shell.ts`). Only `feed`/`perform` were replaced.

### Can the loop be a checked cell, with the performers crossing as functions from another language?

The spec says no, in so many words. S11.11 (`lite/soundscript/spec.ojs`):

> A function from another language is trusted, and not checked, to give equal results for equal arguments, to
> end, to write nothing (by calling an action or in any other way), and to give values that mean what the cell
> takes them to mean. [...] A checked cell that calls such a function is only as pure as the function: two calls
> with equal arguments may give different results, and an action the function calls may run the calling cell
> again.

Every performer in the three shells writes something: it pulls a generator, calls an action, posts, sets a timer,
writes a WeakMap or dispatches an event. `next` gives different results for equal arguments. Wrapping them under
S11 states a trust that is false, so the spec's trust statement forbids it. An explicitly effectful crossing would
be a different construct.

Probes, `bun ../rt/check.ts crossing/rejected.ss.ts --outside performers,performAsync,performNote` (2026-11-22):

```
viaTable: rejected     [boundary-type] performers: { note: (n: number) => void } cannot cross from another language: it is or holds note: a function
viaCallback: rejected  [boundary-type] performAsync: (n: number, feed: (ev: Ev) => void) => void cannot cross ...: it is or holds a function whose parameter feed is or holds a function
feed: rejected         [action-capture] performNote depends on state (the value of performNote, a cell in another language), so an action using it would act on the value from the cell's last run ...
```

These are S11.3 ("a function type inside an object", "as a parameter or result of a function") and S11.9 ("an
action may not capture it"). Between them:

- A performer table cannot be a parameter.
- An async performer cannot be handed `feed`.
- The loop cannot keep its state in a state cell, because the action that writes the state would capture a
  performer.

What the checker does accept is `crossing/accepted.ss.ts`. It is a pure `drain(s0, first)` with one parameter per
performer and a dispatch on the tag inside it, 17 body lines. A union is not narrowed by `"fx" in x` (S9.2), so
the work items carry a tag. This drain is specific to one module, not generic. `bun crossing/run.ts` runs it
compiled through `lite/boundary.ts`:

```
drain(0, tick 3) -> state 2; performNote called 2 times, performThen 2 times (alternately undefined: accepted, S11.11 trusts it)
performNote's argument frozen: true, its value frozen: true
a yielded plain object: performer got a copy ([object Object], frozen true)
a yielded Uint8Array: TypeError: performNote argument 1.value: expected data, found a Uint8Array object
a thrown Error (events fail.error): TypeError: performNote argument 1.value: expected data, found a Error object
a store handle (an EventTarget): TypeError: performNote argument 1.value: expected data, found a EventTarget object
a listener's action (a function): TypeError: performNote argument 1.value: expected data, found a function
a Map in a yielded value: TypeError: performNote argument 1.value.m: expected data, found a Map object
a performer's throw reaches the cell as TypeError: performNote(...) threw: placeOf threw
```

Under S11.5, what crosses is copied:

- **Events** would deliver copies to listeners, not the yielded object.
- **Errors** in `fail` and `threw` effects are refused.
- **The store's handles** are refused.
- **A performer's throw** becomes a new TypeError. The events `place` path rethrows the host's own error, so this
  would change its behaviour.

A pure drain also cannot hold the state across a re-entrant feed. That is the `late` mutant below, and every
differential that has re-entry catches it.

Alternatives and their costs:

| option | what is checked | cost |
|---|---|---|
| A. loop as unchecked TS (`runner.ts`) | nothing new; tables typed by tsc | 33 unchecked lines once; the loop contract held by tests and mutants, not the checker |
| B. per-module checked `drain` + S11 performers | the dispatch on tags | false S11.11 trust; copies break identity and refuse Errors and handles; no async, no re-entry; state holder still unchecked; one drain per module |
| C. a new effectful crossing (spec change) | dispatch, and the loop if it may hold state | a new construct: a function the cell may call only where effects are allowed, never memoised, arguments passed uncopied (needs opaque handles), not callable from a pure cell. Not attempted (no checker change in this task) |

## 3. Differentials on copies

The copies are `events-shell.ts`, `pool-shell.ts` and `store-shell.ts`, each over `runner-select.ts`. The store was
done as well as the pool, because `delivery.test.ts` and `runtime.test.ts` drive it through the same programs.

**How the shipped tests were pointed at the copies.** `redirect.ts` is a `bun --preload` plugin. `SHELLS=events,
pool,store` turns the shipped shell file into `export * from` the copy, so the shipped tests run unmodified and
every importer (`stdlib/runtime.ts` included) gets one instance. `STEP_TRACE=f` turns `lite/runtime-ss.ts` into a
re-export whose `step`, `poolStep` and `storeStep` hash every event and its effects into a sha256 and count them by
tag. Objects that are not plain data are named by first use. `RUNNER_MUTANT=x` swaps in a control runner from
`mutants.ts`:

- `fifo`: queue order.
- `shared`: one work stack, so a re-entrant feed is deferred.
- `swallow`: a performer's throw is logged and the work goes on.
- `late`: the state is assigned after the effects.

`RUNNER_MUTANT=nosuch` fails at import, which confirms that the redirect took effect.

`events.test.ts`, `pool.test.ts` and `store.test.ts` link only the `.ss.ts` cells and never import a shell, so they
prove nothing about a shell. They were not used.

New scripted differentials were needed because the shipped tests reach some effects rarely or never. In
`runtime.test.ts`, events `fail` has 0 hits and `place` has 3. Both scripted differentials use no timers, are
seeded, and give byte-identical output on two runs of the shipped shell:

- **`events-diff.ts`**, 500 scripts of 60 steps. It uses sync, async, throwing and rejecting generators, a
  throwing `placeOf`, and actions that throw or that call `release`, `listen` or `events` while being called.
- **`store-diff.ts`**, 500 scripts of 50 steps. A view's input listener calls an action during the commit's
  `tellView`. It also covers nested calls, throws, writes outside an action and calls during evaluation.

Results (2026-11-22; final `runner.ts`; "trace" = step-trace sha256 equal to the shipped run's):

| differential | shells | shipped vs runner | trace | effects reached |
|---|---|---|---|---|
| `lite/browser/delivery.test.ts` (shipped, unmodified) | events, store | 50469 orderings, 0 fail, both | equal, 10955310 steps | events: call, frame, next, make, return, then, forget*; no `fail`, `place`; store: keep, schedule, tell only |
| `lite/stdlib/runtime.test.ts` (shipped) | events, store | 82 pass both | equal, 37348 steps | events: all but `fail`; store: all 7 |
| `events-diff.ts` 500 scripts | events | 0 of 500 differ | equal, 99963 steps | all 10; `fail` 603, `place` 1696, `placeFailed` 447, 1864 deliveries to listeners attached from inside an action |
| `store-diff.ts` 500 scripts | store | 0 of 500 differ | equal, 73416 steps | all 7; `tellView` 2385, `throw` 1248 |
| `pool-diff.ts` (copy of `.scratch/ports-night/pool-diff.ts`) 2000 scripts vs the frozen original | pool | shipped 0, runner 0 of 2000 differ | n/a | post, resolve, reject; 399 resends, 25 resend posts that threw (in 200 scripts) |
| `lite/browser/workers.test.ts` (shipped, real Bun Worker) | pool | 8 pass both | n/a | |

Controls (runner mutants). "assert" = the test's own pass/fail, "trace" = the step-trace hash:

| mutant | delivery.test | runtime.test, events | runtime.test, store | events-diff | store-diff | pool-diff | workers.test |
|---|---|---|---|---|---|---|---|
| fifo | assert pass, trace differs | assert pass, trace differs | assert pass, trace equal | 186/500 differ | 0/500 | 0/2000 | pass |
| shared | assert pass, trace equal | assert pass, trace equal | assert pass, trace equal | 119/500 | 350/500 | 0/2000 | pass |
| swallow | assert pass, trace equal | assert pass, trace equal | 81 pass 1 fail | 165/500 | 462/500 | 0/2000 | pass |
| late | 2841 orderings fail in 8 cases, then `setup: 1 fetches` | 74 pass 8 fail | assert pass, trace equal | 500/500 | 350/500 | 1984/2000 | 2 pass 6 fail |

Every mutant is caught by at least one differential for each shell where its clause matters. The blind cells are
explained by the effect algebra, not by weak tests:

- **The pool.** It never re-enters, and `post` is always the last effect of a step, so `fifo` and `shared` cannot
  change anything. `pumpPool` returns `[...rejects, post]`, `andPump` appends that list after the event's own
  effects, and a resend is `[post]` alone (`lite/pool.ss.ts:50,61,87`). Its performers do not throw, so `swallow`
  cannot change anything either.
- **The store.** It has no follow-up events, so `fifo` is the same order.
- **The shipped tests.** They do not re-enter from a performer and no performer throws in them, so `shared` and
  `swallow` pass `delivery.test.ts` with an equal trace (50469 orderings each); only the scripted differentials
  catch them. `delivery.test.ts`'s assertions are blind to loop order too: under `fifo` it passes all 50469
  orderings, and only its step trace differs.

Limits of these runs:

- The `delivery.test.ts` mutant runs mutate the events and the store shells at once (`SHELLS=events,store`); the
  `runtime.test.ts` runs were done per shell.
- In `events-diff.ts` the `unhandledRejection` handler's lines never appear in the logs (0 counted), although the
  first run without the handler crashed on a throwing `placeOf` inside a promise callback. That path is compared
  by the step trace only (447 `placeFailed` events, equal hash), not by the logs.
- `workers.test.ts` is the shipped test, run unmodified; it guards each job with a 3 s timer.
- Each `delivery.test.ts` run took 10 min 26 s unloaded (`out/base-delivery.txt`) and longer with six in parallel.
- `/review-notebook` was not run on this file.

## 4. Lines and overhead

### Lines (`bun count.ts`, 2026-11-22)

```
| module | loop before | loop after | identity | side | perform before → after | entry |
|--------|-----------:|-----------:|---------:|-----:|-----------------------:|------:|
| events |         11 |          2 |        8 |    1 |                33 → 30 |    44 |
| pool   |          6 |          2 |        2 | (2)→1|                15 → 17 |    28 |
| store  |          8 |          2 |        9 |    0 |                10 → 9  |    89 |
| render |          0 |          0 |        0 |    0 |                31      |    20 |
| runtime|          0 |          0 |        0 |    0 |                 0      |     7 |
| runner.ts, once: 27 loop + 6 types = 33
```

- Built for three modules: loop lines 25 → 6, plus 33 in `runner.ts`, so 39 in all. Whole files: 113 + 105 + 182 =
  400 code lines before, 103 + 106 + 177 = 386 after, 419 with `runner.ts` (+19).
- Projected for all five: the same, because render and runtime have no loop to replace.
- Performer lines barely move. A switch case becomes a table entry; the pool's table adds a `settled` helper and
  two object-literal lines.

### Overhead per event (`bun bench.ts`)

Arms are interleaved, 9 rounds each, and the median is reported. Two data sets, each three runs, AC power:
`out/bench-final.txt` (2026-11-22 00:29:29 to 00:29:42, load average 6.25 to 6.58, after the delivery runs ended)
and `out/bench-during-delivery.txt` (00:19:25 to 00:19:50, load 16.95 to 18.76, eight test processes running).

```
                                            final, load 6.3-6.6                   during delivery, load 17-19
                                            shipped      runner       ratios      ratios
A loop only, stub step, 1000 steps/feed     20.5-22.0 ns 21.9-23.3 ns 1.05 1.11 1.07   1.01 1.06 1.06
A loop only, stub step, 1 step/feed         36.8-38.0 ns 10.5-11.2 ns 0.29 0.28 0.29   0.28 0.28 0.26
B events, per delivered value               3.40-3.86 µs 3.53-3.88 µs 1.05 1.04 1.00   1.04 1.02 1.03
C pool, depth 1, per job                    1.82-1.94 µs 1.87-1.98 µs 1.06 1.03 0.99   0.97 1.18 0.90
C pool, depth 10                            2.69-2.78 µs 2.79-2.96 µs 1.10 1.00 1.02   0.98 1.01 0.98
C pool, depth 100                           9.79-9.89 µs 9.81-9.96 µs 1.01 1.00 1.02   1.02 0.99 1.02
C pool, stub step, depth 1                  0.40-0.48 µs 0.38-0.39 µs 0.98 0.84 0.81   1.10 1.23 1.65
D store, 1 write per call, commit per 10    0.21-0.24 µs 0.22-0.25 µs 1.05 1.04 1.15   0.80 1.00 1.05
```

- **B, events**: slower in all six runs, by 0.01 to 0.21 µs per delivered value. The loop alone (A, 1000 steps)
  costs 1 to 2 ns more per step than the shipped loop; the rest of the difference was not located.
- **A, 1 step per feed**: compared with the shipped *events* loop, which allocates a work array per feed. The runner
  does not allocate when the first step has no effects.
- **C, stub step**: loop and performer cost with `poolStep` taken out; 0.81x to 0.98x at load 6, 1.10x to 1.65x at
  load 17. The sign follows the load, so no overhead is claimed either way. With the real `poolStep` the ratios
  are 0.90x to 1.18x with no consistent sign.

**Dead end, measured before the allocation change.** The first runner (`out/runner.v1.ts`) made a `run` object and
a work array per feed. Its store figure was 0.236 → 0.577 µs per call (2.45x), and its pool stub figure was 0.457 →
0.837 µs (1.83x), at load 14 (2026-11-22 00:13). Two changes fixed it: one shared `run` with per-depth answers
(`out/runner.v2.ts`), then no allocation for a step with no effects. Together they brought the store to 1.00x to
1.11x. Every differential above was rerun with the final runner.

## 5. What stands in the way of going further

**Object identity (input to the "opaque handles" design).** An opaque handle is a checked type for a foreign value
that a cell may hold, pass and compare but not inspect. Holding these in step state instead of ids would remove the
following lines (shipped line numbers):

- **events, `lite/browser/cells.ts`**:
  - Removed: 29-32 (`lastId`, `idOf`, `idFor`, the `handleObjects`/`listenerObjects`/`generators` maps), 81
    (`handleIds`), 77-78 (the `forgetListener`/`forgetHandle` performers, with their effects in `events.ss.ts`),
    the map lookups in the performers at 56, 63, 66 and 72, the id lines in the entry points at 103, 111-113 and
    138-139, the `idFor` calls at 149-151, and the object lookup in `sweep` at 157.
  - Needed for `sweep`: the step would have to test membership of a held value in a `Set` of opaque values.
  - About 20 of 113 lines.
  - Stays: the brand symbols and `madeHandles` (22-23, 33), which make the handle object, and every call of a
    generator or action, which is still a performer.
- **pool, `lite/browser/workers.ts`**:
  - Removed: the `jobs` map and `qids` (77, 113-114), the `jobs.get`/`jobs.delete` at 86 and 94, and the `out` and
    `thrown` side channels (78, 89, 95, 97, 104). The resolver, the result and the thrown error would ride in the
    events and effects as opaque values.
  - About 8 of 105 lines.
  - Stays: `dead()` (79). It reads `owner.dead`, which is inspection of a foreign mutable object, so it remains an
    observation the shell makes at feed time.
- **store, `prelude.runtime.ts`**:
  - Today the state already carries handles, as `unknown` (`Pending.handle`, the effects' `handle`). `unknown`
    can be narrowed by a checked cell (S9.2), so it is opaque by convention only. An opaque type would make it so
    by type.
  - The WeakMaps `records`, `over`, `viewEls` and `views` (34-39, 143) and the commit's gather of records (67-68)
    stay unless checked state can hold a map *keyed weakly* by opaque values. "A store lasts as long as its
    handle" is a garbage-collection property that an opaque type alone does not give.
- **render, `lite/jsx/render.ts`**: node identity is positional (`before[o.old]`, `made[o.kid]`). Per-node data
  lives in expando properties (`__elem`, `__tag`, `__handlers`, `__listening`, at 22-25 and 36-39). Removing them
  needs an identity-keyed map in checked state, which is the same requirement as the store's.
- **runtime, `lite/stdlib/runtime.ts`**: no foreign-object ids. Its maps are keyed by strings.

Questions this raises for that design:

- May an opaque value be a `Map` or `Set` key, or only compared with `===`?
- Is a weak map in step state allowed?
- Does an opaque value cross S11.5 uncopied?

Every performer above needs the third.

**Other obstacles:**

- The `making` side channel (`cells.ts:35`). `events()` sets the generator function and inputs, and then the
  `make` performer reads them. A function cannot be in an event (S11.3, S11.9), so this stays a shell variable,
  or becomes an opaque value.
- `dead()`. Foreign mutable state is sampled into every pool event.
- Entry points are most of each shell (44, 28 and 89 lines). They take user values and brand-check them.

## 6. What an integration would change in shipped files (not done)

- Add `lite/runner.ts` (33 lines) to `soundscript/ts-cells.ts`. Its header (lines 8-9): "What WORKERS_ROOTS reach
  and neither module keeps is a third module, the worker pool add-on". The runtime module would keep the runner
  (events and the store use it), so the pool add-on would not get its own copy and would have to take it from the
  runtime module. Whether the add-on can import a cell of the runtime module was not determined.
- `lite/browser/cells.ts`: replace `delivery`, `feed` and `perform` (40-80) with the performers table and
  `runner(...)`. Change the five state reads to `R.state()`.
- `lite/browser/workers.ts`: replace `st`, `feed` and `perform` in `makePool` (78-98). `makePool`'s `step`
  injection point stays.
- `prelude.runtime.ts`: replace `storeState`, `storeFeed` and `performStore` (22, 42-58). Change the `rt` getters
  and the five state reads.
- The gates would be the differentials here, made permanent: `delivery.test.ts`, `runtime.test.ts`,
  `workers.test.ts`, `events-diff.ts`, `store-diff.ts`, `pool-diff.ts`, plus the mutants.

## 7. Open questions for the owner

1. Line count goes up (loop lines 25 → 39, whole shells 400 → 419). Is one tested loop contract worth 19 more
   unchecked lines, or should the three
   loops stay where they are until opaque handles change what the shells hold?
2. Should the spec gain an explicitly effectful crossing (option C)? It is the only route to a checked loop, and it
   depends on opaque handles crossing uncopied.
3. For opaque handles: are Map/Set keys and weak maps in step state part of the design? The store and the render
   shells need them. Events and the pool need only equality and Set membership.
4. `lite/jsx/render.ts` and `lite/stdlib/runtime.ts` are not step shells. Should they be left out of "the five"?

## Files

- `runner.ts`, `runner-select.ts`, `mutants.ts`: the runner and its controls.
- `events-shell.ts`, `pool-shell.ts`, `store-shell.ts`: the copies, made by copying the shipped file and replacing
  the import paths, the loop and the perform function by text substitution, then the state reads (`delivery`,
  `st`, `storeState` → `R.state()`), each read back after the edit. No statement-by-statement comparison was run.
- `redirect.ts`, `trace/`: the preload redirect and the step tracer.
- `events-diff.ts`, `store-diff.ts`, `pool-diff.ts`, `compare.ts`: the differentials.
- `bench.ts`, `count.ts`, `typecheck/`, `crossing/`: measurement and probes.
- `shipped/`: copies of the five shipped shells, taken at the start (before 2026-11-22 00:05).
- `out/`: raw outputs: the `tr-*.json` traces and counts, the `*-diff` outputs, bench, and count.
