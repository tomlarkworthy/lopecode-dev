// What does the pane show while the mount is pending?
import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.addInitScript(() => {
  const t0 = performance.now(); const T: any[] = []; (window as any).__t = T;
  (window as any).__live = () => { const pr = document.getElementById("lope-prerender");
    return [...document.querySelectorAll("#lopepage-2 .observablehq")].filter((n) => !pr || !pr.contains(n)).length; };
  const tick = () => {
    const lp = document.getElementById("lopepage-2");
    if (lp) {
      const pr = document.getElementById("lope-prerender");
      const txt = (lp.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160);
      T.push([Math.round(performance.now() - t0), (window as any).__live(), lp.querySelectorAll("*").length, txt]);
    }
    setTimeout(tick, 250);
  };
  tick();
});
await page.goto(process.argv[2], { waitUntil: "commit", timeout: 300000 });
await page.waitForFunction(() => (window as any).__live() > 3, { timeout: 300000 });
const t = await page.evaluate(() => (window as any).__t) as any[];
await b.close();
let prev = "";
for (const [ms, live, nodes, txt] of t) {
  const line = String(ms).padStart(6) + "ms  cells=" + String(live).padStart(4) + "  nodes=" + String(nodes).padStart(5) + "  " + txt;
  console.log(line);
  prev = txt;
}
