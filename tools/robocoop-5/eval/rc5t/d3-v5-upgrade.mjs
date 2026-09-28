// rc5-train eval (20260928-0847-m3): upgrade a d3 v5 module to the stdlib d3 (v7).
// Fixture: @bumbeishvili/continent-selector (lopebooks/notebooks/@spond_revised-sars-cov-2-analytics-page.html),
// re-homed as @user/continent-map. Changes from the original: the `require('d3@v5')` and topojson cells are
// removed so `d3` is the stdlib's v7; the gist fetch is replaced by an inline, simplified GeoJSON of the same
// continents (no network); the Usage cells that imported @bumbeishvili/utils are dropped. The handlers are
// verbatim v5:
//   .on('click.reset', function(d,i,e,arr){ … d3.event.srcElement … })   -> TypeError: d3.event is undefined
//   .on('mouseenter.continent', function(d){ … d.properties.CONTINENT … }) -> d is the MouseEvent in v6+, throws
//   .on('mouseleave.continent' / 'click.continent', function(d){ … })      -> same
// The map draws (every cell computes, no runtime error); hover, click-to-select and click-ocean-to-reset all
// throw inside the listener, which the runtime never sees.
// setup.init records the drawn land paths (d per continent) before the turn. The interaction
// is NOT driven before the turn: a pre-turn click throws in a listener, and robocoop-5's uncaught log then hands
// the agent "TypeError … reading 'srcElement'" as a watch update before its first step (runs eval-base, eval-base2).
// The negative controls (eval-neg.mjs: the fixture unchanged, and only d3.event fixed) show it is broken: 0.625. setup.collect, after the turn: the same land paths are still drawn; hover on Africa
// changes its outline; click selects "Africa" (viewof value and the `continent` cell); a click on the svg
// background resets to "World"; no listener throws; no d3 other than v7 is fetched or required.


// the fixture, inlined (source: fixtures/continent-map.js)
const FIXTURE = "const _title = function title(md){return(\nmd`# Continent Selector\n\nHover a continent to outline it, click it to select it (the value below changes), click the ocean to reset to \"World\".`\n)};\nconst _viewof_continent = function viewof_continent(createContinentSelector){return(\ncreateContinentSelector({\n  width:600,\n  ignore:['Antarctica','Oceania'],\n  strokeOpacity:1,\n  fillOpacity:0.5,\n  landColor:'gray'\n})\n)};\nconst _continent = (G, _) => G.input(_);\nconst _selected = function selected(md,continent){return(\nmd`Selected: **${continent}**`\n)};\nconst _impl = function impl(md){return(\nmd`## Implementation`\n)};\nconst _createContinentSelector = function createContinentSelector(d3,DOM,land){return(\nfunction(params) {\n  \n    const svgWidth = params&&params.width||300;\n    const ignore = params&&params.ignore||[];\n    const landColor =  params&&params.landColor||'#00E0FF'\n    let strokeOpacity = params&&params.strokeOpacity||1;\n    let fillOpacity = params&&params.fillOpacity||0.5\n\n    if(params){\n      if(!isNaN(params.strokeOpacity)){\n         strokeOpacity = params.strokeOpacity\n      }\n    }\n\n      \n  \n    const height = Math.round((210 / 400) * svgWidth);\n    const svg = d3.select(DOM.svg(svgWidth, height))\n    .on('click.reset',function(d,i,e,arr){\n      console.log(d3.event.srcElement.tagName)\n      if(d3.event.srcElement.tagName =='svg'){\n        svg.selectAll('.land')\n          .each(v => v.clicked = false)\n          .attr('fill', landColor)\n          .attr('fill-opacity',fillOpacity)\n          .classed('selected', false)\n        output('World')\n      }\n    })\n\n    function output(value) {\n        const node = svg.node();\n        node.value = value;\n        node.dispatchEvent(new CustomEvent('input'))\n    }\n\n    const projection = d3.geoNaturalEarth1()\n        .fitSize([svgWidth, height], {\n            type: \"Sphere\"\n        });\n    const graticule = d3.geoGraticule10();\n\n    const path = d3.geoPath()\n        .projection(projection)\n\n    svg\n        .selectAll('.graticule')\n        .data([graticule])\n        .join('path')\n        .attr('class', 'graticule')\n        .attr('d', path)\n        .attr('stroke-width', 0.5*svgWidth/1000)\n        .attr('fill', 'none')\n        .attr('stroke', landColor)\n        .attr('pointer-events','none')\n\n\n    svg\n        .selectAll('.land')\n        .data(land.features)\n        .join('path')\n        .attr('class', 'land')\n        .attr('d', path)\n        .attr('fill', landColor)\n        .attr('stroke', '#CCCCCC')\n        .attr('stroke-width', 0.5)\n        .attr('stroke-opacity',strokeOpacity)\n        .attr('fill-opacity',fillOpacity)\n        .on('mouseenter.continent', function(d) {\n            if(ignore.includes(d.properties.CONTINENT)) return;\n            d3.select(this).classed('hover', true).transition().attr('stroke-opacity',1).attr('stroke', '#FF0000').attr('stroke-width', 2)\n        })\n        .on('mouseleave.continent', function(d) {\n            if(ignore.includes(d.properties.CONTINENT)) return;\n            d3.select(this)\n                .classed('hover', false)\n                .transition()\n                 .attr('stroke','#CCCCCC')\n                 .attr('stroke-opacity',strokeOpacity)\n                 .attr('stroke-width', 0.5)\n        })\n        .on('click.continent', function(d) {\n            if(ignore.includes(d.properties.CONTINENT)) return;\n            svg.selectAll('.land')\n                .filter(v => v != d).each(v => v.clicked = false)\n                .attr('fill', landColor)\n                .attr('fill-opacity',fillOpacity)\n                .classed('selected', false)\n            d.clicked = !d.clicked;\n            if (d.clicked) {\n                output(d.properties.CONTINENT)\n                d3.select(this).attr('fill','#FF0000').attr('fill-opacity',1).classed('selected', true)\n            } else {\n                d3.select(this).attr('fill', landColor).attr('fill-opacity',fillOpacity).classed('selected', true)\n                output('World')\n            }\n        })\n        .filter(d=>!ignore.includes(d.properties.CONTINENT))\n         .attr('cursor','pointer')\n\n\n    const returnValue = Object.assign(svg.node(), {\n        value: \"World\"\n    })\n\n    return returnValue;\n}\n)};\nconst _land = function land(){return(\n{\"type\":\"FeatureCollection\",\"features\":[{\"type\":\"Feature\",\"properties\":{\"CONTINENT\":\"Asia\"},\"geometry\":{\"type\":\"MultiPolygon\",\"coordinates\":[[[[34,31],[36,37],[30,36],[27,37],[26,40],[33,42],[40,41],[42,42],[40,44],[48,41],[50,46],[47,48],[47,50],[51,52],[61,51],[59,52],[60,54],[57,55],[60,56],[57,57],[59,58],[59,64],[66,67],[65,69],[69,68],[67,71],[69,73],[73,73],[72,71],[74,68],[69,67],[72,66],[77,69],[74,69],[74,72],[83,71],[81,74],[104,78],[113,76],[108,73],[119,74],[131,71],[141,73],[162,70],[180,69],[180,65],[178,65],[180,63],[163,60],[162,58],[163,56],[157,51],[156,57],[164,63],[161,61],[157,62],[155,59],[143,59],[135,55],[140,54],[141,52],[135,44],[132,43],[128,40],[129,35],[127,34],[125,40],[122,39],[121,41],[118,39],[119,37],[123,37],[119,35],[122,28],[116,23],[110,20],[108,22],[106,20],[109,13],[107,10],[105,9],[100,13],[99,9],[103,5],[104,1],[98,8],[97,17],[94,16],[92,22],[87,21],[80,16],[80,10],[78,8],[73,21],[69,22],[71,23],[66,25],[54,27],[48,30],[51,24],[56,26],[60,22],[55,17],[44,13],[34,31]]],[[[136,-3],[138,-1],[145,-4],[151,-11],[145,-8],[143,-9],[139,-8],[138,-5],[133,-4],[133,-2],[131,-1],[133,0],[136,-3]]],[[[112,-4],[109,2],[117,7],[119,5],[117,3],[119,1],[116,-4],[112,-4]]],[[[103,1],[106,-3],[105,-6],[95,6],[103,1]]]]}},{\"type\":\"Feature\",\"properties\":{\"CONTINENT\":\"North America\"},\"geometry\":{\"type\":\"MultiPolygon\",\"coordinates\":[[[[-77,9],[-81,7],[-86,10],[-87,13],[-103,18],[-114,32],[-115,30],[-109,23],[-112,25],[-117,33],[-124,39],[-125,48],[-122,49],[-128,51],[-130,54],[-129,55],[-146,61],[-152,59],[-151,61],[-163,55],[-158,58],[-165,61],[-166,62],[-161,65],[-168,66],[-160,67],[-167,68],[-157,71],[-135,69],[-128,71],[-115,68],[-106,69],[-95,67],[-94,69],[-97,71],[-95,72],[-87,67],[-85,69],[-86,70],[-83,70],[-82,67],[-87,67],[-88,64],[-93,62],[-95,59],[-93,57],[-82,55],[-80,51],[-80,55],[-77,56],[-79,59],[-78,62],[-74,62],[-68,58],[-65,60],[-61,56],[-57,55],[-60,54],[-57,54],[-56,52],[-70,48],[-65,49],[-65,46],[-61,45],[-65,43],[-64,45],[-69,44],[-76,39],[-76,36],[-81,31],[-80,25],[-83,29],[-86,30],[-94,30],[-98,27],[-98,23],[-96,19],[-92,18],[-90,21],[-87,21],[-89,16],[-83,15],[-82,9],[-77,9]]],[[[-25,71],[-28,71],[-24,70],[-41,65],[-41,64],[-45,60],[-53,66],[-54,68],[-51,70],[-55,71],[-51,70],[-52,72],[-56,72],[-55,73],[-59,76],[-68,76],[-71,77],[-66,77],[-73,78],[-61,82],[-45,82],[-47,83],[-43,83],[-12,82],[-21,79],[-22,78],[-18,77],[-22,77],[-19,75],[-22,74],[-20,73],[-25,73],[-22,71],[-25,71]]],[[[-65,63],[-78,64],[-74,66],[-73,68],[-78,70],[-89,71],[-88,71],[-90,72],[-82,74],[-68,71],[-67,68],[-61,67],[-64,65],[-67,66],[-65,63]]],[[[-88,76],[-90,77],[-84,79],[-87,80],[-78,81],[-90,82],[-61,82],[-77,80],[-75,78],[-80,77],[-79,76],[-88,76]]]]}},{\"type\":\"Feature\",\"properties\":{\"CONTINENT\":\"Europe\"},\"geometry\":{\"type\":\"MultiPolygon\",\"coordinates\":[[[[65,69],[66,67],[59,64],[59,58],[57,57],[59,56],[57,55],[60,54],[59,52],[61,51],[51,52],[47,50],[47,48],[50,46],[48,41],[37,45],[39,47],[34,46],[36,45],[34,44],[32,45],[34,46],[31,47],[28,42],[23,40],[23,36],[20,42],[14,46],[12,44],[19,40],[17,41],[16,38],[16,40],[9,44],[3,43],[-2,37],[-9,37],[-9,43],[-1,44],[-1,46],[-5,49],[9,54],[8,57],[10,57],[9,55],[11,54],[19,54],[22,58],[24,57],[24,59],[29,60],[21,61],[21,63],[25,65],[25,66],[18,63],[17,62],[19,60],[14,55],[11,59],[6,59],[5,62],[11,64],[10,64],[18,69],[28,71],[36,69],[41,68],[40,66],[34,66],[37,64],[37,65],[44,66],[43,69],[46,68],[45,67],[46,67],[61,70],[65,69]]],[[[-4,57],[-2,58],[-3,56],[2,53],[1,51],[-5,50],[-3,54],[-6,57],[-5,59],[-3,59],[-4,57]]],[[[-13,65],[-19,63],[-24,65],[-22,65],[-24,65],[-23,66],[-13,65]]],[[[16,79],[22,79],[17,77],[11,80],[16,79]]]]}},{\"type\":\"Feature\",\"properties\":{\"CONTINENT\":\"Africa\"},\"geometry\":{\"type\":\"MultiPolygon\",\"coordinates\":[[[[34,31],[34,28],[33,29],[40,15],[44,10],[51,12],[51,11],[48,5],[39,-5],[41,-15],[35,-20],[35,-24],[28,-33],[20,-35],[12,-18],[14,-11],[9,-1],[10,4],[4,6],[-9,5],[-17,12],[-17,22],[-6,36],[10,37],[10,34],[19,30],[22,33],[34,31]]],[[[48,-14],[49,-12],[50,-15],[47,-25],[45,-26],[43,-22],[44,-18],[48,-14]]]]}},{\"type\":\"Feature\",\"properties\":{\"CONTINENT\":\"South America\"},\"geometry\":{\"type\":\"MultiPolygon\",\"coordinates\":[[[[-78,7],[-72,12],[-72,9],[-70,12],[-68,10],[-62,11],[-58,6],[-51,4],[-50,1],[-52,-2],[-47,-1],[-44,-3],[-40,-3],[-35,-7],[-39,-13],[-41,-22],[-48,-25],[-49,-29],[-54,-35],[-58,-34],[-58,-38],[-65,-41],[-64,-43],[-68,-46],[-66,-48],[-71,-54],[-74,-53],[-74,-47],[-76,-47],[-73,-44],[-74,-37],[-71,-33],[-70,-20],[-76,-15],[-81,-6],[-80,-3],[-81,-1],[-77,4],[-78,7]]]]}},{\"type\":\"Feature\",\"properties\":{\"CONTINENT\":\"Oceania\"},\"geometry\":{\"type\":\"MultiPolygon\",\"coordinates\":[[[[171,-45],[169,-47],[166,-46],[173,-41],[174,-41],[171,-45]]]]}},{\"type\":\"Feature\",\"properties\":{\"CONTINENT\":\"Australia\"},\"geometry\":{\"type\":\"MultiPolygon\",\"coordinates\":[[[[152,-24],[154,-29],[150,-38],[144,-39],[141,-38],[138,-34],[137,-35],[138,-33],[135,-35],[131,-31],[116,-35],[113,-26],[114,-22],[121,-20],[127,-14],[130,-15],[132,-11],[137,-12],[135,-15],[140,-18],[142,-11],[146,-19],[152,-24]]]]}},{\"type\":\"Feature\",\"properties\":{\"CONTINENT\":\"Antarctica\"},\"geometry\":{\"type\":\"MultiPolygon\",\"coordinates\":[[[[164,-82],[180,-84],[180,-90],[-180,-90],[-180,-84],[-139,-85],[-153,-84],[-152,-83],[-157,-81],[-146,-80],[-156,-79],[-158,-78],[-156,-77],[-150,-78],[-134,-75],[-101,-75],[-100,-75],[-102,-74],[-100,-73],[-102,-73],[-69,-73],[-67,-72],[-69,-70],[-67,-69],[-68,-67],[-57,-63],[-65,-67],[-60,-73],[-62,-75],[-70,-77],[-78,-76],[-73,-78],[-84,-78],[-58,-83],[-28,-80],[-30,-80],[-27,-79],[-36,-78],[-18,-76],[-14,-74],[-16,-73],[-6,-71],[23,-71],[35,-69],[40,-70],[54,-66],[70,-68],[67,-72],[69,-72],[82,-67],[113,-66],[129,-67],[134,-65],[171,-72],[163,-75],[166,-78],[158,-80],[164,-82]]],[[[-51,-80],[-48,-78],[-43,-80],[-51,-80]]],[[[-68,-71],[-69,-73],[-75,-72],[-72,-71],[-72,-69],[-71,-69],[-68,-71]]]]}}]}\n)};\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  $def(\"_title\", \"title\", [\"md\"], _title);\n  $def(\"_viewof_continent\", \"viewof continent\", [\"createContinentSelector\"], _viewof_continent);\n  $def(\"_continent\", \"continent\", [\"Generators\", \"viewof continent\"], _continent);\n  $def(\"_selected\", \"selected\", [\"md\", \"continent\"], _selected);\n  $def(\"_impl\", \"impl\", [\"md\"], _impl);\n  $def(\"_createContinentSelector\", \"createContinentSelector\", [\"d3\", \"DOM\", \"land\"], _createContinentSelector);\n  $def(\"_land\", \"land\", [], _land);\n  return main;\n}\n";

const PROBE = String.raw`
globalThis.__rc5tD3Probe = async function (base, drive = true) {
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const mods = [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m);
  const vars = () => [...rt._variables].filter(v => mods.includes(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  const out = { modules: [...rt.mains.keys()].filter(k => !base.has(k)) };
  const keepers = [];
  for (const v of vars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const errs = [];
  const onErr = e => errs.push(String(e.error?.message || e.message));
  window.addEventListener("error", onErr);
  try {
    await sleep(1500);
    const svgs = vars().map(v => v._value).filter(x => x instanceof Element)
      .flatMap(e => e.matches("svg") ? [e] : [...e.querySelectorAll("svg")])
      .filter(s => s.querySelectorAll("path").length >= 6);
    const svg = svgs[0];
    if (!svg) { out.stage = "no svg with paths"; return out; }
    const byD = new Map([...svg.querySelectorAll("path")].map(p => [p.getAttribute("d"), p]));
    out.paths = [...svg.querySelectorAll("path")].filter(p => p.__data__?.properties?.CONTINENT)
      .map(p => [p.__data__.properties.CONTINENT, p.getAttribute("d")]);
    const want = globalThis.__rc5tLand;
    if (want) {
      out.missing = Object.keys(want).filter(k => !byD.has(want[k]));
      out.sameMarks = out.missing.length === 0;
    }
    if (!drive) return out;
    const africa = want ? byD.get(want.Africa) : svg.querySelector("path");
    if (!africa) { out.stage = "no Africa path"; return out; }
    const view = vars().find(v => v._value && (v._value === svg || v._value.contains?.(svg)) && String(v._name).startsWith("viewof "));
    const valueName = view ? String(view._name).slice(7) : null;
    const valueOf = () => valueName ? vars().find(v => v._name === valueName)?._value : undefined;
    out.view = view?._name;
    const look = p => ["stroke", "stroke-width", "fill", "fill-opacity", "class"].map(a => p.getAttribute(a)).join(",");
    const before = look(africa);
    africa.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    africa.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    await sleep(700);
    out.hoverChanged = look(africa) !== before;
    africa.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));
    africa.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    await sleep(700);
    africa.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await sleep(600);
    out.afterClick = [view?._value?.value, valueOf()];
    out.clickSelects = view?._value?.value === "Africa" && valueOf() === "Africa";
    svg.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await sleep(600);
    out.afterReset = [view?._value?.value, valueOf()];
    out.resetWorks = view?._value?.value === "World" && valueOf() === "World";
    out.listenerErrors = errs.slice(0, 5);
    out.noListenerErrors = errs.length === 0;
    out.interactionOk = !!(out.hoverChanged && out.clickSelects && out.resetWorks && out.noListenerErrors);
    return out;
  } finally {
    window.removeEventListener("error", onErr);
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
};`;

const INIT = String.raw`(async () => {
  ${PROBE}
  const base = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/continent-map"));
  globalThis.__rc5tBaseMods = base;
  const r = await globalThis.__rc5tD3Probe(base, false);
  globalThis.__rc5tLand = Object.fromEntries(r.paths || []);
  globalThis.__rc5tInit = r;
})()`;

const COLLECT = String.raw`(async () => {
  const base = globalThis.__rc5tBaseMods || new Set();
  const out = await globalThis.__rc5tD3Probe(base);
  out.init = { ...(globalThis.__rc5tInit || {}), paths: undefined, n: Object.keys(globalThis.__rc5tLand || {}).length };
  out.baselineOk = out.init.n === 8;
  const rt = globalThis.__ojs_runtime;
  const mods = [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m);
  const srcs = [...rt._variables].filter(v => mods.includes(v._module)).map(v => String(v._definition));
  const oldReq = srcs.filter(s => /require\s*\(\s*["'\x60]d3(@|["'\x60])|d3@v?[3-6]\b|d3\/v?[3-6]\b|import\s*\(\s*["'\x60][^"'\x60]*d3@v?[3-6]/.test(s));
  const oldNet = performance.getEntriesByType("resource").map(e => e.name).filter(n => /d3@v?[3-6]\b|d3js\.org\/d3\.v[3-6]/.test(n));
  const d3v = [...rt._variables].filter(v => mods.includes(v._module) && v._name === "d3").map(v => v._value?.version);
  out.oldD3 = { oldReq: oldReq.map(s => s.slice(0, 120)), oldNet, d3v };
  out.noOldD3 = oldReq.length === 0 && oldNet.length === 0 && d3v.every(x => /^7\./.test(String(x)));
  return out;
})()`;

const FIXED = FIXTURE
  .replace(`.on('click.reset',function(d,i,e,arr){
      console.log(d3.event.srcElement.tagName)
      if(d3.event.srcElement.tagName =='svg'){`, `.on('click.reset',function(event){
      if(event.target.tagName =='svg'){`)
  .replace(`.on('mouseenter.continent', function(d) {`, `.on('mouseenter.continent', function(event, d) {`)
  .replace(`.on('mouseleave.continent', function(d) {`, `.on('mouseleave.continent', function(event, d) {`)
  .replace(`.on('click.continent', function(d) {`, `.on('click.continent', function(event, d) {`);
if (!/function\(event\)/.test(FIXED) || (FIXED.match(/function\(event, d\)/g) || []).length !== 3) throw new Error("d3-upgrade eval: FIXED did not apply 4 edits");

export default {
  id: "rc5t-d3-v5-upgrade",
  category: "rc5-train",
  question: "This notebook (@user/continent-map) was written for an old version of d3 and parts of it no longer work. Upgrade it to the d3 in the standard library.",
  setup: { files: { "/src/@user/continent-map.js": FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "baselineOk", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "sameMarks", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "interactionOk", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "noOldD3", equals: true }, weight: 2 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/continent-map.js", content: FIXED } },
  ],
};

export { FIXTURE, FIXED };
