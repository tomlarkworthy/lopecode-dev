const _rxp7mv = function _1(md){return(
md`# Debugger-2

A timeline of every variable's lifecycle: **blocked on deps → computing → resolved (or error)**. High-frequency cells roll up into spans automatically so cost stays bounded.

\`\`\`js
import {debugger as ndd} from "@tomlarkworthy/debugger-2"
\`\`\``
)};
const _1wfoz75 = function _2(md){return(
md`## EventLog core

Per-variable typed-array ring + lazy span rollup + three-state derivation.

- **K**: max ticks held per row before oldest \`COALESCE\` get folded into one span
- **COALESCE**: how many oldest ticks the rollup folds at a time
- **States**: \`pending\` (blocked on deps) → \`computing\` (deps resolved, own work) → \`fulfilled\` | \`rejected\``
)};
const _xd5qq = function _K(){return(
200
)};
const _13erayv = function _COALESCE(){return(
50
)};
const _1ltk6ti = function _makeRow(){return(
({pid, name, mod, variableRef, K}) => {
  const tPending = new Float64Array(K);
  const tComputing = new Float64Array(K).fill(NaN);
  const tResolved = new Float64Array(K).fill(NaN);
  const outcome = new Uint8Array(K);
  return {
    pid,
    name,
    mod,
    variableRef,
    tPending,
    tComputing,
    tResolved,
    outcome,
    count: 0,
    spans: []
  };
}
)};
const _kjeox0 = function _rollupRow()
{
  return (row, COALESCE) => {
    const N = Math.min(COALESCE, row.count);
    if (N <= 0)
      return;
    const {tPending, tComputing, tResolved, outcome} = row;
    let t0 = tPending[0];
    let t1 = t0;
    let blockedMs = 0, computingMs = 0, errors = 0;
    for (let i = 0; i < N; i++) {
      const tP = tPending[i], tC = tComputing[i], tR = tResolved[i];
      const last = Number.isNaN(tR) ? Number.isNaN(tC) ? tP : tC : tR;
      if (last > t1)
        t1 = last;
      if (!Number.isNaN(tC))
        blockedMs += tC - tP;
      if (!Number.isNaN(tR) && !Number.isNaN(tC))
        computingMs += tR - tC;
      if (outcome[i] === 1)
        errors++;
    }
    row.spans.push({
      t0,
      t1,
      count: N,
      blockedMs,
      computingMs,
      errors
    });
    tPending.copyWithin(0, N);
    tComputing.copyWithin(0, N);
    tResolved.copyWithin(0, N);
    outcome.copyWithin(0, N);
    // NaN-fill the now-vacated tail slots (so leaked old values can't pollute
    // future ticks if a slot is read before write).
    tComputing.fill(NaN, row.count - N);
    tResolved.fill(NaN, row.count - N);
    row.count -= N;
  };
};
const _b892oh = function _EventLog(makeRow,rollupRow)
{
  return class EventLog {
    constructor({K, COALESCE}) {
      this.K = K;
      this.COALESCE = COALESCE;
      this.rows_ = new Map();
      // pid → Row
      this.pendingInputs_ = new Map();
      // Variable → int (count of still-pending inputs)
      this.outputs_ = new Map();  // Variable → Set<Variable> (reverse-index, lazy)
    }
    row(v) {
      const pid = v.pid || v._name || v;
      let r = this.rows_.get(pid);
      if (!r) {
        r = makeRow({
          pid,
          name: v._name || v._definition?.toString().slice(0, 30) || '?',
          mod: v._module?._name || null,
          variableRef: v,
          K: this.K
        });
        this.rows_.set(pid, r);
      }
      return r;
    }
    // Lazy reverse-index. First time we see v as someone's input, register the edge.
    _ensureReverseFor(v) {
      if (this.outputs_.has(v))
        return;
      this.outputs_.set(v, new Set());
      // Also walk v's inputs so we get reverse edges INTO v from its deps.
      for (const inp of v._inputs || []) {
        let s = this.outputs_.get(inp);
        if (!s) {
          s = new Set();
          this.outputs_.set(inp, s);
        }
        s.add(v);
      }
    }
    onPending(v, t) {
      this._ensureReverseFor(v);
      const row = this.row(v);
      if (row.count >= this.K)
        rollupRow(row, this.COALESCE);
      const i = row.count++;
      row.tPending[i] = t;
      row.tComputing[i] = NaN;
      row.tResolved[i] = NaN;
      row.outcome[i] = 2;
      // in-progress
      // Count v's pending inputs.
      let pendingCount = 0;
      for (const inp of v._inputs || []) {
        // An input is "still pending" if we have it tracked AND its last row entry
        // is in-progress.
        const ir = this.rows_.get(inp.pid || inp._name || inp);
        if (ir && ir.count > 0 && ir.outcome[ir.count - 1] === 2)
          pendingCount++;
      }
      this.pendingInputs_.set(v, pendingCount);
      if (pendingCount === 0)
        row.tComputing[i] = t;
    }
    onResolved(v, t, ok) {
      const row = this.row(v);
      if (row.count === 0)
        return;
      // saw resolved without pending (rare); ignore
      const i = row.count - 1;
      row.tResolved[i] = t;
      if (Number.isNaN(row.tComputing[i]))
        row.tComputing[i] = t;
      // safety
      row.outcome[i] = ok ? 0 : 1;
      this.pendingInputs_.delete(v);
      // Cascade: any downstream variable whose pending-count includes v as still-
      // pending now sees v resolved → decrement; on 0, mark its tComputing.
      const outs = this.outputs_.get(v);
      if (!outs)
        return;
      for (const d of outs) {
        const dCount = this.pendingInputs_.get(d);
        if (dCount === undefined)
          continue;
        const next = dCount - 1;
        this.pendingInputs_.set(d, next);
        if (next === 0) {
          const dr = this.row(d);
          if (dr.count > 0 && Number.isNaN(dr.tComputing[dr.count - 1])) {
            dr.tComputing[dr.count - 1] = t;
          }
        }
      }
    }
    clear() {
      this.rows_.clear();
      this.pendingInputs_.clear();  // Keep outputs_ — it's structural, not data.
    }
    rows() {
      return [...this.rows_.values()];
    }
  };
};
const _1xfdb5s = function _makeFakeVar(){return(
({pid, name, inputs = [], mod = 'test'}) => ({
  pid,
  _name: name,
  _inputs: inputs,
  _module: { _name: mod }
})
)};
const _f2bxej = function _test_eventlog_basic_no_inputs(EventLog,makeFakeVar,expect)
{
  const log = new EventLog({
    K: 200,
    COALESCE: 50
  });
  const a = makeFakeVar({
    pid: 'a',
    name: 'a'
  });
  log.onPending(a, 100);
  const row = log.row(a);
  expect(row.count).toBe(1);
  expect(row.tPending[0]).toBe(100);
  expect(row.tComputing[0]).toBe(100);
  // no inputs -> computing immediately
  expect(Number.isNaN(row.tResolved[0])).toBe(true);
  log.onResolved(a, 130, true);
  expect(row.tResolved[0]).toBe(130);
  expect(row.outcome[0]).toBe(0);
  return 'ok';
};
const _1jp2v6g = function _test_eventlog_threestate_via_dep(EventLog,makeFakeVar,expect)
{
  const log = new EventLog({
    K: 200,
    COALESCE: 50
  });
  const a = makeFakeVar({
    pid: 'a',
    name: 'a'
  });
  const b = makeFakeVar({
    pid: 'b',
    name: 'b',
    inputs: [a]
  });
  // a becomes pending and resolves quickly
  log.onPending(a, 100);
  // b becomes pending while a is still in-flight
  log.onPending(b, 105);
  // expectations BEFORE a resolves
  const rb = log.row(b);
  expect(rb.tPending[0]).toBe(105);
  expect(Number.isNaN(rb.tComputing[0])).toBe(true);
  // still blocked on a
  // a resolves -> triggers b.tComputing
  log.onResolved(a, 110, true);
  expect(rb.tComputing[0]).toBe(110);
  // b finishes its own work
  log.onResolved(b, 120, true);
  expect(rb.tResolved[0]).toBe(120);
  expect(rb.outcome[0]).toBe(0);
  // derived timings
  const blockedMs = rb.tComputing[0] - rb.tPending[0];
  // 5
  const computingMs = rb.tResolved[0] - rb.tComputing[0];
  // 10
  expect(blockedMs).toBe(5);
  expect(computingMs).toBe(10);
  return 'ok';
};
const _b4ohl3 = function _test_eventlog_rollup_folds_oldest(EventLog,makeFakeVar,expect)
{
  const log = new EventLog({
    K: 200,
    COALESCE: 50
  });
  const a = makeFakeVar({
    pid: 'a',
    name: 'a'
  });
  // push K+1 fully-resolved ticks
  for (let i = 0; i < 201; i++) {
    log.onPending(a, 1000 + i * 10);
    log.onResolved(a, 1000 + i * 10 + 5, true);
  }
  const row = log.row(a);
  // After rollup, count should drop by COALESCE on the K-th insert before #201.
  // Pre-rollup: count would reach K=200 and the 201st onPending triggers rollupRow.
  // rollupRow folds oldest 50 -> count becomes 150. Then the 201st tick inserts -> 151.
  expect(row.count).toBe(151);
  expect(row.spans.length).toBe(1);
  const span = row.spans[0];
  expect(span.count).toBe(50);
  expect(span.errors).toBe(0);
  // span.t0 is the first pending of the rolled-up batch
  expect(span.t0).toBe(1000);
  return 'ok';
};
const _a84g4y = function _test_eventlog_rejected_marks_error(EventLog,makeFakeVar,expect)
{
  const log = new EventLog({
    K: 200,
    COALESCE: 50
  });
  const a = makeFakeVar({
    pid: 'a',
    name: 'a'
  });
  log.onPending(a, 100);
  log.onResolved(a, 130, false);
  // rejected
  const row = log.row(a);
  expect(row.outcome[0]).toBe(1);
  return 'ok';
};
const _1s7eveb = function _13(md){return(
md`## Wiring

Walk every reachable variable in the runtime, attach \`observe()\` handlers, route them into the singleton \`log\`. Exclude variables that participate in this module's own render pipeline (otherwise the renderer's own \`pending → fulfilled\` would feed back into the log and storm).`
)};
const _1nezd3r = function _log(EventLog,K,COALESCE){return(
new EventLog({
  K,
  COALESCE
})
)};
const _9zdsj7 = function _selfModule(thisModule){return(
thisModule()
)};
const _4pnliu = (G, _) => G.input(_);
const _bmfmgk = async function _selfExcludes(lookupVariable,selfModule,descendants)
{
  const exclude = new Set();
  const names = [
    'log',
    'viz',
    'vizHolder',
    'vizTick',
    'rowsSnapshot'
  ];
  for (const n of names) {
    try {
      const v = await lookupVariable(n, selfModule);
      if (v)
        descendants(v).forEach(x => exclude.add(x));
    } catch (e) {
    }
  }
  return exclude;
};
const _1xtu87y = function _installTracking(variables,runtime,tickRing,invalidation,selfModule,observe,log)
{
  const target = variables(runtime);
  let attached = 0, skipped = 0;
  // Patch runtime._computeNow once for tick stamping.
  if (!runtime._computeNow._dbg2) {
    const orig = runtime._computeNow;
    const patched = function () {
      tickRing.push(performance.now());
      return orig.call(this);
    };
    patched._dbg2 = true;
    patched._dbg2_orig = orig;
    runtime._computeNow = patched;
    invalidation.then(() => {
      if (runtime._computeNow === patched)
        runtime._computeNow = orig;
    });
  }
  const attach = () => {
    for (const v of target.value) {
      if (v._dbg2)
        continue;
      if (v._module === selfModule) {
        v._dbg2 = true;
        skipped++;
        continue;
      }
      if (!v._reachable)
        continue;
      if (v._name === 'now')
        continue;
      v._dbg2 = true;
      observe(v, {
        pending: () => log.onPending(v, performance.now()),
        fulfilled: () => log.onResolved(v, performance.now(), true),
        rejected: () => log.onResolved(v, performance.now(), false)
      });
      attached++;
    }
  };
  attach();
  target.addEventListener('input', attach);
  invalidation.then(() => target.removeEventListener('input', attach));
  return {
    attached,
    skipped,
    totalSeen: target.value.size
  };
};
const _1lu7yg1 = function _18(md){return(
md`## Renderer`
)};
const _fc81gl = function _timeDelay(Inputs){return(
Inputs.range([
  0,
  30
], {
  value: 0,
  step: 0.1,
  label: 'delay (secs)'
})
)};
const _1r2fbyu = (G, _) => G.input(_);
const _1f2dnbn = function _paused(Inputs){return(
Inputs.toggle({ label: 'pause' })
)};
const _1spv9xq = (G, _) => G.input(_);
const _shn35j = function _nameFilter(Inputs){return(
Inputs.text({
  label: 'filter (regex)',
  placeholder: 'name match\u2026',
  value: ''
})
)};
const _1rkelpd = (G, _) => G.input(_);
const _1do3584 = function _clearBtn(Inputs,log){return(
Inputs.button('clear', { reduce: () => (log.clear(), Date.now()) })
)};
const _gwugmb = (G, _) => G.input(_);
const _qk3yaa = function _rowsSnapshot(installTracking,refresh,refreshDriver,pauseEnd,zoomDomain,filterRe,timeDelay,WINDOW_SECS,log,selfModule,tickRing)
{
  installTracking;
  refresh;
  refreshDriver;
  pauseEnd;
  zoomDomain;
  const cache = window.__dbg2Snap || (window.__dbg2Snap = {});
  const re = filterRe instanceof RegExp ? filterRe : null;
  const zoom = Array.isArray(zoomDomain) ? zoomDomain : null;
  const wallEnd = pauseEnd !== null ? pauseEnd : performance.now();
  let start, end;
  if (zoom !== null) {
    [start, end] = zoom;
  } else {
    end = wallEnd - timeDelay * 1000;
    start = end - WINDOW_SECS * 1000;
  }
  const frozen = pauseEnd !== null || zoom !== null;
  if (frozen) {
    const fpKey = `F|${ start }|${ end }|${ re ? re.source : '\u2205' }|${ filterRe === 'invalid' }`;
    if (cache.key === fpKey && cache.result)
      return cache.result;
    cache.key = fpKey;
  } else {
    cache.key = null;
  }
  const t0 = performance.now();
  let totalEvents = 0;
  let lastEventTime = -Infinity;
  let tracked = 0;
  const ticks = [];
  const spans = [];
  let shown = 0;
  for (const row of log.rows()) {
    if (row.variableRef?._module === selfModule)
      continue;
    tracked++;
    totalEvents += row.count + row.spans.length;
    if (row.count > 0)
      lastEventTime = Math.max(lastEventTime, row.tPending[row.count - 1]);
    if (re && !re.test(row.name))
      continue;
    if (row.count === 0 && row.spans.length === 0)
      continue;
    let pushed = 0;
    const base = {
      name: row.name,
      mod: row.mod,
      variableRef: row.variableRef
    };
    for (let i = 0; i < row.count; i++) {
      const tP = row.tPending[i];
      if (tP < start || tP > end)
        continue;
      const tC = Number.isNaN(row.tComputing[i]) ? null : row.tComputing[i];
      const tR = Number.isNaN(row.tResolved[i]) ? null : row.tResolved[i];
      const outcome = row.outcome[i];
      const tBlocked = tC !== null ? tC - tP : null;
      const tCompute = tR !== null && tC !== null ? tR - tC : null;
      if (tC !== null && tC > tP) {
        ticks.push({
          ...base,
          x1: tP,
          x2: tC,
          colorState: 'blocked',
          state: 'blocked',
          tBlocked,
          tCompute
        });
        pushed++;
      }
      if (tR !== null && tC !== null && tR > tC) {
        const cs = outcome === 1 ? 'rejected' : 'computing';
        ticks.push({
          ...base,
          x1: tC,
          x2: tR,
          colorState: cs,
          state: cs,
          tBlocked,
          tCompute
        });
        pushed++;
      }
      if (tR !== null) {
        const cs = outcome === 1 ? 'rejected' : 'fulfilled';
        ticks.push({
          ...base,
          x: tR,
          colorState: cs,
          state: cs,
          tBlocked,
          tCompute
        });
        pushed++;
      }
      if (tR === null && tP >= start) {
        const x = tC !== null ? tC : tP;
        ticks.push({
          ...base,
          x,
          colorState: 'computing',
          state: 'computing',
          tBlocked,
          tCompute: null
        });
        pushed++;
      }
    }
    for (const sp of row.spans) {
      if (sp.t1 < start || sp.t0 > end)
        continue;
      spans.push({
        ...base,
        x1: Math.max(sp.t0, start),
        x2: Math.min(sp.t1, end),
        colorState: 'span',
        count: sp.count,
        blockedMs: sp.blockedMs,
        computingMs: sp.computingMs,
        errors: sp.errors
      });
      pushed++;
    }
    if (pushed > 0)
      shown++;
  }
  const tickTimes = tickRing.inRange(start, end);
  const snapMs = performance.now() - t0;
  window.__dbg2Perf = Object.assign(window.__dbg2Perf || {}, {
    snapMs,
    marks: ticks.length + spans.length,
    shown,
    tracked,
    runtimeTicks: tickTimes.length,
    invalidRe: filterRe === 'invalid'
  });
  const result = {
    ticks,
    spans,
    tickTimes,
    domain: [
      start,
      end
    ],
    paused: frozen,
    zoomed: zoom !== null,
    invalidRe: filterRe === 'invalid',
    tracked,
    totalEvents,
    lastEventAgoSec: lastEventTime > -Infinity ? (performance.now() - lastEventTime) / 1000 : null
  };
  if (frozen)
    cache.result = result;
  return result;
};
const _10dhtpb = function _stateColors()
{
  return {
    blocked: '#f4c542',
    // amber — waiting on deps
    computing: '#3a80ff',
    // blue — doing own work
    fulfilled: '#3ec46d',
    // green
    error: '#e34c4c',
    // red (during span)
    rejected: '#e34c4c',
    // red (point)
    span: '#bbb'  // grey — coalesced
  };
};
const _v5cph7 = function _viz(rowsSnapshot,htl,formatValPreview,Plot,width,d3,formatTooltip,linkTo,$0,Event)
{
  const {ticks, spans, tickTimes, domain, lastEventAgoSec, tracked} = rowsSnapshot;
  const names = new Set();
  for (const t of ticks)
    names.add(t.name);
  for (const s of spans)
    names.add(s.name);
  const rowH = 28;
  const height = Math.max(120, names.size * rowH);
  if (names.size === 0) {
    const ageStr = lastEventAgoSec != null && Number.isFinite(lastEventAgoSec) ? `last activity ${ lastEventAgoSec.toFixed(0) }s ago` : 'no activity recorded yet';
    return htl.html`<div style="padding:1em;color:#888;font-size:12px;">
      no events in current window — ${ ageStr } (${ tracked } variables tracked)
    </div>`;
  }
  const nameToVar = new Map();
  for (const t of ticks) {
    if (t.variableRef && !nameToVar.has(t.name))
      nameToVar.set(t.name, t.variableRef);
  }
  for (const s of spans) {
    if (s.variableRef && !nameToVar.has(s.name))
      nameToVar.set(s.name, s.variableRef);
  }
  const firstSeen = new Map();
  for (const t of ticks) {
    const tt = t.x1 ?? t.x;
    const cur = firstSeen.get(t.name);
    if (cur === undefined || tt < cur)
      firstSeen.set(t.name, tt);
  }
  for (const s of spans) {
    const cur = firstSeen.get(s.name);
    if (cur === undefined || s.x1 < cur)
      firstSeen.set(s.name, s.x1);
  }
  const inDeg = new Map();
  const outEdges = new Map();
  for (const n of names) {
    inDeg.set(n, 0);
    outEdges.set(n, new Set());
  }
  for (const n of names) {
    const v = nameToVar.get(n);
    if (!v || !v._outputs)
      continue;
    for (const o of v._outputs) {
      const on = o._name;
      if (!names.has(on) || on === n)
        continue;
      if (!outEdges.get(n).has(on)) {
        outEdges.get(n).add(on);
        inDeg.set(on, inDeg.get(on) + 1);
      }
    }
  }
  const cmp = (a, b) => {
    const ta = firstSeen.get(a) ?? Infinity;
    const tb = firstSeen.get(b) ?? Infinity;
    if (ta !== tb)
      return ta - tb;
    return a < b ? -1 : a > b ? 1 : 0;
  };
  const yDomain = [];
  const placed = new Set();
  let frontier = [...names].filter(n => inDeg.get(n) === 0).sort(cmp);
  while (frontier.length) {
    const n = frontier.shift();
    if (placed.has(n))
      continue;
    placed.add(n);
    yDomain.push(n);
    const next = [];
    for (const m of outEdges.get(n)) {
      const d = inDeg.get(m) - 1;
      inDeg.set(m, d);
      if (d === 0)
        next.push(m);
    }
    frontier.push(...next);
    frontier.sort(cmp);
  }
  for (const n of [...names].sort(cmp))
    if (!placed.has(n))
      yDomain.push(n);
  const typeShape = name => {
    const v = nameToVar.get(name);
    const t = v?._definition?.constructor?.name;
    if (t === 'AsyncFunction')
      return {
        shape: 'triangle',
        kind: 'async'
      };
    if (t === 'GeneratorFunction')
      return {
        shape: 'square',
        kind: 'generator'
      };
    if (t === 'AsyncGeneratorFunction')
      return {
        shape: 'diamond',
        kind: 'async-generator'
      };
    return {
      shape: 'circle',
      kind: 'sync'
    };
  };
  const rowMarks = yDomain.map(n => ({
    name: n,
    ...typeShape(n)
  }));
  const valLabel = name => {
    const v = nameToVar.get(name);
    if (!v)
      return name;
    const preview = formatValPreview(v._value);
    return preview ? `${ name }: ${ preview }` : name;
  };
  const fig = Plot.plot({
    width,
    height,
    marginLeft: 320,
    marginRight: 10,
    style: {
      fontSize: '14px',
      overflow: 'visible'
    },
    x: {
      type: 'time',
      domain: domain.map(d => new Date(d)),
      label: null
    },
    y: {
      axis: 'left',
      domain: yDomain,
      label: null,
      padding: 0.3,
      tickFormat: valLabel
    },
    color: {
      type: 'categorical',
      domain: [
        'blocked',
        'computing',
        'fulfilled',
        'rejected',
        'span',
        'sync',
        'async',
        'generator',
        'async-generator'
      ],
      range: [
        '#f4c542',
        '#3a80ff',
        '#3ec46d',
        '#e34c4c',
        '#bbb',
        ...d3.schemeTableau10.slice(0, 4)
      ],
      legend: true
    },
    symbol: { legend: true },
    marks: [
      Plot.ruleX(tickTimes || [], {
        x: d => new Date(d),
        stroke: '#3a80ff',
        strokeOpacity: 0.12,
        strokeWidth: 1
      }),
      Plot.dot(rowMarks, {
        x: () => new Date(domain[0]),
        y: 'name',
        symbol: 'shape',
        fill: 'kind',
        stroke: 'kind',
        r: 5,
        dx: -10,
        title: d => `${ d.kind } cell`
      }),
      Plot.rect(spans, {
        x1: d => new Date(d.x1),
        x2: d => new Date(d.x2),
        y: 'name',
        fill: '#ddd',
        stroke: '#bbb',
        insetTop: 7,
        insetBottom: 7,
        title: formatTooltip,
        tip: true
      }),
      Plot.rect(ticks.filter(t => t.x1 !== undefined), {
        x1: d => new Date(d.x1),
        x2: d => new Date(d.x2),
        y: 'name',
        fill: 'colorState',
        insetTop: 7,
        insetBottom: 7,
        title: formatTooltip,
        tip: true
      }),
      Plot.tickX(ticks.filter(t => t.x !== undefined), {
        x: d => new Date(d.x),
        y: 'name',
        stroke: 'colorState',
        strokeWidth: 2,
        title: formatTooltip,
        tip: true
      })
    ]
  });
  fig.style.overflow = 'visible';
  const svg = fig.querySelector('svg.plot-d6a7b5') || [...fig.querySelectorAll('svg')].find(s => s.parentElement === fig) || fig.querySelector('svg');
  if (svg)
    svg.style.overflow = 'visible';
  const labelToName = new Map();
  for (const n of yDomain)
    labelToName.set(valLabel(n), n);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  for (const text of svg.querySelectorAll('text')) {
    const tn = text.textContent;
    const n = labelToName.get(tn);
    if (!n)
      continue;
    const v = nameToVar.get(n);
    const mod = v?._module?._name;
    const target = mod ? `${ mod }#${ n }` : n;
    let href;
    try {
      href = linkTo(target);
    } catch {
      href = null;
    }
    if (!href)
      continue;
    const a = document.createElementNS(SVG_NS, 'a');
    a.setAttribute('href', href);
    a.setAttribute('target', '_top');
    text.parentNode.insertBefore(a, text);
    a.appendChild(text);
    text.style.cursor = 'pointer';
    text.style.fill = '#3a80ff';
    text.style.textDecoration = 'underline';
  }
  const xScale = fig.scale('x');
  const yScale = fig.scale('y');
  const [r0, r1] = xScale.range;
  const [yA, yB] = yScale.range;
  const yTop = Math.min(yA, yB);
  const yBot = Math.max(yA, yB);
  const d0 = +xScale.domain[0], d1 = +xScale.domain[1];
  const pxToMs = px => d0 + (px - r0) * (d1 - d0) / (r1 - r0);
  const target = $0;
  const brush = d3.brushX().extent([
    [
      r0,
      yTop
    ],
    [
      r1,
      yBot
    ]
  ]).on('end', ev => {
    if (!ev.sourceEvent)
      return;
    const sel = ev.selection;
    if (sel === null) {
      target.value = null;
    } else {
      const [s0, s1] = sel;
      if (Math.abs(s1 - s0) < 3) {
        target.value = null;
      } else {
        target.value = [
          pxToMs(s0),
          pxToMs(s1)
        ];
      }
    }
    target.dispatchEvent(new Event('input'));
  });
  const brushG = d3.select(svg).append('g').attr('class', 'brush').call(brush);
  brushG.selectAll('.selection').attr('fill', '#3a80ff').attr('fill-opacity', 0.18).attr('stroke', '#3a80ff');
  return fig;
};
const _qrp58y = function _vizHolder(htl){return(
htl.html`<div></div>`
)};
const _1hrht0t = function _vizUpdater(vizHolder,viz)
{
  while (vizHolder.firstChild)
    vizHolder.firstChild.remove();
  vizHolder.appendChild(viz);
  return vizHolder;
};
const _p4ix2c = function _debuggr(htl,$0,$1,liveBtn,perfOverlay,vizUpdater,vizHolder){return(
this || htl.html`<div>
  <div style="display:flex;flex-wrap:wrap;gap:1em;align-items:center;padding:4px 0;">
    ${ $0 }
    ${ $1 }
    ${ liveBtn }
    ${ perfOverlay }
  </div>
  ${ vizUpdater, vizHolder }
</div>`
)};
const _ymcrc7 = function _pauseEnd(paused,hoverPaused){return(
paused || hoverPaused ? performance.now() : null
)};
const _1ll9u0v = function _filterRe(nameFilter)
{
  if (!nameFilter || typeof nameFilter !== 'string' || nameFilter.length === 0)
    return null;
  try {
    return new RegExp(nameFilter, 'i');
  } catch {
    return 'invalid';
  }
};
const _1pw4hij = function _perfOverlay(htl,now)
{
  const el = this || htl.html`<span style="font-family:ui-monospace,monospace;font-size:11px;color:#666;padding:0 6px;border-left:1px solid #eee;"></span>`;
  now;
  const p = window.__dbg2Perf || {};
  const fmt = k => p[k] !== undefined ? p[k].toFixed(1) : '\u2013';
  const re = p.invalidRe ? ' \xB7 \u26A0 invalid regex' : '';
  el.textContent = `snap ${ fmt('snapMs') }ms · viz ${ fmt('vizMs') }ms · ${ p.marks ?? '\u2013' } marks · ${ p.shown ?? '\u2013' }/${ p.tracked ?? '\u2013' } rows${ re }`;
  el.style.color = p.invalidRe ? '#c00' : '#666';
  return el;
};
const _1hs14up = function _formatValPreview(){return(
v => {
  if (v === undefined)
    return '\u2205';
  if (v === null)
    return 'null';
  if (typeof v === 'function')
    return 'ƒ';
  if (typeof v === 'object') {
    if (v.nodeType === 1)
      return `<${ v.nodeName.toLowerCase() }>`;
    if (Array.isArray(v))
      return `[${ v.length }]`;
    try {
      return JSON.stringify(v).slice(0, 18);
    } catch {
      return '{\u2026}';
    }
  }
  if (typeof v === 'number')
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v).slice(0, 18);
}
)};
const _xmr39b = function _formatTooltip(){return(
d => {
  const lines = [d.name];
  if (d.mod)
    lines.push(d.mod);
  if (d.state)
    lines.push(`state: ${ d.state }`);
  if (d.count !== undefined)
    lines.push(`${ d.count } events`);
  if (d.tBlocked != null)
    lines.push(`blocked: ${ d.tBlocked.toFixed(1) }ms`);
  if (d.tCompute != null)
    lines.push(`compute: ${ d.tCompute.toFixed(1) }ms`);
  if (d.blockedMs !== undefined)
    lines.push(`blocked total: ${ d.blockedMs.toFixed(0) }ms`);
  if (d.computingMs !== undefined)
    lines.push(`compute total: ${ d.computingMs.toFixed(0) }ms`);
  if (d.errors)
    lines.push(`errors: ${ d.errors }`);
  return lines.join('\n');
}
)};
const _1qbkg06 = function _hoverPaused(htl,vizHolder,Event,invalidation)
{
  const el = htl.html`<span style="display:none"></span>`;
  el.value = false;
  const wait = setInterval(() => {
    if (vizHolder && vizHolder.isConnected) {
      clearInterval(wait);
      vizHolder.addEventListener('mouseenter', () => {
        if (!el.value) {
          el.value = true;
          el.dispatchEvent(new Event('input'));
        }
      });
      vizHolder.addEventListener('mouseleave', () => {
        if (el.value) {
          el.value = false;
          el.dispatchEvent(new Event('input'));
        }
      });
    }
  }, 100);
  invalidation.then(() => clearInterval(wait));
  return el;
};
const _4u4omu = (G, _) => G.input(_);
const _1wn05j5 = function _refresh(htl)
{
  const el = htl.html`<span style="display:none"></span>`;
  el.value = 0;
  return el;
};
const _1he8f0d = (G, _) => G.input(_);
const _zktutb = function _refreshDriver(paused,hoverPaused,zoomDomain,$0,Event,invalidation)
{
  if (paused || hoverPaused || Array.isArray(zoomDomain))
    return 'idle';
  const target = $0;
  let raf;
  const tick = () => {
    target.value = performance.now();
    target.dispatchEvent(new Event('input'));
    raf = requestAnimationFrame(tick);
  };
  tick();
  invalidation.then(() => cancelAnimationFrame(raf));
  return 'running';
};
const _5q6ynl = function _WINDOW_SECS(){return(
30
)};
const _yh8c02 = function _zoomDomain(htl)
{
  const el = htl.html`<span style="display:none"></span>`;
  el.value = null;
  return el;
};
const _1c1zqoz = (G, _) => G.input(_);
const _6jvaja = function _liveBtn(htl,zoomDomain,$0,Event)
{
  const el = this || htl.html`<button style="font-size:11px;padding:2px 8px;border:1px solid #3a80ff;background:#eaf2ff;color:#3a80ff;border-radius:3px;cursor:pointer;"></button>`;
  const zoomed = Array.isArray(zoomDomain);
  if (zoomed) {
    const secs = (zoomDomain[1] - zoomDomain[0]) / 1000;
    const txt = secs >= 10 ? secs.toFixed(0) : secs.toFixed(1);
    el.textContent = `↺ live (zoomed ${ txt }s)`;
    el.style.display = 'inline-block';
  } else {
    el.style.display = 'none';
  }
  el.onclick = () => {
    const target = $0;
    target.value = null;
    target.dispatchEvent(new Event('input'));
  };
  return el;
};
const _10voue1 = function _d3(require){return(
require('d3@7')
)};
const _1x84t10 = function _TickRing(){return(
class TickRing {
  constructor(K = 4096) {
    this.K = K;
    this.t = new Float64Array(K);
    this.head = 0;
    this.count = 0;
  }
  push(time) {
    this.t[this.head] = time;
    this.head = (this.head + 1) % this.K;
    if (this.count < this.K)
      this.count++;
  }
  inRange(start, end) {
    const out = [];
    const {K, t, count, head} = this;
    const startIdx = (head - count + K) % K;
    for (let i = 0; i < count; i++) {
      const v = t[(startIdx + i) % K];
      if (v >= start && v <= end)
        out.push(v);
    }
    return out;
  }
  clear() {
    this.head = 0;
    this.count = 0;
  }
}
)};
const _rwb3m0 = function _tickRing(TickRing){return(
new TickRing(4096)
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));  
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));  
  main.define("module @tomlarkworthy/lopepage-urls", async () => runtime.module((await import("/@tomlarkworthy/lopepage-urls.js?v=4")).default));  
  $def("_rxp7mv", null, ["md"], _rxp7mv);  
  $def("_1wfoz75", null, ["md"], _1wfoz75);  
  $def("_xd5qq", "K", [], _xd5qq);  
  $def("_13erayv", "COALESCE", [], _13erayv);  
  $def("_1ltk6ti", "makeRow", [], _1ltk6ti);  
  $def("_kjeox0", "rollupRow", [], _kjeox0);  
  $def("_b892oh", "EventLog", ["makeRow","rollupRow"], _b892oh);  
  $def("_1xfdb5s", "makeFakeVar", [], _1xfdb5s);  
  $def("_f2bxej", "test_eventlog_basic_no_inputs", ["EventLog","makeFakeVar","expect"], _f2bxej);  
  $def("_1jp2v6g", "test_eventlog_threestate_via_dep", ["EventLog","makeFakeVar","expect"], _1jp2v6g);  
  $def("_b4ohl3", "test_eventlog_rollup_folds_oldest", ["EventLog","makeFakeVar","expect"], _b4ohl3);  
  $def("_a84g4y", "test_eventlog_rejected_marks_error", ["EventLog","makeFakeVar","expect"], _a84g4y);  
  $def("_1s7eveb", null, ["md"], _1s7eveb);  
  $def("_1nezd3r", "log", ["EventLog","K","COALESCE"], _1nezd3r);  
  $def("_9zdsj7", "viewof selfModule", ["thisModule"], _9zdsj7);  
  $def("_4pnliu", "selfModule", ["Generators","viewof selfModule"], _4pnliu);  
  $def("_bmfmgk", "selfExcludes", ["lookupVariable","selfModule","descendants"], _bmfmgk);  
  $def("_1xtu87y", "installTracking", ["variables","runtime","tickRing","invalidation","selfModule","observe","log"], _1xtu87y);  
  $def("_1lu7yg1", null, ["md"], _1lu7yg1);  
  $def("_fc81gl", "viewof timeDelay", ["Inputs"], _fc81gl);  
  $def("_1r2fbyu", "timeDelay", ["Generators","viewof timeDelay"], _1r2fbyu);  
  $def("_1f2dnbn", "viewof paused", ["Inputs"], _1f2dnbn);  
  $def("_1spv9xq", "paused", ["Generators","viewof paused"], _1spv9xq);  
  $def("_shn35j", "viewof nameFilter", ["Inputs"], _shn35j);  
  $def("_1rkelpd", "nameFilter", ["Generators","viewof nameFilter"], _1rkelpd);  
  $def("_1do3584", "viewof clearBtn", ["Inputs","log"], _1do3584);  
  $def("_gwugmb", "clearBtn", ["Generators","viewof clearBtn"], _gwugmb);  
  $def("_qk3yaa", "rowsSnapshot", ["installTracking","refresh","refreshDriver","pauseEnd","zoomDomain","filterRe","timeDelay","WINDOW_SECS","log","selfModule","tickRing"], _qk3yaa);  
  $def("_10dhtpb", "stateColors", [], _10dhtpb);  
  $def("_v5cph7", "viz", ["rowsSnapshot","htl","formatValPreview","Plot","width","d3","formatTooltip","linkTo","viewof zoomDomain","Event"], _v5cph7);  
  $def("_qrp58y", "vizHolder", ["htl"], _qrp58y);  
  $def("_1hrht0t", "vizUpdater", ["vizHolder","viz"], _1hrht0t);  
  $def("_p4ix2c", "debuggr", ["htl","viewof clearBtn","viewof nameFilter","liveBtn","perfOverlay","vizUpdater","vizHolder"], _p4ix2c);  
  $def("_ymcrc7", "pauseEnd", ["paused","hoverPaused"], _ymcrc7);  
  $def("_1ll9u0v", "filterRe", ["nameFilter"], _1ll9u0v);  
  $def("_1pw4hij", "perfOverlay", ["htl","now"], _1pw4hij);  
  $def("_1hs14up", "formatValPreview", [], _1hs14up);  
  $def("_xmr39b", "formatTooltip", [], _xmr39b);  
  $def("_1qbkg06", "viewof hoverPaused", ["htl","vizHolder","Event","invalidation"], _1qbkg06);  
  $def("_4u4omu", "hoverPaused", ["Generators","viewof hoverPaused"], _4u4omu);  
  $def("_1wn05j5", "viewof refresh", ["htl"], _1wn05j5);  
  $def("_1he8f0d", "refresh", ["Generators","viewof refresh"], _1he8f0d);  
  $def("_zktutb", "refreshDriver", ["paused","hoverPaused","zoomDomain","viewof refresh","Event","invalidation"], _zktutb);  
  $def("_5q6ynl", "WINDOW_SECS", [], _5q6ynl);  
  $def("_yh8c02", "viewof zoomDomain", ["htl"], _yh8c02);  
  $def("_1c1zqoz", "zoomDomain", ["Generators","viewof zoomDomain"], _1c1zqoz);  
  $def("_6jvaja", "liveBtn", ["htl","zoomDomain","viewof zoomDomain","Event"], _6jvaja);  
  $def("_10voue1", "d3", ["require"], _10voue1);  
  $def("_1x84t10", "TickRing", [], _1x84t10);  
  $def("_rwb3m0", "tickRing", ["TickRing"], _rwb3m0);  
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));  
  main.define("observe", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("observe", _));  
  main.define("variables", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("variables", _));  
  main.define("lookupVariable", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("lookupVariable", _));  
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));  
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));  
  main.define("descendants", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("descendants", _));  
  main.define("keepalive", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("keepalive", _));  
  main.define("RTGen", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("Generators", "RTGen", _));  
  main.define("linkTo", ["module @tomlarkworthy/lopepage-urls", "@variable"], (_, v) => v.import("linkTo", _));
  return main;
}