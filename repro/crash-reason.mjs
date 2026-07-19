// Capture the renderer's stderr/crash reason when the V8 CPU profiler is sampling during reload.
// usage: node repro/crash-reason.mjs <file.html>
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'repro/base.html');
const url = `file://${file}#view=S100(@tomlarkworthy/lopecode-live-2026)`;

const browser = await chromium.launch({
  headless: false,
  args: ['--enable-logging=stderr', '--v=1', '--disable-crashpad', '--no-sandbox'],
  env: { ...process.env, CHROME_LOG_FILE: '/tmp/lope-chrome.log' },
});
const ctx = await browser.newContext();
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
let crashed = false;
page.on('crash', () => { crashed = true; console.log('!!! PAGE CRASH'); });

try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch {}
await page.waitForTimeout(3000);

// Same thing the Performance panel does when "JS samples" is on, minus everything else.
await cdp.send('Tracing.start', {
  transferMode: 'ReportEvents',
  traceConfig: { recordMode: 'recordUntilFull', includedCategories: ['-*', 'disabled-by-default-v8.cpu_profiler'] },
});
try { await page.reload({ waitUntil: 'load', timeout: 120000 }); } catch (e) { console.log('reload:', String(e).slice(0, 200)); }
await page.waitForTimeout(6000);
console.log(crashed ? 'RESULT: CRASHED' : 'RESULT: survived');
await browser.close().catch(() => {});
