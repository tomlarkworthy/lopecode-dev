// Who forces the data-module import at boot? Capture the stack of the FIRST
// getElementById miss for that id (synchronous with the caller, before polling).
import { chromium } from "playwright";
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
const TARGET = process.argv[3] ?? "@tomlarkworthy/coded-landmark-tracking-data";
await page.addInitScript((target) => {
  const t0 = performance.now();
  (window as any).__stacks = [] as string[];
  const seen = new Set<string>();
  const orig = Document.prototype.getElementById;
  Document.prototype.getElementById = function (id: string) {
    if (id === target && !seen.has(id)) { seen.add(id);
      (window as any).__stacks.push(Math.round(performance.now() - t0) + "ms\n" + new Error().stack); }
    return orig.call(this, id);
  };
  (window as any).__live = () => { const pr = document.getElementById("lope-prerender");
    return [...document.querySelectorAll("#lopepage-2 .observablehq")].filter((n) => !pr || !pr.contains(n)).length; };
}, TARGET);
await page.goto(process.argv[2], { waitUntil: "commit", timeout: 300000 });
await page.waitForFunction(() => (window as any).__live() > 3, { timeout: 300000 });
console.log((await page.evaluate(() => (window as any).__stacks)).join("\n---\n"));
await b.close();
