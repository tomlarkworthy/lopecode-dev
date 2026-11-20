// Checker defect (2026-11-20): `v !== null` does not narrow an unknown, and `typeof v === "object"` on an
// unknown gives object | null, so the order of two conjuncts decides the verdict of one sound test.
// bun selfhost/rt/check.ts selfhost/repro-unknown-null-narrow.ss.ts
export const typeofFirst = () => (v: unknown): boolean => typeof v === "object" && v !== null && "then" in v;
export const nullFirst = () => (v: unknown): boolean => v !== null && typeof v === "object" && "then" in v;
export const truthyFirst = () => (v: unknown): boolean => !!v && typeof v === "object" && "then" in v;
