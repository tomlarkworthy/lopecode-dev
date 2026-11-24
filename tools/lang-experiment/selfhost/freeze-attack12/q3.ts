export const srcs: [string, string][] = [
  ["elem-type", `const g = () => { const e = <div />; const z: string = e; return 1; };`],
  ["iter-type", `const g = () => { const e = [1].values(); const z: string = e; return 1; };`],
  ["gen-type", `const g = () => { function* mk() { yield 1; } const e = mk(); const z: string = e; return 1; };`],
  ["resp-type", `const g = async (fetch: Fetch) => { const e = await fetch("https://x.test/"); const z: string = e; return 1; };`],
  ["promise-type", `const g = () => { const e = Promise.resolve(1); const z: string = e; return 1; };`],
  ["values-type", `const g = () => { const e = Object.values({ n: 1, f: () => 2 }); const z: string = e; return 1; };`],
  ["entries-type", `const g = () => { const e = Object.entries({ n: 1, f: () => 2 }); const z: string = e; return 1; };`],
  ["catch-type", `const g = () => { try { throw new Error("x"); } catch (e) { const z: string = e; } return 1; };`],
  ["events-type", `function* t() { yield 1; }\nconst g = (t: Events<number>) => { const z: string = t; return 1; };`],
];
