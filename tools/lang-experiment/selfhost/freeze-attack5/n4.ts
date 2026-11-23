// n4: the 2026-11-23 rule that a fresh local under a plain annotation from the allowlist is writable (S4.1), at the
// edges where the exclusions keyed on Mut might not see it: destructuring, let, parameters with defaults, records of
// the allowlist shapes, typed arrays, Record, WeakMap, aliases of an allowlisted shape, a local of a nested function.
import { C, W } from "../freeze-attack3/harness.ts";
const k = (n: string, decl: string, w: string, r: string) => [
  C(`n4-${n}-ret`, `const a = () => { ${decl} return () => { ${w} return ${r}; }; };`),
  C(`n4-${n}-two`, `const a = () => { ${decl} return { w: () => { ${w} return 0; }, r: () => ${r} }; };`),
  C(`n4-${n}-readalias`, `const a = () => { ${decl} const f = () => ${r}; ${w} return f; };`),
  C(`n4-${n}-async-late`, `const a = async () => { ${decl} const f = () => ${r}; const h = async () => { ${W}${w} }; h(); return f; };`),
];
export const cands = [
  ...k("arr", "const out: number[] = [0];", "out.push(1);", "out.length"),
  ...k("arr-generic", "const out: Array<number> = [0];", "out.push(1);", "out.length"),
  ...k("tuple", "const out: [number, number] = [0, 0];", "out[0]++;", "out[0]"),
  ...k("tuple-arr", "const out: [number[], number] = [[0], 0];", "out[1]++;", "out[1]"),
  ...k("rec", "const out: { n: number } = { n: 0 };", "out.n++;", "out.n"),
  ...k("rec-nested", "const out: { o: { n: number } } = { o: { n: 0 } };", "out.o = { n: out.o.n + 1 };", "out.o.n"),
  ...k("map", "const out: Map<string, number> = new Map();", "out.set(String(out.size), 1);", "out.size"),
  ...k("set", "const out: Set<number> = new Set();", "out.add(out.size);", "out.size"),
  ...k("record", "const out: Record<string, number> = {};", "out[String(Object.keys(out).length)] = 1;", "Object.keys(out).length"),
  ...k("u8", "const out: Uint8Array = new Uint8Array(2);", "out[0] = (out[0] ?? 0) + 1;", "(out[0] ?? -1)"),
  ...k("destr-arr", "const [out]: number[][] = [[0]];", "if (out) out.push(1);", "(out ? out.length : -1)"),
  ...k("destr-obj", "const { out }: { out: number[] } = { out: [0] };", "out.push(1);", "out.length"),
  ...k("let-arr", "let out: number[] = [0]; out = [0];", "out.push(1);", "out.length"),
  ...k("snapshot", "const src: readonly number[] = [0]; const out: number[] = snapshot(src);", "out.push(1);", "out.length"),
  ...k("struct-clone", "const out: number[] = structuredClone([0]);", "out.push(1);", "out.length"),
  ...k("from", "const out: number[] = Array.from([0]);", "out.push(1);", "out.length"),
  ...k("slice-of-plain", "const src: readonly number[] = [0]; const out: number[] = src.slice();", "out.push(1);", "out.length"),
  ...k("alias-of-ann", "const out: number[] = [0]; const c: readonly number[] = out;", "out.push(1);", "c.length"),
  // a parameter whose default is fresh, annotated plain: is it writable, and does R-K see it as Mut?
  C("n4-param-default-plain", "const a = () => { const mk = (out: number[] = [0]) => () => { out.push(1); return out.length; }; return mk(); };"),
  C("n4-param-default-plain-read", "const a = () => { const mk = (out: number[] = [0]) => { out.push(1); return () => out.length; }; return mk(); };"),
  // a nested function's own annotated local, kept by that function's own returned closure
  C("n4-nested-local", "const a = () => { const mk = () => { const out: number[] = [0]; return () => { out.push(1); return out.length; }; }; return mk(); };"),
  C("n4-nested-local-tuple", "const a = () => { const mk = () => { const out: number[] = [0]; const t = [out] as const; return () => { t[0].push(1); return t[0].length; }; }; return mk(); };"),
  C("n4-ann-in-tuple", "const a = () => { const out: number[] = [0]; const t = [out, 1] as const; return () => { t[0].push(1); return t[0].length; }; };"),
  C("n4-ann-map-in-tuple", "const a = () => { const m: Map<string, number> = new Map(); const t = [m] as const; return () => { t[0].set(String(t[0].size), 1); return t[0].size; }; };"),
  C("n4-ann-in-ternary", "const a = () => { const out: number[] = [0]; const t = out.length > 0 ? out : null; return () => { if (t) t.push(1); return t ? t.length : -1; }; };"),
  C("n4-ann-in-as-const-rec", "const a = () => { const out: number[] = [0]; const t = { o: out } as const; return () => { t.o.push(1); return t.o.length; }; };"),
];
