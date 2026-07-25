// Legacy-runtime regression: open the lopecode HTML in Chromium and read the grid surface.
import { chromium } from "playwright";
const file = "file://" + process.cwd() + "/" + (process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_grid-container.html");
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1200 } })).newPage();
const errs = new Set<string>();
page.on("pageerror", (e) => errs.add(e.message.slice(0, 120)));
await page.goto(file, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(Number(process.argv[3] ?? 25000));
console.log(JSON.stringify(await page.evaluate(() => {
  const el: any = document.querySelector(".sg-frame");
  return {
    atoms: [...document.querySelectorAll(".sg-atom")].map((a: any) => ({ key: a.dataset?.sgKey, label: a.querySelector(".sg-atom-title")?.textContent, pos: a.style.left + "," + a.style.top })),
    candidates: el?.grid?.candidates?.() ?? null,
    templates: el?.grid?.templates?.() ?? null,
  };
}), null, 1));
console.log("pageerrors:", [...errs].filter((e) => !/debugger/.test(e)));
await browser.close();
