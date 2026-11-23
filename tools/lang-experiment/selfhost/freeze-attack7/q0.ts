const ST = "const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\n";
const body = (b: string) => `const put = (s: State<() => number>, lg: State<number>) => ({ go: action(() => { ${b} }) });`;
const SP = "const xs = [0]; const c: readonly number[] = xs; const f = () => c.length;";
const P0 = "const put0 = (s: State<() => number>) => action((g: () => number) => { s.set(g); });\n";
const bodyA = (b: string) => `const put = (put0: Action<[() => number]>, lg: State<number>) => ({ go: action(() => { ${b} }) });`;
export const srcs: [string, string][] = [
  ["set-before", ST + body(`const st = s.set; ${SP} st(f); lg.set(f()); xs.push(1);`)],
  ["update-before", ST + body(`const up = s.update; ${SP} up(() => f); lg.set(f()); xs.push(1);`)],
  ["destr-set", ST + body(`${SP} const { set } = s; set(f); lg.set(f()); xs.push(1);`)],
  ["computed-set", ST + body(`${SP} s['set'](f); lg.set(f()); xs.push(1);`)],
  ["act-annot-local", ST + P0 + bodyA(`${SP} const g: (h: () => number) => void = put0; g(f); lg.set(f()); xs.push(1);`)],
  ["act-annot-before", ST + P0 + bodyA(`const g: (h: () => number) => void = put0; ${SP} g(f); lg.set(f()); xs.push(1);`)],
  ["act-rec-local", ST + P0 + bodyA(`const o: { readonly g: (h: () => number) => void } = { g: put0 }; ${SP} o.g(f); lg.set(f()); xs.push(1);`)],
  ["act-arr-local", ST + P0 + bodyA(`const gs: readonly ((h: () => number) => void)[] = [put0]; ${SP} gs[0]?.(f); lg.set(f()); xs.push(1);`)],
  ["act-producer-cell", ST + P0 + "const wrap = (put0: Action<[() => number]>): { readonly g: (h: () => number) => void } => ({ g: put0 });\nconst put = (wrap: { readonly g: (h: () => number) => void }, lg: State<number>) => ({ go: action(() => { " + SP + " wrap.g(f); lg.set(f()); xs.push(1); }) });"],
  ["act-producer-fn", ST + P0 + "const wrap = (put0: Action<[() => number]>): ((h: () => number) => void) => put0;\nconst put = (wrap: (h: () => number) => void, lg: State<number>) => ({ go: action(() => { " + SP + " wrap(f); lg.set(f()); xs.push(1); }) });"],
  ["alias-after", ST + body(`${SP} s.set(f); lg.set(f()); const ys = xs; ys.push(1);`)],
  ["alias-after-mut", ST + body(`${SP} s.set(f); lg.set(f()); const ys: Mut<number[]> = xs; ys.push(1);`)],
  ["getter-after", ST + body(`${SP} const get = () => xs; s.set(f); lg.set(f()); get().push(1);`)],
  ["foreach-loop", ST + body(`${SP} [0, 1].forEach((i) => { if (i === 1) xs.push(1); if (i === 0) { s.set(f); lg.set(f()); } });`)],
  ["foreach-named", ST + body(`${SP} const pub = (h: () => number) => { s.set(h); }; [f].forEach(pub); lg.set(f()); xs.push(1);`)],
  ["opt-call-helper", ST + body(`${SP} const wr = () => { xs.push(1); }; s.set(f); lg.set(f()); wr?.();`)],
  ["replace-cb", ST + body(`${SP} 'a'.replace('a', () => { s.set(f); return ''; }); lg.set(f()); xs.push(1);`)],
  ["record-helper", ST + body(`${SP} const o = { pub: (h: () => number) => { s.set(h); } }; o.pub(f); lg.set(f()); xs.push(1);`)],
  ["method-dup", "const a = () => { const k = 1; const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; const o = { m() { return k; }, ...{ m: f } }; return o; };"],
  ["method-dupkey", "const a = () => { const k = 1; const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; const o = { m() { return k; }, m: f }; return o; };"],
];
