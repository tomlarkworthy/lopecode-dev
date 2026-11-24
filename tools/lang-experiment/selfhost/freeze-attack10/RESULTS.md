# freeze-attack10: attacks on the d1 changes (run 2026-11-24)

Run from `tools/lang-experiment`. Every file is in `selfhost/freeze-attack10/`. No other file was edited, and no build,
`verify.ts` or `run-all.sh` was run.

Six breaks: A 1, B 1, E 1, F 3, D 0. Two of the F breaks (F-1, F-2) appear only when the compiled module runs. The
other runner, `runCells`, does not show them, and it has run-time crashes of its own for names d1 leaves open (see
"Two runners"). No break was checked against the pre-d1 tree, so whether each is new in d1 is unknown.

## Two runners

- `bun lite/infer/attack/drive-run.ts <set.ts>` is the named harness. It runs `lite/browser/run.ts` `runCells`, which
  is not only a harness: `lite/browser/entry.ts` exports it as "the cell runner" of the file a notebook loads, and
  `lite/notebook/tutorial.ojs` runs its programs through `lite.runCells`.
- `bun selfhost/freeze-attack10/rt10.ts <set.ts> [--only s]` was written for this run, modelled on `load()` in
  `lite/stdlib/runtime.test.ts`. It checks with `checkSources` (with the row's `outside` cells and `home`), compiles
  each cell with `compileCell` over `contextFromCheck`, and runs the definitions in a real Observable `Runtime`. The
  runtime cells are inputs `ss_<name>`. The capabilities are `ss_now` (gives 7), `ss_random` (0.5), `ss_log` and
  `ss_fetch` (a `Response` of the row's `fetchBody`); `ss_compile` and `ss_pool` are not defined. It settles on
  `setImmediate` turns, with no timer. `after` rows add plain JavaScript variables that read a SoundScript cell, as
  cells of another language in the same module do. That it matches the notebook is inferred from `load()` and the
  compiled text; it was not compared with a browser.
- `runCells` and the compiled module differ in four ways, all observed on rows below:
  1. For a parameter named after a capability, `runCells` passes a cell of that name if one exists. The compiled cell
     takes `ss_<name>` (`comp.ts` output: `function _g(ss_out,ss_now)` for `(now: number) => now + 1`).
  2. `runCells` evaluates each cell's inner function with `new Function`, so `structuredClone` and `URLSearchParams`
     are the JavaScript globals. The compiled cell takes them as module inputs (`OJS_INPUT_GLOBALS`), and a cell of
     that name is the input (`function _k(ss_out,structuredClone)`).
  3. `runCells` builds the erased module with `new Function(...PRELUDE, js)`, where PRELUDE is the prelude names plus
     `h`, `Map`, `Set` and `URL`, so a cell of one of those names crashes the run: "Cannot declare a const variable
     twice". Under rt10 the compiled module runs for the names tried (`state`, `h`, `Map`, `Set`, `URL`).
  4. `runCells` names a state cell's handle `<name>$ref`. A cell named `x$ref` beside a state cell `x` crashes
     `runCells` ("x$ref is defined more than once"); under rt10 it gives the right value (`f-dollar-ref`).
- Each set's output is next to it: `<set>-rt-out.txt` (rt10) and `<set>-dr-out.txt` (drive-run). `minimal-out.txt`
  holds the `--only` runs quoted below. `comp.ts '<src>'` prints a program's compiled definitions. `apre*.ts`,
  `bpre.ts`, `fprobe.ts`, `cprobe.ts` and `jsxpre.ts` are verdict-only probes for
  `bun selfhost/freeze-attack4/probe.ts`.

## Counts

Candidates exclude controls, and exclude five rows dropped because they repeated d1 rows (`a-unawaited-cell`,
`a-memo-arg`, `b-mut-param`, `d-array-element-typed`, `d-union-opt-narrow`). "Silent" means the drive printed DIFF or
a value read differently at the end. "Loud" means accepted and then an error at run time; each loud row is read below.

```
target  file   candidates  accepted (rt10 / dr)  silent (rt10 / dr)  loud (rt10 / dr)  controls fired (rt10 / dr)
A       a.ts   83          44 / 42               21 / 20             3 / 1             2/2 / 2/2
B       b.ts   95          10 / 9                7 / 7               1 / 0             2/2 / 2/2
D       d.ts   25          0 / 0                 0 / 0               0 / 0             1/1 / 1/1
E       e.ts   38          8 / 8                 4 / 4               2 / 2             2/2 / 2/2
F       f.ts   91          88 / 88               17 / 2              10 / 13           1/4 / 0/4
all            332         150                   49
```

- drive-run accepts fewer A and B rows because `runCand` passes `outside: []`, so the outside rows fail there with
  `[inject-unknown]`.
- B's 7 silent rows are 4 in target (an index record widened, B-1) and 3 adjacent (`b-plain-optional-*`: no index
  signature anywhere).
- The F controls are explained under "What F's d1 rule guards".

## Breaks

### A-1: a response typed `{}` leaves the cell. Rule A (`[handle-pass]`, `[iterator-cell]`) should have stopped it.

```ts
const r = async (fetch: Fetch) => { const res = await fetch("https://x.test/"); const c: {} = res; return c; };
```

`bun selfhost/freeze-attack10/rt10.ts selfhost/freeze-attack10/a.ts --only a-empty-direct`, observed:

```
== selfhost/freeze-attack10/a.ts:a-empty-direct: ACCEPT
   drive -> DIFF RESP r holds a Response; USED o2: used: Body already used
   show o1 = "body"
   show o2 = "used: Body already used"
   SILENT
```

`o1` and `o2` are plain JavaScript variables of the module that read `r`'s body. Whichever runs second finds it used.
Hiding the response as `unknown` is `[handle-pass]`, and as `object` it is rejected (d1 rows). As `{}` it is accepted
in 21 shapes:
- directly, or in a record, an array, a tuple, a `Map`, a `Set`, a nested record, an optional member or an index record;
- in `Promise.resolve`, an async generator's yield or a `.then` callback;
- through a ternary, `||`, `{} | undefined`, `{}[]` or a helper's parameter;
- in a kept function `() => c` (`a-empty-kept`, seen only by the plain readers).

No SoundScript reader can read the body through `{}`. Observed in `apre3.ts`: after `"text" in c`, a call is
`[type] object is not callable`. So inside SoundScript, the break is only that a cell's value holds a `Response`,
which the rule says it may not. `a-empty-two-ss` shows this with two SoundScript readers under both runners ("RESP r
holds a Response"). The order-dependent read, case (a), needs a reader in another language (observed, rt10 only).

`a-action-param-state` is accepted too. Its action takes a `FetchResponse` argument, writes it as `{}` and stores it
in state. No accepted caller was found that hands it a response: a fetching cell calling the action is
`[action-call]` (`jsxpre.ts`). So the state route is open in the type but was not reached.

Held in A:
- `unknown` and `object` views, and structural supertypes (`{ readonly ok: boolean }`, `{ text(): Promise<string> }`,
  an interface).
- Generics (identity, `keep`, `T extends FetchResponse`).
- `.then((x) => x)`, and `Promise.all` and its destructuring.
- Containers, and a ternary or `??` on the response itself.
- An unawaited `fetch` in an array or a kept function.
- `memo` (`[memo-pure]`), an object method, `Mut` locals and an exposed `let`, `snapshot`, `structuredClone`.
- Components: a prop typed `FetchResponse`, a `key`, and an intrinsic's attribute are accepted but keep no response.
  The component is called when the element is made, so the value holds only its output (RESP not seen).

Other results in A:
- `res.clone`, `res.body` and `res.blob` are unsupported. `Promise.race` and `allSettled` are `[no-member]`.
- `cast<{ readonly ok: boolean }>(res)` is accepted, but the cast fails at run time on a `Response`, so the value
  never leaves (observed: `v.ok` false).
- An outside cell giving a `Response` to readers typed `FetchResponse` is `[boundary-type]`. Typed `{}` or `unknown`,
  the boundary throws at run time ("o: expected an object, found a Response object"). Loud.
- `a-unbound-text` (`{ t: res.text }`, called as `r.t()`) throws "Expected this to be instanceof Response, but
  received an instance of Object". Loud, and the message is accurate.

### B-1: an index record is read through a type with an optional member named after an `Object.prototype` member. Rule B (`[banned-member]`) is meant to keep inherited members from being read.

```ts
const g = () => { const m: { [k: string]: number } = { x: 1 }; const v: { readonly toString?: number } = m; return typeof v.toString; };
```

`bun selfhost/freeze-attack10/rt10.ts selfhost/freeze-attack10/b.ts --only b-widen-optional-toString`, observed:

```
== selfhost/freeze-attack10/b.ts:b-widen-optional-toString: ACCEPT
   drive -> DIFF g is outside its type: string "function"
   SILENT
```

`v.toString` is typed `number | undefined` and is `Object.prototype.toString`. The same happens in three more shapes:
- across cells: a cell typed `{ readonly [k: string]: number }` read by a parameter typed
  `{ readonly valueOf?: number }` (`b-x-widen-cell`);
- through a helper's parameter (`b-x-widen-param`);
- with `__proto__?: number`, which is typed number and gives an object (`b-x-widen-proto`).

The optional member's type must accept the index's value type: `toString?: () => number` and
`hasOwnProperty?: string` are `[type]` (observed).

Adjacent, not inside B's rule: a plain record type with such an optional member does the same with no index signature
anywhere.
- `const v: { readonly toString?: number } = {}; typeof v.toString` gives "function" (`b-plain-optional-toString`).
- `b-plain-optional-constructor` does the same for `constructor`.
- In `b-plain-optional-valueOf-num`, `(v.valueOf ?? 0) + 1` gives the string `"function valueOf() {...}1"`.

It is listed here because B's guarantee depends on it: once an index record widens to such a type, a literal key
reaches an inherited member.

Held in B:
- Every name of `Object.getOwnPropertyNames(Object.prototype)` as a literal key. There are 12, the same set as
  `PROTO_NAMES`. Tried by dot, bracket, `?.`, `in`, write, `delete`, and parameter destructuring with a default.
- Literal-union keys: a parameter, a conditional const, another cell's literal type, and
  `cast<"x" | "toString">`. Also concatenated and template keys.
- Generic `T` values. `K extends string` and `M extends …` are unsupported.
- Interface and alias unions, nested and array-element records, and a call's result.
- Compound assignment and `++`, `m.toString()` and `m.hasOwnProperty("x")`.
- `keyof`, `as` and mapped types; `{ __proto__: … }` in every literal form; a narrowed `unknown`.
- Number keys (`m[0]`, `m[-0]`, `m[NaN]`, `m[1e21]`, a number cell) are `[type]` on both string- and number-index
  records in these shapes.
- A stale member narrowing (`o.k`) used as a key is `[banned-member]`, since `o.k` stays `string`.
- Outside values: every one typed as an index record is `[boundary-type]` at check time. One with a
  non-`Object.prototype` prototype, typed `{ readonly x?: number }`, is refused at run time ("found an object whose
  prototype is not Object.prototype").

### E-1: a nested function narrows a captured `let` or parameter, then waits, and the declaring function writes it directly. Rule E (`ixNestedAssigned`) covers only writes made in nested functions.

```ts
const g = async () => { let r: number | string = 1; const get = async () => { if (typeof r === "number") { await null; return r + 1; } return 0; }; const p = get(); r = "s"; return await p; };
```

`bun selfhost/freeze-attack10/rt10.ts selfhost/freeze-attack10/e.ts --only e-await-outer-write-typeof`, observed:

```
== selfhost/freeze-attack10/e.ts:e-await-outer-write-typeof: ACCEPT
   drive -> DIFF g is outside its type: string "s1"
   SILENT
```

`g` is checked as `Promise<number>` and gives `"s1"`. It is silent under both runners. The same holds in three other
shapes:
- a parameter in place of the `let` (`e-x-await-param-prim`);
- a loop of awaits (`e-x-await-loop`, gives `"0ss"`);
- an extra helper (`e-x-two-nested`).

With `string | null` and `r.length` (`e-x-await-null-prim`), and with an object parameter (`e-await-param-outer`),
the program is accepted and throws "null is not an object (evaluating 'r.length')". That is case (d): the read the
rule exists to refuse. When `r` is an object `let`, the program is `[mut-await]`; the primitive and parameter forms
are not.

Held in E (rejected or unsupported):
- Every write form tried in a nested function: `??=`, `||=`, `&&=`, array and object destructuring assignment,
  `for…of`, a default parameter, an IIFE, `forEach`, `map` and `toSorted` callbacks, a generator body, and
  object-literal methods.
- A narrowing inside the nested function that also does the write.
- An async nested writer across `await`.
- Members: `o.v` narrowed, then written by a helper or a parameter helper, with `typeof`, tag and `await` variants.
- Elements: `xs[0]` is not narrowed.
- `in` and `Array.isArray` narrowing are unsupported or `[no-member]` here.
- A generator narrowing a captured `let` across `yield` is unsupported (primitive) or `[mut-yield]` (object).

### F-1: a cell named after a capability. Its readers get the capability, not the cell. Rule F (`[reserved-name]`) does not reserve `now`, `random`, `fetch`, `log`, `compile` or `pool`.

```ts
const now = () => 1;
const g = (now: number) => now + 1;
```

`bun selfhost/freeze-attack10/rt10.ts selfhost/freeze-attack10/f.ts --only f-cap-now`, observed:

```
== selfhost/freeze-attack10/f.ts:f-cap-now: ACCEPT
   drive -> DIFF g is outside its type: string "() => 71"
   SILENT
```

The checker types `g`'s parameter as the cell `now` (number), and the compiled `g` takes `ss_now`, the clock. Under
drive-run the same row gives `same: 2`, because `runCells` passes the cell (observed).

Silent rows:
- `now`, `random`, `fetch` and `log`, each with a number and with a record. The record `{ n: 2 }`, read as `.n`,
  gives undefined.
- `f-cap-now-value`: a cell giving `() => 99` is read as 7.
- `f-cap-fetch-fake`: a fake fetch's status 7 is read as 200.
- `f-cap-random-arr`: `[1, 2, 3].length` reads 0.
- An escaped name (`now`) does the same.

`compile` and `pool` are loud under rt10 only because it does not define `ss_compile` or `ss_pool`. In the notebook
those are defined, so the readers would get them (inferred). `f-cap-log-str` is loud: the reader of a string cell
gets `ss_log`. `reservedCellName` already reserves `invalidation` for this reason ("compiled cells take invalidation
from the module"). The other capability names are not reserved.

### F-2: a cell named `structuredClone` or `URLSearchParams` replaces that global in every compiled cell that calls it. Rule F does not reserve them.

```ts
const structuredClone = () => (x: unknown) => "abc";
const g = () => structuredClone([1, 2]);
```

`bun selfhost/freeze-attack10/rt10.ts selfhost/freeze-attack10/f.ts --only f-sc-type`, observed:

```
== selfhost/freeze-attack10/f.ts:f-sc-type: ACCEPT
   drive -> DIFF g is outside its type: string "abc"
   SILENT
```

`g` is typed `number[]` (the global's signature) and holds `"abc"`. In `f-sc-record`,
`typeof structuredClone({ n: 1 })` gives `"number"`. Three rows are loud: `f-sc-number`, `f-usp-replace` and
`f-esc-structuredClone` throw "structuredClone is not a function … is 5" or "7 is not a constructor". drive-run shows
none of these, because it uses the global.

### F-3: a local or parameter `h` in a cell that has JSX. Rule F reserves `h` as a cell name only.

```ts
const g = () => { const h = (t: string) => 7; return <div>x</div>; };
```

`bun selfhost/freeze-attack10/rt10.ts selfhost/freeze-attack10/f.ts --only f-local-h-jsx-min` and the same with
`lite/infer/attack/drive-run.ts`, observed under both:

```
== selfhost/freeze-attack10/f.ts:f-local-h-jsx-min: ACCEPT
   drive -> DIFF g is outside its type: number 7
   SILENT
```

JSX lowers to `h(...)` calls, and the local `h` takes them. `g` is typed as an element and holds 7. A parameter `h`
(`f-param-h-jsx`) and a local `h` beside a component (`f-comp-h`) are accepted. They throw "h is not a function. (In
'h("div", {}, h)', 'h' is 1)" and "(In 'h(C, {})', 'h' is 3)", which is case (d). These messages quote a call the
user did not write. The d1 row `d1-ok-name-param` accepts a parameter `h` in a cell with no JSX, which is correct.

### What F's d1 rule guards, by runner

- **Names that crash `runCells`.** Beyond d1's list, they are `URL` (a third name with `Map` and `Set`) and
  `<name>$ref` beside a state cell. drive-run crashed on 10 accepted `Map`/`Set`/`URL` rows (`f-cls-*`, `f-esc-URL`).
  Because `runCells` ships in the lite notebook, these are case (d) on that runner.
- **Names that misbind in the compiled module.** None crash, but six capability names (F-1) and two input globals
  (F-2) bind the wrong value, as does a local `h` (F-3, both runners).
- **Controls.** `f-ctl-state`, `f-ctl-state-use` and `f-ctl-h` run the names d1 rejects with the checker skipped.
  Under rt10 the values are right (`g` = 2, 1, 6), because the compiled cell binds `const state = ss_state` inside
  its own function. Under drive-run each crashes. So the crash d1 reserves these names against is `runCells`'s.
  Under rt10 they do no harm (observed). For the notebook's compiled path, the same is inferred.
- **`f-ctl-cap-now`** fires under rt10 and not under drive-run. The standing harness cannot see F-1 or F-2.
- **Accepted names that changed nothing under rt10:**
  - runtime cell names: `out`, `closure`, `methods`, `ref`, `events`, `listen`, `cross`, `viewRef`, `compileFor`,
    `rejected`, `release`, `SsMap`, `SsURL`, plus `mut`, `freeze` and `borrow`;
  - JavaScript globals: `Object`, `JSON`, `Math`, `Array`, `Promise`, `Number`, `String`, `Error`, `Symbol` and
    `console`, including cells that use `JSON` and `Math` in their bodies;
  - Observable builtins: `width`, `md`, `html`, `DOM`, `Inputs`, `require`, `Mutable`, `FileAttachment`, `Promises`
    and `visibility`;
  - `URL`, a type alias `state`, a component `Map`, `$x`;
  - a nested local `cast`, and a local generic `cast` called as `cast<number>("x")` (gives the local's 42);
  - a parameter `state`, and a parameter `Map` beside `new Set`.
  A type alias `Map` is `[builtin-type-name]`, and `enum` is `[no-enum]`.
- **`home`.** These callers pass no `home`: `lite/stdlib/runtime.ts` `check` and `checkCells`, `core.ojs`
  `ss_check`, `lite/check.ts` and `lite/soundscript/build.ts`. `ts-cells.ts` takes it from a fixed per-file table, and
  `selfhost/rt/check.ts` from `--home`. User source cannot set it (inferred from these callers). A caller of
  `checkSources` can pass `home: "@tomlarkworthy/soundscript-runtime"` for any source; that is API access, not a
  break.
- **Syntax errors.** `eval`, `arguments`, `let`, `await` and `yield` as cell names make `checkSources` throw, as every
  syntax error does (`cprobe.ts`). That is a parse error reported by exception, not a checker crash.

## D: held

All 25 rows are rejected (`d-rt-out.txt`).
- `{ n: number }` does not reach `Mut<{ n?: number }>` (`[type]`) as a parameter, an alias, a fresh literal, or a
  plain or `Mut` view.
- `{ x: number }` does not reach `Mut<{ [k: string]: number }>` (`[type]`).
- A non-`Mut` index view of an aliased object is `[no-delete]`.
- Also rejected: `delete o?.n`, nested paths, a union with an index-record arm, tuple optional elements, a generic
  `T extends { n?: number }`, function-valued members, a `delete` inside a captured helper, and a `delete` across
  cells.

The control (`d-ctl-index-view`) gives undefined for a member typed number when the checker is skipped.

## Not tested

- **The pre-d1 tree.** No verdicts were taken on it, so for every break it is unknown whether it is new in d1.
- **The notebook itself:** the browser, the editor's language hook, and the soundscript module's real `ss_compile`
  and `ss_pool`. Every claim about the notebook's compiled path is inferred from the compiled text and `load()`'s
  arrangement. This includes F-1's `compile` and `pool` rows.
- **Run-time paths A needed none of:** events cells read as `Events<T>`, listeners, and actions driven by frames.
  `a-action-param-state` (a response stored in state by an action's argument) is accepted, but no caller was found.
- **Checker hangs.** No candidate took long (each set ran in a few seconds), and no row was built to find one.
- **Names tried for verdict and run only, without a search for a break:** type names other than `Map` and `state`,
  component names other than `Map`, names with `$` other than `$x` and `x$ref`, and Unicode escapes of names other
  than `now`, `URL` and `structuredClone`.
