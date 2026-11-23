# Freeze attack, round 5 (2026-11-23, 02:10–02:27 CET; `date` at start 02:10:42, last run 02:26:31)

Target: the tree after m1 step 2 (NOTES-checker-port.md, last section: `[mut-nested]`, the writable annotated-fresh
allowlist, R-M). The question: with closure registration off (`SS_MEASURE_REG=0`, lite/freeze.ts:40) and the deep
freeze kept, does an accepted program change a value silently? If not, `lite/fnreg.ts` and
`lite/toolchain/tc-reg.ss.ts` can be deleted. Mode A = shipped (registration on). Mode B = `SS_MEASURE_REG=0`.

Rerun:
```
./runall.sh        # c0 n1..n8 through ../freeze-attack3/run.ts: mode A -> out-a.txt, mode B -> out-b.txt;
                   # summary.txt is its output
bun ../freeze-attack4/probe.ts p1.ts   # checker verdicts and messages for the consumer-side probes
bun ../freeze-attack4/probe.ts p2.ts   # today's verdicts on run-sets h9-r2-tuple / h9-r2-inferred
```
freeze-attack3's `harness.ts`/`run.ts` and freeze-attack4's `probe.ts` and `c0.ts` are imported, not copied. `W` is
`for (let i = 0; i < 300; i++) await null;`. The observer calls every function with no arguments at the first reading
and again at the end, so a function that writes and then reads gives a new answer on the second call if the write
lands. Nothing outside this folder was written.

## Counts (02:26 run, summary.txt)

```
## out-a.txt (shipped)                        ## out-b.txt (SS_MEASURE_REG=0)
-- controls 19, fired 6                       -- controls 19, fired 19
-- 441 candidates, accepted 145, silent 0     -- 441 candidates, accepted 145, silent 128
```
| batch | what | programs | accepted | silent A | silent B | controls |
|---|---|---|---|---|---|---|
| c0 | attack4's 7 controls and switch control; 3 new switch controls | 4 | 3 | 0 | 3 | 7 |
| n1 | inference route x keep form (32 routes x 6 forms) | 192 | 72 | 0 | 72 | 0 |
| n2 | roots other than N: buffer views, defaults, Mut params, `this`/`arguments`, helper results, early escape from async/generator cells, lets | 38 | 6 | 0 | 1 | 0 |
| n3 | N through memo, actions, state, `update`, listeners, JSX, consumer cells, reruns; type operators | 28 | 13 | 0 | 10 | 8 |
| n4 | the annotated-fresh allowlist (S4.1) at its edges | 80 | 6 | 0 | 5 | 0 |
| n5 | operator routes; generators; compile islands and pools; memo keys | 31 | 21 | 0 | 16 | 0 |
| n6 | `yield*`, unannotated consumer inputs, JSX, switch/label scopes, Map keys | 20 | 7 | 0 | 6 | 2 |
| n7 | the last routes; the consumer-side facet across three cells | 13 | 11 | 0 | 11 | 0 |
| n8 | follow-ups: TDZ at publish, each N route under R-Y, type operators without `typeof`, fixed rows, JSX `onClick`, functions in state | 35 | 6 | 0 | 4 | 2 |
| total | | 441 | 145 | **0** | **128** | 19 |

Attack programs: 437, of which 142 were accepted (one, n8-o-generic-ret-indexed, crashed the parser on my `<T extends …>` syntax). `fa4-k-h9-r2-kept-returns-field`, the switch control from round 4,
is now `[mut-nested]`. The 3 `k5-*` rows replace it. In mode A each throws at the drive's call
(`a() threw Attempted to assign to readonly property.`). In mode B it is `a() = 4`, `fn(3) -> fn(5)`. So the switch
takes effect.

Controls (checker skipped), 19: 7 from attack4 plus 12 new (`n3-ctl-*` 8, `n6-ctl-*` 2, `n8-z-ctl-*` 2), one for each rejected family
whose program would write if it ran. All 19 fire in mode B. In mode A, 6 of attack4's 7 fire and none of the 12 new
ones does. Registration stops each of those 12 at run time, so in mode B the checker is the only thing that stops them.

## Result: registration is load-bearing. One root, many routes

**Every one of the 128 programs silent in mode B has one root (N).** A kept function captures a local whose
*inferred* type holds a `Mut` that is not the local's own type (S5.8). R-K (S4.10) checks only the binding's own
type, so the capture is accepted. Registration freezes the capture when the function is published. Without it, the
captured local is never frozen. None is silent in mode A.

The spec's own "Not specified" S4.10 example is silent in mode B. The bullet says "At run time the write throws, since
the cell's value is frozen", which holds only with registration on:
```
k5-spec-not-specified-tuple
const a = () => { const xs = [0]; const t = [xs, 1] as const; return () => { t[0].push(1); return t[0].length; }; };
A: drive -> a() threw Attempted to assign to readonly property.
B: drive -> a() = 4     CHANGED a (value #1 of 1): fn(3) | E[] -> fn(5) | E[]
```
The run-sets rows closest to it are rejected today (`bun ../freeze-attack4/probe.ts p2.ts`): `h9-r2-tuple` is
`[mut-nested][mut-yield]` (a written annotation, in a generator) and `h9-r2-inferred` is `[mutating-method]`. I found
no existing set with an inferred holder captured by a kept function. That would explain the 0 the existing sets show
in mode B. I did not grep every set to confirm it.

### Inference routes that reach N (each accepted, silent in B, not in A)
Minimal form for each: `const a = () => { <setup> return () => { <write>; return <read>; }; };`

| route | setup | rows |
|---|---|---|
| tuple `as const` | `const xs = [0]; const t = [xs, 1] as const;` | n1-tuple*, n1-nested, n1-alias2, k5 |
| record `as const` | `const t = { k: xs } as const;` (a plain `{ v: xs }` is `[mut-capture]`) | n3-to-keyof-record, n5-op-asconst-* |
| conditional | `const t = xs.length > 0 ? xs : null;` | n1-tern*, n5-op-or-null, k5-ternary |
| `&&` / `\|\|` | `const t = xs.length > 0 && xs;` / `xs.length === 0 \|\| xs` | n5-op-and, n5-op-or |
| generic helper result | `const box = <T,>(v: T) => ({ v }); const t = box(xs);` / `[v, 0] as const` | n1-box*, n1-pairg* |
| helper result bound | `const g = () => [xs] as const; const t = g();` | n7-helper-result-* |
| `await` | `const t = await Promise.resolve([xs] as const);` in an async cell | n7-await-resolve |
| destructuring | `const [u] = [[xs] as const] as const;` | n7-nested-destr |
| `typeof` whole type | `const u: typeof t = t;` | n3-to-typeof-whole |
| Mut parameter of a nested function | `(xs: Mut<number[]>) => { const t = [xs] as const; return () => …; }` | n7-param-* |
| generic alias result | `type Box<T> = { readonly v: T }; const box = <T,>(v: T): Box<T> => ({ v });` (local helper) | n8-o-local-box-alias |
| annotated fresh local (S4.1) | `const out: number[] = [0]; const t = [out] as const;` (also Map, ternary) | n4-ann-in-*, n4-nested-local-tuple |
| default parameter | `return (y: Mut<number[]> = t[0]) => { y.push(1); … }` | n2-d-default-tuple |
Held values: arrays, `Map`, `Set`, records, `Error`. Typed arrays and `URL` in a tuple are `[mut-capture]` (S4.5's
typed-array/URL case).

### Keep forms and channels that carry N
Every keep form in n1 passes: an arrow returned, a record field, a method, a `function` declaration, a function
yielded by a generator cell, and two functions sharing the capture (writer and reader). Channels beyond a cell's
return:
- **memo** (S2.13): the stored result is deep-frozen, but a function's captures are not. `n3-memo-cross-cell-held`:
  cells b and c call `a(1)`, get the same stored function, and each sees the other's writes
  (`c: fn(3) -> fn(6)`, `b: fn(5) -> fn(9)`). Also `n3-memo-result-rec` and `n3-memo-ternary`.
- **a consumer cell** holds or wraps the producer's reader, or calls its writer: n3-consumer-*,
  n6-closure-over-cell-input-fn, n5-memo-key-fn (a memo keyed on a value read through N).
- **rerun** `n3-rr-tuple`: `bump` runs twice. `twice` shows 3 runs of `a` and of `b` (`#1 #2 #3`), so the consumer ran
  again. Each earlier delivered value changes in B (`a (value #1 of 3): fn(3) -> fn(6)`). In A every reading throws.
- **generators and async cells**: n5-gen-yield-reader-only, n5-gen-two-yields-same-t, n5-async-cell-returns-reader.
- **switch scope**: n6-switch-scope.
- **state cells**: a state cell whose initial value is an N function (`n8-state-init-n-fn`, `s: fn(3) -> fn(6)`), and
  one written by an action that a listener feeds an N function (`n8-state-set-n-fn`, `v (value #3 of 3): fn(7) -> fn(14)`).
  The action's argument and the state value are frozen. The function's captures are not.

### Consumer-side facet (a second checker gap, on top of N)
An **unannotated** cell input takes the producer's inferred type, including a `Mut` in a function's result. So the
consumer cell may write what the producer's function returns. S4.4 says a cell's exposed value is read with every
`Mut` removed. That holds for an annotated input (`(a: () => number[])` gives `[mutating-method]`, p1.ts) but not for
an unannotated one. The round-2 open item (a cell input typed `() => Mut<…>`) is now banned when written, and the same
type still arrives by inference.
```
n7-c-unann-two-hops
const a = () => { const xs = [0]; const t = [xs] as const; return () => t[0]; };
const b = (a) => a;
const c = (b) => { b().push(1); return 0; };
const r = (a: () => readonly number[]) => () => a().length;
A: error c: Attempted to assign to readonly property.
B: CHANGED a: fn([0]) -> fn([0,1])   CHANGED r: fn(1) -> fn(2)   CHANGED b: fn([0]) -> fn([0,1])
```
p1.ts: with no nested `Mut` in the producer (`const c: readonly number[] = xs; return () => c;`, a fresh return,
plain data), the unannotated consumer's write is `[mutating-method]`. So the facet needs N to have a shared target.
A fix for N alone would close it at run time. The checker would still accept a write that S4.4 says it rejects.

## What did not get through (in mode B)
Rejected (a static rule stood in for registration):
- Buffer views: `new Uint8Array(b)` over a local `ArrayBuffer` or `u.buffer`, in the same cell or across cells, gives
  `[member-write]`+`[mut-capture]` (n2-v-*, 10).
- Default parameter naming a Mut or plain alias, a Mut parameter captured directly, `this`, `arguments`: `[mut-capture]`,
  `[no-this]`, `[no-arguments]`. A generic `mk = <T,>(v) => () => v` gives `[iterator-capture]`.
- A helper whose inferred result is a Mut, captured uncalled or passed on: `[mut-capture]`. Its function-typed local
  forms are `[mut-nested]`.
- Generators: a plain alias used after a `yield`, `yield*` into an inner generator that writes the outer local, a
  spread of an inner generator, an inner generator kept: all `[mut-yield]` (n2-a-gen-*, n6-yieldstar-*, n6-inner-gen-*).
- Actions, state writes, `update`, listeners capturing N: `[action-capture]` (S6.9 stops them; n3-action-*, n3-state-*,
  n3-update-fn, n3-listener).
- The whole S4.1 allowlist (n4, 80): arrays, `Array<T>`, tuples, records, nested records, `Map`, `Set`, `Record`,
  `Uint8Array`, destructured, `let`, `snapshot`, `structuredClone`, `Array.from`, `slice`: every capture is
  `[mut-capture]`/`[let-capture]`, and every annotated destructure or parameter default is `[mutating-method]`. The
  allowlist rule leaks only when its local is put inside an inferred holder (route "annotated fresh local" above).
- `Object.entries`/`values`, `new Map([[k, xs]])`, `new Set([xs])`, `.map`/`.filter`/`.slice` of a tuple: the result is
  fresh, so Mut at its own type, and `[mut-capture]`/`[mutating-method]`. `find` is `[mutating-method]`. `concat`
  without a cast (n8-o-concat) is `[mutating-method]`: its result's elements are plain. A comma expression and a spread
  inside `as const` are unsupported.
- Type operators, without `typeof` (n8-o-*): an intersection, a conditional type and an indexed access type as a
  local's annotation are each unsupported, whether the local is written in the cell or by a kept function. A generic
  helper returning `T & {}` needs a cast (`[no-cast]`). The indexed-access helper did not parse (my `<T extends …>` in
  TSX). The n3-to-conditional/-indexed rows were `[mut-nested]` only because they used `typeof`. The generic alias
  `Box<T>` passes as a local helper (route table above). As a top-level cell it gave
  `[inject-unknown]`/`[cell-by-name]`, which was my program, not a finding.
- compile islands and pools: a function output is `[compile-boundary]` (n5-isl-fn-out, -pool-fn-out, -memo-fn-out).
  Data outputs and a memo inside a pooled island are accepted and not silent.
- JSX event props: `onClick` with a plain function is `[type]` (n8-jsx-onclick-fn), and an `Action` that captures N
  is `[action-capture]` (n8-jsx-onclick-action). The lowercase `onclick` forms were `[excess-property]`. So no JSX
  handler reaches N in this tree.

Accepted and not silent in B (17): no writer, or the write runs before publish (n2-p-plain-param-alias,
n2-l-let-fresh-alias, n2-a-return-fn-then-write, n2-l-ann-let-written-after-capture, n4-alias-of-ann-readalias,
n5-op-nullish, n5-op-tern-mut-readonly, n3-rr-memo-shared, n8-m-map-alias-async). The rerun with no N
(n8-rr-plain; n3-rr-plain was rejected for my `!`): `twice` shows 3 runs of `a` and of `b` with values
`fn(2)`, `fn(3)`, `fn(5)`, and each earlier value reads the same at the end. That is evidence for that row. An input function called at once, which stores nothing
(n2-a-input-fn, n6-async-reader-via-input). Worker data (n5-isl-pool-data, n5-isl-memo-in). memo's argument freeze
(n5-memo-arg-tuple: `sq(t)` freezes `t` and `xs` in place, so the later write throws in both modes). Two rows that are
N but that the detector cannot read (n3-held-promise-fn, n3-held-gen-fn): each call gives a new promise or generator
object. They are not evidence either way.

Early escape with no N (round 4's `sc-*` shape without the banned store): I found no channel out of an async cell
before it ends that can keep a function. An input function cannot store it (no `let`/`Mut` capture), state needs an
action (`[action-call]`), and memo forbids function parameters. Every store I could build is root N.

## Two more checks (n8)

**A function published before a binding it captures is initialised.** S4.6 says that publish throws, and the throw
comes from registration reading the captures. With registration off, the function would throw at first and then give
a value. The checker rejects every form I wrote as `[free-name]`: a `const` after a `yield`, a `readonly` const, a
record, a hoisted `function` declaration, after an `await`, and in a sync cell (n8-z-*, 7). The two controls fire in B
(`fn(throws Cannot access 'k' before initialization.) -> fn(5)`). In A the publish throws:
`error a: a function is published before a binding it captures is initialised`. So this run-time check also lives in
registration, and the checker covers it.

**Does the deep test see every N route?** R-Y already uses `owMutDeep`. Each route, put in a generator that yields a
reader and then writes the holder (tuple, ternary, `&&`, `||`, `as const` record, generic box, helper result, whole
`typeof`, nested destructuring, a Mut parameter in an inner generator), is `[mut-yield]`. The `await` route in an async
generator is `[mut-await]` (n8-y-*, 11 of 11 rejected). So the deep test sees each route found here. This is a proxy:
R-K with the deep test was not built or run.

## Verdict

Deleting registration on this tree is **not safe**. With it off, 128 accepted programs change silently. In this
batch the mode-A freeze stopped every one, and none needs a capability or a foreign cell. The shortest is the spec's
own Not-specified example.

On this evidence registration has two jobs that show up. The first is N: a capture whose inferred type holds a `Mut`
below its own type. The second is the publish-before-initialisation throw, which the checker already covers as
`[free-name]` (n8-z).
Closing N statically would make the 128 rows fail to check. In this tree R-K checks only the binding's own type.
The brief's "exclusions on Mut-holding locals … in kept functions" holds for R-Y/R-A (yield and await), not for
kept functions. The fix is R-K using the deep test
(`owMutDeep`/`owLocalHoldsMut`, already used by R-Y/R-A) on a kept function's captures. Round 2 stopped short of this
on `mdHookOf` and 11 class-A cells. Also needed: the inferred type of an unannotated cell input should have `Mut`
removed inside function results (the consumer facet), or N stays reachable through S4.4.

Residual risk if both are done and registration is then deleted:
- The 437 programs here cover the routes I could find, not all of them. Inference makes a nested Mut wherever a
  type is built from a `Mut` value, so a route list is not a proof. The deep test has to be on the type, not on the
  syntax of the initializer.
- A promise or generator that a held function returns is not read by this detector (2 rows).
- `holdsWith`'s depth cap of 12 (m1 step 1 open item) and `owMutDeep`'s depth cap would be what R-K relies on.
- The fix was checked only by proxy (R-Y on the same routes, n8-y), not built.
- Not tried: `WeakMap`/`WeakSet` holders, the worker copy of `memo` beyond one pooled island, a function crossing to
  another module.
- Out of scope, as briefed: capability readers, the shared FetchResponse body, foreign cells.
