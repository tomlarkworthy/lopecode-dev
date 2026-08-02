// End-to-end, driven the way a user drives it: in a blank notebook that boots annotate as a
// main, open the ≡ menu, click Annotate, then drag a selection across the overview prose.
// Does a note get created, homed in the *blank notebook's* module, and painted?
import { chromium } from 'playwright';
import { resolve } from 'path';
import { appendFileSync, writeFileSync } from 'fs';
const LOG = 'tools/staging/e2e.log';
writeFileSync(LOG, '');
const log = (m) => appendFileSync(LOG, m + '\n');

const file = resolve(process.argv[2] || 'tools/staging/blank-annotate-test.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
log('goto…');
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(18000);
log('settled');

await page.mouse.click(15, 15); // ≡
await page.waitForTimeout(800);
await page.screenshot({ path: 'tools/screenshots/blank-annotate-menu.png' });
const item = page.locator('text=Annotate').first();
if (await item.count()) { await item.click({ timeout: 5000 }).catch((e) => log('click failed: ' + e.message)); log('clicked Annotate'); }
else log('no Annotate entry in the open menu');
await page.waitForTimeout(1000);

const box = await page.evaluate(() => {
  const el = [...document.querySelectorAll('p, li')].find((n) => n.textContent.includes('single self-contained HTML file'));
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});
if (!box) { log('target prose not found'); await browser.close(); process.exit(1); }
log('dragging over ' + JSON.stringify(box));
await page.mouse.move(box.x + 4, box.y + box.h / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.w - 6, box.y + box.h / 2, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(3000);
log('drag done');

log(await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  const boxes = [...document.querySelectorAll('[data-ann-id]')].map((b) => {
    const r = b.getBoundingClientRect();
    return `${b.getAttribute('data-ann-id')} @ ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`;
  });
  const recs = store.all().map((a) => {
    const res = A.resolve(a.anchor);
    return `${a.id}: home=${a.home} anchor.module=${a.anchor && a.anchor.module} rung=${res && res.rung}${res && res.adrift ? ' ADRIFT' : ''}`;
  });
  return `store records: ${recs.length}\n${recs.join('\n')}\npainted boxes: ${boxes.length}\n${boxes.join('\n')}`;
}));
log('page errors: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'none'));
await page.screenshot({ path: 'tools/screenshots/blank-annotate-e2e.png' });
log('done');
await browser.close();
