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
