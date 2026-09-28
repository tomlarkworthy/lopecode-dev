# important-modules.md — group A drafts (documents, spreadsheets, state, layout)

`PDS` below stands for `https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=`. In the wiki, write the import lines out in full, as in the snippet files (`tools/scratch/important-modules/A/<name>.js`).

Verification: each snippet was applied with `write_file` in `lopebooks/notebooks/@tomlarkworthy_robocoop-5.html`, every named cell was forced, the page was exported, then reopened with atproto/observablehq/jsdelivr/esm.sh/unpkg blocked. The script was `A/s39-act.mjs`, a copy of the fixed `rc5-sessions/s39-verify-module.mjs` (forcing cells deleted before export) plus two changes: `--act <file>` runs page JS after the first check, and each run writes to its own export file. Date: 2026-09-28.

---

## @tomlarkworthy/sheet — "a spreadsheet grid with formulas"
Use for: spreadsheet-style tables where cells are named A1, B2 … and formulas are ordinary cell bodies. Size: 68720 B. Source: PDS `bafkreictiyvkeezqxxbuvqd74f6qzkglc3vsgume6fz5gz5bgph2vq4vga`, identical to canonical (after trim). Not embedded in robocoop-5.
```js
main.define("module @tomlarkworthy/sheet", async () => "@tomlarkworthy/sheet" && runtime.module((await import("PDSbafkreictiyvkeezqxxbuvqd74f6qzkglc3vsgume6fz5gz5bgph2vq4vga")).default));
main.define("sheet", ["module @tomlarkworthy/sheet", "@variable"], (_, v) => v.import("sheet", _));
main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
```
```js
$def("_vsm", "viewof sheetModule", ["thisModule"], (thisModule) => thisModule());
$def("_sm", "sheetModule", ["Generators", "viewof sheetModule"], (G, _) => G.input(_));
$def("_A1", "A1", [], () => 120);
$def("_B1", "B1", [], () => 340);
$def("_C1", "C1", ["A1", "B1"], (A1, B1) => A1 + B1);
$def("_grid", "grid", ["sheet", "runtime", "invalidation", "sheetModule"],
  (sheet, runtime, invalidation, sheetModule) => sheet(runtime, { invalidation, module: sheetModule, format: {"C1": "0.00"} }));
```
Returns / API: `sheet(runtime, {invalidation, module, format = {}, size = {}, persist = true, minCols = 8, minRows = 18})` → a `<div class="sh-frame">` (canonical line 373). A grid cell is a variable named by its address (`A1`, `B3`); a placement cell `B1 = taxRate` puts a named cell on the grid; `A4:C4` typed in the bar is stored as `[A4, B4, C4]`; `$A$1` is a pinned name. `format` values: `""`, `"0.00"`, `"0.000"`, `"$"`, `"%"`. With `persist: true` the sheet rewrites its own cell's source when format or size changes.
Pitfalls: `module` has no default and throws `sheet(): \`module\` is required` if omitted (line 376). Pass `thisModule()` through a `viewof`, as the module's own demo does. The grid `<canvas>` reports "nothing drawn" in the write_file summary even though the values render; check the text (`460.00`), not the canvas.
Verified: all 6 cells computed (A1=120, B1=340, C1=460). The grid div was 1045×420 and its text contained `340` and `460.00` (C1 with format `0.00`). The offline reopen gave the same values, with `@tomlarkworthy/sheet` embedded in the export. No page errors. 2026-09-28.

## @tomlarkworthy/editable-md — "markdown that the reader can edit in place"
Use for: prose, notes or docs the user edits in the page and saves with the notebook. Size: 39096 B (PDS) / 42466 B (canonical). Source: PDS `bafkreif4pvtm2e6d54ldypxx4qynvgjc4yoy5s66mrg2bl4zxqkhsiicji` (newest PDS copy, 2026-09-26). The PDS copy is older than canonical: it lacks `encodeHrefPlaceholder`/`decodeHrefPlaceholders` and their two tests, so a `${…}` hole used as a link destination (`[a](${url})`) does not survive an edit. This snippet has no link hole, so the PDS copy is used. Not embedded; it pulls in `@tomlarkworthy/prosemirror` (embedded in the export with its 2 gz attachments).
```js
main.define("module @tomlarkworthy/editable-md", async () => "@tomlarkworthy/editable-md" && runtime.module((await import("PDSbafkreif4pvtm2e6d54ldypxx4qynvgjc4yoy5s66mrg2bl4zxqkhsiicji")).default));
main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
```
```js
$def("_intro", "intro", ["md", "count"], (md, count) => md`# Shopping list

We need ${count} apples. Click this text to edit it; Shift+Enter or clicking away saves.`);
$def("_introSource", "introSource", ["intro"], (intro) => intro.markdown);
```
Returns / API: `md` is a drop-in for the builtin `md` tag (canonical line 125, `(template, ...values) => dom`). Importing it shadows the builtin for the whole module. Clicking the rendered text opens a ProseMirror editor. On Shift+Enter or focus-out the markdown is compiled back to an `md\`…\`` template and the cell is redefined (`saveAndRender`, line 134). `dom.markdown` is a Promise of the cell's markdown source, with `${…}` holes kept (line 209).
Pitfalls: the module's own Known Issues say escapes in tagged templates are lost outside code fences. The edited cell is redefined with a new function named `_anonymous`; this is expected.
Verified: all 4 cells computed; `introSource` = `"# Shopping list\n\nWe need ${count} apples. …"`. Act: a click opened `.ProseMirror`, " Also pears." was inserted, then focusout. After that the definition was `md\`# Shopping list … ${count} apples. … Also pears.\`` with inputs `[md, count]`. The offline reopen showed `introSource` ending "Also pears.", so the edit was saved into the export. 2026-09-28.

## @tomlarkworthy/sticky — "remember a control's value in the notebook file"
Use for: settings, sliders or form state that is saved in the exported HTML (not per-browser). Size: 6357 B (PDS) / 6597 B (canonical). Source: PDS `bafkreidnbl6wlhnt25ttzwms3c6kpzlmiiozwugx7iezsgl6ul35eabg5m` (newest PDS copy). The PDS copy is older than canonical: it does not escape `</` and `<!--` in the serialized value. A probe with the value `"a</script>b"` (`A/sticky-text-probe.*`) still exported and reopened correctly with the PDS copy, because the exporter handled it, so the difference did not matter here. Not embedded.
```js
main.define("module @tomlarkworthy/sticky", async () => "@tomlarkworthy/sticky" && runtime.module((await import("PDSbafkreidnbl6wlhnt25ttzwms3c6kpzlmiiozwugx7iezsgl6ul35eabg5m")).default));
main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
```
```js
const _viewof_cutoff = function cutoff(sticky,Inputs){return(
sticky(Inputs.range([0, 2000], {label: "cutoff", step: 1, value: 440}), 440)
)};
$def("_viewof_cutoff", "viewof cutoff", ["sticky", "Inputs"], _viewof_cutoff);
$def("_cutoff", "cutoff", ["Generators", "viewof cutoff"], (G, _) => G.input(_));
```
Returns / API: `sticky(view, remembered)` → the same `view` (canonical line 21). If `remembered` is not undefined, it is applied as `view.value` at build time. On each `input` event the second argument in the cell's own source is rewritten to `JSON.stringify(view.value)` (swapped silently into `_definition`, with no recompute).
Pitfalls (module docs): one `sticky` call per cell; values must be JSON-serializable; the view must dispatch `input`. Write the cell as a named function whose body calls `sticky(...)` directly, because the rewrite parses `_definition.toString()` to find the call.
Verified: cutoff=440 and echo computed. Act: set 1234 and dispatched input. The definition became `sticky(Inputs.range(…), 1234)` and `cutoff`=1234. The offline reopen of the export gave `cutoff`=1234, so the value lives in the file. 2026-09-28.

## @tomlarkworthy/local-storage-view — "remember a control's value in this browser"
Use for: per-user preferences kept in localStorage across reloads (not saved into the file). Size: 7455 B. Source: PDS `bafkreifq2nytxe3ftt33d2zkkg65fbackzjj6pcq2mh5cgazjr576pwxfy`, identical to canonical. Embedded in robocoop-5 (that copy is byte-identical to canonical). The Observable path form `/@tomlarkworthy/local-storage-view.js?v=4` resolves to the embedded copy.
```js
main.define("module @tomlarkworthy/local-storage-view", async () => "@tomlarkworthy/local-storage-view" && runtime.module((await import("PDSbafkreifq2nytxe3ftt33d2zkkg65fbackzjj6pcq2mh5cgazjr576pwxfy")).default));
main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
```
```js
$def("_vv", "viewof volume", ["Inputs", "localStorageView"], (Inputs, localStorageView) =>
  Inputs.bind(Inputs.range([0, 100], {label: "volume", step: 1, value: 10}), localStorageView("demo-volume", { defaultValue: 10 })));
$def("_v", "volume", ["Generators", "viewof volume"], (G, _) => G.input(_));
$def("_vp", "viewof prefs", ["localStorageView"], (localStorageView) => localStorageView("demo-prefs", { json: true }));
$def("_p", "prefs", ["Generators", "viewof prefs"], (G, _) => G.input(_));
```
Returns / API: `localStorageView(key, {bindTo, defaultValue = null, json = false})` → a `<div>` view whose `value` reads and writes `localStorage[key]` (canonical line 46). The usual pattern is `Inputs.bind(control, localStorageView(key))`. `bindTo: viewof x` binds it to an existing control.
Pitfalls (observed):
- Do NOT pass an object as `defaultValue` (e.g. `{theme: "light"}`). The view renders it with a collapsed inspector, and robocoop-5's `write_file` then never returns: the page's main thread hangs. Cause: `@tomlarkworthy/summarizejs` `summarizeJS` clones the node and loops `while (querySelector(".observablehq--collapsed"))`, dispatching mouseup on a clone that has no listener. Repro: `A/lsv-bisect/lsv-b6.js` and `lsv-b9.js` (a bare `inspect({…})` also hangs). Use `json: true` without a default and handle `null` (`prefs?.theme ?? "light"`).
- Without `defaultValue`, a new key reads `null`, and `Inputs.bind` sets a range to its minimum (volume=0), ignoring the control's `value:`.
- Values are stored as strings unless `json: true`. The getter returns `val || defaultValue`, so a stored `0` or `""` reads as the default.
- The inspector text in the view lags one write behind (it renders before `setItem`).
Verified: volume=10, prefs=null, echo computed. Act: volume=42 and prefs={theme:"dark"} written; localStorage held `"42"` and `{"theme":"dark"}`. The offline reopen, in the same browser profile, gave volume=42 and prefs={theme:"dark"}. Not verified: persistence across browser profiles. By design the export does not carry the values. 2026-09-28.

## @tomlarkworthy/grid-container — "a dashboard layout of cells on a draggable grid"
Use for: arranging existing cells (controls, charts, text) as movable, resizable tiles; widget builders. Size: 56838 B. Source: PDS `bafkreice5hjlgedawdjyvvxcga7m23v6wk7garkadcxz72js6y4vz2dfy4`, identical to canonical. Not embedded.
```js
main.define("module @tomlarkworthy/grid-container", async () => "@tomlarkworthy/grid-container" && runtime.module((await import("PDSbafkreice5hjlgedawdjyvvxcga7m23v6wk7garkadcxz72js6y4vz2dfy4")).default));
main.define("gridContainer", ["module @tomlarkworthy/grid-container", "@variable"], (_, v) => v.import("gridContainer", _));
// plus runtime + thisModule from @tomlarkworthy/runtime-sdk, as in the sheet entry
```
```js
const _widget = function widget(gridContainer,runtime,invalidation,gridModule){return(
gridContainer(runtime, {
  invalidation, module: gridModule, columns: 12,
  include: ["viewof freq", "label"],
  layout: { atoms: { "viewof freq": { x: 0, y: 0, w: 6, h: 1 }, label: { x: 6, y: 0, w: 6, h: 1 } } }
})
)};
// gridModule = thisModule() through a viewof, exactly as for sheet
```
Returns / API: `gridContainer(runtime, {invalidation, module = main, filter, include = null, columns = 12, showGrid = true, portrait = 640, layout = {}, persist = true, detachNodes = true})` → `<div class="sg-frame">` (canonical line 255). `frame.grid` exposes `addCell, removeCell, pack, candidates, templates, instantiate, isUnitMode, getColumns, getShowGrid, setShowGrid, setColumns` (observed). `gridControls()` (line 1101) is an optional toolbar view you include as a cell. `layout` units are grid cells. Dragging rewrites the `include:`/`layout:` literals in the calling cell's source.
Pitfalls: `module` defaults to runtime-sdk's `main`, which in robocoop-5 is not your module. Always pass `thisModule()`. The grid takes each included cell's live DOM node (`detachNodes: true`), so those cells no longer render in their own slot.
Verified: all 6 cells computed (freq=2, label="freq is 2"). The frame measured 1045×113 with 2 atoms, `viewof freq` and `label`. The offline reopen gave the same values, with grid-container embedded. Not verified: drag, resize and source rewrite. 2026-09-28.

## @tomlarkworthy/csv-column-chooser — "keep only some columns of a (large) CSV and download it"
Use for: streaming column selection or reordering of a CSV `File` into a downloadable blob; parsing a CSV header line. Size: 12071 B. Source: PDS `bafkreid3dnurjoouxk26wylvokgvfxj42nwqdsyrgbfvms3m2abb6nkxwq`, identical to canonical (canonical host `tomlarkworthy_lopecode-live-2026.html`). Not embedded.
```js
main.define("module @tomlarkworthy/csv-column-chooser", async () => "@tomlarkworthy/csv-column-chooser" && runtime.module((await import("PDSbafkreid3dnurjoouxk26wylvokgvfxj42nwqdsyrgbfvms3m2abb6nkxwq")).default));
main.define("streamSelectCSVToBlobURL", ["module @tomlarkworthy/csv-column-chooser", "@variable"], (_, v) => v.import("streamSelectCSVToBlobURL", _));
main.define("parseCSVLine", ["module @tomlarkworthy/csv-column-chooser", "@variable"], (_, v) => v.import("parseCSVLine", _));
```
```js
$def("_f", "csvFile", [], () => new File(["name,age,city\nAda,36,London\n\"Lin, B\",41,Paris\n"], "people.csv", { type: "text/csv" }));
$def("_filtered", "filtered", ["streamSelectCSVToBlobURL", "csvFile"], (s, file) => s({ file, selectedHeaders: ["city", "name"] }));
$def("_link", "downloadLink", ["htl", "filtered"], (htl, f) => htl.html`<a href=${f.url} download=${f.filename}>Download ${f.filename}</a>`);
```
Returns / API: `streamSelectCSVToBlobURL({file, selectedHeaders, onProgress, yieldIntervalMs = 25})` → Promise of `{url, blob, filename, bytesRead, rowsRead, rowsWritten}` (canonical line 140). Output columns follow `selectedHeaders` order. `filename` is `<base>-filtered.csv`. `parseCSVLine(line)` → array of fields, handling quotes and a BOM (line 33). `csvEscape(v)` (line 124). In a notebook, `file` usually comes from `Inputs.file()`.
Pitfalls: it throws if `file` has no `.stream()`/`.name` or if `selectedHeaders` is empty. `rowsWritten` counts the header row. `url` is an object URL; the module's own UI revokes the previous one before replacing it.
Verified: all 5 cells computed. `header` = `["name","a, quoted","city"]`; `filteredText` = `"city,name\nLondon,Ada\nParis,\"Lin, B\"\n"`; rowsWritten=3. The offline reopen gave the same values. 2026-09-28.

## @tomlarkworthy/view — "one control made of several inputs, with an object value"
Use for: composing Inputs into a form-like `viewof` whose value is `{key: value}`, lists of controls, and writing values back. Size: 54994 B. Source: PDS `bafkreifxbb53lb4z354lduz2tqwut4yagamcqyhj2bmbnge4csqqjsledi`, identical to canonical. Embedded in robocoop-5 (byte-identical to canonical); the Observable path form `/@tomlarkworthy/view.js?v=4` resolves to the embedded copy.
```js
main.define("module @tomlarkworthy/view", async () => "@tomlarkworthy/view" && runtime.module((await import("PDSbafkreifxbb53lb4z354lduz2tqwut4yagamcqyhj2bmbnge4csqqjsledi")).default));
main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));
```
```js
const _viewof_settings = function settings(view,Inputs){return(
view`<div style="display:flex;gap:12px">
  ${["size", Inputs.range([1, 10], {label: "size", step: 1, value: 3})]}
  ${["name", Inputs.text({label: "name", value: "Ada"})]}
</div>`
)};
const _viewof_sliders = function sliders(view,Inputs){return(
(() => {
  const build = (v) => Inputs.range([0, 1], {value: v, step: 0.1});
  return view`<div>${["values", [0.2, 0.8].map(build), build]}</div>`;
})()
)};
```
Returns / API (canonical lines): `view\`…\`` (532) is an htl.html tag in which `${[key, childView]}` binds a child to `value[key]`. `${["...", childView]}` makes a singleton. `${["...", {a: viewA, b: viewB}]}` spreads an object of views. `${[key, arrayOfViews]}` gives an array. `${[key, arrayOfViews, data => view]}` gives an array that is rebuilt when `value[key]` is assigned; the second element must already be views, not data (`wrap`, line 542). A key starting with `_` is hidden. `viewSvg` (537) is the same over htl.svg. `variable(value, {name})` (494) is a non-DOM view that emits `assign`. `bindOneWay(target, source, {transform, invalidation})` (395) binds one way and raises `input` on the target. `arrayView` (785), `cautious` (279).
Pitfalls: the key `"value"` is reserved and throws. Writing back: set `viewof x.value = {...}`, then `dispatchEvent(new Event("input"))`. Assigning `{values: [..3 items]}` to a builder array created 3 ranges (observed). The module's docs say `arrayView` (a DocumentFragment) does not emit events for `Inputs.bind`.
Verified: all 5 cells computed; `settings`={size:3,name:"Ada"}, `sliders`={values:[0.2,0.8]}. Act: wrote {size:7,name:"Lin"} and {values:[0.1,0.5,0.9]}. The child range read 7, 3 range inputs were present, and `summary`="Lin picked size 7; sliders 0.1, 0.5, 0.9". The offline reopen showed the initial values, as expected: view does not persist. 2026-09-28.

## @tomlarkworthy/notes — "an offline note store (IndexedDB) I can read and add to"
Use for: reading or adding notes in the browser-local Dexie `notes` database, or embedding the Notes app's data. It is an app rather than a library; the useful imports are its data cells. Size: 26745 B (canonical) / 26471 B (Observable). Source: Observable path `/@tomlarkworthy/notes.js?v=4` (not on the PDS). The Observable copy has the same set of named cells as canonical; its byte differences were not audited. Not embedded; it pulls in `@tomlarkworthy/dexie-4`, and the export also embedded `@tomlarkworthy/notes/notes.json`.
```js
main.define("module @tomlarkworthy/notes", async () => runtime.module((await import("/@tomlarkworthy/notes.js?v=4")).default));
main.define("notes", ["module @tomlarkworthy/notes", "@variable"], (_, v) => v.import("notes", _));
main.define("notes_collection", ["module @tomlarkworthy/notes", "@variable"], (_, v) => v.import("notes_collection", _));
```
```js
$def("_n", "noteCount", ["notes"], (notes) => `${notes.length} notes stored in this browser`);
$def("_t", "noteTable", ["Inputs", "notes"], (Inputs, notes) => Inputs.table(notes, { columns: ["note_id", "title", "content", "modified"] }));
$def("_b", "addButton", ["Inputs", "notes_collection"], (Inputs, c) =>
  Inputs.button("add note", { reduce: () => c.add({ title: "Untitled", content: "", created: Date.now(), modified: Date.now() }) }));
```
Returns / API (canonical lines): `notes` (243) is a live array of `{note_id, title, content, created, modified}`, newest-created first, updated by `dexie.liveQuery` (it also follows other tabs). `notes_collection` (226) and `tags_collection` (229) are Dexie tables (`add`, `update`, `delete`, `get`, `toArray`). `addNote()` (383) and `deleteCurrent()` (370) also drive the app's `viewof current_note_id`.
Pitfalls: the database name is fixed (`"notes"`), so every notebook on the same origin shares it. The `title` cell of the notes module throws when there are no notes (`notes.find(...).title`). Import the data cells, not the app UI cells. The module has a cell depending on an undefined `robocoop`; it is unused by importers.
Verified: 3 cells computed (0 notes, then an empty table). Act: a click on the button gave `notes` = 1 note {title:"Untitled", note_id:1}. The offline reopen, same browser profile, showed 1 note, read from IndexedDB. Not verified: `persist_to_file`/`load_from_file` (the notes.json route that carries notes inside the exported file). 2026-09-28.
