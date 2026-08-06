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
    rows: [...t.querySelectorAll('tbody tr:not(.sect) th')].map((e) => e.textContent.trim()),
    icons: [...t.querySelectorAll('thead .ico svg')].length,
    // the explanation is visible prose, not a tooltip, and the name is a link that opens the module
    whys: [...t.querySelectorAll('tbody th .why')].every((e) => e.textContent.trim().length > 10),
    // the section heading row carries no link, so count links against link-bearing rows
    modLinks: [...t.querySelectorAll('tbody th a.mod')].map((a) => a.getAttribute('href') || ''),
    activeCol: [...t.querySelectorAll('thead th')].findIndex((e) => e.classList.contains('on')),
    mandatory: [...document.querySelectorAll('.qs tr.core input')].map((e) => e.disabled && e.checked),
    sections: [...document.querySelectorAll('.qs tr.sect th')].map((e) => e.textContent.trim()),
    // no leftover prose: the landing page should be the chooser. Scope to this module's own
    // pane — other panes (robocoop-5) legitimately have headings of their own.
    strayProse: /Blank Notebook|This page is the overview|Start from a template/.test(document.body.innerText),
    firstCell: document.querySelector('.qs') ? 'chooser' : 'something else',
  };
});
check('four type columns', shape.cols.length === 4, shape.cols.join(' | '));
check('module rows carry a visible explanation', shape.rows.length >= 5 && shape.whys, shape.rows.join(', '));
check('module names link to the module', shape.modLinks.length === shape.rows.length &&
  shape.modLinks.every((h) => h.includes('open=@tomlarkworthy/')), shape.modLinks[0] || 'none');
check('each type has an SVG icon', shape.icons === 4, String(shape.icons));
check('core modules are rows of the same table, ticked and disabled',
  shape.mandatory.length >= 24 && shape.mandatory.every(Boolean), `${shape.mandatory.length} cells`);
check('both groups are walled off under headings',
  /optional modules/i.test(shape.sections[0] || '') && /core modules/i.test(shape.sections[1] || ''),
  shape.sections.join(' | '));
check('no leftover landing-page prose', !shape.strayProse && shape.firstCell === 'chooser',
  `stray=${shape.strayProse} first=${shape.firstCell}`);

// spawnNotebook importShims every chosen module out of THIS file and throws if one is missing, so
// an offered module with no block is a broken Generate rather than a degraded one.
const supply = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const cat = val('catalogue'), templates = val('templates') || [];
  const ids = [...cat.always, ...cat.optional].map((m) => m.id)
    .concat(cat.cargo || [], ...templates.map((t) => [...(t.modules || []), ...Object.keys(t.imports || {}), ...Object.keys(t.optionalImports || {})]));
  const blocks = new Set([...document.querySelectorAll('script[type="text/plain"]')].map((s) => s.id));
  return { offered: new Set(ids).size, missing: [...new Set(ids)].filter((id) => !blocks.has(id)) };
});
check('every module the chooser offers is in the file', supply.missing.length === 0,
  `${supply.offered} offered; missing: ${supply.missing.join(', ') || 'none'}`);

// layout: header rows share a baseline, and Generate sits on a line of its own
const layout = await p.evaluate(() => {
  const tops = (sel) => [...document.querySelectorAll(sel)].map((e) => Math.round(e.getBoundingClientRect().top));
  const foot = document.querySelector('.qs .foot').getBoundingClientRect();
  const gen = document.querySelector('.qs .gen').getBoundingClientRect();
  const h2 = [...document.querySelectorAll('h1')].find((e) => /Lopecode Quickstart/.test(e.textContent));
  return {
    icoTops: [...new Set(tops('.qs thead .ico'))],
    subTops: [...new Set(tops('.qs thead .sub'))],
    genBelow: gen.top >= foot.bottom - 2,
    // the title is a markdown cell, so it is a sibling of the chooser rather than inside it
    mdTitle: !!h2 && !h2.closest('.qs'),
  };
});
check('header icons share one baseline', layout.icoTops.length === 1, layout.icoTops.join(','));
check('header subtitles share one baseline', layout.subTops.length === 1, layout.subTops.join(','));
check('Generate is on its own line', layout.genBelow);
check('title is a markdown cell of its own', layout.mdTitle);

// click the third column (Single file app) and inspect
const after = await p.evaluate(() => {
  const th = [...document.querySelectorAll('.qs thead th')][3];
  th.click();
  const t = document.querySelector('.qs table');
  const rows = [...t.querySelectorAll('tbody tr:not(.sect):not(.core)')].map((tr) => ({
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

// Clicking a module name must open it BESIDE the chooser. lopepage-2's plain `open=` intent pushes
// the module into the first stack and focuses it, which hides the chooser behind a tab — so assert
// the chooser is still on screen with a non-zero width, not merely that the hash mentions the module.
// Pick modules the default layout does NOT already show, or the click is a no-op.
const aside = async (slug) => {
  await p.evaluate((s) => document.querySelector(`.qs tbody th a.mod[href*="${s}"]`).click(), slug);
  await p.waitForTimeout(9000);
  return p.evaluate((s) => {
    const panes = [...document.querySelectorAll('.lp2-pane')];
    const own = panes.find((e) => e.querySelector('.qs table'));
    const opened = panes.find((e) => (e.dataset.module || '').includes(s));
    return {
      hash: decodeURIComponent(location.hash),
      chooserWidth: own ? Math.round(own.getBoundingClientRect().width) : 0,
      panes: panes.length,
      // A pane whose module never resolved sits on lopepage-2's placeholder for ever.
      openedText: opened ? opened.textContent.trim().slice(0, 60) : '(no pane)',
      openedChars: opened ? opened.textContent.length : 0,
    };
  }, slug);
};
const a1 = await aside('local-change-history');
check('a module name opens beside the chooser, which stays visible',
  /local-change-history/.test(a1.hash) && a1.chooserWidth > 200, JSON.stringify(a1));
const a2 = await aside('at-write');
// at-write starts life as a tab of the chooser's OWN stack; focusing it there would hide the
// chooser, so it has to be pulled out into the aside slot, which the previous target vacates.
check('a second click reuses the aside slot instead of piling up',
  /,S30\(@tomlarkworthy\/at-write\)\)$/.test(a2.hash) && !/local-change-history/.test(a2.hash) &&
  a2.chooserWidth > 200, JSON.stringify(a2));

// These are in the file as blocks but nothing boots them — neither bootconf mains nor imported by
// anything, so `modules()` has never heard of them. The chooser still offers a link, so opening one
// must boot it rather than sit on "loading …".
for (const slug of ['svg-lens', 'grid-container', 'sticky', 'debugger-2']) {
  const a = await aside(slug);
  check(`a module that is in the file but not booted still opens (${slug})`,
    a.openedChars > 400 && !/^loading /.test(a.openedText), JSON.stringify(a));
}

await p.screenshot({ path: 'tools/screenshots/qa-chooser.png' });
await b.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
