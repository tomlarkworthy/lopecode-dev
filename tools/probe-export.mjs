// Boot a notebook and write out what exportToHTML produces, so block ordering and
// boot health can be measured on the real artifact rather than the hand-edited file.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

const file = resolve(process.argv[2]);
const out = resolve(process.argv[3]);
const wait = Number(process.argv[4] || 30000);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(wait);

const { html, health } = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const byName = (n) => { for (const v of rt._variables) if (v._name === n && typeof v._value === 'function') return v._value; return null; };
  let computed = 0, errored = [], pending = 0;
  for (const v of rt._variables) {
    if (v._error) errored.push(v._name || '(anon)');
    else if (v._value !== undefined) computed++;
    else pending++;
  }
  const resp = await byName('exportToHTML')({ mains: new Map(rt.mains), runtime: rt, options: { hash: '' } });
  return {
    html: String(resp?.source ?? resp),
    health: { mains: [...rt.mains.keys()], computed, pending, errored: errored.slice(0, 12) },
  };
});
writeFileSync(out, html);
console.log(JSON.stringify({ health, wroteMB: +(html.length / 1e6).toFixed(2) }, null, 2));
console.log('page errors:', errs.length ? errs.slice(0, 5) : 'none');
await browser.close();
