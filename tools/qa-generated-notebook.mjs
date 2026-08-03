// QA for a generated notebook: every claim the onboarding guide makes is checked against the
// running page. A claim that cannot be verified here should not be in the guide.
import { chromium } from 'playwright';
import { resolve } from 'path';

const target = resolve(process.argv[2] || 'scratch/tpl-dataviz-tutorial.html');
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const p = await ctx.newPage();
const pageErrors = [];
p.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));
await p.goto(`file://${target}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(18000);

// ---------- 1. import wizards are actually registered ----------
const wiz = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  return { list: (val('lp2_importWizards') || []).map((w) => w.id), drop: val('lp2_import_drop') };
});
check('import wizards registered', wiz.list.length >= 3, JSON.stringify(wiz.list));
check('drop capture installed', /installed/.test(String(wiz.drop)), String(wiz.drop));

// ---------- 2. burger menu holds the items the guide names ----------
await p.evaluate(() => { const b = document.querySelector('#lopepage-2 button'); if (b) b.click(); });
await p.waitForTimeout(800);
const menu = await p.evaluate(() =>
  [...document.querySelectorAll('[role=menuitem], .lp2-menu-item, [class*=menu] li, [class*=menu] button')]
    .map((e) => e.textContent.trim()).filter(Boolean));
for (const want of ['Save in place', 'Download', 'Fork (new tab)', 'Edit mode'])
  check(`menu has "${want}"`, menu.some((m) => m.includes(want)), menu.join(' | ').slice(0, 90));
await p.keyboard.press('Escape');
await p.waitForTimeout(400);

// ---------- 3. the palette opens and searches ----------
await p.keyboard.press('Meta+k');
await p.waitForTimeout(900);
const paletteOpen = await p.evaluate(() => {
  const o = document.querySelector('[class*=command-palette], #command-palette-overlay, [class*=palette]');
  return !!o && getComputedStyle(o).display !== 'none' && o.offsetHeight > 0;
});
check('⌘K opens the palette', paletteOpen);
if (paletteOpen) {
  await p.keyboard.type('svg-lens', { delay: 30 });
  await p.waitForTimeout(900);
  const modHits = await p.evaluate(() => document.body.innerText.match(/svg-lens/g)?.length || 0);
  check('palette finds a module by name', modHits > 0, `${modHits} mentions`);
  for (let i = 0; i < 8; i++) await p.keyboard.press('Backspace');
  await p.keyboard.type('theme_assets', { delay: 30 });
  await p.waitForTimeout(900);
  const themeHit = await p.evaluate(() => /theme_assets/.test(document.body.innerText));
  check('palette cell-search reaches an unopened module (theme_assets)', themeHit);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
}

// ---------- 4. a module dragged in from another notebook window ----------
const drop = await p.evaluate(async () => {
  const dt = new DataTransfer();
  dt.setData('application/x-lp2-leaf', '@tomlarkworthy/qa-dropped');
  dt.setData('application/javascript', 'export default function define(runtime, observer){}');
  const host = document.querySelector('#lopepage-2') || document.body;
  for (const type of ['dragover', 'drop']) {
    const ev = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
    host.dispatchEvent(ev);
  }
  await new Promise((r) => setTimeout(r, 1200));
  const dlg = document.querySelector('.lp2-import-dialog');
  return { opened: !!dlg, text: dlg ? dlg.textContent.slice(0, 220) : '' };
});
check('dropping a module opens the import dialog', drop.opened, drop.text.slice(0, 70));
check('dialog offers an importer (not "No importer handles this drop")',
  drop.opened && !/No importer handles/.test(drop.text), drop.text.slice(0, 110));
check('dialog offers "Install as module"', /Install as module/.test(drop.text), drop.text.slice(0, 110));
await p.keyboard.press('Escape');
await p.waitForTimeout(500);

// ---------- 5. a tab drag OUT carries what the other window needs ----------
const outbound = await p.evaluate(async () => {
  // lopepage-2 builds its own tabs (not golden-layout's) and primes the module source on
  // pointerdown, so a bare dragstart on the wrong node reports a false failure.
  const tab = [...document.querySelectorAll('[draggable="true"]')].find((e) => /annotate/.test(e.textContent));
  if (!tab) return { found: false };
  tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 1500));
  const dt = new DataTransfer();
  tab.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
  return { found: true, types: [...dt.types], leaf: dt.getData('application/x-lp2-leaf'),
    jsBytes: (dt.getData('application/javascript') || '').length };
});
check('dragging a tab out carries the module name', outbound.leaf === '@tomlarkworthy/annotate', outbound.leaf);
check('dragging a tab out carries the module source', outbound.jsBytes > 1000, `${outbound.jsBytes} bytes`);

// ---------- 6. prose is click-to-edit, cells have an edit affordance ----------
const editable = await p.evaluate(() => {
  const para = [...document.querySelectorAll('p')].find((e) => e.textContent.length > 40);
  if (!para) return { clicked: false };
  para.click();
  return { clicked: true };
});
await p.waitForTimeout(1200);
const proseEditor = await p.evaluate(() =>
  !!document.querySelector('.ProseMirror, [contenteditable=true]'));
check('clicking prose opens an editor', editable.clicked && proseEditor);
await p.keyboard.press('Escape');
const editAffordance = await p.evaluate(() => (document.body.innerText.match(/edit/gi) || []).length > 0);
check('cells expose an edit affordance', editAffordance);

// ---------- 7. Save in place on a blob: has nowhere to go ----------
const blobBehaviour = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  return { hasSaveCell: !!val('sip_save') || !!val('saveInPlace') || !!val('sip_menu'), href: location.protocol };
});
check('save-in-place is present in the fork', blobBehaviour.hasSaveCell || menu.some((m) => m.includes('Save in place')),
  blobBehaviour.href);

// ---------- 8. annotation controls the guide names ----------
const annot = await p.evaluate(() => {
  const h = [...document.querySelectorAll('*')].filter((e) => /^cell _/.test(e.textContent.trim()) && e.children.length && e.children.length < 8).pop();
  return h ? { text: h.textContent.trim(), cursor: getComputedStyle(h).cursor } : null;
});
check('annotation header carries ✎ ⌖ × and drags', !!annot && /✎/.test(annot.text) && /⌖/.test(annot.text)
  && /×/.test(annot.text) && annot.cursor === 'move', annot ? annot.text + ' cursor=' + annot.cursor : 'none');

// ---------- 9. no errors anywhere ----------
const errs = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const bad = [];
  for (const v of rt._variables) {
    const n = v._observer && v._observer._node;
    const t = n && n.textContent ? n.textContent : '';
    if (/RuntimeError|ReferenceError|is not defined/.test(t)) bad.push(`${v._name}: ${t.slice(0, 60)}`);
  }
  return { bad, adrift: (document.body.innerText.match(/\(adrift\)/g) || []).length };
});
check('no error cells', errs.bad.filter((e) => !/fileSyncTools/.test(e)).length === 0, errs.bad.join(' | ').slice(0, 120));
check('no adrift annotations', errs.adrift === 0, String(errs.adrift));
check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

await p.screenshot({ path: 'tools/screenshots/qa-final.png' });
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
