export const srcs: [string, string][] = [
  ["syntax-error", `const g = () => { return 1 +; };`],
  ["eval-name", `const eval = () => 1;`],
  ["arguments-name", `const arguments = () => 1;`],
  ["eval-param", `const g = (eval: number) => 1;`],
  ["let-name", `const let = () => 1;`],
  ["await-name", `const await = () => 1;`],
  ["yield-name", `const yield = () => 1;`],
  ["undefined-name", `const undefined = () => 1;\nconst g = (undefined: number) => undefined;`],
  ["NaN-name", `const NaN = () => 1;\nconst g = (NaN: number) => NaN + 1;`],
  ["Infinity-name", `const Infinity = () => 2;\nconst g = (Infinity: number) => Infinity;`],
];
