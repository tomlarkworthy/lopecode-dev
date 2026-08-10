// Element screenshots of the figures added or changed by the 2026-08-10 annotation
// round. A probe can tell me a figure has 12734 dots and one <image>; it cannot tell
// me the picture is legible.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const OUT = resolve("tools/screenshots");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
await page.waitForTimeout(8000);
const n = await page.evaluate(() => document.querySelectorAll("#lopepage-2 .observablehq").length);
for (let i = 0; i < n; i++) {
  await page.evaluate((k) => document.querySelectorAll("#lopepage-2 .observablehq")[k]?.scrollIntoView({ block: "center" }), i);
  await page.waitForTimeout(70);
}
await page.waitForTimeout(12000);
const WANT: [string, string][] = [
  ["taster", "read here in"],
  ["combine", "Stage 1 returned"],
  ["lattice", "crossings on one mark"],
  ["rowframe", "row y ="],
  ["rowedges", "edges out of"],
  ["rowgroups", "candidate groups"]
];
for (const [name, needle] of WANT) {
  const idx = await page.evaluate((t) => [...document.querySelectorAll("#lopepage-2 .observablehq")]
    .findIndex((z) => (z.textContent || "").includes(t)), needle);
  if (idx < 0) { console.log(`${name}: NOT FOUND`); continue; }
  await page.evaluate((k) => document.querySelectorAll("#lopepage-2 .observablehq")[k].scrollIntoView({ block: "center" }), idx);
  await page.waitForTimeout(500);
  const el = page.locator("#lopepage-2 .observablehq").nth(idx);
  await el.screenshot({ path: `${OUT}/ann-${name}.png` });
  console.log(`${name}: tools/screenshots/ann-${name}.png`);
}
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
