// Bisect: which trace category makes the reload crash the renderer?
// usage: node repro/bisect-categories.mjs <file.html>
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'repro/base.html');
const url = `file://${file}#view=S100(@tomlarkworthy/lopecode-live-2026)`;

const CANDIDATES = [
  ['cpu_profiler', ['-*', 'disabled-by-default-v8.cpu_profiler']],
  ['v8.compile', ['-*', 'disabled-by-default-v8.compile']],
  ['timeline.stack', ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline.stack']],
  ['screenshot', ['-*', 'disabled-by-default-devtools.screenshot']],
  ['timeline-basic', ['-*', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'loading']],
  ['v8.execute', ['-*', 'v8.execute']],
];

async function trial(name, categories) {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  let crashed = false, bytes = 0;
  page.on('crash', () => { crashed = true; });
  cdp.on('Tracing.dataCollected', ev => { bytes += JSON.stringify(ev.value || []).length; });

  try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(3000);

  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { recordMode: 'recordUntilFull', includedCategories: categories },
  });
  try { await page.reload({ waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(5000);
  if (!crashed) {
    try {
      const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
      await cdp.send('Tracing.end');
      await Promise.race([done, new Promise(r => setTimeout(r, 20000))]);
    } catch {}
  }
  console.log(`${crashed ? 'CRASH  ' : 'ok     '} ${name.padEnd(16)} traceBytes=${(bytes / 1e6).toFixed(1)}MB`);
  await browser.close().catch(() => {});
  return crashed;
}

for (const [name, cats] of CANDIDATES) {
  try { await trial(name, cats); } catch (e) { console.log(`ERR ${name}:`, String(e).slice(0, 160)); }
}
