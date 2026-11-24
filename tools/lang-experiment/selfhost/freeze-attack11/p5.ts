const kw = "this super null true false new typeof void delete in instanceof class enum export extends import return switch case default break continue do while for if else try catch finally throw var let const function with debugger yield await static implements interface package private protected public arguments eval async of get set type declare namespace module abstract readonly keyof infer is asserts unique never unknown any symbol object string number boolean bigint undefined NaN Infinity".split(" ");
export const srcs: [string, string][] = [
  ...kw.map((k) => [`kw-${k}`, `const ${k} = () => 5;\nconst g = () => 6;`] as [string, string]),
  ["this-param", `const g = (this: number) => 1;`],
  ["this-param-fn", `const g = () => { const f = function (this: number) { return 1; }; return 1; };`],
  ["mapped-annot-cell", `const g = () => { const v: { readonly [K in "a"]: number } = { a: 1 }; return v.a; };`],
  ["mapped-annot-cell-opt", `const g = () => { const v: { [K in "valueOf"]?: number } = {}; return typeof v.valueOf; };`],
  ["mapped-req-use", `type W = { [K in "valueOf"]: number };\nconst g = () => { const v: W = { valueOf: 1 }; return v.valueOf; };`],
  ["mapped-req-use2", `type W = { [K in "a" | "b"]: number };\nconst g = () => { const v: W = { a: 1 }; return v; };`],
  ["mapped-keyof", `type R = { readonly a: number };\ntype W = { [K in keyof R]: string };\nconst g = () => { const v: W = { a: "x" }; return v; };`],
  ["viewof-cell", `const viewof = () => 1;`],
  ["mutable-cell", `const mutable = () => 1;`],
  ["viewof-x", "viewof x = 1"],
  ["mutable-x", "mutable x = 1"],
  ["viewof-param", `const g = (viewof: number) => 1;`],
  ["x-viewof-key", `const g = () => ({ viewof: 1, mutable: 2 });`],
];
