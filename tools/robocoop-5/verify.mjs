// One command for "did robocoop-5 change what it does": every no-model check against the working notebook,
// each compared with a recorded baseline.
//   node tools/robocoop-5/verify.mjs [--quick] [--notebook path]
// --quick skips the oracle evals (about 4 minutes) and the browser checks.
import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { digest, compare } from "./transcript-diff.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const args = process.argv.slice(2);
const quick = args.includes("--quick");
const notebook = resolve(args.includes("--notebook") ? args[args.indexOf("--notebook") + 1] : join(root, "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const out = join(root, "tools/scratch/verify"); mkdirSync(out, { recursive: true });
const run = (cmd, a, opts = {}) => spawnSync(cmd, a, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28, ...opts });
const rows = [];
const row = (name, ok, detail) => { rows.push([name, ok, detail]); console.log((ok ? "ok    " : "FAIL  ") + name.padEnd(26) + detail); };

// working copies must match the notebook, or the node-side tests read stale code
const st = run("bun", ["tools/lope-sync.ts", "status"]);
const dirty = (st.stdout + st.stderr).split("\n").filter((l) => /robocoop-5/.test(l) && /(modified|STALE|DIVERGED)/.test(l));
row("working copies in sync", dirty.length === 0, dirty.length ? dirty.map((l) => l.trim()).join("; ").slice(0, 200) : "clean");

const wire = run("node", ["tools/robocoop-5/wire-snapshot.mjs", notebook, "--check"]);
for (const l of wire.stdout.split("\n").filter((l) => l.startsWith("wire hash"))) row(l.slice(0, 22).trim(), / same\s*$/.test(l), l.slice(22).trim());
if (!/wire hash/.test(wire.stdout)) row("wire hash", false, (wire.stderr || wire.stdout).split("\n").find((l) => /Error/.test(l))?.slice(0, 200) ?? "no output");

const tests = run("node", ["--test", ...["attribution", "codeframe", "gradefix", "humaneval-grader", "ladder", "reviewer", "speclock", "stamp", "tau-fidelity"].map((t) => `tests/robocoop5/${t}.test.mjs`)]);
row("node tests", tests.status === 0, (tests.stdout.match(/ℹ pass \d+/)?.[0] ?? "") + " " + (tests.stdout.match(/ℹ fail \d+/)?.[0] ?? ""));
for (const t of ["guard-unit-test", "context-unit-test"]) { const r = run("node", [`tools/robocoop-5/${t}.mjs`]); row(t, r.status === 0, (r.stdout.trim().split("\n").pop() ?? "").slice(0, 80)); }

if (!quick) {
  for (const [name, script] of [["boot-smoke", "boot-smoke.mjs"], ["spec-lock-check", "spec-lock-check.mjs"], ["write-feedback-check", "write-feedback-check.mjs"]]) {
    const r = run("node", [`tools/robocoop-5/${script}`, notebook]);
    row(name, r.status === 0, (r.stdout.trim().split("\n").pop() ?? "").slice(0, 110));
  }
  const json = join(out, "oracle.json");
  const o = run("node", ["tools/robocoop-5/eval/run.mjs", "--oracle", "--concurrency", "4", "--notebook", notebook, "--json", json], { timeout: 900000 });
  try {
    const base = JSON.parse(readFileSync(join(here, "oracle-baseline.json"), "utf8"));
    const unstable = new Set(JSON.parse(readFileSync(join(here, "oracle-unstable.json"), "utf8")));
    const diff = compare(base, digest(JSON.parse(readFileSync(json, "utf8"))), unstable);
    row("oracle transcripts", diff.length === 0, Object.keys(base).length + " evals, " + diff.length + " differ" + (diff.length ? ": " + diff.slice(0, 6).map((d) => d.id + " (" + d.kind + ")").join("; ") : ""));
    for (const d of diff.slice(0, 6)) if (d.was != null) console.log("        " + d.id + "\n          was …" + JSON.stringify(d.was) + "\n          now …" + JSON.stringify(d.now));
  } catch (e) { row("oracle transcripts", false, String(e.message).slice(0, 160) + " " + (o.stderr || "").slice(-160)); }
}
const bad = rows.filter((r) => !r[1]);
console.log(bad.length ? "\nVERIFY FAIL: " + bad.map((r) => r[0]).join(", ") : "\nVERIFY PASS (" + rows.length + " checks)");
process.exit(bad.length ? 1 : 0);
