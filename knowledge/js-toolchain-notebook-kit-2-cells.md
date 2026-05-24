# js-toolchain: Notebook Kit 2.0 cell compile/decompile

`@tomlarkworthy/js-toolchain` is the Notebook Kit 2.0 (Observable Notebooks 2.0) counterpart
to `@tomlarkworthy/observablejs-toolchain` (classic Observable JS). It compiles a Notebook
Kit JavaScript cell to lopecode runtime cells and decompiles them back.

Notebook Kit and lopecode share the same substrate — Observable runtime 6 — so a cell
compiled here defines variables on the same runtime lopecode already uses.

## Invariant

`decompile(compile(src)) === src`, modulo a single leading/trailing newline (`Sourcemap.trim()`).
The transpiler wraps the **verbatim** source in a prologue/epilogue, so decompile inverts the
wrapper by string-slicing — no code generation, no formatting drift.

## Cell model

Notebook Kit cells are multi-output; lopecode variables are single-output. The mapping:

- **Expression cell** (single value) → one anonymous cell whose body is `return (...)`.
- **Side-effect program** (no top-level declarations) → one anonymous cell, no return.
- **Program with N declarations** → one exports-holder cell named `cell <id>` whose body
  returns `{a, b, ...}`, plus N projection cells `(exports) => exports["a"]` (one per output).
  This mirrors notebook-kit `src/runtime/define.ts`.

`decompile` identifies projection cells by shape (`(x) => x["name"]` with a single input) and
reconstructs the original from the holder + the projected names.

## Imports

Specifiers are kept **verbatim** — `npm:`/`jsr:`/`observable:` are *not* resolved at compile
time (that is lossy; resolution is deferred to the es-module-shims resolve hook in the
browser). Two transforms, both invertible:

- `import {a} from "x"` ⇄ `const {a} = await import("x")` (static imports can't live in a cell
  body, so they become leading `await import` lines; named/default/alias/side-effect forms
  round-trip as identity).
- `import * as ns from "x"` → `const ns = await import("x")` (namespace imports canonicalise to
  a dynamic import; idempotent thereafter, not identity).

A genuine `const m = await import("x")` written by the author is left as a dynamic import.

**Reactive Observable imports (kind B).** A cell that is *only* import declaration(s) whose
specifier names an Observable notebook — `observable:@user/nb`, or a bare `@user/nb` /
`d/<16hex>` — compiles instead to lopecode's native reactive cross-module representation (the
same shape `@tomlarkworthy/observablejs-toolchain` produces, byte-identical to the import
variables the runtime already runs live):

- loader: `{_name:"module @user/nb", _inputs:[], _definition:'async () => runtime.module((await import("/@user/nb.js?v=4")).default)'}`
- per binding: `{_name:"local", _inputs:["module @user/nb","@variable"], _definition:'(_, v) => v.import("imported", _)'}`

These are truly reactive — when the source variable recomputes, importers update. `viewof`/
`mutable` variables travel as `viewof$foo`/`mutable$foo` in the ES specifier and dedollar to
`viewof foo`/`mutable foo` at runtime. Namespace/default imports are unsupported (matches
notebook-kit). Bare `@user/nb` canonicalises to `observable:@user/nb` on decompile (idempotent
thereafter). Lives in `tools/js-toolchain/observable-imports.js`.

## ts mode

Not supported in-browser. `compile(src, {mode: "ts"})` throws. Type-stripping needs a
TypeScript transpiler; notebook-kit's own browser bundle stubs `typescript` out for footprint,
and a stripped ts cell is lossy (decompile could only recover the js). Author TypeScript
elsewhere and store js.

## Files and tests

- Prototype (canonical source, acorn-only, browser-identical): `tools/js-toolchain/`.
- Round-trip corpus (the spec): `tools/js-toolchain/corpus.js`.
- Prototype suite: `cd tools/js-toolchain && bun test ./roundtrip.test.js`.
- The shipped module `@tomlarkworthy/js-toolchain` (mirrors the prototype) carries the real
  tests as embedded `test_*` cells (`test_roundtrip_corpus`, `test_imports`,
  `test_observable_imports`, …), run in-browser via the pairing channel's `run_tests`. It
  imports `acorn`/`acorn_walk` reactively from `@tomlarkworthy/acorn-8-11-3` (the shared
  acorn module, which also serves `@tomlarkworthy/observablejs-toolchain`) rather than
  bundling its own.
