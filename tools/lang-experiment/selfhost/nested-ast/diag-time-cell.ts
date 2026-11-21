const D = "/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment/selfhost/nested-ast/";
const { checkSources } = await import(D + "recfix/lite/core.ts");
const { Registry } = await import(D + "recfix/lite/registry.ts");
const { Checker } = await import(D + "recfix/lite/infer.ts");
import { readFileSync } from "node:fs";
const types = readFileSync(D + "ast-n.ss.ts", "utf8");
const cells = process.argv[2] ?? "";
const fns = ["sub", "expand", "unify", "convert", "member", "callSigs", "iterElem"];
const tm: Record<string, [number, number]> = {};
for (const f of fns) { const o = (Registry.prototype as any)[f]; if (typeof o !== "function") continue; let d = 0; (Registry.prototype as any)[f] = function (...a: any[]) { if (d++) { try { return o.apply(this, a); } finally { d--; } } const t0 = performance.now(); try { return o.apply(this, a); } finally { d--; const e = (tm[f] ??= [0, 0]); e[0]++; e[1] += performance.now() - t0; } }; }
for (const f of ["hidden", "hides", "narrow", "expect", "call", "fnExpr", "infer", "check"]) { const o = (Checker.prototype as any)[f]; if (typeof o !== "function") continue; let d = 0; (Checker.prototype as any)[f] = function (...a: any[]) { if (d++) { try { return o.apply(this, a); } finally { d--; } } const t0 = performance.now(); try { return o.apply(this, a); } finally { d--; const e = (tm["C." + f] ??= [0, 0]); e[0]++; e[1] += performance.now() - t0; } }; }
const src = types + "\n" + readFileSync(D + "visit-n.ss.ts", "utf8").split("\n").filter((l, i, a) => true).join("\n");
const t0 = performance.now();
checkSources({ cells: types + "\n" + cells, tsx: false });
console.log((performance.now() - t0).toFixed(0), "ms", JSON.stringify(Object.fromEntries(Object.entries(tm).map(([k, [n, ms]]) => [k, `${n} calls ${ms.toFixed(0)} ms`]))));
