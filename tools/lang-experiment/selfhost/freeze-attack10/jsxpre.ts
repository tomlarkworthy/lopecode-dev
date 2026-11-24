const U = `"https://x.test/"`;
export const srcs: [string, string][] = [
  ["comp-prop", `const r = async (fetch: Fetch) => { const res = await fetch(${U}); const C = (p: { readonly x: FetchResponse }) => <div>{p.x.ok ? "y" : "n"}</div>; return <div><C x={res} /></div>; };`],
  ["comp-empty", `const r = async (fetch: Fetch) => { const res = await fetch(${U}); const c: {} = res; const C = (p: { readonly x: {} }) => <div>{typeof p.x}</div>; return <div><C x={c} /></div>; };`],
  ["local-h-jsx", `const g = () => { const h = (t: string) => t.length; return [h("ab"), <div />].length; };`],
  ["param-h-jsx", `const g = () => { const f = (h: number) => <div>{h}</div>; return f(1); };`],
  ["local-cast-nested", `const g = () => { const a = cast<number>(1); const f = () => { const cast = 5; return cast; }; return (a.ok ? a.value : 0) + f(); };`],
  ["action-arg-pass", `const s = () => state(0);\nconst a = (s: State<number>) => action((x: FetchResponse) => s.set(x.status));\nconst b = async (fetch: Fetch, a: Action<[FetchResponse]>) => { const res = await fetch(${U}); a(res); return 1; };`],
  ["action-param-empty-state", `const s = () => state<{ readonly c: {} } | null>(null);\nconst a = (s: State<{ readonly c: {} } | null>) => action((x: {}) => s.set({ c: x }));`],
  ["action-param-resp-state", `const s = () => state<{ readonly c: {} } | null>(null);\nconst a = (s: State<{ readonly c: {} } | null>) => action((x: FetchResponse) => { const c: {} = x; s.set({ c }); });`],
];
