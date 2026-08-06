// Open a module by name in a notebook that does not carry a block for it: lopepage-2 should fetch
// it rather than sit on "loading …".
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
const target = process.argv[3];
await p.goto(`file://${resolve(process.argv[2])}#view=S100(${target})`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await p.waitForTimeout(Number(process.argv[4] || 45000));
const out = await p.evaluate((t) => {
  const rt = window.__ojs_runtime;
  const pane = [...document.querySelectorAll('.lp2-pane')].find((e) => (e.dataset.module || '') === t);
  return { mains: [...rt.mains.keys()], paneText: pane ? pane.textContent.trim().slice(0, 70) : '(no pane)',
    paneChars: pane ? pane.textContent.length : 0, hasBlock: !!document.getElementById(t) };
}, target);
console.log(JSON.stringify(out, null, 1));
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await b.close();
