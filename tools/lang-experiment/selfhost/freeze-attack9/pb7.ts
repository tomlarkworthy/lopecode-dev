export const srcs: [string, string][] = [
  ["pp-await-typed-promise", `const g = async () => { const f = async (): Promise<Promise<number>> => Promise.resolve(5); const x: Promise<number> = await f(); return 1; };`],
  ["pp-await-typed-number", `const g = async () => { const f = async (): Promise<Promise<number>> => Promise.resolve(5); const n: number = await f(); return n; };`],
  ["gen-await-typed-promise", `const g = async () => { const f = async <T,>(x: T) => x; const y: Promise<number> = await f(Promise.resolve(5)); return 1; };`],
  ["gen-await-typed-number", `const g = async () => { const f = async <T,>(x: T) => x; const y: number = await f(Promise.resolve(5)); return y; };`],
  ["pp-then-method", `const g = async () => { const f = async (): Promise<Promise<number>> => Promise.resolve(5); const x = await f(); return x.then((v: number) => v + 1); };`],
];
