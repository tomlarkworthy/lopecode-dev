// What changes the runtime's variable set during boot? Samples the variable roster
// each rAF and reports adds/removes with their module, so a rebuild can be traced to a cause.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const file = process.argv[2];
const ms = Number(process.argv[3] ?? 7000);
if (!file) { console.error('usage: boot-varchurn.mjs <notebook.html> [ms]'); process.exit(1); }

const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.addInitScript(() => {
  window.__vc = { events: [], sizes: [] };
  const key = v => {
    const m = v._module;
    let mn = '?';
    try {
      const named = [...(m?._scope?.keys?.() ?? [])].find(k => k.startsWith('module @'));
      mn = named ? named.slice(7) : (m?._id ?? 'main');
    } catch {}
    return `${mn}::${v._name ?? 'anon:' + String(v._definition).slice(9, 40)}`;
  };
  let prev = new Set();
  const tick = () => {
    const rt = window.__ojs_runtime;
    if (rt && rt._variables) {
      const now = new Set();
      for (const v of rt._variables) now.add(key(v));
      const t = Math.round(performance.now());
      window.__vc.sizes.push([t, now.size]);
      if (prev.size) {
        for (const k of now) if (!prev.has(k)) window.__vc.events.push({ t, op: '+', k });
        for (const k of prev) if (!now.has(k)) window.__vc.events.push({ t, op: '-', k });
      }
      prev = now;
    }
    if (performance.now() < 13000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await page.goto('file://' + resolve(file) + '#view=S100(@tomlarkworthy/lopecode-live-2026)', { waitUntil: 'commit' });
await page.waitForTimeout(ms);

const out = await page.evaluate(() => {
  const { events, sizes } = window.__vc;
  const byTime = {};
  for (const e of events) { (byTime[e.t] ??= []).push(e.op + ' ' + e.k); }
  const bursts = Object.entries(byTime).map(([t, list]) => ({ t: +t, n: list.length, sample: list.slice(0, 6) }))
    .sort((a, b) => a.t - b.t);
  return { totalEvents: events.length, sizeFirst: sizes[0], sizeLast: sizes[sizes.length - 1], bursts: bursts.slice(0, 25) };
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
