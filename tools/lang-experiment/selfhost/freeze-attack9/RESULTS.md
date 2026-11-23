# freeze-attack9: attacks on the e1 changes (run 2026-11-23, 09:45–11:40 CET)

Run from `tools/lang-experiment`. Every file is in `selfhost/freeze-attack9/`. No other file was edited, and no build,
`verify.ts` or `run-all.sh` was run.

Two of the breaks below are new in e1: `key` on a component (B-1) and a `cast` to an `Infinity` literal type (B-2).
B4's async change adds a route to an older break (B-3). `cast` can drive the checker into exponential time (B-4). The
mechanism of B-4 predates e1; `cast` makes it reachable from any cell.

## How the rows were run

- `bun lite/infer/attack/drive-run.ts <set.ts> [--only s]` is the named harness. It runs every set here except the
  rows that use `fetchValue`, because `freeze-attack3/harness.ts runCand` ignores that field.
- `run9.ts` covers those rows. It checks with run-sets' `verdictOf` (rules on, the check's facts kept, so each cast
  gets its shape) and runs accepted rows with `observe.ts observeProgram`, which supports `fetchValue` and the
  publish tap. A row is silent when observe.ts prints a CHANGED line. B-1, B-2 and B-3 give the same verdict and
  drive line under both runners; I compared them by running `--only key-comp-read`, `--only lit-infinity-rec` and
  `--only pp-cell-input` under each.
- `modes.sh <set.ts> <out>` runs `run9.ts` in four modes: shipped, `SS_MEASURE_BODYFN=0` (S4.12's throw off),
  `SS_MEASURE_REG=0` (closure registration off), and both off. Outputs are in `<set>-out.txt` and `<set>-sum.txt`.
- Vehicles are in `lib9.ts`. **tyRow** reads cell g and applies a hand-written test of what g's checked type allows;
  a value outside it gives DIFF. **yRow** is b2-attacks.ts's vehicle Y: DIFF when the read-only name `c` sees a
  write. The fetched-value cast rows (`c2.ts`) use cast-attacks.ts's checks (frozen, plain, not the input) plus a
  hand oracle for T. `g.ts` imports g1-attacks.ts's vehicle A, its drive, and its `g1-ctl-let` control.
- Verdicts on the tree before e1 come from `before-probe.ts <srcs.ts>`. It imports `checkSources` from
  `lite/soundscript/.scratch/e1/before/tools/lang-experiment/lite/core.ts`. That copy's own
  `selfhost/freeze-attack4/probe.ts` fails with "Cannot find module ../../../../vendor/observable-stdlib/...". These
  are verdicts only; no program was run on the before tree.
- Target 5 rows are checked one per process (`ycheck.ts <i>`, `timeout 40`). `yexp.ts`, `yexp2.ts` and
  `yexp-before.ts` time one family of types at a chosen depth.

## Counts

```
target                     files                 candidates  accepted  silent (counted)       e1 breaks           controls fired
1 fresh receivers (B2)     f1.ts                  34          12        0                      0                   1/1
2 cast<T>                  c2 c3 c4 c5            203         144       12 (4+0+2+6)           B-2 (5 rows)        4/4 (c5 has none)
3 B4 accepts               b4.ts b4b.ts           94          48        12 (8+4)               B-1 (5 rows), B-3   3/3 (b4b has none)
4 registration names       g.ts g2.ts             33          15        0, 0, 0, 10 by mode    0                   0/3, 1/3, 0/3, 3/3 by mode
5 type cycles, check time  y.ts (+ yexp*)         45 (+2 families) 6    -                      B-4 (time)          -
all                                               409         225
```

Modes are listed in the order shipped, BODYFN=0, REG=0, both off. Targets 1–3 give identical counts in all four
modes. In target 4 every silent row is in the both-off mode. g1-attacks.ts records that mode as unprotected, and its
controls fire there. `g1-ctl-let` also fires with BODYFN=0 alone, as g1-attacks.ts says it should.

Counted silent rows that are not e1 breaks:
- `c2.ts`, 4 rows (`symbol-value`, `bigint-*`, `symbol-in-unknown-obj`). With T = `unknown`, cast passes a symbol or
  a bigint through. Every value is an `unknown`, and S11.5 lets `unknown` take any primitive. My oracle was stricter
  than the spec.
- `c4.ts`, 2 rows: O-2 below.
- `c5.ts` `lit-infinity-refuses-infinity`: a false refusal, the other side of B-2.
- `b4.ts` `idx-with-member` and `idx-delete-required`: O-1. `b4b.ts` `sync-cell-promise-input(-nested)`: O-3.

Rows dropped as wrong oracles, recorded so the mistake is not repeated. I first counted `async-pp-local`,
`async-pp-ann`, `async-pp-param`, `pp-then-callback` and `async-generic-*` as breaks, assuming `await f()` on a
`Promise<Promise<number>>` is typed `Promise<number>`. It is not. `await` flattens every level (`pb7.ts`, live
checker): `const x: Promise<number> = await f()` is `[type] number is not assignable to Promise<number>`, while
`const n: number = await f()` is accepted. The same holds for `.then`'s callback (`pb9.ts` `then-cb-number`). Those
rows now expect "number" and pass.

## Breaks

### B-1: `key` on a component is checked as `string | number` and still reaches the component's props. New in e1 (B4).

```tsx
const g = () => { const C = (p: { readonly key?: { readonly n: number } }) => <div>{p.key === undefined ? "none" : typeof p.key.n}</div>; return <div><C key={5} /></div>; };
```

`bun lite/infer/attack/drive-run.ts selfhost/freeze-attack9/b4.ts --only key-comp-read`, observed:

```
== selfhost/freeze-attack9/b4.ts:key-comp-read: ACCEPT
   drive -> DIFF g is outside its type: object {"tag":"div","props":{},"children":[{"tag":"div","props":{},"children":["undefined"]}]}
   SILENT
```

`p.key` is typed `{ readonly n: number } | undefined`, and at run time it holds `5`, so `typeof p.key.n` is
"undefined". `key-comp-union-tag` has `p.key: "a"` holding `"b"`. Five rows are silent in all four modes.
`key-comp-fn-key` (`p.key: () => string` holding `1`) throws `p.key is not a function`. Cause, read from the code
and not tested apart: `lite/infer/ix-jsx.ss.ts:65` checks `key` and leaves it out of the object it checks against the
component's parameter, while `lite/jsx/h.ts` `h` still calls the component with `{ ...props }`, key included.
On the tree before e1 (`before-probe.ts pb2.ts`), `key-comp-read` is `REJECT [type] 5 is not assignable to
{ n: number }`. A fix has two shapes: drop `key` from the props `h` passes to a component, which changes the
runtime; or reject a component whose props type declares `key`, which changes only the checker.

### B-2: a literal type that JSON cannot write reaches the compiled cell as `null`. New in e1 (cast).

```ts
const v = () => null;
const g = (v: null) => { const r = cast<1e400>(v); return r.ok ? typeof r.value : "refused"; };
```

`bun lite/infer/attack/drive-run.ts selfhost/freeze-attack9/c5.ts --only lit-infinity`, observed: `drive -> DIFF g
is outside its type: string "object"`. The checker reads `1e400` as `Infinity`: `const x: 1e400 = null` is `[type]
null is not assignable to Infinity` (`pb4.ts`). The cast gives `ok: true` with `value: null`. Cause, read from the
code: `tcCastEdits` (`lite/toolchain/tc-reg.ss.ts:184`) writes each shape with `JSON.stringify`, which turns
`{ k: "lit", v: Infinity }` into `{"k":"lit","v":null}`, and `primFits` then accepts `null`. Silent forms: a member
(`{ readonly x: 1e400 }`), `-1e400`, an array of `1 | 1e400` (gives `number,object`), and `r.value + 1` (gives 1).
`cast<1e400>(1e400)` is refused. `-0` does not break this way, because the checker treats `-0` and `0` as one type
(`pb4.ts`: `const x: -0 = 0` is accepted). Before e1, `cast` was a `[free-name]` (`before-probe.ts pb6.ts`).

### B-3: a cell's promise value is typed `Promise<T>` for its readers, and they receive `T`. Older; B4 adds the async route.

```ts
const p = async (): Promise<Promise<number>> => Promise.resolve(5);
const g = (p: Promise<number>) => typeof p;
```

`bun lite/infer/attack/drive-run.ts selfhost/freeze-attack9/b4b.ts --only pp-cell-input`, observed: `drive -> DIFF g
is outside its type: string "number"`. The live checker rejects `(p: number)` with `[inject-type] p: Promise<number>
is not assignable to number` (`pb8.ts`). An unannotated `(p) => typeof p` is accepted and silent too. The sync form,
`const p = () => Promise.resolve(5)` read as `(p: Promise<number>)`, is accepted on the before tree (`pb9.ts`) and is
silent (`sync-cell-promise-input`). So the hole is older than e1. B4's "async function returns a promise" made the
async form accept; before e1 it was `[type] an async function returns Promise<number>, a promise: await it`
(`pb8.ts`). I did not find this hole in the notes or earlier RESULTS files, but I did not search every attack folder.

### B-4: `cast<T>` takes time exponential in T's depth, reachable from any cell. The mechanism is older.

```ts
type P<T> = { readonly a: T; readonly b: T };
const v = () => 1;
const h = (v: number) => { const r = cast<P<P<…22 levels…<number>…>>>(v); return r.ok ? 1 : 0; };
```

Measured on 2026-11-23 on this machine (`yexp2.ts <d>`, `yexp.ts 25 cast`, `yexp2-30.txt`):

```
generic depth 18   269 ms     REJECT [cast-type]
generic depth 20   919 ms
generic depth 22  3761 ms
alias chain 25   32001 ms     (25 aliases U_i = { a: U_i+1; b: U_i+1 })
generic depth 30   no verdict within 150 s (timeout exit 124)
the same depth-22 type as an annotation only: 22 ms (yexp.ts 22 param)
```

Each level doubles the time. Cause, read from `lite/shape.ss.ts` `shapeAt` and not instrumented: the first expansion
has limit 16. When it fails, the whole type is expanded again with limit 256, and only then is `far.rec.size`
checked. A branching type that is not recursive is expanded in place at every use, so that second pass costs 2^depth.
`lite/shape.ss.ts` is identical in the before tree. There the same cost is reached through a parameter that names a
cell in another language (`yexp-before.ts 22 before`: 3582 ms). Since e1, `cast` reaches it with no such cell. A
row that never finishes is a hang for the editor that runs the checker, even though the final verdict would be a
rejection.

## Older holes met on the way (accepted before e1 too)

- **O-1: `delete` on a required member.** `const m = { n: 1 }; delete m.n; return typeof m.n;` gives "undefined"
  for a `number`. It is accepted before e1 (`pb1.ts` `delete-unann`). S3.4 allows `delete` on any Mut. B4's writable
  index-signature local adds `{ [k: string]: number; n: number }` as a route (`idx-with-member`, silent). That form
  was `[no-delete]` before e1.
- **O-2: narrowing survives a helper that assigns the narrowed `let`.** S3.11 allows the helper to assign a captured
  `let`. Program: `let r = mk(true); const bad = () => { r = mk(false); }; if (r.ok) { bad(); return typeof r.value; }`.
  It gives "undefined" for a `number` (`c4.ts` `narrow-plain-union-helper`, silent). It is accepted before e1
  (`pb6.ts`). A `Cast` is one more union that reaches it (`narrow-reassign-in-fn`).
- **O-3:** the sync half of B-3.
- **O-4: a prelude name used as a cell name.** `const cast = () => 1;` (also `state`, `memo`, `equals`, `messageOf`)
  is accepted by the checker. Running it fails before any cell runs, with "Cannot declare a const variable twice:
  'cast'" (`g2.ts`). It is accepted before e1 for the other names (`pb5.ts`). The failure is loud, but the message
  does not name the cell as the cause. Rows with this failure are run one at a time: after one, the `g.ts` controls
  stopped firing for the rest of that process. I did not find out why.

## Loud, but the message misleads

- `c2.ts` `union-tag-numlit`: `{ t: "1" }` cast to `{ t: 1; n: number } | { t: 2; s: string }` is refused with
  "value: expected an object or an object, found an object".
- `c2.ts` `opt-inherited`: `Object.create({ a: "x" })` is refused with "expected an object, found a Object object".
- `c5.ts` `lit-marker`: `cast<"/*ss-*/">` is accepted by the checker, then fails to compile with "cell source contains
  the reserved text /*ss". The text it names is in a type.
- Spec text, not a break. S9.8 says "each property of v is read once". In `c2.ts` `union-untagged-getter`, the copy
  `{"a":"s","c":"x"}` holds the getter's second value. So the union's second member read `a` again after the first
  member failed. Check and copy agree within each attempt. A tagged union reads its tag twice (dispatch, then the
  member), and `union-tag-getter` refuses when the two reads differ.

## What held

- **Target 1, 34 rows (`f1.ts`).** No accepted row wrote through `c`. A view over a cell-input ArrayBuffer is
  rejected. The element of a fresh container (`concat`, `flatMap`, `filter`, `splice`, `Object.entries`, `values`,
  `fromEntries`, `snapshot([c])[0]`, `new Map(...).get`) is rejected. A literal with a setter or getter is
  `[no-member]`. A conditional with two fresh branches is rejected, so the rule is narrower than it needs to be.
- **Target 2, matching shapes to calls by position (`c3.ts`, 49 rows, plus the cast rows of `c4.ts`).** No
  misalignment. The rows cover two casts in one expression in both orders, hoisted and nested functions, default
  parameters, `?:` and `&&`, template literals, IIFEs, `map`, `Array.from` (both overloads), `reduce` and `toSorted`
  callbacks, a cast inside a cast's argument, `cast?.<T>`, trailing commas, `)` inside a comment or string,
  `(cast)<T>()`, switch, loops, try, an unused function, code after `return`, memo, six casts in a row, and JSX
  (attribute then child, nesting, `key` on an element and on a component, fragments, text around holes). They also
  place casts in an action, a generator, a listener, a kept function, a state initial value, a component prop and two
  cells.
- **Target 2, shapes (`c2.ts`, 88 rows).** Every accepted value was refused, or became a frozen plain copy that is a
  T. Recursive, mutual, three-alias rings, `L<number>` beside `L<string>` (a node shared by both is refused), deep
  generic arguments with similar `show` text, recursive JSON-like unions and tuples, cycles, getters and proxies in
  unions, sparse and proxied tuples, inherited and getter optional members, `-0`, `NaN`, boxed strings,
  `arguments`, array subclasses, `__proto__` and `constructor` keys, a 200000-element array, a sparse array of length
  2^24, 20000-deep values, revoked proxies and duplicate `ownKeys`. `interface B extends A` keeps A's members.
  `[cast-type]` refuses `Events`, `Listener`, `Pool`, `Elem`, `State`, `Map`, `Date`, function and `Mut` members,
  index signatures, type parameters (also `typeof` of a callback parameter: `[mut-nested]`), `bigint`, `object`,
  `never`, `Promise` and growing generics.
- **Target 2, the name `cast`.** A local `cast` is not given a shape, wherever it is bound: const, block const,
  `for`, `catch`, parameter, or a function declaration in a block. In every case the program's own `cast` still
  refuses 5 as a string, so the compiled code is not run under Annex B rules. A user `type Cast` is
  `[builtin-type-name]`. `cast` used as a value or with `new` is `[prelude-value]`. A spread argument leaves the cell
  unsupported. The result is not writable, also not through an annotated local. The copy does not follow later
  writes to the Mut it was copied from.
- **Target 3, other B4 items.** `reduce`, `reduceRight`, `Array.from` and user generics whose annotated callback
  parameters disagree with the arguments are `[type]` (16 rows). The B4 shortcut in `ixFirstArg` is followed by the
  final argument check. Events cells yielding wider or optional literals hold, and a `Mut` events type is
  `[mut-nested]`. An index-signature local initialised from an array, a Map, an input record, or a narrower spread,
  or kept by a function, is rejected or held.
- **Target 4 (`g.ts`, 29 rows, four modes).** Escaped spellings of every emitted name are `[reserved-name]`:
  `ss_closure`, `\u{73}s_closure`, `ss_methods`, `ss_i`, `$ss$`, and cells `ss_out`,
  `invalidation`, `Generators`. Methods under numeric, exponent, `0.10`, escaped-string, `ss_`-named,
  `constructor` and duplicate keys register, and so do a function-valued property, a nested method and a method in an
  array: 0 silent with registration on. Numeric keys that the checker types differently (`1e3`, `0b11`, `.5`) are
  `[type]`, so they were not tested at run time. A local `h` in a TSX cell replaces the element maker. That is
  the open item already recorded in the notes.
- **Target 5 (45 rows, each under 1.1 s).** Mutual, generic self, growing, `Id<B>`, `F<B> = B | null`, argument
  swap, parentheses, `A & {...}`, `never | A`, `unknown | A`, an unused type parameter and member access give
  `[type-cycle]` or another rule. `Mut<A>`, `Borrowed<A>`, `Promise<A>`, `State<A>`, `Map`, `Set`, `Record`,
  `Iterable`, function types, `interface I extends I` and mutual `extends` all end. A chain of 2000 aliases checks in
  669 ms. The only slow case found is B-4, which is not a cycle.

## Not tested

- Export to HTML. `cast<"</script>">` runs in the harness. Whether an exported notebook survives it is untested.
- `cast` inside a `compile(...)` island. My row was unsupported for another reason, so the worker's `refuse("cast")`
  was never reached.
- Nested aliasing of a cast's copy against its input. `r.value.a === v.a` is `[strict-eq-object]`. That every level
  is a new object is read from `boundary.ts` `copyOpen`, not observed.
- Later reads of values deeper than 20000. The harness's own `ser` overflows on them (the "late throws" lines in
  `c2-out.txt`).
- B-4 between depth 25 and 30. Only the 150 s timeout at depth 30 was observed.
- Running any program on the before tree. Only its verdicts were checked.
