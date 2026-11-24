# freeze-attack12: attacks on the w1 changes (run 2026-11-24)

Scope: the w1 forgetting rule (`lite/subtype.ss.ts` `takesRecord`/`plainWith`, with `ixHides` for `unknown`/`object`
targets), the `[banned-member]` conversion-hook ban, and the compiled run-time guard (`lite/freeze.ts` `out.cell`/`out.run`/
`guardSteps`).

Run from `tools/lang-experiment`. Every file is in `selfhost/freeze-attack12/`, and no other file was edited. No build,
`verify.ts`, `run-all.sh` or git command was run. Each candidate file was run under both runners:

- `bun lite/infer/attack/drive-rt.ts <file>`: the compiled module, output in `<file>-rt-out.txt`;
- `bun lite/infer/attack/drive-run.ts <file>`: `runCells`, output in `<file>-dr-out.txt`.

Verdicts and diagnostics come from `bun selfhost/freeze-attack4/probe.ts <file>`: `q0.ts`–`q8.ts`, `sweep-probe-out.txt`
and `min-probe-out.txt`. A row counts as **silent** when its drive printed DIFF. It counts as **loud** when it was accepted
and then failed at run time.

## Breaks, by class

| id | class | minimal program (in `min.ts`) | rt | dr |
|----|-------|-------------------------------|----|----|
| V | (i) forgetting | a `void` function result takes a response | silent | silent |
| O | (i) forgetting | a promise or generator object given `object` at a cell's top | silent | silent |
| H | (ii) conversion hook | `Object.fromEntries` makes own `toJSON`, `then`, `toString`, `valueOf` | silent | silent |
| G | (iii) guard gap, both runners | an Action called after an `await`, or in a `.then` callback, while the cell is pending | silent | silent |
| C | (iv) other, in `takesRecord` | a record type with a call signature declares `name?: number` over a function's own `name` | silent | silent |

Commands for every quoted output in this section:

```
bun lite/infer/attack/drive-rt.ts selfhost/freeze-attack12/min.ts    # min-rt-out.txt
bun lite/infer/attack/drive-run.ts selfhost/freeze-attack12/min.ts   # min-dr-out.txt
bun selfhost/freeze-attack4/probe.ts selfhost/freeze-attack12/min.ts # min-probe-out.txt: every min-* row ACCEPT except the control
```

### V. A function type whose result is `void` takes a function that returns a response (class i)

```ts
const g = async (fetch: Fetch) => { const res = await fetch("https://x.test/"); const f: (y: FetchResponse) => void = (y) => y; return [f(res)]; };
```

The same output under both runners (`min-void-resp`):

```
   drive -> DIFF one-shot: first read body, second read threw Body already used
   show g = [{}]
   SILENT
```

The drive stands for a reader in another language. It reads `g[0].text()` twice.

- **Where the forgetting happens.** The assignment `f: (y: FetchResponse) => void = (y) => y`, at a function type's
  result. `fnSubWith` returns `t.ret.k === "void" || sub(s.ret, t.ret)`, so a `void` result takes any result without a
  check. `ixHiddenFn` then compares `f.ret` with `void`, and `ixMayHide(void)` is false, so `[handle-pass]` does not fire.
  The call `f(res)` has type `void` and holds the response. `[iterator-cell]` does not look inside `void`.
- **Record types.** None is involved, so exact record types would not have stopped it (inferred from the code path).
- **Variants** (`forget2.ts` `v-*`, 11 silent under both runners):
  - the parameter typed `Mut<FetchResponse>`;
  - `(y: Mut<FetchResponse>): void => y`, an annotated `void` return. The checker accepts a returned value under it,
    and `const g = (): void => 1;` holds 1 (`min-void-cell`);
  - the function held in a record member;
  - the result placed in a record member typed `void`, returned directly, or in an array;
  - `[res].map((y): void => y)` and `[res].map(id)`;
  - a second cell that takes `{ readonly v: void }` and returns it.
- **Rejected variants:** an async function typed `() => void` (`[type]`), and a generic `run<T>(h: (y: T) => void, y: T)`
  (`[handle-pass]`). A closure `() => res` is `[iterator-capture]`. `Promise<void>` as a cell's annotation is `[type]`.
- **Other kinds through the same `void` result** (sweep `fn-ret-void*`, `cb-void`): Actions, State and Events handles,
  functions, promises, Muts and elements all reach `unknown` this way and are accepted. `forget.ts` `f-action-void-*` and
  `f-state-void-leaves` show an Action or State handle leaving its cell as `unknown`. No SoundScript reader can call
  `unknown` (S9.6), and a call from another language is a top-level call (S6.13), so no unsound use was found for
  those kinds.
- **Iterators through `void`** are accepted at state content, `update`, an action argument, an events yield, a memo
  result and a cell's `(): void` result (`forget3.ts` `f3-*-void-iter`). Each is loud under both runners: "an iterator
  or generator object cannot leave its cell".

### O. A promise or a generator object given `object` at the top of a cell (class i)

```ts
const g = (): object => Promise.resolve("s");
const g = (): object => { function* mk() { yield 1; } return mk(); };
```

Both runners: `DIFF g is outside its type: string "s"` (`min-object-promise`) and `DIFF g is outside its type: number 1`
(`min-object-generator`).

- **Where the forgetting happens.** The whole value is given `object`, as a return annotation or as `const u: object = …`.
  `forgotWith` returns null for an `object` target, and `ixHides` looks only for Actions and handles. The run time then
  treats the value by what it is. `publishOut` adopts a promise, and it runs a value with `next` and `return` as the
  cell's generator. So the cell holds a string or a number while it is checked as `object`.
- **Use.** A reader `(g: object) => typeof g` gives `"string"` or `"number"`
  (`f3-promise-object-consumer`, `gobj-consumer-typeof`). `Array.isArray(g) ? … : typeof g === "string" ? 99 : 0`
  gives 99 (`gobj-consumer-keys`).
- **Record types.** None is involved, so exact record types would not have stopped it (inferred).
- **Variants, silent under both runners:** an async generator object (`gobj-object-async`); `object | null` and
  `object | number` (`gobj-object-union`, `f3-promise-object-union`); a return annotation; `const u: object`.
- **Given `unknown` instead of `object`** (`f-gen-unknown`, `f-gen-catch`, `f-gen-generic-unknown`, and others), the
  generator is still run as the cell's generator (`g = 2`). `unknown` takes that value, so it is not a type break.
- **Nested** in a record or an array, a generator object is refused at run time (loud). Array and Map iterators are
  refused at the top as well.

### H. `Object.fromEntries` gives a record own conversion members (class ii)

The `[banned-member]` ban reads declared members and literal keys. `Object.fromEntries([[k, v]])` makes an own property
from data. Its type is `Mut<{ [k: string]: V }>`, and a computed write of the same key is refused, but the
`fromEntries` call itself is accepted.

```ts
const g = () => JSON.stringify(Object.fromEntries([["toJSON", () => undefined]]));
const g = async () => Object.fromEntries([["then", (r: (v: string) => void) => r("s")]]);
```

Both runners: `DIFF g is outside its type: undefined undefined` (`min-fe-tojson`) and `DIFF g is outside its type:
string "s"` (`min-fe-then`).

- **Keys.** A literal, a `const`, a key built with `join`, a `Map` passed to `fromEntries`, and the entries of another
  record (`hooks.ts` `h-act-key-*`).
- **Type breaks, silent under both runners:** `then` on an async cell's value, on `Promise.resolve(o)`, on a helper's
  result and on an async generator's yield; `toJSON` giving `undefined`.
- **The hook ran but the type held** (11 rows marked `HOOK RAN`): template, `String`, `messageOf`, `join`, `== 1`,
  `Number`, a `toJSON` shape, and `await o`, which is typed `unknown` (S9.7).
- **With an Action as the hook** (`toString` or `valueOf`), these are accepted (`q6.ts`): a template, `` `${[o]}` ``,
  `join`, `"" + o`, `messageOf`, `toSorted()`, `o == 1`, `o == "x"`, and a `Map` key.
  - A sync cell is refused by the guard (loud).
  - After an `await` it is silent: see G.
  - `String(o)` and `JSON.stringify(o)` with an Action-valued record are `[action-pass]`.
- **Loud at run time:**
  - a sync return of a thenable ("a value with a callable then … cannot leave its cell"), and the same nested in an
    async result;
  - an Action as `then`: "an argument of the action a reaches a function or a promise that no finished cell has
    published".
- **Values from another language** (`h-outside-*`, drive-rt only) held. The boundary copy drops the JavaScript
  object's `toString`, and an `unknown` boundary refuses it ("expected data, found a function").
- **Repeats.** fa10 `b-fromEntries-read` and d1 `d1-key-entries-w1` used such keys with number values and read them
  only as data. Neither ran a function through a conversion.

### G. The cell guard is synchronous (class iii, both runners)

`underEval` (compiled) and `run.ts`/`cells.ts` (`runCells`) both count `evalDepth` only while the body runs
synchronously. After an `await`, or in a `.then` callback, the cell is still pending, and an action call runs as a
top-level call.

- **Accepted programs.** A direct call there is `[action-call]` (`min-ctl-action-after-await` is REJECT in
  `min-probe-out.txt`). So in an accepted program G was reached only through H's hook.

```ts
const c = (): StateCell<number> => state(0);
const a = (c: State<number>) => action(() => c.set(1));
const g = async (a: Action<[]>) => { await null; return `${Object.fromEntries([["toString", a]])}`; };
```

Both runners (`min-fe-action-after-await`):
```
   drive -> DIFF STATE c is 1 with no event; g fulfilled
   show c = 1
   show g = "undefined"
```

- **A sync cell is enough** when the conversion is in a `.then` callback. `min-fe-action-then-callback` returns
  `Promise.resolve(1).then(() => `${o}`)` and is silent under both runners, with c = 1.
- **With the checker skipped,** `min-ctl-action-after-await` (`await null; a();`) fires under both runners. The guard,
  not the vehicle, is what misses it.

The guard table (`guard.ts`, both runners give the same result on every row). "Refused" means the guard, or another
run-time check, threw.

```
route (accepted: through the hook; ctl: a() direct, checker skipped)   accepted rows        ctl rows
sync body, helper, map callback, component, JSX child                  refused              refused
async before the first await                                           refused              -
async after an await (1, a loop, await Promise)                        c=1 silent (3)       c=1 silent
.then callback, sync or async cell                                     c=1 silent (2)       c=1 silent
sync generator, first step and between yields                          refused              refused
async generator, first step / between yields                           refused              refused
async generator after an await inside a step                           c=1 silent           c=1 silent
kept function called by a second cell, sync                            refused              refused
kept function called by a second cell after await, or via .then       c=1 silent (2)       c=1 silent
another cell's value (a record), converted sync                        refused (2)          -
another cell's value, or a state's content, converted after await      c=1 silent (3)       -
toSorted comparator after await                                        c=1 silent           -
events cell step (listener on it)                                      refused (console)    -
memo-wrapped function                                                  [memo-pure]          refused (memo's own check)
state set/update after await; s.set passed to map                      [state-write]        refused (set's own check)
invalidation.then                                                      [mut-capture] or not run   not run (never invalidated)
```

Of the 17 ctl rows, 13 did not fire. In 12 of them the guard or another run-time check held. `g-ctl-invalidation`
never ran its callback.

### C. A record type with a call signature takes a function before the forgetting checks (class iv)

```ts
interface F { (x: number): number; readonly name?: number }
const g = () => { const f: F = (x: number) => x; return f.name ?? 0; };
```

Both runners: `DIFF g is outside its type: string "f"` (`min-callsig-name`).

- **Why.** `takesRecord` returns true at once when the target has a call or construct signature. `recSubWith` then
  counts a function source as `closed`, so a missing optional member is accepted.
- **Silent variants** (`forget3.ts`): `length?: string`, `bind?: number`, an alias, a parameter, and a kept cell.
  `call?: (t: number) => string` is loud ("undefined is not a function"). An Action given such a type is
  `[action-pass]`.
- **Class.** This is attack 11's B-2 again, reached through the exemption. The re-typed member is plain (a string or a
  number), so this is not class (i).
- **Record types.** Exact record types would stop it only if a record type with a call signature were exact too
  (inferred).

## What held, by route

`sweep.ts` holds 877 programs: 10 kinds × 88 sites, with the `Mut` kind skipping sites that need its type written. Each
program builds `o = { n: 1, x: K }` or uses `K` itself, then gives it a less specific type. All 877 ran under both
runners with the same verdicts (accepted 208) and 0 silent. That is expected, since they return 1.

```
kind      rows  accepted  rejections by rule (a row can have more than one)
fn          88   30   forgets 40, type 22, unsupported 2, unknown-type 2
action      88   10   forgets 38, action-pass 24, type 22
state       88   10   forgets 40, handle-pass 21, type 22
events      88   10   forgets 40, handle-pass 21, type 22
promise     88   30   forgets 40, type 22
iter        88   27   forgets 40, type 22, iterator-capture 8
gen         88   27   forgets 40, type 22, iterator-capture 8
resp        88    7   forgets 40, handle-pass 21, type 24, iterator-capture 8
mut         85   28   forgets 38, type 22
elem        88   29   forgets 40, type 22, reserved-name 5
```

- **Every record-width site was rejected for every kind:**
  - annotation, literal, argument, return, array and tuple element, nested member, union arm;
  - alias, interface, `extends`, merged interface, intersection;
  - optional member of another type, `Partial`, `Readonly`;
  - explicit and inferred generics;
  - `Map`, `Set` and `Promise` arguments; function result variance; ternary, `??`, `||`, `&&`;
  - spread, rest, `Object.assign`, `Array.from`, `flatMap`, `concat`, `map`, `filter`, `find`, `reduce`;
  - `memo` argument and result, `let` assignment, default parameter, destructuring, `for…of`, `snapshot`,
    `structuredClone`;
  - JSX prop, state content, `update`, action argument, events yield, async `Promise<N>` (`q8.ts`).
- **What was accepted:** targets that name `unknown` or `object` (a member, an index signature, `Record<string,
  unknown>`, `readonly unknown[]`, a tuple slot, a `Map` value, `id<unknown>`, `catch`), the `void` result (V), `cast`
  (it copies only declared members: held), `messageOf`/template/`String` on the value, and `Object.fromEntries` into
  `{ [k: string]: unknown }`.
- **Accepted, then loud at run time** (`forget.ts`, 83 rows): an iterator or generator object hidden as `unknown` or
  `object` anywhere other than the top of a cell. Of the 34 accepted iterator rows, 32 were refused by "an iterator or
  generator object cannot leave its cell". The other 2, `cast<unknown>`, got a copy. The iterator control never fired,
  because that run-time refusal stops the value first. A response is rejected at 17 of the 19 sites, by
  `[handle-pass]` or by `[iterator-cell]` for `entries` and `fromEntries`. The 2 accepted sites are the `void` result
  (V) and `cast<unknown>`, which copies.
- **Accepted, no use found:**
  - Actions and State/Events handles through `void`, through `cast<unknown>`, and through `Object.fromEntries` into
    `{ [k: string]: unknown }` (`ixHiddenIn` does not walk a source's index signature);
  - a `Mut` hidden as `unknown` (frozen at publish: `f-mut-*`).

Totals: 1104 candidate programs (non-control) were run under both runners:

| file | rows | silent |
|------|------|--------|
| `sweep.ts` | 877 | 0 |
| `hooks.ts` | 52 | 20 |
| `guard.ts` | 37 | 12 |
| `forget.ts` | 83 | 1 |
| `forget2.ts` | 23 | 17 |
| `forget3.ts` | 22 | 11 |
| `min.ts` | 10 | 9 |

- 27 controls: 11 fired. Of the 16 that did not fire:
  - 13 were refused by the guard or another run-time check;
  - `g-ctl-invalidation` never ran its callback;
  - `f-ctl-iter-own-type` was refused at publish;
  - `f-ctl-gen-own-type` was run as the cell's generator.
- 205 more programs were verdict-only probes (`q0.ts`–`q8.ts`).
- drive-run accepts 2 fewer `hooks.ts` rows: the `outside` rows are `[inject-unknown]` there.

## Could not test

- `compile` islands: the call shape (`{ inputs, refs, outputs, options }`) was not built.
- A cell in error being retried.
- `invalidation` callbacks: the harness never invalidates a cell.
- The `pool` worker path.
- A browser run.
- `outside` values under drive-run.
- Whether V, O and H predate w1: no pre-w1 tree was run. `fnSubWith`'s `void` clause and the `fromEntries` signature
  are not named in the w1 notes (inferred).

## Other, not investigated

- `const g = (): void => 1;` is accepted and holds 1 (`min-void-cell`). This is the annotation side of V.
- `ixHiddenIn`'s record case walks a source's props, not its index signature. So `Object.fromEntries([["x", a]])` reaches
  `{ readonly [k: string]: unknown }` without `[action-pass]`.
