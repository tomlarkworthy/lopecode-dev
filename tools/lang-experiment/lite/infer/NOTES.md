# lite/infer: the Checker as SoundScript cells — 2026-11-21

The port of `lite/infer.ts` `Checker` (one cell's type inference) to checked cells, prefix `ix`. Nothing is
switched over: `core.ts` still runs the TypeScript `Checker`. Every number below was measured 2026-11-21, from
`tools/lang-experiment`, on the tree `diff.ts` stamps in its first two lines:

```
ix files ix-types.ss.ts:ppugor3kf5c9 ix-core.ss.ts:i8qk79btrgcd ix-hides.ss.ts:2h97juykc54tq ix-expr.ss.ts:33l1ie1n62c52
  ix-ops.ss.ts:m65ujooxtuy5 ix-cond.ss.ts:2d9v9crudqfmj ix-fn.ss.ts:2dixv83orttfa ix-stmt.ss.ts:tkqlgc8xsteg
  ix-flow.ss.ts:yebzqlhzs33k ix-lit.ss.ts:27fy8ngr5nqv9 ix-call.ss.ts:29tyeq1mfugwv ix-apply.ss.ts:29zz3ahnpeau9
  ix-prelude.ss.ts:1loybxsnmwfgh ix-jsx.ss.ts:1w4rjjrtxn4gn ix-entry.ss.ts:3jhpn3a50h5ou
infer.ts s8ca0fcwyrbw core.ts 3enlk2ydalyym
corpus results digest 38xs57ts1dxvn (real checker alone)
```

## Files

```
ix-types   data: tables, env, registry view IxReg, knot IxK        ix-flow    loops, try, switch
ix-core    logs, flows by id, scopes, narrowing primitives          ix-lit     object/array literals, as const, patterns
ix-hides   hides / hidden / mayHide / actionIn / promiseIn          ix-call    call, new, Object.assign/freeze, structuredClone, compile
ix-expr    check, infer, identifiers, members, index                ix-apply   one signature applied (rank-1 inference)
ix-ops     unary, binary, logical, conditional, assignment          ix-prelude prelude calls; infer1's remaining cases
ix-cond    conditions and narrowing                                 ix-jsx     JSX lowered to a call or an IntrinsicElements check
ix-fn      fnExpr, params, return context, hoist                    ix-entry   the knot and the entry ixCheckFn
ix-stmt    statements
index.ts   links the cells for bun (link.ts); builds IxReg over the real Registry
diff.ts    the differential harness       infer.test.ts  four tests       stats.ts, check-time.ts  the size and time figures
probes/    cells for the less used paths  repro/         one file per gap or reproduced bug
```

Shape: one cell per method, a long switch split by family behind a dispatch cell; the tables `K, T, V, W, C` lead
every signature; recursion goes through the knot `K` (`K.infer`, `K.check`, `K.cond`, `K.stmt`, `K.fnExpr`,
`K.call`, `K.bind`), so the cell graph has no cycle. Diagnostics go into persistent logs in `C`. No captured
`Mut`, no module state, no `!`, no casts.

Flows: the original mutates flow maps in place and replaces `env.flow` on env objects, and which envs share a map
decides what a later narrowing sees. The port keeps flows by id in `W` (immutable maps); `C.cur` is the id of the
env in use; an in-place write rewrites `W[id]`, a `new Map` is a new id. Each method tracks the ids of the env
objects it holds.

memberFlags: the original writes `facts.memberFlags` and reads it back in `call` (`infer.ts:1238` raises
`mutating-method` from it, `:1271` wraps the result in `Borrowed`). The port keeps only the last member's flags,
in `C.flagsAt`/`C.flags`, and `ixCallSigs` reads them right after inferring the callee, before `ixWriteRule`
infers the object again.

## Stage 0: the harness

`diff.ts` replaces `Checker.prototype.fnExpr` with a wrapper. On the top-level call (a `cell` argument, `env ===
null`) it runs the port first on the same registry, injected types and parse, puts `expandMemo`, `ifaceMemo` and
`quietKeys` back, then runs the real `fnExpr` and slices what it wrote to `this.diags` / `this.unsup`. Compared:
the diagnostics in order and the unsupported items in order, each as rule, line, node span and message; and
`show(fnType)`. Type variables are renumbered by first appearance on each side, since the real counter is module
state. Buckets: SAME; DIFFERENT (also: the port threw, or the two threw different messages); NOT COVERED (the
port set its sticky `C.gap`); REAL CRASH (both threw the same message).

The order between a diagnostic and an unsupported item is not compared. The real checker keeps them in two lists
and core.ts reports them as two lists, so that order is not observable either.

Residue check: the corpus runs once with the wrapper off and once on, and each source's whole `checkSources`
result is compared (type variable numbers dropped). `sources whose result the port's run changed: 0`. The first
version of this check reported 4; all four were `T'611` against `T'1930`, the module counter advanced by the
earlier pass.

Corpus: collect.ts's jobs, copied, with two changes. `ss:` sections go to `checkSources` directly, without
`checkCells`'s fallback for text that does not parse, so `selfhost/repro-unknown-class.ss.ts` is skipped (it
throws "Unterminated regular expression (27:56)"). The section split is a copy of `ts-cells.ts` `ssCellTexts`,
since that file is being edited elsewhere. The inline-string jobs keep collect.ts's selection, two regexes over
string contents, so that the corpus matches. The corpus reads `lite/soundscript/.scratch/checker-port/probes/`,
which git ignores; a clean checkout has fewer cells, and none of the REAL CRASH records below except
`repro/map-no-type-args.ts`'s.

Control (`--control`): `ixArity` linked without its "at most" check, in a copy; the shipped cell is not touched.
On the corpus with the two probe files and the crash repro:

```
control (ixArity without the at-most check): SAME 3431 DIFFERENT 75 NOT COVERED 0
```

## Result

```
bun lite/infer/diff.ts --control --file lite/infer/probes/wide.ts --file lite/infer/probes/wide-state.ts \
  --file lite/infer/repro/map-no-type-args.ts
824 sources, 3521 cells: SAME 3506 DIFFERENT 0 NOT COVERED 0 REAL CRASH 15; sources that threw 1
  real crash 15: port crashed the same
```

Without the probes and the repro (corpus only): 3427 SAME of 3441, the 14 others REAL CRASH. The 3427 carry 1764
diagnostic lines over 30 rules, and 107 of them carry unsupported items.

Before any widening, the first full run gave `SAME 3333 DIFFERENT 0 NOT COVERED 84 REAL CRASH 14` (64 `jsx
JSXElement`, 20 `compile(...)`). JSX was then ported (`ix-jsx`), and compile was routed through core.ts's hook.
Between runs the corpus count went 3431, 3437, 3441. Unverified: that this came from sources other agents changed
in the meantime, and not from the harness.

compile(...): `core.ts` gives the Checker a hook that closes over the module check. The port calls it through
`IxReg.compile` twice: the first call runs until the hook asks for the options' type (the glue stops it there),
the second passes in the type the port inferred. For the port's call, `diff.ts` lends the hook the port's
`infer`, `err` and `unsupported` by shadowing those methods on the real checker instance.

Which cells ran (`--hits`, each linked cell wrapped to mark a call): 194 of the 195 function cells; the one never
called is `ixGap`, as expected with NOT COVERED 0. A cell that ran has not had every branch run. DIFFERENT 0 holds
only for the paths the corpus takes. Branch coverage was not measured.

`probes/wide.ts` (66 cells: switch, loops, try, narrowing, destructuring, generators, async, overloads,
recursion, clone/freeze/assign, labels) and `probes/wide-state.ts` (13 cells: state, action, read, on, equals,
mut/borrow/snapshot) were written to reach paths the corpus may not take. They add 79 SAME cells.

## Real-checker bug reproduced

`repro/map-no-type-args.ts`: `Map` with no type argument crashes the checker (`undefined is not an object
(evaluating 't.k')`). The crash happens in the registry cells the two checkers share, so the port throws the same
message. The ignored probe `.scratch/checker-port/probes/mapnoargs.ss.ts` has 7 cells like it (14 records over the
two parses).

## Not covered, with repros

- `repro/fn-expr-type-params.ts`: `function <T>(x: T): T {…}` as an expression. The typed tree has no
  `typeParameters` field on FunctionExpression, so the node is `Other` and the port reports NOT COVERED (2 cells).
- `repro/jsx-bare-attribute.tsx`: `<input disabled />`. A JSXAttribute with a null value is `Other` in the typed
  tree, though `acorn-types.ss.ts` declares `value: AstNode`. The first port read it as an attribute and reported
  "spread attribute", which came out DIFFERENT. It is now NOT COVERED.

```
bun lite/infer/diff.ts --only extra: --file lite/infer/repro/fn-expr-type-params.ts --file lite/infer/repro/jsx-bare-attribute.tsx
2 sources, 3 cells: SAME 0 DIFFERENT 0 NOT COVERED 3 REAL CRASH 0
```

## Checker limits met

None stopped a method. These messages came up, and each cell was rewritten. All were rules, not checker defects:

```
[mut-capture] Mut seen captured by a function that escapes      closures in .some/.map/.reduce/flatMap → for loops;
                                                                 recursion via named functions taking the Mut
[mut-bind]    mut(...) must be the initializer of a local const  mut(new Set()) as an argument → a const first
[mut-not-fresh] mut(e) needs a fresh value                       mut(ixFreshCtl(n)) → mut({ ...ixFreshCtl(n) })
[type] freeze needs a Mut<T>, got string[]                       freeze([...used]) → [...used]
[unsup] comma expression                                         (ixUnsup(...), ERR) → statements
```

## Size

`bun lite/infer/stats.ts`: the Checker has 83 methods and 1517 lines, on the parse. Each method has a cell or a
group of cells, except two that are TypeScript glue in `index.ts`: the constructor's global bindings
(`globalsOf`, 15 lines) and `cloneProblem` (3 lines). That leaves 1499 of the 1517 lines ported to cells; the
mapping of methods to cells was made by hand. Not ported inside the methods: the facts writes other than the
memberFlags read-back above, `identHook`, and the action-use lists. These feed own.ts, completion and facts.ts,
which run after `fnExpr` and outside what the harness compares.

```
cells 232 (198 value cells, 34 type cells)   value-cell lines: total 1858, median 8, largest 26 (ixMayHide, ixConstLit)
```

## Timing

```
bun lite/infer/diff.ts --rounds 5
µs per SAME cell over 5 rounds: port with typed parse 2137.2–2798.6, port (runIx) 1700.0–2253.2, real 1082.5–1405.1
```

The machine was under load (load average 7.3, with other agents' runs), so the ratios are the figures to use:
the port alone (`runIx`) took 1.57–1.60x the real checker, and 1.97–1.99x including the second parse into the
typed tree and its span index. That parse is the harness's cost, since core.ts does not make the typed tree. The
port always runs first. An earlier run on a quieter machine gave port 479.9–495.8 µs and real 247.3–254.7 µs
(1.9x, that time including the parse).

`bun lite/infer/check-time.ts`, the live checker on the five sections the ix cells are checked after, alone and
with the ix cells:

```
quieter machine   with-only 241 199 176 181 ms   with+ix 860 853 822 820 ms    (75 and 273 cells)
under load        with-only 1101 912 1038 1034   with+ix 4159 5410 4203 4418
```

## Trust holes

- Registry reports (`onErr`/`onUnsup`) are buffered in the glue and drained into the logs before every port
  write, mark and at the end. If the original interleaves a report and a write differently inside one registry
  call, the port reorders them. No case showed.
- The registry's `ops.fresh` (alpha renaming in subtype.ss.ts) is module state, and the port advances it before
  the real run. The residue check found no source whose result changed.
- The glue maps a typed node to the parse.ts node by `start:end:type`. A missing node throws, which counts as
  DIFFERENT.

## What switching over would still need

1. The facts: `own.ts` (ownership, actionEscapes, opaqueCaptures), `facts.ts` and completion read
   `facts.types/bindingOf/calls/memberFlags/fnInfo` from the Checker. The port keeps only `T` (types by nid) and
   the last member's flags.
2. `identHook` for completion.
3. The two typed-tree gaps above (`FunctionExpression.typeParameters`, a null JSX attribute value), fixed in
   `lite/acorn/`.
4. A registry that takes typed nodes. Today `convert`/`sig` go through the span map.
5. A decision on speed (1.6x on the checker's own work).

## Running

From `tools/lang-experiment`:

```
bun lite/infer/diff.ts [--rounds R] [--control] [--hits] [--residue] [--only <key part>] [--file f]... [--show N] [--out file]
cd lite && bun test infer/infer.test.ts
```

The tests, 4 pass on 2026-11-21:
- `IX_FILES` lists every `.ss.ts` in `lite/infer`.
- Every ix cell is accepted by the live checker.
- No name declared in `lite/infer` is declared in another `lite/**` or `selfhost/**` `.ss.ts` file.
- On the corpus and probes: DIFFERENT 0, residue 0, control DIFFERENT > 0.

`--out` defaults to `lite/soundscript/.scratch/infer-port/diff.json`, and the directory is created if missing.

# 2026-11-21: the facts, the ownership pass, the captures

## Stage 1: the facts (2026-11-21 evening, measured on that tree)

What the passes after `ch.fnExpr` read from the `Checker`, from every use of the instance in `own.ts`, `capture.ts`,
`core.ts`, `facts.ts` and `complete.ts`:

```
facts.types        own.ts (typeOf, Borrowed views), actionEscapes (isState), complete.ts (member completion)
facts.bindingOf    own.ts, actionEscapes, opaqueCaptures; of each Binding: id, name, kind, node, t (final), fi.node,
                   fnNode, mutOwned, cellParam
facts.calls        prelude, helper, sig (only sig.decl ?? sig and sig.flags are read)
facts.memberFlags  view, mutates
actionBodies, inActionUses (fi.node, node, rule, msg), stateProps     own.ts actionEscapes, opaqueCaptures
```

Not facts: `ch.um`, `ch.reg.callSigs` (actionEscapes), `ch.mayHide` (core.ts, the fed rule), `ch.unsupported`
(own.ts writes to it), `ch.hides` (core.ts, before fnExpr). `facts.fnInfo` has no reader outside `infer.ts`
(searched `lite/` and `tools/`), so it is not ported. `facts.ts` does not use the Checker.

How: one log in `C` (`C.facts`, a cons list as `C.diags` is), written by `ixFact` at the TypeScript's write sites
(`ixDeclare`, `ixIdent`, `ixLvalue`, `ixNamedMember`, `ixCall` (helper, added: the port had no helper branch),
`ixApply` (sig, after the arity check), `ixPreludeCall`, `ixActionCall`, `ixInActionOnly`, `ixBindObject`), and
folded once at the end (`ix-facts.ss.ts`, 7 cells) into `IxFacts`: plain maps keyed by nid, bindings by id. A
log needs no new parameter in the 198 cells and no copy per write. Why a fold and not tables: the TypeScript mutates
one `Binding` object and the passes read its final state, while the port's bindings are records copied on change
and `V` loses one when its `scope:name` is declared again; so every `ixDeclare` and `ixUpdate` logs the record,
and the fold keeps the last per id. `IxBinding` gained `fi` (the declaring function's nid) and `fnNode` (four sites:
hoist, self-name, `ixVarFn`, a `let` with a function initializer); `ixUpdate` takes `C`. `calls` replays as the
TypeScript writes it: helper and prelude replace the entry, sig merges. An in-action use is dropped in the fold
when its function was an action body when the use was logged, as `inActionOnly` tests at the time.

The overload retry rolls back diagnostics only (`infer.ts:1264-1267`), not facts; the port's `ixApplyAll`
restores `C.diags`/`C.unsup` only, so the facts of a failed overload stay in both.

The comparison (`diff.ts`, per cell whose inference was compared): each table as lines `start:end:type.field
value`, the node keys taken from the cell function's own tree on each side (the parse.ts tree for the
TypeScript, the typed tree for the port; the parent field in the key separates a shorthand property's key and
value, which share a span). `types`, `calls`, `memberFlags`, `actionBodies`, `stateProps` sorted; `bindingOf`
and `inActionUses` in insertion order (own.ts builds `bindingOfFn` by iterating `bindingOf`, last wins). A
binding is printed by its declaration's key (globals by name), never by id. Type variables renumbered over the
tables in order. Facts on nodes outside the cell's tree (JSX's synthetic nodes, `switch`'s synthetic `===`) are
counted as excluded on each side, not compared. `show()` throws on a `Map` with no type argument; such a type is
printed as its structure (first run: the throw escaped the wrapper into core.ts and moved the residue check to
2; now 0).

```
bun lite/infer/diff.ts --control-facts --file lite/infer/probes/wide.ts --file lite/infer/probes/wide-state.ts --file lite/infer/repro/map-no-type-args.ts
826 sources, 3531 cells: SAME 3516 DIFFERENT 0 NOT COVERED 0 REAL CRASH 15; sources that threw 1
facts: 3516 cells compared (inference SAME or DIFFERENT): SAME 3516 DIFFERENT 0; comparison threw 0
  types         entries real 71912 port 71912; excluded (not in the cell's tree) real 1820 port 1820
  bindingOf     entries real 34008 port 34008; excluded (not in the cell's tree) real 16 port 16
  calls         entries real 7151 port 7151; excluded (not in the cell's tree) real 16 port 16
  memberFlags   entries real 10171 port 10171; excluded (not in the cell's tree) real 0 port 0
  actionBodies  entries real 233 port 233; excluded (not in the cell's tree) real 0 port 0
  inActionUses  entries real 17 port 17; excluded (not in the cell's tree) real 0 port 0
  stateProps    entries real 6 port 6; excluded (not in the cell's tree) real 0 port 0
  node keys met twice in one cell's tree: real 0 port 0
control facts (ixFact without "binding"): facts SAME 840 DIFFERENT 2676; tables that differ: bindingOf calls
control facts (ixFact without "bind"): facts SAME 741 DIFFERENT 2775; tables that differ: bindingOf
control facts (ixFact without "helper"): facts SAME 3247 DIFFERENT 269; tables that differ: calls
control facts (ixFact without "sig"): facts SAME 1893 DIFFERENT 1623; tables that differ: calls
control facts (ixFact without "prelude"): facts SAME 2675 DIFFERENT 841; tables that differ: calls
control facts (ixFact without "flags"): facts SAME 1965 DIFFERENT 1551; tables that differ: memberFlags
control facts (ixFact without "action"): facts SAME 3289 DIFFERENT 227; tables that differ: actionBodies inActionUses
control facts (ixFact without "use"): facts SAME 3499 DIFFERENT 17; tables that differ: inActionUses
control facts (ixFact without "stateProp"): facts SAME 3510 DIFFERENT 6; tables that differ: stateProps
control facts (ixInfer without its type write): facts SAME 409 DIFFERENT 3107; tables that differ: types bindingOf calls memberFlags
```

The corpus moved between runs today (3451, 3528, 3531 cells; the digest changed each time), from sources other
agents edit. Thin tables: `inActionUses` has 17 entries and `stateProps` 6 over the corpus and probes.

Dead end: the first control run dropped each kind by an override that closed over the kind; `link.ts` evaluates a
cell's text again, so the closure was lost, the override threw, and the controls reported "DIFFERENT 0" over 478
cells. The control text now carries the kind.

Checker message met: `[type] Flags | undefined is not assignable to Flags` (ixApply, `flags: sig0.flags` into
`Fn.flags?: Flags`) → `fl ? { ...inst.f, decl, flags: fl } : { ...inst.f, decl }`.

## Stage 2: the ownership pass (2026-11-21, 16:00 to 16:40)

`own.ts` (542 lines; `iterIn` 22, `ownership` 386, `actionEscapes` 108) as 10 files `ow-*.ss.ts`, linked with the
ix cells by `index.ts` (`OW_FILES`), so one link, one self-check, one uniqueness test and one harness serve both.
The cells read only the stage-1 `IxFacts`, the typed tree and `IxRegCore`; no `Checker`. Entry: `owCheck(R, F, fn)`
returns `{ diags, actions, unsup, gap }`. `owIndex` walks the cell's tree once (preorder, a stack) into `OwTree`:
parents, nodes by nid, references per binding id, the nested functions, and the first `Other` node met (`gap`).

The comparison (`diff.ts ownDiff`, per cell whose inference was SAME): the TypeScript's `ownership(e, ch)` then
`actionEscapes(e, ch)` on the checker that just ran `fnExpr`, its `ch.unsup` truncated back after (and the run
throws if `ch.diags` changed), against `owCheck` on the port's facts. Each report as `rule L@start-end msg`, in
order, unsupported items included. NOT COVERED when the inference port had a gap or `owIndex` met an `Other` node.

```
bun lite/infer/diff.ts --control-own --control-cap --control-fed --rounds 5 --file lite/infer/probes/wide.ts \
  --file lite/infer/probes/wide-state.ts --file lite/infer/repro/map-no-type-args.ts --file lite/infer/probes/own.ts \
  --file lite/infer/probes/capture.ts --file lite/infer/repro/named-fn-expr-helper.ts       (runD, 16:43-16:47, load 5.3-6.0)
corpus results digest 3iepfhfqe3fpy (the same as runC at 16:37)
829 sources, 3596 cells: SAME 3581 DIFFERENT 0 NOT COVERED 0 REAL CRASH 15; sources that threw 1
facts: 3581 cells compared (inference SAME or DIFFERENT): SAME 3581 DIFFERENT 0; comparison threw 0
ownership: 3581 cells: SAME 3581 DIFFERENT 0 NOT COVERED 0
```

Reports per rule, cells / reports. The first column is the corpus with the stage-1 probes only (stage2-run1,
3516 cells); the second adds `probes/own.ts` (39 cells) and the repro.

```
rule                   corpus      + probes
action-call             2 / 2       7 / 7
borrow-placement        4 / 4       9 / 9
borrowed-await          7 / 7      12 / 12
borrowed-escape         9 / 9       9 / 9
iterator-capture       13 / 13     13 / 13
let-capture            24 / 26     24 / 26
listener-placement     21 / 21     21 / 21
mut-after-freeze       16 / 21     16 / 21
mut-bind                6 / 6       6 / 6
mut-capture            13 / 15     15 / 17
mut-escape             46 / 65     47 / 66
mut-freeze-param        3 / 3       8 / 9
mut-not-fresh          15 / 15     15 / 15
mut-view               12 / 12     12 / 12
read-outside-action     4 / 4       9 / 9
state-placement         9 / 11      9 / 11
state-write            18 / 18     18 / 18
unsupported             5 / 9      10 / 14
```

The 15 rule ids in `own.ts`'s calls (read from its parse) all appear; `action-call` is a rule `infer.ts` puts in
`inActionUses` and `actionEscapes` reports. Under 5 cells in the corpus: action-call, borrow-placement,
mut-freeze-param, read-outside-action, unsupported (try/finally only; the LabeledStatement item never). The
labelled break/continue item (`own.ts:354`, `owJump`) is produced by neither side on any cell: `LabeledStatement`
returns without walking its body (`own.ts:415-417`, `owStmt`), so a labelled jump is never reached with a label. `probes/own.ts` has 5 cells for each, 6 for borrowed-await's Mut-parameter message, and 5 spread cells.
`la5` (an await inside try, a Mut read in catch) is accepted by both.

Controls, each a linked copy with one cell overridden (`--control-own`):

```
control own (owLoop, one iteration instead of the fixpoint): 3581 cells: SAME 3573 DIFFERENT 8 NOT COVERED 0
control own (owErr without the first-report-wins dedupe): 3581 cells: SAME 3578 DIFFERENT 3 NOT COVERED 0
control own (owHelper, no function is a helper): 3581 cells: SAME 3533 DIFFERENT 48 NOT COVERED 0
control own (owPosSpread, every spread allowed): 3581 cells: SAME 3580 DIFFERENT 1 NOT COVERED 0
```

On run B (16:35, 3437 cells, no probes: zsh does not split `$F`, so the `--file` list arrived as one argument) the
four gave DIFFERENT 7, 3, 46 and 0; the corpus has no cell that spreads a Mut into a call that may keep it, so the
fourth was no control until `sp2` in the probes (alone: DIFFERENT 1, `mut-escape ... spread into a call that may
keep it`).

TS bug reproduced (`repro/named-fn-expr-helper.ts`): `const f = function g() { m.push(1); }; return f;` is
accepted, `const f = () => { m.push(1); }; return f;` is rejected `[mut-capture]`. `bindingOfFn` keeps the last
binding naming the function, which is the expression's own name `g` (declared inside `fnExpr` after `f`); `g` has no
references, so `helper(fn)` holds. The port does the same (the fact fold keeps `bindingOf` in insertion order, and
`owBindingOfFn` is last-wins); ownership SAME on both cells.

Checker messages met, and the rewrite:

```
owCapPass  [type] { mut: number[]; let: number[] } is not assignable to OwCap
           [unsupported] object spread of OwCap | { mut: never[]; let: never[]; calls: never[] }
           caps.set(f.nid, { ...fc, mut, let })  ->  { mut: mutT, let: letT, calls: fc.calls }
owCaptures [mut-escape] Mut caps argument to a parameter not typed Mut<...>
           no change to owCaptures; gone after the owCapPass rewrite (why not checked: probably a rejected cell's
           parameter types are not available to its callers)
owTracked  [mut-capture] Mut loaned captured by a function that escapes
           .filter((id) => ... loaned.has(id)) over the Mut  ->  frozen copies before the filter
```

`owIterIn` was 28 lines; the member types moved to `owTyKids` (25). `isUpper` renamed `owIsUpper` for the prefix.

## Stage 3: the captures and the fed rule (2026-11-21, 16:15 to 16:40)

`capture.ts` (158 lines; `refs` 17, `bound` 12, `declaredIn` 13, `captures` 36, `opaqueCaptures` 57) as
`ow-taint.ss.ts` (by name) and `ow-opaque.ss.ts` (by binding), entry `owCaptureCheck(R, F, fn, tainted)` in
`ow-entry.ss.ts`, run as core.ts runs them: by name, then by binding skipping the nodes the first reported.
core.ts's fed rule (`fnKept`, the events-cell and state-cell lines) is `owFedKept`.

The comparison cannot use core.ts's taint map: it is built from the module's cell graph (`refInner`, `stateful`,
`byName`, shell and foreign names), which the `fnExpr` seam does not see. So each cell runs twice, with no taint and
with every identifier parameter tainted as `the value of the state cell <name>`, on both sides; each report as
`<map> <name|binding> @start-end name | why | opaque|named`. The fed rule is likewise checked on every cell as if it
were fed, with one `fedBy` text; its oracle in `diff.ts` restates core.ts's four lines (value type from `fnT`, the
two `fnKept` calls) around the Checker's `mayHide`, so the fed comparison tests `ixMayHide` and the value-type
unwrapping, not core.ts's own text.

```
captures: 3581 cells: SAME 3581 DIFFERENT 0 NOT COVERED 0; reports params name 278, params binding opaque 19,
          none binding opaque 15, params binding 11; cells with any 217
fed rule: 3581 cells: SAME 3581 DIFFERENT 0; cells reported (as if fed) 16, reports 16
```

`probes/capture.ts` (24 cells): computed locals, destructuring, a parameter default, a hoisted function reading a
later const (`cn7`, the case a single taint pass misses), shadowing, a property name equal to a tainted name;
enclosing parameters, let, catch, Mut, for...of, self- and mutual recursion; events and state cells holding
functions, `unknown`, `object`.

Controls (`--control-cap`, `--control-fed`), runD:

```
control cap (owTaintPass, one pass instead of the fixpoint): SAME 3579 DIFFERENT 2     (cn7, cn8; corpus alone 0)
control cap (owOpaqueWhy1 without following free references): SAME 3573 DIFFERENT 8
control cap (owNotARef, property names read as references): SAME 3579 DIFFERENT 2
control fed (owFedKept without taking Generator<T> to T): SAME 3578 DIFFERENT 3
```

The message: both sides' reports are compared as `name | why | opaque`; `[action-capture]`'s text is
`captureMessage` (`messages.ss.ts:15`), a function of those three fields only, so it was not compared separately.

No checker message met in stage 3.

## What switching the per-cell check over would still need (2026-11-21)

Read from `core.ts:280-365`, the per-cell part around `ch.fnExpr`. Ported and compared: `fnExpr` (inference), the
facts, `ownership`, `actionEscapes`, `captures`, `opaqueCaptures`, the two `fnKept` lines. Not ported:

- the injected parameter types (`inject-unknown`, `inject-type`, handle rules, `blockedBy`) and `ch.hides` on each
  annotated input (`ixHides` exists, stage 0, but is not called from an entry here);
- the taint map and `fedBy`: both are built from the module's cell graph (`value`, `refInner`, `stateful`, `byName`,
  `boundaries`, `fnFed`, shell and foreign names, `CAPABILITIES`), so they need the module loop, not a cell;
- the cell-level rules on the value type: `state-undefined` (`admitsUndefined`), `state-in-state` (`holds`),
  `iterator-cell` (`iterIn` is ported as `owIter`, not wired to this rule), `listener-placement` on the value;
- the crash path (`checker crashed:` as unsupported), `dedupe`, line numbers from offsets, and the `value`/`usable`
  bookkeeping the next cells read.

## Timing and size (2026-11-21, runD and after; load 5.3-6.0 during the differential, 5.8-12.5 during check-time,
other agents' processes running; nothing else of mine running)

```
µs per SAME cell over 5 rounds: port with typed parse 2113.7–2248.0, port (runIx) 1689.2–1828.1, real 1056.2–1123.4
ownership µs per SAME cell over 5 rounds: port (owCheck) 91.9–102.2, real (ownership + actionEscapes) 65.5–79.5
captures µs per SAME cell (both taint maps) over 5 rounds: port 157.1–198.4, real 44.0–50.5
```

The captures port is 3.1-4.5x the TypeScript: `owCaptureCheck` builds its own `owIndex` per call (twice per cell,
one per taint map) and `owDeclaredIn` walks each action body again; the TypeScript reuses the parse tree's parents.
Not optimised.

Live checker on `lite/infer/` (`check-time.ts`, 4 rounds, 16:47-16:51):

```
with-only    630-1027 ms   75 cells
with+ix     3423-4307 ms  281 cells      (before stage 1, 2026-11-21 16:09: 3705-4149 ms, 273 cells)
with+ix+ow  5501-6093 ms  383 cells
```

Size (`bun lite/infer/stats.ts ow`): 126 cells in 12 `ow-*.ss.ts` files, 102 value cells, 24 type cells; value cell
lines 888, median 8, largest owMethodValue 20, owEscapes 21, owStmt 22, owIterIn 25, owExpr 25. Covered: own.ts's
3 functions (516 of 542 lines), capture.ts's 5 functions (135 of 158 lines), core.ts's two `fnKept` calls and the
value-type lines before them (`core.ts:343-348`). Plus 7 cells in `ix-facts.ss.ts` for stage 1.
`bun test infer/infer.test.ts`: 4 pass, 0 fail, 50.4 s (16:41).

## Stage 4: the module check, md cells (runs on the clock 2026-11-21 17:29-17:49)

`md-*.ss.ts` (11 files, 790 lines, 62 value cells; median 9 lines; largest mdInjectParam 26, mdCell 25,
mdCheckSources 25, mdInjectBoundary 19, mdValueRules 19; `soundscript/.scratch/module-port/sizes.ts`) port
`core.ts` `checkSources` (lines 37-359 of 397, core.ts hash 3ic3bvivb77u, after the switch to `syntaxCheck`) and
`distinctNames` (365-381). Entry: `mdCheckSources(R, sources)`; `runMd` in `index.ts` turns its result into a
`LiteResult` with the non-enumerable `facts` map. Not ported: `opts.onCell` (line 192, completion's hook on a
`Checker`; `runMd` throws "md: onCell is not ported").

TypeScript glue (`index.ts` 201-270, 70 lines, plus `MD_FILES`/`MD_CELLS`/`MD_GIVEN`/`linkMd`): the `Registry`
and its parse.ts parse (`convert`, `sig`, `load` take parse.ts nodes); the load reports with `n.loc` lines; one
`makeReg` per cell, restoring the previous one's handlers; the compile hook's reports put back into that
`IxReg`'s buffer (`requeue`); `in` on `CAPABILITIES` as a `Map` and a set of the Object.prototype names; the
message of a thrown value (`thrown`, see below); `LiteResult` assembly.

`ow-entry.ss.ts`: `owCheck` split into `owIndex` + `owCheckIn(R, F, T)`, so `mdAfterInfer` builds one `owIndex`
per cell and hands it to ownership and to `owOpaqueCaptures`. The per-cell `owCaptureCheck` (diff.ts's path)
still builds its own; not changed.

### Whole-module differential (`bun lite/infer/diff.ts --module-only --control-module`, 17:39)

```
whole module: 913 sources: SAME 911 DIFFERENT 0 NOT COVERED 2 BOTH THREW 0
  not covered 2: parameter valueOf, a name of Object.prototype
```

Sources: port 50, file 21, ss 50, ssx 51, sswith 10, reject 324, inline 322, module 2 (`module:lite/infer`, the
self-check's 493 cells with acorn-shell; `module:tutorial`, 47 cells from `switch-cost/tutorial.json`), lax 71
(strictIndex off copies of file:/port:), probe 12 (`probes/module.ts`). Compared per source: head, module errors,
cells (status, line, errors, unsupported, blockedBy, value, key order), facts, and spans (each cell's Checker
diag/unsup lists as positions, so a report after core.ts copies the lists still counts). Rules met on SAME
sources include module-level, foreign-effect 7, foreign-unmarked 5, boundary-unannotated 5, boundary-state 5,
compile-options 5, compile-boundary 6, duplicate-cell 6, cycle 6, iterator-cell 4, state-undefined 3,
state-in-state 2, reserved-name 3, no-ts-ignore 3; the probes were written for the rules with fewer than 5 hits.
Rule ids written by core.ts read from its AST (`.scratch/module-port/rules.ts`): 24.

Controls (one cell replaced per md file, `module:lite/infer` left out, 912 sources):

```
md-shape   mdTsIgnore never matches            DIFFERENT   7
md-graph   mdVisit reports no cycle            DIFFERENT   7
md-inject  mdInjectAnn without inject-type     DIFFERENT  24
md-taint   mdTaintOf without capabilities      DIFFERENT  19
md-compile mdIslandSide without compile-bound. DIFFERENT   5
md-value   mdStateRules without state-undef.   DIFFERENT  11
md-run     mdDedupe keeps every copy           DIFFERENT  47
md-cell    mdKeep, every value usable          DIFFERENT  29
md-facts   mdReturnsRef always false           DIFFERENT 242
md-entry   mdShownNames counts from 3          DIFFERENT   3
```

On the 12 probes alone every control differs (1-4 sources); `infer.test.ts` now asserts that (4.6 s). The
per-cell differential after the changes (17:4x): 823 sources, 3451 cells, SAME 3437 DIFFERENT 0 NOT COVERED 0,
REAL CRASH 14 (port crashed the same); facts, ownership, captures, fed rule all 3437 SAME.
`bun test infer/infer.test.ts`: 5 pass 0 fail, 61.3 s (after the fifth test was added).

### Checker messages met, and the rewrite

- `mut-capture: Mut M captured by a function that escapes` (mdCheckSources, `M.boundaries` read in a `map`
  callback): read into a const first.
- `type: Map<unknown, unknown> is not assignable to Map<string, MdBoundary>` (mdInjectBoundary, `?? new Map()`):
  annotated the const.
- `mut-escape: Mut M argument to a parameter not typed Mut<…>` and the like, and `unknown type IxK` etc.: the
  first self-check run left out the ix/ow files; with them in the module these went away.
- `no-member: property message on Js/unknown; narrow it first` (mdRunChecks, `e instanceof Error ? e.message`):
  `instanceof` is unsupported (`infer.ts:895`), so a cell cannot read a caught value at all. Moved to glue as
  `X.R.thrown(e)`. Probe: `.scratch/module-port/probe3.ts`; `String(e)` is accepted, but core.ts uses
  `(e as Error).message`, which differs for a non-Error throw.
- Captured Mut in `map`/`forEach` callbacks in mdInject: rewritten as `for` loops.

After that the self-check (`.scratch/module-port/big.ts all`): 493 cells, 0 not ok, module errors [].

### The slow large module, and the fix

First timing of `module:lite/infer`: real 9856 ms, port 73970 ms. CPU profile (`bun --cpu-prof`, 17:29):

```
  72819 ms hidden      69417 ms anyHides     27482 ms peek
```

`Checker.mayHide` memoises per Checker (`infer.ts:532`, `mayHideMemo = new WeakMap`); `ixMayHide` did not, and
the self-check module's types (the AstNode union) are large. Added `mayHideMemo: Mut<Map<Ty, boolean>>` to
`IxRegCore`/`IxReg`, made per `makeReg` (one per cell, as one per Checker) and shared with `quiet`/`lax`.

```
module:lite/infer  before  real  9440 ms  port 73248 ms
                   after   real  9179 ms  port 10230 ms     (17:38, battery, load 5.39)
```

Not the per-cell Map copies in mdKeep, which were the first suspect; they do not show in the profile.

### End to end (`bun lite/infer/module-time.ts --rounds 5 --reps 20`, 17:45-17:49, battery power,
load 7.12 -> 7.94; other agents' processes running)

Corpus: the 912 module sources other than `module:lite/infer`, one pass per round. Tutorial: 20 checks per round.
Both sides now parse twice (parse.ts and the typed tree for `syntaxCheck`); the port's parse.ts parse is glue.

```
                                     corpus pass (ms)       tutorial check (ms)
checkSources                         8715.0-10152.5         19.1-37.2
port                                 10100.5-11620.1        27.6-37.2
ratio                                1.1-1.2                1.0-1.4
parse.ts parse alone                 743.7-1154.9           3.0-4.1
port by pass (timed run):
  parse+crossing (typed tree)        2211.7-2595.1          6.9-8.2
  registry glue (parse.ts + load)    727.0-1006.7           2.6-3.9
  syntax                             198.6-246.2            0.9-1.4
  inference                          5130.5-5691.5          6.2-7.6
  ownership                          182.2-229.0            0.6-1.0
  captures                           185.4-204.1            0.8-1.0
  module rules and the rest          1704.9-1884.2          5.5-6.4
  total                              10340.4-11697.5        24.4-27.1
```

The by-pass rows come from wrappers (`linkMd(over, given)`), so the timed total is above the plain port run.
checkSources was not broken down by pass.

### core.ts behaviour reproduced, not fixed

- Registry reports made after core.ts copies `ch.diags` into the record reach the Checker only (e.g. "unknown type
  Event"); the port drains them into the span lists at the end of the cell. Six spans DIFFERENT until it did.
- `reg.onErr`/`onUnsup` set for foreign.d.ts (`core.ts:51-52`) are still set at the user load (`core.ts:89`), so a
  user-load report would carry "foreign.d.ts: ". Reproduced in `mdLoadErr`; no source found that reaches it
  (`.scratch/module-port/probe5.ts`: eight type declarations, none reports at load). Unverified in a run.
- Value rules run after dedupe and are not deduplicated; duplicate-cell is unshifted last.
- NOT COVERED: `name in CAPABILITIES` is true for Object.prototype names; `repro/object-prototype-param.ts`.

### What switching `checkSources` to the md cells would change in shipped files

- `lite/core.ts`: `checkSources` body replaced by `runMd(linkMd(), src, opts)` or its shipped equivalent; keep
  `onCell` on the TypeScript path or port it (completion needs a `Checker`).
- `lite/soundscript/ts-cells.ts` and the build (`build.ts`/`verify.ts`): register the ix, ow and md files and the
  `MD_GIVEN` sections; owned by another agent, not touched.
- `CAPABILITIES` lookup: decide whether to fix the `in` bug first (it changes verdicts for `valueOf`,
  `constructor`, `toString` parameters) or to port it.
- `infer.ts`'s `instanceof` support, or keep `thrown` as glue.

# 2026-11-22 00:05: completion's option building and facts.ts as cells (`cp-*.ss.ts`), not switched on

`lite/complete.ts` (299 lines, 256 in top-level statements) and `lite/facts.ts` (75, 58) as 6 files `cp-*.ss.ts`
(43 value cells, 11 type declarations; value-cell lines 335, median 6, largest cpParamSegments 21, cpAnnotationOf
21, cpScan 20, cpCompletionsAt 17; `.scratch/cp-port/stats.ts`). Linked for bun by `cp-index.ts` (76 code lines),
which exports complete.ts's and facts.ts's names with their signatures. Nothing shipped imports it.

```
cp-types    data: CpOption, CpResult, CpReg (the Registry as completion reads it), CpHost (the module checks)
cp-text     the text before the cursor: word, scan, tagAt, HEAD, paramListAt, typeAt, declared, given attributes
cp-members  membersOf, memberNames, kindOf, scopeNames
cp-modes    completionsAt by position kind: jsx, type, param, the placeholder variants, names; pick, by-label sort
cp-param    addParameter, annotationOf (with two reads passed in)
cp-facts    cellsOf (statement selection), globalRefs; factsOf and preludeCalls are md-facts.ss.ts's cells, taken as inputs
```

The text decisions keep complete.ts's regular expressions verbatim (wrapped in named groups, since
`RegExpMatchArray` has no indexed read; `matchAll` is replaced by `exec` on the rest of the text, the `^` branch only
at position 0). Hand-written scanners were the alternative; rejected because HEAD's lazy block comment backtracks
(bug 3 below) and a scanner would have to reproduce that by search, with no corpus case to catch a slip.

## Glue left in TypeScript (`cp-index.ts`)

- running the module check: `checkSources` and the throw complete.ts catches (`hostOf`, 10 lines). The cells get
  `CpHost.probe`/`cellTypes`, each null where complete.ts `continue`s or falls back to an empty map;
- the Registry as `CpReg` (`regOf`, 4 lines): `reg.types.has` and `ifaceRec(n).props` are not in `IxRegCore`;
  `new Registry()` for the JSX branch is `CpHost.fresh`;
- `completionWork` and `counted` (2): module state;
- annotationOf's prototype test and property read (2): a cell cannot make either, `repro/cp-unknown-value-reads.ts`;
- the capabilities as a `Map` and the type names computed once from `PRELUDE_DECLS`/`JSX_DECLS` (`constOf`, 6):
  a cell parameter naming a TypeScript constant is `[inject-unknown]`;
- facts as facts.ts's `CellInfo` (key order, no `boundary` key, `span` only with a statement) and the parse error
  as a thrown `Error` (`infoOf`, `cellsOfWith`, 12); link and exports, the rest.

## Proof (`bun lite/infer/cp-diff.ts --controls`, 2026-11-21 23:55-23:59, AC Power, load 5.36 -> 9.54)

Positions: complete-diff.ts's walk, asserted to give 6385; the same cells cut at the cursor; offset 0 and the end of
every cell; identifiers in type annotations, JSX attributes and children, parameter starts (parse.ts tree with type
fields); 640 probes in `cp-probes.ts` (32 modules of 20, one cell each beside 5 base cells). Every position whose
complete.ts answer is `param` runs again with 7 cells in another language and an `annotate` (one throws); every JSX
position of a .tsx file runs again with tsx off. Compared: the JSON of the result and the module checks and cells
counted (`completionWork` on each side).

```
completion: 16157 positions (and their reruns with outside cells / tsx off): SAME 18343 DIFFERENT 0; 155.7 s
addParameter / annotationOf: SAME 69282 DIFFERENT 0
facts: 3435 sources: cellsOf SAME 3399 DIFFERENT 0 (both threw 36); 5650 cells, preludeCalls/globalRefs sets SAME 246420 DIFFERENT 0 (246420 sets, 7600 entries)
control cp-text (cpNoOffer never stops): DIFFERENT 3 on 1469 positions
control cp-members (cpKindOf always property): DIFFERENT 106 on 1469 positions
control cp-modes (cpByLabel does not sort): DIFFERENT 367 on 1469 positions
control cp-param (cpAddParameter without the already-there check): DIFFERENT 1548 on 1469 positions
control cp-facts (cpStatementDefs without function declarations): DIFFERENT 8 on 687 sources
```

By kind (a position counts under each kind it has; last column: positions with at least one option). Kinds under
20 before the probes were member on lit, num, str, union, unknown, tv, Borrowed, Events, Action, Map, and name:fn.

```
member:arr 299/288  rec 1342/1316  str 68/59  num 34/11  union 160/113  interface 60/60  lit 6/6  tv 20/0
       unknown 26/0  State 302/286  Mut 279/271  Borrowed 32/25  Map 18/18  Events 20/0  Action 20/0
       Listener 20/0  StateCell 20/0     (optional chain: probes member-optional-chain, 20)
name:const 1131  let 560  param 2040  fn 24  global 1458  prelude 2017  in-action 550/488
mode:type 802/780  jsx 224/192  param 2808/2808  none 90  type-ann 636/379  jsx-attr 254/186  jsx-child 528/0
param:cell 2682  capability 1240  other language 469; rerun:param+outside 1404  rerun:tsx-off 782/0
cut (cell cut at the cursor) 6385/4150  offset-0 406/0  end 406/0
variant that answered: 1 9044, 2 726, 3 105, none of 4 988, no check 3556
```

Thin: lit 6 and Map 18 (no probes written for them); tv, unknown, Events, Action, Listener, StateCell, offset 0,
the end, JSX children and tsx off reach only empty lists, so a wrong non-empty list there would show but a wrong
choice among options cannot. The cp-text control differs on 3 positions only. Branch coverage was not measured.

`bun test infer/cp.test.ts` (lite/), 5 pass, 77.2 s: CP_FILES is every cp file; every cp cell is ok in the module of
WITH + ix + ow + md + cp (`r.module` []); every name in a cp file starts with cp and is declared in no other
`.ss.ts`; complete.test.ts through `cp-redirect.ts` (a bun preload resolving its `./complete.ts` to cp-index.ts,
announced on stderr) gives `58 pass, 0 fail`; `cp-diff.ts --quick --controls` DIFFERENT 0, each control > 0.
`bun lite/infer/complete-diff.ts` after: `37 files, 6385 positions: SAME 6385 (1733 with no options) DIFFERENT 0`.

## Timing (`bun lite/infer/cp-time.ts --rounds 5 --every 2`, 2026-11-21 23:54, AC Power, load 5.99 -> 5.83)

127 of the 254 identifier-end and member positions of the 47-cell tutorial module, 209 checks. Option building is
timed with every check answered from a table filled by a first run; for complete.ts its import of `./core.ts` is
resolved to `cp-time-core.ts`, whose `checkSources` is swapped for the table. Both sides made the table's number of
checks at every position (asserted).

```
µs per completion   option building: complete.ts   cells    whole call: complete.ts   cells    checks alone
round 1                              42.8          48.3                 7516.2         7708.1   7466.4
round 2                              28.7          37.5                 6390.1         6456.2   6289.8
round 3                              28.5          38.6                 6826.0         6822.7   6627.8
round 4                              25.7          33.4                 5906.6         5677.6   5587.6
round 5                              25.8          33.0                 5969.4         5842.4   5746.3
```

The first attempt took option building as the whole call less the checks alone; the checks are 97-99% of the call
and the differences came out between -401 and +577 µs, so that method was dropped. A check that throws must be in
the table too (the first table missed them and the replay ran off its end).

## Checker messages met, and the rewrite

```
cpOwnMembers, cpMembersOf  [reserved-name] mutable is reserved: Observable JavaScript reads it as a keyword
                           parameter and local `mutable` -> `onMut`
CP_TYPE_NAMES              [inject-unknown] parameter PRELUDE_DECLS names no cell, foreign or capability (and JSX_DECLS)
                           a value cell of the two texts -> cpTypeNames(preludeDecls, jsxDecls), called once by the glue
```

Accepted on the first try, though unexpected: `Array.isArray(v)` narrows an `unknown` so `v.length` and `v[i]` check
(cpAnnotationOfArray); regex literals; `m.groups?.n`. Not possible in a cell (`repro/cp-unknown-value-reads.ts`):
`Object.getPrototypeOf` (`[no-member]`), `v[k]` on `object` (`[type] cannot index object with string`),
`Object.values(v)` on `object`.

## complete.ts behaviour reproduced, not fixed (`bun lite/infer/repro/cp-complete-bugs.ts`, both sides print alike)

1. scan reads `//`, `/*`, `"`, `'` as comment or string starts inside a template literal's text: in
   `` `http://h/${x.‸}` `` and `` `don't ${x.‸}` `` nothing is offered (`none []`; without them, `member ["a"]`).
2. paramListAt counts the `>` of `=>` as a closer: `const f = (cb = () => 1, co‸` gives `name []`, while
   `(cb = 1, co‸` gives `param ["compile","count"]`. typeAt skips `=>`; paramListAt does not.
3. HEAD's lazy block comment backtracks past a later `*/`: `/* a */ x /* b */ const f = (co‸` is a parameter list.
4. Not a difference seen: the cells read `args[0] ?? m` where membersOf reads `m.args[0]` of a Mut/Borrowed; no
   input found where they differ. Also kept: the JSX branch's `reg.member(p.t, n)!` is a `=== undefined ? ""` in
   the cell; never reached on the corpus.

## Dead ends

- Probe modules with all 20 cursor cells in one module: every cell but the cursor's was incomplete, the module never
  parsed, and every probe answered an empty list. Each probe cell is now its own module beside the base cells.
- `|` as the probe cursor mark: the base cells hold union types. The mark is `‸`.
- Name and parameter probes with fixed suffixes (`h` + `to`) matched no binding; they now type the first letters of
  the target name.

## What the integration step must change in shipped files

- `lite/infer-ss.ts`: link the 6 cp files with the ix and md cells (cp cells take `mdFactsOf`, `mdPreludeCalls`,
  `mdRebinds`, `kidsOf`, `parseTree`, `named`, `show`, `members`, `isNamed`, `propT`); move `cp-index.ts`'s glue
  next to it or keep it as the facade.
- `lite/complete.ts`: its body replaced by `cp-index.ts`'s exports (`completionsAt`, `membersOf`, `annotationOf`,
  `addParameter`, `completionWork`); `Completion`/`Completions` stay (cp-index imports them as types). Deletable: scan,
  tagAt, paramListAt, typeAt, declared, TYPE_NAMES, kindOf, membersOf, memberNames, scopeNames, HEAD, annotationOf
  but its two reads, addParameter, completionsAt (about 247 of 256 statement lines, counted by hand: the 9 left are the check calls, their catches, `new Registry()`, the counter and the two value reads). `lite/infer/frozen/complete.ts` stays
  for complete-diff.ts.
- `lite/facts.ts`: cp-index's `cellsOf(src)` keeps the signature. `factsOf` takes typed-tree nodes (`FnNode`,
  `AstNode`), and `preludeCalls`/`globalRefs` return `Set<number>` of nids, not parse.ts nodes. Callers:
  `toolchain/ss-toolchain.ts` 102, 188, 272 (cellsOf, fine), 286, 289 (`globalRefs(...).size`, `n.start`: needs the
  typed tree and `byNid`), 291 (`preludeCalls(fn, "on").size`); `browser/cells.ts` 9 re-exports `cellsOf, factsOf`;
  `selfhost/sched-cells/shell.ts` 8. Until those move to the typed tree facts.ts's freeUses/globalRefs/factsOf stay.
- `lite/stdlib/runtime.ts` 24 (`completionWork`) and `lite/soundscript/entry.ts` 9 (`completionsAt, annotationOf,
  addParameter`): re-point.
- `lite/soundscript/ts-cells.ts`: the 6 cp files in SS_SOURCES, CHECKER_FILES and the checker's group, a SECTION_OF
  entry; complete.ts and facts.ts stay as glue sections. Not touched here.
- `lite/infer/infer.test.ts` test 1 fails now: it requires `lite/infer/*.ss.ts` to equal IX+OW+MD files, and the cp
  files (and the other agents' rg files) are there (`bun test infer/infer.test.ts -t IX_FILES`, 2026-11-22: 1 fail,
  13 extra names). Add CP_FILES there.

Unsure: the notebook's compiled cells take `CpHost` functions made by glue each call; whether the in-page runtime
can hand a cell such a record across its boundary was not tried (bun only).

## The Registry as cells over the typed tree (rg-*, 2026-11-21 23:40 to 2026-11-22 00:12)

`registry.ts` (346 lines) ported to 7 files `rg-{types,ctl,convert,sig,expand,load,view}.ss.ts` that read the acorn
typed tree, plus glue `rg-index.ts` (Maps, the knot record `RgK`, `RegOps`/`DeclOps` for the subtype cells, `IxReg` per
cell view, `MdReg` for the module check, `rgRunCheck`). Nothing is switched on; no shipped file was edited.

Sizes (`.scratch/rg-port/stats.ts`, which reads registry.ts's parse): 70 value cells and 21 type cells, 509 lines;
median cell 6 lines, largest `rgExpand` 24, `rgTypeRef` 21, `rgConvertTs` 19, `rgQuietGo` 19. registry.ts has 18
functions and methods: `flagsOf`, `keyName`, `marker`, `builtinTypeNames` (top level) and `constructor`,
`builtinTypeNames`, `load`, `peek`, `sig`, `sigOf`, `convert`, `literal`, `expand`, `ifaceRec`, `sub`, `quiet`, `trial`,
`unify`. 16 are cells. `constructor` and `unify` (a passthrough) are glue; `peek`'s journal is cells
(`rgPeekOpen`/`rgPeekClose`) and only its `try/finally` is glue. Those 16 plus the constants `FLAG_NAMES`, `KEYWORDS`,
`DECLS`, `ONE_ARG` and the `isTypedArray` field span 263 of the 346 lines (peek's 9 counted). The rest are imports,
type declarations, the fields, `alphaNames`, `constructor`, `unify` and the one-line bindings of the subtype cells (`member`, `callSigs`, `iterElem`, `subOps`, `unifyOps`, `memberOf`,
`isAlias`, `decls`), which become `RegOps`/`DeclOps` built in `rg-index.ts`.

Shape: tables are `Mut` parameters `(G, Y, E, I, Q)` (knot, types, expand memo, iface memo, controls). Reports go to
`Q.log` and the glue moves them to whichever sink registry.ts's handler swapping would have used. Peek is an undo
journal over both memos; it nests. `IxReg` and `MdReg` keep their shapes; `MdReg.loadUser(text)` still takes text and
`rgLinkMd` gives the md cells a memoising `parseTree` so the tree is parsed once.

### Coverage (`bun lite/infer/rg-diff.ts`, full corpus, 2026-11-22 00:09, AC power, load 11.93)

```
registry level: 81546 units in 970 sources: SAME 81505 DIFFERENT 0 NOT COVERED 33 BOTH THREW 8
end to end: 973 sources: SAME 971 DIFFERENT 0 NOT COVERED 2 BOTH THREW 0
  1 NOT COVERED: member TSMethodSignature held as Other
  1 NOT COVERED: declaration TSDeclareFunction held as Other
  parser runs: checkSources 2003, rg 1030 (973 sources)
```

Units: constructor tables and globals, builtin names, load (reports with line, in order), quiet on each declared
name before anything expands it, convert of every root type node, sig of every function with a return type, sub/quiet
pairs, expand with and without tps, peeked expand, ifaceRec, memos at the end. `$aN` names are renumbered per unit.
The corpus is `diff.ts`'s plus `rgprobe:` (11 modules in `probes/registry.ts`) and `module:rg`. The probe cells are
`() => (x: T) => ...`; written first as `(x: T) => ...`, their parameters were injected deps that name no cell, the
checker rejected them with `inject-unknown` and never converted the types, so end to end compared nothing there.

BOTH THREW 8: `sub` on a `Map` with no type argument, `undefined is not an object (evaluating 't.k')` on both sides.
Every NOT COVERED is a probe whose typed tree holds an Other node where registry.ts reads fields; the corpus has 0
of each. `other-forms` (30 registry units, 1 module): `m?(): void`, a property signature with no type, and
`set x(v: number)` are Other members. `no-return-type` (3 units, 1 module): `declare function nr(x: number);` in
foreign.d.ts. The typed tree's `TSDeclareFunction.returnType` is non-null, so acornParse makes the statement Other;
registry.ts gives it `void`. Repro: `lite/infer/repro/declare-no-return.ts`. The fix belongs to `lite/acorn` (a
synthetic input, then census and gen). A gap stays set for the rest of a registry, so every unit after the first
Other read in that source counts NOT COVERED. `rg.test.ts` pins 33 and 2.

Census of corpus uses per form (`rg-diff.ts --census --skip-big`): 0 for tuple rest/optional/named, construct
signature, interface declared twice, cyclic extends, type parameter default, unary or template literal types,
get/set signatures, qualified names, ValueOf, `@flag` comments, type parameter shadowing; under 5 for typeof (2),
overloaded declare function (2), generic alias (4), generic interface (3), computed property signature (4). Each of
these is in `probes/registry.ts`, with `export type`/`export interface` and a template literal type with a hole.

### Controls (`--controls`, one cell broken per rg file)

On the corpus (`--skip-big`) three of the first six went undetected (`rgTuple` rest element, `rgDeclType` no merge,
`rgGlobals` without the equals/messageOf types). On the probes, after adding the probes and a globals unit (2026-11-22 00:07):

```
control                                         registry DIFFERENT  end to end DIFFERENT
rg-ctl: rgPeekClose keeps the peek's entries     68                  0
rg-convert: rgTuple reads a rest element         54                  3
rg-sig: rgSigParam, no parameter optional        23                  0
rg-expand: rgIfaceExtends ignores extends        17                  2
rg-load: rgDeclType never merges an interface    14                  1
rg-view: rgGlobals without equals/messageOf       1                  0
rg-expand: rgLiveSet does nothing                27                  1
rg-ctl: rgTrial never loud                       25                  0
```

`rgTrial never loud` was 0 until `quiet` was asked of each declared name before the convert units. Asked after, the
expand memo already holds the name and the trial's loud flag is never reached. `rg.test.ts` requires all 8 > 0.

### Timings

2026-11-22 00:02, AC power, load 10.46 at start and 9.89 at end (other agents running), 3 rounds over 970 modules:

```
                       checkSources   rgRunCheck
end to end, ms         4177 3916 4025  3777 3832 3809
µs per module          registry.ts    rg
  parse                184 170 169    652 532 537   (parse.ts against acorn parseTree)
  construct            117 110 108    406 368 363
  load (types only)    1.6 1.7 1.4    2.4 2.3 2.2
```

`construct` includes loading the prelude, intrinsics and foreign declarations (the rg side holds the three trees
parsed once per process). Load and convert units only (parse excluded), 2026-11-22 00:09, AC power, load 12.08: 88.3
µs per source registry.ts, 77.9 rg; again at 00:09 with `module:lite/infer`, load 11.93: 102.8 and 81.9. Not tuned:
speed is third.

Live checker on WITH (`types`, `subtype`, `walks`, the three acorn sections) plus the rg files
(`.scratch/rg-port/selfcheck.ts`), 2026-11-22 00:01, AC power, load 10.88: 911, 912, 894 ms. 70 of 70 value cells ok.

### Checker messages met, and the rewrite

- `rgBuilt`: `[possibly-undefined]` on `Q.building.name` and `.next` after a ternary on the Mut field. Rewritten to
  `const b = Q.building; if (b !== null) ...`.
- `rgGlobals`, `rgIsTypedArray`: `[inject-unknown] parameter PRELUDE_FNS / ALLOWED_GLOBALS / TYPED_ARRAYS names no
  cell`. These became ordinary arguments; the glue passes the intrinsics constants.

No unit was left NOT COVERED for a cell that would not check. `lite/infer/repro/declare-no-return.ts` is the typed-tree
gap above, not a checker limit.

### Dead ends

- A per-tree Other check (any Other node in a loaded tree = gap) marked whole modules NOT COVERED for a `class`
  statement registry.ts never reads. Replaced with `rgOther` at each field registry.ts reads (annotation, literal,
  type name, typeof name, member key, index parameter, extends clause, export wrapper, alias body).

### registry.ts behaviour reproduced, not fixed

- The alias memo is keyed on `show(t)`, which shortens names.
- `RegOps.at` may return undefined; an empty-argument `Subst` keeps the identity through `at`.
- `RegOps.same` is identity.
- `Map` with no type argument crashes in `sub` (BOTH THREW 8).
- Fresh type variables number from the cell's own start (`T'1000001`, from ix `C.fresh`).
- The constructor's reports are dropped, `got` is cleared at each load, and reports between `loadUser` and the first
  cell are lost.

Differs by design: `RegOps.fresh` (`$aN`) is a counter per registry (`Q.fresh`); registry.ts's `alphaNames` is
module-global. The registry-level units renumber `$a` names, so they cannot see this. The end-to-end comparison does
not renumber and is 0 DIFFERENT, so no corpus report differs by it.

### What integration must change (not done)

- `lite/core.ts`: `checkSources`/`runCheck` build the `MdReg` with `rgMdRegistry` and link the md cells through
  `rgLinkMd` (or change `MdReg.loadUser` to take the Ast); add `rgGap` handling.
- `lite/soundscript/ts-cells.ts`: register the 7 rg files.
- `lite/infer/infer.test.ts` test 1 fails while rg files sit in `lite/infer/` (it globs `*.ss.ts`): add `RG_FILES`.
- `lite/complete.ts` uses `new Registry()`, `probe.reg`; it needs `callSigs`/`expand`/`member`/`types`/`ifaceRec`
  from `RgRegistry`.
- Still on `registry.ts`/`parse.ts`: `acorn/index.ts` `parseTreeShape`, `soundscript/entry.ts` and
  `syntax.test.ts` (`builtinTypeNames`), `walks.test.ts`, and `acorn-shell` (parse.ts's TS/TSX classes). Until those
  move, registry.ts is not deletable.
- Deletable at integration: the copies made here, `regAround` and `rgRunCheck` in `rg-index.ts` (from core.ts) and
  the corpus gathering in `rg-diff.ts` (from diff.ts); core.ts's second parse of each module.
- A copy of the rg files sits at `selfhost/opaque-handles/proto/lite/infer/` (another agent's copy of the lite tree,
  made 2026-11-21 23:57); `rg.test.ts`'s name-uniqueness test exempts files at the same relative path.
