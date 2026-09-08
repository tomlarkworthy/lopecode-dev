import { chromium } from "playwright";
const [file, out] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
p.on("pageerror", e => errs.push(e.message));
await p.goto("file://" + file, { waitUntil: "load" });
await p.waitForTimeout(15000);
console.log("pageErrors:", JSON.stringify(errs.slice(0, 5)));
console.log("tabs:", JSON.stringify(await p.evaluate(() =>
  [...document.querySelectorAll(".lm_title, [role=tab], .lp2-tab")].map(e => e.textContent.trim()).slice(0, 20))));
await p.screenshot({ path: out, fullPage: false });
await b.close();
