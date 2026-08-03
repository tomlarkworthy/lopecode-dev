// Boot a blank notebook that also boots annotate: does the menu item appear, and does anything
// stray get painted (the annotate notebook's own tour notes travel with the module)?
import { chromium } from 'playwright';
import { resolve } from 'path';
const file = resolve(process.argv[2] || 'tools/staging/blank-annotate-test.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(18000);
console.log(await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  const boxes = [...document.querySelectorAll('[data-ann-id]')].map((b) => {
    const r = b.getBoundingClientRect();
    return `${b.getAttribute('data-ann-id')} @ ${Math.round(r.left)},${Math.round(r.top)}`;
  });
  const recs = store ? store.all().map((a) => {
    const res = A.resolve(a.anchor);
    return `${a.id}: home=${a.home} rung=${res && res.rung}${res && res.adrift ? ' ADRIFT' : ''}`;
  }) : ['no store'];
  return `mains: ${[...rt.mains.keys()].length} modules
store records: ${recs.length}
${recs.join('\n')}
painted boxes: ${boxes.length}
${boxes.join('\n')}
menu/plugin: ${document.body.innerHTML.includes('Annotate') ? 'the word Annotate appears in the DOM' : 'no Annotate in DOM'}`;
}));
console.log('page errors:', errs.length ? errs.slice(0, 3).join(' | ') : 'none');
await page.screenshot({ path: 'tools/screenshots/blank-annotate.png' });
await browser.close();
