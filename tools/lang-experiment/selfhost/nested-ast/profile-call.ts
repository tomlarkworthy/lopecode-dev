// One checkSources of the nested types + one helper + one cell that calls it once with an AstNode parameter, for the
// CPU profile. Run: bun --cpu-prof-md --cpu-prof-dir=out/prof profile-call.ts [copy=orig] [case=param|guard]
import { readFileSync } from "node:fs";
import { join } from "node:path";
const copy = process.argv[2] ?? "orig", kase = process.argv[3] ?? "param";
const { checkSources } = await import(`./${copy}/lite/core.ts`);
const types = readFileSync(join(import.meta.dir, "ast-n.ss.ts"), "utf8");
const CASES: Record<string, string> = {
  param: `export const g = (h) => (n: AstNode): number => h(n) + h(n) + h(n) + h(n);`,
  guard: `export const g = (h) => (n: VariableDeclarator): number => { const x = n.init; return x !== null ? h(x) : 0; };`,
  nocall: `export const g = () => (n: AstNode): number => n.start;`,
};
const cell = CASES[kase]!;
const src = types + `\nexport const h = () => (n: AstNode): number => n.start;\n` + cell;
const t0 = performance.now();
const r = checkSources({ cells: src, tsx: false });
console.log(`${copy} ${kase}: ${(performance.now() - t0).toFixed(0)} ms ok=${r.ok}`);
