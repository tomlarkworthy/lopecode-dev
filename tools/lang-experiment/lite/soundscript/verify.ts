// bun lite/soundscript/verify.ts [notebook.html] [--shot file.png] [--no-variant] [--ui-only]
// Headless Chromium, every non-file request aborted. Opens soundscript.html (default
// lopebooks/notebooks/soundscript.html) with its own default layout, then:
//  1. every test cell of the core, the tutorial and the four section modules, and editor-5's
//     test_e5_language_hook; one instance of the core, one ss_registration;
//  2. the live counter: a real click on "add one";
//  3. the editor fork on the tutorial's `increment` (synthetic events): typed source shown, an
//     unchanged save keeps text and pid, Ref<string> shows a diagnostic and is refused;
//  4. export with exporter-3, reopen, run 1 and 2 there, compare SoundScript definitions, block ids
//     and decompiled source, export again and compare the module blocks; then, on the original page,
//     delete `subscriptions` while Breakout plays and check the clock stops;
//  5. real Playwright clicks and keys on a fresh page: tally renders as one cell and its hotbar opens
//     the ref source; a typed refused edit and a typed applied edit of `width`; a cell added with the
//     hotbar's add button; Save in place from the lopepage menu (showSaveFilePicker is stubbed to
//     write .scratch/saved.html); the saved file reopened with the edits in it;
//  6. the core without the tutorial (build.ts --no-tutorial into .scratch/): core tests, the editor
//     on `bump`, a new cell, a ref made plain and a ref again, export, reopen.
// No request to /@tomlarkworthy/ or api.observablehq.com may be made (a stripped module fetched).
// The notebook file itself is never written.
import { chromium, type Page } from "../../../../node_modules/playwright/index.mjs";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  "test_examples_check_as_expected", "test_compile_pool_matches_main", "test_compile_refuses_unchecked", "test_breakout_subscriptions", "test_breakout_memo", "benchmark", "test_ss_results"];

const browser = await chromium.launch();
async function open(path: string, saveTo?: string) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  if (saveTo) await stubPicker(page, saveTo);
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


// --- real user paths: Playwright mouse and keyboard on the editor and the lopepage menu
const SECTIONS = ["@tomlarkworthy/soundscript-reducer", "@tomlarkworthy/soundscript-model", "@tomlarkworthy/soundscript-workers", "@tomlarkworthy/soundscript-breakout"];
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
  await host.locator(".cm-content").first().click();
  await page.keyboard.press(`${MOD}+KeyA`);
  await page.keyboard.insertText(text);
  await page.keyboard.press("Shift+Enter");
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
  await page.waitForSelector(`.cm-lintRange-error`, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  const diag = await page.evaluate(() => [...document.querySelectorAll(".cm-lintRange-error")].length);
  report((await defOf(page, TUTORIAL, "width")) === w0 && diag > 0, `ui: a typed width = "640" plus Shift-Enter is refused with a diagnostic (${diag} marks), width unchanged`);
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
  const NEW = "export const quadrupled = (width: number) => width * 4;";
  await typeInto(page, page.locator('[data-verify="new"]'), NEW);
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
// deleting the cell that holds a subscription stops it (the runtime does not resolve its invalidation)
async function deleteStops(page: Page) {
  const r = await page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get("@tomlarkworthy/soundscript-breakout");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === mod && v._name === n);
    const ss = [...rt._variables].find((v: any) => v._name === "ss" && v._module === rt.mains.get("@tomlarkworthy/soundscript"))._value;
    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
    get("toggle")._value();
    await wait(400);
    const playing = ss.running();
    get("subscriptions").delete();
    await wait(600);
    const w1 = get("world")._value;
    await wait(300);
    return { playing, after: ss.running(), still: get("world")._value === w1 };
  });
  report(r.playing === 1 && r.after === 0 && r.still, `deleting subscriptions while playing stops the clock: running ${r.playing} -> ${r.after}, world unchanged ${r.still}`);
}
const stubPicker = async (page: Page, saved: string) => {
  await page.exposeFunction("__verifySave", (s: string) => writeFileSync(saved, s));
  await page.addInitScript(() => {
    (window as any).showSaveFilePicker = async () => ({ name: "saved.html", createWritable: async () => { let buf = ""; return { write: async (s: string) => { buf += s; }, close: async () => (window as any).__verifySave(buf) }; } });
  });
};

// --- 1-3: the notebook
const uiOnly = process.argv.includes("--ui-only");
const A = uiOnly ? null as any : await open(file);
if (!uiOnly) {
await testsPass(A.page, "original", CORE, CORE_TESTS);
await testsPass(A.page, "original", TUTORIAL, TUTORIAL_TESTS);
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
await deleteStops(A.page);
requests("original page", A);
await A.page.close();


const B = await open(exp1Path);
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
rmSync(savedPath, { force: true });
const E = await open(file, savedPath);
await testsPass(E.page, "ui", CORE, CORE_TESTS);
await uiPaths(E.page, savedPath);
requests("ui page", E);
await E.page.close();
if (existsSync(savedPath)) {
  const F = await open(savedPath);
  // the edits change width and add a cell, so the two tests that pin section 1's values and the verdict list are left out
  await testsPass(F.page, "reload after save", TUTORIAL, TUTORIAL_TESTS.filter((t) => !["test_ss_module_checks", "test_half", "test_ss_results"].includes(t)));
  await afterReload(F.page);
  requests("reloaded saved page", F);
  await F.page.close();
}
// --- 5: the core without the tutorial
if (!uiOnly && !process.argv.includes("--no-variant")) {
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
  // a generator becomes a Source handle when a cell takes it as Source<T>, and a plain generator again
  // when that cell is deleted outside apply (as the editor's delete button does)
  const src = await C.page.evaluate(async () => {
    const rt = (window as any).__ojs_runtime, core = rt.mains.get("@tomlarkworthy/soundscript");
    const get = (n: string) => [...rt._variables].find((v: any) => v._module === core && v._name === n);
    const lang = get("ss_language")._value;
    const kind = () => /kind: "(\w+)"/.exec(String(get("pulse")?._definition))?.[1];
    const out: any = {};
    out.gen = await lang.apply("export const pulse = function* () { while (true) yield 1; };", [], { module: { module: core }, variables: [get("tripled")] });
    out.before = kind();
    out.consumer = await lang.apply("export const pulses = (pulse: Source<number>) => [];", [], { module: { module: core }, variables: [get("pulse")] });
    out.withConsumer = kind();
    get("pulses").delete();
    for (let i = 0; i < 50 && kind() !== "cell"; i++) await new Promise((r) => setTimeout(r, 100));
    out.afterDelete = kind();
    out.roundtrip = get("ss_roundtrip")._value(core);
    get("pulse").delete();
    await new Promise((r) => setTimeout(r, 300));
    return out;
  });
  report(src.before === "cell" && src.withConsumer === "source" && src.afterDelete === "cell" && typeof src.roundtrip === "number" && typeof src.consumer === "string", `core-only: pulse is compiled as a source while pulses takes it as Source<number>, and as a plain generator after pulses is deleted: ${JSON.stringify(src)}`);
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
    const flag = get("viewof flag") && get("flag") ? lang.decompile([get("flag")]) : null;
    return { present: true, typed: text === NEW, verdict, editorSource: await lang.decompile([v]), value: await core.value("tripled"), flag: await flag, roundtrip: get("ss_roundtrip")._value(core) };
  }, NEW);
  report(after.flag === "export const flag = (): RefCell<boolean> => ref(false);", `core-only reopened: flag is a ref cell again after export: ${after.flag}, ${after.roundtrip} variables round trip`);
  report(after.present && after.typed && after.verdict === "ok" && after.editorSource === NEW && after.value === 0, `core-only reopened: the added cell survived the export as typed source that checks: ${JSON.stringify(after)}`);
  requests("core-only reopened page", D);
  await D.page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
