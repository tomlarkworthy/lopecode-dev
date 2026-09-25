// The df16 attest/core fixture module, shared by cross-smoke.mjs (--attest) and attest-persist.mjs
// so both drive the SAME cells: one file, two harnesses.

// df16 fixture. `load` is GIVEN (its source names /local-disk); `est` is a zero-input FUNCTION cell,
// so it is computation and must be attested. refEst/refEst2 plant a known mean and report pass per
// row; refBad has one failing row; `peek` sits downstream of the deliverable `out`, so it can never
// be evidence. pB/pC are two independent derivations of `derived`, which is what feeds `out` — they
// give the df11 cross-check rule its two qualifying entries so the core rule is what the guard is
// left rejecting on. df20: `out` bumps globalThis.__rc5SmokeRuns on every recompute — every cell of
// an applied module is auto-observed (applyLib.probeAndWatch), so a mutation of the LIVE `est` runs
// the whole pipeline twice and the counter moves; a scratch-clone mutation leaves it alone.
// df22: `nullEst` plants NO signal — 40 samples of ±k, whose mean is the null answer 0 — and passes
// only when est returns it; `nullLazy` plants nothing and hardcodes pass, so the mutation check must
// refuse it under kind "null" exactly as it refuses refLazy under kind "reference". The path's
// second kind is the existing dB crossing (derived vs pB), so no new cell is needed for it.
export const MODULE_ATTEST = `const _localDisk = function localDisk(){ return { write: (p, t) => p + ":" + String(t).length }; };
const _load = function load(){ const root = "/local-disk/inputs"; return { root: root, xs: Array.from({length: 40}, (_, i) => i + 1) }; };
const _est = function est(){ return (xs) => { let s = 0; for (const x of xs) s += x; return s / xs.length; }; };
const _refEst = function refEst(est, load){ const rows = []; for (let k = 1; k <= 6; k++) { const xs = load.xs.map(() => k); const got = est(xs); rows.push({ case: k, want: k, got: got, pass: Math.abs(got - k) < 1e-9 }); } return rows; };
const _refEst2 = function refEst2(est, load){ const rows = []; for (let k = 1; k <= 5; k++) { const xs = load.xs.map((_, i) => k + (i % 2 ? 1 : -1)); const got = est(xs); rows.push({ case: k, want: k, got: got, pass: Math.abs(got - k) < 1e-9 }); } return rows; };
const _refLazy = function refLazy(est, load){ return load.xs.slice(0, 3).map((x, i) => ({ i: i, note: "est looks right to me", pass: true })); };
const _nullEst = function nullEst(est, load){ const rows = []; for (let k = 1; k <= 4; k++) { const xs = load.xs.map((_, i) => (i % 2 ? k : -k)); const got = est(xs); rows.push({ case: k, planted: "no offset, only ±" + k, want: 0, got: got, pass: Math.abs(got) < 1e-9 }); } return rows; };
const _nullLazy = function nullLazy(est, load){ return load.xs.slice(0, 3).map((x, i) => ({ i: i, planted: "nothing", note: "no offset here either", pass: true })); };
const _refBad = function refBad(est, load){ const rows = []; for (let k = 1; k <= 4; k++) { const want = k === 3 ? k + 1 : k; const got = est(load.xs.map(() => k)); rows.push({ case: k, want: want, got: got, pass: Math.abs(got - want) < 1e-9 }); } return rows; };
const _derived = function derived(est, load){ return load.xs.map(x => est([x, x])); };
const _refDer = function refDer(derived, load){ return load.xs.slice(0, 6).map((x, i) => ({ i: i, want: x, got: derived[i], pass: derived[i] === x })); };
const _refDer2 = function refDer2(derived){ return derived.slice(0, 5).map((v, i) => ({ i: i, got: v, pass: typeof v === "number" && v === i + 1 })); };
const _pB = function pB(load){ return load.xs.map(x => x + 0); };
const _pC = function pC(load){ return load.xs.map((_, i) => i + 1); };
const _out = function out(derived, localDisk){ globalThis.__rc5SmokeRuns = (globalThis.__rc5SmokeRuns || 0) + 1; const target = "/local-disk/task/results/x.csv"; return localDisk.write(target, derived.join(",")); };
const _peek = function peek(out){ return out; };
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_localDisk", "localDisk", [], _localDisk);
  $def("_load", "load", [], _load);
  $def("_est", "est", [], _est);
  $def("_refEst", "refEst", ["est","load"], _refEst);
  $def("_refEst2", "refEst2", ["est","load"], _refEst2);
  $def("_refLazy", "refLazy", ["est","load"], _refLazy);
  $def("_nullEst", "nullEst", ["est","load"], _nullEst);
  $def("_nullLazy", "nullLazy", ["est","load"], _nullLazy);
  $def("_refBad", "refBad", ["est","load"], _refBad);
  $def("_derived", "derived", ["est","load"], _derived);
  $def("_refDer", "refDer", ["derived","load"], _refDer);
  $def("_refDer2", "refDer2", ["derived"], _refDer2);
  $def("_pB", "pB", ["load"], _pB);
  $def("_pC", "pC", ["load"], _pC);
  $def("_out", "out", ["derived","localDisk"], _out);
  $def("_peek", "peek", ["out"], _peek);
  return main;
}
`;

// The same module with `est` rewritten (same answer, different definition text): every attestation
// naming est must go STALE on the definition HASH, not on the module's apply counter.
export const MODULE_ATTEST_V2 = MODULE_ATTEST.replace(
  "const _est = function est(){ return (xs) => { let s = 0; for (const x of xs) s += x; return s / xs.length; }; };",
  "const _est = function est(){ return (xs) => xs.reduce((s, x) => s + x, 0) / xs.length; };");

// df17 literature fixture (cross-smoke --literature). `lore` is a KNOWLEDGE cell: an md cell that
// computes nothing and carries a URL, so it is given-from-literature; `notes` says something
// plausible with no citation at all, so it is not evidence for anything. `classify` is a zero-input
// function cell — computation, and the rule whose numbers came out of `lore`.
export const MODULE_LIT = `const _localDisk = function localDisk(){ return { write: (p, t) => p + ":" + String(t).length }; };
const _load = function load(){ const root = "/local-disk/inputs"; return { root: root, periods: [0.55, 0.32, 0.7, 0.21] }; };
const _lore = function lore(md){ return md\`RR Lyrae ab stars have fundamental-mode periods between 0.4 and 1.0 days, and RRc overtone pulsators between 0.2 and 0.45 days (https://en.wikipedia.org/wiki/RR_Lyrae_variable).\`; };
const _notes = function notes(md){ return md\`Anything under half a day is probably an overtone pulsator.\`; };
const _classify = function classify(){ return (p) => p >= 0.4 ? "ab" : "c"; };
const _labels = function labels(classify, load){ return load.periods.map(classify); };
const _out = function out(labels, localDisk){ const target = "/local-disk/task/results/labels.csv"; return localDisk.write(target, labels.join(",")); };
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_localDisk", "localDisk", [], _localDisk);
  $def("_load", "load", [], _load);
  $def("_lore", "lore", ["md"], _lore);
  $def("_notes", "notes", ["md"], _notes);
  $def("_classify", "classify", [], _classify);
  $def("_labels", "labels", ["classify","load"], _labels);
  $def("_out", "out", ["labels","localDisk"], _out);
  return main;
}
`;

// The sentence the classifier's boundary comes from, and one that is in `notes` (which cites nothing).
export const LIT_CLAIM = "RR Lyrae ab stars have fundamental-mode periods between 0.4 and 1.0 days";
export const LIT_CLAIM_UNCITED = "Anything under half a day is probably an overtone pulsator.";

// df23 (cross-smoke --attest): the same module with the writer cell's target moved out of
// `results/`, so DELIVERABLE_RE matches no cell and the page has no writer cell at all — the state
// walk n reached by writing the output from eval_js.
export const MODULE_ATTEST_NOWRITER = MODULE_ATTEST_V2.replace(
  '"/local-disk/task/results/x.csv"', '"/local-disk/task/cache/x.csv"');

// df28 (memo-smoke): the boot-memo fixture. `slowRef` is a DETERMINISTIC slow data cell downstream
// of `est` — twelve 500 ms busy chunks, ~6 s in all, yielding between them so the page stays
// responsive — and it bumps globalThis.__rc5SlowRuns the moment its computation STARTS. A page that
// serves it from the memo leaves that counter at 0; the df20 scratch clone built for the mutation
// check must move it, because a clone built from the memo stub would pass the mutant straight
// through. `fastRef` is the control: same inputs, no wait, and it must NOT be memoised.
export const MODULE_MEMO = `const _localDisk = function localDisk(){ return { write: (p, t) => p + ":" + String(t).length }; };
const _load = function load(){ const root = "/local-disk/inputs"; return { root: root, xs: Array.from({length: 40}, (_, i) => i + 1) }; };
const _est = function est(){ return (xs) => { let s = 0; for (const x of xs) s += x; return s / xs.length; }; };
const _slowRef = function slowRef(est, load){ return (async () => { globalThis.__rc5SlowRuns = (globalThis.__rc5SlowRuns || 0) + 1; for (let c = 0; c < 12; c++) { const t0 = Date.now(); while (Date.now() - t0 < 500) {} await new Promise(r => setTimeout(r, 0)); } const rows = []; for (let k = 1; k <= 4; k++) { const xs = load.xs.map(() => k); const got = est(xs); rows.push({ case: k, want: k, got: got, pass: Math.abs(got - k) < 1e-9 }); } return rows; })(); };
const _fastRef = function fastRef(est, load){ return load.xs.slice(0, 4).map((x, i) => ({ i: i, want: x, got: est([x, x]), pass: est([x, x]) === x })); };
const _derived = function derived(est, load){ return load.xs.map(x => est([x, x])); };
const _out = function out(derived, localDisk){ const target = "/local-disk/task/results/x.csv"; return localDisk.write(target, derived.join(",")); };
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_localDisk", "localDisk", [], _localDisk);
  $def("_load", "load", [], _load);
  $def("_est", "est", [], _est);
  $def("_slowRef", "slowRef", ["est","load"], _slowRef);
  $def("_fastRef", "fastRef", ["est","load"], _fastRef);
  $def("_derived", "derived", ["est","load"], _derived);
  $def("_out", "out", ["derived","localDisk"], _out);
  return main;
}
`;

// `est` rewritten to the same answer with different text: slowRef's TRANSITIVE key must change, so
// the memo misses and the cell recomputes (and every attestation naming est goes stale, as in df16).
export const MODULE_MEMO_V2 = MODULE_MEMO.replace(
  "const _est = function est(){ return (xs) => { let s = 0; for (const x of xs) s += x; return s / xs.length; }; };",
  "const _est = function est(){ return (xs) => xs.reduce((s, x) => s + x, 0) / xs.length; };");

// df29 (given-smoke): the seed-root fixture. `load` reads a path INSIDE the task's data, `scale` is a
// zero-input constant naming no path at all, and both stay GIVEN. `imported` reads
// /local-disk/task/cache/py.json — a file the run itself could have written — so with
// globalThis.__rc5SeedRoots set it is NOT given: it is weighed like any other cell and blocks
// everything downstream until it carries two attestations. `relImp` names the relative form the host
// resolves against /local-disk/, `holeImp` builds its path with a ${} hole (unknown, so outside).
// `est` is the computation on the imported file, `out` the writer. `pB`/`pC` are two further
// derivations of the same per-item quantity, so the df11 cross-check gate is satisfied and the CORE
// RULE is what the guard is left rejecting on. refImp/nullImp are the two evidence cells that lift
// `imported` into the core the way any other cell gets there.
// df33: refImp/nullImp read only `imported` (outside the roots), so on df33 neither is real-anchored;
// refImpLoad checks `imported` against `load` (the task's data) and is the anchoring third evidence.
export const MODULE_GIVEN = `const _localDisk = function localDisk(){ return { write: (p, t) => p + ":" + String(t).length, readText: (p) => p }; };
const _load = function load(){ const path = "/local-disk/task/data/x.csv"; return { path: path, xs: Array.from({length: 40}, (_, i) => i + 1) }; };
const _scale = function scale(){ return 2; };
const _imported = function imported(){ const path = "/local-disk/task/cache/py.json"; return { path: path, rows: Array.from({length: 40}, (_, i) => (i + 1) * 2) }; };
const _relImp = function relImp(localDisk){ const read = () => localDisk.readText("root/cache/rel.json"); return { read: read, n: 3 }; };
const _holeImp = function holeImp(scale){ const p = \`/local-disk/task/data/part-\${scale}.json\`; return { p: p, n: 3 }; };
const _holeOut = function holeOut(scale){ const p = \`/local-disk/task/cache/part-\${scale}.json\`; return { p: p, n: 3 }; };
const _est = function est(imported){ return imported.rows.map(v => v / 2); };
const _pB = function pB(imported){ return imported.rows.map(v => v * 0.5); };
const _pC = function pC(imported){ return imported.rows.map((v, i) => (v - 2) / 2 + 1); };
const _refImp = function refImp(imported){ const rows = []; for (let i = 0; i < 4; i++) rows.push({ i: i, want: (i + 1) * 2, got: imported.rows[i], pass: imported.rows[i] === (i + 1) * 2 }); return rows; };
const _refImpLoad = function refImpLoad(imported, load){ const rows = []; for (let i = 0; i < 4; i++) rows.push({ i: i, want: load.xs[i] * 2, got: imported.rows[i], pass: imported.rows[i] === load.xs[i] * 2 }); return rows; };
const _nullImp = function nullImp(imported){ const rows = []; for (let k = 1; k <= 3; k++) { const got = imported.rows.filter(v => v === -k).length; rows.push({ planted: "no row with value " + (-k), want: 0, got: got, pass: got === 0 }); } return rows; };
const _out = function out(est, localDisk){ const target = "/local-disk/task/results/x.csv"; return localDisk.write(target, est.join(",")); };
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_localDisk", "localDisk", [], _localDisk);
  $def("_load", "load", [], _load);
  $def("_scale", "scale", [], _scale);
  $def("_imported", "imported", [], _imported);
  $def("_relImp", "relImp", ["localDisk"], _relImp);
  $def("_holeImp", "holeImp", ["scale"], _holeImp);
  $def("_holeOut", "holeOut", ["scale"], _holeOut);
  $def("_est", "est", ["imported"], _est);
  $def("_pB", "pB", ["imported"], _pB);
  $def("_pC", "pC", ["imported"], _pC);
  $def("_refImp", "refImp", ["imported"], _refImp);
  $def("_refImpLoad", "refImpLoad", ["imported","load"], _refImpLoad);
  $def("_nullImp", "nullImp", ["imported"], _nullImp);
  $def("_out", "out", ["est","localDisk"], _out);
  return main;
}
`;

// The roots the df29 driver would pass for this fixture, and the pre-boot script that sets them.
export const GIVEN_ROOTS = ["/local-disk/task/data"];
export const GIVEN_INIT_SCRIPT = `globalThis.__rc5SeedRoots = ${JSON.stringify(["/local-disk/task/data"])};`;

// df33 (anchor-smoke): evidence provenance. `load` reads the task's data (under GIVEN_ROOTS), `loadT(i)`
// is a FUNCTION-cell loader over a ${} path under the roots. Each estimator is its own cell so each
// case's core membership is independent:
//   est    refSyn / nullSyn plant invented data only (synthetic); refReal windows the real xs, so its
//          numbers move when xs is permuted (real-anchored).
//   estD   refConstD reads load but uses only its LENGTH: the verdict cannot change (demoted).
//   estE   nullReal centres the real xs and expects 0 (nullcheck on the task's data: anchored, no
//          sensitivity run); refSynE is synthetic.
//   est2   refFn calls loadT(i) and weighs y by t (anchored through the destroying wrapper).
//   estG   refSlow sleeps 70 s when xs is not the sorted original (the destroyed copy), so its
//          sensitivity run exceeds the 60 s budget (unmeasured).
// df34:
//   estE   refRealE windows the real xs (like refReal): with nullReal + refSynE, a real null alone
//          does not complete estE; refRealE does.
//   pfind  a period finder. refCad reads the real two-band records from loadC, keeps ONLY their
//          sorted time stamps, plants sin(2 pi t/P) plus a tiny index-keyed noise and passes when P is
//          recovered. A permutation (df33) leaves the sorted times identical, so its outcome is
//          bit-identical (demoted); a redraw (df34) moves every time stamp (real-anchored).
// df35 (the d3-probe shapes, on loadC's sorted times, attesting lsq — a copy of pfind):
//   ev6    3 periods planted on the real times; pass + STRING details only (demoted).
//   ev7    ev6 plus a first row asserting loadC[1].t — it never calls lsq, so it passes under the
//          mutant, and flips on destroyed data (df34: real-anchored; df35: demoted, df35 sentence).
//   ev8    ev6 with the recovered period as a NUMBER in the row the mutant breaks (real-anchored).
export const MODULE_ANCHOR = `const _localDisk = function localDisk(){ return { write: (p, t) => p + ":" + String(t).length, readText: (p) => p }; };
const _load = function load(){ const path = "/local-disk/task/data/x.csv"; return { path: path, xs: Array.from({length: 40}, (_, i) => i + 1) }; };
const _loadT = function loadT(){ return (i) => { const path = \`/local-disk/task/data/t_\${i}.csv\`; return Array.from({length: 20}, (_, j) => ({ t: j, y: (j * (i + 2)) % 7 })); }; };
const _est = function est(){ return (xs) => { let s = 0; for (const x of xs) s += x; return s / xs.length; }; };
const _estD = function estD(){ return (xs) => { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[i]; return s / xs.length; }; };
const _estE = function estE(){ return (xs) => xs.reduce((s, x) => s + x, 0) / xs.length; };
const _estG = function estG(){ return (xs) => { let s = 0; xs.forEach(x => { s += x; }); return s / xs.length; }; };
const _est2 = function est2(){ return (rows) => rows.reduce((s, r) => s + r.t * r.y, 0) / rows.length; };
const _refSyn = function refSyn(est){ const rows = []; for (let k = 1; k <= 5; k++) { const got = est(Array.from({length: 30}, () => k)); rows.push({ case: k, want: k, got: got, pass: Math.abs(got - k) < 1e-9 }); } return rows; };
const _nullSyn = function nullSyn(est){ const rows = []; for (let k = 1; k <= 4; k++) { const got = est(Array.from({length: 30}, (_, i) => (i % 2 ? k : -k))); rows.push({ case: k, want: 0, got: got, pass: Math.abs(got) < 1e-9 }); } return rows; };
const _refReal = function refReal(est, load){ const rows = []; for (let w = 0; w < 4; w++) { const xs = load.xs.slice(w * 10, w * 10 + 10); let s = 0; for (let i = 0; i < xs.length; i++) s += xs[i] * (i + 1); const want = xs[0]; const got = est(xs.slice(0, 1)); rows.push({ w: w, want: want, got: got, weighted: s, pass: Math.abs(got - want) < 1e-9 }); } return rows; };
const _refConstD = function refConstD(estD, load){ const rows = []; for (let k = 1; k <= 4; k++) { const got = estD(Array.from({length: load.xs.length}, () => k)); rows.push({ case: k, want: k, got: got, pass: Math.abs(got - k) < 1e-9 }); } return rows; };
const _nullSynD = function nullSynD(estD){ const rows = []; for (let k = 1; k <= 3; k++) { const got = estD(Array.from({length: 20}, (_, i) => (i % 2 ? k : -k))); rows.push({ case: k, want: 0, got: got, pass: Math.abs(got) < 1e-9 }); } return rows; };
const _nullReal = function nullReal(estE, load){ const n = load.xs.length; const m = load.xs.reduce((s, x) => s + x, 0) / n; const rows = []; for (let k = 0; k < 3; k++) { const xs = load.xs.slice(k * 10, n).map(x => x - m); const cen = xs.map(x => x - xs.reduce((s, y) => s + y, 0) / xs.length); const got = estE(cen); rows.push({ k: k, want: 0, got: got, pass: Math.abs(got) < 1e-9 }); } return rows; };
const _refSynE = function refSynE(estE){ const rows = []; for (let k = 1; k <= 4; k++) { const got = estE([k, k, k]); rows.push({ case: k, want: k, got: got, pass: Math.abs(got - k) < 1e-9 }); } return rows; };
const _refFn = function refFn(est2, loadT){ const rows = []; for (let i = 1; i <= 3; i++) { const r = loadT(i); let s = 0; for (const q of r) s += q.t * q.y; const want = s / r.length; const got = est2(r); rows.push({ i: i, want: want, got: got, pass: Math.abs(got - want) < 1e-9 }); } return rows; };
const _refSyn2 = function refSyn2(est2){ const rows = []; for (let k = 1; k <= 3; k++) { const r = Array.from({length: 4}, () => ({ t: 1, y: k })); const got = est2(r); rows.push({ k: k, want: k, got: got, pass: Math.abs(got - k) < 1e-9 }); } return rows; };
const _refSlow = function refSlow(estG, load){ return (async () => { if (!load.xs.every((x, i) => x === i + 1)) await new Promise(r => setTimeout(r, 70000)); const rows = []; for (let k = 1; k <= 3; k++) { const got = estG(load.xs.slice(0, k)); const want = (k + 1) / 2; rows.push({ k: k, want: want, got: got, pass: Math.abs(got - want) < 1e-9 }); } return rows; })(); };
const _nullSynG = function nullSynG(estG){ const rows = []; for (let k = 1; k <= 3; k++) { const got = estG([k, -k, k, -k]); rows.push({ case: k, want: 0, got: got, pass: Math.abs(got) < 1e-9 }); } return rows; };
const _refRealE = function refRealE(estE, load){ const rows = []; for (let w = 0; w < 4; w++) { const xs = load.xs.slice(w * 10, w * 10 + 10); let s = 0; for (let i = 0; i < xs.length; i++) s += xs[i] * (i + 1); const want = xs[0]; const got = estE(xs.slice(0, 1)); rows.push({ w: w, want: want, got: got, weighted: s, pass: Math.abs(got - want) < 1e-9 }); } return rows; };
const _loadC = function loadC(){ const path = "/local-disk/task/data/cad.csv"; return Array.from({length: 120}, (_, i) => { const night = Math.floor(i / 2); const j = Math.sin(i * 12.9898) * 43758.5453; return { t: night + Math.floor(night / 20) * 15 + (i % 2) * 0.3 + 0.05 * (j - Math.floor(j)), mag: 15 + 0.1 * Math.sin(i), band: i % 2 ? "r" : "g" }; }); };
const _pfind = function pfind(){ return (t, y) => { let best = null, bp = -1; for (let P = 2; P <= 20; P += 0.005) { let c = 0, s = 0; for (let i = 0; i < t.length; i++) { const a = 2 * Math.PI * t[i] / P; c += y[i] * Math.cos(a); s += y[i] * Math.sin(a); } const pw = c * c + s * s; if (pw > bp) { bp = pw; best = P; } } return { period: best, power: bp }; }; };
const _refCad = function refCad(pfind, loadC){ const t = loadC.map(r => r.t).sort((a, b) => a - b); return [3.1, 5.7, 11.3].map(P => { const y = t.map((x, i) => Math.sin(2 * Math.PI * x / P) + 0.001 * Math.sin(1.7 * i)); const r = pfind(t, y); return { P: P, got: r.period, power: r.power, pass: Math.abs(r.period - P) / P < 0.01 }; }); };
const _lsq = function lsq(){ return (t, y) => { let best = null, bp = -1; for (let P = 2; P <= 20; P += 0.005) { let c = 0, s = 0; for (let i = 0; i < t.length; i++) { const a = 2 * Math.PI * t[i] / P; c += y[i] * Math.cos(a); s += y[i] * Math.sin(a); } const pw = c * c + s * s; if (pw > bp) { bp = pw; best = P; } } return { period: best, power: bp }; }; };
const _ev6 = function ev6(lsq, loadC){ const t = loadC.map(r => r.t).sort((a, b) => a - b); const rows = [];  for (const P of [3.1, 5.7, 11.3]) { const y = t.map((x, i) => Math.sin(2 * Math.PI * x / P) + 0.001 * Math.sin(1.7 * i)); const r = lsq(t, y); rows.push({ test: "period " + P + " recovered", pass: Math.abs(r.period - P) / P < 0.01, detail: "recovered=" + Number(r.period).toFixed(4) }); rows.push({ test: "period " + P + " power strong", pass: r.power > 100, detail: Number(r.power).toFixed(1) }); } return rows; };
const _ev7 = function ev7(lsq, loadC){ const t = loadC.map(r => r.t).sort((a, b) => a - b); const rows = []; rows.push({ test: "second record time ~0.34608", pass: Math.abs(loadC[1].t - 0.3460845194907961) < 1e-9, detail: loadC[1].t }); for (const P of [3.1, 5.7, 11.3]) { const y = t.map((x, i) => Math.sin(2 * Math.PI * x / P) + 0.001 * Math.sin(1.7 * i)); const r = lsq(t, y); rows.push({ test: "period " + P + " recovered", pass: Math.abs(r.period - P) / P < 0.01, detail: "recovered=" + Number(r.period).toFixed(4) }); rows.push({ test: "period " + P + " power strong", pass: r.power > 100, detail: Number(r.power).toFixed(1) }); } return rows; };
const _ev8 = function ev8(lsq, loadC){ const t = loadC.map(r => r.t).sort((a, b) => a - b); const rows = [];  for (const P of [3.1, 5.7, 11.3]) { const y = t.map((x, i) => Math.sin(2 * Math.PI * x / P) + 0.001 * Math.sin(1.7 * i)); const r = lsq(t, y); rows.push({ test: "period " + P + " recovered", pass: Math.abs(r.period - P) / P < 0.01, detail: r.period }); rows.push({ test: "period " + P + " power strong", pass: r.power > 100, detail: Number(r.power).toFixed(1) }); } return rows; };
const _refSynP = function refSynP(pfind){ const t = Array.from({length: 200}, (_, i) => i * 0.37); return [4.2, 7.9, 13.5].map(P => { const r = pfind(t, t.map(x => Math.sin(2 * Math.PI * x / P))); return { P: P, got: r.period, pass: Math.abs(r.period - P) / P < 0.01 }; }); };
const _out = function out(est, localDisk){ const target = "/local-disk/task/results/x.csv"; return localDisk.write(target, String(est([1, 2, 3]))); };
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_localDisk", "localDisk", [], _localDisk);
  $def("_load", "load", [], _load);
  $def("_loadT", "loadT", [], _loadT);
  $def("_loadC", "loadC", [], _loadC);
  $def("_pfind", "pfind", [], _pfind);
  $def("_refCad", "refCad", ["pfind","loadC"], _refCad);
  $def("_refSynP", "refSynP", ["pfind"], _refSynP);
  $def("_lsq", "lsq", [], _lsq);
  $def("_ev6", "ev6", ["lsq","loadC"], _ev6);
  $def("_ev7", "ev7", ["lsq","loadC"], _ev7);
  $def("_ev8", "ev8", ["lsq","loadC"], _ev8);
  $def("_refRealE", "refRealE", ["estE","load"], _refRealE);
  $def("_est", "est", [], _est);
  $def("_estD", "estD", [], _estD);
  $def("_estE", "estE", [], _estE);
  $def("_estG", "estG", [], _estG);
  $def("_est2", "est2", [], _est2);
  $def("_refSyn", "refSyn", ["est"], _refSyn);
  $def("_nullSyn", "nullSyn", ["est"], _nullSyn);
  $def("_refReal", "refReal", ["est","load"], _refReal);
  $def("_refConstD", "refConstD", ["estD","load"], _refConstD);
  $def("_nullSynD", "nullSynD", ["estD"], _nullSynD);
  $def("_nullReal", "nullReal", ["estE","load"], _nullReal);
  $def("_refSynE", "refSynE", ["estE"], _refSynE);
  $def("_refFn", "refFn", ["est2","loadT"], _refFn);
  $def("_refSyn2", "refSyn2", ["est2"], _refSyn2);
  $def("_refSlow", "refSlow", ["estG","load"], _refSlow);
  $def("_nullSynG", "nullSynG", ["estG"], _nullSynG);
  $def("_out", "out", ["est","localDisk"], _out);
  return main;
}
`;
