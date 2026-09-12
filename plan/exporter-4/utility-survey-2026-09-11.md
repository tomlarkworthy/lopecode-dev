# Where lopecode's support modules assume classic variable shapes (survey 2026-09-11)

A research subagent produced this survey on 2026-09-11. It read each module's canonical HTML from
the main checkout with `bun tools/lope-reader.ts <html> --get-module <m>`, and line numbers (L) refer to
that output.
- **Read in full:** modules, cell-map, module-map, runtime-sdk, fileattachments, bootloader.
- **Grepped, then read around the hits:** editor-5, exporter-3, pairing, lopepage/-2, observablejs-toolchain. Something outside the grepped regions may have been missed.

Classes: **a** = already handles both shapes · **b** = fixable in place with a small dual-style
change · **c** = needs a redesign or new version.

## Findings (condensed)

| module | site (L) | assumption | under notebook-kit | class |
|---|---|---|---|---|
| modules | scan L80-94 | imported modules only via `module X` vars | modules loaded by import cells are **invisible** (in `runtime._modules`, so they are not roots) | b |
| modules | `slugFromDef` L43-46 | regex over `import(...)` | captures the host in a full URL | b |
| modules | `moduleTitle` L224 | skips `module ` vars | may pick an import `cell N` as the title | b |
| module-map | `module_definition_variables`, `resolve_modules`, `notebookImports`, `pageImportMatch`, `summary` | `module ` vars, legacy DOM scraping, `_definition()` with no arguments | notebook-kit imports never resolve | c (freeze) |
| cell-map | `importedModule` L762-838 | two-protocol probe | works | a |
| cell-map | `cellMap` L285-298, L336-354, L400-423 | `viewof `/`mutable ` prefixes; 3-variable mutable | `viewof$x` splits into two cells; the 4-variable mutable **drops out of the map** | b |
| cell-map | multi-output | — | the holder and each projection become separate cells | b/c |
| runtime-sdk | `lookupVariable` L593-617 | tries both spellings | works | a |
| runtime-sdk | `persistentId` L643-651 | hash of name + definition | `cell N` is the node id, so it stays stable (see the wire record) | a |
| editor-5 | `hotbarTemplate`, `divToVar` | — | works | a |
| editor-5 | naming L1438-1449, `compile_and_update` L1584-1612, decompile | classic AST; slot counts viewof = 2 / mutable = 3 / import = 1+N | always writes classic shapes; cannot decompile holder, projection or import cells | c |
| visualizer | `variablesForCell` L211-222 | mutable order `[initial, mutable, x]` | wrong index | b |
| lopepage | `modulePanel` L124 | `_scope.get(component.cell)` | a `#viewof x` link misses `viewof$x` | b |
| module-selection | `removeModule` L145-166; footer | `module ${name}` only; module-map | leaves import cells behind | b |
| exporter-3 | `buildModuleNames` L876-945 | leftover modules are named `main` | notebook-kit imports are **excluded from the export** | c |
| exporter-3 | `isImportBridged` / `findImportedName3` | probe with `{import}` | throws, and the export hangs | c |
| exporter-3 | `variableToDefinition` L1379 | `_definition.toString()` for everything | glue definitions reference bundle internals (confirmed by the wire record) | c |
| exporter-3 | `getFileAttachments` L1049-1062 | `module._builtins` only | main-notebook files are lost | b |
| observablejs-toolchain | `decompile` L1399-1472 | classic prefixes | `viewof$x`, `cell 3 = …`, `mutable$x.value` mis-decompile | c (route to js-toolchain) |
| observablejs-toolchain | `findModuleName`, `findImportedName`, `decompileImport` | `module ` vars; `{import}` probe | `<unknown>` / throws | b |
| js-toolchain | compile/decompile | — | missing: autoview (`viewof$x` + `input`), automutable (4 variables), decompiling a native import cell, unique holder ids (default `id = 1`), namespace/default observable imports, the `display`/`view` shadows, ts mode | c |
| fileattachments | `getFileAttachments`, `getFileAttachmentsMap` | — | already dual-style | a |
| fileattachments | `removeFileAttachment` L177, `all_module_files` L249-264 | `_builtins`; `module ` vars | silent no-op; kit modules missing | b |
| bootloader | `define_builtins` L16-41 | Notebook 1.0 stdlib; no `display`/`view` | kit modules cannot run natively | c (only if running them natively) |
| networking `normalize` | exported HTML L14 | `api.observablehq.com/…js?v=4` → `<slug>` | handles the classic and replica forms; `/api/import/<slug>` and relative `./x` were **not checked** | unverified |
| claude-code-pairing | `cc_find_module` L398-416 | module-map `currentModules` | kit modules missing | b |
| lopecode-channel.ts | define_cell L710, update_cell L1843 | classic compile; rejects more than 1 compiled variable | cannot edit kit cells | c |
| lopecode-channel.ts | docs L384-391, L550-576, L620-664 | teach classic shapes | wrong for kit | b |
| tests | `modules` L59, `testing_variables` L62-77 | moduleMap naming | kit tests get no prefix | b |

`module-map` is **not formally deprecated** anywhere. Its replacement, `@tomlarkworthy/modules`, is
an async generator of a cumulative `Map<Module, {name, title, module, variable}>` with no dependency
edges. `knowledge/notebook-programming-concepts.md:615,623` still recommends `moduleMap`.
Import-bridge counts across the corpus: `moduleMap` 1713, `modules` 241.

## Summary

- **Dual-style in place (b):** modules, cell-map, visualizer, lopepage/-2, module-selection, tests, the observablejs-toolchain import helpers, fileattachments' last two gaps, and pairing's lookups and docs.
- **New version or redesign (c):** module-map (freeze it), exporter-3 → exporter-4, editor-5's compile/apply path and pairing's define/update (per-module dialect dispatch between observablejs-toolchain and js-toolchain), js-toolchain's gaps, and a notebook-kit bootloader if kit modules are to run natively.

The survey's correction to `persistentId` (class a, not b/c) was made after the wire record showed
that `cell N` is the node id.
