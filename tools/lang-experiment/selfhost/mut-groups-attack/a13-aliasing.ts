import type { Attack } from "./harness.ts";
// two live Mut names for one container: a callee given the same Mut twice, or a helper that captures it and is given it
const show = ["a"];
export const attacks: Attack[] = [
  {
    name: "helper-captures-and-param", family: "param-aliasing",
    src: `const a = () => {
  const m = mut([1]);
  const h = (p: Mut<number[]>) => {
    const n = p.length;
    m.push(2);
    return [n, p.length];
  };
  return h(m);
};`, show,
  },
  {
    name: "group-helper-captures-and-field-param", family: "param-aliasing",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const h = (p: Mut<number[]>) => {
    const n = p.length;
    ctx.xs.push(2);
    return [n, p.length];
  };
  return h(ctx.xs);
};`, show,
  },
  {
    name: "aliasing-iteration-grows", family: "param-aliasing",
    src: `const a = () => {
  const m = mut([1, 2]);
  const f = (p: Mut<number[]>, q: Mut<number[]>) => {
    let seen = 0;
    for (const v of p) {
      seen++;
      if (seen < 5) q.push(v);
    }
    return seen;
  };
  return f(m, m);
};`, show,
  },
  {
    name: "aliasing-map-delete-while-iterating", family: "param-aliasing",
    src: `const a = () => {
  const m = mut(new Map<string, number>([["a", 1], ["b", 2]]));
  const f = (p: Mut<Map<string, number>>, q: Mut<Map<string, number>>) => {
    const keys: Mut<string[]> = mut([]);
    for (const k of p.keys()) {
      keys.push(k);
      q.delete("b");
    }
    return freeze(keys);
  };
  return f(m, m);
};`, show,
  },
  {
    name: "generic-field-unknown", family: "group-generic-field",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = (c: Mut<{ xs: Mut<number[]>; ys: unknown }>) => c.ys;
  const alias = leak(ctx);
  return 0;
};`, show,
  },
  {
    name: "generic-field-bounded", family: "group-generic-field",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = <Y extends number[],>(c: Mut<{ xs: Mut<number[]>; ys: Y }>): Y => c.ys;
  const alias = leak(ctx);
  const fr = freeze(ctx);
  const before = fr.ys.length;
  alias.push(5);
  return [before, fr.ys.length];
};`, show,
  },
  {
    name: "generic-field-via-callback", family: "group-generic-field",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const visit = <Y,>(c: Mut<{ xs: Mut<number[]>; ys: Y }>, f: (y: Y) => number): number => f(c.ys);
  const r = visit(ctx, (y) => {
    y.push(7);
    return y.length;
  });
  return [r, freeze(ctx).ys.length];
};`, show,
  },
  {
    name: "generic-whole-group-field-xs", family: "group-generic-field",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]) });
  const leak = <X,>(c: Mut<{ xs: X }>): X => c.xs;
  const alias = leak(ctx);
  const fr = freeze(ctx);
  const before = fr.xs.length;
  alias.push(5);
  return [before, fr.xs.length];
};`, show,
  },
];
