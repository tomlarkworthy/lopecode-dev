const P = (name: string, src: string) => ({ name, src });
export const progs = [
  P("hoist-sep", "const a = function* () { const r = { g }; yield r; const late = [0]; late.push(9); yield 2; function g(): number { return late.length; } };"),
  P("hoist-sep-sync", "const a = () => { const late = [0]; late.push(9); return { g }; function g(): number { return late.length; } };"),
  P("hoist-early-ret", "const a = () => { const r = { g }; const late = [0]; late.push(9); return r; function g(): number { return late.length; } };"),
  P("hoist-helper-async", "const a = () => { const r = { g }; const late = [0]; const h = async () => { for (let i = 0; i < 300; i++) await null; late.push(9); }; h(); return r; function g(): number { return late.length; } };"),
  P("arrow-before", "const a = () => { const late = [0]; const g = () => late.length; late.push(9); return { g }; };"),
  P("arrow-helper-async-after", "const a = () => { const late = [0]; const h = async () => { for (let i = 0; i < 300; i++) await null; late.push(9); }; h(); const g = () => late.length; return { g }; };"),
];
