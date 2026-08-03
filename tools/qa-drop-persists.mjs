// The guide tells the reader that Save in place keeps a module they dropped in. Verify: drop a
// module, click Install, re-export from the live runtime, and look for its block in the output.
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
p.on('console', (m) => { if (m.type() === 'error' || /import/i.test(m.text())) console.log('  [browser]', m.text().slice(0, 160)); });
p.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 160)));
await p.goto(`file://${resolve('scratch/tpl-dataviz-tutorial.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(18000);

const r = await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const before = rt.mains.has('@qa/dropped');

  const src = 'export default function define(runtime, observer){const main=runtime.module();' +
    'main.variable(observer("qaMarker")).define("qaMarker",[],()=>"QA_DROPPED_MARKER");return main;}';
  const dt = new DataTransfer();
  dt.setData('application/x-lp2-leaf', '@qa/dropped');
  dt.setData('application/javascript', src);
  const host = document.querySelector('#lopepage-2') || document.body;
  for (const t of ['dragover', 'drop'])
    host.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt }));
  await new Promise((s) => setTimeout(s, 1200));

  const btn = [...document.querySelectorAll('.lp2-import-dialog button')]
    .find((e) => /Install as module/.test(e.textContent));
  if (!btn) return { error: 'no Install button', dialog: document.querySelector('.lp2-import-dialog')?.textContent };
  btn.click();
  await new Promise((s) => setTimeout(s, 1500));
  // step two: a name field and a final Install
  const dlg = document.querySelector('.lp2-import-dialog');
  const field = dlg && dlg.querySelector('input[type=text], input:not([type])');
  if (field && !field.value) {
    field.value = '@qa/dropped';
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const go = [...(dlg ? dlg.querySelectorAll('button') : [])].find((e) => /^\s*Install\s*$/.test(e.textContent));
  if (go) go.click();
  await new Promise((s) => setTimeout(s, 4000));

  const inMains = rt.mains.has('@qa/dropped');
  const mainsNow = [...rt.mains.keys()].slice(-6);
  const dialogAfter = document.querySelector('.lp2-import-dialog')?.textContent?.slice(0, 200) || null;
  // re-export exactly the way Save in place does: from the live runtime
  const exportToHTML = val('exportToHTML');
  if (!exportToHTML) return { before, inMains, mainsNow, dialogAfter, error: 'no exportToHTML' };
  const resp = await exportToHTML({ mains: rt.mains, runtime: rt, options: { title: 'qa' } });
  const html = resp?.source ?? resp;
  return {
    before, inMains, mainsNow, dialogAfter,
    blockPresent: /id="@qa\/dropped"/.test(html),
    markerPresent: /QA_DROPPED_MARKER/.test(html),
    bytes: html.length,
  };
});
console.log(JSON.stringify(r, null, 1));
await p.screenshot({ path: 'tools/screenshots/qa-drop.png' });
await b.close();
