const _viewof_gridModule = function gridModule(thisModule){return(
thisModule()
)};
const _viewof_freq = function freq(Inputs){return(
Inputs.range([0.5, 8], {label: "freq", step: 0.1, value: 2})
)};
const _label = function label(freq){return(
`freq is ${freq}`
)};
const _widget = function widget(gridContainer,runtime,invalidation,gridModule){return(
gridContainer(runtime, {
  invalidation,
  module: gridModule,
  columns: 12,
  include: ["viewof freq", "label"],
  layout: { atoms: { "viewof freq": { x: 0, y: 0, w: 6, h: 1 }, label: { x: 6, y: 0, w: 6, h: 1 } } }
})
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_viewof_gridModule", "viewof gridModule", ["thisModule"], _viewof_gridModule);
  $def("_gridModule", "gridModule", ["Generators", "viewof gridModule"], (G, _) => G.input(_));
  $def("_viewof_freq", "viewof freq", ["Inputs"], _viewof_freq);
  $def("_freq", "freq", ["Generators", "viewof freq"], (G, _) => G.input(_));
  $def("_label", "label", ["freq"], _label);
  $def("_widget", "widget", ["gridContainer", "runtime", "invalidation", "gridModule"], _widget);

  main.define("module @tomlarkworthy/grid-container", async () => "@tomlarkworthy/grid-container" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreice5hjlgedawdjyvvxcga7m23v6wk7garkadcxz72js6y4vz2dfy4")).default));
  main.define("gridContainer", ["module @tomlarkworthy/grid-container", "@variable"], (_, v) => v.import("gridContainer", _));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  return main;
}
