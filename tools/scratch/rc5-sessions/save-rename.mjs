// The case Tom hit 2026-09-26: the session module exists (a turn was committed) BEFORE save is ticked.
// Tick save in the UI; module-map must name it, the "open ↗" link must appear and open the module's pane.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => [...(window.__ojs_runtime?._variables || [])].some(v => v._name === "rc5_controller" && v._value), null, { timeout: 120000 });
const names = () => page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const c = [...rt._variables].find(v => v._name === "rc5_controller")._value;
  const m = c.active.log?.module;
  return [...new Set([...rt._variables].filter(v => v._name === "currentModules" && v._value instanceof Map).map(v => v._value.get(m)?.name))];
});
// make the log exist unsaved, as a committed turn would
await page.evaluate(async () => {
  const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
  await c.setSaved(c.active, true); await c.setSaved(c.active, false);
});
await page.waitForTimeout(2000);
console.log("unsaved, log exists:", JSON.stringify(await names()));
await page.locator('label:has-text("save") input[type=checkbox]').check();
await page.waitForTimeout(1500);
console.log("after ticking save:", JSON.stringify(await names()));
const link = page.locator('a[title="Open the session module"]');
console.log("link visible:", await link.isVisible(), "href:", await link.getAttribute("href"));
await link.click();
await page.waitForTimeout(2000);
console.log("hash:", await page.evaluate(() => location.hash));
console.log("pane:", JSON.stringify(await page.evaluate(() => {
  const n = [...window.__ojs_runtime.mains.keys()].find(k => k.startsWith("@rc5-sessions/"));
  const el = document.querySelector(`.lp2-pane[data-module="${n}"]`);
  return el ? el.innerText.slice(0, 160) : "no pane";
})));
await page.screenshot({ path: resolve(here, "out/save-rename.png"), clip: { x: 0, y: 0, width: 1400, height: 500 } });
// the link moved the chat into a tab stack, so untick through the controller
await page.evaluate(async () => { const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value; await c.setSaved(c.active, false); });
await page.waitForTimeout(1500);
console.log("after unticking:", JSON.stringify(await names()));
console.log("errors", JSON.stringify(errors.slice(0, 5)));
await browser.close();
