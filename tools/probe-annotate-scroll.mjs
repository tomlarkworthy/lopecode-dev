// Do the shipped notes stay anchored when their cell scrolls out of the pane's view?
import { chromium } from 'playwright';
import { resolve } from 'path';

const NOTEBOOK = resolve('lopebooks/notebooks/@tomlarkworthy_annotate.html');
const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)));
await page.goto(`file://${NOTEBOOK}#view=S100(@tomlarkworthy/annotate)`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ojs_runtime && document.querySelector('[data-a2-root]'), { timeout: 60000 });
await page.waitForTimeout(9000);

const report = () => page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const mod = rt.mains.get('@tomlarkworthy/annotate');
  const g = (n) => { for (const v of rt._variables) if (v._name === n && v._module === mod) return v._value; };
  const store = g('a2Store'), A = g('a2Anchors');
  const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]');
  return {
    scrollTop: Math.round(pane.scrollTop),
    rows: store.all().map((r) => {
      const loc = A.locate(r.anchor);
      const x = A.resolve(r.anchor);
      return `${r.id.padEnd(14)} host=${loc.hostNode ? (loc.hostNode.getAttribute('cell') || 'unnamed') : 'NONE'}` +
        ` connected=${loc.hostNode ? loc.hostNode.isConnected : '-'}` +
        ` rung=${x && x.rung}${x && x.adrift ? ' ADRIFT(' + x.why + ')' : ''}`;
    })
  };
});

for (const y of [0, 900, 1700, 2600, 3500]) {
  await page.evaluate((n) => {
    document.querySelector('.lp2-pane[data-module="@tomlarkworthy/annotate"]').scrollTop = n;
  }, y);
  await page.waitForTimeout(700);
  const r = await report();
  console.log(`=== scrollTop ${r.scrollTop} ===\n` + r.rows.join('\n'));
}
await browser.close();
