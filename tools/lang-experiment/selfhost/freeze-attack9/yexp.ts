// bun yexp.ts <depth> [cast|param|none]: a non-recursive record type that branches in two at each of depth levels;
// checker time for a cell that casts to it (cast), takes it as an annotation only (param), or neither (none)
import { verdictOf } from "../../lite/infer/attack/run-sets.ts";
const d = Number(process.argv[2]), mode = process.argv[3] ?? "cast";
const decls = Array.from({ length: d }, (_, i) => `type U${i} = { readonly a: U${i + 1}; readonly b: U${i + 1} };`).join("\n") + `\ntype U${d} = number;\n`;
const cell = mode === "cast" ? `const v = () => 1;\nconst h = (v: number) => { const r = cast<U0>(v); return r.ok ? 1 : 0; };` : mode === "param" ? `const k = () => { const f = (a: U0) => a; return typeof f; };` : `const k = () => 1;`;
const t0 = performance.now();
const v = verdictOf(decls + cell, null, false);
console.log(`depth ${d} ${mode}: ${v.text.slice(0, 120)} (${Math.round(performance.now() - t0)} ms)`);
process.exit(0);
