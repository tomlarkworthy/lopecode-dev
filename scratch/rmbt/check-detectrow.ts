// Hold the AssemblyScript cascade port to what detectRowMan actually returned
// on all 13228 calls the 16 bank frames make.
//
// Agreement first, speed second: a faster wrong answer is not interesting, and
// this is the bar poolAgreement would have to apply to a shipped WASM arm.
// Comparison is exact for ids and counts, and 1e-9 relative for the floats --
// same arithmetic in the same order, so anything looser would hide a real
// divergence.
//
//   bun scratch/rmbt/check-detectrow.ts [--wasm scratch/rmbt/detectrow.wasm] [--bench]
import { chromium } from "playwright";

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const WASM = arg("wasm", "scratch/rmbt/detectrow.wasm");
const BENCH = process.argv.includes("--bench");
const cases = await Bun.file("scratch/rmbt/detectrow-cases.json").json();
const b64 = Buffer.from(await Bun.file(WASM).arrayBuffer()).toString("base64");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 300)));
await page.goto("about:blank");

const out = await page.evaluate(async ({ calls, bin64, bench }) => {
  const bin = Uint8Array.from(atob(bin64), (c) => c.charCodeAt(0));
  const m = await WebAssembly.compile(bin);
  const imports: any = {};
  for (const im of WebAssembly.Module.imports(m)) {
    imports[im.module] ??= {};
    imports[im.module][im.name] = im.kind === "function"
      ? (...a: any[]) => { throw new Error(`host call ${im.module}.${im.name}(${a.join(",")})`); }
      : im.kind === "memory" ? new WebAssembly.Memory({ initial: 8 }) : 0;
  }
  const inst = await WebAssembly.instantiate(m, imports);
  const ex = inst.exports as any;
  const need = ["detectRow", "xsPtr", "ssPtr", "footPtr", "dPtr", "supPtr", "wHalfPtr", "idPtr", "x0Ptr", "x1Ptr", "overflowed"];
  const missing = need.filter((k) => typeof ex[k] !== "function");
  if (missing.length || !ex.memory) return { err: "missing exports: " + missing.join(", ") + "; have: " + Object.keys(ex).join(", ") };

  const buf = ex.memory.buffer;
  const XS = new Float64Array(buf, ex.xsPtr(), 512);
  const SS = new Int32Array(buf, ex.ssPtr(), 512);
  const FOOT = new Float64Array(buf, ex.footPtr(), 64);
  const D = new Float64Array(buf, ex.dPtr(), 64);
  const SUP = new Int32Array(buf, ex.supPtr(), 64);
  const WH = new Float64Array(buf, ex.wHalfPtr(), 64);
  const ID = new Int32Array(buf, ex.idPtr(), 64);
  const X0 = new Float64Array(buf, ex.x0Ptr(), 64);
  const X1 = new Float64Array(buf, ex.x1Ptr(), 64);

  const run = (c: any) => {
    const n = c.xs.length;
    for (let i = 0; i < n; i++) { XS[i] = c.xs[i]; SS[i] = c.ss[i]; }
    return ex.detectRow(n, c.tolPx, c.minInliers, c.gapFrac, c.minEdges, c.minSpan, c.minDirect);
  };
  const close = (a: number, b: number) =>
    a === b || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

  const bad: any[] = [];
  let over = 0, matched = 0, hitsSeen = 0;
  for (let k = 0; k < calls.length; k++) {
    const c = calls[k];
    const got = run(c);
    if (ex.overflowed()) { over++; bad.push({ k, why: `overflow flags ${ex.overflowed()}, n=${c.xs.length}` }); if (bad.length > 30) break; continue; }
    if (got !== c.hits.length) { bad.push({ k, why: `hits ${c.hits.length} -> ${got} (n=${c.xs.length})` }); if (bad.length > 30) break; continue; }
    let ok = true;
    for (let h = 0; h < got; h++) {
      const e = c.hits[h];
      if (!close(FOOT[h], e.foot)) { bad.push({ k, why: `hit${h} foot ${e.foot} -> ${FOOT[h]}` }); ok = false; break; }
      if (!close(D[h], e.d)) { bad.push({ k, why: `hit${h} d ${e.d} -> ${D[h]}` }); ok = false; break; }
      if (SUP[h] !== e.sup) { bad.push({ k, why: `hit${h} sup ${e.sup} -> ${SUP[h]}` }); ok = false; break; }
      if (!close(WH[h], e.wHalf)) { bad.push({ k, why: `hit${h} wHalf ${e.wHalf} -> ${WH[h]}` }); ok = false; break; }
      if (ID[h] !== e.id) { bad.push({ k, why: `hit${h} id ${e.id} -> ${ID[h]}` }); ok = false; break; }
      if (!close(X0[h], e.x0)) { bad.push({ k, why: `hit${h} x0 ${e.x0} -> ${X0[h]}` }); ok = false; break; }
      if (!close(X1[h], e.x1)) { bad.push({ k, why: `hit${h} x1 ${e.x1} -> ${X1[h]}` }); ok = false; break; }
    }
    if (ok) { matched++; hitsSeen += got; } else if (bad.length > 30) break;
  }

  let tw = 0;
  if (bench && !bad.length) {
    for (let r = 0; r < 3; r++) for (const c of calls) run(c);
    const t = performance.now();
    for (let r = 0; r < 4; r++) for (const c of calls) run(c);
    tw = (performance.now() - t) / 4;
  }
  return { n: calls.length, matched, hitsSeen, over, nBad: bad.length, bad: bad.slice(0, 12), tw };
}, { calls: cases.calls, bin64: b64, bench: BENCH });

await browser.close();
if ((out as any).err) { console.error((out as any).err); process.exit(1); }
console.log(`${out.n} recorded detectRowMan calls`);
if (out.nBad) {
  console.log(`\nDISAGREEMENTS: ${out.nBad}${out.nBad > 30 ? "+" : ""}  (overflow on ${out.over})`);
  for (const b of out.bad) console.log(`  call ${b.k}: ${b.why}`);
  process.exit(1);
}
console.log(`\nidentical on every call: ${out.matched} calls, ${out.hitsSeen} hits, ids and floats both`);
if (out.tw) console.log(`\nwasm ${out.tw.toFixed(0)}ms per pass over all ${out.n} calls`);
