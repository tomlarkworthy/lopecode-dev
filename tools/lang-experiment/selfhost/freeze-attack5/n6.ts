// n6: non-N late writers and boundary reads: yield* into an inner generator, a consumer with an unannotated input,
// JSX handlers, helper generators, switch/label scopes, Map keys, a kept function returning its captured holder.
import { C, W } from "../freeze-attack3/harness.ts";
const T = "const xs = [0]; const t = [xs] as const; ";
export const cands = [
  C("n6-yieldstar-inner-writes", "const a = function* () { const xs = [0]; const c: readonly number[] = xs; const inner = function* () { yield () => c.length; xs.push(1); yield 2; }; yield* inner(); };"),
  C("n6-yieldstar-inner-own", "const a = function* () { const inner = function* () { const xs = [0]; const c: readonly number[] = xs; yield () => c.length; xs.push(1); yield 2; }; yield* inner(); };"),
  C("n6-spread-inner-gen", "const a = () => { const xs = [0]; const c: readonly number[] = xs; const inner = function* () { yield () => c.length; xs.push(1); }; const fs = [...inner()]; return fs[0] ?? (() => -1); };"),
  C("n6-inner-gen-kept", "const a = () => { const inner = function* () { const xs = [0]; const c: readonly number[] = xs; yield () => c.length; xs.push(1); yield () => -1; }; return inner; };"),
  C("n6-inner-gen-object-kept", "const a = () => { const inner = function* () { const xs = [0]; yield xs.length; xs.push(1); yield xs.length; }; const g = inner(); return { n: () => g.next().value }; };"),
  C("n6-unannotated-consumer-write", "const a = () => { " + T + "return () => t[0]; };\nconst c = (a) => { a().push(1); return 0; };"),
  C("n6-unannotated-consumer-tuple", "const a = () => { " + T + "return () => t; };\nconst c = (a) => { a()[0].push(1); return 0; };"),
  C("n6-unannotated-consumer-mutparam", "const a = () => (ys: Mut<number[]>) => { ys.push(1); return ys.length; };\nconst b = () => [0];\nconst c = (a, b) => () => a(b);"),
  C("n6-consumer-passes-to-mut-param", "const a = () => { " + T + "return { get: () => t[0], put: (ys: Mut<number[]>) => { ys.push(1); return ys.length; } }; };\nconst c = (a: { get: () => readonly number[]; put: (ys: Mut<number[]>) => number }) => () => a.put(a.get());"),
  C("n6-jsx-onclick-void", "const a = () => { " + T + "return { el: <button onclick={() => { t[0].push(1); }}>x</button>, r: () => t[0].length }; };", { drive: async (p: any) => { const v = p.value("a"); const f = v?.el?.props?.onclick ?? v?.el?.onclick; if (typeof f === "function") { f(); f(); return "clicked x2"; } return "no handler found: " + Object.keys(v?.el ?? {}).join(","); } }),
  C("n6-jsx-plain-alias", "const a = async () => { const xs = [0]; const c: readonly number[] = xs; const el = <button onclick={() => { c.length; }}>{String(c.length)}</button>; " + W + "xs.push(1); return { el, r: () => c.length }; };"),
  C("n6-switch-scope", "const a = () => { switch (1) { case 1: { " + T + "return () => { t[0].push(1); return t[0].length; }; } default: return () => 0; } };"),
  C("n6-label-scope", "const a = () => { lbl: { " + T + "return () => { t[0].push(1); return t[0].length; }; } };"),
  C("n6-map-key-tuple", "const a = () => { const k = [0]; const m = new Map<readonly number[], number>([[k, 1]]); const t = [k] as const; return () => { t[0].push(1); return t[0].length + m.size; }; };"),
  C("n6-kept-returns-holder", "const a = () => { " + T + "return { h: () => t, w: () => { t[0].push(1); return 0; } }; };\nconst b = (a: { h: () => readonly (readonly number[])[]; w: () => number }) => () => a.h()[0]?.length ?? -1;"),
  C("n6-helper-gen-capture", "const a = () => { const xs = [0]; const h = function* () { yield xs.length; }; return () => [...h()].length; };"),
  C("n6-object-literal-getter-fn", "const a = () => { " + T + "const o = { f() { return t[0].length; } }; return { o, w: () => { t[0].push(1); return 0; } }; };"),
  C("n6-async-reader-via-input", "const reg = () => (f: () => number) => f() * 0;\nconst a = async (reg: (f: () => number) => number) => { const xs = [0]; const c: readonly number[] = xs; const n = reg(() => c.length); " + W + "xs.push(1); return n; };"),
  C("n6-async-snapshot-escape", "const a = async () => { const xs = [0]; const c = snapshot(xs); " + W + "xs.push(1); return () => c.length; };"),
  C("n6-closure-over-cell-input-fn", "const g = () => { " + T + "return { w: () => { t[0].push(1); return 0; }, r: () => t[0].length }; };\nconst a = (g: { w: () => number; r: () => number }) => () => g.r();"),
  C("n6-ctl-yieldstar", "const a = function* () { const xs = [0]; const c: readonly number[] = xs; const inner = function* () { yield () => c.length; xs.push(1); yield 2; }; yield* inner(); };", { ctl: true }),
  C("n6-ctl-unannotated-consumer", "const a = () => { const xs = [0]; return () => xs; };\nconst c = (a) => { a().push(1); return 0; };", { ctl: true }),
];
