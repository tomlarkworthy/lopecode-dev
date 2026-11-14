// The parts of the cell runner that need no Observable Runtime: cell shapes read from source, the
// subscription value on(...) builds, and the guard a generator runs under. run.ts (the private
// runner) and the per-cell toolchain both use them; the notebook bundle has no Runtime.
import * as P from "../../prelude.runtime.ts";
export { cellsOf, factsOf, type CellInfo } from "../facts.ts";

// on(source, action): a subscription, as a value. The runner keeps running the set a cell returns.
export const SUB = Symbol("sub");
export const on = (source: unknown, act: unknown) => Object.freeze({ [SUB]: true, source, action: act });
export const isSubs = (v: unknown): v is { source: { make: () => any }; action: (x: unknown) => void }[] =>
  Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === "object" && SUB in x);

export const generatorish = (v: any): v is Generator => !!v && typeof v.next === "function" && typeof v.return === "function";
export function guard(g: Generator) {
  const wrap = (m: "next" | "return" | "throw") => (...a: unknown[]) => {
    P.state.evalDepth++;
    try { return (g[m] as (...x: unknown[]) => unknown)(...a); } finally { P.state.evalDepth--; }
  };
  return { next: wrap("next"), return: wrap("return"), throw: wrap("throw"), [Symbol.iterator]() { return this; } };
}

