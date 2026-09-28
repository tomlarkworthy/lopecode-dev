// rc5-train eval (20260928-0847-m12): rename a badly named cell everywhere without breaking anything.
// Fixture: @tomlarkworthy/aqi_no_loop_breaking (lopebooks/notebooks/@tomlarkworthy_aqi_no_loop_breaking.html,
// 18 cells, no imports) re-homed as @user/aqi, with its `data` cell renamed to `d` (fixtures/aqi-d.js).
// `viewof d` is read by two anonymous slider cells through the compiled `$0` parameter, `d` by an md
// template and a Plot cell, and `d` is also the arrow parameter in six unrelated closures (`(d) => d.pm25`,
// `(d) => aqi_pm25(d.max)`, `invert = (d) => d`) and a prefix of `d3`: a text-level replace over-renames,
// and renaming only the $def name leaves four dependents reading an undefined `d`.
// setup.init snapshots every output (md texts, the Plot SVG, the two sliders, the converters) before the
// turn; setup.collect checks the rename happened, nothing else changed, and the sliders are still linked.
export const FIXTURE = "const _jclaoh = function _1(md){return(\nmd`# PM2.5 to AQI Conversion\n\nMy home weather station measures PM2.5 concentration in micrograms per cubic meter (μg/m³). But if I’m concerned about air quality, I want to know the Air Quality Index (AQI). AQI is a policy tool and as such has a complicated definition. So, here’s a tool to convert between PM2.5 and AQI (assuming that PM2.5 is the only pollutant you care about).`\n)};\nconst _1bo40ge = function _2(md){return(\nmd`Drag either slider below to choose the selected PM2.5 or AQI.`\n)};\nconst _1tcoky6 = function _3(md,d){return(\nmd`d.pm25: ${d.pm25} d.AQI: ${d.AQI}`\n)};\nconst _6klsgc = function _d(Inputs){return(\nInputs.input({\n  pm25: 50,\n  AQI: 250\n})\n)};\nconst _q0r7f0 = (G, _) => G.input(_);\nconst _1sizgv5 = function _5(bind,Inputs,$0,pm25_aqi){return(\nbind(\n  Inputs.range([0, 500], { label: \"PM2.5 (μg/m³)\", value: 50, step: 0.1 }),\n  $0,\n  {\n    transform: (d) => d.pm25,\n    invert: (pm25) => ({\n      pm25: pm25,\n      AQI: pm25_aqi(pm25)\n    })\n  }\n)\n)};\nconst _rctuwq = function _6(bind,Inputs,$0,aqi_pm25){return(\nbind(Inputs.range([0, 500], { label: \"AQI\", step: 1 }), $0, {\n  transform: (d) => d.AQI,\n  invert: (aqi) => ({\n    pm25: aqi_pm25(aqi),\n    AQI: aqi\n  })\n})\n)};\nconst _17n45h8 = function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,d){return(\nPlot.plot({\n  grid: true,\n  x: {\n    label: \"PM2.5 →\"\n  },\n  y: {\n    label: \"↑ AQI\"\n  },\n  color: {\n    type: \"identity\"\n  },\n  marks: [\n    Plot.rect(categories, {\n      x1: 0,\n      x2: (d) => aqi_pm25(d.max),\n      y1: 0,\n      y2: \"max\",\n      stroke: \"color\",\n      strokeWidth: 3,\n      reverse: true\n    }),\n    Plot.line(d3.range(501), {\n      x: (d) => d,\n      y: pm25_aqi\n    }),\n    Plot.dot([[d.pm25, d.AQI]]),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      stroke: \"white\",\n      strokeWidth: 3,\n      strokeLinejoin: \"round\",\n      dx: 4,\n      dy: 12\n    }),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      dx: 4,\n      dy: 12\n    })\n  ]\n})\n)};\nconst _me7d6m = function _8(md){return(\nmd`The cell below defines the six official [Air Quality Index (AQI) categories](https://www.airnow.gov/aqi/aqi-basics/): “Each category corresponds to a different level of health concern. Each category also has a specific color. The color makes it easy for people to quickly determine whether air quality is reaching unhealthy levels in their communities.”`\n)};\nconst _zn2jku = function _categories(){return(\n[\n  {max: 50, color: \"green\", name: \"Good\"},\n  {max: 100, color: \"yellow\", name: \"Moderate\"},\n  {max: 150, color: \"orange\", name: \"Unhealthy for sensitive groups\"},\n  {max: 200, color: \"red\", name: \"Unhealthy\"},\n  {max: 300, color: \"purple\", name: \"Very unhealthy\"},\n  {max: 500, color: \"maroon\", name: \"Hazardous\"}\n]\n)};\nconst _18c2ed1 = function _10(md){return(\nmd`The \\`pm25_aqi\\` function converts from a PM2.5 concentration in micrograms per cubic meter to the corresponding AQI value (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`aqi_pm25\\`.`\n)};\nconst _1v04v34 = function _pm25_aqi(lerp){return(\nfunction pm25_aqi(pm25) {\n  const c = Math.floor(10 * pm25) / 10;\n  const a = c < 0 ? 0 // values below 0 are considered beyond AQI\n    : c <  12.1 ? lerp(  0,  50,   0.0,  12.0, c)\n    : c <  35.5 ? lerp( 51, 100,  12.1,  35.4, c)\n    : c <  55.5 ? lerp(101, 150,  35.5,  55.4, c)\n    : c < 150.5 ? lerp(151, 200,  55.5, 150.4, c)\n    : c < 250.5 ? lerp(201, 300, 150.5, 250.4, c)\n    : c < 350.5 ? lerp(301, 400, 250.5, 350.4, c)\n    : c < 500.5 ? lerp(401, 500, 350.5, 500.4, c)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.round(a);\n}\n)};\nconst _hkqgrd = function _12(md){return(\nmd`The \\`aqi_pm25\\` function converts from an AQI value to the corresponding PM2.5 concentration in micrograms per cubic meter (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`pm25_aqi\\`.`\n)};\nconst _1tqcgw3 = function _aqi_pm25(lerp){return(\nfunction aqi_pm25(aqi) {\n  const a = Math.round(aqi);\n  const c = a < 0 ? 0 // values below 0 are considered beyond AQI\n    : a <=  50 ? lerp(  0.0,  12.0,   0,  50, a)\n    : a <= 100 ? lerp( 12.1,  35.4,  51, 100, a)\n    : a <= 150 ? lerp( 35.5,  55.4, 101, 150, a)\n    : a <= 200 ? lerp( 55.5, 150.4, 151, 200, a)\n    : a <= 300 ? lerp(150.5, 250.4, 201, 300, a)\n    : a <= 400 ? lerp(250.5, 350.4, 301, 400, a)\n    : a <= 500 ? lerp(350.5, 500.4, 401, 500, a)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.floor(10 * c) / 10;\n}\n)};\nconst _1v4p2ht = function _14(md){return(\nmd`The \\`lerp\\` function is like d3.scaleLinear, redux.`\n)};\nconst _1n6puuj = function _lerp(){return(\nfunction lerp(ylo, yhi, xlo, xhi, x) {\n  return ((x - xlo) / (xhi - xlo)) * (yhi - ylo) + ylo;\n}\n)};\nconst _133w3ev = function _16(md){return(\nmd`The \\`bind\\` function is like [Inputs.bind](https://github.com/observablehq/inputs/blob/main/README.md#bind), except it applies a transform to convert between units, and only propagates on trusted events. This way when the user interacts with the target, it’ll propagate to the source, but the source won’t propagate back to the target. This transform needs to be invertible so that you can drag either range input to affect the other.`\n)};\nconst _1750m2n = function _bind(Inputs,Event){return(\nfunction bind(\n  target,\n  source,\n  {\n    invalidation = Inputs.disposal(target),\n    transform = (d) => d,\n    invert = (d) => d\n  } = {}\n) {\n  const onsource = (event) => {\n    target.value = transform(source.value);\n  };\n  const ontarget = (event) => {\n    source.value = invert(target.value);\n    source.dispatchEvent(new Event(\"input\", { bubbles: true }));\n  };\n  onsource({});\n  target.addEventListener(\"input\", ontarget);\n  source.addEventListener(\"input\", onsource);\n  invalidation.then(() => source.removeEventListener(\"input\", onsource));\n  return target;\n}\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_jclaoh\", null, [\"md\"], _jclaoh);  \n  $def(\"_1bo40ge\", null, [\"md\"], _1bo40ge);  \n  $def(\"_1tcoky6\", null, [\"md\",\"d\"], _1tcoky6);  \n  $def(\"_6klsgc\", \"viewof d\", [\"Inputs\"], _6klsgc);  \n  $def(\"_q0r7f0\", \"d\", [\"Generators\",\"viewof d\"], _q0r7f0);  \n  $def(\"_1sizgv5\", null, [\"bind\",\"Inputs\",\"viewof d\",\"pm25_aqi\"], _1sizgv5);  \n  $def(\"_rctuwq\", null, [\"bind\",\"Inputs\",\"viewof d\",\"aqi_pm25\"], _rctuwq);  \n  $def(\"_17n45h8\", null, [\"Plot\",\"categories\",\"aqi_pm25\",\"d3\",\"pm25_aqi\",\"d\"], _17n45h8);  \n  $def(\"_me7d6m\", null, [\"md\"], _me7d6m);  \n  $def(\"_zn2jku\", \"categories\", [], _zn2jku);  \n  $def(\"_18c2ed1\", null, [\"md\"], _18c2ed1);  \n  $def(\"_1v04v34\", \"pm25_aqi\", [\"lerp\"], _1v04v34);  \n  $def(\"_hkqgrd\", null, [\"md\"], _hkqgrd);  \n  $def(\"_1tqcgw3\", \"aqi_pm25\", [\"lerp\"], _1tqcgw3);  \n  $def(\"_1v4p2ht\", null, [\"md\"], _1v4p2ht);  \n  $def(\"_1n6puuj\", \"lerp\", [], _1n6puuj);  \n  $def(\"_133w3ev\", null, [\"md\"], _133w3ev);  \n  $def(\"_1750m2n\", \"bind\", [\"Inputs\",\"Event\"], _1750m2n);\n  return main;\n}\n";
const ID = "@user/aqi";

// reference rename d -> reading: the cell, its viewof, every dependent's deps list and outer parameter
const REPS = [
  ["function _3(md,d){return(\nmd`d.pm25: ${d.pm25} d.AQI: ${d.AQI}`", "function _3(md,reading){return(\nmd`reading.pm25: ${reading.pm25} reading.AQI: ${reading.AQI}`"],
  ["function _d(Inputs)", "function _reading(Inputs)"],
  ["function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,d)", "function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,reading)"],
  ["Plot.dot([[d.pm25, d.AQI]])", "Plot.dot([[reading.pm25, reading.AQI]])"],
  ['["md","d"]', '["md","reading"]'],
  ['"viewof d", ["Inputs"]', '"viewof reading", ["Inputs"]'],
  ['"d", ["Generators","viewof d"]', '"reading", ["Generators","viewof reading"]'],
  ['"viewof d","pm25_aqi"]', '"viewof reading","pm25_aqi"]'],
  ['"viewof d","aqi_pm25"]', '"viewof reading","aqi_pm25"]'],
  ['"pm25_aqi","d"]', '"pm25_aqi","reading"]'],
];
export let RENAMED = FIXTURE;
for (const [a, b] of REPS) {
  if (RENAMED.split(a).length !== 2) throw new Error("aqi-rename eval: oracle edit did not match once: " + a);
  RENAMED = RENAMED.replace(a, b);
}

// shared page-side helpers: observe every variable of @user/aqi, fingerprint what each cell shows
const HELPERS = String.raw`
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const mod = rt.mains.get(${JSON.stringify(ID)});
  const keepers = new Set();
  const vars = () => [...rt._variables].filter(v => v._module === mod && !keepers.has(v) && !(v._name && (String(v._name).startsWith("module ") || v._name === "@variable")));
  const observeAll = () => { const ks = []; for (const v of vars()) if (v._name) { try { const k = mod.variable(true).define([v._name], x => x); keepers.add(k); ks.push(k); } catch {} } return ks; };
  const norm = s => String(s).replace(/\bplot-[0-9a-z-]+/g, "plot-X").replace(/\b(id|for|name)="[^"]*"/g, "$1=\"\"").replace(/\b[A-Za-z_$][\w$]*\.(pm25|AQI)\b/g, "X.$1").replace(/\s+/g, " ");
  const isRange = e => e instanceof Element && (e.matches("input[type=range]") || e.querySelector("input[type=range]"));
  const sliders = () => vars().map(v => v._value).filter(isRange);
  const slider = re => sliders().find(e => re.test(e.textContent));
  const rangeOf = e => e.matches("input[type=range]") ? e : e.querySelector("input[type=range]");
  const svgOf = () => vars().map(v => v._value).find(x => x instanceof Element && (x.matches("svg,figure") || x.querySelector("svg")) && !isRange(x));
  const fns = () => { const m = new Map(vars().filter(v => v._name).map(v => [v._name, v._value])); return m; };
  const shot = () => {
    const f = fns();
    const md = vars().map(v => v._value).filter(x => x instanceof Element && !isRange(x) && !(x.matches("svg,figure") || x.querySelector("svg")))
      .map(e => norm(e.textContent)).sort();
    const svg = svgOf();
    const p = slider(/PM2\.5/), a = slider(/AQI/);
    let conv = null;
    try { conv = [f.get("pm25_aqi")(35.4), f.get("pm25_aqi")(12), f.get("aqi_pm25")(100), f.get("aqi_pm25")(250), f.get("lerp")(0, 10, 0, 1, 0.5)].join(","); } catch (e) { conv = "error " + e.message; }
    return { md, svg: svg ? norm(svg.outerHTML) : null, pm: p && +rangeOf(p).value, aqi: a && +rangeOf(a).value,
      categories: JSON.stringify(f.get("categories")), conv };
  };
`;

const INIT = String.raw`(async () => {
  ${HELPERS}
  const ks = observeAll();
  await sleep(2500);
  globalThis.__rc5tAqiBefore = { shot: shot(), names: vars().map(v => v._name).filter(Boolean),
    closureParams: vars().map(v => (String(v._definition).match(/\(d\)\s*=>/g) || []).length).reduce((a, b) => a + b, 0) };
  for (const k of ks) { try { k.delete(); } catch {} }
  return globalThis.__rc5tAqiBefore;
})()`;

const COLLECT = String.raw`(async () => {
  ${HELPERS}
  const before = globalThis.__rc5tAqiBefore;
  const out = {};
  if (!mod) return { error: "no " + ${JSON.stringify(ID)} };
  const ks = observeAll();
  try {
    await sleep(2500);
    const names = vars().map(v => v._name).filter(Boolean);
    out.names = names;
    out.before = { md: before.shot.md, pm: before.shot.pm, aqi: before.shot.aqi, conv: before.shot.conv, svgLen: before.shot.svg && before.shot.svg.length, closureParams: before.closureParams };
    // 1. the old name is gone
    out.oldGone = !names.includes("d") && !names.includes("viewof d") && !vars().some(v => (v._inputs || []).some(i => i && i._name === "d" || i && i._name === "viewof d"));
    // 2. one new name holds the {pm25, AQI} value, with its viewof, and every former dependent reads it
    const cands = names.filter(n => !n.startsWith("viewof ") && names.includes("viewof " + n) && n !== "d")
      .filter(n => { const v = vars().find(x => x._name === n); return v && v._value && typeof v._value === "object" && "pm25" in v._value && "AQI" in v._value; });
    out.newName = cands[0] || null;
    if (out.newName) {
      const nv = vars().find(x => x._name === out.newName), vv = vars().find(x => x._name === "viewof " + out.newName);
      const readers = vars().filter(v => (v._inputs || []).includes(nv));
      const vreaders = vars().filter(v => (v._inputs || []).includes(vv));
      out.readers = readers.map(v => v._name || "(anon)");
      out.viewReaders = vreaders.map(v => v._name || "(anon)");
      // md label + plot read the value; the value cell + two sliders read the viewof
      out.dependentsOk = readers.length >= 2 && vreaders.length >= 3 && sliders().length === 2 &&
        vreaders.filter(v => isRange(v._value)).length === 2 && readers.some(v => v._value instanceof Element && (v._value.querySelector?.("svg") || v._value.matches?.("svg,figure")));
    } else out.dependentsOk = false;
    // 3. every output unchanged, no other name lost
    const now = shot();
    const diffs = Object.keys(before.shot).filter(k => JSON.stringify(before.shot[k]) !== JSON.stringify(now[k]));
    out.changedOutputs = diffs;
    out.diffDetail = diffs.map(k => k + ": " + String(JSON.stringify(before.shot[k])).slice(0, 160) + " -> " + String(JSON.stringify(now[k])).slice(0, 160));
    out.outputsUnchanged = diffs.length === 0;
    const lost = before.names.filter(n => n !== "d" && n !== "viewof d" && !names.includes(n));
    out.lostNames = lost;
    out.noOtherNameLost = lost.length === 0;
    // the six unrelated closures keep their own parameter: (d) => d.pm25, (d) => aqi_pm25(d.max), (d) => d …
    out.closureParams = vars().map(v => (String(v._definition).match(/\(d\)\s*=>/g) || []).length).reduce((a, b) => a + b, 0);
    out.closuresUntouched = out.closureParams === before.closureParams;
    // 4. the sliders still drive each other through the renamed cell
    const p = slider(/PM2\.5/), a = slider(/AQI/);
    if (!p || !a || !out.newName) out.linked = false;
    else {
      const pr = rangeOf(p); pr.value = "35.4"; pr.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(1000);
      const val = vars().find(x => x._name === out.newName)._value;
      out.afterDrag = { value: val, aqiSlider: +rangeOf(a).value };
      out.linked = !!val && val.pm25 === 35.4 && val.AQI === 100 && +rangeOf(a).value === 100;
    }
    return out;
  } finally {
    for (const k of ks) { try { k.delete(); } catch {} }
  }
})()`;

export default {
  id: "rc5t-rename-cell",
  category: "rc5-train",
  question: "Rename the cell `d` to something meaningful everywhere in my notebook (@user/aqi) without breaking anything.",
  setup: { files: { ["/src/" + ID + ".js"]: FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "oldGone", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "dependentsOk", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "outputsUnchanged", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "noOtherNameLost", equals: true }, weight: 1 },
    // over-replacement: a text-level d -> x also renames the closures' own `d` parameter
    { name: "collected_equals", args: { key: "closuresUntouched", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "linked", equals: true }, weight: 2 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/" + ID + ".js", content: RENAMED } },
  ],
};
