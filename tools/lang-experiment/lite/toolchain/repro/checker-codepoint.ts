// The checker has no String.codePointAt, so acorn's identifier test (isIdentifier) stays in tc-shell.ts:
// bun soundscript/.scratch/tc-port/check.ts toolchain/repro/checker-codepoint.ts
export const tcReproCodePoint = () => (s: string): number => s.codePointAt(0) ?? 0;

export const tcReproHasOwn = () => (o: { readonly [k: string]: string }, k: string): boolean => Object.hasOwn(o, k);
