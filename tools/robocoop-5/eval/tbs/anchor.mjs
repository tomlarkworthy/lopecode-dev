// Fidelity anchor: run each task's OFFICIAL solution in its official env image, then grade the
// artifacts through OUR grader path (host layout + official tests image). Every task must come back
// reward 1 before any agent arm is trusted. Also records solution wall time — the compute the
// reference needs, which bounds what a browser arm can be expected to do.
//   node anchor.mjs [--slugs a,b] [--rebuild] [--json out]

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadTasks, ensureImages, here } from "./tasks.mjs";
import { runSolution, walkText } from "./docker.mjs";
import { gradeFiles } from "./grade.mjs";
import { rmSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const slugs = flag("--slugs", null)?.split(",") ?? null;
const rebuild = args.includes("--rebuild");
const jsonOut = flag("--json", join(here, "results", "anchor.json"));

const results = [];
for (const task of loadTasks({ slugs })) {
  const started = Date.now();
  process.stdout.write(`${task.slug}: images…`);
  ensureImages(task, { rebuild });
  process.stdout.write(` solution…`);
  const sol = runSolution(task.envTag, join(task.dir, "solution"), task.artifacts, { timeoutSec: 4 * 3600, cpus: task.cpus, memoryMb: task.memoryMb });
  const { files, binary } = walkText(sol.hostDir);
  rmSync(sol.hostDir, { recursive: true, force: true });
  process.stdout.write(` ${Math.round(sol.seconds)}s, ${Object.keys(files).length} text artifacts${binary.length ? ` (+${binary.length} binary, NOT graded)` : ""}; verifier…`);
  const g = Object.keys(files).length ? gradeFiles(task, files) : { pass: false, reward: 0, output: "solution produced no text artifacts: " + sol.output.slice(-800) };
  const rec = { slug: task.slug, solutionOk: sol.ok, solutionSeconds: Math.round(sol.seconds), artifactsMissing: sol.missing, binaryArtifacts: binary, reward: g.reward, pass: g.pass, ctrf: g.ctrf ?? null, tail: g.pass ? null : g.output.slice(-1500), durationMs: Date.now() - started };
  results.push(rec);
  console.log(` ${g.pass ? "PASS" : "FAIL"}${g.pass ? "" : "\n" + (g.output || "").split("\n").slice(-12).join("\n")}`);
  mkdirSync(join(here, "results"), { recursive: true });
  writeFileSync(jsonOut, JSON.stringify({ anchoredAt: new Date().toISOString(), results }, null, 1));
}
console.log(`\nanchored ${results.filter((r) => r.pass).length}/${results.length}; wrote ${jsonOut}`);
