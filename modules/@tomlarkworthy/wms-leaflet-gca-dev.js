const _v69p9p = function _1(md,keyword_style){return(
md`# WMS Leaflet map GCA (DEV)
## An interface to produce a slippy map using WMS (Web Map Service)
<p style="margin-bottom: -12px;"></p>
<span ${keyword_style}>Leaflet</span>
<span ${keyword_style}>Interactive Web Map</span>
<span ${keyword_style}>WMS</span> 
`
)};
const _kepo4i = function _2(md){return(
md`An interface to produce a slippy map using WMS (Web Map Service) layer from netCDF files available
from : <a href="https://www.globalcarbonatlas.org:8443/thredds/catalog/Atlas/Flux_Transcom/catalog.html"
target="_blank">https://www.globalcarbonatlas.org:8443/thredds/catalog/Atlas/Flux_Transcom/catalog.html</a>.
Vector layers come from a Geoserver and the WMS layer from a Thredds Data Server with the WMS service activated.`
)};
const _sayfo = function _3(md){return(
md`<hr>
### Interface`
)};
const _1bjhldx = function _layers(Inputs,layersArray){return(
Inputs.checkbox(layersArray, {
  value: [layersArray[2]],
  label: "Vector layers",
  format: (x) => x.name
})
)};
const _1ryz62y = (G, _) => G.input(_);
const _5f17nc = function _palette0(Inputs,palettesArray){return(
Inputs.select(palettesArray, {
  value: palettesArray[8],
  label: "Palette"
})
)};
const _hf7n5 = (G, _) => G.input(_);
const _1y9f4a8 = function _paletteInversed(Inputs){return(
Inputs.toggle({
  label: "Inverse palette",
  values: ["-inv", ""]
})
)};
const _1lkhijd = (G, _) => G.input(_);
const _1eivbrb = function _opacity(Inputs){return(
Inputs.range([0, 100], {
  value: 100,
  step: 5,
  label: "Opacity"
})
)};
const _18vvetv = (G, _) => G.input(_);
const _1c0ux27 = function _numcolorbands(Inputs){return(
Inputs.range([10, 250], {
  value: 20,
  step: 1,
  label: "Number of colorbands"
})
)};
const _1vft08r = (G, _) => G.input(_);
const _kepwyg = function _directory(Inputs,dirsArray){return(
Inputs.select(dirsArray, {
  width: 600,
  value: dirsArray[15],
  label: "Directory"
})
)};
const _jnt0bt = (G, _) => G.input(_);
const _cml8ve = function _period(Inputs){return(
Inputs.select(
  [
    "longterm",
    "yearlymean",
    "yearlymean-anom",
    "monthlymean",
    "monthlymean-anom"
  ],
  {
    value: "yearlymean-anom",
    width: 600,
    label: "Period averaging"
  }
)
)};
const _14arai5 = (G, _) => G.input(_);
const _139pggy = function _ressource(Inputs,ressourcesArray){return(
Inputs.select(ressourcesArray, {
  width: 600,
  value: ressourcesArray[0],
  label: "Ressource"
})
)};
const _12du9ot = (G, _) => G.input(_);
const _1kmn2nq = function _variable(variablesArray,Inputs)
{
  if (typeof this !== "undefined" && variablesArray.includes(this.value)) {
    var variableToSet = this.value;
  } else {
    var variableToSet = variablesArray.slice(-1)[0];
  }
  var variable = Inputs.select(variablesArray, {
    value: variableToSet,
    label: "Variable"
  });
  return variable;
};
const _11gvkq4 = (G, _) => G.input(_);
const _1siulf4 = function _rangeFrom(Inputs){return(
Inputs.radio(
  ["variable", "user choice"],
  { label: "Get range from", value: "variable" }
)
)};
const _1gznmn7 = (G, _) => G.input(_);
const _ky3o1t = function _range(rangeFrom,rangeVariable,rangeSlider)
{
  const range0 =
    this && rangeFrom === "user choice" ? this.value : rangeVariable;
  return rangeSlider({
    min: Math.floor(range0[0] - Math.abs(range0[0]) * 0.2),
    max: Math.ceil(range0[1] + Math.abs(range0[1]) * 0.2),
    step: 10 ** Math.floor(Math.log10(Math.abs(range0[1] - range0[0]) / 100.0)),
    value: range0,
    precision: 3,
    title: "<div style='font-weight:normal;font-size: smaller;'>Range</div>"
  });
};
const _c3tlqv = (G, _) => G.input(_);
const _18y3xrz = function* _map(html,legend,L,timeVariable,directory,period,ressource,variable,range,numcolorbands,palette,opacity,layers)
{
  const bounds =
    //this && this.map && typeof this.map.getBounds === "function" ? this.map.getBounds() : null;
    this && this.map ? this.map.getBounds() : null;

  const container = html`<div style="display:table;"><div id="map" style="float:left;width:700px;height:400px;"></div><img src="${legend}" style="float:left;margin-left:10px;"></div>`;
  yield container;

  const map = (container.map = L.map("map"));

  if (bounds) {
    //console.log(bounds);
    map.fitBounds(bounds);
  } else {
    map.setView([0, 0], 1);
  }

  //L.control.fullscreen().addTo(map);
  var resizer = L.control
    .resizer({ direction: "se", onlyOnHover: true, pan: true })
    .addTo(map);

  // https://github.com/socib/Leaflet.TimeDimension
  var timeDimension = new L.TimeDimension({
    times: timeVariable
  });
  map.timeDimension = timeDimension;

  const currentTime =
    this && this.map ? this.map.timeDimension.getCurrentTime() : null;
  if (currentTime) {
    //console.log(currentTime);
    map.timeDimension.setCurrentTime(currentTime);
  }

  var player = new L.TimeDimension.Player(
    {
      transitionTime: 100,
      loop: true,
      startOver: true
    },
    timeDimension
  );

  var timeDimensionControlOptions = {
    player: player,
    timeDimension: timeDimension,
    position: "bottomleft",
    autoPlay: false,
    minSpeed: 1,
    speedStep: 0.5,
    maxSpeed: 15,
    timeSliderDragUpdate: true
  };

  var timeDimensionControl = new L.Control.TimeDimension(
    timeDimensionControlOptions
  );
  map.addControl(timeDimensionControl);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {}).addTo(
    map
  );

  let wmsLayer = L.tileLayer.wms(
    "https://www.globalcarbonatlas.org:8443/thredds/wms/" +
      directory +
      "/" +
      period +
      "/" +
      ressource +
      "?",
    {
      LAYERS: variable,
      COLORSCALERANGE: range,
      NUMCOLORBANDS: numcolorbands,
      STYLES: "raster/" + palette,
      ABOVEMAXCOLOR: "extend",
      BELOWMINCOLOR: "extend",
      SRS: "EPSG:4326",
      FORMAT: "image/png",
      OPACITY: opacity
    }
  );

  var tdWmsLayer = L.timeDimension.layer.wms(wmsLayer);
  tdWmsLayer.addTo(map);

  for (let i = 0; i < layers.length; i++) {
    let layerGEOSERVER = L.tileLayer.wms(
      "https://www.globalcarbonatlas.org:8443/geoserver/GCA/wms?",
      {
        LAYERS: layers[i].layer,
        SRS: "EPSG:4326",
        FORMAT: "image/png",
        TRANSPARENT: "true"
      }
    );
    layerGEOSERVER.bringToFront();
    layerGEOSERVER.addTo(map);
  }
};
const _px6359 = function _16(md){return(
md`<button onClick="javascript:window.open('https://observablehq.com/embed/@pbrockmann/wms-leaflet-gca?cells=map%2Cviewof+variable%2Cviewof+ressource%2Cviewof+period%2Cviewof+directory%2Cviewof+rangeFrom%2Cviewof+range', '_blank');">Export map</button>`
)};
const _xon5c1 = function _17(md){return(
md`<hr>`
)};
const _1scduy2 = function _mapsSelectionButtons(Inputs,$0,mapsArrayMutable,addMap){return(
Inputs.button(
  [
    [
      "Add",
      () => {
        $0.value = mapsArrayMutable.concat(addMap());
        //mutable mapsArrayMutable.push(addMap());
      }
    ],
    [
      "Remove last",
      () => {
        $0.value = mapsArrayMutable.slice(0, -1);
        //mutable mapsArrayMutable.splice(1, 1);
      }
    ],
    [
      "Reset",
      () => {
        $0.value = [];
      }
    ]
  ],
  { value: [], label: "List of maps" }
)
)};
const _5m0q2i = function _19(md,payload){return(
md`<button onClick="javascript:window.open('https://observablehq.com/embed/@tomlarkworthy/wms-leaflet-gca-dev?cells=mapsArray%2Callmaps&payload=${payload}', '_blank');">Export all maps</button>`
)};
const _1dtcob8 = function* _allmaps(html,mapsArray,L,layers)
{
  var randomIntegerInRange = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const container = html`<div id="mapDiv" style="display: table;"></div>`;
  yield container;

  if (mapsArray.length == 0) return "No maps";

  var center = [0, 0];
  var zoom = 0;
  var width = 150;
  var height = 150;

  var mapsNb = mapsArray.length;

  var maps = [];
  for (var i = 0; i < mapsNb; i++) {
    var div = document.createElement("div");
    div.style.width = width + "px";
    div.style.height = height + "px";
    div.style.float = "left";
    div.id = "map" + i;
    document.getElementById("mapDiv").appendChild(div);

    maps["map" + i] = L.map("map" + i);
    maps["map" + i].setView(center, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {}).addTo(
      maps["map" + i]
    );

    let wmsLayer = L.tileLayer.wms(
      "https://www.globalcarbonatlas.org:8443/thredds/wms/" +
        mapsArray[i].directory +
        "/" +
        mapsArray[i].period +
        "/" +
        mapsArray[i].ressource +
        "?",
      {
        LAYERS: mapsArray[i].variable,
        //TIME: "1979-07-01T12:00:00.000Z",
        COLORSCALERANGE: mapsArray[i].range,
        NUMCOLORBANDS: mapsArray[i].numcolorbands,
        STYLES: "raster/" + mapsArray[i].palette,
        ABOVEMAXCOLOR: "extend",
        BELOWMINCOLOR: "extend",
        SRS: "EPSG:4326",
        FORMAT: "image/png",
        OPACITY: mapsArray[i].opacity
      }
    );
    wmsLayer.addTo(maps["map" + i]);

    for (let j = 0; j < layers.length; j++) {
      let layerGEOSERVER = L.tileLayer.wms(
        "https://www.globalcarbonatlas.org:8443/geoserver/GCA/wms?",
        {
          LAYERS: layers[j].layer,
          SRS: "EPSG:4326",
          FORMAT: "image/png",
          TRANSPARENT: "true"
        }
      );
      layerGEOSERVER.bringToFront();
      layerGEOSERVER.addTo(maps["map" + i]);
    }
  }

  // Synchronize all maps together
  for (var i = 0; i < mapsNb; i++) {
    for (var j = 0; j < mapsNb; j++) {
      if (i != j) {
        maps["map" + i].sync(maps["map" + j]);
      }
    }
  }

  // https://github.com/jjimenezshaw/Leaflet.Control.Resizer
  var resizer = L.control
    .resizer({ direction: "se", onlyOnHover: true })
    .addTo(maps["map0"]);
  L.DomEvent.on(resizer, "dragend", function (e) {
    var map0Div = document.getElementById("map0");

    for (var i = 1; i < mapsNb; i++) {
      var mapDiv = document.getElementById("map" + i);
      mapDiv.style.width = map0Div.style.width;
      mapDiv.style.height = map0Div.style.height;
      maps["map" + i].invalidateSize();
    }
  });
};
const _1yo4kcv = function _payload(mapsArrayMutable){return(
btoa(JSON.stringify(mapsArrayMutable))
)};
const _6yrg0c = function _addMap(directory,ressource,period,variable,timeVariable,range,palette,numcolorbands,opacity){return(
function addMap() {
  var map1 = {
    directory: directory,
    ressource: ressource,
    period: period,
    variable: variable,
    timeVariable: timeVariable,
    range: range,
    palette: palette,
    numcolorbands: numcolorbands,
    opacity: opacity
  };
  return map1;
}
)};
const _1e3uz7y = function _mapsArray(URLSearchParams,location,mapsArrayMutable)
{
  var mapsArray = [];

  try {
    mapsArray = JSON.parse(
      atob(new URLSearchParams(location.search).get("payload"))
    );
  } catch (err) {}

  for (let i = 0; i < mapsArrayMutable.length; i++) {
    mapsArray.push(mapsArrayMutable[i]);
  }
  return mapsArray;
};
const _1yc92by = function _mapsArrayStatic(){return(
[
  {
    directory: "Atlas/Flux_Transcom/Inversions-GCP2019",
    ressource:
      "fco2_CAMS-V18-2-2019_June2018-ext3_1979-2018_yearlymean-anom_XYT.nc",
    period: "yearlymean-anom",
    variable: "Terrestrial_flux",
    range: [-432, 291],
    palette: "div-RdYlBu",
    numcolorbands: 20,
    opacity: 100
  },
  {
    directory: "Atlas/Flux_Transcom/Inversions-GCP2019",
    ressource:
      "fco2_CAMS-V18-2-2019_June2018-ext3_1979-2018_yearlymean-anom_XYT.nc",
    period: "yearlymean-anom",
    variable: "Ocean_flux",
    range: [-29.9, 39.2],
    palette: "div-RdYlBu",
    numcolorbands: 20,
    opacity: 100
  }
]
)};
const _kyk7ko = function _mapsArrayMutable(){return(
[]
)};
const _d05q4o = (M, _) => new M(_);
const _12kl9wt = _ => _.generator;
const _1sa71c9 = function _26(md){return(
md`<hr>`
)};
const _zsth0r = async function _dirsArray(DOMParser)
{
  var xmlResponseDirectories = await fetch(
    "https://www.globalcarbonatlas.org:8443/thredds/catalog/Atlas/Flux_Transcom/catalog.xml"
  ).then((response) => {
    return response.text();
  });
  var catalogDirectories = new DOMParser().parseFromString(
    xmlResponseDirectories,
    "text/xml"
  );
  var dirsArray = Array.from(
    catalogDirectories.querySelectorAll("dataset > catalogRef"),
    (n) => n.getAttribute("ID")
  );
  return dirsArray;
};
const _1vwjfjk = async function _ressourcesArray(directory,period,DOMParser)
{
  var ressourcesResponse = await fetch(
    "https://www.globalcarbonatlas.org:8443/thredds/catalog/" +
      directory +
      "/" +
      period +
      "/catalog.xml"
  ).then((response) => {
    return response.text();
  });
  var ressourcesCatalog = new DOMParser().parseFromString(
    ressourcesResponse,
    "text/xml"
  );
  var ressourcesArray = Array.from(
    ressourcesCatalog.querySelectorAll("dataset > dataset"),
    (n) => n.getAttribute("name")
  ).filter((d) => d.endsWith(".nc"));
  return ressourcesArray;
};
const _db983y = async function _variablesArray(directory,period,ressource,DOMParser)
{
  var variablesResponse = await fetch(
    "https://www.globalcarbonatlas.org:8443/thredds/wms/" +
      directory +
      "/" +
      period +
      "/" +
      ressource +
      "?REQUEST=GetCapabilities"
  ).then((response) => {
    return response.text();
  });
  var variablesCatalog = new DOMParser().parseFromString(
    variablesResponse,
    "text/xml"
  );
  var variablesArray = Array.from(
    variablesCatalog.querySelectorAll(
      "WMS_Capabilities > Capability > Layer > Layer > Layer > Name"
    ),
    (n) => n.childNodes[0].nodeValue
  );
  return variablesArray;
};
const _121oqyw = async function _timeVariable(directory,period,ressource,DOMParser)
{
  var timeVariableResponse = await fetch(
    "https://www.globalcarbonatlas.org:8443/thredds/wms/" +
      directory +
      "/" +
      period +
      "/" +
      ressource +
      "?REQUEST=GetCapabilities"
  ).then((response) => {
    return response.text();
  });
  var timeVariableCatalog = new DOMParser().parseFromString(
    timeVariableResponse,
    "text/xml"
  );
  var timeVariableArray = Array.from(
    timeVariableCatalog.querySelectorAll(
      "WMS_Capabilities > Capability > Layer > Layer > Layer > Dimension"
    ),
    (n) => n.childNodes[0].nodeValue
  );
  return timeVariableArray[0].trim();
};
const _7e63m6 = async function _rangeVariable(directory,period,ressource,variable)
{
  var rangeVariableResponse = await fetch(
    "https://www.globalcarbonatlas.org:8443/thredds/wms/" +
      directory +
      "/" +
      period +
      "/" +
      ressource +
      "?REQUEST=GetMetadata&VERSION=1.1.1&LAYER=" +
      variable +
      "&ITEM=minmax&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=200&HEIGHT=200"
  ).then((response) => {
    return response.json();
  });
  return [rangeVariableResponse.min, rangeVariableResponse.max];
};
const _tyb0i9 = function _layersArray(){return(
[
  { name: "Land mask", layer: "GCA:GCA_landMask" },
  { name: "Ocean mask", layer: "GCA:GCA_oceanMask" },
  { name: "Frontiers", layer: "GCA:GCA_frontiersCountryAndRegions" },
  { name: "Names", layer: "GCA:GCA_labelsCountriesRegionsOceans" },
  { name: "Urban areas", layer: "GCA:GCA_citiesLabelsAndFrontiers" },
  { name: "Lakes and river", layer: "GCA:GCA_lakesAndRivers" },
  { name: "Graticules", layer: "GCA:GCA_graticules01_05_10" }
]
)};
const _1o3zu4r = function _palettesArray(){return(
[
  "div-BrBG",
  "div-BuRd2",
  "div-BuRd",
  "div-PiYG",
  "div-PRGn",
  "div-PuOr",
  "div-RdBu",
  "div-RdGy",
  "div-RdYlBu",
  "div-RdYlGn",
  "div-Spectral",
  "psu-inferno",
  "psu-magma",
  "psu-plasma",
  "psu-viridis",
  "seq-BkBu",
  "seq-BkGn",
  "seq-BkRd",
  "seq-BkYl",
  "seq-BlueHeat",
  "seq-Blues",
  "seq-BuGn",
  "seq-BuPu",
  "seq-BuYl",
  "seq-cubeYF",
  "seq-GnBu",
  "seq-Greens",
  "seq-Greys",
  "seq-GreysRev",
  "seq-Heat",
  "seq-Oranges",
  "seq-OrRd",
  "seq-PuBuGn",
  "seq-PuBu",
  "seq-PuRd",
  "seq-Purples",
  "seq-RdPu",
  "seq-Reds",
  "seq-YlGnBu",
  "seq-YlGn",
  "seq-YlOrBr",
  "seq-YlOrRd",
  "x-Ncview",
  "x-Occam",
  "x-Rainbow",
  "x-Sst"
]
)};
const _1pcflrf = function _palette(palette0,paletteInversed){return(
palette0 + paletteInversed
)};
const _16949e = function _legend(directory,period,ressource,variable,palette,range,numcolorbands){return(
"https://www.globalcarbonatlas.org:8443/thredds/wms/" +
  directory +
  "/" +
  period +
  "/" +
  ressource +
  "?REQUEST=GetLegendGraphic&LAYER=" +
  variable +
  "&STYLES=raster/" +
  palette +
  "&COLORSCALERANGE=" +
  range +
  "&NUMCOLORBANDS=" +
  numcolorbands +
  "&WIDTH=20&HEIGHT=250"
)};
const _d356vu = function _36(html,legend){return(
html`<img src="${legend}">`
)};
const _1fvd8ns = function _keyword_style(){return(
`style="font-family:Source Sans Pro; font-size: 14px; background: #cdebea"`
)};
const _twde5i = function _38(md){return(
md`<hr>`
)};
const _15tzp0v = async function _L(require,html)
{
  const L = await require("leaflet@1.7.1/dist/leaflet-src.js");
  if (!L._style) {
    var href = await require.resolve("leaflet@1.7.1/dist/leaflet.css");
    document.head.appendChild(
      (L._style = html`<link href=${href} rel=stylesheet>`)
    );
  }

  await require("leaflet-fullscreen@1.0.2").catch(() => L.control.fullscreen);
  var href = await require.resolve(
    "leaflet-fullscreen@1.0.2/dist/leaflet.fullscreen.css"
  );
  document.head.appendChild(html`<link href=${href} rel=stylesheet>`);

  await require("leaflet-timedimension@1.1.1").catch(
    () => L.control.fullscreen
  );
  var href = await require.resolve(
    "leaflet-timedimension@1.1.1/dist/leaflet.timedimension.control.min.css"
  );
  document.head.appendChild(html`<link href=${href} rel=stylesheet>`);

  await require("leaflet.sync@0.2.4").catch(() => L.sync);

  await require("leaflet.control.resizer@0.0.1").catch(() => L.control.resizer);
  var href = await require.resolve(
    "leaflet.control.resizer@0.0.1/L.Control.Resizer.css"
  );
  document.head.appendChild(html`<link href=${href} rel=stylesheet>`);

  return L;
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @mootari/range-slider", async () => runtime.module((await import("/@mootari/range-slider.js?v=4")).default));  
  $def("_v69p9p", null, ["md","keyword_style"], _v69p9p);  
  $def("_kepo4i", null, ["md"], _kepo4i);  
  $def("_sayfo", null, ["md"], _sayfo);  
  $def("_1bjhldx", "viewof layers", ["Inputs","layersArray"], _1bjhldx);  
  $def("_1ryz62y", "layers", ["Generators","viewof layers"], _1ryz62y);  
  $def("_5f17nc", "viewof palette0", ["Inputs","palettesArray"], _5f17nc);  
  $def("_hf7n5", "palette0", ["Generators","viewof palette0"], _hf7n5);  
  $def("_1y9f4a8", "viewof paletteInversed", ["Inputs"], _1y9f4a8);  
  $def("_1lkhijd", "paletteInversed", ["Generators","viewof paletteInversed"], _1lkhijd);  
  $def("_1eivbrb", "viewof opacity", ["Inputs"], _1eivbrb);  
  $def("_18vvetv", "opacity", ["Generators","viewof opacity"], _18vvetv);  
  $def("_1c0ux27", "viewof numcolorbands", ["Inputs"], _1c0ux27);  
  $def("_1vft08r", "numcolorbands", ["Generators","viewof numcolorbands"], _1vft08r);  
  $def("_kepwyg", "viewof directory", ["Inputs","dirsArray"], _kepwyg);  
  $def("_jnt0bt", "directory", ["Generators","viewof directory"], _jnt0bt);  
  $def("_cml8ve", "viewof period", ["Inputs"], _cml8ve);  
  $def("_14arai5", "period", ["Generators","viewof period"], _14arai5);  
  $def("_139pggy", "viewof ressource", ["Inputs","ressourcesArray"], _139pggy);  
  $def("_12du9ot", "ressource", ["Generators","viewof ressource"], _12du9ot);  
  $def("_1kmn2nq", "viewof variable", ["variablesArray","Inputs"], _1kmn2nq);  
  $def("_11gvkq4", "variable", ["Generators","viewof variable"], _11gvkq4);  
  $def("_1siulf4", "viewof rangeFrom", ["Inputs"], _1siulf4);  
  $def("_1gznmn7", "rangeFrom", ["Generators","viewof rangeFrom"], _1gznmn7);  
  $def("_ky3o1t", "viewof range", ["rangeFrom","rangeVariable","rangeSlider"], _ky3o1t);  
  $def("_c3tlqv", "range", ["Generators","viewof range"], _c3tlqv);  
  $def("_18y3xrz", "map", ["html","legend","L","timeVariable","directory","period","ressource","variable","range","numcolorbands","palette","opacity","layers"], _18y3xrz);  
  $def("_px6359", null, ["md"], _px6359);  
  $def("_xon5c1", null, ["md"], _xon5c1);  
  $def("_1scduy2", "mapsSelectionButtons", ["Inputs","mutable mapsArrayMutable","mapsArrayMutable","addMap"], _1scduy2);  
  $def("_5m0q2i", null, ["md","payload"], _5m0q2i);  
  $def("_1dtcob8", "allmaps", ["html","mapsArray","L","layers"], _1dtcob8);  
  $def("_1yo4kcv", "payload", ["mapsArrayMutable"], _1yo4kcv);  
  $def("_6yrg0c", "addMap", ["directory","ressource","period","variable","timeVariable","range","palette","numcolorbands","opacity"], _6yrg0c);  
  $def("_1e3uz7y", "mapsArray", ["URLSearchParams","location","mapsArrayMutable"], _1e3uz7y);  
  $def("_1yc92by", "mapsArrayStatic", [], _1yc92by);  
  $def("_kyk7ko", "initial mapsArrayMutable", [], _kyk7ko);  
  $def("_d05q4o", "mutable mapsArrayMutable", ["Mutable","initial mapsArrayMutable"], _d05q4o);  
  $def("_12kl9wt", "mapsArrayMutable", ["mutable mapsArrayMutable"], _12kl9wt);  
  $def("_1sa71c9", null, ["md"], _1sa71c9);  
  $def("_zsth0r", "dirsArray", ["DOMParser"], _zsth0r);  
  $def("_1vwjfjk", "ressourcesArray", ["directory","period","DOMParser"], _1vwjfjk);  
  $def("_db983y", "variablesArray", ["directory","period","ressource","DOMParser"], _db983y);  
  $def("_121oqyw", "timeVariable", ["directory","period","ressource","DOMParser"], _121oqyw);  
  $def("_7e63m6", "rangeVariable", ["directory","period","ressource","variable"], _7e63m6);  
  $def("_tyb0i9", "layersArray", [], _tyb0i9);  
  $def("_1o3zu4r", "palettesArray", [], _1o3zu4r);  
  $def("_1pcflrf", "palette", ["palette0","paletteInversed"], _1pcflrf);  
  $def("_16949e", "legend", ["directory","period","ressource","variable","palette","range","numcolorbands"], _16949e);  
  $def("_d356vu", null, ["html","legend"], _d356vu);  
  $def("_1fvd8ns", "keyword_style", [], _1fvd8ns);  
  $def("_twde5i", null, ["md"], _twde5i);  
  $def("_15tzp0v", "L", ["require","html"], _15tzp0v);  
  main.define("rangeSlider", ["module @mootari/range-slider", "@variable"], (_, v) => v.import("rangeSlider", _));
  return main;
}