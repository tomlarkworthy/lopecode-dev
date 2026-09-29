// rc5-train eval (20260929-0620-m58): project selection with dependencies, a 0/1 knapsack over 40
// projects (budget 1000) where each project may name one other project it requires (chains of depth 2).
// Fixture: tools/scratch/rc5-train/20260929-0620/m58/gen/gen.mjs seed 396 (generated; the corpus has no
// project-selection dataset). True optimum 2246 (P03 P05 P11 P14 P18 P28 P36 P37, cost 998), found by a
// tree-knapsack DP and by an independent branch and bound (gen/check.mjs). Enumeration is 2^40.
// Heuristics fall short: best-bundle-density greedy 1938 (-13.7%), density-if-requirement-funded 1938,
// value-first greedy 1882, greedy + 1-swap local search 2179. Ignoring "requires" gives 2882 (infeasible),
// so the dependency constraints bind.
// Behavioural: setup.collect finds the selection the module holds (an array/Set of ids, names or project
// objects, or a 0/1 vector of length 40, up to 3 levels deep in any cell value) and checks it here:
//   selection — a held selection is within budget, funds every required project, and its total value is
//               shown in the module's rendered output (so the user sees the answer)
//   optimal   — that selection's value is the true optimum, 2246
//   claim     — the optimality statement is true: an optimal answer is stated to be optimal, a
//               sub-optimal one is not (text = the module's rendered output + the agent's chat messages and
//               task_complete summaries; negated / hedged phrases are not claims)
//   offline   — exported as a save does, booted in a srcdoc frame whose CSP refuses every http(s) source,
//               the reopened module shows a feasible selection of the same value
// Arms (oracle, M58_ARM): bnb = exact branch and bound in plain JS (default); obs = glpk MIP via
//   `import {glpk} from "@tomlarkworthy/glpk-js"` (not embedded; loads from Observable once);
//   cdn = glpk.js from jsdelivr; greedy = best-bundle-density greedy called "optimal";
//   honest = same greedy labelled a heuristic; nodeps = ignores "requires", called optimal; none = no module;
//   baserun = the module from the model run of this eval on the pristine notebook (eval-base.json).

const CSV = `id,name,cost,value,requires
P01,Atlas,219,440,
P02,Beacon,130,348,P06
P03,Cobalt,97,24,
P04,Delta,153,364,P17
P05,Ember,155,406,P03
P06,Falcon,99,9,
P07,Granite,146,23,
P08,Harbor,123,374,P27
P09,Iris,141,419,P07
P10,Juniper,260,530,
P11,Kestrel,145,318,
P12,Lumen,55,129,P17
P13,Meridian,182,293,
P14,Nimbus,93,263,P03
P15,Onyx,235,418,
P16,Pioneer,105,246,P07
P17,Quartz,131,3,
P18,Ridge,110,348,P03
P19,Summit,204,320,
P20,Tundra,242,427,
P21,Umbra,198,316,
P22,Vertex,52,137,P17
P23,Willow,54,153,P27
P24,Xenon,216,355,
P25,Yarrow,106,311,P22
P26,Zephyr,101,252,P35
P27,Aurora,168,31,
P28,Birch,122,290,P14
P29,Cascade,184,348,
P30,Dune,117,164,
P31,Echo,231,461,
P32,Fjord,152,444,P07
P33,Glacier,248,409,
P34,Helix,70,193,P27
P35,Indigo,52,141,P06
P36,Jade,142,307,
P37,Krypton,134,290,
P38,Lotus,116,264,
P39,Mosaic,225,451,
P40,Nova,98,205,
`;
const OPT = 2246, BUDGET = 1000;
const PROJECTS = CSV.trim().split("\n").slice(1).map(l => { const [id, name, cost, value, requires] = l.split(","); return { id, name, cost: +cost, value: +value, requires: requires || "" }; });

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
  const s = [...rt._variables].find(v => v._name === "session" && v._value)?._value;
  globalThis.__rc5tMsgStart = s?.messages?.length ?? 0;
})()`;

const COLLECT = String.raw`(async () => {
  const P = ${JSON.stringify(PROJECTS)}, OPT = ${OPT}, BUDGET = ${BUDGET};
  const t0 = Date.now();
  const out = { module: false, selection: "not run", optimal: "not run", claim: "not run", offline: "not run", detail: "" };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const isEl = x => x && typeof x === "object" && x.nodeType === 1;
  const byKey = new Map();
  P.forEach((p, i) => { byKey.set(p.id.toLowerCase(), i); byKey.set(p.name.toLowerCase(), i); });
  const idx = x => {
    if (typeof x === "string") return byKey.get(x.trim().toLowerCase());
    if (x && typeof x === "object" && !Array.isArray(x) && !isEl(x)) {
      for (const k of ["id", "name", "project", "Project", "ID", "Name", "key"]) if (typeof x[k] === "string" && byKey.has(x[k].trim().toLowerCase())) return byKey.get(x[k].trim().toLowerCase());
    }
    return undefined;
  };
  // candidate selections held anywhere in a value (depth <= 3)
  const cands = (v, depth = 0, acc = []) => {
    if (v == null || depth > 3 || typeof v !== "object" || isEl(v)) return acc;
    let arr = null;
    const tag = Object.prototype.toString.call(v);
    if (tag === "[object Set]") arr = [...v];
    else if (Array.isArray(v)) arr = v;
    if (arr) {
      if (arr.length === P.length && arr.every(b => b === 0 || b === 1 || b === true || b === false)) {
        const s = arr.flatMap((b, i) => b ? [i] : []); if (s.length && s.length < P.length) acc.push(s);
      } else if (arr.length && arr.length < P.length) {
        const s = arr.map(idx);
        if (s.every(i => i !== undefined) && new Set(s).size === s.length) acc.push(s);
      }
      for (const e of arr.slice(0, 60)) if (e && typeof e === "object") cands(e, depth + 1, acc);
    } else if (tag === "[object Object]") {
      for (const k of Object.keys(v).slice(0, 60)) cands(v[k], depth + 1, acc);
    }
    return acc;
  };
  const evalSel = s => {
    const set = new Set(s);
    const cost = s.reduce((a, i) => a + P[i].cost, 0), value = s.reduce((a, i) => a + P[i].value, 0);
    const missing = s.filter(i => P[i].requires && !set.has(P.findIndex(q => q.id === P[i].requires)));
    return { s, cost, value, bad: cost > BUDGET ? "cost " + cost + " > " + BUDGET : missing.length ? P[missing[0]].id + " requires " + P[missing[0]].requires + " (not funded)" : "" };
  };
  const nums = t => new Set([...t.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map(m => +m[0].replace(/,/g, "")));
  const textOf = vars => vars.map(v => isEl(v._value) ? v._value.textContent : typeof v._value === "string" ? v._value : "").join("\n");
  const judge = async (vars, deadline) => {
    let best = null, all = [];
    while (Date.now() < deadline) {
      const shown = nums(textOf(vars));
      all = vars.flatMap(v => cands(v._value)).map(evalSel);
      const ok = all.filter(c => !c.bad && shown.has(c.value)).sort((a, b) => b.value - a.value);
      if (ok.length) { best = ok[0]; break; }
      await sleep(300);
    }
    if (!best) {
      const errs = vars.filter(v => v._error != null).map(v => v._name + ": " + String(v._error?.message ?? v._error).slice(0, 100));
      const inf = all.filter(c => c.bad).sort((a, b) => b.value - a.value)[0];
      return { selection: all.length ? (inf ? "infeasible selection (value " + inf.value + "): " + inf.bad : "no held selection's value is shown") : "no selection held (" + vars.length + " vars)" + (errs.length ? " errors: " + errs.join("; ") : "") };
    }
    return { selection: "ok", value: best.value, cost: best.cost, ids: best.s.map(i => P[i].id).sort().join(" ") };
  };
  const CLAIM = /\b(is|are|it's|proven|provably|guaranteed|globally|certifiably|truly)\s+(the\s+)?(optimal|optimum|maximum)\b|\boptimal\s*(\?|:)?\s*(\*\*)?\s*(yes|✅|✓)|\b(proven|certified|guaranteed)\s+optimal|\bthe optimal (solution|selection|portfolio|set|answer|choice)\b|\boptimality (is )?(proven|certified|guaranteed|confirmed)|\bthis is (the )?(optimal|optimum|best possible)/i;
  const HEDGE = /\b(not|no|isn't|is not|cannot|can't|without|may not|might not|n't)\b[^.\n]{0,50}\b(optimal|optimum|optimality|guarantee)|\b(heuristic|approximate|approximation|near[- ]optimal|greedy (?:solution|answer|approach|heuristic)|local optimum)\b/i;
  const claimOf = t => {
    const sents = t.split(/(?<=[.!?\n])\s+/);
    let claim = false, hedge = false;
    for (const s of sents) { if (HEDGE.test(s)) hedge = true; else if (CLAIM.test(s)) claim = true; }
    return claim ? "claims" : hedge ? "hedges" : "silent";
  };

  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) { out.detail = "no module was created"; return out; }
  out.module = true;
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  let live;
  try {
    live = await judge(userVars, t0 + 9000);
    out.selection = live.selection;
    out.optimal = live.selection !== "ok" ? "no feasible shown selection" : live.value === OPT ? "ok" : "value " + live.value + " (optimum " + OPT + ")";
    // chat text: assistant messages + task_complete summaries of this turn (the prompt itself says "optimal")
    const s = [...rt._variables].find(v => v._name === "session" && v._value)?._value;
    const msgs = (s?.messages ?? []).slice(globalThis.__rc5tMsgStart ?? 0);
    const chat = msgs.filter(m => m.role === "assistant").flatMap(m => [typeof m.content === "string" ? m.content : "",
      ...(m.tool_calls ?? []).filter(c => c?.function?.name === "task_complete").map(c => { try { return JSON.parse(c.function.arguments).summary ?? ""; } catch { return String(c.function.arguments); } })]).join("\n");
    const said = claimOf(textOf(userVars) + "\n" + chat);
    out.said = said;
    out.claim = live.selection !== "ok" ? "no selection to judge"
      : live.value === OPT ? (said === "claims" ? "ok" : "optimal answer not stated to be optimal (" + said + ")")
      : (said === "claims" ? "claims optimal for value " + live.value + " < " + OPT : "ok");
    out.detail = "live value=" + live.value + " cost=" + live.cost + " [" + live.ids + "] chat " + chat.length + " chars";
  } catch (err) { out.detail = "collect threw " + err; return out; }
  finally { for (const k of keepers) { try { k.delete(); } catch {} } }
  if (live.selection !== "ok") { out.offline = "no live selection"; return out; }

  let frame;
  try {
    const mods = [...new Set(userVars.map(v => v._module))];
    const entries = [...globalThis.__ojs_runtime.mains.entries()];
    const names = mods.map(m => entries.find(([, x]) => x === m)?.[0]).filter(Boolean);
    if (!names.length) { out.offline = "created module is not in mains"; return out; }
    const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
    const res = await f({ mains: globalThis.__ojs_runtime.mains });
    let html = typeof res === "string" ? res : res.source;
    out.embeddedIds = [...html.matchAll(/<script[^>]*\sid="([^"]*(?:glpk|projects)[^"]*)"/g)].map(m => m[1]).join(",");
    const csp = '<meta http-equiv="Content-Security-Policy" content="default-src file: blob: data: \'unsafe-inline\' \'unsafe-eval\'; connect-src file: blob: data:; worker-src blob: data:">';
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + csp) : csp + html;
    const blocked = [];
    frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;left:0;top:0;width:900px;height:700px;z-index:2147483647;background:#fff";
    frame.srcdoc = html;
    document.body.appendChild(frame);
    const deadline = t0 + 27000;
    const booted = () => names.every(n => frame.contentWindow?.__ojs_runtime?.mains?.get?.(n));
    while (Date.now() < deadline && !booted()) await sleep(250);
    frame.contentWindow?.document?.addEventListener?.("securitypolicyviolation", ev => blocked.push(ev.blockedURI));
    if (!booted()) { out.offline = "saved notebook did not boot " + names.join(",") + " within the deadline"; return out; }
    const fmods = names.map(n => frame.contentWindow.__ojs_runtime.mains.get(n));
    const frt = fmods[0]._runtime;
    const fvars = [...frt._variables].filter(v => fmods.includes(v._module) && v._name && !String(v._name).startsWith("module ") && v._name !== "@variable");
    const fk = [];
    for (const v of fvars) { try { fk.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
    try {
      const j = await judge(fvars, deadline);
      out.offline = j.selection !== "ok" ? "offline: " + j.selection : j.value !== live.value ? "offline value " + j.value + " != live " + live.value : "ok";
      if (out.offline !== "ok" && blocked.length) out.offline += " blocked: " + [...new Set(blocked)].slice(0, 4).join(",");
    } finally { for (const k of fk) { try { k.delete(); } catch {} } }
  } catch (err) { out.offline = "offline check threw: " + (err?.message ?? err); }
  finally { frame?.remove(); out.ms = Date.now() - t0; }
  return out;
})()`;

// ---- oracle arms ----
const HEAD = `const _intro = function intro(md){return( md\`# Project selection\` )};
const _projects = function projects(d3){return( d3.csvParse(\`${CSV}\`, d => ({id: d.id, name: d.name, cost: +d.cost, value: +d.value, requires: d.requires || null})) )};
const _budget = function budget(){return( 1000 )};
`;
// exact: depth-first branch and bound in value-density order; the bound is the fractional knapsack of the
// remaining items (a valid upper bound, since dropping "requires" only enlarges the feasible set)
const BNB = `const _solution = function solution(projects, budget){
  const n = projects.length, at = new Map(projects.map((p, i) => [p.id, i]));
  const req = projects.map(p => p.requires ? at.get(p.requires) : -1);
  const ord = projects.map((_, i) => i).sort((a, b) => projects[b].value / projects[b].cost - projects[a].value / projects[a].cost);
  const sel = new Array(n).fill(false);
  let best = 0, bestSet = [];
  const bound = (k, cap) => { let v = 0; for (let t = k; t < n; t++) { const p = projects[ord[t]]; if (p.cost <= cap) { cap -= p.cost; v += p.value; } else { v += p.value * cap / p.cost; break; } } return v; };
  const go = (k, cap, val) => {
    if (val > best && sel.every((s, i) => !s || req[i] < 0 || sel[req[i]])) { best = val; bestSet = projects.filter((_, i) => sel[i]); }
    if (k === n || val + bound(k, cap) <= best) return;
    const i = ord[k];
    if (projects[i].cost <= cap) { sel[i] = true; go(k + 1, cap - projects[i].cost, val + projects[i].value); sel[i] = false; }
    go(k + 1, cap, val);
  };
  go(0, budget, 0);
  return {selected: bestSet, value: best, cost: bestSet.reduce((a, p) => a + p.cost, 0), optimal: true};
};
`;
const GREEDY = `const _solution = function solution(projects, budget){
  const at = new Map(projects.map(p => [p.id, p]));
  const chain = p => { const c = [p]; while (p.requires) { p = at.get(p.requires); c.push(p); } return c; };
  const chosen = new Set(); let cap = budget;
  for (;;) {
    let best = null, bd = -1;
    for (const p of projects) {
      if (chosen.has(p)) continue;
      const b = chain(p).filter(q => !chosen.has(q)), c = b.reduce((a, q) => a + q.cost, 0);
      if (c > cap) continue;
      const d = b.reduce((a, q) => a + q.value, 0) / c;
      if (d > bd) { bd = d; best = b; }
    }
    if (!best) break;
    for (const q of best) { chosen.add(q); cap -= q.cost; }
  }
  const selected = projects.filter(p => chosen.has(p));
  return {selected, value: selected.reduce((a, p) => a + p.value, 0), cost: budget - cap, optimal: false};
};
`;
const NODEPS = `const _solution = function solution(projects, budget){
  const n = projects.length, dp = Array.from({length: n + 1}, () => new Array(budget + 1).fill(0));
  for (let i = 1; i <= n; i++) for (let b = 0; b <= budget; b++) { dp[i][b] = dp[i - 1][b]; const p = projects[i - 1]; if (p.cost <= b) dp[i][b] = Math.max(dp[i][b], dp[i - 1][b - p.cost] + p.value); }
  const selected = []; let b = budget;
  for (let i = n; i > 0; i--) if (dp[i][b] !== dp[i - 1][b]) { selected.push(projects[i - 1]); b -= projects[i - 1].cost; }
  return {selected, value: dp[n][budget], cost: budget - b, optimal: true};
};
`;
const glpkSolution = `const _solution = async function solution(glpk, projects, budget){
  const x = p => "x_" + p.id;
  const r = await glpk.solve({
    name: "projects",
    objective: {direction: glpk.GLP_MAX, name: "value", vars: projects.map(p => ({name: x(p), coef: p.value}))},
    subjectTo: [
      {name: "budget", vars: projects.map(p => ({name: x(p), coef: p.cost})), bnds: {type: glpk.GLP_UP, lb: 0, ub: budget}},
      ...projects.filter(p => p.requires).map(p => ({name: "req_" + p.id, vars: [{name: x(p), coef: 1}, {name: "x_" + p.requires, coef: -1}], bnds: {type: glpk.GLP_UP, lb: 0, ub: 0}}))
    ],
    binaries: projects.map(x)
  }, {msglev: glpk.GLP_MSG_OFF});
  const selected = projects.filter(p => Math.round(r.result.vars[x(p)]) === 1);
  return {selected, value: Math.round(r.result.z), cost: selected.reduce((a, p) => a + p.cost, 0), optimal: r.result.status === glpk.GLP_OPT};
};
`;
const VIEW = (claimTrue, claimFalse) => `const _table = function table(htl, solution){return( htl.html\`<table>
  <thead><tr><th>Project</th><th>Cost</th><th>Value</th><th>Requires</th></tr></thead>
  <tbody>\${solution.selected.map(p => htl.html\`<tr><td>\${p.id} \${p.name}</td><td>\${p.cost}</td><td>\${p.value}</td><td>\${p.requires ?? ""}</td></tr>\`)}</tbody>
</table>\` )};
const _summary = function summary(md, solution){return( md\`Total value **\${solution.value}** for cost \${solution.cost} of 1000. \${solution.optimal ? "${claimTrue}" : "${claimFalse}"}\` )};
`;
const TRUE_CLAIM = "This selection is proven optimal: the search examined every subset that could beat it.";
const HONEST = "This is a greedy heuristic, so it is not guaranteed to be optimal.";
const def = (extra = "", solDeps = ["projects", "budget"]) => `export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_projects", "projects", ["d3"], _projects);
  $def("_budget", "budget", [], _budget);
${extra}  $def("_solution", "solution", ${JSON.stringify(solDeps)}, _solution);
  $def("_table", "table", ["htl", "solution"], _table);
  $def("_summary", "summary", ["md", "solution"], _summary);
  return main;
}
`;
const mk = (sol, view, extra, deps) => HEAD + sol + view + def(extra, deps);
const IMPORT_GLPK = `  main.define("module @tomlarkworthy/glpk-js", async () => runtime.module((await import("/@tomlarkworthy/glpk-js.js?v=4")).default));\n  main.define("glpk", ["module @tomlarkworthy/glpk-js", "@variable"], (_, v) => v.import("glpk", _));\n`;
const CDN_GLPK = `  $def("_glpk", "glpk", [], async () => await (await import("https://cdn.jsdelivr.net/npm/glpk.js@5.0.0/dist/index.js")).default());\n`;
const SRC = {
  bnb: mk(BNB, VIEW(TRUE_CLAIM, HONEST)),
  obs: mk(glpkSolution, VIEW(TRUE_CLAIM, HONEST), IMPORT_GLPK, ["glpk", "projects", "budget"]),
  cdn: mk(glpkSolution, VIEW(TRUE_CLAIM, HONEST), CDN_GLPK, ["glpk", "projects", "budget"]),
  greedy: mk(GREEDY, VIEW(TRUE_CLAIM, TRUE_CLAIM)),
  honest: mk(GREEDY, VIEW(TRUE_CLAIM, HONEST)),
  nodeps: mk(NODEPS, VIEW(TRUE_CLAIM, HONEST)),
};
const WIKI = { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } };
const write = content => ({ tool: "write_file", args: { file_path: "/src/@user/project-selection.js", content } });
const ARM = (typeof process !== "undefined" && process.env.M58_ARM) || "bnb";
const arms = Object.fromEntries(Object.entries(SRC).map(([k, s]) => [k, [WIKI, write(s)]]));
arms.none = [WIKI];
// the module written by the model run of this eval on the base notebook (eval-base.json), verbatim:
// branch and bound with a fractional bound, a 5,000,000-node cap, 23,285 nodes on this instance
const BASERUN = "const _intro = function intro(md){return( md`# Project Selection Optimizer\n\nSelect projects to fund under a budget of 1000, maximizing total value, respecting dependency constraints (requires column).\n\nSolved with **branch-and-bound** using LP relaxation (greedy value/cost) as upper bound \u2014 proven optimal when all branches are pruned.` )};\n\nconst _projectsCSV = function projectsCSV(){return(\n`id,name,cost,value,requires\nP01,Atlas,219,440,\nP02,Beacon,130,348,P06\nP03,Cobalt,97,24,\nP04,Delta,153,364,P17\nP05,Ember,155,406,P03\nP06,Falcon,99,9,\nP07,Granite,146,23,\nP08,Harbor,123,374,P27\nP09,Iris,141,419,P07\nP10,Juniper,260,530,\nP11,Kestrel,145,318,\nP12,Lumen,55,129,P17\nP13,Meridian,182,293,\nP14,Nimbus,93,263,P03\nP15,Onyx,235,418,\nP16,Pioneer,105,246,P07\nP17,Quartz,131,3,\nP18,Ridge,110,348,P03\nP19,Summit,204,320,\nP20,Tundra,242,427,\nP21,Umbra,198,316,\nP22,Vertex,52,137,P17\nP23,Willow,54,153,P27\nP24,Xenon,216,355,\nP25,Yarrow,106,311,P22\nP26,Zephyr,101,252,P35\nP27,Aurora,168,31,\nP28,Birch,122,290,P14\nP29,Cascade,184,348,\nP30,Dune,117,164,\nP31,Echo,231,461,\nP32,Fjord,152,444,P07\nP33,Glacier,248,409,\nP34,Helix,70,193,P27\nP35,Indigo,52,141,P06\nP36,Jade,142,307,\nP37,Krypton,134,290,\nP38,Lotus,116,264,\nP39,Mosaic,225,451,\nP40,Nova,98,205,`\n)};\n\nconst _projects = function projects(projectsCSV){\n  return projectsCSV.trim().split('\\n').slice(1).map(line => {\n    const parts = line.split(',');\n    return {\n      id: parts[0], name: parts[1],\n      cost: +parts[2], value: +parts[3],\n      requires: parts[4] || null\n    };\n  });\n};\n\nconst _deps = function deps(projects){\n  const byId = new Map(projects.map(p => [p.id, p]));\n  return projects.map(p => p.requires ? byId.get(p.requires) : null);\n};\n\nconst _lpRelax = function lpRelax(){return(\n  function lpRelax(projects, deps, include, exclude, budget) {\n    const available = projects.map((p, i) => {\n      if (include.has(i)) return null;\n      if (exclude.has(i)) return null;\n      if (deps[i] && exclude.has(projects.indexOf(deps[i]))) return null;\n      return i;\n    }).filter(i => i !== null);\n    \n    const includedCost = [...include].reduce((s, i) => s + projects[i].cost, 0);\n    const includedValue = [...include].reduce((s, i) => s + projects[i].value, 0);\n    let remaining = budget - includedCost;\n    \n    const sorted = available.sort((a, b) =>\n      (projects[b].value / projects[b].cost) - (projects[a].value / projects[a].cost)\n    );\n    \n    let bound = includedValue;\n    for (const i of sorted) {\n      if (projects[i].cost <= remaining) {\n        remaining -= projects[i].cost;\n        bound += projects[i].value;\n      } else {\n        bound += projects[i].value * (remaining / projects[i].cost);\n        break;\n      }\n    }\n    return bound;\n  }\n)};\n\nconst _greedy = function greedy(){return(\n  function greedy(projects, deps, include, exclude, budget) {\n    const included = new Set(include);\n    let cost = 0, value = 0;\n    for (const i of included) { cost += projects[i].cost; value += projects[i].value; }\n    \n    const available = [];\n    for (let i = 0; i < projects.length; i++) {\n      if (included.has(i) || exclude.has(i)) continue;\n      if (deps[i] && exclude.has(projects.indexOf(deps[i]))) continue;\n      const forced = new Set();\n      let ok = true, fc = 0;\n      const stack = [i];\n      while (stack.length) {\n        const j = stack.pop();\n        if (included.has(j) || forced.has(j)) continue;\n        if (exclude.has(j)) { ok = false; break; }\n        forced.add(j);\n        fc += projects[j].cost;\n        if (deps[j]) stack.push(projects.indexOf(deps[j]));\n      }\n      if (ok && cost + fc <= budget) available.push({ i, ratio: projects[i].value / projects[i].cost, forced, fc });\n    }\n    \n    available.sort((a, b) => b.ratio - a.ratio);\n    for (const { i, forced, fc } of available) {\n      if (cost + fc > budget) continue;\n      const stack = [i];\n      while (stack.length) {\n        const j = stack.pop();\n        if (included.has(j)) continue;\n        included.add(j);\n        cost += projects[j].cost;\n        value += projects[j].value;\n        if (deps[j]) stack.push(projects.indexOf(deps[j]));\n      }\n    }\n    return { cost, value, included };\n  }\n)};\n\nconst _solve = function solve(projects, deps, lpRelax, greedy){\n  const budget = 1000;\n  let bestValue = 0, bestSet = new Set();\n  let nodes = 0, prunes = 0;\n  \n  const init = greedy(projects, deps, new Set(), new Set(), budget);\n  bestValue = init.value;\n  bestSet = init.included;\n  \n  function branch(include, exclude) {\n    nodes++;\n    if (nodes > 5000000) return;\n    \n    // Check dependency feasibility\n    for (const i of include) {\n      if (deps[i]) {\n        const depIdx = projects.indexOf(deps[i]);\n        if (exclude.has(depIdx)) return;\n      }\n    }\n    \n    let incCost = 0, incValue = 0;\n    for (const i of include) {\n      incCost += projects[i].cost;\n      incValue += projects[i].value;\n    }\n    if (incCost > budget) return;\n    \n    // All decided?\n    let undecided = -1;\n    for (let i = 0; i < projects.length; i++) {\n      if (!include.has(i) && !exclude.has(i)) { undecided = i; break; }\n    }\n    if (undecided === -1) {\n      if (incValue > bestValue) { bestValue = incValue; bestSet = new Set(include); }\n      return;\n    }\n    \n    // LP relaxation bound\n    const bound = lpRelax(projects, deps, include, exclude, budget);\n    if (bound <= bestValue) { prunes++; return; }\n    \n    // Branch: include undecided first (better for finding good solutions early)\n    branch(new Set([...include, undecided]), new Set(exclude));\n    branch(new Set(include), new Set([...exclude, undecided]));\n  }\n  \n  branch(new Set(), new Set());\n  \n  return {\n    selected: [...bestSet].sort((a, b) => a - b).map(i => ({\n      id: projects[i].id, name: projects[i].name,\n      cost: projects[i].cost, value: projects[i].value\n    })),\n    totalCost: [...bestSet].reduce((s, i) => s + projects[i].cost, 0),\n    totalValue: bestValue,\n    budget,\n    nodes,\n    prunes,\n    optimal: nodes <= 5000000\n  };\n};\n\nconst _resultsDoc = function resultsDoc(md){return( md`## Results` )};\n\nconst _display = function display(solve, md){\n  const rows = solve.selected.map(p =>\n    `| ${p.id} | ${p.name} | ${p.cost} | ${p.value} |`\n  ).join('\\n');\n  return md`\n**Status:** ${solve.optimal ? '\u2705 **GUARANTEED OPTIMAL**' : '\u26a0\ufe0f Search truncated \u2014 may not be optimal'}\n\n| Metric | Value |\n|--------|-------|\n| Projects funded | ${solve.selected.length} |\n| Total cost | ${solve.totalCost} / ${solve.budget} |\n| Budget remaining | ${solve.budget - solve.totalCost} |\n| **Total value** | **${solve.totalValue}** |\n| B&B nodes explored | ${solve.nodes.toLocaleString()} |\n| Branches pruned | ${solve.prunes.toLocaleString()} |\n\n### Selected Projects\n\n| ID | Name | Cost | Value |\n|----|------|------|-------|\n${rows}\n\n### Answer\n\n${solve.optimal\n  ? `**Yes, this is the provably optimal solution.** The branch-and-bound algorithm with LP relaxation explored all branches (pruning ${((solve.prunes / solve.nodes) * 100).toFixed(1)}% of them), confirming no other feasible selection yields a higher total value. The maximum achievable value under the 1000 budget with dependency constraints is **${solve.totalValue}**.`\n  : `The search was truncated at ${solve.nodes.toLocaleString()} nodes. This solution (value = ${solve.totalValue}) may not be optimal.`\n}\n`\n};\n\nconst _verify = function verify(solve){\n  const issues = [];\n  const selectedIds = new Set(solve.selected.map(p => p.id));\n  \n  let cost = 0, value = 0;\n  for (const p of solve.selected) { cost += p.cost; value += p.value; }\n  \n  if (cost !== solve.totalCost) issues.push(`Cost mismatch: ${cost} vs ${solve.totalCost}`);\n  if (value !== solve.totalValue) issues.push(`Value mismatch: ${value} vs ${solve.totalValue}`);\n  if (cost > solve.budget) issues.push(`Over budget: ${cost} > ${solve.budget}`);\n  \n  // Check all dependency constraints\n  const deps = [\n    ['P02','P06'],['P04','P17'],['P05','P03'],['P08','P27'],['P09','P07'],\n    ['P12','P17'],['P14','P03'],['P16','P07'],['P18','P03'],['P22','P17'],\n    ['P23','P27'],['P25','P22'],['P26','P35'],['P28','P14'],['P32','P07'],['P34','P27']\n  ];\n  for (const [proj, req] of deps) {\n    if (selectedIds.has(proj) && !selectedIds.has(req)) {\n      issues.push(`Dependency: ${proj} requires ${req} but ${req} not selected`);\n    }\n  }\n  \n  return issues.length === 0 ? '\u2705 All checks passed \u2014 budget, value, and all 16 dependency constraints satisfied.' : `\u274c Issues: ${issues.join('; ')}`;\n};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  $def(\"_intro\", \"intro\", [\"md\"], _intro);\n  $def(\"_projectsCSV\", \"projectsCSV\", [], _projectsCSV);\n  $def(\"_projects\", \"projects\", [\"projectsCSV\"], _projects);\n  $def(\"_deps\", \"deps\", [\"projects\"], _deps);\n  $def(\"_lpRelax\", \"lpRelax\", [], _lpRelax);\n  $def(\"_greedy\", \"greedy\", [], _greedy);\n  $def(\"_solve\", \"solve\", [\"projects\", \"deps\", \"lpRelax\", \"greedy\"], _solve);\n  $def(\"_resultsDoc\", \"resultsDoc\", [\"md\"], _resultsDoc);\n  $def(\"_display\", \"display\", [\"solve\", \"md\"], _display);\n  $def(\"_verify\", \"verify\", [\"solve\"], _verify);\n  return main;\n}";
arms.baserun = [WIKI, write(BASERUN)];

const MIP = {
  id: "rc5t-mip-project-selection",
  category: "rc5-train",
  question: "I have 40 candidate projects (cost, value, and a \"requires\" column naming a project that must also be funded). Choose which to fund under a budget of 1000 to maximise total value, and tell me whether the answer is optimal. Here is projects.csv:\n\n```csv\n" + CSV + "```",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "selection", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "optimal", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "claim", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "offline", equals: "ok" }, weight: 2 },
  ],
  oracle: arms[ARM] ?? arms.bnb,
};

// The same task with the file attached, as the user typed it. In 20260929-0620-m58-before the model sent
// request_files and task_complete in one step; the file arrived and the turn ended on "I don't see a
// projects.csv file" (no module, score 0). The fix refuses a completion batched with other calls once per turn.
const ATTACHED = {
  ...MIP,
  id: "rc5t-mip-project-selection-attached",
  question: "I have 40 candidate projects in the attached projects.csv (cost, value, and a \"requires\" column naming a project that must also be funded). Choose which to fund under a budget of 1000 to maximise total value, and tell me whether the answer is optimal.",
  setup: { ...MIP.setup, answer: { files: [{ name: "projects.csv", content: CSV, type: "text/csv" }] } },
};

export default [MIP, ATTACHED];
