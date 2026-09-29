// rc5-train eval (20260929-0620-m71): «Add a test that the bar chart in my notebook renders one bar per month
// in the data.»
// setup.files seeds @user/monthly-sales. Data: 104 rows, every 150th row of purchase_data.csv, the Google
// Merchandise Store attachment of @tomlarkworthy/cloudevents-explorer
// (lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html); columns date, category, price_in_usd, parsed
// with d3.autoType. Months (UTC): 2020-11 (42 rows), 2020-12 (45), 2021-01 (17). `monthly` groups by
// d3.utcMonth as that notebook's `data` cell groups by d3.utcDay; the chart copies the barY idiom of
// rc5t-monthly-totals-chart's reference fix. The module has no tests.
// setup.collect scores the agent's test_* cells by behaviour, any cell names, any user module:
//   hasTest      at least one new test_* cell exists
//   passes       every new test_* cell resolves to a defined value on the seeded, correct chart
//   domDrop      the chart cell is redefined to render, then remove its last bar <rect>: some new test fails
//                (a test that checks data rows, not the rendered bars, passes here)
//   aggDrop      `monthly` is redefined to drop its last month (sales unchanged): some new test fails
//                (a test that compares the bars with `monthly.length` passes here)
//   moreMonths   two more months of rows are appended to `sales`; the chart draws 5 bars; every new test
//                passes (a test that hard-codes 3 fails here)
//   restored     the seeded definitions are put back; every new test passes again
//   errors       no non-test user variable holds an error

const CSV = "date,category,price_in_usd\n2020-11-01T00:27:14Z,Bags,10\n2020-11-02T19:11:58Z,Accessories,11\n2020-11-03T20:34:19Z,Campus Collection,7\n2020-11-05T01:30:20Z,Apparel,63\n2020-11-06T05:30:15Z,Drinkware,12\n2020-11-07T05:36:36Z,Apparel,89\n2020-11-08T23:18:29Z,Bags,10\n2020-11-10T04:48:34Z,New,17\n2020-11-10T23:14:14Z,Uncategorized Items,44\n2020-11-11T15:09:27Z,Accessories,4\n2020-11-12T09:48:43Z,Apparel,16\n2020-11-13T08:40:26Z,Apparel,22\n2020-11-14T04:32:38Z,Apparel,55\n2020-11-16T04:20:35Z,Uncategorized Items,22\n2020-11-16T21:35:05Z,Apparel,24\n2020-11-17T10:05:34Z,Campus Collection,1\n2020-11-17T20:46:44Z,Google,7\n2020-11-18T15:16:58Z,New,10\n2020-11-19T10:46:59Z,Apparel,46\n2020-11-19T23:45:23Z,Apparel,22\n2020-11-20T08:49:28Z,Apparel,20\n2020-11-20T19:34:57Z,Apparel,24\n2020-11-21T04:55:28Z,Apparel,14\n2020-11-22T03:50:05Z,Apparel,14\n2020-11-23T03:36:44Z,New,12\n2020-11-23T15:24:43Z,Apparel,46\n2020-11-23T21:30:34Z,Apparel,24\n2020-11-24T05:16:58Z,Apparel,24\n2020-11-24T14:10:41Z,Apparel,24\n2020-11-24T21:45:18Z,Accessories,3\n2020-11-25T03:56:58Z,Apparel,46\n2020-11-25T14:35:38Z,New,12\n2020-11-26T00:09:53Z,Shop by Brand,30\n2020-11-27T00:07:42Z,Small Goods,3\n2020-11-27T09:45:31Z,Clearance,14\n2020-11-27T22:46:47Z,Drinkware,4\n2020-11-28T06:27:07Z,Apparel,17\n2020-11-28T22:26:27Z,Accessories,4\n2020-11-29T21:21:48Z,Office,3\n2020-11-30T10:04:46Z,Apparel,89\n2020-11-30T18:03:26Z,Apparel,24\n2020-11-30T22:52:16Z,Apparel,18\n2020-12-01T05:53:52Z,Apparel,14\n2020-12-02T00:12:07Z,Apparel,44\n2020-12-02T17:18:58Z,Apparel,30\n2020-12-03T04:50:06Z,Apparel,48\n2020-12-03T20:22:56Z,Office,3\n2020-12-04T11:07:16Z,New,7\n2020-12-05T00:22:36Z,Campus Collection,7\n2020-12-05T13:08:02Z,Apparel,44\n2020-12-06T09:46:27Z,Accessories,4\n2020-12-07T07:51:19Z,Uncategorized Items,44\n2020-12-07T17:49:18Z,Apparel,63\n2020-12-08T05:24:08Z,Apparel,14\n2020-12-08T16:00:43Z,Shop by Brand,30\n2020-12-09T03:24:09Z,New,48\n2020-12-09T09:08:35Z,Apparel,48\n2020-12-09T17:43:34Z,Apparel,44\n2020-12-10T00:17:31Z,Accessories,3\n2020-12-10T10:38:40Z,Uncategorized Items,4\n2020-12-10T15:47:28Z,Stationery,1\n2020-12-11T02:09:52Z,Apparel,45\n2020-12-11T07:57:17Z,Office,3\n2020-12-11T15:26:37Z,Shop by Brand,14\n2020-12-12T01:15:39Z,New,25\n2020-12-12T07:18:21Z,Drinkware,10\n2020-12-13T02:06:31Z,Accessories,16\n2020-12-13T20:08:14Z,Apparel,48\n2020-12-14T10:14:36Z,Apparel,18\n2020-12-14T17:30:25Z,Apparel,28\n2020-12-15T06:07:49Z,Lifestyle,22\n2020-12-15T16:31:14Z,Drinkware,10\n2020-12-16T02:19:08Z,Apparel,14\n2020-12-16T09:10:13Z,Apparel,10\n2020-12-16T18:06:45Z,Apparel,92\n2020-12-17T02:50:38Z,Drinkware,20\n2020-12-17T15:29:13Z,Apparel,13\n2020-12-18T00:34:21Z,Apparel,24\n2020-12-18T15:51:24Z,New,2\n2020-12-19T00:29:27Z,New,12\n2020-12-20T16:22:47Z,Uncategorized Items,60\n2020-12-22T01:48:29Z,Campus Collection,14\n2020-12-22T22:17:02Z,Bags,28\n2020-12-23T19:49:47Z,Apparel,19\n2020-12-26T18:49:31Z,Apparel,44\n2020-12-28T15:48Z,Clearance,9\n2020-12-31T00:39:29Z,Apparel,55\n2021-01-02T20:25:56Z,New,15\n2021-01-06T06:01:50Z,Apparel,44\n2021-01-08T08:14:52Z,Clearance,1\n2021-01-10T23:09:37Z,Drinkware,12\n2021-01-12T16:51:41Z,Apparel,55\n2021-01-14T06:20:51Z,Apparel,55\n2021-01-15T12:06:50Z,Apparel,46\n2021-01-18T15:33:13Z,Shop by Brand,37\n2021-01-19T21:41:26Z,Apparel,36\n2021-01-20T09:12:47Z,Google,7\n2021-01-20T21:05:21Z,Apparel,44\n2021-01-21T14:09:06Z,Apparel,16\n2021-01-22T05:42:41Z,Clearance,3\n2021-01-22T21:01:17Z,Shop by Brand,1\n2021-01-23T13:00:36Z,Bags,70\n2021-01-25T00:09:04Z,Office,5\n2021-01-25T23:18:19Z,Apparel,18";

const BT = "`";
export const FIXTURE = `const _intro = function _intro(md){return(
md${BT}# Monthly sales

Purchases from the Google Merchandise Store sample data. The chart shows revenue per month.${BT}
)};
const _chart = function _chart(Plot,d3,monthly){return(
Plot.plot({
  marginLeft: 60,
  x: { type: "band", label: null, tickFormat: d3.utcFormat("%b %Y") },
  y: { label: "Revenue (USD)", grid: true },
  marks: [
    Plot.barY(monthly, { x: "month", y: "total", fill: "steelblue", tip: true }),
    Plot.ruleY([0])
  ]
})
)};
const _monthly = function _monthly(d3,sales){return(
d3
  .rollups(sales, (v) => d3.sum(v, (d) => d.price_in_usd), (d) => d3.utcMonth(d.date))
  .map(([month, total]) => ({ month, total }))
  .sort((a, b) => a.month - b.month)
)};
const _sales = function _sales(d3,sales_csv){return(
d3.csvParse(sales_csv, d3.autoType)
)};
const _sales_csv = function _sales_csv(){return(
${BT}${CSV}${BT}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_intro", null, ["md"], _intro);
  $def("_chart", "chart", ["Plot", "d3", "monthly"], _chart);
  $def("_monthly", "monthly", ["d3", "sales"], _monthly);
  $def("_sales", "sales", ["d3", "sales_csv"], _sales);
  $def("_sales_csv", "sales_csv", [], _sales_csv);
  return main;
}
`;

// Test cells appended before `export default` and $def lines appended after the last $def.
const addTests = (cells, defs) => FIXTURE
  .replace("\nexport default function define", "\n" + cells + "\nexport default function define")
  .replace(`  $def("_sales_csv", "sales_csv", [], _sales_csv);\n`, `  $def("_sales_csv", "sales_csv", [], _sales_csv);\n${defs}\n`);

// Reference: count the bars the chart drew, compare with the distinct UTC months in the data.
export const SOLUTION = addTests(
`const _test_chart_one_bar_per_month = function _test_chart_one_bar_per_month(chart,sales,d3){
  const months = new Set(sales.map((d) => +d3.utcMonth(d.date))).size;
  const bars = chart.querySelectorAll("g[aria-label='bar'] rect").length;
  if (bars !== months) throw new Error("chart draws " + bars + " bars for " + months + " months in the data");
  return bars + " bars, " + months + " months";
};`,
`  $def("_test_chart_one_bar_per_month", "test_chart_one_bar_per_month", ["chart", "sales", "d3"], _test_chart_one_bar_per_month);`);

// Negative controls (scored with --oracle through eval-neg.mjs)
export const NEG_ROWS = addTests(   // checks the data rows, never looks at the chart
`const _test_one_row_per_month = function _test_one_row_per_month(monthly,sales,d3){
  const months = new Set(sales.map((d) => +d3.utcMonth(d.date))).size;
  if (monthly.length !== months) throw new Error("monthly has " + monthly.length + " rows for " + months + " months");
  return monthly.length;
};`,
`  $def("_test_one_row_per_month", "test_one_row_per_month", ["monthly", "sales", "d3"], _test_one_row_per_month);`);
export const NEG_HARDCODED = addTests(   // counts bars, but against a literal
`const _test_chart_has_3_bars = function _test_chart_has_3_bars(chart){
  const bars = chart.querySelectorAll("g[aria-label='bar'] rect").length;
  if (bars !== 3) throw new Error("expected 3 bars, got " + bars);
  return bars;
};`,
`  $def("_test_chart_has_3_bars", "test_chart_has_3_bars", ["chart"], _test_chart_has_3_bars);`);
export const NEG_AGGREGATE = addTests(   // counts bars against the chart's own input, not the data
`const _test_bar_per_row = function _test_bar_per_row(chart,monthly){
  const bars = chart.querySelectorAll("g[aria-label='bar'] rect").length;
  if (bars !== monthly.length) throw new Error(bars + " bars for " + monthly.length + " rows");
  return bars;
};`,
`  $def("_test_bar_per_row", "test_bar_per_row", ["chart", "monthly"], _test_bar_per_row);`);

// Two further months, appended to the seeded rows for the moreMonths check.
const EXTRA_ROWS = [
  { date: "2021-02-03T10:00:00Z", category: "Apparel", price_in_usd: 20 },
  { date: "2021-02-17T18:30:00Z", category: "Bags", price_in_usd: 14 },
  { date: "2021-03-09T08:15:00Z", category: "Office", price_in_usd: 6 },
];

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const mod = globalThis.__ojs_runtime.mains.get("@user/monthly-sales");
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module).filter(m => m !== mod));
  globalThis.__rc5tSeededTests = new Set([...rt._variables].filter(v => /^test_/.test(v._name || "")));
})()`;

const COLLECT = String.raw`(async (EXTRA) => {
  const KEYS = ["hasTest", "passes", "domDrop", "aggDrop", "moreMonths", "restored", "errors"];
  const out = Object.fromEntries(KEYS.map(k => [k, "not checked"]));
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const before = globalThis.__rc5tBefore || new Set();
  const seededTests = globalThis.__rc5tSeededTests || new Set();
  const mod = globalThis.__ojs_runtime.mains.get("@user/monthly-sales");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const all = () => [...rt._variables].filter(v => !before.has(v._module) || v._module === mod);
  const named = () => all().filter(v => v._name && !String(v._name).startsWith("module ") && v._name !== "@variable");
  const keepers = [];
  for (const v of named()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const settle = async (v, ms = 5000) => {
    for (let i = 0; i < 4; i++) {
      const p = v._promise;
      const r = await Promise.race([p.then(value => ({ ok: true, value }), error => ({ ok: false, error })), sleep(ms).then(() => ({ ok: false, error: "timeout" }))]);
      if (p === v._promise) return r;
    }
    return { ok: false, error: "unsettled" };
  };
  const settleAll = async () => { await sleep(800); for (const v of named()) await settle(v, 3000); };
  const tests = () => named().filter(v => /^test_/.test(v._name) && !seededTests.has(v));
  const msg = s => String(s.error && s.error.message || s.error).slice(0, 100);
  const run = async () => {
    const st = [];
    for (const v of tests()) st.push({ name: v._name, ...(await settle(v)) });
    return st;
  };
  const allPass = st => st.every(s => s.ok && s.value !== undefined);
  const describe = st => st.map(s => s.name + (s.ok ? (s.value === undefined ? "=undefined" : " passed") : " failed: " + msg(s))).join("; ");
  const bars = v => { const el = v && v._value; return el && typeof el.querySelectorAll === "function" ? el.querySelectorAll("g[aria-label='bar'] rect").length : -1; };
  const saved = [];
  const redefine = (v, def) => { const ins = v._inputs.map(i => i._name); saved.push([v, v._name, ins, v._definition]); v.define(v._name, ins, def); };
  const restoreAll = () => { while (saved.length) { const [v, n, ins, d] = saved.pop(); try { v.define(n, ins, d); } catch {} } };
  try {
    await settleAll();
    const chartVar = named().find(v => v._module === mod && v._name === "chart" && bars(v) > 0) || named().find(v => bars(v) > 0);
    const monthlyVar = named().find(v => v._module === mod && v._name === "monthly");
    const salesVar = named().find(v => v._module === mod && v._name === "sales");
    const ts = tests();
    out.testNames = ts.map(v => (v._module === mod ? "" : "(other module) ") + v._name);
    out.hasTest = ts.length ? "ok" : "no new test_* cell";
    if (!ts.length) return out;
    let st = await run();
    out.passes = allPass(st) ? "ok" : "on the correct chart: " + describe(st);

    // errors (before any mutation)
    const errs = all().filter(v => v._error != null && !/^test_/.test(v._name || "")).map(v => (v._name || "<anonymous>") + ": " + String(v._error && v._error.message || v._error).slice(0, 100));
    out.errors = errs.length ? errs.join("; ") : "ok";

    if (!chartVar) { out.domDrop = out.aggDrop = out.moreMonths = "no bar chart found"; return out; }
    out.barsSeen = bars(chartVar);

    // domDrop: the chart renders, then loses its last bar
    const chartDef = chartVar._definition;
    redefine(chartVar, function (...args) {
      return Promise.resolve(chartDef.apply(this, args)).then(el => {
        const rs = el.querySelectorAll("g[aria-label='bar'] rect");
        if (rs.length) rs[rs.length - 1].remove();
        return el;
      });
    });
    await settleAll();
    st = await run();
    out.domDropBars = bars(chartVar);
    out.domDrop = st.some(s => !s.ok || s.value === undefined) ? "ok" : "chart drew " + out.domDropBars + " bars for 3 months; " + describe(st);
    restoreAll(); await settleAll();

    // aggDrop: the aggregate loses its last month, the data does not
    if (!monthlyVar) out.aggDrop = "no monthly cell";
    else {
      const mDef = monthlyVar._definition;
      redefine(monthlyVar, function (...args) { return Promise.resolve(mDef.apply(this, args)).then(a => a.slice(0, -1)); });
      await settleAll();
      st = await run();
      out.aggDropBars = bars(chartVar);
      out.aggDrop = st.some(s => !s.ok || s.value === undefined) ? "ok" : "chart drew " + out.aggDropBars + " bars for 3 months; " + describe(st);
      restoreAll(); await settleAll();
    }

    // moreMonths: two more months in the data; the chart is correct, so every test must pass
    if (!salesVar) out.moreMonths = "no sales cell";
    else {
      const sDef = salesVar._definition;
      redefine(salesVar, function (...args) {
        return Promise.resolve(sDef.apply(this, args)).then(rows => rows.concat(EXTRA.map(r => ({ ...r, date: new Date(r.date) }))));
      });
      await settleAll();
      st = await run();
      out.moreMonthsBars = bars(chartVar);
      out.moreMonths = out.moreMonthsBars !== 5 ? "fixture: chart drew " + out.moreMonthsBars + " bars, wanted 5" : allPass(st) ? "ok" : "chart correct (5 bars, 5 months) but: " + describe(st);
      restoreAll(); await settleAll();
    }

    st = await run();
    out.restored = allPass(st) ? "ok" : describe(st);
    return out;
  } finally {
    restoreAll();
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})(${JSON.stringify(EXTRA_ROWS)})`;

export const setup = {
  files: { "/src/@user/monthly-sales.js": FIXTURE },
  init: INIT,
  collect: COLLECT,
};

export const criteria = [
  { name: "collected_equals", args: { key: "hasTest", equals: "ok" }, weight: 1 },
  { name: "collected_equals", args: { key: "passes", equals: "ok" }, weight: 1 },
  // the test counts the bars the chart rendered
  { name: "collected_equals", args: { key: "domDrop", equals: "ok" }, weight: 3 },
  // ... against the months in the data, not against the chart's own input
  { name: "collected_equals", args: { key: "aggDrop", equals: "ok" }, weight: 1 },
  // ... and not against a literal
  { name: "collected_equals", args: { key: "moreMonths", equals: "ok" }, weight: 2 },
  { name: "collected_equals", args: { key: "restored", equals: "ok" }, weight: 1 },
  { name: "collected_equals", args: { key: "errors", equals: "ok" }, weight: 1 },
];

const oracleFor = src => [
  { tool: "read_file", args: { file_path: "/src/@user/monthly-sales.js" } },
  { tool: "write_file", args: { file_path: "/src/@user/monthly-sales.js", content: src } },
  { assistant: "Added test_chart_one_bar_per_month. It counts the bar rects in the rendered chart and compares them with the number of distinct months in the sales data; it passes now with 3 bars for 3 months." },
];
export { oracleFor };

export default {
  id: "rc5t-chart-bar-count-test",
  category: "rc5-train",
  question: "Add a test that the bar chart in my notebook renders one bar per month in the data.",
  setup,
  criteria,
  oracle: oracleFor(SOLUTION),
};
