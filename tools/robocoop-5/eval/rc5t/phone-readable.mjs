// rc5-train eval (20260929-0620-m73): "Make my notebook readable on a phone."
// Fixture: @tomlarkworthy/async-lambda-sqs-eventbridge-benchmark (lopebooks/notebooks/@tomlarkworthy_async-lambda-sqs-eventbridge-benchmark.html),
// re-homed as @user/latency-dashboard: its results.csv (first 120 of 1000 rows, seconds -> ms) inlined as the
// `data` cell, its binned-latency Plot.line chart and its boto3 code block kept; a services checkbox, a
// quantile `stats` cell, a summary panel and a stats table added.
const FIXTURE = "const _intro = function _intro(md){return(\nmd`# Async Lambda, SQS, EventBridge benchmark\n\nRun on cloudshell to resources in same region using boto3. 120 runs, latency of one batched call in milliseconds.`\n)};\nconst _services = function _services(Inputs){return(\nInputs.checkbox([\"eventbridge\", \"sqs\", \"lambda\"], {label: \"services\", value: [\"eventbridge\", \"sqs\", \"lambda\"]})\n)};\nconst _services_v = (G, _) => G.input(_);\nconst _data = function _data(){return(\n[[61.07,63.58,72.79],[51.17,59.48,15.05],[20.53,57.01,11.69],[21.57,56.18,11.57],[38.18,57.92,11.51],[20.43,90,11.82],[30.79,55.41,11.81],[18.24,47.96,11.54],[18.99,47.31,12.91],[27.2,44.04,13.05],[18.7,46.2,11.68],[17.5,46.37,16.75],[17.76,46.2,11.66],[18.11,44.95,11.87],[17.37,44.27,15.04],[19.32,44.38,11.17],[23.94,49.66,16.01],[18.07,42.19,11.53],[23.25,45.87,15.65],[17.58,115.18,108.01],[18.01,65.49,12.1],[20.86,46.55,12.98],[18.56,99.73,13.25],[16.88,47.58,11.76],[25.54,49.05,16.42],[29.9,60.72,11.57],[58.9,45.22,13.99],[143.05,46.35,15.58],[18.61,50.32,11.08],[19.68,49.84,13.52],[19.42,49.21,13.38],[30.45,47.94,13.47],[19.51,45.07,12.55],[18.33,43.7,11.59],[18.14,45.29,11.75],[44.66,47.19,11.7],[18.7,44.53,17.42],[17.12,49.11,11.26],[17.95,47.81,15.35],[18.19,48,13.05],[16.69,48.83,52.19],[30.41,45.16,15.35],[18.23,42.9,14.51],[17.62,41.7,30.22],[18.26,57.2,58.06],[18.02,45.82,11.8],[17.84,43.83,11.6],[19.61,49.89,11.7],[61.27,120.63,11.88],[22.77,43.7,15.06],[32.87,41.44,24.51],[17.99,43.28,12.91],[19.28,47.92,12.72],[16.09,45.88,11.95],[17.85,44.6,13.3],[30.12,47.84,11.39],[29.4,46.82,11.61],[19.95,47.3,13.56],[23.3,45.73,11.54],[19.73,41.78,11.53],[18.33,45.4,14.79],[18.81,46.91,13.97],[19.51,50.07,29.4],[20.26,43.15,15.38],[17.71,46.81,12.56],[19.64,55.4,11.24],[19.1,45,15.02],[18.17,42.03,11.66],[19.14,46.33,11.99],[24.3,43.22,11.2],[17.6,47.56,11.53],[29.64,157.96,12.43],[18.85,42.05,30.49],[19.38,50.22,11.23],[40.11,62.46,97.54],[47.73,43.36,13.84],[19.41,46.23,12.59],[18.95,46.47,13.46],[19.18,48.42,17.89],[17.65,43.89,12.54],[21.38,51.14,55.83],[19.13,43.18,14.93],[52.17,53.55,11.68],[20.2,42.89,11.75],[19.2,46,19.34],[38.28,43.18,14.32],[40.22,44.73,14.58],[25.73,42.73,11.21],[17.9,45.4,10.76],[18.66,45.58,11.64],[18.12,48.44,11.01],[17.84,41.79,11.85],[41.5,44.36,14.14],[17.6,44.6,11.02],[17.37,45.39,10.92],[19.54,47.31,11.61],[19.14,45.99,14.1],[30.53,105,13.32],[39.7,49.61,12.17],[21.8,44.31,11.53],[71.35,115.15,11.64],[20.88,44.38,12.65],[18.66,44.73,13.48],[27.43,42.77,11.06],[19.39,47.16,10.87],[34.13,41.9,11.15],[17.12,46.34,16.04],[33.99,42.28,11.45],[16.59,43.89,11.03],[50.81,44.21,11.01],[17.66,46.53,11.15],[18.67,48.33,10.75],[18.86,43.78,11.06],[20.34,41.77,10.9],[17.52,44.21,23.78],[17.33,49.35,22.65],[20.41,49.41,10.95],[19.61,50.41,11.16],[17.02,42.88,12.91],[18.16,41.42,11.17]].flatMap(([eventbridge, lambda, sqs], run) => [\n  { run, name: \"eventbridge\", latency: eventbridge },\n  { run, name: \"sqs\", latency: sqs },\n  { run, name: \"lambda\", latency: lambda }\n])\n)};\nconst _selected = function _selected(data,services){return(\ndata.filter(d => services.includes(d.name))\n)};\nconst _stats = function _stats(d3,selected,services){return(\nservices.map(name => {\n  const xs = selected.filter(d => d.name === name).map(d => d.latency).sort(d3.ascending);\n  const q = p => d3.quantileSorted(xs, p);\n  return { service: name, runs: xs.length, min: xs[0], p10: q(0.1), p25: q(0.25), median: q(0.5),\n    p75: q(0.75), p90: q(0.9), p99: q(0.99), max: xs[xs.length - 1], mean: d3.mean(xs), stddev: d3.deviation(xs) };\n})\n)};\nconst _dashboard = function _dashboard(Plot,selected,stats,html)\n{\n  const chart = Plot.plot({\n    width: 900,\n    height: 360,\n    x: { label: \"latency (ms)\" },\n    color: { legend: true },\n    marks: [\n      Plot.line(selected, Plot.binX({ y: \"count\" }, { x: \"latency\", stroke: \"name\", tip: true })),\n      Plot.ruleY([0])\n    ]\n  });\n  const fastest = stats.slice().sort((a, b) => a.median - b.median)[0];\n  return html`<div style=\"display: grid; grid-template-columns: 900px 280px; gap: 24px; align-items: start\">\n  <div>${chart}</div>\n  <div class=\"summary\" style=\"padding: 12px 16px; background: #f4f4f0; border-radius: 6px\">\n    <h3 style=\"margin-top: 0\">Fastest median</h3>\n    <p><b>${fastest ? fastest.service : \"none\"}</b> at ${fastest ? fastest.median.toFixed(1) : \"-\"} ms over ${fastest ? fastest.runs : 0} runs.</p>\n    <p>All three calls return once the request is accepted; the work runs later. The tail (p90, p99) matters more than the median for a caller in a request path.</p>\n  </div>\n</div>`;\n};\nconst _table = function _statsTable(html,stats){return(\nhtml`<table style=\"border-collapse: collapse; white-space: nowrap; font-variant-numeric: tabular-nums\">\n  <thead><tr>${[\"service\", \"runs\", \"min\", \"p10\", \"p25\", \"median\", \"p75\", \"p90\", \"p99\", \"max\", \"mean\", \"stddev\"].map(h => html`<th style=\"padding: 4px 14px; text-align: right\">${h}</th>`)}</tr></thead>\n  <tbody>${stats.map(s => html`<tr>${[s.service, s.runs, ...[\"min\", \"p10\", \"p25\", \"median\", \"p75\", \"p90\", \"p99\", \"max\", \"mean\", \"stddev\"].map(k => s[k].toFixed(2) + \" ms\")].map(v => html`<td style=\"padding: 4px 14px; text-align: right\">${v}</td>`)}</tr>`)}</tbody>\n</table>`\n)};\nconst _code = function _code(md){return(\nmd`\\`\\`\\`\nimport boto3\nimport time\nimport json\n\n# Initialize clients\neventbridge_client = boto3.client('events')\nlambda_client = boto3.client('lambda')\nsqs_client = boto3.client('sqs')\n\n# Parameters\nevent_bus_name = 'benchmark-tom'\nlambda_function_name = 'benchmark-tom'\nsqs_queue_url = 'https://sqs.eu-central-1.amazonaws.com/513386457761/benchmark-tom'\nnumber_of_messages = 10  # Adjust based on your batching needs\nnumber_of_runs = 1000\npause_between_invocations = 0.1  # 0.1 seconds\n\n# Prepare messages\nmessages = [{'Id': str(i), 'MessageBody': '{\"key\": \"value\"}'} for i in range(number_of_messages)]\nevent_entries = [{'Source': 'benchmark.test', 'DetailType': 'test', 'Detail': '{\"key\": \"value\"}'} for _ in range(number_of_messages)]\nlambda_payload = json.dumps([{'key': 'value'} for _ in range(number_of_messages)]).encode('utf-8')\n\nresults = []\nfor _ in range(number_of_runs):\n    # Benchmark EventBridge put_events\n    start_time = time.time()\n    response = eventbridge_client.put_events(Entries=event_entries)\n    eventbridge_time = time.time() - start_time\n\n    # Benchmark Lambda async invocation\n    start_time = time.time()\n    response = lambda_client.invoke(FunctionName=lambda_function_name, InvocationType='Event', Payload=lambda_payload)\n    lambda_time = time.time() - start_time\n\n    # Benchmark SQS SendMessageBatch\n    start_time = time.time()\n    response = sqs_client.send_message_batch(QueueUrl=sqs_queue_url, Entries=messages)\n    sqs_time = time.time() - start_time\n\n    results.append([eventbridge_time, lambda_time, sqs_time])\n    # Pause\n    time.sleep(pause_between_invocations)\n\n# dump as csv\nwith open('results.csv', 'w') as f:\n    f.write('eventbridge,lambda,sqs\\\\n')\n    for result in results:\n        f.write(f'{result[0]},{result[1]},{result[2]}\\\\n')\n\n\\`\\`\\``\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_intro\", null, [\"md\"], _intro);\n  $def(\"_services\", \"viewof services\", [\"Inputs\"], _services);\n  $def(\"_services_v\", \"services\", [\"Generators\",\"viewof services\"], _services_v);\n  $def(\"_data\", \"data\", [], _data);\n  $def(\"_selected\", \"selected\", [\"data\",\"services\"], _selected);\n  $def(\"_stats\", \"stats\", [\"d3\",\"selected\",\"services\"], _stats);\n  $def(\"_dashboard\", \"dashboard\", [\"Plot\",\"selected\",\"stats\",\"html\"], _dashboard);\n  $def(\"_table\", \"statsTable\", [\"html\",\"stats\"], _table);\n  $def(\"_code\", null, [\"md\"], _code);\n  return main;\n}\n";

// Seeded phone defects (the corpus original has one chart and no layout): the chart is `Plot.plot({width: 900})`
// inside a `grid-template-columns: 900px 280px` row beside a summary panel, and the per-service stats are a
// 12-column `white-space: nowrap` table with no scroll box. At 390px the page scrolls sideways; nothing errors.
// setup.collect renders the user module in a 390px and a 1100px iframe and scores behaviour, not spelling:
//   390px: no horizontal page scroll; nothing past the right edge unless inside a scroll box; the chart fits
//          the width whole (not cut by the edge, not inside a scroller or overflow:hidden) and is >= 250px;
//          the table is whole on screen or scrolls in its own overflow-x:auto/scroll box that fits; all 12
//          column headers and the summary are still there.
//   1100px: the same, with the chart >= 400px and the summary beside it (desktop layout kept).
//   reacts: unticking "lambda" still redraws the table (3 -> 2 rows).
// Sibling of rc5t-narrow-layout (grid only); this one adds the chart, the table and a two-column row.

const FIXED = FIXTURE
  .replace(`["Plot","selected","stats","html"]`, `["Plot","selected","stats","html","width"]`)
  .replace("function _dashboard(Plot,selected,stats,html)", "function _dashboard(Plot,selected,stats,html,width)")
  .replace("width: 900,", "width: Math.min(width, 900),")
  .replace("grid-template-columns: 900px 280px;", "grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));")
  .replace("<div>${chart}</div>", `<div style="min-width: 0">\${chart}</div>`)
  .replace("html`<table", `html\`<div style="overflow-x: auto"><table`)
  .replace("</table>`", "</table></div>`");
if (!FIXED.includes("Math.min(width, 900)") || !FIXED.includes(`"html","width"]`) || !FIXED.includes("html,width)") ||
    FIXED.includes("900px 280px") || !FIXED.includes("min-width: 0") || !FIXED.includes("</table></div>"))
  throw new Error("phone-readable eval: FIXED did not apply");

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module).filter(m => m !== globalThis.__ojs_runtime.mains.get("@user/latency-dashboard")));
})()`;

// Every module the user owns (the seeded one, or any created during the turn) is re-instantiated inside a
// same-origin iframe of the given width: each cell is copied into a fresh module whose `width` is the iframe
// body's width, and its DOM is placed in cell order. Media queries, container queries, grid/flex wrapping and
// the reactive `width` builtin all see the narrow viewport.
const COLLECT = String.raw`(async () => {
  const reg = globalThis.__ojs_runtime;
  const rt = [...reg.mains.values()].find(m => m && m._runtime)._runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const before = globalThis.__rc5tBefore || new Set();
  const mods = [...new Set([...rt._variables].map(v => v._module))].filter(m => m && !before.has(m) && m !== rt._builtin);
  const out = { modules: [...reg.mains].filter(([, m]) => mods.includes(m)).map(([k]) => k) };
  if (!mods.length) return { ...out, verdict: "no user module" };
  const HEADERS = ["service", "runs", "min", "p10", "p25", "median", "p75", "p90", "p99", "max", "mean", "stddev"];
  const render = async (W) => {
    const ifr = document.createElement("iframe");
    ifr.style.cssText = "position:fixed;left:0;top:0;width:" + W + "px;height:1000px;border:0;opacity:0;pointer-events:none;z-index:-1";
    document.body.appendChild(ifr);
    const doc = ifr.contentDocument;
    doc.open(); doc.write("<!doctype html><html><head></head><body></body></html>"); doc.close();
    for (const s of document.querySelectorAll("style, link[rel=stylesheet]")) doc.head.appendChild(s.cloneNode(true));
    // code blocks scroll on their own (observablehq.com's notebook CSS does this); a long code line is not a layout defect
    const pre = doc.createElement("style"); pre.textContent = "pre { overflow-x: auto; }"; doc.head.appendChild(pre);
    doc.body.style.cssText = "margin:0;padding:0 8px;overflow:visible;height:auto;width:auto;max-width:none";
    const bodyW = doc.body.clientWidth;
    const made = [];
    for (const mod of mods) {
      const copy = rt.module();
      const vars = [...rt._variables].filter(v => v._module === mod && v._type === 1);
      if (!vars.some(v => v._name === "width")) made.push(copy.define("width", [], () => bodyW));
      for (const v of vars) {
        if (v._name && String(v._name).startsWith("module ")) {
          made.push(copy.define(v._name, v._inputs.map(i => i._name), v._definition)); continue;
        }
        const slot = doc.createElement("div");
        slot.className = "observablehq";
        doc.body.appendChild(slot);
        const obs = { pending() {}, fulfilled(x) { slot.replaceChildren(); delete slot.dataset.err; if (x instanceof Node) slot.appendChild(x); },
                      rejected(e) { slot.dataset.err = String(e && e.message || e); } };
        const nv = copy.variable(obs);
        const i0 = v._inputs[0];
        if (v._inputs.length === 1 && i0 && i0._module !== mod && i0._module !== rt._builtin && v._name && i0._name && /^\s*(function\s*identity|\(?\s*\w+\s*\)?\s*=>\s*\w+\s*$)/.test(String(v._definition))) nv.import(i0._name, v._name, i0._module);
        else nv.define(v._name, v._inputs.map(i => i._name), v._definition);
        made.push(nv);
      }
    }
    await sleep(2500);
    return { ifr, doc, made, bodyW };
  };
  const measure = ({ doc }, W, minChartW) => {
    const win = doc.defaultView;
    const ox = el => win.getComputedStyle(el).overflowX;
    const clips = el => ox(el) !== "visible";
    const errs = [...doc.querySelectorAll("[data-err]")].map(s => s.dataset.err).slice(0, 3);
    const R = el => el.getBoundingClientRect();
    // a chart: a top-level svg at least 150px wide with drawn paths (legend swatches are small svgs)
    const charts = [...doc.querySelectorAll("svg")].filter(s => !s.parentElement.closest("svg") && R(s).width >= 150 && s.querySelector("path"));
    // whole = inside the viewport and inside every clipping or scrolling ancestor
    const whole = el => {
      const r = R(el);
      if (r.left < -1 || r.right > W + 1) return false;
      for (let a = el.parentElement; a && a !== doc.body; a = a.parentElement)
        if (clips(a)) { const ar = R(a); if (r.left < ar.left - 1 || r.right > ar.right + 1) return false; }
      return true;
    };
    const chartW = charts.map(s => Math.round(R(s).width));
    const chartsWhole = charts.length >= 1 && charts.every(whole) && Math.min(...chartW) >= minChartW;
    // the stats table: whatever element holds the header labels; reachable if whole, or if its nearest
    // clipping ancestor scrolls (auto/scroll, not hidden/clip) and that box is itself whole
    const text = (doc.body.innerText || "").toLowerCase();
    const headersPresent = HEADERS.every(h => text.includes(h));
    const tables = [...doc.querySelectorAll("table")].filter(t => /median/i.test(t.textContent) && /stddev/i.test(t.textContent));
    const tableReach = t => {
      if (whole(t)) return "whole";
      let a = t.parentElement;
      while (a && a !== doc.body && !clips(a)) a = a.parentElement;
      if (!a || a === doc.body) return "past edge";
      if (!/auto|scroll/.test(ox(a))) return "cut by overflow " + ox(a);
      return whole(a) ? "scrolls" : "scroll box past edge";
    };
    const tableState = tables.map(tableReach);
    const rows = tables.length ? [...tables[0].querySelectorAll("tr")].filter(tr => tr.querySelectorAll("td").length >= 3).length : 0;
    const tableOk = tables.length === 0 ? headersPresent && /eventbridge/.test(text) : tableState.every(s => s === "whole" || s === "scrolls");
    const summary = [...doc.querySelectorAll("*")].filter(e => /fastest median/i.test(e.textContent) && ![...e.children].some(c => /fastest median/i.test(c.textContent)))[0];
    const box = summary && summary.parentElement;
    const summaryWhole = !!box && whole(box);
    // anything poking past the right edge that is not inside a scroll box
    const past = [];
    for (const el of doc.body.querySelectorAll("*")) {
      if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
      const r = R(el);
      if (r.width === 0 || r.right <= W + 1) continue;
      let scroller = false;
      for (let a = el.parentElement; a && a !== doc.body; a = a.parentElement) if (clips(a)) { scroller = true; break; }
      if (!scroller) past.push(el.tagName.toLowerCase() + "@" + Math.round(r.right) + ":" + (el.textContent || "").trim().slice(0, 30));
    }
    let beside = null;
    if (charts[0] && box) { const c = R(charts[0]), s = R(box); beside = s.left >= c.right - 8 && s.top < c.bottom; }
    return { errs, pageScroll: doc.documentElement.scrollWidth - W, charts: charts.length, chartW, chartsWhole,
             tables: tables.length, tableState, rows, headersPresent, summaryWhole, beside, past: past.slice(0, 6), pastCount: past.length,
             ok: errs.length === 0 && doc.documentElement.scrollWidth - W <= 1 && past.length === 0 && chartsWhole && tableOk && headersPresent && summaryWhole && rows >= 3 };
  };
  const done = r => { for (const v of r.made) { try { v.delete(); } catch {} } r.ifr.remove(); };
  const narrow = await render(390);
  try { out.narrow = measure(narrow, 390, 250); } finally { done(narrow); }
  const wide = await render(1100);
  try {
    out.desktop = measure(wide, 1100, 400);
    const lambda = [...wide.doc.querySelectorAll("input[type=checkbox]")].find(c => c.value === "lambda" || /lambda/.test((c.closest("label") || c.parentElement).textContent));
    if (!lambda) out.reacts = "no lambda checkbox";
    else {
      lambda.checked = false; lambda.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(1500);
      const m = measure(wide, 1100, 400);
      out.reacts = m.rows === 2 && m.charts >= 1 ? "ok" : "after unticking lambda: rows " + m.rows + ", charts " + m.charts;
    }
  } finally { done(wide); }
  out.narrowOk = out.narrow.ok;
  out.desktopOk = out.desktop.ok && out.desktop.beside === true;
  out.verdict = out.narrowOk && out.desktopOk && out.reacts === "ok" ? "ok"
    : "narrow " + JSON.stringify(out.narrow) + " desktop " + JSON.stringify(out.desktop) + " reacts " + out.reacts;
  return out;
})()`;

export default {
  id: "rc5t-phone-readable",
  category: "rc5-train",
  question: "Make my notebook readable on a phone.",
  setup: { files: { "/src/@user/latency-dashboard.js": FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "verdict", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "narrowOk", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "desktopOk", equals: true }, weight: 1 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/latency-dashboard.js", content: FIXED } },
  ],
};
