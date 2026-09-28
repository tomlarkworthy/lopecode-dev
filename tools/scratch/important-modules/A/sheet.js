const _viewof_sheetModule = function sheetModule(thisModule){return(
thisModule()
)};
const _A1 = function A1(){return(
120
)};
const _B1 = function B1(){return(
340
)};
const _C1 = function C1(A1,B1){return(
A1 + B1
)};
const _grid = function grid(sheet,runtime,invalidation,sheetModule){return(
sheet(runtime, { invalidation, module: sheetModule, format: {"C1": "0.00"} })
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_viewof_sheetModule", "viewof sheetModule", ["thisModule"], _viewof_sheetModule);
  $def("_sheetModule", "sheetModule", ["Generators", "viewof sheetModule"], (G, _) => G.input(_));
  $def("_A1", "A1", [], _A1);
  $def("_B1", "B1", [], _B1);
  $def("_C1", "C1", ["A1", "B1"], _C1);
  $def("_grid", "grid", ["sheet", "runtime", "invalidation", "sheetModule"], _grid);

  main.define("module @tomlarkworthy/sheet", async () => "@tomlarkworthy/sheet" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreictiyvkeezqxxbuvqd74f6qzkglc3vsgume6fz5gz5bgph2vq4vga")).default));
  main.define("sheet", ["module @tomlarkworthy/sheet", "@variable"], (_, v) => v.import("sheet", _));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("runtime", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("runtime", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  return main;
}
