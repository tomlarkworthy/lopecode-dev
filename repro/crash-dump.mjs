// Launch Chromium ourselves (crash reporting intact so macOS ReportCrash captures the renderer),
// drive it over CDP, and loop reloads with the V8 CPU profiler sampling until it crashes.
// usage: node repro/crash-dump.mjs <file.html> [maxAttempts]
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.argv[2] || 'repro/base.html');
const maxAttempts = Number(process.argv[3] || 12);
const url = `file://${file}`;
const exe = chromium.executablePath();
const profile = '/tmp/lope-crashdump-profile';
fs.rmSync(profile, { recursive: true, force: true });

const proc = spawn(exe, [
  `--user-data-dir=${profile}`,
  '--remote-debugging-port=9444',
  '--no-first-run', '--no-default-browser-check',
  '--allow-file-access-from-files',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
const stderrTail = [];
proc.stderr.on('data', d => { const s = String(d); stderrTail.push(s); if (stderrTail.length > 400) stderrTail.shift(); });

await new Promise(r => setTimeout(r, 8000));
const browser = await chromium.connectOverCDP('http://127.0.0.1:9444');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0] || await ctx.newPage();
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
  } catch (e) { console.log('tracing start:', String(e).slice(0, 120)); }
  try { await page.reload({ waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(5000);
  console.log(`attempt ${i}: ${crashed ? 'CRASH' : 'ok'}`);
  if (crashed) break;
  try { await cdp.send('Tracing.end'); } catch {}
  await page.waitForTimeout(1500);
}

console.log('--- stderr tail ---');
console.log(stderrTail.join('').split('\n').filter(l =>
  /check failed|fatal|received signal|SIGILL|SIGSEGV|SIGTRAP|abort|DCHECK|# |v8::|profiler/i.test(l)
).slice(-40).join('\n') || '(nothing matched)');

proc.kill('SIGKILL');
process.exit(crashed ? 1 : 0);
