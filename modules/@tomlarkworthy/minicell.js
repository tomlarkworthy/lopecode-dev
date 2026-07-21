const _1j40e1o = function _1(md){return(
md`# MiniCell
## Small summary cell

This is an alternative [inspector](https://observablehq.com/@observablehq/inspector)`
)};
const _1umfjbt = function _into(MiniCell){return(
(container) => () =>
  new MiniCell(container.appendChild(document.createElement("div")))
)};
const _t6wmn3 = function _MiniCell(style){return(
class MiniCell {
  constructor(element, options) {
    style;
    this._node = element;
    this._label = document.createTextNode("");

    element.classList.add("minicell", "observablehq");
    element.appendChild(this._label);
  }
  _setLabel(value) {
    this._label.nodeValue = value;
  }
  fulfilled(value, name) {
    this._setLabel(name);
    this._node.classList.add("minicell--ok");
    this._node.classList.remove("minicell--error", "minicell--running");
  }
  pending() {
    this._node.classList.add("minicell--running");
    this._node.classList.remove("minicell--error", "minicell--ok");
  }
  rejected(err, name) {
    this._setLabel(name);
    this._node.classList.add("minicell--error");
    this._node.classList.remove("minicell--running", "minicell--ok");
  }
}
)};
const _1m9s5gi = function _style(htl){return(
htl.html`<style>
 .minicell.observablehq {
   font-family: var(--system-ui);
   display: block;
   text-align: center;
   vertical-align: middle;
   min-height: 2rem;
   line-height: 2rem;
   border-radius: 0.25rem;
   border-width: 1px;
   border-style: solid;
   white-space: nowrap;
   text-wrap: nowrap;
   color: #555;
   font-style: italic;
 }

  .minicell--running {
    border-color: #ffa;
  }
  
  .minicell--error {
    border-color: #faa;
  }
  
  .minicell--ok {
    border-color: #84DCCF;
  }
</style>`
)};
const _ga4jm3 = function _5(MiniCell,html)
{
  const cell = new MiniCell(html`<div>`);
  cell.fulfilled(true, "lastVariableMoved");
  cell.pending();
  return cell._node;
};
const _108jigs = function _6(MiniCell,html)
{
  const cell = new MiniCell(html`<div>`);
  cell.rejected(undefined, "lastVariableMoved");
  return cell._node;
};
const _58thre = function _7(MiniCell,html)
{
  const cell = new MiniCell(html`<div>`);
  cell.fulfilled(true, "viewof lastVariableMoved");
  return cell._node;
};
const _1xnoy50 = function _root(htl){return(
htl.html`<div>`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_1j40e1o", null, ["md"], _1j40e1o);  
  $def("_1umfjbt", "into", ["MiniCell"], _1umfjbt);  
  $def("_t6wmn3", "MiniCell", ["style"], _t6wmn3);  
  $def("_1m9s5gi", "style", ["htl"], _1m9s5gi);  
  $def("_ga4jm3", null, ["MiniCell","html"], _ga4jm3);  
  $def("_108jigs", null, ["MiniCell","html"], _108jigs);  
  $def("_58thre", null, ["MiniCell","html"], _58thre);  
  $def("_1xnoy50", "root", ["htl"], _1xnoy50);
  return main;
}