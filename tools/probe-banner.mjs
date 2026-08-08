// The quickstart title is an svg-lens drawing. Two claims to check, and the second is the one that
// rots quietly:
//
//  1. Structure — the banner renders, and the hidden <h1> beside it still gives the module its
//     title. @tomlarkworthy/modules takes the title off the FIRST cell the module defines, pulling
//     an h1 out of whatever that cell returns; an <svg> has none to give, hence the separate cell.
//  2. Mutability — dragging a shape rewrites the CELL SOURCE, not just the DOM. svg-lens resolves
//     its cell by matching the node against every variable's value, so wrapping the svg in a div
//     would leave it looking perfect and silently un-editable.
//  3. The disk is drawn in strokes that inherit the wordmark's colour. It was briefly imported from
//     exporter-3 through an <image href>, which cannot be restyled — an <image> is an isolated
//     document, so currentColor never reaches it and a fill has to be baked in per theme.
//
// Note a shape is only grabbable over what it actually paints unless it carries pointer-events="all"
// — that is SVG hit-testing, not svg-lens, and it is why the <image> sets it.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2] || 'lopecode/notebooks/quick_start.html');
const results = [];
const check = (n, pass, d = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
p.on('pageerror', (e) => console.log('  [pageerror]', String(e).slice(0, 200)));
await p.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(24000);

const r = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const h1 = document.querySelector('.lp2-pane h1');
  const banner = val('heading');
  const mod = [...(val('currentModules') || new Map()).values()]
    .find((m) => m.name === '@tomlarkworthy/blank-notebook');
  const box = banner && banner.getBoundingClientRect ? banner.getBoundingClientRect() : null;
  return {
    h1Text: h1 ? h1.textContent.trim() : null,
    h1Hidden: h1 ? getComputedStyle(h1).display === 'none' : null,
    moduleTitle: mod ? mod.title : null,
    bannerTag: banner && banner.tagName,
    bannerBox: box ? `${Math.round(box.width)}x${Math.round(box.height)}` : null,
    bannerVisible: box ? box.width > 200 && box.height > 40 : false,
    ownedByACell: [...rt._variables].some((v) => v._value === banner),
    animated: !!(banner && banner.querySelector && banner.querySelector('animateTransform')),
    // QUICKSTART is right-aligned to the wordmark. The wordmark's width comes from whatever
    // monospace font resolved, so this is the assertion that catches a font that measures
    // differently — the two right edges have to land on each other, not near each other.
    textRights: [...(banner ? banner.querySelectorAll('text') : [])]
      .filter((t) => /lopecode|QUICKSTART/.test(t.textContent))
      .map((t) => ({ s: t.textContent, right: +(t.getBBox().x + t.getBBox().width).toFixed(1) })),
    // The mark is drawn, and must stay the wordmark's colour on every theme — a baked hex would
    // look right on the theme it was picked against and wrong on the other twelve.
    markStroke: (() => {
      const g = [...(banner ? banner.querySelectorAll('g') : [])]
        .find((n) => n.querySelector('circle'));
      if (!g) return null;
      const c = getComputedStyle(g.querySelector('circle'));
      // Colour alone is not enough: a group `opacity` greys the mark without changing its stroke,
      // which is exactly how it read grey next to a full-strength wordmark.
      const dim = +getComputedStyle(g).opacity * +c.opacity * +c.strokeOpacity;
      return { stroke: c.stroke, text: getComputedStyle(banner.querySelector('text')).fill, width: c.strokeWidth, dim };
    })(),
    markDrawn: (() => {
      const g = [...(banner ? banner.querySelectorAll('g') : [])]
        .find((n) => n.querySelector('circle'));
      if (!g) return false;
      const r = g.getBoundingClientRect();
      return r.width > 30 && r.height > 30;
    })(),
  };
});
check('the hidden h1 still carries the title', r.h1Text === 'Lopecode Quickstart' && r.h1Hidden === true,
  `text=${JSON.stringify(r.h1Text)} hidden=${r.h1Hidden}`);
check('and the module title is sniffed from it', r.moduleTitle === 'Lopecode Quickstart', String(r.moduleTitle));
check('the banner is a bare <svg> that renders', r.bannerTag === 'svg' && r.bannerVisible, `${r.bannerTag} ${r.bannerBox}`);
check('svg-lens can resolve the cell from the node', r.ownedByACell);
check('the sweep animation survived', r.animated);
const rights = r.textRights.map((t) => t.right);
check('QUICKSTART is right-aligned with the wordmark',
  rights.length === 2 && Math.abs(rights[0] - rights[1]) <= 1.5,
  r.textRights.map((t) => `${t.s}@${t.right}`).join(' vs '));
check('the mark is the wordmark\'s colour, undimmed',
  !!r.markStroke && r.markStroke.stroke === r.markStroke.text && r.markStroke.dim === 1,
  r.markStroke ? `stroke=${r.markStroke.stroke} text=${r.markStroke.text} width=${r.markStroke.width} opacity=${r.markStroke.dim}` : 'no mark');
check('and it renders', r.markDrawn);

// Shoot before the drags: they really do move the banner, so a screenshot after is of the wreckage.
await p.screenshot({ path: 'tools/screenshots/banner.png', clip: { x: 0, y: 0, width: 1000, height: 260 } });

// Drag each kind of shape and require the cell's own definition text to change. Cold drags: a click
// first selects the shape, and the drag after that is read as a handle gesture instead of a move.
const src = () => p.evaluate(() => {
  const v = [...window.__ojs_runtime._variables].find((x) => x._name === 'heading');
  return v ? v._definition.toString() : null;
});
for (const sel of ['circle', 'path', 'text']) {
  const before = await src();
  const at = await p.evaluate((s) => {
    const n = [...window.__ojs_runtime._variables].find((v) => v._name === 'heading')._value;
    const el = n.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, sel);
  if (!at) { check(`dragging a <${sel}> rewrites the source`, false, 'no such element'); continue; }
  await p.mouse.move(at.x, at.y);
  await p.mouse.down();
  for (let i = 1; i <= 6; i++) await p.mouse.move(at.x + i * 4, at.y + i * 3);
  await p.mouse.up();
  await p.waitForTimeout(2000);
  const after = await src();
  check(`dragging a <${sel}> rewrites the source`, after !== before);
}

await b.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
