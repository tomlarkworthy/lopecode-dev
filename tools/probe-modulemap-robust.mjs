// Diagnose moduleMap() robustness: serve a notebook (optionally rate-limited), call moduleMap()
// at a chosen moment (optionally after jumpgate-style forcing), and report the module-map
// pipeline's console breadcrumbs plus the call outcome.
//   node tools/probe-modulemap-robust.mjs <notebook.html> [--rate N] [--force] [--early] [--wait MS] [--port N]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const rate = opt('rate', 50_000_000);
const port = opt('port', 8123);
const waitMs = opt('wait', 45_000);
if (!file) throw new Error('usage: probe-modulemap-robust.mjs <notebook.html> [--rate N] [--force] [--early] [--wait MS]');

const server = spawn('bun', ['scratch/rmbt/slow-serve.ts', file, String(rate), String(port)], {
  stdio: ['ignore', 'pipe', 'inherit']
});
await new Promise((r) => server.stdout.once('data', r));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const t0 = Date.now();
const stamp = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
const PIPE = /module_definition_variables|resolve_modules|notebookImport|pageImportMatch|generate summary|submit_summary|^modules$|error loading module|error building module|\[probe\]/;
page.on('console', (m) => {
  const t = m.text();
  if (PIPE.test(t)) console.log(`${stamp()} [pipe] ${t.slice(0, 160)}`);
});
page.on('pageerror', (e) => console.log(`${stamp()} [pageerror] ${String(e).slice(0, 200)}`));

// In-page early poller: stamps runtime/moduleMap availability and (in early mode) fires the
// call the instant the function exists, independent of any Playwright polling artifacts.
await page.addInitScript((early) => {
  const t0 = performance.now();
  const P = (window.__probe = { t0, marks: {} });
  const stamp = (k) => { if (P.marks[k] == null) P.marks[k] = Math.round(performance.now() - t0); };
  document.addEventListener('readystatechange', () =>
    console.log(`[probe] readyState=${document.readyState} @${Math.round(performance.now() - t0)}ms`));
  const iv = setInterval(() => {
    const rt = window.__ojs_runtime;
    if (!rt) return;
    stamp('runtime');
    for (const v of rt._variables) {
      if (v._name === 'moduleMap' && typeof v._value === 'function') {
        stamp('moduleMapFn');
        if (early && !P.call) {
          P.call = { startedAt: Math.round(performance.now() - t0), readyState: document.readyState };
          v._value().then(
            (m) => { P.call.outcome = 'resolved'; P.call.size = m.size; P.call.ms = Math.round(performance.now() - t0 - P.call.startedAt); },
            (e) => { P.call.outcome = 'rejected'; P.call.error = String(e).slice(0, 200); P.call.ms = Math.round(performance.now() - t0 - P.call.startedAt); }
          );
        }
        clearInterval(iv);
      }
    }
  }, 50);
}, flag('early'));
page.goto(`http://localhost:${port}/`, { waitUntil: 'commit' }).catch(() => {});
await page.waitForFunction(() => !!window.__ojs_runtime, null, { timeout: 60_000, polling: 100 });
console.log(`${stamp()} runtime up (readyState=${await page.evaluate(() => document.readyState)})`);

if (!flag('early')) {
  await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 120_000 });
  console.log(`${stamp()} page load complete`);
  await page.waitForTimeout(2000);
}

if (flag('force')) {
  await page.evaluate(() => {
    const runtime = window.__ojs_runtime;
    const mods = [runtime, ...(runtime.mains ? [...runtime.mains.values()] : [])];
    for (const m of mods) {
      if (!m._variables) continue;
      for (const v of m._variables) { v._reachable = true; runtime._dirty.add(v); }
    }
    runtime._computeNow();
  });
  console.log(`${stamp()} forced all variables reachable + computeNow`);
}

if (flag('early')) {
  // the init-script poller made the call; wait for its outcome then report
  const dumpTimer = setInterval(async () => {
    try {
      const snap = await page.evaluate(() => {
        const rt = window.__ojs_runtime;
        const names = ['viewof queue', 'queue', 'module_definition_variables', 'notebookImports', 'summary', 'submit_summary', 'titles', 'notebookImportMatches', 'modules'];
        const out = {};
        for (const v of rt._variables) {
          if (!names.includes(v._name)) continue;
          // only module-map's copies: they have a moduleMap sibling
          out[v._name] = (out[v._name] || []).concat([{
            reachable: v._reachable, version: v._version,
            hasValue: v._value !== undefined,
            promiseState: v._promise && typeof v._promise.then === 'function' ? 'promise' : String(v._promise).slice(0, 40)
          }]);
        }
        return out;
      });
      console.log(`${stamp()} [vars] ${JSON.stringify(snap)}`);
    } catch { /* page busy */ }
  }, 15_000);
  await page.waitForFunction(() => window.__probe?.call?.outcome, null, { timeout: waitMs + 60_000, polling: 200 });
  clearInterval(dumpTimer);
  const p = await page.evaluate(() => window.__probe);
  console.log(`${stamp()} early call:`, JSON.stringify({ marks: p.marks, call: p.call }));
  const extra0 = await page.evaluate(() => document.readyState);
  console.log(`${stamp()} readyState now: ${extra0}`);
  await browser.close();
  server.kill();
  process.exit(0);
}

// Call moduleMap() or exportToHTML() from inside the page.
const target = flag('export') ? 'exportToHTML' : 'moduleMap';
console.log(`${stamp()} calling ${target}() (readyState=${await page.evaluate(() => document.readyState)})`);
const result = await page.evaluate(async ({ deadline, target }) => {
  const rt = window.__ojs_runtime;
  const t0 = performance.now();
  let fn = null;
  while (performance.now() - t0 < deadline) {
    for (const v of rt._variables) {
      if (v._name === target && typeof v._value === 'function') { fn = v._value; break; }
    }
    if (fn) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!fn) return { outcome: `no ${target} function found`, ms: Math.round(performance.now() - t0) };
  const tCall = performance.now();
  try {
    const value = await Promise.race([
      fn(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('probe deadline')), deadline))
    ]);
    const size = value instanceof Map ? value.size
      : typeof value?.source === 'string' ? value.source.length
      : typeof value === 'string' ? value.length : null;
    return { outcome: 'resolved', size, ms: Math.round(performance.now() - tCall) };
  } catch (e) {
    return { outcome: 'rejected', error: String(e).slice(0, 200), ms: Math.round(performance.now() - tCall) };
  }
}, { deadline: waitMs, target });
console.log(`${stamp()} ${target}:`, JSON.stringify(result));

// state of the streaming scanner, if present
const extra = await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  let streaming = null, mmCurrent = null;
  for (const v of rt._variables) {
    if (v._name === 'currentModules' && v._value instanceof Map && v._value.size) {
      const rec = v._value.values().next().value;
      if (rec && !('dependsOn' in rec)) streaming = v._value.size; else mmCurrent = v._value.size;
    }
  }
  return { streamingModules: streaming, moduleMapCurrentModules: mmCurrent, readyState: document.readyState };
});
console.log(`${stamp()} state:`, JSON.stringify(extra));
await browser.close();
server.kill();
