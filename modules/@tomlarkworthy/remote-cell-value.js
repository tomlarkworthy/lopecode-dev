const _1v1ubk8 = function _1(md){return(
md `# Literal remote cell value 
Deprecated: Use https://observablehq.com/@tomlarkworthy/metaprogramming#peekFirst directly instead
`
)};
const _myngvt = function _target_notebook(html){return(
html`<input type=text value="@tomlarkworthy/subdomain-certification">`
)};
const _eakfl = (G, _) => G.input(_);
const _9aqu6n = function _target_cell(html){return(
html`<input type=text value="challenge_response">`
)};
const _gllle4 = (G, _) => G.input(_);
const _a3uqki = function _4(remoteCellValue,target_notebook,target_cell){return(
remoteCellValue(target_notebook, target_cell)
)};
const _glidea = function _5(md){return(
md`
~~~js
import {remoteCellValue} from '@tomlarkworthy/remote-cell-value'
~~~
`
)};
const _890j07 = function _remoteCellValue(peekFirst){return(
async function remoteCellValue(target_notebook, target_cell, apiUrl) {
  return peekFirst({
    notebook: target_notebook,
    cell: target_cell
  })
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/metaprogramming", async () => runtime.module((await import("/@tomlarkworthy/metaprogramming.js?v=4")).default));  
  $def("_1v1ubk8", null, ["md"], _1v1ubk8);  
  $def("_myngvt", "viewof target_notebook", ["html"], _myngvt);  
  $def("_eakfl", "target_notebook", ["Generators","viewof target_notebook"], _eakfl);  
  $def("_9aqu6n", "viewof target_cell", ["html"], _9aqu6n);  
  $def("_gllle4", "target_cell", ["Generators","viewof target_cell"], _gllle4);  
  $def("_a3uqki", null, ["remoteCellValue","target_notebook","target_cell"], _a3uqki);  
  $def("_glidea", null, ["md"], _glidea);  
  $def("_890j07", "remoteCellValue", ["peekFirst"], _890j07);  
  main.define("peekFirst", ["module @tomlarkworthy/metaprogramming", "@variable"], (_, v) => v.import("peekFirst", _));
  return main;
}