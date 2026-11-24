import { toSrcs, type Cand } from "./h.ts";
const P = `type P = { readonly name: string; readonly tag?: { readonly label: string } };
const people = () => (): readonly P[] => [{ name: "a" }, { name: "b", tag: { label: "x" } }];\n`;
export const cands: Cand[] = [
  { name: "accept-optional-member", src: P + `const a = (people: () => readonly P[]) => people().map((p) => p.tag?.label ?? "-").join(",");`, show: ["a"] },
  { name: "accept-find-then-optional", src: P + `const a = (people: () => readonly P[]) => people().find((p) => p.name === "z")?.name ?? "none";`, show: ["a"] },
  { name: "accept-optional-index", src: `const a = () => { const xs: readonly (readonly number[])[] | undefined = [[1]]; return xs?.[0]?.[0] ?? 0; };`, show: ["a"] },
  { name: "accept-optional-call", src: `const a = () => { const f: ((n: number) => number) | undefined = (n: number) => n + 1; return f?.(1) ?? 0; };`, show: ["a"] },
  { name: "reject-member-without-optional", src: P + `const a = (people: () => readonly P[]) => people().map((p) => p.tag.label).join(",");` },
  { name: "nullish-assign", src: `const a = () => { let x: number | undefined = undefined; x ??= 3; return x; };` },
  { name: "and-assign", src: `const a = () => { let x = true; x &&= false; return x; };` },
  { name: "or-assign", src: `const a = () => { let x = false; x ||= true; return x; };` },
];
export const srcs = toSrcs(cands);
