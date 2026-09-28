// rc5-train eval (20260928-0847-m26): make an existing notebook handle bad input.
// setup.files seeds @user/aqi: the real @tomlarkworthy/aqi_no_loop_breaking (lopebooks,
// @tomlarkworthy_aqi_no_loop_breaking.html, PM2.5 <-> AQI conversion + Plot chart), with the user's edit: the two bound
// sliders became a text box for a PM2.5 reading (`data = {pm25: parseFloat(reading), AQI: pm25_aqi(...)}`) and a number
// box for an AQI to convert back. Unchanged, an empty or non-numeric reading shows "data.pm25: NaN data.AQI: 500"
// (pm25_aqi(NaN) falls through every comparison to 500, "Hazardous") and the dot drops off the chart; a negative
// reading shows "data.pm25: -5" with AQI 0; a negative AQI shows "An AQI of -5 corresponds to 0 μg/m³".
// setup.collect types each bad value into each box the way a user does (set .value, dispatch "input"), then checks the
// module's whole rendered output (text, svg attributes, and the values of non-element cells one level deep):
//   clean    no NaN / Infinity / "undefined" / [object …] for any value, good or bad; no cell rejected at any stage
//   message  empty, text and negative PM2.5, and negative AQI, each show a message naming the problem that is not
//            there for a good value
//   goodSame 0, 7.3, 12.5, 50, 250.4 μg/m³ show AQI 0, 30, 52, 137, 300 and AQI 0, 42, 77, 150 show 0, 10, 24.4,
//            55.4 μg/m³ (the original functions), with no warning text and the chart's dot drawn
// Negative controls (oracle replays): unchanged, try/catch that renders nothing, validation that rejects 0 and decimals.
const BUGGY = "const _jclaoh = function _1(md){return(\nmd`# PM2.5 to AQI Conversion\n\nMy home weather station measures PM2.5 concentration in micrograms per cubic meter (μg/m³). But if I’m concerned about air quality, I want to know the Air Quality Index (AQI). AQI is a policy tool and as such has a complicated definition. So, here’s a tool to convert between PM2.5 and AQI (assuming that PM2.5 is the only pollutant you care about).`\n)};\nconst _1bo40ge = function _2(md){return(\nmd`Type a PM2.5 reading from the weather station, or an AQI to convert back to PM2.5.`\n)};\nconst _1tcoky6 = function _3(md,data){return(\nmd`data.pm25: ${data.pm25} data.AQI: ${data.AQI}`\n)};\nconst _6klsgc = function _reading(Inputs){return(\nInputs.text({ label: \"PM2.5 (μg/m³)\", value: \"50\" })\n)};\nconst _q0r7f0 = (G, _) => G.input(_);\nconst _k2data = function _data(reading,pm25_aqi){return(\n{ pm25: parseFloat(reading), AQI: pm25_aqi(parseFloat(reading)) }\n)};\nconst _rctuwq = function _aqi(Inputs){return(\nInputs.number({ label: \"AQI\", value: 100, step: 1 })\n)};\nconst _k2aqiv = (G, _) => G.input(_);\nconst _k2back = function _back(md,aqi,aqi_pm25){return(\nmd`An AQI of ${aqi} corresponds to ${aqi_pm25(aqi)} μg/m³ of PM2.5.`\n)};\nconst _17n45h8 = function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,data){return(\nPlot.plot({\n  grid: true,\n  x: {\n    label: \"PM2.5 →\"\n  },\n  y: {\n    label: \"↑ AQI\"\n  },\n  color: {\n    type: \"identity\"\n  },\n  marks: [\n    Plot.rect(categories, {\n      x1: 0,\n      x2: (d) => aqi_pm25(d.max),\n      y1: 0,\n      y2: \"max\",\n      stroke: \"color\",\n      strokeWidth: 3,\n      reverse: true\n    }),\n    Plot.line(d3.range(501), {\n      x: (d) => d,\n      y: pm25_aqi\n    }),\n    Plot.dot([[data.pm25, data.AQI]]),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      stroke: \"white\",\n      strokeWidth: 3,\n      strokeLinejoin: \"round\",\n      dx: 4,\n      dy: 12\n    }),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      dx: 4,\n      dy: 12\n    })\n  ]\n})\n)};\nconst _me7d6m = function _8(md){return(\nmd`The cell below defines the six official [Air Quality Index (AQI) categories](https://www.airnow.gov/aqi/aqi-basics/): “Each category corresponds to a different level of health concern. Each category also has a specific color. The color makes it easy for people to quickly determine whether air quality is reaching unhealthy levels in their communities.”`\n)};\nconst _zn2jku = function _categories(){return(\n[\n  {max: 50, color: \"green\", name: \"Good\"},\n  {max: 100, color: \"yellow\", name: \"Moderate\"},\n  {max: 150, color: \"orange\", name: \"Unhealthy for sensitive groups\"},\n  {max: 200, color: \"red\", name: \"Unhealthy\"},\n  {max: 300, color: \"purple\", name: \"Very unhealthy\"},\n  {max: 500, color: \"maroon\", name: \"Hazardous\"}\n]\n)};\nconst _18c2ed1 = function _10(md){return(\nmd`The \\`pm25_aqi\\` function converts from a PM2.5 concentration in micrograms per cubic meter to the corresponding AQI value (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`aqi_pm25\\`.`\n)};\nconst _1v04v34 = function _pm25_aqi(lerp){return(\nfunction pm25_aqi(pm25) {\n  const c = Math.floor(10 * pm25) / 10;\n  const a = c < 0 ? 0 // values below 0 are considered beyond AQI\n    : c <  12.1 ? lerp(  0,  50,   0.0,  12.0, c)\n    : c <  35.5 ? lerp( 51, 100,  12.1,  35.4, c)\n    : c <  55.5 ? lerp(101, 150,  35.5,  55.4, c)\n    : c < 150.5 ? lerp(151, 200,  55.5, 150.4, c)\n    : c < 250.5 ? lerp(201, 300, 150.5, 250.4, c)\n    : c < 350.5 ? lerp(301, 400, 250.5, 350.4, c)\n    : c < 500.5 ? lerp(401, 500, 350.5, 500.4, c)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.round(a);\n}\n)};\nconst _hkqgrd = function _12(md){return(\nmd`The \\`aqi_pm25\\` function converts from an AQI value to the corresponding PM2.5 concentration in micrograms per cubic meter (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`pm25_aqi\\`.`\n)};\nconst _1tqcgw3 = function _aqi_pm25(lerp){return(\nfunction aqi_pm25(aqi) {\n  const a = Math.round(aqi);\n  const c = a < 0 ? 0 // values below 0 are considered beyond AQI\n    : a <=  50 ? lerp(  0.0,  12.0,   0,  50, a)\n    : a <= 100 ? lerp( 12.1,  35.4,  51, 100, a)\n    : a <= 150 ? lerp( 35.5,  55.4, 101, 150, a)\n    : a <= 200 ? lerp( 55.5, 150.4, 151, 200, a)\n    : a <= 300 ? lerp(150.5, 250.4, 201, 300, a)\n    : a <= 400 ? lerp(250.5, 350.4, 301, 400, a)\n    : a <= 500 ? lerp(350.5, 500.4, 401, 500, a)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.floor(10 * c) / 10;\n}\n)};\nconst _1v4p2ht = function _14(md){return(\nmd`The \\`lerp\\` function is like d3.scaleLinear, redux.`\n)};\nconst _1n6puuj = function _lerp(){return(\nfunction lerp(ylo, yhi, xlo, xhi, x) {\n  return ((x - xlo) / (xhi - xlo)) * (yhi - ylo) + ylo;\n}\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_jclaoh\", null, [\"md\"], _jclaoh);  \n  $def(\"_1bo40ge\", null, [\"md\"], _1bo40ge);  \n  $def(\"_1tcoky6\", null, [\"md\",\"data\"], _1tcoky6);  \n  $def(\"_6klsgc\", \"viewof reading\", [\"Inputs\"], _6klsgc);\n  $def(\"_q0r7f0\", \"reading\", [\"Generators\",\"viewof reading\"], _q0r7f0);\n  $def(\"_k2data\", \"data\", [\"reading\",\"pm25_aqi\"], _k2data);\n  $def(\"_rctuwq\", \"viewof aqi\", [\"Inputs\"], _rctuwq);\n  $def(\"_k2aqiv\", \"aqi\", [\"Generators\",\"viewof aqi\"], _k2aqiv);\n  $def(\"_k2back\", null, [\"md\",\"aqi\",\"aqi_pm25\"], _k2back);\n  $def(\"_17n45h8\", null, [\"Plot\",\"categories\",\"aqi_pm25\",\"d3\",\"pm25_aqi\",\"data\"], _17n45h8);  \n  $def(\"_me7d6m\", null, [\"md\"], _me7d6m);  \n  $def(\"_zn2jku\", \"categories\", [], _zn2jku);  \n  $def(\"_18c2ed1\", null, [\"md\"], _18c2ed1);  \n  $def(\"_1v04v34\", \"pm25_aqi\", [\"lerp\"], _1v04v34);  \n  $def(\"_hkqgrd\", null, [\"md\"], _hkqgrd);  \n  $def(\"_1tqcgw3\", \"aqi_pm25\", [\"lerp\"], _1tqcgw3);  \n  $def(\"_1v4p2ht\", null, [\"md\"], _1v4p2ht);  \n  $def(\"_1n6puuj\", \"lerp\", [], _1n6puuj);  \n  return main;\n}\n";
const FIXED = "const _jclaoh = function _1(md){return(\nmd`# PM2.5 to AQI Conversion\n\nMy home weather station measures PM2.5 concentration in micrograms per cubic meter (μg/m³). But if I’m concerned about air quality, I want to know the Air Quality Index (AQI). AQI is a policy tool and as such has a complicated definition. So, here’s a tool to convert between PM2.5 and AQI (assuming that PM2.5 is the only pollutant you care about).`\n)};\nconst _1bo40ge = function _2(md){return(\nmd`Type a PM2.5 reading from the weather station, or an AQI to convert back to PM2.5.`\n)};\nconst _1tcoky6 = function _3(md,data){return(\ndata.error ? md`**${data.error}**` : md`data.pm25: ${data.pm25} data.AQI: ${data.AQI}`\n)};\nconst _6klsgc = function _reading(Inputs){return(\nInputs.text({ label: \"PM2.5 (μg/m³)\", value: \"50\" })\n)};\nconst _q0r7f0 = (G, _) => G.input(_);\nconst _k2data = function _data(reading,pm25_aqi){return(\n(() => {\n  const text = reading.trim();\n  const pm25 = Number(text);\n  if (text === \"\") return { error: \"Enter a PM2.5 reading, for example 12.5.\" };\n  if (!Number.isFinite(pm25)) return { error: `\"${text}\" is not a number. Enter a PM2.5 reading, for example 12.5.` };\n  if (pm25 < 0) return { error: \"PM2.5 cannot be negative.\" };\n  return { pm25, AQI: pm25_aqi(pm25) };\n})()\n)};\nconst _rctuwq = function _aqi(Inputs){return(\nInputs.number({ label: \"AQI\", value: 100, step: 1 })\n)};\nconst _k2aqiv = (G, _) => G.input(_);\nconst _k2back = function _back(md,aqi,aqi_pm25){return(\naqi < 0 ? md`**An AQI cannot be negative.** The scale runs from 0 to 500.` : md`An AQI of ${aqi} corresponds to ${aqi_pm25(aqi)} μg/m³ of PM2.5.`\n)};\nconst _17n45h8 = function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,data){return(\nPlot.plot({\n  grid: true,\n  x: {\n    label: \"PM2.5 →\"\n  },\n  y: {\n    label: \"↑ AQI\"\n  },\n  color: {\n    type: \"identity\"\n  },\n  marks: [\n    Plot.rect(categories, {\n      x1: 0,\n      x2: (d) => aqi_pm25(d.max),\n      y1: 0,\n      y2: \"max\",\n      stroke: \"color\",\n      strokeWidth: 3,\n      reverse: true\n    }),\n    Plot.line(d3.range(501), {\n      x: (d) => d,\n      y: pm25_aqi\n    }),\n    Plot.dot(data.error ? [] : [[data.pm25, data.AQI]]),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      stroke: \"white\",\n      strokeWidth: 3,\n      strokeLinejoin: \"round\",\n      dx: 4,\n      dy: 12\n    }),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      dx: 4,\n      dy: 12\n    })\n  ]\n})\n)};\nconst _me7d6m = function _8(md){return(\nmd`The cell below defines the six official [Air Quality Index (AQI) categories](https://www.airnow.gov/aqi/aqi-basics/): “Each category corresponds to a different level of health concern. Each category also has a specific color. The color makes it easy for people to quickly determine whether air quality is reaching unhealthy levels in their communities.”`\n)};\nconst _zn2jku = function _categories(){return(\n[\n  {max: 50, color: \"green\", name: \"Good\"},\n  {max: 100, color: \"yellow\", name: \"Moderate\"},\n  {max: 150, color: \"orange\", name: \"Unhealthy for sensitive groups\"},\n  {max: 200, color: \"red\", name: \"Unhealthy\"},\n  {max: 300, color: \"purple\", name: \"Very unhealthy\"},\n  {max: 500, color: \"maroon\", name: \"Hazardous\"}\n]\n)};\nconst _18c2ed1 = function _10(md){return(\nmd`The \\`pm25_aqi\\` function converts from a PM2.5 concentration in micrograms per cubic meter to the corresponding AQI value (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`aqi_pm25\\`.`\n)};\nconst _1v04v34 = function _pm25_aqi(lerp){return(\nfunction pm25_aqi(pm25) {\n  const c = Math.floor(10 * pm25) / 10;\n  const a = c < 0 ? 0 // values below 0 are considered beyond AQI\n    : c <  12.1 ? lerp(  0,  50,   0.0,  12.0, c)\n    : c <  35.5 ? lerp( 51, 100,  12.1,  35.4, c)\n    : c <  55.5 ? lerp(101, 150,  35.5,  55.4, c)\n    : c < 150.5 ? lerp(151, 200,  55.5, 150.4, c)\n    : c < 250.5 ? lerp(201, 300, 150.5, 250.4, c)\n    : c < 350.5 ? lerp(301, 400, 250.5, 350.4, c)\n    : c < 500.5 ? lerp(401, 500, 350.5, 500.4, c)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.round(a);\n}\n)};\nconst _hkqgrd = function _12(md){return(\nmd`The \\`aqi_pm25\\` function converts from an AQI value to the corresponding PM2.5 concentration in micrograms per cubic meter (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`pm25_aqi\\`.`\n)};\nconst _1tqcgw3 = function _aqi_pm25(lerp){return(\nfunction aqi_pm25(aqi) {\n  const a = Math.round(aqi);\n  const c = a < 0 ? 0 // values below 0 are considered beyond AQI\n    : a <=  50 ? lerp(  0.0,  12.0,   0,  50, a)\n    : a <= 100 ? lerp( 12.1,  35.4,  51, 100, a)\n    : a <= 150 ? lerp( 35.5,  55.4, 101, 150, a)\n    : a <= 200 ? lerp( 55.5, 150.4, 151, 200, a)\n    : a <= 300 ? lerp(150.5, 250.4, 201, 300, a)\n    : a <= 400 ? lerp(250.5, 350.4, 301, 400, a)\n    : a <= 500 ? lerp(350.5, 500.4, 401, 500, a)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.floor(10 * c) / 10;\n}\n)};\nconst _1v4p2ht = function _14(md){return(\nmd`The \\`lerp\\` function is like d3.scaleLinear, redux.`\n)};\nconst _1n6puuj = function _lerp(){return(\nfunction lerp(ylo, yhi, xlo, xhi, x) {\n  return ((x - xlo) / (xhi - xlo)) * (yhi - ylo) + ylo;\n}\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_jclaoh\", null, [\"md\"], _jclaoh);  \n  $def(\"_1bo40ge\", null, [\"md\"], _1bo40ge);  \n  $def(\"_1tcoky6\", null, [\"md\",\"data\"], _1tcoky6);  \n  $def(\"_6klsgc\", \"viewof reading\", [\"Inputs\"], _6klsgc);\n  $def(\"_q0r7f0\", \"reading\", [\"Generators\",\"viewof reading\"], _q0r7f0);\n  $def(\"_k2data\", \"data\", [\"reading\",\"pm25_aqi\"], _k2data);\n  $def(\"_rctuwq\", \"viewof aqi\", [\"Inputs\"], _rctuwq);\n  $def(\"_k2aqiv\", \"aqi\", [\"Generators\",\"viewof aqi\"], _k2aqiv);\n  $def(\"_k2back\", null, [\"md\",\"aqi\",\"aqi_pm25\"], _k2back);\n  $def(\"_17n45h8\", null, [\"Plot\",\"categories\",\"aqi_pm25\",\"d3\",\"pm25_aqi\",\"data\"], _17n45h8);  \n  $def(\"_me7d6m\", null, [\"md\"], _me7d6m);  \n  $def(\"_zn2jku\", \"categories\", [], _zn2jku);  \n  $def(\"_18c2ed1\", null, [\"md\"], _18c2ed1);  \n  $def(\"_1v04v34\", \"pm25_aqi\", [\"lerp\"], _1v04v34);  \n  $def(\"_hkqgrd\", null, [\"md\"], _hkqgrd);  \n  $def(\"_1tqcgw3\", \"aqi_pm25\", [\"lerp\"], _1tqcgw3);  \n  $def(\"_1v4p2ht\", null, [\"md\"], _1v4p2ht);  \n  $def(\"_1n6puuj\", \"lerp\", [], _1n6puuj);  \n  return main;\n}\n";

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/aqi")); })()`;

const COLLECT = String.raw`(async () => {
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__rc5tBaseMods || new Set();
  const mods = [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m);
  const all = () => [...rt._variables].filter(v => mods.includes(v._module) && v._type === 1 &&
    !String(v._name || "").startsWith("module ") && v._name !== "@variable");
  const out = { modules: [...rt.mains.keys()].filter(k => !base.has(k)) };
  if (!all().length) return { ...out, error: "no @user/aqi or new module" };
  const saved = new Map();
  for (const v of all()) { if (!v._observer || !v._observer.fulfilled) { saved.set(v, v._observer); v._observer = { fulfilled() {}, rejected() {}, pending() {} }; } }
  for (const v of all()) { try { rt._dirty.add(v); } catch {} }
  try { rt._computeSoon(); } catch {}
  await sleep(2000);
  const BAD = /\bNaN\b|Infinity|\bundefined\b|\[object /;
  const MSG = /please|enter\b|must\b|invalid|not a (valid )?number|n[o']t a number|isn.t a number|negative|empty|blank|missing|positive|can(no|')t be|below zero|less than (0|zero)|out of range|no reading/i;
  const errsOf = async () => {
    const vs = all();
    const e = await Promise.all(vs.map(v => Promise.race([Promise.resolve(v._promise).then(() => null, e => e), sleep(300).then(() => null)])));
    return vs.map((v, i) => e[i] ? (v._name || "anon#" + v.pid) + ": " + (e[i].message || e[i]) : null).filter(Boolean);
  };
  const els = () => all().map(v => v._value).filter(x => x instanceof Element);
  const render = () => {
    const html = [], text = [], vals = [];
    for (const e of els()) {
      const c = e.cloneNode(true);
      c.querySelectorAll("svg").forEach(s => { html.push(s.textContent); s.remove(); });
      if (c.matches && c.matches("svg")) html.push(c.textContent); else text.push(c.textContent);
      for (const n of (e.matches("svg") ? [e, ...e.querySelectorAll("*")] : e.querySelectorAll("svg, svg *")))
        for (const a of n.attributes || []) html.push(a.value);
    }
    for (const v of all()) {
      const x = v._value;
      if (x instanceof Element || typeof x === "function" || x == null) continue;
      if (typeof x === "number" || typeof x === "string") vals.push(String(x));
      else if (typeof x === "object" && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype)
        for (const y of Object.values(x)) if (typeof y !== "function" && !(y instanceof Element)) vals.push(String(y));
    }
    return { text: text.join(" | ").replace(/\s+/g, " "), svg: html.join(" "), vals: vals.join(" | ") };
  };
  const boxes = () => els().flatMap(e => [...(e.matches("input,textarea") ? [e] : []), ...e.querySelectorAll("input, textarea")])
    .filter(i => i.tagName === "TEXTAREA" || /^(text|number|search|)$/.test(i.getAttribute("type") || ""));
  const labelOf = i => ((i.closest("form") || i.parentElement || i).textContent + " " + (i.placeholder || "") + " " + (i.name || "") + " " + (i.getAttribute("aria-label") || "")).replace(/\s+/g, " ");
  const find = re => boxes().find(i => re.test(labelOf(i)));
  const pmBox = () => find(/pm\s*2\.?5|μg/i);
  const aqiBox = () => boxes().find(i => /aqi/i.test(labelOf(i)) && !/pm\s*2\.?5|μg/i.test(labelOf(i)));
  const set = async (get, value) => {
    const i = get(); if (!i) return false;
    i.value = value; i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(700); return true;
  };
  out.boxes = boxes().map(i => (i.getAttribute("type") || i.tagName) + ":" + labelOf(i).slice(0, 40));
  if (!pmBox() || !aqiBox()) { out.error = "could not find the PM2.5 and AQI boxes"; }
  try {
    const stages = [];
    const clean = [], message = [], good = [], errors = new Set();
    const check = async (label) => {
      const r = render(), errs = await errsOf();
      errs.forEach(e => errors.add(label + " -> " + e));
      const bad = BAD.exec(r.text + " || " + r.svg + " || " + r.vals);
      return { r, errs, bad: bad ? bad[0] + " near «" + (r.text + " || " + r.svg + " || " + r.vals).slice(Math.max(0, bad.index - 40), bad.index + 20) + "»" : null };
    };
    const hasDot = () => els().some(e => [...(e.matches("svg") ? [e] : e.querySelectorAll("svg"))].some(s => s.querySelector("circle")));
    const PM_GOOD = [["0", "0"], ["7.3", "30"], ["12.5", "52"], ["50", "137"], ["250.4", "300"]];
    const AQI_GOOD = [["0", "0"], ["42", "10"], ["77", "24.4"], ["150", "55.4"]];
    // numerically equal: "10" also matches "10.0" (a formatting change is not a wrong value)
    const tok = (t, n) => new RegExp("(^|[^0-9.])" + n.replace(".", "\\.") + (n.includes(".") ? "0*" : "(\\.0+)?") + "(?![0-9]|\\.[0-9])").test(t);
    for (const [box, name, goods, reset] of [[pmBox, "pm25", PM_GOOD, "50"], [aqiBox, "aqi", AQI_GOOD, "100"]]) {
      for (const [v, expect] of goods) {
        if (!(await set(box, v))) { good.push(name + "=" + v + ": no box"); continue; }
        const c = await check(name + "=" + v);
        const why = [];
        if (!tok(c.r.text, expect)) why.push("expected " + expect + " not shown");
        if (MSG.test(c.r.text)) why.push("warning text: " + (MSG.exec(c.r.text) || [""])[0]);
        if (c.bad) why.push("bad value " + c.bad);
        if (c.errs.length) why.push("error " + c.errs[0]);
        if (name === "pm25" && !hasDot()) why.push("no dot on the chart");
        if (why.length) good.push(name + "=" + v + ": " + why.join("; "));
        stages.push(name + "=" + v + " " + (why.length ? "FAIL" : "ok"));
      }
      const bads = name === "pm25"
        ? [["", true], ["-5", true], ["abc", true], ["1e6", false], ["99999999999", false]]
        : [["-5", true], ["", false], ["1e6", false]];
      for (const [v, needMsg] of bads) {
        await set(box, reset);
        const before = render().text, seen = new Set(before.split(" | "));
        await set(box, v);
        const c = await check(name + "=" + JSON.stringify(v));
        if (c.bad) clean.push(name + "=" + JSON.stringify(v) + ": " + c.bad);
        if (c.errs.length) clean.push(name + "=" + JSON.stringify(v) + ": error " + c.errs[0]);
        if (needMsg && !(MSG.test(c.r.text) && !MSG.test(before))) message.push(name + "=" + JSON.stringify(v) + ": no message; shows «" + (c.r.text.split(" | ").filter(x => !seen.has(x)).join(" | ") || "(same text as for " + reset + ")").slice(0, 200) + "»");
        stages.push(name + "=" + JSON.stringify(v) + " -> " + (c.r.text.split(" | ").filter(x => !seen.has(x)).join(" | ") || "(same text as for " + reset + ")").slice(0, 200));
      }
      await set(box, reset);
    }
    out.stages = stages;
    out.cleanProblems = clean; out.messageProblems = message; out.goodProblems = good; out.errorsSeen = [...errors];
    out.clean = !out.error && clean.length === 0;
    out.message = !out.error && message.length === 0;
    out.goodSame = !out.error && good.length === 0;
    out.noErrors = !out.error && errors.size === 0;
    out.allOk = out.clean && out.message && out.goodSame && out.noErrors;
    return out;
  } finally {
    for (const [v, o] of saved) { try { v._observer = o; } catch {} }
  }
})()`;

export default {
  id: "rc5t-bad-input",
  category: "rc5-train",
  question: "If I type something odd into my notebook's inputs, like a negative number or leave a box empty, it shows NaN or breaks. Make it handle bad input sensibly.",
  setup: { files: { "/src/@user/aqi.js": BUGGY }, init: INIT, collect: COLLECT },
  criteria: [
    // every part at once; a partial fix (clamp without message, silent blank, over-validation) scores at most 3/8
    { name: "collected_equals", args: { key: "allOk", equals: true }, weight: 4 },
    { name: "collected_equals", args: { key: "clean", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "message", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "goodSame", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "noErrors", equals: true }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/aqi.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/aqi.js", content: FIXED } },
  ],
};
