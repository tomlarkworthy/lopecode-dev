// What one call site costs the checker on the nested union, by the form of the argument. Each case is a cell g with 4
// calls of a helper; the cost is (time with g - time without g) / 4, median of 5 checkSources runs.
// Run: bun probe-call-cost.ts [copy=orig] [types=ast-n.ss.ts]
import { readFileSync } from "node:fs";
import { join } from "node:path";
const copy = process.argv[2] ?? "orig", typesFile = process.argv[3] ?? "ast-n.ss.ts";
const { checkSources } = await import(`./${copy}/lite/core.ts`);
const types = readFileSync(join(import.meta.dir, typesFile), "utf8");
const time = (src: string) => { const ms: number[] = []; let r = checkSources({ cells: src, tsx: false }); for (let i = 0; i < 5; i++) { const t0 = performance.now(); r = checkSources({ cells: src, tsx: false }); ms.push(performance.now() - t0); } return { ms: ms.toSorted((a, b) => a - b)[2]!, r }; };
const helpers = `
export const h = () => (n: AstNode): number => n.start;
export const hn = () => (n: AstNode | null): number => (n === null ? 0 : n.start);
export const hl = () => (ns: AstNode[]): number => ns.length;
export const hi = () => (n: Identifier): number => n.start;`;
const base = time(types + helpers);
const errs = (r: any) => r.cells.filter((c: any) => c.status !== "ok").map((c: any) => `${c.name}: ${[...c.errors, ...c.unsupported].map((e: any) => e.msg).join("; ").slice(0, 200)}`);
if (errs(base.r).length) console.log("base not ok:", errs(base.r));
console.log(`${copy}, ${typesFile}: types + helpers ${base.ms.toFixed(1)} ms`);
const cases: [string, string][] = [
  ["h(n), n: AstNode parameter passed on", `export const g = (h) => (n: AstNode): number => h(n) + h(n) + h(n) + h(n);`],
  ["h(n.object), a field read of a narrowed node", `export const g = (h) => (n: MemberExpression): number => h(n.object) + h(n.object) + h(n.object) + h(n.object);`],
  ["h(x), x: AstNode | null after x !== null", `export const g = (h) => (n: VariableDeclarator): number => { const x = n.init; return x !== null ? h(x) + h(x) + h(x) + h(x) : 0; };`],
  ["hn(n.init), AstNode | null to AstNode | null", `export const g = (hn) => (n: VariableDeclarator): number => hn(n.init) + hn(n.init) + hn(n.init) + hn(n.init);`],
  ["h(n) after n.type !== \"Identifier\" (exclusion)", `export const g = (h) => (n: AstNode): number => n.type !== "Identifier" ? h(n) + h(n) + h(n) + h(n) : 0;`],
  ["hi(n) after n.type === \"Identifier\"", `export const g = (hi) => (n: AstNode): number => n.type === "Identifier" ? hi(n) + hi(n) + hi(n) + hi(n) : 0;`],
  ["h(n) after n.type === \"Identifier\" (member to union)", `export const g = (h) => (n: AstNode): number => n.type === "Identifier" ? h(n) + h(n) + h(n) + h(n) : 0;`],
  ["hl(n.params), AstNode[] to AstNode[]", `export const g = (hl) => (n: ArrowFunctionExpression): number => hl(n.params) + hl(n.params) + hl(n.params) + hl(n.params);`],
  ["annotated return : AstNode of n.object (x4 cells)", `export const g = () => (n: MemberExpression): AstNode => n.object;\nexport const g2 = () => (n: MemberExpression): AstNode => n.object;\nexport const g3 = () => (n: MemberExpression): AstNode => n.object;\nexport const g4 = () => (n: MemberExpression): AstNode => n.object;`],
  ["no call: n.start read 4 times", `export const g = () => (n: AstNode): number => n.start + n.start + n.start + n.start;`],
];
for (const [label, cell] of cases) {
  const t = time(types + helpers + "\n" + cell);
  const e = errs(t.r);
  console.log(`  ${label.padEnd(52)} ${((t.ms - base.ms) / 4).toFixed(2)} ms per call${e.length ? `  NOT OK ${e.join(" | ")}` : ""}`);
}
