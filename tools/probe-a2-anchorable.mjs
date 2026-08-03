// Why do some regions refuse an annotation? describeSelection requires a
// `.observablehq[cell]` ancestor — find out which parts of the page have one.
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const LAYOUT = '#view=R100(S60(@tomlarkworthy/annotate),S40(@tomlarkworthy/claude-code-pairing))';

const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}${LAYOUT}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(6000);

console.log('=== every top-level node in the annotate pane: is it anchorable? ===');
console.log(await page.evaluate(() => {
  const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
  const rows = [];
  const walk = (el, depth) => {
    for (const c of el.children) {
      const isCellDiv = c.classList && c.classList.contains('observablehq');
      const cellAttr = c.getAttribute && c.getAttribute('cell');
      if (isCellDiv || depth < 2) {
        rows.push(`${'  '.repeat(depth)}${c.tagName}.${(c.className || '').toString().split(' ')[0]}` +
          ` cell=${JSON.stringify(cellAttr)} text=${JSON.stringify((c.textContent || '').trim().slice(0, 40))}`);
      }
      if (!isCellDiv && depth < 3) walk(c, depth + 1);
    }
  };
  walk(pane, 0);
  return rows.join('\n');
}));

console.log('\n=== can describeSelection see each region? ===');
console.log(JSON.stringify(await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const A = g('a2Anchors');

  const trySelect = (node, label) => {
    if (!node) return { label, err: 'node missing' };
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let t = null;
    while (walker.nextNode()) { if (walker.currentNode.nodeValue.trim().length > 6) { t = walker.currentNode; break; } }
    if (!t) return { label, err: 'no text node' };
    const r = document.createRange();
    r.setStart(t, 0); r.setEnd(t, Math.min(6, t.nodeValue.length));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    const anchor = A.describeSelection(sel);
    const host = t.parentElement;
    const out = {
      label,
      text: t.nodeValue.trim().slice(0, 24),
      hasCellAncestor: !!host.closest('.observablehq[cell]'),
      nearestObservablehq: (() => { const o = host.closest('.observablehq'); return o ? JSON.stringify(o.getAttribute('cell')) : null; })(),
      hasPaneAncestor: !!host.closest('.lp2-pane[data-module]'),
      anchored: !!anchor,
      surface: anchor ? anchor.surface : null,
      cell: anchor ? anchor.cell : null
    };
    sel.removeAllRanges();
    return out;
  };

  const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
  const results = [];
  // 1. the header markdown (the module's first, unnamed cell)
  const h1 = pane.querySelector('h1');
  results.push(trySelect(h1 && h1.parentElement, 'header markdown (unnamed cell)'));
  // 2. a named markdown cell
  results.push(trySelect(document.querySelector('.observablehq[cell="demoText"]'), 'demoText (named cell)'));
  // 3. editor-5 content, if an editor is on screen
  const cm = document.querySelector('.cm-content');
  results.push(trySelect(cm, 'editor-5 CodeMirror content'));
  if (cm) {
    const o = cm.closest('.observablehq');
    results.push({ label: 'editor-5 host chain', inObservablehq: !!o,
      observablehqCell: o ? JSON.stringify(o.getAttribute('cell')) : null,
      parentClasses: [...(function* (n) { let i = 0; while (n && i++ < 6) { yield n.tagName + '.' + (n.className || '').toString().slice(0, 30); n = n.parentElement; } })(cm)] });
  }
  // 4. the inspector output of a value cell (e.g. `a2Anchors = Object {...}`)
  const insp = pane.querySelector('.observablehq--inspect');
  results.push(trySelect(insp, 'inspector output'));
  return results;
}), null, 2));

console.log('\n=== how many cell divs lack a `cell` attribute? ===');
console.log(JSON.stringify(await page.evaluate(() => {
  const all = [...document.querySelectorAll('.observablehq')];
  const named = all.filter((d) => d.getAttribute('cell'));
  return {
    totalObservablehqDivs: all.length,
    withCellAttr: named.length,
    withoutCellAttr: all.length - named.length,
    samplesWithout: all.filter((d) => !d.getAttribute('cell'))
      .slice(0, 6).map((d) => (d.textContent || '').trim().slice(0, 45))
  };
}), null, 2));

await browser.close();
