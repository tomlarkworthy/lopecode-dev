// Verifies exporter-3 change #1: programmatic exportToHTML (save-in-place path) now
// prerenders by default when bootconf has no "prerender" key.
import { chromium } from 'playwright';
const OUT = 'file:///private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/c60dce74-cb0d-4c13-8768-298fd203ac08/scratchpad/bsg-test.html';
const flags = ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'];
const b = await chromium.launch({ headless: true, args: flags });
const p = await b.newPage();
await p.goto(OUT, { waitUntil: 'load', timeout: 60000 });
await p.waitForSelector('#lopepage-2 .observablehq', { timeout: 30000 });
await p.waitForTimeout(3000);
const r = await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  let fn = null;
  for (const m of rt._modules.values()) { if (m._scope?.has?.('exportToHTML')) { fn = m._scope.get('exportToHTML')._value; break; } }
  if (typeof fn !== 'function') return { err: 'exportToHTML not fn: ' + typeof fn };
  const resp = await fn({ mains: new Map(rt.mains), runtime: rt, options: { hash: location.hash } });
  const html = resp?.source ?? resp;
  const prIdx = html.indexOf('<div id="lope-prerender"');
  const block = prIdx > -1 ? html.slice(prIdx, html.indexOf('lope-prerender-cleanup')) : '';
  return {
    len: html.length,
    hasPrerenderBlock: prIdx > -1,
    hasShadow: block.includes('shadowrootmode'),
    bootconfPrerender: /"prerender":\s*true/.test(html.slice(0, 200000)) || /"prerender": true/.test(html),
    snapshotHasCells: (block.match(/observablehq/g) || []).length > 100,
  };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
console.log(r.hasPrerenderBlock && r.hasShadow && r.snapshotHasCells ? 'PASS: prerender defaults ON with bootconf key absent' : 'FAIL');
