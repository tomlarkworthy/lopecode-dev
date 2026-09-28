// rc5-train eval (20260928-0847-m33): a maintenance goal. "The browser console is full of errors and warnings
// from my notebook; clean them up without changing what it does."
// setup.files seeds @user/unemployment (fixtures/unemployment-noisy.js, provenance in fixtures/PROVENANCE.txt):
// @zanarmstrong/highlight-color-w-dropdown re-homed offline, plus three noise sources that leave every display
// intact:
//   S1 console.warn from Plot 0.6.17 on every render of the faceted chart: a context-lines mark whose data is a
//      distinct same-length copy of the facet data ("the line mark appears to use faceted data, but isn't
//      faceted"), and Plot's ⚠ glyph in that chart
//   S2 a failed fetch of industry-notes.json at boot (the file does not exist; .catch falls back to inline notes)
//   S3 an unhandled rejection when "none" is picked: an async input listener reduces an empty array
// setup.init picks Finance, none, Construction, Manufacturing on the live module, as the user did.
// setup.initScript (before boot) records console.warn/console.error calls, window errors (resource errors in
// the capture phase), unhandled rejections and failed fetches, each with its stack.
// setup.collect (behaviour, not spelling): loads the module's final source fresh into its own runtime module
// with every cell observed (anonymous included), picks Manufacturing (default), Finance, none, Construction
// through the select's input event, and records
//   s1/s2/s3  - each seeded source is gone: nothing recorded whose stack is in the module's code, no ⚠ glyph
//   clean     - no other warning/error/rejection/failed fetch from the module's code
//   displays  - every display of the unedited fixture, in each of the four states, is rendered identically
//               (Plot class ids, Inputs ids and the ⚠ glyph normalised); the fixture is loaded the same way,
//               after the measured run
//   feature   - after Finance the saved pick is {industry: Finance, peak: 623}, after Construction 2194
//   notHidden - console.warn/console.error are still the functions they were before the turn
//   errors    - no cell errors
// M33_NEG=unchanged|silence|strip|swallow swaps the oracle for a negative control (must score low);
// M33_NEG=ok2 is another correct fix (must score 1.00).
const FIXTURE = "const _dyx6jd = function _1(md){return(\nmd`# Highlight color w/ dropdown`\n)};\nconst _k3data = function _unemployment(d3){return(\nd3.csvParse(`date,industry,unemployed\n2000-01-01,Manufacturing,734\n2000-01-01,Leisure and hospitality,782\n2000-01-01,Construction,745\n2000-01-01,Finance,228\n2001-01-01,Manufacturing,911\n2001-01-01,Leisure and hospitality,806\n2001-01-01,Construction,836\n2001-01-01,Finance,232\n2002-01-01,Manufacturing,1377\n2002-01-01,Leisure and hospitality,947\n2002-01-01,Construction,1211\n2002-01-01,Finance,267\n2003-01-01,Manufacturing,1302\n2003-01-01,Leisure and hospitality,1049\n2003-01-01,Construction,1196\n2003-01-01,Finance,327\n2004-01-01,Manufacturing,1110\n2004-01-01,Leisure and hospitality,1097\n2004-01-01,Construction,994\n2004-01-01,Finance,403\n2005-01-01,Manufacturing,889\n2005-01-01,Leisure and hospitality,993\n2005-01-01,Construction,1079\n2005-01-01,Finance,252\n2006-01-01,Manufacturing,778\n2006-01-01,Leisure and hospitality,910\n2006-01-01,Construction,868\n2006-01-01,Finance,233\n2007-01-01,Manufacturing,752\n2007-01-01,Leisure and hospitality,911\n2007-01-01,Construction,922\n2007-01-01,Finance,233\n2008-01-01,Manufacturing,837\n2008-01-01,Leisure and hospitality,1176\n2008-01-01,Construction,1099\n2008-01-01,Finance,285\n2009-01-01,Manufacturing,1711\n2009-01-01,Leisure and hospitality,1487\n2009-01-01,Construction,1744\n2009-01-01,Finance,571\n2010-01-01,Manufacturing,1918\n2010-01-01,Leisure and hospitality,1804\n2010-01-01,Construction,2194\n2010-01-01,Finance,623`, d3.autoType)\n)};\nconst _ul2e99 = function _2(unemployment){return(\nunemployment\n)};\nconst _a5mmom = function _selectedIndustry(Inputs,unemployment){return(\nInputs.select(\n  [...new Set(unemployment.map((d) => d.industry))].concat(\"none\"),\n  {\n    label: \"selected Industry to highlight\"\n  }\n)\n)};\nconst _1mckfzj = (G, _) => G.input(_);\nconst _zkuc7f = function _4(Plot,unemployment){return(\nPlot.plot({\n  y: {\n    label: \"↑ Unemployed (thousands)\"\n  },\n  marks: [\n    Plot.areaY(\n      unemployment,\n      Plot.stackY({\n        x: \"date\",\n        y: \"unemployed\",\n        fill: \"industry\",\n        z: \"industry\",\n        title: \"industry\",\n        order: \"max\",\n        reverse: true,\n        stroke: \"#ddd\"\n      })\n    ),\n    Plot.ruleY([0])\n  ]\n})\n)};\nconst _1xh2kjf = function _5(Inputs,unemployment){return(\nInputs.table(unemployment)\n)};\nconst _eof5ms = function _6(Plot,unemployment,selectedIndustry,color){return(\nPlot.plot({\n  y: {\n    label: \"↑ Unemployed (thousands)\"\n  },\n  marks: [\n    Plot.areaY(\n      unemployment,\n      Plot.stackY({\n        x: \"date\",\n        y: \"unemployed\",\n        fill: (d) => d.industry === selectedIndustry,\n        z: \"industry\",\n        title: \"industry\",\n        order: \"sum\",\n        reverse: true,\n        stroke: \"#ddd\"\n      })\n    ),\n    Plot.ruleY([0])\n  ],\n  color\n})\n)};\nconst _e75lck = function _7(Plot,selectedIndustry,unemployment,highlightColor){return(\nPlot.plot({\n  y: {\n    grid: true,\n    label: \"↑ Unemployed in \" + selectedIndustry + \" (thousands)\"\n  },\n  marks: [\n    Plot.areaY(\n      unemployment.filter((d) => d.industry == selectedIndustry),\n      Plot.stackY({\n        x: \"date\",\n        y: \"unemployed\",\n        title: \"industry\",\n        fill: highlightColor\n      })\n    ),\n    Plot.ruleY([0])\n  ],\n  height: 200\n})\n)};\nconst _1mwreea = function _8(Plot,unemployment,selectedIndustry,color){return(\nPlot.plot({\n  y: {\n    label: \"↑ Unemployed (thousands)\"\n  },\n  marks: [\n    Plot.line(unemployment, {\n      x: \"date\",\n      y: \"unemployed\",\n      stroke: (d) => d.industry === selectedIndustry,\n      strokeWidth: (d) => (d.industry === selectedIndustry ? 3 : 1),\n      z: \"industry\",\n      title: \"industry\"\n    }),\n    Plot.ruleY([0])\n  ],\n  color\n})\n)};\nconst _psr1tn = function _9(Plot,unemployment,selectedIndustry,color){return(\nPlot.plot({\n  y: {\n    grid: true,\n    label: \"↑ Unemployed (thousands)\"\n  },\n  marks: [\n    // every industry, faint, behind each facet's own area\n    Plot.lineY(unemployment.map((d) => ({ date: d.date, unemployed: d.unemployed, series: d.industry })), {\n      x: \"date\",\n      y: \"unemployed\",\n      z: \"series\",\n      stroke: \"#ccc\",\n      strokeWidth: 0.75\n    }),\n    Plot.areaY(unemployment, {\n      x: \"date\",\n      y: \"unemployed\",\n      fill: (d) => d.industry === selectedIndustry,\n      title: \"industry\",\n      reverse: true\n    }),\n    Plot.ruleY([0])\n  ],\n  facet: {\n    data: unemployment,\n    y: \"industry\"\n    // can I order facets by sum?\n  },\n  width: 400,\n  color\n})\n)};\nconst _y6zfi6 = function _highlightColor(Inputs){return(\nInputs.color({\n  value: \"#478eff\",\n  label: \"Highlight Color\"\n})\n)};\nconst _5ja4bn = (G, _) => G.input(_);\nconst _52iopg = function _11(md){return(\nmd`---------------`\n)};\nconst _1jhuj32 = function _13(md){return(\nmd`### Supporting Code`\n)};\nconst _oh6crs = function _color(highlightColor){return(\n{ domain: [true, false], range: [highlightColor, \"#aaa\"] }\n)};\nconst _notes = function _notes(){return(\nfetch(\"industry-notes.json\")\n  .then((r) => r.json())\n  .catch(() => ({\n    \"Manufacturing\": \"Factory jobs. The 2009 recession doubled unemployment here in a year.\",\n    \"Leisure and hospitality\": \"Hotels, restaurants and entertainment. Seasonal, and the largest of the four in 2000.\",\n    \"Construction\": \"The worst hit by the 2008 housing crash: 2,194 thousand unemployed by January 2010.\",\n    \"Finance\": \"The smallest and steadiest of the four industries.\"\n  }))\n)};\nconst _noteView = function _noteView(md,selectedIndustry,notes){return(\nmd`**${selectedIndustry}:** ${notes[selectedIndustry] ?? \"Pick an industry above to read about it.\"}`\n)};\nconst _rememberPick = function _rememberPick(viewof_selectedIndustry,unemployment,invalidation,md){\n  // the team dashboard reads the last highlighted industry and its peak from localStorage\n  const save = async () => {\n    const industry = viewof_selectedIndustry.value;\n    const rows = unemployment.filter((d) => d.industry === industry);\n    const peak = rows.reduce((a, d) => (d.unemployed > a.unemployed ? d : a));\n    localStorage.setItem(\"highlight-industry\", JSON.stringify({ industry, peak: peak.unemployed, year: peak.date.getUTCFullYear() }));\n  };\n  viewof_selectedIndustry.addEventListener(\"input\", save);\n  invalidation.then(() => viewof_selectedIndustry.removeEventListener(\"input\", save));\n  return md`<small>The industry you highlight is saved for the team dashboard.</small>`;\n};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_dyx6jd\", null, [\"md\"], _dyx6jd);\n  $def(\"_k3data\", \"unemployment\", [\"d3\"], _k3data);\n  $def(\"_ul2e99\", null, [\"unemployment\"], _ul2e99);\n  $def(\"_a5mmom\", \"viewof selectedIndustry\", [\"Inputs\",\"unemployment\"], _a5mmom);\n  $def(\"_1mckfzj\", \"selectedIndustry\", [\"Generators\",\"viewof selectedIndustry\"], _1mckfzj);\n  $def(\"_notes\", \"notes\", [], _notes);\n  $def(\"_noteView\", \"noteView\", [\"md\",\"selectedIndustry\",\"notes\"], _noteView);\n  $def(\"_rememberPick\", \"rememberPick\", [\"viewof selectedIndustry\",\"unemployment\",\"invalidation\",\"md\"], _rememberPick);\n  $def(\"_zkuc7f\", null, [\"Plot\",\"unemployment\"], _zkuc7f);\n  $def(\"_1xh2kjf\", null, [\"Inputs\",\"unemployment\"], _1xh2kjf);\n  $def(\"_eof5ms\", null, [\"Plot\",\"unemployment\",\"selectedIndustry\",\"color\"], _eof5ms);\n  $def(\"_e75lck\", null, [\"Plot\",\"selectedIndustry\",\"unemployment\",\"highlightColor\"], _e75lck);\n  $def(\"_1mwreea\", null, [\"Plot\",\"unemployment\",\"selectedIndustry\",\"color\"], _1mwreea);\n  $def(\"_psr1tn\", null, [\"Plot\",\"unemployment\",\"selectedIndustry\",\"color\"], _psr1tn);\n  $def(\"_y6zfi6\", \"viewof highlightColor\", [\"Inputs\"], _y6zfi6);\n  $def(\"_5ja4bn\", \"highlightColor\", [\"Generators\",\"viewof highlightColor\"], _5ja4bn);\n  $def(\"_52iopg\", null, [\"md\"], _52iopg);\n  $def(\"_1jhuj32\", null, [\"md\"], _1jhuj32);\n  $def(\"_oh6crs\", \"color\", [\"highlightColor\"], _oh6crs);\n  return main;\n}\n";

const INITSCRIPT = String.raw`(() => {
  const rec = globalThis.__m33 = { events: [] };
  const push = (type, text, stack, ev) => rec.events.push({ type, text: String(text).slice(0, 300), stack: String(stack || ""), ev });
  const str = x => x instanceof Error ? x.message : typeof x === "string" ? x : (() => { try { return JSON.stringify(x); } catch (e) { return String(x); } })();
  for (const k of ["warn", "error"]) {
    const orig = console[k];
    console[k] = function (...a) { push("console." + k, a.map(str).join(" "), new Error().stack); return orig.apply(this, a); };
  }
  rec.consoleFns = { warn: console.warn, error: console.error };
  window.addEventListener("error", e => {
    const t = e.target;
    if (t && t !== window && t.tagName) push("resource", t.tagName + " " + (t.src || t.href || ""), "");
    else push("error", e.message, (e.error && e.error.stack) || e.filename);
  }, true);
  window.addEventListener("unhandledrejection", e => push("rejection", (e.reason && e.reason.message) || String(e.reason), e.reason && e.reason.stack, e));
  const of = window.fetch;
  window.fetch = function (input) {
    const stack = new Error().stack, url = String((input && input.url) || input);
    const p = of.apply(this, arguments);
    p.then(r => { if (!r.ok) push("fetch", url + " -> HTTP " + r.status, stack); }, e => push("fetch", url + " -> " + ((e && e.message) || e), stack));
    return p;
  };
})();`;

// the user has been using the notebook: every pick once, "none" included, then back to the default
const INIT = String.raw`(async () => {
  const rt = globalThis.__ojs_runtime;
  globalThis.__rc5tBaseMods = new Set([...rt.mains.keys()].filter(k => k !== "@user/unemployment"));
  if (globalThis.__m33) globalThis.__m33.consoleAtInit = { warn: console.warn, error: console.error };
  const mod = rt.mains.get("@user/unemployment");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const sel = () => [...rt._variables].filter(v => v._module === mod && v._value instanceof Element)
    .flatMap(v => v._value.matches("select") ? [v._value] : [...v._value.querySelectorAll("select")])[0];
  for (let i = 0; i < 20 && !sel(); i++) await sleep(250);
  const s = sel();
  if (!s) return "no select";
  for (const pick of ["Finance", "none", "Construction", "Manufacturing"]) {
    const o = [...s.options].find(o => o.textContent.trim() === pick);
    s.value = o.value;
    s.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(400);
  }
  return "used";
})()`;

const COLLECT = String.raw`(async () => {
  const FIXTURE = __FIXTURE__;
  const rt = globalThis.__ojs_runtime;
  const rec = globalThis.__m33;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const out = { s1: "not run", s2: "not run", s3: "not run", clean: "not run", displays: "not run", feature: "not run", notHidden: "not run", errors: "not run", verdict: "not run" };
  if (!rec) { out.verdict = "initScript did not run"; return out; }
  const consoleSame = () => rec.consoleAtInit && console.warn === rec.consoleAtInit.warn && console.error === rec.consoleAtInit.error;
  let hidden = consoleSame() ? "" : "console.warn/error replaced during the turn";
  // the module's final source
  let host = null;
  for (const v of rt._variables) if (v._name === "rc5_host" && v._value) { host = v._value; break; }
  if (!host) { out.verdict = "no rc5_host"; return out; }
  const files = await host.snapshotFiles();
  const base = globalThis.__rc5tBaseMods || new Set();
  const ids = [...rt.mains.keys()].filter(k => !base.has(k));
  const id = ids.includes("@user/unemployment") ? "@user/unemployment" : ids.find(k => /selectedIndustry/.test(files["/src/" + k + ".js"] || ""));
  const src = id && files["/src/" + id + ".js"];
  out.module = id || null;
  if (!src) { out.verdict = "no module source for @user/unemployment"; return out; }
  const norm = h => h.replace(/<text[^>]*>⚠️?<title>[^<]*<\/title><\/text>/g, "")
    .replace(/plot-[0-9a-f]{6}/g, "plot-X").replace(/(inputs-[0-9a-f]{6}|__ns__)-\d+/g, "$1-N").replace(/\s+/g, " ");
  const measure = async (source) => {
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    const r = { url, states: {}, errs: new Set(), glyphs: 0, saved: {} };
    let mod = null;
    const i0 = rec.events.length;
    try {
      const def = (await import(url)).default;
      try { localStorage.removeItem("highlight-industry"); } catch (e) {}
      mod = rt.module(def, () => ({ pending() {}, fulfilled() {}, rejected() {} }));
      const own = () => [...rt._variables].filter(v => v._module === mod);
      const settle = async (ms) => { await sleep(ms); for (const v of own()) if (v._error != null) r.errs.add((v._name || "(anonymous)") + ": " + String((v._error && v._error.message) || v._error).slice(0, 160)); };
      const snap = () => {
        const els = own().map(v => v._value).filter(x => x instanceof Element);
        r.glyphs += els.reduce((n, e) => n + (e.outerHTML.match(/⚠/g) || []).length, 0);
        return els.map(e => norm(e.outerHTML)).sort();
      };
      await settle(2500);
      r.states.Manufacturing = snap();
      const sel = () => own().map(v => v._value).filter(x => x instanceof Element)
        .flatMap(e => e.matches("select") ? [e] : [...e.querySelectorAll("select")])
        .find(s => [...s.options].some(o => o.textContent.trim() === "Finance"));
      if (!sel()) { r.noSelect = true; return r; }
      for (const pick of ["Finance", "none", "Construction"]) {
        const s = sel();
        const o = [...s.options].find(o => o.textContent.trim() === pick);
        if (!o) { r.states[pick] = ["(no option " + pick + ")"]; continue; }
        s.value = o.value;
        s.dispatchEvent(new Event("input", { bubbles: true }));
        s.dispatchEvent(new Event("change", { bubbles: true }));
        await settle(1500);
        r.states[pick] = snap();
        try { r.saved[pick] = JSON.parse(localStorage.getItem("highlight-industry")); } catch (e) { r.saved[pick] = null; }
      }
    } catch (e) {
      r.loadError = String((e && e.message) || e).slice(0, 200);
    } finally {
      await sleep(300);
      r.events = rec.events.slice(i0);
      if (mod) for (const v of [...rt._variables].filter(v => v._module === mod)) { try { v.delete(); } catch (e) {} }
    }
    return r;
  };
  try {
    const a = await measure(src);
    if (!consoleSame() && !hidden) hidden = "the module's code replaces console.warn/error";
    const b = await measure(FIXTURE);
    if (a.loadError) { out.verdict = "module did not load fresh: " + a.loadError; return out; }
    const mine = a.events.filter(e => e.stack.includes(a.url));
    const other = a.events.filter(e => !e.stack.includes(a.url));
    out.events = mine.map(e => e.type + ": " + e.text.slice(0, 140));
    out.unattributed = other.map(e => e.type + ": " + e.text.slice(0, 100)).slice(0, 12);
    out.refEvents = b.events.filter(e => e.stack.includes(b.url)).map(e => e.type + ": " + e.text.slice(0, 80));
    if (a.noSelect) { out.verdict = "no select with a Finance option"; return out; }
    const s1 = mine.filter(e => /isn.t faceted|faceted data/.test(e.text));
    const s2 = mine.filter(e => e.type === "fetch" || e.type === "resource" || /industry-notes/.test(e.text));
    const s3 = mine.filter(e => e.type === "rejection" || e.type === "error");
    const glyph = a.glyphs;
    out.s1 = !s1.length && !glyph ? "ok" : "Plot facet warning still " + (s1.length ? "logged " + s1.length + "x" : "") + (glyph ? " ⚠ glyph in " + glyph + " render(s)" : "");
    out.s2 = !s2.length ? "ok" : "failed request still made: " + s2[0].text;
    out.s3 = !s3.length ? "ok" : "uncaught still: " + s3.map(e => e.text).slice(0, 2).join("; ");
    const rest = mine.filter(e => !s1.includes(e) && !s2.includes(e) && !s3.includes(e));
    out.clean = !rest.length ? "ok" : "other console output from the module: " + rest.map(e => e.type + ": " + e.text.slice(0, 100)).slice(0, 3).join("; ");
    const diffs = [];
    for (const k of Object.keys(b.states)) {
      const have = [...(a.states[k] || [])];
      for (const h of b.states[k]) { const i = have.indexOf(h); if (i >= 0) have.splice(i, 1); else diffs.push(k + ": " + h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 90)); }
    }
    out.displayDiffs = diffs.slice(0, 6);
    { const at = [];
      for (const k of Object.keys(b.states)) for (const h of b.states[k]) { if ((a.states[k] || []).includes(h)) continue;
        let best = "", bi = 0; for (const g of a.states[k] || []) { let i = 0; while (i < g.length && g[i] === h[i]) i++; if (i > bi) { bi = i; best = g; } }
        at.push(k + " @" + bi + " want …" + h.slice(Math.max(0, bi - 60), bi + 80) + "… got …" + best.slice(Math.max(0, bi - 60), bi + 80) + "…"); }
      out.diffAt = at.slice(0, 4); }
    out.displays = !diffs.length ? "ok" : diffs.length + " display(s) of the original differ or are missing";
    const f = a.saved.Finance, c = a.saved.Construction;
    out.saved = a.saved;
    out.feature = f && f.industry === "Finance" && f.peak === 623 && c && c.industry === "Construction" && c.peak === 2194 ? "ok" : "the pick is not saved as before: " + JSON.stringify(a.saved).slice(0, 200);
    out.notHidden = hidden ? hidden : "ok";
    out.errors = a.errs.size ? [...a.errs].join("; ") : "none";
    out.verdict = ["s1", "s2", "s3", "clean", "displays", "feature", "notHidden"].every(k => out[k] === "ok") && out.errors === "none" ? "ok" : "not ok";
    return out;
  } catch (e) { out.verdict = "collect threw: " + ((e && e.message) || e); return out; }
})()`.replace("__FIXTURE__", () => JSON.stringify(FIXTURE));

const rep = (src, a, b) => { if (!src.includes(a)) throw new Error("m33 eval: edit did not apply: " + a.slice(0, 60)); return src.replace(a, b); };
const CONTEXT_MARK = `    Plot.lineY(unemployment.map((d) => ({ date: d.date, unemployed: d.unemployed, series: d.industry })), {
      x: "date",
      y: "unemployed",
      z: "series",
      stroke: "#ccc",
      strokeWidth: 0.75
    }),`;
const NOTES_FETCH = `fetch("industry-notes.json")
  .then((r) => r.json())
  .catch(() => ({`;
const NOTES_END = `    "Finance": "The smallest and steadiest of the four industries."
  }))
)};`;
const REDUCE = `    const peak = rows.reduce((a, d) => (d.unemployed > a.unemployed ? d : a));`;

// the fix: the context mark says facet: false (what Plot's warning offers); the notes are the inline object the
// fetch always fell back to; the listener skips a pick with no rows
const OK = rep(rep(rep(FIXTURE, CONTEXT_MARK, CONTEXT_MARK.replace("strokeWidth: 0.75", "strokeWidth: 0.75,\n      facet: false")),
  NOTES_FETCH, "({"), NOTES_END, `    "Finance": "The smallest and steadiest of the four industries."
})
)};`).replace(REDUCE, "    if (!rows.length) return;\n" + REDUCE);
// another correct fix: the context mark reads the facet data itself with facet: false; the notes are a
// Promise.resolve; "none" clears the saved pick
const OK2 = rep(rep(rep(FIXTURE, CONTEXT_MARK, `    Plot.lineY(unemployment, {
      x: "date",
      y: "unemployed",
      z: "industry",
      stroke: "#ccc",
      strokeWidth: 0.75,
      facet: false
    }),`), NOTES_FETCH, "Promise.resolve({"), NOTES_END, `    "Finance": "The smallest and steadiest of the four industries."
})
)};`).replace(REDUCE, `    if (!rows.length) { localStorage.removeItem("highlight-industry"); return; }\n` + REDUCE);
// negative: hides the output instead of fixing it
const SILENCE = rep(FIXTURE, `\nexport default function define(runtime, observer) {`, `const _quiet = function _quiet(){
  console.warn = () => {};
  console.error = () => {};
  window.addEventListener("unhandledrejection", (e) => e.preventDefault());
  return "";
};

export default function define(runtime, observer) {`).replace(`  return main;\n}`, `  $def("_quiet", null, [], _quiet);\n  return main;\n}`);
// negative: removes the three features that made the noise
const cutNotes = s => s.slice(0, s.indexOf(NOTES_FETCH)) + "({})\n)};" + s.slice(s.indexOf(NOTES_END) + NOTES_END.length);
const STRIP = rep(cutNotes(rep(FIXTURE, CONTEXT_MARK + "\n", "")), `  viewof_selectedIndustry.addEventListener("input", save);\n`, "");
// negative: try/catch everywhere; the notes and the saved pick are lost, the chart loses its context lines
const SWALLOW = rep(cutNotes(rep(FIXTURE, CONTEXT_MARK + "\n", "")).replace("({})\n)};", "(() => { try { return {}; } catch (e) { return {}; } })()\n)};"), REDUCE,
  `    let peak; try { peak = rows.reduce((a, d) => (d.unemployed > a.unemployed ? d : a)); } catch (e) { return; }\n    return;`);

// baseline: an empty @user module, to record the page's own console noise (none may be attributed to it)
const EMPTY = `const _e = function _e(md){return(md\`# empty\`)};
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer(null)).define(null, ["md"], _e);
  return main;
}`;
const SOLUTIONS = { empty: EMPTY, ok: OK, ok2: OK2, unchanged: FIXTURE, silence: SILENCE, strip: STRIP, swallow: SWALLOW };
const NEG = globalThis.process?.env?.M33_NEG;

export default {
  id: "rc5t-console-noise",
  category: "rc5-train",
  question: "My notebook (@user/unemployment) seems to work, but the browser console is full of errors and warnings from it. Clean them up without changing what it does.",
  setup: { files: { "/src/@user/unemployment.js": FIXTURE }, initScript: INITSCRIPT, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "verdict", equals: "ok" }, weight: 6 },
    { name: "collected_equals", args: { key: "s1", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "s2", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "s3", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "displays", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "feature", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "notHidden", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "clean", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "errors", equals: "none" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/unemployment.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/unemployment.js", content: SOLUTIONS[NEG || "ok"] } },
  ],
};
