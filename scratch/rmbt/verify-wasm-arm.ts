// Boot the notebook and read the two identity gates plus the kernel wiring.
//
// wasmAgreement holds the binary to the cells row by row; poolAgreement now
// holds serial-JS against pooled-wasm end to end, because the serial path is
// deliberately left in JS. Both have to be clean before the toggle is
// defensible as a default.
//
//   bun scratch/rmbt/verify-wasm-arm.ts
import { chromium } from "playwright";
import { resolve } from "node:path";

// A file:// page cannot start a blob: Worker in Chromium ("Not allowed to load
// local resource: blob:null"), so the worker half of this has to be served over
// http. --url points at a served copy; without it only the main-thread gates run.
const argUrl = process.argv.includes("--url") ? process.argv[process.argv.indexOf("--url") + 1] : null;
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error") console.error("CONSOLE", m.text().slice(0, 200)); });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(argUrl ?? `file://${NB}`, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const v = async (n: string) => { try { return await mod.value(n); } catch (e: any) { return { ERR: String(e && e.message || e) }; } };

  const wa = await v("wasmAgreement");
  const src = await v("detectKernelSource");
  const w = await v("wasmDetectRowMan");
  const pool = await v("detectPool");

  // does the kernel a worker actually receives carry the binary and bind it?
  const kernel = typeof src === "string"
    ? { bytes: src.length, hasB64: src.includes("const WASM_B64 ="),
        bindsWasm: src.includes("const detectRowMan = makeWasmDetectRow("),
        hasJs: src.includes("const detectRowManJS = function detectRowMan") }
    : { ERR: "detectKernelSource: " + JSON.stringify(src).slice(0, 200) };

  // and does a worker built from it actually run? send one real job.
  let job: any = null;
  if (typeof src === "string") {
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const wk = new Worker(url);
    const bank = await v("hexFrameBank");
    const opts = { ...(await v("hexRigOpts")), bothAxes: false };
    const f = bank[0].frame;
    const plain: any = {};
    for (const [k, val] of Object.entries(opts)) if (typeof val !== "function") plain[k] = val;
    const ys = (await v("manScanRows"))(f, opts);
    const px = new Uint8Array(ys.length * f.w);
    ys.forEach((y: number, k: number) => px.set(f.gray.subarray(y * f.w, (y + 1) * f.w), k * f.w));
    job = await new Promise((res) => {
      const t = setTimeout(() => res({ err: "worker never replied" }), 20000);
      wk.onmessage = (e: any) => { clearTimeout(t); res(e.data); };
      wk.onerror = (e: any) => { clearTimeout(t); res({ err: "worker error: " + (e.message || e.type) }); };
      wk.postMessage({ type: "rows", w: f.w, h: f.h, ys, px, opts: plain, id: 1 }, [px.buffer]);
    });
    // hits from the wasm worker vs the serial JS cells, same frame
    const serial = (await v("scanRowsMan"))(f, ys, opts);
    const count = (rs: any[]) => rs.reduce((a, r) => a + r.hits.length, 0);
    job = {
      err: (job as any).err ?? null, ms: (job as any).ms,
      workerHits: (job as any).rows ? count((job as any).rows) : null,
      serialHits: count(serial),
      rows: (job as any).rows ? (job as any).rows.length : null
    };
    wk.terminate(); URL.revokeObjectURL(url);
  }

  return {
    wasmOn: await v("wasmOn"),
    wasmIsWasm: !!(w && (w as any).wasm),
    wasmFellBack: (w as any)?.fellBack ?? null,
    agreement: wa, kernel, job, poolSize: (pool as any)?.size ?? 0
  };
});

await browser.close();
console.log(JSON.stringify(out, null, 2));
