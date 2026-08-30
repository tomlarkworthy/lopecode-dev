import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const b = await chromium.launch({ headless: true });
const page = await b.newPage({ viewport: { width: 1000, height: 1400 } });
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
await page.waitForTimeout(6000);
const h = await page.evaluateHandle(() => {
  const t = [...document.querySelectorAll("table")].find((x) => (x.previousElementSibling?.textContent||"").includes("Earlier installments"));
  return t?.closest(".observablehq") ?? document.body;
});
await (h as any).asElement()!.screenshot({ path: "scratch/rmbt/about-table.png" });
await b.close();
console.log("ok");
