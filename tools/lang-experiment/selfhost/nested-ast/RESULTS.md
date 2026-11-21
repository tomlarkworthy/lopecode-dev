# Nested AST across the boundary: a record, 2026-11-21

The question: can the SoundScript checker's tree-walking code be written as checked SoundScript, with acorn's tree
crossing the boundary as an ordinary nested, typed value (`AstNode`, a union of 121 records + `Other`), instead of
the flat table of `../flat-ast/` that the owner rejected? Acorn stays outside as the parser.

Everything below was run in this folder with `bun <file>`, on 2026-11-21, on copies of the checker. No shipped file
was edited. `lite/` was being edited by another agent while this ran.

## Copies and their hashes

`orig/` is a snapshot of `lite/` (plus `prelude.*`, `lite/toolchain`, `lite/jsx`, `lite/stdlib`, three files of
`lite/soundscript`) taken at 2026-11-21T08:13:02Z (`out/copied-at.txt`). sha256 (12 hex) of every copied file is in
`out/hashes.txt`. The ones this work leans on:

```
1f0148b52882 lite/boundary.ts      f572c8274a84 lite/capture.ts     5704eb1f7d0a lite/complete.ts
6e5c19a4d12d lite/core.ts          dd5ff9f17a4f lite/events.ss.ts   88e4bfdd4ab7 lite/infer.ts
03c38600d97b lite/own.ts           714c3a2b9ea9 lite/parse.ts       4746ebbf77d0 lite/registry.ts
e438a30373aa lite/subtype.ss.ts    ea2906d33498 lite/walks.ss.ts    557070fb1dca lite/toolchain/ss-toolchain.ts
526d9dc25836 lite/soundscript/spec.ojs
```

`registry.ts` and `subtype.ss.ts` differ from the hashes `../flat-ast/` recorded, so the flat numbers quoted here
came from a slightly different checker. Re-hashed at 2026-11-21T08:56:47Z (that output was overwritten), at 09:09:11Z and last at 09:15:43Z (`out/hashes-after.txt`), each with the same result: one copied file
had changed in `lite/` since the copy, `lite/soundscript/ts-cells.ts` (79a9f37368ab → 1b51f5d362e5). Nothing here
depends on it beyond the spec-case loader.

The variants, each a full copy with `lite/node_modules` symlinked:

| copy | what changed against `orig/` |
|---|---|
| `fix/` | CHECKER FIX: `walks.ss.ts` holdsWith, `infer.ts` hidden/mayHide, `subtype.ss.ts` sub fast paths, `own.ts` iterIn. Each edit carries `// FIX (nested-ast)` |
| `rec/` | RECURSIVE CROSSING: `runtime.ss.ts` Shape `ref`/`defs`; `boundary.ts` shapeOf with defs, copy with cycle check, depth limit, shared-value memo |
| `recfix/` | rec + fix. The visitors were checked here |
| `recdisp/` | rec + DISPATCH (union member chosen by the `type` tag) + LAZY MESSAGE |
| `reclazy/` | rec + LAZY MESSAGE only |
| `abl-walks/`, `abl-infer/`, `abl-subtype/`, `abl-own/` | recfix with one fixed file put back from rec (ablation) |
| `mod/` | a first copy, unused |

## 1. The language change: recursive types crossing

### Size

Lines added and removed, `diff <copy>/lite/<file> <base>/lite/<file>` counted by `>`/`<`:

```
rec/lite/runtime.ss.ts vs orig: +7 -1       Shape gains { k: "ref"; n } and { k: "defs"; defs; body }; want gains two cases
rec/lite/boundary.ts vs orig:   +77 -6      shapeOf with defs/refs and unguarded(); copy with Run, LIMITS, Refused, memo
recdisp/lite/boundary.ts vs rec: +36 -2     tag dispatch and lazy messages (section 3)
```

In `shapeOf`, an alias met while it is still being expanded becomes a `ref` and is defined once in `defs`;
non-recursive aliases are still inlined; `unguarded()` rejects recursion with nothing in between. In `copy`, a
`Refused` error (cycle, depth, missing definition) is not absorbed by a union, and a per-(object, shape) memo copies a
shared object once. `ss-toolchain.ts` needed no change: the Shape is JSON-stringified into the compiled cell as before
(`ss-toolchain.ts:303`). The nested `NParse` shape is 36836 chars of JSON; flat was 41364.

### Soundness probes (`bun probes.ts`, `out/probes.txt`)

What `orig/` says to a recursive alias today:

```
orig, Tree: [boundary-type] x: Tree cannot cross from another language: it is or holds kids: kids: kids: kids: kids: v: a recursive type
rec, Tree: shape {"k":"defs","defs":[["Tree",{"k":"rec","props":[["v",{"k":"num"},false],["kids",{"k":"arr","el":{"k":"ref","n":"Tree"}},false]]}]],"body":{"k":"ref","n":"Tree"}}
```

**Cycles.** A clear message and no loop, including when the cycle sits under a union:

```
rec, as Tree:      throws TypeError: x.kids[0].kids[0]: a cycle (this value contains itself) (0.3 ms)
rec, as List (the cycle sits under a union List | null): throws TypeError: x.next.next: a cycle (this value contains itself) (0.0 ms)
orig, cycle under a union ({ v; next: unknown } | null): throws TypeError: x.next: expected an object or null, found an object (0.1 ms)
```

The last line is a defect in today's boundary, not in the change: the union swallows the cycle error and reports a
mismatch that names nothing. The `Refused` class is what keeps it out of the union in `rec/`.

**Shared values** (the `ImportSpecifier` case: `imported` and `local` are one object). A diamond chain, each level's
`kids` is `[c, c]`:

```
depth 20 (21 objects, 1048576 paths): orig unknown 540.0 ms; rec Tree with memo 0.03 ms; rec without memo 1140.4 ms
depth 35 (2^35 paths), rec with memo: crosses (0.2 ms); copy shares: true; frozen: true
one object under two shapes: a {"v":1}, b {"v":1,"extra":"x"}
```

Without the memo the copy is exponential in a DAG, and `orig/` copying the same value as `unknown` is too. With it,
an object is copied once per shape and the copy keeps the sharing. The memo is keyed by (object, shape), so the same
object seen under two types gives two copies, each with the properties its type declares (S11.5).

**Depth.** A `List` of n nodes:

```
n=2000: rec (limit 2000) crosses (1.3 ms)
n=2001: rec (limit 2000) throws TypeError: x.next.next.next.next.next.next.next.next.next.next.next.next.next…
rec with no limit: the deepest List that crosses is 3846 nodes; one deeper throws RangeError: Maximum call stack size exceeded.
orig as unknown: the deepest List that crosses is 14513 nodes; one deeper throws RangeError: Maximum call stack size exceeded.
```

The walk is recursive, with a stated limit of 2000. An iterative walk was not written. The message at the limit
carries the whole path (2000 × `.next`) and needs truncating; not done.

Where each stage gives out on deep source text (`bun probe-depth.ts`, `out/probe-depth.txt`, `cross` with no limit,
`rec/`):

```
parens         acorn 2799, adapter 2822, cross 2822, deepEqual 2822; AST depth at n=1399: 4
arrays         acorn 2905, adapter 2679, cross 1667, deepEqual 2679; AST depth at n=833: 837
a+a+…          acorn 200000, adapter 15961, cross 3353, deepEqual 15961; AST depth at n=1676: 1679
nested arrows  acorn 2246, adapter 2172, cross 2172, deepEqual 2172; AST depth at n=1086: 1090
```

So acorn itself stops near 2200–2900 nesting levels for three of four shapes; only a left-leaning `a+a+…` goes deeper,
and there `cross` (3353) is the first to break. With `recdisp/` (`bun probe-deep-check.ts`, `out/probe-deep-check.txt`)
an `a+a+…` of 5000 terms crosses and the checked `syntaxPass`/`captures` ports walk it; 15000 overflows in `cross`.
`orig/` checkSources took all of these without a stack error, and rejected each with `inject-unknown` (the cell parameter `a` names no cell), so its inference ran but the input is not a well-formed cell.

**Recursion with nothing in between** is refused at the type, with the new message:

```
type A = A | number: rec [boundary-type] x: A cannot cross from another language: it is or holds A, a recursive type that refers to itself without an object or ar…
type A = { a: A } | number (guarded): rec shape {"k":"defs",…
```

**Getters and proxies.** A getter is read once and the copy is a plain frozen value; a Proxy runs its `get` traps for
`v` and `kids`; a throwing getter's error passes through unchanged (`Error: from the getter`, not a TypeError naming
the place). The last is the same in `orig/`.

**Trusted afterwards.** The copy is frozen at depths 0, 1, 2; a change the other language makes after crossing does
not reach it; undeclared properties are dropped:

```
after crossing, the other language changes its value: copy {"v":1,"kids":[{"v":2,"kids":[]}]}; copy frozen at depth 0/1/2: true/true/true; source frozen: false
```

**Today's boundary unchanged** (`bun boundary-regress.ts`, `out/boundary-regress.txt`). The flat corpus value
(a non-recursive shape) crossed by `orig/`, `rec/` and `recdisp/`: `rec equal to orig 360, recdisp equal to orig 360`.
Thirteen bad values of a non-recursive record type (missing field, wrong primitive, function, class instance, extra
property, bad literal, short tuple, wrong union member, unknown tag, array element, optional, not an object) give
the same result text from all three copies, for example `p.any: expected data, found a K object`.

**The depth limit on real source** (same file, `recdisp/`, limit 2000; the limit counts arrays as levels):

```
arrays n=1000: TypeError: nestedParse.ast.program.body[ … nested deeper than 2000
a+a+… n=1000: crosses
a+a+… n=2000: TypeError: nestedParse.ast.program.body[ … nested deeper than 2000
nested arrows n=2000: TypeError: nestedParse.ast.program.body[ … nested deeper than 2000
parens n=2200: crosses            (parens do not deepen the AST)
```

Every case over the limit gives the limit message, none a RangeError. The cost: an `a+a+…` of 2000 terms, or an array
literal nested 1000 deep, which `orig/` checks today, would be refused at the boundary.

**Not checked by the boundary:** that `nid`s are unique or in pre-order. `two declarators with nid 2: crosses`. A
visitor that keys maps by nid trusts the adapter for this.

**The message for an unknown node deep in the tree** names nothing:

```
rec: throws TypeError: x: expected an object or an object, found an object (1.9 ms)
```

The union tries each member, every member fails somewhere below, and the union reports its own failure at `x`. With
tag dispatch (`recdisp/`, §3) the member is picked by `type` and the error names the place and the tag.

### The spec statement

**S11.3** governs it (`orig/lite/soundscript/spec.ojs:1877`):

> The annotation may use `number`, `string`, `boolean`, `null`, `undefined`, literal types, `unknown`, arrays, tuples,
> object types and interfaces with no methods or index signature, unions, and aliases of these.

It does not mention recursion; `orig/` refuses it in `shapeOf`. **S11.5** (`spec.ojs:1881`, "The cell is given a
deep-frozen copy") and **S11.4** (the TypeError naming the place) also need a sentence each. Wording the change would
need (not written into the spec):

- S11.3: an alias may refer to itself, directly or through other aliases, if an object or array type lies on every
  path from the alias back to itself. `type A = A | number` is `[boundary-type]`.
- S11.4: a value that contains itself is a mismatch ("a cycle"); so is a value nested deeper than N levels (N stated).
- S11.5: an object reached by two paths under the same type is copied once, and the copy is reached by both paths.
- Not promised: uniqueness of any field (a `nid`).

## 2. The typed union

`gen.ts` writes `ast-n.ss.ts`: 121 records + `Other { kind, fields, props }`, child fields typed `AstNode`,
`AstNode | null`, `AstNode[]`, `(AstNode | null)[]`, each record with `nid start end line`; and `kids-n.ss.ts`,
`childrenOf` as a 102-case switch. The names `Node`, `Child` and `Comment` are built-in type names
(`[builtin-type-name]`), so the union is `AstNode` and a child `Kid`. `nid` is the pre-order number (equal to the flat
row index); `id` would clash with acorn's `id` field. `bun adapter.ts` over the 364 inputs: 0 errors, 34711 nodes.

**It checks.** Check time of `ast-n.ss.ts` with small helpers (`bun probe-call-cost.ts orig|fix`):
549 ms on `orig/`, 5.3 ms on `fix/` (4.6 ms on the run before the `Mut` guard in fix 3, not kept). `kids-n.ss.ts` alone: 16940 ms on `orig/` (`out/percell-rec.txt` has 17069 ms on
`rec/`), 40 ms on `recfix/`.

### Per call site, before the fix (`out/probe-call-cost-orig.txt`)

```
orig, ast-n.ss.ts: types + helpers 549.3 ms
  h(n), n: AstNode parameter passed on                 125.30 ms per call
  h(n.object), a field read of a narrowed node         37.31 ms per call
  h(x), x: AstNode | null after x !== null             2830.82 ms per call
  hn(n.init), AstNode | null to AstNode | null         68.91 ms per call
  h(n) after n.type !== "Identifier" (exclusion)       3025.53 ms per call
  hi(n) after n.type === "Identifier"                  160.32 ms per call
  h(n) after n.type === "Identifier" (member to union) 154.15 ms per call
  hl(n.params), AstNode[] to AstNode[]                 51.63 ms per call
  annotated return : AstNode of n.object (x4 cells)    540.34 ms per call
  no call: n.start read 4 times                        151.95 ms per call
```

"no call" at 152 ms says part of the cost is per cell, not per call.

### Diagnosis (CPU profiles in `out/prof/`, call counts by `count-call.ts`)

The call counts for 1 and 2 were printed by `count-call.ts` to the terminal and not kept in a file; the profiles in
`out/prof/` are kept. The count for 4 is kept: `bun diag-time-cell-ablown.ts <cell>` (`abl-own/`, without the fix)
gives `1029 ms … "expand":"5559403 calls"` (`out/diag-iterin-ablown.txt`), and `bun diag-time-cell.ts <cell>`
(`recfix/`) `41 ms … "expand":"39497 calls"` (`out/diag-iterin-recfix.txt`). The stack samplers are
`diag-sample-stacks*.ts`.

Four functions, each a type walk that is bounded only by a depth counter and so re-expands a recursive alias at every
level (exponential in the depth bound):

1. `walks.ss.ts` `holdsWith`, called per cell from `core.ts` as `holds(ret, ["Listener"])`: 3.48M `Registry.expand`
   calls for one cell with `AstNode` in its type.
2. `infer.ts` `Checker.hidden` (via `hides`), per narrowing: `t.ts.filter((x) => reg.sub(s, x))` over the 122
   members, and each `sub` builds `show()` keys for the alias pair: 3.35M `sub` calls, 2.6 s, for the `x !== null` call.
3. `subtype.ss.ts` `sub`: a named alias against a union containing it went through the k² member scan.
4. `own.ts` `iterIn`, per cell from `ownership`: found later, by stack sampling on a cell that captures an `AstNode` in a
   callback (`ids.find((x) => x.start > a.start)`): 5.52M `expand` calls, 1029 ms for a one-line cell. Sampled stack:
   `iterIn (own.ts:30) < inner (own.ts:20) < … × 6 < ownership (own.ts:83) < checkSources (core.ts:321)`.

### The fix (`fix/`, labelled `// FIX (nested-ast)`)

1. `holdsWith`: a set of zero-argument alias names already walked; the depth counter counts only generic expansions.
2. `hidden`: returns null at once when `mayHide(t)` is false; `mayHide` is a reachability walk over aliases, memoised in
   a `WeakMap<Ty, boolean>`, true on unknown/object/type variable/function or a record with calls, constructors or an
   index.
3. `sub`, after `R.same`: two named types with the same name and no arguments are equal; a type that is a member of the
   expanded union is a subtype of it, without the scan.
4. `iterIn`: the same visited set as 1.

```
fix/lite/walks.ss.ts vs orig:   +15 -5
fix/lite/infer.ts vs orig:      +33 -0
fix/lite/subtype.ss.ts vs orig: +6 -0
fix/lite/own.ts vs orig:        +5 -3
```

**Verdicts** (`bun verdicts.ts recfix fix recdisp`, `out/verdicts.txt`): `checkSources` of `orig/` against each copy
over the 361 corpus inputs (which include every spec reject case) and the synthetic inputs, comparing module errors
and, per cell, status and every error's rule, line and message:

```
365 inputs, 1720 verdict lines from orig
recfix: 0 inputs differ
fix: 0 inputs differ
recdisp: 0 inputs differ
```

Then rerun with `synthetic-recursive.ts` added (10 cells over recursive aliases that hold what each fixed walk
looks for: a `Listener`, an iterator, a function and `unknown` member two levels inside a cycle and behind a second
alias, a generic recursive alias, an alias against a union holding it): `375 inputs, 1758 verdict lines from orig`,
0 differ for each copy. Those cells are not clean inputs: each carries `inject-unknown` for its parameters, the
`Iterator` case gets `unknown type Iterator`, and the two `Listener` cells misuse `on()`, so they show that the fixed
walks agree with the old ones on these types, not that each walk found its target.

That is the second run. The first run of the fix changed one verdict:

```
fixtures/lite-mut/reject-mut-escape/cells.ts: orig only ["  bad_promise type L9 Mut<number[]> is not assignable to Mut<number[]> | Promise<Mut<number[]>>"] | recfix only []
```

The cell stayed rejected (by `mut-escape`), but one error went. The `sub` fast path accepted `Mut<number[]>` as a
member of the union; `orig/` unwraps a `Mut` before it scans a union (`subtype.ss.ts:234`) and so refuses it. Which
answer is right was not decided here; the fast path now skips a `Mut` or `Borrowed` source so the fix changes no
verdict, and the cost probes were rerun after that change. `rec/` alone also changes no verdict, so no spec case
depends on a recursive alias being refused.

The `iterIn` fix (4) was found after `out/probe-call-cost-fix.txt` and the first visitor timings were taken; numbers
measured before it say so. `walks.ss.ts` and `subtype.ss.ts` still check as SoundScript (`bun checkss.ts fix`).

After the fix every form of the probe is within ±0.9 ms of the base (`out/probe-call-cost-fix.txt`, rows from +0.08 to −0.85 ms), base 5.3 ms. The
same fix on the flat prototype's union (`bun probe-flat-call-cost.ts orig|fix`): `h(row)` 30.38 → 0.18 ms per call;
`f(nodes, j)` 8 calls 191 ms → under 1 ms. So the flat route's 31–36 ms per call was this defect too, not something
the flat layout caused.

Ablation (`out/ablation.txt`): recfix with one fixed file put back from `rec/`, total check time per file:

```
total check ms (bun percell.ts <copy> <file>)   kids-n.ss.ts   visit-n.ss.ts   visit-own.ss.ts
recfix: all four fixes                                  40             125               194
abl-walks: without holdsWith (1)                       485            9439             10314
abl-infer: without hidden/mayHide (2)                18112           63881             88296
abl-subtype: without the sub fast path (3)             562             910              1035
abl-own: without iterIn (4)                             34            1095              5314
rec: none (out/percell-rec.txt)                      17069           66744            105387
```

`hidden` (2) carries most of it; each of the others costs between 10× and 50× on at least one file when it alone is
missing. The `Mut` guard in (3) was added to the copies while this ran (after the `abl-walks` rows); it touches only
a `Mut` source and was not re-timed.

Is it fixable: yes, and these are checker defects that any recursive alias triggers, not costs of the AST. A
recursive alias in an ordinary checked cell today (no boundary involved) pays the same.

## 3. Boundary cost per node (`bun bench.ts`, `out/bench.txt`)

Final run, 2026-11-21 (finished 09:08Z), nothing else running; median of the rounds in `bench.ts`:

```
corpus: 360 inputs that parse, 164284 chars, 33903 nodes (flat rows 33903); nested shape 36836 chars of JSON, flat 41364
bare acorn + TS plugin                                  25.5 ms    0.75 µs/node
parse.ts                                                28.7 ms    0.85 µs/node
adapter: nestParse (parse + nest)                       45.0 ms    1.33 µs/node
flat adapter: flatParse layout A                        41.5 ms    1.22 µs/node
nested, rec: checkShape (copy+freeze, memo on)        3066.5 ms   90.45 µs/node
nested, rec: memo off                                 3167.5 ms   93.43 µs/node
nested, rec: memo on, no freeze                       3121.6 ms   92.07 µs/node
nested, rec: cross() first delivery                   3162.1 ms   93.27 µs/node
nested, rec: cross() re-delivery of an equal value    3201.4 ms   94.43 µs/node
nested, reclazy (lazy message, no dispatch): checkShape  2695.4 ms   79.50 µs/node
nested, recdisp (tag dispatch): checkShape              49.2 ms    1.45 µs/node
nested, recdisp: cross() first delivery                 45.9 ms    1.36 µs/node
nested, recdisp: cross() re-delivery                    56.1 ms    1.66 µs/node
flat, orig: cross() first delivery                     282.0 ms    8.32 µs/node
flat, recdisp: cross() first delivery                   41.3 ms    1.22 µs/node
rec and recdisp copies equal on 360 of 360 inputs
```

Against the figures the task brief gave (taken from `../flat-ast/RESULTS.md:110`; the brief itself is not in the repo): bare acorn 0.75 µs/node here (the brief's 0.85 was `parse.ts`, 0.85 here too); the flat
route 8.32 µs/node with today's boundary. With dispatch the nested route is 1.36 µs/node first delivery, 1.66 on
re-delivery (the `last`-reuse `deepEqual` walks the tree before it can skip the copy), about 1.8× bare acorn.
`out/bench-first.txt` is the earlier run that overlapped other work; its `recdisp` row (65.85) predates the fast fail
on non-objects.

The first `rec/` copy cost 87 µs/node, about 100× acorn. Most of it is not copying or freezing (memo off 88.7,
no freeze 89.6 in `out/bench-first.txt`), it is the union: each node is tried against members in order, and each failed
member builds its mismatch message (a path string and a `show()` of the type) before the next is tried.

Dead end, kept: **lazy messages alone** (`reclazy/`, message built only when read) gave 83.31 µs/node on its first
run (terminal output, not kept in a file) and 79.50 in the final one. Building the
message was not the cost; trying 122 members was.

What worked, `recdisp/`:
- `dispatchOf(shape)`: for a union whose every record member has a non-optional literal property with a distinct value
  (here `type`), a map from value to member, cached per shape. The value's tag picks the member; an unknown tag fails
  with a message naming the tag.
- a non-object value fails a union of records at once.
- lazy messages.

A defect found by the probes below, kept: the first lazy `Mismatch` called `super("")`, which gives the instance an own
`message` of `""` that hides the getter, so every `recdisp/` and `reclazy/` mismatch read as `TypeError: ` with no
text. Fixed to `super()`. The `reclazy/` figure above was taken with the defect, when no message was ever built,
which makes the conclusion stronger: with message building at zero, the scan still cost 83 µs/node.

**Dispatch probes** (`bun probes-disp.ts`, `out/probes-disp.txt`; `bun probes.ts recdisp`, `out/probes-recdisp.txt`).
The section 1 probes on `recdisp/` give the same results as on `rec/` (cycle messages, diamond, depth, getters, frozen
copy). Tag-specific ones, `recdisp/` against `rec/` on the same value:

```
tag getter: 'a' on the first read, 'b' after
  rec:     crosses {"type":"a","x":1}
  recdisp: throws TypeError: x.type: expected "a", found string "b"
  (recdisp read the getter 2 time(s))
type inherited from the prototype
  rec:     throws TypeError: x: expected an object or an object, found a Object object
  recdisp: throws TypeError: x: expected an object, found a Object object
type missing
  recdisp: throws TypeError: x: expected an object or an object, found an object with type undefined
unknown tag
  recdisp: throws TypeError: x: expected an object or an object, found an object with type string "c"
union with null, number, array: null / 3 / ['s'] / B      both cross, equal copies
two members share tag a: a value of the second             both cross {"type":"a","y":"s"} (no dispatch; ordered scan)
optional tag on one member: {x: 1}                         both cross {"x":1} (no dispatch)
AST with a node of type Bogus at …init.body.property
  rec:     throws TypeError: x.ast.program.body[0].declarations[0].init: expected a AstNode or null, found an object
  recdisp: throws TypeError: x.ast.program.body[0].declarations[0].init: expected a AstNode or null, found an object
```

Dispatch reads the tag twice (once to choose, once in the member's own check of its literal), so a tag that changes
between reads is a mismatch, never a copy of the wrong member; `rec/` reads it once and copies what it read. Both are
sound: the copy is what was checked. A prototype-inherited tag is refused by both, as plain objects with own
properties are what S11.5 copies. The deep-error message names the nearest `AstNode | null` field, not the node: that
union has a `null` member, so it has no dispatch and absorbs the inner error. A `null` member could be peeled off
before dispatch; not tried.

`rec/` and `recdisp/` give equal copies on 360 of 360 inputs. Applied unchanged to the flat layout's union
(`flat, recdisp`), the flat cross drops from 9.10 to about 1.2–1.3 µs/node, so dispatch is a boundary improvement for
both routes, not an argument for one.

## 4. Visitors

`visit-n.ss.ts`: 28 cells porting the module-shape loop of `checkSources` and `syntaxPass` (`core.ts`), `captures`
(`capture.ts`), and `line`/`leading` (`parse.ts`). It checks clean on `recfix/` (`bun check.ts recfix visit-n.ss.ts`):
`checkSources` median 120.1 ms (`out/check-recfix.txt`), 125 ms summed per cell (`out/ablation.txt`); on `rec/` (no checker fix) 66744 ms (`out/percell-rec.txt`, largest `statementCells` 8399 ms,
`declOf` 7993 ms).

### Lines (`bun lines.ts`; code lines = lines holding a non-comment token, as `../flat-ast/lines.ts`)

```
module shape: original 32 code lines; nested port 55
syntax pass: original 24 code lines; nested port 39
captures: original 78 code lines; nested port 105
total: original 134; nested port 199 (×1.49); flat port A 215 against 134 (../flat-ast/out/lines.txt)
line + leading: nested port 20; parsed (the outside cell) 1
visit-n.ss.ts: 28 cells, 220 code lines; largest declaredIn 16, actionUses 16, bound 15, spreadTaint 15, statementCells 13
kids-n.ss.ts: 111 code lines   ast-n.ss.ts: 250 code lines   adapter.ts: 89 code lines   gen.ts: 65 code lines
```

Where the 65 extra lines go:

```
  module shape: 8 cells (6 multi-line), type declarations 4, cell header+closer 12, bodies 39   (original 32)
  syntax pass: 7 cells (6 multi-line), type declarations 1, cell header+closer 12, bodies 26    (original: header+closer 2, bodies 22)
  captures: 10 cells (9 multi-line), type declarations 2, cell header+closer 18, bodies 85      (original: header+closer 8, bodies 70)
```

- 32 of the 65 are cell frames: a function split into small cells costs a header and a closer each (42 frame lines
  against 10 in the originals' functions).
- 7 are type declarations the TS original takes from `Node` (`Diag`, `ModErr`, `CellDef`, `Found`, `FnNode`,
  `Capture`, `Local`).
- The rest, 26 body lines: `kids` (childrenOf minus type keys, sorted by start) and `readsBinding` replace the
  originals' `for…in` over node keys with its skip list; `Mut`/`mut()`/`freeze()` declarations where the original
  pushes into an array; and `nid` comparisons where the original compares nodes with `===`
  (`[strict-eq-object]` refuses `===` between objects).

The generated `ast-n.ss.ts` and `kids-n.ss.ts` (361 lines) are counted separately; they are written by `gen.ts` from
acorn's key order (`out/keyorder.json`: 20 types have more than one key order, child keys never conflict).

### Differential (`bun diff.ts`, `out/diff.txt`)

Each port runs on the value a checked cell would get: the adapter's tree after `cross()` with `recdisp/`, against the
original on the same text. Compared as ordered lists of `rule Lline message`:

```
ports, corpus: 361 inputs, 0 skipped (do not parse, or checkSources throws), 0 with nid order unlike acorn's; 1004 cells
  module shape: 361 same, 0 differ; inputs with a module-shape error: 16
  syntaxPass: 1004 same, 0 differ; cells with a diagnostic: 14 (16 diagnostics)
  captures: 1004 same, 0 differ; cells with a capture: 84 (113 captures)
  lineOf: 33914 same, 0 differ; leading: 33914 same, 0 differ (206 nodes with a leading comment)
ports, synthetic: 3 inputs, …; 20 cells
  module shape: 3 same, 0 differ; inputs with a module-shape error: 3
  syntaxPass: 20 same, 0 differ; cells with a diagnostic: 4 (12 diagnostics)
  captures: 20 same, 0 differ; cells with a capture: 4 (7 captures)
ports, synthetic-n: 1 inputs, …; 1 cells
  syntaxPass: 1 same, 0 differ; cells with a diagnostic: 1 (1 diagnostics)
control (namedByParent ignores computed): shape differ 0, syntaxPass differ 1, captures differ 0
control (readsBinding counts labels): shape differ 0, syntaxPass differ 0, captures differ 1
control (moduleLevelRule drops no-var): shape differ 1, syntaxPass differ 0, captures differ 0
control (namedByParent compares type, not nid): shape differ 0, syntaxPass differ 1, captures differ 0
```

The corpus is `../flat-ast/`'s (spec rejects, fixtures, the `lite/*.ss.ts` files of `orig/`; 361 inputs, 164321 chars,
hash a25c707669f8). The original `syntaxPass` is sliced out of `orig/lite/core.ts` by its AST span and evaluated, since
it is not exported. Module shape is compared against `checkSources(...).module` filtered to the shape rules, and the
cell names and lines.

The fourth control first gave 0 differences: nothing in the corpus has the case where only identity tells two nodes
apart. `synthetic-n` (`viewof.x + o.viewof + ({ mutable: 1 }).mutable`) was added for it, and the control then fails.
Each control fails on 1 of the cells or inputs it covers (1025 cells for syntaxPass and captures, 365 inputs for module shape); the corpus is thin on several branches.

### The identity visitor (`visit-own.ss.ts`, `bun diff-own.ts`, `out/diff-own.txt`)

**It is from `capture.ts`, not `own.ts` as the task brief asked** (the brief is not in the repo). `own.ts` has two exported visitors, `ownership` (371
code lines) and `actionEscapes` (102). Both read checker objects that are not data: `actionEscapes` asks
`F.types.get(n)` for a `Ty` and `ch.um(t)` of it, and `F.calls.get(p).sig.flags` / `ch.reg.callSigs(dp)` for a call's
signature. Porting it needs `Ty` and signatures to cross as well, which is a second recursive type and a translation of
the registry; not attempted. `capture.ts` `opaqueCaptures` has the same identity dependence (maps keyed by node,
bindings compared by identity, `actionBodies`) and reads only bindings.

`capture.ts` `opaqueCaptures` (the action-capture rule by binding, default-deny) was ported: it keys maps by node,
compares nodes and bindings by identity, and reads the checker's facts (`bindingOf`, the bindings, `actionBodies`).
The port keys nodes by `nid` and bindings by `id`; the facts arrive as data (`OwnFacts`), translated outside the cell
from the checker object of the original's own run, and crossed. 8 cells, checks clean on `recfix/`: `checkSources` median 166.9 ms (`out/check-recfix.txt`), 194 ms summed per cell (`out/ablation.txt`; 105387 ms on `rec/`, `out/percell-rec.txt`).

Two checker refusals on the way, both kept in the port's shape:

```
whyOf: rejected
    [free-name] L714 free name why1
    [mut-capture] L732 Mut bad captured by a function that escapes (not a local helper that is only called)
```

The mutual recursion `why`/`why1` became function declarations; the `bs.map((b) => why(b))` that captured the Mut
memo became a loop, with a comment saying why.

```
corpus: 1004 cells, 99 with an action body; same 99, differ 0; cells with an opaque capture 7 (7 captures); bindings with a fnNode outside the cell 0, with a node outside the parse 8
synthetic: 20 cells, 5 with an action body; same 5, differ 0; cells with an opaque capture 1 (1 captures); bindings with a fnNode outside the cell 0, with a node outside the parse 0
synthetic-own: 5 cells, 4 with an action body; same 4, differ 0; cells with an opaque capture 3 (6 captures); bindings with a fnNode outside the cell 0, with a node outside the parse 0
control (treeOf takes every child of a JSX opening element as a component name (drops p.name.nid === n.nid)): differ 1 of 108
control (valueSpan ignores fnNode): differ 1 of 108
control (usesInActions ignores b.node === r (nid identity)): differ 0 of 108
control (valueSpan ignores the for...of left === decl test): differ 2 of 108
```

`synthetic-own.ts` has the let / param / Mut / for…of / self-calling helper / JSX-component branches; the original
reports 6 opaque captures on it, all matched. Its `fnspan` cell (a function declaration whose body reads a `let`,
nothing tainted by name) was added after the first run, where the `fnNode` control gave 0: in the first synthetic cell
`helper` is reported by `captures` (by name) and so skipped here. With it the control fails.

The `b.node === r` control gives 0 and is an equivalent mutant: a binding's span is its declaring identifier, so a use
`r` that is that identifier is within the binding's span, and `within(r, x) && !within(b, x)` already excludes it.

Lines (`bun lines.ts`, `out/lines.txt`):

```
identity visitor: capture.ts opaqueCaptures 56 code lines; port (visit-own.ss.ts, all 14 declarations) 102; 8 cells, largest whyOf 39, opaqueCaptures 17, treeOf 16
```

`whyOf` at 39 lines is larger than any shipped cell (26); it holds the mutually recursive `why`/`why1` with their memo,
which cannot be split into cells without passing the Mut between them. The other extra lines are six type declarations
and `treeOf`, which builds the parent map, the by-nid map and the identifier list the original gets from walking
`Node`s and `F.bindingOf`.

What the port leaves open: the facts are built outside, by TypeScript, from the checker's `Map<Node, Binding>`. A
checked checker would have to produce them keyed by nid itself, which is the inference core (`infer.ts`), not ported.

## 5. Completion cost (`bun complete-cost.ts`, `out/complete-cost.txt`)

```
orig/lite/events.ss.ts: 63 cells, 22010 chars
checkSources of the whole module (one variant's check): 12.7 ms
completionsAt cell 62 member .includes: median 10.3 ms, mode member, 24 options (about 0.8 checks)
completionsAt cell 61 member .hid: median 9.6 ms, mode member, 6 options (about 0.8 checks)
completionsAt cell 60 member .handleAt: median 8.7 ms, mode member, 6 options (about 0.7 checks)
completionsAt cell 62 name prefix wa: median 8.5 ms, mode name, 1 options (about 0.7 checks)
per variant, 3977 nodes: parse.ts (paid today) 1.70 ms; nestParse 2.52 ms; cross recdisp 6.26 ms (same name, equal value), 4.94 ms (fresh name); cross rec 366.9 ms
added per variant over today (nestParse - parse.ts + cross recdisp, fresh name): 5.75 ms
4 variants: trusted 10.1 ms; recdisp 29.8 ms; rec 1477.8 ms; flat A 164.6 ms, flat B 75.8 ms (../flat-ast/out/q2.txt)
distinctNames over 361 inputs: more than one parse: spec#7 S1.6 duplicate-cell (2)
flat on the same text: flatParse 3.47 ms; cross orig 27.47 ms, recdisp 4.26 ms; 4 variants: orig 123.8 ms, recdisp 30.9 ms
```

The task brief's 2.6 ms median (from `../flat-ast/RESULTS.md`) is the tutorial module of `complete.test.ts` (12 cells), not `events.ss.ts`. On the `orig/`
copy that test gives `completion on a 12-cell module: median 0.6 ms, max 1.8 ms` (`out/complete-test-orig.txt`,
`58 pass, 0 fail`). On `events.ss.ts` (63 cells) today's cost is 8.5–10.3 ms in this run (9–11 ms in an earlier one), and the figures above compare against that.

At all four positions the time is under one whole-module check, so the first variant succeeds. What a checked checker
with `recdisp/` adds per variant tried is nestParse minus the parse paid today, plus cross: 5.75 ms (on 8.5–10.3 ms). If
all four variants are needed, about 23 ms added; 29.8 ms is the whole parse-and-cross side of four. How often more
than one variant is needed was not measured, here or in `../flat-ast/`.

`distinctNames` re-parses once, on one input of 361.

## Against the flat route, and what this supports

```
                                  flat (../flat-ast/)            nested (here)
visitor lines vs 134 original     215 (port A)                   199 (both without their generated files)
boundary, µs/node, today's cross  9.10 (8.32 in the final run)   90.45 (rec/)
boundary, µs/node, with dispatch  1.22                           1.36 first delivery, 1.66 re-delivery
per call site of the big union    31–36 ms; 0.18 with the fix    37–3026 ms; within noise with the fix
completion, 4 variants, today's   123.8 ms                       1477.8 ms (rec/)
completion, 4 variants, dispatch  30.9 ms                        29.8 ms; 5.75 ms added per variant
identity                          row index                      nid, the same number
language change                   none                           +84 -7 lines in boundary.ts / runtime.ss.ts
```

The two boundary improvements (dispatch) and the checker fix apply to both routes, so the routes differ by the
visitor lines (199 against 215), by the language change the nested route needs (recursive aliases crossing, about 85
lines, with the S11.3–S11.5 wording above), and by the code reading as ordinary tree code (`n.init`, `p.property.nid`)
instead of row lookups. The line counts are close to like-for-like: neither counts its generated types or child
lists (`ast-a.ss.ts`; `ast-n.ss.ts` and `kids-n.ss.ts`), both count their hand-written child helpers (here `kids`), and
the nested count includes three type declarations (`ModErr`, `CellDef`, `FnNode`) that flat port A's list leaves out.
The completion rows are measured on the same text in one run (`out/complete-cost.txt`, last line for flat); with the
same boundary the routes cost the same there. On these measurements the nested route is the better of the two.

Whether it carries the whole checker is not shown. What was ported is the syntactic part: module shape, the syntax
pass, captures, and one binding-level rule that got its facts as data made outside. The checker's inference core
(`infer.ts`, `own.ts`'s `ownership` and `actionEscapes`, `registry.ts`) keys `Map<Node, …>` facts, holds `Ty` values
and signatures, and `completionsAt` replaces methods on the checker object (`ch.identHook`, `ch.member`). Each of
those would need its own data form keyed by nid, and `Ty` crossing would be a second recursive type of the same kind.
Recommendation: move the parse-side visitors (module shape, syntax pass, captures, line/leading) to checked code on
the nested tree, with the checker fix and dispatch landed first; keep inference in TypeScript until a `Ty` port has
been measured the same way.

## Unsure

- The four checker fixes change no verdict on 365 inputs; that is the evidence, not a proof. The `Mut` exclusion in
  the `sub` fast path hides a disagreement whose right answer was not decided.
- Several controls fail on one cell only; the corpus is thin on the branches they guard.
- The depth limit of 2000 is below acorn's own limit for three of four shapes and was chosen by hand.
- How often `completionsAt` needs more than one variant.
- The nid order is checked against acorn's order only by the differential (0 mismatches on 361 inputs), not by the
  boundary.

## Not done

- An iterative copy walk (the limit is a recursion depth of 2000).
- Truncating the path in the depth-limit message.
- `statementCells` took 930 ms of `visit-n`'s 1084 ms check before the `iterIn` fix (terminal output, not kept;
  `out/ablation.txt` has 1095 ms for `visit-n` without that fix) and 17 ms after (`bun percell.ts recfix visit-n.ss.ts`). That `iterIn` was the whole cause was inferred from the before/after, not
  profiled on that cell.
- `infer.ts`, `own.ts`, `registry.ts` and `complete.ts`'s hooks (`ch.identHook`, `ch.member`) were not ported. They
  are where the checker keys state by node identity and mutates the checker object.
