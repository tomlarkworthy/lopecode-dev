# lang-experiment harness

Checks and runs ports. The rules of the language are stated in the specification module
`@tomlarkworthy/soundscript-spec` (`lite/soundscript/spec.ojs`, built into
`lopebooks/notebooks/soundscript.html`); how to port a module is in "Porting a module" in this file.
Until 2026-11-16 both were in `RULES.md`, which was then deleted; its last text is
`git show a92fbbf7:tools/lang-experiment/RULES.md` (branch `soundscript-experiment`), sections 2-5
already reduced to pointers. Older records here (`ports/*/GAPS.md`, `lite/NOTES-*.md`, `lite/notebook/tutorial.ojs`, `archive/`) cite it,
with line numbers, as it then was.

Built 2026-11-14 against the RULES.md that has the
`let x = (a: number) => 42 + a` cell form (`export` before it is accepted and not needed, 2026-11-15) (no function-cell shortcut).

Run from this directory. A port is any directory holding `cells.ts` (and optionally `shell.ts`,
`foreign.d.ts`, `foreign.runtime.ts`, `MAP.md`); `ports/` does not exist until the porting work
creates it, so every fixture directory doubles as an example port, e.g.
`bun report.ts fixtures/accept-ref`.

```
bun check.ts  ports/<name> [--json]                         # type check + lint; exit 1 on any error
bun run.ts    ports/<name> [--order forward|reverse] [--json] [--settle-ms 5000]
bun run.ts    ports/<name> --bench <cell> [--n <k>]         # median ms of k (default 100) direct calls of one cell
bun report.ts ports/<name> [--json]                         # check + run(forward) + run(reverse) as one table
bun fixtures.ts [fixture-name]                              # the fixture suite
```

`fixtures.ts` output on 2026-11-14 after the v1 changes, last line:

```
55/55 fixtures pass; 41 lint/injection rules registered, 41 with a reject fixture; 0 failure(s)
```

Dependencies are in this directory's `package.json`: `@observablehq/runtime` 6.1.0 and
`typescript` 6.0.3. `bun add` failed here with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, so they were
installed with `npm install`. TypeScript is pinned to 6.x because `typescript@7.0.2` (the current
`latest`) ships the Go compiler and its main entry exposes no `createProgram`.

## Files

| file | role |
|---|---|
| `rules.ts` | rule ids. `fixtures.ts` fails if an id has neither a `fixtures/reject-<id>/` nor a reject case in the specification module |
| `analyze.ts` | syntactic pass shared by all three commands: cells, kind, outer parameters, facet (`value`/`ref`/`capability`/`foreign`), foreign declarations |
| `prelude.d.ts` | `Ref RefCell ref Action action Mut mut freeze Borrowed borrow snapshot equals Js Clock Random Fetch Log`. Brands are string-keyed properties (`__lc_mut`, `__lc_borrowed`, `__lc_ref`, `__lc_refcell`, `__lc_action`) found with `checker.getPropertyOfType` |
| `prelude.runtime.ts` | runtime half: ref stores, the write queue, `action`, identity `mut/freeze/borrow`, copying `snapshot`, structural `equals`, capabilities |
| `check.ts`, `run.ts`, `report.ts`, `fixtures.ts` | the commands |

## check

1. **Derived source.** For each cell `c` the generated tail of the file gets
   `export type __V_c = __CellValue<ReturnType<typeof c>>` (`Promise<T>`, `Generator<Y>`,
   `AsyncGenerator<Y>`, `RefCell<T>` unwrap to `T`/`Y`) and `__R_c = __RefOf<…>` (`Ref<T>` if the cell
   returns `RefCell<T>`). An untyped parameter `p` gets `: __V_p` inserted on its own line, so line
   numbers never move; a paren-less arrow `a => …` also gets parentheses. The aliases have a `__V_`
   prefix because a parameter named `count` shadows the cell `count` inside the signature. A typed
   parameter gets an assignment check `{ const __chk: Parameters<typeof c>[i] = … as __V_p }` in the
   generated tail; a diagnostic on that line is reported as `inject-type` (or `inject-ref` for a
   `Ref<…>` parameter) at the parameter's original line. `shell.ts` may write a checked cell's value
   type as `ValueOf<"cellName">` (an alias over an exported `__Cells` interface; `accept-ref-deps`).
2. **Type check.** One `ts.Program` over `prelude.d.ts`, the derived `cells.ts` and the derived
   `shell.ts`, plus two derived forms of `foreign.d.ts`: a module (`__foreign.ts`, the file with an
   `export { … }` of every name appended) that the `__F_<name>` alias of a foreign parameter reads, and
   a global file holding only its `type`/`interface` declarations at their original lines. Until v1
   `foreign.d.ts` was a global script, and a name that is also a lib global took the lib type:
   `declare const location: { readonly myHref: string }` gave `Property 'myHref' does not exist on
   type 'Location'` (`accept-foreign-libname` now passes). `strict`, `lib` es2023 + dom. Lib source files are cached
   across programs. A TypeScript diagnostic is reported with rule id `ts<code>`, e.g. `ts2339`.
3. **Lint** of `cells.ts` only, using that program's checker.

`--json` gives `{ ok, errors[], cells[{ name, file, kind, tier, inputs[{ name, facet, source }], errors }], foreign[] }`.
`kind` is `arrow | function | generator | async` (an `async function*` reports `generator`). `tier`
is computed: `ref` if the cell returns `ref(…)` or its return type is `RefCell`; `owner` if a
generator calls `borrow`; `mut-local` if it calls `mut`; otherwise `default`; `shell` for `shell.ts`.

## run

Cells are transpiled with `Bun.Transpiler({ loader: "ts" })`, written to `.build/` with an import of
`prelude.runtime.ts` prepended, and imported. `.build/` gains one directory per run and is not cleaned up; it is in `.gitignore`. One runtime variable per cell, inputs wired from the
analysed parameters (not from the stripped JS). A ref cell `count` becomes `count$ref` (calls the
cell, turns its `RefCell` into a handle with `set`/`update` and no read) and `count` (a generator
that yields the value now and once per commit). `count: Ref<number>` consumers take `count$ref`,
everything else takes `count`. `--order reverse` reverses the definition order of all variables.

Every cell is defined with an observer, so every cell is forced. `settle` waits until
`runtime._computing` is null, no observed cell is pending and no write is queued, for 5 consecutive
macrotasks, capped at `--settle-ms`; the cap is reported as `settled: false`. A generator that never
ends (an animation loop) will always hit the cap.

Write semantics of `run.ts`, exercised by `accept-ref` in both orders:

- `set`/`update` outside an action throws `Ref count: set/update called outside an action`.
- An action call at depth 0 queues its writes; they commit in a `setTimeout(0)` after the outermost
  action returns. The fixture asserts the label is still `count: 0` immediately after the call and
  `count: 1` after settling, that `label` evaluated once more, and that `increment` (depends only on
  the Ref) and `count` did not re-evaluate.
- An action called while a cell is evaluating throws `action called during a cell evaluation`
  (`reject-action-call` asserts this at run time too). "Evaluating" means the synchronous part of a
  cell function or of one generator step; the continuation of an async cell after its first `await`
  is not tracked.

Capabilities are made per consuming cell so the two orders see the same values: `random` is a
PRNG seeded by the cell name, `now` is a fake clock that returns 1, 2, 3… per read, `log` appends to
`logs` in the JSON, `fetch` is the real `fetch`, `invalidation` is the runtime's own. `foreign.d.ts`
names come from `ports/<name>/foreign.runtime.ts` (`export default { … }`); a name it does not
supply rejects with `<name> is not defined`, so a shell consumer is `shell-skip`
(`accept-foreign-unsupplied`, added by the pilot porter).

A ref cell may take dependencies, e.g. `(vars_initial: Js, decodeVars): RefCell<Vars> =>
ref(decodeVars(vars_initial))`. `accept-ref-deps` asserts, in both orders, that a `set` sticks without
re-evaluating the ref cell, and that a change to the dependency re-evaluates it once and resets the
value from the new dependency (`n=5` after `setN(5)`, then `n=20` after the seed goes 1 to 2).

Shell cells are defined and observed. A rejected shell cell whose message ends `is not defined`
(runtime 6 has no standard library, so `md`, `Inputs`, `htl` are all undefined under Bun) or names a
DOM global is `shell-skip`. A checked cell or test downstream of a skipped shell cell is `blocked`,
counted separately from failures.

`--bench` calls the cell function directly with its settled inputs, `k` times, and prints the
median. Going through the scheduler would add a `setImmediate` per iteration to every sample.

Values are compared across orders with a serializer that records typed arrays element by element,
Map/Set entries, plain objects with sorted keys, and **functions by kind only** (`function` or
`action`), so two different functions compare equal.

## report

Runs `check.ts --json` and `run.ts --json` in both orders as subprocesses and prints one table. Tier
counts for checked cells come from `check`. Shell/prose/import counts come from the first table in
`MAP.md` that has a `tier` column, when that file exists; otherwise every `shell.ts` cell counts as
`shell`. Percentages are over `default + mut-local + owner + ref + shell`. "Tests with no shell cell or
effect foreign in support" walks each test's inputs transitively through `cells.ts` and `shell.ts`.

The near miss: `list` returns `[]`, `push` calls `list.push("p")`, `test_empty` asserts the list is empty. It passes tests in one definition order and fails them in the other. As `report.ts fixtures/reject-pusher` printed it on 2026-11-14
(`check` rejects it with `mutating-method`; this is what it does if run anyway):

```
| tests passing, forward order                          | 1/1 |
| tests passing, reverse order                          | 0/1 |
| tests + non-shell values identical across orders      | no: test_empty: test pass vs fail; test_empty: status fulfilled vs rejected |
```

`accept-pusher-ref`, the same program with a ref and an action, passes `test_empty` in both orders.

## Porting a module

Moved here from `RULES.md` on 2026-11-16, text unchanged except where noted. What a cell may be
and do is the specification module's; this section is how a port is laid out and counted.

Question under test: can real lopecode modules be written in a checked, immutable-by-default
subset of TypeScript where a cell is a function and its parameters are its dependencies, and
what fraction of each module lands in each tier? Background: `plan/substrates-winter-2026.md`.

If a construct has no home in the specification, do not invent one silently: record it in the
port's `GAPS.md` (construct, cell, what you did instead).

A ported module `<name>` is a directory `tools/lang-experiment/ports/<name>/`:

- `cells.ts` checked cells; what its top level may hold is section 1 of the specification.
- `shell.ts` shell cells: same shape, ordinary TypeScript, not linted. DOM, canvas, WebGL,
  `md`, `htl`, `Inputs`, `d3`, `Plot`, timers, anything reflective.
- `foreign.d.ts` trusted signatures for imported cells and libraries (section 9 of the specification).
  Each declaration is counted as trust surface.
- `GAPS.md` constructs with no home, and every place a test assertion had to change (it should not).
- `MAP.md` one row per original cell: original name, tier, port name(s), note.

Ported forms:

- A `viewof x = Inputs.range(...)` ports as a ref cell `x` in `cells.ts` plus a shell cell
  `x_view(x: Ref<number>, Inputs)` in `shell.ts` that builds the widget and calls `x.set` inside an
  action (`fixtures/accept-ref/shell.ts`).
- A `mutable x` ports as a ref cell; each `mutable x = …` write becomes an action.
- World state read at call time (v1, after the pilot). A value such as `location.href` or
  `document.baseURI` is not a pure foreign. It is a shell source cell (`href` in `shell.ts`, which
  may be a generator that yields on change), decoded by a checked cell. A function that used to
  read it when called becomes a cell that depends on the decoded value and returns the function:
  `let linkTo = (href) => (target, opts) => ...`. Do not split a function into a checked
  half and a shell wrapper to avoid this; the dependency on the shell cell is the honest result
  and tests that depend on it count as having shell support.
- A ref whose initial value comes from the world takes it as a dependency:
  `let vars = (vars_initial: Js): RefCell<Vars> => ref(decodeVars(vars_initial))`.
- `shell.ts` may name a checked cell's value type as `ValueOf<"cellName">` (`fixtures/accept-ref-deps/shell.ts`).
- Prose cells (`md`, headings) go to `shell.ts` and are excluded from tier denominators.
- `test_*` cells are ported with their assertions unchanged. If an assertion cannot be kept,
  record it in `GAPS.md`; do not weaken it.

### Tiers (for `MAP.md`)

`default` (checked, no opt-in) · `mut-local` (uses `Mut` inside, pure outside) · `owner` ·
`ref` (a `RefCell`) · `shell` · `prose` (excluded) · `import` (an import variable; excluded).
A cell that yields `borrow` is counted in the `owner` tier.

### Checked mechanically vs by review

The rule table states, for every rule, whether `check` enforces it exactly, enforces an
approximation (say which), or leaves it to review. A port's "passes check" means only the former two.

## Rule table

*Exact* means every reject fixture fires and no counterexample is known. *Approx* gives the method and
a program that breaks the rule and passes `check`; each such program is a cell in
`fixtures/known-slips/cells.ts`, which `fixtures.ts` asserts `check` accepts. *Type* means
TypeScript reports it. *Review* means nothing mechanical.

### Files

| rule | status | how / what slips |
|---|---|---|
| only cells, `type`/`interface`, `import type` at module level | exact | `module-level`. A top-level `enum`/`namespace`/`class`/`var` is reported under its own id instead |
| a top-level `let/const` that is not a function | exact | `cell-not-function`. Follows from the 2026-11-14 cell form ("every cell is a function"); RULES.md (2026-11-14) did not name it as a separate rule |
| cell name unique across `cells.ts`/`shell.ts` | exact | `duplicate-cell`; not in RULES.md (2026-11-14), needed so injection is unambiguous |
| `shell.ts` same shape, not linted | as stated | only exported functions are cells; non-exported helpers are allowed. `shell.ts` **is** type-checked strictly, with stdlib parameters (`md`, `Inputs`, …) typed `any` |
| `GAPS.md`, `MAP.md` content | review | `MAP.md` is read by `report.ts` only for tier counts |

### Cells and injection

| rule | status | how / what slips |
|---|---|---|
| parameter must name a cell, foreign or capability | exact | `inject-unknown`. Shell cells may also take Observable stdlib names (list in `analyze.ts`) |
| plain identifier parameters | exact | `inject-pattern` for destructuring, defaults, rest. Not in RULES.md (2026-11-14); injection by name has no meaning for them |
| untyped parameter gets the cell's value type | exact | derived source, `__CellValue` |
| typed parameter assignable from the cell's value type | exact | `inject-type`; a shell cell's value is `Js` unless `foreign.d.ts` declares it (specification case S9.1, which replaced `reject-shell-js` on 2026-11-16) |
| `Ref<X>` parameter names a cell returning `RefCell<X>` | approx | `inject-ref`. Recognised by the annotation being literally `Ref<…>`; `type R = Ref<number>; (count: R)` is treated as a value parameter and fails as `inject-type` |
| free names | exact | `free-name`, by symbol: a declaration inside the cell, a prelude value, or a lib declaration whose name is on the allowlist (`URL`, `URLSearchParams` added in v1; `accept-basic`) |
| `Math.random` | exact | `banned-member`, by receiver type, so `const M = Math; M.random()` and `Math["random"]` are caught |
| no calling a cell by its module-level name | exact | `cell-by-name`; any value reference to a cell, not only calls, including a cell referring to itself |
| capabilities `now random fetch log invalidation` | exact | typed `Clock Random Fetch Log Promise<void>` |

### Immutable by default

| rule | status | how / what slips |
|---|---|---|
| member assignment, compound, `++/--` | approx | `member-write`, including destructuring targets. Allowed when the receiver or the root of the access chain is `Mut`, so a write through a Mut root reaches a value it does not own: `const out = mut({ src: o }); out.src.a = 7` (`s6`) |
| `delete` | exact | `no-delete` |
| mutating methods on Array/Map/Set/typed arrays | approx | `mutating-method`, by receiver type. Slips: `Array.prototype.push.call(xs, 3)` (`s2`); a receiver typed by a type parameter, `<T extends number[]>(xs: T) => xs.push(1)` (`s12`). Not listed by RULES.md, so not checked: `Object.defineProperty` (`s3`) |
| `Object.assign` onto an existing value | approx | `object-assign` unless the first argument is an object literal or `Mut` |
| `var class this arguments enum namespace import()` | exact | `no-var no-class no-this no-arguments no-enum no-namespace no-dynamic-import` |
| `new` only on allowed intrinsics | exact | `new-non-intrinsic` for any non-global callee (a local alias of `Map` is rejected); a non-allowlisted global such as `Date` is reported as `free-name` |
| `any`, casts other than `as const`, `!`, `@ts-ignore`/`@ts-expect-error` | exact | `no-any no-cast no-non-null no-ts-ignore` (`@ts-nocheck` too); the last is a text match, so the string in a string literal also fires |
| a captured `let` assigned only from a non-escaping local helper (v1) | exact for `let` | `let-capture`: every function between the assignment and the `let` must be bound to a local `const` or be a function declaration, and every reference to its name in the file must be the callee of a call. `accept-let-helper` (recursive-descent parser sharing `let i`) passes; `reject-let-capture` rejects a returned helper, an inline callback to `forEach`, a helper put in a literal, and an inner helper of an outer function that escapes. Destructured `let [n] = …` is covered. A parameter is also a rebindable local and is not covered: `(o) => { const f = () => { o = … } }` (`s7`) |
| `===` on two non-primitive operands | exact | `strict-eq-object`. Applies to `==`/`!=` too. `unknown`/`Js` counts as non-primitive, so `x === y` on two `Js` values is rejected |

### Opt-in 1: Mut

| rule | status | how / what slips |
|---|---|---|
| `mut(…)` bound to a local `const` | exact | `mut-bind` |
| member writes and mutating methods allowed on `Mut` | exact | `accept-mut` |
| not returned, yielded, aliased, placed in a literal, passed to a non-`Mut` parameter | approx | `mut-escape`, on references to a `Mut`-typed binding, looking through parens, `?:`, `&&`/`\|\|`/`??`, casts. Slips: a method whose result aliases the buffer, `return out.subarray(0)` (`s4`). Spread (`[...out]`) is treated as a copy and allowed |
| not captured by a nested function | exact | `mut-capture` |
| not used after `freeze(out)` | approx | `mut-after-freeze`: any reference textually after the first `freeze(out)`. Slips: a loop where the write precedes the freeze in the text and follows it in time (`s10`). A freeze in one branch also rejects uses in a sibling branch |
| `freeze(out)` has type `T` | type | `prelude.d.ts` |

### Opt-in 2: owner cells

| rule | status | how / what slips |
|---|---|---|
| `yield borrow(x)` in a generator cell | exact | `borrow-placement`: `borrow` anywhere else, including `const b = borrow(x); yield b` |
| `Borrowed<T>` is read-only | exact | it is not `Mut`, so `member-write`/`mutating-method` reject writes |
| not returned, not put in a ref | approx | `borrowed-escape` on return, yield, `ref(b)`, `.set(b)`/`.update`, literal, assignment to a `let`, capture by a closure. Slips: `frames.subarray(0)` (`s8`); widening to the plain type, `const p: Float32Array = frames; return p` (`w3`). The capture and literal cases are stricter than RULES.md, which bans only "hold", "return", "put in a ref" |
| not held across `await` | approx | `borrowed-await`: a reference textually after an `await` in the same function. Slips: a loop that reads before the `await` in the text (`s9`) |
| `snapshot(b)` copies | runtime | `structuredClone`, or `.slice()` for typed arrays |

### Refs and actions

| rule | status | how / what slips |
|---|---|---|
| `RefCell` declared by returning `ref(…)` | exact | `ref-placement`: `ref` only as the concise body or a return statement directly in the body of a sync, non-generator cell. `if (x) return ref(0)` and `x ? ref(0) : ref(1)` are rejected because `run.ts` decides which cells are ref cells from that same shape, before any code runs |
| a `Ref` parameter is not a value dependency | runtime | `accept-ref`: `increment` does not re-evaluate when `count` changes |
| `Ref<T>` has no read | type | `ts2339`; lite gives `no-member` (specification case S6.4, which replaced `reject-ref-read` on 2026-11-16) |
| writes only lexically inside `action(…)` | approx | `ref-write`, on a receiver whose type has the Ref brand. Slips: widening drops the brand, `const r: { set(v: number): void } = c; r.set(1)` (`w1`). `run.ts` still throws `set/update called outside an action` for it |
| an `Action` called only inside `action(…)` | approx | `action-call`, on a callee whose type has the Action brand. Slips: `const f: () => void = a; f()` (`w2`). `run.ts` still throws `action called during a cell evaluation` for it |
| an `Action` passed only to a parameter typed `Action` | approx | `action-pass` on a direct argument whose contextual type has no Action brand. Slips: an Action inside a record passed to an untyped parameter, `call({ a })` (`s11`) |
| `viewof` → ref + `x_view(x: Ref<…>, Inputs)` shell cell; `mutable` writes → actions | review | `accept-ref/shell.ts` shows the shape |

### Foreign values, prose, tests

| rule | status | how / what slips |
|---|---|---|
| `/** pure */` or `/** effect */` on each declaration | exact | `foreign-unmarked`; `type`/`interface` declarations are not trust surface and need no marker |
| a checked cell takes only `pure` foreigns | exact | `foreign-effect`, also when the foreign declaration names a shell cell |
| decoders narrow `Js` and build a new value | review | `accept-foreign` has one |
| prose cells go to `shell.ts` | review | `report.ts` can only tell prose from shell through `MAP.md` |
| test assertions unchanged | review | |

## RULES.md points that needed a decision (2026-11-14)

- `async function*` is not in the list of cell forms. It is accepted and reported as kind `generator`.
- "Capabilities" includes `invalidation` but gives it no type name; it is `Promise<void>` (`Invalidation`).
- "Not `Math.random`" is enforced; `Object.defineProperty`, `Object.setPrototypeOf`, `Reflect` are
  not listed. `Reflect` is a free name and rejected; the other two pass (`s3`).
- `shell.ts` is "not linted" but its cells still take injected parameters; it is type-checked and
  its parameters must still resolve.
- "Mut may not be aliased to another binding" read as: any `Mut` reference used as a variable
  initialiser or assignment right-hand side.
- "Used after freeze" and "held across an await" are temporal; both are checked by source position.
- v1 `let` helpers: "every use of its name is a direct call" is read strictly, so `typeof helper` or
  `helper.name` also counts as an escape.
