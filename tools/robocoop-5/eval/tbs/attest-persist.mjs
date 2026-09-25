// The attest ledger across a real page reboot, in oracle mode with no model calls. driver-core opens
// a fresh browser context per runQuestion, so each call below is a genuine reboot of the notebook.
//
// What it has to show: an attestation is fresh again on the next page WITHOUT re-running anything
// (freshness is the cell's definition hash, recomputed from the re-applied source), and an edit
// between reboots still invalidates it. That is the property df16 buys by hashing definitions
// instead of reading the module apply counter, which a reboot rewrites.
//
//   node attest-persist.mjs [--notebook path]

import { join, resolve } from "node:path";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { LEDGER_COLLECT, ledgerRestoreSource } from "./ledger.mjs";
import { MODULE_ATTEST, MODULE_ATTEST_V2 } from "./attest-fixture.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df16.html")));

const M = "@test/attest";
const PATH = "/src/@test/attest.js";
const at = (cell, evidence, kind) => ({ tool: "attest", args: { module: M, cell, evidence, ...(kind ? { kind } : {}) } });
// df22: the deliverable's path needs a `null` attestation and one kind that is neither reference nor
// null, or the guard rejects however many references stand on it. Page 1 records both so pages 2-3
// still test what they were written to test — that a reboot leaves attestations fresh and an edit
// does not. Both land on cells that are already attested, so the ledger is still two cells wide.
const df22plus = /df2[2-9]|df[3-9]\d/.test(notebook);
const cc = (name, a, b) => ({ tool: "cross_check", args: { module: M, name, a, b } });
const cs = () => ({ tool: "core_status", args: { module: M } });
const guard = `
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
  const i = s.indexOf('completeGuard:'), j = s.indexOf('stallNudgeLimit', i);
  const g = (new Function('return ({' + s.slice(i, j).replace(/,\\s*$/, '') + '})'))().completeGuard;
  const prev = globalThis.__rc5MinTurnMs; globalThis.__rc5MinTurnMs = 0;
  let __guardOut;
  try { __guardOut = g({ toolCallsThisTurn: 3, summary: 'GATES: mean -> 5.5', elapsedMs: 1, vetoes: 0 }); }
  finally { globalThis.__rc5MinTurnMs = prev; }
  return 'GUARD<<' + String(__guardOut) + '>>';
`;
const probe = () => ({ tool: "eval_js", args: { module: M, code: guard } });

const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "\n       " + String(detail).replace(/\n/g, "\n       ") : ""}`); };
const toolOuts = (r) => (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));

const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 240000, oracle: true });
let r1, r2, r3;
try {
  // page 1: build the core from scratch
  r1 = await driver.runQuestion({
    id: "attest-persist-1", question: "attest persist 1",
    setup: { files: { [PATH]: MODULE_ATTEST }, collect: LEDGER_COLLECT },
    oracle: [at("est", "refEst"), at("est", "refEst2"), at("derived", "refDer"), at("derived", "refDer2"),
             cc("dB", "derived", "pB"), cc("dC", "derived", "pC"),
             ...(df22plus ? [at("est", "nullEst", "null"), at("derived", "dB", "crossing")] : []),
             probe()],
  });
  const restore = ledgerRestoreSource(r1.collected);
  // page 2: same module, both ledgers restored, nothing re-run
  r2 = await driver.runQuestion({
    id: "attest-persist-2", question: "attest persist 2",
    setup: { files: { [PATH]: MODULE_ATTEST }, init: restore, collect: LEDGER_COLLECT },
    oracle: [cs(), probe()],
  });
  // page 3: the module is seeded EDITED, so est's hash no longer matches what was attested
  r3 = await driver.runQuestion({
    id: "attest-persist-3", question: "attest persist 3",
    setup: { files: { [PATH]: MODULE_ATTEST_V2 }, init: restore, collect: LEDGER_COLLECT },
    oracle: [cs(), probe()],
  });
} finally { await driver.close(); }

const o1 = toolOuts(r1), o2 = toolOuts(r2), o3 = toolOuts(r3);
check("page 1: run", !r1.error, r1.error);
check("page 1: the guard accepts once est and derived are attested twice each", /GUARD<<null>>/.test(o1[o1.length - 1]), o1[o1.length - 1]);
check("page 1: the attest ledger was collected off the live page", (r1.collected?.attest || []).length === 2, JSON.stringify((r1.collected?.attest || []).map((a) => a.cell)));
check("page 1: the core table came back with est and derived in the core",
  !!r1.collected?.core?.[M] && r1.collected.core[M].core.includes("est") && r1.collected.core[M].core.includes("derived"),
  JSON.stringify(r1.collected?.core?.[M] ?? null));

check("page 2: run", !r2.error, r2.error);
check("page 2: the ledger was restored into the fresh page", r2.collected?.attestRestored === 2, String(r2.collected?.attestRestored));
check("page 2: est and derived are STILL in the core after a reboot, with nothing re-run",
  /CORE \([^)]*\)[^\n]*\best\b/.test(o2[0]) && /\bderived\b/.test((o2[0].match(/^CORE .*$/m) || [""])[0]), o2[0]);
check("page 2: no attestation is reported stale", !/is stale/.test(o2[0]), o2[0]);
check("page 2: the guard still accepts", /GUARD<<null>>/.test(o2[1]), o2[1]);

check("page 3: run", !r3.error, r3.error);
check("page 3: an edit between reboots makes est's attestations stale",
  /attestation by refEst is stale: cell edited/.test(o3[0]), o3[0]);
check("page 3: the guard rejects on the core rule", /not in the VERIFIED CORE/.test(o3[1]), o3[1]);
check("page 3: derived's own (unedited) attestations survive — it blocks on its upstream",
  /derived → upstream est not in core/.test(o3[1]), o3[1]);

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${failed ? "FAIL" : "PASS"} attest-persist: ${checks.length - failed}/${checks.length} assertions`);
process.exit(failed ? 1 : 0);
