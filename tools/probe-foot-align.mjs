// Do the four fields in the console sit on one line? The tutorial tick is a checkbox where the
// others are boxes, so it is the one that drifts.
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 1000 } });
await p.goto(`file://${resolve('lopecode/notebooks/quick_start.html')}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(24000);
const r = await p.evaluate(() => {
  const mid = (el) => { const b = el.getBoundingClientRect(); return +(b.y + b.height / 2).toFixed(1); };
  const fields = [...document.querySelectorAll('.qs .foot input[type=text], .qs .foot select')].map(mid);
  const tick = mid(document.querySelector('.qs .foot input[type=checkbox]'));
  const caps = [...document.querySelectorAll('.qs .foot label')].map((l) => {
    const t = [...l.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    return t ? t.textContent.trim() : '(none)';
  });
  return { fields, tick, capTops: [...document.querySelectorAll('.qs .foot label')].map((l) => +l.getBoundingClientRect().y.toFixed(1)), caps };
});
const ref = r.fields[0];
console.log('field centres', r.fields, '\ntick centre  ', r.tick, '\ndelta        ', +(r.tick - ref).toFixed(1), 'px');
console.log('label tops   ', r.capTops, '\ncaptions     ', r.caps);
await b.close();
const drift = Math.max(...r.fields.map((f) => Math.abs(f - ref)), Math.abs(r.tick - ref));
const capDrift = Math.max(...r.capTops.map((t) => Math.abs(t - r.capTops[0])));
console.log(`\nworst field drift ${drift.toFixed(1)}px, worst caption drift ${capDrift.toFixed(1)}px`);
process.exit(drift <= 1 && capDrift <= 1 ? 0 : 1);
