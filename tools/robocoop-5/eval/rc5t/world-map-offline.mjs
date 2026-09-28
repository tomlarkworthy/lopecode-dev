// rc5-train eval (20260928-0235-w17): a map whose geometry and parser are fetched at run time is blank offline.
// In run 20260928-0235-w17-before the agent read vendoring-npm-dependencies.md, then decided the
// world-atlas TopoJSON "is a data file rather than a library" and fetched it with
// d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json"), and parsed it with the
// `topojson` builtin, which the stdlib loads from cdn.jsdelivr.net on first use. The map was correct
// online (177 paths, 10 highlighted with <title>s); reopened with the network blocked, `world` and
// `topojson` never resolved and the map cell stayed empty.
//
// setup.collect reads the live page:
//   key `map`     — an <svg> with >= 100 country paths, >= 10 of them in a fill distinct from the base
//                   fill, and tooltips (a <title> on/over those paths, or a Plot tip mark); if titles
//                   exist, >= 9 of the ten expected names appear in them.
//   key `offline` — the defect. exportToHTML (as save does), then in each new module's saved source:
//                   no fetch/d3.json/import/require of an http(s) URL, no bare stdlib require("pkg"),
//                   no dependency on a builtin the stdlib loads from the network, and the geometry is
//                   in the file (an attachment block of the module, or inlined).
// The world-atlas and topojson-client CDN URLs are routed to fixtures fetched 2026-09-28.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const WORLD = readFileSync(join(here, "fixtures/countries-110m.json"), "utf8");
const TOPOJSON = readFileSync(join(here, "fixtures/topojson-client.min.js"), "utf8");

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const out = { map: "not run", offline: "not run" };
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const mains = globalThis.__ojs_runtime.mains;
  const fresh = new Set([...rt._variables].map(v => v._module).filter(m => !globalThis.__rc5tBefore.has(m)));
  const userMods = [...mains.entries()].filter(([, m]) => fresh.has(m));
  if (!userMods.length) return { map: "no module was created", offline: "no module was created" };
  const userVars = [...rt._variables].filter(v => userMods.some(([, m]) => m === v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  try {
    await sleep(3000);
    // --- map
    try {
      const els = userVars.map(v => v._value).filter(x => x instanceof Element);
      const svgs = [...new Set(els.flatMap(e => [...(e.matches("svg") ? [e] : []), ...e.querySelectorAll("svg")]))];
      const svg = svgs.map(s => [s, s.querySelectorAll("path").length]).filter(([, n]) => n >= 100).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!svg) out.map = "no svg with >= 100 paths (svgs: " + JSON.stringify(svgs.map(s => s.querySelectorAll("path").length)) + ")";
      else {
        let host = null;
        if (!svg.isConnected) { host = document.createElement("div"); host.style.cssText = "position:absolute;left:-99999px"; host.append(svg.cloneNode(true)); document.body.append(host); }
        const root = host ? host.firstChild : svg;
        try {
          const paths = [...root.querySelectorAll("path")];
          const fills = paths.map(p => getComputedStyle(p).fill);
          const counts = {};
          for (const f of fills) if (f && f !== "none") counts[f] = (counts[f] || 0) + 1;
          const base = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
          const hi = paths.filter((p, i) => fills[i] && fills[i] !== "none" && fills[i] !== base);
          const titleOf = p => { for (let n = p; n && n !== root; n = n.parentNode) { const t = [...n.children].find(c => c.tagName.toLowerCase() === "title"); if (t) return t.textContent; } return null; };
          const titles = hi.map(titleOf).filter(t => t != null);
          const tip = root.querySelector('[aria-label="tip"]');
          const expected = [/india/i, /china/i, /united states|usa|u\.s\./i, /indonesia/i, /pakistan/i, /nigeria/i, /brazil/i, /bangladesh/i, /russia/i, /ethiopia|mexico/i];
          const named = expected.filter(re => titles.some(t => re.test(t))).length;
          if (hi.length < 10) out.map = "only " + hi.length + " paths differ from the base fill " + base;
          else if (titles.length < 10 && !tip) out.map = "no tooltip: " + titles.length + " of " + hi.length + " highlighted paths have a <title>, no Plot tip";
          else if (titles.length >= 10 && named < 9) out.map = "tooltips name " + named + " of the ten expected countries: " + JSON.stringify(titles.slice(0, 12));
          else out.map = "ok";
        } finally { host?.remove(); }
      }
    } catch (e) { out.map = "map check threw: " + (e?.message ?? e); }
    // --- offline: the saved file carries the geometry and loads nothing from the network
    try {
      const f = [...rt._variables].find(v => v._name === "exportToHTML" && v._value)._value;
      const r = await f({ mains });
      const html = typeof r === "string" ? r : r.source;
      const blocks = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map(m => ({ id: (m[1].match(/\bid="([^"]*)"/) || [])[1], body: m[2] })).filter(b => b.id);
      const NET_BUILTINS = ["topojson", "vl", "SQLite", "mermaid", "L", "Arrow", "aq", "tex", "dot", "weather", "pizza", "penguins", "olympians", "miserables", "industries", "flare", "diamonds", "citywages", "cars", "alphabet", "aapl"];
      const problems = [];
      for (const [id] of userMods) {
        const src = blocks.find(b => b.id === id)?.body;
        if (src == null) { problems.push(id + ": no module block in the export"); continue; }
        const net = [...src.matchAll(/\b(fetch|d3\.(?:json|csv|tsv|text|xml)|import|importShim|require)\(\s*["'\x60](https?:\/\/[^"'\x60]*)/g)].map(m => m[1] + "(" + m[2].slice(0, 80) + ")");
        const bareRequire = [...src.matchAll(/\brequire\(\s*["'\x60]([^"'\x60]+)/g)].map(m => m[1]).filter(s => !/^https?:/.test(s));
        const deps = new Set([...src.matchAll(/\.define\([^\n]*?\[([^\]]*)\]/g), ...src.matchAll(/\$def\([^\n]*?\[([^\]]*)\]/g)].flatMap(m => [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1])));
        const own = new Set([...src.matchAll(/\.define\(\s*"([^"]+)"/g), ...src.matchAll(/\$def\(\s*"[^"]*"\s*,\s*"([^"]+)"/g)].map(m => m[1]));
        const netDeps = NET_BUILTINS.filter(n => deps.has(n) && !own.has(n));
        if (net.length) problems.push(id + " fetches at run time: " + net.join(", "));
        if (bareRequire.length) problems.push(id + " loads via stdlib require (jsdelivr): " + bareRequire.join(", "));
        if (netDeps.length) problems.push(id + " depends on network-loaded builtin(s): " + netDeps.join(", "));
      }
      const geo = blocks.some(b => userMods.some(([id]) => b.id.startsWith(id + "/")) && b.body.length > 20000) ||
        userMods.some(([id]) => { const s = blocks.find(b => b.id === id)?.body || ""; return s.length > 50000 && /"arcs"|"coordinates"/.test(s); });
      if (!geo) problems.push("no geometry in the saved file (no attachment block > 20 kB on a new module, no inlined geometry)");
      out.offline = problems.length ? problems.join("; ") : "ok";
    } catch (e) { out.offline = "export threw: " + (e?.message ?? e); }
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

// Oracle: the map's geometry and parser as attachments of the module. FileAttachment(name).json() as in
// @tomlarkworthy/womens-suffrage._iso3166 (lopebooks/notebooks/@tomlarkworthy_womens-suffrage.html);
// the UMD parser run as CommonJS per vendoring-npm-dependencies.md § 2.2.
const SOLUTION = `const _intro = function intro(md){return( md\`# The ten most populous countries\` )};
const _world = function world(FileAttachment){return( FileAttachment("countries-110m.json").json() )};
const _topojson = async function topojson(FileAttachment){
  const src = await FileAttachment("topojson-client.min.js").text();
  const mod = { exports: {} };
  new Function("module", "exports", "define", src)(mod, mod.exports, undefined);
  return mod.exports;
};
const _countries = function countries(topojson, world){return( topojson.feature(world, world.objects.countries).features )};
const _top10 = function top10(){return( new Map([["356","India"],["156","China"],["840","United States"],["360","Indonesia"],["586","Pakistan"],["566","Nigeria"],["076","Brazil"],["050","Bangladesh"],["643","Russia"],["231","Ethiopia"]]) )};
const _map = function map(d3, htl, countries, top10){
  const projection = d3.geoEqualEarth().fitSize([960, 500], {type: "FeatureCollection", features: countries});
  const path = d3.geoPath(projection);
  return htl.svg\`<svg viewBox="0 0 960 500" style="max-width:100%">\${countries.map(f => htl.svg\`<path d=\${path(f)} fill=\${top10.has(f.id) ? "#d35400" : "#ccc"} stroke="#fff"><title>\${f.properties.name}</title></path>\`)}</svg>\`;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_world", "world", ["FileAttachment"], _world);
  $def("_topojson", "topojson", ["FileAttachment"], _topojson);
  $def("_countries", "countries", ["topojson", "world"], _countries);
  $def("_top10", "top10", [], _top10);
  $def("_map", "map", ["d3", "htl", "countries", "top10"], _map);
  return main;
}
`;

const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";
const TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js";

export default {
  id: "rc5t-world-map-offline",
  category: "rc5-train",
  question: "Show a world map with the ten most populous countries highlighted, and a tooltip with each country's name.",
  setup: {
    init: INIT,
    collect: COLLECT,
    routes: [
      { url: "**/world-atlas@*/countries-110m.json", contentType: "application/json", body: WORLD },
      { url: "**/world-atlas/countries-110m.json", contentType: "application/json", body: WORLD },
      { url: "**/topojson-client@*/dist/topojson-client.min.js", contentType: "text/javascript", body: TOPOJSON },
    ],
  },
  criteria: [
    // the defect: the saved notebook must carry the geometry and load nothing from a CDN
    { name: "collected_equals", args: { key: "offline", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "map", equals: "ok" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/vendoring-npm-dependencies.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/world-map.js", content: SOLUTION } },
    { tool: "attach_file", args: { module: "@user/world-map", name: "countries-110m.json", url: WORLD_URL } },
    { tool: "attach_file", args: { module: "@user/world-map", name: "topojson-client.min.js", url: TOPOJSON_URL } },
  ],
};

