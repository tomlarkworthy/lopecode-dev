const S = "const s = () => state<() => number>(() => 0);\n";
export const srcs: [string, string][] = [
  ["act-set-then-write", S + "const put = (s: State<() => number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; s.set(() => c.length); xs.push(1); }) });"],
  ["act-set-then-write-read", S + "const put = (s: State<() => number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; const f = () => c.length; s.set(f); const before = f(); xs.push(1); return before - read(s)(); }) });"],
  ["act-callact-then-write", S + "const put = (s: State<() => number>) => action((f: () => number) => { s.set(f); });\nconst go = (put: Action<[() => number]>) => action(() => { const xs = [0]; const c: readonly number[] = xs; put(() => c.length); xs.push(1); });"],
  ["act-update-then-write", S + "const put = (s: State<() => number>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; s.update(() => () => c.length); xs.push(1); }) });"],
  ["act-set-data-then-write", "const s = () => state<readonly number[]>([]);\nconst put = (s: State<readonly number[]>) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; s.set(c); xs.push(1); }) });"],
  ["memo-obj-param", "const f = () => memo((o: object) => 1);"],
  ["memo-unknown-param", "const f = () => memo((o: unknown) => 1);"],
  ["memo-rec-param", "const f = () => memo((o: { readonly n: number }) => o.n);"],
  ["gen-yield-fn-then-write-in-finally", "const g = function* () { const xs = [0]; const c: readonly number[] = xs; try { yield () => c.length; } finally { xs.push(1); } };"],
  ["async-cell-then", "const a = async () => { const xs = [0]; const c: readonly number[] = xs; const p = Promise.resolve(() => c.length); xs.push(1); return p; };"],
];
