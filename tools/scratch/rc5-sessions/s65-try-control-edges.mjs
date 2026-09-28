// try_control's sweep (no `control`) must find a cell that throws only at some settings: at a range's min or
// max, or at one option of a select. Before 20260928-0847-m40 the sweep set each range to 25%/75% of its extent
// and each select to one other option, so `topTweet` (throws when the bar is at its max and nothing is above it)
// computed in every setting the sweep tried. No model calls.
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
  const src = `const _t = function _title(md){return( md\`# Edges\` )};
const _l = function _limit(Inputs){return( Inputs.range([0, 10], { label: "Limit", value: 5, step: 1 }) )};
const _lv = (G, _) => G.input(_);
const _p = function _pick(Inputs){return( Inputs.select(["alpha", "beta", "gamma"], { label: "Pick", value: "alpha" }) )};
const _pv = (G, _) => G.input(_);
const _f = function _first(limit){return( [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((d) => d > limit)[0].toFixed(0) )};
const _k = function _lookup(pick){return( ({ alpha: 1, beta: 2 })[pick].toFixed(1) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_t", null, ["md"], _t);
  $def("_l", "viewof limit", ["Inputs"], _l);
  $def("_lv", "limit", ["Generators", "viewof limit"], _lv);
  $def("_p", "viewof pick", ["Inputs"], _p);
  $def("_pv", "pick", ["Generators", "viewof pick"], _pv);
  $def("_f", "first", ["limit"], _f);
  $def("_k", "lookup", ["pick"], _k);
  return main;
}`;
  for (const doc of ["event-handlers-in-cells.md", "writing-cells-in-module-source.md"]) await run("read_file", { file_path: "/content/@tomlarkworthy/markdown-wiki/" + doc, limit: 2 });
  const wrote = await run("write_file", { file_path: "/src/@probe/edges.js", content: src });
  if (!window.__ojs_runtime.mains.get("@probe/edges")) return { error: "write_file: " + wrote.slice(0, 400) };
  await new Promise(r => setTimeout(r, 1500));
  const mod = window.__ojs_runtime.mains.get("@probe/edges");
  const v = n => [...window.__ojs_runtime._variables].find(x => x._name === n && x._module === mod);
  const r = { sweep: await run("try_control", { module: "@probe/edges" }) };
  r.limitAfter = v("limit")?._value; r.pickAfter = v("pick")?._value; r.firstErr = v("first")?._error != null; r.lookupErr = v("lookup")?._error != null;
  return r;
});
const s = out.sweep || "";
const checks = out.error ? { tool: false } : {
  // the max of the range makes `first` throw, and the sweep says at which value
  rangeEdgeFound: /\bfirst throws \w*Error/.test(s) && /\b10\b/.test(s),
  // the option "gamma" makes `lookup` throw
  selectOptionFound: /\blookup throws \w*Error/.test(s) && /gamma/.test(s),
  // the controls are put back, and nothing is left erroring
  putBack: out.limitAfter === 5 && out.pickAfter === "alpha" && !out.firstErr && !out.lookupErr,
};
console.log(out.error || s);
console.log(JSON.stringify({ ...checks, limitAfter: out.limitAfter, pickAfter: out.pickAfter }));
await close();
const pass = Object.values(checks).every(Boolean);
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
