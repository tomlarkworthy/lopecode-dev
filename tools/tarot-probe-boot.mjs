// Where does the ~1s boot go? Time each tarot cell from the moment the module is up.
import { chromium } from 'playwright';
import { resolve } from 'path';
const file = process.argv[2] || resolve('lopebooks/notebooks/@tomlarkworthy_tarot.html');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
await p.goto(file.startsWith('http') ? file : `file://${file}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForSelector('.tarot-app', { timeout: 90000 });
await p.waitForTimeout(4000);
const r = await p.evaluate(async () => {
  const m = window.__ojs_runtime.mains.get('@tomlarkworthy/tarot');
  const out = {};
  for (const name of ['deck', 'cardUrls', 'velvetUrl', 'cardById', 'cardBackDefs', 'pickCards']) {
    const t = performance.now();
    try { await m.value(name); out[name] = +(performance.now() - t).toFixed(1); }
    catch (e) { out[name] = 'ERR ' + String(e).slice(0, 60); }
  }
  return out;
});
console.log('cached (already settled):', JSON.stringify(r));
// now force a cold re-evaluation of cardUrls only
const cold = await p.evaluate(async () => {
  const m = window.__ojs_runtime.mains.get('@tomlarkworthy/tarot');
  const FA = await m.value('deck');
  const t = performance.now();
  await Promise.all(FA.map((c) => window.lopecode.contentSync(`@tomlarkworthy/tarot/${c.id}.avif`)));
  return +(performance.now() - t).toFixed(1);
}).catch((e) => 'n/a: ' + String(e).slice(0, 80));
console.log('re-resolving all 78 card attachments:', cold, 'ms');
await b.close();
