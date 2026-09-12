# Wire formats and runtime shapes, classic vs notebook-kit (measured 2026-09-11)

Record of a probe run on 2026-09-11 against `@tomlarkworthy/notebook-semantics` (document v173) and
its import `@tomlarkworthy/dependancy`, on observablehq.com (notebook-kit) and old.observablehq.com
(classic). A research subagent ran it: headless Playwright, every non-image response saved, and
postMessages into the notebook iframe logged. Nothing on Observable was edited. The raw artifacts
are in `tools/newobs-fixtures/wire-2026-09-11/`; the script is `probe.ts` in that directory.

**Finding the runtime:** `window.__ojs_runtime` is not set, because this notebook does not import
runtime-sdk. The probe hooks `Object.defineProperties` in every frame; the Runtime, Module and
Variable constructors all call it. On notebook-kit the iframe builds 2–3 Runtime objects; the live
one is the largest, with 115 variables. That it is the live one is an inference.

## Off the wire

Both platforms send cell **source** to the parent page, compile it there, and post compiled
definitions into a sandbox iframe, which `eval`s them.

| | notebook-kit (observablehq.com) | classic (old.observablehq.com) |
|---|---|---|
| source in page | Next.js RSC `self.__next_f.push`: `"body":{"cells":[{"id":9,"value":"1","mode":"ojs"},…],"files":…,"stdlib":"1"}` | `__NEXT_DATA__.initialNotebook.nodes` (same as `api.observablehq.com/document/…`) |
| compiled in | parent chunk `/_next/static/immutable/chunks/055nm7dtpgp6v.js` (1.67 MB) | parent page |
| to iframe | `{"type":"update","actions":[…]}`, 60 actions (`insert`, `attachFile`, `stdlib`, `theme`, …); each `insert` is a notebook-kit Definition: `{"id":39,"inputs":["Inputs"],"output":"viewof$view","autoview":true,"body":"function viewof$view(Inputs){return(\nInputs.input()\n)}"}` | `{"type":"bundle","events":[insert_node…]}`; node values `{"body":"function(Inputs){…}","type":"viewof","name":"view",…}` |
| iframe | `chat-worker/index-pGDT7dL9.html` + `assets/index-DjyF6TAv.js` (76 KB runtime + stdlib, no version string found) | `next/worker-BFyCn7ul.html` + `worker-QSqOl_Gp.js` (127 KB) |
| attachments | `attachFile` message, then one **runtime-level** `FileAttachment` registry keyed by resolved href; `module._builtins` = `@variable, invalidation, visibility` | `insert_file`, then a **per-module** `module.builtin("FileAttachment", …)` |
| imports | body contains `import(new URL("/api/import/@tomlarkworthy/dependancy", document.baseURI))`; no query and no version (`?resolutions=` returns identical bytes; the path form `dependancy@20` pins) | `api.observablehq.com/document/<id>@173/imports` gives the resolution `1fb3132464653a8f@24`; the worker fetches `…/dependancy.js?v=4&resolutions=…` (classic `define(runtime, observer)`) |
| stdlib | `stdlib:"1"` swaps `html`, `svg`, `md`, `require`, `resolve`, `DatabaseClient`, `DuckDBClient` in `runtime._builtin` for `@observablehq/stdlib@5` from jsdelivr | legacy stdlib |

## `/api/import` is a third format (the "hybrid")

`api-import-semantics.js`:
- It is `export default function define(runtime)`, with no observer, and uses only `main.define(name, inputs, fn)`.
- Variable names are the legacy spaced form, but function names use the notebook-kit form: `main.define("viewof viewdep", …)` over `function viewof$viewdep(Inputs)`.
- Anonymous cells are `cell <node id>`; md and html cells are dropped.
- Mutables are `initial q` / `mutator q` / `mutable q` / `q`, and imports are import cells with relative specifiers (`import("./dependancy")`).
- Builtins `view` and `FileAttachment` are per module.

## Variable shapes per source cell

Taken from `runtime-dump-notebookkit.json`, `runtime-dump-classic.json` and `vars-both.txt`.

| cell | classic, viewed | notebook-kit, viewed | notebook-kit, imported (hybrid) |
|---|---|---|---|
| md | `null` | `null` | dropped |
| html | variable named `html` | `null` | dropped |
| anonymous `1`, `dep` | `null` | `null`; `cell N` only for multi-output | `cell <id>` |
| `viewof view` | `viewof view` + `view` ← `[Generators, viewof view]` (`Aa(e,t){return e.input(t)}`) | `viewof$view` + `view` ← `[viewof$view]` (`function Br(e){…}` bundle-internal) | `viewof view` + `view` ← `(G,_)=>G.input(_)` |
| `mutable q` | `initial q`, `mutable q` = `new M(_)`, `q` = `_.generator` | `mutable q` = initial value, `cell 42` = Mutator pair, `mutable$q` = `([,e])=>e`, `q` ← `[cell 42]` | `initial q`, `mutator q`, `mutable q` = accessor `([, m]) => m`, `q` = `([m]) => m` |
| import | stubs `async t=>t.import(e.name,e.alias,await i)`; **no `module 1` variable** in the live runtime; that name exists only in the `api.observablehq.com …js` compile | `cell 64` ← `[@variable]`; before it runs, 13 outputs `e=>e[t]` ← `[cell 64]`; after, `_outputs` is empty and each output is identity `function u(e){return e}` ← the remote variable | import cell with relative specifier |

`mutable q` means three different things: the legacy box, the notebook-kit initial value, and the
hybrid accessor.

`cell N` uses the Observable **node id** (`define.ts:45,81` builds `` `cell ${id}` ``; node 42 is
`mutable q`, node 64 is the import). It stays stable across edits to the document.

## Consequences for copying the runtime verbatim

- Runtime-generated **glue** definitions close over free identifiers inside the minified bundle and
  cannot be re-evaluated from `toString()`:
  - notebook-kit: `e=>e[t]`, `function u(e){return e}`, `Br`, `Jr`, `([e])=>e`, and the builtins;
  - classic: `Cr`, `Aa`, `Na`, `Sa`, and the import stubs.
- Only **cell bodies** are self-contained. The notebook-kit bodies are named functions.
- Rewiring is one-way. After an import cell runs, its outputs are no longer linked to it, so its output list must come from its own body, not from `_outputs`.
- Import outputs are `main.variable(true)`, i.e. observed, so the whole imported graph computes.
- Hybrid glue is ordinary source text (`(G,_)=>G.input(_)`, the `mutator` arrow) and can be copied, but it relies on the notebook-kit `Mutable` (called without `new`) and a `view` builtin.

**Not directly observed:** the runtime version (6.x, going by the `_shadow` / define shape); that
the live Runtime is the largest one; that the import cell's own value fields are `undefined` (from
reading the code).
