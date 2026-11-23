// bun yexp2.ts <depth>: cast<P<P<...P<number>...>>> for type P<T> = { a: T; b: T }, nested depth times, one line
import { verdictOf } from "../../lite/infer/attack/run-sets.ts";
const d = Number(process.argv[2]);
const t = "P<".repeat(d) + "number" + ">".repeat(d);
const src = `type P<T> = { readonly a: T; readonly b: T };\nconst v = () => 1;\nconst h = (v: number) => { const r = cast<${t}>(v); return r.ok ? 1 : 0; };`;
const t0 = performance.now();
const v = verdictOf(src, null, false);
console.log(`generic depth ${d}: ${v.text.slice(0, 120)} (${Math.round(performance.now() - t0)} ms)`);
process.exit(0);
