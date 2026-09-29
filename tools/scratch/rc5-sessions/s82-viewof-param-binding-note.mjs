// probe (20260929-0620-m62): write_file's positional-binding warning (bindingNotes, rc5-train m16) fired on the
// compiled viewof form. `function sizeMb(Generators, viewof_sizeMb)` with inputs ["Generators", "viewof sizeMb"]
// is how every viewof reader is spelled (495 corpus hits of a `viewof_x` parameter), but the cell-name scan also
// collects the function name `viewof_sizeMb`, so the parameter "names another cell" that is not among the inputs:
// "⚠ sizeMb: parameter viewof_sizeMb is bound to input viewof sizeMb … FIX before task_complete".
// usage (from the repo root): node <this file> <notebook.html>
import { resolve } from "node:path";
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { bootNotebook } = await import(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs"));
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });

const mod = (cells, defs) => `${cells}
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
${defs}
  return main;
}
`;
// the compiled viewof form (fixture of rc5t-cite-knuth / rc5t-proofread-essay), plus a mutable reader
const VIEWOF = mod(`const _viewof_size = function viewof_size(Inputs){return(
Inputs.range([1, 5], { step: 1, value: 3 })
)};
const _size = function size(Generators, viewof_size){return(
Generators.input(viewof_size)
)};
const _label = function label(size, viewof_size){return(
size + " of " + viewof_size.max
)};`, `  $def("_viewof_size", "viewof size", ["Inputs"], _viewof_size);
  $def("_size", "size", ["Generators", "viewof size"], _size);
  $def("_label", "label", ["size", "viewof size"], _label);`);
// the m16 defect: parameter renamed to another cell's name, input list unchanged: must still warn
const RENAMED = mod(`const _data = function data(){return([1, 2, 3])};
const _filteredData = function filteredData(data){return(data.filter(x => x > 1))};
const _total = function total(filteredData){return(filteredData.length)};`,
`  $def("_data", "data", [], _data);
  $def("_filteredData", "filteredData", ["data"], _filteredData);
  $def("_total", "total", ["data"], _total);`);

const out = await page.evaluate(async ({ VIEWOF, RENAMED }) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup", "wiki_index"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args, c) => String((await byId.get(id).execute(args, c))?.output ?? "");
  return {
    viewof: await run("write_file", { file_path: "/src/@probe/viewof.js", content: VIEWOF }, {}),
    renamed: await run("write_file", { file_path: "/src/@probe/renamed.js", content: RENAMED }, {}),
  };
}, { VIEWOF, RENAMED });
await close();

const checks = {
  "viewof reader written without a binding warning": !/BY POSITION/.test(out.viewof),
  "a parameter renamed to another cell still warns (m16)": /parameter filteredData is bound to input data/.test(out.renamed),
};
for (const [k, v] of Object.entries(checks)) console.log((v ? "PASS " : "FAIL ") + k);
console.log(JSON.stringify({ viewof: out.viewof.slice(-500), renamed: out.renamed.slice(-400) }, null, 1));
const failed = Object.values(checks).filter(v => !v).length;
console.log(failed ? `${failed} FAILED` : "ALL PASS");
process.exit(failed ? 1 : 0);
