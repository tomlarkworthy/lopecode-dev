// Export a lopepage-2 notebook with prerender defaulting on, write it out, and boot it.
import { chromium } from 'playwright';
import fs from 'fs';
const SP = '/private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/c60dce74-cb0d-4c13-8768-298fd203ac08/scratchpad';
const flags = ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'];
const b = await chromium.launch({ headless: true, args: flags });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('file://' + SP + '/bsg-test.html', { waitUntil: 'load', timeout: 60000 });
await p.waitForSelector('#lopepage-2 .observablehq', { timeout: 30000 });
await p.waitForTimeout(3000);
const html = await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  let fn = null;
  for (const m of rt._modules.values()) { if (m._scope?.has?.('exportToHTML')) { fn = m._scope.get('exportToHTML')._value; break; } }
  const resp = await fn({ mains: new Map(rt.mains), runtime: rt, options: { hash: location.hash } });
  return resp?.source ?? resp;
});
fs.writeFileSync(SP + '/bsg-prerendered.html', html);
console.log('wrote', (html.length / 1e6).toFixed(2), 'MB');

const p2 = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errs = [];
p2.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p2.goto('file://' + SP + '/bsg-prerendered.html', { waitUntil: 'load', timeout: 60000 });
const early = await p2.evaluate(() => ({ pr: !!document.getElementById('lope-prerender') }));
await p2.waitForTimeout(15000);
const late = await p2.evaluate(() => ({
  prerenderStillThere: !!document.getElementById('lope-prerender'),
  liveCells: document.querySelectorAll('#lopepage-2 .observablehq').length,
  figs: document.querySelectorAll('.bsg-fig').length,
  errorCells: document.querySelectorAll('.observablehq--error').length,
  bodyLen: document.body.innerText.length,
}));
await p2.screenshot({ path: 'tools/screenshots/prerender-roundtrip.png' });
console.log(JSON.stringify({ earlyPrerenderPresent: early.pr, ...late }, null, 2));
console.log(errs.slice(0, 5).join('\n'));
await b.close();
console.log(!late.prerenderStillThere && late.liveCells > 0 && late.errorCells === 0 ? 'PASS: prerender shown then cleaned up, live page healthy' : 'CHECK');
