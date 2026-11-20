// Checker finding (2026-11-20): a user type with the name of a prelude type (Listener, here) is read as the
// prelude's, so the placement rule for listeners applies to a plain record type.
// bun selfhost/rt/check.ts selfhost/repro-prelude-type-name.ss.ts
type Listener = { readonly n: number };
export const one = () => (l: Listener): number => l.n;
type Pool = { readonly n: number; readonly m: number };
export const two = () => (p: Pool): number => p.m;
