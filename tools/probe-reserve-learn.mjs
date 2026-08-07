// Two loads in one browser profile: the second should reserve what the first measured.
import { chromium } from 'playwright';
import { resolve } from 'path';
const url = 'file://' + resolve(process.argv[2]);
const width = Number(process.argv[3] || 480);
const cells = ['hexFrameReport', 'hexRigSelfTest', 'hexRendererCheck'];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width, height: 900 } });
const page = await ctx.newPage();
for (const pass of [1, 2]) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('#lopepage-2 .observablehq', { timeout: 60000 });
  await page.waitForTimeout(4000);
  const pending = await page.evaluate((cs) => Object.fromEntries(cs.map((c) => [c, Math.round(document.querySelector(`[cell="${c}"]`)?.getBoundingClientRect().height ?? -1)])), cells);
  for (const c of cells) { await page.evaluate((x) => document.querySelector(`[cell="${x}"]`)?.scrollIntoView({ block: 'center' }), c); await page.waitForTimeout(1200); }
  await page.waitForTimeout(9000);
  const rendered = await page.evaluate((cs) => Object.fromEntries(cs.map((c) => [c, Math.round(document.querySelector(`[cell="${c}"]`)?.getBoundingClientRect().height ?? -1)])), cells);
  const store = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('lazyReserve:'))));
  console.log(`pass ${pass}`, JSON.stringify({ pending, rendered, jump: Object.fromEntries(cells.map((c) => [c, rendered[c] - pending[c]])), store }));
}
await browser.close();
