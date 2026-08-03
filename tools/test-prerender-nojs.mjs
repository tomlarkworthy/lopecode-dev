import { chromium } from 'playwright';
import path from 'path';
const OUT = 'file://' + path.resolve('tools/prerender-out.html');
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ javaScriptEnabled: false });
const page = await ctx.newPage();
await page.goto(OUT, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(500);
const info = await page.evaluate(() => {
  const pr = document.getElementById('lope-prerender');
  const sr = pr && pr.shadowRoot;
  const q = sel => sr ? sr.querySelectorAll(sel).length : 0;
  const lp = sr ? sr.querySelector('#lopepage-2') : null;
  return {
    hasPrerender: !!pr, shadowAttached: !!sr, hasLiveRuntime: !!document.getElementById('lopepage-2'),
    hostBg: pr ? getComputedStyle(pr).backgroundColor : null,
    innerBg: lp ? getComputedStyle(lp).backgroundColor : null,
    paneCount: q('.lp2-pane'), tabCount: q('.lp2-tabs button'), cellCount: q('.observablehq'),
    textStart: (sr?.textContent || '').replace(/\s+/g,' ').trim().slice(0,120),
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: 'tools/prerender-nojs.png' });
console.log('screenshot -> tools/prerender-nojs.png');
await browser.close();
