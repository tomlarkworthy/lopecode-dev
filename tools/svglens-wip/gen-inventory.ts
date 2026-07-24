import * as acorn from "acorn";
import * as acornWalk from "acorn-walk";
import { readFileSync } from "node:fs";
import { importNotebookModule } from "../notebook-import.ts";

const SRC = "modules/@tomlarkworthy/svg-lens.js";
const code = readFileSync(SRC, "utf8");

// Extract cells keyed by CONST name (the $def holder, e.g. `_sl20`), keeping the function source.
const prog = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module", allowReturnOutsideFunction: true });
const allCells: any[] = [];
const srcOf = new Map<string, string>();     // constName -> function source
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
for (const r of rows) met.set(r.name, r);     // r.name === constName now

// spine order from $def
const defs = [...code.matchAll(/\$def\("(sl[0-9a-z]+)",\s*"([^"]+)",\s*\[([^\]]*)\],\s*(_[A-Za-z0-9]+)\)/g)]
  .map((mm) => ({ pid: mm[1], name: mm[2], deps: mm[3].replace(/"/g, ""), holder: mm[4] }));

const out: string[] = [];
out.push("# svg-lens cell inventory\n");
out.push("Working document for the consistency/refactoring phase (architecture §9). One task per cell:");
out.push("inventory **what it does for the user** and **how it does it** (implementation). LOC/CC are");
out.push("pre-filled from the canonical `code-metrics` pipeline. The overlap pass at the end feeds the");
out.push("dedupe/refactor work, ranked by lines-of-code impact.\n");
out.push("`user` = the user-facing job (`—` if purely internal) · `how` = implementation approach. Fill");
out.push("`user` and `how` per row as it is inventoried; tick ☑ when done.\n");
out.push(`${defs.length} registered cells.\n`);

let rowsN = 0, tableOpen = false;
const openTable = () => { out.push("\n| done | cell | user | how | LOC | CC |"); out.push("|---|---|---|---|---|---|"); tableOpen = true; };
for (const d of defs) {
  const src = srcOf.get(d.holder) || "";
  const r = met.get(d.holder) || { loc: "?", cyclomatic: "?" };
  const hMatch = src.match(/md`(#{2,3})\s+([^\n`]+)/);         // ## / ### markdown header cell
  const secMatch = src.match(/\bsec\("([^"]+)"\)/);            // numbered paper section header
  if (hMatch) { out.push(`\n### ${hMatch[2].trim()}  ·  \`${d.name}\` (${hMatch[1].length === 2 ? "H2" : "H3"})`); tableOpen = false; continue; }
  if (secMatch && src.length < 120) { out.push(`\n### §${secMatch[1]}  ·  \`${d.name}\` (paper section)`); tableOpen = false; continue; }
  if (!tableOpen) openTable();
  const isTest = /^test_/.test(d.name) ? "test · " : "";
  const isProse = /return\s*\(?\s*md`/.test(src) ? "prose · " : "";
  out.push(`| ☐ | \`${d.name}\` | ${isTest}${isProse} | | ${r.loc} | ${r.cyclomatic} |`);
  rowsN++;
}

out.push("\n\n## Overlap analysis  ·  do after every row above is filled\n");
out.push("- [ ] **Cross-reference the inventory for overlaps.** Group filled `user` values by the job they");
out.push("  name; a job on two rows is a duplication candidate (the seed case: `inspector` and `fieldPanel`");
out.push("  both under “set paint”). Produce a ranked list of overlaps.");
out.push("- [ ] **Rank overlaps by LOC impact** — sum the LOC of the cells that would collapse into one, so");
out.push("  dedupe is ordered by lines removed, not by how obvious the overlap was.");
out.push("- [ ] **Dedupe/refactor the top overlaps**, each gated by the 59 laws staying green.");
out.push("\n### Seed tasks (already identified, architecture §9)\n");
out.push("- [ ] **Fill consolidation.** `inspector` (raw `setAttr`, style-unaware) and `fieldPanel`");
out.push("  (`setField` → `setProperty`, style-aware) both set fill/stroke and disagree. Pick one paint");
out.push("  surface + one write path. LOC in scope: `inspector` + `fieldPanel` (see rows).");

const doc = out.join("\n") + `\n\n<!-- ${rowsN} cell rows over ${defs.length} registered -->\n`;
console.log(doc);
