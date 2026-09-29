---
scope: [local-development, in-notebook]
write-triggers:
  - "type:\\s*[\"'`]text/markdown[\"'`]"
  - "download=[\"'`]?[^\"'`\\s>]*\\.md\\b"
  - "DOM\\.download\\([^;]*\\.md[\"'`]"
---

# Exporting the notebook's writing (a markdown file, a word count, a document built from its cells)

"My notebook" is the user's own modules (usually `@user/…`, the module in the layout they are
working in), not the ~60 library and tooling modules the page also loads. Build the export from
those modules' `md` cells as they are now, by depending on them, and convert each rendered cell back
to markdown.
The same rule for exporting the user's functions as code is in `packaging-notebook-functions-as-a-javascript-library.md`.

## Depend on the cells; do not paste their text

A cell that holds a copy of the prose gives the right file once and a stale one after the next
edit. In run `20260929-0620-m64` (base, 2 of 2 runs) the agent read the user's module, pasted the
text of its four `md` cells into a string cell of a new module, and imported only the one
interpolated value. The first download was byte-identical to the expected file; after one `md`
cell was edited, the next download still held the old paragraph.

Take the `md` cells as inputs instead. The export cell then recomputes whenever one changes:

```js
$def("_download", "download", ["htl", "intro", "method", "results"], …);
```

From another module, import each one (the import form is in `writing-cells-in-module-source.md`):

```js
main.define("module @user/field-notes", async () => runtime.module((await import("/@user/field-notes.js?v=4")).default));
main.define("intro", ["module @user/field-notes", "@variable"], (_, v) => v.import("intro", _));
```

A cell the user adds later has to be added to that list. No corpus idiom lists "every `md` cell
of one module" through a public import (checked 2026-09-29).

Do not collect every module's markdown (`liveCellMap`, all of `runtime._variables`). In run
`20260929-0620-m45-before2` a word count summed the `md` cells of all 60 loaded modules: 7292
words, where the user's module had 316.

## Convert the rendered cell, not its source

An `md` cell's value is the rendered element, with its `${…}` holes already filled in. Its
source has the hole unevaluated: a file built from source text says `${share}%` where the page
shows `0.396%`. An `md` cell with one block (a single heading) returns that element; with several
it returns a `<div>` holding them.

The corpus has no converter from rendered markdown back to markdown: `turndown`, `toMarkdown`,
`htmlToMarkdown`, `html2md` and a `"#".repeat(` heading walker each match 0 of 248 notebooks
(2026-09-29). The walker below is **this page's own**. It has been run only against the
`rc5t-markdown-download` eval fixture (headings, paragraphs, a list, a link, an image, a table).
Nested lists come out flat, literal `*`, `_` and `|` in text are not escaped, and rendered `tex`
or HTML embeds become plain text.

```js
const inline = n => [...n.childNodes].map(c => {
  if (c.nodeType === 3) return c.textContent;
  if (c.nodeType !== 1) return "";
  const t = c.tagName.toLowerCase(), s = inline(c);
  if (t === "a") return "[" + s + "](" + c.getAttribute("href") + ")";
  if (t === "img") return "![" + (c.getAttribute("alt") || "") + "](" + c.getAttribute("src") + ")";
  if (t === "em" || t === "i") return "*" + s + "*";
  if (t === "strong" || t === "b") return "**" + s + "**";
  if (t === "code") return "\x60" + s + "\x60";
  return s;
}).join("");
const block = c => {
  const t = c.tagName.toLowerCase();
  if (/^h[1-6]$/.test(t)) return "#".repeat(+t[1]) + " " + inline(c).trim();
  if (t === "ul" || t === "ol") return [...c.children].map((li, i) => (t === "ul" ? "- " : (i + 1) + ". ") + inline(li).trim()).join("\n");
  if (t === "table") {
    const rows = [...c.rows].map(r => "| " + [...r.cells].map(x => inline(x).trim()).join(" | ") + " |");
    return [rows[0], "| " + [...c.rows[0].cells].map(() => "---").join(" | ") + " |", ...rows.slice(1)].join("\n");
  }
  if (t === "pre") return "\x60\x60\x60\n" + c.textContent.replace(/\n$/, "") + "\n\x60\x60\x60";
  return inline(c).trim();
};
const toMarkdown = el => (el instanceof HTMLDivElement ? [...el.children] : [el]).map(block).join("\n\n");
```

`"\x60"` is a backtick: a literal one inside the cell would close an enclosing `htl.html\`…\``.
`innerHTML` or `outerHTML` saved under a `.md` name is HTML, not markdown; the eval scores that
0.58.

## Charts and code cells

A chart cell's value is an `<svg>` or a `<figure>`, and a code cell's value is data or a function.
Neither is writing: leave them out, or, if the user wants them, put a code cell's source in a
fenced block. Do not put `<svg>` markup, `[object …]` or a chart's axis text into the prose.

## Build the file when the button is clicked

```js
$def("_download", "download", ["htl", "intro", "method", "results"], (htl, ...cells) => {
  const button = htl.html`<button>Download markdown</button>`;
  button.onclick = () => {
    const text = cells.map(toMarkdown).join("\n\n") + "\n";
    const link = htl.html`<a download="notebook.md" href=${URL.createObjectURL(new Blob([text], {type: "text/markdown"}))}>`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  return button;
});
```

The click-time `<a download>` is `@tomlarkworthy/suminagashi._download`
(`lopebooks/notebooks/@tomlarkworthy_suminagashi.html`); `important-modules.md`, "Files", has the
`DOM.download` form.

## Check it

Download once and read the file: `#` headings, `- ` items, `[text](url)`, a `| --- |` table and the
holes' current values. Then edit one `md` cell (`edit_file` its text) and download again: the edit
must be in the new file.
