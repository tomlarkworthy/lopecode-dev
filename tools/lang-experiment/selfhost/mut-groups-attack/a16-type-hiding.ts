import type { Attack } from "./harness.ts";
// a group parameter type that hides an owned field: aliases, interfaces, generic aliases, intersections, optional fields
const body = (param: string, pre = "") => `${pre}const a = () => {
  const ctx = mut({ xs: mut([1]), ys: mut([10]) });
  const leak = ${param} => c.ys;
  const alias = leak(ctx);
  const fr = freeze(ctx);
  const before = fr.ys.length;
  alias.push(5);
  return [before, fr.ys.length];
};`;
const show = ["a"];
export const attacks: Attack[] = [
  { name: "generic-alias-box", family: "group-generic-field", src: body("<Y,>(c: Mut<Box<Y>>): Y", "type Box<Y> = { xs: Mut<number[]>; ys: Y };\n"), show },
  { name: "generic-interface-box", family: "group-generic-field", src: body("<Y,>(c: Mut<Box<Y>>): Y", "interface Box<Y> { xs: Mut<number[]>; ys: Y }\n"), show },
  { name: "generic-optional-field", family: "group-generic-field", src: body("<Y,>(c: Mut<{ xs: Mut<number[]>; ys?: Y }>): Y | undefined"), show },
  { name: "intersection-hides-field", family: "group-type-hiding", src: body("(c: Mut<{ xs: Mut<number[]> } & { ys: number[] }>): number[]"), show },
  { name: "generic-intersection", family: "group-generic-field", src: body("<Y,>(c: Mut<{ xs: Mut<number[]> } & { ys: Y }>): Y"), show },
  { name: "generic-two-params", family: "group-generic-field", src: body("<X, Y>(c: Mut<{ xs: Mut<X>; ys: Y }>): Y"), show },
  { name: "readonly-field", family: "group-type-hiding", src: body("(c: Mut<{ xs: Mut<number[]>; readonly ys: Mut<number[]> }>): number[]"), show },
];
