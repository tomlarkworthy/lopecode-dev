// Print the exact source of the two cells an annotation is made of.
import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 3200 } });
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(6000);
await page.evaluate(() => {
  const cell = document.querySelector('.observablehq[cell="demoText"]');
  const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const i = w.currentNode.nodeValue.indexOf('lazy dog');
    if (i >= 0) { const r = document.createRange(); r.setStart(w.currentNode, i); r.setEnd(w.currentNode, i + 8);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); return; } }
});
await page.waitForTimeout(600);
await page.click('[data-a2-chip]');
await page.waitForTimeout(2500);
console.log(await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  let store = null; for (const v of rt._variables) if (v._name === 'a2Store' && v._module === mod) store = v._value;
  const a = store.all()[0];
  const rec = mod._scope.get(a.varName);
  const note = mod._scope.get(a.cell);
  return ['=== ' + a.varName + ' ===', String(rec._definition),
          '  inputs: ' + JSON.stringify(rec._inputs.map(i => i._name)),
          '=== ' + a.cell + ' ===', String(note._definition),
          '=== index cell? ===', String(!!mod._scope.get('annotation_index'))].join('\n');
}));
await browser.close();
