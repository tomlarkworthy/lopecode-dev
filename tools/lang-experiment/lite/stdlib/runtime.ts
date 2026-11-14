// The SoundScript standard library's runtime half, bundled into @tomlarkworthy/soundscript as ss.js.gz.
// Compiled cells call ss.cell(...); a ref cell's value variable calls ss.refValues(handle).
import * as P from "../../prelude.runtime.ts";
import { h } from "../jsx/h.ts";
import { create, patch } from "../jsx/render.ts";
import { on, guard, generatorish } from "../browser/run.ts";
export { compileCell, compileModule, decompileVariable, decompileModule, langOf, cellOfVariable, splitCells } from "../toolchain/ss-toolchain.ts";
export { checkSources } from "../core.ts";

export const { ref, action, mut, freeze, borrow, snapshot, equals, refValues } = P;
export { h, on, create, patch };

export function cell(fn: (...a: unknown[]) => unknown, kind: "cell" | "ref", name: string, args: unknown[]): unknown {
  P.state.evalDepth++;
  try {
    const r = fn(...args);
    if (kind === "ref") {
      if (!P.isRefCell(r)) throw new Error(`${name} did not return ref(...)`);
      return P.materialize(r, name);
    }
    return generatorish(r) ? guard(r) : r;
  } finally {
    P.state.evalDepth--;
  }
}

// An element value as DOM: patches the node it made last time (pass `this` from an ojs cell).
export function mount(x: unknown, prev: any): Node {
  if (prev && prev.__elem && x && typeof x === "object" && prev.__elem.tag === (x as any).tag) {
    patch(prev, x as any);
    return prev;
  }
  return create(document, x);
}
