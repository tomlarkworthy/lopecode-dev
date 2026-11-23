// n5: more inference routes for root N (operators), and channels not tried: compile islands, pools, memo across a
// worker, a generator's nested function, iterators, a held function's promise.
import { C, W } from "../freeze-attack3/harness.ts";
const RET = (s: string, w: string, r: string) => `const a = () => { ${s} return () => { ${w} return ${r}; }; };`;
const GO = (outs: string, body: string, pool = false) => `\nconst go = async (compile: Compile${pool ? ", pool: Pool" : ""}) => { const f = compile({ inputs: ["x"], refs: [], outputs: [${outs.split(",").map((s) => JSON.stringify(s)).join(", ")}]${pool ? ", options: { runtime: pool }" : ""} }); ${body} };`;
export const cands = [
  // operators that produce a value of a Mut type under a binding that is not Mut at its top
  C("n5-op-or-null", RET("const xs = [0]; const t = xs.length > 5 ? null : xs;", "if (t) t.push(1);", "(t ? t.length : -1)")),
  C("n5-op-nullish", RET("const xs = [0]; const ys: readonly number[] | null = null; const t = ys ?? xs;", "t.length;", "t.length")),
  C("n5-op-and", RET("const xs = [0]; const t = xs.length > 0 && xs;", "if (t) t.push(1);", "(t ? t.length : -1)")),
  C("n5-op-or", RET("const xs = [0]; const t = xs.length === 0 || xs;", "if (t !== true) t.push(1);", "(t !== true ? t.length : -1)")),
  C("n5-op-paren", RET("const xs = [0]; const t = (xs);", "t.push(1);", "t.length")),
  C("n5-op-comma", RET("const xs = [0]; const t = (0, xs);", "t.push(1);", "t.length")),
  C("n5-op-tern-two-muts", RET("const xs = [0]; const ys = [0]; const t = xs.length > 0 ? xs : ys;", "t.push(1);", "t.length")),
  C("n5-op-tern-mut-readonly", RET("const xs = [0]; const ys: readonly number[] = [9]; const t = xs.length > 0 ? xs : ys;", "", "t.length")),
  C("n5-op-tern-tuple-of-ann", RET("const m: Map<string, number> = new Map(); const t = m.size > -1 ? m : null;", "if (t) t.set(String(t.size), 1);", "(t ? t.size : -1)")),
  C("n5-op-tern-typed", RET("const u = new Uint8Array(2); const t = u.length > 0 ? u : null;", "if (t) t[0] = (t[0] ?? 0) + 1;", "(t ? t[0] ?? -1 : -1)")),
  C("n5-op-tern-url", RET("const u = new URL(\"https://x.test/a\"); const t = u.href.length > 0 ? u : null;", "if (t) t.pathname = t.pathname + \"b\";", "(t ? t.href : \"\")")),
  C("n5-op-tern-in-loop", "const a = () => { const fs = [0, 1].map((k) => { const xs = [k]; const t = k > -1 ? xs : null; return () => { if (t) t.push(1); return t ? t.length : -1; }; }); return fs[0] ?? (() => -1); };"),
  C("n5-op-tuple-for-of", RET("const xs = [0]; const t = [xs] as const;", "for (const y of t) y.push(1);", "t[0].length")),
  C("n5-op-tuple-destr-in-fn", RET("const xs = [0]; const t = [xs] as const;", "const [y] = t; y.push(1);", "t[0].length")),
  C("n5-op-tuple-spread-in-fn", RET("const xs = [0]; const t = [xs] as const;", "const u = [...t]; u[0]?.push(1);", "t[0].length")),
  C("n5-op-asconst-nested-rec", RET("const xs = [0]; const t = { o: { k: xs } } as const;", "t.o.k.push(1);", "t.o.k.length")),
  C("n5-op-asconst-rec-of-map", RET("const m = new Map<string, number>(); const t = { m } as const;", "t.m.set(String(t.m.size), 1);", "t.m.size")),
  C("n5-op-asconst-rec-of-set", RET("const s = new Set<number>(); const t = { s } as const;", "t.s.add(t.s.size);", "t.s.size")),
  C("n5-op-asconst-rec-of-rec", RET("const o = { n: 0 }; const t = { o } as const;", "t.o.n++;", "t.o.n")),
  C("n5-op-generic-pick", "const pick = <T,>(a: T, b: T, k: boolean) => (k ? [a] as const : [b] as const);\n" + RET("const xs = [0]; const t = pick(xs, xs, true);", "t[0].push(1);", "t[0].length")),
  // generator: a nested kept function made after the last yield? and a generator cell yielding a root-N reader
  C("n5-gen-yield-reader-only", "const a = function* () { const xs = [0]; const t = [xs] as const; yield { w: () => { t[0].push(1); return 0; }, r: () => t[0].length }; };"),
  C("n5-gen-two-yields-same-t", "const a = function* () { for (const k of [0, 1]) { const xs = [k]; const t = [xs] as const; yield () => { t[0].push(1); return t[0].length; }; } };"),
  C("n5-async-cell-returns-reader", "const a = async () => { const xs = [0]; const t = [xs] as const; " + W + "return () => { t[0].push(1); return t[0].length; }; };"),
  C("n5-held-iter", RET("const xs = [0]; const t = [xs] as const;", "t[0].push(1);", "[...t[0].values()].length")),
  // compile islands and pools: an island cell returning a root-N function
  C("n5-isl-fn-out", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; const t = [xs] as const; return () => { t[0].push(1); return t[0].length; }; };" + GO("y", "const r = await f({ x: 3 }); return r.y;")),
  C("n5-isl-pool-fn-out", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; const t = [xs] as const; return () => { t[0].push(1); return t[0].length; }; };" + GO("y", "const r = await f({ x: 3 }); return r.y;", true)),
  C("n5-isl-pool-data", "const x = () => 1;\nconst y = (x: number) => { const xs = [x]; const t = [xs] as const; return t; };" + GO("y", "const r = await f({ x: 3 }); return r.y;", true)),
  C("n5-isl-memo-in", "const x = () => 1;\nconst y = (x: number) => { const sq = memo((n: number) => [n, n]); return sq(x); };" + GO("y", "const r = await f({ x: 3 }); return r.y;", true)),
  C("n5-isl-memo-fn-out", "const x = () => 1;\nconst y = (x: number) => { const mk = memo((n: number) => { const xs = [n]; const t = [xs] as const; return () => { t[0].push(1); return t[0].length; }; }); return mk(x); };" + GO("y", "const r = await f({ x: 3 }); return r.y;")),
  // memo keyed on an object argument whose captured contents change (identity key)
  C("n5-memo-key-fn", "const g = () => { const xs = [0]; const t = [xs] as const; return { w: () => { t[0].push(1); return 0; }, r: () => t[0].length }; };\nconst m = () => memo((o: { readonly n: number }) => o.n * 2);\nconst a = (m: (o: { readonly n: number }) => number, g: { w: () => number; r: () => number }) => () => m({ n: g.r() });"),
  C("n5-memo-arg-tuple", "const a = () => { const sq = memo((xs: readonly (readonly number[])[]) => xs.length); const xs = [0]; const t = [xs] as const; const n = sq(t); return () => { t[0].push(1); return n + t[0].length; }; };"),
];
