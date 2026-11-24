export const srcs: [string, string][] = [
  ["then-await-type", `const g = async () => { const v = await Object.fromEntries([["then", (r: (v: string) => void) => r("s")]]); const z: number = v; return 1; };`],
  ["jsonparse-type", `const g = () => { const v = JSON.parse("1"); const z: number = v; return 1; };`],
  ["gen-type", `const g = async function* () { yield Object.fromEntries([["then", (r: (v: string) => void) => r("s")]]); };\nconst h = (g: number) => g;`],
];
