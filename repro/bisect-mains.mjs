// Bisect which booted module makes the V8 CPU profiler crash the renderer on reload.
// Rewrites bootconf.json "mains" into variant copies of the notebook, then tests each.
// usage: node repro/bisect-mains.mjs
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('repro/base.html');
const html = fs.readFileSync(SRC, 'utf8');

// bootconf.json lives in a <script id="bootconf.json" ...>{...}</script> block.
// several modules embed the literal string in template code, so pick the block that parses.
const reG = /(<script id="bootconf\.json"[^>]*>)([\s\S]*?)(<\/script>)/g;
let m = null, conf = null;
for (const hit of html.matchAll(reG)) {
  try { conf = JSON.parse(hit[2]); m = hit; break; } catch {}
}
if (!m) throw new Error('bootconf block not found');
const re = new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
console.log('mains:', conf.mains.join(', '));

function variant(name, mains) {
  const c = { ...conf, mains };
  const out = html.replace(re, (_, a, __, b) => a + JSON.stringify(c, null, 2) + b);
  const p = path.resolve(`repro/v-${name}.html`);
  fs.writeFileSync(p, out);
  return p;
}

async function trial(file, label) {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  let crashed = false;
  page.on('crash', () => { crashed = true; });
  const url = `file://${file}`;
  try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(3000);
  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { recordMode: 'recordUntilFull', includedCategories: ['-*', 'disabled-by-default-v8.cpu_profiler'] },
  });
  try { await page.reload({ waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(6000);
  console.log(`${crashed ? 'CRASH  ' : 'ok     '} ${label}`);
  await browser.close().catch(() => {});
  return crashed;
}

// Leave-one-out over the mains.
for (const drop of conf.mains) {
  if (drop === '@tomlarkworthy/bootloader') continue;
  const slug = drop.replace(/[@/]/g, '_');
  const p = variant(`drop${slug}`, conf.mains.filter(x => x !== drop));
  await trial(p, `without ${drop}`);
}
