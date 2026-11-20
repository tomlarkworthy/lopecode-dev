// A State handle reached as unknown, or as a type parameter, exposes the runtime handle's `value` getter: a
// cell reads the state's current value without taking the state cell as an input (2026-11-20).
// bun selfhost/rt/check.ts selfhost/repro-unknown-value.ss.ts
export const n = (): StateCell<number> => state(0);
export const viaUnknown = (n: State<number>): unknown => {
  const u: unknown = n;
  return typeof u === "object" && u !== null && "value" in u ? u.value : null;
};
export const viaGeneric = (n: State<number>): unknown => {
  const peek = <T,>(x: T): unknown => (typeof x === "object" && x !== null && "value" in x ? x.value : null);
  return peek(n);
};
