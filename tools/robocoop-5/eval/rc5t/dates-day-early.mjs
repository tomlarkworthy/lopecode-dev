// rc5-train eval (20260928-0847-m24): maintenance, "some dates in my notebook show up a day early".
// setup.files seeds @user/site-history, re-homed from @spond/revised-sars-cov-2-analytics-page
// (lopebooks/notebooks/@spond_revised-sars-cov-2-analytics-page.html):
//   siteHistory        = d3.csv(_timeDirectory + "/temporal-gene-sites.csv", d3.autoType)   (_9h8odi)
//   siteHistoryDates   = _.sortBy(_.map(_.uniqBy(siteHistory, d => d.date.getTime()), d => d.date))  (_2hdd49)
//   the range line     = d3.timeFormat("%B %d%, %Y")(...)     (loaderParagraph; "%," typo dropped)
//   the per-date label = d3.timeFormat("%Y-%m-%d")(...)       (distribution_map title)
//   selectionHistoryPlot: a vega-lite line over "date" with the LOCAL timeUnit "datemonthyear" (_wn9x2u),
//     re-homed as Plot with x type "time" (Plot's local scale) so it stays offline.
// Seeded: the CSV (the original fetched it from a remote directory) is an inline `csvText` cell, 18 rows,
// 6 weekly analysis dates x 3 sites. d3.autoType parses "2026-03-01" as UTC midnight; every display reads
// the local day, so west of UTC every date is one day early (Mar 01 -> Feb 28). East of UTC it is right.
// setup.timezoneId = America/Los_Angeles (the agent's session sees the bug). setup.collect scores in LA,
// then switches the page to Asia/Tokyo (setup.timezoneSwitch, driver-core) and recomputes the user's
// modules, and scores again. Per zone:
//   textOk   every date written in a cell's DOM (svg excluded) is one of the 6 source dates, and all 6 appear
//   chartOk  every dot of the chart sits on a source day in the frame its x scale labels in
//            (a "time" scale: local day; "utc": UTC day; band/point: the tick text), and all 6 days are hit
//   errors   no variable of the user's modules (anonymous included) holds an error
// dataSame: a cell still holds the seeded CSV text byte for byte (a data rewrite fails here).
// Negative controls (oracle variants, all must score low): unchanged, "+1 day" (right in LA, late in Tokyo),
// data rewritten to the next day.

const CSV = `date,coordinate,p,fel,kind,branches
2026-03-01,S 614,0.021,0.034,positive,4
2026-03-01,N 203,0.310,0.420,none,1
2026-03-01,ORF1a 3606,0.048,0.060,positive,2
2026-03-08,S 614,0.012,0.019,positive,5
2026-03-08,N 203,0.280,0.390,none,1
2026-03-08,ORF1a 3606,0.051,0.071,none,2
2026-03-15,S 614,0.006,0.011,positive,7
2026-03-15,N 203,0.190,0.250,none,2
2026-03-15,ORF1a 3606,0.040,0.052,positive,3
2026-03-22,S 614,0.004,0.008,positive,8
2026-03-22,N 203,0.160,0.210,none,2
2026-03-22,ORF1a 3606,0.037,0.049,positive,3
2026-03-29,S 614,0.002,0.005,positive,9
2026-03-29,N 203,0.120,0.170,negative,3
2026-03-29,ORF1a 3606,0.033,0.044,positive,4
2026-04-05,S 614,0.001,0.003,positive,11
2026-04-05,N 203,0.090,0.130,negative,3
2026-04-05,ORF1a 3606,0.029,0.040,positive,4`;

const DATES = ["2026-03-01", "2026-03-08", "2026-03-15", "2026-03-22", "2026-03-29", "2026-04-05"];

const FIXTURE = `const _intro = function intro(md){return( md\`# Selection history

Weekly selection analyses of three SARS-CoV-2 sites. Each run is dated by the day it was analysed.\` )};
const _csvText = function csvText(){return( \`${CSV}\` )};
const _siteHistory = function siteHistory(d3, csvText){return( d3.csvParse(csvText, d3.autoType) )};
const _siteHistoryDates = function siteHistoryDates(_, siteHistory){return( _.sortBy(_.map(_.uniqBy(siteHistory, (d) => d.date.getTime()), (d) => d.date)) )};
const _summary = function summary(md, d3, siteHistoryDates){return( md\`<small>Includes analyses run between **\${d3.timeFormat("%B %d, %Y")(siteHistoryDates[0])}** and **\${d3.timeFormat("%B %d, %Y")(siteHistoryDates[siteHistoryDates.length - 1])}** (\${siteHistoryDates.length} runs).</small>\` )};
const _analysisDates = function analysisDates(html, d3, siteHistoryDates){return( html\`<ul>\${siteHistoryDates.map((d) => html\`<li>\${d3.timeFormat("%Y-%m-%d")(d)}</li>\`)}</ul>\` )};
const _site2view = function site2view(){return( ["S", "614"] )};
const _dataForSelectionHistoryPlot = function dataForSelectionHistoryPlot(siteHistory, site2view){return( siteHistory.filter((d) => d.coordinate == site2view[0] + " " + site2view[1]) )};
const _selectionHistoryPlot = function selectionHistoryPlot(Plot, site2view, dataForSelectionHistoryPlot){return( Plot.plot({
  title: "Selection detection history of " + site2view[0] + "/" + site2view[1],
  width: 640,
  height: 180,
  x: { type: "time", label: "Analysis date" },
  y: { type: "symlog", label: "MEME p-value", grid: true },
  marks: [
    Plot.lineY(dataForSelectionHistoryPlot, { x: "date", y: "p", stroke: "steelblue" }),
    Plot.dot(dataForSelectionHistoryPlot, { x: "date", y: "p", fill: "steelblue", tip: true })
  ]
}) )};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_csvText", "csvText", [], _csvText);
  $def("_siteHistory", "siteHistory", ["d3", "csvText"], _siteHistory);
  $def("_siteHistoryDates", "siteHistoryDates", ["_", "siteHistory"], _siteHistoryDates);
  $def("_summary", "summary", ["md", "d3", "siteHistoryDates"], _summary);
  $def("_analysisDates", "analysisDates", ["html", "d3", "siteHistoryDates"], _analysisDates);
  $def("_site2view", "site2view", [], _site2view);
  $def("_dataForSelectionHistoryPlot", "dataForSelectionHistoryPlot", ["siteHistory", "site2view"], _dataForSelectionHistoryPlot);
  $def("_selectionHistoryPlot", "selectionHistoryPlot", ["Plot", "site2view", "dataForSelectionHistoryPlot"], _selectionHistoryPlot);
  return main;
}
`;

// oracle: parse the date-only strings as LOCAL midnight (the idiom on
// knowledge/calendar-days-in-the-users-time-zone.md, "A key back to a date"); displays and the local
// "time" scale then agree in every zone.
const FIXED = FIXTURE.replace(
  "d3.csvParse(csvText, d3.autoType)",
  `d3.csvParse(csvText, (row) => { const [y, m, day] = row.date.split("-").map(Number); const d = d3.autoType(row); d.date = new Date(y, m - 1, day); return d; })`,
);
// negative controls
const PLUS_ONE = FIXTURE.replace("d3.csvParse(csvText, d3.autoType)", "d3.csvParse(csvText, d3.autoType).map((d) => ({ ...d, date: d3.timeDay.offset(d.date, 1) }))");
const REWRITTEN = FIXTURE.replace(/2026-(\d\d)-(\d\d),/g, (m, mo, d) => {
  const t = new Date(Date.UTC(2026, +mo - 1, +d + 1));
  return t.toISOString().slice(0, 10) + ",";
});
// alternative correct fix: keep UTC dates, read them in UTC everywhere (must pass)
const ALT_UTC = FIXTURE.replaceAll('d3.timeFormat(', 'd3.utcFormat(').replace('x: { type: "time", label', 'x: { type: "utc", label');
// half fix: local-midnight parse but a UTC chart scale (right in LA, a day early in Tokyo)
const LOCAL_PARSE_UTC_AXIS = FIXED.replace('x: { type: "time", label', 'x: { type: "utc", label');
for (const [n, s] of [["FIXED", FIXED], ["PLUS_ONE", PLUS_ONE], ["REWRITTEN", REWRITTEN], ["ALT_UTC", ALT_UTC], ["LOCAL_PARSE_UTC_AXIS", LOCAL_PARSE_UTC_AXIS]]) if (s === FIXTURE) throw new Error("site-history eval: " + n + " did not apply");

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/site-history")); })()`;

const COLLECT = String.raw`(async () => {
  const DATES = ${JSON.stringify(DATES)};
  const CSV = ${JSON.stringify(CSV)};
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__rc5tBaseMods || new Set();
  const mods = [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m);
  const all = () => [...rt._variables].filter(v => mods.includes(v._module));
  const named = () => all().filter(v => v._name && !String(v._name).startsWith("module ") && v._name !== "@variable");
  const out = { modules: [...rt.mains.keys()].filter(k => !base.has(k)) };
  if (!named().length) return { ...out, error: "no @user/site-history or new module" };
  const pad = n => String(n).padStart(2, "0");
  const localKey = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const utcKey = d => d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
  const mIdx = s => MONTHS.indexOf(s.slice(0, 3).toLowerCase());
  const MON = "(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\\.?";
  function datesIn(text) {
    const found = [];
    for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) found.push(m[1] + "-" + m[2] + "-" + m[3]);
    for (const m of text.matchAll(new RegExp(MON + "\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})", "g"))) found.push(m[3] + "-" + pad(mIdx(m[1]) + 1) + "-" + pad(+m[2]));
    for (const m of text.matchAll(new RegExp("\\b(\\d{1,2})\\s+" + MON + ",?\\s+(\\d{4})", "g"))) found.push(m[3] + "-" + pad(mIdx(m[2]) + 1) + "-" + pad(+m[1]));
    for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) found.push(m[3] + "-" + pad(+m[1]) + "-" + pad(+m[2]));
    return found;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    for (const s of c.querySelectorAll("svg")) s.remove();
    if (c.tagName && c.tagName.toLowerCase() === "svg") return "";
    // per text node, so adjacent <li>s do not run together ("2026-03-012026-03-08")
    const parts = [], w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) parts.push(w.currentNode.nodeValue);
    return parts.join(" | ");
  }
  function score(zone) {
    const r = { zone };
    const vals = named().map(v => v._value).filter(x => x instanceof Element);
    const text = vals.map(textOf).join(" | ");
    const found = datesIn(text);
    r.textDates = [...new Set(found)].sort();
    r.textOk = found.length > 0 && found.every(d => DATES.includes(d)) && DATES.every(d => found.includes(d));
    // the chart: every dot on a source day, in the frame of its x scale
    const figs = vals.flatMap(e => [e, ...e.querySelectorAll("svg,figure")]).filter(e => typeof e.scale === "function");
    const charts = [];
    for (const f of figs) {
      let sx; try { sx = f.scale("x"); } catch { sx = null; }
      if (!sx) continue;
      const svg = f.tagName.toLowerCase() === "svg" ? f : f.querySelector("svg");
      const dots = [...svg.querySelectorAll("circle")];
      if (!dots.length) continue;
      let days = [];
      if (sx.type === "time" || sx.type === "utc") {
        days = dots.map(c => { const t = sx.invert(+c.getAttribute("cx")); return t instanceof Date ? (sx.type === "utc" ? utcKey : localKey)(new Date(Math.round(+t / 36e5) * 36e5)) : String(t); });
        // a point placed at a local/UTC midnight lands within an hour of it; anything else names the day it is in
      } else {
        const ticks = [...svg.querySelectorAll("[aria-label*='x-axis tick label'] text, g[aria-label='x-axis tick label'] text")].map(t => t.textContent);
        days = datesIn(ticks.join(" | "));
      }
      charts.push({ type: sx.type, days: [...new Set(days)].sort() });
    }
    r.charts = charts;
    r.chartOk = charts.length > 0 && charts.every(c => c.days.every(d => DATES.includes(d)) && DATES.every(d => c.days.includes(d)));
    r.errors = all().filter(v => v._error != null).map(v => (v._name || "<anonymous>") + ": " + String(v._error && v._error.message || v._error).slice(0, 120));
    r.ok = r.textOk && r.chartOk && r.errors.length === 0;
    return r;
  }
  const keepers = [];
  for (const v of named()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(1500);
    out.dataSame = named().some(v => typeof v._value === "string" && v._value.trim() === CSV.trim());
    out.west = score(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (typeof globalThis.__evalSetTimezone !== "function") { out.east = { error: "no __evalSetTimezone (setup.timezoneSwitch)" }; }
    else {
      await globalThis.__evalSetTimezone("Asia/Tokyo");
      for (const v of all()) { rt._dirty.add(v); rt._updates.add(v); }
      rt._computeSoon();
      await sleep(2000);
      out.east = score(Intl.DateTimeFormat().resolvedOptions().timeZone);
      await globalThis.__evalSetTimezone("America/Los_Angeles");
    }
    out.westOk = !!out.west.ok;
    out.eastOk = !!(out.east && out.east.ok);
    out.verdict = out.westOk && out.eastOk && out.dataSame ? "ok" : "fail";
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

const WIKI = { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } };

export default {
  id: "rc5t-dates-day-early",
  category: "rc5-train",
  question: "Some dates in my notebook show up a day early. Find out why and fix it.",
  setup: {
    files: { "/src/@user/site-history.js": FIXTURE },
    timezoneId: "America/Los_Angeles",
    timezoneSwitch: true,
    init: INIT,
    collect: COLLECT,
  },
  criteria: [
    // westOk && eastOk && dataSame: a partial fix (right in one zone only) or a data edit scores nothing here
    { name: "collected_equals", args: { key: "verdict", equals: "ok" }, weight: 4 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [WIKI, { tool: "write_file", args: { file_path: "/src/@user/site-history.js", content: FIXED } }],
  // negative controls, run with --oracle by swapping `oracle` (see proposal.md)
  controls: {
    unchanged: [WIKI],
    plusOne: [WIKI, { tool: "write_file", args: { file_path: "/src/@user/site-history.js", content: PLUS_ONE } }],
    rewritten: [WIKI, { tool: "write_file", args: { file_path: "/src/@user/site-history.js", content: REWRITTEN } }],
    altUtcPasses: [WIKI, { tool: "write_file", args: { file_path: "/src/@user/site-history.js", content: ALT_UTC } }],
    localParseUtcAxis: [WIKI, { tool: "write_file", args: { file_path: "/src/@user/site-history.js", content: LOCAL_PARSE_UTC_AXIS } }],
  },
  fixture: FIXTURE,
};
