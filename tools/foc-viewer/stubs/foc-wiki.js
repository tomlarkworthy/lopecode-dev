const _focwikiseed = function _seed(md){return(
md`# Wiki`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_focwikiseed", null, ["md"], _focwikiseed);
  return main;
}
