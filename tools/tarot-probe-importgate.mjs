// Does `module @tomlarkworthy/tarot-deck` gate the mount, or is the mount just waiting for
// end-of-document anyway? Same file, same block layout — the only difference is whether the
// import variable exists. Deleting it in the page before boot is not possible, so this
// deletes it from the module SOURCE block and re-serves the file.
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import { gzipSync } from 'zlib';

const SRC = 'lopebooks/notebooks/@tomlarkworthy_tarot.html';
const base = fs.readFileSync(SRC, 'utf8');
const IMPORT_LINE = /\n *main\.define\("module @tomlarkworthy\/tarot-deck".*\n/;
if (!IMPORT_LINE.test(base)) throw new Error('import line not found');

const ARMS = {
  'with the import (as built)': base,
  'import removed (layout identical)': base.replace(IMPORT_LINE, '\n'),
};

const reading = { name: 'Tom', question: 'Will it ship?', cards: ['p05', 'p09', 'c03'],
  text: 'The Five of Pentacles marks a lean beginning, the Nine your present, the Three of Cups the harvest shared.' };
const payload = gzipSync(Buffer.from(JSON.stringify(reading)))
  .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const browser = await chromium.launch();
for (const [label, html] of Object.entries(ARMS)) {
  const buf = Buffer.from(html);
  const CHUNK = 64 * 1024, RATE = 2_000_000;
  const server = http.createServer(async (req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    for (let off = 0; off < buf.length; off += CHUNK) {
      if (!res.write(buf.subarray(off, off + CHUNK))) await new Promise((r) => res.once('drain', r));
      await new Promise((r) => setTimeout(r, (CHUNK / RATE) * 1000));
    }
    res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
  await page.addInitScript(() => {
    window.__m = {};
    const mark = (k) => { if (!(k in window.__m)) window.__m[k] = +performance.now().toFixed(0); };
    const scan = () => {
      const el = document.getElementById('@tomlarkworthy/tarot-deck');
      if (el && el.nextSibling != null) mark('deck block');
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
  await page.goto(`http://127.0.0.1:${port}/?r=${payload}`, { waitUntil: 'commit', timeout: 180000 });
  for (let i = 0; i < 900; i++) {
    if (await page.evaluate(() => !!window.__m?.['card faces']).catch(() => false)) break;
    await page.waitForTimeout(100);
  }
  const m = await page.evaluate(() => window.__m);
  console.log(`${label.padEnd(36)} deck block ${String(m['deck block']).padStart(5)}ms  mount ${String(m.mount).padStart(5)}ms  faces ${String(m['card faces']).padStart(5)}ms`);
  await page.close();
  server.close();
}
await browser.close();
