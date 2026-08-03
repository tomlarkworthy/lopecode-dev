// Probe: which builtins does a booted lopecode notebook actually expose? (Plot? d3? Inputs?)
import { chromium } from 'playwright';

const url = 'file://' + process.cwd() + '/lopecode/notebooks/@tomlarkworthy_blank-notebook.html';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('[console error]', m.text().slice(0, 200)); });
await page.goto(url);
await page.waitForFunction(() => window.__ojs_runtime, null, { timeout: 30000 });
await page.waitForTimeout(3000);

const res = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const b = rt._builtins;
  const names = b ? [...b.keys()] : null;
  // try actually resolving Plot through a scratch module
  let plotProbe;
  try {
    const m = rt.module();
    const v = m.variable();
    v.define('probe', ['Plot'], (P) => (P ? Object.keys(P).slice(0, 8) : 'falsy'));
    plotProbe = await v._promise.then(() => 'resolved').catch((e) => 'ERR: ' + e.message);
    plotProbe = await m.value('probe').catch((e) => 'ERR: ' + e.message);
  } catch (e) { plotProbe = 'THROW: ' + e.message; }
  return { builtinNames: names, plotProbe };
});
console.log(JSON.stringify(res, null, 2));
await browser.close();
