// Unnarrowed unions are rejected; each narrowing form RULES relies on is accepted.
type Shape = { readonly kind: "circle"; readonly r: number } | { readonly kind: "square"; readonly side: number };
type Opt = { readonly name: string } | null | undefined;
export let s = (): Shape => ({ kind: "circle", r: 1 });
export let o = (): Opt => ({ name: "n" });
export let bad_no_narrow = (s) => s.r;
export let bad_null = (o) => o.name;
export let bad_wrong_branch = (s) => (s.kind === "square" ? s.r : 0);
export let bad_js = () => (x: Js) => x.length;
export let ok_discriminant = (s) => (s.kind === "circle" ? s.r : s.side);
export let ok_truthy = (o) => (o ? o.name : "");
export let ok_early_return = () => (x: Opt): string => {
  if (x === null || x === undefined) return "";
  return x.name;
};
export let ok_throw = () => (x: Opt): string => {
  if (!x) throw new Error("none");
  return x.name;
};
export let ok_typeof = () => (x: string | number): number => (typeof x === "string" ? x.length : x);
export let ok_array = () => (x: string | readonly string[]): number => (Array.isArray(x) ? x.length : x.length);
export let ok_in = () => (x: { readonly a: number } | { readonly b: string }): number => ("a" in x ? x.a : x.b.length);
export let ok_decoder = () => (x: Js): number => {
  if (typeof x !== "object" || x === null || !("n" in x) || typeof x.n !== "number") throw new Error("n");
  return x.n;
};
