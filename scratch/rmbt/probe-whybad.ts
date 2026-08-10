// The two annotations of 2026-08-10 evening: the per-card missing-mark diagnostic,
// and About sitting under The Scanner rather than above it.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 200)));
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
await page.waitForTimeout(6000);
const n = await page.evaluate(() => document.querySelectorAll("#lopepage-2 .observablehq").length);
for (let i = 0; i < n; i++) {
  await page.evaluate((k) => document.querySelectorAll("#lopepage-2 .observablehq")[k]?.scrollIntoView({ block: "center" }), i);
  await page.waitForTimeout(70);
}
await page.waitForTimeout(20000);
const out = await page.evaluate(() => {
  const cells = [...document.querySelectorAll("#lopepage-2 .observablehq")];
  const txt = (z: Element) => (z.textContent || "").replace(/\s+/g, " ").trim();
  const first = cells.slice(0, 6).map((z) => txt(z).slice(0, 60));
  const report = cells.find((z) => /marks read now/.test(txt(z)));
  const cards = report ? [...report.querySelectorAll("figcaption")].map((f) => txt(f)) : [];
  const bad = cards.find((c) => /hexcase-5ivq-06/.test(c));
  const why = cells.find((z) => /is not three marks' worth of worse/.test(txt(z)));
  return { first, cards: cards.length, bad, why: why ? txt(why).slice(0, 150) : "NOT RENDERED",
           diagCards: cards.filter((c) => /predicted \d+px from its label/.test(c)).length };
});
console.log(JSON.stringify(out, null, 1));
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
