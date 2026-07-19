// Repro v4: widen the streaming window (DevTools slows parsing ~10-20x) and measure the
// __waitForId MutationObserver fan-out during streaming.
// usage: node repro/crash-throttle.mjs <file.html> [cpuRate] [reloads]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'repro/base.html');
const rate = Number(process.argv[3] || 20);
const reloads = Number(process.argv[4] || 2);
const url = `file://${file}#view=S100(@tomlarkworthy/lopecode-live-2026)`;

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate });
// DevTools-like instrumentation on top of the slowdown.
for (const d of ['Runtime', 'Debugger', 'Log', 'DOM', 'Network', 'Page']) {
  try { await cdp.send(`${d}.enable`); } catch {}
}

let crashed = false;
page.on('crash', () => { crashed = true; console.log('!!! PAGE CRASH'); });

await page.addInitScript(() => {
  const S = window.__stats = { mo: 0, moObserve: 0, records: 0, peakConcurrent: 0, live: 0, waits: 0, slowWaits: 0 };
  const MO = window.MutationObserver;
  const Patched = function (cb) {
    S.mo++;
    S.live++; S.peakConcurrent = Math.max(S.peakConcurrent, S.live);
    const inst = new MO(function (recs, obs) { S.records += recs.length; return cb(recs, obs); });
    const _obs = inst.observe.bind(inst), _dis = inst.disconnect.bind(inst);
    inst.observe = (...a) => { S.moObserve++; return _obs(...a); };
    inst.disconnect = (...a) => { S.live--; return _dis(...a); };
    return inst;
  };
  Patched.prototype = MO.prototype;
  window.MutationObserver = Patched;
});

const stat = async (tag) => {
  try {
    const m = await page.evaluate(() => ({
      used: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6),
      nodes: document.getElementsByTagName('*').length,
      streaming: window.__lopeStreaming,
      ...window.__stats,
    }));
    console.log(tag, JSON.stringify(m));
  } catch (e) { console.log(tag, 'eval failed:', String(e).slice(0, 160)); }
};

// Sample DURING load, not only after.
const sampler = setInterval(() => stat('  sample'), 1500);

console.log('loading (cpu throttle', rate + 'x)', url);
try { await page.goto(url, { waitUntil: 'load', timeout: 180000 }); }
catch (e) { console.log('goto:', String(e).slice(0, 200)); }
await page.waitForTimeout(5000);
clearInterval(sampler);
await stat('after-initial-load');

for (let i = 1; i <= reloads && !crashed; i++) {
  console.log(`--- reload ${i}`);
  const s2 = setInterval(() => stat('  sample'), 1500);
  try { await page.reload({ waitUntil: 'load', timeout: 180000 }); }
  catch (e) { console.log('reload err:', String(e).slice(0, 200)); }
  await page.waitForTimeout(5000);
  clearInterval(s2);
  await stat(`after-reload-${i}`);
}

console.log(crashed ? 'RESULT: CRASHED' : 'RESULT: survived');
await browser.close();
process.exit(crashed ? 1 : 0);
