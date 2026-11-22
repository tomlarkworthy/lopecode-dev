import type { Attack } from "./harness.ts";
const A = (name: string, src: string, show: string[] = []): Attack => ({ name, src, show });
const D = "const D = (): Promise<number> => { let p: Promise<number> = Promise.resolve(0); for (let i = 0; i < 300; i++) p = p.then(() => 0); return p; }; ";
const W = "for (let i = 0; i < 300; i++) await null; ";
const B = (t: string) => `\nconst b = (a: ${t}) => ({ v: a });`;
export const attacks: Attack[] = [
  // async callbacks of non-retaining intrinsics
  A("cb-forEach-async-typed", "const a = () => { const t = new Uint8Array(2); [0].forEach(async () => { " + W + "t[0] = 1; }); return t; };" + B("Uint8Array")),
  A("cb-map-async-typed", "const a = () => { const t = new Uint8Array(2); const ps = [0].map(async () => { " + W + "t[0] = 1; return 0; }); return t; };" + B("Uint8Array")),
  A("cb-forEach-async-error", "const a = () => { const e = new Error(\"x\"); [0].forEach(async () => { " + W + "e.message = \"y\"; }); return e; };" + B("Error")),
  A("cb-forEach-async-array", "const a = () => { const xs = [0]; [0].forEach(async () => { " + W + "xs.push(1); }); return xs; };" + B("number[]")),
  A("cb-some-async-url", "const a = () => { const u = new URL(\"https://x.test/\"); [0].some(async () => { " + W + "u.hash = \"#s\"; return true; }); return u; };" + B("URL")),
  A("cb-map-forEach-async-typed", "const a = () => { const t = new Uint8Array(2); new Map([[\"k\", 1]]).forEach(async () => { " + W + "t[0] = 2; }); return t; };" + B("Uint8Array")),
  A("cb-typed-forEach-async", "const a = () => { const t = new Uint8Array(2); t.forEach(async () => { " + W + "t[1] = 2; }); return t; };" + B("Uint8Array")),
  A("cb-array-from-async", "const a = () => { const t = new Uint8Array(2); Array.from([0], async () => { " + W + "t[0] = 3; return 0; }); return t; };" + B("Uint8Array")),
  A("cb-reduce-async", "const a = () => { const t = new Uint8Array(2); [0].reduce(async (acc: Promise<number>) => { " + W + "t[0] = 4; return 0; }, Promise.resolve(0)); return t; };" + B("Uint8Array")),
  // a kept function that starts an async helper
  A("kf-starts-async-typed", "const a = () => { const t = new Uint8Array(2); const go = async () => { " + W + "t[0] = 1; }; return { t, k: () => { go(); return 0; } }; };\nconst c = (a: { k: () => number }) => a.k();\nconst b = (a: { t: Uint8Array }) => ({ v: a.t });"),
  A("kf-starts-async-error", "const a = () => { const e = new Error(\"x\"); const go = async () => { " + W + "e.message = \"k\"; }; return { e, k: () => { go(); return 0; } }; };\nconst c = (a: { k: () => number }) => a.k();\nconst b = (a: { e: Error }) => ({ v: a.e });"),
  // F1 with Error/URL/Map/Set
  A("fo-error-helper", "const a = () => { const e = new Error(\"x\"); const h = () => e; return () => h(); };\nconst c = (a: () => Mut<Error>) => { a().message = \"y\"; return 0; };"),
  A("fo-error-alias", "const a = () => { const e = new Error(\"x\"); return (): Mut<Error> => { const r = e; return r; }; };\nconst c = (a: () => Mut<Error>) => { a().message = \"y\"; return 0; };"),
  A("fo-map-helper", "const a = () => { const m = new Map<string, number>(); const h = () => m; return () => h(); };\nconst c = (a: () => Mut<Map<string, number>>) => { a().set(\"k\", 1); return 0; };"),
  A("fo-set-alias", "const a = () => { const s = new Set<number>(); return (): Mut<Set<number>> => { const r = s; return r; }; };\nconst c = (a: () => Mut<Set<number>>) => { a().add(1); return 0; };"),
  A("fo-record-helper", "const a = () => { const o = { n: 0 }; const h = () => o; return () => h(); };\nconst c = (a: () => Mut<{ n: number }>) => { a().n = 5; return 0; };"),
  A("fo-map-get-plain", "const a = () => { const reg = new Map<string, Mut<number[]>>([[\"k\", [0]]]); return () => reg.get(\"k\"); };\nconst c = (a: () => Mut<number[]> | undefined) => { a()?.push(1); return 0; };"),
  A("fo-map-get-typed", "const a = () => { const reg = new Map<string, Mut<Uint8Array>>([[\"k\", new Uint8Array(1)]]); return () => reg.get(\"k\"); };\nconst c = (a: () => Mut<Uint8Array> | undefined) => { const t = a(); if (t) t[0] = 1; return 0; };"),
  A("fo-arr-index-typed", "const a = () => { const reg: Mut<Uint8Array>[] = [new Uint8Array(1)]; return () => reg[0]; };\nconst c = (a: () => Mut<Uint8Array> | undefined) => { const t = a(); if (t) t[0] = 1; return 0; };"),
  A("fo-arr-index-error", "const a = () => { const reg: Mut<Error>[] = [new Error(\"x\")]; return () => reg[0]; };\nconst c = (a: () => Mut<Error> | undefined) => { const t = a(); if (t) t.message = \"q\"; return 0; };"),
  A("fo-recurse", "const a = () => { const xs = [0]; const g = (n: number): Mut<number[]> => (n > 0 ? g(n - 1) : xs); return () => g(1); };\nconst c = (a: () => Mut<number[]>) => { a().push(1); return 0; };"),
  A("fo-two-level-helper", "const a = () => { const xs = [0]; const h1 = () => xs; const h2 = () => h1(); return () => h2(); };\nconst c = (a: () => Mut<number[]>) => { a().push(1); return 0; };"),
  A("fo-gen-alias-yield", "const a = function* () { const xs = [0]; const g = (): Mut<number[]> => { const r = xs; return r; }; yield g; xs.push(9); yield g; };"),
  A("fo-gen-helper-after-yield", "const a = function* () { const xs = [0]; const h = () => xs; yield 0; h().push(1); yield xs.length; };"),
  // the kept-writes-through-alias family on Map/Set in skip
  A("kw-map-alias", "const a = () => { const m = new Map<string, number>(); return { m, k: () => { const r = m; r.set(\"k\", 1); return 0; } }; };\nconst c = (a: { k: () => number }) => a.k();\nconst b = (a: { m: Map<string, number> }) => ({ v: a.m });"),
  A("kw-typed-alias", "const a = () => { const t = new Uint8Array(2); return { t, k: () => { const r = t; r[0] = 1; return 0; } }; };\nconst c = (a: { k: () => number }) => a.k();"),
  A("kw-url-alias", "const a = () => { const u = new URL(\"https://x.test/\"); return { u, k: () => { const r = u; r.hash = \"#k\"; return 0; } }; };\nconst c = (a: { k: () => number }) => a.k();"),
  A("kw-record-alias-field", "const a = () => { const o = { n: 0 }; return { o, k: () => { const r = o; r.n = 7; return 0; } }; };\nconst c = (a: { k: () => number }) => a.k();\nconst b = (a: { o: { n: number } }) => ({ v: a.o });"),
  A("kw-alias-ternary", "const a = () => { const xs = [0]; return { xs, k: () => { const r = true ? xs : []; r.push(1); return 0; } }; };\nconst c = (a: { k: () => number }) => a.k();"),
  A("kw-alias-param-of-helper", "const a = () => { const xs = [0]; const w = (p: Mut<number[]>) => p.push(1); return { xs, k: () => { const r = xs; w(r); return 0; } }; };\nconst c = (a: { k: () => number }) => a.k();"),
  A("kw-alias-inner-closure", "const a = () => { const xs = [0]; return { xs, k: () => { const r = xs; const inner = () => r.push(1); inner(); return 0; } }; };\nconst c = (a: { k: () => number }) => a.k();"),
  A("kw-alias-outside-made-inside", "const a = () => { const xs = [0]; const k = () => { const r = xs; return () => { r.push(1); return 0; }; }; return { xs, k: k() }; };\nconst c = (a: { k: () => number }) => a.k();"),
  // generators: alias writes between yields of an Error
  A("gy-error-alias", "const a = function* () { const e = new Error(\"x\"); const r = e; yield e; r.message = \"y\"; yield 0; };" + B("Error | number")),
  A("gy-error-helper", "const a = function* () { const e = new Error(\"x\"); const set = (q: Mut<Error>) => { q.message = \"y\"; }; yield e; set(e); yield 0; };" + B("Error | number")),
  A("gy-error-in-map", "const a = function* () { const e = new Error(\"x\"); yield new Map([[\"k\", e]]); e.message = \"y\"; yield new Map<string, Error>(); };" + B("Map<string, Error>")),
  A("gy-error-in-set", "const a = function* () { const e = new Error(\"x\"); yield new Set([e]); e.message = \"y\"; yield new Set<Error>(); };" + B("Set<Error>")),
  A("gy-error-async-gen", "const a = async function* () { const e = new Error(\"x\"); yield e; " + W + "e.message = \"y\"; yield new Error(\"z\"); };" + B("Error")),
  A("gy-error-array-of", "const a = function* () { const es = [new Error(\"x\")]; yield es; const e0 = es[0]; if (e0) e0.message = \"y\"; yield [] as Error[]; };" + B("Error[]")),
];
