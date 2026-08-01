// Why does the document-wide quote search miss tour_prose?
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 4600 } });
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(9000);

console.log(await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = []; let t;
  while ((t = w.nextNode())) {
    const p = t.parentElement;
    if (!p || (p.closest && p.closest('[data-a2-root],[data-a2-layer]'))) continue;
    nodes.push(t);
  }
  const full = nodes.map((n) => n.nodeValue).join('');
  for (const id of ['tour_prose', 'tour_title', 'tour_volatile']) {
    const q = store.get(id).anchor.quote;
    const want = (q.prefix || '') + q.exact + (q.suffix || '');
    const first = full.indexOf(want);
    const second = first === -1 ? -1 : full.indexOf(want, first + 1);
    const bare = full.indexOf(q.exact), bare2 = bare === -1 ? -1 : full.indexOf(q.exact, bare + 1);
    out.push(`${id}: exact=${JSON.stringify(q.exact)}`);
    out.push(`   prefix=${JSON.stringify(q.prefix)} suffix=${JSON.stringify(q.suffix)}`);
    out.push(`   with context: first=${first} second=${second} | bare: first=${bare} second=${bare2}`);
    out.push(`   cellForQuote -> ${(() => { const n = A.cellForQuote(q); return n ? (n.getAttribute('cell') || 'unnamed') : 'null'; })()}`);
  }
  out.push('doc text length ' + full.length);
  return out.join('\n');
}));
await browser.close();
