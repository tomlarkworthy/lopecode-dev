const ST = "const s = () => state<() => number>(() => -1);\nconst lg = () => state(-1);\nconst v = (s: () => number) => s;\nconst w = (lg: number) => lg;\nconst k = () => 1;\n";
export const srcs: [string, string][] = [
  ["sw-mut-direct", "const k = () => 1;\nconst a = (k: number) => { const xs = [0]; switch (k) { case 0: function h() { xs.push(1); return xs.length; } break; default: return h; } return h; };"],
  ["sw-alias", "const k = () => 1;\nconst a = (k: number) => { const xs = [0]; const c: readonly number[] = xs; switch (k) { case 0: function h() { return c.length; } break; default: return h; } return h; };"],
  ["sw-P", ST + "const put = (s: State<() => number>, lg: State<number>, k: number) => ({ go: action(() => { const xs = [0]; const c: readonly number[] = xs; switch (k) { case 0: function f() { return c.length; } break; default: s.set(f); lg.set(f()); xs.push(1); } }) });"],
  ["sw-decl-plain", "const a = () => { function h() { return 1; } return h; };"],
];
