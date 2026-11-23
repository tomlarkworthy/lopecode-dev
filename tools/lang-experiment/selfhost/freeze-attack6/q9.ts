export const srcs: [string, string][] = [
  ["or4-fix-msg", "const a = () => { const t: Record<string, readonly number[]> = { k: [1] }; const c: { [k: string]: number[] } = t; return () => c['k']?.length ?? 0; };"],
  ["or6-bound", "const tick = function* () { const e: { readonly k: number } = { k: 1 }; yield e; };\nconst s = () => state(0);\nconst put = (s: State<number>) => action((e: { readonly k: number }) => { s.set(e.k); });\nconst l = (tick: Events<{ readonly k: number }>, put: Action<[{ readonly k: number }]>) => on(tick, put);"],
  ["or6-ann-gen", "const tick = function* (): Generator<{ readonly k: number }> { yield { k: 1 }; };\nconst s = () => state(0);\nconst put = (s: State<number>) => action((e: { readonly k: number }) => { s.set(e.k); });\nconst l = (tick: Events<{ readonly k: number }>, put: Action<[{ readonly k: number }]>) => on(tick, put);"],
  ["or7-reduce-num", "const a = () => [1, 2].reduce((acc: number, v: number) => acc + v, 0);"],
  ["or7-reduce-arr-ann", "const a = () => { const e: readonly number[] = []; return [1, 2].reduce<readonly number[]>((acc, v) => [...acc, v], e); };"],
  ["or10-ta-readonly-copy", "const a = () => { const u = new Uint8Array(2); const c: Uint8Array = u.slice(); return () => c[0]; };"],
  ["or10-ta-alias-of-copy", "const a = () => { const u = new Uint8Array(2); const k = u.slice(); const c: Uint8Array = k; return () => c[0]; };"],
];
