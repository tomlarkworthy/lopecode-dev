// 20 pinned notes fan down one gutter on a fixed 130px step. Assert none lands on another.
import { chromium } from 'playwright';
import { resolve } from 'path';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
await p.goto(`file://${resolve(process.argv[2] || 'scratch/guide-check.html')}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await p.waitForTimeout(18000);
const r = await p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const boxes = [];
  for (const v of rt._variables) {
    if (!/^annotation_tut\d+_note$/.test(String(v._name))) continue;
    const n = v._observer && v._observer._node;
    const host = n && n.closest ? (n.closest('[class*="anno"]') || n.parentElement) : null;
    const el = host || n;
    if (!el || !el.getBoundingClientRect) continue;
    const r = el.getBoundingClientRect();
    boxes.push({ name: String(v._name), top: Math.round(r.top + scrollY), h: Math.round(r.height),
      left: Math.round(r.left + scrollX), w: Math.round(r.width), text: (n.textContent || '').trim().slice(0, 34) });
  }
  boxes.sort((a, b) => a.top - b.top);
  const clashes = [];
  for (let i = 1; i < boxes.length; i++) {
    const a = boxes[i - 1], c = boxes[i];
    const vOverlap = a.top + a.h > c.top;
    const hOverlap = a.left < c.left + c.w && c.left < a.left + a.w;
    if (vOverlap && hOverlap) clashes.push(`${a.text} (${a.top}+${a.h}) over ${c.text} (${c.top})`);
  }
  return { count: boxes.length, clashes, span: boxes.length ? boxes[boxes.length - 1].top - boxes[0].top : 0 };
});
await b.close();
console.log(`${r.count} notes, spanning ${r.span}px`);
console.log(r.clashes.length ? 'OVERLAPS:\n  ' + r.clashes.join('\n  ') : 'no overlaps');
process.exit(r.clashes.length ? 1 : 0);
