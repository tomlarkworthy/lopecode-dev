// Rendered height of each visibility-gated cell, plus its height while still pending. The gap
// between the two is exactly how far the page jumps when the cell lazily fills in.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2]);
const CELLS = (process.argv[3] || 'hexFrameReport,hexPitchSweep,wasmAgreement,hexRigSynthCases,poolAgreement,hexRigSelfTest,hexRendererCheck').split(',');
const width = Number(process.argv[4] || 1400);

const browser = await chromium.launch({ headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForSelector('#lopepage-2 .observablehq', { timeout: 60000 });
await page.waitForTimeout(4000);

const pending = await page.evaluate((cells) => Object.fromEntries(cells.map((c) => {
  const el = document.querySelector(`[cell="${c}"]`);
  return [c, el ? Math.round(el.getBoundingClientRect().height) : null];
})), CELLS);

// Scroll each into view so its gate opens, then let it compute.
for (const c of CELLS) {
  await page.evaluate((cell) => document.querySelector(`[cell="${cell}"]`)?.scrollIntoView({ block: 'center' }), c);
  await page.waitForTimeout(1500);
}
await page.waitForTimeout(8000);

const rendered = await page.evaluate((cells) => Object.fromEntries(cells.map((c) => {
  const el = document.querySelector(`[cell="${c}"]`);
  return [c, el ? Math.round(el.getBoundingClientRect().height) : null];
})), CELLS);

console.log(JSON.stringify({ width, pending, rendered, jump: Object.fromEntries(CELLS.map((c) => [c, (rendered[c] ?? 0) - (pending[c] ?? 0)])) }, null, 1));
await browser.close();
