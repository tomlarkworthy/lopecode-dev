// Which lopepage-2 variable gates the mount?
import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.addInitScript(() => {
  const t0 = performance.now(); const T: any[] = []; (window as any).__t = T;
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; T.push([Math.round(performance.now() - t0), "Runtime created", ""]); } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
  (window as any).__live = () => { const pr = document.getElementById("lope-prerender");
    return [...document.querySelectorAll("#lopepage-2 .observablehq")].filter((n) => !pr || !pr.contains(n)).length; };
  const done = new Set<string>();
  const tick = () => {
    const rt = (window as any).__ojs_runtime;
    if (rt) {
      const parsed = (document.documentElement.innerHTML.length / 1e6).toFixed(1);
      for (const [id, m] of rt.mains) {
        if (!/lopepage-2|coded-landmark-tracking$/.test(id)) continue;
        for (const v of rt._variables) {
          if (v._module !== m || !v._name) continue;
          const key = id.split("/")[1] + "." + v._name;
          if (v._value !== undefined && !done.has(key)) { done.add(key); T.push([Math.round(performance.now() - t0), "resolved", key + " @" + parsed + "MB"]); }
        }
      }
      const live = (window as any).__live();
      if (live > 0 && !done.has("__live")) { done.add("__live"); T.push([Math.round(performance.now() - t0), "LIVE CELLS", live + " @" + parsed + "MB"]); }
    }
    setTimeout(tick, 60);
  };
  tick();
});
await page.goto(process.argv[2], { waitUntil: "commit", timeout: 300000 });
await page.waitForFunction(() => (window as any).__live() > 3, { timeout: 300000 });
await page.waitForTimeout(300);
const t = await page.evaluate(() => (window as any).__t) as any[];
await b.close();
// only the last 12 resolutions before the mount, plus the mount itself
const mount = t.findIndex((x) => x[1] === "LIVE CELLS");
for (const [ms, k, v] of t.slice(Math.max(0, mount - 14), mount + 1)) console.log(String(ms).padStart(7) + "ms  " + k.padEnd(15) + v);
console.log("--- total resolutions before mount:", mount);
