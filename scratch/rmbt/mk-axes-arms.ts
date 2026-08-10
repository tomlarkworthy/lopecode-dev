// Two arms of analyzeFrameManAsync that differ ONLY in sequential-vs-concurrent
// control flow. The per-dimension frame cache stays in the worker kernel for
// both, so this isolates the concurrency and not the cache that enables it.
import { readFileSync, writeFileSync } from "node:fs";
const t = readFileSync("modules/@tomlarkworthy/coded-landmark-tracking.js", "utf8");
const s = t.indexOf("const _p4hc5x = function _analyzeFrameManAsync(");
const e = t.indexOf("\nconst _", s + 10);
if (s < 0 || e < 0) throw new Error("analyzeFrameManAsync not found");
const con = t.slice(s, e).replace(/^const _p4hc5x = /, "").replace(/;\s*$/, "");

const CONCURRENT = `    const rotated = rotateFrame(frame, 1);
    const [rows, rot] = await Promise.all([
      analyzeFrameManAsync(frame, single),
      analyzeFrameManAsync(rotated, single)
    ]);`;
if (!con.includes(CONCURRENT)) throw new Error("concurrent block not found verbatim");
const seq = con.replace(CONCURRENT,
`    const rows = await analyzeFrameManAsync(frame, single);
    const rot = await analyzeFrameManAsync(rotateFrame(frame, 1), single);`);

const wrap = (fn: string, label: string) => `(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return "module not booted";
  mod.redefine("analyzeFrameManAsync",
    ["rotateFrame","mergeManAxes","manScanRows","scanRowsMan","clusterManRows"], ${fn});
  return "arm: ${label}";
})()`;
writeFileSync("scratch/rmbt/axes-seq.expr.js", wrap(seq, "SEQUENTIAL"));
writeFileSync("scratch/rmbt/axes-con.expr.js", wrap(con, "CONCURRENT"));
console.log("wrote axes-seq.expr.js / axes-con.expr.js");
