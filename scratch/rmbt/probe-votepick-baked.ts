// Final check against the notebook AS WRITTEN TO DISK -- no redefine. Every
// earlier measurement patched the cell at runtime, so this is the first test of
// what actually ships.
import { chromium } from "playwright";
import { resolve } from "node:path";

const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs: string[] = [];
page.on("pageerror", (x) => errs.push(x.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(15000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const val = async (n: string) => {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    if (!v) throw new Error("no variable " + n); return await v._promise;
  };
  const [bank, opts, asyncA, pool, score] = await Promise.all(
    ["hexFrameBank", "hexRigOpts", "analyzeFrameManAsync", "detectPool", "hexRigScore"].map(val)
  );
  const run = async (o: any) => {
    const resid: number[] = []; let read = 0, missing = 0, flips = 0, both = 0;
    for (const bk of bank as any[]) {
      const r = await asyncA({ gray: bk.frame.gray, w: bk.frame.w, h: bk.frame.h },
        { ...opts, bothAxes: true, runRows: pool.runRows, ...o });
      const sc = score(r, bk.truth);
      read += sc.counts.read; missing += sc.counts.missing;
      for (const m of (r.fused ?? [])) if (m.axis === "both") { both++; if (m.pickedCol === false) flips++; }
      for (const m of sc.marks) if (m.residualPx != null) resid.push(m.residualPx);
    }
    resid.sort((a, b) => a - b);
    return { read, missing, both, flips, n: resid.length,
      mean: +(resid.reduce((a, c) => a + c, 0) / resid.length).toFixed(3) };
  };
  return { shipped: await run({}), old: await run({ axisPick: "col" }) };
});
console.log("baked notebook, pooled path:");
console.log("  DEFAULT (vote) :", JSON.stringify(out.shipped));
console.log("  axisPick 'col' :", JSON.stringify(out.old));
console.log("  -> default differs from old:", out.shipped.mean !== out.old.mean, "| escape hatch works:", out.old.mean === 3.033);
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
