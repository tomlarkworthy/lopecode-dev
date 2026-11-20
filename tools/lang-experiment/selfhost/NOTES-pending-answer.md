# Pending answer in fetch-then-store (S6.12): work record

2026-11-20. Diagnosis only. No product code, spec or notebook changed. Probes and their raw outputs are in
`lite/soundscript/.scratch/pending/` (`*.ts`, with the `*.out` each one wrote). Runtime is `@observablehq/runtime`
6.1.0. PROSE PENDING throughout: this is a record of facts and outputs, not finished prose. Blocks marked
"verbatim" are copied from the `.out` files. Blocks marked "condensed" have lines dropped or joined; the full text
is in the named file.

## Harness

`harness.ts` installs `requestAnimationFrame` and `setTimeout` as queues that the probe runs by hand. It does this
before the Runtime is imported, because runtime.js:7-9 captures `frame` at import.

- R: Runtime frames.
- C: cells.ts `scheduler.frame` (events pulls).
- T: `setTimeout` (the prelude `commit` and the cells.ts stop check).

Microtasks are drained with the real `setImmediate`. "browser" mode puts R and C into one rAF queue in
registration order, and drains microtasks after each callback. Fetches are answered by hand. `ss_on` is wrapped
so that each delivery is logged at the listener. No pass condition depends on time. The listener and generator
counts in TRACE output come from cells.ts `running()`/`pulling()`, which count across every run in the process.

## Q1: plain Runtime, no SoundScript (`q1-plain-runtime.ts`)

`asked` is redefined to 1, 2 and 3 while `loaded(asked)` waits on a promise resolved by hand. In scenarios F-H
`asked` is a generator over an EventTarget instead. Verbatim, `q1-plain-runtime.out`:

```
--- A settle after the frame that saw asked=2 {"observeDown":true,"observeLoaded":false,"source":"redefine","settleFirst":"after-frame"}
  ...
  loaded definition #1 asked=1
  (asked := 2; queued R:runtime-frame)
  run R:runtime-frame
  down pending
  (asked := 3; queued R:runtime-frame)
  run R:runtime-frame
  down pending
  settle #1 -> b1
  loaded definition #2 asked=3
  settle #2 -> c2
  down definition sees c2
  down = "c2"
  definitions: 3
--- B settle after asked:=2 but before its frame {...,"settleFirst":"before-frame"}
  ...
  loaded definition #1 asked=1
  (asked := 2; queued R:runtime-frame)
  settle #1 -> b1
  down definition sees b1
  down = "b1"
  run R:runtime-frame
```

The other scenarios give the same two sequences: D (downstream unobserved, a tail observed), E (only `loaded`
observed), F (as A, generator source) and G (as B, generator source). The same two orderings run on the page's own
Runtime class in Chromium give the same result. Verbatim, `q3-browser.out` load 1:

```
"q1":{"settleAfterFrame":"def asked=0, down=a0, def asked=1, def asked=3, down=c2","settleBeforeFrame":"def asked=0, down=a0, def asked=1, down=b1, def asked=2, def asked=3, down=c3"}
```

The lines of runtime.js that decide it:

- 220: each compute increments `_version`.
- 227-231: the new run is chained on the old `_promise` (`.then(init, init)`), so the next definition is called
  only after the pending one has settled.
- 239: a run whose version is no longer current throws `variable_stale` before its definition is called. In A,
  `asked=2` is never run.
- 268 and 280: the pending run's value is dropped as stale when its version has moved.
- 233-235: a downstream variable's `init` waits on the `_promise` its input has when the downstream is computed.

What decides the outcome is the order of the answer's settle and the Runtime frame that recomputes `loaded`. The
change itself does not decide it, and neither does whether the variables are observed. Given that order, the
result is deterministic.

Platform duplicate fetch, scenario H (generator source; asked:=2, its frame, asked:=3, settle, then its frame).
Verbatim, `q1-plain-runtime.out`:

```
  (asked := 3; queued R:runtime-frame)
  settle #1 -> b1
  loaded definition #2 asked=3
  run R:runtime-frame
  down pending
  run R:runtime-frame
  settle #2 -> c2
  loaded definition #3 asked=3
```

The generator's `postcompute` sets `asked._promise` at once (runtime.js:320-325), but `loaded` is recomputed only
a frame later. The run chained behind the settle reads the new input through `init` (233-235). The frame then
recomputes `loaded` for the same input. Scenario I is the same order with `redefine`, and it gives `asked=2`, then
`asked=3`, with no duplicate.

## Q2: the state handle as the source

- Two asks in one task are one commit. `finish` queues one `setTimeout(commit)` while `rt.ready` is non-empty
  (prelude.runtime.ts:151-155), so the value goes from 1 to 2 in one `input` event.
- The single commit is not why only one more fetch happens. With the asks in two tasks (two commits, two `input`
  events), the middle request is still skipped whenever both commits reach a Runtime frame before the answer.
  From `q23-orderings.out`: `6x delivered ["third#2"] fetches ["?n=0","?n=1","?n=3"]`, e.g. `T R R answer R`.
  That is runtime.js:239.
- "The next fetch started only after the pending one answered" is runtime.js:227-231.
- The same duplicate fetch as Q1 H appears in the SoundScript module
  (`fetches ["?n=0","?n=1","?n=3","?n=3"]`, schedule `R R T answer R R`, `q2-trace-duplicate-fetch.out`).

## Q3: where the pending answer is lost

In the test's order the answer settles before the commit timer. The Runtime therefore delivers "second" to
`arrived` (Q1 case B). The loss happens in cells.ts. Verbatim, `q3-trace-dropped.out` (browser mode, schedule
`X answer T rAF T rAF`):

```
  answer#1 "second"
  loaded = "second"
  events arrived("second")
  arrived = {"name":"arrived"}
  onArrived = {"events":{"name":"arrived"}}
  run T:commit
     (listeners attached 1, generators pulled 1)
  run R:runtime-frame
  loaded pending
  arrived pending
  onArrived pending
  fetch#2 ?n=2
     (listeners attached 0, generators pulled 0)
  run C:events-pull
     (listeners attached 0, generators pulled 0)
```

The mechanism:

1. `events` makes a new generator for "second" (cells.ts:65-69). `listen` attaches the listener and kicks
   (154-163, 80-85). The first pull waits for `scheduler.frame` (84).
2. The commit's `input` event leads to a Runtime frame that recomputes `loaded`, `arrived` and `onArrived`.
   `variable_compute` resolves each variable's invalidation (runtime.js:215). `onArrived`'s invalidation detaches
   the listener (cells.ts:162). `arrived`'s invalidation arms the stop check (76, then `stopGen` at 46-51).
3. The pull then finds no listener and returns (cells.ts:88). "second" was never yielded. A sync generator yields
   and delivers in the same pull (90-103), so no value is lost between a yield and its delivery.

So the pending answer reaches the listener only if its events pull runs before the Runtime frame that follows
the commit. That frame comes first when a Runtime compute was already requested (`runtime._computing`,
runtime.js:71-72) before the answer registered its pull, and the commit timer fires before that frame.

Who requests that frame:

- The program itself can. When the test continues at `asks.length === 2`, as it does, the `asked` generator's
  re-pull is still queued: runtime.js:307 calls `_precompute(recompute)`, which reaches 66-68. Condensed,
  `q3-leftover.out`: `queued at fetch#1 T:timer,R:runtime-frame`. With no X, `q3-stop-at-fetch.out`
  (verbatim):
  ```
  delivered ["third#2"] fetches ["?n=0","?n=1","?n=2"] greeting "third#2": 16; answer before the commit timer in 2: answer T T rAF T rAF | answer T T rAF rAF T
  ```
  The answer is dropped when both timers run before that rAF. It is delivered when the rAF runs between them
  (`answer T rAF T ...`, 26 schedules).
- The rest of the page also does. In Chromium, waiting with `setTimeout(0)` until `_computing === null` took 110 to
  189 spins on each of 10 loads (`q3-browser-gate.out`).

Measured in Chromium with `q3-browser.ts`, on `lopebooks/notebooks/soundscript.html`. On each load, `store` also
appends to a state cell `heard`, which is read after everything has settled. Verbatim summary lines:

```
q3-browser.out:
listener got "second" on 0/10 loads; greeting read "second" at asks.length===3 on 0/10; test_spec_S6_12 said "stored" on 1/10
runtime._computing set at the answer: on 10/10; among those the listener got second 0; among the others 0/0
q3-browser-gate.out (second ask and answer released in a task where _computing === null):
[gate] listener got "second" on 10/10 loads; greeting read "second" at asks.length===3 on 10/10; test_spec_S6_12 said "stored" on 2/10
runtime._computing set at the answer: on 0/10; among those the listener got second 0; among the others 10/10
```

The deciding condition was reproduced: `_computing` set at the answer gave 0/10, and unset gave 10/10. The
reported rate of 6/10 was not. The test's own message said "stored" on 3 of 20 loads here.

The test's read point (spec.ojs:1134-1135) reads `afterSecond` when `asks.length === 3`. In Chromium, `afterSecond`
matched delivery on 20/20 loads. Under bun with real timers it did not. Verbatim, `q3-real-timers-bun.out`:

```
bun real timers: listener got second in 10/10; greeting read "second" at asks.length===3 in 0/10
```

The same with pulls pumped by hand as in runtime.test.ts:34-38 (`q3-real-timers-bun-pump.out`, verbatim):

```
bun real timers + pulls pumped by hand (runtime.test.ts style): listener got second in 10/10; greeting read "second" at asks.length===3 in 10/10
```

The earlier "0 runs under bun" is not established. Neither bun setup tried here drops the answer at the listener,
and one of them reads `greeting` too early on every run. The probe that logged ["a","c"] was not found in the tree,
so its setup is unknown.

Symptom 3, two equal answers both delivered. Verbatim, `q3-equal-answers.out`:

```
answer#1 after 2 steps (queued then: T:timer,R:runtime-frame): delivered ["same"]
answer#1 after 3 steps (queued then: R:runtime-frame): delivered ["same","same"]
```

The second equal answer is delivered only when the stop-check timer (cells.ts:76) has run first. `stopGen` sets
`s.args = null` (48), so the `same()` test at 65 restarts the generator. If the answer arrives within that
macrotask, the finished generator is kept and nothing is delivered.

## Q4: what a user can rely on, and two programs

What the runs above support:

- The text of the latest request ends up stored.
- The listener is not always called for the latest answer. When it equals the previous value and arrives before
  the stop check, it is not called (symptom 3).
- An answer to an earlier request may or may not reach the listener. It depends on whether a Runtime frame was
  requested before its events pull was (Q3).
- Requests made while one is pending are coalesced to the latest (Q1, line 239).
- A request may be fetched twice (Q1 H).

`q4-programs.ts` runs each program over every ordering the explorer enumerates. Verbatim summary lines,
`q4-programs.out`:

```
=== (a) latest wins: 468 forced orderings, 0 fail
=== (b) every answer in order: 2300 forced orderings, 0 fail
=== (b) every answer in order, one more ask anywhere: 12683 forced orderings, 0 fail
```

(a) Latest wins.

- `loaded` returns `{ n: asked, text }`.
- `store` takes `asked: State<number>`, and sets `greeting` only if `a.n === read(asked)`.
- `read` includes calls that have finished but not yet committed (prelude.runtime.ts:58).
- An earlier answer that does arrive is ignored.
- The duplicate fetch still occurs (`8x browser+X two tasks: fetches ?n=0 ?n=1 ?n=3 ?n=3`). It does no harm here.

(b) Every answer, in order.

- One request is in flight at a time (`current: number | null`).
- `ask` appends to `queue` when a request is in flight.
- `store` records the answer and moves the head of `queue` into `current`.
- `loaded` reads only `current`. A commit dispatches `input` only for the stores it wrote
  (prelude.runtime.ts:128-130), so `loaded`'s input does not change while it waits.
- The third run adds one `ask()` as a choice at any point, including between a delivery and its commit.
- `loaded` catches a failed fetch and returns `text: null`. That branch was not run.

What is not available. Verbatim, `q4-async-events-check.out`:

```
async generator as Events: asked:ok  answers:ok  greeting:ok  store:ok  onAnswer:rejected ["[inject-events] answers is not a sync generator cell yielding { n: number; text: string }"]
sync generator yielding the fetch promise: asked:ok  answers:ok  take:ok  onAnswer:ok
```

An events cell cannot do the fetch itself (S7.1). A sync generator can yield the fetch's promise, and an action can
take it, but the action cannot store its result. A write from the promise's callback finds no action on the stack
and throws (prelude.runtime.ts:61).

No change is needed for either program. PROSE PENDING: whether the spec should state the guarantee, and whether
`test_spec_S6_12` should record delivery at the listener instead of reading `greeting` at `asks.length === 3`.
