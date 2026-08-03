// Pan the chart's window: does the note travel with its datum, and go adrift once the
// datum is no longer plotted?
import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(9000);

const setPan = (n) => page.evaluate((v) => {
  const el = document.querySelector('.observablehq[cell="viewof demoPlotPan"] input[type="range"]');
  el.value = String(v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, n);

for (const pan of [0, 4, 8, 10, 12]) {
  await setPan(pan);
  await page.waitForTimeout(900);
  console.log(pan, await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
    const store = g('a2Store'), A = g('a2Anchors');
    const rec = store.get('tour_plot');
    const r = A.resolve(rec.anchor);
    const svg = document.querySelector('.observablehq[cell="demoPlot"] svg');
    const sx = svg.scale('x');
    return `tip=${r && Math.round(r.x)},${Math.round(r.y)} rung=${r && r.rung}${r && r.adrift ? ' ADRIFT(' + r.why + ')' : ''}` +
      ` domain=${new Date(sx.domain[0]).toISOString().slice(0, 10)}..${new Date(sx.domain[1]).toISOString().slice(0, 10)}`;
  }));
}
await setPan(4);
await page.waitForTimeout(900);
await page.evaluate(() => {
  const r = document.querySelector('.observablehq[cell="demoPlot"]').getBoundingClientRect();
  document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]').scrollTop += r.top - 120;
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'tools/screenshots/annotate-pan-4.png', clip: { x: 0, y: 60, width: 1100, height: 480 } });
await setPan(10);
await page.waitForTimeout(900);
await page.screenshot({ path: 'tools/screenshots/annotate-pan-10.png', clip: { x: 0, y: 60, width: 1100, height: 480 } });
await setPan(12);
await page.waitForTimeout(900);
await page.screenshot({ path: 'tools/screenshots/annotate-pan-12.png', clip: { x: 0, y: 60, width: 1100, height: 480 } });
console.log('wrote tools/screenshots/annotate-pan-{4,10,12}.png');
await browser.close();
