// Fragment navigation is silently dropped on the opaque origin a fork lives on (blob:null), so
// every `location.hash =` intent is lost there. This drives the real ☰ → Fork (new tab) path and
// exercises the three entry points that write one — the ⌘K palette, the `+` new-module popover and
// quick_start's module-list aside links — in the parent AND in the fork. The parent run is the
// control: a failure there is a regression, a failure only in the fork is this bug.
import { chromium } from 'playwright';
import { resolve } from 'path';

const target = resolve(process.argv[2] || 'lopecode/notebooks/quick_start.html');
const FLAGS = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];

const results = [];
const check = (label, pass, detail = '') => {
  results.push({ label, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const tabs = p => p.evaluate(() => [...document.querySelectorAll('.lp2-tabs button')].map(b => b.textContent.trim().replace(/×$/, '')));

// ⌘K → type a module name → Enter → that module gets a tab
const palette = async (p, where, mod) => {
  const before = await tabs(p);
  await p.keyboard.press('Meta+k');
  await p.waitForTimeout(1000);
  const opened = await p.evaluate(() => {
    const o = document.querySelector('#lopecode-command-palette, [class*=command-palette]');
    return !!o && getComputedStyle(o).display !== 'none' && o.offsetHeight > 0;
  });
  check(`${where}: ⌘K opens the palette`, opened);
  if (!opened) return;
  await p.keyboard.type(mod.split('/').pop(), { delay: 25 });
  await p.waitForTimeout(900);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(2500);
  const after = await tabs(p);
  check(`${where}: palette opens ${mod} as a tab`, after.includes(mod.split('/').pop()) && !before.includes(mod.split('/').pop()),
    `${before.length} → ${after.length} tabs`);
};

// `+` tab → type a new module name → Enter → the module is created AND surfaces as a tab
const addModule = async (p, where, name) => {
  const before = await tabs(p);
  await p.evaluate(() => [...document.querySelectorAll('.lp2-tabs button')].find(b => b.textContent.trim() === '+').click());
  await p.waitForTimeout(600);
  await p.keyboard.type(name, { delay: 25 });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(2500);
  const after = await tabs(p);
  const leaf = name.split('/').pop();
  check(`${where}: + creates ${name} and opens its tab`, after.includes(leaf) && !before.includes(leaf), after.join(','));
};

// quick_start's module list: clicking an entry docks that module beside the page
const asideLink = async (p, where) => {
  // the links live in the chooser, so make sure its tab is the active one
  await p.evaluate(() => {
    const t = [...document.querySelectorAll('.lp2-tabs button')].find(b => b.textContent.trim().startsWith('blank-notebook'));
    if (t) t.click();
  });
  await p.waitForTimeout(1500);
  const before = await tabs(p);
  // pick a link for a module that is not already a tab, or "docked" is unobservable
  const clicked = await p.evaluate((open) => {
    const a = [...document.querySelectorAll('a.mod')].find((x) => {
      const leaf = decodeURIComponent(x.getAttribute('href') || '').split('/').pop().replace(/^#|=.*$/g, '');
      return !open.some((t) => leaf && t.includes(leaf));
    });
    if (!a) return null;
    a.click();
    return { label: a.textContent.trim(), href: a.getAttribute('href') };
  }, before);
  if (clicked === null) {
    const seen = await p.evaluate(() => [...document.querySelectorAll('a.mod')].map(x => x.getAttribute('href')));
    check(`${where}: module-list aside link`, false, `no unopened link among ${seen.length}: ${seen.slice(0, 6).join(' ')} | tabs ${before.join(',')}`);
    return;
  }
  await p.waitForTimeout(2500);
  const after = await tabs(p);
  check(`${where}: module-list link "${clicked.label}" docks a pane`, after.length > before.length,
    `${clicked.href} · ${before.length} → ${after.length} tabs`);
};

const browser = await chromium.launch({ headless: true, args: FLAGS });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('parent: ' + String(e).slice(0, 130)));
await page.goto(`file://${target}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(20000);

console.log('--- parent (file://) — control');
await palette(page, 'parent', '@tomlarkworthy/themes');
await addModule(page, 'parent', '@user/probe-parent');
await asideLink(page, 'parent');

const newPage = ctx.waitForEvent('page', { timeout: 60000 });
await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const val = n => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const fork = (val('lp2MenuItems') || []).find(i => i.id === 'fork');
  if (!fork) throw new Error('no fork menu item');
  fork.action();
});
const fork = await newPage;
fork.on('pageerror', e => errs.push('fork: ' + String(e).slice(0, 130)));
await fork.waitForLoadState('domcontentloaded').catch(() => {});
await fork.waitForTimeout(25000);
await fork.bringToFront();

console.log(`--- fork (${fork.url().slice(0, 16)}…) — the origin that drops fragment navigation`);
console.log('   location.hash= works here:', await fork.evaluate(() => {
  const before = location.hash;
  window.location.hash = 'probe-write';
  return location.hash !== before;
}));
await palette(fork, 'fork', '@tomlarkworthy/svg-lens');
await addModule(fork, 'fork', '@user/probe-fork');
await asideLink(fork, 'fork');

if (errs.length) { console.log('--- page errors'); errs.slice(0, 8).forEach(e => console.log(' ' + e)); }
const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
await browser.close();
process.exit(failed ? 1 : 0);
