import { chromium } from "playwright";
const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/grid-container";
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1200 } })).newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(Number(process.argv[3] ?? 32000));
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
console.log(JSON.stringify(await frame.evaluate(() => {
  const el: any = document.querySelector(".sg-frame");
  if (!el?.grid) return { error: "no .sg-frame/.grid" };
  return {
    candidates: el.grid.candidates?.(),
    templates: el.grid.templates?.(),
    atoms: [...document.querySelectorAll(".sg-atom")].map((a: any) => a.getAttribute("cell")),
  };
}), null, 1));
await browser.close();
