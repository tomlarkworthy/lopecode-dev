import type { Attack } from "./harness.ts";
// a Mut bound to a const annotated with a union: the ownership rules track a binding whose type is exactly Mut<...>
export const attacks: Attack[] = [
  {
    name: "union-annotated-mut-yield-then-write", family: "union-typed-binding",
    src: `const gen = function* () {
  const m: Mut<number[]> | null = mut([1]);
  const alias = m;
  yield alias;
  if (m !== null) m.push(2);
};
const reader = (gen: number[] | null) => gen;`,
  },
  {
    name: "union-annotated-mut-returned-twice", family: "union-typed-binding",
    src: `const a = () => {
  const m: Mut<number[]> | undefined = mut([1]);
  const fr = m === undefined ? [] : freeze(m);
  const before = fr.length;
  m?.push(2);
  return [before, fr.length];
};`,
    show: ["a"],
  },
  {
    name: "union-annotated-mut-escapes-in-closure", family: "union-typed-binding",
    src: `const a = () => {
  const m: Mut<number[]> | null = mut([1]);
  const poke = () => {
    if (m !== null) m.push(2);
    return 0;
  };
  return { view: m === null ? [] : freeze(m), poke };
};
const b = (a: { view: number[]; poke: () => number }) => {
  const before = a.view.length;
  a.poke();
  return [before, a.view.length];
};`,
    show: ["b"],
  },
  {
    name: "union-annotated-group", family: "union-typed-binding",
    src: `const a = () => {
  const ctx: Mut<{ xs: Mut<number[]> }> | null = mut({ xs: mut([1]) });
  if (ctx === null) return [];
  const fr = freeze(ctx);
  const before = fr.xs.length;
  ctx.xs.push(2);
  return [before, fr.xs.length];
};`,
    show: ["a"],
  },
  {
    name: "union-param-received-mut", family: "union-typed-binding",
    src: `const a = () => {
  const m = mut([1]);
  const keep = (v: Mut<number[]> | null) => v;
  const alias = keep(m);
  return 0;
};`,
  },
];
