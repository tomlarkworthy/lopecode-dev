const PR = "const pr = () => { const box: { res?: (v: readonly number[]) => void } = {}; const p = new Promise<readonly number[]>((res) => { box.res = res; }); return { p, box }; };\n";
const PRT = "{ readonly p: Promise<readonly number[]>; readonly box: { readonly res?: (v: readonly number[]) => void } }";
const PRF = "const pr = () => { const box: { res?: (v: () => number) => void } = {}; const p = new Promise<() => number>((res) => { box.res = res; }); return { p, box }; };\n";
const PRFT = "{ readonly p: Promise<() => number>; readonly box: { readonly res?: (v: () => number) => void } }";
export const srcs: [string, string][] = [
  ["pr-cell", PR],
  ["pr-data-action", PR + "const lg = () => state(-1);\nconst put = (pr: " + PRT + ", lg: State<number>) => ({ go: action(() => { const xs = [0]; pr.box.res?.(xs); lg.set(xs.length); xs.push(1); }) });\nconst v = async (pr: " + PRT + ") => (await pr.p).length;"],
  ["pr-fn-action", PRF + "const lg = () => state(-1);\nconst put = (pr: " + PRFT + ", lg: State<number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; pr.box.res?.(f); lg.set(f()); xs.push(1); }) });\nconst v = async (pr: " + PRFT + ") => (await pr.p)();"],
  ["pr-data-async-cell", PR + "const a = async (pr: " + PRT + ") => { const xs = [0]; const before = xs.length; pr.box.res?.(xs); xs.push(1); await null; return before; };\nconst v = async (pr: " + PRT + ") => (await pr.p).length;"],
  ["pr-data-cell", PR + "const a = (pr: " + PRT + ") => { const xs = [0]; const before = xs.length; pr.box.res?.(xs); xs.push(1); return before; };\nconst v = async (pr: " + PRT + ") => (await pr.p).length;"],
  ["pr-data-gen", PR + "const a = function* (pr: " + PRT + ") { const xs = [0]; pr.box.res?.(xs); yield xs.length; xs.push(1); };\nconst v = async (pr: " + PRT + ") => (await pr.p).length;"],
  ["pr-resolver-local", "const a = () => { const xs = [0]; const box: { res?: (v: readonly number[]) => void } = {}; const p = new Promise<readonly number[]>((res) => { box.res = res; }); box.res?.(xs); xs.push(1); return { p }; };"],
  ["shadow-ss_closure", "const put = () => { const ss_closure = <F,>(f: F, t: (i: number) => unknown): F => f; const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; return { f }; };"],
  ["bigint-key", "const put = () => { const xs = [0]; const c: readonly number[] = xs; const o = { 1n() { return c.length; } }; return o; };"],
  ["memo-result-fn-pub", "const g = () => memo((n: number) => ({ f: () => n }));\nconst a = (g: (n: number) => { readonly f: () => number }) => g(1);\nconst s = () => state<{ readonly f: () => number }>({ f: () => -1 });\nconst put = (a: { readonly f: () => number }, s: State<{ readonly f: () => number }>) => ({ go: action(() => { s.set(a); }) });"],
  ["memo-in-cell-result", "const a = () => { const g = memo((n: number) => ({ f: () => n })); return g(1); };\nconst s = () => state<{ readonly f: () => number }>({ f: () => -1 });\nconst put = (a: { readonly f: () => number }, s: State<{ readonly f: () => number }>) => ({ go: action(() => { s.set(a); }) });"],
  ["listener-on", "const ev = function* (): Generator<number> { yield 1; };\nconst lg = () => state(-1);\nconst put = (lg: State<number>) => action((n: number) => { lg.set(n); });\nconst l = (ev: Events<number>, put: Action<[number]>) => on(ev, put);"],
];
