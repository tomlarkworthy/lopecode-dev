const _viewof_cx = function cx(Inputs){return(Inputs.range([0, 200], {label: "cx", step: 1, value: 60}))};
const _cx = (G, v) => G.input(v);
const _viewof_cy = function cy(Inputs){return(Inputs.range([0, 200], {label: "cy", step: 1, value: 80}))};
const _cy = (G, v) => G.input(v);
const _dot = function dot(cx, cy, htl, anchor){return(
htl.svg`<svg width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#eef"/>
  <circle cx=${cx} cy=${cy} r="12" fill="tomato"/>
  ${anchor("centre", {x: cx, y: cy})}
</svg>`
)};
const _viewof_myModule = function myModule(thisModule){return(thisModule())};
const _myModule = (G, v) => G.input(v);
const _dotEditor = function dotEditor(svgEditor, myModule, invalidation){return(
svgEditor({target: "dot", module: myModule, invalidation})
)};
const _check = function check(dotEditor, dot){return(
{editor: typeof dotEditor, keys: Object.keys(dotEditor ?? {}).slice(0, 12), anchors: dot.querySelectorAll(".__anchor").length, overlay: !!document.querySelector("body > svg, body > div") }
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_viewof_cx", "viewof cx", ["Inputs"], _viewof_cx);
  $def("_cx", "cx", ["Generators", "viewof cx"], _cx);
  $def("_viewof_cy", "viewof cy", ["Inputs"], _viewof_cy);
  $def("_cy", "cy", ["Generators", "viewof cy"], _cy);
  $def("_dot", "dot", ["cx", "cy", "htl", "anchor"], _dot);
  $def("_viewof_myModule", "viewof myModule", ["thisModule"], _viewof_myModule);
  $def("_myModule", "myModule", ["Generators", "viewof myModule"], _myModule);
  $def("_dotEditor", "dotEditor", ["svgEditor", "myModule", "invalidation"], _dotEditor);
  $def("_check", "check", ["dotEditor", "dot"], _check);
  main.define("module @tomlarkworthy/parametric-svg", async () => "@tomlarkworthy/parametric-svg" && runtime.module((await import("https://earthstar.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=did:plc:j7nm3lrd5h7fm3sfhcv3lhfv&cid=bafkreihlh2m4kmdu664nzgr55awomw6irpyd6u2kc3g636k73dz6y23o7e")).default));
  main.define("module @tomlarkworthy/runtime-sdk", async () => runtime.module((await import("/@tomlarkworthy/runtime-sdk.js?v=4")).default));
  main.define("svgEditor", ["module @tomlarkworthy/parametric-svg", "@variable"], (_, v) => v.import("svgEditor", _));
  main.define("anchor", ["module @tomlarkworthy/parametric-svg", "@variable"], (_, v) => v.import("anchor", _));
  main.define("thisModule", ["module @tomlarkworthy/runtime-sdk", "@variable"], (_, v) => v.import("thisModule", _));
  return main;
}
