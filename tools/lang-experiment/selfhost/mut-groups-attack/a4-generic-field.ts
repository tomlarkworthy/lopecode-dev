import type { Attack } from "./harness.ts";
// a group parameter whose field is a type parameter: the callee sees the owned field as Y, not Mut
export const attacks: Attack[] = [
  {
    name: "generic-field-returns-owned", family: "group-generic-field",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = <Y,>(c: Mut<{ xs: Mut<number[]>; ys: Y }>): Y => c.ys;
  const alias = leak(ctx);
  alias.push(20);
  ctx.ys.push(30);
  return freeze(ctx);
};`,
    show: ["a"],
  },
  {
    name: "generic-field-survives-freeze", family: "group-generic-field",
    src: `const x = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = <Y,>(c: Mut<{ xs: Mut<number[]>; ys: Y }>): Y => c.ys;
  const alias = leak(ctx);
  const fr = freeze(ctx);
  const before = fr.ys.length;
  alias.push(20);
  return [before, fr.ys.length];
};`,
    show: ["x"],
  },
  {
    name: "generic-field-yield-then-write", family: "group-generic-field",
    src: `const gen = function* () {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = <Y,>(c: Mut<{ xs: Mut<number[]>; ys: Y }>): Y => c.ys;
  const alias = leak(ctx);
  const fr = freeze(ctx);
  yield fr;
  alias.push(20);
};
const r = (gen: { xs: number[]; ys: number[] }) => gen;`,
    show: ["gen", "r"],
  },
];
