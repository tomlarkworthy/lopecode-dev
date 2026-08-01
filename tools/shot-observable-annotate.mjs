// Do the notes paint where they point on observablehq.com? Report each box's rect against its
// resolved anchor point, at two scroll positions, and shoot the page.
import { chromium } from 'playwright';

const URL = process.argv[2] || 'https://observablehq.com/@tomlarkworthy/annotate';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(22000);
const frame = page.frames().find((f) => f.url().includes('observableusercontent.com'));

const report = () => frame.evaluate(() => {
  const rt = window.__ojs_runtime;
  const home = ([...rt._variables].find((v) => v._name === 'a2Layer') || {})._module;
  const g = (n) => { const v = [...rt._variables].find((x) => x._name === n && x._module === home); return v && v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  const layers = [...document.querySelectorAll('[data-a2-layer]')].map(
    (l) => l.parentElement.tagName + ' ' + getComputedStyle(l).position);
  return {
    scrollY: Math.round(scrollY), layers,
    rows: store.all().map((r) => {
      const res = A.resolve(r.anchor);
      const box = document.querySelector(`[data-ann-id="${r.id}"]`);
      const b = box && box.getBoundingClientRect();
      return `${r.id.padEnd(14)} rung=${String(res && res.rung).padEnd(6)}` +
        ` anchor=(${Math.round(res.x)},${Math.round(res.y)})` +
        ` box=${b ? Math.round(b.left) + ',' + Math.round(b.top) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height) : 'none'}` +
        ` dy=${b ? Math.round(b.top - res.y) : '-'}`;
    })
  };
});

for (const y of [0, 1200, 2400]) {
  await page.evaluate((n) => scrollTo(0, n), y); // the outer page scrolls; the iframe is full height
  await page.waitForTimeout(1200);
  const r = await report();
  console.log(`=== scrollY ${r.scrollY} layers ${JSON.stringify(r.layers)}\n` + r.rows.join('\n'));
  await page.screenshot({ path: `tools/screenshots/observable-annotate-${y}.png` });
}
console.log('wrote tools/screenshots/observable-annotate-{0,1200,2400}.png');
await browser.close();
