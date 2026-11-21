// A local helper that closes over the table and takes an index: does calling it cost the union check? 8 calls, against
// the same cell with none. Run: bun selfhost/flat-ast/probe-local-helper-cost.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../lite/core.ts";
const types = readFileSync(join(import.meta.dir, "ast-a.ss.ts"), "utf8");
const time = (src: string) => { const ms: number[] = []; let r = checkSources({ cells: src, tsx: false }); for (let i = 0; i < 5; i++) { const t0 = performance.now(); r = checkSources({ cells: src, tsx: false }); ms.push(performance.now() - t0); } if (!r.ok) console.log(JSON.stringify(r.cells.at(-1))); return ms.toSorted((a, b) => a - b)[2]!; };
const cell = (calls: string) => `\nexport const g = () => (nodes: FNode[]): number => {\n  const startOf = (i: number): number => { const n = nodes[i]; return n ? n.start : 0; };\n  return ${calls};\n};`;
const base = time(types + cell("0")), eight = time(types + cell(Array.from({ length: 8 }, (_, j) => `startOf(${j})`).join(" + ")));
console.log(`local helper over the closed-over table: ${((eight - base) / 8).toFixed(2)} ms per call (base ${base.toFixed(1)} ms)`);
// the table as a cell (from an outside cell), helper cells taking it as an input and an index as the argument
{
  const timeO = (src: string) => { const ms: number[] = []; let r = checkSources({ cells: src, tsx: false, outside: [{ name: "flatParse" }] }); for (let i = 0; i < 5; i++) { const t0 = performance.now(); r = checkSources({ cells: src, tsx: false, outside: [{ name: "flatParse" }] }); ms.push(performance.now() - t0); } if (!r.ok) console.log(JSON.stringify(r.cells.filter((c) => c.status !== "ok"))); return ms.toSorted((a, b) => a - b)[2]!; };
  const cells = (calls: string) => `\nexport const tree = (flatParse: Parse): FNode[] => (flatParse.ok ? flatParse.ast.nodes : []);\nexport const startOf = (tree) => (i: number): number => { const n = tree[i]; return n ? n.start : 0; };\nexport const g = (startOf) => (): number => ${calls};`;
  const base = timeO(types + cells("0")), eight = timeO(types + cells(Array.from({ length: 8 }, (_, j) => `startOf(${j})`).join(" + ")));
  console.log(`table as a cell input, helper cell called with an index: ${((eight - base) / 8).toFixed(2)} ms per call (base ${base.toFixed(1)} ms)`);
}
