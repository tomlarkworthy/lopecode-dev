// The contents list is only worth having if every entry lands somewhere. Builds a real fork, opens
// it, and checks each link resolves to a heading in THIS notebook and that clicking one scrolls.
import { chromium } from 'playwright';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)));
await p.goto(`file://${resolve('lopecode/notebooks/quick_start.html')}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(25000);
const html = await p.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const templates = val('templates'), spawn = val('spawnNotebook');
  const t = templates.find((x) => x.id === 'blank');
  const { html } = await spawn({ template: t, name: '@user/toc', title: 'TOC probe',
    modules: val('catalogue').optional.map((m) => m.id), tutorial: true, theme: null });
  return html;
});
const out = resolve('scratch/toc-probe.html');
writeFileSync(out, html);
await p.goto(`file://${out}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(22000);
const r = await p.evaluate(() => {
  const nav = document.querySelector('nav');
  if (!nav) return { error: 'no contents cell rendered' };
  const links = [...nav.querySelectorAll('a')];
  const heads = [...(nav.closest('.observablehq-root') || document).querySelectorAll('h2, h3')]
    .map((h) => h.textContent.trim());
  const dead = links.map((a) => a.textContent.trim()).filter((t) => !heads.includes(t));
  return { links: links.length, headings: heads.length, dead, first: links[0]?.textContent.trim(),
    last: links[links.length - 1]?.textContent.trim(),
    navIsSecond: [...document.querySelectorAll('.observablehq')].findIndex((n) => n.contains(nav)) };
});
if (r.error) { console.log('FAIL', r.error); process.exit(1); }
// click the last entry and confirm the page moved to it
const scrolled = await p.evaluate(async () => {
  const nav = document.querySelector('nav');
  const a = [...nav.querySelectorAll('a')].pop();
  const before = window.scrollY + (document.querySelector('.lp2-pane-body')?.scrollTop ?? 0);
  a.click();
  await new Promise((r) => setTimeout(r, 3000));
  const target = [...(nav.closest('.observablehq-root') || document).querySelectorAll('h2, h3')]
    .find((n) => n.textContent.trim() === a.textContent.trim());
  const box = target.getBoundingClientRect();
  return { movedIntoView: box.top > -50 && box.top < window.innerHeight, top: Math.round(box.top) };
});
console.log(`contents: ${r.links} links over ${r.headings} headings, position ${r.navIsSecond}`);
console.log(`first "${r.first}"  last "${r.last}"`);
console.log(`dead links: ${r.dead.length ? r.dead.join(', ') : 'none'}`);
console.log(`clicking the last entry brings it into view: ${scrolled.movedIntoView} (top ${scrolled.top})`);
await b.close();
process.exit(r.dead.length === 0 && r.links > 8 && scrolled.movedIntoView ? 0 : 1);
