// Render the 1200x630 social card for thetarot.online.
// Static hosting can't make a per-reading card the way the old GCS pipeline did,
// so this is one good generic card shared by every link.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const A = '/Users/tom.larkworthy/dev/lopecode-dev/data/tarot';
const OUT = '/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/assets/@tomlarkworthy_tarot.png';
const url = (f) => 'data:image/avif;base64,' + fs.readFileSync(path.join(A, f)).toString('base64');

const CARDS = ['m00', 'm01', 'm17']; // Fool, Magician, Star

const html = `<style>
  html,body{margin:0;padding:0;width:1200px;height:630px;overflow:hidden}
  body{background:#0a0a0f url('${url('velvet.avif')}') center/cover;
       display:flex;flex-direction:column;align-items:center;justify-content:center;
       font-family:Georgia,'Times New Roman',serif;color:#fff}
  h1{font-size:64px;font-style:italic;margin:0 0 6px;text-shadow:0 3px 18px rgba(0,0,0,.8)}
  p{font-size:25px;margin:0 0 30px;color:#e2b2b2;text-shadow:0 2px 10px rgba(0,0,0,.8)}
  .fan{display:flex;gap:34px}
  .fan img{width:186px;border-radius:7px;box-shadow:0 14px 40px rgba(0,0,0,.75)}
  .fan img:nth-child(1){transform:rotate(-8deg)}
  .fan img:nth-child(3){transform:rotate(8deg)}
</style>
<h1>thetarot.online</h1>
<p>A three-card reading — past, present, future</p>
<div class="fan">${CARDS.map((c) => `<img src="${url(c + '.avif')}">`).join('')}</div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.waitForTimeout(900);
await page.screenshot({ path: OUT });
await browser.close();
console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
