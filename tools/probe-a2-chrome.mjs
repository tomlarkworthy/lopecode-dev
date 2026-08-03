// Does injecting editable-md add editor chrome to the annotated notebook? Count before/after.
import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 2600 } });
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(6000);
const count = () => page.evaluate(() => ({
  editChips: [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /\bedit\s*$/i.test((e.textContent || '').trim()) && (e.textContent||'').trim().length < 12).length,
  editableMd: document.querySelectorAll('.lope-editable-md').length,
  hotbars: document.querySelectorAll('[class*="hotbar"], .cell-editor').length
}));
console.log('BEFORE any annotation:', JSON.stringify(await count()));
await page.evaluate(() => {
  const cell = document.querySelector('.observablehq[cell="demoText"]');
  const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const i = w.currentNode.nodeValue.indexOf('lazy dog');
    if (i >= 0) { const r = document.createRange(); r.setStart(w.currentNode, i); r.setEnd(w.currentNode, i + 8);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r); return; } }
});
await page.waitForTimeout(600);
await page.click('[data-a2-chip]');
await page.waitForTimeout(3000);
console.log('AFTER one annotation:', JSON.stringify(await count()));
await browser.close();
