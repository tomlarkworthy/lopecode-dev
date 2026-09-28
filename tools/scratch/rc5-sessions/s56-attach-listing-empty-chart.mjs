// m30 probe: an attachment of a module created in the page (not imported, so no `module <id>` variable)
// must be listed and readable under /content/<id>/<name>. all_module_files names such modules "main",
// so before the fix it appears as /content/main/<name>. No model calls.
// Part 2: after a column rename one cell throws and a Plot over the renamed field draws nothing; the write
// report must name the empty chart too, not only the throwing cell.
// usage: node probe.mjs <notebook.html>
import { resolve, join } from "node:path";
import { bootNotebook } from "../../robocoop-5/lib/notebook-boot.mjs";
const NB = resolve(process.argv[2] || join(process.cwd(), "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await sleep(1500);
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await sleep(300);
  let byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {} };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const src = `const _d = function data(FileAttachment){return( FileAttachment("rows.csv").csv({typed: true}) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_d", "data", ["FileAttachment"], _d);
  return main;
}`;
  const write = await run("write_file", { file_path: "/src/@probe/rows.js", content: src });
  const attach = await run("attach_file", { module: "@probe/rows", name: "rows.csv", content: "a,b\n1,2\n3,4\n", mime: "text/csv" });
  // all_module_files re-fetches every attachment; wait until it has recomputed with the new one
  const amf = () => H.allVars().filter(v => v._name === "all_module_files" && Array.isArray(v._value)).flatMap(v => v._value).filter(f => f.name === "rows.csv");
  for (let i = 0; i < 40 && !amf().length; i++) await sleep(500);
  const listed = [...new Set(amf().map(f => f.module))];
  // the tools close over pathLib, which recomputes from all_module_files: take the current tool set
  await sleep(1500);
  byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const globOwn = await run("glob", { pattern: "/content/@probe/rows/*" });
  const globAll = await run("glob", { pattern: "**/rows.csv" });
  const read = await run("read_file", { file_path: "/content/@probe/rows/rows.csv" });
  const paths = /\/content\/@probe\/rows\/rows\.csv/.test(globOwn) && /a,b/.test(read) && !/\/content\/main\//.test(globAll) ? "ok" : "FAIL";
  const renamed = `const _d = function data(FileAttachment){return( FileAttachment("rows.csv").csv({typed: true}) )};
const _c = function chart(Plot,data){return( Plot.dot(data, {x: "old_a", y: "b"}).plot() )};
const _t = function latest(data){return( data[0].old_a.toFixed(1) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_d", "data", ["FileAttachment"], _d);
  $def("_c", "chart", ["Plot","data"], _c);
  $def("_t", "latest", ["data"], _t);
  return main;
}`;
  const report = await run("write_file", { file_path: "/src/@probe/rows.js", content: renamed });
  const emptyNamed = /ERRORING/.test(report) && /chart[^·]*NO DATA/.test(report) ? "ok" : "FAIL";
  const verdict = paths === "ok" && emptyNamed === "ok" ? "ok" : "FAIL";
  return { verdict, paths, emptyNamed, report: report.replace(/```[\s\S]*?```/g, "<src>").slice(0, 700), listed, write: write.slice(0, 80), attach: attach.slice(0, 120), globOwn: globOwn.slice(0, 160), globAll: globAll.slice(0, 160), read: read.slice(0, 120) };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.verdict === "ok" ? 0 : 1);
