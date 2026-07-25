// Diagnose: does a #hash wedge boot? Opens candidates in fresh Playwright Chromium,
// captures console from the first byte, screenshots, and reports responsiveness.
import { chromium } from "playwright";

const CASES = [
  ["bsg-nohash", "file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_belief-state-geometry.html"],
  ["bsg-viewhash", "file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_belief-state-geometry.html#view=S100(@tomlarkworthy/belief-state-geometry)"],
  ["blog-viewhash", "file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/@tomlarkworthy_coding_harness_tuning_blog.html#view=S100(@tomlarkworthy/why-claude-code-codes-well)"],
];

const browser = await chromium.launch({ headless: true });
for (const [name, url] of CASES) {
  const page = await browser.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(m.type() + ": " + m.text().slice(0, 120)));
  page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 200)));
  let navErr = null;
  try {
    await page.goto(url, { waitUntil: "load", timeout: 20000 });
  } catch (e) {
    navErr = String(e).slice(0, 120);
  }
  await new Promise((r) => setTimeout(r, 6000));
  // responsiveness probe: evaluate with its own timeout
  let alive = "no";
  try {
    alive = await Promise.race([
      page.evaluate(() => "yes, hash=" + location.hash.slice(0, 50)),
      new Promise((r) => setTimeout(() => r("EVAL-TIMEOUT (main thread wedged)"), 4000)),
    ]);
  } catch (e) {
    alive = "evalerr " + String(e).slice(0, 80);
  }
  console.log("=== " + name);
  console.log("  nav:", navErr || "ok", "| responsive:", alive);
  console.log("  logs (" + logs.length + "):");
  for (const l of logs.slice(0, 8)) console.log("   ", l);
  await page.close({ runBeforeUnload: false }).catch(() => {});
}
await browser.close();
