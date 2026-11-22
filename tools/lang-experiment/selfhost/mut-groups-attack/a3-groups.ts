import type { Attack } from "./harness.ts";
// owned groups: a field reached by a name the field checks do not see
export const attacks: Attack[] = [
  {
    name: "width-hides-owned-field", family: "group-param-type-widening",
    src: `const g = function* () {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = (c: Mut<{ xs: Mut<number[]>; ys: number[] }>) => c.ys;
  const alias = leak(ctx);
  yield alias;
  ctx.ys.push(20);
};
const r = (g: number[]) => g;`,
    show: ["g", "r"],
  },
  {
    name: "width-hides-owned-field-after-freeze-of-other", family: "group-param-type-widening",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = (c: Mut<{ xs: Mut<number[]>; ys: number[] }>) => c.ys;
  const alias = leak(ctx);
  const before = alias.length;
  ctx.ys.push(20);
  return [before, alias.length];
};`,
    show: ["a"],
  },
  {
    name: "group-twice-same-call", family: "param-aliasing",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const f = (p: Mut<{ xs: Mut<number[]> }>, q: Mut<{ xs: Mut<number[]> }>) => {
    const n = p.xs.length;
    q.xs.push(2);
    return [n, p.xs.length];
  };
  return f(ctx, ctx);
};`,
    show: ["a"],
  },
  {
    name: "group-and-own-field-same-call", family: "param-aliasing",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const f = (p: Mut<{ xs: Mut<number[]> }>, q: Mut<number[]>) => {
    const n = p.xs.length;
    q.push(2);
    return [n, p.xs.length];
  };
  return f(ctx, ctx.xs);
};`,
    show: ["a"],
  },
  {
    name: "field-twice-same-call", family: "param-aliasing",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const f = (p: Mut<number[]>, q: Mut<number[]>) => {
    const n = p.length;
    q.push(2);
    return [n, p.length];
  };
  return f(ctx.xs, ctx.xs);
};`,
    show: ["a"],
  },
  {
    name: "plain-mut-twice-same-call", family: "param-aliasing",
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
    name: "destructured-group-param", family: "param-destructuring",
    src: `const g = function* () {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = ({ ys }: Mut<{ xs: Mut<number[]>; ys: number[] }>) => ys;
  const alias = leak(ctx);
  yield alias;
  ctx.ys.push(20);
};`,
    show: ["g"],
  },
];
