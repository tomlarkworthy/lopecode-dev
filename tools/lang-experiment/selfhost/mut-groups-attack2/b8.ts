import type { Attack } from "./harness.ts";
const A = (name: string, src: string, show = ["gen", "r"]): Attack => ({ name, src, show });
const R = "\nconst r = (gen: readonly number[]) => gen.length;";
export const attacks: Attack[] = [
  A("yield-in-member-assign-rhs", "const gen = function* () {\n  const m = mut([1]);\n  m[0] = (yield freeze(m)) === undefined ? 9 : 8;\n};" + R),
  A("yield-in-push-arg", "const gen = function* () {\n  const m = mut([1]);\n  m.push((yield freeze(m)) === undefined ? 9 : 8);\n};" + R),
  A("yield-in-push-arg-then-more", "const gen = function* () {\n  const m = mut([1]);\n  m.push((yield freeze(m)) === undefined ? 9 : 8);\n  yield [0];\n};" + R),
  A("yield-in-lend-arg", "const gen = function* () {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, x: unknown) => { p.push(2); return 0; };\n  f(m, yield freeze(m));\n};" + R),
  A("yield-in-group-field-push", "const gen = function* () {\n  const g = mut({ t: mut([1]), n: 0 });\n  g.t.push((yield freeze(g).t) === undefined ? 9 : 8);\n};" + R),
  A("yield-in-group-n-assign", "const gen = function* () {\n  const g = mut({ t: mut([1]), n: 0 });\n  g.n = (yield freeze(g)) === undefined ? 9 : 8;\n};\nconst r = (gen: { readonly t: readonly number[]; readonly n: number }) => gen.n;"),
  A("member-assign-let-observe", "const a = () => {\n  const m = mut([1]);\n  let fr: readonly number[] = [];\n  m[0] = (fr = freeze(m)).length + 5;\n  return fr;\n};", ["a"]),
  A("group-assign-let-observe", "const a = () => {\n  const g = mut({ t: mut([1]), n: 0 });\n  let fr: { readonly t: readonly number[]; readonly n: number } = { t: [], n: 0 };\n  g.n = (fr = freeze(g)).t.length + 5;\n  g.t.push((fr = freeze(g)).n);\n  return fr;\n};", ["a"]),
  A("group-field-push-let-observe", "const a = () => {\n  const g = mut({ t: mut([1]), n: 0 });\n  let fr: { readonly t: readonly number[]; readonly n: number } = { t: [], n: 0 };\n  g.t.push((fr = freeze(g)).t.length);\n  return fr;\n};", ["a"]),
  A("await-in-push-arg", "const a = async () => {\n  const m = mut([1]);\n  let fr: readonly number[] = [];\n  m.push(await Promise.resolve((fr = freeze(m)).length));\n  return fr;\n};", ["a"]),
];
