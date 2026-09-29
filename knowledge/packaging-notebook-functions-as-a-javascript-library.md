---
scope: [local-development, in-notebook]
write-triggers:
  - "package\\.json[\"'`]"
  - "\\\\?\"type\\\\?\"\\s*:\\s*\\\\?\"module\\\\?\""
---

# Packaging notebook functions as a JavaScript library (an ES module file, package.json, README)

Generate the library from the user's cells: one cell takes each function cell as an input and
writes its current source with `fn.toString()`. Do not type or paste the functions into a string.
The same rule for exporting the notebook's prose is in `exporting-the-notebooks-writing.md`.

## A pasted copy is wrong twice

In run `20260929-0620-m65` (base, one run) the agent read `@user/edge-kit`, then wrote a
`libSource` cell with no inputs holding a template literal of the four functions, and three
download buttons.
- It retyped `canny` (143 lines) and changed it: the edge angle became
  `atan2(…) * 180 / PI + 180` where the cell folds a negative angle into `[0, 180)`. On a 16×16
  test square the library's `canny` marked different pixels from the live cell. Every cell
  computed with no runtime error.
- After the user edited `gaussianKernel1D`, the next download still held the old kernel.

## Derive the source from the cells

`@tomlarkworthy/belief-geometry.workerSource` (`lopebooks/notebooks/@tomlarkworthy_belief-geometry.html`)
builds a standalone program the same way:
`beliefKitFactory.toString() + "\n" + gptFactory.toString() + …`.

For a module with a constant `EARTH_RADIUS_KM` and the functions `toRadians`, `haversine`
(which calls `toRadians` and reads `EARTH_RADIUS_KM`) and `bearing`:

```js
const _library = function _library(EARTH_RADIUS_KM,toRadians,haversine,bearing){return(
[
  "export const EARTH_RADIUS_KM = " + JSON.stringify(EARTH_RADIUS_KM) + ";",
  ...Object.entries({toRadians, haversine, bearing}).map(([name, fn]) => "export const " + name + " = " + fn.toString() + ";")
].join("\n\n") + "\n"
)};
```

- `export const name = <fn source>;` works for a `function name(…) {…}` value and for an arrow.
- A function cell refers to other cells by their names. Export every cell it refers to, including
  constants, under the same name, so the names resolve at module scope. A constant is written with
  `JSON.stringify`.
- Leave out cells that are not plain JavaScript outside the notebook: `md`/`html` cells, `viewof`
  inputs, charts, and any function that uses `md`, `html`, `htl`, `Inputs`, `Plot`, `DOM`,
  `FileAttachment`, `width`, `invalidation` or a `require`d library. If one of them is referenced
  at module level, node throws `md is not defined` when the file is imported. Tell the user which
  functions were left out and why.
- In a new module, import the function cells from the user's module
  (`writing-cells-in-module-source.md`, "import").
- Not covered (unverified): `fn.toString()` returns only the returned function. A cell body such as
  `{ const h = …; return x => h(x) }` loses `h`. An `async function*`, a class, or a cell that
  returns an object of functions was not tried.

## Package and download

Build the files when the button is clicked, from the cells' current values
(`@tomlarkworthy/suminagashi._download`, `lopebooks/notebooks/@tomlarkworthy_suminagashi.html`).
One zip is one click; `JSZip` from `@tomlarkworthy/jszip-3-10-1` is embedded in this notebook
(`important-modules.md`, "Files").

```js
const _download = function _download(htl,JSZip,library,pkg,readme){return(
htl.html`<button onclick=${async () => {
  const zip = new JSZip();
  zip.file("geo-kit/index.js", library);
  zip.file("geo-kit/package.json", JSON.stringify(pkg, null, 2));
  zip.file("geo-kit/README.md", readme);
  const link = htl.html`<a download="geo-kit.zip" href=${URL.createObjectURL(await zip.generateAsync({type: "blob"}))}>`;
  link.click();
}}>Download library</button>`
)};
main.define("module @tomlarkworthy/jszip-3-10-1", async () => runtime.module((await import("/@tomlarkworthy/jszip-3-10-1.js?v=4")).default));
main.define("JSZip", ["module @tomlarkworthy/jszip-3-10-1", "@variable"], (_, v) => v.import("JSZip", _));
```

`package.json` needs a lowercase `name` (npm rejects capitals and spaces), a semver `version`,
`"type": "module"` and `main` or `exports` naming the `.js` file. The README lists each exported
function with its parameters. This page's own rule: no corpus cell writes a `package.json` for a
download (checked 2026-09-29), so the manifest shape comes from npm, not from a notebook.

## Check

- Read the `library` value in the write's tool result: each function body is the cell's own text,
  and no `md\``, `html\`` or `Inputs.` appears.
- Edit one function cell and read `library` again: the edit is in it.
