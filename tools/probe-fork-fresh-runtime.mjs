// The fat launcher spawns a slim notebook. exportToHTML derives its module blocks from
// task.runtime, so exporting a FRESH runtime holding only the template's modules should
// carry only those. Sources come from the fat file itself — no network.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync, statSync } from 'fs';

const file = resolve(process.argv[2] || 'lopecode/notebooks/quick_start.html');
const OUT = resolve('scratch/fork-fresh.html');
const KEEP = [
  '@tomlarkworthy/lopepage-2',
  '@tomlarkworthy/blank-notebook',
  '@tomlarkworthy/editable-md',
  '@tomlarkworthy/save-in-place',
  '@tomlarkworthy/annotate',
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('  [fat page error]', String(e).slice(0, 140)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(18000);

const res = await page.evaluate(async (KEEP) => {
  const rt = window.__ojs_runtime;
  let exportToHTML = null;
  for (const v of rt._variables)
    if (v._name === 'exportToHTML' && typeof v._value === 'function') exportToHTML = v._value;

  const Runtime = rt.constructor;
  const fresh = new Runtime();
  fresh.mains = new Map();
  const mains = new Map();
  const loaded = [], failed = [];
  for (const name of KEEP) {
    try {
      const m = await window.importShim(`/${name}.js?v=4`);
      const mod = fresh.module(m.default);
      fresh.mains.set(name, mod);
      mains.set(name, mod);
      loaded.push(name);
    } catch (e) { failed.push(name + ': ' + e.message.slice(0, 80)); }
  }
  let vars = 0;
  for (const v of fresh._variables) vars++;
  const resp = await exportToHTML({ mains, runtime: fresh, options: { hash: '#view=S100(@tomlarkworthy/blank-notebook)' } });
  return { html: resp?.source ?? resp, loaded, failed, freshVariables: vars, fatVariables: rt._variables.size };
}, KEEP);

await browser.close();
if (res.failed.length) console.log('failed to load:', res.failed);
writeFileSync(OUT, res.html);
const fat = statSync(file).size, slim = statSync(OUT).size;
console.log(JSON.stringify({
  loaded: res.loaded.length, freshVariables: res.freshVariables, fatVariables: res.fatVariables,
  fatMB: +(fat / 1e6).toFixed(2), slimMB: +(slim / 1e6).toFixed(2),
  shrunkTo: Math.round((slim / fat) * 100) + '%',
}, null, 2));

const b2 = await chromium.launch({ headless: true });
const p2 = await b2.newPage();
const ferrs = [];
p2.on('pageerror', (e) => ferrs.push(String(e).slice(0, 160)));
await p2.goto(`file://${OUT}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p2.waitForTimeout(15000);
console.log(JSON.stringify(await p2.evaluate(() => {
  const rt = window.__ojs_runtime;
  let errCells = 0;
  const blocks = [...document.querySelectorAll('script[type="text/plain"][id^="@"]')].map((s) => s.id);
  for (const v of rt._variables) {
    const n = v._observer && v._observer._node;
    if (n && n.querySelector && n.querySelector('.observablehq--error')) errCells++;
  }
  return {
    mains: [...rt.mains.keys()].sort(),
    moduleBlocks: blocks.length,
    errorCells: errCells,
    bodyText: (document.body.innerText || '').slice(0, 110).replace(/\s+/g, ' '),
  };
}), null, 2));
console.log('fork page errors:', ferrs.length ? ferrs.slice(0, 3) : 'none');
await b2.close();
