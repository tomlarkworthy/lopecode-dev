import { chromium } from 'playwright';
import path from 'path';
const OUT = 'file://' + path.resolve('tools/prerender-out.html');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ javaScriptEnabled: false });
const page = await ctx.newPage();
await page.goto(OUT, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(500);
// With JS off there is no shadow root: the snapshot stays in the light DOM exactly as the
// bytes on disk describe it, which is the whole point — a parser that never runs JS reads it.
// It should also be in normal flow (not the fixed, overflow:hidden overlay), so the document
// scrolls instead of being clipped to one screenful.
const info = await page.evaluate(() => {
  const pr = document.getElementById('lope-prerender');
  const q = sel => pr ? pr.querySelectorAll(sel).length : 0;
  const lp = pr ? pr.querySelector('#lopepage-2') : null;
  return {
    hasPrerender: !!pr, shadowAttached: !!(pr && pr.shadowRoot),
    isOverlay: pr ? getComputedStyle(pr).position === 'fixed' : null,
    hostBg: pr ? getComputedStyle(pr).backgroundColor : null,
    innerBg: lp ? getComputedStyle(lp).backgroundColor : null,
    paneCount: q('.lp2-pane'), tabCount: q('.lp2-tabs button'), cellCount: q('.observablehq'),
    textLen: (pr?.textContent || '').replace(/\s+/g,' ').trim().length,
    textStart: (pr?.textContent || '').replace(/\s+/g,' ').trim().slice(0,120),
  };
});
const expect = { shadowAttached: false, isOverlay: false };
for (const [k, v] of Object.entries(expect)) {
  console.log(`  ${info[k] === v ? '✓' : '✗'} ${k} === ${v} (got ${info[k]})`);
}
console.log(`  ${info.cellCount > 0 ? '✓' : '✗'} cells rendered without JS: ${info.cellCount}`);
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: 'tools/prerender-nojs.png' });
console.log('screenshot -> tools/prerender-nojs.png');
await browser.close();
