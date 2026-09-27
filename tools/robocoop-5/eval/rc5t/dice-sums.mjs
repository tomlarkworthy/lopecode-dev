// rc5-train eval (20260928-0215-w15): two-dice simulation with a roll-count slider, charted against theory.
// Behavioural, so any correct build passes whatever the module id or cell names. setup.collect keeps every
// cell of a module created during the turn reachable, seeds Math.random, drives the range input (set value +
// dispatch "input") to two roll counts and reads every numeric series the module's cells hold:
//   theory     — some series equals (6-|s-7|)/36 for s=2..12 (or the same in percent). Catches uniform-over-11,
//                off-by-one indexing and 0..5 dice.
//   empirical  — at each roll count some other series, normalised, is within a binomial tolerance of theory.
//   reacts     — the empirical series changes when the slider moves (a value cell that read `.value` once fails).
//   sameScale  — a normalised empirical series exists on the theory's scale (fractions vs fractions, % vs %),
//                or the counts are only divided at plot time and the chart's largest tick is on the theory scale.
//   legend     — the module's rendered text names both series (empirical/simulated/observed + theoretical/expected).

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const out = { module: false, slider: false, theory: false, empirical: false, reacts: false, sameScale: false, legend: false, chart: false, detail: "" };
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) { out.detail = "no module was created"; return out; }
  out.module = true;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const realRandom = Math.random;
  const THEORY = [1,2,3,4,5,6,5,4,3,2,1].map(k => k / 36);
  const num = x => typeof x === "number" && Number.isFinite(x);
  // every 11-long series indexed by sum 2..12 that a value holds
  const seriesOf = (val) => {
    const res = [];
    const fromArr = a => {
      if (a.length === 11 && a.every(num)) res.push(a.slice());
      else if (a.length === 13 && a.every(num) && a[0] === 0 && a[1] === 0) res.push(a.slice(2));
      else if (a.length === 12 && a.every(num) && a[0] === 0) res.push(a.slice(1));
    };
    if (val instanceof Map) val = Object.fromEntries(val);
    if (ArrayBuffer.isView(val)) val = [...val];
    if (Array.isArray(val)) {
      fromArr(val);
      if (val.length && val.every(r => r && typeof r === "object" && !Array.isArray(r))) {
        const keys = Object.keys(val[0]);
        const sk = keys.find(k => val.every(r => Number.isInteger(+r[k]) && +r[k] >= 0 && +r[k] <= 12) &&
          [2,3,4,5,6,7,8,9,10,11,12].every(s => val.some(r => +r[k] === s)));
        if (sk) {
          const strKeys = keys.filter(k => k !== sk && val.every(r => typeof r[k] === "string"));
          const groups = strKeys.length ? [...new Set(val.map(r => strKeys.map(k => r[k]).join("|")))].map(g => val.filter(r => strKeys.map(k => r[k]).join("|") === g)) : [val];
          for (const g of groups) for (const k of keys) {
            if (k === sk || !g.every(r => num(r[k]))) continue;
            const s = [2,3,4,5,6,7,8,9,10,11,12].map(x => { const r = g.find(r => +r[sk] === x); return r ? r[k] : 0; });
            res.push(s);
          }
        }
      }
    } else if (val && typeof val === "object" && !(val instanceof Node)) {
      const ks = [2,3,4,5,6,7,8,9,10,11,12];
      if (ks.every(k => num(val[k]))) res.push(ks.map(k => val[k]));
      for (const k of Object.keys(val).slice(0, 20)) if (val[k] && typeof val[k] === "object" && !(val[k] instanceof Node)) {
        const inner = val[k];
        if (Array.isArray(inner) || inner instanceof Map || (ks.every(j => num(inner[j])))) res.push(...seriesOf(inner));
      }
    }
    return res;
  };
  const isTheory = s => THEORY.every((p, i) => Math.abs(s[i] - p) < 1e-6) ? 1 : THEORY.every((p, i) => Math.abs(s[i] - 100 * p) < 1e-4) ? 100 : 0;
  const allSeries = () => userVars.flatMap(v => seriesOf(v._value).map(s => ({ v: v._name, s })));
  const els = () => userVars.map(v => v._value).filter(x => x instanceof Element);
  const settle = async (pred, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await sleep(150); if (pred()) return true; } return false; };
  try {
    await sleep(500);
    // theory
    const th = allSeries().find(x => isTheory(x.s));
    out.theory = !!th;
    const scale = th ? isTheory(th.s) : 1;
    // the slider: a viewof whose element has a range input
    let view = userVars.find(v => String(v._name).startsWith("viewof ") && v._value instanceof Element &&
      (v._value.matches("input[type=range]") || v._value.querySelector("input[type=range]")));
    const rangeEl = view ? (view._value.matches("input[type=range]") ? view._value : view._value.querySelector("input[type=range]"))
      : els().map(e => e.matches("input[type=range]") ? e : e.querySelector("input[type=range]")).find(Boolean);
    if (!rangeEl) { out.detail = "no range input in the module"; return out; }
    out.slider = true;
    const lo = +rangeEl.min || 1, hi = +rangeEl.max || 100000;
    const pick = want => Math.max(lo, Math.min(hi, want));
    const nA = pick(20000), nB = pick(Math.max(lo, Math.round(nA / 4)));
    const drive = n => {
      const target = view ? view._value : rangeEl;
      let s = 1;
      Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      try { target.value = n; } catch {}
      if (target !== rangeEl) rangeEl.value = n;
      rangeEl.dispatchEvent(new Event("input", { bubbles: true }));
      if (target !== rangeEl) target.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const snap = () => JSON.stringify(allSeries().filter(x => !isTheory(x.s)).map(x => x.s));
    const judge = n => {
      const tol = 4 * Math.sqrt((1 / 6) * (5 / 6) / n) + 0.003;
      const cands = allSeries().filter(x => !isTheory(x.s));
      let best = null;
      for (const c of cands) {
        const tot = c.s.reduce((a, b) => a + b, 0);
        if (!(tot > 0)) continue;
        const f = c.s.map(x => x / tot);
        const ok = f.every((x, i) => Math.abs(x - THEORY[i]) < tol);
        const isCounts = Math.abs(tot - n) < 0.5;
        const onScale = Math.abs(tot - scale) < 0.01 * scale;
        if (ok) best = best && best.onScale ? best : { v: c.v, isCounts, onScale, tot };
      }
      return best;
    };
    const before = snap();
    drive(nA);
    await settle(() => snap() !== before);
    await sleep(600);
    const a = judge(nA), sA = snap();
    drive(nB);
    await settle(() => snap() !== sA);
    await sleep(600);
    const b = judge(nB), sB = snap();
    out.empirical = !!(a && b);
    out.reacts = sA !== sB && !!b && (!b.isCounts || Math.abs(b.tot - nB) < 0.5);
    const chartEl = els().find(e => e.matches("svg,canvas") || e.querySelector("svg:not(input svg),canvas"));
    out.chart = !!chartEl;
    if (a && (a.onScale || b?.onScale)) out.sameScale = true;
    else if (a && chartEl) {
      const ticks = [...chartEl.querySelectorAll("g[aria-label='y-axis tick label'] text, [aria-label*='y-axis'] text")].map(t => parseFloat(t.textContent.replace(/[−–]/g, "-"))).filter(Number.isFinite);
      if (ticks.length) out.sameScale = Math.max(...ticks) <= (scale === 100 ? 100 : 1.0001);
    }
    const text = els().map(e => e.textContent).join(" ");
    out.legend = /empiric|simulat|observ|experiment|sampl|rolled|actual/i.test(text) && /theor|expect|exact|ideal|predict/i.test(text);
    out.detail = "range [" + lo + "," + hi + "] nA=" + nA + " nB=" + nB + " theory=" + (th ? th.v : "none") + " empA=" + JSON.stringify(a) + " empB=" + JSON.stringify(b) +
      " series=" + JSON.stringify(allSeries().map(x => x.v + ":" + x.s.map(y => +y.toFixed(3)).slice(0, 6).join(",")).slice(0, 8));
    return out;
  } finally {
    Math.random = realRandom;
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

// Idiom: viewof as two $def lines (knowledge/writing-cells-in-module-source.md), Plot bars + dots with a
// Plot legend (color: {legend: true}).
const SOLUTION = `const _intro = function intro(md){return( md\`# Two dice\` )};
const _viewof_rolls = function viewof_rolls(Inputs){return( Inputs.range([100, 50000], {value: 1000, step: 100, label: "Number of rolls"}) )};
const _rolls_value = function rolls(G, v){return( G.input(v) )};
const _counts = function counts(rolls){
  const c = new Array(13).fill(0);
  for (let i = 0; i < rolls; i++) c[(1 + Math.floor(Math.random() * 6)) + (1 + Math.floor(Math.random() * 6))]++;
  return c;
};
const _rows = function rows(counts, rolls){return(
  [2,3,4,5,6,7,8,9,10,11,12].flatMap(s => [
    { sum: s, p: counts[s] / rolls, series: "Simulated" },
    { sum: s, p: (6 - Math.abs(s - 7)) / 36, series: "Theoretical" }
  ])
)};
const _chart = function chart(Plot, rows){return(
  Plot.plot({ color: { legend: true }, x: { label: "Sum" }, y: { label: "Probability", grid: true },
    marks: [ Plot.barY(rows.filter(d => d.series === "Simulated"), { x: "sum", y: "p", fill: "series" }),
             Plot.dot(rows.filter(d => d.series === "Theoretical"), { x: "sum", y: "p", fill: "series", r: 5 }) ] })
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_viewof_rolls", "viewof rolls", ["Inputs"], _viewof_rolls);
  $def("_rolls", "rolls", ["Generators", "viewof rolls"], _rolls_value);
  $def("_counts", "counts", ["rolls"], _counts);
  $def("_rows", "rows", ["counts", "rolls"], _rows);
  $def("_chart", "chart", ["Plot", "rows"], _chart);
  return main;
}
`;

export const SOLUTION_SRC = SOLUTION;

export default {
  id: "rc5t-dice-sums",
  category: "rc5-train",
  question: "Simulate rolling two dice, with a slider for the number of rolls, and chart the distribution of the sums against the theoretical probabilities.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "theory", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "empirical", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "reacts", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "sameScale", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "legend", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "chart", equals: true }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/dice.js", content: SOLUTION }, settleMs: 2000 },
  ],
};
