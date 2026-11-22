import type { Attack } from "./harness.ts";
// expression forms that carry a Mut, a group or a field to a second name without naming it in a checked position.
// Each is a generator cell that yields the second name and then writes the Mut: a reader of the yield sees it change.
const gen = (setup: string, alias: string, write = "m.push(2);") => `const gen = function* () {
${setup}
  const alias = ${alias};
  yield alias;
  ${write}
};
const reader = (gen: number[]) => gen;`;
const M = "  const m = mut([1]);";
const G = "  const ctx = mut({ xs: mut([1]) });";
const GW = "ctx.xs.push(2);";
const forms: [string, string, string, string?][] = [
  ["paren", M, "(m)"],
  ["as-const", M, "m as const"],
  ["satisfies", M, "m satisfies number[]"],
  ["array-index", M, "[m][0]"],
  ["comma", M, "(0, m)"],
  ["conditional", M, "m.length > 0 ? m : m"],
  ["nullish", M, "m ?? m"],
  ["and", M, "m && m"],
  ["or", M, "m || m"],
  ["optional-chain-call-identity", M, "m?.slice(0)"],
  ["tagged-template", M + "\n  const tag = (s: readonly string[], v: number[]) => v;", "tag`${m}`"],
  ["tagged-template-strings-arr", M + "\n  const tag = (s: TemplateStringsArray, v: number[]) => v;", "tag`${m}`"],
  ["default-param", M + "\n  const id = (v: number[] = m) => v;", "id()"],
  ["getter", M + "\n  const o = { get v() { return m; } };", "o.v"],
  ["object-method", M + "\n  const o = { f(): number[] { return m; } };", "o.f()"],
  ["array-destructure", M, "((xs: number[][]) => xs[0])([m])"],
  ["iife-arrow", M, "((v: number[]) => v)(m)"],
  ["field-paren", G, "(ctx.xs)", GW],
  ["field-conditional", G, "ctx.xs.length > 0 ? ctx.xs : ctx.xs", GW],
  ["field-nullish", G, "ctx.xs ?? ctx.xs", GW],
  ["field-optional-chain", G, "ctx?.xs", GW],
  ["field-computed", G, `ctx["xs"]`, GW],
  ["field-tagged-template", G + "\n  const tag = (s: readonly string[], v: number[]) => v;", "tag`${ctx.xs}`", GW],
  ["group-tagged-template", G + "\n  const tag = (s: readonly string[], v: { xs: number[] }) => v.xs;", "tag`${ctx}`", GW],
  ["field-default-param", G + "\n  const id = (v: number[] = ctx.xs) => v;", "id()", GW],
  ["group-array-index", G, "[ctx][0].xs", GW],
  ["field-in-array", G, "[ctx.xs][0]", GW],
  ["field-spread-call", G + "\n  const id = (...v: number[][]) => v[0];", "id(...[ctx.xs])", GW],
  ["field-array-from", G, "Array.from([ctx.xs])[0]", GW],
  ["field-object-values", G, "Object.values({ a: ctx.xs })[0]", GW],
  ["group-object-values", G, "Object.values(ctx)[0]", GW],
  ["field-map-get", G + "\n  const mp = new Map([[\"a\", ctx.xs]]);", "mp.get(\"a\") ?? []", GW],
  ["field-json-roundtrip-not-alias", G, "JSON.parse(JSON.stringify(ctx.xs))", GW],
];
export const attacks: Attack[] = forms.map(([n, setup, alias, write]) => ({ name: n, family: "expression-form", src: gen(setup, alias, write) }));
