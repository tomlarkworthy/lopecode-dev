// Are the fresh runtime's `module X` variables actually being forced before export?
import { chromium } from 'playwright';
import { resolve } from 'path';
const file = resolve('lopecode/notebooks/@tomlarkworthy_blank-notebook.html');
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
p.on('console', (m) => { if (/blank-notebook/.test(m.text())) console.log('  [page]', m.text().slice(0, 160)); });
await p.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(20000);
console.log(JSON.stringify(await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const Runtime = rt.constructor;
  const fresh = new Runtime();
  const em = fresh.module((await window.importShim('/@tomlarkworthy/editable-md.js?v=4')).default);
  const modVars = () => [...fresh._variables].filter((v) => typeof v._name === 'string' && v._name.startsWith('module '));
  const before = modVars().map((v) => `${v._name}=${v._value === undefined ? 'unset' : 'set'}`);
  // force one round by hand and report what happens
  const results = [];
  for (const v of modVars()) {
    try { v._value = await v._definition(); results.push(`${v._name}: ok`); }
    catch (e) { results.push(`${v._name}: ${String(e).slice(0, 70)}`); }
  }
  return { varsBefore: before, forcing: results, modulesAfter: new Set([...fresh._variables].map((v) => v._module)).size };
}), null, 1));
await b.close();
