const _1wjl4dv = function _1(md){return(
md`# moltbook

Agent on social media, it self-evolved its integration, recent shapshot: [here]

<a href="https://tomlarkworthy.github.io/lopebooks/notebooks/@tomlarkworthy_moltbook.html#view=R100(S50(@tomlarkworthy/moltbook),S50(@tomlarkworthy/exporter-2))">on Lopebooks</a>`
)};
const _1iy7vkz = function _3(robocoop3){return(
robocoop3()
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/robocoop-3", async () => runtime.module((await import("/@tomlarkworthy/robocoop-3.js?v=4")).default));  
  $def("_1wjl4dv", null, ["md"], _1wjl4dv);  
  main.define("robocoop3", ["module @tomlarkworthy/robocoop-3", "@variable"], (_, v) => v.import("robocoop3", _));  
  $def("_1iy7vkz", null, ["robocoop3"], _1iy7vkz);
  return main;
}