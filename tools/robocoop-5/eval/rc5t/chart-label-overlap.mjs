// rc5-train eval (20260928-0847-m21): maintenance, "the labels on my chart overlap".
// setup.files seeds @user/bench-chart: a faceted Plot bar chart copied from the corpus cell
// @tomlarkworthy/why-claude-code-codes-well._i4dqdyo (lopebooks/notebooks/@tomlarkworthy_coding_harness_tuning_blog.html),
// re-homed with its runs moved to a `runs` cell and the arm names lengthened (seeded, from the same
// module's _blog11 table) so the four fx facet labels (~250-330px each) overlap in ~170px facets.
// setup.collect scores behaviour geometrically on a clone of every chart SVG (one with a bar mark) in the
// modules the turn could have touched: every <text> gets an oriented box (getBBox through getScreenCTM,
// so rotated labels are not over-counted as axis-aligned boxes) and
//   noOverlap   no two text boxes intersect by more than 2px (separating-axis test; Plot's own default layout can touch by ~1px)
//   labelsOk    each of the 4 arm names is the text of one element, visible (display/visibility/opacity),
//               font >= 9 user units, and inside the svg's box (not cut off by the viewBox)
//   readable    noOverlap && labelsOk (the scored key)
//   dataSame    a cell still holds the 24 seeded rows unchanged (base run 20260928-0847-m21 renamed the arms in the data)
//   marksSame   8 bars whose values are the 8 means, and 24 dots (the data is unchanged)
const FIXTURE = `const _intro = function intro(md){return( md\`# Harness benchmark

Steps each coding-agent harness took to finish the long-edit task, 3 runs per harness and model. Lower is better.\` )};
const _runs = function runs(){return( [
  { arm: "Structured: off-distribution semantic API", model: "mimo v2.5-pro", steps: 31 },
  { arm: "Structured: off-distribution semantic API", model: "mimo v2.5-pro", steps: 10 },
  { arm: "Structured: off-distribution semantic API", model: "mimo v2.5-pro", steps: 31 },
  { arm: "Structured: off-distribution semantic API", model: "sonnet-4.6", steps: 27 },
  { arm: "Structured: off-distribution semantic API", model: "sonnet-4.6", steps: 21 },
  { arm: "Structured: off-distribution semantic API", model: "sonnet-4.6", steps: 20 },
  { arm: "Bash: on-distribution shell (sed/heredoc)", model: "mimo v2.5-pro", steps: 16 },
  { arm: "Bash: on-distribution shell (sed/heredoc)", model: "mimo v2.5-pro", steps: 21 },
  { arm: "Bash: on-distribution shell (sed/heredoc)", model: "mimo v2.5-pro", steps: 31 },
  { arm: "Bash: on-distribution shell (sed/heredoc)", model: "sonnet-4.6", steps: 13 },
  { arm: "Bash: on-distribution shell (sed/heredoc)", model: "sonnet-4.6", steps: 14 },
  { arm: "Bash: on-distribution shell (sed/heredoc)", model: "sonnet-4.6", steps: 22 },
  { arm: "Std tools: Read/Write/Edit, file reformatted between reads", model: "mimo v2.5-pro", steps: 18 },
  { arm: "Std tools: Read/Write/Edit, file reformatted between reads", model: "mimo v2.5-pro", steps: 19 },
  { arm: "Std tools: Read/Write/Edit, file reformatted between reads", model: "mimo v2.5-pro", steps: 21 },
  { arm: "Std tools: Read/Write/Edit, file reformatted between reads", model: "sonnet-4.6", steps: 17 },
  { arm: "Std tools: Read/Write/Edit, file reformatted between reads", model: "sonnet-4.6", steps: 18 },
  { arm: "Std tools: Read/Write/Edit, file reformatted between reads", model: "sonnet-4.6", steps: 19 },
  { arm: "Std tools: Read/Write/Edit with a byte-stable /src", model: "mimo v2.5-pro", steps: 9 },
  { arm: "Std tools: Read/Write/Edit with a byte-stable /src", model: "mimo v2.5-pro", steps: 10 },
  { arm: "Std tools: Read/Write/Edit with a byte-stable /src", model: "mimo v2.5-pro", steps: 12 },
  { arm: "Std tools: Read/Write/Edit with a byte-stable /src", model: "sonnet-4.6", steps: 8 },
  { arm: "Std tools: Read/Write/Edit with a byte-stable /src", model: "sonnet-4.6", steps: 8 },
  { arm: "Std tools: Read/Write/Edit with a byte-stable /src", model: "sonnet-4.6", steps: 8 }
] )};
const _chart = function chart(Plot, runs){return( Plot.plot({
  title: "Steps to complete the long-edit task, by harness",
  subtitle: "N=3 per arm, every run passes: bars are mean steps (lower is better), dots the individual runs",
  width: 720,
  height: 280,
  marginLeft: 40,
  marginBottom: 40,
  fx: { label: null, domain: [...new Set(runs.map(d => d.arm))] },
  x: { axis: null },
  y: { label: "steps", grid: true },
  color: { legend: true },
  marks: [
    Plot.barY(runs, Plot.groupX({ y: "mean" }, { fx: "arm", x: "model", y: "steps", fill: "model", tip: true })),
    Plot.dot(runs, { fx: "arm", x: "model", y: "steps", fill: "currentColor", r: 2.5 }),
    Plot.ruleY([0])
  ]
}) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_runs", "runs", [], _runs);
  $def("_chart", "chart", ["Plot", "runs"], _chart);
  return main;
}
`;

const ARMS = [
  "Structured: off-distribution semantic API",
  "Bash: on-distribution shell (sed/heredoc)",
  "Std tools: Read/Write/Edit, file reformatted between reads",
  "Std tools: Read/Write/Edit with a byte-stable /src",
];
// means of the seeded runs: arm x model (mimo, sonnet)
const MEANS = [24, 22.7, 22.7, 16.3, 19.3, 18, 10.3, 8];

// the seeded rows, read back out of the fixture's runs cell
const RUNS = [...FIXTURE.matchAll(/\{ arm: "([^"]+)", model: "([^"]+)", steps: (\d+) \}/g)].map(m => ({ arm: m[1], model: m[2], steps: +m[3] }));
if (RUNS.length !== 24) throw new Error("bench-chart eval: expected 24 seeded runs, got " + RUNS.length);

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/bench-chart")); })()`;

const COLLECT = String.raw`(async () => {
  const ARMS = ${JSON.stringify(ARMS)};
  const MEANS = ${JSON.stringify(MEANS)};
  const RUNS = ${JSON.stringify(RUNS)};
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__rc5tBaseMods || new Set();
  const mods = [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m);
  const vars = () => [...rt._variables].filter(v => mods.includes(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  const out = { modules: [...rt.mains.keys()].filter(k => !base.has(k)), noOverlap: false, labelsOk: false, marksSame: false, why: [] };
  const keepers = [];
  for (const v of vars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:0;top:0;width:1100px;z-index:99999;background:#fff";
  document.body.appendChild(host);
  try {
    await sleep(1500);
    const els = [...new Set(vars().map(v => v._value).filter(x => x instanceof Element))];
    const charts = [...new Set(els.flatMap(e => [...(e.matches("svg") ? [e] : []), ...e.querySelectorAll("svg")]))]
      .filter(s => s.querySelector('[aria-label="bar"]'));
    out.charts = charts.length;
    if (!charts.length) { out.why.push("no chart svg with a bar mark"); return out; }
    let overlapPairs = 0, labelProblems = [], marksProblems = [];
    for (const orig of charts) {
      const top = orig.closest("figure") || orig;
      const clone = top.cloneNode(true);
      host.appendChild(clone);
      const svg = clone.matches("svg") ? clone : clone.querySelector("svg:has([aria-label=bar])") || [...clone.querySelectorAll("svg")].find(s => s.querySelector('[aria-label="bar"]'));
      const sr = svg.getBoundingClientRect();
      const vbw = (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width) || svg.width.baseVal.value || sr.width;
      const pxPerUnit = sr.width / vbw;
      const texts = [...svg.querySelectorAll("text")].filter(t => t.textContent.trim());
      const info = texts.map(t => {
        const bb = t.getBBox(), m = t.getScreenCTM();
        const pts = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x + bb.width, bb.y + bb.height], [bb.x, bb.y + bb.height]]
          .map(([x, y]) => new DOMPoint(x, y).matrixTransform(m)).map(p => [p.x, p.y]);
        const cs = getComputedStyle(t);
        let op = 1; for (let n = t; n && n !== svg.parentNode; n = n.parentNode) { if (n.nodeType === 1) { const s = getComputedStyle(n); op *= +s.opacity; if (s.display === "none") op = 0; } }
        const font = parseFloat(cs.fontSize) * Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) / pxPerUnit;
        const visible = op > 0.5 && cs.visibility !== "hidden" && +cs.fillOpacity > 0.3 && bb.width > 0;
        const inside = pts.every(([x, y]) => x >= sr.left - 1 && x <= sr.right + 1 && y >= sr.top - 1 && y <= sr.bottom + 1);
        return { text: t.textContent, norm: t.textContent.replace(/\s+/g, ""), pts, font, visible, inside };
      });
      // separating-axis overlap depth between two convex quads
      const depth = (A, B) => {
        let best = Infinity;
        for (const P of [A, B]) for (let i = 0; i < 4; i++) {
          const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % 4];
          let nx = y1 - y2, ny = x2 - x1; const L = Math.hypot(nx, ny); if (!L) continue; nx /= L; ny /= L;
          const pa = A.map(([x, y]) => x * nx + y * ny), pb = B.map(([x, y]) => x * nx + y * ny);
          const o = Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb));
          if (o <= 0) return 0; best = Math.min(best, o);
        }
        return best;
      };
      const vis = info.filter(i => i.visible);
      const pairs = [];
      for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
        const d = depth(vis[i].pts, vis[j].pts);
        if (d > 2) pairs.push(JSON.stringify(vis[i].text.slice(0, 24)) + " x " + JSON.stringify(vis[j].text.slice(0, 24)) + " " + d.toFixed(1) + "px");
      }
      overlapPairs += pairs.length;
      if (pairs.length) out.why.push(pairs.length + " overlapping text pairs, e.g. " + pairs.slice(0, 3).join("; "));
      for (const arm of ARMS) {
        const n = arm.replace(/\s+/g, "");
        const hit = info.find(i => i.norm === n);
        if (!hit) { labelProblems.push("missing " + JSON.stringify(arm)); continue; }
        if (!hit.visible) labelProblems.push("hidden " + JSON.stringify(arm));
        if (hit.font < 9) labelProblems.push("font " + hit.font.toFixed(1) + " " + JSON.stringify(arm));
        if (!hit.inside) labelProblems.push("outside svg " + JSON.stringify(arm) + " " + JSON.stringify(hit.pts.map(p => p.map(Math.round))) + " svg " + JSON.stringify([sr.left, sr.top, sr.right, sr.bottom].map(Math.round)));
      }
      // marks: bar values through the chart's own scales, dot count
      const rects = [...orig.querySelectorAll('[aria-label="bar"] rect')];
      const dots = orig.querySelectorAll('[aria-label="dot"] circle, [aria-label="dot"] path').length;
      const sc = k => { try { return (top.scale || orig.scale).call(top.scale ? top : orig, k); } catch { return undefined; } };
      const X = sc("x"), Y = sc("y");
      const lin = s => s && s.type === "linear" && s.invert;
      let vals = [];
      if (lin(Y)) vals = rects.map(r => Math.max(Math.abs(Y.invert(+r.getAttribute("y")) - Y.invert(+r.getAttribute("y") + +r.getAttribute("height"))), 0));
      else if (lin(X)) vals = rects.map(r => Math.abs(X.invert(+r.getAttribute("x") + +r.getAttribute("width")) - X.invert(+r.getAttribute("x"))));
      const got = vals.map(v => Math.round(v * 10) / 10).sort((a, b) => a - b), want = [...MEANS].sort((a, b) => a - b);
      out.barValues = got; out.dots = dots;
      if (!(got.length === 8 && got.every((v, i) => Math.abs(v - want[i]) <= 0.15))) marksProblems.push("bar values " + JSON.stringify(got) + " want " + JSON.stringify(want));
      if (dots !== 24) marksProblems.push(dots + " dots, want 24");
      clone.remove();
    }
    out.overlapPairs = overlapPairs;
    out.noOverlap = overlapPairs === 0;
    out.labelsOk = labelProblems.length === 0;
    out.marksSame = marksProblems.length === 0;
    out.readable = out.noOverlap && out.labelsOk;
    // the data cell still holds the user's rows: a display problem is fixed in the chart, not by renaming data
    const key = r => r && r.arm + "|" + r.model + "|" + r.steps;
    const want = RUNS.map(key).sort().join("\n");
    out.dataSame = vars().some(v => Array.isArray(v._value) && v._value.length === RUNS.length && v._value.map(key).sort().join("\n") === want);
    if (!out.dataSame) out.why.push("no cell holds the original 24 runs (arm, model, steps) any more");
    out.why.push(...labelProblems, ...marksProblems);
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
    host.remove();
  }
})()`;

// wrap the facet labels onto lines (the axis mark's text option lineWidth, in ems) and give them room below
export const FIXED = FIXTURE
  .replace("  marginBottom: 40,\n", "  marginBottom: 70,\n")
  .replace("    Plot.ruleY([0])\n", "    Plot.ruleY([0]),\n    Plot.axisFx({ label: null, anchor: \"bottom\", lineWidth: 14 })\n");
if (FIXED.split("\n").length !== FIXTURE.split("\n").length + 1) throw new Error("bench-chart eval: FIXED did not apply");

export const criteria = [
  // readable = no overlapping pair AND every label present, visible, >= 9px, inside the svg: fixing one by
  // breaking the other (delete the axis, shrink the font, rotate off the edge) earns nothing here
  { name: "collected_equals", args: { key: "readable", equals: true }, weight: 5 },
  { name: "collected_equals", args: { key: "marksSame", equals: true }, weight: 2 },
  { name: "collected_equals", args: { key: "dataSame", equals: true }, weight: 2 },
  { name: "no_runtime_errors", args: {}, weight: 1 },
];

export const setup = { files: { "/src/@user/bench-chart.js": FIXTURE }, init: INIT, collect: COLLECT };

export default {
  id: "rc5t-chart-label-overlap",
  category: "rc5-train",
  question: "The labels on my chart overlap and I can't read them. Fix it.",
  setup,
  criteria,
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/bench-chart.js", content: FIXED }, settleMs: 1500 },
  ],
};
