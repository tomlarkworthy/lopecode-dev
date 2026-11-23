const B = "type B<T> = { readonly v: T };\n";
const nest = (k: number, inner: string) => { let t = inner; for (let i = 0; i < k; i++) t = `B<${t}>`; return t; };
const val = (k: number, inner: string) => { let t = inner; for (let i = 0; i < k; i++) t = `{ v: ${t} }`; return t; };
export const srcs: [string, string][] = [
  ["or1-id-capture", "const a = () => { const id = (x: Mut<number[]>) => x; return () => { const m = [0]; return id(m).length; }; };"],
  ["or1-fix", "const a = () => { const id = (x: Mut<number[]>) => x; const c: (x: Mut<number[]>) => number[] = id; return () => { const m = [0]; return c(m).length; }; };"],
  ["or2-usp-fix", "const a = () => { const u = new URLSearchParams('a=1'); const c: URLSearchParams = u.slice(); return () => c.toString(); };"],
  ["or2-usp-fix2", "const a = () => { const u = new URLSearchParams('a=1'); const c: URLSearchParams = new URLSearchParams(u.toString()); return () => c.toString(); };"],
  ["or2-usp-plain", "const a = () => { const c = new URLSearchParams('a=1'); return () => c.get('a'); };"],
  ["or3-deep13", B + `const a = () => { const t: ${nest(13, "readonly number[]")} = ${val(13, "[1]")}; return () => (t ? 1 : 0); };`],
  ["or4-record", "const a = () => { const t: Record<string, readonly number[]> = { k: [1] }; return () => t['k']?.length ?? 0; };"],
  ["or4-record-fix", "const a = () => { const t0: Record<string, readonly number[]> = { k: [1] }; const t: Readonly<Record<string, readonly number[]>> = t0; return () => t['k']?.length ?? 0; };"],
  ["or5-union-same", "const a = (n: number) => { const g = n > 0 ? (y: readonly number[]) => 1 : (y: readonly number[]) => 2; return g([1]); };\nconst n = () => 1;"],
  ["or5-union-ret", "const a = (n: number) => { const g = n > 0 ? (y: readonly number[]) => 1 : (y: readonly number[]) => 'x'; return g([1]); };\nconst n = () => 1;"],
  ["or6-events-readonly-rec", "const tick = function* () { yield { k: 1 }; };\nconst s = () => state(0);\nconst put = (s: State<number>) => action((e: { readonly k: number }) => { s.set(e.k); });\nconst l = (tick: Events<{ readonly k: number }>, put: Action<[{ readonly k: number }]>) => on(tick, put);"],
  ["or6-events-rec", "const tick = function* () { yield { k: 1 }; };\nconst s = () => state(0);\nconst put = (s: State<number>) => action((e: { k: number }) => { s.set(e.k); });\nconst l = (tick: Events<{ k: number }>, put: Action<[{ k: number }]>) => on(tick, put);"],
  ["or7-reduce-arr", "const a = () => [1, 2].reduce((acc: readonly number[], v) => [...acc, v], [] as readonly number[]);"],
  ["or7-reduce-arr2", "const a = () => { const e: readonly number[] = []; return [1, 2].reduce((acc: readonly number[], v: number) => [...acc, v], e); };"],
  ["or8-generic-closure", "const a = () => { const mk = <T,>(x: T) => () => x; return mk(1)(); };"],
  ["or8-generic-closure-fix", "const a = () => { const mk = <T,>(x: T) => { const c = [x]; return () => c[0]; }; return mk(1)(); };"],
  ["or9-mut-local-captured-readonly-fix", "const a = () => { const xs = [0]; const c: number[] = xs; return () => c.length; };"],
  ["or10-ta-fix", "const a = () => { const u = new Uint8Array(2); const c: Uint8Array = u.slice(); return () => c[0]; };"],
];
