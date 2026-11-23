// a7: the depth limits of S5.8 (12 generic-alias expansions on one path, 200 levels) and rebinding past them
import { C } from "../freeze-attack3/harness.ts";
const out: ReturnType<typeof C>[] = [];
const add = (n: string, s: string, x: any = {}) => out.push(C(`a7-${n}`, s, x));
const B = "type B<T> = { readonly v: T };\n";
const nest = (k: number, inner: string) => { let t = inner; for (let i = 0; i < k; i++) t = `B<${t}>`; return t; };
const val = (k: number, inner: string) => { let t = inner; for (let i = 0; i < k; i++) t = `{ v: ${t} }`; return t; };
const box = (k: number, inner: string) => { let t = inner; for (let i = 0; i < k; i++) t = `box(${t})`; return t; };
const callAll = { drive: async (p: any) => { const v = p.value("a"); if (typeof v !== "function") return "no fn"; const r1 = JSON.stringify(v()); const r2 = JSON.stringify(v()); return `${r1 !== r2 ? "DIFF" : "same"} ${r1} then ${r2}`; } };
for (const k of [11, 12, 13]) {
  // a written type with no Mut, deep generic aliases: captured by a kept function
  add(`written-plain-${k}`, B + `const a = () => { const t: ${nest(k, "readonly number[]")} = ${val(k, "[1]")}; return () => 1; };`);
  add(`written-plain-captured-${k}`, B + `const a = () => { const t: ${nest(k, "readonly number[]")} = ${val(k, "[1]")}; return () => (t ? 1 : 0); };`);
  // an inferred holder through k generic helper calls: the capture must be rejected
  add(`inferred-box-${k}`, `const a = () => { const box = <T,>(v: T) => ({ v }); const xs = [0]; const t = ${box(k, "xs")}; return () => (t ? 1 : 0); };`, callAll);
  // rebinding under a written type past the limit (S5.8: does not clear)
  add(`rebind-${k}`, B + `const a = () => { const box = <T,>(v: T): B<T> => ({ v }); const xs = [0]; const t = ${box(k, "xs")}; const c: ${nest(k, "readonly number[]")} = t; return () => (c ? 1 : 0); };`);
}
// levels: as const tuples nested 199 / 201 deep around a Mut local
for (const k of [5, 199, 201]) {
  let e = "xs"; for (let i = 0; i < k; i++) e = `[${e}]`;
  add(`levels-${k}`, `const a = () => { const xs = [0]; const t = ${e} as const; return () => (t ? 1 : 0); };`);
}
// a non-generic recursive alias (expands forever without generic arguments)
add("recursive-alias", "type L = { readonly v: number; readonly next: L | null };\nconst a = () => { const t: L = { v: 1, next: { v: 2, next: null } }; return () => t.v; };");
add("recursive-alias-mut-inside", "type L = { readonly v: readonly number[]; readonly next: L | null };\nconst a = () => { const xs = [0]; const t = { v: xs, next: null } as const; const u: L = t; return () => u.v.length; };");
export const cands = out;
