// CPU profile of a notebook boot, aggregated by function. The long-task observer says *when* the
// main thread is blocked; this says *what* was on it.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2]);
const seconds = Number(process.argv[3] || 12);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(seconds * 1000);
const { profile } = await cdp.send('Profiler.stop');

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const total = profile.samples.length;
for (const id of profile.samples) {
  const n = byId.get(id);
  if (!n) continue;
  const f = n.callFrame;
  const key = `${f.functionName || '(anon)'}  ${(f.url || '').split('/').pop().slice(0, 50)}:${f.lineNumber}`;
  self.set(key, (self.get(key) || 0) + 1);
}
const span = (profile.endTime - profile.startTime) / 1000;
const ms = (c) => Math.round((c / total) * span);
console.log(`profile span ${Math.round(span)}ms, ${total} samples\n`);
console.log('self time by function:');
for (const [k, c] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 25))
  console.log(`  ${String(ms(c)).padStart(6)}ms  ${k}`);

// Roll self time up to the outermost cell on the stack. A cell's definition compiles to a function
// named after it, so the top-most such frame is the cell that is paying for the work.
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const owner = new Map();
for (const id of profile.samples) {
  let cur = id, top = null;
  while (cur != null) {
    const n = byId.get(cur);
    if (!n) break;
    const fn = n.callFrame.functionName;
    if (fn && !/^\(|^[A-Za-z]$/.test(fn)) top = fn;
    cur = parent.get(cur);
  }
  if (top) owner.set(top, (owner.get(top) || 0) + 1);
}
console.log('\ntotal time by outermost named frame (the cell paying for it):');
for (const [k, c] of [...owner].sort((a, b) => b[1] - a[1]).slice(0, 15))
  console.log(`  ${String(ms(c)).padStart(6)}ms  ${k}`);

// Attribute every sample to the deepest frame on its stack that is one of the named cells, so
// shared helpers (renderHexScene) are charged to the cell that called them.
const cells = (process.argv[4] || '').split(',').filter(Boolean);
if (cells.length) {
  const charged = new Map();
  for (const id of profile.samples) {
    let cur = id, hit = null;
    while (cur != null) {
      const n = byId.get(cur);
      if (!n) break;
      const fn = n.callFrame.functionName || '';
      if (!hit && cells.some((c) => fn === c || fn === '_' + c)) hit = fn;
      cur = parent.get(cur);
    }
    if (hit) charged.set(hit, (charged.get(hit) || 0) + 1);
  }
  console.log('\ncharged to the named cells (helpers rolled up into their caller):');
  for (const [k, c] of [...charged].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(ms(c)).padStart(6)}ms  ${k}`);
}
await browser.close();
