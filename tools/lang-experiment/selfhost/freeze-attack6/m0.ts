// m0: the minimal form of each cause found (P through an action, P through memo), as reported in RESULTS.md
import { C } from "../freeze-attack3/harness.ts";
export const cands = [
  C("m0-P-action", "const s = () => state<() => number>(() => -1);\nconst put = (s: State<() => number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); xs.push(1); }) });\nconst v = (s: () => number) => s;",
    { drive: async (p: any) => { try { p.value("put").go(); } catch (e) { return `go() threw ${(e as Error).message}`; } await p.settle(400); const n = p.value("v")(); return `${n !== 1 ? "DIFF" : "same"} written when f() was 1; v's f() is ${n}`; } }),
  C("m0-P-memo", "const sq = () => memo((o: { readonly n: number }) => o);\nconst a = (sq: (o: { readonly n: number }) => { readonly n: number }) => { const xs = [0]; const c: readonly number[] = xs; const r = { n: 1, f: () => c.length }; sq(r); const before = r.f(); xs.push(1); return [before, r.f()] as const; };",
    { drive: async (p: any) => { const a = p.value("a"); if (!a) return "a has no value"; return `${a[0] !== a[1] ? "DIFF" : "same"} r.f() after the memo took r: ${a[0]}, after the write: ${a[1]}`; } }),
];
