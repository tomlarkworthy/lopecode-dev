import type { Attack } from "./harness.ts";
const A = (name: string, src: string, show = ["a"]): Attack => ({ name, src, show });
const G = "const g = mut({ t: mut([1]), n: 0 });";
export const attacks: Attack[] = [
  A("push-arg-freeze-self", "const a = () => {\n  const m = mut([1]);\n  m.push(freeze(m).length);\n  return 1;\n};"),
  A("push-arg-freeze-self-let", "const a = () => {\n  const m = mut([1]);\n  let fr: readonly number[] = [];\n  m.push((fr = freeze(m)).length);\n  return fr;\n};"),
  A("member-assign-rhs-freeze", "const a = () => {\n  const m = mut([1]);\n  m[0] = freeze(m).length + 5;\n  return 1;\n};"),
  A("member-assign-rhs-freeze-group", "const a = () => {\n  " + G + "\n  g.n = freeze(g).t.length + 5;\n  return 1;\n};"),
  A("field-push-arg-freeze-group", "const a = () => {\n  " + G + "\n  g.t.push(freeze(g).t.length);\n  return 1;\n};"),
  A("helper-callee-arg-freeze", "const a = () => {\n  const m = mut([1]);\n  const h = (q: readonly number[]) => { const n = q.length; m.push(2); return [n, q.length]; };\n  return h(freeze(m));\n};"),
  A("lend-then-freeze-via-capture-of-frozen-in-helper", "const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, n: number) => { p.push(2); return n; };\n  return f(m, freeze(m).length);\n};"),
  A("lend-then-freeze-in-nested-arg", "const a = () => {\n  const m = mut([1]);\n  const id = (q: readonly number[]) => q;\n  const f = (p: Mut<number[]>, q: readonly number[]) => { const n = q.length; p.push(2); return [n, q.length]; };\n  return f(m, id(freeze(m)));\n};"),
  A("lend-then-freeze-in-array-arg", "const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, qs: readonly (readonly number[])[]) => { const n = qs[0]?.length; p.push(2); return [n, qs[0]?.length]; };\n  return f(m, [freeze(m)]);\n};"),
  A("lend-then-freeze-in-record-arg", "const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, r: { readonly q: readonly number[] }) => { const n = r.q.length; p.push(2); return [n, r.q.length]; };\n  return f(m, { q: freeze(m) });\n};"),
  A("lend-then-freeze-conditional", "const c = () => true;\nconst a = (c: boolean) => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, q: readonly number[]) => { const n = q.length; p.push(2); return [n, q.length]; };\n  return f(m, c ? freeze(m) : []);\n};"),
  A("lend-then-freeze-new-expression", "const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, q: readonly number[]) => { const n = q.length; p.push(2); return [n, q.length]; };\n  const r = f(m, freeze(m));\n  return { r };\n};"),
  A("lend-twice-frozen-into-cell-value-keeps", "const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, q: readonly number[]) => { p.push(2); return q; };\n  return f(m, freeze(m));\n};\nconst b = (a: readonly number[]) => a.length;", ["a", "b"]),
  A("group-lent-then-field-frozen", "type G = Mut<{ t: Mut<number[]>; n: number }>;\nconst a = () => {\n  " + G + "\n  const f = (p: G, q: { readonly t: readonly number[]; readonly n: number }) => { const n0 = q.n; p.n = 7; p.t.push(2); return [n0, q.n, q.t.length]; };\n  return f(g, freeze(g));\n};"),
  A("freeze-in-default-param-of-helper-call", "const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, q: readonly number[] = []) => { p.push(2); return q; };\n  return f(m);\n};"),
];
