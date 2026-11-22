import type { Attack } from "./harness.ts";
// a type-variable field of a group parameter is not Mut to the field rules, so the callee may also assign it
const show = ["a"];
export const attacks: Attack[] = [
  {
    name: "generic-field-moved-between-groups", family: "group-generic-field",
    src: `const a = () => {
  const one = mut({ xs: mut([1]), ys: mut([10]) });
  const two = mut({ xs: mut([2]), ys: mut([20]) });
  const share = <Y,>(p: Mut<{ xs: Mut<number[]>; ys: Y }>, q: Mut<{ xs: Mut<number[]>; ys: Y }>) => {
    p.ys = q.ys;
  };
  share(one, two);
  const fr = freeze(one);
  const before = fr.ys.length;
  two.ys.push(30);
  return [before, fr.ys.length];
};`, show,
  },
  {
    name: "generic-field-aliased-within-group", family: "group-generic-field",
    src: `const a = () => {
  const g = mut({ xs: mut([1]), ys: mut([10]), zs: mut([100]) });
  const tie = <Y,>(p: Mut<{ xs: Mut<number[]>; ys: Y; zs: Y }>) => {
    p.ys = p.zs;
  };
  tie(g);
  g.zs.push(200);
  return freeze(g);
};`, show,
  },
  {
    name: "generic-field-moved-yield-then-write", family: "group-generic-field",
    src: `const gen = function* () {
  const one = mut({ xs: mut([1]), ys: mut([10]) });
  const two = mut({ xs: mut([2]), ys: mut([20]) });
  const share = <Y,>(p: Mut<{ xs: Mut<number[]>; ys: Y }>, q: Mut<{ xs: Mut<number[]>; ys: Y }>) => {
    p.ys = q.ys;
  };
  share(one, two);
  yield freeze(one);
  two.ys.push(30);
};
const reader = (gen: { xs: number[]; ys: number[] }) => gen;`,
  },
  {
    name: "generic-field-delete", family: "group-generic-field",
    src: `const a = () => {
  const g = mut({ xs: mut([1]), ys: mut([10]) });
  const drop = <Y,>(p: Mut<{ xs: Mut<number[]>; ys: Y }>) => {
    delete p.ys;
  };
  drop(g);
  const fr = freeze(g);
  return typeof fr.ys;
};`, show,
  },
];
