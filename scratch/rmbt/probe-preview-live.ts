// Same preview check, but against the PUBLISHED page on a phone profile.
import { chromium, devices } from "playwright";
const URL = "https://tomlarkworthy.github.io/lopebooks/notebooks/tomlarkworthy_flat-trace.html";
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ ...devices["Pixel 7"] });
const page = await ctx.newPage();
const errs: string[] = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
page.on("console", (m) => { const t = m.text(); if (m.type() === "error" && !t.includes("Not allowed to load local resource")) errs.push("console: " + t.slice(0, 200)); });
await page.goto(URL, { waitUntil: "networkidle", timeout: 180000 });
await page.waitForTimeout(20000);
const r = await page.evaluate(async () => {
  const host = document.querySelector('[cell="viewof previewOn"]');
  const box = host?.querySelector('input[type=checkbox]') as HTMLInputElement | null;
  if (!box) return { err: "no previewOn toggle in the DOM" };
  box.click();
  await new Promise((s) => setTimeout(s, 14000));
  const panel = document.querySelector('[cell="previewPanel"]') as HTMLElement;
  return { text: panel?.innerText.slice(0, 200), hasCanvas: !!panel?.querySelector("canvas") };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
if (errs.length) console.log("--- errors ---\n" + [...new Set(errs)].slice(0, 6).join("\n"));
