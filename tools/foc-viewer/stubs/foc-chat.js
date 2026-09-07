const _focchatseed = function _seed(md){return(
md`# Chat`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_focchatseed", null, ["md"], _focchatseed);
  return main;
}
