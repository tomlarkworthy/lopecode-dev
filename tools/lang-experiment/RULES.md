# Cell language experiment: rules (working brief, v0)

Question under test: can real lopecode modules be written in a checked, immutable-by-default
subset of TypeScript where a cell is a function and its parameters are its dependencies, and
what fraction of each module lands in each tier? Background: `plan/substrates-winter-2026.md`.

This file is the single statement of the rules. If a construct has no home here, do not invent
one silently: record it in the port's `GAPS.md` (construct, cell, what you did instead).

## Files

A ported module `<name>` is a directory `tools/lang-experiment/ports/<name>/`:

- `cells.ts` checked cells. Only `let|const name = <arrow or function expression>`,
  `function`/`function*`/`async function`, `type`/`interface` declarations and
  `import type`. Nothing else at module level. `export` before any of them is accepted and
  changes nothing (2026-11-15: the form is without it; an editor hint says "export is not needed").
- `shell.ts` shell cells: same shape, ordinary TypeScript, not linted. DOM, canvas, WebGL,
  `md`, `htl`, `Inputs`, `d3`, `Plot`, timers, anything reflective.
- `foreign.d.ts` trusted signatures for imported cells and libraries (see "foreign").
- `GAPS.md` constructs with no home, and every place a test assertion had to change (it should not).
- `MAP.md` one row per original cell: original name, tier, port name(s), note.

## Cells and injection

- A cell is a top-level function (2026-11-15: no longer `export`ed). Its name is the cell name. Its parameters are its inputs,
  injected by parameter name. A parameter name must be a cell in this module, a name in
  `foreign.d.ts`, or a capability.
- A parameter may omit its type; it then has the named cell's value type. The harness fills it in.
- The value type of a cell: return type `T` gives `T`; `Promise<T>` gives `T`; `Generator<Y>`
  gives `Y`; `RefCell<T>` gives `T`.
- Free names: a body may use its parameters, its own locals, the prelude (`ref`, `action`, `mut`,
  `freeze`, `borrow`, `snapshot`, `equals`; in the lite checker also `on`), and allowed intrinsics. Any other free name is an error.
  A cell may not call another cell by its module-level name; it must take it as a parameter.
- Allowed intrinsics: `Object Array Math JSON Number String Boolean BigInt Symbol Map Set Error
  TypeError RangeError RegExp Promise` the typed arrays, `ArrayBuffer DataView TextEncoder
  TextDecoder Infinity NaN undefined isNaN isFinite parseInt parseFloat encodeURIComponent
  decodeURIComponent encodeURI decodeURI atob btoa structuredClone URL URLSearchParams`. Not `Math.random`, `Date`,
  `console`, `window`, `document`, `globalThis`, `fetch`, timers, `eval`, `Function`.
- Capabilities are parameters with reserved names, provided by the harness: `now: Clock`
  (`() => number`), `random: Random` (`() => number`), `fetch: Fetch`, `log: Log`, `invalidation`.
- Preferred cell form (Tom, 2026-11-14; without `export` since 2026-11-15): `let x = (a: number) => 42 + a`.
  Every cell is a function from dependencies to the cell's value; the outer parameter list is always the
  dependency list. `let`/`const` with an arrow or function expression, and
  `function`, are all the same thing. Generators cannot be arrows:
  `let ticks = function* () { ... }`. Async arrows are fine.
- There is no shortcut for function-valued cells. A cell whose value is a function is two arrows:
  `let double = () => (n: number) => n * 2`.

## Immutable by default

Banned in `cells.ts`: assignment to a member (`a.b = `, `a[i] = `), `++`/`--`/compound assignment
on a member, `delete`, mutating methods (`push pop shift unshift splice sort reverse fill
copyWithin set add delete clear`) on Array/Map/Set/typed arrays, `Object.assign` onto an existing
value, `var`, `class`, `this`, `arguments`, `new` on anything but an allowed intrinsic, `any`,
`as` casts other than `as const`, non-null `!`, `@ts-ignore`/`@ts-expect-error`, enums,
namespaces, `import()`.

Allowed: `throw`, `try`/`catch`, loops, local `let` (reassignment of a local).

A `let` may be assigned from inside a nested function only if that function is a local helper
that does not escape: it is bound to a local `const`/function declaration and every use of its
name is a direct call (never passed as an argument, returned, stored in a literal, or yielded).
Otherwise assigning a captured `let` is an error. (v1, after the pilot: the outright ban forced a
recursive-descent parser to thread a `Mut` cursor through every helper.)

`===` on two non-primitive operands is banned; use `equals(a, b)` (structural).

## Opt-in 1: `Mut<T>` locals

`const out = mut(new Float32Array(n))` gives `Mut<Float32Array>`. Member writes and mutating
methods are allowed on a `Mut<T>` receiver. A `Mut<T>` value may be: bound to a local `const`,
written to, read, passed to a parameter typed `Mut<…>`, passed to `freeze`. It may not be:
returned, yielded, aliased to another binding, captured by a nested function, placed in an
object/array literal, or used after `freeze(out)`. `freeze(out)` has type `T`.

## Opt-in 2: owner cells

A generator cell may keep a `Mut<T>` across yields and `yield borrow(x)`; its value type is
`Borrowed<T>` (read-only). A consumer may read a `Borrowed<T>` during its own synchronous
evaluation. It may not hold it across an `await`, return it, or put it in a ref; `snapshot(b)`
copies it to a plain `T`. A cell that yields `borrow` is counted in the `Owner` tier.

## Refs and actions (replaces `viewof` and `mutable`)

- `function count(): RefCell<number> { return ref(0) }` declares state.
- A parameter `count` (or `count: number`) receives the current value and is a dependency.
  A parameter `count: Ref<number>` receives the reference and is not a dependency on the value.
- `Ref<T>` has `set(v: T): void` and `update(f: (v: T) => T): void`, and no read method.
- Writes are legal only lexically inside `action(...)`: `action(() => count.update(c => c + 1))`
  has type `Action<[]>`. An `Action` may be called only inside another `action(...)`. A cell body
  never calls one; it returns it, puts it in a record, or passes it to a parameter typed `Action`
  or to a shell cell. The world (shell cells, the harness) calls actions.
- A `viewof x = Inputs.range(...)` ports as a ref cell `x` in `cells.ts` plus a shell cell
  `x_view(x: Ref<number>, Inputs)` in `shell.ts` that builds the widget and calls `x.set`.
- A `mutable x` ports as a ref cell; each `mutable x = …` write becomes an action.
- A ref's content type may not contain `Ref` or `RefCell` anywhere: not directly, and not in a
  record, an array, a union, a type argument or a function signature (`ref-in-ref`).
  `ref(count)` with `count: Ref<number>` is an error. (Tom, 2026-11-15.)
- `read(count)`, with `count: Ref<T>`, is a `T`: the stored value plus every write made earlier in
  the call order. It is legal only lexically inside `action(...)` (`read-outside-action`); at run
  time it throws outside an action. (Tom, 2026-11-15.)
- The body of an `action(...)` may not use a value that depends on state (`action-capture`): a
  parameter naming a ref cell or an events cell by value, a capability other than `invalidation`
  or `log` (`log` writes nothing the program reads back), a parameter naming a cell that takes any
  of these by value (transitively), or a `const`, `let` or function of the cell computed from one.
  A value from the clock or the random source reaches an action as an argument, from an events
  cell or a view, so it is recorded with the call. Ref and Events handles, Actions, cells with no state,
  and the action's own parameters and locals are allowed. So the stored state is decided by the
  ordered list of action calls and their arguments. Both checkers. (Tom, 2026-11-15.)

## Events and listeners (lite checker only)

Tom, 2026-11-15. `check.ts` and `prelude.d.ts` do not know these names;
`lite/core.ts` enforces them.

- A parameter `ticks: Events<number>` receives a handle to the sync generator cell `ticks`, not
  its values, and is not a dependency on them. Once a cell takes `ticks` as `Events`, a parameter
  reading `ticks` without `Events` is an error (`inject-events`).
- `on(ticks, tick)` has type `Listener`. `tick` must be an `Action` that accepts what `ticks`
  yields.
- A `Listener` is only the whole value of a sync, non-generator cell:
  `const onTick = (ticks: Events<number>, tick) => on(ticks, tick)`. `on(...)` may be what
  the cell returns, or a branch of a conditional it returns (`flag ? on(a, x) : on(b, y)`). Not in
  an array, a record, a ref, a nested function's return, an argument, or a union with another type
  (`flag ? on(a, x) : null`); `on` is not a value; no cell may take a listener cell
  (`listener-placement`).
- While a listener is the value of its cell, the runner runs its action once for each value the
  events cell yields, in order. The listener ends when its cell runs again, is deleted, or its
  module is disposed.
- Starting and stopping the events is dataflow: the events cell takes what it depends on
  (`ticks = function* (now: Clock, playing: boolean)`) and yields nothing when it should not run.
- An events cell is a generator and is never written to; writes stay in actions.
- Two listener cells on one events cell get each value in the order the cells appear in their
  module's source; listeners in other modules come after, by module name, then source order.
  Attach order and re-runs do not change it. (2026-11-15.)
- Each top-level action call is its own flush group: a call that throws discards only its own
  writes and those of the actions it called. (2026-11-15.) Since the same day a write is applied
  when it is made, so an `update` function that throws throws out of the call that made it, not
  later at the commit.

## Editing a module with broken cells (Tom, 2026-11-15)

Replaces "an edit is applied only if the whole module still checks". Tom: edits were never meant
to be refused; the program passes through a broken state until it is repaired.

- Every edit is stored, including one that does not parse. Only a cell with no name
  (no `const <name>`, `let <name>` or `function <name>` at its start, after comments and an optional `export`) or with another cell's name is not stored.
- After each edit every cell is ok, rejected (it breaks a rule, or does not parse) or blocked (it
  breaks no rule of its own but takes a cell that is not ok). A cell whose own check fails because
  an input's type changed is rejected with its own message.
- Only ok cells run. A rejected cell compiles to a definition that raises the checker's messages;
  its body is kept only as source in the marker comment, so it cannot run (at load, after an edit,
  in `ss_instance`, after save or export). A blocked cell fails through dataflow.
- A ref whose own cell stays ok keeps its value; a cell whose compiled text did not change is not
  defined again. `compile` still refuses an island with a cell that is not ok.

## Foreign values and the shell

- A shell cell's value type, seen from `cells.ts`, is `Js` (`unknown`) unless `foreign.d.ts` gives
  it a trusted signature. A checked cell turns a `Js` into a typed value with a decoder: a checked
  function `(x: Js) => T` that narrows with `typeof`/`Array.isArray`/`in` and builds a new value.
- `foreign.d.ts` may declare an imported cell or library with a trusted signature
  (`declare const math: { add(a: number, b: number): number }`). Each declaration is counted as
  trust surface. Mark each `/** pure */` or `/** effect */`; a checked cell may take only `pure` ones.
- World state read at call time (v1, after the pilot). A value such as `location.href` or
  `document.baseURI` is not a pure foreign. It is a shell source cell (`href` in `shell.ts`, which
  may be a generator that yields on change), decoded by a checked cell. A function that used to
  read it when called becomes a cell that depends on the decoded value and returns the function:
  `let linkTo = (href) => (target, opts) => ...`. Do not split a function into a checked
  half and a shell wrapper to avoid this; the dependency on the shell cell is the honest result
  and tests that depend on it count as having shell support.
- A ref whose initial value comes from the world takes it as a dependency:
  `let vars = (vars_initial: Js): RefCell<Vars> => ref(decodeVars(vars_initial))`.
- `shell.ts` may name a checked cell's value type as `ValueOf<"cellName">`.
- Prose cells (`md`, headings) go to `shell.ts` and are excluded from tier denominators.

## Tiers (for `MAP.md`)

`default` (checked, no opt-in) · `mut-local` (uses `Mut` inside, pure outside) · `owner` ·
`ref` (a `RefCell`) · `shell` · `prose` (excluded) · `import` (an import variable; excluded).

## Tests

`test_*` cells are ported with their assertions unchanged. A test passes if it does not throw.
If an assertion cannot be kept, record it in `GAPS.md`; do not weaken it.

## Checked mechanically vs by review

The harness README states, for every rule above, whether `check` enforces it exactly, enforces an
approximation (say which), or leaves it to review. A port's "passes check" means only the former two.
