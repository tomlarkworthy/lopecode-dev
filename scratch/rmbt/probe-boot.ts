// What is the mount actually waiting for? Samples runtime state as well as DOM,
// so "0 live cells at 13.8MB parsed" can be attributed to a variable rather
// than guessed at.
import { chromium } from "playwright";
const URL_ = process.argv[2];
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.addInitScript(() => {
  const t0 = performance.now(); const T: any[] = []; (window as any).__t = T;
  const mark = (k: string, v?: any) => T.push([Math.round(performance.now() - t0), k, v ?? ""]);
  (window as any).__mark = mark;
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; mark("Runtime created"); } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
  (window as any).__live = () => { const pr = document.getElementById("lope-prerender");
    return [...document.querySelectorAll("#lopepage-2 .observablehq")].filter((n) => !pr || !pr.contains(n)).length; };
  let last = "";
  const tick = () => {
    const de = document.documentElement;
    if (de) {
      const rt = (window as any).__ojs_runtime;
      const mods = rt ? [...rt.mains.keys()].length : -1;
      let pending = -1, computed = -1;
      if (rt) { const vs = [...rt._variables];
        computed = vs.filter((v: any) => v._value !== undefined && !(v._value instanceof Promise)).length;
        pending = vs.length - computed; }
      const st = `parsed=${(de.innerHTML.length / 1e6).toFixed(1)}MB mains=${mods} vars=${computed}+${pending}pending live=${(window as any).__live()}`;
      if (st !== last) { last = st; mark("s", st); }
    }
    setTimeout(tick, 100);
  };
  tick();
  document.addEventListener("DOMContentLoaded", () => mark("DOMContentLoaded"));
});
await page.goto(URL_, { waitUntil: "commit", timeout: 300000 });
await page.waitForFunction(() => (window as any).__live() > 3, { timeout: 300000 });
await page.evaluate(() => (window as any).__mark("FIRST LIVE CELL"));
const t = await page.evaluate(() => (window as any).__t);
await b.close();
let prev = "";
for (const [ms, k, v] of t as any[]) {
  if (k === "s") { const key = String(v).replace(/parsed=[\d.]+MB /, ""); if (key === prev) continue; prev = key; }
  console.log(String(ms).padStart(7) + "ms  " + k.padEnd(16) + v);
}
