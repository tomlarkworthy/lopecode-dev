// n3: root N through channels other than a cell's return (memo, action, state, update, a listener, JSX, a consumer
// cell, a rerun); type operators (typeof, intersection, conditional, indexed) as routes; and non-N reruns.
import { C, W } from "../freeze-attack3/harness.ts";
const T = "const xs = [0]; const t = [xs] as const; ";
const go = (cell: string) => ({ drive: async (p: any) => { const f = p.value(cell); const g = typeof f === "function" ? f : f?.go; g(); g(); return `${cell} x2`; } });
export const cands = [
  // memo
  C("n3-memo-result-fn", "const a = () => memo((n: number) => { const xs = [n]; const t = [xs] as const; return () => { t[0].push(1); return t[0].length; }; });\nconst b = (a: (n: number) => () => number) => a(1);"),
  C("n3-memo-result-rec", "const a = () => memo((n: number) => { const xs = [n]; const t = [xs] as const; return { w: () => { t[0].push(1); return 0; }, r: () => t[0].length }; });\nconst b = (a: (n: number) => { w: () => number; r: () => number }) => a(1);"),
  C("n3-memo-captures-tuple", "const a = () => { " + T + "const f = memo((n: number) => t[0].length + n); return { f: () => f(0), w: () => { t[0].push(1); return 0; } }; };"),
  C("n3-memo-cross-cell-held", "const a = () => memo((n: number) => { const xs = [n]; const t = [xs] as const; return () => { t[0].push(1); return t[0].length; }; });\nconst b = (a: (n: number) => () => number) => a(1);\nconst c = (a: (n: number) => () => number) => a(1);"),
  C("n3-memo-ternary", "const a = () => memo((n: number) => { const xs = [n]; const t = n > -1 ? xs : null; return () => { if (t) t.push(1); return t ? t.length : -1; }; });\nconst b = (a: (n: number) => () => number) => a(1);"),
  // action: the action writes, a plain reader reads
  C("n3-action-writes-tuple", "const a = () => { " + T + "return { go: action(() => { t[0].push(1); }), f: () => t[0].length }; };", go("a")),
  C("n3-action-ternary", "const a = () => { const xs = [0]; const t = xs.length > 0 ? xs : null; return { go: action(() => { if (t) t.push(1); }), f: () => (t ? t.length : -1) }; };", go("a")),
  C("n3-action-sets-state", "const s = () => state(0);\nconst a = (s: State<number>) => { " + T + "return { go: action(() => { t[0].push(1); s.set(t[0].length); }), f: () => t[0].length }; };", go("a")),
  // state holds a function reading the tuple; an action writes it
  C("n3-state-holds-reader", "const s = () => state<() => number>(() => 0);\nconst put = (s: State<() => number>) => { " + T + "return { go: action(() => { t[0].push(1); s.set(() => t[0].length); }) }; };\nconst v = (s: () => number) => s;", go("put")),
  C("n3-update-fn", "const s = () => state<readonly number[]>([]);\nconst a = (s: State<readonly number[]>) => { " + T + "return { go: action(() => { t[0].push(1); s.update((l) => [...l, t[0].length]); }), f: () => t[0].length }; };", go("a")),
  // a listener delivers to an action that writes through the tuple
  C("n3-listener", "const tick = function* () { for (const k of [1, 2, 3]) yield k; };\nconst w = () => { " + T + "return { add: action((k: number) => { t[0].push(k); }), f: () => t[0].length }; };\nconst add = (w: { add: Action<[number]>; f: () => number }) => w.add;\nconst l = (tick: Events<number>, add: Action<[number]>) => on(tick, add);"),
  // JSX event prop
  C("n3-jsx-onclick", "const a = () => { " + T + "return <button onclick={() => { t[0].push(1); return t[0].length; }}>x</button>; };"),
  C("n3-jsx-reader", "const a = () => { " + T + "return { el: <i onclick={() => { t[0].push(1); }}>y</i>, f: () => t[0].length }; };"),
  // consumer cell holds a function of the producer; the producer's own writer runs
  C("n3-consumer-holds", "const a = () => { " + T + "return { w: () => { t[0].push(1); return 0; }, r: () => t[0].length }; };\nconst b = (a: { w: () => number; r: () => number }) => ({ r: a.r });"),
  C("n3-consumer-wraps", "const a = () => { " + T + "return { w: () => { t[0].push(1); return 0; }, r: () => t[0].length }; };\nconst b = (a: { w: () => number; r: () => number }) => () => a.r() * 10;"),
  C("n3-consumer-calls-writer", "const a = () => { " + T + "return { w: () => { t[0].push(1); return 0; }, r: () => t[0].length }; };\nconst b = (a: { w: () => number; r: () => number }) => { a.w(); return a.r(); };\nconst c = (a: { w: () => number; r: () => number }) => a.r;"),
  // promise / generator returned by a held function
  C("n3-held-promise-fn", "const a = () => { " + T + "return async () => { t[0].push(1); return t[0].length; }; };"),
  C("n3-held-gen-fn", "const a = () => { " + T + "return { w: () => { t[0].push(1); return 0; }, g: function* () { yield t[0].length; } }; };"),
  // type operators as routes
  C("n3-to-typeof-whole", "const a = () => { " + T + "const u: typeof t = t; return () => { u[0].push(1); return u[0].length; }; };"),
  C("n3-to-typeof-xs", "const a = () => { const xs = [0]; const u: typeof xs = xs; return () => { u.push(1); return u.length; }; };"),
  C("n3-to-intersection", "const a = () => { const xs = [0]; const t = [xs] as const; const u: readonly [number[]] & readonly unknown[] = t; return () => u[0].length; };"),
  C("n3-to-conditional", "type P<T> = T extends readonly [infer X] ? X : never;\nconst a = () => { " + T + "const u: P<typeof t> = t[0]; return () => { u.push(1); return u.length; }; };"),
  C("n3-to-indexed", "const a = () => { " + T + "const u: (typeof t)[0] = t[0]; return () => { u.push(1); return u.length; }; };"),
  C("n3-to-alias-generic-inst", "type Box<T> = { readonly v: T };\nconst box = <T,>(v: T): Box<T> => ({ v });\nconst a = () => { const xs = [0]; const t = box(xs); return () => { t.v.push(1); return t.v.length; }; };"),
  C("n3-to-keyof-record", "const a = () => { const xs = [0]; const t = { k: xs } as const; return () => { t.k.push(1); return t.k.length; }; };"),
  // reruns, no Mut held: a consumer keeps an earlier function value
  C("n3-rr-plain", "const s = () => state(0);\nconst bump = (s: State<number>) => action(() => s.update((n) => n + 1));\nconst a = (s: number) => { const c = [s, s + 1]; return () => c.length + c[0]!; };\nconst b = (a: () => number) => ({ a });", { ...go("bump"), twice: ["a", "b"] }),
  C("n3-rr-tuple", "const s = () => state(0);\nconst bump = (s: State<number>) => action(() => s.update((n) => n + 1));\nconst a = (s: number) => { const xs = [s]; const t = [xs] as const; return () => { t[0].push(1); return t[0].length; }; };\nconst b = (a: () => number) => ({ a });", { ...go("bump"), twice: ["a", "b"] }),
  C("n3-rr-memo-shared", "const m = () => memo((n: number) => [n, n]);\nconst s = () => state(0);\nconst bump = (s: State<number>) => action(() => s.update((n) => n + 1));\nconst a = (m: (n: number) => readonly number[], s: number) => () => m(0).length + s;\nconst b = (a: () => number) => ({ a });", { ...go("bump"), twice: ["a", "b"] }),
  // controls: checker skipped, must fire in REG=0
  C("n3-ctl-rec", "const a = () => { const xs = [0]; const t = { v: xs }; return () => { t.v.push(1); return t.v.length; }; };", { ctl: true }),
  C("n3-ctl-mut-capture", "const a = () => { const xs = [0]; return () => { xs.push(1); return xs.length; }; };", { ctl: true }),
  C("n3-ctl-buffer-view", "const a = () => { const b = new ArrayBuffer(2); return () => { const w = new Uint8Array(b); w[0] = (w[0] ?? 0) + 1; return w[0]; }; };", { ctl: true }),
  C("n3-ctl-default-mut", "const a = () => { const xs = [0]; return (y: Mut<number[]> = xs) => { y.push(1); return y.length; }; };", { ctl: true }),
  C("n3-ctl-fnres", "const a = () => { const xs = [0]; const g = () => xs; return () => { g().push(1); return g().length; }; };", { ctl: true }),
  C("n3-ctl-gen-alias", "const a = function* () { const xs = [0]; const c: readonly number[] = xs; yield () => c.length; xs.push(1); yield 2; };", { ctl: true }),
  C("n3-ctl-map-capture", "const a = () => { const m = new Map<string, number>(); return () => { m.set(String(m.size), 1); return m.size; }; };", { ctl: true }),
  C("n3-ctl-memo-mut", "const a = () => { const xs = [0]; const f = memo((n: number) => { xs.push(n); return xs.length; }); return () => f(xs.length); };", { ctl: true }),
];
