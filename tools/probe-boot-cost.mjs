// Where does a cold boot spend its time, and which cells actually compute?
// "Make the heavy blocks imports" only helps if those cells are computing at
// boot; it does nothing about bytes the HTML parser still has to walk.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { statSync } from 'fs';

const file = resolve(process.argv[2]);
const wait = Number(process.argv[3] || 30000);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const t0 = Date.now();
const marks = {};
page.on('load', () => (marks.load = Date.now() - t0));
await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
marks.domcontentloaded = Date.now() - t0;
await page.waitForTimeout(wait);

const out = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const nav = performance.getEntriesByType('navigation')[0] || {};
  let computed = 0, errored = 0, pending = 0;
  const byModule = {};
  const heavy = [];
  for (const v of rt._variables) {
    const state = v._error ? 'errored' : v._value !== undefined ? 'computed' : 'pending';
    if (state === 'computed') computed++; else if (state === 'errored') errored++; else pending++;
    let mod = '(unnamed)';
    for (const [k, m] of rt.mains) if (m === v._module) mod = k;
    byModule[mod] ??= { computed: 0, pending: 0 };
    if (state === 'computed') byModule[mod].computed++; else if (state === 'pending') byModule[mod].pending++;
    // cells holding big binary values are the ones a FileAttachment actually decoded
    const val = v._value;
    if (val instanceof ArrayBuffer) heavy.push([v._name, val.byteLength]);
    else if (val && val.tagName === 'IMG' && val.naturalWidth) heavy.push([v._name, 'IMG ' + val.naturalWidth + 'x' + val.naturalHeight]);
    else if (val instanceof Uint8Array) heavy.push([v._name, 'bytes ' + val.length]);
  }
  return {
    domInteractive: Math.round(nav.domInteractive ?? -1),
    domComplete: Math.round(nav.domComplete ?? -1),
    scriptBlocks: document.querySelectorAll('script[type="text/plain"]').length,
    variables: rt._variables.size ?? rt._variables.length,
    computed, errored, pending,
    byModule,
    decodedHeavyCells: heavy.slice(0, 25),
  };
});

console.log(JSON.stringify({ fileMB: +(statSync(file).size / 1e6).toFixed(2), marks, ...out }, null, 2));
await browser.close();
