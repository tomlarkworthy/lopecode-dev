# File Sync — Implementation Plan

**Goal**: Two-way sync between a lopecode notebook and module `.js` files + file attachments on disk, so agents (Claude Code etc.) can edit notebooks by mutating files.

**Module name**: `@tomlarkworthy/file-sync`

## File Structure on Disk

```
sync-dir/
├── @tomlarkworthy/
│   ├── my-notebook.js
│   ├── my-notebook/            # only if module has file attachments
│   │   ├── image.png           # decoded binary
│   │   └── data.csv
│   ├── runtime-sdk.js
│   ├── editor-5.js
│   └── module-map.js
├── @observablehq/
│   └── ...
├── bootconf.json
└── .file-sync.json             # {moduleId: {hash, lastModified}}
```

Module ID `@author/name` → `@author/name.js`. File attachment `@author/name/filename.ext` → decoded file at `@author/name/filename.ext`.

## Hash URL Parameter

Use `&filesync=<directory-name>` in the hash URL (same pattern as `cc=TOKEN`). This survives lopepage URL sync cycles because unknown params are preserved verbatim in the `extra` array.

- On load: if `filesync=X` present, attempt to restore `FileSystemDirectoryHandle` from IndexedDB keyed by `X`
- If handle found and permission granted → auto-start sync
- If handle missing or permission denied → show "Pick directory" button, store result in IndexedDB keyed by `X`
- On first use with no hash param → add `&filesync=<chosen-dir-name>` via `history.replaceState`

## Upstream Changes Required

### 1. exporter-3: Expose `exportModuleJS(moduleId)`

**What**: A new exported cell that wraps the existing serialization pipeline into a simple per-module API.

**Why**: The serialization machinery (`generate_module_source`, `cellToDefinition`, `cellToDefines`, `generate_define`, `getFileAttachments`, `contentHash`) all exist inside exporter-3 but are only composed together inside `module_specs` which serializes _all_ modules for a full HTML export. File sync needs to serialize individual modules on demand.

**Signature**:
```javascript
exportModuleJS = async (moduleId, {moduleMap, runtime} = {}) => {
  // 1. Find module in moduleMap by name
  // 2. Collect cells: filter runtime._variables by module, type == 1
  // 3. Build cells Map<name, variables[]> via cellMap
  // 4. Get file attachments via getFileAttachments(module)
  // 5. Build spec: {name: moduleId}
  // 6. Return await generate_module_source(spec, module._scope, cells, fileAttachments)
}
```

**Returns**: `string` — the full `.js` module source with `export default function define(...)`.

**Also returns file attachment metadata**:
```javascript
exportModuleJS = async (moduleId, ...) => ({
  source: string,                              // the .js file content
  fileAttachments: Map<name, {url, mimeType}>  // for writing decoded files
})
```

**Dependencies**: `generate_module_source`, `cellMap`, `getFileAttachments`, `contentHash` — all already defined as cells in exporter-3, just need to be composed.

**Cells to add/modify in exporter-3**:
- Add new cell `exportModuleJS` (depends on `generate_module_source`, `cellMap`, `getFileAttachments`, `contentHash`)
- Ensure `exportModuleJS` is in the module's export list so file-sync can import it

### 2. exporter-3: Expose `getFileAttachmentBytes(moduleId, filename)`

**What**: A function that returns raw bytes for a file attachment, suitable for writing to disk.

**Why**: `getFileAttachments(module)` returns a Map of `{url, mimeType}` where `url` is a blob URL. For writing to disk via File System Access API, we need the actual bytes. The exporter already accesses these via `window.lopecode.contentSync(moduleName + "/" + filename)` which returns `{status, mime, bytes}`.

**Signature**:
```javascript
getFileAttachmentBytes = (moduleId, filename) => {
  const {status, mime, bytes} = window.lopecode.contentSync(
    moduleId + "/" + encodeURIComponent(filename)
  );
  return {mime, bytes};  // bytes is Uint8Array
}
```

**Alternative**: file-sync could call `window.lopecode.contentSync` directly — it's a global API. This may not need to be in exporter-3 at all. Decide during implementation.

### 3. No changes needed to runtime-sdk

`onCodeChange(callback)` already provides everything needed for notebook→file direction:
- Fires for new, modified, and deleted cells
- Callback receives `{variable, previous, t}` with enough info to identify the module
- Returns unsubscribe function

### 4. No changes needed to module-map

`currentModules` already provides the full module list with names. File-sync imports it to enumerate all modules for disassembly and polling.

### 5. No changes needed to local-change-history

Already exports exactly what file-sync needs for echo suppression:
- **`tag(definition, provenance)`** — attaches `__provenance` to a function definition (non-enumerable property). File-sync uses `tag(defn, {source: "file-sync"})` when applying file changes to the runtime.
- **`inferProvenance(v, previous)`** / **`read(def)`** — extracts `__provenance` from definitions. Used internally by `change_listener` to set the `source` field on history entries.
- **Filtering in `commitRuntimeHistorySince`** — already filters by `source !== "git"`. Could be extended to also filter `"file-sync"` if desired, or include it (since file-sync changes _should_ be committed to git).

### 6. No changes needed to lopepage

Unknown hash params are already preserved through URL sync cycles via the `extra` array. The `filesync=X` parameter will survive layout changes.

## File Sync Module Design

### Cells

```
@tomlarkworthy/file-sync
│
│ Setup
├── viewof directory              # "Pick directory" button → showDirectoryPicker()
├── directoryHandle               # Resolved handle (from button or IndexedDB restore)
├── hashParam                     # Read/write &filesync= from location.hash
│
│ State
├── syncState                     # Map<moduleId, {hash, lastModified}>
├── moduleFileHandles             # Map<moduleId, FileSystemFileHandle>
│
│ Disassemble (initial write)
├── disassemble                   # Write all modules + attachments to disk
│
│ Notebook → Files
├── notebookToFiles               # onCodeChange listener → debounced write
│
│ Files → Notebook
├── filesToNotebook               # setInterval poll → detect changes → apply
├── applyModuleFromSource         # Parse .js file → update runtime variables
│
│ UI
├── viewof syncEnabled            # Toggle sync on/off
├── viewof pollInterval           # Range input, default 1500ms
└── viewof syncStatus             # Table: module, direction, last sync time
```

### Notebook → Files Flow

```
onCodeChange fires
  → check variable._definition.__provenance?.source
  → if source === "file-sync" → skip (we caused this change)
  → identify module from variable._module
  → get module name from moduleMap
  → debounce 200ms per module
  → call exportModuleJS(moduleId)
  → write .js file via FileSystem Access API
  → update syncState hash
```

### Files → Notebook Flow

```
setInterval(pollInterval)
  → for each moduleId in syncState:
      → file = await handle.getFile()
      → if file.lastModified === syncState.lastModified → skip (fast path)
      → hash = contentHash(await file.text())
      → if hash === syncState.hash → update lastModified, skip
      → applyModuleFromSource(moduleId, text)
        → tag each definition with {source: "file-sync"} via tag()
        → variable.define(name, inputs, taggedDefn)
      → update syncState {hash, lastModified}
```

### Applying File Changes to Runtime

When a `.js` file changes on disk:

1. Read file text
2. Create Blob URL: `URL.createObjectURL(new Blob([text], {type: 'text/javascript'}))`
3. Dynamic import: `const {default: define} = await import(blobURL)`
4. Run `define` against a **probe runtime** that records cells:

```javascript
function probeDefine(defineFn) {
  const cells = [];
  const fakeModule = {
    variable(observer) {
      return {
        define(...args) {
          // Handle Observable's overloaded define(name?, inputs?, defn)
          const name = typeof args[0] === 'string' ? args.shift() : null;
          const inputs = Array.isArray(args[0]) ? args.shift() : [];
          const defn = args[0];
          cells.push({name, inputs, definition: defn, observed: !!observer});
          return {set pid(v) {}};
        },
        import(remote, alias, from) {
          cells.push({type: 'import', remote, alias, from});
          return this;
        }
      };
    },
    builtin(name, value) {
      cells.push({type: 'builtin', name, value});
    }
  };
  const fakeRuntime = {
    module() { return fakeModule; },
    fileAttachments(fn) { return fn; }
  };
  defineFn(fakeRuntime, (name) => name ? {} : null);
  return cells;
}
```

5. Diff probed cells against live module's variables (by name)
6. For changed cells: `variable.define(name, newInputs, newDefinition)`
7. For new cells: `module.variable(observer?).define(name, inputs, defn)`
8. For deleted cells: `variable.delete()`

### File Attachment Sync

**Notebook → Files** (during disassemble and on change):
```
For each module with file attachments:
  → get bytes via window.lopecode.contentSync(moduleId + "/" + filename)
  → create/open @author/name/ subdirectory
  → write decoded bytes to @author/name/filename.ext
```

**Files → Notebook** (during poll):
```
For each file in @author/name/ subdirectory:
  → read bytes
  → hash and compare
  → if changed: re-encode to base64, update <script type="lope-file"> in DOM
  → OR: use window.lopecode API to update content store
```

File attachment sync is lower priority than module source sync — agents primarily edit `.js` files.

### Echo Suppression (via `__provenance` tagging)

Uses the existing suppression infrastructure from `@tomlarkworthy/local-change-history`. That module already tags every change with a `source` field and filters by it.

**How it works:**

When file-sync applies a file change to the runtime (files→notebook direction), it tags the new definitions with `__provenance`:

```javascript
import {tag} from "@tomlarkworthy/local-change-history"

// When applying a cell from a .js file:
const taggedDefinition = tag(definition, {source: "file-sync"});
variable.define(name, inputs, taggedDefinition);
```

The `tag()` function attaches a non-enumerable `__provenance` property to the definition function. When `onCodeChange` fires for this variable, `local-change-history`'s `inferProvenance()` reads it back and sets `source: "file-sync"` on the history entry.

**Notebook→Files direction**: In the `onCodeChange` listener, check the history entry's source:
```javascript
onCodeChange(({variable, previous, t}) => {
  // local-change-history has already recorded this with source info
  // Check the provenance on the variable's definition
  const prov = variable?._definition?.__provenance;
  if (prov?.source === "file-sync") return;  // We caused this change, skip

  // Otherwise, this is a genuine notebook edit → write to disk
  writeModuleToFile(variable._module);
});
```

**Files→Notebook direction**: Still needs hash-based change detection on the file side to avoid re-reading unchanged files. But no custom echo suppression state needed — the `__provenance` tag handles the runtime side.

```
syncState per module:
  hash: string          # content hash of last written/read file
  lastModified: number  # file.lastModified for fast pre-check
```

This is simpler than a custom `lastWriteSource` flag system and integrates cleanly with local-change-history's existing git commit filtering (changes with `source: "file-sync"` can be included or excluded from git commits as desired).

## Implementation Order

### Phase 0: Upstream changes ✅ COMPLETE (2026-04-11)
1. ✅ Add `exportModuleJS` cell to exporter-3 on ObservableHQ
2. ✅ Export from jumpgate to update lopebooks HTML file
3. ✅ Verify: `exportModuleJS` works on live runtime (tested on flow-queue, exporter-3, claude-code-pairing — imports, file attachments, viewof all correct)

### Phase 1: Disassemble (one-shot write) ✅ COMPLETE (2026-04-11)
1. ✅ Created `@tomlarkworthy/file-sync` notebook locally (jumpgated blank-notebook, renamed module)
2. ✅ Implement `viewof directory` (showDirectoryPicker) — Chrome-only, uses `<div>` container for viewof value (button `.value` coerces to string)
3. ✅ Implement `disassemble` — iterates moduleMap, calls exportModuleJS for each, writes files sequentially
4. ✅ Implement file attachment writing (fetches blob URLs, writes decoded bytes)
5. ✅ Write `bootconf.json` and `.file-sync.json`
6. ✅ Test: 41 modules exported, 0 failures, file attachments correct

**Key files:**
- Module source: `tools/scratch/file-sync-module.js`
- Notebook HTML: `lopebooks/notebooks/@tomlarkworthy_file-sync.html`
- Workflow: edit `.js` file → `sync-module.ts` → hard reload in Chrome

**Learnings:**
- `<button>.value` coerces non-string values — use `<div>` container for viewof cells that hold objects
- Observable compiler turns `new Event(...)` into a dependency on `Event` — use `new window.Event(...)` or avoid in source
- Import bridge pattern: `main.define("name", ["module X", "@variable"], (_, v) => v.import("name", _))` — NOT `(m) => m.import("name")`
- define_cell via pairing channel + history replay causes snowball loops — prefer editing `.js` file + sync-module for stable cells

### Phase 2: Notebook → Files (live) ✅ COMPLETE (2026-04-11)
1. ✅ Implement `notebookToFiles` via `onCodeChange` (imported from runtime-sdk)
2. ✅ Add debounce (200ms per module, Map of pending timers)
3. ✅ Echo suppression: checks `variable._definition.__provenance?.source === "file-sync"` before writing
4. ✅ Test: defined `testCell` via pairing channel → `.js` file updated on disk within 200ms
5. ✅ Cleanup via `invalidation` promise (unsubscribes listener, clears timers)

### Phase 3: Files → Notebook (live) ✅ COMPLETE (2026-04-11)
1. ✅ Implement polling loop with `file.lastModified` fast path (1s interval)
2. ✅ Implement `probeDefine` parser (fake runtime captures cell definitions from `define()`)
3. ✅ Implement `applyModule` — matches probed cells to live runtime variables by name, applies via `variable.define()`
4. ✅ Tag applied definitions with `tag(defn, {source: "file-sync"})` for echo suppression
5. ✅ Delta comparison: compares disk file against `exportModuleJS(moduleId)` — only applies when there's a real difference
6. ✅ Test: added `fileSyncTest` cell to `dom-view.js` on disk → appeared in runtime within 1s, reverted cleanly

**Learnings:**
- Must import `viewof currentModules` or use `moduleMap` directly — without it, `currentModules` is never reachable (lazy evaluation)
- Importing `viewof currentModules` triggers module-map's full flow-queue pipeline which can timeout — better to import `moduleMap` function and call it directly
- File-sync module must skip itself in `SKIP_MODULES` — applying its own `.js` from disk resets `viewof directory` (loses the handle)
- First poll must compare against runtime export, not blindly apply — otherwise identical files cause spurious resyncs that break stateful modules (claude-code-pairing, etc.)
- `main.define(name, deps, fn)` calls bypass `fakeModule.variable()` — `probeDefine` needs a `define()` method on `fakeModule` too
- Blob URL `import()` works for loading module `.js` files dynamically in the browser

### Phase 4: Polish
1. Hash URL parameter (`&filesync=<name>`)
2. IndexedDB handle persistence + auto-restore
3. Sync status UI
4. File attachment polling (bidirectional)
5. Handle edge cases: module added/removed, notebook re-exported

## Agent Workflow (End Goal)

Once file-sync is working, the agent workflow becomes:

1. Open notebook with `&filesync=project-name` in hash URL
2. Notebook auto-picks up directory handle (or agent tells user to click "Pick directory")
3. All modules are disassembled to `sync-dir/`
4. Agent edits `.js` files directly using standard file editing tools
5. Notebook detects changes via polling, applies to runtime
6. User sees live updates in the browser
7. If user edits in-browser, `.js` files update on disk
8. Agent can read the updated `.js` files to see user's changes

No pairing channel needed for basic editing — just the file system.

## Reference Files

### Key module source locations (local compiled .js files)

| Module | Local .js file |
|--------|---------------|
| exporter-3 | `tools/scratch/exporter-3-module.js` |
| runtime-sdk | `notebooks/@tomlarkworthy_jumpgate/modules/@tomlarkworthy/runtime-sdk.js` |
| local-change-history | `notebooks/@tomlarkworthy_jumpgate/modules/@tomlarkworthy/local-change-history.js` |
| module-map | `notebooks/@tomlarkworthy_jumpgate/modules/@tomlarkworthy/module-map.js` |
| claude-code-pairing | `tools/claude-code-pairing.js` |

### Key notebook HTML files

| Notebook | HTML file |
|----------|----------|
| exporter-3 | `lopebooks/notebooks/@tomlarkworthy_exporter-3.html` |
| local-change-history | `lopecode/notebooks/@tomlarkworthy_local-change-history.html` |
| blank-notebook (template) | `lopecode/notebooks/@tomlarkworthy_blank-notebook.html` |

### Knowledge docs (read these for workflow details)

| Doc | When to read |
|-----|-------------|
| `knowledge/pushing-cells-to-observablehq.md` | Adding `exportModuleJS` to exporter-3 upstream |
| `knowledge/maintaining-and-updating-lopecode-and-lopebook-content-repositories.md` | Re-exporting notebooks after upstream changes |
| `knowledge/live-collaboration-with-claude-code-pairing.md` | Creating a new notebook, MCP tools, pairing setup |
| `knowledge/notebook-programming-concepts.md` | Observable runtime, hash URL DSL, cell evaluation |

### Key functions to study

| Function | Location | Purpose |
|----------|----------|---------|
| `generate_module_source()` | exporter-3 (line ~7393) | Serializes a module's cells to `.js` source |
| `cellToDefinition()` | exporter-3 (line ~7464) | Single cell → `const _hash = function...` |
| `cellToDefines()` | exporter-3 (line ~7474) | Cell → `$def(pid, name, deps, fn)` call |
| `getFileAttachments()` | exporter-3 (line ~7305) | Extracts file attachment Map from a module |
| `module_specs()` | exporter-3 (line ~7230) | Full module enumeration + serialization |
| `tag(def, provenance)` | local-change-history | Attaches `__provenance` to a definition |
| `onCodeChange(cb)` | runtime-sdk (line ~131) | Subscribe to cell definition changes |
| `contentHash(s)` | exporter-3 / runtime-sdk | FNV-1a hash → `_xxxxxx` persistent ID |

### Module .js file format (what gets written to disk)

```javascript
// Each cell: named function with persistent ID hash
const _4ie7s1 = function title(md){return(
  md`# My Title`
)};

const _a2bc3d = function chart(d3, data){return(
  d3.select("svg")...
)};

// Module entry point
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  // Visual cells (rendered, ordered by $def calls)
  $def("_4ie7s1", "title", ["md"], _4ie7s1);
  $def("_a2bc3d", "chart", ["d3", "data"], _a2bc3d);

  // Hidden cells (no observer)
  main.variable().define("helper", [], _xyz123);

  // viewof pattern: two registrations
  $def("_vf1", "viewof slider", ["Inputs"], _vf1);
  main.variable().define("slider", ["Generators", "viewof slider"], (G, v) => G.input(v));

  // Module imports
  main.define("module @other/lib", async () =>
    runtime.module((await import("/@other/lib.js?v=4")).default));
  main.variable().define("imported", ["module @other/lib", "@variable"],
    (_, v) => v.import("exported", _));

  return main;
}
```

**Note**: The `probeDefine` parser must handle the `$def()` helper pattern (which calls `main.variable(observer(name)).define(...)` internally), not just raw `main.variable().define()`.

## Risks

| Risk | Mitigation |
|------|-----------|
| `toString()` lossy round-trip | Known limitation, same as exporter. Compiled form, not original Observable syntax. |
| Probe runtime doesn't handle all cell types | Test with viewof, mutable, module imports. Follow exporter-3's `cellToDefines` patterns. |
| Large notebooks (30+ modules) polling overhead | Hashing small .js files is sub-ms. Use `file.lastModified` as fast pre-check before full hash. |
| Dynamic import of Blob URLs | Well-supported in Chrome. Fallback: `new Function()` wrapper if needed. |
| File System Access API browser support | Chrome/Edge only. Acceptable since lopecode targets Chrome. |
