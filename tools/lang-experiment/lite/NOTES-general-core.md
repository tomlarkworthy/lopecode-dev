# Notes: effects as libraries, not checker features

Proposed 2026-11-14. Tom agreed to start with this note. Nothing here is built. The line numbers are
from the tree on 2026-11-14.

## The complaint

Asked for an actor system, I proposed a `mailbox<M>()` primitive. Tom:

> Why do we need Mailbox?! This just means the language is not flexible enough because everytime I
> ask for something, you have to invent a new language feature.

The record agrees with him. Every effect the tutorial needed arrived as a change to the checker:

| asked for | what was added | where |
|---|---|---|
| state, `viewof`, `mutable` | `ref`, `action`, `Ref<T>`, `RefCell<T>`, `Action<A>`; rules `ref-write`, `action-call`, `action-pass`, `inject-ref` | RULES.md:85-95, infer.ts:965-973, 1109-1121, core.ts:225-238 |
| workers | `pool` and `compile` capabilities, `Pool`, `Compile`; `compile` typed per call | intrinsics.ts:283-284, infer.ts:937-941, core.ts:161 |
| a game loop | a `frames` capability. Tom called it "a tactical fix"; it was replaced the same day | (removed) |
| the replacement | `Source<T>`, `Sub`, `on`; rule `inject-source`; a reconciler in the runner | intrinsics.ts:285-288, infer.ts:1123-1130, core.ts:210, 225-245, browser/run.ts |
| actors | `mailbox<M>()` with `Post<M>` | proposed, rejected |

A line count of this code was taken and is not given here: the grep that produced it was not recorded,
and a fresh review could not reproduce its figures with either of two plausible patterns.

## Why it kept happening

RULES.md already has a general mechanism for effects:

- `shell.ts`: unchecked cells for "DOM, canvas, WebGL, `md`, `htl`, `Inputs`, `d3`, `Plot`, timers,
  anything reflective" (RULES.md:17-18);
- `foreign.d.ts`: trusted signatures, each "counted as trust surface", marked `/** pure */` or
  `/** effect */`, and a checked cell may take only the pure ones (RULES.md:99-104).

lite's checker implements both: `foreignNames` and `shellNames` at core.ts:78-95, the `foreign-effect`
rule at core.ts:243. The browser runner behind the tutorial notebook (lite/notebook/lite-cells-tutorial.html)
does not. Its header says so:

```
// browser counterpart of ../../run.ts loadPort (cells.ts or cells.tsx only; no shell or foreign).
```

(browser/run.ts:2). A notebook example could hold only checked cells, so the only places an effect
could live were the `CAPABILITIES` table (intrinsics.ts:295) and the prelude functions (intrinsics.ts:296).
Each new request went into one of those two. The diagnosis is that the runner gap pushed library
work into the checker. The checker's design did not require it.

## What the special cases check

Read case by case, the effect-specific code checks seven properties. The first four are what the tags
below are for; 5 to 7 were missed in the first writing of this note and found by its review.

1. **Write gating.** `Ref.set`/`update` and an `Action` call are legal only lexically inside
   `action(...)` (infer.ts:965, 972; `inAction` set at 1119).
2. **Handle injection.** A parameter typed `Ref<T>` or `Source<T>` receives a handle to the named cell,
   not its value, and is not a dependency. The checker matches the handle's `T` against the cell's
   shape: a `RefCell<T>` return, or a sync generator yielding `T` (core.ts:225-238, 272, 271).
3. **Cell shape.** A cell returning `RefCell<T>` has value type `T` (core.ts:272, RULES.md:29-30), like
   `Promise<T>` and `Generator<Y>` do.
4. **Not data.** `structuredClone` and the worker boundary refuse the effect types by name
   (`uncloneable`, core.ts:196-207).
5. **Nominal.** `Ref`, `RefCell` and `Action` are not structurally assignable (registry.ts:333);
   `Source` and `Sub` get the same effect from brand fields (intrinsics.ts:287-288).
6. **Placement.** `ref(...)` only as the returned value of a sync, non-generator cell (`ref-placement`,
   own.ts:200).
7. **No escape from the handle.** An `Action` may not be passed to a parameter not typed `Action`
   (`action-pass`, infer.ts:376); once any cell takes a generator cell as `Source`, every reader of it
   must (`sourced`, core.ts:210, 239).

`on(source, action)` (infer.ts:1123-1130) checks only arity and types. As a declaration it would be
`declare function on<T>(s: Source<T>, a: Action<[T]>): Sub` and need nothing from the checker.

## The proposal

The core has four rules:

1. Cells are pure functions of their parameters.
2. Values are immutable, with local `Mut` and `borrow` (unchanged).
3. Writes happen only inside a write scope, and only the host calls into one.
4. A capability is any parameter whose type comes from a declared library. The checker reads effect
   tags on the library's declarations. It knows no library by name.

The tags already exist for intrinsics: `@mutates`, `@fresh`, `@view`, `@retains` and `@banned` are
read from comments by `flagsOf` (registry.ts:15-22) and drive the ownership rules. The proposal adds
tags of the same kind for properties 1 to 3:

| tag | on | means | replaces |
|---|---|---|---|
| `@write` | a method or call signature | callable only inside a write scope | `ref-write`, `action-call` |
| `@scope` | a function parameter | a function literal passed here is a write scope | the `action` prelude case |
| `@handle` | a function declaration `h(cell: S): H<T>` | a parameter of type `H<T>` gets a handle to a cell of shape `S` | `inject-ref`, `inject-source`, `refInner`, `sourceInner` |
| `@cell` | an interface `C<T>` | a cell returning `C<T>` has value type `T`; its host owns it | the `RefCell` unwrap |

Properties 4 to 7 have no tag yet. Candidates, none tried:

- 4 and 5: one `@opaque` tag on an interface, making it nominal and not data. Without it, the sketch's
  empty interfaces below would accept any object, so a plain record would pass as a `Sub`.
- 6: a rule that a function returning an `@cell` type may be called only as a cell's returned value.
- 7: `action-pass` and `sourced` both say a handle cannot be laundered through an untyped position.
  Whether that follows from `@opaque` or needs its own rule is not worked out.

If 4 to 7 stay as special cases, the checker keeps knowing these types by name and the proposal
delivers less than it says. That is the first open question.

The earlier summary of this proposal named two tags, `@write` and `@resource`. Reading the code gave
four. `@resource` became `@cell`, and `@scope` and `@handle` were missing.

Under those tags, state would be a library. Neither sketch below has been loaded into lite. The
state sketch cannot be today: the registry rejects a constrained type parameter (`A extends
unknown[]`, registry.ts:85) and a rest parameter typed by a type parameter (`...a: A`, registry.ts:93).
`Action`'s tuple typing is hard-coded in `actionFn` (infer.ts:40, 973, 1118). Variadic tuple generics in
the registry are therefore a checker change that step 2 needs first.

```ts
/** @cell */ interface RefCell<T> {}
interface Ref<T> { /** @write */ set(v: T): void; /** @write */ update(f: (v: T) => T): void }
interface Action<A extends unknown[]> { /** @write */ (...a: A): void }
declare function ref<T>(v: T): RefCell<T>;
declare function action<A extends unknown[]>(/** @scope */ f: (...a: A) => void): Action<A>;
/** @handle */ declare function refOf<T>(cell: RefCell<T>): Ref<T>;
```

and so are subscriptions:

```ts
interface Source<T> {}
interface Sub {}
/** @handle */ declare function sourceOf<T>(cell: Generator<T>): Source<T>;
declare function on<T>(s: Source<T>, a: Action<[T]>): Sub;
```

with the runtime half (`reconcile`, stepping generators per frame) as host code beside it.
`now`, `random`, `fetch` and `log` become plain `/** effect */` declarations, and `pool` an opaque
`Pool`. Actors would be a third library: an `@cell` inbox, a `@write` post, and a `@handle` that gives
the inbox's messages as a `Source<M>`. Like the two above, this has not been checked against the
checker.

## What does not fit

`compile` does not fit. Its result type depends on the cell names it is given, and core.ts types each
call (intrinsics.ts:282-283, `compileHook` at infer.ts:937). That is typed reflection, parked in
NOTES-reflection.md. Under this proposal `compile` stays a special case until that work happens.

## Costs

- **Soundness rests on declarations.** A wrong `@write` or a missing `@scope` in a library makes the
  checker accept unsound code. RULES.md already counts foreign declarations as trust surface
  (RULES.md:102-104). Under this proposal the state and subscription libraries join that surface, which
  they are outside of today.
- **`ref` and `action` are in RULES.md** (RULES.md:85-95). Moving them into a library changes the rules,
  and the rules are Tom's to change. The TypeScript oracle hard-codes the same two rules (check.ts:445-447,
  rules.ts:49). If lite moves them and the oracle does not, the oracle comparison has to be read as a
  comparison against a library the oracle has built in. Whether the oracle can read the tags (it has
  the TS AST and JSDoc) is unverified.
- **Capability names become declarations.** `CAPABILITIES` (intrinsics.ts:295) maps a parameter name to a
  type, so `now` works by name. island.ts:10 keeps a second copy of the names (`ISLAND_CAPABILITIES`),
  which has to change with it. Under rule 4 a parameter is a capability because a declaration says so.
  Existing examples would need the declarations in scope.
- **How a cell file gets a library is undecided.** Two options:
  - `import type` from a `.d.ts`. RULES.md:14-16 already allows `import type` at module level. The cost
    is that values (`ref`, `on`) are not types, so this needs either a rule change or an ambient
    `declare` brought in by the import.
  - An ambient `foreign.d.ts` per example, as ports already do. It needs no rule change. The cost is
    that the library is invisible in the cell file.
- **The runner has to load host code.** That is the gap at browser/run.ts:2. Closing it is a
  precondition of the proposal, not something it delivers.

## Order of work

1. Close the runner gap. browser/run.ts loads a `foreign.d.ts` and a host module per example, and
   runs one existing example through it with no checker change.
2. Add variadic tuple generics to the registry. Implement `@write`, `@scope` and whatever 4 to 7
   resolve to. Move `Ref`, `RefCell`, `Action`, `ref`, `action` into a library. Gates must not move
   (values measured 2026-11-14; commands in lite/README.md):
   `bun fixtures.ts` 55/55; `bun lite/oracle.ts --no-mutants` 52/54 existing and 25/25 lite;
   `lite/browser/selftest.ts` 111 compared, 0 differences; `bun lite/notebook/verify.ts` 14 pass.
3. Implement `@handle` and `@cell`. Move `Source`, `Sub` and `on` out, with the reconciler as host code.
   Breakout (09-breakout.tsx, fixtures/lite-game) must behave the same.
4. Build actors as a library with no checker change.

Success is measurable at each step. On 2026-11-14 `grep -c ""` gives infer.ts 1316, core.ts 286,
registry.ts 437, intrinsics.ts 338, browser/run.ts 264. Steps 2 and 3 should shrink infer.ts and core.ts.
Step 4 should add no rule id and no line to either. If step 4 needs a checker change, the tags are the
wrong set, and this note should record which property was missing.

## Decided with Tom, 2026-11-14 (after the review)

- SoundScript becomes an alternative cell syntax inside Lopecode notebooks.
- Cells are compiled and stored one at a time, and decompiled when the editor opens them ("the
  decompile way", source-last): the module holds only compiled variables, as it does for ojs and js
  cells. The pair is called `ss_toolchain`.
- No bootloader change. The SoundScript standard library is an ordinary module. It provides the
  library cells and registers itself with the editor as a compile/decompile target.
- A compiled SoundScript cell's first comment is exactly `/*{lang:"ss"}*/`.
- Extensibility is wanted: the RULES.md tag section is approved in principle. Not yet written;
  `check.ts` has to follow it.

This replaces step 1 of "Order of work": the runner gap closes by hosting cells in the notebook's
own runtime, not by teaching browser/run.ts to load `foreign.d.ts`.

First measurement (2026-11-14): `lite/toolchain/comment-types.ts` writes types as `/*ss:…*/` comments.
`bun lite/toolchain/comment-types.test.ts` gives 34 of 34 example and fixture files with an exact
round trip and the same acorn token stream as `erase()`. Per file, in bun, string to string; the
editor reads a stored cell through `Function.prototype.toString`, which that test does not exercise.

## ss_toolchain, first slice (2026-11-14)

`lite/toolchain/ss-toolchain.ts`. A cell compiles to a wrapper whose first comment is the marker:

```
// Note 2026-11-18: the shape of 2026-11-14; since 2026-11-18 it is `function _clear(ss, count) {return( ss.cell(...) );}`
($ss$, count) => { const {action} = $ss$; return $ss$.cell(/*{lang:"ss"}*//*ss^{"h":"export const clear = ","t":";"}*/(count/*ss:: Ref<number>*/) => action(() => count.set(0)), "cell", "clear", [count]); }
```

The `/*ss^…*/` header holds the text around the function (leading comments, `export const x =`, the
`;`). JSX is lowered to `h(...)` with the original kept as `/*ss<…*/h(...)/*ss>*/`. A ref cell is two
variables, `ref count` (the handle) and `count` (`$ss$.refValues(_)`, marked `/*ss@ref*/`) (Note 2026-11-18:
now `viewof count` and `count = Generators.input(viewof count)`; a type is `$ss$type$X`). A `type`
or `interface` is a variable `type X` whose header holds the declaration. Prelude names a body uses are
destructured from the stdlib's `ss` (Note 2026-11-18: now the runtime module's `ss`, not the checker's `soundscript`); capabilities map to stdlib variables `ss_now`, `ss_random`,
`ss_log`, `ss_fetch` (one shared value, not one per cell as browser/run.ts makes them).

Measured 2026-11-14:

- `bun lite/toolchain/ss-toolchain.test.ts`: 34 files, 344 cells, 365 variables, every cell
  `decompileVariable(definition) === cell text`, every definition unchanged by `Function.toString`
  in bun. 25 cells skipped: `Source` parameters, `pool`, `compile` are refused, not compiled.
- `bun lite/stdlib/build.ts` builds `lite/notebook/ss-demo.html`: `@tomlarkworthy/soundscript` (the
  runtime bundle, 355666 bytes, as `ss.js.gz`) and `@tomlarkworthy/soundscript-demo` (04-counter.tsx
  compiled, plus an ojs `view` cell calling `ss.mount(app, this)`). In headless Chromium: no variable
  errors; two clicks on "add one" gave `count` 2; the view node was patched, not replaced; decompiling
  the live `_definition.toString()` of every variable gave the 765-character source with the same hash
  as `splitCells(src).join("\n\n") + "\n"`; `ss.checkSources` on it: 4 of 4 cells ok. After
  `export_notebook` and a reload: same hash, no errors, a click gave `count` 1.

A fresh review (2026-11-14, BLOCK, 8 findings) found that opening a SoundScript cell in editor-5 shows
the compiled wrapper as an ojs cell, and saving it unchanged leaves `app` and `view` with
`$ss$ is not defined`. The demo's intro now says not to edit those cells. It also asked for tests:
the demo module now has `test_roundtrip` (decompiled live definitions equal the source, 765 chars),
`test_counter` (`0 -> 1 -> 0` through `increment` and `clear`) and `test_check` (4 of 4 ok), all three
passing in headless Chromium after `build.ts --force`. `tools/lang-experiment/` is untracked in git:
the work was started under an instruction not to touch git, so `build.ts --force` over an exported
copy has no way back.

Not done: memoisation and subscriptions (no `reconcile`; run.ts does both in places a stored
variable does not have), `Source`, `pool`, `compile`, the editor-5 language hook, checking on edit.
