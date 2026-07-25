# Diagnosing new.observablehq.com Platform Differences

`new.observablehq.com` runs our notebooks on the **notebook-kit** runtime + stdlib.
`observablehq.com` (classic) still runs the legacy runtime. Our modules reach deep into
Observable internals, so each difference surfaces as one broken cell that cascades. This is the
playbook for finding the next one fast.

## The three platforms, and which one you are debugging

| | classic observablehq.com | new.observablehq.com | lopecode HTML |
|---|---|---|---|
| Compiler for the **viewed** notebook | legacy (`viewof x`) | notebook-kit (`viewof$x`) | legacy (jumpgate output) |
| Compiler for **imported** notebooks | legacy, from `api.observablehq.com/….js?v=4` | **legacy, same endpoint** | legacy, embedded `<script>` |
| stdlib | legacy `@observablehq/stdlib` | `notebook-kit/src/runtime/stdlib` | legacy (vendored) |
| Renders in | iframe `*.static.observableusercontent.com/next/worker-*` | iframe `*.static.observableusercontent.com/chat-worker/*` | the page itself |
| `window.__ojs_runtime` | set by runtime-sdk's `runtime` cell | same | set by the bootloader before any main |

**The single most important consequence:** on the new site a notebook behaves differently
depending on whether it is being *viewed* or *imported*. Viewed → new compiler, new stdlib
conventions. Imported → the same legacy JS classic gets, so it keeps per-module builtins,
`viewof x` names, and `main.builtin(…)` wiring. `@tomlarkworthy/editor-5` viewed as a page and
`editor-5` imported by `svg-lens` are two materially different environments. Always state which
one a bug is in.

`isOnObservableCom()` matches `observableusercontent.com`, so it is **true on both** classic and
new (both render in that iframe). It does not distinguish them.

## Fast triage loop

Tools live in `tools/` (all Playwright, all headless by default, `HEADED=1` to watch):

| Tool | Answers |
|---|---|
| `newobs-probe.ts <url>` | what errors, in which frame, plus every console line |
| `newobs-probe-repin.ts <url>` | same, but rewrites a pinned module version **in flight** — test a version bump before touching Observable. `NO_REPIN=1` for the baseline |
| `newobs-imports.ts <url>` | every notebook module fetched, with its pinned version + resolution context |
| `newobs-pin-audit.ts [slug…]` | which of our notebooks pin `@mootari/access-runtime` below the fix |
| `newobs-trace.ts <url> "<needle>"` | **CDP pause-on-all-exceptions** → the real throw site with source, even when the runtime swallows and re-wraps the error |
| `newobs-cellstate.ts <url> <names>` | per-variable `reachable / computed / error / value` — the classic-vs-new diff table |
| `newobs-inspect-runtime.ts <url>` | walks the live runtime (modules, `_builtins`, scope) with the access-runtime repin applied |
| `newobs-pending.ts <url>` | every **reachable-but-never-computed, unerrored** variable with its inputs' states — finds *hangs*, which carry no error and no error badge |
| `newobs-scroll-probe.ts <url>` | does lazy rendering pull in more modules (and more stale pins) on scroll |
| `newobs-mutable-repro.ts` | offline repro: notebook-kit stdlib + `@observablehq/runtime@6` + the **real** served module JS |
| `newobs-inspect-fa.ts`, `newobs-inspect-write.ts` | worked examples of reading the live runtime: what `FileAttachment` resolves to, and calling the suspect function by hand in the page |
| `newobs-fileattach-fix-test.ts` | worked example of running one function against **both** platform shapes, asserting old-fails/new-passes |
| `newobs-fileattach-live-test.ts` | worked example of patching a served module's **source** in flight |

Recommended order:

1. **`newobs-probe.ts`** — get the exact error text and which cells carry it. Errors cascade, so
   most of the list is downstream of one root cell.
2. **`newobs-trace.ts <url> "<part of the message>"`** — the runtime wraps cell errors in
   `RuntimeError` at a single minified site, so the stack you see in the console is useless. This
   attaches CDP `Debugger.setPauseOnExceptions: "all"` and prints the true frames *with source*.
   This is what turns "Cannot create property 'value' on number '0'" into
   "`$0.value = $0.value + 1` in access-runtime's `captureRuntime`" in one run.
   Note the notebook iframe shares the page's CDP session — attach to the **page**, not the frame
   (`newCDPSession(frame)` throws "does not have a separate CDP session").
3. **`newobs-cellstate.ts` on classic and new, same cell list** — the sharpest signal. A cell that
   is `computed: false, err: null` on classic but errored on new was never *reached* on classic
   (Observable is lazy — unobserved cells never run, so latent bugs stay invisible). A cell that
   holds a real value on classic and `null` on new is a genuine regression. This is how the
   editor-5 "Example" cell errors were shown to be `editedCell === null`, not broken machinery.
4. **`newobs-inspect-runtime.ts` / a bespoke `frame.evaluate`** — once `window.__ojs_runtime` is
   available, stop inferring and read the runtime. Find variables by `_name`, check
   `_value`/`_error`, and *call the suspect function by hand* in the page. Calling
   `jsonFileAttachment("x.json", {a:1})` in the live realm is what proved the "Blob" error came
   from a mis-derived class, not from the `new Blob([bytes])` line it appeared to be on.
5. **Reproduce offline with notebook-kit** (next section) before proposing a fix.

## Reproducing offline with notebook-kit

`vendor/notebook-kit` has the runtime the new site ships. You can drive it in Bun with no
browser, and — the important part — you can load the **real module JS Observable serves**:

```ts
import { Runtime } from "../vendor/notebook-kit/node_modules/@observablehq/runtime/src/index.js";
import { Mutable } from "../vendor/notebook-kit/src/runtime/stdlib/mutable.ts";

const runtime = new Runtime({ Mutable: () => Mutable });   // minimal builtins, add as needed
const define = (await import("./newobs-fixtures/access-runtime-939.js")).default;
define(runtime, (name) => name === "runtime" ? myObserver : noopObserver);
```

Points that make this work:

- **Do not import `stdlib/index.ts`** — it does `document.querySelector` at module top level.
  Import the individual stdlib modules you need and hand-build the builtins record.
- Fetch fixtures from `https://api.observablehq.com/@user/slug.js?v=4` (add
  `&resolutions=<docId>@<version>` to get a *specific* consumer's view of the dependency graph).
  Keep them under `tools/newobs-fixtures/` so the test is deterministic.
- Observe only the cell under test. Everything else stays unobserved and never computes, so you
  do not need `md`, `Inputs`, `htl` or a DOM.
- Error messages differ between engines: Chromium says
  "Cannot create property 'value' on number '0'", JSC/Bun says
  "Attempted to assign to readonly property". Assert on behaviour, not the string.
- `globalThis.document = { baseURI: "…" }` is enough of a DOM stub for the file-attachment code.

Worked examples: `tools/newobs-mutable-repro.ts`, `tools/newobs-fileattach-fix-test.ts`
(the latter runs the *same* function against both platform shapes and asserts old-fails/new-passes).

## Testing a fix without touching Observable

Playwright request interception lets you rewrite what the page loads, so you can measure a fix on
the live site before publishing anything. Two flavours, both in use:

- **Version bump** (`newobs-probe-repin.ts`): route `**/<docId>@<old>.js*`, fetch the new version
  server-side, `route.fulfill` with it.
- **Source patch** (`newobs-fileattach-live-test.ts`): route `**/<slug>.js*`, fetch the served
  text, apply exact string replacements to the compiled cell bodies **and** to the matching
  `main.variable(observer("x")).define("x", [deps…], _x)` line if dependencies change, then
  fulfill. Throw if a replacement target is not found — a silently no-op patch reads as "the fix
  didn't help".

Serve with `content-type: text/javascript; charset=utf-8` and
`access-control-allow-origin: *`.

Always capture the `NO_PATCH=1` / `NO_REPIN=1` baseline in the same session; "9 errors" only means
something against "23 errors".

## Import version resolution (the thing that wastes the most time)

Observable pins imports per document in a `resolutions` array, readable without auth:

```sh
curl -s https://api.observablehq.com/document/@user/slug | jq '.resolutions'
```

Entries look like `{specifier: "@mootari/access-runtime", value: "e1c39d41e8e944b0@939"}`. A value
**with** `@version` is a hard pin; **without** it tracks latest.

**Resolution context is per importer, not per root.** Each imported notebook is fetched as
`….js?v=4&resolutions=<thatDoc>@<version>`, and *that* document's map decides the versions of its
own transitive imports. So:

- Fixing the pin in the notebook you are viewing does nothing for the notebooks it imports.
- On the new site the viewed notebook has **no** resolution context at all (new compiler), so its
  map is never consulted — only the imported notebooks' maps matter.
- A stale pin anywhere on the path to a shared module re-breaks the whole subtree. Audit the
  whole path: `bun tools/newobs-pin-audit.ts`.
- `newobs-imports.ts` prints `<module> || resolutions: <docId>@<v>` for every fetch, which tells
  you exactly **which** document to go fix.

Fix in the Dependencies panel on observablehq.com, updating the offending row only — "Update all"
bumps every dependency of that notebook.

## Known differences (each one cost a debugging session)

### `Mutable` — legacy box vs bare generator

Legacy stdlib `Mutable(v)` returns `{generator, value}`. notebook-kit's returns the **generator
itself** with a `value` accessor. Legacy-compiled `mutable x` is
`main.define("mutable x", ["Mutable","initial x"], (M,_) => new M(_))`, so under notebook-kit that
variable *is* a generator, the runtime unwraps it, and `mutable x` settles to the yielded value.
Consequences:

- writes (`mutableX.value = …`) throw — assigning a property on a primitive;
- reads (`x = _.generator`) silently become `undefined`.

`@mootari/access-runtime@947+` duck-types both shapes (`m.generator ? m : wrap(m)`); `@939` does
not, which broke `runtime-sdk`'s `runtime` → `module-map` → everything.

**Any of our own legacy `mutable` cells has the same latent problem.** Find them with
`grep -l 'new M(_)' modules/@tomlarkworthy/*.js`. A per-notebook remedy is a module-local cell
named `Mutable` that returns the legacy box — module scope shadows the builtin for every cell in
that notebook.

### `FileAttachment` — three differences

For the **viewed** notebook only (imported modules keep the classic shape):

1. `FileAttachment` is a single **runtime-level** builtin, so `module._builtins` holds only
   `@variable, invalidation, visibility`. Anything doing
   `module._builtins.get("FileAttachment")` gets `undefined`.
2. The registry is keyed by **resolved href**, not plain name.
3. `Inputs.file()` yields a raw `File`, not a FileAttachment wrapper — so
   `sample.__proto__.__proto__.constructor` lands on `Blob` (File extends Blob), and constructor
   arity differs (classic `new K(name, mimeType)` vs `FileAttachmentImpl(href, name, mimeType)`,
   whose `.json()` reads `this.href`).

(1) and (2) are fixed in `@tomlarkworthy/fileattachments`. (3) is not: it only affects the
attachment *write* path, which is inert on Observable anyway (`save_options` is reachable but
never settles on classic). See `knowledge/how-file-attachments-work.md`.

Note the capture hack in `getFileAttachmentsMap` — patch `Map.prototype.get/has`, call
`FileAttachment("")`, keep `this`. notebook-kit **memoises unknown names**, so the probe must also
no-op `Map.prototype.set` or it registers `document.baseURI` as a bogus attachment.

### Import cells — shape *and* name both change (this one hangs, it does not error)

For the **viewed** notebook, the two compilers emit completely different import cells:

| | legacy | notebook-kit |
|---|---|---|
| variable name | `module 1`, `module 2`, … | `cell 227`, `cell 226`, … |
| definition | `async t => t.import(name, alias, await mod)` | `async (__variable) => { … __variable._module._runtime.module(_.default) … }` |

Both have exactly one input, `@variable`, and both stringify to something containing `import(`.

Two consequences bite together:

- Anything filtering on `_name.startsWith("module ")` (cell-map's `isModuleVar`) no longer
  recognises them, so they fall through into the *ordinary named variable* path.
- `cell-map`'s `importedModule(v)` then probed them with `{import: (...a) => resolve(a[2])}`,
  which the notebook-kit definition rejects with
  `Cannot read properties of undefined (reading '_runtime')`.

That throw landed in `new Promise(async (resolve, reject) => { … throw err })` — **an async
executor**. The throw goes to the async function's own returned promise, which nobody awaits, so
`reject` is never called and the outer promise *never settles*. Result: an unhandled-rejection
pageerror plus an eternally pending `viewof liveCellMap` → `findCell` → `selectVariable` →
`editorTemplate`/`shellTemplate` → `cellEditor` → every consumer of editor-5. Symptom is a cell
that renders **nothing at all**, with `reachable: true, computed: false, err: null` — no error
badge anywhere. `newobs-pending.ts` lists every such variable and its inputs' states; the roots
(all inputs `ok`) are the real suspects.

Fix is one probe object that satisfies both protocols:

```js
const rt = v._module?._runtime;
let captured = null;
const probe = {
  import: (...args) => { captured ??= args[2]; },                              // legacy
  _outputs: [],
  _module: { _runtime: { module: (...args) => {                                // notebook-kit
    const m = rt.module(...args); captured ??= m; return m;
  } } }
};
try { await v._definition(probe); return captured; } catch { … return captured; }
```

`runtime.module(definition)` is memoised per definition, so re-calling it hands back the same
Module the real import created — no side effects. Fixed in `@tomlarkworthy/cell-map`.

**Never leave a failure path that neither resolves nor rejects.** A hang is far more expensive to
diagnose than an error, because nothing in the UI marks it.

### Cell naming

The new compiler emits `viewof$x` / `mutable$x` where legacy uses `viewof x` / `mutable x`. Any
lookup-by-name (`lookupVariable`, `module-map`'s `"module "` prefix scan, editor-5's
`hotbarTemplate`) must handle both. This is why `title_variable` is `undefined` on the new site,
which leaves `editedCell === null`, which errors every cell in editor-5's Example section.

### DOM assumptions

`divToVar` maps a `.observablehq` div to a variable via `div.variable` or
`v._observer._node === div`; `module-map`'s `notebookImports` scrapes `.observablehq--import`
text. Both are legacy-DOM contracts. `.observablehq--error` / `.observablehq--inspect` classes do
exist on the new site (that is what the probes count), but do not assume more than that.

Also: the new site **renders cells lazily**, so a probe that never scrolls sees fewer cells than a
human does. `newobs-scroll-probe.ts` checks whether scrolling pulls in more modules. Cell counts
vary run to run — compare error *sets*, not counts.

### Noise you can ignore

`Cannot create property 'langApiRestored' on string 'self'` (Observable's own highlight.js),
`function g(){throw g}` as a pageerror (a runtime sentinel escaping),
`error building module dependancy map undefined …` from module-map's `summary` (its
`main_modules` is empty because the new platform's main module is not discovered as a "main" —
cosmetic `console.error`, the map still builds), and `Cannot sourceModule for h`.

## Checklist for the next platform bug

1. Which environment — viewed or imported? (`viewof$x` in the cell name ⇒ viewed.)
2. `newobs-probe.ts` → the error text and the cell set.
3. `newobs-trace.ts` with a fragment of the message → the real throw site.
4. `newobs-cellstate.ts` on classic **and** new → regression or merely newly-reached?
5. Is it a stale pin? `newobs-pin-audit.ts` + `newobs-imports.ts`.
6. Reproduce offline against notebook-kit with the real served module JS.
7. Prove the fix in flight (`route.fulfill`) with a baseline in the same session.
8. Fix in the utility module that owns the concern, never in each consumer.
9. Push: `sync-module.ts` into the canonical HTML(s), then `lope-push-ws.js --cells <names>`
   (see `knowledge/pushing-cells-to-observablehq.md`), then re-probe the live site plus a classic
   regression run and a `lope-browser-runner.ts` smoke test of the lopecode path.
