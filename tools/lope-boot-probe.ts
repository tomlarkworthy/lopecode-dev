#!/usr/bin/env bun
/**
 * lope-boot-probe.ts - Repeated cold-load probe: does the notebook boot, and does it crash?
 *
 * The instrument for load/boot glitches. Two things it does that an ad-hoc script won't:
 *   - REPEATS each url, so a flaky signal reports as a rate (3/6) instead of masquerading as clean
 *   - ASSERTS the page actually booted (--min-nodes), so a variant that silently fails to load
 *     can't read as "ok" during a bisect
 *
 * --trace-categories starts a CDP trace across the load, which is how DevTools-instrumentation
 * bugs get tested: `--trace-categories disabled-by-default-v8.cpu_profiler` reproduces the
 * Performance-panel "Aw, Snap" (V8 CPU profiler sampling while a Web Audio graph starts).
 *
 * Timing matters: the profiler must already be running when the page loads. --phase controls this.
 *
 * Usage:
 *   bun tools/lope-boot-probe.ts <url...> [--runs 6] [--min-nodes 500] [--settle 6000]
 *                                         [--trace-categories a,b] [--phase load|reload|idle]
 *                                         [--headed] [--json out.json]
 *
 * Exit code is non-zero if any url crashed or failed to boot.
 */
import { chromium } from 'playwright';
import fs from 'fs';

function parseArgs(argv: string[]) {
  const a = argv.slice(2);
  const o: any = { urls: [], runs: 3, minNodes: 0, settle: 6000, categories: null, phase: 'load', headed: false, json: null };
  for (let i = 0; i < a.length; i++) {
    const arg = a[i];
    if (arg === '--runs') o.runs = parseInt(a[++i], 10);
    else if (arg === '--min-nodes') o.minNodes = parseInt(a[++i], 10);
    else if (arg === '--settle') o.settle = parseInt(a[++i], 10);
    else if (arg === '--trace-categories') o.categories = a[++i];
    else if (arg === '--phase') o.phase = a[++i];
    else if (arg === '--headed') o.headed = true;
    else if (arg === '--json') o.json = a[++i];
    else if (!arg.startsWith('--')) o.urls.push(a[i]);
  }
  if (!o.urls.length) {
    console.error('Usage: bun tools/lope-boot-probe.ts <url...> [--runs n] [--min-nodes n] [--trace-categories a,b] [--phase load|reload|idle]');
    process.exit(1);
  }
  // bare paths are convenient; file:// is what the runtime needs
  o.urls = o.urls.map((u: string) => (/^[a-z]+:/.test(u) ? u : 'file://' + fs.realpathSync(u)));
  return o;
}

async function probeOnce(url: string, opts: any) {
  // headless:false — Web Audio and rAF behave differently headless, and this tool exists to
  // reproduce what the user sees in a real window.
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);

  let crashed = false;
  page.on('crash', () => { crashed = true; });
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

  const startTrace = async () => {
    if (!opts.categories) return;
    try {
      await cdp.send('Tracing.start', {
        transferMode: 'ReportEvents',
        traceConfig: { recordMode: 'recordUntilFull', includedCategories: ['-*', ...opts.categories.split(',')] },
      });
    } catch (e) { console.error('  Tracing.start failed:', String(e).slice(0, 120)); }
  };
  const goto = async (u: string) => { try { await page.goto(u, { waitUntil: 'load', timeout: 120000 }); } catch { /* crash/timeout handled via flags */ } };

  if (opts.phase === 'load') {
    await goto('about:blank');
    await startTrace();               // instrumentation must precede the load
    await goto(url);
  } else if (opts.phase === 'reload') {
    await goto(url);
    await page.waitForTimeout(3000);
    await startTrace();
    try { await page.reload({ waitUntil: 'load', timeout: 120000 }); } catch {}
  } else {                            // idle: page fully up before instrumentation
    await goto(url);
    await page.waitForTimeout(opts.settle);
    await startTrace();
  }
  await page.waitForTimeout(opts.settle);

  let nodes = -1;
  if (!crashed) nodes = await page.evaluate(() => document.getElementsByTagName('*').length).catch(() => -1);
  await browser.close().catch(() => {});

  return { crashed, nodes, booted: !crashed && nodes >= opts.minNodes, pageErrors };
}

const opts = parseArgs(process.argv);
const results: any[] = [];
let bad = false;

for (const url of opts.urls) {
  const runs: any[] = [];
  for (let i = 0; i < opts.runs; i++) runs.push(await probeOnce(url, opts));
  const crashes = runs.filter((r) => r.crashed).length;
  const booted = runs.filter((r) => r.booted).length;
  const nodeCounts = [...new Set(runs.map((r) => r.nodes))].join(',');
  const label = url.replace(/^file:\/\/.*\//, '');
  const flag = crashes || booted < opts.runs ? 'FAIL' : 'ok  ';
  console.log(`${flag}  crash ${crashes}/${opts.runs}  boot ${booted}/${opts.runs}  nodes=${nodeCounts}  ${label}`);
  const errs = [...new Set(runs.flatMap((r) => r.pageErrors))].slice(0, 3);
  for (const e of errs) console.log(`        pageerror: ${e}`);
  if (crashes || booted < opts.runs) bad = true;
  results.push({ url, runs: opts.runs, crashes, booted, nodeCounts, pageErrors: errs });
}

if (opts.minNodes === 0) console.log('\nnote: --min-nodes not set, so "boot" only means "did not crash"; set it to catch variants that load but never boot');
if (opts.json) { fs.writeFileSync(opts.json, JSON.stringify(results, null, 2)); console.log(`Wrote ${opts.json}`); }
process.exit(bad ? 1 : 0);
