// How much of the boot delay is the authoring stack? Same file, same bytes — only the
// bootconf mains list differs, so this isolates define() cost from download cost.
import { chromium } from 'playwright';
import fs from 'fs';
import { gzipSync } from 'zlib';

const SRC = 'lopebooks/notebooks/@tomlarkworthy_tarot.html';
const html = fs.readFileSync(SRC, 'utf8');

const bootRe = /(<script id="bootconf\.json"\s+type="text\/plain"\s+data-mime="application\/json"\s*>)([\s\S]*?)(<\/script>)/g;
const hit = [...html.matchAll(bootRe)].find((c) => { try { JSON.parse(c[2]); return true; } catch { return false; } });
const conf = JSON.parse(hit[2]);
console.log('current mains (%d):', conf.mains.length);

const VARIANTS = {
  'all-19 (current)': conf.mains,
  'editing-only': ['@tomlarkworthy/lopepage-2', '@tomlarkworthy/tarot', '@tomlarkworthy/editor-5',
    '@tomlarkworthy/save-in-place', '@tomlarkworthy/exporter-3'],
  'tarot-only': ['@tomlarkworthy/lopepage-2', '@tomlarkworthy/tarot'],
};

const reading = { name: 'Tom', question: 'Will my project ship?', text: '*The candle gutters.* Ah, Tom. The Five of Pentacles marks a lean beginning. The Nine of Pentacles stands in your present. The Three of Cups ahead promises the harvest shared. Yes, it ships.', cards: ['p05', 'p09', 'c03'] };
const payload = gzipSync(Buffer.from(JSON.stringify(reading))).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const browser = await chromium.launch();
for (const [label, mains] of Object.entries(VARIANTS)) {
  const c2 = { ...conf, mains };
  const out = html.slice(0, hit.index) + hit[1] + JSON.stringify(c2, null, 2) + hit[3] + html.slice(hit.index + hit[0].length);
  const tmp = `scratch/perf-${label.replace(/[^a-z0-9]/gi, '-')}.html`;
  fs.writeFileSync(tmp, out);

  const times = [];
  for (let run = 0; run < 2; run++) {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 1000 } });
    const page = await ctx.newPage();
    const t0 = Date.now();
    await page.goto(`file://${process.cwd()}/${tmp}?r=${payload}`, { waitUntil: 'commit', timeout: 180000 });
    let ready = null;
    for (let i = 0; i < 300; i++) {
      const ok = await page.evaluate(() => {
        const a = document.querySelector('.tarot-app');
        return !!(a && a.querySelector('.reading') && a.querySelector('.reading').innerText.trim().length > 100);
      }).catch(() => false);
      if (ok) { ready = Date.now() - t0; break; }
      await page.waitForTimeout(50);
    }
    times.push(ready);
    await ctx.close();
  }
  console.log(`  ${label.padEnd(18)} mains=${String(mains.length).padStart(2)}  reading on screen: ${times.join('ms, ')}ms`);
}
await browser.close();
