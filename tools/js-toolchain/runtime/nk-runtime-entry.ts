// notebook-kit 2.5.6 runtime surface that js-toolchain's define needs, bundled for the browser.
// build: bun build tools/js-toolchain/runtime/nk-runtime-entry.ts --minify --format esm --target browser --outfile tools/js-toolchain/runtime/notebook-kit-runtime-2.5.6.js
export { display, clear, observe } from "../../../vendor/notebook-kit/src/runtime/display.ts";
export { input } from "../../../vendor/notebook-kit/src/runtime/stdlib/generators/input.ts";
export { Mutator } from "../../../vendor/notebook-kit/src/runtime/stdlib/mutable.ts";
