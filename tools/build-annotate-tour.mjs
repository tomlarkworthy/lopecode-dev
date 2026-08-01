// Compute the anchors for the notes shipped with the annotate notebook, using the module's
// own describeSelection/describePoint against the live page — so the authored cells hold
// exactly what a real placement would have recorded.
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 4600 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(7000);

const out = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const A = g('a2Anchors');
  const res = {};

  const quoteIn = (cellNode, phrase, occurrence) => {
    const text = cellNode.textContent;
    let at = -1;
    for (let i = 0; i <= occurrence; i++) at = text.indexOf(phrase, at + 1);
    if (at === -1) return { err: `phrase ${phrase} #${occurrence} not found` };
    const w = document.createTreeWalker(cellNode, NodeFilter.SHOW_TEXT);
    let acc = 0, sN = null, sO = 0, eN = null, eO = 0;
    const end = at + phrase.length;
    while (w.nextNode()) {
      const n = w.currentNode, len = n.nodeValue.length;
      if (!sN && acc + len >= at) { sN = n; sO = at - acc; }
      if (acc + len >= end) { eN = n; eO = end - acc; break; }
      acc += len;
    }
    const r = document.createRange();
    r.setStart(sN, sO); r.setEnd(eN, eO);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    const a = A.describeSelection(sel);
    sel.removeAllRanges();
    return a;
  };

  const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
  const unnamed = [...pane.querySelectorAll('.observablehq')].find((d) => !d.getAttribute('cell'));
  res.title = quoteIn(unnamed, 'Annotate', 0);
  res.prose = quoteIn(document.querySelector('.observablehq[cell="demoProse"]'), 'told apart', 2);

  const atPoint = (x, y) => A.describePoint(x, y);

  // chart: a datum on the line
  const svg = document.querySelector('.observablehq[cell="demoPlot"] svg');
  const series = g('demoSeries');
  const d = series[10];
  const p = new DOMPoint(svg.scale('x').apply(d.date), svg.scale('y').apply(d.value))
    .matrixTransform(svg.getScreenCTM());
  res.plot = atPoint(p.x, p.y);
  res.plotDatum = { date: d.date.toISOString(), value: d.value };

  // vector: the circle centre, in user units
  const vsvg = document.querySelector('.observablehq[cell="demoSvg"] svg');
  const m = vsvg.getScreenCTM();
  res.svg = atPoint(m.a * 50 + m.c * 50 + m.e, m.b * 50 + m.d * 50 + m.f);

  // bitmap: a quarter across, halfway down
  const img = document.querySelector('.observablehq[cell="demoImage"] img').getBoundingClientRect();
  res.image = atPoint(img.left + img.width * 0.25, img.top + img.height * 0.5);

  // volatile prose: a phrase the shuffle button destroys
  res.volatile = quoteIn(document.querySelector('.observablehq[cell="demoVolatile"]'), 'than the', 0);
  res.volatileText = document.querySelector('.observablehq[cell="demoVolatile"]').textContent;
  return res;
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
