// rc5-train eval (20260928-0847-m20): "tidy up my notebook" on an existing module.
// Seeds @user/aqi (@tomlarkworthy/aqi_no_loop_breaking, lopebooks, re-homed; see m20/fixtures/PROVENANCE.txt)
// and @user/aqi-report, which imports pm25_aqi and aqiCategory from it.
// Dead (seeded): lerpOld, categories_v1, scratch, bindSimple — nothing reads them, they display nothing
// a reader needs. Look-dead but used: chart and categoryTable (named display cells nobody references),
// viewof showBands (only read through showBands), initial/mutable readings (written by an anonymous
// button), aqiCategory (read only by @user/aqi-report), test_breakpoints, the anonymous md/slider cells.
// Credit for each removed dead cell is given only when nothing else broke, so "delete every
// unreferenced named cell" scores near 0 and an untouched notebook scores 7/19.
const FIXTURE = "const _jclaoh = function _1(md){return(\nmd`# PM2.5 to AQI Conversion\n\nMy home weather station measures PM2.5 concentration in micrograms per cubic meter (μg/m³). But if I’m concerned about air quality, I want to know the Air Quality Index (AQI). AQI is a policy tool and as such has a complicated definition. So, here’s a tool to convert between PM2.5 and AQI (assuming that PM2.5 is the only pollutant you care about).`\n)};\nconst _1bo40ge = function _2(md){return(\nmd`Drag either slider below to choose the selected PM2.5 or AQI.`\n)};\nconst _1tcoky6 = function _3(md,data){return(\nmd`data.pm25: ${data.pm25} data.AQI: ${data.AQI}`\n)};\nconst _6klsgc = function _data(Inputs){return(\nInputs.input({\n  pm25: 50,\n  AQI: 250\n})\n)};\nconst _q0r7f0 = (G, _) => G.input(_);\nconst _1sizgv5 = function _5(bind,Inputs,$0,pm25_aqi){return(\nbind(\n  Inputs.range([0, 500], { label: \"PM2.5 (μg/m³)\", value: 50, step: 0.1 }),\n  $0,\n  {\n    transform: (d) => d.pm25,\n    invert: (pm25) => ({\n      pm25: pm25,\n      AQI: pm25_aqi(pm25)\n    })\n  }\n)\n)};\nconst _rctuwq = function _6(bind,Inputs,$0,aqi_pm25){return(\nbind(Inputs.range([0, 500], { label: \"AQI\", step: 1 }), $0, {\n  transform: (d) => d.AQI,\n  invert: (aqi) => ({\n    pm25: aqi_pm25(aqi),\n    AQI: aqi\n  })\n})\n)};\nconst _7bands1 = function _showBands(Inputs){return(\nInputs.toggle({ label: \"Show AQI category bands\", value: true })\n)};\nconst _7bands2 = (G, _) => G.input(_);\nconst _17n45h8 = function _chart(Plot,showBands,categories,aqi_pm25,d3,pm25_aqi,data){return(\nPlot.plot({\n  grid: true,\n  x: {\n    label: \"PM2.5 →\"\n  },\n  y: {\n    label: \"↑ AQI\"\n  },\n  color: {\n    type: \"identity\"\n  },\n  marks: [\n    showBands ? Plot.rect(categories, {\n      x1: 0,\n      x2: (d) => aqi_pm25(d.max),\n      y1: 0,\n      y2: \"max\",\n      stroke: \"color\",\n      strokeWidth: 3,\n      reverse: true\n    }) : null,\n    Plot.line(d3.range(501), {\n      x: (d) => d,\n      y: pm25_aqi\n    }),\n    Plot.dot([[data.pm25, data.AQI]]),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      stroke: \"white\",\n      strokeWidth: 3,\n      strokeLinejoin: \"round\",\n      dx: 4,\n      dy: 12\n    }),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      dx: 4,\n      dy: 12\n    })\n  ]\n})\n)};\nconst _me7d6m = function _8(md){return(\nmd`The cell below defines the six official [Air Quality Index (AQI) categories](https://www.airnow.gov/aqi/aqi-basics/): “Each category corresponds to a different level of health concern. Each category also has a specific color. The color makes it easy for people to quickly determine whether air quality is reaching unhealthy levels in their communities.”`\n)};\nconst _zn2jku = function _categories(){return(\n[\n  {max: 50, color: \"green\", name: \"Good\"},\n  {max: 100, color: \"yellow\", name: \"Moderate\"},\n  {max: 150, color: \"orange\", name: \"Unhealthy for sensitive groups\"},\n  {max: 200, color: \"red\", name: \"Unhealthy\"},\n  {max: 300, color: \"purple\", name: \"Very unhealthy\"},\n  {max: 500, color: \"maroon\", name: \"Hazardous\"}\n]\n)};\nconst _cattab1 = function _categoryTable(Inputs,categories){return(\nInputs.table(categories, { columns: [\"name\", \"max\"], header: { name: \"Category\", max: \"Up to AQI\" } })\n)};\nconst _aqicat1 = function _aqiCategory(categories){return(\nfunction aqiCategory(aqi) {\n  return (categories.find((c) => aqi <= c.max) ?? categories[categories.length - 1]).name;\n}\n)};\nconst _catv1 = function _categories_v1(){return(\n[\n  {max: 50, color: \"green\", name: \"Good\"},\n  {max: 100, color: \"yellow\", name: \"Moderate\"},\n  {max: 150, color: \"orange\", name: \"Unhealthy for sensitive groups\"},\n  {max: 200, color: \"red\", name: \"Unhealthy\"},\n  {max: 300, color: \"purple\", name: \"Very unhealthy\"}\n]\n)};\nconst _18c2ed1 = function _10(md){return(\nmd`The \\`pm25_aqi\\` function converts from a PM2.5 concentration in micrograms per cubic meter to the corresponding AQI value (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`aqi_pm25\\`.`\n)};\nconst _1v04v34 = function _pm25_aqi(lerp){return(\nfunction pm25_aqi(pm25) {\n  const c = Math.floor(10 * pm25) / 10;\n  const a = c < 0 ? 0 // values below 0 are considered beyond AQI\n    : c <  12.1 ? lerp(  0,  50,   0.0,  12.0, c)\n    : c <  35.5 ? lerp( 51, 100,  12.1,  35.4, c)\n    : c <  55.5 ? lerp(101, 150,  35.5,  55.4, c)\n    : c < 150.5 ? lerp(151, 200,  55.5, 150.4, c)\n    : c < 250.5 ? lerp(201, 300, 150.5, 250.4, c)\n    : c < 350.5 ? lerp(301, 400, 250.5, 350.4, c)\n    : c < 500.5 ? lerp(401, 500, 350.5, 500.4, c)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.round(a);\n}\n)};\nconst _hkqgrd = function _12(md){return(\nmd`The \\`aqi_pm25\\` function converts from an AQI value to the corresponding PM2.5 concentration in micrograms per cubic meter (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`pm25_aqi\\`.`\n)};\nconst _1tqcgw3 = function _aqi_pm25(lerp){return(\nfunction aqi_pm25(aqi) {\n  const a = Math.round(aqi);\n  const c = a < 0 ? 0 // values below 0 are considered beyond AQI\n    : a <=  50 ? lerp(  0.0,  12.0,   0,  50, a)\n    : a <= 100 ? lerp( 12.1,  35.4,  51, 100, a)\n    : a <= 150 ? lerp( 35.5,  55.4, 101, 150, a)\n    : a <= 200 ? lerp( 55.5, 150.4, 151, 200, a)\n    : a <= 300 ? lerp(150.5, 250.4, 201, 300, a)\n    : a <= 400 ? lerp(250.5, 350.4, 301, 400, a)\n    : a <= 500 ? lerp(350.5, 500.4, 401, 500, a)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.floor(10 * c) / 10;\n}\n)};\nconst _scr1 = function _scratch(pm25_aqi){return(\npm25_aqi(35.4)\n)};\nconst _1v4p2ht = function _14(md){return(\nmd`The \\`lerp\\` function is like d3.scaleLinear, redux.`\n)};\nconst _1n6puuj = function _lerp(){return(\nfunction lerp(ylo, yhi, xlo, xhi, x) {\n  return ((x - xlo) / (xhi - xlo)) * (yhi - ylo) + ylo;\n}\n)};\nconst _lold1 = function _lerpOld(){return(\nfunction lerpOld(a, b, t) {\n  return a + (b - a) * t;\n}\n)};\nconst _tbp1 = function _test_breakpoints(pm25_aqi,aqi_pm25){return(\n(() => {\n  for (const [pm25, aqi] of [[12.0, 50], [35.4, 100], [55.4, 150], [150.4, 200]]) {\n    if (pm25_aqi(pm25) !== aqi) throw new Error(`pm25_aqi(${pm25}) should be ${aqi}`);\n    if (aqi_pm25(aqi) !== pm25) throw new Error(`aqi_pm25(${aqi}) should be ${pm25}`);\n  }\n  return \"4 breakpoints convert both ways\";\n})()\n)};\nconst _133w3ev = function _16(md){return(\nmd`The \\`bind\\` function is like [Inputs.bind](https://github.com/observablehq/inputs/blob/main/README.md#bind), except it applies a transform to convert between units, and only propagates on trusted events. This way when the user interacts with the target, it’ll propagate to the source, but the source won’t propagate back to the target. This transform needs to be invertible so that you can drag either range input to affect the other.`\n)};\nconst _1750m2n = function _bind(Inputs,Event){return(\nfunction bind(\n  target,\n  source,\n  {\n    invalidation = Inputs.disposal(target),\n    transform = (d) => d,\n    invert = (d) => d\n  } = {}\n) {\n  const onsource = (event) => {\n    target.value = transform(source.value);\n  };\n  const ontarget = (event) => {\n    source.value = invert(target.value);\n    source.dispatchEvent(new Event(\"input\", { bubbles: true }));\n  };\n  onsource({});\n  target.addEventListener(\"input\", ontarget);\n  source.addEventListener(\"input\", onsource);\n  invalidation.then(() => source.removeEventListener(\"input\", onsource));\n  return target;\n}\n)};\nconst _bsim1 = function _bindSimple(Inputs){return(\nfunction bindSimple(target, source) {\n  return Inputs.bind(target, source);\n}\n)};\nconst _rec1 = function _19(htl,$0,$1){return(\nhtl.html`<button onclick=${() => $0.value = [...$0.value, { ...$1.value, at: new Date().toLocaleTimeString() }]}>Record this reading</button>`\n)};\nconst _rdg1 = function _readings(){return(\n[]\n)};\nconst _rdg2 = (M, _) => new M(_);\nconst _rdg3 = _ => _.generator;\nconst _rtab1 = function _20(Inputs,readings){return(\nInputs.table(readings, { columns: [\"pm25\", \"AQI\", \"at\"], required: false })\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_jclaoh\", null, [\"md\"], _jclaoh);  \n  $def(\"_1bo40ge\", null, [\"md\"], _1bo40ge);  \n  $def(\"_1tcoky6\", null, [\"md\",\"data\"], _1tcoky6);  \n  $def(\"_6klsgc\", \"viewof data\", [\"Inputs\"], _6klsgc);  \n  $def(\"_q0r7f0\", \"data\", [\"Generators\",\"viewof data\"], _q0r7f0);  \n  $def(\"_1sizgv5\", null, [\"bind\",\"Inputs\",\"viewof data\",\"pm25_aqi\"], _1sizgv5);  \n  $def(\"_rctuwq\", null, [\"bind\",\"Inputs\",\"viewof data\",\"aqi_pm25\"], _rctuwq);  \n  $def(\"_7bands1\", \"viewof showBands\", [\"Inputs\"], _7bands1);  \n  $def(\"_7bands2\", \"showBands\", [\"Generators\",\"viewof showBands\"], _7bands2);  \n  $def(\"_17n45h8\", \"chart\", [\"Plot\",\"showBands\",\"categories\",\"aqi_pm25\",\"d3\",\"pm25_aqi\",\"data\"], _17n45h8);  \n  $def(\"_me7d6m\", null, [\"md\"], _me7d6m);  \n  $def(\"_zn2jku\", \"categories\", [], _zn2jku);  \n  $def(\"_cattab1\", \"categoryTable\", [\"Inputs\",\"categories\"], _cattab1);  \n  $def(\"_aqicat1\", \"aqiCategory\", [\"categories\"], _aqicat1);  \n  $def(\"_catv1\", \"categories_v1\", [], _catv1);  \n  $def(\"_18c2ed1\", null, [\"md\"], _18c2ed1);  \n  $def(\"_1v04v34\", \"pm25_aqi\", [\"lerp\"], _1v04v34);  \n  $def(\"_hkqgrd\", null, [\"md\"], _hkqgrd);  \n  $def(\"_1tqcgw3\", \"aqi_pm25\", [\"lerp\"], _1tqcgw3);  \n  $def(\"_scr1\", \"scratch\", [\"pm25_aqi\"], _scr1);  \n  $def(\"_1v4p2ht\", null, [\"md\"], _1v4p2ht);  \n  $def(\"_1n6puuj\", \"lerp\", [], _1n6puuj);  \n  $def(\"_lold1\", \"lerpOld\", [], _lold1);  \n  $def(\"_tbp1\", \"test_breakpoints\", [\"pm25_aqi\",\"aqi_pm25\"], _tbp1);  \n  $def(\"_133w3ev\", null, [\"md\"], _133w3ev);  \n  $def(\"_1750m2n\", \"bind\", [\"Inputs\",\"Event\"], _1750m2n);  \n  $def(\"_bsim1\", \"bindSimple\", [\"Inputs\"], _bsim1);  \n  $def(\"_rec1\", null, [\"htl\",\"mutable readings\",\"viewof data\"], _rec1);  \n  $def(\"_rdg1\", \"initial readings\", [], _rdg1);  \n  $def(\"_rdg2\", \"mutable readings\", [\"Mutable\",\"initial readings\"], _rdg2);  \n  $def(\"_rdg3\", \"readings\", [\"mutable readings\"], _rdg3);  \n  $def(\"_rtab1\", null, [\"Inputs\",\"readings\"], _rtab1);\n  return main;\n}\n";
const REPORT = "const _rep1 = function _1(md){return(\nmd`# Daily air report`\n)};\nconst _rep2 = function _todayPm25(){return(\n20\n)};\nconst _rep3 = function _3(md,todayPm25,pm25_aqi,aqiCategory){return(\nmd`Today's PM2.5 is ${todayPm25} μg/m³: AQI ${pm25_aqi(todayPm25)}, **${aqiCategory(pm25_aqi(todayPm25))}**.`\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_rep1\", null, [\"md\"], _rep1);  \n  $def(\"_rep2\", \"todayPm25\", [], _rep2);  \n  $def(\"_rep3\", null, [\"md\",\"todayPm25\",\"pm25_aqi\",\"aqiCategory\"], _rep3);  \n  main.define(\"module @user/aqi\", async () => runtime.module((await import(\"/@user/aqi.js?v=4\")).default));\n  main.define(\"pm25_aqi\", [\"module @user/aqi\", \"@variable\"], (_, v) => v.import(\"pm25_aqi\", _));\n  main.define(\"aqiCategory\", [\"module @user/aqi\", \"@variable\"], (_, v) => v.import(\"aqiCategory\", _));\n  return main;\n}\n";
const DEAD = ["lerpOld", "categories_v1", "scratch", "bindSimple"];
const KEEP = ["viewof data", "data", "viewof showBands", "showBands", "chart", "categories", "categoryTable",
  "aqiCategory", "pm25_aqi", "aqi_pm25", "lerp", "bind", "test_breakpoints",
  "initial readings", "mutable readings", "readings"];

// Force every variable of both seeded modules, wait for them, and record what each displayed element shows.
const HELPERS = String.raw`
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const modOf = id => rt.mains.get(id);
  const varsOf = m => [...rt._variables].filter(v => v._module === m && !(v._name && String(v._name).startsWith("module ")) && v._name !== "@variable");
  const NOOP = { pending() {}, fulfilled() {}, rejected() {} };
  // observe every unobserved cell (anonymous ones cannot be read by name), then let the runtime compute
  const forceAll = async () => { for (const id of ["@user/aqi", "@user/aqi-report"]) { const m = modOf(id); if (!m) continue;
    for (const v of varsOf(m)) if (!v._reachable) { v._observer = NOOP; m._runtime._dirty.add(v); }
    m._runtime._computeSoon(); }
    for (const id of ["@user/aqi", "@user/aqi-report"]) { const m = modOf(id); if (!m) continue;
      for (const v of varsOf(m)) { try { await Promise.race([v._promise, sleep(3000)]); } catch {} } } };
  const settle = async (v, ms = 3000) => { if (v._error != null) return String(v._error?.message ?? v._error); try { await Promise.race([v._promise, sleep(ms).then(() => { throw new Error("pending after " + ms + "ms"); })]); return null; } catch (e) { return String(e?.message ?? e); } };
  const norm = s => String(s).replace(/\s+/g, " ").trim();
  // shown text without <style> blocks: Inputs.table and Plot put a per-render id in theirs
  const shown = e => { const c = e.cloneNode(true); c.querySelectorAll("style").forEach(s => s.remove()); return norm(c.matches?.("style") ? "" : c.textContent); };
  const texts = m => varsOf(m).filter(v => v._value instanceof Element).map(v => shown(v._value)).filter(Boolean);
`;
// Anonymous variables cannot be named in define([...]); observe them with a dummy variable instead.
const INIT = String.raw`(async () => {${HELPERS}
  globalThis.__m20Base = new Set([...rt.mains.keys()].filter(k => k !== "@user/aqi" && k !== "@user/aqi-report"));
  await forceAll();
  await sleep(1500);
  globalThis.__m20Before = { aqi: texts(modOf("@user/aqi")), report: modOf("@user/aqi-report") ? texts(modOf("@user/aqi-report")) : null };
})()`;

const COLLECT = String.raw`(async () => {${HELPERS}
  const out = { modules: [...rt.mains.keys()].filter(k => !(globalThis.__m20Base || new Set()).has(k)) };
  const aqi = modOf("@user/aqi"), rep = modOf("@user/aqi-report");
  if (!aqi) return { ...out, error: "@user/aqi is gone" };
  await forceAll();
  await sleep(1000);
  const byName = n => varsOf(aqi).find(v => v._name === n);
  // put the controls back to the fixture's initial state, in case the agent moved them
  try { const e = byName("viewof data")?._value; if (e) { e.value = { pm25: 50, AQI: 250 }; e.dispatchEvent(new Event("input", { bubbles: true })); } } catch {}
  try { const e = byName("viewof showBands")?._value; if (e) { e.value = true; e.dispatchEvent(new Event("input", { bubbles: true })); } } catch {}
  try { const mv = byName("mutable readings")?._value; if (mv) mv.value = []; } catch {}
  await sleep(1500);
  const names = new Set(varsOf(aqi).map(v => v._name).filter(Boolean));
  out.deadLeft = DEAD.filter(n => names.has(n));
  out.missing = KEEP.filter(n => !names.has(n));
  // every cell of both modules, anonymous included, settles without an error
  const errs = [];
  for (const [id, m] of [["@user/aqi", aqi], ["@user/aqi-report", rep]]) {
    if (!m) { errs.push(id + ": module gone"); continue; }
    for (const v of varsOf(m)) { const e = await settle(v); if (e) errs.push(id + " " + (v._name ?? v.pid ?? "anon") + ": " + e.slice(0, 120)); }
  }
  out.errors = errs;
  out.noErrors = errs.length === 0;
  out.keptOk = out.missing.length === 0;
  const before = globalThis.__m20Before || { aqi: [] };
  const after = texts(aqi);
  out.beforeDisplays = before.aqi.length;
  // the original notebook's "data.pm25: 50 data.AQI: 250" readout reads as debug output; removing it is not scored
  out.lostDisplays = before.aqi.filter(t => !/^data\.pm25:/.test(t)).filter(t => !after.includes(t)).map(t => t.slice(0, 100));
  if (out.lostDisplays.length) out.afterSample = after.map(t => t.slice(0, 160));
  out.displaysOk = before.aqi.length > 5 && out.lostDisplays.length === 0;
  // controls: the band toggle, the PM2.5 slider (through bind into viewof data), the record button
  try {
    const els = varsOf(aqi).map(v => v._value).filter(x => x instanceof Element);
    const chart = () => varsOf(aqi).map(v => v._value).find(x => x instanceof Element && /AQI/.test(x.textContent) && x.querySelector("svg, path"));
    const rects = () => (chart()?.querySelectorAll("rect") || []).length;
    const tog = byName("viewof showBands")?._value;
    const r1 = rects(); tog.value = false; tog.dispatchEvent(new Event("input", { bubbles: true })); await sleep(800);
    const r0 = rects(); tog.value = true; tog.dispatchEvent(new Event("input", { bubbles: true })); await sleep(800);
    out.bandRects = [r1, r0, rects()];
    const bandsOk = r1 >= 6 && r0 <= r1 - 6 && rects() === r1;
    const range = els.flatMap(e => [e, ...e.querySelectorAll("form, label, div")].filter(f => /PM2\.5/.test(f.textContent)).flatMap(f => [...f.querySelectorAll("input[type=range]")]))[0];
    range.value = "35.4"; range.dispatchEvent(new Event("input", { bubbles: true })); await sleep(800);
    const data = byName("data")?._value;
    const md3 = varsOf(aqi).map(v => v._value).filter(x => x instanceof Element).map(x => norm(x.textContent)).find(t => /^data\.pm25:/.test(t));
    out.afterSlider = [data, md3];
    const sliderOk = data?.AQI === 100;
    const btn = els.map(e => e.matches("button") ? e : e.querySelector("button")).find(b => b && /record/i.test(b.textContent));
    btn.click(); await sleep(800);
    const rd = byName("readings")?._value;
    out.readingsAfterClick = Array.isArray(rd) ? rd.length : String(rd);
    const recordOk = Array.isArray(rd) && rd.length === 1 && rd[0].AQI === 100;
    out.controls = { bandsOk, sliderOk, recordOk };
    out.controlsOk = bandsOk && sliderOk && recordOk;
  } catch (e) { out.controlsOk = false; out.controlsError = String(e?.message ?? e); }
  const repText = rep ? texts(rep).join(" | ") : "";
  out.reportText = repText.slice(0, 200);
  out.reportOk = /AQI 68, Moderate/.test(repText);
  out.safe = out.noErrors && out.keptOk && out.displaysOk && out.controlsOk && out.reportOk;
  for (const n of DEAD) out["removed_" + n] = !names.has(n) && out.safe;
  return out;
})()`.replace("DEAD.filter", JSON.stringify(DEAD) + ".filter").replace("for (const n of DEAD)", "for (const n of " + JSON.stringify(DEAD) + ")").replace("KEEP.filter", JSON.stringify(KEEP) + ".filter");

// remove a cell (its function block and its $def line) by pid
const cut = (src, pid) => {
  const start = src.indexOf("const " + pid + " = ");
  if (start < 0) throw new Error("no cell " + pid);
  let end = src.indexOf("\nconst ", start + 1);
  const exp = src.indexOf("\n\nexport default", start);
  if (end < 0 || end > exp) end = exp;
  const line = new RegExp('\\n  \\$def\\("' + pid + '",[^\\n]*');
  return (src.slice(0, start) + src.slice(end + 1)).replace(line, "");
};
const PID = { lerpOld: "_lold1", categories_v1: "_catv1", scratch: "_scr1", bindSimple: "_bsim1",
  chart: "_17n45h8", categoryTable: "_cattab1", aqiCategory: "_aqicat1", test_breakpoints: "_tbp1", "viewof showBands": "_7bands1", readout: "_1tcoky6" };
const without = names => names.reduce((s, n) => cut(s, PID[n]), FIXTURE);
const W = content => ({ tool: "write_file", args: { file_path: "/src/@user/aqi.js", content } });
const NEG = process.env.M20_NEG || "";
const oracle =
  NEG === "unchanged" ? [{ tool: "read_file", args: { file_path: "/src/@user/aqi.js" } }]
  // every named cell no other cell of the module lists as an input
  : NEG === "naive" ? [W(without([...DEAD, "chart", "categoryTable", "aqiCategory", "test_breakpoints"]))]
  : NEG === "viewof" ? [W(without([...DEAD, "viewof showBands"]))]
  // the baseline run's final module: the four dead cells and test_breakpoints gone
  : NEG === "trace" ? [W(without([...DEAD, "test_breakpoints"]))]
  : NEG === "display" ? [W(without([...DEAD, "categoryTable", "readout"]))]
  : NEG === "half" ? [W(without(["lerpOld", "scratch"]))]
  : [{ tool: "read_file", args: { file_path: "/src/@user/aqi.js" } }, W(without(DEAD))];

export default {
  id: "rc5t-tidy-unused-cells",
  category: "rc5-train",
  question: "Tidy up my notebook (@user/aqi): remove the cells that aren't used any more, but don't break anything.",
  setup: { files: { "/src/@user/aqi.js": FIXTURE, "/src/@user/aqi-report.js": REPORT }, init: INIT, collect: COLLECT },
  criteria: [
    ...DEAD.map(n => ({ name: "collected_equals", args: { key: "removed_" + n, equals: true }, weight: 3 })),
    { name: "collected_equals", args: { key: "keptOk", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "displaysOk", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "controlsOk", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "reportOk", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "noErrors", equals: true }, weight: 1 },
  ],
  oracle,
};
