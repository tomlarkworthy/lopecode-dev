// df32: an edit to a CORE cell is refused unless the turn's note re-opened it.
//
// Five pages over the df16 attest fixture (attest-fixture.mjs MODULE_ATTEST), oracle mode, no model
// calls. On each, `est` is attested by refEst and refEst2 and enters the CORE.
//   a  no global: edit_file est → accepted, est drops out of CORE (df31 behaviour), no frozen line.
//   b  __rc5MayEdit = []: edit_file est → REFUSED, file byte-identical, CORE and attestations
//      unchanged; then edit_file pB (not core) → accepted.
//   c  __rc5MayEdit = ["est"]: edit_file est → accepted, est drops out of CORE.
//   d  __rc5MayEdit = []: write_file changing est → REFUSED; write_file changing only pB → accepted.
//   f  __rc5MayEdit = []: write_file with est's definition deleted → REFUSED.
// On df31 (before the guard) b, d and f must NOT refuse.
//
//   node tbs/freeze-smoke.mjs [--notebook path]

import { join, resolve } from "node:path";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { MODULE_ATTEST } from "./attest-fixture.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df32.html")));
const df32plus = /df3[2-9]|df[4-9]\d/.test(notebook);

const M = "@test/attest";
const PATH = "/src/@test/attest.js";
const at = (cell, evidence) => ({ tool: "attest", args: { module: M, cell, evidence } });
const cs = () => ({ tool: "core_status", args: { module: M } });
const rd = () => ({ tool: "read_file", args: { file_path: PATH } });
const EST_OLD = "const _est = function est(){ return (xs) => { let s = 0; for (const x of xs) s += x; return s / xs.length; }; };";
const EST_NEW = "const _est = function est(){ return (xs) => xs.reduce((s, x) => s + x, 0) / xs.length; };";
const PB_OLD = "const _pB = function pB(load){ return load.xs.map(x => x + 0); };";
const PB_NEW = "const _pB = function pB(load){ return load.xs.map(x => x * 1); };";
const editEst = () => ({ tool: "edit_file", args: { file_path: PATH, old_string: EST_OLD, new_string: EST_NEW }, settleMs: 1500 });
const editPB = () => ({ tool: "edit_file", args: { file_path: PATH, old_string: PB_OLD, new_string: PB_NEW }, settleMs: 1500 });
const write = (content) => ({ tool: "write_file", args: { file_path: PATH, content }, settleMs: 1500 });
const MOD_EST = MODULE_ATTEST.replace(EST_OLD, EST_NEW);
const MOD_PB = MODULE_ATTEST.replace(PB_OLD, PB_NEW);
const MOD_NO_EST = MODULE_ATTEST.replace(EST_OLD + "\n", "").replace('  $def("_est", "est", [], _est);\n', "");
const init = (may) => `globalThis.__rc5MayEdit = ${JSON.stringify(may)};`;
const attestEst = [at("est", "refEst"), at("est", "refEst2")];

const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "\n       " + String(detail).replace(/\n/g, "\n       ") : ""}`); };
const toolOuts = (r) => (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
const lineOf = (s, re) => String(s || "").split("\n").find((l) => re.test(l)) || "";
const coreHasEst = (o) => /\best\b/.test(lineOf(o, /^CORE \(/));
const REFUSED_EST = "REFUSED: this edit changes CORE cell(s) est, which the reviewer's note did not re-open (May edit: none).\n" +
  "A verified cell is frozen. Edit only cells outside the core, or report why this one must change and stop — " +
  "the reviewer re-opens it by naming it on the note's `May edit:` line. (df32)";
const FROZEN_EST = "frozen: est (an edit is refused unless the note re-opens the cell; re-opened this turn: none)";
const FROZEN_REOPENED = "frozen: (none) (an edit is refused unless the note re-opens the cell; re-opened this turn: est)";

const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 300000, oracle: true });
const run = (id, initScript, oracle) => driver.runQuestion({
  id, question: id, setup: { files: { [PATH]: MODULE_ATTEST }, ...(initScript ? { initScript } : {}) }, oracle,
});
let ra, rb, rc, rd_, rf;
try {
  ra = await run("freeze-a", null, [...attestEst, cs(), editEst(), cs()]);
  rb = await run("freeze-b", init([]), [...attestEst, cs(), rd(), editEst(), rd(), cs(), editPB(), cs()]);
  rc = await run("freeze-c", init(["est"]), [...attestEst, cs(), editEst(), cs()]);
  rd_ = await run("freeze-d", init([]), [...attestEst, cs(), write(MOD_EST), cs(), write(MOD_PB), cs()]);
  rf = await run("freeze-f", init([]), [...attestEst, cs(), write(MOD_NO_EST), cs()]);
} finally { await driver.close(); }

// a — no global
{
  const o = toolOuts(ra);
  check("a: run", !ra.error, ra.error);
  check("a: est enters the CORE", coreHasEst(o[2]), lineOf(o[2], /^CORE \(/));
  check("a: no frozen line without the global", !/^frozen:/m.test(o[2] || "") && !/^frozen:/m.test(o[4] || ""), o[2]);
  check("a: edit_file est is accepted", /^Edited \/src\/@test\/attest\.js .*applied live/.test(o[3] || ""), (o[3] || "").slice(0, 200));
  check("a: est drops out of the CORE", !coreHasEst(o[4]), lineOf(o[4], /^CORE \(/));
}
// b — May edit: []
{
  const o = toolOuts(rb);
  check("b: run", !rb.error, rb.error);
  check("b: est enters the CORE", coreHasEst(o[2]), lineOf(o[2], /^CORE \(/));
  if (df32plus) {
    check("b: core_status prints the frozen line right after CORE",
      lineOf(o[2], /^frozen:/) === FROZEN_EST && /^CORE \(/.test(String(o[2]).split("\n")[String(o[2]).split("\n").indexOf(FROZEN_EST) - 1] || ""), lineOf(o[2], /^frozen:/));
    check("b: edit_file on the CORE cell is REFUSED with the exact text", o[4] === REFUSED_EST, o[4]);
    check("b: the file is byte-identical after the refusal", o[3] === o[5] && o[3].length > 100, (o[5] || "").slice(0, 120));
    check("b: est is still in the CORE", coreHasEst(o[6]), lineOf(o[6], /^CORE \(/));
    check("b: no attestation went stale", !/is stale/.test(o[6] || ""), o[6]);
  } else {
    check("b (df31 control): edit_file on the CORE cell is NOT refused", !/REFUSED/.test(o[4] || "") && /applied live/.test(o[4] || ""), (o[4] || "").slice(0, 200));
    check("b (df31 control): est drops out of the CORE", !coreHasEst(o[6]), lineOf(o[6], /^CORE \(/));
    check("b (df31 control): no frozen line", !/^frozen:/m.test(o[2] || ""), o[2]);
  }
  check("b: edit_file on a non-core cell is accepted", /^Edited \/src\/@test\/attest\.js .*applied live/.test(o[7] || ""), (o[7] || "").slice(0, 200));
}
// c — May edit: ["est"]
{
  const o = toolOuts(rc);
  check("c: run", !rc.error, rc.error);
  check("c: est enters the CORE", coreHasEst(o[2]), lineOf(o[2], /^CORE \(/));
  if (df32plus)
    check("c: the frozen line names est as re-opened", lineOf(o[2], /^frozen:/) === FROZEN_REOPENED, lineOf(o[2], /^frozen:/));
  check("c: edit_file on the re-opened cell is accepted", /^Edited .*applied live/.test(o[3] || ""), (o[3] || "").slice(0, 200));
  check("c: est drops out of the CORE", !coreHasEst(o[4]), lineOf(o[4], /^CORE \(/));
}
// d — May edit: [], write_file
{
  const o = toolOuts(rd_);
  check("d: run", !rd_.error, rd_.error);
  check("d: est enters the CORE", coreHasEst(o[2]), lineOf(o[2], /^CORE \(/));
  if (df32plus) {
    check("d: frozen line present", lineOf(o[2], /^frozen:/) === FROZEN_EST, lineOf(o[2], /^frozen:/));
    check("d: write_file changing the CORE cell is REFUSED", o[3] === REFUSED_EST, o[3]);
    check("d: est still in the CORE after the refused write", coreHasEst(o[4]), lineOf(o[4], /^CORE \(/));
    check("d: write_file changing only a non-core cell is accepted", /^Wrote .*applied live/.test(o[5] || ""), (o[5] || "").slice(0, 200));
    check("d: est still in the CORE after the accepted write", coreHasEst(o[6]), lineOf(o[6], /^CORE \(/));
  } else {
    check("d (df31 control): write_file changing the CORE cell is NOT refused", !/REFUSED/.test(o[3] || "") && /applied live/.test(o[3] || ""), (o[3] || "").slice(0, 200));
    check("d (df31 control): est drops out of the CORE", !coreHasEst(o[4]), lineOf(o[4], /^CORE \(/));
  }
}
// f — May edit: [], deleting the CORE cell
{
  const o = toolOuts(rf);
  check("f: run", !rf.error, rf.error);
  check("f: est enters the CORE", coreHasEst(o[2]), lineOf(o[2], /^CORE \(/));
  if (df32plus) {
    check("f: deleting the CORE cell is REFUSED", o[3] === REFUSED_EST, o[3]);
    check("f: est still in the CORE", coreHasEst(o[4]), lineOf(o[4], /^CORE \(/));
  } else {
    check("f (df31 control): deleting the CORE cell is NOT refused", !/REFUSED/.test(o[3] || "") && /^Wrote /.test(o[3] || ""), (o[3] || "").slice(0, 200));
  }
}

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${failed ? "FAIL" : "PASS"} freeze-smoke: ${checks.length - failed}/${checks.length} assertions`);
process.exit(failed ? 1 : 0);
