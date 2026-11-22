import type { Attack } from "./harness.ts";
// the prelude functions used as values: the placement and freshness rules key on a call whose callee is the prelude name
export const attacks: Attack[] = [
  {
    name: "mut-alias-local", family: "prelude-as-value",
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
    name: "mut-from-cell", family: "prelude-as-value",
    src: `const x = () => [1, 2];
const mk = () => mut;
const y = (mk, x: number[]) => {
  const a = mk(x);
  a.push(3);
  return 1;
};`,
    show: ["x", "y"],
  },
  {
    name: "freeze-alias-generator", family: "prelude-as-value",
    src: `const g = function* () {
  const m = mut([1]);
  const fz = freeze;
  const r = fz(m);
  yield r;
  m.push(2);
  yield r;
};`,
    show: ["g"],
  },
  {
    name: "mut-param-name", family: "prelude-as-value",
    src: `const x = () => ({ n: 1 });
const y = (x: { n: number }) => {
  const f = (mk: <T>(v: T) => Mut<T>) => {
    const a = mk(x);
    a.n = 99;
    return 1;
  };
  return f(mut);
};`,
    show: ["x", "y"],
  },
  {
    name: "brand-forge", family: "type-brand",
    src: `const x = () => ({ a: 1, __lc_mut: true as const });
const y = (x: { a: number; __lc_mut: true }) => {
  const w = (m: Mut<{ a: number }>) => {
    m.a = 2;
  };
  w(x);
  return 1;
};`,
    show: ["x", "y"],
  },
];
