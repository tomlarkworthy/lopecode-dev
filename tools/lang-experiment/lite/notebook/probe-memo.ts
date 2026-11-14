// bun lite/notebook/probe-memo.ts
// Plays section 9's Breakout for 1 s in headless Chromium and counts, over that second: body runs
// per cell and DOM mutation records on the mounted app (by type).
import { chromium } from "../../../../node_modules/playwright/index.mjs";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : r.abort()));
await page.goto("file://" + new URL("lite-cells-tutorial.html", import.meta.url).pathname + "#view=S100(@tomlarkworthy/lite-cells-tutorial)");
await page.waitForFunction(() => { const rt = (window as any).__ojs_runtime; const m = rt?.mains?.get("@tomlarkworthy/lite-cells-tutorial"); return m && [...rt._variables].some((v: any) => v._module === m && v._name === "mountApp" && v._value) && [...rt._variables].some((v: any) => v._module === m && v._name === "examples" && v._value); }, null, { timeout: 60000 });
const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime; const m = rt.mains.get("@tomlarkworthy/lite-cells-tutorial");
  const get = (n: string) => [...rt._variables].find((v: any) => v._module === m && v._name === n)._value;
  const lite = get("lite"), ex = get("examples"), mountApp = get("mountApp");
  const p = lite.runCells(ex.game, { tsx: true, checked: lite.checkSources({ cells: ex.game, tsx: true }) });
  await p.settle();
  const holder = mountApp(p, "app");
  document.body.append(holder);
  const muts: Record<string, number> = {};
  const mo = new MutationObserver((rs) => { for (const r of rs) { const k = r.type === "attributes" ? `attr ${r.attributeName}` : r.type; muts[k] = (muts[k] ?? 0) + (r.type === "childList" ? r.addedNodes.length + r.removedNodes.length : 1); } });
  mo.observe(holder, { subtree: true, childList: true, attributes: true, characterData: true });
  const before = Object.fromEntries(p.cells.map((c: any) => [c.name, p.evals(c.name)]));
  const w0 = p.value("world");
  p.value("toggle")();
  await new Promise((r) => setTimeout(r, 1000));
  p.value("toggle")();
  await new Promise((r) => setTimeout(r, 100));
  const w1 = p.value("world");
  mo.disconnect();
  const evals = Object.fromEntries(p.cells.map((c: any) => [c.name, p.evals(c.name) - before[c.name]]).filter(([, n]: any) => n > 0));
  p.dispose(); holder.remove();
  return { bricksBroken: w0.bricks.length - w1.bricks.length, evals, mutations: muts };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
