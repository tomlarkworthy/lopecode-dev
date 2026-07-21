const _198fluw = function _1(md){return(
md`# SVG Twist`
)};
const _187y3j9 = function* _3(timeseries)
{
  while (true) {
    yield timeseries(Date.now() / 1000);
  }
};
const _5dnahg = function _timeseries(svg,range){return(
frame => {
  const params = {
    segments: 200.0
  };

  return svg`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.5 -1.5 3 3" width="100%">
    <style>
      .edge {
        stroke: black;
        stroke-width:0.01;
      }
      .ladder0 {
        stroke: red;
        stroke-width:0.01;
      }
      .ladder1 {
        stroke: green;
        stroke-width:0.01;
      }
      .ladder2 {
        stroke: blue;
        stroke-width:0.01;
      }
    </style>
    ${range(params.segments).map(t100 => {
      const t = (2 * Math.PI * t100) / params.segments;
      const t_step = (2 * Math.PI) / params.segments;

      const f = 3;
      const scale = 0.3;
      const tx3 = t * f;
      const tx3_step = t_step * f;
      return svg.fragment`
        ${range(f).map(tedge => {
          const edge = tedge + frame;
          const offset = (2.0 * Math.PI * edge) / f;
          const offset_step = (2.0 * Math.PI) / f;

          return svg`${
            (tx3 + offset + Math.PI / 3) % (2 * Math.PI) < Math.PI
              ? svg`<line x1=${Math.cos(t) *
                  (1 - Math.cos(tx3 + offset) * scale)}
                y1=${Math.sin(t) * (1 - Math.cos(tx3 + offset) * scale)}
                x2=${Math.cos(t) *
                  (1 - Math.cos(tx3 + offset + offset_step) * scale)}
                y2=${Math.sin(t) *
                  (1 -
                    Math.cos(tx3 + offset + offset_step) *
                      scale)} class="ladder${tedge}"/>`
              : null
          }
            ${
              (tx3 + offset + Math.PI / 3) % (2 * Math.PI) < Math.PI
                ? svg`<line x1=${Math.cos(t) *
                    (1 - Math.cos(tx3 + offset) * scale)}
                y1=${Math.sin(t) * (1 - Math.cos(tx3 + offset) * scale)}
                x2=${Math.cos(t + t_step) *
                  (1 - Math.cos(tx3 + offset) * scale)}
                y2=${Math.sin(t + t_step) *
                  (1 -
                    Math.cos(tx3 + offset) * scale)} class="ladder${tedge}"/>`
                : null
            }
            ${
              (tx3 + offset + Math.PI / 3) % (2 * Math.PI) < Math.PI
                ? svg`
          <line x1=${Math.cos(t) *
            (1 - Math.cos(tx3 + offset + offset_step) * scale)}
                y1=${Math.sin(t) *
                  (1 - Math.cos(tx3 + offset + offset_step) * scale)}
                x2=${Math.cos(t + t_step) *
                  (1 - Math.cos(tx3 + offset + offset_step) * scale)}
                y2=${Math.sin(t + t_step) *
                  (1 -
                    Math.cos(tx3 + offset + offset_step) *
                      scale)} class="ladder${tedge}"/>`
                : null
            }`;
        })}`;
    })}</svg>`;
}
)};
const _rgxcv9 = function _range(){return(
(n) => [...Array(n).keys()]
)};
const _b2dlbq = function _7(footer){return(
footer
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @observablehq/htl", async () => runtime.module((await import("/@observablehq/htl.js?v=4")).default));  
  main.define("module @tomlarkworthy/footer", async () => runtime.module((await import("/@tomlarkworthy/footer.js?v=4")).default));  
  $def("_198fluw", null, ["md"], _198fluw);  
  main.define("html", ["module @observablehq/htl", "@variable"], (_, v) => v.import("html", _));  
  main.define("svg", ["module @observablehq/htl", "@variable"], (_, v) => v.import("svg", _));  
  $def("_187y3j9", null, ["timeseries"], _187y3j9);  
  $def("_5dnahg", "timeseries", ["svg","range"], _5dnahg);  
  $def("_rgxcv9", "range", [], _rgxcv9);  
  main.define("footer", ["module @tomlarkworthy/footer", "@variable"], (_, v) => v.import("footer", _));  
  $def("_b2dlbq", null, ["footer"], _b2dlbq);
  return main;
}