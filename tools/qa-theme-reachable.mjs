// Is the theme picker reachable by a reader who was told "press ⌘K and type theme"?
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto(`file://${resolve('scratch/tpl-dataviz-tutorial.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(18000);
const before = await p.evaluate(() => [...window.__ojs_runtime.mains.keys()]);
await p.keyboard.press('Meta+k');
await p.waitForTimeout(800);
await p.keyboard.type('theme', { delay: 40 });
await p.waitForTimeout(1200);
const hits = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('[class*=palette] *')]
    .filter((e) => e.children.length === 0 && /theme/i.test(e.textContent) && e.offsetHeight > 0);
  return [...new Set(rows.map((e) => e.textContent.trim().slice(0, 60)))].slice(0, 8);
});
console.log('palette rows:', JSON.stringify(hits, null, 1));
await p.keyboard.press('Enter');
await p.waitForTimeout(2500);
const after = await p.evaluate(() => {
  const sel = [...document.querySelectorAll('select')].filter((s) => s.offsetHeight > 0);
  return {
    mains: [...window.__ojs_runtime.mains.keys()],
    tabs: [...document.querySelectorAll('[draggable="true"]')].map((e) => e.textContent.trim()),
    selects: sel.map((s) => [...s.options].map((o) => o.text).slice(0, 6)),
  };
});
console.log('opened:', JSON.stringify({ newMains: after.mains.filter((m) => !before.includes(m)), tabs: after.tabs }, null, 1));
console.log('visible selects:', JSON.stringify(after.selects));
await p.screenshot({ path: 'tools/screenshots/qa-theme.png' });
await b.close();
