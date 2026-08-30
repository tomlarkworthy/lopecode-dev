// Draw a frame's recorded labels on top of it, so "the labels are wrong" can be seen rather than
// inferred from a residual.
import { chromium } from 'playwright';
import fs from 'fs';
const name = process.argv[2] || 'hexcase-5ivq-06';
const meta = JSON.parse(fs.readFileSync('scratch/hexframes/hexframes.json', 'utf8'));
const m = meta.find((x) => x.name === name);
const b64 = fs.readFileSync(`scratch/hexframes/${m.file}`).toString('base64');
const circles = m.truth.map((t) => `<circle cx="${t.x}" cy="${t.y}" r="${t.radiusPx}" fill="none"
  stroke="#e05ad0" stroke-width="2.5" stroke-dasharray="6 4"/>
  <text x="${t.x}" y="${t.y - t.radiusPx - 6}" fill="#e05ad0" font="12px monospace"
  font-size="16" text-anchor="middle">${t.id}${t.state ? ' ' + t.state : ''}</text>`).join('');
const html = `<style>body{margin:0;background:#111}</style>
<svg id="s" width="${m.w}" height="${m.h}" viewBox="0 0 ${m.w} ${m.h}">
  <image href="data:image/png;base64,${b64}" x="0" y="0" width="${m.w}" height="${m.h}"/>
  ${circles}</svg>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: m.w, height: m.h } });
await page.setContent(html);
await page.locator('#s').screenshot({ path: `scratch/hexframes/truth-${name}.png` });
await browser.close();
console.log('marks:', m.truth.length, m.truth.map((t) => `${t.id}@(${Math.round(t.x)},${Math.round(t.y)}) r=${Math.round(t.radiusPx)} ${t.state}`).join('  '));
