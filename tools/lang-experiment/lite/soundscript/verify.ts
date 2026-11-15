// bun lite/soundscript/verify.ts [notebook.html] [--shot file.png] [--no-variant] [--no-speed] [--ui-only | --variant-only | --speed-only]
// Headless Chromium, every non-file request aborted. Opens soundscript.html (default
// lopebooks/notebooks/soundscript.html) with its own default layout, then:
//  1. every test cell of the core, the tutorial and the four section modules, and editor-5's
//     test_e5_language_hook; one instance of the core, one ss_registration;
//  2. the live counter: a real click on "add one";
//  3. the editor fork on the tutorial's `increment` (synthetic events): typed source shown, an
//     unchanged save keeps text and pid, Ref<string> shows a diagnostic and is refused;
//  4. export with exporter-3, reopen, run 1 and 2 there, compare SoundScript definitions, block ids
//     and decompiled source, export again and compare the module blocks; then, on the original page,
//     delete `onTick` while Breakout plays and check the clock stops; dispose a copy of the game while it plays;
//  5. real Playwright clicks and keys on a fresh page: tally renders as one cell and its hotbar opens
//     the ref source; a typed refused edit and a typed applied edit of `width`; a cell added with the
//     hotbar's add button; Save in place from the lopepage menu (showSaveFilePicker is stubbed to
//     write .scratch/saved.html); the saved file reopened with the edits in it;
//  6. the core without the tutorial (build.ts --no-tutorial into .scratch/): core tests, the editor
//     on `bump`, a new cell, a ref made plain and a ref again, export, reopen.
// No request to /@tomlarkworthy/ or api.observablehq.com may be made (a stripped module fetched).
// The notebook file itself is never written.
import { chromium, type Page } from "../../../../node_modules/playwright/index.mjs";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { checkSources } from "../core.ts";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { blockContent, blockSpans } from "../../../lib/notebook-blocks.ts";
import { offlineWithAir, setTheme, contrasts, THEME_BASE } from "./theme-check.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE = "@tomlarkworthy/soundscript";
const TUTORIAL = "@tomlarkworthy/soundscript-tutorial";
const SECTIONS = ["@tomlarkworthy/soundscript-reducer", "@tomlarkworthy/soundscript-model", "@tomlarkworthy/soundscript-workers", "@tomlarkworthy/soundscript-breakout"];
const file = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : join(HERE, "../../../../lopebooks/notebooks/soundscript.html"));
const shot = process.argv.includes("--shot") ? process.argv[process.argv.indexOf("--shot") + 1] : null;
const SCRATCH = join(HERE, ".scratch");
mkdirSync(SCRATCH, { recursive: true });

let passes = 0, fails = 0;
const report = (ok: boolean, what: string) => { console.log(`${ok ? "pass" : "FAIL"} ${what}`); ok ? passes++ : fails++; };

const CORE_TESTS = ["test_ss_roundtrip", "test_ss_example_checks", "test_ss_unchanged_source_checks", "test_ss_wrong_type_is_refused", "test_ss_downstream_break_is_refused", "test_ss_copy_keeps_its_name", "test_ss_failed_apply_changes_nothing", "test_ss_edits_do_not_grow_the_memo", "test_ss_instance_keeps_user_ids", "test_ss_ref_handle", "ss_registration"];
const TUTORIAL_TESTS = ["test_ss_roundtrip", "test_ss_module_checks", "test_ss_counter", "test_half",
  "test_examples_check_as_expected", "test_compile_pool_matches_main", "test_compile_refuses_unchecked", "test_breakout_listener", "test_breakout_memo", "benchmark"];


// --- the page's text against the checker, without a browser
// Every rule id the reference names is produced by an example, a fixture or a probe here, and every rule
// id they produce is named; every construct the reference calls unsupported is reported unsupported.
const RULE_PROBES: Record<string, string> = {
  "untyped-parameter": "export const f = () => (x) => x;",
  "unknown-type": "export const f = () => (x: Foo) => x;",
  "const-assign": "export const f = () => { const a = 1; a = 2; return a; };",
};
const UNSUPPORTED_PROBES: [string, string, boolean?][] = [
  ["switch", "export const f = () => (a: number) => { switch (a) { case 1: return 1; } return 0; };"],
  ["for…in", "export const f = () => (o: { readonly a: number }) => { let n = 0; for (const k in o) n++; return n; };"],
  ["instanceof", "export const f = () => (x: Error) => x instanceof Error;"],
  ["??=", "export const f = () => { let a: number | undefined = undefined; a ??= 1; return a; };"],
  ["&&=", "export const f = () => { let a = true; a &&= false; return a; };"],
  ["||=", "export const f = () => { let a = false; a ||= true; return a; };"],
  ["destructuring assignment", "export const f = () => { let a = 1, b = 2; [a, b] = [b, a]; return a; };"],
  ["tagged template", "export const f = () => { const t = (s: readonly string[]) => s.length; return t`x`; };"],
  ["comma operator", "export const f = () => (1, 2);"],
  ["satisfies", "export const f = () => (1 satisfies number);"],
  ["type inside a body", "export const f = () => { type T = number; return 1; };"],
  ["yield*", "export const f = function* () { yield* [1, 2]; };"],
  ["for await", "export const f = async () => { for await (const x of [1]) { return x; } return 0; };"],
  ["try/finally holding a Mut", "export const f = () => { const a = mut([1]); try { a.push(2); } finally { } return freeze(a); };"],
  ["labelled break holding a Mut", "export const f = () => { const a = mut([1]); outer: for (const x of [1, 2]) { if (x > 1) break outer; a.push(x); } return freeze(a); };"],
  ["Symbol", "export const f = () => Symbol(\"a\");"],
  ["new Promise", "export const f = () => new Promise<number>((r: (n: number) => void) => r(1));"],
  ["Object.assign({}, …)", "export const f = () => Object.assign({}, { a: 1 });"],
  ["JSX spread attribute", "export const f = () => { const p = { id: \"a\" }; return <div {...p} />; };", true],
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
  const probed: string[] = [];
  for (const [rule, src] of Object.entries(RULE_PROBES)) { const r = checkSources({ cells: src }); add(r); if (r.cells[0]?.errors.some((e: any) => e.rule === rule)) probed.push(rule); }
  report(probed.length === Object.keys(RULE_PROBES).length, `reference: each rule probe reports its rule (${probed.join(", ")})`);
  const html = readFileSync(file, "utf8");
  const tut = blockContent(html, TUTORIAL) ?? "";
  const listed = new Set([...tut.matchAll(/\\`\[([a-z][a-z-]*)\]\\`/g)].map((m) => m[1]));
  const missing = [...listed].filter((r) => !produced.has(r)), unlisted = [...produced].filter((r) => !listed.has(r));
  report(listed.size > 40 && !missing.length && !unlisted.length, `reference: ${listed.size} rule ids named, ${produced.size} produced by ${files.length} examples and fixtures plus ${probed.length} probes; named but never produced ${JSON.stringify(missing)}, produced but not named ${JSON.stringify(unlisted)}`);
  const wrong = UNSUPPORTED_PROBES.filter(([, src, tsx]) => checkSources({ cells: src, tsx }).cells[0]?.status !== "unsupported").map(([n]) => n);
  report(!wrong.length, `reference: ${UNSUPPORTED_PROBES.length} constructs the reference calls unsupported are reported unsupported${wrong.length ? "; not: " + wrong.join(", ") : ""}`);
  // shipped prose names nothing a reader of the notebook cannot open, and no cell by position
  const BANNED = [/\btools\//, /\bplan\//, /\blite\//, /\bfixtures\//, /RULES\.md/, /README\.md/, /NOTES-/, /\bbun /, /\bbelow\b/i, /\babove\b/i];
  for (const m of [CORE, TUTORIAL, ...SECTIONS]) {
    const mds = [...(blockContent(html, m) ?? "").matchAll(/\bmd`((?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*)`/g)].map((x) => x[1]);
    const hits = mds.flatMap((t) => BANNED.filter((b) => b.test(t)).map((b) => `${b.source}: ${t.slice(Math.max(0, t.search(b) - 40), t.search(b) + 30).replace(/\s+/g, " ")}`));
    report(mds.length > 0 && !hits.length, `prose: ${m}: ${mds.length} md cells, no repository path and no "below"/"above"${hits.length ? "; found " + hits.join(" | ") : ""}`);
  }
}

const browser = await chromium.launch();
try {
async function open(path: string, saveTo?: string) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  if (saveTo) await stubPicker(page, saveTo);
  const blocked: string[] = [], errors: string[] = [];
  await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : (blocked.push(r.request().url()), r.abort())));
  page.on("pageerror", (e) => errors.push(String(e.message)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) { console.log(`  console.error: ${m.text().slice(0, 400)}`); errors.push("console.error: " + m.text().slice(0, 200)); } });
  await page.goto(`file://${path}`);
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) console.log(`  navigated: ${f.url().slice(0, 200)}`); });
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

async function testsPass(page: Page, label: string, name: string, tests: string[], expectErrors: string[] = []) {
  let vars = null as Awaited<ReturnType<typeof read>>;
  for (let i = 0; i < 120; i++) {
    vars = await read(page, name);
    if (vars && tests.every((t) => vars![t] && vars![t].state !== "pending")) break;
    await page.waitForTimeout(500);
  }
  if (!vars) { report(false, `${label}: ${name} never booted`); return; }
  const errorCells = Object.entries(vars).filter(([n, v]) => v.state === "error" && !expectErrors.includes(n));
  report(errorCells.length === 0, `${label}: ${name}: ${Object.keys(vars).length} variables, ${errorCells.length} in error${errorCells.map(([n, v]) => `\n    ${n}: ${v.value}`).join("")}`);
  for (const t of tests) report(vars[t]?.state === "ok", `${label}: ${name}#${t}: ${(vars[t]?.value ?? vars[t]?.state ?? "missing").slice(0, 200)}`);
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
async function testsOn(page: Page, label: string, boot = true) {
  const t0 = Date.now();
  await page.waitForFunction(() => document.querySelectorAll("label").length > 0 && [...document.querySelectorAll("label")].some((l) => /run the tests/.test(l.textContent ?? "")), null, { timeout: 60000 });
  if (boot) {
    // the core and tutorial must have computed their example cells before "nothing ran" means anything
    await page.waitForFunction(() => { const rt = (window as any).__ojs_runtime; const m = rt?.mains?.get("@tomlarkworthy/soundscript"); return m && m._scope.get("doubled")?._value !== undefined; }, null, { timeout: 60000 });
    const idle = await page.evaluate(() => {
      const rt = (window as any).__ojs_runtime;
      const st: Record<string, string> = {};
      for (const v of rt._variables) if (typeof v._name === "string" && /^test_(ss_|breakout|compile|examples)/.test(v._name) && v._module && [...rt.mains.values()].includes(v._module))
        st[v._name] = v._value !== undefined ? "ran" : "pending";
      const ss = [...rt._variables].find((v: any) => v._name === "ss" && v._value?.running)?._value;
      const bm = rt.mains.get("@tomlarkworthy/soundscript-breakout");
      const ball = bm?._scope.get("ballView");
      return { ran: Object.entries(st).filter(([, x]) => x !== "pending").map(([n]) => n), pending: Object.keys(st).length, running: ss?.running(), pulling: ss?.pulling(), ballRuns: ball ? ss?.evals(ball._definition) : null };
    });
    report(idle.ran.length === 0 && idle.pulling === 0 && (idle.ballRuns ?? 0) <= 1, `${label}: at boot ${idle.pending} test cells are pending and none ran (${JSON.stringify(idle.ran)}); listeners attached ${idle.running}, clocks pulled ${idle.pulling}; the page's ballView ran ${idle.ballRuns} times`);
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

// --- speed, measured against budgets (headless Chromium on this machine; the numbers are printed)
const BUDGET = { firstRenderMs: 1500, firstCheckMs: 1500, keystrokeCheckMs: 50, breakoutFps: 58, typingLongTasks: 0 };
async function speed() {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
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
      if (!w.__marks.firstCheck && document.querySelector("tr.lite-ok, .lite-card.lite-ok, .lite-summary")) mark("firstCheck");
    }).observe(document, { subtree: true, childList: true });
  });
  await page.goto(`file://${file}`);
  await page.waitForFunction(() => (window as any).__marks.firstRender && (window as any).__marks.firstCheck, null, { timeout: 60000 }).catch(() => {});
  const marks = await page.evaluate(() => (window as any).__marks);
  report(marks.firstRender < BUDGET.firstRenderMs, `speed: load to the tutorial's title rendered ${marks.firstRender?.toFixed(0)} ms (budget ${BUDGET.firstRenderMs})`);
  report(marks.firstCheck < BUDGET.firstCheckMs, `speed: load to the first checker verdict on the page ${marks.firstCheck?.toFixed(0)} ms (budget ${BUDGET.firstCheckMs})`);
  await page.waitForFunction(() => { const rt = (window as any).__ojs_runtime; const m = rt?.mains?.get("@tomlarkworthy/soundscript"); return m?._scope.get("ss_language")?._value; }, null, { timeout: 60000 });
  // what the editor's lint runs for one keystroke: check the edited cell against the whole tutorial module
  const ks = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript"), tut = rt.mains.get("@tomlarkworthy/soundscript-tutorial");
    const lang = core._scope.get("ss_language")._value;
    const v = tut._scope.get("width");
    const src = await lang.decompile([v]);
    const t: number[] = [];
    for (let i = 0; i < 30; i++) { const a = performance.now(); lang.check(src.replace(/\d+/, String(600 + i)), [v]); t.push(performance.now() - a); }
    t.sort((x, y) => x - y);
    const cells = core._scope.get("ss_moduleCells")._value(tut).length;
    return { cells, median: t[15], max: t[29] };
  });
  report(ks.max < BUDGET.keystrokeCheckMs, `speed: one keystroke's check of width against the ${ks.cells}-cell tutorial module: median ${ks.median.toFixed(1)} ms, max ${ks.max.toFixed(1)} ms of 30 (budget ${BUDGET.keystrokeCheckMs} for the max)`);
  // the Mandelbrot timing the tutorial shows (its benchmark cell, measured during boot); Breakout is timed after it, so the two do not share the main thread
  await page.waitForFunction(() => (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-tutorial")._scope.get("benchmark")?._value, null, { timeout: 60000 }).catch(() => {});
  const b = JSON.parse((await read(page, TUTORIAL))?.benchmark?.value ?? "null");
  report(!!b && b.same && b.poolMs < b.mainMs, `speed: Mandelbrot ${b ? `main thread ${b.mainMs.toFixed(1)} ms, pool of ${b.poolSize} ${b.poolMs.toFixed(1)} ms, same bytes ${b.same}` : "no benchmark"} (budget: the pool is faster)`);
  // Breakout on the page: a real click on play, then count world changes per second for 2 s
  const play = page.getByRole("button", { name: "play", exact: true }).first();
  await play.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => { const bm = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-breakout"); (window as any).__w = bm._scope.get("world")._value; return true; });
  await play.click();
  const fps = await page.evaluate(async () => {
    const bm = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript-breakout");
    let changes = 0, frames = 0, last = bm._scope.get("world")._value;
    const t0 = performance.now();
    await new Promise<void>((res) => { const f = () => { frames++; const w = bm._scope.get("world")._value; if (w !== last) { changes++; last = w; } if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    return { changesPerS: changes / 2, framesPerS: frames / 2 };
  });
  await page.getByRole("button", { name: "pause", exact: true }).first().click();
  report(before && fps.changesPerS >= BUDGET.breakoutFps, `speed: Breakout after a click on play: ${fps.changesPerS} world changes/s in ${fps.framesPerS} animation frames/s (budget ${BUDGET.breakoutFps})`);
  // typing in a cell editor with the tutorial open: no task over 50 ms while 30 keys go in
  const ed = await openEditor(page, TUTORIAL, "half");
  if (!ed) report(false, "speed: no editor for half");
  else {
    await ed.locator(".cm-content").first().click();
    await page.keyboard.press("End");
    const t0 = await page.evaluate(() => performance.now());
    await page.keyboard.type(" + 0".repeat(8), { delay: 40 });
    await page.waitForTimeout(1200); // the lint runs after the editor's pause
    const lt = await page.evaluate((t0) => (window as any).__longtasks.filter((e: any) => e.at >= t0), t0);
    report(lt.length <= BUDGET.typingLongTasks, `speed: typing 32 keys into half's editor (40 ms apart) with the tutorial open: ${lt.length} tasks over 50 ms${lt.length ? " " + JSON.stringify(lt.map((e: any) => Math.round(e.ms))) : ""} (budget ${BUDGET.typingLongTasks})`);
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
}

// The editor on one cell: typed source shown, an unchanged Shift-Enter save, then a typed `from` -> `to`
// edit that must show a diagnostic naming `rule` and be refused.
async function editorOn(page: Page, label: string, module: string, cell: string, from: string, to: string, rule: string) {
  const ed = await page.evaluate(async ([module, cell, from, to]) => {
    const rt = (window as any).__ojs_runtime;
    const find = (name: string, mod?: any) => [...rt._variables].find((v: any) => v._name === name && (!mod || v._module === mod));
    const mod = rt.mains.get(module);
    const inc = find(cell, mod);
    const editors = find("editors")?._value, EditorView = find("EditorView")?._value, ss = find("ss", rt.mains.get("@tomlarkworthy/soundscript"))._value;
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
      await new Promise((r) => setTimeout(r, 1000));
      out.refused = [inc._definition === fn1 && String(inc._definition) === text0, view.state.doc.toString().includes(to)];
      (window as any).__restore = () => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: want } });
    } catch (e) {
      out.error = String((e as Error)?.message ?? e);
    }
    return out;
  }, [module, cell, from, to]);
  if (ed.error) report(false, `${label}: editor on ${cell}: ${ed.error}`);
  if (shot) {
    await page.locator(".cm-editor").first().scrollIntoViewIfNeeded().catch(() => {});
    await page.locator(".cm-lintRange-error").first().hover().catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: shot });
  }
  await page.evaluate(() => (window as any).__restore?.());
  report(ed.showsTyped === true, `${label}: ${cell} opens as typed SoundScript source: ${JSON.stringify(ed.shown)}`);
  report(Array.isArray(ed.unchanged) && ed.unchanged.every(Boolean), `${label}: unchanged save redefines ${cell} with the same text and pid, one variable (${ed.unchanged})`);
  report(Array.isArray(ed.diagnostics) && ed.diagnostics.some((d: string) => d.includes(`[${rule}]`)), `${label}: ${to} shows a diagnostic: ${JSON.stringify(ed.diagnostics)}`);
  report(Array.isArray(ed.refused) && ed.refused.every(Boolean), `${label}: the refused save keeps ${cell}'s definition and the typed text (${ed.refused})`);
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
  const name = /export const (\w+)/.exec(source)![1];
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
// the tutorial's bundle-size row is a constant build.ts writes; it must be the bundle the file embeds
{
  const html = readFileSync(file, "utf8");
  const gz = Buffer.from((blockContent(html, "@tomlarkworthy/soundscript/ss.js.gz") ?? "").replace(/\s+/g, ""), "base64");
  const raw = gz.length ? Bun.gunzipSync(gz).length : 0;
  const m = /raw: (\d+), gz: (\d+)/.exec(blockContent(html, TUTORIAL) ?? "");
  report(!!m && +m[1] === raw && +m[2] === gz.length, `ss_bytes: the size row (${m?.[1]} raw, ${m?.[2]} gz) is the embedded ss.js.gz (${raw} raw, ${gz.length} gz)`);
}
function sameBlocks(label: string, a: string, b: string) {
  const A = ids(a), B = ids(b);
  const gone = [...A].filter((x) => !B.has(x)), added = [...B].filter((x) => !A.has(x));
  report(gone.length === 0 && added.length === 0, `${label}: the export has the built file's ${A.size} block ids${gone.length ? "; dropped " + gone.join(", ") : ""}${added.length ? "; added " + added.join(", ") : ""}`);
}


// --- real user paths: Playwright mouse and keyboard on the editor and the lopepage menu
const SECTION_TESTS: Record<string, string[]> = { "@tomlarkworthy/soundscript-reducer": ["test_undo"], "@tomlarkworthy/soundscript-model": ["areaOf4"], "@tomlarkworthy/soundscript-workers": ["image"], "@tomlarkworthy/soundscript-breakout": ["test_replay"] };
const MOD = process.platform === "darwin" ? "Meta" : "Control";
let tagN = 0;
// tags the editor host of a cell's variable so a locator can reach it; null when the cell has none in view
const tagEditor = (page: Page, module: string, cell: string) => page.evaluate(async ([module, cell, tag]) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get(module);
  const v = [...rt._variables].find((v: any) => v._module === mod && v._name === cell);
  const editors = [...rt._variables].find((v: any) => v._name === "editors")?._value;
  for (let i = 0; i < 150; i++) {
    const host = editors?.get(v);
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
const valueOf = (page: Page, module: string, cell: string) => page.evaluate(async ([module, cell]) => {
  const rt = (window as any).__ojs_runtime;
  try { return await rt.mains.get(module).value(cell); } catch (e) { return "THREW " + String((e as Error)?.message ?? e); }
}, [module, cell]);
async function openEditor(page: Page, module: string, cell: string) {
  const tag = await tagEditor(page, module, cell);
  if (!tag) return null;
  const host = page.locator(`[data-verify="${tag}"]`);
  await host.locator(".hotbar").first().click();
  await host.locator(".cm-editor").first().waitFor({ timeout: 10000 });
  await page.waitForFunction((t) => (document.querySelector(`[data-verify="${t}"] .cm-content`)?.textContent ?? "").trim().length > 0, tag, { timeout: 10000 });
  return host;
}
const editorText = (host: any) => host.locator(".cm-content").first().evaluate((el: any) => (window as any).__ojs_runtime && [...(window as any).__ojs_runtime._variables].find((v: any) => v._name === "EditorView")._value.findFromDOM(el.closest(".cm-editor")).state.doc.toString());
async function typeInto(page: Page, host: any, text: string) {
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
    const why = await content.evaluate((el: Element) => ({ connected: el.isConnected, active: `${document.activeElement?.tagName}.${String((document.activeElement as HTMLElement)?.className).slice(0, 60)}`, log: ((window as any).__focusLog ?? []).slice(-8) })).catch((e: Error) => ({ detached: String(e.message).slice(0, 120) }));
    throw new Error(`the editor did not take focus after 20 clicks: ${JSON.stringify(why)}`);
  }
  await page.keyboard.press(`${MOD}+KeyA`);
  await page.keyboard.insertText(text);
  await page.keyboard.press("Shift+Enter");
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
    await page.locator(".cm-tooltip-autocomplete li").first().waitFor({ timeout: 5000 }).catch(() => {});
    // CodeMirror ignores Enter and Tab for 75 ms after the list opens (interactionDelay)
    await page.waitForTimeout(250);
    return popup();
  };
  // An open editor's panel can be rebuilt a few hundred ms after it opens (seen while the page's tests
  // define and delete variables); the rebuild blurs the editor and closes an open list. The editor
  // gets focus back (editor_panel), so the typing is done again once, and the retry is counted.
  let retries = 0;
  const typeAndList = async (host: any, text: string, key: string) => {
    for (let i = 0; i < 2; i++) {
      await place(host, text);
      await page.keyboard.type(key);
      const list = await waitPopup();
      if (list.length || i === 1) return list;
      retries++;
    }
    return [];
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
  const head = original.slice(0, original.indexOf("export const increment"));
  // the editor's header names the cell's own inputs and outputs, not ss or unnamed observers
  const header = await inc.evaluate((el: Element) => [...el.querySelectorAll("span")].map((s) => s.textContent ?? "").filter((t) => /^(inputs|outputs):/.test(t.trim())).map((t) => t.trim()));
  report(header.some((t) => /^inputs: .*\bcount\b/.test(t)) && !header.some((t) => /\banon\b|\bss\b|invalidation/.test(t)), `completion: increment's editor header lists its own inputs, no anon or ss: ${JSON.stringify(header)}`);
  const refList = await typeAndList(inc, head + "export const increment = (count: Ref<number>) => action(() => count|)", ".");
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
  report(accepted === head + "export const increment = (count: Ref<number>) => action(() => count.set)", `completion: Enter takes set: ${JSON.stringify(accepted.slice(head.length))}${accepted.endsWith("count.set)") ? "" : ` (completion ${atEnter}) ${JSON.stringify(log)}`}`);
  const upd = await typeAndList(inc, head + "export const increment = (count: Ref<number>) => action(() => count.up|)", "d");
  const atTab = await status();
  const logTab = upd.length ? "" : JSON.stringify(await page.evaluate(() => (window as any).__focusLog2.slice(-6)));
  await page.keyboard.press("Tab");
  const tabbed = await editorText(inc);
  report(JSON.stringify(upd) === '["update"]' && tabbed.endsWith("count.update)"), `completion: count.upd then Tab gives update: ${JSON.stringify(upd)} ${JSON.stringify(tabbed.slice(head.length))} (completion ${atTab}) ${logTab}`);
  await place(inc, original);
  await page.keyboard.press("Escape");

  // a value parameter of the ref cell: number members. app takes count: number
  const app = await openEditor(page, TUTORIAL, "app");
  if (app) {
    const o = await editorText(app);
    const h = o.slice(0, o.indexOf("export const app"));
    const nums = await typeAndList(app, h + "export const app = (count: number) => count|;", ".");
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

  console.log(`  completion: ${retries} list(s) typed again after an editor panel rebuild`);
  // every member a SoundScript cell of the tutorial or core uses is offered at its place, and the
  // completion stays within budget
  const all = await page.evaluate(([tut, core]) => {
    const rt = (window as any).__ojs_runtime;
    const find = (n: string, m?: any) => [...rt._variables].find((v: any) => v._name === n && (!m || v._module === m));
    const lang = find("ss_language")._value, cellsOf = find("ss_moduleCells")._value;
    const missed: string[] = [], times: number[] = [];
    let n = 0;
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
    const inc = find("increment", rt.mains.get(tut));
    const src = cellsOf(rt.mains.get(tut)).find((c: any) => c.key === "increment").text;
    const at = src.indexOf("count.update") + 6;
    const own: number[] = [];
    for (let i = 0; i < 30; i++) { const t0 = performance.now(); lang.complete(src, at, [inc]); own.push(performance.now() - t0); }
    own.sort((a, b) => a - b);
    return { n, missed, median: own[15], max: own[29], cells: cellsOf(rt.mains.get(tut)).length };
  }, [TUTORIAL, CORE]);
  report(all.n > 20 && all.missed.length === 0, `completion: at each of ${all.n} member reads in the SoundScript cells of the core, tutorial and section modules the member read is offered${all.missed.length ? ": missed " + all.missed.slice(0, 8).join("; ") : ""}`);
  report(all.max < 30, `speed: one completion of count. in the ${all.cells}-cell tutorial module: median ${all.median.toFixed(1)} ms, max ${all.max.toFixed(1)} ms of 30 (budget 30 for the max)`);
}
async function uiPaths(page: Page, saved: string) {
  const tab = (m: string) => page.locator(`[title="${m}  (drag to a pane edge to dock, or out to save as .js)"]`).first().click();
  await tab(CORE);
  await page.waitForTimeout(1000);
  // ref as one cell: one rendered node for tally and viewof tally, and its editor shows the ref source
  const nodes = await page.evaluate(() => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
    return [...document.querySelectorAll(".observablehq")].filter((n: any) => n.variable?._module === core && ["tally", "viewof tally"].includes(n.variable?._name)).map((n: any) => n.variable._name);
  });
  report(nodes.length === 1 && nodes[0] === "tally", `ui: the ref cell tally renders as one cell (${JSON.stringify(nodes)})`);
  const tally = await openEditor(page, CORE, "tally");
  const tallyText = tally ? await editorText(tally) : null;
  report(!!tallyText && tallyText.includes("export const tally = (): RefCell<number> => ref(0);"), `ui: clicking tally's hotbar opens its ref source: ${JSON.stringify(tallyText)}`);

  await tab(TUTORIAL);
  // keyboard edit that is refused, then one that is applied
  const w0 = await defOf(page, TUTORIAL, "width");
  const width = await openEditor(page, TUTORIAL, "width");
  if (!width) { report(false, "ui: no editor for width"); return; }
  await typeInto(page, width, 'export const width = () => "640";');
  // CodeMirror draws only the lines in view, so the editor is brought into view before its marks are read
  await width.scrollIntoViewIfNeeded();
  await width.locator(".cm-lintRange-error").first().waitFor({ state: "attached", timeout: 10000 }).catch(() => {});
  const diag = await width.locator(".cm-lintRange-error").count();
  const typed = await editorText(width);
  report((await defOf(page, TUTORIAL, "width")) === w0 && diag > 0, `ui: a typed width = "640" plus Shift-Enter is refused with a diagnostic (${diag} marks), width unchanged${diag ? "" : `; editor holds ${JSON.stringify(typed)}`}`);
  await typeInto(page, width, "export const width = () => 600;");
  await page.waitForFunction(async () => true);
  for (let i = 0; i < 50 && (await valueOf(page, TUTORIAL, "width")) !== 600; i++) await page.waitForTimeout(100);
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
  await page.keyboard.insertText("export const quadrupled = (width: string) => width;");
  await until(page, async () => (await diagsOf(fresh)).length > 0);
  const typedDiags = await diagsOf(fresh);
  report(typedDiags.some((d: string) => d.includes("[inject-type]")), `ui: a new cell typed as SoundScript is linted by its checker before it is applied: ${JSON.stringify(typedDiags)}`);
  const NEW = "export const quadrupled = (width: number) => width * 4;";
  await typeInto(page, fresh, NEW);
  for (let i = 0; i < 50 && (await valueOf(page, TUTORIAL, "quadrupled")) !== 2400; i++) await page.waitForTimeout(100);
  const q = await page.evaluate(() => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get("@tomlarkworthy/soundscript-tutorial");
    const order = [...rt._variables].filter((v: any) => v._module === mod);
    const names = order.map((v: any) => v._name);
    return { after: names[names.indexOf("quadrupled") - 1], index: names.indexOf("quadrupled"), empties: order.filter((v: any) => String(v._definition).replace(/\s/g, "").includes("{return({})}") || String(v._definition).trim() === "{}").length };
  });
  report((await valueOf(page, TUTORIAL, "quadrupled")) === 2400 && q.after === "half" && q.empties === 0, `ui: a cell added with the add button and typed as SoundScript is applied: quadrupled ${await valueOf(page, TUTORIAL, "quadrupled")}, placed after ${q.after}, ${q.empties} empty cells left`);

  // a section module opened from its link under the tutorial's table, then edited by keyboard
  await page.locator("a", { hasText: "@tomlarkworthy/soundscript-breakout" }).first().click();
  const BR = "@tomlarkworthy/soundscript-breakout";
  await page.locator(`[title="${BR}  (drag to a pane edge to dock, or out to save as .js)"]`).first().waitFor({ timeout: 10000 }).catch(() => {});
  const pv = await openEditor(page, BR, "paddleView");
  if (!pv) report(false, "ui: the breakout link opened no editable paddleView");
  else {
    const src = await editorText(pv);
    await typeInto(page, pv, src.replace('"#ddd"', '"#eee"'));
    for (let i = 0; i < 50 && !String(await defOf(page, BR, "paddleView")).includes("#eee"); i++) await page.waitForTimeout(100);
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
  for (let i = 0; i < 100 && !existsSync(saved); i++) await page.waitForTimeout(200);
  report(existsSync(saved) && readFileSync(saved, "utf8").length > 1e6, `ui: the menu's Save in place wrote ${existsSync(saved) ? readFileSync(saved, "utf8").length : 0} bytes`);
}
async function afterReload(page: Page) {
  const w = await valueOf(page, TUTORIAL, "width"), q = await valueOf(page, TUTORIAL, "quadrupled");
  const text = await page.evaluate(() => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get("@tomlarkworthy/soundscript-tutorial");
    const ss = [...rt._variables].find((v: any) => v._name === "ss" && v._module === rt.mains.get("@tomlarkworthy/soundscript"))._value;
    const v = [...rt._variables].find((v: any) => v._module === mod && v._name === "quadrupled");
    return v ? ss.decompileVariable(String(v._definition)) : null;
  });
  report(w === 600 && q === 2400 && text === "export const quadrupled = (width: number) => width * 4;", `reload after save: width ${w}, quadrupled ${q}, as typed source ${JSON.stringify(text)}`);
}
// deleting the listener cell stops delivery (the runtime does not resolve its invalidation)
async function deleteStops(page: Page) {
  const r = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get("@tomlarkworthy/soundscript-breakout");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === mod && v._name === n);
    const ss = [...rt._variables].find((v: any) => v._name === "ss" && v._module === rt.mains.get("@tomlarkworthy/soundscript"))._value;
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const r0 = ss.running(), p0 = ss.pulling();
    get("toggle")._value();
    await wait(400);
    const playing = ss.pulling() - p0;
    get("onTick").delete();
    await wait(600);
    const w1 = get("world")._value;
    await wait(300);
    return { playing, after: ss.pulling() - p0, listeners: ss.running() - r0, still: get("world")._value === w1 };
  });
  report(r.playing === 1 && r.after === 0 && r.listeners === -1 && r.still, `deleting onTick while playing stops the clock: clocks pulled +${r.playing} -> +${r.after}, listeners ${r.listeners}, world unchanged ${r.still}`);
}
// disposing a copy of the game (ss_instance's invalidation) while it plays stops its clock and its listener
async function instanceStops(page: Page) {
  const r = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript"), bm = rt.mains.get("@tomlarkworthy/soundscript-breakout");
    const ss = core._scope.get("ss")._value, ss_instance = await core.value("ss_instance");
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
    let done!: () => void;
    const r0 = ss.running(), p0 = ss.pulling();
    const inst = await ss_instance(bm, new Promise<void>((res) => (done = res)));
    for (const n of ["toggle", "world", "onTick"]) await inst.value(n);
    const w0 = inst._scope.get("world")._value;
    inst._scope.get("toggle")._value();
    await wait(400);
    const playing = { listeners: ss.running() - r0, pulled: ss.pulling() - p0, moved: inst._scope.get("world")._value.ball.y !== w0.ball.y };
    done();
    await wait(300);
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
    const lang = get("ss_language")._value, ss = get("ss")._value;
    const frames = (n: number) => new Promise<void>((res) => { let i = 0; const f = () => (++i >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const until = async (f: () => boolean, n = 600) => { for (let i = 0; i < n && !f(); i++) await new Promise((r) => requestAnimationFrame(r)); return f(); };
    const add = (text: string) => lang.apply(text, [], { module: { module: core }, variables: [get("tripled")] });
    const applied: string[] = [];
    const edit = async (text: string, name: string) => { const r = await lang.apply(text, [get(name)]); applied.push(`${name} ${r ? "applied" : "refused"}`); return r; };
    const N = 120;
    const cells = [
      "type Seen = { readonly count: number; readonly last: number; readonly gaps: number };",
      "export const seen = (): RefCell<Seen> => ref<Seen>({ count: 0, last: 0, gaps: 0 });",
      "export const go = (): RefCell<boolean> => ref(true);",
      `export const nums = function* (go: boolean) {\n  if (!go) return;\n  for (let i = 1; i <= ${N}; i++) yield i;\n};`,
      "export const weight = () => (v: number) => v;",
      "export const record = (seen: Ref<Seen>, weight: (v: number) => number) =>\n  action((v: number) => {\n    seen.update((s) => ({ count: s.count + 1, last: v, gaps: s.gaps + (weight(v) === s.last + 1 ? 0 : 1) }));\n    if (v % 10 === 0 && v > 1000) throw new Error(`no ${v}`);\n  });",
      "export const onNum = (nums: Events<number>, record: Action<[number]>) => on(nums, record);",
      "export const flip = (go: Ref<boolean>) => action(() => go.update((g) => !g));",
    ];
    const out: any = {};
    const r0 = ss.running(), p0 = ss.pulling();
    for (const c of cells) if (!(await add(c))) return { refused: c };
    const seen = () => get("seen")._value;
    const runs = (n: string) => ss.evals(get(n)._definition);
    await until(() => seen()?.count >= 30);
    out.listenersAt30 = ss.running() - r0;
    // the action's dependency is edited twice while values arrive
    await edit("export const weight = () => (v: number) => v * 1;", "weight");
    await until(() => seen().count >= 60);
    await edit("export const weight = () => (v: number) => 1 * v;", "weight");
    // the listener cell itself runs again
    await edit("export const onNum = (nums: Events<number>, record: Action<[number]>) => /* again */ on(nums, record);", "onNum");
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
    await edit("export const record = (seen: Ref<Seen>, weight: (v: number) => number) =>\n  action((v: number) => {\n    seen.update((s) => ({ count: s.count + 1, last: v, gaps: s.gaps + (weight(v) === s.last + 1 ? 0 : 1) }));\n    if (v % 10 === 0) throw new Error(`no ${v}`);\n  });", "record");
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
    for (const n of ["record", "flip", "weight", "nums", "seen", "go", "type Seen"]) get(n)?.delete();
    await until(() => !get("seen") && !get("nums"));
    get("reset")._value();
    return out;
  });
  const thrown = C.errors.filter((e) => /listener onNum: action record threw on a value of events nums/.test(e));
  for (const e of thrown) C.errors.splice(C.errors.indexOf(e), 1);
  report(r.applied?.length === 4 && r.applied.every((x: string) => x.endsWith("applied")) && r.listenersAt30 === 1 && r.listenersAfterRerun === 1 && r.stream?.count === 120 && r.stream.gaps === 0,
    `exactly once: 120 yields gave ${r.stream?.count} actions with ${r.stream?.gaps} gaps, across two edits of the action's dependency and a re-run of the listener; listeners ${r.listenersAt30}, after the re-run ${r.listenersAfterRerun}; edits ${JSON.stringify(r.applied)}${r.refused ? `; refused ${r.refused}` : ""}`);
  report(r.stopped && r.restart?.count === 120 && r.restart.gaps === 1 && r.restart.onNumRuns === 0 && r.restart.numsRuns === 2 && r.restart.sameHandle,
    `exactly once: the events cell stopped and restarted without the listener running again: ${JSON.stringify({ stopped: r.stopped, ...r.restart })}`);
  report(r.throwing?.committed === 108 && r.throwing.last === 119 && thrown.length === 12,
    `exactly once: an action throwing on every tenth of 120 values: ${r.throwing?.committed} committed, last ${r.throwing?.last}; ${thrown.length} console errors naming onNum, record and nums`);
  report(r.deleted?.pulledBefore === 1 && r.deleted.pulledAfter === 0 && r.deleted.listeners === 0 && r.deleted.count === 0,
    `exactly once: deleting the listener stops delivery: ${JSON.stringify(r.deleted)}`);
}
// The editor's lint messages for the cell open in `host`
const diagsOf = (host: any) => host.locator(".cm-content").first().evaluate((el: any) => {
  const rt = (window as any).__ojs_runtime;
  const find = (n: string) => [...rt._variables].find((v: any) => v._name === n)?._value;
  const view = find("EditorView").findFromDOM(el.closest(".cm-editor"));
  const ds: string[] = [];
  find("codemirror").forEachDiagnostic?.(view.state, (d: any) => ds.push(d.message));
  return ds;
});
const until = async (page: Page, f: () => Promise<boolean>, ms = 10000) => { const t0 = Date.now(); while (!(await f())) { if (Date.now() - t0 > ms) return false; await page.waitForTimeout(100); } return true; };
// the text of the table row for `cell` in the first table (in DOM order) matching `sel` that has one
const rowText = (page: Page, sel: string, cell: string) => page.evaluate(([sel, cell]) => {
  // a tutorial cell shown as a card: its name, then the card's check, type and value, then its messages
  const card = sel === ".lite-panel" ? document.querySelector(`.lite-card[data-cell="${cell}"]`) : null;
  if (card) return [`${cell} ${card.querySelector(".lite-card-meta")!.textContent!.trim()}`, ...[...card.querySelectorAll(".lite-card-msgs .lite-err")].map((e) => e.textContent!.trim())].join(" | ");
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
  const ss = mod._scope.get("ss")._value;
  const out: Record<string, number> = {};
  for (const v of rt._variables) if (v._module === mod && typeof v._name === "string" && String(v._definition).includes("$ss$.cell(")) out[v._name] = ss.evals(v._definition);
  return out;
}, module);

// Every "Try it" cell of the tutorial, done as the text says, on a page of its own (the leak fix
// changes a verdict the tests pin). Each check states what the text promises.
async function tryIts(page: Page) {
  const tab = (m: string) => page.locator(`[title="${m}  (drag to a pane edge to dock, or out to save as .js)"]`).first().click();
  await page.waitForFunction(() => { const m = (window as any).__ojs_runtime?.mains?.get("@tomlarkworthy/soundscript-tutorial"); return m?._scope.get("benchmark")?._value && document.querySelector(".lite-lesson"); }, null, { timeout: 60000 });
  // A first cell: width -> 800 is applied, then "800" is refused naming area and aspect; the editor keeps focus and the typed text
  const width = await openEditor(page, TUTORIAL, "width");
  if (!width) { report(false, "try: no editor for width"); return; }
  await typeInto(page, width, "export const width = () => 800;");
  await until(page, async () => (await valueOf(page, TUTORIAL, "area")) === 320000);
  const after800 = { area: await valueOf(page, TUTORIAL, "area"), aspect: await valueOf(page, TUTORIAL, "aspect"), half: await valueOf(page, TUTORIAL, "half"), test_half: await valueOf(page, TUTORIAL, "test_half") };
  report(after800.area === 320000 && after800.aspect === "2.00" && after800.half === 160000, `try (first cell): width 800 updates area, aspect, half: ${JSON.stringify(after800)}`);
  await until(page, async () => /\(\) => 800;/.test(await page.evaluate(() => document.querySelector('.lite-card[data-cell="width"] .lite-code')?.textContent ?? "")));
  const card800 = await page.evaluate(() => document.querySelector('.lite-card[data-cell="width"]')?.textContent ?? "");
  report(/export const width = \(\) => 800;/.test(card800) && /ok\s*number\s*800$/.test(card800), `try (first cell): after the edit width's card shows the new source and value: ${JSON.stringify(card800.slice(0, 160))}`);
  const w800 = await defOf(page, TUTORIAL, "width");
  await typeInto(page, width, 'export const width = () => "800";');
  await width.scrollIntoViewIfNeeded();
  await until(page, async () => (await diagsOf(width)).length > 0);
  const ds = await diagsOf(width);
  const kept = await width.locator(".cm-content").first().evaluate((el: Element) => el.contains(document.activeElement));
  report(kept && (await editorText(width)) === 'export const width = () => "800";', `try (first cell): after the refused edit the editor still has focus (${kept}) and the typed text`);
  report((await defOf(page, TUTORIAL, "width")) === w800 && (await valueOf(page, TUTORIAL, "width")) === 800 && ds.some((d: string) => d.startsWith("Refused: `area` would stop checking. [inject-type]")) && ds.some((d: string) => d.startsWith("Refused: `aspect` would stop checking. [type]")) && !ds.some((d: string) => /\bhalf\b/.test(d)),
    `try (first cell): width "800" is refused naming area and aspect, width keeps 800: ${JSON.stringify(ds)}`);
  await typeInto(page, width, "export const width = () => 640;");
  await until(page, async () => (await valueOf(page, TUTORIAL, "width")) === 640);

  // section 2: label: string in doubled, in the box
  const box = page.locator(".lite-box textarea").first();
  const before = await rowText(page, ".lite-lesson table", "doubled");
  const src = await box.inputValue();
  await box.fill(src.replace("(label: number) => label * 2", "(label: string) => label * 2"));
  await until(page, async () => (await rowText(page, ".lite-lesson table", "doubled")) !== before);
  const after = await rowText(page, ".lite-lesson table", "doubled");
  report(/\[inject-type\]/.test(before ?? "") && /\[type\]/.test(after ?? "") && /label \* 2/.test(after ?? "") && !/inject-type/.test(after ?? ""), `try (section 2): doubled with label: string: before ${JSON.stringify(before)}; after ${JSON.stringify(after)}`);
  await box.fill(src);

  // section 3: leak returns freeze(xs)
  const leak = await openEditor(page, TUTORIAL, "leak");
  if (leak) {
    const t = await editorText(leak);
    await typeInto(page, leak, t.replace("return xs;", "return freeze(xs);"));
    await until(page, async () => /\bok\b/.test((await rowText(page, ".lite-panel", "leak")) ?? ""));
    const row = await rowText(page, ".lite-panel", "leak");
    report(/^leak\s*ok/.test(row ?? "") && String(await defOf(page, TUTORIAL, "leak")).includes("freeze(xs)"), `try (section 3): leak with return freeze(xs) is applied and its row reads ok: ${JSON.stringify(row)}`);
  } else report(false, "try: no editor for leak");

  // section 4: add one, then onClick={count} in app is refused
  const c0 = await valueOf(page, TUTORIAL, "count");
  await counterLesson(page).getByRole("button", { name: "add one" }).click();
  await until(page, async () => (await valueOf(page, TUTORIAL, "count")) === c0 + 1);
  const app = await openEditor(page, TUTORIAL, "app");
  if (app) {
    const a0 = await defOf(page, TUTORIAL, "app");
    const t = await editorText(app);
    await typeInto(page, app, t.replace("onClick={increment}", "onClick={count}"));
    await app.scrollIntoViewIfNeeded();
    await until(page, async () => (await diagsOf(app)).length > 0);
    const d = await diagsOf(app);
    report((await valueOf(page, TUTORIAL, "count")) === c0 + 1 && (await defOf(page, TUTORIAL, "app")) === a0 && d.length > 0, `try (section 4): add one counts ${c0} -> ${await valueOf(page, TUTORIAL, "count")}; onClick={count} is refused: ${JSON.stringify(d)}`);
    await typeInto(page, app, t);
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
  await until(page, async () => (await runsOf(page, MD)).doubled > r0.doubled);
  await page.waitForTimeout(300);
  const r1 = await runsOf(page, MD);
  const delta = Object.fromEntries(Object.keys(r1).map((k) => [k, r1[k] - (r0[k] ?? 0)]));
  const stampedKind = await page.evaluate(() => [...document.querySelectorAll(".lite-vars tr")].find((tr) => tr.querySelector("td code")?.textContent === "stamped")?.children[2]?.textContent);
  report(delta.doubled === 1 && delta.app === 1 && delta.stamped === 1 && delta.scale === 1 && delta.area === 1 && delta.areaFn === 1 && delta.areaOf4 === 1 && delta.side === 0 && delta.bump === 0 && stampedKind === "cell, not memoised", `try (section 6): one bump, body runs per cell ${JSON.stringify(delta)}; stamped's kind ${JSON.stringify(stampedKind)}`);

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
    await page.waitForTimeout(300);
    const w2 = await world();
    const ssv = await page.evaluate(() => { const ss = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/soundscript")._scope.get("ss")._value; return { running: ss.running(), pulling: ss.pulling() }; });
    report(w0.score > 0 && w1.score >= w0.score && w1.bricks <= w0.bricks && w2.y !== w1.y && ssv.running === 1 && ssv.pulling === 1, `try (section 9): step edited while playing: world ${JSON.stringify(w0)} -> ${JSON.stringify(w1)} -> ${JSON.stringify(w2)}, ${ssv.running} listener, ${ssv.pulling} clock`);
    await page.getByRole("button", { name: "pause", exact: true }).first().click().catch(() => {});
  } else report(false, "try: no editor for breakout step");
}
// At phone width the page does not scroll sideways, and every cell of the tutorial computes without error
// Each lesson cell of the tutorial is on the page as its typed source, decompiled from the live
// definition, with its check, type and value; the first is in view at 1280×800. Then the page is
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
    const ss = mod._scope.get("ss")._value;
    const seen = new Set<string>(), want: { key: string; text: string }[] = [];
    for (const v of rt._variables) {
      if (v._module !== mod || typeof v._name !== "string" || typeof v._definition !== "function" || ss.langOf(String(v._definition)) !== "ss") continue;
      const key = v._name.replace(/^viewof /, ""), text = ss.decompileVariable(String(v._definition));
      // a ref cell's value variable holds no source; its handle variable does
      if (seen.has(key) || text === null) continue;
      seen.add(key);
      want.push({ key, text });
    }
    const missing = want.filter(({ key, text }) => {
      const card = document.querySelector(`.lite-card[data-cell="${key}"]`) as HTMLElement | null;
      return !card || !card.offsetParent || card.querySelector(".lite-code")!.textContent !== text;
    }).map((w) => w.key);
    // the cells' own inspector lines are hidden: no "width = 640" line under the cards
    const shown = want.filter(({ key }) => { const d = document.querySelector(`.observablehq[cell="${key}"]`) as HTMLElement | null; return d && d.offsetParent; }).map((w) => w.key);
    // each card keeps one visible edit bar: the editor host of the variable the page renders
    const editors = [...rt._variables].find((v: any) => v._name === "editors")?._value;
    const nobar = want.filter(({ key }) => !editors?.get(mod._scope.get(key))?.offsetParent).map((w) => w.key);
    const first = document.querySelector(".lite-card") as HTMLElement;
    const rejected = [...document.querySelectorAll(".lite-card.lite-rejected")].filter((e) => !(e.querySelector(".lite-card-msgs")!.textContent ?? "").includes("[")).map((e) => e.getAttribute("data-cell"));
    return { n: want.length, missing, shown, nobar, first: first?.getAttribute("data-cell"), firstTop: Math.round(first?.getBoundingClientRect().top ?? 1e9), rejected };
  }, TUTORIAL);
  report(c.n >= 31 && c.missing.length === 0 && c.shown.length === 0 && c.rejected.length === 0, `cards: ${c.n} lesson cells each shown as its live source with check, type and value (missing ${JSON.stringify(c.missing)}); their inspector lines hidden (shown ${JSON.stringify(c.shown)}); every rejected card states its rule without a hover (${JSON.stringify(c.rejected)})`);
  report(c.nobar.length === 0, `cards: every card has a visible edit bar (without one: ${JSON.stringify(c.nobar)})`);
  report(c.first === "width" && c.firstTop > 0 && c.firstTop < 800, `cards: the first card is ${c.first}, at y ${c.firstTop} of an 800 px window`);
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
  await page.evaluate(() => document.querySelector(".lite-card")!.scrollIntoView({ block: "start" }));
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
    // a card's source wraps rather than running out of its box
    const clipped = [...document.querySelectorAll(".lite-card .lite-code")].filter((c) => c.scrollWidth > c.clientWidth + 1).map((c) => c.closest(".lite-card")!.getAttribute("data-cell"));
    return { docW: document.documentElement.scrollWidth, wide: [...new Set(wide)].slice(0, 8), board: [Math.round(board.left), Math.round(board.right)], graphs, clipped };
  });
  report(m.clipped.length === 0, `phone: every card's source fits its card (clipped ${JSON.stringify(m.clipped)})`);
  report(m.docW <= 390 && m.wide.length === 0 && m.board[0] >= 16 && m.board[1] <= 374 && m.graphs.length === 2 && m.graphs.every((g) => +g.split("/")[0] <= +g.split("/")[1]),
    `phone (390 px): page width ${m.docW}, elements past the edge ${JSON.stringify(m.wide)}, the Breakout board spans x ${m.board.join(" to ")}, diagrams (scroll/client width) ${m.graphs.join(", ")}`);
  await testsPass(page, "phone", TUTORIAL, []);
  report(errors.length === 0, `phone: page errors ${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
  await page.close();
}
// the core's README shows its four example cells as source cards, then the counter view, in the full
// notebook and in the notebook without the tutorial
async function coreCards(page: Page, label: string) {
  const tab = page.locator(`[title="${CORE}  (drag to a pane edge to dock, or out to save as .js)"]`);
  await page.waitForFunction((C) => (window as any).__ojs_runtime?.mains?.get(C)?._scope.get("ss_card")?._value, CORE, { timeout: 60000 });
  if (await tab.count()) await tab.first().click();
  const pane = `.lp2-pane[data-module="${CORE}"]`;
  const shown = await until(page, () => page.evaluate((pane) => [...document.querySelectorAll(`${pane} .lite-card`)].filter((c) => (c as HTMLElement).offsetParent).length === 4, pane), 20000);
  const r = await page.evaluate(([pane, C]) => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get(C), ss = core._scope.get("ss")._value;
    const root = document.querySelector(pane)!;
    const top = (e: Element | null) => (e ? Math.round(e.getBoundingClientRect().top + root.scrollTop) : null);
    const cards = [...root.querySelectorAll(".lite-card")].map((c) => {
      const key = c.getAttribute("data-cell")!;
      const v = core._scope.get(key === "tally" ? "viewof tally" : key);
      return { key, ok: c.classList.contains("lite-ok"), same: c.querySelector(".lite-code")!.textContent === ss.decompileVariable(String(v._definition)), value: c.querySelector(".lite-card-value")!.textContent, top: top(c) };
    });
    const visible = (name: string) => { const d = root.querySelector(`.observablehq[cell="${name}"]`) as HTMLElement | null; return !!d?.offsetParent; };
    const editors = [...rt._variables].find((v: any) => v._name === "editors")?._value;
    const nobar = cards.filter((c) => !editors?.get(core._scope.get(c.key))?.offsetParent).map((c) => c.key);
    const h1 = [...root.querySelectorAll("h1")].find((h) => h.textContent === "SoundScript") ?? null;
    return { cards, nobar, inspector: ["tally", "viewof tally", "bump", "reset", "doubled"].filter(visible), view: visible("example_view"), viewTop: top(root.querySelector('.observablehq[cell="example_view"]')), h1: top(h1), text: root.querySelector(".ss-example")?.textContent };
  }, [pane, CORE]);
  const keys = r.cards.map((c) => c.key).join(",");
  const order = r.h1 !== null && r.cards.every((c, i) => c.top! > r.h1! && (i === 0 || c.top! > r.cards[i - 1].top!)) && r.view && r.viewTop! > r.cards[3]?.top!;
  report(shown && keys === "tally,bump,reset,doubled" && r.cards.every((c) => c.ok && c.same && !/not computed|throws/.test(c.value!)) && r.inspector.length === 0 && r.nobar.length === 0 && order,
    `${label}: the title, then cards for ${keys}, each with a visible edit bar (without: ${JSON.stringify(r.nobar)}) (each its live source, ok: ${JSON.stringify(r.cards.map((c) => [c.key, c.ok, c.same, c.value]))}), then the counter view (${JSON.stringify(r.text)}); inspector lines shown ${JSON.stringify(r.inspector)}`);
  // a click on bump reaches the tally card's value
  const before = r.cards[0]?.value;
  await page.locator(`${pane} .ss-example button`, { hasText: "bump" }).click();
  const moved = await until(page, () => page.evaluate((pane) => document.querySelector(`${pane} .lite-card[data-cell="tally"] .lite-card-value`)!.textContent, pane).then((t) => t !== before), 5000);
  await page.locator(`${pane} .ss-example button`, { hasText: "reset" }).click();
  report(moved, `${label}: bump changes the tally card's value from ${before}`);
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
  // the page settles after play re-renders the game (scroll anchoring); the drag is measured after that
  let last = "";
  await until(page, async () => { const s = await scroll(); const same = s === last; last = s; return same; }, 10000);
  const before = { world: await world(), scroll: await scroll(), top: (await canvas.boundingBox())!.y };
  const bb = (await canvas.boundingBox())!;
  const cdp = await ctx.newCDPSession(page);
  const at = (f: number, dy: number) => [{ x: bb.x + bb.width * f, y: bb.y + bb.height * 0.8 - dy, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(0.5, 0) });
  // left and upward, as a thumb moves: an upward drag on a page that may scroll would scroll it
  for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(0.5 - 0.04 * i, 15 * i) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await until(page, async () => (await world()).paddle !== before.world.paddle, 3000);
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
const tryOnly = process.argv.includes("--try-only");
const uiOnly = process.argv.includes("--ui-only") || tryOnly;
const speedOnly = process.argv.includes("--speed-only");
const variantOnly = process.argv.includes("--variant-only") || speedOnly;
if (!variantOnly && !process.argv.includes("--no-try")) {
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
if ((!uiOnly && !variantOnly || speedOnly) && !process.argv.includes("--no-speed")) await speed();
const A = uiOnly || variantOnly ? null as any : await open(file);
if (!uiOnly && !variantOnly) {
// the counter tests press their buttons on copies: the page's counters keep what the reader set
await A.page.waitForFunction(([c, t]: string[]) => { const rt = (window as any).__ojs_runtime; return rt?.mains?.get(t)?._scope.get("increment")?._value && rt.mains.get(c)?._scope.get("bump")?._value; }, [CORE, TUTORIAL], { timeout: 60000 });
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
    const ss = bm._scope.get("ss")._value;
    return { ballRuns: ss.evals(bm._scope.get("ballView")._definition), y: bm._scope.get("world")._value.ball.y, pulling: ss.pulling() };
  });
  report(g.ballRuns <= 1 && g.y === 180 && g.pulling === 0, `original: after the tests, the page's Breakout is as it booted: ballView ran ${g.ballRuns} times, ball at y ${g.y}, ${g.pulling} clocks pulled`);
}
for (const m of SECTIONS) await testsPass(A.page, "original", m, SECTION_TESTS[m]);
await hookPass(A.page, "original");
await oneCore(A.page, "original");
await counterClick(A.page, "original");
await editorOn(A.page, "original", TUTORIAL, "increment", "count: Ref<number>", "count: Ref<string>", "inject-ref");
await counterClick(A.page, "after the unchanged save");
await testsPass(A.page, "after the unchanged save", TUTORIAL, TUTORIAL_TESTS);
const fresh = await addCell(A.page, TUTORIAL, "half", "export const tripled = (width: number) => width * 3;", false);
report(fresh.back === "export const tripled = (width: number) => width * 3;" && fresh.value === 1920 && fresh.afterAnchor && fresh.held, `editor: a new export cell is applied as SoundScript after its anchor: ${JSON.stringify(fresh)}`);

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
report(exp1.includes("/*ss:: Ref<number>*/"), "export: the type comments are in the exported module");
sameBlocks("export", orig, exp1);
await instanceStops(A.page);
await deleteStops(A.page);
requests("original page", A);
await A.page.close();


const B = await open(exp1Path);


await testsOn(B.page, "reopened export");
await testsPass(B.page, "reopened export", CORE, CORE_TESTS);
await testsPass(B.page, "reopened export", TUTORIAL, TUTORIAL_TESTS);
for (const m of SECTIONS) await testsPass(B.page, "reopened export", m, SECTION_TESTS[m]);
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
const E = await open(file, savedPath);
await testsOn(E.page, "ui");
await testsPass(E.page, "ui", CORE, CORE_TESTS);
await completion(E.page);
await uiPaths(E.page, savedPath);
requests("ui page", E);
await E.page.close();
if (existsSync(savedPath)) {
  const F = await open(savedPath);
  await testsOn(F.page, "reload after save");
  // the edits change width and add a cell, so the two tests that pin section 1's values and the verdict list are left out
  const changed = ["test_ss_module_checks", "test_half"];
  await testsPass(F.page, "reload after save", TUTORIAL, TUTORIAL_TESTS.filter((t) => !changed.includes(t)), changed);
  await afterReload(F.page);
  requests("reloaded saved page", F);
  await F.page.close();
}
}
// --- 5: the core without the tutorial
if (!uiOnly && !speedOnly && !process.argv.includes("--no-variant")) {
  const variant = join(SCRATCH, "core-only.html");
  const built = Bun.spawnSync(["bun", join(HERE, "build.ts"), "--no-tutorial", "--force", "--out", variant], { stdout: "pipe", stderr: "pipe" });
  report(built.exitCode === 0, `core-only: built ${variant}${built.exitCode ? ": " + built.stderr.toString().slice(-400) : ""}`);
  const vhtml = readFileSync(variant, "utf8");
  report(!ids(vhtml).has(TUTORIAL) && ![...ids(vhtml)].some((id) => id.startsWith(TUTORIAL + "/")), "core-only: no tutorial block or attachment in the file");
  const C = await open(variant);
  await testsOn(C.page, "core-only");
  await testsPass(C.page, "core-only", CORE, CORE_TESTS);
  await hookPass(C.page, "core-only");
  await coreCards(C.page, "core-only README");
  await editorOn(C.page, "core-only", CORE, "bump", "tally: Ref<number>", "tally: Ref<string>", "inject-ref");
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
    const out = await get("ss_language")._value.apply("export const kitcell = () => 2;", [head], { module: { module: core }, variables: [head] });
    const alive = [...rt._variables].includes(display) || head._shadow.size > 0;
    const v = get("kitcell");
    const value = v ? await core.value("kitcell") : null;
    v?.delete();
    return { applied: typeof out === "string", shadowAlive: alive, value };
  });
  report(shadow.applied && !shadow.shadowAlive && shadow.value === 2, `core-only: a cell with a Kit shadow variable made SoundScript through apply leaves no shadow behind: ${JSON.stringify(shadow)}`);
  const NEW = "export const tripled = (doubled: number) => doubled * 3;";
  const added = await addCell(C.page, CORE, "doubled", NEW, true);
  report(added.back === NEW && added.value === 0 && added.afterAnchor && added.held, `core-only: a new cell added through the editor: ${JSON.stringify(added)}`);
  // a ref cell made plain and a ref again through apply: the handle variable comes and goes
  const flips = await C.page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
    const lang = get("ss_language")._value;
    const names = () => [...rt._variables].filter((v: any) => v._module === core && /^(viewof )?flag$/.test(v._name)).map((v: any) => v._name).sort();
    const out: any[] = [];
    const vars: any[] = [];
    out.push(await lang.apply("export const flag = (): RefCell<boolean> => ref(false);", vars, { module: { module: core }, variables: [get("tripled")] }), names());
    out.push(await lang.apply("export const flag = () => true;", vars), names(), await core.value("flag"));
    out.push(await lang.apply("export const flag = (): RefCell<boolean> => ref(false);", vars), names(), await core.value("flag"));
    return out;
  });
  report(JSON.stringify(flips.filter((x: any) => Array.isArray(x))) === JSON.stringify([["flag", "viewof flag"], ["flag"], ["flag", "viewof flag"]]) && flips[4] === true && flips[7] === false, `core-only: flag ref -> plain -> ref through apply: ${JSON.stringify(flips)}`);
  // A generator becomes an events handle when a cell takes it as Events<T>, and a plain generator again
  // when that cell is deleted outside apply (as the editor's delete button does). The consumer is
  // deleted at once, before onCodeChange's snapshot has seen it, which is the case that used to leave
  // pulse compiled as events; its listener must end too.
  for (const consumer of ["export const pulses = (pulse: Events<number>) => 0;", "export const pulses = (pulse: Events<number>, addn: Action<[number]>) => on(pulse, addn);"]) {
    const src = await C.page.evaluate(async (consumer) => {
      const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
      const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
      const lang = get("ss_language")._value, ss = get("ss")._value;
      const kind = () => /kind: "(\w+)"/.exec(String(get("pulse")?._definition))?.[1];
      const until = async (f: () => boolean) => { for (let i = 0; i < 100 && !f(); i++) await new Promise((r) => requestAnimationFrame(r)); return f(); };
      const out: any = {};
      out.gen = await lang.apply("export const pulse = function* () { while (true) yield 1; };", [], { module: { module: core }, variables: [get("tripled")] });
      out.before = kind();
      if (consumer.includes("addn")) out.addn = await lang.apply("export const addn = (tally: Ref<number>) => action((n: number) => tally.update((t) => t + n));", [], { module: { module: core }, variables: [get("pulse")] });
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
  // (d) an action in a ref across a save: aCurrent starts as aInc and holds aDec when saved
  const stored = await C.page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
    const lang = get("ss_language")._value;
    const res: any[] = [];
    for (const c of [
      "export const aCount = (): RefCell<number> => ref(0);",
      "export const aInc = (aCount: Ref<number>) => action(() => aCount.update((c) => c + 1));",
      "export const aDec = (aCount: Ref<number>) => action(() => aCount.update((c) => c - 1));",
      "export const aCurrent = (aInc: Action<[]>): RefCell<Action<[]>> => ref(aInc);",
      "export const aUseDec = (aCurrent: Ref<Action<[]>>, aDec: Action<[]>) => action(() => aCurrent.set(aDec));",
    ]) res.push(!!(await lang.apply(c, [], { module: { module: core }, variables: [get("tripled")] })));
    await core.value("aUseDec");
    get("aUseDec")._value();
    for (let i = 0; i < 20 && get("aCurrent")._value !== get("aDec")._value; i++) await new Promise((r) => setTimeout(r, 20));
    return { applied: res, holdsDec: get("aCurrent")._value === get("aDec")._value };
  });
  const cexp = await exportPage(C.page);
  const cexpPath = join(SCRATCH, "core-only-export.html");
  writeFileSync(cexpPath, cexp);
  requests("core-only page", C);
  await C.page.close();
  const D = await open(cexpPath);
  await testsOn(D.page, "core-only reopened");
  await testsPass(D.page, "core-only reopened", CORE, CORE_TESTS);
  {
    const loaded = await D.page.evaluate(async () => {
      const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
      const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
      const cur = await core.value("aCurrent"), inc = await core.value("aInc"), dec = await core.value("aDec");
      const c0 = await core.value("aCount");
      cur();
      for (let i = 0; i < 20 && get("aCount")._value === c0; i++) await new Promise((r) => setTimeout(r, 20));
      return { isInc: cur === inc, isDec: cur === dec, countChange: get("aCount")._value - c0 };
    });
    // a report, not a requirement: what a ref holding an action holds after a save and reopen
    console.log(`  report (d) action in a ref across a save: before saving ${JSON.stringify(stored)}; on load ${JSON.stringify(loaded)}`);
    report(stored.applied.every(Boolean) && (loaded.isInc || loaded.isDec), `core-only reopened: a ref that held an action when saved holds an action on load (${loaded.isInc ? "its initial aInc" : "the stored aDec"})`);
  }
  const after = await D.page.evaluate(async (NEW) => {
    const rt = (window as any).__ojs_runtime;
    const core = rt.mains.get("@tomlarkworthy/soundscript");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
    const v = get("tripled");
    if (!v) return { present: false };
    const text = get("ss")._value.decompileVariable(String(v._definition));
    const verdict = get("ss_check")._value(core).result.cells.find((c: any) => c.name === "tripled")?.status;
    const lang = get("ss_language")._value;
    const flag = get("viewof flag") && get("flag") ? lang.decompile([get("flag")]) : null;
    return { present: true, typed: text === NEW, verdict, editorSource: await lang.decompile([v]), value: await core.value("tripled"), flag: await flag, roundtrip: get("ss_roundtrip")._value(core) };
  }, NEW);
  report(after.flag === "export const flag = (): RefCell<boolean> => ref(false);", `core-only reopened: flag is a ref cell again after export: ${after.flag}, ${after.roundtrip} variables round trip`);
  report(after.present && after.typed && after.verdict === "ok" && after.editorSource === NEW && after.value === 0, `core-only reopened: the added cell survived the export as typed source that checks: ${JSON.stringify(after)}`);
  requests("core-only reopened page", D);
  await D.page.close();

  // --- 6: the core only as the tutorial's import, so ss_registration never runs on its own. An
  // editor opened then shows the compiled text and must refuse to save it; once the language
  // registers, the same open editor shows the typed source.
  const unreg = join(SCRATCH, "core-not-main.html");
  const built6 = Bun.spawnSync(["bun", join(HERE, "build.ts"), "--core-not-main", "--force", "--out", unreg], { stdout: "pipe", stderr: "pipe" });
  report(built6.exitCode === 0, `core-not-main: built ${unreg}${built6.exitCode ? ": " + built6.stderr.toString().slice(-400) : ""}`);
  const U = await open(unreg);
  await U.page.waitForFunction((tut) => (window as any).__ojs_runtime?.mains?.get(tut), TUTORIAL, { timeout: 60000 });
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
      const langs = find("cellLanguagesRef")._value;
      out.registeredAtOpen = langs.current.map((l: any) => l.id);
      const host = find("editors")._value.get(inc);
      host.querySelector(".hotbar").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const EditorView = find("EditorView")._value, codemirror = find("codemirror")._value;
      const view = () => { const cm = host.querySelector(".cm-editor"); return cm && EditorView.findFromDOM(cm); };
      await until(() => view()?.state.doc.toString().trim(), "text in the editor");
      out.shownBefore = view().state.doc.toString().slice(0, 60);
      out.diagnostics = await until(() => { const ds: string[] = []; codemirror.forEachDiagnostic?.(view().state, (d: any) => ds.push(d.message)); return ds.length ? ds : null; }, "a diagnostic");
      const def0 = inc._definition;
      view().contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, shiftKey: true, bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 1500));
      out.savedUnchanged = inc._definition === def0 && find("width", mod) === inc;
      // now the language registers (an observer keeps ss_registration, and so the registration, alive);
      // the open editor follows
      find("ss_registration")._module.variable({}).define(["ss_registration"], (x: any) => x);
      await until(() => /^export const width = /m.test(view()?.state.doc.toString() ?? ""), "the typed source after registration");
      out.shownAfter = view().state.doc.toString();
    } catch (e) { out.error = String((e as Error)?.message ?? e); }
    return out;
  }, TUTORIAL);
  report(!g2.error && g2.registeredAtOpen?.length === 0 && /^width = \$ss\$\.cell\(/.test(g2.shownBefore ?? "") && g2.diagnostics?.some((d: string) => /not loaded yet/.test(d)) && g2.savedUnchanged,
    `core-not-main: with no language registered the editor on width shows the compiled text, says it is not loaded, and Shift-Enter saves nothing: ${JSON.stringify({ ...g2, shownAfter: undefined })}`);
  report(!g2.error && /^export const width = \(\) => 640;$/m.test(g2.shownAfter ?? "") && !g2.shownAfter.includes("$ss$"), `core-not-main: after registration the open editor shows the typed source: ${JSON.stringify(g2.shownAfter ?? g2.error)}`);
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
  report(!g1.error && /^export const area = /m.test(g1.shown ?? "") && g1.diagnostics?.some((d: string) => d.includes("injected extension fault")), `core-not-main: an editor extension that throws leaves the plain editor with the error shown: ${JSON.stringify(g1)}`);
  await U.page.close();
}
} catch (e) {
  // a thrown error ends the run early; it counts as a failure, so a partial run cannot read as a pass
  console.log(`FAIL stopped by an error: ${(e as Error)?.stack ?? e}`);
  fails++;
}
await browser.close().catch(() => {});
console.log(`${passes} pass, ${fails} fail`);
process.exit(fails ? 1 : 0);
