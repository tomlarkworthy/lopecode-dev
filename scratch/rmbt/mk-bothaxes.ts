// Force bothAxes on/off by overriding hexRigOpts, rather than driving a form
// whose checkboxes carry no labels. Reversible: --off restores the cell to the
// module's own source so the form is back in charge.
import { readFileSync, writeFileSync } from "node:fs";
const t = readFileSync("modules/@tomlarkworthy/coded-landmark-tracking.js", "utf8");
const s = t.indexOf("const _1lt19nm = function _hexRigOpts(");
const e = t.indexOf("\nconst _", s + 10);
if (s < 0 || e < 0) throw new Error("hexRigOpts not found");
const fn = t.slice(s, e).replace(/^const _1lt19nm = /, "").replace(/;\s*$/, "");
const wrap = (body: string) => `(() => {
  const rt = window.__ojs_runtime || (window.lopecode && window.lopecode.runtime);
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  if (!mod) return "module not booted";
  ${body}
  return "hexRigOpts redefined";
})()`;
writeFileSync("scratch/rmbt/bothaxes-on.expr.js", wrap(
  `const base = ${fn};
  mod.redefine("hexRigOpts", ["hexRigCfg", "manLayout"], (cfg, L) => ({ ...base(cfg, L), bothAxes: true }));`));
writeFileSync("scratch/rmbt/bothaxes-off.expr.js", wrap(
  `mod.redefine("hexRigOpts", ["hexRigCfg", "manLayout"], ${fn});`));
console.log("wrote bothaxes-on.expr.js and bothaxes-off.expr.js");
