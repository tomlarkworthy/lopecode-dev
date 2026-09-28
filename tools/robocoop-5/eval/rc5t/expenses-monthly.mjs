// rc5t-expenses-monthly: the user's own messy expenses CSV -> stacked monthly bars by category + a top-5
// categories table. The agent cannot know the file, so it must ask (request_files). The fixture
// (expenses.csv, made by make-fixture.mjs) has 163 rows over 2026-01..08 and 8 categories, plus the messes a
// real export has: two blank amounts, three amounts written "$1,450.00" / "$1,234.50" (d3.autoType leaves
// those as strings, and Number("$1,450.00") is NaN), and "groceries"/"DINING" next to "Groceries"/"Dining".
// Expected values are computed here in node from the CSV text, independently of any notebook code:
// blank amounts count 0, "$1,234.50" is 1234.5, categories compare case-insensitively.
// Scoring is behavioural (setup.collect), so any module id, cell names and data shape pass:
//   monthlyTotals — a Plot chart in a new module: bands left-to-right hold the 8 months' totals (read by
//                   inverting the y scale over each band's rects; months out of order fail).
//   stackCells    — each (month, category) segment's height equals that pair's sum (fill -> category via the
//                   color scale).
//   categories    — the chart's color domain is the 8 categories, no case duplicates.
//   top5          — a <table> in a new module lists exactly the 5 largest categories in order, each with its
//                   total (within $1). Dropping "$1,234.50" moves Shopping from 3rd to 6th; unmerged case
//                   variants lower Groceries and Dining.
// Limitation: a chart not drawn with Plot (d3 by hand, canvas) fails monthlyTotals/stackCells.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CSV = readFileSync(resolve(here, "fixtures/expenses.csv"), "utf8");

function expected(text) {
  const lines = text.trim().split("\n").slice(1);
  const canon = {}, byMonth = {}, byCat = {}, byMonthCat = {};
  for (const line of lines) {
    const m = line.match(/^([^,]*),([^,]*),(.*)$/);
    const [, date, rawCat, rawAmt] = m;
    const amt = rawAmt.trim() === "" ? 0 : Number(rawAmt.replace(/^"|"$/g, "").replace(/[$,]/g, ""));
    const key = rawCat.trim().toLowerCase();
    if (!canon[key] || rawCat[0] === rawCat[0].toUpperCase() && rawCat !== rawCat.toUpperCase()) canon[key] = rawCat.trim();
    const mo = date.slice(0, 7);
    byMonth[mo] = (byMonth[mo] || 0) + amt;
    byCat[key] = (byCat[key] || 0) + amt;
    (byMonthCat[mo] ||= {})[key] = (byMonthCat[mo][key] || 0) + amt;
  }
  const months = Object.keys(byMonth).sort();
  const top5 = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => [k, Math.round(v * 100) / 100]);
  return { months, monthly: months.map(m => Math.round(byMonth[m] * 100) / 100), byMonthCat, cats: Object.keys(byCat), top5 };
}
const EXP = expected(CSV);

const COLLECT = String.raw`(async (EXP) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rt = globalThis.__ojs_runtime;
  const base = globalThis.__baseMods || new Set();
  const out = { newModules: [...rt.mains.keys()].filter(n => !base.has(n)), monthlyTotals: false, stackCells: false, categories: false, top5: false };
  const newVars = () => [...rt._variables].filter(v => v._module && v._name && out.newModules.some(n => rt.mains.get(n) === v._module));
  const keepers = [];
  for (const v of newVars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const close = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.005);
  try {
    await sleep(2000);
    const els = newVars().map(v => v._value).filter(x => x instanceof Element);
    // ---- chart: any Plot element (it carries .scale) in a new module
    const plots = [];
    for (const e of els) for (const p of [e, ...e.querySelectorAll("figure, svg")]) if (typeof p.scale === "function" && !plots.includes(p)) plots.push(p);
    out.plots = plots.length;
    const tries = [];
    for (const p of plots) {
      let y, color;
      try { y = p.scale("y"); color = p.scale("color"); } catch { continue; }
      if (!y || typeof y.invert !== "function") continue;
      const svgs = p.matches("svg") ? [p] : [...p.querySelectorAll("svg")];
      const svg = svgs.sort((a, b) => b.querySelectorAll("rect").length - a.querySelectorAll("rect").length)[0];
      if (!svg) continue;
      const rects = [...svg.querySelectorAll("rect")].filter(r => r.hasAttribute("height") && r.hasAttribute("y"));
      const bands = new Map();
      for (const r of rects) {
        const x = Math.round(+r.getAttribute("x") * 2) / 2, ry = +r.getAttribute("y"), h = +r.getAttribute("height");
        const v = Math.abs(y.invert(ry) - y.invert(ry + h));
        const fill = r.getAttribute("fill") || r.parentElement?.getAttribute("fill");
        (bands.get(x) || bands.set(x, []).get(x)).push({ v, fill });
      }
      const order = [...bands.keys()].sort((a, b) => a - b);
      const totals = order.map(x => Math.round(bands.get(x).reduce((s, d) => s + d.v, 0) * 100) / 100);
      const t = { rects: rects.length, totals };
      t.monthlyTotals = totals.length === EXP.months.length && totals.every((v, i) => close(v, EXP.monthly[i]));
      if (color && Array.isArray(color.domain)) {
        const dom = color.domain.map(String);
        const norm = dom.map(d => d.trim().toLowerCase());
        t.colorDomain = dom;
        t.categories = new Set(norm).size === norm.length && norm.length === EXP.cats.length && EXP.cats.every(c => norm.includes(c));
        if (typeof color.apply === "function" && t.monthlyTotals) {
          const byFill = new Map(dom.map(d => [String(color.apply(d)).toLowerCase(), d.trim().toLowerCase()]));
          const bad = [];
          order.forEach((x, i) => {
            const got = {};
            for (const d of bands.get(x)) { const c = byFill.get(String(d.fill).toLowerCase()); if (c) got[c] = (got[c] || 0) + d.v; else bad.push("fill " + d.fill); }
            const want = EXP.byMonthCat[EXP.months[i]];
            for (const c of EXP.cats) if (!close(got[c] || 0, want[c] || 0)) bad.push(EXP.months[i] + " " + c + " " + (got[c] || 0).toFixed(2) + " want " + (want[c] || 0).toFixed(2));
          });
          t.stackBad = bad.slice(0, 5);
          t.stackCells = bad.length === 0;
        }
      }
      tries.push(t);
    }
    out.chart = tries.slice(0, 3);
    out.monthlyTotals = tries.some(t => t.monthlyTotals);
    out.stackCells = tries.some(t => t.stackCells);
    out.categories = tries.some(t => t.categories);
    // ---- top-5 table: a <table> in a new module naming >= 3 categories
    const tables = els.flatMap(e => e.matches("table") ? [e] : [...e.querySelectorAll("table")]);
    const words = EXP.cats;
    const seen = [];
    for (const t of tables) {
      const trs = [...t.querySelectorAll("tr")].filter(tr => !tr.querySelector("th") || tr.querySelector("td"));
      const rows = [];
      for (const tr of trs) {
        const cells = [...tr.children].map(c => c.textContent.trim());
        const cat = words.find(c => cells.some(x => x.toLowerCase() === c));
        const nums = cells.flatMap(x => (x.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(s => +s.replace(/,/g, "")));
        rows.push({ cat, nums });
      }
      if (rows.filter(r => r.cat).length < 3) continue;
      const r = { rows: rows.map(r => (r.cat || "?") + ":" + r.nums.join("|")).slice(0, 8) };
      r.ok = rows.length === 5 && rows.every((row, i) => row.cat === EXP.top5[i][0] && row.nums.some(n => close(n, EXP.top5[i][1])));
      seen.push(r);
    }
    out.tables = seen.slice(0, 3);
    out.top5 = seen.some(r => r.ok);
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})(__EXP__)`.replace("__EXP__", JSON.stringify(EXP));

// Oracle: the stacked bar is @observablehq/plot-stack's `Plot.barY(crimea, {x: "date", y: "deaths", fill: "cause"})`
// with a band x (lopebooks @tomlarkworthy_cloudevents-explorer.html); the file read and table are
// @observablehq/plot-exploration-penguins' `FileAttachment(...).csv({typed: true})` / `Inputs.table(data)`
// (same file). Cleaning the amount and category is written fresh: no corpus cell parses "$1,234.50".
const ORACLE_SRC = `const _intro = function intro(md){return( md\`# Expenses\` )};
const _raw = function raw(FileAttachment){return( FileAttachment("expenses.csv").csv() )};
const _expenses = function expenses(raw){return(
raw.map(d => ({
  month: d.date.slice(0, 7),
  category: d.category.trim().charAt(0).toUpperCase() + d.category.trim().slice(1).toLowerCase(),
  amount: Number(String(d.amount).replace(/[$,\\s]/g, "")) || 0
}))
)};
const _chart = function chart(Plot, expenses){return(
Plot.plot({
  x: {type: "band", label: null},
  y: {grid: true, label: "Spending"},
  color: {legend: true},
  marks: [
    Plot.barY(expenses, Plot.groupX({y: "sum"}, {x: "month", y: "amount", fill: "category"})),
    Plot.ruleY([0])
  ]
})
)};
const _top5 = function top5(d3, expenses){return(
d3.rollups(expenses, v => d3.sum(v, d => d.amount), d => d.category)
  .map(([category, total]) => ({category, total: Math.round(total * 100) / 100}))
  .sort((a, b) => b.total - a.total)
  .slice(0, 5)
)};
const _table = function table(Inputs, top5){return( Inputs.table(top5) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_raw", "raw", ["FileAttachment"], _raw);
  $def("_expenses", "expenses", ["raw"], _expenses);
  $def("_chart", "chart", ["Plot", "expenses"], _chart);
  $def("_top5", "top5", ["d3", "expenses"], _top5);
  $def("_table", "table", ["Inputs", "top5"], _table);
  return main;
}
`;

export default {
  id: "rc5t-expenses-monthly",
  category: "rc5-train",
  question: "I have a CSV of my expenses (date, category, amount). Show me a stacked bar chart of spending per month by category, and a table of the top 5 categories overall.",
  setup: {
    init: "globalThis.__baseMods = new Set(globalThis.__ojs_runtime.mains.keys())",
    answer: { files: [{ name: "expenses.csv", content: CSV, type: "text/csv" }] },
    collect: COLLECT,
  },
  criteria: [
    { name: "tool_call_matches", args: { name: "request_files", pattern: "." }, weight: 1 },
    { name: "collected_equals", args: { key: "monthlyTotals", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "stackCells", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "categories", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "top5", equals: true }, weight: 2 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "request_files", args: { module: "@user/expenses", prompt: "your expenses CSV", accept: ".csv" } },
    { tool: "write_file", args: { file_path: "/src/@user/expenses.js", content: ORACLE_SRC } },
    { tool: "attach_file", args: { module: "@user/expenses", name: "expenses.csv", content: CSV, mime: "text/csv" }, settleMs: 3000 },
  ],
};

export { EXP, ORACLE_SRC, CSV };
