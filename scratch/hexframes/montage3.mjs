// One mark per frame at high zoom -- an overlay ring drawn around a mark shows up here and nowhere
// else. Pick the mark closest to the frame centre, crop to 2.6x its radius.
import { chromium } from 'playwright';
import fs from 'fs';
const meta = JSON.parse(fs.readFileSync('scratch/hexframes/hexframes.json', 'utf8'));
const CELL = 380;
const cells = meta.map((m, i) => {
  let t = m.truth[0], bd = 1e9;
  for (const c of m.truth) { const d = Math.hypot(c.x - m.w / 2, c.y - m.h / 2); if (d < bd) { bd = d; t = c; } }
  const R = t.radiusPx * 2.6, s = CELL / (2 * R);
  const b64 = fs.readFileSync(`scratch/hexframes/${m.file}`).toString('base64');
  return `<figure><div style="width:${CELL}px;height:${CELL}px;overflow:hidden;position:relative;background:#000">
    <img src="data:image/png;base64,${b64}" style="position:absolute;left:0;top:0;width:${m.w * s}px;
      transform:translate(${-(t.x - R) * s}px,${-(t.y - R) * s}px);transform-origin:0 0"></div>
    <figcaption>${i}: ${m.name} r=${Math.round(t.radiusPx)}</figcaption></figure>`;
}).join('');
const html = `<style>body{margin:0;background:#111;color:#eee;font:12px monospace}
main{display:grid;grid-template-columns:repeat(4,${CELL}px);gap:4px}figure{margin:0}
figcaption{padding:2px}</style><main>${cells}</main>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1700 } });
await page.setContent(html);
await page.locator('main').screenshot({ path: 'scratch/hexframes/contact-mark.png' });
await browser.close();
