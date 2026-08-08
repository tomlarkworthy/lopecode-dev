// What does the annotate layer cost a notebook that mutates its DOM every frame?
// Reproduces the coded-landmark rig's shape: an overlay whose innerHTML is rewritten per
// frame. Measures the anchor ladder in isolation (one pass per task, or the per-pass
// caches measure themselves) and the share of the main thread the layer takes under a
// mutation storm. Never at boot — settle first.
//
//   node tools/probe-annotate-perf.mjs [notebook.html] ['#view=...']
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve(process.argv[2] || 'lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html');
const HASH = process.argv[3] || '#view=S100(@tomlarkworthy/coded-landmark-tracking)';
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}${HASH}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 90000 });
await page.waitForTimeout(12000);

const bits = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  window.__a2 = { store, A, rt };
  const list = store.all();
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const REPS = 20;
  let sweep = 0, onPage = 0, resolveAll = 0;
  for (let i = 0; i < REPS; i++) {
    await tick();
    let t = performance.now();
    A.cellForQuote({ exact: 'a phrase that is on no page' });
    sweep += performance.now() - t;
    await tick();
    t = performance.now();
    for (const a of list) store.onPage(a);
    onPage += performance.now() - t;
    await tick();
    t = performance.now();
    for (const a of list) A.resolve(a.anchor);
    resolveAll += performance.now() - t;
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n = 0, chars = 0;
  while (walker.nextNode()) { n++; chars += walker.currentNode.nodeValue.length; }
  return {
    annotations: list.length,
    rows: list.map((a) => {
      const r = A.resolve(a.anchor);
      return `${a.id} home=${a.home} mod=${a.anchor.module || '-'} onPage=${store.onPage(a)}` +
        ` rung=${r && r.rung}${r && r.adrift ? ' ADRIFT' : ''}`;
    }),
    variables: rt._variables.size,
    textNodes: n, textChars: chars,
    docSweepMs: +(sweep / REPS).toFixed(2),
    onPageMs: +(onPage / REPS).toFixed(2),
    resolveAllMs: +(resolveAll / REPS).toFixed(2)
  };
});
console.log('annotations   :', bits.annotations);
bits.rows.forEach((r) => console.log('  ', r));
console.log('runtime vars  :', bits.variables);
console.log('text nodes    :', bits.textNodes, '/', bits.textChars, 'chars');
console.log('one doc sweep :', bits.docSweepMs, 'ms');
console.log('onPage x all  :', bits.onPageMs, 'ms  (per render pass)');
console.log('resolve x all :', bits.resolveAllMs, 'ms  (per render pass)');

// --- cost under a mutation storm -----------------------------------------
// Instrument the ladder itself: how often does a frame of foreign DOM churn drag the whole
// document through resolve(), and for how many milliseconds of main thread?
const storm = () => page.evaluate(async () => {
  const A = window.__a2.A;
  if (!A.__wrapped) {
    const real = A.resolve;
    A.__wrapped = true;
    A.__stats = { calls: 0, ms: 0 };
    A.resolve = function (a) {
      const t = performance.now();
      try { return real.call(this, a); } finally { A.__stats.calls++; A.__stats.ms += performance.now() - t; }
    };
  }
  A.__stats.calls = 0; A.__stats.ms = 0;
  let host = document.querySelector('[data-a2-perf-host]');
  if (!host) {
    host = document.createElement('div');
    host.setAttribute('data-a2-perf-host', '');
    host.style.cssText = 'position:absolute;left:-9999px;top:0;width:300px;height:80px';
    (document.querySelector('.lp2-pane') || document.body).appendChild(host);
  }
  // The rig's shape: rewrite an overlay's innerHTML on every animation frame.
  let frames = 0;
  const t0 = performance.now();
  await new Promise((done) => {
    const step = () => {
      host.innerHTML = '<svg><circle cx="' + (frames % 100) + '" cy="4" r="3"/></svg><span>f' + frames + '</span>';
      frames++;
      if (performance.now() - t0 > 4000) return done();
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  const ms = performance.now() - t0;
  const s = A.__stats;
  return {
    fps: +(frames / (ms / 1000)).toFixed(1), frames,
    resolveCalls: s.calls,
    resolveMs: +s.ms.toFixed(1),
    pctMainThread: +((s.ms / ms) * 100).toFixed(1)
  };
});

const r = await storm();
console.log('storm         :', r.frames, 'mutating frames at', r.fps, 'fps');
console.log('  resolve()   :', r.resolveCalls, 'calls,', r.resolveMs, 'ms =', r.pctMainThread + '% of the main thread');
await browser.close();
