// D3 probe (walk ai, 2026-09-24): does a data-dependent row that does NOT test the attested cell
// satisfy df33's sensitivity run? Oracle mode on the agent's own parseCSV / lombScargle over the real
// target_1.csv, read through a stub localDisk under seed root /local-disk/root/data.
//   ev6  the turn-5 shape: 3 periods planted on real times, pass + string details only.
//   ev7  ev6 plus ONE first row asserting the real first timestamp.
//   node tbs/d3-probe.mjs [--notebook abs path]
import { join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df34.html")));
const csv = readFileSync(join(here, "sandbox/walk-20260924ai-variable-star-vetting/variable-star-vetting/root/data/target_1.csv"), "utf8");

const M = "@test/d3";
const PATH = "/src/@test/d3.js";
const TS_ROW = `rows.push({test: "first timestamp ~58204.489", pass: Math.abs(tArr[0] - 58204.4888079) < 0.001, detail: tArr[0]});`;
const body = (withTs) => `
  const d1 = await t1Data;
  const tArr = Float64Array.from(d1.slice(0, 500), d => d.t);
  const rows = [];
  ${withTs ? TS_ROW : ""}
  const testPeriods = [0.25, 1.5, 12.0];
  for (const pTrue of testPeriods) {
    const yArr = Float64Array.from(tArr, t => Math.sin(2 * Math.PI * t / pTrue));
    const fMin = 0.8 / pTrue, fMax = 1.2 / pTrue, nFreq = 2000, df = (fMax - fMin) / nFreq;
    const freqs = Float64Array.from({length: nFreq}, (_, i) => fMin + i * df);
    const powers = lombScargle(Array.from(tArr), Array.from(yArr), freqs);
    let bestIdx = 0, bestPow = 0;
    for (let i = 0; i < nFreq; i++) { if (powers[i] > bestPow) { bestPow = powers[i]; bestIdx = i; } }
    const pRecovered = 1 / freqs[bestIdx];
    const relErr = Math.abs(pRecovered - pTrue) / pTrue;
    rows.push({test: "period " + pTrue + "d recovered", pass: relErr < 0.01, detail: "recovered=" + pRecovered.toFixed(4) + " err=" + (relErr*100).toFixed(2) + "%"});
    rows.push({test: "period " + pTrue + "d power strong", pass: bestPow > 0.3, detail: bestPow.toFixed(4)});
  }
  return rows;`;
const src = readFileSync(join(here, "trajectories/walk-20260924ai-variable-star-vetting/src-5/src/@tomlarkworthy/analysis.js"), "utf8");
const cellSrc = (name) => { const m = new RegExp(`^const _${name} = [\\s\\S]*?\\n\\)\\};\\n`, "m").exec(src); if (!m) throw new Error("no " + name); return m[0]; };

const MODULE = `const _localDisk = function localDisk(){ return { readText: async (p) => globalThis.__d3csv }; };
${cellSrc("parseCSV")}
${cellSrc("lombScargle")}
const _t1Text = async function t1Text(localDisk){ return await localDisk.readText("root/data/target_1.csv") };
const _t1Data = async function t1Data(parseCSV, t1Text){ return parseCSV(t1Text) };
const _ev6 = async function ev6(lombScargle, t1Data){${body(false)}
};
const _ev7 = async function ev7(lombScargle, t1Data){${body(true)}
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_localDisk", "localDisk", [], _localDisk);
  $def("_parseCSV", "parseCSV", [], _parseCSV);
  $def("_lombScargle", "lombScargle", [], _lombScargle);
  $def("_t1Text", "t1Text", ["localDisk"], _t1Text);
  $def("_t1Data", "t1Data", ["parseCSV", "t1Text"], _t1Data);
  $def("_ev6", "ev6", ["lombScargle", "t1Data"], _ev6);
  $def("_ev7", "ev7", ["lombScargle", "t1Data"], _ev7);
  return main;
}
`;

// Per-row pass vectors of ev7's body under: live, destroyed data (df34 destroy), mutant lombScargle.
const PROBE = `
  const run = async (lombScargle, t1Data) => {${body(true)}
  };
  const dText = globalThis.__rc5AnchorDestroy(t1Text);
  const live = await run(lombScargle, t1Data);
  const destroyed = await run(lombScargle, parseCSV(dText));
  const mutant = await run(function mutant() { return NaN; }, t1Data);
  const pv = rs => rs.map(r => r.pass ? 1 : 0).join('');
  return 'D3<<' + JSON.stringify({
    before: t1Text.split('\\n')[1], after: dText.split('\\n')[1],
    live: pv(live), destroyed: pv(destroyed), mutant: pv(mutant),
    liveDetail: live.map(r => r.detail), destroyedDetail: destroyed.map(r => r.detail) }) + '>>';`;

const at = (cell, evidence) => ({ tool: "attest", args: { module: M, cell, evidence, kind: "reference" } });
const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 600000, oracle: true });
let r;
try {
  r = await driver.runQuestion({
    id: "d3", question: "d3",
    setup: { files: { [PATH]: MODULE }, initScript: `globalThis.__rc5SeedRoots = ["/local-disk/root/data"]; globalThis.__d3csv = ${JSON.stringify(csv)};` },
    oracle: [at("lombScargle", "ev6"), at("lombScargle", "ev7"), { tool: "eval_js", args: { module: M, code: PROBE } }],
  });
} finally { await driver.close(); }
const outs = (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
const anc = (s) => (String(s || "").split("\n").find((l) => /^anchoring:/.test(l)) || "(no anchoring line) " + String(s || "").slice(0, 300));
const mutl = (s) => String(s || "").split("\n").find((l) => /^mutation check/.test(l)) || "(no mutation line)";
console.log("ev6:", mutl(outs[0])); console.log("ev6:", anc(outs[0]));
console.log("ev7:", mutl(outs[1])); console.log("ev7:", anc(outs[1]));
const m = /D3<<(.*)>>/.exec(outs[2] || ""); const p = m ? JSON.parse(m[1]) : null;
console.log("probe:", p ? JSON.stringify(p, null, 1) : outs[2]);
const checks = [
  ["ev6 (turn-5 shape) is demoted: insensitive", /^anchoring: demoted: insensitive/.test(anc(outs[0]))],
  ["ev7 (+1 real-timestamp row) is real-anchored", /^anchoring: real-anchored/.test(anc(outs[1]))],
  ["destroy() changes the first data line", !!p && p.before !== p.after],
  ["the timestamp row (row 0) passes under the mutant", !!p && p.mutant[0] === "1"],
  ["the timestamp row is the ONLY row that flips under destroy", !!p && p.live === "1111111" && p.destroyed === "0111111"],
  ["every lombScargle row fails under the mutant", !!p && p.mutant.slice(1) === "000000"],
];
for (const [n, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${n}`);
process.exit(checks.every((c) => c[1]) ? 0 : 1);
