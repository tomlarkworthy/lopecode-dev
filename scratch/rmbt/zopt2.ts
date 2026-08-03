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
  // how does the worker turn {run: source} into a compile?
  const i = w.indexOf("onmessage");
  const outs: string[] = [];
  let p = -1;
  while ((p = w.indexOf(".run", p + 1)) >= 0 && outs.length < 8)
    outs.push(w.slice(Math.max(0, p - 200), p + 260).replace(/\s+/g, " "));
  return { onmsg: w.slice(i - 200, i + 1400).replace(/\s+/g, " "), outs };
});
await browser.close();
console.log("=== onmessage region\n" + r.onmsg + "\n");
r.outs.forEach((s, k) => console.log(`=== .run #${k}\n${s}\n`));
