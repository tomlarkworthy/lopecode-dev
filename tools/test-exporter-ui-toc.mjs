#!/usr/bin/env node
// Verify the redesigned exporter-3 header (fork-notebook link + "options" details)
// and that running the exporter renders a linked table of contents.
import { chromium } from 'playwright';
import path from 'path';

const NB = path.resolve('lopebooks/notebooks/@tomlarkworthy_virtual-monorepo.html');
const HASH = '#view=R100(S60(@tomlarkworthy/virtual-monorepo),S40(@tomlarkworthy/exporter-3))';
const url = 'file://' + NB + HASH;
const FLAGS = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
const browser = await chromium.launch({ headless: true, args: FLAGS });
const page = await (await browser.newContext()).newPage();
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('#lopepage-2 .moldbook-exporter', { timeout: 30000 });
await page.waitForTimeout(2500);

const header = await page.evaluate(() => {
  const link = document.querySelector('.moldbook-exporter .moldbook-target');
  const hint = document.querySelector('.moldbook-exporter .moldbook-options-hint');
  return {
    linkText: link?.textContent?.trim() ?? null,
    linkHref: link?.getAttribute('href') ?? null,
    hint: hint?.textContent?.trim() ?? null,
  };
});
console.log('header:', JSON.stringify(header));

// click Download to trigger a run and generate feedback/TOC
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.moldbook-exporter button')].find(b => /download/i.test(b.textContent));
  btn?.click();
}).catch(() => {});
await page.waitForTimeout(4000);

const toc = await page.evaluate(() => {
  // links must live INSIDE the report table's id cells, not as a separate list
  const inTable = [...document.querySelectorAll('.moldbook-exporter table td a')]
    .filter(a => (a.getAttribute('href') || '').includes('open=@'))
    .map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') }));
  // open-links that are neither in a table cell nor the header "fork notebook" link
  const strayLists = [...document.querySelectorAll('.moldbook-exporter a[href*="open=@"]')]
    .filter(a => !a.closest('td') && !a.classList.contains('moldbook-target')).length;
  return { count: inTable.length, sample: inTable.slice(0, 4), strayLinksOutsideTable: strayLists };
});
console.log('toc:', JSON.stringify(toc, null, 2));

await page.screenshot({ path: 'tools/screenshots/exporter-toc.png' });
console.log('screenshot -> tools/screenshots/exporter-toc.png');

const ok = header.linkText === 'fork notebook'
  && (header.linkHref || '').includes('open=@tomlarkworthy/exporter-3')
  && header.hint === 'options'
  && toc.count > 0 && toc.strayLinksOutsideTable === 0;
await browser.close();
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
