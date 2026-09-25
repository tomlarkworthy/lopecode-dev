// Which dependency makes the robocoop_5 UI cell re-render? Counts UI rebuilds and records which inputs changed.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const send = process.argv[3];
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => [...(window.__ojs_runtime?._variables || [])].some(v => v._name === "rc5_controller" && v._value), null, { timeout: 120000 });
await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const ui = [...rt._variables].find(v => v._name === "robocoop_5" && v._type === 1);
  window.__probe = { rebuilds: 0, changed: [] };
  const last = new Map(ui._inputs.map(i => [i._name, i._value]));
  const orig = ui._definition;
  ui._definition = function (...args) {
    window.__probe.rebuilds++;
    const diff = ui._inputs.filter((inp, k) => last.get(inp._name) !== args[k]).map(i => i._name);
    ui._inputs.forEach((inp, k) => last.set(inp._name, args[k]));
    window.__probe.changed.push(diff.join(","));
    return orig.apply(this, args);
  };
});
if (send) {
  await page.locator('textarea[placeholder^="Message robocoop-5"]').fill(send);
  await page.keyboard.press("Enter");
}
for (let i = 0; i < 12; i++) { await page.waitForTimeout(10000); console.log(((i + 1) * 10) + "s", JSON.stringify(await page.evaluate(() => window.__probe))); }
await browser.close();
