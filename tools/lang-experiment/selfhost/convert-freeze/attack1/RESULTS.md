# Attack 1 on freeze-at-conversion (2026-11-22, 18:18–18:42 CET, from `date`)

Target: the prototype in `../proto/tree`, strongest mode, with all rules on: `SS_BOUNDARY=0 SS_REG=0 SS_CONVERT=1 SS_HYP=1 SS_H=1 SS_V=1 SS_R3X=1 SS_U=1 SS_F=1 SS_T=1 SS_N=1`. Each run was made once without and once with `SS_B=1`. Nothing outside `attack1/` was edited.

## Verdict: alive only with at least 2 more special cases, 11 annotation fixes, and V on constructors built (repairs not built or tested)

There are 246 programs. The strong checker accepts 182 of them. **65 are silent without B and 60 are silent with B.** They fall into four mechanisms. The main design (boundary freeze and registration on) accepts 118 and has **0 silent**: it throws on every one of the five minimal programs.

```
progs-ctl:  -- progs: 246 programs, accepted 189, silent 223, with a run-time error 3 (forced)
progs-noB:  -- progs: 246 programs, accepted 182, silent 65, with a run-time error 109
progs-B:    -- progs: 246 programs, accepted 182, silent 60, with a run-time error 114
progs-main: -- progs: 246 programs, accepted 118, silent 0, with a run-time error 107
```

All four mechanisms are the same hole, and the design relies on it. **R3 converts only `Mut`-typed captures, and ss_f stops at functions and promises.** So any plain-typed local that still aliases a live `Mut` object goes out unfrozen. It can leave through a kept closure, a promise, `state(...)`, or (without B) a direct `return`. I is broken at the point where the plain alias is made. The sink is only where the break shows.

## How to rerun

```
cd selfhost/convert-freeze/attack1 && ./run-all.sh   # ~1 min; writes out/*.txt
python3 table.py                                      # the per-group table below (out/table.md)
bun probe.ts '<cells>'                                # verdict, conversion sites, rewritten text (switches from env)
```

| file | role |
|---|---|
| `observe2.ts` | The observer. Built on `proto/tree/lite/browser/run.ts` `runCells`, the same entry `proto/run-all.sh` uses through run-sets/observe.ts; conversions are compiled in when `SS_CONVERT=1`. |
| `run.ts` | The checker verdict (`checkSources`, tsx). An accepted program is run (`--force` runs all of them). |
| `progs.ts` | The attack programs. |
| `controls.ts` | The observer controls. |
| `ergo.ts` | The ergonomic probes. |
| `show-consumer.ts` | Prints the value of consumer cell `c` in the `consumer/` programs (`out/consumers.txt`). |
| `audit.ts` | Sizes C and N on the TypeScript AST of `INTRINSIC_DECLS`, then measures each candidate on the real JS intrinsic. |

### What observe2.ts reads

- Every fulfilled value of every cell, each run of each cell. Earlier values of a cell are kept and re-read after later runs and yields.
- Promises are followed to the settled value or the rejection reason.
- Functions are called at delivery and called again in each re-read round. The results are compared, and a second call that throws counts as a pass.
- Iterator values are pulled up to 4 times.
- Functions and promises nested inside delivered data are tracked.
- `ser` covers Map, Set, URL, URLSearchParams, typed arrays, ArrayBuffer, DataView, Date, RegExp (including `lastIndex`), Error own properties, getters, and non-index array properties.
- There are two re-read rounds. Each comes after pumping frames and `prog.settle`.
- A state cell's `name$ref` handle is skipped. It reads the current state through a getter by design. This was a false positive in an earlier run: `events-yield-*` were "silent" in the main design only through `s$ref`.

### Timing

- The programs' late writes come in one of two ways: after `for (300) await null` in an async helper that is only called (microtasks), or after a `yield` in a generator cell (pumped frames).
- No program waits on a timer.
- `settle` belongs to the prototype harness. It polls `setTimeout(0)` until the runtime is idle, and caps the wait at a maximum time.

## Controls (`out/controls-ctl.txt`)

There are 18 controls, one per channel: direct value, consumer holding it, promise settled value, promise value, rejection reason, function called again, function in data, earlier generator yield, iterator value, Map, Set, URL, typed array, Date, RegExp lastIndex, Error, getter, and promise of a function.

- **18/18 fired** with the checker skipped and freezing off. 7 of them needed `--force` past the checker.
- In strong mode (`out/controls-noB.txt`), 8 are accepted, 0 are silent, and each of the 8 throws.

Every program is also its own control. In `out/progs-ctl.txt` (conversion off, checker skipped), 223/246 fired. 12 accepted programs did not fire in ctl, so they have no channel and are not counted as survivors (listed in `out/table.md`).

## Per group (`out/table.md`)

| group | programs | accepted (strong) | fired in ctl | accepted and fired | silent, no B | silent, B | accepted (main) | silent (main) |
|---|---|---|---|---|---|---|---|---|
| C | 78 | 65 | 75 | 63 | 34 | 33 | 35 | 0 |
| N | 37 | 23 | 35 | 22 | 17 | 14 | 24 | 0 |
| V | 15 | 9 | 13 | 8 | 2 | 1 | 8 | 0 |
| rest | 6 | 5 | 6 | 5 | 1 | 1 | 5 | 0 |
| destr | 7 | 7 | 7 | 7 | 0 | 0 | 6 | 0 |
| default | 8 | 4 | 8 | 4 | 0 | 0 | 1 | 0 |
| union | 8 | 5 | 8 | 5 | 0 | 0 | 5 | 0 |
| let | 11 | 7 | 10 | 7 | 1 | 1 | 5 | 0 |
| keep | 22 | 18 | 19 | 15 | 0 | 0 | 1 | 0 |
| gen | 10 | 5 | 9 | 4 | 0 | 0 | 1 | 0 |
| throw | 4 | 4 | 4 | 4 | 0 | 0 | 2 | 0 |
| generic | 6 | 3 | 6 | 3 | 0 | 0 | 1 | 0 |
| mutparam | 7 | 7 | 7 | 7 | 0 | 0 | 4 | 0 |
| state | 4 | 2 | 1 | 1 | 0 | 0 | 2 | 0 |
| jsx | 5 | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| spread | 8 | 8 | 7 | 7 | 7 | 7 | 7 | 0 |
| events | 2 | 1 | 0 | 0 | 0 | 0 | 2 | 0 |
| sites | 5 | 5 | 5 | 5 | 0 | 0 | 5 | 0 |
| consumer | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 0 |
| total | 246 | 182 | 223 | 170 | 65 | 60 | 118 | 0 |

The group column is the label I wrote, not the cause. The causes:

- The `rest` and `let` silent programs are spread and C. The three `consumer` programs are one each of C, N and spread.
- The 65 silent programs (no B) collapse to four mechanisms:
  - **C: 36.** No switch repairs them.
  - **N: 18.** `SS_N=0` repairs all 18.
  - **Spread: 9.** No switch repairs them.
  - **V on a constructor: 2** (`ta-view-*`). `SS_N=0` repairs both.
- Ablation over all 65, one switch off at a time (`out/ablate-*0-noB.txt`):
  ```
  ablate N off: -- progs: 65 programs, accepted 65, silent 45, with a run-time error 20
  ablate V off: -- progs: 65 programs, accepted 65, silent 65, with a run-time error 0
  (F, R3X, U, T, H off: the same, silent 65)
  ```
- B removes 5 of the 65. All five reach a cell boundary as a plain value: `reduce-init-direct-return`, `-state-sink`, `-consumer`, `C/map-state-sink` and `V/ta-view-direct-return`, which throws `ss_f: cannot freeze a typed array` with B. B does not reach a function's result or a nested promise, because ss_f stops at both.
- **The with-B silent count holds for a checked consumer too, not only for the harness.** Each `consumer/` program adds `const c = async (a: () => number) => { const n1 = a(); …900 awaits…; return [n1, a()]; }` (`out/consumers.txt`):
  ```
  consumers, B=1:
  consumer/C-consumer-reads-twice: c = [1,2] status fulfilled
  consumer/N-consumer-reads-twice: c = [1,2] status fulfilled
  consumer/spread-consumer-reads-twice: c = [1,2] status fulfilled
  ```

## Break mechanisms, each with a minimal program

Each program below is accepted in strong mode with and without B, and is silent in both. Each fires in ctl, and throws in the main design (`run.ts --only min-`). In each, the observer saw `a#1 call: 1 -> 2`.

### 1. C: the hidden callback argument, literal or named (35 silent)

```ts
const a = function* () { const xs = [1]; let r: number[] = []; xs.forEach((v: number, i: number, arr?: number[]) => { if (arr) r = arr; }); const q = r; yield () => q.length; xs.push(2); yield () => 0; };
```

Named form:
```ts
const a = function* () { const xs = [1]; const f = (v: number, i: number, arr?: number[]): number[] => arr ?? []; const r = xs.map(f)[0] ?? []; yield () => r.length; xs.push(2); yield () => 0; };
```

- **Shapes that break:**
  - An optional or defaulted extra parameter, on an inline literal or a named function.
  - A named `...args: unknown[]` whose result is returned.
  - `let` stashes and `Mut` accumulators inside an inline literal.
- **Shape that is rejected:** an inline literal with `...args`, with `[type] parameter unknown[] does not accept number`.
- **Named callbacks that push into a captured `Mut` accumulator throw.** The throw comes from R3 freezing `out` when the named function is created, not from C. See the ergonomics section.
- **Sinks seen silent:** a kept closure, `Promise.resolve`, `state`, a generator yield, and a `Mut` parameter receiver (`map-mut-param-receiver`).
- **Size** (`out/audit.txt`):
  ```
  == C: 98 callback parameters over 414 members; 66 get more arguments than declared; in 66 an extra argument is the receiver
  ```
  The 66 are every/filter/find/findIndex/findLast/flatMap/forEach/map/reduce/some on Array, every/filter/forEach/map/reduce/some on the nine typed arrays, `Map#forEach` and `Set#forEach`. sort, toSorted, `from` mapFn and then pass only the declared arguments; `then` was not measured.
- **Repair:**
  - Paper rule C wraps *non-literal* functions only. 30 of the 35 silent programs use an inline literal, so C as written leaves them open.
  - C applied to every function passed to an intrinsic callback parameter, so each is called with only the declared arguments, would close all 36. That is unbuilt.
  - The alternative is a static ban on a callback literal that declares more parameters than the declared type. It does not cover a named function, or a literal forwarded through a user helper into an intrinsic, so it would need the wrap as well. The helper case is untested: `callback-via-generic-helper` threw on the frozen `out`.
  - **This is one general rule for intrinsic callbacks, and one more special case for the design.** The comment at `intrinsics.ts:9` already knows about this argument ("omit the third `array` argument on purpose: it would alias a Mut receiver"). The checker does not enforce it.

### 2. N: intrinsics that return the argument itself (17 silent without B, 14 with B)

```ts
const a = function* () { const xs = [1]; const r = [0].reduce<number[]>((acc: number[], v: number): number[] => acc, xs); yield () => r.length; xs.push(2); yield () => 0; };
const a = function* () { const xs = [1]; const r = Array.of(xs)[0] ?? []; yield () => r.length; xs.push(2); yield () => 0; };
```

- **What happens:** N exempts a top-level `Mut` argument to a non-`@retains` parameter from conversion. `reduce`'s `init` and `Array.of`'s arguments are not `@retains`, yet the result is the argument.
- **Size** (`out/audit.txt`, AST + real call):
  ```
  == N: 12 non-@retains parameters whose type parameter reaches the result; 11 keep the argument itself
  ```
  The 11 are `Array#reduce` init, `Array.of`, and `reduce` init on the 9 typed arrays. `structuredClone` is the one candidate that copies.
- **Typing:** without `reduce<number[]>` the checker infers `unknown` and rejects (`parameter number[] does not accept unknown`). The type argument is ordinary code.
- **Repair (unbuilt):** mark the 11 parameters `@retains`. That is an annotation fix, not a rule. The criterion can be computed mechanically ("a parameter whose type parameter reaches the result keeps it"), and `audit.ts` computes it.
  - The copying intrinsics are `new Map(m)`, `new Set(iter)`, `Array.from` and `Object.values/entries/fromEntries`. They are the ones whose conversion crashed the prototype without N. Their parameter types are `Iterable<…>`, not a bare type parameter, so the criterion leaves them out.
  - They return *parts* of the argument, not the argument. Under N only a top-level-`Mut` argument goes unconverted, and its parts are plain, and by I nobody else holds them `Mut`. So they are outside this class. No accepted program tested that: `object-values`, `fromEntries`, `new-map-entries` and `set-ctor-of-muts` were rejected on `[type]`, and `array-from-self` and `concat-arg2` threw.

### 3. Spread argument elements are not conversion sites (8 silent, with and without B)

```ts
const a = function* () { const e: Mut<number[]> = [1]; const xs: Mut<Mut<number[]>[]> = [e]; const g = (...ps: number[][]): number[] => ps[0] ?? []; const r = g(...xs); yield () => r.length; e.push(2); yield () => 0; };
```

- **Same hole, other entries:** `out.push(...xs)` and `out.unshift(...xs)` (`@retains`, into a `Mut<number[][]>`), `Array.of(...xs)`, `g(...m.values())`, and a `Mut<Map>[]` spread.
- **The literal path is closed:** `[...xs]` into a plain slot converts and throws (`array-spread-of-mut-of-mut`). The call-argument path does not convert.
- **`probe.ts` shows no site:** `sites:` is empty for `out.push(...xs)`.
- **Repair (unbuilt):** R2 should cover each element of a spread argument (convert `xs` when its element type holds `Mut` and the parameter's does not). This is a new site kind. It follows R2's own principle, but it was missed, as `throw`, the cell value and `unknown` were before it (proto RESULTS K4). **One more special case.**

### 4. V on a constructor over an existing buffer (2 silent without B, 1 with B)

```ts
const a = () => { const b = new Float32Array(2); const v = new Uint8Array(b.buffer); const h = async () => { for (let i = 0; i < 300; i++) await null; b[0] = 7; }; h(); return { p: Promise.resolve(v) }; };
```
```
CHANGED round 1 a#1.p>: Uint8Array[0,0,0,0,0,0,0,0] -> Uint8Array[0,0,224,64,0,0,0,0]
```

- **`probe.ts` shows no site.** `v` is typed plain and nothing converts it. `Promise.resolve(v)` is `@retains`, but the argument is not `Mut`.
- **Hidden by the sink in round 1.** The four view programs with a kept-closure sink were rejected by `[mut-capture]`. A promise sink passes.
- **Without B**, `return v` is silent too. With B it throws.
- **Known gap.** Paper V says "a `@view` constructor takes its argument's Mut-ness", and proto RESULTS lists "V on constructors" as not done. So this is the cost of an existing unimplemented rule, not a new one. If V on constructors were built, `Promise.resolve(v)` would convert a typed array and throw (R4), which turns this into an ergonomic case.
- `SS_N=0` also repairs it, by converting `b.buffer` (an ArrayBuffer, so a throw).

## Special-case count

| repair | status | kind |
|---|---|---|
| C extended to literal callbacks | needed; paper C is not enough | 1 rule |
| Spread-element site | needed | 1 rule |
| @retains on 11 parameters | needed | annotation; no new rule if the criterion is computed |
| V on constructors | needed; already in the paper, not in the prototype | 0 new |

Before this attack the design already carried H, V, F, U, B, C, R3X, T and N on top of R1–R7. This attack adds at least 2 rules. It also shows that N's sizing (an audit of "intrinsics that do not keep the argument") was wrong for 11 parameters. **Not verified:** that the repairs together leave 0 silent. They were not built, because the prototype tree is read-only for this attack.

"At least" because the site sweep is not exhaustive. Round 4 tried these positions for a missing R2 site, and each converted and threw (`sites/` in the table): `ys[0] = xs` and `o.f = xs` into a `Mut` container, an IIFE argument, a method argument `o.id(xs)`, and a curried `mk()(xs)`.

## Mechanisms that held, or that the checker rejects

Each of these has accepted programs that fired in ctl and threw in strong mode (`out/progs-noB.txt`):

- destructuring: nested, annotated, defaulted, and parameter defaults
- default parameters
- `(q = xs)` and chained assignment
- ternary and `&&`/`||` unions; a `string` union; `unknown` + `Array.isArray`
- `switch`
- `let` reassigned in a loop or `while`
- helpers kept by array, record, alias, ternary, user function, helper result, `Promise.resolve`, `then`, IIFE, recursion, generic identity or optional call
- object methods
- generator yields of functions or records
- `throw`/`catch`, an async rejection, `finally`
- generic identity, pair, and explicit `<Mut<…>>`
- every `Mut` parameter, result and field form
- `state(xs)`
- V on `sort`, `reverse` and `Map.set` results, and on Array/Map `values()` spread

These are rejected or unsupported, which is a result, not coverage:

- **unsupported:** `yield*`, tagged templates, getters, `??=`, `||=`, the comma operator, labelled statements
- **`[free-name]`:** a function declaration used before a captured `const`
- **`[mut-capture]`/`[iterator-capture]`:** typed arrays, views and iterators captured by a kept function (these static rules are still on in HYP mode)
- **`[proto-F]`:** an events cell yielding a `Mut`
- **`[action-capture]`:** an action capturing a `Mut`
- **`[type]`:** JSX children typed `Mut`

### Not covered, and why

- **Cell reruns.** No program uses `drive`, so no cell is rerun by an input change. `reduce-init-cell-input` is an N program over a cell input, not a rerun. "An earlier value after a later run" is exercised only by generator yields.
- **Optional chaining on a `Mut`.** All three programs were rejected (`[type] Mut<number[]> is not assignable to Mut<number[]> | undefined`).
- **`Promise.all`.** Rejected on my own `possibly-undefined` slip, which can be fixed.
- **Helper generators.** `for…of` and `[...g()]` over a `Generator<…>` were rejected (`non-iterable Generator`). `yield*` is unsupported.
- **Islands and workers.** Island results go through `deepFreeze`, which is a no-op with `SS_BOUNDARY=0` (`run.ts` compileFor). The island code is the same rewritten `js`, so the in-island conversions apply. An island's outputs are data, and ss_f deep-freezes a returned literal, so I expect only C, N and spread inside the island cell. This is untested: `observe2.ts` does not pass `checked`, so `compile` refuses.
- **JSX.** Only `jsx-fn-c-alias` was accepted, and it had no channel (the element is rebuilt on each call, so a call reads the current value: ctl did not fire).
- **Listeners/Events.** The event path throws on the late write even with conversion off. Both programs have no channel.
- **Date.** Rejected (`new-non-intrinsic`).
- **RegExp `g`/`y`.** Rejected (`regexp-state`).
- **URL/URLSearchParams/Error.** They have no write API in checked code.

## Ergonomic failures (`out/ergo-noB.txt`, `out/ergo-B.txt`, `out/ergo-main.txt`)

These programs are accepted in strong mode and throw at run time:

```ts
// named callback capturing an accumulator: R3 freezes out when f is made
const a = () => { const xs = [1, 2]; const out: Mut<number[]> = []; const f = (v: number) => { out.push(v * 2); }; xs.forEach(f); return out.length; };
// same with { add: (v) => out.push(v) }, a helper passed to a user function, and [() => out.push(1), ...] called in a loop
const a = () => { const b = new Float32Array(2); b[0] = 1; return b; };          // ss_f: cannot freeze a typed array or DataView
const a = () => { const b = new Float32Array(2); b[0] = 1; return b.slice(); };  // same, with B only
const a = () => { const xs = [1]; const f = () => xs.length; xs.push(2); return f; };                         // write after capture
const a = async () => { const xs = [1]; const p = Promise.resolve(xs); xs.push(2); const v = await p; return v.length; };
```

- **The inline-literal forms run.** The same accumulator written as an inline callback (`xs.forEach((v) => { out.push(v * 2); })`) runs. Naming the callback turns it into a run-time throw, which an author would not expect.
- **The main design rejects the four helper programs statically** (`[mut-capture] Mut out written by a function the cell keeps`). It also rejects the last two. So the hypothesis turns these static errors into run-time throws. The main design accepts and runs both typed-array programs.
- **Static oddities found on the way:**
  - `Mut<number[]>` is not assignable to `Mut<number[]> | undefined`, which blocks optional `Mut` fields (`optional-chain-fixed`).
  - `new Float32Array(new ArrayBuffer(8))` is not writable (`[member-write] … not Mut`).
