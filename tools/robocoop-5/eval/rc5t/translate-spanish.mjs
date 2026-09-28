// rc5-train eval (20260928-0847-m23): translate an existing notebook's text into Spanish without breaking it.
// setup.files seeds @user/aqi: @tomlarkworthy/aqi_no_loop_breaking (lopebooks/notebooks/
// @tomlarkworthy_aqi_no_loop_breaking.html, lopebooks 69005472), with the one-line debug md cell turned into a
// prose sentence with three live holes (pm25, AQI, category name) and the two slider labels / two axis labels
// spelled out in English words (the originals were acronyms). Provenance: fixtures/PROVENANCE.txt.
//
// setup.collect observes every cell of @user/aqi (anonymous cells as observed clones), then scores:
//   spanish  — none of the fixture's English phrases remain in md text, chart text, slider or axis labels, and
//              the md text is Spanish by a stopword ratio (no model grades it)
//   holes    — drive the PM2.5 slider to 35 then 100: the prose must show 35/99 then 100/174 and the category
//              name the live `categories` value gives for that AQI (a literal flattened at translation time fails)
//   labels   — both slider labels and both axis labels changed away from English and non-empty
//   chart    — same marks as the original: 6 rects whose strokes are the original CSS colours (colour names are
//              identifiers, not prose: "verde" is not a colour), 1 line, 1 dot that moves, 12 category labels equal
//              to the live category names
//   names    — the named cells are unchanged (other code may import them)
//   markdown — links, heading and code spans still render; no raw **, ` or ${ in rendered text
//   errors   — no cell errors, anonymous included
// Category names ("Good" …) are display-only (read by Plot.text and the hole), so translating them is expected.
// Object keys (pm25, AQI, max, color, name) and colour values are logic and must stay.
const FIXTURE = "const _jclaoh = function _1(md){return(\nmd`# PM2.5 to AQI Conversion\n\nMy home weather station measures PM2.5 concentration in micrograms per cubic meter (μg/m³). But if I’m concerned about air quality, I want to know the Air Quality Index (AQI). AQI is a policy tool and as such has a complicated definition. So, here’s a tool to convert between PM2.5 and AQI (assuming that PM2.5 is the only pollutant you care about).`\n)};\nconst _1bo40ge = function _2(md){return(\nmd`Drag either slider below to choose the selected PM2.5 or AQI.`\n)};\nconst _1tcoky6 = function _3(md,data,categories){return(\nmd`At **${data.pm25} μg/m³** of PM2.5, the Air Quality Index is **${data.AQI}**, which means the air quality is “${(categories.find(c => data.AQI <= c.max) ?? categories[categories.length - 1]).name}”.`\n)};\nconst _6klsgc = function _data(Inputs){return(\nInputs.input({\n  pm25: 50,\n  AQI: 250\n})\n)};\nconst _q0r7f0 = (G, _) => G.input(_);\nconst _1sizgv5 = function _5(bind,Inputs,$0,pm25_aqi){return(\nbind(\n  Inputs.range([0, 500], { label: \"PM2.5 concentration (μg/m³)\", value: 50, step: 0.1 }),\n  $0,\n  {\n    transform: (d) => d.pm25,\n    invert: (pm25) => ({\n      pm25: pm25,\n      AQI: pm25_aqi(pm25)\n    })\n  }\n)\n)};\nconst _rctuwq = function _6(bind,Inputs,$0,aqi_pm25){return(\nbind(Inputs.range([0, 500], { label: \"Air Quality Index\", step: 1 }), $0, {\n  transform: (d) => d.AQI,\n  invert: (aqi) => ({\n    pm25: aqi_pm25(aqi),\n    AQI: aqi\n  })\n})\n)};\nconst _17n45h8 = function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,data){return(\nPlot.plot({\n  grid: true,\n  x: {\n    label: \"PM2.5 concentration (μg/m³) →\"\n  },\n  y: {\n    label: \"↑ Air Quality Index\"\n  },\n  color: {\n    type: \"identity\"\n  },\n  marks: [\n    Plot.rect(categories, {\n      x1: 0,\n      x2: (d) => aqi_pm25(d.max),\n      y1: 0,\n      y2: \"max\",\n      stroke: \"color\",\n      strokeWidth: 3,\n      reverse: true\n    }),\n    Plot.line(d3.range(501), {\n      x: (d) => d,\n      y: pm25_aqi\n    }),\n    Plot.dot([[data.pm25, data.AQI]]),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      stroke: \"white\",\n      strokeWidth: 3,\n      strokeLinejoin: \"round\",\n      dx: 4,\n      dy: 12\n    }),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      dx: 4,\n      dy: 12\n    })\n  ]\n})\n)};\nconst _me7d6m = function _8(md){return(\nmd`The cell below defines the six official [Air Quality Index (AQI) categories](https://www.airnow.gov/aqi/aqi-basics/): “Each category corresponds to a different level of health concern. Each category also has a specific color. The color makes it easy for people to quickly determine whether air quality is reaching unhealthy levels in their communities.”`\n)};\nconst _zn2jku = function _categories(){return(\n[\n  {max: 50, color: \"green\", name: \"Good\"},\n  {max: 100, color: \"yellow\", name: \"Moderate\"},\n  {max: 150, color: \"orange\", name: \"Unhealthy for sensitive groups\"},\n  {max: 200, color: \"red\", name: \"Unhealthy\"},\n  {max: 300, color: \"purple\", name: \"Very unhealthy\"},\n  {max: 500, color: \"maroon\", name: \"Hazardous\"}\n]\n)};\nconst _18c2ed1 = function _10(md){return(\nmd`The \\`pm25_aqi\\` function converts from a PM2.5 concentration in micrograms per cubic meter to the corresponding AQI value (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`aqi_pm25\\`.`\n)};\nconst _1v04v34 = function _pm25_aqi(lerp){return(\nfunction pm25_aqi(pm25) {\n  const c = Math.floor(10 * pm25) / 10;\n  const a = c < 0 ? 0 // values below 0 are considered beyond AQI\n    : c <  12.1 ? lerp(  0,  50,   0.0,  12.0, c)\n    : c <  35.5 ? lerp( 51, 100,  12.1,  35.4, c)\n    : c <  55.5 ? lerp(101, 150,  35.5,  55.4, c)\n    : c < 150.5 ? lerp(151, 200,  55.5, 150.4, c)\n    : c < 250.5 ? lerp(201, 300, 150.5, 250.4, c)\n    : c < 350.5 ? lerp(301, 400, 250.5, 350.4, c)\n    : c < 500.5 ? lerp(401, 500, 350.5, 500.4, c)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.round(a);\n}\n)};\nconst _hkqgrd = function _12(md){return(\nmd`The \\`aqi_pm25\\` function converts from an AQI value to the corresponding PM2.5 concentration in micrograms per cubic meter (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`pm25_aqi\\`.`\n)};\nconst _1tqcgw3 = function _aqi_pm25(lerp){return(\nfunction aqi_pm25(aqi) {\n  const a = Math.round(aqi);\n  const c = a < 0 ? 0 // values below 0 are considered beyond AQI\n    : a <=  50 ? lerp(  0.0,  12.0,   0,  50, a)\n    : a <= 100 ? lerp( 12.1,  35.4,  51, 100, a)\n    : a <= 150 ? lerp( 35.5,  55.4, 101, 150, a)\n    : a <= 200 ? lerp( 55.5, 150.4, 151, 200, a)\n    : a <= 300 ? lerp(150.5, 250.4, 201, 300, a)\n    : a <= 400 ? lerp(250.5, 350.4, 301, 400, a)\n    : a <= 500 ? lerp(350.5, 500.4, 401, 500, a)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.floor(10 * c) / 10;\n}\n)};\nconst _1v4p2ht = function _14(md){return(\nmd`The \\`lerp\\` function is like d3.scaleLinear, redux.`\n)};\nconst _1n6puuj = function _lerp(){return(\nfunction lerp(ylo, yhi, xlo, xhi, x) {\n  return ((x - xlo) / (xhi - xlo)) * (yhi - ylo) + ylo;\n}\n)};\nconst _133w3ev = function _16(md){return(\nmd`The \\`bind\\` function is like [Inputs.bind](https://github.com/observablehq/inputs/blob/main/README.md#bind), except it applies a transform to convert between units, and only propagates on trusted events. This way when the user interacts with the target, it’ll propagate to the source, but the source won’t propagate back to the target. This transform needs to be invertible so that you can drag either range input to affect the other.`\n)};\nconst _1750m2n = function _bind(Inputs,Event){return(\nfunction bind(\n  target,\n  source,\n  {\n    invalidation = Inputs.disposal(target),\n    transform = (d) => d,\n    invert = (d) => d\n  } = {}\n) {\n  const onsource = (event) => {\n    target.value = transform(source.value);\n  };\n  const ontarget = (event) => {\n    source.value = invert(target.value);\n    source.dispatchEvent(new Event(\"input\", { bubbles: true }));\n  };\n  onsource({});\n  target.addEventListener(\"input\", ontarget);\n  source.addEventListener(\"input\", onsource);\n  invalidation.then(() => source.removeEventListener(\"input\", onsource));\n  return target;\n}\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_jclaoh\", null, [\"md\"], _jclaoh);  \n  $def(\"_1bo40ge\", null, [\"md\"], _1bo40ge);  \n  $def(\"_1tcoky6\", null, [\"md\",\"data\",\"categories\"], _1tcoky6);  \n  $def(\"_6klsgc\", \"viewof data\", [\"Inputs\"], _6klsgc);  \n  $def(\"_q0r7f0\", \"data\", [\"Generators\",\"viewof data\"], _q0r7f0);  \n  $def(\"_1sizgv5\", null, [\"bind\",\"Inputs\",\"viewof data\",\"pm25_aqi\"], _1sizgv5);  \n  $def(\"_rctuwq\", null, [\"bind\",\"Inputs\",\"viewof data\",\"aqi_pm25\"], _rctuwq);  \n  $def(\"_17n45h8\", null, [\"Plot\",\"categories\",\"aqi_pm25\",\"d3\",\"pm25_aqi\",\"data\"], _17n45h8);  \n  $def(\"_me7d6m\", null, [\"md\"], _me7d6m);  \n  $def(\"_zn2jku\", \"categories\", [], _zn2jku);  \n  $def(\"_18c2ed1\", null, [\"md\"], _18c2ed1);  \n  $def(\"_1v04v34\", \"pm25_aqi\", [\"lerp\"], _1v04v34);  \n  $def(\"_hkqgrd\", null, [\"md\"], _hkqgrd);  \n  $def(\"_1tqcgw3\", \"aqi_pm25\", [\"lerp\"], _1tqcgw3);  \n  $def(\"_1v4p2ht\", null, [\"md\"], _1v4p2ht);  \n  $def(\"_1n6puuj\", \"lerp\", [], _1n6puuj);  \n  $def(\"_133w3ev\", null, [\"md\"], _133w3ev);  \n  $def(\"_1750m2n\", \"bind\", [\"Inputs\",\"Event\"], _1750m2n);\n  return main;\n}\n";
const SPANISH = "const _jclaoh = function _1(md){return(\nmd`# Conversión de PM2.5 a AQI\n\nMi estación meteorológica casera mide la concentración de PM2.5 en microgramos por metro cúbico (μg/m³). Pero si me preocupa la calidad del aire, quiero conocer el Índice de Calidad del Aire (AQI). El AQI es una herramienta de política pública y, como tal, tiene una definición complicada. Así que aquí hay una herramienta para convertir entre PM2.5 y AQI (suponiendo que el PM2.5 es el único contaminante que te importa).`\n)};\nconst _1bo40ge = function _2(md){return(\nmd`Arrastra cualquiera de los dos controles deslizantes para elegir el valor de PM2.5 o de AQI.`\n)};\nconst _1tcoky6 = function _3(md,data,categories){return(\nmd`Con **${data.pm25} μg/m³** de PM2.5, el Índice de Calidad del Aire es **${data.AQI}**, lo que significa que la calidad del aire es “${(categories.find(c => data.AQI <= c.max) ?? categories[categories.length - 1]).name}”.`\n)};\nconst _6klsgc = function _data(Inputs){return(\nInputs.input({\n  pm25: 50,\n  AQI: 250\n})\n)};\nconst _q0r7f0 = (G, _) => G.input(_);\nconst _1sizgv5 = function _5(bind,Inputs,$0,pm25_aqi){return(\nbind(\n  Inputs.range([0, 500], { label: \"Concentración de PM2.5 (μg/m³)\", value: 50, step: 0.1 }),\n  $0,\n  {\n    transform: (d) => d.pm25,\n    invert: (pm25) => ({\n      pm25: pm25,\n      AQI: pm25_aqi(pm25)\n    })\n  }\n)\n)};\nconst _rctuwq = function _6(bind,Inputs,$0,aqi_pm25){return(\nbind(Inputs.range([0, 500], { label: \"Índice de Calidad del Aire\", step: 1 }), $0, {\n  transform: (d) => d.AQI,\n  invert: (aqi) => ({\n    pm25: aqi_pm25(aqi),\n    AQI: aqi\n  })\n})\n)};\nconst _17n45h8 = function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,data){return(\nPlot.plot({\n  grid: true,\n  x: {\n    label: \"Concentración de PM2.5 (μg/m³) →\"\n  },\n  y: {\n    label: \"↑ Índice de Calidad del Aire\"\n  },\n  color: {\n    type: \"identity\"\n  },\n  marks: [\n    Plot.rect(categories, {\n      x1: 0,\n      x2: (d) => aqi_pm25(d.max),\n      y1: 0,\n      y2: \"max\",\n      stroke: \"color\",\n      strokeWidth: 3,\n      reverse: true\n    }),\n    Plot.line(d3.range(501), {\n      x: (d) => d,\n      y: pm25_aqi\n    }),\n    Plot.dot([[data.pm25, data.AQI]]),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      stroke: \"white\",\n      strokeWidth: 3,\n      strokeLinejoin: \"round\",\n      dx: 4,\n      dy: 12\n    }),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      dx: 4,\n      dy: 12\n    })\n  ]\n})\n)};\nconst _me7d6m = function _8(md){return(\nmd`La celda de abajo define las seis [categorías oficiales del Índice de Calidad del Aire (AQI)](https://www.airnow.gov/aqi/aqi-basics/): «Cada categoría corresponde a un nivel distinto de riesgo para la salud. Cada categoría tiene además un color propio. El color permite que la gente vea rápidamente si la calidad del aire está llegando a niveles insalubres en su comunidad.»`\n)};\nconst _zn2jku = function _categories(){return(\n[\n  {max: 50, color: \"green\", name: \"Buena\"},\n  {max: 100, color: \"yellow\", name: \"Moderada\"},\n  {max: 150, color: \"orange\", name: \"Dañina para grupos sensibles\"},\n  {max: 200, color: \"red\", name: \"Dañina\"},\n  {max: 300, color: \"purple\", name: \"Muy dañina\"},\n  {max: 500, color: \"maroon\", name: \"Peligrosa\"}\n]\n)};\nconst _18c2ed1 = function _10(md){return(\nmd`La función \\`pm25_aqi\\` convierte una concentración de PM2.5 en microgramos por metro cúbico al valor de AQI correspondiente (suponiendo que el PM2.5 es el único contribuyente al AQI). Es la inversa de \\`aqi_pm25\\`.`\n)};\nconst _1v04v34 = function _pm25_aqi(lerp){return(\nfunction pm25_aqi(pm25) {\n  const c = Math.floor(10 * pm25) / 10;\n  const a = c < 0 ? 0 // values below 0 are considered beyond AQI\n    : c <  12.1 ? lerp(  0,  50,   0.0,  12.0, c)\n    : c <  35.5 ? lerp( 51, 100,  12.1,  35.4, c)\n    : c <  55.5 ? lerp(101, 150,  35.5,  55.4, c)\n    : c < 150.5 ? lerp(151, 200,  55.5, 150.4, c)\n    : c < 250.5 ? lerp(201, 300, 150.5, 250.4, c)\n    : c < 350.5 ? lerp(301, 400, 250.5, 350.4, c)\n    : c < 500.5 ? lerp(401, 500, 350.5, 500.4, c)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.round(a);\n}\n)};\nconst _hkqgrd = function _12(md){return(\nmd`La función \\`aqi_pm25\\` convierte un valor de AQI en la concentración de PM2.5 correspondiente, en microgramos por metro cúbico (suponiendo que el PM2.5 es el único contribuyente al AQI). Es la inversa de \\`pm25_aqi\\`.`\n)};\nconst _1tqcgw3 = function _aqi_pm25(lerp){return(\nfunction aqi_pm25(aqi) {\n  const a = Math.round(aqi);\n  const c = a < 0 ? 0 // values below 0 are considered beyond AQI\n    : a <=  50 ? lerp(  0.0,  12.0,   0,  50, a)\n    : a <= 100 ? lerp( 12.1,  35.4,  51, 100, a)\n    : a <= 150 ? lerp( 35.5,  55.4, 101, 150, a)\n    : a <= 200 ? lerp( 55.5, 150.4, 151, 200, a)\n    : a <= 300 ? lerp(150.5, 250.4, 201, 300, a)\n    : a <= 400 ? lerp(250.5, 350.4, 301, 400, a)\n    : a <= 500 ? lerp(350.5, 500.4, 401, 500, a)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.floor(10 * c) / 10;\n}\n)};\nconst _1v4p2ht = function _14(md){return(\nmd`La función \\`lerp\\` es como d3.scaleLinear, en versión reducida.`\n)};\nconst _1n6puuj = function _lerp(){return(\nfunction lerp(ylo, yhi, xlo, xhi, x) {\n  return ((x - xlo) / (xhi - xlo)) * (yhi - ylo) + ylo;\n}\n)};\nconst _133w3ev = function _16(md){return(\nmd`La función \\`bind\\` es como [Inputs.bind](https://github.com/observablehq/inputs/blob/main/README.md#bind), salvo que aplica una transformación para convertir entre unidades y solo propaga los eventos de confianza. Así, cuando el usuario interactúa con el destino, el cambio se propaga a la fuente, pero la fuente no se propaga de vuelta al destino. La transformación debe ser invertible para que se pueda arrastrar cualquiera de los dos controles y mover el otro.`\n)};\nconst _1750m2n = function _bind(Inputs,Event){return(\nfunction bind(\n  target,\n  source,\n  {\n    invalidation = Inputs.disposal(target),\n    transform = (d) => d,\n    invert = (d) => d\n  } = {}\n) {\n  const onsource = (event) => {\n    target.value = transform(source.value);\n  };\n  const ontarget = (event) => {\n    source.value = invert(target.value);\n    source.dispatchEvent(new Event(\"input\", { bubbles: true }));\n  };\n  onsource({});\n  target.addEventListener(\"input\", ontarget);\n  source.addEventListener(\"input\", onsource);\n  invalidation.then(() => source.removeEventListener(\"input\", onsource));\n  return target;\n}\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_jclaoh\", null, [\"md\"], _jclaoh);  \n  $def(\"_1bo40ge\", null, [\"md\"], _1bo40ge);  \n  $def(\"_1tcoky6\", null, [\"md\",\"data\",\"categories\"], _1tcoky6);  \n  $def(\"_6klsgc\", \"viewof data\", [\"Inputs\"], _6klsgc);  \n  $def(\"_q0r7f0\", \"data\", [\"Generators\",\"viewof data\"], _q0r7f0);  \n  $def(\"_1sizgv5\", null, [\"bind\",\"Inputs\",\"viewof data\",\"pm25_aqi\"], _1sizgv5);  \n  $def(\"_rctuwq\", null, [\"bind\",\"Inputs\",\"viewof data\",\"aqi_pm25\"], _rctuwq);  \n  $def(\"_17n45h8\", null, [\"Plot\",\"categories\",\"aqi_pm25\",\"d3\",\"pm25_aqi\",\"data\"], _17n45h8);  \n  $def(\"_me7d6m\", null, [\"md\"], _me7d6m);  \n  $def(\"_zn2jku\", \"categories\", [], _zn2jku);  \n  $def(\"_18c2ed1\", null, [\"md\"], _18c2ed1);  \n  $def(\"_1v04v34\", \"pm25_aqi\", [\"lerp\"], _1v04v34);  \n  $def(\"_hkqgrd\", null, [\"md\"], _hkqgrd);  \n  $def(\"_1tqcgw3\", \"aqi_pm25\", [\"lerp\"], _1tqcgw3);  \n  $def(\"_1v4p2ht\", null, [\"md\"], _1v4p2ht);  \n  $def(\"_1n6puuj\", \"lerp\", [], _1n6puuj);  \n  $def(\"_133w3ev\", null, [\"md\"], _133w3ev);  \n  $def(\"_1750m2n\", \"bind\", [\"Inputs\",\"Event\"], _1750m2n);\n  return main;\n}\n";

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/aqi")); })()`;

const COLLECT = String.raw`(async () => {
  const ENGLISH = ["My home weather station", "Drag either slider", "the Air Quality Index is", "which means the air quality",
    "The cell below defines", "Each category corresponds", "health concern", "function converts from", "It is the inverse",
    "is like d3.scaleLinear", "except it applies a transform", "only propagates on trusted", "needs to be invertible",
    "Unhealthy for sensitive groups", "Very unhealthy", "Hazardous", "Moderate", "Air Quality Index", "concentration"];
  const NAMES = ["viewof data", "data", "categories", "pm25_aqi", "aqi_pm25", "lerp", "bind"];
  const COLOURS = ["green", "yellow", "orange", "red", "purple", "maroon"];
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const out = { spanish: "not run", holes: "not run", labels: "not run", chart: "not run", names: "not run", markdown: "not run", errors: "not run", verdict: "not run" };
  const mod = rt.mains.get("@user/aqi");
  if (!mod) { out.verdict = "no @user/aqi module"; return out; }
  const own = () => [...mod._runtime._variables].filter(v => v._module === mod && !v.__rc5tClone && !String(v._name ?? "").startsWith("module ") && v._name !== "@variable");
  const keepers = [], clones = [];
  for (const v of own()) {
    try {
      if (v._name) keepers.push(mod.variable(true).define([v._name], x => x));
      else if (typeof v._definition === "function") {
        const c = mod.variable(true).define(null, v._inputs.map(i => i._name), v._definition);
        c.__rc5tClone = true; clones.push(c);
      }
    } catch (e) {}
  }
  const live = () => [...own().filter(v => v._name), ...clones];
  const els = () => live().map(v => v._value).filter(x => x instanceof Element);
  const forms = () => els().filter(e => e.querySelector?.("input[type=range]"));
  const svgs = () => els().flatMap(e => e.matches("svg") ? [e] : [...e.querySelectorAll("svg")]).filter(s => s.querySelector("[aria-label=rect], [aria-label=dot]"));
  const mdEls = () => els().filter(e => !e.querySelector("input, svg") && !e.matches("input, svg, form"));
  const mdText = () => mdEls().map(e => e.textContent).join("\n");
  const errSeen = new Set();
  const noteErrs = () => { for (const v of live()) if (v._error != null) errSeen.add((v._name || "(anonymous)") + ": " + String(v._error?.message ?? v._error).slice(0, 160)); };
  const settle = async () => { await sleep(1000); noteErrs(); };
  const catVal = () => own().find(v => v._name === "categories")?._value;
  const labelOf = f => (f.querySelector("label")?.textContent ?? "").trim();
  const chartRead = s => ({
    rects: [...s.querySelectorAll("[aria-label=rect] rect")].map(r => r.getAttribute("stroke") ?? r.parentNode.getAttribute("stroke")),
    lines: s.querySelectorAll("[aria-label=line] path").length,
    dots: [...s.querySelectorAll("[aria-label=dot] circle")].map(c => c.getAttribute("cx") + "," + c.getAttribute("cy")),
    texts: [...s.querySelectorAll("[aria-label=text] text")].map(t => t.textContent),
    xlabel: [...s.querySelectorAll("[aria-label='x-axis label'] text")].map(t => t.textContent).join(" ").trim(),
    ylabel: [...s.querySelectorAll("[aria-label='y-axis label'] text")].map(t => t.textContent).join(" ").trim(),
  });
  try {
    await sleep(1500); noteErrs();
    // names
    const have = new Set(own().map(v => v._name).filter(Boolean));
    const missing = NAMES.filter(n => !have.has(n));
    out.names = missing.length ? "missing named cells: " + missing.join(", ") : "ok";
    // chart + labels, before driving
    const s0 = svgs()[0], c0 = s0 ? chartRead(s0) : null;
    const fs = forms();
    const pmForm = fs.find(f => f.querySelector("input[type=range]")?.getAttribute("step") === "0.1");
    const aqiForm = fs.find(f => f !== pmForm && f.querySelector("input[type=range]")?.getAttribute("step") === "1");
    const labels = { pm25Slider: pmForm ? labelOf(pmForm) : null, aqiSlider: aqiForm ? labelOf(aqiForm) : null, xAxis: c0?.xlabel ?? null, yAxis: c0?.ylabel ?? null };
    out.labelTexts = labels;
    const badLabels = Object.entries(labels).filter(([k, t]) => !t || /Air Quality Index|concentration/i.test(t)).map(([k, t]) => k + "=" + JSON.stringify(t));
    out.labels = badLabels.length ? "not translated / missing: " + badLabels.join(", ") : "ok";
    // spanish
    const all = [mdText(), ...(c0 ? c0.texts : []), ...Object.values(labels).map(x => x ?? "")].join("\n");
    const left = ENGLISH.filter(p => all.includes(p));
    const words = mdText().toLowerCase().match(/\p{L}+/gu) || [];
    const ES = new Set(["de", "la", "el", "que", "en", "los", "las", "un", "una", "es", "por", "con", "para", "del", "se", "y", "al", "lo", "su", "como", "si"]);
    const EN = new Set(["the", "and", "is", "of", "to", "you", "it", "that", "this", "which", "from", "an", "in", "for", "with", "my", "if"]);
    const es = words.filter(w => ES.has(w)).length / Math.max(1, words.length), en = words.filter(w => EN.has(w)).length / Math.max(1, words.length);
    out.ratios = { words: words.length, es: +es.toFixed(3), en: +en.toFixed(3) };
    out.spanish = left.length ? "English left: " + left.join(" | ") : es < 0.1 ? "Spanish stopword ratio " + es.toFixed(3) + " < 0.10" : en > 0.03 ? "English stopword ratio " + en.toFixed(3) + " > 0.03" : "ok";
    // markdown intact
    const md = mdEls();
    const mdBad = [];
    if (!md.some(e => e.querySelector("a[href*='airnow.gov']"))) mdBad.push("airnow link gone");
    if (!md.some(e => e.querySelector("a[href*='observablehq/inputs']"))) mdBad.push("Inputs.bind link gone");
    if (!md.some(e => e.querySelector("h1") || e.matches("h1"))) mdBad.push("no h1");
    const codes = md.flatMap(e => [...e.querySelectorAll("code")]).length;
    if (codes < 6) mdBad.push(codes + " code spans (was 7)");
    if (/\*\*|\$\{/.test(mdText()) || mdText().includes(String.fromCharCode(96))) mdBad.push("raw markdown or hole syntax in rendered text");
    out.markdown = mdBad.length ? mdBad.join("; ") : "ok";
    // holes: drive the PM2.5 slider
    if (!pmForm) out.holes = "no PM2.5 slider (range with step 0.1)";
    else {
      const drive = async x => { pmForm.value = x; pmForm.dispatchEvent(new Event("input", { bubbles: true })); await settle(); };
      const cats = catVal();
      const catFor = aqi => (cats.find(c => aqi <= c.max) ?? cats[cats.length - 1]).name;
      const res = [];
      const dots = [];
      for (const [pm, aqi, notAqi] of [[35, 99, 250], [100, 174, 99]]) {
        await drive(pm);
        const t = mdText(), name = catFor(aqi);
        const ok = new RegExp("\\b" + pm + "\\b").test(t) && new RegExp("\\b" + aqi + "\\b").test(t) && !new RegExp("\\b" + notAqi + "\\b").test(t) && t.includes(name);
        res.push(ok ? "ok" : "at PM2.5=" + pm + " expected " + pm + ", AQI " + aqi + " and “" + name + "” in the prose (and no " + notAqi + ")");
        const s = svgs()[0]; dots.push(s ? chartRead(s).dots.join(";") : "");
      }
      out.dotPositions = dots;
      out.holes = res.every(r => r === "ok") ? "ok" : res.filter(r => r !== "ok").join("; ");
      out.holeText = mdEls().map(e => e.textContent).find(t => /\b174\b/.test(t))?.slice(0, 240) ?? mdText().slice(0, 240);
      out.dotMoves = dots[0] !== dots[1] && dots.every(Boolean);
    }
    // chart marks
    const s1 = svgs()[0];
    if (!s1) out.chart = "no chart";
    else {
      const c = chartRead(s1), cats = catVal() || [];
      const bad = [];
      if (c.rects.length !== 6) bad.push(c.rects.length + " rects (want 6)");
      const strokes = [...c.rects].map(x => String(x).toLowerCase()).sort().join(",");
      if (strokes !== [...COLOURS].sort().join(",")) bad.push("rect strokes " + strokes + " (want " + COLOURS.join(",") + ")");
      if (c.lines !== 1) bad.push(c.lines + " lines");
      if (c.dots.length !== 1) bad.push(c.dots.length + " dots");
      if (!out.dotMoves) bad.push("the dot did not move with the slider");
      const names = cats.map(d => d.name);
      if (c.texts.length !== 12 || !c.texts.every(t => t && names.includes(t))) bad.push("category labels " + JSON.stringify(c.texts.slice(0, 6)) + " vs categories " + JSON.stringify(names));
      out.chart = bad.length ? bad.join("; ") : "ok";
    }
    noteErrs();
    out.errors = errSeen.size ? [...errSeen].join("; ") : "none";
    out.verdict = ["spanish", "holes", "labels", "chart", "names", "markdown"].every(k => out[k] === "ok") && out.errors === "none" ? "ok" : "not ok";
    return out;
  } catch (e) { out.verdict = "collect threw: " + (e?.message ?? e); return out; }
  finally { for (const k of [...keepers, ...clones]) { try { k.delete(); } catch {} } }
})()`;

export default {
  id: "rc5t-translate-spanish",
  category: "rc5-train",
  question: "Translate all the text in my notebook into Spanish. The charts and numbers must keep working.",
  setup: { files: { "/src/@user/aqi.js": FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "verdict", equals: "ok" }, weight: 7 },
    { name: "collected_equals", args: { key: "spanish", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "holes", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "labels", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "chart", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "names", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "markdown", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "errors", equals: "none" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/aqi.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/aqi.js", content: SPANISH } },
    { assistant: "Traduje al español todo el texto de @user/aqi: las celdas de markdown, las etiquetas de los controles y de los ejes, y los nombres de las categorías. Los nombres de las celdas, las claves de los datos y los colores no cambian, y los valores interpolados siguen actualizándose." },
  ],
};
