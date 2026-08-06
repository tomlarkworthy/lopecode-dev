// Verify a freshly built binaryen against the notebook's own acceptance test:
// compile detectrow.as.ts with asc -O3 and require the shipped detectrow.wasm byte for byte.
//   node verify.mjs <dir containing binaryen_js.js (+ .wasm)>
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2]);
const shim = "node_modules/binaryen/index.js";
fs.writeFileSync(shim,
  `import Binaryen from ${JSON.stringify(path.join(dir, "binaryen_js.js"))};\n` +
  `const binaryen = await Binaryen();\nexport default binaryen;\n`);

const sizes = {};
for (const f of ["binaryen_js.js", "binaryen_js.wasm"]) {
  const p = path.join(dir, f);
  if (fs.existsSync(p)) sizes[f] = fs.statSync(p).size;
}

const t0 = performance.now();
const asc = (await import("assemblyscript/asc")).default;
const loadMs = performance.now() - t0;

const src = fs.readFileSync("detectrow.as.ts", "utf8");
const shipped = fs.readFileSync("detectrow.wasm");
const out = {};
const t1 = performance.now();
const r = await asc.main(["main.ts", "--outFile", "main.wasm", "-O3", "--runtime", "stub"], {
  readFile: (n) => (n === "main.ts" ? src : null),
  writeFile: (n, d) => { out[n] = d; },
  listFiles: () => []
});
const compileMs = performance.now() - t1;
const built = out["main.wasm"];

console.log(JSON.stringify({
  dir, sizes,
  ascVersion: asc.version,
  error: r.error ? String(r.error.message || r.error) : null,
  stderr: String(r.stderr?.toString?.() || "").slice(0, 600) || null,
  loadMs: Math.round(loadMs),
  compileMs: Math.round(compileMs),
  builtBytes: built ? built.length : 0,
  shippedBytes: shipped.length,
  identical: built ? Buffer.compare(Buffer.from(built), shipped) === 0 : false
}, null, 1));
