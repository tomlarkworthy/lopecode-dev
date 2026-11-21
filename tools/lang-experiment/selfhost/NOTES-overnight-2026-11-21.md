# Overnight log, 2026-11-20 to 21

Tom, 2026-11-20 late: "see how much you can port and fix correctness bugs and add minimal features to make
the system better if absolutely needed." Local commits on `soundscript-experiment` only; nothing pushed.

## Order of work
1. Event delivery as checked step cells replaces `lite/browser/cells.ts` (integration builder).
2. State store, commit and actions as step cells (prototype in `selfhost/sched-store/`, then integrate).
3. Renderer keyed matching as pure cells (prototype, integrate last).
4. One checker batch, each fix probed and its cost on existing programs counted:
   `...rest` of `Math`; `__proto__` literal key; `structuredClone` of a function; generic `[inject-type]`
   self-assignability; `Mut` alias; async function holding a `Mut` across `await`; `.then(() => promise)`
   typing; `in` narrowing under width subtyping; State/Events handle reaching `unknown` or generics (own commit).
5. Read-only, in parallel: fresh review of spec/tutorial/core since d63f1f8c; cause of the two one-off test
   failures (`runtime.test` s2, `test_spec_S7_4` 63 vs 62); survey of how much of the checker could be ported.

Rules for the night: one builder owns the build and checker at a time; commit only when no builder is editing
shipped files; before each integration commit, diff the checker for loosening and the tests for weakening, run
full verify, `delivery.test.ts --full` and `q3-browser.ts`, and compare Breakout's measurement lines by hand
with `lite/soundscript/.scratch/speed/verify-full.log` (verify prints them, it does not judge them).

## Left for Tom (not built)
- `Symbol.for` (2 checker lines; symbols throw in template literals, `join`, `Number()`, `structuredClone`).
- Reserving `then` / `toString` / `valueOf` / `toJSON` as function-typed members.
- Removing the four globals outside S2.6 (`Symbol`, `DataView`, `TextEncoder`, `TextDecoder`).
- The parking rule for listeners (relaxing it saves about 12 lines; a listener would keep its last action
  while something upstream throws).
- The action-factory restriction from the S6.9 fix (`(k) => action(() => s.set(k))` is rejected).
- Any change to `compile` (it returns a promise and reruns every island cell per call).
- S4.4's exception for non-retaining built-ins: state it or remove it.

## Spec wording awaiting Tom's review
- S7.4: reworded 2026-11-20 (a rerun with the same events and action keeps the listener; a rejected cell ends
  it). Since then a rerun replaces the listener with no gap; no cell can observe the difference.
- S7.5: "run again with the same inputs it keeps its generator" is now also true across an input error and a
  same-text redefinition; an edit with different text replaces the generator.
- S6.9: text is narrower than what the checker enforces (an action body may use, from outside itself, only
  built-ins, globals, stateless cell inputs, and consts or functions that pass the same test).
- S2.7: reworded (destructuring and computed keys named; passing `Math` where `{ random }` is expected).
  Not said: index-signature targets are rejected too.
- S3.19: new (iterator capture and iterator as a cell's value). One new tutorial sentence.
- S3.20: new (`Object.freeze` of an object or array literal). One new tutorial table row.
- "Not specified" list: the pending-answer item replaced by two items (a listener while an input of its events
  cell throws; which requests an async cell makes when its input changes while it waits).

## Results
(appended as each step lands)

### Fresh review of spec/tutorial/core since d63f1f8c (2026-11-21): spec FIX, core FIX, tutorial CLEAR
Built from the committed branch: verify --quick 210 pass 0 fail. Four findings, to act on once the delivery
integration has landed (it edits the same files):
1. `readme_memo` (core.ojs:53) gives `ss_listen(value, name, invalidation, this)` and `ss_events(this, …)`; the
   compiler emits the module name in both places. Confirmed. To fix.
2. S6.12 prose (spec.ojs:865, :911) cites orderings counted by `q4-programs`, which is in the ignored
   `.scratch/`. Confirmed. To fix: track the script or drop the counts.
3. `test_spec_S6_12_latestWins` does not assert that the stale answer reached `store` and was dropped. Plausible.
4. `ss_moduleName` gives a random name to a module not in `runtime.mains`, so a live edit there keys a new
   handle and listener instead of taking over the built ones. Plausible, minor; not reached in this notebook.
