// probe (20260928-0847-m14): the write result checks ANONYMOUS cells too. 42 of 85 distinct corpus Plot
// cells are anonymous ($def("_pid", null, …)). In m10's replay a half-done rename (an anonymous chart's
// parameter renamed, its $def inputs not) left the chart erroring and the write said "✓ all 6 cells compute";
// the loud-only fix left an anonymous stacked area drawn flat on the baseline (y names a missing column) with
// no NO DATA line. Also (w17): a parameter added to a cell's function but not its $def inputs, which does not
// throw, was reported as "✓ all 7 cells compute".
// Fixture: @zanarmstrong/highlight-color-w-dropdown (lopebooks @tomlarkworthy_cloudevents-explorer.html),
// re-homed offline as @user/unemployment by m10's build.mjs.
// usage (from the repo root): node <this file> <notebook.html>
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { bootNotebook } = await import(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs"));
const fx = name => {
  for (const d of ["tools/scratch/rc5-sessions/fixtures", "tools/scratch/rc5-train/20260928-0847/m14/fixtures"]) {
    const p = resolve(process.cwd(), d, name);
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  throw new Error("fixture not found: " + name);
};
const BROKEN = fx("unemployment-broken.js"), LOUD = fx("unemployment-loud-only.js"), FIXED = fx("unemployment-fixed.js");
const P = "/src/@user/unemployment.js";
// a module from [pid, name|null, deps, body] rows
const mod = cells => cells.map(([pid, name, deps, body]) => `const ${pid} = function ${name ? "_" + name.replace(/\W/g, "_") : pid}(${deps.join(",")}){return(\n${body}\n)};`).join("\n") +
  `\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };\n` +
  cells.map(([pid, name, deps]) => `  $def("${pid}", ${JSON.stringify(name)}, ${JSON.stringify(deps)}, ${pid});`).join("\n") + "\n  return main;\n}\n";
const rows = `[{d: 1, k: "a", v: 3}, {d: 2, k: "a", v: 5}, {d: 3, k: "a", v: 4}, {d: 1, k: "b", v: 0}, {d: 2, k: "b", v: 0}, {d: 3, k: "b", v: 0}]`;
// 40 anonymous md cells and two named ones: a no-op rewrite must add nothing about them
const MANY_MD = mod([["_data", "data", [], rows], ...Array.from({ length: 40 }, (_, i) => [`_m${i}`, null, ["md"], `md\`## Section ${i}\nSome prose for section ${i}.\``]),
  ["_total", "total", ["data"], `data.reduce((s, r) => s + r.v, 0)`]]);
const MANY_MD2 = MANY_MD.replace("## Section 7\\n", "## Section seven\\n").replace("## Section 7\n", "## Section seven\n");
const cases = {
  broken: [["write_file", { file_path: P, content: BROKEN }]],
  // m10 trace step 2 replayed: parameters renamed, $def inputs not
  halfEdit: [["write_file", { file_path: P, content: BROKEN }], ["edit_file", { file_path: P, old_string: "const _zkuc7f = function _4(Plot,unemployment){return(", new_string: "const _zkuc7f = function _4(Plot,rows){return(" }]],
  loudOnly: [["write_file", { file_path: P, content: BROKEN }], ["write_file", { file_path: P, content: LOUD }]],
  fixed: [["write_file", { file_path: P, content: BROKEN }], ["write_file", { file_path: P, content: FIXED }]],
  // a NAMED stacked area whose y names a missing field: Plot draws one zero-height path on the baseline
  namedFlat: [["write_file", { file_path: "/src/@probe/flat.js", content: mod([["_rows", "rows", [], rows], ["_chart", "chart", ["Plot", "rows"], `Plot.plot({marks: [Plot.areaY(rows, Plot.stackY({x: "d", y: "count", fill: "k"})), Plot.ruleY([0])]})`]]) }]],
  // legitimate: series b is all zero (flat on the baseline) next to a nonzero series a; a line that is flat at 0
  goodZeroSeries: [["write_file", { file_path: "/src/@probe/zeros.js", content: mod([["_rows", "rows", [], rows],
    ["_area", "area", ["Plot", "rows"], `Plot.plot({marks: [Plot.areaY(rows, Plot.stackY({x: "d", y: "v", fill: "k"})), Plot.ruleY([0])]})`],
    ["_line", "line", ["Plot", "rows"], `Plot.plot({marks: [Plot.lineY(rows.filter(r => r.k === "b"), {x: "d", y: "v"}), Plot.ruleY([0])]})`],
    ["_anonLine", null, ["Plot", "rows"], `Plot.plot({marks: [Plot.lineY(rows, {x: "d", y: "v", stroke: "k"})]})`]]) }]],
  // w17 (rc5t-quiz-submit-score, eval-base step 9): `submit` added to the parameters only; nothing throws
  paramOnly: [["write_file", { file_path: "/src/@probe/quiz.js", content: mod([["_score", "score", [], `3`], ["_submit", "submit", [], `0`],
    ["_result", "result", ["md", "score"], `submit === 0 ? md\`press Submit\` : md\`Score \${score}\``],
    ["_note", null, ["md", "score"], `md\`\${score} of 5\``]]).replace("function _result(md,score)", "function _result(md,score,submit)").replace("function _note(md,score)", "function _note(md,score,total)") }]],
  // m16 (eval-base step 78): parameter renamed to another cell's name, $def inputs not; nothing throws
  paramRenamed: [["write_file", { file_path: "/src/@probe/penguins.js", content: mod([["_data", "data", [], rows], ["_filteredData", "filteredData", ["data"], `data.filter(r => r.k === "a")`],
    ["_n", "n", ["data"], `filteredData.length`]]).replace("function _n(data)", "function _n(filteredData)") }]],
  // m16 (eval-base step 48): cell functions added without a $def line
  unregistered: [["write_file", { file_path: "/src/@probe/orphans.js", content: mod([["_data", "data", [], rows]]).replace("export default", "const _speciesChoices = function speciesChoices(data){return(\n[...new Set(data.map(d => d.k))]\n)};\nconst _count = (data) => data.length;\nexport default") }]],
  manyMdNoop: [["write_file", { file_path: "/src/@probe/prose.js", content: MANY_MD }], ["write_file", { file_path: "/src/@probe/prose.js", content: MANY_MD }]],
  manyMdChange: [["write_file", { file_path: "/src/@probe/prose2.js", content: MANY_MD }], ["write_file", { file_path: "/src/@probe/prose2.js", content: MANY_MD2 }]],
};
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async (cases) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const res = {};
  for (const [k, steps] of Object.entries(cases)) {
    const ctx = { sessionState: {} };
    const outs = [];
    for (const page of ["writing-cells-in-module-source.md", "drawing-charts-with-plot.md"]) await byId.get("read_file").execute({ file_path: "/content/@tomlarkworthy/markdown-wiki/" + page }, ctx);
    for (const [tool, args] of steps) {
      const t1 = Date.now();
      outs.push(String((await byId.get(tool).execute(args, ctx))?.output ?? "") + " [" + (Date.now() - t1) + "ms]");
    }
    res[k] = outs;
  }
  return res;
}, cases);
const last = k => out[k][out[k].length - 1];
const checks = [
  ["broken: the anonymous chart's error is reported by pid", /ERRORING[^·]*_zkuc7f[^;]*unemployment is not defined/.test(out.broken[0])],
  ["broken: the anonymous flat chart is not hidden behind the error", !/✓ all/.test(out.broken[0])],
  ["halfEdit: the anonymous chart's error is reported by pid", /ERRORING[^·]*_zkuc7f[^;]*is not defined/.test(last("halfEdit"))],
  ["halfEdit: the declare-in-BOTH hint runs for it", /_zkuc7f[^;]*(declare \S+ in BOTH|every name must be in BOTH)/.test(last("halfEdit"))],
  ["loudOnly: the anonymous flat area is reported as NO DATA by pid", /⚠[^·]*_e75lck[^·]*NO DATA/.test(last("loudOnly"))],
  ["fixed: all cells compute, no warning", /✓ all 16 cells compute/.test(last("fixed")) && !/⚠[^·]*(NO DATA|ERRORING)/.test(last("fixed"))],
  ["namedFlat: a named zero-height area is NO DATA", /⚠[^·]*chart[^·]*NO DATA/.test(last("namedFlat"))],
  ["goodZeroSeries: a zero series beside real data, and a flat line, are not flagged", /✓ all/.test(last("goodZeroSeries")) && !/NO DATA/.test(last("goodZeroSeries"))],
  ["paramOnly: a parameter missing from $def inputs is named (named cell)", /⚠[^·]*result[^·]*submit/.test(last("paramOnly")) && !/✓ all/.test(last("paramOnly"))],
  ["paramOnly: a parameter missing from $def inputs is named (anonymous cell)", /_note[^·;]*total/.test(last("paramOnly"))],
  ["paramRenamed: a parameter bound by position to a different input is named", /⚠[^·]*\bn: parameter filteredData is bound to input data/.test(last("paramRenamed"))],
  ["unregistered: cell functions with no $def are named", /⚠ 2 cell functions are defined but no \$def[^·]*_speciesChoices, _count/.test(last("unregistered"))],
  ["fixed: the inline CSV data cell is not told to SPLIT", !/below MI 65 \(rows/.test(last("fixed"))],
  ["no binding/orphan warning on the correct modules", ["fixed", "goodZeroSeries", "manyMdNoop", "namedFlat"].every(k => !/bound to input|never run|always undefined/.test(last(k)))],
  ["manyMdNoop: a no-op write adds nothing about the 40 anonymous md cells", /✓ all 42 cells compute/.test(last("manyMdNoop")) && !/_m\d|anonymous/.test(last("manyMdNoop")) && !/CHANGED/.test(last("manyMdNoop"))],
  ["manyMdChange: a changed anonymous cell is named by pid in the value-change report", /CHANGED[^·]*_m7\b/.test(last("manyMdChange")) && !/_m(?!7\b)\d+/.test(last("manyMdChange").split("CHANGED")[1] || "")],
];
let ok = true;
for (const [name, pass] of checks) { ok &&= pass; console.log(pass ? "ok  " : "FAIL", name); }
if (process.env.VERBOSE || !ok) for (const [k, v] of Object.entries(out)) console.log("\n--", k, "\n" + v.map(s => s.replace(/ · (metrics|source of)[\s\S]*?(?= · |$)/g, "").slice(0, 1400)).join("\n>> "));
console.log(ok ? "PASS" : "FAIL");
await close();
process.exit(ok ? 0 : 1);
