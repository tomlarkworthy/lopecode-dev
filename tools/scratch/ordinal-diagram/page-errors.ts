// Opens the spec page, lists every cell error in @spec/ordinal-diagram, and screenshots the given cells.
import { chromium } from "playwright";
import { chromeOptions } from "../../lib/playwright-chrome.js";
const file = `file://${process.cwd()}/${process.env.PAGE || "plan/specs/ordinal-diagram.html"}#view=S100(@spec/ordinal-diagram)`;
const out = process.argv[2] || "/tmp/odg";
const b = await chromium.launch({ headless: true, ...chromeOptions(chromium, { headless: true }) });
const p = await (await b.newContext({ viewport: { width: 1300, height: Number(process.env.VH || 1400) } })).newPage();
await p.goto(file, { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => document.querySelectorAll(".odg-node").length > 50, null, { timeout: 90000 });
await p.waitForTimeout(4000);
const errs = await p.evaluate(() => [...document.querySelectorAll(".observablehq--error")].map((e) => e.textContent!.slice(0, 200)));
console.log("errors:", errs.length);
for (const e of errs) console.log(" ", e);
const diagrams = await p.evaluate(() => [...document.querySelectorAll("svg")].filter((s) => s.querySelector(".odg-node, .odg-group")).length);
console.log("diagrams:", diagrams);
const svgs = p.locator("svg:has(.odg-node, .odg-group)");
for (let k = 0; k < await svgs.count(); k++) {
  const host = svgs.nth(k).locator("xpath=../..");
  const name = await host.evaluate((e) => e.firstElementChild?.textContent || "");
  console.log(k, name);
  if (process.argv.slice(3).some((w) => name.includes(w))) await host.screenshot({ path: `${out}-${k}.png` });
}
await b.close();
