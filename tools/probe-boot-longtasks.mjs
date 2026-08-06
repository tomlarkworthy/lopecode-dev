// What blocks the main thread while a notebook boots. Records long tasks (>50ms) alongside a
// timeline of when each module's variable resolves, so a freeze can be attributed to the module
// whose define() ran through it rather than guessed at.
import { chromium } from 'playwright';
import { resolve } from 'path';

const file = resolve(process.argv[2]);
const wait = Number(process.argv[3] || 40000);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));

// Installed before any notebook script runs, so the boot itself is observed.
await page.addInitScript(() => {
  window.__long = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__long.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) });
  }).observe({ entryTypes: ['longtask'] });
  // contentSync is the synchronous read (base64 decode + gunzip) every module's define() makes for
  // each of its file attachments, so it is the first suspect for a main-thread stall. Wrap it as
  // soon as the bootloader installs it.
  window.__cs = [];
  let installed = null;
  Object.defineProperty(window, 'lopecode', {
    configurable: true,
    get: () => installed,
    set: (v) => {
      installed = v;
      if (v && typeof v.contentSync === 'function' && !v.__wrapped) {
        const orig = v.contentSync.bind(v);
        v.contentSync = (id) => {
          const t = performance.now();
          try { return orig(id); }
          finally { window.__cs.push({ id: String(id).slice(0, 70), at: Math.round(t), ms: Math.round(performance.now() - t) }); }
        };
        v.__wrapped = true;
      }
    },
  });
  // Sample which module variables have resolved, so a long task can be placed in the sequence.
  window.__mods = [];
  const seen = new Set();
  const tick = () => {
    const rt = window.__ojs_runtime;
    if (rt) for (const v of rt._variables) {
      const n = String(v._name || '');
      if (n.startsWith('module ') && v._value && !seen.has(n)) { seen.add(n); window.__mods.push({ t: Math.round(performance.now()), name: n }); }
    }
    setTimeout(tick, 20);
  };
  tick();
});

await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForTimeout(wait);

const out = await page.evaluate(() => {
  const long = window.__long.sort((a, b) => b.dur - a.dur);
  const mods = window.__mods;
  // For each of the worst tasks, name the module that resolved closest after it — the define()
  // that was most likely running inside.
  const blamed = long.slice(0, 12).map((t) => {
    const after = mods.filter((m) => m.t >= t.start && m.t <= t.start + t.dur + 300).map((m) => m.name.slice(7));
    return { ...t, resolvedDuring: after.slice(0, 4) };
  });
  const total = long.reduce((a, b) => a + b.dur, 0);
  return {
    longTaskCount: long.length,
    blockedMs: total,
    worst: blamed,
    firstModuleAt: mods[0]?.t ?? null,
    lastModuleAt: mods[mods.length - 1]?.t ?? null,
    contentSyncCalls: window.__cs.length,
    contentSyncMs: Math.round(window.__cs.reduce((a, b) => a + b.ms, 0)),
    contentSyncWorst: [...window.__cs].sort((a, b) => b.ms - a.ms).slice(0, 12),
    moduleTimeline: mods.map((m) => `${m.t}ms ${m.name.slice(7)}`),
  };
});

console.log(JSON.stringify(out, null, 1));
console.log('page errors:', errs.length ? errs.slice(0, 4) : 'none');
await browser.close();
