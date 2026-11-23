// n8: follow-ups. Z: a function that uses a binding not yet initialised when it is published (registration makes that
// publish throw, S4.6). Y: each N route under R-Y (yield a reader, use the holder after the yield), as a proxy for
// whether the deep test (owMutDeep) sees the route. O: type operators without typeof. Plus the rows of earlier batches
// that died on my own syntax, JSX props, and functions held in state.
import { C, W } from "../freeze-attack3/harness.ts";
const go = (cell: string) => ({ drive: async (p: any) => { const f = p.value(cell); const g = typeof f === "function" ? f : f?.go; g(); g(); return `${cell} x2`; } });
const Y = (n: string, s: string, w: string, r: string) => C(`n8-y-${n}`, `const a = function* () { ${s} yield () => ${r}; ${w} yield () => -1; };`);
export const cands = [
  // Z: TDZ at publish
  C("n8-z-gen-const-after-yield", "const a = function* () { yield () => k; const k = 5; yield () => 0; };"),
  C("n8-z-gen-readonly-after-yield", "const a = function* () { yield () => k.length; const k: readonly number[] = [1, 2]; yield () => 0; };"),
  C("n8-z-gen-fn-decl-hoisted", "const a = function* () { yield f; const k = 5; yield f; function f() { return k; } };"),
  C("n8-z-gen-rec-after-yield", "const a = function* () { yield { f: () => k }; const k = 7; yield { f: () => 0 }; };"),
  C("n8-z-async-const-after-await", "const a = async () => { const f = () => k; " + W + "const k = 3; return f; };"),
  C("n8-z-sync-before-init", "const a = () => { const f = () => k; const r = { f }; const k = 3; return r; };"),
  C("n8-z-sync-decl-hoisted", "const a = () => { const r = { f }; function f() { return k; } const k = 3; return r; };"),
  C("n8-z-ctl-gen-const-after-yield", "const a = function* () { yield () => k; const k = 5; yield () => 0; };", { ctl: true }),
  C("n8-z-ctl-gen-fn-decl", "const a = function* () { yield f; const k = 5; yield f; function f() { return k; } };", { ctl: true }),
  // Y: R-Y proxy
  Y("tuple", "const xs = [0]; const t = [xs] as const;", "t[0].push(1);", "t[0].length"),
  Y("ternary", "const xs = [0]; const t = xs.length > 0 ? xs : null;", "if (t) t.push(1);", "(t ? t.length : -1)"),
  Y("and", "const xs = [0]; const t = xs.length > 0 && xs;", "if (t) t.push(1);", "(t ? t.length : -1)"),
  Y("or", "const xs = [0]; const t = xs.length === 0 || xs;", "if (t !== true) t.push(1);", "(t !== true ? t.length : -1)"),
  Y("asconst-rec", "const xs = [0]; const t = { k: xs } as const;", "t.k.push(1);", "t.k.length"),
  Y("box", "const box = <T,>(v: T) => ({ v }); const xs = [0]; const t = box(xs);", "t.v.push(1);", "t.v.length"),
  Y("helper-result", "const xs = [0]; const g = () => [xs] as const; const t = g();", "t[0].push(1);", "t[0].length"),
  Y("typeof-whole", "const xs = [0]; const t0 = [xs] as const; const t: typeof t0 = t0;", "t[0].push(1);", "t[0].length"),
  Y("nested-destr", "const xs = [0]; const [t] = [[xs] as const] as const;", "t[0].push(1);", "t[0].length"),
  C("n8-y-await", "const a = async function* () { const xs = [0]; const t = await Promise.resolve([xs] as const); yield () => t[0].length; t[0].push(1); yield () => -1; };"),
  C("n8-y-mut-param", "const a = function* () { const mk = function* (xs: Mut<number[]>) { const t = [xs] as const; yield () => t[0].length; t[0].push(1); }; yield* mk([0]); };"),
  // O: type operators, no typeof
  C("n8-o-intersection-ann", "const a = () => { const t: { v: number[] } & { w: number } = { v: [0], w: 1 }; t.w++; return () => t.w; };"),
  C("n8-o-conditional-ann", "type P<T> = T extends number ? number[] : string[];\nconst a = () => { const t: P<number> = [0]; t.push(1); return () => t.length; };"),
  C("n8-o-indexed-ann", "type R = { v: number[] };\nconst a = () => { const t: R[\"v\"] = [0]; t.push(1); return () => t.length; };"),
  C("n8-o-indexed-captured", "type R = { v: number[] };\nconst a = () => { const t: R[\"v\"] = [0]; return () => { t.push(1); return t.length; }; };"),
  C("n8-o-conditional-captured", "type P<T> = T extends number ? number[] : string[];\nconst a = () => { const t: P<number> = [0]; return () => { t.push(1); return t.length; }; };"),
  C("n8-o-intersection-captured", "const a = () => { const t: { v: number[] } & { w: number } = { v: [0], w: 1 }; return () => { t.w++; return t.w; }; };"),
  C("n8-o-generic-ret-intersection", "const a = () => { const both = <T,>(v: T): T & {} => v as T & {}; const xs = [0]; const t = [both(xs)] as const; return () => { t[0].push(1); return t[0].length; }; };"),
  C("n8-o-generic-ret-indexed", "const a = () => { const first = <T extends readonly unknown[]>(v: T): T[0] => v[0]; const xs = [0]; const t = [first([xs] as const)] as const; return () => { t[0].push(1); return t[0].length; }; };"),
  C("n8-o-local-box-alias", "type Box<T> = { readonly v: T };\nconst a = () => { const box = <T,>(v: T): Box<T> => ({ v }); const xs = [0]; const t = box(xs); return () => { t.v.push(1); return t.v.length; }; };"),
  C("n8-o-concat", "const a = () => { const xs = [0]; const e: number[][] = []; const t = [e.concat([xs])] as const; return () => { t[0][0]?.push(1); return t[0][0]?.length ?? -1; }; };"),
  // fixed earlier rows
  C("n8-rr-plain", "const s = () => state(0);\nconst bump = (s: State<number>) => action(() => s.update((n) => n + 1));\nconst a = (s: number) => { const c: readonly number[] = [s, s + 1]; return () => c.length + (c[0] ?? 0); };\nconst b = (a: () => number) => ({ a });", { ...go("bump"), twice: ["a", "b"] }),
  C("n8-c-unann-map", "const a = () => { const m = new Map<string, number>(); const t = [m] as const; return () => t[0]; };\nconst c = (a) => { a().set(\"k\", 1); return 0; };\nconst r = (a: () => Map<string, number>) => () => a().size;"),
  C("n8-m-map-alias-async", "const a = async () => { const m = new Map<string, number>(); const c: Map<string, number> = m; const f = () => c.size; " + W + "m.set(\"k\", 1); return f; };"),
  // JSX: a plain function as onClick; state holding an N function
  C("n8-jsx-onclick-fn", "const a = () => { const xs = [0]; const t = [xs] as const; return { el: <button onClick={() => { t[0].push(1); }}>x</button>, r: () => t[0].length }; };"),
  C("n8-jsx-onclick-action", "const n = () => state(0);\nconst inc = (n: State<number>) => { const xs = [0]; const t = [xs] as const; return action(() => { t[0].push(1); n.set(t[0].length); }); };\nconst view = (n: number, inc: Action<[]>) => <button onClick={inc}>{n}</button>;"),
  C("n8-state-init-n-fn", "const mk = () => () => { const xs = [0]; const t = [xs] as const; return () => { t[0].push(1); return t[0].length; }; };\nconst s = (mk: () => () => number) => state(mk());\nconst v = (s: () => number) => s;"),
  C("n8-state-set-n-fn", "const mk = () => { const xs = [0]; const t = [xs] as const; return () => { t[0].push(1); return t[0].length; }; };\nconst s = () => state<() => number>(() => 0);\nconst put = (s: State<() => number>) => action((f: () => number) => s.set(f));\nconst tick = function* (mk: () => number) { yield mk; };\nconst l = (tick: Events<() => number>, put: Action<[() => number]>) => on(tick, put);\nconst v = (s: () => number) => s;"),
];
