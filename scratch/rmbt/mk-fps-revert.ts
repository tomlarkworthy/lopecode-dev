// Put liveStream back exactly as the module defines it. The 60fps redefine is a
// live patch: it survives the USB drop, and re-arms the crash on the next
// stream acquisition if the page never reloaded.
import { readFileSync, writeFileSync } from "node:fs";
const t = readFileSync("modules/@tomlarkworthy/coded-landmark-tracking.js", "utf8");
const start = t.indexOf("const _xdtu1n = async function _liveStream(");
const end = t.indexOf("\nconst _", start + 10);
if (start < 0 || end < 0) throw new Error("liveStream not found");
const fn = t.slice(start, end).replace(/^const _xdtu1n = /, "").replace(/;\s*$/, "");
if (/frameRate/.test(fn)) throw new Error("working copy already carries frameRate -- wrong source");
writeFileSync("scratch/rmbt/fps-revert.expr.js", `(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return "module not booted";
  mod.redefine("liveStream", ["liveOn", "liveFacing", "invalidation"], ${fn});
  return "liveStream reverted to shipped constraints (no frameRate)";
})()`);
console.log("wrote scratch/rmbt/fps-revert.expr.js");
