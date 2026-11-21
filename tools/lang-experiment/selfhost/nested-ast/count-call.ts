// Calls into the type walks for one checkSources of a probe case (profile-call.ts cases), on a checker copy:
// Registry.expand, Registry.sub (top-level calls), Checker.hidden, and the time inside each top-level sub call.
// Run: bun count-call.ts [copy=orig] [case=nocall|param|guard]
import { readFileSync } from "node:fs";
import { join } from "node:path";
const copy = process.argv[2] ?? "orig", kase = process.argv[3] ?? "nocall";
const { checkSources } = await import(`./${copy}/lite/core.ts`);
const { Registry } = await import(`./${copy}/lite/registry.ts`);
const { Checker } = await import(`./${copy}/lite/infer.ts`);
const n = { expand: 0, sub: 0, subMs: 0, hidden: 0, hiddenTop: 0, hiddenMs: 0 };
const ex = Registry.prototype.expand; Registry.prototype.expand = function (t: any) { n.expand++; return ex.call(this, t); };
const sb = Registry.prototype.sub; let inSub = 0;
Registry.prototype.sub = function (...a: any[]) { n.sub++; if (inSub++) { try { return sb.apply(this, a); } finally { inSub--; } } const t0 = performance.now(); try { return sb.apply(this, a); } finally { inSub--; n.subMs += performance.now() - t0; } };
const hd = Checker.prototype.hidden; let inH = 0;
Checker.prototype.hidden = function (...a: any[]) { n.hidden++; if (inH++) { try { return hd.apply(this, a); } finally { inH--; } } n.hiddenTop++; const t0 = performance.now(); try { return hd.apply(this, a); } finally { inH--; n.hiddenMs += performance.now() - t0; } };
const CASES: Record<string, string> = {
  none: ``,
  nocall: `export const g = () => (n: AstNode): number => n.start;`,
  param: `export const g = (h) => (n: AstNode): number => h(n);`,
  guard: `export const g = (h) => (n: VariableDeclarator): number => { const x = n.init; return x !== null ? h(x) : 0; };`,
};
const types = readFileSync(join(import.meta.dir, "ast-n.ss.ts"), "utf8");
const src = types + `\nexport const h = () => (n: AstNode): number => n.start;\n` + CASES[kase];
const t0 = performance.now();
const r = checkSources({ cells: src, tsx: false });
console.log(`${copy} ${kase}: ${(performance.now() - t0).toFixed(0)} ms ok=${r.ok}; expand ${n.expand}, sub ${n.sub} (top-level ${n.subMs.toFixed(0)} ms), hidden ${n.hidden} (${n.hiddenTop} top-level, ${n.hiddenMs.toFixed(0)} ms)`);
