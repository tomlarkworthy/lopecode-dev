import { chromium } from 'playwright';
import fs from 'fs';
const meta = JSON.parse(fs.readFileSync('scratch/hexframes/hexframes.json', 'utf8'));
const pick = (name) => {
  const m = meta.find((x) => x.name === name);
  let t = m.truth[0], bd = 1e9;
  for (const c of m.truth) { const d = Math.hypot(c.x - m.w / 2, c.y - m.h / 2); if (d < bd) { bd = d; t = c; } }
  return { m, t };
};
const CELL = 700;
const cell = (name) => {
  const { m, t } = pick(name);
  const R = t.radiusPx * 1.9, s = CELL / (2 * R);
  const b64 = fs.readFileSync(`scratch/hexframes/${m.file}`).toString('base64');
  return `<figure><div style="width:${CELL}px;height:${CELL}px;overflow:hidden;position:relative">
    <img src="data:image/png;base64,${b64}" style="position:absolute;image-rendering:pixelated;width:${m.w * s}px;
      transform:translate(${-(t.x - R) * s}px,${-(t.y - R) * s}px);transform-origin:0 0"></div>
    <figcaption>${name} r=${Math.round(t.radiusPx)}</figcaption></figure>`;
};
const html = `<style>body{margin:0;background:#111;color:#eee;font:13px monospace}
main{display:grid;grid-template-columns:repeat(2,${CELL}px);gap:6px}figure{margin:0}</style>
<main>${cell('hexcase-5ivq-06')}${cell('hexcase-04-pre')}</main>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 800 } });
await page.setContent(html);
await page.locator('main').screenshot({ path: 'scratch/hexframes/pair.png' });
await browser.close();
