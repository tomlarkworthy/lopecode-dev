// Cold cost of compiling detectrow.as.ts in the page: the compiler has to be decompressed and
// loaded first, and that is the part the 6.9KB binary buys out.
import { chromium } from 'playwright';
import { resolve } from 'path';
const browser = await chromium.launch({ headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('file://' + resolve(process.argv[2]), { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForSelector('#lopepage-2 .observablehq', { timeout: 60000 });
await page.waitForTimeout(6000);
const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /compile detectrow/i.test(x.textContent));
  if (!b) return false;
  b.scrollIntoView({ block: 'center' });
  b.click();
  return true;
});
console.log('clicked:', clicked);
for (let i = 0; i < 40; i++) {
  const r = await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    for (const v of rt._variables) if (String(v._name) === 'wasmRebuild' && v._value) return v._value;
    return null;
  });
  if (r) { console.log(JSON.stringify(r)); break; }
  await page.waitForTimeout(2000);
}
await browser.close();
