// Dump the §11.2 man frame bank in full detail, for before/after comparison
// around a change to the stored frame pixels. Anything that moves here means
// the conversion was not the identity it is supposed to be.
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve(process.argv[2] ?? "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
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
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 120000 });
await page.waitForTimeout(10000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const vars = [...rt._variables];
  const get = async (n: string) => {
    const v = vars.find((z: any) => z._name === n);
    if (!v) return "MISSING";
    try { return await v._module.value(n); } catch (e: any) { return "ERROR: " + e.message; }
  };
  const bank: any = await get("manFrameBank");
  const res: any = await get("manFrameResults");
  // a checksum of the actual pixels the detector sees, so a silent change in
  // decoding shows up even if the detector's verdict happens not to move
  const sums = (bank || []).map((f: any) => {
    const g = f.gray ?? f.frame?.gray;
    if (!g) return null;
    let s = 0, n = 0;
    for (let i = 0; i < g.length; i++) { s = (s + g[i] * (i % 7 + 1)) >>> 0; n++; }
    return { name: f.name, w: f.w ?? f.frame?.w, h: f.h ?? f.frame?.h, n, checksum: s };
  });
  return { res, sums };
});
console.log("=== manFrameResults ===");
console.log(JSON.stringify(out.res, (k, v) => (k === "note" || k === "gray" ? undefined : v), 1));
console.log("\n=== frame pixel checksums ===");
console.log(JSON.stringify(out.sums, null, 1));
await browser.close();
