const _jclaoh = function _1(md){return(
md`# PM2.5 to AQI Conversion

My home weather station measures PM2.5 concentration in micrograms per cubic meter (μg/m³). But if I’m concerned about air quality, I want to know the Air Quality Index (AQI). AQI is a policy tool and as such has a complicated definition. So, here’s a tool to convert between PM2.5 and AQI (assuming that PM2.5 is the only pollutant you care about).`
)};
const _1bo40ge = function _2(md){return(
md`Drag either slider below to choose the selected PM2.5 or AQI.`
)};
const _1tcoky6 = function _3(md,data){return(
md`data.pm25: ${data.pm25} data.AQI: ${data.AQI}`
)};
const _6klsgc = function _data(Inputs){return(
Inputs.input({
  pm25: 50,
  AQI: 250
})
)};
const _q0r7f0 = (G, _) => G.input(_);
const _1sizgv5 = function _5(bind,Inputs,$0,pm25_aqi){return(
bind(
  Inputs.range([0, 500], { label: "PM2.5 (μg/m³)", value: 50, step: 0.1 }),
  $0,
  {
    transform: (d) => d.pm25,
    invert: (pm25) => ({
      pm25: pm25,
      AQI: pm25_aqi(pm25)
    })
  }
)
)};
const _rctuwq = function _6(bind,Inputs,$0,aqi_pm25){return(
bind(Inputs.range([0, 500], { label: "AQI", step: 1 }), $0, {
  transform: (d) => d.AQI,
  invert: (aqi) => ({
    pm25: aqi_pm25(aqi),
    AQI: aqi
  })
})
)};
const _17n45h8 = function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,data){return(
Plot.plot({
  grid: true,
  x: {
    label: "PM2.5 →"
  },
  y: {
    label: "↑ AQI"
  },
  color: {
    type: "identity"
  },
  marks: [
    Plot.rect(categories, {
      x1: 0,
      x2: (d) => aqi_pm25(d.max),
      y1: 0,
      y2: "max",
      stroke: "color",
      strokeWidth: 3,
      reverse: true
    }),
    Plot.line(d3.range(501), {
      x: (d) => d,
      y: pm25_aqi
    }),
    Plot.dot([[data.pm25, data.AQI]]),
    Plot.text(categories, {
      x: 0,
      y: "max",
      text: "name",
      textAnchor: "start",
      stroke: "white",
      strokeWidth: 3,
      strokeLinejoin: "round",
      dx: 4,
      dy: 12
    }),
    Plot.text(categories, {
      x: 0,
      y: "max",
      text: "name",
      textAnchor: "start",
      dx: 4,
      dy: 12
    })
  ]
})
)};
const _me7d6m = function _8(md){return(
md`The cell below defines the six official [Air Quality Index (AQI) categories](https://www.airnow.gov/aqi/aqi-basics/): “Each category corresponds to a different level of health concern. Each category also has a specific color. The color makes it easy for people to quickly determine whether air quality is reaching unhealthy levels in their communities.”`
)};
const _zn2jku = function _categories(){return(
[
  {max: 50, color: "green", name: "Good"},
  {max: 100, color: "yellow", name: "Moderate"},
  {max: 150, color: "orange", name: "Unhealthy for sensitive groups"},
  {max: 200, color: "red", name: "Unhealthy"},
  {max: 300, color: "purple", name: "Very unhealthy"},
  {max: 500, color: "maroon", name: "Hazardous"}
]
)};
const _18c2ed1 = function _10(md){return(
md`The \`pm25_aqi\` function converts from a PM2.5 concentration in micrograms per cubic meter to the corresponding AQI value (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \`aqi_pm25\`.`
)};
const _1v04v34 = function _pm25_aqi(lerp){return(
function pm25_aqi(pm25) {
  const c = Math.floor(10 * pm25) / 10;
  const a = c < 0 ? 0 // values below 0 are considered beyond AQI
    : c <  12.1 ? lerp(  0,  50,   0.0,  12.0, c)
    : c <  35.5 ? lerp( 51, 100,  12.1,  35.4, c)
    : c <  55.5 ? lerp(101, 150,  35.5,  55.4, c)
    : c < 150.5 ? lerp(151, 200,  55.5, 150.4, c)
    : c < 250.5 ? lerp(201, 300, 150.5, 250.4, c)
    : c < 350.5 ? lerp(301, 400, 250.5, 350.4, c)
    : c < 500.5 ? lerp(401, 500, 350.5, 500.4, c)
    : 500; // values above 500 are considered beyond AQI
  return Math.round(a);
}
)};
const _hkqgrd = function _12(md){return(
md`The \`aqi_pm25\` function converts from an AQI value to the corresponding PM2.5 concentration in micrograms per cubic meter (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \`pm25_aqi\`.`
)};
const _1tqcgw3 = function _aqi_pm25(lerp){return(
function aqi_pm25(aqi) {
  const a = Math.round(aqi);
  const c = a < 0 ? 0 // values below 0 are considered beyond AQI
    : a <=  50 ? lerp(  0.0,  12.0,   0,  50, a)
    : a <= 100 ? lerp( 12.1,  35.4,  51, 100, a)
    : a <= 150 ? lerp( 35.5,  55.4, 101, 150, a)
    : a <= 200 ? lerp( 55.5, 150.4, 151, 200, a)
    : a <= 300 ? lerp(150.5, 250.4, 201, 300, a)
    : a <= 400 ? lerp(250.5, 350.4, 301, 400, a)
    : a <= 500 ? lerp(350.5, 500.4, 401, 500, a)
    : 500; // values above 500 are considered beyond AQI
  return Math.floor(10 * c) / 10;
}
)};
const _1v4p2ht = function _14(md){return(
md`The \`lerp\` function is like d3.scaleLinear, redux.`
)};
const _1n6puuj = function _lerp(){return(
function lerp(ylo, yhi, xlo, xhi, x) {
  return ((x - xlo) / (xhi - xlo)) * (yhi - ylo) + ylo;
}
)};
const _133w3ev = function _16(md){return(
md`The \`bind\` function is like [Inputs.bind](https://github.com/observablehq/inputs/blob/main/README.md#bind), except it applies a transform to convert between units, and only propagates on trusted events. This way when the user interacts with the target, it’ll propagate to the source, but the source won’t propagate back to the target. This transform needs to be invertible so that you can drag either range input to affect the other.`
)};
const _1750m2n = function _bind(Inputs,Event){return(
function bind(
  target,
  source,
  {
    invalidation = Inputs.disposal(target),
    transform = (d) => d,
    invert = (d) => d
  } = {}
) {
  const onsource = (event) => {
    target.value = transform(source.value);
  };
  const ontarget = (event) => {
    source.value = invert(target.value);
    source.dispatchEvent(new Event("input", { bubbles: true }));
  };
  onsource({});
  target.addEventListener("input", ontarget);
  source.addEventListener("input", onsource);
  invalidation.then(() => source.removeEventListener("input", onsource));
  return target;
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_jclaoh", null, ["md"], _jclaoh);  
  $def("_1bo40ge", null, ["md"], _1bo40ge);  
  $def("_1tcoky6", null, ["md","data"], _1tcoky6);  
  $def("_6klsgc", "viewof data", ["Inputs"], _6klsgc);  
  $def("_q0r7f0", "data", ["Generators","viewof data"], _q0r7f0);  
  $def("_1sizgv5", null, ["bind","Inputs","viewof data","pm25_aqi"], _1sizgv5);  
  $def("_rctuwq", null, ["bind","Inputs","viewof data","aqi_pm25"], _rctuwq);  
  $def("_17n45h8", null, ["Plot","categories","aqi_pm25","d3","pm25_aqi","data"], _17n45h8);  
  $def("_me7d6m", null, ["md"], _me7d6m);  
  $def("_zn2jku", "categories", [], _zn2jku);  
  $def("_18c2ed1", null, ["md"], _18c2ed1);  
  $def("_1v04v34", "pm25_aqi", ["lerp"], _1v04v34);  
  $def("_hkqgrd", null, ["md"], _hkqgrd);  
  $def("_1tqcgw3", "aqi_pm25", ["lerp"], _1tqcgw3);  
  $def("_1v4p2ht", null, ["md"], _1v4p2ht);  
  $def("_1n6puuj", "lerp", [], _1n6puuj);  
  $def("_133w3ev", null, ["md"], _133w3ev);  
  $def("_1750m2n", "bind", ["Inputs","Event"], _1750m2n);
  return main;
}