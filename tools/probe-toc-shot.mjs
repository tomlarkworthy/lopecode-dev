import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 2 });
await p.goto(`file://${resolve('scratch/toc-probe.html')}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(22000);
await p.screenshot({ path: 'tools/screenshots/toc.png', clip: { x: 0, y: 0, width: 700, height: 900 } });
await b.close();
