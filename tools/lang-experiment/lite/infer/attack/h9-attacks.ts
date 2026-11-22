// Rule set R (2026-11-22): attacks on R itself, ways for code to run after a cell gave a value that R does not
// classify as late, each writing what an earlier published value reaches. Run by run-sets.ts (set h9). W: 300 awaits.
// By name prefix: h9-aa an async function inside an async function, not awaited (R-A takes it as awaited); h9-nm a Mut
// below the top level of a const of a plain type (R-K and R-Y look at the binding's own type); h9-cb a callback an
// intrinsic stores (then, catch, Map.set, sort); h9-it iterators and generators held or returned; h9-ev actions,
// listeners and state; h9-fl finally, recursion, default parameters, getters; h9-pr primitive lets and plain consts,
// which R accepts and which change nothing (controls of the rule, not of the observer).
const W = "for (let i = 0; i < 300; i++) await null; ";
type A = { name: string; src: string; show?: string[]; twice?: string[] };
const A = (name: string, src: string, show: string[] = []): A => ({ name, src, show });
// an async cell whose un-awaited async helper writes after the cell returned
const AA = (setup: string, write: string, out: string) => `const a = async () => { ${setup}const h = async () => { ${W}${write} }; h(); return ${out}; };`;
export const attacks: A[] = [
  // 1. an async function inside an async cell, not awaited
  A("h9-aa-alias-fn", AA("const xs = [0]; const c: readonly number[] = xs; ", "xs.push(1);", "() => c.length")),
  A("h9-aa-alias-rec", AA("const xs = [0]; const c: readonly number[] = xs; ", "xs.push(1);", "{ c }")),
  A("h9-aa-direct", AA("const xs = [0]; ", "xs.push(1);", "xs")),
  A("h9-aa-map-alias", AA("const m = new Map<string, number>(); const c: Map<string, number> = m; ", "m.set(\"k\", 1);", "() => c.size")),
  A("h9-aa-set-alias", AA("const s = new Set<number>(); const c: Set<number> = s; ", "s.add(1);", "() => c.size")),
  A("h9-aa-rec-alias", AA("const r = { n: 0 }; const c: { readonly n: number } = r; ", "r.n = 1;", "() => c.n")),
  A("h9-aa-param", "const a = async () => { const xs = [0]; const c: readonly number[] = xs; const h = async (m: Mut<number[]>) => { " + W + "m.push(1); }; h(xs); return () => c.length; };"),
  A("h9-aa-helper-write", "const a = async () => { const xs = [0]; const c: readonly number[] = xs; const w = () => { xs.push(1); }; const h = async () => { " + W + "w(); }; h(); return () => c.length; };"),
  A("h9-aa-two-deep", "const a = async () => { const xs = [0]; const c: readonly number[] = xs; const o = async () => { const i = async () => { " + W + "xs.push(1); }; i(); }; await o(); return () => c.length; };"),
  A("h9-aa-all", "const a = async () => { const xs = [0]; const c: readonly number[] = xs; const h = async () => { " + W + "xs.push(1); }; Promise.all([h()]); return () => c.length; };"),
  A("h9-aa-branch", "const a = async (now: Clock) => { const xs = [0]; const c: readonly number[] = xs; const h = async () => { " + W + "xs.push(1); }; const p = h(); if (now() < 0) await p; return () => c.length; };"),
  A("h9-aa-recursive", "const a = async () => { const xs = [0]; const c: readonly number[] = xs; const h = async (n: number): Promise<void> => { await null; xs.push(n); if (n > 0) await h(n - 1); }; h(300); return () => c.length; };"),
  A("h9-aa-default-param", "const a = async () => { const xs = [0]; const c: readonly number[] = xs; const h = async () => { " + W + "xs.push(1); }; h(); return (k: number = c.length) => k; };"),
  A("h9-aa-typed-alias", AA("const t = new Uint8Array(2); const c: Uint8Array = t; ", "t[0] = 1;", "() => c[0] ?? -1")),
  A("h9-aa-kept-calls", "const a = async () => { const xs = [0]; const c: readonly number[] = xs; const h = async () => { " + W + "xs.push(1); }; return () => { h(); return c.length; }; };"),
  A("h9-aa-in-kept-async", "const a = () => async () => { const xs = [0]; const c: readonly number[] = xs; const h = async () => { " + W + "xs.push(1); }; h(); return () => c.length; };"),
  A("h9-aa-consumer", AA("const xs = [0]; const c: readonly number[] = xs; ", "xs.push(1);", "c") + "\nconst b = (a: readonly number[]) => () => a.length;"),
  // 2. a Mut below the top level of a const of a plain type
  A("h9-nm-gen-after-yield", "const a = function* () { const r: { readonly t: Mut<number[]> } = { t: [0] }; yield () => r.t.length; r.t.push(1); yield 2; };"),
  A("h9-nm-gen-record", "const a = function* () { const r: { readonly t: Mut<number[]> } = { t: [0] }; yield { f: () => r.t.length }; r.t.push(1); yield 2; };"),
  A("h9-nm-async-helper", "const a = () => { const r: { readonly t: Mut<number[]> } = { t: [0] }; const h = async () => { " + W + "r.t.push(1); }; h(); return () => r.t.length; };"),
  A("h9-nm-aa", "const a = async () => { const r: { readonly t: Mut<number[]> } = { t: [0] }; const h = async () => { " + W + "r.t.push(1); }; h(); return () => r.t.length; };"),
  A("h9-nm-array", "const a = function* () { const r: readonly Mut<number[]>[] = [[0]]; yield () => r[0]?.length ?? -1; r[0]?.push(1); yield 2; };"),
  A("h9-nm-map", "const a = function* () { const r: { readonly m: Mut<Map<string, number>> } = { m: new Map() }; yield () => r.m.size; r.m.set(\"k\", 1); yield 2; };"),
  A("h9-nm-direct-yield", "const a = function* () { const r: { readonly t: Mut<number[]> } = { t: [0] }; yield r; r.t.push(1); yield 2; };"),
  // 3. callbacks an intrinsic stores
  A("h9-cb-then", "const a = () => { const xs = [0]; const c: readonly number[] = xs; Promise.resolve(0).then(() => { xs.push(1); }); return () => c.length; };"),
  A("h9-cb-then-helper", "const a = () => { const xs = [0]; const c: readonly number[] = xs; const w = () => { xs.push(1); }; Promise.resolve(0).then(w); return () => c.length; };"),
  A("h9-cb-catch", "const a = () => { const xs = [0]; const c: readonly number[] = xs; Promise.reject(new Error(\"x\")).catch(() => { xs.push(1); }); return () => c.length; };"),
  A("h9-cb-then-nested-mut", "const a = () => { const r: { readonly t: Mut<number[]> } = { t: [0] }; Promise.resolve(0).then(() => { r.t.push(1); }); return () => r.t.length; };"),
  A("h9-cb-map-set", "const a = () => { const xs = [0]; const m = new Map<string, () => void>(); m.set(\"k\", () => { xs.push(1); }); const c: readonly number[] = xs; return { m, f: () => c.length }; };"),
  A("h9-cb-sort", "const a = () => { const xs = [0]; const c: readonly number[] = xs; [2, 1].sort((p, q) => { xs.push(1); return p - q; }); return () => c.length; };"),
  // 4. iterators and generators held or returned
  A("h9-it-held", "const a = () => { const it = [1, 2].values(); return () => it.next().value; };"),
  A("h9-it-gen-helper", "const a = function* () { const xs = [0]; const mk = function* () { yield 1; xs.push(1); }; yield () => xs.length; yield* mk(); };"),
  A("h9-it-gen-object", "const a = () => { const xs = [0]; const mk = function* () { yield 1; xs.push(1); }; const g = mk(); g.next(); const c: readonly number[] = xs; return () => { g.next(); return c.length; }; };"),
  A("h9-it-values-across", "const a = function* () { const xs = [1, 2, 3]; const it = xs.values(); yield it.next().value ?? 0; yield it.next().value ?? 0; };"),
  // 5. actions, listeners and state
  A("h9-ev-action-mut", "const s = () => state(0);\nconst a = (s: State<number>) => { const xs = [0]; const c: readonly number[] = xs; return { go: action(() => { xs.push(1); s.set(1); }), f: () => c.length }; };"),
  A("h9-ev-update-fn", "const s = () => state<readonly number[]>([0]);\nconst a = (s: State<readonly number[]>) => action(() => s.update((l) => [...l, 1]));"),
  // 6. finally, recursion, default parameters, getters
  A("h9-fl-finally", "const a = function* () { const xs = [0]; const c: readonly number[] = xs; try { yield () => c.length; } finally { xs.push(1); } };"),
  A("h9-fl-gen-recursion", "const a = function* () { const xs = [0]; function* g(n: number): Generator<number> { xs.push(n); yield n; if (n > 0) yield* g(n - 1); } const c: readonly number[] = xs; yield () => c.length; yield* g(2); };"),
  A("h9-fl-default-mut", "const a = () => { const xs = [0]; return (k: number = xs.length) => k; };"),
  A("h9-fl-getter", "const a = () => { const xs = [0]; return { get n() { return xs.length; } }; };"),
  A("h9-fl-label-loop", "const a = function* () { const xs = [0]; const c: readonly number[] = xs; outer: for (let i = 0; i < 2; i++) { xs.push(i); yield () => c.length; continue outer; } };"),
  A("h9-fl-sync-after-await-gen", "const a = async function* () { const xs = [0]; const c: readonly number[] = xs; yield () => c.length; await null; xs.push(1); yield 2; };"),
  // 7. what R accepts and that writes nothing published
  A("h9-pr-prev-time", "const a = function* (now: Clock) { let t = now(); for (let i = 0; i < 3; i++) { const t1 = now(); yield t1 - t; t = t1; } };"),
  A("h9-pr-loop-body", "const a = function* () { for (let k = 0; k < 3; k++) { const xs = [k]; xs.push(1); yield xs; } };"),
  A("h9-pr-copy-let", "const a = () => { let n = 0; n += 1; const k = n; return () => k; };"),
  A("h9-pr-plain-const", "const a = () => { const xs = [0]; xs.push(1); const c: readonly number[] = xs; return () => c.length; };"),
];
