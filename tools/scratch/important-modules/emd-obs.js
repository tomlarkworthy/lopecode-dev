export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_c", "count", [], () => 3);
  $def("_intro", "intro", ["md", "count"], (md, count) => md`# Shopping list

We need ${count} apples. See [the top](#top). Click this text to edit it.`);
  $def("_src", "introSource", ["intro"], (intro) => intro.markdown);
  main.define("module @tomlarkworthy/editable-md", async () => runtime.module((await import("/@tomlarkworthy/editable-md.js?v=4")).default));
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  return main;
}
