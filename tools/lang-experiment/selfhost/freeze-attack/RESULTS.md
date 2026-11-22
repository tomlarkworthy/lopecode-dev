# Attack on the stage B freeze guarantee (2026-11-22, run 12:10)

Target: the live checker `lite/core.ts` `checkSources`, called as `lite/infer/attack/live.test.ts` calls it. An
accepted program is run in `run-skip.ts`. That file is a copy of `lite/browser/run.ts` `runCells` with two changes:

- A cell that tc-build compiles to `ss_out(v, 1)` publishes `out(v, 1)`. Which cells those are is read from the real
  `compileModule` output (`harness.ts quickSet`), and every log line `quick: …` lists them.
- The state-cell `input` shadowing bug is fixed (below).

Every value a cell was fulfilled with is serialised then and again after settle. A function is read by calling it.
A difference on a cell that is not in error is SILENT. Nothing outside this folder was edited. No git command was run.

```
cd tools/lang-experiment/selfhost/freeze-attack
./run-all.sh                                   # b1–b7, both modes -> logs/skip.txt, logs/all.txt
bun harness.ts b2.ts --only ah-typed [--why]   # one candidate; SS_FREEZE_ALL=1 for all mode
bun show-compiled.ts b3.ts then-alias-inside   # the compiled definitions: which cells take out(v, 1)
```

## Counts

```
skip (SS_FREEZE_ALL unset): 315 candidates, 105 accepted, 88 silent
all  (SS_FREEZE_ALL=1)    : 315 candidates, 105 accepted, 65 silent
skip only 23, both 65, all only 0
```

## Harness findings (not checker holes)

- **The stock runner never takes the quick path.** `lite/browser/run.ts:114` calls `out(raw(...a))` with no `1`, and
  `lite/link.ts:38` does the same. Only compiled text (`tc-build tcExprParts`: `ss_out(..., 1)`) skips the freeze. So
  `live.test.ts`, holes5 `attack-run.ts` and the notes' "both modes identical" result never exercised skip mode.
  `run-skip.ts` exists to fix that.
- **State cells cannot run in `runCells`.** `run.ts:9` imports Generators `input`, and `run.ts:82` declares a local
  `const input = (c, p)` that shadows it. The state-cell branch then calls `input(hd)` and fails on `p.name`. This
  is the "p.name" failure in mut-groups-attack2. It is renamed `genInput` in `run-skip.ts`.
- **A write must land after the runtime publishes the value.** With one `await null` or one `.then`, the
  "before" snapshot already showed the write. The candidates therefore wait 300 microtask steps (`for … await null`
  or a 300-link `then` chain).

## Breaks, by cause

**A. Capture rules follow only direct references to the captured name. Both modes.** `owCaptureErrs`
(`ow-capture.ss.ts:262`) sets `wmut` only when a reference to `b` is itself a write (`:127`). `owFlowsOut` (`:249`)
walks from a reference of `b` up to a return. Neither sees a local alias (`const r = xs`), a `let` assigned it, a
`for…of` or `switch` local, a called helper that returns it (`h()`, two levels, recursive), or a `Mut` element read
from a captured container (`reg.get(k) ?? []`, `reg[0] ?? []`). The stage B fix covered `return xs` through
literals, conditionals and casts. It did not cover these.

```ts
const a = () => { const xs = [0]; return (): Mut<number[]> => { const r = xs; return r; }; };
const c = (a: () => Mut<number[]>) => { a().push(1); return 0; };
```

ACCEPT. `a` reads `fn([0]) -> fn([0,1])` in both modes. With a holder cell `d = (a) => ({ v: a() })`, skip mode
shows `d: {v:[0]} -> {v:[0,1]}` (kc-flow-helper-by-cell). All mode freezes `d`'s value, so `c` throws. The write
form is `return () => { const r = xs; r.push(1); return xs.length; }`, which reads `fn(2) -> fn(3)` in both modes.
With a holder cell and `c` calling `a.k()`, skip mode shows `b: {v:[0,1,1]} -> {v:[0,1,1,1]}`
(kp-kept-alias-of-captured). The same miss applies to Error, Map, Set and records (fo-error-*, fo-map-helper,
fo-set-alias, fo-record-helper, kw-*). 28 silent.

**B. `tcQuickOut` is syntactic. Skip mode only.** `tc-build.ss.ts:90` makes a cell quick when its text has no async
or generator function. Code still runs after it returns in two ways. One is a `.then` callback, which is kept
(`@retains`) but makes a write through an alias (cause A). The other is a call to another cell's async function.

```ts
const a = () => { const D = (): Promise<number> => { let p: Promise<number> = Promise.resolve(0); for (let i = 0; i < 300; i++) p = p.then(() => 0); return p; };
  const xs = [0]; D().then(() => { const r = xs; r.push(1); }); return xs; };
const b = (a: number[]) => ({ v: a });
```

ACCEPT. Compiled `a = ss_out((…)(), 1)`. Skip mode: `a: [0] -> [0,1]`, `b: {v:[0]} -> {v:[0,1]}`. All mode: the push
throws. A second program needs no static miss, since `[borrowed-await]` is gone:

```ts
const H = () => async (p: Mut<number[]>) => { for (let i = 0; i < 300; i++) await null; p.push(1); return 0; };
const a = (H: (p: Mut<number[]>) => Promise<number>) => { const xs = [0]; H(xs); return xs; };
const b = (a: number[]) => ({ v: a });
```

Skip mode: `b: {v:[0]} -> {v:[0,1]}` (hc-async-mut-param). The same happens through a sync helper cell with an async
inner function (hs-async-inner-helper) and through Map, Set and records (th-*-skip). 23 silent in skip mode only.

**C. An async function the cell only calls writes an unfreezable value after return. Both modes.** `owInLateFn` and
`owGenLateWrites` run only inside the loop over kept functions (`ow-capture.ss.ts:265`,
`if (!owKept(…)) continue`). A cell with no kept function has nothing checking its async helpers. The stage B
programs `b4-async-helper-*` all had a kept reader `f`. The forms observed:

- a local `const go = async …; go()`, an `async function` declaration, or a nested helper;
- an async callback of a non-retaining intrinsic: `forEach`, `map`, `some`, `Array.from`, `Map.forEach`,
  `TypedArray.forEach`;
- another cell's async function;
- a state cell's initial value.

```ts
const a = () => { const t = new Uint8Array(2); const h = async () => { for (let i = 0; i < 300; i++) await null; t[0] = 1; }; h(); return t; };
const b = (a: Uint8Array) => ({ v: a });
```

ACCEPT. `b: {v:Uint8Array[0,0]} -> {v:Uint8Array[1,0]}`, the same in both modes. URL (`u.pathname`, `u.search`,
`u.hash`), Error, `fill` and an alias give the same result. A state cell gives
`s: Uint8Array[0,0] -> Uint8Array[1,0]` (st-typed-initial-async). An async-IIFE is rejected (`[mut-capture]`), and so
is a plain array (frozen at return, so the write throws).

**D. Error is unfreezable and unguarded. Both modes.** `deepFreeze` leaves class instances alone (`freeze.ts kindOf`
returns 0). `OW_UNFREEZABLE` (`ow-capture.ss.ts:170`) has no Error, TypeError or RangeError. `readonly message/name`
is not enforced on a fresh Mut local, the same as for URL.

```ts
const a = function* () { const e = new Error("x"); yield e; e.message = "y"; yield 1; };
const b = (a: Error | number) => ({ v: a });
```

ACCEPT. `b: {v:Error(Error:x)} -> {v:Error(Error:y)}` in both modes. The same result comes from a yielded record,
Map or Set holding the Error, `e.name = …`, an async generator, an alias or a helper between yields, and from Error
under causes A to C. `[mut-yield]` covers typed arrays and URL only. 21 silent.

## Accepted, harmless

- `err-fresh-write`: an Error written before return.
- `ah-array`, `hc-async-local`, `cb-forEach-async-array`, `st-array-initial-*`: plain data, frozen, so the write throws.
- `fc-typed-from`, `fc-typed-new-src`: real copies.
- `gl-object-freeze`.
- `ac-returns-typed`, `ac-update-keeps`, `ac-then-alias-state-array`: the store deep-freezes the value.
- `ls-gen-cell-async-helper-typed`: it yields a copy.
- `fo-gen-helper-after-yield`: a frozen yield, so the write throws.

## Held

- `T` to `Mut<T>`, 40 routes: generics, unions, default and destructured parameters, `?.`, containers of `Mut`,
  `let` reassignment in every statement form, finally, switch, and a shadowing local. Rejected by `[type]` or
  `[mutating-method]`.
- `Mut`-typed callback parameters given a cell input, 14 forms: rejected by `[type]`.
- Deep writes through shallow copies, 29 forms (`concat`, `slice`, spread, `map`, `flatMap`, `Array.from`,
  `Object.values` and `entries`, `new Map` and `Set`, `structuredClone`, `splice`, …): rejected.
- Iterators as values or captures: `[iterator-cell]`, `[iterator-capture]`.
- RegExp with `g`, `y` or computed flags: `[regexp-state]`.
- Function cells with a `Mut` parameter called with another cell's value: `[inject-type]` or `[type]`.
- DataView, TextDecoder, TextEncoder, WeakMap, Date and Intl: `[new-non-intrinsic]`. `Object.assign`: `[object-assign]`.
- Promises inside records: `[type]`. Duck-typed generator records: rejected.

## Not reached

- Events and listeners at run time: `requestAnimationFrame` is not defined under bun (ev-error-yield).
- Actions invoked from JSX. `drive` calls actions from JS, and the one Error-in-state action
  (ac-then-alias-state-error) ended at `y` but its first snapshot was already `y`, so no change was observed.
- The browser build, bun-verify and the differentials: not run, as asked.
- Whether the real browser boot passes `ss_out(v, 1)` exactly as `compileModule` prints it: assumed, unverified.
