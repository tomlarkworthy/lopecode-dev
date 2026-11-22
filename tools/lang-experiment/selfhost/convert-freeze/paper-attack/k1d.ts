const P = (name: string, src: string) => ({ name, src });
export const progs = [
  P("cb3-inline", "const a = () => { const xs = [1]; const ys = xs.map((v, i, arr) => arr); return 1; };"),
  P("cb3-opt-named", "const a = () => { const xs = [1]; const f = (v: number, i: number, arr?: number[]): number[] => arr ?? []; const ys = xs.map(f); const r = ys[0]; xs.push(2); return r === undefined ? 0 : r.length; };"),
  P("cb3-rest", "const a = () => { const xs = [1]; const f = (...args: unknown[]): unknown => args[2]; const ys = xs.map(f); const r = ys[0]; xs.push(2); return JSON.stringify(r); };"),
  P("cb3-rest-inline", "const a = () => { const xs = [1]; const ys = xs.map((...args: unknown[]) => args[2]); xs.push(2); return JSON.stringify(ys); };"),
  P("cb3-foreach-rest", "const a = () => { const m = new Map<string, number>(); const out: unknown[] = []; const f = (...args: unknown[]): void => { }; m.forEach(f); return 1; };"),
  P("cb4-reduce-rest", "const a = () => { const xs = [1]; const r = xs.reduce((acc: unknown, ...rest: unknown[]) => rest[2], null as unknown); return 1; };"),
  P("cb4-reduce-opt", "const a = () => { const xs = [1]; const f = (acc: unknown, v: number, i: number, arr?: number[]): unknown => arr; const r = xs.reduce(f, 0); xs.push(2); return JSON.stringify(r); };"),
  P("sort-cmp-rest", "const a = () => { const xs = [3, 1]; xs.sort((...a: number[]) => 0); return 1; };"),
  P("union-flow-plain", "const p = () => [5];\nconst a = (p: number[]) => { const xs = [1]; const r = p.length > 9 ? p : xs; const s: number[] = r; return s.length; };"),
  P("union-field", "const a = () => { const xs = [1]; const o: { t: Mut<number[]> | number[] } = { t: xs }; const r = o.t; xs.push(2); return r.length; };"),
  P("reduce-acc-push", "const a = () => { const r = [1, 2].reduce((acc: Mut<number[]>, v) => { acc.push(v); return acc; }, []); return r.length; };"),
  P("reduce-acc-push2", "const a = () => { const init: number[] = []; const r = [1, 2].reduce((acc, v) => [...acc, v], init); return r.length; };"),
  P("promise-then-plain", "const a = async () => { const mk = async (m: Mut<number[]>): Promise<Mut<number[]>> => m; const xs = [1]; const r = await mk(xs).then((v: number[]) => v); xs.push(2); return r.length; };"),
  P("async-infer-ret", "const a = async () => { const mk = async (m: Mut<number[]>) => m; const xs = [1]; const p = mk(xs); const z: string = p; return z; };"),
];
