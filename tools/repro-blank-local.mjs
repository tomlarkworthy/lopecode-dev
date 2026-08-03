import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:8791/@tomlarkworthy_lopecode-live-2026.html';
const N = Number(process.env.N || 40);
const CPU = Number(process.env.CPU || 8);
const CONC = Number(process.env.CONC || 12);
const SETTLE = Number(process.env.SETTLE || 14000);
const HEADLESS = process.env.HEADED ? false : true;

// Runs in the page from the very start. Samples the runtime every 300ms into window.__samples.
const SAMPLER = () => {
  window.__samples = [];
  window.__modLog = [];
  const t0 = Date.now();
  // Trap the runtime assignment (bootloader sets window.__ojs_runtime before loading mains)
  // and wrap runtime.module to record instantiation order + whether an observer was applied.
  let _rt;
  Object.defineProperty(window, '__ojs_runtime', {
    configurable: true,
    get() { return _rt; },
    set(rt) {
      _rt = rt;
      try {
        const FIX = window.__FIX === true;
        const orig = rt.module.bind(rt);
        rt.module = function (define, observer) {
          const pre = define !== undefined && rt._modules.has(define);
          const m = orig(define, observer);
          const hasLp2 = !!(m && m._scope && m._scope.has && m._scope.has('lp2_append_to_body'));
          if (hasLp2) window.__modLog.push({ t: Date.now() - t0, preexisting: pre, observer: observer ? String(observer).replace(/\s+/g, '').slice(0, 22) : 'none' });
          // FIX: runtime.module() drops the observer when the module already exists (dep-imported first).
          // Re-apply it to every unobserved cell so the page's output stays reachable regardless of load order.
          if (FIX && pre && typeof observer === 'function') {
            for (const name of [...m._scope.keys()]) {
              const v = m._scope.get(name);
              if (v && typeof v._observer === 'symbol') {  // no_observer is a Symbol
                try { m.variable(observer(name)).define([name], x => x); } catch (e) {}
              }
            }
          }
          return m;
        };
      } catch (e) { window.__modLog.push({ err: String(e).slice(0, 60) }); }
    },
  });
  const findRt = () => {
    if (window.__ojs_runtime) return window.__ojs_runtime;
    for (const k of Object.getOwnPropertyNames(window)) {
      const v = window[k];
      if (v && v._variables instanceof Set && v._modules) return v;
    }
    return null;
  };
  const getVar = (rt, name) => { for (const v of rt._variables) if (v._name === name) return v; return null; };
  const iv = setInterval(() => {
    const s = { t: Date.now() - t0 };
    const rt = findRt();
    if (!rt) { s.rt = false; window.__samples.push(s); return; }
    s.rt = true;
    const cm = getVar(rt, 'currentModules');
    const wm = getVar(rt, 'lp2_watchedModules');
    const cmv = cm ? cm._value : undefined;
    const wmv = wm ? wm._value : undefined;
    s.cmErr = cm && cm._error != null ? String(cm._error).slice(0, 40) : undefined;
    s.cmSize = cmv && cmv.size != null ? cmv.size : (cm ? (cm._value === undefined ? 'pend' : typeof cmv) : 'novar');
    s.cmHasOur = cmv && cmv.forEach ? [...cmv.values()].some(r => r && r.name && String(r.name).includes('lopecode-live-2026')) : null;
    s.wmSize = wmv && wmv.size != null ? wmv.size : (wm ? (wm._value === undefined ? 'pend' : typeof wmv) : 'novar');
    s.lp = !!document.querySelector('#lopepage-2');
    s.pane = document.querySelector('#lopepage-2 .lp2-pane') ? (document.querySelector('#lopepage-2 .lp2-pane').textContent || '').trim().slice(0, 24) : null;
    let pending = 0, fulfilled = 0, rejected = 0;
    for (const v of rt._variables) { if (v._error != null) rejected++; else if (v._value !== undefined) fulfilled++; else pending++; }
    s.pending = pending; s.fulfilled = fulfilled; s.rejected = rejected;
    window.__samples.push(s);
  }, 300);
  window.__stopSampler = () => clearInterval(iv);

  window.__deepProbe = () => {
    const rt = findRt(); if (!rt) return { err: 'no rt' };
    const byName = n => { for (const v of rt._variables) if (v._name === n) return v; return null; };
    const root = byName('lp2_append_to_body') || byName('lp2_view');
    if (!root) return { err: 'no root var' };
    const isObs = v => v._observer && typeof v._observer !== 'symbol';
    const seen = new Set(), frontier = [], unreachable = [];
    const walk = v => {
      if (seen.has(v)) return; seen.add(v);
      const hasVal = v._value !== undefined;
      const st = { name: String(v._name).slice(0, 32), reach: !!v._reachable, indeg: v._indegree, val: hasVal, obs: isObs(v) ? 1 : 0, err: v._error != null || undefined };
      if (!v._reachable) unreachable.push(st);
      if (v._reachable && !hasVal && v._error == null) {
        const notReadyInputs = v._inputs.filter(i => i._value === undefined && i._error == null).map(i => String(i._name).slice(0, 24));
        if (notReadyInputs.length === 0) frontier.push({ ...st, allInputsReady: true });
        else frontier.push({ ...st, waitingOn: notReadyInputs.slice(0, 6) });
      }
      v._inputs.forEach(walk);
    };
    walk(root);
    return {
      rootName: String(root._name), rootReach: !!root._reachable, rootIndeg: root._indegree, rootObs: isObs(root),
      rootVal: root._value !== undefined, rootErr: root._error != null,
      treeSize: seen.size, unreachableCount: unreachable.length,
      treeComputed: [...seen].filter(v => v._value !== undefined).length,
      treePending: [...seen].filter(v => v._value === undefined && v._error == null).length,
      frontier: frontier.slice(0, 12), unreachableSample: unreachable.slice(0, 12),
    };
  };
};

function compress(samples) {
  // keep first, last, and any sample where a key field changed
  const key = s => JSON.stringify([s.rt, s.cmSize, s.cmHasOur, s.wmSize, s.lp, s.pending > 0 ? Math.round(s.pending / 50) : 0, s.fulfilled > 0 ? Math.round(s.fulfilled / 50) : 0, s.rejected]);
  const out = [];
  let prev = null;
  for (const s of samples) { const k = key(s); if (k !== prev) { out.push(s); prev = k; } }
  if (samples.length && out[out.length - 1] !== samples[samples.length - 1]) out.push(samples[samples.length - 1]);
  return out;
}

const browser = await chromium.launch({ headless: HEADLESS });

async function runOne(i) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  if (process.env.FIX) await page.addInitScript(() => { window.__FIX = true; });
  await page.addInitScript(SAMPLER);
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERR: ' + (e && e.message)));
  page.on('requestfailed', r => { const u = r.url(); if (!u.startsWith('blob:')) errors.push('REQFAIL ' + u.slice(0, 80) + ' ' + r.failure()?.errorText); });

  const cdp = await ctx.newCDPSession(page);
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });

  let state, samples = [];
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(SETTLE);
    state = await page.evaluate(() => {
      const lp = document.querySelector('#lopepage-2');
      const insp = [...document.querySelectorAll('#lopepage-2 .observablehq')];
      const painted = insp.filter(n => n.childElementCount > 0 || (n.textContent || '').trim()).length;
      const rt = window.__ojs_runtime;
      let wrapperVars = 0;
      if (rt) for (const v of rt._variables) { const d = v._definition && String(v._definition).replace(/\s/g,''); if (d === 'x=>x') wrapperVars++; }
      return { lp: !!lp, painted, wrapperVars, bodyLen: (document.body.innerText || '').trim().length,
               pane: document.querySelector('#lopepage-2 .lp2-pane') ? (document.querySelector('#lopepage-2 .lp2-pane').textContent || '').trim().slice(0, 30) : null };
    });
    samples = await page.evaluate(() => (window.__samples || []));
  } catch (e) { state = { error: String(e).slice(0, 100) }; }

  const blank = state && !state.error && state.painted === 0;
  const tag = state.error ? 'ERROR' : blank ? 'BLANK' : 'ok';
  console.log(`#${i}\t${tag}\t` + JSON.stringify(state));
  if (tag !== 'ok') {
    console.log('   timeline: ' + compress(samples).map(s =>
      `${s.t}ms[${s.rt ? 'rt' : '--'} cm=${s.cmSize}${s.cmHasOur ? '+OUR' : ''} wm=${s.wmSize} lp=${s.lp ? 1 : 0} p=${s.pending}/f=${s.fulfilled}/r=${s.rejected}]`).join(' '));
    if (blank) {
      try {
        const dp = await page.evaluate(() => window.__deepProbe());
        console.log(`   deep: rootObs=${dp.rootObs} rootReach=${dp.rootReach} rootVal=${dp.rootVal} rootErr=${dp.rootErr} rootIndeg=${dp.rootIndeg} computed=${dp.treeComputed}/${dp.treeSize} pending=${dp.treePending}`);
        console.log('   modLog(lp2): ' + JSON.stringify(await page.evaluate(() => window.__modLog)));
      } catch (e) { console.log('   deep-fail ' + e); }
    }
    if (errors.length) console.log('   errors: ' + [...new Set(errors)].slice(0, 6).join(' | '));
  }
  await ctx.close();
  return tag;
}

let failures = 0, next = 0;
async function worker() { while (next < N) { const i = next++; if (await runOne(i) !== 'ok') failures++; } }
await Promise.all(Array.from({ length: Math.min(CONC, N) }, worker));
console.log(`\n=== ${failures}/${N} non-ok (CPU=${CPU}x conc=${CONC} settle=${SETTLE}ms) ${URL} ===`);
await browser.close();
