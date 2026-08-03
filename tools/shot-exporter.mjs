import { chromium } from 'playwright';
import path from 'path';
const NB = path.resolve('lopebooks/notebooks/@tomlarkworthy_virtual-monorepo.html');
const HASH = '#view=R100(S60(@tomlarkworthy/virtual-monorepo),S40(@tomlarkworthy/exporter-3))';
const FLAGS = ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'];
const b = await chromium.launch({ headless: true, args: FLAGS });
const p = await (await b.newContext()).newPage();
await p.goto('file://'+NB+HASH, { waitUntil:'load', timeout:60000 });
await p.waitForSelector('#lopepage-2 .moldbook-exporter', { timeout:30000 });
await p.waitForTimeout(2500);
const el = await p.$('.moldbook-exporter');
await el.screenshot({ path:'tools/screenshots/exporter-crop.png' });
// dump computed box metrics for the row structure
const info = await p.evaluate(() => {
  const q = s => document.querySelector('.moldbook-exporter '+s);
  const box = e => e ? (r=>({w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.x),y:Math.round(r.y)}))(e.getBoundingClientRect()) : null;
  const cs = (e,...p) => e ? p.map(k=>[k,getComputedStyle(e)[k]]) : null;
  const row = document.querySelector('.moldbook-exporter > div[style*="flex"]');
  return {
    disk: box(q('.disk-image')),
    diskSvg: box(q('.disk-image svg')),
    summary: box(q('summary.moldbook-topline')),
    details: box(q('details.moldbook-options')),
    buttons: box(q('div[style*="flex-wrap"]')),
    row: box(row),
    exporter: box(q('')||document.querySelector('.moldbook-exporter')),
    rowStyle: cs(row,'alignItems','gap'),
  };
});
console.log(JSON.stringify(info,null,2));
await b.close();
