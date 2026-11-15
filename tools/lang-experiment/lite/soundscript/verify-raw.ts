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

export const RAW_CELLS = "@tomlarkworthy/raw-cells";
export const POLY = "@tomlarkworthy/soundscript-polyglot";
export const RAW_TESTS = ["test_raw_roundtrip", "test_raw_broken_keeps_text", "test_raw_lint", "test_raw_complete", "raw_registration"];
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
  // SoundScript cannot read a raw cell: the checker has no type for it (inject-unknown); stored, rejected, area unaffected
  const ssOnRaw = await page.evaluate(async (poly) => {
    const rt = (window as any).__ojs_runtime, mod = rt.mains.get(poly);
    const find = (n: string, m?: any) => [...rt._variables].find((v: any) => v._name === n && (!m || v._module === m));
    const vars: any[] = [];
    const back = await find("compile_and_update")._value("export const fromRaw = (area: number) => area + 1;", vars, { module: { module: mod }, variables: [find("doubledWidth", mod)] });
    let value; try { value = await mod.value("fromRaw"); } catch (e) { value = "THREW " + (e as Error).message; }
    const area = await mod.value("area");
    find("fromRaw", mod)?.delete();
    return { back, value, area };
  }, POLY);
  report(typeof ssOnRaw.back === "string" && /^THREW fromRaw does not check: \[inject-unknown\]/.test(String(ssOnRaw.value)) && ssOnRaw.area === 12, `${label}: a SoundScript cell reading raw area is stored and rejected (inject-unknown); area is unaffected: ${JSON.stringify(ssOnRaw).slice(0, 300)}`);
  // the listing: SoundScript and raw cells, each in its own language's colours
  await until(page, async () => !!(await page.evaluate((poly) => (window as any).__ojs_runtime.mains.get(poly)._scope.get("polyglot_listing")?._value?.textContent?.includes('define("report"'), POLY)), 10000);
  const listing = await page.evaluate((poly) => { const rt = (window as any).__ojs_runtime; const pre = rt.mains.get(poly)._scope.get("polyglot_listing")?._value; return pre ? { text: pre.textContent, spans: pre.querySelectorAll("span[class^=tok-]").length } : null; }, POLY);
  report(!!listing && listing.text.includes(AREA) && listing.text.includes("export const width = () => 4;") && listing.text.includes('define("report", ["area", "squares"], async') && listing.spans > 20, `${label}: cellListing shows the raw sources beside the SoundScript ones, coloured (${listing?.spans} spans)`);

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
  report(listing !== null && !listing.includes("define(") && listing.includes("export const width"), `${label}: cellListing leaves out the raw cells, whose language is not loaded: ${JSON.stringify(listing?.slice(0, 200))}`);
  await tab(page, POLY);
  const cp = await copyPaste(page, "area");
  report(!cp.error && cp.copied === null && /not copied/.test(cp.copyWarn) && /is a compiled cell, not source/.test(cp.pasteWarn) && cp.unchanged, `${label}: copy of area is refused and the compiled-text paste is refused: ${JSON.stringify(cp).slice(0, 300)}`);
  const host = await h.openEditor(page, POLY, "area");
  if (!host) { report(false, `${label}: no editor for area`); return; }
  const shown = await h.editorText(host);
  await h.until(page, async () => (await h.diagsOf(host)).length > 0, 10000);
  const diags = await h.diagsOf(host);
  await h.typeInto(page, host, 'define("area", [], () => 1)');
  await page.waitForTimeout(1500);
  const a1 = await rawState(page, "area");
  report(a1?.definition === a0?.definition && diags.some((d) => /"raw" cell and that language is not loaded/.test(d)) && shown !== AREA && !shown.startsWith("define("),
    `${label}: the editor on area shows the Observable JS decompilation, not its source, says the language is not loaded, and Shift-Enter stores nothing: ${JSON.stringify({ diags, shown: shown.slice(0, 80) })}`);
}
