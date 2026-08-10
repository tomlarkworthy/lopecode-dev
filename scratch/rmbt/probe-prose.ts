// Does the rewritten page-colour prose render? Specifically the indented code
// block in _pgw3 -- markdown indented blocks are easy to get wrong inside a JS
// template literal, and a broken one silently becomes a run-on paragraph.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
await page.waitForTimeout(20000);
const out = await page.evaluate(() => {
  const hit = (t: string) => [...document.querySelectorAll("#lopepage-2 .observablehq")]
    .find((n) => (n.textContent || "").includes(t));
  const r: any = {};
  for (const [k, t] of [["pgw1","The sheet prints on white"],["pgw2","dark framing half-cell"],
                        ["pgw3","Three benches"],["pgw4","closest to a print"],
                        ["pgw5","reported white as catastrophic"],["pgw6","Not tried: a real print"]] as any) {
    const n = hit(t);
    r[k] = n ? { found: true, pre: n.querySelectorAll("pre,code").length,
                 text: (n.textContent || "").replace(/\s+/g," ").trim().slice(0,110) } : { found: false };
  }
  return r;
});
for (const [k, v] of Object.entries(out as any))
  console.log(`${k}: ${(v as any).found ? `pre/code=${(v as any).pre}  "${(v as any).text}"` : "NOT RENDERED"}`);
console.log("pageerrors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
