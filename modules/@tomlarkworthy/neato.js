const _yxyco0 = function _1(md){return(
md`# Hello, Viz.js (with a binding to neato)

See [@mbostock/graphviz](/@mbostock/graphviz) for a convenient wrapper. This version uses a web worker, loads Viz.js directly, and loads the “full” renderer rather than the “lite” one.`
)};
const _784slo = function _2(dot){return(
dot`digraph { a -> b }`
)};
const _1v9b575 = function _3(dot){return(
dot`graph G {
    B [label="Hello World" pos="0,1!"]
    A [label=<Hello<I>World</I>>, color=red  pos="0,2!"]
}`
)};
const _l90bte = function _4(neato){return(
neato`graph G {
    B [label="Hello World" pos="0,1!"]
    A [label=<Hello<I>World</I>>, color=red  pos="0,2!"]
}`
)};
const _mhtbtr = async function _viz(require)
{
  const Viz = await require("viz.js@2");

  return require
    .resolve("viz.js@2/full.render.js")
    .then(url => fetch(url))
    .then(response => response.blob())
    .then(blob => URL.createObjectURL(blob))
    .then(url => new Worker(url))
    .then(worker => new Viz({ worker }));
};
const _wr5ttc = function _dot(viz){return(
function dot(strings) {
  let string = strings[0] + "",
    i = 0,
    n = arguments.length;
  while (++i < n) string += arguments[i] + "" + strings[i];
  const svg = document.createElement("span");

  viz.renderSVGElement(string, { engine: 'dot' }).then(node => {
    svg.appendChild(node);
  });
  svg.style.maxWidth = "100%";
  svg.style.height = "auto";
  return svg;
}
)};
const _1mtj97k = function _neato(viz){return(
function neato(strings) {
  let string = strings[0] + "",
    i = 0,
    n = arguments.length;
  while (++i < n) string += arguments[i] + "" + strings[i];
  const svg = document.createElement("span");

  viz.renderSVGElement(string, { engine: 'neato' }).then(node => {
    svg.appendChild(node);
  });
  svg.style.maxWidth = "100%";
  svg.style.height = "auto";
  return svg;
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_yxyco0", null, ["md"], _yxyco0);  
  $def("_784slo", null, ["dot"], _784slo);  
  $def("_1v9b575", null, ["dot"], _1v9b575);  
  $def("_l90bte", null, ["neato"], _l90bte);  
  $def("_mhtbtr", "viz", ["require"], _mhtbtr);  
  $def("_wr5ttc", "dot", ["viz"], _wr5ttc);  
  $def("_1mtj97k", "neato", ["viz"], _1mtj97k);
  return main;
}