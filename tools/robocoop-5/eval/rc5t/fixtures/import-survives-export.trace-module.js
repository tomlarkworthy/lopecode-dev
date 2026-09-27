const _intro = function intro(md){return( md`# Color Bar Chart with D3 Legend

Importing the **Legend** function from [@d3/color-legend](https://observablehq.com/@d3/color-legend) and using it with a bar chart of 10 random values coloured by value.` )};

const _data = function data(d3){return(
d3.range(10).map(i => ({index: i, value: Math.round(d3.randomUniform(1, 100)())}))
)};

const _colorScale = function colorScale(d3, data){return(
d3.scaleSequential(d3.extent(data, d => d.value), d3.interpolateViridis)
)};

const _legend = function legend(Legend, colorScale){return(
Legend(colorScale, {
  title: "Value",
  width: 320,
  ticks: 5
})
)};

const _chart = function chart(Plot, data, colorScale){return(
Plot.plot({
  marginLeft: 40,
  marginBottom: 30,
  width: 480,
  height: 280,
  x: {label: "Index"},
  y: {label: "Value", grid: true},
  marks: [
    Plot.barY(data, {
      x: "index",
      y: "value",
      fill: d => colorScale(d.value)
    }),
    Plot.ruleY([0])
  ]
})
)};

const _view = function view(htl, legend, chart){return(
htl.html`<div style="font-family: sans-serif;">
  <div style="margin-bottom: 8px;">${legend}</div>
  ${chart}</div>`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  main.define("module @d3/color-legend", async () => runtime.module((await import("/@d3/color-legend.js?v=4")).default));
  main.define("Legend", ["module @d3/color-legend", "@variable"], (_, v) => v.import("Legend", _));
  $def("_intro", "intro", ["md"], _intro);
  $def("_data", "data", ["d3"], _data);
  $def("_colorScale", "colorScale", ["d3", "data"], _colorScale);
  $def("_legend", "legend", ["Legend", "colorScale"], _legend);
  $def("_chart", "chart", ["Plot", "data", "colorScale"], _chart);
  $def("_view", "view", ["htl", "legend", "chart"], _view);
  return main;
}