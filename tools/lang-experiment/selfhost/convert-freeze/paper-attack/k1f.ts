const P = (name: string, src: string) => ({ name, src });
export const progs = [
  P("hoist-yield-between", "const a = function* () { const r = { g }; yield r; const late = [0]; yield 1; late.push(9); yield 2; function g(): number { return late.length; } };"),
  P("hoist-await-between", "const a = async () => { const r = { g }; const late = [0]; const p = Promise.resolve(r); await null; late.push(9); return p; function g(): number { return late.length; } };"),
  P("hoist-yield-noinit", "const a = function* () { const late = [0]; const r = { g }; yield r; late.push(9); yield 2; function g(): number { return late.length; } };"),
];
