// How long until the chooser is on screen, cold.
import { chromium } from 'playwright';
import { resolve } from 'path';
const file = resolve(process.argv[2] || 'lopecode/notebooks/quick_start.html');
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
const t0 = Date.now();
await p.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => !!document.querySelector('.qs table tbody tr'), null, { timeout: 120000 });
console.log(`chooser visible after ${Date.now() - t0}ms`);
await p.waitForTimeout(15000);
console.log('mains booted:', await p.evaluate(() => window.__ojs_runtime.mains.size));
await b.close();
