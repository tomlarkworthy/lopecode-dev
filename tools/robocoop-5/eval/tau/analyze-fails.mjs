// Failure autopsy: for each failing result, replay its trajectory's tool calls through the env,
// then structurally diff the resulting state-delta against the oracle delta. Classifies each fail:
// MISSING (oracle changed an object we didn't), EXTRA (we changed an object oracle didn't), or
// per-attribute WRONG (both changed it, differently — shows exact paths).
//   node analyze-fails.mjs results/agent-latest.json [more.json ...]
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadData, invokeTool, stateDelta, deepEq } from "./retail-env.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const EXPORT = JSON.parse(readFileSync(join(here, "retail-export.json"), "utf8"));
const taskByIdx = new Map(EXPORT.tasks.map((t) => [t.idx, t]));

function diffPaths(a, b, p, out) { // a = agent, b = oracle
  if (typeof a === "number" && typeof b === "number") { if (Math.abs(a - b) > 1e-9) out.push(`${p}: ${a} vs oracle ${b}`); return; }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) { out.push(`${p}: len ${a.length} vs oracle ${b.length}`); return; }
    a.forEach((v, i) => diffPaths(v, b[i], `${p}[${i}]`, out)); return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
      if (!(k in a)) out.push(`${p}.${k}: MISSING (oracle has ${JSON.stringify(b[k]).slice(0, 60)})`);
      else if (!(k in b)) out.push(`${p}.${k}: EXTRA (${JSON.stringify(a[k]).slice(0, 60)})`);
      else diffPaths(a[k], b[k], `${p}.${k}`, out);
    return;
  }
  if (a !== b) out.push(`${p}: ${JSON.stringify(a)?.slice(0, 60)} vs oracle ${JSON.stringify(b)?.slice(0, 60)}`);
}

for (const file of process.argv.slice(2)) {
  const rs = JSON.parse(readFileSync(file, "utf8")).results.filter((r) => !r.reward && !r.error);
  for (const r of rs) {
    const task = taskByIdx.get(r.idx);
    if (!task || !r.trajectory) continue;
    const initial = loadData();
    const data = loadData();
    const mutObs = [];
    for (const t of r.trajectory) if (t.tool) mutObs.push({ tool: t.tool, err: /^Error/.test(String(invokeTool(data, t.tool, t.kwargs))) });
    const delta = stateDelta(initial, data);
    if (deepEq(delta, task.oracle_delta)) { console.log(`task ${r.idx}: replay MATCHES oracle?! (trajectory truncation or outputs issue)`); continue; }
    const sections = {};
    for (const sec of ["orders", "users", "products"]) {
      const a = delta[sec] || {}, b = task.oracle_delta[sec] || {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (!(k in a)) sections[`${sec}/${k}`] = ["MISSING: oracle mutated this object, agent did not"];
        else if (!(k in b)) sections[`${sec}/${k}`] = ["EXTRA: agent mutated this object, oracle did not"];
        else { const out = []; diffPaths(a[k], b[k], "", out); sections[`${sec}/${k}`] = out.slice(0, 6); }
      }
    }
    const failedCalls = mutObs.filter((m) => m.err).map((m) => m.tool);
    console.log(`\n==== task ${r.idx} (${file.replace(/.*\//, "")})  toolErrors=[${failedCalls.join(",")}]`);
    for (const [k, out] of Object.entries(sections)) console.log(`  ${k}:`); for (const [k, out] of []) void k;
    for (const [k, out] of Object.entries(sections)) for (const line of out) console.log(`    ${k} ${line}`);
  }
}
