#!/usr/bin/env bun
/**
 * lope-tests.ts - Run every test_* cell in a lopecode notebook (no browser)
 *
 * Test execution is observation-driven: we attach observers to each test_*
 * variable and resolve when all settle. No fixed wait; the only timing fallback
 * is a per-test safety timeout (default 60s) for cells that never settle.
 *
 * Boot still needs the runtime's normal settle loop because modules register
 * async — that's unavoidable. Once boot is done we switch to pure observation.
 *
 * Usage:
 *   bun tools/lope-tests.ts <notebook.html> [options]
 *
 * Options:
 *   --filter <substr>   Only run tests whose name includes <substr>
 *   --report <path>     Write JSON report (for regression diffing)
 *   --baseline <path>   Compare against a previous report; exit 1 on regression
 *   --timeout <ms>      Per-test safety timeout (default 10000)
 *   --verbose           Forward runtime debug logs
 *
 * Exit codes:
 *   0 - All tests passed (or only previously-failing tests still failing when --baseline given)
 *   1 - Tests failed/timed out, or regression detected vs --baseline
 *   2 - Could not load notebook or no tests found
 */

import { loadNotebook } from "./lope-runtime.js";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

interface Args {
  notebook: string;
  filter: string | null;
  report: string | null;
  baseline: string | null;
  timeout: number;
  verbose: boolean;
}

interface TestResult {
  name: string;
  module: string;
  state: "passed" | "failed" | "timeout";
  durationMs: number;
  value?: string;
  error?: string;
}

interface Report {
  notebook: string;
  timestamp: string;
  durationMs: number;
  summary: { total: number; passed: number; failed: number; timeout: number };
  tests: TestResult[];
}

const USAGE = `Usage: bun tools/lope-tests.ts <notebook.html> [options]
  --filter <s>     Only tests whose name contains <s>
  --report <f>     Write JSON report to <f>
  --baseline <f>   Compare to baseline; exit 1 on regression
  --timeout <ms>   Per-test safety timeout (default 10000)
  --verbose        Print runtime logs`;

function parseArgs(argv: string[]): Args {
  const out: Args = {
    notebook: "",
    filter: null,
    report: null,
    baseline: null,
    timeout: 10000,
    verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      console.log(USAGE);
      process.exit(0);
    } else if (a === "--filter") out.filter = argv[++i];
    else if (a === "--report") out.report = argv[++i];
    else if (a === "--baseline") out.baseline = argv[++i];
    else if (a === "--timeout") out.timeout = Number(argv[++i]);
    else if (a === "--verbose") out.verbose = true;
    else if (!a.startsWith("--") && !out.notebook) out.notebook = a;
    else {
      console.error(`Unknown arg: ${a}\n${USAGE}`);
      process.exit(2);
    }
  }
  if (!out.notebook) {
    console.error(USAGE);
    process.exit(2);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const start = Date.now();

process.on("unhandledRejection", () => {});

const execution = await loadNotebook(args.notebook, {
  settleTimeout: 30000,
  log: args.verbose ? (m: string) => console.error(m) : () => {},
});

const moduleNameOf = (v: any): string => v?._module?._name || "<main>";

const testVars: any[] = [];
for (const v of (execution.runtime as any)._variables) {
  if (typeof v._name !== "string" || !v._name.startsWith("test_")) continue;
  if (args.filter && !v._name.includes(args.filter)) continue;
  testVars.push(v);
}

if (testVars.length === 0) {
  console.error("No test_* cells found");
  execution.dispose();
  process.exit(2);
}

const results: TestResult[] = [];
const promises = testVars.map((v) => {
  const name = v._name;
  const mod = moduleNameOf(v);
  const t0 = Date.now();
  return new Promise<void>((res) => {
    const finish = (r: TestResult) => {
      results.push(r);
      res();
    };
    const tid = setTimeout(() => {
      finish({ name, module: mod, state: "timeout", durationMs: Date.now() - t0 });
    }, args.timeout);

    if (v._value !== undefined) {
      clearTimeout(tid);
      finish({ name, module: mod, state: "passed", durationMs: 0, value: String(v._value).slice(0, 200) });
      return;
    }
    if (v._error !== undefined) {
      clearTimeout(tid);
      finish({ name, module: mod, state: "failed", durationMs: 0, error: v._error?.message || String(v._error) });
      return;
    }
    v._observer = {
      fulfilled: (val: any) => {
        clearTimeout(tid);
        finish({ name, module: mod, state: "passed", durationMs: Date.now() - t0, value: String(val).slice(0, 200) });
      },
      rejected: (err: any) => {
        clearTimeout(tid);
        finish({ name, module: mod, state: "failed", durationMs: Date.now() - t0, error: err?.message || String(err) });
      },
      pending: () => {},
    };
    if (!v._reachable) {
      v._reachable = true;
      (execution.runtime as any)._dirty?.add(v);
    }
  });
});

execution.computeNow();
await Promise.all(promises);
execution.dispose();

results.sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));

let lastModule: string | null = null;
for (const r of results) {
  if (r.module !== lastModule) {
    console.log(`\n${r.module}`);
    lastModule = r.module;
  }
  const tag = r.state === "passed" ? "  ✓" : r.state === "failed" ? "  ✗" : "  ⧖";
  const dur = r.durationMs ? ` (${r.durationMs}ms)` : "";
  console.log(`${tag} ${r.name}${dur}`);
  if (r.error) console.log(`      ${r.error.replace(/\n/g, "\n      ")}`);
}

const summary = {
  total: results.length,
  passed: results.filter((r) => r.state === "passed").length,
  failed: results.filter((r) => r.state === "failed").length,
  timeout: results.filter((r) => r.state === "timeout").length,
};
const elapsed = Date.now() - start;
console.log(
  `\nTests: ${summary.passed} passed, ${summary.failed} failed, ${summary.timeout} timed out, ${summary.total} total`
);
console.log(`Time:  ${(elapsed / 1000).toFixed(2)}s`);

const report: Report = {
  notebook: resolve(args.notebook),
  timestamp: new Date().toISOString(),
  durationMs: elapsed,
  summary,
  tests: results,
};

if (args.report) {
  writeFileSync(args.report, JSON.stringify(report, null, 2));
  console.log(`Wrote report: ${args.report}`);
}

let regressed = false;
if (args.baseline) {
  if (!existsSync(args.baseline)) {
    console.error(`Baseline not found: ${args.baseline}`);
    process.exit(2);
  }
  const baseline: Report = JSON.parse(readFileSync(args.baseline, "utf8"));
  const baseStates = new Map(baseline.tests.map((t) => [`${t.module}#${t.name}`, t.state]));
  const nowStates = new Map(results.map((t) => [`${t.module}#${t.name}`, t.state]));

  const regressions: string[] = [];
  const recoveries: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  for (const [k, prev] of baseStates) {
    const curr = nowStates.get(k);
    if (!curr) removed.push(k);
    else if (prev === "passed" && curr !== "passed") regressions.push(`${k} (${prev} → ${curr})`);
    else if (prev !== "passed" && curr === "passed") recoveries.push(`${k} (${prev} → passed)`);
  }
  for (const k of nowStates.keys()) if (!baseStates.has(k)) added.push(k);

  console.log("\n=== regression check ===");
  console.log(`regressions: ${regressions.length}`);
  for (const r of regressions) console.log(`  ✗ ${r}`);
  console.log(`recoveries:  ${recoveries.length}`);
  for (const r of recoveries) console.log(`  ✓ ${r}`);
  if (added.length) console.log(`added:       ${added.length}`);
  if (removed.length) console.log(`removed:     ${removed.length}`);
  regressed = regressions.length > 0;
}

const failed = summary.failed + summary.timeout > 0;
process.exit(regressed || failed ? 1 : 0);
