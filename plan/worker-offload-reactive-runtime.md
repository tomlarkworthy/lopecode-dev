# Offloading reactive-runtime computation to Web Workers

Research note, 2026-07-26. Every number below was measured on this machine
(14 logical cores, Chromium via Playwright) with the probes in `tools/`:

| Probe | What it establishes |
|---|---|
| `tools/worker-offload-probe.ts` | runtime scheduler cost + async-cell concurrency (bun, vendored runtime) |
| `tools/worker-file-origin-probe.html` / `.mjs` | what a worker can do from a `file://` notebook vs an http one |
| `tools/worker-cost-probe.html` / `.mjs` | spawn / postMessage / transfer costs, real parallel speedup |
| `tools/worker-offload-poc.html` / `.mjs` | end-to-end: real `Runtime` + worker pool + teardown |
| `tools/worker-safety-browser.mjs` | what the real `compile()` does/doesn't expose as a dependency |
| `tools/worker-safety-classify.mjs` | 4-stage worker-safety classifier over a live notebook |
| `tools/parallel-runtime-patch.js` + `tools/build-parallel-runtime.mjs` | **the engine patch** and its notebook assembler |
| `tools/parallel-runtime-qa.mjs` | A/B of the automatic engine, incl. bit-identical correctness check |

## 1. The premise checks out

A CPU-bound kernel (28 × 220³ matmul), same work, main thread vs pool:

```
serial (main thread)   256 ms
 2 workers             134 ms   1.91x   95% eff
 4 workers              78 ms   3.27x   82%
 8 workers              45 ms   5.63x   70%
10 workers              37 ms   6.89x   69%   <- practical ceiling
14 workers              40 ms   6.39x   46%
```

~7× the compute is sitting idle. Efficiency falls off past ~10 because the core
count is heterogeneous (P/E cores); `hardwareConcurrency - 2` capped at 8 — what
`belief-geometry` already uses — is close to optimal and leaves headroom for the
UI thread.

## 2. What the runtime actually spends time on: nothing

The whole Observable runtime is 790 lines (`vendor/observable-runtime/src/`).
Measured full-graph recompute:

```
fan-out  100 cells   6.82 ms/recompute
fan-out 1000 cells   7.25 ms
fan-out 5000 cells   9.86 ms   (~1 us/cell after subtracting the 5ms sleep floor)
```

The scheduler is graph bookkeeping — Set operations, indegree counting, a
topological drain. **It is not the bottleneck and there is nothing worth moving
off-thread.** All the time is in `definition.apply(value0, inputs)` — user cell
bodies. So the accurate framing is *offload cell bodies*, not *offload the
runtime*.

## 3. The runtime is already a parallel scheduler

This is the important structural finding. Read `runtime_computeNow` +
`variable_compute` (`runtime.js:82`, `runtime.js:217`):

- The topological drain is **fully synchronous**. `variable_compute` only wires
  up a promise chain and returns; `postqueue` decrements indegrees immediately.
  One flush wires the entire dirty subgraph.
- Actual sequencing happens through promise composition:
  `init()` → `Promise.all(inputs.map(variable_value))` → `define` → `generate`.
- `_promise` is chained **per variable**, not globally. Independent branches of
  the DAG are therefore unordered with respect to each other.

Measured with the real runtime:

```
8 independent async cells, 200ms each   ->  202 ms total   (CONCURRENT)
chain of 8 dependent async cells, 100ms ->  810 ms total   (correctly serialized)
```

Consequence: **any cell whose body returns a Promise is already eligible for
off-thread execution with zero runtime changes.** The dataflow graph already
expresses exactly the parallelism available; only the execution is pinned to one
thread. No fork of `@observablehq/runtime` is needed for the basic capability.

The end-to-end PoC (`worker-offload-poc.html`) confirms composition — same graph,
bodies dispatched to a pool:

```
8 SYNC cells on main thread      93 ms
8 OFFLOADED cells, pool of 8     20 ms      (4.65x)
rAF frames during offload        199 fps    (UI stayed live)
downstream join cell             fired normally with all 8 values
invalidation on redefine         fired -> teardown hook works
```

## 4. Hard constraints (measured, not assumed)

### 4a. `file://` workers get an opaque origin

This is the single biggest constraint and it is a *distribution* constraint, not
a technical one — lopecode's whole point is a file that runs from anywhere.

| capability | `file://` page | http page |
|---|---|---|
| classic blob `Worker` | **OK** | OK |
| module blob `Worker` (`{type:"module"}`) | **FAILS** | OK |
| dynamic `import()` inside worker | **FAILS** | OK |
| `fetch()` of a `blob:` URL inside worker | **FAILS** | OK |
| `fetch()` to the network inside worker | OK | OK |
| `OffscreenCanvas` | OK | OK |
| `SharedArrayBuffer` / `crossOriginIsolated` | **no** | **no** |

From `file://` the worker's origin is literally `null`, so every same-origin
fetch it attempts is blocked. **The only way to get code into a worker on
`file://` is to inline it in the blob source string.** That is not a stylistic
choice — it is the only door.

This retroactively validates the `belief-geometry` pattern: closure-free factory
cells, `.toString()`-concatenated into a blob. Any design that depends on module
workers or on the worker fetching its own dependencies breaks the `file://`
target, which is most of how lopebooks are shared.

### 4b. No shared memory, anywhere

`crossOriginIsolated` is false and `SharedArrayBuffer` is `undefined` on both
`file://` and plain http. COOP/COEP headers can't be set on `file://` at all,
and aren't set on GitHub Pages (`lopecode.com` is a Cloudflare Worker so it
*could* set them, but then the same HTML wouldn't work when saved to disk or
posted to Slack). Treat shared memory as permanently unavailable: the boundary
is `postMessage` with transferables.

### 4c. lopecode's module resolution does not exist inside a worker

`knowledge/lopecode-internal-networking.md`: module loading depends on patched
`globalThis.fetch`, patched `XMLHttpRequest.open`, patched `createElement`, and
`es-module-shims` `resolve`/`source`/`fetch` hooks — all installed on the main
thread's global. A worker has none of them. `tinyemu` already hit this and
solved it the only way available: an XHR mock inside the worker plus a
main-thread fetch relay.

### 4d. Most builtins are DOM-bound

Builtins come from `new stdlib.Library()` (`bootloader:13-45`). Split by
worker-safety:

- **Usable in a worker:** `Promises`, `Mutable`, `invalidation`, `require`
  (network fetch works), plain JS, `OffscreenCanvas`.
- **Not usable:** `md`, `html`, `htl`, `svg`, `tex`, `DOM`, `width`, `Inputs`,
  `visibility`, `now` (no rAF), `FileAttachment` (built from
  `stdlib.FileAttachments` bound to main-thread content lookup), `Plot`/`d3`
  wherever they return nodes.

So the offloadable population is **data-in/data-out cells**. Anything that
produces a node, or consumes a view, stays home.

## 5. Cost model — this sets the granularity

```
spawn+boot blob worker      ~0.6 ms/worker amortized (14 workers in 8.4 ms)
postMessage round-trip      0.0102 ms  (10 us)
transfer 8 MB               0.096 ms   (transfer is ~free — it's just neutering)
structured clone 8 MB       1.53 ms    (~2-5 GB/s)
```

Read off the design rules:

- Per-task overhead is ~10 µs, so **any cell body over ~1 ms is worth
  offloading** (100:1 work-to-overhead). Below ~0.1 ms it's a loss.
- Pools are cheap enough to create on demand and tear down on invalidation. No
  need for a persistent global pool.
- **Always transfer, never clone**, for anything over ~1 MB. Design kernels
  around `ArrayBuffer`/typed arrays. Note transfer is destructive — the
  `belief-geometry` code does `st.weights.buffer.slice(0)` per worker per round
  precisely because of this.
- Chunk work so a round is ≥ a few ms. `belief-geometry` uses K=50 training
  steps between weight exchanges; that ratio is the reason it hits 92%.

## 6. Prior art already in this repo

**`@tomlarkworthy/belief-geometry`** — the reference implementation. Worth
reading as a spec:

- `beliefKitFactory` / `gptFactory`: cells whose value is a **closure-free
  function returning a kit of pure functions**. Closure-free is what makes
  `.toString()` round-trip.
- `workerSource`: derived cell = `factoryA.toString() + factoryB.toString() +
  "(" + main.toString() + ")();"`. A string cell.
- `trainSnapshot`: `async function*` cell — spawns the pool, registers
  `invalidation.then(() => workers.forEach(w => w.terminate()))`, runs
  local-SGD/federated-averaging rounds, and **throttles reactive yields to every
  3rd round** because the re-render dominates.
- Gotcha visible in the source: `self` appears as a *cell dependency* of
  `workerSource` (it's a free identifier inside the stringified `main`, so
  Observable makes it an input, resolving to `globalThis.self` on the main
  thread where it's never used). Cross-references the existing
  `feedback_avoid_free_idents_browser_apis` note. A real API should make this
  explicit rather than accidental.

**tinyemu** (`knowledge/tinyemu-build-chain.md`) — worker + blob-URL asset
serving + main-thread fetch relay for cross-origin. The relay pattern is the
answer to §4c if a worker ever needs notebook content.

Both are hand-rolled per notebook. The question is what to factor out.

## 6b. exporter-3 is already the code-shipping mechanism

The thing that makes worker offload tractable here — and that a generic runtime
could never have — is that **lopecode can already serialise its own live runtime
to source text**. `@tomlarkworthy/exporter-3`:

```js
variableToDefinition(v)   -> `const _pid = ${v._definition.toString()};\n`
generate_definitions(vars)-> all of the above concatenated
generate_define(spec,...) -> `export default function define(runtime, observer) { ... $def(...) ... }`
exportModuleJS(moduleId)  -> { source, fileAttachments }   // a complete standalone module
```

`exportModuleJS` walks the **live** `runtime._variables`, filters to the target
module, and emits a self-contained ES module — from the running graph, with no
build step and no reference to the notebook HTML. That is precisely the artifact
a worker needs. Getting a module into a worker is a string concat plus a
`export default function define` → `function define` rewrite (needed because
module workers don't exist on `file://`, §4a). The runtime itself is embedded in
every notebook at 6.5 KB gzipped, so worker blob = runtime source + generated
module source + harness.

`belief-geometry`'s `factory.toString()` convention is a hand-rolled special
case of exactly this. The general mechanism already exists and is load-bearing.

### acorn is genuinely required — the dep list is not enough

Measured against the real deployed `compile()` in a browser
(`tools/worker-safety-browser.mjs`):

```
cell source                           deps derived by the real compile()
window.URL member                     []          <- INVISIBLE
bare document                         []          <- INVISIBLE
navigator                             []          <- INVISIBLE
bare new Worker                       []          <- INVISIBLE
setTimeout                            []          <- INVISIBLE
bare self                             ["self"]        visible
bare globalThis                       ["globalThis"]  visible
builtin md / html / DOM / width / Inputs / FileAttachment   visible
arrow that uses document (deferred)   []          <- undecidable
```

The Observable parser whitelists browser globals out of `cell.references`, so
`window`, `document`, `navigator`, `Worker`, `setTimeout` **never appear as
dependencies**. The dep list catches DOM-bound *builtins* and nothing else.
(It also explains the oddity in §6: `self` and `globalThis` are *not* in that
whitelist, which is why `workerSource` has a spurious `self` dependency. And it
means the house style of routing browser APIs through `window.X` actively
*hides* DOM use from dependency analysis.)

So classification needs both stages, and acorn 8.11.3 + acorn-walk 8.3.2 are
already embedded in every notebook via `@tomlarkworthy/acorn-8-11-3`, re-exported
by `@tomlarkworthy/observablejs-toolchain`. The string to parse is the same
`v._definition.toString()` exporter-3 already produces.

### Prototype classifier + corpus numbers

`tools/worker-safety-classify.mjs` implements four stages against a live
notebook: (1) dep list → DOM builtins, (2) acorn free-identifier walk → DOM
globals, (3) `structuredClone` probe on each input's and the cell's own live
value, (4) fixpoint applying the code-shipping rule. Across all 2871 named
cells in a booted `belief-geometry` (which pulls in editor-5, lopepage-2,
exporter-3, the toolchain, …):

```
code-safe only ...............  1316/2871  (45.8%)
+ values must clone ..........   422/2871  (14.7%)
+ code-shipping for fn deps ..   443/2871  (15.4%)
```

The collapse from 45.8% → 14.7% is the real finding: **code-safety is cheap,
value-transferability is what actually binds.** And the dominant blocker is
function-valued dependencies — kits of pure functions — which are not cloneable
but *are* `toString()`-serialisable. That is exactly what code-shipping fixes.

Corpus-wide the lift is small (15.4%) because most cells in a booted notebook
are UI. Where it matters, it is decisive — `@tomlarkworthy/belief-geometry`
alone:

```
code-safe 15   ->  clone-values 3   ->  code-shipping 13   / 66 cells
```

with per-cell output that matches ground truth: `beliefKitFactory`, `gptFactory`,
`probeKit`, `beliefKit`, `gptKit` — the exact cells the author hand-picked to
ship into workers — all classify SHIP, while the orchestrators `trainSnapshot` /
`zooSnapshot` correctly classify unsafe (`global:window`), as do all the `htl`
figures. The classifier rediscovers the hand-built design without being told it.

**It also finds work that is not yet offloaded.** `probeData` (3467 b) and
`zooProbeData` (2761 b) are code-safe and, per the notebook's own notes, cost
~1.4 s per refit on the main thread. Each is blocked by exactly one input: an
`EventTarget` (`modelBox` / `zooModelBox`). Passing `modelBox.payload` — plain
data — instead of the EventTarget would make both offloadable. That is a
one-dependency refactor with a ~1.4 s main-thread stall as the prize.

### The boundary rule this yields

> A cell may execute in a worker iff its definition is code-safe (stages 1+2)
> **and** every input is either **cloneable data** (transfer/clone it) or
> **reconstructible code** (its definition is itself code-safe and closure-free,
> so ship the definition text and re-evaluate it in the worker).

That second clause is a transitive closure over the dependency graph serialised
by exporter-3 — i.e. *"run exporter-3 over a subgraph instead of over the whole
notebook"*. It unifies the two mechanisms rather than adding a third.

Known gaps in the mechanism as it stands:
- `generate_define`'s file-attachment preamble calls `window.lopecode.contentSync`
  — absent in a worker. Needs the tinyemu-style main-thread relay, or attachments
  resolved to bytes before the source is emitted.
- `moduleDefineLines` emit `importShim("/x.js?v=4")` — absent in a worker.
  Imported modules must be serialised transitively and inlined.
- Deferred DOM use inside a *returned* function is undecidable statically (row 10
  of the table above). A cell can pass the classifier and still fail at runtime.
  Offload must therefore fail loudly, not silently — and stay opt-in.

## 7. Three designs

### Design A — offload cell bodies (task parallelism)  ✅ recommended

A reusable `@tomlarkworthy/worker-pool` module exposing roughly:

```js
pool = workerPool(kitFactory, {size})   // spawns from factory.toString()
result = pool.call("fnName", ...args)   // -> Promise, ~10us overhead
```

with `invalidation` teardown built in, and a transferable-aware calling
convention. Cells opt in by returning `pool.call(...)`.

- Zero runtime changes; already proven to compose (§3).
- Works on `file://` — inline source only.
- Generalizes exactly what `belief-geometry` already does, so it has one real
  consumer on day one and a second (`svg-lens`, `daw`) plausibly.
- Cost: authors must write closure-free factory cells. That's a real
  discipline, but it's already the house style for this pattern and it's
  checkable statically (see §8).

### Design B — shard the dataflow graph across workers  ⬆️ upgraded by §6b

The literal reading of "offload the reactive runtime". A designated **pure
module** is mirrored into a worker; the main-thread runtime keeps proxy
variables so topology, inspectors, invalidation and downstream all still work,
but each body executes remotely.

Implementable *without forking the runtime* as a definition rewrite: for each
cell in the pure module, define on the main thread
`async (...inputs) => pool.call(moduleId, cellName, inputs)`.

The naive version is a trap: every intermediate value crosses the wire twice per
edge. The fix is **remote value handles** — cell outputs stay resident in the
worker, the main thread holds opaque handles, and materialization happens only
where a DOM cell actually needs the value. That's a real, sane architecture, and
it's the version worth building *if* Design A proves out and demand exists.

§6b removes the two objections that made this look expensive. The source-
generation problem is **already solved** by `exportModuleJS`, working off the
live graph. And the eligibility question is now *decidable and measured* rather
than guessed — the classifier gives you the shippable subgraph, and the
code-shipping rule means a module no longer has to be uniformly data→data: it
needs a shippable *frontier*, with function-valued deps reconstructed from their
definitions rather than cloned.

Remaining honest blockers: generator cells become async iteration over
postMessage (fine at 10 µs/yield); `Mutable` semantics across the boundary need
thought; the file-attachment and `importShim` gaps in §6b must be closed; and
deferred DOM inside returned functions stays undecidable, so this must fail
loudly rather than silently.

### Design C — automatic offload, engine-level  ✅ BUILT (verdict revised)

I originally rejected this as unsound. That was wrong, and the reason is worth
stating precisely: I was treating the decision as one that must be made
*statically over all cells*. It doesn't have to be. The engine sits at the exact
point where the decision is easy — it holds the definition **and** the resolved
argument values — and it can be wrong safely, because a failed offload is
recoverable by re-running locally.

Built and verified: `notebooks/@tomlarkworthy_parallel-runtime.html`
(§10 below). Userspace contains **zero** worker code.

## 8. Recommended path

1. **Measure before building.** Ship a cell profiler first — wrap
   `Variable.prototype._pending` / `_fulfilled` to timestamp per-cell compute,
   and pair it with a `PerformanceObserver` on `long-animation-frame` to
   attribute actual main-thread blocking. Without this, offload targets are
   guesswork. This is also the highest-value artifact on its own: it makes cost
   visible in place, which is the house preference for feedback.
2. **`OffscreenCanvas` is probably the biggest near-term win** and is *not* on
   anyone's radar yet. It's available in workers on both origins (verified).
   This repo is canvas-heavy — the 60k-point chaos game, the architecture-map
   `ImageData` repaints, the flow figure, `svg-lens`, the `daw` — and
   `transferControlToOffscreen()` moves that rendering off the UI thread with a
   much smaller blast radius than moving compute, because the boundary is one
   canvas rather than arbitrary values.
3. **Extract Design A** into a shared module, with `belief-geometry` refactored
   onto it as the proving consumer.
4. **Promote the classifier from prototype to notebook module.** All of its
   inputs — acorn, acorn-walk, `buildModuleNames`, `variableToDefinition` — are
   already live in the notebook; `tools/worker-safety-classify.mjs` only drives
   them from outside. As an in-notebook view it becomes a live "what could be
   parallel" panel, which is the visible-feedback shape this repo prefers. Cross-
   reference it with the §8.1 profiler: **shippable ∩ expensive** is the actual
   target set. Neither dimension alone is useful — 45.8% of cells are code-safe
   and almost all of them are trivial.
5. **Do the `probeData` / `zooProbeData` refactor.** Pass `modelBox.payload`
   instead of `modelBox`. One dependency change, unblocks two ~1.4 s cells, and
   proves the boundary rule end to end on a real notebook.
6. **Then Design B**, reusing `exportModuleJS` for source generation and the
   classifier for eligibility, on whatever the profiler says is hot. Close the
   file-attachment and `importShim` gaps first.
7. **Reuse `notebook-import.ts` as a runtime oracle.** It already boots a module
   into a headless DOM-less runtime, so it independently confirms what the
   classifier claims statically — free cross-validation before trusting a verdict.

## 10. The automatic engine (built)

The patch lives in the embedded bootloader's `boot` cell, gated by
`bootconf.json`, following the precedent already there: `_boot` patches
`Runtime.prototype._computeSoon` for `conf.tick` **before** `conf.mains` are
imported. The same window is used to patch `Variable.prototype.define`, so every
userspace definition is wrapped while bootloader and builtin cells — defined
earlier — stay native.

```json
{ "parallel": ["@tomlarkworthy/parallel-runtime"], "parallelSize": 8 }
```

Per definition, in order:

1. **Scope** — `conf.parallel` is a list of mains. A wrapper around
   `runtime.module()` raises a flag across the synchronous instantiation of an
   allow-listed main, so only that module's cells are wrapped.
2. **Dep screen** — reject if any declared dependency is a DOM-bound builtin
   (`md`, `html`, `htl`, `Inputs`, `DOM`, `width`, `Generators`, …). Known at
   define time, so `viewof` cells never even attempt an offload.
3. **Source screen** — reject DOM/browser-global tokens, `this`, generators,
   parameter mutation, and bodies under 32 bytes.
4. **Argument shipping** — cloneable values clone; function values and plain
   objects of functions (kits) ship **by source** and are re-evaluated in the
   worker. This is the exporter-3 code-shipping rule applied per argument, and
   it is what lets a cell keep depending on a helper-function cell.
5. **Fallback** — any worker failure (non-closure-free shipped function,
   unclonable result, clone error) re-runs the cell on the main thread and pins
   that definition there permanently. Recorded in `__ojs_parallel.fallbackLog`.

`wrapper.toString()` returns the original source, so exporter-3's
`variableToDefinition` still serialises the real cell and save-in-place/export
are unaffected.

### Measured (384x256 path tracer, 8 band cells, pool of 8)

```
                       wall     worst frame gap    fallbacks
parallel  @ 32 spp     1.25 s        17 ms             0
main      @ 33 spp     4.05 s      2026 ms             0
parallel  @ 34 spp     1.41 s        17 ms             0

checksum @ spp=33 main    : {"mean":0.40823461504172864,"count":294912}
checksum @ spp=33 parallel: {"mean":0.40823461504172864,"count":294912}
ENGINES AGREE: bit-identical
```

~3.2x wall-clock, and the main thread goes from a 2-second freeze to a 17 ms
worst frame. The correctness check is a genuine same-input re-render: toggling
the engine mutates `parallelFlag` → `cfg` → all eight bands.

### What the build cost — two real bugs, both instructive

- **Wrapping every module wedged the boot** (17,040,000 `define` calls in ~12 s,
  page unresponsive). editor-5's dynamic-cell machinery repeatedly redefines
  cells and compares `_definition` identity; wrapping broke that identity and
  produced an infinite redefine loop. Fix: scope to declared mains, and never
  wrap `dynamic *` cells. **A transparent wrapper is not transparent if anything
  in the system compares function identity** — and in this codebase, something
  does.
- **`runtime._init` is not usable for "which module is instantiating"** — the
  compiled module's no-arg `runtime.module()` clears `_init` before any cell
  defines. Hence the `runtime.module()` wrapper.

### Honest limits

- **Scoped, not global.** `"parallel": true` (all modules) is implemented but
  hazardous — it was what wedged the boot. The list form is the supported mode.
- **Clones, not references.** A cell that mutates a cloneable input silently
  loses the write. The source screen rejects visible parameter mutation; aliased
  mutation is undecidable.
- **Stale work is discarded, not cancelled.** Superseded results are dropped by
  the runtime's version check, but the worker still finishes the wasted pass.
- **The screens are regex-based**, because acorn isn't loaded that early in boot.
  Conservative by design; the classifier (§6b) is the offline, precise version.

## 9. Open questions

- Does `es-module-shims` shimMode work inside a module worker on an http origin?
  **Not verified.** Only matters for Design B on hosted notebooks; irrelevant on
  `file://`, where module workers don't exist at all.
- Worker count policy under multiple concurrent pools in one notebook — two
  notebooks in one lopepage each spawning 8 workers will oversubscribe. Argues
  for one shared notebook-level pool rather than per-cell pools.
- Safari/Firefox behaviour of blob workers from `file://` is unverified; only
  Chromium was tested.
- Prerender/headless export (`bootconf.prerender`) interaction: worker results
  are async, so a prerender snapshot may capture a pre-compute state.

## 11. Can this be made safe in general?

Not by static analysis alone. The obligations split three ways, and only the
first is a code property.

**(a) Code safety — statically decidable, and now allowlisted.** Does the body
reach a host-only global? `screen()` does scope-aware free-identifier analysis
via `acorn-walk.ancestor`, so `used − bound − params` is the true free set. A
*denylist* of DOM globals is not a gate, it is a guess: `window[k]`,
`globalThis[k]`, `eval(s)`, `new Function(s)` and `import(x)` all reach the host
without naming it. `screen()` therefore also returns `dynamic` (the escapes) and
callers that need soundness check `globals` against `workerIntrinsics` — an
allowlist — and reject any `dynamic` hit.

**(b) Clone fidelity — NOT a code property at all.** This is what broke
lopecode-tour, and no parser could have found it: `structuredClone` **succeeds**
on a class instance and silently returns a plain object with the prototype, and
therefore every method, dropped. `cellMaps` cloned without error; the clone's
`Variable`s came back as inert data; the decompile chain downstream produced a
plausible wrong answer. It is a property of the *value*, so it is decided by
walking the value, not the source. `faithful()` admits only shapes structured
clone reproduces exactly — primitives, `Array`, typed arrays, `Date`/`RegExp`/
`Blob`, `Map`/`Set` with primitive keys, and objects whose prototype is exactly
`Object.prototype` with no accessors and no function-valued properties.

Verified: with `faithful()` in place, lopecode-tour runs at `(all mains)` scope
with **0 regressions** (3144 variables, 2004 resolved, 2 errors — the same 2 as
stock). `allCells`, `all_decompiled` and `test_all_cells_decompilable` are all
declined by the check itself. The module denylist that preceded it is now
redundant and demoted to a bisection aid.

**(c) Purity and liveness — undecidable in general.** Three residual holes:

- *Indirect param mutation.* `screen()` catches `p.x = v`, `p[i]++` and
  mutating-method calls on a param. It cannot catch `helper(p)` mutating `p`
  where `helper` is opaque. Closed in practice because a function argument may
  only be shipped if it is closure-free, and shipping screens its body too — so
  every function that can reach a param is itself screened.
- *Identity.* An object is never `===` its clone. `faithful()` rejects
  object-keyed `Map`/`Set` for this reason, but a cell that compares a *result*
  against a main-thread object by identity is undetectable from the argument
  side.
- *Nondeterminism.* `Math.random`/`Date.now` give different-but-not-wrong
  answers, breaking reproducibility rather than correctness. `screen()` reports
  `nondet`; the policy does not currently block on it.

**Guards, not samples.** An earlier draft of this section proposed running the
first K offloads locally as well, comparing, and then trusting the definition.
That is unsound and is retracted: the divergent path may simply not be on the
sampled inputs, so the check can pass K times and the K+1st be wrong. A JIT does
not work that way either — it re-checks a cheap shape guard on *every* entry and
deopts when one fails. Only the optimised code is amortised; the checking never
is.

Applying that standard here:

| obligation | when checked | sampled? |
|---|---|---|
| code safety | once per definition (immutable) | no — acorn walks all paths |
| argument fidelity | every invocation, on that call's values | no |
| result fidelity | every invocation, in the worker before posting | no |

The result guard is the piece the sampling idea was trying to paper over, and it
does not need sampling. The worker computed from clone-faithful arguments, so
its result *is* the value a local run would have produced; running `faithful()`
on it inside the worker decides exactly whether the trip home loses information.
Fail -> `fail: "result not clone-faithful"` -> the policy falls back locally.
Note that `faithful` is itself shipped by source into the worker harness and so
must obey the closure-free rule it enforces — it was written closing over a
`CLONE_EXACT` set at cell scope and silently rejected everything until inlined.

**Irreducible residue.** Three things survive all three guards:

- *Identity across the boundary.* A result is never `===` a main-thread object.
  Nothing on either side of the call can see a downstream identity comparison.
- *Nondeterminism.* `Math.random`/`Date.now` give different-but-not-wrong
  answers. `screen()` reports `nondet`; the policy does not block on it.
- *Proxies.* A `Proxy` whose `getPrototypeOf` trap answers `Object.prototype`
  passes `faithful()` and is cloned into a flat snapshot, losing its traps.
  Proxies are transparent by design, so this is not detectable, only avoidable.

The honest claim is therefore not "safe in general" but: **unsound only for
identity comparison, nondeterminism, and Proxies — and never by sampling.**
Measured on lopecode-tour at `(all mains)`: 3151 variables, 2011 resolved,
0 regressions against stock.
