# Adversarial soundness test of owned groups (2026-11-22)

Work done 2026-11-22 from 01:40 CET (birth time of `harness.ts`, `stat -f %SB`) to about 02:05. RESULTS.md and the
probe ids of `../mut-groups/probes.ts` were read at 01:55, 15 minutes in, not after an hour as asked. B1 to B5
and the first form of B4 were found and run before that read. B4b, B4c, B7 and the run of the known base hole
were found after it.

Nothing outside this folder was edited, no git command was run, and `build.ts`/`verify.ts` were not run.

## How a break is shown

`harness.ts` puts each source through `checkSources` of `../mut-groups/{base,proto,refac}/lite/core.ts`. When a
tree accepts every cell, it runs the source in `base/lite/browser/run.ts` `runCells`, which is the Observable
Runtime with the prelude's `mut`/`freeze`. At run time both are the identity (`runtime.ss.ts:26-27`). Each object a
cell is fulfilled with is serialised at that moment and again after `settle`. A difference on the same object is
printed as `CHANGED`. Where the change happens inside one cell, the cell returns `[before, after]`.

```
bun harness.ts ./breaks.ts          # minimal programs, output in breaks.out.txt
bun harness.ts ./aN-*.ts            # each family; aN-*.out.txt / .out.json
bun why.ts ./aN-*.ts <name> [tree]  # the checker's full messages
bun a15-foreign.ts                  # foreign declarations, verdicts only
```

## Breaks (all from `breaks.out.txt`, 01:56)

**B1. `mut` used as a value. Breaks base, proto and refac.** `[mut-not-fresh]` and `[mut-bind]` apply only to a call
whose callee resolves to the prelude `mut` (`ow-place.ss.ts` `owPlacement`, which reads `owPrelude`). An alias of it
is unchecked, so it turns another cell's value into a `Mut`.
```ts
const x = () => [1, 2];
const y = (x: number[]) => { const mk = mut; const a = mk(x); a.push(3); return a.length; };
```
```
   base: ACCEPT  proto: ACCEPT  refac: ACCEPT
   CHANGED x (value #1 of 1, same object): [1,2]  ->  [1,2,3]
```
The same hole is also reached by a parameter `(mk: <T>(v: T) => Mut<T>)` given `mut` (`a1 mut-param-name`, `{n:1} -> {n:99}`), a
parameter named `mut` (`a18 shadow-mut-by-param-called`, `[1] -> [1,2]`) and `(c ? mut : mut)(x)` (`a5 mut-conditional-callee`). It can also
re-thaw a cell's own frozen value after a yield (`a5 mut-thaws-own-frozen`). The spec leaves this open:
`lite/soundscript/spec.ojs:2318` says that a prelude function used as a value is accepted and that whether to allow it "is not
decided". These runs show it is a hole.

**B2. `freeze` used as a value. Breaks all three trees.** `owCallFlow` records a freeze only for a prelude `freeze` call
(`ow-flow.ss.ts`). Through an alias, `m` stays live, and the frozen result changes.
```ts
const a = () => { const fz: <T>(m: Mut<T>) => T = freeze; const m = mut([1]); const r = fz(m);
  const before = r.length; m.push(2); return [before, r.length]; };
```
```
   show a = [1,2]
   B2b (generator yields fz(m), then m.push(2)):  CHANGED reader (same object): [1]  ->  [1,2]
```
Missing rule for B1 and B2: `mut`, `freeze` and `borrow` should be rejected anywhere except as a callee. A second
gap is on the call-site side, and B1, B4 and B6 all use it: nothing restricts binding the result of a call whose
type is `Mut<…>` to a new name. Only `mut(...)` itself is checked as an initializer.

**B3. One Mut given twice. All three trees.** `f(m, m)` gives a callee two writable names for one container.
```
   f(p, q) with q.push(2):  show a = [1,2]      (p.length changed by a write to q)
```
The variants in `a13` behave the same way. A helper that captures `m` and is also given `m` returns `[1,2]`. A
`for…of` over `p` while pushing to `q` runs 6 times over a 2-element array. A freeze of `p` inside the callee,
through B2, followed by a write to `q`, gives `[1,2]` (`a5 mut-param-aliases-freeze-in-callee`). The proto
equivalents also pass: `f(ctx, ctx)`, `f(ctx, ctx.xs)` and `f(ctx.xs, ctx.xs)`. No frozen value changes here. It
violates "one name writes", and `../mut-groups/RESULTS.md` §11 already puts it to the owner as "Keep?". No rule
compares a call's arguments for aliasing.

**B4. A group parameter with a type-variable field. Breaks proto and refac. Base rejects it with `[mut-bind]`.**
`owGroupArg` lends a group to any parameter whose declared type `owIsGroup` accepts, which needs only one `Mut`
field. A field typed `Y` in the same parameter is not `Mut` to `owFieldPos`/`owFieldAssign`, which read the
callee's type for that member (`ow-group.ss.ts:35,62,74`). The §4.9 fix in `../mut-groups/RESULTS.md` covers
`Mut<{ a: T }>`, where every field is a type variable, and assumes "fields of such a parameter are declared Mut".
A mixed parameter falsifies that assumption.
```ts
const leak = <Y,>(c: Mut<{ xs: Mut<number[]>; ys: Y }>): Y => c.ys;
const alias = leak(ctx); const fr = freeze(ctx); const before = fr.ys.length; alias.push(20);
```
```
   base: REJECT a:rejected[mut-bind]  proto: ACCEPT  refac: ACCEPT
   show a = [1,2]
```
- B4b (found after reading): the callee assigns `p.ys = q.ys` across two groups. After `freeze(one)` is yielded,
  `two.ys.push(30)` changes it: `CHANGED reader: {xs:[1],ys:[20]} -> {xs:[1],ys:[20,30]}`.
- B4c: `delete p.ys` in the callee. `freeze(g).ys` is typed `number[]` and is `undefined` at run time
  (`show a = "undefined"`).
- The same holds through a generic alias, a generic interface and `<X, Y>` (`a16`). It does not hold through
  `ys?: Y` (`[possibly-undefined]`), an intersection (unsupported) or `Y extends …` (unsupported).

Missing rule, callee half: a parameter takes a group only when every field of the group the call passes is
declared `Mut` there, not when one field is. Alternatively, reject a group whose matched parameter field is a type
variable. Call-site half: `const alias = leak(ctx)` binds a `Mut`-typed result to a new name, the gap noted under
B2. `ys?: Y` was rejected on a `[type]` error in my test body that I did not resolve, so that variant is
inconclusive.

**B7. A Mut crosses to another cell inside a record (found after reading). proto and refac through B4, all three
trees through B1.** A cell may return `{ h: { y: Mut<number[]> } }`, and another cell may annotate its input with that
type and write it (`a18`). No rule keeps `Mut` out of a cell's value type or out of an input annotation, as
`[iterator-cell]` does for iterators.
```
   b4-holder-record-returned  proto/refac ACCEPT
   CHANGED a (same object): {h:{y:[10]},fr:{xs:[1],ys:[10]}}  ->  {h:{y:[10,99]},fr:{xs:[1],ys:[10,99]}}
   b1-holder-record-returned  base/proto/refac ACCEPT
   CHANGED x (same object): [1]  ->  [1,2]
```
Here cell `b` writes cell `a`'s frozen value, so a second cell holds a writable name. A closure variant behaves
the same way (`b4-holder-closure`, `show b = [1,2]`).

**Known: the named function expression on base.** `../mut-groups/RESULTS.md` §4.5 reports this hole and fixes it
in proto only. A run on base confirms it: `const f = function g(): number { m.push(2); return 0; }` is passed out
through `g2(f)` after `freeze(m)`. Base accepts it, proto and refac reject it with `[mut-capture]`, and the output is
`CHANGED a: {fr:[1],f:fn} -> {fr:[1,2],f:fn}` (`a18 named-fnexpr-base`).

**B5. RegExp `lastIndex`. Breaks all three trees, with no Mut involved.** `RegExp.test`, `exec` (run in `a18
regexp-exec-no-lastindex-read`: `[false,true]` for two equal calls) and `replace` write the receiver's `lastIndex`. They are not `@mutates` in `base/lite/intrinsics.ts:135-139`.
```ts
const x = () => /a/g;
const y = (x: RegExp) => [x.test("aa"), x.test("aa")];
const z = (x: RegExp, y: boolean[]) => [x.test("aa"), /a/g.test("aa")];
```
```
   show z = [false,true]      (the cell's own x answers differently from a fresh /a/g after y ran)
```
Missing rule: `test`/`exec` on a global or sticky RegExp, and `String` methods given one, write their receiver.

**B6. Foreign declarations typed `Mut`. Checker only, not run.** `a15-foreign.out.txt`: all three trees accept
`declare const lib: Mut<number[]>` written by a cell, and `declare function grab(): Mut<number[]>` or
`id<T>(v: T): Mut<T>` whose result is written. They also accept `keep(m: Mut<…>)` given a Mut, a group (proto)
or a field (proto). `runCells` has no foreign runtime, so nothing was observed changing. Two cells taking
`lib` would both write it. `../mut-groups/RESULTS.md` §11 q5 already asks whether foreign signatures are
trusted with `Mut`.

## Families that held

There are 162 distinct programs in `a1`–`a19`: 155 run through the harness and 7 foreign cases in `a15`, counted
with `grep -c '^==' a*.out.txt`. `breaks.ts` restates 8 of them in minimal form. `a19` holds the one-off `try.ts`
probes of the first minutes. "Held" means every tree rejected the program, or it was accepted
and harmless (noted).

| family | programs | accepted | note |
|---|---|---|---|
| expression forms around a Mut, a field or a group (`a9`; each one rejected on the generator cell, not only on the reader): paren, `as const`, `satisfies`, `[m][0]`, comma, `?:`, `??`, `&&`, `\|\|`, `?.`, computed key, default parameter, getter, object method, IIFE, spread into a call, `Array.from`, `Object.values`, Map entry, tagged template | 33 | 0 | the bare `?.slice` and JSON controls failed only on the reader's type |
| union-annotated binding or parameter `Mut<…> \| null` (`a11`) | 5 | 0 | `Mut<T>` is not assignable to a union with it |
| group param widened (`ys: number[]`), destructured, intersection, readonly (`a3`, `a16`) | 5 | 0 | `Mut` is invariant |
| state, action, events, listener (`a10`) | 6 | 1 | the accepted one is B1's shape and was not run (below) |
| callbacks on a field's own methods (`ctx.types.forEach(() => ctx.vars.set…)`) | 2 | 0 | `[mut-capture]` |
| async suspension with a group, field or captured group (`a14`) | 4 | 0 | `[borrowed-await]` |
| flow: try/catch, loop update, freeze in loop, switch or conditional expression, escaping thunk calling a helper (`a2`, `a14`, `a18`) | 7 | 0 | `finally-after-return-freeze` did not reach a rule (unsupported) |
| a Map callback's third argument as an alias (`a2 callback-third-arg-alias`) | 1 | 0 | `[arity]`: `map` gives two parameters |
| a generator cell holding a group, `yield borrow(ctx.xs)` (`a18`) | 1 | 1 | harmless: the reader reads `.length` |
| a group index signature hiding a field (`a18`) | 1 | 0 | |
| group literal keys: duplicate, spread override, computed, `__proto__` (`a12`) | 7 | 2 | both accepted are harmless: the checker types the last key, as JS keeps it |
| shapes that share storage while counted as fresh (`new Uint8Array(buf)`, `mut(x.subarray())`) | 3 | 0 | `@view` |
| unlisted mutating methods (`URLSearchParams.*`, `ArrayBuffer.transfer/resize`, `setFromHex`, `structuredClone` transfer) | 8 | 0 | unsupported or arity |
| Borrowed views kept (`subarray`, `buffer`, `values()`, element) (`a8`) | 6 | 2 | accepted ones copy (`[...values()]`) or keep an inner value the owner cannot write |
| reflection on a group (`for…in`, `Reflect.get`, `Object.entries`, `structuredClone`, `in`, `equals`), JSX, shadowing (`a14`) | 10 | 4 | the accepted ones are harmless reads (`in`, `equals`, `{ctx.xs.length}`, an inner same-named group) |
| type brand forgery `__lc_mut: true` | 1 | 0 | `Mut` is nominal |
| deferred generator helper body (`gen()` before freeze, consumed after) | 2 | 0 | generators cannot be consumed in a cell (`spread of non-iterable Generator`, `Generator.next` unsupported, `yield*` unsupported) |

## Could not attack, and why

- **State cells at run time.** `runCells` rejects a state cell in this harness with `undefined is not an object
  (evaluating 'p.name')`. `state-repro.ts` reproduces it with `state([1])` and one action (`state-repro.out.txt`).
  I suspect, without checking, that it comes from the local `input` in `run.ts` shadowing the imported `input`. B1 inside an `update` callback was
  checked (accepted) but not run.
- **try/finally, labels, comma, `yield*`, `for…in`, tagged templates, getters, `satisfies`, intersections, bounded type
  parameters.** These are unsupported. They stop any program that uses them, so none of them reached an
  ownership rule, and they were not tested as holes.
- **Foreign values at run time** (B6), for the same harness reason.

`/review-notebook` was not run on this file.
