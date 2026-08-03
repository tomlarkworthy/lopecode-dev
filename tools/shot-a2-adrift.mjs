// Visual: an annotation whose quote no longer resolves snaps to the top of its cell.
import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1250, height: 3200 } });
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(6000);

const place = async (phrase) => {
  await page.evaluate((ph) => {
    const cell = document.querySelector('.observablehq[cell="demoText"]');
    const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const i = w.currentNode.nodeValue.indexOf(ph);
      if (i >= 0) { const r = document.createRange(); r.setStart(w.currentNode, i); r.setEnd(w.currentNode, i + ph.length);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r); return; } }
  }, phrase);
  await page.waitForTimeout(600);
  await page.click('[data-a2-chip]');
  await page.waitForTimeout(2500);
};
await place('lazy dog');
await place('disambiguate');

// break the second one's quote
const info = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  let store = null; for (const v of rt._variables) if (v._name === 'a2Store' && v._module === mod) store = v._value;
  const a = store.all()[1];
  store.patch(a.id, { box: { dx: 300, dy: 20, w: 230 },
    anchor: Object.assign({}, a.anchor, { quote: { prefix: '', exact: 'zzz-gone', suffix: '' } }) });
  return { id: a.id };
});
await page.waitForTimeout(1200);
const rect = await page.evaluate(() => {
  const c = document.querySelector('.observablehq[cell="demoText"]');
  const r = c.getBoundingClientRect();
  return { x: 0, y: Math.max(0, r.top - 40), width: 1250, height: 420 };
});
await page.screenshot({ path: 'tools/screenshots/a2-adrift.png', clip: rect });
console.log('adrift shot', JSON.stringify(info));
await browser.close();
