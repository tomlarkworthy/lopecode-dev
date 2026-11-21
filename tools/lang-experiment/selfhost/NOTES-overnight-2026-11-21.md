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

### Event delivery integrated (ca223594)
43 checked cells in `lite/events.ss.ts`; `lite/browser/cells.ts` 144 -> 113 unchecked lines; checked runtime
declarations 15 -> 57. `delivery.test.ts --full` 138344 orderings, 0 fail; verify 629 pass 0 fail (builder's run
and mine); Breakout interleaved old/new 47.1, 47.9 vs 48.3, 47.7 world changes/s. The `Mut` alias defect is fixed.

### Review fixes (614b7c43)
Findings 1 to 3 of the fresh review fixed. Finding 2: the probe script behind the S6.12 ordering counts no
longer runs against the current compiled shapes, so the counts were removed from the spec; the two programs are
guarded by their spec tests only. Owed: add them as cases of `lite/browser/delivery.test.ts`.
Finding 4 (`ss_moduleName` random name outside `runtime.mains`) is open.

### Store, commit and actions as step cells: prototype done (`selfhost/sched-store/`), integration running
25 checked cells, 149 lines; shell 111 lines against 124. S6.5, S6.8, S6.10, S6.12, S6.13, S6.14 decided in
checked cells. Blocker handed to the integration: the state never drops a store.

### Checker survey (`selfhost/checker-survey/RESULTS.md`), read-only
367 units, 4575 code lines in the checker, linker and toolchain; 43 units already ported. Of 66 sampled units
converted and run through the checker: 19 check as is, 29 after a small local rewrite, 11 have a named rewrite
not fully ported, 3 are blocked at the parser boundary, 4 by something forbidden on purpose. Estimate: 2139 to
3557 of 4043 lines could check, given three preconditions: a typed AST (an 84-node union was built and checks;
a flat node table can cross into SoundScript, a recursive type cannot), the classes rewritten as single cells,
and a parse result SoundScript can take in. For Tom: whether to start this, and the parse route.
Defects found, not fixed, repros in `selfhost/checker-survey/defects/`:
D1 an arrow whose body only throws is inferred as returning void; D2 one failed property read reported once
per union member; D3 `?.` comparisons do not narrow; D4 `[a].includes(b)` and `indexOf` accept the identity
test that `===` rejects; D5 `export class` reported as an export, not as a class. Also `RegExpMatchArray`
cannot be indexed.

### The two one-off test failures: both are test defects, causes found (copy in `tools/lang-experiment-flake/flake/`)
1. `runtime.test` `s2_the_write_after_the_await_threw`: fails 8 of 8 under `bun test`, 0 of 200 under
   `bun <file>` at any load. `bun test` takes unhandled rejections for its own report and never calls the
   file's `unhandledRejection` handler. Fix: the test awaits the rejection itself (`flake/runtime.test.fix.diff`).
2. `test_spec_S7_4` (63 vs 62): after `variable.delete()` the listener is detached only when `onCodeChange`
   reports it at a later runtime compute; a pull in the frame before that delivers one more value. Forced:
   3 of 3 fail with exactly +1. Never seen unforced (0 of 188). Fix: wait, per frame, for
   `soundscript.running([handle]) === 0` before reading (`flake/spec.ojs.fix.diff`); forced 10 of 10 pass.
   Behind it: up to one value can be delivered after a listener cell is deleted. Whether S7.4's "the listener
   ends when its cell is deleted" allows that lag is Tom's call.
Both fixes to be applied after the store integration, which is editing the same files.

### Renderer decisions as checked cells: prototype done (`selfhost/render-cells/RESULTS.md`)
`lite/jsx/render.ts` 61 unchecked lines -> 17 checked cells (87 lines, largest 12) and a 68-line shell.
`proof.ts` 20 of 20 through the redirect; 20000 random old/new trees drawn by both renderers, 0 differ;
control with move placement off, 2822 of 3000 differ. Patch of 100 keyed children in happy-dom, one moved:
85.6-103.7 us -> 139.3-154.2 us. Keyed matching, prop diff and position matching moved; "made by h", text of
non-elements and the DOM-property check stayed in the shell. Open: the prop diff uses `equals` on unknown
values, which is a deep walk; a typed `props` on `Elem` would let it be `===` on primitives.
Defects in `render.ts`, repros in `repro-defects.ts`: (1) a prop named like an Object member such as
`constructor` is treated as an event; (2) `patch` called directly with a different tag keeps the old node but
records the new tag, so a later `mount` reuses the wrong node; (3) `value={undefined}` sets the text
"undefined"; (4) a symbol key throws. The checker rejects 1, 3 and 4 in checked code.
To integrate after the store, last.

### Store, commit and actions integrated (b03afed3)
17 checked cells in `lite/store.ss.ts` decide S6.5, S6.8, S6.10, S6.12, S6.13, S6.14; `prelude.runtime.ts`
124 -> 120 unchecked lines; checked runtime declarations 57 -> 73. Records live with their handles (WeakMaps
in the shell), so nothing per store is in the long-lived state. `delivery.test.ts --full` 138344 orderings,
0 fail; verify 629 pass 0 fail (builder's run and mine); Breakout alternated 50.3 55.4 57.1 vs 53.3 51.2 53.7.
100 sets in one call cost 27-55 us against 3.4-4.8. `reset()` during a call differs (only tests call it).
The two test fixes are in the same commit; `runtime.test` passes 70/0 under both `bun` and `bun test`.

### Running: the checker fix batch (13 items; the State/Events-handle item is kept separable)
Done. 12 of 13 fixed; `__proto__` is closed for literal keys only. Checker +135/-36 lines. Corpus 713 sources,
2238 cells: previously accepted and now rejected are the 3 repros of the handle hole, `selfhost/rt/prelude.ss.ts
snapshot` (`<T>(v: T) => structuredClone(v)`, unsafe, not shipped) and `selfhost/rt/probe3.ss.ts unionFnObj`
(the unsound `in` idiom); fixture `ok_in` rewritten with `typeof`. Gates: runtime.test 81/0 (11 checker tests
added), events 29, store 38, rt/diff 0, proof ok, verify 629 pass 0 fail (builder's run and mine, mine after the
spec sentences); Breakout 53.1 after play, 59.8 in edit pane. Per-item patches, each reversible alone, in
`lite/soundscript/.scratch/batch/` (ignored by the commit recipe; i7.patch + i7b.patch drop the handle rule).
Open after the batch:
- An index record reaches `Object.prototype`: `r["__proto__"]`, `r.constructor`, a dynamic key `"toString"` are
  typed as the element type; `m[k] = w` with `k === "__proto__"` on a `Mut` index record sets the prototype, and
  a record whose prototype is a ref handle passes the runtime's handle test. Closing it touches every
  index-signature read (own-key guard or null-prototype records); not measured.
- `structuredClone` of a function hidden by width subtyping still throws. `structuredClone(JSON.parse(s))` is
  now rejected (precision lost).
- `await`/`then` on a type parameter that is given a promise, inside a generic.
- D4, not changed: `includes`, `indexOf`, `Object.is`, `Map`/`Set` keys compare identity, so `[strict-eq-object]`
  is passed by a one-line rewrite. 33 uses in the corpus, 2 in the shipped runtime sources.
For Tom: new rule id `[handle-pass]` (item 7, not ruled on); new spec sentences in S2.6, S2.7, S2.11, S3.3,
S5.4, S9.2, S9.6 and one tutorial sentence.

### Renderer decisions integrated
18 checked cells in `lite/render.ss.ts` (104 code lines, largest 12) decide what a patch changes; the shell
`lite/jsx/render.ts` is 59 code lines (61 before) and keeps the DOM reads and writes, "made by h", `asText`,
`keyOf` and the same-value shortcut (`===` on two `Elem`s is `[strict-eq-object]`). Checked runtime value
declarations 73 -> 91. 20000 random old/new/next trees against the renderer as it was: 0 differ; control with
placement off: 2822 of 3000 differ. Patch of 100 keyed children, one moved, happy-dom: 70-93 us -> 110-127 us;
no move 42-50 -> 86-97 us. verify 629 pass 0 fail (builder's and mine); Breakout 53.4 after play, 59.9 in the
edit pane. The four renderer defects are fixed, each with a test in `lite/render.test.ts` (25 pass):
a prop named like an Object member is no longer an event; `mount` makes a new node when the tag differs from
the one the node was created for; `value={undefined}` resets once; a symbol key is keyed by its text.
`render.ts` now also exports `kidOf` and `drawnOf` (for `mount`). `selfhost/render-cells/` scripts import the
shipped renderer and no longer reproduce their RESULTS.md numbers (records).
Checker quirk found, not changed: `===` on an alias of a primitive union is `[strict-eq-object]`, the same
union written inline is accepted.
Prose changed: tutorial (two sentences on what is outside the checked language), core (one), two section sentences.
