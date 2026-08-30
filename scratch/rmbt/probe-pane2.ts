import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.addInitScript(() => {
  const t0 = performance.now(); const T: any[] = []; (window as any).__t = T;
  (window as any).__live = () => { const pr = document.getElementById("lope-prerender");
    return [...document.querySelectorAll("#lopepage-2 .observablehq")].filter((n) => !pr || !pr.contains(n)).length; };
  const tick = () => {
    const panes = [...document.querySelectorAll(".lp2-pane")].map((p: any) =>
      p.dataset.module + "=[" + (p.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60) + "]");
    const rt = (window as any).__ojs_runtime;
    const mods = rt ? new Set([...rt._variables].map((v: any) => v._module)).size : -1;
    T.push([Math.round(performance.now() - t0), (window as any).__live(), mods, panes.join(" | ")]);
    setTimeout(tick, 400);
  };
  tick();
});
await page.goto(process.argv[2], { waitUntil: "commit", timeout: 300000 });
await page.waitForFunction(() => (window as any).__live() > 3, { timeout: 300000 });
const t = await page.evaluate(() => (window as any).__t) as any[];
await b.close();
for (const [ms, live, mods, panes] of t)
  if (panes) console.log(String(ms).padStart(6) + "ms cells=" + String(live).padStart(4) + " modules=" + String(mods).padStart(3) + "  " + panes);
