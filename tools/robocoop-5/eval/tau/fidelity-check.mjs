// Fidelity gate: replay every task's ground-truth actions through the JS tool port and require
// the final-state delta to match the Python oracle exactly. Also diffs each tool observation
// (parsed deep-equal for JSON observations; exact string otherwise) to catch semantic drift that
// happens not to change graded state.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadData, invokeTool, stateDelta, deepEq } from "./retail-env.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const EXPORT = JSON.parse(readFileSync(join(here, "retail-export.json"), "utf8"));

let stateFail = 0, obsFail = 0, obsChecked = 0;
const initial = loadData();

for (const task of EXPORT.tasks) {
  const data = loadData();
  const observations = task.actions.map((a) => invokeTool(data, a.name, a.kwargs));

  const delta = stateDelta(initial, data);
  if (!deepEq(delta, task.oracle_delta)) {
    stateFail++;
    console.log(`STATE MISMATCH task ${task.idx}`);
    console.log("  js delta:    ", JSON.stringify(delta).slice(0, 300));
    console.log("  oracle delta:", JSON.stringify(task.oracle_delta).slice(0, 300));
  }

  observations.forEach((o, i) => {
    const ref = task.oracle_observations[i];
    obsChecked++;
    let ok;
    if (typeof ref === "string" && /^[[{]/.test(ref.trim()) && /^[[{]/.test(String(o).trim())) {
      try { ok = deepEq(JSON.parse(o), JSON.parse(ref)); } catch { ok = o === ref; }
    } else {
      ok = String(o) === String(ref);
    }
    if (!ok) {
      obsFail++;
      console.log(`OBS MISMATCH task ${task.idx} action ${i} (${task.actions[i].name})`);
      console.log("  js:    ", String(o).slice(0, 200));
      console.log("  oracle:", String(ref).slice(0, 200));
    }
  });
}

console.log(`\nstate: ${EXPORT.tasks.length - stateFail}/${EXPORT.tasks.length} tasks match oracle delta`);
console.log(`observations: ${obsChecked - obsFail}/${obsChecked} match`);
process.exit(stateFail ? 1 : 0);
