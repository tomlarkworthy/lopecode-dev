import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
await p.goto("file:///tmp/@tomlarkworthy_parallel-runtime-qa.html");
await p.waitForFunction(() => !!window.__ojs_hooks && !!window.__ojs_hooks.policy, null, { timeout: 90000 });
await p.waitForTimeout(3000);
console.log(await p.evaluate(() => ({
  ranges: [...document.querySelectorAll("input[type=range]")].map((e) => (e.closest("form")?.textContent || "").slice(0, 40)),
  checks: [...document.querySelectorAll("input[type=checkbox]")].map((e) => (e.closest("form")?.textContent || "").slice(0, 40)),
  buttons: [...document.querySelectorAll("button")].map((e) => e.textContent.trim().slice(0, 30)).slice(0, 20),
  panes: [...document.querySelectorAll("[data-module], .lp2-pane")].map((e) => e.getAttribute("data-module")).filter(Boolean)
})));
await p.screenshot({ path: "tools/screenshots/pr-controls.png" });
await b.close();
process.exit(0);
