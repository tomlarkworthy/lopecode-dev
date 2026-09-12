# exporter-4: copying a notebook-kit runtime without reshaping it

Research plan, written 2026-09-12 in the worktree `.claude/worktrees/exporter-4-research`
(branch `worktree-exporter-4-research`). Nothing here is implemented yet. The two measurement
records it rests on are `plan/exporter-4/wire-and-runtime-shapes-2026-09-11.md` and
`plan/exporter-4/utility-survey-2026-09-11.md`; raw artifacts are in
`tools/newobs-fixtures/wire-2026-09-11/`.

## Why not just extend exporter-3

On 2026-09-11 I made exporter-3 export from observablehq.com by translating notebook-kit shapes back
to classic ones: `viewof$x` → `viewof x`, the 4-variable mutable → the legacy triple, `cell N` → a
null name, import cells → `module X` loaders. It works — the export boots in lopecode with the same
128/132 tests as a classic export, and an old.observablehq.com A/B was byte-identical outside
exporter-3's own block. It is kept at `tools/newobs-replica/exporter3-overrides.ojs` (14 cells).

Tom's objection, 2026-09-11: *"We should avoid altering the shape of variables e.g. viewof$x ->
viewof x because that is NOT the reality we are copying. If variables are now called 'cell N' we
should embrace that and also call them cell N so we have equivalence."* The exporter lineage has
moved special handling out of the cell layer and into the networking script at each version, and
translation moves it back.

So the target is: the exported file's runtime graph equals the runtime graph we copied — same
variable names, same inputs, same modules — and whatever normalization is needed happens in the
loader.

## The obstacle, stated precisely

A notebook-kit runtime variable's definition is one of two things, and only one of them is portable.

**Cell bodies are portable.** They arrive over the wire as source and are `eval`'d in the iframe:

```json
{"id":39,"mode":"ojs","inputs":["Inputs"],"output":"viewof$view","autoview":true,
 "body":"function viewof$view(Inputs){return(\nInputs.input()\n)}"}
```

**Glue is not.** The runtime also holds definitions the platform generated, which close over
identifiers inside the minified page bundle. From `runtime-dump-notebookkit.json`: projections
`e=>e[t]`, import identity `function u(e){return e}`, the viewof value extractor `function Br(e){…}`
(free `I`, `Hr`, `Vr`), the Mutator `Jr` (free `qr`), and `([e])=>e`. Classic has its own set
(`Aa`, `Cr`, `Na`, `Sa`). `toString()` on any of these produces source that cannot be re-evaluated
outside that bundle.

exporter-3 serializes every definition with `toString()`. That is exactly why it needed to rewrite
`viewof$x`'s value cell to `(G, _) => G.input(_)`: not to rename anything, but because the real
definition is unserializable. **The rename and the glue problem are the same problem.** Any design
that keeps the runtime's own names must still answer: where does the glue come from on load?

## Three ways to answer that, with costs

**A. Translate to classic shapes** (what the exporter-3 prototype does). Glue is replaced with the
legacy equivalents, and names follow. Cost: the exported notebook is not the notebook that ran;
`cell 42`, `viewof$q` and multi-output holders have no representation, so a notebook-kit notebook
that a user then edits in lopecode has different names than on Observable. Rejected as the
direction; keep as a fallback if B and C both fail.

**B. Serialize Definitions, rebuild with notebook-kit's `define()`.** The export stores the wire
Definition (`{id, body, inputs, outputs, output, autoview, automutable, mode}`) per cell, and the
exported file ships notebook-kit's `define()`, which reconstructs the same variables and the same
glue. Closest to "how the notebook came off the wire". Cost: requires inverting runtime state back
into Definitions (the runtime does not keep them); ties lopecode to notebook-kit's `define()`
semantics, including the `display`/`view` shadow variables; and the exported file must carry the
notebook-kit runtime.

**C. Copy variables verbatim, substitute glue from a catalogue.** Keep exporter-3's architecture —
one line per variable, `$def(pid, name, inputs, fn)` — with the runtime's own names (`cell 42`,
`viewof$view`, `mutable$q`). For each *glue* definition emit a portable equivalent by class:
`e=>e[t]` → `(exports) => exports["dep"]`, the import identity → `(x) => x`, the viewof extractor →
the notebook-kit `input` generator, the Mutator → notebook-kit's `Mutator`. The catalogue is small
and each entry is recoverable from the variable's own shape. Cost: the catalogue tracks Observable's
bundle; a new glue shape appearing unrecognised must fail loudly, not silently serialize
`function Br(e)`.

B and C both need the notebook-kit stdlib available in the exported file (`Mutator`, `input`, its
`Mutable`, its `FileAttachment`), and both need the networking script to resolve notebook-kit import
URLs. They differ in whether lopecode stores *cells* or *variables*. Lopecode's format is variables
("Runtime-as-the-source-of-truth"), so C is the smaller change and my current recommendation, with
B as the fallback if the glue catalogue turns out not to be closed. E1 and E2 decide it.

## What is already known (do not re-derive)

- Both platforms ship **source** to the browser and compile in the page. There is no precompiled
  module for the viewed notebook on either platform.
- `/api/import/<slug>` is a **third** format, distinct from both the viewed runtime and the classic
  compile: spaced legacy names, notebook-kit function names, `mutator X`, `cell <node id>`,
  per-module `view` and `FileAttachment` builtins, md and html cells dropped.
- `cell N` is the Observable **node id**, so it is stable across document edits. `persistentId`
  therefore does not churn (this corrects the survey's initial guess).
- Notebook-kit imports are **unpinned**: no `?v=`, no resolutions. Classic pins through
  `document/<id>/imports`. Version identity is lost on the new platform unless the path form
  (`…/dependancy@20`) is used.
- After an import cell runs, `_outputs` is empty; the output list survives only in its body text.
- `main.variable(true)` on import outputs means the imported graph is fully observed.
- **An import cell *is* a multi-output cell.** `define.ts:45` sets `vid = output ?? (outputs.length ?
  `cell ${id}` : null)`, and the wire Definition for the fixture's import is
  `{id: 64, inputs: ["@variable"], outputs: [13 names], output: undefined}` — the same holder +
  projection mechanism as any multi-declaration cell. Measured 2026-09-12 from `new3-update-msg.json`.
- **It therefore has two different runtime shapes depending on whether it has run** (measured, same
  source). Before: 13 projections `(exports) => exports[o]` each with `_inputs = [cell 64]`, same
  module — structurally groupable. After: each is rewired to the remote variable (`dep` ← `dep@M6`)
  with identity glue `function u(e){return e}`, and the edge to `cell 64` is gone. **The pre-run state
  is transient, not a lazy steady state** — `define.ts:91` defines every output as
  `main.variable(true)`, i.e. observed, so a viewed notebook's import always runs (the capture agrees:
  `obs Boolean` on all 13 outputs). Correcting an earlier draft of this line, which claimed an
  unobserved import rests in the pre-run shape. Grouping still has to handle both, because the
  pre-run shape is what a probe sees if it reads the runtime before the import settles.
- Discovery is the load-bearing break for every utility: a module imported by a `cell N` import cell
  is invisible to `modules`, module-map, exporter-3 and pairing.

Three things are further along than the survey implied (measured 2026-09-12, `quick_start.html`):

- **notebook-kit CSS is already vendored corpus-wide** — 240 of 241 notebooks carry the stylesheets
  from notebook-kit commit `6c2ec69e1ac30dd329789524a849578b2df17945`, fetched by
  `@tomlarkworthy/themes` (`baseURL`, L217) for their CSS custom properties. This is theming only,
  **not** a render path — do not read it as more than it is. It does explain the `--syntax_*` churn
  seen in the phase-2 round-trip: `themes` L379 records that notebook-kit omits `--syntax-normal`.
- **Several support modules already branch on notebook-kit**, confirming the survey's class-**a**
  rows from the other direction: `fileattachments` L190 ("runtime-level builtin keyed by resolved
  href") and L211 ("memoises unknown names, so the probe must not WRITE to the registry"),
  `runtime-sdk` L597 (`viewof$x`), `cell-map` L798, `inspector` L33 ("notebook-kit's stdlib does not
  have one").
- **Two runtime versions already ship and run in one file** — see E3, which this falsifies in part.

## Experiments

Each names what it decides. E0 first; E1 and E2 decide the design; the rest can run in parallel once
E0 exists.

**E0. Equivalence harness (prerequisite).** Define a *runtime fingerprint*: per module, the multiset
of `(name, type, input names, observed?, glue-class-or-body-hash)`, plus module names and builtin
names. Implement as a single eval that runs against any runtime: the notebook-kit replica, a live
Observable page, and a booted lopecode file. Success: the fingerprint of the notebook-kit replica of
notebook-semantics is reproducible run to run, and differs from the classic fingerprint in exactly
the ways the wire record lists. Every later experiment reports fingerprint equality or a diff.
Reuses `tools/newobs-replica.ts` and `tools/newobs-replica-build.ts`.

**E1. Is the glue catalogue closed?** Across a sample of notebooks (notebook-semantics, exporter-3,
lopepage, editor-5, svg-lens — chosen for viewof/mutable/import/multi-output density), enumerate
every distinct definition in every module of the live runtime and classify: body (the source arrived
over the wire) or glue. For glue, count distinct shapes and check each is recoverable from variable
structure alone. Decides C. Success: a fixed catalogue covers 100% of glue in the sample, and an
unrecognised shape is detectable (so the exporter can refuse rather than emit a broken definition).
Failure signal: glue whose behaviour depends on closure state not present in the variable graph.

**Measured lower bound, 2026-09-12** (notebook-semantics only, from the `def:` capture in
`vars-both.txt`, truncated at 300 chars by `probe.ts:181`). Of 54 variables in the viewed module:
27 cell bodies, 25 self-contained glue, **2 bundle-internal glue**, 1 import cell. Only
`function Br(e){return I(t=>{let n=Hr(e)…` (viewof input generator; free `I`/`Hr`/`Vr`) and
`function Jr(e){let t=qr(e)…` (Mutator; free `qr`) cannot be serialized. The rest —
`function u(e){return e}` ×21, `()=>e`, `([e])=>e`, `([,e])=>e` — are self-contained and copy
verbatim as text. Those two map onto two stdlib primitives (`input`, `Mutable`), so under C the
export needs **two functions**, not notebook-kit's runtime.

The classic side of the same capture shows **0** bundle-internal glue, because exporter-3 already
substitutes for `Cr` (×12) and the 11 import stubs. **C is not a new architecture** — it extends a
mechanism exporter-3 already runs for classic to two more shapes. This is one fixture, so it is a
lower bound; the sample above is still what closes E1. The projection glue `(exports) => exports[o]`
is a third catalogue entry not exercised here — it closes over `o`, but the variable's own `_name`
*is* `o`, so it reconstructs from the name.

**E2. Can Definitions be inverted from runtime state?** Rebuild `{id, body, inputs, outputs, output,
autoview, automutable}` from the runtime, re-run through vendored notebook-kit `define()` (2.5.6) in
a fresh runtime, and compare fingerprints with the original. Decides B. Success: fingerprint-equal
for every fixture cell type, including the import cell and multi-output holders.

**E3. Can one runtime host both dialects?** A lopecode HTML with the notebook-kit stdlib available
and existing legacy modules (runtime-sdk, lopepage, editor-5, testing) running alongside a
notebook-kit-shaped module. Which builtins collide: `Mutable` (legacy box vs bare generator),
`Generators`, `FileAttachment` (per-module vs runtime-level), `view`/`display`, and the
`stdlib:"1"` swap where the viewed notebook's `md`/`html`/`require` come from `@observablehq/stdlib@5`
on jsdelivr. Test both arrangements: legacy builtins at runtime level with per-module notebook-kit
builtins, and the reverse. Decides the bootloader.

**E3's premise is already partly falsified, measured 2026-09-12 against
`lopecode/notebooks/quick_start.html`.** A lopecode notebook carries two Observable runtime
*versions* at once, and both are live: `@tomlarkworthy/observable-runtime` ("v5", unzipping
`runtime.js.gz`) and `@tomlarkworthy/observable-runtime-v6` ("v6", its own `_source_gz`).
`observablejs-toolchain` imports `Runtime`/`Inspector`/`Library`/`RuntimeError` from v5
(L3301-3304); `exporter-3` (L2394) and `modules` (L419) import `Runtime` from v6. There are
`new Runtime()` call sites on both paths — exporter-3 L668/L1631/L2045, modules L285/L320/L358,
flow-queue L169, view L1198/L1446, visualizer L96.

So "can two runtimes coexist in one file" is answered: yes, and they already do. **The qualifier is
load-bearing.** Every one of those is a *secondary* runtime — a compile sandbox or a module probe —
while the page's own graph is the single `new Runtime({__ojs_runtime…})` at `main:22`. The
precedent is multiple runtime *instances*, not two dialects sharing one main graph. E3's real
question is narrower than written: can notebook-kit's `define()` and stdlib populate a module inside
the *main* runtime without colliding with the legacy builtins already installed there.

Cost, measured 2026-09-12: an esbuild bundle of the notebook-kit runtime is 851,901 bytes raw,
224,849 gzipped. The legacy runtime lopecode already ships is `observable-runtime/runtime.js.gz` at
37,193 bytes of gzip (49,594 stored as base64). Notebook-kit is **6.0x** the runtime weight lopecode
currently pays. For scale, the largest module block in that file is `@tomlarkworthy/bootloader` at
332,877 bytes. Trimming the bundle to `define` plus the needed stdlib is part of this experiment.

**E4. Networking normalization.** The import cell copied verbatim calls
`import(new URL("/api/import/@tomlarkworthy/dependancy", document.baseURI))`. In a `file://` export
`document.baseURI` is the file itself, so the specifier becomes `file:///api/import/@…`
(**inference — verify first**). Extend `normalize` to cover: `/api/import/<slug>`, the absolute
`observablehq.com` form, the path-pinned `<slug>@<version>`, relative `./x` and `../@u/x` inside
hybrid modules, and `npm:`/`jsr:`/`observable:`. Success: a unit test over every specifier form in
`tools/newobs-fixtures/wire-2026-09-11/`, plus an offline load of an exported notebook-kit notebook
making zero requests to observablehq.com.

**E5. Module discovery and naming without `module X` variables.** Add structural import detection to
`@tomlarkworthy/modules` (the cell-map probe pattern plus specifier naming) and compare its output
with classic naming for the same notebook. Open question it must answer: what name to use when the
only identity is an unpinned slug, given classic names some modules `d/<id>@<version>`.

**E6. Variables → cells. Partly done — the inverse exists and was validated 2026-09-12.** Both E2's
inverter and cell-map's grouping are the same function: from a runtime, recover the authored cells.

Grouping by reflection alone — no source, no document — reproduced the document exactly:

| module | variables | recovered cells | ground truth |
|---|---|---|---|
| M5 (viewed, notebook-kit) | 54 | **30** | 30 nodes (`doc-semantics.json`) |
| M6 (imported, `/api/import` hybrid) | 11 | **4** | 5 nodes, 1 md — and `/api/import` drops md |

The recovered multi-variable groups were the right ones: `viewof$view` ← {`viewof$view`, `view`};
`mutable q` ← {`mutable q`, `cell 42`, `mutable$q`, `q`}; and in the hybrid module
`initial mutabledep` ← {`initial mutabledep`, `mutator mutabledep`, `mutable mutabledep`,
`mutabledep`}. **One algorithm handled both dialects with no branching** — which is the result that
matters for cell-map: it must stop reading names and start reading definitions.

The rule, in four lines:
1. Definition not in the glue catalogue ⇒ cell root (bodies are self-contained).
2. Identity glue whose single input is `X@builtin` ⇒ builtin bridge, not a cell.
3. Any other glue ⇒ union with its first non-builtin, same-module input.
4. The holder name `cell 42` is the document node id, so each group arrives already addressable.

**The two remaining gaps are the critical ones, because notebook-kit produces them constantly.**

- **Multi-output.** `transpile.ts:103` sets `outputs = cell.declarations.map(r => r.name)` and
  `:110` appends `return {a, b};`, so *every top-level declaration* becomes an output. Ordinary
  `const a = …, b = …` JS yields a holder plus projections; only single-assignment `x = …` takes the
  `output` path (23 of the fixture's 30 inserts). `define.ts:91` emits each as
  `main.variable(true).define(o, [vid], (exports) => exports[o])` — **observed**, and the edge to the
  holder is intact, so rule 3 already covers it. Untested: the fixture's only multi-output cell is
  its import. Needs a fixture with a non-import multi-output cell.
- **Multi-import.** Two import cells in one module cannot be told apart by runtime edges once they
  have run. They can be told apart by the cell's own body: `imports/observable.ts:37-45` emits one
  `outputs.get("<local>")?.import("<imported>", …, module);` line per specifier, so each import cell
  enumerates its own outputs *and* their alias mapping in its body text. That is a targeted parse of
  one function, not a notebook decompile — it stays inside the runtime-data-only constraint.

Success: a fixture with ≥2 import cells against one module, plus non-import multi-output cells,
groups exactly on both platforms and in both the pre-run and post-run import states.

**Both gaps are now closed, measured 2026-09-12.** `@tomlarkworthy/notebook-kit-semantics` was
authored locally as an Observable document (`tools/newobs-fixtures/documents/`), compiled by
vendored notebook-kit and run in the replica with no hosted notebook involved — `KEEP_JS=1` keeps
explicitly-authored `js` cells in the 2.0 dialect, which `newobs-replica-build.ts` otherwise remaps
to `ojs`. The run is fully offline (`OFFLINE=1`, `cache @tomlarkworthy/dependancy`), 20 cells
defined, 0 failed, empty error log.

| module | variables | recovered cells | ground truth |
|---|---|---|---|
| M1 (viewed, both dialects) | 45 | **20** | 20 document nodes |
| M2 (imported, `/api/import` hybrid) | 11 | **4** | 5 nodes, 1 md — hybrid drops md |

- **Multi-import**: three import cells against one module stayed distinct — `cell 41 <= dep`,
  `cell 42 <= dep2, viewdep, viewof$viewdep`, `cell 43 <= mutabledep, mutable$mutabledep`. Note
  `dep` and `dep2` both read `dep@M2`, so edges alone cannot separate them; only each import cell's
  own body enumeration can.
- **Multi-output**: `cell 11 <= a, b`; `cell 12 <= p, r`; `cell 13 <= m` (one declaration still
  yields holder + projection); `cell 14 <= one, two, three`; `cell 32 <= fromOjs` (a js cell reading
  an ojs one).
- **Two shapes had to be added to the rules**, both found by the fixture: the display/view shadow
  variables `define.ts:47-70` creates for the `view()` idiom (unnamed, `_type` 2) and the injected
  `@variable`. Counted as cells they inflate the total; they are not cells.

The glue catalogue, enumerated empirically. It is **bundle-dependent**, which is the E1 risk made
concrete: the replica's unminified build and live Observable share no glue spelling.

| role | replica (unminified) | live (minified) | hybrid (`/api/import`) |
|---|---|---|---|
| projection | `(exports) => exports[o2]` | `e=>e[t]` | — |
| import identity | `function identity(x){return x;}` | `function u(e){return e}` | — |
| autoview value | `function input(element2){…}` | `function Br(e){…}` | `(G, _) => G.input(_)` |
| automutable holder | `function Mutator(value){…}` | `function Jr(e){…}` | `(M, _) => …` |
| mutable accessors | `([mutable]) => mutable`, `([, mutator]) => mutator` | `([e])=>e`, `([,e])=>e` | `([m]) => m`, `([, m]) => m` |

Consequence for the implementation: match the **short** glue structurally (it ports across bundles),
but recognise the two **long** functions — autoview value and automutable holder — by the name
relation `define.ts:78,81-87` guarantees (`X` ← `viewof$X`/`viewof X`; `cell N` ← `mutable …`)
rather than by source text, which would pin the code to one build. A name-relation-only approach was
tried first and **failed**: it merged a js holder into its data dependency, and merged all three
import cells together because import cells are also named `cell N`.

Harness: `tools/newobs-replica/eval-nk-semantics.js` (capture) and
`tools/newobs-replica/group-cells.ts` (grouping + ground-truth comparison).

**Generalised to a real notebook, 2026-09-12.** A purpose-built fixture is the easiest way to fool
yourself, so the same rules were run against the `@tomlarkworthy/exporter-3` replica — 104 cells, 18
modules in the graph, ~26 imports, every imported module arriving as `/api/import` hybrid.

| corpus | module | variables | recovered | ground truth |
|---|---|---|---|---|
| exporter-3 (real, all-ojs) | M1 | 156 | **104** | 104 nodes |
| notebook-kit-semantics (dual-dialect) | M1 | 45 | **20** | 20 nodes |
| notebook-kit-semantics (hybrid import) | M2 | 11 | **4** | 4 js nodes |

For exporter-3 the breakdown matches term by term: 69 named cells matching **exactly** by name, 13
`cell N` roots against 13 import nodes, 22 anonymous against 22 truly anonymous. No UNRESOLVED in any
of the 18 modules, and the glue catalogue across all of them is still the six shapes above.

Identifying which module held the document's cells had to be done by evidence, not by eye: M1 shows
100% name overlap with the document while every other module shows ≤1%. Reading the `$` spelling
instead pointed at the wrong module (M13 has two `$` names and is not the viewed notebook).

**Three categories of variable are not cells**, all three found by measurement:
`_type` 2 display/view shadows (`define.ts:47-70`), `@`-prefixed injections like `@variable`, and
`dynamic …` observation variables. The last one cost exporter-3 an off-by-one (105 vs 104) and is a
rediscovery — legacy cell-map already skips `dynamic ` (`cell-map.js:293`).

A caveat on the negative result: "no UNRESOLVED" is weaker than it looks. That list only catches glue
which matched the catalogue but found no target, plus unattributable import outputs. Glue matching
*nothing* is silently treated as a body and becomes a spurious cell — which is exactly how the
`dynamic ` case presented. The count against ground truth, not the empty UNRESOLVED list, is what
actually caught it.

## cell-map-2 exists as a working copy, 2026-09-12

Two new modules, neither committed, published nor jumpgated — working copies plus tests only.

| file | what |
|---|---|
| `modules/@tomlarkworthy/cell-map-2.js` | the grouping, as notebook cells: `GLUE`, `notACell`, `defInfo`, `runtimeAccessors`, `groupCells`, `cellMap`, `liveCellMap`, `viewof cellMapModule`, 6 in-notebook `test_*` cells |
| `modules/@tomlarkworthy/notebook-kit-semantics.js` | the 2.0 sibling of the existing `@tomlarkworthy/notebook-semantics`; builds the fixture live through `@tomlarkworthy/notebook-kit`'s `kit` rather than shipping a dump |
| `tools/newobs-replica/cell-map-2-module.test.ts` | 10 tests against the **shipped module**, loaded via `notebook-import.ts` |
| `tools/newobs-replica/nk-semantics.test.ts` | 7 tests building the fixture against real notebook-kit 2.5.6 from `vendor/`, offline |
| `tools/newobs-replica/cell-map-2-on-live-nk.test.ts` | 7 tests running the grouping over **live** Notebook Kit variables — both modules, one runtime |
| `tools/newobs-replica/js-toolchain-vs-notebook-kit.test.ts` | 27 tests comparing the js-toolchain port against vendored notebook-kit 2.5.6 |

All four run offline with no browser and no network:

```
bun test tools/newobs-replica/cell-map-2-module.test.ts \
         tools/newobs-replica/nk-semantics.test.ts \
         tools/newobs-replica/cell-map-2-on-live-nk.test.ts \
         tools/newobs-replica/js-toolchain-vs-notebook-kit.test.ts
51 pass, 0 fail, 234 expect() across 4 files
```

That aggregate was the figure **at the time this section was written** and is now stale — the
current count is in "cell-map-2 now emits `importInfo`" below, and is stale in turn the moment a test
is added. Per-section counts are point-in-time and drift as suites grow. Re-derive it from the command rather than trusting a number written into prose — three
counts in this document went stale within a single session by exactly that route.

Spell the paths out. A brace expansion here is refused by the worktree Bash guard, which cannot tell
whether a computed argument is `git`.
| `tools/newobs-replica/probe-alias-form.ts` | the instrument described below |

The exported cell is called `cellMap`, not `cellMap2` — only the enclosing module is `cell-map-2`,
so a consumer changes the module it imports from and nothing else (Tom, 2026-09-12: "I am hoping we
have a near drop in replacement and the module does not need to change much").

`cellMap(variables?, modules?)` keeps cell-map's entry shape and returns
`Map<module, Array<{name, module, type, lang, head, variables}>>`. Differences from cell-map, each
tied to a defect read in its source: imports key on the import **cell**, not the source module
(`cell-map.js:274` sets `key = source`, collapsing every import of one module into one entry at
`:356-376` whose head is an alias variable); `type` gains `multi` for 2.0 holders, which cell-map
does not model; `lang` is derived rather than the hardcoded `["ojs"]` cell-map writes at every site;
and `@tomlarkworthy/modules` replaces `moduleMap`, used only to *name* modules — grouping never
depends on it, which is what removes the blocking wait for every module to resolve.

Measured by `bun test tools/newobs-replica/cell-map-2-module.test.ts`: exporter-3 **104/104** with
named cells matching exactly and 13 `cell N` roots against 13 import nodes; notebook-kit-semantics
**20/20** and **4/4**; three imports of one module recovering as three cells with no symbol in two of
them; zero unresolved in all 18 modules.

### The grouping inverts LIVE notebook-kit variables, 2026-09-12

Every measurement above ran against a recorded dump — a capture of a runtime that had already run.
This one does not replay anything: the fixture is built by notebook-kit 2.5.6's own `define`, and
cell-map-2's `groupCells` is then run over the resulting variables through `runtimeAccessors`. Both
modules, one runtime, no browser and no network — the headless form of the multi-home notebook.
`tools/newobs-replica/cell-map-2-on-live-nk.test.ts`: **7 pass, 0 fail, 47 expect()**.

The headline is the thesis stated as one number: **34 live variables invert to the 14 authored
document nodes**, with `cells.unresolved` absent. Specifically, and all measured rather than assumed:

- `const a = 1, b = 2` recovers as **one** cell, holder grouped with both projections, `type: "multi"`,
  `lang: ["js"]` — the shape cell-map has no model for at all.
- The automutable's **four** variables (`mutable q`, `cell 23`, `mutable$q`, `q`) collapse to one
  `mutable` cell, with the spaced and `$` spellings inside the same group. This is the case that
  justifies matching `/^(mutable|initial)[$ ]/`: both spellings are live simultaneously, so either
  alone would split the cell.
- `viewof$view` + `view` → one `viewof` cell.
- An ojs cell keeps `lang: ["ojs"]`; the 2.0 holder is what switches it to `js`.
- **Three imports of one module stay three distinct cells** (`cell 41`/`cell 42`/`cell 43`), sharing no
  variable, each holding its own symbols — `dep` in the first, `dep2` and `viewof$viewdep` in the
  second, `mutabledep` in the third. That is the cell-map defect, inverted correctly, against live
  variables rather than a capture.
- The bare expression cell (id 15) has neither `output` nor `outputs`, so its variable is unnamed and
  the grouping numbers it — one anonymous cell, as cell-map does.

Worth being precise about what this does *not* show: the three imports fail to resolve headlessly
(no importmap), so the grouping is attributing outputs whose source module never loaded. It exercises
the pre-run/unresolved path, which is the harder one; the post-run path is what the recorded corpora
cover. Both now pass.

### js-toolchain is a verified port, and it drops exactly one thing, 2026-09-12

`tools/js-toolchain/transpile.js:1` calls itself "a port of notebook-kit src/javascript/transpile.ts".
That was a claim tested only against itself — the prototype suite round-trips the port through the
port. Both implementations now run in one process over the same inputs
(`tools/newobs-replica/js-toolchain-vs-notebook-kit.test.ts`, **27 pass, 75 expect()**).

**The port is exact where it overlaps.** For the fixture's six js nodes, `body` is byte-identical to
notebook-kit 2.5.6's and `inputs`/`outputs` are equal — and `compile()`'s emitted cell names equal the
variables notebook-kit's own `define()` creates, which is exporter-4's core claim reduced to an
assertion. The three fixture shapes absent from `tools/js-toolchain/corpus.js` all round-trip:
multi-declarator single statements (`const a = 1, b = 2;` — the corpus's multi cases are separate
statements), trailing semicolons, and destructuring from a parenthesized object literal.

**The one divergence is derived metadata.** notebook-kit returns `files`, `databases` and `secrets`
(`transpile.ts:115-118`), each a `Set` built from the parse; js-toolchain returns none of them, and a
lopecode cell `{_name, _inputs, _definition}` has nowhere to put them:

```
FileAttachment("x.csv")                      -> files: ["x.csv"]
FileAttachment("one.json") + ("two.png")     -> files: ["one.json","two.png"]
DatabaseClient("mydb")                       -> databases: ["mydb"]
Secret("API_KEY")                            -> secrets: ["API_KEY"]
```

Scope of the loss, measured rather than assumed: the **body is unchanged** and the source round-trips
losslessly for all three kinds, so the invertibility invariant holds and nothing an author wrote is
lost. `rewriteFileExpressions` is imported by transpile.ts but only rewrites under `resolveFiles` (the
Vite asset path), not under a bare call. What is lost is the *manifest* — so exporter-4 must derive
attachments the way exporter-3 already does (`getFileAttachments(targetModule)`) and must not expect
the transpiler to hand them over.

A methodological note, since it nearly produced a wrong finding: `JSON.stringify(new Set([...]))` is
`{}` no matter the contents. The first probe read `{}` for every case and looked like proof the port
dropped nothing; it was an inert instrument. Spreading the sets reversed the conclusion.

### decompile cannot invert what the runtime holds, 2026-09-12

`decompile(compile(src)) === src` is the invariant the prototype suite tests, and it holds. But
editing a cell — and exporter-4 — read the **runtime**, not `compile()`'s output, and those are not
the same text. `compile.js:13` **was** (removed 2026-09-12 — see the applied fix below):

```js
const PROJECTION = /^\((\w+)\)\s*=>\s*\1\[("(?:[^"\\]|\\.)*")\]$/;
```

The subscript had to be **quoted**. notebook-kit's runtime closes over the name (`define.ts:91`), so a
live projection reads `exports[o]`. Measured against the live fixture:

```
== node 11 "const a = 1, b = 2;"
    "cell 11"  def: () => { const a = 1, b = 2; return {a,b}; }
    "a"        def: (exports) => exports[o]
    "b"        def: (exports) => exports[o]
   decompile(live)          THREW: decompile expects exactly one holder cell, got 3
   decompile(compile(src)) -> "const a = 1, b = 2;"
```

Node 15 (`1 + 1`) *does* round-trip from live — it has no projection to misparse. That control
isolates the cause to `PROJECTION` rather than to the live path in general.

This is the session's recurring pattern a fourth time, and the exact mirror of the first: `GLUE` knew
only the bare spelling and missed the compiled one; `PROJECTION` knows only the quoted spelling and
misses the runtime one. Each was written against whichever corpus its author had to hand.

**The fix is sound, and the part that looked hard is not.** The output name cannot be read out of
`exports[o]` — there is no name in that text — but it does not have to be. It is the variable's own
`_name`, and that matches the transpiler's `outputs` exactly, in order:

```
node 11  outputs ["a","b"]              variables  cell 11, a, b             -> ["a","b"]            match
node 14  outputs ["one","two","three"]  variables  cell 14, one, two, three  -> ["one","two","three"] match
node 12  outputs ["p","r"]              variables  cell 12, p, r             -> ["p","r"]            match
```

Order matters because `detranspileJavaScript` rebuilds `return {${outputs}};` and string-matches the
body's tail.

**Applied 2026-09-12 — with acorn, not a widened regex.** Tom, on the plan to widen the pattern:
*"also are we using regexes only for simple things, we have acorn if we ever need to do Javascript
parsing"* — the second time that steer has been given (the first was `tools/triage/cellwise.ts`,
2026-09-09). Widening was also the weaker option on its own merits: the subscript in `exports[o]` is
a closure variable, so the pattern would have had to recognise a shape whose key part is unreadable,
and it already carried a backreference and a string-escape class. `compile.js` now classifies
structurally via `maybeParseJavaScript` — already in its dependency graph through
`transpile.js → parse.js`, so no new acorn import site and no change to how the shipped module
obtains acorn — matching a single-parameter arrow whose body is a computed member on that same
parameter. The name comes from the string literal when there is one, else from `_name`; when neither
exists it throws rather than emitting a wrong output list. The single-input guard is retained, and
the adversarial corpus case `(exports) => exports["x"]` (corpus.js:59) stays safe because its
compiled form's arrow body is a `BlockStatement`, not a computed member.

**Measured: the gap closed further than predicted.** I expected this to fix *classification* only, on
the grounds that a live holder body must still satisfy `detranspileJavaScript`'s exact-wrapper check.
It satisfies it — precisely because js-toolchain is a verified port (above), so notebook-kit's
transpiled holder and the port's emit the same wrapper text. Every multi-output js node in the
fixture now inverts from live runtime variables, destructuring included:

```
node 11  const a = 1, b = 2;                 -> decompile(live) === source
node 12  const {p, r} = ({p: 1, r: 2});      -> decompile(live) === source
node 14  const one = 1, two = 2, three = 3;  -> decompile(live) === source
```

`js-toolchain-vs-notebook-kit.test.ts` carried these as gap pins whose comment read "they will fail
when PROJECTION is widened, which is the intended signal to update them". They duly failed and are
now inverted assertions. Suites after the change: js-toolchain roundtrip **71 pass / 0 fail** (64
before, +7 new projection-classification cases, including the bare-subscript, tight-whitespace,
non-computed, wrong-object and unnameable forms); replica suites **52 pass / 0 fail / 237 expect**.

**The published module now lags.** `@tomlarkworthy/js-toolchain` mirrors this prototype and has not
been updated, so the two are out of sync until the change is pushed — which needs the same approval
and Observable cookies as any other push.

### What actually identifies a notebook-kit import cell, 2026-09-12

Measured against the three real import bodies `transpileObservable` emits, rather than against the
recorded corpora. `defInfo`'s markers fire like this:

```
node 41  import {dep}                          enumeration ✓   loaderForm ✓   legacyImport ✗
node 42  import {dep as dep2, viewof viewdep}  enumeration ✓   loaderForm ✓   legacyImport ✗
node 43  import {mutable mutabledep}           enumeration ✓   loaderForm ✓   legacyImport ✗
```

**`legacyImport` (`/\w\.import\(/`) is false on all three**, because the call is
`outputs.get("dep2")?.import(…)` — the character before `.import(` is `?`, not a word character. The
other two markers both fire on every node: the body carries `__variable._module._runtime.module(`
*and* `import(`, satisfying `loaderForm`, as well as the `outputs.get(…)?.import(` enumeration. So 2.0
imports are doubly covered and the legacy marker does no work here, contrary to what earlier notes in
this document implied.

(Recorded because it nearly went in wrong: node 41's row was first written as `loaderForm ✗` from a
truncated console tail. Printing the whole body reversed it. Truncation has now produced two
near-misses in this session — the other was `exportModuleJS`'s `source` field.)

The bodies also settle two shape questions. `viewof viewdep` yields **two** outputs, the value and the
view (`outputs: ["dep2","viewdep","viewof$viewdep"]`), and `mutable mutabledep` likewise yields
`["mutabledep","mutable$mutabledep"]` — which is why the fixture's three import nodes produce seven
symbol variables between them. And the enumeration records the **remote** name separately from the
local one (`outputs.get("dep2")?.import("dep", "dep2", module)`), so an aliased import carries both
ends, which is what makes several imports of one module separable at all.

A spelling asymmetry worth recording alongside it: for `mutable q = 6`, `output` is the **spaced**
`"mutable q"` while the body function is named `mutable$q`. `define.ts` uses the spaced `output` for
the initial value and derives `mutable$q` by `unprefix(output, "mutable ")` — which is exactly how one
authored cell ends up with both spellings live at once.

### The bug both corpora were structurally blind to

Widening the import-cell marker from `t\.import\(` (a literal `t`, matching only the minified live
Observable shape) to `\w\.import\(` looked like a robustness improvement and kept every test green.

It was wrong. A **compiled** module — which is what every exported lopecode notebook boots as —
spells each imported symbol `(_, v) => v.import("runtime", _)`, text that also contains `.import(`.
Both recorded corpora are *live post-run captures*, where an alias has already been rewired to an
identity function, so neither contains the compiled form and neither could fail:

```
runtime          importCell=true   cell.name=runtime          type=import   <-- SPURIOUS
thisModule       importCell=true   cell.name=thisModule       type=import   <-- SPURIOUS
currentModules   importCell=true   cell.name=currentModules   type=import   <-- SPURIOUS
tests            importCell=true   cell.name=tests            type=import   <-- SPURIOUS
spurious single-variable import cells among the aliases: 4
```

Four invented cells in cell-map-2's own module, found only by pointing a probe at a module that has
the form. **Arity separates them** — an import cell's body takes one parameter, an alias takes two —
so the detector now excludes `(_, v) => v.import(`. After the fix: 0 spurious, 104/20/4 unchanged.

The transferable point is about corpora, not regexes: two independent corpora agreeing proves less
than it appears when both were captured the same way. These were both post-run runtime dumps, so
they shared a blind spot exactly where the compiled form differs. The probe is kept as a test
(`a compiled module's alias variables are not import cells`) because nothing in the corpus-based
suite can regress-test it.

### The same blind spot a third time: compiled projections, 2026-09-12

Two of the six in-notebook tests had never computed — `list_cells` reported `hasValue: false` for
both, so their green status rested entirely on the headless suite. Forcing them through
`module.value(name)` threw:

```
defInfo_is_memoised_per_definition    THREW  projection not recognised as glue
compiled_alias_is_not_an_import_cell  THREW  real import cell not recognised
```

**The first is a real defect.** `GLUE[0]` was `/^\(?\w+\)?\s*=>\s*\w+\[\w+\]$/` — a `\w+` subscript.
Every projection-shaped definition in the notebook-kit corpus agrees with that (11 of them, all
`(exports) => exports[o2]`), and `vendor/notebook-kit/src/runtime/define.ts:91` says why it must:

```ts
variables.push(main.variable(true).define(o, [vid!], (exports) => exports[o]));
```

`o` is closed over, so the runtime-generated text always carries a bare identifier. But
`tools/js-toolchain/compile.js:35` emits the other spelling:

```js
cells.push({_name: o, _inputs: [holderName], _definition: `(exports) => exports[${JSON.stringify(o)}]`});
```

`JSON.stringify` quotes the key, and that compiled form is what an exported notebook boots as.
Measured in the page before the fix:

```
(exports) => exports["a"]   glue=false
(exports) => exports[o2]    glue=true
e=>e[t]                     glue=true
(exports) => exports['a']   glue=false
```

An unmatched projection is treated as a cell body, so a 2.0 multi-output cell compiled through
js-toolchain would have produced one spurious cell per output and never grouped its holder. Fixed by
admitting a quoted or backticked subscript. Controls: both corpora unchanged at 104 and 20/4
(`bun test` 10 pass, 69 expect, 0 fail), the inverse case pinned (`function _x(d){return( d["name"] )}`
must stay a body), and the live page unchanged at 17 cells, 56 modules clean, 175 import cells over
385 variables.

**The second failure was the test, not the detector.** Its `real` sample,
`async (__variable) => { __variable._module._runtime.module(_.default) }`, contains no `import(` at
all, so the both-markers rule rejected it correctly. It was a shape I invented rather than observed;
replaced with a loader copied verbatim from the page.

The transferable finding is no longer about any single regex. **A live post-run dump cannot see the
compiled form, and the compiled form is what every exported file runs.** Three classifications have
now differed there — aliases (`(_, v) => v.import(…)`), loaders (`runtime.module(` plus
`importShim(`), and projections (`exports["a"]`) — and in all three cases both corpora agreed with
each other and were both wrong. Anything classified from definition *text* needs a compiled-form case
pinned by hand; no amount of runtime capture will supply one.

### cell-map-2 now emits `importInfo`, and a probe found what four suites could not, 2026-09-12

Nothing imports cell-map-2 yet, so its output contract was still free; the visualizer pins v1's shape,
so the gap was closed before a consumer froze it. Read from the live consumers rather than from v1's
producer — `@tomlarkworthy/visualizer` `renderImportCell`, `syncers` and `createImportCellHeader` —
the contract is exactly:

```
renderImportCell:         ii.type · ii.source? · ii.notebook ?? ii.specifier ?? ii.from · ii.specifiers[{imported, local}]
syncers:                  ii.type · ii.specifier      ("builtin" skips; also the header key)
createImportCellHeader:   cell.module_name            <- cell-map-2 emitted `module`, a FOURTH incompatibility
v1's own test asserts:    ii.meta.variables           <- nothing in the visualizer reads it; not emitted
```

v1 builds `importInfo` by **decompiling** through observablejs-toolchain. Every field above is already
in the loader body, so cell-map-2 derives it from runtime data alone and takes no new dependency.
`module_name` is kept semantically distinct: `module` is the containing module, `module_name` on an
import cell is the module imported *from*, which is what `data-module-name` means in v1.

v1's `extractObservableNotebookNameFromSpecifier` requires a `.js` suffix, so the live 2.0 form
`/api/import/<slug>` returns `null` there and every notebook-kit import goes unnamed. The normaliser
here covers both, measured:

```
/@tomlarkworthy/tests.js?v=4                       -> @tomlarkworthy/tests
https://api.observablehq.com/…/dependancy.js?v=4   -> @tomlarkworthy/dependancy
/api/import/@tomlarkworthy/dependancy              -> @tomlarkworthy/dependancy     (v1: null)
/api/import/@tomlarkworthy/dependancy@20           -> @tomlarkworthy/dependancy@20  (v1: null)
/d/57d79353bac56631@44.js?v=4                      -> d/57d79353bac56631@44
npm:d3                                             -> null   (names no notebook; correct, not a miss)
```

**The blind spot, a fourth time — and the first instance no suite could have caught.** Printing
`importInfo` for cell-map-2's *own* compiled module showed **5 import cells against 3 loaders**:

```
test_compiled_alias_is_not_an_import_cell            nb=null  specifiers=[]
test_import_locals_prefer_the_specifier_enumeration  nb=null  specifiers=[{dep→dep2},{viewof$viewdep→…}]
```

Both are this module's own **test cells**. Their bodies quote sample import source as string
literals, and the markers were matched against raw definition text, so quoted code classified as
code. The defect was pre-existing; adding `importInfo` only made it visible. Neither recorded corpus
contains a cell that quotes import source, so neither could fail — the same structural reason the
alias, loader and projection misclassifications all survived two agreeing corpora. **What differed
this time is that a probe printing real output found it, not an assertion.** The count against a
known ground truth (3 loaders) is what caught it, exactly as the `dynamic ` off-by-one was caught by
a count rather than by the empty UNRESOLVED list.

Fixed by matching markers against source with string literals blanked, while extraction still reads
the original text — the specifier and the alias names live *inside* those literals. Blanking costs no
true positive, because `runtime.module(` and `outputs.get("")?.import(` both survive it. A parse would
be exact and is the standing preference; this is the cheap structural form, and the case is pinned
both ways (a quoting cell must not classify, the same text as a definition must).

**A claim in the first draft of this section was false, and a probe caught it.** I wrote that the
live fixture exercises the *unresolved* import path, "so the symbols can only come from the loader's
enumeration". Measured by `tools/newobs-replica/probe-live-import-branch.ts`:

```
importedSymbolVariablesPresent = [dep, dep2, viewdep, viewof$viewdep, mutabledep, mutable$mutabledep]
cell 42  members(4)  membersBeyondHolder=3  branch=MEMBERSHIP (resolved)
cell 43  members(3)  membersBeyondHolder=2  branch=MEMBERSHIP (resolved)
```

All six output variables exist. What fails headlessly is each import's **value** (`ENOENT`), not its
variables — `define.ts` creates them regardless — so membership attributes every symbol and the
enumeration fallback never fires there. This restates wrongly a distinction recorded one section
earlier in this document ("both are value-level failures that leave the variables in place"), which
is how a passing test came to carry a false reason. The enumeration branch is now pinned by reading
the loader body directly and requiring it to agree with what membership produced, rather than by
assuming a fixture covers it.

Two shapes feed `specifiers`, and only one is in the corpora. A notebook-kit loader carries an
`outputs.get("<local>")?.import("<remote>", …)` enumeration holding **both ends**. A **compiled**
loader has none: each symbol is its own `(_, v) => v.import("remote", _)` variable, which is not glue
and has no foreign input, so it never joins the loader's group. Its mapping is read **without
merging** — merging would retype those cells `import` and move the counts 104/20/4 pin. Measured
after the fix:

```
exporter-3    13 import cells   invalid=0 nullSpecifier=0 zeroSymbols=0   alias: source_gz -> runtime_gz
notebook-kit   3 import cells   invalid=0 nullSpecifier=0 zeroSymbols=0   alias: dep -> dep2,
                                                                          viewof viewdep -> viewof$viewdep
compiled       3 import cells   zeroSymbols=0   aliasesStillOwnCells=4 types=[simple ×4]
```

Suites after the change: **67 pass, 0 fail, 1133 expect()** across five replica files (52/237 before,
across four). Harnesses, both kept because they print output rather than assert expectations, which
is how each found what a suite could not: `tools/newobs-replica/probe-import-info.ts` (the
quoted-source false positive) and `tools/newobs-replica/probe-live-import-branch.ts` (the
membership-vs-enumeration branch).

(This figure was written here as 57/964, then 58/988, then 59/1002, then 67/1133 — corrected three
times in one session, each time because tests were added after the number was typed. It is the same
failure the warning above describes, committed three lines below it, three times. Re-derive from the
command; do not trust this line either.)

### cell-map-2 has prose, and a renderer exists, 2026-09-12

Two gaps closed against `knowledge/what-makes-a-great-lopebook.md`, both named by Tom: §5/§10
(literate prose) and the absence of anything able to draw a cell-map-2 map.

**Prose.** cell-map-2 had **zero** `md` cells; it now has six — what it does, why a v2 rather than a
patch, the four grouping rules, the bundle-dependent glue catalogue, import cells and `importInfo`,
and how to run the tests. Written from the module actually in front of me, because the previous prose
in this working copy was **invented** — six cells that existed in no page, alongside invented pids —
and was deleted on rebuild. Verified as six pure additions: the `$def` pid lines diff page-vs-disk as
`0a1,6`, 15 → 21, **no modifications**, so no existing cell's lineage moved.

What that does *not* establish: the headless suites never render these cells, so they prove the file
parses as **JavaScript**, not that the markdown is well-formed. A mangled table or an unbalanced
backtick would parse and render wrong. Unverified until it is opened in a page.

**Renderer.** `@tomlarkworthy/cell-map-viz` — `render(cellMap, {…})`, taking the map as an argument.
The finding that motivated it: there is **no `render(cellMap)` anywhere in the corpus**.
`@tomlarkworthy/visualizer` is not a graph renderer at all (it syncs Observable inspector DOM nodes),
and the actual cell-map diagrams are *cells inside cell-map v1* (`viewof cellMapViz`, `viewof
detailViz`) wired to that notebook's own internals — so a second cell map has nothing to point at.
The new module owns the derivation instead: `flatten` → `variableToCell` → `edges`, plus per-render
hierarchy construction.

Four incompatibilities were measured from the live consumers rather than assumed, and each is a
silent failure, not an error:

| site | v1 expects | cell-map-2 emits | effect |
|---|---|---|---|
| `createImportCellHeader` | `cell.module_name` | `module` | header loses its module attribution |
| `syncers` | `importInfo` | (was absent) | `continue` — every import header dropped |
| `variablesForCell` | mutable triple, index 2 | 4-variable automutable | renders the wrong variable |
| `detailViz` symbol domain | no `multi` | `multi` | every 2.0 holder draws as unknown |

Three deliberate departures in the new module: `multi` is in the symbol domain; the builtin filter
tests the runtime's `_builtin` module **by identity** rather than v1's `v.module !== "builtin"` string
compare (which cell-map-2's resolved module names make permanently false, so builtins were never
filtered); and the hierarchy is built **per render**, because `dedupeHierarchy` rewrites
`parent.children` and the detail view writes `n.type` onto the same nodes while drawing — two views
over one hierarchy would corrupt each other.

`linkTo` and `isOnObservableCom` are **options with inert defaults**, not imports. v1 takes them from
`@tomlarkworthy/lopepage-urls` and its `hash` from an unnamed document id (`d/57d79353bac56631@44`);
a renderer should not inherit either.

**Two things are untested and neither is faked.** `buildHierarchy` needs d3, and **no d3 is installed
in this repo** — no `d3`, no `d3-hierarchy`, nothing in `package.json`, and no other suite imports
one. The options were to add a dependency to shared project state for a test, or to hand-write a d3
stub — which would test a reimplementation of d3 against a reading of d3, the same
tool-tested-against-itself trap that hid four misclassifications in cell-map-2's history. So it is
untested and says so in the suite header and in the module's own status prose. The Plot marks are
likewise uncovered (no Plot, no DOM headlessly). `@tomlarkworthy/visualizer` has no tests of any kind,
so this is a floor, not parity.

`tools/newobs-replica/cell-map-viz.test.ts`: **8 pass, 0 fail, 131 expect()**, including a real
cell-map-2 map fed end to end through flatten → filter → edges, asserting every emitted type is in
the legend domain — the check that catches a new grouping type arriving unhandled.

**Shipped to the canonical, 2026-09-12, on Tom's approval.** cell-map-viz is hosted in the cell-map-2
notebook rather than getting its own file, following the one-project-one-notebook rule in
`knowledge/maintaining-and-updating-lopecode-and-lopebook-content-repositories.md`. It is declared in
`modules/canonical.json` with `"upstream": null`, because
`api.observablehq.com/@tomlarkworthy/cell-map-viz.js` returns 404. cell-map-2 returns 200. Both
modules were synced into `lopecode/notebooks/@tomlarkworthy_cell-map-2.html`, which is a symlink into
the main checkout. cell-map-viz was then appended to `bootconf.mains` as a cargo main, not in the
hash, because without that its tests never instantiate (see the next section).

```
canonical after sync  165 tests  162 pass  2 fail  1 timeout   all 10 cell-map-2/-viz tests pass
untouched copy        161 tests  158 pass  2 fail  1 timeout   same 3 failures
preflight             1 finding (file-sync unused-dep) in both, so nothing new
```

The cellwise-diff against Observable shows `defInfo`, `groupCells` and `cellMap` differing, with the
local side ahead. The md cells are unnamed and cellwise does not list them.

Not done, each for a stated reason:

- **The lopecode commit, `lopebooks/content.json`, the lopecode `sitemap.xml` and the `.json` spec
  sidecar** (the notebook has none). All four live in the main checkout's submodules. This worktree
  session's guard refuses both `git -C` into them and edits at those paths, and the worktree has no
  initialised submodules to run `build-sitemaps --only lopecode` or `spec-sync` against. The root
  `content.json`, `canonical.json` and `tools/preflight-baseline.json` are in the worktree and were
  updated. The baseline entry was inserted by hand. `lope-preflight --update-baseline` run here
  reported `1 added, 0 changed, 235 removed`: it sweeps entries whose file is missing, and this
  worktree has no corpus. The file was restored from git before the hand edit.
- **Pushed to Observable, 2026-09-12, on Tom's "Yes push".** The document is `9aaa1a36eb6c9a4a`.

  ```
  --cells defInfo,groupCells,cellMap      v21 -> v24   modify_node 7, 9, 10 (imports untouched)
  6 md cells, insert before GLUE (node 5) v24 -> v30   node_id 25..30, js mode
  remove seed stub "# cell-map-2" (md)    v30 -> v31   node 0
  ```

  The md cells need a one-off WS script, `tools/scratch/push-cm2-docs.mjs`, committed with this record.
  `--cells` cannot insert an anonymous cell, and `--cells-match-body` only modifies. The stub was
  removed rather than modified because it is md mode, so a modify would have rendered
  `md\`…\`` literally. The inserted sources are push-ws's own `--dry-run --dump` output.

  Verified at v31: 23 nodes, 0 duplicate values, the md cells in order before `GLUE`. The compiled
  `.js?v=4` serves the new prose and `specifierName`. In a bare runtime, all 15 locally defined named
  cells fulfilled, the 6 anonymous cells produced 6 fulfilment events, and there were 0 errors.

  A dead end worth knowing: `tools/probe-observable-annotate.mjs` read `ok: 59` before the md insert
  and then `51`, `55`, `55` after it, with 0 errors every time. Its `ok` counts **fulfilment events
  of named cells** at a fixed 15 s: anonymous cells add nothing, and recomputing cells add again. So
  it cannot tell a lost cell from timing. The distinct-name variant
  `tools/scratch/probe-observable-names.mjs` is the one that settled it.

  cell-map-viz cannot be pushed until an Observable notebook exists for it.
- **No jumpgate.** An in-place jumpgate would revert cell-map-viz, which is not on Observable, and
  pull 20-odd sibling modules off their canonicals.

### The in-notebook tests run in a browser, 2026-09-12

Run on scratch copies only. The canonical was checksummed before and after and did not change
(`2ff43619…04c6`). Steps: copy the canonical, `sync-module --target <copy>` for cell-map-2, and again
with `--insert-ok` for cell-map-viz, then `lope-browser-runner --run-tests`.

```
baseline copy (untouched)          161 tests  158 pass  2 fail  1 timeout
+ cell-map-2 + cell-map-viz        161 tests  158 pass  2 fail  1 timeout   -> viz tests absent
+ cell-map-viz added to mains      165 tests  162 pass  2 fail  1 timeout   -> 4 viz tests appear, all pass
```

The three failures are identical in all three runs, so they are pre-existing, not caused by this work:
`@mootari/access-runtime#test_persistentId` ("persistentId changed"),
`@tomlarkworthy/lopepage-urls#test_tests_example` (timeout), and
`@tomlarkworthy/runtime-sdk#test_reflectsTitleUpdate` ("initial title not detected").

**cell-map-2:** all 6 `test_*` cells pass in the page. The runner labels them
`module @tomlarkworthy/runtime-sdk#…`, which is a runner bug and not a module move.
`runTestVariables` (`tools/tools.js:90-96`) names a module after any variable in it called
`module …`, and cell-map-2's own module holds the import variable `module @tomlarkworthy/runtime-sdk`.
It also keys results by `module#name` in a Map, so two modules whose test names collide under one
mislabel would silently collapse to one result. That has not been observed, but nothing prevents it.

**cell-map-viz:** an inserted module that no main imports is **not instantiated**, so its tests do not
exist in the runtime. This corrects an earlier note: `--run-tests` with `force:true` forces variables
that exist, and does not instantiate modules. Once the module was added to `bootconf.mains` in a second
scratch copy, all 4 tests passed. They report as `main#…`. That includes
`test_hierarchy_is_not_shared` → `"ok, 2 nodes per render"`, which calls `buildHierarchy`, which calls
`d3.hierarchy`. So `buildHierarchy` is now **tested in the browser** against the real d3. It is still
untested headlessly, for the reason given above. `--list-cells` on that copy reports no errored named
cells, and `render` resolves to a function.

Still unverified: that the Plot marks draw (no test calls `render` on a map), and that the 10 md cells
render as intended. `--list-cells` lists only named cells, and the md cells are unnamed.

### `liveCellMap` was not live, 2026-09-12

Tom asked whether `liveCellMap` updates as cells are added to a live module. It did not.
`liveCellMap = cellMap(undefined, currentModules)` had one reactive input. The `currentModules`
generator (`@tomlarkworthy/modules`) yields only when `dirty` is set, and `dirty` is set only when a
module record is created or deleted, or a title changes. A variable added to an existing module sets
nothing. v1 stays live through a separate `maintain_live_cell_map` cell that depends on runtime-sdk's
`runtime_variables`, and `observeSet` fires that on every `runtime._variables` change. The rewrite
dropped that path, and every test called `cellMap(...)` once, so none could notice.

Fix: `runtime_variables` is imported from runtime-sdk and added to `liveCellMap`'s inputs. Observable's
published runtime-sdk exports it.

Measured with `tools/scratch/probe-live-cell-map.mjs`, which observes both maps, adds a cell to
cell-map-2's module, redefines it, then deletes it, and counts fulfilments in 8 s after each step.
Fixed and unfixed are scratch copies of the canonical:

```
                 add                  redefine             delete
fixed v2    1 -> 1731, probe in   1 -> 1731, probe in   1 -> 1730, probe gone
unfixed v2  0                     0                     0
v1 control  1 -> 1804, probe in   1 -> 1804, probe in   1 -> 1803, probe gone
```

The first fixed run looked like a failure. v2 recomputed but still showed 1730 cells and no probe.
`tools/scratch/probe-live-cell-map-why.mjs` showed the cause: `defInfo(() => 42).glue === true`.
`GLUE[5]` `/^\(\)\s*=>\s*\w+$/` matches a numeric literal as well as an identifier, so the test cell
itself was classified as glue and grouped into no cell. Redefined in compiled form
(`function _probe_added_cell(){return(42)}`), which matches no GLUE pattern, it groups correctly.
That is a classification gap, not a liveness one: a hand-defined zero-input arrow returning a bare
word or number is taken for runtime glue. It is not fixed yet.

With the fix synced into a scratch copy, the browser run is unchanged: 165 tests, 162 pass, the same 3
failures. `cell-map-2-module.test.ts` gained a test that `liveCellMap`'s inputs include
`runtime_variables`. Run against the canonical's still-unfixed module block, extracted with
`lope-reader --get-module`, the inputs are `cellMap,currentModules`, so the test fails there as it
should. Headless replica suites with it: **68 pass, 0 fail, 1142 expect()**. The recompute itself is
browser-only and is covered by the probe, not the suite.

**Synced into the canonical, 2026-09-12**, on Tom's "yeah just work offline". The pre-sync checksum was
confirmed as `a28d00ac…`, and the result is `1d07ccee…`. Browser run on the canonical: 165 tests,
162 pass, the same 3 failures.

Not yet done, by instruction ("work offline"): pushing `liveCellMap` plus the new `runtime_variables`
import to Observable. `--cells` drops imports, so the import needs the raw WS path or a hand-added
import cell. Observable's copy is therefore still the non-live version.

### cell-map-viz draws something, and lost a dead cell, 2026-09-12

Status before: `render(cellMap)` existed, but no cell called it, so the notebook drew nothing.
`buildHierarchy` had no caller except its own test, and the Plot marks were untested.

Changes, all in the working copy and synced into the canonical:

- **`buildHierarchy` and `test_hierarchy_is_not_shared` deleted.** `render`'s inputs never included
  it. The "hierarchy built per render" departure went with it.
- **`thisNotebookDiagram`** renders cell-map-2's `liveCellMap`, filtered to this notebook's two
  modules. Unfiltered, the page's runtime map is about 1,730 cells, which is too tall for one ordinal
  band.
- **`test_render_draws_one_mark_per_cell`** renders a four-cell map with one anonymous cell filtered
  out. It counts Plot's `g[aria-label=dot|text|arrow]` children (3, 3, 2), checks that no `<a>`
  appears without `linkTo`, and checks that 3 appear with it.
- **`linkTo` now defaults to no link.** The old default emitted `href="#<module>#<name>"`. A click
  rewrites the page hash, and lopepage parses the hash as a layout, so the default was not inert.
- The title prose advertised `Plot` and `d3` as `render` options. They are not. It is now an
  annotated call.

Measured on a scratch copy with `tools/scratch/probe-viz-demo.mjs`:

```
initial                            42 dots  42 labels  39 arrows  940px  0 links  modules: cell-map-2, cell-map-viz
after adding a cell to cell-map-2  43 dots  43 labels  39 arrows  960px  0 links  probe_viz_cell present
```

Browser run: 165 tests, 162 pass, the same 3 failures, and all 4 viz tests pass. The runner labels
them `module @tomlarkworthy/cell-map-2#…`, because cell-map-viz now holds an import variable of that
name. Headless viz suite: 8 pass. Its first test now pins `render` rejecting headlessly, not
`buildHierarchy`.

Still not covered: the layout at scale, and the md prose as rendered.

### E1 answered: the catalogue is closed by construction, and recognition must be structural, 2026-09-12

E1 was scoped as an empirical sample of five notebooks. The source makes that the weaker test.
Every glue definition a notebook-kit runtime holds is created in one of two places, both vendored
and both short:

| kind | created at | copy as text? |
|---|---|---|
| display shadow | `define.ts:49-63`, `new Variable(2, module)` closing over `state` | no, closes over DOM state |
| view shadow | `define.ts:66-68` | no, closes over the display shadow |
| viewof input | `define.ts:78`, `main.define(o, [output], input)` | **no**, `input` is a stdlib function (`Br` live) |
| mutable live getter | `define.ts:82`, `([mutable]) => mutable` | yes |
| Mutator | `define.ts:85`, `main.define(x, [output], Mutator)` | **no**, stdlib (`Jr` live) |
| mutable$ accessor | `define.ts:86`, `([, mutator]) => mutator` | yes |
| projection | `define.ts:91`, `(exports) => exports[o]` | yes; `o` is the variable's own name |
| import alias / builtin ref | `@observablehq/runtime` `variable.js:202`, `module.js:61`, `identity` | yes |
| global / builtin constant | `module.js:147,159`, `constant(x)` | yes |

Cell bodies and import loaders are transpiler output, not glue. So for a given notebook-kit version
the catalogue has 9 entries. Sampling more notebooks tests which entries they exercise, not whether
the set is closed. The limit is the version: this is vendored 2.5.6 with runtime 6.0.0. The live
bundle's version was not recorded, but its minified shapes (`Br`, `Jr`, `([e])=>e`, `([,e])=>e`,
`function u(e){return e}`) are the ones this source produces.

Shadows are **in** `runtime._variables`. `variable_defineImpl` adds every variable whose definition
is not `noop` (`variable.js:122-123`). A runtime copier therefore sees them, and must exclude them and
let `define` rebuild them.

**Recognition.** Every entry has a fixed name and input shape, so a classifier needs no definition
text. For example: `o ← viewof$o`, `cell N ← mutable o`, `mutable$o ← cell N`, `o ← cell N` whose
holder takes `mutable o`, projection `o ← cell N` otherwise, and anonymous type-2 for shadows.
`tools/newobs-replica/probe-structural-roles.ts` implements that and compares it with cell-map-2's
text-based `defInfo`:

```
Part A: live capture, 65 non-builtin variables       Part B: vendored define(), 6 nodes -> 16 variables
  34 body                    defInfo:body              6 body                          defInfo:body
  13 rt import alias         defInfo:glue              3 nk display/view shadow        defInfo:body   <- wrong
   8 rt builtin ref          defInfo:glue              3 nk projection                 defInfo:glue
   2 rt global constant      defInfo:glue              1 nk Mutator                    defInfo:body   <- wrong
   1 nk mutable live getter  defInfo:glue              1 nk view input                 defInfo:body   <- wrong
   1 nk mutable$ accessor    defInfo:glue              1 nk mutable live getter        defInfo:glue
   1 nk Mutator              defInfo:body   <- wrong   1 nk mutable$ accessor          defInfo:glue
   1 nk view input           defInfo:body   <- wrong
   4 classic shapes (M6)     defInfo:glue
```

`defInfo`'s misses are exactly the entries that cannot be copied as text: `Mutator`, `input`, and the
shadows. Its `GLUE` list has no pattern for a minified stdlib function, and could not have one that
survives the next bundle. cell-map-2's **grouping** is unaffected, because it attaches those
variables by name and input rules, as the earlier `mutable q` result showed. An exporter choosing
what to copy would not be: under option C it would serialize `function Br(e){return I(…)}` with free
`I`/`Hr`/`Vr`.

A correction from building this: an intermediate text classifier labelled 4 variables of the
`/api/import` hybrid module M6 as bodies that `defInfo` called glue. They are classic compiled glue
(`(G, _) => G.input(_)`, `mutator`, and the two accessors). `defInfo` was right, and the structural
rules now name them.

**Decision for exporter-4: option C stands, with structural roles.** It copies 7 of the 9 entries as
text. It emits `input` and `Mutator` as two stdlib references, and drops the shadows so `define` can
recreate them. Two things are unverified: the structural rules have not been run over a classic
lopecode notebook's full runtime, and import cells still need `defInfo`'s loader parsing (E5).

### A pid cannot be recomputed off-page, 2026-09-12

Before hand-authoring pids for new cells, I tried to compute them the way the runtime does.
`runtime-sdk` `persistentId` (cell `_xejgj8`) is:

```js
v.pid = contentHash(v._name + v._definition.toString());
```

and `contentHash` (`_u2fef4`) is dependency-free FNV-1a, `'_' + (h >>> 0).toString(36)`. That looks
exactly reproducible. It is not. Measured by `tools/newobs-replica/probe-pid.ts`, importing the real
`contentHash` from the canonical runtime-sdk source:

```
RESULT contentHash loaded, typeof=function   stable=true   shape="_7aigaz"
RESULT persistentIdPid computed=_xkis56 want=_o83sai match=false
RESULT definitionHead="function _persistentId(contentHash, persistentIdToVariableRe"
RESULT cellMap2Pids hit=1 miss=14
    GLUE: shipped=_6tnd33 computed=_1ncfa1l
    notACell: shipped=_xfa26q computed=_l5fywq
```

`_o83sai` is runtime-sdk's **own** in-notebook fixture for its own pid, so the target is not in
doubt. The misses include `GLUE` and `notACell`, cells this session never edited, which rules out
"the bodies changed since minting" as the explanation.

The cause is in the probe's own output: the definition read back is the **compiled** spelling —
`function _persistentId(contentHash, persistentIdToVariableRef, WeakRef)`, dep list as named
parameters, whitespace normalised. The pid was minted on Observable against the **authored** text,
which a compiled module does not contain. So the hash input is unrecoverable off-page.

**This is the compiled-form blind spot a fifth time**, and the first where it killed an approach
rather than a classifier: aliases, loaders, projections, quoted source, and now pid derivation. The
rule generalises past classification — *any* value derived from definition text is not reproducible
from a compiled module, because the compiled text is not what produced it.

Consequence, and it matches Tom's steer (2026-09-12): *"Runtime-sdk generates random ones when
needed. Their purpose is to give a variable a long lived lineage. The important thing is that they
persist in serialization for association across exports."* Pids are **lineage tokens, not content
addresses**. runtime-sdk carries a second generator for exactly this — `id()` (`_1hvbkoy`), *"quick
random id that is also a valid identifier"*, letters-only with no `_` prefix. `persistentId` computes
only when `!v.pid`, so a pid written by `$def` is never recomputed and never diverges. A new cell
therefore needs a *unique* pid, not a *derived* one.

A related check worth keeping: comparing the `$def` pid lines between the canonical notebook and the
on-disk module is a real drift test and is cheap (`IDENTICAL` across all 15 cells after this
session's four body edits — bodies changed, pids correctly did not). That is the check that caught
the invented-pid drift earlier; recomputing hashes is **not** a substitute for it.

### The working copy had silently drifted from the page

Recorded because the check that caught it is cheap and I nearly skipped it. The on-disk module was
hand-authored from a summary, and the headless suite passed against it — but `list_cells` showed it
matched the live module in neither inventory nor addressing: it had six invented prose cells that do
not exist in the page, and every pid was invented (`_cm2glue` against the real `_6tnd33`,
`_cm2defInfo` against `_wyt7b6`). Pids address cells for annotations and editors, so invented ones
are silent drift. The suite could not detect any of it, because it only exercises `groupCells` and
`defInfo`. The copy was rebuilt from the `list_cells` definitions with the live pids; `@variable` is
confirmed present in the page as a real pid-bearing variable (`_1fw5a6r`, definition `() => x`),
which is the `_type === 2` placeholder that still needs repairing before any export.

### The fixture is verified, and `state.root` was the real blocker, 2026-09-12

This section previously said the fixture was unverified and blamed lopecode's network interception
under `kit.define`. Both halves were wrong, and finding out cost nothing: `vendor/notebook-kit` is the
real 2.5.6 source, bun imports its TypeScript directly, and `notebook-import.ts` injects `kit` and
`Runtime` — no browser, no build, no publishing. `tools/newobs-replica/nk-semantics.test.ts`:
**7 pass, 0 fail, 43 expect()**.

`define` must come from `src/runtime/define.ts`, **not** the package's `runtime/index.ts`, which
exports `defaultNotebook.define.bind(defaultNotebook)` — a 3-arg function bound to notebook-kit's own
main module. Passing that would have defined every fixture cell into the wrong module.

**The actual defect was in the fixture, and it was not headless-specific.** `buildNkFixture` built its
state as `{root: undefined, …}`, and `define.ts:71-73` calls `clear(state)` for every cell without
autodisplay — which is every multi-output cell, since those set `outputs` rather than `output`.
`clear` dereferences `state.root.childNodes` (`display.ts:48`):

```
RuntimeError: undefined is not an object (evaluating 'state.root.childNodes')
 input: "nkFixture"
```

A browser would have thrown the same way; the module had simply never been run. Fixed by creating a
detached `document.createElement("div")` as the root, with an optional `root` override. `DisplayState`
types `root` as `HTMLDivElement` and nothing in `display.ts` requires it to be attached. A second,
separate DOM requirement follows from the ojs single-output cells, which *do* set `autodisplay`:
`observe().fulfilled` calls `display()` → `isDisplayable()`, which needs the `Element` and `Text`
constructors as globals (`display.ts:40`).

**The 14 document nodes produce 34 runtime variables**, and the shapes are what grouping keys on.
Mind which set is being counted: `define` *pushes* 33 into `state.variables`, and a module census
holds 34 — the extra is the implicit `@variable` the runtime materialises when it resolves the import
cells' `@variable` input. Measured, the difference is exactly `["@variable"]`. The fixture's own
`test_fixture_defines_every_node` counts the pushed set; the grouping below runs over the census,
where `notACell` skips the `@`-prefixed one.

```
cell 11 | a | b | cell 12 | p | r | cell 13 | m | cell 14 | one | two | three | null |
x | viewof$view | view | q | mutable q | cell 23 | mutable$q | qplus |
usesProjections | cell 32 | fromOjs | @variable |
cell 41 | dep | cell 42 | dep2 | viewdep | viewof$viewdep | cell 43 | mutabledep | mutable$mutabledep
```

Three findings worth carrying. The bare expression cell (id 15) has neither `output` nor `outputs`, so
`vid` is `null` — an anonymous variable, and the only one. An automutable emits **four** variables with
*both* spellings live at once (`mutable q` spaced, from the ojs transpiler's output name, alongside
`mutable$q`), which is why `groupCells` must match `/^(mutable|initial)[$ ]/` rather than either
spelling alone. And **the three import nodes each get their own `cell <id>` holder plus one variable
per imported symbol** — three distinct holders against one source module, confirming structurally the
case cell-map collapses.

Still genuinely unverified: module *resolution*. Headless has no importmap, so all three imports fail
with `ENOENT reading "https://api.observablehq.com/@tomlarkworthy/dependancy.js"`, and cell 22's value
fails with `Inputs is not defined` because `nkFixtureRuntime` is `new Runtime(() => ({}))`, which
supplies no builtins. Both are value-level failures that leave the variables in place; the suite pins
that no third error class appears. Whether lopecode's interception resolves `@tomlarkworthy/dependancy`
under `kit.define` is a separate question, and it needs the module in a page.

### The live notebook-kit runtime IS reachable — this section drew too wide a conclusion, 2026-09-12

**Superseded the same day by `plan/exporter-4/live-notebook-kit-runtime-2026-09-12.md`.** The origin
wall below is real, but it sits at **depth 2**, which is not where the notebook runs. Depth 1 (the
chat-worker frame) was readable all along; its `__ojs_runtime` was absent only because
`@tomlarkworthy/runtime-sdk` had not been imported into the **host** notebook, and runtime-sdk's
`runtime` cell is what sets that global. Once imported, `window.parent.__ojs_runtime` is the live
notebook-kit Runtime — 265 variables across 4 modules were read from it, including the userspace
module's own cells, its md prose and its import-cell bodies.

So the sentence below — "a lopecode module cannot read the host notebook-kit runtime's variables,
and the offline fixture remains the only evidence for every notebook-kit claim in this document" —
is **false on both halves**. The live platform has now confirmed the glue catalogue's minified
spellings, the dual mutable spelling, and the import-cell shape.

Original measurement, retained because the frame walk itself is accurate:

Measured through the pairing channel, from a lopecode notebook running as an iframe inside
`@tomlarkworthy/notebook-kit-examples` on observablehq.com — which looked like the chance to test
every notebook-kit claim here against the real platform instead of vendored 2.5.6. Walking
`window.parent` upward:

```
depth 0  about:srcdoc#view=S100(@tomlarkworthy/claude-code-pairing,…)  origin "null"  __ojs_runtime ✓
depth 1  https://tomlarkworthy.static.observableusercontent.com/chat-worker/index-pGDT7dL9.html
                                                       origin observableusercontent.com  __ojs_runtime ✗
depth 2  CROSS-ORIGIN-BLOCKED                           window.top blocked likewise
```

The lopecode page sits **two frames below** the notebook, inside a sandboxed chat-worker shell, and
an origin boundary separates the two: the shell is served from `observableusercontent.com`, the
notebook page from `observablehq.com`. Nothing is merely shadowed — the same-origin policy is the
wall, and `window.top` is blocked as well.

~~So a lopecode module cannot read the host notebook-kit runtime's variables, and the offline fixture
remains the only evidence for every notebook-kit claim in this document.~~ **Both halves false — see
the banner above.** With runtime-sdk imported into the host notebook, `window.parent.__ojs_runtime`
yields the live graph, and the live platform has since confirmed the glue catalogue's minified
spellings, the dual mutable spelling, the `/api/import` import-cell body, and that markdown survives
into the runtime verbatim (24 of 25 md nodes, the 25th absent by design). What remains true is only
that **depth 2 is origin-blocked**, which costs nothing because the notebook does not run there.

### Not done

The multi-home notebook itself. Building it needs a jumpgate run, which fetches from Observable and
therefore requires both modules to be published first — publishing, committing and jumpgating all
remain blocked on explicit approval. `@tomlarkworthy/dependancy`, which both fixtures import, is
undeclared in `canonical.json` and was recorded as embedded only in `notebook-semantics.html`; it
would need declaring before the bundle is reproducible. That pointer is **confirmed, 2026-09-12**:
`lopebooks/notebooks/@tomlarkworthy_notebook-semantics.html` does embed
`<script id="@tomlarkworthy/dependancy">`, found by grepping the main checkout, whose content
submodules are populated (105 + 384 notebooks).

Worth recording as method, because it nearly went the other way. Grepped from *this* worktree the
same search returns nothing, and the nearest filename here
(`tools/newobs-replica/site-nk/tomlarkworthy_notebook-kit-semantics.html`) is a 935-byte stub that
does not mention it — so a worktree-local check produced clean, confident, wrong evidence against a
correct record. The content submodules are uninitialised here (see Worktree notes). The miss was
recorded as a limit on observation rather than as a refutation, which is the only reason the true
pointer survived to be confirmed.

Module **resolution** was filed here as needing a page. It mostly does not — the question was framed
wrongly. `transpileObservable` resolves the specifier **at transpile time** to an absolute URL:

```js
await (import("https://api.observablehq.com/@tomlarkworthy/dependancy.js?v=4").then((_) => {
  const module = __variable._module._runtime.module(_.default);
  const outputs = new Map(Array.from(__variable._outputs, (v) => [v._name, v]));
  outputs.get("dep2")?.import("dep", "dep2", module);
  ...
```

so the real question is whether lopecode intercepts *that* URL, and `normalize()`
(`knowledge/lopecode-internal-networking.md:69-73`) answers it:

```js
url.replace(/^(?:https:\/\/api\.observablehq\.com)?\/(.*?)\.js(?:\?.*)?$/, "$1")
```

which maps it to `@tomlarkworthy/dependancy` — precisely the embedded `<script id=…>` lookup key. So
interception handles notebook-kit's URL shape; what is actually required is that the module be
**embedded**, and `@tomlarkworthy/dependancy` is undeclared in `canonical.json` (above).

The bypass risk is now closed by construction. `buildNkFixture` used plain `eval`, and
`lopecode-internal-networking.md:106` records that an `import()` inside `eval`'d code never reaches
the es-module-shims resolve hook — so the embedded copy would be ignored and the notebook would
silently fetch from the network, appearing to work online while failing offline. Tom, 2026-09-12:
*"we have runtime-sdk `realize` for passing a form of eval through es-module-shims to avoid the eval
problem."* `realize(sources, runtime)` (runtime-sdk, cell `_1ny04et`) evaluates through a
`<script type="module-shim">` when `runtime._global('importShim')` is set, and falls back to `eval`
otherwise — so one path serves a lopecode page and a headless runtime alike. Measured: a bare
`@observablehq/runtime` does expose `_global`, and it returns `undefined` for `importShim`, so the
fallback branch is taken headlessly rather than throwing.

`buildNkFixture` now transpiles every node, realizes all bodies in **one** batched call — one injected
script rather than fourteen, and the returned array order is the node order `define` needs for
`cell <id>` naming — then defines them in order. It is consequently `async`, as is `nkFixture`. A
`{realize}` option allows injection, which is how the offline suite exercises the fallback branch.

**Confirmed in a page, 2026-09-12.** `tools/newobs-replica/realize-shim-page.mjs` loads
`tools/lch-lp2.html` (a real lopecode notebook over `file://`, Chromium `--no-sandbox` per
`lopecode-internal-networking.md:110`), route-blocks and counts `https://api.observablehq.com/**`,
and sends the *same* source string down both paths:

```
probe {"hasRuntime":true,"hasImportShim":true,"globalImportShim":true,"hasTargetScript":true}
armA.realize {"ok":true,"type":"function","isFn":true}  apiHitsDuringA=0
armB.eval    {"ok":false,"error":"Failed to fetch dynamically imported module: …cell-map.js?v=4"}  apiHitsDuringB=1
verdict.DIFFERENTIAL_HOLDS true
```

`realize` resolved the import from the embedded `<script id=…>` with **zero** network requests;
`eval` reached for the network and failed. The eval arm is the control — without it a passing
realize arm would only show that the network worked, since the notebook is otherwise online.
`globalImportShim: true` is load-bearing as well: had it been falsy, `realize` would have taken the
eval fallback and the run would prove nothing, so the harness prints it and flags the run VACUOUS.

The target was `@tomlarkworthy/cell-map`, **not** `@tomlarkworthy/dependancy` — any embedded module
exercises the same mechanism, and `dependancy` is embedded in none of the seven candidate shell
notebooks surveyed in this worktree. Whether anything in the corpus embeds it is **unanswered here**,
because the content submodules are not initialised (see Worktree notes); the declaring/embedding
prerequisite above therefore stands unchanged.

The offline suites remain a stand-in for the fallback branch only and are explicitly *not* evidence
for the shim path; both now carry a comment pointing at this harness.

**E7. Editing notebook-kit cells in lopecode. In scope — decided by Tom, 2026-09-12: "We want cells
editable for sure."** For each fixture cell, can js-toolchain decompile and recompile it? Known
gaps: autoview, automutable, native import cells. ~~unique holder ids (the prototype defaults every
holder to `cell 1`)~~ — **not a gap, measured 2026-09-12**: `compile(source, {id})` takes the id and
`compile("const a = 1, b = 2;", {id: 11})[0]._name` is `cell 11`; `cell 1` is only the parameter
default, so a caller passing node ids gets correct holders. Pinned in
`tools/newobs-replica/js-toolchain-vs-notebook-kit.test.ts`. Then whether editor-5 can dispatch per module between observablejs-toolchain
and js-toolchain, and what pairing's `define_cell`/`update_cell` need.

E6 is its prerequisite: you cannot edit a cell you cannot delimit. Reconstruction looks tractable —
the body is `function viewof$view(Inputs){return( Inputs.input() )}` and the authored cell was
`viewof view = Inputs.input()`, so it is unwrap-and-re-prefix. Multi-output is the harder direction,
since `return {a, b};` must invert back to the original declarations. This is the largest unknown
and may be its own plan.

**E8. Corpus regression.** exporter-3 is embedded in most of the corpus, so exporter-4 must be a new
module and leave exporter-3 untouched. Gate: classic and lopecode exports stay byte-identical, using
the same A/B I ran on 2026-09-11 (`newobs-exporter-patch.ts` with `SRC=`/`CELLS=`, and self-export
diffing in lopecode).

**E9. Documentation loss on imports.** `/api/import` drops md and html cells, so an export made on
observablehq.com loses the prose of its *imported* modules; a notebook exported while *viewed* keeps
everything. Check that a jumpgate that views each notebook in turn recovers full content, and decide
whether jumpgates should stay on old.observablehq.com until then.

## cell-map groups imports by the wrong key, and needs a new version

Diagnosed 2026-09-12 from the canonical module
(`lopecode/notebooks/@tomlarkworthy_cell-map.html`; L-numbers are `--get-module` output).

`importedModule` (L762-838) answers "which module did this variable come from". It returns a source
module for the **import cell itself** — via the probe at L800, matching
`_inputs.length == 1 && _inputs[0]._name == "@variable"` — *and* for **every one of its outputs**,
via L764-769, matching `_inputs[0]._module !== v._module`. Both answers are the same Module object.

`cellMap` then keys its `imports` map by that module (L274). Consequences:

- Every variable imported from X lands in **one bucket regardless of which import cell produced
  it**. Two `import {a} from "X"` and `import {b} from "X"` cells become one cell; the second is
  lost.
- L365 `cells.set(importVars[0], …)` makes the bucket's **first member** the cell's identity —
  insertion-order dependent, and usually an alias variable rather than the import cell.
- L374 `groups.set(groupName, [...importVars, ...moduleVarsForKey])` merges the `module X` support
  variable into the same group as the aliases. This is the defect Tom named: module-import support
  associated with the aliases.
- An unobserved import hits L782-794 and returns `undefined` at L789, so its outputs get no source
  and fall through to the `else` at L295 as "simple" cells.
- Pre-run notebook-kit projections match none of the branches — their input is `cell 64` in the
  *same* module, so L764-769 does not fire — and they too degrade to "simple".

The corrected model keys on the **import cell**, never on the source module: identify the cell by
its own definition, then attach outputs by rule 3 (pre-run) or by parsing its body's
`outputs.get("<local>")?.import("<imported>", …)` enumeration (post-run). Two import cells against
one module stay distinct; the `module X` support variable stays a separate concern from aliases.

This is a new version, not an in-place fix: the keying is the data structure, and `importInfo`,
`module_name` and group naming all hang off it. Existing consumers (editor-5's `cellEditor`, the
visualizer, `persistentId` addressing) pin the current output shape, so the new version has to be
introduced alongside.

**Making it fast.** Tom's suggestion: cache the AST on the definition function object. Definition
functions are stable objects per variable, so a `WeakMap<Function, AST>` survives cellMap re-runs
and collects with the variable. Under the rules above, most variables never need an AST at all —
bodies are recognised by a named-function match, glue by catalogue membership, builtin bridges by
identity-plus-`@builtin`. Only import cells need parsing, so the cost is O(import cells) once, then
cached. Worth measuring against the current implementation, which calls `importedModule` — and
therefore the probe — for every named variable (L252-259).

## Order and gates

1. E0, then E1 and E2 in parallel. **Gate:** choose C or B. If E1 shows an open-ended glue set and E2 shows lossless inversion, take B.
2. E3 and E4 together — both are bootloader/loader work and E3 sets the bundle budget. **Gate:** a notebook-kit-shaped module runs in a `file://` lopecode notebook, offline, with legacy modules alongside.
3. E5, and E6's two remaining gaps — a fixture with non-import multi-output cells and with ≥2 import cells against one module, checked in both the pre-run and post-run import states. These unblock the class **b** dual-style fixes and the cell-map rewrite below. **Gate:** grouping is exact on that fixture, on both platforms.
4. The cell-map new version, built on E6's four rules and keyed on the import *cell*, introduced alongside the current one rather than replacing it (editor-5's `cellEditor`, the visualizer and `persistentId` addressing pin today's output shape). Measure the `WeakMap<Function, AST>` cache against the current per-named-variable `importedModule` probe.
5. exporter-4 prototype, tested with E0's fingerprint across live → export → re-export, and E8 as the regression gate.
6. E7 — committed, since cells must be editable — gated on E6 and likely its own plan. E9 alongside.

## Open questions for Tom

- ~~Should an exported notebook-kit notebook be *editable* in lopecode?~~ **Answered 2026-09-12:
  yes.** E7 is in scope, and E6 is its prerequisite.
- Are we willing to add ~225 KB gzipped of notebook-kit runtime to notebooks that need it, loaded lazily per notebook, or should nk-shaped modules be converted on the way in after all?
- New cells authored in lopecode: classic dialect (today's behaviour) or notebook-kit dialect?
- Should `@tomlarkworthy/modules` gain dependency edges, so module-map can be frozen? `visualizeModules` is its only remaining consumer of `dependsOn`/`dependedBy`.

## Worktree notes

- `vendor/notebook-kit` here is a **symlink** to the main checkout (branch `upstream-2.5.6`, version 2.5.6, with `node_modules`). Do not commit it; initialise the submodule properly before any merge.
- The replica and probe tools were copied in from the main checkout, where they are untracked: `tools/newobs-replica-build.ts`, `tools/newobs-replica.ts`, `tools/newobs-replica/`, `tools/newobs-exporter-*.ts`, `tools/newobs-main-dump.ts`.
- Content submodules (`lopecode/`, `lopebooks/`) are **not** initialised here. Initialise them when an experiment needs to modify notebooks.
