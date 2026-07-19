// Repro: renderer crash when reloading a lopecode notebook with DevTools open.
// usage: node repro/crash-repro.mjs <file.html> [reloads]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'repro/base.html');
const reloads = Number(process.argv[3] || 4);
const url = `file://${file}#view=S100(@tomlarkworthy/lopecode-live-2026)`;

const browser = await chromium.launch({
  headless: false,
  devtools: true, // opens DevTools for each page
  args: ['--auto-open-devtools-for-tabs'],
});
const ctx = await browser.newContext();
const page = await ctx.newPage();

let crashed = false;
page.on('crash', () => { crashed = true; console.log('!!! PAGE CRASH'); });
page.on('pageerror', e => console.log('pageerror:', String(e).slice(0, 200)));

const heap = async (tag) => {
  try {
    const m = await page.evaluate(() => ({
      used: performance.memory?.usedJSHeapSize,
      total: performance.memory?.totalJSHeapSize,
      limit: performance.memory?.jsHeapSizeLimit,
      nodes: document.getElementsByTagName('*').length,
    }));
    console.log(tag, JSON.stringify(m));
  } catch (e) { console.log(tag, 'eval failed:', String(e).slice(0, 120)); }
};

console.log('loading', url);
try {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
} catch (e) { console.log('goto:', String(e).slice(0, 200)); }
await page.waitForTimeout(4000);
await heap('after-initial-load');

for (let i = 1; i <= reloads && !crashed; i++) {
  console.log(`--- reload ${i}`);
  try {
    await page.reload({ waitUntil: 'load', timeout: 60000 });
  } catch (e) { console.log('reload err:', String(e).slice(0, 200)); }
  await page.waitForTimeout(4000);
  await heap(`after-reload-${i}`);
}

console.log(crashed ? 'RESULT: CRASHED' : 'RESULT: survived');
await browser.close();
process.exit(crashed ? 1 : 0);
