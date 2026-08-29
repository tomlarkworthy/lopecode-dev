import { chromium } from "playwright";
const url = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.goto(url, { waitUntil: "load", timeout: 60000 });
const links = await page.evaluate(() =>
  [...document.querySelectorAll("a, button, input[type=submit]")].map((n) => ({
    tag: n.tagName, text: (n.textContent || (n as HTMLInputElement).value || "").trim().slice(0, 60),
    href: (n as HTMLAnchorElement).href || null,
  }))
);
console.log("interstitial controls:", JSON.stringify(links, null, 1));
const cont = page.locator("a,button,input[type=submit]", { hasText: /open the page/i }).first();
if (await cont.count()) {
  await cont.click();
  await page.waitForTimeout(12000);
  const stats = await page.evaluate(() => ({
    title: document.title,
    cells: document.querySelectorAll(".observablehq").length,
    hasRuntime: !!(window as any).__ojs_runtime,
  }));
  console.log("after click:", JSON.stringify(stats), "errors:", errors.slice(0, 3));
}
await browser.close();
