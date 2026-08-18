// Audit tool behind README § "2026-08-17 fidelity audit". Read-only: it never rewrites results/.
// grade.mjs brace-extracts the target function out of a plain-JS candidate and discards the rest,
// which deleted a `require` and two helper functions from three correct baseline solutions. This
// regrades EVERY stored baseline candidate official-MultiPL-E style — whole candidate text + '\n' +
// the problem's tests, one node subprocess each, 5s timeout — and diffs against the stored `pass`.
// Sweeps all 161 rather than the suspected 3, because the extraction could also have RESCUED a
// candidate whose broken top-level code it happened to remove.
//   node verify-h1-audit.mjs        # -> 3 rescued, 0 broken, 150/161 -> 153/161
//
// Deliberately does NOT import grade.mjs: it builds and spawns the program itself, so it is an
// independent check on the grader rather than a restatement of it. regrade-h1.mjs is the other
// direction — the same regrade THROUGH the fixed grade.mjs, covering both arms. They agree.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { discordantPairTest, jeffreysInterval } from "../../../robocoop-eval/stats.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const problems = JSON.parse(readFileSync(join(here, "humaneval-js.json"), "utf8"));
const testsOf = new Map(problems.map((p) => [p.name, p.tests]));
const baseline = JSON.parse(readFileSync(join(here, "results", "baseline-full.json"), "utf8"));

function runWhole(candidate, tests, timeoutMs = 5000) {
  const dir = mkdtempSync(join(tmpdir(), "h1v-"));
  const file = join(dir, "prog.cjs");
  writeFileSync(file, candidate + "\n" + tests + "\n");
  const r = spawnSync("node", [file], { timeout: timeoutMs, encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  return {
    pass: r.status === 0,
    error: r.status === 0 ? null : (r.signal ? `killed (${r.signal})` : (r.stderr || "").split("\n").slice(0, 4).join("\n")),
  };
}

const rows = [];
for (const r of baseline.results) {
  const tests = testsOf.get(r.name);
  if (tests == null) { console.log("NO TESTS", r.name); continue; }
  if (r.candidate == null) { rows.push({ name: r.name, old: r.pass, whole: false, note: "no candidate" }); continue; }
  const w = runWhole(r.candidate, tests);
  rows.push({ name: r.name, old: r.pass, whole: w.pass, error: w.error });
}

const rescued = rows.filter((x) => !x.old && x.whole);
const broken = rows.filter((x) => x.old && !x.whole);
const stillFail = rows.filter((x) => !x.old && !x.whole);
console.log("\n== RESCUED (old FAIL -> whole-program PASS) ==");
for (const x of rescued) console.log("  +", x.name);
console.log("== BROKEN (old PASS -> whole-program FAIL) ==");
for (const x of broken) console.log("  -", x.name, "|", (x.error || "").split("\n")[0].slice(0, 100));
console.log("== STILL FAIL ==");
for (const x of stillFail) console.log("  .", x.name);
const oldPass = rows.filter((x) => x.old).length;
const newPass = rows.filter((x) => x.whole).length;
console.log(`\nold: ${oldPass}/${rows.length}  whole-program: ${newPass}/${rows.length}`);

// Paired stats against the agent arm, old vs corrected. ../ladder.mjs --paired prints the OLD one
// from the stored `pass` fields; this is the same computation on the regraded baseline.
const agent = JSON.parse(readFileSync(join(here, "results", "agent-merged.json"), "utf8")).results;
const A = new Map(agent.map((r) => [r.name, !!r.pass]));
for (const key of ["old", "whole"]) {
  let bothPass = 0, bothFail = 0, agentOnly = [], baseOnly = [];
  for (const x of rows) {
    const ap = A.get(x.name), bp = x[key];
    if (ap && bp) bothPass++;
    else if (!ap && !bp) bothFail++;
    else if (ap) agentOnly.push(x.name); else baseOnly.push(x.name);
  }
  const P = discordantPairTest(baseOnly.length, agentOnly.length);
  const s = rows.filter((x) => x[key]).length, j = jeffreysInterval(s, rows.length - s);
  console.log(`\n[baseline ${key === "old" ? "as stored" : "corrected"}] ${s}/${rows.length} = ${(s / rows.length).toFixed(4)} Jeffreys [${j.lower.toFixed(3)}, ${j.upper.toFixed(3)}]`);
  console.log(`  both-pass ${bothPass} both-fail ${bothFail} agent-only ${agentOnly.length} baseline-only ${baseOnly.length}  P=${P.toFixed(4)}`);
  console.log(`  agent-only: ${agentOnly.map((n) => n.replace(/^HumanEval_\d+_/, "")).join(", ")}`);
  console.log(`  baseline-only: ${baseOnly.map((n) => n.replace(/^HumanEval_\d+_/, "")).join(", ")}`);
}
