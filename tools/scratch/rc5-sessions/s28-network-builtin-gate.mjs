// Probe (model-free, 20260928-0235-w17): a module write naming a network-loaded stdlib builtin (`topojson`)
// as a cell input is refused until vendoring-npm-dependencies.md is read, and that page tells the agent
// static data (a world-atlas TopoJSON) is vendored too. Exits 1 on failure.
// usage: node <this> <notebook.html>   — resolves everything from the repo root (process.cwd()).
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "wiki_index"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  const run = async (id, args, c = ctx) => String((await byId.get(id).execute(args, c))?.output ?? "");
  // no URL in the source, so only this page's trigger can fire
  const src = `const _geo = function geo(topojson){return( typeof topojson.feature )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_geo", "geo", ["topojson"], _geo);
  return main;
}`;
  const doc = "/content/@tomlarkworthy/markdown-wiki/vendoring-npm-dependencies.md";
  const first = await run("write_file", { file_path: "/src/@probe/geo.js", content: src });
  const page = await run("read_file", { file_path: doc });
  const second = await run("write_file", { file_path: "/src/@probe/geo.js", content: src });
  return { first: first.slice(0, 200), second: second.slice(0, 80),
    hasDataSection: /What has to be vendored/.test(page), namesTopojsonBuiltin: /topojson vl SQLite mermaid/.test(page) };
});
console.log(JSON.stringify(out, null, 1));
await close();
const ok = /REFUSED/.test(out.first) && /vendoring-npm-dependencies\.md/.test(out.first) && /^Wrote/.test(out.second) &&
  out.hasDataSection && out.namesTopojsonBuiltin;
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
