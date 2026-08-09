// Drives the widget-count slider and reads instancingCost at each setting. The demo's claim is
// that one column grows with the slider and the other does not; a single reading cannot show that.
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("file://" + process.argv[2], { waitUntil: "load" });
await page.waitForTimeout(15000);
console.log(JSON.stringify(await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const home = [...rt._variables].find((v) => v._name === "instancingCost" && v._definition)._module;
  const view = await home.value("viewof widgetCount");
  const out = [];
  for (const n of [1, 2, 3, 4]) {
    view.value = n;
    view.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 4000));
    out.push(await home.value("instancingCost"));
  }
  return out;
}), null, 1));
await browser.close();
