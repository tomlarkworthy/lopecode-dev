// bun lite/soundscript/verify.ts [notebook.html] [--shot file.png] [--no-variant] [--no-speed] [--ui-only | --variant-only | --speed-only]
// Headless Chromium, every non-file request aborted. Opens soundscript.html (default
// lopebooks/notebooks/soundscript.html) with its own default layout, then:
//  1. every test cell of the core, the tutorial and the four section modules, and editor-5's
//     test_e5_language_hook; one instance of the core, one ss_registration;
//  2. the live counter: a real click on "add one";
//  3. the editor fork on the tutorial's `increment` (synthetic events): typed source shown, an
//     unchanged save keeps text and pid, State<string> shows a diagnostic and is refused;
//  4. export with exporter-3, reopen, run 1 and 2 there, compare SoundScript definitions, block ids
//     and decompiled source, export again and compare the module blocks; then, on the original page,
//     delete `onTick` while Breakout plays and check the clock stops; dispose a copy of the game while it plays;
//  5. real Playwright clicks and keys on a fresh page: tally renders as one cell and its hotbar opens
//     the state cell source; a typed refused edit and a typed applied edit of `width`; a cell added with the
//     hotbar's add button; Save in place from the lopepage menu (showSaveFilePicker is stubbed to
//     write .scratch/saved.html); the saved file reopened with the edits in it;
//  6. the core without the tutorial (build.ts --no-tutorial into .scratch/): core tests, the editor
//     on `bump`, a new cell, a state cell made plain and a state cell again, export, reopen.
// No request to /@tomlarkworthy/ or api.observablehq.com may be made (a stripped module fetched).
// The notebook file itself is never written.
import { chromium, type Page } from "../../../../node_modules/playwright/index.mjs";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { checkSources } from "../core.ts";
import * as acorn from "acorn";
import { compiledKind } from "../toolchain/ss-toolchain.ts";
import { specRejects } from "./spec-cases.ts";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { blockContent, blockSpans } from "../../../lib/notebook-blocks.ts";
import { offlineWithAir, setTheme, contrasts, THEME_BASE } from "./theme-check.ts";
import { RAW_CELLS, RAW_TESTS, POLY, rawOnPage, rawAfterSave, rawExport, rawUnloaded, pickerPaths } from "./verify-raw.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE = "@tomlarkworthy/soundscript";
const TUTORIAL = "@tomlarkworthy/soundscript-tutorial";
const SPEC = "@tomlarkworthy/soundscript-spec";
// the specification module's tests, by name (a test is named after the statements it checks)
const SPEC_TESTS = [...readFileSync(join(dirname(fileURLToPath(import.meta.url)), "spec.ojs"), "utf8").matchAll(/^(test_spec_\w+) = /gm)].map((m) => m[1]);
const SECTIONS = ["@tomlarkworthy/soundscript-reducer", "@tomlarkworthy/soundscript-model", "@tomlarkworthy/soundscript-mandelbrot", "@tomlarkworthy/soundscript-breakout", "@tomlarkworthy/soundscript-polyglot"];
// the worker pool add-on; only the Mandelbrot section imports it
const WORKERS = "@tomlarkworthy/soundscript-workers";
const file = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : join(HERE, "../../../../lopebooks/notebooks/soundscript.html"));
const shot = process.argv.includes("--shot") ? process.argv[process.argv.indexOf("--shot") + 1] : null;
const SCRATCH = join(HERE, ".scratch");
mkdirSync(SCRATCH, { recursive: true });

let passes = 0, fails = 0;
// every check passes or fails on a count, a value or a DOM state; times and rates are printed as measurements, never judged
const counts = { functional: { pass: 0, fail: 0 } };
const measurements: string[] = [];
let LAST = "(start)";
const report = (ok: boolean, what: string) => { LAST = what.slice(0, 120); console.log(`${ok ? "pass" : "FAIL"} ${what}`); ok ? passes++ : fails++; counts.functional[ok ? "pass" : "fail"]++; };
const measure = (what: string) => { console.log(`measure ${what}`); measurements.push(what); };
const power = Bun.spawnSync(["pmset", "-g", "batt"], { stdout: "pipe" }).stdout.toString().match(/'([^']+)'/)?.[1] ?? "unknown";
console.log(`power: ${power}`);

const CORE_TESTS = ["test_ss_roundtrip", "test_ss_example_checks", "test_ss_unchanged_source_checks", "test_ss_wrong_type_is_stored_and_rejected", "test_ss_breaking_edit_names_its_cells", "test_ss_copy_keeps_its_name", "test_ss_failed_apply_changes_nothing", "test_ss_instance_keeps_user_ids", "test_ss_deleted_state_is_not_inherited", "test_ss_ref_handle", "ss_registration"];
const TUTORIAL_TESTS = ["test_shop_total", "test_ss_roundtrip", "test_ss_module_checks", "test_ss_counter", "test_half", "test_async_click",
  "test_examples_check_as_expected", "test_compile_pool_matches_main", "test_compile_refuses_unchecked", "test_breakout_listener", "test_breakout_memo", "benchmark"];


// --- the page's text against the checker, without a browser
// Every rule id the reference names is produced by an example, a fixture or a probe here, and every rule
// id they produce is named; every construct the reference calls unsupported is reported unsupported.
const RULE_PROBES: Record<string, string> = {
  "untyped-parameter": "const f = () => (x) => x;",
  "unknown-type": "const f = () => (x: Foo) => x;",
  "const-assign": "const f = () => { const a = 1; a = 2; return a; };",
};
const UNSUPPORTED_PROBES: [string, string, boolean?][] = [
  ["for…in", "const f = () => (o: { readonly a: number }) => { let n = 0; for (const k in o) n++; return n; };"],
  ["instanceof", "const f = () => (x: Error) => x instanceof Error;"],
  ["??=", "const f = () => { let a: number | undefined = undefined; a ??= 1; return a; };"],
  ["&&=", "const f = () => { let a = true; a &&= false; return a; };"],
  ["||=", "const f = () => { let a = false; a ||= true; return a; };"],
  ["destructuring assignment", "const f = () => { let a = 1, b = 2; [a, b] = [b, a]; return a; };"],
  ["tagged template", "const f = () => { const t = (s: readonly string[]) => s.length; return t`x`; };"],
  ["comma operator", "const f = () => (1, 2);"],
  ["satisfies", "const f = () => (1 satisfies number);"],
  ["type inside a body", "const f = () => { type T = number; return 1; };"],
  ["yield*", "const f = function* () { yield* [1, 2]; };"],
  ["for await", "const f = async () => { for await (const x of [1]) { return x; } return 0; };"],
  ["labelled break holding a Mut", "const f = () => { const a = [1]; outer: for (const x of [1, 2]) { if (x > 1) break outer; a.push(x); } return a; };"],
  ["Symbol", "const f = () => Symbol(\"a\");"],
  ["new Promise", "const f = () => new Promise<number>((r: (n: number) => void) => r(1));"],
  ["Object.assign({}, …)", "const f = () => Object.assign({}, { a: 1 });"],
  ["JSX spread attribute", "const f = () => { const p = { id: \"a\" }; return <div {...p} />; };", true],
];
function referenceChecks() {
  const ROOT = join(HERE, "../..");
  const files: string[] = [];
  const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/^cells\.tsx?$/.test(f)) files.push(p); } };
  walk(join(ROOT, "fixtures"));
  const ex = join(ROOT, "lite/notebook/examples");
  for (const f of readdirSync(ex)) files.push(join(ex, f));
  const produced = new Set<string>();
  const add = (r: any) => { for (const e of [...r.module, ...r.cells.flatMap((c: any) => c.errors)]) produced.add(e.rule); };
  for (const f of files) add(checkSources({ cells: readFileSync(f, "utf8"), tsx: f.endsWith("x") }));
  const specCases = specRejects();
  // as for the fixtures, only the cells are checked (a shell case's rule needs a shell, which a notebook has not)
  for (const c of specCases) add(checkSources({ cells: c.source, tsx: true, outside: c.outside }));
  const probed: string[] = [];
  for (const [rule, src] of Object.entries(RULE_PROBES)) { const r = checkSources({ cells: src }); add(r); if (r.cells[0]?.errors.some((e: any) => e.rule === rule)) probed.push(rule); }
  report(probed.length === Object.keys(RULE_PROBES).length, `reference: each rule probe reports its rule (${probed.join(", ")})`);
  const html = readFileSync(file, "utf8");
  const tut = blockContent(html, TUTORIAL) ?? "";
  const listed = new Set([...tut.matchAll(/\\`\[([a-z][a-z-]*)\]\\`/g)].map((m) => m[1]));
  const missing = [...listed].filter((r) => !produced.has(r)), unlisted = [...produced].filter((r) => !listed.has(r));
  report(listed.size > 40 && !missing.length && !unlisted.length, `reference: ${listed.size} rule ids named, ${produced.size} produced by ${files.length} examples and fixtures, ${specCases.length} specification cases plus ${probed.length} probes; named but never produced ${JSON.stringify(missing)}, produced but not named ${JSON.stringify(unlisted)}`);
  const wrong = UNSUPPORTED_PROBES.filter(([, src, tsx]) => checkSources({ cells: src, tsx }).cells[0]?.status !== "unsupported").map(([n]) => n);
  report(!wrong.length, `reference: ${UNSUPPORTED_PROBES.length} constructs the reference calls unsupported are reported unsupported${wrong.length ? "; not: " + wrong.join(", ") : ""}`);
  // shipped prose names nothing a reader of the notebook cannot open, and no cell by position
  const BANNED = [/\btools\//, /\bplan\//, /\blite\//, /\bfixtures\//, /RULES\.md/, /README\.md/, /NOTES-/, /\bbun /, /\bbelow\b/i, /\babove\b/i];
  for (const m of [CORE, TUTORIAL, ...SECTIONS, SPEC]) {
    const mds = [...(blockContent(html, m) ?? "").matchAll(/\bmd`((?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*)`/g)].map((x) => x[1]);
    const hits = mds.flatMap((t) => BANNED.filter((b) => b.test(t)).map((b) => `${b.source}: ${t.slice(Math.max(0, t.search(b) - 40), t.search(b) + 30).replace(/\s+/g, " ")}`));
    report(mds.length > 0 && !hits.length, `prose: ${m}: ${mds.length} md cells, no repository path and no "below"/"above"${hits.length ? "; found " + hits.join(" | ") : ""}`);
  }
}

// --quick: only the original page (boot counts, every test_* cell, the unchanged save); not a full pass
const QUICK = process.argv.includes("--quick");
class QuickDone extends Error {}
const FOCUS_TRACE = process.argv.includes("--focus-trace");
let ftN = 0;
const CPU = process.argv.includes("--cpu") ? Number(process.argv[process.argv.indexOf("--cpu") + 1]) : 1;
const browser = await chromium.launch();
try {
// every Worker the page constructs is counted in __workersMade (the core-only build must construct none)
const countWorkers = (page: Page) => page.addInitScript(() => {
  const w = window as any;
  w.__workersMade = 0;
  if (w.Worker) w.Worker = new Proxy(w.Worker, { construct(t, a, nt) { w.__workersMade++; return Reflect.construct(t, a, nt); } });
});
// count: the boot check (testsOn) reads how many times each cell ran; only then is the profiler on
async function open(path: string, saveTo?: string, specWait = true, count = false) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  if (saveTo) await stubPicker(page, saveTo);
  if (FOCUS_TRACE) {
    await page.addInitScript({ path: join(HERE, "focus-trace.js") });
    const ftDir = process.env.FT_DIR ?? join(HERE, ".scratch/focus-trace");
    mkdirSync(ftDir, { recursive: true });
    const ftFile = join(ftDir, `ft-${process.pid}-${++ftN}.log`);
    page.on("console", (m) => { if (m.type() === "debug" && m.text().startsWith("FT ")) appendFileSync(ftFile, m.text() + "\n"); });
    page.on("framenavigated", (f) => { if (f === page.mainFrame()) appendFileSync(ftFile, `NAV ${f.url()}\n`); });
    page.on("load", () => appendFileSync(ftFile, `LOAD\n`));
    page.on("crash", () => appendFileSync(ftFile, `CRASH\n`));
  }
  await countWorkers(page);
  if (CPU > 1) await (await page.context().newCDPSession(page)).send("Emulation.setCPUThrottlingRate", { rate: CPU });
  const blocked: string[] = [], errors: string[] = [];
  await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : (blocked.push(r.request().url()), r.abort())));
  page.on("pageerror", (e) => errors.push(String(e.message)));
  page.on("crash", () => console.log(`  page crashed: ${path}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) { console.log(`  console.error: ${m.text().slice(0, 400)}`); errors.push("console.error: " + m.text().slice(0, 200)); } });
  // how many times each function the page runs is called, until the boot check reads it (testsOn)
  if (count) {
    const prof = await page.context().newCDPSession(page);
    await prof.send("Profiler.enable");
    await prof.send("Profiler.startPreciseCoverage", { callCount: true, detailed: false });
    profilers.set(page, prof);
  }
  await page.goto(`file://${path}`);
  // the specification's tests run at load and pull generators of their own; the checks that count listeners
  // and clocks on the whole page start once they have settled
  // mains register one by one, so the wait is for every main the file's bootconf declares, then for the spec's tests
  const declared: string[] = JSON.parse(blockContent(readFileSync(path, "utf8"), "bootconf.json") ?? "{}").mains ?? [];
  const waited = !specWait ? "skipped" : !declared.includes(SPEC) ? "ok" : await page.evaluate(async ([spec, declared]) => {
    const until = async (f: () => unknown, ms: number) => { const t = Date.now(); while (!f() && Date.now() - t < ms) await new Promise((r) => setTimeout(r, 50)); return f(); };
    const rt = () => (window as any).__ojs_runtime;
    if (!(await until(() => rt()?.mains && declared.every((d) => rt().mains.has(d)), 60000))) return `mains not all registered in 60 s: missing ${declared.filter((d) => !rt()?.mains?.has(d)).join(", ")}`;
    const m = rt().mains.get(spec);
    const tests = [...rt()._variables].filter((v: any) => v._module === m && /^test_spec_/.test(v._name));
    if (!tests.length) return "no spec tests defined yet";
    const all = await Promise.race([Promise.all(tests.map((t: any) => m.value(t._name).catch(() => 0))).then(() => true), new Promise((r) => setTimeout(() => r(false), 60000))]);
    return all ? "ok" : `${tests.length} spec tests not settled in 60 s`;
  }, [SPEC, declared] as [string, string[]]).catch((e: Error) => `evaluate failed: ${String(e.message).split("\n")[0]}`);
  // printed, not judged: a later check that needs a cell waits on that cell
  if (waited !== "ok") console.log(`  open ${path.split("/").pop()}: spec tests wait ${waited}`);
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) console.log(`  navigated: ${f.url().slice(0, 200)}`); });
  // what ends a page's JavaScript context, with the check in progress: a navigation, a crash, a context replaced
  const short = path.split("/").pop();
  const cdp = await page.context().newCDPSession(page);
  const mainId = (page.mainFrame() as any)._guid;
  cdp.on("Runtime.executionContextDestroyed", (e: any) => console.log(`  CTX destroyed ${short} id ${e.executionContextId} after "${LAST}"`));
  cdp.on("Runtime.executionContextsCleared", () => console.log(`  CTX all cleared ${short} after "${LAST}"`));
  cdp.on("Runtime.executionContextCreated", (e: any) => { if (e.context?.auxData?.isDefault) console.log(`  CTX created ${short} id ${e.context.id} frame ${String(e.context.auxData.frameId).slice(0, 8)} ${String(e.context.origin).slice(0, 60)} after "${LAST}"`); });
  cdp.on("Page.frameNavigated", (e: any) => console.log(`  CTX frameNavigated ${short} ${e.frame.parentId ? "child" : "main"} ${String(e.frame.url).slice(0, 120)} after "${LAST}"`));
  cdp.on("Page.frameRequestedNavigation", (e: any) => console.log(`  CTX navigation requested ${short} ${e.reason} ${e.disposition} ${String(e.url).slice(0, 120)} after "${LAST}"`));
  page.on("close", () => console.log(`  CTX page closed ${short} after "${LAST}"`));
  await cdp.send("Runtime.enable").catch(() => {});
  await cdp.send("Page.enable").catch(() => {});
  void mainId;
  return { page, blocked, errors };
}
function requests(label: string, o: { blocked: string[]; errors: string[] }) {
  const fetched = o.blocked.filter((u) => /\/@tomlarkworthy\/|api\.observablehq\.com/.test(u));
  report(fetched.length === 0, `${label}: no module fetched from the network${fetched.length ? ": " + fetched.join(", ") : ""}`);
  report(o.errors.length === 0, `${label}: page errors ${o.errors.length}${o.errors.length ? ": " + o.errors.slice(0, 3).join(" | ") : ""}`);
  console.log(`  ${label}: aborted ${o.blocked.length}: ${[...new Set(o.blocked)].join(" ")}`);
}

// the runtime keeps no error field: a variable's state is read from its promise
const read = (page: Page, name: string) => page.evaluate(async (name) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt?.mains?.get(name);
  if (!mod) return null;
  const out: Record<string, { state: string; value?: string }> = {};
  const tick = () => new Promise((r) => setTimeout(() => r({ s: "pending" }), 0));
  for (const v of rt._variables) {
    if (v._module !== mod || !v._name) continue;
    const st: any = v._promise ? await Promise.race([v._promise.then(() => ({ s: "ok" }), (e: any) => ({ s: "error", e })), tick()]) : { s: "pending" };
    const state = st.s === "error" ? "error" : v._value !== undefined ? "ok" : "pending";
    const val = v._value;
    out[v._name] = { state, value: state === "error" ? String(st.e?.message ?? st.e) : typeof val === "string" || typeof val === "number" ? String(val) : val && val.constructor === Object ? JSON.stringify(val) : undefined };
  }
  return out;
}, name);

// the lesson cells that are rejected on purpose (section 3, section 8): each raises its checker message
const REJECTED_LESSON = ["bad_attr_type", "bad_unknown_attr", "bad_unknown_element", "bad_handler_not_action", "bad_handler_wrong_args", "bad_component_props", "bad_component_missing_prop", "bad_component_not_elem", "bad_mut_in_jsx", "bad_child_object"];
async function testsPass(page: Page, label: string, name: string, tests: string[], expectErrors: string[] = []) {
  if (name === TUTORIAL) expectErrors = [...expectErrors, ...REJECTED_LESSON];
  // the specification holds s11_late_twice, which reads s11_late, a cell that exists only while test_spec_S11_10 runs
  if (name === SPEC) expectErrors = [...expectErrors, "s11_late_twice"];
  let vars = null as Awaited<ReturnType<typeof read>>;
  for (let i = 0; i < 120; i++) {
    vars = await read(page, name);
    if (vars && tests.every((t) => vars![t] && vars![t].state !== "pending")) break;
    await page.waitForTimeout(500);
  }
  if (!vars) { report(false, `${label}: ${name} never booted`); return; }
  const errorCells = Object.entries(vars).filter(([n, v]) => v.state === "error" && !expectErrors.includes(n));
  report(errorCells.length === 0, `${label}: ${name}: ${Object.keys(vars).length} variables, ${errorCells.length} in error${errorCells.map(([n, v]) => `\n    ${n}: ${v.value}`).join("")}`);
  for (const t of tests) report(vars[t]?.state === "ok", `${label}: ${name}#${t}: ${(vars[t]?.value ?? vars[t]?.state ?? "missing").slice(0, 400)}`);
  if (name === TUTORIAL) {
    const ran = REJECTED_LESSON.filter((n) => !(vars![n]?.state === "error" && vars![n].value!.startsWith(`${n} does not check: [`)));
    report(ran.length === 0, `${label}: the ${REJECTED_LESSON.length} lesson cells rejected on purpose do not run; each raises its checker message${ran.length ? `; not so: ${ran.map((n) => `${n} ${vars![n]?.state} ${vars![n]?.value}`).join(", ")}` : ""}`);
  }
}
async function hookPass(page: Page, label: string) {
  const hook = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime;
    const v = [...rt._variables].find((v: any) => v._name === "test_e5_language_hook");
    try { return "ok " + await v._module.value("test_e5_language_hook"); } catch (e) { return "error " + String((e as Error)?.message ?? e); }
  });
  report(hook.startsWith("ok "), `${label}: editor-5 test_e5_language_hook: ${hook}`);
}
async function oneCore(page: Page, label: string) {
  const r = await page.evaluate(([core, tut]) => {
    const rt = (window as any).__ojs_runtime;
    const regs = [...rt._variables].filter((v: any) => v._name === "ss_registration").length;
    const imp = [...rt._variables].find((v: any) => v._name === "module " + core && v._module === rt.mains.get(tut));
    return { regs, same: imp ? imp._value === rt.mains.get(core) : null };
  }, [CORE, TUTORIAL]);
  report(r.regs === 1 && r.same === true, `${label}: one ss_registration variable (${r.regs}); the tutorial's import of the core is the main module (${r.same})`);
}


// Tests are gated by a "run the tests" toggle in each module that has them. At boot they must be
// pending, cost nothing and leave the page's examples alone; then a real click turns them on.
// the page's ballView computes at boot, per label: the runtime's count (_version), which counts a compute
// superseded before it called the definition (each import of ss redefines itself once, so cells below it are
// scheduled and superseded at boot); the tests must not add to it (they run on copies)
const bootBallRuns = new Map<string, number | null>();
// a page open() started counting function calls on (Profiler precise coverage)
const profilers = new WeakMap<Page, any>();
const BREAKOUT = "@tomlarkworthy/soundscript-breakout";
// How many times each SoundScript cell taking a runtime cell (ss_<name>) in the core, the tutorial and Breakout ran at boot: calls of
// its definition, counted by the profiler, so a compute the runtime superseded before the call is not one.
// Read once per page, before anything presses a button (the original page reads it before its counter presses).
const bootCounts = new WeakMap<Page, { module: string; name: string; fn: string; runs: number | null }[]>();
async function bootRuns(page: Page) {
  if (bootCounts.has(page)) return bootCounts.get(page)!;
  const prof = profilers.get(page);
  if (!prof) return null;
  profilers.delete(page);
  await page.waitForFunction((b) => { const m = (window as any).__ojs_runtime.mains.get(b); return !m || m._scope.get("app")?._value !== undefined; }, BREAKOUT, { timeout: 60000 });
  const { result } = await prof.send("Profiler.takePreciseCoverage");
  await prof.send("Profiler.stopPreciseCoverage");
  await prof.detach();
  const cells: { module: string; name: string; fn: string }[] = await page.evaluate((mods) => {
    const rt = (window as any).__ojs_runtime;
    const ss = [...rt._variables].find((x: any) => x._name === "soundscript" && x._value)._value;
    return mods.flatMap((m: string) => { const mod = rt.mains.get(m); return [...rt._variables].filter((v: any) => mod && v._module === mod && typeof v._name === "string" && ss.compiledKind(String(v._definition))?.kind && v._inputs.some((i: any) => ss.RUNTIME_CELLS.some((n: string) => ss.INPUTS[n] === i._name))).map((v: any) => ({ module: m, name: v._name, fn: v._definition.name })); });
  }, [CORE, TUTORIAL, BREAKOUT]);
  const out = cells.map((c) => {
    const hits = result.filter((s: any) => s.url === `file://${c.module}`).flatMap((s: any) => s.functions.filter((f: any) => f.functionName === c.fn));
    return { ...c, runs: hits.length === 1 ? hits[0].ranges[0].count as number : null };
  });
  bootCounts.set(page, out);
  return out;
}
async function testsOn(page: Page, label: string, boot = true) {
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelectorAll("label").length > 0 && [...document.querySelectorAll("label")].some((l) => /run the tests/.test(l.textContent ?? "")), null, { timeout: 60000 });
  if (boot) {
    // the core and tutorial must have computed their example cells before "nothing ran" means anything
    // and the soundscript value whose running and pulling the check reads (it may compute after doubled)
    await page.waitForFunction(() => { const rt = (window as any).__ojs_runtime; const m = rt?.mains?.get("@tomlarkworthy/soundscript"); return m && m._scope.get("doubled")?._value !== undefined && [...rt._variables].some((v: any) => v._name === "soundscript" && v._value?.running); }, null, { timeout: 60000 });
    const idle = await page.evaluate(() => {
      const rt = (window as any).__ojs_runtime;
      const st: Record<string, string> = {};
      for (const v of rt._variables) if (typeof v._name === "string" && /^test_(ss_|breakout|compile|examples)/.test(v._name) && v._module && [...rt.mains.values()].includes(v._module))
        st[v._name] = v._value !== undefined ? "ran" : "pending";
      const ss = [...rt._variables].find((v: any) => v._name === "soundscript" && v._value?.running)?._value;
      const bm = rt.mains.get("@tomlarkworthy/soundscript-breakout");
      const ball = bm?._scope.get("ballView");
      // the clocks of the page's own modules (its mains): a spec test that runs at boot (test_spec_S7_4, S7_5) makes a
      // module of its own (spec_editor, not a main) whose generator it pulls, and ss.pulling() with no argument counts it
      const own = (v: any) => [...rt.mains.values()].includes(v._module);
      const hs = ss ? [...rt._variables].filter((v: any) => own(v) && ss.isEvents(v._value)).map((v: any) => v._value) : [];
      const others = ss ? [...rt._variables].filter((v: any) => !own(v) && ss.isEvents(v._value) && ss.pulling([v._value]) > 0).map((v: any) => v._name) : [];
      return { ran: Object.entries(st).filter(([, x]) => x !== "pending").map(([n]) => n), pending: Object.keys(st).length, running: ss?.running(hs), pulling: ss?.pulling(hs), others, ballRuns: ball ? ball._version : null };
    });
    bootBallRuns.set(label, idle.ballRuns);
    const runs = await bootRuns(page);
    const ball = runs?.find((c) => c.module === BREAKOUT && c.name === "ballView")?.runs ?? null;
    report(idle.ran.length === 0 && idle.pulling === 0 && (idle.ballRuns === null || ball === 1), `${label}: at boot ${idle.pending} test cells are pending and none ran (${JSON.stringify(idle.ran)}); the page's modules have ${idle.running} listeners attached and ${idle.pulling} clocks pulled (modules a test made pull ${JSON.stringify(idle.others)}); the page's ballView ran ${ball} times (the runtime computed it ${idle.ballRuns} times)`);
    if (runs) {
      const more = runs.filter((c) => c.runs === null || c.runs > 1).map((c) => `${c.module.split("/")[1]}:${c.name} ${c.runs}`);
      report(runs.length > 0 && !more.length, `${label}: at boot each of the ${runs.length} SoundScript cells that take a runtime cell in the core, the tutorial and Breakout ran at most once (${runs.filter((c) => c.runs === 1).length} once, ${runs.filter((c) => c.runs === 0).length} not read); more than once or not found: ${JSON.stringify(more)}`);
    }
  }
  // each toggle is found by the module whose cell holds it; when its pane shows another tab, that
  // module's tab is clicked first. The tutorial goes last, so its tab is the one left showing.
  let n = 0;
  for (const m of [CORE, TUTORIAL]) {
    const tag = await page.evaluate((m) => {
      const rt = (window as any).__ojs_runtime, mod = rt.mains.get(m);
      for (const el of document.querySelectorAll("input[type=checkbox]")) {
        const label = el.closest("form")?.querySelector("label")?.textContent ?? "";
        const cell = el.closest(".observablehq") as any;
        if (label.trim() === "run the tests" && cell?.variable?._module === mod) { el.setAttribute("data-tests-toggle", m); return true; }
      }
      return false;
    }, m);
    if (!tag) continue;
    const box = page.locator(`[data-tests-toggle="${m}"]`);
    if (!(await box.isVisible())) await page.locator(`[title="${m}  (drag to a pane edge to dock, or out to save as .js)"]`).first().click();
    await box.check();
    n++;
  }
  console.log(`  ${label}: turned on ${n} test toggles (${Date.now() - t0} ms)`);
}

// --- the work behind what used to be speed budgets: counts of checks, evaluations and frames; the times are measurements
// Breakout while playing, counted by frame: from the first animation frame that sees a new world, n frames.
// Each of them must see a new world; ballView runs once per world, and bricksView, paddleView, onTick and
// ticks at most once per world.
const playFrames = (page: Page, n: number) => page.evaluate(async (n) => {
  const bm = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-breakout");
  const ss = [...(window as any).__ojs_runtime._variables].find((x: any) => x._name === "soundscript" && x._value)._value;
  const names = ["ballView", "bricksView", "paddleView", "onTick", "ticks"];
  const runs = () => Object.fromEntries(names.map((c) => [c, bm._scope.get(c)._version]));
  const world = () => bm._scope.get("world")._value;
  let last = world(), seq = "", r0: Record<string, number> | null = null, b0 = 0, t0 = 0, waited = 0;
  // the cap on frames before the first change only turns a game that never starts into a failure
  await new Promise<void>((res) => {
    const f = () => {
      const w = world();
      if (!r0) {
        if (w !== last) { r0 = runs(); b0 = w.bricks.length; t0 = performance.now(); last = w; }
        else if (++waited > 600) return res();
        return requestAnimationFrame(f);
      }
      seq += w !== last ? "1" : "0";
      last = w;
      if (seq.length < n) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
  const ms = performance.now() - t0, r1 = runs();
  const ran = r0 ? Object.fromEntries(names.map((c) => [c, r1[c] - r0![c]])) : null;
  const changes = seq.split("").filter((x) => x === "1").length;
  return { seq, changes, ran, broken: b0 - world().bricks.length, over: !!bm._scope.get("over")._value, perSecond: +(changes * 1000 / ms).toFixed(1), framesPerSecond: +(seq.length * 1000 / ms).toFixed(1) };
}, n);
type Play = Awaited<ReturnType<typeof playFrames>>;
// a frame that sees no new world is a matter of when the frame fell, so it is printed and not failed on:
// what is checked is that each new world drew the ball once, and ran each other view, the listener and the
// events variable at most once (the runtime runs a cell when its input's variable runs, equal value or not)
const playOk = (p: Play, n: number) => !!p.ran && p.changes > 0 && !p.over && p.ran.ballView === p.changes && ["bricksView", "paddleView", "onTick", "ticks"].every((c) => p.ran![c] <= p.changes);
const playSays = (p: Play, n: number) => `${p.changes} of ${n} animation frames saw a new world${p.changes < n ? ` (${p.seq})` : ""}; runs ${JSON.stringify(p.ran)} for ${p.broken} broken bricks; over ${p.over}`;

async function speed() {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  await countWorkers(page);
  await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : r.abort()));
  // first appearance of a rendered tutorial cell and of a checker verdict, timed from navigation start
  await page.addInitScript(() => {
    const w = window as any;
    w.__marks = {};
    w.__longtasks = [];
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__longtasks.push({ at: e.startTime, ms: e.duration }); }).observe({ type: "longtask", buffered: true }); } catch {}
    const mark = (k: string) => { w.__marks[k] ??= performance.now(); };
    new MutationObserver(() => {
      if (!w.__marks.firstRender && [...document.querySelectorAll("h1")].some((h) => /SoundScript/.test(h.textContent ?? ""))) mark("firstRender");
      if (!w.__marks.firstCheck && document.querySelector("tr.lite-ok, .lite-summary")) mark("firstCheck");
    }).observe(document, { subtree: true, childList: true });
  });
  await page.goto(`file://${file}`);
  await page.waitForFunction(() => (window as any).__marks.firstRender && (window as any).__marks.firstCheck, null, { timeout: 60000 }).catch(() => {});
  const marks = await page.evaluate(() => (window as any).__marks);
  // the two load times stood only for "fast": they are measured; that both appear is checked
  report(marks.firstRender > 0 && marks.firstCheck > 0, `load: the tutorial's title and a checker verdict both render (${marks.firstRender ? "title" : "no title"}, ${marks.firstCheck ? "verdict" : "no verdict"})`);
  measure(`load to the tutorial's title rendered: ${marks.firstRender?.toFixed(0)} ms`);
  measure(`load to the first checker verdict on the page: ${marks.firstCheck?.toFixed(0)} ms`);
  await page.waitForFunction(() => { const rt = (window as any).__ojs_runtime; const m = rt?.mains?.get("@tomlarkworthy/soundscript"); return m?._scope.get("ss_language")?._value; }, null, { timeout: 60000 });
  // what the editor's lint runs for one keystroke: one check of the module as edited (the module as it is
  // is remembered), and no cell body runs
  const ks = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript"), tut = rt.mains.get("@tomlarkworthy/soundscript-tutorial");
    const lang = core._scope.get("ss_language")._value;
    const v = tut._scope.get("width");
    const src = await lang.decompile([v]);
    const ss = [...(window as any).__ojs_runtime._variables].find((x: any) => x._name === "soundscript" && x._value)._value;
    const t: number[] = [];
    lang.check(src, [v]);
    // computations of the page's SoundScript variables: the runtime's count of each variable's runs
    const computed = () => [...rt._variables].reduce((n: number, x: any) => n + (typeof x._definition === "function" && ss.langOf(String(x._definition)) === "ss" ? x._version : 0), 0);
    const c0 = ss.checksRun(), e0 = computed();
    for (let i = 0; i < 30; i++) { const a = performance.now(); lang.lint(src.replace(/\d+/, String(600 + i)), [v]); t.push(performance.now() - a); }
    const checks = ss.checksRun() - c0, evals = computed() - e0;
    t.sort((x, y) => x - y);
    const cells = core._scope.get("ss_moduleCells")._value(tut).length;
    return { cells, median: t[15], max: t[29], checks, evals };
  });
  // the checker module's SoundScript section (ts-cells.ts SS_FILES, lite/types.ss.ts): the core checks that module's
  // SoundScript cells, with its Observable JavaScript cells outside, and an edit of each cell to its own text, as
  // the editor makes it, is ok and has no problems
  // the same for the runtime module's section (lite/runtime.ss.ts), whose cells take the runtime's own cells. Each
  // module's SoundScript cells, compiled again by the core, give the variables the build made (ss_roundtrip)
  const section = (marker: string) => page.evaluate(async (marker: string) => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
    const lang = core._scope.get("ss_language")._value, check = core._scope.get("ss_check")._value;
    // the checker module is the one that defines parser_lib, the runtime module the core's ss_runtimeModule
    const mod = marker === "ss_runtimeModule" ? core._scope.get(marker)._value : [...rt._variables].find((x: any) => x._name === marker)._module;
    const ss = [...rt._variables].find((x: any) => x._name === "soundscript" && x._module._scope.has("parser_lib"))._value;
    const vars = [...rt._variables].filter((v: any) => v._module === mod && ss.langOf(String(v._definition)) === "ss");
    const states = check(mod).states;
    const notOk = vars.map((v: any) => ss.keyOfVariable(v._name)).filter((k: string) => !k.startsWith("type ") && states.get(k)?.state !== "ok");
    const edits: string[] = [];
    for (const v of vars) {
      const src = await lang.decompile([v]);
      if (src !== ss.decompileVariable(String(v._definition))) { edits.push(`${v._name}: decompile differs`); continue; }
      const e = lang.check(src, [v], { module: { module: mod } });
      // a type cell's edit is stored with no problems; its state is "rejected", as for the specification's type cells
      const isType = ss.keyOfVariable(v._name).startsWith("type ");
      if ((isType ? !e.store : e.state !== "ok") || e.problems.length) edits.push(`${v._name}: ${e.state} ${JSON.stringify(e.problems).slice(0, 120)}`);
    }
    let trip: number | string;
    try { trip = core._scope.get("ss_roundtrip")._value(mod); } catch (e) { trip = String((e as Error).message); }
    return { cells: vars.length, values: vars.filter((v: any) => !ss.keyOfVariable(v._name).startsWith("type ")).length, notOk, edits, trip };
  }, marker);
  for (const [label, marker] of [["checker", "parser_lib"], ["runtime", "ss_runtimeModule"]]) {
    const sec = await section(marker);
    report(sec.cells > 0 && sec.notOk.length === 0 && sec.edits.length === 0 && sec.trip === sec.cells, `${label} module: its ${sec.cells} SoundScript cells (${sec.values} with values) are ok by ss_check, each, edited to its own text, checks ok (a type cell: is stored with no problems), and compiled again by the core gives the build's variables (${sec.trip})${sec.notOk.length ? "; not ok: " + sec.notOk.join(", ") : ""}${sec.edits.length ? "; " + sec.edits.slice(0, 5).join("; ") : ""}`);
  }
  report(ks.checks === 30 && ks.evals === 0, `lint: 30 lints of width, each a different edit, against the ${ks.cells}-cell tutorial module ran ${ks.checks} module checks and ${ks.evals} cell bodies (want 30 and 0)`);
  measure(`one keystroke's lint of width against the ${ks.cells}-cell tutorial module: median ${ks.median.toFixed(1)} ms, max ${ks.max.toFixed(1)} ms of 30`);
  // the Mandelbrot timing the tutorial shows (its benchmark cell, measured during boot): the pool and the
  // main thread give the same bytes, and every worker of the pool answered jobs; the times are measured
  await page.waitForFunction(() => (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-tutorial")._scope.get("benchmark")?._value, null, { timeout: 60000 }).catch(() => {});
  const b = JSON.parse((await read(page, TUTORIAL))?.benchmark?.value ?? "null");
  const answered: number[] = await page.evaluate(() => [...((window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-mandelbrot")._scope.get("ss_pool")._value.answered ?? [])]);
  const busy = answered.filter((n) => n > 0).length, jobs = answered.reduce((a, n) => a + n, 0);
  // the Worker counter the core-only check reads, on a page that has the add-on: one per worker of the pool
  const made: number = await page.evaluate(() => (window as any).__workersMade);
  report(!!b && b.same === true && answered.length === b.poolSize && busy === Math.min(b.poolSize, b.bands) && jobs >= b.bands && made === answered.length,
    `workers: Mandelbrot ${b ? `in ${b.bands} bands: the pool and the main thread give the same bytes (${b.same}); ${busy} of the pool's ${answered.length} workers answered jobs (${JSON.stringify(answered)}, ${jobs} in all); the page constructed ${made} Workers` : "no benchmark"}`);
  if (b) measure(`Mandelbrot: main thread ${b.mainMs.toFixed(1)} ms, pool of ${b.poolSize} ${b.poolMs.toFixed(1)} ms (medians of ${b.runs})`);
  // Breakout on the page after a real click on play, counted by frame
  const play = page.getByRole("button", { name: "play", exact: true }).first();
  await play.scrollIntoViewIfNeeded();
  await play.click();
  const FRAMES = 90;
  const p = await playFrames(page, FRAMES);
  await page.getByRole("button", { name: "pause", exact: true }).first().click();
  report(playOk(p, FRAMES), `breakout: after a click on play, ${playSays(p, FRAMES)}`);
  measure(`Breakout after a click on play: ${p.perSecond} world changes/s in ${p.framesPerSecond} animation frames/s`);
  // once the specification's streaming tests have their values, the modules they made pull nothing (a race at boot, not a leak)
  const leak = await page.waitForFunction(() => { const rt = (window as any).__ojs_runtime; const m = rt.mains.get("@tomlarkworthy/soundscript-spec"); return !m || ["test_spec_S7_4", "test_spec_S7_5"].every((n) => { const v = m._scope.get(n); return v && (v._value !== undefined || v._error !== undefined); }); }, null, { timeout: 120000 })
    .then(() => page.evaluate(() => { const rt = (window as any).__ojs_runtime; const ss = [...rt._variables].find((x: any) => x._name === "soundscript" && x._value?.running)._value; const own = (v: any) => [...rt.mains.values()].includes(v._module); return [...rt._variables].filter((v: any) => !own(v) && ss.isEvents(v._value) && ss.pulling([v._value]) > 0).map((v: any) => v._name); }));
  report(leak.length === 0, `after test_spec_S7_4 and S7_5 settle, the modules a test made pull nothing (${JSON.stringify(leak)})`);
  // typing in a cell editor with the tutorial open: each lint checks the module once, and nothing runs or is stored
  await page.waitForFunction(() => [...(window as any).__ojs_runtime._variables].find((x: any) => x._name === "soundscript" && x._value)._value.pulling() === 0, null, { timeout: 10000 }).catch(() => {});
  // the specification's tests run their own modules from load (S7.4 streams for many frames); the counts are of typing alone
  await page.waitForFunction((names: string[]) => names.every((n) => { const v = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-spec")?._scope.get(n); return !v || !v._reachable || v._value !== undefined || v._error !== undefined; }), SPEC_TESTS, { timeout: 180000 }).catch(() => {});
  const ed = await openEditor(page, TUTORIAL, "half");
  if (!ed) report(false, "typing: no editor for half");
  else {
    await ed.locator(".cm-content").first().click();
    await page.keyboard.press("End");
    const base = await page.evaluate(() => {
      const w = window as any, rt = w.__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript"), tut = rt.mains.get("@tomlarkworthy/soundscript-tutorial");
      const lang = core._scope.get("ss_language")._value, ss = [...(window as any).__ojs_runtime._variables].find((x: any) => x._name === "soundscript" && x._value)._value;
      w.__lint = { n: 0, last: null };
      if (!lang.__lintWrapped) { const lint = lang.lint; lang.lint = (src: string, ...a: any[]) => { const r = lint(src, ...a); w.__lint.n++; w.__lint.last = src; return r; }; lang.__lintWrapped = true; }
      w.__defs = new Map([...rt._variables].filter((v: any) => v._module === tut).map((v: any) => [v, v._definition]));
      w.__computed = () => [...rt._variables].reduce((n: number, x: any) => n + (typeof x._definition === "function" && ss.langOf(String(x._definition)) === "ss" ? x._version : 0), 0);
      return { t0: performance.now(), checks: ss.checksRun(), evals: w.__computed() };
    });
    await page.keyboard.type(" + 0".repeat(8), { delay: 40 });
    // the lint runs after the editor's pause: the wait is for the lint of the text as typed
    const doc = await editorText(ed);
    await page.waitForFunction((doc) => (window as any).__lint.last === doc, doc, { timeout: 10000 }).catch(() => {});
    const r = await page.evaluate(([base, doc]: any) => {
      const w = window as any, rt = w.__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript"), tut = rt.mains.get("@tomlarkworthy/soundscript-tutorial");
      const ss = [...(window as any).__ojs_runtime._variables].find((x: any) => x._name === "soundscript" && x._value)._value;
      const redefined = [...rt._variables].filter((v: any) => v._module === tut && w.__defs.get(v) !== v._definition).map((v: any) => v._name);
      return { lints: w.__lint.n, linted: w.__lint.last === doc && doc.includes(" + 0".repeat(8)), checks: ss.checksRun() - base.checks, evals: w.__computed() - base.evals, redefined, longtasks: w.__longtasks.filter((e: any) => e.at >= base.t0).map((e: any) => Math.round(e.ms)) };
    }, [base, doc]);
    // a lint checks the module as edited; the module as it is, checked once, is remembered
    report(r.linted && r.lints > 0 && r.checks <= r.lints + 1 && r.evals === 0 && r.redefined.length === 0,
      `typing: 32 keys into half's editor with the tutorial open: the text as typed was linted (${r.linted}); ${r.lints} lints ran ${r.checks} module checks (one each, and one of the module as it is), ${r.evals} cell bodies ran, redefined ${JSON.stringify(r.redefined)}`);
    measure(`typing 32 keys into half's editor (40 ms apart): ${r.longtasks.length} tasks over 50 ms ${JSON.stringify(r.longtasks)}`);
  }
  await page.close();
}

const counterLesson = (page: Page) => page.locator(".observablehq").filter({ has: page.getByRole("button", { name: "add one" }) }).filter({ hasNot: page.locator(".lite-lesson") }).first();
async function counterClick(page: Page, label: string) {
  const cell = counterLesson(page);
  await cell.scrollIntoViewIfNeeded();
  const before = Number(await cell.locator("output").textContent());
  await cell.getByRole("button", { name: "add one" }).click();
  await page.waitForFunction((b) => [...document.querySelectorAll(".observablehq output")].some((o) => Number(o.textContent) === b + 1), before, { timeout: 5000 }).catch(() => {});
  const after = Number(await cell.locator("output").textContent());
  report(after === before + 1, `${label}: live counter click: output ${before} -> ${after}`);
  // save is an action that stores read(count): after a click it shows the count as it was when clicked
  const savedText = () => cell.locator("span", { hasText: /^saved / }).first().textContent();
  await cell.getByRole("button", { name: "save" }).click();
  await page.waitForFunction((a) => [...document.querySelectorAll(".observablehq span")].some((e) => e.textContent === `saved ${a}`), after, { timeout: 5000 }).catch(() => {});
  const saved = await savedText();
  await cell.getByRole("button", { name: "add one" }).click();
  await page.waitForFunction((a) => [...document.querySelectorAll(".observablehq output")].some((o) => Number(o.textContent) === a + 1), after, { timeout: 5000 }).catch(() => {});
  const later = await savedText();
  report(saved === `saved ${after}` && later === saved, `${label}: save stores read(count): "${saved}" after a click at ${after}, "${later}" after one more add`);
}

// The editor on one cell: typed source shown, an unchanged Shift-Enter save, then a typed `from` -> `to`
// edit that must show a diagnostic naming `rule` and be stored, the cell raising the checker's message
// instead of running; then the original typed back, which repairs it.
async function editorOn(page: Page, label: string, module: string, cell: string, from: string, to: string, rule: string) {
  const ed = await page.evaluate(async ([module, cell, from, to, rule]) => {
    const rt = (window as any).__ojs_runtime;
    const find = (name: string, mod?: any) => [...rt._variables].find((v: any) => v._name === name && (!mod || v._module === mod));
    const mod = rt.mains.get(module);
    const inc = find(cell, mod);
    const editors = find("editors")?._value, EditorView = find("EditorView")?._value, ss = find("soundscript", rt.mains.get("@tomlarkworthy/soundscript"))._value;
    const until = async (fn: () => any, what: string, ms = 15000) => {
      const t0 = Date.now();
      for (;;) { const got = await fn(); if (got) return got; if (Date.now() - t0 > ms) throw new Error(`${what} not reached in ${ms} ms`); await new Promise((r) => setTimeout(r, 100)); }
    };
    const out: any = {};
    try {
      const host = await until(() => editors?.get(inc)?.querySelector(".hotbar") && editors.get(inc), `an editor beside ${cell}`);
      host.querySelector(".hotbar").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const cm = await until(() => host.querySelector(".cm-editor"), `CodeMirror for ${cell}`);
      await until(() => (cm.querySelector(".cm-content")?.textContent ?? "").trim(), "source in the editor");
      const view = EditorView.findFromDOM(cm);
      const want = ss.decompileVariable(String(inc._definition));
      out.shown = view.state.doc.toString();
      out.showsTyped = out.shown === want && out.shown.includes(from);
      const fn0 = inc._definition, text0 = String(fn0), pid0 = inc.pid;
      const shiftEnter = () => view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, shiftKey: true, bubbles: true, cancelable: true }));
      shiftEnter();
      await until(() => inc._definition !== fn0, `${cell} redefined by the unchanged save`);
      out.unchanged = [String(inc._definition) === text0, inc.pid === pid0, [...rt._variables].filter((v: any) => v._module === mod && v._name === cell).length === 1, view.state.doc.toString() === want];
      const fn1 = inc._definition;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: want.replace(from, to) } });
      shiftEnter();
      const codemirror = find("codemirror")._value;
      out.diagnostics = await until(() => {
        const ds: string[] = [];
        codemirror.forEachDiagnostic?.(view.state, (d: any) => ds.push(d.message));
        return ds.length && host.querySelector(".cm-lintRange-error, .cm-lint-marker-error") ? ds : null;
      }, "a diagnostic in the editor");
      await until(() => inc._definition !== fn1, `${cell} stored by the rejected save`);
      let raised = "";
      try { await mod.value(cell); } catch (e) { raised = String((e as Error)?.message ?? e); }
      out.stored = [ss.decompileVariable(String(inc._definition)) === want.replace(from, to), raised.startsWith(`${cell} does not check: [${rule}]`), view.state.doc.toString().includes(to)];
      out.raised = raised;
      const fn2 = inc._definition;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: want } });
      shiftEnter();
      await until(() => inc._definition !== fn2, `${cell} repaired`);
      let back = null;
      try { back = await mod.value(cell); } catch (e) { back = e; }
      out.repaired = [String(inc._definition) === text0, typeof back === "function"];
    } catch (e) {
      out.error = String((e as Error)?.message ?? e);
    }
    return out;
  }, [module, cell, from, to, rule]);
  if (ed.error) report(false, `${label}: editor on ${cell}: ${ed.error}`);
  if (shot) {
    await page.locator(".cm-editor").first().scrollIntoViewIfNeeded().catch(() => {});
    await page.locator(".cm-lintRange-error").first().hover().catch(() => {});
    await page.locator(".cm-tooltip-lint").first().waitFor({ timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: shot });
  }
  report(ed.showsTyped === true, `${label}: ${cell} opens as typed SoundScript source: ${JSON.stringify(ed.shown)}`);
  report(Array.isArray(ed.unchanged) && ed.unchanged.every(Boolean), `${label}: unchanged save redefines ${cell} with the same text and pid, one variable (${ed.unchanged})`);
  report(Array.isArray(ed.diagnostics) && ed.diagnostics.some((d: string) => d.includes(`[${rule}]`)), `${label}: ${to} shows a diagnostic: ${JSON.stringify(ed.diagnostics)}`);
  report(Array.isArray(ed.stored) && ed.stored.every(Boolean), `${label}: the rejected save is stored as typed and ${cell} raises the checker's message (${ed.stored}): ${JSON.stringify(ed.raised)}`);
  report(Array.isArray(ed.repaired) && ed.repaired.every(Boolean), `${label}: typing the original back repairs ${cell}: the same compiled text, a value again (${ed.repaired})`);
}

// A new cell through the editor's compile_and_update, placed after `anchor`.
const addCell = (page: Page, module: string, anchor: string, source: string, keep: boolean) => page.evaluate(async ([module, anchor, source, keep]) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get(module);
  const find = (name: string, m?: any) => [...rt._variables].find((v: any) => v._name === name && (!m || v._module === m));
  const cau = find("compile_and_update")._value;
  const a = find(anchor, mod);
  const vars: any[] = [];
  const back = await cau(source, vars, { module: { module: mod }, variables: [a] });
  const name = /const (\w+)/.exec(source)![1];
  const v = find(name, mod);
  const value = v ? await mod.value(name) : undefined;
  const order = [...rt._variables];
  const out = { back, value, afterAnchor: !!v && order.indexOf(v) === order.indexOf(a) + 1, held: vars.length === 1 && vars[0] === v };
  if (!keep) v?.delete();
  return out;
}, [module, anchor, source, keep] as const);

const exportPage = (page: Page) => page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  let v = [...rt._variables].find((v: any) => v._name === "exportToHTML" && typeof v._value === "function");
  if (!v) {
    v = [...rt._variables].find((v: any) => v._name === "exportToHTML");
    v._reachable = true; rt._computeNow();
    for (let i = 0; i < 100 && typeof v._value !== "function"; i++) await new Promise((r) => setTimeout(r, 100));
  }
  const r = await v._value({ mains: rt.mains });
  return r.source ?? r;
});
const ssSource = (page: Page, name: string) => page.evaluate((name) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get(name);
  const core = rt.mains.get("@tomlarkworthy/soundscript");
  return [...rt._variables].find((v: any) => v._module === core && v._name === "ss_check")._value(mod).source as string;
}, name);
const ssLines = (html: string, name: string) => (blockContent(html, name) ?? "").split("\n").filter((l) => l.includes('/*{lang:"ss"}*/')).sort();
const ids = (html: string) => new Set(blockSpans(html).map((s) => s.id));
// a module block's variable names ($def and main.define) and its `new Worker(...)` expressions, from its parse
function blockFacts(src: string) {
  const names: string[] = [];
  let newWorker = 0;
  const go = (n: any): void => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(go);
    const c = n.callee;
    if (n.type === "CallExpression" && n.arguments[0]?.type === "Literal") {
      if (c.type === "Identifier" && c.name === "$def" && n.arguments[1]?.type === "Literal") names.push(n.arguments[1].value);
      if (c.type === "MemberExpression" && c.object.name === "main" && c.property.name === "define" && !String(n.arguments[0].value).startsWith("module ")) names.push(n.arguments[0].value);
    }
    if (n.type === "NewExpression" && c.type === "Identifier" && c.name === "Worker") newWorker++;
    for (const k of Object.keys(n)) if (k !== "type") go(n[k]);
  };
  go(acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" }));
  return { names, newWorker };
}
// the tutorial's bundle-size row is a constant build.ts writes; it must be the parser bundle the file embeds
{
  const html = readFileSync(file, "utf8");
  const gz = Buffer.from((blockContent(html, "@tomlarkworthy/soundscript-checker/acorn-typescript.js.gz") ?? "").replace(/\s+/g, ""), "base64");
  const raw = gz.length ? Bun.gunzipSync(gz).length : 0;
  const m = /raw: (\d+), gz: (\d+)/.exec(blockContent(html, TUTORIAL) ?? "");
  report(!!m && +m[1] === raw && +m[2] === gz.length, `ss_bytes: the size row (${m?.[1]} raw, ${m?.[2]} gz) is the embedded acorn-typescript.js.gz (${raw} raw, ${gz.length} gz)`);
}
function sameBlocks(label: string, a: string, b: string) {
  const A = ids(a), B = ids(b);
  const gone = [...A].filter((x) => !B.has(x)), added = [...B].filter((x) => !A.has(x));
  report(gone.length === 0 && added.length === 0, `${label}: the export has the built file's ${A.size} block ids${gone.length ? "; dropped " + gone.join(", ") : ""}${added.length ? "; added " + added.join(", ") : ""}`);
}


// --- real user paths: Playwright mouse and keyboard on the editor and the lopepage menu
const SECTION_TESTS: Record<string, string[]> = { "@tomlarkworthy/soundscript-reducer": ["test_undo"], "@tomlarkworthy/soundscript-model": ["areaOf4"], "@tomlarkworthy/soundscript-mandelbrot": ["image"], "@tomlarkworthy/soundscript-breakout": ["test_replay"], "@tomlarkworthy/soundscript-polyglot": ["summary", "test_polyglot_listing", "test_polyglot_fromRaw"] };
const MOD = process.platform === "darwin" ? "Meta" : "Control";
let tagN = 0;
// tags the editor host of a cell's variable so a locator can reach it; null when the cell has none in view
const tagEditor = (page: Page, module: string, cell: string) => page.evaluate(async ([module, cell, tag]) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get(module);
  // a viewof cell (a state cell among them) is drawn, and edited, by its viewof variable; both it and the
  // editors Map are looked up on every try, so a variable replaced or a Map computed late is still found
  const varOf = () => mod._scope.get(`viewof ${cell}`) ?? [...rt._variables].find((v: any) => v._module === mod && v._name === cell);
  const editorsMap = () => [...rt._variables].find((v: any) => v._name === "editors" && v._value instanceof Map)?._value;
  for (let i = 0; i < 150; i++) {
    const host = editorsMap()?.get(varOf());
    if (host?.querySelector(".hotbar")) { host.setAttribute("data-verify", tag); host.scrollIntoView({ block: "center" }); return tag; }
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}, [module, cell, `e${++tagN}`]);
const defOf = (page: Page, module: string, cell: string) => page.evaluate(([module, cell]) => {
  const rt = (window as any).__ojs_runtime;
  const v = [...rt._variables].find((v: any) => v._module === rt.mains.get(module) && v._name === cell);
  return v ? String(v._definition) : null;
}, [module, cell]);
// A cell's value through module.value. The page-side timer keeps the evaluate's promise reachable, so
// a module.value that never settles comes back as HUNG instead of CDP collecting the promise (which
// Playwright reports as "Execution context was destroyed"); both are logged and retried, so a
// recurrence is evidence in the log rather than a failed run.
const valueOnce = (page: Page, module: string, cell: string) => page.evaluate(async ([module, cell]) => {
  const rt = (window as any).__ojs_runtime;
  const hung = new Promise((r) => setTimeout(() => r("__HUNG__"), 5000));
  try { return await Promise.race([rt.mains.get(module).value(cell), hung]); } catch (e) { return "THREW " + String((e as Error)?.message ?? e); }
}, [module, cell]);
async function valueOf(page: Page, module: string, cell: string): Promise<any> {
  for (let i = 0; ; i++) {
    try {
      const v = await valueOnce(page, module, cell);
      if (v !== "__HUNG__" || i >= 3) return v;
      console.log(`  valueOf: ${module}.value("${cell}") did not settle in 5 s (try ${i + 1}); retrying`);
    } catch (e) {
      if (i >= 3 || !/Execution context was destroyed|Promise was collected/.test(String((e as Error).message))) throw e;
      console.log(`  valueOf: ${module}.value("${cell}"): ${String((e as Error).message).split("\n")[0]} (try ${i + 1}); retrying; after "${LAST}"; at ${new Error().stack!.split("\n").filter((l) => l.includes("verify.ts")).slice(1, 4).map((l) => l.trim().replace(/^at /, "").replace(/\(.*verify\.ts:/, "(verify.ts:")).join(" < ")}`);
    }
  }
}
async function openEditor(page: Page, module: string, cell: string) {
  const tag = await tagEditor(page, module, cell);
  if (!tag) return null;
  const host = page.locator(`[data-verify="${tag}"]`);
  // a saved file keeps an editor open if it was open when saved; the hotbar would close it
  if (!(await host.locator(".cm-editor").count())) await host.locator(".hotbar").first().click();
  await host.locator(".cm-editor").first().waitFor({ timeout: 10000 });
  await page.waitForFunction((t) => (document.querySelector(`[data-verify="${t}"] .cm-content`)?.textContent ?? "").trim().length > 0, tag, { timeout: 10000 });
  return host;
}
const editorText = (host: any) => host.locator(".cm-content").first().evaluate((el: any) => (window as any).__ojs_runtime && [...(window as any).__ojs_runtime._variables].find((v: any) => v._name === "EditorView")._value.findFromDOM(el.closest(".cm-editor")).state.doc.toString());
async function typeInto(page: Page, host: any, text: string, apply = true) {
  // keys go to whatever has focus, and Enter on a focused link navigates, so the editor must hold focus first
  const content = host.locator(".cm-content").first();
  await page.evaluate(() => {
    const w = window as any;
    if (w.__focusLog) return;
    w.__focusLog = [];
    const d = (e: any) => e ? `${e.tagName}.${String(e.className).slice(0, 40)}${e.isConnected ? "" : "(detached)"}` : "null";
    document.addEventListener("focusout", (e) => w.__focusLog.push(`${Math.round(performance.now())} out ${d(e.target)} -> ${d(e.relatedTarget)}`), true);
    document.addEventListener("focusin", (e) => w.__focusLog.push(`${Math.round(performance.now())} in ${d(e.target)}`), true);
  });
  for (let i = 0; i < 20; i++) {
    await content.click();
    if (await content.evaluate((el: Element) => el.contains(document.activeElement))) break;
  }
  // seen once in 6 runs (2026-11-14): clicks did not take focus while the pane was still scrolling
  if (!(await content.evaluate((el: Element) => el.contains(document.activeElement)))) {
    console.log("  typeInto: clicks did not focus the editor; focusing it directly");
    await content.evaluate((el: HTMLElement) => { el.scrollIntoView({ block: "center" }); el.focus(); });
  }
  if (!(await content.evaluate((el: Element) => el.contains(document.activeElement)))) {
    // evidence for the failure: where focus went, and whether the editor node is still in the page
    const why = await content.evaluate((el: Element) => {
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      const desc = (e: any) => e ? `${e.tagName}.${String(e.className).slice(0, 50)}` : "null";
      const chain: string[] = [];
      for (let e: any = el; e && e.nodeType === 1; e = e.parentElement) {
        const cs = getComputedStyle(e);
        const odd = [cs.display === "none" && "display:none", cs.visibility !== "visible" && "visibility:" + cs.visibility, cs.pointerEvents !== "auto" && "pointer-events:" + cs.pointerEvents, e.inert && "inert", cs.userSelect === "none" && "user-select:none", e.getAttribute("contenteditable") !== null && "ce=" + e.getAttribute("contenteditable"), e.hasAttribute("tabindex") && "tabindex=" + e.getAttribute("tabindex")].filter(Boolean);
        if (odd.length) chain.push(`${desc(e)} ${odd.join(" ")}`);
      }
      const rt = (window as any).__ojs_runtime, EV = [...rt._variables].find((v: any) => v._name === "EditorView")?._value;
      const view = EV?.findFromDOM(el.closest(".cm-editor"));
      return { connected: el.isConnected, active: desc(document.activeElement), rect: [Math.round(x), Math.round(y)], hit: desc(hit), hitInside: !!hit && el.contains(hit), contenteditable: el.getAttribute("contenteditable"),
        view: view ? { destroyed: view.destroyed, domIsThis: view.dom === el.closest(".cm-editor"), contentIsThis: view.contentDOM === el, inDoc: view.dom.isConnected, hasFocus: view.hasFocus, editable: view.state.facet(EV.editable) } : "no view",
        chain, log: ((window as any).__focusLog ?? []).slice(-8), trace: ((window as any).__ft ?? []).slice(-40) };
    }).catch((e: Error) => ({ detached: String(e.message).slice(0, 120) }));
    throw new Error(`the editor did not take focus after 20 clicks: ${JSON.stringify(why)}`);
  }
  await page.keyboard.press(`${MOD}+KeyA`);
  await page.keyboard.insertText(text);
  if (apply) await page.keyboard.press("Shift+Enter");
}
// Completion in the editor, with real key events: a SoundScript cell completes from the checker's
// types, an ordinary cell from runtime values as before.
async function completion(page: Page) {
  const popup = () => page.evaluate(() => [...document.querySelectorAll(".cm-tooltip-autocomplete li")].map((li) => li.querySelector(".cm-completionLabel")?.textContent ?? ""));
  // the completion state of the focused editor, through the CodeMirror build the editor module uses
  const statusFn = () => {
    const rt = (window as any).__ojs_runtime;
    const em = [...rt._variables].find((v: any) => v._name === "editor_manager");
    const cm = em?._module._scope.get("codemirror")?._value;
    const EV = em?._module._scope.get("EditorView")?._value;
    const el = document.activeElement?.closest(".cm-editor");
    const view = el && EV?.findFromDOM(el);
    return view ? String(cm.completionStatus(view.state)) : "no focused editor";
  };
  const status = () => page.evaluate(statusFn);
  const waitPopup = async () => {
    await page.waitForFunction(`(${statusFn})() === "active"`, null, { timeout: 5000 }).catch(() => {});
    await takesCompletion(page);
    return popup();
  };
  const typeAndList = async (host: any, text: string, key: string) => {
    await place(host, text);
    await page.keyboard.type(key);
    return waitPopup();
  };
  // puts text in the editor and the cursor at the `|` in it
  const place = (host: any, text: string) => host.locator(".cm-content").first().evaluate((el: any, text: string) => {
    const view = [...(window as any).__ojs_runtime._variables].find((v: any) => v._name === "EditorView")._value.findFromDOM(el.closest(".cm-editor"));
    const at = text.indexOf("|");
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text.replace("|", "") }, ...(at >= 0 ? { selection: { anchor: at } } : {}) });
    view.focus();
  }, text);
  await page.evaluate(() => {
    const w = window as any;
    w.__focusLog2 = [];
    const d = (e: any) => e ? `${e.tagName}.${String(e.className).slice(0, 40)}${e.isConnected ? "" : "(detached)"}` : "null";
    document.addEventListener("focusout", (e) => w.__focusLog2.push(`${Math.round(performance.now())} out ${d(e.target)} -> ${d((e as FocusEvent).relatedTarget)} ${new Error().stack?.split("\n").slice(2, 6).join(" | ")}`), true);
    const mo = new MutationObserver((ms) => { for (const m of ms) for (const n of m.removedNodes) if ((n as Element).querySelector?.(".cm-editor") || (n as Element).classList?.contains("cm-editor")) w.__focusLog2.push(`${Math.round(performance.now())} removed ${(n as Element).tagName}.${String((n as Element).className).slice(0, 40)}`); });
    mo.observe(document.body, { childList: true, subtree: true });
  });
  // the tutorial's tab is already showing (testsOn leaves it); clicking a tab rebuilds the pane
  const inc = await openEditor(page, TUTORIAL, "increment");
  if (!inc) { report(false, "completion: no editor for increment"); return; }
  const original = await editorText(inc);
  const head = original.slice(0, original.indexOf("const increment"));
  // the editor's header names the cell's own inputs and outputs, not ss or unnamed observers
  const header = await inc.evaluate((el: Element) => [...el.querySelectorAll("span")].map((s) => s.textContent ?? "").filter((t) => /^(inputs|outputs):/.test(t.trim())).map((t) => t.trim()));
  report(header.some((t) => /^inputs: .*\bcount\b/.test(t)) && !header.some((t) => /\banon\b|\bss\b|invalidation/.test(t)), `completion: increment's editor header lists its own inputs, no anon or ss: ${JSON.stringify(header)}`);
  const refList = await typeAndList(inc, head + "const increment = (count: State<number>) => action(() => count|)", ".");
  const why = refList.length ? "" : await inc.locator(".cm-content").first().evaluate((el: any) => {
    const rt = (window as any).__ojs_runtime;
    const view = [...rt._variables].find((v: any) => v._name === "EditorView")._value.findFromDOM(el.closest(".cm-editor"));
    const lang = [...rt._variables].find((v: any) => v._name === "ss_language")._value;
    const inc = [...rt._variables].find((v: any) => v._name === "increment" && v._module === rt.mains.get("@tomlarkworthy/soundscript-tutorial"));
    let r; try { r = lang.complete(view.state.doc.toString(), view.state.selection.main.head, [inc]); } catch (e) { r = String(e); }
    return JSON.stringify({ doc: view.state.doc.toString().slice(-40), head: view.state.selection.main.head, focus: view.hasFocus, r });
  });
  report(JSON.stringify(refList) === '["set","update"]', `completion: typing count. in increment lists exactly set and update: ${JSON.stringify(refList)}${why}`);
  if (process.argv.includes("--shots")) {
    await inc.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(HERE, "shots", "desktop-autocomplete-ref.png") });
  }
  const atEnter = await status();
  const log = await page.evaluate(() => (window as any).__focusLog2.slice(-6));
  await page.keyboard.press("Enter");
  const accepted = await editorText(inc);
  report(accepted === head + "const increment = (count: State<number>) => action(() => count.set)", `completion: Enter takes set: ${JSON.stringify(accepted.slice(head.length))}${accepted.endsWith("count.set)") ? "" : ` (completion ${atEnter}) ${JSON.stringify(log)}`}`);
  const upd = await typeAndList(inc, head + "const increment = (count: State<number>) => action(() => count.up|)", "d");
  const atTab = await status();
  const logTab = upd.length ? "" : JSON.stringify(await page.evaluate(() => (window as any).__focusLog2.slice(-6)));
  await page.keyboard.press("Tab");
  const tabbed = await editorText(inc);
  report(JSON.stringify(upd) === '["update"]' && tabbed.endsWith("count.update)"), `completion: count.upd then Tab gives update: ${JSON.stringify(upd)} ${JSON.stringify(tabbed.slice(head.length))} (completion ${atTab}) ${logTab}`);
  await place(inc, original);
  await page.keyboard.press("Escape");

  // a value parameter of the state cell: number members. app takes count: number
  const app = await openEditor(page, TUTORIAL, "app");
  if (app) {
    const o = await editorText(app);
    const h = o.slice(0, o.indexOf("const app"));
    const nums = await typeAndList(app, h + "const app = (count: number) => count|;", ".");
    report(nums.includes("toFixed") && !nums.includes("set") && !nums.includes("update"), `completion: count. in app (count: number) lists number members: ${JSON.stringify(nums)}`);
    await page.keyboard.press("Escape");
    await place(app, o);
  } else report(false, "completion: no editor for app");

  // an ordinary cell still completes from runtime values
  const plain = await openEditor(page, TUTORIAL, "tests_on");
  if (plain) {
    const o = await editorText(plain);
    const rt = await typeAndList(plain, "tests_on = Math|", ".");
    report(rt.includes("random") && rt.includes("floor"), `completion: an ordinary cell still completes from runtime values (Math. lists random): ${rt.length} items`);
    await page.keyboard.press("Escape");
    await place(plain, o);
  } else report(false, "completion: no editor for tests_on");

  // every member a SoundScript cell of the tutorial or core uses is offered at its place; each completion
  // checks the module at most once per placeholder variant (4), and one of count. checks it once
  const all = await page.evaluate(([tut, core]) => {
    const rt = (window as any).__ojs_runtime;
    const find = (n: string, m?: any) => [...rt._variables].find((v: any) => v._name === n && (!m || v._module === m));
    const lang = find("ss_language")._value, cellsOf = find("ss_moduleCells")._value;
    const work = find("soundscript", rt.mains.get(core))._value.completionWork;
    const missed: string[] = [], times: number[] = [];
    let n = 0;
    const w0 = { ...work };
    for (const [name, mod] of rt.mains) {
      if (!String(name).startsWith(core)) continue;
      for (const c of cellsOf(mod)) {
        const re = /(?<![\w$.])([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)/g;
        for (const m of c.text.matchAll(re)) {
          const pos = m.index! + m[1].length + 1;
          const before = c.text.slice(0, pos);
          if (/\/\/[^\n]*$/.test(before) || (before.split("`").length % 2 === 0) || (before.split('"').length % 2 === 0)) continue;
          const t0 = performance.now();
          const r = lang.complete(c.text, pos, [c.variable], { module: { module: mod }, variables: [c.variable] });
          times.push(performance.now() - t0);
          n++;
          if (!r.options.some((o: any) => o.label === m[2])) missed.push(`${c.key}: ${m[1]}.${m[2]} (${r.mode} ${r.options.slice(0, 4).map((o: any) => o.label)})`);
        }
      }
    }
    const sweep = { checks: work.checks - w0.checks, cells: work.cells - w0.cells };
    const inc = find("increment", rt.mains.get(tut));
    const src = cellsOf(rt.mains.get(tut)).find((c: any) => c.key === "increment").text;
    const at = src.indexOf("count.update") + 6;
    const own: number[] = [];
    const w1 = { ...work };
    for (let i = 0; i < 30; i++) { const t0 = performance.now(); lang.complete(src, at, [inc]); own.push(performance.now() - t0); }
    own.sort((a, b) => a - b);
    return { n, missed, sweep, count: { checks: work.checks - w1.checks, cells: work.cells - w1.cells }, median: own[15], max: own[29], cells: cellsOf(rt.mains.get(tut)).length };
  }, [TUTORIAL, CORE]);
  report(all.n > 20 && all.missed.length === 0, `completion: at each of ${all.n} member reads in the SoundScript cells of the core, tutorial and section modules the member read is offered${all.missed.length ? ": missed " + all.missed.slice(0, 8).join("; ") : ""}`);
  report(all.sweep.checks >= all.n && all.sweep.checks <= 4 * all.n && all.count.checks === 30 && all.count.cells <= 30 * all.cells,
    `completion: the ${all.n} member completions ran ${all.sweep.checks} module checks (one to four each); 30 completions of count. in the ${all.cells}-cell tutorial module ran ${all.count.checks} module checks inferring ${all.count.cells} cells (one check each, the whole module each time)`);
  measure(`one completion of count. in the ${all.cells}-cell tutorial module: median ${all.median.toFixed(1)} ms, max ${all.max.toFixed(1)} ms of 30`);
}
// Three editor features with real keys and clicks (2026-11-16): the highlighting follows the language
// picker before Shift-Enter; a parameter list completes the module's cells in other languages with an
// annotation read from the value; a body that reads a cell by name offers to add it as a parameter.
// Nothing is stored: each editor gets its original text back.
async function editorFeatures(page: Page) {
  const look = (host: any) => host.locator(".cm-content").first().evaluate((el: any) => {
    const rt = (window as any).__ojs_runtime;
    const cm = [...rt._variables].find((v: any) => v._name === "codemirror")._value;
    const view = [...rt._variables].find((v: any) => v._name === "EditorView")._value.findFromDOM(el.closest(".cm-editor"));
    return { lang: String(view.state.facet(cm.language)?.name ?? null), html: el.innerHTML };
  });
  const place = (host: any, text: string) => host.locator(".cm-content").first().evaluate((el: any, text: string) => {
    const view = [...(window as any).__ojs_runtime._variables].find((v: any) => v._name === "EditorView")._value.findFromDOM(el.closest(".cm-editor"));
    const at = text.indexOf("|");
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text.replace("|", "") }, ...(at >= 0 ? { selection: { anchor: at } } : {}) });
    view.focus();
  }, text);
  const popup = () => page.evaluate(() => [...document.querySelectorAll(".cm-tooltip-autocomplete li")].map((li) => li.querySelector(".cm-completionLabel")?.textContent ?? ""));
  const pickerValue = (host: any) => host.locator("select.e5-cell-language").first().evaluate((s: HTMLSelectElement) => s.value).catch(() => null);
  const pickByKey = async (host: any, key: string) => { await host.locator("select.e5-cell-language").first().focus(); await page.keyboard.press(key); };
  const app = await openEditor(page, TUTORIAL, "app");
  if (!app) { report(false, "editor features: no editor for app"); return; }
  const original = await editorText(app);
  const defOfApp = () => page.evaluate((t) => { const rt = (window as any).__ojs_runtime, m = rt.mains.get(t); return String([...rt._variables].find((v: any) => v._module === m && v._name === "app")?._definition); }, TUTORIAL);
  const def0 = await defOfApp();

  // B1: the picker moves the highlighting at once; nothing is stored
  const ss0 = await look(app);
  await pickByKey(app, "O");
  const asOjs = await pickerValue(app);
  await until(page, async () => (await look(app)).lang !== ss0.lang, 5000);
  const ojs = await look(app);
  // B3 runs here, between the two picks: a select's type-to-select joins keys pressed within a second
  // ("O" then "S" at once searched for "OS" and picked nothing); B3 takes several seconds
  // B3: a body that reads a cell by name offers to take it as a parameter
  const half = await openEditor(page, TUTORIAL, "half");
  if (!half) { report(false, "editor features: no editor for half"); return; }
  const o = await editorText(half);
  const hh = o.slice(0, o.indexOf("const half"));
  const fix = async (text: string, rule: string, name: string, button: string) => {
    await typeInto(page, half, hh + text, false);
    await until(page, async () => (await diagsOf(half)).some((d: string) => d.startsWith(`[${rule}]`)), 5000);
    const before = await diagsOf(half);
    await half.locator(".cm-lintRange-error", { hasText: new RegExp(`^${name}$`) }).last().hover();
    const btn = page.locator(".cm-tooltip-lint .cm-diagnosticAction", { hasText: button }).first();
    const shown = await btn.waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
    if (shown) await btn.click();
    await until(page, async () => !(await diagsOf(half)).some((d: string) => d.startsWith(`[${rule}]`)), 5000);
    return { before: before.filter((d: string) => d.startsWith("[")), shown, text: (await editorText(half)).slice(hh.length), after: (await diagsOf(half)).filter((d: string) => d.startsWith(`[${rule}]`)) };
  };
  const byName = await fix("const half = (area, scale) => scale(area, 0.5) + width;", "cell-by-name", "width", "Add width as a parameter");
  report(byName.shown && byName.text === "const half = (area, scale, width) => scale(area, 0.5) + width;" && !byName.after.length,
    `editor features: half reading width by name shows ${JSON.stringify(byName.before)}; clicking "Add width as a parameter" gives ${JSON.stringify(byName.text)} and the diagnostic goes (button shown ${byName.shown})`);
  const free = await fix("const half = (area, scale) => scale(area, 0.5) + shop_price;", "free-name", "shop_price", "Add shop_price: number as a parameter");
  report(free.shown && free.text === "const half = (area, scale, shop_price: number) => scale(area, 0.5) + shop_price;" && !free.after.length,
    `editor features: half reading shop_price (Observable JavaScript) by name shows ${JSON.stringify(free.before)}; clicking "Add shop_price: number as a parameter" gives ${JSON.stringify(free.text)} and the diagnostic goes (button shown ${free.shown})`);
  // B1, continued: picking SoundScript back restores the highlighting
  await pickByKey(app, "S");
  const back = await pickerValue(app);
  await until(page, async () => (await look(app)).lang === ss0.lang, 5000);
  const ss1 = await look(app);
  report(asOjs === "ojs" && ojs.lang !== ss0.lang && ojs.html !== ss0.html && back === "ss" && ss1.lang === ss0.lang && ss1.html === ss0.html && (await defOfApp()) === def0 && (await editorText(app)) === original,
    `editor features: picking Observable JavaScript by key on app re-highlights it before Shift-Enter (${ss0.lang} -> ${ojs.lang}, markup ${ojs.html !== ss0.html ? "changed" : "same"}), picking SoundScript (${back}) back restores it (${ss1.lang}, markup ${ss1.html === ss0.html ? "same" : "different"}); app is not stored (${(await defOfApp()) === def0})`);

  // B2: a parameter list completes the cells in other languages with the annotation their values suggest
  const h = original.slice(0, original.indexOf("const app"));
  const complete = async (text: string, key: string) => {
    await place(app, text);
    await page.keyboard.type(key);
    await takesCompletion(page);
    const list = await popup();
    await page.keyboard.press("Enter");
    return { list, text: (await editorText(app)).slice(h.length) };
  };
  const price = await complete(h + "const app = (count: number, shop_p|) => count;", "r");
  const basket = await complete(h + "const app = (count: number, shop_b|) => count;", "a");
  report(JSON.stringify(price.list) === '["shop_price"]' && price.text === "const app = (count: number, shop_price: number) => count;"
    && JSON.stringify(basket.list) === '["shop_basket"]' && basket.text === "const app = (count: number, shop_basket: { item: string; qty: number }[]) => count;",
    `editor features: in app's parameter list shop_pr then Enter gives ${JSON.stringify(price.text)} (list ${JSON.stringify(price.list)}); shop_ba then Enter gives ${JSON.stringify(basket.text)} (list ${JSON.stringify(basket.list)})`);
  await page.keyboard.press("Escape");
  await place(app, original);

  await typeInto(page, half, o, false);
  await page.keyboard.press("Escape");
  report((await editorText(half)) === o && (await editorText(app)) === original && (await valueOf(page, TUTORIAL, "half")) !== undefined, `editor features: app and half have their original text again, nothing stored`);
}
// The language picker rewrites the text: SoundScript -> Observable JavaScript gives the text Observable's own
// decompiler gives the compiled cell, and back gives the source; a text that does not parse or translate is
// left as it was, with the select, and the reason shown. Nothing is stored.
async function languageSwitch(page: Page) {
  const sel = (host: any) => host.locator("select.e5-cell-language").first();
  const pickerValue = (host: any) => sel(host).evaluate((s: HTMLSelectElement) => s.value).catch(() => null);
  const reasonOf = (host: any) => host.locator(".e5-cell-language-reason").first().textContent().catch(() => null);
  const pick = async (host: any, id: string) => { const t0 = await editorText(host); await sel(host).selectOption(id); return t0; };
  const close = async (host: any) => { await host.locator(".hotbar").first().click(); await host.locator(".cm-editor").first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {}); };
  const decompiled = (module: string, cell: string) => page.evaluate(async ([module, cell]) => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get(module);
    const vs = [...rt._variables].filter((v: any) => v._module === mod && (v._name === cell || v._name === `viewof ${cell}`));
    return await [...rt._variables].find((v: any) => v._name === "decompileOjs" && typeof v._value === "function")._value(vs);
  }, [module, cell]);
  const half = await openEditor(page, TUTORIAL, "half");
  if (!half) { report(false, "language switch: no editor for half"); return; }
  const def0 = await defOf(page, TUTORIAL, "half");
  const o = await editorText(half);
  const want = await decompiled(TUTORIAL, "half");
  await pick(half, "ojs");
  await until(page, async () => (await editorText(half)) !== o, 5000);
  const t1 = await editorText(half), p1 = await pickerValue(half);
  report(t1 === want && p1 === "ojs", `language switch: picking Observable JavaScript on half (SoundScript) rewrites the text to Observable's decompilation of its compiled variables: ${JSON.stringify({ equal: t1 === want, picker: p1, text: t1.slice(0, 120) })}`);
  // the marker guard: compiled text stored as Observable JavaScript is refused, so Shift-Enter stores nothing here
  const warns = () => page.evaluate(() => { const w = window as any; if (!w.__lsWarn) { w.__lsWarn = []; const w0 = console.warn; console.warn = (...a: any[]) => { w.__lsWarn.push(String(a[0]?.message ?? a[0])); return w0(...a); }; } return w.__lsWarn.length as number; });
  const w0 = await warns();
  await typeInto(page, half, t1);
  await until(page, async () => (await warns()) > w0, 10000);
  const said = await page.evaluate(() => (window as any).__lsWarn.at(-1));
  report((await defOf(page, TUTORIAL, "half")) === def0 && (await editorText(half)) === t1, `language switch: Shift-Enter on half's compiled text with Observable JavaScript picked stores nothing (the marker guard): ${JSON.stringify(said).slice(0, 160)}`);
  await pick(half, "ss");
  await until(page, async () => (await editorText(half)) !== t1, 5000);
  const t2 = await editorText(half), p2 = await pickerValue(half);
  await pick(half, "ojs");
  await until(page, async () => (await editorText(half)) !== t2, 5000);
  const t3 = await editorText(half);
  report(t2 === o && p2 === "ss" && t3 === t1, `language switch: SoundScript -> Observable JavaScript -> SoundScript gives half's source again (${t2 === o}), and Observable JavaScript (tagged) -> SoundScript -> Observable JavaScript gives the same text (${t3 === t1})`);
  await pick(half, "ss");
  await until(page, async () => (await editorText(half)) === o, 5000);
  // a text that does not parse is left as it is, with the select, and the reason is shown
  await typeInto(page, half, "const half = (area, scale", false);
  const broken = await editorText(half);
  await pick(half, "ojs");
  await until(page, async () => !!(await reasonOf(half)), 5000);
  const r1 = await reasonOf(half), p3 = await pickerValue(half);
  report((await editorText(half)) === broken && p3 === "ss" && !!r1 && (await defOf(page, TUTORIAL, "half")) === def0, `language switch: picking Observable JavaScript on a half that does not parse leaves the text and the select (${p3}) and says why: ${JSON.stringify(r1)}`);
  await typeInto(page, half, o, false);
  await page.keyboard.press("Escape");
  await close(half);
  const tab = (m: string) => page.locator(`[title="${m}  (drag to a pane edge to dock, or out to save as .js)"]`).first().click();
  await tab(CORE);
  // an Observable JavaScript cell is translated: ss_now = () => performance.now()
  const now = await openEditor(page, CORE, "ss_now");
  if (!now) { report(false, "language switch: no editor for ss_now"); return; }
  const n0 = await editorText(now), nd0 = await defOf(page, CORE, "ss_now");
  await pick(now, "ss");
  await until(page, async () => (await editorText(now)) !== n0, 5000);
  const n1 = await editorText(now), np = await pickerValue(now);
  report(n0 === "ss_now = () => performance.now()" && n1 === "const ss_now = () => () => performance.now();" && np === "ss" && (await defOf(page, CORE, "ss_now")) === nd0, `language switch: picking SoundScript on ss_now (Observable JavaScript) rewrites ${JSON.stringify(n0)} to ${JSON.stringify(n1)} (picker ${np}); nothing stored`);
  await close(now);
  // Observable JavaScript that does not parse is left as it is, with the select, and the reason is shown
  const now2 = await openEditor(page, CORE, "ss_now");
  if (!now2) { report(false, "language switch: no editor for ss_now again"); return; }
  await typeInto(page, now2, "ss_now = (", false);
  await pick(now2, "ss");
  await until(page, async () => !!(await reasonOf(now2)), 5000);
  const r3 = await reasonOf(now2), np2 = await pickerValue(now2);
  report((await editorText(now2)) === "ss_now = (" && np2 === "ojs" && !!r3 && (await defOf(page, CORE, "ss_now")) === nd0, `language switch: picking SoundScript on an ss_now that does not parse leaves the text and the select (${np2}) and says why: ${JSON.stringify(r3)}`);
  await typeInto(page, now2, n0, false);
  await page.keyboard.press("Escape");
  await close(now2);
  // a viewof cell does not translate: refused with a reason, the text and the select unchanged
  const mod = await openEditor(page, CORE, "ss_module");
  if (!mod) { report(false, "language switch: no editor for ss_module"); return; }
  const m0 = await editorText(mod), mp0 = await pickerValue(mod);
  await pick(mod, "ss");
  await until(page, async () => !!(await reasonOf(mod)), 5000);
  const r2 = await reasonOf(mod), mp1 = await pickerValue(mod);
  report(m0 === "viewof ss_module = thisModule()" && mp0 === "ojs" && mp1 === "ojs" && (await editorText(mod)) === m0 && /viewof/.test(r2 ?? ""), `language switch: picking SoundScript on viewof ss_module is refused, text and select (${mp1}) unchanged: ${JSON.stringify(r2)}`);
  await close(mod);
  await tab(TUTORIAL);
  // a new cell's language: the cell it is added after, else the first registered language its module can host.
  // The editor's add buttons always pass a cell with variables, so the second rule is asked directly.
  const langs = await page.evaluate(([tut, core]) => {
    const rt = (window as any).__ojs_runtime;
    const get = (n: string) => [...rt._variables].find((v: any) => v._name === n && v._type === 1)?._value;
    const newCellLanguage = get("newCellLanguage");
    const at = (m: string, n: string) => { const mod = rt.mains.get(m); return { module: { module: mod }, variables: [...rt._variables].filter((v: any) => v._module === mod && v._name === n) }; };
    const host = (m: any) => ({ module: { module: m, cells: [] }, variables: [] });
    return { afterSs: newCellLanguage(at(tut, "half")), afterOjs: newCellLanguage(at(core, "ss_now")), emptyHosting: newCellLanguage(host(rt.mains.get(core))), emptyPlain: newCellLanguage(host(rt.mains.get("@tomlarkworthy/lopepage-2"))) };
  }, [TUTORIAL, CORE]);
  report(langs.afterSs === "ss" && langs.afterOjs === "ojs" && langs.emptyHosting === "ss" && langs.emptyPlain === "ojs", `language switch: a new cell after half is SoundScript, after ss_now Observable JavaScript; with no cell to follow, SoundScript in a module with ss, Observable JavaScript in one without: ${JSON.stringify(langs)}`);
}
async function uiPaths(page: Page, saved: string) {
  const tab = (m: string) => page.locator(`[title="${m}  (drag to a pane edge to dock, or out to save as .js)"]`).first().click();
  await tab(CORE);
  await page.waitForFunction(() => { const core = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript"); return [...document.querySelectorAll(".observablehq")].some((n: any) => n.isConnected && n.variable?._module === core && n.variable?._name === "viewof tally"); }, null, { timeout: 10000 }).catch(() => {});
  // a state cell as one cell: one rendered node for tally and viewof tally (viewof tally's, as Observable draws a viewof cell), and its editor shows the state cell source
  const nodes = await page.evaluate(() => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
    return [...document.querySelectorAll(".observablehq")].filter((n: any) => n.variable?._module === core && /^(viewof )?tally$/.test(n.variable?._name)).map((n: any) => n.variable._name);
  });
  report(nodes.length === 1 && nodes[0] === "viewof tally", `ui: the state cell tally renders as one cell (${JSON.stringify(nodes)})`);
  const tally = await openEditor(page, CORE, "tally");
  const tallyText = tally ? await editorText(tally) : null;
  report(!!tallyText && tallyText.includes("const tally = (): StateCell<number> => state(0);"), `ui: clicking tally's hotbar opens its state cell source: ${JSON.stringify(tallyText)}`);

  await tab(TUTORIAL);
  // a keyboard edit that breaks other cells is stored; then one that repairs them
  const width = await openEditor(page, TUTORIAL, "width");
  if (!width) { report(false, "ui: no editor for width"); return; }
  await typeInto(page, width, 'const width = () => "640";');
  await until(page, async () => (await valueOf(page, TUTORIAL, "width")) === "640");
  const broke = await until(page, async () => (await diagsOf(width)).some((d: string) => d.startsWith("this edit broke")));
  const areaNow = await valueOf(page, TUTORIAL, "area");
  report(broke && (await valueOf(page, TUTORIAL, "width")) === "640" && /^THREW area does not check: \[inject-type\]/.test(String(areaNow)), `ui: a typed width = "640" plus Shift-Enter is stored; the editor says what it broke, and area raises its message: ${JSON.stringify(await diagsOf(width))}, area ${JSON.stringify(areaNow)}`);
  await typeInto(page, width, "const width = () => 600;");
  await until(page, async () => (await valueOf(page, TUTORIAL, "width")) === 600);
  report((await valueOf(page, TUTORIAL, "width")) === 600 && (await valueOf(page, TUTORIAL, "area")) === 600 * 400, `ui: typed width = 600 plus Shift-Enter is applied: width ${await valueOf(page, TUTORIAL, "width")}, area ${await valueOf(page, TUTORIAL, "area")}`);

  // a new cell: the hotbar's add button, then typing
  const halfTag = await tagEditor(page, TUTORIAL, "half");
  if (!halfTag) { report(false, "ui: no editor for half"); return; }
  const before = await page.evaluate(() => document.querySelectorAll(".cm-editor").length);
  await page.locator(`[data-verify="${halfTag}"] .add-cell-btn`).first().click();
  await page.waitForFunction(() => [...document.querySelectorAll(".cm-editor")].some((e) => (e.querySelector(".cm-content")?.textContent ?? "").trim() === "{}"), null, { timeout: 15000 }).catch(() => {});
  const tag = await page.evaluate(() => {
    const eds = [...document.querySelectorAll(".cm-editor")].filter((e) => (e.querySelector(".cm-content")?.textContent ?? "").trim() === "{}");
    const host = eds.at(-1);
    if (!host) return null;
    host.setAttribute("data-verify", "new");
    return "new";
  });
  if (!tag) { report(false, "ui: the add button made no empty cell editor"); return; }
  // while it is typed, a new cell whose source is SoundScript is linted by the SoundScript checker
  const fresh = page.locator('[data-verify="new"]');
  await fresh.locator(".cm-content").first().click();
  await page.keyboard.press(`${MOD}+KeyA`);
  await page.keyboard.insertText("const quadrupled = (width: string) => width;");
  await until(page, async () => (await diagsOf(fresh)).some((d: string) => d.includes("[inject-type]")));
  const typedDiags = await diagsOf(fresh);
  report(typedDiags.some((d: string) => d.includes("[inject-type]")), `ui: a new cell typed as SoundScript is linted by its checker before it is applied: ${JSON.stringify(typedDiags)}`);
  const NEW = QUADRUPLED;
  await typeInto(page, fresh, NEW);
  await until(page, async () => (await valueOf(page, TUTORIAL, "quadrupled")) === 2400);
  const q = await page.evaluate(() => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get("@tomlarkworthy/soundscript-tutorial");
    const order = [...rt._variables].filter((v: any) => v._module === mod);
    const names = order.map((v: any) => v._name);
    return { after: names[names.indexOf("quadrupled") - 1], index: names.indexOf("quadrupled"), empties: order.filter((v: any) => String(v._definition).replace(/\s/g, "").includes("{return({})}") || String(v._definition).trim() === "{}").length, imported: mod._scope.has("ss_equals") };
  });
  report((await valueOf(page, TUTORIAL, "quadrupled")) === 2400 && q.after === "half" && q.empties === 0 && q.imported, `ui: a cell added with the add button and typed as SoundScript is applied: quadrupled ${await valueOf(page, TUTORIAL, "quadrupled")}, placed after ${q.after}, ${q.empties} empty cells left; ss_equals, which the module lacked, imported: ${q.imported}`);

  // a section module opened from its link under the tutorial's table, then edited by keyboard
  await page.locator("a", { hasText: "@tomlarkworthy/soundscript-breakout" }).first().click();
  const BR = "@tomlarkworthy/soundscript-breakout";
  await page.locator(`[title="${BR}  (drag to a pane edge to dock, or out to save as .js)"]`).first().waitFor({ timeout: 10000 }).catch(() => {});
  const pv = await openEditor(page, BR, "paddleView");
  if (!pv) report(false, "ui: the breakout link opened no editable paddleView");
  else {
    const src = await editorText(pv);
    await typeInto(page, pv, src.replace('"#ddd"', '"#eee"'));
    await until(page, async () => String(await defOf(page, BR, "paddleView")).includes("#eee"));
    const after = await page.evaluate(() => {
      const rt = (window as any).__ojs_runtime, mod = rt.mains.get("@tomlarkworthy/soundscript-breakout");
      const core = rt.mains.get("@tomlarkworthy/soundscript");
      const names = [...rt._variables].filter((v: any) => v._module === mod && v._name).map((v: any) => v._name);
      const dups = names.filter((n: string, i: number) => names.indexOf(n) !== i);
      let roundtrip;
      try { roundtrip = [...rt._variables].find((v: any) => v._module === core && v._name === "ss_roundtrip")._value(mod); } catch (e) { roundtrip = String((e as Error).message); }
      return { dups, roundtrip };
    });
    report(String(await defOf(page, BR, "paddleView")).includes("#eee") && after.dups.length === 0 && typeof after.roundtrip === "number", `ui: the breakout link opens its module; a typed edit of paddleView is applied; duplicate names ${JSON.stringify(after.dups)}, round trip ${after.roundtrip}`);
    await testsPass(page, "ui after the section edit", BR, ["test_replay"]);
  }
  // Save in place through the lopepage menu (the file picker is stubbed to write `saved`)
  await page.locator('button[title="Menu"]').first().click();
  await page.locator(".lp2-menu button.lp2-menu-item", { hasText: "Save in place" }).first().click();
  await until(page, async () => existsSync(saved), 20000);
  report(existsSync(saved) && readFileSync(saved, "utf8").length > 1e6, `ui: the menu's Save in place wrote ${existsSync(saved) ? readFileSync(saved, "utf8").length : 0} bytes`);
}
// A new cell by real keys: the add button on anchor's hotbar, then typed text and Shift-Enter.
// why the last addByKeys returned null, for the failure's message
let addWhy = "";
const editorsState = (page: Page, module: string, cell: string) => page.evaluate(([module, cell]) => {
  const rt = (window as any).__ojs_runtime, mod = rt.mains.get(module);
  const named = [...rt._variables].filter((v: any) => v._name === "editors");
  const v = mod._scope.get(`viewof ${cell}`) ?? [...rt._variables].find((v: any) => v._module === mod && v._name === cell);
  const ed = named.find((x: any) => x._value instanceof Map)?._value;
  const host = ed?.get(v);
  const sameName = ed ? [...ed.keys()].filter((k: any) => k._module === mod && (k._name === cell || k._name === `viewof ${cell}`)).length : -1;
  return { editorsVars: named.map((x: any) => `${x._module?._name ?? "?"}:${x._value instanceof Map ? "map" + x._value.size : typeof x._value}`), firstIsMap: named[0]?._value instanceof Map,
    vName: v?._name, vInEditors: !!host, hostConnected: host?.isConnected, hostHotbar: !!host?.querySelector?.(".hotbar"), sameNameKeys: sameName, observed: !!v?._observer?._node, divs: document.querySelectorAll(".observablehq").length };
}, [module, cell]);
async function addByKeys(page: Page, module: string, anchor: string, text: string, tagName: string) {
  addWhy = "";
  const t = await tagEditor(page, module, anchor);
  if (!t) { addWhy = `no hotbar for ${anchor}: ${JSON.stringify(await editorsState(page, module, anchor))}`; return null; }
  const count = () => page.evaluate((m) => { const rt = (window as any).__ojs_runtime; return [...rt._variables].filter((v: any) => v._module === rt.mains.get(m)).length; }, module);
  const n0 = await count();
  await page.locator(`[data-verify="${t}"] .add-cell-btn`).first().click();
  await page.waitForFunction(() => [...document.querySelectorAll(".cm-editor")].some((e) => (e.querySelector(".cm-content")?.textContent ?? "").trim() === "{}"), null, { timeout: 15000 }).catch(() => {});
  const ok = await page.evaluate((tagName) => {
    const host = [...document.querySelectorAll(".cm-editor")].filter((e) => (e.querySelector(".cm-content")?.textContent ?? "").trim() === "{}").at(-1);
    if (!host) return false;
    host.setAttribute("data-verify", tagName);
    return true;
  }, tagName);
  if (!ok) { addWhy = `the add button made no empty editor in 15 s; variables in ${module} ${n0} -> ${await count()}; editors with text "{}" ${await page.evaluate(() => [...document.querySelectorAll(".cm-editor")].filter((e) => (e.querySelector(".cm-content")?.textContent ?? "").trim() === "{}").length)}`; return null; }
  const host = page.locator(`[data-verify="${tagName}"]`);
  await typeInto(page, host, text);
  // the stored cell gets an editor of its own; that one is returned
  const name = /const (\w+)/.exec(text)![1];
  const stored = await until(page, async () => !!(await defOf(page, module, name)));
  const ed = await openEditor(page, module, name);
  if (!ed) addWhy = `${name} ${stored ? "stored" : "not stored in 10 s"}; no hotbar for it: ${JSON.stringify(await editorsState(page, module, name))}`;
  return ed;
}
// A rejected cell never runs: SNEAK's body counts its runs on globalThis, which the checker rejects, so
// the count stays absent. Checked at the edit, in ss_instance, after an exporter-3 export reopened, and
// after Save in place reopened. An unparsable cell is stored by keys too, shows the parser's message,
// survives both, and is repaired by keys in the reopened file.
const SNEAK = "const sneak = (width: number) => {\n  (globalThis as any).__ssSneak = ((globalThis as any).__ssSneak ?? 0) + 1;\n  return width;\n};";
const BROKEN = "const broken = (width: number) => width +;";
// A read-only evaluate, tried again when Playwright reports the context destroyed. On 2026-11-16 that error came
// in 5 of 8 verify runs (4 retried by valueOf, 1 fatal here) with no navigation, crash or context destroyed in
// the page's own CDP events (open() logs them as "CTX ..."), so it is taken as the harness's, not the notebook's.
async function readOnly<T>(label: string, f: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await f(); } catch (e) {
      if (i >= 3 || !/Execution context was destroyed|Promise was collected/.test(String((e as Error).message))) throw e;
      console.log(`  ${label}: ${String((e as Error).message).split("\n")[0]} (try ${i + 1}); retrying; after "${LAST}"`);
    }
  }
}
async function neverRuns(page: Page, label: string) {
  return readOnly(`neverRuns (${label})`, () => page.evaluate(async ([t, c, sneak, broken]) => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get(t), core = rt.mains.get(c);
    // awaited: on a reopened page the tutorial's cells can have values before the core's soundscript does
    const ss = await core.value("soundscript");
    const raised = async (n: string) => { try { await mod.value(n); return "a value"; } catch (e) { return String((e as Error)?.message ?? e); } };
    const text = (n: string) => { const v = mod._scope.get(n); return v ? ss.decompileVariable(String(v._definition)) : null; };
    const st = (await core.value("ss_check"))(mod).states;
    let rt0: any;
    try { rt0 = (await core.value("ss_roundtrip"))(mod); } catch (e) { rt0 = String((e as Error).message); }
    return { sneakRuns: (globalThis as any).__ssSneak ?? 0, sneak: await raised("sneak"), broken: await raised("broken"), sneakText: text("sneak") === sneak, brokenText: text("broken") === broken,
      states: [st.get("sneak")?.state, st.get("broken")?.state], roundtrip: rt0 };
  }, [TUTORIAL, CORE, SNEAK, BROKEN])).then((r) => {
    report(r.sneakRuns === 0 && /^sneak does not check: \[/.test(r.sneak) && /^broken does not check: \[parse\]/.test(r.broken) && r.sneakText && r.brokenText && r.states.join() === "rejected,rejected" && typeof r.roundtrip === "number",
      `${label}: sneak's body ran ${r.sneakRuns} times; sneak raises ${JSON.stringify(r.sneak.slice(0, 90))}; broken raises ${JSON.stringify(r.broken.slice(0, 90))}; both decompile as typed (${r.sneakText},${r.brokenText}); states ${r.states}; round trip ${r.roundtrip}`);
    return r;
  });
}
async function brokenState(savedTo: string) {
  rmSync(savedTo, { force: true });
  const P = await open(file, savedTo);
  const page = P.page;
  await page.waitForFunction(([c, t]: string[]) => { const rt = (window as any).__ojs_runtime; return rt?.mains?.get(t)?._scope.get("half")?._value !== undefined && rt.mains.get(c)?._scope.get("ss_language")?._value; }, [CORE, TUTORIAL], { timeout: 60000 });
  const sneak = await addByKeys(page, TUTORIAL, "half", SNEAK, "sneak");
  if (!sneak) { report(false, `broken state: no add button on half: ${addWhy}`); await page.close(); return; }
  await until(page, async () => (await diagsOf(sneak).catch(() => [])).length > 0);
  const broken = await addByKeys(page, TUTORIAL, "half", BROKEN, "broken");
  if (!broken) { report(false, `broken state: no second add: ${addWhy}`); await page.close(); return; }
  await until(page, async () => (await diagsOf(broken).catch(() => [])).some((d: string) => d.startsWith("[parse]")));
  const bd = await diagsOf(broken);
  report(bd.some((d: string) => d.startsWith("[parse]")) && !!(await defOf(page, TUTORIAL, "broken")), `broken state: an unparsable cell typed with the add button is stored and its editor shows the parser's message: ${JSON.stringify(bd)}`);
  const sd = await diagsOf(sneak);
  report(sd.some((d: string) => d.startsWith("[")), `broken state: the sneak cell's editor shows the checker's message: ${JSON.stringify(sd)}`);
  await neverRuns(page, "broken state: at the edit");
  // a copy of the module made by ss_instance: the rejected body does not run there either
  const inst = await page.evaluate(async ([t, c]) => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get(t), core = rt.mains.get(c);
    let end: () => void = () => {};
    const done = new Promise<void>((r) => (end = r));
    const copy = await (await core.value("ss_instance"))(mod, done);
    let sneak = "a value", half = null;
    try { await copy.value("sneak"); } catch (e) { sneak = String((e as Error).message); }
    half = await copy.value("half");
    end();
    return { sneak, half, runs: (globalThis as any).__ssSneak ?? 0 };
  }, [TUTORIAL, CORE]);
  report(inst.runs === 0 && /^sneak does not check/.test(inst.sneak) && inst.half === 128000, `broken state: in ss_instance's copy sneak raises and its body ran ${inst.runs} times; half there is ${inst.half}`);
  // exporter-3: export, reopen
  const xPath = join(SCRATCH, "export-broken.html");
  writeFileSync(xPath, await exportPage(page));
  const X = await open(xPath);
  await X.page.waitForFunction((t: string) => (window as any).__ojs_runtime?.mains?.get(t)?._scope.get("half")?._value !== undefined, TUTORIAL, { timeout: 60000 });
  await neverRuns(X.page, "broken state: exporter-3 export reopened");
  await X.page.close();
  // Save in place through the lopepage menu, reopen, repair broken by keys
  await page.locator('button[title="Menu"]').first().click();
  await page.locator(".lp2-menu button.lp2-menu-item", { hasText: "Save in place" }).first().click();
  await until(page, async () => existsSync(savedTo), 20000);
  await page.close();
  if (!existsSync(savedTo)) { report(false, "broken state: Save in place wrote nothing"); return; }
  const S = await open(savedTo);
  await S.page.waitForFunction((t: string) => (window as any).__ojs_runtime?.mains?.get(t)?._scope.get("half")?._value !== undefined, TUTORIAL, { timeout: 60000 });
  await neverRuns(S.page, "broken state: Save in place reopened");
  const ed = await openEditor(S.page, TUTORIAL, "broken");
  if (!ed) report(false, "broken state: no editor for broken after reopening");
  else {
    const shown = await editorText(ed);
    await typeInto(S.page, ed, "const broken = (width: number) => width + 1;");
    await until(S.page, async () => (await valueOf(S.page, TUTORIAL, "broken")) === 641);
    report(shown === BROKEN && (await valueOf(S.page, TUTORIAL, "broken")) === 641, `broken state: after reopening, broken's editor shows ${JSON.stringify(shown)}; repaired by keys it is ${await valueOf(S.page, TUTORIAL, "broken")}`);
  }
  await breakStep(S.page);
  await S.page.close();
}
// Breakout: step broken mid-game; the world keeps its score while tick, aim, reset and onTick are
// blocked; the repair continues the game with one listener and one clock.
async function breakStep(page: Page) {
  const BR = "@tomlarkworthy/soundscript-breakout";
  const probe = () => page.evaluate((b: string) => {
    const rt = (window as any).__ojs_runtime, bm = rt.mains.get(b), ss = [...(window as any).__ojs_runtime._variables].find((x: any) => x._name === "soundscript" && x._value)._value;
    const w = bm._scope.get("world")._value;
    const hs = [...rt._variables].filter((v: any) => v._module === bm && ss.isEvents?.(v._value)).map((v: any) => v._value);
    return { score: w.score, bricks: w.bricks.length, lives: w.lives, y: w.ball.y, playing: bm._scope.get("playing")._value, listeners: ss.running(hs), clocks: ss.pulling(hs) };
  }, BR);
  // play on the tutorial's copy of the game (section 9), then open the module to edit step
  const play = page.getByRole("button", { name: "play", exact: true }).first();
  await play.scrollIntoViewIfNeeded();
  await play.click();
  await page.locator("a", { hasText: BR }).first().click();
  await until(page, async () => (await probe()).score > 0, 15000);
  const p0 = await probe();
  const ed = await openEditor(page, BR, "step");
  if (!ed) { report(false, "breakout: no editor for step"); return; }
  const text = await editorText(ed);
  await typeInto(page, ed, text.replace("if (e.kind === \"reset\") return start();", "if (e.kind === \"reset\") return start;"));
  await until(page, async () => /^THREW step does not check/.test(String(await valueOf(page, BR, "step"))));
  // stopped: onTick's listener has gone; then the world is the same object for 30 frames
  await until(page, async () => (await probe()).listeners === p0.listeners - 1, 5000);
  await frames(page, 2);
  const p1 = await probe();
  const still = await page.evaluate(async (b: string) => {
    const bm = (window as any).__ojs_runtime.mains.get(b), w0 = bm._scope.get("world")._value;
    for (let i = 0; i < 30; i++) { await new Promise((r) => requestAnimationFrame(r)); if (bm._scope.get("world")._value !== w0) return false; }
    return true;
  }, BR);
  const p2 = await probe();
  const states = await page.evaluate(async ([c, b]) => { const rt = (window as any).__ojs_runtime; const st = (await rt.mains.get(c).value("ss_check"))(rt.mains.get(b)).states; return Object.fromEntries([...st].filter(([, x]: any) => x.state !== "ok").map(([n, x]: any) => [n, x.state === "blocked" ? `blocked by ${x.blockedBy.join(", ")}` : x.state])); }, [CORE, BR]);
  console.log(`  breakout broken: ${JSON.stringify(states)}; ${JSON.stringify({ p0, p1, p2 })}`);
  report(still && p2.score >= p0.score && p2.score === p1.score && p2.y === p1.y && p2.listeners === p0.listeners - 1 && states.step === "rejected" && states.tick === "blocked by step" && states.onTick === "blocked by tick",
    `breakout: step broken mid-game: the world keeps score ${p1.score} and stops (the same world for 30 frames: ${still}; ball y ${p1.y} -> ${p2.y}); listeners ${p0.listeners} -> ${p2.listeners}, clocks ${p0.clocks} -> ${p2.clocks}; ${JSON.stringify(states)}`);
  await typeInto(page, ed, text);
  // the sample that met the condition is the one reported: a bouncing ball comes back to the same y
  let p3 = p2;
  await until(page, async () => { p3 = await probe(); return p3.y !== p2.y && p3.listeners === p0.listeners && p3.clocks === 1; }, 5000);
  console.log(`  breakout repaired: ${JSON.stringify(p3)}`);
  report(p3.score >= p2.score && p3.y !== p2.y && p3.listeners === p0.listeners && p3.clocks === 1, `breakout: repaired, the game continues from score ${p2.score} (now ${p3.score}, ball moving ${p2.y} -> ${p3.y}) with ${p3.listeners} listeners (${p0.listeners} before the break) and ${p3.clocks} clock pulled`);
  await page.evaluate((b: string) => { const bm = (window as any).__ojs_runtime.mains.get(b); if (bm._scope.get("playing")._value) bm._scope.get("toggle")._value(); }, BR);
}
// a cell typed in the tutorial that uses equals, a built-in no tutorial cell uses, so storing it adds an import
const QUADRUPLED = "const quadrupled = (width: number) => (equals(width, 600) ? width * 4 : 0);";
async function afterReload(page: Page) {
  const w = await valueOf(page, TUTORIAL, "width"), q = await valueOf(page, TUTORIAL, "quadrupled");
  const { text, imported } = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get("@tomlarkworthy/soundscript-tutorial");
    const ss = [...rt._variables].find((v: any) => v._name === "soundscript" && v._module === rt.mains.get("@tomlarkworthy/soundscript"))._value;
    const v = [...rt._variables].find((v: any) => v._module === mod && v._name === "quadrupled");
    // the import apply added was saved as an import: the runtime module's equals
    const imported = mod._scope.has("ss_equals") && (await mod.value("ss_equals")) === ss.equals;
    return { text: v ? ss.decompileVariable(String(v._definition)) : null, imported };
  });
  report(w === 600 && q === 2400 && text === QUADRUPLED && imported, `reload after save: width ${w}, quadrupled ${q}, as typed source ${JSON.stringify(text)}; ss_equals imported from the runtime module: ${imported}`);
}
// deleting the listener cell stops delivery (the runtime does not resolve its invalidation)
async function deleteStops(page: Page) {
  const r = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get("@tomlarkworthy/soundscript-breakout");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === mod && v._name === n);
    const ss = [...rt._variables].find((v: any) => v._name === "soundscript" && v._module === rt.mains.get("@tomlarkworthy/soundscript"))._value;
    const frame = () => new Promise((res) => requestAnimationFrame(res));
    // the frame cap only turns a hang into a failure
    const until = async (f: () => boolean, n = 300) => { for (let i = 0; i < n && !f(); i++) await frame(); return f(); };
    const r0 = ss.running(), p0 = ss.pulling();
    get("toggle")._value();
    await until(() => ss.pulling() - p0 === 1);
    const playing = ss.pulling() - p0;
    get("onTick").delete();
    await until(() => ss.pulling() === p0 && ss.running() === r0 - 1);
    for (let i = 0; i < 2; i++) await frame();
    const w1 = get("world")._value;
    let still = true;
    for (let i = 0; i < 20; i++) { await frame(); still &&= get("world")._value === w1; }
    return { playing, after: ss.pulling() - p0, listeners: ss.running() - r0, still };
  });
  report(r.playing === 1 && r.after === 0 && r.listeners === -1 && r.still, `deleting onTick while playing stops the clock: clocks pulled +${r.playing} -> +${r.after}, listeners ${r.listeners}, world unchanged ${r.still}`);
}
// disposing a copy of the game (ss_instance's invalidation) while it plays stops its clock and its listener
async function instanceStops(page: Page) {
  const r = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript"), bm = rt.mains.get("@tomlarkworthy/soundscript-breakout");
    const ss = [...(window as any).__ojs_runtime._variables].find((x: any) => x._name === "soundscript" && x._value)._value, ss_instance = await core.value("ss_instance");
    const frame = () => new Promise((res) => requestAnimationFrame(res));
    // the frame cap only turns a hang into a failure
    const until = async (f: () => boolean, n = 300) => { for (let i = 0; i < n && !f(); i++) await frame(); return f(); };
    let done!: () => void;
    const r0 = ss.running(), p0 = ss.pulling();
    const inst = await ss_instance(bm, new Promise<void>((res) => (done = res)));
    for (const n of ["toggle", "world", "onTick"]) await inst.value(n);
    const w0 = inst._scope.get("world")._value;
    inst._scope.get("toggle")._value();
    await until(() => inst._scope.get("world")._value.ball.y !== w0.ball.y);
    const playing = { listeners: ss.running() - r0, pulled: ss.pulling() - p0, moved: inst._scope.get("world")._value.ball.y !== w0.ball.y };
    done();
    await until(() => ss.running() === r0 && ss.pulling() === p0);
    const after = { listeners: ss.running() - r0, pulled: ss.pulling() - p0, vars: [...rt._variables].filter((v: any) => v._module === inst).length };
    return { playing, after };
  });
  report(r.playing.listeners === 1 && r.playing.pulled === 1 && r.playing.moved && r.after.listeners === 0 && r.after.pulled === 0,
    `disposing a playing copy of the game stops its clock and its listener: playing ${JSON.stringify(r.playing)}, disposed ${JSON.stringify(r.after)}`);
}
// Exactly once, on real animation frames: a probe module of cells applied to the core. nums yields
// 1..N, record counts each value and every value that is not the last plus one (a gap).
async function listenerOnce(C: { page: Page; errors: string[] }) {
  const r = await C.page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
    const lang = get("ss_language")._value, ss = get("soundscript")._value;
    const frames = (n: number) => new Promise<void>((res) => { let i = 0; const f = () => (++i >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const until = async (f: () => boolean, n = 600) => { for (let i = 0; i < n && !f(); i++) await new Promise((r) => requestAnimationFrame(r)); return f(); };
    const add = (text: string) => lang.apply(text, [], { module: { module: core }, variables: [get("tripled")] });
    const applied: string[] = [];
    const edit = async (text: string, name: string) => { const r = await lang.apply(text, [get(name)]); applied.push(`${name} ${r ? "applied" : "refused"}`); return r; };
    const N = 120;
    const cells = [
      "type Seen = { readonly count: number; readonly last: number; readonly gaps: number };",
      "const seen = (): StateCell<Seen> => state<Seen>({ count: 0, last: 0, gaps: 0 });",
      "const go = (): StateCell<boolean> => state(true);",
      `const nums = function* (go: boolean) {\n  if (!go) return;\n  for (let i = 1; i <= ${N}; i++) yield i;\n};`,
      "const weight = () => (v: number) => v;",
      "const record = (seen: State<Seen>, weight: (v: number) => number) =>\n  action((v: number) => {\n    seen.update((s) => ({ count: s.count + 1, last: v, gaps: s.gaps + (weight(v) === s.last + 1 ? 0 : 1) }));\n    if (v % 10 === 0 && v > 1000) throw new Error(`no ${v}`);\n  });",
      "const onNum = (nums: Events<number>, record: Action<[number]>) => on(nums, record);",
      "const flip = (go: State<boolean>) => action(() => go.update((g) => !g));",
    ];
    const out: any = {};
    const r0 = ss.running(), p0 = ss.pulling();
    for (const c of cells) if (!(await add(c))) return { refused: c };
    const seen = () => get("seen")._value;
    const runs = (n: string) => get(n)._version;
    await until(() => seen()?.count >= 30);
    out.listenersAt30 = ss.running() - r0;
    // the action's dependency is edited twice while values arrive
    await edit("const weight = () => (v: number) => v * 1;", "weight");
    await until(() => seen().count >= 60);
    await edit("const weight = () => (v: number) => 1 * v;", "weight");
    // the listener cell itself runs again
    await edit("const onNum = (nums: Events<number>, record: Action<[number]>) => /* again */ on(nums, record);", "onNum");
    out.listenersAfterRerun = ss.running() - r0;
    await until(() => seen().count >= N);
    await frames(10);
    out.stream = { ...seen() };
    // restart the events cell: false, then true
    const on0 = runs("onNum"), n0 = runs("nums"), h0 = get("nums")._value;
    get("flip")._value();
    await frames(20);
    const c1 = seen().count;
    await frames(20);
    out.stopped = seen().count === c1;
    get("flip")._value();
    await until(() => seen().count >= c1 + N);
    await frames(10);
    out.restart = { count: seen().count - c1, gaps: seen().gaps, onNumRuns: runs("onNum") - on0, numsRuns: runs("nums") - n0, sameHandle: get("nums")._value === h0 };
    // an action that throws on every tenth value: those values write nothing, the rest arrive
    await edit("const record = (seen: State<Seen>, weight: (v: number) => number) =>\n  action((v: number) => {\n    seen.update((s) => ({ count: s.count + 1, last: v, gaps: s.gaps + (weight(v) === s.last + 1 ? 0 : 1) }));\n    if (v % 10 === 0) throw new Error(`no ${v}`);\n  });", "record");
    const c2 = seen().count;
    get("flip")._value(); await frames(5); get("flip")._value();
    await until(() => seen().last === N - 1 && seen().count >= c2 + N - N / 10, 600);
    await frames(10);
    out.throwing = { committed: seen().count - c2, last: seen().last };
    // deleting the listener stops delivery
    get("flip")._value(); await frames(5); get("flip")._value(); await frames(5);
    const p1 = ss.pulling() - p0;
    get("onNum").delete();
    await frames(5);
    const c3 = seen().count;
    await frames(30);
    out.applied = applied;
    out.deleted = { pulledBefore: p1, pulledAfter: ss.pulling() - p0, listeners: ss.running() - r0, count: seen().count - c3 };
    for (const n of ["record", "flip", "weight", "nums", "seen", "viewof seen", "go", "viewof go", "$ss$type$Seen"]) get(n)?.delete();
    await until(() => !get("seen") && !get("viewof seen") && !get("nums"));
    get("reset")._value();
    return out;
  });
  const thrown = C.errors.filter((e) => /listener onNum: action record threw on a value of events nums/.test(e));
  for (const e of thrown) C.errors.splice(C.errors.indexOf(e), 1);
  report(r.applied?.length === 4 && r.applied.every((x: string) => x.endsWith("applied")) && r.listenersAt30 === 1 && r.listenersAfterRerun === 1 && r.stream?.count === 120 && r.stream.gaps === 0,
    `exactly once: 120 yields gave ${r.stream?.count} actions with ${r.stream?.gaps} gaps, across two edits of the action's dependency and a re-run of the listener; listeners ${r.listenersAt30}, after the re-run ${r.listenersAfterRerun}; edits ${JSON.stringify(r.applied)}${r.refused ? `; refused ${r.refused}` : ""}`);
  report(r.stopped && r.restart?.count === 120 && r.restart.gaps === 1 && r.restart.onNumRuns === r.restart.numsRuns && r.restart.numsRuns === 2 && r.restart.sameHandle,
    `exactly once: the events cell stopped and restarted, keeping its handle; the listener ran again with it and lost nothing: ${JSON.stringify({ stopped: r.stopped, ...r.restart })}`);
  report(r.throwing?.committed === 108 && r.throwing.last === 119 && thrown.length === 12,
    `exactly once: an action throwing on every tenth of 120 values: ${r.throwing?.committed} committed, last ${r.throwing?.last}; ${thrown.length} console errors naming onNum, record and nums`);
  report(r.deleted?.pulledBefore === 1 && r.deleted.pulledAfter === 0 && r.deleted.listeners === 0 && r.deleted.count === 0,
    `exactly once: deleting the listener stops delivery: ${JSON.stringify(r.deleted)}`);
}
// The editor's lint messages for the cell open in `host`
// Every editor command on a SoundScript cell, through the editor's own buttons and command functions.
// With no language registered each one either changes no SoundScript definition or is refused with a
// warning; with the language registered, copy and paste go through it. Returns one row per command.
async function commandGuard(page: Page, label: string, module: string, cell: string, plainName: string, registered: boolean) {
  const r = await page.evaluate(async ([module, cell, plainName, registered]) => {
    const rt = (window as any).__ojs_runtime;
    const find = (name: string, mod?: any) => [...rt._variables].find((v: any) => v._name === name && (!mod || v._module === mod));
    const until = async (fn: () => any, what: string, ms = 15000) => {
      const t0 = Date.now();
      for (;;) { const got = await fn(); if (got) return got; if (Date.now() - t0 > ms) throw new Error(`${what} not reached in ${ms} ms`); await new Promise((r) => setTimeout(r, 50)); }
    };
    const mod = rt.mains.get(module) ?? find(cell)?._module;
    // a name can have several variables (a cell and the imports of it); the one with a value, else computed
    const val = async (name: string) => { const vs = await until(() => { const a = [...rt._variables].filter((v: any) => v._name === name); return a.length && a; }, `a variable ${name}`, 60000); const v = vs.find((x: any) => x._value !== undefined) ?? vs[0]; return v._value !== undefined ? v._value : await v._module.value(name); };
    const langTag = await val("langTag");
    const marked = () => [...rt._variables].filter((v: any) => v._module === mod && langTag(v._definition));
    const snap = () => new Map(marked().map((v: any) => [v, String(v._definition)]));
    const order = () => [...rt._variables].filter((v: any) => v._module === mod).map((v: any) => v._name).join("|");
    // a definition that changed, or a new marked variable: the corruption this pass looks for
    const changed = (before: Map<any, string>) => [...snap()].filter(([v, d]) => before.get(v) !== d).map(([v]) => v._name);
    const warns: string[] = [];
    const warn0 = console.warn;
    console.warn = (...a: any[]) => { warns.push(String(a[0]?.message ?? a[0])); return warn0(...a); };
    const copied: string[] = [];
    const setData0 = DataTransfer.prototype.setData;
    DataTransfer.prototype.setData = function (t: string, d: string) { if (t === "text/plain") copied.push(d); return setData0.call(this, t, d); };
    const read0 = navigator.clipboard?.read;
    let clip: any[] = [];
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { read: async () => [{ types: ["application/vnd.observablehq+json"], getType: async () => new Blob([JSON.stringify(clip)]) }], write: async () => {}, writeText: async () => {} } });
    const editorsMap = await val("editors");
    const editors = () => editorsMap;
    const open = async (v: any) => {
      const host = await until(() => editors()?.get(v)?.querySelector(".hotbar") && editors().get(v), `an editor bar beside ${v._name}`);
      if (!host.querySelector(".toolbar")?.offsetParent) host.querySelector(".hotbar").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await until(() => host.querySelector(".toolbar")?.offsetParent, `the toolbar of ${v._name}`);
      return host;
    };
    const press = (host: any, text: string) => {
      const b = [...host.querySelectorAll(".toolbar button")].find((x: any) => x.textContent.includes(text)) as HTMLButtonElement | undefined;
      if (!b) throw new Error(`no ${text} button`);
      b.click();
    };
    const rows: any[] = [];
    const row = (command: string, ok: boolean, what: string) => rows.push({ command, ok, what });
    try {
      const target = find(cell, mod);
      const typed = registered ? await find("ss_language")._value.decompile([target]) : null;
      const host = await open(target);
      // copy
      let before = snap(), w0 = warns.length;
      press(host, "📄");
      if (registered) {
        await until(() => copied.length, "a copy");
        row("copy", copied[0] === typed && changed(before).length === 0, `clipboard holds the typed source: ${JSON.stringify(copied[0]?.slice(0, 80))}`);
      } else {
        await until(() => warns.length > w0, "the copy refusal");
        row("copy", copied.length === 0 && /not copied/.test(warns.at(-1)!) && changed(before).length === 0, `refused, nothing copied: ${warns.at(-1)}`);
      }
      // paste: a compiled SoundScript text pasted as Observable JS, by name onto a marked cell and onto a plain cell
      const compiledOjs = `${cell} = (/*{lang:"ss"}*/ () => 1)()`;
      const plain = find(plainName, mod);
      before = snap(); w0 = warns.length;
      const plainDef = plain ? String(plain._definition) : null;
      clip = [{ mode: "js", value: compiledOjs }, ...(plain ? [{ mode: "js", value: `${plain._name} = (/*{lang:"ss"}*/ () => 2)()` }] : [])];
      // the cell the paste lands on is in the cell map (a cell added just before may not be yet)
      const findCell0 = await val("findCell");
      await until(() => findCell0(target)?.module?.module, `the cell map holding ${cell}`);
      press(host, "📋");
      // compiled text (it carries a marker) is never typed source: the editor refuses it before any language
      // sees it, registered or not, and the cells stay as they were
      await until(() => warns.length >= w0 + (plain ? 1 : 0) + 1, "the paste refusals");
      if (registered) await find("ss_language")._value.settle(mod);
      const ch = changed(before);
      const refusals = warns.slice(w0);
      row("paste (compiled text)", ch.length === 0 && refusals.filter((w) => /is a compiled cell, not source/.test(w)).length === (plain ? 2 : 1) && (!plain || String(plain._definition) === plainDef), `${ch.length ? "changed " + JSON.stringify(ch) : "nothing changed"}; ${refusals.length} refused: ${refusals.join(" | ").slice(0, 240)}; onto plain cell ${plain?._name ?? "none"}`);
      if (registered) {
        // typed source pasted onto the cell goes through the language and is stored
        const edited = typed!.replace(/\* 2\b/, "* 3");
        clip = [{ mode: "js", value: edited }];
        press(host, "📋");
        await until(async () => (await find("ss_language")._value.decompile([find(cell, mod)])) === edited, "the pasted typed source stored");
        const now = find(cell, mod);
        row("paste (typed source)", langTag(now._definition) === "ss", `stored through the language: ${JSON.stringify(edited.slice(0, 80))}`);
        await find("ss_language")._value.apply(typed, [now]);
      }
      // move up and down
      before = snap();
      const o0 = order();
      press(host, "⬆");
      await until(() => order() !== o0, "the move up");
      const moved = order();
      press(host, "⬇");
      // on a timeout, the evidence: where the order differs from the one before the move up
      await until(() => order() === o0, "the move back down").catch((e) => {
        const a = o0.split("|"), b = order().split("|"), moved1 = moved.split("|");
        const at = a.findIndex((x, i) => x !== b[i]);
        throw new Error(`${e.message}; before ${a.length} vars, after up ${moved1.length}, now ${b.length}; first difference at ${at}: before ${JSON.stringify(a.slice(Math.max(at - 2, 0), at + 3))}, now ${JSON.stringify(b.slice(Math.max(at - 2, 0), at + 3))}, after up ${JSON.stringify(moved1.slice(Math.max(at - 2, 0), at + 3))}`);
      });
      row("move up / down", changed(before).length === 0 && moved !== o0, `order changed and restored; no definition written`);
      // drag reorder (moveCellBeside), onto the module's first other marked cell, then back
      const findCell = await val("findCell"), moveCellBeside = await val("moveCellBeside");
      const other = marked().find((v: any) => v !== target && !findCell(target)?.variables.includes(v));
      before = snap();
      const c = findCell(target), modVars = [...rt._variables].filter((v: any) => v._module === mod);
      const next = modVars.find((v: any, i: number, a: any[]) => a[i - 1] === c.variables.at(-1)), prev = modVars.find((v: any, i: number, a: any[]) => a[i + 1] === c.variables[0]);
      await moveCellBeside(c, other, false);
      await until(() => order() !== o0, "the drag");
      // back after the variable before it (the one after it can be an import, whose cell sits elsewhere)
      await moveCellBeside(findCell(target), prev ?? next, !!prev);
      await until(() => order() === o0, `the drag back (${o0} -> ${order()})`);
      row("drag reorder", changed(before).length === 0, `moved beside ${other?._name} and back; no definition written`);
      // add a cell after it: an ordinary {} cell, no marker
      before = snap();
      const had = new Set([...rt._variables].filter((v: any) => v._module === mod));
      press(host, "➕");
      const fresh = await until(() => [...rt._variables].find((v: any) => v._module === mod && !had.has(v)), "the new cell");
      row("add", changed(before).length === 0 && !langTag(fresh._definition), `new cell ${JSON.stringify(String(fresh._definition).slice(0, 60))} carries no marker`);
      fresh.delete();
      // the command palette: every provider's result for the cell's name is a link, never an action
      before = snap();
      // the module finder and the cell search both register before the search finds the cell
      const results = await until(async () => { const ps = (await val("commandProviders")) ?? []; const rs = ps.flatMap((p: any) => { try { return p(cell) ?? []; } catch { return []; } }); return rs.length && rs; }, "palette results");
      const providers = (await val("commandProviders")) ?? [];
      row("command palette", results.length > 0 && results.every((x: any) => x.href && !x.action) && changed(before).length === 0, `${providers.length} providers, ${results.length} results for "${cell}", all links: ${results.slice(0, 3).map((x: any) => x.label).join(", ")}`);
      // delete: the cell's variables go; no other definition is written
      before = snap();
      const vars = findCell(target).variables, names = vars.map((v: any) => v._name);
      press(host, "🗑️");
      await until(() => vars.every((v: any) => !rt._variables.has(v)), "the delete");
      row("delete", changed(before).filter((n: string) => !names.includes(n)).length === 0, `${names.join(", ")} deleted; no other definition written`);
    } catch (e) { row("stopped", false, String((e as Error)?.stack ?? e).slice(0, 400)); }
    finally {
      console.warn = warn0;
      DataTransfer.prototype.setData = setData0;
      // the registered pass runs on a cell added for it: a stopped pass must not leave it for the export checks
      if (registered) for (const v of [...rt._variables]) if (v._module === mod && v._name === cell) v.delete();
    }
    return rows;
  }, [module, cell, plainName, registered] as [string, string, string, boolean]);
  for (const x of r) report(x.ok, `${label}: ${x.command} on ${cell}: ${x.what}`);
  return r;
}

// The focused editor's completion list is open with an option selected and takes Enter or Tab: CodeMirror's
// acceptCompletion refuses a key while Date.now() - open.timestamp < interactionDelay, so this reads that rule
// from the editor's own state (its completion state and config) instead of sleeping past it
const takesCompletion = (page: Page) => page.waitForFunction(() => {
  const rt = (window as any).__ojs_runtime;
  const el = document.activeElement?.closest(".cm-editor");
  const view = el && [...rt._variables].find((v: any) => v._name === "EditorView")._value.findFromDOM(el);
  if (!view) return false;
  const st = view.state.values.find((v: any) => v && typeof v === "object" && "active" in v && "open" in v);
  const cfg = view.state.config.staticValues.find((v: any) => v && typeof v === "object" && "interactionDelay" in v);
  const o = st?.open;
  return !!o && o.selected >= 0 && !o.disabled && !!document.querySelector(".cm-tooltip-autocomplete li[aria-selected=true]") && Date.now() - o.timestamp >= (cfg?.interactionDelay ?? 0);
}, null, { timeout: 5000 }).then(() => true).catch(() => false);
const diagsOf = (host: any) => host.locator(".cm-content").first().evaluate((el: any) => {
  const rt = (window as any).__ojs_runtime;
  const find = (n: string) => [...rt._variables].find((v: any) => v._name === n)?._value;
  const view = find("EditorView").findFromDOM(el.closest(".cm-editor"));
  const ds: string[] = [];
  find("codemirror").forEachDiagnostic?.(view.state, (d: any) => ds.push(d.message));
  return ds;
});
// n animation frames of the page, counted by frame
const frames = (page: Page, n: number) => page.evaluate((n) => new Promise<void>((res) => { let i = 0; const f = () => (++i >= n ? res() : void requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const until = async (page: Page, f: () => Promise<boolean>, ms = 10000) => { const t0 = Date.now(); while (!(await f())) { if (Date.now() - t0 > ms) return false; await page.waitForTimeout(100); } return true; };
const rawHelpers = () => ({ report, openEditor, typeInto, editorText, diagsOf, valueOf, tagEditor, until, testsPass });
// the text of the table row for `cell` in the first table (in DOM order) matching `sel` that has one
const rowText = (page: Page, sel: string, cell: string) => page.evaluate(([sel, cell]) => {
  // a SoundScript cell of the tutorial: its name, "ok" or "rejected", then its inspector line
  // a state cell is drawn by its handle variable, viewof <name>
  const at = (c: string) => document.querySelector(`.lp2-pane[data-module="@tomlarkworthy/soundscript-tutorial"] .observablehq[cell="${c}"]`);
  const node = sel === ".lite-panel" ? at(cell) ?? at(`viewof ${cell}`) : null;
  if (node) return `${cell} ${node.classList.contains("observablehq--error") ? "rejected" : "ok"} | ${node.textContent!.trim()}`;
  for (const t of document.querySelectorAll(sel)) for (const tr of t.querySelectorAll("tr")) {
    if (tr.querySelector("td code")?.textContent === cell) {
      const out = [tr.textContent!.trim()];
      for (let n = tr.nextElementSibling; n && n.classList.contains("lite-err"); n = n.nextElementSibling) out.push(n.textContent!.trim());
      return out.join(" | ");
    }
  }
  return null;
}, [sel, cell]);
const runsOf = (page: Page, module: string) => page.evaluate((module) => {
  const rt = (window as any).__ojs_runtime, mod = rt.mains.get(module);
  const ss = [...(window as any).__ojs_runtime._variables].find((x: any) => x._name === "soundscript" && x._value)._value;
  const out: Record<string, number> = {};
  // the runtime's count of each variable's runs
  for (const v of rt._variables) if (v._module === mod && typeof v._name === "string" && ss.compiledKind(String(v._definition))?.kind) out[v._name] = v._version;
  return out;
}, module);

// Every "Try it" cell of the tutorial, done as the text says, on a page of its own (the edits
// change values the tests pin). Each check states what the text promises.
async function tryIts(page: Page, firstOnly = false) {
  const tab = (m: string) => page.locator(`[title="${m}  (drag to a pane edge to dock, or out to save as .js)"]`).first().click();
  await page.waitForFunction(() => { const m = (window as any).__ojs_runtime?.mains?.get("@tomlarkworthy/soundscript-tutorial"); return m?._scope.get("benchmark")?._value && document.querySelector(".lite-lesson"); }, null, { timeout: 60000 });
  // A first cell: width -> 800 is applied; "800" is stored and breaks area and aspect (rejected) and what
  // reads them (blocked); the two-cell change (area and aspect take a string) repairs them. A state cell the edits
  // do not touch (count, after add one) keeps its value throughout.
  const statesOf = () => page.evaluate(async ([c, t]) => {
    const rt = (window as any).__ojs_runtime;
    const st = (await rt.mains.get(c).value("ss_check"))(rt.mains.get(t)).states;
    return Object.fromEntries([...st].map(([n, x]: any) => [n, x.state === "blocked" ? `blocked by ${x.blockedBy.join(", ")}` : x.state]));
  }, [CORE, TUTORIAL]);
  const notOk = (st: Record<string, string>) => Object.entries(st).filter(([n, x]) => x !== "ok" && !REJECTED_LESSON.includes(n)).map(([n, x]) => `${n} ${x}`);
  const count0 = await valueOf(page, TUTORIAL, "count");
  await counterLesson(page).getByRole("button", { name: "add one" }).click();
  await until(page, async () => (await valueOf(page, TUTORIAL, "count")) === count0 + 1);
  const width = await openEditor(page, TUTORIAL, "width");
  if (!width) { report(false, "try: no editor for width"); return; }
  // the open editor's header line carries the checker's type of the cell; the page does not
  const header = await until(page, async () => (await width.locator(".e5-cell-type").count()) > 0, 5000) ? await width.locator(".e5-cell-type").first().textContent() : null;
  const onPage = await page.evaluate(() => document.querySelector(".lp2-pane .observablehq[cell=\"width\"]")?.textContent);
  report(header === "width : number" && onPage === "width = 640", `try (first cell): the open editor's header reads ${JSON.stringify(header)}; the page line ${JSON.stringify(onPage)}`);
  await typeInto(page, width, "const width = () => 800;");
  await until(page, async () => (await valueOf(page, TUTORIAL, "area")) === 320000);
  const after800 = { area: await valueOf(page, TUTORIAL, "area"), aspect: await valueOf(page, TUTORIAL, "aspect"), half: await valueOf(page, TUTORIAL, "half"), test_half: await valueOf(page, TUTORIAL, "test_half") };
  report(after800.area === 320000 && after800.aspect === "2.00" && after800.half === 160000, `try (first cell): width 800 updates area, aspect, half: ${JSON.stringify(after800)}`);
  const shown800 = () => page.evaluate(() => ({ listing: document.querySelector(".lite-listing")?.textContent ?? "", line: document.querySelector('.lp2-pane .observablehq[cell="width"]')?.textContent ?? "" }));
  await until(page, async () => { const x = await shown800(); return /\(\) => 800;/.test(x.listing) && x.line === "width = 800"; });
  const s800 = await shown800();
  report(/const width = \(\) => 800;/.test(s800.listing) && s800.line === "width = 800", `try (first cell): after the edit the listing shows the new source and width's line its value: ${JSON.stringify(s800.line)}`);
  // the cells outside the broken part do not run again while it is broken and repaired
  const OUTSIDE = ["height", "scale", "samples", "histogram", "count", "increment", "app"];
  const outsideRuns = () => page.evaluate(([c, t, names]) => { const m = (window as any).__ojs_runtime.mains.get(t); return Object.fromEntries((names as string[]).map((n) => [n, m._scope.get(n)._version])); }, [CORE, TUTORIAL, OUTSIDE] as const);
  const runs0 = await outsideRuns();
  // typed, not yet applied: the editor says what applying would break
  await typeInto(page, width, 'const width = () => "800";', false);
  await until(page, async () => (await diagsOf(width)).some((d: string) => d.startsWith("applying this breaks")));
  const typedDiags = await diagsOf(width);
  const wouldBreak = typedDiags.find((d: string) => d.startsWith("applying this breaks")) ?? "";
  report((await valueOf(page, TUTORIAL, "width")) === 800 && wouldBreak === "applying this breaks 2 cells: area, aspect; blocks 2 cells: half, test_half", `try (first cell): typing width = "800" says, before Shift-Enter, ${JSON.stringify(wouldBreak)}; width is still 800`);
  await page.keyboard.press("Shift+Enter");
  await until(page, async () => (await valueOf(page, TUTORIAL, "width")) === "800");
  await until(page, async () => (await diagsOf(width)).some((d: string) => d.startsWith("this edit broke")));
  const ds = await diagsOf(width);
  const kept = await width.locator(".cm-content").first().evaluate((el: Element) => el.contains(document.activeElement));
  report(kept && (await editorText(width)) === 'const width = () => "800";', `try (first cell): after the breaking edit the editor still has focus (${kept}) and the typed text`);
  const broken = await statesOf();
  const vals = { area: await valueOf(page, TUTORIAL, "area"), aspect: await valueOf(page, TUTORIAL, "aspect"), half: await valueOf(page, TUTORIAL, "half") };
  const areaNode = () => page.evaluate(() => { const n = document.querySelector('.lp2-pane .observablehq[cell="area"]'); return { error: !!n?.classList.contains("observablehq--error"), text: n?.textContent ?? "" }; });
  await until(page, async () => (await areaNode()).error);
  const areaShown = await areaNode(), halfShown = await page.evaluate(() => document.querySelector('.lp2-pane .observablehq[cell="half"]')?.textContent ?? "");
  console.log(`  first cell broken: ${JSON.stringify(notOk(broken))}; values ${JSON.stringify(vals)}`);
  report(broken.width === "ok" && broken.area === "rejected" && broken.aspect === "rejected" && broken.half === "blocked by area" && /^THREW area does not check: \[inject-type\]/.test(String(vals.area)) && /^THREW aspect does not check: \[type\]/.test(String(vals.aspect)) && /^THREW area does not check/.test(String(vals.half)),
    `try (first cell): width "800" is stored; area and aspect are rejected and raise their messages, half is blocked by area: ${JSON.stringify(notOk(broken))}; ${JSON.stringify(ds)}`);
  report(areaShown.error && /^area = .*area does not check: \[inject-type\]/.test(areaShown.text) && /^half = .*area does not check/.test(halfShown), `try (first cell): area shows the checker's message as its error, and half shows area's: ${JSON.stringify(areaShown.text.slice(0, 160))}; ${JSON.stringify(halfShown.slice(0, 80))}`);
  // the two-cell change: area and aspect take a string, and everything is ok again
  const area = await openEditor(page, TUTORIAL, "area"), aspect = await openEditor(page, TUTORIAL, "aspect");
  if (!area || !aspect) { report(false, "try: no editor for area or aspect"); return; }
  const areaText = await editorText(area), aspectText = await editorText(aspect);
  await typeInto(page, area, areaText.replace("(width: number, height: number) => width * height", "(width: string, height: number) => Number(width) * height"));
  await until(page, async () => (await valueOf(page, TUTORIAL, "area")) === 320000);
  await typeInto(page, aspect, aspectText.replace("(width, height) => (width / height)", "(width: string, height: number) => (Number(width) / height)"));
  await until(page, async () => (await valueOf(page, TUTORIAL, "aspect")) === "2.00");
  const repaired = await statesOf();
  report(notOk(repaired).length === 0 && (await valueOf(page, TUTORIAL, "half")) === 160000 && (await valueOf(page, TUTORIAL, "count")) === count0 + 1,
    `try (first cell): with area and aspect taking a string every cell is ok again, half ${await valueOf(page, TUTORIAL, "half")}; count kept ${await valueOf(page, TUTORIAL, "count")}${notOk(repaired).length ? "; not ok " + JSON.stringify(notOk(repaired)) : ""}`);
  // and back: width 640 breaks them the other way; the original area and aspect repair it
  await typeInto(page, width, "const width = () => 640;");
  await until(page, async () => (await valueOf(page, TUTORIAL, "width")) === 640);
  await typeInto(page, area, areaText);
  await typeInto(page, aspect, aspectText);
  await until(page, async () => (await valueOf(page, TUTORIAL, "aspect")) === "1.60");
  const back = await statesOf();
  const runs1 = await outsideRuns();
  report(JSON.stringify(runs0) === JSON.stringify(runs1), `try (first cell): the cells outside the broken part did not run again through the break and both repairs: ${JSON.stringify(runs0)} -> ${JSON.stringify(runs1)}`);
  report(notOk(back).length === 0 && (await valueOf(page, TUTORIAL, "area")) === 256000 && (await valueOf(page, TUTORIAL, "count")) === count0 + 1,
    `try (first cell): width back to 640 and area and aspect as they were: every cell ok, area ${await valueOf(page, TUTORIAL, "area")}, count ${count0} -> ${await valueOf(page, TUTORIAL, "count")} throughout${notOk(back).length ? "; not ok " + JSON.stringify(notOk(back)) : ""}`);

  // section 2: label: string in doubled, in the box
  const box = page.locator(".lite-box textarea").first();
  const before = await rowText(page, ".lite-lesson table", "doubled");
  const src = await box.inputValue();
  await box.fill(src.replace("(label: number) => label * 2", "(label: string) => label * 2"));
  await until(page, async () => (await rowText(page, ".lite-lesson table", "doubled")) !== before);
  const after = await rowText(page, ".lite-lesson table", "doubled");
  report(/\[inject-type\]/.test(before ?? "") && /\[type\]/.test(after ?? "") && /label \* 2/.test(after ?? "") && !/inject-type/.test(after ?? ""), `try (section 2): doubled with label: string: before ${JSON.stringify(before)}; after ${JSON.stringify(after)}`);
  await box.fill(src);

  // section 3: twoNames with done as a copy
  const two = await openEditor(page, TUTORIAL, "twoNames");
  if (two) {
    const t = await editorText(two);
    await typeInto(page, two, t.replace("const done = xs;", "const done = [...xs];"));
    await until(page, async () => JSON.stringify(await valueOf(page, TUTORIAL, "twoNames")) === "[1,2,3]");
    const row = await rowText(page, ".lite-panel", "twoNames");
    if (firstOnly) { if (FOCUS_TRACE) console.log("TRACE\n" + (await page.evaluate(() => (window as any).__ft.slice(-60).join("\n")))); return; }
    report(/^twoNames\s*ok/.test(row ?? "") && String(await defOf(page, TUTORIAL, "twoNames")).includes("[...xs]"), `try (section 3): twoNames with done = [...xs] is applied, its row reads ok and its value is [1,2,3]: ${JSON.stringify(row)}`);
  } else report(false, "try: no editor for twoNames");

  // section 4: add one, then onClick={count} in app is stored: app does not check and its buttons are
  // replaced by the message; changed back, the buttons return and count is what it was
  const c0 = await valueOf(page, TUTORIAL, "count");
  await counterLesson(page).getByRole("button", { name: "add one" }).click();
  await until(page, async () => (await valueOf(page, TUTORIAL, "count")) === c0 + 1);
  const app = await openEditor(page, TUTORIAL, "app");
  if (app) {
    const t = await editorText(app);
    // the cell that shows app on the page (the counter lesson's), marked so it is found after app breaks
    await counterLesson(page).evaluate((n: Element) => n.setAttribute("data-verify-app", "1"));
    const buttons = () => page.evaluate(() => { const n = document.querySelector('[data-verify-app="1"]'); return { buttons: n ? n.querySelectorAll("button").length : -1, text: (n?.textContent ?? "").replace(/\s+/g, " ").slice(0, 160) }; });
    const b0 = await buttons();
    await typeInto(page, app, t.replace("onClick={increment}", "onClick={count}"));
    await until(page, async () => /^THREW app does not check/.test(String(await valueOf(page, TUTORIAL, "app"))));
    await until(page, async () => (await buttons()).buttons === 0);
    await until(page, async () => (await diagsOf(app)).some((x: string) => x.startsWith("[type]")));
    const b1 = await buttons(), d = await diagsOf(app);
    report((await valueOf(page, TUTORIAL, "count")) === c0 + 1 && b0.buttons > 0 && b1.buttons === 0 && /app does not check/.test(b1.text) && d.some((x: string) => x.startsWith("[type]")),
      `try (section 4): add one counts ${c0} -> ${await valueOf(page, TUTORIAL, "count")}; onClick={count} is stored, app's ${b0.buttons} buttons are replaced by ${JSON.stringify(b1.text)}: ${JSON.stringify(d)}`);
    await typeInto(page, app, t);
    await until(page, async () => (await buttons()).buttons === b0.buttons);
    report((await buttons()).buttons === b0.buttons && (await valueOf(page, TUTORIAL, "count")) === c0 + 1, `try (section 4): changed back, the ${b0.buttons} buttons return and count is still ${await valueOf(page, TUTORIAL, "count")}`);
  } else report(false, "try: no editor for app");

  // section 5: in the reducer module, - last -> + last is applied and test_undo fails
  const RD = "@tomlarkworthy/soundscript-reducer";
  await page.locator("a", { hasText: RD }).first().click();
  const step = await openEditor(page, RD, "step");
  if (step) {
    const t = await editorText(step);
    await typeInto(page, step, t.replace("s.total - last", "s.total + last"));
    await until(page, async () => String(await defOf(page, RD, "step")).includes("s.total + last"));
    const undo = await valueOf(page, RD, "test_undo");
    await until(page, async () => /throws/.test((await rowText(page, ".lite-panel", "test_undo")) ?? ""), 5000);
    const row = await rowText(page, ".lite-panel", "test_undo");
    report(String(await defOf(page, RD, "step")).includes("s.total + last") && /^THREW undo left 6/.test(String(undo)) && /throws: undo left 6/.test(row ?? ""), `try (section 5): + last is applied and test_undo fails: ${JSON.stringify(undo)}; its row on the tutorial: ${JSON.stringify(row)}`);
    await typeInto(page, step, t);
    await until(page, async () => (await valueOf(page, RD, "test_undo")) === "ok");
  } else report(false, "try: no editor for step");
  await tab(TUTORIAL);

  // section 6: bump, then the runs column
  const MD = "@tomlarkworthy/soundscript-model";
  const r0 = await runsOf(page, MD);
  await page.getByRole("button", { name: "bump", exact: true }).first().click();
  // every cell that reads bump's change has run once; then 10 frames, in which any extra run would show
  const RAN = ["doubled", "app", "stamped", "scale", "area", "areaFn", "areaOf4"];
  await until(page, async () => { const r = await runsOf(page, MD); return RAN.every((k) => r[k] > (r0[k] ?? 0)); });
  await frames(page, 10);
  const r1 = await runsOf(page, MD);
  const delta = Object.fromEntries(Object.keys(r1).map((k) => [k, r1[k] - (r0[k] ?? 0)]));
  const stampedKind = await page.evaluate(() => [...document.querySelectorAll(".lite-vars tr")].find((tr) => tr.querySelector("td code")?.textContent === "stamped")?.children[2]?.textContent);
  report(delta.doubled === 1 && delta.app === 1 && delta.stamped === 1 && delta.scale === 1 && delta.area === 1 && delta.areaFn === 1 && delta.areaOf4 === 1 && delta.side === 0 && delta.bump === 0 && stampedKind === "cell: its function applied to its inputs", `try (section 6): one bump, body runs per cell ${JSON.stringify(delta)}; stamped's kind ${JSON.stringify(stampedKind)}`);

  // section 7: measure again
  const b0 = await valueOf(page, TUTORIAL, "benchmark");
  await page.getByRole("button", { name: "measure again" }).first().click();
  await until(page, async () => { const b = await valueOf(page, TUTORIAL, "benchmark"); return !!b && JSON.stringify(b) !== JSON.stringify(b0); }, 30000);
  const b1 = await valueOf(page, TUTORIAL, "benchmark");
  report(!!b1 && b1.same === true && b1.mainMs > 0 && b1.poolMs > 0 && JSON.stringify(b1) !== JSON.stringify(b0), `try (section 7): measure again times both again: ${JSON.stringify(b1)}`);

  // section 9's board says what state the game is in: press play, nothing while playing, press new game when over
  const label = () => page.evaluate(() => { const e = document.querySelector(".lite-game .lite-game-state") as HTMLElement | null; return e ? (e.hidden ? "" : e.textContent) : null; });
  const l0 = await label();
  await page.getByRole("button", { name: "play", exact: true }).first().click();
  await until(page, async () => (await label()) === "");
  const l1 = await label();
  await page.getByRole("button", { name: "pause", exact: true }).first().click();
  await until(page, async () => (await label()) === "press play");
  const l2 = await label();
  await page.evaluate(() => { const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-breakout"); const tick = m._scope.get("tick")._value, aim = m._scope.get("aim")._value; for (let i = 0; i < 20000 && !m._scope.get("over")._value; i++) { aim({ x: 24, y: 0, t: 0, id: 0, buttons: 0 }); tick(50); } });
  await until(page, async () => /press new game/.test((await label()) ?? ""));
  const l3 = await label();
  await page.getByRole("button", { name: "new game", exact: true }).first().click();
  await until(page, async () => (await label()) === "press play");
  const l4 = await label();
  report(l0 === "press play" && l1 === "" && l2 === "press play" && /^(game over|cleared) · press new game$/.test(l3 ?? "") && l4 === "press play", `try (section 9): the board's state label at boot, playing, paused, over, new game: ${JSON.stringify([l0, l1, l2, l3, l4])}`);

  // section 9: play, then change the paddle width in step; the score is kept and the clock runs
  const BR = "@tomlarkworthy/soundscript-breakout";
  const world = () => page.evaluate(() => { const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-breakout"); const w = m._scope.get("world")._value; return { score: w.score, lives: w.lives, bricks: w.bricks.length, y: w.ball.y }; });
  const play = page.getByRole("button", { name: "play", exact: true }).first();
  await play.scrollIntoViewIfNeeded();
  await play.click();
  await until(page, async () => (await world()).score > 0, 15000);
  await page.locator("a", { hasText: BR }).first().click();
  const bstep = await openEditor(page, BR, "step");
  if (bstep) {
    const w0 = await world();
    const t = await editorText(bstep);
    await typeInto(page, bstep, t.replace("Math.abs(x - w.paddle) < 28", "Math.abs(x - w.paddle) < 60"));
    await until(page, async () => String(await defOf(page, BR, "step")).includes("< 60"));
    const w1 = await world();
    await until(page, async () => (await world()).y !== w1.y, 5000);
    const w2 = await world();
    const ssv = await page.evaluate((b: string) => { const rt = (window as any).__ojs_runtime, bm = rt.mains.get(b), ss = [...(window as any).__ojs_runtime._variables].find((x: any) => x._name === "soundscript" && x._value)._value; const hs = [...rt._variables].filter((v: any) => v._module === bm && ss.isEvents?.(v._value)).map((v: any) => v._value); return { running: ss.running(hs), pulling: ss.pulling(hs) }; }, BR);
    report(w0.score > 0 && w1.score >= w0.score && w1.bricks <= w0.bricks && w2.y !== w1.y && ssv.running === 1 && ssv.pulling === 1, `try (section 9): step edited while playing: world ${JSON.stringify(w0)} -> ${JSON.stringify(w1)} -> ${JSON.stringify(w2)}, ${ssv.running} listener, ${ssv.pulling} clock`);
    // with the breakout module's own pane open in edit mode, every cell drawn by the language: the
    // kinds the normal Inspector cannot read, and the game still gets a new world on every frame
    const kinds = await page.evaluate(async (b: string) => {
      const pane = document.querySelector(`.lp2-pane[data-module="${b}"]`)!;
      const line = (c: string) => (pane.querySelector(`.observablehq[cell="${c}"]`)?.textContent ?? "").trim();
      // the three pieces app places are lines (positioned by a parent they have not got); app is mounted
      const views = [...["bricksView", "paddleView", "ballView"].map(line), (() => { const n = pane.querySelector('.observablehq[cell="app"] .ss-view') as HTMLElement | null; return n ? `app ${n.tagName.toLowerCase()} ${Math.round(n.getBoundingClientRect().height)}px` : "app none"; })()];
      return { ticks: line("ticks"), onTick: line("onTick"), ball: line("$ss$type$Ball").slice(0, 40), tick: line("tick"), step: line("step"), views };
    }, BR);
    const EDIT_FRAMES = 60;
    const pe = await playFrames(page, EDIT_FRAMES);
    report(kinds.ticks === "ticks = events Events<number>" && kinds.onTick === "onTick = listener ticks → tick" && kinds.ball.startsWith("type Ball = { readonly x: number") && kinds.tick === "tick = ƒ action(number)" && kinds.step === "step = ƒ (w: World, e: Ev) => World" && kinds.views.slice(0, 3).every((v: string) => / = <div> element, positioned by its parent$/.test(v)) && /^app div [1-9]\d*px$/.test(kinds.views[3]),
      `try (section 9): the breakout pane draws ${JSON.stringify(kinds)}`);
    report(playOk(pe, EDIT_FRAMES), `try (section 9): playing with the breakout pane open in edit mode, ${playSays(pe, EDIT_FRAMES)}`);
    measure(`Breakout playing with its own pane open in edit mode: ${pe.perSecond} world changes/s in ${pe.framesPerSecond} animation frames/s`);
    await page.evaluate((b: string) => { const bm = (window as any).__ojs_runtime.mains.get(b); if (bm._scope.get("playing")._value) bm._scope.get("toggle")._value(); }, BR);
  } else report(false, "try: no editor for breakout step");
}
// At phone width the page does not scroll sideways, and every cell of the tutorial computes without error
// Each lesson cell of the tutorial is in a listing as its typed source, decompiled from the live
// definition, and on the page as its own cell; the first listing is in view at 1280×800. Then the page is
// rendered in the dark default theme and in the light "air" theme: the two differ and every kind of
// text the page draws reads at 4.5:1 or more against what is behind it.
async function cardsAndThemes() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors: string[] = [], network: string[] = [];
  // offline, except the light theme's three stylesheets, which the file cannot carry beside the dark
  // default (@tomlarkworthy/themes takes the first theme whose stylesheets are all embedded)
  await offlineWithAir(page, network);
  page.on("pageerror", (e) => errors.push(String(e.message)));
  await page.goto(`file://${file}`);
  await page.waitForFunction(() => { const m = (window as any).__ojs_runtime?.mains?.get("@tomlarkworthy/soundscript-tutorial"); return m?._scope.get("benchmark")?._value && document.querySelectorAll(".lite-graph svg").length === 2; }, null, { timeout: 60000 });
  const c = await page.evaluate((T) => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get(T);
    const ss = [...(window as any).__ojs_runtime._variables].find((x: any) => x._name === "soundscript" && x._value)._value;
    const seen = new Set<string>(), want: { key: string; text: string }[] = [];
    for (const v of rt._variables) {
      if (v._module !== mod || typeof v._name !== "string" || typeof v._definition !== "function" || ss.langOf(String(v._definition)) !== "ss") continue;
      const key = v._name.replace(/^viewof /, ""), text = ss.decompileVariable(String(v._definition));
      // a state cell's value variable holds no source; its handle variable does
      if (seen.has(key) || text === null) continue;
      seen.add(key);
      want.push({ key, text });
    }
    const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/soundscript-tutorial"]')!;
    const listings = [...pane.querySelectorAll(".lite-listing")].map((l) => l.textContent ?? "");
    // each lesson cell's live source is in a listing, and its own cell is on the page as any cell is
    const missing = want.filter(({ text }) => !listings.some((l) => l.includes(text))).map((w) => w.key);
    // a state cell is drawn by its handle variable, viewof <name>, as Observable draws a viewof cell
    const node = (key: string) => (pane.querySelector(`.observablehq[cell="${key}"]`) ?? pane.querySelector(`.observablehq[cell="viewof ${key}"]`)) as HTMLElement | null;
    const hidden = want.filter(({ key }) => !node(key)?.offsetParent).map((w) => w.key);
    const editors = [...rt._variables].find((v: any) => v._name === "editors")?._value;
    const nobar = want.filter(({ key }) => !editors?.get(mod._scope.get(`viewof ${key}`) ?? mod._scope.get(key))?.offsetParent).map((w) => w.key);
    // a cell that does not check shows its error with the rule named, as an error line
    const rejected = want.filter(({ key }) => { const n = node(key); return n?.classList.contains("observablehq--error") && !/does not check: \[/.test(n.textContent ?? ""); }).map((w) => w.key);
    // the kinds the normal Inspector cannot read are drawn as one line or, an element, mounted
    const line = (key: string) => (node(key)?.textContent ?? "").trim();
    const kinds = { increment: line("increment"), setN: line("setN"), scale: line("scale"), Badge: line("Badge"), app: !!node("app")?.querySelector(":scope .ss-view button") };
    const first = pane.querySelector(".lite-listing") as HTMLElement;
    return { n: want.length, missing, hidden, nobar, rejected, kinds, listings: listings.length, firstTop: Math.round(first?.getBoundingClientRect().top ?? 1e9), firstText: (first?.textContent ?? "").slice(0, 120) };
  }, TUTORIAL);
  report(c.n >= 31 && c.missing.length === 0 && c.hidden.length === 0 && c.rejected.length === 0, `cells: ${c.n} lesson cells each in one of ${c.listings} listings as its live source (missing ${JSON.stringify(c.missing)}) and on the page as its own cell in edit mode (not shown ${JSON.stringify(c.hidden)}); every one that does not check names its rule (${JSON.stringify(c.rejected)})`);
  report(c.nobar.length === 0, `cells: every lesson cell has a visible edit bar (without one: ${JSON.stringify(c.nobar)})`);
  report(c.kinds.increment === "increment = ƒ action()" && c.kinds.setN === "setN = ƒ action(number)" && c.kinds.scale === "scale = ƒ (n: number, by: number) => number" && /^Badge = ƒ \(p: /.test(c.kinds.Badge) && c.kinds.app, `cells: values drawn by the language: ${JSON.stringify(c.kinds)}`);
  report(/^\/\/ A cell is an exported function/.test(c.firstText) && c.firstTop > 0 && c.firstTop < 800, `cells: the first listing (${JSON.stringify(c.firstText.slice(0, 40))}) is at y ${c.firstTop} of an 800 px window`);
  // the Breakout board follows the column width after play has re-run its view cell
  const boardW = () => page.evaluate(() => Math.round(document.querySelector(".lite-game > div > div")!.getBoundingClientRect().width));
  const w0 = await boardW();
  await page.getByRole("button", { name: "play", exact: true }).first().click();
  await page.waitForFunction(() => (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-breakout")._scope.get("world")._value.ball.y < 199, null, { timeout: 10000 }).catch(() => {});
  await page.getByRole("button", { name: "pause", exact: true }).first().click();
  await page.setViewportSize({ width: 500, height: 800 });
  await page.waitForFunction((w0) => Math.round(document.querySelector(".lite-game > div > div")!.getBoundingClientRect().width) < w0, w0, { timeout: 5000 }).catch(() => {});
  const w1 = await boardW();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForFunction((w0) => Math.round(document.querySelector(".lite-game > div > div")!.getBoundingClientRect().width) === w0, w0, { timeout: 5000 }).catch(() => {});
  const w2 = await boardW();
  report(w0 === 640 && w1 <= 468 && w2 === 640, `breakout: the board is ${w0} px at 1280, ${w1} px at 500 after play and pause, ${w2} px at 1280 again`);
  await page.evaluate(() => document.querySelector(".lite-listing")!.scrollIntoView({ block: "start" }));
  const shoot = () => page.screenshot();
  const darkFetches = network.filter((u) => u.startsWith(THEME_BASE));
  report(darkFetches.length === 0, `themes: the default (dark) theme is complete from the file, with no stylesheet requested from the network (${JSON.stringify(darkFetches)})`);
  const dark = { shot: await shoot(), c: await contrasts(page) };
  await setTheme(page, "air");
  const light = { shot: await shoot(), c: await contrasts(page) };
  const low = (o: Record<string, any>) => Object.entries(o).filter(([, v]) => v.min < 4.5).map(([k, v]) => `${k} ${v.min}`);
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  report(!dark.shot.equals(light.shot) && Object.keys(dark.c).length >= 15 && Object.keys(light.c).length >= 15, `themes: the dark and light renders differ (light background ${bg}); ${Object.keys(dark.c).length} and ${Object.keys(light.c).length} kinds of text measured`);
  report(low(dark.c).length === 0 && low(light.c).length === 0, `themes: every kind of text reads at 4.5:1 or more; lowest dark ${Math.min(...Object.values(dark.c).map((v: any) => v.min))}, light ${Math.min(...Object.values(light.c).map((v: any) => v.min))}; under 4.5: dark ${JSON.stringify(low(dark.c))}, light ${JSON.stringify(low(light.c))}`);
  const airFetches = network.filter((u) => u.startsWith(THEME_BASE)).map((u) => u.slice(THEME_BASE.length)).sort();
  report(JSON.stringify(airFetches) === JSON.stringify(["abstract-light.css", "syntax-light.css", "theme-air.css"]), `themes: switching to air requests only its three stylesheets that the file does not carry: ${JSON.stringify(airFetches)}`);
  report(errors.length === 0, `themes: page errors ${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
  await page.close();
}

async function phone() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : r.abort()));
  page.on("pageerror", (e) => errors.push(String(e.message)));
  await page.goto(`file://${file}`);
  await page.waitForFunction(() => { const m = (window as any).__ojs_runtime?.mains?.get("@tomlarkworthy/soundscript-tutorial"); return m?._scope.get("benchmark")?._value && document.querySelectorAll(".lite-graph svg").length === 2; }, null, { timeout: 60000 });
  const m = await page.evaluate(() => {
    const scrollers = [...document.querySelectorAll(".lite-scroll, .lite-graph-scroll, .cm-scroller, pre, .lite-src, .observablehq--inspect, .observablehq > div > table")].filter((e) => getComputedStyle(e).overflowX === "auto");
    const wide = [...document.querySelectorAll(".lp2-pane *")].filter((e) => {
      const r = e.getBoundingClientRect();
      if (!r.width || !(e as HTMLElement).offsetParent || scrollers.some((s) => s !== e && s.contains(e))) return false;
      return r.right > innerWidth + 0.5 || r.left < -0.5;
    }).map((e) => `${e.tagName.toLowerCase()}.${String((e as HTMLElement).className?.baseVal ?? (e as HTMLElement).className).slice(0, 40)}`);
    const board = document.querySelector(".lite-game > div > div")!.getBoundingClientRect();
    // a diagram is drawn to fit, not scrolled: its box is no wider than its container
    const graphs = [...document.querySelectorAll(".lite-graph-scroll")].map((g) => `${g.scrollWidth}/${g.clientWidth}`);
    // a listing wraps rather than running out of its box
    const clipped = [...document.querySelectorAll(".lite-listing")].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => (c.textContent ?? "").slice(0, 40));
    return { docW: document.documentElement.scrollWidth, wide: [...new Set(wide)].slice(0, 8), board: [Math.round(board.left), Math.round(board.right)], graphs, clipped };
  });
  report(m.clipped.length === 0, `phone: every listing fits its box (clipped ${JSON.stringify(m.clipped)})`);
  report(m.docW <= 390 && m.wide.length === 0 && m.board[0] >= 16 && m.board[1] <= 374 && m.graphs.length === 2 && m.graphs.every((g) => +g.split("/")[0] <= +g.split("/")[1]),
    `phone (390 px): page width ${m.docW}, elements past the edge ${JSON.stringify(m.wide)}, the Breakout board spans x ${m.board.join(" to ")}, diagrams (scroll/client width) ${m.graphs.join(", ")}`);
  await testsPass(page, "phone", TUTORIAL, []);
  report(errors.length === 0, `phone: page errors ${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
  await page.close();
}
// the core's README shows its four example cells as cells (an action as one line), then the counter view,
// in the full notebook and in the notebook without the tutorial
async function coreCards(page: Page, label: string) {
  const tab = page.locator(`[title="${CORE}  (drag to a pane edge to dock, or out to save as .js)"]`);
  await page.waitForFunction((C) => (window as any).__ojs_runtime?.mains?.get(C)?._scope.get("ss_language")?._value, CORE, { timeout: 60000 });
  const pane = `.lp2-pane[data-module="${CORE}"]`;
  // the core is a tab beside the tutorial in the full notebook, and the only pane without it
  await page.waitForFunction(([C, pane]) => document.querySelector(`[title^="${C}  ("]`) || document.querySelector(pane), [CORE, pane], { timeout: 20000 });
  if (await tab.count()) await tab.first().click();
  const KEYS = ["tally", "bump", "reset", "doubled"];
  // tally, a state cell, is drawn by its handle variable, viewof tally
  const lines = () => page.evaluate(([pane, keys]) => (keys as string[]).map((k) => (document.querySelector(`${pane} .observablehq[cell="${k === "tally" ? "viewof tally" : k}"]`)?.textContent ?? "").trim()), [pane, KEYS] as const);
  const shown = await until(page, () => page.evaluate(([pane, keys]) => (keys as string[]).every((k) => (document.querySelector(`${pane} .observablehq[cell="${k === "tally" ? "viewof tally" : k}"]`) as HTMLElement | null)?.offsetParent), [pane, KEYS] as const), 20000);
  const r = await page.evaluate(([pane, C, keys]) => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get(C);
    const root = document.querySelector(pane)!;
    const top = (e: Element | null) => (e ? Math.round(e.getBoundingClientRect().top + root.scrollTop) : null);
    const cells = (keys as string[]).map((key) => { const n = root.querySelector(`.observablehq[cell="${key === "tally" ? "viewof tally" : key}"]`) as HTMLElement | null; return { key, text: (n?.textContent ?? "").trim(), visible: !!n?.offsetParent, top: top(n) }; });
    const editors = [...rt._variables].find((v: any) => v._name === "editors")?._value;
    const nobar = cells.filter((c) => !editors?.get(core._scope.get(`viewof ${c.key}`) ?? core._scope.get(c.key))?.offsetParent).map((c) => c.key);
    const h1 = [...root.querySelectorAll("h1")].find((h) => h.textContent === "SoundScript") ?? null;
    const view = root.querySelector('.observablehq[cell="example_view"]') as HTMLElement | null;
    const listing = root.querySelector('.observablehq[cell="readme_listing"] .cell-listing') as HTMLElement | null;
    return { cells, nobar, view: !!view?.offsetParent, viewTop: top(view), h1: top(h1), text: root.querySelector(".ss-example")?.textContent,
      listing: listing?.textContent ?? null, listingTop: top(listing), coloured: listing?.querySelectorAll("span[class^=tok-]").length ?? 0 };
  }, [pane, CORE, KEYS] as const);
  // one source listing of the four cells, after the title and before the cells, coloured by the language's highlight
  // the listing puts one blank line between cells; blank lines are not compared
  const lines_ = (t: string) => t.split("\n").filter((l) => l.trim()).join("\n");
  const want = lines_(readFileSync(join(HERE, "core-example.ts"), "utf8"));
  report(lines_(r.listing ?? "") === want && r.listingTop! > r.h1! && r.listingTop! < r.cells[0].top! && r.coloured > 0,
    `${label}: one source listing of tally, bump, reset and doubled (${r.listing === null ? "none" : lines_(r.listing) === want ? "equal to core-example.ts, blank lines aside" : JSON.stringify(r.listing.slice(0, 120))}; ${r.coloured} coloured spans)`);
  const texts = r.cells.map((c) => c.text);
  const order = r.h1 !== null && r.cells.every((c, i) => c.top! > r.h1! && (i === 0 || c.top! > r.cells[i - 1].top!)) && r.view && r.viewTop! > r.cells[3]?.top!;
  report(shown && JSON.stringify(texts) === JSON.stringify(["tally = 0", "bump = ƒ action()", "reset = ƒ action()", "doubled = 0"]) && r.cells.every((c) => c.visible) && r.nobar.length === 0 && order,
    `${label}: the title, then the cells ${JSON.stringify(texts)}, each with a visible edit bar (without: ${JSON.stringify(r.nobar)}), then the counter view (${JSON.stringify(r.text)})`);
  // a click on bump reaches tally's line
  await page.locator(`${pane} .ss-example button`, { hasText: "bump" }).click();
  const moved = await until(page, async () => (await lines())[0] === "tally = 1", 5000);
  const after = (await lines())[0];
  await page.locator(`${pane} .ss-example button`, { hasText: "reset" }).click();
  report(moved, `${label}: bump changes tally's line to ${JSON.stringify(after)}`);
}

// a phone reader plays with a finger: tap play, drag across the board; the paddle follows and the page does not scroll
async function touch() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors: string[] = [];
  await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : r.abort()));
  page.on("pageerror", (e) => errors.push(String(e.message)));
  await page.goto(`file://${file}`);
  await page.waitForFunction(() => (window as any).__ojs_runtime?.mains?.get("@tomlarkworthy/soundscript-breakout")?._scope.get("world")?._value, null, { timeout: 60000 });
  const world = () => page.evaluate(() => { const w = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-breakout")._scope.get("world")._value; return { paddle: w.paddle, y: w.ball.y }; });
  const scroll = () => page.evaluate(() => [scrollY, ...[...document.querySelectorAll(".lp2-pane")].map((e) => e.scrollTop)].join(","));
  const canvas = page.locator(".lite-game canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const play = (await page.locator(".lite-game button", { hasText: "play" }).first().boundingBox())!;
  const y0 = (await world()).y;
  await page.touchscreen.tap(play.x + play.width / 2, play.y + play.height / 2);
  const running = await until(page, async () => (await world()).y !== y0, 10000);
  // the page settles after play re-renders the game (scroll anchoring); the drag is measured once the
  // scroll positions and the board's place have held for 10 animation frames (the cap only ends a hang)
  await page.evaluate(async () => {
    const at = () => [scrollY, ...[...document.querySelectorAll(".lp2-pane")].map((e) => e.scrollTop), document.querySelector(".lite-game canvas")?.getBoundingClientRect().top].join(",");
    let last = at(), held = 0;
    for (let i = 0; i < 600 && held < 10; i++) { await new Promise((r) => requestAnimationFrame(r)); const now = at(); held = now === last ? held + 1 : 0; last = now; }
  });
  const before = { world: await world(), scroll: await scroll(), top: (await canvas.boundingBox())!.y };
  const bb = (await canvas.boundingBox())!;
  const cdp = await ctx.newCDPSession(page);
  const at = (f: number, dy: number) => [{ x: bb.x + bb.width * f, y: bb.y + bb.height * 0.8 - dy, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(0.5, 0) });
  // left and upward, as a thumb moves: an upward drag on a page that may scroll would scroll it
  for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(0.5 - 0.04 * i, 15 * i) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  // the value variable takes each commit on the next animation frame, so wait for the whole drag, not the first move
  await until(page, async () => (await world()).paddle < before.world.paddle - 60, 3000);
  const after = { world: await world(), scroll: await scroll(), top: (await canvas.boundingBox())!.y };
  // the board's place on the screen is the test: a pane's scrollTop also moves when content above it
  // grows late (scroll anchoring keeps the board where it is), which is not the drag scrolling the page
  report(running && after.world.paddle < before.world.paddle - 60 && Math.abs(after.top - before.top) < 1 && after.scroll.split(",")[0] === before.scroll.split(",")[0],
    `touch (390 px): a tap on play starts the game (${running}); a drag left moves the paddle from x ${before.world.paddle} to ${after.world.paddle}; the board stays at y ${Math.round(before.top)} -> ${Math.round(after.top)} (window and pane scroll ${before.scroll} -> ${after.scroll})`);
  report(errors.length === 0, `touch: page errors ${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
  await ctx.close();
}
const stubPicker = async (page: Page, saved: string) => {
  await page.exposeFunction("__verifySave", (s: string) => writeFileSync(saved, s));
  await page.addInitScript(() => {
    (window as any).showSaveFilePicker = async () => ({ name: "saved.html", createWritable: async () => { let buf = ""; return { write: async (s: string) => { buf += s; }, close: async () => (window as any).__verifySave(buf) }; } });
  });
};

// --- 1-3: the notebook
referenceChecks();
if (process.argv.includes("--static-only")) { console.log(`${passes} pass, ${fails} fail`); process.exit(fails ? 1 : 0); }
if (process.argv.includes("--focus-repro")) {
  // loops the start of the Try-it pass (first cell, section 2, section 3's editor) to reproduce the focus flake
  const n = Number(process.argv[process.argv.indexOf("--focus-repro") + 1]) || 10;
  let failed = 0;
  for (let i = 0; i < n; i++) {
    const G = await open(file);
    try { await tryIts(G.page, true); } catch (e) {
      failed++; console.log(`REPRO ${i} FAILED: ${String((e as Error).stack).slice(0, 900)}`);
      console.log("  after: " + JSON.stringify(await G.page.evaluate(() => ({ href: location.href, now: Math.round(performance.now()), ready: document.readyState, ft: !!(window as any).__ft, rt: !!(window as any).__ojs_runtime })).catch((x: Error) => String(x.message).slice(0, 100))));
    }
    await G.page.close();
  }
  console.log(`focus-repro: ${failed} of ${n} failed`);
  await browser.close();
  process.exit(0);
}
if (process.argv.includes("--broken-repro")) {
  // brokenState's check on a reopened export, n times, without open()'s wait for the spec tests: the check must
  // wait for what it reads. Needs .scratch/export-broken.html from a run that reached brokenState.
  const n = Number(process.argv[process.argv.indexOf("--broken-repro") + 1]) || 20;
  const xPath = join(SCRATCH, "export-broken.html");
  const before = fails;
  let failed = 0;
  for (let i = 0; i < n; i++) {
    const X = await open(xPath, undefined, false);
    const f0 = fails;
    try {
      await X.page.waitForFunction((t: string) => (window as any).__ojs_runtime?.mains?.get(t)?._scope.get("half")?._value !== undefined, TUTORIAL, { timeout: 60000 });
      await neverRuns(X.page, `broken-repro ${i}`);
    } catch (e) { report(false, `broken-repro ${i}: ${String((e as Error).message).split("\n")[0]}`); }
    if (fails > f0) failed++;
    await X.page.close();
  }
  console.log(`broken-repro: ${failed} of ${n} failed`);
  await browser.close();
  process.exit(fails > before ? 1 : 0);
}
const tryOnly = process.argv.includes("--try-only") || process.argv.includes("--broken-only");
const uiOnly = process.argv.includes("--ui-only") || tryOnly;
const speedOnly = process.argv.includes("--speed-only");
// --guard-only: only the core-not-main pass (the editor commands with no language registered)
const guardOnly = process.argv.includes("--guard-only");
const variantOnly = process.argv.includes("--variant-only") || speedOnly || guardOnly;
if (!QUICK && !variantOnly && !process.argv.includes("--no-try") && !process.argv.includes("--broken-only")) {
  await cardsAndThemes();
  await phone();
  await touch();
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : r.abort()));
    await page.goto(`file://${file}`);
    await coreCards(page, "core README");
    await page.close();
  }
  const G = await open(file);
  await tryIts(G.page);
  requests("try-it page", G);
  await G.page.close();
}
if ((!uiOnly && !variantOnly || speedOnly) && !process.argv.includes("--no-speed") && !QUICK) await speed();
const A = uiOnly || variantOnly ? null as any : await open(file, undefined, true, true);
if (!uiOnly && !variantOnly) {
// the counter tests press their buttons on copies: the page's counters keep what the reader set
await A.page.waitForFunction(([c, t]: string[]) => { const rt = (window as any).__ojs_runtime; return rt?.mains?.get(t)?._scope.get("increment")?._value && rt.mains.get(c)?._scope.get("bump")?._value; }, [CORE, TUTORIAL], { timeout: 60000 });
// the boot counts are read before the presses below run the counters' readers again
await bootRuns(A.page);
const pressed = () => A.page.evaluate(async ([c, t]: string[]) => {
  const rt = (window as any).__ojs_runtime;
  return { count: await rt.mains.get(t).value("count"), tally: await rt.mains.get(c).value("tally") };
}, [CORE, TUTORIAL]);
await A.page.evaluate(async ([c, t]: string[]) => {
  const rt = (window as any).__ojs_runtime;
  const inc = await rt.mains.get(t).value("increment"), bump = await rt.mains.get(c).value("bump");
  inc(); inc(); bump(); bump(); bump();
}, [CORE, TUTORIAL]);
await A.page.waitForFunction(([c, t]: string[]) => { const rt = (window as any).__ojs_runtime; return rt.mains.get(t)._scope.get("count")._value === 2 && rt.mains.get(c)._scope.get("tally")._value === 3; }, [CORE, TUTORIAL], { timeout: 10000 }).catch(() => {});
const before = await pressed();
await testsOn(A.page, "original");
await testsPass(A.page, "original", CORE, CORE_TESTS);
await testsPass(A.page, "original", TUTORIAL, TUTORIAL_TESTS);
{
  const after = await pressed();
  report(before.count === 2 && before.tally === 3 && after.count === 2 && after.tally === 3, `original: the counter tests ran on copies; the page's count ${before.count} -> ${after.count}, tally ${before.tally} -> ${after.tally}`);
}
{
  // the Breakout tests ran on copies: the page's game was neither played nor reset
  const g = await A.page.evaluate(() => {
    const rt = (window as any).__ojs_runtime, bm = rt.mains.get("@tomlarkworthy/soundscript-breakout");
    const ss = [...(window as any).__ojs_runtime._variables].find((x: any) => x._name === "soundscript" && x._value)._value;
    return { ballRuns: bm._scope.get("ballView")._version, y: bm._scope.get("world")._value.ball.y, pulling: ss.pulling() };
  });
  const atBoot = bootBallRuns.get("original");
  report(g.ballRuns === atBoot && g.y === 180 && g.pulling === 0, `original: after the tests, the page's Breakout is as it booted: ballView computed ${g.ballRuns} times (${atBoot} at boot), ball at y ${g.y}, ${g.pulling} clocks pulled`);
}
for (const m of SECTIONS) await testsPass(A.page, "original", m, SECTION_TESTS[m]);
await testsPass(A.page, "original", SPEC, SPEC_TESTS);
await testsPass(A.page, "original", RAW_CELLS, RAW_TESTS);
await hookPass(A.page, "original");
await oneCore(A.page, "original");
await counterClick(A.page, "original");
await editorOn(A.page, "original", TUTORIAL, "increment", "count: State<number>", "count: State<string>", "inject-state");
await counterClick(A.page, "after the unchanged save");
await testsPass(A.page, "after the unchanged save", TUTORIAL, TUTORIAL_TESTS);
const fresh = await addCell(A.page, TUTORIAL, "half", "const tripled = (width: number) => width * 3;", false);
report(fresh.back === "const tripled = (width: number) => width * 3;" && fresh.value === 1920 && fresh.afterAnchor && fresh.held, `editor: a new cell is applied as SoundScript after its anchor: ${JSON.stringify(fresh)}`);

// --- 4: export, reopen, export again
const sourceA = await ssSource(A.page, TUTORIAL);
const exp1 = await exportPage(A.page);
const exp1Path = join(SCRATCH, "export-1.html");
writeFileSync(exp1Path, exp1);
const orig = readFileSync(file, "utf8");
for (const m of [CORE, TUTORIAL, ...SECTIONS]) {
  const lA = ssLines(orig, m), l1 = ssLines(exp1, m);
  report(lA.length > 0 && JSON.stringify(lA) === JSON.stringify(l1), `export: ${m}: ${l1.length} SoundScript definition lines, identical to the original file's ${lA.length}`);
}
report(exp1.includes("/*ss:: State<number>*/"), "export: the type comments are in the exported module");
sameBlocks("export", orig, exp1);
const rawA = await rawExport(rawHelpers(), orig, exp1, A.page, null);
await instanceStops(A.page);
await deleteStops(A.page);
requests("original page", A);
await A.page.close();
if (QUICK) throw new QuickDone();


const B = await open(exp1Path, undefined, true, true);


await testsOn(B.page, "reopened export");
await testsPass(B.page, "reopened export", CORE, CORE_TESTS);
await testsPass(B.page, "reopened export", TUTORIAL, TUTORIAL_TESTS);
for (const m of SECTIONS) await testsPass(B.page, "reopened export", m, SECTION_TESTS[m]);
await testsPass(B.page, "reopened export", SPEC, SPEC_TESTS);
await testsPass(B.page, "reopened export", RAW_CELLS, RAW_TESTS);
await rawExport(rawHelpers(), orig, exp1, B.page, rawA);
await hookPass(B.page, "reopened export");
await counterClick(B.page, "reopened export");
const sourceB = await ssSource(B.page, TUTORIAL);
report(sourceA === sourceB, `reopened export: the tutorial's SoundScript source decompiles to the same ${sourceA.length} chars`);
const exp2 = await exportPage(B.page);
writeFileSync(join(SCRATCH, "export-2.html"), exp2);
for (const m of [CORE, TUTORIAL, ...SECTIONS]) report(blockContent(exp1, m) === blockContent(exp2, m), `second export: the ${m} block equals the first export's`);
requests("reopened page", B);
await B.page.close();
}
// --- real clicks and keys on a second copy of the page; Save in place writes .scratch/saved.html
const savedPath = join(SCRATCH, "saved.html");
if (!variantOnly && !tryOnly) {
rmSync(savedPath, { force: true });
const E = await open(file, savedPath, true, true);
await testsOn(E.page, "ui");
await testsPass(E.page, "ui", CORE, CORE_TESTS);
await completion(E.page);
await editorFeatures(E.page);
await languageSwitch(E.page);
// raw cells edited by keys; the Save in place at the end of uiPaths keeps the last edit
await rawOnPage(E.page, rawHelpers(), "ui raw");
await pickerPaths(E.page, rawHelpers(), "ui picker");
await uiPaths(E.page, savedPath);
requests("ui page", E);
await E.page.close();
if (existsSync(savedPath)) {
  const F = await open(savedPath, undefined, true, true);
  await testsOn(F.page, "reload after save");
  // the edits change width and add a cell, so the two tests that pin section 1's values and the verdict list are left out
  const changed = ["test_ss_module_checks", "test_half"];
  await testsPass(F.page, "reload after save", TUTORIAL, TUTORIAL_TESTS.filter((t) => !changed.includes(t)), changed);
  await afterReload(F.page);
  await rawAfterSave(F.page, rawHelpers(), "reload after save");
  requests("reloaded saved page", F);
  await F.page.close();
}
}
// --- the broken state: rejected cells never run, an unparsable cell is stored, Breakout's step broken mid-game
if ((!uiOnly && !variantOnly || process.argv.includes("--broken-only")) && !process.argv.includes("--no-broken")) await brokenState(join(SCRATCH, "saved-broken.html"));
// --- 5: the core without the tutorial
if (!uiOnly && !speedOnly && !process.argv.includes("--no-variant")) {
  if (!guardOnly) {
  const variant = join(SCRATCH, "core-only.html");
  const built = Bun.spawnSync(["bun", join(HERE, "build.ts"), "--no-tutorial", "--force", "--out", variant], { stdout: "pipe", stderr: "pipe" });
  report(built.exitCode === 0, `core-only: built ${variant}${built.exitCode ? ": " + built.stderr.toString().slice(-400) : ""}`);
  const vhtml = readFileSync(variant, "utf8");
  report(!ids(vhtml).has(TUTORIAL) && ![...ids(vhtml)].some((id) => id.startsWith(TUTORIAL + "/")), "core-only: no tutorial block or attachment in the file");
  const C = await open(variant, undefined, true, true);
  await testsOn(C.page, "core-only");
  await testsPass(C.page, "core-only", CORE, CORE_TESTS);
  await hookPass(C.page, "core-only");
  await coreCards(C.page, "core-only README");
  await editorOn(C.page, "core-only", CORE, "bump", "tally: State<number>", "tally: State<string>", "inject-state");
  {
    // without the add-on: no block of it, none of its variables in the runtime module, and no Worker made by the page
    const addon = blockFacts(blockContent(readFileSync(file, "utf8"), WORKERS) ?? "");
    const rt = blockFacts(blockContent(vhtml, "@tomlarkworthy/soundscript-runtime")!);
    const shared = rt.names.filter((n) => n !== null && addon.names.includes(n));
    const made = await C.page.evaluate(() => (window as any).__workersMade);
    report(!ids(vhtml).has(WORKERS) && addon.names.includes("ss_pool") && !shared.length && rt.newWorker === 0 && made === 0,
      `core-only: no ${WORKERS} block (the full notebook's defines ${addon.names.filter((n) => n !== null).length} named variables), the runtime module defines none of them (${JSON.stringify(shared)}) and has ${rt.newWorker} new Worker, and the page constructed ${made} Workers after the core tests and the editor`);
  }
  // the editor commands on a SoundScript cell with the language registered; guard_probe is made for it, and deleted by it
  await addCell(C.page, CORE, "doubled", "const guard_probe = (tally: number) => tally * 2;", true);
  await commandGuard(C.page, "core-only (registered)", CORE, "guard_probe", "ss_keyOf", true);
  // a cell with a Notebook Kit shadow variable, made SoundScript through apply: the shadow goes with the
  // head. The head and its display shadow are made as @tomlarkworthy/js-toolchain's defineCell makes
  // them (variable(undefined, { shadow: {} }), a display variable in _shadow), not by typing a Kit cell.
  const shadow = await C.page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
    const head = core.variable(undefined, { shadow: {} });
    const display = new head.constructor(2, core);
    display.define(["kitcell"], () => (x: number) => x);
    head._shadow.set("display", display);
    head.define("kitcell", [], () => 1);
    const out = await get("ss_language")._value.apply("const kitcell = () => 2;", [head], { module: { module: core }, variables: [head] });
    const alive = [...rt._variables].includes(display) || head._shadow.size > 0;
    const v = get("kitcell");
    const value = v ? await core.value("kitcell") : null;
    v?.delete();
    return { applied: typeof out === "string", shadowAlive: alive, value };
  });
  report(shadow.applied && !shadow.shadowAlive && shadow.value === 2, `core-only: a cell with a Kit shadow variable made SoundScript through apply leaves no shadow behind: ${JSON.stringify(shadow)}`);
  const NEW = "const tripled = (doubled: number) => doubled * 3;";
  const added = await addCell(C.page, CORE, "doubled", NEW, true);
  report(added.back === NEW && added.value === 0 && added.afterAnchor && added.held, `core-only: a new cell added through the editor: ${JSON.stringify(added)}`);
  // a state cell made plain and a state cell again through apply: the handle variable comes and goes
  const flips = await C.page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
    const lang = get("ss_language")._value;
    const names = () => [...rt._variables].filter((v: any) => v._module === core && /^(viewof )?flag$/.test(v._name)).map((v: any) => v._name).sort();
    const out: any[] = [];
    const vars: any[] = [];
    out.push(await lang.apply("const flag = (): StateCell<boolean> => state(false);", vars, { module: { module: core }, variables: [get("tripled")] }), names());
    out.push(await lang.apply("const flag = () => true;", vars), names(), await core.value("flag"));
    out.push(await lang.apply("const flag = (): StateCell<boolean> => state(false);", vars), names(), await core.value("flag"));
    return out;
  });
  report(JSON.stringify(flips.filter((x: any) => Array.isArray(x))) === JSON.stringify([["flag", "viewof flag"], ["flag"], ["flag", "viewof flag"]]) && flips[4] === true && flips[7] === false, `core-only: flag state -> plain -> state through apply: ${JSON.stringify(flips)}`);
  // A generator becomes an events handle when a cell takes it as Events<T>, and a plain generator again
  // when that cell is deleted outside apply (as the editor's delete button does). The consumer is
  // deleted at once, before onCodeChange's snapshot has seen it, which is the case that used to leave
  // pulse compiled as events; its listener must end too.
  for (const consumer of ["const pulses = (pulse: Events<number>) => 0;", "const pulses = (pulse: Events<number>, addn: Action<[number]>) => on(pulse, addn);"]) {
    const src = await C.page.evaluate(async (consumer) => {
      const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
      const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
      const lang = get("ss_language")._value, ss = get("soundscript")._value;
      const kind = () => { const d = get("pulse")?._definition; return d ? ss.compiledKind(String(d))?.kind : undefined; };
      const until = async (f: () => boolean) => { for (let i = 0; i < 100 && !f(); i++) await new Promise((r) => requestAnimationFrame(r)); return f(); };
      const out: any = {};
      out.gen = await lang.apply("const pulse = function* () { while (true) yield 1; };", [], { module: { module: core }, variables: [get("tripled")] });
      out.before = kind();
      if (consumer.includes("addn")) out.addn = await lang.apply("const addn = (tally: State<number>) => action((n: number) => tally.update((t) => t + n));", [], { module: { module: core }, variables: [get("pulse")] });
      const r0 = ss.running();
      out.consumer = await lang.apply(consumer, [], { module: { module: core }, variables: [get("pulse")] });
      out.withConsumer = kind();
      if (consumer.includes("on(") && out.consumer) { await core.value("pulses"); out.runningWith = ss.running() - r0; }
      if (!out.consumer) return out;
      get("pulses").delete();
      out.settled = await until(() => kind() === "cell" && ss.running() === r0);
      out.afterDelete = kind();
      out.runningAfter = ss.running() - r0;
      try { out.roundtrip = get("ss_roundtrip")._value(core); } catch (e) { out.roundtrip = String(e); }
      get("pulse").delete();
      get("addn")?.delete();
      await until(() => !get("pulse") && !get("addn"));
      get("reset")._value();
      return out;
    }, consumer);
    const listens = consumer.includes("on(");
    report(typeof src.consumer === "string" && src.before === "cell" && src.withConsumer === "events" && src.afterDelete === "cell" && src.runningAfter === 0 && (!listens || src.runningWith === 1) && typeof src.roundtrip === "number", `core-only: pulse is an events cell while pulses${listens ? " listens to it" : " takes it as Events<number>"}, a plain generator once pulses is deleted before the snapshot saw it${listens ? ", and the listener ends" : ""}: ${JSON.stringify(src)}`);
  }
  await listenerOnce(C);
  // (d) an action in a state cell across a save: aCurrent starts as aInc and holds aDec when saved
  const stored = await C.page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
    const lang = get("ss_language")._value;
    const res: any[] = [];
    for (const c of [
      "const aCount = (): StateCell<number> => state(0);",
      "const aInc = (aCount: State<number>) => action(() => aCount.update((c) => c + 1));",
      "const aDec = (aCount: State<number>) => action(() => aCount.update((c) => c - 1));",
      "const aCurrent = (aInc: Action<[]>): StateCell<Action<[]>> => state(aInc);",
      "const aUseDec = (aCurrent: State<Action<[]>>, aDec: Action<[]>) => action(() => aCurrent.set(aDec));",
    ]) res.push(!!(await lang.apply(c, [], { module: { module: core }, variables: [get("tripled")] })));
    await core.value("aUseDec");
    get("aUseDec")._value();
    for (let i = 0; i < 300 && get("aCurrent")._value !== get("aDec")._value; i++) await new Promise((r) => requestAnimationFrame(r));
    return { applied: res, holdsDec: get("aCurrent")._value === get("aDec")._value };
  });
  const cexp = await exportPage(C.page);
  const cexpPath = join(SCRATCH, "core-only-export.html");
  writeFileSync(cexpPath, cexp);
  requests("core-only page", C);
  await C.page.close();
  const D = await open(cexpPath, undefined, true, true);
  await testsOn(D.page, "core-only reopened");
  await testsPass(D.page, "core-only reopened", CORE, CORE_TESTS);
  {
    const loaded = await D.page.evaluate(async () => {
      const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
      const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
      const cur = await core.value("aCurrent"), inc = await core.value("aInc"), dec = await core.value("aDec");
      const c0 = await core.value("aCount");
      cur();
      for (let i = 0; i < 300 && get("aCount")._value === c0; i++) await new Promise((r) => requestAnimationFrame(r));
      return { isInc: cur === inc, isDec: cur === dec, countChange: get("aCount")._value - c0 };
    });
    // a report, not a requirement: what a state cell holding an action holds after a save and reopen
    console.log(`  report (d) action in a state cell across a save: before saving ${JSON.stringify(stored)}; on load ${JSON.stringify(loaded)}`);
    report(stored.applied.every(Boolean) && (loaded.isInc || loaded.isDec), `core-only reopened: a state cell that held an action when saved holds an action on load (${loaded.isInc ? "its initial aInc" : "the stored aDec"})`);
  }
  const after = await D.page.evaluate(async (NEW) => {
    const rt = (window as any).__ojs_runtime;
    const core = rt.mains.get("@tomlarkworthy/soundscript");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
    const v = get("tripled");
    if (!v) return { present: false };
    const text = get("soundscript")._value.decompileVariable(String(v._definition));
    const verdict = get("ss_check")._value(core).result.cells.find((c: any) => c.name === "tripled")?.status;
    const lang = get("ss_language")._value;
    const flag = get("viewof flag") && get("flag") ? lang.decompile([get("flag")]) : null;
    return { present: true, typed: text === NEW, verdict, editorSource: await lang.decompile([v]), value: await core.value("tripled"), flag: await flag, roundtrip: get("ss_roundtrip")._value(core) };
  }, NEW);
  report(after.flag === "const flag = (): StateCell<boolean> => state(false);", `core-only reopened: flag is a state cell again after export: ${after.flag}, ${after.roundtrip} variables round trip`);
  report(after.present && after.typed && after.verdict === "ok" && after.editorSource === NEW && after.value === 0, `core-only reopened: the added cell survived the export as typed source that checks: ${JSON.stringify(after)}`);
  requests("core-only reopened page", D);
  await D.page.close();
  }

  // --- 6: the core only as the tutorial's import, so ss_registration never runs on its own. An
  // editor opened then shows the compiled text and must refuse to save it; once the language
  // registers, the same open editor shows the typed source.
  // --- 7: raw-cells not booted (build.ts --no-raw): the polyglot module's raw cells have no language
  {
    const noRaw = join(SCRATCH, "no-raw.html");
    const built7 = Bun.spawnSync(["bun", join(HERE, "build.ts"), "--no-raw", "--force", "--out", noRaw], { stdout: "pipe", stderr: "pipe" });
    report(built7.exitCode === 0, `no-raw: built ${noRaw}${built7.exitCode ? ": " + built7.stderr.toString().slice(-400) : ""}`);
    const R = await open(noRaw);
    await R.page.waitForFunction((m) => (window as any).__ojs_runtime?.mains?.get(m), POLY, { timeout: 60000 });
    await rawUnloaded(R.page, rawHelpers(), "no-raw");
    await R.page.close();
  }
  const unreg = join(SCRATCH, "core-not-main.html");
  const built6 = Bun.spawnSync(["bun", join(HERE, "build.ts"), "--core-not-main", "--force", "--out", unreg], { stdout: "pipe", stderr: "pipe" });
  report(built6.exitCode === 0, `core-not-main: built ${unreg}${built6.exitCode ? ": " + built6.stderr.toString().slice(-400) : ""}`);
  const U = await open(unreg);
  await U.page.waitForFunction((tut) => (window as any).__ojs_runtime?.mains?.get(tut), TUTORIAL, { timeout: 60000 });
  // the editor commands on a SoundScript cell with no language registered: each refused, or writes no marked definition
  await commandGuard(U.page, "core-not-main (unregistered)", TUTORIAL, "test_half", "framed", false);
  const g2 = await U.page.evaluate(async (tut) => {
    const rt = (window as any).__ojs_runtime;
    const until = async (fn: () => any, what: string, ms = 30000) => {
      const t0 = Date.now();
      for (;;) { const got = await fn(); if (got) return got; if (Date.now() - t0 > ms) throw new Error(`${what} not reached in ${ms} ms`); await new Promise((r) => setTimeout(r, 100)); }
    };
    const find = (name: string, mod?: any) => [...rt._variables].find((v: any) => v._name === name && (!mod || v._module === mod));
    const out: any = {};
    try {
      const mod = await until(() => rt.mains.get(tut), "the tutorial module");
      const inc = await until(() => find("width", mod), "width");
      await until(() => find("editors")?._value?.get(inc)?.querySelector(".hotbar"), "an editor bar beside width");
      const langsV = [...rt._variables].filter((v: any) => v._name === "cellLanguagesRef");
      const langs = langsV.find((v: any) => v._value)?._value ?? await langsV[0]._module.value("cellLanguagesRef");
      out.registeredAtOpen = langs.current.map((l: any) => l.id);
      const host = find("editors")._value.get(inc);
      host.querySelector(".hotbar").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const EditorView = find("EditorView")._value, codemirror = find("codemirror")._value;
      const view = () => { const cm = host.querySelector(".cm-editor"); return cm && EditorView.findFromDOM(cm); };
      await until(() => view()?.state.doc.toString().trim(), "text in the editor");
      out.shownBefore = view().state.doc.toString();
      out.diagnostics = await until(() => { const ds: string[] = []; codemirror.forEachDiagnostic?.(view().state, (d: any) => ds.push(d.message)); return ds.length ? ds : null; }, "a diagnostic");
      const def0 = inc._definition;
      const warns: string[] = [], warn0 = console.warn;
      console.warn = (...a: any[]) => { warns.push(String(a[0]?.message ?? a[0])); return warn0(...a); };
      // the visualizer draws increment with the normal Inspector until the language registers
      const incLine = () => (document.querySelector('.observablehq[cell="increment"]')?.textContent ?? "").trim();
      out.lineBefore = await until(() => incLine(), "increment's line");
      view().contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, shiftKey: true, bubbles: true, cancelable: true }));
      // the editor refuses the save with a warning; the definition is read after it
      out.refusal = await until(() => warns.find((w) => /^not saved: /.test(w)), "the refusal of the save").finally(() => { console.warn = warn0; });
      out.savedUnchanged = inc._definition === def0 && find("width", mod) === inc;
      // now the language registers (an observer keeps ss_registration, and so the registration, alive);
      // the open editor follows
      find("ss_registration")._module.variable({}).define(["ss_registration"], (x: any) => x);
      await until(() => /^const width = /m.test(view()?.state.doc.toString() ?? ""), "the typed source after registration");
      out.shownAfter = view().state.doc.toString();
      out.lineAfter = await until(() => incLine() === "increment = ƒ action()" && incLine(), "increment drawn by the language");
    } catch (e) { out.error = String((e as Error)?.message ?? e); }
    return out;
  }, TUTORIAL);
  // raw-cells is registered on this page too; only "ss" must be absent
  // the compiled text shown is width's plain cell: "width =" and a definition whose first comment is the marker
  const shownCompiled = (() => {
    try {
      const t = [...acorn.tokenizer(g2.shownBefore ?? "", { ecmaVersion: "latest" })];
      return t[0]?.value === "width" && t[1]?.type.label === "=" && compiledKind((g2.shownBefore as string).slice(t[1].end))?.callee === "plain";
    } catch { return false; }
  })();
  report(!g2.error && !g2.registeredAtOpen?.includes("ss") && shownCompiled && g2.diagnostics?.some((d: string) => /not loaded yet/.test(d)) && g2.savedUnchanged,
    `core-not-main: with no language registered the editor on width shows the compiled text, says it is not loaded, and Shift-Enter saves nothing: ${JSON.stringify({ ...g2, shownBefore: g2.shownBefore?.slice(0, 60), shownAfter: undefined })}`);
  report(!g2.error && /^const width = \(\) => 640;$/m.test(g2.shownAfter ?? ""), `core-not-main: after registration the open editor shows the typed source: ${JSON.stringify(g2.shownAfter ?? g2.error)}`);
  report(!g2.error && g2.lineBefore !== g2.lineAfter && g2.lineAfter === "increment = ƒ action()", `core-not-main: increment's line is the normal Inspector's before registration (${JSON.stringify(g2.lineBefore?.slice(0, 60))}) and the language's after, without a reload (${JSON.stringify(g2.lineAfter ?? g2.error)})`);
  // a language whose editor extension throws leaves the plain editor, with the error shown
  const g1 = await U.page.evaluate(async (tut) => {
    const rt = (window as any).__ojs_runtime;
    const until = async (fn: () => any, what: string, ms = 30000) => {
      const t0 = Date.now();
      for (;;) { const got = await fn(); if (got) return got; if (Date.now() - t0 > ms) throw new Error(`${what} not reached in ${ms} ms`); await new Promise((r) => setTimeout(r, 100)); }
    };
    const find = (name: string, mod?: any) => [...rt._variables].find((v: any) => v._name === name && (!mod || v._module === mod));
    const lang = find("ss_language")._value, ext = lang.extension;
    const out: any = {};
    lang.extension = () => { throw new Error("injected extension fault"); };
    try {
      const mod = rt.mains.get(tut), inc = find("area", mod);
      const host = await until(() => find("editors")?._value?.get(inc)?.querySelector(".hotbar") && find("editors")._value.get(inc), "an editor bar beside area");
      host.querySelector(".hotbar").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const EditorView = find("EditorView")._value, codemirror = find("codemirror")._value;
      const view = () => { const cm = host.querySelector(".cm-editor"); return cm && EditorView.findFromDOM(cm); };
      await until(() => view()?.state.doc.toString().trim(), "text in the editor");
      out.shown = view().state.doc.toString().slice(0, 160);
      out.diagnostics = await until(() => { const ds: string[] = []; codemirror.forEachDiagnostic?.(view().state, (d: any) => ds.push(d.message)); return ds.length ? ds : null; }, "a diagnostic");
    } catch (e) { out.error = String((e as Error)?.message ?? e); }
    finally { lang.extension = ext; }
    return out;
  }, TUTORIAL);
  report(!g1.error && /^const area = /m.test(g1.shown ?? "") && g1.diagnostics?.some((d: string) => d.includes("injected extension fault")), `core-not-main: an editor extension that throws leaves the plain editor with the error shown: ${JSON.stringify(g1)}`);
  await U.page.close();
}
} catch (e) {
  // a thrown error ends the run early; it counts as a failure, so a partial run cannot read as a pass
  if (!(e instanceof QuickDone)) { console.log(`FAIL stopped by an error: ${(e as Error)?.stack ?? e}`); fails++; }
}
await browser.close().catch(() => {});
console.log(`${passes} pass, ${fails} fail`);
console.log(`measurements (printed, not judged):${measurements.map((m) => "\n  " + m).join("")}`);
console.log(`${QUICK ? "QUICK (original page only); " : ""}power ${power}; functional ${counts.functional.pass} pass ${counts.functional.fail} fail; measurements ${measurements.length}`);
process.exit(fails ? 1 : 0);
