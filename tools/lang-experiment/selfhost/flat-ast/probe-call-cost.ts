// What a call passing the table costs the checker: a cell that calls a dependency taking FNode[] k times, for k = 0,1,2,4,8;
// a dependency taking FNode (one row); and the same with a 2-member union. Median of 5 checkSources runs of the whole source.
// Run: bun selfhost/flat-ast/probe-call-cost.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkSources } from "../../lite/core.ts";
const types = readFileSync(join(import.meta.dir, "ast-a.ss.ts"), "utf8");
const small = `export type FNode = { type: "A"; start: number; parent: number } | { type: "B"; start: number; parent: number };`;
const time = (src: string) => { const ms: number[] = []; let r = checkSources({ cells: src, tsx: false }); for (let i = 0; i < 5; i++) { const t0 = performance.now(); r = checkSources({ cells: src, tsx: false }); ms.push(performance.now() - t0); } return { ms: ms.toSorted((a, b) => a - b)[2]!, ok: r.ok }; };
for (const [label, ty] of [["121-member FNode", types], ["2-member FNode", small]] as const) {
  const base = time(ty + `\nexport const f = () => (nodes: FNode[], i: number): number => i;`).ms;
  console.log(`${label}: types + one cell f: ${base.toFixed(1)} ms`);
  for (const k of [0, 1, 2, 4, 8]) {
    const calls = Array.from({ length: k }, (_, j) => `f(nodes, ${j})`).join(" + ") || "0";
    const t = time(ty + `\nexport const f = () => (nodes: FNode[], i: number): number => i;\nexport const g = (f) => (nodes: FNode[]): number => ${calls};`);
    console.log(`  g calls f(nodes, j) ${k} times: ${(t.ms - base).toFixed(1)} ms over the base, ok=${t.ok}`);
  }
  for (const k of [1, 4]) {
    const calls = Array.from({ length: k }, () => `h(n)`).join(" + ");
    const t = time(ty + `\nexport const h = () => (n: FNode): number => n.start;\nexport const g = (h) => (nodes: FNode[]): number => { const n = nodes[0]; return n ? ${calls} : 0; };`);
    const b2 = time(ty + `\nexport const h = () => (n: FNode): number => n.start;`).ms;
    console.log(`  g calls h(row) ${k} times: ${(t.ms - b2).toFixed(1)} ms over its base, ok=${t.ok}`);
  }
  const noDep = time(ty + `\nexport const f = () => (nodes: FNode[], i: number): number => i;\nexport const g = (f) => (n: number): number => n;`);
  console.log(`  g takes f, never calls it: ${(noDep.ms - base).toFixed(1)} ms over the base`);
}
// where the cost sits: a narrowed row (one member) passed to (n: FNode), and a row passed to (n: Identifier) after narrowing
{
  const time2 = (cells: string) => { const b = time(types + `\nexport const h = () => (n: FNode): number => n.start;\nexport const hi = () => (n: Identifier): number => n.start;`).ms; return time(types + `\nexport const h = () => (n: FNode): number => n.start;\nexport const hi = () => (n: Identifier): number => n.start;\n` + cells).ms - b; };
  console.log(`121-member FNode, 4 calls each:`);
  console.log(`  h(row), row: FNode                    ${(time2(`export const g = (h) => (nodes: FNode[]): number => { const n = nodes[0]; return n ? h(n) + h(n) + h(n) + h(n) : 0; };`) / 4).toFixed(2)} ms per call`);
  console.log(`  h(row), row narrowed to Identifier    ${(time2(`export const g = (h) => (nodes: FNode[]): number => { const n = nodes[0]; return n && n.type === "Identifier" ? h(n) + h(n) + h(n) + h(n) : 0; };`) / 4).toFixed(2)} ms per call`);
  console.log(`  hi(row), row narrowed to Identifier   ${(time2(`export const g = (hi) => (nodes: FNode[]): number => { const n = nodes[0]; return n && n.type === "Identifier" ? hi(n) + hi(n) + hi(n) + hi(n) : 0; };`) / 4).toFixed(2)} ms per call`);
  console.log(`  no call: n.start read 4 times         ${(time2(`export const g = () => (nodes: FNode[]): number => { const n = nodes[0]; return n ? n.start + n.start + n.start + n.start : 0; };`) / 4).toFixed(2)} ms per read`);
}
