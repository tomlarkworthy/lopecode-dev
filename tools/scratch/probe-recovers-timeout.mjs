// Why does test_recovers_this_notebooks_own_cells never settle in the roleOf copy when it passes in
// the baseline? Reads the test's state and its three inputs, then runs its body by hand, timed.
// run: node tools/scratch/probe-recovers-timeout.mjs <notebook.html>
import { chromium } from 'playwright';
import { resolve } from 'path';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 200)));
await page.goto('file://' + resolve(process.argv[2]));
await page.waitForFunction(() => window.__ojs_runtime, { timeout: 60000 });
await page.waitForTimeout(10000);

const snapshot = () => page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const test = [...rt._variables].find((v) => v._name === 'test_recovers_this_notebooks_own_cells');
  if (!test) return { found: false };
  const mod = test._module;
  const byName = (n) => [...rt._variables].find((v) => v._module === mod && v._name === n);
  const state = (v) => v && ({
    name: v._name, reachable: v._reachable, version: v._version,
    value: v._value === undefined ? 'undefined' : typeof v._value,
    error: v._error ? String(v._error).slice(0, 160) : null,
    inputs: v._inputs.map((i) => i._name)
  });
  return {
    found: true,
    test: state(test),
    inputs: ['cellMap', 'currentModules', 'cellMapModule', 'viewof cellMapModule'].map((n) => state(byName(n)))
  };
});

console.log('before', JSON.stringify(await snapshot()));

// _value can hold a stale value while a recompute is pending, so race each _promise.
console.log('promises', JSON.stringify(await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const test = [...rt._variables].find((v) => v._name === 'test_recovers_this_notebooks_own_cells');
  const mod = test._module;
  const names = ['test_recovers_this_notebooks_own_cells', 'cellMapModule', 'viewof cellMapModule', 'currentModules', 'cellMap'];
  const out = {};
  for (const n of names) {
    const v = [...rt._variables].find((x) => x._module === mod && x._name === n);
    out[n] = await Promise.race([
      Promise.resolve(v._promise).then((x) => (x === undefined ? 'settled:undefined' : 'settled:' + typeof x), (e) => 'rejected:' + String(e).slice(0, 80)),
      new Promise((r) => setTimeout(() => r('PENDING after 5s'), 5000))
    ]);
  }
  const vcm = [...rt._variables].find((x) => x._module === mod && x._name === 'viewof cellMapModule');
  out.viewTag = typeof vcm._value?.tag;
  out.viewValueGetter = vcm._value ? (vcm._value.value === mod ? 'module' : String(vcm._value.value)) : 'no view';
  return out;
})));

const manual = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const test = [...rt._variables].find((v) => v._name === 'test_recovers_this_notebooks_own_cells');
  const mod = test._module;
  const valueOf = (n) => mod.value(n);
  const race = (p, ms) => Promise.race([p.then((v) => ({ ok: v }), (e) => ({ err: String(e).slice(0, 200) })), new Promise((r) => setTimeout(() => r({ hung: ms }), ms))]);
  const out = {};
  const t0 = performance.now();
  const cellMap = await race(valueOf('cellMap'), 20000);
  out.cellMap = cellMap.ok ? 'fn' : cellMap;
  const currentModules = await race(valueOf('currentModules'), 20000);
  out.currentModules = currentModules.ok ? `Map(${currentModules.ok.size})` : currentModules;
  const cmm = await race(valueOf('cellMapModule'), 20000);
  out.cellMapModule = cmm.ok ? { isOwnModule: cmm.ok === mod } : cmm;
  if (cellMap.ok && currentModules.ok) {
    const t1 = performance.now();
    const map = cellMap.ok(undefined, currentModules.ok);
    out.cellMapMs = Math.round(performance.now() - t1);
    const cells = map.get(mod);
    out.ownCells = cells ? cells.length : 'module absent';
    out.unresolved = cells?.unresolved ?? null;
  }
  const testRun = await race(valueOf('test_recovers_this_notebooks_own_cells'), 30000);
  out.testValue = testRun;
  out.totalMs = Math.round(performance.now() - t0);
  return out;
});
console.log('manual', JSON.stringify(manual));
console.log('after', JSON.stringify((await snapshot()).test));
await browser.close();
