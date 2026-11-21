# Checker self-hosting survey

Measured 2026-11-21. Asked: how much of SoundScript's own checker, linker and toolchain could be written
in SoundScript today. Each verdict comes from running the real checker (`splitCells` + `checkCells`, strict
index, as `selfhost/check.ts`) on a port in `probes/`: the whole body for 49 sampled units, only the blocking
constructs for 17 (see `b*` below). Results are in `out/results/`. Re-run with:

```
bun selfhost/checker-survey/inventory.ts   # out/inventory.txt: units and code lines from the AST
bun selfhost/checker-survey/analyze.ts     # out/analyze.txt: AST dependence, instance state, SCCs
bun selfhost/checker-survey/run.ts         # every probe; out/results/ALL.txt starts with the file hashes
OUT=defects-ALL.txt bun selfhost/checker-survey/run.ts selfhost/checker-survey/defects/*.ss.ts
bun selfhost/checker-survey/classify.ts    # out/classify.txt: verdicts, extrapolation, blocker groups
```

Source files at these hashes (`sha()` in `inventory.ts`), as printed by the final batch run. The first inventory
run printed the same values; that output was not saved, so the folder holds only the final set:

```
parse 714c3a2b9ea9  core b104d69702c1  infer 0e3049d9804b  own 98a2ac926d03  capture 5b9748458a6b
registry eb48b819ee1f  intrinsics a3a7f27e98f0  types.ts 64004450cc72  types.ss.ts 75707e80a705
facts 6e00424d529c  island 8ea3a168040c  complete 5704eb1f7d0a  rules 48fb22ffc8bb  link 7c81ef0e7ef3
ss-toolchain 557070fb1dca  comment-types d419996f39f0  module-js c73e30d5b804  lower 0e0237136613
erase 14a5e55e7604  boundary 1f0148b52882
```

## Numbers

Inventory (`out/inventory.txt`). A unit is a top-level declaration; a class is split into its members.
Code lines are lines holding a non-comment token.

```
all files              367 units  4575 code lines
  core                 308 units  3909    checker, linker, toolchain logic
  borderline            11 units   134    rules.ts, module-js.ts, erase.ts, boundary.ts (shapeOf)
  text                   5 units   369    INTRINSIC_DECLS, PRELUDE_DECLS, JSX_DECLS, typedArray, RULES
  ported                43 units   163    types.ss.ts, types.ts (already SoundScript or its twin)
population surveyed    319 units  4043    core + borderline
largest files          infer.ts 115 units / 1476   own.ts 4 / 487   registry.ts 40 / 427   core.ts 18 / 397
```

Sample (`sample.ts`, `out/sample.json`): 66 units, 1576 code lines, drawn before any sampled unit was ported (the calibration and container probes came first). Per-file
quotas, a seeded generator (20261121) inside size bins (≤8, 9–30, >30 code lines), 6 types drawn apart, and the
three functions over 100 lines (`ownership`, `actionEscapes`, `checkSources`) taken with certainty as 8 named
inner units. 49 were ported in full, 17 only as reduced probes of the constructs that block them.

Classes:

- `a` checks as is, or after a mechanical rewrite (cell form, `mut()`/`freeze()` around a local the function
  fills, `this.x` to the local, `ReadonlySet`/`ReadonlyMap` to `Set`/`Map`).
- `b` checks after small local rewrites, each named in `classify.ts`.
- `b*` expected b: the blocking constructs were probed reduced and a local rewrite is named for each, but the
  whole body was not ported. Not every named rewrite was itself checked: `Registry.unify`, `Registry.ifaceRec`,
  `Checker.switchStmt`, `Checker.fnExpr` and `compileChecked` name rewrites that no probe cell runs.
- `c` blocked by a gap the checker could close, with no local rewrite.
- `d` blocked by something the language forbids on purpose.

```
class  units  code lines
a        19     119
b        29     670
b*       11     554
c         3      84
d         4     149
```

No sampled unit is blocked only by a gap in the checker's language. The 3 `c` units (`parse`, `tokensOf`,
`fromObservableVariables`) are all the parser boundary (P3 below); every sampled use of gaps 9, 10 and 14 in the
blocker table had a local rewrite that checks, and those units are `b`.

Every a/b verdict assumes three preconditions, measured separately below: P1 a typed AST, P2 classes turned
into one cell with flat Mut tables, P3 a parse result the checker can take. Without P3 every unit that parses
(25 units, 845 code lines) is blocked.

Extrapolated per stratum, by the sampled line fraction (`out/classify.txt`):

```
stratum              population    sample    a  b b*  c  d   a+b lines     a+b+b* lines
checker functions     55 /  416    16/186    8  6  0  1  1    349 of 416    349 of 416
giant functions        3 /  793     8/153    0  7  1  0  0    627 of 793    793 of 793
class members        127 / 1841    19/708    2  9  8  0  0    785 of 1841  1841 of 1841
completion            19 /  265     3/103    1  1  0  0  1     46 of 265     46 of 265
toolchain + linker    63 /  536    11/317    2  3  2  2  2    140 of 536    336 of 536
borderline             8 /  131     3/103    0  3  0  0  0    131 of 131    131 of 131
types                 44 /   61     6/  6    6  0  0  0  0     61 of 61      61 of 61
total                319 / 4043    66/1576  19 29 11  3  4   2139 of 4043  3557 of 4043
```

Estimated from the sample: between 219 and 283 of 319 units, and between 2139 and 3557 of 4043 code lines check given P1–P3; the upper figure counts
the unchecked `b*` rewrites, and the class-member stratum's 1841 of 1841 rests on 8 `b*` of 19 sampled. The c+d
remainder is 7 of 66 sampled units (233 of 1576 sampled lines). A 95% Wilson interval on 7/66 is 5%–20% of units,
17–65 of 319. The sample is
stratified with quotas, not simple random, so that interval is a rough guide. Strata with 3 sampled units
(completion, borderline) carry the widest error: completion's 46 of 265 rests on one `d` unit
(`completionsAt`, 85 lines).

## Ranked blockers

Ranked by sampled units naming the group (a unit can name several). "Sound" is whether closing the gap in the
checker keeps its guarantees; "cost" is a rough estimate in checker lines and was not implemented.

`kind` is the kind of blocker, not the class of the units: `c` a gap the checker could close, `d` forbidden on
purpose, `P` a precondition's cost.

| # | blocker | sampled units (lines) | example and message | kind | close it? cost |
|---|---|---|---|---|---|
| 1 | Mut or let captured by a callback | 14 (628) | `vs.forEach(each)` where `each` pushes to a Mut: `[mut-capture] Mut cuts captured by a function that escapes`; tokenizer `onComment` writing a let: `[let-capture]` | d | No. Rewrite: a `for` loop, or the callback's effect returned. Checked loop rewrites: `p_jsx_erase.erase`, `p_registry.sub`, `p_rest.convertCell`, `p_small.captures`. `compileType` becomes a local function of the checker cell and `compileChecked` a two-pass text; neither was ported. |
| 2 | writes into shared records | 8 (288) | `b.t = …` on a stored Binding: `[member-write] write to a Binding0, which is not Mut`; `fi.rets.push`: `[mutating-method]` | d | No. Rewrite: a table keyed by id (`bindingT`, FnInfo tables) in the checker cell (`container_demo`). |
| 3 | object identity `===` | 8 (216) | `p.object !== x`: `[strict-eq-object] === on two non-primitive operands; use equals(a, b)` | d | No. Rewrite: `same(a, b)` on span and type, or `equals` on Ty. With a flat AST (below) node identity is an index and `===` on numbers. |
| 4 | `!` non-null | 7 (252) | `out.get(x)!.errors.push(…)`: `[no-non-null]` | d | No. Rewrite: a guard. |
| 5 | reads before narrowing the AST node | 7 (309) | `op.name.name` on a JSXOpeningElement, a case group reading `e.expression` that not every member has | P | Not a gap: P1 makes the reads checkable; the cost is the narrowing written at each site. |
| 6 | strict index | 5 (216) | `t.args[0]` | P | Not a gap; a guard or `?? default` per read. |
| 7 | generic walk over keys | 5 (151) | `for (const k in n)`: `[unsupported]` | d | No (inspects an unknown-shaped object). Rewrite: `fields(n)` / `kids(n)`, typed tables in `probes/astlib.ss.ts`. |
| 8 | parser | 5 (144); 25 units (845) call it | `acornParse: AcornParse cannot cross from another language: it is or holds a function`; `programAst: Program cannot cross … a recursive type` | P | See P3. A flat node table crosses today (`p_flat_crossing`). |
| 9 | RegExpMatchArray index | 4 (88) | `m[1]`: `[type] cannot index RegExpMatchArray with 1` | c | Sound: an index signature giving `string \| undefined` under strict index. About 1–3 lines in the intrinsic declarations. Rewrite meanwhile: `replace` with `$1`. |
| 10 | optional-chain narrowing | 4 (95) | `d?.type === "A" ? d.a : 0`: `[no-member] no property a on { type: "B" }`; `!!s.flags?.fresh && s.flags.fresh`: `[possibly-undefined]` | c | Sound (`tsc --strict` 6.0.3 accepts both, `defects/tsc/d1_d3.out`). Estimated 20–40 lines in narrowing; unverified. Rewrite meanwhile: `d && d.type === …`. |
| 11 | `env.flow` field writes | 3 (114) | `env.flow = join(T, F)` | d | No. Rewrite: methods return the flow (`container_demo.conditional`). |
| 12 | Mut is shallow | 3 (63) | a Map inside a Mut record: `[mut-deep-write]` | d | No. Rewrite: flat tables keyed `scope:name`. |
| 13 | casts and `any` | 3 (92) | `(t as any).v`: `[no-cast]`, `[no-any]` | d | No. Rewrite: case split on the union. |
| 14 | intrinsic signatures | 2 (56) | `replace(re, fn)`: `() => string is not assignable to string`; `reduce(f)`: `[arity] expected at least 2 arguments, got 1` | c | Callback `replace`: sound when the callback is pure, but each sampled use advanced a let, so `[let-capture]` stays. `reduce` without an initial value throws on `[]`. Neither recommended. |
| 15 | module-level state | 2 (113) | `let fresh`: `[cell-not-function] fresh is not a function` | d | No. Rewrite: a counter local to the checker cell. |
| 16 | memos | 2 (65) | `parsedCompiled.set(…)` at module level: `[mutating-method]` | d | No. Dropped in the ports. What dropping them costs in run time was not measured. |
| 17 | caught error inspection | 2 (63) | `e.message` in `catch (e)`: `[no-member] property message on Js/unknown; narrow it first`; `e instanceof SyntaxError`: `[unsupported] instanceof` | d | No (unknown-shaped object). Rewrite: a parser that returns its error as a value (`p_core.distinctNames_rw` checks). |

Met while porting, outside the sampled verdicts: `ReadonlySet`/`ReadonlyMap` give `unknown type` (unfamiliar built-in names
are a cost; `Set`/`Map` check), `JSON.parse` returns unknown (a typed reader is needed), a local `type`
declaration gives `[unsupported] local type declaration`. `link` evaluates each cell with `new Function`:
`[new-non-intrinsic]`, outside the language. `completionsAt` replaces `ch.member` on the checker object and
sets `ch.identHook`: `[member-write]` and `[let-capture]`; a port needs the checker to return the scope at
the placeholder instead.

## Preconditions

### P1 typed AST

78 of 319 units, 2666 of 4043 code lines, read `.type` or call `kids`/`isFn` (`analyze.ts`). The acorn AST
reaches them as `Node`, which is untyped. The checker compares `.type` against 102 distinct strings, 6 of them
regex fragments, so about 96 node types.

Tried: `probes/ast.ss.ts` is a union of 84 node record types, one of them (`TSKeyword`) covering the keyword nodes (116 lines); `probes/astlib.ss.ts` has `kids`, `isFn`
and `fields` as exhaustive switches (149 lines). Both check. These visitors were ported over it and check with
no new language feature: `syntaxPass` (core), `erase` (browser), `lowerJsx` (jsx), `syntaxStub` (module-js),
`Registry.convert`, the `ownership` slice (position, fresh, helper, the walk) and the `actionEscapes` slice.
The cost is at each site: narrow before reading a field (group 5), and a case group whose members lack a shared
field has to be split. Three node types (`JSXEmptyExpression`, `TSSatisfiesExpression`, `TSDeclareFunction`) were
missing from the first union and were added when a port needed them. `Literal.bigint` is still missing
(`p_infer.red_literalBigint`: `[no-member] no property bigint on Literal`). The union is not complete.

### P2 one cell per class

Class members: 127 units, 1841 code lines. 86 write instance state directly or through a call. 27 callbacks
inside members call a state-writing member; 11 still do if the registry is pure. Call-graph SCCs over one
unit: 5, the largest 32 Checker methods (999 lines).

`probes/container_demo.ss.ts` (146 lines) is a Checker slice as one cell: scopes as ids, `scopeVars` keyed
`${scope}:${name}`, bindings by id with a separate table for types that change, an immutable Env, methods that
return a flow, the registry a record of pure functions. Real bodies of `declare`, `Scope.get`, `err`, `check`,
`infer` (try/finally with quiet), `stmts`, `block`, `conditional`, `join`, `filter`, `typeTag`, `narrowByProp`
check. Local helpers that write a Mut and are only called are accepted, including mutual recursion. The same
helper passed as a callback, aliased, returned, or placed in a record is rejected (`q_holes.ss.ts`), so
`onUnsup`/`onErr` hooks and `compileHook` become local functions of the one cell.

### P3 parse result

acorn cannot be a cell input (a function) and its AST cannot cross as data (a recursive type,
`p_parse_outside`, `p_ast_crossing`). Two routes:

- A SoundScript parser. The current parser is acorn (6341 physical lines in `acorn/dist/acorn.mjs`) plus
  `@sveltejs/acorn-typescript` (5636), larger than the 4043 lines being ported.
- acorn stays outside and an adapter hands over the AST as a flat table: nodes in an array, children as
  indices. That is not a recursive type, and it crosses: `p_flat_crossing.ss.ts` checks `countIds` and
  `calleeName` over a 3-member union taken from an outside cell. The adapter would also have to catch acorn's error and return it as a value, which
is what `distinctNames` (class b) relies on. Not tried: a flat union of all ~95 node types at
  the boundary, the adapter's size, and visitors written over indices. It also replaces node identity
  (blocker 3) with number equality. A parse is still a value per text, not a function, so code that parses
  many generated variants (`completionsAt`, `distinctNames`'s retry loop) cannot take a parse function, and would need the outside side to parse every variant first.

## Defects

Repros in `defects/`, run by the second `run.ts` line above (output in `out/results/defects-ALL.txt`). Not fixed.

- **D1** `d1_throw_only_contextual_arrow.ss.ts`: an arrow typed by context whose block only throws is inferred
  as returning void. `(x: number) => void is not assignable to F`. The annotated form checks. `tsc --strict`
  6.0.3 accepts the contextual form (`defects/tsc/d1_d3.out`, exit 0).
- **D2** `d2_message_per_union_member.ss.ts`: one failed property read is reported once per union member that
  lacks it, 3 `[no-member]` lines for a 4-member union. Over the typed AST, `cellsOf`'s two `d?.type` reads gave
  162 `[no-member]` lines, 79 and 83 (`out/results/p_small.txt`).
- **D3** `d3_optional_chain_does_not_narrow.ss.ts`: `d?.type === "A"` and `!!s.flags?.fresh` do not narrow; the
  `&&` forms do. Incompleteness, not unsoundness (blocker 10).
- **D4** `d4_identity_through_includes.ss.ts`: `a === b` on records is rejected; `[a].includes(b)` and
  `[a].indexOf(b)` with the same identity check. `selfhost/NOTES-memo-soundness.md` §1 covers identity of `===`, `Object.is` and Map/Set keys; `includes` and `indexOf` are not recorded there.
- **D5** `d5_class_message_names_the_wrapper.ss.ts`: `export class` is reported as `[module-level]
  ExportNamedDeclaration at module level`; without `export` it is `[no-class] ClassDeclaration at module level`.

## What to port first

1. Units that need none of P1–P3: the 6 sampled types, `captureMessage`, `reservedName`, `island`,
   `PRELUDE_FNS`, `ISLAND_CAPABILITIES`, `builtinTypeNames`, and after the local rewrites named in
   `classify.ts`, `checkSources>uncloneable`, `shapeOf` and `checkSources>visit` (as a cycle table). They read Ty,
   strings or names, not the AST.
2. The Registry as pure functions over Ty: `sub` and `fnSub` (both ported in full; 66 lines together), `iterElem`, `unify`
   with loops. `ifaceRec` needs its memo replaced by a visiting set first.
3. Decide P3 before porting anything that walks the AST; the flat table is the route to try first (its alternative is a parser the size of ~12000 lines of acorn and
  its TS plugin; the adapter's own size is unmeasured), and it
   changes how every visitor is written, so ports over the 84-type union would be redone.
4. The Checker as one cell (`container_demo` shape), then `own.ts` and `capture.ts`, whose slices check over
   the typed AST.
5. Last: `completionsAt` (needs the checker to return scopes) and `link` (evaluates text). `TS`/`parse` stay
   outside under either P3 route.

## Not done

Not ported: `Checker` members outside the sample beyond the container slice, the full `checkSources` driver,
`compileChecked`, `parseCompiled`, `fromObservableVariables` (reduced only), and the TEXT stratum (369 lines of
declaration strings, which would move as strings). Line numbers in probe results are approximate (joined source
minus the prefix). A fresh-context reviewer re-ran `classify.ts` and spot-checked 14 verdicts against their probes
(2026-11-21); the other 52 were not re-checked by a second reader.
