#!/usr/bin/env bun
// verify-run.ts WORKER [--times N] [--shell FILE] [--base NAME|URL] [--timeout SECONDS]
//
// Opens the address the deployer opens to verify a deploy of WORKER (brain-deployer.ojs, verifyDeploy), N times,
// in a local headless Chrome, and reads the verdict brain-shell leaves at window.__brainVerdict. It reads only.
//
//   BRAIN_BASE=cb4 bun tools/cloud-brain/verify-run.ts brain-x-snapshot --times 20
//   bun tools/cloud-brain/verify-run.ts brain-x-logs --shell tools/cloud-brain/.emitted/verify.html
//
// --shell FILE   answer the document at BASE/ with this file; every other request goes to the Brain.
// --base         cb4 (the default, or BRAIN_BASE), or a whole address.
// --timeout      how long one run waits for a verdict, 150 s by default.
// CHROME=path    another Chrome than Playwright's own. With none, and Playwright's own build not installed, the
//                newest chromium_headless_shell-N beside where it would be is used; the start line names the version.
//
// stdout: one line of JSON for the start, one a run, one summary. A run's `ran` is the test_ cells that had a
// value when the verdict was read, by module.
// Exit 1: a test passed and failed on one hash, or a module other than brain-shell and the Worker's ran a test.
//         A module named @test/… is a fixture a test of brain-shell joins to the page, and is not counted.
// Exit 2: neither of those, and a run failed or gave no verdict.
// Exit 0: every run passed and nothing else ran a test.
// Exit 64: the arguments. Exit 70: the tool could not run (no deployer, no such Worker, no Chrome, no file).
// Spec: plan/cloud-brain-deploy-verdict-from-a-shared-page.md, design 3. Record: records/dv-1-verify-run-tool.md.
import { readFileSync } from "node:fs";
import { chromeFor as sharedChromeFor } from "../lib/playwright-chrome.js";

export const SHELL = "@tomlarkworthy/brain-shell";
export const FIXTURE = /^@test\//;

export type Run = {
  hash?: string | null;
  ok?: boolean;
  none?: string;
  names?: string[]; // every test_ cell of the Worker's module
  failed?: { name: string; message?: string }[];
  ran?: Record<string, number>; // module -> test_ cells that had a value
  otherTestsRan?: number | null;
  ms?: number | null; // the verdict's own time
  wall?: number; // goto to verdict
  heapMB?: number | null;
  variables?: number | null;
};

export const usage = "verify-run.ts WORKER [--times N] [--shell FILE] [--base NAME|URL] [--timeout SECONDS]";

export function parseArgs(argv: string[], env: Record<string, string | undefined> = {}) {
  const out = { worker: "", times: 1, shell: null as string | null, base: env.BRAIN_BASE || "cb4", timeout: 150 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], eq = a.indexOf("=");
    const flag = a.startsWith("--") ? (eq > 0 ? a.slice(2, eq) : a.slice(2)) : null;
    const value = () => (eq > 0 ? a.slice(eq + 1) : argv[++i]);
    if (flag === "times" || flag === "timeout") {
      const n = Number(value());
      if (!Number.isInteger(n) || n < 1) throw new Error(`--${flag} takes a whole number above 0`);
      out[flag] = n;
    } else if (flag === "shell" || flag === "base") {
      const v = value();
      if (!v) throw new Error(`--${flag} takes a value`);
      out[flag] = v;
    } else if (flag) throw new Error(`unknown option --${flag}`);
    else if (out.worker) throw new Error(`one Worker a call: ${out.worker}, then ${a}`);
    else out.worker = a;
  }
  if (!out.worker) throw new Error("no Worker named");
  return { ...out, base: /^https?:\/\//.test(out.base) ? out.base.replace(/\/+$/, "") : `https://${out.base}.endpointservices.workers.dev` };
}

// The address of a run, as verifyDeploy writes it.
export const runAddress = (base: string, module: string, worker: string) => `${base}/#view=C100(S100(${module},${SHELL}))&verify=${worker}`;

const median = (xs: (number | null | undefined)[]) => {
  const s = xs.filter((x): x is number => typeof x === "number").sort((a, b) => a - b);
  return s.length ? s[(s.length - 1) >> 1] : null;
};

// What N runs say. A test is compared with itself on one hash only: a deploy between two runs is other code.
export function judge(runs: Run[], { module }: { module: string }) {
  const tests = new Map<string, { hash: string; name: string; passed: number; failed: number; message: string }>();
  const other: Record<string, number> = {};
  let passed = 0, failed = 0, none = 0;
  for (const r of runs) {
    if (r.none || typeof r.ok !== "boolean") { none++; continue; }
    r.ok ? passed++ : failed++;
    const hash = String(r.hash), bad = new Map((r.failed || []).map((f) => [f.name, String(f.message || "")]));
    for (const name of new Set([...(r.names || []), ...bad.keys()])) {
      const key = hash + " " + name;
      const t = tests.get(key) || { hash: hash.slice(0, 12), name, passed: 0, failed: 0, message: "" };
      if (bad.has(name)) { t.failed++; t.message ||= bad.get(name)!.replace(/\s+/g, " ").slice(0, 200); } else t.passed++;
      tests.set(key, t);
    }
    for (const [m, n] of Object.entries(r.ran || {})) if (m !== module && m !== SHELL && !FIXTURE.test(m)) other[m] = Math.max(other[m] || 0, n);
  }
  const all = [...tests.values()];
  const byChance = all.filter((t) => t.passed && t.failed);
  const everyTime = all.filter((t) => !t.passed && t.failed);
  const judged = runs.filter((r) => !r.none && typeof r.ok === "boolean");
  const exit = byChance.length || Object.keys(other).length ? 1 : failed || none ? 2 : 0;
  return {
    runs: runs.length, passed, failed, none,
    hashes: [...new Set(judged.map((r) => String(r.hash).slice(0, 12)))],
    byChance, everyTime, otherModules: other,
    otherTestsRan: [...new Set(judged.map((r) => r.otherTestsRan ?? null))],
    ms: median(judged.map((r) => r.ms)), wall: median(judged.map((r) => r.wall)), heapMB: median(judged.map((r) => r.heapMB)), variables: median(judged.map((r) => r.variables)),
    exit,
  };
}

// In the page: the verdict, and what ran beside it, read in one turn. null until there is a verdict.
const read = () => {
  const verdict = (window as any).__brainVerdict, rt = (window as any).__ojs_runtime;
  if (!verdict) return null;
  if (!rt) return { verdict };
  const nameOf = new Map([...rt.mains].map(([k, v]: any) => [v, k]));
  // A module that is not a main is named by the import cell that made it.
  for (const v of rt._variables) if (/^module /.test(v._name || "") && v._value && !nameOf.has(v._value)) nameOf.set(v._value, "(imported) " + v._name.slice(7));
  const mod = rt.mains.get(verdict.module), names: string[] = [], ran: Record<string, number> = {};
  for (const v of rt._variables) {
    if (!/^test_/.test(v._name || "")) continue;
    if (v._module === mod) names.push(v._name);
    if (v._version > 0 && v._value !== undefined) { const n = nameOf.get(v._module) || "(unnamed)"; ran[n] = (ran[n] || 0) + 1; }
  }
  const memory = (performance as any).memory;
  return { verdict, names, ran, variables: rt._variables.size, heapMB: memory ? Math.round(memory.usedJSHeapSize / 1e6) : null };
};

// The module of a Worker and the hash it runs, from the deployer, where brain-shell reads them.
async function moduleOf(base: string, worker: string) {
  const did: any = await fetch(base + "/.well-known/did.json").then((r) => (r.ok ? r.json() : null), () => null);
  const deployer = (did?.service || []).find((s: any) => s.id === "#deployer")?.serviceEndpoint;
  if (!deployer) throw new Error(`${base}/.well-known/did.json names no deployer`);
  const r = await fetch(deployer + "/xrpc/com.lopecode.brain.infra.getModules");
  if (!r.ok) throw new Error(`the deployer answered ${r.status} to infra.getModules`);
  const rows = ((await r.json()).modules || []).filter((m: any) => m.worker === worker);
  // The deployer has two rows: its own module, not the library it is built with.
  const m = rows.find((x: any) => x.module !== "@tomlarkworthy/cloudflare-iac") || rows[0];
  if (!m) throw new Error(`the deployer of ${base} has no module of ${worker}`);
  return { module: m.module as string, hash: m.hash as string };
}

// The headless Chrome to launch: CHROME, or the build this Playwright names, or the newest complete one in its
// cache when that build was never downloaded. Shared with the other launchers since 2026-10-11.
export const chromeFor = (own: string, env: Record<string, string | undefined> = {}) => sharedChromeFor(own, env, { headless: true });

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2), process.env); } catch (e: any) { console.error(`${e.message}\n${usage}`); process.exit(64); }
  const { worker, times, shell, base, timeout } = args;
  const body = shell ? readFileSync(shell, "utf8") : null;
  const { module, hash } = await moduleOf(base, worker);
  const address = runAddress(base, module, worker);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, executablePath: chromeFor(chromium.executablePath(), process.env) });
  console.log(JSON.stringify({ worker, module, deployed: hash.slice(0, 12), address, shell, times, browser: browser.version(), at: new Date().toISOString() }));
  const runs: Run[] = [];
  try {
    for (let i = 0; i < times; i++) {
      const context = await browser.newContext(), page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
      if (body != null) await page.route((url) => url.origin + url.pathname === base + "/", (route) => (route.request().resourceType() === "document" ? route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body }) : route.continue()));
      const t0 = Date.now();
      let run: Run;
      try {
        await page.goto(address, { waitUntil: "load" });
        const got: any = await (await page.waitForFunction(read, null, { timeout: timeout * 1000 })).jsonValue();
        const v = got.verdict;
        run = { hash: v.hash ?? null, ok: v.ok, none: v.none, names: got.names, failed: (v.failed || []).map((f: any) => ({ name: String(f.name), message: String(f.message || "") })), ran: got.ran, otherTestsRan: v.otherTestsRan ?? null, ms: v.ms ?? null, wall: Date.now() - t0, heapMB: got.heapMB ?? null, variables: got.variables ?? null };
      } catch (e: any) {
        run = { none: "no verdict: " + String(e.message || e).split("\n")[0].slice(0, 200), wall: Date.now() - t0 };
      }
      runs.push(run);
      const { names, failed, hash: h, ...rest } = run;
      console.log(JSON.stringify({ run: i + 1, hash: h ? String(h).slice(0, 12) : h, ...rest, tests: names?.length, failed: (failed || []).map((f) => f.name + ": " + String(f.message).replace(/\s+/g, " ").slice(0, 160)), ...(errors.length ? { errors: errors.slice(0, 3) } : {}) }));
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const summary = judge(runs, { module });
  console.log(JSON.stringify({ worker, ...summary, at: new Date().toISOString() }));
  process.exit(summary.exit);
}

// An error of the tool itself is never 1 or 2, which are verdicts.
if (import.meta.main) await main().catch((e) => { console.error("verify-run: " + String((e && e.message) || e).split("\n")[0]); process.exit(70); });
