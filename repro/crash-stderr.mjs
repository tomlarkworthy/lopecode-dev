// Loop reloads under the V8 CPU profiler until the renderer dies, then dump the browser's
// raw stderr tail (V8 CHECK failures print "# Fatal error in ..." before trapping).
// usage: node repro/crash-stderr.mjs <file.html> [maxAttempts]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'repro/base.html');
const maxAttempts = Number(process.argv[3] || 10);
const url = `file://${file}`;

const lines = [];
const browser = await chromium.launch({
  headless: false,
  // keep crash reporting + stack traces; playwright disables them by default
  ignoreDefaultArgs: ['--disable-breakpad'],
  args: ['--enable-crash-reporter', '--enable-logging=stderr'],
  logger: {
    isEnabled: () => true,
    log: (name, sev, message) => { lines.push(`[${name}/${sev}] ${message}`); if (lines.length > 3000) lines.shift(); },
  },
});
const ctx = await browser.newContext();
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
let crashed = false;
page.on('crash', () => { crashed = true; });

for (let i = 1; i <= maxAttempts && !crashed; i++) {
  try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(2500);
  try {
    await cdp.send('Tracing.start', {
      transferMode: 'ReportEvents',
      traceConfig: { recordMode: 'recordUntilFull', includedCategories: ['-*', 'disabled-by-default-v8.cpu_profiler'] },
    });
  } catch {}
  const mark = lines.length;
  try { await page.reload({ waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(5000);
  console.log(`attempt ${i}: ${crashed ? 'CRASH' : 'ok'}`);
  if (crashed) {
    const since = lines.slice(mark);
    const interesting = since.filter(l => !/Histogram:|VERBOSE1/.test(l));
    console.log('--- non-verbose stderr since reload (last 60) ---');
    console.log(interesting.slice(-60).join('\n'));
    break;
  }
  try { await cdp.send('Tracing.end'); } catch {}
  await page.waitForTimeout(1000);
}

await browser.close().catch(() => {});
process.exit(crashed ? 1 : 0);
