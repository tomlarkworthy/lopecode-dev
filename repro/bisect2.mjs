// Leave-one-out over bootconf mains, edited surgically (single line), probed with the
// deterministic cold-load + V8 CPU profiler signal.
// usage: node repro/bisect2.mjs [mode]   mode: loo (default) | only
import pw from '/Users/tom.larkworthy/dev/lopecode-dev/node_modules/playwright/index.js';
const { chromium } = pw;
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('repro/base.html');
const html = fs.readFileSync(SRC, 'utf8');
const mode = process.argv[2] || 'loo';

// The real bootconf block is the one whose mains array sits on a single line.
const lineRe = /^\s*"mains": (\[[^\n]*\]),$/m;
const lm = html.match(lineRe);
if (!lm) throw new Error('mains line not found');
const mains = JSON.parse(lm[1]);
console.log('mains:', mains.length, mains.join(', '));

function variant(name, list) {
  const out = html.replace(lineRe, `  "mains": ${JSON.stringify(list)},`);
  if (out === html) throw new Error('no substitution');
  const p = path.resolve(`repro/w-${name}.html`);
  fs.writeFileSync(p, out);
  return p;
}

const CATS = { transferMode: 'ReportEvents', traceConfig: { recordMode: 'recordUntilFull', includedCategories: ['-*', 'disabled-by-default-v8.cpu_profiler'] } };

async function probe(file) {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  let crashed = false;
  page.on('crash', () => { crashed = true; });
  try { await page.goto('about:blank'); } catch {}
  try { await cdp.send('Tracing.start', CATS); } catch {}
  try { await page.goto('file://' + file, { waitUntil: 'load', timeout: 120000 }); } catch {}
  await page.waitForTimeout(8000);
  let nodes = -1;
  if (!crashed) nodes = await page.evaluate(() => document.getElementsByTagName('*').length).catch(() => -1);
  await browser.close().catch(() => {});
  return { crashed, nodes };
}

const jobs = mode === 'only'
  ? mains.filter(m => m !== '@tomlarkworthy/bootloader')
      .map(m => [`only${m.replace(/[@/]/g, '_')}`, ['@tomlarkworthy/bootloader', m], `only ${m}`])
  : mains.filter(m => m !== '@tomlarkworthy/bootloader')
      .map(m => [`drop${m.replace(/[@/]/g, '_')}`, mains.filter(x => x !== m), `without ${m}`]);

for (const [slug, list, label] of jobs) {
  const p = variant(slug, list);
  const { crashed, nodes } = await probe(p);
  console.log(`${crashed ? 'CRASH  ' : 'ok     '} nodes=${String(nodes).padStart(5)}  ${label}`);
}
