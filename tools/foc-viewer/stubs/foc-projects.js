const _focprojectsseed = function _seed(md){return(
md`# Projects`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_focprojectsseed", null, ["md"], _focprojectsseed);
  return main;
}
