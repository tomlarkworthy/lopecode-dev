export const srcs: [string, string][] = [
  ["sync-cell-promise-input", `const p = () => Promise.resolve(5);\nconst g = (p: Promise<number>) => typeof p;`],
  ["sync-cell-promise-input-unann", `const p = () => Promise.resolve(5);\nconst g = (p) => typeof p;`],
  ["then-cb-number", `const g = async () => { const f = async (): Promise<Promise<number>> => Promise.resolve(5); return await f().then((v: number) => typeof v); };`],
  ["pp-cell-input-unann", `const p = async (): Promise<Promise<number>> => Promise.resolve(5);\nconst g = (p) => typeof p;`],
];
