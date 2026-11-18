// The keys of `ss` in soundscript.html: the checker, the per-cell compiler and decompiler, and the runtime
// that compiled cells call (../stdlib/runtime.ts). build.ts makes cells of the files this reaches
// (ts-cells.ts); the checker module's `soundscript` is an object of these names.
export { lowerJsx } from "../jsx/lower.ts";
export { erase } from "../browser/erase.ts";
export { INTRINSIC_DECLS, PRELUDE_DECLS, JSX_DECLS } from "../intrinsics.ts";
export * from "../stdlib/runtime.ts";
export { STDLIB_INPUT, CAP_INPUTS, LANG, idOf, withId, compiledKind, declaredNameAt, tokensOf, paramsOf } from "../toolchain/ss-toolchain.ts";
export { completionsAt, annotationOf, addParameter } from "../complete.ts";
