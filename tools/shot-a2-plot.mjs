// Place a data-space annotation on the demo chart, then re-render the chart wider and
// shoot both — the note should stay on the same datum.
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 4600 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(7000);

const datum = await page.evaluate(() => {
  const svg = document.querySelector('.observablehq[cell="demoPlot"] svg');
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  let series = null;
  for (const v of rt._variables) if (v._name === 'demoSeries' && v._module === mod) series = v._value;
  const d = series[10];
  const p = new DOMPoint(svg.scale('x').apply(d.date), svg.scale('y').apply(d.value))
    .matrixTransform(svg.getScreenCTM());
  return { x: p.x, y: p.y };
});
await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  for (const v of rt._variables) if (v._name === 'a2Layer' && v._module === mod) v._value.arm();
});
await page.mouse.click(datum.x, datum.y);
await page.waitForTimeout(1200);

const clipFor = async () => page.evaluate(() => {
  const r = document.querySelector('.observablehq[cell="demoPlot"]').getBoundingClientRect();
  return { x: 0, y: Math.max(0, r.top - 40), width: 1000, height: r.height + 160 };
});
await page.screenshot({ path: 'tools/screenshots/a2-plot-narrow.png', clip: await clipFor() });

await page.evaluate(() => {
  const el = document.querySelector('.observablehq[cell="viewof demoPlotWidth"] input[type="range"]');
  el.value = '860';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tools/screenshots/a2-plot-wide.png', clip: await clipFor() });
console.log('wrote tools/screenshots/a2-plot-{narrow,wide}.png');
await browser.close();
