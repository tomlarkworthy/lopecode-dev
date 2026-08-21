// What does the landing page actually show, in order?
import { chromium } from 'playwright';
import { resolve } from 'path';
const file = process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_tarot.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
await p.goto(`file://${resolve(file)}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('#lopepage-2 .observablehq .tarot-app', { timeout: 120000 });
await p.waitForTimeout(8000);
console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#lopepage-2 .observablehq')]
  .map((c, i) => ({ i, top: Math.round(c.getBoundingClientRect().top), text: (c.textContent || '').replace(/\s+/g, ' ').slice(0, 60) }))), null, 1));
await p.screenshot({ path: 'tools/screenshots/tarot-landing.png' });
await b.close();
