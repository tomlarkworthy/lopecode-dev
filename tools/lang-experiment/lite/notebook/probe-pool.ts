// bun lite/notebook/probe-pool.ts
// Times section 7's island on the main thread and in the pool at two workloads and two band counts.
import { chromium } from "../../../../node_modules/playwright/index.mjs";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : r.abort()));
await page.goto("file://" + new URL("lite-cells-tutorial.html", import.meta.url).pathname + "#view=S100(@tomlarkworthy/lite-cells-tutorial)");
await page.waitForFunction(() => { const m = (window as any).__ojs_runtime?.mains?.get("@tomlarkworthy/lite-cells-tutorial"); return m && [...(window as any).__ojs_runtime._variables].some((v: any) => v._module === m && v._name === "benchmark" && v._value); }, null, { timeout: 60000 });
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime; const m = rt.mains.get("@tomlarkworthy/lite-cells-tutorial");
  const get = (n: string) => [...rt._variables].find((v: any) => v._module === m && v._name === n)._value;
  const lite = get("lite"), ex = get("examples");
  const res: any[] = [];
  for (const iters of [600, 2000]) for (const per of [1, 4]) {
    const src = ex.workers.replace("state(600)", `state(${iters})`).replace("poolSize * 4", `poolSize * ${per}`);
    const p = lite.runCells(src, { tsx: true, checked: lite.checkSources({ cells: src, tsx: true }) });
    await p.settle(30000);
    const bands = p.value("bands"), a = p.value("inPool"), b = p.value("onMain");
    const t = async (f: any) => { const t0 = performance.now(); await Promise.all(bands.map((x: any) => f(x))); return performance.now() - t0; };
    await t(a); await t(b); await t(a);
    const ta = [await t(a), await t(a), await t(a)], tb = [await t(b), await t(b), await t(b)];
    res.push({ iters, bands: bands.length, pool: ta.map(Math.round), main: tb.map(Math.round) });
    p.dispose();
  }
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
