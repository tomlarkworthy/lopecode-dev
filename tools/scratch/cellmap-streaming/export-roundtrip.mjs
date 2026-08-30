// Export a notebook page via its in-page exporter-3 and save the book to disk.
//   node export-roundtrip.mjs <in.html> <out.html>
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const [file, out] = process.argv.slice(2);
const server = spawn('bun', ['scratch/rmbt/slow-serve.ts', file, '50000000', '8127'], {
  stdio: ['ignore', 'pipe', 'inherit']
});
await new Promise((r) => server.stdout.once('data', r));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:8127/', { waitUntil: 'load' });
await page.waitForTimeout(3000);
const res = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  let fn = null;
  for (let i = 0; i < 100 && !fn; i++) {
    for (const v of rt._variables) if (v._name === 'exportToHTML' && typeof v._value === 'function') fn = v._value;
    if (!fn) await new Promise((r) => setTimeout(r, 100));
  }
  if (!fn) return { err: 'no exportToHTML' };
  const book = await fn({ mains: rt.mains });
  return { source: book.source ?? book };
});
if (res.err || typeof res.source !== 'string') { console.error('FAIL', res.err); process.exit(1); }
fs.writeFileSync(out, res.source);
console.log('wrote', out, res.source.length, 'bytes');
await browser.close();
server.kill();
