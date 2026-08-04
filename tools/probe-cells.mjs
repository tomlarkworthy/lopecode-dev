import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto(`file://${resolve('scratch/tpl-blog-tutorial.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(18000);
console.log(JSON.stringify(await p.evaluate(() => {
  const s = [...document.querySelectorAll('.observablehq--cellname')].find((e) => /series/.test(e.textContent));
  const chain = [];
  let n = s;
  for (let i = 0; i < 6 && n; i++, n = n.parentElement) {
    chain.push({
      tag: n.tagName, cls: String(n.className).slice(0, 40),
      prevSib: n.previousElementSibling ? String(n.previousElementSibling.className).slice(0, 30) : null,
      nextSib: n.nextElementSibling ? String(n.nextElementSibling.className).slice(0, 30) : null,
      directHotbarKids: n.parentElement ? [...n.parentElement.children].filter((c) => c.classList?.contains('hotbar')).length : 0,
    });
  }
  return chain;
}), null, 1));
await b.close();
