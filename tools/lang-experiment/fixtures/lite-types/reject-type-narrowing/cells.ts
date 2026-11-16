// Unnarrowed unions are rejected; each narrowing form the rules rely on is accepted.
type Shape = { readonly kind: "circle"; readonly r: number } | { readonly kind: "square"; readonly side: number };
type Opt = { readonly name: string } | null | undefined;
let s = (): Shape => ({ kind: "circle", r: 1 });
let o = (): Opt => ({ name: "n" });
let bad_no_narrow = (s) => s.r;
let bad_null = (o) => o.name;
let bad_wrong_branch = (s) => (s.kind === "square" ? s.r : 0);
let bad_js = () => (x: Js) => x.length;
let ok_discriminant = (s) => (s.kind === "circle" ? s.r : s.side);
let ok_truthy = (o) => (o ? o.name : "");
let ok_early_return = () => (x: Opt): string => {
  if (x === null || x === undefined) return "";
  return x.name;
};
let ok_throw = () => (x: Opt): string => {
  if (!x) throw new Error("none");
  return x.name;
};
let ok_typeof = () => (x: string | number): number => (typeof x === "string" ? x.length : x);
let ok_array = () => (x: string | readonly string[]): number => (Array.isArray(x) ? x.length : x.length);
let ok_in = () => (x: { readonly a: number } | { readonly b: string }): number => ("a" in x ? x.a : x.b.length);
let ok_decoder = () => (x: Js): number => {
  if (typeof x !== "object" || x === null || !("n" in x) || typeof x.n !== "number") throw new Error("n");
  return x.n;
};
