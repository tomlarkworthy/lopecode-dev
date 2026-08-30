// Why does the quick_start chooser have no a.mod links inside a fork? Compare parent vs fork.
import { chromium } from 'playwright';
import { resolve } from 'path';

const target = resolve(process.argv[2] || 'scratch/qs-palette-fix.html');
const FLAGS = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];

const look = p => p.evaluate(() => {
  const rt = window.__ojs_runtime;
  const out = { tabs: [...document.querySelectorAll('.lp2-tabs button')].map(b => b.textContent.trim()), errs: [] };
  for (const v of rt._variables) {
    if (!v._name) continue;
    if (['gallery', 'catalogue', 'linkTo', 'navigate', 'drawings', 'templates', 'bundleSize'].includes(v._name))
      out[v._name] = v._value === undefined ? 'PENDING/ERR' : String(v._value).slice(0, 40);
    const n = v._observer && v._observer._node;
    const t = n && n.textContent || '';
    if (/RuntimeError|is not defined/.test(t)) out.errs.push(`${v._name}: ${t.slice(0, 90)}`);
  }
  out.aMod = document.querySelectorAll('a.mod').length;
  out.qs = document.querySelectorAll('.qs').length;
  return out;
});

const browser = await chromium.launch({ headless: true, args: FLAGS });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
await page.goto(`file://${target}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(20000);
console.log('PARENT', JSON.stringify(await look(page), null, 1));

const newPage = ctx.waitForEvent('page', { timeout: 60000 });
await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const val = n => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  (val('lp2MenuItems') || []).find(i => i.id === 'fork').action();
});
const fork = await newPage;
const errs = [];
fork.on('pageerror', e => errs.push(String(e).slice(0, 130)));
await fork.waitForLoadState('domcontentloaded').catch(() => {});
await fork.waitForTimeout(25000);
await fork.bringToFront();
console.log('FORK', JSON.stringify(await look(fork), null, 1));
console.log('fork page errors:', [...new Set(errs)].slice(0, 6));
await browser.close();
