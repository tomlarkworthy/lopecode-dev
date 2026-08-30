// The bank ships PNGs; data/hexcases/<name>.gray is the raw luma the detector was handed at capture
// time. If a bank frame was grabbed from the composited canvas instead, the two disagree, and where
// they disagree is the overlay.
import { chromium } from 'playwright';
import fs from 'fs';
const meta = JSON.parse(fs.readFileSync('scratch/hexframes/hexframes.json', 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage();
for (const m of meta) {
  const raw = `data/hexcases/${m.name}.gray`;
  if (!fs.existsSync(raw)) { console.log(`${m.name.padEnd(18)} NO ARCHIVE FILE`); continue; }
  const g = fs.readFileSync(raw);
  const b64 = fs.readFileSync(`scratch/hexframes/${m.file}`).toString('base64');
  const px = await page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const out = new Array(c.width * c.height);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) out[j] = d[i];
    return { w: c.width, h: c.height, px: out };
  }, `data:image/png;base64,${b64}`);
  if (px.w * px.h !== g.length) { console.log(`${m.name.padEnd(18)} SIZE MISMATCH png ${px.w}x${px.h} vs gray ${g.length}`); continue; }
  let diff = 0, big = 0, maxd = 0;
  for (let i = 0; i < g.length; i++) { const d = Math.abs(px.px[i] - g[i]); if (d > 2) diff++; if (d > 24) big++; if (d > maxd) maxd = d; }
  console.log(`${m.name.padEnd(18)} differing ${(100 * diff / g.length).toFixed(2)}%  strong(>24) ${(100 * big / g.length).toFixed(3)}%  max ${maxd}`);
}
await browser.close();
