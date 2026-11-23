// n7: the last inference routes (a helper's result bound, await, spread into as const, nested destructuring) and the
// consumer-side facet: an unannotated cell input takes the producer's inferred type with the Mut in a function's
// result, so the consumer writes a value the producer's function keeps.
import { C, W } from "../freeze-attack3/harness.ts";
const RET = (s: string, w: string, r: string) => `const a = () => { ${s} return () => { ${w} return ${r}; }; };`;
const T = "const xs = [0]; const t = [xs] as const; ";
export const cands = [
  C("n7-helper-result-bound", RET("const xs = [0]; const g = () => [xs] as const; const t = g();", "t[0].push(1);", "t[0].length")),
  C("n7-helper-result-rec", RET("const xs = [0]; const g = () => ({ k: xs }) as const; const t = g();", "t.k.push(1);", "t.k.length")),
  C("n7-await-resolve", "const a = async () => { const xs = [0]; const t = await Promise.resolve([xs] as const); return () => { t[0].push(1); return t[0].length; }; };"),
  C("n7-spread-as-const", RET("const xs = [0]; const t = [...[xs]] as const;", "t[0]?.push(1);", "(t[0]?.length ?? -1)")),
  C("n7-nested-destr", RET("const xs = [0]; const [u] = [[xs] as const] as const; const t = u;", "t[0].push(1);", "t[0].length")),
  C("n7-param-tuple", "const a = () => { const mk = (xs: Mut<number[]>) => { const t = [xs] as const; return () => { t[0].push(1); return t[0].length; }; }; return mk([0]); };"),
  C("n7-param-ternary", "const a = () => { const mk = (xs: Mut<number[]>) => { const t = xs.length > -1 ? xs : null; return () => { if (t) t.push(1); return t ? t.length : -1; }; }; return mk([0]); };"),
  // consumer-side: two-cell, a third cell holds the reader
  C("n7-c-unann-writer-reader", "const a = () => { " + T + "return { get: () => t[0], n: () => t[0].length }; };\nconst w = (a) => { a.get().push(1); return 0; };\nconst r = (a: { n: () => number }) => () => a.n();", { twice: ["r"] }),
  C("n7-c-unann-two-hops", "const a = () => { " + T + "return () => t[0]; };\nconst b = (a) => a;\nconst c = (b) => { b().push(1); return 0; };\nconst r = (a: () => readonly number[]) => () => a().length;"),
  C("n7-c-unann-ternary", "const a = () => { const xs = [0]; const t = xs.length > 0 ? xs : null; return () => t; };\nconst c = (a) => { const r = a(); if (r) r.push(1); return 0; };\nconst r = (a: () => readonly number[] | null) => () => a()?.length ?? -1;"),
  C("n7-c-unann-rec-field", "const a = () => { const xs = [0]; const t = { k: xs } as const; return { get: () => t.k }; };\nconst c = (a) => { a.get().push(1); return 0; };"),
  C("n7-c-unann-map", "const a = () => { const m = new Map<string, number>(); const t = [m] as const; return () => t[0]; };\nconst c = (a) => { a().set(\"k\", 1); return 0; };\nconst r = (a: () => ReadonlyMap<string, number>) => () => a().size;"),
  C("n7-c-unann-async-writer", "const a = () => { " + T + "return () => t[0]; };\nconst c = async (a) => { " + W + "a().push(1); return 0; };\nconst r = (a: () => readonly number[]) => () => a().length;"),
];
