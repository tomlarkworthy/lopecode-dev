// rc5-train eval (20260929-0620-m53): nurse roster, 6 nurses x 7 days x {day, night}, 2 per shift,
// <= 5 shifts per nurse, no night on day d followed by a day shift on day d+1. Minimise uncovered shifts.
// Demand 28 slots, capacity 30; a roster with 0 uncovered exists (checked by DFS in the scratchpad and by
// the BRUTE arm below), so the true minimum is 0.
// Behavioural: setup.collect reads the roster TABLE the module renders (any <table>, md or htl or
// Inputs.table), in any of these shapes, and checks it here:
//   nurse rows x 7 day columns, cells D / N / Day / Night / ☀ / 🌙 / blank / Off (or the transpose)
//   7 day rows x {Day shift, Night shift} columns, cells listing nurse names (or the transpose)
//   14 (day, shift) rows, a shift cell and a nurse-list cell
//   roster   — a table parses into a 6-nurse x 7-day x 2-shift assignment
//   hard     — every nurse <= 5 shifts, no night -> next-day day shift, no shift over 2 nurses
//   optimal  — the table's uncovered count is the true minimum (0)
//   reported — the module states an uncovered count ("Uncovered: 0", "0 uncovered", "all shifts covered")
//              equal to the table's
//   offline  — exported as a save does, booted in a srcdoc frame whose CSP refuses every http(s) source,
//              the table is shown again and passes hard + optimal
// Arms (oracle, M53_ARM): brute = exact DFS in plain JS, nurse-rows htl table (default);
//   md = same search, day-rows md table; greedy = rest rule ignored (violates hard);
//   short = heuristic that leaves 2 shifts uncovered and calls it optimal; cdn = glpk.js from jsdelivr;
//   obs = glpk from `import {glpk} from "@tomlarkworthy/glpk-js"` (not embedded; loads from Observable);
//   trace = the module from 20260929-0620-m53-before; none = no module.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const t0 = Date.now();
  const out = { module: false, roster: "not run", hard: "not run", optimal: "not run", reported: "not run", offline: "not run", detail: "" };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const isEl = x => x && typeof x === "object" && x.nodeType === 1;
  const NIGHT = /night|🌙|moon|(^|[^a-z])(n|ns)([^a-z]|$)/i, DAY = /(^|[^a-z])day([^a-z]|$)|☀|sun(?!day)|morning|(^|[^a-z])(d|ds)([^a-z]|$)/i;
  const OFF = /^(|-|–|—|·|\.|x|✗|0|off|rest|free|none)$/i;
  const DAYLAB = /^(mon|tue|wed|thu|fri|sat|sun)|^day\s*\d|^d\s*\d$|^\d$/i;
  const shiftsOf = t => { t = t.trim(); if (OFF.test(t)) return []; const s = []; if (DAY.test(t)) s.push(0); if (NIGHT.test(t)) s.push(1); return s; };
  const names = t => t.split(/[,;+&\/\n]|\band\b|\s{2,}/).map(s => s.trim()).filter(s => s && !OFF.test(s) && !/uncovered|unfilled|vacant|open|missing|short/i.test(s) && !/^\d+\s*\/\s*\d+$/.test(s));
  const grids = els => {
    const tabs = [];
    for (const e of els) for (const t of (e.matches("table") ? [e] : [...e.querySelectorAll("table")])) if (!tabs.includes(t)) tabs.push(t);
    for (const e of els) if (e.shadowRoot) for (const t of e.shadowRoot.querySelectorAll("table")) if (!tabs.includes(t)) tabs.push(t);
    return tabs.map(t => [...t.rows].map(r => [...r.cells].map(c => (c.textContent || "").replace(/\s+/g, " ").trim())));
  };
  const T = g => { const w = Math.max(...g.map(r => r.length)); return Array.from({ length: w }, (_, j) => g.map(r => r[j] ?? "")); };
  const TOTAL = /total|sum|count|cover|uncovered|shifts?\s*worked|^#/i;
  // A: nurse rows, 7 day columns after a label column
  const A = g => {
    const rows = g.filter(r => r.length >= 8 && r[0] && !TOTAL.test(r[0]) && !DAYLAB.test(r[0]) && !/^(nurse|name|staff)$/i.test(r[0]));
    const data = rows.filter(r => r.slice(1, 8).some(c => shiftsOf(c).length) || r.slice(1, 8).every(c => OFF.test(c.trim())));
    if (data.length !== 6) return null;
    const x = [];
    for (const r of data) for (let d = 0; d < 7; d++) for (const s of shiftsOf(r[d + 1])) x.push([r[0], d, s]);
    return x;
  };
  // A14: nurse rows x 14 (day, shift) columns under a D/N sub-header, cells ✓ / 1 / x / blank
  const SH = /^(d|day|n|night|☀️?|🌙)(\s*shift)?$/i;
  const A14 = g => {
    const h = g.find(r => r.filter(c => SH.test(c.trim())).length >= 14);
    if (!h) return null;
    const seq = h.filter(c => SH.test(c.trim())).slice(0, 14).map(c => NIGHT.test(c) ? 1 : 0);
    if (seq.some((s, k) => s !== seq[k & 1]) || seq[0] === seq[1]) return null;
    const data = g.filter(r => r !== h && r.length >= 15 && r[0] && !TOTAL.test(r[0]) && !/^(nurse|name|staff)$/i.test(r[0]) && !r.slice(1, 15).some(c => SH.test(c.trim())));
    if (data.length !== 6) return null;
    const x = [];
    for (const r of data) for (let k = 0; k < 14; k++) if (!/^(|-|–|—|·|\.|✗|0|off|rest|free|none)$/i.test(r[k + 1].trim())) x.push([r[0], k >> 1, seq[k]]);
    return x;
  };
  // B1: 7 day rows, day-shift and night-shift columns listing nurses
  const B1 = g => {
    const head = g[0]; if (!head) return null;
    const cols = head.map((h, j) => j === 0 ? -1 : NIGHT.test(h) ? 1 : /day|☀|morning/i.test(h) ? 0 : -1);
    if (!cols.includes(0) || !cols.includes(1)) return null;
    const rows = g.slice(1).filter(r => r[0] && !TOTAL.test(r[0]));
    if (rows.length !== 7) return null;
    const x = [];
    rows.forEach((r, d) => cols.forEach((s, j) => { if (s >= 0) for (const n of names(r[j] ?? "")) x.push([n, d, s]); }));
    return x;
  };
  // B2: 14 rows, one per (day, shift); nurse names in the other cells
  const B2 = g => {
    const rows = g.filter(r => r.some(c => /^(day|night)(\s*shift)?$|^[☀🌙]/i.test(c.trim())));
    if (rows.length !== 14) return null;
    const x = []; let d = -1, prev = 1;
    for (const r of rows) {
      const si = r.findIndex(c => /^(day|night)(\s*shift)?$|^[☀🌙]/i.test(c.trim()));
      const s = NIGHT.test(r[si]) ? 1 : 0;
      if (s <= prev) d++; prev = s;
      r.forEach((c, j) => { if (j !== si && !DAYLAB.test(c.trim())) for (const n of names(c)) x.push([n, d, s]); });
    }
    return d === 6 ? x : null;
  };
  const parse = els => {
    for (const g of grids(els)) for (const gg of [g, T(g)]) for (const f of [A14, A, B1, B2]) {
      const x = f(gg); if (!x) continue;
      const ns = [...new Set(x.map(a => a[0]))];
      if (ns.length > 6 || ns.length === 0) continue;
      return { x, ns, shape: f === A14 ? "A14" : f === A ? "A" : f === B1 ? "B1" : "B2", t: gg === g ? "" : "T" };
    }
    return null;
  };
  const check = R => {
    const on = new Set(R.x.map(([n, d, s]) => n + "|" + d + "|" + s));
    const bad = [];
    for (const n of R.ns) {
      const k = R.x.filter(a => a[0] === n).length;
      if (k > 5) bad.push(n + " works " + k);
      for (let d = 0; d < 6; d++) if (on.has(n + "|" + d + "|1") && on.has(n + "|" + (d + 1) + "|0")) bad.push(n + " night d" + (d + 1) + " then day d" + (d + 2));
    }
    let unc = 0;
    for (let d = 0; d < 7; d++) for (let s = 0; s < 2; s++) {
      const c = R.x.filter(a => a[1] === d && a[2] === s).length;
      if (c > 2) bad.push("d" + (d + 1) + (s ? "N" : "D") + " has " + c);
      unc += Math.max(0, 2 - c);
    }
    return { bad, unc };
  };
  const stated = t => {
    const m = t.match(/uncovered[^\d\n]{0,40}?(\d+)/i) || t.match(/(\d+)\s*(?:shifts?\s*)?(?:uncovered|unfilled)/i);
    if (m) return +m[1];
    if (/\b(all|every)\b[^.\n]{0,40}\b(covered|filled|staffed)\b|fully (covered|staffed)|\bno uncovered\b/i.test(t)) return 0;
    return null;
  };
  const judge = async (vars, deadline) => {
    const els = () => vars.map(v => v._value).filter(isEl);
    let R = null;
    while (Date.now() < deadline && !(R = parse(els()))) await sleep(250);
    if (!R) {
      const errs = vars.filter(v => v._error != null).map(v => v._name + ": " + String(v._error?.message ?? v._error).slice(0, 120));
      return { roster: "no roster table parsed (" + grids(els()).length + " tables)" + (errs.length ? " errors: " + errs.join("; ") : "") };
    }
    const c = check(R);
    const s = stated(els().map(e => e.textContent).join(" \n "));
    return {
      roster: "ok", shape: R.shape + R.t, unc: c.unc,
      hard: c.bad.length ? c.bad.slice(0, 4).join("; ") : "ok",
      optimal: c.unc === 0 ? "ok" : "shows " + c.unc + " uncovered; minimum is 0",
      reported: s === c.unc ? "ok" : s == null ? "no uncovered count stated" : "states " + s + ", table has " + c.unc,
    };
  };
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) { out.detail = "no module was created"; return out; }
  out.module = true;
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    const j = await judge(userVars, t0 + 9000);
    Object.assign(out, { roster: j.roster, hard: j.hard ?? "no roster", optimal: j.optimal ?? "no roster", reported: j.reported ?? "no roster" });
    out.detail = "live " + (j.shape || "") + " unc=" + j.unc;
  } catch (err) { out.detail = "collect threw " + err; return out; }
  finally { for (const k of keepers) { try { k.delete(); } catch {} } }

  let frame;
  try {
    const mods = [...new Set(userVars.map(v => v._module))];
    const entries = [...globalThis.__ojs_runtime.mains.entries()];
    const names = mods.map(m => entries.find(([, x]) => x === m)?.[0]).filter(Boolean);
    if (!names.length) { out.offline = "created module is not in mains"; return out; }
    const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
    const res = await f({ mains: globalThis.__ojs_runtime.mains });
    let html = typeof res === "string" ? res : res.source;
    out.embeddedIds = [...html.matchAll(/<script[^>]*\sid="([^"]*glpk[^"]*)"/g)].map(m => m[1]).join(",");
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
      out.offline = j.roster !== "ok" ? "offline: " + j.roster
        : j.hard !== "ok" ? "offline hard: " + j.hard
        : j.optimal !== "ok" ? "offline: " + j.optimal : "ok";
      if (out.offline !== "ok" && blocked.length) out.offline += " blocked: " + [...new Set(blocked)].slice(0, 4).join(",");
    } finally { for (const k of fk) { try { k.delete(); } catch {} } }
  } catch (err) { out.offline = "offline check threw: " + (err?.message ?? err); }
  finally { frame?.remove(); out.ms = Date.now() - t0; }
  return out;
})()`;

// ---- oracle arms ----
const NURSES = `["Alice", "Ben", "Chloe", "Dev", "Eve", "Finn"]`;
// exact: depth-first search over (day, shift) slots, each slot staffed by a pair; returns the first
// complete roster (0 uncovered, which is the lower bound, so optimal), else the best partial one found.
const SEARCH = `const _roster = function roster(nurses){
  const N = nurses.length, D = 7, pairs = [];
  for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) pairs.push([a, b]);
  const x = nurses.map(() => Array(D * 2).fill(0)), cnt = Array(N).fill(0);
  const ok = (n, k) => cnt[n] < 5 && !((k & 1) === 0 && k > 0 && x[n][k - 1]);
  let best = null, bestU = Infinity;
  const go = (k, u) => {
    if (u >= bestU) return false;
    if (k === D * 2) { bestU = u; best = x.map(r => r.slice()); return u === 0; }
    for (const [a, b] of pairs) if (ok(a, k) && ok(b, k)) {
      x[a][k] = x[b][k] = 1; cnt[a]++; cnt[b]++;
      if (go(k + 1, u)) return true;
      x[a][k] = x[b][k] = 0; cnt[a]--; cnt[b]--;
    }
    return go(k + 1, u + 2);
  };
  go(0, 0);
  return {grid: best, uncovered: bestU};
};
`;
const HTL_VIEW = `const _table = function table(htl, nurses, roster){return( htl.html\`<table>
  <thead><tr><th>Nurse</th>\${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => htl.html\`<th>\${d}</th>\`)}</tr></thead>
  <tbody>\${nurses.map((n, i) => htl.html\`<tr><td>\${n}</td>\${[0,1,2,3,4,5,6].map(d => htl.html\`<td>\${[roster.grid[i][2*d] ? "D" : "", roster.grid[i][2*d+1] ? "N" : ""].filter(Boolean).join("+") || "–"}</td>\`)}</tr>\`)}</tbody>
</table>\` )};
const _summary = function summary(md, roster){return( md\`Uncovered shifts: **\${roster.uncovered}**\` )};
`;
const MD_VIEW = `const _table = function table(md, nurses, roster){
  const who = (d, s) => nurses.filter((n, i) => roster.grid[i][2*d+s]).join(", ") || "UNCOVERED";
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return md\`| Day | Day shift | Night shift |
|---|---|---|
\${days.map((d, i) => "| " + d + " | " + who(i, 0) + " | " + who(i, 1) + " |").join("\\n")}

\${roster.uncovered} uncovered shifts.\`;
};
`;
const def = (extra = "", rosterDeps = ["nurses"]) => `export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_nurses", "nurses", [], _nurses);
${extra}  $def("_roster", "roster", ${JSON.stringify(rosterDeps)}, _roster);
  $def("_table", "table", ["TABLEDEP", "nurses", "roster"], _table);
  $def("_summary", "summary", ["md", "roster"], _summary);
  return main;
}
`;
const HEAD = `const _intro = function intro(md){return( md\`# Nurse roster\` )};
const _nurses = function nurses(){return( ${NURSES} )};
`;
const mk = (rosterSrc, view, extraDefs = "", rosterDeps) => {
  let d = def(extraDefs, rosterDeps).replace("TABLEDEP", view === MD_VIEW ? "md" : "htl");
  if (view === MD_VIEW) d = d.replace(`  $def("_summary", "summary", ["md", "roster"], _summary);\n`, "");
  return HEAD + rosterSrc + view + d;
};
const BRUTE = mk(SEARCH, HTL_VIEW);
const MD = mk(SEARCH, MD_VIEW);
// negative: first-fit greedy in nurse order that ignores the rest rule
const GREEDY = mk(`const _roster = function roster(nurses){
  const x = nurses.map(() => Array(14).fill(0)), cnt = nurses.map(() => 0);
  let u = 0;
  for (let k = 0; k < 14; k++) {
    const pick = nurses.map((_, i) => i).filter(i => cnt[i] < 5).slice(0, 2);
    for (const i of pick) { x[i][k] = 1; cnt[i]++; }
    u += 2 - pick.length;
  }
  return {grid: x, uncovered: u};
};
`, HTL_VIEW);
// negative: rules respected, but a first-fit heuristic in nurse order; leaves shifts uncovered
const SHORT = mk(`const _roster = function roster(nurses){
  const x = nurses.map(() => Array(14).fill(0)), cnt = nurses.map(() => 0);
  let u = 0;
  for (let k = 0; k < 14; k++) {
    let got = 0;
    for (let i = 0; i < nurses.length && got < 2; i++) {
      if (cnt[i] >= 5 || ((k & 1) === 0 && k > 0 && x[i][k - 1]) || ((k & 1) === 1 && x[i][k - 1])) continue;
      x[i][k] = 1; cnt[i]++; got++;
    }
    u += 2 - got;
  }
  return {grid: x, uncovered: u};
};
`, HTL_VIEW).replace("Uncovered shifts: **", "Optimal roster. Uncovered shifts: **");
const glpkRoster = `const _roster = async function roster(glpk, nurses){
  const N = nurses.length, D = 7, v = (n, d, s) => "x_" + n + "_" + d + "_" + s, u = (d, s) => "u_" + d + "_" + s;
  const xs = [], us = [], rows = [];
  for (let d = 0; d < D; d++) for (let s = 0; s < 2; s++) {
    us.push(u(d, s));
    const vars = [{name: u(d, s), coef: 1}];
    for (let n = 0; n < N; n++) { xs.push(v(n, d, s)); vars.push({name: v(n, d, s), coef: 1}); }
    rows.push({name: "cover_" + d + "_" + s, vars, bnds: {type: glpk.GLP_FX, lb: 2, ub: 2}});
  }
  for (let n = 0; n < N; n++) {
    const vars = [];
    for (let d = 0; d < D; d++) for (let s = 0; s < 2; s++) vars.push({name: v(n, d, s), coef: 1});
    rows.push({name: "max_" + n, vars, bnds: {type: glpk.GLP_UP, lb: 0, ub: 5}});
    for (let d = 0; d + 1 < D; d++) rows.push({name: "rest_" + n + "_" + d, vars: [{name: v(n, d, 1), coef: 1}, {name: v(n, d + 1, 0), coef: 1}], bnds: {type: glpk.GLP_UP, lb: 0, ub: 1}});
  }
  const r = await glpk.solve({
    name: "roster",
    objective: {direction: glpk.GLP_MIN, name: "uncovered", vars: us.map(name => ({name, coef: 1}))},
    subjectTo: rows,
    bounds: us.map(name => ({name, type: glpk.GLP_DB, lb: 0, ub: 2})),
    binaries: xs, generals: us
  }, {msglev: glpk.GLP_MSG_OFF});
  const grid = nurses.map((_, n) => Array.from({length: 2 * D}, (_, k) => Math.round(r.result.vars[v(n, k >> 1, k & 1)])));
  return {grid, uncovered: Math.round(r.result.z)};
};
`;
const CDN = mk(glpkRoster + `const _glpk = async function glpk(){return( await (await import("https://cdn.jsdelivr.net/npm/glpk.js@5.0.0/dist/index.js")).default() )};
`, HTL_VIEW, `  $def("_glpk", "glpk", [], _glpk);\n`, ["glpk", "nurses"]);
// the corpus solver, imported from its published notebook (not embedded in robocoop-5)
const OBS = mk(glpkRoster, HTL_VIEW,
  `  main.define("module @tomlarkworthy/glpk-js", async () => runtime.module((await import("/@tomlarkworthy/glpk-js.js?v=4")).default));\n  main.define("glpk", ["module @tomlarkworthy/glpk-js", "@variable"], (_, v) => v.import("glpk", _));\n`,
  ["glpk", "nurses"]);

// the module written in the model run of this eval on the base notebook (eval-base.json): backtracking
// with random restarts, a nurse x (day, D/N) table of ✓ marks
const BASERUN = "const _intro = function intro(md){return( md`# Nurse Shift Scheduler\n\n6 nurses \u00b7 7 days \u00b7 2 shifts (day/night) \u00b7 2 nurses per shift.\n**Constraints:** max 5 shifts/nurse/week, no night\u2192next-day-day.\nObjective: minimise uncovered shifts.` )};\n\n// --- Problem setup ---\nconst _nurses = function nurses(){return( [\"A\",\"B\",\"C\",\"D\",\"E\",\"F\"] )};\nconst _days = function days(){return( [\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\",\"Sun\"] )};\nconst _shifts = function shifts(){return( [\"Day\",\"Night\"] )};\n\n// --- Solver ---\nconst _schedule = function schedule(nurses, days, shifts){\n  // Build all shift slots: {day, shift, index}\n  const slots = [];\n  for (let d = 0; d < days.length; d++) {\n    for (let s = 0; s < shifts.length; s++) {\n      slots.push({ day: d, shift: s, label: `${days[d]} ${shifts[s]}` });\n    }\n  }\n  const numSlots = slots.length; // 14\n  const nursesPerShift = 2;\n  const maxShiftsPerNurse = 5;\n\n  // Forbidden pairs: (day d night, day d+1 day) for same nurse\n  // night slot index for day d = d*2+1, day slot index for day d+1 = (d+1)*2\n\n  function isForbidden(nurse, slotIdx, assignment) {\n    // Check night\u2192next-day-day\n    const slot = slots[slotIdx];\n    if (slot.shift === 1 && slot.day < days.length - 1) {\n      // This is a night shift, check if nurse also works next day's day shift\n      const nextDaySlot = (slot.day + 1) * 2;\n      if (assignment[nextDaySlot] && assignment[nextDaySlot].includes(nurse)) return true;\n    }\n    if (slot.shift === 0 && slot.day > 0) {\n      // This is a day shift, check if nurse also worked previous night\n      const prevNightSlot = (slot.day - 1) * 2 + 1;\n      if (assignment[prevNightSlot] && assignment[prevNightSlot].includes(nurse)) return true;\n    }\n    return false;\n  }\n\n  function countNurseShifts(nurse, assignment) {\n    let c = 0;\n    for (const s of assignment) {\n      if (s && s.includes(nurse)) c++;\n    }\n    return c;\n  }\n\n  // Backtracking solver\n  let bestResult = null;\n  let bestUncovered = numSlots * nursesPerShift;\n\n  function solve(slotIdx, assignment, rng) {\n    if (slotIdx === numSlots) {\n      // Count uncovered\n      let uncovered = 0;\n      for (const s of assignment) {\n        if (!s) uncovered += nursesPerShift;\n        else uncovered += (nursesPerShift - s.length);\n      }\n      if (uncovered < bestUncovered) {\n        bestUncovered = uncovered;\n        bestResult = assignment.map(s => s ? [...s] : []);\n      }\n      return uncovered === 0; // stop on perfect\n    }\n\n    const needed = nursesPerShift;\n    // Try combinations of nurses for this slot\n    const candidates = [];\n    for (let i = 0; i < nurses.length; i++) {\n      if (countNurseShifts(nurses[i], assignment) < maxShiftsPerNurse &&\n          !isForbidden(nurses[i], slotIdx, assignment)) {\n        candidates.push(i);\n      }\n    }\n\n    // Shuffle candidates for diversity\n    for (let i = candidates.length - 1; i > 0; i--) {\n      const j = Math.floor(rng() * (i + 1));\n      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];\n    }\n\n    // Try assigning 2 nurses\n    if (candidates.length >= needed) {\n      // Try pairs\n      for (let i = 0; i < candidates.length; i++) {\n        for (let j = i + 1; j < candidates.length; j++) {\n          assignment[slotIdx] = [nurses[candidates[i]], nurses[candidates[j]]];\n          if (solve(slotIdx + 1, assignment, rng)) return true;\n          assignment[slotIdx] = null;\n        }\n      }\n    }\n    // Try assigning 1 nurse (partial coverage)\n    for (let i = 0; i < candidates.length; i++) {\n      assignment[slotIdx] = [nurses[candidates[i]]];\n      if (solve(slotIdx + 1, assignment, rng)) return true;\n      assignment[slotIdx] = null;\n    }\n    // Skip this slot\n    assignment[slotIdx] = null;\n    if (solve(slotIdx + 1, assignment, rng)) return true;\n    return false;\n  }\n\n  // Seeded PRNG (mulberry32)\n  function mulberry32(seed) {\n    return function() {\n      seed |= 0; seed = seed + 0x6D2B79F5 | 0;\n      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);\n      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;\n      return ((t ^ t >>> 14) >>> 0) / 4294967296;\n    };\n  }\n\n  // Try many random seeds\n  for (let seed = 0; seed < 500; seed++) {\n    const rng = mulberry32(seed);\n    const assignment = new Array(numSlots).fill(null);\n    if (solve(0, assignment, rng)) break;\n    if (bestUncovered === 0) break;\n  }\n\n  return { slots, bestResult, bestUncovered, nurses, days, shifts, nursesPerShift, maxShiftsPerNurse };\n};\n\n// --- Validation ---\nconst _validation = function validation(schedule){\n  const { bestResult, nurses, slots, nursesPerShift, maxShiftsPerNurse } = schedule;\n  const errors = [];\n  // Check max shifts per nurse\n  for (const n of nurses) {\n    let count = 0;\n    for (const s of bestResult) if (s && s.includes(n)) count++;\n    if (count > maxShiftsPerNurse) errors.push(`Nurse ${n} works ${count} shifts (max ${maxShiftsPerNurse})`);\n  }\n  // Check night\u2192day constraint\n  for (let d = 0; d < 6; d++) {\n    const nightSlot = d * 2 + 1;\n    const nextDaySlot = (d + 1) * 2;\n    if (bestResult[nightSlot] && bestResult[nextDaySlot]) {\n      for (const n of bestResult[nightSlot]) {\n        if (bestResult[nextDaySlot].includes(n)) {\n          errors.push(`Nurse ${n} works night ${slots[d*2].label.replace(' Day','')} then day ${slots[(d+1)*2].label.replace(' Day','')}`);\n        }\n      }\n    }\n  }\n  return errors.length === 0 ? \"\u2705 All constraints satisfied\" : `\u274c ${errors.join(\"; \")}`;\n};\n\n// --- Summary stats ---\nconst _stats = function stats(schedule){\n  const { bestResult, nurses, nursesPerShift } = schedule;\n  let totalFilled = 0, totalNeeded = 0;\n  for (const s of bestResult) {\n    totalNeeded += nursesPerShift;\n    totalFilled += s ? s.length : 0;\n  }\n  const perNurse = {};\n  for (const n of nurses) perNurse[n] = 0;\n  for (const s of bestResult) if (s) for (const n of s) perNurse[n]++;\n  return { totalFilled, totalNeeded, uncovered: totalNeeded - totalFilled, perNurse };\n};\n\n// --- Display ---\nconst _rosterTable = function rosterTable(schedule, stats, validation, days, shifts, d3){\n  const { bestResult, nurses, nursesPerShift } = schedule;\n  const container = d3.create(\"div\");\n\n  container.append(\"p\").style(\"margin\",\"4px 0\").text(\n    `Coverage: ${stats.totalFilled}/${stats.totalNeeded} slots filled. ` +\n    `Uncovered: ${stats.uncovered}. ${validation}`\n  );\n\n  // Per-nurse summary\n  const nurseLine = container.append(\"p\").style(\"margin\",\"4px 0 12px 0\");\n  nurseLine.append(\"b\").text(\"Shifts per nurse: \");\n  nurseLine.append(\"span\").text(\n    Object.entries(stats.perNurse).map(([n,c]) => `${n}:${c}`).join(\"  \")\n  );\n\n  // Build table: rows = nurses, columns = Day/Night for each day\n  const table = container.append(\"table\").style(\"border-collapse\",\"collapse\").style(\"font-family\",\"var(--sans-serif)\").style(\"font-size\",\"13px\");\n\n  // Header row 1: day names spanning 2 cols each\n  const thead = table.append(\"thead\");\n  const h1 = thead.append(\"tr\");\n  h1.append(\"th\").text(\"Nurse\").style(\"border\",\"1px solid #aaa\").style(\"padding\",\"4px 8px\").style(\"background\",\"#f0f0f0\");\n  for (const d of days) {\n    h1.append(\"th\").attr(\"colspan\",2).text(d).style(\"border\",\"1px solid #aaa\").style(\"padding\",\"4px 8px\").style(\"background\",\"#e8e8e8\").style(\"text-align\",\"center\");\n  }\n\n  // Header row 2: D/N sublabels\n  const h2 = thead.append(\"tr\");\n  h2.append(\"th\").style(\"border\",\"1px solid #aaa\").style(\"background\",\"#f0f0f0\");\n  for (let d = 0; d < 7; d++) {\n    for (const s of shifts) {\n      h2.append(\"th\").text(s[0]).style(\"border\",\"1px solid #aaa\").style(\"padding\",\"2px 6px\").style(\"background\",\"#f5f5f5\").style(\"text-align\",\"center\").style(\"font-size\",\"11px\");\n    }\n  }\n\n  // Body: one row per nurse\n  const tbody = table.append(\"tbody\");\n  for (const n of nurses) {\n    const tr = tbody.append(\"tr\");\n    tr.append(\"td\").text(n).style(\"border\",\"1px solid #ccc\").style(\"padding\",\"4px 8px\").style(\"font-weight\",\"bold\").style(\"background\",\"#f9f9f9\");\n    for (let slotIdx = 0; slotIdx < bestResult.length; slotIdx++) {\n      const assigned = bestResult[slotIdx] || [];\n      const on = assigned.includes(n);\n      tr.append(\"td\")\n        .text(on ? \"\u2713\" : \"\")\n        .style(\"border\",\"1px solid #ccc\")\n        .style(\"padding\",\"4px 6px\")\n        .style(\"text-align\",\"center\")\n        .style(\"background\", on ? (slotIdx % 2 === 0 ? \"#d4edda\" : \"#cce5ff\") : \"\")\n        .style(\"color\", on ? (slotIdx % 2 === 0 ? \"#155724\" : \"#004085\") : \"\")\n        .style(\"font-weight\", on ? \"bold\" : \"normal\");\n    }\n  }\n\n  return container.node();\n};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  $def(\"_intro\", \"intro\", [\"md\"], _intro);\n  $def(\"_nurses\", \"nurses\", [], _nurses);\n  $def(\"_days\", \"days\", [], _days);\n  $def(\"_shifts\", \"shifts\", [], _shifts);\n  $def(\"_schedule\", \"schedule\", [\"nurses\", \"days\", \"shifts\"], _schedule);\n  $def(\"_validation\", \"validation\", [\"schedule\"], _validation);\n  $def(\"_stats\", \"stats\", [\"schedule\"], _stats);\n  $def(\"_rosterTable\", \"rosterTable\", [\"schedule\", \"stats\", \"validation\", \"days\", \"shifts\", \"d3\"], _rosterTable);\n  return main;\n}";

const ARM = (typeof process !== "undefined" && process.env.M53_ARM) || "brute";
// the module written in run 20260929-0620-m53-before (randomised greedy, best of 2000), verbatim
const TRACE = "const _intro = function intro(md){return( md`# Nurse Roster Scheduler\n\n6 nurses \u00b7 7 days \u00b7 day & night shifts \u00b7 2 nurses per shift\nEach nurse works \u2264 5 shifts/week and never a night shift followed by the next day's day shift.\nObjective: minimise uncovered shifts.\n` )};\nconst _names = function names(){return( [\"Ava\",\"Bev\",\"Cal\",\"Dee\",\"Eve\",\"Fay\"] )};\nconst _N = function N(names){return( names.length )};\nconst _D = function D(){return( 7 )};\nconst _MAX = function MAX(){return( 5 )};\nconst _slotOrder = function slotOrder(D){\n  const order = [];\n  for (let d = 0; d < D; d++) { order.push([d,0]); order.push([d,1]); }\n  return order;\n};\nconst _trial = function trial(N, D, MAX, slotOrder){\n  return function trial(){\n    const roster = Array.from({length: D}, () => [[], []]);\n    const load = new Array(N).fill(0);\n    const night = Array.from({length: D}, () => new Set());\n    const dayAssigned = Array.from({length: D}, () => new Set()); // track per-day assignments\n    let unc = 0;\n    for (const [d, s] of slotOrder) {\n      const pool = [];\n      for (let i = 0; i < N; i++) {\n        if (load[i] >= MAX) continue;\n        if (dayAssigned[d].has(i)) continue;           // no double-shift days\n        if (s === 0 && d > 0 && night[d-1].has(i)) continue; // night\u2192day constraint\n        pool.push(i);\n      }\n      pool.sort((a,b) => load[a] - load[b] || Math.random() - 0.5);\n      const pick = pool.slice(0, 2);\n      roster[d][s] = pick;\n      if (pick.length < 2) unc += 2 - pick.length;\n      for (const i of pick) {\n        load[i]++;\n        dayAssigned[d].add(i);\n        if (s===1) night[d].add(i);\n      }\n    }\n    return { roster: roster.map(r => r.map(s => [...s])), load: [...load], uncovered: unc };\n  };\n};\nconst _solve = function solve(trial){return(\nfunction solve() {\n  let best = null, bestUnc = Infinity;\n  for (let i = 0; i < 2000; i++) {\n    const r = trial();\n    if (r.uncovered < bestUnc) { bestUnc = r.uncovered; best = r; if (r.uncovered === 0) break; }\n  }\n  return best;\n}\n)};\nconst _viewof_seed = function viewof_seed(htl){\n  let count = 0;\n  const btn = htl.html`<button style=\"padding:6px 16px;font-size:14px;cursor:pointer;border-radius:4px;border:1px solid #888;background:#f0f0f0\">Reshuffle</button>`;\n  btn.value = count;\n  btn.addEventListener(\"click\", () => { btn.value = ++count; btn.dispatchEvent(new Event(\"input\", {bubbles:true})); });\n  return btn;\n};\nconst _seed = function seed(Generators, el){return( Generators.input(el) )};\nconst _result = function result(seed, solve, names){\n  const r = solve();\n  r.names = names;\n  return r;\n};\nconst _summary = function summary(result, md){\n  const {names, load, uncovered} = result;\n  return md`**Uncovered shifts:** ${uncovered}  \n**Nurse loads:** ${names.map((n,i)=>`${n}=${load[i]}`).join(\", \")}`;\n};\nconst _table = function table(result, htl){\n  const {names, roster} = result;\n  const days = [\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\",\"Sat\",\"Sun\"];\n  const rows = [];\n  for (let d = 0; d < 7; d++) {\n    const dn = roster[d][0].map(i => names[i]).join(\", \") || \"\u2014\";\n    const nn = roster[d][1].map(i => names[i]).join(\", \") || \"\u2014\";\n    rows.push(htl.html`<tr>\n      <td style=\"font-weight:600;padding:4px 12px\">${days[d]}</td>\n      <td style=\"padding:4px 12px\">${dn}</td>\n      <td style=\"padding:4px 12px\">${nn}</td>\n    </tr>`);\n  }\n  return htl.html`<table style=\"border-collapse:collapse;text-align:center\">\n    <thead><tr>\n      <th style=\"padding:6px 12px;border-bottom:2px solid #555\">Day</th>\n      <th style=\"padding:6px 12px;border-bottom:2px solid #555\">\u2600\ufe0f Day Shift</th>\n      <th style=\"padding:6px 12px;border-bottom:2px solid #555\">\ud83c\udf19 Night Shift</th>\n    </tr></thead>\n    <tbody>${rows}</tbody>\n  </table>`;\n};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_intro\", \"intro\", [\"md\"], _intro);  \n  $def(\"_names\", \"names\", [], _names);  \n  $def(\"_N\", \"N\", [\"names\"], _N);  \n  $def(\"_D\", \"D\", [], _D);  \n  $def(\"_MAX\", \"MAX\", [], _MAX);  \n  $def(\"_slotOrder\", \"slotOrder\", [\"D\"], _slotOrder);  \n  $def(\"_trial\", \"trial\", [\"N\",\"D\",\"MAX\",\"slotOrder\"], _trial);  \n  $def(\"_solve\", \"solve\", [\"trial\"], _solve);  \n  $def(\"_viewof_seed\", \"viewof seed\", [\"htl\"], _viewof_seed);  \n  $def(\"_seed\", \"seed\", [\"Generators\",\"viewof seed\"], _seed);  \n  $def(\"_result\", \"result\", [\"seed\",\"solve\",\"names\"], _result);  \n  $def(\"_summary\", \"summary\", [\"result\",\"md\"], _summary);  \n  $def(\"_table\", \"table\", [\"result\",\"htl\"], _table);\n  return main;\n}\n";
const WIKI = { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } };
const RESEARCH = { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/researching-libraries-and-apis.md" } };
const write = content => ({ tool: "write_file", args: { file_path: "/src/@user/nurse-roster.js", content } });
const arms = { brute: [WIKI, write(BRUTE)], md: [WIKI, write(MD)], greedy: [WIKI, write(GREEDY)], short: [WIKI, write(SHORT)],
  cdn: [WIKI, RESEARCH, write(CDN)], obs: [WIKI, write(OBS)], trace: [WIKI, write(TRACE)], baserun: [WIKI, write(BASERUN)], none: [WIKI] };

export default {
  id: "rc5t-mip-nurse-roster",
  category: "rc5-train",
  question: "Schedule 6 nurses over 7 days with a day shift and a night shift each day, each shift needing 2 nurses. Each nurse works at most 5 shifts a week and never a night shift followed by the next day's day shift. Minimise uncovered shifts and show the roster as a table.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "roster", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "hard", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "optimal", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "reported", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "offline", equals: "ok" }, weight: 2 },
  ],
  oracle: arms[ARM] ?? arms.brute,
};
