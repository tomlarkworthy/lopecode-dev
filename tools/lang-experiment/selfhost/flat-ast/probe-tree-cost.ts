// What the tree cell of visit-c costs to check: with its FNode[] return annotation, and without. Run: bun selfhost/flat-ast/probe-tree-cost.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../lite/core.ts";
const types = readFileSync(join(import.meta.dir, "ast-a.ss.ts"), "utf8");
const time = (src: string) => { const ms: number[] = []; let r = checkSources({ cells: src, tsx: false, outside: [{ name: "flatParse" }] }); for (let i = 0; i < 5; i++) { const t0 = performance.now(); r = checkSources({ cells: src, tsx: false, outside: [{ name: "flatParse" }] }); ms.push(performance.now() - t0); } return { ms: ms.toSorted((a, b) => a - b)[2]!, ok: r.ok, v: r.cells.at(-1)?.value }; };
const base = time(types + `\nexport const nodeCount = (flatParse: Parse): number => 1;`);
for (const [label, cell] of [["annotated FNode[]", `export const tree = (flatParse: Parse): FNode[] => (flatParse.ok ? flatParse.ast.nodes : []);`], ["no return annotation", `export const tree = (flatParse: Parse) => (flatParse.ok ? flatParse.ast.nodes : []);`], ["no annotation, no empty-array branch", `export const tree = (flatParse: Parse) => flatParse.ok;`]]) {
  const t = time(types + "\n" + cell);
  console.log(`${label}: ${(t.ms - base.ms).toFixed(1)} ms over a cell taking Parse and returning 1 (base ${base.ms.toFixed(1)}); ok=${t.ok}; value ${t.v?.slice(0, 40)}`);
}
