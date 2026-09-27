// Observe what the page does between first paint and settled boot.
// Records layout-shift entries with their source nodes, the DOM size over time,
// and when the editable-md / editor-5 chrome attaches. Screenshots at fixed marks.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const file = process.argv[2];
const outDir = process.argv[3] ?? 'tools/screenshots/boot-glitch';
const marks = (process.argv[4] ?? '0,150,300,600,1000,1500,2500,4000,6000').split(',').map(Number);
if (!file) { console.error('usage: boot-glitch.mjs <notebook.html> [outDir] [marks-ms]'); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const console_ = [];
page.on('console', m => console_.push({ t: Date.now(), type: m.type(), text: m.text().slice(0, 200) }));
page.on('pageerror', e => console_.push({ t: Date.now(), type: 'pageerror', text: String(e.message).slice(0, 200) }));

await page.addInitScript(() => {
  window.__glitch = { shifts: [], paints: [], t0: performance.now(), snaps: [] };
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__glitch.shifts.push({
        t: Math.round(e.startTime), value: +e.value.toFixed(4),
        sources: (e.sources || []).slice(0, 3).map(s => {
          const n = s.node;
          if (!n) return { tag: '?' };
          const txt = (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
          return {
            tag: `${n.nodeName}.${(n.className && String(n.className).slice(0, 30)) || ''}`,
            text: txt,
            from: [Math.round(s.previousRect.y), Math.round(s.previousRect.height)],
            to: [Math.round(s.currentRect.y), Math.round(s.currentRect.height)]
          };
        })
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) window.__glitch.paints.push({ name: e.name, t: Math.round(e.startTime) });
  }).observe({ type: 'paint', buffered: true });
});

const url = 'file://' + resolve(file) + '#view=S100(@tomlarkworthy/lopecode-live-2026)';
const t0 = Date.now();
await page.goto(url, { waitUntil: 'commit' });

const snap = async (label) => {
  const m = await page.evaluate(() => ({
    t: Math.round(performance.now()),
    nodes: document.getElementsByTagName('*').length,
    height: document.body.scrollHeight,
    editableMd: document.querySelectorAll('.lope-editable-md').length,
    cm: document.querySelectorAll('.cm-editor').length,
    prose: document.querySelectorAll('.observablehq p').length,
    errors: document.querySelectorAll('.observablehq--error').length,
    visibleText: (document.body.innerText || '').length
  })).catch(e => ({ error: String(e).slice(0, 80) }));
  m.label = label; m.wall = Date.now() - t0;
  await page.screenshot({ path: `${outDir}/${String(label).padStart(5, '0')}.png` }).catch(() => {});
  return m;
};

const rows = [];
let prev = 0;
for (const ms of marks) {
  await page.waitForTimeout(Math.max(0, ms - prev)); prev = ms;
  rows.push(await snap(ms));
}

const glitch = await page.evaluate(() => window.__glitch);
console.log(JSON.stringify({
  file, marks: rows,
  paints: glitch.paints,
  cls: +glitch.shifts.reduce((a, s) => a + s.value, 0).toFixed(4),
  shifts: glitch.shifts.slice(0, 25),
  console: console_.filter(c => c.type === 'error' || c.type === 'pageerror').slice(0, 15)
}, null, 2));

await browser.close();
