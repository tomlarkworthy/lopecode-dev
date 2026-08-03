#!/usr/bin/env bun
/**
 * lope-load-profiler.ts - Profile lopecode notebook load latency in real Chrome.
 *
 * Captures, against navigationStart:
 *   - Navigation timing (DNS, connect, TLS, TTFB, HTML download, DOMContentLoaded, load)
 *   - Resource timing (every sub-request: CDN imports, attachments) with size + duration
 *   - Paint timing (First Paint, First Contentful Paint) and Largest Contentful Paint
 *   - Console phase markers emitted by module-map (module_definition_variables, modules,
 *     resolve_modules, ... submit_summary), high-res timestamped IN THE PAGE.
 *
 * Works on file:// (local baseline) and https:// (remote) URLs so the two are comparable.
 *
 * Usage:
 *   bun tools/lope-load-profiler.ts <url> [--headed] [--timeout 60000] [--runs 1] [--json out.json]
 */
import { chromium } from 'playwright';

function parseArgs(argv: string[]) {
  const a = argv.slice(2);
  const o: any = { url: null, headed: false, timeout: 60000, runs: 1, json: null, channel: null };
  for (let i = 0; i < a.length; i++) {
    const arg = a[i];
    if (arg === '--headed') o.headed = true;
    else if (arg === '--timeout') o.timeout = parseInt(a[++i], 10);
    else if (arg === '--runs') o.runs = parseInt(a[++i], 10);
    else if (arg === '--json') o.json = a[++i];
    else if (arg === '--screenshot') o.screenshot = a[++i];
    else if (arg === '--content-text') o.contentText = a[++i];
    else if (arg === '--channel') o.channel = a[++i];
    else if (!arg.startsWith('--')) o.url = arg;
  }
  if (!o.url) { console.error('Usage: bun tools/lope-load-profiler.ts <url> [--headed] [--timeout ms] [--runs n] [--json out]'); process.exit(1); }
  return o;
}

// Captured inside the page: wrap console.log to timestamp phase markers, and observe paint/LCP.
const initScript = `
  window.__perf = { marks: [], lcp: null };
  const _log = console.log.bind(console);
  console.log = function(...args) {
    try { window.__perf.marks.push({ t: performance.now(), msg: String(args[0]) }); } catch {}
    return _log(...args);
  };
  try {
    new PerformanceObserver((list) => {
      const e = list.getEntries();
      const last = e[e.length - 1];
      if (last) window.__perf.lcp = last.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
`;

// The last phase marker module-map emits; load is effectively "interactive" once it fires.
const FINAL_MARKER = 'submit_summary';

async function profileOnce(url: string, opts: any) {
  const browser = await chromium.launch({ headless: !opts.headed, channel: opts.channel || undefined });
  const context = await browser.newContext();
  await context.addInitScript(initScript);
  const page = await context.newPage();

  // Mirror console markers to a wall-clock list too (fallback / cross-check).
  const consoleLines: { wall: number; text: string }[] = [];
  const t0 = performance.now();
  page.on('console', (m) => consoleLines.push({ wall: performance.now() - t0, text: m.text() }));

  // Capture network-rejected requests and >=400 responses (which attachment/module the load missed).
  const failedReqs: string[] = [];
  const http4xx: string[] = [];
  page.on('requestfailed', (r) => failedReqs.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) http4xx.push(r.status() + ' ' + r.url()); });

  await page.goto(url, { waitUntil: 'commit', timeout: opts.timeout });

  // Wait until the final module-map marker appears, or timeout.
  let sawFinal = false;
  try {
    await page.waitForFunction(
      (marker) => (window as any).__perf?.marks?.some((m: any) => m.msg.includes(marker)),
      FINAL_MARKER,
      { timeout: opts.timeout, polling: 100 }
    );
    sawFinal = true;
  } catch { /* timed out waiting for final marker; still collect what we have */ }

  // Time-to-meaningful-content: when the given text is visibly rendered (in-page hi-res clock).
  let contentT: number | null = null;
  if (opts.contentText) {
    try {
      await page.waitForFunction(
        (t) => !!document.body && document.body.innerText.includes(t),
        opts.contentText,
        { timeout: opts.timeout, polling: 50 }
      );
      contentT = await page.evaluate(() => performance.now());
    } catch { /* content never appeared within timeout */ }
  }

  // Let the full download + trailing network settle so the screenshot shows the final state.
  try { await page.waitForLoadState('networkidle', { timeout: opts.timeout }); } catch {}
  await page.waitForTimeout(300);

  const data = await page.evaluate(() => {
    const nav = (performance.getEntriesByType('navigation')[0] || {}) as PerformanceNavigationTiming;
    const paints = performance.getEntriesByType('paint').map((p: any) => ({ name: p.name, t: p.startTime }));
    const resources = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).map((r) => ({
      name: r.name,
      type: (r as any).initiatorType,
      start: r.startTime,
      duration: r.duration,
      transferSize: r.transferSize,
      encodedBodySize: r.encodedBodySize,
      decodedBodySize: r.decodedBodySize,
    }));
    return {
      nav: {
        startTime: nav.startTime,
        domainLookupStart: nav.domainLookupStart,
        domainLookupEnd: nav.domainLookupEnd,
        connectStart: nav.connectStart,
        secureConnectionStart: nav.secureConnectionStart,
        connectEnd: nav.connectEnd,
        requestStart: nav.requestStart,
        responseStart: nav.responseStart,
        responseEnd: nav.responseEnd,
        domInteractive: nav.domInteractive,
        domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
        loadEventEnd: nav.loadEventEnd,
        transferSize: nav.transferSize,
        encodedBodySize: nav.encodedBodySize,
        decodedBodySize: nav.decodedBodySize,
      },
      paints,
      lcp: (window as any).__perf?.lcp ?? null,
      marks: (window as any).__perf?.marks ?? [],
      resources,
    };
  });

  // DOM cell-error scan: Observable renders cell errors into the page WITHOUT console.error,
  // so a console-only check misses them. Capture them from the rendered DOM.
  const domErrors = await page.evaluate(() => {
    const txt = document.body ? document.body.innerText : '';
    const out: string[] = [];
    for (const line of txt.split('\n')) {
      if (/RuntimeError|Failed to fetch|SyntaxError|is not defined|Unexpected|DVF \d/.test(line)) out.push(line.trim());
    }
    return [...new Set(out)].slice(0, 20);
  });

  const rtLog = await page.evaluate(() => (window as any).__rtLog || []);
  const domProbe = await page.evaluate(() => ({
    plainScripts: document.querySelectorAll('script[type="text/plain"]').length,
    bodyChildren: document.body ? document.body.children.length : -1,
    hasTourBlock: !!document.getElementById('@tomlarkworthy/lopecode-tour'),
    hasDeferredImg: !!document.getElementById('@tomlarkworthy/lopecode-tour/image%402.png'),
  }));

  if (opts.screenshot) await page.screenshot({ path: opts.screenshot, fullPage: false });
  await browser.close();
  const uniq = (a: string[]) => [...new Set(a)];
  return { url, sawFinal, contentT, domErrors, domProbe, rtLog, failedReqs: uniq(failedReqs), http4xx: uniq(http4xx), ...data, consoleLines };
}

function ms(n: number | null | undefined) { return n == null ? '   —  ' : (n).toFixed(0).padStart(6) + 'ms'; }
function kb(n: number | undefined) { return n == null ? '—' : (n / 1024).toFixed(1) + 'KB'; }

function report(r: any) {
  const n = r.nav;
  console.log(`\n=== Load profile: ${r.url} ===`);
  console.log(`final marker (${FINAL_MARKER}) reached: ${r.sawFinal ? 'yes' : 'NO (timed out)'}`);
  console.log(`\n-- Navigation (ms from navigationStart) --`);
  console.log(`  DNS lookup       ${ms(n.domainLookupEnd - n.domainLookupStart)}   (${ms(n.domainLookupStart)} -> ${ms(n.domainLookupEnd)})`);
  console.log(`  TCP connect      ${ms(n.connectEnd - n.connectStart)}`);
  console.log(`  TLS handshake    ${ms(n.secureConnectionStart ? n.connectEnd - n.secureConnectionStart : 0)}`);
  console.log(`  TTFB (req->resp) ${ms(n.responseStart - n.requestStart)}   (responseStart @ ${ms(n.responseStart)})`);
  console.log(`  HTML download    ${ms(n.responseEnd - n.responseStart)}   (${kb(n.encodedBodySize)} enc / ${kb(n.decodedBodySize)} dec, responseEnd @ ${ms(n.responseEnd)})`);
  console.log(`  DOM interactive  @ ${ms(n.domInteractive)}`);
  console.log(`  DOMContentLoaded @ ${ms(n.domContentLoadedEventEnd)}`);
  console.log(`  load event       @ ${ms(n.loadEventEnd)}`);

  console.log(`\n-- Paint --`);
  for (const p of r.paints) console.log(`  ${p.name.padEnd(22)} @ ${ms(p.t)}`);
  console.log(`  largest-contentful-paint @ ${ms(r.lcp)}`);

  console.log(`\n-- Module-map phase markers (in-page high-res, ms from navigationStart) --`);
  let prev = 0;
  for (const m of r.marks) {
    const delta = m.t - prev;
    console.log(`  @ ${ms(m.t)}  (+${delta.toFixed(0).padStart(5)}ms)  ${m.msg}`);
    prev = m.t;
  }
  if (!r.marks.length) console.log('  (no markers captured)');

  // Top sub-resources by duration (the remote-specific cost: CDN imports).
  const res = [...r.resources].sort((a, b) => b.duration - a.duration).slice(0, 15);
  console.log(`\n-- Top sub-resources by duration (${r.resources.length} total) --`);
  let totalTransfer = 0;
  for (const x of r.resources) totalTransfer += x.transferSize || 0;
  for (const x of res) {
    const short = x.name.length > 70 ? '…' + x.name.slice(-69) : x.name;
    console.log(`  ${ms(x.duration)}  ${kb(x.transferSize).padStart(8)}  ${x.type.padEnd(10)} ${short}`);
  }
  console.log(`  sub-resource transfer total: ${kb(totalTransfer)} across ${r.resources.length} requests`);
}

const opts = parseArgs(process.argv);
const all: any[] = [];
for (let i = 0; i < opts.runs; i++) {
  if (opts.runs > 1) console.log(`\n########## RUN ${i + 1}/${opts.runs} ##########`);
  const r = await profileOnce(opts.url, opts);
  report(r);
  all.push(r);
}
if (opts.json) {
  const fs = await import('fs');
  fs.writeFileSync(opts.json, JSON.stringify(all, null, 2));
  console.log(`\nWrote ${opts.json}`);
}
