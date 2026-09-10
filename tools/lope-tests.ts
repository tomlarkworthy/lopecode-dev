#!/usr/bin/env bun
/**
 * lope-tests.ts - Run every test_* cell in a lopecode notebook (no browser)
 *
 * Test execution is observation-driven: we attach observers to each test_*
 * variable and resolve when all settle. No fixed wait; the only timing fallback
 * is a per-test safety timeout (default 10s) for cells that never settle.
 *
 * Boot still needs the runtime's normal settle loop because modules register
 * async — that's unavoidable. Once boot is done we switch to pure observation.
 *
 * A test_* cell that returns "skipped: <why>" (or {skipped: true, reason}) is
 * reported as SKIPPED, never as passed: a run that executed nothing must not read
 * like a run that passed. Against a --baseline, a test that used to pass and now
 * skips is a regression, listed separately as "silenced".
 *
 * Reports are emitted in CTRF (Common Test Report Format) — https://ctrf.io/
 * Lopecode-specific fields (cell value preview, original "timeout" state) live
 * under each test's `extra` block and the top-level `extra.lopecode`.
 *
 * Usage:
 *   bun tools/lope-tests.ts <notebook.html> [options]
 *
 * Options:
 *   --filter <substr>   Only run tests whose name includes <substr>
 *   --report <path>     Write CTRF JSON report (for regression diffing)
 *   --baseline <path>   Compare against a previous CTRF report; exit 1 on regression
 *   --timeout <ms>      Per-test safety timeout (default 10000)
 *   --hash <#…>         Override location.hash (arms hash-gated suites)
 *   --verbose           Forward runtime debug logs
 *
 * Exit codes:
 *   0 - All tests passed and (when --baseline given) no regressions
 *   1 - Tests failed/timed out, or regression detected vs --baseline
 *   2 - Could not load notebook, no tests found, or every test skipped
 */

import { loadNotebook } from "./lope-runtime.js";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { randomUUID } from "crypto";

interface Args {
  notebook: string;
  filter: string | null;
  report: string | null;
  baseline: string | null;
  timeout: number;
  verbose: boolean;
  hash: string | null;
}

type LopecodeState = "passed" | "failed" | "timeout" | "skipped";

interface TestResult {
  name: string;
  module: string;
  state: LopecodeState;
  durationMs: number;
  value?: string;
  error?: string;
  reason?: string;
}

// A test that declines to run must not report as one that ran. The corpus already
// says so in the value — `return "skipped: no layout engine"` — so that is the
// marker, promoted here from prose to a state. An object form is accepted too.
function skipReason(value: unknown): string | null {
  if (typeof value === "string") {
    const m = /^\s*skipped\s*:\s*(.*)$/is.exec(value);
    return m ? m[1].trim() : null;
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (o.skipped === true || o.__skip === true)
      return String(o.reason ?? o.why ?? "no reason given");
  }
  return null;
}

type CtrfStatus = "passed" | "failed" | "skipped" | "pending" | "other";

interface CtrfTest {
  name: string;
  status: CtrfStatus;
  duration: number;
  suite?: string;
  message?: string;
  extra?: Record<string, unknown>;
}

interface CtrfReport {
  reportFormat: "CTRF";
  specVersion: string;
  reportId: string;
  timestamp: string;
  generatedBy: string;
  results: {
    tool: { name: string; version: string };
    summary: {
      tests: number;
      passed: number;
      failed: number;
      skipped: number;
      pending: number;
      other: number;
      start: number;
      stop: number;
    };
    tests: CtrfTest[];
    extra?: Record<string, unknown>;
  };
}

const TOOL_NAME = "lope-tests";
const TOOL_VERSION = "0.1.0";
const CTRF_SPEC_VERSION = "0.0.0";

const USAGE = `Usage: bun tools/lope-tests.ts <notebook.html> [options]
  --filter <s>     Only tests whose name contains <s>
  --report <f>     Write CTRF JSON report to <f>
  --baseline <f>   Compare to baseline CTRF report; exit 1 on regression
  --timeout <ms>   Per-test safety timeout (default 10000)
  --hash <#…>      Override location.hash (arms hash-gated suites)
  --verbose        Print runtime logs`;

function parseArgs(argv: string[]): Args {
  const out: Args = {
    notebook: "",
    filter: null,
    report: null,
    baseline: null,
    timeout: 10000,
    verbose: false,
    hash: null,
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
    else if (a === "--hash") out.hash = argv[++i];
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
  ...(args.hash ? { hash: args.hash } : {}),
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
      const why = skipReason(v._value);
      finish(why === null
        ? { name, module: mod, state: "passed", durationMs: 0, value: String(v._value).slice(0, 200) }
        : { name, module: mod, state: "skipped", durationMs: 0, reason: why });
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
        const why = skipReason(val);
        finish(why === null
          ? { name, module: mod, state: "passed", durationMs: Date.now() - t0, value: String(val).slice(0, 200) }
          : { name, module: mod, state: "skipped", durationMs: Date.now() - t0, reason: why });
      },
      rejected: (err: any) => {
        clearTimeout(tid);
        finish({ name, module: mod, state: "failed", durationMs: Date.now() - t0, error: err?.message || String(err) });
      },
      pending: () => {},
    };
    // Do NOT preset _reachable: runtime_computeNow queues a variable only when its
    // reachability RISES, and `true > true` is false. The observer above is what
    // raises it; this just marks it dirty. See lope-runtime's runTests.
    (execution.runtime as any)._dirty?.add(v);
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
  const tag = r.state === "passed" ? "  ✓" : r.state === "failed" ? "  ✗" : r.state === "skipped" ? "  ∅" : "  ⧖";
  const dur = r.durationMs ? ` (${r.durationMs}ms)` : "";
  console.log(`${tag} ${r.name}${dur}`);
  if (r.reason) console.log(`      skipped: ${r.reason}`);
  if (r.error) console.log(`      ${r.error.replace(/\n/g, "\n      ")}`);
}

const summary = {
  total: results.length,
  passed: results.filter((r) => r.state === "passed").length,
  failed: results.filter((r) => r.state === "failed").length,
  timeout: results.filter((r) => r.state === "timeout").length,
  skipped: results.filter((r) => r.state === "skipped").length,
};
const stop = Date.now();
const elapsed = stop - start;
console.log(
  `\nTests: ${summary.passed} passed, ${summary.failed} failed, ${summary.timeout} timed out, ` +
  `${summary.skipped} skipped, ${summary.total} total`
);
console.log(`Time:  ${(elapsed / 1000).toFixed(2)}s`);

function toCtrf(): CtrfReport {
  const tests: CtrfTest[] = results.map((r) => {
    // CTRF status enum doesn't have "timeout"; map to "failed" and preserve
    // the original lopecode state under `extra` for fidelity.
    const status: CtrfStatus = r.state === "passed" ? "passed" : r.state === "skipped" ? "skipped" : "failed";
    const extra: Record<string, unknown> = { lopecodeState: r.state };
    if (r.value !== undefined) extra.value = r.value;
    const test: CtrfTest = {
      name: r.name,
      status,
      duration: r.durationMs,
      suite: r.module,
      extra,
    };
    if (r.state === "skipped") test.message = r.reason ?? "skipped";
    else if (r.state === "timeout") test.message = `Timed out after ${r.durationMs}ms`;
    else if (r.error) test.message = r.error;
    return test;
  });

  return {
    reportFormat: "CTRF",
    specVersion: CTRF_SPEC_VERSION,
    reportId: randomUUID(),
    timestamp: new Date(start).toISOString(),
    generatedBy: TOOL_NAME,
    results: {
      tool: { name: TOOL_NAME, version: TOOL_VERSION },
      summary: {
        tests: summary.total,
        passed: summary.passed,
        failed: summary.failed + summary.timeout,
        skipped: summary.skipped,
        pending: 0,
        other: 0,
        start,
        stop,
      },
      tests,
      extra: {
        lopecode: {
          notebook: resolve(args.notebook),
          timeoutMs: args.timeout,
          counts: summary,
        },
      },
    },
  };
}

if (args.report) {
  const report = toCtrf();
  writeFileSync(args.report, JSON.stringify(report, null, 2));
  console.log(`Wrote CTRF report: ${args.report}`);
}

function passedKey(t: CtrfTest): string {
  return `${t.suite ?? "<main>"}#${t.name}`;
}

let regressed = false;
if (args.baseline) {
  if (!existsSync(args.baseline)) {
    console.error(`Baseline not found: ${args.baseline}`);
    process.exit(2);
  }
  const raw = JSON.parse(readFileSync(args.baseline, "utf8"));
  if (raw?.reportFormat !== "CTRF" || !raw?.results?.tests) {
    console.error(`Baseline is not a CTRF report: ${args.baseline}`);
    process.exit(2);
  }
  const baselineTests: CtrfTest[] = raw.results.tests;
  const currentReport = toCtrf();
  const currentTests = currentReport.results.tests;

  const basePassed = new Map(baselineTests.map((t) => [passedKey(t), t.status === "passed"]));
  const nowStatus = new Map(currentTests.map((t) => [passedKey(t), t.status]));
  const nowPassed = (k: string) => nowStatus.get(k) === "passed";

  const regressions: string[] = [];
  // A test that used to run and now declines to is the one regression a suite can
  // inflict on itself silently, so it is counted but named apart from a failure.
  const silenced: string[] = [];
  const recoveries: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  for (const [k, prev] of basePassed) {
    if (!nowStatus.has(k)) removed.push(k);
    else if (prev && !nowPassed(k)) (nowStatus.get(k) === "skipped" ? silenced : regressions).push(k);
    else if (!prev && nowPassed(k)) recoveries.push(k);
  }
  for (const k of nowStatus.keys()) if (!basePassed.has(k)) added.push(k);

  console.log("\n=== regression check ===");
  console.log(`regressions: ${regressions.length}`);
  for (const r of regressions) console.log(`  ✗ ${r}`);
  console.log(`silenced:    ${silenced.length}`);
  for (const r of silenced) console.log(`  ∅ ${r} (was passing, now skips)`);
  console.log(`recoveries:  ${recoveries.length}`);
  for (const r of recoveries) console.log(`  ✓ ${r}`);
  if (added.length) console.log(`added:       ${added.length}`);
  if (removed.length) console.log(`removed:     ${removed.length}`);
  regressed = regressions.length + silenced.length > 0;
}

const failed = summary.failed + summary.timeout > 0;
// A run in which nothing executed is not a pass, however green the summary looks.
if (summary.total > 0 && summary.passed + summary.failed + summary.timeout === 0) {
  console.error("Every test skipped — nothing was executed.");
  process.exit(2);
}
process.exit(regressed || failed ? 1 : 0);
