#!/usr/bin/env node
// Replay verification for the τ-bench fidelity fixes (T1 terminate-on-transfer, T9 outputs corpus).
// Zero model calls: every number here comes from re-folding STORED trajectories through
// retail-env.mjs and re-grading them under the new rules.
//
// T1 (envs/retail/env.py `terminate_tools = ["transfer_to_human_agents"]`, envs/base.py:108) —
//   replay each episode twice: to the end (a self-consistency gate against the stored reward) and
//   cut at the first transfer call. Passes that survive only because the episode kept going are
//   DEMOTED. Truncation can never rescue a failure — it only removes work — which is checked, not
//   assumed.
// T9 (envs/base.py:150, calculate_reward scans EVERY respond action) — the results JSON only keeps
//   each turn's FINAL reply, so it cannot show mid-turn text. Where a full session capture exists
//   (results/trajectories/task-N.json, written by --trajectories) the corpus is rebuilt from every
//   assistant text message and the two grades are compared.
//
//   node replay-fidelity.mjs [--trajectories dir]
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadData, invokeTool, grade, assistantTexts, TERMINATE_TOOLS } from "./retail-env.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const trajDir = flag("--trajectories", join(here, "results", "trajectories"));
const EXPORT = JSON.parse(readFileSync(join(here, "retail-export.json"), "utf8"));
const taskByIdx = new Map(EXPORT.tasks.map((t) => [t.idx, t]));

const ROLLS = {
  baseline: ["results/baseline-full.json", "results/baseline-retry.json"],
  agent: ["results/agent-final-shard0.json", "results/agent-final-shard1.json"],
  gate: ["results/gate-principles-shard0.json", "results/gate-principles-shard1.json"],
};

/** Fold a results-JSON `trajectory` into a fresh DB, optionally stopping after entry `stopAt`. */
function replayTrajectory(task, traj, stopAt = Infinity) {
  const data = loadData(), initial = loadData(), replies = [];
  for (let i = 0; i < traj.length && i <= stopAt; i++) {
    const e = traj[i];
    if (e.tool) invokeTool(data, e.tool, e.kwargs || {});
    else if (typeof e.agent === "string") replies.push(e.agent);
  }
  return grade(task, initial, data, replies);
}

const transferAt = (traj) => traj.findIndex((e) => TERMINATE_TOOLS.includes(e.tool));

// merge by task idx across a roll's files; a later file (a retry) wins
function mergeRoll(files) {
  const merged = new Map();
  for (const f of files) {
    const path = join(here, f);
    if (!existsSync(path)) { console.log(`  (missing ${f})`); continue; }
    for (const r of JSON.parse(readFileSync(path, "utf8")).results) merged.set(r.idx, r);
  }
  return merged;
}

console.log("=== T1: terminate-on-transfer, replayed from stored trajectories ===");
const rollRows = {};
for (const [name, files] of Object.entries(ROLLS)) {
  const merged = mergeRoll(files);
  const rows = [];
  for (const r of merged.values()) {
    const task = taskByIdx.get(r.idx);
    if (!task || !r.trajectory) { rows.push({ idx: r.idx, stored: r.reward === 1 ? 1 : 0, corrected: r.reward === 1 ? 1 : 0, noTraj: true }); continue; }
    const full = replayTrajectory(task, r.trajectory);
    const at = transferAt(r.trajectory);
    const cut = at >= 0 ? replayTrajectory(task, r.trajectory, at) : full;
    rows.push({
      idx: r.idx, stored: r.reward === 1 ? 1 : 0, replayFull: full.reward,
      transferAt: at, corrected: cut.reward, r_actions: cut.r_actions, r_outputs: cut.r_outputs, missing: cut.missing,
    });
  }
  rows.sort((a, b) => a.idx - b.idx);
  rollRows[name] = rows;

  const n = rows.length;
  const stored = rows.filter((x) => x.stored === 1).length;
  const corrected = rows.filter((x) => x.corrected === 1).length;
  const drift = rows.filter((x) => !x.noTraj && x.stored !== x.replayFull);
  const withXfer = rows.filter((x) => x.transferAt >= 0);
  const demoted = withXfer.filter((x) => x.stored === 1 && x.corrected === 0);
  const rescued = withXfer.filter((x) => x.stored === 0 && x.corrected === 1);
  console.log(`\n${name}: stored ${stored}/${n} -> corrected ${corrected}/${n}`);
  console.log(`  transfer_to_human_agents episodes: ${withXfer.length} [${withXfer.map((x) => x.idx).join(",")}]`);
  console.log(`  DEMOTED by T1: ${demoted.map((x) => x.idx).join(",") || "none"}`);
  console.log(`  rescued (must be none — truncation only removes work): ${rescued.map((x) => x.idx).join(",") || "none"}`);
  if (drift.length) console.log(`  !! full-replay disagrees with the stored reward on: ${drift.map((x) => `${x.idx}(stored=${x.stored} replay=${x.replayFull})`).join(", ")}`);
  else console.log(`  full-replay reproduces every stored reward (${n} tasks)`);
  for (const d of demoted) console.log(`     task ${d.idx}: cut r_actions=${d.r_actions} r_outputs=${d.r_outputs}${d.missing?.length ? " missing=" + JSON.stringify(d.missing) : ""}`);
}

console.log("\n=== T9: outputs corpus over ALL assistant text (full session captures) ===");
// Rebuild the episode from the captured session messages: fold every tool call into a fresh DB and
// collect assistant text, under three corpora — turn-final replies only (old), every assistant text
// (T9), and every assistant text before the transfer (T1+T9).
function replayConversation(task, cap) {
  const conv = cap.conversation || [];
  let cutAt = conv.findIndex((m) => (m.tool_calls || []).some((tc) => TERMINATE_TOOLS.includes(tc?.function?.name)));
  if (cutAt < 0) cutAt = Infinity;
  const fold = (stopAt) => {
    const data = loadData();
    for (let i = 0; i < conv.length && i <= stopAt; i++) {
      for (const tc of conv[i].tool_calls || []) {
        let kwargs = {};
        try { kwargs = JSON.parse(tc.function?.arguments || "{}"); } catch {}
        invokeTool(data, tc.function?.name, kwargs);
      }
    }
    return data;
  };
  const initial = loadData();
  const full = fold(Infinity);        // the episode as it actually ran
  const cut = fold(cutAt);            // state frozen at the terminate call (T1)
  const all = assistantTexts(conv);
  const beforeCut = assistantTexts(conv.slice(0, cutAt === Infinity ? conv.length : cutAt));
  return {
    hasTransfer: cutAt !== Infinity,
    finalOnly: grade(task, initial, full, cap.agentReplies || []),
    allText: grade(task, initial, full, all),
    cutAllText: grade(task, initial, cut, beforeCut),
    nAll: all.length, nFinal: (cap.agentReplies || []).length,
  };
}

if (!existsSync(trajDir)) {
  console.log(`  no session captures at ${trajDir} — skipped`);
} else {
  const rows = [];
  for (const [idx, task] of taskByIdx) {
    const p = join(trajDir, `task-${idx}.json`);
    if (!existsSync(p)) continue;
    const cap = JSON.parse(readFileSync(p, "utf8"));
    if (!cap.conversation?.length) continue;
    rows.push({ idx, stored: cap.reward === 1 ? 1 : 0, ...replayConversation(task, cap) });
  }
  const n = rows.length;
  const sum = (k) => rows.filter((x) => x[k].reward === 1).length;
  console.log(`  ${n} captures in ${trajDir.replace(/.*\//, "")}/  (stored pass ${rows.filter((x) => x.stored === 1).length}/${n})`);
  console.log(`  replayed from the conversation: turn-final corpus ${sum("finalOnly")}/${n}  ALL-text corpus ${sum("allText")}/${n}  ALL-text + terminate-cut ${sum("cutAllText")}/${n}`);
  const t9gain = rows.filter((x) => x.finalOnly.reward === 0 && x.allText.reward === 1);
  console.log(`  T9 rescues (required output was in a NON-final assistant message): ${t9gain.map((x) => x.idx).join(",") || "none"}`);
  const t1loss = rows.filter((x) => x.allText.reward === 1 && x.cutAllText.reward === 0);
  console.log(`  T1 demotions under the ALL-text corpus: ${t1loss.map((x) => x.idx).join(",") || "none"}`);
  const outputsOnly = rows.filter((x) => x.finalOnly.r_outputs !== x.allText.r_outputs);
  console.log(`  episodes whose r_outputs changes with the corpus: ${outputsOnly.map((x) => x.idx).join(",") || "none"}`);
}
