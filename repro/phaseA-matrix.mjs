// Deterministic probe: V8 CPU profiler running across a COLD load. Crash or not?
// usage: node repro/phaseA-matrix.mjs <url> [<url> ...]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;

const CATS = { transferMode: 'ReportEvents', traceConfig: { recordMode: 'recordUntilFull', includedCategories: ['-*', 'disabled-by-default-v8.cpu_profiler'] } };

async function run(url) {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  let crashed = false;
  page.on('crash', () => { crashed = true; });
  try { await page.goto('about:blank'); } catch {}
  try { await cdp.send('Tracing.start', CATS); } catch {}
  try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(8000);
  await browser.close().catch(() => {});
  return crashed;
}

for (const u of process.argv.slice(2)) {
  const label = u.replace(/^file:\/\/.*\//, '');
  const c = await run(u);
  console.log(`${c ? 'CRASH  ' : 'ok     '} ${label}`);
}
