// Which pages crash under the V8 CPU profiler during a reload?
// usage: node repro/matrix.mjs <url> [<url> ...]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;

async function trial(url, label) {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  let crashed = false;
  page.on('crash', () => { crashed = true; });
  try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch (e) { console.log('  goto:', String(e).slice(0, 120)); }
  await page.waitForTimeout(3000);
  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { recordMode: 'recordUntilFull', includedCategories: ['-*', 'disabled-by-default-v8.cpu_profiler'] },
  });
  try { await page.reload({ waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(6000);
  console.log(`${crashed ? 'CRASH  ' : 'ok     '} ${label}`);
  await browser.close().catch(() => {});
  return crashed;
}

for (const u of process.argv.slice(2)) {
  const label = u.length > 90 ? '…' + u.slice(-88) : u;
  try { await trial(u, label); } catch (e) { console.log('ERR', label, String(e).slice(0, 140)); }
}
