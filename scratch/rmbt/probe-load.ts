// Where does a cold load go? The prerender snapshot contains its own
// #lopepage-2, so "cells on screen" has to exclude anything inside
// #lope-prerender or the probe declares victory 50ms in on the snapshot.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = process.argv[2] ?? `file://${resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html")}`;
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.addInitScript(() => {
  const t0 = performance.now();
  const T: any[] = []; (window as any).__t = T;
  const mark = (k: string, v?: any) => T.push([Math.round(performance.now() - t0), k, v ?? ""]);
  (window as any).__mark = mark;
  (window as any).__live = () => {
    const pr = document.getElementById("lope-prerender");
    return [...document.querySelectorAll("#lopepage-2 .observablehq")].filter((n) => !pr || !pr.contains(n)).length;
  };
  mark("initscript");
  let last = "";
  const tick = () => {
    const de = document.documentElement;
    if (de) {
      const pr = document.getElementById("lope-prerender");
      const st = `prerender=${pr ? (pr.shadowRoot ? "overlay" : "in-page") : "GONE"} liveCells=${(window as any).__live()} parsed=${(de.innerHTML.length / 1e6).toFixed(1)}MB`;
      if (st !== last) { last = st; mark("dom", st + ` scrollY=${Math.round(scrollY)}`); }
    }
    setTimeout(tick, 50);
  };
  tick();
  document.addEventListener("DOMContentLoaded", () => mark("DOMContentLoaded"));
  window.addEventListener("load", () => mark("load"));
});
await page.goto(IN, { waitUntil: "commit", timeout: 300000 });
await page.waitForFunction(() => (window as any).__live() > 3, { timeout: 300000 });
await page.evaluate(() => (window as any).__mark("FIRST LIVE CELL"));
await page.waitForFunction(() => (window as any).__live() > 40, { timeout: 300000 })
  .catch(() => page.evaluate(() => (window as any).__mark("never reached 40 live cells")));
await page.evaluate(() => (window as any).__mark("40 LIVE CELLS"));
for (const [ms, k, v] of (await page.evaluate(() => (window as any).__t)) as any[])
  console.log(String(ms).padStart(7) + "ms  " + k.padEnd(17) + v);
await b.close();
