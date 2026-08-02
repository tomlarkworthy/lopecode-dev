// Cold-boot check of §11.4: the rig's self-test must PASS, the sweep must be
// button-gated (not running at boot), and the §11.2/§11.3 regressions must be
// unchanged by the cells added around them.
import { chromium } from "playwright";
import { resolve } from "node:path";
const NB = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
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
await page.goto(`file://${NB}`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 90000 });
await page.waitForTimeout(9000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const get = async (name: string) => {
    const v = [...rt._variables].find((z: any) => z._name === name);
    if (!v) return "MISSING FROM RUNTIME";
    try { return await v._module.value(name); } catch (e: any) { return "ERROR: " + e.message; }
  };
  const selfTest = await get("hexRigSelfTest");
  const axes = await get("manAxesTest");
  const sweep = await get("hexRigSweep");
  const scene = await get("manSceneTest");
  const bank = await get("manFrameResults");
  const print = await get("hexPrintCheck");
  const cases = await get("hexRigCases");
  return {
    selfTest,
    axes,
    sweepAtBoot: typeof sweep === "string" ? sweep : "RAN AT BOOT: " + JSON.stringify(sweep).slice(0, 200),
    casesAtBoot: Array.isArray(cases) ? cases.length : cases,
    scene,
    bank: Array.isArray(bank)
      ? bank.map((f: any) => ({ name: f.name, pass: f.pass, along: f.alongScanPx, across: f.acrossScanPx }))
      : bank,
    print: Array.isArray(print)
      ? print.map((p: any) => `${p.pxPerMm}px/mm read ${p.read} off ${p.offTarget.length} worst ${p.worstErrPx}`)
      : print,
  };
});
console.log("=== hexRigSelfTest ===\n" + out.selfTest);
console.log("\n=== manAxesTest ===\n" + out.axes);
console.log("\n=== sweep at boot ===\n" + out.sweepAtBoot);
console.log("cases at boot:", out.casesAtBoot);
console.log("\n=== manSceneTest ===\n" + out.scene);
console.log("\n=== manFrameResults ===\n" + JSON.stringify(out.bank));
console.log("\n=== hexPrintCheck ===\n" + JSON.stringify(out.print));
await browser.close();
