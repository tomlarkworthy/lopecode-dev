// rc5t-stacked-screen-time: inline wide rows -> a stacked bar chart, one bar per day, one segment per app.
// Wide rows ({day, Email, Slack, Browser}) invite the w27 defect (run 20260928-0525-w27 eval-fixed): pivoting
// in the channel spec, Plot.barY(wide, Plot.stackY({y: apps.map(a => d => d[a]), fill: apps.map(a => () => a)}))
// computes with no error and draws 0 bars.
// Scoring reads the drawn DOM only (setup.collect), so any module id, cell names, Plot or d3 pass:
//   drawn — some <svg> (width >= 100) in a new module draws >= 15 rects with positive width and height.
//   stack — in that svg, rects grouped by x (or by y, for horizontal bars) form 5 bars whose totals and
//           segments are proportional to the data (scale-free, order-free; within 3%).
const DATA = [
  { day: "Mon", Email: 1.5, Slack: 2.0, Browser: 3.0 },
  { day: "Tue", Email: 1.0, Slack: 2.5, Browser: 2.0 },
  { day: "Wed", Email: 2.0, Slack: 1.5, Browser: 4.0 },
  { day: "Thu", Email: 0.5, Slack: 3.0, Browser: 2.5 },
  { day: "Fri", Email: 1.2, Slack: 1.0, Browser: 1.8 },
];
const APPS = ["Email", "Slack", "Browser"];
const EXP = DATA.map(r => APPS.map(a => r[a]));

const COLLECT = String.raw`(async (EXP) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rt = globalThis.__ojs_runtime;
  const base = globalThis.__baseMods || new Set();
  const out = { newModules: [...rt.mains.keys()].filter(n => !base.has(n)), drawn: false, stack: false };
  const newVars = () => [...rt._variables].filter(v => v._module && v._name && out.newModules.some(n => rt.mains.get(n) === v._module));
  const keepers = [];
  for (const v of newVars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(2000);
    const els = newVars().map(v => v._value).filter(x => x instanceof Element);
    const svgs = [...new Set(els.flatMap(e => (e.localName === "svg" ? [e] : []).concat([...e.querySelectorAll("svg")])))]
      .filter(s => (parseFloat(s.getAttribute("width")) || +(s.getAttribute("viewBox") || "").split(/[\s,]+/)[2] || 0) >= 100);
    const want = EXP.map(r => r.reduce((a, b) => a + b, 0));
    const near = (a, b) => Math.abs(a - b) <= 0.03 * Math.max(Math.abs(a), Math.abs(b));
    out.svgs = [];
    for (const s of svgs) {
      const W = parseFloat(s.getAttribute("width")) || 1e9;
      const rects = [...s.querySelectorAll("rect")].map(r => ({ x: +r.getAttribute("x") || 0, y: +r.getAttribute("y") || 0, w: +r.getAttribute("width"), h: +r.getAttribute("height") }))
        .filter(r => r.w > 0 && r.h > 0 && r.w < 0.5 * W);
      const info = { rects: rects.length };
      if (rects.length >= 15) out.drawn = true;
      for (const [pos, len] of [["x", "h"], ["y", "w"]]) {
        const bars = new Map();
        for (const r of rects) { const k = Math.round(r[pos]); (bars.get(k) || bars.set(k, []).get(k)).push(r[len]); }
        if (bars.size !== EXP.length) continue;
        const got = [...bars.values()].map(seg => ({ total: seg.reduce((a, b) => a + b, 0), seg: seg.sort((a, b) => a - b) }));
        const k = got.reduce((a, g) => a + g.total, 0) / want.reduce((a, b) => a + b, 0);
        const used = new Set();
        const ok = got.every(g => {
          const i = want.findIndex((t, j) => !used.has(j) && near(g.total, t * k));
          if (i < 0) return false;
          used.add(i);
          const exp = [...EXP[i]].sort((a, b) => a - b);
          return g.seg.length === exp.length && g.seg.every((v, j) => near(v, exp[j] * k));
        });
        info[pos] = { bars: got.map(g => +(g.total / k).toFixed(2)), ok };
        if (ok) out.stack = true;
      }
      out.svgs.push(info);
    }
    out.svgs = out.svgs.filter(i => i.rects).slice(0, 4);
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})(__EXP__)`.replace("__EXP__", JSON.stringify(EXP));

const QUESTION = "Here is my screen time last week, in hours per app:\n" + JSON.stringify(DATA) +
  "\nMake me a stacked bar chart: one bar per day, split into a coloured segment per app, with a legend.";

// Oracle: long rows, fill channel — @observablehq/plot-stack cell _9, Plot.barY(crimea, {x: "date", y: "deaths", fill: "cause"})
// (lopebooks @tomlarkworthy_cloudevents-explorer.html); x domain keeps the weekday order.
const ORACLE_SRC = `const _intro = function intro(md){return( md\`# Screen time\` )};
const _week = function week(){return(
${JSON.stringify(DATA)}
)};
const _usage = function usage(week){return(
week.flatMap(({day, ...apps}) => Object.entries(apps).map(([app, hours]) => ({day, app, hours})))
)};
const _chart = function chart(Plot, week, usage){return(
Plot.plot({
  x: {domain: week.map(d => d.day), label: null},
  y: {grid: true, label: "Hours"},
  color: {legend: true},
  marks: [Plot.barY(usage, {x: "day", y: "hours", fill: "app"}), Plot.ruleY([0])]
})
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_week", "week", [], _week);
  $def("_usage", "usage", ["week"], _usage);
  $def("_chart", "chart", ["Plot", "week", "usage"], _chart);
  return main;
}
`;

export default {
  id: "rc5t-stacked-screen-time",
  category: "rc5-train",
  question: QUESTION,
  setup: {
    init: "globalThis.__baseMods = new Set(globalThis.__ojs_runtime.mains.keys())",
    collect: COLLECT,
  },
  criteria: [
    { name: "collected_equals", args: { key: "drawn", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "stack", equals: true }, weight: 2 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/screen-time.js", content: ORACLE_SRC }, settleMs: 2000 },
  ],
};

export { DATA, APPS, ORACLE_SRC };
