const P = (name: string, src: string) => ({ name, src });
export const progs = [
  P("url-sp", "const a = () => { const u = new URL('https://x.test/?q=1'); const sp = u.searchParams; u.search = '?q=2'; return sp.get('q'); };"),
  P("url-probe", "const a = () => { const u = new URL('https://x.test/?q=1'); const z: string = u; return z; };"),
  P("arrfrom-mut-elems", "const a = () => { const g: Mut<Mut<number[]>[]> = [[1]]; const r = Array.from(g); const z: string = r; return z; };"),
  P("concat-elems", "const a = () => { const g: Mut<Mut<number[]>[]> = [[1]]; const r = g.concat([]); const z: string = r; return z; };"),
  P("obj-values", "const a = () => { const g: Mut<{ [k: string]: Mut<number[]> }> = { k: [1] }; const r = Object.values(g); const z: string = r; return z; };"),
  P("set-forEach-rest", "const a = () => { const s = new Set<number>(); s.add(1); const f = (...args: unknown[]): void => {}; s.forEach(f); return 1; };"),
  P("ta-cb-opt", "const a = () => { const t = new Float32Array(2); const f = (v: number, i: number, arr?: Float32Array): number => 0; const u = t.map(f); return u[0]; };"),
];
