// Which cell node keeps changing height during boot? Samples every observablehq cell
// node each rAF and reports the ones whose height changes more than once.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const file = process.argv[2];
const ms = Number(process.argv[3] ?? 6000);
if (!file) { console.error('usage: boot-oscillation.mjs <notebook.html> [ms]'); process.exit(1); }

const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.addInitScript(() => {
  window.__osc = { samples: [], t0: performance.now() };
  const tick = () => {
    const nodes = document.querySelectorAll('div.observablehq');
    const row = [];
    nodes.forEach((n, i) => row.push([
      i,
      n.offsetHeight,
      (n.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 45)
    ]));
    window.__osc.samples.push({ t: Math.round(performance.now()), row });
    if (performance.now() - window.__osc.t0 < 12000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await page.goto('file://' + resolve(file) + '#view=S100(@tomlarkworthy/lopecode-live-2026)', { waitUntil: 'commit' });
await page.waitForTimeout(ms);

const out = await page.evaluate(() => {
  const s = window.__osc.samples;
  const byKey = new Map();          // text-key -> [{t,h}]
  for (const { t, row } of s) {
    for (const [, h, txt] of row) {
      if (!txt) continue;
      if (!byKey.has(txt)) byKey.set(txt, []);
      const arr = byKey.get(txt);
      if (!arr.length || arr[arr.length - 1].h !== h) arr.push({ t, h });
    }
  }
  const changers = [];
  for (const [txt, arr] of byKey) {
    if (arr.length > 2) changers.push({ text: txt, changes: arr.length, track: arr.slice(0, 12) });
  }
  changers.sort((a, b) => b.changes - a.changes);
  return { samples: s.length, cells: byKey.size, changers: changers.slice(0, 12) };
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
