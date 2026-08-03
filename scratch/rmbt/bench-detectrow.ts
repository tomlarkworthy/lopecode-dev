// JS vs WASM at the cascade boundary, both arms in the SAME page on the SAME
// recorded calls.
//
// The 1.78x from the involution spike was one function measured in isolation;
// this is the number that actually matters, because detectRowMan is the
// boundary a shipped port would cross -- manRowGroups + findInvolution +
// solveMan all inside, one crossing per row.
//
// Fairness, stated up front:
//  - the JS arm gets its {x,s} edge objects BUILT OUTSIDE the timing loop. The
//    real detector already holds them as objects, so allocating them per call
//    would be charging JS for work it does not do.
//  - the WASM arm pays the marshalling into linear memory INSIDE the loop. That
//    is real work a port must do, so it stays on the wasm bill.
//  - arms alternate round by round rather than running one after the other, so
//    thermal drift and any background GC hit both rather than the second one.
//
//   bun scratch/rmbt/bench-detectrow.ts [--wasm scratch/rmbt/detectrow.wasm]
import { chromium } from "playwright";
import { resolve } from "node:path";

const arg = (n: string, d: string) => {
  const i = process.argv.indexOf("--" + n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const NB = resolve(arg("nb", "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html"));
const WASM = arg("wasm", "scratch/rmbt/detectrow.wasm");
const ROUNDS = Number(arg("rounds", "5"));
const cases = await Bun.file("scratch/rmbt/detectrow-cases.json").json();
const b64 = Buffer.from(await Bun.file(WASM).arrayBuffer()).toString("base64");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 300)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(12000);

const out = await page.evaluate(async ({ calls, bin64, rounds }) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const detectRowMan = await mod.value("detectRowMan");

  // --- JS arm: edge objects prebuilt, opts prebuilt
  const jsIn = calls.map((c: any) => ({
    edges: c.xs.map((x: number, i: number) => ({ x, s: c.ss[i] })),
    op: { tolPx: c.tolPx, minInliers: c.minInliers, gapFrac: c.gapFrac,
          minEdges: c.minEdges, minSpan: c.minSpan, minDirect: c.minDirect }
  }));
  let sink = 0;
  const runJs = () => { for (const j of jsIn) sink += detectRowMan(j.edges, j.op).length; };

  // --- WASM arm
  const bin = Uint8Array.from(atob(bin64), (c) => c.charCodeAt(0));
  const m = await WebAssembly.compile(bin);
  const imports: any = {};
  for (const im of WebAssembly.Module.imports(m)) {
    imports[im.module] ??= {};
    imports[im.module][im.name] = im.kind === "function"
      ? (...a: any[]) => { throw new Error(`host call ${im.module}.${im.name}(${a.join(",")})`); }
      : im.kind === "memory" ? new WebAssembly.Memory({ initial: 8 }) : 0;
  }
  const ex = (await WebAssembly.instantiate(m, imports)).exports as any;
  const XS = new Float64Array(ex.memory.buffer, ex.xsPtr(), 512);
  const SS = new Int32Array(ex.memory.buffer, ex.ssPtr(), 512);
  const FOOT = new Float64Array(ex.memory.buffer, ex.footPtr(), 64);
  const D = new Float64Array(ex.memory.buffer, ex.dPtr(), 64);
  const SUP = new Int32Array(ex.memory.buffer, ex.supPtr(), 64);
  const WH = new Float64Array(ex.memory.buffer, ex.wHalfPtr(), 64);
  const ID = new Int32Array(ex.memory.buffer, ex.idPtr(), 64);
  const X0 = new Float64Array(ex.memory.buffer, ex.x0Ptr(), 64);
  const X1 = new Float64Array(ex.memory.buffer, ex.x1Ptr(), 64);
  // raw: what a full scanRowsMan port would pay -- hits stay in linear memory.
  // mat: what a drop-in detectRowMan replacement pays -- hit objects built on
  // the JS side, which is what the JS arm is already being charged for.
  const runWasmRaw = () => {
    for (const c of calls) {
      const n = c.xs.length;
      for (let i = 0; i < n; i++) { XS[i] = c.xs[i]; SS[i] = c.ss[i]; }
      sink += ex.detectRow(n, c.tolPx, c.minInliers, c.gapFrac, c.minEdges, c.minSpan, c.minDirect);
    }
  };
  const runWasmMat = () => {
    for (const c of calls) {
      const n = c.xs.length;
      for (let i = 0; i < n; i++) { XS[i] = c.xs[i]; SS[i] = c.ss[i]; }
      const k = ex.detectRow(n, c.tolPx, c.minInliers, c.gapFrac, c.minEdges, c.minSpan, c.minDirect);
      const hits = new Array(k);
      for (let h = 0; h < k; h++)
        hits[h] = { foot: FOOT[h], d: D[h], sup: SUP[h], wHalf: WH[h],
                    id: ID[h] < 0 ? null : ID[h], x0: X0[h], x1: X1[h] };
      sink += hits.length;
    }
  };

  // warm all arms past tiering (project_coded_landmark_warmup_curve: the JS
  // kernel needs ~1.5M inner iterations, several passes over the bank)
  for (let r = 0; r < 4; r++) { runJs(); runWasmRaw(); runWasmMat(); }

  const js: number[] = [], wa: number[] = [], wm: number[] = [];
  for (let r = 0; r < rounds; r++) {
    let t = performance.now(); runJs(); js.push(performance.now() - t);
    t = performance.now(); runWasmRaw(); wa.push(performance.now() - t);
    t = performance.now(); runWasmMat(); wm.push(performance.now() - t);
  }
  return { js, wa, wm, sink, n: calls.length };
}, { calls: cases.calls, bin64: b64, rounds: ROUNDS });

await browser.close();
const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const j = med(out.js), w = med(out.wa), wm = med(out.wm);
console.log(`detectRowMan, ${out.n} recorded calls per pass (16 frames' worth, several passes)\n`);
console.log("js        per pass (ms): " + out.js.map((x) => x.toFixed(1)).join(" "));
console.log("wasm raw  per pass (ms): " + out.wa.map((x) => x.toFixed(1)).join(" "));
console.log("wasm +obj per pass (ms): " + out.wm.map((x) => x.toFixed(1)).join(" "));
const line = (n: string, t: number) =>
  console.log(`${n.padEnd(10)} ${t.toFixed(1).padStart(7)}ms  ${(t * 1000 / out.n).toFixed(2).padStart(6)}us/call  ${(j / t).toFixed(2)}x`);
console.log("");
line("js", j);
line("wasm raw", w);
line("wasm +obj", wm);
console.log(`\nraw is the ceiling a full scanRowsMan port reaches; +obj is a drop-in`);
console.log(`replacement for this one cell, which has to build the hit objects.`);
