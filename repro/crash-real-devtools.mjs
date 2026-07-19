// Repro v5: verify a real DevTools frontend target is attached, then hammer reloads.
// Uses the browser CDP endpoint to enumerate targets so we KNOW devtools is open.
// usage: node repro/crash-real-devtools.mjs <file.html> [reloads]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';
import fs from 'node:fs';

const file = path.resolve(process.argv[2] || 'repro/base.html');
const reloads = Number(process.argv[3] || 5);
const url = `file://${file}#view=S100(@tomlarkworthy/lopecode-live-2026)`;
const profile = '/tmp/lope-dt-crash';
fs.rmSync(profile, { recursive: true, force: true });

const ctx = await chromium.launchPersistentContext(profile, {
  headless: false,
  args: ['--auto-open-devtools-for-tabs', '--remote-debugging-port=9333'],
  viewport: null,
});

const page = ctx.pages()[0] || await ctx.newPage();
let crashed = false;
page.on('crash', () => { crashed = true; console.log('!!! PAGE CRASH'); });

const targets = async () => {
  try {
    const r = await fetch('http://127.0.0.1:9333/json/list');
    const list = await r.json();
    return list.map(t => `${t.type}:${(t.url || '').slice(0, 70)}`);
  } catch (e) { return ['<no endpoint: ' + String(e).slice(0, 60) + '>']; }
};

console.log('loading', url);
try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); }
catch (e) { console.log('goto:', String(e).slice(0, 200)); }
await page.waitForTimeout(4000);
console.log('targets:', JSON.stringify(await targets(), null, 1));

for (let i = 1; i <= reloads && !crashed; i++) {
  console.log(`--- reload ${i}`);
  try { await page.reload({ waitUntil: 'load', timeout: 120000 }); }
  catch (e) { console.log('reload err:', String(e).slice(0, 200)); }
  await page.waitForTimeout(3000);
  try {
    const m = await page.evaluate(() => ({
      used: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6),
      nodes: document.getElementsByTagName('*').length,
    }));
    console.log(`  after-reload-${i}`, JSON.stringify(m));
  } catch (e) { console.log(`  after-reload-${i} eval failed:`, String(e).slice(0, 160)); }
}

console.log(crashed ? 'RESULT: CRASHED' : 'RESULT: survived');
await ctx.close();
process.exit(crashed ? 1 : 0);
