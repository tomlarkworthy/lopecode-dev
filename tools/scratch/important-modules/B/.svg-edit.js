const _viewof_picture = function picture(svg){return(
svg`<svg viewBox="0 0 100 100" width="300">
  <rect x="10" y="10" width="30" height="30" fill="steelblue"/>
  <circle cx="65" cy="60" r="20" fill="tomato"/>
</svg>`
)};
const _picture = (G, v) => G.input(v);
const _check = function check(picture, $0){return(
{isString: typeof picture === "string", hasCircle: picture.includes("<circle"), tag: $0.tagName, canEdit: typeof $0.setProperty === "function", selection: $0.selectionPaths()}
)};
const _edit = async function edit($0){
  const before = $0.describe([0, 1]);
  const r = await $0.setProperty([0, 1], "fill", "gold");
  return {before, result: String(r), source: $0.cellSource().slice(0, 400)};
};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_viewof_picture", "viewof picture", ["svg"], _viewof_picture);
  $def("_picture", "picture", ["Generators", "viewof picture"], _picture);
  $def("_check", "check", ["picture", "viewof picture"], _check);
  $def("_edit", "edit", ["viewof picture"], _edit);
  main.define("module @tomlarkworthy/svg-lens", async () => "@tomlarkworthy/svg-lens" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreianc5gxq6lnbmeiavkhedazx6k2gwarajoyaqwafbinzxeaw3rf4y")).default));
  main.define("svg", ["module @tomlarkworthy/svg-lens", "@variable"], (_, v) => v.import("svg", _));
  return main;
}
