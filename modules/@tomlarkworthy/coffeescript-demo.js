const _j8qdu8 = function _1(md){return(
md`# Coffeescript Proof of Concept

In response to https://talk.observablehq.com/t/coffeescript/2524/3

_"We don’t currently support transpilers, but you could evaluate JavaScript dynamically (using eval or the Function constructor)."_ -- mbostock (leader)

`
)};
const _pvher5 = function _square(compiler){return(
compiler.eval("(x) -> x * x")
)};
const _knltmj = function _3(square){return(
square(4)
)};
const _1suhbcq = function _compiler(require){return(
require('https://coffeescript.org/v2/browser-compiler-legacy/coffeescript.js')
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_j8qdu8", null, ["md"], _j8qdu8);  
  $def("_pvher5", "square", ["compiler"], _pvher5);  
  $def("_knltmj", null, ["square"], _knltmj);  
  $def("_1suhbcq", "compiler", ["require"], _1suhbcq);
  return main;
}