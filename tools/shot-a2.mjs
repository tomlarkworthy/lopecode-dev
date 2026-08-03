// Visual check: two annotations, one with its cell editor open.
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1250, height: 2200 } });
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);

const ids = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  const cell = document.querySelector('.observablehq[cell="demoText"]');
  const text = cell.textContent;
  const at = text.indexOf('lazy dog');
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  let acc = 0, sN = null, sO = 0, eN = null, eO = 0;
  const end = at + 8;
  while (walker.nextNode()) {
    const n = walker.currentNode, len = n.nodeValue.length;
    if (!sN && acc + len >= at) { sN = n; sO = at - acc; }
    if (acc + len >= end) { eN = n; eO = end - acc; break; }
    acc += len;
  }
  const r = document.createRange(); r.setStart(sN, sO); r.setEnd(eN, eO);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  const anchor = A.describeSelection(sel);
  if (!anchor) return { err: 'no anchor', selText: sel.toString(), collapsed: sel.isCollapsed, ranges: sel.rangeCount, cells: document.querySelectorAll('.observablehq[cell="demoText"]').length };
  const a = store.create(anchor);
  sel.removeAllRanges();
  store.patch(a.id, { box: { dx: 300, dy: -30, w: 260 } });
  store.setSource(a.cell, `${a.cell} = md\`This paragraph should mention **reflow**, not layout.\``);

  const svg = document.querySelector('.observablehq[cell="demoSvg"] svg');
  const m = svg.getScreenCTM();
  const pt = { x: m.a * 50 + m.e, y: m.d * 50 + m.f };
  const b = store.create(A.describePoint(pt.x, pt.y, document.elementFromPoint(pt.x, pt.y)));
  // an explicitly sized box: the note scrolls inside it
  store.patch(b.id, { box: { dx: 240, dy: 40, w: 300, h: 110 } });
  store.setSource(b.cell, `${b.cell} = md\`Can this circle be a **control**? Sized boxes keep their
width and height in the record, and the note scrolls inside them, so a long note does not
push the arrow around.\``);
  return [a.id, b.id];
});
await page.waitForTimeout(1500);
const clipY = await page.evaluate(() => Math.max(0, Math.round(
  document.querySelector('.observablehq[cell="demoText"]').getBoundingClientRect().top - 120)));
const CLIP = { x: 0, y: clipY, width: 1250, height: 700 };
await page.screenshot({ path: 'tools/screenshots/a2-notes.png', clip: CLIP });
await page.click(`[data-a2-edit="${ids[1]}"]`);
await page.waitForTimeout(2500);
await page.screenshot({ path: 'tools/screenshots/a2-editor.png', clip: CLIP });
await page.click(`[data-a2-edit="${ids[1]}"]`);

console.log('shots written', ids.join(' '));
await browser.close();
