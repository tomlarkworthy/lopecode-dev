import type { Attack } from "./harness.ts";
const A = (name: string, src: string, show = ["a"]): Attack => ({ name, src, show });
const G = "const g = mut({ t: mut([1]), n: 0 });";
const TG = "type G = Mut<{ t: Mut<number[]>; n: number }>;\n";
const F = "const f = (p: Mut<number[]>, q: readonly number[]) => {\n    const n = q.length;\n    p.push(2);\n    return [n, q.length];\n  };";
export const attacks: Attack[] = [
  A("lend-then-freeze-same-call", `const a = () => {\n  const m = mut([1]);\n  ${F}\n  return f(m, freeze(m));\n};`),
  A("lend-field-then-freeze-group-same-call", `const a = () => {\n  ${G}\n  ${F}\n  return f(g.t, freeze(g).t);\n};`),
  A("lend-group-then-freeze-group-same-call", TG + `const a = () => {\n  ${G}\n  const f = (p: G, q: { readonly t: readonly number[]; readonly n: number }) => {\n    const n = q.t.length;\n    p.t.push(2);\n    return [n, q.t.length];\n  };\n  return f(g, freeze(g));\n};`),
  A("lend-then-freeze-kept-result", `const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, q: readonly number[]) => { p.push(2); return q; };\n  const fr = f(m, freeze(m));\n  return fr;\n};`),
  A("lend-then-freeze-map", `const a = () => {\n  const m = mut(new Map<string, number>());\n  const f = (p: Mut<Map<string, number>>, q: ReadonlyMap<string, number>) => { const n = q.size; p.set("a", 1); return [n, q.size]; };\n  return f(m, freeze(m));\n};`),
  A("lend-then-freeze-new", `const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, q: readonly number[]) => { p.push(2); return q.length; };\n  return [f(m, freeze(m))];\n};`),
  A("lend-in-nested-call-then-freeze", `const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>) => { p.push(2); return 0; };\n  const k = (x: number, q: readonly number[]) => q;\n  return k(f(m), freeze(m));\n};`),
  A("covariant-mut-array-push-string", `const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<(number | string)[]>) => { p.push("x"); };\n  f(m);\n  const fr: number[] = freeze(m);\n  return fr;\n};`),
  A("covariant-group-field-union", TG + `const a = () => {\n  ${G}\n  const f = (p: Mut<{ t: Mut<(number | string)[]>; n: number }>) => { p.t.push("x"); };\n  f(g);\n  return freeze(g).t;\n};`),
  A("covariant-group-plain-field", `const a = () => {\n  ${G}\n  const f = (p: Mut<{ t: Mut<number[]>; n: number | string }>) => { p.n = "s"; };\n  f(g);\n  const n: number = freeze(g).n;\n  return n;\n};`),
  A("covariant-plain-record-field", `const a = () => {\n  const m = mut({ n: 0 });\n  const f = (p: Mut<{ n: number | string }>) => { p.n = "s"; };\n  f(m);\n  const n: number = freeze(m).n;\n  return n;\n};`),
  A("covariant-map-value", `const a = () => {\n  const m = mut(new Map<string, number>());\n  const f = (p: Mut<Map<string, number | string>>) => { p.set("a", "s"); };\n  f(m);\n  return freeze(m);\n};`),
  A("group-width-extra-field", `const a = () => {\n  const g = mut({ t: mut([1]), n: 0, s: "x" });\n  const f = (p: Mut<{ t: Mut<number[]>; n: number }>) => p.t.push(2);\n  f(g);\n  return freeze(g).t;\n};`),
  A("group-width-missing-plain", `const a = () => {\n  ${G}\n  const f = (p: Mut<{ t: Mut<number[]> }>) => p.t.push(2);\n  f(g);\n  return freeze(g).t;\n};`),
  A("group-optional-plain-field-delete", `const a = () => {\n  ${G}\n  const f = (p: Mut<{ t: Mut<number[]>; n?: number }>) => { delete p.n; };\n  f(g);\n  const n: number = freeze(g).n;\n  return [n];\n};`),
  A("plain-optional-delete", `const a = () => {\n  const m = mut({ n: 0 });\n  const f = (p: Mut<{ n?: number }>) => { delete p.n; };\n  f(m);\n  const n: number = freeze(m).n;\n  return [n];\n};`),
  A("action-captures-mut", "const c = (): StateCell<number> => state(0);\nconst b = (c: State<number>) => {\n  const m = mut([1]);\n  return action(() => { m.push(2); c.set(m.length); });\n};"),
  A("update-callback-mut", "const c = (): StateCell<number[]> => state([1]);\nconst b = (c: State<number[]>) => action(() => c.update((xs) => { const m = mut([...xs]); m.push(1); return freeze(m); }));"),
  A("cell-fn-input-with-mut-param", "const f = () => (p: Mut<number[]>) => p.push(1);\nconst a = (f: (p: Mut<number[]>) => number) => {\n  const m = mut([1]);\n  f(m);\n  return freeze(m);\n};"),
  A("cell-fn-input-untyped-given-mut", "const f = () => (p: Mut<number[]>) => p.push(1);\nconst a = (f) => {\n  const m = mut([1]);\n  f(m);\n  return freeze(m);\n};"),
];
