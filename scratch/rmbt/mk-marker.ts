// Prototype: close every streamed block with a comment the parser inserts. JS appends can
// add siblings, but they never carry the marker, so scanning forward for it is sound.
import { readFileSync, writeFileSync } from "fs";
let h = readFileSync("scratch/rmbt/export-v17217.html", "utf8");

const OLD = `function __isComplete(el) { return !!el && (el.nextSibling != null || !window.__lopeStreaming); }`;
if (!h.includes(OLD)) throw new Error("__isComplete not found");
h = h.replace(OLD, `function __isComplete(el) {
    if (!el) return false;
    if (!window.__lopeStreaming) return true;
    // Only the parser writes the end marker. Boot appends to <body> too, so a bare
    // nextSibling proves nothing about how far the parser got.
    for (var n = el.nextSibling; n; n = n.nextSibling)
      if (n.nodeType === 8 && n.data === "/") return true;
    return false;
  }`);

let n = 0;
h = h.replace(/(<script[^>]*\btype="text\/plain"[\s\S]*?<\/script>)(?!<!--\/-->)/g, (m) => { n++; return m + "<!--/-->"; });
writeFileSync("scratch/rmbt/export-marker.html", h);
console.log("marked", n, "blocks");
