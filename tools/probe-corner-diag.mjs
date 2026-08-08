import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
await p.goto(`file://${resolve('lopecode/notebooks/quick_start.html')}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(24000);
console.log(await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const banner = val('heading');
  const stray = [...document.querySelectorAll('.lp2-pane .observablehq')]
    .find((n) => /SVGSVGElement/.test(n.textContent));
  const desc = (n) => n && ({ tag: n.tagName, cls: n.className, attrs: [...n.attributes].map(a => a.name).join(','), h: Math.round(n.getBoundingClientRect().height) });
  // the ink actually drawn, in viewBox units — the source viewBox may be far wider than the content
  const ink = banner.getBBox();
  return JSON.stringify({
    taggedAnywhere: document.querySelectorAll('.qs-banner-host').length,
    stray: desc(stray), strayParent: desc(stray?.parentElement),
    bannerParent: desc(banner.parentElement),
    viewBox: banner.getAttribute('viewBox'),
    ink: [ink.x, ink.y, ink.width, ink.height].map((v) => +v.toFixed(1)),
  }, null, 1);
}));
await b.close();
