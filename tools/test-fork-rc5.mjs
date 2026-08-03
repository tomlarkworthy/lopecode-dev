import { chromium } from 'playwright';
import path from 'path';
const NB = path.resolve('lopebooks/notebooks/@tomlarkworthy_robocoop-5.html');
const FLAGS = ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'];
const browser = await chromium.launch({ headless: true, args: FLAGS });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE.ERROR: ' + m.text()); });
ctx.on('page', p => console.log('  >> NEW TAB:', p.url().slice(0,60)));
// open with exporter visible
await page.goto('file://'+NB+'#view=R100(S60(@tomlarkworthy/robocoop-5),S40(@tomlarkworthy/exporter-3))&open=@tomlarkworthy/exporter-3', { waitUntil:'load', timeout:60000 });
await page.waitForSelector('#lopepage-2', { timeout:30000 });
await page.waitForTimeout(4000);
const hasExporter = await page.evaluate(() => !!document.querySelector('.moldbook-exporter'));
console.log('exporter UI present:', hasExporter);
if (hasExporter) {
  console.log('clicking Fork...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.moldbook-exporter button')].find(b => /fork/i.test(b.textContent));
    btn?.click();
  });
  await page.waitForTimeout(4000);
}
console.log('errors:', errs.length);
errs.slice(0,8).forEach(e => console.log('  ' + e.slice(0,220)));
await browser.close();
