// T2: save -> reload for a classic (lopepage-2 + save-in-place) notebook, in Chromium over file://.
//   1. open the notebook; with --golden-write/--golden-check, every named module's exportModuleJS source
//      is written to / compared with a directory (the before/after differential for a merge)
//   2. edit the page the way an editor does: redefine an existing anonymous cell (its pid must survive)
//      and add a named cell to the first non-frame main
//   3. save through save-in-place's real sip_save (the file picker is mocked to capture the bytes)
//   4. open the saved file: every main module's cells (name, pid, inputs, definition) and import names
//      must be equal, the edit must render, and saving again must write the same module blocks
//
// run: bun tools/merge-forks/classic-save-reload-check.ts [notebook.html] [--golden-write dir | --golden-check dir]
import { chromium, type Page } from "playwright";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { blockContent } from "../lib/notebook-blocks.ts";

const args = process.argv.slice(2);
const opt = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const NOTEBOOK = resolve(args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--")) ?? "lopecode/notebooks/@tomlarkworthy_exporter-3.html");
const OUT = "tools/merge-forks/.out/classic-save-reload";
const SIP = "@tomlarkworthy/save-in-place";
const EXPORTER = "@tomlarkworthy/exporter-3";
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const check = (label: string, ok: boolean, detail: unknown = "") => {
  if (ok) pass++; else fail++;
  console.log(`(${ok ? "pass" : "fail"}) ${label}${ok ? "" : `\n  ${JSON.stringify(detail).slice(0, 3000)}`}`);
};

const browser = await chromium.launch();
const pageErrors = new Map<string, string[]>();

async function open(file: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  const errors: string[] = [];
  pageErrors.set(file, errors);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    (window as any).showSaveFilePicker = async () => ({
      name: "saved.html",
      createWritable: async () => ({ write: async (html: string) => { (window as any).__saved = html; }, close: async () => {} })
    });
  });
  await page.goto(`file://${file}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction((sip) => (window as any).__ojs_runtime?.mains?.get(sip), SIP, { timeout: 60000 });
  await page.waitForTimeout(8000);
  return page;
}

// a module's variables are read through the exporter's own predicates, so "cell" and "import" mean what they mean to the exporter
const fingerprint = (page: Page) => page.evaluate(async (EXPORTER) => {
  const rt = (window as any).__ojs_runtime;
  const exporter = [...rt._variables].find((v: any) => v._name === `module ${EXPORTER}` && v._value)?._value ?? rt.mains.get(EXPORTER);
  const [isModuleVar, isImportBridged, isDynamicVar, isLiveImport, restore] = await Promise.all(
    ["isModuleVar", "isImportBridged", "isDynamicVar", "isLiveImport", "restoreCanonicalImports"].map((n) => exporter.value(n)));
  const out: Record<string, unknown> = {};
  for (const [name, module] of rt.mains) {
    const vars = [...rt._variables].filter((v: any) => v._module === module && v._type === 1 && !isDynamicVar(v) && !isLiveImport(v));
    out[name] = {
      cells: vars.filter((v: any) => !isModuleVar(v) && !isImportBridged(v))
        .map((v: any) => ({ name: v._name ?? null, pid: v.pid ?? null, inputs: v._inputs.map((i: any) => i._name), definition: restore(String(v._definition)) })),
      imports: vars.filter((v: any) => isImportBridged(v)).map((v: any) => v._name).sort(),
      modules: vars.filter((v: any) => isModuleVar(v)).map((v: any) => v._name).sort()
    };
  }
  return out;
}, EXPORTER);

const exportAll = (page: Page) => page.evaluate(async (EXPORTER) => {
  const rt = (window as any).__ojs_runtime;
  const exporter = [...rt._variables].find((v: any) => v._name === `module ${EXPORTER}` && v._value)?._value ?? rt.mains.get(EXPORTER);
  const [exportModuleJS, buildModuleNames] = await Promise.all([exporter.value("exportModuleJS"), exporter.value("buildModuleNames")]);
  const names = buildModuleNames(rt);
  const out: Record<string, string> = {};
  for (const [, { name }] of names) {
    if (["builtin", "main", "unknown"].includes(name) || name in out) continue;
    out[name] = (await exportModuleJS(name, { runtime: rt, moduleNamesFn: () => names }).catch((e: any) => ({ source: `ERROR ${e}` }))).source;
  }
  return out;
}, EXPORTER);

const save = (page: Page) => page.evaluate(async (SIP) => {
  const rt = (window as any).__ojs_runtime;
  const sipSave = await rt.mains.get(SIP).value("sip_save");
  const result = await sipSave();
  return { result, html: (window as any).__saved as string };
}, SIP);

// ---- page 1
const page1 = await open(NOTEBOOK);
const mains: string[] = await page1.evaluate(() => [...(window as any).__ojs_runtime.mains.keys()]);
const target = mains.find((m) => !/lopepage|save-in-place|module-selection/.test(m))!;
console.log(`mains ${JSON.stringify(mains)}; editing ${target}`);

const golden = opt("--golden-write") ?? opt("--golden-check");
if (golden) {
  const sources = await exportAll(page1);
  const file = (name: string) => `${golden}/${name.replace(/\//g, "__")}.js`;
  if (opt("--golden-write")) {
    mkdirSync(golden, { recursive: true });
    for (const [name, source] of Object.entries(sources)) writeFileSync(file(name), source);
    console.log(`golden: wrote ${Object.keys(sources).length} module exports to ${golden}`);
  } else {
    const differ = Object.entries(sources).filter(([name, source]) => !existsSync(file(name)) || readFileSync(file(name), "utf8") !== source).map(([n]) => n);
    const missing = readdirSync(golden).map((f) => f.replace(/\.js$/, "").replace(/__/g, "/")).filter((n) => !(n in sources));
    check(`golden: ${Object.keys(sources).length} module exports equal ${golden}`, differ.length === 0 && missing.length === 0, { differ, missing });
  }
}

const edit = await page1.evaluate(async (target) => {
  const rt = (window as any).__ojs_runtime;
  const module = rt.mains.get(target);
  const anon = [...rt._variables].find((v: any) => v._module === module && v._type === 1 && !v._name && v.pid && v._inputs.length === 1 && v._inputs[0]._name === "md");
  if (!anon) return { error: "no anonymous md cell" };
  anon.define(["md"], new Function("return function _t2(md){return(md`# T2 edited cell`)}")());
  const added = module.variable(true).define("t2_added", [], new Function("return function _t2_added(){return(40 + 2)}")());
  return { pid: anon.pid, added: await module.value("t2_added"), addedPid: added.pid ?? null };
}, target);
check("page 1: an anonymous md cell redefined and t2_added = 42", !(edit as any).error && (edit as any).added === 42, edit);
await page1.waitForTimeout(1500);

const before = await fingerprint(page1);
const saved1 = await save(page1);
check("page 1: sip_save wrote the notebook", !!saved1.html && saved1.html.length > 1e6, { result: saved1.result, length: saved1.html?.length });
writeFileSync(`${OUT}/saved.html`, saved1.html ?? "");

// ---- page 2
const page2 = await open(resolve(`${OUT}/saved.html`));
const after = await fingerprint(page2);
for (const name of mains) {
  const a = (before as any)[name], b = (after as any)[name];
  const differing = a && b ? [...Array(Math.max(a.cells.length, b.cells.length)).keys()]
    .filter((i) => JSON.stringify(a.cells[i]) !== JSON.stringify(b.cells[i]))
    .map((i) => ({ i, before: a.cells[i], after: b.cells[i] })) : [{ missing: !a ? "before" : "after" }];
  check(`reload: ${name} cells (${a?.cells.length}) equal in order, name, pid, inputs and definition`, differing.length === 0, differing.slice(0, 3));
  check(`reload: ${name} import and module names equal`, JSON.stringify([a?.imports, a?.modules]) === JSON.stringify([b?.imports, b?.modules]),
    { importsOnlyBefore: a?.imports.filter((x: string) => !b?.imports.includes(x)), importsOnlyAfter: b?.imports.filter((x: string) => !a?.imports.includes(x)) });
}
const editedPid = (edit as any).pid;
const afterEdit = (after as any)[target]?.cells.find((c: any) => c.pid === editedPid);
check(`reload: the redefined cell kept pid ${editedPid} and its new definition`, !!afterEdit && afterEdit.definition.includes("T2 edited cell"), afterEdit);
const rendered = await page2.waitForFunction(() => [...document.querySelectorAll(".observablehq")].some((n) => n.textContent?.trim() === "T2 edited cell"), undefined, { timeout: 10000 }).then(() => true, () => false);
check("reload: the edited cell renders", rendered);

const saved2 = await save(page2);
writeFileSync(`${OUT}/saved-again.html`, saved2.html ?? "");
const blockDiff = mains.filter((m) => blockContent(saved1.html ?? "", m) !== blockContent(saved2.html ?? "", m) || !blockContent(saved1.html ?? "", m));
check("saving the reloaded page writes the same main module blocks", blockDiff.length === 0, blockDiff);

const e1 = pageErrors.get(NOTEBOOK)!, e2 = pageErrors.get(resolve(`${OUT}/saved.html`))!;
const newErrors = [...new Set(e2)].filter((e) => !e1.includes(e));
check("no page errors on reload that the original did not have", newErrors.length === 0, { newErrors, original: [...new Set(e1)].slice(0, 5) });
console.log(`\n${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
