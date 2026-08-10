import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve(process.argv[2]);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
await page.waitForTimeout(9000);
const a = await page.evaluate(() => {
  const z = [...document.querySelectorAll("#lopepage-2 .observablehq")]
    .find((n) => /every section has a heading cell/.test(n.textContent || ""));
  return z ? (z.textContent || "").replace(/\s+/g, " ").trim() : "NOT RENDERED";
});
console.log(a);
await browser.close();
