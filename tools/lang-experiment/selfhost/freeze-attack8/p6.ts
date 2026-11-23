// shadowed prelude names: does the checker give a local the prelude meaning while the run time calls the local?
export const srcs: [string, string][] = [
  ["snapshot-shadow-write", "const b = (a: readonly number[]) => { const snapshot = <T,>(v: T): T => v; const ys = snapshot(a); ys.push(1); return 0; };\nconst a = () => [0];"],
  ["structuredClone-shadow-write", "const b = (a: readonly number[]) => { const structuredClone = <T,>(v: T): T => v; const ys = structuredClone(a); ys.push(1); return 0; };\nconst a = () => [0];"],
  ["array-shadow-from", "const b = (a: readonly number[]) => { const Array = { from: <T,>(v: T): T => v }; const ys = Array.from(a); ys.push(1); return 0; };\nconst a = () => [0];"],
  ["slice-not-shadowable", "const b = (a: readonly number[]) => { const ys = a.slice(); ys.push(1); return ys.length; };\nconst a = () => [0];"],
  ["action-shadow-capture-mut", "const put = () => { const action = <F,>(f: F): F => f; const xs = [0]; const c: readonly number[] = xs; return { f: () => c.length, go: action(() => { xs.push(1); }) }; };"],
  ["memo-shadow-capture-mut", "const put = () => { const memo = <F,>(f: F): F => f; const xs = [0]; const c: readonly number[] = xs; return { f: () => c.length, go: memo((n: number) => { xs.push(n); return n; }) }; };"],
  ["state-shadow", "const s = () => { const state = <T,>(v: T): T => v; return state([0]); };\nconst w = (s: readonly number[]) => s.length;"],
  ["map-shadow-new", "const a = () => { const Map = Set; const m = new Map<number>(); return m; };"],
];
