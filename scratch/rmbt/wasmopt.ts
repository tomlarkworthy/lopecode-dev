// Run Binaryen's -O3 over a .wasm, as a post-pass.
//
// The point: @tomlarkworthy/compile-zig can never optimise its own output --
// Zig gates `llvm_backend` to the `core`/`full` dev envs and the playground
// builds with `.dev = "wasm"`, so LLVM is compiled OUT of zig.wasm rather than
// switched off. If Binaryen can recover the difference from outside, the
// notebook can still ship a fast kernel it compiled itself. If it cannot, a
// prebuilt .wasm from a real toolchain is the only route.
//
// Binaryen is the optimiser of record for exactly this shape of input --
// dart2wasm, Kotlin/Wasm and AssemblyScript all emit naive wasm and delegate
// everything to it.
//
//   bun scratch/rmbt/wasmopt.ts in.wasm out.wasm [--O 3] [--shrink 0]
import binaryen from "../binaryen/binaryen.js";

const IN = process.argv[2], OUT = process.argv[3];
if (!IN || !OUT) { console.error("usage: wasmopt.ts <in.wasm> <out.wasm> [--O 3] [--shrink 0]"); process.exit(2); }
const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const O = +arg("O", "3"), SHRINK = +arg("shrink", "0");

const bytes = new Uint8Array(await Bun.file(IN).arrayBuffer());
const t0 = performance.now();
const m = binaryen.readBinary(bytes);
binaryen.setOptimizeLevel(O);
binaryen.setShrinkLevel(SHRINK);
if (!m.validate()) { console.error("input failed binaryen validation"); process.exit(1); }
m.optimize();
const out = m.emitBinary();
const ms = performance.now() - t0;
await Bun.write(OUT, out);
console.log(`${IN} ${bytes.length} -> ${OUT} ${out.length} bytes  (-O${O} shrink ${SHRINK}, ${ms.toFixed(0)}ms)`);
