// All three fixes on the live classic page, one load, nothing else changed.
//
//   1 variableToDefine  never resolves a closure import to the variable's OWN module
//   2 additionalMainUrl carries the host page's `resolutions` pin, so a scratch-runtime import
//     resolves to the same `define` the host already holds
//   3 moduleNames       names a scratch-runtime module after the host's copy of the SAME define,
//     which only becomes possible once 2 makes the defines identical
//
// Cells are taken from the working copy and installed with their real dep lists, so the runtime
// resolves the dependencies rather than the probe hand-wiring them.
//
//   HEADED=1 bun tools/probe-live-all3-ab.ts
import { chromium } from "playwright";

const file = await Bun.file("modules/@tomlarkworthy/exporter-3.js").text();
// factory cells: `const _pid = function _name(deps){return( VALUE )}`  -> keep the whole function
const wholeFn = (startMarker: string, endMarker: string) => {
  const i = file.indexOf(startMarker);
  const j = file.indexOf(endMarker, i);
  if (i < 0 || j < 0) throw new Error(`could not locate ${startMarker}`);
  // slice from after the assignment, NOT from "function " -- that dropped the `async` keyword on
  // moduleNames and the installed cell then failed to parse
  const body = file.slice(file.indexOf("=", i) + 1, j).trim();
  return body.replace(/;\s*$/, "");
};

const SRC = {
  loaderSpecifier:   wholeFn("const _e3lspec = function _loaderSpecifier(", "\nconst _e3rpin = "),
  resolutionsPin:    wholeFn("const _e3rpin = function _resolutionsPin(",   "\nconst _e3msn = "),
  additionalMainUrl: wholeFn("const _amurl1 = function _additionalMainUrl(", "\nconst _amurl2 = "),
  variableToDefine:  wholeFn("const _1g13ozv = function _variableToDefine(", "\nconst _e3tvtd = "),
  moduleNames:       wholeFn("const _x9dxs8 = async function _moduleNames(", "\nconst _2o6tia = "),
  exportToHTML:      wholeFn("const _lhn762 = function _exportToHTML(",       "\nconst _amurl1 = "),
};
for (const [k, v] of Object.entries(SRC)) console.log(`${k.padEnd(18)} ${v.length} bytes`);

const browser = await chromium.launch({ headless: !process.env.HEADED, args: [
  "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
  "--js-flags=--max-old-space-size=4096",
] });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 1100 } })).newPage();
await page.goto("https://old.observablehq.com/@tomlarkworthy/exporter-3", { waitUntil: "domcontentloaded", timeout: 240000 });

let fr: any = null;
for (let i = 0; i < 300 && !fr; i++) {
  for (const f of [page.mainFrame(), ...page.frames()]) {
    try {
      if (await f.evaluate(() => {
        const rt: any = (window as any).__ojs_runtime;
        const v = rt && [...rt._variables].find((x: any) => x._name === "exportToHTML");
        return !!v && v._value !== undefined && !!document.querySelector(".moldbook-exporter");
      })) { fr = f; break; }
    } catch {}
  }
  if (!fr) await page.waitForTimeout(1000);
}
if (!fr) { console.log("exporter UI never appeared"); await browser.close(); process.exit(1); }

const runExport = async () => fr.evaluate(async () => {
  const rt: any = (window as any).__ojs_runtime;
  (window as any).open = () => null;
  const ah = [...rt._variables].find((v: any) => v._name === "actionHandler" && v._value !== undefined)?._value;
  const ui: any = document.querySelector(".moldbook-exporter");
  let captured: any = null, threw: string | null = null;
  try { await ah("tab", ui.value, { output: (r: any) => (captured = r) }, () => {}); }
  catch (e: any) { threw = String(e?.message ?? e).slice(0, 300); }
  return { threw, source: String(captured?.source ?? "") };
});

const a: any = await runExport();
await Bun.write("scratch/all3-armA-served.html", a.source);
console.log(`\nARM A (page as served): ${a.source.length} bytes threw=${a.threw ?? "no"}`);

const patched = await fr.evaluate((src: Record<string, string>) => {
  const rt: any = (window as any).__ojs_runtime;
  const ex = [...rt._variables].find((v: any) => v._name === "exportToHTML" && v._module?._scope?.has("notebook_name"));
  const e3 = ex._module;
  const fn = (s: string) => (0, eval)("(" + s + ")");
  try {
    e3.define("loaderSpecifier", ["acorn"], fn(src.loaderSpecifier));
    e3.define("resolutionsPin", ["loaderSpecifier"], fn(src.resolutionsPin));
    e3.redefine("additionalMainUrl", [], fn(src.additionalMainUrl));
    e3.redefine("variableToDefine",
      ["isLiveImport","isDynamicVar","isModuleVar","isImportBridged","findImportedName3","pid","displayStateOf","moduleSlugOf"],
      fn(src.variableToDefine));
    e3.redefine("moduleNames",
      ["task","moduleMap","task_runtime","nkImportedModuleNames","stubModuleSlugs","additionalMainUrl","resolutionsPin"],
      fn(src.moduleNames));
    // exportToHTML is the CALLER that hands additionalMainUrl the sniffed pin -- without it the
    // published one-argument call site would still ask unpinned and the arm would test nothing
    e3.redefine("exportToHTML",
      ["_runtime","cssForTheme","css","location","keepalive","exporter_module","viewof task","additionalMainUrl","resolutionsPin","resolveHeadless","defaultExportOptions","defaultViewHash","resolveExportHash","Runtime"],
      fn(src.exportToHTML));
    return { ok: true };
  } catch (e: any) { return { ok: false, err: String(e?.message ?? e).slice(0, 300) }; }
}, SRC);
console.log(`install all three: ${JSON.stringify(patched)}`);
if (!(patched as any).ok) { await browser.close(); process.exit(1); }

for (let i = 0; i < 120; i++) {
  const settled = await fr.evaluate(() => {
    const rt: any = (window as any).__ojs_runtime;
    const v = [...rt._variables].find((x: any) => x._name === "exportToHTML");
    const ah = [...rt._variables].find((x: any) => x._name === "actionHandler");
    return typeof v?._value === "function" && typeof ah?._value === "function" && !!document.querySelector(".moldbook-exporter");
  }).catch(() => false);
  if (settled) break;
  await page.waitForTimeout(500);
}

const b: any = await runExport();
await Bun.write("scratch/all3-armD-fixed.html", b.source);
console.log(`ARM D (all three fixes): ${b.source.length} bytes threw=${b.threw ?? "no"}`);
console.log("\nwrote scratch/all3-armA-served.html and scratch/all3-armD-fixed.html");
await browser.close();
