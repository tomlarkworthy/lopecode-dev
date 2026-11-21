# Flat AST: acorn outside, the parse handed to checked code as a table

Measured 2026-11-21. The final pass ran every script once, 07:57:58Z–07:59:02Z (`out/run-at.txt`). `lite/*.ts`
hashes were taken before (`out/hashes.txt`) and after (`out/hashes-after.txt`); they differ in one file,
`lite/subtype.ss.ts` (679e71de5e00 → aa21f6cc2bad), which another session edited during the pass. It is a corpus
input, not a checker file read by the ports. Prototype only; no shipped file was edited.

Asked: can the checker's AST reach checked SoundScript as a flat table (nodes in an array, children as indices),
what the adapter costs, what visitors over indices look like, what callers that parse many variants need. Follows
`selfhost/checker-survey/RESULTS.md` P1/P3.

`lite/` changed during the day (another session): `reservedName`/`RESERVED_MSG`/`viewofInputName` moved into
`lite/messages.ss.ts`, and `lite/messages.ss.ts` and `lite/subtype.ss.ts` appeared. Checker files went 21 → 25 and
the corpus grew. Numbers below are from the final pass only.

## Commands

```
bun selfhost/flat-ast/kinds.ts        # node types the checker names, on its AST (out/kinds.txt, kinds.json)
bun selfhost/flat-ast/census.ts       # fields and value kinds per node type, corpus + synthetic (out/census.json)
bun selfhost/flat-ast/gen.ts          # ast-a.ss.ts (121 records + Other), ast-a-all.ss.ts (133 + Other), out/spec-*.json
bun selfhost/flat-ast/roundtrip.ts    # re-nested table vs acorn; reads of dropped/normalised fields
bun selfhost/flat-ast/q1.ts           # the union checks and crosses
bun selfhost/flat-ast/check.ts visit-{a,b,c}.ss.ts   ;  bun selfhost/flat-ast/profile.ts visit-{a,b,c}.ss.ts
bun selfhost/flat-ast/diff.ts         # differential and controls
bun selfhost/flat-ast/q2.ts           # adapter cost, cross cost, error values, size, distinctNames, completionsAt
bun selfhost/flat-ast/lines.ts        # code lines, whole-checker counts
bun selfhost/flat-ast/probe-{call-cost,union-scaling,wrapper-cost,local-helper-cost,tree-cost,cross-order,alias-eq}.ts
```

Outputs are in `out/<script>.txt`. Corpus (`corpus.ts`): every `spec_rejects` case (tsx, with its outside and shell
cells, as `verify.ts` checks them), every `fixtures/**/cells.ts(x)`, every `lite/*.ss.ts`. That is 361 inputs. 360
parse with `parse.ts`; the 361st (`spec#7 S1.6 duplicate-cell`) parses after the distinctNames retry (`flatDistinct`,
2 parses). `roundtrip.ts` adds the 3 sources of `synthetic.ts`, which cover node types and visitor cases the corpus
lacks (364 inputs).

## 1. The union checks and crosses

**Node types** (`out/kinds.txt`). `kinds.ts` parses the 25 `lite/*.ts` (no tests) and collects four things:
- strings compared with a `.type` read;
- cases of a switch on one;
- regex literals tested on one, expanded against the 133 census types;
- keys of tables indexed or `.has`-ed by one.

That gives 119 named types:
- 15 only through `/^TS/.test(p.type)` (`own.ts:213`);
- 2 (`ObjectProperty`, `ParenthesizedExpression`) that acorn, as `parse.ts` configures it, never produces.

The survey's file set (`inventory.ts` FILES) adds `ClassBody`, `ExportDefaultDeclaration` and `Block`. The survey
union (`probes/ast.ss.ts`: 104 type literals, read off its AST) is covered except `Program` and `TemplateElement`,
which the checker reaches through fields. 19 `.type` reads match no pattern; all are message text or
`typeof x.type === "string"` guards.

Two claims here rest on a text search, not the AST:
- `Block` is a comment type (`ss-toolchain.ts:358` `c.type === "Block"`);
- `cross()` is applied only at `ss-toolchain.ts:304`.

Union A is the named set ∩ census, plus `ClassBody`, `ExportDefaultDeclaration`, `Program` and `TemplateElement`:
**121 records + `Other`** (`ast-a.ss.ts`, 250 code lines, generated). Any other node type (12 in the census, e.g.
`ImportSpecifier`, `JSXClosingElement`) is an `Other` row. It keeps the acorn type in `kind`, its children in
`fields`, and its other fields in `props`. Every row has `start end line parent field after`. Rows are in pre-order,
in each node's own key order, so `after` is one past the last row of the subtree.

`const f = (x) => x.y;` (rows from `flatParse`):

```
0 {"type":"Program","start":0,"end":21,"line":1,"parent":-1,"field":"","body":[1],"sourceType":"module","after":9}
1 {"type":"VariableDeclaration",…,"parent":0,"field":"body","declarations":[2],"kind":"const","declare":null,"after":9}
2 {"type":"VariableDeclarator",…,"parent":1,"field":"declarations","id":3,"init":4,"after":9}
3 {"type":"Identifier",…,"parent":2,"field":"id","name":"f","typeAnnotation":null,"optional":null,"after":4}
4 {"type":"ArrowFunctionExpression",…,"parent":2,"field":"init","returnType":null,"id":null,"expression":true,
   "generator":false,"async":false,"params":[5],"body":6,"typeParameters":null,"after":9}
5 {"type":"Identifier",…,"parent":4,"field":"params","name":"x",…,"after":6}
6 {"type":"MemberExpression",…,"parent":4,"field":"body","object":7,"property":8,"computed":false,"optional":false,"after":9}
7 {"type":"Identifier",…,"parent":6,"field":"object","name":"x",…,"after":8}
8 {"type":"Identifier",…,"parent":6,"field":"property","name":"y",…,"after":9}
```

**Check and cross** (`out/q1.txt`). `nodeCount` and `calleeNames` take `flatParse: Parse` from an outside cell:

```
baseline (2-member Parse, one cell):        0.6 ms
union a (121 + Other): checkSources median  8.5 ms, ok=true; boundary shape 41364 chars of JSON
union all (133 + Other):                    7.8 ms, ok=true
cross() over 361 corpus parses (33720 nodes): 0 rejected; 9.93 µs/node (a), 10.06 (all)
```

A control row of type `"Bogus"` is rejected by `cross()` with `flatParse: expected an object or an object, found
an object`. The message names nothing.

**Dead end.** The first union had 111 records. Its regexes were expanded against the corpus types only, so the
synthetic source's TS types (`TSOptionalType`, `TSQualifiedName`, …) and the survey's toolchain names were missing.
It was regenerated after checking against the survey union and `analyze.txt`.

## 2. The adapter

`adapter.ts` is unchecked and runs outside; 108 code lines in all:
- `flatten` (layout A) 40;
- `flattenB` 20;
- `flatParse` 9;
- `flatDistinct` 15;
- helpers.

It also needs `out/spec-a.json` (121 types, 264 field entries), generated by `census.ts` (54 lines) and `gen.ts`
(72). `flatten` throws on a field, or a hole in a list, that the census never saw.

**Per-parse cost** (`out/q2.txt`). 360 inputs, 163343 chars, 33720 nodes; median of 7 rounds after a warm pass:

```
bare acorn + TS plugin parse      28.7 ms   80 µs/input   0.85 µs/node
parse.ts parse                    32.1 ms   89 µs/input   0.95 µs/node
flatParse, layout A               47.4 ms  132 µs/input   1.41 µs/node
flatParse, layout B (generic)     40.4 ms  112 µs/input   1.20 µs/node
cross(), layout A                341.3 ms  948 µs/input  10.12 µs/node
cross(), layout B                111.2 ms  309 µs/input   3.30 µs/node
```

**`cross()` depends on the order of the union's members** (`out/probe-cross-order.txt`). `boundary.ts` `copy` tries
the members in order and throws on each miss:

```
alphabetical: shape members begin ArrayExpression, ArrayPattern, …   cross over the corpus 1710 ms
by frequency: shape members begin Identifier, Literal, TSTypeAnnotation, MemberExpression   337 ms
```

So `gen.ts` now emits `FNode` most-frequent first. Earlier runs measured the alphabetical order at 41–43 µs/node.
A copy that dispatches on `type` was not tried; that would be a runtime change.

**Error as a value.** 1080 corpus texts were truncated at 30/50/70%. 904 of them throw in `parse.ts`. In all 904,
`flatParse` returns `{ ok: false, message, pos, line, column }` equal to the thrown error's. Example:
`{"ok":false,"message":"Unexpected token (1:3)","pos":3,"line":1,"column":3}`.

**`Parsed` preserved.**
- `Parsed` is `{ program, comments, src, leading(n), line(pos) }`.
- The table carries `nodes`, `comments` (each with `line`), `src` and `lineStarts`.
- `line` and `leading` are checked cells (`lineOf` and `leading` in `visit-a.ss.ts`): 20 code lines, against 19 in
  `parse.ts`.
- `leading` takes a start position, not a node.
- Differential at every node: lineOf 33731 same / 0 differ; leading 33731 / 0 (203 nodes with a leading comment).

**Round trip** (`out/roundtrip.txt`). The re-nested table equals the acorn AST in 363 of 363 parseable inputs, for
both unions (34517 nodes, 52 Other rows), and parent/field/after are consistent. The control sets one
`MemberExpression.property` to its `object`, and that input then compares unequal.

The normalisations, and the reads of them, were checked on the AST of 31 files (`lite/*.ts` and the survey's FILES):
- **`loc` → `line`.**
  - 2 reads are `.loc.start.line`.
  - The other 2 copy `loc` into nodes the checker synthesizes: `infer.ts:649` (JSX as a call) and `infer.ts:1613`
    (a switch case as `===`). Those nodes have no row.
- **`extra` dropped.** 0 reads.
- **Absent/undefined → null.**
  - 1 checker read compares a field with `undefined`: `infer.ts:584 e.bigint !== undefined`. A port writes
    `!== null` there. The 2 `render.ss.ts` hits are not AST reads.
  - 0 reads compare a census-absent field with `null`.
  - The 7 `"k" in x` tests are all on shapes and records, not nodes.
- **A regex or bigint Literal's `value` → null.** `regex` and `bigint` are kept, and `infer.ts:582–585` reads them
  before `value`.

**Identity.** Of 34515 acorn node objects, 2 are reached by two paths (`ImportSpecifier.imported` and `.local`, in
the synthetic source). Each becomes two rows. The checker never names `ImportSpecifier`.

## 3. Visitors over indices

**What was ported:**
- the module shape: the cell loop of `checkSources` (builtin-type-name, cell-not-function,
  module-level/no-enum/no-namespace/no-class/no-var, duplicate-cell);
- `syntaxPass`, from `core.ts`;
- `captures`, with `refs`, `bound` and `declaredIn`, from `capture.ts`.

`captures` was taken because it reads only the AST and a taint map, so it can be compared without a `Checker`.
The cost of that choice: `captures` has no node `===` and no node-keyed map, and `opaqueCaptures`/`ownership` have
both. The identity evidence below therefore rests on `syntaxPass` alone.

**Three layouts on `syntaxPass`** (`out/check-*.txt`, `out/profile-*.txt`, `out/lines.txt`):

| layout | file | check, median of 5 | syntax-pass code lines (orig 24) | cross µs/node |
|---|---|---|---|---|
| A: per-kind records, `nodes` passed to every helper | `visit-a.ss.ts` | 1508.5 ms for 31 cells, of which the syntax-pass cells ≈ 313 ms | 55 | 10.1 |
| B: one generic row `{type, kids, keys, props}` | `visit-b.ss.ts` | 6.2 ms | 68 (16 are `kid`/`text`/`flag`) | 3.3 |
| C: A's records, with the table a cell (`tree`) that each visitor takes as an input; calls pass indices | `visit-c.ss.ts` | 22.1 ms | 54 | 10.1 (same data as A) |

All three check: 0 cells not ok. The check times include `lite/messages.ss.ts` and the union type file in front.
The C figure covers the 12 syntax-pass cells; module shape and `captures` exist only in layout A. Their check time
in C is extrapolated, not measured.

**Why A is slow** (`out/probe-call-cost.txt`, `out/probe-union-scaling.txt`, `out/probe-wrapper-cost.txt`). Every call
site that passes the table, or an unnarrowed row, to a function typed over `FNode` costs a union-to-union
assignability check:

```
121-member FNode: g calls f(nodes, j) 1/2/4/8 times: 35.5 / 85.1 / 127.2 / 229.8 ms over the base
  h(row), row: FNode                  36.46 ms per call
  h(row), row narrowed to Identifier   0.61 ms per call
per call, by union size k: 8 → 0.45, 16 → 1.08, 32 → 2.61, 64 → 8.01, 126 → 31.36 ms
2-member FNode: ≤ 0.2 ms for 8 calls
type Table = { nodes: FNode[] }: 28.31 ms per call;  interface Table: 28.96
local helper closing over the table, called with an index: 0.00 ms per call
table as a cell input, helper cell called with an index:  0.03 ms per call
```

- The cost grows about as k².
- Wrapping the table in a named type does not avoid it.
- An annotated return does the same: `tree = (flatParse: Parse): FNode[] => …` cost 32.2 ms, and without the
  annotation −2.2 ms (`out/probe-tree-cost.txt`). Dropping that annotation took C from 45.8 to 22.1 ms.
- In C, the first `bansAt` cost 83 ms, from two `kindOf(x)` calls with an unnarrowed row; `kindOf(i)` cost 2.5 ms.
- The rule for C: never pass, or annotate a return as, an unnarrowed `FNode`; pass indices.
- Where in the checker this is spent was not diagnosed. `registry.ts` sub was being ported concurrently.

**Chosen: C.**
- Reads are typed: `p.property`, where B has `kid(p, "property")`, and in B a misspelt key returns null where the
  checker cannot see it.
- The check is cheap once the rule above holds.
- Crossing costs 3× B (10.1 against 3.3 µs/node).

Two open costs:
1. C assumes one table per run of the visitor graph. One `checkSources` holds several parses: the cells, `foreign.d.ts`
   and `shell.ts`, and `Registry` loads three declaration parses and keeps `parsed: p` per type, so `convert` walks
   nodes of all of them. A bare index does not name a node there. One way: one table with several `Program` roots,
   so an index is unique across parses. Not built.
2. completionsAt's variants (§4).

If neither can be solved, B is the fallback. The shape of C (`visit-c.ss.ts`):

```ts
export const tree = (flatParse: Parse) => (flatParse.ok ? flatParse.ast.nodes : []);
export const namedByParent = (tree) => (i: number, root: number): boolean => {
  const x = tree[i], p = i === root || !x ? undefined : tree[x.parent];
  if (p && p.type === "MemberExpression") return !p.computed && p.property === i;
  return !!p && p.type === "Property" && !p.computed && p.key === i && p.value !== i;
};
export const isAsConst = (tree) => (x: TSAsExpression): boolean => {
  const t = tree[x.typeAnnotation];
  const n = t && t.type === "TSTypeReference" ? tree[t.typeName] : undefined;
  return !!n && n.type === "Identifier" && n.name === "const";
};
```

**Walks.**
- `for (const k in n)` becomes a scan of the rows `root .. after-1`.
- `inType` is one forward pass (`typeRows`): `out[x.parent - root] || TYPE_POSITIONS.has(x.field)`.
- Skipping an `action(...)` subtree is `i = x.after`.
- No 121-case `kids` switch is needed.

**Narrowing cost.** Code lines, counted as `inventory.ts` counts them. The port figures include their type
declarations (`ModErr`, `CellDef`, `Found`, `Diag`, `Capture`, `Local`). `typeRows` and `TYPE_POSITIONS` are counted
under syntax pass only, though `captures` uses them too.

```
module shape   original 32   port A 60
syntax pass    original 24   port A 55   B 68   C 54
captures       original 78   port A 100
line+leading   original 19   port A 20
```

That is 215 port lines against 134 original (×1.60). Where they come from:
- every `nodes[i]` is `FNode | undefined` and needs a guard;
- every field read needs a `type` test first: `x.typeAnnotation.typeName?.name === "const"` (one line) becomes
  `isAsConst` (4);
- there are no type predicates, so `isFn` cannot narrow; the three-way test is repeated at 4 sites, and the helper
  was deleted;
- the walk's root has a parent row where the original passed `null`, so 4 helpers need an `i === root` guard.
  Missing it changes behaviour silently;
- an `Other` row needs `kindOf` wherever a message prints the type.

The largest cell is 16 lines (`spreadTaint`).

**Checker messages met while porting A**, both fixed by local rewrites:
- `spreadTaint: [mut-capture] Mut taint captured by a function that escapes (not a local helper that is only
  called)`, from `every`/`find` callbacks reading the Mut; rewritten as loops in local helpers.
- `actionCaptures: [arity] callback takes more parameters than its context provides`, and `[type] (h: Capture, k:
  number, all: undefined) => boolean is not assignable to (v: Capture, i: number) => unknown`, from
  `filter((h, k, all) => …)`; rewritten with a named array.

**Identity → number equality.** `parent.property === x` and `parent.key === x && parent.value !== x` became
`p.property === i` and `p.key === i && p.value !== i`. They check with no `[strict-eq-object]`. Only these 4 sites
were exercised; node-keyed Maps and Sets were not ported.

**Differential** (`out/diff.txt`). Each port runs against its original, comparing ordered lists before dedupe:
- original `syntaxPass` is sliced out of `core.ts` by AST span and evaluated;
- the module shape is compared with `checkSources().module` (the cell loop's rules) and with its cell names and lines;
- original `captures` is called with every identifier parameter tainted.

```
corpus: 361 inputs, 1001 cells
  module shape: 361 same, 0 differ (16 inputs with a module-shape error)
  syntaxPass A 1001 same, B 1001 same, C 1001 same (14 cells with a diagnostic, 16 diagnostics)
  captures 1001 same (84 cells with a capture, 113 captures)
synthetic: 3 inputs, 20 cells: all same (4 cells / 12 diagnostics; 4 cells / 7 captures)
control (namedByParent ignores computed): syntaxPass A differ 1
control (readsBinding counts labels):     captures differ 1
control (moduleLevelRule drops no-var):   shape differ 1
```

**Dead end.** On the corpus alone the controls gave 0 differences: the corpus never has a computed reserved name, a
label in an action, or a top-level `var`. `synthetic-cells.ts` was added for them. The corpus exercises the syntax
bans in 14 cells only.

## 4. Callers that parse many variants

- **`distinctNames`'s retry loop moves to the shell.** `flatDistinct` runs the same loop over `flatParse` values and
  hands checked code `{ parse, text, dups }`. One corpus input needs it (2 parses). The module-shape differential runs
  on its output.
- **`completionsAt` builds up to 4 variant texts**, tries them lazily, and stops at the first that checks. A parse is
  a value per text, so the shell must parse every variant before the checked step runs. The flow becomes:
  1. A checked step builds the variant strings (pure string code).
  2. The shell parses each variant.
  3. A second checked step reads the list of tables. `try { checkSources } catch { continue }` becomes a filter on
     `ok`.

  Parsing turns eager: 4 parses where the lazy loop may need 1. How often 1 is enough was not measured. The `param`
  branch parses a fifth text (the module without the cell). In C, one visitor graph has one `tree`, so 4 variants
  mean 4 runs of the graph, or tables addressed by a table index. Neither was built.
- **Cost per keystroke, parse side only, 4 variants** (`out/q2.txt`):

  ```
  lite/events.ss.ts   3977 nodes: flatParse 3.64 ms, cross A 37.5 / B 15.3 ms per variant → 164.6 ms (A/C), 75.8 ms (B)
  lite/subtype.ss.ts  3467 nodes:                                                          → 143.9 ms (A/C), 78.3 ms (B)
  lite/store.ss.ts    1479 nodes:                                                          →  73.9 ms (A/C), 31.6 ms (B)
  ```

- `cross()` runs only on a compiled cell's inputs that name outside cells (`ss-toolchain.ts:304`, found by text
  search). If the shell instead calls a checked function value with the tables as arguments, nothing is checked or
  copied: 4 × 3.64 ms, with the value trusted unchecked (as `events.test.ts` hands plain Maps to linked cells).
- The survey's other blocker stands: `completionsAt` hooks `ch.identHook` and `ch.member`.

## Alias `===` probe

Not reproduced (`out/probe-alias-eq.txt`, 17 cells, all ok). Cases:
- `a === b` on `Kind = "A" | "B"`, on `Kind | null`, and on aliases of `number | string` and `number`;
- the alias read from a Map, an array element and a cell value;
- `r.type === s.type` on records, and on a union of records;
- `nodes[a].type === nodes[b].type` on FNode rows, and `nodes[a]?.type === k`;
- `n.type === kindFromJs`, with the kind from an outside cell;
- `x.property === i`.

## Checker limits met

1. Union-to-union assignability per call site, about 31–36 ms at 121 records, growing about as k². Repros:
   `probe-call-cost.ts`, `probe-union-scaling.ts`, `probe-wrapper-cost.ts`, `probe-tree-cost.ts`.
2. `cross()` cost depends on member order (5×), and its union mismatch message names nothing: `probe-cross-order.ts`,
   `q2.ts` control.
3. `[mut-capture]` on `every`/`find` callbacks reading a Mut, and the intrinsic `filter` without its third parameter
   (messages quoted in §3).
4. No type predicates: a narrowing helper (`isFn`) does not narrow. This was already in the survey.
5. A census-derived union is only as complete as its corpus. `lite/subtype.ss.ts` appeared mid-session with an
   `ArrayPattern` hole (`[, x]`), and `cross()` then rejected it against the generated `elements: number[]`.
   - Fixed by a synthetic hole and regeneration; `flatten` now throws on an unseen hole.
   - A union derived from the ESTree grammar would not have this gap. Not built.

## What the route would cost for the whole checker (estimate)

Extrapolated from the two ports, not measured on the whole:
- **Lines.** ×1.60 on 134 lines. Applied to the survey's 2666 AST-dependent code lines, about 4270 lines over indices
  (+1600).
- **Check time.**
  - The 16 checker `.ts` files have 114 functions/methods with a `Node` parameter and 705 call sites calling one by
    name (`lines.ts`; name-based, so an over-count).
  - In layout A each site that passes the table costs 31–36 ms: 22–25 s per check.
  - In layout C they pass indices and cost about 0. That holds only while every row argument or annotated return is
    narrowed or an index.
- **Rewrites.**
  - 398 `.type` reads, each a narrowing site.
  - 3 for-in loops become range scans.
  - Node-keyed maps (`facts.types`, `bindingOf`, `parent`) become number-keyed. Not tried.
  - The nodes synthesized at `infer.ts:649` and `:1613` need rows: an extension table in the checker, or the adapter
    synthesizes them. Not tried.
  - `e.bigint !== undefined` becomes `!== null`.
  - Several parses per check need table-unique indices (§3, open cost 1).
- **Running cost per module check.** Flatten about 1.4 µs/node, plus `cross()` at 10.1 µs/node (A/C, frequency
  order) or 3.3 (B).

## Not done, or unsure

- Where the per-call check cost goes inside the checker is not diagnosed.
- `cross()` with type dispatch is not tried.
- How often `completionsAt` needs more than one variant is not measured.
- `ownership` and `opaqueCaptures` are not ported, so identity through Maps and `===` on bindings is not measured.
- Module shape and `captures` are not ported to C.
- B's round trip is lossy for `Literal.regex` and `TemplateElement.value` (spread into `props` as `key.subkey`). It
  was tested only through the `syntaxPass` differential.
- Timings vary up to about 30% between runs: per-call cost was 25–37 ms across the day, and cross for A was 9.9–10.1
  µs/node in the final pass.
- A fresh-context review (`/review-notebook`) of this file was not run.
