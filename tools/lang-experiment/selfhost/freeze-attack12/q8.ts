const ACT = `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\n`;
const U = `"https://x.test/"`;
export const srcs: [string, string][] = [
  ["promise-void-cell", `const g = async (fetch: Fetch): Promise<void> => { const res = await fetch(${U}); return res; };`],
  ["void-cell", `const g = (): void => { return 1; };`],
  ["void-cell-fn", `const g = (): void => () => 1;`],
  ["void-cell-iter", `const g = (): void => [1].values();`],
  ["promise-object", `const g = () => { const u: object = Promise.resolve(1); return u; };`],
  ["promise-object-ret", `const g = (): object => Promise.resolve("s");`],
  ["promise-unknown-ret", `const g = (): unknown => Promise.resolve("s");`],
  ["fn-object-ret", `const g = (): object => () => 1;`],
  ["fn-unknown-ret", `const g = (): unknown => () => 1;`],
  // JSX
  ["jsx-prop-width", `const g = () => { const B = (p: { readonly v: { readonly n: number } }) => <span>{p.v.n}</span>; const o = { n: 1, f: () => 2 }; return <B v={o} />; };`],
  ["jsx-prop-void", `const g = (fetch: Fetch) => { const B = (p: { readonly v: () => void }) => <span>x</span>; return <B v={() => 1} />; };`],
  ["jsx-child-fn", `const g = () => <span>{() => 1}</span>;`],
  ["jsx-key-fn", `const g = () => { const B = (p: { readonly s: string }) => <span>{p.s}</span>; return <B s="x" key={() => 1} />; };`],
  ["jsx-children-prop", `const g = () => { const B = (p: { readonly children: readonly string[] }) => <span>{p.children}</span>; const xs = [1].values(); return <B>{xs}</B>; };`],
  // state content / update / action args / events yield
  ["state-width-fn", `const s = () => state<{ readonly n: number }>({ n: 1, f: () => 2 });`],
  ["state-void-fn", `const s = () => { const f: () => void = () => [1].values(); return state({ v: f() }); };`],
  ["update-width", `const s = () => state<{ readonly n: number }>({ n: 1 });\nconst w = (s: State<{ readonly n: number }>) => action(() => s.update((v) => ({ n: v.n, f: () => 2 })));`],
  ["update-void", `const s = () => state<{ readonly v: void }>({ v: undefined });\nconst w = (s: State<{ readonly v: void }>) => action(() => { const f: () => void = () => [1].values(); s.set({ v: f() }); });`],
  ["action-arg-width", ACT + `const w = () => action((r: { readonly n: number }) => {});\nconst x = (w: Action<[{ readonly n: number }]>) => action(() => w({ n: 1, f: () => 2 }));`],
  ["action-arg-void", ACT + `const w = () => action((r: void) => {});\nconst x = (w: Action<[void]>) => action(() => { const f: () => void = () => [1].values(); w(f()); });`],
  ["events-yield-width", `function* t(): Generator<{ readonly n: number }> { yield { n: 1, f: () => 2 }; }`],
  ["events-yield-void", `function* t(): Generator<void> { const f: () => void = () => [1].values(); yield f(); }`],
  ["async-promise-n", `const g = async (): Promise<{ readonly n: number }> => ({ n: 1, f: () => 2 });`],
  ["async-promise-n-promise", `const g = async (): Promise<{ readonly n: number }> => { const o = { n: 1, p: Promise.resolve(2) }; return o; };`],
  ["memo-result-width", `const g = () => { const m = memo((k: number): { readonly n: number } => ({ n: k, f: () => 2 })); return m(1).n; };`],
  ["memo-result-void", `const g = () => { const m = memo((k: number): void => [k].values()); return 1; };`],
  // takesRecord early return: target with call signature
  ["callsig-takes-fn", `interface F { (): number }\nconst g = () => { const f: F = () => 1; return f(); };`],
  ["callsig-iface-extra", `interface F { (): number; readonly n?: number }\nconst g = () => { const f: F = () => 1; return f.n ?? 0; };`],
  ["callsig-name", `interface F { (x: number): number; readonly name?: number }\nconst g = () => { const f: F = (x: number) => x; return typeof f.name; };`],
  ["callsig-length", `interface F { (x: number): number; readonly length?: string }\nconst g = () => { const f: F = (x: number) => x; return typeof f.length; };`],
  ["callsig-rec-literal", `type F = { (): number; readonly n: number };\nconst g = () => 1;`],
  // guard
  ["set-as-callback", `const s = () => state(0);\nconst g = (s: State<number>) => [1].map(s.set);`],
  ["set-as-value", `const s = () => state(0);\nconst g = (s: State<number>) => { const f = s.set; return 1; };`],
  ["compile-island", `const g = async (compile: Compile) => { const r = await compile("x"); return 1; };`],
];
