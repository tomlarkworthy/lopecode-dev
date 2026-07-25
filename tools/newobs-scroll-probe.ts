// Does scrolling (lazy cell rendering) pull in more notebooks, reintroducing stale @939?
import { chromium } from "playwright";
const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/editor-5";
const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
const mods: string[] = [];
const errs = new Set<string>();
page.on("request", (r) => { if (r.url().includes("api.observablehq.com")) mods.push(r.url()); });
page.on("console", (m) => { if (m.type() === "error") errs.add(m.text().split("\n")[0].slice(0, 120)); });
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(20000);
const before = mods.length;
const frame = page.frames().find((f) => f.url().includes("chat-worker"))!;
for (let i = 0; i < 25; i++) {
  await frame.evaluate(() => window.scrollBy(0, window.innerHeight * 0.9)).catch(() => {});
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(1200);
}
await page.waitForTimeout(8000);
console.log(`module requests: ${before} before scroll -> ${mods.length} after`);
const stale = [...new Set(mods.filter((u) => u.includes("e1c39d41e8e944b0@9") && !u.includes("@950") && !u.includes("@947")))];
console.log(`stale access-runtime fetches: ${stale.length}`);
for (const s of stale) console.log("  ", s.replace("https://api.observablehq.com/", ""));
const newMods = [...new Set(mods.slice(before).map((u) => u.replace("https://api.observablehq.com/", "").split("?")[0]))];
console.log(`\nmodules first seen after scrolling (${newMods.length}):`);
for (const m of newMods) console.log("  ", m);
console.log("\nconsole errors:");
for (const e of errs) console.log("  ", e);
await browser.close();
