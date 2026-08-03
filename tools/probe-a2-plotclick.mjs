// Why doesn't a click on the demo plot produce a `plot` anchor?
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 4600 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(7000);

console.log(JSON.stringify(await page.evaluate(() => {
  const cell = document.querySelector('.observablehq[cell="demoPlot"]');
  const svg = cell && cell.querySelector('svg');
  return {
    cellPresent: !!cell,
    svgPresent: !!svg,
    hasScale: svg ? typeof svg.scale : null,
    kids: cell ? [...cell.children].map((c) => c.tagName + '.' + (c.className || '').toString().slice(0, 20)) : null,
    rect: svg ? (({ x, y, width, height }) => ({ x, y, width, height }))(svg.getBoundingClientRect()) : null
  };
}), null, 2));

const pt = await page.evaluate(() => {
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
console.log('datum point', JSON.stringify(pt));

console.log('describePoint directly:', JSON.stringify(await page.evaluate((p) => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const A = g('a2Anchors');
  const el = document.elementFromPoint(p.x, p.y);
  let out = { hit: el ? el.tagName + '.' + (el.className.baseVal || el.className || '') : null };
  try { out.anchor = A.describePoint(p.x, p.y); } catch (e) { out.err = String(e); }
  out.surfaces = [...A.surfaces.keys()];
  return out;
}, pt), null, 2));

// now via the real armed click path
await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  for (const v of rt._variables) if (v._name === 'a2Layer' && v._module === mod) v._value.arm();
});
await page.mouse.click(pt.x, pt.y);
await page.waitForTimeout(1500);
console.log('store after click:', JSON.stringify(await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  for (const v of rt._variables) if (v._name === 'a2Store' && v._module === mod)
    return v._value.all().map((a) => ({ id: a.id, surface: a.anchor.surface, data: a.anchor.data, svg: a.anchor.svg, frac: a.anchor.frac }));
}), null, 2));

await browser.close();
