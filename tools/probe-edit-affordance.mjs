import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto(`file://${resolve('scratch/tpl-blog-tutorial.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(18000);
console.log(JSON.stringify(await p.evaluate(() => {
  const hot = [...document.querySelectorAll('.hotbar')];
  const cellEd = [...document.querySelectorAll('.cell-editor')];
  const cm = [...document.querySelectorAll('.cm-editor')];
  return {
    hotbars: hot.length,
    hotbarText: hot.slice(0, 3).map((e) => e.textContent.trim().slice(0, 40)),
    hotbarVisible: hot.slice(0, 3).map((e) => e.offsetHeight),
    cellEditors: cellEd.length,
    cmEditors: cm.length,
    bodySaysEdit: (document.body.innerText.match(/\bedit\b/gi) || []).length,
  };
}), null, 1));
await b.close();
