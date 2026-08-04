// Verify the edit loop a reader is told to use: click `edit` in a cell's hotbar, retype the cell,
// Shift-Enter, and confirm the page re-rendered from the new definition.
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto(`file://${resolve('scratch/tpl-blog-tutorial.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(18000);

const h1Before = await p.evaluate(() => document.querySelector('h1')?.textContent);
const bar = await p.evaluate(async () => {
  const bars = [...document.querySelectorAll('.hotbar')].filter((e) => e.offsetHeight > 0);
  if (!bars.length) return { bars: 0 };
  const r = bars[0].getBoundingClientRect();
  for (const t of ['pointerdown', 'mousedown', 'mouseup', 'click'])
    bars[0].dispatchEvent(new MouseEvent(t, { bubbles: true, clientX: r.right - 10, clientY: r.top + 8 }));
  await new Promise((s) => setTimeout(s, 2500));
  const cm = document.querySelector('.cm-editor');
  return { bars: bars.length, editorOpen: !!cm, glyphs: bars[0].textContent.trim() };
});
console.log('hotbars               :', bar.bars, JSON.stringify(bar.glyphs));
console.log('clicking edit opens CM:', bar.editorOpen);

if (bar.editorOpen) {
  await p.click('.cm-content');
  await p.keyboard.press('Meta+a');
  await p.keyboard.type('md`# Edited live`', { delay: 10 });
  const before = await p.evaluate(() => document.querySelector('h1')?.textContent);
  await p.keyboard.press('Shift+Enter');
  await p.waitForTimeout(3000);
  const after = await p.evaluate(() => document.querySelector('h1')?.textContent);
  console.log('h1 before typing      :', JSON.stringify(h1Before));
  console.log('h1 before Shift-Enter :', JSON.stringify(before), '(typing alone does not commit)');
  console.log('h1 after  Shift-Enter :', JSON.stringify(after));
  console.log(after === 'Edited live' ? 'PASS — Shift-Enter commits and the page re-renders' : 'FAIL');
}
await p.screenshot({ path: 'tools/screenshots/qa-editor.png' });
await b.close();
