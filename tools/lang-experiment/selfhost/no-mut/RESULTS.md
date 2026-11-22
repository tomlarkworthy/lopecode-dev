# No visible Mut: what design D would reject and delete

Measured Sun 22 Nov 2026 23:45 CET, on the tree as it stood then (no build, nothing outside this folder written).
Rerun from `tools/lang-experiment`: `sh selfhost/no-mut/run-all.sh` (about 2 min). Tables: `out/tables.md`,
`out/part3.md`; every cell's record: `out/corpus.json`, `out/corpus-module.json`; the D1-rejected cells with reasons:
`out/rejects.json`.

D: `Mut` cannot be written in any type. A local bound directly to a fresh value in the same function is writable at
its first level, through that name only (D1); D2 also lets a second local bound directly to it write. Nothing else is
writable.

## Method

- **Corpus.** late-code's `corpus.ts` (`jobs()` copied from `lite/infer/diff.ts`), imported read-only: 961 sources,
  3649 cell records today (late-code had 3629 at 18:59; the corpus grew). One source does not parse
  (`selfhost/repro-unknown-class.ss.ts`, as before).
- **Supplement.** late-code's `moduleJobs()` (the six `SS_WITH` sections, `module:lite/infer`, `module:tutorial`) plus
  three modules late-code did not run, built the way `rg-diff.ts` builds `module:rg`: `module:rg`, `module:cp`,
  `module:tc` (INFER_WITH followed by `RG_FILES`, `CP_FILES`, `TC_FILES`). 1467 cell records, 1436 accepted
  (cp: 166 of 172; tc: 234 of 246).
- **Checker.** `lite/core.ts` `runCheck` on a `linkMd` copy whose `owCheckIn` hands each cell's `(R, F, T)` to a hook
  first. The copy was compared with `lite/infer/ow-entry.ss.ts` at 23:30 (identical apart from the hook). `run.ts`
  checks every cell against plain `checkSources`: **0 verdict mismatches** in both runs.
- **Writes** (`analyze.ts`). Every write site in `T.all`, not every reference: a member or index assignment, an update,
  a `delete`, a call whose member has `F.memberFlags.mutates`, `Object.assign` onto a non-literal. The receiver is
  classified by its root (TS wrappers and parentheses stripped):

  | group | receiver |
  |---|---|
  | a | a local bound to a literal without spread, or to `new` with no non-primitive argument |
  | g-fresh | a local bound to an intrinsic call marked fresh (`F.calls` sig `flags.intrinsic && fresh && !view`): `slice`, `map`, `Array.from`, `structuredClone` |
  | g-copy | a local bound to a spread literal or a `new` given a non-primitive argument: `[...xs]`, `{ ...o }`, `new Map(m)` |
  | g-ret | the receiver an intrinsic returns (`xs.sort()`, `m.set()`), directly or through a local |
  | b / b2 | a local bound to an a/g local (b), or to a b local (b2) |
  | c | a parameter typed Mut, split by whose: the function a cell returns as its value, or a nested function |
  | d | the result of a user function call, directly or through a local |
  | e | a field or element: `m.xs.push`, a destructured or for-of element, `m.get(k)` |
  | h | anything else |
  | f | a flag, not a root: the write sits in a function that does not declare the root binding (`owInside`) |

  A write with the f flag is counted under f whatever its root. A `let` with several sources takes the least
  writable. Passes to a parameter typed Mut (`owMutParamArg`) are counted separately; the write they enable is
  counted in the callee. `let` reassignment is not a write.
- **Explicit Mut.** The checker's tree skips type nodes, so `explicitMuts` parses the source with the checker's parser
  (`@sveltejs/acorn-typescript`), walks every key, and classifies each `TSTypeReference` named `Mut` by its innermost
  structural context (field, type argument or element, inside a function type) and then by its owner (parameter,
  return type, local annotation, alias body, cast, call type argument). Aliases and interfaces are marked "is Mut"
  (the body is `Mut<…>`, through unions and parentheses, or such an alias) or "holds Mut" (anywhere), each to a
  fixpoint. A cell names such a type when a `TSTypeReference` in its span does.
- **Counting.** Accepted cells only (status `ok`). Cells and items are deduplicated by mapped file:line plus name, as
  late-code does (`ss`, `ssx`, `sswith` and the module jobs check the same text). "union" deduplicates the corpus and
  the supplement together; the supplement's cells go in the checker/toolchain bucket, except `module:tutorial`'s.
- **Sanity check.** Every write the counter finds in an accepted cell has a receiver whose type in `F.types` is
  `Mut<…>`: 0 exceptions in either run.

## Validation

`validate.ts`: 18 hand-written cases with known answers, **18/18 right** (`out/validate.txt`). Positives: each of a
(including `delete`), b, b2, c, c through an alias (`type Buf = Mut<number[]>`, no Mut in the cell), a captured
parameter (c+f), d (bound and direct), e (nested field, for-of element, `Map.get` element), f from a `forEach`
callback and from a local helper, g-fresh, g-copy (spread and copy constructor), g-ret (rejected today; see the bullet on g in section 2),
explicit Mut in each position including alias bodies and fields outside cells and a parameter inside a function type,
and a cell parameter typed Mut (`[mut-cell]`). Negatives: reads and a `let` reassignment only (no writes); a helper
with a plain parameter (no c, no pass).

## 1. Explicit `Mut<…>` in types

Occurrences (distinct cells), accepted cells:

| position | ckr/tc | ports | tut/spec/ex | fixtures | probes | spec-rej | corpus | supplement | union |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| parameter of a nested function | 1 (1) | 5 (5) | 2 (2) | 3 (3) | 17 (17) | 0 | 28 (28) | 55 (50) | 83 (78) |
| parameter of a cell | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| return type | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| local annotation | 26 (18) | 1 (1) | 0 | 2 (2) | 0 | 0 | 29 (21) | 171 (136) | 178 (141) |
| field of an inline record | 0 | 0 | 3 (3) | 0 | 0 | 0 | 3 (3) | 0 | 3 (3) |
| type argument / element | 0 | 0 | 1 (1) | 0 | 0 | 0 | 1 (1) | 0 | 1 (1) |
| inside a function type | 0 | 1 (1) | 1 (1) | 0 | 1 (1) | 0 | 3 (3) | 1 (1) | 4 (4) |
| other (cast, ...) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **all** | 27 (19) | 7 (7) | 7 (6) | 5 (5) | 18 (17) | 0 | 64 (54) | 227 (177) | **269 (215)** |

Outside cells (type aliases and interfaces), by file:line, union: **43**: 25 alias bodies that are `Mut<…>`, 15 inside
a function type (`type Sub = (s, t, seen: Mut<Set<string>>) => boolean`), 3 fields (one of them
`IxRegCore.mayHideMemo`). The 27 aliases that are Mut include the checker's `IxTypes`, `IxVars`, `IxFlows`,
`IxCtls`, `OwW`, `OwCaps`, `RgCtls`, `RgTypes`, `MdL`, `MdMod` and events.ss.ts' `Handles`, `Listeners`, `Keys`,
`Effects`, `Counters`. The 27 names exceed the 25 bodies because the fixpoint also takes an alias whose body is another such alias; the two were not traced (full lists in `out/tables.md`).

Cells with no Mut in their own text that still depend on a written Mut, union:
- 232 name an alias that is `Mut<…>`; 101 of them write through a parameter so typed.
- 88 more name only a type that holds a Mut below the top (`IxK`, `IxReg`, `OwCtx`, `MdCtx`, ...).

The 178 Mut-annotated locals are bound to: an empty array 85, `new Map` 40, an array literal 23, `new Set` 23, a call
4, an object literal 3. An empty array needs an element type, and today only `Mut<T[]>` gives one that is writable
(`const out: string[] = []; out.push("a")` is `[mutating-method]`; `new Array<string>()` is `unsupported`; both run
2026-11-22). **D therefore has to say that an annotated local bound to a fresh value is writable**; otherwise these
need a workaround such as `[x].slice(0, 0)`, which R11 below uses to pass today's checker.

## 2. Writes by what they write through

Writes (distinct cells), accepted cells:

| group | ckr/tc | ports | tut/spec/ex | fixtures | probes | spec-rej | corpus | supplement | union | D1 | D2 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| a: fresh local, own name | 24 (13) | 54 (12) | 31 (26) | 31 (24) | 0 | 4 (4) | 144 (79) | 224 (111) | **348 (178)** | keeps | keeps |
| g-fresh: local of a fresh intrinsic | 5 (3) | 0 | 0 | 4 (1) | 0 | 0 | 9 (4) | 5 (3) | 9 (4) | keeps if fresh = S4.3 | same |
| g-copy: local of a spread or copy `new` | 4 (3) | 0 | 0 | 7 (3) | 0 | 0 | 11 (6) | 12 (11) | 21 (15) | keeps if fresh = S4.3 | same |
| b: second name | 0 | 0 | 0 | 1 (1) | 0 | 0 | 1 (1) | 0 | 1 (1) | rejects | keeps |
| b2: alias of an alias | 0 | 0 | 1 (1) | 1 (1) | 0 | 0 | 2 (2) | 0 | 2 (2) | rejects | rejects |
| c: parameter of a cell's returned function | 50 (24) | 1 (1) | 0 | 0 | 0 | 0 | 51 (25) | 234 (127) | **236 (129)** | rejects | rejects |
| c: parameter of a nested function | 0 | 0 | 0 | 3 (2) | 5 (5) | 0 | 8 (7) | 15 (11) | 23 (18) | rejects | rejects |
| d: user call result | 0 | 0 | 1 (1) | 0 | 0 | 0 | 1 (1) | 0 | 1 (1) | rejects | rejects |
| e: field or element | 0 | 0 | 2 (2) | 0 | 0 | 0 | 2 (2) | 1 (1) | 3 (3) | rejects | rejects |
| f: captured, written from a nested function | 7 (4) | 0 | 4 (4) | 4 (4) | 0 | 0 | 15 (12) | 13 (9) | **21 (17)** | rejects | rejects |
| g-ret: receiver an intrinsic returns | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | rejects | rejects |
| h: other | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — | — |
| **all writes** | 90 (45) | 55 (13) | 39 (34) | 51 (34) | 5 (5) | 4 (4) | 244 (135) | 504 (255) | **665 (348)** | | |
| passes to a Mut parameter | 120 (16) | 28 (6) | 0 | 4 (3) | 64 (17) | 0 | 216 (42) | 2014 (275) | **2110 (301)** | rejects | rejects |

- **f** in the union: 19 written from a local helper, 2 from an intrinsic callback (`forEach`). By root: 18 a, 1
  g-fresh, 2 g-copy.
- **g, how today's checker types them.** `ixVarDecl` (ix-stmt.ss.ts:96) wraps the type in `Mut<…>` for an
  unannotated local whose initializer is an array or object literal, spread literals included, or a call/`new` that
  set `C.freshAt` (an intrinsic marked `@fresh`, `structuredClone`, `snapshot`). So `xs.slice()`, `[...xs]`,
  `Array.from`, `new Map(m)` bound to a local are writable today. The result of a receiver-returning intrinsic
  is typed plain: `xs.sort().push(0)` and `m.set("a", 1).set("b", 2)` are `[mutating-method]` (validation case,
  2026-11-22). That is why g-ret is 0.
- **h** is 0, so every accepted write fell in a named group.

## 3. The functions that take a Mut parameter

801 Mut parameters (by file:line) in 351 functions; 2110 Mut arguments at 1072 call lines (`out/part3.md`).

| scope | what the function does with the parameter | parameters | functions |
|---|---|---:|---:|
| cross-cell | passes it on to another Mut parameter, writes nothing itself | 574 | 241 |
| cross-cell | updates fields of the caller's record (`C.diags = …`, `C.cur = …`) | 76 | 76 |
| cross-cell | keyed table, read and inserted (memo, or a registry such as events' `handles`) | 37 | 34 |
| cross-cell | inserts into the caller's map or set | 34 | 30 |
| cross-cell | neither writes nor passes on (typed Mut only so a writable value may be passed) | 30 | 28 |
| cross-cell | appends to the caller's array (events' `fx`) | 13 | 13 |
| cross-cell | builder passed down a recursion | 23 | 18 |
| cross-cell | fills a typed-array buffer | 1 | 1 |
| local | builder passed down a recursion (`walk(n, out)`, `go(R, seen, x, d)`) | 4 | 4 |
| local | passes it on | 4 | 4 |
| local | other (no write; fills by index; index plus push) | 5 | 5 |

A function whose parameters fall in several classes is counted in each row, so the functions column sums to 454,
not 351. "Cross-cell" is a function a cell returns as its value (or a kept function the cell returns): 338 functions, 788
parameters, 1030 call lines naming them through a cell input, and 163 more through a record field (`K.check(K, T, V,
W, C, …)`). Local helpers: 13 functions, 52 call lines. All but 22 of the cross-cell parameters are in
checker/toolchain. The top types are `Mut<IxCtl>` 139, `IxVars` 102, `IxFlows` 91, `IxTypes` 85 and `Mut<RgCtl>` 49:
the checker's working tables, made once per check and threaded through every ix/rg cell.

The smallest rewrite under D for each class, and what it costs (each was put through today's checker; section 4):

| class | rewrite | complexity |
|---|---|---|
| local helper appending, inserting or filling for its encloser | inline it into the encloser's loop (R2, R5) | unchanged |
| local or nested helper that writes and is called several times on one value | return a new value; the caller combines (R4) | O(n) copy per call where it was O(1): n calls cost O(n^2) |
| builder passed down a recursion (`walk(n, out)`, memo `seen`) | an explicit stack in one function (R11, R12) | unchanged |
| handler writing the caller's map and effect list (events.ss.ts) | return a delta (`{ set, fx }`); the one caller applies it to its own fresh map (R13) | unchanged if deltas are small; a handler that calls another must merge deltas |
| function typed Mut only to read | drop `Mut` from the parameter (R6) | unchanged |
| a cell's function writing a threaded table (IxTypes, IxFlows, IxVars, RgTypes, ...) | return the new table; every caller up to the cell that made it takes it and passes it on (R14) | a `Map` copy per write: O(F) where it was O(1), O(F^2) per check. Or a persistent map, which the prelude does not have |
| a cell's function updating fields of the control record C | return a new record (R15) | a copy of IxCtl's 20 fields per update, and every caller returns a pair |
| a memo kept across calls (`R.mayHideMemo`, `rgHasTypeQuery`'s `M`) | none that keeps the memo; see the no-rewrite list | without it, each call recomputes |
| a buffer a caller passes in to be refilled each frame | allocate a buffer per call (R7) | one allocation of the buffer's size per frame where there was none |

## 4. What D rejects

Distinct accepted cells, union of the corpus and the supplement, by bucket ("strict" counts only a as fresh; "loose"
also g-fresh and g-copy, which S4.3 calls fresh):

| | ckr/tc | ports | tut/spec/ex | fixtures | probes | spec-rej | **total** |
|---|---:|---:|---:|---:|---:|---:|---:|
| accepted cells | 1012 | 250 | 452 | 261 | 150 | 211 | 2336 |
| holds a Mut type (explicit, or names a type that is or holds one) | 494 | 13 | 6 | 5 | 17 | 0 | 535 |
| a write outside the allowed groups, or a pass: D1 strict | 336 | 7 | 8 | 12 | 17 | 0 | 380 |
| the same, D1 loose | 327 | 7 | 8 | 9 | 17 | 0 | 368 |
| the same, D2 loose | 327 | 7 | 8 | 8 | 17 | 0 | 367 |
| **D1 strict, either reason** | 496 | 13 | 11 | 13 | 17 | 0 | **550** |
| **D1 loose, either reason** | 494 | 13 | 11 | 10 | 17 | 0 | **545** |
| D2 strict, either reason | 496 | 13 | 11 | 12 | 17 | 0 | 549 |
| **D2 loose, either reason** | 494 | 13 | 11 | 9 | 17 | 0 | **544** |

Corpus alone (without the supplement): D1 strict 103, D1 loose 98, D2 loose 97 of 1631 accepted. Of the 545 D1-loose
rejects, 177 hold only a Mut type and no other D use (the annotation or alias is the whole change); the other 368 have
a write or a pass to move. D2 saves one cell over D1 (`fixtures/lite-mut/reject-mut-not-fresh/cells.ts:5`
`bad_binding`).

In the checker the rejects spread over 66 files. The largest are ix-core 36, events.ss.ts 28, ow-capture 25, ix-expr
21, ix-ops 18, ix-fn 15 (`out/rejects.json`).

### The 15 rewrites

`rewrites.ts` puts each original and its rewrite through `checkSources` and the census counter. A rewrite passes when
the original is accepted and has a D use, and the rewrite is accepted and has none: no explicit Mut, no Mut alias, no
pass, no write outside a/g-fresh/g-copy (D1). **15/15 pass** (`out/rewrites.txt`). Six are standalone reductions of
checker or port cells with the types inlined, not the cells in their module.

| | cell | original | rewrite |
|---|---|---|---|
| R1 | `fixtures/lite-mut/accept-mut-helpers-loops/cells.ts:3` scaled (f, explicit local) | `const out: Mut<number[][]> = []; const add = (r) => { out.push(r.map(...)); }; for (...) { const row = [...r]; row.push(0); add(row); }` | `rows.map((r) => [...r, 0].map((x) => x * 10))` |
| R2 | `lite/soundscript/spec-4.ts:12` s4_counts (f) | `const bump = (k) => { m.set(k, (m.get(k) ?? 0) + 1); }; for (...) bump(w);` | `for (const w of [...]) m.set(w, (m.get(w) ?? 0) + 1);` |
| R3 | `inline:spec.ojs#2c29mmprz7lwt` (f, forEach) | `[1].forEach(() => { out[0] = 1; });` | `for (const _ of [1]) out[0] = 1;` |
| R4 | `fixtures/lite-mut/reject-mut-escape/cells.ts:30` ok_mut_param (c) | `const bump = (m: Mut<number[]>, k) => { m[0] += k; m.push(k); }; bump(out, 1); bump(out, 2);` | `const bump = (m: readonly number[], k): number[] => [(m[0] ?? 0) + k, ...m.slice(1), k]; return bump(bump([0], 1), 2);` |
| R5 | `fixtures/lite-mut/reject-mut-freeze-param/cells.ts:10` ok (c) | `const fill = (m: Mut<number[]>) => { m[0] = 4; }; fill(out);` | `out[0] = 4;` |
| R6 | `horde/cells.ts:70` atMF, and atMI, atMU8 (reduction) | `type AtM<T> = (a: Mut<T>, i: number) => number` | `type AtF = (a: Float32Array, i: number) => number`; a writable buffer passed to it and written afterwards is accepted |
| R7 | `horde/probe/cells.ts:26` p_write_param (c, buffer) | `(out: Mut<Float32Array>, v) => { out[0] = v; }` | `(n, v): Float32Array => { const out = new Float32Array(n); out[0] = v; return out; }` |
| R8 | `inline:spec.ojs#2t3ej43dstrm1` (d) | `const xs = mk(); xs.push(1);` with `mk: () => Mut<number[]>` | `const xs = [...mk()]; xs.push(1);` with `mk: () => readonly number[]` |
| R9 | `inline:spec.ojs#5dmpl0o0sfui` (e) | `(p: { readonly y: Mut<number[]> }) => { const { y } = p; y.push(1); ... }` | `const y = [...p.y, 1];` |
| R10 | `fixtures/lite-mut/reject-mut-not-fresh/cells.ts:5` bad_binding (b) | `const m = ys; m[0] = 2;` | `ys[0] = 2;` |
| R11 | `lite/infer/ow-taint.ss.ts:16` owRefsOf (reduction; c, recursion) | `function walk(n, out: Mut<N[]>) { ...; for (const k of n.kids) walk(k, out); }` | a `todo` stack in one function, children pushed reversed so the order is kept |
| R12 | `lite/infer/ow-capture.ss.ts:72` owMutDeep (reduction; f, memo) | recursive `deep` writing the captured `none` map | a stack of frames with an exit marker that sets `none` once an alias's subtree found nothing |
| R13 | `lite/events.ss.ts:97` queueValue (reduction; c via `Handles`, `Effects`) | `handles.set(hid, {...}); if (!h.draining) fx.push({...});` | returns `{ set: [{ hid, h }], fx: [...] }`; the caller applies it to its own `new Map(prev)` and effect array |
| R14 | `lite/infer/ix-core.ss.ts:52` ixFlowSet (reduction; c via `IxFlows`) | `const m = new Map(W.get(id)); m.set(k, t); W.set(id, m);` | the same, then `const w2 = new Map(W); w2.set(id, m); return w2;`, threaded by the caller |
| R15 | `lite/infer/ix-core.ss.ts:22` ixErr (reduction; c via `IxCtls`) | `C.diags = [...C.diags, d]; C.n = C.n + 1;` | `({ diags: [...C.diags, d], n: C.n + 1 })`, threaded by the caller |

Not checked: that R11 and R12 compute the same results as the originals. They are reviewed by hand only.

### No reasonable rewrite

- **`IxRegCore.mayHideMemo`** (ix-types.ss.ts:81), written by `ixMayHide` (ix-hides.ss.ts:75) through the cell input
  `R`, which counts as e. The memo lives in the registry for one cell's check and is shared by every call of
  `ixMayHide`. Under D nothing outside one function invocation can be written, so the memo must either be dropped
  (each call recomputes the walk) or be returned and threaded through every caller of `ixHides` and the narrowing
  cells that reach it, the class NOTES r2 counted at 15 cells.
- **`rgHasTypeQuery`'s `M`** (rg-view.ss.ts:26), a `Mut<Map<number, boolean>>` memo the caller keeps across calls. The
  same choice: drop it or thread it.
- **The checker's threaded tables as a whole** (129 cells writing through a cell's function parameter, 301 cells
  passing one on). R14 and R15 show the per-cell rewrite passes, but each one moves the write to a caller that is
  itself a cell function, up to `ixCheckFn` and `mdCell`. With `Map` copies the cost is O(F^2) per check, where F is
  the number of node types or flows; no persistent map exists in the prelude. I would call this a rewrite of the
  checker, not a rewrite of cells.
- **A buffer refilled each frame** (p_write_param, R7). The rewrite is accepted, but it allocates a buffer per frame,
  which is what passing a buffer in avoids.

## 5. What D would let be deleted (estimates)

Line counts of whole cells are from `deletable.ts` (`out/deletable.txt`); partial deletions are counted by hand and
are estimates.

Whole cells, **75 lines**:
- `owMutIn` (ow-capture.ss.ts:46, 23 lines), `owMut` (:92, 4) and `owMutDeep` (:72, 17): only nested or written Mut
  is found by them.
- `owLocalHoldsMut` (:90, 2): becomes `owIsMut`.
- `owStripMut` (:98, 17): becomes the one-level `unwrap`, since an inferred Mut is only ever the top.
- `ixCheckFresh` (ix-expr.ss.ts:15, 8): checks a value against an expected `Mut<X>`, which only an annotation gives.
- `owMutParamArg` (ow-tree.ss.ts:90, 4).

Parts of cells, about **20 lines**:
- the call of `ixCheckFresh` and the dead `viaMut` test in `ixCheck1` (2);
- the target-Mut invariance line in `namedSubWith` (subtype.ss.ts:221-222, 2);
- the alias-of-Mut branch of `rgNamedRef` (rg-convert.ss.ts:120, about 4 of 8);
- `[mut-cell]` in `mdInject` (md-inject.ss.ts:122-124, 3) and its backstop filter in `mdKeep` (md-cell.ss.ts:24-25, 2);
- the Mut-argument arm of `owWriteRef` (1);
- the nested branch of `owLateMsg` (2);
- the expected-Mut unwrap in `ixObjCtx` (ix-lit.ss.ts:12, 1);
- `"Mut"` in `RG_ONE_ARG` and in cp-modes' known names (2).

Kept, because an inferred Mut still exists as the type of a fresh local: `Mut <: T` on the source side (`sub`,
subtype.ss.ts:277, `unify`, `unwrapsWith`, `ixHidden` ix-hides.ss.ts:119), the fresh-local rule in `ixVarDecl`
(ix-stmt.ss.ts:96; `ixSnapshotCall`, `mdValueRules` and `owKeptReadMsg` call `owStripMut`, which becomes `unwrap`), member, call and iteration through Mut
(subtype.ss.ts:50, 85, 93; cp-members), the write rule `ixWriteRule`, `delete` and `Object.assign` on Mut.

Rules: `[mut-cell]` goes. Its three spec-reject cases (spec.ojs:772-774) go, and so do the two S4.4 `[type]` cases
(775-776) and the S4.3 `[type]` case (784). Spec statements: S4.9 entirely; S4.4's sentences on passing to a
parameter typed Mut and on `[mut-cell]`; S4.7's last sentence (nested annotations); S4.3's clause on passing to a Mut
parameter; S4.1's "a T is not assignable to Mut<T>" and its annotation sentence; the "a type that is not `Mut<…>`"
wording in S3.19 and S4.10. The accepted "was:" cases at spec.ojs:119-125 and 131 that write Mut become rejects or go.

What D adds, also an estimate: the write rule must check that the receiver is the declaring name, in the declaring
function, not an alias (D1) and not captured (f), about 10 lines in ow; inferred Mut must be stripped where a value
leaves its name (a return, a literal field, an argument) so no nested or returned Mut is ever inferred, about 5
lines; and the annotated-fresh-local rule from section 1.

**Closure registration.** `registration.ts` (`out/registration.txt`) runs the four programs NOTES-checker-port.md
(r2, Part 2) names as the reason registration is kept: `freeze-attack/b1.ts` reg-for-of, `b2.ts` fo-index,
`lite/infer/attack/h6-attacks.ts` h6-array-container, `h9-attacks.ts` h9-r2-kept-returns-field. Today all four are
accepted. Each needs explicit Mut in three places: the captured container (`Mut<number[]>[]`, or a field
`readonly t: Mut<number[]>`), the kept function's return type `Mut<number[]>`, and the consumer's input type
`() => Mut<number[]>`. With every Mut deleted, which is all D lets one write, the consumer's `a().push(1)` is a write
through a user call's result (group d) and today's checker already reports `[mutating-method]`; the producer is
`[mut-capture]`.
```
reg-for-of  today:  a:ok explicit=[type-arg,return]  c:ok explicit=[in-function-type] writes=[d method:push (call a)]
            no Mut: a:rejected[mut-capture]          c:rejected[mutating-method] writes=[d method:push (call a)]
```
Under D no type can make a function's result writable, so this class cannot be written. That reason for registration
goes. Whether registration has other uses was not examined; the freeze at publish (S4.6) stays the guarantee either way.

## Approximations

- **Fresh.** D's "fresh value (literal, `new`, etc.)" is read two ways: strict (a only) and loose (S4.3's definition:
  a, g-fresh, g-copy). Both totals are given; they differ by 5 cells.
- **b in D2** is allowed whatever the target's group (a or g); the strict/loose split does not look through it.
- **Roots.** A `let` with sources of several kinds takes the least writable. A destructured local and a for-of
  variable are e without looking at what they come from. An intrinsic method result is e when its type differs from
  the receiver's (Mut removed), else g-ret.
- **f precedence.** A captured write is f regardless of its root. "Captured" is `owInside` on the root binding's
  declaration against the function holding the write.
- **Mut-bearing types.** "Names a type that is or holds a Mut" is by name in the cell's span, among the aliases and
  interfaces of the joined source; a name declared in a shell or `foreign.d.ts` is not seen. Cells that only name
  `IxK` or `OwCtx` (a context record holding a Mut field) count as holding a Mut type.
- **Part 3 classes** come from what the function does with the parameter name directly: method names, member and
  index writes, writes one member down, passes to Mut parameters, and a pass to itself (recursion). "Keyed table, read
  and inserted" does not tell a memo from a registry. A function that writes through a local alias of its parameter
  is classed by the parameter's own uses.
- **Call sites** are matched by callee name: a helper's const, or a cell function called through the input named
  after its cell. Calls through a record field are counted apart, not attributed.
- **Line numbers** are mapped as late-code maps them. 26 accepted cells (all `selfhost/v0.ss.ts`, none rejected
  under D) and a few nested functions in `module:lite/infer` keep a `(joined)` line, so those may be counted twice
  in the union.
- **Rewrites** were checked with today's checker, which does not implement D. Where D would allow something today's
  checker does not (an annotated fresh local, section 1), the rewrite uses a workaround: `[n].slice(0, 0)` in R11, a
  typed `first` frame in R12, a typed `start` effect in R13. Six rewrites are standalone reductions.
- **Section 5** line counts of partial deletions are by hand; the additions D needs are estimates, not code.
- **Coverage.** `module:cp` and `module:tc` are new here; 6 cp and 12 tc cells are rejected in their module today and
  are outside every count, and so are the 13 `module:tutorial` cells rejected today (33 of 46 accepted).

## Files

`analyze.ts` (hook, write and explicit-Mut counter), `validate.ts`, `run.ts` (corpus and supplement), `summarize.ts`
(tables 1, 2, 4), `part3.ts`, `rewrites.ts`, `registration.ts`, `deletable.ts`, `run-all.sh`.
