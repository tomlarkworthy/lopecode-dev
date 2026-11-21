# soundscript-acorn and FN CROSSING: a record, 2026-11-21

The question: can a module `soundscript-acorn` give checked SoundScript a functional entrance to typed acorn trees,
with one unchecked cell (the parser) and everything else checked, and what language rule does that need? Everything
below was run in this folder with `bun <file>` on 2026-11-21, between 10:34Z and 11:20Z, on copies of the checker.
Every output quoted below, on `rule/` and `live/`, was run again at 11:19–11:20Z (`out/rerun-at.txt`), after the
last change to either `boundary.ts` (the two fixes of section 2). No
shipped file was edited. `lite/` was being edited by another agent while this ran (see Copies).

## Copies and their hashes

| copy | what it is |
|---|---|
| `base/` | `../nested-ast/recfix/` (recursive crossing + the four checker fixes) with `../nested-ast/recdisp/lite/boundary.ts` (tag dispatch, lazy messages), taken 2026-11-21T10:34:59Z (`out/copied-at.txt`); `lite/browser/` added from live `lite/` (`out/hashes-browser-from-live.txt`), which the nested copies lacked and `stdlib/runtime.ts` imports |
| `rule/` | base + FN CROSSING + the DEPTH change. Each edit carries `// FN CROSSING (ss-acorn)` or `// DEPTH (ss-acorn)` |
| `live/` | base with live `lite/boundary.ts`, `runtime.ss.ts`, `runtime-ss.ts` as they were at 11:03:13Z (`out/hashes-live-copied.txt`: boundary 28e448152c0c), then the same FN CROSSING edits |
| `cnt/` | base with `parse.ts` recording every text it parses (for completion's count) |

`out/hashes-base.txt` has every file of `base/`; `out/hashes-key.txt` the files this leans on. Against live `lite/`
at the end (`out/hashes-live-end.txt`, 11:05:35Z), `core.ts`, `parse.ts`, `complete.ts`, `events.ss.ts` are the
same as `base/`; `boundary.ts`, `walks.ss.ts`, `infer.ts`, `subtype.ss.ts`, `own.ts`, `runtime.ss.ts` differ, and
live `boundary.ts` changed again after `live/` was taken (28e448152c0c → 241bbba81631). Live `lite/` now has an
iterative copy walk and recursive aliases in S11.3–S11.5; this work started from the nested prototype's copies, not
from that. The spec statements quoted below were read from live `lite/soundscript/spec.ojs` during the session;
its hash at 11:16Z is in `out/spec-hash.txt` (6b15917f7de6). The hash written earlier in this record, 3d23ba2ba9f5,
was not saved with how it was computed and does not reproduce.

## 1. The rule

**FN CROSSING.** A parameter that takes a variable in another language (S11.1) may be annotated with a function type
with no type parameters and no rest parameter, whose parameters and result are each a type S11.3 accepts, or whose
result is `Promise<T>` with `T` one. It is accepted only at the top of the annotation, and not under `State`. The
value must be a function. The cell is given a frozen function of the boundary's own: at each call it copies each
argument against its parameter's shape (a deep-frozen copy), calls the other language's function with no `this`,
and checks and copies the result as a crossing value is checked (`checkShape`, no reuse between calls). A throw, a
result that does not match, or a throw while the result is read (a getter, a proxy trap, a promise's
`constructor`), is a fresh `TypeError` naming the function. The same function delivered again gives the
same wrapper.

### Size (`out/size.txt`, `diff base/lite/<f> rule/lite/<f>`)

```
boundary.ts:   +66 -6   of which boundaryShape 15 lines, crossFn and its helpers 39 (with both fixes of section 2),
                        cross() hook 1, copy1 case 1; the rest is DEPTH (section 6)
runtime.ss.ts: +4 -1    Shape gains { k: "fn"; ps; ret; async }, want() gains a case
core.ts:       +2 -2    calls boundaryShape(..., wrapper !== "State") instead of shapeOf
toolchain/ss-toolchain.ts, stdlib/runtime.ts, infer.ts: 0
```

On `live/` (iterative walk) the same blocks are inserted: 56 lines (`out/size-live.txt`, counted from the blocks;
a `diff` against live `lite/boundary.ts` no longer measures it, since that file changed after `live/` was taken). The rule does not touch the copy walk: `crossFn` calls `checkShape`, so it sat on either.

**The compiled form** needs no toolchain change: the shape is JSON in the call to `ss_cross`, as for any crossing
parameter (`ss-toolchain.ts:303`). From `bun toy.ts`:

```
function _twice(ss_cross,len) {return ((/*{lang:"ss"}*//*ss^…*/(len/*ss:: (s: string) => R*/) => (s/*ss:: string*/)/*ss:: number*/ => len(s).n * 2)(ss_cross(len, {"k":"fn","ps":[{"k":"str"}],"ret":{"k":"rec","props":[["n",{"k":"num"},false],["s",{"k":"str"},false]]},"async":false}, "twice.len")));}
```

**At the use site** the declared type is an ordinary function type on the parameter:

```ts
export const parse = (acornParse: (text: string, jsx: boolean) => Parse) => (text: string, jsx: boolean): Parse => acornParse(text, jsx);
```

`base/` refuses it with `[boundary-type] L505 acornParse: (text: string, jsx: boolean) => Parse cannot cross from
another language: it is or holds a function` (`bun check.ts base ss/acorn.ss.ts`).

**Verdicts** (`bun verdicts.ts`, `out/verdicts.txt`): base against rule on the nested corpus, 361 inputs, 1614
verdict lines: 1 input differs, the S11.3 reject case `const f = (g: () => number) => 1;`, now `f ok`. That case
would move to an accept list; its reject case would become `(g: { run: () => number }) => 1` (a function inside a
value).

## 2. Probes (`bun probes.ts`, `out/probes.txt`; `out/probes-live.txt` on `live/`)

Each probe is a module checked by `rule/`, compiled by its toolchain and run in a real Observable Runtime (`rt.ts`;
values awaited with `module.value`, no timers). `live/` gave the same lines except a cycle message
(`f(...).kids[0]: a cycle` without the parenthesis).

| probe | output |
|---|---|
| different value each call | `a value {"n":4…}`, `b value {"n":3…}`, `both value [1,2]`, `same value false`; `a again … {"n":4}`: the runtime does not run `a` again, so it holds its first result until an input changes |
| mutates its argument | `r value "f(...) threw: Attempted to assign to readonly property."`, `after value 2`; `argument frozen: true true`, `argument is the checked value: false` |
| throws an Error / a string / a function / a Proxy whose getter throws / a live object | checked `catch` sees `f(...) threw: boom` / `…: string "plain string"` / `…: a function` / `…: a value that could not be read` / `…: an object`; each `is a TypeError the boundary made: true` |
| returns an object whose read throws: a getter, a proxy `get` or `getPrototypeOf` trap; async, a real promise whose `constructor` getter throws (`bun probe-getter.ts`, `out/probe-getter.txt`, `-live.txt`) | after the fixes: `TypeError: f(...): reading the result threw: an object` (sync) and `g(...): reading the result threw: an object` or `g(...) threw: an object` (async), each `a TypeError: true`. The getter case was found by the review of this record, the promise case by the advisor afterwards. Before the fixes (`out/probe-getter-control.txt`, `ctl/` = `rule/` without them) the cell's error was `THE FOREIGN OBJECT; a TypeError: false` in 6 of the 9 lines. Fixes: the result check is under a `try`, and so is `Promise.resolve(r)`, which reads a promise's `constructor`. A getter that throws a `TypeError` whose message begins `f(...)` keeps its message: `TypeError: f(...) forged`, a fresh object with a string message |
| returns a function | `TypeError: f(...): expected an object, found a function` |
| returns a cyclic value | under an undeclared key: crosses, `{"n":1,"tag":"c"}` (only declared keys are walked); of a recursive type: `TypeError: f(...).kids[0]: a cycle (this value contains itself)` |
| wrong shape / class instance / extra keys | `f(...).n: expected number, found string "1"` / `found a P object` / crosses, `extra` dropped |
| returns a Promise (sync declared) | `TypeError: f(...): expected an object, found a promise` |
| keeps its argument, changes it later | `TypeError: Attempted to assign to readonly property.`; the checked value is a different object anyway |
| async, `(s: string) => Promise<R>` | resolves: `7`; wrong shape: `f(...).n: expected number, found string "7"` at the `await`; rejects: `f(...) threw: later boom`; returns `R` with no promise: `8`; a thenable whose `then` throws: `f(...) threw: then threw`. `base/`: `[boundary-type] … it is or holds a function` |
| re-entrancy: calls a checked function, and itself through the wrapper | `r … value 6`; `recursing through itself twice: 10`; `exposed is the raw function: false`, `frozen: true` |
| re-entrancy: calls an Action while a checked cell is computed | `use ran 20 times by its own call; use = value 19`: each call commits a write, the commit runs `use` again, which calls again. The shell stopped it at 20 |
| the function in an action | `act1: rejected [action-capture] f depends on state (the value of f, a cell in another language)…`; `act2` (calls `parse`, a checked cell that reads `f`): `rejected [action-capture] parse depends on state (parse reads f)` |
| refused forms | `{ run: (s) => R }`: `it is or holds run: a function`; `State<(s) => R>`: `it is or holds a function`; `<T>(x: T) => T`, `(...xs) => n`: `a function with type parameters or a rest parameter`; a function parameter or result: `a function whose parameter cb is or holds a function` / `whose result is or holds a function`; optional parameter `(s, n?) => …` accepted, `opt value -1` |
| same raw function delivered again / a new one | `same wrapper true` / `false`; a state cell on the wrapper keeps its value in the first case and starts again in the second (`kept = value 99`) |

### What stays guaranteed and what becomes trust

Guaranteed by the boundary, for a checked cell calling such a function (the probes above):
- every result has the declared type, as a deep-frozen copy holding only declared properties (S11.5);
- no argument the cell holds is reachable by the other language (it gets frozen copies);
- nothing thrown by the other language reaches checked code: a `catch` binds `unknown` (`infer.ts:1542` in live
  `lite/`, 1547 in `base/` and `rule/`), and what it gets is a `TypeError` the boundary made, whose message is a
  string. This holds for throws from the call and from reads of the result (the getter row above); it was false
  before those fixes. The message is not authenticated: the other language can choose it;
- the function cannot be used in an action, nor can a checked cell that reads it (S11.9 and S6.9, `out/probes.txt` §8).

Trusted to the shell cell:
- that it returns the same result for the same arguments. The checker does not promise this for checked functions
  either: `../NOTES-memo-soundness.md` §0 shows a checked function with no capability returning `[6,0]` for two
  equal calls. S9.3 is the precedent for writing the trust down: a foreign declaration is a "trusted signature",
  marked `/** pure */` or `/** effect */`;
- that it terminates and does not start writes. `out/probes.txt` §7 shows an Action called from inside it re-running the
  calling cell; neither the checker nor the boundary can see that;
- what the values mean: for `acornParse`, that positions, nids and node kinds are acorn's (section 5).

A throw from a checked cell after the call is the reading cell throwing (S11.4): cells that do not depend on it are
not affected. The runtime does no `equals` or caching that a varying result would break: a cell runs again only when
an input is computed again (S8.4), and the wrapper is the same object while the raw function is (`out/probes.txt` §9), so
`Object.is` on inputs (S6.2, S7.5) behaves as for any crossing value.

### Spec statements that state these, and sentences that would be needed (not written into the spec)

The statements read: S11.1, S11.3, S11.4, S11.5, S11.6, S11.9, S9.3, S6.9, S3.10, S8.4, S2.5, S2.7 (live
`spec.ojs`, hash 3d23ba2ba9f5).

- S11.3, replace "Any other annotation is `[boundary-type]`: a function type, …" with: "A function type may be the
  whole annotation when it has no type parameters and no rest parameter, and its parameters and its result, or the
  `T` of a `Promise<T>` result, are annotations this statement accepts; `x: () => number` is accepted, `x: { run:
  () => number }`, `x: (f: () => number) => number` and `x: State<() => number>` are `[boundary-type]`."
- S11.4, add: "For a function, the check is made at each call: each result is checked against the result type, and
  a result that does not match, or a throw from the function, makes the call throw a `TypeError` that names the
  function, such as `parse(...).ast.program: expected …` or `parse(...) threw: …`. What the function threw, during
  the call or while its result is read, does not reach the cell. With a `Promise<T>` result the returned promise rejects with that `TypeError`."
- S11.5, add: "A function is given as a function of the boundary's own. Each argument the cell passes is given to the
  other language as a deep-frozen copy, so the other language never holds a value the cell holds."
- S11.6, add: "The same function delivered again, with no other function delivered to that parameter in between, is
  the same function to the cell (A, B, A gives a new one for the second A). Each call's result is a new copy."
- S11.9, add: "This includes a function: an action may not call it, nor use a cell that reads it."
- New, after S11.10: "A function from another language is trusted to give equal results for equal arguments, to
  end, and to call no action or other code that writes. The checker does not check this; a function that calls an
  action may make the cell that calls it run again (S6.14)."

## 3. Alternatives with their costs

**(a) No new rule: the shell parses and hands trees over as data** (the nested prototype). A text the checked code
computes has to leave as a cell value, an Observable JavaScript cell parses it, and the tree crosses back into
another cell (S11). Measured round trip on `events.ss.ts` (3977 nodes) in a real Runtime (`bun alt-a.ts`,
`out/alt-a.txt`):

```
rule: per new text: (a) through a cell round trip 12.35 ms; (c) the rule, a call 11.77 ms
live: per new text: (a) through a cell round trip  7.98 ms; (c) the rule, a call  7.00 ms
```

So per text the cost is close. The cost of (a) is where the logic goes: a checked function cannot ask for a parse
in the middle of its run. `distinctNames` (parse, rename the duplicate, parse again) and completion's variants
(`complete.ts` cuts the cell, closes brackets, tries again) are loops whose next text depends on the last parse. Under
(a) they move into the shell, unchecked (the nested prototype's `nestDistinct`, `../nested-ast/adapter.ts:89-103`), or
become one runtime turn per step. Here `distinctParse` is 12 checked code lines (`ss/consumer.ss.ts`, `out/lines.txt`).

**(b) A narrower rule.**
- only `string => Data`: `acornParse(text, jsx)` becomes two shell functions or a text-encoded flag; saves the
  argument loop and the async branch, about 4 of the 56 lines.
- only functions marked at the use site, as S9.3 marks foreign declarations (`/** pure */` on the parameter): keeps
  the S11.3 reject case rejected for unmarked functions and puts the trust where it is read. Not built; it would need
  `core.ts` to read the parameter's leading comment (the registry reads markers for foreign declarations), a few
  lines.
- only functions declared in a module's own shell cell: there is no such marker on a variable of a notebook module
  today; S11.1 treats an Observable JavaScript cell, a raw cell and an import alike.

**(c) The general rule**, as built.

**Recommendation: (c), synchronous and async, top of the annotation only**, with the trust sentence above. If the
owner wants the trust visible where it is taken, (b) with the `/** pure */` marker costs a few lines more and changes
no other result here. (a) works for one parse per value but puts every loop that depends on a parse into unchecked
code.

## 4. Cost per call

`bun bench.ts` (`out/bench.txt`, `rule/`) and `SSA_COPY=live bun bench.ts` (`out/bench-live.txt`), the nested
corpus, 360 inputs that parse, 33903 nodes, median of 9 rounds:

```
                                                       rule/              live/
bare acorn + TS plugin                                 29.5 ms 0.87       35.8 ms 1.06  µs/node
base/lite/parse.ts                                     31.9 ms 0.94       33.2 ms 0.98
shell acornParse alone (parse + rebuild)               59.7 ms 1.76       59.5 ms 1.76
checkShape of the shell's value alone                  44.6 ms 1.31       21.6 ms 0.64
the wrapper (shell + result checked and copied)       101.6 ms 3.00       80.3 ms 2.37
M.parse (the checked cell calling the wrapper)        103.6 ms 3.05       80.5 ms 2.37
a second crossing of the result (an importing module)  44.4 ms 1.31       20.9 ms 0.62
M.preorder / M.byNid / M.parents                       0.08 / 0.06 / 0.06 µs/node (both)
M.kids at every node                                   0.21 (rule/), 0.18 (live/) µs/node
```

Through the rule `parse` costs 3.2× `parse.ts` on `rule/`, 2.4× on `live/`. The two runs were sequential, not
interleaved; the bare acorn row moved from 0.87 to 1.06 µs/node between them, so differences under ~20% between the
columns are not separable from drift. The shell's rebuild (0.89 µs/node over
acorn) is the same code as the nested adapter (1.33 µs/node in `../nested-ast/out/bench.txt`) plus the per-node row
check that makes unknown nodes `Other`.

**Completion** (`bun complete-cost.ts`, `out/complete-cost.txt`; `out/complete-cost-live.txt`).
`completionsAt` on `events.ss.ts` (63 cells), four positions. A warm call parses 1 text (3977 nodes, about 19.4k
chars). The first call of the run (cell 62, cold caches) parsed 4 texts (9508 nodes); the first call at each later
position parsed 1:

```
                                 today     parse.ts on its texts   through the module    added
rule/  cell 62 member .includes  12.4 ms   2.47 ms                 10.42 ms              7.95 ms (64% of today)
       cell 61 member .hid       10.1      2.01                     9.39                 7.38 (73%)
       cell 60 member .handleAt   9.0      1.97                     9.16                 7.19 (80%)
       cell 62 name prefix wa     8.8      1.89                     8.54                 6.65 (75%)
live/  cell 62 member .includes  15.7      2.71                     7.88                 5.17 (33%)
       cell 61 member .hid       10.6      2.15                     7.26                 5.11 (48%)
       cell 60 member .handleAt   8.8      2.04                     6.12                 4.08 (46%)
       cell 62 name prefix wa    10.1      2.00                     6.42                 4.42 (44%)
```

How many variants the checked port of `completionsAt` would parse per keystroke is what the TypeScript does today:
1 when warm, at these four positions.

## 5. The union and the module

### Completeness: node types from acorn's source

`bun gen/node-types.ts` (`out/node-types.txt`) walks the AST of `acorn/dist/acorn.mjs` (8.19.0) and
`@sveltejs/acorn-typescript/index.js` (1.0.13) and takes the type argument of every `finishNode`/`finishNodeAt` call
and every `x.type = "T"` on a node: 155 node types (acorn 73, plugin 110). 20 sites pass a non-literal; all resolved
on the AST (conditionals, `"JSX" + fragmentOrElement`, `keywordTypeFromName(value)`'s returns, a parameter's
arguments at every call of its method, e.g. `ts:2613 kind -> TSIntersectionType, TSUnionType`). Unresolved: 0. No
object literal has a `type:` property with a node type name. The 133 types the flat census saw are all among the 155;
22 are not in it (`DebuggerStatement Decorator ImportAttribute … TSTypePredicate WithStatement`).

Fields are not in the source in one place. `bun gen/census.ts` (`out/census.txt`) records each type's fields over 421
inputs (the nested corpus, both synthetic files, every `.ts` of `base/lite`), plus the fields `acorn.d.ts` declares
for a type the census never saw a field of (7 added). Four types were never seen (`ParenthesizedExpression`, only
with `preserveParens`; `WithStatement`, a syntax error in a module; `TSIntrinsicKeyword`; `TSTypeCastExpression`).
`bun gen/gen.ts` writes `ss/acorn-types.ss.ts` (155 records + `Other`, 335 fields), `ss/acorn-kids.ss.ts` and
`out/table.json` (`out/gen.txt`).

### An unknown node at the boundary: a typed catch-all row, chosen in the shell

The shell (`shell/acorn-shell.ts`) builds a record only when the node fits its row: no key the row lacks, every
required field present, no node in a value field. Anything else is `Other { kind, fields, props }`, children kept.
Tag dispatch stays on: `Other` has the literal tag `"Other"`. A refusal would make `parse` throw on source that
acorn parses.

Three census gaps were found by running, each kept:

```
diff-parse.ts, tools/*.ts, before the row-fit check:
TypeError: acornParse(...).ast.program.body[0].declare: expected boolean, found null
complete-cost.ts, before value fields were checked:
TypeError: acornParse(...).ast.program.body[0].body.body[1].typeParameters: expected null, found an object
why-other.ts on the first completion call: TSDeclareFunction: key typeParameters (1); TSExpressionWithTypeArguments: lacks typeParameters (3)
```

Fixes: the row-fit check above; a field the census saw only null takes the kind its key has on every other type (9
fields, e.g. `TSMethodSignature.typeParameters as node`); three synthetic lines (`out/why-other-before-more.txt`).
After them `bun why-other.ts`: `first completionsAt call: none`, `tools/*.ts: none`. What remains: a field the census
never saw is still learned only by meeting it, and until then the node is `Other`. Types are complete from source;
fields are not.

One type's key order differs between nodes: `ArrowFunctionExpression` has `returnType` before `params` on 3152
nodes, after it on 1 (`out/gen.txt`). `childrenOf` takes the majority order; the shell numbers nids in each node's
own order.

### parent, id, helpers

- **No `parent` field**: a tree holding its parent contains itself and is refused (S11.4). `parents(ast)` gives the
  parent's nid at each nid.
- **`nid`**, not `id` (acorn's `id` is a name). The boundary does not check nids; `preorder(ast)` does (0.11 µs/node):
  every nid below `count` once, each subtree holding the nids from its own to its own + its size − 1.
- What the checker takes from `parse.ts` (`bun gen/survey.ts`, `out/survey.txt`, on the AST of `base/lite`): `parse`
  (9 files), `kids` (infer, island, capture, own, facts, ss-toolchain), `isFn` (infer, capture, own), and on a
  `Parsed`: `.program`, `.leading`, `.comments`, `.line`. The survey binds names without scopes, so its `core.ts`
  rows `.type .name .msg .typeAnnotation` are another binding named like a `Parsed` one.

### The module's checked cells (`bun lines.ts`, `out/lines.txt`; code lines: lines holding a token)

```
ss/acorn.ss.ts       12 cells: preorder 16, leading 12, byNid 9, lineIn 8, parents 8, lineStarts 5, lineAt 4,
                               isFn 2, kids 2, parse 1, kindOf 1, TYPE_KEYS 1
ss/acorn-kids.ss.ts  10 cells: kidsGroup1–6 26 each, kidsGroup7 8, childrenOf 2, kidOne 1, kidMany 1
ss/acorn-types.ss.ts 163 type declarations, 319 lines, no cells
shell/acorn-shell.ts the unchecked part: 7 cells, 41 code lines; acornParse 35, the other six 1 each (TS, TSX, ROWS,
                     DROP, isNode, valueOf)
```

`childrenOf` was one 111-line cell in the nested prototype; here it is seven group cells of at most 21 cases and one
cell asking each in turn (`kidsGroup1(n) ?? … ?? []`). Every cell checks on `rule/` and on `live/` (`bun check.ts
<copy> <file>`): 0 not ok; `checkSources` median 85.1 ms (kids), 104.5 ms (module), 220.9 ms (consumer) on `rule/`; 74.6, 110.7, 199.1 ms on `live/`
(`out/check-rule.txt`; `out/check-live.txt` for `live/`). The largest
checked cell is 26 lines, the shipped maximum.

## Evidence: differentials

**`parse` against `parse.ts`** (`bun diff-parse.ts`, `out/diff-parse.txt`; `out/diff-parse-live.txt` is the same).
Every node in acorn's pre-order against the node with that nid: kind, start, end, line, every value field, every
child by nid; the comments; and 30/50/70% truncations as in `../flat-ast/q2.ts`.

```
census inputs: 422 inputs, 421 parse (0 where parse.ts and the module disagree on ok, 0 where the module's parse threw); 152802 nodes, 0 differ; comments differ on 0; Other nodes 0
  truncations: 1266, 1060 throw in parse.ts; error value equal (message, pos, line, column) 1060, differ 0
held out (365 files of tools/): 365 inputs, 365 parse (…); 260675 nodes, 0 differ; comments differ on 0; Other nodes 0
  truncations: 1095, 963 throw in parse.ts; error value equal (message, pos, line, column) 963, differ 0
control (first Identifier renamed in the copy): 20 inputs …; 2041 nodes, 20 differ
```

The held-out set is the 365 TypeScript files at the top of `tools/`, none in the census; before the synthetic lines
were added it had 1 `Other` (`out/held-out-other.txt`: a `TSExpressionWithTypeArguments` with no type arguments).
An early harness run showed differences, all `ImportSpecifier: imported: child` (count not saved): acorn shares one object
between `imported` and `local`, and the harness indexed it once; it now numbers each visit, as the shell does.

**The consumer against `core.ts`** (`bun diff-consumer.ts`, `out/diff-consumer.txt`; `out/diff-consumer-live.txt`
the same). `syntaxCheck` = `distinctParse` + module shape + syntax pass, reaching the tree only through `parse`,
against `../nested-ast/orig/lite/core.ts` (`checkSources(...).module` filtered to the shape rules, its cells by name and line, and
`syntaxPass` sliced out by its AST span):

```
consumer, corpus: 361 inputs, 0 skipped, 1 parsed more than once (distinct names); 1004 cells
  module shape: 361 same, 0 differ; inputs with a module-shape error: 16
  syntaxPass: 1004 same, 0 differ; cells with a diagnostic: 14 (16 diagnostics)
  parse calls through the wrapper: 362
consumer, synthetic: 3 inputs; module shape 3 same; syntaxPass 20 same, 0 differ
consumer, synthetic-n and -t: 2 inputs; syntaxPass 2 same, 0 differ
control (namedByParent ignores computed): shape differ 0, syntaxPass differ 1
control (moduleLevelRule drops no-var): shape differ 1, syntaxPass differ 0
control (namedByParent compares type, not nid): shape differ 0, syntaxPass differ 1
control (TYPE_KEYS without typeAnnotation): shape differ 0, syntaxPass differ 3
control (distinctParse gives up at once): shape differ 0, syntaxPass differ 0, skipped 1 (0 without the mutation)
```

A dead end, kept: the first type-position control removed `returnType` and gave 0 differences
(`out/diff-consumer-returnType-control.txt`). It is an equivalent mutant: a `returnType` holds a `TSTypeAnnotation`,
whose `typeAnnotation` key is still a type position. `synthetic-t` (`(x: viewof) => x`) and a control without
`typeAnnotation` replaced it.

## 6. Depth (`bun probe-depth.ts`, `out/probe-depth.txt`; `out/probe-depth-live.txt`)

The largest n each stage takes (doubling then bisecting up to 40000). From `rule/` after the change:

```
                       acorn   today's checker      shell   copy, no   copy, 5000  copy, 2000 levels   consumer
                               returns / cell ok            limit      records     incl. arrays        syntaxCheck
a+a+…                  >32768  21278 / 12277†       14504   6370       4991        1988                6369
[[…]]                  2327    2304* / 2154*        2154*   2112*      1992*       995                 1897*
x => x => …            1570    1535* / 1562*        1562*   1539*      1539*       1539*               1539*
a.b.b.…                >32768  15168 / (rejected)   14503   6368       4990        1987                6368
```

The consumer column breaks where the copy does: on `rule/` the recursive copy, not the checked visitors, is the first
to overflow. At 6370 it arrives as `TypeError: acornParse(...): reading the result threw: Maximum call stack size exceeded.`:
the wrapper reports any throw while the result is checked under that label, and here the throw is the boundary's own
copy overflowing, not a getter. (Before the label was split from `threw`, the 11:16Z run read `acornParse(...)
threw: …`, which named the wrong side.)

† Past 12277 the probe printed its own formatting error, not the checker's answer (`checkSources` returned a cell with
no message). `bun probe-depth-12276.ts` (`out/probe-depth-12276.txt`): `12276: f ok`, `13000: f unsupported` with no
error message, `21275: throws RangeError`. Where between 12277 and 13000 the status changes was not bisected.

`*` = acorn's own limit: `SyntaxError: Not enough stack space to parse input` (acorn catches its stack overflow; the
shell returns it as `ok: false`). The same text's limit moves by up to 10% between runs and call sites
(`out/probe-depth-run1.txt`, and the 11:20Z run against the earlier one), since acorn's limit is the stack left at
the call.

The change, `rule/lite/boundary.ts` `// DEPTH`: depth counts objects checked against a record type (and `unknown`
objects), not arrays; the limit is 5000; the message gives the path's two ends:

```
TypeError: x.ast.program.body[0].declaration.declarations[0].init.body. … .left.left.left.left.left.left.left.left.left.left.left.left: nested deeper than 5000 objects
```

With the nested prototype's count (arrays as levels, 2000) `[[…]]` stopped at 995 and `a+a+…` at 1988. With 5000
records the boundary refuses `a+a+…` from 4992 terms, which today's checker accepts up to at least 12276. Without a
limit the recursive copy overflows at 6371 (largest 6370).

On `live/` the iterative walk removes the copy as a limit: `a+a+…` and `a.b.b.…` cross up to the shell's own
recursion (14504), and the first stage to fail is the shell; through the consumer that arrives as `TypeError:
acornParse(...) threw: Maximum call stack size exceeded.`, the throw conversion of section 2. Whether the checked
recursive visitors (`syntaxPass`'s walk, `preorder`'s `size`) overflow before 14504 was not separated: on `live/` the
shell fails first. Recommendation: the iterative walk now in `lite/`, with FN CROSSING on top (56 lines); the
record-depth limit only for a recursive walk.

## Packaging as `@tomlarkworthy/soundscript-acorn` (read, not built)

Read `lite/soundscript/ts-cells.ts` and `build.ts`. Today the checker module carries the parser as its one attachment,
`acorn-typescript.js.gz` (`PARSER_FILE`, built from `PARSER_ENTRY`: `export * as acorn from "acorn"; export {
tsPlugin } from "@sveltejs/acorn-typescript"`). Three cells read it (`PARSER_CELLS`): `parser_lib` streams the
attachment through `DecompressionStream("gzip")`, imports it from a blob URL, and `acorn = parser_lib.acorn`,
`tsPlugin = parser_lib.tsPlugin`. SoundScript sections (`SS_FILES`) are compiled per cell by `compileCellText` and
kept whole with their type declarations; `SS_CHECKED_WITH` checks a section with the sections whose cells it takes,
"where they are one module".

What `soundscript-acorn` needs:
- the attachment and the three parser cells, moved from the checker module (the checker would import `acorn` and
  `tsPlugin` from it, or keep its own copy);
- `acornParse` as an Observable JavaScript cell taking `acorn` and `tsPlugin`, with `out/table.json` (155 rows) as a
  literal in the cell or a second attachment;
- `acorn-types.ss.ts`, `acorn-kids.ss.ts`, `acorn.ss.ts` as SoundScript sections, checked together.

Across modules there are two costs, from the spec and `core.ts`:
- a consumer in another module that imports `parse` takes an import, which S11.1 treats as another language. Under
  FN CROSSING the call crosses a second time: 0.63 µs/node on `live/`, 1.47 on `rule/` (section 4);
- `import type` is skipped (`core.ts:124`, S1.3), so the consumer module declares `Parse`, `AstNode` and the 155
  records itself (319 lines, generated).

A consumer in the same module (sections checked together, as `SS_CHECKED_WITH` does for the runtime and checker
sections) pays neither. That is how the checker port would take it.

## Unsure

- Determinism, termination and no-writes of the shell function are trust, stated, not checked (section 2).
- Fields are learned from a census; a new construct with an unseen field arrives as `Other` until the census meets
  it. The consumer ports switch on `kindOf` only where the nested port did.
- The (b) marker variant was not built; its line count is an estimate.
- Browser stack sizes were not measured; the 5000-record limit is set from bun's stack (copy overflow at 6371).
- `syntaxPass`'s recursion limit on `live/` was not separated from the shell's.
- Completion's variant count was measured at four positions in one module.
- The error messages a checked cell sees are not authenticated: a throw whose message begins `f(...)` keeps its
  message, and a copy overflow inside the boundary is reported as the function's throw (section 6).
- An earlier `((…))` depth run had `preorder` fail with `TypeError: undefined is not an object (evaluating
  'ast.count')` where the other stages said `no parse`; the 11:20Z run says `no parse`. The earlier harness state
  was not kept, so whether that was the harness or `preorder` on `ok: false` is not known.

## Review, 2026-11-21

`/review-notebook` on this file (fresh agent, 126k tokens, 6m04s): BLOCK, 7 findings. Taken: the throwing getter
leaked the foreign object to the cell (fixed in `rule/` and `live/`, probe and control added, guarantee reworded);
`rule/` outputs older than the final table and boundary (every output rerun at 11:19–11:20Z); five counts against their outputs (335
fields, shell 41 lines, `distinctParse` 12, `nestDistinct` lines, first-call parses); the `+48` and `orig/` paths
and three unsaved numbers (spec hash, check times, the early diff count: now saved or marked not saved); S11.6
wording (A, B, A); the 12276 depth row; the overflow off-by-one and probe references. After the fixes the advisor
found a second leak on the async path (`Promise.resolve` reading a throwing `constructor`), fixed and probed the
same way. The review was not run a second time. Its line was not added to the skill's `Runs` list, which is outside
this folder.

## Files

`toy.ts`, `rt.ts`, `probes.ts`, `probe-getter.ts`, `probe-depth-12276.ts`, `check.ts`, `lines.ts`, `mod.ts`, `bench.ts`, `complete-cost.ts`, `alt-a.ts`,
`diff-parse.ts`, `diff-consumer.ts`, `verdicts.ts`, `probe-depth.ts`, `why-other.ts`; `gen/` (node-types, census,
synthetic, gen, survey); `ss/` (the module and the consumer); `shell/acorn-shell.ts`; outputs in `out/`; `ctl/` is `rule/` without the two fixes (the control).
