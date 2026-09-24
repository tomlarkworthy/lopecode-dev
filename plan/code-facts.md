# Reactive annotations: a fact graph over cells, with plugins that declare, check and derive

Status 2026-09-24 16:45 CEST. Iteration 1 (links by name, per-node live layer) is built, exported
and verified (§4). Iteration 2 (one fact graph per builder, plugins own their reactivity, derived
labels, the df34 core rules as rules over facts) is built, exported, cold-boot verified (§6) and
held to the eight recorded ledger fixtures (§5). The 05:40 version of this brief proposed
hidden derived variables per annotation; nothing from that kernel is needed.

Open the result: `file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_reactive-annotations.html`

## 1. The steer

Tom, 2026-09-24, in order. Each line changed the design.

> "I think we can simplify that plan by making the reactive links implicit in the design … it will
> be common to setup an annotation system in one cell as a builder … The output of the code
> annotation will be a DOM node … One plugin should warn you if it detects you have not configured
> it correctly."

> "I am not sure we need the reactive edges, perhaps that is a plugin but I think the basic
> framework doesn't need it?!"

> "something like documentation is a markdown cell, the annotation would be a link between these
> things like this cell is documented by these cells."

Iteration 1 came from those three. After using it:

> "a link like 'is documented by' doesn't really check anything. Its only useful if there is a lint
> rule 'everything must be documented', and its only useful as a tool, if the violations have easy
> fixes … The original motivation was for ratcheting knowledge for robocoop … cells to be
> categorized as evidence, inference etc., and only true nodes that have had multiple computational
> paths in their construction … I see we have not subscribed to reactive updates … We should think
> about code changes / vs value updates / vs static labelling. Ideally we use existing reactivity
> architecture."

> On `A = annotations({tick: last_change})`: "ERROR PRONE! Annotations should be setup as an array
> of plugins, and the plugins decide how they tick." On feeding the tests module's array as an
> input: "Hacky and unintuitive." "We need a way of (live) querying the annotation graph as well so
> the results could be used to drive an agents hooks." Fix affordance: "a summary, and the summary
> has the links to take you to the problem area (so a lopepage-url link)."

> "'keyed by pid' this should not be exposed to users." A link must be able to annotate an erroring
> or unreachable cell. "Can we have a label exist without a host cell? … labelling should be a
> computation on the annotation graph, so the 'ratchet' algorithm is installed as a plugin, and the
> labels appear queryable in the store, but they are not necessarily materialized into the
> notebook (they are derived anyway), but they live update."

> "To what extent could this be used as a semantic graph, something OWL like … I don't want to be
> pure, I think we should also have code metric labellers … or something like a more advanced type
> system between nodes (contracts?)." Then: "if there is a lightweight solver already for JS maybe
> we should consider using it? Or maybe the purity would get in the way?"

## 2. Design (iteration 2)

**The graph.** One builder per module: `A = annotations([lint(), given(), evidence(), crossing(),
core(), ratchet(), summary(), audit()])`. The builder owns a fact store. A fact is
`{s, p, o, by, hash, at}`: subject cell, predicate, object (a cell, a value or a literal), the
plugin that asserted it, the subject's content hash when it was asserted, and a time. Everything
is a fact: a declared link, a subject's current hash and runtime state, the runtime's own edges,
and every derived label. The store is recomputed in one pass whenever anything relevant changes and
then published; nothing user-visible is keyed by pid.

**Base facts come from the runtime**, seeded by the framework on every pass, for the builder's
module: `(x, kind, function|markdown|test|data|node|…)`, `(x, hash, h)`,
`(x, state, fulfilled|rejected|pending|not computed)`, `(y, dependsOn, x)` from `_inputs`,
`(x, error, message)`. No plugin walks the runtime.

**Plugins** are objects, installed as an array; their order is the stratification:

```js
{
  id: "crossing",
  needs: ["value"],                         // code | value | state: what the framework subscribes to
  schema: { crossing: { domain: "cell", range: "cell" } },   // audit checks every fact against it
  check: (link, ctx) => ({ ok, summary, facts: [[s, p, o], …] }),   // one declared link
  derive: (ctx) => [[s, p, o], …],          // facts that need no declaration; run to a fixed point
  view: (finding, ctx) => node              // optional; default renders the finding
}
```

`declare`-style links are cells, `x_cross = A.crossing("x", "x_alt")`, arguments always strings.
The cell's value is a node that renders its finding from the store and repaints when the store
publishes. Derived labels (`given`, `core`, `ratchet` state) have no host cell; they live in the
store and are queried.

**Reactivity is the framework's, once per builder.** From the `needs` of the installed plugins
the framework keeps one subscription set: `onCodeChange` (coalesced through one microtask, the
lesson of §4c) for `code`; runtime-sdk `observe` on every cell a declaration names for `value` and
`state`; and its own declaration registry, which grows when a link cell computes. A subject that
is rejected or not computed is an ordinary entry with that state, so it can be annotated and
`core` treats it as not verified.

**Reasoning is a fixed point over facts.** After base facts and every `check`, the framework runs
the `derive` of each plugin in array order, repeating until a full pass adds no fact, capped at 20
rounds; a non-convergent pass becomes an `audit` warning naming the plugin that kept adding. Rules
are JS functions over the fact set, not a rule language. Decided against a solver 2026-09-24 12:1x
after checking the shelf:

```
datascript      1.8.1    470 KB   Datalog, active; EDN-ish query strings
datalog-ts      0.6.6    1.8 MB   last release 2024-01
cozo-lib-wasm   0.7.6   12.3 MB   stratified negation + aggregates; last release 2023-12
eyereasoner     21.1.24  1.9 MB   N3 rules, active
n3              2.7.12   826 KB   RDF store, no rules
```

The `core` rule weighs evidence kinds, thresholds at 1.5, checks anchoring and reads hashes; in a
solver each becomes a fact to join against rather than a line an agent can read. Facts stay
entity-attribute-value with provenance so datascript can be dropped in as the query layer if the
rule count passes about ten or an agent starts writing rules.

**Query.** `A.query("x")` returns a cell's facts and labels; `A.query({label: "core"})` the cells
carrying a label; `A.query([["?c", "label", "core"], ["?c", "dependsOn", "?d"]])` a pattern join.
The store is also one hidden variable in the module so `watch_variable` over the pairing channel
and an in-page hook (robocoop-5's `task_complete` guard is the model) read the same object.

**Views.** Link nodes, `A.summary()` and `A.audit()` subscribe to the store. Summary and audit
rows carry a lopepage-url anchor to the cell (`linkTo` with an `open` intent and a `#cell`
target; whether lopepage-2 scrolls to the cell is checked in §5 step 5).

**Plugins to ship.** Lint family: `lint` (rules over compiled source), `tested` (state of the named
`test_*` cells and whether they depend on the subject), `documentedBy` (schema demo: range is a
markdown cell), `contract` (a predicate cell over the subject's value). Evidence family, the df34
rules ported as rules over facts: `given` (derived), `evidence` (declared, recorded with the hash
it was taken against), `crossing` (two paths agree on a value), `core` (the fixed point),
`ratchet` (fails when the core shrinks or a core cell's hash moved without new evidence, against a
baseline recorded in one cell). Reductions: `summary`, `audit` (schema violations, unnamed link
cells, links naming cells that do not exist, non-convergence).

**Extension points noted, not built.** A code-metric labeller (`needs: ["code"]`, import
`@tomlarkworthy/code-metrics`, never copy it); edge contracts on `(y, dependsOn, x)`; export of the
fact set as JSON-LD or Turtle (a serialiser, since ids are persistent).

## 3. Iteration 1, as built (kept as the record)

Module `@tomlarkworthy/reactive-annotations` in
`lopebooks/notebooks/@tomlarkworthy_reactive-annotations.html`, exported 10:57, 3.94 MB. Links by
string name, `A.documentedBy("sum", "sum_doc")`, each returning a node with `value`, `toJSON()`,
`data-ra-*` and an embedded JSON block; relations as plugins with `check`/`watch`; `summary` and
`audit` as reductions; a per-node live layer (observe, `input` listeners, 300 ms poll, coalesced
code listener, storm guard). A real finding, quoted from a rejection message:

```
{"relation":"typedBy","subject":"probe","objects":["isPositive"],"pid":"_sr0div","hash":"_1ndgh0z",
 "ok":false,"summary":"-1 violates isPositive","detail":null,"warnings":[],"at":1790239491602}
```

What it got right and iteration 2 keeps: the builder finds its own cell by value identity so the
user writes no module ceremony; string names, so no dataflow edges; the node contract; `audit` as
the misconfiguration plugin; `hash` in every finding.

What it got wrong: the relations were the lint family only; the live layer was a second scheduler
beside the runtime (three defects below); reductions discovered links by walking `_outputs`.

## 4. Verified, and what it cost (iteration 1)

Live tab and cold boot, 10:44 and 11:05, all 14 `test_*` cells fulfilled, judged by `_promise`:
`test_documentedBy_links_a_markdown_cell`, `test_testedBy_checks_dependency_and_state`,
`test_typedBy_applies_the_predicate`, `test_typedBy_follows_a_value`, `test_lint_default_rules`,
`test_missing_subject_warns`, `test_summary_reduces_every_annotation`,
`test_audit_reports_misconfiguration`, `test_node_is_machine_readable`,
`test_custom_relation_plugin`, `test_builder_outside_a_cell_warns`, `test_no_recompute_storm`, plus
the fixtures `test_sum_adds`, `test_unrelated`. Cold-boot check output:

```
{notOk: [], stormy: [], audit: "10 annotations over 21 cells: 1 documented, 2 tested, 2 typed, 3 linted",
 summary: "9 annotations: 6 ok, 1 failed, 2 warned, 0 unknown"}
```

Opened in a fresh headless Playwright Chromium at 11:05: H1, markdown, every annotation node with
its glyph and warnings, test values. Not tried by a human. `lope-browser-runner.ts --run-tests`
mislabelled the module and reported TIMEOUT for fulfilled cells; not used.

**(a) Reductions watching each other looped.** The page wedged, MCP calls timed out, nothing had
been exported. Fix: reductions never watch reductions; a node dispatches `input` only when the
serialised finding changed; a guard at 30 computes per second.

**(b) A version poll misses a mutable.** Setting `probe` does not bump `_version` on the derived
variable: `before {probe: -1, probeV: 1}, after $0.value = 1: {probe: 1, probeV: 1}`. The poll
compares `[_version, _value, _error]`. Driven by hand: `init 0 ms, bad 55 ms, good 108 ms`.

**(c) Cold boot stormed every watching node; a live edit did not.** Four async tests pending after
reload; `_promise` gave the cause (`_error` stays undefined on a rejected cell nobody observes):

```
test_no_recompute_storm            rejected  expect(received).toBe(expected) Expected: false Received: true
test_testedBy_checks_dependency…   rejected  did not settle: {…"recomputed 31 times in a second …
                                             this node stopped watching"…}
```

The sdk's `check_for_code_change` diffs `runtime_variables` against an empty previous map on its
first tick, so a 67-module boot delivers one "added" event per variable; each event resubscribed,
and `observe`'s catch-up replay (`scratch/rsdk.js:360–372`) fired `fulfilled` again. Fix: one code
listener per consumer, a dirty flag, every signal through one microtask `schedule()`. This is the
subscription design iteration 2 keeps, once per builder.

**(d) Export hazards.** `create_module` then `define_cell` says "Module not found" until a variable
is added (`cc_find_module` reads `viewof currentModules.value`). Export dropped seven `v.import(`
bridge lines (imports defined after references); repaired in-page and checked with
`lope-reader.ts --get-module … | grep -c 'v.import('` = 7. Root cause found and fixed in iteration
2, §6(g). Every export from the headless host bakes
the pairing token and the host's layout; `scratch/ra-patch-export.py` rewrites the hash, orders
`mains` (`lopepage-2` first) and strips the token. **`"headless": true` in bootconf is
load-bearing**: I deleted it as host residue and every DOM-valued cell in every pane rendered as
`▸HTMLDivElement {}` (`quick_start.html` in the same browser rendered normally). The bootloader
reads `const observer = conf.headless ? () => ({}) : __ojs_observer` (line 4804 of the export);
without the flag its Inspector adopts each node first and the pane Inspector falls back to the
object view. Two dead ends before that reading: pinning editor-5's `__attachMenu` to `false` gave
an empty pane (the cell rows are its attached editors), and stripping the prerender changed nothing
(it was a snapshot of the same defect). Export early: (a) cost every cell defined up to then.

## 5. Build sequence (iteration 2), each step with its check

All six steps done 2026-09-24 (§6). Step 4's regression net, written by an Opus subagent
13:27–13:31 and re-run by me at 13:34:

```
bun test tools/reactive-annotations/core-fixtures.test.ts     8 pass, 0 fail, 40 expect() calls
```

It boots the extracted module headlessly with `notebook-import.ts`, seeds each fixture as facts
(`dependsOn`, `label given`, `role deliverable`, `freshEvidence` per attestation, read the way
`check-core.py` reads them), and compares the derived core with `expected.core`. Findings, none of
which the fixtures contradict:

- Neither `core()` nor `core({anchored: true})` matches all eight. The test turns anchoring on
  where `check-core.py` does (seed roots set and bundle ≥ df33); with it always on, 4 fixtures
  fail; with it always off, only ah turn 5 fails. Only ah turn 5 exercises anchoring. R6 makes
  anchoring depend on seed roots; the plugin takes it as an option, so the caller decides.
- ah turn 5 (recorded under df33) differs by one cell, `lombScargle`, blocked as "no REAL-ANCHORED
  evidence beyond a null …"; the fixture's own notes predict this df34 difference and the test
  lists it as expected.
- Departures from `core-rules.md` that the fixtures do not reach: `evidence` marks every executed
  null real-anchored without checking that its inputs read task data; `given` has no seed-root
  demotion (R4), so R8's first blocked sentence never appears; only the module's own cells are
  considered (R7 includes imported upstreams); the fact store's duplicate-drop means an evidence
  cell attested reference → null → reference reads as null latest.
- To boot headlessly the test sets `globalThis.window`, and `html`/`md` must return an object
  (the builder assigns `value` on the result). Seeds alone label nothing: `core` walks the
  builder's `cells` map from the holder's module scope, so the test plants a fake holder variable
  with one fake variable per fixture cell.
- `module.js` is a generated extract (gitignored); spawning `lope-reader` inside `bun test` fails
  in the sandbox with `EBADF`, so the test falls back to the existing copy and prints the command.

1. **Fact store and runner.** `Facts` (add, match with `?vars`, join), base-fact seeding from the
   runtime, the fixed-point runner with strata and the 20-round cap. In-notebook `test_*`: a
   two-rule derive converges; a rule that always adds a fresh fact hits the cap and produces the
   audit warning naming it.
2. **Builder, declarations, subscriptions, views.** `annotations(plugins)`; link cells register
   declarations; one subscription set from `needs`; publish; nodes repaint. Test: redefining the
   subject of a `lint` link changes the finding (this was never tested in iteration 1); a
   rejected subject shows `state: rejected` in `A.query`.
3. **Lint family ported**: `lint`, `tested`, `documentedBy` (with schema), `contract`. Tests carried
   over from iteration 1 where they still apply.
4. **Evidence family from the df34 rules.** An Opus subagent (started 12:46) is extracting the
   rules from `crossTools` with line ranges into `tools/reactive-annotations/core-rules.md` and at
   least five ledger states with their recorded `core_status` into
   `tools/reactive-annotations/fixtures/`. `given`, `evidence`, `crossing`, `core`, `ratchet` as
   rules over facts. Regression net: a node test loads the module headlessly with
   `tools/notebook-import.ts`, feeds each fixture as facts, and asserts the same core membership
   and blocked sentences the dump recorded.
5. **Summary and audit with fix links.** lopepage-url anchors per row; check whether lopepage-2
   scrolls to a `#cell` target and record the answer here.
6. **Export**, `scratch/ra-patch-export.py`, cold boot in a fresh Chromium, all tests by `_promise`.

## 6. Iteration 2, as built and verified

Module `@tomlarkworthy/reactive-annotations`, same notebook, exported 13:25, 3,967,467 bytes after
`scratch/ra-patch-export.py`; module block 60,873 bytes. Cells, in order: `raFacts`, `raHelpers`,
`defaultLintRules`, `ensureStyle`, `annotations`, `raRender`; plugins `lint`, `tested`,
`documentedBy`, `contract`, `given`, `evidence`, `crossing`, `core`, `ratchet`, `summary`, `audit`;
the demo (`A`, `readings`, `total`, `total_alt`, `mean`, `messy`, `broken`, `isPositive`,
`total_doc`, `total_null_check`, eleven link cells, `viewof graph = A.graph`, `labels`, `report`,
`config`); 17 `test_*` cells; three import cells last.

**Cold boot, fresh headless Chromium, 13:2x**, judged by `_promise` on every `test_*` cell:

```
{count: 17, notOk: [], labels: {raFacts: ["given"], raHelpers: ["given"], given: ["given"],
 readings: ["given"], total: ["core"]}, rounds: 2, findings: 12}
```

No console errors; the four failed requests were blob aborts and a `.mov` from the pairing module's
docs. The same 17 pass in the live tab after the export (18 with §6(g)'s new pairing test).
`total` is core from crossing + null = 2 ≥ 1.5; `mean` and `total_alt` are blocked with "2 more
evidence cell(s)"; `broken` carries `state: rejected` and `error: deliberately rejected`; the
ratchet reads "1 held, 0 lost, 0 moved, 0 gained"; the audit has no hard notes; the summary's first
chip links to `#open=@tomlarkworthy/reactive-annotations#total`. Editing `messy` over the channel
re-linted it in one publish (store version 26 → 27). Not tried by a human.

**Two labels the rules give that a reader may not expect**, both consequences of R4 and kept:
`raHelpers` and `raFacts` are `given` (zero non-builtin inputs and the cell returns an object, not
a function); the `given` plugin cell is itself `given` because its source contains the DATA_RE
text and R4 is an OR on a source match.

**Defects found while building, with the fix** (all in the framework cell unless said):

- (a) Free identifiers `EventTarget`, `queueMicrotask`, `Event` became placeholder cells over the
  channel. `window.X` throughout.
- (b) `broken` reported `pending` and was labelled `given`. `_error` is undefined on a rejected
  cell nobody observes; the errors now come from the `observe` callbacks into a Map, and `given`
  skips a rejected subject.
- (c) The audit listed its own holders (`report`, `config`, `core_ratchet`) as uncovered: reductions
  ran in cell order, so audit ran before ratchet and summary had findings. Reductions now run in
  plugin order, and a reduction's own holder counts as covered.
- (d) Crossing counted `readings` as a shared non-given upstream, because labels are derived after
  checks. Independence is judged structurally: a shared leaf (no `dependsOn`) is data.
- (e) Import cells produced self-loop `dependsOn` facts. No `dependsOn` for `_type === 2`
  variables (which turned out to be the wrong test for "import", see (g); it held only because the
  bridges in the live tab were type 2 for the reason given there).
- (f) `test_total_matches_alt` stayed pending: `expect(...).toBe()` returns undefined and a test
  cell must return a value. It returns `total`.

**(g) Cold boot failed: every test threw `expect is not defined`.** The export had the three
`main.define("module @…")` lines and zero `v.import(` bridges, and no `$def` for `raRender`. Read
from the live runtime after redefining the imports:

```
runtime   _type 2  inputs [runtime from another module]  def identity
expect    _type 2  inputs [expect  from another module]  def identity
navHref   _type 1  inputs [navHref from another module]  def identity
```

`@observablehq/runtime/src/variable.js:8`: `TYPE_IMPLICIT = 2; // created on reference`. The
pairing module's `cc_handle_define_cell` and `cc_handle_define_variable` looked up
`mod._scope.get(name)` and redefined whatever they found, so a name referenced before it was
defined kept its implicit variable and its type; exporter-3's `module_specs` keeps
`v._type === 1 || isModuleVar(v)` (scratch/.exp3.js:1799) and dropped them. `navHref` survived
because nothing had referenced it before its import on that boot. Iteration 1's "seven dropped
bridges" (§4d) was the same defect. Fix in `@tomlarkworthy/claude-code-pairing`: redefine in place
only when the existing variable is `_type === 1`, otherwise define a fresh variable and let the
runtime rewire the references (variable.js:165–169). Guarded by
`test_define_cell_over_an_implicit_reference` in that module: reference `x` before it exists,
define `x = 41` through the handler, assert `_type === 1` and that `y` follows to 42. Result live
and after reload: `"ok"`. Pushed with `sync-module` to the canonical
`lopecode/notebooks/@tomlarkworthy_claude-code-pairing.html` (34 insertions, 16 deletions) and to
this notebook (updated=2, `lope-sync status` clean). `lope-preflight --baseline` reports NEW
findings only in other modules bundled into the new notebook (svg-lens 20, annotate 2,
robocoop-5-srctools 2, import-wizard-js 1) and in two notebooks other sessions have uncommitted
work in; none in the two modules changed. Every other consumer of `claude-code-pairing` in the
corpus still carries the bug until the next `--all-canonical` sweep.

### 6.1 Fluent declarations (added 13:49)

Tom, after the first report: "it would be useful to be able to do more than one link in a single
cell, so the API should be fluent". Every link call now returns a **group node** that carries the
plugin methods, so calls chain, and `A.on("x")` binds the subject once:

```js
total_links = A.on("total")
  .lint()
  .tested("test_total_matches_alt")
  .documentedBy("total_doc")
  .contract("isPositive")
  .crossing("total_alt")
  .evidence({ kind: "null", evidence: "total_null_check", hash: "_1wvll3p", rows: total_null_check })
others = A.lint("messy").lint("broken").contract("broken", "isPositive")
```

The group is the cell's value, so holder attribution (`heldBy`, the dead-declaration sweep, the
audit's holder set) is unchanged: every declaration records the group as its `node` and paints
into its own child `.ra`. `value` is the finding when the cell holds one link and an array when it
holds several; a plugin id that collides with a DOM property or a group method (`link`, `on`,
`dispose`, `recompute`, `toJSON`, `value`) throws at construction. Plugins without a subject
(`ratchet`, `summary`, `audit`) ignore the bound subject. The nine single-link demo cells became
the two above; `test_fluent_chain_holds_several_links` asserts six children, six findings all on
`total`, three subjects on `others`, and that a single link is still one finding.

Cold boot of the 13:49 export (3,970,359 bytes), fresh headless Chromium: 18/18 tests, groups
render `[6, 3, 1, 1, 1]` children, labels and 12 findings unchanged, 2 rounds. The first cold boot
after the change failed one test: `test_summary_links_to_cells` read the first anchor in the
report and expected `#total`, but on a cold boot `others` evaluates before `total_links`, so the
first row was `messy`. Summary rows follow declaration order, which is evaluation order and differs
between a live edit and a boot; the test now looks the anchor up by target. Cells defined over the
channel land at the end of the module, so `raRender`, the two chain cells and the new test were
moved into place by rewriting `runtime._variables` order in one eval before exporting.

### 6.2 Rendering through the notebook's own components (added 14:05)

Tom, after the fluent report: "we are inventing our own UI component system instead of reusing the
existing one (which is theme aware)". `ensureStyle` carried nine hard-coded colours (`#2a9d3f`,
`#d33`, `#e6a100`, `#888`, `#b57600`, four `rgba(128,128,128,…)` greys) and its own table, chip
and details CSS; `raRender` and `summary.view` built `<table>`s by hand. The house convention for
this kind of view is the `tests` cell of `@tomlarkworthy/tests`: `Inputs.table` with `layout:
"auto"`, `rows: Infinity`, emoji status glyphs in a `format`, plain `<a>` links.

Changed, three cells:

- `ensureStyle` is layout only. Every colour is a notebook-kit token: border
  `--theme-foreground-fainter`, fail border `--theme-error`, muted text `--theme-foreground-muted`,
  labels on `--theme-foreground-faintest`. Links take `a[href] { color: var(--theme-foreground-focus) }`
  from global.css and cell names sit in `<code>`. The stylesheet is replaced when its text changes,
  so a hot edit no longer keeps the old one (the first live check read `rgb(221, 51, 51)` off the
  stale `#ra-style` until it was removed).
- `raRender.table(rows, opts)` is `Inputs.table(rows, { select: false, layout: "auto", rows:
  Infinity, columns, format })` with one `format` per column: booleans as ✅/❌, arrays joined,
  strings that name a cell as chips in the columns `cell subject test object objects evidence doc
  contract cells` only (a `relation` column holds `lint`, which is also a cell, so a column-blind
  chip would link the relation to the plugin cell). Status glyphs are the tests module's: ✅ ❌ ⚠️,
  ⌛️ for a finding with no verdict yet. Plugin views receive `{ store, chip, table, glyph }`;
  `raRender` now depends on `Inputs`.
- `summary.view` maps its rows to `cell relation objects status summary labels` and hands them to
  `table`, with `glyph` for status.

Kept: the `.ra` / `.ra-group` classes, `data-ra-*` attributes, the hidden `.ra-json` script,
`a.ra-cell` on chips (the selector `test_summary_links_to_cells` uses), `value`/`toJSON`. No test
changed.

Two things the theme cannot do, decided rather than styled around: there is no green or amber
token in notebook-kit's theme set (`--theme-error` is the only status colour), so status is carried
by the glyph and only `fail` colours the border; and the vendored `@observablehq/inputs` in this
notebook is an un-namespaced build (`form.__ns__ __ns__-table`, 43 `__ns__` rules in
`document.styleSheets`), so the shipped `.inputs-3a86ea-table thead th` theme override matches
nothing here. That is the corpus-wide state the `tests` module renders in too, not something this
module should patch.

Verified 14:04: live 18/18 after each of the three updates; export 3,970,379 bytes after
`ra-patch-export.py` (57 cells, 7 import bridges, `raRender` deps `raHelpers,html,navHref,Inputs`,
no hex colour in the module); cold boot in a fresh headless Chromium 18/18, report holds one
`form` with 13 rows, `a.ra-cell[href$="#total"]` computes to `rgb(129, 169, 246)` (`#81a9f6`, the
focus token), fail border `rgb(231, 4, 15)` (`#e7040f`), no `#` literal in `#ra-style`. Screenshot
of the `total_links` and `others` groups taken in that boot.

**Detail folds unless the finding failed (14:20).** Tom: "detail is open by default but probably it
should be only open if there is a failure". The first attempt, `<details open=${ok ? undefined :
true}>`, changed nothing: the module's `html` is the Observable stdlib template, not htl, and it
stringifies the hole, so the live DOM read `<details open="undefined">` and `.open === true` for
every finding. The earlier `open=${plugin.reduces ? true : undefined}` had been open for the same
reason, which is the behaviour Tom saw. `raRender` now builds the element and sets the `open`
property (`fold(label, inner)`, also handed to plugin views; `summary.view` uses it). A live check
after the cell edit still showed every detail open because `paint` skips a finding whose key has
not changed; redefining `A` re-rendered them. Cold boot of the 14:20 export (3,970,563 bytes):
18/18, `details.open` is `true` for `lint messy` and `summary` (both `fail`) and `false` for the
six `ok` findings.

### 6.3 One entry point: `A.subject(s)`, `.assert(p, o)`, `predicate` (added 15:39)

Tom, after 6.2: "as the model is triplets, these should be a simple A.assert(...) for a fact. We
have two syntaxes going on … the fluent way is so much nicer that wins. However, the term "on" is
confusing … we should just say "subject", we have a bit too many names for what it is. Is there
prior art we should align with?"

Prior art checked before renaming: Turtle predicate lists (`:s :p1 :o1 ; :p2 :o2 .`) are the
subject-once form in RDF's own serialisation; Jena's `Resource.addProperty(p, o)` returns the
resource, so it chains; Datomic, Prolog and CLIPS all call adding a fact *assert*; RDF/JS,
N3.js and rdflib.js keep a flat `add(s, p, o, graph)` with provenance in the fourth slot, which
is what `{s, p, o, by, hash, at}` already is. Nobody says "on".

Changed:

- `A.subject(name)` replaces `A.on(name)`. The subject-first shortcuts (`A.lint("x")`) and the
  public `A.link` are gone; the plugin methods live on the subject-bound group only. Plugins with
  `subject: false` (`ratchet`, `summary`, `audit`) stay on `A` because their subject is the
  module; `A.subject()` with no argument is the same node.
- `.assert(predicate, object)` on a group adds a fact no plugin computes. It is a pseudo-plugin
  `assert` (`literal: true`) so it goes down the same `declare` → `runCheck` path: the fact is
  `{s: subject, p: predicate, o: object, by: "assert"}`, the finding is `ok: true`, the object is
  not resolved to a cell. `runCheck` now carries a per-declaration predicate (`d.predicate ||
  p.id`). Calling it without a bound subject throws.
- The finding field `relation` is `predicate` everywhere: findings, `pending`, summary and audit
  rows, `data-ra-predicate`, every test. The reserved-id probe is now `assert subject dispose
  recompute toJSON value`.
- Vocabulary in prose and comments: fact, subject, predicate, object, finding. "link" and
  "declaration" are gone from the public surface (`total_links` → `total_facts`, `others` →
  `messy_lint` + `broken_facts`, the fluent test → `test_subject_chain_holds_several_facts`).

Applied as a text rewrite of the compiled module (`scratch/ra-subject-rename.py`, every
replacement asserted to match exactly once) written straight into the notebook's `<script>` block,
because the module is not a declared canonical and the block is plain JavaScript; `node --check`
on the result, and `lope-reader --get-module` byte-equal to the file written. Two live failures
followed from the new `owner` fact and were fixed: the audit resolved the literal `tom` as a cell
(`kind: "missing"`; it now skips objects of a literal plugin), and `test_graph_is_a_watchable_cell`
counted 12 findings, now 13. The fixture test had been broken since 6.2 without my noticing:
`raRender` depends on `Inputs`, which the headless overrides did not supply; a stub `Inputs.table`
fixes it, 8/8.

Verified 15:39: a `location.reload()` of the edited file in the headless host is a cold boot from
disk — 18/18, 13 findings, audit `ok` with only `uncovered` rows, `A` exposes `subject ratchet
summary audit query facts snapshot recompute plugins api graph`, the `owner` fact is
`{s: "total", p: "owner", o: "tom", by: "assert"}`. No export was needed, so no patch step.

### 6.4 Renamed: code facts (added 16:45)

Tom: "is annotation the right title for this work? Is there something better? Code facts/labels?
Is there prior art?" and, mid-way, "drop the @ from the prefix of the filename because that breaks
save-in-place as well".

Prior art for a fact graph about code with derived predicates: Glean ("collecting, deriving and
querying facts about source code"; predicates with schemas, derived facts), Kythe (nodes, edges,
facts), CodeQL/Doop/Soufflé (Datalog over extracted facts, rules to a fixed point), in-toto
attestations (`{subject, predicateType, predicate}` keyed by digest), Wikidata statements (claim +
references). Three of five call the unit a fact; the API already said `assert`, `facts()`,
`query`. "Annotation" is the Java sense of the word and structurally right, but this corpus already
uses it twice for text notes (`@tomlarkworthy/annotations`, `@tomlarkworthy/annotate`). "Labels"
names only the derived subset. "Attestations" fits the hash-anchored facts and robocoop's `attest`
but not lint, documentedBy or derived labels. Facts is the superset.

Renamed, 2026-09-24 16:45:

| was | is |
|---|---|
| `@tomlarkworthy/reactive-annotations` | `@tomlarkworthy/code-facts` |
| `lopebooks/notebooks/@tomlarkworthy_reactive-annotations.html` | `lopebooks/notebooks/tomlarkworthy_code-facts.html` (no `@`; the file was untracked, so a plain move) |
| builder cell `annotations` | `facts` (`A = facts([lint(), …])`) |
| `ra` prefix: `raFacts raHelpers raRender`, `.ra .ra-cell …`, `data-ra-*`, `#ra-style` | `cf` (`cfFacts cfHelpers cfRender`, `.cf .cf-cell …`, `data-cf-*`, `#cf-style`); 83 tokens |
| `tools/reactive-annotations/` | `tools/code-facts/` |
| `plan/reactive-annotations.md` | this file |

`A` stays as the demo's handle. `A.facts()` (the fact list) and the `facts` builder cell are
different namespaces and did not collide, so the accessor kept its name. "Reactive" moved from the
name to the description; it is the difference from Glean, not the concept.

Applied by `scratch/ra-to-code-facts.py` on the compiled module text and the surrounding HTML
(`<title>`, `og:title`, bootconf `mains` and `hash`, the block id), each replacement asserted;
`node --check`, block byte-equal to `lope-reader --get-module`. One trap: BSD `sed` has no `\b`,
so the fixture test's `annotations` → `facts` rename silently did nothing until redone with perl.

Verified 16:45: fresh headless host on the new file (a cold boot from disk), 18/18,
`document.title` "Code facts", 13 `.cf` nodes and 0 `.ra`, summary link
`#open=@tomlarkworthy/code-facts#total`; fixture test 8/8.

## 7. Not in this iteration

- The robocoop-5 df35 port itself (rewiring `attest`, `core_status`, the guards, deleting
  `ledger.mjs`). Step 4's fixtures are its regression net; the port is the step after.
- Cross-module links (one hop over import bridges). `resolve` is still per module.
- A code-metric labeller, edge contracts, JSON-LD export. Listed in §2 as extension points.
- Editor gutter badges.
