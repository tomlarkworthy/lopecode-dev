# Typed imports between SoundScript modules: prototype results

Recorded 2026-11-22 between 00:31 and 00:45 CET (`date` at the start: Sun 22 Nov 2026 00:31:49 CET; `out/` files dated 00:31:52 to 00:39:33). Everything is in `selfhost/typed-imports/`. No shipped
file was edited. `lite/soundscript/build.ts` and the browser `verify.ts` were not run. Raw output of every command
below is in `out/*.txt`, and each command was run from `selfhost/typed-imports/`.

The brief is the task message the owner sent to this session. It is not in the repository, so the parts this record
relies on are quoted where they are used. The design is the owner's, and it was built as stated: one checker per runtime, a table of the checked exports of
each SoundScript module, imports typed from that table, values passed by reference, and a gate that decides which
modules are SoundScript.

## 1. How imports work today

1. The Runtime wires `import {x} from "@b"` as a variable whose definition is `identity` and whose one input is
   `@b`'s `x` (`@observablehq/runtime` 6.1.0, `src/variable.js` `variable_import`). So inside the Runtime every
   import is already by reference.
2. `core.ojs` `ss_isSs` (lite/soundscript/core.ojs:128-137) counts a variable as SoundScript when the text
   `String(v._definition)` carries the `/*{lang:"ss"}*/` marker. It also counts the `STATE_VALUE` value variable of a
   marked state cell. An import variable carries no marker, so it is not SoundScript.
3. `ss_moduleCells` (core.ojs:138-160) decompiles each marked variable to its source. `ss_outside` (core.ojs:162-178)
   lists every other named variable, imports included, as a cell in another language. Each one has only `name` and
   `view`, so nothing records which module it came from.
4. `ss_check` (core.ojs:180-185) checks one module through `soundscript.checkCells(...)`, the notebook's form of `checkSources` (lite/core.ts:46). The module's
   own Registry is built by `mdRegistry` (core.ts:157-179).
5. In the md cells, `mdInjectParam` (lite/infer/md-inject.ss.ts:92-115) sends a parameter that names an outside
   variable to `mdInjectBoundary` (62-80). With no annotation that is `[boundary-unannotated]` (line 64).
   A module's own cell wins over a capability (101); a capability wins over a cell in another language (109-110).
6. `mdTaintOf` (md-taint.ss.ts:5-22) treats such a value as state (line 19, "a cell in another language"). That is
   S11.9.
7. The toolchain's `arg()` (lite/toolchain/ss-toolchain.ts:300-306) compiles a boundary parameter to
   `ss_cross(value, shape, "cell.param", module)`, or to `viewRef` for `State`. `cross` (lite/boundary.ts:246) copies
   the value, checks it, deep-freezes it, and reuses the last copy for that module, cell and parameter when the two
   are equal (258).
8. Types are never shared. `import type` is skipped by `cutsOf` (comment-types.ts:13), skipped by `moduleLevelRule`
   (lite/acorn/syntax.ss.ts:35), and dropped by the build (lite/soundscript/ts-cells.ts:202-206). `compileChecked`
   throws "unsupported top-level statement (ImportDeclaration)" (ss-toolchain.ts:269). The build shares types only by
   checking several sections concatenated into one source (ts-cells.ts:47-55, `SS_CHECKED_WITH` / `SS_GROUPS`).
9. `ss_roundtrip` (core.ojs:196-210) reports "the definition does not recompile to itself". It is a test, not a gate:
   nothing reads its verdict.
10. A state handle crosses by reference today. `import {viewof x}` is taken as `State<T>` (S11.7, spec.ojs:1919).

## 2. What the prototype does

| file | lines | what |
|---|---|---|
| `ti-types.ss.ts` | 42 | types (SoundScript) |
| `ti-module.ss.ts` | 96 | one module's check with its imports seeded; its exports (SoundScript cells) |
| `ti-program.ss.ts` | 177 | import graph, module order and cycles, export resolution, type transplant, one step per module (SoundScript cells) |
| `ti-gate.ss.ts` | 18 | the comparison of running and recompiled definitions (SoundScript cell) |
| `ti-link.ts`, `ti-gate-link.ts` | 73 | links the ti cells with the md cells for bun (`linkMd`, lite/infer-ss.ts:73), one Registry per module |
| `compile.ts` | 19 | compiles `import type` as a variable shaped like a type cell |
| `gate.ts` | 72 | the gate over Runtime variables |
| `rt.ts` | 65 | a program compiled by the toolchain and run in one `Runtime` under bun, in mode `typed` or `today` |
| probes, probes-data, forge, forge2, elem-action, freeze, demo, measure, self-check, control | 617 | the evidence below |

**The check of a program.** The modules are ordered by their imports, and each is checked once (`tiStep`). It is
given the results of the modules before it (`TiKnown`). Each import of a checked, running, value-kind export is
*seeded* into the module's tables (`tiTables`). The seed carries the export's type, its taint (`stateful`) and its
fed-by-a-foreign-function facts (`fnFed`). So the importer's parameter needs no annotation and the compiled cell
takes a plain input. Every other import stays in `outside` and behaves exactly as today.

**Types across modules.** The Decl objects that an imported type reaches are copied by name from the exporter's
Registry into the importer's. The types reached are closed over (`tiClosure`), and a name clash is detected
(`tiClashNames`).

**Cells.** Self-check (`bun self-check.ts`) runs the shipped checker over the ti files, with the md sections they use
and the acorn shell:

```
cells: 521 (ti: 25); not ok: 0; 3005 ms
largest ti cells: tiCheckSources 26, tiTyNames 18, tiTypeUses 18, tiSeeds 16, tiModuleHead 15
```

No checker rule was loosened to make these cells check. The largest is 26 lines (the brief: "largest shipped cell 26
lines"). In the shipped set `self-check.ts` reads, counted the same way, the largest is 32 (`show`, types.ss.ts), then
`ixMayHide` 31, `ixMayHoldFn` 28 and `mdCell` 27, so the brief's 26 is not the shipped maximum.

**Control.** `bun control.ts` runs the corpus differential against the shipped `checkSources`:

```
sources 603: same 603 (both threw 0), different 0; as a one-module program: 454 of 454 same
```

On every shipped source the ti check gives the same result as the shipped check, alone and as a program of one
module.

### Decisions

Each decision is listed with the alternative not taken.

- **An import edge inside a module cycle stays on today's boundary path, and raises no error.** No program that runs
  today breaks: probes `cycle-*` give `[boundary-unannotated]` or ok, exactly as today. The alternative is to
  interleave the cell checks of the modules on the cycle, one export variable per cell. That would rewrite the order
  in `mdOrder` to run across modules: a large change for a case the corpus does not have. A cycle of type imports
  (`cycle-types`) is handled the same way.
- **Type identity is by name, and a clash falls back.** An imported value whose types reach a clash
  (`P` from `@b` and a `P` of the importer, or `P` from both `@b` and `@c`) is not seeded, so it crosses as today. An
  `import type` that clashes is `[import-clash]`. The alternative is to namespace each Decl by its origin, with a
  Registry that converts `@b.P` to its own key. That is more code in `lite/registry.ts` (`load` at 63-103 already
  merges interfaces of the same origin) and changes every message that names a type.
- **Only value-kind exports are seeded.** A cell is kind `handle` or `listener` when it is a state or events cell, or
  when its type holds `State`, `StateCell`, `Events`, `Listener`, `Action`, `Mut` or `Borrowed` (`TI_HANDLES`).
  Those cells, and sync generators, stay on today's path. See section 6.
- **A rejected or blocked export blocks the importer.** The export's `t` is `null` unless the cell runs (`tiAccepted`
  follows the in-module cellStates). The importer is then `blocked` by that parameter, as a cell in-module is blocked
  by a rejected input.
- **A capability name wins over an import of the same name**, as a capability wins over an outside cell in-module
  (md-inject.ss.ts:109-110). A seeded import is not an outside cell (it joins `cellNames`), so `tiSeeds` skips
  capability names to keep that order.
- **An annotation on an imported parameter follows S2.3.** An equal or wider annotation is allowed. An incompatible
  one is `[inject-type]` (probes `ann-*`).
- **A re-export through a module in another language follows the Runtime wiring**
  (`chain-reexport-js-middle` is ok). This is sound because the middle import is an identity definition, which the
  gate reads from `_definition === identity`, not from text.

## 3. Probe results

`bun probes.ts` (output `out/probes.txt`, messages `out/probes-show.txt`):

```
probes 77: as expected 77, surprises 0; 109 ms
data 7/7, annotation 5/5, function 8/8, type 9/9, chain 5/5, clash 6/6, rejected 4/4, language 5/5, cycle 5/5, prelude 3/3, taint 7/7, fed 5/5, handle 5/5, edit 3/3
```

Each probe states the verdict it expects per cell. Probes that carry `today` also compare their module's whole result
(cells, errors, facts) with the shipped `checkSources` of that module alone. This covers the language, cycle and
handle cases: importing from a module in another language behaves exactly as today.

The first run had three surprises, all caused by prototype bugs:

1. `type-from-js-module`: a module with no SoundScript cell counted as SoundScript and gave `[import-unknown]`.
   **Fix:** a module with no cell and no type is another language ("the module has no SoundScript cell").
2. `export-blocked`: `@b.next` took a rejected cell of `@b`, was ok in its own check, and was exported with a type.
   **Fix:** `tiAccepted`, so only a cell that runs exports a type.
3. `prelude-type-name`: a type named like a built-in (`State`) was exported. **Fix:** `tiTypeDecls` skips built-in
   names. The probe was split: an empty module behaves as today, and a module that has a cell gives
   `[import-unknown]` for the type.

One expectation was changed after a decision, not after a bug: `chain-reexport-js-middle` became ok (section 2,
last decision).

New messages, quoted from `out/probes-show.txt`:

```
[import-clash] x is imported from @b and is also a cell of this module
[import-clash] type P of @b has the name of a type of this module
[type] string used as a number                (edit-after: @b.n changed from 1 to "s"; @a.m = n * 2)
```

## 4. The gate, and forged modules

The gate (`gate.ts`) reads each module's variables from `runtime._variables`. Definitions are read with
`Function.prototype.toString.call`, and imports are read from `_definition === identity`. The gate then
decompiles the marked variables, checks the program, and recompiles each module with the toolchain from the check's
context. A module is SoundScript only if its recompiled variables equal the running ones: the same names, inputs and
text (`tiSameDefs`). Modules are taken in import order, so a module whose exporter fails is checked with that import
as a cell in another language.

`bun forge.ts` (`out/forge.txt`) forges a running program, `@b` exporting to `@a`. Each forge is gated twice: by the
control, which decompiles and checks but does not recompile, and by the gate.

| forge | control | gate |
|---|---|---|
| none (clean) | both SoundScript | both SoundScript |
| comment-type lie: code returns `"s"`, decompiles to `(): number => 1 + 0 * ("s").length`; at run time `@a.use` = `"s1"` | both SoundScript | @b, @a another language |
| JavaScript look-alike: marker, header and function inside a block that also writes `globalThis` | both SoundScript | @b, @a another language |
| one character in a type comment (`number` to `string`) | both SoundScript | @b, @a another language |
| one character outside the function (`(x)` to `(-x)` in @a's call) | both SoundScript | @a another language |
| one character in the header (`n =` to `N =`) | both SoundScript | @b, @a another language |
| type cell runs code in place of `0` | both SoundScript | @b, @a another language |
| lowered JSX changed, kept original unchanged | both SoundScript | @b, @a another language |
| state value variable defined as `(G, _) => 5` | both SoundScript | @b, @a another language |
| state value variable with text kept but input `viewof n` | both SoundScript | @b, @a another language |
| own `toString` property returning the compiled text; gate reads `String(def)` | both SoundScript | **both SoundScript (fooled)** |
| the same; gate reads `Function.prototype.toString.call(def)` | both SoundScript | @a another language |
| a rule tightened: `r = (): number => [1][0]!` compiled by a checker with no syntax bans, gated by the present checker (`[no-non-null]`) | both SoundScript | @b, @a another language |
| import rewired from `good` (number) to `evil` (string); @a has `x * 2` | both SoundScript | @a another language |
| one character in the body (`=> 1` to `=> 7`) | both SoundScript | both SoundScript |
| import rewired; @a holds only `same = (x) => x` | both SoundScript | both SoundScript |
| `forge2.ts`: n's compiled text unchanged, evaluated inside a closure that declares `const Math = { max: () => "s" }` (n is `Math.max(1, 2)`); `@b.n` = `"s"`, `@a.m` = NaN | not run | **both SoundScript (fooled)** |
| `forge2.ts`: the runtime input `ss_h` of `@b` redefined; `@b.el` = `"forged"` | not run | **SoundScript (fooled)** |

The control is fooled by every forge in `forge.ts`. With recompile, the gate ends each of the brief's four cases ("a hand-edited definition whose comment types claim a different
type than its code; a JavaScript module that merely looks like compiled SoundScript; a definition compiled by the
toolchain and then altered by one character; a module whose source checks only with a rule the present checker has
since tightened") as
another language: the comment-type lie, the JavaScript look-alike, the one-character edits in a type, outside the
function and in the header, and the tightened rule.

**One deviation from the brief.** The brief expects a definition "altered by one character" to end as another
language. The body edit `=> 1` to `=> 7` does not: the altered text decompiles to `=> 7`, which checks, and recompiles
to the same text, so the running code is exactly a checked source. The gate cannot tell it from a program written
that way, and it need not: it is sound, but it is not evidence of tampering. The rewired `same` is likewise checked
against the wiring the Runtime actually has.

**Two forges the gate does not see (`forge2.ts`, `out/forge2.txt`).** Both pass because the gate compares text:

- *A closure.* `Function.prototype.toString` returns the function's text, not its environment. The same text
  evaluated in a scope that shadows a free name (`Math`, `JSON`, `Map`, `structuredClone`) runs other code. Text
  equality cannot see this.
- *The runtime inputs.* `gateInput` skips the `ss_*` variables and `Generators` (rt.ts `gateInput`), so a redefined
  `ss_h`, `ss_state`, `ss_ref` or `ss_cross` is trusted.

Two remedies, not built. (a) The gate installs what it checked: it redefines each SoundScript variable with its own
evaluation of the recompiled text, in the toolchain's scope, and the runtime inputs with the toolchain's own functions.
Cost: every SoundScript cell runs once more after each gate. (b) Identity: the toolchain keeps a `WeakSet` of the
functions it evaluated, and the runtime inputs are compared by identity with `lite/stdlib/runtime.ts`'s exports. A
definition not in the set is another language. Cost: one lookup per variable, but a notebook loaded from HTML runs
definitions the toolchain did not evaluate, so the loader must evaluate SoundScript variables through the toolchain.
Today's `ss_isSs`, which reads only the marker, is fooled by both as well, but today `@a` takes `n` through
`ss_cross`, which checks the shape (boundary.ts:246-258), so `"s"` would be caught at the edge. Traced, not run.
Under the design `@a.m` becomes NaN with no error: for the closure forge the design is weaker than today. Either remedy puts the gate's soundness on "the definition is the toolchain's evaluation of checked text" in place of
"the definition's text is the toolchain's output". This is question 8.

The `toString` row is a defect in today's `ss_isSs`, which reads `String(v._definition)` (core.ojs:128-137). The gate
must read `Function.prototype.toString.call`. That read still trusts the realm's intrinsics. A `Proxy` gives
`function ProxyObject() { [native code] }`, and a bound function gives `[native code]`. Neither carries the marker,
so both are another language (`out/forge2.txt`).

**Cascade.** When `@b` falls to another language, `@a` falls too. `@a` was compiled with a plain input for `k`,
and the gate's recompile now wants `ss_cross`. That is sound, but it has a cost: one bad module demotes every module
that imports from it, transitively, until those modules are recompiled.

**A compiler change demotes everything compiled before it.** The gate compares text. A change to the toolchain's
output, harmless or not, makes every earlier-compiled module another language until it is recompiled. The
tightened-rule row is that effect used on purpose.

### Text matching in decompile and recompile

Under this design the gate passes only when D = compile(decompile(D)), and compile(S) is checked. So decompile's text
handling cannot change what is trusted. A wrong decompile gives an S whose compile is not D, and the module becomes
another language. Compile, `commentTypes` and the checker stay in the trusted base: if compile emits code that does
not mean S, the gate accepts it.

| site | what | in the trusted base? |
|---|---|---|
| ss-toolchain.ts:360, 387 | the `ss^` header found by `startsWith` on an acorn comment, parsed with `JSON.parse(slice(3))` | no (decompile) |
| ss-toolchain.ts:411, 418-421 | `ss<`, `ss:`, `ss>` by `startsWith` on acorn comments; text spliced by offsets | no (decompile) |
| ss-toolchain.ts:38, comment-types.ts:74 | `unkeep` / `unesc` regex | no (decompile) |
| gate.ts `moduleTexts`, core.ojs:138-160 | rename at `declaredNameAt`, by offsets | no (decompile side) |
| ss-toolchain.ts:194-203, 233 | `keyOfVariable` / `variableName` / `isDuplicateKey` regexes on variable names | no: names are compared on both sides |
| comment-types.ts:82-95 `langOf` | marker regex on the first comment | no: it only selects which variables are gated; a missed marker makes a JavaScript variable |
| ss-toolchain.ts:30, comment-types.ts:99 | `includes` refusing reserved text in source | **yes**: compile; if it misses, source text could forge a comment boundary. Both refuse rather than accept. |
| comment-types.ts:73 `esc` | regex escaping `*/` inside a type comment | **yes**: compile; an escape miss would end a comment early and turn type text into code |
| ss-toolchain.ts:48 `keepJsx` | regex replacing each `/*ss<…*/` with the kept original, in order | **yes**: compile; it pairs originals with lowered JSX by position |
| ss-toolchain.ts:276-293 | compile slices the source by acorn offsets and wraps it in header text | yes: compile, but offsets come from the tree |

## 5. By reference: freezing and purity

`bun freeze.ts` (`out/freeze.txt`). Each producer is a cell of `@b`, compiled and run in a Runtime. "JavaScript can"
names the first write that succeeded from plain JavaScript holding the same reference. "Checked write" is an `@a`
cell that imports the value and writes it.

```
| producer | status in @b | deeply frozen at run time | JavaScript can | a checked importer's write |
| obj | ok | false | set a property | rejected member-write |
| arr | ok | false | set a property | rejected mutating-method |
| map | ok | false | set a property | rejected mutating-method |
| set | ok | false | set a property | rejected mutating-method |
| typed | ok | false | set a property | rejected member-write |
| regexp | ok | false | set a property | ok |
| fn | ok | false | set a property | rejected member-write,no-member |
| frozenMut | ok | false | set a property | rejected mutating-method |
| cloned | ok | false | set a property | rejected member-write |
| parsed | ok | false | set a property | ok |
| spread | ok | false | set a property | rejected mutating-method |
| elem | ok | true | none | ok |
| crossed | ok | true | none | ok |
| stateValue | ok | false | set a property | ok |

| a Mut returned | rejected [mut-escape] Mut m returned |
| a function closing over a Mut | rejected [mut-capture] Mut m captured by a function that escapes (not a local helper that is only called) |
| a Mut-typed result | rejected [mut-bind] mut(...) must be the initializer of a local const |

regexp shared by reference: t1 = false, t2 = true (the same call on the same value, run one after the other)
```

Findings:

1. **No value made by a checked cell is frozen at run time.** The exceptions are `Elem` and a boundary copy, which is
   deep-frozen (`crossed`). `freeze` and `mut` are identity functions (lite/runtime.ss.ts:26-27). `snapshot` is
   `structuredClone` (`tools/lang-experiment/prelude.runtime.ts`:173-176; a typed array is sliced, anything else cloned). Immutability is a static property of checked code only.
2. **Checked code cannot write a shared value, with one exception: a `RegExp`.** `re.test` / `exec` on a `g` regexp
   write `lastIndex`. The shipped checker accepts them (`checkSources` on `re`, `t1 = re.test`, `t2 = re.exec`,
   `t3 = replace` gives all ok). Two checked cells calling `re.test("a")` on one value get `false` and `true`. **This
   is a hole today, within one module**, not one this design adds. By reference, it extends across module edges.
   Proposed rule: a method that writes `lastIndex` on a value of type `RegExp` is `[mutating-method]`.
3. **A Mut cannot reach another module.** It cannot be returned, captured by an escaping function, or typed as a
   result (the three rows above). No cross-module Mut exists to rule on.
4. **JavaScript holding the reference can write any of these values.** Today the same is true within a module. An
   SoundScript-to-SoundScript input compiles to a plain input (ss-toolchain.ts:300-306 emits `ss_cross` only for a
   boundary parameter), so a JavaScript cell in `@b` already shares `@b.obj` with `@b`'s own checked cells. What
   changes is `@a`: today it gets a frozen copy and is immune, and by reference it shares the exposure. S11.6 ("a
   value changed in place by the other language and delivered again is seen") does not hold for such a write. The
   write is not a delivery, so the importer does not run again.

May each kind cross by reference? Data, functions, typed arrays, Map, Set, parsed JSON and Elem may, to checked
code: the checker refuses every write except the RegExp one. RegExp should not cross until finding 2 is ruled on.
Against JavaScript writers, the remedy measured below is a deep freeze at export (0.130 ms median for 913 nodes).
It is partial: `Object.freeze` does not stop `Map.set`, `Set.add` or typed-array element writes. A frozen `g`
regexp makes `test` throw, because `lastIndex` becomes read-only. The prototype does not freeze, and states the
exposure.

**Run-time demonstrations** (`bun demo.ts`, `out/demo.txt`):

```
(1) typed: @a.held === @b.tree: true; kids === : true; sum 3; boundary copies made: 0; errors 0
(1) today: @a.held === @b.tree: false; kids === : false; sum 3; boundary copies made: 2; errors 0
(2) @b.tree redefined: @a.held now {"kind":"root","kids":[{"kind":"leaf","v":10}]} (sum 10); the value @a held before: unchanged {"kind":"root","kids":[{"kind":"leaf","v":1},{"kind":"leaf","v":2}]}; same object as now: false
```

"boundary copies made" is `crossings.copies` from lite/boundary.ts:242. A redefined exporter makes a new value. The
importer runs again with it, and the object it held before is not changed.

### Taint across the module edge

The seed carries the export's `stateful` reason and its `fnFed` facts, so the importer's `[action-capture]` and fed
rules see them. Quoted from `out/probes-show.txt`:

```
copy rejected [action-capture] r depends on state (r is imported from @b, where r reads s), so an action using it would act on the value from the cell's last run; …
setT rejected [action-capture] t depends on state (t is imported from @b, where t takes the capability now), …
setG rejected [action-capture] g depends on state (g is imported from @b, where g is a generator), …
copy rejected [action-capture] q depends on state (q is imported from @b, where q reads r), …            (three modules)
box rejected [action-capture] a state cell holds () => number, which may be or hold a function from another language (box takes h, which is imported from @b, where h takes g, a function from another language); …
ev rejected [action-capture] an events cell yields () => number, which may be or hold a function from another language (ev takes h, which is imported from @b, where h takes g, a function from another language); …
box rejected [action-capture] a state cell holds { f: () => number }, … (box takes h2, which is imported from @b, where h2 takes h, which is imported from @c, where h takes g, a function from another language); …
```

These are the S11.9 routes: a value from another language (`taint-js-value`), a foreign function reaching a state
cell, an events cell or an action through one import and through two (`fed-*`). Pure data and pure functions stay
untainted (`taint-pure-data` and `taint-pure-fn` are ok).

One wording defect: in `taint-js-value` the reason reads "where r reads raw", which drops "a cell in another
language". The shipped message for that case is md-taint.ss.ts:19. The seed should carry it.

### The checks as dataflow

`demo.ts` (3) defines the check as variables of a Runtime: `graph` over the module sources, then `check_b` over
`graph` and `src_b`, then `check_a` over `graph`, `src_a` and `check_b`. Each `check_*` is one `tiStep`.

```
(3) first check: @a twice ok; runs {"graph":1,"check_b":1,"check_a":1}
    @b redefined (n: string): @a twice rejected [type] string used as a number; @a's exports: [["twice",null]]; runs {"graph":2,"check_b":2,"check_a":2}
    @a redefined (k + k): @a twice ok; runs {"graph":3,"check_b":3,"check_a":3}
```

Editing the exporter re-checks and rejects the importer through ordinary dataflow, with no scheduler. Limit:
redefining `@a` also re-ran `check_b`, because `graph` depends on every source and the Runtime does not stop on an
equal value. One head variable per module, with `graph` built from the heads, would not fix that on its own. It
needs either a graph that is recomputed only when an import list changes, or one graph variable per module over the
heads of the modules it reaches.

## 6. State, Events, actions, listeners and Mut: the second step

In the prototype all of these stay on today's path, which is sound because it is the shipped path. A state *value*
needs an annotation and is a boundary copy (`handle-state-value`, `-annotated`). `viewof x` is taken as `State` by
`viewRef` (S11.7). An imported action, an events cell, or a function whose type holds an action cannot be taken
(`handle-action`, `handle-events`, `handle-fn-holds-action`: `[boundary-unannotated]` / `[boundary-type]`).

Cases that look easy:

- **The value of a state cell** of another module, as data. Seed it with `stateful` = "reads state", as an in-module
  reader of a state cell is tainted. `[action-capture]` then applies across the edge by the same route as
  `taint-state-reader`. That removes the annotation and the copy.
- **Mut.** Nothing to rule: no Mut can be exported (section 5, finding 3).
- **An events cell read by a listener in another module**, by reference, *if* listener order across modules is fixed
  first. Today the spec lists it as not specified (spec.ojs "Not specified": "ordered by module name and then by
  place").

Cases that need a ruling:

1. **Who may write a `State` exported by another module?** (a) Only actions of the home module. The importer reads
   with `read` and calls the home module's actions. (b) Any checked module, as S11.7 allows today through
   `viewof x`. Under (b) an action's write set spans modules, and the in-module rules that reason about which
   actions write which state (section 6) would need the other module's actions. (a) is a smaller step and does not
   loosen today's rule. (b) is what S11.7 already permits for `viewof` imports.
2. **May an action of B capture an action of A?** In-module, one action calling another is a nested action that
   commits with the outer one. Across modules this raises three questions: the commit unit when A is edited during
   B's action; whether A's action is still "the same function" after A is recompiled (the spec's not-specified item
   on an `Action` held in a state cell after its cell is edited); and whether A's taint (which state A reads) must
   be visible to B's check.
3. **A function whose value holds an action** (`mk` in `handle-fn-holds-action`). It crosses as a function but acts
   as an action. Exporting it needs the same ruling as 2, and a kind test on the type (`TI_HANDLES` reaches
   `Action` inside a function type today).
4. **`Borrowed` and `StateCell` values**: excluded by `TI_HANDLES`, not probed further.
5. **An `Elem` holding an action.** `forge2.ts` checks the indirect routes. An action in an alias, in a record of an
   alias, in an interface and in an inferred record is kind `handle`, and stays on today's path. An `Elem` whose
   `onClick` is `@b`'s action is kind `value` and is **seeded**: `@a` takes `btn` by reference. To checked code an
   `Elem` is opaque (`elem-action.ts`, `out/elem-action.txt`: `btn.props` and `btn.onClick` are `[no-member]`). `@a` can only place it,
   as `<div>{btn}</div>`, which is ok. So `@a` cannot call the action, but a click on the placed element runs `@b`'s
   action. In one module, another cell can place an `Elem` in the same way today. Placing one DOM node twice moves it.
   Whether this counts as "an action crossing" needs a ruling (ruling 2). Until then the sound choice is to give
   `Elem` kind `handle`, which costs one name in `TI_HANDLES`. The prototype has not made that change.

## 7. Measurements

`bun measure.ts`, `out/measure.txt`, 2026-11-22, 00:32 CET. The block below is that file, condensed: labels
shortened, and the battery and load line, printed before every figure and the same each time, given once.

```
[Now drawing from 'AC Power'; load 5.03 7.89 10.49]
three modules (@c types and data, @b two cells, @a one cell)
  today, three checks:                 min 1.737 median 2.353 max 6.323 (n=15) ms
  one program (ti):                    min 1.851 median 2.116 max 4.601 (n=15) ms
importer of the typed acorn trees (lite/acorn/acorn-types.ss.ts, 326 lines)
  today, the importer alone (Parse declared again):  min 8.835 median 12.333 max 15.737 (n=7) ms
  the producer alone:                                min 9.845 median 11.208 max 13.954 (n=7) ms
  one program, producer and importer (ti):           min 18.234 median 20.650 max 25.116 (n=7) ms
one tree, 913 nodes (lite/infer/md-cell.ss.ts)
  today ss_cross, one parameter, new equal tree each time: min 0.735 median 0.868 max 3.645 (n=200) ms
  today ss_cross, fresh key, no compare with last copy:    min 0.400 median 0.435 max 2.004 (n=200) ms
  deep freeze of a fresh tree:                              min 0.109 median 0.130 max 0.566 (n=200) ms
  by reference:                                             median 0.000 (n=200) ms
end to end in a Runtime: raw redefined, @user.count awaited
  typed (one crossing, JS raw into @acorn.tree):  min 0.871 median 1.049 max 5.478 (n=60) ms
  today (two crossings):                          min 1.923 median 2.079 max 3.418 (n=60) ms
```

An earlier run, 2026-11-22 about 00:30 under load 5.95 8.97 11.14 and not kept in `out/`, gave these medians: cross
with one parameter 1.117, freeze 0.151, Runtime 1.362 typed and 2.731 today. The load was high in both runs, so treat the absolute figures as upper
bounds. The ratios held: the edge costs one copy-and-check per delivery today (about 0.4-0.9 ms for 913 nodes,
matching the brief's "copy+validate, about 0.5 ms"), and nothing by reference. In the Runtime the remaining 1 ms is the crossing from the
JavaScript `raw` into `@acorn`, which the design keeps.

Check time is unchanged for three small modules. For the acorn types, the program check (20.7 ms) is about the sum
of producer and importer checked alone (11.2 + 12.3). The types are no longer parsed a second time, but each module
still builds its own Registry. The repeated work of re-declaring the types is not visible at this size.

## 8. Spec impact (proposals; the statement prose is the owner's)

- **S11.1**: exclude from "another language" an import of a cell of a SoundScript module (new S11.12), unless the
  edge lies on a module cycle.
- **New S11.12**: a module is SoundScript when its marked variables decompile, check as part of the program, and
  recompile to exactly the running variables (names, inputs, text, read with `Function.prototype.toString`).
  Otherwise all its variables are another language. As worded, this is the text-only gate that section 4 shows
  fooled by a closure and by a redefined runtime input. It needs remedy (a) or (b) added before it can carry
  soundness (question 8).
- **New S11.13**: a parameter naming an import of a running export of a SoundScript module takes the export's type
  (S2.3 applies to an annotation). The value is the exporter's value, not a copy. The export's taint and fed facts
  come with it.
- **New S11.14**: an import edge on a cycle of module imports is a cell in another language (S11.1-S11.11).
- **New S11.15**: only value exports are typed. State cells, events cells, and cells whose type holds a handle or an
  action stay under S11.7 and S11.2. This holds until the owner rules on section 6.
- **S1.3**: `import type {T} from "@b"` names the type `T` that `@b` declares. `import type {T as U}` is
  `[unsupported]` ("a renamed type import").
- **S2.1**: add the import-clash case to the names a parameter may refer to.
- **S8**: a rejected or blocked export blocks its importer, as an in-module input does.
- **S9**: no change. Foreign declarations are not involved.
- **S1.9**: unchanged for cells. Module cycles are covered by S11.14.
- **New rule ids**, each with its reject row:
  - `[import-clash]`: "x is imported from @b and is also a cell of this module"; "type P of @b has the name of a type
    of this module"; "type P is declared by @b and @c".
  - `[import-unknown]`: "@b has no cell q"; "@b has no type Q".
  - `[unsupported]` reason: "import type { P as Q }: a renamed type import".
- **Proposed tightening, separate from imports**: `RegExp` methods that write `lastIndex` are `[mutating-method]`
  (section 5, finding 2).
- **Not specified, new item**: a JavaScript write to a value exported by reference is not a delivery (S11.6 does not
  apply).

## 9. Integration cost and order

These are estimates from the prototype's sizes, and none of these steps was carried out.

1. **Toolchain, about 20 lines** (ss-toolchain.ts). Compile `import type` as a type-cell-shaped variable (`compile.ts`
   is 19 lines). The gate passes a module holding `import type` with no change to
   `keyOfVariable` (`forge2.ts`: `@a` with `import type { P } from "@c"`, variables `$ss$import$P,f`, both modules
   SoundScript, `@a.f` = 2).
2. **`core.ojs`, about 60 lines.** `ss_outside` carries `from` and `imported` for each import, read from
   `_definition === identity`. `ss_isSs` reads `Function.prototype.toString.call` (a defect fix that is needed
   anyway). The gate (`gate.ts`, 72) replaces the unread `ss_roundtrip`. It is text-only, so remedy (a) or (b) of section 4
   comes with it: about 20 lines for (a) (redefine each checked variable from its recompiled text, and the runtime
   inputs from the toolchain), more for (b), whose loader change is not sized. One check variable per module, as in
   `demo.ts` (3).
3. **md cells, about 270 lines of new cells** (`ti-module.ss.ts` 96, `ti-program.ss.ts` 177). They go in as a new
   section, and `mdCheckSources` stays. The glue in `ti-link.ts` (`programGlue`: one Registry per module,
   transplanted Decls) goes into `core.ts`, about 40 lines.
4. **Build**, about 5 lines: a group in `ts-cells.ts` `SS_GROUPS`.
5. **Recompile** every notebook whose SoundScript module imports from another SoundScript module. Its compiled
   cells use `ss_cross` today, and the gate will demote them until they are recompiled.

That is about 420 lines, mostly cells, with (a). The large part is the program check. A smaller first step gets most of the
value for the acorn case:

- **Types only.** Steps 1 and 4 plus `tiTypeUses` / `tiClosure` (about 60 lines of cells) and the Decl transplant.
  `import type {Parse} from "@tomlarkworthy/soundscript-acorn"` then works, with no re-declared types. Values still
  cross through `ss_cross` at 0.4-0.9 ms per tree. It needs no gate, because no value is trusted across the edge.
- **By-reference values are not sound without the gate, and the text-only gate is not enough** (section 4,
  `forge2.ts`). The control column in section 4 is fooled by every forge.

## 10. Dead ends

- `return mut(...)` from `tiTables`: refused by `[mut-escape]`. The caller now wraps the plain tables in
  `mut({ ...t })`.
- Closures over the program's `Mut` maps in `tiCheckProgram`: refused by `[mut-capture]`. They were replaced by
  `let` maps rebuilt each step, then by `TiKnown` passed between `tiStep` calls.
- Intersection types, `Array.flat`, `as` and `!` in the ti cells: all refused. The cells were rewritten without
  them.
- An early tightened-rule forge used `Math.random`. It did not depend on `syntaxBans`, so the loosened checker
  rejected it too, and the forge showed nothing. It was replaced by `!` (`[no-non-null]`), which the loosened
  variant accepts (`ok`) and the present checker rejects.
- The first delivery measurement cut a source file mid-token. `acornParse` returned a SyntaxError value, and `cross`
  timed 0.002 ms on the error record. The second run used a whole file (913 nodes).

## 11. Questions for the owner

1. Section 6, ruling 1: may a module other than its home write an exported `State`?
2. Section 6, ruling 2: may an action capture an action of another module, and what is the commit unit?
3. Should `RegExp` `lastIndex` writes be rejected (section 5, finding 2)? This is a hole today within one module.
4. JavaScript writers of an exported value: accept the exposure (as within a module today), deep-freeze at export
   (partial for Map, Set and typed arrays; about 0.13 ms per 913 nodes), or copy at export?
5. Type identity by name, with a clash falling back to the boundary, or namespaced types?
6. Should a module cycle stay on the boundary path (proposed S11.14), or be a module-level error?
7. A toolchain output change demotes every module compiled earlier. Is that acceptable, or should the gate compare
   against the toolchain version recorded in the header?
8. The gate compares text, so a closure or a redefined runtime input passes it (section 4). Install what was
   checked (a), or keep the identity of what the toolchain evaluated (b)?
