// Repro the user's path exactly: place an annotation, then click the burger menu's
// "Fork (new tab)" (exporter-3 forkAnchor -> blob: URL in a popup) and inspect the fork.
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const LAYOUT = process.env.A2_LAYOUT || '#view=R100(S60(@tomlarkworthy/annotate),S40(@tomlarkworthy/claude-code-pairing))';
const VP = { width: 1400, height: parseInt(process.env.A2_H || '900', 10) };

const settle = async (page, label) => {
  await page.waitForFunction(() => window.__ojs_runtime, { timeout: 60000 });
  await page.waitForFunction(() => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    if (!mod) return false;
    for (const v of rt._variables) if (v._name === 'a2Store' && v._module === mod) return !!v._value;
    return false;
  }, { timeout: 60000 }).catch((e) => console.log(`[${label}] store never appeared`));
  await page.waitForTimeout(4000);
};

const state = (page) => page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const data = rt.mains.get('@tomlarkworthy/annotate-data');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  const dataVars = [];
  if (data) for (const v of rt._variables) if (v._module === data) dataVars.push(v._name);
  const recs = store ? store.all().map((a) => {
    const res = A.resolve(a.anchor);
    return { id: a.id, cell: a.cell, resolved: !!res, visible: res ? A.visible(res) : false,
      y: res ? Math.round(res.y) : null };
  }) : null;
  return {
    hasData: !!data, dataVars, stored: store ? store.all().length : null, recs,
    root: !!document.querySelector('[data-a2-root]'),
    boxes: document.querySelectorAll('[data-ann-id]').length,
    offChips: [...document.querySelectorAll('[data-a2-off]')].map((b) => b.textContent),
    status: (() => { const c = document.querySelector('.observablehq[cell="a2Layer"]'); return c ? c.textContent.trim() : null; })(),
    marker: /fork survival marker QQQ/.test(document.body.innerText),
    enabled: g('annotationsEnabled'),
    url: location.href.slice(0, 60)
  };
});

const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const context = await browser.newContext({ viewport: VP });
const page = await context.newPage();
page.on('pageerror', (e) => console.log('[origin pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}${LAYOUT}`, { waitUntil: 'domcontentloaded' });
await settle(page, 'origin');

const made = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  const cell = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"] .observablehq[cell="demoText"]');
  if (!cell) return { err: 'no demoText cell' };
  cell.scrollIntoView({ block: 'center' });
  const at = cell.textContent.indexOf('lazy dog');
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
  const a = store.create(A.describeSelection(sel));
  sel.removeAllRanges();
  store.setSource(a.cell, `${a.cell} = md\`fork survival marker QQQ\``);
  return { id: a.id, cell: a.cell };
});
console.log('created', JSON.stringify(made));
await page.waitForTimeout(1500);
console.log('ORIGIN', JSON.stringify(await state(page)));

// The burger menu path: exporter-3 forkAnchor -> window.open(blob:)
const popupP = context.waitForEvent('page', { timeout: 180000 });
await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  let fa = null;
  for (const v of rt._variables) if (v._name === 'forkAnchor' && typeof v._value === 'function') { fa = v._value; break; }
  if (!fa) throw new Error('no forkAnchor');
  const a = fa({}, 'fork');
  document.body.appendChild(a);
  a.click();
});
const popup = await popupP;
popup.on('pageerror', (e) => console.log('[fork pageerror]', String(e).slice(0, 250)));
popup.on('console', (m) => { if (m.type() === 'error') console.log('[fork console]', m.text().slice(0, 200)); });
await popup.waitForLoadState('domcontentloaded');
console.log('fork url', popup.url().slice(0, 80));
await settle(popup, 'fork');
await popup.setViewportSize(VP);
console.log('FORK', JSON.stringify(await state(popup), null, 1));
const fs = await state(popup);
console.log(fs.boxes || fs.offChips.length ? 'PASS the fork surfaces its annotation' : 'FAIL the annotation is invisible in the fork');
if (fs.offChips.length) {
  await popup.click('[data-a2-off]');
  await popup.waitForTimeout(1200);
  const after = await state(popup);
  console.log(after.boxes ? 'PASS clicking the chip reveals it' : 'FAIL chip did not reveal', JSON.stringify({ boxes: after.boxes, marker: after.marker }));
}
await popup.evaluate(() => {
  const cell = document.querySelector('.observablehq[cell="demoText"]');
  if (cell) cell.scrollIntoView({ block: 'center' });
});
await popup.waitForTimeout(800);
await popup.screenshot({ path: 'tools/screenshots/a2-blobfork.png' });
await browser.close();
