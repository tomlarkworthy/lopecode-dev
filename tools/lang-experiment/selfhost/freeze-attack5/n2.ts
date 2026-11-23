// n2: roots other than N. Each a way for a kept function to reach a value someone can write after publish, with no
// Mut in the captured local's inferred type. Names: n2-<group>-<form>.
import { C, W } from "../freeze-attack3/harness.ts";
const cw = (s: string) => C(s.split("|")[0]!, s.slice(s.indexOf("|") + 1));
export const cands = [
  // V: a view through a constructor on a buffer (new on an intrinsic is fresh, so the view is writable)
  cw("n2-v-buffer-ctor|const a = () => { const u = new Uint8Array(2); const b = u.buffer; return () => { const w = new Uint8Array(b); w[0] = (w[0] ?? 0) + 1; return u[0]; }; };"),
  cw("n2-v-buffer-ctor-read|const a = () => { const u = new Uint8Array(2); const b = u.buffer; const r: Uint8Array = new Uint8Array(b); return () => { const w = new Uint8Array(b); w[0] = (w[0] ?? 0) + 1; return r[0]; }; };"),
  cw("n2-v-buffer-only|const a = () => { const b = new ArrayBuffer(2); return () => { const w = new Uint8Array(b); w[0] = (w[0] ?? 0) + 1; return w[0]; }; };"),
  cw("n2-v-buffer-two-fns|const a = () => { const b = new ArrayBuffer(2); return { w: () => { const w = new Uint8Array(b); w[0] = (w[0] ?? 0) + 1; return 0; }, r: () => new Uint8Array(b)[0] }; };"),
  cw("n2-v-buffer-f32|const a = () => { const b = new ArrayBuffer(8); return () => { const w = new Float32Array(b, 0, 1); w[0] = (w[0] ?? 0) + 1; return w[0]; }; };"),
  cw("n2-v-subarray-buffer|const a = () => { const u = new Uint8Array(4); const v = u.subarray(0, 2); return () => { const w = new Uint8Array(v.buffer); w[0] = (w[0] ?? 0) + 1; return w[0]; }; };"),
  cw("n2-v-cross-cell|const a = () => new ArrayBuffer(2);\nconst b = (a: ArrayBuffer) => () => { const w = new Uint8Array(a); w[0] = (w[0] ?? 0) + 1; return w[0]; };"),
  cw("n2-v-cross-cell-typed|const a = () => new Uint8Array(2);\nconst b = (a: Uint8Array) => () => { const w = new Uint8Array(a.buffer); w[0] = (w[0] ?? 0) + 1; return w[0]; };"),
  cw("n2-v-in-cell-write|const a = () => { const b = new ArrayBuffer(2); const r = (): number => new Uint8Array(b)[0] ?? -1; const w = new Uint8Array(b); w[0] = 5; return r; };"),
  cw("n2-v-buffer-param|const mk = () => (b: ArrayBuffer) => () => { const w = new Uint8Array(b); w[0] = (w[0] ?? 0) + 1; return w[0]; };\nconst a = (mk: (b: ArrayBuffer) => () => number) => mk(new ArrayBuffer(2));"),
  // D: default parameter that names a Mut local
  cw("n2-d-default-mut|const a = () => { const xs = [0]; return (y: Mut<number[]> = xs) => { y.push(1); return y.length; }; };"),
  cw("n2-d-default-plain|const a = () => { const xs = [0]; return (y: readonly number[] = xs) => y.length; };"),
  cw("n2-d-default-tuple|const a = () => { const xs = [0]; const t = [xs] as const; return (y: Mut<number[]> = t[0]) => { y.push(1); return y.length; }; };"),
  // P: a kept function capturing a Mut parameter (of an inner function, of the cell's function)
  cw("n2-p-inner-mut-param|const a = () => { const mk = (xs: Mut<number[]>) => () => { xs.push(1); return xs.length; }; return mk([0]); };"),
  cw("n2-p-inner-mut-param-read|const a = () => { const mk = (xs: Mut<number[]>) => () => xs.length; const ys = [0]; const f = mk(ys); return () => { ys.push(1); return f(); }; };"),
  cw("n2-p-generic-param|const a = () => { const mk = <T,>(v: T) => () => v; const xs = [0]; const g = mk(xs); return () => { g().push(1); return g().length; }; };"),
  cw("n2-p-generic-param-out|const mk = () => <T,>(v: T) => () => v;\nconst a = (mk: <T>(v: T) => () => T) => { const xs = [0]; const g = mk(xs); return () => { g().push(1); return g().length; }; };"),
  cw("n2-p-plain-param-alias|const a = () => { const mk = (xs: readonly number[]) => () => xs.length; const ys = [0]; const f = mk(ys); return { f, w: () => 0 }; };"),
  cw("n2-p-cell-param-assigned|const a = (n: number) => { n = n + 1; return () => n; };"),
  // T: this, arguments, getters
  cw("n2-t-this-method|const a = () => ({ n: [0], m() { this.n.push(1); return this.n.length; } });"),
  cw("n2-t-arguments|const a = () => { const xs = [0]; return function () { return arguments.length + xs.length; }; };"),
  // F: a kept function capturing a helper function whose inferred result is a Mut (function-type result)
  cw("n2-f-helper-uncalled|const a = () => { const xs = [0]; const g = () => xs; return () => g; };\nconst c = (a: () => () => number[]) => a()().length;"),
  cw("n2-f-helper-in-record|const a = () => { const xs = [0]; const g = () => xs; return { g: () => g, w: () => { g().push(1); return 0; } }; };"),
  cw("n2-f-helper-passed|const a = () => { const xs = [0]; const g = () => xs; const wrap = (h: () => Mut<number[]>) => () => { h().push(1); return h().length; }; return wrap(g); };"),
  cw("n2-f-helper-param-fn|const a = () => { const wrap = (h: () => Mut<number[]>) => () => { h().push(1); return h().length; }; const xs = [0]; return wrap(() => xs); };"),
  cw("n2-f-fn-typed-local|const a = () => { const xs = [0]; const g: () => Mut<number[]> = () => xs; return () => { g().push(1); return g().length; }; };"),
  // A: early escape from an async cell, a plain alias, the body writing after an await
  cw("n2-a-input-fn|const reg = () => (f: () => number) => f();\nconst a = async (reg: (f: () => number) => number) => { const xs = [0]; const c: readonly number[] = xs; reg(() => c.length); " + W + "xs.push(1); return () => c.length; };"),
  cw("n2-a-return-fn-then-write|const a = async () => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; " + W + "xs.push(1); return f; };"),
  cw("n2-a-promise-race|const a = async () => { const xs = [0]; const c: readonly number[] = xs; const p = Promise.resolve(() => c.length); " + W + "xs.push(1); return p; };"),
  cw("n2-a-gen-plain-alias|const a = function* () { const xs = [0]; const c: readonly number[] = xs; yield () => c.length; xs.push(1); yield 2; };"),
  cw("n2-a-gen-plain-prim|const a = function* () { const xs = [0]; const n = xs.length; yield () => n; xs.push(1); yield 2; };"),
  cw("n2-a-asyncgen-alias|const a = async function* () { const xs = [0]; const c: readonly number[] = xs; yield () => c.length; " + W + "xs.push(1); yield 2; };"),
  // L: a let reassigned to a fresh value, then captured as a const alias
  cw("n2-l-let-fresh-alias|const a = () => { let ys: number[] = [0]; ys = [1]; const c: readonly number[] = ys; return { f: () => c.length }; };"),
  cw("n2-l-ann-let-written-after-capture|const a = async () => { let ys: number[] = [0]; const c: readonly number[] = ys; const f = () => c.length; " + W + "ys.push(1); return f; };"),
  // M: Map/Set made by an intrinsic under a plain alias, written by its own Mut name later in async body
  cw("n2-m-map-alias-async|const a = async () => { const m = new Map<string, number>(); const c: ReadonlyMap<string, number> = m; const f = () => c.size; " + W + "m.set(\"k\", 1); return f; };"),
  cw("n2-m-map-plain-async|const a = async () => { const m = new Map<string, number>(); const c = m as Map<string, number>; return () => c.size; };"),
  // S: structuredClone / spread keep sharing
  cw("n2-s-spread-shares|const a = () => { const o = { n: 0 }; const ys = [o]; const zs = [...ys]; return () => { zs[0] = { n: (zs[0]?.n ?? 0) + 1 }; return zs[0]?.n; }; };"),
  cw("n2-s-object-values-alias|const a = () => { const ys = [[0]]; const vs = Object.values({ k: ys }); return () => vs.length; };"),
];
