// Is Plot a builtin here, and does figure.scale() give apply/invert we can anchor in?
import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 1600 } });
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(6000);
console.log(JSON.stringify(await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  // Plot is a lazy stdlib builtin: only a cell that *depends* on it resolves it
  mod.define('__probePlot', ['Plot'], (P) => P);
  const Plot = await mod.value('__probePlot');
  if (!Plot || !Plot.plot) return { err: 'no Plot after dep', got: typeof Plot };
  const how = 'builtin via dependency';
  const data = [{ t: new Date('2026-01-01'), v: 10 }, { t: new Date('2026-02-01'), v: 42 },
                { t: new Date('2026-03-01'), v: 18 }];
  const fig = Plot.plot({ width: 500, height: 220, marks: [Plot.lineY(data, { x: 't', y: 'v' })] });
  document.body.appendChild(fig);
  const sx = fig.scale('x'), sy = fig.scale('y');
  const svg = fig.tagName === 'svg' ? fig : fig.querySelector('svg');
  const ctm = svg.getScreenCTM();
  const px = sx.apply(data[1].t), py = sy.apply(data[1].v);
  const screen = new DOMPoint(px, py).matrixTransform(ctm);
  // and back
  const back = new DOMPoint(screen.x, screen.y).matrixTransform(ctm.inverse());
  const out = {
    how, plotVersion: Plot.version || '(none)',
    figTag: fig.tagName, hasScaleOnFig: typeof fig.scale === 'function',
    hasScaleOnSvg: typeof svg.scale === 'function',
    xScale: { type: sx.type, hasApply: typeof sx.apply === 'function', hasInvert: typeof sx.invert === 'function' },
    yScale: { type: sy.type, hasApply: typeof sy.apply === 'function', hasInvert: typeof sy.invert === 'function' },
    applied: { px: Math.round(px), py: Math.round(py) },
    screen: { x: Math.round(screen.x), y: Math.round(screen.y) },
    roundTrip: { px: Math.round(back.x), py: Math.round(back.y) },
    invertedX: sx.invert ? String(sx.invert(px)) : null,
    invertedY: sy.invert ? sy.invert(py) : null
  };
  fig.remove();
  return out;
}), null, 2));
await browser.close();
