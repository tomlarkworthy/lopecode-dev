// Does a main that is not in the #view hash render anywhere? (S0 follow-up)
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch(); const page = await browser.newPage();
await page.goto(pathToFileURL(resolve(here, "out/s0-exported.html")).href);
await page.waitForFunction(() => [...(window.__ojs_runtime?._variables || [])].some(v => v._name === "session" && v._value), null, { timeout: 90000 });
await page.waitForTimeout(3000);
console.log(JSON.stringify(await page.evaluate(() => ({
  textHits: document.body.innerText.split("robocoop-5/session").length - 1,
  paneTitles: [...document.querySelectorAll("[class*=tab], [class*=pane] h1, [class*=title]")].map(e => e.textContent.trim()).filter(t => t.includes("rc5-sessions")).slice(0, 5),
}))));
await browser.close();
