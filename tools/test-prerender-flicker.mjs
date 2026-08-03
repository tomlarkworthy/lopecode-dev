import { chromium } from 'playwright';
import path from 'path';
const OUT = 'file://' + path.resolve('tools/prerender-out.html');
const flags=['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'];
const browser = await chromium.launch({ headless: true, args: flags });
const page = await browser.newPage();
await page.addInitScript(() => {
  window.__s = [];
  const strip = s => (s || '').replace(/\s+/g, '').length;
  const t0 = performance.now();
  const iv = setInterval(() => {
    const pr = document.getElementById('lope-prerender');
    const live = document.getElementById('lopepage-2');
    const prVisible = pr && getComputedStyle(pr).opacity !== '0';
    const prText = pr && pr.shadowRoot ? strip(pr.shadowRoot.textContent) : (pr ? strip(pr.innerText) : 0);
    const onTop = prVisible ? prText : (live ? strip(live.innerText) : 0);
    window.__s.push({ t: Math.round(performance.now()-t0), pr: !!pr, prOp: pr?getComputedStyle(pr).opacity:null, liveLen: live?strip(live.innerText):0, onTop });
    if (window.__s.length > 700) clearInterval(iv);
  }, 16);
});
await page.goto(OUT, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(8000);
const s = await page.evaluate(() => window.__s);
const baseline = Math.max(...s.map(x=>x.onTop));
const firstPaint = s.find(x=>x.onTop>200);
let dip=null;
for (let i=s.indexOf(firstPaint); i<s.length; i++){ if (s[i].onTop < baseline*0.4){ dip=s[i]; break; } }
const fadeStart = (s.find(x=>x.pr&&x.prOp!=='1'&&x.prOp!==null)||{}).t ?? null;
const removed = (s.find(x=>!x.pr)||{}).t ?? null;
console.log('baseline on-top text:', baseline);
console.log('first paint (ms):', firstPaint?.t);
console.log('fade start (ms):', fadeStart, ' removed (ms):', removed);
console.log('FLICKER (on-top text dips <40% after paint):', dip?`YES @${dip.t}ms=${dip.onTop}`:'NONE');
const near = fadeStart!=null ? s.filter(x=>Math.abs(x.t-fadeStart)<160).map(x=>({t:x.t,onTop:x.onTop,live:x.liveLen,op:x.prOp})) : [];
console.log('around swap:', JSON.stringify(near));
await browser.close();
console.log('\n' + (!dip && removed!=null ? 'PASS: no flicker, prerender cleaned up' : 'CHECK'));
