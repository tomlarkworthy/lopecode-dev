export const srcs: [string, string][] = [
  ["i-capture", "const put = () => { const xs = [0]; const i: readonly number[] = xs; const f = () => i.length; return { f }; };"],
  ["i-two-captures", "const put = () => { const xs = [0]; const i: readonly number[] = xs; const k = 1; const f = () => i.length + k; return { f }; };"],
  ["i-method", "const put = () => { const xs = [0]; const i: readonly number[] = xs; const o = { m() { return i.length; } }; return o; };"],
  ["i-fn-decl", "const put = () => { const xs = [0]; const i: readonly number[] = xs; function f() { return i.length; } return { f }; };"],
  ["i-loop", "const put = () => { const rows = [[0], [1]]; const fs = rows.map((i) => () => i.length); return { fs }; };"],
  ["i-generator", "const g = function* () { while (true) { const xs = [0]; const i: readonly number[] = xs; yield { f: () => i.length }; } };"],
];
