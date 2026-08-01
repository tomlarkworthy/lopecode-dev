// The boxes anchor, but their bodies read "note…". Where did the note cells go?
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
await page.goto(process.argv[2] || 'https://observablehq.com/@tomlarkworthy/annotate',
  { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(22000);
const frame = page.frames().find((f) => f.url().includes('observableusercontent.com'));
console.log(await frame.evaluate(() => {
  const rt = window.__ojs_runtime;
  const home = ([...rt._variables].find((v) => v._name === 'a2Layer') || {})._module;
  const mine = [...rt._variables].filter((v) => v._module === home);
  const g = (n) => { const v = mine.find((x) => x._name === n); return v && v._value; };
  const store = g('a2Store');
  const out = [];
  for (const r of store.all()) {
    const noteName = r.varName ? r.varName + '_note' : '(none)';
    const v = mine.find((x) => x._name === noteName);
    const nv = store.noteVar ? store.noteVar(r) : null;
    const body = document.querySelector(`[data-a2-body="${r.id}"]`);
    out.push(`${r.id.padEnd(14)} varName=${r.varName} noteVar=${nv ? 'found' : 'MISSING'}` +
      ` inModule=${v ? 'yes' : 'no'} value=${v ? (v._value && v._value.nodeName ? v._value.nodeName : typeof v._value) : '-'}` +
      ` body=${body ? JSON.stringify((body.textContent || '').trim().slice(0, 30)) : 'none'}`);
  }
  const names = mine.filter((v) => /^annotation_/.test(v._name || '')).map((v) => v._name);
  out.push('annotation_* variables in module: ' + names.join(', '));
  out.push('home module scope size: ' + (home._scope ? home._scope.size : '?'));
  return out.join('\n');
}));
await browser.close();
