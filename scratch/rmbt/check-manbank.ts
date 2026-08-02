// Cold-boot check that the exported bank actually PASSES (not merely computes).
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", {
    get() { return orig; },
    set(N: any) {
      const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
      W.prototype = N.prototype; Object.assign(W, N); return W;
    },
  });
});
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 90000 });
await page.waitForTimeout(6000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const v = [...rt._variables].find((z: any) => z._name === "manFrameResults");
  if (!v) return { error: "manFrameResults not in runtime" };
  const r = await v._module.value("manFrameResults");
  return r.map((f: any) => ({ name: f.name, pass: f.pass, failures: f.failures,
    upright: f.uprightIds, union: f.unionIds, along: f.alongScanPx, across: f.acrossScanPx, fused: f.fusedIds }));
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
