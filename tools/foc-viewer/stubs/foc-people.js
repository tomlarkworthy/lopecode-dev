const _focpeopleseed = function _seed(md){return(
md`# People`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_focpeopleseed", null, ["md"], _focpeopleseed);
  return main;
}
