// Annotate a cell in a *different* module's pane: the annotation cells must land in that
// module, and the editable-md import must be injected there (or degrade without error).
import { chromium } from 'playwright';
import { resolve } from 'path';
const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const OTHER = '@tomlarkworthy/claude-code-pairing';
const LAYOUT = `#view=R100(S50(@tomlarkworthy/annotate),S50(${OTHER}))`;
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0,160)));
await page.goto(`file://${NOTEBOOK}${LAYOUT}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(7000);

const sel = await page.evaluate((other) => {
  const pane = document.querySelector(`.lp2-pane[data-module="${other}"]`);
  if (!pane) return { err: 'pane missing' };
  const w = document.createTreeWalker(pane, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const t = w.currentNode.nodeValue;
    if (t.trim().length > 12 && !w.currentNode.parentElement.closest('[data-a2-root],[data-a2-layer]')) {
      const r = document.createRange(); r.setStart(w.currentNode, 0); r.setEnd(w.currentNode, 12);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      return { text: t.slice(0, 12) };
    }
  }
  return { err: 'no text' };
}, OTHER);
console.log('selected:', JSON.stringify(sel));
await page.waitForTimeout(600);
const chipVisible = await page.evaluate(() => { const c = document.querySelector('[data-a2-chip]'); return c && c.style.display !== 'none'; });
console.log('chip visible:', chipVisible);
if (chipVisible) { await page.click('[data-a2-chip]'); await page.waitForTimeout(3000); }

console.log(JSON.stringify(await page.evaluate((other) => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = n => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store');
  const a = store.all()[store.all().length - 1];
  const om = rt.mains.get(other);
  const data = rt.mains.get('@tomlarkworthy/annotate-data');
  return {
    record: a && { home: a.home, cell: a.cell, anchorModule: a.anchor.module, pid: a.anchor.pid, exact: a.anchor.quote && a.anchor.quote.exact },
    inOtherModule: a ? om._scope.has('annotation_' + a.id) : null,
    inDataModule: a ? data._scope.has('annotation_' + a.id) : null,
    otherIndex: om._scope.has('annotation_index'),
    otherMdType: om._scope.get('md') && om._scope.get('md')._type,
    noteRendered: a ? (document.querySelector(`[data-a2-body="${a.id}"]`) || {}).textContent : null,
    boxes: document.querySelectorAll('[data-ann-id]').length,
    boxInOtherPane: a ? !!document.querySelector(`.lp2-pane[data-module="${other}"] [data-ann-id="${a.id}"]`) : null,
    moduleErrors: (() => { const bad=[]; for (const v of rt._variables) if (v._module===om && v._value instanceof Error) bad.push(v._name+': '+String(v._value.message).slice(0,60)); return bad.slice(0,5); })()
  };
}, OTHER), null, 2));
console.log('page errors:', errs.slice(0,3));
await browser.close();
