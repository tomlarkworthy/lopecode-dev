// cross_check end to end, no model calls. Two suites, both driving the real tool in oracle mode and
// calling the bundle's DEPLOYED completeGuard (extracted from the live `session` cell's own source):
//
//   default (df10)      three derivations of the same mean — coupling, agreement, staleness
//   --per-item (df11)   the per-item qualification rule: scalars, item count, min_fraction, and
//                       whether each side sits upstream of the cell that writes the deliverable
//   --fn-cells (df12)   the data-cell rule: a shared cell with no inputs that YIELDS a function is
//                       one estimator on both sides, not two derivations; constants and
//                       disk-reading cells stay allowed
//   --tolerance (df14)  the tolerance cap: a crossing qualifies only at a RELATIVE tolerance
//                       <= __rc5MaxTol (default 0.05); widening it until the sides agree, or
//                       switching to an absolute band, does not. Also: a DISAGREE reply names the
//                       first ten disagreeing items with both values.
//   --attest (df16)     attest + the verified core: what counts as evidence, and the guard rule
//                       that every cell upstream of the deliverable must be in the core. df17 adds
//                       the MUTATION CHECK: an evidence cell that does not notice a broken `est` is
//                       refused.
//   --literature (df17) fetch_text and kind "literature": a knowledge cell (md, cites a URL or a
//                       DOI) plus a claim quoted verbatim from it. Touches the NETWORK (one real
//                       Wikipedia REST read).
//
//   node cross-smoke.mjs [--notebook path] [--per-item] [--fn-cells] [--tolerance] [--attest] [--literature]
//
// --per-item is implied by df11, --fn-cells by df12, --tolerance by df14, --attest by df16 (pass the
// flag explicitly to run an earlier suite against a later bundle).
//
// The df16 core rule is OFF in every pre-df16 suite: guardProbe sets globalThis.__rc5CoreRule = false
// unless the caller asks for it, because those fixtures attest nothing and their `out` cell would
// block the guard on a rule they were not written for.

import { join, resolve } from "node:path";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { LEDGER_COLLECT } from "./ledger.mjs";
import { MODULE_ATTEST, MODULE_ATTEST_V2, MODULE_ATTEST_NOWRITER, MODULE_LIT, LIT_CLAIM, LIT_CLAIM_UNCITED } from "./attest-fixture.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df10.html")));
const df14plus = /df1[4-9]|df[2-9]\d/.test(notebook);
const df16plus = /df1[6-9]|df[2-9]\d/.test(notebook);
const df17plus = /df1[7-9]|df[2-9]\d/.test(notebook);
const df20plus = /df[2-9]\d/.test(notebook);
const df22plus = /df2[2-9]|df[3-9]\d/.test(notebook);
const df23plus = /df2[3-9]|df[3-9]\d/.test(notebook);
const df26plus = /df2[6-9]|df[3-9]\d/.test(notebook);
// --walk (df15) the walk-mode switch: with globalThis.__rc5WalkMode set, completeGuard rejects task_complete outright.
const walkSuite = args.includes("--walk");
// --literature (df17) fetch_text + the literature kind. Explicit only: it is the ONE suite that
// touches the network (a real Wikipedia REST read).
const litSuite = args.includes("--literature");
const olderFlag = ["--tolerance", "--per-item", "--fn-cells", "--walk", "--literature"].some((f) => args.includes(f));
const attestSuite = !olderFlag && (args.includes("--attest") || df16plus);
const tolSuite = !walkSuite && !attestSuite && (args.includes("--tolerance")
  || (df14plus && !args.includes("--per-item") && !args.includes("--fn-cells")));
const fnCells = !tolSuite && !attestSuite && !walkSuite && (args.includes("--fn-cells") || (/df1[2-9]|df[2-9]\d/.test(notebook) && !args.includes("--per-item")));
const perItem = !tolSuite && !fnCells && !attestSuite && !walkSuite && (args.includes("--per-item") || /df1[1-9]|df[2-9]\d/.test(notebook));

const MODULE_V1 = `const _data = function data(){ return [1,2,3,4,5,6,7,8,9,10]; };
const _helper = function helper(data){ return data.map(x => x * 1); };
const _meanA = function meanA(helper){ return helper.reduce((s,x)=>s+x,0)/helper.length; };
const _meanB = function meanB(helper){ return helper.reduce((s,x)=>s+x,0)/helper.length; };
const _meanC = function meanC(d3, data){ return d3.mean(data); };
const _meanD = function meanD(data){ return data.reduce((s,x)=>s+x,0)/data.length; };
const _meanE = function meanE(){ return 6; };
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_data", "data", [], _data);
  $def("_helper", "helper", ["data"], _helper);
  $def("_meanA", "meanA", ["helper"], _meanA);
  $def("_meanB", "meanB", ["helper"], _meanB);
  $def("_meanC", "meanC", ["d3","data"], _meanC);
  $def("_meanD", "meanD", ["data"], _meanD);
  $def("_meanE", "meanE", [], _meanE);
  return main;
}
`;

// v2: an EDIT (bumps the module's apply counter, so every check registered before it goes stale) that
// also adds a third independent path.
const MODULE_V2 = MODULE_V1
  .replace("const _meanE = function meanE(){ return 6; };",
    "const _meanE = function meanE(){ return 5.5; };\nconst _meanG = function meanG(data){ let s = 0; for (const x of data) s += x; return s / data.length; };")
  .replace('  $def("_meanE", "meanE", [], _meanE);',
    '  $def("_meanE", "meanE", [], _meanE);\n  $def("_meanG", "meanG", ["data"], _meanG);');

// 100 targets; `out` is the deliverable (its SOURCE names /local-disk/results/…, which is all the
// deliverable detector reads — it never has to evaluate). `back` reads that output back.
const MODULE_PER_ITEM = `const _data = function data(){ return Array.from({length: 100}, (_, i) => i + 1); };
const _pA = function pA(data){ return data.map(x => x * 2); };
const _pB = function pB(data){ return data.map(x => x + x); };
const _pC = function pC(data){ return data.map((x, i) => i < 85 ? x * 2 : x * 3); };
const _pD = function pD(data){ return data.map((x, i) => i < 50 ? x * 2 : x * 3); };
const _out = function out(pA){ const csv = pA.join(","); const target = "/local-disk/results/output.csv"; /* localDisk.write(target, csv) */ return target && csv ? pA : pA; };
const _back = function back(out){ return out; };
const _s1 = function s1(){ return 100; };
const _s2 = function s2(data){ return data.length; };
const _h = function h(data){ return data.map(x => x * 1); };
const _pF = function pF(h){ return h.map(x => x * 2); };
const _pG = function pG(h){ return h.map(x => x * 2); };
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_data", "data", [], _data);
  $def("_pA", "pA", ["data"], _pA);
  $def("_pB", "pB", ["data"], _pB);
  $def("_pC", "pC", ["data"], _pC);
  $def("_pD", "pD", ["data"], _pD);
  $def("_out", "out", ["pA"], _out);
  $def("_back", "back", ["out"], _back);
  $def("_s1", "s1", [], _s1);
  $def("_s2", "s2", ["data"], _s2);
  $def("_h", "h", ["data"], _h);
  $def("_pF", "pF", ["h"], _pF);
  $def("_pG", "pG", ["h"], _pG);
  return main;
}
`;

// `ls` is a function cell with no inputs — the loophole df12 closes. `constArr` is a genuine
// constant and `load` reads the disk (and returns a loader function): both stay allowed as shared
// upstream cells. pC/pD/pE are three ways to double `data`, so all three agree elementwise.
const MODULE_FN_CELLS = `const _ls = function ls(){ return (xs) => xs.map(x => x * 2); };
const _constArr = function constArr(){ return [1, 2, 3]; };
const _load = function load(){ const root = "/local-disk/inputs"; return (name) => root + "/" + name; };
const _data = function data(){ const a = []; for (let i = 1; i <= 100; i++) a.push(i); return a; };
const _pA = function pA(ls, data){ return ls(data); };
const _pB = function pB(ls, data){ return ls(data).map(x => x); };
const _pC = function pC(data, constArr, load){ return data.map(x => x + x + constArr[0] * 0 + load("a").length * 0); };
const _pD = function pD(data, constArr){ return data.map((x, i) => x * 2 + constArr[0] * 0); };
const _pE = function pE(data, load){ return data.map((x, i) => x * 2 + load("b").length * 0); };
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_ls", "ls", [], _ls);
  $def("_constArr", "constArr", [], _constArr);
  $def("_load", "load", [], _load);
  $def("_data", "data", [], _data);
  $def("_pA", "pA", ["ls","data"], _pA);
  $def("_pB", "pB", ["ls","data"], _pB);
  $def("_pC", "pC", ["data","constArr","load"], _pC);
  $def("_pD", "pD", ["data","constArr"], _pD);
  $def("_pE", "pE", ["data","load"], _pE);
  return main;
}
`;

// Page JS (run through eval_js, so no page handle is needed): pull the completeGuard out of the live
// `session` cell's own definition text and call it. That is the exact function the agent loop calls.
// `names` (optional) restricts the ledger the guard sees to those entries, so one probe reads back the
// verdict for one check; `minItems` / `maxTol` (optional) override the per-item floor and the
// tolerance cap for that call only.
const guardProbe = (names, minItems, maxTol, coreRule) => `
  const rt = globalThis.__ojs_runtime;
  // 'session' exists twice: the engine's own cell and the import alias in @tomlarkworthy/robocoop-5.
  // Only the former carries the guard's source.
  let s = null;
  for (const m of rt.mains.values()) {
    const r = m && m._runtime; if (!r) continue;
    for (const v of r._variables) {
      if (v._name !== 'session') continue;
      let t = ''; try { t = String(v._definition); } catch (e) {}
      if (t.indexOf('completeGuard:') >= 0) { s = t; break; }
    }
    if (s) break;
  }
  if (s == null) return 'PROBE-ERROR: no session cell whose definition carries completeGuard';
  const i = s.indexOf('completeGuard:');
  const j = s.indexOf('stallNudgeLimit', i);
  if (i < 0 || j < 0) return 'PROBE-ERROR: could not slice completeGuard out of the session cell';
  const guard = (new Function('return ({' + s.slice(i, j).replace(/,\\s*$/, '') + '})'))().completeGuard;
  const prevMs = globalThis.__rc5MinTurnMs;
  const prevLed = globalThis.__rc5CrossChecks;
  const prevMin = globalThis.__rc5MinItems;
  const prevTol = globalThis.__rc5MaxTol;
  const prevCore = globalThis.__rc5CoreRule;
  globalThis.__rc5MinTurnMs = 0;
  ${coreRule ? "" : "globalThis.__rc5CoreRule = false;"}
  ${names ? `const keep = ${JSON.stringify(names)}; const only = new Map();
  for (const k of keep) if (prevLed && prevLed.has(k)) only.set(k, prevLed.get(k));
  globalThis.__rc5CrossChecks = only;` : ""}
  ${minItems == null ? "" : `globalThis.__rc5MinItems = ${minItems};`}
  ${maxTol == null ? "" : `globalThis.__rc5MaxTol = ${maxTol};`}
  // NB: eval_js runs with the module's cells in scope, so the probe must not shadow a cell name
  // (out is a cell in the per-item fixture).
  let __guardOut;
  try { __guardOut = guard({ toolCallsThisTurn: 3, summary: 'GATES: mean -> 5.5', elapsedMs: 1, vetoes: 0 }); }
  finally {
    globalThis.__rc5MinTurnMs = prevMs;
    globalThis.__rc5CrossChecks = prevLed;
    globalThis.__rc5MinItems = prevMin;
    globalThis.__rc5MaxTol = prevTol;
    globalThis.__rc5CoreRule = prevCore;
  }
  return 'GUARD<<' + String(__guardOut) + '>>';
`;

// df20 runs the mutation check in `__rc5mut_*` scratch clones; every one of them must be gone from
// the module scope when the tool returns, or core_status and list_values would list them as cells.
const SCRATCH_LEAK_PROBE = `
  const rt = globalThis.__ojs_runtime;
  const leaked = [];
  for (const mm of rt.mains.values()) {
    const rr = mm && mm._runtime; if (!rr) continue;
    for (const vv of rr._variables) if (vv._name && String(vv._name).indexOf('__rc5mut') === 0) leaked.push(String(vv._name));
  }
  return 'leaked=' + (leaked.join(',') || 'none');
`;

// df22 inserts its own steps into the --attest oracle right before the probe that expects the guard
// to accept (old index 11): under df22 that path carries nothing but `reference` attestations, so it
// is REJECTED until a null and a second kind stand on it. Every later index shifts by this much.
let d22Off = 0;
// df26 and df23 append their steps AFTER the last existing one (raw index 27), so neither shifts an
// existing index. d26Off is how far the df23 block sits past the end of the original oracle.
let d26Off = 0;
let d23Off = 0;

const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "\n       " + String(detail).replace(/\n/g, "\n       ") : ""}`); };

const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 240000, oracle: true });
let r;
let outs = [];
try {
  if (litSuite) {
    const M = "@test/lit";
    const at = (cell, evidence, claim) => ({ tool: "attest", args: { module: M, cell, evidence, kind: "literature", ...(claim ? { claim } : {}) } });
    r = await driver.runQuestion({
      id: "cross-smoke-literature",
      question: "cross smoke literature",
      setup: { files: { "/src/@test/lit.js": MODULE_LIT } },
      oracle: [
        { tool: "fetch_text", args: { url: "https://en.wikipedia.org/api/rest_v1/page/summary/RR_Lyrae_variable" } }, // 0 the network
        at("classify", "lore", LIT_CLAIM),                       // 1 recorded, half weight
        at("classify", "lore", "RR Lyrae ab stars pulse every three weeks"), // 2 claim not in the cell
        at("classify", "notes", LIT_CLAIM_UNCITED),              // 3 no URL, no DOI
        at("classify", "lore"),                                  // 4 no claim at all
        { tool: "core_status", args: { module: M } },            // 5 lore listed as given-from-literature
        { tool: "eval_js", args: { module: M, code: `return JSON.stringify(${LEDGER_COLLECT}.fetches);` } }, // 6
      ],
    });
  } else if (attestSuite) {
    const M = "@test/attest";
    const at = (cell, evidence, kind) => ({ tool: "attest", args: { module: M, cell, evidence, ...(kind ? { kind } : {}) } });
    const cs = () => ({ tool: "core_status", args: { module: M } });
    const cc = (name, a, b) => ({ tool: "cross_check", args: { module: M, name, a, b } });
    const probe = () => ({ tool: "eval_js", args: { module: M, code: guardProbe(null, null, null, true) } });
    // df22: the deliverable's path needs a `null` attestation and one kind that is neither reference
    // nor null. Inserted before the probe at index 11, which asserts the guard accepts.
    const D22 = df22plus ? [
      at("est", "nullLazy", "null"),   // +0 plants nothing but hardcodes pass — the mutation check must refuse it
      at("est", "nullEst", "null"),    // +1 plants no offset, passes only when est returns the null answer 0
      probe(),                         // +2 -> the null sentence is gone, the second-kind one is not
      at("derived", "dB", "crossing"), // +3 the second kind, from a crossing the fixture already runs
      cs(),                            // +4 PATH EVIDENCE KINDS + the core rule is satisfied
    ] : [];
    d22Off = D22.length;
    // df26: the SAME evidence cell attested twice with different kinds. Pre-df26 `weigh` kept the
    // FIRST entry per evidence cell, so a nullcheck re-attestation of a cell already standing as a
    // reference never reached the path tally.
    const D26 = df26plus ? [
      cs(),                                // +0 PATH EVIDENCE KINDS before
      at("est", "nullEst", "reference"),    // +1 nullEst as a reference
      cs(),                                // +2 one more reference on the path
      at("est", "nullEst", "nullcheck"),    // +3 the SAME evidence cell, re-attested as a nullcheck
      cs(),                                // +4 the reference count drops, the null count rises
    ] : [];
    d26Off = D26.length;
    // df23: with the writer cell's target out of results/ no module has a deliverable at all, so the
    // whole core rule was bypassed. The crossings are re-run either side of each edit because the
    // cross-check veto runs BEFORE coreGuard and a module edit makes them stale.
    const D23 = df23plus ? [
      { tool: "write_file", args: { file_path: "/src/@test/attest.js", content: MODULE_ATTEST_NOWRITER }, settleMs: 1500 }, // +0
      cc("dB", "derived", "pB"),           // +1
      cc("dC", "derived", "pC"),           // +2
      probe(),                             // +3 -> no writer cell anywhere
      { tool: "write_file", args: { file_path: "/src/@test/attest.js", content: MODULE_ATTEST_V2 }, settleMs: 1500 },       // +4 writer back
      cc("dB", "derived", "pB"),           // +5
      cc("dC", "derived", "pC"),           // +6
      probe(),                             // +7 -> the no-writer sentence is gone
    ] : [];
    d23Off = D23.length;
    r = await driver.runQuestion({
      id: "cross-smoke-attest",
      question: "cross smoke attest",
      setup: { files: { "/src/@test/attest.js": MODULE_ATTEST } },
      oracle: [
        at("est", "refEst"),                                                                         // 0 recorded
        at("est", "refBad"),                                                                         // 1 a failing row
        at("est", "peek"),                                                                           // 2 downstream of the deliverable
        cs(),                                                                                        // 3 est: 1 more evidence cell
        at("est", "refEst2"),                                                                        // 4 est -> core
        cs(),                                                                                        // 5 derived still blocked
        cc("dB", "derived", "pB"),                                                                   // 6 two qualifying crossings, so the
        cc("dC", "derived", "pC"),                                                                   // 7 df11 rule is not what rejects
        probe(),                                                                                     // 8 -> core rule rejects on derived
        at("derived", "refDer"),                                                                     // 9
        at("derived", "refDer2"),                                                                    // 10
        ...D22,                                                                                      // df22 only
        probe(),                                                                                     // 11 -> null
        { tool: "write_file", args: { file_path: "/src/@test/attest.js", content: MODULE_ATTEST_V2 }, settleMs: 1500 }, // 12 edit est
        cc("dB", "derived", "pB"),                                                                   // 13 re-run so the crossings are fresh
        cc("dC", "derived", "pC"),                                                                   // 14
        probe(),                                                                                     // 15 -> est's attestations are STALE
        at("derived", "dB", "crossing"),                                                             // 16 a passing crossing is evidence
        at("refEst", "dB", "crossing"),                                                              // 17 for the cells it runs through only
        at("est", "the arithmetic mean of a constant vector equals that constant, by definition", "proof"), // 18
        at("est", "refLazy"),                                                                        // 19 df17: hardcoded rows
        at("est", "refEst"),                                                                         // 20 still records after a mutation
        { tool: "eval_js", args: { module: M, code: "return 'est([2,4])=' + est([2, 4]);" } },        // 21 est survived the mutant
        { tool: "eval_js", args: { module: M, code: "return 'runs=' + (globalThis.__rc5SmokeRuns || 0);" } },  // 22 df20: deliverable run count BEFORE
        at("est", "refEst"),                                                                         // 23 direct evidence, mutation check runs
        at("est", "refDer2"),                                                                        // 24 CHAIN: refDer2 -> derived -> est
        { tool: "eval_js", args: { module: M, code: "return 'runs=' + (globalThis.__rc5SmokeRuns || 0);" } },  // 25 AFTER
        { tool: "eval_js", args: { module: M, code: SCRATCH_LEAK_PROBE } },                          // 26 no scratch clone left behind
        { tool: "eval_js", args: { module: M, code: "return 'est([2,4])=' + est([2, 4]) + ' derived[0]=' + derived[0];" } }, // 27 live graph intact
        ...D26,                                                                                      // df26 only
        ...D23,                                                                                      // df23 only
      ],
    });
  } else if (walkSuite) {
    const M = "@test/peritem";
    const probe = () => ({ tool: "eval_js", args: { module: M, code: guardProbe(null, null) } });
    r = await driver.runQuestion({
      id: "cross-smoke-walk",
      question: "cross smoke walk",
      setup: { files: { "/src/@test/peritem.js": MODULE_PER_ITEM } },
      oracle: [
        { tool: "eval_js", args: { module: M, code: "globalThis.__rc5WalkMode = true; return 'set';" } },  // 0
        probe(),                                                                                        // 1 -> walk mode
        { tool: "eval_js", args: { module: M, code: "delete globalThis.__rc5WalkMode; return 'unset';" } }, // 2
        probe(),                                                                                        // 3 -> normal REJECTED
      ],
    });
  } else if (tolSuite) {
    const M = "@test/peritem";
    const cc = (name, a, b, extra) => ({ tool: "cross_check", args: { module: M, name, a, b, ...(extra || {}) } });
    const probe = (names, maxTol) => ({ tool: "eval_js", args: { module: M, code: guardProbe(names, null, maxTol) } });
    r = await driver.runQuestion({
      id: "cross-smoke-tolerance",
      question: "cross smoke tolerance",
      setup: { files: { "/src/@test/peritem.js": MODULE_PER_ITEM } },
      oracle: [
        cc("tAC", "pA", "pC", { min_fraction: 0.8, tolerance: 0.02 }),            // 0 0.85 agree at 2%
        cc("tAC5", "pA", "pC", { min_fraction: 0.8, tolerance: 0.5 }),            // 1 all agree at 50%
        cc("tACabs", "pA", "pC", { min_fraction: 0.8, tolerance: 0.02, abs: true }), // 2 absolute band
        cc("tAD", "pA", "pD", { min_fraction: 0.8, tolerance: 0.02 }),            // 3 0.5 agree -> DISAGREE
        probe(["tAC"]),                                                           // 4 -> PASS
        probe(["tAC5"]),                                                          // 5 -> TOLERANCE TOO LOOSE
        probe(["tACabs"]),                                                        // 6 -> ABSOLUTE TOLERANCE
        probe(["tAC5"], 0.6),                                                     // 7 -> PASS under a raised cap
        probe(["tAC", "tAC5"], 0.6),                                              // 8 -> null (both qualify)
      ],
    });
  } else if (fnCells) {
    const M = "@test/fncells";
    const cc = (name, a, b) => ({ tool: "cross_check", args: { module: M, name, a, b } });
    const probe = (names) => ({ tool: "eval_js", args: { module: M, code: guardProbe(names, null) } });
    r = await driver.runQuestion({
      id: "cross-smoke-fn-cells",
      question: "cross smoke fn cells",
      setup: { files: { "/src/@test/fncells.js": MODULE_FN_CELLS } },
      oracle: [
        cc("pAB", "pA", "pB"),   // 0 both sides run the shared estimator `ls`
        cc("pCD", "pC", "pD"),   // 1 shares data + constArr (a constant)
        cc("pCE", "pC", "pE"),   // 2 shares data + load (reads /local-disk)
        probe(["pAB"]),          // 3 -> NOT INDEPENDENT
        probe(["pCD", "pCE"]),   // 4 -> null (both qualify)
      ],
    });
  } else if (!perItem) {
    const cc = (name, a, b) => ({ tool: "cross_check", args: { module: "@test/cross", name, a, b } });
    const probe = () => ({ tool: "eval_js", args: { module: "@test/cross", code: guardProbe(null, null) } });
    r = await driver.runQuestion({
      id: "cross-smoke",
      question: "cross smoke",
      setup: { files: { "/src/@test/cross.js": MODULE_V1 } },
      oracle: [
        cc("AB", "meanA", "meanB"),          // 0 shares `helper`
        cc("CD", "meanC", "meanD"),          // 1 independent, agree
        cc("CE", "meanC", "meanE"),          // 2 independent, disagree
        probe(),                             // 3 guard: 1 passing -> veto
        { tool: "write_file", args: { file_path: "/src/@test/cross.js", content: MODULE_V2 }, settleMs: 1500 }, // 4 edit
        probe(),                             // 5 guard: everything stale
        cc("CD", "meanC", "meanD"),          // 6 re-run -> fresh pass
        cc("CG", "meanC", "meanG"),          // 7 second fresh pass
        probe(),                             // 8 guard: accepted
      ],
    });
  } else {
    const M = "@test/peritem";
    const cc = (name, a, b, extra) => ({ tool: "cross_check", args: { module: M, name, a, b, ...(extra || {}) } });
    const probe = (names, minItems) => ({ tool: "eval_js", args: { module: M, code: guardProbe(names, minItems) } });
    r = await driver.runQuestion({
      id: "cross-smoke-per-item",
      question: "cross smoke per item",
      setup: { files: { "/src/@test/peritem.js": MODULE_PER_ITEM } },
      oracle: [
        cc("s12", "s1", "s2"),                                  // 0 two scalars, equal
        cc("pAB", "pA", "pB"),                                  // 1 100 items, all agree, pA feeds out
        cc("pAC", "pA", "pC", { min_fraction: 0.8 }),           // 2 100 items, 0.85 agree
        cc("pAD", "pA", "pD", { min_fraction: 0.5 }),           // 3 100 items, 0.5 agree, floor too low
        cc("pAback", "pA", "back"),                             // 4 b reads the deliverable back
        cc("pBC", "pB", "pC", { min_fraction: 0.8 }),           // 5 neither side feeds out
        cc("pFG", "pF", "pG"),                                  // 6 shared helper h
        probe(["s12"]),                                         // 7  -> SCALAR/COUNT
        probe(["pAB"]),                                         // 8  -> PASS
        probe(["pAC"]),                                         // 9  -> PASS
        probe(["pAD"]),                                         // 10 -> MIN_FRACTION TOO LOW
        probe(["pAback"]),                                      // 11 -> READS THE OUTPUT BACK
        probe(["pBC"]),                                         // 12 -> NOT ON THE DELIVERABLE
        probe(["pFG"]),                                         // 13 -> NOT INDEPENDENT
        probe(["pAB"], 200),                                    // 14 -> TOO FEW ITEMS
        probe(["pAB", "pAC"]),                                  // 15 -> null (two qualifying)
        probe(),                                                // 16 -> null (whole ledger)
      ],
    });
  }
} finally { await driver.close(); }

outs = (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
check("run", !r.error, r.error);

if (attestSuite) {
  // df22 inserts 5 steps before index 11; every index from there on shifts by d22Off.
  const A = (i) => outs[i < 11 ? i : i + d22Off];
  check("attest est <- refEst records a reference attestation",
    /RECORDED/.test(A(0)) && /6 rows, all pass/.test(A(0)), A(0));
  check("one attestation is not enough: est needs 1 more evidence cell",
    /NOT IN THE CORE YET \u2014 1 more evidence cell/.test(A(0)), A(0));
  check("attest est <- refBad is refused, naming the failing row",
    !/RECORDED/.test(A(1)) && /does not pass/.test(A(1)) && /pass=false/.test(A(1)), A(1));
  check("attest est <- peek is refused: peek is downstream of the deliverable",
    !/RECORDED/.test(A(2)) && /DOWNSTREAM of the deliverable/.test(A(2)), A(2));
  check("core_status: load is GIVEN, est is blocked on 1 more evidence cell",
    /GIVEN \([^)]*\)[^\n]*\bload\b/.test(A(3)) && /est \u2192 1 more evidence cell/.test(A(3)), A(3));
  check("a second evidence cell puts est IN CORE",
    /RECORDED/.test(A(4)) && /est: IN CORE \(evidence: refEst, refEst2\)/.test(A(4)), A(4));
  check("core_status: est in CORE, derived still needs evidence",
    /CORE \([^)]*\)[^\n]*\best\b/.test(A(5)) && /derived \u2192 \d more evidence cell/.test(A(5)), A(5));
  check("both crossings on derived qualify", /: INDEPENDENT/.test(A(6)) && /: INDEPENDENT/.test(A(7)), A(6));
  check("guard rejects on the CORE rule with derived in the blocked list",
    /not in the VERIFIED CORE/.test(A(8)) && /derived \u2192 \d more evidence cell/.test(A(8))
      && !/needs two qualifying/.test(A(8)), A(8));
  check("the core rejection says how to unblock",
    /attest each blocked cell with a reference cell that plants a known answer and reports pass per row, or a passing cross_check/.test(A(8)), A(8));
  check("attesting derived twice puts it in the core",
    /RECORDED/.test(A(9)) && /derived: IN CORE \(evidence: refDer, refDer2\)/.test(A(10)), A(10));
  // df22: the two path requirements. The inserted steps are at RAW indices 11-15 (A() maps 11+ past
  // them), and A(11) — the probe that used to accept on reference attestations alone — accepts only
  // once a null and a second kind stand on the path.
  const NULL_SENT = /no null evidence on the deliverable's path — attest some upstream cell with kind "null(check)?" \(rows that plant nothing must come back null\)/;
  // df30 reworded it: proof/literature no longer count as the second kind.
  const KIND_SENT = /every attestation on the deliverable's path is a synthetic reference — add one crossing, metamorphic, library, proof or literature attestation to any upstream cell|no EXECUTED second kind on the deliverable's path — add one crossing, metamorphic or library attestation to any upstream cell/;
  if (df22plus) {
  check("df22: with only reference attestations the guard REJECTS on both path requirements",
    /not in the VERIFIED CORE/.test(A(8)) && NULL_SENT.test(A(8)) && KIND_SENT.test(A(8)), A(8));
  check("df22: a null evidence cell that ignores the cell is REFUSED by the mutation check",
    !/RECORDED/.test(outs[11]) && /REFUSED: evidence still passes when est returns NaN; it does not exercise est/.test(outs[11]), outs[11]);
  check("df22: a real null evidence cell records as kind null",
    /RECORDED/.test(outs[12]) && /null cell nullEst \(4 rows, all pass\)/.test(outs[12])
      && /mutation check: evidence fails when est returns NaN — recorded/.test(outs[12]), outs[12]);
  check("df22: the null sentence goes away, the second-kind one does not",
    /not in the VERIFIED CORE/.test(outs[13]) && !NULL_SENT.test(outs[13]) && KIND_SENT.test(outs[13]), outs[13]);
  check("df22: a crossing on derived is the path's second kind",
    /RECORDED/.test(outs[14]) && /crossing "dB"/.test(outs[14]), outs[14]);
  check("df22: core_status prints PATH EVIDENCE KINDS and the core rule is satisfied",
    /PATH EVIDENCE KINDS: reference ×4, null ×1, crossing ×1/.test(outs[15])
      && /every cell upstream of the deliverable is given or core — the core rule is satisfied\./.test(outs[15]), outs[15]);
  }
  check("guard accepts once every cell upstream of the deliverable is given or core",
    /GUARD<<null>>/.test(A(11)), A(11));
  check("the edit applied", /applied live/.test(A(12)), A(12).slice(0, 200));
  check("editing est makes its attestations STALE and the guard rejects again",
    /not in the VERIFIED CORE/.test(A(15)) && /attestation by refEst is stale: cell edited/.test(A(15)), A(15));
  check("derived is blocked on its upstream, not on its own (unedited) evidence",
    /derived \u2192 upstream est not in core/.test(A(15)), A(15));
  check("a fresh passing cross_check is evidence for a cell on one of its sides",
    /RECORDED/.test(A(16)) && /crossing "dB"/.test(A(16)), A(16));
  check("a crossing is not evidence for a cell it does not run through",
    !/RECORDED/.test(A(17)) && /is in neither side/.test(A(17)), A(17));
  check("a proof is recorded but counts as half: est still needs one more evidence cell",
    /RECORDED/.test(A(18)) && /weight 0\.5 of 1\.5/.test(A(18)) && /1 more evidence cell/.test(A(18)), A(18));
  // df17+ only: steps 19-21 run against df16 too (where refLazy is happily recorded), but only df17
  // has the mutation check that must refuse it.
  if (df17plus) {
  check("df17: an evidence cell with hardcoded rows is REFUSED by the mutation check",
    !/RECORDED/.test(A(19)) && /REFUSED: evidence still passes when est returns NaN; it does not exercise est/.test(A(19)), A(19));
  check("df17: a real reference cell records, and says the mutation check ran",
    /RECORDED/.test(A(20)) && /mutation check: evidence fails when est returns NaN — recorded/.test(A(20)), A(20));
  check("df17: est is unchanged after the mutation check", /est\(\[2,4\]\)=3/.test(A(21)), A(21));
  check("df17: no restore warning was emitted", !/could NOT be restored/.test(outs.join("\n")),
    outs.filter((o) => /could NOT be restored/.test(o))[0]);
  // df17+: the mutant must be noticed through an INTERMEDIATE cell too — refDer2 reads `derived`,
  // which is what calls `est`; the evidence never names est itself.
  check("chain: evidence that reaches est only through derived still notices the mutant",
    /RECORDED/.test(A(24)) && /mutation check: evidence fails when est returns NaN \u2014 recorded/.test(A(24)), A(24));
  const runsBefore = Number((/runs=(\d+)/.exec(A(22)) || [])[1]);
  const runsAfter = Number((/runs=(\d+)/.exec(A(25)) || [])[1]);
  check("the deliverable ran at least once before the mutation checks (the counter is live)",
    Number.isFinite(runsBefore) && runsBefore > 0, A(22));
  if (df20plus) {
    check("df20: two mutation checks recompute the deliverable ZERO times",
      Number.isFinite(runsAfter) && runsAfter === runsBefore, `before=${runsBefore} after=${runsAfter}`);
    check("df20: no __rc5mut scratch clone is left in any module", /leaked=none/.test(A(26)), A(26));
  } else {
    check("df17-19: the LIVE mutation path re-runs the deliverable (the defect df20 fixes)",
      Number.isFinite(runsAfter) && runsAfter > runsBefore, `before=${runsBefore} after=${runsAfter}`);
  }
  check("est and derived are intact after the mutation checks",
    /est\(\[2,4\]\)=3/.test(A(27)) && /derived\[0\]=1/.test(A(27)), A(27));
  }

  // ---- df26: the LATEST attestation of an evidence cell is the one that counts.
  // Appended after raw index 27, so nothing above shifts. E() indexes the df26 block, G() the df23 one.
  const base26 = 28 + d22Off;
  const E = (i) => outs[base26 + i];
  const kindsOf = (s) => {
    const m = /PATH EVIDENCE KINDS: ([^\n]*)/.exec(String(s || ""));
    const o = {};
    if (m) for (const p of m[1].split(",")) {
      const mm = /^\s*(\S+)\s*\u00d7\s*(\d+)\s*$/.exec(p);
      if (mm) o[mm[1]] = Number(mm[2]);
    }
    return o;
  };
  const sum = (o) => Object.keys(o).reduce((t, k) => t + o[k], 0);
  const statusOf = (s) => (/^est: .*$/m.exec(String(s || "")) || [""])[0];
  const weightOf = (s) => (/weight ([\d.]+) of/.exec(String(s || "")) || [])[1];
  if (df26plus) {
    const kBefore = kindsOf(E(2));
    const kAfter = kindsOf(E(4));
    check("df26: nullEst records as a REFERENCE on est",
      /RECORDED/.test(E(1)) && /reference cell nullEst \(4 rows, all pass\)/.test(E(1)), E(1));
    check("df26: re-attesting the SAME evidence cell as a nullcheck records as kind null",
      /RECORDED/.test(E(3)) && /null cell nullEst \(4 rows, all pass\)/.test(E(3)), E(3));
    check("df26: the path's reference count DROPS by one — the earlier kind of that evidence cell is gone",
      kBefore.reference > 0 && kAfter.reference === kBefore.reference - 1,
      `before=${JSON.stringify(kBefore)} after=${JSON.stringify(kAfter)}`);
    check("df26: the path's null count RISES by one — the latest kind is the one that counts",
      (kAfter["null"] || 0) === (kBefore["null"] || 0) + 1,
      `before=${JSON.stringify(kBefore)} after=${JSON.stringify(kAfter)}`);
    check("df26: pre-df26 first-wins is NOT present (the null kind would be missing entirely)",
      !!kAfter["null"], `after=${JSON.stringify(kAfter)}`);
    check("df26: the path carries the same NUMBER of attestations — one entry per evidence cell",
      sum(kAfter) === sum(kBefore), `before=${sum(kBefore)} after=${sum(kAfter)}`);
    check("df26: est's weight and core membership are unchanged by the re-attestation",
      /est: IN CORE/.test(statusOf(E(1))) && statusOf(E(3)) === statusOf(E(1))
        && weightOf(E(3)) === weightOf(E(1)),
      `${statusOf(E(1))} | weight ${weightOf(E(1))}\n${statusOf(E(3))} | weight ${weightOf(E(3))}`);
  }

  // ---- df23: no writer cell, no task_complete.
  const base23 = base26 + d26Off;
  const G = (i) => outs[base23 + i];
  const NO_WRITER = /REJECTED: no cell in any of your modules writes to \/local-disk\. The deliverable must be produced by a WRITER cell \(`await localDisk\.write\(path, text\)` inside a cell that depends on the candidate\) so its upstream can be verified — a file written from eval_js has no verified path and the core rule cannot apply to it \(df23\)\./;
  if (df23plus) {
    check("df23: the no-writer module applied", /applied live/.test(G(0)), G(0).slice(0, 200));
    check("df23: the crossings still qualify with no deliverable in the module",
      /: INDEPENDENT/.test(G(1)) && /: INDEPENDENT/.test(G(2)), G(1));
    check("df23: with NO writer cell task_complete is REJECTED, in df23's own words",
      NO_WRITER.test(G(3)) && !/GUARD<<null>>/.test(G(3)), G(3));
    check("df23: the rejection does not fall through to the core-rule text",
      !/not in the VERIFIED CORE/.test(G(3)), G(3));
    check("df23: the writer is back", /applied live/.test(G(4)), G(4).slice(0, 200));
    check("df23: with a writer cell again the rejection no longer mentions the missing writer",
      /GUARD<</.test(G(7)) && !NO_WRITER.test(G(7)) && !/no cell in any of your modules writes/.test(G(7)), G(7));
  }
} else if (litSuite) {
  check("fetch_text reads the Wikipedia REST summary of RR Lyrae variable",
    /RR Lyrae/.test(outs[0]) && outs[0].length > 500 && !/metadata/.test(outs[0]), outs[0].slice(0, 400));
  check("fetch_text reports the final url and the char count",
    /^fetch_text https:\/\/[^\s]+ \((direct|r\.jina\.ai)\) — \d+ chars/.test(outs[0]), outs[0].slice(0, 200));
  check("a literature attestation on a knowledge cell records, at half weight",
    /RECORDED/.test(outs[1]) && /literature cell lore/.test(outs[1]) && /weight 0\.5 of 1\.5/.test(outs[1]), outs[1]);
  check("a claim that is not in the knowledge cell is refused",
    !/RECORDED/.test(outs[2]) && /claim is NOT in lore verbatim/.test(outs[2]), outs[2]);
  check("an evidence cell with no URL and no DOI is not a knowledge cell",
    !/RECORDED/.test(outs[3]) && /is not a KNOWLEDGE cell/.test(outs[3]), outs[3]);
  check("kind literature without a claim is refused",
    !/RECORDED/.test(outs[4]) && /needs `claim`/.test(outs[4]), outs[4]);
  check("core_status lists lore as given from the literature, separately from the data cells",
    /GIVEN FROM LITERATURE \(1 — knowledge cells citing a URL or a DOI, assumed correct\): lore/.test(outs[5])
      && /GIVEN \([^)]*\)[^\n]*\bload\b/.test(outs[5]) && !/GIVEN \([^)]*\)[^\n]*\blore\b/.test(outs[5]), outs[5]);
  check("classify is blocked on evidence: the literature counts as half",
    /classify → 1 more evidence cell/.test(outs[5]), outs[5]);
  check("LEDGER_COLLECT reads the fetch log off the page (what the walk dump prints)",
    /"url": ?"https:\/\/en\.wikipedia\.org\/api\/rest_v1/.test(outs[6]) && /"via": ?"direct"/.test(outs[6])
      && /"chars": ?\d\d\d/.test(outs[6]), outs[6].slice(0, 300));
} else if (walkSuite) {
  check("guard: walk mode rejects task_complete with the walk message", /walk mode/.test(outs[1]) && !/needs two qualifying/.test(outs[1]), outs[1]);
  check("guard: without the flag the normal veto returns", /needs two qualifying/.test(outs[3]) && !/walk mode/.test(outs[3]), outs[3]);
} else if (tolSuite) {
  check("pA/pC at tolerance 0.02 agrees on 0.85 of 100 items",
    /: INDEPENDENT/.test(outs[0]) && /100 items compared, (fraction )?0\.85 within tolerance/.test(outs[0]) && !/NOTE: tolerance above 5%/.test(outs[0]), outs[0]);
  check("pA/pC at tolerance 0.5 agrees on everything and carries the loose-tolerance note",
    /100 items compared, (fraction )?1 within tolerance/.test(outs[1]) && /NOTE: tolerance above 5% \(or absolute\) does not qualify for task_complete/.test(outs[1]), outs[1]);
  check("an absolute tolerance carries the same note",
    /NOTE: tolerance above 5% \(or absolute\)/.test(outs[2]), outs[2]);
  check("pA/pD DISAGREES and names the first 10 disagreeing indices with both values",
    /DISAGREE/.test(outs[3]) && /DISAGREEING ITEMS \(first 10\): 50: 102 vs 153;/.test(outs[3])
      && (outs[3].match(/\d+: \d+ vs \d+/g) || []).length >= 10, outs[3]);
  check("the DISAGREE reply stays under 1500 chars", outs[3].length < 1500, `len=${outs[3].length}`);
  check("guard: tolerance 0.02 qualifies", /tAC → PASS/.test(outs[4]), outs[4]);
  check("guard: tolerance 0.5 -> TOLERANCE TOO LOOSE",
    /tAC5 → TOLERANCE TOO LOOSE \(0\.5 > 0\.05; widening the tolerance until the sides agree is not a crossing — a disagreement at 5% is the finding\)/.test(outs[5]), outs[5]);
  check("guard: abs:true -> ABSOLUTE TOLERANCE",
    /tACabs → ABSOLUTE TOLERANCE \(only a relative tolerance ≤ 0\.05 qualifies\)/.test(outs[6]), outs[6]);
  check("guard: __rc5MaxTol = 0.6 makes tolerance 0.5 qualify", /tAC5 → PASS/.test(outs[7]), outs[7]);
  check("guard accepts two checks once the cap is raised to 0.6", /GUARD<<null>>/.test(outs[8]), outs[8]);
  check("the veto header states the relative-tolerance cap",
    /re-run since the last edit, at a relative tolerance ≤ 5% \(a disagreement is the finding: one side is wrong on those items — test each estimator on a synthetic signal with a known answer before crossing them\)\. Ledger:/.test(outs[4]), outs[4]);
} else if (fnCells) {
  const FN_NOTE = /\(a function cell — the same algorithm on both sides is one derivation, not two\)/;
  check("pA/pB is NOT INDEPENDENT and names `ls` as a function cell",
    /NOT INDEPENDENT/.test(outs[0]) && /shared computation: ls /.test(outs[0]) && FN_NOTE.test(outs[0]), outs[0]);
  check("the shared constant `data` is not called a function cell",
    !/data \(a function cell/.test(outs[0]), outs[0]);
  check("pC/pD is INDEPENDENT: the shared constArr is a constant",
    /: INDEPENDENT/.test(outs[1]) && /shares only data cells: [^)]*constArr/.test(outs[1]) && /AGREE within/.test(outs[1]), outs[1]);
  check("pC/pE is INDEPENDENT: the shared `load` reads /local-disk",
    /: INDEPENDENT/.test(outs[2]) && /shares only data cells: [^)]*load/.test(outs[2]) && /AGREE within/.test(outs[2]), outs[2]);
  check("guard: pA/pB -> NOT INDEPENDENT naming the function cell",
    /pAB → NOT INDEPENDENT \(shared: ls /.test(outs[3]) && FN_NOTE.test(outs[3]), outs[3]);
  check("guard accepts pC/pD and pC/pE", /GUARD<<null>>/.test(outs[4]), outs[4]);
} else if (!perItem) {
  check("AB is NOT INDEPENDENT and names the shared helper",
    /NOT INDEPENDENT/.test(outs[0]) && /helper/.test(outs[0]), outs[0]);
  check("CD is INDEPENDENT and agrees",
    /: INDEPENDENT/.test(outs[1]) && /AGREE within/.test(outs[1]) && !/DISAGREE/.test(outs[1]), outs[1]);
  check("CE is INDEPENDENT and DISAGREES",
    /: INDEPENDENT/.test(outs[2]) && /DISAGREE/.test(outs[2]), outs[2]);
  check("guard vetoes with only one passing check",
    /two passing cross-checks/.test(outs[3]) && /CD → PASS/.test(outs[3]) && /CE → DISAGREE/.test(outs[3]), outs[3]);
  check("the edit applied", /applied live/.test(outs[4]), outs[4].slice(0, 200));
  check("guard reports the pre-edit checks as STALE",
    /two passing cross-checks/.test(outs[5]) && /CD → STALE/.test(outs[5]) && /CG/.test(outs[5]) === false, outs[5]);
  check("re-run CD passes again", /: INDEPENDENT/.test(outs[6]) && /AGREE within/.test(outs[6]), outs[6]);
  check("CG (third derivation) passes", /: INDEPENDENT/.test(outs[7]) && /AGREE within/.test(outs[7]), outs[7]);
  check("guard accepts with two fresh passing checks", /GUARD<<null>>/.test(outs[8]), outs[8]);
} else {
  check("s1/s2 is a passing check but only 1 item",
    /: INDEPENDENT/.test(outs[0]) && /AGREE within/.test(outs[0]) && /1 item compared/.test(outs[0]), outs[0]);
  check("pA/pB compares 100 items, all within tolerance",
    /: INDEPENDENT/.test(outs[1]) && /100 items compared, (fraction )?1 within tolerance/.test(outs[1]) && /ON THE DELIVERABLE/.test(outs[1]) && !/NOT ON THE DELIVERABLE/.test(outs[1]), outs[1]);
  check("pA/pC agrees on 0.85 of 100 items at min_fraction 0.8",
    /AGREE within/.test(outs[2]) && /100 items compared, (fraction )?0\.85 within tolerance/.test(outs[2]), outs[2]);
  check("pA/pD runs but is flagged: min_fraction below 0.8",
    /min_fraction below 0\.8 does not qualify/.test(outs[3]), outs[3]);
  check("pA/back is reported as reading the output back",
    /READS THE OUTPUT BACK/.test(outs[4]), outs[4]);
  check("pB/pC is reported as not on the deliverable",
    /NOT ON THE DELIVERABLE/.test(outs[5]), outs[5]);

  check("guard: s1/s2 -> SCALAR/COUNT",
    /s12 → SCALAR\/COUNT \(1 item; a crossing must be PER ITEM/.test(outs[7]), outs[7]);
  check("guard: pA/pB qualifies", /pAB → PASS/.test(outs[8]), outs[8]);
  check("guard: pA/pC (min_fraction 0.8, fraction 0.85) qualifies", /pAC → PASS/.test(outs[9]), outs[9]);
  check("guard: pA/pD -> MIN_FRACTION TOO LOW", /pAD → MIN_FRACTION TOO LOW \(0\.5 < 0\.8\)/.test(outs[10]), outs[10]);
  check("guard: pA/back -> READS THE OUTPUT BACK", /pAback → READS THE OUTPUT BACK/.test(outs[11]), outs[11]);
  check("guard: pB/pC -> NOT ON THE DELIVERABLE", /pBC → NOT ON THE DELIVERABLE/.test(outs[12]), outs[12]);
  check("guard: pF/pG -> NOT INDEPENDENT (h)", /pFG → NOT INDEPENDENT \(shared: [^)]*h/.test(outs[13]), outs[13]);
  check("guard: __rc5MinItems=200 makes pA/pB TOO FEW ITEMS",
    /pAB → TOO FEW ITEMS \(100 < 200\)/.test(outs[14]), outs[14]);
  check("guard returns null with pA/pB and pA/pC registered", /GUARD<<null>>/.test(outs[15]), outs[15]);
  check("guard returns null on the whole ledger (2 qualify, the rest do not block)",
    /GUARD<<null>>/.test(outs[16]), outs[16]);
  check("the veto header states the qualification rule",
    /two qualifying cross-checks: independent(?: \(different algorithms, not the same estimator on two subsets\))?, agreeing on ≥80% of items, per item \(≥20 items, one per target\/sample\), on the quantity the output is built from, re-run since the last edit(?:, at a relative tolerance ≤ 5% \([^)]*\))?\. Ledger:/.test(outs[7]), outs[7]);
  // df14+ only: the header also caps the tolerance a qualifying crossing may use.
  if (df14plus)
    check("the veto header caps the tolerance at 5% relative",
      /re-run since the last edit, at a relative tolerance ≤ 5% \(/.test(outs[7]), outs[7]);
  // df12+ only: the header also says a second derivation is a different ALGORITHM.
  if (/df1[2-9]|df[2-9]\d/.test(notebook))
    check("the veto header rules out the same estimator on two subsets",
      /independent \(different algorithms, not the same estimator on two subsets\)/.test(outs[7]), outs[7]);
}

const failed = checks.filter((c) => !c.ok).length;
if (failed) { console.log("\n--- all tool outputs ---"); outs.forEach((o, i) => console.log(`[${i}] ${String(o).slice(0, 900)}`)); }
console.log(`\n${failed ? "FAIL" : "PASS"} cross-smoke${litSuite ? " (literature)" : walkSuite ? " (walk)" : tolSuite ? " (tolerance)" : fnCells ? " (fn-cells)" : perItem ? " (per-item)" : ""}: ${checks.length - failed}/${checks.length} assertions`);
process.exit(failed ? 1 : 0);
