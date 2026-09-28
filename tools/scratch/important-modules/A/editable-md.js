const _viewof_count = function count(Inputs){return(
Inputs.range([0, 10], {label: "count", step: 1, value: 3})
)};
const _intro = function intro(md,count){return(
md`# Shopping list

We need ${count} apples. Click this text to edit it; Shift+Enter or clicking away saves.`
)};
const _introSource = function introSource(intro){return(
intro.markdown
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_viewof_count", "viewof count", ["Inputs"], _viewof_count);
  $def("_count", "count", ["Generators", "viewof count"], (G, _) => G.input(_));
  $def("_intro", "intro", ["md", "count"], _intro);
  $def("_introSource", "introSource", ["intro"], _introSource);

  main.define("module @tomlarkworthy/editable-md", async () => "@tomlarkworthy/editable-md" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreif4pvtm2e6d54ldypxx4qynvgjc4yoy5s66mrg2bl4zxqkhsiicji")).default));
  main.define("md", ["module @tomlarkworthy/editable-md", "@variable"], (_, v) => v.import("md", _));
  return main;
}
