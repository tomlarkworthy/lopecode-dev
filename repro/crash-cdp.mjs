// Repro v2: emulate DevTools instrumentation via CDP domains, then reload.
// usage: node repro/crash-cdp.mjs <file.html> [reloads] [domains,csv]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'repro/base.html');
const reloads = Number(process.argv[3] || 3);
const domains = (process.argv[4] || 'Runtime,Debugger,Log,DOM,Network,Page').split(',').filter(Boolean);
const url = `file://${file}#view=S100(@tomlarkworthy/lopecode-live-2026)`;

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);

let crashed = false;
page.on('crash', () => { crashed = true; console.log('!!! PAGE CRASH'); });

// Turn on the domains DevTools turns on. Debugger.enable is the big behavioural change:
// V8 stops discarding compiled code / bytecode and keeps every script source alive.
for (const d of domains) {
  try { await cdp.send(`${d}.enable`); console.log('enabled', d); }
  catch (e) { console.log('enable failed', d, String(e).slice(0, 100)); }
}
// DevTools also asks for full script sources; skipping that keeps this conservative.
let pauses = 0;
cdp.on('Debugger.paused', async (ev) => {
  pauses++;
  if (pauses < 5) console.log('PAUSED reason=', ev.reason, ev.callFrames?.[0]?.url?.slice(0, 80), ev.callFrames?.[0]?.location);
  try { await cdp.send('Debugger.resume'); } catch {}
});

const stat = async (tag) => {
  try {
    const m = await page.evaluate(() => ({
      used: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6),
      nodes: document.getElementsByTagName('*').length,
    }));
    console.log(tag, JSON.stringify(m), 'pauses=', pauses);
  } catch (e) { console.log(tag, 'eval failed:', String(e).slice(0, 140)); }
};

console.log('loading', url);
try { await page.goto(url, { waitUntil: 'load', timeout: 60000 }); }
catch (e) { console.log('goto:', String(e).slice(0, 200)); }
await page.waitForTimeout(5000);
await stat('after-initial-load');

for (let i = 1; i <= reloads && !crashed; i++) {
  console.log(`--- reload ${i}`);
  try { await page.reload({ waitUntil: 'load', timeout: 60000 }); }
  catch (e) { console.log('reload err:', String(e).slice(0, 200)); }
  await page.waitForTimeout(5000);
  await stat(`after-reload-${i}`);
}

console.log(crashed ? 'RESULT: CRASHED' : 'RESULT: survived');
await browser.close();
process.exit(crashed ? 1 : 0);
