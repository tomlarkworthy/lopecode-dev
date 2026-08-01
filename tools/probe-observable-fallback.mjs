// Spike the proposed fallback rungs against the live Observable mirror, standalone (nothing
// wired into the module): can a cell node be found by variable name, and an anonymous cell by
// its quote + context? Report the rect each of the six shipped notes would anchor to.
import { chromium } from 'playwright';

const URL = process.argv[2] || 'https://observablehq.com/@tomlarkworthy/annotate';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1200 } });
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(20000);

const frame = page.frames().find((f) => f.url().includes('observableusercontent.com'));
console.log(await frame.evaluate(() => {
  const rt = window.__ojs_runtime;
  const home = ([...rt._variables].find((v) => v._name === 'a2Layer') || {})._module;
  const mine = [...rt._variables].filter((v) => v._module === home);
  const g = (n) => (mine.find((x) => x._name === n) || {})._value;
  const store = g('a2Store');
  const out = [];

  // --- rung A: cell name -> variable in the annotated module -> observer node -----------
  const nodeByName = (name) => {
    const v = mine.find((x) => x._name === name);
    const n = v && v._observer && v._observer._node;
    return n && n.nodeType === 1 && n.isConnected ? n : null;
  };

  // --- rung B: W3C-style quote search over the whole document --------------------------
  const textNodes = () => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const a = []; let t;
    while ((t = w.nextNode())) if (t.parentElement && !t.parentElement.closest('[data-a2-root]')) a.push(t);
    return a;
  };
  const findQuote = (q) => {
    const nodes = textNodes();
    const full = nodes.map((n) => n.nodeValue).join('');
    const want = (q.prefix || '') + q.exact + (q.suffix || '');
    let at = full.indexOf(want);
    let off = at === -1 ? -1 : at + (q.prefix || '').length;
    if (at === -1) { // context missing: fall back to the bare quote, but only if unique
      const i = full.indexOf(q.exact);
      if (i !== -1 && full.indexOf(q.exact, i + 1) === -1) off = i; else return null;
    }
    // offset -> range
    let acc = 0, sN = null, sO = 0, eN = null, eO = 0;
    for (const n of nodes) {
      const len = n.nodeValue.length;
      if (!sN && acc + len > off) { sN = n; sO = off - acc; }
      if (sN && acc + len >= off + q.exact.length) { eN = n; eO = off + q.exact.length - acc; break; }
      acc += len;
    }
    if (!sN || !eN) return null;
    const r = document.createRange();
    r.setStart(sN, sO); r.setEnd(eN, eO);
    return r;
  };

  const CELL = (n) => { // outermost .observablehq ancestor, as the module computes it
    let f = null, x = n;
    while (x && x.nodeType === 1) { if (x.classList && x.classList.contains('observablehq')) f = x; x = x.parentElement; }
    return f;
  };

  for (const rec of store.all()) {
    const a = rec.anchor;
    const byName = a.cell ? nodeByName(a.cell) : null;
    let line = `${rec.id.padEnd(14)} surface=${String(a.surface).padEnd(6)} cell=${(a.cell || '-').padEnd(13)}`;
    line += ` rungA(name)=${byName ? 'HIT' : 'miss'}`;
    if (a.quote) {
      const r = findQuote(a.quote);
      const b = r && r.getBoundingClientRect();
      const cellOf = r && CELL(r.startContainer.parentElement);
      line += ` rungB(quote)=${r ? 'HIT rect ' + Math.round(b.left) + ',' + Math.round(b.top + scrollY) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height) : 'miss'}`;
      line += r ? ` sameCellAsName=${cellOf === byName}` : '';
    }
    if (byName) {
      const b = byName.getBoundingClientRect();
      line += ` cellRect=${Math.round(b.left)},${Math.round(b.top + scrollY)} ${Math.round(b.width)}x${Math.round(b.height)}`;
      if (a.surface === 'plot' || a.surface === 'svg') {
        const svg = byName.querySelector('svg');
        line += ` svg=${svg ? 'yes' : 'NO'}`;
        if (svg && svg.getScreenCTM) line += ' ctm=ok';
      }
      if (a.surface === 'image') line += ` img=${byName.querySelector('img') ? 'yes' : 'NO'}`;
    }
    out.push(line);
  }

  // --- would a page-coordinate root work? ---------------------------------------------
  const root = document.querySelector('.observablehq-root');
  out.push(`root=${root ? getComputedStyle(root).position : 'none'} offsetParent=${root && root.offsetParent ? root.offsetParent.tagName : '-'}` +
    ` scroller=${document.scrollingElement === document.documentElement ? 'documentElement' : 'other'}` +
    ` docHeight=${document.documentElement.scrollHeight}`);
  return out.join('\n');
}));
await browser.close();
