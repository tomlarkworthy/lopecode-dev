// Hole 1 (2026-11-20, closed): `in` on a right operand typed unknown, with no narrowing, was accepted before the 2026-11-20 fix; now [type] (S9.5). It throws a
// TypeError at run time on a primitive ("then" in 1).
// bun selfhost/rt/check.ts selfhost/repro-unknown-in.ss.ts
export const bare = () => (v: unknown): boolean => "then" in v;
export const generic = () => <T,>(v: T): boolean => "then" in v;
export const afterFunctionOnly = () => (v: unknown): boolean => typeof v !== "number" && "then" in v;
