// Repro v3: real Google Chrome, persistent context, DevTools UI actually auto-opened.
// usage: node repro/crash-chrome.mjs <file.html> [reloads]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';
import fs from 'node:fs';

const file = path.resolve(process.argv[2] || 'repro/base.html');
const reloads = Number(process.argv[3] || 3);
const url = `file://${file}#view=S100(@tomlarkworthy/lopecode-live-2026)`;
const profile = '/tmp/lope-devtools-crash-profile';
fs.rmSync(profile, { recursive: true, force: true });

const ctx = await chromium.launchPersistentContext(profile, {
  headless: false,

  args: ['--auto-open-devtools-for-tabs'],
  viewport: null,
});

const page = ctx.pages()[0] || await ctx.newPage();
let crashed = false;
page.on('crash', () => { crashed = true; console.log('!!! PAGE CRASH'); });

// Count boot-time instrumentation: MutationObservers created, console.log volume.
await page.addInitScript(() => {
  window.__stats = { mo: 0, moObserve: 0, records: 0, logs: 0, logBytes: 0 };
  const MO = window.MutationObserver;
  window.MutationObserver = function (cb) {
    window.__stats.mo++;
    const wrapped = function (recs, obs) { window.__stats.records += recs.length; return cb(recs, obs); };
    const inst = new MO(wrapped);
    const _obs = inst.observe.bind(inst);
    inst.observe = function (...a) { window.__stats.moObserve++; return _obs(...a); };
    return inst;
  };
  window.MutationObserver.prototype = MO.prototype;
  const _log = console.log;
  console.log = function (...a) {
    window.__stats.logs++;
    try { window.__stats.logBytes += a.reduce((s, x) => s + (typeof x === 'string' ? x.length : 0), 0); } catch {}
    return _log.apply(console, a);
  };
});

const stat = async (tag) => {
  try {
    const m = await page.evaluate(() => ({
      used: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6),
      nodes: document.getElementsByTagName('*').length,
      ...window.__stats,
    }));
    console.log(tag, JSON.stringify(m));
  } catch (e) { console.log(tag, 'eval failed:', String(e).slice(0, 160)); }
};

console.log('loading', url);
try { await page.goto(url, { waitUntil: 'load', timeout: 90000 }); }
catch (e) { console.log('goto:', String(e).slice(0, 200)); }
await page.waitForTimeout(6000);
await stat('after-initial-load');

for (let i = 1; i <= reloads && !crashed; i++) {
  console.log(`--- reload ${i}`);
  try { await page.reload({ waitUntil: 'load', timeout: 90000 }); }
  catch (e) { console.log('reload err:', String(e).slice(0, 200)); }
  await page.waitForTimeout(6000);
  await stat(`after-reload-${i}`);
}

console.log(crashed ? 'RESULT: CRASHED' : 'RESULT: survived');
await ctx.close();
process.exit(crashed ? 1 : 0);
