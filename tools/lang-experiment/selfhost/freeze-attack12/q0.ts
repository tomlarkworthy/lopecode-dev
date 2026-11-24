const ACT = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\n`;
export const srcs: [string, string][] = [
  ["void-ret-action", ACT + `const g = (a: Action<[]>) => { const k: () => void = () => ({ go: a }); const r = k(); return 1; };`],
  ["void-ret-fn", `const g = () => { const k: () => void = () => ({ go: () => 2 }); const r = k(); return 1; };`],
  ["void-to-unknown", ACT + `const g = (a: Action<[]>) => { const k: () => void = () => a; const u: unknown = k(); return 1; };`],
  ["spread-exact", `const g = () => { const o = { n: 1, f: "s" }; const o2: { readonly n: number } = o; const o3: { readonly n: number; readonly f?: number } = { ...o2 }; return o3.f ?? 0; };`],
  ["rest-exact", `const g = () => { const o = { n: 1, m: 2, f: "s" }; const o2: { readonly n: number; readonly m: number } = o; const { m, ...r } = o2; const o3: { readonly n: number; readonly f?: number } = r; return o3.f ?? 0; };`],
  ["index-unknown-fn", `const g = () => { const o = { n: 1, f: () => 2 }; const r: { readonly [k: string]: unknown } = o; return 1; };`],
  ["index-unknown-iter", `const g = () => { const o = { it: [1, 2].values() }; const r: { readonly [k: string]: unknown } = o; return r; };`],
  ["unknown-iter", `const g = () => { const u: unknown = [1, 2].values(); return u; };`],
  ["unknown-iter-arr", `const g = () => { const u: readonly unknown[] = [[1, 2].values()]; return u; };`],
  ["id-explicit", `const g = () => { const id = <T,>(x: T): T => x; const c = id<{ readonly n: number }>({ n: 1, f: () => 2 }); return c.n; };`],
  ["cond-union", `const g = (b: boolean) => { const c = b ? { n: 1 } : { n: 2, f: () => 3 }; return c.n; };\nconst b = () => true;`],
  ["arr-lit-union", `const g = () => { const xs = [{ n: 1 }, { n: 2, f: () => 3 }]; return xs.length; };`],
  ["partial", `type P = Partial<{ a: number }>;\nconst g = () => 1;`],
  ["readonly-t", `type P = Readonly<{ a: number }>;\nconst g = () => 1;`],
  ["record-t", `const g = () => { const r: Record<string, number> = { a: 1 }; return r.a; };`],
  ["callsig-target", `interface F { (): number; readonly n: number }\ninterface G { (): number; readonly n: number; readonly h: () => string }\nconst g = () => 1;`],
];
