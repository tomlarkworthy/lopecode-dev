import { chromium } from 'playwright';
import fs from 'fs';
const b64 = fs.readFileSync('scratch/hexframes/hexframe-10.png').toString('base64');
const img = (f, label) => `<figure><img src="data:image/png;base64,${b64}" style="width:700px;filter:${f}">
  <figcaption>${label}</figcaption></figure>`;
const html = `<style>body{margin:0;background:#111;color:#eee;font:12px monospace}
main{display:grid;grid-template-columns:repeat(2,700px);gap:6px}figure{margin:0}img{display:block}</style>
<main>${img('none', 'as captured')}${img('contrast(3.2) brightness(1.05)', 'contrast x3.2')}
${img('invert(1) contrast(2.4)', 'inverted, contrast x2.4')}${img('grayscale(1) contrast(6)', 'contrast x6')}</main>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1450, height: 1200 } });
await page.setContent(html);
await page.locator('main').screenshot({ path: 'scratch/hexframes/stretch.png' });
await browser.close();
