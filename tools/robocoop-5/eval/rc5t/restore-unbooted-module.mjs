// rc5-train eval (20260928-0847-m39, from m32's rc5t-reopen-shows-module with the worker GOAL as the question): a maintenance goal. The user's module is in the file but the
// file does not open it: bootconf.json mains and the saved layout hash (#view=…) do not name it.
// setup.init appends the module's block to the document, as a file saved by an earlier session that
// never booted it would carry it. The fixture is @tomlarkworthy/aqi_no_loop_breaking
// (lopebooks/notebooks/@tomlarkworthy_aqi_no_loop_breaking.html) unmodified, the same text as
// rc5t-extract-helpers' FIXTURE; offline (md, two bound range inputs, a Plot chart).
//
// setup.collect saves the page as save-in-place does (exportToHTML with the live mains and the
// cleaned location.hash), then reopens the saved file in a srcdoc frame with no hash of its own, no
// network and its own IndexedDB. Keys:
//   booted  — the reopened runtime has @user/aqi in mains
//   shown   — a lopepage-2 pane for @user/aqi is laid out on screen and shows the title, prose,
//             readout, both sliders, the chart and the category labels
//   content — the saved @user/aqi block defines the fixture's cells (name, inputs, body)
//   chat    — the robocoop-5 chat is still in the reopened layout
//   errors  — no error in the pane or in a reachable variable of @user/aqi
// Negative controls (M32_NEG=unchanged|mained|copy|tabbed with --oracle) must score low; "mained" (booted,
// in mains, not in the layout) fails `shown`: the user's complaint is that the page does not show it.
const FIXTURE = "const _jclaoh = function _1(md){return(\nmd`# PM2.5 to AQI Conversion\n\nMy home weather station measures PM2.5 concentration in micrograms per cubic meter (μg/m³). But if I’m concerned about air quality, I want to know the Air Quality Index (AQI). AQI is a policy tool and as such has a complicated definition. So, here’s a tool to convert between PM2.5 and AQI (assuming that PM2.5 is the only pollutant you care about).`\n)};\nconst _1bo40ge = function _2(md){return(\nmd`Drag either slider below to choose the selected PM2.5 or AQI.`\n)};\nconst _1tcoky6 = function _3(md,data){return(\nmd`data.pm25: ${data.pm25} data.AQI: ${data.AQI}`\n)};\nconst _6klsgc = function _data(Inputs){return(\nInputs.input({\n  pm25: 50,\n  AQI: 250\n})\n)};\nconst _q0r7f0 = (G, _) => G.input(_);\nconst _1sizgv5 = function _5(bind,Inputs,$0,pm25_aqi){return(\nbind(\n  Inputs.range([0, 500], { label: \"PM2.5 (μg/m³)\", value: 50, step: 0.1 }),\n  $0,\n  {\n    transform: (d) => d.pm25,\n    invert: (pm25) => ({\n      pm25: pm25,\n      AQI: pm25_aqi(pm25)\n    })\n  }\n)\n)};\nconst _rctuwq = function _6(bind,Inputs,$0,aqi_pm25){return(\nbind(Inputs.range([0, 500], { label: \"AQI\", step: 1 }), $0, {\n  transform: (d) => d.AQI,\n  invert: (aqi) => ({\n    pm25: aqi_pm25(aqi),\n    AQI: aqi\n  })\n})\n)};\nconst _17n45h8 = function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,data){return(\nPlot.plot({\n  grid: true,\n  x: {\n    label: \"PM2.5 →\"\n  },\n  y: {\n    label: \"↑ AQI\"\n  },\n  color: {\n    type: \"identity\"\n  },\n  marks: [\n    Plot.rect(categories, {\n      x1: 0,\n      x2: (d) => aqi_pm25(d.max),\n      y1: 0,\n      y2: \"max\",\n      stroke: \"color\",\n      strokeWidth: 3,\n      reverse: true\n    }),\n    Plot.line(d3.range(501), {\n      x: (d) => d,\n      y: pm25_aqi\n    }),\n    Plot.dot([[data.pm25, data.AQI]]),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      stroke: \"white\",\n      strokeWidth: 3,\n      strokeLinejoin: \"round\",\n      dx: 4,\n      dy: 12\n    }),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      dx: 4,\n      dy: 12\n    })\n  ]\n})\n)};\nconst _me7d6m = function _8(md){return(\nmd`The cell below defines the six official [Air Quality Index (AQI) categories](https://www.airnow.gov/aqi/aqi-basics/): “Each category corresponds to a different level of health concern. Each category also has a specific color. The color makes it easy for people to quickly determine whether air quality is reaching unhealthy levels in their communities.”`\n)};\nconst _zn2jku = function _categories(){return(\n[\n  {max: 50, color: \"green\", name: \"Good\"},\n  {max: 100, color: \"yellow\", name: \"Moderate\"},\n  {max: 150, color: \"orange\", name: \"Unhealthy for sensitive groups\"},\n  {max: 200, color: \"red\", name: \"Unhealthy\"},\n  {max: 300, color: \"purple\", name: \"Very unhealthy\"},\n  {max: 500, color: \"maroon\", name: \"Hazardous\"}\n]\n)};\nconst _18c2ed1 = function _10(md){return(\nmd`The \\`pm25_aqi\\` function converts from a PM2.5 concentration in micrograms per cubic meter to the corresponding AQI value (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`aqi_pm25\\`.`\n)};\nconst _1v04v34 = function _pm25_aqi(lerp){return(\nfunction pm25_aqi(pm25) {\n  const c = Math.floor(10 * pm25) / 10;\n  const a = c < 0 ? 0 // values below 0 are considered beyond AQI\n    : c <  12.1 ? lerp(  0,  50,   0.0,  12.0, c)\n    : c <  35.5 ? lerp( 51, 100,  12.1,  35.4, c)\n    : c <  55.5 ? lerp(101, 150,  35.5,  55.4, c)\n    : c < 150.5 ? lerp(151, 200,  55.5, 150.4, c)\n    : c < 250.5 ? lerp(201, 300, 150.5, 250.4, c)\n    : c < 350.5 ? lerp(301, 400, 250.5, 350.4, c)\n    : c < 500.5 ? lerp(401, 500, 350.5, 500.4, c)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.round(a);\n}\n)};\nconst _hkqgrd = function _12(md){return(\nmd`The \\`aqi_pm25\\` function converts from an AQI value to the corresponding PM2.5 concentration in micrograms per cubic meter (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`pm25_aqi\\`.`\n)};\nconst _1tqcgw3 = function _aqi_pm25(lerp){return(\nfunction aqi_pm25(aqi) {\n  const a = Math.round(aqi);\n  const c = a < 0 ? 0 // values below 0 are considered beyond AQI\n    : a <=  50 ? lerp(  0.0,  12.0,   0,  50, a)\n    : a <= 100 ? lerp( 12.1,  35.4,  51, 100, a)\n    : a <= 150 ? lerp( 35.5,  55.4, 101, 150, a)\n    : a <= 200 ? lerp( 55.5, 150.4, 151, 200, a)\n    : a <= 300 ? lerp(150.5, 250.4, 201, 300, a)\n    : a <= 400 ? lerp(250.5, 350.4, 301, 400, a)\n    : a <= 500 ? lerp(350.5, 500.4, 401, 500, a)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.floor(10 * c) / 10;\n}\n)};\nconst _1v4p2ht = function _14(md){return(\nmd`The \\`lerp\\` function is like d3.scaleLinear, redux.`\n)};\nconst _1n6puuj = function _lerp(){return(\nfunction lerp(ylo, yhi, xlo, xhi, x) {\n  return ((x - xlo) / (xhi - xlo)) * (yhi - ylo) + ylo;\n}\n)};\nconst _133w3ev = function _16(md){return(\nmd`The \\`bind\\` function is like [Inputs.bind](https://github.com/observablehq/inputs/blob/main/README.md#bind), except it applies a transform to convert between units, and only propagates on trusted events. This way when the user interacts with the target, it’ll propagate to the source, but the source won’t propagate back to the target. This transform needs to be invertible so that you can drag either range input to affect the other.`\n)};\nconst _1750m2n = function _bind(Inputs,Event){return(\nfunction bind(\n  target,\n  source,\n  {\n    invalidation = Inputs.disposal(target),\n    transform = (d) => d,\n    invert = (d) => d\n  } = {}\n) {\n  const onsource = (event) => {\n    target.value = transform(source.value);\n  };\n  const ontarget = (event) => {\n    source.value = invert(target.value);\n    source.dispatchEvent(new Event(\"input\", { bubbles: true }));\n  };\n  onsource({});\n  target.addEventListener(\"input\", ontarget);\n  source.addEventListener(\"input\", onsource);\n  invalidation.then(() => source.removeEventListener(\"input\", onsource));\n  return target;\n}\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_jclaoh\", null, [\"md\"], _jclaoh);  \n  $def(\"_1bo40ge\", null, [\"md\"], _1bo40ge);  \n  $def(\"_1tcoky6\", null, [\"md\",\"data\"], _1tcoky6);  \n  $def(\"_6klsgc\", \"viewof data\", [\"Inputs\"], _6klsgc);  \n  $def(\"_q0r7f0\", \"data\", [\"Generators\",\"viewof data\"], _q0r7f0);  \n  $def(\"_1sizgv5\", null, [\"bind\",\"Inputs\",\"viewof data\",\"pm25_aqi\"], _1sizgv5);  \n  $def(\"_rctuwq\", null, [\"bind\",\"Inputs\",\"viewof data\",\"aqi_pm25\"], _rctuwq);  \n  $def(\"_17n45h8\", null, [\"Plot\",\"categories\",\"aqi_pm25\",\"d3\",\"pm25_aqi\",\"data\"], _17n45h8);  \n  $def(\"_me7d6m\", null, [\"md\"], _me7d6m);  \n  $def(\"_zn2jku\", \"categories\", [], _zn2jku);  \n  $def(\"_18c2ed1\", null, [\"md\"], _18c2ed1);  \n  $def(\"_1v04v34\", \"pm25_aqi\", [\"lerp\"], _1v04v34);  \n  $def(\"_hkqgrd\", null, [\"md\"], _hkqgrd);  \n  $def(\"_1tqcgw3\", \"aqi_pm25\", [\"lerp\"], _1tqcgw3);  \n  $def(\"_1v4p2ht\", null, [\"md\"], _1v4p2ht);  \n  $def(\"_1n6puuj\", \"lerp\", [], _1n6puuj);  \n  $def(\"_133w3ev\", null, [\"md\"], _133w3ev);  \n  $def(\"_1750m2n\", \"bind\", [\"Inputs\",\"Event\"], _1750m2n);\n  return main;\n}\n";

const ID = "@user/aqi";

// The previous session's file: the module's block is in the document, but bootconf.json mains and the
// layout hash do not name it, so nothing boots it. Appending the block after boot is what the agent
// sees when opening such a file: /content/@user/aqi lists it, /src and runtime.mains do not.
const INIT = String.raw`(() => {
  globalThis.__rc5tBaseMods = [...globalThis.__ojs_runtime.mains.keys()];
  const s = document.createElement("script");
  s.type = "text/plain"; s.id = ${JSON.stringify(ID)}; s.setAttribute("data-mime", "application/javascript");
  s.textContent = ${JSON.stringify(FIXTURE)};
  document.body.appendChild(s);
})()`;

const COLLECT = String.raw`(async () => {
  const ID = ${JSON.stringify(ID)};
  const FIXTURE = ${JSON.stringify(FIXTURE)};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  const out = { saved: "not run", mains: null, hash: null, content: "not run", booted: "not run", shown: "not run", chat: "not run", errors: "not run", ms: {} };
  const reg = globalThis.__ojs_runtime;
  const rt = [...reg.mains.values()].find(m => m && m._runtime)._runtime;
  // the cells a module source defines: name, inputs and whitespace-free body, via a recording runtime
  const cellsOf = async (src) => {
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const define = (await import(url)).default;
    const cells = [];
    const rec = { define(...a) {
      const [name, inputs, fn] = a.length >= 3 ? a : a.length === 2 ? (typeof a[0] === "string" ? [a[0], [], a[1]] : [null, a[0], a[1]]) : [null, [], a[0]];
      cells.push((name || "") + "|" + (inputs || []).join(",") + "|" + String(fn).replace(/^function\s*\w*|^async\s+function\s*\w*/, "").replace(/\s+/g, "")); return this; } };
    const fakeMod = { variable: () => Object.create(rec), define: (...a) => Object.create(rec).define(...a), builtin() {}, import() { return this; } };
    define({ module: () => fakeMod, fileAttachments: () => null }, () => undefined);
    return cells.sort();
  };
  // 1. save, as the save-in-place button does: the live mains and the current layout minus one-shot params
  let html = null;
  try {
    const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
    const raw = String(location.hash || "").replace(/^#/, "");
    const drop = new Set(["cc", "open", "close", "filesync", "from", "focus"]);
    const kept = raw.split("&").filter(Boolean).filter(p => !drop.has(p.split("=")[0]));
    const r = await f({ mains: new Map(reg.mains), runtime: rt, options: { hash: kept.length ? "#" + kept.join("&") : "" } });
    html = typeof r === "string" ? r : r.source;
    out.exportBytes = html.length;
  } catch (e) { out.saved = "export threw: " + (e?.message ?? e); return out; }
  out.ms.export = Date.now() - t0;
  // 2. the saved file, read statically
  const doc = new DOMParser().parseFromString(html, "text/html");
  let conf = {};
  try { conf = JSON.parse(doc.getElementById("bootconf.json").textContent); } catch (e) { out.saved = "no bootconf.json in the saved file"; return out; }
  out.mains = (conf.mains || []).join(",");
  out.hash = conf.hash || "";
  const block = doc.getElementById(ID);
  if (!block) out.content = "no " + ID + " block in the saved file";
  else {
    try {
      const want = await cellsOf(FIXTURE), got = await cellsOf(block.textContent);
      const miss = want.filter(c => !got.includes(c)), extra = got.filter(c => !want.includes(c));
      out.content = !miss.length && !extra.length ? "ok" : "cells differ: " + miss.length + " missing, " + extra.length + " added; e.g. " + (miss[0] || extra[0]).slice(0, 160);
    } catch (e) { out.content = "saved block does not load: " + (e?.message ?? e); }
  }
  // 3. reopen: boot the file in a srcdoc frame with no hash of its own, no network, its own IndexedDB
  let frame;
  try {
    const csp = '<meta http-equiv="Content-Security-Policy" content="default-src file: blob: data: \'unsafe-inline\' \'unsafe-eval\'; connect-src file: blob: data:; worker-src blob: data:">';
    const freshIdb = "<script>{const o=IDBFactory.prototype.open;const s='-rc5t-'+Math.random().toString(36).slice(2);IDBFactory.prototype.open=function(n,...a){return o.call(this,n+s,...a)}}<\/script>";
    const h2 = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + csp + freshIdb) : csp + freshIdb + html;
    frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:800px;z-index:2147483647;background:#fff";
    frame.srcdoc = h2;
    document.body.appendChild(frame);
    const deadline = t0 + 27000; // setup.collect is bounded at 30 s by driver-core
    const w = () => frame.contentWindow;
    const d = () => frame.contentDocument;
    while (Date.now() < deadline && !(w()?.__ojs_runtime?.mains?.size && d()?.querySelector(".lp2-pane[data-module]"))) await sleep(250);
    const reg2 = w()?.__ojs_runtime;
    out.booted = reg2?.mains?.has?.(ID) ? "ok" : "not booted (mains: " + [...(reg2?.mains?.keys?.() || [])].join(",") + ")";
    const pane = () => d()?.querySelector('.lp2-pane[data-module="' + ID + '"]');
    // shown = the pane is laid out on screen and its display cells have content: the title, both
    // sliders, the chart; a pane present only as a background tab is not shown
    const verdict = () => {
      const p = pane();
      if (!p) return "no pane for " + ID + " (panes: " + [...d().querySelectorAll(".lp2-pane[data-module]")].map(x => x.dataset.module).join(",") + "; hash " + w().location.hash + ")";
      const r = p.getBoundingClientRect();
      if (r.width < 50 || r.height < 50 || w().getComputedStyle(p).display === "none" || w().getComputedStyle(p).visibility === "hidden") return "pane not visible (" + Math.round(r.width) + "x" + Math.round(r.height) + ")";
      const txt = p.textContent || "";
      const lacks = [];
      if (!/PM2\.5 to AQI Conversion/.test(txt)) lacks.push("title");
      if (!/Drag either slider/.test(txt)) lacks.push("intro");
      if (!/data\.pm25:\s*50\b/.test(txt)) lacks.push("data readout");
      if (p.querySelectorAll('input[type=range]').length < 2) lacks.push("sliders");
      if (![...p.querySelectorAll("svg")].some(s => s.querySelectorAll("path,rect").length > 5)) lacks.push("chart");
      if (!/Hazardous/.test(txt) && !/Very unhealthy/.test(txt)) lacks.push("category labels");
      return lacks.length ? "pane lacks " + lacks.join(", ") : "ok";
    };
    while (Date.now() < deadline - 1000 && verdict() !== "ok") await sleep(300);
    out.shown = verdict();
    const panes = [...d().querySelectorAll(".lp2-pane[data-module]")].map(x => x.dataset.module);
    out.panes = panes.join(",");
    const view = decodeURIComponent((w().location.hash.match(/view=([^&]*)/) || [])[1] || "");
    out.view = view;
    out.chat = /@tomlarkworthy\/robocoop-5\b(?!-)/.test(view) ? "ok" : "robocoop-5 chat is not in the reopened layout";
    const errs = [];
    const p = pane();
    if (p) for (const e of p.querySelectorAll(".observablehq--error")) errs.push("dom: " + e.textContent.slice(0, 120));
    const m2 = reg2?.mains?.get?.(ID);
    if (m2) for (const v of m2._runtime._variables) if (v._module === m2 && v._error != null && v._reachable) errs.push((v._name || "<anon>") + ": " + String(v._error?.message ?? v._error).slice(0, 120));
    out.errors = errs.length ? errs.join("; ") : "none";
    out.saved = out.booted === "ok" && out.shown === "ok" && out.content === "ok" && out.chat === "ok" && out.errors === "none" ? "ok"
      : [out.booted !== "ok" && "booted: " + out.booted, out.shown !== "ok" && "shown: " + out.shown, out.content !== "ok" && "content: " + out.content,
         out.chat !== "ok" && "chat: " + out.chat, out.errors !== "none" && "errors: " + out.errors].filter(Boolean).join(" | ");
  } catch (e) { out.saved = "reopen threw: " + (e?.message ?? e); }
  finally { frame?.remove(); }
  out.ms.total = Date.now() - t0;
  return out;
})()`;

const READ = { tool: "read_file", args: { file_path: "/content/" + ID } };
const NEG = process.env.M32_NEG || "";
const WRITE = { tool: "write_file", args: { file_path: "/src/" + ID + ".js", content: FIXTURE } };
// oracle: write the module back under its own id (a new /src module is instantiated and joins
// runtime.mains; srctools surfaceInView opens it as a tab via open=), then give it its own stack in
// the layout with a view= hash, which lopepage-2 applies and the next save keeps.
const oracle =
  NEG === "unchanged" ? [READ]
  // booted and in mains, but never put in the layout: the reopened file boots it and shows nothing
  : NEG === "mained" ? [READ, { tool: "eval_js", args: { module: "@tomlarkworthy/robocoop-5", code: `const el = document.getElementById(${JSON.stringify(ID)});
const define = (await import(URL.createObjectURL(new Blob([el.textContent], { type: "text/javascript" })))).default;
const reg = globalThis.__ojs_runtime; const rt = [...reg.mains.values()][0]._runtime;
reg.mains.set(${JSON.stringify(ID)}, rt.module(define)); return [...reg.mains.keys()].join(",")` }, settleMs: 1000 }]
  // the cells copied into a new module under another name: shown, but not the user's module
  : NEG === "copy" ? [READ, { tool: "write_file", args: { file_path: "/src/@user/aqi-restored.js", content: FIXTURE } }]
  // written back, but left where the write put it: a second tab behind the chat. lopepage-2 does not
  // serialize a stack's active tab, so the reopened file shows the chat and hides the module.
  : NEG === "tabbed" ? [READ, WRITE]
  : [READ, WRITE, { tool: "eval_js", args: { module: ID, code: `location.hash = "#view=R100(S50(@user/aqi),S35(@tomlarkworthy/robocoop-5),S15(@tomlarkworthy/robocoop-5-srctools))"; return location.hash` }, settleMs: 1500 }];

export default {
  id: "rc5t-restore-unbooted-module",
  category: "rc5-train",
  question: "I saved my notebook yesterday and today when I open it my AQI converter module is gone. Please get it back exactly as it was.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "booted", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "shown", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "content", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "chat", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "errors", equals: "none" }, weight: 1 },
  ],
  oracle,
};
