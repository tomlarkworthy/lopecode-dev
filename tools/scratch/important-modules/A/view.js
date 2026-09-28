const _viewof_settings = function settings(view,Inputs){return(
view`<div style="display:flex;gap:12px">
  ${["size", Inputs.range([1, 10], {label: "size", step: 1, value: 3})]}
  ${["name", Inputs.text({label: "name", value: "Ada"})]}
</div>`
)};
const _viewof_sliders = function sliders(view,Inputs){return(
(() => {
  const build = (v) => Inputs.range([0, 1], {value: v, step: 0.1});
  return view`<div>${["values", [0.2, 0.8].map(build), build]}</div>`;
})()
)};
const _summary = function summary(settings,sliders){return(
`${settings.name} picked size ${settings.size}; sliders ${sliders.values.join(", ")}`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_viewof_settings", "viewof settings", ["view", "Inputs"], _viewof_settings);
  $def("_settings", "settings", ["Generators", "viewof settings"], (G, _) => G.input(_));
  $def("_viewof_sliders", "viewof sliders", ["view", "Inputs"], _viewof_sliders);
  $def("_sliders", "sliders", ["Generators", "viewof sliders"], (G, _) => G.input(_));
  $def("_summary", "summary", ["settings", "sliders"], _summary);

  main.define("module @tomlarkworthy/view", async () => "@tomlarkworthy/view" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreifxbb53lb4z354lduz2tqwut4yagamcqyhj2bmbnge4csqqjsledi")).default));
  main.define("view", ["module @tomlarkworthy/view", "@variable"], (_, v) => v.import("view", _));
  return main;
}
