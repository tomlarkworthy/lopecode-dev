// Where does the time go when opening a share link? Builds a payload with the same
// encoding the app uses, then samples the page from navigation to reading-on-screen.
import { chromium } from 'playwright';
import { gzipSync } from 'zlib';

const URL_BASE = process.argv[2] || 'https://thetarot.online/';

const reading = {
  name: 'Tom',
  question: 'Will my project ship?',
  text: '*The candle gutters.* Ah, Tom. The Five of Pentacles marks a lean beginning — you built from scarcity, and it taught you. The Nine of Pentacles stands in your present: hard-won independence, the garden you tend yourself. And the Three of Cups ahead promises the harvest shared. Yes, it ships. Tend the garden; the feast is nearly ready.',
  cards: ['p05', 'p09', 'c03'],
};
const b64url = gzipSync(Buffer.from(JSON.stringify(reading)))
  .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const url = `${URL_BASE}?r=${b64url}`;
console.log('payload %d chars\n', b64url.length);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 1000 } });
const page = await ctx.newPage();

const bytes = { total: 0, byType: {} };
page.on('response', async (r) => {
  try {
    const len = Number((await r.allHeaders())['content-length'] || 0);
    bytes.total += len;
    const t = r.request().resourceType();
    bytes.byType[t] = (bytes.byType[t] || 0) + len;
  } catch {}
});

const t0 = Date.now();
const marks = {};
await page.goto(url, { waitUntil: 'commit', timeout: 180000 });
marks.commit = Date.now() - t0;

const seen = new Set();
for (let i = 0; i < 200; i++) {
  const s = await page.evaluate(() => {
    const pre = document.querySelector('#lope-prerender');
    const app = document.querySelector('.tarot-app');
    const reading = app && app.querySelector('.reading');
    return {
      prerender: !!pre,
      app: !!app,
      appVisible: !!(app && app.getBoundingClientRect().height > 100),
      readingText: reading ? reading.innerText.trim().length : 0,
      cards: app ? app.querySelectorAll('.board image').length : 0,
      nameFilled: !!(app && app.querySelector('input')?.value),
    };
  }).catch(() => ({}));
  const now = Date.now() - t0;
  const record = (k, cond) => { if (cond && !seen.has(k)) { seen.add(k); marks[k] = now; } };
  record('prerenderUp', s.prerender);
  record('appInDom', s.app);
  record('appVisible', s.appVisible);
  record('nameFilled', s.nameFilled);
  record('cardsShown', s.cards === 3);
  record('readingShown', s.readingText > 100);
  if (marks.readingShown) break;
  await page.waitForTimeout(100);
}

const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0] || {};
  const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
  return { responseEnd: Math.round(n.responseEnd || 0), domContentLoaded: Math.round(n.domContentLoadedEventEnd || 0), transfer: n.transferSize, decoded: n.decodedBodySize, paints };
});

console.log('navigation:');
console.log('  transfer %s KB -> decoded %s KB', Math.round(nav.transfer / 1024), Math.round(nav.decoded / 1024));
console.log('  responseEnd %dms, DOMContentLoaded %dms', nav.responseEnd, nav.domContentLoaded);
console.log('  paints', JSON.stringify(nav.paints));
console.log('\nmilestones (ms from navigation):');
for (const k of ['commit', 'prerenderUp', 'appInDom', 'appVisible', 'nameFilled', 'cardsShown', 'readingShown'])
  console.log(`  ${k.padEnd(14)} ${marks[k] ?? 'never'}`);
await browser.close();
