// Does liveCellMap recompute when a cell is added to a module that already exists?
// Observes cell-map-2's liveCellMap and, as a control, cell-map v1's, then defines a new variable in
// cell-map-2's module and watches for a recompute that contains it.
// run: node tools/scratch/probe-live-cell-map.mjs <notebook.html>
import { chromium } from 'playwright';
import { resolve } from 'path';

const nb = resolve(process.argv[2]);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('file://' + nb);
await page.waitForFunction(() => window.__ojs_runtime, { timeout: 60000 });
await page.waitForTimeout(8000);

const setup = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const vars = [...rt._variables];
  const inputsOf = (v) => v._inputs.map((i) => i._name).join(',');
  // v2's inputs start `cellMap,currentModules` (the fix appends runtime_variables); v1's liveCellMap is
  // the `Generators.input` view getter.
  const isV2 = (v) => v._name === 'liveCellMap' && inputsOf(v).startsWith('cellMap,currentModules');
  const v2 = vars.find(isV2);
  const v1 = vars.find((v) => v._name === 'liveCellMap' && !isV2(v));
  window.__log = { v2: [], v1: [] };
  const watch = (target, key) => {
    if (!target) return false;
    const mod = target._module;
    // an observer variable makes the target reachable and records every fulfilment
    mod.variable({
      fulfilled(map) {
        let total = 0, hasProbe = false;
        for (const [, cells] of map) {
          total += cells.length;
          if (cells.some((c) => c.name === 'probe_added_cell')) hasProbe = true;
        }
        window.__log[key].push({ t: performance.now(), modules: map.size, cells: total, hasProbe });
      },
      rejected(e) { window.__log[key].push({ t: performance.now(), error: String(e).slice(0, 120) }); }
    }).define(null, [target._name], (x) => x);
    return true;
  };
  window.__v2module = v2 && v2._module;
  return { v2: watch(v2, 'v2'), v1: watch(v1, 'v1') };
});
console.log('found', JSON.stringify(setup));
await page.waitForTimeout(6000);
const before = await page.evaluate(() => JSON.parse(JSON.stringify(window.__log)));
console.log('before add: v2 fulfilments', before.v2.length, 'last', JSON.stringify(before.v2.at(-1)));
console.log('before add: v1 fulfilments', before.v1.length, 'last', JSON.stringify(before.v1.at(-1)));

await page.evaluate(() => {
  window.__addedAt = performance.now();
  window.__v2module.variable(true).define('probe_added_cell', [], function _probe_added_cell(){return(42)});
});
await page.waitForTimeout(8000);

const after = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const inRuntime = [...rt._variables].some((v) => v._name === 'probe_added_cell' && v._module === window.__v2module);
  const at = window.__addedAt;
  const since = (arr) => arr.filter((e) => e.t > at);
  return { inRuntime, v2: since(window.__log.v2), v1: since(window.__log.v1) };
});
console.log('probe_added_cell in runtime._variables:', after.inRuntime);
console.log('after add: v2 fulfilments', after.v2.length, JSON.stringify(after.v2.slice(-3)));
console.log('after add: v1 fulfilments', after.v1.length, JSON.stringify(after.v1.slice(-3)));

// REDEFINE in place: same variable object, so runtime._variables membership does not change.
// Turning a plain cell into an import-shaped alias changes what cellMap groups, so a live map
// that misses this is stale in a way that matters, not just cosmetically.
const phase = async (label, action, check) => {
  await page.evaluate(action);
  await page.waitForTimeout(8000);
  const r = await page.evaluate((checkSrc) => {
    const at = window.__phaseAt;
    const since = (arr) => arr.filter((e) => e.t > at);
    return { v2: since(window.__log.v2), v1: since(window.__log.v1) };
  });
  console.log(`after ${label}: v2 fulfilments`, r.v2.length, JSON.stringify(r.v2.slice(-1)));
  console.log(`after ${label}: v1 fulfilments`, r.v1.length, JSON.stringify(r.v1.slice(-1)));
};
await phase('redefine', () => {
  window.__phaseAt = performance.now();
  const v = [...window.__ojs_runtime._variables].find((x) => x._name === 'probe_added_cell' && x._module === window.__v2module);
  v.define('probe_added_cell', [], function _probe_added_cell(){return(43)});
});
await phase('delete', () => {
  window.__phaseAt = performance.now();
  const v = [...window.__ojs_runtime._variables].find((x) => x._name === 'probe_added_cell' && x._module === window.__v2module);
  v.delete();
});
await browser.close();
