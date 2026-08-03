// What happens to an anchor whose surface this build does not understand?
import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 1600 } });
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(6000);
console.log(JSON.stringify(await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const A = g('a2Anchors');
  const M = '@tomlarkworthy/annotate';
  const cellRect = document.querySelector('.observablehq[cell="demoText"]').getBoundingClientRect();
  const r = (a) => { const x = A.resolve(a); return x && { rung: x.rung, adrift: !!x.adrift, x: Math.round(x.x), y: Math.round(x.y) }; };
  return {
    cellTopLeft: { x: Math.round(cellRect.left), y: Math.round(cellRect.top) },
    unknownSurface: r({ module: M, cell: 'demoText', surface: 'plot', data: { x: 3, y: 7 } }),
    unknownWithFrac: r({ module: M, cell: 'demoText', surface: 'plot', frac: { fx: 0.5, fy: 0.5 } }),
    knownElement:   r({ module: M, cell: 'demoText', surface: 'element', frac: { fx: 0, fy: 0 } })
  };
}), null, 2));
await browser.close();
