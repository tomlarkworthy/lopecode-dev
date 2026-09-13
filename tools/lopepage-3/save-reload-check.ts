// M6 browser gates for the lopepage-3 notebook, over file:// in Chromium:
//   E0  edits survive save -> reload. Two edits are made in the page (a Notebook Kit cell recompiled,
//       and a js cell switched to Observable JS), the notebook is saved through save-in-place-2's real
//       sip_save (the file picker is mocked to capture the bytes), and the saved file is opened in a
//       second page. The demo module's variables, pids, definitions, shadows and rendered text must be
//       equal in both pages, the edited source must decompile back, and saving the reloaded page must
//       write the same demo module block again.
//   E8  for every module without Notebook Kit cells, exporter-4's exportModuleJS equals exporter-3's.
//
// run: bun tools/lopepage-3/save-reload-check.ts [notebook.html]   (writes tools/lopepage-3/.out/saved*.html)
import { chromium, type Page } from "playwright";
import { resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { blockContent } from "../lib/notebook-blocks.ts";

const NOTEBOOK = resolve(process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_lopepage-3.html");
const OUT = "tools/lopepage-3/.out";
const DEMO = "@tomlarkworthy/notebook-kit-demo";
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const check = (label: string, ok: boolean, detail: unknown = "") => {
  if (ok) pass++; else fail++;
  console.log(`(${ok ? "pass" : "fail"}) ${label}${ok ? "" : `\n  ${JSON.stringify(detail).slice(0, 3000)}`}`);
};

const browser = await chromium.launch();
const pageErrors: string[] = [];

async function open(file: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  page.on("pageerror", (e) => pageErrors.push(`${file}: ${e.message}`));
  await page.addInitScript(() => {
    const original = (window as any).Runtime;
    let captured = false;
    Object.defineProperty(window, "Runtime", {
      get: () => original,
      set(R: any) {
        const Wrapped = function (this: any, ...args: any[]) {
          const rt = new R(...args);
          if (!captured) { (window as any).__ojs_runtime = rt; captured = true; }
          return rt;
        };
        Wrapped.prototype = R.prototype;
        Object.assign(Wrapped, R);
        return Wrapped;
      }
    });
    // save-in-place writes through the File System Access API; capture the bytes instead of a picker
    (window as any).showSaveFilePicker = async () => ({
      name: "saved.html",
      createWritable: async () => ({ write: async (html: string) => { (window as any).__saved = html; }, close: async () => {} })
    });
  });
  await page.goto(`file://${file}`, { waitUntil: "load", timeout: 60000 });
  // not fatal: a save that lost the Notebook Kit cells should fail the checks below, not stop the run
  await page.waitForFunction(() => document.querySelectorAll(".lope-viz .lope-viz-nk").length >= 4, undefined, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return page;
}

// the demo module's own variables, in runtime order, and the pane's rendered cells
const fingerprint = (page: Page, demo: string) => page.evaluate(async (demo) => {
  const rt = (window as any).__ojs_runtime;
  const module = rt.mains.get(demo);
  const toolchain = rt.mains.get("@tomlarkworthy/js-toolchain");
  const displayStateOf = await toolchain.value("displayStateOf");
  const variables = [...rt._variables]
    .filter((v: any) => v._module === module && v._type === 1 && !String(v._name).startsWith("module "))
    .map((v: any) => {
      const state = displayStateOf(v);
      return {
        name: v._name, pid: v.pid, inputs: v._inputs.map((i: any) => i._name),
        definition: state ? { ...state.definition, body: String(state.definition.body) } : String(v._definition),
        shadows: v._shadow ? [...v._shadow.keys()] : null,
        cell: state ? state.variables.map((x: any) => x.pid) : null
      };
    });
  const rendered = [...document.querySelectorAll(".lope-viz .observablehq")]
    .filter((n: any) => n.variable?._module === module)
    .map((n) => (n.textContent ?? "").trim());
  return { variables, rendered };
}, demo);

const save = (page: Page) => page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const sip = rt.mains.get("@tomlarkworthy/save-in-place-2") ?? rt.mains.get("@tomlarkworthy/save-in-place");
  const sipSave = await sip.value("sip_save");
  const result = await sipSave();
  return { result, html: (window as any).__saved as string };
});

const waitForText = (page: Page, text: string) => page.waitForFunction((text) =>
  [...document.querySelectorAll(".lope-viz .observablehq")].some((n) => (n.textContent ?? "").trim() === text), text, { timeout: 10000 })
  .then(() => true, () => false);

// ---- page 1: the assembled notebook
const page1 = await open(NOTEBOOK);

const e8 = await page1.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const moduleOf = (name: string) => [...rt._variables].find((v: any) => v._name === `module ${name}` && v._value)?._value;
  const e3 = moduleOf("@tomlarkworthy/exporter-3"), e4 = moduleOf("@tomlarkworthy/exporter-4");
  // after merge A there is no exporter-4 to compare with; tools/merge-forks/export-golden.ts is the differential
  if (!e4) return { merged: true };
  if (!e3) return { error: "exporter-3 not resolved" };
  const [js3, js4, names, displayStateOf] = await Promise.all([e3.value("exportModuleJS"), e4.value("exportModuleJS"), e4.value("buildModuleNames"), e4.value("displayStateOf")]);
  const nkModules = new Set([...rt._variables].filter((v: any) => displayStateOf(v)).map((v: any) => v._module));
  const compared: string[] = [], differ: string[] = [], skipped: string[] = [];
  for (const [module, { name }] of names(rt)) {
    if (nkModules.has(module)) { skipped.push(name); continue; }
    const [a, b] = await Promise.all([js3(name, { runtime: rt }), js4(name, { runtime: rt })]).catch((e) => [String(e), "error"]);
    (a.source === b.source ? compared : differ).push(name);
  }
  return { compared: compared.length, differ, skipped };
});
if ((e8 as any).merged) console.log("E8 not run: exporter-4 is merged into exporter-3 (differential: tools/merge-forks/export-golden.ts)");
else {
  console.log(`E8 compared ${(e8 as any).compared} modules, skipped ${JSON.stringify((e8 as any).skipped)}`);
  check("E8: classic modules export byte-identical through exporter-3 and exporter-4",
    !(e8 as any).error && (e8 as any).differ.length === 0 && (e8 as any).compared > 20 && (e8 as any).skipped.join() === DEMO, e8);
}

const edits = await page1.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const editor = [...rt._variables].find((v: any) => v._name === "module @tomlarkworthy/editor-6" && v._value)?._value;
  const toolchain = rt.mains.get("@tomlarkworthy/js-toolchain");
  const [compileAndUpdate, displayStateOf] = await Promise.all([editor.value("compile_and_update"), toolchain.value("displayStateOf")]);
  const cellOf = (id: number) => {
    const head = [...rt._variables].find((v: any) => displayStateOf(v)?.definition?.id === id);
    const variables = [...displayStateOf(head).variables];
    return { variables, cell: { module: { module: head._module, cells: [] }, variables, lang: ["ojs", "js"] } };
  };
  const kn = cellOf(4);
  const a = await compileAndUpdate("k * n + 100", kn.variables, kn.cell);
  const c5 = cellOf(5);
  const b = await compileAndUpdate("viewof foo = Inputs.range([0, 10])", c5.variables, c5.cell);
  return { a, b };
});
const edited = await waitForText(page1, "109");
check("page 1: k * n recompiled to k * n + 100 renders 109, cell 5 switched to viewof foo", edited && (edits as any).a === "k * n + 100", edits);
await page1.waitForTimeout(1000);

const before = await fingerprint(page1, DEMO);
const saved1 = await save(page1);
check("page 1: sip_save wrote the notebook", saved1.result?.ok === true && saved1.html?.length > 1e6, saved1.result);
writeFileSync(`${OUT}/saved.html`, saved1.html ?? "");
const block1 = blockContent(saved1.html ?? "", DEMO);
check("the saved demo module holds Notebook Kit definitions and the classic viewof", !!block1 && block1.includes("$nk(") && block1.includes('"viewof foo"') && block1.includes("k * n + 100"), block1?.slice(0, 400));

// ---- page 2: the saved file
const page2 = await open(resolve(`${OUT}/saved.html`));
const reloaded = await waitForText(page2, "109");
await page2.waitForTimeout(1000);
const after = await fingerprint(page2, DEMO);
check("page 2: the edit renders after reload (109)", reloaded, after.rendered);
// key order is not part of a definition: editor-6 spreads body first, a loaded $nk definition has it last
const canonical = (x: unknown): string => JSON.stringify(x, (_k, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([p], [q]) => p.localeCompare(q))) : v);
const differing = [...Array(Math.max(before.variables.length, after.variables.length)).keys()]
  .filter((i) => canonical(before.variables[i]) !== canonical(after.variables[i]))
  .map((i) => ({ i, before: before.variables[i], after: after.variables[i] }));
check("E0: demo module variables, pids, definitions and shadows equal after save -> reload", differing.length === 0, differing);
check("E0: rendered cells equal after save -> reload", JSON.stringify(after.rendered) === JSON.stringify(before.rendered), { before: before.rendered, after: after.rendered });

const decompiled = await page2.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const editor = [...rt._variables].find((v: any) => v._name === "module @tomlarkworthy/editor-6" && v._value)?._value;
  const toolchain = rt.mains.get("@tomlarkworthy/js-toolchain");
  const [decompile, displayStateOf] = await Promise.all([editor.value("decompile"), toolchain.value("displayStateOf")]);
  const head = [...rt._variables].find((v: any) => displayStateOf(v)?.definition?.id === 4);
  return head ? await decompile(displayStateOf(head).variables) : null;
});
check("page 2: the edited cell decompiles to the typed source", decompiled === "k * n + 100", decompiled);

const saved2 = await save(page2);
writeFileSync(`${OUT}/saved-again.html`, saved2.html ?? "");
const block2 = blockContent(saved2.html ?? "", DEMO);
check("saving the reloaded page writes the same demo module block", !!block2 && block2 === block1, { block1: block1?.length, block2: block2?.length });

check("no page errors", pageErrors.length === 0, [...new Set(pageErrors)].slice(0, 10));
console.log(`\n${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
