// probe (20260928-0610-w31): a chart that computes but draws no data must not be reported as
// "✓ all cells compute". In run 20260928-0525-w27 (eval-fixed) the agent wrote
// Plot.barY(monthlyData, Plot.stackY({x: "month", y: categories.map(c => d => d[c] || 0), fill: categories.map(c => () => c)}));
// Plot drew the axes and 0 bars, write_file said "✓ all 9 cells compute", and the agent told the user the
// chart showed each category as a coloured segment.
// PASS: every empty-chart module's write result carries a ⚠ naming the cell; no correct chart gets one.
// usage (from the repo root): node <this file> <notebook.html>
import { resolve } from "node:path";
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { bootNotebook } = await import(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs"));
const rows = `[{month:"2026-01",Rent:1450,Food:320,Fun:80},{month:"2026-02",Rent:1450,Food:290,Fun:120},{month:"2026-03",Rent:1450,Food:350,Fun:60}]`;
const modSrc = (cells) => cells.map(([n, deps, body]) => `const _${n} = function ${n}(${deps.join(", ")}){return(\n${body}\n)};`).join("\n") +
  `\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n` +
  cells.map(([n, deps]) => `  $def("_${n}", "${n}", ${JSON.stringify(deps)}, _${n});`).join("\n") + "\n  return main;\n}";
const data = ["wide", [], rows];
const long = ["long", ["wide"], `wide.flatMap(r => ["Rent", "Food", "Fun"].map(category => ({month: r.month, category, amount: r[category]})))`];
const d3axes = `const x = d3.scaleBand(rows.map(d => d.month), [40, 380]).padding(0.1), y = d3.scaleLinear([0, 2000], [260, 20]);
  const svg = d3.create("svg").attr("width", 400).attr("height", 300);
  svg.append("g").attr("transform", "translate(0,260)").call(d3.axisBottom(x));
  svg.append("g").attr("transform", "translate(40,0)").call(d3.axisLeft(y));`;
const bad = {
  // the w27 idiom, inline data
  stackedFns: [data, ["chart", ["Plot", "wide"], `Plot.plot({color: {legend: true}, marks: [Plot.barY(wide, Plot.stackY({x: "month", y: ["Rent", "Food", "Fun"].map(c => d => d[c] || 0), fill: ["Rent", "Food", "Fun"].map(c => () => c)})), Plot.ruleY([0])]})`]],
  emptyData: [data, ["filtered", ["wide"], `wide.filter(d => d.month > "2027")`], ["chart", ["Plot", "filtered"], `Plot.plot({marks: [Plot.barY(filtered, {x: "month", y: "Rent"}), Plot.ruleY([0])]})`]],
  stringNumbers: [["pts", [], `[{a: 1, v: "$1,450"}, {a: 2, v: "$320"}, {a: 3, v: "$80"}]`], ["chart", ["Plot", "pts"], `Plot.plot({marks: [Plot.dot(pts, {x: "a", y: d => +d.v}), Plot.lineY(pts, {x: "a", y: d => +d.v})]})`]],
  d3EmptyJoin: [["rows", [], `[]`], ["chart", ["d3", "rows"], `(() => { ${d3axes}
  svg.append("g").selectAll("rect").data(rows).join("rect").attr("x", d => x(d.month)).attr("width", x.bandwidth()).attr("y", d => y(d.Rent)).attr("height", d => 260 - y(d.Rent));
  return svg.node(); })()`]],
  d3NaN: [data, ["chart", ["d3", "wide"], `(() => { const rows = wide; ${d3axes}
  svg.append("g").selectAll("rect").data(rows).join("rect").attr("x", d => x(d.month)).attr("width", x.bandwidth()).attr("y", d => y(d.rent)).attr("height", d => 260 - y(d.rent));
  return svg.node(); })()`]],
};
const good = {
  // @observablehq/plot-stack cell _9 (lopebooks @tomlarkworthy_cloudevents-explorer.html): long rows, fill channel
  stackedLong: [data, long, ["chart", ["Plot", "long"], `Plot.plot({color: {legend: true}, marks: [Plot.barY(long, {x: "month", y: "amount", fill: "category"}), Plot.ruleY([0])]})`]],
  lineDot: [data, ["chart", ["Plot", "wide"], `Plot.plot({x: {type: "band"}, marks: [Plot.lineY(wide, {x: "month", y: "Food"}), Plot.dot(wide, {x: "month", y: "Food"}), Plot.text(wide, {x: "month", y: "Food", text: "Food", dy: -8})]})`]],
  ruleData: [data, ["chart", ["Plot", "wide"], `Plot.plot({marks: [Plot.ruleX(wide, {x: "Food"}), Plot.ruleX(wide, {x: "Fun", stroke: "red"})]})`]],
  d3Bars: [data, ["chart", ["d3", "wide"], `(() => { const rows = wide; ${d3axes}
  svg.append("g").selectAll("rect").data(rows).join("rect").attr("x", d => x(d.month)).attr("width", x.bandwidth()).attr("y", d => y(d.Rent)).attr("height", d => 260 - y(d.Rent));
  return svg.node(); })()`]],
  // filled by a later cell: the svg is empty when its own cell returns
  d3FilledLater: [data, ["chart", ["d3"], `d3.create("svg").attr("width", 400).attr("height", 300).node()`], ["draw", ["d3", "chart", "wide"], `d3.select(chart).selectAll("circle").data(wide).join("circle").attr("cx", (d, i) => 50 + i * 100).attr("cy", 100).attr("r", d => d.Food / 20).size()`]],
  htmlTable: [data, ["table", ["htl", "wide"], `htl.html\`<table>\${wide.map(r => htl.html\`<tr><td>\${r.month}</td><td>\${r.Rent}</td></tr>\`)}</table>\``]],
};
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const cases = Object.fromEntries([...Object.entries(bad).map(([k, c]) => ["bad-" + k, modSrc(c)]), ...Object.entries(good).map(([k, c]) => ["good-" + k, modSrc(c)])]);
const out = await page.evaluate(async (cases) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const res = {};
  for (const [k, src] of Object.entries(cases))
    res[k] = String((await byId.get("write_file").execute({ file_path: `/src/@probe/${k.toLowerCase()}.js`, content: src }, { sessionState: {} }))?.output ?? "");
  return res;
}, cases);
let ok = true;
for (const [k, r] of Object.entries(out)) {
  const warn = r.match(/⚠[^·]*(draws? NO DATA|NaN|undefined)[^·]*/)?.[0];
  const errs = /ERRORING/.test(r);
  const pass = !errs && (k.startsWith("bad-") ? !!warn && /\bchart\b/.test(warn) : !warn && /✓ all/.test(r));
  ok &&= pass;
  console.log(pass ? "ok  " : "FAIL", k.padEnd(20), (warn || r.match(/[✓⚠][^·]*/)?.[0] || r.slice(0, 200)).slice(0, 260));
}
console.log(ok ? "PASS" : "FAIL (an empty chart reported as computing, or a correct chart warned)");
await close();
process.exit(ok ? 0 : 1);
