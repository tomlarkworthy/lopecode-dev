// Name what the mount is waiting for.
import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
  (window as any).__live = () => { const pr = document.getElementById("lope-prerender");
    return [...document.querySelectorAll("#lopepage-2 .observablehq")].filter((n) => !pr || !pr.contains(n)).length; };
});
await page.goto(process.argv[2], { waitUntil: "commit", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
// sample twice while still blank
for (const wait of [1500, 2500]) {
  await page.waitForTimeout(wait);
  const snap = await page.evaluate(() => {
    const rt = (window as any).__ojs_runtime;
    const names = (m: any) => [...rt._variables].filter((v: any) => v._module === m && v._name);
    const out: any = { live: (window as any).__live(), parsedMB: +(document.documentElement.innerHTML.length / 1e6).toFixed(1), byModule: {} };
    for (const [id, m] of rt.mains) {
      const vs = names(m);
      const pend = vs.filter((v: any) => v._value === undefined).map((v: any) => v._name);
      out.byModule[id] = { total: vs.length, pending: pend.length, sample: pend.slice(0, 12) };
    }
    return out;
  });
  console.log(JSON.stringify(snap, null, 1));
  if (snap.live > 3) break;
}
await b.close();
