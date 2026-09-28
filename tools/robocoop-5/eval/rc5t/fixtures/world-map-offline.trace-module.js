const _intro = function intro(md){return( md`# World Map — Ten Most Populous Countries` )};
const _world = async function world(d3){return(
  await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json")
)};
const _geoData = function geoData(topojson, world){return(
  topojson.feature(world, world.objects.countries)
)};
const _top10 = function top10(){return(
  new Set([156, 356, 840, 360, 586, 566, 76, 50, 643, 484])
)};
const _names = function names(){return(
  new Map([
    [156, "China"], [356, "India"], [840, "United States"],
    [360, "Indonesia"], [586, "Pakistan"], [566, "Nigeria"],
    [76, "Brazil"], [50, "Bangladesh"], [643, "Russia"], [484, "Mexico"]
  ])
)};
const _mapSvg = function mapSvg(htl, path, otherCountries, topCountries, names){return(
  htl.svg`<svg viewBox="0 0 960 500" style="max-width:100%;height:auto;background:#e8ecf1">
    <style>
      .land { stroke: #fff; stroke-width: 0.5; vector-effect: non-scaling-stroke; }
      .top10 { fill: #d35400; }
      .other { fill: #bdc3c7; }
      .top10:hover { fill: #e67e22; stroke: #333; stroke-width: 1.2; }
    </style>
    <g>${otherCountries.map(f => htl.svg`<path class="land other" d=${path(f)}/>`)}</g>
    <g>${topCountries.map(f =>
      htl.svg`<path class="land top10" d=${path(f)}><title>${names.get(+f.id)}</title></path>`
    )}</g>
  </svg>`
)};
const _map = function map(mapSvg){return( mapSvg )};
const _projection = function projection(d3, geoData){return(
  d3.geoEqualEarth().fitSize([960, 500], geoData)
)};
const _path = function path(d3, projection){return( d3.geoPath(projection) )};
const _otherCountries = function otherCountries(geoData, top10){return(
  geoData.features.filter(f => !top10.has(+f.id))
)};
const _topCountries = function topCountries(geoData, top10){return(
  geoData.features.filter(f => top10.has(+f.id))
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_intro", "intro", ["md"], _intro);  
  $def("_world", "world", ["d3"], _world);  
  $def("_geoData", "geoData", ["topojson","world"], _geoData);  
  $def("_top10", "top10", [], _top10);  
  $def("_names", "names", [], _names);  
  $def("_mapSvg", "mapSvg", ["htl","path","otherCountries","topCountries","names"], _mapSvg);  
  $def("_map", "map", ["mapSvg"], _map);  
  $def("_projection", "projection", ["d3","geoData"], _projection);  
  $def("_path", "path", ["d3","projection"], _path);  
  $def("_otherCountries", "otherCountries", ["geoData","top10"], _otherCountries);  
  $def("_topCountries", "topCountries", ["geoData","top10"], _topCountries);
  return main;
}
