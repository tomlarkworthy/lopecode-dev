// Ask for 60fps the way the notebook would ship it: once, inside getUserMedia,
// on a fresh acquisition. Redefining the liveStream cell re-runs it and lets
// invalidation stop the old track first -- one clean acquire/release, not the
// applyConstraints cycling that knocked the phone off USB twice.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "modules/@tomlarkworthy/coded-landmark-tracking.js";
const t = readFileSync(SRC, "utf8");

const start = t.indexOf("const _xdtu1n = async function _liveStream(");
if (start < 0) throw new Error("liveStream not found");
const end = t.indexOf("\nconst _", start + 10);
if (end < 0) throw new Error("end of liveStream not found");
let fn = t.slice(start, end).replace(/^const _xdtu1n = /, "").replace(/;\s*$/, "");

const NEEDLE = "        facingMode: liveFacing\n";
if (!fn.includes(NEEDLE)) throw new Error("facingMode line not found -- cell changed shape");
fn = fn.replace(NEEDLE, "        facingMode: liveFacing,\n        frameRate: { ideal: 60 }\n");

const expr = `(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return "module not booted";
  mod.redefine("liveStream", ["liveOn", "liveFacing", "invalidation"], ${fn});
  return "liveStream redefined with frameRate ideal 60";
})()`;

writeFileSync("scratch/rmbt/fps60.expr.js", expr);
console.log(`wrote scratch/rmbt/fps60.expr.js (${expr.length} chars)`);
