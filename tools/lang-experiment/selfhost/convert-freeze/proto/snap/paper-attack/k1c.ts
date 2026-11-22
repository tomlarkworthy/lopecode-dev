const P = (name: string, src: string) => ({ name, src });
export const progs = [
  P("re-local-replace", "const a = () => { const re = /a/g; return 'aa'.replace(re, 'b'); };"),
  P("re-inline-replace", "const a = () => 'aa'.replace(/a/g, 'b');"),
  P("re-local-probe", "const a = () => { const re = /a/g; const z: string = re; return z; };"),
  P("re-cell-replace", "const re = () => /a/g;\nconst a = (re: RegExp) => 'aa'.replaceAll(re, 'b');"),
  P("gen-mut-iter", "const a = () => { const xs = [1]; const g = function* (): Generator<Mut<number[]>> { yield xs; }; return 1; };"),
  P("iterable-co", "const a = () => { const g: Mut<Mut<number[]>[]> = [[1]]; const it: Iterable<number[]> = g.values(); const z: string = it; return z; };"),
  P("state-arg", "const a = (state: unknown) => 1;"),
  P("ta-sort-ret", "const a = () => { const t = new Float32Array(2); const r = t.sort(); t[0] = 1; return r[0]; };"),
  P("ta-values", "const a = () => { const t = new Float32Array(2); const it = t.values(); t[0] = 1; return [...it][0]; };"),
  P("ab-mut", "const a = () => { const b = new ArrayBuffer(8); const v = new Float32Array(b); const w = new Float32Array(b); w[0] = 1; return v[0]; };"),
  P("ab-mut-probe", "const a = () => { const b = new ArrayBuffer(8); const v = new Float32Array(b); const z: string = v; return z; };"),
  P("ab-write-via-v", "const a = () => { const b = new ArrayBuffer(8); const v = new Float32Array(b); v[0] = 1; return 1; };"),
  P("fn-param-rec", "const a = () => { const keep = (x: { t: number[] }) => x.t; const f: (m: Mut<{ t: Mut<number[]> }>) => number[] = keep; const g: Mut<{ t: Mut<number[]> }> = { t: [1] }; const r = f(g); g.t.push(2); return r.length; };"),
  P("fn-in-record", "const a = () => { const keep = (x: number[]): number[] => x; const o: { f: (m: Mut<number[]>) => number[] } = { f: keep }; const xs = [1]; const r = o.f(xs); xs.push(2); return r.length; };"),
  P("fn-arg", "const a = () => { const keep = (x: number[]): number[] => x; const ap = (f: (m: Mut<number[]>) => number[], m: Mut<number[]>) => f(m); const xs = [1]; const r = ap(keep, xs); xs.push(2); return r.length; };"),
];
