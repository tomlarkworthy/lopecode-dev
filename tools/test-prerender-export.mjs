#!/usr/bin/env node
// Smoke test: drive virtual-monorepo's exporter-3 UI with the new `prerender`
// toggle ON, capture the downloaded HTML, and verify the prerender block.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const NB = path.resolve(process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_virtual-monorepo.html');
const OUT = path.resolve('tools/prerender-out.html');
const HASH = '#view=R100(S60(@tomlarkworthy/virtual-monorepo),S40(@tomlarkworthy/exporter-3))';
const url = 'file://' + NB + HASH;

// anti-throttle flags so headless mirrors a real, visible browser (rAF not throttled)
const FLAGS = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
const browser = await chromium.launch({ headless: true, args: FLAGS });
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
page.on('console', m => { const t = m.text(); if (/error|prerender|boot/i.test(t)) console.log('  [page]', t); });

console.log('Loading', url);
await page.goto(url, { waitUntil: 'load', timeout: 60000 });

// wait for lopepage-2 to mount and the exporter toggle to appear
await page.waitForSelector('#lopepage-2', { timeout: 30000 });
await page.waitForFunction(() => {
  const labels = [...document.querySelectorAll('#lopepage-2 label, #lopepage-2 .moldbook-exporter')];
  return document.querySelector('#lopepage-2 .moldbook-exporter');
}, { timeout: 30000 });
// let content cells settle
await page.waitForTimeout(2500);

// turn the prerender toggle ON (Inputs.toggle renders a checkbox)
const toggled = await page.evaluate(() => {
  const boxes = [...document.querySelectorAll('.moldbook-exporter input[type=checkbox]')];
  // find the one whose label text mentions prerender
  const cb = boxes.find(b => (b.closest('label')?.textContent || '').toLowerCase().includes('prerender'))
          || boxes[0];
  if (!cb) return 'no-checkbox';
  if (!cb.checked) { cb.click(); }
  return cb.checked ? 'on' : 'off';
});
console.log('prerender toggle:', toggled);

// click Download and capture the file
const [ download ] = await Promise.all([
  page.waitForEvent('download', { timeout: 60000 }),
  page.evaluate(() => {
    const btn = [...document.querySelectorAll('.moldbook-exporter button')]
      .find(b => /download/i.test(b.textContent));
    if (!btn) throw new Error('Download button not found');
    btn.click();
  }),
]);
const tmp = await download.path();
fs.copyFileSync(tmp, OUT);
const html = fs.readFileSync(OUT, 'utf8');
console.log('Wrote', OUT, '(', (html.length / 1e6).toFixed(2), 'MB )');

// --- verifications ---
const bodyIdx = html.indexOf('<body>');
const prerenderIdx = html.indexOf('<div id="lope-prerender"');
const netIdx = html.indexOf('id="networking_script"');
const cleanupIdx = html.indexOf('id="lope-prerender-cleanup"');
const bootconfPrerender = /"prerender":\s*true/.test(html);
const styleIdx = html.indexOf('id="lope-prerender-style"');

// extract prerender text content (rough) to confirm real content baked
const prBlock = prerenderIdx > -1 ? html.slice(prerenderIdx, html.indexOf('id="lope-prerender-cleanup"')) : '';
const textLen = prBlock.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
// Stricter: drop <style> bodies too, so this counts prose a no-JS reader actually sees.
const proseLen = prBlock.replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;

const checks = {
  'prerender div present': prerenderIdx > -1,
  'prerender style present': styleIdx > -1,
  'cleanup script present': cleanupIdx > -1,
  'prerender is BEFORE boot scripts': prerenderIdx > -1 && prerenderIdx < netIdx,
  'prerender is inside <body>': prerenderIdx > bodyIdx,
  'bootconf persists prerender:true': bootconfPrerender,
  // The snapshot must ship as LIGHT DOM so parsers that never run JS read it from source.
  // Isolation is restored at runtime by the cleanup script (attachShadow), not by the parser,
  // so a <template> here would mean the text is invisible to exactly the readers it is for.
  'snapshot is light DOM, not a <template>': !html.includes('<template shadowrootmode'),
  'cleanup script hoists snapshot into a shadow root': /attachShadow/.test(html),
  'prose readable with tags+styles stripped (no JS)': proseLen > 2000,
  // Observable Inputs style themselves from a <style> in document.head. That is outside the
  // snapshot, so a prerendered form used to render as bare browser defaults and restyle on swap.
  'snapshot carries the head styles it needs (Inputs)': /\.__ns__/.test(prBlock),
  'baked visible text content (chars)': textLen > 200,
};
console.log('\n--- checks ---');
let ok = true;
for (const [k, v] of Object.entries(checks)) {
  const pass = k.includes('chars') ? v : !!v;
  if (k.includes('chars')) { console.log(`  ${v ? '✓' : '✗'} ${k}: ${textLen}`); if (!v) ok = false; }
  else { console.log(`  ${v ? '✓' : '✗'} ${k}`); if (!v) ok = false; }
}

// --- second load: confirm the prerender is REMOVED once JS boots ---
console.log('\nReloading exported file to confirm cleanup on boot...');
const page2 = await ctx.newPage();
await page2.goto('file://' + OUT, { waitUntil: 'load', timeout: 60000 });
await page2.waitForSelector('#lopepage-2', { timeout: 30000 });
await page2.waitForTimeout(3000);
const afterBoot = await page2.evaluate(() => ({
  prerenderStillThere: !!document.getElementById('lope-prerender'),
  liveLopepage: !!document.getElementById('lopepage-2'),
  liveCells: document.getElementById('lopepage-2')?.querySelectorAll('.observablehq').length || 0,
}));
console.log('  after boot:', JSON.stringify(afterBoot));
if (afterBoot.prerenderStillThere) { ok = false; console.log('  ✗ prerender NOT removed after boot'); }
else console.log('  ✓ prerender removed after boot');
if (afterBoot.liveCells < 50) { ok = false; console.log('  ✗ live runtime did not render cells:', afterBoot.liveCells); }
else console.log('  ✓ live runtime rendered cells:', afterBoot.liveCells);

await browser.close();
console.log('\n' + (ok ? 'PASS' : 'FAIL'));
process.exit(ok ? 0 : 1);
