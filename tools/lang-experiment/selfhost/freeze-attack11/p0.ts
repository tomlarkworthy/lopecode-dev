const ACT = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\n`;
export const srcs: [string, string][] = [
  ["w-opt-num-str", `const g = () => { const r = { n: 1, go: 5 }; const o: { readonly n: number } = r; const p: { readonly n: number; readonly go?: string } = o; return p.go ?? "none"; };`],
  ["w-values", `const g = () => { const r = { s: "x", n: 1 }; const o: { readonly n: number } = r; return Object.values(o).map((v) => v + 1); };`],
  ["w-entries", `const g = () => { const r = { s: "x", n: 1 }; const o: { readonly n: number } = r; return Object.entries(o).map(([k, v]) => v + 1); };`],
  ["w-spread", `const g = () => { const r = { s: "x", n: 1 }; const o: { readonly n: number } = r; const q = { ...o }; return q; };`],
  ["act-opt-fn", ACT + `const g = (a: Action<[]>) => { const r = { go: a, n: 1 }; const o: { readonly n: number } = r; const p: { readonly n: number; readonly go?: () => void } = o; if (p.go) p.go(); return 1; };`],
  ["act-unknown", ACT + `const g = (a: Action<[]>) => { const o: { readonly n: number } = { go: a, n: 1 }; const u: unknown = o; return 1; };`],
  ["act-ret", ACT + `const g = (a: Action<[]>) => { const r = { go: a, n: 1 }; const o: { readonly n: number } = r; return o; };\nconst k = (g: { readonly n: number; readonly go?: () => void }) => { if (g.go) g.go(); return 2; };`],
  ["state-hide", `const c = (): StateCell<number> => state(0);\nconst g = (c: State<number>) => { const r = { s: c, n: 1 }; const o: { readonly n: number } = r; return o; };`],
  ["json", `const g = () => { const r = { s: "x", n: 1 }; const o: { readonly n: number } = r; return JSON.stringify(o); };`],
];
