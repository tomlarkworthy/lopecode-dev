// Spot-check that swept consumers still boot: open each notebook, count cells whose observer
// rejected, and report the distinct messages. A sweep that broke an import shows up here.
import { chromium } from 'playwright';
import { resolve } from 'path';

const files = process.argv.slice(2);
const FLAGS = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
const browser = await chromium.launch({ headless: true, args: FLAGS });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

for (const f of files) {
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 110)));
  await p.goto(`file://${resolve(f)}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForTimeout(15000);
  const r = await p.evaluate(() => {
    const rt = window.__ojs_runtime;
    if (!rt) return { noRuntime: true };
    const bad = [];
    for (const v of rt._variables) {
      const n = v._observer && v._observer._node;
      const t = n && n.textContent || '';
      if (/RuntimeError|is not defined/.test(t)) bad.push(`${v._name}: ${t.slice(0, 80)}`);
    }
    return { mains: rt.mains ? rt.mains.size : 0, bad: [...new Set(bad)].slice(0, 5), badCount: bad.length };
  });
  console.log(`${f}\n  ${JSON.stringify(r)}${errs.length ? '\n  pageerrors: ' + [...new Set(errs)].slice(0, 2).join(' | ') : ''}`);
  await p.close();
}
await browser.close();
