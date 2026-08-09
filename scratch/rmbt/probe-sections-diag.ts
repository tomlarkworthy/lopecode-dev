import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const errs: string[] = [];
page.on("pageerror", (x) => errs.push(x.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForTimeout(20000);
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const names = ["sections", "sectionIndex", "sec", "ref", "toc"];
  const res: any = {};
  for (const n of names) {
    const v = [...rt._variables].find((z: any) => z._module === mod && z._name === n);
    if (!v) { res[n] = "NO SUCH VARIABLE"; continue; }
    try { const val = await Promise.race([v._promise, new Promise((r) => setTimeout(() => r("__pending"), 3000))]);
          res[n] = val == null ? String(val) : (val.tagName ?? val.constructor?.name ?? typeof val); }
    catch (e: any) { res[n] = "ERROR: " + e.message; }
  }
  // Any variable in the module currently in error? Bounded, because the live
  // camera cells are generators that never settle -- awaiting them all hangs.
  const broken: string[] = [];
  const bounded = (p: any) => Promise.race([p, new Promise((r) => setTimeout(() => r("__pending"), 400))]);
  for (const v of [...rt._variables]) {
    if (v._module !== mod) continue;
    try { await bounded(v._promise); } catch (e: any) { broken.push(`${v._name ?? "(anon)"}: ${e.message.slice(0,90)}`); }
  }
  return { res, broken: broken.slice(0, 12), brokenCount: broken.length };
});
console.log("machinery cells:", JSON.stringify(out.res, null, 1));
console.log(`\nvariables in error: ${out.brokenCount}`);
for (const b of out.broken) console.log("   " + b);
console.log("pageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
