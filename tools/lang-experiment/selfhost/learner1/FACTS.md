# Facts for the learner's 21 gaps

Experiments run 2026-11-24 against the checker and runners in this checkout, one section per item of "What the
tutorial did not tell me" in `learner-notes.md`. The task's numbering is used: (1) is the learner's item 0, (21) the
learner's item 20. Then the five rules of 2026-11-24.

Every program quoted is a `src` in a probe file under `facts/`. A probe file `qNN-*.ts` has its outputs, where run, next to it:

```
facts/qNN-*.probe.out      bun selfhost/freeze-attack4/probe.ts selfhost/learner1/facts/qNN-*.ts    (verdict + every diagnostic, tsx on)
facts/qNN-*.rt.out         bun lite/infer/attack/drive-rt.ts selfhost/learner1/facts/qNN-*.ts --both
                           (compiled cells in a real Observable Runtime; --both also runs runCells via observe.ts and prints DIFFER)
facts/qNN-*.probe-ts.out   bun selfhost/learner1/facts/probe-ts.ts ...   (same check with tsx OFF, a .ts source)
facts/qNN-*.drive-run.out  bun lite/infer/attack/drive-run.ts ...           (q02, q02c only; see the harness notes)
facts/*.table.out, *.list.out, q20b-jsx-decls.out   the printed output of a deriving script (bun <file>)
```

Commands are run from `tools/lang-experiment/`. "Tutorial line N" is a line of `lite/soundscript/tutorial.ojs`.

## Harness notes, read before the outputs

- **`drive-run.ts` calls actions.** Its value follower (`selfhost/freeze-attack3/harness.ts` `follow`) calls every
  function it finds in a cell's value with no arguments, actions included (`observe.ts` `reach` skips actions with
  `isAction`; the freeze-attack3 one does not). `facts/q02-clock.drive-run.out`: `clicks=4083 ; times=[null,null,…]`
  for three driven clicks. The same drive in `q02-clock.rt.out` gives `clicks=3` in both arms, the compiled runtime and
  `runCells` through `observe.ts`, so the runner of the cells is not the cause. Control `facts/q02c-harness-control.ts`
  (a counter, its action, no events cell): with a view holding `onClick={recordClick}`, `drive-run.ts` gives
  `clicks=1831`; with no view, `clicks=4` (one extra call of the action that is the cell's own value); `drive-rt.ts
  --both` gives `clicks=3` for both (`q02c-harness-control.drive-run.out`, `.rt.out`). So the follower calling actions
  it finds in a re-rendered view is the cause. Every program with an action was judged by `drive-rt.ts --both`. This is
  a harness defect, not a language finding.
- `probe.ts` has no outside cells, so a program that reads an ordinary cell shows `[inject-unknown]` there; `drive-rt.ts`
  checks with the candidate's `outside` cells (q15).
- In `drive-rt.ts`, `facts/h.ts` `callN` delivers animation frames by timer between action calls so listeners run
  between them. It only takes over frames requested during the drive: a generator whose next frame was requested before
  the drive (a clock that never restarts) does not advance until the drive ends (see §2, learner's form). The
  `observe.ts` arm of `--both` gets no frames until the drive ends, so its drive lines read listener-fed state before
  any listener ran: §1 `runCells| … wordSize=0`, §2 `runCells| … times=[]`. Its `show` lines, read after the frames,
  agree. That arm also has no outside cells (§15: `ERROR today is not defined`).
- `show <fn> = fn(throws …)` lines are the harness calling a function cell with no arguments; ignore them.

## 1. The listings for section 4's async half and section 10

**Answer.** Both files exist beside the tutorial, not in `examples/`: `lite/soundscript/tutorial-async.tsx` and
`lite/soundscript/tutorial-ordinary.tsx`. The tutorial renders them as live listings (`//ss: ./tutorial-async.tsx` at
line 90, `//ss: ./tutorial-ordinary.tsx` at line 260), so a reader of the source file alone does not see them.
`tutorial-async.tsx` checks and runs: one click gives `measureAsked=1 ; measured=11 ; wordSize=11`.

`tutorial-ordinary.tsx` checks and runs with its two Observable JavaScript cells supplied as outside cells
(`shop_basket`, and `viewof shop_price` at 3): `cheaper()` moves `shopTotal` from `9` to `7.5`.

`facts/q01-listings.ts`, `q01-listings.rt.out`; `facts/q01b-ordinary-listing.ts`, `q01b-ordinary-listing.rt.out`.

Tutorial: the listings are drawn in at lines 90 and 260; the source of neither is in the tutorial text.

## 2. Recording the time on a click (an `Action<[]>`)

**Answer.** An action may not use `now`. Three accepted forms, which differ in what they record:

| form | records | `drive-rt.ts` |
|---|---|---|
| A canvas pointer handler: `PointerData` has `t` | whatever `t` the call carries; the renderer sets it to the event's `timeStamp` (read, not run: `lite/runtime.ss.ts` line 71 `ptr`) | the drive passed `t: 123.5` by hand: `times=[123.5,123.5]` |
| Learner's: a clock generator stores each frame's time in state, the click action `read`s it | every click, with the last stored clock value | three clicks in one turn: `times=[1910.793666,1910.793666,1910.793666]` |
| A click bumps a counter; a generator taking `now` and the counter yields `now()`; a listener stores it | the time of a frame after the click; clicks in the same turn collapse | three clicks with frames between: 3 entries; three clicks in one turn: `clicks = 3`, `times = [1803.076291]` |

The third is the pattern of `tutorial-async.tsx` adapted to the clock. Three clicks in one turn stored one stamp: the
generator restarts on each click and the listener pulls once per frame. Not measured: clicks in separate turns with no
frame between. The learner's form stored all three clicks, each with the same value. With 30 ms and timer frames
between two clicks it also stored one value twice (`times=[1159.9165,1159.9165]`, then `show lastNow = 1237.260541`
after the drive): the clock's pending frame was requested before the drive took over frame delivery, so `lastNow` did
not move during the drive. That is the probable cause, read from the harness, not shown; how far the stored time lags
a click in a page was not measured.

Accepted (learner's form, `accept-learner-clock-into-state`):

```tsx
const times = (): StateCell<readonly number[]> => state<readonly number[]>([]);
const lastNow = (): StateCell<number> => state(0);
const clock = function* (now: Clock) { while (true) yield now(); };
const setNow = (lastNow: State<number>) => action((t: number) => lastNow.set(t));
const onClock = (clock: Events<number>, setNow: Action<[number]>) => on(clock, setNow);
const recordClick = (times: State<readonly number[]>, lastNow: State<number>) => action(() => { const t = read(lastNow); times.update((xs) => [...xs, t]); });
```

Rejected (`reject-now-in-action`):

```tsx
const recordClick = (times: State<readonly number[]>, now: Clock) => action(() => times.update((xs) => [...xs, now()]));
```

```
recordClick[action-capture] now is a capability, so an action using it would make the stored state depend on something
the calls do not record; take the value as an argument of the action (a handler is called with values only by a
canvas's onPointerDown, onPointerMove, onPointerUp and onPointerCancel, which give { x, y, t, id, buttons }, and an
input's onInput, which gives its text; onClick gives none)
```

A `button` has no pointer props: `<button onPointerDown={record}>` is `[excess-property]` (`reject-button-pointerdown`).

`facts/q02-clock.ts`, `q02-clock.probe.out`, `q02-clock.rt.out`.

Tutorial: line 483 says a clock value "reaches an action as an argument, from an events cell or a view"; line 514
lists `t` in `PointerData`. It does not give a form for a button, and does not say that an events cell restarted by
each click can deliver fewer values than there were clicks.

Side finding: a cell named `log` is `[reserved-name]` (it is the capability); the first draft of this probe used it.

## 3. A handler per row

**Answer.** Make the per-row actions in a `for…of` loop (over a data cell, or over fixed positions for rows from state),
or use the tutorial's `input` with `onInput`. An action may not use a parameter of any enclosing function, so `action(...)` inside a `map` callback is
`[action-capture]` even when the array is plain data, and so is a `const` computed from that parameter. A `for…of`
loop variable is not a parameter: actions made in a `for (const x of …)` loop over a non-state cell are accepted and
run. Over a state cell's value the same loop is rejected (the row depends on state), hence the fixed position slots.

Accepted (`accept-for-of-position-slots-over-state`; two clicks on slot 0 of `a b c` leave `[{"id":3,"label":"c"}]`):

```tsx
type Item = { readonly id: number; readonly label: string };
const items = (): StateCell<readonly Item[]> => state<readonly Item[]>([{ id: 1, label: "a" }, { id: 2, label: "b" }, { id: 3, label: "c" }]);
const removeAt = (items: State<readonly Item[]>): readonly Action<[]>[] => {
  const out: Action<[]>[] = [];
  for (const i of [0, 1, 2, 3, 4, 5, 6, 7]) out.push(action(() => items.update((xs) => xs.toSpliced(i, 1))));
  return out;
};
const view = (items: readonly Item[], removeAt: readonly Action<[]>[]) => <div>{items.map((it, i) => { const r = removeAt[i]; return r === undefined ? <span key={it.id}>{it.label}</span> : <button key={it.id} onClick={r}>{it.label}</button>; })}</div>;
```

Also accepted and run: `accept-input-onInput-row-id` (the tutorial's checkbox form; `remove("2")` leaves ids 1 and 3),
`accept-for-of-loop-over-data-cell` (per-row actions over a data cell, stored in an array of records),
`accept-inline-action-in-view` (an `action(...)` written inline in a view that uses no row value).

Rejected (`reject-actions-mapped-over-data-cell`, data cell, not state):

```tsx
const removers = (initialItems: readonly Item[], items: State<readonly Item[]>) => initialItems.map((it) => ({ id: it.id, remove: action(() => items.update((xs) => xs.filter((x) => x.id !== it.id))) }));
```

```
removers[action-capture] it is a parameter of an enclosing function, so a caller may pass it a value that depends on
state; an action may use from its cell only inputs that hold no state and the consts and functions made from them,
so pass the value to the action when it is called
```

The same message for: the `map` index (`reject-map-index-slots`), a cell whose value is `(id: number) => action(...)`
(`reject-action-factory-function`), `const id = it.id` inside the callback (`reject-const-from-map-param`), and the
tutorial's own per-row example (`reject-action-per-row-over-state`).

`facts/q03-row-handlers.ts`, `.probe.out`, `.rt.out`.

Tutorial: line 514 gives the `input` form and says a `button` cannot carry a row's value. It does not say that a
`map` callback parameter is refused for plain data too, or that a `for…of` loop is the accepted way to make actions per row.

## 4. Generics

**Answer.** Generic function cells, generic type aliases and explicit type arguments are accepted; `extends` bounds are
not. In detail: a cell's value may be a generic function; generic type aliases and explicit type arguments work; type
arguments are inferred from a call. In a `.tsx` source a generic arrow must be written `<T,>(…)` (`<T>(` does not
parse). `extends` bounds are *unsupported*, and `===` on two values of a type parameter is `[strict-eq-object]`;
`=== undefined` on one is accepted.

Inference keeps literal types: `firstOr([3, 4], 0)` infers `T = 3 | 4` and rejects the `0` (TypeScript infers
`number`). Give the type argument or a typed argument.

Accepted (`accept-generic-fn-cell-explicit-arg`, value `4`):

```ts
const firstOr = () => <T,>(xs: readonly T[], d: T): T => xs[0] ?? d;
const a = (firstOr: <T>(xs: readonly T[], d: T) => T) => firstOr<number>([3, 4], 0) + 1;
```

Rejected (`literal-inference-generic-fn-cell`, the same with `firstOr([3, 4], 0)`):

```
a[type] 0 is not assignable to 3 | 4
```

| program | verdict | value |
|---|---|---|
| `accept-generic-alias-push`: `type Stack<T> = { readonly items: readonly T[] }` and a generic `push` cell | ACCEPT | `[1,2]` |
| `explicit-type-argument`: `empty<number>().items.length` | ACCEPT | `0` |
| `accept-groupBy-inferred`: `groupBy(sales(), (s) => s.region)`, `T` inferred | ACCEPT | `"n:2,s:1"` |
| `generic-function-declaration-cell`, `generic-local-helper` | ACCEPT | `"x"`, `4` |
| `extends-bound`: `<K extends string \| number,>` | `{unsupported type parameter constraint/default}` and `[strict-eq-object]` | |
| `strict-eq-on-type-param`: `a === b` with `a, b: T` | `[strict-eq-object]` | |
| `generic-fn-cell-no-comma` in `.tsx` | parse error "Add a trailing comma, as in `<T,>() => ...`" | |
| `generic-fn-cell-no-comma` in `.ts` (`probe-ts.ts`) | parses; same literal-inference `[type]` | |
| `reject-as-in-generic-alias-use`: `[] as readonly number[]` | `[no-cast]` | |

`facts/q04-generics.ts`, `.probe.out`, `.probe-ts.out`, `.rt.out`.

Tutorial: not in the tutorial. Line 558 says the checker "lacks `keyof`, bounds and indexed access"; for bounds this
matches what was measured (unsupported).

## 5. Private writable state behind operations (LRU)

**Answer.** A closure over a `Mut` local, or over a `let`, that the cell returns is rejected. Two forms are accepted: an
immutable value with operations that return a new value, and a state cell written by actions.

Smallest accepted LRU, immutable (`accept-immutable-lru`, value `"a,c"`: capacity 2, put a, put b, get a, put c):

```ts
type Lru = { readonly cap: number; readonly entries: readonly (readonly [string, number])[] };
const lruPut = () => (c: Lru, k: string, v: number): Lru => {
  const rest = c.entries.filter((e) => e[0] !== k);
  const all: readonly (readonly [string, number])[] = [...rest, [k, v]];
  return { cap: c.cap, entries: all.length > c.cap ? all.slice(all.length - c.cap) : all };
};
const lruGet = () => (c: Lru, k: string): { readonly value: number | undefined; readonly cache: Lru } => {
  const hit = c.entries.find((e) => e[0] === k);
  if (hit === undefined) return { value: undefined, cache: c };
  return { value: hit[1], cache: { cap: c.cap, entries: [...c.entries.filter((e) => e[0] !== k), hit] } };
};
```

The state-cell form (`accept-state-cell-lru`) puts an `Lru` in `state(...)` and has actions `put` and `touch` call
`lruPut` / `lruGet` inside `cache.update(...)`; driving `put a, put b, touch a, put c` gives `keys=a,c`.

Rejected (`reject-closure-over-mut-map`):

```ts
const cache = () => {
  const m = new Map<string, number>();
  return { get: (k: string) => m.get(k), put: (k: string, v: number) => { m.set(k, v); } };
};
```

```
cache[mut-capture] Mut m captured by a function the cell keeps, which can run after the cell has given its value; bind
it under its plain type before the function (const c: Map<string, number> = m) and capture that, or make it inside the function
```

`reject-closure-over-let` (a counter over `let n`): `[let-capture] let n assigned from a function that escapes`.

`facts/q05-lru.ts`, `.probe.out`, `.rt.out`.

Tutorial: not in the tutorial. Line 461 states the capture rule; no example of the alternatives.

## 6. Members of a fetch response

**Answer.** `FetchResponse` has five members: `ok: boolean`, `status: number`, `text(): Promise<string>`,
`json(): Promise<unknown>`, `arrayBuffer(): Promise<ArrayBuffer>` (`PRELUDE_DECLS` in `lite/intrinsics.ts`).
`headers`, `statusText`, `blob`, `clone`, `body` and `url` are each *unsupported*. A response may not be a cell's
value, sit in one, be passed to another cell, or be captured by a nested function. `fetch`'s `init` takes `method`,
`headers` (a string record) and `body` (a string).

Each type was shown with a pair: `const b: boolean = res.ok` ACCEPT, `const b: string = res.ok` `[type] boolean is not
assignable to string`; the same for `status`; `const v: { readonly a: number } = await res.json()` is
`[type] unknown is not assignable to { a: number }`.

Rejected (`reject-response-as-cell-value`):

```ts
const r = async (fetch: Fetch) => { const res = await fetch("x.json"); return res; };
```

```
r[iterator-cell] value FetchResponse holds a FetchResponse: a response's body can be read once, so the cells that take
it would find it used up, depending on the order they run in; read the body in this cell and give the data
(const data = async (fetch: Fetch) => (await fetch(url)).json())
```

**Reading the body twice is accepted and throws at run time** (`read-body-twice`):

```ts
const r = async (fetch: Fetch) => { const res = await fetch("x.json"); const a = await res.text(); const b = await res.text(); return a + b; };
```

```
show r = ERROR Body already used
```

Not exercised: a non-OK status. The runners' fake `fetch` always answers 200 (`ok` gave `true`, `status` gave `200`).

`facts/q06-fetch.ts`, `.probe.out`, `.rt.out`.

Tutorial: line 400 gives `Fetch`'s type, line 408 says a response stays in the function that fetched it and shows
`json()`. The members are not listed.

## 7. `messageOf`

**Answer.** `messageOf(e): string` gives an `Error`'s `message` and `String(e)` for anything else. It is the way to read
a caught value, which is `unknown`: `e.message` is `[no-member] property message on Js/unknown; narrow it first`.

| argument | value |
|---|---|
| `JSON.parse("{")` caught | `"JSON Parse error: Expected '}'"` |
| `throw new RangeError("boom")` caught | `"boom"` |
| `throw "plain"` caught | `"plain"` |
| `42` | `"42"` |
| `{ message: "rec" }` | `"[object Object]"` (only an Error's message is read) |
| `undefined` | `"undefined"` |

Accepted (`accept-messageOf-thrown-error`):

```ts
const m = () => { try { throw new RangeError("boom"); } catch (e) { return messageOf(e); } };
```

`[1].map(messageOf)` is `[prelude-value]`. `facts/q07-messageOf.ts`, `.probe.out`, `.rt.out`.

Tutorial: listed in the prelude at line 424, never described.

## 8. Which intrinsic members exist

**Answer.** The declared members, derived by `bun selfhost/learner1/facts/q08-members.ts` (parses `INTRINSIC_DECLS` with
lite's parser; flags from the JSDoc beside each member). Full output in `facts/q08-members.table.out`. Every member of
every type in the table except the eight typed arrays other than `Float64Array` was read as a value in its own probe
(`const a = () => (x: T) => x.m;`): 209 accept, the 6 marked `@banned` are `[banned-member]`
(`facts/q08-members.probe.out`). The other eight typed arrays (same declaration template) were each run once with
`fill length subarray toSorted from of`, and the global functions in one call each (`facts/q08b-extras.ts`, all
accepted; values in `q08b-extras.rt.out`).

```
Array        length map filter flatMap slice concat toSorted toReversed toSpliced with reduce find findIndex findLast some
             every forEach includes indexOf lastIndexOf join at toString entries keys values
             (writes, on a Mut only) push unshift pop shift splice sort reverse fill copyWithin
Array.       isArray from of
String       length startsWith endsWith includes indexOf lastIndexOf slice substring split trim trimStart trimEnd
             toUpperCase toLowerCase replace replaceAll match localeCompare padStart padEnd repeat charAt charCodeAt at toString
RegExp       source flags test exec        RegExpMatchArray  length index groups
Number       toFixed toExponential toPrecision toString
Number.      MAX_VALUE MIN_VALUE EPSILON MAX_SAFE_INTEGER MIN_SAFE_INTEGER POSITIVE_INFINITY NEGATIVE_INFINITY NaN
             isInteger isFinite isNaN isSafeInteger parseFloat parseInt
Boolean      toString
Math.        PI E LN2 LN10 SQRT2 abs floor ceil round trunc sign sqrt cbrt exp log log2 log10 sin cos tan asin acos
             atan atan2 pow min max hypot fround
JSON.        stringify parse
Object.      entries keys values fromEntries is
Map          size get has forEach keys values entries (writes) set delete clear
Set          size has forEach keys values entries (writes) add delete clear
Error        message name
Promise      then          Promise.  resolve all
ArrayBuffer  byteLength slice
URL          href hash search pathname host hostname origin protocol port searchParams toString
URLSearchParams  get has toString
typed arrays length buffer subarray values keys entries slice map filter toSorted toReversed with reduce forEach every
             some indexOf includes join at toString (writes) set fill sort reverse copyWithin
functions    String Number Boolean BigInt isNaN isFinite parseInt parseFloat encodeURIComponent decodeURIComponent
             encodeURI decodeURI atob btoa structuredClone
```

Absent members a TypeScript programmer reaches for, each probed. On an instance type the verdict is *unsupported*; on
a static object it is `[no-member]`:

```
unsupported  Array.flat findLastIndex reduceRight toLocaleString; String.codePointAt normalize search matchAll concat
             substr trimLeft; RegExp.lastIndex global; Number.toLocaleString valueOf; Map.getOrInsert;
             Set.union intersection difference isSubsetOf; Error.stack cause; Promise.catch finally;
             URLSearchParams.set append getAll entries
[no-member]  String.fromCharCode; Math.clz32 imul log1p expm1 sinh cosh tanh; Object.assign freeze create getOwnPropertyNames hasOwn groupBy
             isFrozen; Map.groupBy; Promise.race allSettled any reject withResolvers
```

Also *unsupported*: `new Array(3)`, `"a".toLocaleUpperCase()`, `(1234.5).toLocaleString()` (`q08b-extras.ts`).

`Object.freeze` and `Object.assign` have rules outside the table (`facts/q08b-extras.ts`): `Object.freeze({ n: 1 })` is
accepted, on an existing object `[object-freeze]`; `Object.assign({}, …)` is *unsupported*. `replace` takes only a
string replacement: `"abc".replace(/b/, (m: string) => m.toUpperCase())` is `[type]`.

Run values (`q08b-extras.rt.out`): `(3.14159).toFixed(2).padStart(8, ".")` is `"....3.14"`; `localeCompare` sorts;
`toSorted` is stable (ties kept in order: `"bdac"`); a Fibonacci number above 2^31 is exact (`12586269025`).

Tutorial: not in the tutorial. Line 424 says undeclared members are *unsupported*, which holds for instance types only.

## 9. A nested async helper that fetches and reads its own response

**Answer.** Accepted. What is refused is a nested function that *captures* a response made outside it. A helper may
also return a response to the function that called it.

Accepted (`accept-nested-helper-fetches-and-reads`, value `"hi,hi"`):

```ts
const both = async (fetch: Fetch) => {
  const get = async (u: string): Promise<string> => { const res = await fetch(u); return await res.text(); };
  const xs = await Promise.all([get("a"), get("b")]);
  return xs.join(",");
};
```

Rejected (`reject-nested-fn-captures-response`, in `q06-fetch.ts`):

```
r[iterator-capture] res holds a FetchResponse, captured by a nested function: a response's body can be read once, so
the function may find it used up; read what the function needs before it (const ok = res.ok, or const data = await
res.json()) and capture that
```

On `[mut-await]`: a response bound from one `await` and read after a second `await` in a nested helper is accepted
and runs (`accept-nested-helper-response-across-two-awaits`, `"hi"`), while a `Mut` array declared before an `await` in a
nested helper is rejected even when only read after it (`nested-helper-mut-array-read-after-await`, `[mut-await]`).
This is by design: S3.19 (`spec.ojs` line 636) says "S5.6 and S5.7 do not take a binding that holds one [a response],
since no other code can reach it".

`facts/q09-nested-fetch.ts`, `.probe.out`, `.rt.out`.

Tutorial: line 408 says "a nested function may not hold one", which reads as covering this case. Line 466 says the
`[mut-await]` rule applies in "any function made inside a cell", which the response case does not follow.

## 10. A helper that captures a writable local and is called immediately

**Answer.** Accepted: a local helper that writes a captured `Mut` and is only called, a recursive local helper, an
inline callback given to `forEach` or `map`, and a helper that assigns a captured `let`. A named helper passed as an
argument (`[1, 2].forEach(add)`) or returned is rejected.

Accepted (`accept-recursive-walk-writes-captured`, value `[1,2,3,4]`):

```ts
type Tree = { readonly v: number; readonly children: readonly Tree[] };
const a = () => { const t: Tree = { v: 1, children: [{ v: 2, children: [] }, { v: 3, children: [{ v: 4, children: [] }] }] };
  const out: number[] = [];
  const walk = (n: Tree): void => { out.push(n.v); for (const c of n.children) walk(c); };
  walk(t);
  return out; };
```

Rejected (`reject-helper-passed-on`):

```ts
const a = () => { const xs: number[] = []; const add = (n: number) => { xs.push(n); }; [1, 2].forEach(add); return xs; };
```

```
a[mut-capture] Mut xs written by a function the cell keeps (not a local helper that is only called): it is frozen
where the function is made, so the write would throw; make xs inside the function, or keep it in a state cell that an action writes
```

Note the difference: `["a", "b", "a"].forEach((w) => { m.set(w, (m.get(w) ?? 0) + 1); })` with the callback written
inline is accepted (`[["a",2],["b",1]]`).

`facts/q10-capture-called.ts`, `.probe.out`, `.rt.out`.

Tutorial: line 448 states it for a `let` ("only if that function is a local helper called directly and never passed
on"); for a `Mut`, line 461 says only "a function that outlives the call that made it", and line 530 mentions "three
helpers capturing a Mut (allowed deliberately)".

## 11. A value from `read(...)` used in an `update` callback

**Answer.** Accepted. A local from `read` is not "a local computed from" state; a cell's *value parameter* of a state
cell is. `read` also sees an earlier write of the same call.

Accepted (`accept-read-value-used-in-update`; three calls give ids 1, 2, 3 and `nextId=4`):

```tsx
type Todo = { readonly id: number; readonly text: string };
const todos = (): StateCell<readonly Todo[]> => state<readonly Todo[]>([]);
const nextId = (): StateCell<number> => state(1);
const draft = (): StateCell<string> => state("milk");
const add = (todos: State<readonly Todo[]>, nextId: State<number>, draft: State<string>) => action(() => {
  const id = read(nextId);
  const text = read(draft);
  if (text === "") return;
  todos.update((xs) => [...xs, { id, text }]);
  nextId.set(id + 1);
});
```

Rejected (`reject-value-param-used-in-update`, `nextId: number` as a parameter):

```
add[action-capture] nextId depends on state (the value of the state cell nextId), so an action using it would act on
the value from the cell's last run; read the state cell inside the action with read(...), or pass the value to the action when it is called
```

`accept-read-sees-earlier-write-same-call`: `nextId.update(n => n + 1)` then `read(nextId)` gives `2`.
`facts/q11-read-in-update.ts`, `.probe.out`, `.rt.out`.

Tutorial: line 482 says `read` gives "the stored value plus the writes made earlier in the same commit"; it does not say
the result may be used in an `update` callback.

## 12. What a state cell may hold

**Answer.** Anything except content that may be `undefined` or that contains a `State`. Accepted and, where driven, run: `Set`, `Map`, records with literal keys, index-signature records, arrays
(`readonly` or not), records with optional members, `number | null`, a function, an `Action`, an `Elem`, a typed array,
a `URL`. Rejected: content that may be `undefined` (`[state-undefined]`, "Use null") and content holding a `State`
(`[state-in-state]`). The `update` callback may return a fresh `Set` or `Map`; writing the old one in place is
`[mutating-method]`.

Accepted (`accept-set`; `toggle(2)` gives `shown="1,2"`):

```tsx
const s = (): StateCell<Set<number>> => state<Set<number>>(new Set([1]));
const toggle = (s: State<Set<number>>) => action((n: number) => s.update((old) => { const next = new Set(old); if (next.has(n)) next.delete(n); else next.add(n); return next; }));
const shown = (s: Set<number>) => [...s].join(",");
```

Rejected (`reject-write-state-set-in-place`):

```
add[mutating-method] write to a Set<number>, which is not Mut; a copy made in the same expression (new Set(old)) or
bound to a local (const y = new Set(old)) is writable
```

An index-signature record in state works, but `({ ...o, x: 1 })` on it is *unsupported* (object spread of an index
signature); `Object.fromEntries([...Object.entries(o), [k, 1]])` is accepted and runs (`accept-index-signature-record`).
`state-of-action` (a state cell holding an `Action`) is accepted and the stored action, called, wrote its state (`n=1`).

`facts/q12-state-contents.ts`, `.probe.out`, `.rt.out`.

Tutorial: line 477 names only the two rejections.

## 13. Which locals are writable ("record annotation")

**Answer.** Index-signature and `Record` annotations count as record annotations (writable); `readonly`, unions and
aliases do not. In full: a fresh value bound to a `const` or `let` is writable unannotated or with an array, tuple, record,
index-signature (`{ [k: string]: T }`) or `Record<string, T>` annotation, or `Map`, `Set` or a typed array. `readonly`,
a union or a type alias make it unwritable. Only the top level is writable: an array inside a fresh object literal is
not (`o.xs.push(2)` is `[mutating-method]`). Index-signature locals take only literal keys (see the 2026-11-24 rules).

| program | verdict |
|---|---|
| `const o: { [k: string]: number } = {}; o["x"] = 1;` | ACCEPT, `["x"]` |
| `const o: Record<string, number> = {}; o["x"] = 1;` | ACCEPT, `["x"]` |
| `const t: [number, number] = [0, 0]; t[0] = 5;` | ACCEPT, `[5,0]` |
| `const xs: Nums = []; xs.push(1);` with `type Nums = number[]` | `[mutating-method] write to a Nums, which is not Mut` |
| `const o = { n: 0, xs: [1] }; o.xs.push(2);` | `[mutating-method] write to a number[], which is not Mut` |
| `const xs = structuredClone(src); xs.push(2);` | ACCEPT, `[1,2]` |

`facts/q13-writable-locals.ts`, `.probe.out`, `.rt.out`.

Tutorial: line 454 says this ("An array, tuple or record annotation … does not change that … any other annotation, such
as `readonly number[]`, a union or a type alias, makes the local unwritable"). It does not say that index-signature and
`Record` annotations count as records, or that only the top level of a fresh literal is writable.

## 14. Index reads on strings, typed arrays, tuples

**Answer.** `T | undefined` for arrays, strings, typed arrays, a `RegExpMatchArray` and index-signature records (by `["x"]`
and by `.x`). A tuple index inside its length is the element type; outside it is `[type] tuple … has no element 2`. Map
`entries()` give tuples, so `e[1]` is `V`. `s.charAt(i)` is `string`. A compound write `b[1] += 1` on a typed array is
accepted.

| program | verdict |
|---|---|
| `const s = "abc"; const c: string = s[0];` | `[possibly-undefined] string \| undefined is not assignable to string` |
| `const b = new Float64Array(2); const v: number = b[0];` | `[possibly-undefined]` |
| `const t: readonly [number, string] = [1, "x"]; const v: string = t[1];` | ACCEPT, `"x"` |
| `for (const e of m.entries()) { const v: number = e[1]; … }` | ACCEPT |
| `const g: string = m[1]` on a `match` result | `[possibly-undefined]` |
| `const v: number = o.x` on `{ readonly [k: string]: number }` | `[possibly-undefined]` |

`facts/q14-index-reads.ts`, `.probe.out`, `.rt.out`.

Tutorial: line 448 states it for `a[i]` on arrays only.

## 15. Dates

**Answer.** Nothing replaces `Date` inside SoundScript; take the date from an ordinary cell as a typed parameter.
There is no wall-clock or calendar access in a SoundScript cell. `Date` is `[free-name]`, `new Date()` is
`[new-non-intrinsic]`. `now()` is `performance.now()`, milliseconds since the page loaded (`lite/soundscript/core.ojs`
line 102: `ss_now = () => performance.now()`); in the runner it gave `463.887666`. A date reaches a SoundScript cell from an
ordinary (Observable JavaScript) cell, taken as a typed parameter (section 10 of the tutorial), or from `fetch`.
`Intl` is not available (`new Intl.DateTimeFormat("en")` is `[new-non-intrinsic]`), so formatting is by hand:
`accept-format-by-hand` formats `(2026, 3, 7)` with `String(m).padStart(2, "0")` as `"2026-03-07"`.

Accepted (`accept-date-from-ordinary-cell`, with an outside cell `today` giving `"2026-11-24T00:00:00.000Z"`; value `2026`):

```ts
const year = (today: string) => Number(today.slice(0, 4));
```

Rejected: `const t = () => Date.now();` gives `t[free-name] free name Date`; the same parameter with no type is
`[boundary-unannotated]`.

`facts/q15-dates.ts`, `.rt.out` (the probe output shows `[inject-unknown]` because `probe.ts` has no outside cells).

Tutorial: line 426 says `Date` is not available; line 398 calls `now` "the time in ms" without saying from when. No
replacement is given.

## 16. Reserved names

**Answer.** A cell may not take a capability, global, prelude or compiler-reserved name, or any name containing `$`;
types and cells have separate namespaces. The cell-name list, derived by `facts/q16-names.ts` from `RESERVED_INPUTS`
(`lite/core.ts`) and `PRELUDE_FNS`, each tried as a cell and refused:

```
capabilities  now random fetch log invalidation compile pool
globals       Object Array Math JSON Number String Boolean BigInt Symbol Map Set Error TypeError RangeError RegExp
              Promise ArrayBuffer DataView TextEncoder TextDecoder Infinity NaN undefined isNaN isFinite parseInt
              parseFloat encodeURIComponent decodeURIComponent encodeURI decodeURI atob btoa structuredClone URL
              URLSearchParams Float32Array Float64Array Int8Array Uint8Array Uint8ClampedArray Int16Array
              Uint16Array Int32Array Uint32Array
prelude       state action snapshot equals on read messageOf memo cast h
module        Generators
keywords      viewof mutable $<digits>, any name starting ss_ or $ss$
```

The checker's sites that emit `[reserved-name]` (`lite/infer/md-cell.ss.ts` `mdSyntax` lines 23-28, `lite/messages.ss.ts`
lines 7-20) add three more, each run in `facts/q16d-names-run.ts`: a cell name containing `$` anywhere (`x$ref`: "a cell
name may not hold $, which the runners use in the names they make"); `h` as a local or parameter in a cell that has JSX
(`h-local-in-jsx-cell`; in a cell with no JSX it is accepted); and the text `/*ss` anywhere in a cell, strings included
(`reserved-text-in-string`).

As a *local*, every name in the block is accepted except `viewof`, `mutable`, `$<digits>`, `ss_`/`$ss$` names and
`snapshot` (`[prelude-shadow]`). `mut`, `state`, `read`, `memo`, `equals` as locals are accepted (`q16b-prelude-shadow.ts`),
and the checker resolves the binding: a local `action` that returns a state-writing function is still `[state-write]`
(`q16c-shadow-attack.ts`). This is the checker against the specification: S2.6 (`spec.ojs` line 346) says declaring a
local or parameter named like any prelude function is `[prelude-shadow]`, and `lite/infer/ow-place.ss.ts` line 62
applies it only to the set it is given, which holds `snapshot` (its comment: "the ownership functions, mut, freeze,
borrow, snapshot").

Accepted as cell names: `listen reduce push pop History Result Event Card Date console window document self Inputs
html md require visibility width`. Under `drive-rt.ts --both`, a reader of a cell named `Date`, `window`, `document`,
`console`, `width`, `md`, `self`, `require`, `Inputs`, `listen` or `reduce` got the cell (`5 + 1 = 6` each,
`q16d-names-run.rt.out`). Not tested: the same in a notebook page, where Observable's standard library defines `width`,
`md`, `Inputs` and `require` (the runner provides none of them).

Types: 53 names are `[builtin-type-name]` as a top-level `type` (list in `facts/q16-names.list.out`): `Action Array
ArrayBuffer ArrayLike Boolean Borrowed ButtonProps CanvasProps Cast Child Clock CommonProps Compile Elem Error Events
Fetch FetchResponse Generator InputProps IntrinsicElements Invalidation Iterable Js Listener Log Map Mut Number
PointerData Pool Promise Random ReadonlyArray Record RegExp RegExpMatchArray Set State StateCell String URL
URLSearchParams ValueOf` and the nine typed arrays. `History`, `Result`, `Event`, `Card`, `Stack`, `Row`, `Todo` are free.

Types and cells do not share a namespace: `type Card = …` beside `const Card = () => (p: Card): Elem => …` is accepted,
and a page using `<Card title="t" />` ran to `{tag:"div",…children:[{tag:"div",…children:["t"]}]}` (`run-type-and-cell-same-name`).

Rejected (`cell log`): `log is reserved as a cell name: a compiled cell takes log (a capability or a global) by that name
from outside the module, so a reader of a cell named log gets that and not the cell; give the cell another name`.

`facts/q16-names.ts`, `q16-names.probe.out`, `q16b-prelude-shadow.ts`, `q16c-shadow-attack.ts`, `q16d-names-run.ts`.

Tutorial: line 428 names `viewof`, `mutable`, `$`+digits and three of the type names; line 468 says prelude functions
may not be "declared again as locals"; the checker refuses only `snapshot` (above).

## 17. `?.` and `??`

**Answer.** `?.` is supported for members, index reads (`?.[0]`) and calls (`?.()`); `??` is supported. `??=`, `&&=`,
`||=` are *unsupported*.

Accepted (`accept-find-then-optional`, value `"none"`):

```ts
type P = { readonly name: string; readonly tag?: { readonly label: string } };
const people = () => (): readonly P[] => [{ name: "a" }, { name: "b", tag: { label: "x" } }];
const a = (people: () => readonly P[]) => people().find((p) => p.name === "z")?.name ?? "none";
```

Rejected: `p.tag.label` on the optional `tag` is `[possibly-undefined] property label of a value that may be undefined`;
`x ??= 3` is `{unsupported logical assignment ??=}`, and `&&=` and `||=` the same (`and-assign`, `or-assign`).

`facts/q17-optional-chain.ts`, `.probe.out`, `.rt.out`. Not checked here: whether the notebook editor highlights `?.[`
(CLAUDE.md notes the editor's lezer grammar does not parse it; the checker does).

Tutorial: only `??` appears (line 448); `?.` is not mentioned.

## 18. Exhaustive `switch`; early `return` in an action

**Answer.** A `switch` over every member of a discriminated union, each case returning, counts as returning on every
path. A missing case is `[type] function lacks an ending return statement…`. An action body may `return` early; driven
with an empty draft the state stayed `0`, with a non-empty one two calls gave `2`.

Accepted (`accept-exhaustive-switch-returns`, value `12`):

```ts
type Ev = { readonly kind: "dep"; readonly n: number } | { readonly kind: "wd"; readonly n: number } | { readonly kind: "reset" };
const step = () => (s: number, e: Ev): number => {
  switch (e.kind) {
    case "dep": return s + e.n;
    case "wd": return s - e.n;
    case "reset": return 0;
  }
};
const r = (step: (s: number, e: Ev) => number) => step(step(10, { kind: "dep", n: 5 }), { kind: "wd", n: 3 });
```

Rejected (`reject-non-exhaustive-switch`, the `reset` case removed):

```
step[type] function lacks an ending return statement and its return type number does not include undefined
```

`facts/q18-switch-return.ts`, `.probe.out`, `.rt.out`.

Tutorial: line 448 gives the fallthrough and declaration rules for `switch`, not exhaustiveness; early `return` is not mentioned.

## 19. A generator taking an async cell's value

**Answer.** The generator receives the resolved value, typed `T`; typing the parameter `Promise<T>` is
`[inject-type] profile: number is not assignable to Promise<number>`. A generator that ends is fine with `on`: one that
yields 0..10 and returns delivered all eleven values (`total = 55`).

Accepted (`accept-generator-takes-async-value`, fetch body `{"name":"ada"}`, `stored = "ada"`):

```tsx
type Profile = { readonly name: string };
const profile = async (fetch: Fetch): Promise<Profile> => { const res = await fetch("p.json"); const c = cast<Profile>(await res.json()); if (!c.ok) throw new Error(c.error); return c.value; };
const names = function* (profile: Profile) { yield profile.name; };
const stored = (): StateCell<string> => state("");
const store = (stored: State<string>) => action((s: string) => stored.set(s));
const onName = (names: Events<string>, store: Action<[string]>) => on(names, store);
```

`facts/q19-gen-async-input.ts`, `.probe.out`, `.rt.out`.

Tutorial: the listing `tutorial-async.tsx` (line 90) does this: `wordSizes = function* (measured: number | null)` takes
the async cell `measured`. Line 366 gives the async cell's value type `T`. The prose does not say it.

## 20. JSX tags and props

**Answer.** From `JSX_DECLS`, printed by `bun selfhost/learner1/facts/q20b-jsx-decls.ts` (`facts/q20b-jsx-decls.out`):

```
all tags     children?: readonly Child[]; key?: string | number; class?: string; style?: string; title?: string; id?: string
div span p label strong fieldset legend output   the above only
button       + onClick?: Action<[]>; disabled?: boolean
input        + type?: string; name?: string; value?: string | number; min?: number; max?: number; step?: number;
               checked?: boolean; disabled?: boolean; onInput?: Action<[string]>; onClick?: Action<[]>
canvas       + width?: number; height?: number; onPointerDown/Move/Up/Cancel?: Action<[PointerData]>
PointerData  { x: number; y: number; t: number; id: number; buttons: number }
```

Every prop is optional, so `<button>plain</button>` with no `onClick` is accepted. `type` is any string:
`<input type="number" min={0} max={130} step={1} value={age} onInput={setAge} />` is accepted, and `onInput` gives
the text, `setAge("42")` stored `"42"` (`accept-input-type-number-onInput-string`). An `Action<[number]>` on `onInput`
is `[type] Action<[number]> is not assignable to Action<[string]>`. `style` is a string (`style={{ color: "red" }}` is
`[type]`); `className`, `data-x` and `value` on a button are `[excess-property]`; `<a>` and `<ul>` are
`[no-member] <a> is not a declared element`; `onClick` on a `div` is `[excess-property]`.

`facts/q20-jsx-props.ts`, `.probe.out`, `.rt.out`.

Tutorial: line 514 lists tags and prop names without types; the types are in the appendix at line 700, which renders
`JSX_DECLS` at run time and is not in the source.

## 21. Children

**Answer.** A union of an element and an array of elements is accepted, and so are `null` children; an array that
contains `null` is not. A child may be an `Elem`, a string, a number, a boolean, `null`, `undefined` or a `readonly Elem[]`, and a
union of these is accepted: `{flag ? <span>one</span> : xs().map(…)}`, `{flag && <span>shown</span>}`,
`{flag ? null : <span>x</span>}`. An array must hold only elements: an array of strings, an array with a `null`
(a `map` that returns `null` for some rows) and a nested array are `[type]`. `null`, `undefined` and `true` children are
dropped from the value. Different JSX from different `if` branches is accepted.

Accepted (`accept-child-elem-or-array`):

```tsx
const flag = () => true;
const xs = () => (): readonly string[] => ["a", "b"];
const v = (flag: boolean, xs: () => readonly string[]) => <div>{flag ? <span>one</span> : xs().map((x) => <span key={x}>{x}</span>)}</div>;
```

Rejected (`reject-child-array-with-null`, `xs().map((x) => (x === "a" ? null : <span key={x}>{x}</span>))`):

```
v[type] null is not assignable to Elem || v[type] (null | Elem)[] is not assignable to Child || …
```

Filter first (`accept-child-filter-then-map`), or return an element in both branches.
`facts/q21-children.ts`, `.probe.out`, `.rt.out`.

Tutorial: line 514 says this ("Children are elements, strings, numbers, booleans, `null`/`undefined`, or arrays of
elements"). It does not say an array may not contain `null`.

## The rules of 2026-11-24

`facts/q22-new-rules.ts`, `.probe.out`, `.rt.out`; the spec text is S2.7, S2.10, S3.4, S3.11, S3.19 in `spec.ojs`.

| rule | in the tutorial? | evidence |
|---|---|---|
| A run-time key on an index-signature record (read, write, `delete`, `in`), also `Record<string, T>`, is `[banned-member]`; a literal or a `const` bound to one is accepted; use a `Map` | **no** | `reject-runtime-key-read`: "a key known only at run time, on a record with an index signature, can name an inherited member such as toString or __proto__ … keep the entries in a Map<string, T>"; `accept-const-literal-key-read` ACCEPT; `Object.entries(o)` ACCEPT |
| `delete` only of an optional member or of an index-signature entry with a literal key, on a `Mut` | partly: line 438 allows the index-signature entry but does not require the literal key | `reject-delete-required-member` `[no-delete] … make a optional in the type`; `reject-delete-index-entry-runtime-key` `[banned-member]`; `reject-delete-array-element` `[no-delete]`; `accept-delete-optional-member` gives `["a"]` |
| A `let` (or parameter) assigned in a nested function is never narrowed; copy it to a `const` | **no** | `reject-let-assigned-in-helper-narrowed`: `[possibly-undefined] number \| null used as a number; … r is assigned in a function nested in …`; `accept-copy-to-const-then-narrow` gives `4` |
| Cells may not take capability, global, prelude, `h`, `Generators`, `ss_`/`$ss$` names | partly: line 428 has `viewof`, `mutable`, `$`+digits only | section 16 above |
| A fetch response is `Mut<FetchResponse>`, cannot be a cell's value, be given the type `unknown`, or have a member written | partly: line 400 gives the type, line 408 forbids holding it | `reject-response-as-cell-value` `[iterator-cell]`; `reject-response-as-unknown` `[handle-pass]`; `reject-write-response-member` `[member-write]` |
