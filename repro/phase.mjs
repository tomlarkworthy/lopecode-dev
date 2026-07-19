// Which phase does the V8 CPU profiler crash on? Each condition repeated N times.
// A: profiler on, FIRST load of the notebook (from about:blank)
// B: notebook loaded, THEN profiler on, then idle (no navigation)
// C: notebook loaded, profiler on, then reload  (the known-bad case)
// D: notebook loaded, profiler on, then navigate AWAY to about:blank (teardown only)
// usage: node repro/phase.mjs <file.html> [reps]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';

const url = 'file://' + path.resolve(process.argv[2] || 'repro/base.html');
const reps = Number(process.argv[3] || 4);
const CATS = { transferMode: 'ReportEvents', traceConfig: { recordMode: 'recordUntilFull', includedCategories: ['-*', 'disabled-by-default-v8.cpu_profiler'] } };

async function run(phase) {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  let crashed = false;
  page.on('crash', () => { crashed = true; });
  const go = async (u) => { try { await page.goto(u, { waitUntil: 'load', timeout: 120000 }); } catch {} };

  try {
    if (phase === 'A') {
      await go('about:blank');
      await cdp.send('Tracing.start', CATS);
      await go(url);
      await page.waitForTimeout(8000);
    } else {
      await go(url);
      await page.waitForTimeout(3000);
      await cdp.send('Tracing.start', CATS);
      if (phase === 'B') await page.waitForTimeout(15000);
      if (phase === 'C') { try { await page.reload({ waitUntil: 'load', timeout: 120000 }); } catch {} await page.waitForTimeout(6000); }
      if (phase === 'D') { await go('about:blank'); await page.waitForTimeout(6000); }
    }
  } catch (e) { /* crash makes CDP calls throw */ }
  await browser.close().catch(() => {});
  return crashed;
}

for (const phase of ['A', 'B', 'C', 'D']) {
  let n = 0;
  for (let i = 0; i < reps; i++) if (await run(phase)) n++;
  console.log(`phase ${phase}: ${n}/${reps} crashed`);
}
