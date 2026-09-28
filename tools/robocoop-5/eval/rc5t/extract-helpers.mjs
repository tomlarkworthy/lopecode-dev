// rc5-train eval (20260928-0847-m17): a maintenance refactor. The user's notebook is too long; move the
// helper functions into their own module and import them back without changing what it shows.
// setup.files seeds @user/aqi: @tomlarkworthy/aqi_no_loop_breaking (lopebooks/notebooks/
// @tomlarkworthy_aqi_no_loop_breaking.html, lopebooks f7c4ae35) unmodified. Its four function-valued
// cells are the helpers: pm25_aqi, aqi_pm25, lerp (pure math) and bind (a two-way slider binding).
// The display is a text cell (md over `data`), two bound range sliders and a Plot chart.
//
// setup.collect, keys:
//   structure — live page: each helper name in @user/aqi resolves through an import to a variable
//               defined in a module that did not exist before the turn; none is still defined locally.
//   live      — live page: every non-prose display cell of the unedited fixture (booted beside it as a
//               reference) renders the same, before and after dragging the PM2.5 slider to 35.4.
//   saved     — the defect class: exportToHTML (as a save does), boot the file in a srcdoc iframe with
//               no network, and run `structure` and `live` again there.
//   prose     — every prose (md-only) cell of the fixture still renders word for word, in @user/aqi or moved
//               into the helper module (both mimo runs normalised “ ” ’ to straight quotes on rewrite).
//   errors    — no variable in @user/aqi or the helper module(s) holds an error, anonymous cells included
//               (each anonymous cell is re-run as an observed mirror, since nothing observes it here).
const FIXTURE = "const _jclaoh = function _1(md){return(\nmd`# PM2.5 to AQI Conversion\n\nMy home weather station measures PM2.5 concentration in micrograms per cubic meter (μg/m³). But if I’m concerned about air quality, I want to know the Air Quality Index (AQI). AQI is a policy tool and as such has a complicated definition. So, here’s a tool to convert between PM2.5 and AQI (assuming that PM2.5 is the only pollutant you care about).`\n)};\nconst _1bo40ge = function _2(md){return(\nmd`Drag either slider below to choose the selected PM2.5 or AQI.`\n)};\nconst _1tcoky6 = function _3(md,data){return(\nmd`data.pm25: ${data.pm25} data.AQI: ${data.AQI}`\n)};\nconst _6klsgc = function _data(Inputs){return(\nInputs.input({\n  pm25: 50,\n  AQI: 250\n})\n)};\nconst _q0r7f0 = (G, _) => G.input(_);\nconst _1sizgv5 = function _5(bind,Inputs,$0,pm25_aqi){return(\nbind(\n  Inputs.range([0, 500], { label: \"PM2.5 (μg/m³)\", value: 50, step: 0.1 }),\n  $0,\n  {\n    transform: (d) => d.pm25,\n    invert: (pm25) => ({\n      pm25: pm25,\n      AQI: pm25_aqi(pm25)\n    })\n  }\n)\n)};\nconst _rctuwq = function _6(bind,Inputs,$0,aqi_pm25){return(\nbind(Inputs.range([0, 500], { label: \"AQI\", step: 1 }), $0, {\n  transform: (d) => d.AQI,\n  invert: (aqi) => ({\n    pm25: aqi_pm25(aqi),\n    AQI: aqi\n  })\n})\n)};\nconst _17n45h8 = function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,data){return(\nPlot.plot({\n  grid: true,\n  x: {\n    label: \"PM2.5 →\"\n  },\n  y: {\n    label: \"↑ AQI\"\n  },\n  color: {\n    type: \"identity\"\n  },\n  marks: [\n    Plot.rect(categories, {\n      x1: 0,\n      x2: (d) => aqi_pm25(d.max),\n      y1: 0,\n      y2: \"max\",\n      stroke: \"color\",\n      strokeWidth: 3,\n      reverse: true\n    }),\n    Plot.line(d3.range(501), {\n      x: (d) => d,\n      y: pm25_aqi\n    }),\n    Plot.dot([[data.pm25, data.AQI]]),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      stroke: \"white\",\n      strokeWidth: 3,\n      strokeLinejoin: \"round\",\n      dx: 4,\n      dy: 12\n    }),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      dx: 4,\n      dy: 12\n    })\n  ]\n})\n)};\nconst _me7d6m = function _8(md){return(\nmd`The cell below defines the six official [Air Quality Index (AQI) categories](https://www.airnow.gov/aqi/aqi-basics/): “Each category corresponds to a different level of health concern. Each category also has a specific color. The color makes it easy for people to quickly determine whether air quality is reaching unhealthy levels in their communities.”`\n)};\nconst _zn2jku = function _categories(){return(\n[\n  {max: 50, color: \"green\", name: \"Good\"},\n  {max: 100, color: \"yellow\", name: \"Moderate\"},\n  {max: 150, color: \"orange\", name: \"Unhealthy for sensitive groups\"},\n  {max: 200, color: \"red\", name: \"Unhealthy\"},\n  {max: 300, color: \"purple\", name: \"Very unhealthy\"},\n  {max: 500, color: \"maroon\", name: \"Hazardous\"}\n]\n)};\nconst _18c2ed1 = function _10(md){return(\nmd`The \\`pm25_aqi\\` function converts from a PM2.5 concentration in micrograms per cubic meter to the corresponding AQI value (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`aqi_pm25\\`.`\n)};\nconst _1v04v34 = function _pm25_aqi(lerp){return(\nfunction pm25_aqi(pm25) {\n  const c = Math.floor(10 * pm25) / 10;\n  const a = c < 0 ? 0 // values below 0 are considered beyond AQI\n    : c <  12.1 ? lerp(  0,  50,   0.0,  12.0, c)\n    : c <  35.5 ? lerp( 51, 100,  12.1,  35.4, c)\n    : c <  55.5 ? lerp(101, 150,  35.5,  55.4, c)\n    : c < 150.5 ? lerp(151, 200,  55.5, 150.4, c)\n    : c < 250.5 ? lerp(201, 300, 150.5, 250.4, c)\n    : c < 350.5 ? lerp(301, 400, 250.5, 350.4, c)\n    : c < 500.5 ? lerp(401, 500, 350.5, 500.4, c)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.round(a);\n}\n)};\nconst _hkqgrd = function _12(md){return(\nmd`The \\`aqi_pm25\\` function converts from an AQI value to the corresponding PM2.5 concentration in micrograms per cubic meter (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`pm25_aqi\\`.`\n)};\nconst _1tqcgw3 = function _aqi_pm25(lerp){return(\nfunction aqi_pm25(aqi) {\n  const a = Math.round(aqi);\n  const c = a < 0 ? 0 // values below 0 are considered beyond AQI\n    : a <=  50 ? lerp(  0.0,  12.0,   0,  50, a)\n    : a <= 100 ? lerp( 12.1,  35.4,  51, 100, a)\n    : a <= 150 ? lerp( 35.5,  55.4, 101, 150, a)\n    : a <= 200 ? lerp( 55.5, 150.4, 151, 200, a)\n    : a <= 300 ? lerp(150.5, 250.4, 201, 300, a)\n    : a <= 400 ? lerp(250.5, 350.4, 301, 400, a)\n    : a <= 500 ? lerp(350.5, 500.4, 401, 500, a)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.floor(10 * c) / 10;\n}\n)};\nconst _1v4p2ht = function _14(md){return(\nmd`The \\`lerp\\` function is like d3.scaleLinear, redux.`\n)};\nconst _1n6puuj = function _lerp(){return(\nfunction lerp(ylo, yhi, xlo, xhi, x) {\n  return ((x - xlo) / (xhi - xlo)) * (yhi - ylo) + ylo;\n}\n)};\nconst _133w3ev = function _16(md){return(\nmd`The \\`bind\\` function is like [Inputs.bind](https://github.com/observablehq/inputs/blob/main/README.md#bind), except it applies a transform to convert between units, and only propagates on trusted events. This way when the user interacts with the target, it’ll propagate to the source, but the source won’t propagate back to the target. This transform needs to be invertible so that you can drag either range input to affect the other.`\n)};\nconst _1750m2n = function _bind(Inputs,Event){return(\nfunction bind(\n  target,\n  source,\n  {\n    invalidation = Inputs.disposal(target),\n    transform = (d) => d,\n    invert = (d) => d\n  } = {}\n) {\n  const onsource = (event) => {\n    target.value = transform(source.value);\n  };\n  const ontarget = (event) => {\n    source.value = invert(target.value);\n    source.dispatchEvent(new Event(\"input\", { bubbles: true }));\n  };\n  onsource({});\n  target.addEventListener(\"input\", ontarget);\n  source.addEventListener(\"input\", onsource);\n  invalidation.then(() => source.removeEventListener(\"input\", onsource));\n  return target;\n}\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_jclaoh\", null, [\"md\"], _jclaoh);  \n  $def(\"_1bo40ge\", null, [\"md\"], _1bo40ge);  \n  $def(\"_1tcoky6\", null, [\"md\",\"data\"], _1tcoky6);  \n  $def(\"_6klsgc\", \"viewof data\", [\"Inputs\"], _6klsgc);  \n  $def(\"_q0r7f0\", \"data\", [\"Generators\",\"viewof data\"], _q0r7f0);  \n  $def(\"_1sizgv5\", null, [\"bind\",\"Inputs\",\"viewof data\",\"pm25_aqi\"], _1sizgv5);  \n  $def(\"_rctuwq\", null, [\"bind\",\"Inputs\",\"viewof data\",\"aqi_pm25\"], _rctuwq);  \n  $def(\"_17n45h8\", null, [\"Plot\",\"categories\",\"aqi_pm25\",\"d3\",\"pm25_aqi\",\"data\"], _17n45h8);  \n  $def(\"_me7d6m\", null, [\"md\"], _me7d6m);  \n  $def(\"_zn2jku\", \"categories\", [], _zn2jku);  \n  $def(\"_18c2ed1\", null, [\"md\"], _18c2ed1);  \n  $def(\"_1v04v34\", \"pm25_aqi\", [\"lerp\"], _1v04v34);  \n  $def(\"_hkqgrd\", null, [\"md\"], _hkqgrd);  \n  $def(\"_1tqcgw3\", \"aqi_pm25\", [\"lerp\"], _1tqcgw3);  \n  $def(\"_1v4p2ht\", null, [\"md\"], _1v4p2ht);  \n  $def(\"_1n6puuj\", \"lerp\", [], _1n6puuj);  \n  $def(\"_133w3ev\", null, [\"md\"], _133w3ev);  \n  $def(\"_1750m2n\", \"bind\", [\"Inputs\",\"Event\"], _1750m2n);\n  return main;\n}\n";

const HELPERS = ["pm25_aqi", "aqi_pm25", "lerp", "bind"];

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = [...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/aqi"); })()`;

const COLLECT = String.raw`(async () => {
  const FIXTURE = ${JSON.stringify(FIXTURE)};
  const HELPERS = ${JSON.stringify(HELPERS)};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  const base = new Set(globalThis.__rc5tBaseMods || []);
  const out = { structure: "not run", live: "not run", saved: "not run", errors: "not run", prose: "not run", ms: {} };
  const rtOf = reg => [...reg.mains.values()].find(m => m && m._runtime)._runtime;
  const norm = s => String(s).replace(/\b(inputs-[0-9a-f]+|__ns__)-\d+/g, "$1-N").replace(/\bplot-[0-9a-f]+(-\d+)?/g, "plot-X").replace(/\s+/g, " ").trim();
  const sig = x => {
    if (x && x.nodeType === 1) {
      const vals = [...x.querySelectorAll("input")].map(i => i.type + "=" + i.value).join(";");
      return "EL " + norm(x.outerHTML) + " || " + vals;
    }
    if (typeof x === "function") return "FN";
    try { return "V " + JSON.stringify(x); } catch { return "V " + String(x); }
  };
  // the helpers' homes, following each import in @user/aqi to its defining variable
  const structure = (reg) => {
    const rt = rtOf(reg);
    const mod = reg.mains.get("@user/aqi");
    if (!mod) return { verdict: "no @user/aqi module" };
    const vars = [...rt._variables];
    const homes = new Map();
    for (const h of HELPERS) {
      const v = vars.find(x => x._module === mod && x._name === h);
      if (!v) return { verdict: h + " is not defined or imported in @user/aqi" };
      if ((v._inputs || []).some(i => String(i._name).startsWith("module ") || i._name === "@variable"))
        return { verdict: h + ": the import did not resolve (loader still pending or failed" + (v._error ? ": " + String(v._error.message || v._error).slice(0, 120) : "") + ")" };
      let s = v, hops = 0;
      while (s._inputs && s._inputs.length === 1 && s._inputs[0]._module !== s._module && hops < 6) { s = s._inputs[0]; hops++; }
      if (s._module === mod) return { verdict: h + " is still defined in @user/aqi (not moved)" };
      homes.set(h, s._module);
    }
    const names = [];
    for (const home of new Set(homes.values())) {
      const loader = vars.find(x => x._module === mod && String(x._name).startsWith("module ") && x._value === home);
      const name = loader ? loader._name.slice(7) : [...reg.mains].find(([, m]) => m === home)?.[0];
      if (!name) return { verdict: "a helper lives in a module @user/aqi has no loader for" };
      if (name === "@user/aqi" || base.has(name)) return { verdict: "helpers come from a module that existed before: " + name };
      names.push(name);
    }
    return { verdict: "ok", homes: [...new Set(homes.values())], names };
  };
  // re-run every cell of a module as an observed mirror; returns [{name, anon, inputs, value, error}]
  // the cells a module source defines, read by calling its define() against a recording runtime
  const probe = async (src) => {
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const define = (await import(url)).default;
    const cells = [];
    const rec = { define(...a) {
      const [name, inputs, fn] = a.length >= 3 ? a : a.length === 2 ? (typeof a[0] === "string" ? [a[0], [], a[1]] : [null, a[0], a[1]]) : [null, [], a[0]];
      cells.push({ name, inputs, fn }); return this; } };
    const fakeMod = { variable: () => Object.create(rec), define: (...a) => Object.create(rec).define(...a), builtin() {}, import() { return this; } };
    define({ module: () => fakeMod, fileAttachments: () => null }, () => undefined);
    return cells;
  };
  // anon: when given, the anonymous cells to render (from the saved source) instead of the module's own
  // Display cells are mounted as a page shows them, inside a connected .observablehq node: Inputs.disposal
  // resolves at once for a detached element, so a cell whose invalidation unbinds listeners would go
  // inert only here (rc5t-extract-helpers fixed run: the model's bind also removed its target listener).
  const hosts = [];
  let currentDoc = document;
  const mountingObserver = (doc) => {
    let host = hosts.find(h => h.ownerDocument === doc);
    if (!host) { host = doc.createElement("div"); host.style.cssText = "position:fixed;left:-20000px;top:0;width:800px"; doc.body.appendChild(host); hosts.push(host); }
    return { pending() {}, rejected() {}, fulfilled(v) {
      if (v && v.nodeType === 1 && !v.isConnected) { const w = doc.createElement("div"); w.className = "observablehq"; w.appendChild(v); host.appendChild(w); }
    } };
  };
  const render = async (mod, deadline, anon) => {
    const rt = mod._runtime;
    const doc = currentDoc;
    const vars = [...rt._variables].filter(v => v._module === mod && v._definition && !(anon && !v._name) &&
      !(v._inputs || []).some(i => String(i._name).startsWith("module ") || i._name === "@variable") &&
      !String(v._name).startsWith("module ") && v._name !== "@variable" &&
      !(v._name && v._inputs?.length === 1 && v._inputs[0]._module !== mod));
    const mirrors = vars.map(v => {
      const inputs = (v._inputs || []).map(i => i._name);
      const m = mod.variable(v._name ? true : mountingObserver(doc));
      try { v._name ? m.define([v._name], x => x) : m.define(inputs, v._definition); } catch (e) { return { v, m, bad: e }; }
      return { v, m, inputs };
    });
    for (const c of anon || []) {
      const m = mod.variable(mountingObserver(doc));
      try { m.define(c.inputs, c.fn); mirrors.push({ v: { _name: null }, m, inputs: c.inputs }); } catch (e) { mirrors.push({ v: { _name: null }, m, inputs: c.inputs, bad: e }); }
    }
    try { rt._computeSoon?.(); } catch {}
    const settled = () => mirrors.every(x => x.bad || x.m._value !== undefined || x.m._error != null);
    while (!settled() && Date.now() < deadline) await sleep(200);
    await sleep(300);
    return mirrors;
  };
  const missing = (want, got) => { const g = [...got]; return want.filter(w => { const i = g.indexOf(w); if (i < 0) return true; g.splice(i, 1); return false; }); };
  const prose = (mirrors) => mirrors.filter(x => !x.v._name && x.inputs.length === 1 && x.inputs[0] === "md").map(x => sig(x.m._value)).sort();
  const snapshot = (mirrors) => mirrors.filter(x => !x.v._name && !(x.inputs.length === 1 && x.inputs[0] === "md")).map(x => sig(x.m._value)).sort();
  const errorsOf = (mirrors, label) => mirrors.filter(x => x.bad || x.m._error != null)
    .map(x => label + "." + (x.v._name || "<anon " + (x.inputs || []).join(",") + ">") + ": " + String(x.bad?.message ?? x.m._error?.message ?? x.m._error).slice(0, 120));
  const drag = async (mirrors) => {
    const range = mirrors.map(x => x.m._value).filter(e => e && e.nodeType === 1)
      .flatMap(e => [...e.querySelectorAll("input[type=range]")]).find(i => /PM2\.5/.test(i.closest("form")?.textContent || ""));
    if (!range) return false;
    range.value = "35.4";
    range.dispatchEvent(new (range.ownerDocument.defaultView.Event)("input", { bubbles: true }));
    await sleep(900);
    return true;
  };
  // the whole check against one registry, compared to the reference snapshots
  const check = async (reg, deadline, ref, anon) => {
    const st = structure(reg);
    const res = { structure: st.verdict, errors: [], display: "not run" };
    const mod = reg.mains.get("@user/aqi");
    if (!mod) return res;
    const mods = [["@user/aqi", mod], ...(st.homes || []).map((m, i) => [st.names[i], m])];
    const all = [];
    try {
      for (const [label, m] of mods) { const ms = await render(m, deadline, anon?.[label]); all.push(ms); res.errors.push(...errorsOf(ms, label)); }
      // prose: every paragraph of the original, in @user/aqi or moved beside its helper, word for word
      const pm = missing(ref.prose, all.flatMap(prose));
      res.prose = pm.length ? pm.length + " prose cell(s) changed or lost, e.g. " + pm[0].slice(0, 160) : "ok";
      const before = snapshot(all[0]);
      const moved = await drag(all[0]);
      const after = snapshot(all[0]);
      const m1 = missing(ref.before, before), m2 = missing(ref.after, after);
      res.display = !moved ? "no PM2.5 slider to drag" : m1.length ? m1.length + " display cell(s) differ before the drag, e.g. " + m1[0].slice(0, 160)
        : m2.length ? m2.length + " display cell(s) differ after dragging PM2.5 to 35.4, e.g. " + m2[0].slice(0, 160) : "ok";
      if (res.display !== "ok") res.diag = all[0].map(x => [x.v._name, x.m._reachable, x.m._version, typeof x.v._value, typeof x.m._value, (x.m._inputs||[]).map(i => i._name + ":" + typeof i._value + ":" + (i._module === x.m._module)).join(","), x.bad && String(x.bad)].join("/"));
      if (res.display !== "ok") res.got = { before: before.map(s => s.slice(0, 120)), after: after.map(s => s.slice(0, 120)) };
    } finally { for (const ms of all) for (const x of ms) { try { x.m.delete(); } catch {} } }
    return res;
  };
  const rt = rtOf(globalThis.__ojs_runtime);
  // 1. export first, before anything below adds modules to the page
  let html = null;
  try {
    const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
    const r = await f({ mains: globalThis.__ojs_runtime.mains });
    html = typeof r === "string" ? r : r.source;
    out.exportBytes = html.length;
  } catch (e) { out.saved = "export threw: " + (e?.message ?? e); }
  out.ms.export = Date.now() - t0;
  // 2. reference: the unedited fixture booted beside it
  const ref = {};
  try {
    const url = URL.createObjectURL(new Blob([FIXTURE], { type: "text/javascript" }));
    const define = (await import(url)).default;
    const refMod = define(rt, () => undefined);
    const ms = await render(refMod, Date.now() + 6000);
    ref.errors = errorsOf(ms, "reference");
    ref.before = snapshot(ms);
    ref.prose = prose(ms);
    await drag(ms);
    ref.after = snapshot(ms);
    for (const x of ms) { try { x.m.delete(); } catch {} }
    out.refCells = ref.before.length;
  } catch (e) { out.live = out.saved = "reference threw: " + (e?.message ?? e); return out; }
  out.ms.ref = Date.now() - t0;
  // 3. live page
  const live = await check(globalThis.__ojs_runtime, Date.now() + 6000, ref);
  out.structure = live.structure; out.live = live.display; out.prose = live.prose; out.errors = live.errors.length ? live.errors.join("; ") : "none";
  if (live.got) out.liveGot = live.got;
  out.ms.live = Date.now() - t0;
  // 4. the saved file, reopened with no network
  if (html) {
    let frame;
    try {
      const csp = '<meta http-equiv="Content-Security-Policy" content="default-src file: blob: data: \'unsafe-inline\' \'unsafe-eval\'; connect-src file: blob: data:; worker-src blob: data:">';
      const savedHtml = html;
      // a srcdoc frame shares the parent's origin, so local-change-history would replay the live tab's
      // recorded edits (IndexedDB lopecode_history) into the reopened file. Give the frame its own
      // databases, as a fresh browser profile opening the saved file would have.
      const freshIdb = "<script>{const o=IDBFactory.prototype.open;const s='-rc5t-'+Math.random().toString(36).slice(2);IDBFactory.prototype.open=function(n,...a){return o.call(this,n+s,...a)}}<\/script>";
      html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + csp + freshIdb) : csp + freshIdb + html;
      frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;left:0;top:0;width:900px;height:700px;z-index:2147483647;background:#fff";
      frame.srcdoc = html;
      document.body.appendChild(frame);
      const deadline = t0 + 26000; // setup.collect is bounded at 30 s by driver-core
      while (Date.now() < deadline && !(frame.contentWindow?.__ojs_runtime?.mains?.get?.("@user/aqi"))) await sleep(250);
      const reg = frame.contentWindow?.__ojs_runtime;
      if (!reg?.mains?.get?.("@user/aqi")) out.saved = "saved notebook did not boot @user/aqi";
      else {
        // wait until the imports resolve and the module's variable set has been unchanged for 2 s
        let last = null, since = Date.now();
        while (Date.now() < deadline - 7000) {
          const m = reg.mains.get("@user/aqi");
          const key = m ? [...rtOf(reg)._variables].filter(v => v._module === m).map(v => (v.pid || "") + ":" + (v._name || "") + ":" + (v._inputs || []).length).sort().join("|") : null;
          if (key !== last) { last = key; since = Date.now(); }
          if (Date.now() - since > 2000 && structure(reg).verdict === "ok") break;
          await sleep(250);
        }
        out.ms.boot = Date.now() - t0;
        // anonymous cells are read from the saved blocks: a headless reopen does not always keep them as
        // variables of the main module (lopepage-2 renders panes itself), so they are re-run from source
        const doc = new DOMParser().parseFromString(savedHtml, "text/html");
        const anon = {};
        for (const label of ["@user/aqi", ...(structure(reg).names || [])]) {
          const block = doc.getElementById(label);
          if (!block) { out.saved = "no " + label + " block in the saved file"; break; }
          anon[label] = (await probe(block.textContent)).filter(c => c.name == null);
        }
        currentDoc = frame.contentDocument;
        let s = out.saved.startsWith("no ") ? null : await check(reg, Math.min(deadline, Date.now() + 8000), ref, anon);
        if (s) {
        out.savedStructure = s.structure;
        out.savedErrors = s.errors.length ? s.errors.join("; ") : "none";
        out.saved = s.structure !== "ok" ? "structure: " + s.structure : s.errors.length ? "errors: " + s.errors.join("; ").slice(0, 300) : s.display === "ok" ? "ok" : "display: " + s.display;
        if (s.got) out.savedGot = s.got;
        if (s.diag) out.savedDiag = s.diag;
        }
      }
    } catch (e) { out.saved = "saved check threw: " + (e?.message ?? e); }
    finally { frame?.remove(); }
  }
  for (const h of hosts) { try { h.remove(); } catch {} }
  out.ms.total = Date.now() - t0;
  return out;
})()`;

// --- oracle: the helpers into @user/aqi-helpers, imported back with the loader + binding pair of
// @tomlarkworthy/rate-estimation-min (lopebooks/notebooks/@tomlarkworthy_rate-estimation-min.html).
const cellSrc = (pid) => {
  const m = FIXTURE.match(new RegExp("const " + pid + " = [\\s\\S]*?\\n\\)\\};\\n"));
  if (!m) throw new Error("aqi eval: no cell " + pid);
  return m[0];
};
const PIDS = { pm25_aqi: "_1v04v34", aqi_pm25: "_1tqcgw3", lerp: "_1n6puuj", bind: "_1750m2n" };
const DEFLINE = (pid) => FIXTURE.match(new RegExp("  \\$def\\(\"" + pid + "\"[^\\n]*\\n"))[0];
const helpersFor = (names) => names.map(n => cellSrc(PIDS[n])).join("") + `
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

${names.map(n => DEFLINE(PIDS[n])).join("")}  return main;
}
`;
const userWithout = (names, helperModule) => {
  let s = FIXTURE;
  for (const n of names) s = s.replace(cellSrc(PIDS[n]), "").replace(DEFLINE(PIDS[n]), "");
  if (!helperModule) return s;
  const lines = [`  main.define("module ${helperModule}", async () => runtime.module((await import("/${helperModule}.js?v=4")).default));\n`,
    ...names.map(n => `  main.define("${n}", ["module ${helperModule}", "@variable"], (_, v) => v.import("${n}", _));\n`)].join("");
  return s.replace("  return main;\n}", lines + "  return main;\n}");
};
const WIKI = { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } };
const NEG = process.env.M17_NEG || "";
const oracle =
  // copy: the helpers duplicated into a new module, @user/aqi untouched
  NEG === "copy" ? [WIKI,
    { tool: "write_file", args: { file_path: "/src/@user/aqi-helpers.js", content: helpersFor(HELPERS) } }]
  // leftover: three moved, bind left behind
  : NEG === "leftover" ? [WIKI,
    { tool: "write_file", args: { file_path: "/src/@user/aqi-helpers.js", content: helpersFor(HELPERS.slice(0, 3)) } },
    { tool: "write_file", args: { file_path: "/src/@user/aqi.js", content: userWithout(HELPERS.slice(0, 3), "@user/aqi-helpers") } }]
  // unmained: the correct refactor, then the helper module dropped from mains before the save
  : NEG === "unmained" ? [WIKI,
    { tool: "write_file", args: { file_path: "/src/@user/aqi-helpers.js", content: helpersFor(HELPERS) } },
    { tool: "write_file", args: { file_path: "/src/@user/aqi.js", content: userWithout(HELPERS, "@user/aqi-helpers") } },
    { tool: "eval_js", args: { module: "@user/aqi", code: 'globalThis.__ojs_runtime.mains.delete("@user/aqi-helpers"); return [...globalThis.__ojs_runtime.mains.keys()].join(",")' }, settleMs: 500 }]
  // unsaved: the helper module built on the live page with eval_js (no /src file) and imported into
  // @user/aqi in place; it works until the page is saved
  : NEG === "unsaved" ? [WIKI,
    { tool: "eval_js", args: { module: "@user/aqi", code: `const src = ${JSON.stringify(helpersFor(HELPERS))};
const define = (await import(URL.createObjectURL(new Blob([src], { type: "text/javascript" })))).default;
const aqi = globalThis.__ojs_runtime.mains.get("@user/aqi"); const rt = aqi._runtime;
const h = define(rt, () => undefined);
for (const n of ${JSON.stringify(HELPERS)}) { const v = [...rt._variables].find(v => v._module === aqi && v._name === n); v.define(n, ["@variable"], (self) => null); }
for (const n of ${JSON.stringify(HELPERS)}) { [...rt._variables].find(v => v._module === aqi && v._name === n).import(n, h); }
return "ok"` }, settleMs: 1500 }]
  : [WIKI,
    { tool: "write_file", args: { file_path: "/src/@user/aqi-helpers.js", content: helpersFor(HELPERS) } },
    { tool: "write_file", args: { file_path: "/src/@user/aqi.js", content: userWithout(HELPERS, "@user/aqi-helpers") } }];

export default {
  id: "rc5t-extract-helpers",
  category: "rc5-train",
  question: "My notebook has got too long. Move the helper functions into their own module and import them back, without changing what the notebook shows.",
  setup: { files: { "/src/@user/aqi.js": FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    // the defect class: the refactor survives a save and reopen
    { name: "collected_equals", args: { key: "saved", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "structure", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "live", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "errors", equals: "none" }, weight: 1 },
    // the prose is the user's text: a rewrite that normalises its typography changes what the notebook shows
    { name: "collected_equals", args: { key: "prose", equals: "ok" }, weight: 1 },
  ],
  oracle,
};
