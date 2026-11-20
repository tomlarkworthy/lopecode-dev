# memo(f): does "f is proven pure, so caching is unobservable" hold?

No. Not built. Checker: `lite/core.ts` `checkSources` at the working tree of 2026-11-20, driven by
`probe.ts` (one `// == name` case per module). Cases and full outputs: `pre.cases.ts`/`pre.out.txt`,
`holes.cases.ts`/`holes.out.txt`, `iter.cases.ts`/`iter.out.txt`, `action.cases.ts`/`action.out.txt`.
Run-time values from `run.ts` `runPort(dir, "forward")` on `iter-run/`, `mutparam-run/`, `letfrozen-run/`.

## 0. The premise: the checker does not prove a function pure

A checked function can return different results for the same arguments, with no capability, state or Mut:

```ts
const y = () => { const it = [1, 2, 3].values(); return (n: number) => { let s = 0; for (const x of it) s += x; return s + n; }; };
const twice = (y: (n: number) => number) => [y(0), y(0)];
```
```
y: ok : (n: number) => number
twice: ok : number[]
run: twice = [6,0]
```
`memo(y)` would give `[6,6]`. The cause is a captured iterator: `values()` is `@view` only for a `Mut`
receiver (own.ts `viewOf`), so on a plain array the iterator is an ordinary value that a closure may capture
and consume. Same with `new Map(...).entries()` (`iter-map-entries-captured: ok`). The type of `y` does not
show it, so no check at the `memo(...)` call can see it; `f` need only call `y`.

Other ways a checked function value is not a function of its arguments (all accepted):

| case | output |
|---|---|
| `clock = (now: Clock) => () => now()` | `clock: ok : () => number` |
| `apply = () => (h: () => number) => h()`; caller passes `now` | `apply: ok`, `use: ok` |
| `let i = 0; const f = (x: number) => x + i; …; i = 5; … f(1)` | `c: ok : number` |
| `lg = (log: Log) => (x: number) => { log(x); return x * 2; }` | `lg: ok`, `use: ok` (memo would skip the second `log`) |
| `push1 = () => (a: Mut<number[]>) => { a.push(1); return a.length; }` | `ok`; run `[2,3]`; memo would give `[2,2]` and skip a write |
| `sum = () => (it: Iterable<number>) => …for (const x of it)…` | `ok`; a second call on the same iterator sums nothing |

The capability ones are what S6.9's taint (`capture.ts`) exists for, but that analysis is name-based and
also misses, for actions today (`holes.out.txt`):

| case | output |
|---|---|
| `let q = () => 1; q = now; return action(() => s.set(q()));` | `c: ok : Action<[]>` |
| `for (const q of [now]) return action(() => s.set(q()));` | `c: ok : Action<[]>` |
| `mk = (s) => (h: () => number) => action(() => s.set(h()))`; `c = (now, mk) => mk(now)` | `mk: ok`, `c: ok` |
| `const [q] = [now]; …action(() => s.set(q()))` | `[action-capture]` (caught) |

These are existing S6.9 gaps, independent of memo. Not changed.

## 1. Identity

Identity of an object result is observable, so a memoised call is distinguishable from an unmemoised one
even when `f` is pure:

| program (`mk = () => (n: number) => ({ n })`) | output |
|---|---|
| `Object.is(mk(1), mk(1))` | `same: ok : boolean` (false unmemoised, true memoised) |
| `mk(1) === mk(1)` | `[strict-eq-object]` |
| `m.set(mk(1), 1); m.has(mk(1))` on a `Mut` `Map` | `hits: ok : boolean` |
| `new Set([mk(1), mk(1)]).size` | `hits: ok : number` (2 vs 1) |
| `equals(mk(1), mk(1))` | `eq: ok : boolean` (true either way) |

Also S6.2: a state cell whose input is a memoised result is not made again where a fresh result would make it
again. Only a result type with no identity (primitives) closes this; that is the owner's decision.

`Mut` handed out twice: not reachable.
- `f` cannot return a `Mut`: `return a` → `[mut-escape] Mut a returned`; `return { a }` → `[mut-escape] … placed in an object literal`; annotated `: Mut<number[]>` → same.
- A result cannot become a `Mut`: `mut(mk(1))` → `[mut-not-fresh]`; `@fresh` does not travel through a function value (`mut(sl([1]))` with `sl = (xs) => xs.slice()`, as an input or a local → `[mut-not-fresh]`).
- `Borrowed`: `helper(gen)` → `[borrowed-escape] Borrowed gen argument to a parameter that may keep it`; a `Borrowed<…>` parameter type is accepted but no call can supply one.
- A `Mut<…>` parameter is the live case (row `push1` above): memo must reject `f` whose parameters hold `Mut`.

## 2. What f may be

| f | checker today, as an ordinary function | memo needs |
|---|---|---|
| async (`async (n: number) => n + 1`) | `ok : (n: number) => Promise<number>` | result type check; a cached promise differs only by identity (§1), a rejection would be cached |
| generator (`function* (n) { yield n; }`) | `ok : (n: number) => Generator<number>` | reject: a cached iterator is consumed |
| returns an iterator (`xs.values()`) | `ok : (xs: number[]) => Iterable<number>` | reject (not in core.ts `uncloneable`'s list) |
| an `Action` | `action-pass` when given a function type (`const f: () => void = a`) | a typed `memo` gets this for free |
| calls `read(...)` in a cell | `[read-outside-action]` | nothing new |
| calls an `Action` in a cell | `[action-call]` | nothing new |
| captures a capability / a function from a capability cell | accepted | new: taint of the argument |
| calls a function parameter of an enclosing function | accepted | new: binding walk over f's captures |
| captures a `let` | read accepted (S3.11); assignment from an escaping fn `[let-capture]` | new: reject a captured `let` |
| calls any function that captured an iterator | accepted (§0) | not expressible at the memo call |

## 3. A throw

`t = () => (n: number) => { if (n < 0) throw new Error("neg"); return n; }` → `ok`. Not caching a throw
is correct for a deterministic `f`: the next call throws the same. Not tested at run time, since not built.

## 4. Placement

- Nested function: `mk = () => (k: number) => (n: number) => n * k` is `ok`; a memo made there would be a new
  cache per call of the enclosing function. No observation beyond §1.
- Action body: S6.19 already treats a function passed to a callee that is not a non-retaining intrinsic as
  kept. `action(() => { const g = keep((n) => read(s) + n); s.set(g(1)); })` →
  `[read-outside-action] … because it is passed to a function that may keep it`; the same with a pure
  `(n) => n + 1` → `a: ok`. `memo` as a prelude call has no `sig.flags.intrinsic`, so own.ts `callsAtOnce`
  returns false and an action-body `f` that writes, reads or calls an Action would get the same rules (by
  reading own.ts; not run, since memo does not exist).
- `log`: a cached call skips `log`; the program cannot read it back (S6.9's reason), a person can.

## What a sound memo would need

1. A language-wide rule that a nested function may not capture a binding whose type holds `Iterable` or
   `Generator` (own.ts's capture loop, beside the `Borrowed` case). This tightens existing programs, so it
   is the owner's call, and it closes §0 for ordinary functions too.
2. Then either
   - `f` restricted to a cell input whose cell is not in core.ts `stateful`/`tainted` and is not a capability,
     with f's parameters passing `uncloneable` plus `Iterable`, and its result holding no `Promise`,
     `Generator`, `Iterable`; or
   - `f` any expression, with a binding walk over f's captures (reject a `let`, an assigned parameter, a
     function-typed binding that is not an untainted cell input, recursively through captured function
     literals). This is a new analysis.
3. §1 (identity) either accepted as the meaning of memo, or results limited to primitives.
