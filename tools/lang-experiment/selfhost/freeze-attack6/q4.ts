const P = "const a = (inp: readonly number[]) => { const xs = [0]; const c: readonly number[] = xs; ";
const I = "const inp = () => [0];\n";
export const srcs: [string, string][] = [
  ["gen-apply-cb-first", I + P + "const ap = <T,>(f: (y: T) => void, x: T) => f(x); ap((y: Mut<number[]>) => { y.push(1); }, inp); return 0; };"],
  ["gen-apply-data-first", I + P + "const ap = <T,>(x: T, f: (y: T) => void) => f(x); ap(inp, (y: Mut<number[]>) => { y.push(1); }); return 0; };"],
  ["gen-apply-unann", I + P + "const ap = <T,>(x: T, f: (y: T) => void) => f(x); ap(inp, (y) => { y.push(1); }); return 0; };"],
  ["gen-apply-tuple", I + P + "const ap = <T,>(p: readonly [T, (y: T) => void]) => p[1](p[0]); ap([inp, (y: Mut<number[]>) => { y.push(1); }]); return 0; };"],
  ["gen-explicit-mut", I + P + "const ap = <T,>(x: T, f: (y: T) => void) => f(x); ap<Mut<number[]>>(inp, (y) => { y.push(1); }); return 0; };"],
  ["gen-ret-fn", I + P + "const mk = <T,>(x: T) => (f: (y: T) => void) => f(x); mk(inp)((y: Mut<number[]>) => { y.push(1); }); return 0; };"],
  ["union-param", I + P + "const f = (y: Mut<number[]> | number) => { if (typeof y !== 'number') y.push(1); }; const g: (y: readonly number[] | number) => void = f; g(inp); return 0; };"],
  ["union-fn", I + P + "const f = (y: Mut<number[]>) => { y.push(1); }; const g: ((y: readonly number[]) => void) | ((y: Mut<number[]>) => void) = f; return 0; };"],
  ["overload-rec", I + P + "const f = (y: Mut<number[]>) => { y.push(1); }; const g: { (y: readonly number[]): void } = f; g(inp); return 0; };"],
  ["rec-call-sig-exposed", "const a = () => { const o = (y: Mut<number[]>) => { y.push(1); return y.length; }; return o; };\nconst inp = () => [0];\nconst b = (a: (y: number[]) => number, inp: readonly number[]) => a(inp);"],
  ["unann-consumer-of-mutparam", "const a = () => (y: Mut<number[]>) => { y.push(1); return y.length; };\nconst inp = () => [0];\nconst b = (a, inp) => a(inp);"],
  ["unann-consumer-snapshot", "const a = () => (y: Mut<number[]>) => { y.push(1); return y.length; };\nconst inp = () => [0];\nconst b = (a, inp) => a(snapshot(inp));"],
  ["param-of-param-mut-ret", "const a = () => (cb: (g: () => Mut<number[]>) => void) => cb(() => [0]);"],
  ["param-of-param-inferred-ret", "const a = () => { const id = (x: Mut<number[]>) => x; return (cb: (g: (x: Mut<number[]>) => readonly number[]) => void) => cb(id); };"],
  ["cb-receives-mut-of-param", "const a = () => (xs: Mut<number[]>, cb: (x: Mut<number[]>) => void) => cb(xs);\nconst inp = () => [0];\nconst b = (a: (xs: Mut<number[]>, cb: (x: Mut<number[]>) => void) => void, inp: readonly number[]) => { a(inp, (x) => { x.push(1); }); return 0; };"],
  ["consumer-unann-cb-mut", "const a = () => (cb: (x: Mut<number[]>) => void) => { const xs = [0]; cb(xs); return xs.length; };\nconst b = (a) => a((x) => { x.push(1); });"],
  ["helper-decl-capture", "const a = () => { const xs = [0]; function g() { return xs.length; } return () => g(); };"],
  ["helper-second-name", "const a = () => { const xs = [0]; const g = () => xs.length; const k = g; return () => k(); };"],
  ["helper-in-array", "const a = () => { const xs = [0]; const g = () => xs.length; const gs = [g]; return () => gs[0](); };"],
  ["helper-map-arg", "const a = () => { const xs = [0]; const g = (n: number) => xs.length + n; return () => [1].map(g)[0]; };"],
];
