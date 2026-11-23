# Freeze attack, round 7 (2026-11-23, 04:58–05:19 CET by `date`; final `./runall.sh` run ends 05:18:14)

Target: the tree with S4.11 (R-P, `lite/infer/ow-late.ss.ts` owPubNode/owPubPoints/owPubWrites) and the memo
no-store run-time change. Mode A = shipped. Mode B = `SS_MEASURE_REG=0` (closure registration off, deep freeze on).
Nothing outside this folder was written; build.ts / verify.ts were not run; no git command was run.

**Result: silent programs in both modes.** 182 accepted programs are silent in B, 18 in A. Seven causes. Six are
gaps in S4.11 (each silent in B only; registration makes the write throw in A). The seventh (R) is a gap in closure
registration that makes any of the six silent in A as well. In every cause another cell's action (`snap`) holds the
earlier reading. No form found spans a commit: publish, reading and write all happen inside one action call.

Rerun: `./runall.sh` (each set through `../../lite/infer/attack/drive-run.ts`, mode A -> `<set>-a.txt`, mode B ->
`<set>-b.txt`; checker probes -> `probe-checker.txt`; `tally.txt`), then `bun causes.ts > causes.txt`.
`bun dump.ts <set.ts> <name>` prints a program's compiled cells as runCells takes them (compileModule).
Silent = drive-run.ts's test: a harness CHANGED line, a drive line containing DIFF, or a publishTap TAP line.

## Counts (tally.txt, run ending 05:18:14)

| set | what | programs | accepted | silent A | silent B | controls | fired A | fired B |
|---|---|---|---|---|---|---|---|---|
| b1 | item 1: `s.set`/`s.update` reaching the body as a value S4.11 does not see (8 channels x 9 holders); an Action under a plain function type (22 routes) | 117 | 88 | 0 | 88 | 2 | 1 | 2 |
| b2 | item 2: memo keys (function in key by 12 routes, 7 data holders, 13 kinds), results, memo inside an action | 37 | 29 | 0 | 1 | 2 | 0 | 0 |
| b4 | item 4: "after" with a point S4.11 sees (`s.set` direct): 33 accepted-route probes, 28 syntactic forms | 77 | 44 | 0 | 41 | 2 | 1 | 2 |
| b5 | item 5: listeners, JSX handlers, update/read, generators, async cells, state initial, thrown values, inner action | 32 | 19 | 0 | 17 | 2 | 1 | 2 |
| b6 | item 6: method registration overwritten by a later same-key property | 18 | 16 | 12 | 13 | 2 | 1 | 2 |
| b7 | each cause with the earlier reading held by another cell's action; minimal forms | 25 | 22 | 6 | 22 | 2 | 1 | 2 |
| b8 | item 5 points alone, followed by a plain write; memo result controls | 21 | 12 | 0 | 0 | 4 | 2 | 4 |
| total | | 327 | 230 | **18** | **182** | 16 | 7 | 14 |

No program's verdict differs between modes. Controls (checker skipped): each set's `ctl-let` (a `let` written after
the publish) fires in both modes; each set's `ctl-P` (the direct round-6 P form) fires in B only. b6's
`b6-ctl-dupkey-direct` fires in A and B. b8 adds `b8-memo-ctl-let` (a memoised result over a `let`, both modes) and
`b8-memo-ctl-alias` (a result over a read-only alias with a writer of the Mut, B only; in A the result's freeze makes
the writer throw). b2's two controls fire in neither mode, as expected: `b2-ctl-P-memo` is round 6's memo P (a miss
whose arguments reach a function stores nothing), and `b2-ctl-hit-data` only shows the drive sees a hit
(`hit seen (detector sanity, not a fire)`). The memo instrument is shown to fire by the two b8 memo controls.

Per cause (causes.txt; a program is assigned to the first cause its name matches):
```
mode B: 182 silent   Q1 36 · Q2 40 · Q3 24 · Q4 32 · Q5 11 · Q6 20 · R 19 (R rows are silent in B through their Q hole)
mode A:  18 silent   R 18
```

## The causes

Every minimal program below is accepted by the checker. `put` is called by the drive. b7's form: `s` holds
`() => number`, `snap` is a zero-argument action of another cell (`t.set(read(s)())`; zero arguments, so not an
S4.11 point), `v = s()` and `w = t` are two more cells. Outputs are b7-a.txt / b7-b.txt.

```
const s = () => state<() => number>(() => -1);
const t = () => state(-1);
const v = (s: () => number) => s();
const w = (t: number) => t;
const snap = (s: State<() => number>, t: State<number>) => action(() => { t.set(read(s)()); });
const put = (s: State<() => number>, snap: Action<[]>) => ({ go: action(() => { <BODY> }) });
```
`SP` = `const xs = [0]; const c: readonly number[] = xs; const f = () => c.length;`

| cause | BODY | A | B |
|---|---|---|---|
| Q1 `set`/`update` read as a value before the Mut is declared | `const st = s.set; SP st(f); snap(); xs.push(1);` | threw: Attempted to assign to readonly property. | DIFF v = s() = 2, w = what snap read = 1 |
| Q2 destructured `set`/`update` | `SP const { set } = s; set(f); snap(); xs.push(1);` | threw (same) | DIFF 2 / 1 |
| Q3 computed `s['set']` / `s['update']` | `SP s['set'](f); snap(); xs.push(1);` | threw (same) | DIFF 2 / 1 |
| Q4 a name for the Mut bound after the point | `SP s.set(f); snap(); const ys = xs; ys.push(1);` | threw (same) | DIFF 2 / 1 |
| Q5 a write through a helper's result | `SP const get = () => xs; s.set(f); snap(); get().push(1);` | threw (same) | DIFF 2 / 1 |
| Q6 a built-in's at-once callback run more than once | `SP [0, 1].forEach((i) => { if (i === 1) xs.push(1); if (i === 0) { s.set(f); snap(); } });` | threw (same) | DIFF 2 / 1 |
| R + Q1 method registration overwritten | `const k = 1; const st = s.set; SP const r = { m: f }; const o = { m() { return k; }, ...r }; st(o.m); snap(); xs.push(1);` | **DIFF 2 / 1** | DIFF 2 / 1 |

Second cell holds the earlier reading: yes for every cause (`w` = 1, written by `snap` in the cell `snap`, while
`v` = 2). Both are read after the one action call commits; no reader saw the value between two commits.

### Q1–Q3: the point is not a MemberExpression `.set`/`.update` on a State

owPubNode (ow-late.ss.ts) takes a non-computed MemberExpression named `set`/`update` on a State, or a call whose
callee's type is an Action. `const { set } = s` has no MemberExpression; `s['set']` is computed; `const st = s.set`
is a point, but owAfter only counts bindings declared before a point (`if (!captured && d.start >= p.start) return
false`), so reading it before `const xs` constrains nothing, and the later `st(f)` has a plain function type. Variants
accepted and silent in B (b1): `update`, `{ set: put1 }`, `s?.['set']`, `(s)['set']`, inside a helper bound to a const
(`b1-helper-destr`, `b1-helper-computed`), with the function in a record, by width, as a method, as a function
declaration, `[f].forEach((g) => st(g))`, across a loop, in a listener (`b5-lis-st`, `b5-lis-destr`) and a JSX
`onClick` action (`b5-jsx-st`, `b5-jsx-computed`). Each over 9 holders (array push/index/length/sort, Map set/delete,
Set add, record `=`/`++`, optional `delete`, `Error.message`, nested, tuple, array of records).

Rejected routes for a setter: `[s.set]`, `{ st: s.set }`, a ternary over `s.set`, `id(s.set)`, `[f].forEach(st)`,
`const getSet = () => s.set` (all `[state-write]`: kept); `` s[`set`] `` and `s[k]` with `k = 'set' as const`
(`[type]`); `const st = s.set` after `const xs` (`[mutating-method]`).

### Item 1's Action route did not get through

Every route for an `Action` under a plain function type was rejected: annotation, record, array, producer cell
(`[action-pass]`: "Action<[() => number]> is not assignable to (h: () => number) => void"), cast (`[no-cast]`), `!`
(`[no-non-null]`), `satisfies` and `(0, put0)` (unsupported), a cell input typed as a function (`[inject-type]`), a
producer wrapper (`[action-call]`), a setter wrapper cell (`[state-write]`). Destructured, computed, tuple, Map, spread
and optional calls of an Action keep the Action type and are points (`[mutating-method]`). So for actions the
owner's admitted weak spot is closed by `[action-pass]`; for State it is open through Q1–Q3.

### Q4: a binding declared after the point

`s.set(f); const ys = xs; ys.push(1)` — the write is to `ys`, declared after the point, and owAfter returns false for
it; the reference to `xs` in `const ys = xs` is not a write. Accepted and silent in B (b4, b5, b7): `const ys: Mut<number[]> = xs`,
in a block, `let ys = xs`, chained aliases, Map and record aliases, `const { t } = r0` / `const [t] = r0` / `const t = r0.t`
for `r0` holding the Mut, `for (const y of [xs])`, a callback parameter (`[xs].forEach((y) => y.push(1))`, `.map`),
`reduce` with `xs` as the initial accumulator, inside `catch`, after `update`/`read`, after an inner action call
`put0(f)`. Not accepted: `const e = rows[0]; e?.push(1)` and `pick(0)?.push(1)` (both `[mutating-method]`), a ternary
alias (`write to a number[] | Mut<number[]>, which is not Mut`), an IIFE passing `xs` to a `Mut` parameter.

The checker's own message suggests this route: "finish every write to xs before s.set, or write to a new local
declared after it". `const ys = xs` is a new local declared after it.

### Q5: a write through a call's result

owUsesOf counts a call of a helper as a write only when the helper itself writes the local (`c.wmut`). `get()` returns
`xs` and the caller writes the result. Accepted, silent in B: arrow, function declaration, index write, Map, record,
nested field, helper defined after the point. Rejected: `(): Mut<number[]> => xs` (`[mut-nested]`), an IIFE and a
ternary over two helpers (`[mut-capture]`).

### Q6: an at-once callback is a loop S4.11 does not see

owAfter's loop test walks syntactic loops (`owLoopsOut`/`owLoopBody`). A callback that a built-in calls at once puts
the point at the call (owPubPoints), but the write inside the same callback, textually before the point, is not after
it either in the callback (no loop there) or in the outer body (inside the call, not after it). Silent in B with
`forEach`, `map`, `some`, `every`, `filter`, `find`, `findIndex`, `flatMap`, `reduce`, `Array.from(xs, cb)`,
`Map.forEach`, `Set.forEach`, with the point in a helper, the write in a helper, a nested callback, and `update` as
the point. `sort` with a comparator is rejected (`[mutating-method]` on the sorted literal, not on `xs`).

### R (mode A): the registration of an object literal's methods overwrites another function's

fnreg.ts and the toolchain twin register a literal's capturing methods with `ss_methods(o, "m", thunk)` after the
literal is built, on whatever `o.m` is then. A later property with the same key puts another function there, and
methods() replaces that function's own capture thunk. Compiled text of `b6-spread-rec-st` (dump-b6-spread-rec-st.txt):
```
const f = /*ss+*/ss_closure(/*ss-*/() => c.length/*ss+*/, (i) => i < 0 ? 1 : c)/*ss-*/; const r = { m: f };
const o = /*ss+*/ss_methods(/*ss-*/{ m() { return k; }, ...r }/*ss+*/, "m", (i) => i < 0 ? 1 : k)/*ss-*/;
```
`o.m` is `f`; `f`'s thunk now gives `k`, so deepFreeze at `st(o.m)` freezes `k` and not `c`/`xs`. The write lands in
mode A. runCells takes this text from compileModule (lite/browser/run.ts:34-46), so the A runs use the shipped
registration. The spread form matters: banning duplicate keys in a literal (`{ m() {…}, m: f }`, `'m': f`) would not
close `...r`. Silent in A with Q1 (`st`), Q2, Q4, Q5, Q6 holes, a whole record published, a listener and a JSX
handler. Every mode-A silent also needs one of the Q holes: with the checker on, a write after a point it sees is
rejected; `b6-ctl-dupkey-direct` (checker skipped, `s.set` direct) fires in A. Not silent: a capture-free method
(no registration, so nothing to overwrite: `b6-nocap-method-st` throws in A), method then method (the later thunk is
the right one), field then method, a numeric key (`[type]`), a computed key (unsupported).

Minimal (b7-min-R, recording with `lg.set(f())` called directly):
```
const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const k = 1; const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; const r = { m: f }; const o = { m() { return k; }, ...r }; s.set(o.m); lg.set(o.m()); const ys = xs; ys.push(1); }) });
A: drive -> DIFF given 1 holds 2
B: drive -> DIFF given 1 holds 2
```
Minimal forms for Q4–Q6 with `lg.set(f())` direct are accepted (b7-min-Q4..Q6: A threw, B `DIFF given 1 holds 2`);
Q1–Q3 with `lg.set(f())` direct are rejected, since that `lg.set` is a point before the write, so their minimal
forms are the `snap` forms above.

## What did not get through

- **Memo (b2, b8).** A key reaching a function by 12 routes (width with a direct, alias and getter write, array, Map, Set, nested, method, overwritten
  method, action, memoised function, function-typed input; Error cause is `[arity]`) is a miss every time ("a miss,
  nothing was stored"). Data keys are frozen in place at the miss, so the alias, getter and `for…of` writes throw in
  both modes (array, Map, Set, record, Error, URL). Typed arrays, an ArrayBuffer, a structuredClone Map, a snapshot Set
  and a Promise are not stored. RegExp writes are `[regexp-state]`; JSX, `Object.groupBy`, `Map.groupBy` are
  `[no-member]`; an iterator is `[iterator-cell]`. A stored result holding a function over the memoised function's
  own locals (through a helper, a deep read-only holder) reads the same through a hit; a result function capturing a
  later-written alias is `[memo-pure]`. I found no kind that reachesFn treats as data and the language can write after
  the miss. `b2-action-memo-st` is silent in B through Q1 (the laundered `st`), not through memo.
- **Item 5 points alone (b8).** An action made in the body that publishes f (`[action-capture]`; with an argument
  `[mutating-method]`), `on(...)` in an action (`[listener-placement]`), JSX in a body (`[no-member]` on the props I
  wrote), `Promise.withResolvers` (`[no-member]`), `freeze(xs)` (`[removed-call]`). Accepted and not silent: a thrown and
  caught Error, `Promise.resolve(f)` held only locally, `snapshot(xs)`, a memoised call inside an action, a state
  cell's initial value, an island with data. An island with a function input is `[compile-boundary]`.
- **Generators (b5).** Alias, getter, `for…of` and record forms after a `yield` are `[mut-yield]`: R-Y counts uses,
  not only writes, so Q4/Q5 do not carry over. A nested async helper writing by alias is `[mut-await]`. The async cell
  body's alias write after `await` is accepted and publishes only at its return (not silent).
- **Syntactic "after" (b4).** for, while, do-while, for-of, labelled continue (unsupported), try/finally, catch, switch
  fallthrough, `||`, `??`, conditional, optional `s.set?.()`, nested writer before, recursion (arrow, declaration,
  mutual), a helper that publishes then writes or writes then publishes, a `Mut` parameter helper, `t[0]?.push`,
  `+=`, `delete`, `++`, a comma expression (unsupported), `Object.assign` (unsupported): all rejected.

## Crashes

None: `harness crashes 0` for every set in both modes, no PENDING, no `run crash`. Two `late throws` lines in b8 (both
modes): under `b8-island-data` and, settling later, under the next program run (`b8-ctl-local-action-P`): "undefined is not an object (evaluating 'x.length')". It comes from the harness serialiser
calling the island's `go` function with no arguments, not from a program. No checker crash.

## Over-rejections of ordinary code (o1.ts, o2.ts, o3.ts; probe-checker.txt, o3-run.txt)

15 ordinary programs (counters, todo add/toggle/remove/build, form fields/validate, undo push/pop, a Map counter,
two states in a loop): **11 accepted**.

| program | checker | right? | suggested fix works? |
|---|---|---|---|
| form-validate-after: `form.set({ ...f, errors }); if (!f.name) errors.push(...)` | `[mutating-method]` S4.11 | yes: run with the checker skipped it throws `Attempted to assign to readonly property.` in both modes | yes: write before `set` (accepted) |
| undo-stack-local: `past.set(p); p.push(b)` | `[mutating-method]` S4.11 | yes: throws in both modes when run | yes (accepted) |
| two-states-loop: `out.push(i); a.set(i);` in a loop, `b.set(out)` after | `[mutating-method]`: "out is written after a value is published at a.set" | no: `a.set(i)` gives a number; run unchecked it gives `a = 2`, `b = [0,1,2]` and throws nothing | yes: set `a` after the loop, or a second loop building `out` |
| map-state: `state<ReadonlyMap<string, number>>` | `[unknown-type] ReadonlyMap` | no | `Map<string, number>` is accepted; an index-signature record with a computed spread is `[type]`/unsupported |

The S4.11 message's second fix ("write to a new local declared after it") is accepted when the new local is an alias
of the old Mut, which is cause Q4.

## Not attacked

- Foreign receivers (out of scope by the owner's ruling); no foreign rows this round.
- A commit-spanning form: I found none and did not show none exists. The only body that crosses turns with a Mut is
  an async cell body, which can call neither an action (`[action-call]`) nor `set` (`[state-write]`).
- Islands and pools beyond the two round-6 forms; workers; cell edits and reruns; DOM nodes.
- Mode A registration gaps other than R: I tried same-key literals only. Other ways for `ss_methods` or `ss_closure`
  to tag the wrong function (a method key that is not an own data property, two literals sharing a function) were not
  tried.
- No fix was built or measured. The counts are routes I found for seven causes, not a bound on routes; 0 silent in a
  set is not a proof of anything for that area.

## Files

Sets: b1.ts b2.ts b4.ts b5.ts b6.ts b7.ts b8.ts (shared pieces lib.ts); ordinary o1.ts o2.ts o3.ts; checker probes
q0.ts q1.ts q2.ts. Outputs: `<set>-a.txt`, `<set>-b.txt`, tally.txt, causes.txt (every silent program by cause and
mode), probe-checker.txt, o3-run.txt, dump-b6-dupkey-st.txt, dump-b6-spread-rec-st.txt. Scripts: runall.sh, tally.ts,
causes.ts, dump.ts.
