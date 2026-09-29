// try_control on a select whose option values are not their labels (Inputs.select over a Map or objects) must
// pick the option the user sees by its label. Before 20260929-0620-m46, `value: "solarized-light"` on
// @tomlarkworthy/themes' Theme picker was written into the view's .value setter: theme_assets became null and
// css, theme_properties and apply_theme threw ("Cannot read properties of null (reading 'map')"). The sweep
// (no `control`) skipped such selects altogether ("no value to pick automatically"). No model calls.
// Usage: node <probe> <notebook.html>   (from the repo root)
import { resolve } from "node:path";
const { bootNotebook } = await import(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs"));
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  if (!byId.has("try_control")) return { error: "no try_control tool" };
  const ctx = { sessionState: {} };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const src = `const _t = function _title(md){return( md\`# Map select\` )};
const _s = function _size(Inputs){return( Inputs.select(new Map([["Small", {n: 1}], ["Medium", {n: 2}], ["Large", null]]), { label: "Size", value: {n: 1} }) )};
const _sv = (G, _) => G.input(_);
const _d = function _doubled(size){return( size.n * 2 )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_t", null, ["md"], _t);
  $def("_s", "viewof size", ["Inputs"], _s);
  $def("_sv", "size", ["Generators", "viewof size"], _sv);
  $def("_d", "doubled", ["size"], _d);
  return main;
}`;
  for (const doc of ["event-handlers-in-cells.md", "writing-cells-in-module-source.md"]) await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/" + doc, limit: 2 });
  const wrote = await run("write_file", { file_path: "/src/@probe/mapsel.js", content: src });
  if (!window.__ojs_runtime.mains.get("@probe/mapsel")) return { error: "write_file: " + wrote.slice(0, 400) };
  await new Promise(r => setTimeout(r, 1500));
  const mod = window.__ojs_runtime.mains.get("@probe/mapsel");
  const v = (n, m = mod) => [...window.__ojs_runtime._variables].find(x => x._name === n && x._module === m);
  const r = {};
  r.pick = await run("try_control", { module: "@probe/mapsel", control: "Size", value: "Medium" });
  r.sweep = await run("try_control", { module: "@probe/mapsel" });
  r.doubledAfter = v("doubled")?._value; r.doubledErr = v("doubled")?._error != null;
  // the case from the trace: the notebook's own Theme picker
  r.theme = await run("try_control", { module: "@tomlarkworthy/themes", control: "viewof theme_assets", value: "air" });
  return r;
});
const checks = out.error ? { tool: false } : {
  // picking "Medium" by its label gives size = {n: 2}, so doubled goes 2 -> 4, and nothing is set to null
  pickByLabel: /doubled:\s*\n\s*2 → 4/.test(out.pick) && !/→ null|throws|Error/.test(out.pick),
  // the sweep tries the select (not "skipped") and finds that the option "Large" makes doubled throw
  sweepCovers: !/viewof size: skipped/.test(out.sweep) && /doubled throws \w*Error/.test(out.sweep) && /Large/.test(out.sweep),
  // the Theme picker: the fetched css becomes air's (it lands after settle(), a fetch), theme_assets is not null,
  // nothing throws, and a working picker is not called dead
  themePicker: /css:[\s\S]*→[^\n]*theme-air\.css/.test(out.theme) && !/theme_assets:\s*\n[^\n]*→ null/.test(out.theme) && !/RuntimeError|TypeError|NO VISIBLE EFFECT/.test(out.theme),
  // the control is put back, nothing left erroring
  putBack: out.doubledAfter === 2 && !out.doubledErr,
};
console.log(out.error || [out.pick, out.sweep, out.theme].join("\n-----\n"));
console.log(JSON.stringify(checks));
await close();
const pass = Object.values(checks).every(Boolean);
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
