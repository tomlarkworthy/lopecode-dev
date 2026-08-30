// Same 16 frames, but each cropped to the marks and blown up, so a halo drawn around a mark is
// visible. Crop box comes from the recorded truth positions.
import { chromium } from 'playwright';
import fs from 'fs';
const meta = JSON.parse(fs.readFileSync('scratch/hexframes/hexframes.json', 'utf8'));
const CELL = 380;
const cells = meta.map((m, i) => {
  const xs = m.truth.map((t) => t.x), ys = m.truth.map((t) => t.y);
  const pad = Math.max(...m.truth.map((t) => t.radiusPx)) * 1.6;
  const x0 = Math.max(0, Math.min(...xs) - pad), x1 = Math.min(m.w, Math.max(...xs) + pad);
  const y0 = Math.max(0, Math.min(...ys) - pad), y1 = Math.min(m.h, Math.max(...ys) + pad);
  const bw = x1 - x0, bh = y1 - y0, s = CELL / Math.max(bw, bh);
  const b64 = fs.readFileSync(`scratch/hexframes/${m.file}`).toString('base64');
  return `<figure><div style="width:${CELL}px;height:${CELL}px;overflow:hidden;position:relative">
    <img src="data:image/png;base64,${b64}" style="position:absolute;left:0;top:0;width:${m.w * s}px;
      transform:translate(${-x0 * s}px,${-y0 * s}px);transform-origin:0 0"></div>
    <figcaption>${i}: ${m.name}</figcaption></figure>`;
}).join('');
const html = `<style>body{margin:0;background:#111;color:#eee;font:12px monospace}
main{display:grid;grid-template-columns:repeat(4,${CELL}px);gap:4px}figure{margin:0}
figcaption{padding:2px}</style><main>${cells}</main>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1700 } });
await page.setContent(html);
await page.locator('main').screenshot({ path: 'scratch/hexframes/contact-zoom.png' });
await browser.close();
