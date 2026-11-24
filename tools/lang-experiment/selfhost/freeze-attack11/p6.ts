export const srcs: [string, string][] = [
  ["min-action-template", `const c = (): StateCell<number> => state(0);\nconst a = (c: State<number>) => action(() => c.set(1));\nconst g = (a: Action<[]>) => \`\${{ toString: a }}\`;`],
  ["min-then-async", `const g = async () => { const x = { n: 1, then: (r: (v: string) => void) => r("s") }; const o: { readonly n: number } = x; return o; };`],
  ["min-fn-name", `const g = () => { const v: { readonly name?: number } = (x: number) => x; return typeof v.name; };`],
  ["min-scope", `const g = (x: number) => { { const f = () => x + 1; const x = "s"; return f(); } };`],
  ["min-json", `const g = () => JSON.stringify(undefined);`],
  ["min-resp", `const r = async (fetch: Fetch) => { const res = await fetch("https://x.test/"); const x = { n: 1, res }; const o: { readonly n: number } = x; return o; };`],
  ["min-mapped", `type W = { readonly [K in "a"]: number };`],
  ["min-this", `const this = () => 5;`],
];
