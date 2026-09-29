// rc5-train eval (20260929-0620-m54): «All my notebook's tests pass, but the monthly totals chart looks wrong.
// Find out why and fix it.»
// setup.files seeds @user/merch-sales. Data: 265 rows sampled from purchase_data.csv, the Google Merchandise
// Store attachment of @tomlarkworthy/cloudevents-explorer (lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html);
// every 80th row plus every 6th row within 8-9 h of a UTC month boundary; columns date, brand, category,
// price_in_usd. Parsed with d3.autoType, as the original's FileAttachment(...).csv({typed: true}).
// monthlyTotals copies that notebook's `data` cell (grouping by d3.utcDay) with d3.utcMonth; the chart copies
// its barY idiom. Four test_* cells cover monthlyTotals and pass in every time zone.
// Seeded defect: the chart does not call monthlyTotals. It groups inline by
// new Date(d.date.getFullYear(), d.date.getMonth(), 1), the LOCAL month, and labels ticks with d3.timeFormat.
// The page runs in America/Los_Angeles: the chart grows an "Oct 2020" bar and moves $488 from Dec to Nov.
// setup.collect scores behaviour, any module id / cell names:
//   west       in LA, every bar chart in the user's modules has 3 bars, left to right = the UTC month totals
//              (inverted from the y scale), and x tick labels naming Nov 2020, Dec 2020, Jan 2021
//   east       the same after switching the page to Asia/Tokyo and recomputing (an "+8 h" patch fails here)
//   gapClosed  a tested path feeds the chart: the chart depends (transitively) on monthlyTotals and breaks when
//              monthlyTotals is replaced by a throwing mutant; or a test_* cell added by the agent depends on
//              the chart or on a cell the chart reads that is derived from the data
//   testsPass  every test_* cell resolves to a defined value
//   testsIntact the 4 seeded tests still exist, and with monthlyTotals swapped for a local-month version
//              (in LA) a test_* cell rejects: the suite was not weakened
//   errors     no user variable holds an error
// The reply must name the cause: the chart computed its own totals (not the tested helper) in local time.
// (m54 baseline blamed the band scale and still matched a loose /UTC|monthlyTotals/ pair; these need the claim.)

const CSV = "date,brand,category,price_in_usd\n2020-11-01T00:27:14Z,Google,Bags,10\n2020-11-01T00:27:14Z,Google,Apparel,21\n2020-11-01T06:17:40Z,Android,Apparel,20\n2020-11-02T09:54:37Z,Google,New,12\n2020-11-02T21:52:41Z,Google,New,12\n2020-11-03T07:56:06Z,Google,Uncategorized Items,18\n2020-11-03T23:07:54Z,Google,Apparel,14\n2020-11-04T12:28:16Z,Google,Lifestyle,18\n2020-11-05T09:53:34Z,Google,Apparel,19\n2020-11-06T03:39:46Z,Google,Apparel,14\n2020-11-06T11:13:15Z,Google,New,24\n2020-11-07T00:56Z,Google,Apparel,24\n2020-11-07T20:32:40Z,Google,Accessories,40\n2020-11-08T20:03:11Z,Google,Stationery,12\n2020-11-09T12:18:44Z,Google,Office,3\n2020-11-10T01:43:28Z,Google,Small Goods,8\n2020-11-10T15:28:01Z,Google,Accessories,8\n2020-11-10T23:14:14Z,Google,Uncategorized Items,44\n2020-11-11T06:17:17Z,Google,Small Goods,3\n2020-11-11T16:32:47Z,Android,Accessories,2\n2020-11-12T03:24:02Z,Android,Apparel,18\n2020-11-12T12:42:52Z,Google,Apparel,19\n2020-11-13T02:10:18Z,YouTube,Apparel,12\n2020-11-13T13:23:38Z,Google,Lifestyle,18\n2020-11-13T22:47:08Z,Google,Apparel,14\n2020-11-14T17:52:55Z,Google,Apparel,44\n2020-11-15T23:08:45Z,Android,New,13\n2020-11-16T12:28:48Z,Google,Campus Collection,14\n2020-11-16T20:18:49Z,Google,Apparel,32\n2020-11-17T03:43:13Z,Google,Apparel,46\n2020-11-17T08:51:11Z,Google,Office,2\n2020-11-17T16:33:43Z,Google,Apparel,28\n2020-11-17T20:46:44Z,Google,Google,7\n2020-11-18T07:55:18Z,Google,Apparel,24\n2020-11-18T17:54:43Z,Google,Campus Collection,32\n2020-11-19T04:04:31Z,Google,Campus Collection,6\n2020-11-19T13:50:32Z,Google,Campus Collection,1\n2020-11-19T15:54:29Z,Google,Office,3\n2020-11-20T00:21:34Z,Android,Accessories,16\n2020-11-20T05:08:14Z,Google,Office,3\n2020-11-20T13:56:27Z,Google,Apparel,115\n2020-11-20T17:40:50Z,Google,Apparel,24\n2020-11-20T23:46:35Z,Google,New,3\n2020-11-21T04:24:25Z,Google,Apparel,14\n2020-11-21T10:51:30Z,Google,Apparel,19\n2020-11-22T03:12:30Z,Android,Accessories,2\n2020-11-22T21:48:20Z,Google,Bags,14\n2020-11-23T03:36:44Z,Google,New,12\n2020-11-23T08:07:33Z,Google,Writing Instruments,2\n2020-11-23T15:56:32Z,Google,Apparel,24\n2020-11-23T20:16:02Z,Google,New,7\n2020-11-23T22:04:05Z,Google,Apparel,44\n2020-11-24T02:29:30Z,Google,Drinkware,20\n2020-11-24T06:06:09Z,Google,Stationery,1\n2020-11-24T12:21:52Z,Google,Apparel,24\n2020-11-24T16:08:28Z,Google,Apparel,44\n2020-11-24T20:02:40Z,Google,Campus Collection,1\n2020-11-25T00:07:53Z,Google,Campus Collection,7\n2020-11-25T02:41:57Z,Google,Apparel,14\n2020-11-25T07:14:38Z,Google,Campus Collection,7\n2020-11-25T12:59:36Z,Google,New,7\n2020-11-25T20:25:54Z,Google,Apparel,44\n2020-11-26T00:09:53Z,Google,Shop by Brand,30\n2020-11-26T12:22:42Z,Google,Small Goods,8\n2020-11-27T00:07:42Z,Google,Clearance,3\n2020-11-27T05:05:44Z,Google,Shop by Brand,37\n2020-11-27T11:34:30Z,Google,Apparel,14\n2020-11-27T17:54:59Z,Google,Apparel,48\n2020-11-27T23:50:08Z,Google,Apparel,24\n2020-11-28T06:01:11Z,Google,New,8\n2020-11-28T10:11:18Z,Google,New,48\n2020-11-28T16:16:05Z,Google,Office,3\n2020-11-29T07:46:48Z,Google,Drinkware,18\n2020-11-29T19:17:19Z,Google,Campus Collection,7\n2020-11-30T04:05:46Z,Google,Office,3\n2020-11-30T09:51:55Z,Google,New,10\n2020-11-30T13:21:43Z,Google,Apparel,115\n2020-11-30T15:18:46Z,Google,Apparel,46\n2020-11-30T15:53:28Z,Google,Apparel,19\n2020-11-30T16:06:50Z,Google,Campus Collection,1\n2020-11-30T16:27:16Z,Google,Lifestyle,22\n2020-11-30T16:35:40Z,Google,Office,11\n2020-11-30T16:40:40Z,Google,Apparel,14\n2020-11-30T16:46:59Z,YouTube,Apparel,22\n2020-11-30T17:24:18Z,Google,Apparel,92\n2020-11-30T17:50:49Z,Google,Writing Instruments,2\n2020-11-30T18:03:26Z,Google,Apparel,24\n2020-11-30T18:03:26Z,Google,New,8\n2020-11-30T18:16:06Z,Google,Apparel,20\n2020-11-30T18:16:06Z,YouTube,Apparel,18\n2020-11-30T18:16:06Z,Android,Apparel,20\n2020-11-30T18:20:54Z,Google,Apparel,92\n2020-11-30T18:24:50Z,Google,Uncategorized Items,3\n2020-11-30T18:35:55Z,Google,Accessories,16\n2020-11-30T19:00:35Z,Google,Campus Collection,7\n2020-11-30T19:00:35Z,Google,Clearance,12\n2020-11-30T19:34:22Z,Google,New,8\n2020-11-30T19:51:32Z,Android,Drinkware,4\n2020-11-30T19:59:37Z,YouTube,Drinkware,27\n2020-11-30T20:05:29Z,Google,Apparel,38\n2020-11-30T20:25:59Z,Google,Shop by Brand,25\n2020-11-30T20:25:59Z,Android,Accessories,16\n2020-11-30T20:25:59Z,Google,Lifestyle,16\n2020-11-30T20:40:20Z,Google,Shop by Brand,3\n2020-11-30T20:44:27Z,Google,New,8\n2020-11-30T20:45:36Z,Google,Accessories,3\n2020-11-30T21:13:42Z,Google,Drinkware,18\n2020-11-30T21:18:56Z,Google,Apparel,24\n2020-11-30T21:18:56Z,#IamRemarkable,Apparel,10\n2020-11-30T21:30:21Z,Google,New,12\n2020-11-30T21:47:45Z,Google,Lifestyle,14\n2020-11-30T21:53:11Z,Google,Apparel,30\n2020-11-30T22:25:03Z,Google,Bags,96\n2020-11-30T22:52:16Z,Google,Apparel,14\n2020-11-30T22:59:51Z,Google,Apparel,44\n2020-11-30T22:59:51Z,Google,Apparel,46\n2020-11-30T22:59:51Z,Google,Apparel,46\n2020-11-30T23:04:25Z,Google,Campus Collection,32\n2020-11-30T23:44:56Z,Google,Apparel,24\n2020-11-30T23:49:58Z,Google,Apparel,46\n2020-11-30T23:56:35Z,Google,Apparel,44\n2020-12-01T00:40:21Z,Google,Uncategorized Items,44\n2020-12-01T00:53:14Z,YouTube,Lifestyle,13\n2020-12-01T01:00:31Z,Google,Apparel,71\n2020-12-01T01:04:02Z,Google,Apparel,19\n2020-12-01T01:04:02Z,Google,Uncategorized Items,3\n2020-12-01T02:00:37Z,Google,Apparel,14\n2020-12-01T02:05Z,Google,Campus Collection,1\n2020-12-01T02:10Z,Google,Writing Instruments,2\n2020-12-01T02:38:02Z,Google,Apparel,14\n2020-12-01T02:44:04Z,Google,Office,3\n2020-12-01T03:04:57Z,Google,Accessories,17\n2020-12-01T03:04:57Z,Google,Apparel,79\n2020-12-01T03:17:29Z,Google,Bags,16\n2020-12-01T03:56:16Z,Google,Lifestyle,16\n2020-12-01T04:01:35Z,Google,Office,3\n2020-12-01T04:44:25Z,Google,Uncategorized Items,44\n2020-12-01T04:56:23Z,Google,Accessories,40\n2020-12-01T05:07:55Z,Google,Lifestyle,16\n2020-12-01T05:43:28Z,Android,Clearance,13\n2020-12-01T06:28:57Z,Google,Clearance,9\n2020-12-01T06:35:52Z,Google,Apparel,14\n2020-12-01T07:24:14Z,Google,Office,15\n2020-12-01T07:29:36Z,Google,Apparel,44\n2020-12-01T07:34:33Z,Google,Shop by Brand,25\n2020-12-01T18:22Z,Google,New,12\n2020-12-02T06:18:03Z,Google,Bags,6\n2020-12-02T12:36Z,Google,Campus Collection,1\n2020-12-02T21:40:01Z,Google,Apparel,44\n2020-12-03T03:04:43Z,Google,Apparel,13\n2020-12-03T10:02:53Z,Google,Accessories,40\n2020-12-03T16:54:12Z,Google,Clearance,3\n2020-12-04T04:05:14Z,Google,Clearance,16\n2020-12-04T10:10:53Z,Google,Fun,2\n2020-12-04T16:40:58Z,Google,Campus Collection,7\n2020-12-05T00:22:36Z,Google,Campus Collection,7\n2020-12-05T05:27:06Z,Google,Office,10\n2020-12-05T13:11:31Z,Google,Stationery,1\n2020-12-05T20:07:21Z,Android,Accessories,16\n2020-12-06T11:15:31Z,Google,Apparel,24\n2020-12-07T02:17:09Z,Google,Apparel,60\n2020-12-07T09:26:37Z,Google,Clearance,41\n2020-12-07T15:00:02Z,Google,Campus Collection,7\n2020-12-07T21:22:30Z,Google,New,24\n2020-12-08T03:24:50Z,Google,Google,6\n2020-12-08T09:41:28Z,Google,Apparel,63\n2020-12-08T14:59:09Z,Google,Gift Cards,25\n2020-12-08T19:44:57Z,Google,Clearance,9\n2020-12-09T02:55:32Z,Google,Apparel,18\n2020-12-09T05:20:11Z,Google,Bags,30\n2020-12-09T09:08:35Z,Google,Apparel,48\n2020-12-09T13:19:36Z,YouTube,Apparel,12\n2020-12-09T17:59:05Z,Google,Apparel,44\n2020-12-09T21:35:38Z,Google,Campus Collection,7\n2020-12-10T01:30:57Z,Google,Accessories,28\n2020-12-10T06:53:44Z,Google,New,4\n2020-12-10T11:45:41Z,Google,Campus Collection,7\n2020-12-10T14:39:59Z,Google,Gift Cards,25\n2020-12-10T18:44:09Z,Google,New,12\n2020-12-11T00:11:07Z,Google,Clearance,14\n2020-12-11T03:33:30Z,Google,Accessories,2\n2020-12-11T07:12:16Z,YouTube,Apparel,10\n2020-12-11T10:49:20Z,Google,Campus Collection,1\n2020-12-11T15:08:32Z,Google,Office,11\n2020-12-11T21:04:13Z,Google,Office,2\n2020-12-12T01:15:39Z,Android,New,25\n2020-12-12T03:56:14Z,Google,Campus Collection,7\n2020-12-12T07:28:48Z,Google,Clearance,9\n2020-12-12T15:09:47Z,Google,Office,2\n2020-12-13T04:20:10Z,YouTube,Apparel,22\n2020-12-13T15:53:35Z,Google,Campus Collection,7\n2020-12-13T22:06:22Z,Google,New,12\n2020-12-14T04:26:15Z,Google,Clearance,32\n2020-12-14T14:34:32Z,Google,Apparel,60\n2020-12-14T16:59:03Z,Google,Apparel,19\n2020-12-14T22:43:28Z,Google,Apparel,44\n2020-12-15T04:24:19Z,Android,New,13\n2020-12-15T08:47:02Z,Google,Apparel,63\n2020-12-15T16:05:14Z,Google,Bags,96\n2020-12-15T19:39:02Z,Google,Office,16\n2020-12-16T02:19:08Z,Google,Apparel,14\n2020-12-16T05:32Z,Google,Lifestyle,18\n2020-12-16T10:11:50Z,Google,Lifestyle,22\n2020-12-16T14:54:17Z,Google,Apparel,14\n2020-12-16T19:00:40Z,Android,New,8\n2020-12-16T21:19:10Z,Google,Office,11\n2020-12-17T03:49:18Z,Google,Lifestyle,18\n2020-12-17T10:47:21Z,Google,Drinkware,24\n2020-12-17T18:26:44Z,Google,New,12\n2020-12-17T23:31:48Z,Google,New,28\n2020-12-18T05:44:10Z,Google,Apparel,79\n2020-12-18T14:49:29Z,Google,Office,11\n2020-12-18T20:53:40Z,Android,Accessories,2\n2020-12-18T23:49:33Z,Google Cloud,Shop by Brand,26\n2020-12-19T10:20:57Z,Google,Writing Instruments,2\n2020-12-20T16:22:47Z,Google,Uncategorized Items,60\n2020-12-21T12:50:22Z,Google,Apparel,19\n2020-12-22T02:23:57Z,Google,Office,2\n2020-12-22T08:25:27Z,Google,New,3\n2020-12-23T02:48:55Z,Google,Campus Collection,7\n2020-12-23T12:12:29Z,Google,Lifestyle,18\n2020-12-23T22:54:55Z,Google,Bags,6\n2020-12-25T14:08:33Z,Google,Stationery,1\n2020-12-27T13:39:30Z,Google,Campus Collection,32\n2020-12-28T10:27:12Z,Google,Bags,9\n2020-12-29T06:03:08Z,Google,Google,7\n2020-12-30T18:55:26Z,Google,Writing Instruments,2\n2020-12-31T18:48:58Z,Google,Accessories,4\n2020-12-31T18:48:58Z,Google,Accessories,3\n2020-12-31T19:03:16Z,Google,Bags,6\n2020-12-31T20:07:15Z,Google,Lifestyle,18\n2021-01-01T04:35:19Z,Google,Campus Collection,3\n2021-01-01T04:49:56Z,Google,Shop by Brand,44\n2021-01-02T19:52:02Z,Google,New,12\n2021-01-04T09:52:08Z,Android,Apparel,44\n2021-01-06T06:01:50Z,Google,Apparel,44\n2021-01-07T01:56:17Z,Android,Shop by Brand,2\n2021-01-08T09:41:44Z,Google,Shop by Brand,19\n2021-01-09T19:25:51Z,Google,Apparel,30\n2021-01-11T13:06:34Z,Google,Apparel,46\n2021-01-12T06:46:04Z,Google,Apparel,20\n2021-01-13T00:45:06Z,Google Cloud,Apparel,55\n2021-01-13T22:42:31Z,Google,Apparel,21\n2021-01-14T12:46:58Z,Google Cloud,Apparel,55\n2021-01-15T06:06:57Z,Google,Campus Collection,11\n2021-01-15T22:50:11Z,Google,New,12\n2021-01-18T05:22:54Z,Android,Accessories,2\n2021-01-19T09:39:08Z,Google,Accessories,24\n2021-01-19T20:42:09Z,Google,Apparel,14\n2021-01-20T03:35:17Z,Google,Shop by Brand,3\n2021-01-20T09:12:47Z,Google,Google,7\n2021-01-20T14:50:11Z,Google,Apparel,20\n2021-01-20T21:51:09Z,Android,Apparel,44\n2021-01-21T05:04Z,Google,Shop by Brand,25\n2021-01-21T16:07:15Z,YouTube,New,6\n2021-01-22T01:11:57Z,Google,Apparel,21\n2021-01-22T08:04:39Z,Google,Clearance,9\n2021-01-22T18:48:57Z,Google,Small Goods,8\n2021-01-23T00:01:47Z,Google,Writing Instruments,2\n2021-01-23T09:44:49Z,Google,Apparel,14\n2021-01-24T03:43:19Z,Google,Apparel,21\n2021-01-24T22:55:16Z,Google,Bags,16\n2021-01-25T12:11:29Z,Google,Writing Instruments,2\n2021-01-25T22:28:49Z,Google,Apparel,13\n2021-01-28T05:23:55Z,Google,Stationery,1";

function expected(text) {
  const m = {};
  for (const line of text.split("\n").slice(1)) {
    const [date, , , price] = line.split(",");
    const k = date.slice(0, 7);
    m[k] = (m[k] || 0) + Number(price);
  }
  const months = Object.keys(m).sort();
  return { months, totals: months.map(k => m[k]), sum: months.reduce((s, k) => s + m[k], 0) };
}
export const EXP = expected(CSV);
if (EXP.months.join() !== "2020-11,2020-12,2021-01") throw new Error("merch-sales eval: unexpected months " + EXP.months);

const BT = "`";
const CHART_BUGGY = `const _chart = function _chart(Plot,d3,sales){return(
Plot.plot({
  marginLeft: 60,
  x: { label: null, tickFormat: d3.timeFormat("%b %Y") },
  y: { label: "Revenue (USD)", grid: true },
  marks: [
    Plot.barY(
      d3.rollups(sales, (v) => d3.sum(v, (d) => d.price_in_usd), (d) => new Date(d.date.getFullYear(), d.date.getMonth(), 1)),
      { x: ([month]) => month, y: ([, total]) => total, fill: "steelblue", tip: true }
    ),
    Plot.ruleY([0])
  ]
})
)};`;
const CHART_DEF_BUGGY = `  $def("_chart", "chart", ["Plot", "d3", "sales"], _chart);`;

const FIXTURE = `const _intro = function _intro(md){return(
md${BT}# Merchandise sales

Purchases from the Google Merchandise Store sample data, November 2020 to January 2021. The chart shows revenue per month.${BT}
)};
${CHART_BUGGY}
const _test_results = function _test_results(tests){return(
tests({ filter: (t) => t.name.includes("@user/merch-sales") })
)};
const _monthlyTotals = function _monthlyTotals(d3){return(
function monthlyTotals(rows) {
  return d3
    .rollups(rows, (v) => d3.sum(v, (d) => d.price_in_usd), (d) => d3.utcMonth(d.date))
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month - b.month);
}
)};
const _test_monthlyTotals_sums_each_month = function _test_monthlyTotals_sums_each_month(monthlyTotals){
  const got = monthlyTotals([
    { date: new Date("2020-11-03T10:00:00Z"), price_in_usd: 10 },
    { date: new Date("2020-11-20T18:30:00Z"), price_in_usd: 5 },
    { date: new Date("2020-12-15T12:00:00Z"), price_in_usd: 7 }
  ]);
  const want = [["2020-11-01", 15], ["2020-12-01", 7]];
  const flat = got.map((d) => [d.month.toISOString().slice(0, 10), d.total]);
  if (JSON.stringify(flat) !== JSON.stringify(want)) throw new Error("expected " + JSON.stringify(want) + ", got " + JSON.stringify(flat));
  return flat;
};
const _test_monthlyTotals_month_boundary = function _test_monthlyTotals_month_boundary(monthlyTotals){
  const got = monthlyTotals([{ date: new Date("2020-12-01T00:27:14Z"), price_in_usd: 21 }]);
  const month = got[0].month.toISOString().slice(0, 7);
  if (month !== "2020-12") throw new Error("a purchase at 2020-12-01T00:27:14Z should count in 2020-12, got " + month);
  return month;
};
const _test_monthlyTotals_sorted = function _test_monthlyTotals_sorted(monthlyTotals){
  const got = monthlyTotals([
    { date: new Date("2021-01-05T09:00:00Z"), price_in_usd: 3 },
    { date: new Date("2020-11-05T09:00:00Z"), price_in_usd: 4 }
  ]).map((d) => d.month.toISOString().slice(0, 7));
  if (got.join() !== "2020-11,2021-01") throw new Error("months out of order: " + got);
  return got;
};
const _test_monthlyTotals_keeps_every_sale = function _test_monthlyTotals_keeps_every_sale(monthlyTotals,sales,d3){
  const got = d3.sum(monthlyTotals(sales), (d) => d.total);
  const want = d3.sum(sales, (d) => d.price_in_usd);
  if (got !== want) throw new Error("monthly totals sum to " + got + ", sales sum to " + want);
  return got;
};
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
${CHART_DEF_BUGGY}
  $def("_test_results", "test_results", ["tests"], _test_results);
  $def("_monthlyTotals", "monthlyTotals", ["d3"], _monthlyTotals);
  $def("_test_monthlyTotals_sums_each_month", "test_monthlyTotals_sums_each_month", ["monthlyTotals"], _test_monthlyTotals_sums_each_month);
  $def("_test_monthlyTotals_month_boundary", "test_monthlyTotals_month_boundary", ["monthlyTotals"], _test_monthlyTotals_month_boundary);
  $def("_test_monthlyTotals_sorted", "test_monthlyTotals_sorted", ["monthlyTotals"], _test_monthlyTotals_sorted);
  $def("_test_monthlyTotals_keeps_every_sale", "test_monthlyTotals_keeps_every_sale", ["monthlyTotals", "sales", "d3"], _test_monthlyTotals_keeps_every_sale);
  $def("_sales", "sales", ["d3", "sales_csv"], _sales);
  $def("_sales_csv", "sales_csv", [], _sales_csv);
  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));
  return main;
}
`;

// The reference fix: the chart plots the tested helper, and labels months in UTC.
const CHART_FIXED = `const _chart = function _chart(Plot,d3,monthlyTotals,sales){return(
Plot.plot({
  marginLeft: 60,
  x: { label: null, tickFormat: d3.utcFormat("%b %Y") },
  y: { label: "Revenue (USD)", grid: true },
  marks: [
    Plot.barY(monthlyTotals(sales), { x: "month", y: "total", fill: "steelblue", tip: true }),
    Plot.ruleY([0])
  ]
})
)};`;
const CHART_DEF_FIXED = `  $def("_chart", "chart", ["Plot", "d3", "monthlyTotals", "sales"], _chart);`;
const swap = (src, pairs) => pairs.reduce((s, [a, b]) => { if (!s.includes(a)) throw new Error("merch-sales eval: missing " + a.slice(0, 60)); return s.replace(a, b); }, src);
export const SOLUTION = swap(FIXTURE, [[CHART_BUGGY, CHART_FIXED], [CHART_DEF_BUGGY, CHART_DEF_FIXED]]);
export { FIXTURE, CHART_BUGGY, CHART_DEF_BUGGY, CHART_FIXED, CHART_DEF_FIXED, swap };

const SEEDED_TESTS = ["test_monthlyTotals_sums_each_month", "test_monthlyTotals_month_boundary", "test_monthlyTotals_sorted", "test_monthlyTotals_keeps_every_sale"];

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const mod = globalThis.__ojs_runtime.mains.get("@user/merch-sales");
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module).filter(m => m !== mod));
  globalThis.__rc5tSeededVars = new Set([...rt._variables].filter(v => v._module === mod && /^test_/.test(v._name || "")));
})()`;

const COLLECT = String.raw`(async (EXP, SEEDED) => {
  const KEYS = ["west", "east", "gapClosed", "testsPass", "testsIntact", "errors"];
  const out = Object.fromEntries(KEYS.map(k => [k, "not checked"]));
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const before = globalThis.__rc5tBefore || new Set();
  const seededVars = globalThis.__rc5tSeededVars || new Set();
  const mod = globalThis.__ojs_runtime.mains.get("@user/merch-sales");
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
  const recompute = async () => {
    for (const v of all()) { rt._dirty.add(v); rt._updates.add(v); }
    rt._computeSoon();
    await sleep(1500);
    for (const v of named()) await settle(v, 3000);
  };
  const ancestors = v => { const seen = new Set(), st = [v]; while (st.length) { const x = st.pop(); for (const i of x._inputs || []) if (i && !seen.has(i)) { seen.add(i); st.push(i); } } return seen; };
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const WANT = EXP.months.map(m => [+m.slice(0, 4), +m.slice(5, 7) - 1]);
  const labelMonth = t => {
    t = String(t).toLowerCase();
    let m = t.match(/(20\d\d)-(\d\d)/);
    if (m) return [+m[1], +m[2] - 1];
    const i = MONTHS.findIndex(n => t.includes(n));
    m = t.match(/(20\d\d|'?\b\d\d\b)/);
    if (i < 0) return null;
    return [m ? (m[1].length === 4 ? +m[1] : 2000 + +m[1].replace("'", "")) : null, i];
  };
  // every Plot bar chart held by a user variable
  const barCharts = () => {
    const found = [];
    for (const v of named()) {
      const el = v._value;
      if (!el || typeof el.querySelector !== "function") continue;
      const holders = [el, ...el.querySelectorAll("svg, figure")].filter(e => typeof e.scale === "function");
      for (const h of holders) {
        const svg = h.tagName.toLowerCase() === "svg" ? h : h.querySelector("svg");
        const rects = svg ? [...svg.querySelectorAll("g[aria-label='bar'] rect")] : [];
        if (rects.length) found.push({ v, h, svg, rects });
      }
    }
    return found;
  };
  const readChart = ({ v, h, svg, rects }) => {
    let y; try { y = h.scale("y"); } catch {}
    if (!y || typeof y.invert !== "function") return { name: v._name, ok: false, why: "no invertible y scale" };
    const bars = rects.map(r => {
      const top = +r.getAttribute("y"), hgt = +r.getAttribute("height"), x = +r.getAttribute("x") + (+r.getAttribute("width") || 0) / 2;
      return { x, value: y.invert(top) - y.invert(top + hgt) };
    }).sort((a, b) => a.x - b.x);
    const values = bars.map(b => Math.round(b.value * 100) / 100);
    const labels = [...svg.querySelectorAll("g[aria-label='x-axis tick label'] text")].map(t => t.textContent);
    const lm = labels.map(labelMonth);
    const valuesOk = values.length === EXP.totals.length && values.every((x, i) => Math.abs(x - EXP.totals[i]) <= 1);
    const labelsOk = lm.length === WANT.length && lm.every((m, i) => m && m[1] === WANT[i][1] && (m[0] == null || m[0] === WANT[i][0]));
    return { name: v._name, ok: valuesOk && labelsOk, values, labels, why: (valuesOk ? "" : "values " + JSON.stringify(values) + " want " + JSON.stringify(EXP.totals) + " ") + (labelsOk ? "" : "labels " + JSON.stringify(labels)) };
  };
  const scoreCharts = () => {
    const cs = barCharts().map(readChart);
    if (!cs.length) return { ok: false, detail: "no Plot bar chart in the user's modules" };
    const bad = cs.filter(c => !c.ok);
    return { ok: !bad.length, detail: bad.length ? bad.map(c => c.name + ": " + c.why).join("; ") : "ok", charts: cs };
  };
  const testStates = async () => Promise.all(named().filter(v => /^test_/.test(v._name)).map(async v => ({ v, name: v._name, ...(await settle(v)) })));
  const msg = s => String(s.error && s.error.message || s.error).slice(0, 120);
  let helperVar = null, helperInputs = null, helperDef = null;
  try {
    await sleep(1500);
    for (const v of named()) await settle(v, 3000);

    const w = scoreCharts();
    out.westDetail = w.charts ? w.charts.map(c => ({ name: c.name, values: c.values, labels: c.labels })) : w.detail;
    out.west = w.ok ? "ok" : w.detail;

    const tests = await testStates();
    const failing = tests.filter(s => !s.ok || s.value === undefined);
    out.testNames = tests.map(s => s.name);
    out.testsPass = !tests.length ? "no test_* cells" : failing.length ? "not passing: " + failing.map(s => s.name + (s.ok ? "=undefined" : ": " + msg(s))).join("; ") : "ok";

    out.errors = (() => { const e = all().filter(v => v._error != null && !/^test_/.test(v._name || "")).map(v => (v._name || "<anonymous>") + ": " + String(v._error && v._error.message || v._error).slice(0, 100)); return e.length ? e.join("; ") : "ok"; })();

    // gapClosed
    const charts = barCharts();
    helperVar = named().find(v => v._name === "monthlyTotals" && v._module === mod) || named().find(v => v._name === "monthlyTotals");
    const viaHelper = [];
    if (helperVar && charts.length) {
      helperInputs = helperVar._inputs.map(i => i._name);
      helperDef = helperVar._definition;
      const fed = charts.filter(c => ancestors(c.v).has(helperVar) || [...ancestors(c.v)].some(a => a._name === "monthlyTotals"));
      if (fed.length) {
        const beforeVals = new Map(fed.map(c => [c.v, c.v._value]));
        helperVar.define("monthlyTotals", [], () => () => { throw new Error("mutant monthlyTotals"); });
        await sleep(600);
        for (const c of fed) { const r = await settle(c.v, 3000); if (!r.ok || r.value !== beforeVals.get(c.v)) viaHelper.push(c.v._name); }
        helperVar.define("monthlyTotals", helperInputs, helperDef);
        await sleep(600);
        for (const v of named()) await settle(v, 3000);
      }
    }
    const DATA = new Set(["sales", "sales_csv"]);
    const newTests = named().filter(v => /^test_/.test(v._name) && !seededVars.has(v));
    const viaTest = [];
    for (const c of charts) {
      const derived = [...ancestors(c.v)].filter(a => a._name && !DATA.has(a._name) && [...ancestors(a)].some(x => x._name === "sales"));
      const cover = newTests.filter(t => { const an = ancestors(t); return an.has(c.v) || derived.some(d => an.has(d)); });
      if (cover.length) viaTest.push(c.v._name + " <- " + cover.map(t => t._name).join(","));
    }
    out.gapVia = { helper: viaHelper, test: viaTest };
    out.gapClosed = !charts.length ? "no chart" : (viaHelper.length || viaTest.length) ? "ok" : "the chart reads no tested cell: it does not use monthlyTotals, and no new test_* cell covers its data";

    // testsIntact: seeded tests present, and they catch a local-month helper
    const present = SEEDED.filter(n => named().some(v => v._name === n && v._module === mod));
    if (present.length < SEEDED.length) out.testsIntact = "seeded tests removed: " + SEEDED.filter(n => !present.includes(n)).join(", ");
    else if (!helperVar) out.testsIntact = "no monthlyTotals cell";
    else {
      const local = function monthlyTotals(rows) {
        const m = new Map();
        for (const d of rows) { const k = +new Date(d.date.getFullYear(), d.date.getMonth(), 1); m.set(k, (m.get(k) || 0) + d.price_in_usd); }
        return [...m].sort((a, b) => a[0] - b[0]).map(([k, total]) => ({ month: new Date(k), total }));
      };
      helperVar.define("monthlyTotals", [], () => local);
      await sleep(600);
      const st = await testStates();
      const caught = st.filter(s => !s.ok);
      out.testsIntact = caught.length ? "ok" : "with a local-month monthlyTotals every test_* cell still passes (tests weakened)";
      helperVar.define("monthlyTotals", helperInputs, helperDef);
      helperVar = null;
      await sleep(600);
    }

    // east
    if (typeof globalThis.__evalSetTimezone !== "function") out.east = "no __evalSetTimezone (setup.timezoneSwitch)";
    else {
      await globalThis.__evalSetTimezone("Asia/Tokyo");
      await recompute();
      const e = scoreCharts();
      out.eastDetail = e.charts ? e.charts.map(c => ({ name: c.name, values: c.values, labels: c.labels })) : e.detail;
      out.east = e.ok ? "ok" : e.detail;
      await globalThis.__evalSetTimezone("America/Los_Angeles");
      await recompute();
    }
    return out;
  } finally {
    if (helperVar && helperDef) { try { helperVar.define("monthlyTotals", helperInputs, helperDef); } catch {} }
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})(${JSON.stringify(EXP)}, ${JSON.stringify(SEEDED_TESTS)})`;

export default {
  id: "rc5t-monthly-totals-chart",
  category: "rc5-train",
  question: "All my notebook's tests pass, but the monthly totals chart looks wrong. Find out why and fix it.",
  setup: {
    files: { "/src/@user/merch-sales.js": FIXTURE },
    timezoneId: "America/Los_Angeles",
    timezoneSwitch: true,
    init: INIT,
    collect: COLLECT,
  },
  criteria: [
    // the chart plots the UTC month totals, labelled with the right months, in LA and in Tokyo
    { name: "collected_equals", args: { key: "west", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "east", equals: "ok" }, weight: 1 },
    // what the chart plots now goes through tested code
    { name: "collected_equals", args: { key: "gapClosed", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "testsPass", equals: "ok" }, weight: 1 },
    // the seeded tests survive and still catch a local-month grouping
    { name: "collected_equals", args: { key: "testsIntact", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "errors", equals: "ok" }, weight: 1 },
    // the reply names the cause: local time / time zone vs UTC ...
    { name: "answer_matches", args: { pattern: "local (time|month|date|zone)|time.?zone|getMonth|getFullYear|utcMonth|UTC (month|midnight|timestamp|date)|in UTC", flags: "i" }, weight: 1 },
    // ... and that the chart did not use the tested helper
    { name: "answer_matches", args: { pattern: "(chart|it)[^.]{0,150}(\\bnot\\b|n't|instead of|bypass|own|inline|separate|duplicat|second)[^.]{0,100}(monthlyTotals|helper|tested)|(monthlyTotals|helper|tested (function|code))[^.]{0,120}(not (used|called)|n't (use|call)|bypass|never)", flags: "i" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/merch-sales.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/merch-sales.js", content: SOLUTION } },
    { assistant: "The chart did not use monthlyTotals, the function your tests check. It summed the sales itself, grouping by new Date(getFullYear(), getMonth(), 1), which is the month in the browser's local time zone. The timestamps are UTC, so here (Los Angeles) purchases in the first hours of a UTC month were counted in the previous month: an extra Oct 2020 bar, and $488 moved from December to November. The axis labels used d3.timeFormat, also local time. The chart now plots monthlyTotals(sales) and labels months with d3.utcFormat, so the tested code is what you see. Bars: Nov 2020 $2600, Dec 2020 $2160, Jan 2021 $670. The four tests are unchanged and pass." },
  ],
};
