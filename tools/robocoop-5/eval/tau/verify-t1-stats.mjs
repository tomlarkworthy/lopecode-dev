// Audit tool behind README § "2026-08-17 fidelity audit". Applies terminate-on-transfer to every
// stored roll, then prints Jeffreys bands and discordant-pair sign tests, uncorrected vs corrected.
// The [stored] yieldfix-vs-gate line reproduces the published P = 0.6900 exactly, which is the
// cross-check that this pipeline agrees with ../ladder.mjs before its corrected numbers are trusted.
//   node verify-t1-stats.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadData, invokeTool, grade } from "./retail-env.mjs";
import { discordantPairTest, jeffreysInterval } from "../../../robocoop-eval/stats.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const EXPORT = JSON.parse(readFileSync(join(here, "retail-export.json"), "utf8"));
const taskByIdx = new Map(EXPORT.tasks.map((t) => [t.idx, t]));

function replay(task, traj, stopAt = Infinity) {
  const data = loadData(), initial = loadData(), replies = [];
  for (let i = 0; i < traj.length && i <= stopAt; i++) {
    const e = traj[i];
    if (e.tool) invokeTool(data, e.tool, e.kwargs || {});
    else if (typeof e.agent === "string") replies.push(e.agent);
  }
  return grade(task, initial, data, replies);
}

function roll(files) {
  const merged = new Map();
  for (const f of files) for (const r of JSON.parse(readFileSync(join(here, f), "utf8")).results) merged.set(r.idx, r);
  const out = new Map();
  for (const r of merged.values()) {
    const task = taskByIdx.get(r.idx);
    let corrected = r.reward === 1 ? 1 : 0;
    if (task && r.trajectory) {
      const at = r.trajectory.findIndex((e) => e.tool === "transfer_to_human_agents");
      if (at >= 0) corrected = replay(task, r.trajectory, at).reward;
    }
    out.set(r.idx, { stored: r.reward === 1 ? 1 : 0, corrected });
  }
  return out;
}

const rolls = {
  baseline: roll(["results/baseline-full.json", "results/baseline-retry.json"]),
  yieldfix: roll(["results/agent-final-shard0.json", "results/agent-final-shard1.json"]),
  gate: roll(["results/gate-principles-shard0.json", "results/gate-principles-shard1.json"]),
};

for (const [name, m] of Object.entries(rolls)) {
  const n = m.size;
  for (const key of ["stored", "corrected"]) {
    const s = [...m.values()].filter((x) => x[key] === 1).length;
    const j = jeffreysInterval(s, n - s);
    console.log(`${name.padEnd(9)} ${key.padEnd(9)} ${s}/${n} = ${(s / n).toFixed(4)}  Jeffreys [${j.lower.toFixed(3)}, ${j.upper.toFixed(3)}]`);
  }
}

function paired(aName, bName, key) {
  const A = rolls[aName], B = rolls[bName];
  let bothPass = 0, bothFail = 0, aOnly = [], bOnly = [];
  for (const [idx, a] of A) {
    const b = B.get(idx); if (!b) continue;
    if (a[key] && b[key]) bothPass++;
    else if (!a[key] && !b[key]) bothFail++;
    else if (a[key]) aOnly.push(idx); else bOnly.push(idx);
  }
  const P = discordantPairTest(aOnly.length, bOnly.length);
  console.log(`\n[${key}] ${aName} vs ${bName}: both-pass ${bothPass} both-fail ${bothFail} ${aName}-only ${aOnly.length} ${bName}-only ${bOnly.length}  P=${P.toFixed(4)}`);
  console.log(`   ${aName}-only: ${aOnly.join(",")}`);
  console.log(`   ${bName}-only: ${bOnly.join(",")}`);
}
for (const key of ["stored", "corrected"]) {
  paired("baseline", "yieldfix", key);
  paired("yieldfix", "gate", key);
  paired("baseline", "gate", key);
}
