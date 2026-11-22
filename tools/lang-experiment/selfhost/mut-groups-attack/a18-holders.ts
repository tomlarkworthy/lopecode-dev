import type { Attack } from "./harness.ts";
// a value that holds a Mut without being typed Mut: does it cross to another cell?
export const attacks: Attack[] = [
  {
    name: "b4-holder-record-returned", family: "mut-holder",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = <Y,>(c: Mut<{ xs: Mut<number[]>; ys: Y }>): { y: Y } => ({ y: c.ys });
  const h = leak(ctx);
  return { h, fr: freeze(ctx) };
};
const b = (a: { h: { y: Mut<number[]> }; fr: { xs: number[]; ys: number[] } }) => {
  a.h.y.push(99);
  return 0;
};`, show: ["a"],
  },
  {
    name: "b4-holder-closure", family: "mut-holder",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = <Y,>(c: Mut<{ xs: Mut<number[]>; ys: Y }>): { y: Y } => ({ y: c.ys });
  const h = leak(ctx);
  const fr = freeze(ctx);
  return { fr, poke: () => h.y.push(5) };
};
const b = (a: { fr: { ys: number[] }; poke: () => number }) => {
  const before = a.fr.ys.length;
  a.poke();
  return [before, a.fr.ys.length];
};`, show: ["b"],
  },
  {
    name: "b1-holder-record-returned", family: "mut-holder",
    src: `const x = () => [1];
const a = (x: number[]) => {
  const mk: (v: number[]) => Mut<number[]> = mut;
  return { m: mk(x) };
};
const b = (a: { m: Mut<number[]> }) => {
  a.m.push(2);
  return 0;
};`, show: ["x"],
  },
  {
    name: "b1-holder-closure", family: "mut-holder",
    src: `const x = () => [1];
const a = (x: number[]) => {
  const mk = mut;
  const h = { m: mk(x) };
  return () => h.m.push(2);
};
const b = (a: () => number) => a();`, show: ["x"],
  },
  {
    name: "named-fnexpr-base", family: "known-base-hole",
    src: `const a = () => {
  const g2 = (k: () => number) => k;
  const m = mut([1]);
  const f = function g(): number {
    m.push(2);
    return 0;
  };
  const h = g2(f);
  const fr = freeze(m);
  return { fr, f: h };
};
const b = (a: { fr: number[]; f: () => number }) => {
  const before = a.fr.length;
  a.f();
  return [before, a.fr.length];
};`, show: ["b"],
  },
  {
    name: "regexp-exec-no-lastindex-read", family: "hidden-intrinsic-state",
    src: `const x = () => /a/g;
const y = (x: RegExp) => [x.exec("ba") === null, x.exec("ba") === null];`, show: ["y"],
  },
  {
    name: "shadow-mut-by-param-called", family: "prelude-as-value",
    src: `const x = () => [1];
const y = (x: number[]) => {
  const run = (mut: (v: number[]) => Mut<number[]>) => {
    const m = mut(x);
    m.push(2);
    return 0;
  };
  return run(mut);
};`, show: ["x"],
  },
  {
    name: "generic-optional-field-narrowed", family: "group-generic-field",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = <Y,>(c: Mut<{ xs: Mut<number[]>; ys?: Y }>): Y | undefined => c.ys;
  const alias = leak(ctx);
  const fr = freeze(ctx);
  const before = fr.ys.length;
  if (alias !== undefined) alias.push(5);
  return [before, fr.ys.length];
};`, show: ["a"],
  },
  {
    name: "group-generator-borrow-field", family: "generator-group",
    src: `const gen = function* () {
  const ctx = mut({ xs: mut([1]) });
  for (let k = 0; k < 3; k++) {
    ctx.xs.push(k);
    yield borrow(ctx.xs);
  }
};
const keep = (gen: Borrowed<number[]>) => gen.length;`, lent: ["gen"], show: ["keep"],
  },
  {
    name: "group-index-signature-field", family: "group-type-hiding",
    src: `const a = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = (c: Mut<{ xs: Mut<number[]>; [k: string]: Mut<number[]> }>) => c["ys"];
  const alias = leak(ctx);
  return 0;
};`,
  },
  {
    name: "freeze-in-conditional-expr", family: "flow",
    src: `const a = (n: number) => {
  const m = mut([1]);
  const r = n > 0 ? freeze(m) : [0];
  m.push(2);
  return r;
};`,
  },
];
