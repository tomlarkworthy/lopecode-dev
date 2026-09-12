// The notebook-kit surface an option C export references: E3 bundle-size measurement.
// run: bun build tools/scratch/nk-helpers-entry.ts --minify --format esm --outfile tools/scratch/nk-helpers.min.js
export { display, clear } from "../../vendor/notebook-kit/src/runtime/display.ts";
export { input } from "../../vendor/notebook-kit/src/runtime/stdlib/generators/input.ts";
export { Mutator } from "../../vendor/notebook-kit/src/runtime/stdlib/mutable.ts";
