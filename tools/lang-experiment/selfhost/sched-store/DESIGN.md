# Store, commit and action as checked cells (prototype, 2026-11-21)

Paths are relative to `tools/lang-experiment/`. Nothing outside `selfhost/sched-store/` was changed. This is
design B of `selfhost/sched/DESIGN.md` ("every `set`/`update`/`read` is an event"), built.

| file | role |
|---|---|
| `step.ss.ts` | 25 cells: `step(state, event) -> { state, effects }` is a 12-case switch over one cell per event (`viewed` calls `withStore` directly) |
| `shell.ts` | the same exports as `prelude.runtime.ts`: one state slot, handle objects, user functions, effects |
| `run-tests.ts` | runs a test file unchanged with every import of `prelude.runtime.ts` resolved to `shell.ts` |
| `break.ts`, `break-owner.ts` | negative controls (`STORE_BREAK=1`, `=2`) |
| `check.ts`, `cells.test.ts`, `differential.ts`, `bench.ts`, `count.ts` | the checker over `step.ss.ts`; cells alone; one script against both files; cost; line counts |

## State

Every cell is pure: it copies the maps it changes (`mut(new Map(...))`, `freeze` on return) and shares the rest
with `{ ...st, x }`. A `set` copies only `call`.

```
depth      actionDepth          call  sid -> value | null (the running top-level call)   ready  sid -> value
commits                         stores  sid -> { name, handle, view }    committed  sid -> value (not a view)
storeOf    hid -> sid           over  hid -> hid (viewHandle over a state cell's handle) names  hid -> name
runs       hid -> { fid, args } (ref's last run)                          nextSid
```

`sid` is minted by the step; `hid` by the shell (a `WeakMap` from the handle object). Store identity is separate
from handle identity because `ref` with changed inputs gives the same handle a new store (`withStore` drops the
old one: no handle resolves to it any more, so a commit of its pending writes is skipped where the original sets
an unreachable store's value).

## Events and effects

```
events   enter { evaluating }   exit { threw, value }   current { hid }   write { hid, value }   read { hid|null }
         peek { hid }   ref { prev, fid, args }   made { hid, name, value, run }   viewed   over   commit   reset
effects  throw { msg }   answer { value }   readView { hid }   plan { keep, remake }   schedule
         setView { hid, value }   tellView { hid }   tell { hid }
```

A step that answers (`current`, `read`, `peek`, `ref`) leaves the state as it was and returns an `answer`,
`readView` or `plan` effect; the shell's `feed` returns it. `exit` changes the state and also answers (the call's
return value). `update(f)` is two steps around user code:

```
write(hid, f):  v = f(feed({ t: "current", hid }))     // refused here outside an action, before f runs
                feed({ t: "write", hid, value: v })    // f threw: no write event, the throw leaves the call
action(f)(...): feed({ t: "enter", evaluating: rt.evalDepth > 0 })
                try { v = f(...) } catch (e) { feed({ t: "exit", threw: true }); throw e }
                return feed({ t: "exit", threw: false, value: v })
```

Discard-on-throw (`lite/soundscript/spec.ojs` S6.10) is the pure form doing nothing: the call's writes live only in `call`, which `exit`
drops; `ready` is not touched, so there is no undo. A throw from a step itself leaves `st` as it was, because the
shell assigns the new state only after `step` returns.

## What stays in the shell, and why

- **Object identity.** Handles are `EventTarget`s with `set`/`update`/`value` from `Object.defineProperties`;
  `viewHandle` keeps one handle per element in a `WeakMap`; `ref`'s `prev` is mapped back to its id.
  `WeakMap`, `Symbol` and `EventTarget` are not SoundScript.
- **User code.** The action's function, `update`'s function, the boundary `check`, `ref`'s `fn` (under
  `rt.evalDepth++`), and the `isStateCell` test on what `fn` returned. Each runs between two steps.
- **`rt.evalDepth`.** `lite/browser/cells.ts`'s `guard`, `run.ts`, `lite/browser/run.ts` and
  `runtime.test.ts:706` step it with `rt.evalDepth++`, so it stays a plain field and is passed into `enter` as
  `evaluating`. `actionDepth`, `call`, `ready`, `commits` are getters over the state (tests read them; nothing
  in the tree assigns them).
- **The commit timer.** `schedule` is performed as `setTimeout(commit, 0)` with a function named `commit`:
  `lite/browser/delivery.test.ts:22` labels timers by `f.name === "commit"`.
- **DOM-backed views.** A view store's committed value is `check(el.value)`, which the user changes; the step
  returns `readView` and the shell reads it. `setView` assigns `el.value`; `tellView`/`tell` dispatch `input`.
  Dispatching is how the Observable Runtime learns a state cell's value changed (its value variable is
  `Generators.input` of the handle).
- **Synchronous completion.** That a call runs to completion before its caller goes on (S6.13) and that a throw
  reaches the caller (S6.16) are the shell calling `f` directly and rethrowing.

## Rejected

- Design A of `selfhost/sched/DESIGN.md` (writes in a shell `Map`, step only at the end of a call): leaves legality and
  `current` unchecked; about 10 lines of decision would move.
- Keeping committed values in the shell and passing them into each `current` (state = depth, call, ready,
  commits only): would remove the store maps whose copies make `made` O(stores held) (RESULTS.md), but puts
  "which store is the handle's now" and "who is told" back in the shell. Not tried.
- A `Mut` handler style as in `selfhost/sched-cells` (handlers writing into copies `step` makes once): not needed;
  a step here touches one or two maps.
