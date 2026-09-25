// Why CMD+K can't find a saved session: save one (no model call), then read what module-map's
// currentModules calls it, and ask the palette's module finder for it.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => [...(window.__ojs_runtime?._variables || [])].some(v => v._name === "rc5_controller" && v._value), null, { timeout: 120000 });
const snap = () => page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const vs = [...rt._variables];
  const cms = vs.filter(v => v._name === "currentModules" && v._value instanceof Map);
  const mains = new Map([...rt.mains].map(([k, m]) => [m, k]));
  return cms.map(v => ({
    size: v._value.size,
    rc5: [...v._value.entries()].filter(([m, i]) => mains.get(m)?.startsWith("@rc5-sessions/") || String(i?.name).startsWith("@rc5-sessions/"))
      .map(([m, i]) => ({ mainsKey: mains.get(m), name: i?.name, type: i?.type })),
    mains: [...v._value.values()].filter(i => i?.name === "main").length,
  }));
});
console.log("before", JSON.stringify(await snap()));
const id = await page.evaluate(async () => {
  const c = [...window.__ojs_runtime._variables].find(v => v._name === "rc5_controller")._value;
  await c.setSaved(c.active, true);
  return c.active.log.module && [...window.__ojs_runtime.mains].find(([k, m]) => m === c.active.log.module)?.[0];
});
console.log("saved as", id);
for (const t of [1000, 5000]) { await page.waitForTimeout(t); console.log(`after +${t}ms`, JSON.stringify(await snap())); }
await page.mouse.click(700, 500);
await page.keyboard.press("Meta+k");
await page.waitForTimeout(1000);
await page.keyboard.type("rc5-sessions");
await page.waitForTimeout(1500);
console.log("palette shows session:", await page.evaluate(n => document.body.innerText.split("\n").filter(l => l.includes(n)), "rc5-sessions"));
await page.screenshot({ path: resolve(here, "out/cmdk.png") });
const found = await page.evaluate(q => {
  const p = [...window.__ojs_runtime._variables].find(v => v._name === "moduleFinderPlugin" && typeof v._value === "function");
  return p ? p._value(q).map(r => r.label) : "no moduleFinderPlugin value";
}, "rc5-sessions");
console.log("finder('rc5-sessions'):", JSON.stringify(found));
await browser.close();
