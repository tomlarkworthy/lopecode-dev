# Owned groups (`mut({ f: mut(fresh) })`): prototype, probes, refactor trial

Work done 2026-11-22 00:43 to 01:36 CET (`date` at start and at the last run, `out/copy-stamp.txt`,
`out/probes-stamp.txt`). Folder `selfhost/mut-groups/`. Nothing outside it was edited. `build.ts` and `verify.ts`
were not run. No git command was run. All commands below are run from this folder. Paths:
- `lite/…` and `fixtures/…` are relative to `tools/lang-experiment/` (`../../` from here);
- `base/…`, `proto/…`, `refac/…` and `out/…` are in this folder;
- a bare file name such as `ix-ops.ss.ts` is in `proto/lite/infer/` (the same in `base/` unless it is a patched
  file).

In short:
- The prototype accepts one level of owned containers in a group. It gives the expected verdict on 158 of 158
  probe programs (170 cells).
- The patch is 49 added and 8 removed lines in 5 checker files, plus one new file of 81 lines. It changes no
  verdict, rule, line or message on 890 corpus jobs (4267 cells).
- The trial rewrites the checker's own tables onto a group: 240 parameters fewer in the ix cells, verdicts
  identical.
- The work found a soundness hole in the shipped ownership check, a named function expression that escapes,
  and fixes it. That fix is a prerequisite for groups being sound (§4.5).
- A first draft of this record called the prototype sound. Two later looks found seven accepted programs in
  four classes (§4.8, §4.9):
  - a group inside a conditional or logical expression;
  - a group typed as a union;
  - a group lent to a parameter typed `Mut<{ a: T }>` with `T` a type variable;
  - a union with one group member, given to an intrinsic.

  All are fixed. Holes turned up in each of three looks, and soundness rests on the probes and mutants, not on a
  proof (§1).

## 0. What is in this folder

| path | what |
|---|---|
| `base/` | copy of `lite/` (no `node_modules`, `notebook`, `soundscript`, `.scratch`) + `prelude.runtime.ts`, `prelude.d.ts`, taken 00:48 (`out/copy-stamp.txt`, with hashes) |
| `base2/` | a second untouched copy of `base/`, for the timing noise floor (§8) |
| `proto/` | `base/` + the group patch + the helper fix (`out/edits.base-proto.diff`) |
| `fixA/` | `base/` + the helper fix alone (`out/edits.base-fixA.diff`) |
| `refac/` | `proto/` + the refactor trial (`out/edits.proto-refac.diff`) |
| `probes.ts` | the probe programs and their expected verdicts; `bun probes.ts <tree>` runs them |
| `corpus.ts` | snapshots the differential corpus to `out/corpus.json` (00:59); jobs copied from `lite/infer/diff.ts` `jobs()` |
| `verdicts.ts`, `cmp-verdicts.ts` | the corpus through one tree's `checkSources`; compare two trees, every field |
| `selfcheck.ts` | `infer.test.ts`'s "every ix, ow and md cell is accepted", for any checker tree on any cells tree |
| `mutants.ts` | breaks each new rule in a scratch copy (`mtree/`) and reruns the probes |
| `census.ts`, `cell-sizes.ts`, `ast-casts.ts` | parameter census, cell lengths, casts and `!`, on the TypeScript AST |
| `coverage.ts` | member expressions with no recorded type, through an instrumented `mtree/` |
| `codemod.ts` | the refactor, on the TypeScript AST with a `ts.Program` for symbol resolution |
| `bench.ts`, `demo-runtime.ts`, `try.ts`, `try-src.ts` | timing; run-time behaviour; the checker on cells given on the command line |

`out/corpus.json` is a snapshot because another builder is changing the tree tonight; base and proto see the same
text. The corpus is diff.ts's (ports, fixtures, spec files, `.ss.ts` sections, spec reject rows, inline `.ojs`
snippets), plus:
- `lite/infer/probes/*` (diff.ts `--file`);
- `MODULE_PROBES` (`--module-only`);
- the self-check job `self:infer`: the 10 sections and 39 infer files of `base/`, so in every tree it checks
  base's cells.

`selfhost/*.ss.ts` is a one-level glob, so this folder is not in it.

## 1. The design as prototyped

```ts
type Tab = Mut<Map<string, number>>;
type G = Mut<{ types: Tab; vars: Mut<Map<string, string>>; n: number }>;
const ctx: G = mut({ types: mut(new Map()), vars: mut(new Map()), n: 0 });
ctx.types.set("a", 1);     // ok: ctx.types is Mut
fill(ctx);                 // one parameter, typed G
const f = freeze(ctx);     // f: { types: Map<..>; vars: Map<..>; n: number }
```

- **An owned field is marked with `mut(...)`.** It is a `mut(fresh)` that is the value of a plain property
  of the object literal given to a `mut(...)` that initialises a local `const` (`proto/lite/infer/ow-place.ss.ts:41-51`).
  The inner `mut`'s argument goes through the existing freshness rule. Anywhere else, a nested `mut` is
  `[mut-bind]` as today. That gives one level by construction.
- **The type is the one the expression already had.** `mut(e)` has type `Mut<T>`, so the literal has type
  `{ types: Mut<Map> }` and the group has type `Mut<{ types: Mut<Map> }>`. A parameter that receives a group is
  typed the same. Writes need no change: `ixWriteRule` (`ix-ops.ss.ts:130`) already accepts a write whose
  receiver has a `Mut` type.
- **The bare form Tom wrote, `mut({ types: new Map() })`, is not a group.** That shape is the S4.7 reject row
  (`lite/soundscript/spec.ojs:694`, `mut({ a: { b: 1 }, xs: [1] })` then `m.xs.push(2)`), and it stays
  `[mut-deep-write]` (probe `r2-bare-proposal`). Owner question 1.

The new rules, all in `proto/lite/infer/ow-group.ss.ts` unless noted:

| rule | where | id |
|---|---|---|
| a field of a Mut whose type is Mut (or a union with a Mut) may stand only where a Mut name may (`owPosition`): receiver, argument to a `Mut<…>` parameter, `borrow`, `equals`, a non-retaining intrinsic, a `for…of` source; bound, returned, placed, yielded, thrown, awaited, captured into state, or given to `freeze` it is not | `owFieldPos` :35, `owGroupEscapes` :62 | `mut-escape` |
| an expression whose type is a group, or a union with a group member (a name, or a conditional, logical or chain around one), is not spread (`{...ctx}`, `mut({...(p ? ctx : ctx)})`) | `owGroupRef` :51 | `mut-escape` |
| such an expression (or a union with a group member) as an argument goes only to a parameter whose declared type is itself a group, or to `freeze`, `equals`, `messageOf`; not to `Mut<{ a: T }>` of a type variable, not to `borrow`, not to an intrinsic (`Object.values` gives the fields back) | `owGroupArg` :42 | `mut-escape` |
| an owned field is not assigned or deleted | `owFieldAssign` :74 | `mut-field-assign` (new id) |
| `freeze` of a group gives its owned fields as frozen: `Mut<X>` fields read as `X`, in a record or in each member of a union; if the result still holds a Mut, `freeze` is a type error | `ixThaw`, `proto/lite/infer/ix-prelude.ss.ts:83`; the error in `ixUnwrapCall` :70 | `type` |
| a named function expression is a local helper only when it is also bound to a const and each of its names is only called | `owHelper`, `proto/lite/infer/ow-tree.ss.ts:59` | `mut-capture` (fix, §4.5) |

What the guarantee rests on: an owned container can be reached only through (a) its group, an expression the
existing rules track by name (escape positions, captures, flow after `freeze`, async loans) and the new rules
track by type; or (b) a field expression `g.f`, which the first rule gives the same positions as a Mut name.
The rule allows exactly two kinds of second route, both Mut-typed and both ending when the call returns: a lend
to a parameter declared as a group, and a local helper that captures the group. Neither survives `freeze(g)`:
- A lend cannot be kept. It is a Mut parameter whose fields are declared Mut, so the callee's escape rules apply
  to it and to its fields. A parameter `Mut<{ a: T }>` would see the field as `T`, which is why it is refused.
- A helper call after `freeze` is `[mut-after-freeze]`.
- `freeze` types the fields as non-Mut, and it fails closed when it cannot.

No other expression of a Mut type can be built from a group:
- A literal holding a group field is `[mut-escape]`.
- Spreads and intrinsic calls are rejected for a group.
- `borrow` of a whole group is rejected.

That argument is checked by the probes and mutants below, not proved. It depends on the existing rules being
sound, and §4.5 is one place where they were not. The new rules read the type the inference recorded for each
member expression. Where none is recorded they skip it. §3 counts those cases.

## 2. Probes (`probes.ts`)

158 probe programs, 170 cells. The routes are the owner's numbering:

| route | what it covers |
|---|---|
| 0 | what the proposal should accept |
| 1 | taking a field out |
| 2 | putting an existing value in |
| 3 | lending part of the group |
| 4 | freezing and giving away |
| 5 | depth |
| 6 | today's rules restated for a group |
| 7 | typing |

```
tree proto: 158 probes, 170 cells: PASS 158 FAIL 0; by route 0:8/8 3:12/12 4:11/11 7:20/20 6:25/25 2:23/23 1:51/51 5:8/8
tree refac: 158 probes, 170 cells: PASS 158 FAIL 0; ...
tree base:  158 probes, 170 cells: PASS 33 FAIL 125; ...
tree fixA:  158 probes, 170 cells: PASS 35 FAIL 123; ...
```
(`out/probes.*.txt`, 01:35). A verdict is status plus the sorted set of rule ids. In route 6, each group
program `r6-*` is compared with its plain-Mut analogue `p6-*`, run on the same tree. So its expectation is the
shipped checker's behaviour, not mine. Every `p6-*` analogue passes on base. The two `p1-named-fnexpr-*` probes
expect the §4.5 fix, so they fail on base.

125 probes were written before the patch and stamped (`out/probes-stamp.txt`, 00:58, sha `8b00744…`). 33 were
added later: 3 in edit 2, 3 in edit 3, 3 in edit 4, 11 in edit 5 and 13 in edit 6. Expected verdicts were
changed in edits 1 to 5. Each edit is stamped with its reason and the file's sha, and §4 records why.

Routes not in the owner's list, found while walking `ow-pos.ss.ts` `owPosition` (every position a Mut name is
judged in), `owFresh`, `owPosCall` and the base acceptance map (`out/base-map.txt`):
- `Object.values` / `Object.entries` on a group whose fields share one type. No type error stops these, and
  base accepted the program (§4.4).
- `{ ...ctx }` and `structuredClone(ctx)`: on base the copy has type `{ f: Mut<…> }`, and `s.f.push` was
  accepted (`out/base-map.txt`, "values").
- A group inside a conditional or logical expression, given to a spread, an intrinsic or `borrow` (§4.8).
- Groups typed through an interface, an alias, or as a union of records (§4.8, §4.9).
- A group lent to a generic parameter, and a union with one group member (§4.9).
- JSX spread `<C {...ctx} />`, which is unsupported ("spread attribute", `r1-jsx-spread`).
- Narrowing a field (`Array.isArray(ctx.xs)`, truthiness, `typeof`, `!== null`), then binding it: rejected on
  proto before any fix, and now probed.
- Other field positions, now probed:
  - `mut({ ...ctx })`;
  - `(0, ctx.f)`, which is unsupported;
  - `ctx.f ?? ctx.f` and `p ? ctx.f : ctx.f`;
  - `throw`, `await`, JSX, `state(ctx.f)` and `for…in`;
  - `ctx.f.values()` and `subarray`, which the existing `[mut-view]` rule covers.
- A conditional around the group literal `mut(p ? {…} : {…})`, which `owFresh` accepts as fresh
  (`ow-place.ss.ts`, `owFresh`). Its inner `mut`s are `[mut-bind]`.
- Optional and nullable owned fields (`r7-optional-owned`, `r7-nullable-owned`). A reader of a generator cell
  annotated `Borrowed<{ t: Mut<…> }>` (`r7-borrowed-reader-typed-group`) gets `[inject-type]`.
- Named function expressions (§4.5).

## 3. Corpus differential, self-check, cell sizes, casts, coverage

The corpus run (`out/run-base.txt`, `out/run-proto.txt`, `out/cmp.base.proto.txt`):
```
base:  890 jobs, 4267 cells: ok 2603 rejected 1576 unsupported 81 blocked 7; crashes 0
proto: 890 jobs, 4267 cells: ok 2603 rejected 1576 unsupported 81 blocked 7; crashes 0
890 jobs, 4267 cells in base: jobs that differ 0, cells that differ 0
```
The proto and refac runs are the final ones, at 01:35. `base/` did not change, so its run is the one from 00:59. `cmp-verdicts.ts` compares the whole record: module errors, and per cell the
status, every error's rule, line and message, unsupported items and blockedBy. The same holds for `refac`
(`out/cmp.base.refac.txt`, 01:35) and for `fixA` (`out/cmp.base.fixA.txt`, run before edit 5; `fixA` did not
change after it). The corpus includes the 9 `mut-deep-write` reports of the S4.7 fixtures
(`out/deep-write-in-corpus.txt`), all unchanged.

Self-check (`out/selfcheck.txt`):
```
proto checking proto: 508 cells (40 infer files + 10 sections), module errors 0, not ok 0
refac checking refac: 508 cells (40 infer files + 10 sections), module errors 0, not ok 0
base checking base:   496 cells (39 infer files + 10 sections), module errors 0, not ok 0
```

The other checks on the changed files:
- `bun cell-sizes.ts proto ow-group.ss.ts ow-place.ss.ts ow-tree.ss.ts ow-entry.ss.ts ix-prelude.ss.ts`
  (`out/cell-sizes.txt`): no cell over 26 lines, longest 23. In the whole tree the one cell over 26 lines is `ixMayHide` (30), and it is in base
  too.
- `bun ast-casts.ts` (`out/casts.txt`): 0 `as` (other than `as const`), 0 `<T>x` and 0 `!` in the five
  changed files of proto and in all 28 ix and md files of refac. Base has 0 too.
- `bun coverage.ts` (`out/coverage.txt`, 01:30, before edit 6, which does not change typing) counts the member
  expressions that have no recorded type. The group
  rules skip those (§1).

  ```
  probes: 145 jobs; member expressions 460, no type 4, object has no type 4, no type on a Mut object 0
  corpus: 889 jobs; member expressions 16623, no type 62, object has no type 59, no type on a Mut object 0
  ```
  Where the object has no type, it is mostly an intrinsic namespace, such as `Object.freeze` in
  `lite/runtime.ss.ts` and `selfhost/rt/*.ss.ts`. The rest are names in cells that are already rejected or
  unsupported, such as `lite/infer/probes/own.ts`. I listed the corpus jobs (`out/coverage.txt`) but did not
  inspect every case.

## 4. Dead ends and corrections, in order

**4.1 `p6-action-after-freeze`, an analogue's expectation (edit 1, 00:58).** I expected `ok`. Base rejects it:
`[action-capture] f is computed from ctx, which is a Mut, …`. An analogue's expectation is base's verdict, so the
expectation was changed, not the checker.

**4.2 First proto run, 13 expectations (edit 2).** They differed from the run on secondary rule ids only. Each
route was still closed, by an existing rule:
- `ctx[k]` is a `[type]` error, and `(0, ctx.f)` and `for…in` are unsupported.
- `Object.assign(ctx, …)` is `[mut-escape]` (ctx to a non-Mut parameter) as well as unsupported.
- `mut({ ["t"]: mut(…) })` gives `[no-member]` plus "computed property".

**4.3 A rule that a value of a type holding a Mut is legal only as a group's own name: dropped.** That was the
allowlist I started from. The first differential rejected 261 corpus cells, all in the checker's own cells, for
example:
```
[mut-escape] K has type IxK, which holds a Mut it does not own
[mut-escape] a value of type IxReg holds a Mut; only a group's own name may hold one
```
`IxReg` carries `mayHideMemo`, a Mut Map that the TypeScript glue makes (`base/lite/core.ts`, `regCore`). Base
already accepts records that hold a Mut, so long as they come in as parameters (`out/base-map.txt`,
"param-write"). SoundScript cannot build one, because placing a Mut name in a literal is `[mut-escape]`. The rule
was narrowed to field expressions whose object is a Mut. Nine expectations changed in edit 3. Three of them went
to `ok`: `r1-param-array-of-mut`, `r1-param-record-of-mut` and `r5-map-of-mut`.

The same run gave a second dead end. A cell outside groups (`ss:selfhost/rt/prelude.ss.ts`, `rt`) gained
`[unknown-type] unknown type Event`, deterministic on rerun. The "holds" walk expanded aliases the checker never
expands, and the registry reported while expanding. The narrowed rule expands only when a group is spread or
given to a function, and `ixThaw` expands through `K.reg.quiet`.

**4.4 `Object.values` on a group whose fields share one type.** This was found after edit 3 and was accepted
by proto at that point:
```
const ctx = mut({ a: mut([1]), b: mut([2]) }); const vs = Object.values(ctx); const r = freeze(ctx);
for (const v of vs) v.push(3);        -> a ok
```
`Object.values` is a non-retaining intrinsic, so a Mut may be given to it (`ow-tree.ss.ts`,
`owNonRetainingArg`). Non-retaining means "does not keep"; it does not mean "does not hand parts back". The fix
is `owGroupArg`: a group goes only to Mut parameters, `freeze`, `equals` and `messageOf`. `JSON.stringify(ctx)`
is rejected as a result (`r1-json-group`), and `acc-reads` was changed to stringify `ctx.inner` (edit 4).

**4.5 Named function expressions escape the capture rule. This hole is in the shipped checker and is not
specific to groups.**
```
bun try.ts base 'const a = () => { const ctx = mut([1]);
  const fs = [function g(): void { ctx.push(2); }]; const r = freeze(ctx); for (const f of fs) f(); return r; };'
a ok
```
At run time `freeze` returns its argument (§6), so `r` changes after it is frozen.

The cause is `owBindingOfFn` (`base/lite/infer/ow-tree.ss.ts:47`). It keeps, per function, the last binding
that names it, which here is the expression's own name `g`. `owHelper` (`:58`) then finds every reference of `g`
to be a call, because there are none, and so takes the function for a local helper. `const f = function g()
{…}; return f;` is accepted the same way. The anonymous form is rejected.

`lite/infer/frozen/own.ts:73-77` has the same "last binding per function" logic. I did not run it, so whether
the frozen TypeScript checker has the same hole is unverified.

The fix (`proto/lite/infer/ow-tree.ss.ts:59-70`, also alone in `fixA/`, +8 −1) has two parts:
- every binding that names the function must only be called;
- a function expression must also be bound to a const.

It changes no corpus verdict (`out/cmp.base.fixA.txt`). It makes probes `p1-named-fnexpr-*` and
`r1-*named-fnexpr*` pass.

**4.6 Field rule on unions (edit 3).** `ctx.t` of an optional or nullable owned field has a union type. Without
handling, `const x = ctx.t` would be a second name that the escape rules do not track. Today
`{ t: Mut<X> }` is not assignable to `{ t?: Mut<X> }` (`[type]`, a consequence of Mut being invariant,
`base/lite/subtype.ss.ts:214`), so such a group cannot be built. `owTopMut` covers unions anyway.

**4.7 A computed-field check, removed.** In `owFieldPos` it changed no probe (mutant M2, first mutant run). A
literal key reads as the name, and any other key is a `[type]` error.

**4.8 Two classes of hole in the first draft, found after it was written (edit 5, 01:20-01:24).** A review of
the draft asked where the new rules keyed on syntax while the old rules keyed on bindings. I probed what it
named on proto as it stood (`bun try.ts proto …`, output in the session):
```
a ok     Object.values(p ? ctx : ctx)                    group inside a conditional, to an intrinsic
b ok     const s = { ...(p ? ctx : ctx) }                spread
c ok     const h = mut({ ...(p ? ctx : ctx) }); h.a.push(2)
g ok     yield borrow(ctx ?? ctx)
u1 ok    const ctx: Mut<A | B> = mut({ k: "a", t: mut([1]) }); const f = freeze(ctx); f.t.push(2);
i1 rejected [mutating-method]   the same with interface Tabs { t: Mut<number[]> }
n1 rejected [mut-escape]        if (Array.isArray(ctx.xs)) { const x = ctx.xs; }
```
`owGroupRef` matched only an `Identifier` whose parent was the spread or the call. `owPosition` looks through
conditional, logical and chain nodes, so the field rule had no such gap; the group rule did. `ixThaw` thawed only
a record, so a union-typed group froze with `Mut` fields.

The fixes:
- `owGroupRef` now asks whether the operand's recorded type is a group, whatever the node is.
- `ixThaw` thaws each member of a union.
- `ixThaw` now fails closed. If the frozen type still holds a Mut, `freeze` reports
  `[type] freeze of …: the frozen value would still hold a Mut`. This applies only when the argument is a group
  (a record, or a union of records, with a `Mut` field). `freeze` of `Mut<Map<string, Mut<…>>>` keeps base's
  behaviour (`r5-map-of-mut`, §4.3).
- One expectation changed: `r5-group-in-group` gains `type`.

All five accepted programs became probes, with six more around them (interface, narrowing). The first version of
the `owGroupRef` change read `p.callee` before narrowing `p`. The self-check rejected it with `[no-member]`, and
it was reordered. Mutants M13-M15 guard the fixes.

**4.9 Aliases, type parameters, a union with a group member (edit 6, 01:33-01:35).** The second review asked
for these. I probed them on proto as it stood after §4.8:
```
a1-a5 rejected   type G = Mut<{ t: Tab; u: Tab }> with type Tab = Mut<number[]>: bind, delete, freeze-write, values, spread
p1-p3 rejected   the same through a parameter (g: G)
g1 ok            const first = <T,>(o: Mut<{ a: T }>): T => o.a; const x = first(ctx); const r = freeze(ctx); x.push(1)
u2 ok            Object.values(p ? ctx : { a: [1] })
u1 unsupported   { ...(p ? ctx : { a: [1] }) }
j1 unsupported   <C {...ctx} />
```
The rules hold for aliases because the recorded types are already expanded. The plain-Mut analogue of `g1` is
rejected on base (`[mut-escape] Mut o returned` for `<T,>(o: Mut<T>): Mut<T> => o`). So that route opened only
because the group rules let a group go to any `Mut<…>` parameter.

The fixes:
- `owGroupArg` lends a group only to a parameter whose declared type is itself a group (`owIsGroup` of
  `owDeclParam`). Fields of such a parameter are declared `Mut`, so the field rule applies in the callee. A
  parameter `<T,>(o: Mut<{ a: Mut<T[]> }>)` still takes a group (`r0-generic-group-param`, ok).
- `owGroupRef` treats a union with a group member as a group.

13 probes were added (edit 6), all passing. Mutants M16 and M17 guard the two fixes.

## 5. Mutants (`out/mutants.txt`, 01:35)

M2, the computed-field check, no longer has a mutant: the check was removed (§4.7).
```
M1  field position off              KILLED by 29 probes (r1-bind, r1-return-field, r1-array, …)
M3  group spread allowed            KILLED by 7  (r1-spread-object, r1-spread-into-mut, r1-spread-cond-group, r1-spread-cond-into-mut, r7-alias-spread, …)
M4  group to any function allowed   KILLED by 12 (r1-object-values, r1-object-entries, r1-values-cond-group, r7-interface-group-values, r3-generic-field-out, …)
M5  group borrow allowed            KILLED by 2  (r1-borrow-group, r3-borrow-logical-group)
M6  field assign rule off           KILLED by 6  (r2-delete-field and r7-alias-delete become ok; the four reassignments keep another rule)
M7  freeze thaw off                 KILLED by 7  (r4-write-frozen-field, r4-write-frozen-record, r4-frozen-field-as-mut, r7-interface-group-freeze, r7-union-group-freeze, r7-alias-freeze-write become ok; r5-group-in-group loses type)
M8  group depth unbounded           KILLED by 1  (r5-group-in-group loses mut-bind)
M9  array groups                    KILLED by 1  (r5-mut-array-of-mut becomes ok)
M10 computed keys in the literal    SURVIVED     (ix already reports "computed property" and no-member)
M11 union fields unchecked          KILLED by 3, but every cell stays rejected (by [type] or [mutating-method])
M12 helper fix off                  KILLED by 4  (all four named-function-expression probes become ok)
M13 group ref by identifier only    KILLED by 6  (r1-values-cond-group, r1-spread-cond-group, r1-spread-cond-into-mut, r3-borrow-logical-group, r1-values-union-member become ok)
M14 thaw of a union group off       KILLED by 1  (r7-union-group-freeze becomes ok)
M15 freeze fails open               KILLED by 1  (r5-group-in-group loses type)
M16 lend to any Mut<…> parameter    KILLED by 2  (r3-generic-field-out becomes ok; r3-generic-values loses mut-escape)
M17 union with a group member off   KILLED by 2  (r1-values-union-member becomes ok; r1-spread-union-member becomes unsupported)
```

Two rules are second lines of defence. M10 and M11 survive in soundness terms, because an existing rule closes
the route first. M6 is load-bearing only for `delete ctx.f`: an assignment of a field is also caught by
`[type]`, `[mut-bind]` or `[mut-escape]` on its right side. M15's only probe already has `[mut-bind]`. I found
no group shape that thaws incompletely and is not already rejected. The fail-closed check is there for shapes
not thought of.

## 6. Run time

`bun demo-runtime.ts` (`out/demo-runtime.txt`):
```
proto verdict: a ok
calls: mut mut mut freeze
freeze(ctx) === ctx: true | Object.isFrozen(out): false | Object.isFrozen(out.types): false
plain: freeze(m) === m: true | Object.isFrozen: false
```
`mut`, `freeze` and `borrow` return their argument (`lite/runtime.ss.ts:26-28`).
- A group adds one identity call per field at run time and otherwise changes nothing observable.
- The immutability is static only, the same as for a plain Mut today. A frozen group's Maps are as writable by
  code in another language as a frozen `Map` is now.
- What crosses to another language is a deep-frozen copy (S11.5). That was not re-tested for groups.

## 7. Refactor trial

No ix file is self-contained for the tables. `T, V, W, C` are made in two places:
- `ixCheckFn` (`ix-entry.ss.ts:12-13`);
- on the path `checkSources` takes, `mdCell` (`C`, `md-cell.ss.ts:44`) and `mdInferFn` (`T, V, W`,
  `md-run.ss.ts:8`) between them (`out/census.base.txt`, "mut(...) bindings").

Every ix cell receives them from those two places through the knot `IxK`. A group can only be made where the
tables are made, so adoption is top-down. A one-file trial would need an adapter that cannot exist: a cell
holding four lent Muts cannot build a group from them, because `mut` needs a fresh value. So the trial is the
whole ix family. `codemod.ts` (AST, symbol-resolved) changed:
- each parameter run `T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls` into `G: IxTabs`: 87 signatures, 7 of them
  `IxK` function types;
- each argument run `T, V, W, C` into `G`: 203;
- each other reference into `G.T` and so on: 441 (`out/codemod.txt`, 731 edits).

By hand, in `refac/`:
- `IxTabs = Mut<{ T: IxTypes; V: IxVars; W: IxFlows; C: IxCtls }>` added to `ix-types`;
- `ixCheckFn` and `mdCell` make the group;
- `mdInferFn` and `mdRunChecks` take it.

The fixes of §4.8 and §4.9 were made in `proto/` after the codemod. They were carried into `refac/` by hand:
- `ow-group.ss.ts` copied;
- `ixThaw` and the `freeze` branch of `ixUnwrapCall` copied, with `C` written as `G.C`.

Before and after, ix family, from `bun census.ts proto|refac` (`out/census.*.txt`, 01:36):
```
                         functions  parameters  Mut parameters  functions with >=2 Mut params
ix inner functions  proto    312        1197          425                100
                    refac    312         957          185                 23
IxK/knot fn types   proto     53         146           36                  9
                    refac     53         125           15                  2
ix+md source        proto  3066 lines, 200996 bytes     (out/source-size.txt; base 3047, 199765)
                    refac  3066 lines, 197157 bytes (-1.9%)
```
The line count does not change, because each line is rewritten in place. A typical signature
`(K: IxK, T: IxTypes, V: IxVars, W: IxFlows, C: IxCtls, env: IxEnv, e: AstNode)` becomes
`(K: IxK, G: IxTabs, env: IxEnv, e: AstNode)`. The 23 ix functions left with two or more Mut parameters take
other sets: `T,V,TT,FF` ×3, `V,C` ×6, `W,C` ×5.

Checks on the refactor:
- `proto checking refac` and `refac checking refac`: 508 of 508 ok.
- `base checking refac` rejects exactly `ixCheckFn` and `mdCell`, with `[mut-bind]`. Base already accepts every
  `G.T.set(…)` through a group parameter; only creating the group needs the patch.
- Corpus through the refactored checker: 0 jobs differ from base (`out/cmp.base.refac.txt`).
- Probes: 158 of 158.
- `ixCheckFn` is not on the `checkSources` path, so its edit is checked statically only.

Estimate for the rest (from the census "Mut parameter sets"):
- **ow:** `W,X` ×12 could save 12 parameters. `W` is made once per cell (`owCheckIn`) and `X` once per function
  (`owFlowCheck`). Grouping them changes `X`'s lifetime (a reset per function), so it is not a pure rewrite.
- **md:** `C,M,L` ×5 and `C,L` ×2. `L` is made in `mdCell` beside the group and could join it, saving about 7.
  `M` is made in `mdCheckSources`.

Total available: about 240 + 21 (done), about 7 (md), and 12 with a lifetime change (ow). The md and ow figures
are estimates from the census, not run.

## 8. Cost and timing

The patch is +49 −8 lines in five files:

| file | lines |
|---|---|
| `ix-prelude` | +21 −2 |
| `ow-entry` | +3 −1 |
| `ow-place` | +14 −2 |
| `ow-tree` | +8 −1 |
| `infer-ss.ts` | +3 −2 |

`ow-group.ss.ts` is new: 81 lines, 9 cells. Four existing cells changed: `ixUnwrapCall`, `owMutPlace`,
`owCheckIn` and `owHelper`. Three cells were added beside them: `ixThaw`, `owConstInit` and `owGroupOf`. The
refactor is +616 −616 in 15 files (`out/edits.proto-refac.diff`).

`bun bench.ts 7` ran on 2026-11-22 from 01:26 to 01:29, on AC power. The load average was 5.46 at the start and
6.16 at the end. The trees ran in one process on 889 jobs, interleaved and rotated per round. That is the 890 jobs
less the one whose split failed and has no `src`. `base2` is a second untouched copy of base. The run is in
`out/bench.txt`:
```
base   corpus median 4863 ms (min 4747, max 5239); self:infer median 2755 ms
proto  corpus median 4954 ms (min 4531, max 5329); self:infer median 2820 ms
refac  corpus median 4979 ms (min 4705, max 5265); self:infer median 2774 ms
base2  corpus median 5135 ms (min 4895, max 5338); self:infer median 2754 ms
```
The two identical copies differ by 5.6% (`base` against `base2`). That is the noise floor of this setup.
Against `base`, proto is +1.9% and refac +2.4%, both inside it. No cost of the patch or the refactor can be
resolved at this load. An earlier three-arm run at 01:12 had proto 4.6% faster than base. Its output was read in
the session and not kept, because `bench.txt` was overwritten. The bench ran before edit 6, which changed only
`owGroupArg` and `owGroupRef`; it was not rerun.

## 9. Proposed spec text (proposals only, not applied)

- **S4.2 (amended)** … Anywhere else it is `[mut-bind]`, except as an owned field (S4.10).
- **S4.10** In `const g = mut({ f: mut(e), … })`, a `mut(e)` that is the value of a property with a plain key of
  the object literal is an owned field of the group `g`. `e` must be fresh (S4.3). `g` has type
  `Mut<{ f: Mut<T>; … }>`. A `mut(...)` in the literal of a field is `[mut-bind]`: a group is one level.
- **S4.11** `g.f` of an owned field is a Mut that may stand where a Mut name may (S4.4). Binding it, returning
  it, placing it in a literal, yielding it, passing it to a parameter not typed `Mut<…>`, or `freeze(g.f)` is
  `[mut-escape]`.
- **S4.12** A group, or any expression whose type is a group or a union with one, is not spread, borrowed whole,
  or passed to a function other than a parameter declared as a group, `freeze`, `equals` or `messageOf`
  (`[mut-escape]`). `Object.values(g)` would
  give its fields a second name.
- **S4.13** An owned field is not assigned or deleted (`[mut-field-assign]`).
- **S4.14** `freeze(g)` has the type of `g`'s record, or of each record of a union, with each `Mut<T>` field read
  as `T`. If that type still holds a Mut, `freeze(g)` is `[type]`.
- **S4.5 (amended)** … declared with `function`, or a function expression bound to a local `const`, and every
  name of it only called.

Proposed reject rows, each run on proto at 01:36 (`out/spec-rows.proto.txt`, one line per row, in order, not
truncated):
```
S4.10 mut-bind, type   const a = () => { const g = mut({ h: mut({ t: mut([1]) }) }); return freeze(g).h.t.length; };
S4.11 mut-escape       const a = () => { const g = mut({ t: mut([1]) }); const t = g.t; return freeze(g).t.length; };
S4.11 mut-escape       const a = () => { const g = mut({ t: mut([1]) }); const r = freeze(g.t); return 1; };
S4.12 mut-escape       const a = () => { const g = mut({ a: mut([1]), b: mut([2]) }); const vs = Object.values(g); return freeze(g).a.length; };
S4.12 mut-escape       const a = () => { const g = mut({ t: mut([1]) }); const h = mut({ ...g }); return freeze(h).t.length; };
S4.13 mut-field-assign const a = () => { const g = mut({ t: mut([1]) }); delete g.t; return 1; };
S4.14 mutating-method  const a = () => { const g = mut({ t: mut([1]) }); const f = freeze(g); f.t.push(2); return f; };
S4.5  mut-capture      const a = () => { const m = mut([1]); const f = function g(): number { return m.length; }; return f; };
S4.12 mut-escape       const a = () => (p: boolean) => { const g = mut({ a: mut([1]) }); const s = { ...(p ? g : g) }; return freeze(g).a.length; };
S4.14 mutating-method  type A = { k: "a"; t: Mut<number[]> }; type B = { k: "b"; t: Mut<number[]> };
                       const a = () => { const g: Mut<A | B> = mut({ k: "a", t: mut([1]) }); const f = freeze(g); f.t.push(2); return 1; };
S4.12 mut-escape       const a = () => { const first = <T,>(o: Mut<{ a: T }>): T => o.a; const g = mut({ a: mut([1]) }); const x = first(g); const r = freeze(g); x.push(1); return r; };
```
The S4.10 row reports `[type]` from the fail-closed `freeze` as well as `[mut-bind]` (§4.8).

## 10. Integration plan, in order (not done)

1. **The helper fix.** In `lite/infer/ow-tree.ss.ts` `owHelper`, +8 −1 (`out/edits.base-fixA.diff`). It is
   independent of groups, needed for them, and changes no corpus verdict.
   - Fix `lite/infer/frozen/own.ts:73-77` the same way, or `diff.ts` will report the probes as DIFFERENT
     (unverified).
   - Add S4.5's row.
2. **The group rules.** Copy from `proto/`:
   - `lite/infer/ow-group.ss.ts` (new, 81 lines);
   - `ow-entry.ss.ts` (+3 −1), `ow-place.ss.ts` (+14 −2) and `ix-prelude.ss.ts` (+21 −2);
   - `lite/infer-ss.ts` (+3 −2: the import, `OW_FILES` and `OW_CELLS`).

   `infer.test.ts`'s file-list test then needs `ow-group`, because it reads `OW_FILES`. `ixThaw` (ix family)
   takes `owHoldsMut` (ow family) as an input. The linker accepted that here, but it is a dependency across
   families that may want moving to a shared file.
3. **The frozen TypeScript checker.** The same rules in `own.ts` and `infer.ts`, if the differential is to stay
   meaningful. Not prototyped.
4. **The spec.** In `spec.ojs` section 4, the statements and rows of §9, and the rule id `mut-field-assign` in
   the rule list. The `mut-bind` message was kept unchanged so the differential is exact. A message naming the
   group case is a one-line change.
5. **The refactor, only after 1 and 2.** Run `bun codemod.ts <tree>`, then make the four hand edits of §7 (15
   files, +616 −616, `out/edits.proto-refac.diff`). The module rebuild is then for whoever owns `build.ts`.

## 11. Questions for the owner

1. **The syntax.** Is the inner `mut(...)` acceptable, or do you want your bare form `mut({ types: new Map() })`?
   - The bare form flips the S4.7 reject row and its inline copy in `spec.ojs`: 4 of the corpus's 9
     `mut-deep-write` reports (`out/deep-write-in-corpus.txt`).
   - The other 5 build their fields from a parameter, so their fields are not fresh. Four use a spread
     (`fixtures/lite-mut/reject-mut-deep-write`), and `fixtures/known-slips` `s6` uses `{ src: o }`.
   - It would also make every `mut({ xs: [] })` a group. An `m.xs = [...m.xs, 3]` copy-on-write would then
     become `[mut-field-assign]`, so the bare form tightens programs as well as loosening them. Not measured.
2. **Part of a group.** Should a helper be able to take part of a group? Today a parameter must name the whole
   group type, because Mut is invariant (`subtype.ss.ts:214`). So `r7-wider-param` and
   `r7-readonly-field-param` are `[type]`. The prototype's way to say "writes `types` only" is to lend
   `ctx.types` alone. A read-only field view would need the field typed `Borrowed<…>`, not `X`, or it could be
   kept.
3. **Intrinsics.** Should `JSON.stringify(ctx)` and other intrinsics that neither keep nor return parts be
   allowed for a group? That needs a flag on the intrinsics marking whether a result can contain an argument's
   parts. The prototype rejects them all.
4. **Borrowing a whole group.** `borrow(g)` is rejected. Allowing it needs member reads through `Borrowed` to
   give `Borrowed<T>` for a `Mut<T>` field; `subtype.ss.ts:50` gives the Mut today.
5. **Foreign functions.** This route is outside groups and was not changed. A foreign function declared to
   return `Mut<…>` gives a binding that may be written and frozen (`try-src.ts base scratch/foreign.json`:
   `a ok`). Is foreign.d.ts trusted with `Mut`?
6. **Lending twice.** Lending the same field twice, or the group and its field (`f(ctx, ctx.types)`), is
   accepted, as `f(m, m)` is today (probes `r3-same-field-twice`, `r3-group-and-its-field`). Both names are
   Mut-typed and end with the call. Keep?

## 12. Unverified

- Whether `lite/infer/frozen/own.ts` has the named-function-expression hole. I read the same logic at :73-77
  but did not run it.
- That no other shape of group escapes. Seven did across the first draft and the next look (§4.8, §4.9). The
  probes, the mutants and the fail-closed `freeze` cover the shapes found, not all shapes. The group rules key on
  the recorded type of each expression, not on declared types and bindings, so a route through a type the
  inference records loosely would not be seen.
- What the 62 untyped member expressions in the corpus are, beyond the examples in §3.
- How much the bare form (question 1) would tighten programs that are accepted today.
- Groups across a language boundary (S11.5 copies). Only `r6-boundary` (`[boundary-type]`) was run.
- The ow and md parts of the refactor estimate (§7).
