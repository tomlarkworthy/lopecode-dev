const _viewof_cutoff = function cutoff(sticky,Inputs){return(
sticky(Inputs.range([0, 2000], {label: "cutoff", step: 1, value: 440}), 440)
)};
const _echo = function echo(cutoff){return(
`cutoff = ${cutoff}`
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_viewof_cutoff", "viewof cutoff", ["sticky", "Inputs"], _viewof_cutoff);
  $def("_cutoff", "cutoff", ["Generators", "viewof cutoff"], (G, _) => G.input(_));
  $def("_echo", "echo", ["cutoff"], _echo);

  main.define("module @tomlarkworthy/sticky", async () => "@tomlarkworthy/sticky" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreidnbl6wlhnt25ttzwms3c6kpzlmiiozwugx7iezsgl6ul35eabg5m")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));
  return main;
}
