import { A, W, D, B, callW } from "./common.ts";
const L = (body: string) => `const h = async () => { ${W}${body} }; h(); `;
const T = "const t = new Uint8Array(2); ";
export const attacks = [
  // reassignable bindings that are not let
  A("fd-reassign-gen", "const a = function* () { function g(): number { return 1; } const f = () => g(); yield f; g = () => 2; yield 0; };"),
  A("fd-reassign-async", "const a = () => { function g(): number { return 1; } const f = () => g(); " + L("g = () => 2;") + "return f; };"),
  A("var-capture", "const a = () => { var n = 0; const f = () => n; " + L("n = 5;") + "return f; };"),
  A("catch-reassign", "const a = () => { try { throw 1; } catch (e) { const f = () => e; " + L("e = 2;") + "return f; } return () => 0; };"),
  A("inner-param-reassign", "const a = () => { const mk = (p: number) => { const f = () => p; " + L("p = 7;") + "return f; }; return mk(1); };"),
  A("cell-param-reassign", "const b = () => 1;\nconst a = (b: number) => { const f = () => b; " + L("b = 7;") + "return f; };"),
  // a kept function reads a record; the async helper writes the copy through an alias of the record
  A("kept-alias-rec", "const a = () => { " + T + "const o = { t }; const r = o; const f = () => o.t[0]; " + L("r.t[0] = 1;") + "return f; };"),
  A("kept-alias-map", "const a = () => { " + T + "const m = new Map([[\"k\", t]]); const r = m; const f = () => m.get(\"k\")?.[0] ?? -1; " + L("const q = r.get(\"k\"); if (q) q[0] = 1;") + "return f; };"),
  A("kept-sep-rec", "const a = () => { " + T + "const o = { t }; const p = { o }; const f = () => p.o.t[0]; " + L("o.t[0] = 1;") + "return f; };"),
  A("kept-fn-arr", "const a = () => { " + T + "const xs = [t]; const f = () => xs; " + L("const q = xs[0]; if (q) q[0] = 1;") + "return { f }; };"),
  // action arguments: deepFreeze puts the copy in the caller's own record
  A("act-arg-rec", "const s = () => state({ t: new Uint8Array(2) });\nconst add = (s: State<{ t: Uint8Array }>) => action((x: { t: Uint8Array }) => { s.set(x); });\nconst a = (add: Action<[{ t: Uint8Array }]>) => { " + T + "const o = { t }; const h = async () => { " + W + "add(o); " + W + "o.t[0] = 1; }; h(); return 0; };\nconst b = (s: { t: Uint8Array }) => ({ v: s });"),
  A("act-arg-map", "const s = () => state(new Map<string, Uint8Array>());\nconst add = (s: State<Map<string, Uint8Array>>) => action((x: Map<string, Uint8Array>) => { s.set(x); });\nconst a = (add: Action<[Map<string, Uint8Array>]>) => { " + T + "const m = new Map([[\"k\", t]]); const h = async () => { " + W + "add(m); " + W + "const q = m.get(\"k\"); if (q) q[0] = 1; }; h(); return 0; };\nconst b = (s: Map<string, Uint8Array>) => ({ v: s });"),
  A("act-arg-direct", "const s = () => state(new Uint8Array(2));\nconst add = (s: State<Uint8Array>) => action((x: Uint8Array) => { s.set(x); });\nconst a = (add: Action<[Uint8Array]>) => { " + T + "const h = async () => { " + W + "add(t); " + W + "t[0] = 1; }; h(); return 0; };\nconst b = (s: Uint8Array) => ({ v: s });"),
  // promise among captures resolving to an unfrozen typed array
  A("pr-cap-typed", "const a = () => { " + T + "const p = Promise.resolve(t); " + L("t[0] = 1;") + "return () => p; };\nconst c = async (a: () => Promise<Uint8Array>) => { const v = await a(); return () => v; };"),
  A("pr-cap-iife", "const a = () => { " + T + "const p = (async () => t)(); " + L("t[0] = 1;") + "return () => p; };\nconst c = async (a: () => Promise<Uint8Array>) => { const v = await a(); return () => v; };"),
  A("pr-cap-async-fn", "const a = () => { " + T + "const g = async () => { " + W + "return t; }; const p = g(); " + L("t[0] = 1;") + "return () => p; };\nconst c = async (a: () => Promise<Uint8Array>) => { const v = await a(); return () => v; };"),
  A("pr-cap-arr", "const a = () => { const xs = [0]; const g = async () => xs; const p = g(); " + L("xs.push(1);") + "return () => p; };\nconst c = async (a: () => Promise<number[]>) => { const v = await a(); return () => v; };"),
  A("pr-top-then", "const a = () => { " + T + "const p = Promise.resolve(0).then(() => t); " + L("t[0] = 1;") + "return p; };\nconst c = (a: Uint8Array) => () => a;"),
  // consumer writes its typed-array input
  A("cw-view-buffer", "const a = () => new Uint8Array(2);\nconst b = (a: Uint8Array) => { const v = new Uint8Array(a.buffer); v[0] = 1; return 0; };\nconst c = (a: Uint8Array) => () => a;"),
  A("cw-subarray", "const a = () => new Uint8Array(2);\nconst b = (a: Uint8Array) => { const v = a.subarray(0); v[0] = 1; return 0; };"),
  A("cw-union", "const a = () => new Uint8Array(2);\nconst b = (a: Uint8Array) => { const v = Math.abs(1) > 2 ? new Uint8Array(2) : a; v[0] = 1; return 0; };"),
  A("cw-rec-wrap", "const a = () => new Uint8Array(2);\nconst b = (a: Uint8Array) => { const o = { t: a }; o.t[0] = 1; return 0; };"),
  A("cw-arr-wrap", "const a = () => new Uint8Array(2);\nconst b = (a: Uint8Array) => { const xs = [a]; xs.forEach((q) => { q[0] = 1; }); return 0; };"),
  A("cw-map-wrap", "const a = () => new Uint8Array(2);\nconst b = (a: Uint8Array) => { const m = new Map([[\"k\", a]]); m.forEach((q) => { q[0] = 1; }); return 0; };"),
  A("cw-alias-let", "const a = () => new Uint8Array(2);\nconst b = (a: Uint8Array) => { let v = new Uint8Array(2); v = a; v[0] = 1; return 0; };"),
  A("cw-fill-view", "const a = () => new Uint8Array(4);\nconst b = (a: Uint8Array) => { new Uint8Array(a.buffer, 1, 2).fill(9); return 0; };"),
  A("cw-ab-input", "const a = () => new ArrayBuffer(2);\nconst b = (a: ArrayBuffer) => { new Uint8Array(a)[0] = 1; return 0; };\nconst c = (a: ArrayBuffer) => () => a;"),
  A("cw-ternary-rec", "const a = () => ({ t: new Uint8Array(2) });\nconst b = (a: { t: Uint8Array }) => { const o = Math.abs(1) > 2 ? { t: new Uint8Array(2) } : a; o.t[0] = 1; return 0; };"),
  A("cw-for-of-mix", "const a = () => new Uint8Array(2);\nconst b = (a: Uint8Array) => { for (const q of [new Uint8Array(2), a]) q[0] = 1; return 0; };"),
  // URLSearchParams more
  A("usp-arr", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.search = \"?q=2\";") + "return [u.searchParams]; };\nconst c = (a: URLSearchParams[]) => () => a;"),
  A("usp-map", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.href = \"https://x.test/?q=9\";") + "return new Map([[\"p\", u.searchParams]]); };\nconst c = (a: Map<string, URLSearchParams>) => () => a;"),
  A("usp-consumer-reads", "const a = () => { const u = new URL(\"https://x.test/?q=1\"); " + L("u.search = \"?q=2\";") + "return { p: u.searchParams }; };\nconst b = (a: { p: URLSearchParams }) => () => a.p.get(\"q\");"),
];
