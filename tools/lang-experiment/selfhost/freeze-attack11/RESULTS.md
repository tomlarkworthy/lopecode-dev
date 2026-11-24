# freeze-attack11: attacks on the t1 changes (run 2026-11-24)

Run from `tools/lang-experiment`. Every file is in `selfhost/freeze-attack11/`. No other file was edited. No build,
`verify.ts`, `run-all.sh` or git command was run. Each candidate file was run under both runners:
`bun lite/infer/attack/drive-rt.ts <file>` (compiled, `<file>-rt-out.txt`) and `bun lite/infer/attack/drive-run.ts
<file>` (`runCells`, `<file>-dr-out.txt`). `f.ts` and `x.ts` were also run with `drive-rt.ts --both`, which runs both
runners on each accepted row and prints DIFFER where they differ. `min.ts` holds the minimal program of each break
(`min-rt-out.txt`, `min-dr-out.txt`). Verdict probes: `p0.ts`–`p6.ts`, `e-probe.ts`, `x-probe.ts`, run with
`bun selfhost/freeze-attack4/probe.ts`; all their output is in `p-out.txt` and `e-probe-out.txt`.

Breaks found: 9. Seven are silent under at least one runner. Two are checker failures: a crash, and polynomial
growth that passes 2 s.

## Counts

Controls are not counted as candidates. A row is silent when the drive printed DIFF or a value read differently at
the end.

```
target                       file   candidates  accepted (rt / dr)  silent rt  silent dr        controls fired (rt / dr)
1 ix-hides, width            a.ts   149         105 / 105           61         69 (30, see *)   3/4 / 4/4
2 banned-member, inherited   b.ts    59          38 / 38            26         26               1/1 / 1/1
3 narrowing (E-1)            e.ts    65           6 / 6              0          0               1/1 / 1/1
4 reserved names             f.ts   138         135 / 135            1 (loud)   1 (loud)        0/1 / 0/1 (**)
4 found under 4: scope       s.ts    28          25 / 25            18         19 (16, see *)   2/2 / 2/2
5 differential               x.ts    44          44 / 44             0          0               -
all                                 483
```

- Target 4 also has `names.ts`, which compiles programs and reads their names; it is not a candidate file (see
  target 4).
- (*) drive-run's STATE readings are not valid. The `freeze-attack3` harness that drive-run uses calls every function
  value it reads, and Action values are among them. So under drive-run, the state cell `c` reads 1 in any row that has
  an Action cell, even with no coercion (`a-m-extra-action`: c=1 under drive-run, c=0 under drive-rt). Of a.ts's 69
  drive-run silent rows, 39 are silent only by STATE. 25 of those 39 also show `error g: action called during a cell
  evaluation`, so they are loud under drive-run. That leaves 30 silent. s.ts has 3 such rows, which leaves 16. drive-rt
  reads values through `observe.ts`, which does not call Actions, so its STATE readings are valid.
- (**) `f-ctl-Map-cell` is a cell named `Map` run with the checker skipped. runCells crashes on it, as t1 recorded,
  and the compiled module runs it correctly. So it fires under neither runner. It is the expected control for the
  runner difference only.
- x.ts: 0 DIFFER under `--both` (`x-rt-out.txt`).
- Loud rows are those accepted and then in error with no DIFF. a.ts: 16 compiled and 10 runCells, plus the 25 above.
  b.ts: 3 and 2. s.ts: 2 and 2.

## Breaks

### A-1. An Action declared as `toString`, `valueOf` or `toJSON` runs during a cell's evaluation

The conversion that calls it is implicit, so the checker does not see a call. The rules that should stop it are
`[action-call]` and `[action-pass]` (S6.6). A width-hidden member adds more conversion sites.

```ts
const c = (): StateCell<number> => state(0);
const a = (c: State<number>) => action(() => c.set(1));
const g = (a: Action<[]>) => `${{ toString: a }}`;
```

`bun lite/infer/attack/drive-rt.ts selfhost/freeze-attack11/min.ts --only min-action-template`:
```
== ...min.ts:min-action-template: ACCEPT
   drive -> DIFF STATE c is 1 with no event; g fulfilled="undefined"
```
Under drive-run (same file and `--only`):
```
   drive -> DIFF STATE c is 1 with no event; g rejected=undefined action called during a cell evaluation
   error g: action called during a cell evaluation
```

- **Compiled runner (observed): silent.** The action writes state while `g` computes. `g` holds the string
  `"undefined"`.
- **runCells (observed): loud** (case d). It refuses the call. The c=1 that drive-run shows is the harness artefact
  (*), not the program.
- **With no hiding** (`a-d-*`), these conversions are accepted: a template literal, `"" + x`, `[x].join()`, `+x`,
  `x == 1`, `messageOf(x)` and `` `${[x]}` ``.
- **Through `{ readonly n: number }`** (the builder's open hole, `a-h-*` and `a-h2-*`), these are accepted as well:
  `String(o)`, `JSON.stringify(o)`, `Number(o)`, `toSorted()`, a helper's parameter, another cell's value, a kept
  function and `unknown`.
- **Rejected:** `String(x)`, `JSON.stringify(x)` and `Math.max(1, x)` on the unhidden record (`[action-pass]` or
  `[type]`).
- **Infinite loop** (`a-h2-tostring-loop`, compiled). When `g` also reads `c` and the action increments it, `c`
  reached 15 when the harness stopped settling.
- **memo:** inside a memoised function, the run-time guard throws (loud).

This attack confirms the builder's hole leads to an observable break: an Action given `{ readonly n: number }`, then
`unknown`, is called by `String(u)` (`a-h2-tostring-unknown-String`, silent compiled).

### A-2. A hidden callable `then` makes an async cell's value a different type

The rule that should stop it is S4.6's "callable then" `[type]` rule. That rule reads the declared type, so a
callable `then` hidden by width subtyping passes it.

```ts
const g = async () => { const x = { n: 1, then: (r: (v: string) => void) => r("s") }; const o: { readonly n: number } = x; return o; };
```

`bun lite/infer/attack/drive-rt.ts selfhost/freeze-attack11/min.ts --only min-then-async` and the same with
drive-run each print:
```
   drive -> DIFF g is outside its type: string "s"
```

- `g` is checked as `{ n: number }` and holds `"s"` under both runners.
- The run-time publish guard ("a value with a callable then … cannot leave its cell") fires only for a sync return.
  An async function's promise has already adopted the thenable before the value is published.
- Silent in these shapes too:
  - an async generator's yield (`a-h-then-gen`);
  - `await o` (`a-h-then-fn-await`: `v.n` is undefined);
  - a helper's return (`a-h-then-fn-param`);
  - `[await o][0]`.
- With an Action as `then`, the run-time guard on action arguments refuses the call (loud).

### A-3. A response hidden as an undeclared member of a record with a required member leaves the cell

This is the width hole t1 left open. The rules that should stop it are `[handle-pass]` and `[iterator-cell]`.

```ts
const r = async (fetch: Fetch) => { const res = await fetch("https://x.test/"); const x = { n: 1, res }; const o: { readonly n: number } = x; return o; };
```

`bun lite/infer/attack/drive-rt.ts selfhost/freeze-attack11/min.ts --only min-resp-race` (two plain JavaScript readers
of `r` in the same module, `after`):
```
   drive -> DIFF USED o2: used: Body already used
```

- **Shapes** (observed RESP or USED, `a-r-*`, `a-g-*`, `a-o-*`): 25 are accepted, among them `unknown`, an array, a Map, a Set, a kept function,
  a spread, a destructuring rest, a promise, an async generator, `.then`, `cast` back to the same type, an alias, an
  interface, a union, a ternary, and a state's contents.
- **Readers:** no SoundScript reader can read the body. `JSON.stringify` gives `{"n":1,"res":{}}`. So the
  order-dependent read (case a) needs readers in another language. drive-run cannot define `after` readers, so the
  race is observed under the compiled runner only.
- **Loud** (case d, against S2.6's `structuredClone` rule): `snapshot(o)` and `structuredClone(o)` on such a value
  throw "The object can not be cloned". A hidden plain function does the same (`a-sc-hidden-fn`,
  `a-snap-hidden-fn`). The unhidden `structuredClone(x)` is `[type]`.
- **State and Events handles** hidden the same way (`a-m-extra-state-*`, `a-g-hidden-events-*`) leave the cell and
  reach `unknown`. No SoundScript reader reads them back.

### A-4. `JSON.stringify` gives `undefined` where the checker types `string`

This is adjacent to t1. No earlier RESULTS records it (freeze-attack4's `hk-tojson` is a hook that writes a Mut,
not this). The rule at fault is the intrinsic's signature.

```ts
const g = () => JSON.stringify(undefined);
```

Both runners: `DIFF g is outside its type: undefined undefined` (`min-json-undefined`). The same holds for
`JSON.stringify(() => 1)`, a `toJSON` that returns undefined, and a `toJSON` Action. `JSON.stringify(u).length` throws
(loud).

### B-2. A record type with only optional members takes functions, Errors and other non-plain objects

An optional member of such a type reads a member those values inherit or own. B-1's ban covers only
`Object.prototype` names; A-1's "takes any object" admits the values.

```ts
const g = () => { const v: { readonly name?: number } = (x: number) => x; return typeof v.name; };
```

Both runners: `DIFF g is outside its type: string "string"` (`min-fn-name`).

- **Silent rows** (26, under both runners):
  - functions: `call`, `apply` and `bind` give `"function"`, and `name` gives a string;
  - `length` read as a string;
  - `(v.call ?? 0) + 1` gives `"function call() {…}1"`;
  - `v.call(0, 1)` typed `string` gives a number;
  - Error `stack?: number` (string);
  - `Uint8Array` `byteLength?: string`;
  - `URLSearchParams` `size?: string`;
  - `Promise` `catch?: number`;
  - an array iterator's `next?: number`.
- **Routes:** a kept function read by another cell, an object method, a helper parameter, an array element, a union,
  an alias, an interface, a generic and a `memo`.
- **Rejected:** arrays, Maps, Sets, strings, numbers, URL, RegExp and Error `message` are `[type]`. An Action is
  `[action-pass]`.
- **Loud:** `caller` throws "'arguments', 'callee', and 'caller' cannot be accessed".

### C-1. A mapped type with a `readonly` or `?` modifier crashes `checkSources`

This is case (c): valid TypeScript makes the checker throw.

```ts
type W = { readonly [K in "a"]: number };
```

`probe.ts p6.ts` gives `min-mapped: CRASH acornParse(...).ast.program.body[0].typeAnnotation.readonly: expected
string or null, found boolean true`.

- The same happens inside a cell annotation and with `?`.
- The toolchain's `splitCells`/`declaredName` throw the same TypeError from `lite/boundary.ts`. This was observed
  when `names.ts` first ran over `b.ts`.
- Without modifiers, a mapped type is `unsupported MappedType`. The checker refuses it and does not crash.

### C-2. Check time grows polynomially on a wide recursive union of all-optional records

The input is a union given `{}` or a structurally equal union. Reproduce with `bun selfhost/freeze-attack11/timing2.ts
10,20,40,80,120,160 U-to-empty-only`:

```
U-to-empty-only: n=10 24ms | n=20 31ms | n=40 182ms | n=80 1602ms | n=120 6224ms | n=160 17095ms   (all ACCEPT)
```

- About n^3.4. It passes 2 s near n=85, about 6 KB of type text. It is not exponential.
- `U` to a separate equal `V` grows the same way: 1723 ms at n=80.
- Declaring `U` alone stays at 3 ms. Required-member or non-recursive unions stay under 10 ms (`timing2-out.txt`).
- The other shapes in `timing-out.txt` stayed under 90 ms at n=80: generic optional chains, equal recursive pairs,
  nesting depth, and `T extends {}`.

### F-4. A cell named `this` is accepted

The rule that should stop it is `[reserved-name]` (S2.10), or a syntax error.

```ts
const this = () => 5;
```

- **Compiled runner (observed):** it runs, `g` = 6, and the cell `this` = 5.
- **runCells (observed):** it crashes, "Cannot use the keyword 'this' as a lexical variable name" (`min-this`, and
  `f-this` DIFFER under `--both`). That is case (e). Because runCells ships in the lite notebook, it is case (d) there.
- Every other reserved word is a parse error, reported by exception (`p5.ts`).
- The TypeScript contextual keywords are accepted and run the same under both runners (26 `f-kw-*` rows): `type`,
  `async`, `of`, `get`, `module`, `declare` and the rest.

### S-1. A closure's name binds to the outer declaration when a later declaration in the same block shadows it

Found under target 4. In JavaScript, a `const` is in scope for its whole block, so the closure reads the later
declaration. The checker binds the name to the outer one: a parameter, an outer local, a cell, or an intrinsic
global. The rules at fault are name binding (S2.6), and then whichever rule the true binding's type gives (`[type]`,
`[action-call]`).

```ts
const g = () => { const f = () => Math.max(1, 2); const Math = { max: (a: number, b: number) => "s" }; return f(); };
```

Both runners: `DIFF g is outside its type: string "s"` (`min-scope`).

- **Silent** (15 rows, both runners):
  - shadowed globals: `JSON`, `Number`, `String`, `parseInt` and `structuredClone`;
  - an inner block over a parameter or an outer `let`/`const`;
  - a nested function;
  - a `for` body;
  - a `catch` block;
  - a cell parameter;
  - a Mut array returned through a kept function typed `() => number` (`s-mut-kept-write`: `k` = `"11"`).
- **An Action** (`min-scope-action`): `const x = () => 0; { const f = () => x(); const x = a; f(); }`.
  - Compiled: c=1 and silent.
  - runCells: "action called during a cell evaluation" (loud).
- **Loud:** `new Map()` with a later `const Map = 5`, and `f-local-sc-and-use` ("structuredClone is not a function").
- **Held:** `s-undefined` gave 1, and a TDZ read throws.
- Whether S-1 predates t1 is unknown: no pre-t1 tree was run.

### R-1. The compiled runner has no guard against an action called during a cell's evaluation

Observed on control `min-ctl-action-call`, which calls `a()` in a cell body with the checker skipped:

- **Compiled:** c=1 and `g` = 1, with no error.
- **runCells:** "action called during a cell evaluation".

The reason is that the compiled path raises `rt.evalDepth` only in `ref()` (state cells) and in the generator guard
(`lite/browser/cells.ts`). runCells raises it around every cell (`lite/browser/run.ts:137`). So the check-time rule is
the only guard on the compiled path. A-1 and S-1 get past it. That the notebook behaves as drive-rt does is inferred
from drive-rt's notes and the compiled text. No browser was run.

## What held

- **E-1, target 3** (`e.ts`, 65 rows, 6 accepted, 0 silent). The declaring function wrote the variable in each of
  these forms, and every rejection is the E-1 diagnostic at the nested read (`e-probe-out.txt`):
  - `+=`, `??=`, `||=` and `&&=`;
  - array and object destructuring, with a default or a rest;
  - an assignment inside an expression, a call argument, a template, a short circuit or a literal;
  - after a label, in a `switch`, `try`, `catch`, `while` or `do`, and in a `for` init or update.
  - Binders: destructured parameters, a default parameter, destructured `let`, a catch parameter, a `for` let, a
    function declaration, a named function expression, an object method, a cell parameter, and
    `map(async …)` + `Promise.all`.
  - In the declaring function itself, every loop back-edge, `continue`, labelled break, fallthrough, try/finally,
    destructuring and logical-assignment case was rejected or gave a correct value.
  - Unsupported: `for…of`/`for…in` over an existing binding, and getters.
- **B-1's routes** (`p3.ts`, `b.ts`): a merged interface, `extends`, a generic alias, a type-parameter default, an
  optional method (`toString?()`), a string-key member, a union arm, and an index signature beside a member. Each is
  `[banned-member]`. A required member is satisfied only by an own member: assigning by width is `[type]`, and
  `cast` to `{ readonly constructor: number }` is `[no-member]`. `JSON.parse` and `Object.fromEntries` with
  `__proto__` read through `cast` are `[no-member]`.
- **A-1 itself.** These are rejected:
  - one-member structural views of a Mut value: `{ ok }` and `{ status }` of a response, `{ length }` of a Mut array,
    `{ size }` of a Mut Map, `{ get }` of a State;
  - unions, tuples and arrays of those;
  - `T extends {}`, `T extends { ok }` and `T = {}` over a response;
  - a response or an unhidden Action in `unknown[]` or `readonly unknown[]`;
  - `Object.values` and `Object.entries` of a hidden record (`[type]`).
  - `Partial`, `Readonly` and `Pick` are `[unknown-type]`, intersections are unsupported, and component props here
    were `[inject-unknown]` or unsupported.
- **Target 4, names** (`names.ts`, `names-out.txt`).
  - Scope: 127 candidate files, 4021 programs, 1058 accepted, 2696 cells compiled, parsed with acorn.
  - (i) Inputs taken from outside the module are `Generators`, `invalidation`, `structuredClone`,
    `URLSearchParams` and `ss_*`. Free identifiers in the emitted definitions are `Array Error Float32Array
    Float64Array JSON Math NaN Number Object Promise String Uint8Array undefined`.
  - (ii) Intrinsics: `ALLOWED_GLOBALS`, the capabilities and the prelude.
  - Every name in (i) or (ii) is `[reserved-name]` (iii). No gap.
  - The names the compiler inserts into a user's scope are `ss_closure`, `ss_methods`, `ss_i` and `h`, plus the
    captured variables in closure thunks.
  - Accepted cell names ran the same under both runners (135 `f.ts` rows, 0 DIFFER apart from `this`):
    - runtime cells: `closure`, `methods`, `out`, `ref`, `events`, `listen`, `cross`, `viewRef`, `compileFor`,
      `rejected`, `release`, `SsMap`, `SsSet`, `SsURL`;
    - Observable builtins and other JS globals;
    - locals and parameters with those names (when declared before use; see S-1).
  - `builtins.ts`: a SoundScript cell named `md`, `width`, `html` or `Inputs` (and the others listed in
    `builtins-out.txt`) shadows the builtin for its own module. Its SoundScript reader and a same-module JS reader
    get the cell. A reader in another module gets the builtin. That is Observable's own module scoping.
  - `now`, `invalidation` and `Generators` are reserved.
  - `viewof` and `mutable` are `[reserved-name]` as cell or parameter names, and `viewof x = 1` is a parse error.
- **Target 5:** 44 programs, 0 differences. They covered:
  - events and two listeners;
  - actions with arguments, nested, throwing and rollback, and `read`;
  - `memo` with records and recursion;
  - `cast` that passes, fails, is a union, or has an optional member;
  - JSX children, lists, fragments, nested components and an Action prop;
  - async chains, `Promise.all`, rejection and try/catch;
  - fetch json and text;
  - sync and async generators;
  - state from a cell;
  - kept functions and methods;
  - Map, Set, URL, RegExp replace, JSON, `snapshot`, `equals`;
  - `compile`;
  - typed arrays and BigInt.

## Not tested

- **The browser notebook.** Claims about the notebook's compiled path (R-1, A-1 silent there) are inferred from
  drive-rt.
- **The pre-t1 tree.** For every break it is unknown whether it is new in t1.
- **DOM rendering of JSX.** A hidden or spread handler on an intrinsic element was not tried. Spread props were
  unsupported in the shapes tried.
- **`pool`.** It was not exercised in x.ts, though `compile` was.
- **A `foreign.d.ts` source.** `probe.ts` passes `foreign: null`, so declarations from a foreign file were not
  attacked.
- **`Events` handles hidden by width and read by another language's cell.** These were accepted. No reader was run.
- **`visibility` as a builtin** gave `undefined` to the other-module reader in `builtins.ts` (the Runtime treats it
  specially). It was not followed up.
