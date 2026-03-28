import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
});
const page = await browser.newPage();
await page.goto('file:///Users/tom.larkworthy/dev/lopecode-dev/lopecode/notebooks/@tomlarkworthy_exporter-2.html');
await page.waitForTimeout(2000);

const result = await page.evaluate(async () => {
  try {
    const r = await fetch('https://api.observablehq.com/@tomlarkworthy/notes.js?v=4');
    return 'status:' + r.status;
  } catch(e) {
    return 'err:' + e.message;
  }
});

console.log(result);
await browser.close();
