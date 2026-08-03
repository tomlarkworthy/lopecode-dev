import { chromium } from 'playwright';

const URL = 'https://tomlarkworthy.github.io/lopebooks/notebooks/@tomlarkworthy_lopecode-live-2026.html';
const N = Number(process.env.N || 30);
const CPU = Number(process.env.CPU || 6);          // CPU throttle multiplier
const NET = process.env.NET !== '0';               // slow network on by default
const SETTLE = Number(process.env.SETTLE || 12000);// ms to wait for full boot
const HEADLESS = process.env.HEADED ? false : true;

const browser = await chromium.launch({ headless: HEADLESS });

// Evaluate the final visible state of the page.
async function runtimeProbe(page) {
  return await page.evaluate(() => {
    // find the Observable runtime instance
    let rt = window.__ojs_runtime || null;
    if (!rt) {
      // scan for a runtime-looking global
      for (const k of Object.getOwnPropertyNames(window)) {
        const v = window[k];
        if (v && v._variables instanceof Set && v._modules) { rt = v; break; }
      }
    }
    if (!rt) return { runtime: 'not-found' };
    const STATES = ['?', 'pending', 'fulfilled', 'rejected'];
    const rows = [];
    let pending = 0, rejected = 0, fulfilled = 0;
    for (const v of rt._variables) {
      // _reachable variables matter; report unfulfilled named ones
      const name = v._name || (v._definition && String(v._definition).slice(0, 30)) || '(anon)';
      const st = v._value !== undefined ? 'fulfilled' : (v._promise ? 'pending' : '?');
      const errored = v._error != null;
      if (errored) rejected++; else if (st === 'fulfilled') fulfilled++; else pending++;
      const interesting = errored || (st !== 'fulfilled' &&
        /lp2|currentModules|modules|append_to_body|view|watchedModules|watchModules|moduleByName|getPane|page|host|syncFromUrl|Model/.test(String(name)));
      if (interesting) rows.push({ name: String(name).slice(0, 42), st, err: errored ? String(v._error).slice(0, 60) : undefined, reach: !!v._reachable });
    }
    return { totals: { pending, rejected, fulfilled, all: rt._variables.size }, rows: rows.slice(0, 40) };
  });
}

async function inspect(page) {
  return await page.evaluate(() => {
    const pr = document.getElementById('lope-prerender');
    const lp = document.querySelector('#lopepage-2');
    const panes = [...document.querySelectorAll('#lopepage-2 .lp2-pane')];
    const paneText = panes.map(p => (p.textContent || '').trim().slice(0, 40));
    // "content" = a rendered inspector node that actually has children/text
    const insp = [...document.querySelectorAll('#lopepage-2 .observablehq')];
    const painted = insp.filter(n => (n.textContent || '').trim().length > 0 || n.children.length > 0).length;
    const running = insp.filter(n => n.classList.contains('observablehq--running')).length;
    const bodyText = (document.body.innerText || '').trim();
    return {
      prerenderPresent: !!pr,
      lopepagePresent: !!lp,
      paneCount: panes.length,
      paneText,
      inspectorCount: insp.length,
      paintedInspectors: painted,
      runningInspectors: running,
      bodyTextLen: bodyText.length,
      bodyHead: bodyText.slice(0, 60),
    };
  });
}

const CONC = Number(process.env.CONC || 6);

async function runOne(i) {
  // fresh context => cold HTTP cache each iteration
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + (e && e.message)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  page.on('requestfailed', r => errors.push('REQFAIL: ' + r.url().slice(0, 120) + ' (' + (r.failure()?.errorText) + ')'));

  const cdp = await ctx.newCDPSession(page);
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  if (NET) await cdp.send('Network.emulateNetworkConditions', {
    offline: false, downloadThroughput: 500 * 1024 / 8, uploadThroughput: 500 * 1024 / 8, latency: 200,
  });

  let state;
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(SETTLE);
    state = await inspect(page);
  } catch (e) {
    state = { error: String(e).slice(0, 120) };
  }

  // permanent blank = prerender gone AND live page has no painted content
  const blank = state && !state.error &&
    !state.prerenderPresent &&
    (state.paintedInspectors === 0 || state.bodyTextLen < 20);
  const stuckLoading = state && state.paneText && state.paneText.some(t => /^loading /.test(t));

  const tag = state.error ? 'ERROR' : blank ? 'BLANK' : stuckLoading ? 'LOADING' : 'ok';
  console.log(`#${i}\t${tag}\t` + JSON.stringify(state));
  if (tag !== 'ok') {
    const path = `tools/screenshots/blank-${i}-${tag}.png`;
    try { await page.screenshot({ path }); } catch {}
    if (errors.length) console.log(`   errors: ` + errors.slice(0, 5).join(' | '));
    if (!state.error) {
      try { console.log(`   probe: ` + JSON.stringify(await runtimeProbe(page))); } catch (e) { console.log('   probe-fail ' + e); }
    }
    console.log(`   shot: ${path}`);
  }

  await ctx.close();
  return tag;
}

let failures = 0, done = 0;
let next = 0;
async function worker() {
  while (next < N) {
    const i = next++;
    const tag = await runOne(i);
    if (tag !== 'ok') failures++;
    done++;
  }
}
await Promise.all(Array.from({ length: Math.min(CONC, N) }, () => worker()));

console.log(`\n=== ${failures}/${done} non-ok (CPU=${CPU}x NET=${NET} conc=${CONC} settle=${SETTLE}ms) ===`);
await browser.close();
