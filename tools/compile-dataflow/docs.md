<!--
Prose cells for @tomlarkworthy/compile-dataflow, read by make-cells.mjs and escaped into
`name = md`…`` cells. Kept here rather than typed into the notebook so the documentation and the
implementation it documents move in one commit — the same reason the code cells are generated.

Sections are delimited by a line of the form `=== cellName`. Everything after it, up to the next
delimiter, is the markdown body. Backticks and ${} are escaped by the generator, not here.

Scope: motivation, reference, one chart. The development record — dead ends, the async-flag
removal, the await-cost law, the corpus survey — is plan/compile-dataflow.md, not here.
-->

=== cdTitle

# compile-dataflow

## Compile a dataflow subgraph into a plain function.

```js
import {compileDataflow} from '@tomlarkworthy/compile-dataflow'
```

A reactive cell is not reusable outside the runtime that schedules it.
[Dataflow templating](https://observablehq.com/@tomlarkworthy/dataflow-templating) answers that by
*instantiating* the graph: `cloneDataflow` copies the variables, so each clone updates live. That is
what you want for a widget.

When you want a **value**, the runtime is overhead. `compileDataflow` walks the same subgraph and
emits straight-line JavaScript, so `fn({x: 1})` returns `{y: …}` with no reactive variables
involved and `fn.source` is text you can paste anywhere. It is
[notebook-distiller](https://observablehq.com/@tmcw/notebook-distiller) applied to a subgraph, and
driven from the runtime rather than from source.

|  | `cloneDataflow` | `compileDataflow` |
|---|---|---|
| result | a disposer; values arrive reactively | a function returning `{output: value}` |
| updates after the call | yes | no — call it again |
| streams (generators, `viewof` values, `mutable`) | yes | refused, by name |
| serialisable | no | yes — `fn.source` |

=== cdAbout

### The artifact

`polygonPath.source` below is the whole of the compiled polygon — that text, pasted anywhere, is the
polygon.

**Closure-free is guaranteed.** `new Function` sees only global scope, so a definition that
referenced an enclosing local throws `ReferenceError` rather than quietly binding to it.
**Pure is only claimed**: nothing detects a definition that writes to `document`, mutates an object
it was handed, or reads `Date.now()`. Emitted code is strict, so an accidental global assignment
throws; that is where enforcement stops.

=== cdUsage

### Usage

```js
fn = compileDataflow(variables, {
  outputs: ["chart"],   // defaults to the SINKS of `variables` — whatever nothing else reads
  inputs:  ["radius"],  // boundary variables that become $args
  live:    true,        // also an async generator, recompiling when a cell in it is edited
  views:   "refuse",    // "snapshot": read `viewof x`.value once instead of refusing `x`
  parse,                // acorn's parse; enables the undeclared-identifier scan (off without it)
  globals: ["document"],// names to treat as resolvable — browser APIs the compiler cannot see
  strictGlobals: false, // true: an unresolved identifier is a compile-time throw, not a warning
  name:    "compiled"   // the emitted function's name
})

fn($args, $cap)         // -> {outputKey: value}. No runtime is touched.
fn.source               // the same body as a named declaration; publishable text
await fn.run($args)     // convenience: reads $cap out of the live runtime, then calls fn
await fn.asAsync(…)     // on a synchronous fn: the same subgraph emitted async
```

`fn.captures` / `fn.captureNames` are the values the emitted code actually reads, so they match the
`$cap` it demands; `fn.params`, `fn.outputs`, `fn.snapshots`, `fn.isAsync`, `fn.awaits`,
`fn.maybeAwaits`, `fn.unresolved` and `fn.diagnostics` report the rest. A missing entry in either
object throws by name — `missing capture "Plot"` — rather than arriving as `undefined` three cells
later.

`run()` cannot fetch the sentinels for you, and `fn.sentinels` lists the ones it will need: reading
`invalidation` out of a live runtime hangs, because the runtime awaits the cell's value and an
invalidation promise that never fires never settles. Measured on 2026-08-10 against
`vendor/observable-runtime`:

```
await main.value("invalidation")   still pending after 200ms, and the process does not exit
await main.value("visibility")     RuntimeError: visibility is not defined
```

So pass them: `fn.run(args, {invalidation, visibility})`, or `fn(args, {...caps, invalidation})`.

=== cdRefuses

### What it refuses

One rule: **a cell whose value is a stream cannot be compiled**, because one call produces one value
and there is no honest answer to which of a stream's values that should be. Every row below is an
instance of it. Refusals name the cell and are all collected before throwing, so one call reports
the whole problem.

| refused | why |
|---|---|
| generator and async-generator definitions | read off `definition.constructor.name` |
| the value half of `viewof x` | it yields a generator of the view's values — see `views: "snapshot"` |
| the value half of `mutable x`, and the `mutable x` accessor | a box exists to be written to, and writes are only observable through the generator half |
| `@variable`, imports, implicit and duplicate variables | not streams — there is simply no value to pass |
| Notebook Kit per-cell `display` / `view` | they write into the original cell's DOM slot |
| native or bound definitions | `Function.prototype.toString` gives `[native code]`, so there is nothing to inline |
| anonymous captures | no name, so they cannot become a parameter |

An `async` definition is **not** on that axis — one value, arriving later. It compiles to `await`
and the emitted function becomes `async`; there is no option to set. `invalidation` and `visibility`
are not on it either: they are ordinary capture parameters, so the caller owns the lifetime of
whatever the function builds.

A *synchronous* function that returns a promise is invisible to all of that, so the emitted code
carries a `$check` on every assignment and fails at call time instead:

```
a returned a Promise; this function is synchronous by construction — fn.asAsync awaits it
```

Compiling every named cell of `modules/@tomlarkworthy/*.js` on its own — 65 modules, 2351 candidate
cells, `tools/compile-dataflow/survey.ts`, 2026-08-10 — 70% compile under `views: "refuse"` and 96%
under `views: "snapshot"`. Everything still refused there is a stream.

=== cdViewof

### Making a view out of a compiled widget

A compiled function holds no reactive state, so each call builds an independent widget — which is
what a view needs. The widget owns the value; `viewof` supplies the reactivity:

```js
buildSlider = compileDataflow(sliderCells, {live: false})  // fn() -> {slider: <input type=range>}
viewof compiledSlider = buildSlider().slider               // the whole wiring
compiledSlider                                             // 50, and updates as you drag
```

**Hand `viewof` the widget, not a generator.** `viewof w = EXPR` already desugars to `viewof w` =
EXPR plus `w` = `Generators.input(viewof w)`, so applying `Generators.input` yourself applies it
twice (`tools/compile-dataflow/viewof-probe.mjs`, 2026-08-11):

```
EXPR = the widget               values=["start","typed"]
EXPR = Generators.input(widget) values=[]  FAILED: input.addEventListener is not a function
```

The limit sits on the widget, not the compiler: it must carry `.value` and dispatch an event —
stdlib picks the event from `input.type` and reads `valueAsNumber` for `range` and `number`. A
compiled cell returning a plain object with a `.value` property is not a view; nothing dispatches.

=== cdSpeed

### What it buys

`tools/compile-dataflow/bench.mjs`, 2026-08-10, bun 1.3.11, darwin arm64. Chains of `width` strands
`depth` long joined at a sink, arithmetic only, so the figure is scheduling and call overhead rather
than the cells' own work. The runtime arm redefines the source cell and awaits the sink; the
compiled arm calls `fn()`. Median of 500 calls after 500 warm-up calls — warming with 50 left the
502-cell shape still tiering up and read 9x slow.

The gap **narrows** as the subgraph grows, 40x at 12 cells down to 17x at 502, because the runtime's
fixed per-call cost is amortised over more work. It is not the same operation — the runtime
schedules the whole graph and can update incrementally — so this sizes the gap rather than racing
it.

`fn.asAsync`, the same subgraph emitted async, costs 1.04-1.20x the synchronous arm at every shape:
its awaits are conditional (`if ($thenable(v)) v = await v`) and a test that fails does not suspend
the frame.
