// Research part 6: the runtime's OWN visibility. @observablehq/runtime 6.0.0 resolves
// `visibility` as a per-variable magic input (module.js: _builtins ["visibility",
// variable_visibility]) into variable_intersector(), an IntersectionObserver on
// variable._observer._node, disconnected on invalidation. So: what node does an
// annotation's note cell hand the runtime, and what does our own cull do to it?
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const LAYOUT = '#view=R100(S60(@tomlarkworthy/annotate),S40(@tomlarkworthy/claude-code-pairing))';

const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}${LAYOUT}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(6000);

const setup = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
  const cell = document.querySelector('.observablehq[cell="demoText"]');
  cell.scrollIntoView({ block: 'center' });
  await sleep(600);
  const at = cell.textContent.indexOf('lazy dog');
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  let acc = 0, sN = null, sO = 0, eN = null, eO = 0;
  const end = at + 8;
  while (walker.nextNode()) {
    const n = walker.currentNode, len = n.nodeValue.length;
    if (!sN && acc + len >= at) { sN = n; sO = at - acc; }
    if (acc + len >= end) { eN = n; eO = end - acc; break; }
    acc += len;
  }
  const r = document.createRange(); r.setStart(sN, sO); r.setEnd(eN, eO);
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  const a = store.create(A.describeSelection(sel));
  sel.removeAllRanges();
  await sleep(600);

  // a note cell that uses the runtime's own visibility gate
  window.__visLog = [];
  const src = `${a.cell} = { const n = (window.__visN = (window.__visN || 0) + 1);` +
    ` window.__visLog.push("compute#" + n);` +
    ` await visibility();` +
    ` window.__visLog.push("visible#" + n);` +
    ` return md\`waited for visibility (run \${n})\`; }`;
  store.setSource(a.cell, src);
  await sleep(1200);
  return { id: a.id, cell: a.cell, src, paneScrollTop: pane.scrollTop };
});
console.log('created', setup.id, '\nnote source:', setup.src);

const snap = (page, id, cellName) => page.evaluate(([i, cn]) => {
  const rt = window.__ojs_runtime;
  const data = rt.mains.get('@tomlarkworthy/annotate-data');
  const v = data._scope.get(cn);
  const box = document.querySelector(`[data-ann-id="${i}"]`);
  const body = document.querySelector(`[data-a2-body="${i}"]`);
  const obsNode = v && v._observer ? v._observer._node : undefined;
  return {
    boxPresent: !!box,
    bodyPresent: !!body,
    inputs: v ? [...(v._inputs || [])].map((x) => x._name || String(x)) : null,
    reachable: v ? v._reachable : null,
    hasObserver: !!(v && v._observer),
    observerNodeTag: obsNode ? obsNode.tagName + (obsNode.dataset && obsNode.dataset.a2Body ? '[data-a2-body]' : '') : String(obsNode),
    observerNodeIsBoxBody: !!(obsNode && body && obsNode === body),
    observerNodeInDocument: obsNode ? document.contains(obsNode) : null,
    value: v && v._value ? String(v._value.textContent || v._value).slice(0, 60) : String(v && v._value),
    log: window.__visLog.slice()
  };
}, [id, cellName]);

console.log('\n=== A. box on screen ===');
console.log(JSON.stringify(await snap(page, setup.id, setup.cell), null, 1));

console.log('\n=== B. scroll the quote out of the pane (our cull fires) ===');
await page.evaluate(() => {
  const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
  pane.scrollTop = 0;
});
await page.waitForTimeout(1500);
console.log(JSON.stringify(await snap(page, setup.id, setup.cell), null, 1));

console.log('\n=== C. scroll back ===');
await page.evaluate(() => {
  const cell = document.querySelector('.observablehq[cell="demoText"]');
  cell.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(1800);
console.log(JSON.stringify(await snap(page, setup.id, setup.cell), null, 1));

console.log('\n=== B2. force a recompute WHILE culled: does the runtime still defer? ===');
await page.evaluate(() => {
  const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
  pane.scrollTop = 0;
});
await page.waitForTimeout(1200);
await page.evaluate(([cn, src]) => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  for (const v of rt._variables) if (v._name === 'a2Store' && v._module === mod) return v._value.setSource(cn, src);
}, [setup.cell, setup.src]);
await page.waitForTimeout(1500);
console.log(JSON.stringify(await snap(page, setup.id, setup.cell), null, 1));

console.log('\n=== D. what the runtime would watch if the box lived in pane-content space ===');
console.log(JSON.stringify(await page.evaluate(() => {
  // an IntersectionObserver with the default root uses the viewport, but it also honours
  // clipping by scroll containers on the way up: prove it for a node inside the pane.
  const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute; left:20px; top:40px; width:60px; height:20px; background:#0002';
  pane.appendChild(probe);
  return new Promise((res) => {
    const seen = [];
    const io = new IntersectionObserver(([e]) => seen.push(e.isIntersecting));
    io.observe(probe);
    setTimeout(() => {
      pane.scrollTop = 1400; // scroll the probe out of the pane, not out of the window
      setTimeout(() => {
        io.disconnect();
        const r = probe.getBoundingClientRect();
        probe.remove();
        res({ intersectionSequence: seen, finalRectTop: Math.round(r.top),
               insideWindow: r.top > 0 && r.top < window.innerHeight,
               note: 'clipped by the pane while still inside the window' });
      }, 700);
    }, 700);
  });
}), null, 1));

await browser.close();
