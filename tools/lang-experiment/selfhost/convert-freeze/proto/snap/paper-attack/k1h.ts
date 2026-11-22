const P = (name: string, src: string) => ({ name, src });
const W = "for (let i = 0; i < 300; i++) await null; ";
export const progs = [
  P("bnd-canon", `const a = () => { const xs = [1]; const h = async () => { ${W}xs.push(2); }; h(); return xs; };\nconst b = (a: number[]) => () => a.length;`),
  P("bnd-canon-unann", `const a = () => { const xs = [1]; const h = async () => { ${W}xs.push(2); }; h(); return xs; };\nconst b = (a) => () => a.length;`),
  P("bnd-canon-probe", `const a = () => { const xs = [1]; return xs; };\nconst b = (a) => { const z: string = a; return z; };`),
  P("bnd-mut-input", `const a = () => { const xs = [1]; return xs; };\nconst b = (a) => { a.push(1); return 1; };`),
  P("bnd-factory", `const mk = () => () => { const xs = [1]; const h = async () => { ${W}xs.push(2); }; h(); return xs; };\nconst b = (mk: () => number[]) => { const r = mk(); return () => r.length; };`),
  P("bnd-factory-probe", `const mk = () => () => { const xs = [1]; return xs; };\nconst b = (mk) => { const z: string = mk; return z; };`),
  P("bnd-factory-mut-use", `const mk = () => () => { const xs = [1]; return xs; };\nconst b = (mk) => { const r = mk(); r.push(2); return r.length; };`),
  P("bnd-factory-shared", `const mk = () => { const xs = [1]; const get = (): Mut<number[]> => xs; return get; };\nconst b = (mk: () => number[]) => 1;`),
  P("bnd-async", `const a = async () => { const xs = [1]; const h = async () => { ${W}xs.push(2); }; h(); return xs; };\nconst b = (a: number[]) => () => a.length;`),
  P("bnd-gen", `const a = function* () { const xs = [1]; const h = async () => { ${W}xs.push(2); }; h(); yield xs; };\nconst b = (a: number[]) => () => a.length;`),
  P("bnd-fn-contra", `const keep = () => (x: number[]): number[] => x;\nconst b = (keep: (m: Mut<number[]>) => number[]) => { const xs = [1]; const r = keep(xs); const h = async () => { ${W}xs.push(2); }; h(); return () => r.length; };`),
  P("bnd-fn-co", `const id = () => (m: Mut<number[]>): Mut<number[]> => m;\nconst b = (id: (m: Mut<number[]>) => number[]) => { const xs = [1]; const r = id(xs); const h = async () => { ${W}xs.push(2); }; h(); return () => r.length; };`),
  P("cb-launder", "const a = () => { const xs = [1]; const f3 = (v: number, i: number, arr?: number[]): number[] => arr ?? []; const g: (v: number, i: number) => number[] = f3; const r = xs.map(g)[0]; xs.push(2); return r === undefined ? 0 : r.length; };"),
  P("helper-ret-probe", "const a = () => { const mk = () => [1]; const z: string = mk; return z; };"),
  P("async-helper-all", "const a = async () => { const mk = async () => [1]; const rs = await Promise.all([mk()]); const z: string = rs; return z; };"),
];
