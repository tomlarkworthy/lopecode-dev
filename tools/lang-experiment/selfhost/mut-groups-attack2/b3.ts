import type { Attack } from "./harness.ts";
const G = "const g = mut({ t: mut([1]), n: 0 });";
const TG = "type G = Mut<{ t: Mut<number[]>; n: number }>;\n";
const A = (name: string, src: string, show = ["a"]): Attack => ({ name, src, show });
const GEN = "const gen = function* () {\n  const m = mut([1]);\n  yield borrow(m);\n  m.push(2);\n  yield borrow(m);\n  m.push(3);\n  yield borrow(m);\n};\n";
const GGEN = "const gen = function* () {\n  " + G + "\n  yield borrow(g.t);\n  g.t.push(2);\n  yield borrow(g.t);\n};\n";
export const attacks: Attack[] = [
  A("borrow-reader-returns-it", GEN + "const r = (gen: Borrowed<number[]>) => gen;", ["r"]),
  A("borrow-reader-readonly-returns-it", GEN + "const r = (gen: readonly number[]) => gen;", ["r"]),
  A("borrow-reader-plain-returns-it", GEN + "const r = (gen: number[]) => gen;", ["r"]),
  A("borrow-reader-wraps", GEN + "const r = (gen: readonly number[]) => ({ v: gen });", ["r"]),
  A("borrow-reader-array", GEN + "const r = (gen: readonly number[]) => [gen];", ["r"]),
  A("borrow-reader-closure", GEN + "const r = (gen: readonly number[]) => () => gen.length;", ["r"]),
  A("borrow-reader-map-value", GEN + "const r = (gen: readonly number[]) => new Map([[\"k\", gen]]);", ["r"]),
  A("borrow-reader-unknown", GEN + "const r = (gen: unknown) => gen;", ["r"]),
  A("borrow-reader-untyped", GEN + "const r = (gen) => gen;", ["r"]),
  A("borrow-group-field-reader-returns", GGEN + "const r = (gen: readonly number[]) => gen;", ["r"]),
  A("borrow-reader-via-identity", GEN + "const r = (gen: readonly number[]) => {\n  const id = <T,>(x: T): T => x;\n  return id(gen);\n};", ["r"]),
  A("borrow-reader-concat-self", GEN + "const r = (gen: readonly number[]) => [gen].flat(0);", ["r"]),
  A("borrow-reader-object-values", GEN + "const r = (gen: readonly number[]) => Object.values({ a: gen });", ["r"]),
  A("borrow-reader-third-cell", GEN + "const r = (gen: readonly number[]) => gen.length;\nconst s = (gen: readonly number[], r: number) => ({ gen, r });", ["s"]),
  A("borrow-map", "const gen = function* () {\n  const m = mut(new Map<string, number>());\n  yield borrow(m);\n  m.set(\"a\", 1);\n  yield borrow(m);\n};\nconst r = (gen: ReadonlyMap<string, number>) => gen;", ["r"]),
  A("borrow-map-plain", "const gen = function* () {\n  const m = mut(new Map<string, number>());\n  yield borrow(m);\n  m.set(\"a\", 1);\n  yield borrow(m);\n};\nconst r = (gen: Map<string, number>) => gen;", ["r"]),
  A("rest-param-of-group", TG + "const a = () => {\n  " + G + "\n  const h = ({ n, ...rest }: G) => rest;\n  const r = h(g);\n  const fr = freeze(g);\n  const before = fr.t.length;\n  r.t.push(9);\n  return [before, fr.t.length];\n};"),
  A("rest-param-of-group-read", TG + "const a = () => {\n  " + G + "\n  const h = ({ n, ...rest }: G) => rest.t.length;\n  return h(g);\n};"),
  A("destructure-param-of-group", TG + "const a = () => {\n  " + G + "\n  const h = ({ t }: G) => { t.push(2); return t.length; };\n  return h(g);\n};"),
  A("destructure-param-of-group-return", TG + "const a = () => {\n  " + G + "\n  const h = ({ t }: G) => t;\n  const r = h(g);\n  return 1;\n};"),
  A("destructure-param-of-group-closure", TG + "const a = () => {\n  " + G + "\n  const h = ({ t }: G) => () => t.push(2);\n  const k = h(g);\n  const fr = freeze(g);\n  const before = fr.t.length;\n  k();\n  return [before, fr.t.length];\n};"),
  A("destructure-param-default", TG + "const a = () => {\n  " + G + "\n  const h = ({ t = mut([0]) }: G) => t.length;\n  return h(g);\n};"),
  A("rest-param-plain-record-mut", "const a = () => {\n  const m = mut({ xs: [1], n: 0 });\n  const h = ({ n, ...rest }: Mut<{ xs: number[]; n: number }>) => rest;\n  const r = h(m);\n  return 1;\n};"),
  A("default-param-alias-field", TG + "const a = () => {\n  " + G + "\n  const h = (p: G, q: Mut<number[]> = p.t) => { const n = p.t.length; q.push(2); return [n, p.t.length]; };\n  return h(g);\n};"),
  A("default-param-alias-plain", "const a = () => {\n  const m = mut([1]);\n  const h = (p: Mut<number[]>, q: Mut<number[]> = p) => { const n = p.length; q.push(2); return [n, p.length]; };\n  return h(m);\n};"),
  A("param-return-field-as-readonly", TG + "const a = () => {\n  " + G + "\n  const h = (p: G): readonly number[] => p.t;\n  const alias = h(g);\n  const before = alias.length;\n  g.t.push(2);\n  return [before, alias.length];\n};"),
  A("param-return-field-in-record", TG + "const a = () => {\n  " + G + "\n  const h = (p: G) => ({ x: p.t.length });\n  return h(g).x;\n};"),
  A("param-closure-over-group-param", TG + "const a = () => {\n  " + G + "\n  const h = (p: G) => () => p.t.push(2);\n  const k = h(g);\n  return 1;\n};"),
  A("param-group-to-inner-helper", TG + "const a = () => {\n  " + G + "\n  const inner = (q: Mut<number[]>) => q.push(2);\n  const h = (p: G) => inner(p.t);\n  h(g);\n  return freeze(g).t;\n};"),
  A("param-group-relend-whole", TG + "const a = () => {\n  " + G + "\n  const inner = (q: G) => q.t.push(2);\n  const h = (p: G) => inner(p);\n  h(g);\n  return freeze(g).t;\n};"),
  A("param-group-relend-twice-via-capture", TG + "const a = () => {\n  " + G + "\n  const inner = (q: Mut<number[]>) => { const n = g.t.length; q.push(2); return [n, g.t.length]; };\n  const h = (p: G) => inner(p.t);\n  return h(g);\n};"),
  A("group-and-capturing-helper-indirect", TG + "const a = () => {\n  " + G + "\n  const w = () => g.t.push(5);\n  const h = (p: G) => { const n = p.t.length; w(); return [n, p.t.length]; };\n  return h(g);\n};"),
  A("group-param-to-helper-calling-capturer", TG + "const a = () => {\n  " + G + "\n  const w = () => g.t.push(5);\n  const v = () => w();\n  const h = (p: G) => { const n = p.t.length; v(); return [n, p.t.length]; };\n  return h(g);\n};"),
  A("field-lent-helper-captures-via-other", "const a = () => {\n  " + G + "\n  const w = () => g.t.push(5);\n  const h = (p: Mut<number[]>) => { const n = p.length; w(); return [n, p.length]; };\n  return h(g.t);\n};"),
  A("plain-lent-helper-captures-via-other", "const a = () => {\n  const m = mut([1]);\n  const w = () => m.push(5);\n  const h = (p: Mut<number[]>) => { const n = p.length; w(); return [n, p.length]; };\n  return h(m);\n};"),
];
