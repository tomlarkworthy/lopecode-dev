// Is the predicted bundle size honest? Builds real forks and compares against what the chooser
// promised. A prediction nobody checked is worse than no prediction.
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)));
await p.goto(`file://${resolve('lopecode/notebooks/quick_start.html')}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(25000);
const rows = await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const templates = val('templates'), forkModules = val('forkModules'),
        bundleSize = val('bundleSize'), spawn = val('spawnNotebook');
  const cases = [
    { name: 'blank, no tutorial', t: 'blank', mods: [], tut: false },
    { name: 'blank + tutorial',   t: 'blank', mods: [], tut: true },
    { name: 'blog defaults',      t: 'blog',  mods: null, tut: true },
    { name: 'ui defaults',        t: 'ui',    mods: null, tut: true },
  ];
  const out = [];
  for (const c of cases) {
    const template = templates.find((x) => x.id === c.t);
    const modules = c.mods === null ? template.defaults : c.mods;
    const { loaded } = forkModules({ template, modules, tutorial: c.tut });
    const est = bundleSize(loaded);
    const { html } = await spawn({ template, name: '@user/probe', title: 'Probe', modules, tutorial: c.tut, theme: null });
    out.push({ name: c.name, predicted: est.bytes, actual: html.length, modules: est.modules, missing: est.missing });
  }
  return out;
});
await b.close();
for (const r of rows) {
  const err = (r.predicted - r.actual) / r.actual * 100;
  console.log(`${r.name.padEnd(22)} predicted ${(r.predicted/1e6).toFixed(2)}MB  actual ${(r.actual/1e6).toFixed(2)}MB  ${err >= 0 ? '+' : ''}${err.toFixed(1)}%  ${r.modules} modules${r.missing.length ? '  MISSING ' + r.missing.join(',') : ''}`);
}
const worst = Math.max(...rows.map((r) => Math.abs((r.predicted - r.actual) / r.actual * 100)));
console.log(`\nworst error ${worst.toFixed(1)}%`);
process.exit(worst <= 10 ? 0 : 1);
