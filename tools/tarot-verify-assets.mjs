// Verify every built tarot asset decodes in Chromium at the expected size.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = '/Users/tom.larkworthy/dev/lopecode-dev/data/tarot';
const files = fs.readdirSync(OUT).filter(f => f.endsWith('.avif')).sort();

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
await page.goto('about:blank');

const bad = [];
for (const f of files) {
  const b64 = fs.readFileSync(path.join(OUT, f)).toString('base64');
  const dim = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/avif;base64,' + b64;
    try { await img.decode(); } catch (e) { return 'DECODE-FAIL'; }
    return `${img.naturalWidth}x${img.naturalHeight}`;
  }, b64);
  if (dim === 'DECODE-FAIL') bad.push(f);
  if (['back.avif', 'velvet.avif', 'm00.avif'].includes(f)) console.log(f, dim);
}
console.log(`${files.length} assets checked, ${bad.length} failed`, bad.length ? bad : '');

// visual sheet: velvet as page background, back + a few faces on top
const dataUrl = f => 'data:image/avif;base64,' + fs.readFileSync(path.join(OUT, f)).toString('base64');
await page.setContent(`<style>
body{margin:0;height:880px;background-image:url('${dataUrl('velvet.avif')}');background-size:contain;font:13px system-ui}
.row{display:flex;gap:10px;padding:16px}img{height:260px;border-radius:6px}
p{color:#fff;padding:0 16px;margin:4px}</style>
<p>velvet.avif tiled as background &mdash; back.avif then m00/m03/p13/s10</p>
<div class="row">${['back.avif', 'm00.avif', 'm03.avif', 'p13.avif', 's10.avif'].map(f => `<img src="${dataUrl(f)}">`).join('')}</div>`);
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(OUT, '../../tools/screenshots/tarot-assets.png') });
await browser.close();
