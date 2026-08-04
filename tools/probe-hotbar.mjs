import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto(`file://${resolve('scratch/tpl-blog-tutorial.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(18000);
console.log(JSON.stringify(await p.evaluate(() => {
  const bar = document.querySelector('.hotbar');
  return {
    html: bar.innerHTML.replace(/\s+/g, ' ').slice(0, 500),
    kids: [...bar.children].map((e) => ({ tag: e.tagName, t: e.textContent.trim(), title: e.title || null })),
  };
}), null, 1));
await b.close();
