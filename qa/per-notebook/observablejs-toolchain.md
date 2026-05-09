# Per-notebook QA guidance: observablejs-toolchain

## What this notebook is

Userspace `compile` / `decompile` / `cellMap` for Observable JS source ⇄ runtime variables. Used by editor-5, exporter-3, claude-code-pairing, file-sync, etc — so a regression here can ripple through the entire lopecode stack.

## Important controls / interactive surfaces

- `viewof test_case` — dropdown of `notebook_semantics_source` cases that drives `parsed` and `compiled`. ~26 options including markdown, html, viewof, mutable, async, generators, classes, file attachments. Useful for spot-checking compile across cell shapes without typing source.
- `viewof normalizeObservableSourceSelector` — same dropdown, drives `normalizeObservableSource` smoke.
- `viewof compiled_selector` — selects which compiled output to display.
- All three are read-only viewers — no destructive controls in this notebook.

## Known-quirk runtime cells (don't read as bugs)

- 8 `test_compile_import_*` cells are reachable but `hasValue: false` permanently. They `await import("@tomlarkworthy/dependancy")` against a notebook not in the bundled importmap — the dynamic import promise hangs forever in the bundled HTML. **Causes `run_tests` to time out.** Acknowledged in TODO ("notebook imports WIP"). Don't wait on these; query named tests individually.
- `test_async_interpolation` similarly hangs (awaits `FileAttachment('image@1.png')` that's not bundled).
- `test_decompile_class_with_property` is `hasValue: false` — class field declarations are an open TODO ("class body assignments can't be decompiled").

## Authoring traps to watch for

- **Test success messages that interpolate the wrong expression** — `test_all_cells_roundtrippable` had `${roundtripped}` (an array) instead of `${roundtripped.length}`. The test still "passes" (returns truthy) but produces `"[object Object],…"` in the test report. When adding a bulk test, mirror `test_all_cells_decompilable` exactly: `${VAR.length} cells X without error`.
- **`compile('')` crashes with an opaque TypeError** — parser returns a Cell with `body: null` for empty input; the AST walker doesn't guard. If you touch `compile()`, add an early empty-body return.
- **Bundled-HTML vs ObservableHQ test environment** — tests that `await import("@…")` only work where the imported notebook is in the importmap. If you add a test that imports another notebook by name, it will hang (not fail) in the lopecode bundle.

## Adversarial coverage

- Empty / whitespace input — known crash (issue, see report).
- Unicode, 10KB strings, `${alert(1)}`, `<script>` tag literals, control chars — all compile fine.
- `viewof` / `mutable` / generators / yield / html templates — all compile fine.
- Real syntax errors are intentionally captured (compile returns a runtime cell that throws on invocation; tests `test_compile_syntax_error_*` cover this).
- Class field declarations (`class Cls { d; }`) — opaque `this[d] is not a function` from acorn-walk. Known TODO.

## What `run_tests` will do

It will time out at 60s because of the hanging import tests. Prefer `get_variable` per-test, or filter to specific names. The bulk round-trip tests (`test_all_cells_*`) are the most informative single signal — they exercise compile+decompile on every cell in every loaded module.

## Notable downstream risk

This notebook is a transitive dependency of editor-5, exporter-3, claude-code-pairing, file-sync. A change to `compile`/`decompile` semantics needs an explicit re-QA of those — the test suite here catches local regressions but not consumer-side reliance on output shape.
