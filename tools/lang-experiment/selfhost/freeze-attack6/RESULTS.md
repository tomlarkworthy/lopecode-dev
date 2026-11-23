# Freeze attack, round 6 (2026-11-23, 03:28–03:55 CET; `date` at start 03:28:41, full run 03:48:27–03:48:37, freeze-attack3/run.ts pass 03:52)

**Read this first.** All 133 silent programs below are counted by this folder's `run.ts`, which adds a drive-based
check. Through the prescribed `../freeze-attack3/run.ts` (CHANGED lines only) the same 288 programs give
**silent 0 in both modes** (fa3run-a.txt, fa3run-b.txt). The harness serialises a cell's value when it first arrives,
and in every P program the write lands before any other cell receives the value: inside the same action call, before
it commits, or inside the cell body that called the memoised function. So P is a change between the hand-off
(`s.set`, an action argument, a memo argument; each a publish by S4.6) and the first read by another cell. It is
observed by the publishing body itself (`a1-readback-*`, `a2-prog-*`, `m0-P-memo` compute it in SoundScript) or by
the drive. No second cell was shown holding the value before and after the write. I tried for that form and did not
reach it: the only body that spans turns and may use a Mut across them is an async cell body (S5.7), and its memo
route needs another cell to hold the key `r`, which only the async cell has until it returns; generators are
`[mut-yield]`; an action body is synchronous. Whether P meets "a value another cell holds differs from what it was
given" (the state cell holds f and was given f when f() was 1) or only the claim's wider wording ("passed to an
action/state/memo … no accepted program can change it or observe it change") is for the reader to judge.

Target: the tree with the S4.10 deep kept-capture rule (`owMutDeep`/`owLocalHoldsMut`) and `owStripMut`. Mode A =
shipped. Mode B = `SS_MEASURE_REG=0` (closure registration off, deep freeze kept). Nothing outside this folder was
written; build.ts / verify.ts were not run.

Rerun: `./runall.sh` (sets c0 m0 a1..a7 through `run.ts`, which wraps `../freeze-attack3/harness.ts` runCand;
mode A -> out-a.txt, mode B -> out-b.txt; check-only probes -> probe-checker.txt, probe-foreign.txt), then
`bun tally.ts` (per-set table, tally.txt) and `bun appendix.ts > silent-programs.txt` (every silent program in full).
`run.ts` counts a program silent when the harness prints a CHANGED line, or when the program's drive prints a line
containing DIFF. A drive compares what a value gave when it was published (recorded by the program itself, in a state
cell `lg` or in the cell's value) with what the holder gives after the run. A drive whose action call throws reports
"threw" and is not counted.

## Counts (03:48 run; summary.txt, tally.txt)

```
## out-a.txt (shipped)                         ## out-b.txt (SS_MEASURE_REG=0)
-- controls 38, ran 38, fired 11               -- controls 38, ran 38, fired 38
-- 288 candidates, accepted 195, silent 0      -- 288 candidates, accepted 195, silent 133
```
| set | what | programs | accepted | silent A | silent B | controls | fired A | fired B |
|---|---|---|---|---|---|---|---|---|
| c0 | round 5's c0 (fa4 controls, switch control, k5 rows checker on) + 24 of round 5's silent N rows, checker skipped | 4 | 0 | 0 | 0 | 28 | 6 | 28 |
| m0 | the two minimal forms below | 2 | 2 | 0 | 2 | 0 | 0 | 0 |
| a1 | P through an action: 11 holders x 13 writes under `s.set`, and 15 channels x 4 holders | 93 | 93 | 0 | 92 | 2 | 1 | 2 |
| a2 | memo: a function in an argument by width; R-M blind spots with data | 33 | 32 | 0 | 21 | 2 | 1 | 2 |
| a3 | Mut in a function's parameter across cells (callbacks, methods, rest, default, destructured, generic, state, action) | 40 | 23 | 0 | 3 | 2 | 1 | 2 |
| a4 | type operators and escape routes (50), and P on the holders they accept (10) | 60 | 14 | 0 | 8 | 0 | 0 | 0 |
| a5 | listeners, JSX onClick, Action in state, update chains, events, islands | 20 | 13 | 0 | 5 | 2 | 1 | 2 |
| a6 | generators across yield, async across await, memo in an async body | 19 | 9 | 0 | 2 | 2 | 1 | 2 |
| a7 | depth limits: 11/12/13 generic expansions, 5/199/201 levels, recursive alias | 17 | 9 | 0 | 0 | 0 | 0 | 0 |
| total | | 288 | 195 | **0** | **133** | 38 | 11 | 38 |

No program's verdict differs between modes. The same sets through `../freeze-attack3/run.ts`: A `controls 38, fired 7`,
`288 candidates, accepted 195, silent 0`; B `controls 38, fired 30`, `silent 0`. It counts only CHANGED lines, so the 8
drive-only controls (the a-set `let` and direct-Mut controls) do not fire there; the 28 c0 controls do (B) and 6 of the
c0 controls plus 1 harness-visible a6 control fire in A. a4 and a7 have no controls of their own; their zero rests on
c0's round-5 N controls, which fire in B. Check-only rows besides these: 122 in probe-checker.txt (q1–q6, q8, q9;
q7 and q10 are also run as a4 / quoted below) and 21 foreign rows in probe-foreign.txt.

Controls: all 38 fire in B, 11 in A. The 24 round-5 N rows (c0, `fa5-ctl-*`) fire in B and not in A, so the harness
sees the round-5 cause when the checker is skipped; with the checker on, the three k5 rows and the fa4 switch row are
now rejected (`[mut-capture]`, `[mut-nested]`). Each a-set has one control that fires in both modes (a `let` written
after the publish) and one that fires only in B (a Mut captured directly, published, then written).

## Result: one cause, P. Silent in B, none in A

**P: a value is published in the middle of a function body, and the body then writes a Mut that a read-only const
captured by a published function names.** S4.10 permits capturing `const c: readonly number[] = xs` for a Mut local
`xs`. In a cell body every write precedes the publish (the return), which is why the rows of rounds 4–5 of that shape
were not silent. Two bodies publish before they end:

- an **action body**: `s.set(v)`, `s.update(f)`, and an action called with arguments each deep-freeze and publish
  (S4.6) while the body continues;
- **any body calling a memoised function**: the arguments are published on a miss (S2.13). `[memo-pure]` forbids a
  parameter type that may hold a function, but a record bound to a local reaches `{ readonly n: number }` by width
  subtyping, so a function rides inside the argument. (An object literal written in the call is `[excess-property]`.)

In mode A registration makes `deepFreeze` walk the published function's captures, so `xs` is frozen at the publish and
the later write throws (`Attempted to assign to readonly property.`, `set on a frozen Map …`). In mode B the function is
not walked and the write lands.

### Minimal form, action (m0-P-action)
```
const s = () => state<() => number>(() => -1);
const put = (s: State<() => number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); xs.push(1); }) });
const v = (s: () => number) => s;
A: drive -> go() threw Attempted to assign to readonly property.
B: drive -> DIFF written when f() was 1; v's f() is 2
```
The program can observe the change itself: `a1-readback-*` records `f()` before the write and `read(s)()` after it, in the same call:
`set-time 201 read(s)() 304` for the array holder (B). The change happens before the call commits, so a reader cell never sees the pre-write value; what differs
is the value the state cell was given and the value it holds.

### Minimal form, memo (m0-P-memo)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const xs = [0]; const c: readonly number[] = xs; const r = { n: 1, f: () => c.length }; sq(r); const before = r.f(); xs.push(1); return [before, r.f()] as const; };
A: error a: Attempted to assign to readonly property.
B: drive -> DIFF r.f() after the memo took r: 1, after the write: 2
```
A later call with the same key gets the stored `r`, whose `f` now gives 2 (`a2-cross-hit-*`, from another cell `b`;
that drive calls the hidden `f` from JS, since `b`'s type does not show it). The same holds in an async cell across an
`await` (`a6-async-memo-width`, `-hit-other`).

### What carries P (each accepted, silent in B, throws in A)
- Holders (a1): array (13 writes: push, index, pop, splice, unshift, fill, reverse, sort, shift, copyWithin,
  `length = 0`, `+=`, `++`), `Map` (set, delete, clear), `Set` (add, delete, clear), record field (`=`, `++`, `+=`),
  optional field (`delete`, `=`), `Error.message`, a record holding the Mut, an `as const` tuple rebound under its
  written type, a record holding a Map, an array of records, a second read-only alias. a4 adds index-signature,
  optional-member, `T | null`, `unknown`, `typeof c`, and `Map<string, readonly number[]>` holders.
- Channels (a1, a3, a5): `s.set(f)`, `s.update(() => f)`, `{ f }`, a method `{ f() {…} }`, `[f]`, a `function`
  declaration, a wrapper `() => f()`, a record wider than the state type, `new Map([['k', f]])`, an inner action's
  argument (`put0(f)`, `put0({ f })`), `const st = s.set; st(f)`, an `update` chain read back with `read`, a listener
  delivering events (`on(tick, put)`), a JSX `onClick` action clicked from the drive.
- Writers: directly, through a helper called later, inside `forEach`, in the next turn of a loop, inside a nested
  function of the action, through a Mut parameter of a helper (`mk([0])`), and through another cell's function: a
  callback typed `(x: Mut<number[]>) => void` that a consumer passes to a producer action (`a3-cb-P`), a writer cell
  (`a3-cb-P-writer-cell`), and a producer's `take(x: Mut<…>)` returning a reader over a read-only alias of its
  parameter (`a3-cb-P-take-reader`).

Data instead of a function is not silent: `s.set(c)`, `put0(xs)`, `sq({ n: 1, c })` freeze `xs` in place, and the
write throws in both modes (a1-data-set-push, a5-actarg-data, a2-data-*, a6-async-memo-data).

What a fix would need (not built, not measured): the R-M rule of S2.13 extended from "a Mut named in a memo argument"
to "a Mut that a read-only const names, when a function capturing that const — or a value reaching such a function —
has been given to `set`, `update`, an action call or a memoised call earlier in the same body". The alternative is to
keep registration. A third: forbid a function in a memo argument by its runtime content rather than its static type
(closes the memo half only).

## The admitted weak spots: what did not get through

- **Mut in a function's parameter (a3, q1, q4, q5).** Every route that would hand a read-only or published value to a
  Mut parameter was `[type]`: contravariant parameters, method-shaped callbacks (`{ f(x): void }` is not bivariant),
  optional and rest parameters, generic `T` with both orders of the callback and data arguments, tuple-packed
  arguments, explicit `<Mut<…>>` (`[mut-nested]`), a union of a Mut-taking and a read-only-taking function (a call of
  the union is `[type]`, in every form: ternary, `||`, `??`, array element, record field, across cells), aliases on
  both sides, and the `seen` set reused across a union scan (q1 union-seen; rejected). The callback forms that were
  accepted (fresh value, own Mut parameter, `snapshot`, default callback, destructured, rest, method, generic over a
  fresh local, a writer in state or in an action argument) write only values made in the call. They are silent only
  when combined with P. So the "Not specified" bullet's argument ("that value is fresh or one the calling cell
  gave") holds as stated, and P is how the calling cell gives one it has already published.
- **Type operators (a4, q7).** Type predicates and assertion functions to `Mut` (`[mut-nested]`), conditional types
  (`[mut-nested]`), mapped types, indexed access, `infer`, `satisfies`, template literals, `Object.assign`,
  labelled statements, symbol keys (unsupported), `ReturnType`/`Awaited`/`ReadonlyMap`/`Readonly` (`[unknown-type]`),
  `typeof xs` (`[mut-capture]`), `keyof typeof t` (`[mut-nested]`), enum (`[no-enum]`), `WeakRef`/`Proxy`/`WeakMap`/
  `Date` (`[new-non-intrinsic]`), `Reflect`/`eval`/`Function` (`[free-name]`), `var` (`[no-var]`), `arguments`,
  `this`, `.bind`, `Array.prototype.push.call`, `Object.defineProperty`/`setPrototypeOf` (`[banned-member]`),
  JSON round trip (`[no-member]`), `find`/`at`/`Array.of`/`structuredClone` results (`[mut-capture]`), generator
  `TNext` typed Mut and `TReturn` holding a Mut (`[mut-yield]`), a thenable (`[no-member]`). No kept function wrote a
  captured value in either mode. The mapped-type acorn crash named in the brief did not reproduce with my two mapped
  forms (both unsupported).
- **Depth limits (a7).** An inferred holder through 11, 12, 13 generic `box` calls and `as const` nests of 5, 199, 201
  levels are each `[mut-capture]`. No route under the limits was accepted with a Mut inside.
- **Generators and async (a6, q6).** Every yield-then-write, helper-after-yield, `try/finally`, `xs.push(yield f)`,
  inner generator and async generator form is `[mut-yield]`; a nested async helper is `[mut-await]`. A memo call across
  a `yield` is `[mut-yield]`. Only the async cell body (S5.7 lets it) carries P, through memo.
- **Actions/state shapes without P (a5).** An Action stored in state that captures a const (`[action-capture]`), an
  element with an action prop in state (`[no-member]`), a state value read in an action (`[action-capture]`), an island
  with a function input (`[compile-boundary]`), an island with data, a listener closing over a cell input: none silent.
- **Switch-case function declarations** (q10): a declaration in a case would skip its own registration when another
  case runs; the checker rejects it (`[switch-declaration]`), so this mode-A idea did not get through.
- **URLSearchParams in mode A** (q11): `deepFreeze` leaves a URLSearchParams unfrozen (kind 0), so a write after
  `s.set(u)` would be silent in A. `append`, `set`, `delete`, `sort` and `url.searchParams.set` are each unsupported
  in the checker, so no write to one is accepted.
- **Mode A.** I looked for a published function or value the freeze does not reach: unregistered functions (getters,
  setters, computed methods: unsupported; switch declarations: rejected), `URLSearchParams` (not frozen, but no
  writing method is supported), native `Map` from `structuredClone`/`snapshot` (copied at the boundary, or the publish
  throws), typed arrays (copied, or the publish throws). None produced a silent.

## Foreign values (check only; probe-foreign.txt)

`lite/browser/run.ts` has no foreign cells. `../../run.ts` loadPort does (foreign.d.ts + foreign.runtime.ts in a
port directory), but it transpiles into `tools/lang-experiment/.build/` (outside this folder) and imports plain
transpiled cells, with no closure registration (run.ts:69-86), so it was not used. These rows are verdicts, not
observations. The two accepted foreign-result writes (below) would land in both modes if the foreign value is not
frozen: nothing registers a foreign function, so neither mode's freeze reaches behind one. Not run.
- Accepted: an unannotated input from a foreign `{ readonly get: () => Mut<number[]> }` written as `lib.get().push(1)`
  (f-get-mut-result), and a foreign `mk(): { readonly t: Mut<number[]> }` written as `mk().t.push(1)`
  (f-fn-returns-rec-mut). A `Mut` in a foreign function's result, or in a record field of that result, is not removed.
  A foreign `const lib: { t: Mut<…> }` is `[mut-cell]`; annotating the input `() => number[]` is `[mutating-method]`.
- Accepted: passing a function over a read-only alias, or the Mut itself, to a foreign function and then writing the
  Mut later in the body (f-take-fn-midbody, f-take-data-midbody, f-take-fn-kept, f-mut-param-alias-kept). This is P
  with a foreign receiver; with data it is owner.ts's open B6.
- Accepted: a foreign record with a function field given to a memo by width (f-memo-of-foreign); awaiting a foreign
  thenable (f-then-foreign).

Checker path: every verdict here is `lite/infer/attack/run-sets.ts` verdictOf -> `lite/core.ts` checkSources, which
parses with `lite/acorn/index.ts` parseTree (core.ts:11). So "the mapped-type crash did not reproduce" is for that
path and my two mapped forms only.

## Crashes

None in the runner (`harness crashes 0` in both modes) or the checker. One parse error was mine: `<T extends Mut<…>>`
in TSX (q7 generic-bound; with `<T extends …,>` it is `[mut-nested]`).

## Over-rejections of ordinary-looking code (probe-checker.txt, q8/q9)

| program | checker | suggested fix works? |
|---|---|---|
| `[1, 2].reduce((acc: number, v: number) => acc + v, 0)` | `[type] parameter number does not accept unknown` | no fix given; `reduce<readonly number[]>(…)` with a type argument is accepted |
| `[1,2].reduce((acc: readonly number[], v: number) => [...acc, v], e)` | same `[type]` | as above |
| `const mk = <T,>(x: T) => () => x` | `[iterator-capture]`: "copy it into an array … ([...x])" | no: `[...x]` does not apply to a `T`; `const c = [x]` gives `[iterator-capture][mut-capture]` |
| capturing `const id = (x: Mut<number[]>) => x` | `[mut-capture]` "id, whose type holds Mut" (it holds none at run time) | yes: `const c: (x: Mut<number[]>) => number[] = id` is accepted |
| capturing `new URLSearchParams(…)` or a read-only alias of one | `[mut-capture]` "… (const c: URLSearchParams = x.slice())" | no: `slice` is unsupported on URLSearchParams; `new URLSearchParams(u.toString())` works |
| capturing a typed array or `const c: Uint8Array = u.slice()` | `[mut-capture]` "capture a read-only copy (const c: Uint8Array = x.slice())" | no: the suggested form is itself rejected (an annotated fresh typed array is writable by S4.1) |
| 13 nested `B<…>` of plain data captured | `[mut-capture]` "nested more deeply than the checker looks"; suggests rebinding under the written type | no: S5.8, rebinding past the limit does not clear (a7-rebind-13) |
| `const t: Record<string, readonly number[]> = { k: [1] }` captured | `[mut-capture]` (S4.1 makes `Record` writable) | yes: `const c: { [k: string]: number[] } = t` |
| `function* () { yield { k: 1 }; }` as `Events<{ readonly k: number }>` or `Events<{ k: number }>` | `[inject-events]` "not a sync generator cell yielding { k: number }" | no fix given; binding `const e: { readonly k: number }` before the yield, or annotating `Generator<…>`, is accepted |
| calling `n > 0 ? (y) => 1 : (y) => 'x'` | `[type] call of …` (a union of functions differing in result) | none; same result types are accepted |

## Not attacked

- Foreign cells at run time (the browser runner has none); the foreign rows are verdicts only.
- A function crossing to another module; `memo` inside a worker pool beyond round 5's single island; WeakMap/WeakSet
  (not constructible); DOM nodes; cell edits and reruns (no redefinition was driven); multi-commit timing and the
  "Not specified" state-while-recomputing item; capability readers and the FetchResponse body (out of scope).
- P's fix was not built, so no fix was measured. The 133 rows are routes I could find for one cause, not a bound on
  routes.
- Mode A: 0 silent here is not a proof; the search for unwalked values covered the kinds listed above only.

## Files

Sets: c0.ts m0.ts a1.ts..a7.ts (t0.ts holds the action drive); checker probes q1–q11, foreign f1.ts via fprobe.ts.
Outputs: out-a.txt, out-b.txt, fa3run-a.txt, fa3run-b.txt, summary.txt, tally.txt, probe-checker.txt, probe-foreign.txt, silent-programs.txt
(every silent program in full, 133, with its mode-B drive line; reproduced below).

## Appendix: every program silent in mode B

### m0-P-action (m0.ts)
```
const s = () => state<() => number>(() => -1);
const put = (s: State<() => number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); xs.push(1); }) });
const v = (s: () => number) => s;
```
B: drive -> DIFF written when f() was 1; v's f() is 2

### m0-P-memo (m0.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const xs = [0]; const c: readonly number[] = xs; const r = { n: 1, f: () => c.length }; sq(r); const before = r.f(); xs.push(1); return [before, r.f()] as const; };
```
B: drive -> DIFF r.f() after the memo took r: 1, after the write: 2

### a1-set-arr-push (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-set-arr-index (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs[0] = 5; }) });
```
B: drive -> DIFF given 201 holds 216

### a1-set-arr-pop (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs.pop(); }) });
```
B: drive -> DIFF given 201 holds 100

### a1-set-arr-splice (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs.splice(0, 1); }) });
```
B: drive -> DIFF given 201 holds 101

### a1-set-arr-unshift (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs.unshift(3); }) });
```
B: drive -> DIFF given 201 holds 328

### a1-set-arr-fill (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs.fill(4); }) });
```
B: drive -> DIFF given 201 holds 216

### a1-set-arr-reverse (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs.reverse(); }) });
```
B: drive -> DIFF given 201 holds 203

### a1-set-arr-sort (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs.sort((p, q) => q - p); }) });
```
B: drive -> DIFF given 201 holds 203

### a1-set-arr-shift (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs.shift(); }) });
```
B: drive -> DIFF given 201 holds 101

### a1-set-arr-copyWithin (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs.copyWithin(0, 1); }) });
```
B: drive -> DIFF given 201 holds 204

### a1-set-arr-length0 (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs.length = 0; }) });
```
B: drive -> DIFF given 201 holds 0

### a1-set-arr-compound (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs[1] += 7; }) });
```
B: drive -> DIFF given 201 holds 208

### a1-set-arr-incr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs[0]++; }) });
```
B: drive -> DIFF given 201 holds 204

### a1-set-map-set (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); s.set(f); lg.set(f()); m.set('k', 1); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-set-map-set-a (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); s.set(f); lg.set(f()); m.set('a', 5); }) });
```
B: drive -> DIFF given 11 holds 15

### a1-set-map-delete (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); s.set(f); lg.set(f()); m.delete('a'); }) });
```
B: drive -> DIFF given 11 holds 0

### a1-set-map-clear (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); s.set(f); lg.set(f()); m.clear(); }) });
```
B: drive -> DIFF given 11 holds 0

### a1-set-set-add (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const st = new Set<number>([1]); const c: Set<number> = st; const f = () => c.size; s.set(f); lg.set(f()); st.add(2); }) });
```
B: drive -> DIFF given 1 holds 2

### a1-set-set-delete (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const st = new Set<number>([1]); const c: Set<number> = st; const f = () => c.size; s.set(f); lg.set(f()); st.delete(1); }) });
```
B: drive -> DIFF given 1 holds 0

### a1-set-set-clear (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const st = new Set<number>([1]); const c: Set<number> = st; const f = () => c.size; s.set(f); lg.set(f()); st.clear(); }) });
```
B: drive -> DIFF given 1 holds 0

### a1-set-rec-assign (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; s.set(f); lg.set(f()); o.n = 5; }) });
```
B: drive -> DIFF given 1 holds 5

### a1-set-rec-incr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; s.set(f); lg.set(f()); o.n++; }) });
```
B: drive -> DIFF given 1 holds 2

### a1-set-rec-compound (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; s.set(f); lg.set(f()); o.n += 2; }) });
```
B: drive -> DIFF given 1 holds 3

### a1-set-opt-delete (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o: { n?: number } = { n: 1 }; const c: { readonly n?: number } = o; const f = () => c.n ?? -1; s.set(f); lg.set(f()); delete o.n; }) });
```
B: drive -> DIFF given 1 holds -1

### a1-set-opt-assign (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o: { n?: number } = { n: 1 }; const c: { readonly n?: number } = o; const f = () => c.n ?? -1; s.set(f); lg.set(f()); o.n = 9; }) });
```
B: drive -> DIFF given 1 holds 9

### a1-set-err-message (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; s.set(f); lg.set(f()); e.message = 'longer'; }) });
```
B: drive -> DIFF given 1 holds 6

### a1-set-nest-push (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const r = { t: xs }; const c: { readonly t: readonly number[] } = r; const f = () => c.t.length; s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a1-set-tuple-push (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const t = [xs, 1] as const; const c: readonly [readonly number[], 1] = t; const f = () => c[0].length; s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a1-set-recmap-set (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>(); const c: { readonly m: Map<string, number> } = { m }; const f = () => c.m.size; s.set(f); lg.set(f()); m.set('k', 1); }) });
```
B: drive -> DIFF given 0 holds 1

### a1-set-arrrec-assign (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: readonly { readonly n: number }[] = [o]; const f = () => c[0]?.n ?? -1; s.set(f); lg.set(f()); o.n = 4; }) });
```
B: drive -> DIFF given 1 holds 4

### a1-set-spreadless-push (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const d: readonly number[] = c; const f = () => d.length; s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a1-update-arr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.update(() => f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-rec-arr (a1.ts)
```
const s = () => state<{ readonly f: () => number }>({ f: () => -1 });
const lg = () => state(-1);
const v = (s: { readonly f: () => number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly f: () => number }>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set({ f }); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-method-arr (a1.ts)
```
const s = () => state<{ readonly f: () => number }>({ f: () => -1 });
const lg = () => state(-1);
const v = (s: { readonly f: () => number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly f: () => number }>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const o2 = { f() { return c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); } }; s.set(o2); lg.set(o2.f()); xs.push(1); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-arr-arr (a1.ts)
```
const s = () => state<readonly (() => number)[]>([]);
const lg = () => state(-1);
const v = (s: readonly (() => number)[]) => s;
const w = (lg: number) => lg;
const put = (s: State<readonly (() => number)[]>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set([f]); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-decl-arr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; function f() { return c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); } s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-wrap-arr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); const g = () => f() + 0; s.set(g); lg.set(g()); xs.push(1); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-width-arr (a1.ts)
```
const s = () => state<{ readonly n: number }>({ n: 0 });
const lg = () => state(-1);
const v = (s: { readonly n: number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly n: number }>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); const r = { n: 0, f }; s.set(r); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-mapholder-arr (a1.ts)
```
const s = () => state<Map<string, () => number>>(new Map());
const lg = () => state(-1);
const v = (s: Map<string, () => number>) => s;
const w = (lg: number) => lg;
const put = (s: State<Map<string, () => number>>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(new Map([['k', f]])); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-helper-write-arr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const wr = () => { xs.push(1); }; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); wr(); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-foreach-write-arr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); [1].forEach(() => { xs.push(1); }); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-loop-arr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); for (let i = 0; i < 2; i++) { if (i === 0) { s.set(f); lg.set(f()); } else { xs.push(1); } } }) });
```
B: drive -> DIFF given 201 holds 304

### a1-nested-fn-arr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const mk = () => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); lg.set(f()); xs.push(1); }; mk(); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-actarg-arr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });
const put = (put0: Action<[() => number]>, lg: State<number>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); put0(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 201 holds 304

### a1-readback-arr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state<readonly number[]>([]);
const w = (lg: readonly number[]) => lg;
const put = (s: State<() => number>, lg: State<readonly number[]>) => ({ go: action(() => { const xs = [0, 1]; const c: readonly number[] = xs; const f = () => c.length * 100 + c.reduce((p, q) => p * 3 + q, 0); s.set(f); const before = f(); xs.push(1); lg.set([before, read(s)()]); }) });
```
B: drive -> DIFF set-time 201 read(s)() 304

### a1-mutparam-arr (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const mk = (xs: Mut<number[]>) => { const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); xs.push(1); }; mk([0]); }) });
```
B: drive -> DIFF given 1 holds 2

### a1-update-map (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); s.update(() => f); lg.set(f()); m.set('k', 1); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-rec-map (a1.ts)
```
const s = () => state<{ readonly f: () => number }>({ f: () => -1 });
const lg = () => state(-1);
const v = (s: { readonly f: () => number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly f: () => number }>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); s.set({ f }); lg.set(f()); m.set('k', 1); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-method-map (a1.ts)
```
const s = () => state<{ readonly f: () => number }>({ f: () => -1 });
const lg = () => state(-1);
const v = (s: { readonly f: () => number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly f: () => number }>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const o2 = { f() { return c.size * 10 + (c.get('a') ?? 0); } }; s.set(o2); lg.set(o2.f()); m.set('k', 1); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-arr-map (a1.ts)
```
const s = () => state<readonly (() => number)[]>([]);
const lg = () => state(-1);
const v = (s: readonly (() => number)[]) => s;
const w = (lg: number) => lg;
const put = (s: State<readonly (() => number)[]>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); s.set([f]); lg.set(f()); m.set('k', 1); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-decl-map (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; function f() { return c.size * 10 + (c.get('a') ?? 0); } s.set(f); lg.set(f()); m.set('k', 1); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-wrap-map (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); const g = () => f() + 0; s.set(g); lg.set(g()); m.set('k', 1); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-width-map (a1.ts)
```
const s = () => state<{ readonly n: number }>({ n: 0 });
const lg = () => state(-1);
const v = (s: { readonly n: number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly n: number }>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); const r = { n: 0, f }; s.set(r); lg.set(f()); m.set('k', 1); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-mapholder-map (a1.ts)
```
const s = () => state<Map<string, () => number>>(new Map());
const lg = () => state(-1);
const v = (s: Map<string, () => number>) => s;
const w = (lg: number) => lg;
const put = (s: State<Map<string, () => number>>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); s.set(new Map([['k', f]])); lg.set(f()); m.set('k', 1); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-helper-write-map (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const wr = () => { m.set('k', 1); }; const f = () => c.size * 10 + (c.get('a') ?? 0); s.set(f); lg.set(f()); wr(); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-foreach-write-map (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); s.set(f); lg.set(f()); [1].forEach(() => { m.set('k', 1); }); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-loop-map (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); for (let i = 0; i < 2; i++) { if (i === 0) { s.set(f); lg.set(f()); } else { m.set('k', 1); } } }) });
```
B: drive -> DIFF given 11 holds 21

### a1-nested-fn-map (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const mk = () => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); s.set(f); lg.set(f()); m.set('k', 1); }; mk(); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-actarg-map (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });
const put = (put0: Action<[() => number]>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); put0(f); lg.set(f()); m.set('k', 1); }) });
```
B: drive -> DIFF given 11 holds 21

### a1-readback-map (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state<readonly number[]>([]);
const w = (lg: readonly number[]) => lg;
const put = (s: State<() => number>, lg: State<readonly number[]>) => ({ go: action(() => { const m = new Map<string, number>([['a', 1]]); const c: Map<string, number> = m; const f = () => c.size * 10 + (c.get('a') ?? 0); s.set(f); const before = f(); m.set('k', 1); lg.set([before, read(s)()]); }) });
```
B: drive -> DIFF set-time 11 read(s)() 21

### a1-mutparam-map (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const mk = (xs: Mut<number[]>) => { const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); xs.push(1); }; mk([0]); }) });
```
B: drive -> DIFF given 1 holds 2

### a1-update-rec (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; s.update(() => f); lg.set(f()); o.n = 5; }) });
```
B: drive -> DIFF given 1 holds 5

### a1-rec-rec (a1.ts)
```
const s = () => state<{ readonly f: () => number }>({ f: () => -1 });
const lg = () => state(-1);
const v = (s: { readonly f: () => number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly f: () => number }>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; s.set({ f }); lg.set(f()); o.n = 5; }) });
```
B: drive -> DIFF given 1 holds 5

### a1-method-rec (a1.ts)
```
const s = () => state<{ readonly f: () => number }>({ f: () => -1 });
const lg = () => state(-1);
const v = (s: { readonly f: () => number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly f: () => number }>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const o2 = { f() { return c.n; } }; s.set(o2); lg.set(o2.f()); o.n = 5; }) });
```
B: drive -> DIFF given 1 holds 5

### a1-arr-rec (a1.ts)
```
const s = () => state<readonly (() => number)[]>([]);
const lg = () => state(-1);
const v = (s: readonly (() => number)[]) => s;
const w = (lg: number) => lg;
const put = (s: State<readonly (() => number)[]>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; s.set([f]); lg.set(f()); o.n = 5; }) });
```
B: drive -> DIFF given 1 holds 5

### a1-decl-rec (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; function f() { return c.n; } s.set(f); lg.set(f()); o.n = 5; }) });
```
B: drive -> DIFF given 1 holds 5

### a1-wrap-rec (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; const g = () => f() + 0; s.set(g); lg.set(g()); o.n = 5; }) });
```
B: drive -> DIFF given 1 holds 5

### a1-width-rec (a1.ts)
```
const s = () => state<{ readonly n: number }>({ n: 0 });
const lg = () => state(-1);
const v = (s: { readonly n: number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly n: number }>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; const r = { n: 0, f }; s.set(r); lg.set(f()); o.n = 5; }) });
```
B: drive -> DIFF given 1 holds 5

### a1-mapholder-rec (a1.ts)
```
const s = () => state<Map<string, () => number>>(new Map());
const lg = () => state(-1);
const v = (s: Map<string, () => number>) => s;
const w = (lg: number) => lg;
const put = (s: State<Map<string, () => number>>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; s.set(new Map([['k', f]])); lg.set(f()); o.n = 5; }) });
```
B: drive -> DIFF given 1 holds 5

### a1-helper-write-rec (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const wr = () => { o.n = 5; }; const f = () => c.n; s.set(f); lg.set(f()); wr(); }) });
```
B: drive -> DIFF given 1 holds 5

### a1-foreach-write-rec (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; s.set(f); lg.set(f()); [1].forEach(() => { o.n = 5; }); }) });
```
B: drive -> DIFF given 1 holds 5

### a1-loop-rec (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; for (let i = 0; i < 2; i++) { if (i === 0) { s.set(f); lg.set(f()); } else { o.n = 5; } } }) });
```
B: drive -> DIFF given 1 holds 5

### a1-nested-fn-rec (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const mk = () => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; s.set(f); lg.set(f()); o.n = 5; }; mk(); }) });
```
B: drive -> DIFF given 1 holds 5

### a1-actarg-rec (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });
const put = (put0: Action<[() => number]>, lg: State<number>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; put0(f); lg.set(f()); o.n = 5; }) });
```
B: drive -> DIFF given 1 holds 5

### a1-readback-rec (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state<readonly number[]>([]);
const w = (lg: readonly number[]) => lg;
const put = (s: State<() => number>, lg: State<readonly number[]>) => ({ go: action(() => { const o = { n: 1 }; const c: { readonly n: number } = o; const f = () => c.n; s.set(f); const before = f(); o.n = 5; lg.set([before, read(s)()]); }) });
```
B: drive -> DIFF set-time 1 read(s)() 5

### a1-mutparam-rec (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const mk = (xs: Mut<number[]>) => { const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); xs.push(1); }; mk([0]); }) });
```
B: drive -> DIFF given 1 holds 2

### a1-update-err (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; s.update(() => f); lg.set(f()); e.message = 'longer'; }) });
```
B: drive -> DIFF given 1 holds 6

### a1-rec-err (a1.ts)
```
const s = () => state<{ readonly f: () => number }>({ f: () => -1 });
const lg = () => state(-1);
const v = (s: { readonly f: () => number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly f: () => number }>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; s.set({ f }); lg.set(f()); e.message = 'longer'; }) });
```
B: drive -> DIFF given 1 holds 6

### a1-method-err (a1.ts)
```
const s = () => state<{ readonly f: () => number }>({ f: () => -1 });
const lg = () => state(-1);
const v = (s: { readonly f: () => number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly f: () => number }>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const o2 = { f() { return c.message.length; } }; s.set(o2); lg.set(o2.f()); e.message = 'longer'; }) });
```
B: drive -> DIFF given 1 holds 6

### a1-arr-err (a1.ts)
```
const s = () => state<readonly (() => number)[]>([]);
const lg = () => state(-1);
const v = (s: readonly (() => number)[]) => s;
const w = (lg: number) => lg;
const put = (s: State<readonly (() => number)[]>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; s.set([f]); lg.set(f()); e.message = 'longer'; }) });
```
B: drive -> DIFF given 1 holds 6

### a1-decl-err (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; function f() { return c.message.length; } s.set(f); lg.set(f()); e.message = 'longer'; }) });
```
B: drive -> DIFF given 1 holds 6

### a1-wrap-err (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; const g = () => f() + 0; s.set(g); lg.set(g()); e.message = 'longer'; }) });
```
B: drive -> DIFF given 1 holds 6

### a1-width-err (a1.ts)
```
const s = () => state<{ readonly n: number }>({ n: 0 });
const lg = () => state(-1);
const v = (s: { readonly n: number }) => s;
const w = (lg: number) => lg;
const put = (s: State<{ readonly n: number }>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; const r = { n: 0, f }; s.set(r); lg.set(f()); e.message = 'longer'; }) });
```
B: drive -> DIFF given 1 holds 6

### a1-mapholder-err (a1.ts)
```
const s = () => state<Map<string, () => number>>(new Map());
const lg = () => state(-1);
const v = (s: Map<string, () => number>) => s;
const w = (lg: number) => lg;
const put = (s: State<Map<string, () => number>>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; s.set(new Map([['k', f]])); lg.set(f()); e.message = 'longer'; }) });
```
B: drive -> DIFF given 1 holds 6

### a1-helper-write-err (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const wr = () => { e.message = 'longer'; }; const f = () => c.message.length; s.set(f); lg.set(f()); wr(); }) });
```
B: drive -> DIFF given 1 holds 6

### a1-foreach-write-err (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; s.set(f); lg.set(f()); [1].forEach(() => { e.message = 'longer'; }); }) });
```
B: drive -> DIFF given 1 holds 6

### a1-loop-err (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; for (let i = 0; i < 2; i++) { if (i === 0) { s.set(f); lg.set(f()); } else { e.message = 'longer'; } } }) });
```
B: drive -> DIFF given 1 holds 6

### a1-nested-fn-err (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const mk = () => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; s.set(f); lg.set(f()); e.message = 'longer'; }; mk(); }) });
```
B: drive -> DIFF given 1 holds 6

### a1-actarg-err (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });
const put = (put0: Action<[() => number]>, lg: State<number>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; put0(f); lg.set(f()); e.message = 'longer'; }) });
```
B: drive -> DIFF given 1 holds 6

### a1-readback-err (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state<readonly number[]>([]);
const w = (lg: readonly number[]) => lg;
const put = (s: State<() => number>, lg: State<readonly number[]>) => ({ go: action(() => { const e = new Error('x'); const c: Error = e; const f = () => c.message.length; s.set(f); const before = f(); e.message = 'longer'; lg.set([before, read(s)()]); }) });
```
B: drive -> DIFF set-time 1 read(s)() 6

### a1-mutparam-err (a1.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const mk = (xs: Mut<number[]>) => { const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); xs.push(1); }; mk([0]); }) });
```
B: drive -> DIFF given 1 holds 2

### a1-listener (a1.ts)
```
const tick = function* () { yield 1; };
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => action((k: number) => { const xs = [k]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); xs.push(k); });
const l = (tick: Events<number>, put: Action<[number]>) => on(tick, put);
```
B: drive -> DIFF given 1 holds 2

### a2-prog-arr (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const xs = [0]; const c: readonly number[] = xs; const r = { n: 1, f: () => c.length }; sq(r); const before = r.f(); xs.push(1); return [before, r.f()] as const; };
```
B: drive -> DIFF after the memo took r: 1, later: 2

### a2-cross-hit-arr (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const xs = [0]; const c: readonly number[] = xs; const r = { n: 1, f: () => c.length }; sq(r); const before = r.f(); xs.push(1); return { before, r }; };
const b = (sq: (o: { readonly n: number }) => { readonly n: number }, a: { readonly before: number; readonly r: { readonly n: number } }) => sq(a.r);
```
B: drive -> DIFF given 1 holds 2

### a2-wrap-arr (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => ({ o }));
const a = (sq: (o: { readonly n: number }) => { readonly o: { readonly n: number } }) => { const xs = [0]; const c: readonly number[] = xs; const r = { n: 1, f: () => c.length }; const res = sq(r); const before = r.f(); xs.push(1); return { before, res }; };
```
B: drive -> DIFF given 1 holds 2

### a2-local-arr (a2.ts)
```
const a = () => { const sq = memo((o: { readonly n: number }) => o); const xs = [0]; const c: readonly number[] = xs; const r = { n: 1, f: () => c.length }; const got = sq(r); const before = r.f(); xs.push(1); return { before, got, sq }; };
```
B: drive -> DIFF given 1 holds 2

### a2-prog-map (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const m = new Map<string, number>(); const c: Map<string, number> = m; const r = { n: 1, f: () => c.size }; sq(r); const before = r.f(); m.set('k', 1); return [before, r.f()] as const; };
```
B: drive -> DIFF after the memo took r: 0, later: 1

### a2-cross-hit-map (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const m = new Map<string, number>(); const c: Map<string, number> = m; const r = { n: 1, f: () => c.size }; sq(r); const before = r.f(); m.set('k', 1); return { before, r }; };
const b = (sq: (o: { readonly n: number }) => { readonly n: number }, a: { readonly before: number; readonly r: { readonly n: number } }) => sq(a.r);
```
B: drive -> DIFF given 0 holds 1

### a2-wrap-map (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => ({ o }));
const a = (sq: (o: { readonly n: number }) => { readonly o: { readonly n: number } }) => { const m = new Map<string, number>(); const c: Map<string, number> = m; const r = { n: 1, f: () => c.size }; const res = sq(r); const before = r.f(); m.set('k', 1); return { before, res }; };
```
B: drive -> DIFF given 0 holds 1

### a2-local-map (a2.ts)
```
const a = () => { const sq = memo((o: { readonly n: number }) => o); const m = new Map<string, number>(); const c: Map<string, number> = m; const r = { n: 1, f: () => c.size }; const got = sq(r); const before = r.f(); m.set('k', 1); return { before, got, sq }; };
```
B: drive -> DIFF given 0 holds 1

### a2-prog-set (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const st = new Set<number>(); const c: Set<number> = st; const r = { n: 1, f: () => c.size }; sq(r); const before = r.f(); st.add(1); return [before, r.f()] as const; };
```
B: drive -> DIFF after the memo took r: 0, later: 1

### a2-cross-hit-set (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const st = new Set<number>(); const c: Set<number> = st; const r = { n: 1, f: () => c.size }; sq(r); const before = r.f(); st.add(1); return { before, r }; };
const b = (sq: (o: { readonly n: number }) => { readonly n: number }, a: { readonly before: number; readonly r: { readonly n: number } }) => sq(a.r);
```
B: drive -> DIFF given 0 holds 1

### a2-wrap-set (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => ({ o }));
const a = (sq: (o: { readonly n: number }) => { readonly o: { readonly n: number } }) => { const st = new Set<number>(); const c: Set<number> = st; const r = { n: 1, f: () => c.size }; const res = sq(r); const before = r.f(); st.add(1); return { before, res }; };
```
B: drive -> DIFF given 0 holds 1

### a2-local-set (a2.ts)
```
const a = () => { const sq = memo((o: { readonly n: number }) => o); const st = new Set<number>(); const c: Set<number> = st; const r = { n: 1, f: () => c.size }; const got = sq(r); const before = r.f(); st.add(1); return { before, got, sq }; };
```
B: drive -> DIFF given 0 holds 1

### a2-prog-rec (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const o = { n: 1 }; const c: { readonly n: number } = o; const r = { n: 1, f: () => c.n }; sq(r); const before = r.f(); o.n = 7; return [before, r.f()] as const; };
```
B: drive -> DIFF after the memo took r: 1, later: 7

### a2-cross-hit-rec (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const o = { n: 1 }; const c: { readonly n: number } = o; const r = { n: 1, f: () => c.n }; sq(r); const before = r.f(); o.n = 7; return { before, r }; };
const b = (sq: (o: { readonly n: number }) => { readonly n: number }, a: { readonly before: number; readonly r: { readonly n: number } }) => sq(a.r);
```
B: drive -> DIFF given 1 holds 7

### a2-wrap-rec (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => ({ o }));
const a = (sq: (o: { readonly n: number }) => { readonly o: { readonly n: number } }) => { const o = { n: 1 }; const c: { readonly n: number } = o; const r = { n: 1, f: () => c.n }; const res = sq(r); const before = r.f(); o.n = 7; return { before, res }; };
```
B: drive -> DIFF given 1 holds 7

### a2-local-rec (a2.ts)
```
const a = () => { const sq = memo((o: { readonly n: number }) => o); const o = { n: 1 }; const c: { readonly n: number } = o; const r = { n: 1, f: () => c.n }; const got = sq(r); const before = r.f(); o.n = 7; return { before, got, sq }; };
```
B: drive -> DIFF given 1 holds 7

### a2-prog-err (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const e = new Error('x'); const c: Error = e; const r = { n: 1, f: () => c.message.length }; sq(r); const before = r.f(); e.message = 'longer'; return [before, r.f()] as const; };
```
B: drive -> DIFF after the memo took r: 1, later: 6

### a2-cross-hit-err (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const e = new Error('x'); const c: Error = e; const r = { n: 1, f: () => c.message.length }; sq(r); const before = r.f(); e.message = 'longer'; return { before, r }; };
const b = (sq: (o: { readonly n: number }) => { readonly n: number }, a: { readonly before: number; readonly r: { readonly n: number } }) => sq(a.r);
```
B: drive -> DIFF given 1 holds 6

### a2-wrap-err (a2.ts)
```
const sq = () => memo((o: { readonly n: number }) => ({ o }));
const a = (sq: (o: { readonly n: number }) => { readonly o: { readonly n: number } }) => { const e = new Error('x'); const c: Error = e; const r = { n: 1, f: () => c.message.length }; const res = sq(r); const before = r.f(); e.message = 'longer'; return { before, res }; };
```
B: drive -> DIFF given 1 holds 6

### a2-local-err (a2.ts)
```
const a = () => { const sq = memo((o: { readonly n: number }) => o); const e = new Error('x'); const c: Error = e; const r = { n: 1, f: () => c.message.length }; const got = sq(r); const before = r.f(); e.message = 'longer'; return { before, got, sq }; };
```
B: drive -> DIFF given 1 holds 6

### a2-in-action (a2.ts)
```
const s = () => state<{ readonly n: number }>({ n: 0 });
const sq = () => memo((o: { readonly n: number }) => o);
const put = (s: State<{ readonly n: number }>, sq: (o: { readonly n: number }) => { readonly n: number }) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const r = { n: 1, f: () => c.length }; s.set(sq(r)); xs.push(1); }) });
const v = (s: { readonly n: number }) => s;
```
B: drive -> DIFF given 1 holds 2

### a3-cb-P (a3.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const g = (s: State<() => number>, lg: State<number>) => action((cb: (x: Mut<number[]>) => void) => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); cb(xs); });
const put = (g: Action<[(x: Mut<number[]>) => void]>) => ({ go: action(() => { g((x) => { x.push(1); }); }) });
```
B: drive -> DIFF given 1 holds 2

### a3-cb-P-writer-cell (a3.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const wr = () => (x: Mut<number[]>) => { x.push(1); };
const g = (s: State<() => number>, lg: State<number>, wr: (x: Mut<number[]>) => void) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); wr(xs); }) });
```
B: drive -> DIFF given 1 holds 2

### a3-cb-P-take-reader (a3.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const a = () => ({ take: (x: Mut<number[]>) => { const c: readonly number[] = x; return () => c.length; } });
const put = (a: { readonly take: (x: Mut<number[]>) => () => number }, s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = [0]; const f = a.take(m); s.set(f); lg.set(f()); m.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a4-P-index-sig (a4.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const t: { [k: string]: readonly number[] } = { a: xs }; const f = () => t['a']?.length ?? 0; s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a4-P-optional-member (a4.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const t: { readonly k?: readonly number[] } = { k: xs }; const f = () => t.k?.length ?? 0; s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a4-P-ternary-ann-readonly (a4.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const t: readonly number[] | null = xs.length ? xs : null; const f = () => t ? t.length : 0; s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a4-P-map-alias (a4.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const m = new Map([['k', xs]]); const c: Map<string, readonly number[]> = m; const f = () => c.get('k')?.length ?? 0; s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a4-P-unknown (a4.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const t: unknown = xs; const f = () => Array.isArray(t) ? t.length : 0; s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a4-P-map-alias-set (a4.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const m = new Map<string, number>(); const c: Map<string, number> = m; const f = () => c.size; s.set(f); lg.set(f()); m.set('z', 1); }) });
```
B: drive -> DIFF given 0 holds 1

### a4-P-typeof-readonly (a4.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const t: typeof c = c; const f = () => t.length; s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a4-P-union-alias (a4.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const t: readonly number[] | null = xs; const f = () => t ? t.length : 0; s.set(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a5-P-listener-two-values (a5.ts)
```
const tick = function* () { yield 1; yield 2; };
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => action((k: number) => { const xs = [k]; const c: readonly number[] = xs; const f = () => c.length * 10 + k; s.set(f); lg.set(f()); xs.push(k); });
const l = (tick: Events<number>, put: Action<[number]>) => on(tick, put);
```
B: drive -> DIFF given 12 holds 22

### a5-P-jsx-onclick (a5.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const el = (s: State<() => number>, lg: State<number>) => <button onClick={action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); lg.set(f()); xs.push(1); })}>x</button>;
```
B: drive -> DIFF given 1 holds 2

### a5-P-update-chain (a5.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state<readonly number[]>([]);
const w = (lg: readonly number[]) => lg;
const put = (s: State<() => number>, lg: State<readonly number[]>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.update(() => f); const b = read(s)(); xs.push(1); s.update((g) => { lg.set([b, g()]); return g; }); }) });
```
B: drive -> DIFF [1,2]

### a5-P-actarg-rec (a5.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put0 = (s: State<() => number>) => action((r: { readonly f: () => number }) => { s.set(r.f); });
const put = (put0: Action<[{ readonly f: () => number }]>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; put0({ f }); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a5-set-as-value (a5.ts)
```
const s = () => state<() => number>(() => -1);
const lg = () => state(-1);
const v = (s: () => number) => s;
const w = (lg: number) => lg;
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; const st = s.set; st(f); lg.set(f()); xs.push(1); }) });
```
B: drive -> DIFF given 1 holds 2

### a6-async-memo-width (a6.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = async (sq: (o: { readonly n: number }) => { readonly n: number }) => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; const r = { n: 1, f }; sq(r); const before = r.f(); await null; xs.push(1); return [before, r.f()] as const; };
```
B: drive -> DIFF 1 then 2

### a6-async-memo-width-hit-other (a6.ts)
```
const sq = () => memo((o: { readonly n: number }) => o);
const a = async (sq: (o: { readonly n: number }) => { readonly n: number }) => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; const r = { n: 1, f }; const got = sq(r); await null; xs.push(1); return { r, got }; };
const b = (sq: (o: { readonly n: number }) => { readonly n: number }, a: { readonly r: { readonly n: number } }) => sq(a.r);
```
B: drive -> DIFF the memo was given r with f() = 1; it now gives 2

