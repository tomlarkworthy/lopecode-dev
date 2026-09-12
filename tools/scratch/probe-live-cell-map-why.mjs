// Why does the fixed liveCellMap recompute without containing a newly added cell?
// Separates "recompute ran on stale state" from "grouping drops this variable".
// run: node tools/scratch/probe-live-cell-map-why.mjs <notebook.html>
import { chromium } from 'playwright';
import { resolve } from 'path';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('file://' + resolve(process.argv[2]));
await page.waitForFunction(() => window.__ojs_runtime, { timeout: 60000 });
await page.waitForTimeout(8000);

const out = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const vars = [...rt._variables];
  const inputsOf = (v) => v._inputs.map((i) => i._name).join(',');
  const live = vars.find((v) => v._name === 'liveCellMap' && inputsOf(v).startsWith('cellMap,currentModules'));
  const mod = live._module;
  const inMod = (name) => [...rt._variables].find((v) => v._module === mod && v._name === name);
  // force the helper cells so their values exist
  const valueOf = async (name) => {
    const v = inMod(name);
    const obs = mod.variable(true).define(null, [name], (x) => x);
    await new Promise((r) => setTimeout(r, 500));
    const val = obs._value;
    obs.delete();
    return { v, val };
  };
  const cellMap = (await valueOf('cellMap')).val;
  const runtimeImport = (await valueOf('runtime')).val;
  const currentModules = (await valueOf('currentModules')).val;
  const defInfo = (await valueOf('defInfo')).val;
  const notACell = (await valueOf('notACell')).val;

  mod.variable(true).define('probe_added_cell', [], () => 42);
  await new Promise((r) => setTimeout(r, 50));
  const probe = inMod('probe_added_cell');

  const find = (map) => {
    for (const [m, cells] of map) {
      const c = cells.find((c) => c.name === 'probe_added_cell');
      if (c) return { sameModule: m === mod, type: c.type, vars: c.variables.map((x) => x._name) };
    }
    return null;
  };
  const direct = cellMap(undefined, currentModules);
  const ownCells = direct.get(mod) || [];
  const holder = ownCells.find((c) => c.variables.includes(probe));
  return {
    runtimeIsSame: runtimeImport === rt,
    probeInRuntime: rt._variables.has(probe),
    probeType: probe._type,
    probeObserverIsTrue: probe._observer === true,
    notACell: notACell(probe._name, probe._type),
    defInfo: (() => { const i = defInfo(probe._definition); return { glue: i.glue, importCell: i.importCell }; })(),
    directHasProbeByName: find(direct),
    probeHeldByCellNamed: holder ? { name: holder.name, type: holder.type, vars: holder.variables.map((x) => x._name) } : null,
    ownCellCount: ownCells.length
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
