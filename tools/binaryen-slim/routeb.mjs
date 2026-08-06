import fs from "node:fs";
globalThis.__BINARYEN_WASM__ = new Uint8Array(fs.readFileSync("binaryen-131.wasm"));
const binaryen = (await import("binaryen")).default;   // stock npm build does the surgery

const GLUE = process.argv[2], WASM = process.argv[3], OUT = process.argv[4];
const keep = new Set(JSON.parse(fs.readFileSync("keep_c.json", "utf8")));

// glue maps C name -> minified wasm export:  _BinaryenAddFunction=a.ax
const glue = fs.readFileSync(GLUE, "latin1");
const map = new Map();
for (const m of glue.matchAll(/\b(_[A-Za-z0-9_]+)\s*=\s*[A-Za-z_$]{1,3}\.([A-Za-z0-9_$]+)\b/g))
  map.set(m[1], m[2]);

// Only ever cut the C API family. Everything else (runtime plumbing: stack, errno,
// __wasm_call_ctors, memory/table) stays exported regardless.
const FAMILY = /^_(Binaryen|Relooper|TypeBuilder|Expression|Module)/;
const cut = [];
for (const [cname, exp] of map)
  if (FAMILY.test(cname) && !keep.has(cname)) cut.push(exp);

const F = binaryen.Features;
const feats = F.SignExt|F.MutableGlobals|F.BulkMemory|F.BulkMemoryOpt|F.NontrappingFPToInt|
              F.ReferenceTypes|F.MultiValue|F.ExceptionHandling|F.TailCall;
const before = fs.readFileSync(WASM);
const m = binaryen.readBinary(new Uint8Array(before));
m.setFeatures(feats);

let removed = 0;
for (const e of cut) { try { m.removeExport(e); removed++; } catch {} }
console.log(`mapped ${map.size} C names, cutting ${cut.length} exports, removed ${removed}`);

binaryen.setOptimizeLevel(2); binaryen.setShrinkLevel(2); binaryen.setDebugInfo(false);
const t = performance.now();
m.runPasses(["remove-unused-module-elements"]);
m.optimize();
const out = m.emitBinary();
fs.writeFileSync(OUT, Buffer.from(out));
console.log(`${before.length} -> ${out.length} (${(100*(1-out.length/before.length)).toFixed(1)}% off) in ${Math.round(performance.now()-t)}ms valid=${m.validate()}`);
