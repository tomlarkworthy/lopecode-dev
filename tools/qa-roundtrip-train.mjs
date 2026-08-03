import { chromium } from "playwright";
const url = "file:///Users/tom.larkworthy/dev/lopecode-dev/tools/staging/@tomlarkworthy_belief-geometry.html";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(12000);
await page.evaluate(() => {
  const t = [...document.querySelectorAll('input[type=checkbox]')].find((x) => x.closest("form") && /train transformer/.test(x.closest("form").textContent));
  t.click();
});
console.log("training 45s...");
await page.waitForTimeout(45000);
const info = await page.evaluate(() => {
  const text = document.body.innerText;
  const figs = [...document.querySelectorAll(".bsg-fig")];
  const emerge = figs.find((f) => f.querySelector('input[type="range"]') && /checkpoint/.test(f.parentElement ? f.parentElement.textContent : f.textContent)) ||
    figs.find((f) => /emergence|checkpoint/.test(f.textContent));
  return {
    step: (text.match(/-param GPT · step (\d+)/) || [])[1],
    emergenceHasCanvas: !!(emerge && emerge.querySelector("canvas")),
    emergencePlaceholderGone: !/train to accumulate checkpoints/.test(text),
    fusionRounds: /workers averaged every 50 steps/.test(text)
  };
});
console.log(JSON.stringify(info));
console.log("errors:", errs.slice(0, 5));
await browser.close();
