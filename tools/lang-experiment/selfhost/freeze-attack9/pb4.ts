export const srcs: [string, string][] = [
  ["negzero-from-zero", `const g = () => { const z: 0 = 0; const x: -0 = z; return x; };`],
  ["negzero-lit", `const g = () => { const x: -0 = 0; return x; };`],
  ["inf-from-null", `const g = () => { const x: 1e400 = null; return x; };`],
  ["inf-type", `const g = () => { const x: 1e400 = 1e400; return typeof x; };`],
];
