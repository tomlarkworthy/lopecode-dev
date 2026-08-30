// Can a fat notebook spawn a slim one? Exports blank-notebook with a chosen SUBSET of mains,
// writes it out, then cold-boots the result to see whether it works and how much smaller it is.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync, statSync } from 'fs';

const file = resolve(process.argv[2] || 'lopecode/notebooks/quick_start.html');
const OUT = resolve('scratch/fork-slim.html');
// A "blog post" template: prose + annotations, no agent, no atproto, no wizards.
const KEEP = [
  '@tomlarkworthy/lopepage-2',
  '@tomlarkworthy/blank-notebook',
  '@tomlarkworthy/editable-md',
  '@tomlarkworthy/save-in-place',
  '@tomlarkworthy/annotate',
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(18000);

const res = await page.evaluate(async (KEEP) => {
  const rt = window.__ojs_runtime;
  let exportToHTML = null;
  for (const v of rt._variables)
    if (v._name === 'exportToHTML' && typeof v._value === 'function') exportToHTML = v._value;
  const mains = new Map();
  const missing = [];
  for (const name of KEEP) {
    const m = rt.mains.get(name);
    if (m) mains.set(name, m); else missing.push(name);
  }
  const resp = await exportToHTML({ mains, runtime: rt, options: { hash: '' } });
  const html = resp?.source ?? resp;
  return { html, missing, askedFor: KEEP.length, gave: mains.size, fatMains: rt.mains.size };
}, KEEP);

await browser.close();
writeFileSync(OUT, res.html);
const fat = statSync(file).size, slim = statSync(OUT).size;
console.log(JSON.stringify({
  missing: res.missing, mainsInFork: res.gave, mainsInFat: res.fatMains,
  fatMB: +(fat / 1e6).toFixed(2), slimMB: +(slim / 1e6).toFixed(2),
  shrunkTo: Math.round((slim / fat) * 100) + '%',
}, null, 2));

// Cold boot the fork.
const b2 = await chromium.launch({ headless: true });
const p2 = await b2.newPage();
const ferrs = [];
p2.on('pageerror', (e) => ferrs.push(String(e).slice(0, 160)));
await p2.goto(`file://${OUT}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p2.waitForTimeout(15000);
const boot = await p2.evaluate(() => {
  const rt = window.__ojs_runtime;
  let errCells = 0, total = 0;
  for (const v of rt._variables) {
    total++;
    const n = v._observer && v._observer._node;
    if (n && n.querySelector && n.querySelector('.observablehq--error')) errCells++;
  }
  return {
    mains: [...rt.mains.keys()].sort(),
    variables: total,
    errorCells: errCells,
    bodyText: (document.body.innerText || '').slice(0, 120).replace(/\s+/g, ' '),
  };
});
console.log(JSON.stringify(boot, null, 2));
console.log('fork page errors:', ferrs.length ? ferrs.slice(0, 3) : 'none');
await b2.close();
