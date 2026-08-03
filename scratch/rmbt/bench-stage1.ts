// Stage 1 (edges + the row cascade) with detectRowMan bound to JS vs to wasm,
// on the main thread, over the 16 bank frames.
//
// This is the honest end-to-end number for what the port changes. The pooled
// whole-frame measurement is dominated by worker scheduling -- 16 small frames
// split into 18 chunks across 6 workers -- and its halves swung further than
// the effect being measured, twice, in both directions. Stage 1 serial has no
// scheduler in it.
//
// Both arms run the REAL scanRowsMan cell. The wasm arm is produced by
// redefining detectRowMan, which makes the runtime rebuild scanRowsMan's
// closure around it -- so neither arm is a transcription of the cell, and the
// loop, the edge finder and the option handling are identical by construction.
//
//   bun scratch/rmbt/bench-stage1.ts [--url http://localhost:8791/....html]
import { chromium } from "playwright";
import { resolve } from "node:path";

const argUrl = process.argv.includes("--url") ? process.argv[process.argv.indexOf("--url") + 1] : null;
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const ROUNDS = 9, WARM = 4;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 300)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(argUrl ?? `file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async ({ rounds, warm }) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const bank = await mod.value("hexFrameBank");
  const manScanRows = await mod.value("manScanRows");
  const opts = { ...(await mod.value("hexRigOpts")), bothAxes: false };
  delete (opts as any).runRows;

  const jsDetect = await mod.value("detectRowMan");
  const scanJS = await mod.value("scanRowsMan");

  // build the wasm binding against the JS one as its fallback BEFORE the
  // redefine, so the fallback can never end up pointing back at itself
  const makeWasm = await mod.value("makeWasmDetectRow");
  const bytes = await mod.value("wasmKernelBytes");
  const wasmFn = makeWasm(await WebAssembly.compile(bytes), jsDetect);
  mod.redefine("detectRowMan", [], () => wasmFn);
  await new Promise((r) => setTimeout(r, 500));
  const scanW = await mod.value("scanRowsMan");

  const ys = bank.map((s: any) => manScanRows(s.frame, opts));
  const pass = (scan: any) => {
    const t = performance.now();
    let hits = 0;
    for (let i = 0; i < bank.length; i++)
      for (const r of scan(bank[i].frame, ys[i], opts)) hits += r.hits.length;
    return { ms: (performance.now() - t) / bank.length, hits };
  };

  for (let i = 0; i < warm; i++) { pass(scanJS); pass(scanW); }
  const js: number[] = [], wa: number[] = [];
  let hj = 0, hw = 0;
  for (let i = 0; i < rounds; i++) {
    const a = pass(scanJS); js.push(a.ms); hj = a.hits;
    const b = pass(scanW); wa.push(b.ms); hw = b.hits;
  }
  return { js, wa, hj, hw, frames: bank.length, fellBack: wasmFn.fellBack, isWasm: !!wasmFn.wasm };
}, { rounds: ROUNDS, warm: WARM });

await browser.close();
const med = (a: number[]) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const j = med(out.js), w = med(out.wa);
console.log(`stage 1, ${out.frames} bank frames, main thread, wasm=${out.isWasm}\n`);
console.log("js   ms/frame: " + out.js.map((x) => x.toFixed(2)).join(" "));
console.log("wasm ms/frame: " + out.wa.map((x) => x.toFixed(2)).join(" "));
console.log(`\njs    ${j.toFixed(2)}ms/frame`);
console.log(`wasm  ${w.toFixed(2)}ms/frame`);
console.log(`      ${(j / w).toFixed(2)}x`);
console.log(`\nhits: js ${out.hj}, wasm ${out.hw} ${out.hj === out.hw ? "(equal)" : "*** DIFFER ***"}`);
console.log(`rows handed back to JS: ${out.fellBack}`);
