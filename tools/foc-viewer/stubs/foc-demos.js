const _focdemosseed = function _seed(md){return(
md`# Demos`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_focdemosseed", null, ["md"], _focdemosseed);
  return main;
}
