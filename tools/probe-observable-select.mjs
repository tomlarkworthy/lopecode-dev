// Does selecting the note's variable work on observablehq.com? Clone the editor template as
// cellEditor does, call selectVariable with the real variable, and watch editor_panel.
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1200 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto('https://observablehq.com/@tomlarkworthy/annotate', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(22000);
const frame = page.frames().find((f) => f.url().includes('observableusercontent.com'));

console.log(await frame.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const home = ([...rt._variables].find((v) => v._name === 'a2Layer') || {})._module;
  const g = (n) => ([...rt._variables].find((v) => v._name === n && v._module === home) || {})._value;
  const store = g('a2Store');
  const rec = store.all()[0];
  const noteVar = store.noteVar(rec);
  const out = ['note variable: ' + (noteVar ? noteVar._name + ' pid=' + (noteVar.pid || 'none') : 'MISSING')];

  await g('cellEditor')();
  const mod = [...rt._variables].find((v) => v._name === 'cellEditor' && v._module !== home)._module;
  const clone = await mod.value('cloneDataflow');
  const template = await mod.value('editorTemplate');

  const log = [];
  let panelChildren = null;
  const dispose = clone(template, (name) => {
    if (name === 'selectVariable') return {
      fulfilled: async (sel) => {
        if (typeof sel !== 'function') return log.push('selectVariable not a function: ' + typeof sel);
        try { const r = await sel(noteVar); log.push('selectVariable resolved: ' + String(r).slice(0, 60)); }
        catch (e) { log.push('selectVariable THREW: ' + String(e).slice(0, 140)); }
      }
    };
    if (name === 'editor_panel') return {
      fulfilled: (el) => { panelChildren = el ? el.childElementCount + ' children, cm=' + el.querySelectorAll('.cm-editor').length : 'null'; log.push('editor_panel -> ' + panelChildren); },
      rejected: (e) => log.push('editor_panel REJECTED ' + String(e).slice(0, 140))
    };
    if (name === 'editedCell') return {
      fulfilled: (c) => log.push('editedCell -> ' + (c ? JSON.stringify(Object.keys(c)).slice(0, 90) : String(c))),
      rejected: (e) => log.push('editedCell REJECTED ' + String(e).slice(0, 140))
    };
    if (name === 'decompiled') return {
      fulfilled: (s) => log.push('decompiled -> ' + JSON.stringify(String(s).slice(0, 60))),
      rejected: (e) => log.push('decompiled REJECTED ' + String(e).slice(0, 140))
    };
    return {};
  });
  await new Promise((r) => setTimeout(r, 8000));
  dispose();
  return out.concat(log).join('\n');
}));
await browser.close();
