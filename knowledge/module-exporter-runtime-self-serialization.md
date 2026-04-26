# `@tomlarkworthy/exporter` — runtime self-serialization

A series of notebooks (`exporter`, `exporter-2`, `exporter-3`) that capture the live Observable runtime into a single self-contained HTML file. The current canonical version is `@tomlarkworthy/exporter-3`. All versions serve the same goal; later versions refactor the implementation.

## Design goals

From the exporter-3 notebook's own README cell (cell `_3`):

> Serialize literate computational notebooks with their dependencies into single downloadable files. Double click to open locally. No server required, works in a `file://` context for simplicity.
>
> - **File-first** representation. The Observable Runtime and common builtins like `Inputs`, `htl`, `highlight`, `_` (lodash) and `markdown` are bundled for offline operation.
> - **Recursive and self-sustaining** — the exporter is implemented in userspace and can be forked again after exporting.
> - **Fast** — single file notebooks open fast.
> - **Moldable** — uncompressed, readable, editable with a text editor, diffable by Git.
> - **Runtime-as-the-source-of-truth** — format derived from the live Observable runtime representation.
> - **No sandboxing** — rendered without an iframe.
> - **Custom bootloaders** — control over the standard library.
> - **Userspace** — implementation is a normal notebook.

Same cell, the canonical "why exporter-3":

> Exporter improves upon exporter 2 by refactoring out Observable JavaScript concepts; it works on the low-level representation directly.

## Lopecode HTML output format

From exporter-3 notebook cell `_5`:

```html
<script id="d/c2dae147641e012a@46"
        type="text/plain"
        data-encoding="base64+gzip"
        data-mime="application/javascript"
>
  ...inline text or base64 string
</script>
```

Each `<script>` block holds content used to serve internal network requests locally. Requests to the URL matching the `id` are intercepted by the bootloader and served from the inline content — covering `import`, `fetch`, `XMLHttpRequest`, and `<script>` `src` attributes. This is what makes a single HTML file self-contained: every dependency is embedded as one of these blocks.

## Versions

| Version | Status | File | Load-bearing for |
|---|---|---|---|
| `@tomlarkworthy/exporter` (v1) | Retired | (purged from repo) | Older notebook re-exports |
| `@tomlarkworthy/exporter-2` | Production | `lopecode/notebooks/@tomlarkworthy_exporter-2.html` | Every entry in `tools/depmap.json`; pairing-channel `export_notebook` / `fork_notebook` |
| `@tomlarkworthy/exporter-3` | Published-but-not-load-bearing | `lopecode/notebooks/@tomlarkworthy_exporter-3.html` (Apr 6) | The exporter-3 notebook itself |
| `@tomlarkworthy/exporter-3` (staging) | Development | `lopebooks/notebooks/@tomlarkworthy_exporter-3.html` (Apr 11) | Adds `exportModuleJS` for file-sync work; not yet promoted to lopecode/ |

`bulk-jumpgate` pulls latest module versions from Observable, so re-exporting any notebook drifts it forward through this series. (See `bulk-exporting-lopebooks.md` — *"Older notebooks that used older module versions (exporter v1, editor-2/3/4) will grow 20–40% when re-exported."*)

## v2 → v3: what actually changed

The driver was refactor + planned features (file-sync). Verified against the deployed exporter-3 source rather than the scratch prototypes.

**1. Bootconf path is local, not Observable-hosted.** v2 reads `bootconf.json` via `importShim('file://bootconf.json', 'https://api.observablehq.com/@tomlarkworthy/exporter-2.js?v=4')`. v3 uses `importShim('file://bootconf.json', 'file://@tomlarkworthy/exporter-3')` — fully local, no api.observablehq.com fallback URL.

**2. `keepalive` + `task`-driven export.** v3's `exportToHTML` calls `keepalive(exporter_module, 'tomlarkworthy_exporter_task')` to force observation of the export task, then uses `$0.send({mains, runtime, options})` to communicate with the task cell, which produces the response. The `task` mechanism gates the heavy work on a UI click; programmatic callers must trigger the keepalive themselves.

**3. New `exportModuleJS` cell** — *only in the staging copy at `lopebooks/`, not in published `lopecode/`*. Composes existing pieces (`buildModuleNames`, `isModuleVar`, `isDynamicVar`, `getFileAttachments`, `generate_module_source`) into a per-module export with no `task` dependency. Exists because file-sync (per `lopecode-dev/plan/file-sync-notebook.md`) needs to serialize one module at a time on demand.

**4. NOT a "raw variable serializer".** Earlier prototype work in `tools/scratch/exporter3_src.js` was titled "Raw Variable Serializer" and dropped `cellMap` / `moduleMap` dependencies. **The deployed exporter-3 module did not adopt that approach** — it still imports `cellMap`, `moduleMap`, `resolve_modules`, `summary`, `forcePeek` from `module-map`, and reuses runtime-sdk and themes the same way v2 did. The architectural simplification stayed in scratch.

## Output format diffs across versions

A notebook re-exported with v3 will produce a structurally different HTML byte sequence from v2 — same runtime behaviour, different file. Reported diffs (from comparison work in `9bdb6d92-…jsonl`):

- `viewof` / `mutable` value extractors hoisted to named consts via `$def` (vs inlined in v2).
- Import helpers no longer emitted as standalone `const _hash = (_, v) => v.import("name", _)` arrows.
- Module definitions grouped at the top of the define block (vs interleaved).
- Empty `FileAttachment` maps dropped (vs included as boilerplate).

These differences come from `generate_module_source` / `generate_define` / `variableToDefinition` doing their own thing in v3, not from any architectural cleanup. Bulk re-jumpgating a corpus from v2 to v3 will produce diff noise across every notebook; don't mix v2 and v3 outputs in the same review.

## Public API

```js
// All versions — UI factory
exporter({
  handler: (action, state) => {},  // optional click handler (defaults to actionHandler)
  style: undefined,                // CSS string or DOM node
  output: (out) => {},             // hook to receive export result
  notebook_url: undefined,         // hardcode default notebook URL
  debug: false,
})
```

```js
// All versions — full export, no UI
async function exportToHTML({
  mains = new Map(),    // name -> module Map of main modules
  runtime = _runtime,
  options = {}          // head, title, theme, bootloader, headless, hash, ...
} = {})
```

In v3, `options` is normalised inside `exportToHTML`:
- `options.bootloader` defaults to `'@tomlarkworthy/bootloader'`
- `options.headless` falls back to `bootconf.headless`
- `options.theme` triggers `await cssForTheme(options.theme)` to set `options.style`
- `options.style` falls back to module-level `css`
- `options.hash` falls back to `location.hash`

Then `keepalive(exporter_module, 'tomlarkworthy_exporter_task')` and `$0.send({mains, runtime, options})` produce the response. The result shape is `{ source: string, report: object }` — *not* a raw HTML string. Callers piping the result through a network boundary or naive `JSON.stringify` need to extract `.source` first. (The pairing-channel `export_notebook` was bitten by this; see `feedback_fork_via_exporter.md`.)

```js
// v3 staging only — per-module export
async function exportModuleJS(
  moduleId,
  { runtime = _runtime, moduleNamesFn = buildModuleNames } = {}
)
// returns { source: string, fileAttachments: Map<name, {url, mimeType}> }
```

Implementation (verbatim from `lopebooks/.../exporter-3.html`, line 1052):

```js
const fn = async (
  moduleId,
  { runtime = _runtime, moduleNamesFn = buildModuleNames } = {}
) => {
  const names = moduleNamesFn(runtime);
  let targetModule = null;
  for (const [module, info] of names) {
    if (info.name === moduleId) { targetModule = module; break; }
  }
  if (!targetModule) throw new Error(`Module not found: ${moduleId}`);
  const variables = [...runtime._variables].filter(
    (v) =>
      v._module === targetModule &&
      (v._type === 1 || isModuleVar(v)) &&
      !isDynamicVar(v)
  );
  const fileAttachments = getFileAttachments(targetModule) || new Map();
  const spec = { name: moduleId };
  const source = await generate_module_source(spec, variables, fileAttachments, { moduleNames: names });
  return { source, fileAttachments };
};
```

Unlike `exportToHTML`, no `task` dependency — runs immediately against the live runtime.

## Internal cells of interest (exporter-3, line numbers from `bun tools/lope-reader.ts ... --get-module @tomlarkworthy/exporter-3`)

| Cell | Line | Role |
|---|---|---|
| `_exporter` | 112 | Main UI factory. Returns the `<div class="moldbook-exporter">` with fork/download anchors and theme controls. |
| `_actionHandler` | 461 | Default click handler for the UI. Dispatches on `action` (download/fork). |
| `_exportToHTML` | 518 | Full HTML serialization entrypoint. |
| `_getSourceModule` | 557 | Resolves "this notebook" / "a notebook url" / "the top 100" UI choices to a runtime module. |
| `_exportAnchor` | 356 | Generic `<a>` factory used by fork and download anchors. |
| `_forkAnchor`, `_downloadAnchor` | 455, 458 | UI triggers (fork = open in tab, download = save to disk). |
| `_buildModuleNames` | 778 | Build `Map<Module, {name}>` from runtime + bootloader info. Used by `exportModuleJS`. |
| `_isModuleVar`, `_isDynamicVar`, `_isImportBridged` | 850, 853, 856 | Variable-type predicates. |
| `_moduleNames` | 885 | `task` + `moduleMap` + `task_runtime` → resolved module-name map. |
| `_module_specs` | 919 | Async cell. Depends on `task`. Walks `included_modules`, calls `generate_module_source` for each. The "v2-style" full pipeline. |
| `_getFileAttachments` | 951 | Returns `Map<name, {url, mimeType}>` for a module. |
| `_generate_module_source` | 1029 | Composes `generate_definitions(variables) + generate_define(spec, ...)` to produce a `.js` module string. |
| `_book` | 969 | Async cell. Awaits `module_specs` and produces the final HTML payload. |
| `_report` | 998 | Companion to `book`. Builds the metadata `report` object. |
| `_tomlarkworthy_exporter_task` | 1017 | The Observable `task` cell that gates the heavy work on UI events. |
| `_exportModuleJS` | 1052 (lopebooks only) | Per-module synchronous-on-runtime export. |

## UI panel

```
&open=@tomlarkworthy/exporter-3   # or exporter-2 for production
```

Three actions:
- **Download** — save the HTML to the user's downloads folder.
- **Fork** — open a sibling copy in a new tab. The fork button preserves all URL parameters (including `&cc=` pairing tokens), so a forked notebook auto-reconnects to the same Claude session.
- An internal debug view.

**Prefer the fork button over custom blob-URL approaches.** Programmatic alternatives using `window.open(URL.createObjectURL(blob))` hit Safari's popup blocker; the in-flow click on the fork anchor does not.

## Pairing-channel integration

| MCP tool | Behaviour |
|---|---|
| `export_notebook` | Calls `exportToHTML()`, extracts `.source`, overwrites the notebook's HTML file on disk. |
| `fork_notebook` | Same call, but writes to a sibling file (`notebook--TIMESTAMP.html`). Useful for checkpoints. |

At the time of this draft, `tools/channel/lopecode-channel.ts` references "exporter-2" in lines 153, 213, 560 — three docstrings that will need updating once the v3 cutover happens. The handler code itself imports whichever version the live notebook has loaded; it is not pinned to a specific exporter version.

## Cross-cutting gotchas

These apply regardless of version:

- **Browser-only.** `exportToHTML` depends on DOM serialization paths that LinkeDOM does not fully implement. Round-trip tests in Node time out. For headless export, use Playwright (`tools/lope-jumpgate.js`) rather than a Node DOM shim.
- **Observation gating** (full export). The export pipeline is gated on a `task` cell that fires only on user click. `_module_specs` and dependent cells are not computed until a real export is requested. Forcing computation via `eval_code` (`v._reachable = true; v._computeNow()`) is required when calling from automation. v3's `exportModuleJS` (staging only) bypasses this — no `task` dependency.
- **Empty `mains` after dynamic module creation.** Modules created via `create_module` over the pairing channel without subsequent observation are silently omitted because they are not in `runtime.mains`. Observe (display in the layout) before exporting.
- **Bootconf hash is a default, not an override.** The bootloader applies `conf.hash` only if `location.hash` is empty (`if (conf.hash && !location.hash) location.hash = conf.hash`). A hash already in the URL (e.g. `&cc=TOKEN`) is preserved; opening with no hash falls back to the bootconf layout.
- **Result is `{source, report}`, not a string.** Multiple call sites have been bitten by this; double-check any code that pipes the result through `JSON.stringify` or a network boundary.

## Migration mechanics

To re-jumpgate a single notebook to the latest exporter:

```bash
node tools/lope-jumpgate.js \
  --source @tomlarkworthy/my-notebook \
  --output lopecode/notebooks/@tomlarkworthy_my-notebook.html
```

This pulls the module's published version from Observable, which uses whatever exporter is current there. Two-step migrations across the whole repo:

1. **Promote staging to published.** Copy `lopebooks/notebooks/@tomlarkworthy_exporter-3.html` to `lopecode/notebooks/...`, or re-jumpgate from Observable. This brings `exportModuleJS` into the published copy.
2. **Migrate dependent notebooks.** On Observable, edit each notebook's import of `@tomlarkworthy/exporter-2` → `@tomlarkworthy/exporter-3`. Then `bulk-jumpgate` to re-export them. This produces large diffs (per the format-diff section above).
3. **Update the channel server docstrings** (`tools/channel/lopecode-channel.ts` lines 153, 213, 560).
4. **Update knowledge-doc cross-references** (this doc, plus `live-collaboration-with-claude-code-pairing.md` lines 168, 187, 197, 325, 355, 427).
5. **Verify `tools/depmap.json`** regenerates with `@tomlarkworthy_exporter-3` rather than `_exporter-2`.

Best done as one campaign — the format diffs make piecemeal review noisy.

## Open items / verify before publishing

1. **v1 → v2 motivation** is not in the mined session corpus. Look at `git log --all -- 'lopecode/notebooks/@tomlarkworthy_exporter*.html'` for the cutover context if it matters.
2. **`generate_define` and `variableToDefinition`** internals (the cells that actually emit the differences listed in "output format diffs") were not read at the source level. Useful follow-up if the structural diffs need explanation rather than enumeration.
3. **Was `exportToHTML`'s `keepalive` + `$0.send` pattern present in v2?** I read v3's implementation but didn't diff against v2's. The "Observation gating" gotcha applies to v2 because `_actionHandler` depends on a `task` cell, but the implementation shape may differ.
4. **One mempalace drawer states** *"exporter-3 does NOT exist in the current working tree"*. That's stale (refers to a window when the file had been removed before being re-introduced). Don't quote that drawer; the live tree is authoritative.
5. **Update the version table once v3 is promoted to `lopecode/`.** Status `Published-but-not-load-bearing` should change to `Production`; v2's `Production` should change to `Legacy`.

## Sources

Primary (live source code):
- `lopecode-dev/lopecode/notebooks/@tomlarkworthy_exporter-3.html` (Apr 6) — published exporter-3
- `lopecode-dev/lopebooks/notebooks/@tomlarkworthy_exporter-3.html` (Apr 11) — staging exporter-3 with `exportModuleJS`
- `lopecode-dev/plan/file-sync-notebook.md` — file-sync motivation, `exportModuleJS` spec
- `lopecode-dev/tools/depmap.json` — confirms exporter-2 is currently load-bearing
- `lopecode-dev/knowledge/maintaining-and-updating-lopecode-and-lopebook-content-repositories.md:160` — exporter v1 retirement
- `lopecode-dev/knowledge/bulk-exporting-lopebooks.md:49` — references "exporter v1"
- `lopecode-dev/tools/channel/lopecode-channel.ts:153,213,560` — pairing-channel docstrings still referencing v2

Secondary (mempalace session pointers, under `~/.claude/projects/-Users-tom-larkworthy-dev-lopecode-dev/`):
- `5ebfbfae-…jsonl` — Observable-compatibility debugging session
- `9bdb6d92-…jsonl` — v2 vs v3 structural diff analysis
- `2ad83d87-…jsonl` — `exportModuleJS` deployment + verification
- `agent-a03d6d90a754f0b78.jsonl`, `agent-a6411deaf556213ae.jsonl` — exporter-3 architecture / `exportModuleJS` planning
- `27d82332-…jsonl` — file inventory comparing v2 and v3
- `b7lc98s1g.txt` — `exporter3_src.js` prototype (the "Raw Variable Serializer" that did *not* ship — caveat above)
- `bfzkr6m02.txt` — `exportModuleJS` cell content
- `feedback_fork_via_exporter.md` — fork-button vs blob-URL decision
