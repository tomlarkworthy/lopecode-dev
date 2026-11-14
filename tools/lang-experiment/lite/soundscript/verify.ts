// bun lite/soundscript/verify.ts [notebook.html] [--shot file.png]
// Headless Chromium, every non-file request aborted. Opens soundscript.html (default
// lopebooks/notebooks/soundscript.html), then:
//  1. every test cell of @tomlarkworthy/soundscript, and editor-5's test_e5_language_hook;
//  2. the live counter: a real click on "add one";
//  3. the editor fork: open increment's editor, check it shows the typed source, save it unchanged
//     (Shift-Enter), click again; then type Ref<string> for Ref<number>, save, and check a
//     diagnostic shows and the definition is not replaced;
//  4. export with exporter-3's exportToHTML into lite/soundscript/.scratch/, reopen the export,
//     run 1 and 2 there, compare its SoundScript definitions and source with the original page's,
//     export again and compare the two module blocks.
// The notebook file itself is never written.
import { chromium, type Page } from "../../../../node_modules/playwright/index.mjs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { blockContent } from "../../../lib/notebook-blocks.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const NAME = "@tomlarkworthy/soundscript";
const file = resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : join(HERE, "../../../../lopebooks/notebooks/soundscript.html"));
const shot = process.argv.includes("--shot") ? process.argv[process.argv.indexOf("--shot") + 1] : null;
const SCRATCH = join(HERE, ".scratch");
mkdirSync(SCRATCH, { recursive: true });

let failed = false;
const report = (ok: boolean, what: string) => { console.log(`${ok ? "pass" : "FAIL"} ${what}`); if (!ok) failed = true; };

const TESTS = ["test_ss_roundtrip", "test_ss_module_checks", "test_ss_unchanged_source_checks", "test_ss_wrong_type_is_refused", "test_ss_downstream_break_is_refused", "test_ss_counter", "test_half",
  "test_examples_check_as_expected", "test_counter_click", "test_compile_pool_matches_main", "test_compile_refuses_unchecked", "test_example_tests_pass", "test_breakout_subscriptions", "test_breakout_memo", "benchmark", "ss_registration"];

const browser = await chromium.launch();
async function open(path: string) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  const blocked: string[] = [], errors: string[] = [];
  await page.route("**/*", (r) => (/^(file|blob|data):/.test(r.request().url()) ? r.continue() : (blocked.push(r.request().url()), r.abort())));
  page.on("pageerror", (e) => errors.push(String(e.message)));
  await page.goto(`file://${path}#view=S100(${NAME})`);
  return { page, blocked, errors };
}

const read = (page: Page) => page.evaluate((name) => {
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
}, NAME);

async function testsPass(page: Page, label: string) {
  let vars = null as Awaited<ReturnType<typeof read>>;
  for (let i = 0; i < 120; i++) {
    vars = await read(page);
    if (vars && TESTS.every((t) => vars![t] && vars![t].state !== "pending")) break;
    await page.waitForTimeout(500);
  }
  if (!vars) { report(false, `${label}: module never booted`); return; }
  const errorCells = Object.entries(vars).filter(([n, v]) => v.state === "error" && n !== "bad_free_component");
  report(errorCells.length === 0, `${label}: ${Object.keys(vars).length} variables, ${errorCells.length} in error${errorCells.map(([n, v]) => `\n    ${n}: ${v.value}`).join("")}`);
  for (const t of TESTS) report(vars[t]?.state === "ok", `${label}: ${t}: ${(vars[t]?.value ?? vars[t]?.state ?? "missing").slice(0, 200)}`);
  const hook = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime;
    const v = [...rt._variables].find((v: any) => v._name === "test_e5_language_hook");
    try { return "ok " + await v._module.value("test_e5_language_hook"); } catch (e) { return "error " + String((e as Error)?.message ?? e); }
  });
  report(hook.startsWith("ok "), `${label}: editor-5 test_e5_language_hook: ${hook}`);
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

// --- 1, 2: the original file
const A = await open(file);
await testsPass(A.page, "original");
await counterClick(A.page, "original");

// --- 3: the editor fork on `increment`
const ed = await A.page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const find = (name: string, mod?: any) => [...rt._variables].find((v: any) => v._name === name && (!mod || v._module === mod));
  const ssMod = rt.mains.get("@tomlarkworthy/soundscript");
  const inc = find("increment", ssMod);
  const editorsV = find("editors"), EditorViewV = find("EditorView"), ssV = find("ss", ssMod);
  const editors = editorsV?._value, EditorView = EditorViewV?._value, ss = ssV._value;
  const until = async (fn: () => any, what: string, ms = 15000) => {
    const t0 = Date.now();
    for (;;) { const got = await fn(); if (got) return got; if (Date.now() - t0 > ms) throw new Error(`${what} not reached in ${ms} ms`); await new Promise((r) => setTimeout(r, 100)); }
  };
  const out: any = {};
  try {
    const host = await until(() => editors?.get(inc)?.querySelector(".hotbar") && editors.get(inc), "an editor beside increment");
    host.querySelector(".hotbar").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    (window as any).__incHost = host;
    const cm = await until(() => host.querySelector(".cm-editor"), "CodeMirror for increment");
    await until(() => (cm.querySelector(".cm-content")?.textContent ?? "").trim(), "source in the editor");
    const view = EditorView.findFromDOM(cm);
    const want = ss.decompileVariable(String(inc._definition));
    out.shown = view.state.doc.toString();
    out.showsTyped = out.shown === want;
    out.tsMode = !!cm.querySelector(".cm-content") && out.shown.includes("Ref<number>");
    const fn0 = inc._definition, text0 = String(fn0), pid0 = inc.pid;
    const shiftEnter = () => view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, shiftKey: true, bubbles: true, cancelable: true }));
    shiftEnter();
    await until(() => inc._definition !== fn0, "increment redefined by the unchanged save");
    out.unchangedSameText = String(inc._definition) === text0;
    out.unchangedSamePid = inc.pid === pid0;
    out.unchangedOneVariable = [...rt._variables].filter((v: any) => v._module === ssMod && v._name === "increment").length === 1;
    out.docAfterSave = view.state.doc.toString() === want;
    // the wrong type
    const fn1 = inc._definition;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: want.replace("count: Ref<number>", "count: Ref<string>") } });
    shiftEnter();
    const codemirror = find("codemirror")._value;
    const diags = await until(() => {
      const ds: string[] = [];
      codemirror.forEachDiagnostic?.(view.state, (d: any) => ds.push(d.message));
      return ds.length && host.querySelector(".cm-lintRange-error, .cm-lint-marker-error") ? ds : null;
    }, "a diagnostic in the editor");
    await new Promise((r) => setTimeout(r, 1000));
    out.diagnostics = diags;
    out.refusedKeepsDefinition = inc._definition === fn1 && String(inc._definition) === text0;
    out.refusedKeepsText = view.state.doc.toString().includes("count: Ref<string>");
    (window as any).__restoreIncrement = () => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: want } });
  } catch (e) {
    out.error = String((e as Error)?.message ?? e);
  }
  return out;
});
if (ed.error) report(false, `editor: ${ed.error}`);
if (shot) {
  await A.page.locator(".cm-editor").first().scrollIntoViewIfNeeded().catch(() => {});
  await A.page.locator(".cm-lintRange-error").first().hover().catch(() => {});
  await A.page.waitForTimeout(500);
  await A.page.screenshot({ path: shot });
}
await A.page.evaluate(() => (window as any).__restoreIncrement?.());
report(ed.showsTyped === true, `editor: increment opens as typed SoundScript source: ${JSON.stringify(ed.shown)}`);
report(ed.unchangedSameText && ed.unchangedSamePid && ed.unchangedOneVariable && ed.docAfterSave, `editor: unchanged save redefines increment with the same text and pid, one variable (${ed.unchangedSameText}, ${ed.unchangedSamePid}, ${ed.unchangedOneVariable}, ${ed.docAfterSave})`);
await counterClick(A.page, "after the unchanged save");
await testsPass(A.page, "after the unchanged save");
report(Array.isArray(ed.diagnostics) && ed.diagnostics.some((d: string) => d.includes("[inject-ref]")), `editor: Ref<string> shows a diagnostic: ${JSON.stringify(ed.diagnostics)}`);
report(ed.refusedKeepsDefinition === true && ed.refusedKeepsText === true, `editor: the refused save keeps increment's definition and the typed text (${ed.refusedKeepsDefinition}, ${ed.refusedKeepsText})`);

// a new cell whose typed source starts with `export`, through the editor's compile_and_update; removed again before the export
const fresh = await A.page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const ssMod = rt.mains.get("@tomlarkworthy/soundscript");
  const find = (name: string, mod?: any) => [...rt._variables].find((v: any) => v._name === name && (!mod || v._module === mod));
  const cau = find("compile_and_update")._value;
  const anchor = find("half", ssMod);
  const vars: any[] = [];
  const back = await cau("export const tripled = (width: number) => width * 3;", vars, { module: { module: ssMod }, variables: [anchor] });
  const v = find("tripled", ssMod);
  const value = v ? await ssMod.value("tripled") : undefined;
  const order = [...rt._variables];
  const out = { back, value, afterAnchor: !!v && order.indexOf(v) === order.indexOf(anchor) + 1, held: vars.length === 1 && vars[0] === v };
  v?.delete();
  return out;
});
report(fresh.back === "export const tripled = (width: number) => width * 3;" && fresh.value === 1920 && fresh.afterAnchor && fresh.held, `editor: a new export cell is applied as SoundScript after its anchor: ${JSON.stringify(fresh)}`);

// --- 4: export, reopen, export again
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
const ssSource = (page: Page) => page.evaluate((name) => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get(name);
  return [...rt._variables].find((v: any) => v._module === mod && v._name === "ss_check")._value(mod).source as string;
}, NAME);
const ssLines = (html: string) => (blockContent(html, NAME) ?? "").split("\n").filter((l) => l.includes('/*{lang:"ss"}*/')).sort();

const sourceA = await ssSource(A.page);
const exp1 = await exportPage(A.page);
const exp1Path = join(SCRATCH, "export-1.html");
writeFileSync(exp1Path, exp1);
const orig = readFileSync(file, "utf8");
const lA = ssLines(orig), l1 = ssLines(exp1);
report(lA.length > 0 && JSON.stringify(lA) === JSON.stringify(l1), `export: ${l1.length} SoundScript definition lines, identical to the original file's ${lA.length}`);
report(exp1.includes("/*ss:: Ref<number>*/"), "export: the type comments are in the exported module");
console.log(`  original page: page errors ${A.errors.length}${A.errors.length ? ": " + A.errors.slice(0, 3).join(" | ") : ""}; aborted ${A.blocked.length}`);
await A.page.close();

const B = await open(exp1Path);
await testsPass(B.page, "reopened export");
await counterClick(B.page, "reopened export");
const sourceB = await ssSource(B.page);
report(sourceA === sourceB, `reopened export: the module's SoundScript source decompiles to the same ${sourceA.length} chars`);
const exp2 = await exportPage(B.page);
writeFileSync(join(SCRATCH, "export-2.html"), exp2);
report(blockContent(exp1, NAME) === blockContent(exp2, NAME), "second export: the module block equals the first export's");
console.log(`  reopened page: page errors ${B.errors.length}${B.errors.length ? ": " + B.errors.slice(0, 3).join(" | ") : ""}; aborted ${B.blocked.length}`);
await browser.close();
process.exit(failed ? 1 : 0);
