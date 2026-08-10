// Build a CDP expression that redefines detectPool with the chunk count behind
// a live knob, so the deal size can be swept without a reload. Source is lifted
// from the working copy rather than retyped -- a hand-copied kernel is exactly
// how a benchmark ends up measuring something other than the shipped code.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "modules/@tomlarkworthy/coded-landmark-tracking.js";
const t = readFileSync(SRC, "utf8");

const start = t.indexOf("const _l7r79y = function _detectPool(");
if (start < 0) throw new Error("detectPool not found");
const end = t.indexOf("\nconst _", start + 10);
if (end < 0) throw new Error("end of detectPool not found");
let fn = t.slice(start, end).replace(/^const _l7r79y = /, "").replace(/;\s*$/, "");

const NEEDLE = "const NC = Math.min(ys.length, ws.length * 3);";
if (!fn.includes(NEEDLE)) throw new Error("NC line not found -- module changed shape");
fn = fn.replace(
  NEEDLE,
  "const NC = Math.min(ys.length, Math.max(1, Math.round(ws.length * (window.__chunkMul ?? 3))));"
);

const expr = `(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return "module not booted";
  window.__chunkMul = window.__chunkMul ?? 3;
  mod.redefine("detectPool", ["poolSize", "detectKernelSource", "invalidation"], ${fn});
  return "detectPool redefined with chunkMul knob";
})()`;

writeFileSync("scratch/rmbt/chunkmul.expr.js", expr);
console.log(`wrote scratch/rmbt/chunkmul.expr.js (${expr.length} chars)`);
