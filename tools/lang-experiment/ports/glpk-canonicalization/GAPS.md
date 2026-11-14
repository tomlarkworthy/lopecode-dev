# glpk-canonicalization: gaps and findings

Port done 2026-11-14 against RULES.md v1. Errors quoted below are real `bun check.ts` output, from
probe directories in the session scratchpad (not kept). The probe source is in §9.

Test assertions: none changed. All 120 test bodies were copied from the original by a script (regex
over the `const _x = function _test_…(deps){return(…)}` cells), not retyped. `differential.ts` also
runs each original test body on the port's cells and each port test body on the original's cells: 360
comparisons, 0 differ.

## 1. `new` on a foreign class has no home

`constantsToRHSFn` and `addZeroToRHS` build nodes with `new math.OperatorNode(...)` and
`new math.ConstantNode(...)`.

```
cells.ts:1:41 [new-non-intrinsic] new math.OperatorNode: only allowed intrinsics may be constructed
```

What was done: two `/** pure */` foreigns, `OperatorNode(op, fn, args, implicit?, isPercentage?)` and
`ConstantNode(value)`, each one line in `foreign.runtime.ts` calling the constructor. Two of the three
trust-surface declarations exist only to wrap `new`. RULES has no form for "construct a foreign class
whose constructor is pure".

## 2. Mutation of mathjs nodes

The module writes to a mathjs node in one place, `withOperator`, on its own shallow clone:

```js
const result = ast.clone();
result.op = op;
result.fn = fn;
return result;
```

The checker reports this as `[member-write] write to result.op: receiver is not Mut`. Port: the node is
rebuilt, `OperatorNode(op, fn, [...ast.args], ast.implicit, ast.isPercentage)`, which is what
`OperatorNode.prototype.clone` does in mathjs 15.2.0 before the two writes. The cell stays checked.

Two things the rebuild cannot reproduce:

- The original can put `op`/`fn` on a node of any class. On a `SymbolNode`, `ConstantNode` or
  `ParenthesisNode` they are stray properties that nothing reads back (`math.simplify` returns fresh
  nodes without them); the port returns such a node unchanged, and those comparisons agree. On a
  `FunctionNode`, `fn` is a real field (the function), so the original's write turns `f(x)` into
  `smaller(x)`. The port returns `f(x)` unchanged. 6 `withOperator` comparisons differ (`f(x)`,
  `sqrt(4)`, `unaryMinus(x)` at the root, two operators each), and `canonicalize`/`extract` on those
  three inputs throw with a different message (§4).
- The original can write `op = undefined` onto an `OperatorNode`, which mathjs prints as `x undefined 1`.
  The constructor rejects it (`string expected for parameter "op"`). See §4.

Out-parameters. `extractLHS(acc, root)` pushes into the caller's `acc` and returns it, and
`constantsToRHSFn`'s `prunedLHS(node, pruned)` pushes into a caller's array. A `Mut` may not be returned,
so `extractLHS` now copies `acc` into a local `Mut`, pushes there and returns `freeze(out)`; its callers
(`isCanonical`, `extract`, its own recursion) always pass a fresh `[]` and use the return value, so the
contract change is invisible to them. `prunedLHS` takes `pruned: Mut<MConstantNode[]>` from
`splitConditional`, which freezes it before `appendRHS` reads it.

Does the original mutate nodes it is given? `differential.ts` runs seven of the original's functions
(`constantsToRHSFn`, `addZeroToRHS`, `simplifyStep`, `step2`, `isCanonical`, `withOperator`,
`extractLHS`) on deep-frozen parsed inputs and compares against unfrozen: 3374 runs, 0 differ. The
module's code is strict (ES module), so a write to a frozen node would throw. mathjs is evaluated with
`new Function` (sloppy mode), so a write inside mathjs to a frozen node would be silently dropped
rather than throw; a dropped write would still show up as a different result, and none did.

**Harness finding (not in the known-slips list): `mut()` accepts any value, including a parameter.**
`mut(ast.clone())` followed by `result.op = op` passes `check`, which would have kept `withOperator`
almost verbatim. So does `mut(ast)`, which mutates the caller's node:

```ts
type W = { op: string; args: MathNode[] };
export let launder = () => (ast: W) => {
  const result = mut(ast);
  result.op = "<";
  result.args.push(result.args[0]);
  return freeze(result);
};
export let test_launder = (launder) => { const input = { op: ">", args: [] }; launder(input); return input.op; };
```

`bun check.ts`: `2 cells (mut-local 1, default 1), 0 error(s)`. `bun run.ts`: `test_launder` passes
with value `"<"`: the caller's object was changed. RULES' `Mut` paragraph says what a `Mut` may not do
after it is made, not what it may be made from. Neither form was used in the port. A rule that `mut`'s
argument must be a fresh value (a literal, `new` of an intrinsic, a spread copy, or a call to a function
declared to return a fresh value) would catch both. `clone()` on a foreign would then need a trusted
"fresh" mark in `foreign.d.ts`, and it would be a shallow one: `args` is shared with the original node.

## 3. Strict typing of foreign values the original read loosely

The original reads node fields without checking the node's class: `exp.args[1].fn == "unaryMinus"`,
`exp.args[1].args[0].isSymbolNode`, `rhs.args[0].value`. Against a typed union:

```
cells.ts:16:77 [ts2339] Property 'fn' does not exist on type 'MathNode'.
cells.ts:16:111 [ts2339] Property 'args' does not exist on type 'MathNode'.
cells.ts:17:50 [ts18049] 'rhs.value' is possibly 'null' or 'undefined'.
```

What was done, cell by cell:

- `foreign.d.ts` declares `MathNode` as a union discriminated by the `isOperatorNode`/`isConstantNode`/…
  getters (each mathjs class defines its own as `true`; the others read `undefined`). Narrowing on
  `node.isOperatorNode` then works as the original wrote it, including in
  `test_canonicalize_scale_10k` (`if (!canonical.isOperatorNode) throw …; return canonical.op;`
  type-checks unchanged).
- `addZeroToRHS`: `node.fn == "unaryMinus"` is loose equality on a field that is a string on an
  `OperatorNode` and a node on a `FunctionNode`. `==` against a node compares its printed form, so the
  original treats `x < unaryMinus(y)` like `x < -y`. Comparing only `OperatorNode.fn` would have
  changed that. The port keeps it with a `looseFn` helper (`n.fn.toString()` on a
  `FunctionNode`), and `argsOf(n)` returns `args` or throws a `TypeError` where the original would throw
  one reading `undefined[0]`. Differential: `x < unaryMinus(y)` and `x < unaryMinus(3) * y` agree.
- `ConstantNode.value` is typed `number | string | boolean | null | undefined`, which is what
  `math.parse` produces (`"a"`, `true`, `null`, `undefined` all parse to `ConstantNode`). Unary minus on
  that union does not type-check; `-v` became `-Number(v)` (identical for every non-bigint primitive)
  and `term.value > 0` became `Number(term.value) > 0` (likewise).
- `extract` adds coefficients: `(merged.get(name) ?? 0) + coef`. On a string `coef` the original
  concatenates and on a boolean it coerces. The port throws a `TypeError` if a coefficient is not a
  number. Reached by two differential inputs, which `isCanonical` accepts so `step2` never runs:
  `extract('"3" * x <= 1')` is `{"vars":[{"coef":"03","name":"x"}],…}` in the original and throws
  `Coefficient of x is not a number: 3` in the port; `extract('true * x <= 1')` is `coef: 1` in the
  original and throws in the port. Keeping the original's `+` would need a coefficient type of
  `number | string` and string arithmetic in a solver input.
- `splitConditional`'s message interpolates `node.fn`, which exists on two classes; the port reads it
  on those two and gives `undefined` otherwise, as the original did.

## 4. Behaviour differences (all on inputs outside the module's domain)

20 of 11374 differential comparisons differ (§8). By class:

| class | comparisons | original | port |
|---|---|---|---|
| parenthesised comparison, `(x < 1)`, `(x + 1 < 2)` | 4 (`canonicalize`, `extract`) | the root is a `ParenthesisNode`, so `{op: undefined, fn: undefined}` is recorded; simplification strips the parentheses and the final `withOperator` writes `op = undefined` onto an `OperatorNode`, which prints `x undefined 1`; `extract` throws `Unsupported op undefined` | throws `canonicalize('(x < 1)'): not a comparison at the top level`; an `OperatorNode` cannot be built with an undefined op (§2) |
| function call at the root, `f(x)`, `sqrt(4)`, `unaryMinus(x)` | 6 `withOperator`, 6 `canonicalize`/`extract` | `withOperator` overwrites the function: `smaller(x)`; `canonicalize` throws `Only works with < as top node ` (empty) | `withOperator` returns `f(x)`; `canonicalize` throws `Only works with < as top node f` |
| non-number coefficient, `"3" * x <= 1`, `true * x <= 1` | 2 (`extract`) | `coef: "03"` / `coef: 1` | throws `Coefficient of x is not a number: …` (§3) |
| `x < unaryMinus()` (no argument) | 2 (`addZeroToRHS`, `checkStep`) | `undefined is not an object (evaluating 'exp.args[1].args[0].isSymbolNode')` | `undefined is not an object (evaluating 'argsOf(RHS)[0].isSymbolNode')`; same throw, the engine's message quotes the source expression |

The first three classes are port failures: the port does something else on those inputs. None is
reached by a test or by a linear comparison.

## 5. Rules that forced rewrites

**Parameter reassigned in a callback (known slip `s7`).** `appendRHS`:

```js
pruned.forEach((term) => {                     let out = node;
  if (term.value > 0) {                        for (const term of pruned) {
    node = new OperatorNode("-", "subtract",     if (Number(term.value) > 0) {
      [node, term]);                               out = OperatorNode("-", "subtract", [out, term]);
```

The verbatim form passes `check` (probe `appendRHSA` in §9: no error), because `let-capture` covers
`let` and not parameters. It was rewritten anyway.

**Mutating methods on fresh arrays.** `checkExtract` sorts `[...r.vars]` and `Object.entries(...)`.
`[...xs].sort()` is rejected (`[mutating-method] [...xs].sort(): mutating method on a non-Mut value`)
though the array is fresh; `toSorted` is accepted. Same result.

**`Set`/`Map` locals.** `step2`'s `seen = new Set()` (`[mutating-method] seen.add()`) and `extract`'s
`merged = new Map()` became `mut(new Set<string>())`, `mut(new Map<string, number>())`. One word each.

**`console.log` in `step2`** (`[free-name] free name console`) became the `log` capability. `step2`
takes `DEBUG` (the ref's value) and `log`. With `DEBUG = true` the differential compares 40 `step2`
results and the log lines: same.

**Rule data needs a type annotation.** `ordering`'s two objects have different `context` keys; TypeScript
widens the array element to a union with `multiply?: undefined`, which is not assignable to the
`RuleContext` index signature:

```
cells.ts:497:9 [ts2345] Argument of type '({ l: string; r: string; context: { add: { commutative: boolean; }; multiply?: undefined; }; } | …)[]' is not assignable to parameter of type 'readonly Rule[]'.
```

Fixed by annotating the cell `(): readonly RuleObject[] =>`.

**`debugger;`** `constantsToRHSFn` has two `debugger;` statements before its `throw`s. `check` accepts
them (probe `dbg` in §9); RULES does not mention them. They were dropped: in a browser with DevTools
open they pause execution, which is an effect.

## 6. Typing costs

- `foreign.d.ts` is 99 lines, most of it the node union. Only three declarations count as trust surface;
  the node interfaces, `Rule` and `ConstValue` are types and do not count, though they are as trusted as
  the declarations (nothing checks that mathjs nodes have these shapes).
- `math.simplify.simplifyCore` (mathjs 9.x) is declared optional so `multiplyOut`'s
  `math.simplifyCore ?? math.simplify.simplifyCore` type-checks as written.
- `simplify2`'s `ruleText` needs a `typeof r === "function"` branch; the original reached `null` through
  `r?.s` and `r?.l` reading `undefined` off a function, which does not type-check on `RuleFn`.
- `extractLHS`'s `let lhs = stack.pop()` is `MathNode | undefined` under the `while (stack.length)` guard;
  `!` is banned, so `if (lhs === undefined) break;`.
- `prunedLHS` needed the constant a node prunes to, not a boolean. `isNegativeConstantNode` (a boolean)
  plus `pruneNode` (reads `node.args[0].value` after the boolean check) does not narrow; a user-defined
  type guard would, but it is an unchecked claim like a cast and was not used. Replaced by
  `prunable(node): MConstantNode | null`.

## 7. Harness notes

- `run.ts --bench canonicalize` times the outer cell (it returns the closure): `canonicalize: median
  0.0002 ms over 200 runs`. The timing below was taken in `differential.ts --bench` instead.
- `report.ts` reads every markdown table row after the first header with a `tier` column, not only that
  table's rows. `MAP.md` has a single table for that reason.
- No approximation from the README's known-slips list was used. `s7` (§5) and `mut()` of a non-fresh
  value (§2) would each have let a verbatim construct through.

## 8. Differential and timing

`bun ports/glpk-canonicalization/differential.ts --bench`, 2026-11-14. Both sides use one mathjs 15.2.0
instance (`foreign.runtime.ts`). Results compared as `String(node)`, JSON for plain values, error
message for throws. Inputs: 190 string literals from the original's test cells that parse, 260
generated comparisons (seeded LCG; constants, variables, products, implicit products, unary minus,
parentheses, `x * y`, all five operators), 33 inputs outside the module's domain. Each input goes
through the six rule sets via `check`, `addZeroToRHS`, `step2`, `canonicalize`, `extract`,
`simplifyStep`, `constantsToRHSFn`, `isCanonical`, `withOperator` (two operators), `extractLHS`,
`extractRHS` (four operators); plus the data cells, all 120 tests three ways, and `step2` with `DEBUG` on.

```
DIFF canonicalize (x < 1)
  orig ok:node:x undefined 1
  port throw:canonicalize('(x < 1)'): not a comparison at the top level
DIFF extract (x < 1)
  orig throw:Unsupported op undefined
  port throw:canonicalize('(x < 1)'): not a comparison at the top level
DIFF canonicalize (x + 1 < 2)
  orig ok:node:x undefined 1
  port throw:canonicalize('(x + 1 < 2)'): not a comparison at the top level
DIFF extract (x + 1 < 2)
  orig throw:Unsupported op undefined
  port throw:canonicalize('(x + 1 < 2)'): not a comparison at the top level
DIFF canonicalize f(x)
  orig throw:Only works with < as top node 
  port throw:Only works with < as top node f
DIFF extract f(x)
  orig throw:Only works with < as top node 
  port throw:Only works with < as top node f
DIFF withOperator f(x) <
  orig ok:node:smaller(x)
  port ok:node:f(x)
DIFF withOperator f(x) >=
  orig ok:node:largerEq(x)
  port ok:node:f(x)
DIFF canonicalize sqrt(4)
  orig throw:Only works with < as top node 
  port throw:Only works with < as top node sqrt
DIFF extract sqrt(4)
  orig throw:Only works with < as top node 
  port throw:Only works with < as top node sqrt
DIFF withOperator sqrt(4) <
  orig ok:node:smaller(4)
  port ok:node:sqrt(4)
DIFF withOperator sqrt(4) >=
  orig ok:node:largerEq(4)
  port ok:node:sqrt(4)
DIFF canonicalize unaryMinus(x)
  orig throw:Only works with < as top node 
  port throw:Only works with < as top node unaryMinus
DIFF extract unaryMinus(x)
  orig throw:Only works with < as top node 
  port throw:Only works with < as top node unaryMinus
DIFF withOperator unaryMinus(x) <
  orig ok:node:smaller(x)
  port ok:node:unaryMinus(x)
DIFF withOperator unaryMinus(x) >=
  orig ok:node:largerEq(x)
  port ok:node:unaryMinus(x)
DIFF extract "3" * x <= 1
  orig ok:{"vars":[{"coef":"03","name":"x"}],"bounds":{"upper":1}}
  port throw:Coefficient of x is not a number: 3
DIFF extract true * x <= 1
  orig ok:{"vars":[{"coef":1,"name":"x"}],"bounds":{"upper":1}}
  port throw:Coefficient of x is not a number: true
DIFF addZeroToRHS(string) x < unaryMinus()
  orig throw:undefined is not an object (evaluating 'exp.args[1].args[0].isSymbolNode')
  port throw:undefined is not an object (evaluating 'argsOf(RHS)[0].isSymbolNode')
DIFF checkStep(addZeroToRHS) x < unaryMinus()
  orig throw:undefined is not an object (evaluating 'exp.args[1].args[0].isSymbolNode')
  port throw:undefined is not an object (evaluating 'argsOf(RHS)[0].isSymbolNode')

inputs: 190 literals from the original's tests, 260 generated, 33 outside the domain
comparisons per group: {"data":7,"tests":360,"check(ordering)":483,"check(expandBrackets)":483,"check(multiplyOut)":483,"check(constantsToRHS)":483,"check(complexityToLHS)":483,"check(simplify2)":483,"addZeroToRHS(string)":483,"step2(string)":483,"canonicalize":483,"extract":483,"simplifyStep":482,"checkStep(addZeroToRHS)":482,"constantsToRHSFn":482,"isCanonical":482,"withOperator":964,"isCanonical(withOperator)":964,"extractLHS":456,"extractRHS":1824,"step2 DEBUG":40,"step2 DEBUG log lines":1}
frozen-input runs of the original: 3374, results differing from unfrozen: 0
11374 comparisons, 20 differ
bench canonicalize over 11 inputs, 200 passes, median ms per pass: original 22.703 / 22.539, port 22.973 / 23.181 (two interleaved rounds)
bench canonicalize 10k-term input, 21 runs, median ms: original 5.30, port 5.04
```

The full output is above (stdout and stderr, unedited). The timing is dominated by `math.simplify`; the port's extra work (factory calls, `Mut` wrappers, which
are identity functions at run time, the `extractLHS` copy) is within run-to-run noise.

## 9. Readability

Better:
- `appendRHS` as a `for … of` loop over a local accumulator reads more directly than a `forEach` that
  reassigns a parameter.
- `prunable(node)` names what the original computed in two places (a predicate, then `pruneNode`).
- `extractLHS` returning its result instead of filling an argument; the original's callers already
  ignored that it was an out-parameter.
- The node union in `foreign.d.ts` documents which fields exist on which class, which the original
  left to mathjs knowledge.

Worse:
- `addZeroToRHS`'s condition went from direct field reads to `looseFn`/`argsOf`/`opOf` calls, to keep
  one quirk (`unaryMinus(y)` matching `-y`) that the original has by accident of `==`.
- `withOperator` now encodes how mathjs's `clone()` builds an `OperatorNode` (which flags to carry).
- `canonicalize` gained a branch to say what happens on an input the original handled by printing
  `undefined`.

Probe source behind the errors quoted in §2, §3, §5 (`foreign.d.ts` = this port's):

```ts
export let withOperatorA = () => (ast: MathNode, { op, fn }: { op: string; fn: string }) => {
  const result = ast.clone();
  result.op = op;
  return result;
};
export let appendRHSA = (OperatorNode) => (node: MathNode, pruned: readonly MConstantNode[]) => {
  pruned.forEach((term) => { node = OperatorNode("-", "subtract", [node, term]); });
  return node;
};
export let extractLHSA = () => function extractLHS(acc: { coef: number; name: string }[], root: MathNode) {
  acc.push({ coef: 1, name: "x" });
  return acc;
};
export let dbg = () => (x: number) => { debugger; return x; };
export let logA = () => (DEBUG: boolean, s: string) => { if (DEBUG) console.log("rhs", s); };
export let azA = () => (exp: MathNode) => exp.isOperatorNode && exp.args[1].fn == "unaryMinus" && exp.args[1].args[0].isSymbolNode;
export let negA = () => (rhs: MConstantNode) => -rhs.value;
export let seenA = () => (s: string) => { const seen = new Set<string>(); seen.add(s); return seen.size; };
```

```
cells.ts:2:22 [ts2339] Property 'clone' does not exist on type 'MathNode'.
cells.ts:3:3 [member-write] write to result.op: receiver is not Mut
cells.ts:11:3 [mutating-method] acc.push(): mutating method on a non-Mut value
cells.ts:15:69 [free-name] free name console (not an allowed intrinsic)
cells.ts:16:77 [ts2339] Property 'fn' does not exist on type 'MathNode'.
cells.ts:16:111 [ts2339] Property 'args' does not exist on type 'MathNode'.
cells.ts:17:50 [ts18049] 'rhs.value' is possibly 'null' or 'undefined'.
cells.ts:18:75 [mutating-method] seen.add(): mutating method on a non-Mut value
8 cells (default 8), 8 error(s)
```

`clone` is not declared in this port's `foreign.d.ts` because nothing in the port calls it; the
`member-write` on the next line is the error the original's form produces.
