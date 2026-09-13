// Mutation controls for an in-notebook suite: each mutant replaces one exact string in one module block
// of a notebook, the suite runs against the copy (run-suite.ts), and a mutant no test fails is reported
// as SURVIVED. A suite that has never failed has not been shown to test anything.
//
// run: bun tools/merge-forks/mutate-suite.ts <notebook.html> <mutants.json> --module <suite id> [--hash <fragment>] [--prefix test_]
//   mutants.json: {"target": "<module id>", "mutants": [["label", "from", "to"], ...]}
import { readFileSync, mkdirSync } from "node:fs";
import { findSpan, guardedWrite } from "../lib/notebook-blocks.ts";

const args = process.argv.slice(2);
const opt = (flag: string, fallback?: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : fallback; };
const [notebook, table] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const { target, mutants } = JSON.parse(readFileSync(table, "utf8")) as { target: string; mutants: [string, string, string][] };
const html = readFileSync(notebook, "utf8");
const span = findSpan(html, target);
if (!span) throw new Error(`${notebook} has no block ${target}`);
const block = html.slice(span.start, span.end);
const outDir = "tools/merge-forks/.out/mutants";
mkdirSync(outDir, { recursive: true });

const rows: string[] = [];
let survived = 0;
for (const [label, from, to] of mutants) {
  const count = block.split(from).length - 1;
  if (count !== 1) { rows.push(`INVALID   ${label}: "from" occurs ${count} times`); survived++; continue; }
  const mutated = html.slice(0, span.start) + block.replace(from, to) + html.slice(span.end);
  const path = `${outDir}/${label.replace(/\W+/g, "-")}.html`;
  guardedWrite(path, html, mutated, "", `mutant ${label}`);
  const run = Bun.spawnSync(["bun", "tools/merge-forks/run-suite.ts", path, "--module", opt("--module")!, "--hash", opt("--hash", "")!, "--prefix", opt("--prefix", "test_")!, "--timeout", "120000"], { stdout: "pipe", stderr: "pipe" });
  const out = run.stdout.toString();
  const failed = [...out.matchAll(/^(FAIL|PENDING)\s+(\S+)/gm)].map((m) => m[2]);
  const summary = out.match(/^(\d+\/\d+) ok/m)?.[1] ?? "no summary";
  if (failed.length === 0) survived++;
  rows.push(`${failed.length ? "killed  " : "SURVIVED"}  ${label}  (${summary})${failed.length ? "\n            " + failed.join("\n            ") : ""}`);
  console.log(rows.at(-1));
}
console.log(`\n${mutants.length - survived}/${mutants.length} mutants killed`);
process.exit(survived ? 1 : 0);
