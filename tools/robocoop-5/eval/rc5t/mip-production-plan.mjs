// rc5-train eval (20260929-0620-m50): integer production plan with machine-hour sliders.
// Behavioural, so any correct build passes (brute force, branch and bound, a vendored glpk.js), whatever
// the module id or cell names. setup.collect finds the two range inputs (M1 / M2 by label, else by order),
// drives them, and compares what the module shows against an exhaustive integer search run here.
//   default  — at the slider defaults (40/30 if the agent kept them) the shown profit is the integer
//              optimum (860 at 40/30: A=17, B=6, C=0) and the plan is shown. The LP relaxation shows 866.67.
//   reacts   — moving only M1, then only M2, to a value where the optimum changes gives the new optimum.
//   extremes — each slider at its min and max: correct optimum, no NaN/Infinity held or rendered.
//   offline  — the notebook exported as a save does, booted in a srcdoc frame whose CSP refuses every
//              http(s) source, shows the optimum for its default sliders (a CDN solver fails here).
// Arms (oracle): default = brute force (the trace's own module, sliders from 0); M50_ARM=trace = the
// module written in 20260929-0620-m50-before verbatim; lp = LP relaxation; cdn = glpk.js from jsdelivr;
// baserun = the module from the eval-base.json model run; none = no module.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const t0 = Date.now();
  const out = { module: false, sliders: false, default: "not run", reacts: "not run", extremes: "not run", offline: "not run", detail: "" };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const P = [40, 30, 50], M1 = [2, 1, 3], M2 = [1, 2, 2];
  const solve = (h1, h2) => {
    let best = -1, plans = [];
    for (let a = 0; 2 * a <= h1 && a <= h2; a++)
      for (let b = 0; 2 * a + b <= h1 && a + 2 * b <= h2; b++)
        for (let c = 0; 2 * a + b + 3 * c <= h1 && a + 2 * b + 2 * c <= h2; c++) {
          const p = P[0] * a + P[1] * b + P[2] * c;
          if (p > best) { best = p; plans = [[a, b, c]]; } else if (p === best) plans.push([a, b, c]);
        }
    return { profit: best, plans };
  };
  const isEl = x => x && typeof x === "object" && x.nodeType === 1;
  // everything below takes the variables of one module in one window
  const probe = (vars) => {
    const els = () => vars.map(v => v._value).filter(isEl);
    const ranges = [];
    for (const e of els()) for (const r of (e.matches("input[type=range]") ? [e] : [...e.querySelectorAll("input[type=range]")]))
      if (!ranges.some(x => x.el === r)) {
        const host = r.closest("form, label, div") || r.parentElement;
        const lab = ((r.labels && [...r.labels].map(l => l.textContent).join(" ")) || "") + " " + (host ? host.textContent : "") + " " + (r.getAttribute("aria-label") || "") + " " + (r.name || "");
        const top = vars.find(v => isEl(v._value) && (v._value === r || v._value.contains(r)));
        ranges.push({ el: r, lab: lab.toLowerCase(), min: +r.min, max: +r.max, step: +r.step || 1, top: top ? top._value : r });
      }
    let m1 = ranges.find(x => /m\s*1|machine\s*1|machine one|first/.test(x.lab));
    let m2 = ranges.find(x => x !== m1 && /m\s*2|machine\s*2|machine two|second/.test(x.lab));
    const rest = ranges.filter(x => x !== m1 && x !== m2);
    if (!m1) m1 = rest.shift(); if (!m2) m2 = rest.shift();
    const set = (s, x) => {
      const Ev = s.el.ownerDocument.defaultView.Event;
      s.el.value = String(x);
      s.el.dispatchEvent(new Ev("input", { bubbles: true }));
      if (s.top !== s.el) s.top.dispatchEvent(new Ev("input", { bubbles: true }));
    };
    const text = () => els().map(e => e.textContent).join(" \n ");
    const nums = [], triples = [];
    const walk = (x, d) => {
      if (x == null || d > 3 || isEl(x) || typeof x === "function") return;
      if (typeof x === "number") { nums.push(x); return; }
      if (typeof x !== "object") return;
      if (Array.isArray(x)) {
        if (x.length === 3 && x.every(n => typeof n === "number")) triples.push(x);
        if (x.length === 3 && x.every(r => r && typeof r === "object" && !Array.isArray(r) && !isEl(r)))
          for (const k of Object.keys(x[0])) if (x.every(r => typeof r[k] === "number")) triples.push(x.map(r => r[k]));
        for (const y of x.slice(0, 50)) walk(y, d + 1);
        return;
      }
      if (x instanceof Map || x instanceof Set) return;
      const ks = Object.keys(x).slice(0, 40);
      const numeric = ks.filter(k => typeof x[k] === "number");
      if (numeric.length === 3) triples.push(numeric.map(k => x[k]));
      const abc = ["a", "b", "c"].map(l => ks.find(k => k.toLowerCase() === l || k.toLowerCase() === "product" + l || k.toLowerCase() === "x" + l));
      if (abc.every(k => k && typeof x[k] === "number")) triples.push(abc.map(k => x[k]));
      for (const k of ks) walk(x[k], d + 1);
    };
    const scan = () => { nums.length = 0; triples.length = 0; for (const v of vars) walk(v._value, 0); };
    const planInText = (t, plan) => ["A", "B", "C"].every((L, i) => {
      const re = new RegExp("(?:^|[^A-Za-z0-9])(?:[Pp]roduct\\s*)?" + L + "(?![A-Za-z0-9])[^0-9A-Za-z]{0,24}?(-?\\d+(?:\\.\\d+)?)", "g");
      return [...t.matchAll(re)].some(m => +m[1] === plan[i]);
    });
    const shows = want => {
      scan();
      const t = text().replace(/[,  ]/g, "");
      const profitOk = nums.some(x => x === want.profit) || new RegExp("(^|[^0-9.])" + want.profit + "(?![0-9]|\\.[0-9]*[1-9])").test(t);
      const planOk = want.plans.some(pl => triples.some(tr => tr.every((n, i) => n === pl[i])) || planInText(text(), pl));
      const bad = /NaN|Infinity|∞|undefined/.test(t) || nums.some(x => !Number.isFinite(x));
      return { profitOk, planOk, bad };
    };
    const held = () => [+m1.el.value, +m2.el.value];
    const settle = async (want, ms) => { const t1 = Date.now(); let s; while (Date.now() - t1 < ms) { await sleep(120); s = shows(want); if (s.profitOk && s.planOk && !s.bad) return s; } return s || shows(want); };
    const trial = async (tag, moves, ms = 2500) => {
      for (const [s, x] of moves) set(s, x);
      const h = held(), want = solve(h[0], h[1]);
      const s = await settle(want, ms);
      const ok = s.profitOk && s.planOk && !s.bad;
      return { ok, line: tag + " " + h.join("/") + " want " + want.profit + " " + JSON.stringify(want.plans[0]) + (ok ? " ok" : " FAIL profit=" + s.profitOk + " plan=" + s.planOk + " nan=" + s.bad), h, want };
    };
    return { ranges, m1, m2, set, trial, held, text };
  };
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) { out.detail = "no module was created"; return out; }
  out.module = true;
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const log = [];
  try {
    await sleep(600);
    const p = probe(userVars);
    if (!(p.m1 && p.m2)) { out.detail = "range inputs: " + JSON.stringify(p.ranges.map(r => [r.lab.slice(0, 40), r.min, r.max])); return out; }
    out.sliders = true;
    const d0 = p.held();
    const D = await p.trial("default", [], 4000);
    log.push(D.line);
    out.default = D.ok ? "ok" : D.line;
    // a value in range whose optimum differs from the current one
    const pick = (s, other, isM1) => {
      const cur = solve(...p.held()).profit;
      const cands = [50, 60, 25, 20, 70, 35, 45, 15, 80, 10].map(x => Math.round(x / s.step) * s.step).filter(x => x >= s.min && x <= s.max && x !== +s.el.value);
      return cands.find(x => solve(...(isM1 ? [x, +other.el.value] : [+other.el.value, x])).profit !== cur);
    };
    const r = [];
    const x1 = pick(p.m1, p.m2, true);
    r.push(x1 == null ? { ok: false, line: "no M1 value in [" + p.m1.min + "," + p.m1.max + "] changes the optimum" } : await p.trial("M1-only", [[p.m1, x1]]));
    const x2 = pick(p.m2, p.m1, false);
    r.push(x2 == null ? { ok: false, line: "no M2 value in [" + p.m2.min + "," + p.m2.max + "] changes the optimum" } : await p.trial("M2-only", [[p.m2, x2]]));
    for (const t of r) log.push(t.line);
    out.reacts = r.every(t => t.ok) ? "ok" : r.filter(t => !t.ok).map(t => t.line).join("; ");
    const e = [];
    e.push(await p.trial("min/min", [[p.m1, p.m1.min], [p.m2, p.m2.min]]));
    e.push(await p.trial("max/min", [[p.m1, p.m1.max]]));
    e.push(await p.trial("max/max", [[p.m2, p.m2.max]]));
    e.push(await p.trial("min/max", [[p.m1, p.m1.min]]));
    for (const t of e) log.push(t.line);
    out.extremes = e.every(t => t.ok) ? "ok" : e.filter(t => !t.ok).map(t => t.line).join("; ");
    p.set(p.m1, d0[0]); p.set(p.m2, d0[1]);
    out.detail = "M1[" + p.m1.min + "," + p.m1.max + "] M2[" + p.m2.min + "," + p.m2.max + "] " + log.join("; ");
  } catch (err) { out.detail = "collect threw " + err + " " + log.join("; "); return out; }
  finally { for (const k of keepers) { try { k.delete(); } catch {} } }

  // offline: export as a save does, boot with every http(s) source refused, check the default optimum
  let frame;
  try {
    const mod = userVars[0]._module;
    const name = [...globalThis.__ojs_runtime.mains.entries()].find(([k, m]) => m === mod)?.[0];
    if (!name) { out.offline = "created module is not in mains"; return out; }
    const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
    const res = await f({ mains: globalThis.__ojs_runtime.mains });
    let html = typeof res === "string" ? res : res.source;
    const csp = '<meta http-equiv="Content-Security-Policy" content="default-src file: blob: data: \'unsafe-inline\' \'unsafe-eval\'; connect-src file: blob: data:; worker-src blob: data:">';
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + csp) : csp + html;
    const blocked = [];
    frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;left:0;top:0;width:900px;height:700px;z-index:2147483647;background:#fff";
    frame.srcdoc = html;
    document.body.appendChild(frame);
    const deadline = t0 + 26000;
    while (Date.now() < deadline && !frame.contentWindow?.__ojs_runtime?.mains?.get?.(name)) await sleep(250);
    frame.contentWindow?.document?.addEventListener?.("securitypolicyviolation", ev => blocked.push(ev.blockedURI));
    const fmod = frame.contentWindow?.__ojs_runtime?.mains?.get?.(name);
    if (!fmod) { out.offline = "saved notebook did not boot " + name + " within the deadline"; return out; }
    const frt = fmod._runtime;
    const fvars = [...frt._variables].filter(v => v._module === fmod && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable");
    const fk = [];
    for (const v of fvars) { try { fk.push(fmod.variable(true).define([v._name], x => x)); } catch {} }
    try {
      await sleep(400);
      const q = probe(fvars);
      if (!(q.m1 && q.m2)) { out.offline = "offline: sliders not found"; return out; }
      const T = await q.trial("offline", [], Math.max(1000, deadline - Date.now()));
      const errs = fvars.filter(v => v._error != null).map(v => v._name + ": " + String(v._error?.message ?? v._error).slice(0, 120));
      out.offline = T.ok ? "ok" : T.line + (errs.length ? " errors: " + errs.join("; ") : "") + (blocked.length ? " blocked: " + [...new Set(blocked)].slice(0, 4).join(",") : "");
    } finally { for (const k of fk) { try { k.delete(); } catch {} } }
  } catch (err) { out.offline = "offline check threw: " + (err?.message ?? err); }
  finally { frame?.remove(); out.ms = Date.now() - t0; }
  return out;
})()`;

// Viewof idiom: two $def lines, value cell (G, v) => G.input(v), as the agent wrote it after reading
// writing-cells-in-module-source.md (whose example is @spond/revised-sars-cov-2-analytics-page).
const head = (lo) => `const _intro = function intro(md){return( md\`# Production plan\` )};
const _viewof_m1 = function viewof_m1(Inputs){return( Inputs.range([${lo}, 80], {value: 40, step: 1, label: "M1 available hours"}) )};
const _m1 = function m1(G, v){return( G.input(v) )};
const _viewof_m2 = function viewof_m2(Inputs){return( Inputs.range([${lo}, 80], {value: 30, step: 1, label: "M2 available hours"}) )};
const _m2 = function m2(G, v){return( G.input(v) )};
`;
const VIEW = `const _view = function view(htl, solution){return( htl.html\`<div>
  <table><tr><th>Product</th><th>Batches</th></tr>
  \${["A", "B", "C"].map((l, i) => htl.html\`<tr><td>\${l}</td><td>\${solution.batches[i]}</td></tr>\`)}
  </table><p>Profit: \${solution.profit}</p></div>\` )};
`;
const define = (solutionDeps) => `export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_viewof_m1", "viewof m1", ["Inputs"], _viewof_m1);
  $def("_m1", "m1", ["Generators", "viewof m1"], _m1);
  $def("_viewof_m2", "viewof m2", ["Inputs"], _viewof_m2);
  $def("_m2", "m2", ["Generators", "viewof m2"], _m2);
  $def("_solution", "solution", ${JSON.stringify(solutionDeps)}, _solution);
  $def("_view", "view", ["htl", "solution"], _view);
  return main;
}
`;
// correct: exhaustive search over the bounded integer box (optimal by enumeration)
const BRUTE = head(0) + `const _solution = function solution(m1, m2){
  const p = [40, 30, 50], a1 = [2, 1, 3], a2 = [1, 2, 2];
  let best = {batches: [0, 0, 0], profit: 0};
  for (let a = 0; a * a1[0] <= m1 && a * a2[0] <= m2; a++)
    for (let b = 0; a * a1[0] + b * a1[1] <= m1 && a * a2[0] + b * a2[1] <= m2; b++)
      for (let c = 0; a * a1[0] + b * a1[1] + c * a1[2] <= m1 && a * a2[0] + b * a2[1] + c * a2[2] <= m2; c++) {
        const profit = a * p[0] + b * p[1] + c * p[2];
        if (profit > best.profit) best = {batches: [a, b, c], profit};
      }
  return best;
};
` + VIEW + define(["m1", "m2"]);
// negative: the LP relaxation (best basic feasible solution), rounded to 2 dp for display
const LP = head(0) + `const _solution = function solution(m1, m2){
  const rows = [[2, 1, 3, m1], [1, 2, 2, m2], [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]];
  const det = (m) => m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  let best = {batches: [0, 0, 0], profit: 0};
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) for (let k = j + 1; k < 5; k++) {
    const A = [rows[i], rows[j], rows[k]].map(r => r.slice(0, 3)), bv = [rows[i][3], rows[j][3], rows[k][3]];
    const D = det(A); if (Math.abs(D) < 1e-9) continue;
    const x = [0, 1, 2].map(c => det(A.map((r, ri) => r.map((v, ci) => ci === c ? bv[ri] : v))) / D);
    if (x.some(v => v < -1e-9) || 2*x[0]+x[1]+3*x[2] > m1 + 1e-9 || x[0]+2*x[1]+2*x[2] > m2 + 1e-9) continue;
    const profit = 40*x[0] + 30*x[1] + 50*x[2];
    if (profit > best.profit) best = {batches: x.map(v => Math.round(v * 100) / 100), profit: Math.round(profit * 100) / 100};
  }
  return best;
};
` + VIEW + define(["m1", "m2"]);
// negative: a real MIP solve, glpk.js from a CDN (correct online, dead offline)
const CDN = head(0) + `const _glpk = async function glpk(){return( await (await import("https://cdn.jsdelivr.net/npm/glpk.js@5.0.0/dist/index.js")).default() )};
const _solution = async function solution(glpk, m1, m2){
  const vars = ["A", "B", "C"];
  const r = await glpk.solve({
    name: "plan",
    objective: {direction: glpk.GLP_MAX, name: "profit", vars: [{name: "A", coef: 40}, {name: "B", coef: 30}, {name: "C", coef: 50}]},
    subjectTo: [
      {name: "M1", vars: [{name: "A", coef: 2}, {name: "B", coef: 1}, {name: "C", coef: 3}], bnds: {type: glpk.GLP_UP, ub: m1, lb: 0}},
      {name: "M2", vars: [{name: "A", coef: 1}, {name: "B", coef: 2}, {name: "C", coef: 2}], bnds: {type: glpk.GLP_UP, ub: m2, lb: 0}}
    ],
    generals: vars
  }, {msglev: glpk.GLP_MSG_OFF});
  return {batches: vars.map(v => Math.round(r.result.vars[v])), profit: Math.round(r.result.z)};
};
` + VIEW + define(["glpk", "m1", "m2"]).replace(`  $def("_solution"`, `  $def("_glpk", "glpk", [], _glpk);\n  $def("_solution"`);

// the module written in run 20260929-0620-m50-before (brute force, sliders [10, 80]), verbatim
const TRACE = "const _intro = function intro(md){return( md`# Production Planner — Mixed-Integer Program\n\nMaximise profit for products **A**, **B**, **C** subject to machine-hour constraints.\nBatches must be whole numbers (integers). Adjust the sliders to see how the plan changes.` )};\n\nconst _p_m1_hours = function _m1_hours(Inputs){return(\nInputs.range([10, 80], {value: 40, step: 1, label: \"M1 available hours\"})\n)};\nconst _p_m1 = (G, _) => G.input(_);\n\nconst _p_m2_hours = function _m2_hours(Inputs){return(\nInputs.range([10, 80], {value: 30, step: 1, label: \"M2 available hours\"})\n)};\nconst _p_m2 = (G, _) => G.input(_);\n\nconst _profit_per_batch = function profit_per_batch(){return(\n[40, 30, 50]\n)};\n\nconst _m1_per_batch = function m1_per_batch(){return(\n[2, 1, 3]\n)};\n\nconst _m2_per_batch = function m2_per_batch(){return(\n[1, 2, 2]\n)};\n\nconst _solution = function solution(profit_per_batch, m1_per_batch, m2_per_batch, m1, m2){\n  let best = {batches: [0, 0, 0], profit: -Infinity};\n  const p = profit_per_batch, m1p = m1_per_batch, m2p = m2_per_batch;\n  const maxA = Math.min(Math.floor(m1 / m1p[0]), Math.floor(m2 / m2p[0]));\n  const maxB = Math.min(Math.floor(m1 / m1p[1]), Math.floor(m2 / m2p[1]));\n  const maxC = Math.min(Math.floor(m1 / m1p[2]), Math.floor(m2 / m2p[2]));\n  for (let a = 0; a <= maxA; a++) {\n    for (let b = 0; b <= maxB; b++) {\n      for (let c = 0; c <= maxC; c++) {\n        const h1 = a * m1p[0] + b * m1p[1] + c * m1p[2];\n        const h2 = a * m2p[0] + b * m2p[1] + c * m2p[2];\n        if (h1 <= m1 && h2 <= m2) {\n          const profit = a * p[0] + b * p[1] + c * p[2];\n          if (profit > best.profit) best = {batches: [a, b, c], profit};\n        }\n      }\n    }\n  }\n  return best;\n};\n\nconst _plan_table = function plan_table(solution, m1_per_batch, m2_per_batch, profit_per_batch, m1, m2, htl){\n  const [a, b, c] = solution.batches;\n  const batches = [a, b, c];\n  const labels = [\"A\", \"B\", \"C\"];\n  const h1used = a * m1_per_batch[0] + b * m1_per_batch[1] + c * m1_per_batch[2];\n  const h2used = a * m2_per_batch[0] + b * m2_per_batch[1] + c * m2_per_batch[2];\n\n  return htl.html`<div style=\"font-family:system-ui;max-width:500px\">\n    <h3 style=\"margin-bottom:6px\">Optimal Plan</h3>\n    <table style=\"border-collapse:collapse;width:100%\">\n      <thead><tr style=\"border-bottom:2px solid #333\">\n        <th style=\"text-align:left;padding:4px 12px 4px 0\">Product</th>\n        <th style=\"text-align:right;padding:4px 12px\">Batches</th>\n        <th style=\"text-align:right;padding:4px 12px\">Profit/batch</th>\n        <th style=\"text-align:right;padding:4px 0 4px 12px\">Total profit</th>\n      </tr></thead>\n      <tbody>\n      ${labels.map((l, i) => htl.html`<tr style=\"border-bottom:1px solid #ddd\">\n        <td style=\"padding:4px 12px 4px 0;font-weight:600\">${l}</td>\n        <td style=\"text-align:right;padding:4px 12px\">${batches[i]}</td>\n        <td style=\"text-align:right;padding:4px 12px\">${profit_per_batch[i]}</td>\n        <td style=\"text-align:right;padding:4px 0 4px 12px\">${batches[i] * profit_per_batch[i]}</td>\n      </tr>`)}\n      </tbody>\n    </table>\n\n    <h3 style=\"margin:16px 0 6px\">Resource Usage</h3>\n    <table style=\"border-collapse:collapse;width:100%\">\n      <thead><tr style=\"border-bottom:2px solid #333\">\n        <th style=\"text-align:left;padding:4px 12px 4px 0\">Machine</th>\n        <th style=\"text-align:right;padding:4px 12px\">Used</th>\n        <th style=\"text-align:right;padding:4px 12px\">Available</th>\n        <th style=\"text-align:right;padding:4px 0 4px 12px\">Slack</th>\n      </tr></thead>\n      <tbody>\n        <tr style=\"border-bottom:1px solid #ddd\">\n          <td style=\"padding:4px 12px 4px 0;font-weight:600\">M1</td>\n          <td style=\"text-align:right;padding:4px 12px\">${h1used}</td>\n          <td style=\"text-align:right;padding:4px 12px\">${m1}</td>\n          <td style=\"text-align:right;padding:4px 0 4px 12px\">${m1 - h1used}</td>\n        </tr>\n        <tr style=\"border-bottom:1px solid #ddd\">\n          <td style=\"padding:4px 12px 4px 0;font-weight:600\">M2</td>\n          <td style=\"text-align:right;padding:4px 12px\">${h2used}</td>\n          <td style=\"text-align:right;padding:4px 12px\">${m2}</td>\n          <td style=\"text-align:right;padding:4px 0 4px 12px\">${m2 - h2used}</td>\n        </tr>\n      </tbody>\n    </table>\n\n    <div style=\"margin-top:16px;font-size:1.3em;font-weight:700;color:#1a7f37\">\n      Maximum profit: ${solution.profit}\n    </div>\n  </div>`;\n};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  $def(\"_intro\", \"intro\", [\"md\"], _intro);\n  $def(\"_p_m1_hours\", \"viewof m1_hours\", [\"Inputs\"], _p_m1_hours);\n  $def(\"_p_m1\", \"m1\", [\"Generators\", \"viewof m1_hours\"], _p_m1);\n  $def(\"_p_m2_hours\", \"viewof m2_hours\", [\"Inputs\"], _p_m2_hours);\n  $def(\"_p_m2\", \"m2\", [\"Generators\", \"viewof m2_hours\"], _p_m2);\n  $def(\"_profit_per_batch\", \"profit_per_batch\", [], _profit_per_batch);\n  $def(\"_m1_per_batch\", \"m1_per_batch\", [], _m1_per_batch);\n  $def(\"_m2_per_batch\", \"m2_per_batch\", [], _m2_per_batch);\n  $def(\"_solution\", \"solution\", [\"profit_per_batch\", \"m1_per_batch\", \"m2_per_batch\", \"m1\", \"m2\"], _solution);\n  $def(\"_plan_table\", \"plan_table\", [\"solution\", \"m1_per_batch\", \"m2_per_batch\", \"profit_per_batch\", \"m1\", \"m2\", \"htl\"], _plan_table);\n  return main;\n}";

// the module written in the model run of this eval on the base notebook (eval-base.json), md tables
const BASERUN = "const _intro = function intro(md){return( md`# MIP Production Planner\n\n3 products (A, B, C) — maximise profit with integer batches.\n\n| Product | Profit/batch | M1 hrs/batch | M2 hrs/batch |\n|---------|-------------|-------------|-------------|\n| A       | 40          | 2           | 1           |\n| B       | 30          | 1           | 2           |\n| C       | 50          | 3           | 2           |\n\nAdjust the sliders to change available machine hours.` )};\n\nconst _products = function products(){return( [\n  {name: \"A\", profit: 40, m1: 2, m2: 1},\n  {name: \"B\", profit: 30, m1: 1, m2: 2},\n  {name: \"C\", profit: 50, m1: 3, m2: 2}\n] )};\n\nconst _bounds = function bounds(products, m1_hours){\nconst max = products.map(p => Math.floor(m1_hours / p.m1));\nreturn {a: max[0], b: max[1], c: max[2]};\n};\n\nconst _eval_plan = function eval_plan(products){return(\n(a, b, c) => ({\n  a, b, c,\n  usedM1: a * products[0].m1 + b * products[1].m1 + c * products[2].m1,\n  usedM2: a * products[0].m2 + b * products[1].m2 + c * products[2].m2,\n  profit: a * products[0].profit + b * products[1].profit + c * products[2].profit\n})\n)};\n\nconst _feasible = function feasible(eval_plan, m1_hours, m2_hours, bounds){\nconst results = [];\nfor (let a = 0; a <= bounds.a; a++) {\n  for (let b = 0; b <= bounds.b; b++) {\n    for (let c = 0; c <= bounds.c; c++) {\n      const s = eval_plan(a, b, c);\n      if (s.usedM1 <= m1_hours && s.usedM2 <= m2_hours) {\n        results.push({a: s.a, b: s.b, c: s.c, profit: s.profit});\n      }\n    }\n  }\n}\nreturn results;\n};\n\nconst _solution = function solution(feasible){\nreturn feasible.reduce((best, s) => s.profit > best.profit ? s : best, {a: 0, b: 0, c: 0, profit: 0});\n};\n\nconst _used_m1 = function used_m1(solution, products){return(\nsolution.a * products[0].m1 + solution.b * products[1].m1 + solution.c * products[2].m1\n)};\n\nconst _used_m2 = function used_m2(solution, products){return(\nsolution.a * products[0].m2 + solution.b * products[1].m2 + solution.c * products[2].m2\n)};\n\nconst _plan_table = function plan_table(md, solution, products){return( md`\n## Optimal Plan\n\n| Product | Batches | Profit |\n|---------|---------|--------|\n| A       | ${solution.a} | ${solution.a * products[0].profit} |\n| B       | ${solution.b} | ${solution.b * products[1].profit} |\n| C       | ${solution.c} | ${solution.c * products[2].profit} |\n` )};\n\nconst _profit_display = function profit_display(md, solution){return( md`\n### **Total Profit: ${solution.profit}**\n` )};\n\nconst _usage_display = function usage_display(md, used_m1, used_m2, m1_hours, m2_hours){return( md`\nMachine usage:\n- M1: ${used_m1} / ${m1_hours} hours used\n- M2: ${used_m2} / ${m2_hours} hours used\n` )};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  $def(\"_intro\", \"intro\", [\"md\"], _intro);\n  $def(\"_k1\", \"viewof m1_hours\", [\"Inputs\"], (Inputs) => Inputs.range([0, 100], {value: 40, step: 1, label: \"M1 available hours\"}));\n  $def(\"_k2\", \"m1_hours\", [\"Generators\", \"viewof m1_hours\"], (G, v) => G.input(v));\n  $def(\"_k3\", \"viewof m2_hours\", [\"Inputs\"], (Inputs) => Inputs.range([0, 100], {value: 30, step: 1, label: \"M2 available hours\"}));\n  $def(\"_k4\", \"m2_hours\", [\"Generators\", \"viewof m2_hours\"], (G, v) => G.input(v));\n  $def(\"_products\", \"products\", [], _products);\n  $def(\"_bounds\", \"bounds\", [\"products\", \"m1_hours\"], _bounds);\n  $def(\"_eval_plan\", \"eval_plan\", [\"products\"], _eval_plan);\n  $def(\"_feasible\", \"feasible\", [\"eval_plan\", \"m1_hours\", \"m2_hours\", \"bounds\"], _feasible);\n  $def(\"_solution\", \"solution\", [\"feasible\"], _solution);\n  $def(\"_used_m1\", \"used_m1\", [\"solution\", \"products\"], _used_m1);\n  $def(\"_used_m2\", \"used_m2\", [\"solution\", \"products\"], _used_m2);\n  $def(\"_plan_table\", \"plan_table\", [\"md\", \"solution\", \"products\"], _plan_table);\n  $def(\"_profit_display\", \"profit_display\", [\"md\", \"solution\"], _profit_display);\n  $def(\"_usage_display\", \"usage_display\", [\"md\", \"used_m1\", \"used_m2\", \"m1_hours\", \"m2_hours\"], _usage_display);\n  return main;\n}";

const ARM = (typeof process !== "undefined" && process.env.M50_ARM) || "brute";
const WIKI = { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } };
const RESEARCH = { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/researching-libraries-and-apis.md" } };
const write = content => ({ tool: "write_file", args: { file_path: "/src/@user/production-plan.js", content } });

export default {
  id: "rc5t-mip-production-plan",
  category: "rc5-train",
  question: "Solve this production-planning problem as a mixed-integer program: 3 products (A, B, C) with profit per batch 40, 30, 50; machine hours per batch on M1: 2, 1, 3 and on M2: 1, 2, 2; available hours M1 = 40, M2 = 30; batches must be whole numbers. Maximise profit. Show the plan and the profit, and let me change the available machine hours with sliders.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "default", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "reacts", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "extremes", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "offline", equals: "ok" }, weight: 2 },
  ],
  oracle: ARM === "none" ? [WIKI]
    : ARM === "lp" ? [WIKI, write(LP)]
    : ARM === "cdn" ? [WIKI, RESEARCH, write(CDN)]
    : ARM === "trace" ? [WIKI, write(TRACE)]
    : ARM === "baserun" ? [WIKI, write(BASERUN)]
    : [WIKI, write(BRUTE)],
};
