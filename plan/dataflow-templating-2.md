# dataflow-templating v2 — instantiate into a sandbox runtime

Status: **shipped 2026-08-09**, merged to `main` (the work happened on branch `cd-editor5`).
All four `cloneDataflow` consumers migrated; `cloneDataflow` kept and still exported. See
§ "Shipped" and § "The other three consumers" at the end — the design sections above are as
written before the work and are left that way on purpose.
Supersedes the `compileDataflow`-replaces-`cloneDataflow` idea recorded in
`plan/compile-dataflow.md` § "Field test", which was measured and rejected — see § "Why not
compileDataflow" below.

## The problem, measured

`cloneDataflow` defines its clones **into the module it copied from**
(`modules/@tomlarkworthy/dataflow-templating.js:305`):

```js
const cloneNameOf = (v) => `dynamic ${sanitize(v._name)} ${uid}`;
const t = v._module.variable(observerFactory(v._name)).define(cloneNameOf(v), inputs, v._definition);
```

Every clone is therefore a variable in the primary runtime. Measured 2026-08-09 on
`worktrees/cd-editor5/lopecode/notebooks/@tomlarkworthy_editor-5.html` (md5
`3561b36fbafb71e3b2d23ec379898d99`), headless Chromium, at rest with 135 cell shells and 3 open
panels:

```
runtime._variables           3107
  of which `dynamic ` clones  862   (28%)
modules                        44
```

Opening one editor panel, with `rt._variables.add/delete` instrumented and a counter subscribed
through `onCodeChange`:

```
new variables      21
set mutations      21
code-change events 21   <- every one previous:null, every one a `dynamic ` clone
real code changes   0
registered listeners 7  -> 147 callback invocations for one click
```

### What this does *not* cost

`check_for_code_change` (`modules/@tomlarkworthy/runtime-sdk.js:148`) rebuilds a Map of per-variable
snapshots on every mutation of `runtime._variables`. Timed over 20 iterations:

```
with clones (3107 vars)     0.33 ms
clones removed (2245 vars)  0.19 ms   -> 78% relative, 0.14 ms absolute
```

and `observeSet` debounces through `setTimeout(0)`, so a burst of 21 mutations coalesces into one
pass. **CPU is not the argument for this change and should not be used as one.** An earlier draft
of this plan claimed a performance win before measuring; that claim was wrong.

### What it does cost

Seven modules carry a hand-rolled guard against clone variables leaking into them:

| file:line | guard | consequence if removed |
|---|---|---|
| `exporter-3.js:951` | `isDynamicVar` | clones serialised into exported notebooks |
| `local-change-history.js:1353,1355` | two prefix checks | 21 bogus history entries per panel open |
| `cell-map.js:293` | `continue` | clones become phantom cells |
| `lopepage.js:113` | name filter | clones render in the cell list |
| `lopepage-2.js:257` | name filter | as above |
| `module-map.js:541` | `dynamic observe ` only | see below |
| `modules.js:224` | `dynamic observe ` only | see below |

The last two filter only the narrower `dynamic observe ` prefix, so the other ~855 clones still
reach `module-map`'s candidate set and `modules.js`'s title inference. Both also gate on
`v._type != 1`, which clones satisfy (`TYPE_NORMAL`), so they are not excluded that way either.
**Unverified**: whether that produces a user-visible defect. Not chased — flagged here because a v2
that removes the leak makes the question moot.

The contract binding those seven sites is a string prefix chosen inside `dataflow-templating` and
invisible from every call site. Two of the seven (exporter, history) are correctness guards, not
cosmetics.

**The argument for v2 is that it deletes all seven guards and removes the way to forget the
eighth.** Not speed.

## Design

One sandbox `Runtime` shared by the whole page; one `Module` per instance inside it.

```js
const instance = instantiateDataflow(variables, {
  params:    { "viewof editedCell": someVariable },   // injected, resolved before the body runs
  observers: (name) => ({ fulfilled(v) { ... } }),    // same shape as cloneDataflow's 2nd arg
});
instance.value("hotbar_shell")   // Promise of the first settled value
instance.variables               // Map<name, Variable> — caller may observe directly
instance.dispose()
```

`observers` keeps the same signature as `cloneDataflow`'s `observerFactory` deliberately, so the
editor-5 diff is `cloneDataflow(t, f)` → `instantiateDataflow(t, {observers: f})` and the two can
be A/B'd against each other on the same page.

### Why a separate Runtime rather than a separate Module

`_variables` is a **Runtime**-level Set (`vendor/observable-runtime/src/runtime.js:22`), not a
module-level one. A fresh `Module` in the primary runtime buys unmangled names and tidy disposal
and nothing else — every one of the seven guards would still be needed. Escaping them requires a
second `Runtime`. This was the correction that produced this plan.

### Captures cross the runtime boundary through one bridge per name

Body variables reference names that are not in the template — module cells, builtins, imports.
`cloneDataflow` gets these free by leaving the input name unmangled so it resolves in the shared
module scope. Across runtimes that is unavailable, so each captured name needs an explicit
one-way live edge.

The bridge is a single variable in the **primary** runtime per `(template, capture name)`, shared
by every instance of that template, refcounted:

```js
originModule.variable({ fulfilled(v) { push(v) }, rejected(e) { pushErr(e) } })
            .define(`dynamic bridge ${name} ${uid}`, [name], (x) => x);
```

and on the sandbox side the same name is defined as an async generator that yields on each push,
so the runtime's own generator handling (`variable_generate`) does the propagation.

Arithmetic for editor-5's shell: today 132 instances × 6 clones = 792 variables in the primary
runtime. After: `K` bridges where `K` is the number of distinct captured names for the shell
template, independent of instance count. That ratio is the whole point of sharing bridges per name
rather than per instance — a per-instance bridge would be strictly worse than the status quo.

**Cost, stated up front:** a bridge adds one frame of latency (the runtime pulls the next
generator value via `_precompute`) and is one-way. A template whose body writes back to a captured
`mutable` will not work. cloneDataflow supports that today, so this is a genuine regression in
expressiveness and must be checked against editor-5 rather than assumed harmless.

> **This paragraph is wrong and is kept for the record.** It was written before the bridge existed
> and was never tested; see § "The mutable write-back was not a regression" at the end. The
> latency sentence stands; the `mutable` sentence does not.

### Sentinels are free

`invalidation`, `visibility` and `@variable` are per-variable symbols in `module._builtins`
(`vendor/observable-runtime/src/module.js:15-18`) and are resolved by the runtime for whichever
variable references them. They must **not** be bridged; any runtime provides them. This is the same
`SENTINEL_NAMES` list `tools/compile-dataflow/compile-dataflow.mjs:19` already carries.

### Bridge naming

Bridges are named `dynamic bridge <name> <uid>` so the five guards that test for the general
`dynamic ` prefix already exclude them. `module-map.js:541` and `modules.js:224` test for
`dynamic observe ` and would not — those two should be widened to `dynamic ` as part of this work.
An anonymous (`null`-named) bridge was rejected: `module-map.js:539` has `if (n == null) return
true`, which would make bridges title candidates.

### Template liveness

`cloneDataflow` already re-`define`s a clone whose source `_definition` changed, via
`observeSet(runtime._variables, ...)`. v2 keeps that mechanism unchanged; it is orthogonal to where
the instance lives. `compileDataflow`'s generator handle solves the same problem a different way and
is not needed here.

### Disposal

`Module` has no public delete, so an instance disposes by iterating its own `_scope` and calling
`v.delete()` on each, then decrementing every bridge refcount it holds and tearing down bridges
that reach zero. Unlike v1 there is no risk of leaving variables behind in a module someone else
is walking.

## Why not compileDataflow

Recorded so this is not re-litigated. `compileDataflow` emits straight-line JS where each body
variable becomes a `const` local
(`tools/compile-dataflow/compile-dataflow.mjs:266-305`), so an instance's state is a call frame:
nothing is addressable, nothing recomputes, and anything learned after construction needs a second
compilation with that value as a parameter plus a second call. The editor-5 shell needed exactly
that (`tools/compile-dataflow/editor5-cells.mjs`, commit `a9dbbeb`) and it worked, but it is a
workaround for the missing concept rather than a design. Extending it with retained frames and
incremental re-evaluation was considered and rejected: that is a scheduler, and the runtime already
has one.

`compileDataflow` keeps its own lane — evaluate-to-a-plain-value, `toSource()`, headless extraction
— and lends v2 nothing but its frontier analysis, which v2 does not need because it instantiates
the whole template.

## Plan

1. `tools/dataflow-templating-2/instantiate-dataflow.mjs` — implementation, import-free like its
   compile-dataflow sibling so `make-cells.mjs` can lift it into notebook cells unchanged.
2. Bun tests against `vendor/observable-runtime`, mirroring the compile-dataflow suite. The
   load-bearing one: **primary-runtime variable count must stay flat as instance count grows.**
3. Swap `cellEditor` in a forked editor-5 and re-run the exact probes above. Success is the same
   behaviour with `dynamic ` clone count independent of open panels, and the 21 spurious
   code-change events per panel open gone.

## Field test — editor-5, 2026-08-09

Method: `tools/dataflow-templating-2/make-inject.mjs` lifts `cellEditor` out of
`modules/@tomlarkworthy/editor-5.js` and changes **one identifier**, `cloneDataflow` ->
`cloneViaSandbox`, where `cloneViaSandbox` presents cloneDataflow's exact signature on top of
`instantiateDataflow`. Anything that moves is therefore the templating implementation, not a
rewrite of the caller. Injected into a live page over loopback; the notebook file was never
written (md5 `3561b36fbafb71e3b2d23ec379898d99` before and after).

The page keeps its 132 pre-existing v1 editors, so both implementations are measured **in the same
session against the same runtime** — the control is not a separate run.

Cost of one editor, built and its heavy panel opened:

```
                        primary vars   code-change events
v1 (existing editor)         +21              21
v2 (new editor)                0               0
```

The v1 row was captured by clicking an on-page editor open during the same session
(`dynamic editor_panel ` count 3 -> 4, `runtime._variables` 3146 -> 3167), so it is the same
measurement as the baseline and not a recollection of it.

One-time cost, amortised across every instance: **36 bridges** for the shell and panel templates
combined — `Generators`, `Inputs`, `htl`, `html`, `findCell`, `persistentId`, `createCell`,
`compile_and_update`, `replaceCodeMirrorDoc`, `decompile`, `cellsToClipboard`, … Break-even against
v1's 6 variables per shell is at 6 editors; this page has 132.

Functional checks, all on v2-built editors:

- shell renders `⠿➕edit`, toggles open/closed, body shows and hides
- heavy panel builds with a live CodeMirror carrying the right source, and the full toolbar
  `⬆ ⬇ 🗑️ ➕ ▶️ 📄📄 📄 📋`
- real keystrokes through Playwright land in the CodeMirror document
- **▶️ apply works** — edited a scratch cell `qa_probe_cell = 1` to `= 42` and clicked run; the
  primary runtime's variable was redefined (`function _qa_probe_cell() {return (42);}` in the
  change history) and `module.value()` returned `42`

That last one settles the question this design was most likely to fail: the panel lives in the
sandbox, `command_processor` lives in the primary runtime, and the bridge is one-way. The write
path does not go through the bridge, so it is unaffected.

- teardown is clean: closing the panel drops the sandbox from 7 modules to 6, disposing the editor
  to 5, bridges stay at 36 (still held by other instances — refcounting works)
- console: zero errors, only the `@import` warnings from `themes` and an aborted `.mov` that are
  present on the unmodified page too

Two bugs found and fixed by the tests rather than by reading:

- `variable.delete()` on a variable that still has outputs does **not** free its scope entry —
  `vendor/observable-runtime/src/variable.js:129-137` substitutes a fresh implicit variable so
  references stay wired. Disposal now deletes in reverse order and then sweeps.
- `runtime._modules` is keyed by the `define` function and only records `runtime.module(define)`,
  so anonymous instance modules never appear there. Instance counting is kept separately.

`bun test tools/dataflow-templating-2/instantiate-dataflow.test.mjs` — 12 pass.

## The gate — every editor v2 from boot, 2026-08-09

The field test above measured editors built *after* a runtime swap. This run bakes the change into
the module (`tools/dataflow-templating-2/bake-editor5.mjs`: three cells appended, `cloneDataflow` ->
`cloneViaSandbox` in `cellEditor`'s signature and both call sites) and syncs it into a throwaway
copy, so all 135 editors are v2 from boot. The canonical was not written — md5
`3561b36fbafb71e3b2d23ec379898d99` throughout.

```
                        v1 canonical    v2 baked
runtime._variables            3107          2291
  `dynamic ` clones            862             7   (all `dynamic observe `, not from cellEditor)
  bridges                        0            36
editorModule._scope           1031           215
sandbox modules                  0           138
editors on page                132           135
```

`_scope` is the number that surprised me: 816 of the primary module's 1031 scope entries were clone
names. That is not something the seven guards protect against — they filter *readers*, not the
namespace itself.

### The five untested gestures

`tools/dataflow-templating-2/gestures.js`, the same script run against both arms:

```
                 v1                                   v2
add-cell         anon 0->1, new editor open {}        identical
copy             ran, clipboard length 0              identical
paste            anon 1->1 (no new cell)              identical
cell-link        <a> "md", hash changed, 2 open       identical
drag-reorder     index 0 -> 0, not moved              identical
```

Two of those need care in how they are read. **Copy/paste and drag did not demonstrably work in
either arm** — the clipboard came back empty and the synthetic `PointerEvent` sequence did not move
a cell. That is either a headless limitation or an inadequate probe; what the run shows is that v2
is *not different*, which is the question at hand, not that the gestures work. They remain untested
in the sense of "verified functional".

The whole-run totals show the difference the gestures make:

```
during the gesture run   primary vars      scope
v1                       3107 -> 3420      1031 -> 1343
v2                       2291 -> 2292       215 ->  215
```

### Export round-trip

`exportToHTML({mains: new Map(runtime.mains)})`, POSTed to the loopback server rather than the
Downloads folder, then booted from disk:

```
v1 export  2437413 bytes  mains: [lopepage-2, editor-5, save-in-place]  `dynamic ` x16
v2 export  2449557 bytes  mains: [lopepage-2, editor-5, save-in-place]  `dynamic ` x19, cloneViaSandbox x8
```

The v2 export's 19 `dynamic ` occurrences are exactly its source notebook's 19 — literal strings in
the templating source, not serialised clone variables. Booting it: 135 hotbars, primary 2291, 36
bridges, 138 sandbox modules, zero console errors — indistinguishable from the un-exported page.

**Dead end worth recording.** The first export produced a notebook that booted to a blank themed
page, `"mains": []`. That looked like a v2 regression for about ten minutes. It was not:
`exportToHTML` only fills `mains` `if (runtime.module_names)` (`exporter-3.js`), which is falsy on
this page, so a bare `exportToHTML()` yields empty mains — **and the v1 canonical does exactly the
same**, which is what settled it. A later attempt passed `new Map([...rt.mains].map(([module,
name]) => [name, module]))`, inverting a Map that was already `Map<name, module>`; that call hung
the page — again on both arms. Two self-inflicted failures, both diagnosed only by running the
identical call against v1.

## Not tested

- The 132 existing editors were not migrated; redefining `cellEditor` does not rebuild them, so
  every v2 measurement is of editors built after the swap. A real deployment reloads the page.
- Only 7 sandbox instances existed at once. The behaviour of 132 concurrent sandbox modules is
  still unmeasured — see the open question below, which this field test did not close.
- Drag-to-reorder, copy/paste and the cell-link navigation were not exercised.

## Open questions

- ~~Whether any editor-5 template variable writes back to a captured `mutable`.~~ None does; the
  apply path writes through `command_processor` in the primary runtime, not through a bridge.
  ~~Still true in general: a template that writes to a captured `mutable` will not work.~~ **Not
  true** — tested afterwards and it works in both directions. See the final section.
- ~~Whether builtins resolve correctly in the sandbox.~~ They do, by becoming ordinary bridged
  captures — `Generators`, `Inputs`, `htl` and `html` all appear in the bridge list. The sandbox
  `Runtime` is constructed with no builtins at all and never needs them.
- ~~Whether 135 sandbox modules in one extra runtime cost anything measurable.~~ 138 of them boot
  the page with zero console errors and no observable stall, at the gate and again on the shipped
  path. What is still unmeasured is a *number* rather than a symptom: nobody timed the boot with
  and without, so "costs nothing" is an absence of evidence, not a measurement.

## Shipped — 2026-08-09

Not as a replacement. `cloneDataflow` is untouched and still exported; `instantiateDataflow` and
the `cloneViaSandbox` shim sit next to it, and one of the four consumers moved.

### What landed where

| | |
|---|---|
| `@tomlarkworthy/dataflow-templating` | three cells (`instantiateDataflowFactory`, `instantiateDataflow`, `cloneViaSandbox`), four prose cells, and a new `onCodeChange` import from `runtime-sdk` |
| `@tomlarkworthy/editor-5` | `cellEditor`'s `cloneDataflow` → `cloneViaSandbox`, and the import it arrives on |
| corpus | both modules swept into all 229 notebooks — library first, editor-5 second |
| ObservableHQ | `@tomlarkworthy/dataflow-templating` v1436 → v1446, `@tomlarkworthy/editor-5` v4018 → v4020 |

`bake-editor5.mjs` inlined the implementation into editor-5; that was the gate harness only. The
shipped swap is `migrate-editor5.mjs`, which takes the import.

**The sweep order is not reversible.** editor-5 now imports `cloneViaSandbox` from
dataflow-templating, so a notebook carrying the new editor-5 against an older
dataflow-templating has no `cellEditor` at all. All 229 notebooks embed dataflow-templating, so
this is the whole corpus, not a subset.

### The library verified against itself

The notebook already ships a working `cloneDataflow` example, so the same `template` in the same
page is the control (`tools/dataflow-templating-2/probe-home-notebook.mjs`):

```
                  primary vars   bridges   widget
cloneDataflow           +6          0       DIV
cloneViaSandbox         +8          8       DIV
both dispose back to the 2897 / 565 baseline exactly
```

The 8 are the captures — `Inputs`, `dataset`, `Generators`, `pizzaChoices`, `Plot`, `time`,
`combine`, `htl` — one bridge each, shared and refcounted. **One instance is a loss here**; two
break even. The break-even is per capture-count, not a constant, and this example has more
captures (8) than editor-5 has clones per editor (6).

`params` has no `cloneDataflow` equivalent. Injecting `pizzaChoice = "Hawaiian Pizza Medium"`
produced `chart` FIGURE / `widget` DIV with zero diagnostics.

### editor-5 re-measured on the shipped path

`tools/dataflow-templating-2/probe-editor5-shipped.mjs`, on the canonical, 132 hotbars:

```
                        v1 canonical    shipped
runtime._variables            3107         2297
  `dynamic ` clones            862           43   (36 bridges + 7 `dynamic observe `)
editorModule._scope           1031          212
```

Opening a closed cell: `.cm-content` 2 → 3, `runtime._variables` **unchanged at 2297**, dynamic
count unchanged at 43. The v1 canonical adds 21 variables and 21 code-change events for the same
gesture. Zero page errors on boot.

The first panel probe reported `cm-content` 2 → 1 and read as a failure. It was the probe: its
click heuristic hit an already-open editor and closed it. `probe-editor5-panel.mjs` finds a
closed hotbar first.

Two `Cannot read properties of undefined (reading 'module')` console errors appear when the
dataflow-templating notebook boots. They appear identically on the pre-change file
(`probe-errors.mjs` against a `git show` copy), so they are not from this work.

### ObservableHQ

`lope-push-ws.js --cells` could not do this push: it only addresses named cells, it drops import
statements outright, and new cells land at the end. Three of the four things that needed to
change were an edited import, five new anonymous `md` cells, and their position.
`tools/dataflow-templating-2/push-observable.mjs` applies a scripted list of `modify_node` /
`insert_node` operations, taking every source from `lope-push-ws.js --dump` so nothing is
retyped. It refuses an insert whose exact text is already on the target, because an insert is not
idempotent.

Before pushing `cellEditor` its decompile was diffed against the stored node: 5710 → 5714 bytes,
and the diff was **two hunks, both `cloneDataflow` → `cloneViaSandbox`**, nothing else. Verified
as a rename, not just plausible — the decompiler is otherwise byte-faithful on this cell.

Both published modules boot in a bare `@observablehq/runtime` with the new names computing
(`probe-observable-names.mjs`, which reports names rather than the count
`probe-observable-annotate.mjs` gives — a count can rise for the wrong reason).
dataflow-templating: `errors: none`, all four of `instantiateDataflowFactory`,
`instantiateDataflow`, `cloneViaSandbox`, `cloneDataflow` fulfilled. editor-5: `cellEditor`
fulfilled, alongside errors from cells that need a real notebook environment
(`editedCell.variables[0]` with nothing selected) — the unchanged `@tomlarkworthy/cell-map`
errors the same way in the same probe, and the identical code booted a full lopecode page with
zero console errors.

### Still not done

- ~~robocoop-2, robocoop-3 and parametric-svg are untested.~~ All three migrated the same day —
  see § "The other three consumers" below.
- The export round-trip was not re-run on the shipped path. The gate closed it (2449557 bytes,
  correct `mains`, boots to 135 hotbars, zero console errors) against the same variable names,
  with the implementation inlined rather than imported.
- The Observable notebook *page* was not opened. The published-module boot is what was checked.

## The other three consumers — 2026-08-09

All four `cloneDataflow` consumers are now on `cloneViaSandbox`. `cloneDataflow` is still exported
and still works; nothing in the corpus calls it.

They turned out to share one shape — a factory cell wrapping
`cloneDataflow(template, observerFactory)` — so the diff per module is four lines: the import, the
`$def` dependency list, the cell signature, the call site. `migrate-editor5.mjs` was generalised
to take a module id rather than being copied.

### Two probes, because the first one was not the test that mattered

`probe-consumer-ab.mjs` runs the template through both paths **in the same page**, so the page is
its own control:

```
                template vars   cloneDataflow   cloneViaSandbox   differing
robocoop-2           32          +32 vars         +20 bridges         0
robocoop-3           51          +51 vars         +16 bridges         0
parametric-svg       26          +26 vars         +20 bridges         0
```

Every template variable observed, every one fulfilled in both arms, both disposing back to the
page baseline exactly. That probe forces computation the real call sites never force — they return
`null` for most names — which is a stronger error hunt, and it hits both arms identically.

**It still could not have caught the failure worth worrying about.** All three factories poke
values *into* the instance from the observer callbacks:

```js
if (name === 'viewof svgTargetName') {
  return { fulfilled: el => { el.value = target;
                              el.dispatchEvent(new Event('input', {bubbles: true})); } };
}
```

and `svgEditor` only resolves its promise once that write has flowed through the instance to
`svgEditorController`. A passive observer never exercises the write path, and the write path is
what a one-way bridge is most likely to break. `probe-consumer-factory.mjs` calls each factory for
real:

| | result, identical before and after |
|---|---|
| `svgEditor({target:'robotArm', module})` | promise resolves, same 12 controller keys, disposes to baseline |
| `robocoop2({autoDispose:false})` | `<div>`, 1 child, 24 inputs, same rendered text |
| `robocoop3({prompt:…})` | `<div>`, 1 child, 25 inputs, `root.value = object{steps,run}` |

Every functional field is byte-identical across the migration. Only the counts moved.

The write works because these observers write to an element the **instance** owns, not to a
capture. `viewof svgTargetName` is in the template, so it is created in the sandbox; the observer
receives that element and dispatching `input` on it drives the sandbox's own `Generators.input`.
Nothing crosses the bridge in the write direction.

### Whole-page render, before file against after file

```
                 rendered (identical)                        vars        clones
parametric-svg   9 svg / 41 form / 167 input / 16 btn / 0 err  2932->2692  273->33
robocoop-3       62 form / 116 input / 23 btn / 1 err          2857->2822   66->31
robocoop-2       22 form /  83 input / 17 btn / 1 err          2561->2561   14->14
```

robocoop-2's page numbers do not move because its widget is not built at boot; the instance cost
is what changed, 32 clones to 20 bridges.

**Building a second instance is now free.** parametric-svg goes 2692 → 2692 and robocoop-3
2822 → 2822 where they used to add 26 and 51. The bridges are shared, so the cost is paid once.

The error node on both robocoops, robocoop-2's `element.closest is not a function` and its 401,
and robocoop-3's `Cannot set properties of undefined (setting 'value')` are all present in the
**before** file. They are not from this change and were not fixed by it.

### The mutable question did not arise here

robocoop-2's template lists `"mutable context"` **and** `"context"`, so the `Mutable` is
constructed inside the instance under either implementation and only `initial context` crosses the
boundary — read once, never written. No consumer writes to a mutable it captured, so the migration
did not test the claimed regression. It was tested separately, and there is no regression — see
the next section.

### Published

`@tomlarkworthy/robocoop-2` 4552 → 4554, `@tomlarkworthy/robocoop-3` 1993 → 1995,
`@tomlarkworthy/parametric-svg` 1555 → 1557. Each factory's decompile was diffed against the
stored node first — **one hunk each, the rename, nothing else**. All three boot in a bare runtime
with the factory computing; the remaining errors are test cells wanting an API key or asserting
against live data.

## The mutable write-back was not a regression — 2026-08-09

Every previous section of this document, three commit messages, and the library's own
`### What crosses the boundary` prose cell asserted this:

> A template that writes back to a captured `mutable` works under `cloneDataflow` and does not
> work here.

**It is false.** It was written in § "Captures cross the runtime boundary" *before the bridge was
implemented*, survived the field test only because editor-5 happens not to do it — recorded there
as "still true in general", which was an assumption dressed as a finding — and was then repeated
downstream until someone asked what it meant.

`tools/dataflow-templating-2/mutable-writeback.test.mjs`, three tests, all passing:

```
cloneDataflow's arrangement: a clone in the origin module writes through    0 -> 42
instantiateDataflow: a captured mutable is written through the bridge too   0 -> 42
round trip: sandbox writes the mutable, sandbox reads the new value back      -> 7
```

The second test asserts `inst.captures` contains `"mutable count"`, so the write really does cross
a bridge rather than resolving locally.

**Why it works.** `mutable count = 0` compiles to three variables, and this is the shape the test
builds by hand rather than by assumption:

```js
$def("_i9nlq8", "initial count", [], ...)                                 // robocoop-2.js:1616
$def("_1e0fm2r", "mutable count", ["Mutable","initial count"], ...)       // robocoop-2.js:1617
```

A writing cell takes `mutable count` as an **input** and assigns `.value` on it. `Mutable`
(`vendor/observable-stdlib/src/mutable.js:3-10`) is an ordinary object with a setter that calls
`change(value = x)`. The bridge republishes the capture's *value*, and that value is the object
reference — not a copy. So the sandbox cell holds the origin's `Mutable`, `.value = 42` runs the
origin's setter, the origin's `count` generator yields, and the third test shows the new value
arriving back in the sandbox through `count`'s own bridge.

The same reasoning covers the other write pattern already relied on in production: all three of
robocoop-2, robocoop-3 and parametric-svg poke `el.value = …; el.dispatchEvent(…)` from their
observers. That was believed to work because the element belongs to the instance. It would have
worked for a captured element too, for the same reason.

**What one-way actually means.** No variable in the origin module can take a sandbox variable as an
input. `cloneDataflow` cannot do that either — its clones are named `dynamic <name> <uid>` and
nothing references them. The real per-capture cost is the frame of latency, which was measured and
is unchanged.

**The lesson is about how the claim survived**, not about mutables. It was stated as a cost "up
front" in a design document, which is the right place for a prediction — and then never marked as
one again. Every later mention inherited the confidence of the first without inheriting its
status. A prediction that cannot be distinguished from a finding three documents later is a defect
in the writing, not in the code.
