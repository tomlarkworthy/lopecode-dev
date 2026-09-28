# Group B entries: presenting, drawing, diagrams, file generation

Every snippet below was applied with `node tools/scratch/rc5-sessions/s39-verify-module.mjs <file> --save`
in `lopebooks/notebooks/@tomlarkworthy_robocoop-5.html` on 2026-09-28. The full module files are next to
this file (`<name>.js`, probe output `<name>.s39.json`). "Offline" means the saved notebook reopened from
`file://` with bsky.network, observablehq.com, jsdelivr, esm.sh and unpkg blocked.

## @tomlarkworthy/slides — "make a slide deck / presentation from my cells"
Use for: a reveal.js deck whose slides are the live outputs of named cells. Size: 43,502 B module + 2,848 B `@tomlarkworthy/reveal-js-6` + 60,676 B gzipped reveal.js attachments (stored twice, once under each module). Source: Observable path; same cells as canonical `lopebooks/notebooks/tomlarkworthy_slides.html` except that `slideBuilder` and `coreSlideStyle` differ (`tools/triage/cellwise-diff.ts`; the difference was not examined). Not on the PDS.
```js
main.define("module @tomlarkworthy/slides", async () => runtime.module((await import("/@tomlarkworthy/slides.js?v=4")).default));
main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
main.define("slideshow", ["module @tomlarkworthy/slides", "@variable"], (_, v) => v.import("slideshow", _));
main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
```
```js
const _viewof_myModule = function myModule(thisModule){return(thisModule())};
const _myModule = (G, v) => G.input(v);
const _deck = function deck(slideshow, runtime, invalidation, myModule){return(
slideshow(runtime, {
  invalidation,
  module: myModule,
  slides: [
    {cell: "intro", layout: "central"},
    {cell: ["viewof n", "bars"], layout: "columns", ratios: [1, 2]}
  ]
})
)};
$def("_viewof_myModule", "viewof myModule", ["thisModule"], _viewof_myModule);
$def("_myModule", "myModule", ["Generators", "viewof myModule"], _myModule);
$def("_deck", "deck", ["slideshow", "runtime", "invalidation", "myModule"], _deck);
```
Returns / API: `slideshow(runtime, {invalidation, module, slides, width, height, transition, builder, persist, filename})` returns the deck `<div>` (md cell `usage`, line 20 of the canonical module source). A slide entry is a cell name, an array of names (columns), or `{cell, layout, ratios, notes, timing, className, contentClassName, background*}`; `layout` is one of `default`, `central`, `upper`, `left`, `columns`, `fit`. Put an input on a slide by its `viewof` name. `filename` adds a ⤓ link that saves the whole notebook (via exporter-3 `downloadAnchor`).
Pitfalls: `module:` must be the Module value. Passing `thisModule()` directly fails with `Cannot read properties of undefined (reading 'get')`, because `thisModule()` returns a view (an EventTarget whose `.value` is the module), so read it through a `viewof` + `Generators.input` pair as above. Slide cells are adopted by the deck and render as empty slots in the notebook while the deck shows them (stated in md `demo_cells`). The ✎ builder rewrites the `slides:` literal in the calling cell's source.
Verified: all cells compute; a check cell read 2 `.slides > section`, the intro text and the SVG inside the deck. Offline reopen: same result. The save embedded `@tomlarkworthy/slides`, `@tomlarkworthy/reveal-js-6` and both reveal `.gz` attachments. 2026-09-28.

## @tomlarkworthy/svg-lens — "let me draw / edit an SVG by hand and keep it as code"
Use for: an SVG literal that is drag/edit-able in the page; every edit rewrites the cell's own source. Size: 522,492 B, plus `@tomlarkworthy/grid-container` (56,196 B) and `@tomlarkworthy/editable-md` (42,270 B), which it loads from Observable on first use. Source: PDS CID `bafkreianc5gxq6lnbmeiavkhedazx6k2gwarajoyaqwafbinzxeaw3rf4y` (523,325 B), identical to the canonical `lopebooks/notebooks/tomlarkworthy_svg-lens.html`. The other PDS copy, `bafkreiamxqdx…` (522,800 B), is a different version and was not tested.
```js
main.define("module @tomlarkworthy/svg-lens", async () => "@tomlarkworthy/svg-lens" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreianc5gxq6lnbmeiavkhedazx6k2gwarajoyaqwafbinzxeaw3rf4y")).default));
main.define("svg", ["module @tomlarkworthy/svg-lens", "@variable"], (_, v) => v.import("svg", _));
```
```js
const _viewof_picture = function picture(svg){return(
svg`<svg viewBox="0 0 100 100" width="300">
  <rect x="10" y="10" width="30" height="30" fill="steelblue"/>
  <circle cx="65" cy="60" r="20" fill="tomato"/>
</svg>`
)};
const _picture = (G, v) => G.input(v);
$def("_viewof_picture", "viewof picture", ["svg"], _viewof_picture);
$def("_picture", "picture", ["Generators", "viewof picture"], _picture);
```
Returns / API: the imported `svg` is `svgLens()` (line 8623 of the canonical module source), a tag that builds the node with `htl.svg` and installs the editor. `svgLens(options)` returns a configured tag, and `svgLens(node, options)` installs the editor on an existing node (line 8613). Options include `tools`, `affordances`, `shapes`, `commands`, `grid` (default 0.5), `keyboard`. The `viewof` element's `.value` is the current SVG source text (line 8133), so `picture` is a string. Element methods include `setProperty(path, prop, value)` (8294), `addShape(markup, at, parent)` (8141), `edit(name, fn)` (8158), `undo()`/`redo()` (8248), `selectionPaths()` and `describe(path)`. A path is an index list: `[0]` is the root and `[0, 1]` is its second child. Gestures and keys are in md `howToDrive`.
Pitfalls: the drawing must be a literal inside the cell that calls the tag, because edits are written back into that literal. Interpolated `${…}` holes render, and an edit that would cross one is refused (md intro and §6). `setProperty` rewrites the source, so the cell recomputes. In the probe, `setProperty([0,1], "fill", "gold")` re-ran and then read `fill="gold"` from the source. There is no toolbar or inspector in this import: those are demo cells (`toolbar`, `inspector`) wired to the demo's `viewof drawing`.
Verified: live, `picture` was a string containing `<circle`, and the element had `setProperty` and `selectionPaths() == []`. The s39 `--save` reopen failed with `SyntaxError: Identifier '_1worupj' has already been declared`, because the probe's two forcing observers (`x => x`) were exported under one pid. That is a probe artifact, not an svg-lens fault. With the two duplicate lines removed from the saved file, the offline reopen gave identical values. The saved import line had been rewritten to `/@tomlarkworthy/svg-lens.js?v=4`, with svg-lens, grid-container and editable-md embedded. 2026-09-28.

## @tomlarkworthy/parametric-svg — "drag parts of a drawing and have the sliders/parameters follow"
Use for: making any SVG cell that depends on numeric `viewof` inputs directly draggable. A numerical inverse (finite-difference Jacobian) moves the inputs so that a marked anchor follows the pointer. Size: 156,315 B, plus `@tomlarkworthy/manipulate` (27,768 B), `@tomlarkworthy/dataflow-templating` (35,082 B) and `@tomlarkworthy/editable-md` (42,270 B) loaded from Observable. Source: PDS CID `bafkreihlh2m4kmdu664nzgr55awomw6irpyd6u2kc3g636k73dz6y23o7e` (156,422 B), identical to the canonical `lopebooks/notebooks/@tomlarkworthy_parametric-svg.html`.
```js
main.define("module @tomlarkworthy/parametric-svg", async () => "@tomlarkworthy/parametric-svg" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreihlh2m4kmdu664nzgr55awomw6irpyd6u2kc3g636k73dz6y23o7e")).default));
main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
main.define("svgEditor", ["module @tomlarkworthy/parametric-svg", "@variable"], (_, v) => v.import("svgEditor", _));
main.define("anchor", ["module @tomlarkworthy/parametric-svg", "@variable"], (_, v) => v.import("anchor", _));
main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
```
```js
// viewof cx / viewof cy are ordinary Inputs.range cells (+ Generators.input value cells)
const _dot = function dot(cx, cy, htl, anchor){return(
htl.svg`<svg width="200" height="200" viewBox="0 0 200 200">
  <circle cx=${cx} cy=${cy} r="12" fill="tomato"/>
  ${anchor("centre", {x: cx, y: cy})}
</svg>`
)};
const _viewof_myModule = function myModule(thisModule){return(thisModule())};
const _myModule = (G, v) => G.input(v);
const _dotEditor = function dotEditor(svgEditor, myModule, invalidation){return(
svgEditor({target: "dot", module: myModule, invalidation})
)};
```
Returns / API: `anchor(id, {x, y, kind})` returns an invisible `<circle class="__anchor">` that marks a draggable point (line 16). `svgEditor({target, module, invalidation, autoDispose, mode, ...})` returns a Promise with a `.dispose()` method (line 1116). It resolves to the controller state object and draws its overlay on `document.body`. `mode` defaults to `"solve"` (line 1986). The target cell must depend on the `viewof` inputs that the solver may change. Shift+click locks an anchor (md intro).
Pitfalls: `module:` needs the Module value through the `viewof` + `Generators.input` pair, the same as for slides. The target cell must be visible to be dragged: in the first drag attempt the pane was not shown, the circle's bounding box was 0×0, and nothing moved.
Verified: all cells compute live and offline. In the saved file opened offline with `#view=R100(S100(@user/psvg-demo))`, a 40 px pointer drag on the circle changed `cx` from 60 to 100 (`.psvg-drag.mjs`). The save embedded parametric-svg, manipulate, dataflow-templating and editable-md. The page logged `error loading module module 1/5 … no module` from module-map during the run, and every cell still computed. 2026-09-28.

## @tomlarkworthy/sign-a-pdf — "create / render / modify a PDF in the page"
Use for: its `pdfLib` ([pdf-lib](https://pdf-lib.js.org)), which creates and edits PDFs, and its `pdfjs` (PDF.js 2.10.12), which renders pages to a canvas. Both are stored in the notebook as file attachments. The module itself is a signature-overlay app, not a library. Size: 11,427 B module + attachments `pdf-lib.min.js` 695,010 B, `pdf.js` 517,886 B and `pdf.worker.js` 2,233,474 B (base64 sizes in the saved file). Source: Observable path; `cellwise-diff` reports no difference from canonical `lopebooks/notebooks/@tomlarkworthy_sign-a-pdf.html`. Not on the PDS.
```js
main.define("module @tomlarkworthy/sign-a-pdf", async () => runtime.module((await import("/@tomlarkworthy/sign-a-pdf.js?v=4")).default));
main.define("pdfLib", ["module @tomlarkworthy/sign-a-pdf", "@variable"], (_, v) => v.import("pdfLib", _));
main.define("pdfjs", ["module @tomlarkworthy/sign-a-pdf", "@variable"], (_, v) => v.import("pdfjs", _));
```
```js
const _pdfBytes = async function pdfBytes(pdfLib){
  const doc = await pdfLib.PDFDocument.create();
  const page = doc.addPage([400, 200]);
  const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
  page.drawText("Hello from a cell", {x: 40, y: 100, size: 24, font, color: pdfLib.rgb(0.1, 0.3, 0.7)});
  return doc.save();                                   // Uint8Array
};
const _pdfLink = function pdfLink(pdfBytes, htl){
  const blob = new Blob([pdfBytes], {type: "application/pdf"});
  return htl.html`<a href=${URL.createObjectURL(blob)} download="hello.pdf">Download PDF (${blob.size} bytes)</a>`;
};
const _preview = async function preview(pdfjs, pdfBytes, htl){
  const pdf = await pdfjs.getDocument({data: pdfBytes.slice()}).promise;
  const page = await pdf.getPage(1), viewport = page.getViewport({scale: 1.5});
  const canvas = htl.html`<canvas width=${viewport.width} height=${viewport.height}>`;
  await page.render({canvasContext: canvas.getContext("2d"), viewport}).promise;
  return canvas;
};
```
Returns / API: `pdfLib` is `require(FileAttachment("pdf-lib.min.js").url())`, the full pdf-lib namespace (line 232). `pdfjs` is the PDF.js namespace with `GlobalWorkerOptions.workerSrc` set to the attached worker (line 235). To edit an existing file, use `pdfLib.PDFDocument.load(await file.arrayBuffer())`. The app's own flow uses `embedJpg` + `page.drawImage` (cell `embed`).
Pitfalls: importing either name puts all three attachments, about 3.4 MB of base64, into the next save. Pass `pdfBytes.slice()` to `getDocument`, because PDF.js takes ownership of the buffer it is given. On a notebook saved and opened from `file://`, `pdfjs` rendering fails with `Setting up fake worker failed: "Cannot read properties of undefined (reading 'WorkerMessageHandler')"`. The same saved file served over `http://localhost`, with the CDNs still blocked, renders correctly, so the cause is the blob-URL worker on a `file://` origin, not the network. `pdfLib` works in both cases.
Verified: live, the result was 881 bytes starting `%PDF-`, 1 page when reloaded with `PDFDocument.load`, and 2,502 inked pixels on the canvas. Offline from `file://`, `pdfBytes` and `pdfLink` worked, and `preview` failed with the error above. Offline over http, all cells passed (`.pdf-probe.mjs`). 2026-09-28.

## Mermaid diagrams — "draw a flowchart / sequence diagram"
Use for: rendering mermaid syntax to SVG. Size: 0 in the notebook. Source: the stdlib builtin `mermaid`, which fetches `https://cdn.jsdelivr.net/npm/mermaid@9.2.2/dist/mermaid.min.js` on first use (request logged). No import line is needed: list `"mermaid"` as a dependency.
```js
const _diagram = function diagram(mermaid){return(
mermaid`graph TD
  A[Start] --> B{Choice}
  B -->|yes| C[Done]
  B -->|no| A`
)};
$def("_diagram", "diagram", ["mermaid"], _diagram);
```
Returns / API: a tagged template that returns an `<svg>` element. mermaid is version 9.2.2, so syntax added in later mermaid releases may not parse (unverified which).
Pitfalls: it needs the network every time the page loads. Offline reopen gave `ERROR unable to load module` for the builtin and for every cell that depends on it. `@tomlarkworthy/mermaid-lens`, a structural editor over a mermaid literal (`import {mermaid} from "@tomlarkworthy/mermaid-lens"`), exists in `lopebooks/notebooks/@tomlarkworthy_mermaid-lens.html`, but it cannot be loaded from this page: `canonical.json` records `"upstream": null`, `api.observablehq.com/@tomlarkworthy/mermaid-lens.js?v=4` returns 404, and it is not on the PDS.
Verified: live, the diagram was an `<svg>` with 3 `g.node` elements. Offline, every cell errored as above. 2026-09-28.

## Downloadable files from a cell — "let me download this as CSV / JSON / PDF / Word / Excel"
Use for: turning cell data into a file the user saves. Source: CSV/JSON/text use the stdlib `DOM.download` (no network). PDF uses jsPDF `https://cdn.jsdelivr.net/npm/jspdf@4.2.1/+esm`. .docx uses `https://cdn.jsdelivr.net/npm/docx@9.8.0/+esm`. .xlsx uses SheetJS `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm` (454,295 B). Each is a `+esm` import inside a cell. For a PDF that works offline, use `pdfLib` from sign-a-pdf (entry above).
```js
const _csvButton = function csvButton(DOM, d3, rows){return(
DOM.download(new Blob([d3.csvFormat(rows)], {type: "text/csv"}), "scores.csv", "Download CSV")
)};
const _jsonButton = function jsonButton(DOM, rows){return(
DOM.download(() => new Blob([JSON.stringify(rows, null, 2)], {type: "application/json"}), "scores.json", "Download JSON")
)};
const _jspdf = async function jspdf(){return((await import("https://cdn.jsdelivr.net/npm/jspdf@4.2.1/+esm")).jsPDF)};
const _pdfBlob = function pdfBlob(jspdf, rows){
  const doc = new jspdf(); doc.text("Scores", 20, 20);
  rows.forEach((r, i) => doc.text(`${r.name}: ${r.score}`, 20, 30 + i * 10));
  return doc.output("blob");
};
const _docxLib = async function docxLib(){return(import("https://cdn.jsdelivr.net/npm/docx@9.8.0/+esm"))};
const _docxBlob = function docxBlob(docxLib, rows){
  const {Document, Packer, Paragraph, TextRun} = docxLib;
  return Packer.toBlob(new Document({sections: [{children: [
    new Paragraph({children: [new TextRun({text: "Scores", bold: true})]}),
    ...rows.map(r => new Paragraph(`${r.name}: ${r.score}`))]}]}));
};
const _XLSX = async function XLSX(){return(import("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm"))};
const _xlsxBlob = function xlsxBlob(XLSX, rows){
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Scores");
  return new Blob([XLSX.write(wb, {bookType: "xlsx", type: "array"})], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
};
const _fileLinks = function fileLinks(htl, pdfBlob, docxBlob, xlsxBlob){
  const a = (blob, name) => htl.html`<a href=${URL.createObjectURL(blob)} download=${name}>${name}</a>`;
  return htl.html`<div>${a(pdfBlob, "scores.pdf")} · ${a(docxBlob, "scores.docx")} · ${a(xlsxBlob, "scores.xlsx")}</div>`;
};
```
Returns / API: `DOM.download(blobOrFunction, filename, label)` returns an `<a>` styled as a button, and the function form builds the Blob when the user clicks. `jsPDF#output("blob")` returns a Blob. `docx.Packer.toBlob(doc)` returns a Promise of a Blob. `XLSX.write(wb, {bookType: "xlsx", type: "array"})` returns an ArrayBuffer.
Pitfalls: the three CDN libraries are fetched at runtime and a save does not embed them. After a save and an offline reopen, `jspdf`, `docxLib` and `XLSX`, and every cell that depends on them, fail with `Unable to fetch https://cdn.jsdelivr.net/npm/… Failed to fetch`. `DOM.download` needs no network and worked offline. Pin the version in the URL.
Verified: live check `Download CSV|Download JSON|pdf 3360 %PDF-|docx 9476 PK|xlsx 16016 PK|3 links`. In the saved file opened offline, clicking the buttons in Playwright downloaded `scores.csv` (`name,score\nAda,91\nGrace,88`) and `scores.json` (`.dl-click.mjs`). The PDF, docx and xlsx cells errored offline as described. 2026-09-28.

## @tomlarkworthy/exporter-3 `downloadAnchor` — "give me a button that saves this notebook"
Use for: a link that serialises the whole running notebook, including the current cell sources and embedded modules and attachments, into one HTML file. Size: already embedded in the robocoop-5 notebook. Source: `/@tomlarkworthy/exporter-3.js?v=4` resolves to the embedded copy.
```js
main.define("module @tomlarkworthy/exporter-3", async () => runtime.module((await import("/@tomlarkworthy/exporter-3.js?v=4")).default));
main.define("downloadAnchor", ["module @tomlarkworthy/exporter-3", "@variable"], (_, v) => v.import("downloadAnchor", _));
const _saveLink = function saveLink(downloadAnchor){return(downloadAnchor({}, "Save this notebook as HTML"))};
```
Returns / API: `downloadAnchor(attrs = {}, label = 'download', exportOpts = {})` returns an `<a>` (line 506 of the embedded exporter-3 source). Slides' `filename` option and svg-lens's "Download this notebook" link both use it. The lower-level `exportToHTML({mains})` resolves to the HTML string or to `{source}`, which is how the s39 probe saves.
Verified: live and offline, the cell was an `<a>`. Clicking it in the offline-opened save downloaded `@user_save-demo_20260928T065744Z.html` (3,294,965 chars, containing the `@user/save-demo` module block). The file was named after the module in the view (`#view=R100(S100(@user/save-demo))`), not after the notebook. 2026-09-28.
