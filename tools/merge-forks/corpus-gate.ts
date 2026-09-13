// T8: the corpus gate for a merge. Runs `lope-browser-runner --run-tests --json` on each notebook as it
// is in the working tree and as it was at a git ref (default HEAD), one at a time, and reports every
// test that passed at the ref and does not pass now, by module#name. Then `lope-preflight --baseline`
// over the same notebooks. Exit 1 on either.
//
// A test that fails at the ref as well is not reported: `--run-tests` carries known failures
// (feedback_run_tests_misses_unbooted_modules_and_mislabels), so only the difference is a signal.
//
// run: bun tools/merge-forks/corpus-gate.ts [--ref HEAD] [--test-timeout 30000] [notebook.html ...]
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";

// one per layout variant: several modules in one stack, a row of stacks, a nested column, a single module
const DEFAULT = [
  "lopecode/notebooks/quick_start.html",
  "lopecode/notebooks/@tomlarkworthy_cell-map.html",
  "lopebooks/notebooks/@tomlarkworthy_infinite-canvas.html",
  "lopebooks/notebooks/@tomlarkworthy_computational-blogs-with-claude-code-connectivity.html",
  "lopebooks/notebooks/@tomlarkworthy_editor-5.html",
  "lopecode/notebooks/@tomlarkworthy_lopepage-2.html",
  "lopecode/notebooks/@tomlarkworthy_exporter-3.html"
];

const args = process.argv.slice(2);
const opt = (flag: string, fallback: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : fallback; };
const ref = opt("--ref", "HEAD");
const testTimeout = opt("--test-timeout", "30000");
const listed = args.filter((a, i) => a.endsWith(".html") && !args[i - 1]?.startsWith("--"));
const notebooks = listed.length ? listed : DEFAULT;
const baseDir = "tools/merge-forks/.out/gate-base";

type Test = { state: string; name: string; module: string };
const run = (file: string): Map<string, string> | string => {
  const r = spawnSync("bun", ["tools/lope-browser-runner.ts", file, "--run-tests", "--json", "--test-timeout", testTimeout, "--timeout", "900000"],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  const start = r.stdout.indexOf("[");
  if (start < 0) return `no test report (exit ${r.status}): ${r.stderr.trim().split("\n").slice(-2).join(" | ")}`;
  const tests = JSON.parse(r.stdout.slice(start)) as Test[];
  return new Map(tests.map((t) => [`${t.module}#${t.name}`, t.state]));
};

const problems: string[] = [];
for (const nb of notebooks) {
  const [repo, ...rest] = nb.split("/");
  const shown = spawnSync("git", ["-C", repo, "show", `${ref}:${rest.join("/")}`], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (shown.status !== 0) { problems.push(`${nb}: not at ${ref}`); continue; }
  const base = join(baseDir, repo, basename(nb));
  mkdirSync(dirname(base), { recursive: true });
  writeFileSync(base, shown.stdout);
  const before = run(base);
  const now = existsSync(nb) ? run(nb) : "missing in the working tree";
  if (typeof before === "string") { problems.push(`${nb}: at ${ref}: ${before}`); continue; }
  if (typeof now === "string") { problems.push(`${nb}: now: ${now}`); continue; }
  const count = (m: Map<string, string>) => [...m.values()].filter((s) => s === "passed").length;
  const lost = [...before].filter(([k, s]) => s === "passed" && now.get(k) !== "passed").map(([k]) => `${k} (${now.get(k) ?? "absent"})`);
  console.log(`${nb}: ${ref} ${count(before)}/${before.size} passed, now ${count(now)}/${now.size}${lost.length ? `, ${lost.length} no longer pass` : ""}`);
  for (const l of lost) problems.push(`${nb}: ${l}`);
}

const pre = spawnSync("bun", ["tools/lope-preflight.ts", "--baseline", "tools/preflight-baseline.json", ...notebooks], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const verdict = pre.stdout.split("\n").find((l) => l.includes("vs baseline")) ?? `preflight exit ${pre.status}`;
console.log(`preflight: ${verdict.trim()}`);
if (pre.status !== 0) problems.push(`preflight: ${pre.stdout.split("\n").filter((l) => l.includes("NEW ")).join("; ")}`);

console.log(problems.length ? `FAIL\n  ${problems.join("\n  ")}` : "ok");
process.exit(problems.length ? 1 : 0);
