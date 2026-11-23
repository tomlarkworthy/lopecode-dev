// lead a: a kept closure over an assignable binding that is not spelled let
const V = "\nconst v = (put: { readonly f: () => number }) => put.f();";
const C = (b: string) => `const put = () => { ${b} };` + V;
export const srcs: [string, string][] = [
  ["helper-param-assign", C("const mk = (n: number) => { const f = () => n; const bump = () => { n = n + 1; }; return { f, bump }; }; return mk(1);")],
  ["helper-param-incr", C("const mk = (n: number) => ({ f: () => n, bump: () => { n++; } }); return mk(1);")],
  ["helper-param-pluseq", C("const mk = (n: number) => ({ f: () => n, bump: () => { n += 1; } }); return mk(1);")],
  ["helper-param-nullish", C("const mk = (n: number | null) => ({ f: () => n ?? 0, bump: () => { n ??= 5; } }); return mk(null);")],
  ["helper-param-destr", C("const mk = ({ n }: { n: number }) => ({ f: () => n, bump: () => { n = 2; } }); return mk({ n: 1 });")],
  ["helper-param-rest", C("const mk = (...ns: number[]) => ({ f: () => ns.length, bump: () => { ns = [1, 2, 3]; } }); return mk(1);")],
  ["helper-param-arr-destr-assign", C("const mk = (n: number) => ({ f: () => n, bump: () => { [n] = [7]; } }); return mk(1);")],
  ["helper-param-obj-destr-assign", C("const mk = (n: number) => ({ f: () => n, bump: () => { ({ n } = { n: 7 }); } }); return mk(1);")],
  ["helper-param-forof", C("const mk = (n: number) => ({ f: () => n, bump: () => { for (n of [7]) {} } }); return mk(1);")],
  ["helper-param-arr", C("const mk = (a: readonly number[]) => ({ f: () => a.length, bump: () => { a = [1, 2]; } }); return mk([0]);")],
  ["cell-param-assign", "const k = () => 1;\nconst put = (k: number) => { const f = () => k; const bump = () => { k = k + 1; }; return { f, bump }; };" + V],
  ["fn-decl-param", C("function mk(n: number) { return { f: () => n, bump: () => { n = n + 1; } }; } return mk(1);")],
  ["catch-param", C("try { throw 1; } catch (e) { let _ = 0; } const mk = () => { try { throw 1; } catch (e) { const f = () => (typeof e === 'number' ? e : 0); const bump = () => { e = 9; }; return { f, bump }; } }; return mk();")],
  ["fn-decl-name", C("function g() { return 1; } const f = () => g(); const bump = () => { g = () => 2; }; return { f, bump };")],
  ["var", C("var n = 1; const f = () => n; const bump = () => { n = 2; }; return { f, bump };")],
  ["let-control", C("let n = 1; const f = () => n; const bump = () => { n = 2; }; return { f, bump };")],
  ["loop-let", C("const fs: (() => number)[] = []; for (let i = 0; i < 1; i++) { fs.push(() => i); } return { f: () => 1 };")],
  ["param-in-action", C("const mk = (n: number) => ({ f: () => n, bump: action(() => { n = n + 1; }) }); return mk(1);")],
  ["gen-param", "const put = function* () { const mk = (n: number) => { const f = () => n; return { f, bump: () => { n = 5; } }; }; yield mk(1); };" + V],
  ["param-assign-in-body", C("const mk = (n: number) => { const f = () => n; n = 3; return { f }; }; return mk(1);")],
];
