// A module written through write_file that imports a published notebook the page does not embed
// (@d3/color-legend) must export that notebook under its own id. Reproduces 20260928-0130-w12-before:
// the saved file held the block as id="<unknown 0.50…>" and the importer's loader became
// import("/<unknown 0.50…>.js?v=4"). jbApply rebuilds the loader as
// `async () => runtime.module((await import(path)).default)`; findModuleName reads the specifier from
// the loader's source text and finds no string literal. No model calls; api.observablehq.com is routed
// to a fixture of the notebook's .js.
// usage: node probe.mjs [notebook.html]   exit 1 = defect present
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { bootNotebook } from "../../robocoop-5/lib/notebook-boot.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const NB = process.argv[2] ? resolve(process.argv[2]) : join(here, "notebook.html");
const FIXTURE = readFileSync(join(here, "../../robocoop-5/eval/rc5t/fixtures/d3-color-legend.js"), "utf8");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
await page.route(/api\.observablehq\.com\/@d3\/color-legend\.js/, r => r.fulfill({ contentType: "text/javascript", body: FIXTURE }));
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args) => { try { return String((await byId.get(id).execute(args, {}))?.output ?? ""); } catch (e) { return "THREW " + e; } };
  await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" });
  const src = `const _kind = function kind(Legend){return(
typeof Legend
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  main.define("module @d3/color-legend", async () => runtime.module((await import("/@d3/color-legend.js?v=4")).default));
  main.define("Legend", ["module @d3/color-legend", "@variable"], (_, v) => v.import("Legend", _));
  $def("_kind", "kind", ["Legend"], _kind);
  return main;
}`;
  const write = await run("write_file", { file_path: "/src/@probe/legend.js", content: src });
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@probe/legend");
  const kindVar = [...rt._variables].find(v => v._module === m && v._name === "kind");
  let kind; try { kind = await kindVar?._promise; } catch (e) { kind = "ERR " + (e?.message ?? e); }
  const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
  const r = await f({ mains: rt.mains });
  const html = typeof r === "string" ? r : r.source;
  const ids = [...html.matchAll(/<script[^>]*\bid="([^"]*)"/g)].map(x => x[1]);
  window.__probeHtml = html;
  return {
    write: write.slice(0, 160),
    kind,
    unknownIds: ids.filter(i => /unknown/.test(i)),
    hasColorLegend: ids.includes("@d3/color-legend"),
    loaderInExport: (html.match(/main\.define\("module [^"]*color-legend[^"]*"|main\.define\("module <unknown[^"]*"/) || [null])[0]
  };
});
// round trip: the saved file must boot the import from its own embedded block, offline
const saved = join(here, "probe-saved.html");
writeFileSync(saved, await page.evaluate(() => window.__probeHtml));
await page.unroute(/api\.observablehq\.com\/@d3\/color-legend\.js/);
await page.route(/api\.observablehq\.com/, r => r.abort());
await page.goto(pathToFileURL(saved).href, { waitUntil: "load" });
out.reopenedKind = await page.evaluate(async () => {
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    const rt = window.__ojs_runtime, m = rt?.mains?.get("@probe/legend");
    const v = m && [...rt._variables].find(x => x._module === m && x._name === "kind");
    if (v) { try { m.value("kind").catch(() => {}); return await Promise.race([v._promise, new Promise(r => setTimeout(() => r("timeout"), 15000))]); } catch (e) { return "ERR " + (e?.message ?? e); } }
    await new Promise(r => setTimeout(r, 300));
  }
  return "no @probe/legend after reopen";
});
console.log(JSON.stringify(out, null, 1));
const pass = out.kind === "function" && out.hasColorLegend && !out.unknownIds.length && out.reopenedKind === "function";
console.log(pass ? "PASS" : "FAIL");
await close();
process.exit(pass ? 0 : 1);
