import * as acorn from "acorn";
import * as acornWalk from "acorn-walk";
import { readFileSync, writeFileSync } from "node:fs";
import { importNotebookModule } from "../notebook-import.ts";

const SRC = "modules/@tomlarkworthy/svg-lens.js";
const code = readFileSync(SRC, "utf8");
const prog = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module", allowReturnOutsideFunction: true });
const allCells: any[] = [];
const srcOf = new Map<string, string>();
for (const stmt of (prog as any).body) {
  if (stmt.type !== "VariableDeclaration") continue;
  for (const d of stmt.declarations) {
    const init = d.init;
    if (!init || (init.type !== "FunctionExpression" && init.type !== "ArrowFunctionExpression")) continue;
    const constName = d.id?.name;
    if (!constName || constName === "define") continue;
    const def = code.slice(init.start, init.end);
    allCells.push({ variable: { _definition: def, _inputs: new Array((init.params || []).length) }, module: "svg-lens", name: constName });
    srcOf.set(constName, def);
  }
}
const m = await importNotebookModule("modules/@tomlarkworthy/code-metrics.js", { overrides: { acorn, acornWalk, allCells } });
const rows: any[] = await m.value("metricsRows");
m.dispose();
const met = new Map<string, any>();
for (const r of rows) met.set(r.name, r);

const defs = [...code.matchAll(/\$def\("(sl[0-9a-z]+)",\s*"([^"]+)",\s*\[([^\]]*)\],\s*(_[A-Za-z0-9]+)\)/g)]
  .map((mm) => ({ pid: mm[1], name: mm[2], deps: mm[3].replace(/"/g, ""), holder: mm[4] }));

const out = defs.map((d, i) => {
  const r = met.get(d.holder) || { loc: 0, cyclomatic: 0 };
  return { i, name: d.name, pid: d.pid, deps: d.deps, loc: r.loc, cc: r.cyclomatic, source: srcOf.get(d.holder) || "" };
});
writeFileSync("tools/svglens-wip/cells.json", JSON.stringify(out));
console.log(`wrote ${out.length} cells; total source ${(out.reduce((a,c)=>a+c.source.length,0)/1024).toFixed(0)}KB`);
