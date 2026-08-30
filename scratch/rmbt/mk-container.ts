// Put the streamed blocks in their own container: nothing but the HTML parser appends
// there, so el.nextSibling means "the parser has moved past el" again.
import { readFileSync, writeFileSync } from "fs";
let h = readFileSync("scratch/rmbt/export-v17217.html", "utf8");

const open = h.indexOf("<!-- CSS -->");                       // first block comment, top level
const sentinel = h.lastIndexOf('<script id="streaming_sentinel">');
if (open < 0 || sentinel < 0 || sentinel < open) throw new Error("anchors not found");

h = h.slice(0, open) + '<div id="lope-blocks">\n' +
    h.slice(open, sentinel) + '</div>\n' +
    h.slice(sentinel);
writeFileSync("scratch/rmbt/export-container.html", h);
console.log("wrapped", ((sentinel - open) / 1e6).toFixed(2) + "MB of blocks");
