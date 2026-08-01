#!/usr/bin/env node
// annotate suite: anchors in document units (text quote / svg user-space / image
// fraction), annotation-as-code-change through the data module, resize invariance,
// the adrift ladder, teardown, and an export round-trip across a genuine reload.
//
//   node tools/test-annotate.js [--headed]

import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const LAYOUT = '#view=S100(@tomlarkworthy/annotate)';
const headed = process.argv.includes('--headed');

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  process.stdout.write(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}\n`);
};

// Evaluate an expression with store/A/data-module/runtime in scope.
const api = (page, expr) =>
  page.evaluate((e) => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
    const store = g('a2Store'), A = g('a2Anchors'), layer = g('a2Layer');
    const data = rt.mains.get('@tomlarkworthy/annotate-data');
    return new Function('store', 'A', 'data', 'rt', 'mod', 'layer', `return (${e})`)(store, A, data, rt, mod, layer);
  }, expr);

const settle = async (page) => {
  await page.waitForFunction(() => window.__ojs_runtime, { timeout: 40000 });
  await page.waitForFunction(() => document.querySelector('[data-a2-root]'), { timeout: 40000 });
  await page.waitForFunction(() => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    for (const v of rt._variables) if (v._name === 'a2Store' && v._module === mod) return !!v._value;
    return false;
  }, { timeout: 40000 });
  // A late pane mount replaces the cell nodes and silently drops any selection made
  // before it, so wait for the overlay AND the demo cell to hold still.
  await page.waitForFunction(() => {
    const cell = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"] .observablehq[cell="demoText"]');
    const root = document.querySelector('[data-a2-root]');
    if (!cell || !root) return false;
    if (window.__a2sCell !== cell || window.__a2sRoot !== root) {
      window.__a2sCell = cell; window.__a2sRoot = root; window.__a2sSince = Date.now();
      return false;
    }
    return Date.now() - window.__a2sSince > 1500;
  }, { timeout: 60000 });
};

// Ground truth for a text quote: an independent TreeWalker range, not the module's own resolver.
const groundTruthRect = (page, phrase, occurrence = 0) =>
  page.evaluate(([ph, occ]) => {
    const cell = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"] .observablehq[cell="demoText"]');
    const text = cell.textContent;
    let at = -1;
    for (let i = 0; i <= occ; i++) at = text.indexOf(ph, at + 1);
    if (at === -1) return null;
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let acc = 0, sN = null, sO = 0, eN = null, eO = 0;
    const end = at + ph.length;
    while (walker.nextNode()) {
      const n = walker.currentNode, len = n.nodeValue.length;
      if (!sN && acc + len >= at) { sN = n; sO = at - acc; }
      if (acc + len >= end) { eN = n; eO = end - acc; break; }
      acc += len;
    }
    const r = document.createRange();
    r.setStart(sN, sO); r.setEnd(eN, eO);
    const b = r.getClientRects()[0];
    return { left: b.left, top: b.top, width: b.width, height: b.height, at };
  }, [phrase, occurrence]);

// Read the highlight's real viewport rect — the div's style values are layer-content
// coordinates now, so gBCR is the space-independent truth.
const highlightRect = (page, id) =>
  page.evaluate((i) => {
    const d = document.querySelector(`[data-a2-hl="${i}"] div`);
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width };
  }, id);

const near = (a, b, tol = 2.5) => Math.abs(a - b) <= tol;

const selectPhrase = (page, phrase, occurrence = 0) =>
  page.evaluate(([ph, occ]) => {
    const cell = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"] .observablehq[cell="demoText"]');
    const text = cell.textContent;
    let at = -1;
    for (let i = 0; i <= occ; i++) at = text.indexOf(ph, at + 1);
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let acc = 0, sN = null, sO = 0, eN = null, eO = 0;
    const end = at + ph.length;
    while (walker.nextNode()) {
      const n = walker.currentNode, len = n.nodeValue.length;
      if (!sN && acc + len >= at) { sN = n; sO = at - acc; }
      if (acc + len >= end) { eN = n; eO = end - acc; break; }
      acc += len;
    }
    const r = document.createRange();
    r.setStart(sN, sO); r.setEnd(eN, eO);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }, [phrase, occurrence]);

const svgScreenPoint = (page, ux, uy) =>
  page.evaluate(([x, y]) => {
    const svg = document.querySelector('.observablehq[cell="demoSvg"] svg');
    const m = svg.getScreenCTM();
    return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
  }, [ux, uy]);

// The export round-trip below splices real annotations into the notebook's data block.
// Remember the block as it was and put it back, or every later run boots with the
// previous run's annotations already present.
const DATA_RE = /(<script[^>]*\bid="@tomlarkworthy\/annotate-data"[^>]*>)([\s\S]*?)(<\/script>)/;
const MODULE_RE = /(<script[^>]*\bid="@tomlarkworthy\/annotate"[^>]*>)([\s\S]*?)(<\/script>)/;
const pristineData = readFileSync(NOTEBOOK, 'utf8').match(DATA_RE)[2];
const pristineModule = readFileSync(NOTEBOOK, 'utf8').match(MODULE_RE)[2];
const restoreDataBlock = () => {
  const cur = readFileSync(NOTEBOOK, 'utf8');
  writeFileSync(NOTEBOOK, cur
    .replace(DATA_RE, (_a, o, _b, c) => o + pristineData + c)
    .replace(MODULE_RE, (_a, o, _b, c) => o + pristineModule + c));
};

const browser = await chromium.launch({ headless: !headed, args: ['--disable-web-security'] });
const context = await browser.newContext({ viewport: { width: 1300, height: 4600 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

try {
  await page.goto(`file://${NOTEBOOK}${LAYOUT}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page);

  // Change probe: everything a placement causes must be an annotate data write.
  const probeOn = await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    let on = null;
    for (const v of rt._variables) if (v._name === 'onCodeChange' && typeof v._value === 'function') { on = v._value; break; }
    if (!on) return false;
    window.__a2events = [];
    window.__a2stop = on((e) => {
      const v = e.variable || (e.previous && e.previous.variable);
      window.__a2events.push({
        name: v ? v._name : (e.previous && e.previous._name),
        prov: e.variable && e.variable._definition && e.variable._definition.__provenance
          ? e.variable._definition.__provenance.source : null
      });
    });
    return true;
  });

  // ---- 1. text annotation via selection ---------------------------------
  await selectPhrase(page, 'lazy dog');
  await page.waitForTimeout(500);
  const chipVisible = await page.evaluate(() => {
    const c = document.querySelector('[data-a2-chip]');
    return c && c.style.display !== 'none';
  });
  check('selection shows the ✎ chip', chipVisible);

  await page.click('[data-a2-chip]');
  await page.waitForTimeout(500);
  const a1 = await api(page, 'store.all()[0]');
  check('chip creates a text annotation', !!a1 && a1.anchor.surface === 'text');
  check('quote captured exactly', a1 && a1.anchor.quote.exact === 'lazy dog', a1 && a1.anchor.quote.exact);
  check('annotation is a variable in the module it annotates',
    await api(page, `mod._scope.has("annotation_${a1.id}")`));
  check('the annotation did not land in the shared data module',
    !(await api(page, `data._scope.has("annotation_${a1.id}")`)));
  check('there is no index cell — the dependency graph is the index',
    !(await api(page, 'mod._scope.has("annotation_index")')));
  check('the record cell is readable source, not an opaque literal',
    /^\s*function[^]*annotation\(/.test(await api(page, `String(mod._scope.get("annotation_${a1.id}")._definition)`)),
    (await api(page, `String(mod._scope.get("annotation_${a1.id}")._definition)`)).replace(/\s+/g, ' ').slice(0, 90));
  check('the record cell depends on annotation(), which is what makes it discoverable',
    (await api(page, `mod._scope.get("annotation_${a1.id}")._inputs.map(i => i._name)`)).includes('annotation'));
  check('the anchor records the cell pid, not just its name',
    a1.anchor.pid === '_a2demoText' && a1.anchor.cell === 'demoText', JSON.stringify({pid: a1.anchor.pid, cell: a1.anchor.cell}));

  const gt1 = await groundTruthRect(page, 'lazy dog');
  const hl1 = await highlightRect(page, a1.id);
  check('highlight sits on the quoted text',
    hl1 && near(hl1.left, gt1.left) && near(hl1.top, gt1.top) && near(hl1.width, gt1.width),
    hl1 && gt1 && `hl(${Math.round(hl1.left)},${Math.round(hl1.top)}) gt(${Math.round(gt1.left)},${Math.round(gt1.top)})`);

  // move its box out of the way of later clicks
  await api(page, `store.patch(${JSON.stringify(a1.id)}, {box: {dx: 260, dy: -20, w: 200}})`);

  // ---- 2. duplicate-phrase disambiguation --------------------------------
  await selectPhrase(page, 'quick brown fox', 1);
  await page.waitForTimeout(500);
  await page.click('[data-a2-chip]');
  await page.waitForTimeout(500);
  const a2 = await api(page, 'store.all()[1]');
  const gtSecond = await groundTruthRect(page, 'quick brown fox', 1);
  check('second occurrence selected', a2 && a2.anchor.hint.start === gtSecond.at,
    a2 && `hint ${a2.anchor.hint.start} vs ${gtSecond.at}`);
  const hl2 = await highlightRect(page, a2.id);
  check('resolver picks the second occurrence, not the first',
    hl2 && near(hl2.top, gtSecond.top) && near(hl2.left, gtSecond.left),
    hl2 && `hl top ${Math.round(hl2.top)} gt ${Math.round(gtSecond.top)}`);
  await api(page, `store.patch(${JSON.stringify(a2.id)}, {box: {dx: 300, dy: 30, w: 200}})`);

  // ---- 3. svg annotation in user space -----------------------------------
  // Armed through the burger-menu plugin item, not a button of annotate's own.
  const menuItem = await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    let items = null;
    for (const v of rt._variables) if (v._name === 'lp2MenuItems' && Array.isArray(v._value)) items = v._value;
    const it = items && items.find((i) => i && i.id === 'annotate');
    return it ? { label: it.label, order: it.order, svg: typeof it.svg === 'string' ? it.svg : '(element)',
                  hasAction: typeof it.action === 'function' } : null;
  });
  check('annotate registers an item on the lopepage-2 burger menu',
    menuItem && menuItem.hasAction === true, JSON.stringify(menuItem));
  check('the menu item uses a speech-bubble glyph',
    menuItem && /<svg/.test(menuItem.svg) && /M2\.4 3\.4h11\.2/.test(menuItem.svg), menuItem && menuItem.svg);
  const target = await svgScreenPoint(page, 50, 50); // circle centre
  await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    let items = null;
    for (const v of rt._variables) if (v._name === 'lp2MenuItems' && Array.isArray(v._value)) items = v._value;
    items.find((i) => i && i.id === 'annotate').action();
  });
  await page.waitForTimeout(300);
  check('the menu item arms the layer', await api(page, 'layer.isArmed()'));
  await page.mouse.click(target.x, target.y);
  await page.waitForTimeout(500);
  const a3 = await api(page, 'store.all()[2]');
  check('svg annotation stores user-space coords',
    a3 && a3.anchor.surface === 'svg' && near(a3.anchor.svg.x, 50, 1) && near(a3.anchor.svg.y, 50, 1),
    a3 && a3.anchor.svg && `(${a3.anchor.svg.x.toFixed(1)},${a3.anchor.svg.y.toFixed(1)})`);
  await api(page, `store.patch(${JSON.stringify(a3.id)}, {box: {dx: 240, dy: 60, w: 200}})`);

  // ---- 4. image annotation as a fraction ---------------------------------
  const imgPoint = await page.evaluate(() => {
    const img = document.querySelector('.observablehq[cell="demoImage"] img');
    const r = img.getBoundingClientRect();
    return { x: r.left + r.width * 0.25, y: r.top + r.height * 0.5 };
  });
  // Armed through ⌘K this time — a real end-to-end run of a command that acts rather
  // than navigates.
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  check('⌘K opens the command palette',
    await page.evaluate(() => { const o = document.querySelector('.command-palette-overlay, #command-palette-overlay'); return o ? !o.hidden : false; }));
  await page.keyboard.type('annotate');
  await page.waitForTimeout(600);
  const paletteRows = await page.evaluate(() =>
    [...document.querySelectorAll('.command-palette-result')].map((r) => ({
      text: r.textContent, isAction: 'commandAction' in r.dataset })));
  check('the palette offers an annotate command that acts, not navigates',
    paletteRows.some((r) => /Annotate/.test(r.text) && r.isAction),
    JSON.stringify(paletteRows.slice(0, 3)));
  check('the palette command carries the speech-bubble symbol',
    paletteRows.some((r) => r.text.includes('\uD83D\uDCAC')), paletteRows[0] && paletteRows[0].text);
  check('the verb outranks the search hits it shares a prefix with',
    paletteRows[0] && /Annotate/.test(paletteRows[0].text) && paletteRows[0].isAction,
    paletteRows[0] && paletteRows[0].text);
  // Click the annotate row (other providers can outrank it for this query, so don't
  // assume it is the Enter-selected one).
  const clicked = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.command-palette-result')];
    const row = rows.find((r) => /Annotate/.test(r.textContent) && !/hide|show/.test(r.textContent));
    if (!row) return { err: 'row missing', n: rows.length, texts: rows.slice(0, 4).map((r) => r.textContent) };
    row.click();
    return { ok: true };
  });
  if (clicked.err) console.log('   palette rows:', JSON.stringify(clicked));
  await page.waitForTimeout(400);
  check('running the command armed the layer and closed the palette',
    (await api(page, 'layer.isArmed()')) === true &&
      (await page.evaluate(() => { const o = document.querySelector('.command-palette-overlay, #command-palette-overlay'); return o ? o.hidden : true; })));
  await page.mouse.click(imgPoint.x, imgPoint.y);
  await page.waitForTimeout(500);
  const a4 = await api(page, 'store.all()[3]');
  if (!a4) console.log('   DEBUG store:', JSON.stringify(await api(page, 'store.all().map(a => a.anchor.surface)')),
    'armed:', await api(page, 'layer.isArmed()'), 'imgPoint:', JSON.stringify(imgPoint),
    'imgRect:', JSON.stringify(await page.evaluate(() => { const i = document.querySelector('.observablehq[cell="demoImage"] img'); const r = i.getBoundingClientRect(); return {top: r.top, left: r.left, w: r.width, h: r.height}; })));
  check('image annotation stores a fraction',
    a4 && a4.anchor.surface === 'image' && near(a4.anchor.frac.fx, 0.25, 0.02) && near(a4.anchor.frac.fy, 0.5, 0.02),
    a4 && a4.anchor.frac && `(${a4.anchor.frac.fx.toFixed(2)},${a4.anchor.frac.fy.toFixed(2)})`);

  // ---- 4b. dragging a box previews live but commits exactly once ---------
  const preDragEvents = probeOn ? await page.evaluate(() => window.__a2events.length) : 0;
  const preDragBox = await api(page, `store.get(${JSON.stringify(a4.id)}).box`);
  const barPt = await page.evaluate((id) => {
    const span = document.querySelector(`[data-ann-id="${id}"]`).firstElementChild.querySelector('span');
    const r = span.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, a4.id);
  await page.mouse.move(barPt.x, barPt.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(barPt.x + i * 10, barPt.y + i * 5);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(400);
  const postDragBox = await api(page, `store.get(${JSON.stringify(a4.id)}).box`);
  check('box drag lands the exact delta',
    near(postDragBox.dx, preDragBox.dx + 80, 1.5) && near(postDragBox.dy, preDragBox.dy + 40, 1.5),
    `d(${(postDragBox.dx - preDragBox.dx).toFixed(1)},${(postDragBox.dy - preDragBox.dy).toFixed(1)})`);
  if (probeOn) {
    const dragEvents = (await page.evaluate(() => window.__a2events.length)) - preDragEvents;
    check('drag commits exactly one change event', dragEvents === 1, `${dragEvents} change events for one drag`);
  } else {
    check('drag commits exactly one change event', false, 'probe unavailable');
  }

  // ---- 4c. the box is resizable, on the same preview/commit rule ----------
  const preSizeEvents = probeOn ? await page.evaluate(() => window.__a2events.length) : 0;
  const gripPt = await page.evaluate((id) => {
    const b = document.querySelector(`[data-ann-id="${id}"]`);
    const r = b.querySelector(`[data-a2-grip="${id}"]`).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: b.offsetWidth, h: b.offsetHeight };
  }, a4.id);
  await page.mouse.move(gripPt.x, gripPt.y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) {
    await page.mouse.move(gripPt.x + i * 15, gripPt.y + i * 10);
    await page.waitForTimeout(20);
  }
  const midSize = await page.evaluate((id) => {
    const b = document.querySelector(`[data-ann-id="${id}"]`);
    return { w: b.offsetWidth, h: b.offsetHeight };
  }, a4.id);
  await page.mouse.up();
  await page.waitForTimeout(400);
  check('resize previews live during the drag',
    midSize.w > gripPt.w + 60 && midSize.h > gripPt.h + 40,
    `${gripPt.w}x${gripPt.h} -> ${midSize.w}x${midSize.h}`);
  const sized = await api(page, `store.get(${JSON.stringify(a4.id)}).box`);
  check('resize commits width and height into the record',
    near(sized.w, gripPt.w + 90, 3) && near(sized.h, gripPt.h + 60, 3), JSON.stringify(sized));
  if (probeOn) {
    const sizeEvents = (await page.evaluate(() => window.__a2events.length)) - preSizeEvents;
    check('resize commits exactly one change event', sizeEvents === 1, `${sizeEvents} change events for one resize`);
  } else {
    check('resize commits exactly one change event', false, 'probe unavailable');
  }
  const paintedH = await page.evaluate((id) => document.querySelector(`[data-ann-id="${id}"]`).offsetHeight, a4.id);
  check('the stored height is what gets painted', near(paintedH, sized.h, 2), `${paintedH} vs ${sized.h}`);
  await page.dblclick(`[data-a2-grip="${a4.id}"]`);
  await page.waitForTimeout(400);
  const unsized = await api(page, `store.get(${JSON.stringify(a4.id)}).box`);
  check('double-click the grip drops the height and keeps the width',
    !unsized.h && near(unsized.w, sized.w, 1), JSON.stringify(unsized));

  // ---- 5. every change was an annotate data write ----------------------
  if (probeOn) {
    const events = await page.evaluate(() => window.__a2events);
    // Two writes are expected on top of the annotation's own cells: notes are markdown
    // bound to editable-md, so the first annotation placed in a module that has no `md`
    // of its own gets the import injected. Everything editable-md then mints per cell is
    // `dynamic *` scaffolding, which the exporter drops — it never reaches the file.
    const INJECTED = ['module @tomlarkworthy/editable-md', 'md'];
    const own = (n) => /^annotation_/.test(n || '');
    const scaffold = (n) => /^dynamic /.test(n || '');
    const foreign = events.filter((e) => !own(e.name) && !scaffold(e.name) && !INJECTED.includes(e.name));
    check('placement changes only annotation cells, the md import and editor scaffolding',
      foreign.length === 0,
      foreign.length ? foreign.map((e) => e.name).join(',') : `${events.length} events`);
    const injections = events.filter((e) => INJECTED.includes(e.name));
    check('the editable-md import is injected once, not per annotation',
      injections.length === INJECTED.length, injections.map((e) => e.name).join(','));
    const ownEvents = events.filter((e) => own(e.name));
    const withProv = ownEvents.filter((e) => e.prov === 'annotate');
    check('writes to annotation cells carry annotate provenance',
      withProv.length > 0 && withProv.length === ownEvents.length,
      `${withProv.length}/${ownEvents.length}`);
    await page.evaluate(() => window.__a2stop && window.__a2stop());
  } else {
    check('placement changes only annotation cells, the md import and editor scaffolding', false, 'onCodeChange not computed — probe unavailable');
    check('the editable-md import is injected once, not per annotation', false, 'probe unavailable');
    check('writes to annotation cells carry annotate provenance', false, 'probe unavailable');
  }

  // ---- 6. resize invariance ----------------------------------------------
  const preResize = { text: await highlightRect(page, a1.id), svg: await svgScreenPoint(page, 50, 50) };
  await page.setViewportSize({ width: 900, height: 3000 });
  await page.waitForTimeout(1000);

  const gtAfter = await groundTruthRect(page, 'lazy dog');
  const hlAfter = await highlightRect(page, a1.id);
  check('text layout actually changed on resize',
    !near(gtAfter.left, gt1.left, 0.5) || !near(gtAfter.top, gt1.top, 0.5),
    `gt moved (${Math.round(gt1.left)},${Math.round(gt1.top)}) -> (${Math.round(gtAfter.left)},${Math.round(gtAfter.top)})`);
  check('text highlight follows the reflowed quote',
    hlAfter && near(hlAfter.left, gtAfter.left) && near(hlAfter.top, gtAfter.top),
    hlAfter && `hl(${Math.round(hlAfter.left)},${Math.round(hlAfter.top)}) gt(${Math.round(gtAfter.left)},${Math.round(gtAfter.top)})`);

  const svgAfter = await svgScreenPoint(page, 50, 50);
  const headPt = await page.evaluate((id) => {
    const h = document.querySelector(`[data-a2-head="${id}"]`);
    if (!h) return null;
    // points are layer-content coords; the svg's own rect is the layer origin in viewport
    const [x, y] = h.getAttribute('points').split(' ')[0].split(',').map(Number);
    const s = h.ownerSVGElement.getBoundingClientRect();
    return { x: x + s.left, y: y + s.top };
  }, a3.id);
  check('svg arrow tracks the CTM after resize',
    headPt && near(headPt.x, svgAfter.x, 3) && near(headPt.y, svgAfter.y, 3),
    headPt && `head(${Math.round(headPt.x)},${Math.round(headPt.y)}) ctm(${Math.round(svgAfter.x)},${Math.round(svgAfter.y)})`);
  check('svg screen point actually moved', !near(svgAfter.x, preResize.svg.x, 0.5));

  // ---- 7. the note is a cell ---------------------------------------------
  const noteName = `annotation_${a1.id}_note`;
  check('annotation record points at its note cell', a1.cell === noteName, a1.cell);
  check('note is its own cell in the annotated module', await api(page, `mod._scope.has(${JSON.stringify(noteName)})`));
  const bodyText = (id) => page.evaluate((i) => {
    const b = document.querySelector(`[data-a2-body="${i}"]`);
    return b ? b.textContent.trim() : null;
  }, id);
  check('default note renders as markdown in the box', (await bodyText(a1.id)) === 'note…', await bodyText(a1.id));

  const mdSrc = noteName + ' = md`a **rewritten** note`';
  await api(page, `store.setSource(${JSON.stringify(noteName)}, ${JSON.stringify(mdSrc)})`);
  await page.waitForTimeout(600);
  check('rewriting the note cell re-renders the box',
    (await bodyText(a1.id)) === 'a rewritten note', await bodyText(a1.id));
  check('markdown is really markdown (bold survives)',
    await page.evaluate((i) => !!document.querySelector(`[data-a2-body="${i}"] strong`), a1.id));

  // the note is a cell, so it does not have to be markdown
  const note2 = `annotation_${a2.id}_note`;
  await api(page, `store.setSource(${JSON.stringify(note2)}, ${JSON.stringify(note2 + ' = htl.html`<b data-notmd>not markdown</b>`')})`);
  await page.waitForTimeout(600);
  check('a note can be any cell, not just markdown',
    (await bodyText(a2.id)) === 'not markdown' &&
    await page.evaluate((i) => !!document.querySelector(`[data-a2-body="${i}"] [data-notmd]`), a2.id),
    await bodyText(a2.id));

  // the default note is editable-md: clicking it edits in place and rewrites its own cell
  await page.click(`[data-a2-body="${a1.id}"] p`);
  await page.waitForTimeout(700);
  check('clicking the note edits it in place',
    await page.evaluate((i) => !!document.querySelector(`[data-a2-body="${i}"] .ProseMirror`), a1.id));
  await page.keyboard.type(' plus typed text');
  await page.keyboard.press('Shift+Enter');
  await page.waitForTimeout(900);
  const editedSrc = await api(page, `mod._scope.get(${JSON.stringify(noteName)})._definition.toString()`);
  check('an in-place edit rewrites the note cell itself', /plus typed text/.test(editedSrc || ''),
    (editedSrc || '').replace(/\s+/g, ' ').slice(0, 80));

  await page.click(`[data-a2-edit="${a1.id}"]`);
  await page.waitForTimeout(1500);
  const ed = await page.evaluate((i) => {
    const h = document.querySelector(`[data-a2-editor="${i}"]`);
    if (!h || h.style.display === 'none') return null;
    const cm = h.querySelector('.cm-content, textarea');
    return { bytes: h.innerHTML.length, editable: !!cm, text: cm ? (cm.value || cm.textContent) : '' };
  }, a1.id);
  check('✎ opens an editor on the note cell', !!(ed && ed.editable && ed.bytes > 0),
    ed ? `${ed.bytes} bytes, editable=${ed.editable}` : 'editor host hidden');
  check('the editor shows the note source', !!(ed && /rewritten/.test(ed.text)),
    ed && ed.text.replace(/\s+/g, ' ').slice(0, 70));
  await page.click(`[data-a2-edit="${a1.id}"]`);
  await page.waitForTimeout(500);
  check('✎ closes the editor again',
    await page.evaluate((i) => document.querySelector(`[data-a2-editor="${i}"]`).style.display === 'none', a1.id));

  // ---- 8. an anchor that stops resolving slides down the ladder -----------
  const cellTop = await page.evaluate(() => {
    const c = document.querySelector('.observablehq[cell="demoText"]');
    const r = c.getBoundingClientRect();
    return { top: r.top, left: r.left };
  });
  await api(page, `store.patch(${JSON.stringify(a2.id)}, {anchor: Object.assign({}, store.get(${JSON.stringify(a2.id)}).anchor, {quote: {prefix: "", exact: "zzz-not-present", suffix: ""}})})`);
  await page.waitForTimeout(600);
  const drift = await api(page, `(() => { const r = A.resolve(store.get(${JSON.stringify(a2.id)}).anchor);
    return {adrift: r && r.adrift, rung: r && r.rung, x: r && r.x, y: r && r.y}; })()`);
  check('an unresolvable anchor is not lost — it snaps to the top of its cell',
    drift && drift.adrift === true && drift.rung === 'cell' &&
      near(drift.y, cellTop.top + 8, 4) && near(drift.x, cellTop.left + 12, 4),
    JSON.stringify(drift) + ' cell ' + JSON.stringify(cellTop));
  check('the adrift box is still painted', !!(await page.evaluate((id) =>
    document.querySelector(`[data-ann-id="${id}"]`), a2.id)));
  check('the adrift box says so and turns amber', await page.evaluate((id) => {
    const b = document.querySelector(`[data-ann-id="${id}"]`);
    return /adrift/.test(b.textContent) && /180, 83, 9|#b45309/.test(b.style.borderColor + getComputedStyle(b).borderColor);
  }, a2.id), await page.evaluate((id) => document.querySelector(`[data-ann-id="${id}"]`).textContent.slice(0, 40), a2.id));
  check('the layer counts it as adrift, with no orphan rail',
    /1 adrift/.test(await api(page, 'layer.textContent')) &&
      (await page.evaluate(() => !document.querySelector('[data-a2-orphans]'))),
    await api(page, 'layer.textContent'));
  check('adrift is not deleted', await api(page, `!!store.get(${JSON.stringify(a2.id)})`));

  // no cell either: falls through to the pane, then to the page
  const noCell = await api(page, `(() => { const an = Object.assign({}, store.get(${JSON.stringify(a2.id)}).anchor,
      {pid: "no-such-pid", cell: "no-such-cell", region: "cell"});
    const r = A.resolve(an); return {adrift: r && r.adrift, rung: r && r.rung, x: r && r.x, y: r && r.y}; })()`);
  check('no cell to fall back to — it lands at the top of the pane',
    noCell && noCell.adrift === true && noCell.rung === 'pane', JSON.stringify(noCell));
  const noPane = await api(page, `(() => { const an = Object.assign({}, store.get(${JSON.stringify(a2.id)}).anchor,
      {pid: "no-such-pid", cell: "no-such-cell", module: "@nobody/no-such-module"});
    const r = A.resolve(an); return {adrift: r && r.adrift, rung: r && r.rung, x: r && r.x, y: r && r.y}; })()`);
  check('nothing left to hold it — it lands at the top of the page, never lost',
    noPane && noPane.adrift === true && noPane.rung === 'page' && noPane.x === 12 && noPane.y === 12,
    JSON.stringify(noPane));
  await api(page, `store.patch(${JSON.stringify(a2.id)}, {anchor: ${JSON.stringify(a2.anchor)}})`);
  await page.waitForTimeout(600);
  check('restored anchor resolves again', !!(await highlightRect(page, a2.id)));

  // ---- 8b. the anchor is re-selectable ------------------------------------
  // §6 left the viewport short; a real drag needs the demo prose on screen.
  await page.setViewportSize({ width: 1300, height: 4600 });
  await page.waitForTimeout(800);
  // Park the other boxes off-screen so a real drag-select cannot hit one.
  for (const a of [a1, a2, a3]) {
    await api(page, `store.patch(${JSON.stringify(a.id)}, {box: {dx: 0, dy: -9999, w: 200}})`);
  }
  await api(page, `store.patch(${JSON.stringify(a4.id)}, {box: {dx: 200, dy: 60, w: 200}})`);
  await page.waitForTimeout(500);

  await page.click(`[data-ann-id="${a4.id}"] [title^="Click to pick"]`);
  await page.waitForTimeout(300);
  check('⌖ click arms re-anchor mode',
    await api(page, '/re-anchoring/.test(layer.textContent)'), await api(page, 'layer.textContent'));

  const gtPhrase = await groundTruthRect(page, 'disambiguate');
  await page.mouse.move(gtPhrase.left + 1, gtPhrase.top + gtPhrase.height / 2);
  await page.mouse.down();
  await page.mouse.move(gtPhrase.left + gtPhrase.width - 1, gtPhrase.top + gtPhrase.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const reText = await api(page, `store.get(${JSON.stringify(a4.id)})`);
  check('a drag-selection re-anchors the annotation to text',
    reText && reText.anchor.surface === 'text' && /disambiguate/.test(reText.anchor.quote.exact),
    reText && `${reText.anchor.surface} "${reText.anchor.quote && reText.anchor.quote.exact}"`);
  check('the re-anchored annotation keeps its note cell', reText && reText.cell === `annotation_${a4.id}_note`);
  check('re-anchor disarms after one pick', !(await api(page, 'layer.isArmed()')));
  check('no floating annotate button is painted over the document',
    await page.evaluate(() => !document.querySelector('[data-a2-add]')));

  // and back to a point surface
  await page.click(`[data-ann-id="${a4.id}"] [title^="Click to pick"]`);
  await page.waitForTimeout(300);
  const rectPt = await svgScreenPoint(page, 145, 50); // the orange square
  await page.mouse.click(rectPt.x, rectPt.y);
  await page.waitForTimeout(600);
  const rePoint = await api(page, `store.get(${JSON.stringify(a4.id)})`);
  check('a click re-anchors the annotation to svg user space',
    rePoint && rePoint.anchor.surface === 'svg' && near(rePoint.anchor.svg.x, 145, 2) && near(rePoint.anchor.svg.y, 50, 2),
    rePoint && rePoint.anchor.svg && `(${rePoint.anchor.svg.x.toFixed(1)},${rePoint.anchor.svg.y.toFixed(1)})`);

  for (const a of [a1, a2, a3]) {
    await api(page, `store.patch(${JSON.stringify(a.id)}, {box: ${JSON.stringify(a.box || { dx: 260, dy: -20, w: 200 })}})`);
  }
  await page.waitForTimeout(500);

  // ---- 9. delete ----------------------------------------------------------
  await page.locator(`[data-ann-id="${a4.id}"] button`).nth(2).click();
  await page.waitForTimeout(500);
  check('delete removes the variable', !(await api(page, `mod._scope.has("annotation_${a4.id}")`)));
  check('delete removes the note cell too', !(await api(page, `mod._scope.has("annotation_${a4.id}_note")`)));
  check('the record cell is gone from the graph too',
    !(await api(page, `[...mod._scope.get("annotation")._outputs].some(v => v._name === "annotation_${a4.id}")`)));

  // ---- 10. toggle teardown ------------------------------------------------
  await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    for (const v of rt._variables) if (v._name === 'viewof annotationsEnabled' && v._module === mod) {
      v._value.value = false;
      v._value.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(600);
  check('toggle off tears the layer down',
    await page.evaluate(() => !document.querySelector('[data-a2-root]') && !document.querySelector('[data-a2-layer]')));
  await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    for (const v of rt._variables) if (v._name === 'viewof annotationsEnabled' && v._module === mod) {
      v._value.value = true;
      v._value.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(800);
  check('toggle on rebuilds exactly one layer',
    (await page.evaluate(() => document.querySelectorAll('[data-a2-root]').length)) === 1);

  // ---- 10b. boxes live in pane-content space -------------------------------
  // No cull: a box scrolls and clips with its pane, stays in the DOM off-screen (so the
  // runtime's visibility gate keeps its observer node), and an open editor survives.
  const paneBox = await page.evaluate((id) => {
    const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
    const box = document.querySelector(`[data-ann-id="${id}"]`);
    return { inPane: !!(box && pane.contains(box)), inLayer: !!(box && box.closest('[data-a2-layer]')) };
  }, a1.id);
  check('box is mounted inside its pane, in the annotation layer', paneBox.inPane && paneBox.inLayer,
    JSON.stringify(paneBox));

  await page.setViewportSize({ width: 900, height: 600 }); // now the pane can actually scroll
  await page.waitForTimeout(600);
  const scrollMove = await page.evaluate((id) => {
    const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
    const box = document.querySelector(`[data-ann-id="${id}"]`);
    const t0 = box.getBoundingClientRect().top;
    const s0 = pane.scrollTop;
    pane.scrollTop = s0 + 150;
    const applied = pane.scrollTop - s0; // the pane clamps; measure what really happened
    const t1 = box.getBoundingClientRect().top;
    pane.scrollTop = s0;
    return { moved: t0 - t1, applied };
  }, a1.id);
  check('box scrolls with the pane content (no JS involved)',
    scrollMove.applied > 50 && near(scrollMove.moved, scrollMove.applied, 1), JSON.stringify(scrollMove));
  await page.click(`[data-a2-edit="${a1.id}"]`); // playwright scrolls it into view
  await page.waitForTimeout(1500);
  const offscreen = await page.evaluate((id) => {
    const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
    pane.scrollTop = 0; // the quote (and box) now far below the fold
    const box = document.querySelector(`[data-ann-id="${id}"]`);
    const ed = document.querySelector(`[data-a2-editor="${id}"]`);
    const body = document.querySelector(`[data-a2-body="${id}"]`);
    const rt = window.__ojs_runtime;
    const home = rt.mains.get('@tomlarkworthy/annotate');
    const v = home._scope.get(`annotation_${id}_note`);
    return {
      boxStillMounted: !!box,
      belowPaneFold: box ? box.getBoundingClientRect().top > pane.getBoundingClientRect().bottom : null,
      editorStillOpen: ed ? ed.style.display !== 'none' : null,
      observerNodeIsBody: !!(v && v._observer && body && v._observer._node === body)
    };
  }, a1.id);
  check('an off-screen box stays in the DOM, clipped by its pane',
    offscreen.boxStillMounted && offscreen.belowPaneFold === true, JSON.stringify(offscreen));
  check("the note keeps its observer node while off-screen (runtime's visibility gate intact)",
    offscreen.observerNodeIsBody);
  check('an open editor survives scrolling out of view', offscreen.editorStillOpen === true);
  await page.click(`[data-a2-edit="${a1.id}"]`); // close it again (auto-scrolls back)
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 900, height: 3000 });
  await page.waitForTimeout(1000);

  // ---- 11. export round-trip across a real reload -------------------------
  const exported = await page.evaluate(async () => {
    const rt = window.__ojs_runtime;
    let fn = null;
    for (const v of rt._variables) if (v._name === 'exportModuleJS' && v._value) { fn = v._value; break; }
    const res = await fn('@tomlarkworthy/annotate');
    return res.source;
  });
  check('export contains the annotation cells', /annotation_index/.test(exported) && /annotation_a2/.test(exported),
    `${exported.length} bytes`);
  check('export contains the note cells', /annotation_a2\w+_note/.test(exported));
  check('export carries the editable-md binding for md notes',
    /module @tomlarkworthy\/editable-md/.test(exported));
  check('export has closing-script-safe JSON', !/<\/script/i.test(exported));

  const html = readFileSync(NOTEBOOK, 'utf8');
  const re = MODULE_RE;
  if (!re.test(html)) throw new Error('module block not found for splice');
  writeFileSync(NOTEBOOK, html.replace(re, (_a, o, _m, c) => o + '\n' + exported.replace(/^\n+|\n+$/g, '') + '\n' + c));

  const expectCells = await api(page, 'store.all().map(a => a.cell)');
  await page.evaluate(() => { window.__preReloadMarker = true; });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page);
  check('reload really re-executed the document',
    await page.evaluate(() => window.__preReloadMarker === undefined));

  const restored = await api(page, 'store.all()');
  check('annotations restore from their cells after reload',
    Array.isArray(restored) && restored.length === expectCells.length,
    `${restored && restored.length}/${expectCells.length}`);
  const restoredBodies = await page.evaluate(() =>
    [...document.querySelectorAll('[data-a2-body]')].map((b) => b.textContent.trim()));
  check('the markdown note re-renders after reload (md binding survived export)',
    restoredBodies.some((t) => /plus typed text/.test(t)), restoredBodies.join(' | ').slice(0, 90));
  check('the non-markdown note re-renders after reload',
    restoredBodies.includes('not markdown'), restoredBodies.join(' | ').slice(0, 90));
  const hlRestored = restored.length ? await highlightRect(page, restored[0].id) : null;
  const gtRestored = await groundTruthRect(page, 'lazy dog');
  check('restored text anchor still resolves onto the quote',
    hlRestored && near(hlRestored.left, gtRestored.left) && near(hlRestored.top, gtRestored.top));

  // ---- 12. cells with no name, and content mounted beside a cell ----------
  // The header is the module's first cell: unnamed, so its div carries no `cell`
  // attribute. It is anchorable through the variable's persistent id instead.
  const hdr = await page.evaluate(() => {
    const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
    const div = [...pane.querySelectorAll('.observablehq')].find((d) => !d.getAttribute('cell'));
    if (!div) return null;
    const w = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const i = w.currentNode.nodeValue.indexOf('Annotate');
      if (i >= 0) {
        const r = document.createRange();
        r.setStart(w.currentNode, i); r.setEnd(w.currentNode, i + 8);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        document.dispatchEvent(new Event('selectionchange'));
        return { hasCellAttr: !!div.getAttribute('cell') };
      }
    }
    return null;
  });
  await page.waitForTimeout(500);
  check('the header really is an unnamed cell (no `cell` attribute)', hdr && hdr.hasCellAttr === false);
  await page.click('[data-a2-chip]');
  await page.waitForTimeout(700);
  const aHdr = await api(page, 'store.all()[store.all().length - 1]');
  check('an unnamed cell can be annotated', aHdr && aHdr.anchor.quote.exact === 'Annotate',
    aHdr && aHdr.anchor.quote && aHdr.anchor.quote.exact);
  check('the anchor identifies it by pid, having no name to use',
    aHdr && aHdr.anchor.cell === null && !!aHdr.anchor.pid, aHdr && JSON.stringify({cell: aHdr.anchor.cell, pid: aHdr.anchor.pid}));
  const gtHdr = await page.evaluate(() => {
    const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
    const div = [...pane.querySelectorAll('.observablehq')].find((d) => !d.getAttribute('cell'));
    const w = document.createTreeWalker(div, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const i = w.currentNode.nodeValue.indexOf('Annotate');
      if (i >= 0) {
        const r = document.createRange();
        r.setStart(w.currentNode, i); r.setEnd(w.currentNode, i + 8);
        const b = r.getBoundingClientRect();
        getSelection().removeAllRanges();
        return { left: b.left, top: b.top };
      }
    }
    return null;
  });
  const hlHdr = await highlightRect(page, aHdr.id);
  check('the unnamed-cell highlight lands on its quote',
    hlHdr && gtHdr && near(hlHdr.left, gtHdr.left) && near(hlHdr.top, gtHdr.top),
    hlHdr && gtHdr && `hl(${Math.round(hlHdr.left)},${Math.round(hlHdr.top)}) gt(${Math.round(gtHdr.left)},${Math.round(gtHdr.top)})`);

  // editor-5 mounts an editor with `div.after(editor)` — a sibling of the cell div, so
  // nothing inside it has a cell ancestor. Mount a real editor the same way and annotate it.
  const edMount = await page.evaluate(async () => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    let mk = null;
    for (const v of rt._variables) if (v._name === 'cellEditor' && v._module === mod) mk = v._value;
    if (typeof mk !== 'function') return { err: 'cellEditor unavailable' };
    const cellEditor = await mk();
    const div = document.querySelector('.observablehq[cell="demoText"]');
    const variable = div.variable || [...rt._variables].find((v) => v._observer && v._observer._node === div);
    const ed = cellEditor(variable, { pinned: true }); // pinned mounts CodeMirror straight away
    ed.setAttribute('data-a2-test-editor', '');
    div.after(ed);
    for (let i = 0; i < 10 && !ed.querySelector('.cm-content'); i++) await new Promise((r) => setTimeout(r, 400));
    const cm = ed.querySelector('.cm-content');
    return { mounted: !!cm, connected: ed.isConnected,
             insideACellDiv: cm ? !!cm.closest('.observablehq') : null };
  });
  check('an editor-5 editor mounts beside the cell div, outside every cell div',
    edMount.mounted === true && edMount.connected === true && edMount.insideACellDiv === false,
    JSON.stringify(edMount));
  const edSel = await page.evaluate(() => {
    const cm = document.querySelector('[data-a2-test-editor] .cm-content');
    if (!cm) return null;
    const w = document.createTreeWalker(cm, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const t = w.currentNode.nodeValue;
      if (t.trim().length > 5) {
        const r = document.createRange();
        r.setStart(w.currentNode, 0); r.setEnd(w.currentNode, Math.min(8, t.length));
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        document.dispatchEvent(new Event('selectionchange'));
        return t.slice(0, 8);
      }
    }
    return null;
  });
  await page.waitForTimeout(500);
  check('editor text can be selected', !!edSel, edSel);
  await page.click('[data-a2-chip]');
  await page.waitForTimeout(700);
  const aEd = await api(page, 'store.all()[store.all().length - 1]');
  check('editor-5 content can be annotated', aEd && aEd.anchor.quote.exact === edSel,
    aEd && aEd.anchor.quote && aEd.anchor.quote.exact);
  check('the anchor records the region beside the cell, and which cell that is',
    aEd && aEd.anchor.region === 'after' && aEd.anchor.cell === 'demoText',
    aEd && JSON.stringify({region: aEd.anchor.region, cell: aEd.anchor.cell}));
  check('the editor annotation resolves (it is not an orphan)',
    !!(await highlightRect(page, aEd.id)));

  const leader = await page.evaluate((id) => {
    const l = document.querySelector(`[data-a2-line="${id}"]`);
    const h = document.querySelector(`[data-a2-head="${id}"]`);
    return l && { dash: l.getAttribute('stroke-dasharray'), cap: l.getAttribute('stroke-linecap'),
                  alpha: parseFloat(l.getAttribute('stroke-opacity')),
                  headAlpha: parseFloat(h && h.getAttribute('fill-opacity')),
                  headFill: h && h.getAttribute('fill'), headDash: h && h.getAttribute('stroke-dasharray') };
  }, aEd.id);
  check('the leader line is dotted, so it occludes less of the content it crosses',
    leader && /^[\d.]+ [\d.]+$/.test(leader.dash || '') && leader.cap === 'round', JSON.stringify(leader));
  check('the arrowhead stays solid', leader && !!leader.headFill && !leader.headDash);
  check('the leader is translucent, so text under it stays readable',
    leader && leader.alpha > 0 && leader.alpha < 1 && leader.headAlpha > leader.alpha,
    leader && `line ${leader.alpha} head ${leader.headAlpha}`);
  // aEd is the one just placed, so it is the selected one; a1 is not.
  const restAlpha = await page.evaluate((id) => {
    const l = document.querySelector(`[data-a2-line="${id}"]`);
    return l ? parseFloat(l.getAttribute('stroke-opacity')) : null;
  }, a1.id);
  check('the selected annotation\'s leader comes forward, the rest stay faint',
    restAlpha !== null && restAlpha < leader.alpha, `unselected ${restAlpha} vs selected ${leader.alpha}`);

  // ---- 13. annotations authored as cells, without the store --------------
  // The point of the `annotation()` wrapper: anything that can define a cell can make an
  // annotation, and the runtime's dependency graph is the index.
  const before13 = (await api(page, 'store.all()')).length;
  await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    // flat spec, no surface, no box, no id — exactly what a person or an agent would type
    mod.define('annotation_agent_a', ['annotation'], (annotation) =>
      annotation({ cell: 'demoText', quote: { exact: 'quick brown fox' },
                   author: 'agent', severity: 'warn' }));
    // and one that is not even named annotation_*
    mod.define('agentNoteB', ['annotation'], (annotation) =>
      annotation({ cell: 'demoSvg', svg: { x: 50, y: 50 } }));
  });
  await page.waitForTimeout(2500);
  const authored = await api(page, 'store.all()');
  const agentA = authored.find((a) => a.varName === 'annotation_agent_a');
  const agentB = authored.find((a) => a.varName === 'agentNoteB');
  check('a hand-defined cell becomes an annotation with no store call',
    !!agentA && authored.length === before13 + 2, `${before13} -> ${authored.length}`);
  check('the id comes off the cell name, not the record', agentA && agentA.id === 'agent_a', agentA && agentA.id);
  check('a cell not named annotation_* still counts — the graph found it',
    !!agentB && agentB.id === 'agentNoteB', agentB && agentB.id);
  check('the surface is inferred from the keys present',
    agentA && agentA.anchor.surface === 'text' && agentB && agentB.anchor.surface === 'svg',
    agentA && agentB && `${agentA.anchor.surface} / ${agentB.anchor.surface}`);
  check('defaults are filled in by the wrapper, not required of the author',
    agentA && agentA.box && agentA.box.w === 240 && agentA.state === 'open', agentA && JSON.stringify(agentA.box));
  check('arbitrary metadata rides along',
    agentA && agentA.author === 'agent' && agentA.severity === 'warn');
  check('an authored annotation resolves onto its quote',
    !!(await page.evaluate((id) => {
      const r = document.querySelector(`[data-a2-hl="${id}"]`) || document.querySelector(`[data-ann-id="${id}"]`);
      return !!r;
    }, agentA.id)));
  check('it is painted, with a default note minted for it',
    /note/.test(await page.evaluate((id) => {
      const b = document.querySelector(`[data-a2-body="${id}"]`);
      return b ? b.textContent : '';
    }, agentA.id) || ''));

  // authored from a *different* module, through the import bridge
  await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    const a2 = rt.mains.get('@tomlarkworthy/annotate');
    const other = rt.mains.get('@tomlarkworthy/claude-code-pairing');
    other.define('module @tomlarkworthy/annotate', [], () => a2);
    other.define('annotation', ['module @tomlarkworthy/annotate', '@variable'], (m, v) => v.import('annotation', m));
    other.define('annotation_remote_c', ['annotation'], (annotation) =>
      annotation({ module: '@tomlarkworthy/claude-code-pairing', cell: 'cc_chat' }));
  });
  await page.waitForTimeout(2500);
  const remote = (await api(page, 'store.all()')).find((a) => a.varName === 'annotation_remote_c');
  check('discovery follows the import bridge into another module',
    !!remote && remote.home === '@tomlarkworthy/claude-code-pairing',
    remote && remote.home);

  // deleting the cell is deleting the annotation — no bookkeeping to keep in step
  await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    mod._scope.get('annotation_agent_a').delete();
  });
  await page.waitForTimeout(2500);
  const afterDelete = await api(page, 'store.all()');
  check('deleting the cell removes the annotation',
    !afterDelete.some((a) => a.varName === 'annotation_agent_a'),
    `${authored.length} -> ${afterDelete.length}`);
  check('its box left the page too',
    await page.evaluate((id) => !document.querySelector(`[data-ann-id="${id}"]`), agentA.id));

  // ---- 14. surfaces are pluggable coordinate spaces -----------------------
  // A chart is annotated in *data* space: the note stays on the datum, not on the pixel.
  const datumAt = (i) => page.evaluate((n) => {
    const svg = document.querySelector('.observablehq[cell="demoPlot"] svg');
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    let series = null;
    for (const v of rt._variables) if (v._name === 'demoSeries' && v._module === mod) series = v._value;
    const d = series[n];
    const px = svg.scale('x').apply(d.date), py = svg.scale('y').apply(d.value);
    const p = new DOMPoint(px, py).matrixTransform(svg.getScreenCTM());
    return { x: p.x, y: p.y, date: d.date.toISOString(), value: d.value };
  }, i);

  // §6 shrank the viewport and left it there; the plot sits below that fold.
  await page.setViewportSize({ width: 1300, height: 4600 });
  await page.waitForTimeout(800);

  const datum = await datumAt(10);
  check('the demo plot is on the page with invertible scales',
    !!datum && Number.isFinite(datum.x), datum && `datum 10 at (${datum.x.toFixed(0)},${datum.y.toFixed(0)})`);
  await api(page, 'layer.arm()');
  await page.mouse.click(datum.x, datum.y);
  await page.waitForTimeout(600);
  const plotRecs = (await api(page, 'store.all()')).filter((a) => a.anchor.surface === 'plot');
  const aPlot = plotRecs[plotRecs.length - 1];
  check('clicking a chart anchors in data space, not pixels',
    !!aPlot && !!aPlot.anchor.data, aPlot && JSON.stringify(aPlot.anchor.data));
  check('the click inverted through the scales back to the datum',
    aPlot && Math.abs(new Date(aPlot.anchor.data.x) - new Date(datum.date)) < 3 * 86400000 &&
      near(aPlot.anchor.data.y, datum.value, 4),
    aPlot && `${aPlot.anchor.data.x} / ${aPlot.anchor.data.y && aPlot.anchor.data.y.toFixed(1)} vs ${datum.date} / ${datum.value}`);
  const plotRes1 = await api(page, `A.resolve(store.get(${JSON.stringify(aPlot.id)}).anchor)`);
  check('the arrow tip lands on the datum',
    plotRes1 && plotRes1.rung === 'plot' && !plotRes1.adrift &&
      near(plotRes1.x, datum.x, 3) && near(plotRes1.y, datum.y, 3),
    plotRes1 && `(${plotRes1.x.toFixed(0)},${plotRes1.y.toFixed(0)}) rung ${plotRes1.rung}`);

  // Re-render the chart at a different width: a pixel fraction would slide off the datum,
  // data coordinates do not.
  await page.evaluate(() => {
    const el = document.querySelector('.observablehq[cell="viewof demoPlotWidth"] input[type="range"]')
      || document.querySelector('.observablehq[cell="viewof demoPlotWidth"] input');
    el.value = '860';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(1200);
  const datum2 = await datumAt(10);
  check('the plot really re-rendered at a new width',
    Math.abs(datum2.x - datum.x) > 40, `${datum.x.toFixed(0)} -> ${datum2.x.toFixed(0)}`);
  const aPlot2 = await api(page, `store.get(${JSON.stringify(aPlot.id)})`);
  check('the stored anchor did not move — it is in data units',
    aPlot2 && aPlot2.anchor.data.x === aPlot.anchor.data.x && aPlot2.anchor.data.y === aPlot.anchor.data.y);
  const plotRes2 = await api(page, `A.resolve(store.get(${JSON.stringify(aPlot.id)}).anchor)`);
  check('and it still points at the same datum after the re-render',
    plotRes2 && !plotRes2.adrift && near(plotRes2.x, datum2.x, 3) && near(plotRes2.y, datum2.y, 3),
    plotRes2 && `(${plotRes2.x.toFixed(0)},${plotRes2.y.toFixed(0)}) vs datum (${datum2.x.toFixed(0)},${datum2.y.toFixed(0)})`);

  // A surface this build does not know about must not be painted at a plausible-looking
  // fraction — it goes adrift, honestly.
  const unknown = await api(page,
    `A.resolve({module: "@tomlarkworthy/annotate", cell: "demoText", surface: "hologram", frac: {fx: 0.5, fy: 0.5}})`);
  check('an unknown surface is adrift, not silently painted',
    unknown && unknown.adrift === true && unknown.rung === 'cell' && /unknown surface/.test(unknown.why || ''),
    unknown && `rung ${unknown.rung} adrift ${unknown.adrift} why ${unknown.why}`);

  // ...and a new space can be contributed as a cell, from any module.
  await page.evaluate(() => {
    const rt = window.__ojs_runtime;
    const mod = rt.mains.get('@tomlarkworthy/annotate');
    mod.define('demoCornerSurface', ['surface'], (surface) => surface({
      name: 'corner', order: 5,
      find: (loc) => loc.hostNode,
      place: (el) => { const r = el.getBoundingClientRect(); return { kind: 'point', x: r.right, y: r.bottom }; }
    }));
    mod.define('annotation_corner_x', ['annotation'], (annotation) =>
      annotation({ cell: 'demoText', surface: 'corner' }));
  });
  await page.waitForTimeout(2500);
  const cornerRes = await api(page, `A.resolve({module: "@tomlarkworthy/annotate", cell: "demoText", surface: "corner"})`);
  const cornerTruth = await page.evaluate(() => {
    const r = document.querySelector('.observablehq[cell="demoText"]').getBoundingClientRect();
    return { x: r.right, y: r.bottom };
  });
  check('a surface contributed as a cell is registered and used',
    cornerRes && !cornerRes.adrift && near(cornerRes.x, cornerTruth.x, 2) && near(cornerRes.y, cornerTruth.y, 2),
    cornerRes && `(${cornerRes.x.toFixed(0)},${cornerRes.y.toFixed(0)}) vs (${cornerTruth.x.toFixed(0)},${cornerTruth.y.toFixed(0)})`);
  check('an annotation on that surface is discovered like any other',
    (await api(page, 'store.all()')).some((a) => a.varName === 'annotation_corner_x'));

  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) {
  check('harness completed', false, e.message);
} finally {
  await browser.close();
  restoreDataBlock();
}

const failed = results.filter((r) => !r.pass);
process.stdout.write(`\n${results.length - failed.length}/${results.length} passed\n`);
process.exit(failed.length ? 1 : 0);
