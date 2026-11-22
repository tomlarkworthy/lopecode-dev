#!/usr/bin/env bun
// Runs the SoundScript notebook's test_* cells in bun: tools/lope-runtime.js (happy-dom, no browser), with the
// capabilities of ./capabilities.ts added before boot. See README.md.
//   bun tools/lang-experiment/bun-verify/run.ts [--filter s] [--mains a,b] [--all] [--timeout ms] [--without cap]
//       [--no-toggle] [--hash h] [--poll ms] [--report f.json] [--verbose] [notebook]
import { loadNotebook, followComputed } from "../../lope-runtime.js";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { resolve, basename } from "path";
import { ALL, NEEDS } from "./capabilities.ts";

const DEFAULT_NOTEBOOK = resolve(import.meta.dir, "../../../lopebooks/notebooks/soundscript.html");
// the modules the SoundScript build writes; --all runs every module's tests
const OWN = /^@tomlarkworthy\/(soundscript(-[a-z]+)?|raw-cells)$/;
const argv = process.argv.slice(2);
// --deep-freeze (measurement only, off by default, not in the notebook): each SoundScript cell's value deep-frozen when
// the cell returns or yields, through ../lite/freeze.ts: arrays, plain records, Map and Set; a frozen subtree is skipped
let deepFreezeOn = false;
const opt = { notebook: DEFAULT_NOTEBOOK, filter: null as string | null, all: false, timeout: 15000, without: [] as string[], report: null as string | null, verbose: false, hash: null as string | null, mains: null as string[] | null, poll: 100, toggle: true };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--filter") opt.filter = argv[++i];
  else if (a === "--all") opt.all = true;
  else if (a === "--timeout") opt.timeout = Number(argv[++i]);
  else if (a === "--without") opt.without.push(argv[++i]);
  else if (a === "--report") opt.report = argv[++i];
  else if (a === "--hash") opt.hash = argv[++i];
  else if (a === "--mains") opt.mains = argv[++i].split(",").map((m) => (m.startsWith("@") ? m : `@tomlarkworthy/${m}`));
  else if (a === "--verbose") opt.verbose = true;
  else if (a === "--poll") opt.poll = Number(argv[++i]);
  else if (a === "--no-toggle") opt.toggle = false;
  else if (a === "--deep-freeze") deepFreezeOn = true;
  else if (!a.startsWith("--")) opt.notebook = a;
  else { console.error(`unknown argument ${a}`); process.exit(2); }
}
for (const w of opt.without) if (!ALL.some((c) => c.name === w)) { console.error(`no capability ${w}; have ${ALL.map((c) => c.name).join(", ")}`); process.exit(2); }

// The notebook's console output is not this tool's; it is dropped unless --verbose.
const out = (s: string) => process.stdout.write(s + "\n");
if (!opt.verbose) for (const k of ["log", "info", "warn", "error", "debug", "trace"] as const) (console as any)[k] = () => {};
process.on("unhandledRejection", () => {});

const t0 = performance.now();
// --mains: boot only these modules (and what they import), from a copy whose bootconf.json block lists them
if (opt.mains) {
  // walk the top-level <script> elements as the HTML parser does (a script's text runs to the next </script>)
  const html = readFileSync(opt.notebook, "utf8");
  let start = -1, end = -1;
  for (let at = html.indexOf("<script"); at >= 0; at = html.indexOf("<script", end + 9)) {
    const tagEnd = html.indexOf(">", at);
    end = html.indexOf("</script>", tagEnd);
    if (/\sid="bootconf\.json"/.test(html.slice(at, tagEnd))) { start = tagEnd + 1; break; }
  }
  if (start < 0) { console.error("no bootconf.json block"); process.exit(2); }
  const conf = { ...JSON.parse(html.slice(start, end)), mains: opt.mains };
  const dir = resolve(import.meta.dir, ".cache");
  mkdirSync(dir, { recursive: true });
  opt.notebook = resolve(dir, basename(opt.notebook));
  writeFileSync(opt.notebook, html.slice(0, start) + "\n" + JSON.stringify(conf, null, 2) + "\n" + html.slice(end));
}
const deepFreezeStat = { values: 0, nodes: 0, ms: 0 };
function deepFreezeCells(runtime: any) {
  const { freeze } = require("../lite/freeze.ts");
  const deep = (v: unknown) => {
    const t0 = performance.now(), stack = [v];
    while (stack.length) {
      const x = stack.pop();
      if (typeof x !== "object" || x === null || Object.isFrozen(x)) continue;
      const p = Object.getPrototypeOf(x);
      const kids = Array.isArray(x) ? x : x instanceof Map ? [...x.keys(), ...x.values()] : x instanceof Set ? [...x] : p === Object.prototype || p === null ? Object.values(x) : null;
      if (kids === null) continue;
      freeze(x); deepFreezeStat.nodes++;
      for (const k of kids) stack.push(k);
    }
    deepFreezeStat.values++; deepFreezeStat.ms += performance.now() - t0;
    return v;
  };
  const probe = runtime.module().variable();
  const proto = Object.getPrototypeOf(probe);
  probe.delete();
  const define = proto.define;
  proto.define = function (...a: any[]) {
    const i = a.findIndex((x) => typeof x === "function");
    const f = a[i];
    if (f && String(f).includes('/*{lang:"ss"}*/')) a[i] = { [f.name || "cell"](this: unknown, ...xs: unknown[]) {
      const v = f.apply(this, xs);
      if (v && typeof v.next === "function" && typeof v[Symbol.iterator] === "function") {
        const next = v.next.bind(v);
        v.next = (...n: unknown[]) => { const r = next(...n); if (r && typeof r.then === "function") return r; if (!r.done) deep(r.value); return r; };
        return v;
      }
      if (v && typeof v.then === "function") return v.then(deep);
      return deep(v);
    } }[f.name || "cell"];
    // the toolchain reads a definition's text (decompile, the SoundScript mark): the wrapper shows the cell's own
    if (a[i] !== f) Object.defineProperty(a[i], "toString", { value: () => String(f) });
    return define.apply(this, a);
  };
}
const installed = ALL.filter((c) => !opt.without.includes(c.name));
for (const c of installed) c.preBoot?.();
let tParsed = 0;
const ex: any = await loadNotebook(opt.notebook, {
  // lope-runtime's settle loop: every `pollInterval` ms it calls runtime._computeNow() (a compute outside any
  // animation frame, which a browser does not make) until the count of settled variables is unchanged for 5 polls.
  // Without those computes test_spec_S7_7 fails 5 of 5 runs; see README.
  settleTimeout: 30000,
  pollInterval: opt.poll,
  ...(opt.hash ? { hash: opt.hash } : {}),
  // B7 (2026-11-22): SS_FREEZE_ALL=1 boots with ?ss_freeze_all=1, which turns freeze.ts freezeAll on
  ...(process.env.SS_FREEZE_ALL === "1" ? { search: "?ss_freeze_all=1" } : {}),
  log: (m: string) => { const t = performance.now(); if (m.startsWith("Bootloader: @")) tParsed = t; if (opt.verbose) process.stderr.write(m + "\n"); },
  instrument: (runtime: any) => { for (const c of installed) c.install((n: string) => runtime._global(n), runtime); if (deepFreezeOn) deepFreezeCells(runtime); },
});
const rt = ex.runtime;
const tBoot = performance.now();

// Module names: mains from bootconf, imported modules from their `module <name>` variable.
const nameOf = new Map<any, string>();
for (const v of rt._variables) if (typeof v._name === "string" && v._name.startsWith("module ") && v._value) nameOf.set(v._value, v._name.slice(7));
for (const [n, m] of rt.mains ?? []) nameOf.set(m, n);
const moduleOf = (v: any) => nameOf.get(v._module) ?? "?";
const isMain = (v: any) => [...(rt.mains?.values() ?? [])].includes(v._module);

// The core's and the tutorial's tests are gated by a "run the tests" toggle (tests_on = run_tests ? true : invalidation).
// As verify.ts does: they must be pending at boot; then each toggle is turned on as a click does (checked, input event).
const gated = [...rt._variables].filter((v: any) => /^test_(ss_|breakout|compile|examples|async_click)/.test(v._name ?? "") && isMain(v));
const ranAtBoot = gated.filter((v: any) => v._value !== undefined).map((v: any) => v._name);
const toggles: string[] = [];
for (const v of opt.toggle ? rt._variables : []) {
  if (!v._name?.startsWith?.("viewof ") || !v._value?.querySelector || !isMain(v)) continue;
  const box = v._value.querySelector("input[type=checkbox]");
  if (!box || v._value.querySelector("label")?.textContent?.trim() !== "run the tests") continue;
  box.checked = true;
  box.dispatchEvent(new ex.context.Event("input", { bubbles: true }));
  toggles.push(moduleOf(v));
}

type State = "passed" | "failed" | "timeout" | "skipped";
type R = { name: string; module: string; state: State; ms: number; detail?: string };
const skipReason = (v: unknown): string | null => {
  if (typeof v === "string") { const m = /^\s*skipped\s*:\s*(.*)$/is.exec(v); return m ? m[1].trim() : null; }
  if (v && typeof v === "object" && ((v as any).skipped === true || (v as any).__skip === true)) return String((v as any).reason ?? "no reason given");
  return null;
};

const all = [...rt._variables].filter((v: any) => typeof v._name === "string" && v._name.startsWith("test_"));
const inScope = all.filter((v: any) => opt.all || OWN.test(moduleOf(v)));
const tests = inScope.filter((v: any) => !opt.filter || v._name.includes(opt.filter));
if (!tests.length) { out("bun-verify: no test_* cells matched"); process.exit(2); }

// Each test's latest outcome is kept (a cell re-runs when an input changes, as the notebook's tests module reads
// it); the run ends when every test has settled once, or reached --timeout.
const latest = new Map<any, R>();
await Promise.all(tests.map((v: any) => new Promise<void>((res) => {
  const t = performance.now(), name = v._name, module = moduleOf(v);
  let settled = false;
  const record = (r: R) => { latest.set(v, r); if (!settled) { settled = true; clearTimeout(tid); res(); } };
  const tid = setTimeout(() => { settled = true; latest.set(v, { name, module, state: "timeout", ms: performance.now() - t }); res(); }, opt.timeout);
  const ok = (val: unknown) => {
    const why = skipReason(val);
    record(why === null ? { name, module, state: "passed", ms: performance.now() - t } : { name, module, state: "skipped", ms: performance.now() - t, detail: why });
  };
  const bad = (e: any) => record({ name, module, state: "failed", ms: performance.now() - t, detail: e?.message || String(e) });
  if (v._value !== undefined) ok(v._value);
  else followComputed(v, ok, bad);
  v._observer = { fulfilled: ok, rejected: bad, pending: () => {} };
  rt._dirty?.add(v);
  rt._compute();
})));
const tTests = performance.now();

// A failure of a test that needs a capability bun lacks, confirmed absent by a probe in the page's realm, is SKIPPED.
const g = (n: string) => rt._global(n);
const results = [...latest.values()];
// verify.ts's boot check: a gated test that ran before its toggle was turned on is a failure of the page
for (const name of ranAtBoot) results.push({ name, module: "(boot)", state: "failed", ms: 0, detail: "gated test ran before \"run the tests\" was on" });
for (const r of results) {
  if (r.state !== "failed") continue;
  const need = NEEDS.find((x) => x.test === r.name && x.module === r.module);
  if (need && !(await need.present(g))) Object.assign(r, { state: "skipped", detail: `needs ${need.capability}, absent here (${need.why}); it failed with: ${r.detail}` });
}
ex.dispose();

results.sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));
const tag = { failed: "FAIL", timeout: "TIMEOUT", skipped: "SKIP", passed: "PASS" };
for (const r of results) if (r.state !== "passed") out(`${tag[r.state]} ${r.module}#${r.name} (${(r.ms / 1000).toFixed(1)} s)${r.detail ? ": " + r.detail.replace(/\s+/g, " ").slice(0, 240) : ""}`);
const n = (s: State) => results.filter((r) => r.state === s).length;
const outside = all.length - inScope.length;
if (outside) out(`${outside} test cells in ${new Set(all.filter((v: any) => !inScope.includes(v)).map(moduleOf)).size} other modules not run (--all runs them)`);
out(`gated tests: ${gated.length - ranAtBoot.length} of ${gated.length} pending at boot${ranAtBoot.length ? "; ran: " + ranAtBoot.join(", ") : ""}; turned on: ${toggles.join(", ") || "none"}`);
if (opt.without.length) out(`capabilities removed: ${opt.without.join(", ")}`);
const sec = (a: number, b: number) => ((b - a) / 1000).toFixed(2);
out(`boot ${sec(t0, tBoot)} s (parse ${sec(t0, tParsed)}, imports and settle ${sec(tParsed, tBoot)}), tests ${sec(tBoot, tTests)} s`);
out(`bun-verify: ${n("passed")} pass, ${n("failed")} fail, ${n("timeout")} timed out, ${n("skipped")} skipped; ${((performance.now() - t0) / 1000).toFixed(1)} s`);
if (deepFreezeOn) out(`deep-freeze: ${deepFreezeStat.values} cell values, ${deepFreezeStat.nodes} nodes frozen, ${deepFreezeStat.ms.toFixed(1)} ms`);
if (opt.report) writeFileSync(opt.report, JSON.stringify({ notebook: resolve(opt.notebook), without: opt.without, bootMs: tBoot - t0, testsMs: tTests - tBoot, results }, null, 2));
process.exit(n("failed") + n("timeout") ? 1 : 0);
