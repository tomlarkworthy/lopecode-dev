# A pure step function for the runtime's scheduling (prototype, 2026-11-20)

Question: if the runtime's decisions are a checked pure function `step(state, event) -> { state, effects }` and a
JavaScript shell holds the one mutable slot and performs the effects, is the unchecked part mechanical glue, and
is it smaller than the code it replaces?

Paths are relative to `tools/lang-experiment/`.

Built: the event-delivery half (`lite/browser/cells.ts`). Estimated only: the store/commit/action half
(`prelude.runtime.ts`). Nothing outside `selfhost/sched/` was changed.

| file | role |
|---|---|
| `step.ss.ts` | the decisions, SoundScript, checked with `lite/runtime.ss.ts` as one module |
| `shell.ts` | the state slot, object<->id maps, effect performer; the same exports as `cells.ts` |
| `check.ts` | `bun selfhost/sched/check.ts [file]`: the real checker over `runtime.ss.ts` + `step.ss.ts` |
| `run-tests.ts` | runs an existing test file unchanged, every import of `cells.ts` resolved to `shell.ts` (a Bun `onResolve` plugin, matched on the resolved absolute path); prints imports redirected and steps run |
| `break.ts` | negative control (`SCHED_BREAK=1`): `step` with every third listener call dropped |
| `bench.ts` | delivery cost, original against shell |

## Why delivery and not store/commit

Counted from the sources on 2026-11-20:

- `prelude.runtime.ts` store/commit/action: the decisions are `owner` (is a write legal), `current` (call writes,
  then finished calls, then committed), `finish` (discard on throw; one commit timer per batch), `commit`, and
  `ref`'s keep-or-replace. `read` and `update` need `current()` synchronously inside the user's action body, so a
  pure step there is either consulted once per `set`/`update`/`read`, or the call's writes stay in the shell. With
  them in the shell, about 10 lines of decision (`finish`, `commit`) would move.
- `cells.ts` delivery: `kick`/`pull` (busy, epoch `no`, sync-through-a-frame against async-pull-again), `deliver`
  (queue, draining, order once per value, a listener detached mid-value is skipped), `listen`/invalidation
  (replace old, park while the events cell is pending), `events` (replace the generator or keep it and detach
  parked listeners), `release`, `sweep` (spare once per generation). It also has the forced-orderings test.

## State, events, effects (delivery, as built)

State (`Sched`, immutable, maps keyed by number ids the shell mints):

```
hs   hid -> { key name args make gen no done busy pending listeners order queue draining cur rest }
at   "<cell> in <module>" -> hid        ls  lid -> { hid key cell aid parked }
lat  "<cell> in <module>" -> lid        born "l<lid>"|"h<hid>" -> generation    placer, generation
```

`gen` is a boolean: the generator object stays in the shell. `cur`/`rest` are the drain cursor: the value being
delivered and the listeners it has still to reach, so one listener call is one effect and the next is decided
after it ran.

Events: `open run made pending listen linv pull got resolved awaiting threw rejected kick drain placed abort
orderChanged releaseL releaseH releaseA sweep`.

Effects: `frame` (ask `scheduler.frame` to feed `pull`), `next` (call `gen.next()`, feed `got`/`threw`, or
`awaiting` then `resolved`/`rejected`), `return`, `make` (call the cell's generator function, feed `made`),
`call` (a listener's action, errors logged), `place` (the host's `placeOf`, then the existing `orderKeyed`, feed
`placed`), `fail` (log), `then` (feed an event after the effects already queued by this step),
`forgetL`/`forgetH` (drop the shell's reference).

The shell runs events and effects off one stack (`feed`), so a follow-up event runs before the effects after it,
in the order the original's nested calls ran. A feed from user code inside a `call` (re-entrant) runs to completion
inside that call, as in the original.

### What stays in the shell and why

- Object identity: handles and listeners are compared by identity (`isEvents`, `release(v)`, `sweep(values)`,
  `running(of)`). The step sees ids; `WeakMap` and `Symbol` are not SoundScript (`[unknown-type] unknown type
  WeakMap`, `[unsupported] intrinsic Symbol has no signature`, from `selfhost/rt/cells.ss.ts`).
- Generator objects and `guard` (they are objects with methods, stepped under `rt.evalDepth`).
- User code: the generator function, `gen.next()`, a listener's action, the host's `placeOf`. Each runs in the
  shell between two steps; the step decides when, and gets back what happened as an event.
- Promises: `.then` on an async generator's step and on invalidation feed events later.
- The three argument checks in `listen` (they are type tests on objects).

Decisions that are still made in the shell: whether `gen.next()` returned a thenable (the sync or async path),
the three `listen` checks, which sweep candidates `values` holds, feeding `abort` when `placeOf` throws, and the
`making` handoff of the generator function and its inputs from `events()` to the `make` effect.

The action body question (user code calling `set`/`update`/`read` mid-step) does not arise in this half: a listener
action is one `call` effect, and its writes go to `prelude.runtime.ts`, unchanged.

## Results (2026-11-20)

Line counts are non-blank lines not starting with `//`.

```
original  lite/browser/cells.ts            144   (13 of them: imports, generatorish, guard)
checked   selfhost/sched/step.ss.ts        246   (45 type declarations, 201 code)
unchecked selfhost/sched/shell.ts          119   (the same 13 copied, 6 type lines)
```

Shell against original, excluding the 13 shared lines: 106 against 131.

Checker: `bun selfhost/sched/check.ts` -> `23 cells, 0 not ok, 0 module errors` (15 of `runtime.ss.ts`, which
another agent was editing at the time, 8 of `step.ss.ts`). Control: the same file with `st.hs.delete(1)` added is rejected,
`[mutating-method] L166 (the line depends on where it is inserted) write to a Map<number, Hs>, which is not Mut`.

Tests, unchanged files, through `run-tests.ts`. Wall times are single runs with other work on the machine. The
`--full` run and the first thinned run were of `step.ss.ts` before the last fix (`no: -1` for a released handle's
fresh state, below); both files were run again on the final file: runtime.test.ts 67 pass 0 fail, 14721
steps; delivery.test.ts 32837 orderings 0 fail, 4221008 steps.

```
lite/stdlib/runtime.test.ts   original 67 pass 0 fail (42 s)   shell 67 pass 0 fail (47 s), 14721 steps; output identical but for the counter line
                              SCHED_BREAK=1: 57 pass 10 fail (e1 e2 e4 o1 x3 o2 p1 p2 s5)
lite/browser/delivery.test.ts original 32837 orderings 0 fail (136 s)   shell 32837 orderings 0 fail (221 s; 150 s on the rerun), 4221008 steps
                              SCHED_BREAK=1: 6766 of 7137 orderings fail (fewer orderings are reached than in the unbroken run; not examined)
                              --full, shell (step before the no: -1 fix): 138344 orderings 0 fail (18 min 37 s), 21417904 steps
```

Cost (`bun selfhost/sched/bench.ts`: 20000 values from one sync events cell, frames run by hand, H idle handles
live; one warm-up round, then 5 rounds with the arms alternated; min-max us per value):

```
            L=1 H=0     L=3 H=0     L=1 H=100   L=1 H=1000
original    0.08-0.09   0.12-0.14   0.08-0.09   0.10-0.14
shell       0.94-1.01   1.39-1.47   7.00-7.55   20.58-21.08
```

Every step copies all five maps of the state (`hs at ls lat born`) and spreads the touched handle record (and its
`queue`/`rest` arrays) once per `put`. A value to L listeners is about L+3 steps (`got`, a `drain` per listener and
one to end, `kick`), so the cost is O(L x (handles + listeners)) per value; the original's is O(L). Copying only
the maps a step writes would not remove the H term: nearly every step writes `hs`, which has an entry per handle.
Removing it needs a persistent (structure-sharing) map, which SoundScript does not have; not tried.

## Checker blockers

- None that stopped the step. `mut(new Map(st.hs))` copies, local closures that write the `Mut` copies, `for (;;)`,
  `let` counters, a discriminated-union `switch` and `freeze` on return all check.
- `[mut-escape] Mut m placed in an object literal` until each copy is `freeze`d on return (first probe).
- `link()` takes one file's cells, so `step.ss.ts` cannot take `orderKeyed`/`same` from `runtime.ss.ts` under bun.
  Linking both files' cells as one record and checking them as one module works (`check.ts`, `shell.ts`).
- `[unsupported] object spread of Hs | { key: string; ... }` and `[type] { listeners: number[]; order: null } is
  not assignable to Hs` for `const hh = hs.get(id) ?? { ...blank(...), no: -1 }` spread again; annotating the local
  `const hh: Hs` checks.
- Taking `orderKeyed` with its own type written on the input is rejected:
  `[inject-type] orderKeyed: <L>(list: L[], places: Place[]) => { out: L[]; complete: boolean } is not assignable to <L>(list: L[], places: Place[]) => { out: L[]; complete: boolean }`
  (the two printed types are the same; a generic function type is not assignable to itself). An untyped input
  checks. `step` does not take `orderKeyed`: the shell calls it, because the places come from a host callback.

## Behaviour that differs from cells.ts

- A detached listener's record (cell name, parked flag, born generation) is dropped; `cells.ts` keeps `cellOf` and
  `parked` in WeakMaps, so the same listener object attached again after a detach would start parked there and
  unparked here.
- A released handle's state is dropped; `listen` on it afterwards makes a fresh, generator-less state. `cells.ts`
  keeps the old state (also generator-less after `stopGen`). The fresh state's epoch is -1, so a result the stopped
  generator still sends does not match it; with 0, as in a first version, a pending async step of a first
  generator could have been delivered (found in review, not by a test).

Both test files pass with these differences; whether either file reaches them was not checked.

## The other half: store, commit, action (designed, not built)

`prelude.runtime.ts` lines 6-178 (the store, commit and action code; `snapshot`, `equals` and the capabilities
follow it) are 124 code lines, counted as above. The action body is user code
that calls `set`/`update`/`read` while it runs, and `read` must return the committed value plus the call's own
earlier writes (S6.8). Two ways to fit that to a pure step:

- A: the call's writes stay in a shell `Map`, and the step decides only at the call's end and at commit. About 10
  lines of decision move (`finish`, `commit`); legality and `current` stay unchecked. Not worth a step.
- B: every `set`/`update`/`read` is an event. This is the one that moves the decisions, so it is the design:

```
state    depth (action), evalDepth, call: sid -> value | null, ready: sid -> value (in call order),
         committed: sid -> value (stores not backed by a view), timer: boolean, commits,
         stores: sid -> { name, view: boolean }, over: hid -> sid, runs: hid -> { id, args }
events   begin (a call starts; top-level or nested from depth), end { threw }, evalEnter/evalExit,
         write { sid, value }, ref { hid, id, args, initial | null }, commitFired, view { sid, value }
queries  current(st, sid, viewValue) -> value | error    legal(st) -> boolean
effects  throw { msg } (write/read outside an action, action called during evaluation), scheduleCommit,
         setStore { sid, value } (st.value / el.value), notify { sid } (dispatch input, in layer order),
         runFn (ref: call fn under evalDepth)
```

`update(f)` becomes: the shell asks `current`, runs `f` (user code, may throw: the throw leaves the call before any
`write`, as now), then feeds `write`. A view-backed store's committed value is `check(el.value)` on a DOM element
that the user changes, so the shell reads it and passes it to `current` on each read; the step cannot hold it.

Guarantees under B, against S6 (`lite/soundscript/spec.ojs`): S6.5 write legality, S6.10 discard-on-throw, S6.13 nested-call membership and S6.14
one commit per batch with own-writes-visible are decided in the step. Kept in the shell: that `end` is fed even when
the body throws (the `try/finally` around user code), that `commit` runs in a later macrotask (the timer, which
must be a function named `commit`: `delivery.test.ts` labels timers by `f.name`), the dispatch itself, and the
handle objects (`EventTarget`, `defineProperties`, `viewHandle`'s one-handle-per-view `WeakMap`). No guarantee is
lost; the cost is a step, with a copy of `call`, per `set`, `update` and `read`.

Estimate: step 70-90 checked lines, shell 90-100 (against 124 now): the handle objects, `viewHandle`, `ref`'s
function call and the `try/finally` stay as they are. Same obstacles as delivery: a map copy per
step, union types for the protocol, and a shell that is not much smaller than the original.

## Recommendation

Do not integrate. The step is a faithful replacement (every test of both files passes, and the broken step fails
them), and the shell is glue: what decides is in `step.ss.ts`. But the prototype is 365 code lines where `cells.ts`
is 144, the unchecked part shrank by 25 lines (131 to 106), and delivery costs 10-12x per value with no other
handles live (0.94-1.01 against 0.08-0.09 us) and grows with every live handle (about 200x at 1000). What the checker adds over the original is that the decisions cannot touch
an object, a generator or user code, and cannot write state outside the returned value; it does not check the
delivery rules themselves, which the same two test files still carry.

The line growth has three sources, each visible in `step.ss.ts`: the event and effect unions (45 lines of types that
the original does not need, because its calls are its protocol), the drain cursor (`cur`/`rest`, which replaces
one `for` loop so that each listener call can be its own effect), and the record copies (`put(hid, { ...h, x })`
where the original writes `s.x = ...`). None is a checker limit; all three come from the pure-step shape.

The store/commit half is a worse candidate (see above): its decisions are fewer, and the user's action body sits in
the middle of them, so the step runs once per write.
