import { chromium } from 'playwright';
import fs from 'fs';
const OUT = '/Users/tom.larkworthy/dev/lopecode-dev/tools/screenshots/foc-viewer';
const FILE = 'file:///Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Feeling_of_Computing.html';
const VIEW = '#view=S100(@tomlarkworthy/foc-chat,@tomlarkworthy/foc-wiki,@tomlarkworthy/foc-demos,@tomlarkworthy/foc-projects,@tomlarkworthy/foc-people)';
fs.mkdirSync(OUT, { recursive: true });
const errors = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });

const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); console.log('shot', n); };
const tab = async (label) => {
  await page.evaluate(l => {
    const t = [...document.querySelector('.lp2-tabs').children].find(n => n.textContent.trim().replace(/\u00d7$/, '') === l);
    t.click();
  }, label);
  await sleep(1500);
};

await page.goto(FILE + VIEW, { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelectorAll('.fc-msg').length > 5, { timeout: 180000 });
await sleep(3000);
console.log('chat header', await page.evaluate(() => document.querySelector('.foc-head .foc-sub').textContent.trim()));
await shot('01-chat');

// thread
await page.waitForSelector('.fc-replies', { timeout: 30000 });
await page.evaluate(() => document.querySelector('.fc-replies').click());
await sleep(1500);
await shot('02-thread');

// search
await page.evaluate(() => { const i = document.querySelector('.foc-input'); i.value = 'malleable'; i.dispatchEvent(new Event('input', { bubbles: true })); });
await sleep(1500);
await shot('03-search');
const nres = await page.evaluate(() => document.querySelectorAll('.fc-msg').length);
console.log('search results', nres);
await page.evaluate(() => { const i = document.querySelector('.foc-input'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
await sleep(800);

await tab('Wiki'); await sleep(2500); await shot('04-wiki');
await tab('Demos'); await shot('05-demos');
await tab('Projects'); await sleep(2000); await shot('06-projects');
await tab('People'); await shot('07-people');

// person page
await page.evaluate(() => {
  const p = [...document.querySelectorAll('.lp2-pane')].find(x => x.dataset.module === '@tomlarkworthy/foc-people');
  p.querySelectorAll('.fpe-row')[2].click();
});
await sleep(2000);
await shot('08-person');

// claim dialog
const claimed = await page.evaluate(() => {
  const p = [...document.querySelectorAll('.lp2-pane')].find(x => x.dataset.module === '@tomlarkworthy/foc-people');
  const btn = [...p.querySelectorAll('button,a')].find(n => /claim/i.test(n.textContent));
  if (!btn) return null; btn.click(); return btn.textContent.trim();
});
await sleep(1200);
await shot('09-claim');
console.log('claim button', claimed);

// annotate: chat tab
await tab('Chat'); await sleep(1500);
const armAnnotate = async () => {
  await page.evaluate(() => document.querySelector('.lp2-burger').click());
  await sleep(500);
  await page.evaluate(() => [...document.querySelectorAll('.lp2-menu-item')].find(n => /Annotate/.test(n.textContent)).click());
  await sleep(1200);
};
await armAnnotate();
await page.mouse.click(600, 300);
await sleep(1500);
await shot('10-annotate-chat');
await tab('Demos'); await sleep(1200);
await armAnnotate();
await page.mouse.click(600, 300);
await sleep(1500);
await shot('11-annotate-demos');
const anns = await page.evaluate(() => {
  const rt = window.__ojs_runtime; const o = [];
  for (const [id, m] of rt.mains) for (const n of m._scope.keys()) if (/^annotation_a/.test(n)) o.push(id + '::' + n);
  return o;
});
console.log('annotations placed', JSON.stringify(anns));

// permalink, fresh load, no cc
const PERM = FILE + VIEW + '&open=@tomlarkworthy/foc-chat&foc=3msvih7djjbh2&msg=3mufviaosjl22';
const p2 = await ctx.newPage();
const errors2 = [];
p2.on('pageerror', e => errors2.push('pageerror: ' + e.message));
p2.on('console', m => { if (m.type() === 'error') errors2.push('console: ' + m.text().slice(0, 200)); });
await p2.goto(PERM, { waitUntil: 'load' });
await p2.waitForFunction(() => document.querySelectorAll('.fc-msg').length > 5, { timeout: 180000 });
await sleep(4000);
await p2.screenshot({ path: `${OUT}/12-permalink.png` });
const hl = await p2.evaluate(() => {
  const n = document.querySelector('.fc-msg.hit');
  return { found: !!n, cls: n && n.className, thread: !!document.querySelector('.fc-thread'), text: n && n.textContent.trim().slice(0, 60), cc: location.hash.includes('cc=') };
});
console.log('permalink highlight', JSON.stringify(hl));
console.log('ERRORS page1', JSON.stringify(errors, null, 1));
console.log('ERRORS page2', JSON.stringify(errors2, null, 1));
await b.close();
