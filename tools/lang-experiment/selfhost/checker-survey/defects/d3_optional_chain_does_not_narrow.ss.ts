// D3: ?. comparisons and truthiness do not narrow the object they read through; the && form does.
// TypeScript narrows all four. Expected: ok for each.
export type U = { type: "A"; a: number } | { type: "B" };
export type S = { flags?: { fresh: boolean } };
export const eqChain = () => (d: U | null): number => (d?.type === "A" ? d.a : 0);
export const eqAnd = () => (d: U | null): number => (d && d.type === "A" ? d.a : 0);
export const truthyChain = () => (s: S): boolean => !!s.flags?.fresh && s.flags.fresh;
export const truthyAnd = () => (s: S): boolean => !!s.flags && s.flags.fresh;
