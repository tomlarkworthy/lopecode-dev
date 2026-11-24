# freeze-attack13: attacks on the x1 rules (run 2026-11-24)

Scope: the rules x1 built (`NOTES-checker-port.md`, "2026-11-24: x1"): a `void` result takes `undefined` only; `unknown`
and `object` take plain data only, with 14 exempt built-in signatures; a call-signature type may not declare a member
every function has; `Object.fromEntries` is `@plain`; the async guard (`fnreg.ts` `guardEdits`, `freeze.ts`
`guardAsync`).

Run from `tools/lang-experiment`. Every file is in `selfhost/freeze-attack13/`; no other file was edited. No build,
`verify.ts`, gates script or git command was run. Each candidate file was run under both runners:

```
bun lite/infer/attack/drive-rt.ts  selfhost/freeze-attack13/<f>.ts   # compiled module   -> <f>-rt-out.txt
bun lite/infer/attack/drive-run.ts selfhost/freeze-attack13/<f>.ts   # runCells          -> <f>-dr-out.txt
bun selfhost/freeze-attack4/probe.ts selfhost/freeze-attack13/<f>.ts # verdicts          -> <f>-probe-out.txt
```

A row is **silent** when it was accepted and its drive printed DIFF; **loud** when accepted and then a cell errored.
Both runners gave the same silent set on every file (compared with `diff` of the `SILENT` lines).

## Breaks, by class

| id | class | what | minimal program (`min.ts`) | rt | dr |
|----|-------|------|------|----|----|
| VA | (i) forgetting | the `void` result of calling an `Action` holds what the action's function returned | `min-va-action-result`, `min-va-handle` | silent | silent |
| U | (i) forgetting | a value joined with a value typed `unknown` is typed `unknown`, which counts as plain, so it is never tested | `min-u-promise`, `min-u-resp`, `min-u-action` | silent | silent |
| T | (i) forgetting | a type parameter narrowed by `typeof` becomes `object`, which counts as plain | `min-t-narrow` | silent | silent |
| L | (ii) run-time name | `Array.from` reads `length` and numeric keys a record type left out; its elements are typed `undefined` | `min-l-arraylike` | silent | silent |

U and T share one clause: `plainWith` counts `unknown` and `object` as plain (`opaque`). They are counted as two
breaks because the value reaches that type at two different sites (a join; a narrowing).

```
bun lite/infer/attack/drive-rt.ts  selfhost/freeze-attack13/min.ts   # min-rt-out.txt
bun lite/infer/attack/drive-run.ts selfhost/freeze-attack13/min.ts   # min-dr-out.txt
bun selfhost/freeze-attack4/probe.ts selfhost/freeze-attack13/min.ts # min-probe-out.txt
```

No break of class (iii) or (iv) was found. `min.ts` runs: 8 candidates accepted and silent (7 breaks above plus the out-of-scope `min-e-extra-arg`), 3 controls
fired, under both runners (`min-rt-out.txt`, `min-dr-out.txt`); `min-probe-out.txt` gives ACCEPT for every non-control row.

### VA. An Action's call result is `void` (class i)

```ts
const c = (): StateCell<number> => state(0);
const a = () => action(() => "s");
const b = (a: Action<[]>, c: State<number>) => action(() => { c.set(a() ?? 7); });
const g = (c: number) => c;
```

The drive calls `b` as another language would. Both runners (`min-va-action-result`):

```
   drive -> DIFF g is outside its type: string "s"
   show g = "s"
```

- **Where.** `ix-prelude.ss.ts` `ixActionCall` types `action(f)` as `named("Action", tup of f's parameters)`; `f`'s
  result is dropped. `ix-core.ss.ts:272` `ixActionFn` gives a call of an `Action` the result `VOID`. The value is what
  `f` returned (`prelude.runtime.ts` `action`: `storeFeed({ t: "exit", …, value: v })`). x1's rule R applies to a
  declared `void` result; an Action's `void` is not declared and nothing checks what `f` returns. Type kind: `void`
  (the result of an `Action` call). Assignment site: the function given to `action(...)`, its return.
- **Leaving.** A State handle returned by the action lands in a `number` state cell: `min-va-handle` gives
  `g = "[object EventTarget]1"`. A Mut `Map` (`v-act-launder-mut`) and an Action under `() => number`
  (`v-act-launder-action-state`, `guard.ts`) leave the same way.
- **Variants, silent under both runners** (`void.ts`, 22): `??`, `||`, `+`, a function, array, record or tuple
  result, an Action result, `map`, `forEach`, `Array.from`, `reduce`, `toSorted`, `update`, a chain of two actions, a
  listener-driven call, narrowing (`r === undefined ? 0 : r` gives `never` holding `"s"`). Held: `typeof r === "number"`.
- **Not a repeat.** No row of `x1-attacks.ts`, `w1-attacks.ts` or attack 12 uses an Action's result (grep for
  `= a()`, `a() ??` over those files: 0 hits; not read row by row).
- **Record types.** None involved, so exact records would not stop it (inferred).

### U. A join with `unknown` absorbs a non-plain value (class i)

```ts
const g = (): object => { const one: unknown = 1; const xs = [one, Promise.resolve("s")]; const u = xs[1];
  return typeof u === "object" && u !== null ? u : {}; };
```

Both runners: `DIFF g is outside its type: string "s"` (`min-u-promise`). The runtime adopts the promise at the
cell's top.

- **Where.** `types.ss.ts:64` `union`: any `unknown` member makes the union `unknown`. `subtype.ss.ts` `plainWith`
  then counts `unknown` as plain (`case "unknown": case "object": return R.opaque === true`), on the stated ground that
  "it was checked when it was given that type". A join is not a given site: `[one, K]`, a ternary, `??`, two
  `return`s, `with`, `flatMap`, `find`, `at`, `slice`, `Array.from`, a spread of an `unknown[]` all produce `unknown`
  with no check. Type kind: `unknown` made by a join. Site: the join (array literal element type, conditional
  branches, inferred return, an intrinsic's `T` unified with `unknown`).
- **Uses, each silent under both runners** (`unk.ts`, 12 sites x 4 kinds, 43 of 48 accepted, 43 silent):
  - a promise or a generator object reaches `object` at a cell's top: 12 + 12;
  - a response leaves its cell; a reader in another language reads it twice: `second read threw Body already used`
    (8 sites; 4 rejected by `[handle-pass]` or `[iterator-capture]`);
  - an Action under `toJSON` inside an action body: `JSON.stringify` calls it with `""` where `Action<[number]>` is
    declared, `c.set(n + 1)` stores `"1"` (11; `with` is `[action-pass]`).
- **Held twins.** The same Action under `toString` in a cell body, sync or after an `await`, is refused by the guard
  (`u-arrlit-action-tostring-*`: `action called during a cell evaluation`, loud).
- **Also accepted** (`p5-probe-out.txt`): `Array.of(one, fn)`, `Object.values`, `cast<number>(fn)`, a state cell of
  `readonly unknown[]` holding a promise (`unk2.ts` `u-arrlit-in-state`, no use found).

### T. A narrowed type parameter is `object` (class i)

```ts
const g = (): object => { const id = <T,>(x: T): object => (typeof x === "object" && x !== null ? x : {});
  return id(Promise.resolve("s")); };
```

Both runners: `DIFF g is outside its type: string "s"` (`min-t-narrow`). The forgetters table says a type parameter
is not plain inside a generic body; after `typeof x === "object"` the value's type is `object`, which `plainWith`
counts as plain. Type kind: `object` from narrowing a type parameter; site: the generic's `return`.
Silent variants (`unk.ts`, `unk2.ts`): a generator, an async generator, the cell read by another cell
(`typeof p === "string" ? 99 : 0` gives 99), and a promise inside a returned record read with `await p.o` (`"s"`
typed `object`). `typeof x === "function"` narrowing is accepted too (`p5` `P22`).

### L. `Array.from` reads keys the type forgot (class ii)

**Scope caveat.** The keys are literal, and the part is forgotten by w1's width rule, not an x1 rule; the run-time-key
twin (`l-fe-length`, a `fromEntries` record) held. It is in the brief's scope 4 list (`length`, numeric keys) and is
counted here; the owner may count it against w1 instead.

```ts
const g = () => { const o = { length: 1, 0: "s" }; return Array.from(o); };
```

Both runners: `DIFF g is outside its type: object ["s"]`. `intrinsics.ts` declares
`from(src: { readonly length: number }): undefined[]`; the record `{ length; 0: string }` is given that type by width
(w1 lets a plain part be forgotten), and `Array.from` reads the forgotten numeric keys. Silent variants (`keys.ts`, 6):
a parameter, a cell input, the mapper overload (`(v, i) => v ?? i + 5` gives `["s"]` typed `number[]`), a record
element. Held: `cast` copies only `length` (`l-cast`), a `fromEntries` record is not assignable to
`{ readonly length: number }`, an array, string or typed array given that type is `[forgets]`.

## What held, by route

Totals: 483 in-scope candidate programs run under both runners (min.ts and extra.ts not counted), plus 7 verdict-only
probe files `p1.ts`–`p7.ts` (248 sources).

```
file        rows  accepted  silent  controls fired (rt / dr)
void.ts       46     40       22      2/2 / 2/2
unk.ts       133    101       50      4/4 / 4/4    (43 U, 5 T, 2 equals; see below)
unk2.ts        4      4        2      1/1 / 1/1
callsig.ts   112     45        0      2/2 / 2/2
keys.ts      124     84        6      1/1 / 1/1
guard.ts      51     48        0      7/17 / 6/17
guard2.ts     10     10        0      1/5 / 1/5
outside.ts     3      1        0      1/1 / -     (drive-rt only)
```

- **void (scope 1), other than VA.** A `void` union, `void expr`, `() => undefined`, a block body that only assigns,
  `Promise<void>` results, `then` on `Promise<void>`, a record member typed `void`, a callable interface `(): void`,
  `memo` of a `void` function: held. `forEach` callbacks returning a function or a response: `[forgets]`,
  `[handle-pass]`. `log(fn)`/`log(response)`: `[forgets]`/`[handle-pass]`. Returning an assignment under `void`:
  `[type]`. Comma expressions: unsupported. `Promise.finally`, `catch`, `JSON.parse` revivers, `replace` with a
  function: unsupported or `[arity]`. **Accepted, no use found:** `function* g(): Generator<number, void> { yield 1;
  return 5; }` (`v-held-gen-return-val`): the return value is not checked against `void`, but nothing reads it
  (`.next()` is unsupported, spread and `for…of` drop it).
- **unknown/object exemptions (scope 2).** Each of 14 calls (11 of `inspects.txt`'s 14 signatures: the three `[banned-member]` ones,
  `Object.defineProperty`, `defineProperties`, `setPrototypeOf`, left out; plus template, `messageOf` and `equals`, which
  are not in that list but take `unknown` and were accepted: `String`, `Number`, `Boolean`, `Array.isArray`,
  four `Number.isX`, `JSON.stringify({ k })`, `Object.keys`, `Object.is`, template, `messageOf`, `equals`) was given a
  function that throws when called, a generator, an array iterator, a Mut `Map` and a response: 70 rows, 49 accepted,
  none called the function, consumed the iterator or body, or changed the map. The
  exemption is wider than `inspects.txt`: template, `messageOf` and `equals` accepted a response (`x-*-resp`) where
  `Object.keys`, `Number` and `Array.isArray` gave `[handle-pass]`, and `equals(a, a)` accepted an Action (`p3`
  `equals-act`); no use found at run time. `equals` answers `true` for two
  different promises and for two different responses (`x-equals-promises`, `x-equals-resps`): no value is outside its
  type and `equals` keeps and calls nothing, so not counted as a break; it is a wrong answer for values it cannot see
  into. `catch (e)`, `throw fn`, `Promise.all` of non-promises, `await` of a number, `never[]` push, generics with an
  explicit `unknown`, default type arguments, `instanceof`: rejected or unsupported; `catch (e)`, `await 5`, `never[]` and `in` narrowing were accepted but not run (`p1-probe-out.txt`).
- **Call signatures (scope 3).** 14 member names x 7 sources (arrow, function expression, `memo`, async arrow, `now`,
  `random`, `log`) plus 14 forms: every member in `FN_OWN_MEMBERS` was `[forgets]` (64) or `[type]`/`[no-member]`;
  the 45 accepted rows read `undefined` and held. `bind`, `call`, `apply`, `name`, `length` on a function type are
  `[no-member]`; an Action has no members; overloads and intersections are rejected or unsupported. The capabilities
  are bound or arrow functions (`ownprops.ts`: bound `fetch` has only `length`, `name`), so `fetch.preconnect` is not
  reachable here.
- **Run-time keys (scope 4), other than L.** 12 names (`toString`, `valueOf`, `toJSON`, `then`, `constructor`,
  `__proto__`, `length`, `0`, `hasOwnProperty`, `next`, `return`, `size`) x 3 builders (`fromEntries`, a `Map`,
  an `Object.entries` round trip) x 3 uses (`JSON.stringify`, `await Promise.resolve(o)`, `equals`): 108 rows, 72
  accepted, 0 silent, 0 loud. `Object.assign`, spread of an index record, computed keys: unsupported. `cast` of an index record:
  `[cast-type]`. `URLSearchParams` of such a record and `structuredClone` with own `__proto__`: held.
- **Guard (scope 5).** Two routes found let an accepted program hold an Action where its type does not say so: VA (launder the
  Action into a `State<readonly (() => void)[]>`) and U (an Action joined with `unknown`, then put under `toString` or
  `toJSON` by `Object.fromEntries`). VA was run on every path below; U on two cell paths (sync and after `await`,
  `unk.ts` `u-arrlit-action-tostring-*`: refused, loud) and inside action bodies (break U, not a guard path). 25 accepted G rows (`guard.ts`) and 10 (`guard2.ts`) call it on
  every listed path; the guard refused it under both runners in every row that reached the call (`action called during
  a cell evaluation`, as an error of `g` or a late throw). With `SS_MEASURE_GUARD=0` (`guard-rt-guard0-out.txt`,
  `guard2-rt-guard0-out.txt`, drive-rt) 20 + 5 of those rows fire, so the vehicle sees the call. Paths covered: sync,
  after `await`, `then` callback (direct, `["then"]`, `?.then`, `(p.then)(…)`, after `Promise.all`), async object
  method, async generator after a yield or an await, sync generator between steps, nested helper, `try/finally`,
  caught rejection, sort/map callback after `await`, expression body, kept async function, kept sync function given to
  `then`, async and sync generator `finally` on `return()`, `invalidation.then`, `await invalidation`, a state-cell
  initialiser, an events generator body and `then`, a listener body and `then`, a JSX child. Events rows were read from the final `show c` line, after the harness pumped frames:
  `c = 0` with the guard on under both runners for `g-events-gen-finally`, `g-agen-invalidation` and `g2-events-*`.
  With the guard off, `g-agen-invalidation` and `g2-events-then` show `c = 1` (reached and refused);
  `g-events-gen-finally`, `g2-events-body` and `g2-events-between` show `c = 0` (the call not shown to be reached;
  not counted as covered).
  - **Uncovered paths the checker rejects** (`p7-probe-out.txt`; each control fires under both runners):
    `.catch` (unsupported intrinsic), `queueMicrotask` (`[free-name]`), a thenable literal (`[banned-member]`), a
    `then` spread (unsupported), `p.then.bind` (`[no-member]`). `new Promise` is unsupported; its controls were refused
    at run time. `memo` of an async function is `[memo-pure]`. Async components are `[type]`. An async function from
    another language: the typed parameter is `[boundary-type]`, an `unknown` one is refused at run time ("expected
    data, found a function"); its control fires (`outside.ts`, drive-rt).
  - **False positives (class iv): none.** 23 F rows: a legitimate top-level call (the drive, a listener on a sync
    events cell, a JSX `onClick` called by the drive) while one or two async cells wait at `await invalidation`, in
    `try/finally`, in a loop, in a nested helper, in an async generator, on a pending `then`/`Promise.all`, in a kept
    async function, after a caught rejection, with interleavings call/settle/call, two sync calls, calls between
    microtask turns and a call from a promise callback the drive made. Every call returned and `seen` had the
    expected count under both runners. Control `f-ctl-depth-raised` (`guard2.ts`) raises `rt.evalDepth` around the
    drive's call and fires under both runners, so the vehicle sees a refusal.

## Other, not investigated

- **Callback arity (out of scope, not counted).** A callback with an optional parameter past the intrinsic's
  declared ones receives the run time's extra argument: `[5].map((x: number, i?: number, s?: number) => (s ?? 0) + 1)`
  gives `["51"]` (`min-e-extra-arg`, both runners). `extra.ts`: 29 rows, 21 silent under both runners (`map`,
  `filter`, `reduce`, `forEach`, `find*`, `some`, `every`, `flatMap`, `Map`/`Set`/`Uint8Array` `forEach`), including
  a write through the receiver into a `readonly number[]` local (`v-extra-mut-alias-forEach`, `[3,9]`). The comment at
  the top of `intrinsics.ts` says the third argument is omitted on purpose; no earlier RESULTS or NOTES entry records
  this path (grep for "third argument", "extra argument").
- `equals` on promises, generators and responses (above).
- A promise nested in a published record is replaced by `p.then(deepFreeze)` (`freeze.ts:106`), not refused, so
  `{ o: <promise typed object> }` publishes (`unk.ts` `t-narrow-in-record`).
- `runCells` treats any cell whose text matches `/\bon\s*\(/` as a listener (`run.ts`); not tested.
- `action-pass` for `equals(a, a)` with an Action: accepted (`p3` `equals-act`), contrary to S6.6's text; harmless at
  run time (`Object.is`).

## Could not test

- `compile` islands: in drive-rt the capability is `{ islands, for }` and a cell gets `for(...)`'s function, so its own
  members were not reachable from a call-signature type.
- A browser run; whether the notebook's `fetch` is ever unbound (`stdlib/build.ts:57` binds it).
- `invalidation` callbacks and generator `return()` fire only when an input changes; rows that change an input use an
  action (`bx`), so "with no event" does not apply to them.
- drive-run has no `outside` cells (`outside.ts` ran under drive-rt only).
- Whether VA, U and T predate x1: no pre-x1 tree was run (inferred from the code that they do).
