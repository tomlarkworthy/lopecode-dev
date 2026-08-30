// Live-site milestones + console errors. The local throttled probe said 3.35s; the live
// site says 6-8s, so something the local server does not reproduce is in the way.
import { chromium } from 'playwright';
import { gzipSync } from 'zlib';

const URL_BASE = process.argv[2] || 'https://thetarot.online/';
const reading = { name: 'Tom', question: 'Will it ship?', cards: ['p05', 'p09', 'c03'],
  text: 'The Five of Pentacles marks a lean beginning, the Nine your present, the Three of Cups the harvest shared.' };
const payload = gzipSync(Buffer.from(JSON.stringify(reading)))
  .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
const msgs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') msgs.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => msgs.push('PAGEERROR ' + String(e).slice(0, 160)));
page.on('requestfailed', (r) => msgs.push('REQFAIL ' + r.url().slice(0, 120)));
const net = [];
page.on('response', (r) => { if (!r.url().startsWith('data:')) net.push([Date.now(), r.status(), r.url().slice(0, 110)]); });

await page.addInitScript(() => {
  window.__m = {};
  const mark = (k) => { if (!(k in window.__m)) window.__m[k] = +performance.now().toFixed(0); };
  const scan = () => {
    for (const id of ['bootconf.json', '@tomlarkworthy/bootloader', '@tomlarkworthy/tarot',
      '@tomlarkworthy/codemirror-6-v2', '@tomlarkworthy/tarot-deck']) {
      const el = document.getElementById(id);
      if (el && el.nextSibling != null) mark('block: ' + id);
    }
    if (window.__lopeStreaming === false) mark('document fully parsed');
    if (window.__ojs_runtime) mark('runtime constructed');
    const mount = document.querySelector('#lopepage-2 .observablehq');
    if (mount && !mount.closest('#lope-prerender')) mark('mount');
    if (document.querySelector('.tarot-app .board image[href]')) mark('card faces');
  };
  const attach = () => document.documentElement
    ? new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true })
    : setTimeout(attach, 0);
  attach();
  setInterval(scan, 20);
});

const t0 = Date.now();
await page.goto(`${URL_BASE}?r=${payload}`, { waitUntil: 'commit', timeout: 180000 });
for (let i = 0; i < 300; i++) {
  if (await page.evaluate(() => !!window.__m?.['card faces']).catch(() => false)) break;
  await page.waitForTimeout(100);
}
const m = await page.evaluate(() => window.__m);
for (const [k, v] of Object.entries(m).sort((a, b) => a[1] - b[1])) console.log(`  ${String(v).padStart(6)}ms  ${k}`);
console.log('\nnetwork:');
for (const [t, s, u] of net) console.log(`  ${String(t - t0).padStart(6)}ms  ${s}  ${u}`);
console.log('\nconsole:', msgs.length ? msgs.slice(0, 12) : 'clean');
await browser.close();
