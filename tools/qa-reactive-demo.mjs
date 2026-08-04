// The guide's reactive demo has to actually demonstrate reactivity: move the slider, and total
// plus the sentence that reads it must follow — without anything re-running the sentence.
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto(`file://${resolve(process.argv[2] || 'scratch/tpl-blog-blank.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(18000);
const read = () => p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const v = (n) => { for (const x of rt._variables) if (x._name === n && x._value !== undefined) return x._value; };
  const sentence = [...document.querySelectorAll('p')].map((e) => e.textContent.trim())
    .find((t) => /×.*=/.test(t));
  return { price: v('price'), quantity: v('quantity'), total: v('total'), sentence };
});
console.log('before      :', JSON.stringify(await read()));
const moved = await p.evaluate(() => {
  const s = [...document.querySelectorAll('input[type=range]')].find((e) => e.offsetHeight > 0);
  if (!s) return false;
  s.value = 40;
  s.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
});
await p.waitForTimeout(2000);
const after = await read();
console.log('slider moved:', moved);
console.log('after       :', JSON.stringify(after));
console.log(after.total === after.price * after.quantity && /40/.test(after.sentence || '')
  ? 'PASS — price → total → sentence all followed the slider'
  : 'FAIL');
await p.screenshot({ path: 'tools/screenshots/qa-reactive.png' });
await b.close();
