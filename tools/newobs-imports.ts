// List every notebook module the page loads, with pinned version + resolutions.
import { chromium } from "playwright";

const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/editor-5";
const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
const reqs: string[] = [];
page.on("request", (r) => {
  const u = r.url();
  if (u.includes("api.observablehq.com") || u.includes(".js?v=4")) reqs.push(u);
});
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(Number(process.argv[3] ?? 25000));
const uniq = [...new Set(reqs)];
console.log("=== module requests:", uniq.length);
for (const u of uniq) {
  const m = u.match(/api\.observablehq\.com\/(.+?)\.js\?(.*)$/);
  if (!m) { console.log("RAW", u); continue; }
  const params = new URLSearchParams(m[2]);
  console.log(m[1], "|| resolutions:", params.get("resolutions") ?? "-");
}
await browser.close();
