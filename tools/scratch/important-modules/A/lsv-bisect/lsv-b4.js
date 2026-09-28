const _viewof_prefs = function prefs(localStorageView){return(
localStorageView("demo-plain")
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_viewof_prefs", "viewof prefs", ["localStorageView"], _viewof_prefs);
  $def("_prefs", "prefs", ["Generators", "viewof prefs"], (G, _) => G.input(_));
  main.define("module @tomlarkworthy/local-storage-view", async () => runtime.module((await import("/@tomlarkworthy/local-storage-view.js?v=4")).default));
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
  return main;
}
