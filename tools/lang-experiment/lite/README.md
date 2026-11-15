# lite: a small checker for the cell language

A prototype checker for the language in `../RULES.md` that does not use TypeScript. It exists to
measure two things: how small a checker for this subset can be, and how much of the three ports it
handles. The existing harness (`bun check.ts`, TypeScript's checker plus lint passes) is the oracle
it is measured against. All numbers below are from `bun lite/oracle.ts`, run 2026-11-14 on this
machine; rerun it to refresh them.

Run from `tools/lang-experiment`, after `npm install` in `lite/`:

```
bun lite/check.ts ports/suminagashi            # one line per error, then a summary
bun lite/check.ts ports/suminagashi --json     # per-cell status, errors, inferred value type
bun lite/check.ts ports/suminagashi --unchecked-index   # index reads are T, as the oracle does
bun lite/oracle.ts                             # every table in this file (~2 min; --no-mutants skips the mutants)
                                               # mutants go in lite/.oracle-scratch, or $LITE_SCRATCH
```

```
$ bun lite/check.ts ports/glpk-canonicalization --unchecked-index
144 cells: ok 144, rejected 0, unsupported 0, blocked 0; 0 module error(s); 45 ms
```

Every cell gets one of four statuses. `unsupported` means lite met a construct it does not model;
it never returns `ok` for such a cell. `blocked` means a cell it depends on has no usable type
(rejected with no return annotation, or unsupported).

The parser is acorn 8.19.0 with `@sveltejs/acorn-typescript` 1.0.13, installed with npm in this
directory (`bun add` fails here with a certificate error).

## How it is built

| file | lines (as `oracle.ts` counts them, `wc -l` + 1) | does |
|---|---|---|
| `parse.ts` | 58 | acorn + TS plugin; comment and line lookup |
| `types.ts` | 147 | the type representation, unions, substitution, printing |
| `intrinsics.ts` | 339 | the standard library as `.d.ts` text, plus the prelude (`mut`, `freeze`, `ref`, …) |
| `registry.ts` | 438 | loads declarations (intrinsics, `foreign.d.ts`, type aliases in `cells.ts`); subtyping and unification |
| `infer.ts` | 1317 | bidirectional inference and checking of expressions and statements, narrowing, generics, the write rules |
| `own.ts` | 362 | the Mut / Borrowed / Ref rules, on top of the facts `infer.ts` records |
| `core.ts` | 287 | `checkSources`: syntax bans, cell graph, injection, module rules, `compile`'s type; no file access |
| `island.ts` | 66 | the cells a `compile` call runs, shared by checker and runner |
| `check.ts` | 33 | reads a port directory into `checkSources`; the CLI |
| `oracle.ts` | 272 | comparison against `bun check.ts` |

The standard library is written as declarations, not code. Effects are JSDoc tags on the members,
read by `own.ts`:

```ts
// intrinsics.ts:22 and :27, inside the typed-array template
/** @mutates */ set(src: ArrayLike<number>, offset?: number): void;
/** @view */ subarray(start?: number, end?: number): ${N};
```

The tag must come before the member: `registry.ts` reads only the comment that ends right before
it. A tag written after a member silently lands on the next one.

`@mutates` marks a member that writes its receiver, `@fresh` one that returns a new value `mut()`
may take, `@view` one whose result aliases the receiver, `@retains` one that keeps its argument,
`@banned` one RULES forbids (`Math.random`, `Object.defineProperty`, …). Adding an intrinsic is a
line of `.d.ts`.

Type checking is one pass per function with a flow map for narrowing, keyed by binding and access
path (`#12.args[0]`). Generics are rank-1: type parameters are inferred from arguments, then from
the expected return type, and lambdas whose parameter types depend on an unsolved variable are
checked after the others. Constraints (`<T extends X>`) are unsupported.

The ownership rules run after inference, on the recorded facts (the type at each node, the binding
each identifier resolves to, the signature each call picked). Each identifier whose type is
`Mut<…>` or `Borrowed<…>` must sit in an allowed position; anything else is an error. That is
default-deny, so a new kind of expression is an escape until it is whitelisted. Use-after-freeze
and Borrowed-after-await are a forward dataflow over each function, iterated to a fixpoint over
loops.

## Results

### Ports

| port | cells | mode | ok | rejected | unsupported |
|---|---|---|---|---|---|
| glpk-canonicalization | 144 | strict index | 138 | 6 | 0 |
| glpk-canonicalization | 144 | `--unchecked-index` | 144 | 0 | 0 |
| lopepage-urls | 25 | strict index | 22 | 3 | 0 |
| lopepage-urls | 25 | `--unchecked-index` | 25 | 0 | 0 |
| suminagashi | 38 | strict index | 35 | 3 | 0 |
| suminagashi | 38 | `--unchecked-index` | 38 | 0 | 0 |

Lite counts cells of `cells.ts` only; the oracle's totals (160, 42, 86) also count `shell.ts`.
The oracle accepts all three ports.

The two modes differ in one rule. In the default mode `xs[i]` has type `T | undefined`, as in
TypeScript's `noUncheckedIndexedAccess`; with `--unchecked-index` it is `T`, as in the oracle's
configuration. All 12 strict-mode rejections are of that kind, e.g.
`constantsToRHSFn [possibly-undefined] MathNode | undefined is not assignable to MathNode`
(15 such diagnostics on 14 lines in that one cell). Two existing accept fixtures also flip: `accept-let-helper`
(`src[i] >= "0"`) and `accept-mut` (`blur`, `test_blur`). RULES does not say which mode is
intended; the ports were written against the oracle, so they pass only the unchecked one.

### Existing fixtures

52 of the 54 reject/accept fixtures (known-slips excluded) get the oracle's verdict for the same
rule under `--unchecked-index`. TypeScript diagnostics (`ts2339`, …) and lite's type rules
(`type`, `no-member`, `possibly-undefined`, `arity`, …) count as the same reason. The two that
do not:

- `reject-mut-capture`: lite accepts it, deliberately.
  ```ts
  let a = () => { const out = mut([0]); const f = () => out[0]; return f(); };
  ```
  `f` is a local helper that is only ever called, so lite treats the call as a use of `out` at the
  call site and checks it there (a helper called after `freeze(out)` is rejected, see
  `lite-mut/reject-mut-capture`). The oracle forbids every capture.
- `reject-no-ts-ignore`: lite rejects with `no-ts-ignore` and also the type error the comment was
  hiding. Same verdict, one more reason.

`known-slips` holds 13 slip cells (and 4 support cells) the oracle accepts and RULES forbids. Lite rejects 12 of them in
both modes. It accepts `s7`:

```ts
let s7 = (o) => { const f = () => { o = { a: 0, xs: [] }; }; f(); return 1; };
```

The parameter follows the same helper rule as a `let`, and `f` is only called, so the
reassignment is seen in order. Whether RULES means parameters to be stricter than `let`s is a
question for RULES, not something lite can decide.

`bun fixtures.ts` still reports `55/55 fixtures pass` with the lite fixtures in place: they sit
one directory deeper (`fixtures/lite-mut/<case>/`), which `fixtures.ts` does not scan.

### lite fixtures

25 fixture directories under `fixtures/lite-mut/`, `fixtures/lite-types/`, `fixtures/lite-jsx/`, `fixtures/lite-compile/` and `fixtures/lite-game/`, 25 pass (the compile and game ones are described in the SoundScript section) (the two JSX ones are described in the JSX section, and `reject-generics` in `NOTES-reflection.md`). The table below is the 18 from before. A cell
named `ok*` must be `ok`, `bad*` must be rejected, `uns*` must be unsupported, and the set of
rules reported must equal the one in that group's `lite-expect.json`.

| fixture | covers | oracle rejects bad* | oracle rejects ok* |
|---|---|---|---|
| `reject-mut-not-fresh` | `mut(param)`, `mut(binding)`, `mut(frozen)`, `mut(new Float32Array(buf))`, `mut(t.subarray())`; fresh: literals, spreads, `Array.from`, `slice`, `new Map`, `structuredClone`, `map` | 0/5 | 0/3 |
| `reject-mut-deep-write` | `m.a.b = …`, `m.xs[0] = …`, `m.xs.push`, `m.a.b++` | 0/4 | 0/1 |
| `reject-mut-freeze-flow` | freeze inside a loop then write on the back-edge, `while`, one branch, twice, inside one expression; per-iteration Mut, break, freeze in both branches | 3/5 | 1/4 |
| `reject-mut-view` | `subarray` kept, returned, in a literal; `.buffer` kept; `fill`/`Map.set` result kept; `values()` iterator kept; consumed by `set`, spread, `for…of`, `Array.from` | 2/7 | 0/4 |
| `reject-mut-escape` | return, alias, `let` assign, literal, `ref(m)`, `Promise.resolve(m)`, `<T>(v:T)=>v`, plain parameter, `push` into another Mut, `yield`, callback third argument; reads, `JSON.stringify`, `Mut<…>` parameter | 8/11 | 1/2 |
| `reject-mut-capture` | returned, callback, stored closure, via a second helper, helper called after freeze, freeze inside helper | 6/6 | 1/1 |
| `reject-mut-freeze-param` | `freeze` of a `Mut<…>` parameter | 0/1 | 0/1 |
| `reject-borrowed` | view of a Borrowed, use after `await` on the next iteration, Borrowed injected where a plain type is declared | 0/3 | 0/1 |
| `unsupported-control` | `switch` and `try/finally` in a function holding a Mut | 0/2 | - |
| `accept-mut-subarray-consumed`, `accept-mut-helpers-loops` | subarray consumed at once; helpers and per-iteration Muts | - | 1/4 |
| `reject-cycle` | two cells depending on each other (the oracle reports `ts7022` and `inject-type`, not `cycle`) | 2/2 | - |
| `reject-type-argument`, `-record`, `-return`, `-narrowing`, `-generic`, `-index` | wrong argument, arity, missing/extra field, bad return, falling off the end, unnarrowed union, every narrowing form, generic inference, index reads | 21/21 (index: 0/2) | 0/14 |

The type fixtures are where lite and the oracle agree; the ownership fixtures are where lite is
stricter. The `oracle rejects ok*` column is the other direction, and every entry in it is listed
in the next section.

### Lite accepts, oracle rejects

Over 497 cells (fixtures and ports) and 173 mutants, 5 cells, the same 5 in both modes:

| cell | oracle | why lite accepts |
|---|---|---|
| `reject-mut-capture:a`, `accept-mut-helpers-loops:scaled`, `lite-mut/reject-mut-capture:ok_helper` | `mut-capture` | local helper, only called (above) |
| `reject-mut-escape:ok_reads` | `mut-escape` at 25:28 and 26:27 | those are `JSON.stringify(out)` and `Array.from(out)`: intrinsic parameters not marked `@retains` may take a Mut |
| `reject-mut-freeze-flow:ok_branches_both_freeze` | `mut-after-freeze` at 31:3 and 32:17 | both follow `if (flag) { …; return freeze(out); }` on line 30, which they cannot run after; lite's freeze analysis follows the return, the oracle's goes by text order |

Each is a place lite allows more than the oracle by design. None is a type error the oracle found
and lite missed.

### Oracle accepts, lite rejects

With `--unchecked-index`, 37 cells, none of them in a port: the 12 known slips lite catches,
and 25 `bad*`/`uns*` cells of the lite fixtures that the oracle lets through. By rule, slips
included: 6 `mut-view`, 5 `mut-deep-write`, 5 `mut-not-fresh`, 3 `borrowed-escape`, 3
`mut-after-freeze`, 2 `borrowed-await`, 2 `mut-escape`, 2 unsupported, and one each of nine
others (`oracle.ts` prints the full grouping). In the default mode add the 18 cells rejected for
index reads.

### Mutants

`oracle.ts` makes one-edit copies of each port (12 per operator per port, evenly spaced through
the file) and compares the verdict on the edited cell, lite in `--unchecked-index` mode.

| operator | mutants | oracle rejects | lite rejects | lite unsupported | lite ok, oracle rejects | oracle ok, lite rejects |
|---|---|---|---|---|---|---|
| drop-freeze | 11 | 11 | 11 | 0 | 0 | 0 |
| drop-guard | 28 | 7 | 7 | 0 | 0 | 0 |
| drop-last-arg | 36 | 30 | 30 | 0 | 0 | 0 |
| mut-of-binding | 17 | 17 | 17 | 0 | 0 | 0 |
| null-to-undefined | 9 | 9 | 9 | 0 | 0 | 0 |
| number-to-string | 36 | 22 | 24 | 0 | 0 | 2 |
| rename-property | 36 | 35 | 23 | 12 | 0 | 0 |

The two false rejections are both unary minus on a string (`-"0"`, `-"1"`), which TypeScript
allows and lite does not. The 12 unsupported mutants rename a member of an intrinsic
(`.lengthX`, `.sliceX`, `.subarrayX`): lite's standard library is partial, so an unknown member on
an intrinsic is `unsupported`, not `no-member`. That keeps a member lite forgot to declare from
being reported as the author's mistake. It costs those 12 a verdict.

The first run of the mutants (same day) found three real gaps, fixed before the run above: `in`
on a possibly-null value was accepted (TypeScript `ts18047`), a comparison between types with no
common value was accepted (`ts2367`), and `x["0"]` on an array was unsupported and did not share
narrowing with `x[0]`.

### Size and speed

| | |
|---|---|
| source, excluding `oracle.ts` | 2893 lines (as counted above) |
| `bun build --minify --target bun lite/check.ts` | 322.1 KiB |
| the same with acorn and acorn-typescript external | 88.5 KiB |

| port | `bun lite/check.ts` | `bun check.ts` | lite, in process |
|---|---|---|---|
| glpk-canonicalization | 63 ms | 325 ms | 13 ms |
| lopepage-urls | 56 ms | 290 ms | 6 ms |
| suminagashi | 59 ms | 342 ms | 10 ms |

Wall times are the median of 5 whole-process runs including bun start-up; most of lite's 56–63 ms
is start-up. The oracle number checks `shell.ts` as well.

## Exact and approximate, per rule

"Exact" means: on every fixture and mutant above, the rule fires where the oracle's does, and the
implementation does not knowingly accept a case the oracle rejects. It is not a proof.

| rule | status | how it differs |
|---|---|---|
| syntax bans (`no-this`, `no-class`, `no-any`, `no-non-null`, `no-cast`, `no-var`, `no-enum`, `no-namespace`, `no-arguments`, `no-dynamic-import`, `no-delete`, `no-ts-ignore`) | exact | AST node checks |
| `module-level`, `cell-not-function`, `duplicate-cell` | exact | |
| `cycle` | same verdict | the oracle has no such rule; it rejects a cycle as `ts7022` + `inject-type` (`lite-types/reject-cycle`) |
| `inject-pattern`, `inject-unknown`, `inject-type`, `inject-ref`, `foreign-effect`, `foreign-unmarked`, `free-name`, `cell-by-name` | exact | |
| `member-write`, `mutating-method`, `object-assign`, `strict-eq-object`, `banned-member`, `new-non-intrinsic` | exact | `mutating-method` relies on the `@mutates` tags being complete |
| `action-call`, `action-pass`, `ref-write`, `ref-placement`, `borrow-placement` | exact | |
| `let-capture` | approximate | a local helper that is only called may reassign (`s7`) |
| `mut-bind`, `mut-escape` | stricter in places, looser in one | default-deny by position; looser: a Mut may go to an intrinsic parameter not marked `@retains` |
| `mut-capture` | looser | local helpers that are only called may capture |
| `mut-after-freeze` | stricter | flow-sensitive over branches and loop back-edges |
| `mut-not-fresh`, `mut-deep-write`, `mut-view`, `mut-freeze-param` | stricter | the oracle has no equivalent (known slips s4, s6) |
| `borrowed-escape`, `borrowed-await` | stricter | views of a Borrowed; loop back-edges (s8, s9) |
| type checking | approximate | see below |

Type checking differs from TypeScript in these known ways, each seen in a fixture, a port or a
mutant:

- index reads are `T | undefined` unless `--unchecked-index`;
- destructuring a `T | undefined` (`const { n, xy } = curves[k]` in suminagashi, strict mode)
  reports the possibly-undefined error and then a spurious follow-on
  `string is not assignable to number`; the cell's verdict is right, the second message is not.
  Its cause was not investigated;
- a nested destructuring default (`const { a: { b = 2 } = {} } = …`) is rejected, which
  TypeScript accepts (found by the probe below);
- `const f: (() => number) | undefined = undefined; f?.()` is accepted; TypeScript narrows `f` to
  `never` and rejects the call (`ts2349`). The code is safe at run time;
- unary `-`/`+` on a string is rejected;
- an unknown member of an intrinsic is unsupported, not an error;
- `const t: string | undefined = "x"` keeps the declared type (TypeScript narrows it to `string`;
  found while writing `reject-mut-deep-write`, where TypeScript then rejected a later
  `m.tag = undefined`);
- `a ?? b`, `a || b`, `a && b` drop the right side when the left decides every value, as
  TypeScript does; `xs.filter(Boolean)` does not remove `null`/`undefined` from the element type
  (TypeScript gave `RuleFn[]` for one such call in a probe; lite would give the unfiltered type).

## Unsupported

The cell becomes `unsupported` on: `switch`, labels and `instanceof` anywhere, `try … finally`
in a function that holds a Mut or Borrowed, type parameter
constraints, destructuring assignment (`[a, b] = …`), `Object.assign` outside the forms RULES
allows, unknown members of intrinsics, and any type syntax `registry.ts` does not convert
(checked 2026-11-14: `keyof`, mapped, conditional, template literal and intersection types are
each reported as unsupported in the cell that uses them, and a cell typed through such an alias
from another cell is `blocked`). A problem converting
`foreign.d.ts` is a module-level `unsupported` error. None of these occur in the three ports
in their current form.

### A probe outside the ports' vocabulary

Every check above uses syntax the ports and fixtures already contain. On 2026-11-14 one scratch
port of 21 cells tried constructs that appear in neither, through both checkers: `for…in`,
`do…while`, a getter, a computed key, a tagged template, `satisfies`, `as const`, a comma
expression, `yield*`, intersection and index-signature types, `void 0`, nested destructuring
with a default, overload signatures, an optional call, regex flags, and three of them with a
type error added. Lite returned 7 ok, 3 rejected, 9 unsupported, 2 blocked. Before a fix made
that day, the two cells typed through the intersection alias were rejected with a wrong
`no-member` instead of blocked. Leaving out the unsupported and blocked cells, two verdicts
differ from the oracle's, both in the list of type differences above: the nested default (lite
rejects) and the optional call (lite accepts, the one cell where lite says ok and the oracle
reports an error).
The `never silently accept` property is tested on these constructs and the ones the ports,
fixtures and mutants contain, and nothing wider.

## JSX in checked cells: a proof (2026-11-14)

Question: can suminagashi's widgets and its canvas pointer handling be checked cells, written in
JSX, instead of shell cells? Yes for 7 of the 8 widgets and the event half of `canvas`; not
`params_view`, and the WebGL half of `canvas` was not tried. Run it with:

```
bun lite/jsx/proof.ts      # lite-checks fixtures/lite-jsx/accept-suminagashi-controls/cells.tsx, runs it, drives it
                           # the lowered cells.ts goes in lite/.jsx-build/ (git-ignored by lite/.gitignore)
```

```
lite: 43 cells: ok 43, rejected 0, unsupported 0, blocked 0
pass  clicking the blow radio sets tool
pass  the canvas is the same DOM node after the handler changed
pass  two pointerdowns before a settle advance turn by 2
pass  a touch less than 2 s after the finish is ignored
pass  a touch more than 2 s after the finish empties the tray
pass  the canvas takes the new height and is still the same node
pass  checked test test_two_downs_take_two_turns passes
...
evaluations: canvas_view 4, pointerDown 3, step 1, app 4; canvas DOM nodes created: 1
all checks pass
```

(20 checks; the listing shows 7.) The node-identity checks can fail: with the renderer's patch step
disabled, both fail and the run creates 15 canvas nodes, not 1.

**Two versions, one measurement between them.** The first version had a handler cell that depended on
`tool`, `finished` and the turn, with `turn`, `pointer` and `finished` as three refs. Adding the check
"two pointerdowns before a settle advance turn by 2" to it failed:

```
FAIL  two pointerdowns before a settle advance turn by 2  (got {"before":2,"after":3})
evaluations: canvas_view 8, pointerDown 7, app 8; canvas DOM nodes created: 1
```

Both events read the turn the handler was built with. The current version keeps `turn`, `pointer`,
`finished` and the reset counter in one ref, `canvasState`, and every handler is
`canvasState.update((s) => step(s, event))`, with `step` a pure checked function
`(s: Canvas, e: Ev) => Canvas`. `update` hands `step` the committed state, so the second event sees the
first one's write, and the check passes. `turn`, `pointer`, `finished` and `reset` are now cells
derived from `canvasState`. This is a state monad without the syntax: `Ref.update` is its bind,
and `step` is the only code that decides anything. Because `step` is a pure function, two checked
tests (`test_two_downs_take_two_turns`, `test_finished_waits_two_seconds`) cover the event logic with
no DOM or runtime. lite checks `step` like any other cell: with `fluid` changed to `String(fluid)` it
reports `string is not assignable to number` at that line. The handler is now rebuilt only when
`tool` changes (`pointerDown` 7 evaluations to 3, over a run that also has more events).

**How it works.** A JSX element in a checked cell is a value (`Elem`), not DOM. lite checks
`<tag a={x}>` against the props interface `IntrinsicElements[tag]` (`JSX_DECLS` in
`intrinsics.ts`, 39 lines), so a typo in an attribute is `excess-property`, and `<C …/>` as a
call of the component `C` with one props object (`infer.ts` `jsx()`, 43 lines). Event props are
`Action`s and receive data (`PointerData`, the input's value as a string), never a DOM `Event`.
At run time `lite/jsx/lower.ts` (58 lines) rewrites the JSX to `h(...)` calls and leaves the types in
place, so the existing harness (`run.ts` `loadPort`) runs the result. `h.ts` (12 lines) builds frozen
element values. `render.ts` (56 lines; 75 after the 2026-11-14 memoisation work below), which is
unchecked, patches DOM nodes in place when the tag is unchanged, keeps one listener per event, and
swaps the Action behind it.

**What moved from `ports/suminagashi/shell.ts` into checked cells.** Seven of the eight `*_view` widget cells
(all but `params_view`) and the event half of `canvas`. The handler cell `pointerDown` depends on `tool`
and `step` and is rebuilt when `tool` changes; the canvas element is described again, and the
renderer keeps the node. So the handlers no longer need the mirror box. Only `live_turn`
goes (read only by `canvas`, `shell.ts:128`): `mainLoop`, a per-frame generator that stays in the
shell, still reads `live.pointer` and `live.finished` (`shell.ts:789,824,831,839`), so `live`,
`live_pointer` and `live_finished` stay. That is 8 of the shell's 31 non-prose cells (7 widgets and
`live_turn`), plus the event half of `canvas`. This is a fixture, not an edit of the port: `width`
and `sequence` are stand-ins, and the WebGL half of `canvas` was not attempted.

**`fixtures/lite-jsx/reject-jsx`**: 11 cells rejected; `ok_all` and the 5 support cells accepted. A string where a number is
declared, a misspelled event prop, an undeclared element, a handler that is not an `Action`, a handler
with the wrong argument type, wrong and missing component props, a component that does not return
`Elem`, a `Mut` placed in JSX (`mut-escape`, "placed in JSX"), an undeclared component
(`free-name`), an object as a child. `ok_all` covers a fragment, `map` into children, a
conditional child and an inline `action`.

**Gaps it found.**
- **Closed by the reducer version.** The first version needed an alias cell (`turnNow = (turn) => turn`)
  because a handler wanted the value and the Ref of one cell, and it had the race measured above
  (the shell's mirror box has the same race, `ports/suminagashi/GAPS.md:117`). It also emptied a
  finished tray at once, where the shell waits 2 s (`performance.now() - finished.at > 2000`). In
  `step` the guard reads the event's own timestamp, `e.d.t - s.finished.at > 2000`, so no clock
  capability is needed.
- **State in several refs is still not atomic.** `update` is atomic over one ref. The reducer works
  because the four values were merged into one. RULES has no way to update two refs in one step.
- **`tool` is read from the handler's last rebuild.** It is a separate widget ref. A tool change and
  a pointerdown before the next recompute would use the old tool. Not tested.
- **The handler differs from the shell's in four places.** The shell calls
  `canvas.setPointerCapture`; neither the fixture nor `render.ts` does, which is a renderer
  concern. The shell sizes the canvas as `width * devicePixelRatio`; the fixture uses `width`.
  At turn 0 with blow or stylus the shell picks `sequence[-1]`, which is `undefined`
  (`shell.ts:130`); the fixture wraps to `sequence[2]`. Emptying the tray clears the pointer in the
  fixture; the port's `resetPicture` keeps it (`ports/suminagashi/cells.ts:73-77`).
- **`params_view` is not ported.** It builds 19 ranges from the keys of `defaults`, which needs a
  typed mapping over a record's keys (`keyof`, missing, see `NOTES-reflection.md`).
- **The event decoders are trust surface.** The six event props are decoded in `render.ts`, which
  is not checked.
- **No TypeScript cross-check.** The oracle harness reads only `cells.ts`, so `oracle.ts` reports
  the two JSX fixtures as `n/a (.tsx)`. lite's JSX rules have been compared with nothing.
- **Parsing.** JSX is parsed only in a `cells.tsx` (`parse(src, { jsx: true })`). In a `.ts`, `<T>(x)`
  would otherwise be read as an element. The three ports and every `.ts` fixture are unchanged
  (`bun lite/oracle.ts --no-mutants`, 2026-11-14: 21/21 lite fixtures pass, ports as in the table above).

## In the browser: the SoundScript notebook (2026-11-14)

`notebook/lite-cells-tutorial.html` (title "SoundScript: Sound Dataflow Language"; the file name and
the module id `@tomlarkworthy/lite-cells-tutorial` were kept) checks and runs cells in the page, from
`file://`, with no network. It is generated from `notebook/tutorial.ojs` and `notebook/examples/`,
and those are the source until someone saves an edit from the browser; after that the HTML is, and
`--force` would discard the edit:

```
bun lite/notebook/build.ts --force   # OVERWRITES the HTML; bundle browser/entry.ts, compile notebook/tutorial.ojs, splice into quick_start.html
bun lite/notebook/verify.ts          # headless Chromium, every non-file request aborted
bun lite/browser/selftest.ts         # the browser runner against run.ts, cell by cell
bun lite/jsx/proof.ts --browser      # the 20 JSX checks, run through the browser runner
```

What had to change to get there:

- `checkPort` read files, so the checker moved to `core.ts` as `checkSources({cells, tsx, foreign,
  shell})`; `check.ts` is now the file-reading wrapper.
- `run.ts` needs TypeScript (`analyze.ts`) and `Bun.Transpiler`, neither of which ships to a browser.
  `browser/erase.ts` (49 lines) erases types over the acorn-typescript tree and `browser/run.ts`
  (263 lines) defines the cells in a private `@observablehq/runtime` with the existing
  `prelude.runtime.ts`, and lists what it defined (`program.variables`). It takes
  `cells.ts`/`cells.tsx` only, no shell or foreign.
- Checked against the harness by `selftest.ts`: 111 cells across the ports and `accept-*` fixtures
  compared, 0 differences; 149 skipped because they depend on a shell or foreign cell.
  `proof.ts --browser`: 20/20.

### compile: an island of cells as a typed function on a worker pool

`compile({ inputs, refs, outputs, options: { runtime: pool } })`, with three literal lists of cell
names, returns `(args: { <inputs> }) => Promise<{ <outputs> }>`, typed from the cells' inferred
types. `compile` and `pool` are new capabilities (`intrinsics.ts`); `island.ts` (66 lines) computes the
island, the cells upstream of the outputs cut at inputs and refs, for both the checker and the runner;
`core.ts` types each call through a hook in `infer.ts` and orders the named cells before the caller.
The runner makes each `refs` cell a hidden input of the calling cell, so a change to one returns a new
function, and refuses an island the checker did not accept. `browser/workers.ts` (109 lines) runs the
island from the erased module source, in-thread or in one page-wide pool of classic blob workers
(`min(8, hardwareConcurrency - 1)`), transfers typed-array outputs, and drops queued jobs of a
superseded function. `Promise.all` over an array was added to the intrinsics for the example.

```
fixtures/lite-compile/accept-compile    13/13 ok (the notebook's section 7 example)
fixtures/lite-compile/reject-compile    10 bad_* rejected, 1 uns_* unsupported (oracle.ts counts
                                        the two together as 11/11), 4 ok_* ok;
                                        rules compile-island, compile-boundary, compile-options, type
bun lite/oracle.ts --no-mutants         52/54 existing fixtures, 23/23 lite fixtures (both .tsx: oracle n/a)
bun fixtures.ts                         55/55
```

The type is lite's alone: in TypeScript it is `Pick<C, I> => Promise<Pick<C, O>>` over a map `C`
of cell types that nothing generates yet, so the oracle cannot check it.

Mandelbrot island, 640x420, headless Chromium on this machine (hardwareConcurrency 18, pool 8),
median of 3 after warm-up, `bun lite/notebook/probe-pool.ts`. `rows` writes RGBA through a cosine
palette on the smooth iteration count (escape radius 16, interior black, square pixels); it was
greyscale, one byte per pixel, until Tom's annotation "this Mandelbrot is not very colorful".
Measured 2026-11-14 after that change:

```
maxIter   bands   main thread   pool
 600        8        65 ms      17 ms
 600       32        64 ms      10 ms
2000        8       196 ms      56 ms
2000       32       196 ms      30 ms
```

The greyscale version measured 54 / 17, 55 / 8, 180 / 55 and 179 / 27 ms on the same rows. Until
the same day `probe-pool.ts` replaced `pool.size * 4` to set the band count; after the `poolSize`
cell was added that text no longer existed, so the probe now replaces `poolSize * 4`.

The notebook's own benchmark cell (32 bands, 600 iterations, 3 warm-ups, median of 7) runs while
the page loads. Three verify runs after the palette change read 62.1 / 12.1, 64.1 / 10.4 and
64.4 / 10.1 ms (main / pool); the pool figure varies by a few ms between runs. The image is
1075200 bytes and the pool's bytes equal the main thread's.

```
bundle (browser/entry.ts, minified)   361107 bytes, 102284 gzipped
notebook                              4990737 bytes (quick_start.html's stack plus the tutorial)
verify.ts                             0 error variables, 7/7 test cells and the benchmark; the pool
                                      starts from file:// and its bytes equal the main thread's;
                                      the iterations slider redraws the picture; editing a box
                                      re-checks it; Breakout plays under a real mouse and stops on
                                      pause; 6 requests aborted (katex, highlight.js, the
                                      openrouter model list, a video), none needed by the tutorial
```

### A game loop: Breakout, and subscriptions (2026-11-14)

Tom asked whether a game loop can be sound, "a generator feeding a reducer or something", then for
"a minimal breakout" in the tutorial. It is section 9, `notebook/examples/09-breakout.tsx` (21
cells), copied to `fixtures/lite-game/accept-breakout`; `verify.ts` fails if the copies differ.

`step(world, event)` is the game; `tick`, `aim` and `reset` are actions that each call it once.
A generator cannot be the loop by itself, because its body would have to write the world and
writes are legal only inside `action(...)`.

**First version, replaced the same day: a `frames` capability.** `frames: Frames`, typed
`(onFrame: Action<[number]>) => void`; the runner called the action on each animation frame until
the asking cell ran again. Tom: "This seems like a tacktical fix". It was: one capability per kind
of event source, and a subscription's lifetime was the asking cell's evaluation. The review found
the consequence: after game over `step` returned the same world, `tick` still committed it
(`prelude.runtime.ts` bumps a ref's version on every write), and 10 ticks gave 10 `app`
evaluations. Stopping that would have meant the asking cell depending on `world`, which restarts
the subscription every frame.

**What replaced it: `Source<T>` and `on`.** Tom asked "is a subscription a ref over a
generator?". A ref's value cell is already a generator (`refValues` in `prelude.runtime.ts`); a
subscription runs the other way, events into an action. So:

- a generator cell (`ticks`, yielding the milliseconds since its last step) is an event source;
- a parameter typed `Source<T>` gets a handle to it, not its values, as `Ref<T>` gets a handle to
  state. `core.ts` checks the cell is a non-async generator whose yield type equals `T`
  (rule `inject-source`);
- `on(source, action)` (prelude, typed in `infer.ts` `preludeCall`) is a value; the action must be
  `Action<[T]>`;
- a cell whose value is a non-empty array of those is a subscription set. `browser/run.ts`
  `reconcile` keeps one running entry per (source handle, action) for the whole program, counted
  by the cells whose set holds it: it starts a fresh generator when the count goes from 0 to 1 and
  stops it (`return()`) when the count returns to 0. The first version kept entries per cell; the
  review found that `again = (subscriptions) => subscriptions` then ran two clocks (28 `tick`
  calls in 500 ms became 56, the game at double speed); A sync
  generator is stepped once per `requestAnimationFrame`; an async one is stepped again as soon as
  each `next()` resolves (that path is written and not exercised by any test);
- a generator cell taken as a `Source` is not stepped by the runtime at all; its variable is the
  handle (`ticks$source`). So a plain parameter naming it would receive the handle while typed as
  the yield type; the review found `peek = (ticks: number) => ticks + 1` accepted, with the value
  `"[object Object]1"`. `core.ts` now rejects a plain reader of a generator that any cell takes as
  a `Source` (`inject-source`).

`subscriptions = (ticks: Source<number>, tick, playing, over) => playing && !over ? [on(ticks, tick)] : []`.
Before memoisation (next section) it re-ran after every committed tick, because it reads `over`,
which reads `world`; `reconcile` kept the one entry (17 to 19 runs in 600 ms over three runs).
With memoisation `over` stays `false` and `subscriptions` does not run. Measured in
`test_breakout_subscriptions`, headless Chromium, 2026-11-14, with a second cell
`again = (subscriptions) => subscriptions` added to the example:

```
play 600 ms     subscriptions ran 1 time (on play), 1 ticks generator started, the ball moved
pause           no subscription, world unchanged (same object) for 300 ms
over            the example with 0 bricks: play gives no subscription, world the same object
```

The headless page delivers 26 to 34 frames a second (`test_breakout_memo`, `probe-memo.ts`), not
60; why was not looked at.

`fixtures/lite-game/reject-game`:

```
bad_loop                   [ref-write]      a generator writing the world
bad_call_tick              [action-call]    a cell calling tick(16)
bad_on_fn                  [type]           on(ticks, (dt: number) => dt), a function, not an Action
bad_on_type                [type]           an Action<[string]> on a Source<number>
bad_source_not_generator   [inject-source]  Source<W> naming a ref cell
bad_source_wrong_type      [inject-source]  Source<string> naming a generator of numbers
bad_plain_reader           [inject-source]  (ok_ticks: number), where ok_ticks is taken as a Source
ok_forward                 ok               passes the subscription set on
```

Not built:

- **EventSource and other external streams.** Tom asked whether this generalises to
  `EventSource`. The shape does: an async generator cell over a capability that opens the stream,
  taken as a `Source<Message>`, unsubscribed by `return()` when it leaves the set. Missing: the
  capability, and checker support for async generators as sources (`core.ts` records only
  non-async generators, and the checker has no `AsyncGenerator` or `for await` typing; not tried).
- Nothing makes `step` pure beyond its parameter list; a `step` that asks for `now` is accepted.
- A cell may return a `Source` handle or keep one in a record; only `on` consumes it.

The board is `div`s placed by `style` strings, because the JSX tags `intrinsics.ts` declares have
no SVG and no canvas drawing; a transparent `canvas` on top gives `onPointerMove`.

### Events and listeners replace the subscription set (2026-11-15)

Tom approved a smaller design: `Source<T>` became `Events<T>`, `Sub` became `Listener`, and a
listener is legal only as the whole value of a cell. The entry above is the record of what it
replaced.

- `const onTick = (ticks: Events<number>, tick: Action<[number]>) => on(ticks, tick)`.
  `on(...)` must be what a sync, non-generator cell returns, or a branch of a conditional it
  returns. A list, record, ref, nested function, argument, union with `null`, `on` as a value, or
  a cell taking a listener cell is `listener-placement` (`fixtures/lite-game/reject-listener`).
  `Source` in an annotation gets the hint "Source was renamed Events" (`inject-events`).
- Section 9's `ticks` takes `playing` and `over` and returns at once when the game is not
  running. Starting and stopping is the runtime re-running the cell.
- Runtime (`browser/cells.ts`, used by `stdlib/runtime.ts` and `browser/run.ts`): an events cell's
  value is a handle kept across its runs (the compiled definition is a `function`, and the
  runtime's `this` is the variable's last value). A run with other inputs replaces the generator
  inside the handle and `return()`s the old one; a run with the same inputs keeps it. The
  generator is pulled only while a listener is attached, a sync one once per animation frame.
  Each listener cell run attaches its value until that run's invalidation, which the Observable
  runtime resolves before the next run's definition is called, so one listener variable is never
  attached twice. A throwing action is logged naming the listener, action and events cells; the
  next value still runs. The reconciler, the per-set holder counts and `unlist` are gone:
  `stdlib/runtime.ts` went from 253 to 161 lines, `browser/cells.ts` from 26 to 165.
- Exactly-once tests: `stdlib/runtime.test.ts` `e1`–`e7` (bun, a real Observable Runtime, frames
  run by hand) and `soundscript/verify.ts` `listenerOnce` (headless Chromium, real frames).
- A new rule in both checkers, `ref-in-ref`: a ref's content may not contain `Ref` or `RefCell`.
  An `Action` in a ref is legal and wanted (`fixtures/lite-game/accept-action-in-ref`,
  `accept-action-stack`).

### Components and memoisation (2026-11-14)

Tom: "I would like to build things in components, but not if we are rebuilding the whole DOM each
tick", then "memoisation would be massive and something that should fall out of our language
model". It does: the checker accepts only cells that are functions of their inputs and that never
mutate a value they did not make, so a cell whose inputs are all the same values (`Object.is`) as
last time would return an equal value, and returning the last one is safe. In ordinary Observable it
is not, because a cell can mutate an object in place and keep its identity.

The DOM was already patched, not rebuilt: `render.ts` reused nodes by position and tag. What ran
every tick was the one `app` cell, which rebuilt all 24 brick elements, and the patcher's walk of the
whole tree. Changes:

- `browser/run.ts`: a plain cell's definition is memoised on its inputs (`Object.is` on each); the
  body runs only when one changed (`program.evals` counts body runs). Not memoised: a cell that
  reads a generator, because `yield borrow(buf)` lends one buffer mutated between yields; and a cell
  taking `now`, `random`, `fetch` or `log`, which can answer differently on the same inputs (the
  review found these memoised in the first version).
- `jsx/render.ts`: `patch` returns at once when the element is the same object as last time;
  children that all carry `key` are matched by tag and key, stale ones removed first so the rest do
  not move.
- `09-breakout.tsx` (21 cells): `bricks`, `ball`, `paddle`, `status` select parts of the world;
  `bricksView`, `paddleView`, `ballView` draw one each; `app` composes them.

Dead end, same day: the first cutoff split each cell into `x$fn` (the body) and `x`, a generator over
a store that yielded only changed values. `selftest.ts` then failed on `fixtures/accept-owner`
(`test_total` got 6, wanted 18): a generator variable is stepped at most once per animation frame,
so each memoised hop added a frame of lag, and `settle()` could not see the pending step. Memoising
the definition has no extra variable and no lag.

Measured with `bun lite/notebook/probe-memo.ts` (1 s of play, ball tracked by no pointer, no brick
broken) and `test_breakout_memo` (1 s, ball started under the bricks), headless Chromium, 2026-11-14:

```
                       before (one app cell)        after (components, memoised)
frames in 1 s          ~32                          26 (probe) / 34 (test)
app                    33 runs                      27 / 35 runs, 6 elements each
bricksView             (inside app: 24 bricks/run)  0 / 1 runs (1 brick broken)
paddleView             -                            0 / 0
subscriptions          33                           2 / 2 (play, pause; totals over the second)
DOM, style attributes  32                           26 / 33 (the ball)
DOM, nodes added/removed 0                          0 / 1 (the broken brick)
```

`selftest.ts` 111 cells compared, 0 differences (with the generator cutoff it was 2, both in
`accept-owner`, which is the guard against memoising a borrowed input).

Not done: `app` still runs every frame, because `ballView` changes; a frame that moves only the ball
still builds `app`'s 6 elements. Making the ball its own mounted root, or letting the renderer
take cells as children, would remove that.

### Shrinking the checker (2026-11-14)

Tom: "I feel like lite is still too big". A subagent refactored the nine checker files with every
gate required to print the same: full `oracle.ts` (with the 173 mutants), `fixtures.ts`,
`proof.ts`, `selftest.ts`, and per-cell `check.ts` output for every example, fixture, port and
mutant in both index modes, compared byte for byte against a frozen copy.

```
wc -l, nine checker files        3149 -> 3038   (-111, 3.5%)
  infer.ts                       1405 -> 1316
bundle browser/entry.ts, min     364982 -> 361058 bytes
  gzip -9n                       102528 -> 102062 bytes
```

Cuts: dead code (`setPath`, `expandDeep`, `widenIfFree`, `widenDeep`, which equalled `widen`),
shared helpers for repeated patterns, `cond` rewritten around one narrowing helper, keyword and
`typeof` tables, the typed arrays generated from one list, and one AST walker in `parse.ts`.

Tried and reverted: dropping the two `no-var` checks in `infer.ts` passed every gate, but an
overload choice counts errors, so a `for (var ...)` inside an `Array.from` callback changed a type
and let a dependent cell go from rejected to ok.

Larger cuts each change a verdict; none was made:

```
drop return-type candidates in apply   ~3 lines   glpk-canonicalization:extract ok -> rejected
drop deferred lambdas in apply        ~14 lines   2 lite-mut fixture cells ok -> rejected
drop collapseArrays                    ~8 lines   2 lopepage-urls cells ok -> rejected
drop try/catch dataflow in own.ts     ~10 lines   freeze in a branch then use: ok -> rejected
drop lazy typing of hoisted functions  ~9 lines   dependents of a later-declared function blocked
trim unused intrinsics                 312 of ~403 members unused by any gate; would make
                                                  ordinary programs unsupported
```

So the checker is near the size this design needs; a much smaller `lite` would need a smaller
language (dropping generic inference or overloads) rather than a tidier implementation.

### Broken cells are stored and do not run (2026-11-15)

Tom: edits were never meant to be refused; the program passes through a broken state until it
is repaired. Before this, Shift-Enter applied an edit only if no `ok` cell stopped being `ok`, and
a cell the checker rejected (section 3's `leak`, section 8's eleven) still ran.

- `stdlib/runtime.ts` `checkCells(texts)` checks a module in which some cells do not parse: each is
  replaced by a stand-in of the same name and line count whose value has no type, so a cell that
  takes it is blocked. `cellStates(result)` (`toolchain/ss-toolchain.ts`) gives each cell
  `ok | rejected | blocked`, with the checker's messages or the cells it is blocked by.
- `compileCell(text, tsx, ctx, name)` with a check context compiles a cell that is not accepted to
  `$ss$.rejected(name, why)`, which throws `<name> does not check: [rule] msg; …`. The typed text
  is in the `/*ss^{"d":…,"rejected":…}*/` header, so `decompile(compile(src)) === src` holds for a
  rejected or unparsable cell too (`toolchain/ss-toolchain.test.ts`, 37 files, 2026-11-15).
- The editor (`soundscript/core.ojs` `ss_language`) shows, while typing, `applying this breaks 2
  cells: area, aspect; blocks 2 cells: half, test_half`, and after Shift-Enter the same line as
  `this edit broke …` on the edited cell. Cards say `rejected` with the messages, or `blocked by X`.
- Measured in `soundscript/verify.ts` (headless Chromium, real keys, 2026-11-15): `width = () =>
  "800"` makes `area` and `aspect` rejected and `half`, `test_half` blocked; the count of the
  counter (pressed before) is kept through the break and both repairs; `height`, `scale`,
  `samples`, `histogram`, `count`, `increment` and `app` ran 0 more times. A cell whose body counts
  its own runs on `globalThis` ran 0 times at the edit, in `ss_instance`, after an exporter-3
  export reopened, and after Save in place reopened. Breakout with `step` broken mid-game keeps
  score 10, listeners 1 -> 0, clocks 1 -> 0; repaired, 1 listener and 1 clock, the ball moving.
- State that is lost, measured by `runtime.test.ts` `b5` (2026-11-15): a ref cell that is itself
  rejected (`own` given `ref("0")`, or `seeded = (base: number) => ref(base)` once `base` is a
  string) is replaced by a raising definition, so on repair it starts again from its initial value
  (`own` 2 -> 0, `seeded` 7 -> 5). A ref outside the broken part keeps its value (`kept` 2 -> 2).
  A ref blocked by its input (`fromSq`, taking a rejected `sq`) keeps its compiled definition but
  its variable fails while the input does, so on repair it runs again. Until later on 2026-11-15
  that run started it from its initial value (26 -> 25). `stdlib/runtime.ts` now keeps, per
  definition object, the last inputs of each ref run and its handle; a run with the same inputs
  (`Object.is`) returns the same handle, so `fromSq` keeps 26. With `base` changed to 6 the input
  differs and `fromSq` restarts at 36 (`b5_blocked_ref_restarts_on_a_new_input_value`).
  - Dead end: keying the store by cell id shared state between two modules with the same cell text;
    it failed `e5` and `b3`.
  - Dead end: keying it by the variable (an `@variable` input) made a repaired rejected ref keep its
    state too, but the exporter then wrote one SoundScript definition line fewer per module (verify,
    `export:` rows, 6 -> 5 in the core), and it was reverted.
  - The definition reaches the stdlib as `function $ss$ref($ss$, …, $ss$self = $ss$ref)`. A first
    version referred to `$ss$ref` in the body; that is the function's own name, but
    `tools/lope-preflight.ts` walks only the body and reported `viewof tally references $ss$ref,
    which is not one of its inputs`, once per ref cell (8 findings). The name now appears only in a
    defaulted parameter no input fills. `soundscript/build.ts` fails if preflight reports anything
    in a `@tomlarkworthy/soundscript*` module.
- Unit tests: `stdlib/runtime.test.ts` `b1`–`b5` (break and repair, a rejected body never runs, an
  unparsable edit, a listener in the broken part detaching and attaching again) and `o1`–`o2`
  (listener order).

### State is a function of the call log: `read` and `action-capture` (2026-11-15)

Tom approved both on 2026-11-15, so that state survives iteration: the stored values should not
depend on which calls share a commit or on when cells run again. Before this an action that wrote
`b` from `a`'s value had to take `a` by value, and so used the value from the cell's last run:

```
const copy = (other: Ref<number>, count: number) => action(() => other.set(count + 1));
```

- `read(ref)` (prelude): inside an action, the value as of this point in the call order.
- Writes are now applied when they are made, to a per-commit overlay, in call order
  (`prelude.runtime.ts` `write`, `undoTo`). A call that throws, nested calls included, undoes its
  own writes and rethrows. The commit (a `setTimeout` macrotask, as before) stores each touched
  ref once, with one version bump. Before, writes were queued and applied at the commit, so an
  `update` function that threw was logged there as `action outer: an update threw…`; it now throws
  out of the call. Tests changed for that: `c2`, `g1`, `g2`, `g3`, `g5` in `stdlib/runtime.test.ts`.
- `action-capture`, in `lite/capture.ts` (called from `core.ts`) and in `check.ts`: an action body
  may not use a value that depends on state (rule text in `RULES.md`). Both checkers give the same
  three errors on `fixtures/reject-action-capture`; `fixtures/accept-read` passes both.
- Property test `p1` (`stdlib/runtime.test.ts`): 300 seeded calls over three refs, five actions
  (one reads `a` to write `b`, one throws on some arguments, one calls two others) and frames that
  deliver one events value to two listeners, run under six schedules. All six stored
  `[a, b, c, total, threw] = [96,3408,2719,6223,18]`. `p2` runs the same log with `copyAB` in the
  `copy` shape, compiled with the check bypassed: a commit after every call gives `b` 8043, one
  commit at the end gives 4170.
- Precision, measured on scratch cells (`probe/cap.ts`): rejected and safe, an events cell that
  yields once (its value never changes, the listener's action is still rejected for using it).
  `log` in an action was rejected in the first version and is allowed since (Tom, 2026-11-15): it
  writes nothing the program reads back. The taint
  follows names, not values: `const unused = count` used only in `typeof unused` is rejected.
- Capabilities in actions: `random()`, `now()` and `fetch(...)` inside an action body are
  `action-capture` now (`fixtures/reject-action-capture` `roll`, `stamp`, `load`); before this they
  were accepted. `log(...)` is accepted (`fixtures/accept-read` `say`). A random or time value
  reaches an action only as an argument, from an events cell's value through `on(...)` or from a
  view: Breakout's `ticks` takes `now` and yields `dt`, and `onTick` passes it to `tick`, which is
  accepted. Wrapping an action in
  a handler (`onClick={() => rollArg(random())}`) was and is rejected (`action-call`). `fetch(...)
  .then((r) => n.set(r.status))` inside an action was accepted before and fails at run time with
  `Ref n: set/update called outside an action` (the `set` runs after the action returned; checked
  with the old prelude and a resolved promise in place of `fetch`).
- Cells changed: `fixtures/lite-jsx/accept-suminagashi-controls` `pointerDown` took `tool` by
  value; it now takes `tool: Ref<Tool>` and reads it. `jsx/proof.ts` asserted that picking a tool
  re-described `canvas_view`; it now asserts the opposite (`canvas_view` 4 -> 2 evaluations). The
  tutorial's counter (`notebook/examples/04-counter.tsx`) gained `saved` and `save`, an action that
  stores `read(count)`, so the feature is on the page; `test_ss_counter` checks that `save` after
  one `increment` stores 1. No other port, tutorial example, `core-example.ts` or `horde` cell is
  rejected by the rule
  (`bun lite/check.ts horde`: 37 ok, before and after).

## Not done

**Owned collections** (`mut([mut(…)])`, a Mut holding Muts) were the stretch goal and are not
attempted. Today `all.push(out)` with `out` a Mut is `mut-escape` (`reject-mut-escape:bad_push_into_other`).
Allowing it needs a Mut type that tracks its children, a rule that freezing the parent consumes
each child, and reads of `all[i]` that return a Mut bound to the parent's lifetime. That is a
second ownership level through `own.ts`'s position rules and its dataflow, not a local change.

## What to cut or add next

- **Cut, maybe:** generic inference has two extra steps, candidates from the expected return
  type and lambdas checked after the other arguments. Which port cells need each is not measured;
  disabling each and rerunning `oracle.ts` would show whether either can go.
- **Add:** a complete declaration of the intrinsics RULES allows, generated once from
  TypeScript's `lib.*.d.ts` with the effect tags added by hand. Then an unknown intrinsic member
  can be `no-member` instead of `unsupported`, which recovers the 12 rename mutants. The current
  `intrinsics.ts` is hand-written and covers what the ports and fixtures use.
- **Add:** a decision in RULES on index reads (strict or unchecked) and on helpers capturing a Mut
  or reassigning a parameter. Lite implements one answer to each; the oracle the other.
- **Add:** `switch` support in the ownership dataflow, the first unsupported construct a new port
  is likely to hit.
