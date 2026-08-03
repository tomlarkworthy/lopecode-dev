// Shoot the shipped notes in place: are they all resolving, and do the boxes land sensibly?
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(9000);

console.log(await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  return store.all().map((r) => {
    const x = A.resolve(r.anchor);
    const box = document.querySelector(`[data-ann-id="${r.id}"]`);
    const b = box && box.getBoundingClientRect();
    return `${r.id.padEnd(16)} ${String(r.anchor.surface).padEnd(8)} rung ${String(x && x.rung).padEnd(6)}` +
      `${x && x.adrift ? ' ADRIFT ' + x.why : ''} box ${b ? Math.round(b.left) + ',' + Math.round(b.top) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height) : 'none'}`;
  }).join('\n');
}));

const paneScroll = async (n) => page.evaluate((y) => {
  document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]').scrollTop = y;
}, n);
for (let i = 0; i < 6; i++) {
  await paneScroll(i * 850);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `tools/screenshots/annotate-tour-${i}.png` });
}
console.log('wrote tools/screenshots/annotate-tour-0..5.png');
await browser.close();
