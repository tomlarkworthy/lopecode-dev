import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/@tomlarkworthy_compile-zig.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(8000);
const r = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/compile-zig");
  const assets = await (await mod.value("zig_assets")).load();
  const w = assets.patchedWorker as string;
  const hits: any = {};
  for (const k of ["ReleaseFast","ReleaseSmall","ReleaseSafe","Debug","optimize","-O","O_flag","strip","single_threaded","mode"]) {
    const idx: number[] = []; let i = -1;
    while ((i = w.indexOf(k, i + 1)) >= 0 && idx.length < 6) idx.push(i);
    if (idx.length) hits[k] = idx.map((p) => w.slice(Math.max(0, p - 90), p + 90).replace(/\s+/g, " "));
  }
  return { len: w.length, hits };
});
await browser.close();
console.log("worker length", r.len);
for (const [k, v] of Object.entries(r.hits)) { console.log("\n### " + k); for (const s of v as string[]) console.log("   " + s); }
