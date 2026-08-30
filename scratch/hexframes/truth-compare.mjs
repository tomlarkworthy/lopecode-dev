// Old labels (magenta) vs recomputed (cyan), on the frame.
import { chromium } from 'playwright';
import fs from 'fs';
const meta = JSON.parse(fs.readFileSync('scratch/hexframes/hexframes.json', 'utf8'));
const NAME = process.argv[2] || 'hexcase-5ivq-06';
const m = meta.find((x) => x.name === NAME);
const nw = JSON.parse(fs.readFileSync('scratch/hexframes/new-truth-' + NAME.replace('hexcase-','') + '.json', 'utf8'));
const b64 = fs.readFileSync(`scratch/hexframes/${m.file}`).toString('base64');
const old = m.truth.map((t) => `<circle cx="${t.x}" cy="${t.y}" r="${t.radiusPx}" fill="none"
  stroke="#e05ad0" stroke-width="2" stroke-dasharray="5 4"/>`).join('');
const neu = nw.map((t) => `<circle cx="${t.x}" cy="${t.y}" r="${t.radiusPx}" fill="none"
  stroke="#3fe8ff" stroke-width="2.5"/>
  <text x="${t.x}" y="${t.y - t.radiusPx - 5}" fill="#3fe8ff" font-size="15" text-anchor="middle"
  font-family="monospace">${t.id}${t.state === 'lattice' ? '*' : ''}</text>`).join('');
const html = `<style>body{margin:0;background:#111}</style>
<svg id="s" width="${m.w}" height="${m.h}" viewBox="0 0 ${m.w} ${m.h}">
  <image href="data:image/png;base64,${b64}" width="${m.w}" height="${m.h}"/>${old}${neu}</svg>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: m.w, height: m.h } });
await page.setContent(html);
await page.locator('#s').screenshot({ path: `scratch/hexframes/truth-compare-${NAME}.png` });
await browser.close();
