// Audit tool behind README § "2026-08-17 fidelity audit" (T1). Read-only: never rewrites results/.
// Official tau-bench (tau_bench/envs/base.py:108) sets done=True the instant a terminate tool
// (retail: transfer_to_human_agents) is invoked, and calculate_reward() runs at that instant.
// Our port has no terminate handling, so the episode keeps looping. This replays each stored
// trajectory twice: full (self-consistency gate vs the stored reward) and TRUNCATED at the first
// transfer_to_human_agents call, and reports which passes only survive because of the extra steps.
//   node verify-t1-audit.mjs <file.json> [file.json ...]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadData, invokeTool, grade } from "./retail-env.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const EXPORT = JSON.parse(readFileSync(join(here, "retail-export.json"), "utf8"));
const taskByIdx = new Map(EXPORT.tasks.map((t) => [t.idx, t]));

// Replay a trajectory, optionally stopping right after the entry at index `stopAt` (inclusive).
function replay(task, traj, stopAt = Infinity) {
  const data = loadData();
  const initial = loadData();
  const replies = [];
  for (let i = 0; i < traj.length; i++) {
    if (i > stopAt) break;
    const e = traj[i];
    if (e.tool) invokeTool(data, e.tool, e.kwargs || {});
    else if (typeof e.agent === "string") replies.push(e.agent);
  }
  return grade(task, initial, data, replies);
}

// merge by task idx across the given files, later file wins (baseline-full + baseline-retry)
const merged = new Map();
for (const file of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(file, "utf8"));
  for (const r of j.results) merged.set(r.idx, { r, file });
}

const rows = [];
{
  for (const { r, file } of merged.values()) {
    if (!r.trajectory) continue;
    const task = taskByIdx.get(r.idx);
    if (!task) continue;
    const full = replay(task, r.trajectory);
    const xferAt = r.trajectory.findIndex((e) => e.tool === "transfer_to_human_agents");
    const trunc = xferAt >= 0 ? replay(task, r.trajectory, xferAt) : full;
    rows.push({
      file: file.replace(/.*\//, ""), idx: r.idx, stored: r.reward === 1 ? 1 : 0,
      replayFull: full.reward, xferAt,
      nAfter: xferAt >= 0 ? r.trajectory.length - 1 - xferAt : 0,
      truncReward: trunc.reward, truncActions: trunc.r_actions, truncOutputs: trunc.r_outputs,
      truncMissing: trunc.missing,
    });
  }
}

const replayMismatch = rows.filter((x) => x.stored !== x.replayFull);
console.log(`replayed ${rows.length} tasks; full-replay disagrees with stored reward on ${replayMismatch.length}`);
for (const x of replayMismatch) console.log(`   ! ${x.file} task ${x.idx}: stored=${x.stored} replay=${x.replayFull}`);

const withXfer = rows.filter((x) => x.xferAt >= 0);
console.log(`\ntasks containing a transfer_to_human_agents call: ${withXfer.length}`);
console.log("idx  stored  truncReward  r_actions  r_outputs  entriesAfterTransfer  file");
for (const x of withXfer)
  console.log(`${String(x.idx).padStart(4)}  ${x.stored}       ${x.truncReward}            ${String(x.truncActions)}      ${String(x.truncOutputs)}       ${String(x.nAfter).padStart(3)}   ${x.file}${x.truncMissing?.length ? "  missing=" + JSON.stringify(x.truncMissing) : ""}`);

const demoted = withXfer.filter((x) => x.stored === 1 && x.truncReward === 0);
const zeroWithXfer = withXfer.filter((x) => x.stored === 0);
console.log(`\nDEMOTED (pass only because the episode continued past the transfer): ${demoted.map((x) => x.idx).join(", ") || "none"}`);
console.log(`reward-0 tasks with a transfer call: ${zeroWithXfer.map((x) => x.idx).join(", ") || "none"} — none can be RESCUED by terminating early (already 0 at the end; truncation only removes work): ` +
  zeroWithXfer.every((x) => x.truncReward === 0));
const storedPass = rows.filter((x) => x.stored === 1).length;
console.log(`\nstored pass ${storedPass}/${rows.length}  ->  terminate-on-transfer corrected ${storedPass - demoted.length}/${rows.length}`);
