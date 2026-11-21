// Does wrapping the table in a named record make a call cheap? f(t) with t: Table = { nodes: FNode[] }, 4 calls; and an
// interface. Run: bun selfhost/flat-ast/probe-wrapper-cost.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../lite/core.ts";
const types = readFileSync(join(import.meta.dir, "ast-a.ss.ts"), "utf8");
const time = (src: string) => { const ms: number[] = []; let r = checkSources({ cells: src, tsx: false }); for (let i = 0; i < 5; i++) { const t0 = performance.now(); r = checkSources({ cells: src, tsx: false }); ms.push(performance.now() - t0); } if (!r.ok) console.log(JSON.stringify(r.cells.at(-1))); return ms.toSorted((a, b) => a - b)[2]!; };
for (const [label, decl] of [["type Table = { nodes: FNode[] }", "export type Table = { nodes: FNode[] };"], ["interface Table { nodes: FNode[] }", "export interface Table { nodes: FNode[] }"]]) {
  const f = `\n${decl}\nexport const f = () => (t: Table): number => t.nodes.length;`;
  const base = time(types + f), w = time(types + f + `\nexport const g = (f) => (t: Table): number => f(t) + f(t) + f(t) + f(t);`);
  console.log(`${label}: ${((w - base) / 4).toFixed(2)} ms per call`);
}
