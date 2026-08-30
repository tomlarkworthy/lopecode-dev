// Is the deck ready by the time it is needed? Types a name and a question at human speed
// and reports when cardUrls resolved relative to when the visitor could first pick a card.
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';

const FILE = process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_tarot.html';
const RATE = Number(process.argv[3] || 2_000_000);
const buf = fs.readFileSync(FILE);
const CHUNK = 64 * 1024;
const server = http.createServer(async (req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  for (let off = 0; off < buf.length; off += CHUNK) {
    if (!res.write(buf.subarray(off, off + CHUNK))) await new Promise((r) => res.once('drain', r));
    await new Promise((r) => setTimeout(r, (CHUNK / RATE) * 1000));
  }
  res.end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'commit', timeout: 180000 });
await page.waitForSelector('#lopepage-2 .observablehq .tarot-app', { timeout: 120000 });
const t0 = await page.evaluate(() => performance.now());

// watch cardUrls without forcing it: poll the deck module's variable
const watch = page.evaluate(() => new Promise((res) => {
  const iv = setInterval(() => {
    const rt = window.__ojs_runtime;
    for (const v of rt._variables)
      if (v._name === 'cardUrls' && v._value && typeof v._value === 'object' && v._value.m00) {
        clearInterval(iv); res(+performance.now().toFixed(0));
      }
  }, 20);
}));

const app = () => page.locator('#lopepage-2 .observablehq .tarot-app').first();
await app().locator('input[autocomplete="given-name"]').pressSequentially('Tom', { delay: 180 });
await app().locator('input[autocomplete="given-name"]').dispatchEvent('input');
await page.waitForTimeout(600);
await app().locator('textarea').first().pressSequentially('Will it ship?', { delay: 120 });
await app().locator('textarea').first().dispatchEvent('input');
await page.waitForTimeout(600);
const canPick = await page.evaluate(() => performance.now());

const ready = await Promise.race([watch, new Promise((r) => setTimeout(() => r(null), 20000))]);
console.log(`app usable at        ${Math.round(t0)}ms`);
console.log(`name + question typed ${Math.round(canPick)}ms  (cards pickable from here)`);
console.log(`cardUrls resolved at  ${ready === null ? 'NOT within 20s' : Math.round(ready) + 'ms'}`);
if (ready !== null) console.log(ready < canPick
  ? `-> deck was ready ${Math.round(canPick - ready)}ms BEFORE the visitor could pick`
  : `-> visitor would wait ${Math.round(ready - canPick)}ms for the deck`);
await browser.close();
server.close();
