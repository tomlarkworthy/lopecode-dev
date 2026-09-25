// df29: a data cell is GIVEN only when what it reads is the TASK'S OWN data.
//
// Two pages over the same fixture module (attest-fixture.mjs MODULE_GIVEN), in oracle mode with no
// model calls:
//   page 1  globalThis.__rc5SeedRoots = ["/local-disk/task/data"] pre-boot (setup.initScript, where
//           the driver puts it). `load` (a path inside the roots) and `scale` (a zero-input constant
//           naming no path) stay GIVEN; `imported` — a data cell reading /local-disk/task/cache/
//           py.json, the shape walk ac shipped 98 of 100 variables on — is NOT given, blocks
//           task_complete with a sentence naming the path and the roots, and enters the core only
//           once two attestations stand on it, like any other cell.
//   page 2  no global at all: the same module, the same cells, `imported` GIVEN exactly as on df28.
//
//   node tbs/given-smoke.mjs [--notebook path]

import { join, resolve } from "node:path";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { MODULE_GIVEN, GIVEN_INIT_SCRIPT } from "./attest-fixture.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df29.html")));

const M = "@test/given";
const PATH = "/src/@test/given.js";
const at = (cell, evidence, kind) => ({ tool: "attest", args: { module: M, cell, evidence, ...(kind ? { kind } : {}) } });
const cs = () => ({ tool: "core_status", args: { module: M } });
const cc = (name, a, b) => ({ tool: "cross_check", args: { module: M, name, a, b } });

// completeGuard is a property of the `session` cell's definition, so it is sliced out of the source
// and called directly — the same probe cross-smoke.mjs uses, with the core rule left ON.
const GUARD_PROBE = `
  const rt = globalThis.__ojs_runtime;
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
  globalThis.__rc5MinTurnMs = 0;
  let __guardOut;
  try { __guardOut = guard({ toolCallsThisTurn: 3, summary: 'GATES: mean -> 5.5', elapsedMs: 1, vetoes: 0 }); }
  finally { globalThis.__rc5MinTurnMs = prevMs; }
  return 'GUARD<<' + String(__guardOut) + '>>';
`;
const probe = () => ({ tool: "eval_js", args: { module: M, code: GUARD_PROBE } });

const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "\n       " + String(detail).replace(/\n/g, "\n       ") : ""}`); };
const toolOuts = (r) => (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
const lineOf = (s, re) => String(s || "").split("\n").find((l) => re.test(l)) || "";

// The sentence df29 demotes a cell with, as core_status and the guard print it.
const SENT = /reads \/local-disk\/task\/cache\/py\.json, which is not the task's data \(seed roots: \/local-disk\/task\/data\) — a cell that imports a file the run wrote is an unverified pipeline, not a given; attest it, or move the computation into cells/;
const REL_SENT = /reads \/local-disk\/root\/cache\/rel\.json, which is not the task's data/;
const HOLE_SENT = /reads \/local-disk\/task\/data\/part-\$\{…\}\.json, a \/local-disk path built at run time, so it cannot be shown to be the task's data/;

// df33: refImp/nullImp read only `imported` (outside the roots), so neither is real-anchored and
// `imported` stays out of the core after them; refImpLoad checks it against `load` (the task's data)
// and is what lifts it in. On df32 and older that third attestation is not made.
const df33plus = /df3[3-9]|df[4-9]\d/.test(notebook);
const IMP_CORE = df33plus ? 6 : 5, LAST = df33plus ? 7 : 6;

const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 300000, oracle: true });
let r1, r2;
try {
  r1 = await driver.runQuestion({
    id: "given-1", question: "given 1",
    setup: { files: { [PATH]: MODULE_GIVEN }, initScript: GIVEN_INIT_SCRIPT },
    oracle: [
      cs(),                            // 0 imported demoted, load/scale given
      cc("eB", "est", "pB"),           // 1 two qualifying crossings so the df11 gate is not
      cc("eC", "est", "pC"),           // 2 what the guard rejects on
      probe(),                         // 3 task_complete REJECTED, carrying the sentence
      at("imported", "refImp"),        // 4 a data cell is attested like any other cell
      at("imported", "nullImp", "nullcheck"), // 5 -> IN CORE (df33: not yet — nothing anchored)
      ...(df33plus ? [at("imported", "refImpLoad")] : []), // df33: 6 -> IN CORE, anchored by refImpLoad
      cs(),                            // 6 (df33: 7) the sentence is gone
    ],
  });
  // Control: the SAME module with no global at all — df28 behaviour, `imported` GIVEN.
  r2 = await driver.runQuestion({
    id: "given-2", question: "given 2",
    setup: { files: { [PATH]: MODULE_GIVEN } },
    oracle: [cs()],
  });
} finally { await driver.close(); }

const o1 = toolOuts(r1), o2 = toolOuts(r2);
const given1 = lineOf(o1[0], /^GIVEN \(/), given6 = lineOf(o1[LAST], /^GIVEN \(/), given2 = lineOf(o2[0], /^GIVEN \(/);

check("page 1: run", !r1.error, r1.error);
check("page 1: the GIVEN line names the seed roots",
  /^GIVEN \(\d+ — the task's data under \/local-disk\/task\/data, and zero-input constants\): /.test(given1), given1);
check("page 1: load (inside the roots) and the zero-input constant are GIVEN",
  /\bload\b/.test(given1) && /\bscale\b/.test(given1), given1);
check("page 1: imported (outside the roots) is NOT given", !/\bimported\b/.test(given1), given1);
check("page 1: imported is BLOCKED with the sentence naming the path and the roots",
  SENT.test(lineOf(o1[0], /^ +imported →/)), lineOf(o1[0], /^ +imported →/));
check("page 1: the demoted cell still needs its two evidence cells",
  /2 more evidence cells/.test(lineOf(o1[0], /^ +imported →/)), lineOf(o1[0], /^ +imported →/));
check("page 1: est is blocked on imported, not on the data",
  /upstream imported not in core/.test(lineOf(o1[0], /^ +est →/)), lineOf(o1[0], /^ +est →/));
check("page 1: the relative form localDisk.readText(\"root/…\") resolves against /local-disk/",
  REL_SENT.test(lineOf(o1[0], /^ +relImp →/)), lineOf(o1[0], /^ +relImp →/));
// df31: a hole path whose static prefix is under a root is the task's data (walk ad's loadTargets); one outside stays out.
const df31plus = /df3[1-9]|df[4-9]\d/.test(notebook);
if (df31plus) check("page 1 (df31): a ${} hole path whose prefix is under a root stays GIVEN",
  /\bholeImp\b/.test(given1), given1);
else check("page 1: a path with a ${} hole is outside the roots, and says why",
  HOLE_SENT.test(lineOf(o1[0], /^ +holeImp →/)), lineOf(o1[0], /^ +holeImp →/));
check("page 1: a ${} hole path whose prefix is OUTSIDE the roots is demoted, and says why",
  /reads \/local-disk\/task\/cache\/part-\$\{…\}\.json, a \/local-disk path built at run time/.test(lineOf(o1[0], /^ +holeOut →/)), lineOf(o1[0], /^ +holeOut →/));
check("page 1: both crossings qualify, so the df11 gate is not what rejects",
  /: INDEPENDENT/.test(o1[1] || "") && /: INDEPENDENT/.test(o1[2] || ""), o1[1]);
check("page 1: task_complete is REJECTED on the core rule, carrying the sentence",
  /not in the VERIFIED CORE/.test(o1[3] || "") && SENT.test(o1[3] || "") && !/needs two qualifying/.test(o1[3] || ""),
  (o1[3] || "").slice(0, 700));
check("page 1: a reference attestation on the demoted data cell records",
  /RECORDED/.test(o1[4] || "") && /4 rows, all pass/.test(o1[4] || ""), (o1[4] || "").slice(0, 300));
if (df33plus) check("page 1 (df33): after refImp + nullImp, imported is NOT in core — neither evidence reads the task's data",
  /RECORDED/.test(o1[5] || "") && /imported: NOT IN THE CORE YET — no REAL-ANCHORED evidence/.test(o1[5] || ""), (o1[5] || "").slice(0, 400));
check("page 1: a nullcheck attestation puts imported IN CORE" + (df33plus ? " (df33: after the anchored refImpLoad)" : ""),
  /RECORDED/.test(o1[IMP_CORE] || "") && (df33plus ? /imported: IN CORE \(evidence: refImp, nullImp, refImpLoad\)/ : /imported: IN CORE \(evidence: refImp, nullImp\)/).test(o1[IMP_CORE] || ""), (o1[IMP_CORE] || "").slice(0, 400));
check("page 1: with imported in the core the sentence is gone",
  !SENT.test(o1[LAST] || "") && /CORE \([^)]*\)[^\n]*\bimported\b/.test(o1[LAST] || ""),
  lineOf(o1[LAST], /^CORE \(/));
check("page 1: imported is in the core, still not in GIVEN", !/\bimported\b/.test(given6), given6);

check("page 2 (control): run", !r2.error, r2.error);
check("page 2 (control): with no global, imported is GIVEN exactly as on df28",
  /^GIVEN \(\d+ — data cells and zero-input constants, assumed correct\): /.test(given2) && /\bimported\b/.test(given2), given2);
check("page 2 (control): no demotion sentence anywhere",
  !SENT.test(o2[0] || "") && !REL_SENT.test(o2[0] || "") && !HOLE_SENT.test(o2[0] || ""), (o2[0] || "").slice(0, 400));

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${failed ? "FAIL" : "PASS"} given-smoke: ${checks.length - failed}/${checks.length} assertions`);
process.exit(failed ? 1 : 0);
