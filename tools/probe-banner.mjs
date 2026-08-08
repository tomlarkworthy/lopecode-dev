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
    // Adopted into the table's corner. The move is the whole point of the layout, and it has to
    // survive a gesture — the banner is a new node after every drag and must be re-adopted.
    inCorner: banner?.parentElement?.classList.contains('qs-brand') ?? false,
    cornerBox: (() => {
      const th = document.querySelector('.qs thead th.qs-brand');
      if (!th || !banner) return null;
      const t = th.getBoundingClientRect(), b = banner.getBoundingClientRect();
      return { th: [Math.round(t.width), Math.round(t.height)], banner: [Math.round(b.width), Math.round(b.height)],
        fits: b.width <= t.width + 1 && b.height <= t.height + 1 };
    })(),
    // Nothing may be left standing where the banner used to be — neither a blank band nor, once the
    // inspector gives up on a node it no longer owns, a printed `heading = SVGSVGElement {…}`.
    leftovers: [...document.querySelectorAll('.lp2-pane .observablehq')]
      .filter((n) => n.getBoundingClientRect().height > 0 && !n.contains(banner))
      .filter((n) => !n.children.length || /SVGSVGElement/.test(n.textContent))
      .map((n) => (n.textContent || '(blank)').slice(0, 40)),
    // Measured against the banner, not in pixels: the banner scales to whatever column holds it,
    // so an absolute floor only says how wide that column happens to be today.
    markDrawn: (() => {
      const g = [...(banner ? banner.querySelectorAll('g') : [])]
        .find((n) => n.querySelector('circle'));
      if (!g || !banner) return null;
      const r = g.getBoundingClientRect(), b = banner.getBoundingClientRect();
      return { share: +(r.height / b.height).toFixed(2), box: [Math.round(r.width), Math.round(r.height)] };
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
check('and it renders at a sane size beside the wordmark',
  !!r.markDrawn && r.markDrawn.share > 0.3 && r.markDrawn.share < 0.8,
  r.markDrawn ? `${r.markDrawn.box.join('x')}, ${Math.round(r.markDrawn.share * 100)}% of the banner height` : 'no mark');
check('the banner sits in the table\'s corner and fits it',
  r.inCorner && r.cornerBox?.fits,
  r.cornerBox ? `th ${r.cornerBox.th.join('x')} banner ${r.cornerBox.banner.join('x')} inCorner=${r.inCorner}` : 'no corner');
check('and leaves nothing behind where it used to be',
  r.leftovers.length === 0, r.leftovers.join(' | ') || 'clean');

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

// A gesture replaces the banner node, so the corner has to re-adopt it or the title vanishes after
// the first drag — the failure this whole arrangement risks.
const readopted = await p.evaluate(() => {
  const n = [...window.__ojs_runtime._variables].find((v) => v._name === 'heading')._value;
  return { inCorner: n.parentElement?.classList.contains('qs-brand') ?? false, onScreen: n.getBoundingClientRect().width > 100 };
});
check('the corner re-adopts the banner after a gesture', readopted.inCorner && readopted.onScreen,
  JSON.stringify(readopted));

await b.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
