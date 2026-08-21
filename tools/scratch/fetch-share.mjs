import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://claude.ai/share/14a77efc-ca27-4dfa-9edb-eef562028cc1', { timeout: 60000 }).catch(e => console.error('goto:', e.message));
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(5000);
  const text = await page.evaluate(() => document.body.innerText).catch(() => '');
  if (text && !/security verification|Just a moment/i.test(text) && text.length > 500) {
    console.log(text.slice(0, 120000));
    break;
  }
  if (i === 11) console.log('STILL BLOCKED:\n' + text.slice(0, 2000));
}
await browser.close();
