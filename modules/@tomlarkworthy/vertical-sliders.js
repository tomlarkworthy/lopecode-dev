const _1dpb52w = function _1(md){return(
md`# Vertical Sliders

Put all your controls into a single row for less vertical scrolling

~~~js
import {verticalSliders} from '@tomlarkworthy/vertical-sliders'
~~~

Supported fields in the config are _mins, maxs, steps, values, names, labels_

~~~js
viewof color = verticalSliders({
  names: ["r", "g", "b"],
  labels:["red", "green", "blue"],
  maxs:  [255,255,255],
  steps: [1,1,1]
})
~~~

Vertical sliders were used in [@tomlarkworthy/wormhole2](https://observablehq.com/@tomlarkworthy/wormhole2)
`
)};
const _1tlj8y8 = function _verticalSliders(form,html){return(
function verticalSliders(config = {}) {
  const len = (arr) => arr ? arr.length : undefined;
  let {
    n = len(config.values) ||
        len(config.mins) ||
        len(config.maxs) ||
        len(config.values) || 
        len(config.names) || 
        len(config.labels) || 
        1,
    mins = Array(n).fill(0),
    maxs = Array(n).fill(1),
    steps = Array(n).fill("any"),
    values = mins.map((min, idx) => (maxs[idx] + min) / 2),
    names = Array(n).fill(0).map((_, idx) => `${idx}`),
    labels = Array(n).fill("")
  } = config;
  return form(html`<form>
    <style>
      input[type=range][orient=vertical]
      {
        writing-mode: bt-lr; /* IE */
        -webkit-appearance: slider-vertical; /* WebKit */
        width: 8px;
        height: 175px;
        padding: 0 5px;
      }
    </style>
    <table style="table-layout: fixed; width:100%;text-align:center;">
    <tfoot>
      <tr style="font-size: 0.85rem;font-style:italic;">
        ${labels.map(label => html`<td>${label}</td>`)}
      </tr>
    </tfoot>
    <tbody>
      <tr>
        ${Array(n).fill(0).map((_, idx) => html`<td><input
          type=range
          name=${names[idx]}
          step=${steps[idx]}
          min=${mins[idx]}
          max=${maxs[idx]}
          value="${values[idx]}"
          orient=vertical></td>`)}
      </tr>
    </tbody></table>`)
}
)};
const _1rbfd2f = function _demo(verticalSliders,now){return(
verticalSliders({
  values: Array(30).fill(0).map((_, i) => Math.sin(i/3 + now/500) / 2 + 0.5),
  labels: Array(30).fill(0).map((_, i) => i)
})
)};
const _y4ny6b = (G, _) => G.input(_);
const _164nrch = function _4(html,color){return(
html`<div style="height: 50px;width: 50px;background-color: rgb(${color.r}, ${color.g}, ${color.b});"></div>`
)};
const _kr2uau = function _5(color){return(
color
)};
const _1l1uf4k = function _color(verticalSliders){return(
verticalSliders({
  names: ["r", "g", "b"],
  labels:["red", "green", "blue"],
  maxs:  [255,255,255],
  steps: [1,1,1]
})
)};
const _93vwpl = (G, _) => G.input(_);

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/mutable-form-input", async () => runtime.module((await import("/@tomlarkworthy/mutable-form-input.js?v=4")).default));  
  $def("_1dpb52w", null, ["md"], _1dpb52w);  
  $def("_1tlj8y8", "verticalSliders", ["form","html"], _1tlj8y8);  
  $def("_1rbfd2f", "viewof demo", ["verticalSliders","now"], _1rbfd2f);  
  $def("_y4ny6b", "demo", ["Generators","viewof demo"], _y4ny6b);  
  $def("_164nrch", null, ["html","color"], _164nrch);  
  $def("_kr2uau", null, ["color"], _kr2uau);  
  $def("_1l1uf4k", "viewof color", ["verticalSliders"], _1l1uf4k);  
  $def("_93vwpl", "color", ["Generators","viewof color"], _93vwpl);  
  main.define("form", ["module @tomlarkworthy/mutable-form-input", "@variable"], (_, v) => v.import("form", _));
  return main;
}