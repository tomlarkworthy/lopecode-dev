# compile-dataflow

A static counterpart to [`cloneDataflow`](https://observablehq.com/@tomlarkworthy/dataflow-templating):
take a subgraph of a live Observable runtime module and emit a **plain JavaScript function** that
performs the same computation, once, with no reactive variables involved.

Where [@tmcw/notebook-distiller](https://observablehq.com/@tmcw/notebook-distiller) distils a whole
notebook into an ES module, this distils an arbitrary *subgraph*, and does it from the runtime rather
than from source.

Two homes, same code:

- **`@tomlarkworthy/compile-dataflow`** — the notebook module, canonical in
  `lopebooks/notebooks/@tomlarkworthy_compile-dataflow.html`. Docs, the implementation as a single
  cell, and 48 `test_*` cells that build throwaway modules in a private `Runtime` (`run_tests`).
- **`tools/compile-dataflow/compile-dataflow.mjs`** — the same function as a plain ESM file, with 53
  `bun test` cases against `vendor/observable-runtime` (`bun test tools/compile-dataflow/`). Useful
  for headless work and for iterating without a browser.

The notebook is the canonical copy; the `.mjs` is import-free precisely so the two stay
transcribable — `tools/compile-dataflow/make-cells.mjs` generates the notebook cells from it. Not yet pushed to ObservableHQ (`upstream: null` in `modules/canonical.json`).

## Why not just clone?

`cloneDataflow` solves the reusability gap by *instantiating* the graph: each clone is a fresh set of
reactive variables in the same runtime. That is the right answer when you want a live, interactive,
independently-updating copy — a dashboard of widgets.

It is the wrong answer when you want a value:

| | `cloneDataflow` | `compileDataflow` |
|---|---|---|
| result | a disposer; values arrive through an Observer | `await fn(args)` → `{name: value}` |
| cost per instance | N reactive variables, alive until disposed | one call frame |
| reacts to upstream edits | yes (re-observes source definitions) | yes — re-emits a new function |
| streaming cells | native | first value only (or one designated driver) |
| callable from plain JS | no | yes |
| serialisable | no | yes (`toSource()`) |

The known failure mode of the clone approach — [adding a dependency to a template cell silently
breaks the clone's plumbing](../knowledge/notebook-programming-concepts.md) — comes from the
clone-vs-import boundary being implicit. Compilation makes that boundary an explicit, inspectable
list (`fn.body` vs `fn.captures`) with diagnostics attached.

## Work on the low-level representation

Everything operates on runtime `Variable`s (`_name`, `_inputs`, `_definition`, `_module`, `_shadow`),
mirroring `variable_compute` in `vendor/observable-runtime/src/runtime.js`:

```js
promise = Promise.all(inputs.map(value))     // 1. resolve inputs
  .then(inputs => definition.apply(value0, inputs))   // 2. call, `this` = previous value
  .then(value => generatorish(value) ? firstYield(value) : value)  // 3. unwrap generators
```

Compiled output is that pipeline, unrolled in topological order:

```js
async function compiledDataflow($args, $rt) {
  const $c = await $rt.captures();
  const $p_dimension = $rt.param($args, "dimension");
  const $p_pizzaChoice = $rt.param($args, "pizzaChoice");
  const $v0_chart  = await $rt.first($rt.d[0].call(undefined, $p_pizzaChoice, $p_dimension, $c[0], $c[1]), "chart");
  const $v1_widget = await $rt.first($rt.d[1].call(undefined, $c[2], $c[3], $v0_chart), "widget");
  return {"widget": $v1_widget};
}
```

Because the runtime has already resolved names to Variables, **no source parsing happens and
`viewof` needs no special case**: `viewof x` is an ordinary variable, and `x` is a variable whose
definition is `(G, _) => G.input(_)`. The same holds for `mutable`, for Notebook Kit 2.0's
`viewof$x`/`mutable$x` naming, and for 2.0 multi-output cells (`const {p, q} = …` compiles to one
exports-object variable plus one projection variable per name — all ordinary variables).

## API

> **Superseded 2026-08-10** — see [The merge](#2026-08-10-the-merge-one-emitter-one-refusal-axis).
> Kept as the record of the async emitter that was deleted, not as a description of current behaviour.

```js
const fn = compileDataflow(null, {
  module: myModule,
  inputs:  ["dimension", "pizzaChoice"],   // become function parameters
  outputs: ["widget"],                     // or {key: variable}
});

await fn({dimension: "orders", pizzaChoice: "Hawaiian"});   // → {widget: <div>}
```

`compileDataflow(variables, options)` — pass an explicit `Variable[]` as the first argument for
`cloneDataflow` parity (the template list), or `null` to derive the subgraph from `outputs`.

| option | meaning |
|---|---|
| `inputs` | boundary variables that become parameters |
| `outputs` | array of names/Variables, or `{key: variable}` |
| `frontier` | `"params"` (default when `inputs` is non-empty) or `"all"` |
| `mode` | `"once"` (default) or `"stream"` |
| `driver` | in `"stream"` mode, the single generator cell to iterate |
| `bindViews` | after building `viewof x`, assign the argument for `x` onto `view.value` |
| `snapshot` | read captured values once at compile time instead of on every call |
| `shadows` | replacements for Notebook Kit's per-cell `display`/`view` |
| `live` | default `true`: the returned handle is also an async generator (see below). `false` returns the bare compiled function |
| `watch` | `(notify) => unsubscribe`, the change source. `onCodeChange` from `@tomlarkworthy/runtime-sdk` has exactly this shape |
| `interval` | polling period in ms (default 250) when no `watch` is given |

Returned function carries `fn.run(args)` (`{outputs, truncated, displayed, dispose}`), `fn.source`,
`fn.toSource()`, `fn.body`, `fn.captures`, `fn.params`, `fn.module`, `fn.diagnostics`,
`fn.dispose()`, and — unless `live: false` — `fn.next()` / `fn.return()` / `fn.recompile()`.

## The frontier: three kinds of variable

Every variable the compiler meets falls into one of three buckets.

- **parameters** — supplied by the caller.
- **body** — recompiled; their definitions are called in topological order.
- **captures** — read from the live runtime (`module.value(name)`), re-read on every call unless
  `snapshot: true`.

`frontier: "params"` puts a variable in the body only if it transitively depends on a parameter.
Everything else is constant with respect to the arguments, so it is captured and stays shared with
the notebook — the same split `cloneDataflow` makes between cloned and un-cloned variables ("we did
not include the timerange when cloning, so all the widgets share that reactive reference").

`frontier: "all"` recompiles every compilable ancestor: a private, self-contained copy, which is what
`toSource()` needs. It is the default when there are no parameters, because "params" would then have
nothing to specialise on.

## Staying live: the handle is an async generator

One compilation is a point-in-time read of the graph, and the three buckets age differently:

| | tracks later edits? |
|---|---|
| **captures** — *values* | yes, always. `$rt.captures()` calls `module.value(name)` on every invocation, so a capture that has since recomputed is picked up by the next call. `snapshot: true` opts out and reads them once, at compile time. |
| **body** — *code* | not within one compilation. Each body variable's `_definition` is captured by reference into `$rt.d[]`; redefine that cell and *that* function keeps running the old code. |
| **frontier** — *membership* | not within one compilation. Which variables are parameters / body / captures is decided once, so a cell that later grows a new dependency is invisible to it. |

So a compiled function is a snapshot of the code. The fix is not to make the emitted function
self-modifying — it is to emit a *new* one. `compileDataflow` returns a handle that is both:

- **the compiled function** — `await handle(args)` runs the latest compilation, and
  `handle.source` / `.body` / `.captures` / `.diagnostics` / `.toSource()` track it;
- **an async generator** — `.next()` yields the compiled function, and yields a freshly compiled one
  every time the subgraph's code changes.

The Observable runtime duck-types generators (`generatorish` = has `.next` and `.return`, see
`vendor/observable-runtime/src/generatorish.js`), so a cell whose value is the handle is iterated
automatically. Editing any cell in the subgraph pushes a new function to every downstream consumer —
without the consumer having a runtime edge to the subgraph at all:

```js
compiled = compileDataflow(null, {module: main, inputs: ["x"], outputs: ["scale"]})
result = compiled({x: 3})     // recomputes when `scale`'s SOURCE changes, not just its value
```

Mechanics:

- Nothing is scheduled until the first `.next()`, so plain (non-notebook) use costs nothing and a
  `bun test` process never hangs on a stray timer.
- `.return()` — which the runtime calls on invalidation — unsubscribes and closes the stream.
- The change source is `options.watch`, shaped `(notify) => unsubscribe`. `onCodeChange` from
  `@tomlarkworthy/runtime-sdk` fits verbatim. With no `watch` it polls every `interval` ms (250 by
  default) — which is what `onCodeChange` does internally anyway (`check_for_code_change` diffs a
  snapshot of `runtime._variables` each frame).
- A notification is not a yield. Every wake recompiles and compares a stamp — the emitted `source`,
  the identity of each body `_definition`, and the capture list — and yields only on a real
  difference. The `source` alone is not enough: definitions are referenced as `$rt.d[i]`, not
  inlined, so a cell rewritten in place produces byte-identical source. Polling guards the recompile
  behind an O(n) probe (definition identities plus `module._scope.size`).
- Recompiling is cheap: a topo sort and a string build, no evaluation.
- `live: false` returns the bare compiled function, with no generator protocol and no watcher.

### Resource release

> **Superseded 2026-08-10** — see [The merge](#2026-08-10-the-merge-one-emitter-one-refusal-axis).
> Kept as the record of the async emitter that was deleted, not as a description of current behaviour. There are no contexts to release any more:
> `fn.dispose()` exists and returns 0.

Every call gets its own context, holding that call's `invalidation` promise and the disposers for any
generator it is draining. A context deliberately **outlives the call** — the widget it built is still
on screen, and its `invalidation.then(cleanup)` must not fire while it is in use. So a plain
`await fn(args)` leaves the context open by design; `fn.run(args)` hands back `dispose` for callers
who want to close it themselves.

Two events close contexts nobody claimed:

| event | what is released |
|---|---|
| a new compilation is yielded (or `recompile()` swaps one in) | every context of the **superseded** compilation — its outputs can no longer be reached, so it settles their `invalidation` and returns any generator they were draining |
| `.return()` — which the runtime calls on invalidation | the watcher (interval cleared / `unsubscribe` called), the parked `.next()`, and every context of the **current** compilation |

That is the same bargain the runtime strikes when a cell recomputes: the old computation is
invalidated, and downstream re-derives from the new one. Measured on a streaming cell, `.return()`
runs the underlying `async function*`'s `finally` block and the loop stops ticking. `fn.dispose()`
does it on demand and returns how many contexts it closed.

Before this, `fn(args)` was a genuine leak: nothing ever settled that context's `invalidation`, so a
subgraph cell that registered a listener or a timer against it never cleaned up.

`cloneDataflow` remains the tool when you want the *graph* to stay live — N reactive variables per
instance. This keeps the output a plain function you can call in a loop, hand to a worker, or
`toSource()` to disk; it just replaces that function when the code behind it moves.

## Special cases

### `viewof`

Nothing special happens, which is the point. Two useful consequences:

- **Parameterise the value, not the view.** With `inputs: ["dimension"]`, the walk stops at
  `dimension` and `viewof dimension` is never reached. The compiled function does no DOM work and
  runs headless. This is the recommended shape.
- **Parameterise `viewof dimension`** instead if a body cell embeds the element.

The hazard is passing an argument for `x` while `viewof x` is still reachable: they are *sibling*
variables, and nothing keeps the view in step with the value you passed. This is diagnosed:

- `viewof x` in the body → the fresh view sits at its own default (`param-shadowed-by-view`);
  `bindViews: true` assigns the argument onto `view.value` after construction.
- `viewof x` captured → the live notebook's view keeps whatever the user last chose.

### `mutable`

At runtime a mutable is three variables — `initial x` / `mutable x` (= `new Mutable(initial)`) / `x`
(= `mutable.generator`) in 1.0, and `mutable x` / `cell N` (= `Mutator(initial)`) / `mutable$x` / `x`
in 2.0. The compiler recognises the settable handle in both shapes.

Compiled, a mutable is a plain box: assignment does not re-run anything. A single pass reproduces the
reactive fixed point **iff every writer runs before every reader**, so the compiler adds a synthetic
ordering edge `writer → value-variable` to force exactly that.

Unsupported, and reported as `mutable-write-after-read`: a cell that both reads and writes the same
mutable (the ordering edge would close a cycle). There is no fixed point to reach in one pass; use
`cloneDataflow`, or restructure the cell to take the previous value as a parameter.

Also diagnosed (`mutable-write-escapes`): a body cell writing to a mutable that was *captured* rather
than recompiled. That is the notebook's own mutable — the assignment mutates the live document and
persists across calls. Widen the subgraph (`frontier: "all"`) for a private copy.

### Generators and async generators

> **Half superseded 2026-08-10.** Generators are still refused — that half became *the* rule.
> Async definitions are now compiled to `await` rather than truncated.

A cell that returns a generator is a stream. A function has one return value, so:

- **`mode: "once"` (default)** takes the first yielded value and immediately calls `.return()` on the
  generator, which runs its `finally`/dispose path. Which cells were truncated is reported at runtime
  in `fn.run(args).truncated` — it cannot be known statically, since generator-ness is a property of
  the returned value, not the definition.
- **`mode: "stream"`** compiles to an `async function*`. One cell is nominated as the `driver`;
  cells upstream of it run once, and the slice downstream of it re-runs per yielded value:

  ```js
  const $v0_config = await $rt.first(...);
  const $src = await $rt.d[1].call(undefined, ...);
  for await (const $v1_ticks of $rt.iterate($src)) {
    const $v2_scaled = await $rt.first($rt.d[2].call(undefined, $v1_ticks, $p_k), "scaled");
    yield {"scaled": $v2_scaled};
  }
  ```

**Unsupported: more than one concurrent streaming source.** Interleaving several generators is
scheduling, and reproducing the runtime's glitch-free wave semantics means reimplementing the
runtime. That is what `cloneDataflow` already is. Async *functions* (a single awaited value) are
fully supported and need no mode.

### `this`

`variable_compute` calls `definition.apply(value0, inputs)`, so `this` is the cell's previous value.
Compiled code always passes `undefined`, matching a first evaluation. Cells using `this` to
accumulate will not accumulate across calls. Flagged as `this-reference` (a textual heuristic on the
definition source, so it over-reports).

### `invalidation` and `visibility`

> **Superseded 2026-08-10.** Both are ordinary capture parameters now; the compiler no longer
> invents a lifecycle. See [The merge](#2026-08-10-the-merge-one-emitter-one-refusal-axis).

These are runtime sentinels (`variable_invalidation` / `variable_visibility` in `module.js`), not
values. Each *call* gets its own:

- `invalidation` — a promise resolved by `fn.run(args).dispose()`, so cells that register cleanup
  still work.
- `visibility` — resolves immediately (there is no IntersectionObserver to attach to), matching how
  it behaves under a headless boot.

### Imports and `@variable`

A variable defined as `main.define("md", ["module @x", "@variable"], (_, v) => v.import("md", _))`
redefines *itself* when evaluated. It cannot be recompiled meaningfully, so any variable whose inputs
include `@variable`, a `module …` handle, or a Variable from another module is **never** put in the
body — it is captured. Cross-module traversal is therefore not a thing: a subgraph is local by
construction, and importing notebooks do not get dragged in.

### Notebook Kit 2.0

Compiles through the same path. Two things get explicit handling:

- **Naming.** `viewof$x`, `mutable$x`, `cell N` for anonymous cells. Only the mutable detector cares;
  note that 2.0 reuses the name `mutable x` for what 1.0 calls `initial x`, which is why the detector
  checks the inputs rather than the prefix alone.
- **Per-cell shadow builtins.** `display` and `view` live in `Variable._shadow`, carry no `_name`,
  and are closed over the *original* cell's DOM slot. Capturing them would render into the source
  notebook, so they are replaced with headless implementations: `display` collects into
  `fn.run(args).displayed` and returns its argument; `view` returns `node.value`. Override via
  `options.shadows`. Note the default `view` does not apply Observable Inputs' element-type coercions
  (`range` → `valueAsNumber`, `checkbox` → `checked`, …); pass your own if you need them.

### Refused outright

- **Cycles inside the subgraph** — thrown at compile time with the cycle path.
- **Implicit variables** (referenced, never defined) and **duplicate definitions** — excluded from
  the body; if one is reached the capture read surfaces the runtime's own
  `"<name> is not defined"` error.
- **Topological changes to the source graph** — same as `cloneDataflow`: recompile.

## Distilled source

> **Superseded 2026-08-10** — see [The merge](#2026-08-10-the-merge-one-emitter-one-refusal-axis).
> Kept as the record of the async emitter that was deleted, not as a description of current behaviour. `toSource()` and its `HELPER_SOURCE` are deleted;
> `fn.source` is the standalone artifact and always was for the strict emitter.

`fn.toSource({name})` returns standalone JavaScript with each definition inlined via
`Function.prototype.toString`, the small `$first`/`$iterate` helpers prepended, and captures lifted to
a second parameter object:

```js
const $d0 = (p, d, t, ds) => `chart(${p},${d},${t})`; // chart

async function widgetOf($args, $cap = {}) {
  const $p_dimension = $param($args, "dimension");
  const $v0_chart = await $first($d0.call(undefined, $p_pizzaChoice, $p_dimension, $cap["time"], $cap["dataset"]));
  …
}
```

This is honest rather than clever: closures the definitions captured lexically are not serialisable
in general, so anything not recompiled becomes a named input the caller must supply. Use
`frontier: "all"` to push that set down to genuine builtins.

## Field test: replacing cloneDataflow in editor-5

`@tomlarkworthy/editor-5` is the heaviest real consumer of `cloneDataflow` — every cell in a notebook
gets a `cellEditor(variable)`, and on the editor-5 notebook itself that is 184 live instances. It
clones two subgraphs: an always-present **shell** (`hotbar_shell`, `viewof edit`, `selectVariable`,
`editedCell`) and, only while open, the **heavy editor panel** (21 variables, CodeMirror included).

Done on branch `cd-editor5` in `worktrees/cd-editor5`, against a copy of the notebook. The swap is
`tools/compile-dataflow/editor5-cells.mjs`; the live canonical was never written to.

**Both templates compile.** Passing the real template arrays straight in produces no errors and one
diagnostic across all 21 heavy variables:

    info/this-reference @editor_refresh_from_runtime

which is correct — that cell keeps per-key sync state in `this` across recomputes, and compiled code
always passes `this === undefined`. It is also a long-lived `onCodeChange` subscription.

The heavy panel **also builds**. Compiled with `frontier: "all"` and called, it returns a live
`<div>` with a working CodeMirror and all seven toolbar buttons, and reports exactly one truncated
generator:

    fn.run({}) -> truncated: ["editedCell"]

That single line is the whole blocker, and it is about *identity*, not compilability. `editedCell =
Generators.input(viewof editedCell)` is an infinite generator; `mode: "once"` takes its first yield
and calls `.return()`. Pointing an editor instance at its cell is `selectVariable(variable)`, which
sets `viewof editedCell` and relies on the runtime to propagate through `decompiled` →
`code_editor_view` → `editor_panel`. Compiled, that propagation does not exist: the panel is built
once, against whatever `editedCell` held at call time, and can never retarget.

The shell had the same problem and the fix was a second parameterised call. For the panel the
equivalent fix means re-calling whenever the target or the document changes — which rebuilds
CodeMirror from scratch and throws away cursor, selection and undo history. That editing state *is*
the widget. `editor_refresh_from_runtime`'s `this`-state exists for exactly the same reason: to
survive recomputes.

So the panel stays on `cloneDataflow` — not because it fails to compile, but because a compiled
result is a value and this widget's value is its accumulated state.

**The shell swap works,** and the shape of it is the point:

```js
shellCompiled = compileDataflow(shellTemplate, {module: editorModule,
  outputs: ["hotbar_shell", "selectVariable", "viewof edit"], frontier: "all", live: false})
shellRebuild  = compileDataflow(shellTemplate, {module: editorModule,
  inputs: ["viewof edit"], outputs: ["hotbar_shell"], live: false})
```

One compilation for the whole module, one call per cell editor. `frontier: "all"` puts `viewof edit`
and `selectVariable` in the body, so **every call constructs a fresh set** — that is the per-instance
state a clone gives you, without the reactive variables. The toggle is then a re-call with the
instance's own view passed back in as a parameter, so only `edit` and `hotbar_shell` recompute.

Verified against a `cloneDataflow` control on the same page: 187 shells render, open/close/open/close
cycles flip the label and attach and detach CodeMirror correctly, grips and add-cell buttons survive
the rebuild, and the full heavy panel (832 chars of decompiled source, 7 toolbar buttons) lives
inside a compiled shell.

### What the experiment actually taught us

- **A shared compilation needs `run()`, not a bare call.** The first draft had
  `host.dispose()` calling `shellCompiled.dispose()` — which would have torn down the contexts of all
  184 editors, because they share one compiled function. `fn.run(args).dispose` owns the *call*;
  `fn.dispose()` is a nuke. Worth saying out loud in the API docs.
- **Losing reactivity costs you an extra call, and it is easy to miss.** The pinned-open state is
  only known *after* the shell is built (the view is an output of the build), so the first version
  rendered a shell whose label said `edit` while its body was open. A clone would have recomputed
  `hotbar_shell` when `view.value` changed; compiled, you re-call. One extra `shellRebuild` call
  fixed it, and the compiled result then matched the control exactly.
- **A pre-existing editor-5 quirk is not ours.** Redefining `hotbar_shell` leaves a mix of updated,
  undecorated and stale shells — but the `cloneDataflow` control does exactly the same, so the coarse
  propagation is editor-5's, not compilation's.
- **Instantiating clones is not free.** Creating 30 extra editors at once on a loaded editor-5 page
  stalled the runtime past a 30s timeout; 8 rendered in 40ms. A compiled call has no such cliff
  because it adds no variables to the graph. (A clean per-editor variable-count comparison was not
  obtained — `runtime._variables` keeps deleted variables, so the totals are not comparable; the
  claim here is only the qualitative one.)

**Verdict: a partial replacement is real and worthwhile; a total one is not.** The shell is a pure
function of its inputs. The heavy panel compiles and renders perfectly well — it fails on the second
call, not the first, because retargeting it means rebuilding the editing state it exists to hold.
The dividing line is not "does it compile" but "is the instance's value its state". That is the same
line the frontier draws, one level up.

Not verified: whether a compiled panel's toolbar buttons still reach `command_processor` (which is
module-level and outside the template). Awaiting `viewof apply` to check it wedged the runtime, and
the retargeting blocker already settles the question.

## compilePure: the same subgraph, without the runtime

> **Renamed 2026-08-10.** `compilePure` *is* `compileDataflow` now — there is one function. Read this
> section for how the strict emitter was built and what it cost; read
> [The merge](#2026-08-10-the-merge-one-emitter-one-refusal-axis) for what changed after.

Added 2026-08-10, `compile-dataflow.mjs:665` (`compilePureOnce`) and `:883` (`compilePure`).

`compileDataflow` emits an **async** function because any Observable cell is allowed to return a
promise or a generator, so every value is awaited and every generator drained. That is the general
case and it is paid for on every call. `compilePure` refuses the general case and compiles only the
subgraph where none of that machinery is needed:

```js
const fn = compilePure(template, {outputs: ["chart"], live: false});
fn({}, {Plot, data})     // -> {chart: <svg>}, no await
fn.source                // the same body as a named declaration — publishable text
await fn.run({})         // convenience: reads the captures out of the live runtime first
```

It keeps `compileDataflow`'s live-handle contract — without `live: false` the return value is
callable, mirrors the current compilation's properties, and is an async generator yielding a freshly
compiled function whenever the subgraph's source changes. Guarded by *"the live handle yields a new
function when a cell is redefined"* and *"a redefinition that makes the subgraph async surfaces on
recompile, not silently"*.

**Blast radius.** `compileDataflow`'s own behaviour is unchanged. The only edit to the existing path
was lifting its live handle into a shared `liveHandle` (`:506`) taking the single-shot compiler as an
argument; the 53 pre-existing cases in `compile-dataflow.test.mjs` pass unmodified after it.

### Two properties, and they are not the same kind of claim

**Closure-free is guaranteed, not checked.** The function is built with `new Function`, whose only
visible scope is the global one. A definition that referenced an enclosing local cannot bind to it —
it throws `ReferenceError` instead. There is no analysis to get wrong, and *"the emitted function has
no closure"* asserts the `ReferenceError` rather than the absence of a warning.

**Pure is claimed, not proved, and the gap is undecidable.** Everything that flows in is an argument,
and the constructs that carry state across calls are refused. Nothing detects a definition that
writes to `document`, mutates an object it was handed, or reads `Date.now()` — and nothing can, short
of running it. The enforcement stops at strict mode, where an accidental global assignment throws
(*"emitted code is strict, so an accidental global assignment throws"*). Treat "pure" as a property
of the subgraphs you choose to compile, not one the compiler confers.

The optional scan is about neither. `options.parse` (acorn's `parse`) walks each definition and
reports identifiers resolving to nothing lexical — they will be globals at call time or a
`ReferenceError`. `strictGlobals: true` makes it a compile-time throw; `globals: ["document", …]`
covers globals the compiling environment lacks. Without `parse` the scan is skipped and a
`scan-skipped` diagnostic says so rather than implying it passed.

The scan deliberately **over-approximates the declared set** (`:918`): it collects every binding
introduced anywhere in the function instead of tracking scope, so a free `x` is silenced by a `let x`
in an unrelated branch. That direction is the safe one — it can miss a name, but it never reports a
name that is in fact bound, which would block a valid compilation.

### Four decisions, and what each one cost

**acorn is injected, not imported.** The file header (`compile-dataflow.mjs:10`) says
*"Self-contained: no imports, so the whole file can be pasted into one notebook cell"*, and
`make-cells.mjs` depends on that literally — it strips `export` and wraps the file as one cell.
Importing acorn for the scan would have been simpler and would have made the check unconditional.
Cost of injecting instead: the scan is off by default, and a caller who forgets `parse` gets a
`scan-skipped` diagnostic instead of an answer. Rejected alternative: a second module holding the
scan — it splits the compiler across two files for one optional feature.

**`strictGlobals` defaults to false.** Turning an unresolved identifier into a hard error is the
stricter reading of "closure-free", and it was the first implementation. It is wrong under node:
`document` is not on bun's `globalThis`, so every browser-facing cell in the corpus would be refused
by the compiling environment rather than by the code. *"options.globals covers a global the compiling
environment does not have"* pins both halves — the throw with `strictGlobals`, and the silence once
`globals: ["document"]` is passed.

**`compilePure` reuses `compileOnce` rather than re-deriving the subgraph.** It calls the async
compiler first and emits from its `body`/`params`/`captures`/`diagnostics`, so classification,
topological order, the frontier and every existing diagnostic are shared. Cost: one wasted `new
Function` per compilation building an async body nobody calls. Rejected alternative: factoring the
planning pass out of `compileOnce` into a `planSubgraph` — a real refactor of a working, tested path
for no behaviour change.

**`views: "snapshot"` is opt-in.** Default `"refuse"` means the first thing a user hits on a
`viewof`-heavy module is a refusal naming the option, not a silently different semantic. Cost: 60% of
the corpus compiles out of the box where 77% could. Recommendation: pass `views: "snapshot"` when the
subgraph is being compiled for a value, leave it off when the compiled function is meant to stand in
for the widget.

### What it refuses, and why each one

Every refusal names the cell, and all of them are collected before throwing, so one call reports the
whole problem rather than the first symptom.

| refused | reason |
|---|---|
| `async` / generator / async-generator definitions | detected from `definition.constructor.name` (`:626`); there is no synchronous compilation |
| the value half of `viewof x` | it yields a generator of the view's values (see `views: "snapshot"`) |
| the value half of `mutable x`, and the `mutable x` accessor | a box exists to be written to, and writes are only observable through the generator half |
| `invalidation`, `visibility` | promises |
| `@variable`, imports, implicit and duplicate variables | inherited from `compileOnce`'s classification |
| Notebook Kit per-cell `display` / `view` | they write into the original cell |
| native or bound definitions | `Function.prototype.toString` gives `[native code]`, so there is nothing to inline |
| anonymous captures | no name, so they cannot become a parameter |

Ten of the 30 tests assert a refusal — one per row above, plus `mode: "stream"`, cycles and an
unknown `views` value. Static analysis cannot see a *sync* function that returns a promise or a generator anyway, so
the emitted function carries a `$check(name, value)` guard on every assignment, defined inside the
emitted body — which is what keeps the artifact closure-free (`PURE_PRELUDE`, `:891`):

```
a returned a Promise; this function is synchronous by construction
```

### `views: "snapshot"`

The census below found one construct accounted for **663 of 1309 refusal reasons**, and turning it
into a snapshot moved **406 cells** from refused to compiled (932 refused -> 526). `viewof x` builds
a widget and `x` subscribes to it; a one-shot pure function has no use for the subscription, only for
the value. `views: "snapshot"` emits `x = <viewof x>.value` instead of refusing.

The two cases differ and the diagnostic (`view-snapshot`) says which: a view that is **recompiled**
gives its constructed default; a view that is **captured** gives whatever the live widget holds at
call time, read through the capture parameter on every call. *"views:"snapshot" on a CAPTURED view
reads the live widget through the capture parameter"* mutates the widget between two calls and
asserts the answer changes.

Snapshotting also drops the `Generators` dependency, which is often the only thing that needed it, so
the capture list is pruned to what the emitter actually references and the signature shrinks — which
is why the emitter runs before the parameter block is written (`:791-793`). `mutable` is still refused
under `"snapshot"`: a box whose writes are unobservable is not a snapshot, it is a silently wrong
answer.

### How much of the corpus compiles

`bun tools/compile-dataflow/survey-pure.ts [--snapshot] [--print <cell>] modules/@tomlarkworthy/*.js`
loads each module into a headless runtime and tries to compile **every named cell on its own** with
`frontier: "all"`. Unsatisfied implicit variables and import handles are excluded from the candidate
set — nobody asks to compile `md`.

```
65 modules, 2334 candidate cells                              2026-08-10
views: refuse     1402 compile (60%)   932 cells refused, 1309 reason instances
views: snapshot   1808 compile (77%)   526 cells refused,  646 reason instances

reason instances          refuse   snapshot
  viewof value-half          663          0
  async function             372        372
  invalidation               132        132
  mutable accessor            94         94
  mutable value-half          30         30
  async generator             12         12
  generator function           2          2
  visibility                   1          1
```

`views: "snapshot"` changes exactly one row and leaves the other seven identical. That is the
control: the option does what it claims and nothing else. A cell can be refused for more than one
reason, which is why instance counts exceed refused-cell counts.

Caveat on the denominator: `modules/` is the frozen bulk extraction from `e6a8bc5` (2026-07-21), not
freshly checked-out canonicals. Construct *mix* is what the census measures and that does not turn
over in weeks, but the exact counts are as-of that extraction, not as-of today's corpus.

### What it costs, measured

`bun tools/compile-dataflow/bench-pure.mjs`, 2026-08-10, bun 1.3.11, darwin 25.6.0 arm64. Chains of
`width` parallel strands `depth` long joined at a sink; arithmetic only, so the number is scheduling
and call overhead rather than the cells' own work.

Controls: both arms compile the *same* `Variable[]` from the same module in the same process; both
answers are asserted equal before either is timed; each arm is warmed with 50 calls before the 500
that are measured; the figure is the median, not the mean, so one GC pause does not set it.

```
shape    cells   runtime      async       sync    sync vs async
1x10       12   0.0215     0.0027     0.0006          4.3x
1x50       52   0.0973     0.0097     0.0023          4.1x
5x20      102   0.0954     0.0160     0.0044          3.6x
20x25     502   0.4548     0.0736     0.0276          2.7x
```

The `runtime` column redefines the source cell and awaits the sink — 17-34x the compiled sync call.
It is not the same operation (it schedules the whole graph and pays a microtask per generation) and
is here to size the gap, not to be raced.

The async-to-sync ratio **falls** as the graph grows, 4.3x at 12 cells to 2.7x at 502, which is the
opposite of what more cells looks like it should buy. The fixed per-call microtask is amortised over
more work as the graph grows, so what remains is the per-cell `await` — a smaller multiple of a
larger number. Anyone re-running this on a faster machine should expect the same *shape*; a rising
ratio would mean something else changed.

### The emitted artifact

`@tomlarkworthy/lopepage-urls`'s `layouts`, six cells, no captures, via
`bun tools/compile-dataflow/survey-pure.ts --snapshot --print layouts modules/@tomlarkworthy/lopepage-urls.js`:

```js
function compiled($args, $cap) {
  "use strict";
  const $need = …; const $check = …;
  // definitions, inlined verbatim from the module
  const $d0 = function _dslExamples() { return [ "view=200@tomlarkworthy/slug,25@owner/page#cell", … ]; }; // dslExamples
  const $d5 = function _layouts(dslExamples, parseGoldenDSL) {
    return dslExamples.map((dsl, idx) => parseGoldenDSL(dsl));
  }; // layouts
  // dataflow, in topological order
  const $v0_dslExamples = $check("dslExamples", $d0.call(undefined));
  const $v4_parseGoldenDSL = $check("parseGoldenDSL", $d4.call(undefined, $v1_parseViewDSL, $v2_convertToGoldenLayout, $v3_normalizeWeights));
  const $v5_layouts = $check("layouts", $d5.call(undefined, $v0_dslExamples, $v4_parseGoldenDSL));
  return {"layouts": $v5_layouts};
}
```

The definitions are the module's own text, unrewritten. `compileDataflow`'s `toSource()` cannot say
that: it string-rewrites an async body to swap `$rt.first(` for `$first(` and friends. `compilePure`
never builds an async body to rewrite — `fn.source` and the `new Function` the caller invokes are
generated from one body string (`:820-825`), so they cannot drift. *"fn.source is the same code, and
is publishable on its own"* evals the text through a bare `new Function` and calls it, which is the
only way to catch a `source` that reads correctly and does not run.

### Two things that bit, recorded because they will again

**`"use strict"` is a SyntaxError in a function with a non-simple parameter list.** The first emitter
signed itself `function compiled($args = {}, $cap = {})`. That compiled fine through `new Function`
(simple params there) and threw only when a caller `eval`'d `fn.source` — so the failure was invisible
to every test that called `fn` and visible only to the one that used the artifact. Defaults removed;
`$need` already reports a null `$args`/`$cap` by name, so nothing was lost.

**bun's transpiler constant-folds a captured `const` into the closure.** The test that proves
closure-freeness built its fixture as `const secret = 42; m.define("a", [], () => secret + 1)` and
passed while asserting nothing, because `String(definition)` is already `() => 43`. Verified directly:

```
const -> () => 43
let   -> () => mutableSecret + 1
```

The fixture uses `let`, with the reason in a comment above it. Any future test whose subject is what
a closure captured has the same hazard, which is why this is written down rather than fixed silently.

### Status

- `compilePure` and the shared `liveHandle` are in `tools/compile-dataflow/compile-dataflow.mjs`
  (1244 lines, still import-free — acorn arrives through `options.parse`).
- 30 `bun test` cases in `tools/compile-dataflow/compile-pure.test.mjs`, all passing 2026-08-10;
  the 53 pre-existing `compile-dataflow.test.mjs` cases still pass after the `liveHandle` extraction.
- `make-cells.mjs` returns `Object.assign(compileDataflow, {compilePure})` from the implementation
  cell and adds a `compilePure` cell, three in-notebook tests (`test_cp_sync`,
  `test_cp_refuses_async`, `test_cp_closure_free`), five prose cells and a three-cell demo — 28 cells
  in `cells.json`.
- The notebook prose lives in `tools/compile-dataflow/pure-docs.md` and is escaped into **named** md
  cells by the generator, so a change to the compiler and a change to what it claims land in one
  commit. The notebook's older md cells (documenting `compileDataflow`) are anonymous and still live
  only in the notebook; that split is deliberate but it is a split, and new prose should go in the
  generated file.
- `cells.test.mjs` guards the generated cells, because they land through a browser where a syntax
  error is a blank pane rather than a stack trace: every cell parses, names are unique, the md cells
  **round-trip `pure-docs.md` byte for byte** through a raw-string tag (the check that catches a
  mis-escaped backtick, which parsing alone does not), the `polygonPath` demo is executed with the
  four dependencies the notebook would supply and asserted captureless and self-contained, and every
  option in `compilePureOnce`'s destructure appears in the usage doc. That last one was verified
  non-vacuous by renaming `strictGlobals` in the doc and watching it fail.
- **Not pushed into the notebook and not run in a browser.** `cells.json` is regenerated; nothing
  downstream of it has been touched. The landing path is `serve-cells.mjs` plus bulk-define from the
  page, which needs a pairing session.
- Not attempted: fixed-point iteration for read-write mutables; whether a compiled cell is fast
  enough to matter inside a real render loop. The bench measures synthetic arithmetic chains, so it
  bounds the *overhead* removed and says nothing about any real notebook's frame time.

## 2026-08-10: the merge — one emitter, one refusal axis

Two user corrections, in order, and each one shrank the design.

**"awaiting generators seems like a mistake (thats a stream, which can't be compiled, but the async
functions, they are doable)".** The refusal axis had been sync-vs-async, which is wrong. The axis is
**stream vs not**. A generator, a `viewof` value half and a `mutable` value half are three instances
of one rule — one call produces one value, and there is no honest choice of *which* of a stream's
values that should be. An `async` cell is not on that axis at all: one value, arriving later, which
is what `await` is for. `ASYNC_KINDS` became `STREAM_KINDS` (two entries), async definitions are
collected into `asyncCells`, and `isAsync` is *derived* — the emitted function is async exactly when
something in it is. `async: true` remains as an escape hatch for a sync definition that returns a
promise, which is statically invisible.

**"I think we need to get rid of compileDataflow".** With async compiled rather than refused, the
async emitter's only remaining capability was `mode: "stream"` — which exists to iterate a
generator, the one thing just established as uncompilable. So it went, in full.

### What was deleted

`compileOnce`'s emitter and shim: `makeCtx`, `first`, `iterate`, `bindView`, `displayed`, the
live-context tracking, `run`, and the options `mode` / `driver` / `bindViews` / `snapshot` /
`shadows`. With them `toSource()` + `HELPER_SOURCE`, `bindLine`, `descendantsWithin`,
`generatorish`, and — less obviously — `mutableOrderingEdges`, `dependsOn` and `diagnoseMutables`.
Those last three were not part of the emitter, but every subgraph containing a `mutable` accessor is
now refused, so nothing they computed could ever reach a successful compilation. Removed rather than
left behind: dead code that looks live is worse than absent code.

The removed options are still **rejected by name** (`option "mode" no longer exists…`) rather than
ignored, so a stale call site is told what happened.

What survived split in two: `planSubgraph` (what is compiled — body set, topological order, params,
captures, diagnostics) and `compileOnce` (how it is emitted). `liveHandle` is unchanged and now
serves the one emitter.

1273 lines → 908. The implementation cell in the notebook went 53521 → 41334 chars.

### Sentinels became captures

`invalidation` and `visibility` were refusals; they are now ordinary named parameters the caller
supplies through `$cap`. The compiler no longer invents a lifecycle — the caller owns it, which is
the same bargain every other capture makes.

Checked before relying on it: the module resolves each sentinel to **one shared implicit Variable**,
so two cells reading `invalidation` have the identical object in `_inputs` and capture dedup by
identity yields one parameter, not one per reader.

```
names: invalidation invalidation visibility
SHARED across cells? true
invalidation._type: 2
```

`captureValues()` must skip them, and that is not a style choice:

```
await main.value("invalidation")   still pending after 200ms — the process does not exit
await main.value("visibility")     RuntimeError: visibility is not defined
```

The runtime awaits a cell's value, and an invalidation promise that never fires never settles, so
reading it wedges. `fn.sentinels` names what the caller has to pass; unsupplied, `$need` throws
`missing capture "invalidation"` at call time.

### What it moved

```
                    2026-08-09    async compiled    + sentinels
views: "refuse"     1402 (60%)     1619 (68%)       1666 (71%)
views: "snapshot"   1808 (77%)     2147 (90%)       2272 (96%)
```

65 modules, 2361 candidate cells, `tools/compile-dataflow/survey.ts`. Everything still refused under
`snapshot` is a stream: 30 `mutable` value halves, 12 async generators, 2 generators, 97 `mutable`
accessors (refusal *reasons*, which exceed the 89 refused cells — a mutable is refused on both
halves).

### The bench got more honest, and found something

Both compiled arms now come from **one emitter**, differing only in `async: true`. That is a real
control: the old comparison was between two different compilers.

```
shape    cells   runtime      async       sync    sync vs async
1x10       12   0.0216   0.0011   0.0005        2.1x
1x50       52   0.0907   0.0089   0.0023        4.0x
5x20      102   0.0989   0.0233   0.0044        5.3x
20x25     502   0.5285   3.1345   0.0317       98.7x
```

The 502-cell async figure is 3.13ms where the old emitter measured 0.0736ms. Reproducible across
five runs, so not noise — and the per-cell cost is what says why: 0.17µs at 52 cells, 6.2µs at 502.
Superlinear.

The cause, isolated in `tools/compile-dataflow/await-cost.mjs`: an `await` suspends the function
frame, and restoring it costs in proportion to the locals live across the suspension. The k-th await
saves k values, so the total is **quadratic in the number of cells**.

The first version of this experiment had two arms and a confound I did not catch before writing it
up: the live arm ended in an n-term `return v0 + … + vn` and the dead arm ended in `return acc`, so
the live arm's *function was bigger*. Rerun 2026-08-10 with four arms, all with n awaits, and
`live`/`array`/`noawait` sharing the same n-term tail so size is held constant:

```
n          live     array   noawait      dead    live/array   (median ms, bun 1.3.11)
50       0.0040    0.0023    0.0003    0.0014      1.8x
100      0.0181    0.0053    0.0005    0.0030      3.5x
250      0.0888    0.0129    0.0010    0.0074      6.9x
500      2.2627    0.0346    0.0018    0.0171     65.4x
```

- `noawait` is `live` with the awaits deleted — 0.0018ms at n=500, ~1250x cheaper. **Function size
  and the cost of the sum explain nothing.** The confound is dead.
- `array` keeps the n awaits and the n-term tail but assigns into one array, so only the array
  reference is live across each suspension. It stays linear. **Liveness is the whole variable.**

Per-await cost rising linearly with n is the quadratic's signature, and V8 shows it cleanly:

```
n        100    200    300    400    500    600    (ns per await, live arm)
node     130    207    309    386    485    573
bun      157    275    474   1831   3973   7373
```

V8: ~0.9ns per live local per suspend, no discontinuity. The quadratic is not a bun artifact. What
*is* bun-specific is the **cliff between n=300 and n=400** — 3.9x the per-await cost for 1.33x the
cells — after which JSC grows faster than quadratic. Unexplained. A JIT tier bailout at a register
or bytecode threshold would fit the shape, but that has **not** been checked, and it is written here
as a hypothesis rather than a finding.

Mitigation if a compiled dataflow ever does need per-cell awaits: assign into one array rather than
n separate `const`s — that is the `array` arm, and it is linear.

All of this is the opposite of what the earlier write-up claimed ("the multiple falls as the graph
grows"), which was true of the old emitter's code shape and is not a general property.

### Awaiting only what is async

Raised by the user immediately after the finding above: *"can't we tell whether a step needs an
async or not, we should be minimizing asyncs, and I think that is something we can tell during
compilation."* Correct, and the emitter was cruder than it needed to be — `const aw = isAsync ? "await " : ""`
was a **single flag applied to every cell**, so one async definition in a 502-cell subgraph awaited
all 502. The information to do better was already collected (`asyncCells`); it just was not used
per-cell.

Now `awaited` is a Set of the Variables whose definition is an `AsyncFunction`, and the await is
emitted only at those assignments:

```
  const $v0_a = $check("a", $d0.call(undefined));
  const $v1_b = $check("b", await $d1.call(undefined, $v0_a));
  const $v2_c = $check("c", $d2.call(undefined, $v1_b));
  const $v3_d = $check("d", $d3.call(undefined, $v2_c));
```

The correctness crux is that `c` needs no await of its own: the await on `b`'s assignment already
resolved the value, so `$v1_b` is a number by the time `c` reads it. Asserted rather than assumed —
the test checks `d === 9`, which would be `NaN` if `c` had received a promise.

What it buys, on the shape that actually occurs (one async cell in an otherwise sync subgraph):

```
cells   async defs   awaits: 1 (auto)   awaits: n (async:true)      ratio
52     1                 0.0023                 0.0095       4.1x
102    1                 0.0042                 0.0245       5.8x
502    1                 0.0292                 2.9014      99.5x
```

At 502 cells that is 0.0292ms against the all-sync arm's 0.0295ms — **one async cell is now free**.

### …and then no flag at all

The user's next question killed the option outright: *"yeah so why do we even need a flag? We just
see what is needed"*. Right — `"auto"` was already the derivation, `false` was redundant, and the
only load-bearing value was `true`, whose sole job was a **sync definition that returns a promise**
(`data = FileAttachment("x.json").json()`, which is ordinary Observable and invisible to
`constructor.name`). A global flag was a heavy answer to a per-cell question.

So the emitter now decides per cell, and for the case it cannot decide statically it decides at call
time:

```js
const $v1_b = $check("b", await $d1.call(undefined, $v0_a));                         // async definition
let $v2_c = $check("c", $d2.call(undefined, $v1_b)); if ($thenable($v2_c)) $v2_c = await $v2_c;
```

A test that fails does not suspend the frame, so the conditional costs a `typeof`, not an await —
which is the whole point, given that an await is quadratic here. `fn.awaits` counts the
unconditional ones, `fn.maybeAwaits` the conditional ones.

The residue is an **all-sync** subgraph, which is emitted as a synchronous function and so has no
await to fall back on. That still throws, and `fn.asAsync` is the way out — the same variables and
the same plan recompiled with the async colour forced, built on first access and memoised. It is a
second product rather than a knob: nothing is configured, you just ask for the other artifact.

Measured (`bench.mjs`, 2026-08-10, bun 1.3.11, darwin arm64), 500 warm-up calls then the median of
500. `sync` and `conditional` are the same subgraph via `fn.asAsync`; `one async` has one definition
made async:

```
cells       sync   conditional     one async   one async vs sync
52        0.0022        0.0024        0.0024        1.1x
102       0.0032        0.0046        0.0048        1.5x
502       0.0278        0.0338        0.0370        1.3x
```

Against the old `async: true` at 502 cells (3.1345ms, 98.7x) there is nothing left for the option to
do at any graph size, so it is gone: passing `async` in any form now throws and names the reason.

**A measurement defect found on the way, which invalidates earlier numbers here.** The bench warmed
with 50 calls. On the 502-cell shape the first batch of 500 read 0.2563ms and every batch after it
read ~0.0336ms — the median was still counting tier-up. Both `bench.mjs` and `await-cost.mjs` now
warm with a full batch. Re-measured, the await law holds (bun `live` n=500: 2.3835ms vs `noawait`
0.0015ms; node per-await 132→560ns across n=100→600, still linear), but **any figure in this file
dated before this paragraph and taken with a 50-call warm-up is an upper bound**, including the
3.1345ms above.

Still quadratic if k ≈ n (awaiting k of n cells costs O(k·n)). The remedy is known and unimplemented:
assign into one array instead of n `const`s, which is the `array` arm above. Nothing in the corpus
needs it.

### The notebook, and what running it taught

23/23 in-notebook tests pass; 50/50 `bun test`. Getting there classified the legacy suite by running
it rather than by reading it: of 29 legacy tests, 22 passed unchanged and 7 failed. Six were
genuinely superseded. The seventh is a finding:

```
test_cd_async_cell -> FAIL: cdSettle is not defined
```

Its fixture is `async () => { await cdSettle(); return 7; }` — a definition closing over a notebook
cell's scope. The old compiler *called* the definition, so the closure survived; the new one inlines
its source into `new Function`, which has no closure. The test did not break, the guarantee did its
job. My own replacement test fell into the identical trap one step later (observing teardown through
a closed-over `torn` flag, whose `ReferenceError` was swallowed by an unhandled rejection, leaving
the assertion silently false). **A fixture cannot observe a compiled function's side effects through
a closed-over variable — the sink has to be passed in as a capture.**

`run_tests` timing out at 60s was diagnosed and is **not** this module: two never-settling demo
cells in `@tomlarkworthy/testing` (`testing`, `test_tests_example`) wedge the all-modules scan.
`filter: "test_cd_"` returns in a second.

### Two traps fixed in passing

- `serve-cells.mjs` read `cells.json` once at startup, so a server left running across a
  `make-cells.mjs` re-run served the previous build — which cost a debugging cycle when a fix
  "did not take". It reads per request now.
- `compile-dataflow.mjs` contained a literal NUL byte (a `${cell}\0${name}` cache key written as a
  real control character), which made `grep`/`rg` treat the whole file as binary and silently
  return nothing. Now `\u0000`.

### Status

- `tools/compile-dataflow/compile-dataflow.mjs`, 908 lines, still import-free.
- 47 `bun test` cases in `compile-dataflow.test.mjs` (the old 53-case file was deleted; the planner
  cases worth keeping were ported) and 5 in `cells.test.mjs`, all passing 2026-08-10. The count fell
  again when the `async` option went: three tests of it became two of the derivation.
- Notebook: 27 generated cells (a `cdAwait` section was added for where the awaits go), prose in
  `tools/compile-dataflow/docs.md`, exported to
  `lopebooks/notebooks/@tomlarkworthy_compile-dataflow.html` (2.31 MB), 23/23 in-notebook tests. The five legacy anonymous md
  cells that documented the async API were deleted and replaced by a generated `cdTitle`; cells were
  reordered (title, demo, docs, implementation, helpers, tests) via `runtime._variables`.
- 22 legacy in-notebook tests remain **notebook-only, not generated**. They pass and they exercise
  the merged compiler, but they will drift; folding them into `make-cells.mjs` is unfinished work.
- Preflight on the exported file reports three `missing-export` findings, all in other modules
  (`file-sync`, `observablejs-toolchain`) and all reproduced on two unrelated notebooks — pre-existing
  corpus staleness, not from this change.
- Still not published to ObservableHQ; `canonical.json` keeps `upstream: null`.

## Status / next steps

- `@tomlarkworthy/compile-dataflow` exists in lopebooks; as of 2026-08-10, 23/23 in-notebook tests
  and 50/50 `bun test` cases pass (including one that compiles a subgraph out of a real lopecode
  module through its `define(runtime, observer)` export). The counts fell because the async emitter
  and its tests were deleted — see [The merge](#2026-08-10-the-merge-one-emitter-one-refusal-axis).
- Test hygiene: each in-notebook test builds its scratch module inside a **private `Runtime`**
  (`cdFixture` → `new Runtime({Generators: () => Generators, Mutable: () => Mutable})` from
  `@tomlarkworthy/observable-runtime-v6`, which is local-first and already inlined), and
  `cdDispose` calls `rt.dispose()`. Nothing a test defines, mutates or leaks can reach the
  notebook's own runtime, so the module list never sees it and the exporter never serialises it.
  Building scratch modules on the live `runtime` instead does leak: `variable.delete()` is
  `define(null, [], noop)`, so the inert Variable stays in `runtime._variables` — the Set that
  `currentModules` enumerates — and every test run left a dozen phantom `main` modules behind.
- The notebook cells are generated from the headless twin by `tools/compile-dataflow/make-cells.mjs`
  (strips `export`, wraps the file as one block cell), so `tools/compile-dataflow/compile-dataflow.mjs`
  and `@tomlarkworthy/compile-dataflow` cannot drift. 22 of the in-notebook tests predate the
  generator and are still notebook-only.
- Not pushed to ObservableHQ yet, so `canonical.json` records `upstream: null`. Publishing it there
  is the remaining step if it should become a `@tomlarkworthy/*` import for other notebooks.
- Possible extensions: fixed-point iteration (`iterate: n`) to make read-write mutables converge;
  multi-driver streaming via a real wave scheduler (at which point it is `cloneDataflow` again).

## 2026-08-13: the notebook prose was slop, and what moved out of it

The user's verdict on the exported notebook: *"the content is slop like, can you just explain the
motivation, the reference documentation (you have that its nice). And briefly one chart of speedups"*.
The eight prose sections had grown into a second copy of this file — `cdAbout`'s two-claim argument,
`cdAwait`'s derivation of where awaits go, `cdSnapshot`'s survey commentary, and `cdCost`'s three
tables of measurements, all reasoning in front of a reader who came for an API.

`docs.md` is now six sections — motivation (`cdTitle`), the demo's caption (`cdAbout`, cut from 13
lines to 5), the annotated call (`cdUsage`, unchanged), the refusal table (`cdRefuses`), the `viewof`
recipe (`cdViewof`, cut by half), and one chart with a caption (`cdSpeed`). `cdAwait`, `cdSnapshot`
and `cdCost` are deleted from the notebook. Their measurements are transcribed here first, because
three of the four tables existed **only** in the notebook — this file's own bench table (§What it
costs, measured) predates the warm-up fix and is the 50-call-warm-up upper bound.

Final bench, `tools/compile-dataflow/bench.mjs`, 2026-08-10, bun 1.3.11, darwin arm64, median of 500
calls after 500 warm-up calls. `sync` and `async` are the same subgraph — `fn` and `fn.asAsync`,
differing only in the awaits, none of which fire because no definition in the graph is async:

```
shape    cells   runtime      async       sync   async / sync   runtime / sync
1x10       12   0.0202   0.0006   0.0005        1.15x           40x
1x50       52   0.0842   0.0024   0.0022        1.08x           38x
5x20      102   0.0975   0.0046   0.0045        1.04x           22x
20x25     502   0.4981   0.0342   0.0286        1.20x           17x
```

The last column is the notebook's one chart (`cdBench` + `cdSpeedChart`, Plot). The speedup falls
with graph size; the async colour costs a flat 1.04-1.20x, which is the payoff for placing awaits
rather than applying them everywhere.

`tools/compile-dataflow/await-cost.mjs`, same session. Four arms, all with n awaits; `live`, `array`
and `noawait` share the same n-term tail expression, so function size is constant and only liveness
varies:

```
n          live     array   noawait      dead    live/array   (median ms, bun 1.3.11)
50       0.0038    0.0023    0.0002    0.0013      1.7x
100      0.0176    0.0039    0.0004    0.0027      4.5x
250      0.0839    0.0139    0.0008    0.0061      6.0x
500      2.3835    0.0328    0.0015    0.0167     72.7x
```

Per-await cost rising linearly with n is the quadratic's signature, and V8 shows it cleanly at about
0.9ns per live local per suspend:

```
n        100    200    300    400    500    600    (ns per await, live arm)
node     132    215    311    388    497    560
bun      157    270    514   2700   5667   7626
```

JSC has a further cliff between n=300 and n=400 — 5.3x the per-await cost for 1.33x the cells, after
which it grows faster than quadratic. **Unexplained**; a JIT tier bailout at some register or
bytecode threshold would fit, but that has not been checked.

Survey, `tools/compile-dataflow/survey.ts` over `modules/@tomlarkworthy/*.js`, 2026-08-10, compiling
every named cell on its own — 65 modules, 2351 candidate cells: `views: refuse` 1656 compile (70%),
`views: snapshot` 2262 compile (96%). The candidate count varies by about ten between runs of
unchanged code, so read the percentages as ±1%. Everything still refused under snapshot is a stream:
30 `mutable` value halves, 12 async generators, 2 generators, 97 `mutable` accessors — refusal
*reasons*, exceeding the 89 refused cells because a subgraph holding a mutable is refused on both
halves. (The older census two sections up used `survey-pure.ts` and a 2334-cell denominator; the
shape agrees, the denominators do not, and neither is as-of today's corpus.)

One thing the chart cell records that prose did not: the numbers are **transcribed, not computed at
boot**. A bench that runs on load reports a cold JIT on a busy page, which is how the 50-call warm-up
defect got in.
