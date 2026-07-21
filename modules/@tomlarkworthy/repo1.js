const _k6mg5t = function _1(md){return(
md`# Repro`
)};
const _f35oqw = function _exportString(){return(
"blue"
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_k6mg5t", null, ["md"], _k6mg5t);  
  $def("_f35oqw", "exportString", [], _f35oqw);
  return main;
}