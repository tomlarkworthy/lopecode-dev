// Re-anchor by drag-selection: does the selection reach the layer after the doc reorder?
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 4600 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(7000);

const gt = await page.evaluate(() => {
  const cell = document.querySelector('.observablehq[cell="demoText"]');
  const text = cell.textContent;
  const at = text.indexOf('disambiguate');
  const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  let acc = 0, sN = null, sO = 0, eN = null, eO = 0;
  const end = at + 'disambiguate'.length;
  while (w.nextNode()) {
    const n = w.currentNode, len = n.nodeValue.length;
    if (!sN && acc + len >= at) { sN = n; sO = at - acc; }
    if (acc + len >= end) { eN = n; eO = end - acc; break; }
    acc += len;
  }
  const r = document.createRange(); r.setStart(sN, sO); r.setEnd(eN, eO);
  const b = r.getClientRects()[0];
  return { at, left: b.left, top: b.top, width: b.width, height: b.height };
});
console.log('phrase rect', JSON.stringify(gt));
console.log('element at phrase midpoint:', await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  return el ? el.tagName + '.' + (el.className.baseVal || el.className || '') + ' | ' + (el.textContent || '').trim().slice(0, 40) : null;
}, [gt.left + gt.width / 2, gt.top + gt.height / 2]));

// arm re-anchor on a fresh annotation placed on the image
await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  for (const v of rt._variables) if (v._name === 'a2Layer' && v._module === mod) v._value.arm();
});
const imgPt = await page.evaluate(() => {
  const r = document.querySelector('.observablehq[cell="demoImage"] img').getBoundingClientRect();
  return { x: r.left + r.width * 0.25, y: r.top + r.height * 0.5 };
});
await page.mouse.click(imgPt.x, imgPt.y);
await page.waitForTimeout(800);
const id = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  for (const v of rt._variables) if (v._name === 'a2Store' && v._module === mod) {
    const all = v._value.all();
    return all.length ? all[all.length - 1].id : null;
  }
});
console.log('placed', id);
await page.click(`[data-ann-id="${id}"] [title^="Click to pick"]`);
await page.waitForTimeout(300);
console.log('armed for re-anchor:', await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  for (const v of rt._variables) if (v._name === 'a2Layer' && v._module === mod) return v._value.textContent.slice(0, 120);
}));

await page.mouse.move(gt.left + 1, gt.top + gt.height / 2);
await page.mouse.down();
await page.mouse.move(gt.left + gt.width - 1, gt.top + gt.height / 2, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(300);
console.log('selection after drag:', await page.evaluate(() => JSON.stringify(String(getSelection()))));
await page.waitForTimeout(600);
console.log('record now:', await page.evaluate((i) => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  for (const v of rt._variables) if (v._name === 'a2Store' && v._module === mod)
    return JSON.stringify(v._value.get(i).anchor);
}, id));
await browser.close();
