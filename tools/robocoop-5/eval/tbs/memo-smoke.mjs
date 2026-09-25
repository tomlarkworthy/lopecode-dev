// df28: the BOOT MEMO across real page reboots, in oracle mode with no model calls. driver-core
// opens a fresh browser context per runQuestion, so each call below is a genuine reboot of the
// notebook, and the only thing carried between them is the collected ledger.
//
// What it has to show:
//   page 1  slowRef (a ~6 s deterministic data cell downstream of est) computes once, and the
//           collected ledger carries a memo entry for it and none for the fast control cell.
//   page 2  the memo is restored, slowRef is served from it (its run counter never moves, the first
//           tool call lands seconds earlier), core_status says "BOOT MEMO: 1 cells restored", and
//           attest(est <- slowRef) STILL passes the df20 mutation check — which it can only do by
//           recomputing slowRef in the scratch clone, so the counter moves by exactly one there.
//   page 3  est is seeded EDITED, so slowRef's transitive key changes: the memo MISSES, the cell
//           recomputes, and the attestation is stale exactly as df16 leaves it.
//   page 4  the SAME restore source placed only at setup.init (where driver-core runs it, AFTER
//           seedFiles) — the memo lands too late to stop the cell, which is why the pre-boot
//           placement in pages 2-3 is the one that pays.
//
//   node tbs/memo-smoke.mjs [--notebook path]

import { join, resolve } from "node:path";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { LEDGER_COLLECT, ledgerRestoreSource } from "./ledger.mjs";
import { MODULE_MEMO, MODULE_MEMO_V2 } from "./attest-fixture.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df28.html")));

const M = "@test/memo";
const PATH = "/src/@test/memo.js";
const at = (cell, evidence, kind) => ({ tool: "attest", args: { module: M, cell, evidence, ...(kind ? { kind } : {}) } });
const cs = () => ({ tool: "core_status", args: { module: M } });
// performance.now() is milliseconds since the page navigated, so it dates the first tool call on the
// page's own clock — boot, seed, mount and init all included.
const PROBE = `return 'PROBE<<' + JSON.stringify({ runs: globalThis.__rc5SlowRuns || 0, t: Math.round(performance.now()), memo: (globalThis.__rc5MemoStats ? globalThis.__rc5MemoStats() : null) }) + '>>';`;
const probe = () => ({ tool: "eval_js", args: { module: M, code: PROBE } });
// A slow cell's timing is recorded when its value settles, so give a page whose only step is a probe
// a moment to get there before reading core_status (page 1 and 2 already spend 6 s in an attest).
const wait = (ms) => ({ tool: "eval_js", args: { module: M, code: `await new Promise(r => setTimeout(r, ${ms})); return "waited";` } });

const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "\n       " + String(detail).replace(/\n/g, "\n       ") : ""}`); };
const toolOuts = (r) => (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
const readProbe = (s) => { const m = /PROBE<<([\s\S]*?)>>/.exec(String(s)); try { return m ? JSON.parse(m[1]) : null; } catch (e) { return null; } };
const memoNames = (c) => (c?.memo || []).map((e) => e.name).sort();

const driver = await createDriver({ notebookPath: notebook, apiKey: "oracle", model: "oracle", timeoutMs: 300000, oracle: true });
const wall = {};
let r1, r2, r3, r4;
const timed = async (k, fn) => { const t = Date.now(); const r = await fn(); wall[k] = Date.now() - t; return r; };
try {
  // page 1: cold. slowRef computes, gets timed, and lands in the memo.
  r1 = await timed("p1", () => driver.runQuestion({
    id: "memo-1", question: "memo 1",
    setup: { files: { [PATH]: MODULE_MEMO }, collect: LEDGER_COLLECT },
    oracle: [probe(), at("est", "slowRef"), probe(), cs()],
  }));
  const restore = ledgerRestoreSource(r1.collected);
  // pages 2-3: the same restore source in BOTH placements — pre-boot (the memo data, which is all
  // the pre-boot branch does) and at setup.init (the cross-check and attest ledgers).
  r2 = await timed("p2", () => driver.runQuestion({
    id: "memo-2", question: "memo 2",
    setup: { files: { [PATH]: MODULE_MEMO }, init: restore, initScript: restore, collect: LEDGER_COLLECT },
    oracle: [probe(), cs(), at("est", "slowRef"), probe()],
  }));
  r3 = await timed("p3", () => driver.runQuestion({
    id: "memo-3", question: "memo 3",
    setup: { files: { [PATH]: MODULE_MEMO_V2 }, init: restore, initScript: restore, collect: LEDGER_COLLECT },
    oracle: [probe(), wait(3000), cs()],
  }));
  // page 4: init only — the placement run-agent.mjs uses today.
  r4 = await timed("p4", () => driver.runQuestion({
    id: "memo-4", question: "memo 4",
    setup: { files: { [PATH]: MODULE_MEMO }, init: restore, collect: LEDGER_COLLECT },
    oracle: [probe(), wait(3000), cs()],
  }));
} finally { await driver.close(); }

const o1 = toolOuts(r1), o2 = toolOuts(r2), o3 = toolOuts(r3), o4 = toolOuts(r4);
const p1a = readProbe(o1[0]), p1b = readProbe(o1[2]);
const p2a = readProbe(o2[0]), p2b = readProbe(o2[3]);
const p3a = readProbe(o3[0]), p4a = readProbe(o4[0]);

check("page 1: run", !r1.error, r1.error);
check("page 1: slowRef computed once at boot", p1a?.runs === 1, JSON.stringify(p1a));
check("page 1: attest est <- slowRef is RECORDED (the evidence passes the mutation check)",
  /RECORDED/.test(o1[1] || ""), (o1[1] || "").slice(0, 300));
check("page 1: the mutation check recomputed slowRef in the scratch clone", p1b?.runs === 2, JSON.stringify(p1b));
check("page 1: the collected ledger carries a memo entry for slowRef and none for the fast cell",
  memoNames(r1.collected).join(",") === "slowRef", JSON.stringify(memoNames(r1.collected)));
check("page 1: core_status reports the slow cell as recomputed",
  /BOOT MEMO: 0 cells restored, 1 recomputed \(slow cells > 5 s\)/.test(o1[3] || ""),
  (o1[3] || "").split("\n").filter((l) => /BOOT MEMO/.test(l)).join(" "));

check("page 2: run", !r2.error, r2.error);
check("page 2: slowRef never ran — it was served from the memo", p2a?.runs === 0, JSON.stringify(p2a));
check("page 2: core_status says BOOT MEMO: 1 cells restored, 0 recomputed",
  /BOOT MEMO: 1 cells restored, 0 recomputed/.test(o2[1] || ""),
  (o2[1] || "").split("\n").filter((l) => /BOOT MEMO/.test(l)).join(" "));
check("page 2: the memoised cell still yields its rows — attest est <- slowRef is RECORDED",
  /RECORDED/.test(o2[2] || ""), (o2[2] || "").slice(0, 300));
check("page 2: the mutation check ran the REAL definition in the clone, not the memo stub",
  p2b?.runs === 1, JSON.stringify(p2b));
check("page 2: the first tool call lands at least 5 s earlier than on page 1",
  typeof p1a?.t === "number" && typeof p2a?.t === "number" && p1a.t - p2a.t >= 5000,
  `page1 t=${p1a?.t}ms  page2 t=${p2a?.t}ms  delta=${(p1a?.t ?? 0) - (p2a?.t ?? 0)}ms`);

check("page 3: run", !r3.error, r3.error);
check("page 3: an edit to est misses the memo — 0 cells restored, 1 recomputed",
  /BOOT MEMO: 0 cells restored, 1 recomputed/.test(o3[2] || ""),
  (o3[2] || "").split("\n").filter((l) => /BOOT MEMO/.test(l)).join(" "));
check("page 3: slowRef recomputed", p3a?.runs === 1, JSON.stringify(p3a));
check("page 3: the attestation on est is stale after the edit, as in df16",
  /attestation by slowRef is stale: cell edited/.test(o3[2] || ""), (o3[2] || "").slice(0, 400));

check("page 4: run", !r4.error, r4.error);
check("page 4: setup.init alone still applies the memo, but only AFTER slowRef has already started",
  /BOOT MEMO: 1 cells restored/.test(o4[2] || "") && p4a?.runs === 1,
  `${(o4[2] || "").split("\n").filter((l) => /BOOT MEMO/.test(l)).join(" ")} | probe ${JSON.stringify(p4a)}`);
check("page 4: the retro placement buys no boot time — the first tool call is no earlier than page 1",
  typeof p4a?.t === "number" && typeof p1a?.t === "number" && p4a.t > p1a.t - 2000,
  `page1 t=${p1a?.t}ms  page4 t=${p4a?.t}ms`);

console.log(`\nwall clock per page (ms): ${JSON.stringify(wall)}`);
console.log(`first tool call on the page clock (ms): p1=${p1a?.t} p2=${p2a?.t} p3=${p3a?.t} p4=${p4a?.t}`);
const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${failed ? "FAIL" : "PASS"} memo-smoke: ${checks.length - failed}/${checks.length} assertions`);
process.exit(failed ? 1 : 0);
