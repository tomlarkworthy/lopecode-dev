// Could an annotation anchor resolve on observablehq.com? Try each candidate rung against the
// live mirror: variable-name -> observer node, document-wide quote search, and the
// scroll/coordinate context the layer would have to paint into.
import { chromium } from 'playwright';

const URL = process.argv[2] || 'https://observablehq.com/@tomlarkworthy/annotate';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1200 } });
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(20000);

const frame = page.frames().find((f) => f.url().includes('observableusercontent.com'));
console.log(await frame.evaluate(() => {
  const rt = window.__ojs_runtime;
  const out = [];
  // The notebook's own module is whichever one defines a2Layer — Observable's runtime does not
  // name modules, and `_main` is not it.
  const home = ([...rt._variables].find((v) => v._name === 'a2Layer') || {})._module;
  const mine = [...rt._variables].filter((v) => v._module === home);
  out.push(`main module variables: ${mine.length}, with observer node: ${mine.filter((v) => v._observer && v._observer._node).length}`);

  // rung: name -> variable -> node
  for (const name of ['demoPlot', 'demoSvg', 'demoImage', 'demoVolatile', 'a2Layer', 'viewof demoPlotPan']) {
    const v = mine.find((x) => x._name === name);
    const n = v && v._observer && v._observer._node;
    out.push(`  name "${name}": var=${!!v} node=${n ? n.nodeName + '.' + (n.className || '') : 'none'} connected=${n ? n.isConnected : '-'}` +
      ` outermost=${n && n.parentElement ? n.parentElement.className : '-'}`);
  }

  // rung: document-wide quote search (what a TextQuoteSelector would do)
  const quotes = ['Annotate', 'A text anchor is a quote', 'not a position', 'Notes pinned to things'];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const chunks = []; let t;
  while ((t = walker.nextNode())) chunks.push(t);
  const full = chunks.map((c) => c.nodeValue).join('');
  for (const q of quotes) {
    const i = full.indexOf(q), j = full.indexOf(q, i + 1);
    out.push(`  quote ${JSON.stringify(q)}: ${i === -1 ? 'ABSENT' : 'found at ' + i + (j === -1 ? ' (unique)' : ' (also at ' + j + ')')}`);
  }

  // what the layer would paint into
  const root = document.querySelector('.observablehq-root');
  const panes = document.querySelectorAll('.lp2-pane[data-module]');
  out.push(`  lopepage panes: ${panes.length}; observablehq-root: ${root ? root.getBoundingClientRect().width + 'x' + Math.round(root.scrollHeight) : 'none'}`);
  out.push(`  scroller: documentElement scrollHeight=${document.documentElement.scrollHeight} body=${document.body.scrollHeight} innerHeight=${innerHeight}`);
  const layerRoot = document.querySelector('[data-a2-root]');
  out.push(`  a2 root: ${layerRoot ? layerRoot.parentElement.className + ' pos=' + getComputedStyle(layerRoot).position : 'none'}`);

  // does the store think it has records, and what do they resolve to?
  const g = (n) => { const v = mine.find((x) => x._name === n); return v && v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  if (store && A) {
    for (const r of store.all()) {
      const x = A.resolve(r.anchor);
      const loc = A.locate(r.anchor);
      out.push(`  record ${r.id}: surface=${r.anchor.surface} pid=${r.anchor.pid || '-'} cell=${r.anchor.cell || '-'}` +
        ` -> cellNode=${!!loc.cellNode} rung=${x && x.rung}${x && x.adrift ? ' ADRIFT ' + x.why : ''}`);
    }
  } else out.push('  store/anchors unavailable: ' + [!!store, !!A]);
  return out.join('\n');
}));
await browser.close();
