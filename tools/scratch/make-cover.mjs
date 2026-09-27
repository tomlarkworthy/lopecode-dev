// Render the essay's three-cycles claim diagram to a 1200x630 og:image.
// The SVG and every colour it resolves against are read out of the BOOTED notebook,
// so the card matches what a reader sees rather than a hand-copied palette.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const file = process.argv[2];
const out = process.argv[3] ?? 'tools/scratch/cover.png';

const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file://' + resolve(file) + '#view=S100(@tomlarkworthy/lopecode-live-2026)', { waitUntil: 'commit' });
await page.waitForTimeout(6000);

const grabbed = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const v = [...rt._variables].find(x => x._name === 'claimDiagram');
  // svgLens wraps the svg in a host node; take the first <svg> under whatever it returned
  const node = v?._value?.querySelector ? (v._value.matches?.('svg') ? v._value : v._value.querySelector('svg')) : null;
  if (!node) return null;
  const cs = getComputedStyle(document.body);
  const read = (n) => cs.getPropertyValue(n).trim();
  return {
    svg: node.outerHTML,
    fg: cs.color,
    bg: read('--theme-background') || cs.backgroundColor,
    vars: ['--theme-foreground', '--theme-background', '--syntax-keyword', '--syntax-string']
      .map(n => `${n}:${read(n)}`).filter(s => !s.endsWith(':')).join(';')
  };
});
if (!grabbed) { console.error('claimDiagram not found'); await browser.close(); process.exit(1); }

const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await card.setContent(`<!doctype html><meta charset="utf-8">
<style>
  :root{${grabbed.vars}}
  html,body{margin:0;padding:0}
  body{width:1200px;height:630px;display:flex;align-items:center;justify-content:center;
       background:${grabbed.bg};color:${grabbed.fg};
       font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .fit{width:1000px}
  .fit svg{width:100%;height:auto;display:block}
</style>
<div class="fit">${grabbed.svg}</div>`, { waitUntil: 'load' });
await card.waitForTimeout(400);
const buf = await card.screenshot({ type: 'png' });
writeFileSync(out, buf);
console.log(`${out}  ${buf.length} bytes  (bg ${grabbed.bg})`);
await browser.close();
