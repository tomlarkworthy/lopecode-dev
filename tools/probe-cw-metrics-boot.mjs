// Does the SAVED notebook boot the cw-metrics render layer and pass its self-test?
// Catches the silent cell-drop failure mode that only shows up after a reload.
import { chromium } from 'playwright';

const file = process.cwd() + '/lopebooks/notebooks/@tomlarkworthy_aws-dashboard.html';
const url = 'file://' + file + '#view=R100(S100(@tomlarkworthy/cw-metrics))';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });

await page.goto(url);
await page.waitForTimeout(9000);

const res = await page.evaluate(() => {
  const m = window.__ojs_runtime?.mains?.get('@tomlarkworthy/cw-metrics');
  const out = { booted: !!m, cells: m ? [...m._scope.keys()] : [] };
  const text = document.body.innerText || '';
  const hit = text.match(/render path self-test — (\d+)\/(\d+) passing/);
  out.selfTest = hit ? { passed: +hit[1], total: +hit[2] } : null;
  out.chartSvgs = document.querySelectorAll('svg.plot-d6a7b5, svg[class*="plot-"]').length;
  out.deniedPanelShown = /AccessDenied/.test(text);
  return out;
});

console.log(JSON.stringify(res, null, 2));
console.log('console errors:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();

const bad = !res.booted || !res.selfTest || res.selfTest.passed !== res.selfTest.total;
process.exit(bad ? 1 : 0);
