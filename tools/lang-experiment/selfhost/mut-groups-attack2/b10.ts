import type { Attack } from "./harness.ts";
// observed reruns of b7/b9 forms whose frozen value was discarded; destructuring targets; state/for-of checker verdicts
const A = (name: string, src: string, show = ["a"]): Attack => ({ name, src, show });
const L = "let fr: readonly number[] = [];\n  ";
const LG = "let fr: { readonly t: readonly number[]; readonly n: number } = { t: [], n: 0 };\n  ";
const G = "const g = mut({ t: mut([1]), n: 0 });\n  ";
export const attacks: Attack[] = [
  A("obs-member-assign-group-n", "const a = () => {\n  " + G + LG + "g.n = (fr = freeze(g)).t.length + 5;\n  return fr;\n};"),
  A("obs-map-set", "const a = () => {\n  const m = mut(new Map<string, number>());\n  let fr: Map<string, number> = new Map();\n  m.set(\"k\", (fr = freeze(m)).size);\n  return fr;\n};"),
  A("obs-lend-then-freeze-new", "const a = () => {\n  const m = mut([1]);\n  const f = (p: Mut<number[]>, q: readonly number[]) => { p.push(2); return q; };\n  return [f(m, freeze(m))];\n};"),
  A("destructure-assign-target", "const a = () => {\n  const m = mut([1]);\n  " + L + "[m[0]] = [(fr = freeze(m)).length + 5];\n  return fr;\n};"),
  A("destructure-assign-object-target", "const a = () => {\n  const m = mut({ k: 1 });\n  let fr: { readonly k: number } = { k: 0 };\n  ({ k: m.k } = { k: (fr = freeze(m)).k + 5 });\n  return fr;\n};"),
  A("state-action-freeze-in-operand", "const c = (): StateCell<number> => state(0);\nconst b = (c: State<number>) => action(() => {\n  const m = mut([1]);\n  let fr: readonly number[] = [];\n  m.push((fr = freeze(m)).length);\n  c.set(fr.length);\n});"),
  A("state-set-mut", "const c = (): StateCell<number[]> => state([1]);\nconst b = (c: State<number[]>) => action(() => {\n  const m = mut([1]);\n  c.set(m);\n});"),
  A("state-update-returns-mut", "const c = (): StateCell<number[]> => state([1]);\nconst b = (c: State<number[]>) => action(() => c.update((xs) => { const m = mut([...xs]); return m; }));"),
  A("for-of-lent-field-push", "const a = () => {\n  const g = mut({ t: mut([1, 2]), u: mut([0]), n: 0 });\n  for (const x of g.t) { g.u.push(x); }\n  return freeze(g);\n};"),
  A("for-of-field-while-pushing-self", "const a = () => {\n  const g = mut({ t: mut([1]), n: 0 });\n  for (const x of g.t) { if (g.t.length < 4) g.t.push(x); }\n  return freeze(g);\n};"),
];
