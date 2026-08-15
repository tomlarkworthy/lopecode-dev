// Does the boot actually overlap the download? The bootloader is built to stream:
// `main` sits at the top of the document and __waitForId blocks per-block until that
// block's closing tag is parsed. So the question is layout — when does each block the
// boot needs actually arrive, relative to the app coming alive?
//
// Serves the notebook over a throttled local HTTP server and timestamps, inside the page,
// when each key <script> block finishes parsing and when the runtime reaches each stage.
// Note `.tarot-app` appears in the prerender within ~30ms; that is the static snapshot,
// not the live app, so the live milestones come from the runtime, not the DOM.
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';

const FILE = process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_tarot.html';
const BYTES_PER_SEC = Number(process.argv[3] || 2_000_000);
const html = fs.readFileSync(FILE);

const CHUNK = 64 * 1024;
const server = http.createServer(async (req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  for (let off = 0; off < html.length; off += CHUNK) {
    if (!res.write(html.subarray(off, off + CHUNK))) await new Promise((r) => res.once('drain', r));
    await new Promise((r) => setTimeout(r, (CHUNK / BYTES_PER_SEC) * 1000));
  }
  res.end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const WATCH = ['bootconf.json', '@tomlarkworthy/bootloader', '@tomlarkworthy/lopepage-2',
  '@tomlarkworthy/tarot', '@tomlarkworthy/tarot/deck.json', '@tomlarkworthy/tarot/m00.avif',
  '@tomlarkworthy/tarot/w14.avif', 'streaming_sentinel'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
await page.addInitScript((watch) => {
  window.__marks = {};
  const mark = (k) => { if (!(k in window.__marks)) window.__marks[k] = +performance.now().toFixed(0); };
  const scan = () => {
    for (const id of watch) {
      const el = document.getElementById(id);
      if (el && el.nextSibling != null) mark('block: ' + id);
    }
    if (document.querySelector('.tarot-app')) mark('prerender painted');
    if (window.__lopeStreaming === false) mark('document fully parsed');
    const rt = window.__ojs_runtime;
    if (rt) {
      mark('runtime constructed');
      if (rt.mains?.has('@tomlarkworthy/lopepage-2')) mark('LIVE: lopepage-2 module');
      if (rt.mains?.has('@tomlarkworthy/tarot')) mark('LIVE: tarot module');
    }
    // the live app replaces the prerendered snapshot; the runtime-built one has a
    // reactive input wired to it, the snapshot does not
    const inp = document.querySelector('.tarot-app input[autocomplete="given-name"]');
    if (inp && inp.closest('[data-pid]')) mark('LIVE: app mounted');
  };
  const attach = () => {
    if (!document.documentElement) return setTimeout(attach, 0);
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  };
  attach();
  setInterval(scan, 20);
  document.addEventListener('DOMContentLoaded', () => mark('DOMContentLoaded'));
}, WATCH);

await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'commit', timeout: 180000 });
for (let i = 0; i < 900; i++) {
  const done = await page.evaluate(() => !!window.__marks?.['LIVE: tarot module']).catch(() => false);
  if (done) break;
  await page.waitForTimeout(100);
}
await page.waitForTimeout(1500);
const marks = await page.evaluate(() => window.__marks);
const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0];
  return { responseEnd: Math.round(n.responseEnd) };
});

console.log(`${(html.length / 1048576).toFixed(2)} MB at ${(BYTES_PER_SEC / 1e6).toFixed(1)} MB/s ` +
  `= ${(html.length / BYTES_PER_SEC).toFixed(1)}s of download\n`);
for (const [k, v] of Object.entries(marks).sort((a, b) => a[1] - b[1]))
  console.log(`  ${String(v).padStart(6)}ms  ${k}`);
console.log(`\n  responseEnd ${nav.responseEnd}ms`);
await browser.close();
server.close();
