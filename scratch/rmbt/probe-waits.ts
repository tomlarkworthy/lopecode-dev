// __waitForId polls document.getElementById(id). Hooking it names every id the
// boot is waiting on, and how long each wait lasted.
import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.addInitScript(() => {
  const t0 = performance.now();
  const miss = new Map<string, { first: number; last: number; n: number }>();
  (window as any).__miss = miss;
  const orig = Document.prototype.getElementById;
  Document.prototype.getElementById = function (id: string) {
    const r = orig.call(this, id);
    if (!r) { const t = Math.round(performance.now() - t0);
      const e = miss.get(id); if (e) { e.last = t; e.n++; } else miss.set(id, { first: t, last: t, n: 1 }); }
    return r;
  };
  (window as any).__live = () => { const pr = document.getElementById("lope-prerender");
    return [...document.querySelectorAll("#lopepage-2 .observablehq")].filter((n) => !pr || !pr.contains(n)).length; };
});
await page.goto(process.argv[2], { waitUntil: "commit", timeout: 300000 });
await page.waitForFunction(() => (window as any).__live() > 3, { timeout: 300000 });
const out = await page.evaluate(() => {
  const m = (window as any).__miss as Map<string, any>;
  return [...m].map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.last - b.first) - (a.last - a.first)).slice(0, 15);
});
await b.close();
console.log("id".padEnd(52) + "first   last   polls");
for (const r of out) console.log(String(r.id).slice(0, 50).padEnd(52) + String(r.first).padStart(6) + String(r.last).padStart(7) + String(r.n).padStart(7));
