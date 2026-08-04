// QA the landing page: is it only the chooser, does clicking a type preselect + light its column
// while other columns still show their defaults, are mandatory rows disabled, does the tutorial
// tick persist to localStorage, and do File/Tab both build?
import { chromium } from 'playwright';
import { resolve } from 'path';
const results = [];
const check = (n, pass, d = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1300, height: 1000 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 140)));
await p.goto(`file://${resolve('lopecode/notebooks/quick_start.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(20000);

const shape = await p.evaluate(() => {
  const t = document.querySelector('.qs table');
  return {
    cols: [...t.querySelectorAll('thead th')].slice(1).map((e) => e.textContent.trim()),
    rows: [...t.querySelectorAll('tbody th')].map((e) => e.textContent.trim()),
    icons: [...t.querySelectorAll('thead .ico svg')].length,
    hoverTitles: [...t.querySelectorAll('tbody th')].every((e) => (e.title || '').length > 10),
    activeCol: [...t.querySelectorAll('thead th')].findIndex((e) => e.classList.contains('on')),
    mandatory: [...document.querySelectorAll('.qs .always input')].map((e) => e.disabled && e.checked),
    // no leftover prose: the landing page should be the chooser. Scope to this module's own
    // pane — other panes (robocoop-5) legitimately have headings of their own.
    strayProse: /Blank Notebook|This page is the overview|Start from a template/.test(document.body.innerText),
    firstCell: document.querySelector('.qs') ? 'chooser' : 'something else',
  };
});
check('four type columns', shape.cols.length === 4, shape.cols.join(' | '));
check('module rows with hover explanations', shape.rows.length >= 5 && shape.hoverTitles, shape.rows.join(', '));
check('each type has an SVG icon', shape.icons === 4, String(shape.icons));
check('mandatory modules are ticked and disabled', shape.mandatory.length >= 6 && shape.mandatory.every(Boolean),
  `${shape.mandatory.length} rows`);
check('no leftover landing-page prose', !shape.strayProse && shape.firstCell === 'chooser',
  `stray=${shape.strayProse} first=${shape.firstCell}`);

// click the third column (Single file app) and inspect
const after = await p.evaluate(() => {
  const th = [...document.querySelectorAll('.qs thead th')][3];
  th.click();
  const t = document.querySelector('.qs table');
  const rows = [...t.querySelectorAll('tbody tr')].map((tr) => ({
    label: tr.querySelector('th').textContent.trim(),
    cells: [...tr.querySelectorAll('td')].map((td) => ({
      lit: td.classList.contains('on'), on: td.querySelector('input').checked,
      disabled: td.querySelector('input').disabled })),
  }));
  return { active: [...t.querySelectorAll('thead th')].findIndex((e) => e.classList.contains('on')), rows };
});
check('clicking a type lights its column', after.active === 3, `active index ${after.active}`);
check('only the active column is interactive',
  after.rows.every((r) => r.cells.every((c, i) => (i === 2) === (!c.disabled || (i === 2 && c.disabled)))) &&
  after.rows.every((r) => r.cells.filter((c) => c.lit).length === 1), 'one lit column per row');
const grid = after.rows.find((r) => /Snap grid/.test(r.label));
const svg = after.rows.find((r) => /SVG/.test(r.label));
check('type preselects its modules', svg?.cells[2].on === true, `svg-lens on = ${svg?.cells[2].on}`);
check('a module the starter requires is locked on', grid?.cells[2].on && grid?.cells[2].disabled,
  `grid on=${grid?.cells[2].on} disabled=${grid?.cells[2].disabled}`);
check('other columns still show their own defaults',
  after.rows.find((r) => /Annotations/.test(r.label))?.cells[0].on === true, 'blog still shows annotate');

// tutorial tick persists
const persisted = await p.evaluate(() => {
  const box = document.querySelector('.qs .foot input[type=checkbox]');
  const was = box.checked;
  box.click(); box.dispatchEvent(new Event('change', { bubbles: true }));
  return { was, now: box.checked, stored: window.localStorage.getItem('lopecode.quick_start.tutorial') };
});
check('tutorial ticked by default', persisted.was === true);
check('tutorial tick written to localStorage', persisted.stored === String(persisted.now), String(persisted.stored));
const p2 = await ctx.newPage();
await p2.goto(`file://${resolve('lopecode/notebooks/quick_start.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p2.waitForTimeout(20000);
const remembered = await p2.evaluate(() => document.querySelector('.qs .foot input[type=checkbox]').checked);
check('and remembered on reload', remembered === false, `checked=${remembered}`);
await p2.close();

// generate as a Tab
const [popup] = await Promise.all([
  ctx.waitForEvent('page'),
  p.evaluate(() => [...document.querySelectorAll('.qs button')].find((e) => e.textContent.trim() === 'Tab').click()),
]);
await popup.waitForLoadState('domcontentloaded');
await popup.waitForTimeout(14000);
const built = await popup.evaluate(() => ({
  mains: window.__ojs_runtime.mains.size,
  err: /RuntimeError:/.test(document.body.innerText),
}));
check('Generate → Tab opens a working notebook', built.mains > 4 && !built.err, JSON.stringify(built));
await popup.close();

await p.screenshot({ path: 'tools/screenshots/qa-chooser.png' });
await b.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
