import { readFileSync, writeFileSync } from "node:fs";
const h = readFileSync("scratch/rmbt/after.html", "utf8");
const ID = "@tomlarkworthy/coded-landmark-tracking-data";
const s = h.indexOf(`<script id="${ID}"`); const gt = h.indexOf(">", s); const e = h.indexOf("</script>", gt);
let block = h.slice(s, e + 9);
const a = block.indexOf("  const fileAttachments = new Map(");
const bIdx = block.indexOf(`main.builtin("FileAttachment"`);
if (a < 0 || bIdx < 0) throw new Error(`markers a=${a} b=${bIdx}`);
const OLD = block.slice(a, bIdx);
const BUILTIN_END = block.indexOf("\n", bIdx);
const oldBuiltin = block.slice(bIdx, BUILTIN_END);
block = block.replace(OLD, "  const __fa = new Map();\n  ").replace(oldBuiltin,
`main.builtin("FileAttachment", runtime.fileAttachments((name) => {
    // dvfBytes, not contentSync: it waits for the block through __waitForId, so
    // the attachment may still be streaming when the cell asks for it.
    const id = "${ID}/" + encodeURIComponent(name);
    if (!__fa.has(id)) __fa.set(id, window.lopecode.dvfBytes(id).then(({mime, bytes}) =>
      ({ url: URL.createObjectURL(new Blob([bytes], { type: mime })), mimeType: mime })));
    return __fa.get(id);
  }));`);
if (block.includes("window.lopecode.contentSync(")) throw new Error("still sync");
let rest = h.slice(0, s) + h.slice(e + 9 + (h[e + 9] === "\n" ? 1 : 0));
const anchor = rest.indexOf(`<script id="@tomlarkworthy/lopepage-2"`);
writeFileSync("scratch/rmbt/exp-async-fa.html", rest.slice(0, anchor) + block + "\n" + rest.slice(anchor));
console.log("written; hoisted to", (100 * anchor / h.length).toFixed(1) + "%");
