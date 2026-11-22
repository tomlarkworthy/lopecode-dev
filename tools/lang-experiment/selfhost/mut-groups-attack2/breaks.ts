import type { Attack } from "./harness.ts";
// The minimal accepted programs of each confirmed break. bun harness.ts ./breaks.ts
export const attacks: Attack[] = [
  { name: "C1-lend-then-freeze-in-one-call", src: "const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, q: readonly number[]) => {\n    const n = q.length;\n    p.push(2);\n    return [n, q.length];\n  };\n  return f(m, freeze(m));\n};", show: ["a"] },
  { name: "C1g-group-lent-then-frozen-in-one-call", src: "type G = Mut<{ t: Mut<number[]>; n: number }>;\nconst a = () => {\n  const g = mut({ t: mut([1]), n: 0 });\n  const f = (p: G, q: { readonly t: readonly number[]; readonly n: number }) => {\n    const n0 = q.n;\n    p.n = 7;\n    p.t.push(2);\n    return [n0, q.n, q.t.length];\n  };\n  return f(g, freeze(g));\n};", show: ["a"] },
  { name: "C2-write-whose-operand-freezes", src: "const a = () => {\n  const m = mut([1]);\n  let fr: readonly number[] = [];\n  m.push((fr = freeze(m)).length);\n  return fr;\n};", show: ["a"] },
  { name: "C2g-group-field-write-whose-operand-freezes", src: "const a = () => {\n  const g = mut({ t: mut([1]), n: 0 });\n  let fr: { readonly t: readonly number[]; readonly n: number } = { t: [], n: 0 };\n  g.t[0] = (fr = freeze(g)).t.length + 5;\n  return fr;\n};", show: ["a"] },
  { name: "C3-yield-freeze-inside-a-write-other-cell-changes", src: "const gen = function* () {\n  const m = mut([1]);\n  m[0] = (yield freeze(m)) === undefined ? 9 : 8;\n};\nconst r = (gen: readonly number[]) => ({ v: gen });", show: ["gen", "r"] },
  { name: "C3b-yield-freeze-inside-a-lend", src: "const gen = function* () {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, x: unknown) => {\n    p.push(2);\n    return 0;\n  };\n  f(m, yield freeze(m));\n};\nconst r = (gen: readonly number[]) => ({ v: gen });", show: ["gen", "r"] },
  { name: "C3g-yield-frozen-group-inside-field-write", src: "const gen = function* () {\n  const g = mut({ t: mut([1]), n: 0 });\n  g.n = (yield freeze(g)) === undefined ? 9 : 8;\n};\nconst r = (gen: { readonly t: readonly number[]; readonly n: number }) => ({ v: gen });", show: ["gen", "r"] },
];
