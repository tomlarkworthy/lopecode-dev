# Checker shape: one cell per class, or many small cells

Recorded 2026-11-21. Asked: can the type-inference core of `lite/infer.ts` be written as many small checked
SoundScript cells instead of the survey's one cell per class (`selfhost/checker-survey/RESULTS.md`, P2, whose largest
call cycle is 32 methods, 999 lines)? One slice of `Checker` was ported three ways and each port was run against the
real `Checker` on the same parsed nodes.

Answer, from the runs below: yes. Shape C (one cell per method, the state as Mut working tables passed as
parameters) checks with 40 cells, largest 25 code lines, agrees with the real checker on 64 of 64 programs, and runs
at shape A's speed (5.1 µs against A's 5.2 per program; 3.3 ms against 3.9 ms at 1000 declarations, 0.17 ms against
0.18 ms at 1000 diagnostics, 2.2 ms against 2.4 ms at 1000 blocks). Its cost is a six-parameter prefix on every method
and every recursive call, and lines up to 287 characters wide.

## Commands

```
S=selfhost/checker-shape   # run from tools/lang-experiment
(bun $S/check.ts $S/shapeA.ss.ts $S/shapeB.ss.ts $S/shapeC.ss.ts; SWAP=tablesB=tablesB2 bun $S/check.ts $S/shapeB.ss.ts) > $S/out/check-shapes.log
bun $S/check.ts $S/common.ss.ts $S/probes/h_knot.ss.ts $S/probes/h_borrow.ss.ts > $S/out/check-probes.log
bun $S/diff.ts --reps 20 > $S/out/diff.txt              # differential, controls, timings, three size sweeps
bun $S/probes/setup-cost.ts > $S/out/setup-cost.txt     # per-shape cost of an empty body
bun $S/metrics.ts                                       # cell sizes from the parse; writes out/metrics.txt itself
```

`check.ts` is the survey's `run.ts` (splitCells, checkCells, strict index, not tsx) with `probes/ast.ss.ts`,
`lite/types.ss.ts`, `common.ss.ts` and, for B, `tablesB.ss.ts` checked in front of the file. The real checker files
changed while this ran (another session was editing `lite/registry.ts` and `lite/infer.ts`). Every log now prints the
hashes it ran against, and the final runs (07:55–08:05 UTC) all used `lite/core.ts@6e5c19a4d12d lite/infer.ts@88e4bfdd4ab7
lite/registry.ts@50dea0539436 lite/own.ts@03c38600d97b lite/types.ss.ts@75707e80a705`. The survey's verdicts were taken
at `infer 0e3049d9804b`. At 08:40 CET (07:40 UTC) the import of `lite/registry.ts` failed (`Export named 'callSigsWith'
not found in module lite/types.ts`) until that edit finished; nothing here was run in that window.

## Results

| shape | checks? | cells | largest / median cell (code lines) | total lines | chars median / widest line | µs per program | chain n=1000 | differential |
|---|---|---|---|---|---|---|---|---|
| real `Checker` | — | — | — | 620 stateful + 128 pure (whole bodies) | 397 / 309 (stateful members) | 5.1 | 5307 µs | — |
| A one cell | yes (16.9 s to check) | 1 (+28 common) | 379 / 379; its 32 local functions 55 (`cond`) / 6 | 379 | 263 / 241 (local functions) | 5.2 | 3872 µs | 64/64 |
| B pure, copied maps | yes (31.2 s) | 45 (+28) | 26 (`memberB`) / 6 | 370 | 371 / 271 | 13.3 | 116 597 µs | 64/64 |
| B2 pure, persistent logs | yes (20.2 s) | 46 (+28) | 26 (`memberB`) / 6 | 380 | 360 / 271 | 13.1 | 6 694 µs | 64/64 |
| C Mut parameters | yes (22.3 s) | 40 (+28) | 25 (`memberC`) / 9 | 389 | 405 / 287 | 5.1 | 3 267 µs | 64/64 |

All three shapes share the 28 cells of `common.ss.ts` (151 code lines, largest `typeTag` 23): the methods that read
no checker state (`um`, `filter`, `truthy`, `narrowEq`, `narrowByProp`, `join`, `logicalType`, …). "Total lines" is
the shape's own cells. `check.ts` prints 40 / 40 / 41 cells for B / B2 / C: it counts `splitCells` units, which
include `export type` declarations; the table counts `export const` cells. Chars are non-blank characters outside
comments. Code lines are lines with a token outside a comment, counted from the parse (`metrics.ts`,
the survey's rule). Check times are for the whole file including the ~0.5 s prefix, one run each, on a machine that
was running other sessions; treat them as ±20% (B's ranged 26.1–31.2 s over two runs the same morning). The original's 620 lines are the members' whole bodies; the slice
cut parts of them (below), so the totals are not like for like.

Excerpt of `out/diff.txt` (2026-11-21, 08:0x UTC; lines unchanged, the per-program failure lists omitted):

```
64 programs, 0 outside the slice, 18 with a diagnostic from the real checker, 0 whose listed rules differ from the real ones
differential A: 64 pass, 0 fail
differential B: 64 pass, 0 fail
differential B2: 64 pass, 0 fail
differential C: 64 pass, 0 fail
differential C-control (join2 returns its first flow): 62 pass, 2 fail
differential C-control (narrowByProp keeps every member): 60 pass, 4 fail
differential B-control (errB returns the state unchanged): 44 pass, 20 fail
differential B2-control (errB returns the state unchanged): 44 pass, 20 fail
differential C-control (errC writes nothing): 44 pass, 20 fail
time per program (mean of per-program medians, 20 reps): real 5.1 µs, A 5.2 µs, B 13.3 µs, B2 13.1 µs, C 5.1 µs
sweep chain n=1000 (5996 typed nodes, 0 diagnostics; A same, B same, B2 same, C same): real 5307.0 µs, A 3871.6 µs, B 116597.0 µs, B2 6693.9 µs, C 3267.0 µs
sweep diags n=1000 (1001 typed nodes, 1000 diagnostics; A same, B same, B2 same, C same): real 378.5 µs, A 183.2 µs, B 6126.3 µs, B2 3178.6 µs, C 173.8 µs
sweep blocks n=1000 (6001 typed nodes, 0 diagnostics; A same, B same, B2 same, C same): real 2868.2 µs, A 2394.2 µs, B 86390.2 µs, B2 8233.6 µs, C 2155.0 µs
```

Each shape also printed "(X met 3 callees with more than one signature)", and the join2 and narrowByProp controls
printed the same counts for A, B and B2 as for C. The n=10 and n=100 sweep lines are in the file.

The same two controls fail the same programs for every shape (`cond-flow-after`, `expr-stmt-cond-flow` for join;
`discriminant`, `discriminant-neg`, `discriminant-wrong`, `path-narrow` for narrowByProp).

## The slice

Real bodies from `lite/infer.ts`: `infer`, `infer1` (Literal, Identifier, MemberExpression, CallExpression,
UnaryExpression, BinaryExpression, LogicalExpression, ConditionalExpression), `ident`, `member`, `call` with the
overload retry, `apply` with generic instantiation (`fresh`) and unification, `check`/`check1`, `expect`,
`conditional`, `cond` (`!`, `&&`/`||`, `===`/`!==` against literals and `typeof`, the discriminant, truthiness),
`join`, `filter`, `narrowByProp`, `narrowEq`, `narrowTypeof`, `typeTag`, `binary`, `unary`, `numeric`, `stmts`,
`block`, `stmt` (block, expression, `const`/`let`, `return`), `varDecl`, `declare`, `Scope.get`, `pathKey`,
`memberMissing`, `returned`, and the shared state: `quiet`, `fresh`, the binding counter, the flow, the types table,
`bindingOf`, the scopes, the diagnostics, the returned types.

Cut, each named in the code where it was cut:

- `hides` (action-pass / handle-pass), so `quiet` has no observable effect in the slice; it is still saved and
  restored by every shape, as state.
- `ident`: `identHook`, `cell-by-name`, the unsupported-intrinsic branch for an allowed global with no signature,
  `structuredClone`, `lazy` bindings.
- `member`: optional chains (`short`), computed members and `index`, the `x["0"]` index read, the State write rule,
  banned members, `memberFlags`, `Borrowed` views.
- `call`: prelude calls, `compile`, the helper fact, `new`, `Object.assign`/`freeze`, `structuredClone`, the
  mutating-method write rule, Actions, explicit type arguments, `Borrowed`.
- `apply`: `facts.calls`, spread arguments, deferred lambda arguments (they need `fnExpr`).
- `cond`: `in`, `Array.isArray`, the ChainExpression links.
- `binary`: `in`; `unary`: `delete`; `stmt`: every statement but the four above; `varDecl`: annotations
  (`reg.convert`), function initialisers, patterns, `mutOwned`; `block`: `hoist`.
- The registry is not ported: the shapes take it as the cell `regView`, a record of its functions (a stand-in when
  checked, the real `Registry` methods when linked by `mylink.ts`).
- `fnExpr`: the differential runs the real `fnExpr` on the arrow and gives each shape the parameter types and
  globals that run produced (`diff.ts` `inputOf`); the shapes check only the body.
- The parse: the typed union of `checker-survey/probes/ast.ss.ts`; at run time the shapes get acorn's nodes.

## The differential

`diff.ts`: each of the 64 programs in `programs.ts` is `const p = (params) => { body };` with annotated parameters.
`sliceGaps` walks every program's body with `kids` and rejects any node type or operator outside the slice (0
rejected). The real side is `new Checker(reg, new Set(), P).fnExpr(arrow, null, undefined)`. Compared, both
directions: `show()` of every type recorded for a node inside the body (keyed by type and span), the diagnostics
including unsupported (rule, node span, message, sorted), and the returned types. 18 programs get a diagnostic from
the real checker: free-name, no-member (union and record), possibly-undefined (member, argument, `+`), arity (both
directions), type (argument, not callable, union callee, overload with no match, no-overlap `===`, unary minus on a
string), strict-eq-object, unsupported (`let x;`). Three programs call a callee with two signatures
(`{ (x: number): number; (x: string): string }`), so the overload retry and its rollback of diagnostics and flow ran.

Normalised: type variable names. `fresh` is module-level in `infer.ts` and never reset, so `T'12` is compared as `T'`.

Not compared: `bindingOf` (written by every shape, not read back), call facts and member flags (cut). One function
per program, so `rets` per FnInfo is one list. Two controls replace one shared cell at link time (`join2` returning
its first flow, `narrowByProp` returning its input). A third replaces a shape's own state write: B's `errB` returning
the state unchanged (what a stale `st` does to a diagnostic), C's `errC` writing nothing. It fails 20 programs in B,
B2 and C. A has no such control: its `err` is a local function of the one cell, which the linker cannot replace.
A stale `st` that drops something other than a diagnostic (a flow, a type) has no control.

## Readability: `conditional` four ways

Original (`lite/infer.ts:690`, 7 lines):

```ts
conditional(e: Node, env: Env, expected: Ty | undefined): Ty {
  const [T, F] = this.cond(e.test, env);
  const a = this.check(e.consequent, { ...env, flow: T }, expected);
  const b = this.check(e.alternate, { ...env, flow: F }, expected);
  env.flow = this.join(T, F)!;
  return union([a, b]);
}
```

Shape A (a local function of `checkerA`; `flow` is a `let` of the cell):

```ts
function conditional(e: ConditionalExpression, env: Env, expected: Ty | undefined): Ty {
  const c = cond(e.test, env);
  flow = c.t;
  const a = check(e.consequent, env, expected, false, false);
  flow = c.f;
  const b = check(e.alternate, env, expected, false, false);
  flow = join2(c.t, c.f);
  return union([a, b]);
}
```

Shape B (a cell; the state goes in and comes out of every call):

```ts
export const conditionalB = (join2, union) => (R: RecurB, st: St, env: Env, e: ConditionalExpression, expected: Ty | undefined): Res => {
  const c = R.cond(st, env, e.test);
  const a = R.check({ ...c.st, flow: c.c.t }, env, e.consequent, expected, false, false);
  const b = R.check({ ...a.st, flow: c.c.f }, env, e.alternate, expected, false, false);
  return { st: { ...b.st, flow: join2(c.c.t, c.c.f) }, t: union([a.t, b.t]) };
};
```

Shape C (a cell; the four tables are parameters, written in place):

```ts
export const conditionalC = (join2, union) => (R: RecurC, T: Types, B: Bound, V: Vars, C: Ctls, env: EnvC, e: ConditionalExpression, expected: Ty | undefined): Ty => {
  const c = R.cond(T, B, V, C, env, e.test);
  C.flow = c.t;
  const a = R.check(T, B, V, C, env, e.consequent, expected, false, false);
  C.flow = c.f;
  const b = R.check(T, B, V, C, env, e.alternate, expected, false, false);
  C.flow = join2(c.t, c.f);
  return union([a, b]);
};
```

What each costs, from writing them:

- A reads closest to the original, but the 32 functions live in one 379-line cell, which is what the owner ruled out.
- B: each call takes the state of the call before it (`c.st`, then `a.st`, then `b.st`). Passing an older state is
  well typed and silently drops what the skipped call recorded; the checker has no rule against it. Every result is
  a record (`{ st, t }`, `{ st, c }`, `{ st, live }`), so reads become `c.c.t` and `r.st`. Loops reassign
  `st = r.st`.
- C: the same statements as A, with `C.flow` for `flow` and the prefix `T, B, V, C, env` on every call. No state can be
  stale, because there is one copy. A method's signature does not say which tables it writes. The prefix makes C's
  lines the widest of the four (287 characters, `out/metrics.txt`), and its median cell 405 characters against B's 371
  and the original stateful members' 397.
- In B and C a method that recurses calls `R.infer`/`R.check`/`R.cond`/`R.stmts`, not its own name.

## Checker messages met, and the rewrite that cleared each

Repros in `probes/` (`out/check-probes.log`) unless a shape file is named.

| message | where | rewrite |
|---|---|---|
| `[free-name] free name R` | `h_knot.knotA`: a hoisted function names `const R` declared after it | declare `const R: Recur = { infer, … }` first, then the annotated functions (`knotC` checks). `knotB` (a function `R()` that builds the record on each call) also checks, at one allocation per recursive call |
| `[mut-bind] mut(...) must be the initializer of a local const` | `h_knot.knotW`, `mut(...)` inside a record literal | a local const per Mut |
| `[mut-escape] Mut types placed in an object literal` | `h_knot.knotW`, then with the consts | none: Muts cannot be bundled in a record. A record *type* with Mut fields is accepted (`evW` checks) but no value of it can be built. Shape C passes four Mut parameters |
| `[mut-capture] Mut types captured by a function that escapes` | `h_knot.knotCapture`: the knot's functions closing over the tables | the tables are parameters of the knot's functions, not captured |
| `[mut-escape] Mut T placed in an array literal` | `h_knot.pairLoop`: `for (const [M, br] of [[T, true], [F, false]] as const)` from `cond` | a local `side(M, br)` called twice (`narrowSides`) |
| `[no-member] no property args on …` (the whole Ty union) | `common.awaited`, `settled`: `isNamed(m, "Promise") ? m.args[0]` does not narrow | cell `promiseArg(m): Ty \| null` that narrows on `m.k === "named"` |
| `[mut-after-freeze] Mut m used after freeze(m)` | `shapeA` `apply`: `subst(p, freeze(m))` while `m` is still unified into | `subst(p, new Map(m))`: a copy per read of the substitution, which the original did not make |
| `[mut-escape] Mut m argument to a parameter not typed Mut<…>` | `shapeA` `apply`: `subst(p, m)` | the same copy |
| `[borrow-placement] borrow(x) only as the operand of yield in a generator cell` | `h_borrow.viaBorrow`: `subst(t, borrow(m))` | the same copy |

Rewrites made without a message, by reading the rule first: the filter callback in `cond` closed over the Mut flow
`M`; it now closes over two booleans read before it (`noNull`, `noUndef`). `this.facts.types.get(e.left)!` became
`?? ERR`. `x === m` on two types in `typeTag` became `equals(x, m)`, a deep comparison where the original compared
identity (a cost per call, and different only if an alias expands to a structurally equal named type; not seen in
the programs). `sides.find(...)` followed by unnarrowed reads became the cell `typeofTest`. `args.forEach` writing
`argT` became a `for` loop. In B2, node identity in the logs is span and type (`sameNode`) because `===` on two nodes is
`[strict-eq-object]`.

Accepted, which the task listed as unknown: a cell taking `Mut<Map>` parameters and writing them, called through a
function-typed record field (`h_knot.evM`, every C method); Mut parameters together with callback parameters
(`narrowSides`); `try { … } finally { C.quiet = outer }` on a Mut parameter (`checkC`); `C.diags.length = d` style
rollback on a Mut array and reassigning a Mut record's Map field (`h_knot.rollback`); a generic cell
`setIn = () => <K, V>(m: Map<K, V>, k: K, v: V) => …`; a recursive record type (`TLog`) as state.

## Cost of the state threading, and the mitigations

B copies a map on every write (`setIn`): the types table on every recorded node, `bindingOf` on every identifier,
`vars` on every declaration. The chain sweep (one block of n `const vI = f(x ? vI-1 : 0)`) shows it quadratic: 3.6 ms
at n=100, 117 ms at n=1000, against the real checker's 5.3 ms. `diff.ts` runs two more sweeps: `diags` (n
declarations of a free name, n diagnostics) and `blocks` (n sibling blocks, n scopes).

B2 keeps B's method cells and replaces only `tablesB.ss.ts` with `tablesB2.ss.ts`: the two tables keyed by node become
persistent logs (one record in front per write, a read walks from the newest entry, the output map is built once). 7.9
ms at n=1000. Its diagnostics are still a copied array: 3.2 ms at 1000 diagnostics against A's 0.18. The remaining excess is `vars`, still a copied map per declaration (1000 declarations into a scope
that also holds the parameters, over a root scope of 50 globals). Not tried: persistent scope frames, which would
need a tree map written in SoundScript.

On small programs B and B2 cost 14 µs against 5.6. The empty-body run (`probes/setup-cost.ts`) puts most of it in set-up:

```
50 globals
A: empty body 2.0 µs (median of 2000)
B: empty body 7.3 µs (median of 2000)
B2: empty body 7.6 µs (median of 2000)
C: empty body 2.0 µs (median of 2000)
```

(`out/setup-cost.txt`, 2026-11-21 08:0x UTC.)

B declares the 50 globals one at a time, each copying `vars`. Building them in one local Mut and freezing it would
remove that; not done.

C is the in-language mitigation the task named, "a cell that owns a Mut builder locally and freezes it on return":
`checkerC` makes the four tables, the method cells write them, and `checkerC` freezes them into its output.

C's first version kept two copy-on-write tables in `Ctl`: `diags` as an array rebuilt per diagnostic and the scope
parents as a copied `Map` per block. The two extra sweeps, run at 08:55 CET, showed both:

```
sweep diags n=1000 (1001 typed nodes, 1000 diagnostics): real 365.8 µs, A 155.3 µs, ..., C 1051.9 µs
sweep blocks n=1000 (6001 typed nodes, 0 diagnostics):   real 2825.8 µs, A 2669.1 µs, ..., C 4476.0 µs
```

Rewrite: `diags` became a persistent log (`DLog`, newest first, with its length; the overload retry compares lengths
and restores the pointer), turned into an array once by `diagsOut`; the scope chain moved into `EnvC` as a linked
list of scope ids (`Chain`), as the original's `Scope.parent`, so a new scope copies nothing. After it: 173.8 µs and
2155.0 µs (excerpt above), 64/64, still four Mut parameters.

C against A, the like-for-like pair (same slice, same cuts): 5.1 against 5.2 µs per program; at n=1000, chain 3267
against 3872, diags 174 against 183, blocks 2155 against 2394 µs. Against the real checker C is faster at every sweep
size. That comparison is not like for like: the real side also runs `fnExpr` set-up, `hides`/`reg.peek`, and records
`calls` and `memberFlags`. Not investigated further.

## How shape C scales to the 32-method cycle

Estimates from reading `lite/infer.ts`; none of this was ported.

- The knot holds the entry points that a cell below them calls back: here `infer`, `check`, `cond`, `stmts`. The full
  cycle adds at least `fnExpr` (called from `infer1`, `check1`, `apply`'s deferred lambdas, `hoist`'s lazy bindings),
  probably `call` (from `jsx`) and `bindPattern` (from `varDecl` and `fnExpr`): about 7 entries, a 12-line knot.
- Methods that stay over ~25 lines unless split the way `cond`, `apply` and `binary` were split here: `stmt` (90
  original lines: a dispatch cell plus one cell per statement kind; `IfStatement`, `ForOfStatement`, `TryStatement`
  are 10–20 lines each), `fnExpr` (~85: parameter binding, return annotation, FnInfo, flow filtering), `call` (70,
  half of it cut here), `apply` (74, split here into 4 cells of 20 or less), `jsx` (40), `bindPattern`, `member` (43
  original; 25 here with its cuts).
- `cond` (63 original lines) split into a dispatch cell `condC` of 18 lines and cells of 4–13 (`narrowPathC` 4,
  `discriminantC` 5, `narrowSidesC` 9, `narrowLeafC` 9, `narrowCompareC` 13) once its local closures over the two
  branch flows take those flows as Mut parameters. Its size as one C cell was not measured.
- New state for C's control record: the FnInfo per function (`rets`, `yields`, `retCtx`, `isAsync`) as a table keyed by
  function id, `breaks` (a stack), `short`, `cloneCallees`, `actionBodies`, `inActionUses`, `stateProps`. Each is one
  more field of `Ctl` if small, or one more Mut parameter if written per node (`calls`, `memberFlags`: two more
  parameters, making the prefix eight).
- Cannot be written as is, by the rules above:
  - `hoist`'s `b.lazy = () => { … this.fnExpr(…); b.t = f }` stores a closure that writes state:
    `[mut-capture]`. Rewrite: a table of pending function bindings keyed by binding id, which `ident` resolves on
    first read through `R.fnExpr`.
  - `reg.onErr` / `reg.onUnsup` set in the constructor, and `compileHook` / `identHook`: callbacks that write checker
    state: `[mut-capture]` (also survey blocker 1). The registry has to return its errors as values.
  - `reg.peek(() => this.hidden(…))` passes a callback into the registry; it reads state only, so it may check, unverified.
  - `annotatedSig` truncates `this.diags.length` after a registry call: fine in C (`C.diags = d`).
- Scope semantics kept: bindings live in one table keyed `<scope>:<name>` and `EnvC` carries only the chain of scope
  ids, so a closure checked later sees declarations made after it was created, as the original's shared `Scope`
  objects do. Immutable frames holding the bindings themselves would lose that once `fnExpr`/`hoist` are in.

## Recommendation

Shape C for the Checker port: one cell per method (after splitting the methods over ~25 lines), state as Mut working
tables owned by the entry cell, recursion through a knot record. It meets the owner's rulings with measured numbers:
largest cell 25 code lines, median 9, the real checker's results on 64 programs and on the three sweeps, shape A's
speed.

Its cost: every method and every recursive call carries `R, T, B, V, C, env` before its own arguments, because a Mut
cannot be placed in a record; lines up to 287 characters; a reader cannot see from a signature which tables a method
writes; the method count rises (26 original stateful members, `Scope.get` included, became 40 cells here). The
prefix has precedent in shipped SoundScript: `lite/events.ss.ts:268` `onSweep` takes six Mut tables and then the
event (`handles, handleAt, listeners, listenerAt, fx, counters, ev`). The full port's prefix grows to eight if
`calls` and `memberFlags` become parameters (below).

Shape B2 is the alternative if methods must be pure: same cell sizes (largest 26, median 6), no shared mutable state,
2.0x C's time on the chain at n=1000, 18x at 1000 diagnostics, 3.8x at 1000 blocks, 2.6x on small programs, and the
stale-state hazard described above, which no checker rule catches (the `errB` control shows the differential catches
it for diagnostics).

## Dead ends kept

- `knotA` (record after the functions): `[free-name]`.
- A record of Mut tables (`knotW`): constructible as a type only.
- `borrow(m)` to pass a Mut to `subst`: `[borrow-placement]`.
- B with copied maps: measured quadratic, kept as the baseline for B2.
- C with `diags` and scope parents copied in `Ctl`: super-linear in diagnostics and blocks (above); replaced.

## Files

`common.ss.ts` shared cells · `shapeA.ss.ts` · `shapeB.ss.ts` with `tablesB.ss.ts` (B) or `tablesB2.ss.ts` (B2) ·
`shapeC.ss.ts` · `programs.ts` · `diff.ts` · `mylink.ts` (lite/link.ts plus values given from outside) · `metrics.ts` ·
`check.ts` · `probes/h_knot.ss.ts`, `probes/h_borrow.ss.ts`, `probes/setup-cost.ts`, `probes/find-overloads.ts`
(no intrinsic has two call signatures; it printed nothing) · `out/` the logs quoted above (`check-shapes.log`, `check-probes.log`, `diff.txt`, `setup-cost.txt`, `metrics.txt`, and
`<file>.txt` per checked file).
