# What is left of the unchecked runtime, 2026-11-21

Question: of `lite/boundary.ts`, `lite/jsx/h.ts`, `lite/browser/workers.ts`, `lite/stdlib/runtime.ts` and what
is left of the three shells (`lite/browser/cells.ts`, `prelude.runtime.ts`, `lite/jsx/render.ts`), what could be
checked SoundScript today, and what blocks the rest. Prototype and survey. Every file named below is in this folder unless a path says otherwise.

No shipped file, no checker and no build was changed. `tools/lang-experiment` is untracked in the outer repo
(`git status --short .` prints `?? ./`), so git cannot show this. The evidence is
`find . -newer selfhost/port-rest/runtime-inventory.ts -type f`: with `node_modules` and `selfhost/port-rest/`
excluded, it printed nothing.

## Inventory

`bun selfhost/port-rest/runtime-inventory.ts` (a copy of `selfhost/runtime-inventory.ts`, output to `out/`;
`out/inventory.txt`, `out/runtime-inventory.json`):

```
220 named cells
../prelude.runtime.ts: 31 cells, 141 lines
(generated): 139 cells, 0 lines
boundary.ts: 8 cells, 86 lines
jsx/h.ts: 4 cells, 8 lines
jsx/render.ts: 8 cells, 59 lines
browser/cells.ts: 26 cells, 107 lines
stdlib/runtime.ts: 4 cells, 22 lines
```

The 139 generated cells are 91 SoundScript value cells, 44 type cells and 4 tests. The JavaScript cells from the
TypeScript files are 81, 423 lines.

The inventory counts only `@tomlarkworthy/soundscript-runtime`. `units.ts` covers the whole of each file.

Where each unit ships, from `generate()`'s three module outputs (`bun selfhost/port-rest/where.ts`,
`out/where.txt`):

```
shapeOf	checker
check	checker (in checksRun_cells), checker
checkCells	checker
compiler	checker (in compiler_cells), checker
makePool	workers
pagePool	workers (in pagePool_cells), workers
hash	none	dropped
makeRandom	none	dropped
makeClock	none	dropped
makeLog	none	dropped
```

`hash`, `makeRandom`, `makeClock` and `makeLog` are in generate()'s `stats.dropped` and ship in no module. They
run only under bun (the port harness `run.ts`).

## Units

`bun selfhost/port-rest/units.ts --dump` (`out/units.txt`) splits each file with `lite/parse.ts`: every
top-level statement, plus the inner declarations of any function longer than 20 lines. The class of each unit
is set by hand in `verdicts.ts`, with its reason. The classes are:

- a: decision over plain data, the whole unit can be a cell;
- m: mixed, the decision part was written as cells and the rest stays shell;
- b: inherently shell;
- c: blocked by a checker limit;
- t: type declaration;
- i: import or re-export.

Inner units are listed but not counted. Lines are statement spans.

| file | a | m | b | c | t + i |
|---|---|---|---|---|---|
| boundary.ts | 1 unit, 40 (`shapeOf`) | 1, 10 (`describe`) | 6, 75 | 1, 1 (`Mismatch`) | 3, 3 |
| jsx/h.ts | | 1, 5 (`h`) | 3, 3 | | 2, 2 |
| browser/workers.ts | | 2, 71 (`makePool`, `pagePool`) | 5, 48 | | 4, 4 |
| stdlib/runtime.ts | 1, 1 (`ISLANDS`) | 4, 89 (`check`, `checkCells`, `joinCells`, `compiler`) | 7, 19 | | 22, 22 |
| browser/cells.ts | | | 32, 107 | | 6, 6 |
| prelude.runtime.ts | 1, 5 (`hash`) | 1, 9 (`makeRandom`) | 34, 123 | 3, 35 (`snapshot`, `equals`, `makeClock`) | 3, 3 |
| jsx/render.ts | 2, 3 (`asText`, `keyOf`) | | 6, 56 | | 2, 2 |
| **all** | **5, 49** | **9, 184** | **93, 431** | **4, 36** | **42, 42** |

All of `browser/cells.ts` is b. What is left there is identity (ids by WeakMap, WeakSet and symbol brands),
running user generators and actions, `requestAnimationFrame`, `console.error`, and the `feed`/`perform` driver.
Its decisions moved to `events.ss.ts` in commit ca223594
(`selfhost/NOTES-overnight-2026-11-21.md`). `prelude.runtime.ts` is the same apart from the five
units in a, m and c.

Units classed b that also meet a checker limit. These are b because they inspect values of foreign shape or are
brands; the limit is quoted to show that a b verdict is not the only obstacle:

- `copy`: `[no-member] hasOwn`, `[type] cannot index object with string`, `[object-freeze]`.
- `plain` and `describe`'s object branch: `[no-member] getPrototypeOf`, `[banned-member] Object.prototype is
  banned`, `[no-member] no property then on object`, `[no-member] no property constructor on object`
  (`attempts/copy.ss.ts`, `out/attempt-copy.txt`).
- `generatorish`: `[no-member] no property next on object`.
- `STATECELL`, `EVENTS` and the other brands: `[unsupported] intrinsic Symbol has no signature in
  lite/intrinsics.ts`; `state`: `[unsupported] computed property`.

## Prototype cells

The harness is `ss-check.ts`. It runs the checker the way `ts-cells.ts` `ssStatements` checks a shipped
source: `ssCellTexts` of the shipped sources named by `--with`, then the prototype's cells, joined and given to
`checkSources` with `tsx: true`, and `acceptedOf` decides acceptance. No cell is named `--outside`. Each test
calls `requireChecked` first and stops if any cell is not accepted. Sanity check that the harness rejects: `attempts/pool-sanity.ss.ts`, a copy
of `pool.ss.ts` with two cells appended, gave `[type] PoolResult is not assignable to number` and
`[member-write] write to a SlotRec | undefined, which is not Mut` (`out/pool-sanity.txt`). Line numbers in messages count from the top
of the joined text.

Outputs: `out/ss-check.txt` (all three files and the two first attempts), `out/pool.test.txt`,
`out/shape.test.txt`, `out/small.test.txt`.

| unit | prototype | verdict | test (prototype / control mutant) |
|---|---|---|---|
| `makePool` decisions | `pool.ss.ts`, 15 cells, largest `pump` 14 lines | checks as is | 0 of 2000 random scripts differ; mutant `takeLive` 927 of 2000, mutant `settle` 1974 of 2000 |
| `shapeOf` | `shape.ss.ts`, 5 cells, largest `shapeOf` 23 lines | checks after 2 rewrites | 0 of 20000 random types; mutant `boolUnion` 22 of 20000 |
| `check` key | `small.ss.ts` `checkKey` | as is | 0 / 1458 of 3000 |
| LRU of `check`, `joinCells`, `keyFor` | `lruTouch`, 8 lines | after a rewrite | with `islandKey`: 0 / 3000 of 3000 |
| `compiler` refusal | `refusedCells` | as is | 0 / 2675 of 3000 |
| `compiler` island key | `islandKey` | as is | (with `lruTouch`) |
| `checkCells` stand-ins | `standIns`, 17 lines | as is | 0 of 150 module texts (116 have a cell that does not parse); mutant 116 of 150 |
| `pagePool` size | `poolSize` | as is | 0 / 1453 of 3000 |
| `hash`, `makeRandom` | `imul`, `hash`, `randomStep` | after a rewrite | 0 / 3000 of 3000 (20 draws per seed against `makeRandom`); `imul` against `Math.imul` on int32 corners, NaN and fractions, 0 / 762 of 3000 |
| `asText` | `asText` | as is | 0 / 870 of 3000, through `kidOf` |
| `keyOf` | `keyOf` | as is | 0 / 2451 of 3000, through `kidOf(h("li", { key }))` |
| `h` record | `elemRecord` | after a rewrite | 0 / 2068 of 3000 on string keys; differs on symbol keys (below) |
| `describe`, data part | `describeData` | as is | 0 / 2463 of 3000, through `cross`'s mismatch message |

Each control is a hand-made mutant of one cell, linked in place of the real one; the test fails unless the
mutant differs from the original.

The oracles:

- The original's export is called where one exists: `makePool`, `shapeOf`, `makeRandom`, `kidOf`, `h`,
  `cross`, `checkCells`.
- `checkKey`'s oracle is the `key` initialiser, cut from `check`'s AST in `lite/stdlib/runtime.ts` and evaluated.
- The `keyFor` and refusal oracles are copied from `lite/stdlib/runtime.ts` lines 108-116 and 140-142.
- The `poolSize` oracle is the formula copied. That test shows only that the cell computes the copied formula.

The pool test drives fake workers that answer only when the script says. The script draws from:

- runs on three owners and four keys, 20% of them without code and 8% with an uncloneable function;
- owner deaths;
- answers: ok, `error`, `missing`, an unknown id;
- worker errors.

There are no timers: each step is followed by six `await null`. Over 200 scripts the original's traces hold
263 resends of a missing island, 191 SupersededError, 212 DataCloneError, 176 "was not sent", 290 "worker
failed", 463 "boom" and 1108 resolves. One path is not reached: a resend whose post throws. A job that cannot
be cloned throws on its first post, so it never gets to a resend.

### Compiled inputs (does a cell land?)

`bun selfhost/port-rest/compile-inputs.ts <file> <runtime|other> [--with …]` (`out/compile-inputs.txt`) compiles
each cell with `compileCell` and `contextFromCheck` and `inputsIn(module is the runtime)`, as `ssStatements`
does. No prototype cell takes `ss`:

- In the runtime module, `shapesOf`, `recShape`, `lruTouch` and `standIns` take `mut,freeze`.
- Elsewhere they take `ss_mut,ss_freeze`.
- The pool cells take only each other.

So the 2026-11-20 limit 1, "a cell that uses a built-in takes `ss`", was not met. Linking them into a built
notebook was not tried.

### Rewrites, each with the first attempt kept in `attempts/`

1. `shapeOf`'s `{ error }` is told apart from a `Shape` with `"error" in s`. The checker narrows `in` soundly
   under width subtyping, so the true branch still holds every Shape member
   (`attempts/shape.v1.ss.ts`):
   ```
   [type] L323 { k: "num"; error: unknown } | … | { error: string } is not assignable to Shape[] | { error: string }
   ```
   Rewritten with the error tagged `k: "error"`. The shell would give core.ts `{ error }` back; the test's
   `untag` line does that and the shell itself was not written. Repro: `repro/in-narrow.ss.ts`.
2. `case "num": case "str": case "null": case "unknown": return { k: t.k }`:
   `[type] L349 { k: "num" | "str" | "null" | "unknown" } is not assignable to ShapeOr`. An object literal with
   a union-typed tag is not split over the union. Rewritten as one case per tag. Repro:
   `repro/literal-union-key.ss.ts`.
3. `Math.imul`: `[no-member] no property imul on { PI: number; … }`. Rewritten as an `imul` cell from 16-bit
   halves, exact because no partial product exceeds 2^47. Repro: `repro/math-imul.ss.ts`.
4. `m.keys().next()`: `[unsupported] intrinsic member Iterable.next`. Rewritten as `[...m.keys()][0]`, which
   copies the keys on every touch. Repro: `repro/iterable-next.ss.ts`.
5. `{ ...props }` of an index record: `[unsupported] object spread of { [k: string]: unknown }`. Rewritten as
   `Object.fromEntries(Object.entries(props ?? {}))`. That is a behaviour change: `h` keeps a symbol-keyed prop
   and the rewrite drops it (`small.test.ts`:
   `elemRecord, symbol key: h keeps it true, prototype keeps it false`). JSX from a checked cell cannot write a
   symbol key; an unchecked caller of `h` can. Repro: `repro/index-spread.ss.ts`.

### A difference found in the original

`shapeOf` reads `t.args[0]` of `Array`/`ReadonlyArray` without a check. With no argument it throws
`TypeError: undefined is not an object (evaluating 't.k')` (`lite/boundary.ts:14`, reached from line 46). It
threw on 416 of the 20000 random types. The checker required `el !== undefined` in the prototype, which returns
`Array, which the boundary does not check` instead. Whether the checker's registry ever produces an `Array` with
no argument was not checked.

## Checker limits met, with minimal repros

`repro/*.ss.ts`, one cell each. Each was run with `bun selfhost/port-rest/ss-check.ts <file>` and the output is
in `out/repro.txt`.

| repro | message | met in |
|---|---|---|
| `getPrototypeOf` | `[no-member] no property getPrototypeOf on { entries: …; prototype: unknown }` | `plain`, `describe`, `equals` |
| `object-prototype` | `[banned-member] Object.prototype is banned` (+ `[strict-eq-object]`) | `plain`, `describe` |
| `hasOwn` | `[no-member] no property hasOwn on { entries: … }` | `copy`, `equals`, `isStateCell`, `isAction`, `isRefHandle` |
| `index-object` | `[type] cannot index object with string` | `copy`, `equals` |
| `instanceof` | `[unsupported] instanceof` | `equals`, `snapshot` |
| `arraybuffer-isview` | `[no-member] no property isView on {  }` | `snapshot`, `equals` |
| `structuredClone-T` | `[type] structuredClone of T, which may be or hold a function (its type is T): the clone would throw or lose it` | `snapshot` |
| `symbol-for` | `[unsupported] intrinsic Symbol has no signature in lite/intrinsics.ts` | `STATECELL`, `ACTION`, `REFHANDLE`, `EVENTS`, `LISTENER` |
| `computed-key`, `computed-key-on` | `[unsupported] computed property` | `state`, `on` |
| `let-capture`, `let-capture-random` | `[let-capture] let t assigned from a function that escapes` (`let a` in the second) | `makeClock`, `makeRandom`'s closure over `randomStep` |
| `class` | `[no-class] ClassDeclaration` | `Mismatch` |
| `weakset` | `[new-non-intrinsic] new on something that is not an allowed intrinsic` | `elementsMade`, `madeHandles` |
| `weakmap` | same | `records`, `over`, `viewEls`, `views`, `actionNames`, `idOf` |
| `event-target` | same | `handleOf` |
| `define-property` | `[banned-member] Object.defineProperty is banned` | `action`, `handleOf` |
| `freeze-nonliteral` | `[object-freeze] Object.freeze takes one object or array literal` | `h`, `copy` |
| `unknown-member` | `[no-member] no property next on object` | `generatorish` |
| `console` | `[free-name] free name console` | `perform` |
| `math-imul` | `[no-member] no property imul on { PI: number; … }` | `hash`, `makeRandom` (rewritten) |
| `iterable-next` | `[unsupported] intrinsic member Iterable.next` | LRU eviction (rewritten) |
| `index-spread` | `[unsupported] object spread of { [k: string]: unknown }` | `h` (rewritten) |
| `in-narrow` | `[type] { k: "a"; error: unknown } \| { error: string } is not assignable to { error: string } \| null` | `shapeOf` (rewritten) |
| `literal-union-key` | `[type] { k: "num" \| "str" } is not assignable to K` | `shapeOf` (rewritten) |

Dead end: `repro/listener-placement.ss.ts`, an `on` that builds `{ events, action, listener: true }`, checked
`ok`. It is not a repro of S7.3, because the record is not the built-in `Listener` type, so it was deleted.
`on` stays b as a symbol brand.

Checked again today, against `selfhost/rt/*.ss.ts` of 2026-11-20 (`bun selfhost/rt/check.ts`):

- `switch` now checks (`want` and `poolStep` use it).
- `copyRec` in `attempts/copy.ss.ts` takes a `Mut<Set<object>>` parameter and calls `add`/`delete` with no
  `[mut-capture]`. The 2026-11-20 message for `copy`, `[unsupported] try/finally in a function holding a
  Mut/Borrowed`, was not met because the attempt has no `finally`. That changes behaviour on early return, and
  the attempt was not run.

## Lines each prototype moves

`bun selfhost/port-rest/measure.ts` (`out/measure.txt`). Statement lines from the parse:

```
worker pool: original 66 unchecked lines; prototype shell 46 unchecked lines; 15 cells, 77 checked lines (largest 13)
checkCells stand-ins: original 27 unchecked lines; prototype shell 18 unchecked lines; 1 cells, 15 checked lines (largest 15)
check key + LRU: original 12 unchecked lines; prototype shell 9 unchecked lines; 2 cells, 10 checked lines (largest 8)
shapeOf: original 40 unchecked lines; prototype shell 0 unchecked lines; 5 cells, 45 checked lines (largest 22)
hash + makeRandom: original 14 unchecked lines; prototype shell 0 unchecked lines; 3 cells, 16 checked lines (largest 6)
```

Two shell counts are 0 because those shells were not written:

- `shapeOf`'s adapter is estimated at 2 lines.
- `makeRandom` over `hash`/`randomStep` is estimated at 4 lines.

`joinCells` and `compiler` were not rewritten over `lruTouch`, `islandKey` and `refusedCells`. By the same
pattern as `makeKeyFor` (`small-shell.ts`) they would lose about 3 lines each. That is an estimate.

## Ranking

| rank | candidate | unchecked lines removed | decisions moved | glue added, other cost |
|---|---|---|---|---|
| 1 | worker pool | 20 (66 → 46) | queue order, slot choice, superseded drop, resend once, failure on a throwing post, worker error, answered count | 4 feedback events and the `dead` list per event. Every step copies the slot array and both Maps, against the original's in-place writes; the cost per job was not measured. The cells would land in `soundscript-workers`, which has no SoundScript cells today. |
| 2 | `shapeOf` | about 38 (40 → about 2) | which annotation crosses the boundary, and why not | It goes to the checker module, not the runtime. It changes the error shape (`k: "error"`), so core.ts or an adapter changes. |
| 3 | `checkCells` stand-ins | 9 (27 → 18) | the numbering of the k-th declaration and the stand-in text | The shell builds a row per cell. Checker module. |
| 4 | `check`/`joinCells`/`keyFor` LRU, `checkKey`, `refusedCells`, `islandKey` | 3 measured (`check`), about 6 more estimated | one LRU rule written once instead of three times | The rewrite copies a Map on each touch. Checker module. |
| 5 | `asText`, `keyOf`, `describeData`, `elemRecord`, `poolSize` | 1 to 7 each | text of a value that is not an element, a key, a mismatch description | `elemRecord` drops symbol keys. Each is 1 to 9 lines. |
| 6 | `hash` + `randomStep` | about 10 (14 → about 4), none from any notebook | the seeded random generator | Ships in no module (`out/where.txt`). It brings an `imul` cell that duplicates `Math.imul`; the other way is to add `imul` to the intrinsics, which is a checker change outside this task. |

Answer: little is left that is worth it.

- Ranks 1 and 2 are the only ones that move a decision a reader would look for. Together they remove about
  58 of the 700 code lines (classes a, m, b, c) that `units.ts` counts in the seven files. Neither lands in
  the runtime module the inventory counts: the pool goes to `soundscript-workers` and `shapeOf` to the
  checker module.
- The rest are small and add a call per use.
- The 431 lines classed b are identity, user code, DOM, Worker and timer effects, and foreign values. They are
  shell by construction.
- The 36 lines classed c are `equals`, `snapshot`, `makeClock` and `Mismatch`. `equals` and `snapshot` are the
  runtime half of the prelude's `equals` and `snapshot` over any value. They would need `getPrototypeOf`,
  `instanceof`, `ArrayBuffer.isView` and a `structuredClone` of `T`, and the last of these is refused for
  soundness, not for want of a declaration.

## Unsure

- `copy`, `describe`, `plain`, `viewRef`, and `listen`'s validation are classed b (foreign values). Each also
  meets a c limit. If `getPrototypeOf`, `hasOwn` and string indexing of `object` were added, `copy` would be the
  next candidate, with a result value in place of `Mismatch`. The last line of `attempts/copy.ss.ts` is as far
  as that attempt went.
- `equals` and `snapshot` are classed c rather than b. Their arguments are SoundScript values, not foreign ones,
  but any value can reach them.
- The pool differential runs on fake workers that answer in any order the script picks. A real worker answers
  in the order it was posted to; the scripts use the oldest unanswered post per worker, so that matches.
  Supersession is read through `owner.dead` at each event. The original reads it at each `queue.shift()`. The
  two agree because nothing in one synchronous pump writes `owner.dead`; this was reasoned, not tested.
- `units.ts` lines are statement spans, so comments between statements are not counted. `measure.ts` counts the
  same way.

## Commands run

```
bun selfhost/port-rest/runtime-inventory.ts > selfhost/port-rest/out/inventory.txt
bun selfhost/port-rest/units.ts --dump > selfhost/port-rest/out/units.txt
bun selfhost/port-rest/ss-check.ts <file> [--with runtime.ss.ts,types.ss.ts]
bun selfhost/port-rest/pool.test.ts 2000
bun selfhost/port-rest/shape.test.ts
bun selfhost/port-rest/small.test.ts
bun selfhost/port-rest/measure.ts
bun selfhost/port-rest/where.ts
bun selfhost/port-rest/compile-inputs.ts <file> <runtime|other> [--with …]
bun selfhost/rt/check.ts selfhost/rt/{prelude,boundary,jsx,cells,workers}.ss.ts   (old probes, for comparison)
```
