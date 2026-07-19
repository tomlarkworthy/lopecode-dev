// Repro v6: emulate the DevTools Performance panel "record and reload" — tracing with the
// devtools.timeline categories + screenshots + V8 CPU sampling, active across a navigation.
// usage: node repro/crash-tracing.mjs <file.html> [reloads]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'repro/base.html');
const reloads = Number(process.argv[3] || 3);
const url = `file://${file}#view=S100(@tomlarkworthy/lopecode-live-2026)`;

const browser = await chromium.launch({ headless: false, args: ['--auto-open-devtools-for-tabs'] });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);

let crashed = false;
page.on('crash', () => { crashed = true; console.log('!!! PAGE CRASH'); });

// Exactly the category set the Performance panel uses (screenshots + JS samples on).
const categories = [
  '-*',
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-devtools.timeline.stack',
  'disabled-by-default-devtools.screenshot',
  'disabled-by-default-v8.cpu_profiler',
  'disabled-by-default-v8.compile',
  'v8.execute',
  'blink.user_timing',
  'blink.console',
  'latencyInfo',
  'loading',
  'toplevel',
];

console.log('initial load');
try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); }
catch (e) { console.log('goto:', String(e).slice(0, 200)); }
await page.waitForTimeout(4000);

for (let i = 1; i <= reloads && !crashed; i++) {
  console.log(`--- tracing reload ${i}`);
  let events = 0;
  const onData = (ev) => { events += (ev.value?.length || 0); };
  cdp.on('Tracing.dataCollected', onData);
  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { recordMode: 'recordUntilFull', includedCategories: categories },
  });
  try { await page.reload({ waitUntil: 'load', timeout: 120000 }); }
  catch (e) { console.log('reload err:', String(e).slice(0, 200)); }
  await page.waitForTimeout(5000);
  try {
    const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end');
    await Promise.race([done, new Promise(r => setTimeout(r, 20000))]);
  } catch (e) { console.log('tracing end err:', String(e).slice(0, 200)); }
  cdp.off('Tracing.dataCollected', onData);
  console.log(`  trace events: ${events}`);
  try {
    const m = await page.evaluate(() => ({
      used: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6),
      nodes: document.getElementsByTagName('*').length,
    }));
    console.log(`  after-reload-${i}`, JSON.stringify(m));
  } catch (e) { console.log(`  after-reload-${i} eval failed:`, String(e).slice(0, 200)); }
}

console.log(crashed ? 'RESULT: CRASHED' : 'RESULT: survived');
await browser.close();
process.exit(crashed ? 1 : 0);
