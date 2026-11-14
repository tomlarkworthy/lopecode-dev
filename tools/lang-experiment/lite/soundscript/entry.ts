// The one bundle soundscript.html loads (attachment ss.js.gz): the tutorial's checker and private
// runner (../browser/entry.ts) plus the runtime that compiled cells call (../stdlib/runtime.ts).
// Both halves share one prelude instance.
export { checkSources } from "../core.ts";
export { lowerJsx } from "../jsx/lower.ts";
export { erase } from "../browser/erase.ts";
export { runCells, cellsOf } from "../browser/run.ts";
export { INTRINSIC_DECLS, PRELUDE_DECLS, JSX_DECLS } from "../intrinsics.ts";
export {
  compileCell, compileModule, decompileVariable, decompileModule, langOf, cellOfVariable, splitCells,
  ref, action, mut, freeze, borrow, snapshot, equals, refValues, h, on, create, patch, cell, mount,
} from "../stdlib/runtime.ts";
export { STDLIB_INPUT, CAP_INPUTS, LANG } from "../toolchain/ss-toolchain.ts";
