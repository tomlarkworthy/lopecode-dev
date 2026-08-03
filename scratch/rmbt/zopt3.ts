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
  // find where the arg vector for the zig compiler is built
  const out: string[] = [];
  for (const pat of ["build-exe", "\"zig\"", "'zig'", "args", "argv", "-target", "wasm32", "-fno-entry", "-O"]) {
    let p = -1, k = 0;
    while ((p = w.indexOf(pat, p + 1)) >= 0 && k < 3) { out.push(`[${pat}] ` + w.slice(Math.max(0, p - 160), p + 200).replace(/\s+/g, " ")); k++; }
  }
  return out;
});
await browser.close();
r.forEach((s) => console.log(s + "\n"));
