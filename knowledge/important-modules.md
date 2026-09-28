---
scope: [local-development, in-notebook]
---

# Asked for a spreadsheet, a document the reader edits in place, a slide deck, drawing, diagram, saved setting or file download? Import the published module

Published modules for common tasks, with the lines that import each one. None of them is in /src
until imported. When the user asks for one of these by name, build on the module rather than
writing an equivalent from `Inputs`. Read the row for your task, then that section (`read_file`
with `offset`/`limit`).
Every example below was applied with `write_file` in the robocoop-5 notebook on 2026-09-28. Its
cells all computed, and the saved file was reopened with the network blocked
(`tools/scratch/rc5-sessions/s39-verify-module.mjs --save`; snippets and outputs in
`tools/scratch/important-modules/{A,B}/`).

| task | use | section |
|---|---|---|
| spreadsheet, a table whose rows the user types into, cells with formulas | `@tomlarkworthy/sheet` | sheet |
| document / notes the reader edits in place | `@tomlarkworthy/editable-md` | editable-md |
| a control's value saved in the notebook file | `@tomlarkworthy/sticky` | sticky |
| a value kept in this browser only | `@tomlarkworthy/local-storage-view` | local-storage-view |
| slide deck / presentation | `@tomlarkworthy/slides` | slides |
| drawing / editable SVG | `@tomlarkworthy/svg-lens` | svg-lens |
| drag a drawing to change its parameters | `@tomlarkworthy/parametric-svg` | parametric-svg |
| flowchart, sequence diagram | stdlib `mermaid` | Diagrams |
| download CSV / JSON / PDF / Word / Excel | `DOM.download`, `pdfLib`, CDN libraries | Files |
| make or render a PDF | `pdfLib` / `pdfjs` from `@tomlarkworthy/sign-a-pdf` | sign-a-pdf |
| button that saves the whole notebook | `downloadAnchor` from `@tomlarkworthy/exporter-3` | exporter-3 |
| dashboard of cells on a grid | `@tomlarkworthy/grid-container` | grid-container |
| form made of several inputs, object value | `@tomlarkworthy/view` | view |
| keep some columns of a CSV file | `@tomlarkworthy/csv-column-chooser` | csv-column-chooser |
| notes stored in the browser (IndexedDB) | `@tomlarkworthy/notes` | notes |

Not loadable from this page: `@tomlarkworthy/mermaid-lens` (structural mermaid editor) and
`@tomlarkworthy/infinite-canvas`. Neither is on Observable or on the atproto PDS as of 2026-09-28.

## How the imports work

Two forms. Both go at the bottom of `define()`, one binding line per imported name.

**From an atproto blob.** `getBlob?cid=…` is the module's source, addressed by its content hash,
so it is pinned to one version. The `"@ns/name" &&` before `runtime.module` is required: the URL
does not spell the module's name, and the exporter reads the name from that string. Without it, a
save wrote the module as `<unknown 0.59…>` (probe `s38-atproto-blob-import.mjs`).

```js
main.define("module @tomlarkworthy/sheet", async () => "@tomlarkworthy/sheet" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreictiyvkeezqxxbuvqd74f6qzkglc3vsgume6fz5gz5bgph2vq4vga")).default));
main.define("sheet", ["module @tomlarkworthy/sheet", "@variable"], (_, v) => v.import("sheet", _));
```

**From observablehq.com**, for a module not on the PDS. If the page already embeds the module,
this resolves to the embedded copy.

```js
main.define("module @tomlarkworthy/slides", async () => runtime.module((await import("/@tomlarkworthy/slides.js?v=4")).default));
```

Either way the module and its own imports are fetched when the write applies, and the next save
embeds them. In every example below, the saved file then worked with the network off, except
where a section says otherwise.

Several modules take `module:` (sheet, slides, grid-container, parametric-svg). They need the
Module value. `thisModule()` from `@tomlarkworthy/runtime-sdk` returns a view of it, so read it
through a `viewof` + `Generators.input` pair. Passing `thisModule()` directly failed with
`Cannot read properties of undefined (reading 'get')`. grid-container's default `module` is not
your module.

```js
main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
// cells
$def("_vmy", "viewof myModule", ["thisModule"], (thisModule) => thisModule());
$def("_my", "myModule", ["Generators", "viewof myModule"], (G, v) => G.input(v));
```

## sheet

A grid whose cells are variables named by address (`A1`, `B2`); a formula is an ordinary cell
body. 68720 B. PDS copy identical to the canonical.

```js
main.define("module @tomlarkworthy/sheet", async () => "@tomlarkworthy/sheet" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreictiyvkeezqxxbuvqd74f6qzkglc3vsgume6fz5gz5bgph2vq4vga")).default));
main.define("sheet", ["module @tomlarkworthy/sheet", "@variable"], (_, v) => v.import("sheet", _));
// + runtime, thisModule, viewof myModule / myModule as in "How the imports work"
$def("_A1", "A1", [], () => 120);
$def("_B1", "B1", [], () => 340);
$def("_C1", "C1", ["A1", "B1"], (A1, B1) => A1 + B1);
$def("_grid", "grid", ["sheet", "runtime", "invalidation", "myModule"],
  (sheet, runtime, invalidation, myModule) => sheet(runtime, {invalidation, module: myModule, format: {C1: "0.00"}}));
```

`sheet(runtime, {invalidation, module, format = {}, size = {}, persist = true, minCols = 8, minRows = 18})`
returns the grid `<div>`. A placement cell `B1 = taxRate` shows a named cell on the grid.
`A4:C4` typed in the formula bar is stored as `[A4, B4, C4]`. `format` values: `""`, `"0.00"`,
`"0.000"`, `"$"`, `"%"`. With `persist` the sheet rewrites its own cell when format or size
changes. `module` has no default and throws if omitted. The grid draws on a `<canvas>`, so the
write result can say "nothing drawn"; check the grid's text (here `460.00`) instead.

`Inputs.table` is not an alternative for rows the user types into. Its options are `columns`,
`value`, `required`, `sort`, `reverse`, `format`, `locale`, `align`, `header`, `rows`, `width`,
`multiple`, `select` and `layout`. It has no `editable` option, an `editable:` key is ignored
without an error, and its only inputs are the row-selection checkboxes. On 2026-09-28 the agent
wrote `Inputs.table(rows, {editable: {...}})` for a bill splitter and told the user the table was
editable; it was read-only.

## editable-md

A drop-in for the builtin `md` tag. Clicking the rendered text opens an editor. Shift+Enter or
clicking away writes the edited markdown back into the cell's source, and a save keeps it. With the
builtin `md` the text is not editable on the page; "edit the module file" is not what a user who asks
for a document they can edit in place means.

Import it from observablehq.com, not from the PDS:

```js
main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));
main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
$def("_intro", "intro", ["md", "count"], (md, count) => md`# Shopping list

We need ${count} apples. Click this text to edit it.`);
```

The PDS copy (`cid=bafkreif4pvtm2e6d54ldypxx4qynvgjc4yoy5s66mrg2bl4zxqkhsiicji`) predates the
handling of a hole used as a link target, `[a](${url})`. A table of contents built with `linkTo`
(see links-to-cells-in-a-lopepage-notebook.md) lost its links the first time it was opened and
committed with that copy, even with no text changed. With the observablehq.com copy the links
survived the same round trip and still scrolled to their sections (eval `rc5t-editable-guide-toc`,
2026-09-28).

Importing `md` shadows the builtin for the whole module. `${…}` holes survive an edit. Escapes
inside the template are lost outside code fences (the module's Known Issues). Checked with the PDS
copy: an inserted sentence was written into the source and was still there after a save and an
offline reopen.

## sticky

Saves a control's value in the notebook file: every change rewrites the second argument in the
cell's own source. 6357 B.

```js
main.define("module @tomlarkworthy/sticky", async () => "@tomlarkworthy/sticky" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreidnbl6wlhnt25ttzwms3c6kpzlmiiozwugx7iezsgl6ul35eabg5m")).default));
main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
const _viewof_cutoff = function cutoff(sticky,Inputs){return(
sticky(Inputs.range([0, 2000], {label: "cutoff", step: 1, value: 440}), 440)
)};
$def("_viewof_cutoff", "viewof cutoff", ["sticky", "Inputs"], _viewof_cutoff);
$def("_cutoff", "cutoff", ["Generators", "viewof cutoff"], (G, v) => G.input(v));
```

`sticky(view, remembered)` returns `view`. Use one `sticky` call per cell, with the call written
directly in the cell body, because it finds the call by parsing the cell's source. The value must
be JSON-serialisable, and the view must dispatch `input`. Checked: setting 1234 rewrote the
source to `…, 1234)`, and a save reopened offline showed 1234.

## local-storage-view

A view whose value is `localStorage[key]`: kept per browser across reloads, not in the file.
Embedded in the robocoop-5 notebook, so the Observable-path form works offline too.

```js
main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));
main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
$def("_vv", "viewof volume", ["Inputs", "localStorageView"], (Inputs, localStorageView) =>
  Inputs.bind(Inputs.range([0, 100], {label: "volume", step: 1, value: 10}), localStorageView("demo-volume", {defaultValue: 10})));
$def("_v", "volume", ["Generators", "viewof volume"], (G, v) => G.input(v));
```

`localStorageView(key, {bindTo, defaultValue = null, json = false})`. Without `defaultValue` a
new key reads `null`, and `Inputs.bind` then sets a range to its minimum. Values are strings
unless `json: true`, and a stored `0` or `""` reads as the default. For an object, use
`{json: true}` with no default and handle `null`: an object `defaultValue` renders a collapsed
inspector, which made `write_file` hang in this harness until `summarizejs` was fixed on
2026-09-28.

## slides

A reveal.js deck whose slides are the live outputs of named cells. 43502 B, plus
`@tomlarkworthy/reveal-js-6` and its reveal.js files. Not on the PDS.

```js
main.define("module @tomlarkworthy/slides", async () => runtime.module((await import("/@tomlarkworthy/slides.js?v=4")).default));
main.define("slideshow", ["module @tomlarkworthy/slides", "@variable"], (_, v) => v.import("slideshow", _));
// + runtime, thisModule, viewof myModule / myModule as in "How the imports work"
$def("_deck", "deck", ["slideshow", "runtime", "invalidation", "myModule"],
  (slideshow, runtime, invalidation, myModule) => slideshow(runtime, {
    invalidation, module: myModule,
    slides: [{cell: "intro", layout: "central"}, {cell: ["viewof n", "bars"], layout: "columns", ratios: [1, 2]}]
  }));
```

`slideshow(runtime, {invalidation, module, slides, width, height, transition, builder, persist, filename})`
returns the deck. A slide is a cell name, an array of names (shown as columns), or
`{cell, layout, ratios, notes, …}`. `layout` is one of `default`, `central`, `upper`, `left`,
`columns`, `fit`. Put an input on a slide by its `viewof` name. A cell shown in the deck is empty
in its own place in the notebook. `filename` adds a link that saves the notebook.

## svg-lens

An SVG literal the user can drag and edit in the page. Every edit is written back into the
literal in the cell's source. 522492 B, and it also loads `grid-container` and `editable-md`.

```js
main.define("module @tomlarkworthy/svg-lens", async () => "@tomlarkworthy/svg-lens" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreianc5gxq6lnbmeiavkhedazx6k2gwarajoyaqwafbinzxeaw3rf4y")).default));
main.define("svg", ["module @tomlarkworthy/svg-lens", "@variable"], (_, v) => v.import("svg", _));
const _viewof_picture = function picture(svg){return(
svg`<svg viewBox="0 0 100 100" width="300">
  <rect x="10" y="10" width="30" height="30" fill="steelblue"/>
  <circle cx="65" cy="60" r="20" fill="tomato"/>
</svg>`
)};
$def("_viewof_picture", "viewof picture", ["svg"], _viewof_picture);
$def("_picture", "picture", ["Generators", "viewof picture"], (G, v) => G.input(v));
```

`picture` is the current SVG source text. The element has `setProperty(path, prop, value)`,
`addShape(markup, at, parent)`, `undo()`/`redo()` and `selectionPaths()`. A path is an index
list, with `[0]` the root. The drawing must be a literal inside the cell that calls `svg`.
`${…}` holes render, but an edit that would cross one is refused. This import has no toolbar;
the toolbar in the svg-lens notebook is a demo cell there. For freehand sketching on a
`<canvas>`, write the canvas yourself (see event-handlers-in-cells.md).

## parametric-svg

Makes an SVG cell that depends on numeric `viewof` inputs draggable: dragging a marked anchor
moves the inputs. 156315 B, and it also loads `manipulate`, `dataflow-templating` and `editable-md`.

```js
main.define("module @tomlarkworthy/parametric-svg", async () => "@tomlarkworthy/parametric-svg" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreihlh2m4kmdu664nzgr55awomw6irpyd6u2kc3g636k73dz6y23o7e")).default));
main.define("svgEditor", ["module @tomlarkworthy/parametric-svg", "@variable"], (_, v) => v.import("svgEditor", _));
main.define("anchor", ["module @tomlarkworthy/parametric-svg", "@variable"], (_, v) => v.import("anchor", _));
// + thisModule, viewof myModule / myModule; viewof cx / viewof cy are Inputs.range cells
$def("_dot", "dot", ["cx", "cy", "htl", "anchor"], (cx, cy, htl, anchor) => htl.svg`<svg width="200" height="200">
  <circle cx=${cx} cy=${cy} r="12" fill="tomato"/>${anchor("centre", {x: cx, y: cy})}</svg>`);
$def("_ed", "dotEditor", ["svgEditor", "myModule", "invalidation"],
  (svgEditor, myModule, invalidation) => svgEditor({target: "dot", module: myModule, invalidation}));
```

Checked: in the saved file reopened offline, a 40 px drag moved `cx` from 60 to 100. The target
cell must be visible on screen to be dragged.

## Diagrams

The stdlib `mermaid` tag renders mermaid syntax to an `<svg>`. It needs no import line: list
`"mermaid"` as a dependency.

```js
$def("_diagram", "diagram", ["mermaid"], (mermaid) => mermaid`graph TD
  A[Start] --> B{Choice}
  B -->|yes| C[Done]
  B -->|no| A`);
```

It fetches mermaid 9.2.2 from cdn.jsdelivr.net on every page load, so the diagram needs the
network: offline, every cell using it failed with `unable to load module`. Syntax newer than
mermaid 9.2.2 may not parse; which syntax is untested.

**Diagram the user edits as text.** Put the mermaid source in a textarea and interpolate its value:
`mermaid` is `String.raw`-based, so `mermaid\`${text}\`` renders the string as written (the
`${…}` hole form is `@tomlarkworthy/mermaid-lens._holeDemo`). Wrapping the textarea in `sticky`
(section sticky; its import lines go at the bottom) rewrites the cell's literal on every edit, so a
saved file reopens with the edited text. A reload without saving loses the edits either way.
Checked 2026-09-28 by `rc5t-hiring-flowchart-text`: typing into the textarea redrew the SVG, and
sticky rewrote the cell's literal.

```js
const _src = function _src(sticky,Inputs){return(
sticky(Inputs.textarea({label: "Diagram (mermaid)", rows: 8, value: "flowchart TD\n  A[Order placed] --> B[Packed]\n  B --> C[Shipped]"}), "flowchart TD\n  A[Order placed] --> B[Packed]\n  B --> C[Shipped]")
)};
$def("_viewof_src", "viewof src", ["sticky", "Inputs"], _src);
$def("_src", "src", ["Generators", "viewof src"], (G, v) => G.input(v));
$def("_chart", "chart", ["mermaid", "src"], (mermaid, src) => mermaid`${src}`);
```

## Files

A button that downloads data works offline with the stdlib `DOM.download`:

```js
$def("_csv", "csvButton", ["DOM", "d3", "rows"], (DOM, d3, rows) =>
  DOM.download(new Blob([d3.csvFormat(rows)], {type: "text/csv"}), "scores.csv", "Download CSV"));
$def("_json", "jsonButton", ["DOM", "rows"], (DOM, rows) =>
  DOM.download(() => new Blob([JSON.stringify(rows, null, 2)], {type: "application/json"}), "scores.json", "Download JSON"));
```

`DOM.download(blobOrFunction, filename, label)` returns a button-styled `<a>`; the function form
builds the Blob on click.

A `<canvas>` saved as PNG keeps a transparent background wherever nothing was drawn, even though it
looks white on the page. Fill the background before drawing, and after each clear. In 4 of 7
agent-built sketch pads (rc5-train w3, 2026-09-28), the downloaded PNG was transparent. The corpus
pattern (`@tomlarkworthy/suminagashi` `_download`) builds the file when the button is clicked, so it
holds the current drawing:

```js
htl.html`<button onclick=${() => canvas.toBlob(blob => {
  const link = htl.html`<a download="drawing.png" href=${URL.createObjectURL(blob)}>`;
  link.click();
}, "image/png")}>Download PNG</button>`
``` For a PDF that works offline, use `pdfLib` (next section).

The following worked live but fail offline, because a save does not embed CDN imports (`Unable to
fetch …`). Pin the version:

```js
$def("_jspdf", "jspdf", [], async () => (await import("https://cdn.jsdelivr.net/npm/jspdf@4.2.1/+esm")).jsPDF);        // new jspdf(); doc.text(s, x, y); doc.output("blob")
$def("_docx", "docxLib", [], () => import("https://cdn.jsdelivr.net/npm/docx@9.8.0/+esm"));                             // Packer.toBlob(new Document({sections: [{children: [new Paragraph("…")]}]}))
$def("_xlsx", "XLSX", [], () => import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm"));                                // XLSX.write(wb, {bookType: "xlsx", type: "array"}) -> ArrayBuffer
```

Wrap the bytes in a Blob and use `htl.html\`<a href=${URL.createObjectURL(blob)} download=${name}>…\``.

## sign-a-pdf

Its `pdfLib` (pdf-lib, which creates and edits PDFs) and `pdfjs` (PDF.js 2.10.12, which renders
pages) are stored in the notebook as file attachments. Not on the PDS.

```js
main.define("module @tomlarkworthy/sign-a-pdf", async () => runtime.module((await import("/@tomlarkworthy/sign-a-pdf.js?v=4")).default));
main.define("pdfLib", ["module @tomlarkworthy/sign-a-pdf", "@variable"], (_, v) => v.import("pdfLib", _));
const _pdfBytes = async function pdfBytes(pdfLib){
  const doc = await pdfLib.PDFDocument.create();
  const page = doc.addPage([400, 200]);
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  page.drawText("Hello from a cell", {x: 40, y: 100, size: 24, font});
  return doc.save();                       // Uint8Array
};
$def("_pdfBytes", "pdfBytes", ["pdfLib"], _pdfBytes);
$def("_pdfLink", "pdfLink", ["pdfBytes", "htl"], (pdfBytes, htl) => {
  const blob = new Blob([pdfBytes], {type: "application/pdf"});
  return htl.html`<a href=${URL.createObjectURL(blob)} download="hello.pdf">Download PDF (${blob.size} bytes)</a>`;
});
```

Importing either name adds about 3.4 MB of attachments to every save. To load an existing file,
use `pdfLib.PDFDocument.load(await file.arrayBuffer())`. `pdfjs` rendering failed in a saved
notebook opened from `file://` (`Setting up fake worker failed`), and worked when the same file
was served over http. Pass `bytes.slice()` to `pdfjs.getDocument`, because it takes ownership of
the buffer.

## exporter-3

`downloadAnchor` gives a link that saves the whole running notebook as one HTML file. exporter-3
is embedded in the robocoop-5 notebook.

```js
main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));
main.define("downloadAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("downloadAnchor", _));
$def("_save", "saveLink", ["downloadAnchor"], (downloadAnchor) => downloadAnchor({}, "Save this notebook"));
```

`downloadAnchor(attrs = {}, label = "download", exportOpts = {})` returns an `<a>`. The file is
named after the module in view, not after the notebook.

## grid-container

Existing cells arranged as movable, resizable tiles. Dragging a tile rewrites the `include:` and
`layout:` literals in the calling cell's source. 56838 B.

```js
main.define("module @tomlarkworthy/grid-container", async () => "@tomlarkworthy/grid-container" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreice5hjlgedawdjyvvxcga7m23v6wk7garkadcxz72js6y4vz2dfy4")).default));
main.define("gridContainer", ["module @tomlarkworthy/grid-container", "@variable"], (_, v) => v.import("gridContainer", _));
// + runtime, thisModule, viewof myModule / myModule
$def("_w", "widget", ["gridContainer", "runtime", "invalidation", "myModule"], (gridContainer, runtime, invalidation, myModule) =>
  gridContainer(runtime, {invalidation, module: myModule, columns: 12, include: ["viewof freq", "label"],
    layout: {atoms: {"viewof freq": {x: 0, y: 0, w: 6, h: 1}, label: {x: 6, y: 0, w: 6, h: 1}}}}));
```

The grid takes each included cell's DOM node, so those cells are empty in their own place.
Drag, resize and the source rewrite were not checked.

## view

One `viewof` built from several inputs, whose value is an object. Embedded in robocoop-5.

```js
main.define("module @tomlarkworthy/view", async () => runtime.module((await import("/@tomlarkworthy/view.js?v=4")).default));
main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));
const _viewof_settings = function settings(view,Inputs){return(
view`<div style="display:flex;gap:12px">
  ${["size", Inputs.range([1, 10], {label: "size", step: 1, value: 3})]}
  ${["name", Inputs.text({label: "name", value: "Ada"})]}
</div>`
)};
```

`${[key, childView]}` binds a child view to `value[key]`. `${[key, arrayOfViews, data => view]}`
gives an array that is rebuilt when `value[key]` is assigned. A key starting with `_` is hidden,
and `"value"` is reserved. To write a value back, set `viewof settings.value = {...}`, then
dispatch `input`. It does not persist.

## csv-column-chooser

Streams a CSV `File` into a new CSV holding only the chosen columns. 12071 B.

```js
main.define("module @tomlarkworthy/csv-column-chooser", async () => "@tomlarkworthy/csv-column-chooser" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreid3dnurjoouxk26wylvokgvfxj42nwqdsyrgbfvms3m2abb6nkxwq")).default));
main.define("streamSelectCSVToBlobURL", ["module @tomlarkworthy/csv-column-chooser", "@variable"], (_, v) => v.import("streamSelectCSVToBlobURL", _));
$def("_f", "filtered", ["streamSelectCSVToBlobURL", "csvFile"], (s, file) => s({file, selectedHeaders: ["city", "name"]}));
```

The call resolves to `{url, blob, filename, bytesRead, rowsRead, rowsWritten}`, with columns in
`selectedHeaders` order. `rowsWritten` counts the header row. `parseCSVLine(line)` handles quotes
and a BOM.

## notes

The Notes app's IndexedDB store (Dexie). Import its data cells, not its UI cells.

```js
main.define("module @tomlarkworthy/notes", async () => runtime.module((await import("/@tomlarkworthy/notes.js?v=4")).default));
main.define("notes", ["module @tomlarkworthy/notes", "@variable"], (_, v) => v.import("notes", _));
main.define("notes_collection", ["module @tomlarkworthy/notes", "@variable"], (_, v) => v.import("notes_collection", _));
```

`notes` is a live array of `{note_id, title, content, created, modified}`. `notes_collection` is
a Dexie table (`add`, `update`, `delete`). The database name is fixed (`"notes"`), so every
notebook on the same origin shares it, and the data is not saved into the file. For notes that
must travel with the file, use editable-md or sticky.
