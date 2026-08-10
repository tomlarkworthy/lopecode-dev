// One-off: drop attachments the flat-trace notebook inherited from its parent
// and never reads. 8MB of the parent's test photographs plus a 2MB wasm blob,
// on a file meant to be opened over mobile data.
import { readFileSync, writeFileSync } from "node:fs";
const p = "lopebooks/notebooks/tomlarkworthy_flat-trace.html";
let h = readFileSync(p, "utf8");
const before = h.length;
const DROP = [/^@tomlarkworthy\/coded-landmark-tracking-data\//, /^@tomlarkworthy\/assembly-script\/binaryen-slim/];
const re = /<script id="([^"]+)"[\s\S]{0,300}?>\n[\s\S]*?\n<\/script>\n?/g;
const dropped: string[] = [];
h = h.replace(re, (m, id) => {
  if (DROP.some((r) => r.test(id))) { dropped.push(`${id} (${(m.length / 1e6).toFixed(2)}MB)`); return ""; }
  return m;
});
writeFileSync(p, h);
console.log(dropped.join("\n"));
console.log(`${dropped.length} blocks dropped; ${(before / 1e6).toFixed(2)}MB -> ${(h.length / 1e6).toFixed(2)}MB`);
