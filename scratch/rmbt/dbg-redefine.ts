import { chromium } from "playwright";
const URL = "http://localhost:8791/tomlarkworthy_coded-landmark-tracking.html";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("PAGEERROR", e.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(URL, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 180000 });
await page.waitForTimeout(12000);
console.log(JSON.stringify(await page.evaluate(async () => {
  const mod = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const jsDetect = await mod.value("detectRowMan");
  const scanJS = await mod.value("scanRowsMan");
  const makeWasm = await mod.value("makeWasmDetectRow");
  const bytes = await mod.value("wasmKernelBytes");
  const wasmFn = makeWasm(await WebAssembly.compile(bytes), jsDetect);
  mod.redefine("detectRowMan", [], () => wasmFn);
  await new Promise((r) => setTimeout(r, 800));
  const after = await mod.value("detectRowMan");
  const scanW = await mod.value("scanRowsMan");
  return {
    wasmFnIsWasm: !!wasmFn.wasm,
    detectIsWasmAfter: after === wasmFn,
    scanRebuilt: scanW !== scanJS,
    scanSrcHead: String(scanW).slice(0, 60)
  };
}, null), null, 2));
await browser.close();
