// Live-patch the two cells the parallel-axes change touches, so the phone can be
// A/B'd without a commit, a Pages deploy and a reload. Source is lifted from the
// working copy so the measured code is the code that would ship.
import { readFileSync, writeFileSync } from "node:fs";
const t = readFileSync("modules/@tomlarkworthy/coded-landmark-tracking.js", "utf8");
const grab = (decl: string) => {
  const s = t.indexOf(decl);
  if (s < 0) throw new Error("not found: " + decl);
  const e = t.indexOf("\nconst _", s + 10);
  if (e < 0) throw new Error("no end for " + decl);
  return t.slice(s, e).replace(/^const _[A-Za-z0-9]+ = /, "").replace(/;\s*$/, "");
};
const kernel = grab("const _13ae255 = function _detectKernelSource(");
const async_ = grab("const _p4hc5x = function _analyzeFrameManAsync(");
if (!/FRAMES = new Map\(\)/.test(kernel)) throw new Error("kernel lacks the per-dimension frame cache");
if (!/Promise\.all/.test(async_)) throw new Error("analyzeFrameManAsync lacks the concurrent branch");

const expr = `(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return "module not booted";
  // Kernel first: redefining it rebuilds detectPool, which terminates the old
  // workers. analyzeFrameManAsync is independent of that teardown.
  mod.redefine("detectKernelSource",
    ["manLayout","edges1Dsub","findInvolution","solveMan","manRowGroups","detectRowMan","scanRowsMan","wasmOn","wasmKernelBytes","makeWasmDetectRow"],
    ${kernel});
  mod.redefine("analyzeFrameManAsync",
    ["rotateFrame","mergeManAxes","manScanRows","scanRowsMan","clusterManRows"],
    ${async_});
  return "patched: per-dimension frame cache + concurrent axes";
})()`;
writeFileSync("scratch/rmbt/parallel-axes.expr.js", expr);
console.log(`wrote scratch/rmbt/parallel-axes.expr.js (${expr.length} chars)`);
