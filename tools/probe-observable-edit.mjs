// Click ✎ on a note and watch what lands in the editor host — real editor, textarea fallback,
// or nothing at all (a cellEditor promise that never settles).
import { chromium } from 'playwright';
import { resolve } from 'path';

const target = process.argv[2] || 'observable';
const url = target === 'local'
  ? `file://${resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html')}#view=S100(@tomlarkworthy/annotate)`
  : 'https://observablehq.com/@tomlarkworthy/annotate';

const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 1200 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 160)); });
page.on('pageerror', (e) => logs.push('pageerror: ' + String(e).slice(0, 160)));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(target === 'local' ? 12000 : 22000);

const frame = target === 'local' ? page.mainFrame()
  : page.frames().find((f) => f.url().includes('observableusercontent.com'));

const state = () => frame.evaluate(() => {
  const host = document.querySelector('[data-a2-editor]');
  const rt = window.__ojs_runtime;
  const home = ([...rt._variables].find((v) => v._name === 'a2Layer') || {})._module;
  const ce = [...rt._variables].find((v) => v._name === 'cellEditor' && v._module === home);
  return {
    hosts: document.querySelectorAll('[data-a2-editor]').length,
    shown: host ? getComputedStyle(host).display : 'none',
    inside: host ? [...host.children].map((c) => c.tagName + '.' + (c.className || '')).join(', ') : '',
    text: host ? (host.textContent || '').trim().slice(0, 60) : '',
    html: host ? [...host.children].map((c) => (c.outerHTML || '').slice(0, 120)).join(' | ') : '',
    cm: document.querySelectorAll('.cm-editor').length,
    shell: (() => {
      const b = document.querySelector('[data-a2-editor] .cell-editor-body');
      const e = document.querySelector('[data-a2-editor] .cell-editor');
      return e ? `cell-editor present, body=${b ? getComputedStyle(b).display + ' children=' + b.childElementCount : 'MISSING'}` : 'no cell-editor';
    })(),
    textareas: host ? host.querySelectorAll('textarea').length : 0,
    cellEditorValue: ce ? typeof ce._value : 'no cell',
    editorModules: [...rt._variables].filter((v) => /editor-5/.test(v._name || '')).map((v) => v._name)
  };
});

console.log('before:', JSON.stringify(await state()));
const btn = await frame.$('[data-a2-edit]');
console.log('edit button:', !!btn);
await btn.click();
for (const wait of [1000, 3000, 6000, 10000, 20000, 35000]) {
  await page.waitForTimeout(wait === 1000 ? 1000 : wait - 1000);
  console.log(`t=${wait}ms:`, JSON.stringify(await state()));
}
console.log('logs:', logs.slice(0, 8).join('\n  '));
await page.screenshot({ path: `tools/screenshots/edit-${target}.png` });
await browser.close();
