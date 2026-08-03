import { chromium } from 'playwright';
import path from 'path';
const NB = path.resolve('lopebooks/notebooks/@tomlarkworthy_robocoop-5.html');
const FLAGS = ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'];
const browser = await chromium.launch({ headless: true, args: FLAGS });
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR:', e.message, '\nSTACK:\n', e.stack?.split('\n').slice(0,12).join('\n')));
await page.goto('file://'+NB+'#view=R100(S60(@tomlarkworthy/robocoop-5),S40(@tomlarkworthy/exporter-3))&open=@tomlarkworthy/exporter-3', { waitUntil:'load', timeout:60000 });
await page.waitForSelector('#lopepage-2', { timeout:30000 });
await page.waitForTimeout(4000);
// call exportToHTML-ish path directly via the button; but also try catching within page
const res = await page.evaluate(async () => {
  const btn = [...document.querySelectorAll('.moldbook-exporter button')].find(b => /fork/i.test(b.textContent));
  if (!btn) return 'no-button';
  btn.click();
  return 'clicked';
});
console.log('click:', res);
await page.waitForTimeout(4000);
await browser.close();
