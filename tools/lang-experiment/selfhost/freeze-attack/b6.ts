import type { Attack } from "./harness.ts";
const A = (name: string, src: string, show: string[] = [], drive?: (p: any) => unknown): Attack => ({ name, src, show, drive });
const D = "const D = (): Promise<number> => { let p: Promise<number> = Promise.resolve(0); for (let i = 0; i < 300; i++) p = p.then(() => 0); return p; }; ";
const W = "for (let i = 0; i < 300; i++) await null; ";
const callW = (p: any) => { p.value("w")(); };
export const attacks: Attack[] = [
  // helper cells (sync) that schedule a write to their Mut parameter
  A("hs-then-alias-param", "const H = () => (p: Mut<number[]>) => { " + D + "D().then(() => { const r = p; r.push(1); }); return 0; };\nconst a = (H: (p: Mut<number[]>) => number) => { const xs = [0]; H(xs); return xs; };\nconst b = (a: number[]) => ({ v: a });"),
  A("hs-then-direct-param", "const H = () => (p: Mut<number[]>) => { " + D + "D().then(() => { p.push(1); }); return 0; };\nconst a = (H: (p: Mut<number[]>) => number) => { const xs = [0]; H(xs); return xs; };"),
  A("hs-then-alias-param-error", "const H = () => (p: Mut<Error>) => { " + D + "D().then(() => { const r = p; r.message = \"y\"; }); return 0; };\nconst a = (H: (p: Mut<Error>) => number) => { const e = new Error(\"x\"); H(e); return e; };\nconst b = (a: Error) => ({ v: a });"),
  A("hs-async-inner-helper", "const H = () => (p: Mut<number[]>) => { const go = async () => { " + W + "p.push(1); }; go(); return 0; };\nconst a = (H: (p: Mut<number[]>) => number) => { const xs = [0]; H(xs); return xs; };\nconst b = (a: number[]) => ({ v: a });"),
  A("hs-async-inner-helper-typed", "const H = () => (p: Mut<Uint8Array>) => { const go = async () => { " + W + "p[0] = 3; }; go(); return 0; };\nconst a = (H: (p: Mut<Uint8Array>) => number) => { const t = new Uint8Array(2); H(t); return t; };\nconst b = (a: Uint8Array) => ({ v: a });"),
  A("hs-async-inner-helper-url", "const H = () => (p: Mut<URL>) => { const go = async () => { " + W + "p.hash = \"#z\"; }; go(); return 0; };\nconst a = (H: (p: Mut<URL>) => number) => { const u = new URL(\"https://x.test/\"); H(u); return u; };\nconst b = (a: URL) => ({ v: a });"),
  // same-cell sync helper with an async inner function
  A("ls-nested-async-in-helper-typed", "const a = () => { const t = new Uint8Array(2); const outer = () => { const go = async () => { " + W + "t[0] = 4; }; go(); }; outer(); return t; };\nconst b = (a: Uint8Array) => ({ v: a });"),
  A("ls-async-iife-typed", "const a = () => { const t = new Uint8Array(2); (async () => { " + W + "t[0] = 5; })(); return t; };\nconst b = (a: Uint8Array) => ({ v: a });"),
  A("ls-async-iife-error", "const a = () => { const e = new Error(\"x\"); (async () => { " + W + "e.message = \"y\"; })(); return e; };\nconst b = (a: Error) => ({ v: a });"),
  A("ls-async-fn-decl-typed", "const a = () => { const t = new Uint8Array(2); async function go() { " + W + "t[0] = 6; } go(); return t; };\nconst b = (a: Uint8Array) => ({ v: a });"),
  A("ls-async-alias-typed", "const a = () => { const t = new Uint8Array(2); const v = t; const go = async () => { " + W + "v[0] = 7; }; go(); return t; };\nconst b = (a: Uint8Array) => ({ v: a });"),
  A("ls-async-subarray", "const a = () => { const t = new Uint8Array(2); const go = async () => { " + W + "t.subarray(0)[0] = 8; }; go(); return t; };\nconst b = (a: Uint8Array) => ({ v: a });"),
  A("ls-async-fill", "const a = () => { const t = new Uint8Array(2); const go = async () => { " + W + "t.fill(9); }; go(); return t; };\nconst b = (a: Uint8Array) => ({ v: a });"),
  A("ls-async-buffer-view", "const a = () => { const b = new ArrayBuffer(2); const go = async () => { " + W + "new Uint8Array(b)[0] = 1; }; go(); return b; };\nconst c = (a: ArrayBuffer) => ({ v: a });"),
  A("ls-async-url-search", "const a = () => { const u = new URL(\"https://x.test/\"); const go = async () => { " + W + "u.search = \"?q\"; }; go(); return { u }; };\nconst b = (a: { u: URL }) => a;"),
  A("ls-async-typed-then-cell-two", "const a = () => { const t = new Float64Array(1); const go = async () => { " + W + "t[0] = 1.5; }; go(); return [t]; };\nconst b = (a: Float64Array[]) => ({ v: a });"),
  A("ls-async-param-error", "const a = () => { const e = new Error(\"x\"); const go = async (q: Mut<Error>) => { " + W + "q.message = \"z\"; }; go(e); return e; };\nconst b = (a: Error) => ({ v: a });"),
  A("ls-gen-cell-async-helper-typed", "const a = function* () { const t = new Uint8Array(2); const go = async () => { " + W + "t[0] = 1; }; go(); yield t.slice(); yield 0; };"),
  // actions (driven from JS as a listener would)
  A("ac-then-alias-state-typed", "const s = () => state(new Uint8Array(2));\nconst w = (s: State<Uint8Array>) => action(() => { " + D + "const t = new Uint8Array(2); s.set(t); const h = () => t; D().then(() => { h()[0] = 9; }); });\nconst b = (s: Uint8Array) => ({ v: s });", ["b"], callW),
  A("ac-then-alias-state-error", "const s = () => state(new Error(\"a\"));\nconst w = (s: State<Error>) => action(() => { " + D + "const e = new Error(\"x\"); s.set(e); D().then(() => { const r = e; r.message = \"y\"; }); });\nconst b = (s: Error) => ({ v: s });", ["b"], callW),
  A("ac-then-alias-state-array", "const s = () => state([0]);\nconst w = (s: State<number[]>) => action(() => { " + D + "const xs = [5]; s.set(xs); D().then(() => { const r = xs; r.push(1); }); });\nconst b = (s: number[]) => ({ v: s });", ["b"], callW),
  A("ac-returns-typed", "const s = () => state(0);\nconst w = (s: State<number>) => action(() => { const t = new Uint8Array(2); return t; });"),
  A("ac-update-keeps", "const s = () => state(new Uint8Array(2));\nconst w = (s: State<Uint8Array>) => action(() => { s.update((v) => { const t = new Uint8Array(2); const go = (): number => t.length; return t; }); });", [], callW),
  A("ac-state-typed-initial-then", "const s = () => { " + D + "const t = new Uint8Array(2); const h = () => t; D().then(() => { h()[0] = 2; }); return state(t); };\nconst b = (s: Uint8Array) => ({ v: s });"),
  A("ac-state-error-initial-then", "const s = () => { " + D + "const e = new Error(\"x\"); D().then(() => { const r = e; r.message = \"y\"; }); return state(e); };\nconst b = (s: Error) => ({ v: s });"),
  A("ac-state-url-initial-async", "const s = () => { const u = new URL(\"https://x.test/\"); const go = async () => { " + W + "u.hash = \"#q\"; }; go(); return state(u); };\nconst b = (s: URL) => ({ v: s });"),
  // typed captured by then via helper (fixpoint check)
  A("th-typed-helper", "const a = () => { " + D + "const t = new Uint8Array(2); const h = () => t; D().then(() => { h()[0] = 1; }); return t; };\nconst b = (a: Uint8Array) => ({ v: a });"),
  A("th-typed-alias", "const a = () => { " + D + "const t = new Uint8Array(2); D().then(() => { const r = t; r[0] = 1; }); return t; };"),
  A("th-error-helper", "const a = () => { " + D + "const e = new Error(\"x\"); const h = () => e; D().then(() => { h().message = \"y\"; }); return e; };"),
  A("th-error-direct", "const a = () => { " + D + "const e = new Error(\"x\"); D().then(() => { e.message = \"y\"; }); return e; };"),
  A("th-url-helper", "const a = () => { " + D + "const u = new URL(\"https://x.test/\"); const h = () => u; D().then(() => { h().hash = \"#a\"; }); return u; };"),
  A("th-map-helper-skip", "const a = () => { " + D + "const m = new Map<string, number>(); const h = () => m; D().then(() => { h().set(\"k\", 1); }); return m; };\nconst b = (a: Map<string, number>) => ({ v: a });"),
  A("th-set-alias-skip", "const a = () => { " + D + "const s = new Set<number>(); D().then(() => { const r = s; r.add(1); }); return s; };\nconst b = (a: Set<number>) => ({ v: a });"),
  A("th-nested-record-skip", "const a = () => { " + D + "const o = { in: [0] }; D().then(() => { const r = o.in; r.push(1); }); return o; };\nconst b = (a: { in: number[] }) => ({ v: a });"),
  A("th-member-of-captured", "const a = () => { " + D + "const o = { in: [0] }; D().then(() => { o.in.push(1); }); return o; };"),
  A("th-forof-captured", "const a = () => { " + D + "const o = [[0]]; D().then(() => { for (const r of o) r.push(1); }); return o; };\nconst b = (a: number[][]) => ({ v: a });"),
  A("th-at-captured", "const a = () => { " + D + "const o = [[0]]; D().then(() => { o.at(0)?.push(1); }); return o; };"),
  A("th-index-captured", "const a = () => { " + D + "const o = [[0]]; D().then(() => { o[0]?.push(1); }); return o; };"),
  A("th-map-get-captured", "const a = () => { " + D + "const m = new Map([[\"k\", [0]]]); D().then(() => { m.get(\"k\")?.push(1); }); return m; };\nconst b = (a: Map<string, number[]>) => ({ v: a });"),
  // then callback through an outer kept function only
  A("th-kept-returns-then", "const a = () => { " + D + "const xs = [0]; const k = () => { D().then(() => { const r = xs; r.push(1); }); return 0; }; return { xs, k }; };\nconst c = (a: { k: () => number }) => a.k();\nconst b = (a: { xs: number[] }) => ({ v: a.xs });"),
];
