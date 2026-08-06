import fs from "node:fs";
globalThis.__BINARYEN_WASM__ = new Uint8Array(fs.readFileSync("binaryen-131.wasm"));
const binaryen = (await import("binaryen")).default;   // stock npm build, as the optimizer
const F = binaryen.Features;
const feats = F.SignExt|F.MutableGlobals|F.BulkMemory|F.BulkMemoryOpt|F.NontrappingFPToInt|F.ReferenceTypes|F.MultiValue|F.ExceptionHandling|F.TailCall;
const inp = process.argv[2], outp = process.argv[3];
const bytes = fs.readFileSync(inp);
const m = binaryen.readBinary(new Uint8Array(bytes));
m.setFeatures(feats);
binaryen.setOptimizeLevel(2); binaryen.setShrinkLevel(2); binaryen.setDebugInfo(false);
const t=performance.now(); m.optimize();
const out = m.emitBinary();
fs.writeFileSync(outp, Buffer.from(out));
console.log(`${inp}: ${bytes.length} -> ${out.length} (${(100*(1-out.length/bytes.length)).toFixed(1)}% off) in ${Math.round(performance.now()-t)}ms, valid=${m.validate()}`);
