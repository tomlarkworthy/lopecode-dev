# Second attack on the Mut and owned-group rules (2026-11-22)

Target: the live checker, `lite/core.ts` `checkSources`, called as `lite/infer/attack/live.test.ts` calls it.
`../mut-groups-attack/harness.ts` imports the prototype trees, so `harness.ts` here is new. A program is accepted
when every cell is ok and has no errors. An accepted program is run in `lite/browser/run.ts` `runCells` (the
Observable Runtime with `prelude.runtime.ts`). Each object a cell is fulfilled with is serialised then and again
after settle. A difference is printed as `CHANGED`. Nothing outside this folder was edited, and no git command was
run.

```
cd tools/lang-experiment/selfhost/mut-groups-attack2
bun harness.ts ./breaks.ts          # minimal programs, breaks.out.txt
bun harness.ts ./bN.ts [--why]      # batches b0–b10; --why prints the checker's messages
```

## Count

There were 245 candidates in `b0`–`b10`, and 104 were accepted. 34 of those are breaks that were run and
observed. 5 have the same shape, but their frozen value is discarded, so nothing could be observed. 1 is a state
action that was only checked, because `runCells` fails on state cells (`p.name`). The other 64 are harmless. All
the breaks come from one hole. It is not in `variants.ts`, `owner.ts`, the S4.6 rows of `spec.ojs` or the first
attack.

## The hole: a write or a lend whose own operand freezes the same Mut

`ow-flow.ss.ts` `owExpr`/`owCallFlow` walk an expression's operands left to right. They record `freeze(m)` when
they reach it. A receiver, an assignment's object or a `Mut<…>` argument that comes before the freeze is a use
*before* it. At run time the store or the callee's write happens after every operand has been evaluated, so it
lands on the value `freeze` returned. A plain Mut breaks the rules this way. The group forms are the same hole.

**C1. Lend, then freeze, in one call. Breaks guarantee (c).**
```ts
const a = () => {
  const m = mut([1]);
  const f = (p: Mut<number[]>, q: readonly number[]) => { const n = q.length; p.push(2); return [n, q.length]; };
  return f(m, freeze(m));
};
```
ACCEPT. Run: `a = [1,2]`, so the frozen `q` changed. The group form `f(g, freeze(g))` gives `[0,7,2]`. The
other forms observed are `f(g.t, freeze(g).t)`, and the freeze nested as `id(freeze(m))`, `[freeze(m)]`,
`{ q: freeze(m) }` or `c ? freeze(m) : []`. This is not `f(m, m)`. `owLendTwice` does not look inside a call.

**C2. A write whose operand freezes. Breaks guarantee (c).**
```ts
const a = () => {
  const m = mut([1]);
  let fr: readonly number[] = [];
  m.push((fr = freeze(m)).length);
  return fr;
};
```
ACCEPT. Run: `a = [1,1]`. The forms observed are:

- `m[0] = (fr = freeze(m)).length + 5` gives `[6]`.
- `m[(fr = …).length] = 7`, `m[0] += …` and `m[…]++`.
- `fill`, `splice` and `unshift`.
- `m.set("k", (fr = freeze(m)).size)` gives `Map{"k"=>0}`.
- An `await` inside the operand.
- In a group: `g.t.push(…)`, `g.t[0] = …` (`{t:[6],n:0}`) and `g.n = …` (`{t:[1],n:6}`).

**C3. With `yield`, another cell's value changes. Breaks guarantee (a).**
```ts
const gen = function* () {
  const m = mut([1]);
  m[0] = (yield freeze(m)) === undefined ? 9 : 8;
};
const r = (gen: readonly number[]) => ({ v: gen });
```
ACCEPT. Run:
```
CHANGED gen (value #1 of 1): [1] -> [8]
CHANGED r (value #1 of 1): {v:[1]} -> {v:[8]}
```
`r` keeps the frozen array. The pending store writes it when the runtime resumes the generator, and `r` does not
run again. `f(m, yield freeze(m))` gives `{v:[1]} -> {v:[1,2]}`. The group form `g.n = (yield freeze(g)) …` gives
`{v:{t:[1],n:0}} -> {v:{t:[1],n:8}}`. The forms `m.push((yield …))` and the same statement inside `try/catch`
were also observed.

The missing rule: `freeze(x)` must not appear inside an operand of an expression that writes or lends `x` or a
field of the group `x`. That covers a mutating method's receiver, the object of an assignment or update target,
and a call that takes `x` or its field as `Mut<…>`. The alternative is to accept `freeze(x)` only as a whole
initializer, return, yield or expression statement. Destructuring assignment targets are unsupported today. A fix
should cover them if they are enabled later.

## Accepted, harmless

- The known `B3` hole on a plain Mut: a lent `m`, and a helper the callee calls that captures `m`. The group form is rejected.
- `k(f(m), freeze(m))`, `f(m, freeze(m).length)`, and `freeze` in a default parameter. No frozen value is written in any of them.
- Group literals with a method, an arrow field, `...other` or another cell's value as a plain field.
- `equals`, `messageOf`, `in`, `typeof g.t`, `g.t?.push`, JSX `{g.t.length}`, and `({ t }: G) => t.push(2)`.
- A group lent on to `G` or `Mut` parameters, recursive and generic `G<T>` helpers, and `for…of` over a field while writing a field.
- Copies: `concat`, `new Map`/`new Set` of views, `Array.from(values())`, `fromEntries`, spreads, `slice`, `Promise.all`, and typed array `map` and `from`.
- Mut containers holding other cells' values. A deep write is rejected.
- A cell whose value is a function taking `Mut<…>`, lent a Mut by another cell.

## Held, and not reached

Each of these was rejected:

- Async helpers across `await` (`[borrowed-await]`) and generator helpers.
- `as`, `!`, `this` and classes.
- Helper calls after a freeze, through `?.()`, type arguments, another helper, hoisting or a default parameter.
- Sibling operands after a freeze.
- A Borrowed kept by a reader cell.
- Views over another cell's buffer.
- Covariance and width of `Mut`.
- A shorthand field, a self-closure, a throw of a Mut, rest and default parameters of a group, JSX, `Object.keys(g)`, and a Mut given to `state` or `update`.

These were not reached:

- State, actions and events at run time, because of the harness bug.
- Forms the checker does not support: getters, `satisfies`, labels, comma, tagged templates, `try/finally` with a Mut, `||=`, `Symbol.iterator`, object rest of a group, and destructuring assignment.
- Foreign declarations, which are a known hole.
