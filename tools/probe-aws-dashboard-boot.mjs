// Does the SAVED aws-dashboard.html boot the cw-share-auth login form from disk?
import { chromium } from 'playwright';

const url = 'file://' + process.cwd() + '/lopebooks/notebooks/@tomlarkworthy_aws-dashboard.html';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));

await page.goto(url);
await page.waitForTimeout(6000);

const res = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const m = rt?.mains?.get('@tomlarkworthy/cw-share-auth');
  const out = { moduleBooted: !!m };
  if (m) {
    out.cells = [...(m._scope ? m._scope.keys() : [])];
    try { out.tokenStoreOk = typeof (await m.value('tokenStore')).save === 'function'; } catch (e) { out.tokenStoreOk = 'ERR ' + e.message; }
    try {
      const cfg = (await m.value('parseShareLink'))(await m.value('defaultShareLink'));
      out.parsedMode = cfg.mode; out.parsedAccount = cfg.accountId;
    } catch (e) { out.parseErr = e.message; }
  }
  out.passwordFields = document.querySelectorAll('input[type=password]').length;
  out.signInButton = [...document.querySelectorAll('button')].some((b) => b.textContent === 'Sign in');
  return out;
});
console.log(JSON.stringify(res, null, 2));
console.log('console errors:', errors.length ? errors.slice(0, 6) : 'none');
await browser.close();
