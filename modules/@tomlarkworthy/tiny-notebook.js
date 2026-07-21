const _9wxrsu = function _1(htl){return(
htl.html`"Tiny notebook"`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_9wxrsu", null, ["htl"], _9wxrsu);
  return main;
}