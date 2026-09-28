// rc5-train eval (20260928-0847-m6): a maintenance goal, "dragging the slider lags".
// setup.files seeds @user/air-quality: the corpus PM2.5 <-> AQI converter
// (@tomlarkworthy/aqi_no_loop_breaking, lopebooks) plus one seeded dataflow defect. The `exposure`
// cell simulates a year of one-minute readings (525,600, seeded PRNG), converts each to AQI, sorts
// them, and only then counts the readings at or above the slider's AQI. It depends on `data` (the
// slider), so every input event rebuilds and re-sorts the whole year (~170-220 ms in V8). Only the
// final count needs the slider. The fix is to move the build+sort into a cell that does not depend on
// `data`.
// setup.init measures the seeded module before the turn: median time from a real input event on
// the AQI range to the runtime settling (7 events), and the numbers the module shows at AQI 40/100/175.
// setup.collect repeats both after the turn. Pass: median after < 25% of median before (the oracle
// split measures ~10%; see proposal.md), and every number shown before is shown again at the same
// slider value (so shrinking the sample, which changes the percentages, fails).
const FIXTURE = "const _jclaoh = function _1(md){return(\nmd`# PM2.5 to AQI Conversion\n\nMy home weather station measures PM2.5 concentration in micrograms per cubic meter (\u03bcg/m\u00b3). But if I\u2019m concerned about air quality, I want to know the Air Quality Index (AQI). AQI is a policy tool and as such has a complicated definition. So, here\u2019s a tool to convert between PM2.5 and AQI (assuming that PM2.5 is the only pollutant you care about).`\n)};\nconst _1bo40ge = function _2(md){return(\nmd`Drag either slider below to choose the selected PM2.5 or AQI.`\n)};\nconst _1tcoky6 = function _3(md,data){return(\nmd`data.pm25: ${data.pm25} data.AQI: ${data.AQI}`\n)};\nconst _6klsgc = function _data(Inputs){return(\nInputs.input({\n  pm25: 50,\n  AQI: 250\n})\n)};\nconst _q0r7f0 = (G, _) => G.input(_);\nconst _1sizgv5 = function _5(bind,Inputs,$0,pm25_aqi){return(\nbind(\n  Inputs.range([0, 500], { label: \"PM2.5 (\u03bcg/m\u00b3)\", value: 50, step: 0.1 }),\n  $0,\n  {\n    transform: (d) => d.pm25,\n    invert: (pm25) => ({\n      pm25: pm25,\n      AQI: pm25_aqi(pm25)\n    })\n  }\n)\n)};\nconst _rctuwq = function _6(bind,Inputs,$0,aqi_pm25){return(\nbind(Inputs.range([0, 500], { label: \"AQI\", step: 1 }), $0, {\n  transform: (d) => d.AQI,\n  invert: (aqi) => ({\n    pm25: aqi_pm25(aqi),\n    AQI: aqi\n  })\n})\n)};\nconst _17n45h8 = function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,data){return(\nPlot.plot({\n  grid: true,\n  x: {\n    label: \"PM2.5 \u2192\"\n  },\n  y: {\n    label: \"\u2191 AQI\"\n  },\n  color: {\n    type: \"identity\"\n  },\n  marks: [\n    Plot.rect(categories, {\n      x1: 0,\n      x2: (d) => aqi_pm25(d.max),\n      y1: 0,\n      y2: \"max\",\n      stroke: \"color\",\n      strokeWidth: 3,\n      reverse: true\n    }),\n    Plot.line(d3.range(501), {\n      x: (d) => d,\n      y: pm25_aqi\n    }),\n    Plot.dot([[data.pm25, data.AQI]]),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      stroke: \"white\",\n      strokeWidth: 3,\n      strokeLinejoin: \"round\",\n      dx: 4,\n      dy: 12\n    }),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      dx: 4,\n      dy: 12\n    })\n  ]\n})\n)};\nconst _hk7a2c = function _exposure_md(md){return(\nmd`### How often is the air this bad?\n\nThe station logs PM2.5 every minute. Over the last year, this is the share of readings at or above the AQI selected above.`\n)};\nconst _q3m8zt = function _exposure(pm25_aqi,data)\n{\n  // one year of one-minute readings, reproducible (seeded)\n  let seed = 20250101;\n  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);\n  const normal = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());\n  const readings = [];\n  for (let i = 0; i < 365 * 24 * 60; i++) {\n    const hour = (i / 60) % 24;\n    const day = Math.floor(i / 1440);\n    const base = 9 + 5 * Math.sin(((hour - 7) / 24) * 2 * Math.PI) + (day % 7 < 2 ? -2 : 0);\n    const pm25 = Math.round(base * Math.exp(0.8 * normal()) * 10) / 10;\n    readings.push({ time: new Date(Date.UTC(2025, 0, 1) + i * 60000), pm25, aqi: pm25_aqi(pm25) });\n  }\n  readings.sort((a, b) => a.aqi - b.aqi || a.pm25 - b.pm25);\n  const worse = readings.filter((r) => r.aqi >= data.AQI).length;\n  return {\n    worse,\n    total: readings.length,\n    share: worse / readings.length,\n    p95: readings[Math.floor(0.95 * readings.length)].aqi\n  };\n};\nconst _w9d4rn = function _exposure_summary(md,data,exposure){return(\nmd`At AQI **${data.AQI}** or worse: **${(exposure.share * 100).toFixed(2)}%** of readings (${exposure.worse.toLocaleString(\"en-US\")} of ${exposure.total.toLocaleString(\"en-US\")}). The 95th-percentile reading is AQI ${exposure.p95}.`\n)};\nconst _me7d6m = function _8(md){return(\nmd`The cell below defines the six official [Air Quality Index (AQI) categories](https://www.airnow.gov/aqi/aqi-basics/): \u201cEach category corresponds to a different level of health concern. Each category also has a specific color. The color makes it easy for people to quickly determine whether air quality is reaching unhealthy levels in their communities.\u201d`\n)};\nconst _zn2jku = function _categories(){return(\n[\n  {max: 50, color: \"green\", name: \"Good\"},\n  {max: 100, color: \"yellow\", name: \"Moderate\"},\n  {max: 150, color: \"orange\", name: \"Unhealthy for sensitive groups\"},\n  {max: 200, color: \"red\", name: \"Unhealthy\"},\n  {max: 300, color: \"purple\", name: \"Very unhealthy\"},\n  {max: 500, color: \"maroon\", name: \"Hazardous\"}\n]\n)};\nconst _18c2ed1 = function _10(md){return(\nmd`The \\`pm25_aqi\\` function converts from a PM2.5 concentration in micrograms per cubic meter to the corresponding AQI value (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`aqi_pm25\\`.`\n)};\nconst _1v04v34 = function _pm25_aqi(lerp){return(\nfunction pm25_aqi(pm25) {\n  const c = Math.floor(10 * pm25) / 10;\n  const a = c < 0 ? 0 // values below 0 are considered beyond AQI\n    : c <  12.1 ? lerp(  0,  50,   0.0,  12.0, c)\n    : c <  35.5 ? lerp( 51, 100,  12.1,  35.4, c)\n    : c <  55.5 ? lerp(101, 150,  35.5,  55.4, c)\n    : c < 150.5 ? lerp(151, 200,  55.5, 150.4, c)\n    : c < 250.5 ? lerp(201, 300, 150.5, 250.4, c)\n    : c < 350.5 ? lerp(301, 400, 250.5, 350.4, c)\n    : c < 500.5 ? lerp(401, 500, 350.5, 500.4, c)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.round(a);\n}\n)};\nconst _hkqgrd = function _12(md){return(\nmd`The \\`aqi_pm25\\` function converts from an AQI value to the corresponding PM2.5 concentration in micrograms per cubic meter (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`pm25_aqi\\`.`\n)};\nconst _1tqcgw3 = function _aqi_pm25(lerp){return(\nfunction aqi_pm25(aqi) {\n  const a = Math.round(aqi);\n  const c = a < 0 ? 0 // values below 0 are considered beyond AQI\n    : a <=  50 ? lerp(  0.0,  12.0,   0,  50, a)\n    : a <= 100 ? lerp( 12.1,  35.4,  51, 100, a)\n    : a <= 150 ? lerp( 35.5,  55.4, 101, 150, a)\n    : a <= 200 ? lerp( 55.5, 150.4, 151, 200, a)\n    : a <= 300 ? lerp(150.5, 250.4, 201, 300, a)\n    : a <= 400 ? lerp(250.5, 350.4, 301, 400, a)\n    : a <= 500 ? lerp(350.5, 500.4, 401, 500, a)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.floor(10 * c) / 10;\n}\n)};\nconst _1v4p2ht = function _14(md){return(\nmd`The \\`lerp\\` function is like d3.scaleLinear, redux.`\n)};\nconst _1n6puuj = function _lerp(){return(\nfunction lerp(ylo, yhi, xlo, xhi, x) {\n  return ((x - xlo) / (xhi - xlo)) * (yhi - ylo) + ylo;\n}\n)};\nconst _133w3ev = function _16(md){return(\nmd`The \\`bind\\` function is like [Inputs.bind](https://github.com/observablehq/inputs/blob/main/README.md#bind), except it applies a transform to convert between units, and only propagates on trusted events. This way when the user interacts with the target, it\u2019ll propagate to the source, but the source won\u2019t propagate back to the target. This transform needs to be invertible so that you can drag either range input to affect the other.`\n)};\nconst _1750m2n = function _bind(Inputs,Event){return(\nfunction bind(\n  target,\n  source,\n  {\n    invalidation = Inputs.disposal(target),\n    transform = (d) => d,\n    invert = (d) => d\n  } = {}\n) {\n  const onsource = (event) => {\n    target.value = transform(source.value);\n  };\n  const ontarget = (event) => {\n    source.value = invert(target.value);\n    source.dispatchEvent(new Event(\"input\", { bubbles: true }));\n  };\n  onsource({});\n  target.addEventListener(\"input\", ontarget);\n  source.addEventListener(\"input\", onsource);\n  invalidation.then(() => source.removeEventListener(\"input\", onsource));\n  return target;\n}\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_jclaoh\", null, [\"md\"], _jclaoh);  \n  $def(\"_1bo40ge\", null, [\"md\"], _1bo40ge);  \n  $def(\"_1tcoky6\", null, [\"md\",\"data\"], _1tcoky6);  \n  $def(\"_6klsgc\", \"viewof data\", [\"Inputs\"], _6klsgc);  \n  $def(\"_q0r7f0\", \"data\", [\"Generators\",\"viewof data\"], _q0r7f0);  \n  $def(\"_1sizgv5\", null, [\"bind\",\"Inputs\",\"viewof data\",\"pm25_aqi\"], _1sizgv5);  \n  $def(\"_rctuwq\", null, [\"bind\",\"Inputs\",\"viewof data\",\"aqi_pm25\"], _rctuwq);  \n  $def(\"_17n45h8\", null, [\"Plot\",\"categories\",\"aqi_pm25\",\"d3\",\"pm25_aqi\",\"data\"], _17n45h8);  \n  $def(\"_hk7a2c\", null, [\"md\"], _hk7a2c);  \n  $def(\"_q3m8zt\", \"exposure\", [\"pm25_aqi\",\"data\"], _q3m8zt);  \n  $def(\"_w9d4rn\", null, [\"md\",\"data\",\"exposure\"], _w9d4rn);  \n  $def(\"_me7d6m\", null, [\"md\"], _me7d6m);  \n  $def(\"_zn2jku\", \"categories\", [], _zn2jku);  \n  $def(\"_18c2ed1\", null, [\"md\"], _18c2ed1);  \n  $def(\"_1v04v34\", \"pm25_aqi\", [\"lerp\"], _1v04v34);  \n  $def(\"_hkqgrd\", null, [\"md\"], _hkqgrd);  \n  $def(\"_1tqcgw3\", \"aqi_pm25\", [\"lerp\"], _1tqcgw3);  \n  $def(\"_1v4p2ht\", null, [\"md\"], _1v4p2ht);  \n  $def(\"_1n6puuj\", \"lerp\", [], _1n6puuj);  \n  $def(\"_133w3ev\", null, [\"md\"], _133w3ev);  \n  $def(\"_1750m2n\", \"bind\", [\"Inputs\",\"Event\"], _1750m2n);\n  return main;\n}\n";
const FIXED = "const _jclaoh = function _1(md){return(\nmd`# PM2.5 to AQI Conversion\n\nMy home weather station measures PM2.5 concentration in micrograms per cubic meter (\u03bcg/m\u00b3). But if I\u2019m concerned about air quality, I want to know the Air Quality Index (AQI). AQI is a policy tool and as such has a complicated definition. So, here\u2019s a tool to convert between PM2.5 and AQI (assuming that PM2.5 is the only pollutant you care about).`\n)};\nconst _1bo40ge = function _2(md){return(\nmd`Drag either slider below to choose the selected PM2.5 or AQI.`\n)};\nconst _1tcoky6 = function _3(md,data){return(\nmd`data.pm25: ${data.pm25} data.AQI: ${data.AQI}`\n)};\nconst _6klsgc = function _data(Inputs){return(\nInputs.input({\n  pm25: 50,\n  AQI: 250\n})\n)};\nconst _q0r7f0 = (G, _) => G.input(_);\nconst _1sizgv5 = function _5(bind,Inputs,$0,pm25_aqi){return(\nbind(\n  Inputs.range([0, 500], { label: \"PM2.5 (\u03bcg/m\u00b3)\", value: 50, step: 0.1 }),\n  $0,\n  {\n    transform: (d) => d.pm25,\n    invert: (pm25) => ({\n      pm25: pm25,\n      AQI: pm25_aqi(pm25)\n    })\n  }\n)\n)};\nconst _rctuwq = function _6(bind,Inputs,$0,aqi_pm25){return(\nbind(Inputs.range([0, 500], { label: \"AQI\", step: 1 }), $0, {\n  transform: (d) => d.AQI,\n  invert: (aqi) => ({\n    pm25: aqi_pm25(aqi),\n    AQI: aqi\n  })\n})\n)};\nconst _17n45h8 = function _7(Plot,categories,aqi_pm25,d3,pm25_aqi,data){return(\nPlot.plot({\n  grid: true,\n  x: {\n    label: \"PM2.5 \u2192\"\n  },\n  y: {\n    label: \"\u2191 AQI\"\n  },\n  color: {\n    type: \"identity\"\n  },\n  marks: [\n    Plot.rect(categories, {\n      x1: 0,\n      x2: (d) => aqi_pm25(d.max),\n      y1: 0,\n      y2: \"max\",\n      stroke: \"color\",\n      strokeWidth: 3,\n      reverse: true\n    }),\n    Plot.line(d3.range(501), {\n      x: (d) => d,\n      y: pm25_aqi\n    }),\n    Plot.dot([[data.pm25, data.AQI]]),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      stroke: \"white\",\n      strokeWidth: 3,\n      strokeLinejoin: \"round\",\n      dx: 4,\n      dy: 12\n    }),\n    Plot.text(categories, {\n      x: 0,\n      y: \"max\",\n      text: \"name\",\n      textAnchor: \"start\",\n      dx: 4,\n      dy: 12\n    })\n  ]\n})\n)};\nconst _hk7a2c = function _exposure_md(md){return(\nmd`### How often is the air this bad?\n\nThe station logs PM2.5 every minute. Over the last year, this is the share of readings at or above the AQI selected above.`\n)};\nconst _r4k1pv = function _readings(pm25_aqi)\n{\n  // one year of one-minute readings, reproducible (seeded)\n  let seed = 20250101;\n  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);\n  const normal = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());\n  const readings = [];\n  for (let i = 0; i < 365 * 24 * 60; i++) {\n    const hour = (i / 60) % 24;\n    const day = Math.floor(i / 1440);\n    const base = 9 + 5 * Math.sin(((hour - 7) / 24) * 2 * Math.PI) + (day % 7 < 2 ? -2 : 0);\n    const pm25 = Math.round(base * Math.exp(0.8 * normal()) * 10) / 10;\n    readings.push({ time: new Date(Date.UTC(2025, 0, 1) + i * 60000), pm25, aqi: pm25_aqi(pm25) });\n  }\n  readings.sort((a, b) => a.aqi - b.aqi || a.pm25 - b.pm25);\n  return readings;\n};\nconst _q3m8zt = function _exposure(readings,data)\n{\n  const worse = readings.filter((r) => r.aqi >= data.AQI).length;\n  return {\n    worse,\n    total: readings.length,\n    share: worse / readings.length,\n    p95: readings[Math.floor(0.95 * readings.length)].aqi\n  };\n};\nconst _w9d4rn = function _exposure_summary(md,data,exposure){return(\nmd`At AQI **${data.AQI}** or worse: **${(exposure.share * 100).toFixed(2)}%** of readings (${exposure.worse.toLocaleString(\"en-US\")} of ${exposure.total.toLocaleString(\"en-US\")}). The 95th-percentile reading is AQI ${exposure.p95}.`\n)};\nconst _me7d6m = function _8(md){return(\nmd`The cell below defines the six official [Air Quality Index (AQI) categories](https://www.airnow.gov/aqi/aqi-basics/): \u201cEach category corresponds to a different level of health concern. Each category also has a specific color. The color makes it easy for people to quickly determine whether air quality is reaching unhealthy levels in their communities.\u201d`\n)};\nconst _zn2jku = function _categories(){return(\n[\n  {max: 50, color: \"green\", name: \"Good\"},\n  {max: 100, color: \"yellow\", name: \"Moderate\"},\n  {max: 150, color: \"orange\", name: \"Unhealthy for sensitive groups\"},\n  {max: 200, color: \"red\", name: \"Unhealthy\"},\n  {max: 300, color: \"purple\", name: \"Very unhealthy\"},\n  {max: 500, color: \"maroon\", name: \"Hazardous\"}\n]\n)};\nconst _18c2ed1 = function _10(md){return(\nmd`The \\`pm25_aqi\\` function converts from a PM2.5 concentration in micrograms per cubic meter to the corresponding AQI value (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`aqi_pm25\\`.`\n)};\nconst _1v04v34 = function _pm25_aqi(lerp){return(\nfunction pm25_aqi(pm25) {\n  const c = Math.floor(10 * pm25) / 10;\n  const a = c < 0 ? 0 // values below 0 are considered beyond AQI\n    : c <  12.1 ? lerp(  0,  50,   0.0,  12.0, c)\n    : c <  35.5 ? lerp( 51, 100,  12.1,  35.4, c)\n    : c <  55.5 ? lerp(101, 150,  35.5,  55.4, c)\n    : c < 150.5 ? lerp(151, 200,  55.5, 150.4, c)\n    : c < 250.5 ? lerp(201, 300, 150.5, 250.4, c)\n    : c < 350.5 ? lerp(301, 400, 250.5, 350.4, c)\n    : c < 500.5 ? lerp(401, 500, 350.5, 500.4, c)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.round(a);\n}\n)};\nconst _hkqgrd = function _12(md){return(\nmd`The \\`aqi_pm25\\` function converts from an AQI value to the corresponding PM2.5 concentration in micrograms per cubic meter (assuming that PM2.5 is the only contributor to AQI). It is the inverse of \\`pm25_aqi\\`.`\n)};\nconst _1tqcgw3 = function _aqi_pm25(lerp){return(\nfunction aqi_pm25(aqi) {\n  const a = Math.round(aqi);\n  const c = a < 0 ? 0 // values below 0 are considered beyond AQI\n    : a <=  50 ? lerp(  0.0,  12.0,   0,  50, a)\n    : a <= 100 ? lerp( 12.1,  35.4,  51, 100, a)\n    : a <= 150 ? lerp( 35.5,  55.4, 101, 150, a)\n    : a <= 200 ? lerp( 55.5, 150.4, 151, 200, a)\n    : a <= 300 ? lerp(150.5, 250.4, 201, 300, a)\n    : a <= 400 ? lerp(250.5, 350.4, 301, 400, a)\n    : a <= 500 ? lerp(350.5, 500.4, 401, 500, a)\n    : 500; // values above 500 are considered beyond AQI\n  return Math.floor(10 * c) / 10;\n}\n)};\nconst _1v4p2ht = function _14(md){return(\nmd`The \\`lerp\\` function is like d3.scaleLinear, redux.`\n)};\nconst _1n6puuj = function _lerp(){return(\nfunction lerp(ylo, yhi, xlo, xhi, x) {\n  return ((x - xlo) / (xhi - xlo)) * (yhi - ylo) + ylo;\n}\n)};\nconst _133w3ev = function _16(md){return(\nmd`The \\`bind\\` function is like [Inputs.bind](https://github.com/observablehq/inputs/blob/main/README.md#bind), except it applies a transform to convert between units, and only propagates on trusted events. This way when the user interacts with the target, it\u2019ll propagate to the source, but the source won\u2019t propagate back to the target. This transform needs to be invertible so that you can drag either range input to affect the other.`\n)};\nconst _1750m2n = function _bind(Inputs,Event){return(\nfunction bind(\n  target,\n  source,\n  {\n    invalidation = Inputs.disposal(target),\n    transform = (d) => d,\n    invert = (d) => d\n  } = {}\n) {\n  const onsource = (event) => {\n    target.value = transform(source.value);\n  };\n  const ontarget = (event) => {\n    source.value = invert(target.value);\n    source.dispatchEvent(new Event(\"input\", { bubbles: true }));\n  };\n  onsource({});\n  target.addEventListener(\"input\", ontarget);\n  source.addEventListener(\"input\", onsource);\n  invalidation.then(() => source.removeEventListener(\"input\", onsource));\n  return target;\n}\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n\n  $def(\"_jclaoh\", null, [\"md\"], _jclaoh);  \n  $def(\"_1bo40ge\", null, [\"md\"], _1bo40ge);  \n  $def(\"_1tcoky6\", null, [\"md\",\"data\"], _1tcoky6);  \n  $def(\"_6klsgc\", \"viewof data\", [\"Inputs\"], _6klsgc);  \n  $def(\"_q0r7f0\", \"data\", [\"Generators\",\"viewof data\"], _q0r7f0);  \n  $def(\"_1sizgv5\", null, [\"bind\",\"Inputs\",\"viewof data\",\"pm25_aqi\"], _1sizgv5);  \n  $def(\"_rctuwq\", null, [\"bind\",\"Inputs\",\"viewof data\",\"aqi_pm25\"], _rctuwq);  \n  $def(\"_17n45h8\", null, [\"Plot\",\"categories\",\"aqi_pm25\",\"d3\",\"pm25_aqi\",\"data\"], _17n45h8);  \n  $def(\"_hk7a2c\", null, [\"md\"], _hk7a2c);  \n  $def(\"_r4k1pv\", \"readings\", [\"pm25_aqi\"], _r4k1pv);  \n  $def(\"_q3m8zt\", \"exposure\", [\"readings\",\"data\"], _q3m8zt);  \n  $def(\"_w9d4rn\", null, [\"md\",\"data\",\"exposure\"], _w9d4rn);  \n  $def(\"_me7d6m\", null, [\"md\"], _me7d6m);  \n  $def(\"_zn2jku\", \"categories\", [], _zn2jku);  \n  $def(\"_18c2ed1\", null, [\"md\"], _18c2ed1);  \n  $def(\"_1v04v34\", \"pm25_aqi\", [\"lerp\"], _1v04v34);  \n  $def(\"_hkqgrd\", null, [\"md\"], _hkqgrd);  \n  $def(\"_1tqcgw3\", \"aqi_pm25\", [\"lerp\"], _1tqcgw3);  \n  $def(\"_1v4p2ht\", null, [\"md\"], _1v4p2ht);  \n  $def(\"_1n6puuj\", \"lerp\", [], _1n6puuj);  \n  $def(\"_133w3ev\", null, [\"md\"], _133w3ev);  \n  $def(\"_1750m2n\", \"bind\", [\"Inputs\",\"Event\"], _1750m2n);\n  return main;\n}\n";

const PROBE = String.raw`
const rt = globalThis.__ojs_runtime;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
const modsOf = (base) => [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m);
const varsOf = (mods) => [...rt._variables].filter(v => mods.includes(v._module) && !String(v._name || "").startsWith("module ") && v._name !== "@variable");
// observe every unobserved variable of the modules (anonymous md cells included), so the module
// computes whether or not the page lays it out; restore() puts the observers back.
const force = (vars) => {
  const saved = [];
  for (const v of vars) if (typeof v._observer === "symbol") { saved.push([v, v._observer]); v._observer = {}; rt._dirty.add(v); }
  rt._compute();
  return () => { for (const [v, o] of saved) { v._observer = o; rt._dirty.add(v); } rt._compute(); };
};
const settle = async (vars) => {
  for (let i = 0; i < 400; i++) {
    await frame();
    if (rt._computing || rt._dirty.size || rt._updates.size) continue;
    await Promise.all(vars().map(v => Promise.resolve(v._promise).catch(() => {})));
    if (!rt._computing && !rt._dirty.size && !rt._updates.size) return true;
  }
  return false;
};
const elems = (vars) => vars().map(v => v._value).filter(x => x instanceof Element);
const findRange = (vars) => {
  const rs = elems(vars).flatMap(e => e.matches("input[type=range]") ? [e] : [...e.querySelectorAll("input[type=range]")]);
  const lab = r => (r.closest("form, label, div")?.textContent || "");
  return rs.find(r => /AQI/.test(lab(r)) && !/PM2/.test(lab(r))) || rs.find(r => Number(r.max) >= 500 && Number(r.step) === 1) || rs[0];
};
const setRange = (range, x) => { range.value = String(x); range.dispatchEvent(new Event("input", { bubbles: true })); };
const shown = (vars) => {
  const texts = elems(vars).map(e => e.textContent.replace(/\s+/g, " "));
  const pct = texts.filter(t => /%/.test(t));
  const circles = elems(vars).flatMap(e => [...e.querySelectorAll("svg circle")]).map(c => c.getAttribute("cx") + "," + c.getAttribute("cy"));
  return { pct, circles, all: texts.join(" | ") };
};
const tokens = t => (t.match(/\d[\d,]*(?:\.\d+)?%?/g) || []);
async function measure(vars) {
  const range = findRange(vars);
  if (!range) return { error: "no range input" };
  const out = { shown: {}, times: [] };
  for (const x of [40, 100, 175]) { setRange(range, x); await settle(vars); await sleep(50); out.shown[x] = shown(vars); }
  for (const x of [60, 130, 90, 210, 45, 160, 110]) {
    await settle(vars); await sleep(30);
    const t0 = performance.now();
    setRange(range, x);
    await settle(vars);
    out.times.push(Math.round(performance.now() - t0));
  }
  const s = [...out.times].sort((a, b) => a - b);
  out.median = s[s.length >> 1];
  return out;
}
`;

const INIT = String.raw`(async () => {
  ${PROBE}
  const sleep2 = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 100 && !rt.mains.has("@user/air-quality"); i++) await sleep2(200);
  const base = new Set([...rt.mains.keys()].filter(k => k !== "@user/air-quality"));
  globalThis.__rc5tBaseMods = base;
  const mods = modsOf(base);
  const vars = () => varsOf(mods);
  const restore = force(vars());
  try { await settle(vars); globalThis.__rc5tSlowBefore = await measure(vars); }
  catch (e) { globalThis.__rc5tSlowBefore = { error: String(e) }; }
  finally { restore(); }
})()`;

const COLLECT = String.raw`(async () => {
  ${PROBE}
  const base = globalThis.__rc5tBaseMods || new Set();
  const before = globalThis.__rc5tSlowBefore || {};
  const mods = modsOf(base);
  const vars = () => varsOf(mods);
  const out = { modules: [...rt.mains.keys()].filter(k => !base.has(k)), before: { median: before.median, times: before.times, error: before.error } };
  if (!vars().length) return { ...out, error: "no module" };
  const restore = force(vars());
  try {
    await settle(vars);
    const after = await measure(vars);
    out.after = { median: after.median, times: after.times, error: after.error };
    out.fixtureSlow = before.median >= 100;
    out.ratio = before.median ? +(after.median / before.median).toFixed(3) : null;
    out.fast = !!(out.fixtureSlow && after.median != null && after.median < 0.25 * before.median);
    // same numbers shown at the same slider value
    const missing = [];
    for (const x of Object.keys(before.shown || {})) {
      const b = before.shown[x], a = (after.shown || {})[x];
      if (!a) { missing.push(x + ": nothing shown"); continue; }
      for (const t of b.pct) { const need = tokens(t); if (!a.pct.some(u => need.every(k => tokens(u).includes(k)))) missing.push(x + ": " + t.slice(0, 120)); }
      if (b.circles.join(";") !== a.circles.join(";")) missing.push(x + ": dot moved " + b.circles.join(";") + " -> " + a.circles.join(";"));
    }
    out.sameOutput = !!before.shown && Object.keys(before.shown).length === 3 && missing.length === 0;
    out.missing = missing.slice(0, 6);
    out.shownAfter100 = (after.shown || {})[100]?.pct;
    return out;
  } finally { restore(); }
})()`;

export default {
  id: "rc5t-slider-lag",
  category: "rc5-train",
  question: "My air quality notebook (@user/air-quality) has become slow: dragging the slider lags. Find out why and make it faster without changing what it shows.",
  setup: { files: { "/src/@user/air-quality.js": FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "fast", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "sameOutput", equals: true }, weight: 2 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/air-quality.js", content: FIXED } },
  ],
};
