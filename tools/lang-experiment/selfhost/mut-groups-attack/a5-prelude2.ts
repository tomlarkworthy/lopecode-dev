import type { Attack } from "./harness.ts";
// more prelude-as-value forms, and the call-site side of a Mut-typed result
export const attacks: Attack[] = [
  {
    name: "freeze-as-param-then-write", family: "prelude-as-value",
    src: `const a = () => {
  const f = (fz: <T>(m: Mut<T>) => T) => {
    const m = mut([1]);
    const r = fz(m);
    const b = r.length;
    m.push(2);
    return [b, r.length];
  };
  return f(freeze);
};`,
    show: ["a"],
  },
  {
    name: "freeze-annotated-const", family: "prelude-as-value",
    src: `const a = () => {
  const fz: <T>(m: Mut<T>) => T = freeze;
  const m = mut([1]);
  const r = fz(m);
  const b = r.length;
  m.push(2);
  return [b, r.length];
};`,
    show: ["a"],
  },
  {
    name: "freeze-as-param-generator-yield", family: "prelude-as-value",
    src: `const gen = function* () {
  const m = mut([1]);
  const thaw = (fz: (v: Mut<number[]>) => number[], v: Mut<number[]>) => fz(v);
  const r = thaw(freeze, m);
  yield r;
  m.push(2);
};
const reader = (gen: number[]) => gen;`,
    show: ["gen", "reader"],
  },
  {
    name: "mut-conditional-callee", family: "prelude-as-value",
    src: `const x = () => [1, 2];
const y = (x: number[]) => {
  const a = (x.length > 0 ? mut : mut)(x);
  a.push(3);
  return 0;
};`,
    show: ["x", "y"],
  },
  {
    name: "mut-from-cell-annotated", family: "prelude-as-value",
    src: `const x = () => [1, 2];
const mk = () => mut;
const y = (mk: <T>(v: T) => Mut<T>, x: number[]) => {
  const a = mk(x);
  a.push(3);
  return 0;
};`,
    show: ["x", "mk", "y"],
  },
  {
    name: "mut-thaws-own-frozen", family: "prelude-as-value",
    src: `const gen = function* () {
  const m = mut([1]);
  const fr = freeze(m);
  yield fr;
  const go = (mk: (v: number[]) => Mut<number[]>) => {
    const again = mk(fr);
    again.push(2);
    return 0;
  };
  go(mut);
};`,
    show: ["gen"],
  },
  {
    name: "borrow-as-value", family: "prelude-as-value",
    src: `const a = () => {
  const m = mut([1]);
  const f = (bw: (v: Mut<number[]>) => Borrowed<number[]>) => snapshot(bw(m));
  return f(borrow);
};`,
    show: ["a"],
  },
  {
    name: "mut-param-aliases-freeze-in-callee", family: "param-aliasing",
    src: `const a = () => {
  const m = mut([1]);
  const f = (p: Mut<number[]>, q: Mut<number[]>, fz: (v: Mut<number[]>) => number[]) => {
    const r = fz(p);
    const b = r.length;
    q.push(2);
    return [b, r.length];
  };
  return f(m, m, freeze);
};`,
    show: ["a"],
  },
];
