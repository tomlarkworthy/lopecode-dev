const I = "const inp = () => [0];\n";
const P = "const a = (inp: readonly number[]) => { ";
export const srcs: [string, string][] = [
  ["union-fn-call", I + P + "const f = (y: Mut<number[]>) => { y.push(1); }; const g: ((y: readonly number[]) => void) | ((y: Mut<number[]>) => void) = f; g(inp); return 0; };"],
  ["union-fn-call2", I + P + "const f = (y: Mut<number[]>) => { y.push(1); }; const g: ((y: Mut<number[]>) => void) | ((y: readonly number[]) => void) = f; g(inp); return 0; };"],
  ["union-fn-cond", I + P + "const f = (y: Mut<number[]>) => { y.push(1); }; const h = (y: readonly number[]) => {}; const g = inp.length > 0 ? f : h; g(inp); return 0; };"],
  ["union-fn-cond-rev", I + P + "const f = (y: Mut<number[]>) => { y.push(1); }; const h = (y: readonly number[]) => {}; const g = inp.length > 0 ? h : f; g(inp); return 0; };"],
  ["union-fn-arr", I + P + "const f = (y: Mut<number[]>) => { y.push(1); }; const h = (y: readonly number[]) => {}; const gs = [h, f]; gs[1](inp); return 0; };"],
  ["union-fn-arr-ann", I + P + "const f = (y: Mut<number[]>) => { y.push(1); }; const h = (y: readonly number[]) => {}; const gs = [h, f]; for (const g of gs) g(inp); return 0; };"],
  ["union-fn-rec", I + P + "const f = (y: Mut<number[]>) => { y.push(1); }; const h = (y: readonly number[]) => {}; const o = inp.length > 0 ? { g: f } : { g: h }; o.g(inp); return 0; };"],
  ["union-fn-or", I + P + "const f = (y: Mut<number[]>) => { y.push(1); }; const h = (y: readonly number[]) => {}; const g = (inp.length > 5 && h) || f; g(inp); return 0; };"],
  ["union-fn-nullish", I + P + "const f = (y: Mut<number[]>) => { y.push(1); }; const h: ((y: readonly number[]) => void) | null = null; const g = h ?? f; g(inp); return 0; };"],
  ["union-fn-cross", I + "const a = () => { const f = (y: Mut<number[]>) => { y.push(1); return 1; }; const h = (y: readonly number[]) => 0; return [h, f] as const; };\nconst b = (a, inp: readonly number[]) => a[1](inp);"],
  ["union-fn-cross-arr", I + "const a = () => { const f = (y: Mut<number[]>) => { y.push(1); return 1; }; const h = (y: readonly number[]) => 0; return [h, f]; };\nconst b = (a, inp: readonly number[]) => a[1](inp);"],
  ["union-fn-cross-cond", I + "const a = (inp: readonly number[]) => { const f = (y: Mut<number[]>) => { y.push(1); return 1; }; const h = (y: readonly number[]) => 0; return inp.length > 0 ? f : h; };\nconst b = (a, inp: readonly number[]) => a(inp);"],
];
