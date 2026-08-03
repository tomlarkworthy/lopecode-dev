// Reproduce fork-in-Safari: streaming gate (el.nextSibling + __lopeStreaming sentinel) loaded
// via blob: URL (fork) vs file:// (download) in WebKit (== Safari engine).
import { webkit } from 'playwright';
import { writeFileSync, appendFileSync } from 'node:fs';

const RESULTS = '/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/webkit-repro-results.txt';
writeFileSync(RESULTS, '');
const out = (s) => { appendFileSync(RESULTS, s + '\n'); };

const FILLER = (tag) => Array.from({ length: 250 }, (_, i) =>
  `<script type="text/plain" id="${tag}-${i}" data-mime="application/javascript">// padding ${'x'.repeat(1500)}</scr`+`ipt>`
).join('\n');

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>repro</title></head>
<body>
<script id="networking_script">
  window.__bootlog = [];
  const log = (m) => { window.__bootlog.push([performance.now()|0, m]); };
  window.__lopeStreaming = true;
  function __isComplete(el) { return !!el && (el.nextSibling != null || !window.__lopeStreaming); }
  async function __waitForId(id) {
    let el = document.getElementById(id);
    let spins = 0;
    while (window.__lopeStreaming && !__isComplete(el)) {
      await new Promise((r) => setTimeout(r, 16));
      el = document.getElementById(id);
      if (++spins > 800) { log("TIMEOUT " + id); return; }
    }
    log("resolved " + id + " streaming=" + window.__lopeStreaming + " nextSib=" + (el && el.nextSibling != null));
  }
  window.__waitForId = __waitForId;
  log("networking parsed");
</scr`+`ipt>

<script id="main">
(async () => {
  window.__bootlog.push([performance.now()|0, "main start"]);
  await window.__waitForId("late");
  await window.__waitForId("content-module");
  window.__bootlog.push([performance.now()|0, "BOOT DONE"]);
  document.body.setAttribute("data-boot", "done");
})().catch((e) => { window.__bootlog.push([0, "boot error " + e]); });
</scr`+`ipt>

${FILLER('a')}
<script type="text/plain" id="late" data-mime="application/javascript">// the late dep</scr`+`ipt>
${FILLER('b')}
<script type="text/plain" id="content-module" data-mime="application/javascript">// last main</scr`+`ipt>

<script id="streaming_sentinel">window.__lopeStreaming = false; window.__bootlog && window.__bootlog.push([performance.now()|0, "SENTINEL"]);</scr`+`ipt>
</body></html>`;

const filePath = '/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/webkit-streaming-repro.html';
writeFileSync(filePath, html);

out('launching webkit...');
const browser = await webkit.launch();
out('launched ver=' + browser.version());

async function run(mode) {
  out(`\n--- ${mode} ---`);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let crashed = false;
  page.on('crash', () => { crashed = true; out('  PAGE CRASH'); });
  page.on('pageerror', (e) => out('  pageerror: ' + e.message));
  try {
    let target;
    if (mode === 'file') {
      target = 'file://' + filePath;
    } else {
      await page.goto('about:blank');
      target = await page.evaluate((h) => URL.createObjectURL(new Blob([h], { type: 'text/html' })), html);
      out('  blobUrl=' + target);
    }
    out('  goto...');
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 12000 });
    out('  dom loaded');
  } catch (e) {
    out('  goto ERROR: ' + e.message);
  }
  // poll for boot
  let booted = false;
  const start = Date.now();
  while (Date.now() - start < 16000 && !crashed) {
    try { booted = await page.evaluate(() => document.body && document.body.getAttribute('data-boot') === 'done'); }
    catch (e) { out('  eval err: ' + e.message); break; }
    if (booted) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  let logs = [];
  try { logs = await page.evaluate(() => window.__bootlog || []); } catch (e) { out('  log-eval err: ' + e.message); }
  out(`  RESULT ${mode} => ${booted ? 'BOOTED' : 'STUCK'} (${logs.length} log lines)`);
  for (const [t, m] of logs) out(`    ${String(t).padStart(6)}ms  ${m}`);
  await ctx.close();
  return booted;
}

const rFile = await run('file');
const rBlob = await run('blob');
out(`\nSUMMARY: file=${rFile ? 'ok' : 'STUCK'} blob=${rBlob ? 'ok' : 'STUCK'}`);
await browser.close();
process.exit(0);
