// Raw cells (@tomlarkworthy/raw-cells) in the built notebook, called from verify.ts with its helpers:
//  - rawOnPage: the module's own tests, the polyglot module's values (raw depends on SoundScript and on
//    Observable JS, Observable JS on raw; SoundScript on raw is stored and rejected), the listing, copy
//    and a refused paste of compiled text, then real keys on `area`: the body, the inputs, a rename,
//    anonymous, async, a generator, a syntax error stored and repaired; a raw cell added by keys; an
//    edit kept for verify's Save in place, which follows.
//  - rawAfterSave: the saved file reopened: the edited source, the marker, still raw, the added cell.
//  - rawExport: the raw definition lines of an export equal the original file's, and the reopened
//    export decompiles to the same sources.
//  - rawUnloaded: a build without raw-cells booted (--no-raw): the editor says the language is not
//    loaded, Shift-Enter stores nothing, copy is refused, the compiled-text paste is refused.
import type { Page } from "../../../../node_modules/playwright/index.mjs";
import { blockContent } from "../../../lib/notebook-blocks.ts";
import * as acorn from "acorn";
import * as acornWalk from "acorn-walk";
import { INPUTS, langOf } from "../toolchain/ss-toolchain.ts";

export const RAW_CELLS = "@tomlarkworthy/raw-cells";
export const POLY = "@tomlarkworthy/soundscript-polyglot";
export const RAW_TESTS = ["test_raw_roundtrip", "test_raw_broken_keeps_text", "test_raw_lint", "test_raw_complete", "test_raw_translate", "raw_registration"];
export const AREA = 'define("area", ["width", "height"], function (width, height) {\n  // a raw cell: the function as written, its inputs as listed\n  return width * height;\n})';
const KEPT = 'define("area", ["width", "height"], function (width, height) {\n  // a raw cell: the function as written, its inputs as listed\n  // edited by keys, kept by the save\n  return width * height;\n})';
const PERIMETER = 'define("perimeter", ["width", "height"], (w, h) => 2 * (w + h))';

type H = {
  report: (ok: boolean, what: string) => void;
  openEditor: (page: Page, module: string, cell: string) => Promise<any>;
  typeInto: (page: Page, host: any, text: string, apply?: boolean) => Promise<void>;
  editorText: (host: any) => Promise<string>;
  diagsOf: (host: any) => Promise<string[]>;
  valueOf: (page: Page, module: string, cell: string) => Promise<any>;
  tagEditor: (page: Page, module: string, cell: string) => Promise<string | null>;
  until: (page: Page, f: () => Promise<boolean>, ms?: number) => Promise<boolean>;
  testsPass: (page: Page, label: string, name: string, tests: string[], expectErrors?: string[]) => Promise<void>;
};

// the source of a polyglot cell as its language decompiles it, its tag, and its definition
const rawState = (page: Page, cell: string | null, pid?: string) => page.evaluate(async ([poly, cell, pid]) => {
  const rt = (window as any).__ojs_runtime, mod = rt.mains.get(poly);
  // computed on demand: with raw-cells not loaded nothing else may have observed langTag
  const get = async (n: string) => { const x = [...rt._variables].find((v: any) => v._name === n && v._type === 1); return x._value ?? await x._module.value(n); };
  const v = [...rt._variables].find((v: any) => v._module === mod && (pid ? v.pid === pid : v._name === cell));
  if (!v) return null;
  const langTag = await get("langTag");
  const lang = (await get("languageOf"))([v]);
  let source = null;
  try { source = lang ? await lang.decompile([v]) : null; } catch {}
  return { name: v._name, pid: v.pid, tag: langTag(v._definition), lang: lang?.id ?? null, source, definition: String(v._definition), inputs: v._inputs.map((i: any) => i._name) };
}, [POLY, cell, pid ?? null] as const);

// the editor of the polyglot variable with this pid, opened; a rename or an anonymous label can give the
// cell a new editor, so each step looks it up again
let pidTagN = 0;
async function editorByPid(page: Page, h: H, pid: string) {
  const tag = await page.evaluate(async ([poly, pid, tag]) => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get(poly);
    const v = [...rt._variables].find((v: any) => v._module === mod && v.pid === pid);
    const editors = [...rt._variables].find((v: any) => v._name === "editors")?._value;
    for (let i = 0; i < 150; i++) {
      const host = editors?.get(v);
      if (host?.querySelector(".hotbar")) { host.setAttribute("data-verify", tag); host.scrollIntoView({ block: "center" }); return tag; }
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  }, [POLY, pid, `raw${++pidTagN}`] as const);
  if (!tag) return null;
  const host = page.locator(`[data-verify="${tag}"]`);
  if (!(await host.locator(".cm-editor").count())) await host.locator(".hotbar").first().click();
  await host.locator(".cm-editor").first().waitFor({ timeout: 10000 });
  return host;
}

const tab = (page: Page, m: string) => page.locator(`[title="${m}  (drag to a pane edge to dock, or out to save as .js)"]`).first().click();

// copy of a cell through the editor's copy button, and a paste of compiled text onto it
const copyPaste = (page: Page, cell: string) => page.evaluate(async ([poly, cell]) => {
  const rt = (window as any).__ojs_runtime, mod = rt.mains.get(poly);
  const find = (n: string, m?: any) => [...rt._variables].find((v: any) => v._name === n && (!m || v._module === m));
  const until = async (fn: () => any, what: string, ms = 15000) => { const t0 = Date.now(); for (;;) { const g = await fn(); if (g) return g; if (Date.now() - t0 > ms) throw new Error(`${what} not reached in ${ms} ms`); await new Promise((r) => setTimeout(r, 50)); } };
  const warns: string[] = [], copied: string[] = [];
  const warn0 = console.warn, setData0 = DataTransfer.prototype.setData;
  console.warn = (...a: any[]) => { warns.push(String(a[0]?.message ?? a[0])); return warn0(...a); };
  DataTransfer.prototype.setData = function (t: string, d: string) { if (t === "text/plain") copied.push(d); return setData0.call(this, t, d); };
  const v = find(cell, mod), def0 = String(v._definition);
  const clip = [{ mode: "js", value: `${cell} = function/*{lang:"raw"}*/ () { return 1; }` }];
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { read: async () => [{ types: ["application/vnd.observablehq+json"], getType: async () => new Blob([JSON.stringify(clip)]) }], write: async () => {}, writeText: async () => {} } });
  const out: any = {};
  try {
    const host = await until(() => find("editors")?._value?.get(v)?.querySelector(".hotbar") && find("editors")._value.get(v), `an editor bar beside ${cell}`);
    if (!host.querySelector(".toolbar")?.offsetParent) host.querySelector(".hotbar").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await until(() => host.querySelector(".toolbar")?.offsetParent, "the toolbar");
    const press = (t: string) => ([...host.querySelectorAll(".toolbar button")].find((x: any) => x.textContent.includes(t)) as HTMLButtonElement).click();
    const findCell = find("findCell")._value;
    await until(() => findCell(v)?.module?.module, `the cell map holding ${cell}`);
    let w0 = warns.length;
    press("📄");
    await until(() => copied.length || warns.length > w0, "a copy or its refusal");
    out.copied = copied[0] ?? null;
    out.copyWarn = warns.slice(w0).join(" | ");
    w0 = warns.length;
    press("📋");
    await until(() => warns.length > w0, "the paste refusal");
    out.pasteWarn = warns.slice(w0).join(" | ");
    out.unchanged = String(find(cell, mod)._definition) === def0;
  } catch (e) { out.error = String((e as Error)?.message ?? e); }
  finally { console.warn = warn0; DataTransfer.prototype.setData = setData0; }
  return out;
}, [POLY, cell] as const);

export async function rawOnPage(page: Page, h: H, label: string) {
  const { report, valueOf, until } = h;
  await h.testsPass(page, label, RAW_CELLS, RAW_TESTS);
  await h.testsPass(page, label, POLY, ["area", "squares", "report", "summary", "doubledWidth"]);
  const v0 = { area: await valueOf(page, POLY, "area"), squares: await valueOf(page, POLY, "squares"), report: await valueOf(page, POLY, "report"), doubled: await valueOf(page, POLY, "doubledWidth") };
  const summary = await page.evaluate((poly) => { const rt = (window as any).__ojs_runtime; return rt.mains.get(poly)._scope.get("summary")?._value?.textContent ?? null; }, POLY);
  report(v0.area === 12 && v0.squares === 144 && v0.report === "area 12, last square 144" && v0.doubled === 8 && summary?.startsWith("area 12, last square 144;"),
    `${label}: raw area reads SoundScript width and Observable JS height, raw squares is a generator, raw report is async, Observable JS summary reads raw: ${JSON.stringify({ ...v0, summary })}`);
  const a0 = await rawState(page, "area");
  report(a0?.lang === "raw" && a0.source === AREA && a0.definition.startsWith('function/*{lang:"raw"}*/ (width, height)'), `${label}: area is a raw cell whose source decompiles exactly: ${JSON.stringify(a0?.source)}`);
  // SoundScript reads a raw cell through an annotated parameter, checked when the value crosses: fromRaw is area + 1
  const ssOnRaw = await page.evaluate(async (poly) => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get(poly);
    let value; try { value = await mod.value("fromRaw"); } catch (e) { value = "THREW " + (e as Error).message; }
    const v = [...rt._variables].find((v: any) => v._name === "fromRaw" && v._module === mod);
    return { value, area: await mod.value("area"), definition: String(v?._definition) };
  }, POLY);
  // the compiled definition calls ss_cross(area, {"k":"num"}, ...): the value of area crosses as a number
  const tagged = langOf(ssOnRaw.definition) === "ss";
  let crosses = false;
  try {
    acornWalk.simple(acorn.parse(`(${ssOnRaw.definition})`, { ecmaVersion: "latest" }), {
      CallExpression(n: any) {
        const [a, shape] = n.arguments;
        if (n.callee.type === "Identifier" && n.callee.name === INPUTS.cross && a?.type === "Identifier" && a.name === "area" && shape?.type === "ObjectExpression"
          && shape.properties.some((p: any) => (p.key.value ?? p.key.name) === "k" && p.value.value === "num")) crosses = true;
      },
    });
  } catch {}
  report(ssOnRaw.value === 13 && tagged && crosses && ssOnRaw.area === 12, `${label}: the page's SoundScript cell fromRaw reads raw area, checked as a number on the way in: ${JSON.stringify({ value: ssOnRaw.value, area: ssOnRaw.area, tagged, crosses })}`);
  // the listing: SoundScript and raw cells, each in its own language's colours
  await until(page, async () => !!(await page.evaluate((poly) => (window as any).__ojs_runtime.mains.get(poly)._scope.get("polyglot_listing")?._value?.textContent?.includes('define("report"'), POLY)), 10000);
  const listing = await page.evaluate((poly) => { const rt = (window as any).__ojs_runtime; const pre = rt.mains.get(poly)._scope.get("polyglot_listing")?._value; return pre ? { text: pre.textContent, spans: pre.querySelectorAll("span[class^=tok-]").length } : null; }, POLY);
  report(!!listing && listing.text.includes(AREA) && listing.text.includes("const width = () => 4;") && listing.text.includes('define("report", ["area", "squares"], async') && listing.text.includes("const fromRaw = (area: number) => area + 1;") && !listing.text.includes("Inputs.range") && !listing.text.includes("summary") && listing.spans > 20, `${label}: cellListing shows the raw sources beside the SoundScript ones, coloured (${listing?.spans} spans), with fromRaw, and without viewof height or summary`);

  await tab(page, POLY);
  const cp = await copyPaste(page, "area");
  report(!cp.error && cp.copied === AREA && /is a compiled cell, not source/.test(cp.pasteWarn) && cp.unchanged, `${label}: copy of raw area puts its source on the clipboard; compiled text pasted onto it is refused and the cell is unchanged: ${JSON.stringify(cp).slice(0, 300)}`);

  // real keys on area
  const host = await h.openEditor(page, POLY, "area");
  if (!host) { report(false, `${label}: no editor for area`); return; }
  const shown = await h.editorText(host);
  report(shown === AREA, `${label}: area's editor shows its source as written: ${JSON.stringify(shown)}`);
  const pid = a0!.pid;
  const step = async (what: string, text: string, ok: (s: any, value: any) => boolean, cell: string | null = "area") => {
    const host = await editorByPid(page, h, pid);
    if (!host) { report(false, `${label}: by keys, ${what}: no editor for the cell`); return; }
    // the last step's lint tooltip, under the pointer, would take the click
    await page.mouse.move(0, 0);
    await h.typeInto(page, host, text);
    let s: any = null, value: any = null;
    await until(page, async () => { s = await rawState(page, null, pid); return s?.source === text; }, 10000);
    value = cell ? await valueOf(page, POLY, cell) : null;
    report(s?.source === text && s.pid === pid && s.tag === "raw" && ok(s, value), `${label}: by keys, ${what}: ${JSON.stringify({ name: s?.name, inputs: s?.inputs, value })}`);
  };
  await step("an edit of the body", AREA.replace("return width * height;", "return width * height * 10;"), (_, v) => v === 120);
  await step("a change of the inputs", 'define("area", ["height"], (height) => height * 100)', (s, v) => v === 300 && JSON.stringify(s.inputs) === '["height"]');
  await step("a rename (the same variable)", 'define("surface", ["height"], (height) => height * 100)', (s, v) => s.name === "surface" && v === 300, "surface");
  const gone = await valueOf(page, POLY, "squares");
  report(/^THREW area is not defined/.test(String(gone)), `${label}: after the rename, squares reads a name nothing defines: ${JSON.stringify(gone)}`);
  await step("made anonymous", 'define(null, ["height"], (height) => height * 100)', (s) => s.name === null, null);
  await step("an async function", 'define("area", ["width", "height"], async (width, height) => {\n  await null;\n  return width * height;\n})', (_, v) => v === 12);
  await step("a generator function", 'define("area", ["width", "height"], function* (width, height) {\n  yield width * height;\n})', (_, v) => v === 12);
  // a syntax error: stored, the variable raises it, the text is kept
  const BROKEN = 'define("area", ["width", "height"], function (width, height) {\n  return width * ;\n})';
  const bhost = (await editorByPid(page, h, pid))!;
  await page.mouse.move(0, 0);
  await h.typeInto(page, bhost, BROKEN);
  let sb: any = null;
  await until(page, async () => { sb = await rawState(page, null, pid); return sb?.source === BROKEN; }, 10000);
  const vb = await valueOf(page, POLY, "area");
  await until(page, async () => (await h.diagsOf(bhost)).some((d) => /Unexpected token/.test(d)), 5000);
  const db = await h.diagsOf(bhost);
  report(sb?.source === BROKEN && sb.name === "area" && sb.tag === "raw" && /^THREW Unexpected token/.test(String(vb)) && db.some((d) => /Unexpected token/.test(d)), `${label}: by keys, a syntax error is stored with its text; area raises it and the editor shows it: ${JSON.stringify({ value: vb, diags: db })}`);
  await step("the syntax error repaired, the kept text saved", KEPT, (_, v) => v === 12);
  // squares yields one value per animation frame, so it reaches 144 after twelve
  await until(page, async () => (await valueOf(page, POLY, "report")) === "area 12, last square 144", 10000);
  const after = { squares: await valueOf(page, POLY, "squares"), report: await valueOf(page, POLY, "report") };
  report(after.squares === 144 && after.report === "area 12, last square 144", `${label}: its readers run again: ${JSON.stringify(after)}`);

  // a raw cell added by keys after report
  const t = await h.tagEditor(page, POLY, "report");
  if (!t) { report(false, `${label}: no editor for report`); return; }
  await page.locator(`[data-verify="${t}"] .add-cell-btn`).first().click();
  await page.waitForFunction(() => [...document.querySelectorAll(".cm-editor")].some((e) => (e.querySelector(".cm-content")?.textContent ?? "").trim() === "{}"), null, { timeout: 15000 }).catch(() => {});
  const ok = await page.evaluate(() => { const e = [...document.querySelectorAll(".cm-editor")].filter((e) => (e.querySelector(".cm-content")?.textContent ?? "").trim() === "{}").at(-1); if (!e) return false; e.setAttribute("data-verify", "raw-new"); return true; });
  if (!ok) { report(false, `${label}: the add button made no empty cell editor`); return; }
  await h.typeInto(page, page.locator('[data-verify="raw-new"]'), PERIMETER);
  await until(page, async () => (await valueOf(page, POLY, "perimeter")) === 14, 10000);
  const pn = await rawState(page, "perimeter");
  const placed = await page.evaluate((poly) => { const rt = (window as any).__ojs_runtime, mod = rt.mains.get(poly); const n = [...rt._variables].filter((v: any) => v._module === mod).map((v: any) => v._name); return n[n.indexOf("perimeter") - 1]; }, POLY);
  report((await valueOf(page, POLY, "perimeter")) === 14 && pn?.lang === "raw" && pn.source === PERIMETER && placed === "report", `${label}: a raw cell added with the add button and typed: perimeter ${await valueOf(page, POLY, "perimeter")}, after ${placed}, ${pn?.lang}`);
}

export async function rawAfterSave(page: Page, h: H, label: string) {
  await h.testsPass(page, label, POLY, ["area", "perimeter", "summary"]);
  const a = await rawState(page, "area"), p = await rawState(page, "perimeter");
  h.report(a?.source === KEPT && a.lang === "raw" && a.definition.includes('/*{lang:"raw"}*/') && p?.source === PERIMETER && (await h.valueOf(page, POLY, "perimeter")) === 14,
    `${label}: the saved file reopened holds the keyed edit of area and the added perimeter, both raw: ${JSON.stringify({ area: a?.source, perimeter: p?.source })}`);
}

const rawLines = (html: string) => (blockContent(html, POLY) ?? "").split("\n").filter((l) => l.includes('/*{lang:"raw"}*/'));
export async function rawExport(h: H, orig: string, exported: string, page: Page | null, sourcesBefore: Record<string, string> | null) {
  const a = rawLines(orig), b = rawLines(exported);
  h.report(a.length === 3 && JSON.stringify(a) === JSON.stringify(b), `export: ${POLY}: ${b.length} raw definition lines, identical to the original file's ${a.length}`);
  if (!page) return null;
  const now: Record<string, string> = {};
  for (const n of ["area", "squares", "report"]) now[n] = (await rawState(page, n))?.source ?? "";
  if (sourcesBefore) h.report(JSON.stringify(now) === JSON.stringify(sourcesBefore), `reopened export: the three raw cells decompile to the same sources and are still raw`);
  return now;
}

export async function rawUnloaded(page: Page, h: H, label: string) {
  const { report } = h;
  // booted: area has its value and the editor (which imports langTag and languageOf) is there
  const area = await h.valueOf(page, POLY, "area");
  await page.waitForFunction(() => [...(window as any).__ojs_runtime._variables].some((v: any) => v._name === "editors" && v._value), null, { timeout: 60000 });
  const regs = await page.evaluate(() => [...(window as any).__ojs_runtime._variables].filter((v: any) => v._name === "raw_registration").length);
  const a0 = await rawState(page, "area");
  report(regs === 0 && a0?.tag === "raw" && a0.lang === null && area === 12, `${label}: raw-cells is not loaded; area is tagged raw, has no language and still runs: ${JSON.stringify({ regs, tag: a0?.tag })}`);
  const readListing = () => page.evaluate((poly) => (window as any).__ojs_runtime.mains.get(poly)._scope.get("polyglot_listing")?._value?.textContent ?? null, POLY);
  await h.until(page, async () => !!(await readListing()), 10000);
  const listing = await readListing();
  report(listing !== null && !listing.includes("define(") && listing.includes("const width"), `${label}: cellListing leaves out the raw cells, whose language is not loaded: ${JSON.stringify(listing?.slice(0, 200))}`);
  await tab(page, POLY);
  const cp = await copyPaste(page, "area");
  report(!cp.error && cp.copied === null && /not copied/.test(cp.copyWarn) && /is a compiled cell, not source/.test(cp.pasteWarn) && cp.unchanged, `${label}: copy of area is refused and the compiled-text paste is refused: ${JSON.stringify(cp).slice(0, 300)}`);
  const host = await h.openEditor(page, POLY, "area");
  if (!host) { report(false, `${label}: no editor for area`); return; }
  const shown = await h.editorText(host);
  await h.until(page, async () => (await h.diagsOf(host)).length > 0, 10000);
  const diags = await h.diagsOf(host);
  const said1 = await refusedApply(page, h, host, 'define("area", [], () => 1)');
  const a1 = await rawState(page, "area");
  report(said1.some((m) => /language is not loaded/.test(m)) && a1?.definition === a0?.definition && diags.some((d) => /"raw" cell and that language is not loaded/.test(d)) && shown !== AREA && !shown.startsWith("define("),
    `${label}: the editor on area shows the Observable JS decompilation, not its source, says the language is not loaded, and Shift-Enter stores nothing: ${JSON.stringify({ diags, shown: shown.slice(0, 80) })}`);
  // the picker shows the tag it cannot load, and picking Observable JavaScript does not let Shift-Enter write over the cell
  const shownLang = await pickerValue(host);
  await pickByKey(page, host, "O");
  const picked = await pickerValue(host);
  const said2 = await refusedApply(page, h, host, "area = 1");
  const a2 = await rawState(page, "area");
  report(shownLang === "raw" && picked === "ojs" && said2.some((m) => /language is not loaded/.test(m)) && a2?.definition === a0?.definition && (await h.valueOf(page, POLY, "area")) === 12,
    `${label}: the picker on area shows raw (not loaded); picking Observable JavaScript by key and pressing Shift-Enter still stores nothing: ${JSON.stringify({ shownLang, picked, same: a2?.definition === a0?.definition })}`);
}

// the editor says "not saved: ..." with console.warn when Shift-Enter stores nothing; a refused apply is
// waited for by that message, not by a delay
const notSaved = (page: Page) => page.evaluate(() => {
  const w = window as any;
  if (!w.__notSaved) {
    w.__notSaved = [];
    const warn0 = console.warn;
    console.warn = (...a: any[]) => { const m = String(a[0]?.message ?? a[0]); if (/^not saved/.test(m)) w.__notSaved.push(m); return warn0(...a); };
  }
  return w.__notSaved.slice() as string[];
});
async function refusedApply(page: Page, h: any, host: any, text: string) {
  const n = (await notSaved(page)).length;
  await h.typeInto(page, host, text);
  await h.until(page, async () => (await notSaved(page)).length > n, 10000);
  return (await notSaved(page)).slice(n);
}

// the language picker in an open editor's header line, read and set with real keys
const pickerValue = (host: any) => host.locator("select.e5-cell-language").first().evaluate((s: HTMLSelectElement) => s.value).catch(() => null);
async function pickByKey(page: Page, host: any, key: string) {
  const sel = host.locator("select.e5-cell-language").first();
  await sel.focus();
  await page.keyboard.press(key);
}
// the empty editor the add button makes after cell, tagged so it can be found again
let addN = 0;
async function addAfter(page: Page, h: H, cell: string) {
  const t = await h.tagEditor(page, POLY, cell);
  if (!t) return null;
  const host0 = page.locator(`[data-verify="${t}"]`);
  if (!(await host0.locator(".cm-editor").count())) await host0.locator(".hotbar").first().click();
  await host0.locator(".add-cell-btn").first().click();
  const tag = `pick${++addN}`;
  const ok = await page.waitForFunction((tag) => {
    const e = [...document.querySelectorAll(".cm-editor")].filter((e) => (e.querySelector(".cm-content")?.textContent ?? "").trim() === "{}").at(-1);
    if (!e) return false;
    let n: Element | null = e;
    while (n && !n.querySelector(".hotbar")) n = n.parentElement;
    (n ?? e).setAttribute("data-verify", tag);
    return true;
  }, tag, { timeout: 15000 }).then(() => true).catch(() => false);
  return ok ? page.locator(`[data-verify="${tag}"]`) : null;
}
const pidOf = (page: Page, cell: string) => page.evaluate(([poly, cell]) => { const rt = (window as any).__ojs_runtime, mod = rt.mains.get(poly); return [...rt._variables].find((v: any) => v._module === mod && v._name === cell)?.pid ?? null; }, [POLY, cell] as const);

// The language picker, with real keys (2026-11-15): a new cell takes the language of the cell it is added
// after; picking a language changes how the next Shift-Enter reads the text; the pick is dropped when the
// editor closes; typed text switches language only when one registered language claims it and Observable
// JavaScript rejects it.
export async function pickerPaths(page: Page, h: H, label: string) {
  const { report, until, valueOf } = h;
  // after a SoundScript cell
  const a = await addAfter(page, h, "doubledWidth");
  if (!a) { report(false, `${label}: no new editor after doubledWidth`); return; }
  const aLang = await pickerValue(a);
  await h.typeInto(page, a, "const k = () => 1");
  await until(page, async () => (await valueOf(page, POLY, "k")) === 1, 10000);
  const k1 = await rawState(page, "k");
  report(aLang === "ss" && k1?.tag === "ss" && (await valueOf(page, POLY, "k")) === 1, `${label}: a cell added after doubledWidth shows SoundScript in its picker, and const k = () => 1 is stored as SoundScript: ${JSON.stringify({ aLang, tag: k1?.tag, source: k1?.source })}`);
  // after an Observable JavaScript cell
  const b = await addAfter(page, h, "summary");
  if (!b) { report(false, `${label}: no new editor after summary`); return; }
  const bLang = await pickerValue(b);
  // define(...) parses as Observable JavaScript, so typing it does not move the picker
  await h.typeInto(page, b, 'define("k5", [], () => 5)', false);
  const bDefine = await pickerValue(b);
  await h.typeInto(page, b, "k2 = 1");
  await until(page, async () => (await valueOf(page, POLY, "k2")) === 1, 10000);
  const k2a = await rawState(page, "k2");
  report(bLang === "ojs" && bDefine === "ojs" && k2a?.tag === null && (await valueOf(page, POLY, "k2")) === 1, `${label}: a cell added after summary shows Observable JavaScript, still does with define("k5", …) typed, and k2 = 1 is stored as Observable JavaScript: ${JSON.stringify({ bLang, bDefine, tag: k2a?.tag })}`);
  // text both languages accept follows the cell it was added after: a function declaration parses as
  // Observable JavaScript, and after a SoundScript cell it is stored as SoundScript
  const c = await addAfter(page, h, "doubledWidth");
  if (!c) { report(false, `${label}: no second new editor after doubledWidth`); return; }
  await h.typeInto(page, c, "function k3(width) { return width + 1; }");
  await until(page, async () => (await valueOf(page, POLY, "k3")) === 5, 10000);
  const k3s = await rawState(page, "k3");
  report(k3s?.tag === "ss" && (await valueOf(page, POLY, "k3")) === 5, `${label}: function k3(width) added after doubledWidth is SoundScript: ${JSON.stringify({ tag: k3s?.tag, value: await valueOf(page, POLY, "k3") })}`);
  // a claim replaces a new cell's default: after the raw cell report, const text is SoundScript, since
  // Observable JavaScript rejects it and only SoundScript claims it
  const d = await addAfter(page, h, "report");
  if (!d) { report(false, `${label}: no new editor after report`); return; }
  const dLang = await pickerValue(d);
  // the picker follows the typed text before Shift-Enter
  await h.typeInto(page, d, "export const k4 = (width: number) => width * 10", false);
  await until(page, async () => (await pickerValue(d)) === "ss", 3000);
  const dTyped = await pickerValue(d);
  await h.typeInto(page, d, "export const k4 = (width: number) => width * 10");
  await until(page, async () => (await valueOf(page, POLY, "k4")) === 40, 10000);
  const k4s = await rawState(page, "k4");
  report(dLang === "raw" && dTyped === "ss" && k4s?.tag === "ss" && (await valueOf(page, POLY, "k4")) === 40, `${label}: after report the picker shows raw, switches to SoundScript as export const k4 = … is typed, and the cell is stored as SoundScript: ${JSON.stringify({ dLang, dTyped, tag: k4s?.tag, source: k4s?.source })}`);
  const k2pid = await pidOf(page, "k2"), kpid = await pidOf(page, "k");
  // Observable JavaScript to SoundScript, by the picker
  let e = await editorByPid(page, h, k2pid);
  await pickByKey(page, e, "S");
  const toSs = await pickerValue(e);
  await h.typeInto(page, e, "const k2 = () => 2");
  await until(page, async () => (await valueOf(page, POLY, "k2")) === 2, 10000);
  const k2b = await rawState(page, "k2");
  report(toSs === "ss" && k2b?.tag === "ss" && k2b.pid === k2pid && (await valueOf(page, POLY, "k2")) === 2, `${label}: k2 picked as SoundScript by key is stored as SoundScript with its pid: ${JSON.stringify({ toSs, tag: k2b?.tag, source: k2b?.source })}`);
  // and back
  e = await editorByPid(page, h, k2pid);
  const nowSs = await pickerValue(e);
  await pickByKey(page, e, "O");
  await h.typeInto(page, e, "k2 = 3");
  await until(page, async () => (await valueOf(page, POLY, "k2")) === 3, 10000);
  const k2c = await rawState(page, "k2");
  report(nowSs === "ss" && k2c?.tag === null && k2c.pid === k2pid && (await valueOf(page, POLY, "k2")) === 3, `${label}: k2 picked back to Observable JavaScript is stored as Observable JavaScript: ${JSON.stringify({ nowSs, tag: k2c?.tag })}`);
  // SoundScript to raw
  e = await editorByPid(page, h, kpid);
  await pickByKey(page, e, "r");
  const toRaw = await pickerValue(e);
  await h.typeInto(page, e, 'define("k", [], () => 5)');
  await until(page, async () => (await valueOf(page, POLY, "k")) === 5, 10000);
  const k3 = await rawState(page, "k");
  report(toRaw === "raw" && k3?.tag === "raw" && k3.lang === "raw" && k3.source === 'define("k", [], () => 5)' && (await valueOf(page, POLY, "k")) === 5, `${label}: k picked as raw by key is stored as a raw cell: ${JSON.stringify({ toRaw, tag: k3?.tag, source: k3?.source })}`);
  // a pick for unsaved text goes when the editor closes
  // the hotbar toggles the editor, so it is opened first if an earlier step left it closed
  e = await editorByPid(page, h, k2pid);
  const cm = () => e.locator(".cm-editor").first();
  const wasOpen = await cm().isVisible();
  if (!wasOpen) { await e.locator(".hotbar").first().click(); await cm().waitFor({ state: "visible", timeout: 10000 }); }
  await pickByKey(page, e, "S");
  const before = await pickerValue(e);
  await e.locator(".hotbar").first().click();
  const closed = await cm().waitFor({ state: "hidden", timeout: 10000 }).then(() => true, () => false);
  // the header's picker is drawn again after the close dropped the pick, not in the same task
  await until(page, async () => (await pickerValue(await editorByPid(page, h, k2pid))) === "ojs", 10000);
  e = await editorByPid(page, h, k2pid);
  const after = await pickerValue(e);
  report(closed && before === "ss" && after === "ojs", `${label}: a language picked and not applied is reset when the editor is closed and opened again: ${JSON.stringify({ wasOpen, before, closed, after })}`);
  // the claim rule and the export hint, asked directly
  const asked = await page.evaluate(async (poly) => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get(poly);
    const get = (n: string) => [...rt._variables].find((v: any) => v._name === n && v._type === 1)?._value;
    const claimed = get("claimedLanguage"), cell = { module: { module: mod } };
    const lang = (src: string) => claimed(src, [], cell)?.id ?? null;
    const ss = get("cellLanguagesRef").current.find((l: any) => l.id === "ss");
    const hint = ss.lint("export const kx = () => 1;", [], cell).find((d: any) => d.severity === "hint");
    return { ssText: lang("const kx = () => 1"), ojsText: lang("kx = 1"), define: lang('define("kx", [], () => 1)'), fn: lang("function kx(a) { return a }"), hint: hint ? { from: hint.from, to: hint.to, message: hint.message, fix: hint.actions?.[0]?.name } : null };
  }, POLY);
  report(asked.ssText === "ss" && asked.ojsText === null && asked.define === null && asked.fn === null && asked.hint?.message === "export is not needed" && asked.hint.from === 0 && asked.hint.to === 7 && asked.hint.fix === "Remove export",
    `${label}: typed text is claimed only when Observable JavaScript rejects it (define(...) and function kx(a) stay Observable JavaScript), and an exported cell gets the hint "export is not needed" with a fix: ${JSON.stringify(asked)}`);
  // the cells made here are removed, so the saved file holds only the page's own
  await page.evaluate((poly) => { const rt = (window as any).__ojs_runtime, mod = rt.mains.get(poly); for (const v of [...rt._variables]) if (v._module === mod && ["k", "k2", "k3", "k4"].includes(v._name)) v.delete(); }, POLY);
}
