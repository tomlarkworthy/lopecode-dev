// Does compiling detectrow.as.ts at boot work, what does it cost, and does the detector end up
// running the compiled bytes rather than the saved ones?
import { chromium } from 'playwright';
import { resolve } from 'path';

const browser = await chromium.launch({ headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const t0 = Date.now();
await page.goto('file://' + resolve(process.argv[2]), { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForSelector('#lopepage-2 .observablehq', { timeout: 60000 });
const firstCell = Date.now() - t0;

const read = (names) => page.evaluate((ns) => {
  const rt = window.__ojs_runtime;
  const out = {};
  if (!rt) return out;
  for (const v of rt._variables) {
    const n = String(v._name);
    if (!ns.includes(n)) continue;
    const val = v._value;
    out[n] = val && val.byteLength !== undefined ? { bytes: val.length ?? val.byteLength }
      : val && typeof val === 'object' ? Object.fromEntries(Object.entries(val).map(([k, x]) =>
          [k, x && x.byteLength !== undefined ? `Uint8Array(${x.length})` : x]))
      : val;
  }
  return out;
}, names);

let build = null;
for (let i = 0; i < 45; i++) {
  const r = await read(['wasmBuild', 'wasmKernelBytes', 'wasmShippedBytes']);
  if (r.wasmBuild) { build = r; break; }
  await page.waitForTimeout(1000);
}
console.log('first cell rendered at', firstCell, 'ms');
console.log('wasmBuild settled at', Date.now() - t0, 'ms');
console.log(JSON.stringify(build, null, 1));

// Long tasks on the main thread: the compile is synchronous work competing with the boot.
const long = await page.evaluate(() => (window.__lopeLongTasks || []).length);

// Does the accelerator bind and agree with the cells? wasmAgreement is visibility gated.
await page.evaluate(() => document.querySelector('[cell="wasmAgreement"]')?.scrollIntoView({ block: 'center' }));
let agree = null;
for (let i = 0; i < 40; i++) {
  const r = await read(['wasmAgreement']);
  if (r.wasmAgreement) { agree = r.wasmAgreement; break; }
  await page.waitForTimeout(1500);
}
console.log('longtasks recorded:', long);
console.log('wasmAgreement:', JSON.stringify(agree));
const errs = await page.evaluate(() => {
  const rt = window.__ojs_runtime; const bad = []; if (!rt) return ["no runtime"];
  for (const v of rt._variables) if (v._value instanceof Error) bad.push(String(v._name) + ': ' + v._value.message);
  return bad;
});
console.log('errored variables:', errs.length, errs.slice(0, 8));
await browser.close();
