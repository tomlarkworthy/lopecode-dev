// Three arms in one browser context, all against the same page:
//   cold    open, do not scroll, dwell DWELL ms  -> only what is near the viewport is fetched
//   scroll  walk the channel list to the top     -> the rest is fetched once, into IndexedDB
//   reload  page.reload(), do not scroll         -> must issue no getBlob at all
// Pass a notebook path as argv[2] to probe a different file (e.g. a `git show HEAD:` copy).
import { chromium } from 'playwright';

const FILE = 'file://' + (process.argv[2] || '/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Feeling_of_Computing.html');
const VIEW = '#view=S100(@tomlarkworthy/foc-chat,@tomlarkworthy/foc-wiki,@tomlarkworthy/foc-demos,@tomlarkworthy/foc-projects,@tomlarkworthy/foc-people)&foc=3msvih7djjbh2';
const DWELL = 8000; // matches the settle time the pre-change arm needed
const sleep = ms => new Promise(r => setTimeout(r, ms));

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

let getBlob = 0, getBlobBytes = 0, arm = 'cold';
const errors = { cold: [], scroll: [], reload: [] };
page.on('request', r => { if (r.url().includes('com.atproto.sync.getBlob')) getBlob++; });
page.on('response', r => {
  if (r.url().includes('com.atproto.sync.getBlob')) getBlobBytes += Number(r.headers()['content-length'] || 0);
});
page.on('pageerror', e => errors[arm].push('pageerror: ' + e.message));

const mediaState = () => page.evaluate(() => {
  const els = [...document.querySelectorAll('.fc-att img, .fc-att video')];
  return {
    total: els.length,
    blob: els.filter(e => (e.getAttribute('src') || '').startsWith('blob:')).length,
    remote: els.filter(e => (e.getAttribute('src') || '').startsWith('http')).length
  };
});

const idbKeys = () => page.evaluate(() => new Promise((res, rej) => {
  const req = indexedDB.open('lopejack-cache');
  req.onsuccess = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains('blobs')) return res(0);
    const c = db.transaction('blobs', 'readonly').objectStore('blobs').count();
    c.onsuccess = () => res(c.result);
    c.onerror = () => rej(c.error);
  };
  req.onerror = () => rej(req.error);
}));

const ready = async () => {
  await page.waitForFunction(() => document.querySelectorAll('.fc-msg').length > 5, { timeout: 300000 });
  await page.waitForFunction(() => document.querySelectorAll('.fc-att img, .fc-att video').length > 0, { timeout: 300000 });
};

const measure = async (label, t0) => ({
  label, ms: Date.now() - t0, ...await mediaState(),
  getBlob, mb: +(getBlobBytes / 1e6).toFixed(1), idb: await idbKeys(), errors: errors[label].length
});

const reset = (label) => { getBlob = 0; getBlobBytes = 0; arm = label; };

// --- cold: open and sit still
reset('cold');
let t0 = Date.now();
await page.goto(FILE + VIEW, { waitUntil: 'load' });
await ready();
await sleep(DWELL);
const cold = await measure('cold', t0);

// --- scroll: walk the list. stick() re-pins to the bottom for 6s after load, so this
// only runs after the cold dwell has passed.
reset('scroll');
t0 = Date.now();
await page.evaluate(async () => {
  const list = document.querySelector('.foc-chat .fc-list');
  for (let y = list.scrollHeight; y >= 0; y -= 400) {
    list.scrollTop = y;
    await new Promise(r => setTimeout(r, 120));
  }
});
let prev = -1, s;
for (let i = 0; i < 60; i++) {
  await sleep(2000);
  s = await mediaState();
  if (s.blob === prev) break;
  prev = s.blob;
}
const scrolled = await measure('scroll', t0);

// --- reload: same context, same page, do not scroll
reset('reload');
t0 = Date.now();
await page.reload({ waitUntil: 'load' });
await ready();
await sleep(DWELL);
const warm = await measure('reload', t0);

const row = r => [
  r.label.padEnd(7),
  ('media ' + r.blob + '/' + r.total + ' blob:').padEnd(20),
  ('remote src ' + r.remote).padEnd(14),
  ('getBlob ' + r.getBlob).padEnd(12),
  ('fetched ' + r.mb + ' MB').padEnd(18),
  ('idb blobs ' + r.idb).padEnd(15),
  ('pageerror ' + r.errors).padEnd(13),
  (r.ms / 1000).toFixed(0) + 's'
].join(' ');
for (const r of [cold, scrolled, warm]) console.log(row(r));
for (const k of ['cold', 'scroll', 'reload']) for (const e of errors[k]) console.log(k, e);

const pass =
  cold.blob > 0 && cold.blob < cold.total &&            // lazy: some, not all
  scrolled.blob === scrolled.total && scrolled.idb === scrolled.total && // the rest arrives on scroll
  warm.getBlob === 0 && warm.blob > 0 &&                // reopen is served from IndexedDB
  cold.errors === 0 && scrolled.errors === 0 && warm.errors === 0;
console.log(pass ? 'PASS' : 'FAIL');
await b.close();
