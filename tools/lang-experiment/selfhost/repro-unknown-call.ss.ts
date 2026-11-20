// Hole 2 (2026-11-20, closed): a value narrowed from unknown only by `typeof u === "function"` can be called with any
// arguments, and its result used.
// bun selfhost/rt/check.ts selfhost/repro-unknown-call.ss.ts
export const call = () => (u: unknown): unknown => (typeof u === "function" ? u(1, "two", null) : 0);
export const generic = () => <T,>(u: T): unknown => (typeof u === "function" ? u(1) : 0);
export const member = () => (u: unknown): unknown => (typeof u === "object" && u !== null && "then" in u && typeof u.then === "function" ? u.then(1) : 0);
export const alias = () => (u: unknown): unknown => {
  if (typeof u !== "function") return 0;
  const w = u;
  return w(1);
};
export const destructured = () => (u: unknown): unknown => {
  if (typeof u !== "object" || u === null || !("f" in u)) return 0;
  const { f } = u;
  return typeof f === "function" ? f(2) : 0;
};
export const closure = () => (u: unknown): unknown => {
  if (typeof u !== "function") return 0;
  const later = () => u("x");
  return later();
};
export const passed = () => (u: unknown): unknown => {
  const run = (f: (x: number) => unknown) => f(1);
  return typeof u === "function" ? run(u) : 0;
};
