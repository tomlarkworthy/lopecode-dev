const _viewof_volume = function volume(Inputs,localStorageView){return(
Inputs.bind(Inputs.range([0, 100], {label: "volume", step: 1, value: 10}), localStorageView("demo-volume", { defaultValue: 10 }))
)};
const _viewof_prefs = function prefs(localStorageView){return(
localStorageView("demo-prefs", { json: true })
)};
const _echo = function echo(volume,prefs){return(
`volume = ${volume}, theme = ${prefs?.theme ?? "light"}`
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

  main.define("module @tomlarkworthy/local-storage-view", async () => "@tomlarkworthy/local-storage-view" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreifq2nytxe3ftt33d2zkkg65fbackzjj6pcq2mh5cgazjr576pwxfy")).default));
  main.define("localStorageView", ["module @tomlarkworthy/local-storage-view", "@variable"], (_, v) => v.import("localStorageView", _));
  return main;
}
