// bun lite/soundscript/verify.ts [notebook.html] [--shot file.png] [--no-variant]
// Headless Chromium, every non-file request aborted. Opens soundscript.html (default
// lopebooks/notebooks/soundscript.html) with its own default layout, then:
//  1. every test cell of the core and the tutorial, and editor-5's test_e5_language_hook; one
//     instance of the core (the tutorial's import is the main), one ss_registration;
//  2. the live counter: a real click on "add one";
//  3. the editor fork on the tutorial's `increment`: typed source shown, an unchanged save keeps
//     text and pid, Ref<string> shows a diagnostic and is refused; a new export cell is applied;
//  4. export with exporter-3, reopen, run 1 and 2 there, compare SoundScript definitions, block ids
//     and decompiled source, export again and compare the module blocks;
//  5. the core without the tutorial (build.ts --no-tutorial into .scratch/): core tests, the editor
//     on `bump`, a new cell added through the editor, export, reopen: the cell is there as typed
//     source and checks.
// No request to /@tomlarkworthy/ or api.observablehq.com may be made (a stripped module fetched).
// The notebook file itself is never written.
import { chromium, type Page } from "../../../../node_modules/playwright/index.mjs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { blockContent, blockSpans } from "../../../lib/notebook-blocks.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE = "@tomlarkworthy/soundscript";
const TUTORIAL = "@tomlarkworthy/soundscript-tutorial";
const file = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : join(HERE, "../../../../lopebooks/notebooks/soundscript.html"));
const shot = process.argv.includes("--shot") ? process.argv[process.argv.indexOf("--shot") + 1] : null;
const SCRATCH = join(HERE, ".scratch");
mkdirSync(SCRATCH, { recursive: true });

let failed = false;
const report = (ok: boolean, what: string) => { console.log(`${ok ? "pass" : "FAIL"} ${what}`); if (!ok) failed = true; };

const CORE_TESTS = ["test_ss_roundtrip", "test_ss_example_checks", "test_ss_unchanged_source_checks", "test_ss_wrong_type_is_refused", "test_ss_downstream_break_is_refused", "test_ss_ref_handle", "ss_registration"];
const TUTORIAL_TESTS = ["test_ss_roundtrip", "test_ss_module_checks", "test_ss_counter", "test_half",
  "test_examples_check_as_expected", "test_counter_click", "test_compile_pool_matches_main", "test_compile_refuses_unchecked", "test_example_tests_pass", "test_breakout_subscriptions", "test_breakout_memo", "benchmark"];

const browser = await chromium.launch();
async function open(path: string) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  const blocked: string[] = [], errors: string[] = [];
  await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : (blocked.push(r.request().url()), r.abort())));
  page.on("pageerror", (e) => errors.push(String(e.message)));
  await page.goto(`file://${path}`);
  return { page, blocked, errors };
}
function requests(label: string, o: { blocked: string[]; errors: string[] }) {
  const fetched = o.blocked.filter((u) => /\/@tomlarkworthy\/|api\.observablehq\.com/.test(u));
  report(fetched.length === 0, `${label}: no module fetched from the network${fetched.length ? ": " + fetched.join(", ") : ""}`);
  report(o.errors.length === 0, `${label}: page errors ${o.errors.length}${o.errors.length ? ": " + o.errors.slice(0, 3).join(" | ") : ""}`);
  console.log(`  ${label}: aborted ${o.blocked.length}: ${[...new Set(o.blocked)].join(" ")}`);
}

const read = (page: Page, name: string) => page.evaluate((name) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt?.mains?.get(name);
  if (!mod) return null;
  const out: Record<string, { state: string; value?: string }> = {};
  for (const v of rt._variables) {
    if (v._module !== mod || !v._name) continue;
    const state = v._error !== undefined ? "error" : v._value !== undefined ? "ok" : "pending";
    const val = v._value;
    out[v._name] = { state, value: state === "error" ? String(v._error?.message ?? v._error) : typeof val === "string" || typeof val === "number" ? String(val) : val && val.constructor === Object ? JSON.stringify(val) : undefined };
  }
  return out;
}, name);

async function testsPass(page: Page, label: string, name: string, tests: string[]) {
  let vars = null as Awaited<ReturnType<typeof read>>;
  for (let i = 0; i < 120; i++) {
    vars = await read(page, name);
    if (vars && tests.every((t) => vars![t] && vars![t].state !== "pending")) break;
    await page.waitForTimeout(500);
  }
  if (!vars) { report(false, `${label}: ${name} never booted`); return; }
  const errorCells = Object.entries(vars).filter(([, v]) => v.state === "error");
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
function sameBlocks(label: string, a: string, b: string) {
  const A = ids(a), B = ids(b);
  const gone = [...A].filter((x) => !B.has(x)), added = [...B].filter((x) => !A.has(x));
  report(gone.length === 0 && added.length === 0, `${label}: the export has the built file's ${A.size} block ids${gone.length ? "; dropped " + gone.join(", ") : ""}${added.length ? "; added " + added.join(", ") : ""}`);
}

// --- 1-3: the notebook
const A = await open(file);
await testsPass(A.page, "original", CORE, CORE_TESTS);
await testsPass(A.page, "original", TUTORIAL, TUTORIAL_TESTS);
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
for (const m of [CORE, TUTORIAL]) {
  const lA = ssLines(orig, m), l1 = ssLines(exp1, m);
  report(lA.length > 0 && JSON.stringify(lA) === JSON.stringify(l1), `export: ${m}: ${l1.length} SoundScript definition lines, identical to the original file's ${lA.length}`);
}
report(exp1.includes("/*ss:: Ref<number>*/"), "export: the type comments are in the exported module");
sameBlocks("export", orig, exp1);
requests("original page", A);
await A.page.close();

const B = await open(exp1Path);
await testsPass(B.page, "reopened export", CORE, CORE_TESTS);
await testsPass(B.page, "reopened export", TUTORIAL, TUTORIAL_TESTS);
await hookPass(B.page, "reopened export");
await counterClick(B.page, "reopened export");
const sourceB = await ssSource(B.page, TUTORIAL);
report(sourceA === sourceB, `reopened export: the tutorial's SoundScript source decompiles to the same ${sourceA.length} chars`);
const exp2 = await exportPage(B.page);
writeFileSync(join(SCRATCH, "export-2.html"), exp2);
for (const m of [CORE, TUTORIAL]) report(blockContent(exp1, m) === blockContent(exp2, m), `second export: the ${m} block equals the first export's`);
requests("reopened page", B);
await B.page.close();

// --- 5: the core without the tutorial
if (!process.argv.includes("--no-variant")) {
  const variant = join(SCRATCH, "core-only.html");
  const built = Bun.spawnSync(["bun", join(HERE, "build.ts"), "--no-tutorial", "--force", "--out", variant], { stdout: "pipe", stderr: "pipe" });
  report(built.exitCode === 0, `core-only: built ${variant}${built.exitCode ? ": " + built.stderr.toString().slice(-400) : ""}`);
  const vhtml = readFileSync(variant, "utf8");
  report(!ids(vhtml).has(TUTORIAL) && ![...ids(vhtml)].some((id) => id.startsWith(TUTORIAL + "/")), "core-only: no tutorial block or attachment in the file");
  const C = await open(variant);
  await testsPass(C.page, "core-only", CORE, CORE_TESTS);
  await hookPass(C.page, "core-only");
  await editorOn(C.page, "core-only", CORE, "bump", "tally: Ref<number>", "tally: Ref<string>", "inject-ref");
  const NEW = "export const tripled = (doubled: number) => doubled * 3;";
  const added = await addCell(C.page, CORE, "doubled", NEW, true);
  report(added.back === NEW && added.value === 0 && added.afterAnchor && added.held, `core-only: a new cell added through the editor: ${JSON.stringify(added)}`);
  const cexp = await exportPage(C.page);
  const cexpPath = join(SCRATCH, "core-only-export.html");
  writeFileSync(cexpPath, cexp);
  requests("core-only page", C);
  await C.page.close();
  const D = await open(cexpPath);
  await testsPass(D.page, "core-only reopened", CORE, CORE_TESTS);
  const after = await D.page.evaluate(async (NEW) => {
    const rt = (window as any).__ojs_runtime;
    const core = rt.mains.get("@tomlarkworthy/soundscript");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
    const v = get("tripled");
    if (!v) return { present: false };
    const text = get("ss")._value.decompileVariable(String(v._definition));
    const verdict = get("ss_check")._value(core).result.cells.find((c: any) => c.name === "tripled")?.status;
    const lang = get("ss_language")._value;
    return { present: true, typed: text === NEW, verdict, editorSource: await lang.decompile([v]), value: await core.value("tripled") };
  }, NEW);
  report(after.present && after.typed && after.verdict === "ok" && after.editorSource === NEW && after.value === 0, `core-only reopened: the added cell survived the export as typed source that checks: ${JSON.stringify(after)}`);
  requests("core-only reopened page", D);
  await D.page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
