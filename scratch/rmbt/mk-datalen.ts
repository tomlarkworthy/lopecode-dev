// Prototype: stamp every text/plain block with its exact content length and make the
// streaming completeness test use it instead of nextSibling.
import { readFileSync, writeFileSync } from "fs";
let h = readFileSync("scratch/rmbt/export-v17217.html", "utf8");

const OLD = `function __isComplete(el) { return !!el && (el.nextSibling != null || !window.__lopeStreaming); }`;
if (!h.includes(OLD)) throw new Error("__isComplete not found");
const NEW = `function __isComplete(el) {
    if (!el) return false;
    var want = el.getAttribute("data-len");
    if (want != null) return (el.textContent || "").length >= +want;
    return el.nextSibling != null || !window.__lopeStreaming;
  }`;
h = h.replace(OLD, NEW);

let n = 0;
h = h.replace(/<script([^>]*\btype="text\/plain"[^>]*)>([\s\S]*?)<\/script>/g, (m, attrs, body) => {
  if (/\bdata-len=/.test(attrs)) return m;
  n++;
  return `<script${attrs} data-len="${body.length}">${body}</script>`;
});
writeFileSync("scratch/rmbt/export-datalen.html", h);
console.log("stamped", n, "blocks");
