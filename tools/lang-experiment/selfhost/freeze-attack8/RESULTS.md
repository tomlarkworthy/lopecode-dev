# Freeze attack, round 8 (2026-11-23, 06:46:05–07:22:17 CET by `date`; final `./runall.sh` ended 07:22:17)

Target: shipped mode (closure registration on, S4.12 on) of the tree as it stood at 06:46. Nothing outside this
folder was written; build.ts / verify.ts were not run; no git command was run.

**Result.** No accepted program is silent in shipped mode through the freeze. 394 programs; 79 are accepted and so
ran in shipped mode with the checker on (r1 0 and s56 0 accepted; r2 24, r3 3, s1 28, t1 24). Of those 79: 2 silent
(t1, a published function reading the `now`/`random` capability: not a freeze route, see below), 7 are G3 crashes,
19 gap rows stop at the S4.12 throw (r2 16, r3 3), 14 s1 rows throw S4.12 by design or as an over-throw, 6 t1 rows
throw a frozen write, and the rest store and read the same. That is a count of what I tried, not a
proof; target 2 got 37 programs against 330 for target 1. Closure registration is **incomplete in accepted code**: two gaps (G1, G2) in cells the checker accepts,
one more (G4) in an accepted cell found by a probe, and every one of them is made silent here only by a writer the
checker rejects, or by switching S4.12 off. In those programs S4.12 is the only net in shipped mode. Registration
gaps behind a checker rejection are listed apart (G5). Accepted cells that crash at run time because of the
compiler's inserted names are G3.

Rerun: `./runall.sh` (each set through `run.ts`, which records the checker verdict, runs with the checker on when it
accepts, and runs with the checker skipped; mode files `<set>-a.txt` shipped, `-b` `SS_MEASURE_REG=0`, `-c`
`SS_MEASURE_BODYFN=0`, `-d` both off), then `tally.txt`. `bun dumpsrc.ts <set.ts> <name>` prints compileModule's text
of each cell (what runCells runs); `bun twin.ts` runs `lite/fnreg.ts` on the same gap forms; `bun cmp.ts a.txt b.txt`
puts modes side by side.

## Vehicles

The S4.12 throw masks round 7's vehicle: `s.set(f)` with a body-made `f` throws whether or not `f`'s captures are
registered. So registration is measured where it is the only run-time net (lib.ts):

- **D** a cell returns `{ f: F, k, wm }`; `wm` is a WeakMap (deepFreeze does not walk it) holding a writer of `xs`;
  the drive calls the writer after the cell has returned. Second cell: `w = put.f()`, the reading before the write.
- **G** a generator cell yields `{ f: F }`, then writes `xs` and ends (no second yield). Second cell `w = g.f()`.
- **A** (lib2.ts) round 7's accepted Q1 action form, `const st = s.set; … st(F); ls(F()); xs.push(1)`. Shipped:
  S4.12 throws at `st(F)`. With `SS_MEASURE_BODYFN=0` only the freeze of F's captures stops the write. A silent A row
  in that mode is "masked by S4.12", not a shipped result. `lg` is written by the writing body itself (before the
  write), so it is not another cell's reading. r3 repeats G1/G2 in round 7's b7 form, where `snap`, an action of
  another cell, reads the holder between the publish and the write.

D and G writers are rejected by the checker (`[new-non-intrinsic]`/`[mut-capture]`, `[mut-yield]`), so D/G rows run
with the checker skipped. Each row also records `base`: the verdict of the same cell without the writer, which says
whether the function form itself is accepted. Every outcome is classed by the first throw message: `S4.12`,
`frozen-write` (`Attempted to assign to readonly property.`), `dead-zone`, `other-throw`, `none`.

Before calling a checker-skipped silent a registration gap I dumped compileModule's text of all 40 r1 shipped-silent
rows (dump-r1-silent.txt) and 8 r2 rows (dump-r2-gaps.txt): each carries the registrations the cause names (or their
absence), so none is runCells running erased text and none failed to compile. I did not instrument runCells itself.

## Counts (tally.txt, run ending 07:22:17)

| set | what | programs | accepted | base accepted | silent shipped (chk on / skipped) | silent REG=0 (chk on / skipped) | silent BODYFN=0 (chk on / skipped) | controls fired (shipped / REG=0 / BODYFN=0 / both off) |
|---|---|---|---|---|---|---|---|---|
| r1 | target 1: 120 function forms x vehicles D and G | 240 | 0 | 92 | – / 40 | – / 226 | not run | 2/2, 2/2 |
| r2 | target 1: gaps in accepted forms (I, SH), D, G, A vehicles; 7 crash forms | 73 | 24 | 34 | 0 / 40 | 0 / 42 | 16 / 60 | 0/9, 6/9, 0/9, 9/9 |
| s1 | target 2: S4.12's madeFnIn and PUBLISHED | 37 | 28 | – | 0 / 1 | 0 / 1 | 0 / 1 | 0/2, 0/2, 1/2, 2/2 |
| s56 | target 1 with the checker on: generator write routes after a yield, with the i gap | 14 | 0 | – | – / 14 | – / 14 | not run | 1/2, 2/2 |
| r3 | G1/G2 in the b7 form (`snap` reads the holder) | 3 | 3 | – | 0 / 0 | 0 / 0 | 3 / 3 | 0/1, 0/1, 0/1, 1/1 |
| t1 | target 3: async cells, listeners, state initial, memo, read, thrown values, JSX, islands, promises | 27 | 24 | – | 2 / 2 | 2 / 2 | not run | 1/2, 2/2 |
| total | | **394** | 79 | | **0 freeze breaks** (2 capability rows) | | 19 (masked by S4.12) | |

Controls (checker skipped): r1 `ctl-D-let`, `ctl-G-let` (a `let` reassigned after the publish) fire in both modes.
r2's nine `CTL-*` rows (the I forms with the alias named `c` or `j`) throw `frozen-write` in shipped (D, G) and with
S4.12 off (A), and fire with registration off: 6/9 at REG=0 (the three A rows stop at S4.12 there), 9/9 with both off.
s1 `ctl-A-let` fires whenever S4.12 is off; `ctl-A-c-direct` only with both off. r3 `CTL-c-snap` only with both off.
s56 and t1 `ctl-*-c-direct` fire at REG=0 only; t1 `ctl-G-let` fires in both modes; s56 `ctl-i-direct` (alias `i`)
fires in both modes, which is G1 again. So each vehicle is shown to see a change when the protection it measures is off.

r1's 14 rows not silent at REG=0 are vehicle no-ops, not detections: 6 are G3 crashes, 2 are
`closure-over-memo-param` (the memo miss freezes the argument in place, a throw in both modes), and 6 publish nothing
that reads `xs` (`getter-published`, `transitive-action-body`, `fn-new-function`).

## Distinct causes

### G1: a captured local named `i` is never frozen (accepted; records wrongly)

Every capture thunk is `(i) => i < 0 ? n : … `, so a capture named `i` reads the thunk's own parameter.
Both twins (`lite/toolchain/tc-reg.ss.ts` tcThunk, `lite/fnreg.ts` thunk) emit it. Minimal program, ACCEPT (p4):
```
const put = () => { const xs = [0]; const i: readonly number[] = xs; const f = () => i.length; return { f }; };
```
Compiled (dumpsrc p4.ts i-capture):
```
const f = /*ss+*/ss_closure(/*ss-*/() => i.length/*ss+*/, (i) => i < 0 ? 1 : i)/*ss-*/;
```
With two captures it is `(i) => i < 0 ? 2 : i === 0 ? i : k`. Also accepted: a method, a function declaration,
`rows.map((i) => () => i.length)`, a generator yielding `() => i.length` (p4). Outputs, r2-D-I-arrow (D vehicle,
checker skipped) and r2-A-I-arrow (A vehicle, checker on, accepted):
```
shipped   D: wrote; DIFF w (earlier reading) = 1, put.f() now = 2
shipped   A: threw at the call: the value written to s reaches a function or a promise that no finished cell has published … (S4.12)
BODYFN=0  A: DIFF given (lg, recorded in the body) 1 holds 2
control r2-A-CTL-c-arrow (alias named c), BODYFN=0: threw at the call: Attempted to assign to readonly property.
```
Second cell holds the earlier reading: in D/G yes (`w` = 1). In A the reading is `lg`, written by the body; in r3's
b7 form it is another cell's action (r3-I-snap, r3-I-method-snap, checker on, accepted):
```
shipped   threw at the call: the value written to s reaches a function or a promise that no finished cell has published … (S4.12)
BODYFN=0  DIFF v = s() = 2, w = what snap read = 1
control r3-CTL-c-snap (alias c), BODYFN=0: threw at the call: Attempted to assign to readonly property.
``` 16 I forms in r2: D/G silent in
shipped for 15 (`I-catch` copies the binding to `j` first and throws); 11 have an accepted base cell; the 11 A rows
of those are accepted with the checker on and silent with S4.12 off.

Consequence for S4.12 (s1, over-throw): a function captured as `i` by a published function is not walked, so it is
not marked PUBLISHED. `s1-finished-captured-fn-i-gap` (`const i = () => 3; return { f: () => i }`, an action sets
`a.f()`) throws S4.12 in shipped; the same program with the name `h` stores (`s1-finished-captured-fn`).

### G2: a local named `ss_closure` or `ss_methods` replaces the registration (accepted)

The inserted calls resolve to whatever binding of that name is in scope. ACCEPT (p2, p3): `const`, a function
declaration, destructuring, an inner scope only, `ss_methods`. Minimal:
```
const put = () => { const ss_closure = <F,>(f: F, t: (i: number) => unknown): F => f; const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; return { f }; };
```
Compiled: `const f = /*ss+*/ss_closure(/*ss-*/() => c.length/*ss+*/, (i) => i < 0 ? 1 : c)/*ss-*/;` calls the cell's
function. Outputs r2-D-SH-const / r2-A-SH-const: shipped D `DIFF w = 1, put.f() now = 2`; shipped A S4.12 throw;
BODYFN=0 A `DIFF given 1 holds 2`; r3-SH-snap (b7 form) BODYFN=0 `DIFF v = s() = 2, w = what snap read = 1`, shipped
S4.12 throw. The same shadowing of `action`,
`state` and `memo` is also accepted (p3 `shadow-action`, `shadow-state`, `shadow-memo`); not run.

### G3: accepted cells that crash because of the inserted names (crash)

A binding named `ss_closure`/`ss_methods` that is not a function where a registration runs, or is in its dead zone.
All 7 r2 `CR-*` rows are accepted; each cell is in error in every mode:
```
r2-CR-catch       try { throw 0; } catch (ss_closure) { const f = () => c.length; … }   -> ss_closure is not a function. (… 'ss_closure' is 0)
r2-CR-cell-input  const ss_closure = () => 1; const put = (ss_closure: number) => { … () => c.length + ss_closure … } -> ss_closure is not a function. (… is 1)
r2-CR-fn-decl-hoist  function f() {…} const ss_closure = … (later in the block)  -> Cannot access 'ss_closure' before initialization.
```
Also a parameter, a `const ss_closure = 0`, `const ss_methods = 0`, a generator helper parameter. A cell input named
`ss_closure` breaks every capturing function in the cell that takes it.

### G4: a BigInt method key registers key "null" (tc-reg only; accepted)

ACCEPT (p2 `bigint-key`: `const o = { 1n() { return c.length; } }; return o;`). Compiled by the toolchain:
`ss_methods({ 1n() {…} }, "null", (i) => i < 0 ? 1 : c)`; `o["null"]` is not a function, so register returns
silently. `lite/fnreg.ts` emits `"1"` for the same tree (twin.ts): a twin divergence, so the notebook path through
link.ts and the runCells path through the toolchain register differently. r1-D/G-method-bigint-key and -bigint-big
(checker skipped; the vehicle's `o[1]` read is `[type]`) are silent in shipped; twin.txt has the fnreg text: `DIFF w = 1, put.f() now = 2`.

### G5: registration gaps masked by the checker (checker skipped, silent in shipped; dump-r1-gaps.txt)

| form | compiled text | checker |
|---|---|---|
| function declaration directly in a `case` | `ss_closure(h, …)` inserted at the declaration in case 2, not at the hoist point; `F = h` in case 1 runs first | `[switch-declaration]` |
| computed-key method `{ ['m']() {…} }` | no registration | `{unsupported computed property}` |
| getter / setter | no registration (record walk reads the getter's value only) | `{unsupported get accessor}` |
| class method, static, private, class expression | no registration | `[no-class]` |
| `this` in an arrow inside a method | `this` is not a capture | `[no-this]` |
| `arguments` | not a capture | `[no-arguments]` |
| `.bind(null, c)`, `(() => c.length).bind(null)` | a bound function has no thunk | `[no-member]` |
| a function in a WeakMap | WeakMap is not walked | `[new-non-intrinsic]` |

Each is silent in shipped and at REG=0 (r1 rows `r1-[DG]-<form>`). With G2's 5 forms and G4's 2 that is r1's 20
forms, 40 rows, silent in shipped. The other 93 r1 forms that publish a reading of `xs` (every
function syntax, method key spelling, default-parameter and destructuring-default closures, IIFE, at-once callbacks,
loop bindings, curried chains, recursion via own name, catch and for-of bindings, template and tagged templates, JSX
props/children/components, transitive chains through records, arrays, Map keys and values, Set, tuple, Error
cause/property, promise, spread, `Object.assign`, `as const`, `satisfies`, `!`, generics, append with 3000 and 40000
re-registrations) throws `frozen-write` in shipped and is silent at REG=0.

### S4.12 (target 2, s1): no silent; over-throws

- Correct throws: a body arrow, a helper-made function, a published function's fresh closure, an inner action's
  argument, `update` returning a function, functions in a Map (value and key), Set, width-hidden record field
  (checker skipped: Error cause, promise, async result).
- Allowed and stored, as specified: a finished cell's function, record field, captured function, state initial
  value, async cell result, action input, generator yield delivered by a listener, a published function passed to
  an inner action.
- Over-throws (a finished body made the function): memo results (`s1-memo-result-fn-cell`,
  `s1-memo-in-cell-result`: the result is DONE when the cell publishes it, so it is not walked or marked), G1 and G2
  captured functions; at REG=0 every captured function (`s1-finished-captured-fn`), as the f1 comment says.
- A caught S4.12 throw leaves nothing half-stored: `s1-caught-then-data` `f2 = fn(-1)`, `s = 2`;
  `s1-caught-action-arg` `s = -1`; `s1-caught-update` `s = fn(-1)`; `s1-caught-in-update-fn` `s = 9`, `f2 = fn(-1)`.
- The one checker-skipped silent, `s1-fn-reads-state`, is the TAP reading a function that calls `read(...)` outside
  an action (`[read-outside-action]` with the checker on).

### Target 3 (t1): what the other routes did

- Async cell: writes before its single publish at return (`same w 2 a reads 2`). Every inner async continuation
  route (direct, alias after, getter, helper, callback, `Mut` parameter, `.then`) is `[mut-await]`/`[mut-capture]` (p5).
- Memo inside an async cell or action, then a write through a second name: accepted, throws `frozen-write` (the miss
  froze the argument in place), as S2.13 says.
- Listener, state initial value with the i gap, generator loop with the i gap, JSX handler, a promise in a value,
  island with data: not silent (no later writer exists in the accepted program).
- An action that throws `{ xs }` to a JavaScript caller: the caller gets it unfrozen (`frozen=false xs frozen=false`).
  Not a holder the claim lists; reported as observed.
- **The two shipped silent rows**: `t1-fn-capability-clock` (`a = (now: Clock) => ({ f: () => now() })`, `w` 1878.53
  vs 1891.08 later) and `-random`. A published function reading a capability reads differently with nothing written.
  The claim's "see it change" covers this literally; observe.ts and S2.14 treat it as a function reading a
  capability, not a freeze route. I count it apart and not as a break.

### s56: S5.6 with the i gap (all rejected)

All 14 generator write routes after a yield (direct, alias after, helper before/after, getter, `Mut`-parameter helper,
curried, record, closure made before, callback, `finally`, `yield*` inner, loop, try/finally) are `[mut-yield]` or
`[mut-capture]`. With the checker skipped all 14 are silent in shipped, because of the i gap; `ctl-c-direct` (alias
`c`) throws in shipped.

## Masked gaps, collected

- Masked by S4.12 only (accepted, silent with `SS_MEASURE_BODYFN=0` and registration on): 16 r2 A rows (11 G1, 5 G2)
  and 3 r3 rows (2 G1, 1 G2).
- Masked by the absence of an accepted writer (accepted cell, silent with the checker skipped): G1 (11 forms with an
  accepted base), G2 (5 forms), G4 (accepted in probe p2).
- Masked by a checker rejection: G5 (13 forms).

## Crashes

G3 (7 accepted cells in error). No harness crash, no `run crash` in the final run, no PENDING. Late throws in t1 come
from the harness serialiser calling an island's `go` with no arguments (as in round 7) and, checker skipped, "The
object can not be cloned" for a function sent to an island (`[compile-boundary]` with the checker on).

## Dead ends

- Bindings that are not `let`: a reassigned helper/cell/generator parameter, destructured or rest parameter, catch
  parameter, `var`, function name, loop-head `let`, by `=`, `+=`, `++`, `??=`, destructuring assignment: all
  `[let-capture]`, `[const-assign]`, `[no-var]` or unsupported (p1). Over-rejection seen there: `param-assign-in-body`
  (a parameter assigned before the closure is made, then returned) is `[let-capture]`.
- `new Promise` (a resolver as a hidden write channel) is unsupported (p2); `Date`, `DataView` are
  `[new-non-intrinsic]`; `URLSearchParams.append` unsupported; RegExp `lastIndex` `[regexp-state]` (p3).
- Shadowed prelude and intrinsic names (p6): a local `snapshot` is `[prelude-shadow]`; local `structuredClone` and
  `Array.from` get no fresh-value meaning (`[mutating-method]`); shadowed `action`/`memo` around a `Mut` writer are
  `[mut-capture]`; a local `state` is accepted and makes a plain cell. The checker treats these names as locals.
- Thunk re-registration chains: 40000 appends published without a stack overflow (frozen-write, not a crash).

## Not attacked

- A commit-spanning form, foreign receivers, workers/pools, cell edits and reruns, DOM event delivery to JSX
  handlers, a listener delivering during an action, re-entrancy beyond action/read inside memo (both rejected).
- Shadowed `state` (accepted) was not run. A cell named `ss_out` (the module-level wrapper name) was not tried.
- Target 2 items not tested: generator/async resumption across `yield`/`await` while an action runs, a listener
  delivering during an action, action calls nested more than two deep.
- `/review-notebook` was not run on this file.
- The link.ts (fnreg) path was compared on four forms by text only (twin.ts), not run.
- No fix was built or measured.

## Files

Sets r1.ts r2.ts s1.ts s56.ts t1.ts (lib.ts, lib2.ts); probes p0–p5.ts, s1probe.ts, t1probe.ts -> probe-checker.txt;
outputs `<set>-<mode>.txt`, tally.txt, twin.txt, dump-r1-silent.txt, dump-r1-gaps.txt, dump-r2-gaps.txt; set r3.ts; probe p6.ts; scripts run.ts, runall.sh, tally.ts,
cmp.ts, dumpsrc.ts, twin.ts.
