# dataflow-templating v2 — instantiate into a sandbox runtime

Status: design + implementation in progress, branch `cd-editor5`, started 2026-08-09.
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

## Not tested

- The 132 existing editors were not migrated; redefining `cellEditor` does not rebuild them, so
  every v2 measurement is of editors built after the swap. A real deployment reloads the page.
- Only 7 sandbox instances existed at once. The behaviour of 132 concurrent sandbox modules is
  still unmeasured — see the open question below, which this field test did not close.
- Drag-to-reorder, copy/paste and the cell-link navigation were not exercised.

## Open questions

- ~~Whether any editor-5 template variable writes back to a captured `mutable`.~~ None does; the
  apply path writes through `command_processor` in the primary runtime, not through a bridge.
  Still true in general: a template that writes to a captured `mutable` will not work, and that is
  a genuine regression against cloneDataflow.
- ~~Whether builtins resolve correctly in the sandbox.~~ They do, by becoming ordinary bridged
  captures — `Generators`, `Inputs`, `htl` and `html` all appear in the bridge list. The sandbox
  `Runtime` is constructed with no builtins at all and never needs them.
- Whether 135 sandbox modules in one extra runtime cost anything measurable. Expected not to —
  the runtime schedules on demand, not on a timer — but it replaces one measured number with an
  unmeasured one and should be measured before this ships.
