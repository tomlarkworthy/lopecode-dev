// Two arms in one browser context: cold load, then reload. Arm 2 must issue no getBlob.
import { chromium } from 'playwright';

const FILE = 'file://' + (process.argv[2] || '/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Feeling_of_Computing.html');
const VIEW = '#view=S100(@tomlarkworthy/foc-chat,@tomlarkworthy/foc-wiki,@tomlarkworthy/foc-demos,@tomlarkworthy/foc-projects,@tomlarkworthy/foc-people)&foc=3msvih7djjbh2';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

let getBlob = 0, getBlobBytes = 0;
const errors = { cold: [], reload: [] };
let arm = 'cold';
page.on('request', r => { if (r.url().includes('com.atproto.sync.getBlob')) getBlob++; });
page.on('response', async r => {
  if (!r.url().includes('com.atproto.sync.getBlob')) return;
  const n = Number(r.headers()['content-length'] || 0);
  getBlobBytes += n;
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

// Wait for the attachment media to settle: every element carrying a src, and the
// blob: count stable for two consecutive samples.
const settle = async (label) => {
  await page.waitForFunction(() => document.querySelectorAll('.fc-msg').length > 5, { timeout: 300000 });
  await page.waitForFunction(() => document.querySelectorAll('.fc-att img, .fc-att video').length > 0, { timeout: 300000 });
  let prev = -1, s;
  for (let i = 0; i < 120; i++) {
    await sleep(2000);
    s = await mediaState();
    if (s.blob === prev && s.blob + s.remote === s.total) break;
    prev = s.blob;
  }
  return s;
};

const run = async (label) => {
  getBlob = 0; getBlobBytes = 0; arm = label;
  const t0 = Date.now();
  if (label === 'cold') await page.goto(FILE + VIEW, { waitUntil: 'load' });
  else await page.reload({ waitUntil: 'load' });
  const s = await settle(label);
  return { label, ms: Date.now() - t0, ...s, getBlob, mb: +(getBlobBytes / 1e6).toFixed(1), idb: await idbKeys(), errors: errors[label].length };
};

const cold = await run('cold');
const warm = await run('reload');

const row = r => [
  r.label.padEnd(7),
  ('media ' + r.blob + '/' + r.total + ' blob:').padEnd(22),
  ('remote src ' + r.remote).padEnd(14),
  ('getBlob ' + r.getBlob).padEnd(12),
  ('fetched ' + r.mb + ' MB').padEnd(18),
  ('idb blobs ' + r.idb).padEnd(15),
  ('pageerror ' + r.errors).padEnd(13),
  (r.ms / 1000).toFixed(0) + 's'
].join(' ');
console.log(row(cold));
console.log(row(warm));
for (const k of ['cold', 'reload']) for (const e of errors[k]) console.log(k, e);
console.log(warm.getBlob === 0 && warm.blob === warm.total && warm.total > 0 && cold.errors === 0 && warm.errors === 0 ? 'PASS' : 'FAIL');
await b.close();
