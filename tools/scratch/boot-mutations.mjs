// Record DOM mutations during boot so they can be lined up against layout-shift times.
import { chromium } from 'playwright';
import { resolve } from 'node:path';

const file = process.argv[2];
const ms = Number(process.argv[3] ?? 6000);
if (!file) { console.error('usage: boot-mutations.mjs <notebook.html> [ms]'); process.exit(1); }

const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.addInitScript(() => {
  window.__mut = { events: [], shifts: [] };
  const desc = n => {
    if (!n) return '?';
    if (n.nodeType === 3) return `#text ${JSON.stringify(String(n.nodeValue).slice(0, 25))}`;
    const cls = n.className && typeof n.className === 'string' ? '.' + n.className.split(/\s+/).slice(0, 2).join('.') : '';
    return `${n.nodeName.toLowerCase()}${cls}${n.id ? '#' + n.id : ''}`;
  };
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__mut.shifts.push(Math.round(e.startTime));
  }).observe({ type: 'layout-shift', buffered: true });
  const mo = new MutationObserver(recs => {
    for (const r of recs) {
      const t = Math.round(performance.now());
      for (const n of r.addedNodes) window.__mut.events.push({ t, op: '+', node: desc(n), parent: desc(r.target) });
      for (const n of r.removedNodes) window.__mut.events.push({ t, op: '-', node: desc(n), parent: desc(r.target) });
      if (r.type === 'attributes') window.__mut.events.push({ t, op: 'attr', node: desc(r.target), attr: r.attributeName, value: String(r.target.getAttribute(r.attributeName)).slice(0, 60) });
    }
  });
  const start = () => mo.observe(document.documentElement || document, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
  if (document.documentElement) start(); else document.addEventListener('readystatechange', start, { once: true });
});

await page.goto('file://' + resolve(file) + '#view=S100(@tomlarkworthy/lopecode-live-2026)', { waitUntil: 'commit' });
await page.waitForTimeout(ms);

const out = await page.evaluate(() => {
  const { events, shifts } = window.__mut;
  // events in a +-40ms window around each shift
  const near = shifts.map(s => ({
    shift: s,
    events: events.filter(e => e.t >= s - 45 && e.t <= s + 5).slice(-14)
  }));
  const counts = {};
  for (const e of events) { const k = e.op + ' ' + e.node; counts[k] = (counts[k] || 0) + 1; }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  return { totalEvents: events.length, shifts, top, near };
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
