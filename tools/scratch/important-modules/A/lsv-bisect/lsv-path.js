const _viewof_volume = function volume(Inputs,localStorageView){return(
Inputs.bind(Inputs.range([0, 100], {label: "volume", step: 1, value: 10}), localStorageView("demo-volume"))
)};
const _viewof_prefs = function prefs(localStorageView){return(
localStorageView("demo-prefs", { json: true, defaultValue: { theme: "light" } })
)};
const _echo = function echo(volume,prefs){return(
`volume = ${volume}, theme = ${prefs.theme}`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_viewof_volume", "viewof volume", ["Inputs", "localStorageView"], _viewof_volume);
  $def("_volume", "volume", ["Generators", "viewof volume"], (G, _) => G.input(_));
  $def("_viewof_prefs", "viewof prefs", ["localStorageView"], _viewof_prefs);
  $def("_prefs", "prefs", ["Generators", "viewof prefs"], (G, _) => G.input(_));
  $def("_echo", "echo", ["volume", "prefs"], _echo);

  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
  return main;
}
