export const srcs: [string, string][] = [
  ["delete-plain-literal-ann", `const g = () => { const m: { n: number } = { n: 1 }; delete m.n; return typeof m.n; };`],
  ["delete-unann", `const g = () => { const m = { n: 1 }; delete m.n; return typeof m.n; };`],
  ["delete-idx-member", `const g = () => { const m: { [k: string]: number; n: number } = { n: 1 }; delete m.n; return typeof m.n; };`],
  ["delete-idx-computed", `const g = () => { const m: { n: number; [k: string]: number } = { n: 1 }; const k = "n"; delete m[k]; return typeof m.n; };`],
  ["async-pp-local", `const g = async () => { const f = async (): Promise<Promise<number>> => Promise.resolve(5); const x = await f(); return typeof x; };`],
  ["async-pp-await-inside", `const g = async () => { const f = async (): Promise<Promise<number>> => { const p = Promise.resolve(5); return p; }; const x = await f(); return typeof x; };`],
  ["pp-type-ok", `const g = async () => { const f = (): Promise<Promise<number>> => Promise.resolve(Promise.resolve(5)); const x = await f(); return typeof x; };`],
];
