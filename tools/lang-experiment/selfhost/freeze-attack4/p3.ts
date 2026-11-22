const R = "const r: { readonly t: Mut<number[]> } = { t: [0] }; ";
const CW = "\nconst c = (a: { m: () => Mut<number[]> }) => { a.m().push(1); return 0; };";
export const srcs: [string, string][] = [
  ["computed-method", "const a = () => { " + R + "return { [\"m\"](): Mut<number[]> { return r.t; } }; };" + CW],
  ["computed-arrow", "const a = () => { " + R + "return { [\"m\"]: (): Mut<number[]> => r.t }; };" + CW],
  ["string-method", "const a = () => { " + R + "return { \"m\"(): Mut<number[]> { return r.t; } }; };" + CW],
  ["dup-method", "const a = () => { " + R + "return { m(): Mut<number[]> { return [9]; }, m(): Mut<number[]> { return r.t; } }; };" + CW],
  ["fn-decl", "const a = () => { " + R + "function m(): Mut<number[]> { return r.t; } return { m }; };" + CW],
  ["alias-M", "type M = Mut<number[]>;\nconst a = () => { const r: M = [0]; return { m: (): M => r }; };" + CW],
  ["union-M", "const a = () => { const r: Mut<number[]> | null = [0]; return { m: (): Mut<number[]> => r ?? [] }; };" + CW],
  ["id-M", "type Id<T> = T;\nconst a = () => { const r: Id<Mut<number[]>> = [0]; return { m: (): Mut<number[]> => r }; };" + CW],
  ["generic-ext", "const a = () => { const mk = <T extends number[]>(x: T) => () => x; const xs = [0]; return { m: mk(xs) }; };" + CW],
  ["generic-ext2", "const a = () => { const mk = <T extends number[]>(x: T): { m: () => T } => ({ m: () => x }); const xs = [0]; return mk(xs); };" + CW],
  ["catch-bind", "const a = () => { try { throw 1; } catch (e) { " + R + "return { m: (): Mut<number[]> => r.t }; } };" + CW],
  ["box-n", "const a = () => { const r: { readonly b: Mut<{ n: number }> } = { b: { n: 0 } }; return { inc: () => { r.b.n++; return r.b.n; }, m: () => r.b.n }; };"],
  ["array-of-fns", "const a = () => { " + R + "const fs = [(): Mut<number[]> => r.t]; return { m: fs[0] ?? (() => [0]) }; };" + CW],
  ["map-of-fns", "const a = () => { " + R + "const fs = new Map([[\"m\", (): Mut<number[]> => r.t]]); return fs; };"],
  ["action-body", "const a = () => { " + R + "return { go: action(() => { r.t.push(1); }), f: () => r.t.length }; };"],
  ["helper-local", "const a = () => { const mk = () => { " + R + "return (): Mut<number[]> => r.t; }; return { m: mk() }; };" + CW],
  ["helper-param", "const a = () => { const mk = (r: { readonly t: Mut<number[]> }) => (): Mut<number[]> => r.t; return { m: mk({ t: [0] }) }; };" + CW],
  ["inner-made-on-call", "const a = () => { " + R + "return { m: () => (): Mut<number[]> => r.t }; };\nconst c = (a: { m: () => () => Mut<number[]> }) => { a.m()().push(1); return 0; };"],
  ["typeof", "const a = () => { const xs = [0]; const r: typeof xs = [0]; return { m: () => r }; };" + CW],
  ["inc-self", "const a = () => { const r: { readonly b: Mut<{ n: number }> } = { b: { n: 0 } }; return () => { r.b.n++; return r.b.n; }; };"],
];
