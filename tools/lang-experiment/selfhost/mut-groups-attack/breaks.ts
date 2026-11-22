import type { Attack } from "./harness.ts";
// The minimal accepted programs, one per break. bun harness.ts ./breaks.ts
export const attacks: Attack[] = [
  {
    name: "B1-mut-as-value", family: "prelude-as-value",
    src: `const x = () => [1, 2];
const y = (x: number[]) => {
  const mk = mut;
  const a = mk(x);
  a.push(3);
  return a.length;
};`,
    show: ["x", "y"],
  },
  {
    name: "B2-freeze-as-value", family: "prelude-as-value",
    src: `const a = () => {
  const fz: <T>(m: Mut<T>) => T = freeze;
  const m = mut([1]);
  const r = fz(m);
  const before = r.length;
  m.push(2);
  return [before, r.length];
};`,
    show: ["a"],
  },
  {
    name: "B2b-freeze-as-value-yield", family: "prelude-as-value",
    src: `const gen = function* () {
  const m = mut([1]);
  const fz: <T>(m: Mut<T>) => T = freeze;
  yield fz(m);
  m.push(2);
};
const reader = (gen: number[]) => gen;`,
  },
  {
    name: "B3-same-mut-twice", family: "param-aliasing",
    src: `const a = () => {
  const m = mut([1]);
  const f = (p: Mut<number[]>, q: Mut<number[]>) => {
    const n = p.length;
    q.push(2);
    return [n, p.length];
  };
  return f(m, m);
};`,
    show: ["a"],
  },
  {
    name: "B4-group-type-variable-field", family: "group-generic-field",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = <Y,>(c: Mut<{ xs: Mut<number[]>; ys: Y }>): Y => c.ys;
  const alias = leak(ctx);
  const fr = freeze(ctx);
  const before = fr.ys.length;
  alias.push(20);
  return [before, fr.ys.length];
};`,
    show: ["a"],
  },
  {
    name: "B4b-group-field-moved-to-other-group", family: "group-generic-field",
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
    name: "B4c-group-field-deleted", family: "group-generic-field",
    src: `const a = () => {
  const g = mut({ xs: mut([1]), ys: mut([10]) });
  const drop = <Y,>(p: Mut<{ xs: Mut<number[]>; ys: Y }>) => {
    delete p.ys;
  };
  drop(g);
  const fr = freeze(g);
  return typeof fr.ys;
};`,
    show: ["a"],
  },
  {
    name: "B5-regexp-lastindex", family: "hidden-intrinsic-state",
    src: `const x = () => /a/g;
const y = (x: RegExp) => [x.test("aa"), x.test("aa")];
const z = (x: RegExp, y: boolean[]) => [x.test("aa"), /a/g.test("aa")];`,
    show: ["y", "z"],
  },
];
