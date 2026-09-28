// rc5-train eval (20260928-0847-m37): a maintenance goal. The user's chart is blank for seconds while its
// data loads, and nothing is shown when the load fails.
// setup.files seeds @user/crimea: @observablehq/plot-stack (embedded in
// lopebooks/notebooks/@tomlarkworthy_cloudevents-explorer.html) re-homed: the `crimea` cell and the first chart
// (Plot.lineY with circle markers, 3 causes x 24 months), with FileAttachment("crimea.csv").csv({typed: true})
// changed to d3.csv(<url>, d3.autoType). Provenance: tools/scratch/rc5-train/20260928-0847/m37/fixtures/PROVENANCE.txt.
//
// setup.initScript serves https://crimea-archive.test/crimea.csv from page JS: delay globalThis.__crimeaDelay ms
// (default 2000), failure globalThis.__crimeaFail = null | "500" (HTTP 500 after the delay) | "network" (fetch
// rejects with TypeError after the delay), requests counted in globalThis.__crimeaFetches.
// setup.collect re-runs the module (every own cell redefined with its own definition, so a mutable/status cell
// resets too) three times and reads the text of every element (or string) value in the module, anonymous cells
// included:
//   loading  - 2 s delay: within 500 ms some cell shows a short text matching LOAD_RE ("Loading…", "Fetching…")
//   loaded   - after the load: a line chart with 3 series of 24 points each (computed here from the CSV), no short
//              loading text left, at least one request made (pasted data fails), no cell errors
//   fail500 / failNetwork - with the failure on: a message matching FAIL_RE is shown, no loading text is left
//              that does not itself mention the failure, no raw stack / "[object" / NaN. Cell errors are allowed
//              here (a status cell can report while the chart cell errors); an error shown only by the Inspector
//              does not count as the message.
// M37_NEG=unchanged|stuck|stuckfail|hardcoded swaps the oracle for a negative control (must score low);
// M37_ORACLE=split scores a second correct solution (status in the chart cell, request in its own cell).
const FIXTURE = "const _ks81ly = function _1(md){return(\nmd`# Deaths in the Crimean War\n\nFlorence Nightingale’s data on deaths in the Crimean War, by cause, loaded from the archive server.`\n)};\nconst _1qal6a7 = function _crimea(d3){return(\nd3.csv(\"https://crimea-archive.test/crimea.csv\", d3.autoType)\n)};\nconst _1m1njpc = function _3(Plot,crimea){return(\nPlot.plot({\n  y: {\n    grid: true\n  },\n  color: {\n    legend: true\n  },\n  marks: [\n    Plot.lineY(crimea, {x: \"date\", y: \"deaths\", stroke: \"cause\", marker: \"circle\"}),\n    Plot.ruleY([0])\n  ]\n})\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n  $def(\"_ks81ly\", null, [\"md\"], _ks81ly);\n  $def(\"_1qal6a7\", \"crimea\", [\"d3\"], _1qal6a7);\n  $def(\"_1m1njpc\", null, [\"Plot\",\"crimea\"], _1m1njpc);\n  return main;\n}\n";
const CSV = "date,cause,deaths\n1854-04-01,disease,1\n1854-05-01,disease,12\n1854-06-01,disease,11\n1854-07-01,disease,359\n1854-08-01,disease,828\n1854-09-01,disease,788\n1854-10-01,disease,503\n1854-11-01,disease,844\n1854-12-01,disease,1725\n1855-01-01,disease,2761\n1855-02-01,disease,2120\n1855-03-01,disease,1205\n1855-04-01,disease,477\n1855-05-01,disease,508\n1855-06-01,disease,802\n1855-07-01,disease,382\n1855-08-01,disease,483\n1855-09-01,disease,189\n1855-10-01,disease,128\n1855-11-01,disease,178\n1855-12-01,disease,91\n1856-01-01,disease,42\n1856-02-01,disease,24\n1856-03-01,disease,15\n1854-04-01,wounds,0\n1854-05-01,wounds,0\n1854-06-01,wounds,0\n1854-07-01,wounds,0\n1854-08-01,wounds,1\n1854-09-01,wounds,81\n1854-10-01,wounds,132\n1854-11-01,wounds,287\n1854-12-01,wounds,114\n1855-01-01,wounds,83\n1855-02-01,wounds,42\n1855-03-01,wounds,32\n1855-04-01,wounds,48\n1855-05-01,wounds,49\n1855-06-01,wounds,209\n1855-07-01,wounds,134\n1855-08-01,wounds,164\n1855-09-01,wounds,276\n1855-10-01,wounds,53\n1855-11-01,wounds,33\n1855-12-01,wounds,18\n1856-01-01,wounds,2\n1856-02-01,wounds,0\n1856-03-01,wounds,0\n1854-04-01,other,5\n1854-05-01,other,9\n1854-06-01,other,6\n1854-07-01,other,23\n1854-08-01,other,30\n1854-09-01,other,70\n1854-10-01,other,128\n1854-11-01,other,106\n1854-12-01,other,131\n1855-01-01,other,324\n1855-02-01,other,361\n1855-03-01,other,172\n1855-04-01,other,57\n1855-05-01,other,37\n1855-06-01,other,31\n1855-07-01,other,33\n1855-08-01,other,25\n1855-09-01,other,20\n1855-10-01,other,18\n1855-11-01,other,32\n1855-12-01,other,28\n1856-01-01,other,48\n1856-02-01,other,19\n1856-03-01,other,35\n";
const HOST = "crimea-archive.test", URL_ = "https://crimea-archive.test/crimea.csv";

const ROWS = CSV.trim().split("\n").slice(1).map(l => l.split(","));
const SERIES = {};
for (const [, cause] of ROWS) SERIES[cause] = (SERIES[cause] || 0) + 1;
const EXPECT = Object.values(SERIES).sort((a, b) => a - b); // points per line
if (ROWS.length !== 72 || EXPECT.join() !== "24,24,24") throw new Error("m37 eval: fixture rows changed");

const INITSCRIPT = `(() => {
  const CSV = ${JSON.stringify(CSV)};
  globalThis.__crimeaFetches = 0; globalThis.__crimeaDelay = 2000; globalThis.__crimeaFail = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = function (input, init) {
    let url;
    try { url = new URL(typeof input === "string" ? input : input.url, location.href); } catch { return realFetch.apply(this, arguments); }
    if (url.hostname !== ${JSON.stringify(HOST)}) return realFetch.apply(this, arguments);
    globalThis.__crimeaFetches++;
    const fail = globalThis.__crimeaFail, ok = url.pathname === "/crimea.csv";
    return new Promise((resolve, reject) => setTimeout(() => {
      if (fail === "network") return reject(new TypeError("Failed to fetch"));
      if (fail === "500") return resolve(new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error", headers: { "content-type": "text/plain" } }));
      resolve(new Response(ok ? CSV : "not found", { status: ok ? 200 : 404, statusText: ok ? "OK" : "Not Found", headers: { "content-type": "text/csv", "access-control-allow-origin": "*" } }));
    }, globalThis.__crimeaDelay));
  };
})();`;

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/crimea")); })()`;

const COLLECT = String.raw`(async () => {
  const EXPECT = ${JSON.stringify(EXPECT)};
  const LOAD_RE = /\bloading\b|\bfetching\b|\bcargando\b|\bchargement\b|\bretrieving\b|\bplease wait\b|⏳/i;
  const FAIL_RE = /error|fail|could ?n[o']?t|unable|problem|went wrong|try again|unavailable|cannot/i;
  const BAD_RE = /\[object |\bNaN\b|\n\s*at \S|\bat \S+ \(|@https?:\/\/\S+:\d+|<anonymous>/;
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__rc5tBaseMods || new Set();
  const out = { loading: "not run", loaded: "not run", fail500: "not run", failNetwork: "not run", errors: "not run", verdict: "not run" };
  const mod = rt.mains.get("@user/crimea") || [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m)[0];
  if (!mod) { out.verdict = "no @user/crimea module"; return out; }
  const own = () => [...mod._runtime._variables].filter(v => v._module === mod && !v.__rc5t && !String(v._name ?? "").startsWith("module ") && v._name !== "@variable");
  const extra = [];
  for (const v of own()) {
    try {
      if (v._name) { const k = mod.variable(true).define([v._name], x => x); k.__rc5t = "keeper"; extra.push(k); }
      else if (typeof v._definition === "function" && v._type === 1) {
        const c = mod.variable(true).define(null, v._inputs.map(i => i._name), v._definition); c.__rc5t = "clone"; extra.push(c);
      }
    } catch (e) {}
  }
  const live = () => [...own(), ...extra.filter(v => v.__rc5t === "clone")];
  const texts = () => live().map(v => v._value instanceof Element ? v._value.textContent : typeof v._value === "string" && v._name && !v._name.startsWith("viewof ") ? v._value : null).filter(t => t != null).map(t => t.trim());
  const loadingNow = (allowFail) => texts().filter(t => t.length <= 160 && LOAD_RE.test(t) && !(allowFail && FAIL_RE.test(t)));
  const lines = () => live().map(v => v._value).filter(x => x instanceof Element)
    .flatMap(e => e.matches("svg") ? [e] : [...e.querySelectorAll("svg")])
    .map(s => [...s.querySelectorAll("path")].filter(p => /^M/.test(p.getAttribute("d") || "") && (p.getAttribute("fill") === "none" || p.closest("[fill=none]")) && !p.closest("[aria-label*=axis]"))
      .map(p => (p.getAttribute("d").match(/[ML]/g) || []).length).sort((a, b) => a - b))
    .filter(ls => ls.length);
  const rejectionOf = v => v._error != null ? Promise.resolve(v._error) : Promise.race([Promise.resolve(v._promise).then(() => null, e => e ?? "rejected"), sleep(50).then(() => null)]);
  const errs = async () => (await Promise.all(live().map(async v => { const e = await rejectionOf(v); return e == null ? null : (v._name || "(anonymous)") + ": " + String(e?.message ?? e).slice(0, 160); }))).filter(Boolean);
  const rerun = () => {
    for (const v of live()) {
      if (v._type !== 1 || typeof v._definition !== "function") continue;
      if (!v._inputs.every(i => i._module === mod || i._module === rt._builtin)) continue; // an import
      try { v.define(v._name, v._inputs.map(i => i._name), v._definition); } catch (e) {}
    }
  };
  const errSeen = new Set();
  try {
    await sleep(Math.max(0, (globalThis.__crimeaDelay ?? 2000)) + 2500);
    // 1. slow load
    globalThis.__crimeaDelay = 2000; globalThis.__crimeaFail = null;
    let f0 = globalThis.__crimeaFetches;
    rerun();
    const t0 = performance.now();
    let seen = null;
    while (performance.now() - t0 < 500) { const l = loadingNow(false); if (l.length) { seen = l[0]; break; } await sleep(40); }
    out.loadingText = seen;
    out.loading = seen ? "ok" : "no loading text within 500 ms of a re-run (texts: " + texts().map(t => t.slice(0, 40)).join(" | ").slice(0, 200) + ")";
    await sleep(2000 + 2500 - (performance.now() - t0));
    for (const e of await errs()) errSeen.add(e);
    const ls = lines(), left = loadingNow(false), fetched = globalThis.__crimeaFetches - f0;
    const bad = [];
    if (!ls.length) bad.push("no line chart");
    else if (!ls.some(l => JSON.stringify(l) === JSON.stringify(EXPECT))) bad.push("line chart points " + JSON.stringify(ls) + " (want " + JSON.stringify(EXPECT) + ")");
    if (left.length) bad.push("loading text still shown after the load: " + left[0].slice(0, 60));
    if (!fetched) bad.push("no request to the server on re-run (data not loaded from " + ${JSON.stringify(HOST)} + ")");
    out.loaded = bad.length ? bad.join("; ") : "ok";
    // 2. failures
    for (const [key, mode] of [["fail500", "500"], ["failNetwork", "network"]]) {
      globalThis.__crimeaFail = mode; f0 = globalThis.__crimeaFetches;
      rerun();
      await sleep(2000 + 2500);
      const all = texts(), msg = all.find(t => FAIL_RE.test(t) && !LOAD_RE.test(t.replace(FAIL_RE, ""))) || all.find(t => FAIL_RE.test(t));
      const b = [];
      if (!(globalThis.__crimeaFetches - f0)) b.push("no request made");
      if (!msg) b.push("no failure message shown (texts: " + all.map(t => t.slice(0, 40)).join(" | ").slice(0, 200) + "; cell errors: " + (await errs()).join("; ").slice(0, 160) + ")");
      else if (BAD_RE.test(msg)) b.push("raw error text shown: " + msg.slice(0, 120));
      const stuck = loadingNow(true);
      if (stuck.length) b.push("still shows loading: " + stuck[0].slice(0, 60));
      out[key + "Text"] = msg ? msg.slice(0, 160) : null;
      out[key] = b.length ? b.join("; ") : "ok";
    }
    // 3. recovers once the server is back
    globalThis.__crimeaFail = null; rerun(); await sleep(2000 + 2500);
    for (const e of await errs()) errSeen.add(e);
    const rl = lines();
    out.recovered = rl.some(l => JSON.stringify(l) === JSON.stringify(EXPECT)) && !loadingNow(false).length ? "ok" : "chart not back after the server recovered";
    out.errors = errSeen.size ? [...errSeen].join("; ") : "none";
    out.verdict = [out.loading, out.loaded, out.fail500, out.failNetwork, out.recovered].every(x => x === "ok") && out.errors === "none" ? "ok" : "not ok";
    return out;
  } catch (e) { out.verdict = "collect threw: " + (e?.message ?? e); return out; }
  finally { globalThis.__crimeaFail = null; globalThis.__crimeaDelay = 2000; for (const k of extra) { try { k.delete(); } catch {} } }
})()`;

const rep = (src, a, b) => { if (!src.includes(a)) throw new Error("m37 eval: edit did not apply: " + a.slice(0, 60)); return src.replace(a, b); };
const CHART_CELL = FIXTURE.slice(FIXTURE.indexOf("const _1m1njpc"), FIXTURE.indexOf("\n\nexport default"));
const DATA_CELL = FIXTURE.slice(FIXTURE.indexOf("const _1qal6a7"), FIXTURE.indexOf("const _1m1njpc"));
const PLOT = CHART_CELL.slice(CHART_CELL.indexOf("Plot.plot("), CHART_CELL.lastIndexOf("\n)};"));
// the fix: a generator yields a placeholder, then the chart or a message; the placeholder-then-result form is
// @spond/revised-sars-cov-2-analytics-page.loaderParagraph and @gampleman/table.table
// (lopebooks/notebooks/@spond_revised-sars-cov-2-analytics-page.html)
const GEN = (awaitExpr) => `const _1m1njpc = async function* _3(Plot,html,${awaitExpr.deps})
{
  yield html\`<p><i>Loading the Crimean War data…</i></p>\`;
  let crimea;
  try {
    crimea = await ${awaitExpr.expr};
  } catch (error) {
    yield html\`<p style="color: #b00">Could not load the Crimean War data (\${error.message}). Check your connection and reload the page to try again.</p>\`;
    return;
  }
  yield ${PLOT.replace(/\n/g, "\n  ")};
};`;
const OK = rep(rep(rep(FIXTURE, DATA_CELL, ""), CHART_CELL, GEN({ deps: "d3", expr: `d3.csv("${URL_}", d3.autoType)` })),
  '  $def("_1qal6a7", "crimea", ["d3"], _1qal6a7);\n', "").replace('["Plot","crimea"], _1m1njpc', '["Plot","html","d3"], _1m1njpc');
const SPLIT = rep(rep(FIXTURE, DATA_CELL, `const _1qal6a7 = function _crimeaRequest(d3){return(
{ promise: d3.csv("${URL_}", d3.autoType) }
)};
`), CHART_CELL, GEN({ deps: "crimeaRequest", expr: "crimeaRequest.promise" }))
  .replace('"crimea", ["d3"], _1qal6a7', '"crimeaRequest", ["d3"], _1qal6a7').replace('["Plot","crimea"], _1m1njpc', '["Plot","html","crimeaRequest"], _1m1njpc');
// negatives
const STUCK = rep(FIXTURE, "const _1m1njpc", "const _k37ld = function _2(md){return(\nmd`*Loading data…*`\n)};\nconst _1m1njpc")
  .replace('  $def("_1m1njpc"', '  $def("_k37ld", null, ["md"], _k37ld);\n  $def("_1m1njpc"');
const STUCKFAIL = rep(rep(FIXTURE, DATA_CELL, `const _1qal6a7 = function _crimea(Generators,d3){return(
Generators.observe(notify => { notify(null); d3.csv("${URL_}", d3.autoType).then(notify); })
)};
`), CHART_CELL, `const _1m1njpc = function _3(html,Plot,crimea){return(
crimea == null ? html\`<p><i>Loading data…</i></p>\` : ${PLOT}
)};`).replace('"crimea", ["d3"], _1qal6a7', '"crimea", ["Generators","d3"], _1qal6a7').replace('["Plot","crimea"], _1m1njpc', '["html","Plot","crimea"], _1m1njpc');
const HARDCODED = rep(rep(rep(FIXTURE, DATA_CELL, ""), CHART_CELL, GEN({ deps: "d3,Promises", expr: "Promises.delay(1500, d3.csvParse(" + JSON.stringify(CSV) + ", d3.autoType))" })),
  '  $def("_1qal6a7", "crimea", ["d3"], _1qal6a7);\n', "").replace('["Plot","crimea"], _1m1njpc', '["Plot","html","d3","Promises"], _1m1njpc');

const SOLUTIONS = { ok: OK, split: SPLIT, unchanged: FIXTURE, stuck: STUCK, stuckfail: STUCKFAIL, hardcoded: HARDCODED };
const PICK = globalThis.process?.env?.M37_NEG || globalThis.process?.env?.M37_ORACLE || "ok";

export default {
  id: "rc5t-loading-and-failure-message",
  category: "rc5-train",
  question: "When my notebook (@user/crimea) opens, the chart area is blank for several seconds while the data loads, and people think it's broken. Show a loading message while it loads, and a clear message if loading fails.",
  setup: { files: { "/src/@user/crimea.js": FIXTURE }, initScript: INITSCRIPT, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "verdict", equals: "ok" }, weight: 5 },
    { name: "collected_equals", args: { key: "loading", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "loaded", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "fail500", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "failNetwork", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "errors", equals: "none" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/crimea.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/crimea.js", content: SOLUTIONS[PICK] } },
  ],
};
