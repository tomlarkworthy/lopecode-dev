// Does the runtime settle? Samples the version counters of the cell-map dataflow over a window and
// reports how many times each recomputed after the initial boot.
//   node tools/probe-cellmap-churn.mjs <notebook.html> [windowMs]
import { chromium } from 'playwright';
import path from 'node:path';

const file = path.resolve(process.argv[2]);
const windowMs = Number(process.argv[3] ?? 15000);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
let keepaliveLogs = 0;
page.on('console', (m) => { if (/keepalive: dynamic observe/.test(m.text())) keepaliveLogs++; });
await page.goto(`file://${file}`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__ojs_runtime, null, { timeout: 60000 });
await page.waitForTimeout(4000);

const sample = () => page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const cm = [...(rt.mains || new Map())].find(([n]) => n === '@tomlarkworthy/cell-map')?.[1];
  const v = (n) => [...rt._variables].find((x) => x._name === n && x._module === cm)?._version;
  return {
    vars: rt._variables.size ?? [...rt._variables].length,
    modules: v('modules'), cellMap: v('cellMap'),
    liveCellMap: v('liveCellMap'), maintain: v('maintain_live_cell_map')
  };
});

const before = await sample();
const k0 = keepaliveLogs;
await page.waitForTimeout(windowMs);
const after = await sample();
const delta = Object.fromEntries(Object.keys(before).map((k) => [k, after[k] - before[k]]));
console.log(JSON.stringify({ windowMs, before, after, delta, keepaliveLogsInWindow: keepaliveLogs - k0 }, null, 2));
await browser.close();
