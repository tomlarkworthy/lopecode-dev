const ST = "const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\n";
const body = (b: string) => `const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { const ls = lg.set; ${b} }) });`;
const SP = "const xs = [0]; const c: readonly number[] = xs; const f = () => c.length;";
export const srcs: [string, string][] = [
  ["async-cell-action", ST + "const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });\nconst a = async (put0: Action<[() => number]>) => { " + SP + " put0(f); await null; xs.push(1); return 0; };"],
  ["async-cell-action-noarg", ST + "const put0 = (s: State<() => number>) => action(() => { s.set(() => 1); });\nconst a = async (put0: Action<[]>) => { " + SP + " put0(); await null; xs.push(1); return 0; };"],
  ["cell-destr-set", ST + "const a = (s: State<() => number>) => { " + SP + " const { set } = s; set(f); xs.push(1); return 0; };"],
  ["foreach-param-write", ST + body(`${SP} s.set(f); ls(f()); [xs].forEach((y) => { y.push(1); });`)],
  ["forof-after", ST + body(`${SP} s.set(f); ls(f()); for (const y of [xs]) y.push(1);`)],
  ["getset-helper", ST + body(`const getSet = () => s.set; ${SP} getSet()(f); ls(f()); xs.push(1);`)],
  ["method-dupkey-set", ST + body(`const k = 1; const st = s.set; ${SP} const o = { m() { return k; }, m: f }; st(o.m); ls(o.m()); xs.push(1);`)],
  ["listener", "const tick = function* () { yield 1; };\n" + ST + "const put = (s: State<() => number>, lg: State<number>) => action((k: number) => { const ls = lg.set; const st = s.set; const xs = [k]; const c: readonly number[] = xs; const f = () => c.length; st(f); ls(f()); xs.push(k); });\nconst l = (tick: Events<number>, put: Action<[number]>) => on(tick, put);"],
  ["jsx", ST + "const el = (s: State<() => number>, lg: State<number>) => <button onClick={action(() => { const ls = lg.set; const st = s.set; " + SP + " st(f); ls(f()); xs.push(1); })}>x</button>;"],
  ["iife-mut", ST + body(`${SP} s.set(f); ls(f()); ((y: Mut<number[]>) => { y.push(1); })(xs);`)],
  ["alias-in-block", ST + body(`${SP} s.set(f); ls(f()); { const ys = xs; ys.push(1); }`)],
  ["alias-before-write-after", ST + body(`${SP} const ys = xs; s.set(f); ls(f()); ys.push(1);`)],
  ["ternary-alias", ST + body(`${SP} s.set(f); ls(f()); const ys = xs.length > 5 ? [9] : xs; ys.push(1);`)],
  ["rec-destr-after", ST + body(`const xs = [0]; const r0 = { t: xs }; const c: readonly number[] = xs; const f = () => c.length; s.set(f); ls(f()); const { t } = r0; t.push(1);`)],
];
