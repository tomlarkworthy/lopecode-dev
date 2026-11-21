// D1 and D3 under tsc --strict: both forms of each are expected to compile.
export type F = (x: number) => string;
export const contextual = (): F => (x) => { throw new Error("stub"); };
export type U = { type: "A"; a: number } | { type: "B" };
export type S = { flags?: { fresh: boolean } };
export const eqChain = (d: U | null): number => (d?.type === "A" ? d.a : 0);
export const truthyChain = (s: S): boolean => !!s.flags?.fresh && s.flags.fresh;
